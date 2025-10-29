from decimal import Decimal
from django.db import transaction
from promoter.models import PromoterCommission, CommissionLevel
from promoter.models import WithdrawalRequest
import razorpay
from django.conf import settings
from django.utils import timezone

def apply_promoter_commission(order):
    promoter = getattr(order, "promoter", None)
    if not promoter:
        return

    # Prevent double commission application
    if order.total_commission > 0:
        return

    levels = list(CommissionLevel.objects.order_by("level").values("level", "percentage"))
    if not levels:
        print("No CommissionLevel records found. Cannot apply commissions.")
        return

    total_order_commission = Decimal("0.00")

    with transaction.atomic():
        # Track which promoters already credited to avoid double-crediting wallets
        credited_promoters = set()

        for item in order.items.all():
            variant = item.product_variant
            base_rate = Decimal(variant.promoter_commission_rate or item.promoter_commission_rate or 0)
            if base_rate <= 0:
                continue

            item_total = Decimal(item.quantity) * Decimal(item.price)
            item_commission = (item_total * base_rate) / 100
            total_order_commission += item_commission

            # Update order item
            item.promoter_commission_amount = item_commission
            item.promoter_commission_rate = base_rate
            item.promoter = promoter
            item.save(update_fields=['promoter_commission_amount', 'promoter_commission_rate', 'promoter'])

            # Multi-level split
            current_promoter = promoter
            for level_info in levels:
                if not current_promoter:
                    break

                share = (item_commission * Decimal(level_info["percentage"])) / 100

                pc, created = PromoterCommission.objects.get_or_create(
                    promoter=current_promoter,
                    order=order,
                    product_variant=variant,
                    level=level_info["level"],
                    defaults={
                        "amount": share,
                        "status": "paid" if current_promoter.promoter_type == "paid" else "pending"
                    }
                )

                if created:
                    print(f"Created PromoterCommission {pc.id} | amount={pc.amount} | status={pc.status}")

                # Credit wallet once per promoter if 'paid'
                if pc.status == "paid" and current_promoter.id not in credited_promoters:
                    current_promoter.add_commission(share)
                    credited_promoters.add(current_promoter.id)
                    print(f"Credited wallet for {current_promoter}: +{share}")

                current_promoter = getattr(current_promoter, 'referred_by', None)

        # Increment total_sales_count once for top promoter
        if order.items.exists():
            promoter.total_sales_count += 1
            promoter.save(update_fields=['total_sales_count'])
            print(f"Incremented total_sales_count for {promoter}: {promoter.total_sales_count}")

        # Save total order commission
        order.total_commission = total_order_commission
        order.save(update_fields=['total_commission'])
        print(f"Updated Order {order.id} total_commission={order.total_commission}")


from django.utils import timezone

def initiate_payout_to_promoter(withdrawal, use_mock=True):
    """
    Initiates payout to promoter.
    
    If `use_mock=True`, simulates a payout for testing.
    Once RazorpayX keys are ready, set `use_mock=False` to call the real API.
    """
    if use_mock:
        # Mock response for testing
        withdrawal.status = 'processing'
        withdrawal.processed_at = timezone.now()
        withdrawal.razorpay_payout_id = f"mock_{withdrawal.id}"
        withdrawal.save()
        print(f"[MOCK] Payout of ₹{withdrawal.amount} to {withdrawal.promoter.user.email}")
        return {"id": withdrawal.razorpay_payout_id, "status": "processing"}

    # Placeholder for RazorpayX API call
    # import razorpay
    # client = razorpay.Client(auth=(settings.RAZORPAYX_KEY_ID, settings.RAZORPAYX_KEY_SECRET))
    # resp = client.payout.create({
    #     "account_number": withdrawal.promoter.bank_account_number,
    #     "amount": int(withdrawal.amount * 100),  # in paise
    #     "currency": "INR",
    #     "mode": "IMPS",
    #     "purpose": "payout",
    #     "narration": f"Withdrawal #{withdrawal.id}",
    #     "fund_account": "...",  # linked RazorpayX fund account
    # })
    # withdrawal.razorpay_payout_id = resp['id']
    # withdrawal.status = 'processing'
    # withdrawal.processed_at = timezone.now()
    # withdrawal.save()
    # return resp

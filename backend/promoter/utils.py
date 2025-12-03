from decimal import Decimal
from django.db import transaction
from promoter.models import PromoterCommission, CommissionLevel
import razorpay
from django.utils import timezone
from django.conf import settings

from decimal import Decimal
from django.db import transaction
from promoter.models import PromoterCommission, CommissionLevel

def apply_promoter_commission(order):
    """
    Apply promoter commission per order item.

    Rules:
    - Only items with a promoter are processed.
    - Supports multi-level commission.
    - Leftover commission is merged into Level 1.
    - Wallet is credited immediately for paid promoters.
    - total_sales_count is incremented once per promoter per order.
    """
    levels = list(CommissionLevel.objects.order_by("level").values("level", "percentage"))
    if not levels:
        print("[DEBUG] No CommissionLevel records found. Cannot apply commissions.")
        return

    total_order_commission = Decimal("0.00")
    processed_promoters = set()

    with transaction.atomic():
        for item in order.items.all():
            promoter = item.promoter
            if not promoter:
                print(f"[DEBUG] No promoter for OrderItem {item.id}. Skipping.")
                continue

            variant = item.product_variant
            base_rate = Decimal(variant.promoter_commission_rate or 0)
            if base_rate <= 0:
                print(f"[DEBUG] Item {item.id} has 0 commission rate. Skipping.")
                continue

            # Calculate item commission
            item_total = Decimal(item.price) * item.quantity
            item_commission = (item_total * base_rate) / 100
            total_order_commission += item_commission

            # Update order item fields
            item.promoter_commission_amount = item_commission
            item.promoter_commission_rate = base_rate
            item.save(update_fields=['promoter_commission_amount', 'promoter_commission_rate'])

            # Multi-level commission distribution
            existing_commissions = PromoterCommission.objects.filter(order=order, product_variant=item.product_variant)
            current_promoter = promoter
            remaining_commission = item_commission
            level1_record = None

            for level_info in levels:
                if not current_promoter:
                    break

                share = (item_commission * Decimal(level_info["percentage"])) / 100
                remaining_commission -= share

                pc = existing_commissions.filter(promoter=current_promoter, level=level_info['level']).first()
                old_amount = Decimal('0.00')

                if pc:
                    old_amount = pc.amount
                    pc.amount = share
                    pc.status = 'paid' if current_promoter.promoter_type == 'paid' else 'pending'
                    pc.save(update_fields=['amount', 'status'])
                    print(f"[Update] OrderItem {item.id}, Level {level_info['level']} updated: {old_amount} → {share}")
                else:
                    pc = PromoterCommission.objects.create(
                        promoter=current_promoter,
                        order=order,
                        product_variant=item.product_variant,
                        level=level_info['level'],
                        amount=share,
                        status='paid' if current_promoter.promoter_type == 'paid' else 'pending'
                    )
                    print(f"[Create] OrderItem {item.id}, Level {level_info['level']}: {share}")

                # Update wallet only by difference
                current_promoter.total_commission_earned += share
                current_promoter.save(update_fields=["total_commission_earned"])
                if current_promoter.promoter_type == "paid":
                    diff = share - old_amount
                    if diff != 0:
                        current_promoter.add_commission(diff, credit_wallet=True)

                if level_info['level'] == 1:
                    level1_record = pc

                current_promoter = getattr(current_promoter, 'referred_by', None)

            # Merge leftover into Level 1
            if remaining_commission > 0 and level1_record:
                old_amount = level1_record.amount
                level1_record.amount += remaining_commission
                level1_record.save(update_fields=['amount'])
                promoter.total_commission_earned += remaining_commission
                promoter.save(update_fields=["total_commission_earned"])
                if promoter.promoter_type == "paid":
                    promoter.add_commission(remaining_commission, credit_wallet=True)
                print(f"[Merge] Remaining {remaining_commission} added to Level 1 ({old_amount} → {level1_record.amount})")

            # Increment total_sales_count once per promoter per order
            if promoter.id not in processed_promoters:
                promoter.total_sales_count += 1
                promoter.save(update_fields=["total_sales_count"])
                processed_promoters.add(promoter.id)

        # Update order totals
        order.total_commission = total_order_commission
        order.is_commission_applied = True
        order.save(update_fields=["total_commission", "is_commission_applied"])
        print(f"[DEBUG] Applied total commission {total_order_commission} for Order {order.id}")

def process_pending_commission(promoter):
    """
    Process all pending commissions for a promoter.

    - Marks pending commissions as 'paid'.
    - Adds the amounts to the promoter's total_commission_earned and wallet if paid.
    """
    pending_commissions = PromoterCommission.objects.filter(promoter=promoter, status='pending')
    total_credited = 0

    for pc in pending_commissions:
        pc.status = 'paid'
        pc.save(update_fields=['status'])
        promoter.add_commission(pc.amount, credit_wallet=True)
        total_credited += pc.amount
        print(f"[Pending -> Paid] Credited {pc.amount} for commission {pc.id}")

    if total_credited > 0:
        print(f"[Summary] Total credited to {promoter.user.email}: {total_credited}")
    else:
        print(f"[Summary] No pending commissions to process for {promoter.user.email}")

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

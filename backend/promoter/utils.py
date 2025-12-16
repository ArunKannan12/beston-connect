from decimal import Decimal
from django.db import transaction
from promoter.models import PromoterCommission, CommissionLevel
import razorpay
from django.utils import timezone
from django.conf import settings
import logging

from decimal import Decimal
from django.db import transaction
from promoter.models import PromoterCommission, CommissionLevel

logger = logging.getLogger(__name__)

def apply_promoter_commission(order):
    """
    Apply promoter commission per order item.
    """
    logger.warning(f"[START] Applying commission for Order {order.id}")

    # Load commission levels
    levels = list(CommissionLevel.objects.order_by("level").values("level", "percentage"))
    logger.warning(f"[DEBUG] Loaded Commission Levels: {levels}")

    if not levels:
        logger.warning("[SKIP] No CommissionLevel records found. Cannot apply commissions.")
        return

    total_order_commission = Decimal("0.00")
    processed_promoters = set()

    with transaction.atomic():
        items = order.items.all()
        logger.warning(f"[DEBUG] Order {order.id} has {items.count()} items")

        for item in items:
            logger.warning(f"[ITEM] Checking OrderItem {item.id}")

            promoter = item.promoter
            logger.warning(f"[DEBUG] Item {item.id} promoter = {promoter}")

            if not promoter:
                logger.warning(f"[SKIP] Item {item.id}: No promoter assigned")
                continue

            variant = item.product_variant
            base_rate = Decimal(variant.promoter_commission_rate or 0)
            logger.warning(f"[DEBUG] Item {item.id} commission rate = {base_rate}")

            if base_rate <= 0:
                logger.warning(f"[SKIP] Item {item.id}: promoter_commission_rate={base_rate}")
                continue

            # Calculate item commission
            item_total = Decimal(item.price) * item.quantity
            item_commission = (item_total * base_rate) / 100
            logger.warning(f"[CALC] Item {item.id}: total={item_total}, commission={item_commission}")

            total_order_commission += item_commission

            # Update order item fields
            item.promoter_commission_amount = item_commission
            item.promoter_commission_rate = base_rate
            item.save(update_fields=['promoter_commission_amount', 'promoter_commission_rate'])
            logger.warning(f"[UPDATE] Saved commission fields for Item {item.id}")

            # Multi-level commission distribution
            existing_commissions = PromoterCommission.objects.filter(order=order, product_variant=item.product_variant)
            current_promoter = promoter
            remaining_commission = item_commission
            level1_record = None

            logger.warning(f"[DEBUG] Starting multi-level distribution for Item {item.id}")

            for level_info in levels:
                logger.warning(f"[LEVEL] Processing Level {level_info['level']} for promoter {current_promoter}")

                if not current_promoter:
                    logger.warning("[BREAK] No more uplines")
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
                    logger.warning(f"[UPDATE] Item {item.id}, Level {level_info['level']}: {old_amount} → {share}")
                else:
                    pc = PromoterCommission.objects.create(
                        promoter=current_promoter,
                        order=order,
                        product_variant=item.product_variant,
                        level=level_info['level'],
                        amount=share,
                        status='paid' if current_promoter.promoter_type == 'paid' else 'pending'
                    )
                    logger.warning(f"[CREATE] Item {item.id}, Level {level_info['level']}: {share}")

                # ✅ FIXED: Correct commission earned logic
                if current_promoter.promoter_type == "paid":
                    # Wallet + earned handled inside add_commission()
                    diff = share - old_amount
                    if diff != 0:
                        current_promoter.add_commission(diff, credit_wallet=True)
                        logger.warning(f"[WALLET] Credited wallet diff={diff} for promoter {current_promoter.id}")
                else:
                    # Free promoter → manually update earned
                    current_promoter.total_commission_earned += share
                    current_promoter.save(update_fields=["total_commission_earned"])
                    logger.warning(f"[WALLET] Added {share} to FREE promoter {current_promoter.id}")

                if level_info['level'] == 1:
                    level1_record = pc

                current_promoter = getattr(current_promoter, 'referred_by', None)

            # ✅ FIXED: Merge leftover into Level 1
            if remaining_commission > 0 and level1_record:
                old_amount = level1_record.amount
                level1_record.amount += remaining_commission
                level1_record.save(update_fields=['amount'])

                if promoter.promoter_type == "paid":
                    promoter.add_commission(remaining_commission, credit_wallet=True)
                else:
                    promoter.total_commission_earned += remaining_commission
                    promoter.save(update_fields=["total_commission_earned"])

                logger.warning(
                    f"[MERGE] Item {item.id}: leftover {remaining_commission} merged into Level 1 "
                    f"({old_amount} → {level1_record.amount})"
                )

            # Increment total_sales_count once per promoter per order
            if promoter.id not in processed_promoters:
                promoter.total_sales_count += 1
                promoter.save(update_fields=["total_sales_count"])
                processed_promoters.add(promoter.id)
                logger.warning(f"[SALES] Incremented total_sales_count for promoter {promoter.id}")

        # Update order totals
        order.total_commission = total_order_commission
        order.is_commission_applied = True
        order.save(update_fields=["total_commission", "is_commission_applied"])

        logger.warning(
            f"[END] Order {order.id}: total_commission={total_order_commission}, "
            f"is_commission_applied=True"
        )

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

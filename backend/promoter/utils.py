from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.conf import settings
import logging
import razorpay

from promoter.models import PromoterCommission, CommissionLevel, Sale, Promoter, Subscription

logger = logging.getLogger(__name__)

def apply_promoter_commission(item, status='pending'):
    """
    Apply promoter commission for a single OrderItem.
    - status: 'credited' (direct to wallet) or 'pending' (requires later activation)
    """
    logger.info(f"[START] Applying commission for Item {item.id} (Order {item.order.id})")

    # Load commission levels
    levels = list(CommissionLevel.objects.order_by("level").values("level", "percentage"))
    if not levels:
        logger.warning("[SKIP] No CommissionLevel records found.")
        return

    promoter = item.promoter
    if not promoter:
        logger.warning(f"[SKIP] Item {item.id}: No promoter assigned.")
        return

    variant = item.product_variant
    base_rate = Decimal(variant.promoter_commission_rate or 0)
    if base_rate <= 0:
        logger.warning(f"[SKIP] Item {item.id}: Rate is {base_rate}.")
        return

    # Calculate item commission
    item_total = Decimal(item.price) * item.quantity
    item_commission = (item_total * base_rate) / 100

    with transaction.atomic():
        # Update order item fields
        item.promoter_commission_amount = item_commission
        item.promoter_commission_rate = base_rate
        item.save(update_fields=['promoter_commission_amount', 'promoter_commission_rate'])

        # Multi-level distribution
        current_promoter = promoter
        remaining_commission = item_commission
        level1_record = None

        for level_info in levels:
            if not current_promoter:
                break

            share = (item_commission * Decimal(level_info["percentage"])) / 100
            remaining_commission -= share

            # Determine the status for this specific commission record
            # If the cron said 'credited', we check if THIS promoter in the chain is paid.
            # If cron said 'pending', everyone gets pending.
            if status == 'credited' and current_promoter.promoter_type == 'paid':
                record_status = 'paid'
            else:
                record_status = 'pending'

            earning_type = 'direct_sale' if level_info['level'] == 1 else 'referral_sale'
            pc = PromoterCommission.objects.create(
                promoter=current_promoter,
                order=item.order,
                product_variant=item.product_variant,
                level=level_info['level'],
                amount=share,
                status=record_status,
                earning_type=earning_type,
                referral_source_promoter=promoter
            )

            # Credit wallet if status ended up as 'paid'
            if record_status == 'paid':
                current_promoter.add_commission(share, credit_wallet=True)
                logger.info(f"[WALLET] Credited {share} to promoter {current_promoter.id}")
            else:
                # Still track earned even if not credited to wallet yet
                current_promoter.add_commission(share, credit_wallet=False)
                logger.info(f"[PENDING] Added {share} earned for promoter {current_promoter.id}")

            if level_info['level'] == 1:
                level1_record = pc

            # Upline traversal using the property we added
            current_promoter = current_promoter.referred_by

        # Merge leftover into Level 1
        if remaining_commission > 0 and level1_record:
            level1_record.amount += remaining_commission
            level1_record.save(update_fields=['amount'])
            
            # Credit the leftover according to the Level 1 status
            is_paid = (level1_record.status == 'paid')
            promoter.add_commission(remaining_commission, credit_wallet=is_paid)
            logger.info(f"[MERGE] Merged leftover {remaining_commission} into Level 1")

        # Increment total_sales_count for the direct promoter
        promoter.total_sales_count += 1
        promoter.save(update_fields=["total_sales_count"])

        # Update order totals (incrementally)
        order = item.order
        order.total_commission += item_commission
        order.save(update_fields=["total_commission"])

    logger.info(f"[END] Item {item.id} commission processed.")

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


def get_commission_levels():
    """Return all commission levels ordered by level."""
    return CommissionLevel.objects.order_by('level')

def process_sale_commission(sale: Sale):
    if sale.status != 'completed':
        return

    if PromoterCommission.objects.filter(order=sale).exists():
        return

    current_promoter = sale.promoter
    base_amount = sale.commission_amount

    for level in CommissionLevel.objects.order_by("level"):
        if not current_promoter:
            break

        amount = base_amount * level.percentage / Decimal("100")

        PromoterCommission.objects.create(
            promoter=current_promoter,
            order=sale,
            product_variant=sale.product_variant,
            level=level.level,
            amount=amount,
            status="confirmed"
        )

        current_promoter = current_promoter.referred_by

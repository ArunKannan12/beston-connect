from .models import ProductSaleShare
from datetime import date,time,datetime
from django.db.models import Sum,F,ExpressionWrapper,DecimalField
from .models import ProductSaleShare,Investment,InvestorWallet
from orders.models import OrderItem
from decimal import Decimal

def create_sale_shares_for_investment(investment):
    investor=investment.investor
    amount=investment.amount

    period_start=date.today().replace(day=1)
    period_end=date.today()

    ProductSaleShare.objects.create(
        investor=investor,
        investor_share=amount,
        period_start=period_start,
        period_end=period_end

    )


def generate_product_sale_shares(start_date: date, end_date: date):
    # Convert date to datetime ranges
    start_datetime = datetime.combine(start_date, time.min)  # 00:00:00
    end_datetime = datetime.combine(end_date, time.max)      # 23:59:59.999999

    confirmed_investments = Investment.objects.filter(confirmed=True)

    for investment in confirmed_investments:
        product_variant = investment.product_variant
        investor = investment.investor
        print(f"\n🔎 Checking investment for {investor.user.email} (variant: {product_variant})")

        # Fetch delivered order items for this variant within the full datetime range
        order_items = OrderItem.objects.filter(
            product_variant=product_variant,
            order__created_at__range=(start_datetime, end_datetime),
            order__status='delivered'
        ).annotate(
            line_total=ExpressionWrapper(
                F('price') * F('quantity'),
                output_field=DecimalField()
            )
        )

        total_sales = order_items.aggregate(total=Sum('line_total'))['total'] or 0

        # Business logic: 20% profit margin, 10% of profit goes to investor
        total_profit = total_sales * Decimal('0.2')
        investor_share = total_profit * Decimal('0.1')

        print(f"🧾 Sales: ₹{total_sales}, Profit: ₹{total_profit}, Investor Share: ₹{investor_share}")

        try:
            share, created = ProductSaleShare.objects.update_or_create(
                investor=investor,
                period_start=start_date,
                period_end=end_date,
                defaults={
                    'total_sales_volume': total_sales,
                    'profit_generated': total_profit,
                    'investor_share': investor_share,
                }
            )
            if created:
                print("✅ New share created.")
            else:
                print("🔁 Existing share updated.")
        except Exception as e:
            print("❌ Error saving share:", e)

        wallet,_=InvestorWallet.objects.get_or_create(investor=investor)
        wallet.balance=F('balance') + investor_share
        wallet.save()
        wallet.refresh_from_db()

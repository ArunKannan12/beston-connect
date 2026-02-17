from promoter.models import Promoter, PromoterReferral, CommissionLevel
from orders.models import Order, OrderItem, ShippingAddress
from products.models import ProductVariant, Product
from django.contrib.auth import get_user_model
from django.utils import timezone
from promoter.utils import apply_promoter_commission
from decimal import Decimal

User = get_user_model()
admin = User.objects.filter(is_superuser=True).first()
if not admin:
    admin = User.objects.create_superuser('admin_test', 'admin@test.com', 'password')

U1 = get_user_model()
# 1. Setup Hierarchy: P1 -> P2 (P1 referred P2)
u1, _ = User.objects.get_or_create(email='p1@test.com')
u2, _ = User.objects.get_or_create(email='p2@test.com')

p1, _ = Promoter.objects.get_or_create(user=u1, defaults={'promoter_type': 'paid'})
p2, _ = Promoter.objects.get_or_create(user=u2, defaults={'promoter_type': 'unpaid'})

# Set referral: p1 is referrer of p2
PromoterReferral.objects.get_or_create(referred_promoter=p2, defaults={'referrer_promoter': p1})

# 2. Setup Commission Levels
CommissionLevel.objects.get_or_create(level=1, defaults={'percentage': 50})
CommissionLevel.objects.get_or_create(level=2, defaults={'percentage': 25})

# 3. Setup Order
from products.models import Category
cat, _ = Category.objects.get_or_create(name='Test Category', defaults={'slug': 'test-category'})
product, _ = Product.objects.get_or_create(name='Test Product', defaults={'category': cat})
variant, _ = ProductVariant.objects.get_or_create(product=product, variant_name='Standard', defaults={'price': 1000, 'promoter_commission_rate': 10})

shipping, _ = ShippingAddress.objects.get_or_create(user=u2, defaults={'full_name': 'Test', 'phone_number': '9999999999', 'address': 'Test', 'city': 'Test', 'postal_code': '123456'})
order = Order.objects.create(user=u2, shipping_address=shipping, subtotal=1000, total=1100, is_paid=True)
item = OrderItem.objects.create(order=order, product_variant=variant, quantity=1, price=1000, promoter=p2)

print(f"Applying commission for item {item.id} with promoter {p2.user.email} (type: {p2.promoter_type})")
print(f"Upline is {p2.referred_by.user.email if p2.referred_by else 'None'}")

# 4. Test apply_promoter_commission
# p2 is unpaid, p1 is paid. 
# Level 1 (p2) should be pending. Level 2 (p1) should be paid (if status='credited').
apply_promoter_commission(item, status='credited')

# 5. Check Results
from promoter.models import PromoterCommission
commissions = PromoterCommission.objects.filter(order=order)
for c in commissions:
    print(f"Level {c.level}: Promoter {c.promoter.user.email}, Amount {c.amount}, Status {c.status}")

p1.refresh_from_db()
p2.refresh_from_db()

print(f"P1 Wallet: {p1.wallet_balance}, Earned: {p1.total_commission_earned}")
print(f"P2 Wallet: {p2.wallet_balance}, Earned: {p2.total_commission_earned}, Sales: {p2.total_sales_count}")

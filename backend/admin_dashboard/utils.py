from .models import AdminLog
from orders.models import OrderItem, Order

def create_warehouse_log(order_or_item, updated_by, comment=None):
    """
    Creates a warehouse log entry for either an OrderItem or an Order.
    Determines the correct action automatically.
    """
    if isinstance(order_or_item, OrderItem):
        order_item = order_or_item
        order = order_item.order
        action = order_item.status or "Item Updated"
    elif isinstance(order_or_item, Order):
        order_item = None
        order = order_or_item
        action = getattr(order, "status", "Order Updated")
    else:
        raise ValueError("Invalid object passed. Must be Order or OrderItem.")

    AdminLog.objects.create(
        order_item=order_item,
        order=order,
        action=action,
        updated_by=updated_by,
        comment=comment or "",
    )

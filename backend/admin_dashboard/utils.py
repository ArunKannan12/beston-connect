# orders/utils.py or warehouse/utils.py
from .models import AdminLog

def create_warehouse_log(order_item, updated_by, comment=None):
    AdminLog.objects.create(
        order_item=order_item,
        order=order_item.order,
        action=order_item.status,  # same as the current status
        updated_by=updated_by,
        comment=comment
    )






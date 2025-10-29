from djoser.signals import user_activated
from django.dispatch import receiver
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@receiver(user_activated)
def send_account_activated_email(sender, user, request, **kwargs):
    """
    Sends a styled HTML email to the user once their account is activated.
    """
    try:
        subject = "Your account is activated ✅"
        html_content = render_to_string(
            "emails/confirmation.html",
            {
                "user": user,
                "full_name": user.get_full_name() or user.first_name,
                "frontend_login_url": f"{settings.FRONTEND_URL}/login"
            }
        )

        msg = EmailMultiAlternatives(
            subject=subject,
            body="",  # Plain text fallback can be added if needed
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@yourshop.com"),
            to=[user.email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

        logger.info(f"Account activated email sent to {user.email}")

    except Exception as e:
        logger.error(f"Failed to send account activated email to {user.email}: {e}")

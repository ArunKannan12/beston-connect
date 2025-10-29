from djoser.email import ActivationEmail,PasswordResetEmail
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

class CustomActivationEmail(ActivationEmail):
    template_name = "emails/activation.html"

    def __init__(self, request, context=None, user=None, *args, **kwargs):
        if context is None:
            context = {}
        context["user"] = user or context.get("user")
        super().__init__(request, context, *args, **kwargs)
        self.user = context.get("user")

    def get_context_data(self):
        context = super().get_context_data()
        # Ensure user is present in the context.
        context["user"] = self.user
        try:
            frontend_url = settings.FRONTEND_URL.rstrip("/")
        except Exception as e: 
            frontend_url = "http://localhost:5173"  # Fallback
        context["activation_url"] = f"{frontend_url}/activation/{context['uid']}/{context['token']}/"
        return context

    def send(self, to=None, *args, **kwargs):
        return super().send(to=to, *args, **kwargs)
    


class CustomPasswordResetEmail(PasswordResetEmail):
    template_name = 'emails/custom_reset_password.html'
    subject_template_name = 'emails/password_reset_subject.txt'

    def get_context_data(self):
        context = super().get_context_data()
        try:
            frontend_url = settings.FRONTEND_URL.rstrip("/")
        except Exception:
            frontend_url = "http://localhost:5173"
        context["reset_url"] = f"{frontend_url}/reset-password-confirm/{context['uid']}/{context['token']}/"
        return context

    def send(self, to, *args, **kwargs):
        if isinstance(to, list):
            to = to[0]  # Extract string from list
        context = self.get_context_data()
        subject = render_to_string(self.subject_template_name, context).strip()
        html_body = render_to_string(self.template_name, context)
        msg = EmailMultiAlternatives(subject, "", to=[to])  # Pass as list here
        msg.attach_alternative(html_body, "text/html")
        msg.send()
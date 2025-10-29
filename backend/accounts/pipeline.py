def capture_login_ip(strategy, details, user=None, *args, **kwargs):
    request = getattr(strategy, 'request', None)
    if request and user:
        ip = (
            request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("REMOTE_ADDR")
        )
        if ip:
            user.last_login_ip = ip
            user.save(update_fields=["last_login_ip"])
            print(f"✅ IP captured: {ip}")
        else:
            print("⚠️ No IP found in request")
    else:
        print("⚠️ Missing request or user in pipeline step")
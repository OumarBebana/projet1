from django.apps import AppConfig


class NewsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "news"

    def ready(self):
        import os
        import atexit
        import threading
        from django.conf import settings

        if settings.DEBUG and not os.environ.get("DJANGO_NO_SCHEDULER"):
            from .scheduler import start_scheduler, stop_scheduler
            start_scheduler()
            atexit.register(stop_scheduler)

        # Pre-warm breaking ticker cache in background (non-blocking)
        if not os.environ.get("DJANGO_NO_SCHEDULER"):
            from .views import _refresh_ticker_cache
            threading.Thread(target=_refresh_ticker_cache, daemon=True).start()

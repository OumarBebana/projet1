from django.apps import AppConfig


class NewsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "news"

    def ready(self):
        import os
        import atexit
        from django.conf import settings

        if settings.DEBUG and not os.environ.get("DJANGO_NO_SCHEDULER"):
            from .scheduler import start_scheduler, stop_scheduler

            start_scheduler()
            atexit.register(stop_scheduler)

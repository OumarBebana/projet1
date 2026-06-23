from __future__ import annotations

import logging
import os
import threading

logger = logging.getLogger(__name__)

_scheduler = None
_lock = threading.Lock()
_use_celery = False


DEFAULT_BROKER = "redis://localhost:6379/0"


def _redis_available(broker_url: str) -> bool:
    """Check if Redis is reachable via raw socket."""
    if not broker_url or broker_url == DEFAULT_BROKER:
        return False
    try:
        from urllib.parse import urlparse
        import socket

        parsed = urlparse(broker_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 6379
        s = socket.create_connection((host, port), timeout=0.5)
        s.close()
        return True
    except Exception:
        return False


def _get_broker_url() -> str:
    from django.conf import settings
    return getattr(settings, "CELERY_BROKER_URL", DEFAULT_BROKER)


def _start_celery():
    """Start Celery worker + beat in background threads."""
    global _use_celery
    from .tasks import fetch_news_task

    fetch_news_task.delay()
    logger.info("Celery fetch_news task dispatched.")
    _use_celery = True


def _import_apscheduler():
    """Import BackgroundScheduler from apscheduler."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        return BackgroundScheduler
    except Exception as exc:
        logger.warning("APScheduler import failed (%s). Scheduler disabled.", exc)
        return None


def _start_apscheduler():
    """Fallback: APScheduler every hour."""
    global _scheduler
    BackgroundScheduler = _import_apscheduler()
    if BackgroundScheduler is None:
        return
    from django.core.management import call_command

    def _fetch():
        try:
            call_command("fetch_news", limit=5, lang="ar")
            call_command("fetch_news", limit=5, lang="fr")
            logger.info("APScheduler fetch_news completed (ar + fr).")
        except Exception as e:
            logger.exception("APScheduler fetch_news failed: %s", e)

    def _send_newsletter():
        try:
            call_command("send_newsletter", type="daily")
            logger.info("APScheduler newsletter sent.")
        except Exception as e:
            logger.exception("APScheduler newsletter failed: %s", e)

    def _notify_new():
        try:
            call_command("notify_new_articles", minutes=10)
            logger.info("APScheduler new-article notification sent.")
        except Exception as e:
            logger.exception("APScheduler notification failed: %s", e)

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(_fetch, "interval", minutes=30, id="fetch_news_aps")
    _scheduler.add_job(_send_newsletter, "interval", hours=2, id="send_newsletter")
    _scheduler.add_job(_notify_new, "interval", minutes=10, id="notify_new_articles")
    _scheduler.start()
    logger.info("APScheduler started (fetch every 30min, newsletter every 2h, notify every 10min).")


def start_scheduler():
    global _scheduler, _use_celery
    with _lock:
        if _scheduler is not None:
            return
        if _get_broker_url() and _redis_available(_get_broker_url()):
            try:
                _start_celery()
                logger.info("Using Celery scheduler with Redis.")
                return
            except Exception as e:
                logger.warning("Celery init failed (%s), falling back to APScheduler.", e)
        _start_apscheduler()


def stop_scheduler():
    global _scheduler, _use_celery
    with _lock:
        if _use_celery:
            logger.info("Celery runs externally; no in-process scheduler to stop.")
            return
        if _scheduler is not None:
            _scheduler.shutdown(wait=False)
            _scheduler = None
            logger.info("APScheduler stopped.")

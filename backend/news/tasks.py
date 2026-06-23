from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def fetch_news_task(self):
    """Celery task: fetch latest news for all sources."""
    from django.core.management import call_command

    try:
        call_command("fetch_news", limit=5)
        logger.info("Celery fetch_news completed successfully.")
    except Exception as e:
        logger.exception("Celery fetch_news failed: %s", e)
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def send_daily_newsletter_task(self):
    """Celery task: send daily newsletter to all active subscribers."""
    from django.core.management import call_command

    try:
        call_command("send_newsletter", type="daily")
        logger.info("Celery daily newsletter sent successfully.")
    except Exception as e:
        logger.exception("Celery daily newsletter failed: %s", e)
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def notify_new_articles_task(self):
    """Celery task: notify subscribers about new articles."""
    from django.core.management import call_command

    try:
        call_command("notify_new_articles", minutes=10)
        logger.info("Celery new-article notification sent.")
    except Exception as e:
        logger.exception("Celery notification failed: %s", e)
        raise self.retry(exc=e)

"""
Management command: notify_new_articles
إرسال إشعارات فورية للمشتركين عند اكتشاف أخبار جديدة.
"""

import hashlib
import hmac
import json
import logging
import os
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone as dj_timezone

from news.models import Article, Subscriber

logger = logging.getLogger(__name__)

BASE_URL = "https://projet1-two-mu.vercel.app"
TRACKER_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "last_notify.json"


def _unsubscribe_token(email: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
    ).hexdigest()[:16]


def _read_last_run():
    """Read the last notification check timestamp."""
    try:
        if TRACKER_FILE.exists():
            data = json.loads(TRACKER_FILE.read_text(encoding="utf-8"))
            return dj_timezone.datetime.fromisoformat(data["last_check"])
    except Exception:
        pass
    return dj_timezone.now() - timedelta(hours=24)


def _write_last_run(when):
    """Save the last notification check timestamp."""
    TRACKER_FILE.parent.mkdir(parents=True, exist_ok=True)
    TRACKER_FILE.write_text(
        json.dumps({"last_check": when.isoformat()}, ensure_ascii=False),
        encoding="utf-8",
    )


def _build_html(article, lang, email):
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/unsubscribe/{email}/{token}/"
    src = article.source.name_ar or article.source.name_fr or article.source.name if article.source else ""

    if lang == "ar":
        title = f"🚨 خبر جديد من {src}"
        read_more = "قراءة الخبر"
        footer = "لإلغاء الإشعارات"
        unsub = "إلغاء الاشتراك"
    else:
        title = f"🚨 Nouvelle actualité de {src}"
        read_more = "Lire l'article"
        footer = "Pour désactiver les notifications"
        unsub = "Se désabonner"

    return f"""<!DOCTYPE html>
<html dir="{ 'rtl' if lang == 'ar' else 'ltr' }">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',sans-serif">
  <table cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto">
    <tr>
      <td style="background:linear-gradient(135deg,#0c7c3e,#0a5e2e);padding:24px;text-align:center;border-radius:0 0 16px 16px">
        <div style="font-size:36px;margin-bottom:4px">🚨</div>
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">{title}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:20px">
        <table cellpadding="0" cellspacing="0" style="width:100%;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <tr>
            <td style="padding:16px 20px">
              <div style="font-size:12px;color:#888;margin-bottom:6px">{src} · {article.published_at.strftime('%Y-%m-%d') if article.published_at else ''}</div>
              <div style="font-size:16px;font-weight:600;color:#1a1a2e;line-height:1.5;margin-bottom:14px">{article.title}</div>
              {f'<p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 14px">{article.summary[:250]}</p>' if article.summary else ''}
              <a href="{BASE_URL}" style="display:inline-block;background:#0c7c3e;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600">{read_more}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;text-align:center;font-size:11px;color:#999">
        <a href="{BASE_URL}" style="color:#0c7c3e;text-decoration:none;font-weight:700">BAWABA.MR</a> · {footer}<br>
        <a href="{unsubscribe_url}" style="color:#c0392b;text-decoration:underline">{unsub}</a>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_text(article, lang, email):
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/unsubscribe/{email}/{token}/"
    src = article.source.name_ar or article.source.name_fr or article.source.name if article.source else ""
    lines = []
    if lang == "ar":
        lines.append(f"🚨 خبر جديد من {src}")
        lines.append("─" * 40)
        lines.append(article.title)
        lines.append("")
        lines.append(article.url)
        lines.append("")
        lines.append("─" * 40)
        lines.append("لإلغاء الإشعارات: " + unsubscribe_url)
    else:
        lines.append(f"🚨 Nouvelle actualité de {src}")
        lines.append("─" * 40)
        lines.append(article.title)
        lines.append("")
        lines.append(article.url)
        lines.append("")
        lines.append("─" * 40)
        lines.append("Se désabonner: " + unsubscribe_url)
    return "\n".join(lines)


class Command(BaseCommand):
    help = "إرسال إشعارات فورية للمشتركين عند نشر أخبار جديدة"

    def add_arguments(self, parser):
        parser.add_argument(
            "--minutes",
            type=int,
            default=10,
            help="البحث عن أخبار جديدة خلال آخر N دقيقة (افتراضي: 10)",
        )

    def handle(self, *args, **options):
        minutes = options["minutes"]
        now = dj_timezone.now()
        since = max(now - timedelta(minutes=minutes), _read_last_run())

        # Find new articles since last check
        new_articles = list(
            Article.objects.filter(created_at__gte=since)
            .select_related("source")
            .order_by("-published_at")[:10]
        )

        if not new_articles:
            _write_last_run(now)
            self.stdout.write("No new articles to notify")
            return

        subscribers = list(Subscriber.objects.filter(is_active=True))
        if not subscribers:
            self.stdout.write(self.style.WARNING("No active subscribers"))
            _write_last_run(now)
            return

        sent = 0
        total = len(subscribers)
        for article in new_articles:
            for sub in subscribers:
                # Language match
                if sub.language != "ar" and sub.language != article.language:
                    continue

                if not sub.receive_all and sub.interests and "all" not in sub.interests:
                    if article.category not in sub.interests:
                        continue

                html = _build_html(article, sub.language, sub.email)
                text = _build_text(article, sub.language, sub.email)
                subject = f"🚨 {article.title[:80]}" if sub.language == "ar" else f"🚨 {article.title[:80]}"

                try:
                    send_mail(
                        subject=subject,
                        message=text,
                        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                        recipient_list=[sub.email],
                        html_message=html,
                        fail_silently=False,
                    )
                    Subscriber.objects.filter(pk=sub.pk).update(last_sent=dj_timezone.now())
                    sent += 1
                except Exception as e:
                    logger.warning("Failed to notify %s: %s", sub.email, e)

        _write_last_run(now)
        self.stdout.write(
            self.style.SUCCESS(
                f"Sent {len(new_articles)} article(s) to {sent}/{total * len(new_articles)} subscribers"
            )
        )

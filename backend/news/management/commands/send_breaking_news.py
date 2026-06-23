"""
Management command: send_breaking_news
إرسال إشعارات الأخبار العاجلة للمشتركين.

الاستخدام:
    python manage.py send_breaking_news <article_id>
"""

import hashlib
import hmac
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError

from news.models import Article, Subscriber

logger = logging.getLogger(__name__)

BASE_URL = "https://bawaba.mr"


def _unsubscribe_token(email: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
    ).hexdigest()[:16]


def _build_html(article, lang, email):
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/unsubscribe/{email}/{token}/"

    if lang == "ar":
        title = "🔴 خبر عاجل - BAWABA.MR"
        read_more = "قراءة الخبر"
        footer_text = "لإلغاء الاشتراك في الإشعارات العاجلة"
        unsubscribe_text = "إلغاء الاشتراك"
    else:
        title = "🔴 Breaking news - BAWABA.MR"
        read_more = "Lire l'article"
        footer_text = "Pour vous désabonner des alertes"
        unsubscribe_text = "Se désabonner"

    src = article.source.name_ar or article.source.name_fr or article.source.name if article.source else ""

    return f"""<!DOCTYPE html>
<html dir="{ 'rtl' if lang == 'ar' else 'ltr' }">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fff5f5;font-family:'Segoe UI',system-ui,sans-serif">
  <table cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto">
    <tr>
      <td style="background:linear-gradient(135deg,#c0392b,#e74c3c);padding:32px 24px;text-align:center;border-radius:0 0 16px 16px">
        <div style="font-size:40px;margin-bottom:8px">🔴</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">{title}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 20px">
        <table cellpadding="0" cellspacing="0" style="width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <tr>
            <td style="padding:16px 20px">
              <div style="font-size:11px;color:#888;margin-bottom:4px">{src}</div>
              <div style="font-size:16px;font-weight:600;color:#1a1a2e;line-height:1.4;margin-bottom:10px">{article.title}</div>
              {f'<p style="font-size:13px;color:#555;line-height:1.5;margin:0 0 12px">{article.summary[:200]}</p>' if article.summary else ''}
              <a href="{article.url}" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600">{read_more}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 20px;text-align:center;font-size:12px;color:#999;border-top:1px solid #e0e0e0">
        {footer_text}<br>
        <a href="{unsubscribe_url}" style="color:#c0392b;text-decoration:underline;font-size:13px">{unsubscribe_text}</a>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_text(article, lang, email):
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/unsubscribe/{email}/{token}/"
    lines = []
    if lang == "ar":
        lines.append("🔴 خبر عاجل - BAWABA.MR")
        lines.append("─" * 40)
        lines.append(article.title)
        lines.append(article.url)
        lines.append("─" * 40)
        lines.append("لإلغاء الاشتراك:")
        lines.append(unsubscribe_url)
    else:
        lines.append("🔴 Breaking news - BAWABA.MR")
        lines.append("─" * 40)
        lines.append(article.title)
        lines.append(article.url)
        lines.append("─" * 40)
        lines.append("Pour vous désabonner:")
        lines.append(unsubscribe_url)
    return "\n".join(lines)


class Command(BaseCommand):
    help = "إرسال إشعارات الأخبار العاجلة"

    def add_arguments(self, parser):
        parser.add_argument("article_id", type=int, help="معرف المقال")

    def handle(self, *args, **options):
        article_id = options["article_id"]

        try:
            article = Article.objects.select_related("source").get(pk=article_id)
        except Article.DoesNotExist:
            raise CommandError(f"Article {article_id} not found")

        subscribers = Subscriber.objects.filter(is_active=True, newsletter_type="breaking")
        if not subscribers.exists():
            self.stdout.write(self.style.WARNING("No breaking-news subscribers"))
            return

        sent = 0
        for sub in subscribers:
            html = _build_html(article, sub.language, sub.email)
            text = _build_text(article, sub.language, sub.email)
            subject = "🔴 خبر عاجل - BAWABA.MR" if sub.language == "ar" else "🔴 Breaking news - BAWABA.MR"

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
                logger.warning("Failed to send breaking to %s: %s", sub.email, e)

        self.stdout.write(
            self.style.SUCCESS(f"Sent breaking news to {sent}/{subscribers.count()} subscribers")
        )

"""
Management command: weekly_digest
إرسال تقرير حكومي أسبوعي ذكي للمشتركين.
"""

import hashlib
import hmac
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.db.models import Count
from django.utils import timezone as dj_timezone

from news.ai_processor import summarize
from news.models import Article, Source, Subscriber

logger = logging.getLogger(__name__)

BASE_URL = "https://bawaba.mr"


def _unsubscribe_token(email: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
    ).hexdigest()[:16]


def _build_html(stats, articles, lang, email):
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/unsubscribe/{email}/{token}/"

    if lang == "ar":
        title = "📊 التقرير الحكومي الأسبوعي - BAWABA.MR"
        subtitle = "ملخص أسبوعي لأهم الأخبار والإحصائيات الحكومية"
        most_active_label = "الأكثر نشاطاً"
        total_label = "إجمالي"
        today_label = "هذا الأسبوع"
        read_more = "قراءة الخبر"
        footer = "لإلغاء الاشتراك"
        unsub = "إلغاء الاشتراك"
    else:
        title = "📊 Rapport hebdomadaire - BAWABA.MR"
        subtitle = "Résumé hebdomadaire des actualités gouvernementales"
        most_active_label = "La plus active"
        total_label = "Total"
        today_label = "Cette semaine"
        read_more = "Lire l'article"
        footer = "Pour vous désabonner"
        unsub = "Se désabonner"

    cards = ""
    for a in articles[:7]:
        src = a.source.name_ar or a.source.name_fr or a.source.name if a.source else ""
        summary = summarize(a.content or a.summary or a.title, max_sentences=2)
        cards += f"""
        <tr>
          <td style="padding:0 0 20px">
            <table cellpadding="0" cellspacing="0" style="width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
              <tr>
                <td style="padding:14px 18px">
                  <div style="font-size:11px;color:#888;margin-bottom:4px">{src}</div>
                  <div style="font-size:14px;font-weight:600;color:#1a1a2e;line-height:1.4;margin-bottom:4px">{a.title}</div>
                  <div style="font-size:12px;color:#555;line-height:1.5;margin-bottom:8px">{summary}</div>
                  <a href="{a.url}" style="display:inline-block;background:#0c7c3e;color:#fff;text-decoration:none;padding:7px 16px;border-radius:6px;font-size:12px;font-weight:500">{read_more}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    top_sources_rows = ""
    for s in stats["top_sources"]:
        top_sources_rows += f"""
        <tr>
          <td style="padding:6px 12px;font-size:13px;color:#333">{s['name']}</td>
          <td style="padding:6px 12px;font-size:13px;color:#0c7c3e;font-weight:700;text-align:center">{s['count']}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html dir="{'rtl' if lang == 'ar' else 'ltr'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',system-ui,sans-serif">
  <table cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin:0 auto">
    <tr>
      <td style="background:linear-gradient(135deg,#0c7c3e,#064e3b);padding:32px 24px;text-align:center;border-radius:0 0 16px 16px">
        <div style="font-size:36px;margin-bottom:6px">📊</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">{title}</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px">{subtitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px">
        <table cellpadding="0" cellspacing="0" style="width:100%">
          <tr>
            <td style="padding:16px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div style="text-align:center;padding:12px;background:#f0fdf4;border-radius:10px">
                  <div style="font-size:28px;font-weight:900;color:#0c7c3e">{stats['articles_this_week']}</div>
                  <div style="font-size:12px;color:#666">{today_label}</div>
                </div>
                <div style="text-align:center;padding:12px;background:#f0fdf4;border-radius:10px">
                  <div style="font-size:28px;font-weight:900;color:#0c7c3e">{stats['total_articles']}</div>
                  <div style="font-size:12px;color:#666">{total_label}</div>
                </div>
              </div>

              <h3 style="margin:16px 0 8px;font-size:14px;color:#1f2937">{most_active_label}</h3>
              <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
                {top_sources_rows}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    {cards}
    <tr>
      <td style="padding:20px;text-align:center;font-size:11px;color:#999;border-top:1px solid #e0e0e0">
        BAWABA.MR · {footer}<br>
        <a href="{unsubscribe_url}" style="color:#c0392b;text-decoration:underline;font-size:12px">{unsub}</a>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _build_text(stats, articles, lang, email):
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/unsubscribe/{email}/{token}/"
    lines = []

    if lang == "ar":
        lines.append("📊 التقرير الحكومي الأسبوعي - BAWABA.MR")
        lines.append("=" * 40)
        lines.append(f"أخبار هذا الأسبوع: {stats['articles_this_week']}")
        lines.append(f"إجمالي الأخبار: {stats['total_articles']}")
        lines.append("")
        lines.append("الأكثر نشاطاً:")
        for s in stats["top_sources"]:
            lines.append(f"  {s['name']}: {s['count']} خبر")
        lines.append("")
        lines.append("آخر الأخبار:")
        for a in articles[:7]:
            src = a.source.name_ar or a.source.name_fr or a.source.name if a.source else ""
            lines.append(f"  [{src}] {a.title}")
            lines.append(f"  {a.url}")
            lines.append("")
        lines.append("=" * 40)
        lines.append("لإلغاء الاشتراك: " + unsubscribe_url)
    else:
        lines.append("📊 Rapport hebdomadaire - BAWABA.MR")
        lines.append("=" * 40)
        lines.append(f"Articles cette semaine: {stats['articles_this_week']}")
        lines.append(f"Total articles: {stats['total_articles']}")
        lines.append("")
        lines.append("Les plus actives:")
        for s in stats["top_sources"]:
            lines.append(f"  {s['name']}: {s['count']} articles")
        lines.append("")
        lines.append("Dernières actualités:")
        for a in articles[:7]:
            src = a.source.name_fr or a.source.name_ar or a.source.name if a.source else ""
            lines.append(f"  [{src}] {a.title}")
            lines.append(f"  {a.url}")
            lines.append("")
        lines.append("=" * 40)
        lines.append("Se désabonner: " + unsubscribe_url)

    return "\n".join(lines)


class Command(BaseCommand):
    help = "إرسال التقرير الحكومي الأسبوعي الذكي"

    def handle(self, *args, **options):
        now = dj_timezone.now()
        week_ago = now - timedelta(days=7)

        weekly_articles = Article.objects.filter(published_at__gte=week_ago)
        weekly_count = weekly_articles.count()

        src_counts = list(
            Source.objects.filter(is_active=True, articles__published_at__gte=week_ago)
            .annotate(cnt=Count("articles"))
            .filter(cnt__gt=0)
            .order_by("-cnt")[:5]
        )

        stats = {
            "articles_this_week": weekly_count,
            "total_articles": Article.objects.count(),
            "top_sources": [
                {
                    "name": s.name_ar or s.name_fr or s.name,
                    "count": s.cnt,
                }
                for s in src_counts
            ],
        }

        arabic_articles = list(
            weekly_articles.filter(language="ar")
            .select_related("source")
            .order_by("-published_at")[:7]
        )
        french_articles = list(
            weekly_articles.filter(language="fr")
            .select_related("source")
            .order_by("-published_at")[:7]
        )

        subscribers = Subscriber.objects.filter(is_active=True)
        if not subscribers:
            self.stdout.write(self.style.WARNING("No active subscribers"))
            return

        sent = 0
        for sub in subscribers:
            articles = arabic_articles if sub.language == "ar" else french_articles
            if not articles:
                continue

            html = _build_html(stats, articles, sub.language, sub.email)
            text = _build_text(stats, articles, sub.language, sub.email)
            subject = "📊 التقرير الحكومي الأسبوعي" if sub.language == "ar" else "📊 Rapport hebdomadaire"

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
                logger.warning("Failed to send digest to %s: %s", sub.email, e)

        self.stdout.write(
            self.style.SUCCESS(
                f"Weekly digest sent to {sent}/{subscribers.count()} subscribers "
                f"({weekly_count} articles this week)"
            )
        )

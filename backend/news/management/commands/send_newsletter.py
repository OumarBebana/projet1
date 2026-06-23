"""
Management command: send_newsletter
إرسال النشرة البريدية الذكية للمشتركين.
"""

import hashlib
import hmac
import logging
from datetime import datetime

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone as dj_timezone

from news.ai_processor import summarize
from news.models import Article, Subscriber

logger = logging.getLogger(__name__)

BASE_URL = "https://bawaba.mr"

CATEGORY_ICONS = {
    "government":     "🏛",
    "economy":        "💰",
    "education":      "📚",
    "health":         "🏥",
    "security":       "🛡",
    "transport":      "🚗",
    "energy":         "⚡",
    "agriculture":    "🌾",
    "environment":    "🌿",
    "justice":        "⚖",
    "foreign_affairs":"🌍",
    "social":         "🤝",
    "general":        "📰",
}

CATEGORY_LABELS_AR = {
    "government": "الحكومة والسياسة", "economy": "الاقتصاد",
    "education": "التعليم", "health": "الصحة",
    "security": "الدفاع والأمن", "transport": "النقل",
    "energy": "الطاقة", "agriculture": "الزراعة",
    "environment": "البيئة", "justice": "العدل",
    "foreign_affairs": "الشؤون الخارجية", "social": "الشؤون الاجتماعية",
    "general": "عام",
}
CATEGORY_LABELS_FR = {
    "government": "Gouvernement", "economy": "Économie",
    "education": "Éducation", "health": "Santé",
    "security": "Sécurité", "transport": "Transport",
    "energy": "Énergie", "agriculture": "Agriculture",
    "environment": "Environnement", "justice": "Justice",
    "foreign_affairs": "Affaires étrangères", "social": "Social",
    "general": "Général",
}


def _unsubscribe_token(email: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256
    ).hexdigest()[:16]


def _format_date(dt, lang: str) -> str:
    if not dt:
        return ""
    try:
        locale = "ar-MA" if lang == "ar" else "fr-FR"
        # Simple formatting
        months_ar = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                     "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
        months_fr = ["janv","févr","mars","avr","mai","juin",
                     "juil","août","sept","oct","nov","déc"]
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt[:19])
        if lang == "ar":
            return f"{dt.day} {months_ar[dt.month-1]} {dt.year}"
        return f"{dt.day} {months_fr[dt.month-1]}. {dt.year}"
    except Exception:
        return ""


def _build_html(articles, lang: str, email: str, subscriber=None) -> str:
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/api/unsubscribe/{email}/{token}/"

    is_ar = lang == "ar"
    direction = "rtl" if is_ar else "ltr"

    if is_ar:
        header_title = "النشرة اليومية"
        header_sub = "أهم الأخبار الحكومية في موريتانيا"
        greeting = "مرحباً بك في بوابة موريتانيا 🇲🇷"
        footer_text = "هذه النشرة تُرسَل تلقائياً حسب اهتماماتك"
        unsubscribe_text = "إلغاء الاشتراك"
        read_more = "قراءة الخبر كاملاً ←"
        count_label = f"{len(articles)} خبر لهذا اليوم"
    else:
        header_title = "Newsletter quotidienne"
        header_sub = "L'actualité gouvernementale mauritanienne"
        greeting = "Bienvenue sur le Portail Mauritanien 🇲🇷"
        footer_text = "Cette newsletter est envoyée selon vos centres d'intérêt"
        unsubscribe_text = "Se désabonner"
        read_more = "Lire l'article complet →"
        count_label = f"{len(articles)} article{'s' if len(articles)>1 else ''} aujourd'hui"

    today = _format_date(dj_timezone.now(), lang)

    # Build article cards
    cards = ""
    for i, a in enumerate(articles[:7]):
        src_name = ""
        if a.source:
            src_name = a.source.name_ar if is_ar else (a.source.name_fr or a.source.name_ar)
        summary_text = summarize(a.content or a.summary or a.title, max_sentences=2)
        cat_icon = CATEGORY_ICONS.get(a.category, "📰")
        cat_label = (CATEGORY_LABELS_AR if is_ar else CATEGORY_LABELS_FR).get(a.category, "")
        pub_date = _format_date(a.published_at, lang)

        is_featured = i == 0
        card_bg = "#ffffff"
        title_size = "17px" if is_featured else "14px"
        padding = "22px 24px" if is_featured else "16px 20px"
        border_top = "4px solid #0c7c3e" if is_featured else "none"

        img_html = ""
        if is_featured and a.image_url:
            img_html = f'<img src="{a.image_url}" alt="" style="width:100%;height:200px;object-fit:cover;display:block;">'

        cards += f"""
        <tr>
          <td style="padding:0 0 16px">
            <table cellpadding="0" cellspacing="0" width="100%" style="
              background:{card_bg};
              border-radius:12px;
              overflow:hidden;
              box-shadow:0 2px 12px rgba(0,0,0,0.06);
              border-top:{border_top};
            ">
              {img_html and f'<tr><td>{img_html}</td></tr>' or ''}
              <tr>
                <td style="padding:{padding}">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding-bottom:8px">
                        <span style="
                          display:inline-block;
                          background:#f0fdf4;
                          color:#0c7c3e;
                          font-size:11px;
                          font-weight:700;
                          padding:3px 10px;
                          border-radius:20px;
                          margin-{'left' if is_ar else 'right'}:8px;
                        ">{cat_icon} {cat_label}</span>
                        <span style="
                          display:inline-block;
                          color:#888;
                          font-size:11px;
                        ">{src_name}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="
                        font-size:{title_size};
                        font-weight:700;
                        color:#1a1a2e;
                        line-height:1.5;
                        padding-bottom:8px;
                      ">{a.title}</td>
                    </tr>
                    {f'<tr><td style="font-size:13px;color:#555;line-height:1.7;padding-bottom:12px">{summary_text}</td></tr>' if summary_text and summary_text != a.title else ''}
                    <tr>
                      <td style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                      ">
                        <a href="{a.url}" style="
                          display:inline-block;
                          background:#0c7c3e;
                          color:#fff;
                          text-decoration:none;
                          padding:8px 20px;
                          border-radius:6px;
                          font-size:13px;
                          font-weight:600;
                        ">{read_more}</a>
                        {f'<span style="font-size:11px;color:#aaa">{pub_date}</span>' if pub_date else ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html dir="{direction}" lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BAWABA.MR Newsletter</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Tahoma,Arial,sans-serif">

  <!-- Wrapper -->
  <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0f4f8;padding:24px 0">
    <tr><td align="center">
    <table cellpadding="0" cellspacing="0" width="600" style="max-width:600px">

      <!-- HEADER -->
      <tr>
        <td style="
          background:linear-gradient(135deg,#084d2b 0%,#0c7c3e 60%,#1a8b4e 100%);
          padding:36px 32px 28px;
          border-radius:16px 16px 0 0;
          text-align:center;
        ">
          <div style="font-size:32px;margin-bottom:8px">🇲🇷</div>
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800;letter-spacing:0.5px">BAWABA.MR</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">{header_title} — {today}</p>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.65);font-size:12px">{header_sub}</p>
          <div style="
            display:inline-block;
            background:rgba(255,255,255,0.15);
            border:1px solid rgba(255,255,255,0.3);
            border-radius:20px;
            padding:4px 16px;
            margin-top:12px;
            font-size:12px;
            color:#fff;
            font-weight:600;
          ">{count_label}</div>
        </td>
      </tr>

      <!-- GREETING -->
      <tr>
        <td style="
          background:#fff;
          padding:20px 32px 12px;
          font-size:14px;
          color:#555;
          border-bottom:1px solid #eee;
        ">
          {greeting}
        </td>
      </tr>

      <!-- ARTICLES -->
      <tr>
        <td style="background:#f8fafb;padding:20px 24px">
          <table cellpadding="0" cellspacing="0" width="100%">
            {cards}
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="
          background:#1a1a2e;
          padding:24px 32px;
          border-radius:0 0 16px 16px;
          text-align:center;
        ">
          <div style="color:rgba(255,255,255,0.9);font-size:15px;font-weight:700;margin-bottom:6px">BAWABA.MR</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:16px">{footer_text}</div>
          <a href="{BASE_URL}" style="
            display:inline-block;
            background:#0c7c3e;
            color:#fff;
            text-decoration:none;
            padding:8px 24px;
            border-radius:20px;
            font-size:13px;
            font-weight:600;
            margin-bottom:16px;
          ">{'زيارة الموقع' if is_ar else 'Visiter le site'}</a>
          <br>
          <a href="{unsubscribe_url}" style="
            color:rgba(255,255,255,0.4);
            font-size:11px;
            text-decoration:underline;
          ">{unsubscribe_text}</a>
        </td>
      </tr>

    </table>
    </td></tr>
  </table>

</body>
</html>"""

    return html


def _build_text(articles, lang: str, email: str) -> str:
    token = _unsubscribe_token(email)
    unsubscribe_url = f"{BASE_URL}/api/unsubscribe/{email}/{token}/"
    is_ar = lang == "ar"
    lines = []
    if is_ar:
        lines.append("═" * 50)
        lines.append("     BAWABA.MR — النشرة اليومية الحكومية")
        lines.append("═" * 50)
        for a in articles[:7]:
            src = a.source.name_ar or a.source.name_fr or a.source.name if a.source else ""
            lines.append(f"\n▪ [{src}]")
            lines.append(f"  {a.title}")
            lines.append(f"  → {a.url}")
    else:
        lines.append("═" * 50)
        lines.append("     BAWABA.MR — Newsletter gouvernementale")
        lines.append("═" * 50)
        for a in articles[:7]:
            src = (a.source.name_fr or a.source.name_ar or a.source.name) if a.source else ""
            lines.append(f"\n▪ [{src}]")
            lines.append(f"  {a.title}")
            lines.append(f"  → {a.url}")
    lines.append(f"\n{'─'*50}")
    lines.append(f"{'إلغاء الاشتراك' if is_ar else 'Se désabonner'}: {unsubscribe_url}")
    return "\n".join(lines)


class Command(BaseCommand):
    help = "إرسال النشرة البريدية الذكية للمشتركين"

    def add_arguments(self, parser):
        parser.add_argument("--type", type=str, default="daily",
                            choices=["daily", "weekly"])

    def handle(self, *args, **options):
        ntype = options["type"]
        subscribers = Subscriber.objects.filter(is_active=True)
        if not subscribers.exists():
            self.stdout.write(self.style.WARNING("No active subscribers"))
            return

        # Only articles from active sources, with real published dates first
        base_qs = Article.objects.filter(source__is_active=True).select_related("source")
        arabic_articles = list(
            base_qs.filter(language="ar")
            .order_by("-created_at")[:10]
        )
        french_articles = list(
            base_qs.filter(language="fr")
            .order_by("-created_at")[:10]
        )

        if not arabic_articles and not french_articles:
            self.stdout.write(self.style.WARNING("No recent articles to send"))
            return

        sent = 0
        for sub in subscribers:
            articles = arabic_articles if sub.language == "ar" else french_articles
            if not articles:
                articles = arabic_articles or french_articles

            # Filter by subscriber interests
            if not sub.receive_all and sub.interests and "all" not in sub.interests:
                filtered = [a for a in articles if a.category in sub.interests]
                if filtered:
                    articles = filtered

            if not articles:
                continue

            subject = (
                f"📰 النشرة اليومية — BAWABA.MR" if sub.language == "ar"
                else f"📰 Newsletter quotidienne — BAWABA.MR"
            )
            html = _build_html(articles, sub.language, sub.email, sub)
            text = _build_text(articles, sub.language, sub.email)

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
                self.stdout.write(f"  ✓ Sent to {sub.email} ({sub.language})")
            except Exception as e:
                logger.warning("Failed to send to %s: %s", sub.email, e)
                self.stdout.write(self.style.ERROR(f"  ✗ Failed {sub.email}: {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"\nSent newsletter to {sent}/{subscribers.count()} subscribers"
        ))

import hashlib
import hmac
import logging
import time
import threading

from django.conf import settings
from django.core.mail import send_mail
from django.core.management import call_command
from rest_framework import filters, generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Article, Source, Subscriber
from .serializers import ArticleSerializer, SourceSerializer, ArticleTickerSerializer
from django.utils import timezone as dj_timezone

from django.db.models import Count, Q, F

from .ai_processor import is_breaking_news, summarize
from .scrapers import extract_article_meta

logger = logging.getLogger(__name__)


class SourceListView(generics.ListAPIView):
    queryset = Source.objects.filter(is_active=True).order_by("sort_order", "name")
    serializer_class = SourceSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "name_fr", "name_ar", "slug"]


class ArticleListView(generics.ListAPIView):
    serializer_class = ArticleSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "summary", "source__name", "source__name_fr", "source__name_ar"]
    ordering_fields = ["published_at", "created_at"]
    ordering = ["-published_at", "-id"]

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        # NULLs last: articles without a known date appear after dated ones
        return qs.order_by(F("published_at").desc(nulls_last=True), "-id")

    def get_queryset(self):
        qs = Article.objects.select_related("source").all()
        source_slug = self.request.query_params.get("source")
        if source_slug:
            qs = qs.filter(source__slug=source_slug)
        lang = self.request.query_params.get("lang", "")
        if lang in ("ar", "fr"):
            qs = qs.filter(language=lang)
        category = self.request.query_params.get("category", "")
        if category:
            qs = qs.filter(category=category)
        per_source = self.request.query_params.get("per_source")
        if per_source:
            try:
                per_source = int(per_source)
            except ValueError:
                per_source = 5
            sources = Source.objects.filter(is_active=True).order_by("sort_order", "name")
            ids = []
            for src in sources:
                ids.extend(qs.filter(source=src).values_list("id", flat=True)[:per_source])
            qs = qs.filter(id__in=ids)
        return qs


class ArticleDetailView(generics.RetrieveAPIView):
    queryset = Article.objects.select_related("source").all()
    serializer_class = ArticleSerializer


class LatestPerSourceView(APIView):
    def get(self, request):
        try:
            n = int(request.query_params.get("n", 5))
        except ValueError:
            n = 5
        if n < 1: n = 5
        if n > 20: n = 20
        lang = request.query_params.get("lang", "")
        sources = Source.objects.filter(is_active=True).order_by("sort_order", "name")
        result = []
        for src in sources:
            qs = Article.objects.filter(source=src)
            if lang in ("ar", "fr"):
                qs = qs.filter(language=lang)
            articles = qs.order_by(F("published_at").desc(nulls_last=True), "-id")[:n]
            result.append({
                "source": SourceSerializer(src).data,
                "articles": ArticleSerializer(articles, many=True).data,
            })
        return Response(result)


class LatestTitlesView(APIView):
    def get(self, request):
        try:
            n = int(request.query_params.get("n", 5))
        except ValueError:
            n = 5
        if n < 1: n = 5
        if n > 50: n = 50
        lang = request.query_params.get("lang", "")
        qs = Article.objects.select_related("source").all()
        if lang in ("ar", "fr"):
            qs = qs.filter(language=lang)
        articles = qs.order_by(F("published_at").desc(nulls_last=True), "-id")[:n]
        data = []
        for a in articles:
            src = a.source
            if lang == "fr":
                src_name = src.name_fr or src.name_ar or src.name
            else:
                src_name = src.name_ar or src.name_fr or src.name
            data.append({
                "id": a.id,
                "title": a.title,
                "url": a.url,
                "source_name": src_name,
                "is_breaking": a.is_breaking,
                "published_at": a.published_at,
            })
        return Response(data)


# ── Breaking ticker cache (avoids slow live scrape on every request) ──
_ticker_cache: list = []
_ticker_cache_ts: float = 0.0
_ticker_cache_lock = threading.Lock()
_TICKER_TTL = 300  # 5 minutes


def _refresh_ticker_cache() -> list:
    """Scrape live breaking items and update cache. Called in background thread."""
    from news.scrapers import scrape_breaking_ticker
    try:
        items = scrape_breaking_ticker(limit=15)
    except Exception:
        items = []
    with _ticker_cache_lock:
        global _ticker_cache, _ticker_cache_ts
        if items:
            _ticker_cache = items
        _ticker_cache_ts = time.time()
    return items


def _get_ticker_cache() -> list:
    """Return cached items; trigger background refresh if stale."""
    now = time.time()
    with _ticker_cache_lock:
        age = now - _ticker_cache_ts
        cached = list(_ticker_cache)
    if age > _TICKER_TTL:
        threading.Thread(target=_refresh_ticker_cache, daemon=True).start()
    return cached


class BreakingNewsView(APIView):
    """Return breaking news for the ticker.

    Priority:
    1. Live scrape of 'شريط عاجل' sections on government websites
    2. Articles in DB marked is_breaking=True
    3. Latest AMI (national news agency) articles
    4. Latest articles from any source (fallback)
    """

    def get(self, request):
        lang = request.query_params.get("lang", "")
        try:
            n = int(request.query_params.get("n", 15))
        except ValueError:
            n = 15
        n = max(5, min(n, 30))

        data = []

        # Priority 1: cached live scrape — Arabic only (gov sites are Arabic)
        if lang != "fr":
            live = _get_ticker_cache()
            for item in live:
                data.append({
                    "id": 0,
                    "title": item.title,
                    "url": item.url,
                    "source_name": "عاجل",
                    "is_breaking": True,
                    "published_at": None,
                })

        # Priority 2: DB articles — latest from ALL sources (1 per source, most recent)
        if len(data) < n:
            base_qs = Article.objects.select_related("source")
            if lang in ("ar", "fr"):
                base_qs = base_qs.filter(language=lang)

            seen_sources: set[str] = set()
            remaining = n - len(data)
            for a in base_qs.order_by(F("published_at").desc(nulls_last=True), "-id")[:n * 6]:
                slug = a.source.slug if a.source else ""
                if slug in seen_sources:
                    continue
                seen_sources.add(slug)
                src = a.source
                src_name = (src.name_fr or src.name_ar or src.name) if lang == "fr" \
                    else (src.name_ar or src.name_fr or src.name)
                data.append({
                    "id": a.id,
                    "title": a.title,
                    "url": a.url,
                    "source_name": src_name,
                    "is_breaking": a.is_breaking,
                    "published_at": a.published_at,
                })
                if len(data) - len(live) >= remaining:
                    break

        return Response({"results": data[:n], "count": min(len(data), n)})


class FetchNowView(APIView):
    def post(self, request):
        lang = request.data.get("lang", "")
        try:
            call_command("fetch_news", lang=lang)
            return Response({"status": "ok"})
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)


class FetchArticleContentView(APIView):
    def post(self, request, pk):
        try:
            article = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({"status": "error", "message": "Article not found"}, status=404)
        date, content = extract_article_meta(article.url)
        if content and len(content) > 50:
            article.content = content
            if date and not article.published_at:
                article.published_at = date if dj_timezone.is_aware(date) else dj_timezone.make_aware(date)
            article.save(update_fields=["content", "published_at"])
            return Response({"status": "ok", "content": content, "published_at": str(article.published_at) if article.published_at else None})
        return Response({"status": "error", "message": "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u062d\u062a\u0648\u0649"})


INTEREST_NAMES = {
    "government": "\ud83c\udfdb \u0627\u0644\u062d\u0643\u0648\u0645\u0629 \u0648\u0627\u0644\u0633\u064a\u0627\u0633\u0629",
    "economy": "\ud83d\udcb0 \u0627\u0644\u0627\u0642\u062a\u0635\u0627\u062f \u0648\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
    "education": "\ud83d\udcda \u0627\u0644\u062a\u0639\u0644\u064a\u0645",
    "health": "\ud83c\udfe5 \u0627\u0644\u0635\u062d\u0629",
    "security": "\ud83d\udee1 \u0627\u0644\u062f\u0641\u0627\u0639 \u0648\u0627\u0644\u0623\u0645\u0646",
    "transport": "\ud83d\ude97 \u0627\u0644\u0646\u0642\u0644",
    "energy": "\u26a1 \u0627\u0644\u0637\u0627\u0642\u0629",
    "agriculture": "\ud83c\udf3e \u0627\u0644\u0632\u0631\u0627\u0639\u0629",
    "environment": "\ud83c\udf3f \u0627\u0644\u0628\u064a\u0626\u0629",
    "justice": "\u2696 \u0627\u0644\u0639\u062f\u0644",
    "foreign_affairs": "\ud83c\udf0d \u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u062e\u0627\u0631\u062c\u064a\u0629",
    "social": "\ud83e\udd1d \u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0627\u062c\u062a\u0645\u0627\u0639\u064a\u0629",
}


@api_view(["GET"])
def newsletter_stats(request):
    total = Subscriber.objects.filter(is_active=True).count()
    return Response({"total_subscribers": total})


@api_view(["POST"])
def subscribe_newsletter(request):
    email = request.data.get("email", "").strip().lower()
    interests = request.data.get("interests", [])
    lang = request.data.get("language", "ar")
    frequency = request.data.get("frequency", "daily")
    if frequency not in ("daily", "weekly", "monthly"):
        frequency = "daily"

    if not email:
        return Response({"error": "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0645\u0637\u0644\u0648\u0628"}, status=400)
    if not interests:
        return Response({"error": "\u0627\u062e\u062a\u0631 \u0627\u0647\u062a\u0645\u0627\u0645\u0627\u064b \u0648\u0627\u062d\u062f\u0627\u064b \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644"}, status=400)
    existing = Subscriber.objects.filter(email=email).first()
    if existing:
        if existing.is_active:
            return Response({"error": "\u0623\u0646\u062a \u0645\u0634\u062a\u0631\u0643 \u0645\u0633\u0628\u0642\u0627\u064b \u0641\u064a \u0627\u0644\u0646\u0634\u0631\u0629 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u0629"}, status=409)
        existing.is_active = True
        existing.interests = interests
        existing.language = lang
        existing.newsletter_type = frequency
        existing.receive_all = False
        existing.save(update_fields=["is_active", "interests", "language", "newsletter_type", "receive_all"])
        subscriber = existing
    else:
        subscriber = Subscriber.objects.create(
            email=email, language=lang, interests=interests,
            receive_all=False, is_active=True,
            newsletter_type=frequency,
        )

    interests_text = ""
    if interests:
        names = [INTEREST_NAMES.get(s, s) for s in interests if s]
        interest_lines = "<br>".join(f"\u2713 {n}" for n in names)
        interests_text = (
            f"<div style='margin-top:14px;padding:12px 16px;background:#f0fdf4;"
            f"border-radius:10px;font-size:14px;color:#166534;text-align:right'>"
            f"<strong style='display:block;margin-bottom:8px'>\u2705 \u0623\u0646\u062a \u0645\u0634\u062a\u0631\u0643 \u0641\u064a:</strong>"
            f"{interest_lines}</div>"
        )

    latest_articles = Article.objects.filter(
        category__in=interests
    ).order_by("-published_at", "-id")[:5]

    latest_html = ""
    if latest_articles:
        items = []
        for a in latest_articles:
            src = a.source.name_ar or a.source.name_fr or a.source.name
            title = a.title[:80] + "..." if len(a.title) > 80 else a.title
            items.append(
                f"<tr><td style='padding:10px 0;border-bottom:1px solid #eee'>"
                f"<div style='font-size:11px;color:#888'>{src}</div>"
                f"<a href='{a.url}' style='color:#1a73e8;font-size:14px;font-weight:600;text-decoration:none'>{title}</a>"
                f"</td></tr>"
            )
        latest_html = (
            f"<div style='margin-top:16px;text-align:right'>"
            f"<h3 style='font-size:15px;color:#1a1a2e;margin-bottom:8px'>\U0001f4f0 \u0622\u062e\u0631 \u0627\u0644\u0623\u062e\u0628\u0627\u0631 \u062d\u0633\u0628 \u0627\u0647\u062a\u0645\u0627\u0645\u0627\u062a\u0643</h3>"
            f"<table style='width:100%;font-size:14px'>{''.join(items)}</table></div>"
        )

    subject = "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0641\u064a \u0627\u0644\u0646\u0634\u0631\u0629 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u0629 - BAWABA.MR"
    html_text = "\u062a\u0645 \u0627\u0634\u062a\u0631\u0627\u0643\u0643 \u0628\u0646\u062c\u0627\u062d \u0641\u064a \u0627\u0644\u0646\u0634\u0631\u0629 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u0629 \u0644\u0628\u0648\u0627\u0628\u0629 \u0645\u0648\u0631\u064a\u062a\u0627\u0646\u064a\u0627."

    token = hmac.new(settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256).hexdigest()[:16]
    unsubscribe_link = f"https://bawaba.mr/api/unsubscribe/{email}/{token}/"

    html = (
        '<!DOCTYPE html>\n'
        '<html dir="rtl">\n'
        '<head><meta charset="utf-8"></head>\n'
        '<body style="margin:0;padding:0;background:#f5f7fa;font-family:Segoe UI,sans-serif">\n'
        '<table cellpadding="0" cellspacing="0" style="width:100%;max-width:500px;margin:0 auto">\n'
        '<tr><td style="background:linear-gradient(135deg,#0c7c3e,#0a5e2e);padding:32px 24px;text-align:center;border-radius:0 0 16px 16px">\n'
        '<h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">BAWABA.MR</h1>\n'
        '</td></tr>\n'
        '<tr><td style="padding:24px 20px;text-align:center">\n'
        '<div style="font-size:48px;margin-bottom:12px">&#x2709;&#xFE0F;</div>\n'
        '<div style="font-size:16px;color:#1a1a2e;line-height:1.6">' + html_text + '</div>\n'
        + interests_text + '\n'
        + latest_html + '\n'
        '<hr style="margin:16px 0;border:none;border-top:1px solid #eee">\n'
        '<p style="font-size:12px;color:#aaa">\u0644\u0627 \u062a\u0631\u063a\u0628 \u0641\u064a \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0623\u062e\u0628\u0627\u0631?<br>\n'
        '<a href="' + unsubscribe_link + '" style="color:#dc3545;font-weight:700;text-decoration:none">'
        '\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643</a></p>\n'
        '</td></tr>\n'
        '</table>\n'
        '</body>\n'
        '</html>'
    )

    try:
        send_mail(subject, html_text, settings.DEFAULT_FROM_EMAIL, [email], html_message=html, fail_silently=False)
    except Exception as e:
        return Response({"error": f"\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0643\u0646 \u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u064a\u0645\u064a\u0644: {str(e)}"}, status=500)

    return Response({"message": "\u062a\u0645 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u0646\u062c\u0627\u062d \u2705"}, status=201)


@api_view(["GET"])
def check_subscription(request):
    email = request.query_params.get("email", "").strip().lower()
    if not email:
        return Response({"subscribed": False, "interests": []})
    try:
        sub = Subscriber.objects.get(email=email, is_active=True)
        if sub.interests and "all" not in sub.interests:
            article_count = Article.objects.filter(
                category__in=sub.interests
            ).count()
        else:
            article_count = Article.objects.count()
        return Response({
            "subscribed": True,
            "interests": sub.interests,
            "last_sent": sub.last_sent.isoformat() if sub.last_sent else None,
            "article_count": article_count,
        })
    except Subscriber.DoesNotExist:
        return Response({"subscribed": False, "interests": []})


@api_view(["POST", "PATCH"])
def manage_subscription(request):
    email = request.data.get("email", "").strip().lower()
    interests = request.data.get("interests")
    action = request.data.get("action", "")
    if not email:
        return Response({"error": "Email \u0645\u0637\u0644\u0648\u0628"}, status=400)
    try:
        sub = Subscriber.objects.get(email=email, is_active=True)
    except Subscriber.DoesNotExist:
        return Response({"error": "\u0627\u0644\u0628\u0631\u064a\u062f \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f \u0623\u0648 \u063a\u064a\u0631 \u0645\u0634\u062a\u0631\u0643"}, status=404)

    if action == "unsubscribe":
        sub.is_active = False
        sub.save(update_fields=["is_active"])
        return Response({"message": "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u0646\u062c\u0627\u062d"})

    if interests is not None:
        sub.interests = interests
    sub.save(update_fields=["interests"])
    return Response({"message": "\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0647\u062a\u0645\u0627\u0645\u0627\u062a\u0643 \u0628\u0646\u062c\u0627\u062d", "interests": sub.interests})


@api_view(["GET"])
def newsletter_preview(request):
    interests = request.query_params.getlist("interests")
    if not interests:
        interests = list(Source.objects.filter(is_active=True).values_list("slug", flat=True))
    articles = Article.objects.filter(
        category__in=interests
    ).select_related("source").order_by("-published_at", "-id")[:5]
    data = []
    for a in articles:
        src_name = a.source.name_ar or a.source.name_fr or a.source.name
        data.append({
            "title": a.title,
            "source": src_name,
            "source_slug": a.source.slug,
            "summary": summarize(a.content or a.summary or a.title, max_sentences=1),
            "url": a.url,
            "published_at": a.published_at.isoformat() if a.published_at else None,
        })
    return Response({"articles": data, "count": len(data)})


@api_view(["POST"])
def unsubscribe_newsletter(request):
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response({"error": "\u0623\u062f\u062e\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0644\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643"}, status=400)
    try:
        subscriber = Subscriber.objects.get(email=email)
    except Subscriber.DoesNotExist:
        return Response({"error": "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u063a\u064a\u0631 \u0645\u0634\u062a\u0631\u0643 \u0641\u064a \u0627\u0644\u0646\u0634\u0631\u0629 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u0629"}, status=404)
    if not subscriber.is_active:
        return Response({"error": "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u063a\u064a\u0631 \u0645\u0634\u062a\u0631\u0643 \u0641\u064a \u0627\u0644\u0646\u0634\u0631\u0629 \u0627\u0644\u0628\u0631\u064a\u062f\u064a\u0629"}, status=400)
    subscriber.is_active = False
    subscriber.save(update_fields=["is_active"])
    return Response({"message": "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0644\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064a\u062f \u0641\u0642\u0637"}, status=200)


@api_view(["GET"])
def unsubscribe_by_token(request, email, token):
    expected = hmac.new(settings.SECRET_KEY.encode(), email.encode(), hashlib.sha256).hexdigest()[:16]
    if token != expected:
        return Response({"error": "\u0631\u0627\u0628\u0637 \u063a\u064a\u0631 \u0635\u0627\u0644\u062d"}, status=400)
    try:
        sub = Subscriber.objects.get(email=email)
        sub.is_active = False
        sub.save(update_fields=["is_active"])
        return Response({"message": "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0628\u0646\u062c\u0627\u062d"})
    except Subscriber.DoesNotExist:
        return Response({"error": "\u0627\u0644\u0628\u0631\u064a\u062f \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f"}, status=404)


@api_view(["GET"])
def dashboard_stats(request):
    from datetime import timedelta
    now = dj_timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=6)  # rolling 7-day window

    # Count by published_at (the real publication date on the source website)
    articles_today = Article.objects.filter(
        published_at__gte=today_start
    ).count()
    articles_week = Article.objects.filter(
        published_at__gte=week_start
    ).count()

    sources_active = Source.objects.filter(is_active=True).count()
    subscribers_active = Subscriber.objects.filter(is_active=True).count()

    # Most recently published article
    latest = Article.objects.filter(
        published_at__isnull=False
    ).order_by("-published_at").values("published_at").first()

    return Response({
        "articles": {
            "today": articles_today,
            "this_week": articles_week,
        },
        "sources": {"active": sources_active},
        "subscribers": {"active": subscribers_active},
        "latest_published": latest["published_at"].isoformat() if latest else None,
    })

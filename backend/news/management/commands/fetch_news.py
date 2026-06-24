
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import unquote

from django.core.management.base import BaseCommand
from django.utils import timezone as dj_timezone

from news.models import Article, ArticleCategory, FetchMethod, Source
from news.scrapers import fetch_source_news
from news.ai_processor import summarize, classify, is_breaking_news

logger = logging.getLogger(__name__)

# Sources confirmed to have working French-language news pages
FRENCH_CAPABLE_SLUGS = {
    "primature", "economie-finances", "affaires-etrangeres",
    "education", "justice", "fonction-publique",
    "agriculture", "culture", "masef", "energies-petrole",
    "enseignement-superieur", "numerique", "elevage",
    "commerce-tourisme",
}

# Sources whose RSS/scrape already contains both languages — skip the second lang pass
_BILINGUAL_SLUGS = {"ami"}


def _detect_language(title: str) -> str:
    """Detect language: Arabic if >30% Arabic chars (all Unicode Arabic blocks)."""
    if not title:
        return ""
    title = unquote(title)
    arabic_chars = sum(
        1 for c in title
        if '\u0600' <= c <= '\u06FF'      # Arabic
        or '\u0750' <= c <= '\u077F'      # Arabic Supplement
        or '\u08A0' <= c <= '\u08FF'      # Arabic Extended-A
        or '\uFB50' <= c <= '\uFDFF'      # Arabic Pres. Forms-A
        or '\uFE70' <= c <= '\uFEFF'      # Arabic Pres. Forms-B
        or '\u10E60' <= c <= '\u10E7F'    # Rumi
        or '\u1EE00' <= c <= '\u1EEFF'    # Arabic Mathematical
    )
    ratio = arabic_chars / max(len(title), 1)
    if ratio > 0.3:
        return "ar"
    return "fr"


def _save_articles(source: Source, items, limit: int) -> int:
    """Save scraped items to database, return count of new articles."""
    saved = 0
    cutoff = dj_timezone.now() - timedelta(days=90)  # allow articles up to 90 days old

    # Sort by date descending (None dates last), then take latest `limit`
    sorted_items = sorted(
        items,
        key=lambda x: (
            dj_timezone.make_aware(x.published_at) if x.published_at and dj_timezone.is_naive(x.published_at)
            else x.published_at if x.published_at
            else datetime.min.replace(tzinfo=timezone.utc)
        ),
        reverse=True,
    )[:limit]

    # Skip already-seen URLs
    seen_urls = set(
        Article.objects.filter(
            url__in=[item.url for item in sorted_items]
        ).values_list("url", flat=True)
    )

    for item in sorted_items:
        if not item.title or not item.url:
            continue
        if item.url in seen_urls:
            continue

        # Skip articles older than 90 days ONLY if we have a date
        if item.published_at:
            pub = item.published_at
            if dj_timezone.is_naive(pub):
                pub = dj_timezone.make_aware(pub)
            if pub < cutoff:
                continue

        # Decode URL-encoded titles
        title = unquote(item.title)
        summary = unquote(item.summary) if item.summary else ""

        # AI enrichment
        if not summary and item.content:
            try:
                summary = summarize(item.content)
            except Exception:
                summary = item.content[:300]

        content = unquote(item.content) if item.content else ""
        category_key = classify(source.slug, title, content)
        # Force breaking if found in homepage ticker; otherwise use keyword+AI detection
        is_breaking = True if item.fetch_method == "breaking" else is_breaking_news(title, content)
        lang = _detect_language(title)

        # Resolve fetch method
        method_map = {
            "rss": FetchMethod.RSS,
            "sitemap": FetchMethod.SITEMAP,
            "scrape": FetchMethod.SCRAPE,
        }
        fetch_method = method_map.get(item.fetch_method, FetchMethod.SCRAPE)

        # Resolve category
        cat_map = {
            "government": ArticleCategory.GOVERNMENT,
            "economy": ArticleCategory.ECONOMY,
            "education": ArticleCategory.EDUCATION,
            "health": ArticleCategory.HEALTH,
            "security": ArticleCategory.SECURITY,
            "environment": ArticleCategory.ENVIRONMENT,
            "transport": ArticleCategory.TRANSPORT,
            "energy": ArticleCategory.ENERGY,
            "agriculture": ArticleCategory.AGRICULTURE,
            "justice": ArticleCategory.JUSTICE,
            "foreign_affairs": ArticleCategory.FOREIGN,
            "social": ArticleCategory.SOCIAL,
        }
        category = cat_map.get(category_key, ArticleCategory.GENERAL)

        pub = item.published_at
        if pub and dj_timezone.is_naive(pub):
            pub = dj_timezone.make_aware(pub)

        # If still no date, try to extract from article page
        if not pub or not content or not item.image_url:
            try:
                from news.scrapers import _soup, _extract_date_from_meta, extract_article_body
                page_soup = _soup(item.url, timeout=5)
                if page_soup:
                    if not pub:
                        raw_date = _extract_date_from_meta(page_soup)
                        if raw_date:
                            pub = dj_timezone.make_aware(raw_date) if dj_timezone.is_naive(raw_date) else raw_date
                    if not content:
                        content = extract_article_body(item.url)
                        if content and not summary:
                            summary = content[:300]
                    if not item.image_url:
                        og = page_soup.select_one('meta[property="og:image"]')
                        if og and og.get("content"):
                            from urllib.parse import urljoin
                            item = item.__class__(
                                title=item.title, url=item.url, summary=item.summary,
                                content=content, image_url=urljoin(item.url, og["content"]),
                                published_at=item.published_at, fetch_method=item.fetch_method,
                            )
            except Exception:
                pass

        # Leave published_at as None if no real date was found on the source website.
        # Fabricating a date causes misleading "today/week" stats.

        try:
            Article.objects.create(
                source=source,
                title=title,
                url=item.url,
                summary=summary or "",
                content=content or "",
                image_url=item.image_url or "",
                language=lang,
                category=category,
                fetch_method=fetch_method,
                is_breaking=is_breaking,
                published_at=pub,
            )
            saved += 1
        except Exception as exc:
            logger.warning("Could not save article '%s': %s", title[:60], exc)

    return saved


class Command(BaseCommand):
    help = "Fetch latest news from all active government sources"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=5,
            help="Number of articles to fetch per source (default: 5)",
        )
        parser.add_argument(
            "--source",
            type=str,
            default="",
            help="Fetch only from this source slug (e.g. presidence)",
        )
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Show detailed output",
        )
        parser.add_argument(
            "--lang",
            type=str,
            default="",
            choices=["", "ar", "fr"],
            help='Language: "ar" for Arabic, "fr" for French, or empty for both (default: both)',
        )

    def _fetch_source(self, source, limit, verbose, lang):
        """Fetch news for a single source in a given language. Returns new_count."""
        # Skip French fetch for sources without a working French page
        if lang == "fr" and source.slug not in FRENCH_CAPABLE_SLUGS:
            return 0, 0
        items = fetch_source_news(
            rss_url=source.rss_url or "",
            news_url=source.news_url or "",
            website_url=source.website_url or "",
            limit=limit,
            scrape_link_selector=source.scrape_link_selector or "",
            scrape_title_selector=source.scrape_title_selector or "",
            scrape_date_selector=source.scrape_date_selector or "",
            lang=lang,
        )
        new_count = _save_articles(source, items, limit)
        if verbose or new_count > 0:
            method_info = ""
            if items:
                method_info = f" [{items[0].fetch_method}]"
            self.stdout.write(
                f"  OK {source.slug} ({lang or 'ar+fr'}): "
                f"{new_count} new / {len(items)} fetched{method_info}"
            )
        return new_count, len(items)

    def handle(self, *args, **options):
        import concurrent.futures

        limit = max(1, min(options["limit"], 20))
        source_slug = options["source"]
        verbose = options["verbose"]
        lang = options["lang"]

        sources = Source.objects.filter(is_active=True).order_by("sort_order", "name")
        if source_slug:
            sources = sources.filter(slug=source_slug)
            if not sources.exists():
                self.stdout.write(self.style.ERROR(f"Source '{source_slug}' not found."))
                return

        count = sources.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"[BAWABA.MR] Fetching {limit} articles/source from {count} sources "
                f"[lang: {lang if lang else 'ar+fr'}]..."
            )
        )

        total_new = 0
        total_errors = 0

        def _run_source(source, langs_to_try):
            got = 0
            effective_langs = [""] if source.slug in _BILINGUAL_SLUGS else langs_to_try
            for fetch_lang in effective_langs:
                n_new, n_fetched = self._fetch_source(source, limit, verbose, fetch_lang)
                got += n_new
                source.last_fetched_at = dj_timezone.now()
                source.last_fetch_status = "success" if n_fetched > 0 else "unknown"
                source.last_fetch_count = got
                source.last_fetch_error = ""
                source.save(
                    update_fields=[
                        "last_fetched_at", "last_fetch_status",
                        "last_fetch_count", "last_fetch_error",
                    ]
                )
            return got

        langs_to_try = [lang] if lang else ["ar", "fr"]

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            fut_to_source = {
                pool.submit(_run_source, source, langs_to_try): source
                for source in sources
            }
            for fut in concurrent.futures.as_completed(fut_to_source, timeout=180):
                source = fut_to_source[fut]
                try:
                    n = fut.result(timeout=60)
                    total_new += n
                except concurrent.futures.TimeoutError:
                    total_errors += 1
                    logger.warning("Timeout fetching %s (60s)", source.slug)
                    self.stdout.write(self.style.ERROR(f"  TIMEOUT {source.slug} (exceeded 60s)"))
                    source.last_fetched_at = dj_timezone.now()
                    source.last_fetch_status = "fail"
                    source.last_fetch_error = "Timeout (15s)"
                    source.save(update_fields=["last_fetched_at", "last_fetch_status", "last_fetch_error"])
                except Exception as exc:
                    total_errors += 1
                    logger.exception("Error fetching %s: %s", source.slug, exc)
                    source.last_fetched_at = dj_timezone.now()
                    source.last_fetch_status = "fail"
                    source.last_fetch_error = str(exc)[:500]
                    source.save(update_fields=["last_fetched_at", "last_fetch_status", "last_fetch_error"])
                    self.stdout.write(
                        self.style.ERROR(f"  ERR {source.slug}: {exc}")
                    )
            # scan for any remaining incomplete futures
            for fut in fut_to_source:
                if not fut.done():
                    source = fut_to_source[fut]
                    total_errors += 1
                    logger.warning("Abandoned fetch for %s (overall timeout)", source.slug)
                    source.last_fetched_at = dj_timezone.now()
                    source.last_fetch_status = "fail"
                    source.last_fetch_error = "Overall timeout"
                    source.save(update_fields=["last_fetched_at", "last_fetch_status", "last_fetch_error"])
                    fut.cancel()

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done! New articles: {total_new} | Errors: {total_errors}"
            )
        )
        self.stdout.write(
            f"Total articles in DB: {Article.objects.count()}"
        )

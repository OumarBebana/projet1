"""
Management command: fix_rss_urls
- Sets RSS URLs for sources that have feeds but weren't configured
- Then re-fetches dates for articles that have published_at = NULL
"""
import sys
import logging
import requests
from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone as dj_timezone

logger = logging.getLogger(__name__)

# Known RSS feeds with real publication dates
KNOWN_RSS = {
    # Verified working RSS feeds with pubDate
    "primature":          "https://primature.gov.mr/rss.xml",
    "culture":            "https://culture.gov.mr/rss.xml",
    "agriculture":        "https://agriculture.gov.mr/rss.xml",
    "interieur":          "https://interieur.gov.mr/rss.xml",
    "masef":              "https://masef.gov.mr/rss.xml",
}

HDRS = {"User-Agent": "Mozilla/5.0 (compatible; BawabaMR/1.0)"}


def _safe(text: str, max_len: int = 70) -> str:
    enc = sys.stdout.encoding or "ascii"
    return text[:max_len].encode(enc, errors="replace").decode(enc)


def _verify_rss(url: str) -> bool:
    """Return True if URL is a valid RSS feed with pubDate."""
    try:
        r = requests.get(url, timeout=8, headers=HDRS, allow_redirects=True)
        return r.status_code == 200 and ("<pubDate>" in r.text or "<published>" in r.text)
    except Exception:
        return False


def _rss_dates(rss_url: str) -> dict:
    """Return {article_url: datetime} mapping from RSS feed."""
    import feedparser
    result = {}
    try:
        feed = feedparser.parse(rss_url)
        for entry in feed.entries:
            url = getattr(entry, "link", "") or ""
            if not url:
                continue
            pub = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    pub = datetime(*entry.published_parsed[:6])
                except Exception:
                    pass
            if not pub and hasattr(entry, "updated_parsed") and entry.updated_parsed:
                try:
                    pub = datetime(*entry.updated_parsed[:6])
                except Exception:
                    pass
            if pub:
                result[url.rstrip("/")] = pub
    except Exception as e:
        logger.warning("RSS parse error for %s: %s", rss_url, e)
    return result


class Command(BaseCommand):
    help = "Set RSS URLs for sources and fix NULL published_at dates from RSS feeds"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would be done without changing DB")
        parser.add_argument("--source", help="Limit to one source slug")

    def handle(self, *args, **options):
        from news.models import Source, Article

        dry = options["dry_run"]
        only = options.get("source")

        # ── Step 1: Update RSS URLs ──
        self.stdout.write("=== Step 1: Setting RSS URLs ===")
        for slug, rss_url in KNOWN_RSS.items():
            if only and slug != only:
                continue
            try:
                src = Source.objects.get(slug=slug)
            except Source.DoesNotExist:
                continue

            if src.rss_url:
                self.stdout.write(f"  {slug}: already has RSS, skipping URL update")
                continue

            ok = _verify_rss(rss_url)
            if ok:
                self.stdout.write(self.style.SUCCESS(f"  {slug}: RSS OK -> {rss_url}"))
                if not dry:
                    src.rss_url = rss_url
                    src.save(update_fields=["rss_url"])
            else:
                self.stdout.write(self.style.WARNING(f"  {slug}: RSS not reachable ({rss_url})"))

        # ── Step 2: Fix NULL dates from RSS ──
        self.stdout.write("\n=== Step 2: Fixing NULL dates from RSS ===")
        sources = Source.objects.exclude(rss_url="").exclude(rss_url__isnull=True)
        if only:
            sources = sources.filter(slug=only)

        total_fixed = 0
        for src in sources:
            null_arts = Article.objects.filter(source=src, published_at__isnull=True)
            count = null_arts.count()
            if count == 0:
                continue

            self.stdout.write(f"  {src.slug}: {count} articles without date, fetching RSS...")
            rss_map = _rss_dates(src.rss_url)
            if not rss_map:
                self.stdout.write(self.style.WARNING(f"    No dates from RSS"))
                continue

            fixed = 0
            for art in null_arts:
                clean_url = art.url.rstrip("/")
                pub = rss_map.get(clean_url)
                if not pub:
                    # Try matching by URL path tail
                    for rss_url, rss_date in rss_map.items():
                        if clean_url.split("/")[-1] == rss_url.split("/")[-1]:
                            pub = rss_date
                            break
                if pub:
                    if not dry:
                        aware = dj_timezone.make_aware(pub) if pub.tzinfo is None else pub
                        art.published_at = aware
                        art.save(update_fields=["published_at"])
                    fixed += 1
                    total_fixed += 1

            self.stdout.write(self.style.SUCCESS(f"    Fixed {fixed}/{count}"))

        # ── Step 3: Fix remaining NULLs from page HTML ──
        self.stdout.write("\n=== Step 3: Fixing remaining NULLs from page HTML ===")
        from news.scrapers import _extract_date_from_meta, _soup

        remaining = Article.objects.filter(published_at__isnull=True)
        if only:
            remaining = remaining.filter(source__slug=only)

        html_fixed = 0
        html_total = remaining.count()
        self.stdout.write(f"  {html_total} articles still without date")

        for art in remaining:
            soup = _soup(art.url, timeout=8)
            if not soup:
                continue
            pub = _extract_date_from_meta(soup)
            if pub:
                if not dry:
                    aware = dj_timezone.make_aware(pub) if pub.tzinfo is None else pub
                    art.published_at = aware
                    art.save(update_fields=["published_at"])
                html_fixed += 1

        self.stdout.write(self.style.SUCCESS(f"  HTML fixed: {html_fixed}/{html_total}"))

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. RSS fixed: {total_fixed} | HTML fixed: {html_fixed}"
            + (" [DRY RUN]" if dry else "")
        ))

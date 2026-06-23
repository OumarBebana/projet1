"""
fix_dates.py — Fix articles whose published_at is suspiciously equal to created_at
(i.e., the fallback now() was used because no real date was found).

Strategy:
  1. Re-fetch the article page and try all date extraction methods.
  2. If a real date is found → update published_at.
  3. If no date found → set published_at = NULL (honest: unknown > wrong).
"""
from __future__ import annotations

import logging
import sys
from django.core.management.base import BaseCommand
from django.utils import timezone as dj_timezone


def _safe(text: str, max_len: int = 55) -> str:
    """Encode text safely for Windows console (cp1252 / ascii)."""
    return text[:max_len].encode(sys.stdout.encoding or "ascii", errors="replace").decode(sys.stdout.encoding or "ascii")

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Fix articles whose published_at == created_at (wrong fetch-time date)"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would change without saving")
        parser.add_argument("--limit", type=int, default=100, help="Max articles to process per run")
        parser.add_argument("--null-unfixable", action="store_true", default=True,
                            help="Set published_at=NULL for articles with no detectable date (default: True)")
        parser.add_argument("--source", type=str, default="", help="Filter by source slug")

    def handle(self, *args, **options):
        from news.models import Article
        from news.scrapers import _soup, _extract_date_from_meta, _extract_date_from_url

        dry_run = options["dry_run"]
        limit = options["limit"]
        null_unfixable = options["null_unfixable"]
        source_slug = options.get("source", "")

        qs = Article.objects.filter(published_at__isnull=False).select_related("source")
        if source_slug:
            qs = qs.filter(source__slug=source_slug)

        # Find articles where published_at is within 5 minutes of created_at
        suspect = []
        for a in qs.iterator():
            delta = abs((a.published_at - a.created_at).total_seconds())
            if delta < 300:
                suspect.append(a)

        total = len(suspect)
        self.stdout.write(f"Found {total} articles with suspect dates (pub ~= created_at)")
        if source_slug:
            self.stdout.write(f"  (filtered to source: {source_slug})")

        fixed = 0
        nulled = 0
        failed = 0

        for art in suspect[:limit]:
            try:
                page_soup = _soup(art.url, timeout=10)
                raw_date = None

                if page_soup:
                    raw_date = _extract_date_from_meta(page_soup)

                # Also try URL-based date (e.g. /2024/06/18/ in path)
                if not raw_date:
                    raw_date = _extract_date_from_url(art.url)

                if raw_date:
                    pub = dj_timezone.make_aware(raw_date) if dj_timezone.is_naive(raw_date) else raw_date
                    now = dj_timezone.now()
                    # Sanity checks
                    if pub > now:
                        # Date is in the future — reject
                        if null_unfixable and not dry_run:
                            art.published_at = None
                            art.save(update_fields=["published_at"])
                        nulled += 1
                        self.stdout.write(f"  ~ [{art.source.slug}] future date -> NULL: {_safe(art.title)}")
                        continue
                    delta_sec = abs((pub - art.created_at).total_seconds())
                    if delta_sec < 600:
                        if null_unfixable and not dry_run:
                            art.published_at = None
                            art.save(update_fields=["published_at"])
                        nulled += 1
                        self.stdout.write(f"  ~ [{art.source.slug}] too close to fetch -> NULL: {_safe(art.title)}")
                        continue
                    # Good real date found
                    if not dry_run:
                        art.published_at = pub
                        art.save(update_fields=["published_at"])
                    self.stdout.write(f"  + [{art.source.slug}] {_safe(art.title)} -> {pub.date()}")
                    fixed += 1
                else:
                    # No date found at all
                    if null_unfixable:
                        if not dry_run:
                            art.published_at = None
                            art.save(update_fields=["published_at"])
                        self.stdout.write(f"  0 [{art.source.slug}] no date -> NULL: {_safe(art.title)}")
                        nulled += 1
                    else:
                        failed += 1

            except Exception as e:
                logger.warning("fix_dates error for %s: %s", art.url, str(e)[:100])
                failed += 1

        action = "Would have" if dry_run else "Done:"
        self.stdout.write(self.style.SUCCESS(
            f"\n{action} fixed={fixed} nulled={nulled} failed={failed} (of {min(total, limit)} processed)"
        ))

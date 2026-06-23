from __future__ import annotations

from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand

from news.models import Source


def _is_xml_response(resp: requests.Response) -> bool:
    ctype = (resp.headers.get("content-type") or "").lower()
    head = (resp.text or "")[:200].lstrip().lower()
    if "text/html" in ctype or head.startswith("<!doctype html") or head.startswith("<html"):
        return False
    return ("xml" in ctype) or head.startswith("<?xml") or "<rss" in head or "<feed" in head


def _normalize_base(url: str) -> str:
    if not url:
        return url
    # Prefer https when possible
    if url.startswith("http://"):
        return "https://" + url[len("http://") :]
    return url


class Command(BaseCommand):
    help = "Try to auto-detect RSS/Atom feeds for sources missing rss_url."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        limit = int(options.get("limit") or 50)
        qs = Source.objects.filter(is_active=True, rss_url="").exclude(website_url="")[:limit]

        if not qs.exists():
            self.stdout.write(self.style.WARNING("No sources to process (rss_url already set or website_url missing)."))
            return

        updated = 0

        for source in qs:
            base = _normalize_base(source.website_url.strip())
            self.stdout.write(f"- {source.slug}: {base}")

            candidates: list[str] = []
            try:
                resp = requests.get(base, timeout=25, headers={"User-Agent": "Mozilla/5.0"})
                html = resp.text
                soup = BeautifulSoup(html, "html.parser")
                for link in soup.find_all("link"):
                    rel = " ".join(link.get("rel") or []).lower()
                    typ = (link.get("type") or "").lower()
                    href = (link.get("href") or "").strip()
                    if not href:
                        continue
                    if "alternate" in rel and ("rss" in typ or "xml" in typ):
                        candidates.append(urljoin(base, href))
            except Exception:
                pass

            # Common feed endpoints
            parsed = urlparse(base)
            root = f"{parsed.scheme}://{parsed.netloc}/"
            candidates.extend(
                [
                    urljoin(root, "rss.xml"),
                    urljoin(root, "feed/"),
                    urljoin(root, "rss"),
                    urljoin(root, "atom.xml"),
                ]
            )

            found = ""
            for u in candidates:
                try:
                    r = requests.get(u, timeout=25, headers={"User-Agent": "Mozilla/5.0"}, allow_redirects=True)
                    if r.status_code >= 400:
                        continue
                    if _is_xml_response(r):
                        found = r.url
                        break
                except Exception:
                    continue

            if found:
                source.rss_url = found
                source.save(update_fields=["rss_url", "updated_at"])
                updated += 1
                self.stdout.write(self.style.SUCCESS(f"  rss_url = {found}"))
            else:
                self.stdout.write(self.style.WARNING("  no feed detected"))

        self.stdout.write(self.style.SUCCESS(f"Done. Updated rss_url for {updated} sources."))


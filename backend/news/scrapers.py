
from __future__ import annotations

import logging
import re
import warnings
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning

warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ScrapedItem:
    title: str
    url: str
    summary: str = ""
    content: str = ""
    image_url: str = ""
    published_at: datetime | None = None
    fetch_method: str = "scrape"   # rss | sitemap | scrape


# ──────────────────────────────────────────────
#  Constants
# ──────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ar,fr;q=0.9,en;q=0.8",
}

_NON_NEWS_KEYWORDS = {
    "contact", "contactez", "اتصل بنا",
    "من نحن", "qui sommes nous",
    "cabinet", "ديوان",
    "mission", "vision", "history", "تاريخ", "about", "à propos",
    "organisation", "تنظيم", "structure", "هيكل",
    "partenaires", "شركاء",
    "liens", "روابط", "links",
    "galerie", "معرض", "gallery",
    "emploi", "وظائف", "recrutement",
    "appels d'offres", "مناقصات", "tender",
    "faq", "aide", "مساعدة",
    "accessibilité", "plan du site",
    "connexion", "تسجيل دخول", "login",
    "politique de confidentialité", "privacy",
    "sitemap", "glossaire",
    "mentions légales",
    # "read more" link text — not actual article titles
    "lire la suite", "read more", "اقرأ المزيد", "التفاصيل",
    "suite", "plus", "voir plus", "en savoir plus",
    # static/structural pages (exact short titles only)
    "النصوص التأسيسية", "السلطات الدستورية", "تنصيب الرئيس",
}




def _is_likely_news(title: str) -> bool:
    t = title.lower().strip()
    if len(t) < 12:
        return False
    for kw in _NON_NEWS_KEYWORDS:
        if kw in t:
            return False
    if re.search(r'^\d+$', t):
        return False
    return True


def _soup(url: str, features: str = "html.parser", timeout: int = 3) -> BeautifulSoup | None:
    try:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS)
        resp.raise_for_status()
        # Always use resp.text which trusts Content-Type charset with error replacement.
        # This correctly decodes UTF-8 pages that have occasional invalid bytes.
        # Only fall back to apparent_encoding if Content-Type has no charset.
        if not resp.encoding:
            resp.encoding = resp.apparent_encoding or "utf-8"
        return BeautifulSoup(resp.text, features)
    except Exception as exc:
        logger.debug("_soup failed for %s: %s", url, exc)
        return None


def _get_text(url: str, timeout: int = 3) -> str | None:
    try:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS)
        resp.raise_for_status()
        return resp.text
    except Exception:
        return None


def _dedupe(items: list[ScrapedItem]) -> list[ScrapedItem]:
    seen: set[str] = set()
    out: list[ScrapedItem] = []
    for it in items:
        key = it.url.rstrip("/")
        if key not in seen:
            seen.add(key)
            out.append(it)
    return out




_DATE_PATTERNS = [
    (r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', lambda g: ("ymd", int(g[0]), int(g[1]), int(g[2]))),
    (r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', lambda g: (
        "dmy", int(g[0]), int(g[1]), int(g[2])
    )),
]

# Month names: Arabic + French → int
_MONTHS_AR = {
    "يناير":1,"فبراير":2,"مارس":3,"أبريل":4,"ابريل":4,"مايو":5,"يونيو":6,
    "يوليو":7,"يوليه":7,"أغسطس":8,"اغسطس":8,"سبتمبر":9,"أكتوبر":10,"اكتوبر":10,
    "نوفمبر":11,"ديسمبر":12,
    # Hijri approximations (if site shows hijri)
    "محرم":1,"صفر":2,"ربيع":3,"جمادى":5,"رجب":7,"شعبان":8,"رمضان":9,"شوال":10,"ذوالقعدة":11,"ذوالحجة":12,
}
_MONTHS_FR = {
    "janvier":1,"février":2,"fevrier":2,"mars":3,"avril":4,"mai":5,"juin":6,
    "juillet":7,"août":8,"aout":8,"septembre":9,"octobre":10,"novembre":11,"décembre":12,"decembre":12,
}
_MONTHS_EN = {
    "january":1,"february":2,"march":3,"april":4,"may":5,"june":6,
    "july":7,"august":8,"september":9,"october":10,"november":11,"december":12,
    "jan":1,"feb":2,"mar":3,"apr":4,"jun":6,"jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12,
}
_ALL_MONTHS = {**_MONTHS_AR, **_MONTHS_FR, **_MONTHS_EN}

_MONTH_PATTERN = "|".join(re.escape(k) for k in _ALL_MONTHS)

def _parse_named_month(text: str) -> datetime | None:
    """Parse dates like '18 يونيو 2026', '18 Juin 2026', 'juin 2026 18'."""
    pat = rf'(\d{{1,2}})\s+(?:من\s+)?({_MONTH_PATTERN})[,،\s]+(\d{{4}})'
    m = re.search(pat, text, re.IGNORECASE)
    if m:
        day, month_str, year = int(m.group(1)), m.group(2).lower(), int(m.group(3))
        month = _ALL_MONTHS.get(month_str)
        if month and _valid_year(year):
            try:
                return datetime(year, month, day)
            except ValueError:
                pass
    # Also try "YYYY month DD" e.g. "2026 juin 18"
    pat2 = rf'(\d{{4}})\s+({_MONTH_PATTERN})\s+(\d{{1,2}})'
    m2 = re.search(pat2, text, re.IGNORECASE)
    if m2:
        year, month_str, day = int(m2.group(1)), m2.group(2).lower(), int(m2.group(3))
        month = _ALL_MONTHS.get(month_str)
        if month and _valid_year(year):
            try:
                return datetime(year, month, day)
            except ValueError:
                pass
    return None


def _valid_year(y: int) -> bool:
    """Reject impossible years (e.g. year 2604 from garbled text)."""
    return 2000 <= y <= 2050


def _parse_flexible_date(text: str) -> datetime | None:
    # Try named months first (Arabic/French)
    d = _parse_named_month(text)
    if d:
        return d
    for pat, func in _DATE_PATTERNS:
        m = re.search(pat, text)
        if m:
            try:
                fmt, a, b, c = func(m.groups())
                if fmt == "ymd":
                    if not _valid_year(a):
                        continue
                    return datetime(a, b, c)
                # dmy — assume DD/MM/YYYY (Mauritanian standard)
                if not _valid_year(c):
                    continue
                day, month = a, b
                if day > 31:
                    day, month = b, a
                return datetime(c, month, day)
            except ValueError:
                pass
    return None


def _extract_date_from_url(url: str) -> datetime | None:
    m = re.search(r'/(\d{4})/(\d{2})/(\d{2})/', url)
    if m:
        try:
            y = int(m[1])
            if not _valid_year(y):
                return None
            return datetime(y, int(m[2]), int(m[3]))
        except ValueError:
            pass
    return None


def _extract_date_from_meta(soup: BeautifulSoup) -> datetime | None:
    # ── 1. JSON-LD structured data (most reliable on modern Drupal/WP sites) ──
    import json as _json
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = _json.loads(script.string or "")
            # Handle both single object and @graph array
            nodes = data if isinstance(data, list) else data.get("@graph", [data])
            for node in nodes:
                for field in ("datePublished", "dateCreated", "dateModified"):
                    val = node.get(field, "")
                    if val:
                        raw = re.sub(r'[+-]\d{2}:\d{2}$', '', str(val).strip()[:19])
                        try:
                            return datetime.fromisoformat(raw)
                        except (ValueError, TypeError):
                            pass
        except Exception:
            pass

    # ── 2. Standard meta tags ──
    meta_selectors = [
        'meta[property="article:published_time"]',
        'meta[name="article:published_time"]',
        'meta[property="og:published_time"]',
        'meta[name="dc.date"]',
        'meta[name="DC.date"]',
        'meta[itemprop="datePublished"]',
        'meta[name="date"]',
        'meta[name="pubdate"]',
        'meta[name="DC.Date"]',
        'meta[property="og:updated_time"]',
    ]
    for sel in meta_selectors:
        tag = soup.select_one(sel)
        if tag and tag.get("content"):
            try:
                raw = tag["content"].strip()
                raw = re.sub(r'[+-]\d{2}:\d{2}$', '', raw)
                return datetime.fromisoformat(raw)
            except (ValueError, TypeError):
                pass

    # ── 3. <time> tags with datetime attribute ──
    for tag in soup.select("time[datetime]"):
        dt_attr = (tag.get("datetime") or "").strip()
        if dt_attr:
            try:
                raw = re.sub(r'[+-]\d{2}:\d{2}$', '', dt_attr[:19])
                return datetime.fromisoformat(raw)
            except (ValueError, TypeError):
                pass
        txt = tag.get_text(strip=True)
        d = _parse_flexible_date(txt)
        if d:
            return d

    # ── 4. Drupal-specific CSS selectors ──
    drupal_selectors = [
        # Drupal 8/9
        ".field--name-created",
        ".field--name-field-date",
        ".field--name-field-date-article",
        ".field--name-field-news-date",
        ".field--name-field-publication-date",
        ".node__submitted",
        ".node__meta",
        # Drupal 7 / Views timestamp (education.gov.mr, transports.gov.mr, energies-petrole.gov.mr …)
        ".views-field-revision-timestamp",
        ".views-field-created",
        ".views-field-field-date",
        "span.date-display-single",
        ".field-name-field-date",
        ".submitted",
        # Generic
        ".node-date",
        ".article-date",
        ".news-date",
        ".post-date",
        ".entry-date",
        ".published-date",
        ".date",           # commerce.gov.mr uses plain class="date"
        '[class*="date-display"]',
        '[class*="field-date"]',
        '[class*="publication"]',
        '[class*="revision-timestamp"]',
    ]
    for sel in drupal_selectors:
        for el in soup.select(sel):
            dt_attr = (el.get("datetime", "") or el.get("content", "")).strip()
            if dt_attr:
                try:
                    raw = re.sub(r'[+-]\d{2}:\d{2}$', '', dt_attr[:19])
                    return datetime.fromisoformat(raw)
                except (ValueError, TypeError):
                    pass
            txt = el.get_text(strip=True)
            if txt:
                d = _parse_flexible_date(txt)
                if d:
                    return d

    # ── 5. itemprop="datePublished" on any element ──
    for el in soup.select('[itemprop="datePublished"], [itemprop="dateCreated"]'):
        val = el.get("content") or el.get("datetime") or el.get_text(strip=True)
        if val:
            val = re.sub(r'[+-]\d{2}:\d{2}$', '', val.strip()[:19])
            try:
                return datetime.fromisoformat(val)
            except (ValueError, TypeError):
                d = _parse_flexible_date(val)
                if d:
                    return d

    # ── 6. Scan article body text for date patterns ──
    for sel in ("article", "main", ".node__content", ".node-content", ".field--name-body", ".view-content", "body"):
        container = soup.select_one(sel)
        if container:
            # Scan first 3000 chars for a date
            txt = container.get_text(" ", strip=True)[:3000]
            d = _parse_flexible_date(txt)
            if d:
                return d
            break
    return None




def scrape_rss(rss_url: str, limit: int = 10) -> list[ScrapedItem]:
    """Parse RSS/Atom feed using feedparser. Returns up to `limit` items."""
    try:
        import feedparser
        feed = feedparser.parse(rss_url)
        if feed.bozo and not feed.entries:
            logger.debug("feedparser bozo error for %s", rss_url)
            return []

        items: list[ScrapedItem] = []
        for entry in feed.entries[:limit]:
            title = (getattr(entry, "title", "") or "").strip()
            url = (getattr(entry, "link", "") or "").strip()
            if not title or not url:
                continue
            if not _is_likely_news(title):
                continue

            # Date
            pub = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    import time as _time
                    pub = datetime(*entry.published_parsed[:6])
                except Exception:
                    pass
            if not pub and hasattr(entry, "updated_parsed") and entry.updated_parsed:
                try:
                    pub = datetime(*entry.updated_parsed[:6])
                except Exception:
                    pass

            # Summary
            summary = ""
            if hasattr(entry, "summary"):
                raw = entry.summary or ""
                summary = re.sub(r'<[^>]+>', '', raw).strip()[:500]

            # Image
            image_url = ""
            if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                image_url = entry.media_thumbnail[0].get("url", "")
            elif hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url", "")
            if not image_url and hasattr(entry, "enclosures"):
                for enc in (entry.enclosures or []):
                    if enc.get("type", "").startswith("image/"):
                        image_url = enc.get("href", "")
                        break

            items.append(ScrapedItem(
                title=title[:500],
                url=url,
                summary=summary,
                image_url=image_url,
                published_at=pub,
                fetch_method="rss",
            ))
        return items
    except Exception as exc:
        logger.warning("scrape_rss failed for %s: %s", rss_url, exc)
        return []


def discover_rss(base_url: str) -> str | None:
    """Try to find RSS feed from homepage or common paths."""
    candidates = []
    parsed = urlparse(base_url)
    base = f"{parsed.scheme}://{parsed.netloc}"

    # Common paths
    for path in ["/feed", "/rss", "/rss.xml", "/feed.xml", "/feeds/rss",
                 "/ar/rss", "/fr/rss", "/actualites/rss", "/news/rss",
                 "/ar/feed", "/en/feed", "/?feed=rss2", "/rss2"]:
        candidates.append(base + path)

    # Check HTML <link rel="alternate">
    try:
        resp = requests.get(base_url, timeout=8, headers=_HEADERS)
        if resp.ok:
            soup = BeautifulSoup(resp.text, "html.parser")
            for link in soup.find_all("link", rel=lambda r: r and "alternate" in r):
                t = link.get("type", "")
                if "rss" in t or "atom" in t or "xml" in t:
                    href = link.get("href", "")
                    if href:
                        candidates.insert(0, urljoin(base_url, href))
    except Exception:
        pass

    for url in candidates:
        try:
            resp = requests.get(url, timeout=6, headers=_HEADERS)
            ct = resp.headers.get("content-type", "")
            if resp.ok and ("xml" in ct or "rss" in ct or "atom" in ct or resp.text.strip().startswith("<?xml")):
                return url
        except Exception:
            continue
    return None


# ──────────────────────────────────────────────
#  2. Sitemap scraper
# ──────────────────────────────────────────────

def scrape_sitemap(sitemap_url: str, limit: int = 20) -> list[ScrapedItem]:
    """Parse sitemap.xml and extract recent article URLs."""
    try:
        text = _get_text(sitemap_url, timeout=10)
        if not text:
            return []
        soup = BeautifulSoup(text, "xml")
        items: list[ScrapedItem] = []

        # Sitemap index → recurse into sub-sitemaps
        for sitemap_tag in soup.find_all("sitemap")[:5]:
            loc = sitemap_tag.find("loc")
            if loc and loc.text and loc.text.endswith(".xml"):
                sub = scrape_sitemap(loc.text.strip(), limit=limit)
                items.extend(sub)
                if len(items) >= limit:
                    break
        if items:
            return items[:limit]

        for url_tag in soup.find_all("url"):
            loc = url_tag.find("loc")
            if not loc or not loc.text:
                continue
            href = loc.text.strip()
            title_tag = url_tag.find("news:title") or url_tag.find("title")
            if title_tag:
                title = unquote(title_tag.get_text(strip=True))
            else:
                title = unquote(href.rstrip("/").split("/")[-1].replace("-", " ").replace("_", " "))
            if not title or len(title) < 10:
                continue
            if not _is_likely_news(title):
                continue
            pub = None
            pub_tag = url_tag.find("news:publication_date") or url_tag.find("lastmod")
            if pub_tag and pub_tag.text:
                try:
                    pub = datetime.fromisoformat(pub_tag.text.strip()[:19])
                except (ValueError, TypeError):
                    pub = _extract_date_from_url(href)
            if not pub:
                pub = _extract_date_from_url(href)
            items.append(ScrapedItem(
                title=title[:500],
                url=href,
                published_at=pub,
                fetch_method="sitemap",
            ))
            if len(items) >= limit:
                break
        return items
    except Exception as exc:
        logger.debug("scrape_sitemap failed for %s: %s", sitemap_url, exc)
        return []


def discover_sitemap(base_url: str) -> str | None:
    parsed = urlparse(base_url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    for path in ["/sitemap.xml", "/news-sitemap.xml"]:
        url = base + path
        try:
            resp = requests.get(url, timeout=4, headers=_HEADERS)
            ct = resp.headers.get("content-type", "")
            if resp.ok and ("xml" in ct or resp.text.strip().startswith("<?xml")):
                return url
        except Exception:
            continue
    return None


# ──────────────────────────────────────────────
#  3. Domain-specific scrapers
# ──────────────────────────────────────────────

def _scrape_items(
    news_url: str,
    limit: int,
    selectors: list[str] | None = None,
    min_title_len: int = 12,
    date_selector: str = "",
) -> list[ScrapedItem]:
    """Generic link extractor with CSS selectors + fallback strategies."""
    soup = _soup(news_url)
    if soup is None:
        return []
    items: list[ScrapedItem] = []
    base = news_url

    def _add(a_tag, method="scrape"):
        nonlocal items
        href = (a_tag.get("href") or "").strip()
        title = (a_tag.get_text() or "").strip()
        if not title or not href or len(title) < min_title_len:
            return
        if href.startswith("#") or href.startswith("javascript:"):
            return
        if not _is_likely_news(title):
            return
        full_url = urljoin(base, href)
        pub = _extract_date_from_url(full_url)

        # Try date selector on the parent container chain
        if not pub and date_selector:
            container = a_tag
            for _ in range(5):
                container = container.find_parent(["div", "li", "article", "section", "tr"])
                if not container:
                    break
                date_el = container.select_one(date_selector)
                if date_el:
                    txt = date_el.get_text(strip=True)
                    pub = _parse_flexible_date(txt)
                    break

        # Extract image from parent
        image_url = ""
        parent = a_tag.parent
        if parent:
            img = parent.find("img") or (parent.parent and parent.parent.find("img"))
            if img:
                image_url = img.get("src") or img.get("data-src") or ""
                if image_url:
                    image_url = urljoin(base, image_url)

        items.append(ScrapedItem(
            title=title[:500],
            url=full_url,
            image_url=image_url[:800] if image_url else "",
            published_at=pub,
            fetch_method=method,
        ))

    # Strategy 1: CSS selectors
    if selectors:
        for sel in selectors:
            for a in soup.select(sel):
                _add(a)
                if len(items) >= limit:
                    return _dedupe(items)

    if len(items) >= 3:
        return _dedupe(items)[:limit]

    # Strategy 2: <article> headings
    for article in soup.find_all("article"):
        for heading in article.find_all(["h1", "h2", "h3", "h4"]):
            a = heading.find("a")
            if a and a.get("href"):
                _add(a)
                if len(items) >= limit:
                    return _dedupe(items)

    if len(items) >= 3:
        return _dedupe(items)[:limit]

    # Strategy 3: news/actu containers
    for container in soup.select(
        '[id*="news" i], [id*="actu" i], [class*="news" i], [class*="actu" i], '
        '[class*="actualite" i], [class*="article" i], [class*="post" i]'
    ):
        for a in container.find_all("a", href=True):
            _add(a)
            if len(items) >= limit:
                return _dedupe(items)

    if len(items) >= 3:
        return _dedupe(items)[:limit]

    # Strategy 4: heading links anywhere
    for heading in soup.find_all(["h2", "h3"]):
        a = heading.find("a", href=True)
        if a:
            _add(a)
            if len(items) >= limit:
                break

    return _dedupe(items)[:limit]


def scrape_drupal_generic(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    """Drupal scraper: handles structure where title is in <h2><span> and URL is in a separate link."""
    soup = _soup(news_url)
    if soup is None:
        return []

    items: list[ScrapedItem] = []
    base = news_url

    # Strategy A: .views-row containers where title & link are siblings (e.g. primature.gov.mr)
    for row in soup.select(".views-row, .view-row, .node--type-actualite"):
        # Extract title from heading span
        title_el = (
            row.select_one("h2 .field--name-title, h3 .field--name-title, h2 span[property='schema:name'], h3 span[property='schema:name']")
            or row.select_one("h2, h3, h4")
        )
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title or len(title) < 12 or not _is_likely_news(title):
            continue

        # Extract URL — prefer node links, fallback to any link in row
        link_el = (
            row.select_one("a[href*='/node/'], a[href*='/actualite']")
            or row.select_one("a[href]")
        )
        if not link_el:
            continue
        href = (link_el.get("href") or "").strip()
        if not href or href.startswith("#") or href.startswith("javascript:"):
            continue

        full_url = urljoin(base, href)
        pub = _extract_date_from_url(full_url)

        image_url = ""
        img = row.find("img")
        if img:
            image_url = img.get("src") or img.get("data-src") or ""
            if image_url:
                image_url = urljoin(base, image_url)

        items.append(ScrapedItem(
            title=title[:500],
            url=full_url,
            image_url=image_url[:800] if image_url else "",
            published_at=pub,
            fetch_method="scrape",
        ))
        if len(items) >= limit:
            break

    if items:
        return _dedupe(items)[:limit]

    # Strategy B: standard Drupal heading selectors
    selectors = [
        'h2.node__title a', 'h3.node__title a',
        '.field--name-title a', '.views-field-title a',
        '.view-content h2 a', '.view-content h3 a',
    ]
    return _scrape_items(news_url, limit, selectors=selectors, date_selector=date_selector)


def scrape_wordpress_generic(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    selectors = [
        ".entry-title a",
        ".post-title a",
        "h2.entry-title a",
        "h3.entry-title a",
    ]
    items = _scrape_items(news_url, limit, selectors=selectors, date_selector=date_selector)
    if items:
        return items

    # WP date-based URLs
    soup = _soup(news_url)
    if soup is None:
        return []
    result: list[ScrapedItem] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        title = (a.get_text() or "").strip()
        if not title or len(title) < 12 or not _is_likely_news(title):
            continue
        if re.search(r'/\d{4}/\d{2}/', href):
            pub = _extract_date_from_url(href)
            result.append(ScrapedItem(
                title=title[:500],
                url=urljoin(news_url, href),
                published_at=pub,
                fetch_method="scrape",
            ))
            if len(result) >= limit:
                break
    return _dedupe(result)


def scrape_generic_news_page(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    items = _scrape_items(news_url, limit, date_selector=date_selector)
    if items:
        return items
    # Last resort: all links > 12 chars
    soup = _soup(news_url)
    if soup is None:
        return []
    result: list[ScrapedItem] = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        title = (a.get_text() or "").strip()
        if not title or len(title) < 12:
            continue
        if href.startswith("#") or href.startswith("javascript:"):
            continue
        if not _is_likely_news(title):
            continue
        pub = _extract_date_from_url(href)
        result.append(ScrapedItem(
            title=title[:500],
            url=urljoin(news_url, href),
            published_at=pub,
            fetch_method="scrape",
        ))
        if len(result) >= limit:
            break
    return _dedupe(result)


def scrape_presidence_mr(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    """Scraper pour presidence.mr.

    Uses relative hrefs like 'ar/node/3547' (no leading slash).
    Falls back to govmr_drupal which handles both patterns.
    """
    selectors = [
        'a[href*="ar/node/"]',    # presidence-specific: no leading slash
        'a[href*="/ar/node/"]',
        'a[href*="/node/"]',
        '.views-row h3 a', '.views-row h2 a',
        'h2 a', 'h3 a',
    ]
    items = _scrape_items(news_url, limit, selectors=selectors, date_selector=date_selector)
    if items:
        # Sort by node number descending (highest = most recent)
        import re as _re
        def node_num(it):
            m = _re.search(r'/node/(\d+)', it.url)
            return int(m.group(1)) if m else 0
        items.sort(key=node_num, reverse=True)
        return items[:limit]
    return scrape_govmr_drupal(news_url, limit=limit, date_selector=date_selector)


def scrape_primature(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    """Scraper pour primature.gov.mr.

    Structure: .views-row > .content-card > h2 (title, no link) + a[href*='/node/'] (button)
    Title and link are siblings — cannot use standard link-text approach.
    """
    soup = _soup(news_url)
    if soup is None:
        return []

    items: list[ScrapedItem] = []
    base = news_url

    for row in soup.select(".views-row"):
        # Title is in h2 > span (not a link)
        title_el = (
            row.select_one("h2 span[property='schema:name'], h3 span[property='schema:name']")
            or row.select_one("h2, h3")
        )
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title or len(title) < 12 or not _is_likely_news(title):
            continue

        # URL is in the "التفاصيل" button link — highest node number = most recent
        link_el = row.select_one("a[href*='/node/']")
        if not link_el:
            continue
        href = (link_el.get("href") or "").strip()
        if not href or href.startswith("#"):
            continue

        full_url = urljoin(base, href)
        pub = _extract_date_from_url(full_url)

        image_url = ""
        img = row.find("img")
        if img:
            src = img.get("src") or img.get("data-src") or ""
            if src and not src.endswith("/"):
                image_url = urljoin(base, src)

        items.append(ScrapedItem(
            title=title[:500],
            url=full_url,
            image_url=image_url[:800] if image_url else "",
            published_at=pub,
            fetch_method="scrape",
        ))
        if len(items) >= limit:
            break

    return _dedupe(items)[:limit]


def scrape_govmr_drupal(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    """
    Scraper générique pour tous les sites .gov.mr utilisant Drupal.
    Ces sites partagent la même structure: /ar/node/, /fr/node/, .views-row, etc.
    """
    selectors = [
        # Drupal node links — with or without leading slash (presidence.mr omits it)
        'a[href*="/ar/node/"]',
        'a[href*="/fr/node/"]',
        'a[href*="/node/"]',
        'a[href*="ar/node/"]',   # presidence.mr: href="ar/node/3547"
        'a[href*="fr/node/"]',
        # Drupal view rows
        '.views-row h3 a',
        '.views-row h2 a',
        '.view-content h3 a',
        '.view-content h2 a',
        # Standard node titles
        'h3.node__title a',
        'h2.node__title a',
        '.field--name-title a',
        # News/article containers
        '.node--type-actualite a',
        '.node--type-article a',
        '.node--type-news a',
        # Heading links
        'h2 a', 'h3 a', 'h4 a',
    ]
    items = _scrape_items(news_url, limit, selectors=selectors, date_selector=date_selector)
    if items:
        return items

    # Try without /ar/ suffix (root URL)
    parsed = urlparse(news_url)
    root_url = f"{parsed.scheme}://{parsed.netloc}"
    if root_url != news_url.rstrip("/"):
        items = _scrape_items(root_url, limit, selectors=selectors)
        if items:
            return items

    return scrape_generic_news_page(news_url, limit, date_selector=date_selector)


def scrape_energies_petrole(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    selectors = [
        'a[href*="/ar/node/"]',
        'a[href*="/fr/node/"]',
        'a[href*="/node/"]',
        '.views-row a',
        'h3 a', 'h2 a',
    ]
    return _scrape_items(news_url, limit, selectors=selectors, date_selector=date_selector)


def scrape_ami_mr(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    """Scraper pour ami.mr (Agence Mauritanienne d'Information)."""
    # Try RSS first
    rss_items = scrape_rss("https://ami.mr/rss.xml", limit=limit)
    if rss_items:
        return rss_items
    # Fallback to scraping
    selectors = [
        'h3 a', 'h2 a',
        '.entry-title a',
        'a[href*="/article/"]',
        'a[href*="/news/"]',
        'a[href*="/ar/"]',
    ]
    return _scrape_items(news_url, limit, selectors=selectors)


def scrape_procedures_gov_mr(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    soup = _soup(news_url)
    if soup is None:
        return []
    items: list[ScrapedItem] = []
    for a in soup.select('a[href*="/procedure/"], a[href*="/ar/procedure/"], a[href*="/fr/procedure/"]'):
        title = (a.get_text() or "").strip()
        href = (a.get("href") or "").strip()
        if not title or not href:
            continue
        items.append(ScrapedItem(title=title[:500], url=urljoin(news_url, href), fetch_method="scrape"))
        if len(items) >= limit:
            break
    return items


# ──────────────────────────────────────────────
#  4. Main dispatcher
# ──────────────────────────────────────────────

_DOMAIN_SCRAPERS: dict[str, callable] = {
    # ─── Special scrapers ─────────────────────────────────────────────────
    "presidence.mr": scrape_presidence_mr,
    "www.presidence.mr": scrape_presidence_mr,
    "primature.gov.mr": scrape_primature,
    "energies-petrole.gov.mr": scrape_energies_petrole,
    "procedures.gov.mr": scrape_procedures_gov_mr,
    "ami.mr": scrape_ami_mr,
    "www.ami.mr": scrape_ami_mr,
    # ─── WordPress sites ──────────────────────────────────────────────────
    "mfpam.gov.mr": scrape_wordpress_generic,
    # ─── All other .gov.mr Drupal sites use the unified scraper ───────────
    "sgg.gov.mr": scrape_govmr_drupal,
    "finances.gov.mr": scrape_govmr_drupal,
    "www.finances.gov.mr": scrape_govmr_drupal,
    "interieur.gov.mr": scrape_govmr_drupal,
    "diplomatie.gov.mr": scrape_govmr_drupal,
    "defense.gov.mr": scrape_govmr_drupal,
    "education.gov.mr": scrape_govmr_drupal,
    "sante.gov.mr": scrape_govmr_drupal,
    "mesrs.gov.mr": scrape_govmr_drupal,
    "justice.gov.mr": scrape_govmr_drupal,
    "affairesislamiques.gov.mr": scrape_govmr_drupal,
    "fonctionpublique.gov.mr": scrape_govmr_drupal,
    "mmi.gov.mr": scrape_govmr_drupal,
    "peches.gov.mr": scrape_govmr_drupal,
    "agriculture.gov.mr": scrape_govmr_drupal,
    "elevage.gov.mr": scrape_govmr_drupal,
    "domaines.gov.mr": scrape_govmr_drupal,
    "commerce.gov.mr": scrape_govmr_drupal,
    "habitat.gov.mr": scrape_govmr_drupal,
    "transports.gov.mr": scrape_govmr_drupal,
    "hydraulique.gov.mr": scrape_govmr_drupal,
    "culture.gov.mr": scrape_govmr_drupal,
    "masef.gov.mr": scrape_govmr_drupal,
    "environnement.gov.mr": scrape_govmr_drupal,
    "mtnima.gov.mr": scrape_govmr_drupal,
    "majessc.gov.mr": scrape_govmr_drupal,
    "majescc.gov.mr": scrape_govmr_drupal,
    "economie.gov.mr": scrape_govmr_drupal,
    "msgg.gov.mr": scrape_govmr_drupal,
    "sport.gov.mr": scrape_govmr_drupal,
}


def scrape_by_domain(news_url: str, limit: int = 10, date_selector: str = "") -> list[ScrapedItem]:
    """Route to domain-specific scraper or generic fallback."""
    host = (urlparse(news_url).netloc or "").lower().lstrip("www.")
    scraper = _DOMAIN_SCRAPERS.get(host)
    if scraper:
        items = scraper(news_url, limit=limit, date_selector=date_selector)
    elif host.endswith(".gov.mr") or host == "presidence.mr":
        # All Mauritanian government sites use the same Drupal structure
        items = scrape_govmr_drupal(news_url, limit=limit, date_selector=date_selector)
    else:
        items = scrape_drupal_generic(news_url, limit=limit, date_selector=date_selector)
        if len(items) < 3:
            items = scrape_generic_news_page(news_url, limit=limit, date_selector=date_selector)
    return items


def _localize_url(url: str, lang: str, *, is_news_url: bool = True) -> str:
    """Localize a URL to the requested language.

    - If URL contains /ar/ or /fr/, swap the prefix.
    - For news_urls without a language prefix, append /fr for French
      (e.g. https://finances.gov.mr → https://finances.gov.mr/fr).
    """
    if not url or lang not in ("ar", "fr"):
        return url
    replace_to = f"/{lang}/"
    for prefix in ("/ar/", "/fr/"):
        if prefix in url:
            if url.startswith(prefix):
                return replace_to + url[len(prefix):]
            return url.replace(prefix, replace_to, 1)
    # No language prefix found → only append /fr for news_url
    if lang == "fr" and is_news_url:
        url = url.rstrip("/")
        return url + "/fr"
    return url


def _merge_items(existing: list[ScrapedItem], new_items: list[ScrapedItem], limit: int) -> list[ScrapedItem]:
    """Merge two lists of items, deduplicating by URL."""
    seen = set(it.url.rstrip("/") for it in existing)
    merged = list(existing)
    for it in new_items:
        if it.url.rstrip("/") not in seen:
            seen.add(it.url.rstrip("/"))
            merged.append(it)
    return merged[:limit]


def fetch_source_news(
    rss_url: str = "",
    news_url: str = "",
    website_url: str = "",
    limit: int = 5,
    scrape_link_selector: str = "",
    scrape_title_selector: str = "",
    scrape_date_selector: str = "",
    lang: str = "",
) -> list[ScrapedItem]:
    """
    Full pipeline for a single source:
      1. RSS (if rss_url provided or discoverable)
      2. Sitemap
      3. Domain scraper
      4. Fallback to website_url

    Results from all steps are merged (deduped by URL).
    If lang is 'ar' or 'fr', URLs are localized to that language.
    """
    # Localize URLs to the requested language
    if lang in ("ar", "fr"):
        rss_url = _localize_url(rss_url, lang, is_news_url=False)
        news_url = _localize_url(news_url, lang, is_news_url=True)
        website_url = _localize_url(website_url, lang, is_news_url=False)

    base_url = website_url or news_url
    all_items: list[ScrapedItem] = []

    # ── Step 1: RSS ──
    if rss_url:
        items = scrape_rss(rss_url, limit=limit)
        if items:
            logger.info("RSS OK (%d items) from %s", len(items), rss_url)
            all_items = items[:limit]

    # ── Step 2: Sitemap ──
    if base_url:
        sitemap_url = discover_sitemap(base_url)
        if sitemap_url:
            items = scrape_sitemap(sitemap_url, limit=limit * 3)
            items.sort(key=lambda x: x.published_at or datetime.min, reverse=True)
            items = items[:limit]
            if items:
                logger.info("Sitemap OK (%d items) from %s", len(items), sitemap_url)
                all_items = _merge_items(all_items, items, limit)

    # ── Step 3: Web Scraping ──
    target = news_url or website_url
    if target:
        if scrape_link_selector:
            items = _scrape_items(target, limit, selectors=[scrape_link_selector], date_selector=scrape_date_selector)
        else:
            items = scrape_by_domain(target, limit=limit)
        if items:
            logger.info("Scrape OK (%d items) from %s", len(items), target)
            all_items = _merge_items(all_items, items, limit)

    # ── Step 4: Fallback to website_url if news_url failed ──
    if website_url and target != website_url and len(all_items) < limit:
        logger.info("Fallback scraping from website_url: %s", website_url)
        if scrape_link_selector:
            items = _scrape_items(website_url, limit, selectors=[scrape_link_selector], date_selector=scrape_date_selector)
        else:
            items = scrape_by_domain(website_url, limit=limit)
        if items:
            logger.info("Fallback scrape OK (%d items) from %s", len(items), website_url)
            all_items = _merge_items(all_items, items, limit)

    if all_items:
        return all_items  # enrichment happens on-demand in article detail view

    logger.warning("No items found for %s", base_url or rss_url)
    return []


# ──────────────────────────────────────────────
#  Content extraction & enrichment
# ──────────────────────────────────────────────

def _fetch_utf8_html(url: str, timeout: int = 3) -> str | None:
    """Fetch URL and return HTML as a UTF-8 string, properly decoded."""
    try:
        resp = requests.get(url, timeout=timeout, headers=_HEADERS)
        resp.raise_for_status()
        # Force correct encoding if charset is specified or auto-detect fails
        if resp.encoding and resp.encoding.lower() not in ("utf-8", "utf8"):
            resp.encoding = resp.apparent_encoding or "utf-8"
        return resp.text
    except Exception:
        return None


def extract_article_body(article_url: str, timeout: int = 3) -> str:
    """Extract article body text using trafilatura or BeautifulSoup."""
    try:
        import trafilatura
        html = _fetch_utf8_html(article_url, timeout=timeout)
        if html:
            # trafilatura needs UTF-8 bytes; encode properly decoded text
            text = trafilatura.extract(
                html.encode("utf-8"),
                output_format="txt",
                include_links=False,
                include_images=False,
                favor_precision=True,
            )
            if text and len(text.strip()) > 80:
                return text.strip()[:10000]
    except Exception:
        pass

    soup = _soup(article_url, timeout=timeout)
    if soup is None:
        return ""
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    for sel in [
        "article", "[role=main]", "main",
        ".post-content", ".entry-content",
        ".article-body", ".content-body",
        ".field-name-body", ".node-body",
        ".news-content", "#content-area",
        ".field--name-body", ".node__content",
    ]:
        el = soup.select_one(sel)
        if el:
            text = el.get_text(separator="\n", strip=True)
            if len(text) > 80:
                return text[:10000]
    body = soup.find("body")
    if body:
        text = body.get_text(separator="\n", strip=True)
        lines = [ln for ln in text.split("\n") if len(ln) > 40]
        return "\n\n".join(lines[:30])[:10000]
    return ""


def extract_image_from_page(article_url: str) -> str:
    """Extract OG image or first relevant image from article page."""
    try:
        soup = _soup(article_url, timeout=8)
        if not soup:
            return ""
        # OG image
        og = soup.select_one('meta[property="og:image"]')
        if og and og.get("content"):
            return urljoin(article_url, og["content"])
        # Twitter card
        tw = soup.select_one('meta[name="twitter:image"]')
        if tw and tw.get("content"):
            return urljoin(article_url, tw["content"])
        # First article image
        for img in soup.select("article img, .post-content img, .entry-content img"):
            src = img.get("src") or img.get("data-src") or ""
            if src and not src.endswith(".svg"):
                return urljoin(article_url, src)
    except Exception:
        pass
    return ""


def extract_article_meta(article_url: str) -> tuple[datetime | None, str]:
    """Extract published date and content from an article page."""
    soup = _soup(article_url)
    if soup is None:
        return None, ""
    date = _extract_date_from_meta(soup)
    content = extract_article_body(article_url)
    return date, content


def _looks_like_nav(title: str) -> bool:
    """Heuristic: skip enrichment for items that look like navigation links."""
    t = title.strip().lower()
    if len(t) < 20:
        return True
    nav = {"accueil", "home", "الرئيسية", "contact", "اتصل بنا",
           "plan du site", "خريطة الموقع", "login", "تسجيل الدخول",
           "gouvernement", "cabinet", "ديوان الوزير", "ديوان", "الوزارة",
           "le ministre", "le secrétariat général", "secrétariat général",
           "les directions", "administration", "organisation"}
    if t in nav or any(t.startswith(n) for n in nav):
        return True
    return False


def _enrich_with_content(items: list[ScrapedItem]) -> list[ScrapedItem]:
    """Enrich items with date and content from individual article pages."""
    out: list[ScrapedItem] = []
    for item in items:
        content = item.content
        pub = item.published_at
        image_url = item.image_url

        # Skip enrichment for navigation-like items (short title, known nav words)
        if _looks_like_nav(item.title):
            out.append(ScrapedItem(
                title=item.title, url=item.url, summary=item.summary,
                content=content or "", image_url=image_url or "",
                published_at=pub, fetch_method=item.fetch_method,
            ))
            continue

        if not content or not pub or not image_url:
            try:
                soup = _soup(item.url, timeout=5)
                if soup:
                    if not pub:
                        pub = _extract_date_from_meta(soup)
                    if not pub:
                        pub = _extract_date_from_url(item.url)
                    if not image_url:
                        og = soup.select_one('meta[property="og:image"]')
                        if og and og.get("content"):
                            image_url = urljoin(item.url, og["content"])
                    if not content:
                        content = extract_article_body(item.url)
            except Exception:
                pass

        out.append(ScrapedItem(
            title=item.title,
            url=item.url,
            summary=item.summary,
            content=content or "",
            image_url=image_url or "",
            published_at=pub,
            fetch_method=item.fetch_method,
        ))
    return out

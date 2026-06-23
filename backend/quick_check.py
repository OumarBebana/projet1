import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source

print(f"All sources: {Source.objects.count()}")
print(f"Active: {Source.objects.filter(is_active=True).count()}")
print(f"Inactive: {Source.objects.filter(is_active=False).count()}")
print()

# Show all sources
for s in Source.objects.all().order_by("sort_order"):
    status = "A" if s.is_active else "I"
    rss = s.rss_url or "-"
    print(f"  {status} id={s.id:3d} {s.slug:30s} rss={'YES' if s.rss_url else 'NO'} website={s.website_url}")

# Check for potential duplicates - same website
print("\n=== Duplicate check (by website) ===")
from urllib.parse import urlparse
from collections import defaultdict
by_host = defaultdict(list)
for s in Source.objects.all():
    url = s.website_url or s.news_url or ""
    if url:
        host = urlparse(url).netloc.lstrip("www.")
        by_host[host].append(f"{s.slug}({'A' if s.is_active else 'I'})")
for host, slugs in sorted(by_host.items()):
    if len(slugs) > 1:
        print(f"  {host}: {', '.join(slugs)}")

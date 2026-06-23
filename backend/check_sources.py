import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source

for s in Source.objects.filter(is_active=True).order_by("sort_order"):
    has_rss = "YES" if s.rss_url else "NO"
    print(f"{s.sort_order:2d} {s.slug:30s} {s.website_url or ''}")
    if s.rss_url:
        print(f"    rss={s.rss_url}")

print(f"\nTotal active: {Source.objects.filter(is_active=True).count()}")
print(f"Total inactive: {Source.objects.filter(is_active=False).count()}")

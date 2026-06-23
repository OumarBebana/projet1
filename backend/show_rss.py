import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source

print("Active sources with RSS:")
for s in Source.objects.filter(is_active=True).exclude(rss_url="").order_by("sort_order"):
    print(f"  {s.slug:30s} rss={s.rss_url}")

print(f"\nTotal active with RSS: {Source.objects.filter(is_active=True).exclude(rss_url='').count()}")
print(f"Total active without RSS: {Source.objects.filter(is_active=True, rss_url='').count()}")

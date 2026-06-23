import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source
from news.serializers import SourceSerializer
import json

active = Source.objects.filter(is_active=True)
inactive = Source.objects.filter(is_active=False)
print("Active: %d, Inactive: %d, Total: %d" % (active.count(), inactive.count(), Source.objects.count()))

with_rss = active.exclude(rss_url="")
print("Active with RSS: %d" % with_rss.count())
print("Active without RSS: %d" % active.filter(rss_url="").count())

serialized = SourceSerializer(active.order_by("sort_order", "name"), many=True)
data = serialized.data
print("Serialized active sources: %d" % len(data))
rss_in_data = [s for s in data if s["rss_url"]]
print("With RSS in serialized data: %d" % len(rss_in_data))

print("\nAll active slugs:")
for s in active.order_by("sort_order"):
    print("  %s" % s.slug)

print("\nRSS sources:")
for s in with_rss.order_by("sort_order"):
    print("  %s -> %s" % (s.slug, s.rss_url))

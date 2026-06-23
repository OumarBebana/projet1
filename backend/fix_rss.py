"""Restore RSS URLs by checking the old (now inactive) sources"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source

# Map inactive -> active sources with the same website
import re
for inactive in Source.objects.filter(is_active=False).exclude(rss_url=""):
    host = ""
    if inactive.website_url:
        from urllib.parse import urlparse
        host = urlparse(inactive.website_url).netloc.lstrip("www.") or ""
    
    # Find active source with same host
    for active in Source.objects.filter(is_active=True):
        if active.rss_url:
            continue  # already has RSS
        active_host = ""
        if active.website_url:
            active_host = urlparse(active.website_url).netloc.lstrip("www.") or ""
        if active_host == host:
            print(f"Transferring RSS from {inactive.slug} -> {active.slug}: {inactive.rss_url}")
            active.rss_url = inactive.rss_url
            active.save(update_fields=["rss_url"])
            break
    else:
        # Try matching by slug prefix
        slug_base = re.sub(r"-(?:urbanisme|transports|sociale|numerique)$", "", inactive.slug)
        match = Source.objects.filter(is_active=True, slug__startswith=slug_base).exclude(slug=inactive.slug).first()
        if match and not match.rss_url:
            print(f"Transferring RSS by slug match: {inactive.slug} -> {match.slug}: {inactive.rss_url}")
            match.rss_url = inactive.rss_url
            match.save(update_fields=["rss_url"])

print("\nFinal RSS configs:")
for s in Source.objects.filter(is_active=True).exclude(rss_url="").order_by("sort_order"):
    print(f"  {s.slug:30s} rss={s.rss_url}")

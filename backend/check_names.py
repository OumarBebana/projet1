"""Check for missing ي in Arabic ministry names."""
import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source, Article

# Check all active source names for ي
print("=== Sources with ي in name_ar ===")
for s in Source.objects.filter(is_active=True).order_by("sort_order"):
    has_ya = "\u064A" in s.name_ar  # ي
    has_ya_alef = "\u0649" in s.name_ar  # ى (alif maqsura)
    print("%s ي=%s ى=%s | name_ar=%s" % (s.slug, has_ya, has_ya_alef, s.name_ar))
    
# Also check the raw stored names for encoding issues
print("\n=== Raw hex check for key names ===")
for slug in ['affaires-etrangeres', 'education', 'enseignement-superieur', 'affaires-islamiques', 'habitat', 'hydraulique']:
    s = Source.objects.get(slug=slug)
    print("%s: hex=%s" % (slug, s.name_ar.encode('utf-8').hex()))
    # Check for ي (U+064A) in the hex
    ya_hex = 'd98a'  # UTF-8 for ي
    if ya_hex in s.name_ar.encode('utf-8').hex():
        print("  -> ي FOUND")
    else:
        print("  -> ي NOT FOUND!")

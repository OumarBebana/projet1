"""Re-extract content for articles that have garbled text from trafilatura encoding issues."""
import os, sys, re
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Article
from news.scrapers import extract_article_body

# Detect garbled text: if content has characters outside Arabic, Latin, common punctuation
# Thai range U+0E00-U+0E7F is a strong indicator of trafilatura encoding corruption
THAI_OR_GARBLED = re.compile(r'[\u0E00-\u0E7F\u0E80-\u0EFF]')

count = 0
for a in Article.objects.exclude(content__isnull=True).exclude(content=""):
    if THAI_OR_GARBLED.search(a.content[:500]):
        print("id=%d slug=%s garbled content detected" % (a.id, a.source.slug))
        new_content = extract_article_body(a.url)
        if new_content and len(new_content) > 80 and not THAI_OR_GARBLED.search(new_content[:500]):
            a.content = new_content
            a.save(update_fields=["content"])
            print("  -> FIXED")
            count += 1
        else:
            print("  -> could not fix (new content also garbled or too short)")

print("\nFixed %d articles" % count)

# Also check for Latin-1 double encoding (Ã, Â, etc.)
LATIN1_GARBLED = re.compile(r'[\xC0-\xFF][\x80-\xBF]')  # indicative of UTF-8 bytes decoded as Latin-1
count2 = 0
for a in Article.objects.exclude(content__isnull=True).exclude(content=""):
    if not THAI_OR_GARBLED.search(a.content[:500]) and LATIN1_GARBLED.search(a.content[:500]):
        # Check if it's actually garbled (has sequences like nÂ°)
        if 'Ã' in a.content[:500] or 'Â' in a.content[:500] or '�' in a.content[:500]:
            print("id=%d slug=%s latin-1 garbled: %s" % (a.id, a.source.slug, a.content[:80]))
            new_content = extract_article_body(a.url)
            if new_content and len(new_content) > 80:
                a.content = new_content
                a.save(update_fields=["content"])
                print("  -> FIXED: %s" % new_content[:80])
                count2 += 1

print("\nFixed %d latin-1 garbled articles" % count2)

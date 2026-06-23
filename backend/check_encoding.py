import os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source, Article

s = Source.objects.get(slug='economie-finances')
print("Finance source:")
print("  rss_url:", s.rss_url)
print("  news_url:", s.news_url)
print("  website_url:", s.website_url)

arts = Article.objects.filter(source=s).order_by("-published_at")
print("\nArticles: %d" % arts.count())
for a in arts:
    print("\nid=%d published=%s" % (a.id, a.published_at))
    print("  title: %s" % a.title[:100])
    print("  url: %s" % a.url)
    print("  fetch_method: %s" % a.fetch_method)
    if a.content:
        # Check for weird characters
        import re
        weird = re.findall(r'[^\x00-\x7F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\.,!?\-:;\'\"()\[\]0-9]', a.content[:500])
        if weird:
            print("  WEIRD CHARS in content: %s" % repr(set(weird)))
        print("  content[:300]: %s" % a.content[:300])
    if a.summary:
        weird = re.findall(r'[^\x00-\x7F\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\.,!?\-:;\'\"()\[\]0-9]', a.summary[:200])
        if weird:
            print("  WEIRD CHARS in summary: %s" % repr(set(weird)))
        print("  summary[:200]: %s" % a.summary[:200])

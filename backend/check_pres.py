import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Article
qs = Article.objects.filter(source__slug="presidence").order_by("-published_at")
for a in qs:
    d = str(a.published_at)[:19] if a.published_at else "NONE"
    print(f"date={d}")

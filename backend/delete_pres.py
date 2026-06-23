import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Article
Article.objects.filter(source__slug="presidence").delete()
print("Deleted presidence articles")

import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()
from news.models import Source

Source.objects.filter(slug="action-sociale").update(is_active=False)
print("Deactivated action-sociale")

active = Source.objects.filter(is_active=True).count()
inactive = Source.objects.filter(is_active=False).count()
print(f"Active: {active}, Inactive: {inactive}")

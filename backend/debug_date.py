"""Test _extract_date_from_meta on actual presidence article"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "govnews.settings")
import django
django.setup()

import requests
from bs4 import BeautifulSoup
from news.scrapers import _extract_date_from_meta, _parse_flexible_date

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
}

r = requests.get("https://www.presidence.mr/ar/node/500", timeout=10, headers=headers)
soup = BeautifulSoup(r.text, "html.parser")

date = _extract_date_from_meta(soup)
print(f"_extract_date_from_meta: {date}")

# Also test scanning body manually
body = soup.find("body")
if body:
    body_text = body.get_text()
    print(f"Body length: {len(body_text)}")
    
    # Check for date patterns in body
    import re
    dates = re.findall(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", body_text)
    print(f"YYYY-MM-DD in body: {dates}")
    
    # Try _parse_flexible_date on the body text (first 5000 chars)
    sample = body_text[:5000]
    result = _parse_flexible_date(sample)
    print(f"_parse_flexible_date on sample: {result}")
    
    # Check the searchable part of the body
    # The date might be deep in the body
    for line in body_text.split("\n"):
        if "2020" in line or "2021" in line or "2022" in line:
            line_clean = line.strip()[:100]
            print(f"Line with year: {line_clean}")

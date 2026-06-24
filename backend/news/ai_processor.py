

from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)



OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

_use_openai = bool(OPENAI_API_KEY)


def _call_openai(system: str, user: str, max_tokens: int = 300) -> str:
    """Call OpenAI chat completions."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user[:4000]},
            ],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip() or ""
    except Exception as e:
        logger.warning("OpenAI call failed: %s", e)
        return ""


# ──────────────────────────────────────────────
#  Summarization
# ──────────────────────────────────────────────

def summarize(text: str, max_sentences: int = 3) -> str:
    """Summarize article using OpenAI (if configured) or extractive fallback."""
    if not text or len(text) < 100:
        return text[:300]

    if _use_openai:
        result = _call_openai(
            system="لخص الخبر التالي بالعربية في 2-3 جمل موجزة.",
            user=text,
            max_tokens=200,
        )
        if result:
            return result[:500]

    # Extractive fallback
    sentences = re.split(r"(?<=[.!?])\s+", text)
    if len(sentences) <= max_sentences:
        return text[:500]
    scored = []
    for s in sentences:
        s = s.strip()
        if len(s) < 20:
            continue
        score = len(s)
        for kw in ["وزير", "رئيس", "مجلس", "مرسوم", "قانون", "مشروع", "اتفاق", "إعلان"]:
            if kw in s:
                score += 30
        scored.append((score, s))
    scored.sort(reverse=True)
    top = [s for _, s in scored[:max_sentences]]
    return " ".join(top)[:500]


# ──────────────────────────────────────────────
#  Date extraction
# ──────────────────────────────────────────────

def extract_date(text: str) -> datetime | None:
    """Extract date from text using regex or AI."""
    # Regex patterns first
    patterns = [
        r"(\d{1,2})\s*(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)\s*(\d{4})",
        r"(\d{4})/(\d{1,2})/(\d{1,2})",
        r"(\d{1,2})/(\d{1,2})/(\d{4})",
    ]
    months_ar = {
        "يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "مايو": 5, "يونيو": 6,
        "يوليو": 7, "أغسطس": 8, "سبتمبر": 9, "أكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12,
    }
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            try:
                if m.lastindex == 3:
                    day, month_str, year = int(m.group(1)), m.group(2), int(m.group(3))
                    month = months_ar.get(month_str)
                    if month:
                        return datetime(year, month, day)
                elif m.lastindex == 3:
                    return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except (ValueError, KeyError):
                continue

    if _use_openai and text:
        result = _call_openai(
            system="استخرج التاريخ من النص التالي وأعده بصيغة YYYY-MM-DD فقط. إذا لم تجد تاريخاً أعد 'none'.",
            user=text[:1000],
            max_tokens=20,
        )
        if result and result != "none":
            try:
                return datetime.strptime(result.strip()[:10], "%Y-%m-%d")
            except (ValueError, IndexError):
                pass
    return None


# ──────────────────────────────────────────────
#  Classification
# ──────────────────────────────────────────────

def classify(source_slug: str, title: str, content: str = "") -> str:
    """Classify article by source slug first, then keyword fallback."""
    # Primary: source slug → category (exhaustive mapping)
    SOURCE_MAP = {
        # Presidency & PM
        "presidence": "government", "primature": "government", "sgg": "government",
        "fonction-publique": "government", "affaires-islamiques": "government",
        # Diplomacy
        "affaires-etrangeres": "foreign_affairs", "cooperation": "foreign_affairs",
        # Security / Interior
        "interieur": "security", "defense": "security", "justice": "justice",
        # Economy
        "economie-finances": "economy", "commerce-tourisme": "economy",
        "domaines": "economy", "mines-industrie": "economy",
        # Energy
        "energies-petrole": "energy", "numerique": "energy",
        # Education
        "education": "education", "enseignement-superieur": "education",
        "jeunesse-sports": "education", "formation-professionnelle": "education",
        "culture": "education",
        # Health & Social
        "sante": "health", "masef": "social",
        # Agriculture
        "agriculture": "agriculture", "elevage": "agriculture",
        "peches": "agriculture",
        # Environment
        "environnement": "environment", "hydraulique": "environment",
        # Transport
        "transports": "transport",
        # Housing
        "habitat": "government",
    }
    if source_slug in SOURCE_MAP:
        return SOURCE_MAP[source_slug]

    # Fallback: keyword scan on title+content
    text = (title + " " + content).lower()
    KW_MAP = [
        (["أمن","دفاع","شرطة","جيش","عسكري","securité","défense","police","armée"], "security"),
        (["اقتصاد","مالية","ميزانية","ضريبة","استثمار","économie","finances","budget","impôt"], "economy"),
        (["تعليم","مدرسة","جامعة","طالب","education","école","université","étudiant"], "education"),
        (["صحة","مستشفى","طب","دواء","santé","hôpital","médecin","médicament"], "health"),
        (["زراعة","فلاحة","ماشية","سمك","agriculture","élevage","pêche"], "agriculture"),
        (["بيئة","مياه","مناخ","environnement","eau","climat"], "environment"),
        (["نقل","طريق","ميناء","مطار","transport","route","port","aéroport"], "transport"),
        (["طاقة","كهرباء","نفط","غاز","énergie","électricité","pétrole","gaz"], "energy"),
        (["خارجية","سفارة","دبلوماسية","étrangers","ambassade","diplomatie"], "foreign_affairs"),
        (["عدل","قضاء","محكمة","justice","tribunal","judiciaire"], "justice"),
        (["اجتماعي","رعاية","تضامن","social","solidarité","assistance"], "social"),
        (["حكومة","وزير","وزارة","مرسوم","gouvernement","ministre","décret"], "government"),
    ]
    for keywords, cat in KW_MAP:
        if any(kw in text for kw in keywords):
            return cat

    return "general"


# ──────────────────────────────────────────────
#  Translation
# ──────────────────────────────────────────────

def translate_title(title: str, target_lang: str = "fr") -> str:
    """Translate title using OpenAI or return as-is."""
    if not title:
        return ""
    if _use_openai:
        lang_name = "الفرنسية" if target_lang == "fr" else "العربية"
        result = _call_openai(
            system=f"ترجم العنوان التالي إلى {lang_name}. أعد الترجمة فقط.",
            user=title,
            max_tokens=100,
        )
        if result:
            return result[:300]
    return title


# ──────────────────────────────────────────────
#  Breaking news detection (المرحلة 4)
# ──────────────────────────────────────────────

BREAKING_KEYWORDS = [
    # Arabic — urgent events
    "عاجل", "طارئ", "تنبيه هام", "تحذير عاجل",
    "اجتماع طارئ", "إعلان حالة الطوارئ", "حالة استثنائية",
    "حادث خطير", "كارثة", "فيضانات", "زلزال", "جفاف",
    "اغتيال", "هجوم مسلح", "انفجار", "حريق",
    "إضراب عام", "احتجاجات واسعة",
    "وفاة رئيس", "وفاة وزير",
    # Arabic — important government announcements (موريتانيا)
    "يترأس الرئيس", "المجلس الوزاري", "مرسوم رئاسي",
    "قرار وزاري", "اتفاقية", "توقيع اتفاق",
    "زيارة رسمية", "استقبل رئيس", "بحث مع",
    "تعيين", "إعفاء", "تكليف",
    "ميزانية", "مشروع قانون", "مجلس الشيوخ", "الجمعية الوطنية",
    "انتخابات", "استفتاء",
    "حصيلة", "ضحايا", "إصابات",
    "أسعار", "ارتفاع الأسعار", "غلاء",
    # French — urgent
    "urgent", "flash info", "alerte",
    "état d'urgence", "situation d'urgence",
    "attentat", "explosion", "catastrophe", "incendie",
    "grève générale", "décès du président",
    # French — important government announcements
    "conseil des ministres", "décret présidentiel",
    "accord signé", "visite officielle",
    "nomination", "limogeage",
    "projet de loi", "assemblée nationale",
]


def is_breaking_news(title: str, content: str = "") -> bool:
    """Detect if an article is breaking news based on keywords + AI."""
    text = (title + " " + content).lower()

    # Keyword check
    for kw in BREAKING_KEYWORDS:
        if kw.lower() in text:
            return True

    # AI check
    if _use_openai:
        result = _call_openai(
            system="هل هذا الخبر عاجل؟ا.",
            user=f"العنوان: {title}\n\nالمحتوى: {content[:500]}",
            max_tokens=10,
        )
        if "نعم" in result or "yes" in result.lower():
            return True

    return False


def clean_html(text: str) -> str:
    """Remove HTML tags and clean whitespace."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ──────────────────────────────────────────────
#  Main enrichment pipeline
# ──────────────────────────────────────────────

def enrich_article(
    title: str,
    content: str,
    source_slug: str,
    published_at: datetime | None = None,
) -> dict[str, Any]:
    """Run all AI enrichment on an article."""
    result: dict[str, Any] = {}

    # Clean content
    cleaned = clean_html(content)

    # Summarize
    if cleaned and len(cleaned) > 100:
        result["summary"] = summarize(cleaned)
    else:
        result["summary"] = title[:200]

    # Date extraction
    if not published_at and cleaned:
        extracted = extract_date(cleaned)
        if extracted:
            result["published_at"] = extracted

    # Classification
    result["category"] = classify(source_slug, title, cleaned)

    # Breaking news
    result["is_breaking"] = is_breaking_news(title, cleaned)

    return result

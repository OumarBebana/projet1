import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["DJANGO_SETTINGS_MODULE"] = "govnews.settings"

import django
django.setup()

from maps.models import GovernmentLocation

data = [
    {
        "id": 1,
        "slug": "presidence",
        "services": "رئاسة, رئاسة الجمهورية, رئيس, présidence, président",
        "opening_hours": "08:00–17:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 2,
        "slug": "primature",
        "services": "وزارة أولى, حكومة, وزير أول, مجلس وزراء, primature, gouvernement",
        "opening_hours": "08:00–17:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 3,
        "slug": "economie-finances",
        "services": "اقتصاد, مالية, ضرائب, جمارك, ميزانية, économie, finances, impôts, budget",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 4,
        "slug": "interieur",
        "services": "داخلية, جوازات, إقامة, جنسية, أمن, passports, résidence, sécurité",
        "opening_hours": "08:00–17:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 5,
        "slug": "affaires-etrangeres",
        "services": "خارجية, جوازات سفر, تأشيرة, سفارة, سفراء, étranger, visa, ambassade, passeport",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 6,
        "slug": "justice",
        "services": "عدل, محكمة, قضاء, كاتب عدل, توثيق, justice, tribunal, notaire",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 7,
        "slug": "education",
        "services": "تهذيب, تعليم, مدارس, تلاميذ, كتب, éducation, écoles, élèves, livres",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 8,
        "slug": "enseignement-superieur",
        "services": "تعليم عالي, جامعة, بحث علمي, كلية, étudiant, université, recherche",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 9,
        "slug": "sante",
        "services": "صحة, مستشفى, دواء, علاج, طب, santé, hôpital, médicament",
        "opening_hours": "08:00–18:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 10,
        "slug": "agriculture",
        "services": "زراعة, فلاحة, محاصيل, مزارع, eau, agriculture, cultures, élevage",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 11,
        "slug": "transports",
        "services": "نقل, تجهيز, طرق, مواصلات, transport, routes, infrastructure",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
    {
        "id": 12,
        "slug": "energies-petrole",
        "services": "طاقة, نفط, بترول, كهرباء, مناجم, énergie, pétrole, électricité, mines",
        "opening_hours": "08:00–16:00 (الإثنين–الخميس), 08:00–13:00 (الجمعة)",
    },
]

for entry in data:
    GovernmentLocation.objects.filter(id=entry["id"]).update(
        slug=entry["slug"],
        services=entry["services"],
        opening_hours=entry["opening_hours"],
    )

print(f"Updated {len(data)} locations with slugs, services, and opening hours.")

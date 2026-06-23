

from django.core.management.base import BaseCommand
from news.models import Source, SourceType



SOURCES = [
    
    {
        "name": "Présidence de la République",
        "name_ar": "رئاسة الجمهورية",
        "name_fr": "Présidence de la République",
        "slug": "presidence",
        "source_type": SourceType.PRESIDENCY,
        "website_url": "https://www.presidence.mr",
        "news_url": "https://www.presidence.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 1,
    },
    {
        "name": "Primature",
        "name_ar": "الوزارة الأولى",
        "name_fr": "Premier Ministère",
        "slug": "primature",
        "source_type": SourceType.PRIME_MINISTER,
        "website_url": "https://primature.gov.mr",
        "news_url": "https://primature.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 2,
    },
    {
        "name": "Secrétariat Général du Gouvernement",
        "name_ar": "الوزارة المكلفة بالأمانة العامة للحكومة",
        "name_fr": "Ministère chargé du Secrétariat Général du Gouvernement",
        "slug": "sgg",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://sgg.gov.mr",
        "news_url": "https://sgg.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 3,
    },

    # ─── الوزارات ────────────────────────────────────────────────────────
    {
        "name": "Ministère de l'Économie et des Finances",
        "name_ar": "وزارة الاقتصاد والمالية",
        "name_fr": "Ministère de l'Économie et des Finances",
        "slug": "economie-finances",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://www.finances.gov.mr",
        "news_url": "https://www.finances.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 4,
    },
    {
        "name": "Ministère de l'Intérieur",
        "name_ar": "وزارة الداخلية وترقية اللامركزية",
        "name_fr": "Ministère de l'Intérieur, de la Promotion de la Décentralisation et du Développement Local",
        "slug": "interieur",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://interieur.gov.mr",
        "news_url": "https://interieur.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 5,
    },
    {
        "name": "Ministère des Affaires Étrangères",
        "name_ar": "وزارة الشؤون الخارجية والتعاون الإفريقي",
        "name_fr": "Ministère des Affaires Étrangères, de la Coopération Africaine et des Mauritaniens de l'Extérieur",
        "slug": "affaires-etrangeres",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://diplomatie.gov.mr",
        "news_url": "https://diplomatie.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 6,
    },
    {
        "name": "Ministère de la Défense Nationale",
        "name_ar": "وزارة الدفاع وشؤون المتقاعدين وأولاد الشهداء",
        "name_fr": "Ministère de la Défense, des Affaires des Retraités et des Enfants des Martyrs",
        "slug": "defense",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://defense.gov.mr",
        "news_url": "https://defense.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 7,
    },
    {
        "name": "Ministère de l'Éducation et de la Réforme de l'Enseignement",
        "name_ar": "وزارة التربية وإصلاح النظام التعليمي",
        "name_fr": "Ministère de l'Éducation et de la Réforme du Système d'Enseignement",
        "slug": "education",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://education.gov.mr",
        "news_url": "https://education.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 8,
    },
    {
        "name": "Ministère de la Santé",
        "name_ar": "وزارة الصحة",
        "name_fr": "Ministère de la Santé",
        "slug": "sante",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://sante.gov.mr",
        "news_url": "https://sante.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 9,
    },
    {
        "name": "Ministère de l'Enseignement Supérieur",
        "name_ar": "وزارة التعليم العالي والبحث العلمي",
        "name_fr": "Ministère de l'Enseignement Supérieur et de la Recherche Scientifique",
        "slug": "enseignement-superieur",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://mesrs.gov.mr",
        "news_url": "https://mesrs.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 10,
    },
    {
        "name": "Ministère de la Justice",
        "name_ar": "وزارة العدل",
        "name_fr": "Ministère de la Justice",
        "slug": "justice",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://justice.gov.mr",
        "news_url": "https://justice.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 11,
    },
    {
        "name": "Ministère des Affaires Islamiques",
        "name_ar": "وزارة الشؤون الإسلامية والتعليم الأصلي",
        "name_fr": "Ministère des Affaires Islamiques et de l'Enseignement Originel",
        "slug": "affaires-islamiques",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://affairesislamiques.gov.mr",
        "news_url": "https://affairesislamiques.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 12,
    },
    {
        "name": "Ministère de la Fonction Publique et du Travail",
        "name_ar": "وزارة الوظيفة العمومية والعمل",
        "name_fr": "Ministère de la Fonction Publique et du Travail",
        "slug": "fonction-publique",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://fonctionpublique.gov.mr",
        "news_url": "https://fonctionpublique.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 13,
    },
    {
        "name": "Ministère des Mines et de l'Industrie",
        "name_ar": "وزارة المعادن والصناعة",
        "name_fr": "Ministère des Mines et de l'Industrie",
        "slug": "mines-industrie",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://mmi.gov.mr",
        "news_url": "https://mmi.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 14,
    },
    {
        "name": "Ministère des Pêches et de l'Économie Maritime",
        "name_ar": "وزارة الصيد والبنى التحتية البحرية والمينائية",
        "name_fr": "Ministère de la Pêche, des Infrastructures Maritimes et Portuaires",
        "slug": "peches",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://peches.gov.mr",
        "news_url": "https://peches.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 15,
    },
    {
        "name": "Ministère de l'Agriculture et de la Souveraineté Alimentaire",
        "name_ar": "وزارة الزراعة والسيادة الغذائية",
        "name_fr": "Ministère de l'Agriculture et de la Souveraineté Alimentaire",
        "slug": "agriculture",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://agriculture.gov.mr",
        "news_url": "https://agriculture.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 16,
    },
    {
        "name": "Ministère de l'Élevage",
        "name_ar": "وزارة التنمية الحيوانية",
        "name_fr": "Ministère de l'Élevage",
        "slug": "elevage",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://elevage.gov.mr",
        "news_url": "https://elevage.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 17,
    },
    {
        "name": "Ministère des Domaines et des Affaires Foncières",
        "name_ar": "وزارة العقارات وأملاك الدولة والإصلاح العقاري",
        "name_fr": "Ministère des Domaines, du Patrimoine de l'État et de la Réforme Foncière",
        "slug": "domaines",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://domaines.gov.mr",
        "news_url": "https://domaines.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 18,
    },
    {
        "name": "Ministère du Commerce et du Tourisme",
        "name_ar": "وزارة التجارة والسياحة",
        "name_fr": "Ministère du Commerce et du Tourisme",
        "slug": "commerce-tourisme",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://commerce.gov.mr",
        "news_url": "https://commerce.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 19,
    },
    {
        "name": "Ministère de l'Habitat et de l'Urbanisme",
        "name_ar": "وزارة الإسكان والعمران والاستصلاح الترابي",
        "name_fr": "Ministère de l'Habitat, de l'Urbanisme et de l'Aménagement du Territoire",
        "slug": "habitat",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://habitat.gov.mr",
        "news_url": "https://habitat.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 20,
    },
    {
        "name": "Ministère de l'Équipement et des Transports",
        "name_ar": "وزارة التجهيز والنقل",
        "name_fr": "Ministère de l'Équipement et des Transports",
        "slug": "transports",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://transports.gov.mr",
        "news_url": "https://transports.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 21,
    },
    {
        "name": "Ministère de l'Hydraulique et de l'Assainissement",
        "name_ar": "وزارة المياه والصرف الصحي",
        "name_fr": "Ministère de l'Hydraulique et de l'Assainissement",
        "slug": "hydraulique",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://hydraulique.gov.mr",
        "news_url": "https://hydraulique.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 22,
    },
    {
        "name": "Ministère de la Culture, des Arts et de la Communication",
        "name_ar": "وزارة الثقافة والفنون والاتصال",
        "name_fr": "Ministère de la Culture, des Arts et de la Communication",
        "slug": "culture",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://culture.gov.mr",
        "news_url": "https://culture.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 23,
    },
    {
        "name": "Ministère des Affaires Sociales",
        "name_ar": "وزارة العمل الاجتماعي والطفولة والأسرة",
        "name_fr": "Ministère de l'Action Sociale, de l'Enfance et de la Famille",
        "slug": "masef",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://masef.gov.mr",
        "news_url": "https://masef.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 24,
    },
    {
        "name": "Ministère de l'Environnement",
        "name_ar": "وزارة البيئة والتنمية المستدامة",
        "name_fr": "Ministère de l'Environnement et du Développement Durable",
        "slug": "environnement",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://environnement.gov.mr",
        "news_url": "https://environnement.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 25,
    },
    {
        "name": "Ministère de la Transformation Numérique",
        "name_ar": "وزارة التحول الرقمي وعصرنة الإدارة",
        "name_fr": "Ministère de la Transformation Numérique et de la Modernisation de l'Administration",
        "slug": "numerique",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://mtnima.gov.mr",
        "news_url": "https://mtnima.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 26,
    },
    {
        "name": "Ministère du Pétrole et de l'Énergie",
        "name_ar": "وزارة النفط والطاقة",
        "name_fr": "Ministère de l'Énergie et du Pétrole",
        "slug": "energies-petrole",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://energies-petrole.gov.mr",
        "news_url": "https://energies-petrole.gov.mr/ar/actualites",
        "rss_url": "https://energies-petrole.gov.mr/rss.xml",
        "sort_order": 27,
    },
    {
        "name": "Ministère de la Jeunesse, des Sports et de la Fonction Publique",
        "name_ar": "وزارة تمكين الشباب والتشغيل والرياضة والخدمة المدنية",
        "name_fr": "Ministère de l'Autonomisation des Jeunes, de l'Emploi, des Sports et du Service Civique",
        "slug": "jeunesse-sports",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://majessc.gov.mr",
        "news_url": "https://majessc.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 28,
    },
    {
        "name": "Ministère de la Formation Professionnelle",
        "name_ar": "وزارة التكوين المهني والصناعة التقليدية والحرف",
        "name_fr": "Ministère de la Formation Professionnelle, de l'Artisanat et des Métiers",
        "slug": "formation-professionnelle",
        "source_type": SourceType.MINISTRY,
        "website_url": "https://mfpam.gov.mr",
        "news_url": "https://mfpam.gov.mr/ar/actualites",
        "rss_url": "",
        "sort_order": 29,
    },
    {
        "name": "Agence Mauritanienne d'Information",
        "name_ar": "وكالة موريتانيا للأنباء",
        "name_fr": "Agence Mauritanienne d'Information (AMI)",
        "slug": "ami",
        "source_type": SourceType.OTHER,
        "website_url": "https://ami.mr",
        "news_url": "https://ami.mr/ar/",
        "rss_url": "https://ami.mr/rss.xml",
        "sort_order": 30,
    },
]


class Command(BaseCommand):
    help = "Seed database with all 30 Mauritanian government news sources"

    def add_arguments(self, parser):
        parser.add_argument(
            "--update",
            action="store_true",
            help="Update existing sources with new data",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing sources before seeding (DANGER: deletes articles too)",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = Source.objects.count()
            Source.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {count} sources."))

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for data in SOURCES:
            slug = data["slug"]
            existing = Source.objects.filter(slug=slug).first()

            if existing:
                if options["update"]:
                    for k, v in data.items():
                        setattr(existing, k, v)
                    existing.save()
                    updated_count += 1
                    self.stdout.write(f"  [OK] Updated: {data['name_ar']}")
                else:
                    skipped_count += 1
                    self.stdout.write(f"  - Skipped (exists): {data['name_ar']}")
            else:
                Source.objects.create(**data)
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"  [NEW] Created: {data['name_ar']}")
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Done! Created: {created_count} | Updated: {updated_count} | Skipped: {skipped_count}"
        ))
        self.stdout.write(f"Total sources in DB: {Source.objects.count()}")

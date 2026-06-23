from django.db import models
from django.utils import timezone as dj_timezone


class SourceType(models.TextChoices):
    PRESIDENCY = "presidency", "رئاسة الجمهورية"
    PRIME_MINISTER = "pm", "الوزارة الأولى"
    MINISTRY = "ministry", "وزارة"
    OTHER = "other", "أخرى"


class FetchMethod(models.TextChoices):
    RSS = "rss", "RSS"
    SITEMAP = "sitemap", "Sitemap"
    SCRAPE = "scrape", "Web Scraping"
    API = "api", "API"


class Source(models.Model):
    name = models.CharField(max_length=255, unique=True)
    name_fr = models.CharField("Nom (FR)", max_length=400, blank=True)
    name_ar = models.CharField("الاسم (عربي)", max_length=400, blank=True)
    slug = models.SlugField(unique=True, max_length=120)
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.MINISTRY,
    )
    website_url = models.URLField(max_length=500, blank=True)
    rss_url = models.URLField(max_length=500, blank=True, help_text="رابط تغذية RSS/Atom")
    news_url = models.URLField(
        max_length=700,
        blank=True,
        help_text="رابط صفحة الأخبار (يُستخدم عند عدم توفر RSS).",
    )
    logo_url = models.URLField(max_length=800, blank=True, help_text="رابط شعار الوزارة")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    # Per-source scraping config
    scrape_link_selector = models.CharField(
        max_length=300, blank=True,
        help_text="CSS selector لعناوين المقالات (مثال: h3.node__title a)",
    )
    scrape_title_selector = models.CharField(
        max_length=300, blank=True,
        help_text="CSS selector لعنوان الخبر داخل الرابط (اختياري)",
    )
    scrape_date_selector = models.CharField(
        max_length=300, blank=True,
        help_text="CSS selector للتاريخ (اختياري)",
    )

    # Fetch tracking
    last_fetched_at = models.DateTimeField(null=True, blank=True, help_text="آخر مرة تم فيها جلب الأخبار")
    last_fetch_status = models.CharField(
        max_length=20, blank=True,
        choices=[("success", "نجاح"), ("fail", "فشل"), ("unknown", "غير معروف")],
        default="unknown",
        help_text="حالة آخر جلب",
    )
    last_fetch_error = models.TextField(blank=True, help_text="رسالة الخطأ في آخر جلب")
    last_fetch_count = models.PositiveIntegerField(default=0, help_text="عدد الأخبار التي تم جلبها في آخر مرة")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "مصدر"
        verbose_name_plural = "المصادر"

    def __str__(self) -> str:
        return self.name_ar or self.name_fr or self.name


class ArticleCategory(models.TextChoices):
    GOVERNMENT = "government", "الحكومة والسياسة"
    ECONOMY = "economy", "الاقتصاد والمالية"
    EDUCATION = "education", "التعليم"
    HEALTH = "health", "الصحة"
    SECURITY = "security", "الدفاع والأمن"
    ENVIRONMENT = "environment", "البيئة والتنمية"
    TRANSPORT = "transport", "النقل"
    ENERGY = "energy", "الطاقة"
    AGRICULTURE = "agriculture", "الزراعة"
    JUSTICE = "justice", "العدل"
    FOREIGN = "foreign_affairs", "الشؤون الخارجية"
    SOCIAL = "social", "الشؤون الاجتماعية"
    GENERAL = "general", "عام"


class Article(models.Model):
    source = models.ForeignKey(
        Source,
        on_delete=models.CASCADE,
        related_name="articles",
    )
    title = models.CharField(max_length=500)
    url = models.URLField(max_length=800, unique=True)
    summary = models.TextField(blank=True)
    image_url = models.URLField(max_length=800, blank=True)
    content = models.TextField(blank=True, help_text="نص المقال كاملاً")
    language = models.CharField(
        max_length=2,
        blank=True,
        choices=[("ar", "Arabic"), ("fr", "French")],
        db_index=True,
    )
    category = models.CharField(
        max_length=20,
        choices=ArticleCategory.choices,
        default=ArticleCategory.GENERAL,
        db_index=True,
    )
    fetch_method = models.CharField(
        max_length=10,
        choices=FetchMethod.choices,
        default=FetchMethod.SCRAPE,
        blank=True,
    )
    is_breaking = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-published_at", "-id"]
        verbose_name = "مقال"
        verbose_name_plural = "المقالات"
        indexes = [
            models.Index(fields=["-published_at"]),
            models.Index(fields=["source", "-published_at"]),
            models.Index(fields=["category", "-published_at"]),
            models.Index(fields=["is_breaking", "-published_at"]),
        ]

    def __str__(self) -> str:
        return self.title


class NewsletterType(models.TextChoices):
    DAILY = "daily", "يومي"
    WEEKLY = "weekly", "أسبوعي"
    MONTHLY = "monthly", "شهري"
    BREAKING = "breaking", "عاجل"


class Subscriber(models.Model):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    language = models.CharField(
        max_length=2,
        choices=[("ar", "Arabic"), ("fr", "French")],
        default="ar",
    )
    newsletter_type = models.CharField(
        max_length=10,
        choices=NewsletterType.choices,
        default=NewsletterType.DAILY,
    )
    receive_all = models.BooleanField(default=True, verbose_name="استقبال كل الأخبار")
    interests = models.JSONField(default=list, blank=True, verbose_name="الاهتمامات (slug)")
    last_sent = models.DateTimeField(null=True, blank=True, verbose_name="آخر إرسال")
    created_at = models.DateTimeField(default=dj_timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "مشترك"
        verbose_name_plural = "المشتركون"

    def __str__(self) -> str:
        return self.email

from django.db import models


class GovernmentLocation(models.Model):
    name_ar = models.CharField(max_length=255, verbose_name="الاسم (عربي)")
    name_fr = models.CharField(max_length=255, blank=True, null=True, verbose_name="Nom (français)")
    slug = models.CharField(max_length=100, blank=True, verbose_name="الرابط المختصر")
    INSTITUTION_TYPES = [
        ("presidency",         "رئاسة الجمهورية"),
        ("pm",                 "الوزارة الأولى"),
        ("ministry",           "وزارة"),
        ("public_institution", "مؤسسة عمومية"),
        ("university",         "جامعة"),
        ("hospital",           "مستشفى"),
        ("municipality",       "بلدية"),
        ("police",             "شرطة / أمن"),
        ("court",              "محكمة"),
    ]
    institution_type = models.CharField(
        max_length=100,
        default="ministry",
        choices=INSTITUTION_TYPES,
        verbose_name="نوع المؤسسة",
    )
    services = models.TextField(blank=True, verbose_name="الخدمات (كلمات مفتاحية مفصولة بفاصلة)")
    opening_hours = models.CharField(max_length=255, blank=True, verbose_name="أوقات العمل")
    address = models.TextField(blank=True, null=True, verbose_name="العنوان (عربي)")
    address_fr = models.TextField(blank=True, null=True, verbose_name="Adresse (français)")
    latitude = models.FloatField(verbose_name="خط العرض")
    longitude = models.FloatField(verbose_name="خط الطول")
    phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="الهاتف")
    website = models.URLField(blank=True, null=True, verbose_name="الموقع الرسمي")
    is_active = models.BooleanField(default=True, verbose_name="نشط")

    class Meta:
        ordering = ["name_ar"]
        verbose_name = "موقع حكومي"
        verbose_name_plural = "المواقع الحكومية"

    def __str__(self):
        return self.name_ar


class EmergencyPlace(models.Model):
    TYPES = [
        ("hospital",          "مستشفى"),
        ("police",            "مفوضية شرطة"),
        ("civil_protection",  "حماية مدنية"),
        ("pharmacy",          "صيدلية"),
    ]
    name       = models.CharField(max_length=255, verbose_name="الاسم")
    place_type = models.CharField(max_length=50, choices=TYPES, verbose_name="النوع")
    latitude   = models.FloatField(verbose_name="خط العرض")
    longitude  = models.FloatField(verbose_name="خط الطول")
    phone      = models.CharField(max_length=50, blank=True, verbose_name="الهاتف")
    address    = models.TextField(blank=True, verbose_name="العنوان")
    is_24h     = models.BooleanField(default=False, verbose_name="متاح 24/24")
    is_on_duty = models.BooleanField(default=False, verbose_name="مناوبة الآن")
    opening_hours = models.CharField(max_length=255, blank=True, verbose_name="أوقات العمل")
    is_active  = models.BooleanField(default=True, verbose_name="نشط")

    class Meta:
        ordering = ["place_type", "name"]
        verbose_name = "مكان طوارئ"
        verbose_name_plural = "أماكن الطوارئ"

    def __str__(self):
        return f"{self.get_place_type_display()} — {self.name}"

from django.contrib import admin, messages
from django.core.management import call_command

from .models import Article, Source, Subscriber


@admin.register(Source)
class SourceAdmin(admin.ModelAdmin):
    list_display = ("name", "name_ar", "source_type", "slug", "is_active", "sort_order", "last_fetch_status", "last_fetch_count", "last_fetched_at")
    list_display_links = ("name", "name_ar")
    list_filter = ("source_type", "is_active", "last_fetch_status")
    search_fields = ("name", "name_fr", "name_ar", "slug", "website_url", "rss_url", "news_url")
    readonly_fields = ("created_at", "updated_at", "last_fetched_at", "last_fetch_status", "last_fetch_error", "last_fetch_count")
    fieldsets = (
        ("الاسم", {
            "fields": ("name", "name_ar", "name_fr", "slug"),
            "description": "name = داخلي (إنجليزي), name_ar = عربي, name_fr = فرنسي",
        }),
        ("التصنيف", {
            "fields": ("source_type", "sort_order", "is_active"),
        }),
        ("الروابط", {
            "fields": (
                ("website_url", "rss_url"),
                "news_url",
            ),
            "description": "RSS أولاً ← Sitemap ثانياً ← Scraping من news_url ثالثاً",
        }),
        ("إعدادات Scraping", {
            "fields": (
                "scrape_link_selector",
                ("scrape_title_selector", "scrape_date_selector"),
            ),
            "description": "CSS selectors خاصة بهذا المصدر (تستخدم فقط إذا كان scraping عام لا يعمل)",
            "classes": ("wide",),
        }),
        ("آخر جلب", {
            "fields": (
                ("last_fetch_status", "last_fetch_count"),
                "last_fetched_at",
                "last_fetch_error",
            ),
        }),
        ("تواريخ", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
    ordering = ("sort_order", "name")
    actions = ["fetch_selected_sources", "enable_sources", "disable_sources"]

    @admin.display(description="RSS")
    def rss_url_short(self, obj):
        if obj.rss_url:
            return obj.rss_url[:50] + ("…" if len(obj.rss_url) > 50 else "")
        return "—"

    def enable_sources(self, request, queryset):
        queryset.update(is_active=True)
    enable_sources.short_description = "تفعيل المصادر المحددة"

    def disable_sources(self, request, queryset):
        queryset.update(is_active=False)
    disable_sources.short_description = "تعطيل المصادر المحددة"

    def fetch_selected_sources(self, request, queryset):
        for source in queryset:
            try:
                call_command("fetch_news", source=source.slug, limit=5)
                self.message_user(request, f"✅ {source.name_ar or source.name}: تم الجلب", messages.SUCCESS)
            except Exception as e:
                self.message_user(request, f"❌ {source.name_ar or source.name}: {e}", messages.ERROR)
    fetch_selected_sources.short_description = "🔄 جلب آخر الأخبار للمصادر المحددة"


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title_short", "source", "published_at", "has_content", "created_at")
    list_display_links = ("title_short",)
    list_filter = ("source", "source__source_type", "published_at")
    search_fields = ("title", "summary", "content", "url")
    autocomplete_fields = ("source",)
    readonly_fields = ("created_at",)
    fieldsets = (
        (None, {
            "fields": ("source", "title", "url"),
        }),
        ("المحتوى", {
            "fields": ("summary", "content"),
            "classes": ("wide",),
        }),
        ("التواريخ", {
            "fields": ("published_at", "created_at"),
        }),
    )
    date_hierarchy = "published_at"

    @admin.display(description="العنوان")
    def title_short(self, obj):
        return (obj.title[:70] + "…") if len(obj.title) > 70 else obj.title

    @admin.display(description="محتوى", boolean=True)
    def has_content(self, obj):
        return bool(obj.content and len(obj.content) > 100)


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ("email", "language", "newsletter_type", "is_active", "created_at")
    list_filter = ("language", "newsletter_type", "is_active")
    search_fields = ("email",)
    ordering = ("-created_at",)

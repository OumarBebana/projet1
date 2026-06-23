from django.contrib import admin
from .models import GovernmentLocation, EmergencyPlace


@admin.register(GovernmentLocation)
class GovernmentLocationAdmin(admin.ModelAdmin):
    list_display = ("name_ar", "name_fr", "institution_type", "is_active")
    list_filter = ("institution_type", "is_active")
    search_fields = ("name_ar", "name_fr")


@admin.register(EmergencyPlace)
class EmergencyPlaceAdmin(admin.ModelAdmin):
    list_display = ("name", "place_type", "phone", "is_24h", "is_on_duty", "is_active")
    list_filter = ("place_type", "is_24h", "is_on_duty", "is_active")
    list_editable = ("is_on_duty", "is_active")
    search_fields = ("name", "address", "phone")

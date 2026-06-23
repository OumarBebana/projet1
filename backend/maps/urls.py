from django.urls import path
from . import views

urlpatterns = [
    path("government-locations/", views.government_locations, name="government-locations"),
    path("emergency/",            views.emergency_places,     name="emergency-places"),
    path("emergency/nearest/",    views.nearest_emergency,    name="emergency-nearest"),
]

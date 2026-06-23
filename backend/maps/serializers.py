from rest_framework import serializers
from .models import GovernmentLocation, EmergencyPlace


class GovernmentLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernmentLocation
        fields = "__all__"


class EmergencyPlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyPlace
        fields = "__all__"

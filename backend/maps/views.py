from math import radians, sin, cos, sqrt, atan2

from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import GovernmentLocation, EmergencyPlace
from .serializers import GovernmentLocationSerializer, EmergencyPlaceSerializer


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


@api_view(["GET"])
def government_locations(request):
    search = request.GET.get("search", "")
    service = request.GET.get("service", "")
    inst_type = request.GET.get("type", "")
    nearby = request.GET.get("nearby", "")

    locations = GovernmentLocation.objects.filter(is_active=True)

    if search:
        locations = locations.filter(
            Q(name_ar__icontains=search)
            | Q(name_fr__icontains=search)
            | Q(services__icontains=search)
        )

    if service:
        locations = locations.filter(services__icontains=service)

    if inst_type:
        locations = locations.filter(institution_type=inst_type)

    serializer = GovernmentLocationSerializer(locations, many=True)
    data = serializer.data

    if nearby:
        try:
            lat_str, lon_str = nearby.split(",")
            user_lat = float(lat_str)
            user_lon = float(lon_str)
            for item in data:
                item["distance_km"] = round(
                    _haversine(user_lat, user_lon, item["latitude"], item["longitude"]), 2
                )
            data.sort(key=lambda x: x.get("distance_km", 9999))
            if data:
                data[0]["is_nearest"] = True
        except (ValueError, IndexError):
            pass

    return Response(data)


@api_view(["GET"])
def emergency_places(request):
    """
    Returns emergency places sorted by distance.
    Query params:
      lat, lon  — user coordinates (required for sorting)
      type      — filter by place_type
      limit     — max results per type (default 1 nearest per type)
    """
    user_lat = request.GET.get("lat")
    user_lon = request.GET.get("lon")
    place_type = request.GET.get("type", "")
    limit = int(request.GET.get("limit", 0))

    qs = EmergencyPlace.objects.filter(is_active=True)
    if place_type:
        qs = qs.filter(place_type=place_type)

    serializer = EmergencyPlaceSerializer(qs, many=True)
    data = list(serializer.data)

    if user_lat and user_lon:
        try:
            ulat, ulon = float(user_lat), float(user_lon)
            for item in data:
                item["distance_km"] = round(
                    _haversine(ulat, ulon, item["latitude"], item["longitude"]), 2
                )
            data.sort(key=lambda x: x.get("distance_km", 9999))
        except (ValueError, TypeError):
            pass

    if limit:
        data = data[:limit]

    return Response(data)


@api_view(["GET"])
def nearest_emergency(request):
    """
    Returns the single nearest place for each emergency type.
    Query params: lat, lon (required)
    """
    user_lat = request.GET.get("lat")
    user_lon = request.GET.get("lon")

    if not user_lat or not user_lon:
        return Response({"error": "lat and lon required"}, status=400)

    try:
        ulat, ulon = float(user_lat), float(user_lon)
    except ValueError:
        return Response({"error": "invalid coordinates"}, status=400)

    result = {}
    for ptype, _ in EmergencyPlace.TYPES:
        places = EmergencyPlace.objects.filter(is_active=True, place_type=ptype)
        best = None
        best_dist = float("inf")
        for p in places:
            d = _haversine(ulat, ulon, p.latitude, p.longitude)
            if d < best_dist:
                best_dist = d
                best = p
        if best:
            s = EmergencyPlaceSerializer(best).data
            s["distance_km"] = round(best_dist, 2)
            result[ptype] = s

    return Response(result)

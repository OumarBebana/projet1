from rest_framework import serializers

from .models import Article, Source, Subscriber


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = [
            "id",
            "name",
            "name_fr",
            "name_ar",
            "slug",
            "website_url",
            "logo_url",
            "is_active",
            "sort_order",
            "last_fetched_at",
        ]


class ArticleTickerSerializer(serializers.ModelSerializer):
    source_name = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ["id", "title", "url", "source_name", "is_breaking"]

    def get_source_name(self, obj):
        return obj.source.name_ar or obj.source.name_fr or obj.source.name


class ArticleSerializer(serializers.ModelSerializer):
    source = SourceSerializer(read_only=True)
    source_id = serializers.PrimaryKeyRelatedField(
        queryset=Source.objects.all(),
        write_only=True,
        required=False,
        source="source",
    )

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "url",
            "summary",
            "content",
            "image_url",
            "published_at",
            "language",
            "category",
            "is_breaking",
            "created_at",
            "source",
            "source_id",
        ]


class SubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscriber
        fields = ["email", "language", "newsletter_type", "receive_all", "interests"]
        extra_kwargs = {
            "email": {"validators": []},
        }

from django.urls import path

from .views import ArticleListView, SourceListView

urlpatterns = [
    path("sources/", SourceListView.as_view(), name="source-list"),
    path("articles/", ArticleListView.as_view(), name="article-list"),
]


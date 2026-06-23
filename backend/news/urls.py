from django.urls import path

from .views import ArticleDetailView, ArticleListView, BreakingNewsView, dashboard_stats, FetchArticleContentView, FetchNowView, LatestPerSourceView, LatestTitlesView, SourceListView, subscribe_newsletter, newsletter_stats, check_subscription, manage_subscription, unsubscribe_by_token, unsubscribe_newsletter, newsletter_preview

urlpatterns = [
    path("sources/", SourceListView.as_view(), name="sources-list"),
    path("articles/", ArticleListView.as_view(), name="articles-list"),
    path("articles/<int:pk>/", ArticleDetailView.as_view(), name="article-detail"),
    path("latest-per-source/", LatestPerSourceView.as_view(), name="latest-per-source"),
    path("latest-titles/", LatestTitlesView.as_view(), name="latest-titles"),
    path("fetch-now/", FetchNowView.as_view(), name="fetch-now"),
    path("stats/", dashboard_stats, name="dashboard-stats"),
    path("breaking/", BreakingNewsView.as_view(), name="breaking-news"),
    path("fetch-content/<int:pk>/", FetchArticleContentView.as_view(), name="fetch-content"),
    path("newsletter/stats/", newsletter_stats, name="newsletter-stats"),
    path("newsletter/check/", check_subscription, name="newsletter-check"),
    path("newsletter/subscribe/", subscribe_newsletter, name="newsletter-subscribe"),
    path("newsletter/subscriber/", check_subscription, name="newsletter-subscriber"),
    path("newsletter/update/", manage_subscription, name="newsletter-update"),
    path("newsletter/manage/", manage_subscription, name="newsletter-manage"),
    path("newsletter/preview/", newsletter_preview, name="newsletter-preview"),
    path("newsletter/unsubscribe/", unsubscribe_newsletter, name="newsletter-unsubscribe"),
    path("unsubscribe/<str:email>/<str:token>/", unsubscribe_by_token, name="newsletter-unsubscribe-token"),
]

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from apps.core.views import SGPTokenObtainPairView

api_v1 = [
    path("auth/", include("apps.core.auth_urls")),
    path("auth/token/", SGPTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("", include("apps.core.urls")),
    path("", include("apps.portfolio.urls")),
    path("", include("apps.tasks.urls")),
    path("", include("apps.resources.urls")),
    path("", include("apps.finance.urls")),
    path("", include("apps.risks.urls")),
    path("", include("apps.capabilities.urls")),
    path("", include("apps.collab.urls")),
    path("", include("apps.integrations.urls")),
    path("", include("apps.analytics.urls")),
    path("", include("apps.ajuda.urls")),
    path("", include("apps.ia.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include((api_v1, "v1"), namespace="v1")),
    path("api-auth/", include("rest_framework.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

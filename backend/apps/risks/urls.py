from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import IssueViewSet, PainelRiscosView, RiskHistoryViewSet, RiskViewSet

router = DefaultRouter()
router.register("riscos", RiskViewSet, basename="risco")
router.register("riscos-historico", RiskHistoryViewSet, basename="risco-historico")
router.register("issues", IssueViewSet, basename="issue")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/riscos/", PainelRiscosView.as_view(), name="painel-riscos"),
]

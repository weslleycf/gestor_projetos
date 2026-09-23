from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AuditoriaViesViewSet,
    BenchmarkingView,
    DemandaPessoasView,
    MonteCarloView,
    PainelAnalyticsView,
    PrevisaoProjetoView,
    PrevisaoProjetoViewSet,
    RiscoAtrasoListView,
    TendenciasView,
    ViesExecutarView,
    ViesView,
)

router = DefaultRouter()
router.register("analytics/previsoes", PrevisaoProjetoViewSet, basename="previsao-projeto")
router.register("analytics/auditorias", AuditoriaViesViewSet, basename="auditoria-vies")

urlpatterns = [
    path("", include(router.urls)),
    path("analytics/previsao/<int:project_id>/", PrevisaoProjetoView.as_view(), name="analytics-previsao"),
    path("analytics/risco-atraso/", RiscoAtrasoListView.as_view(), name="analytics-risco-atraso"),
    path("analytics/benchmarking/", BenchmarkingView.as_view(), name="analytics-benchmarking"),
    path("analytics/monte-carlo/", MonteCarloView.as_view(), name="analytics-monte-carlo"),
    path("analytics/vies/executar/", ViesExecutarView.as_view(), name="analytics-vies-executar"),
    path("analytics/vies/", ViesView.as_view(), name="analytics-vies"),
    path("analytics/tendencias/", TendenciasView.as_view(), name="analytics-tendencias"),
    path("analytics/demanda-pessoas/", DemandaPessoasView.as_view(), name="analytics-demanda-pessoas"),
    path("analytics/painel/", PainelAnalyticsView.as_view(), name="analytics-painel"),
]

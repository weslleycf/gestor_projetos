from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AlocacaoViewSet,
    CapacidadeColaboradorView,
    CapacidadeSemanalViewSet,
    PainelAlocacaoView,
    RecursoViewSet,
    TimesheetViewSet,
)

router = DefaultRouter()
router.register("recursos", RecursoViewSet, basename="recurso")
router.register("alocacoes", AlocacaoViewSet, basename="alocacao")
router.register("timesheet", TimesheetViewSet, basename="timesheet")
router.register("capacidade-semanal", CapacidadeSemanalViewSet, basename="capacidade-semanal")

urlpatterns = [
    path("", include(router.urls)),
    path("capacidade/<int:user_id>/", CapacidadeColaboradorView.as_view(), name="capacidade-colaborador"),
    path("dashboard/alocacao/", PainelAlocacaoView.as_view(), name="painel-alocacao"),
]

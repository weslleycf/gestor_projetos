from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EVMProjetoView,
    LancamentoViewSet,
    OrcamentoViewSet,
    PainelFinanceiroView,
    PrevisaoFluxoCaixaViewSet,
)

router = DefaultRouter()
router.register("orcamentos", OrcamentoViewSet, basename="orcamento")
router.register("lancamentos", LancamentoViewSet, basename="lancamento")
router.register("previsoes-caixa", PrevisaoFluxoCaixaViewSet, basename="previsao-caixa")

urlpatterns = [
    path("", include(router.urls)),
    path("evm/<int:project_id>/", EVMProjetoView.as_view(), name="evm-projeto"),
    path("dashboard/financeiro/", PainelFinanceiroView.as_view(), name="painel-financeiro"),
]

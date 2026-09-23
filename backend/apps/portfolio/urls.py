from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BaselineViewSet,
    CampoCustomizadoViewSet,
    CatalogoWidgetsView,
    DashboardExecutivoView,
    KPIViewSet,
    LicaoAprendidaViewSet,
    MilestoneViewSet,
    PortfolioViewSet,
    ProgramViewSet,
    ProjectViewSet,
    WorkflowStateViewSet,
    WorkflowTransitionViewSet,
    WorkflowViewSet,
)

router = DefaultRouter()
router.register("portfolios", PortfolioViewSet, basename="portfolio")
router.register("programas", ProgramViewSet, basename="programa")
router.register("projetos", ProjectViewSet, basename="projeto")
router.register("marcos", MilestoneViewSet, basename="marco")
router.register("kpis", KPIViewSet, basename="kpi")
router.register("baselines", BaselineViewSet, basename="baseline")
router.register("licoes", LicaoAprendidaViewSet, basename="licao")
router.register("workflows", WorkflowViewSet, basename="workflow")
router.register("workflow-estados", WorkflowStateViewSet, basename="workflow-estado")
router.register("workflow-transicoes", WorkflowTransitionViewSet, basename="workflow-transicao")
router.register("campos-customizados", CampoCustomizadoViewSet, basename="campo-customizado")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/executivo/", DashboardExecutivoView.as_view(), name="dashboard-executivo"),
    path("widgets/", CatalogoWidgetsView.as_view(), name="catalogo-widgets"),
]

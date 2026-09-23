from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnexoViewSet,
    ApiTokenViewSet,
    AtividadeViewSet,
    AuditLogViewSet,
    BuscaGlobalView,
    ComentarioViewSet,
    CustomReportViewSet,
    DashboardLayoutViewSet,
    LogoutView,
    MeView,
    NotificacaoViewSet,
    PermissoesView,
    RegraNotificacaoViewSet,
    RoleViewSet,
    SavedFilterViewSet,
    UserRoleViewSet,
    UserViewPreferenceViewSet,
    UserViewSet,
    WebhookViewSet,
    healthcheck,
)

router = DefaultRouter()
router.register("usuarios", UserViewSet, basename="usuario")
router.register("papeis", RoleViewSet, basename="papel")
router.register("vinculos-papel", UserRoleViewSet, basename="vinculo-papel")
router.register("auditoria", AuditLogViewSet, basename="auditoria")
router.register("notificacoes", NotificacaoViewSet, basename="notificacao")
router.register("regras-notificacao", RegraNotificacaoViewSet, basename="regra-notificacao")
router.register("atividades", AtividadeViewSet, basename="atividade")
router.register("preferencias-visao", UserViewPreferenceViewSet, basename="preferencia-visao")
router.register("dashboards", DashboardLayoutViewSet, basename="dashboard-layout")
router.register("filtros-salvos", SavedFilterViewSet, basename="filtro-salvo")
router.register("relatorios", CustomReportViewSet, basename="relatorio")
router.register("tokens-api", ApiTokenViewSet, basename="token-api")
router.register("webhooks", WebhookViewSet, basename="webhook")
router.register("comentarios", ComentarioViewSet, basename="comentario")
router.register("anexos", AnexoViewSet, basename="anexo")

urlpatterns = [
    path("", include(router.urls)),
    path("busca/", BuscaGlobalView.as_view(), name="busca-global"),
    path("permissoes/", PermissoesView.as_view(), name="permissoes"),
    path("health/", healthcheck, name="healthcheck"),
]

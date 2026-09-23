from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CatalogoIntegracoesView,
    DatasetBIView,
    EventoIntegracaoViewSet,
    FeedCalendarioView,
    IntegracaoViewSet,
    MapeamentoCampoViewSet,
    PainelIntegracoesView,
    SincronizacaoLogViewSet,
    TiposIntegracaoView,
    TokenAPIViewSet,
    WebhookEntregaViewSet,
)

router = DefaultRouter()
router.register("integracoes", IntegracaoViewSet, basename="integracao")
router.register("integracoes-mapeamentos", MapeamentoCampoViewSet, basename="integracao-mapeamento")
router.register("integracoes-execucoes", SincronizacaoLogViewSet, basename="integracao-execucao")
router.register("integracoes-eventos", EventoIntegracaoViewSet, basename="integracao-evento")
router.register("integracoes-entregas", WebhookEntregaViewSet, basename="integracao-entrega")
router.register("credenciais-api", TokenAPIViewSet, basename="credencial-api")

# Atenção à ordem: as rotas explícitas que compartilham o prefixo "integracoes/"
# precisam ser declaradas ANTES do router. Caso contrário o padrão de detalhe do
# DefaultRouter (^integracoes/(?P<pk>[^/.]+)/$ e a variante com sufixo de formato)
# captura "integracoes/dataset/" e "integracoes/calendario.ics" como se fossem o
# identificador de uma integração, devolvendo 404.
urlpatterns = [
    path("integracoes/calendario.ics", FeedCalendarioView.as_view(), name="feed-calendario"),
    path("integracoes/dataset/", DatasetBIView.as_view(), name="dataset-bi"),
    path("integracoes-catalogo/", CatalogoIntegracoesView.as_view(), name="catalogo-integracoes"),
    path("integracoes-tipos/", TiposIntegracaoView.as_view(), name="tipos-integracao"),
    path("dashboard/integracoes/", PainelIntegracoesView.as_view(), name="painel-integracoes"),
    path("", include(router.urls)),
]

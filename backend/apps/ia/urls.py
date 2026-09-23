from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConfiguracaoIAView,
    ConversarView,
    ConversaViewSet,
    EstatisticasIAView,
    FerramentasView,
    MCPView,
    SugestoesView,
)

router = DefaultRouter()
router.register("ia/conversas", ConversaViewSet, basename="ia-conversa")

urlpatterns = [
    path("ia/conversar/", ConversarView.as_view(), name="ia-conversar"),
    path("ia/ferramentas/", FerramentasView.as_view(), name="ia-ferramentas"),
    path("ia/sugestoes/", SugestoesView.as_view(), name="ia-sugestoes"),
    path("ia/configuracao/", ConfiguracaoIAView.as_view(), name="ia-configuracao"),
    path("ia/estatisticas/", EstatisticasIAView.as_view(), name="ia-estatisticas"),
    path("ia/mcp/", MCPView.as_view(), name="ia-mcp"),
    path("", include(router.urls)),
]

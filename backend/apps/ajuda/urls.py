from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AjudaFeedbackViewSet, BuscaAjudaView, GuiaAjudaViewSet, ManualView

router = DefaultRouter()
router.register("ajuda", GuiaAjudaViewSet, basename="ajuda")
router.register("ajuda-avaliacoes", AjudaFeedbackViewSet, basename="ajuda-avaliacao")
router.register("ajuda-busca", BuscaAjudaView, basename="ajuda-busca")

# As rotas explícitas vêm ANTES do router: o padrão de detalhe
# (^ajuda/(?P<pk>[^/.]+)/$) capturaria "ajuda/manual/" como se "manual" fosse o
# identificador de um guia.
urlpatterns = [
    path("ajuda/manual/", ManualView.as_view(), name="ajuda-manual"),
    path("ajuda/manual/<str:arquivo>/", ManualView.as_view(), name="ajuda-manual-documento"),
    path("", include(router.urls)),
]

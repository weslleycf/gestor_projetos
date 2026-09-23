from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MensagemViewSet, SalaViewSet

router = DefaultRouter()
router.register("salas", SalaViewSet, basename="sala")
router.register("mensagens", MensagemViewSet, basename="mensagem")

urlpatterns = [path("", include(router.urls))]

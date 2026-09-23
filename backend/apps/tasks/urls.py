from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ChecklistItemViewSet,
    MinhasTarefasResumoView,
    TaskDependencyViewSet,
    TaskSkillRequirementViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register("tarefas", TaskViewSet, basename="tarefa")
router.register("dependencias", TaskDependencyViewSet, basename="dependencia")
router.register("checklist", ChecklistItemViewSet, basename="checklist")
router.register("requisitos-skill-tarefa", TaskSkillRequirementViewSet, basename="requisito-skill-tarefa")

urlpatterns = [
    path("", include(router.urls)),
    path("minhas-tarefas/", MinhasTarefasResumoView.as_view(), name="minhas-tarefas"),
]

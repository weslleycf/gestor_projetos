from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AllocationRecommendationViewSet,
    BusFactorAlertViewSet,
    BusFactorView,
    CapacidadeForecastView,
    DecayView,
    DevelopmentActionViewSet,
    DevelopmentPlanViewSet,
    EmployeeSkillViewSet,
    EmployeeTrainingViewSet,
    GapAnalysisView,
    InternalOpportunityViewSet,
    MatchingView,
    MentorshipViewSet,
    ModosAlocacaoView,
    OpportunityApplicationViewSet,
    PainelCapacidadesView,
    PerfilNivelViewSet,
    PosicaoChaveViewSet,
    ProjectSkillRequirementViewSet,
    SimulacaoWhatIfView,
    SkillAssessmentViewSet,
    SkillCategoryViewSet,
    SkillDemandForecastViewSet,
    SkillEvidenceViewSet,
    SkillHistoryViewSet,
    SkillViewSet,
    SuccessionPlanViewSet,
    SugestaoPromocaoViewSet,
    TrainingViewSet,
    TrilhasView,
)

router = DefaultRouter()
router.register("capacidades/categorias", SkillCategoryViewSet, basename="skill-categoria")
router.register("capacidades/skills", SkillViewSet, basename="skill")
router.register("capacidades/criterios-nivel", PerfilNivelViewSet, basename="perfil-nivel")
router.register("capacidades/perfis", EmployeeSkillViewSet, basename="employee-skill")
router.register("capacidades/avaliacoes", SkillAssessmentViewSet, basename="skill-assessment")
router.register("capacidades/evidencias", SkillEvidenceViewSet, basename="skill-evidence")
router.register("capacidades/historico", SkillHistoryViewSet, basename="skill-history")
router.register("capacidades/promocoes", SugestaoPromocaoViewSet, basename="sugestao-promocao")
router.register("capacidades/requisitos-projeto", ProjectSkillRequirementViewSet, basename="requisito-projeto")
router.register("capacidades/pdi", DevelopmentPlanViewSet, basename="development-plan")
router.register("capacidades/pdi-acoes", DevelopmentActionViewSet, basename="development-action")
router.register("capacidades/treinamentos", TrainingViewSet, basename="training")
router.register("capacidades/treinamentos-colaborador", EmployeeTrainingViewSet, basename="employee-training")
router.register("capacidades/mentorias", MentorshipViewSet, basename="mentorship")
router.register("capacidades/recomendacoes", AllocationRecommendationViewSet, basename="recomendacao")
router.register("capacidades/previsoes", SkillDemandForecastViewSet, basename="skill-forecast")
router.register("capacidades/bus-factor", BusFactorAlertViewSet, basename="bus-factor-alert")
router.register("capacidades/oportunidades", InternalOpportunityViewSet, basename="oportunidade")
router.register("capacidades/candidaturas", OpportunityApplicationViewSet, basename="candidatura")
router.register("capacidades/posicoes", PosicaoChaveViewSet, basename="posicao-chave")
router.register("capacidades/sucessao", SuccessionPlanViewSet, basename="sucessao")

urlpatterns = [
    path("", include(router.urls)),
    path("capacidades/matching/", MatchingView.as_view(), name="matching"),
    path("capacidades/simulacao/", SimulacaoWhatIfView.as_view(), name="simulacao-whatif"),
    path("capacidades/gap/", GapAnalysisView.as_view(), name="gap-analysis"),
    path("capacidades/forecast/", CapacidadeForecastView.as_view(), name="capacidade-forecast"),
    path("capacidades/bus-factor-detect/", BusFactorView.as_view(), name="bus-factor-view"),
    path("capacidades/painel/", PainelCapacidadesView.as_view(), name="painel-capacidades"),
    path("capacidades/decay/", DecayView.as_view(), name="decay"),
    path("capacidades/trilhas/", TrilhasView.as_view(), name="trilhas"),
    path("capacidades/modos-alocacao/", ModosAlocacaoView.as_view(), name="modos-alocacao"),
]

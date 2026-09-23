from django.contrib import admin

from .models import (
    AllocationRecommendation,
    BusFactorAlert,
    DevelopmentAction,
    DevelopmentPlan,
    EmployeeSkill,
    EmployeeTraining,
    InternalOpportunity,
    Mentorship,
    OpportunityApplication,
    PerfilNivel,
    PosicaoChave,
    ProjectSkillRequirement,
    Skill,
    SkillAssessment,
    SkillCategory,
    SkillDemandForecast,
    SkillEndorsement,
    SkillEvidence,
    SkillHistory,
    SuccessionPlan,
    SugestaoPromocao,
    Training,
)


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ("nome", "parent", "ordem", "cor")
    list_filter = ("parent",)
    search_fields = ("nome", "descricao")


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("nome", "categoria", "tipo", "status", "criticidade", "framework_origem",
                    "codigo_externo", "bus_factor", "nivel_medio")
    list_filter = ("tipo", "status", "criticidade", "categoria", "framework_origem")
    search_fields = ("nome", "descricao", "codigo_externo", "sinonimos")
    readonly_fields = ("criado_em", "atualizado_em")


@admin.register(PerfilNivel)
class PerfilNivelAdmin(admin.ModelAdmin):
    list_display = ("skill", "nivel", "nome", "xp_minimo", "meses_minimos",
                    "evidencias_minimas", "exige_banca", "exige_avaliacao_gestor")
    list_filter = ("nivel", "exige_banca")


class SkillAssessmentInline(admin.TabularInline):
    model = SkillAssessment
    extra = 0
    fields = ("tipo", "avaliador", "nivel_atribuido", "peso", "data", "comentario")


class SkillEvidenceInline(admin.TabularInline):
    model = SkillEvidence
    extra = 0
    fields = ("tipo", "descricao", "data", "valida", "validador")


class SkillEndorsementInline(admin.TabularInline):
    model = SkillEndorsement
    extra = 0
    fields = ("endorser", "nivel_sugerido", "comentario", "data")
    readonly_fields = ("data",)


@admin.register(EmployeeSkill)
class EmployeeSkillAdmin(admin.ModelAdmin):
    list_display = ("user", "skill", "nivel_atual", "nivel_validado", "nivel_desejado",
                    "nivel_consolidado", "xp_acumulado", "status", "visibilidade", "ultima_utilizacao")
    list_filter = ("status", "visibilidade", "nivel_atual", "destaque")
    search_fields = ("user__nome", "skill__nome")
    inlines = (SkillAssessmentInline, SkillEvidenceInline, SkillEndorsementInline)
    readonly_fields = ("nivel_consolidado", "criado_em", "atualizado_em")


@admin.register(SkillAssessment)
class SkillAssessmentAdmin(admin.ModelAdmin):
    list_display = ("employee_skill", "tipo", "avaliador", "nivel_atribuido", "peso", "data")
    list_filter = ("tipo", "data")
    search_fields = ("employee_skill__user__nome", "employee_skill__skill__nome")


@admin.register(SkillEvidence)
class SkillEvidenceAdmin(admin.ModelAdmin):
    list_display = ("employee_skill", "tipo", "descricao", "data", "valida", "validador")
    list_filter = ("tipo", "valida")
    search_fields = ("descricao", "employee_skill__user__nome")


@admin.register(SkillHistory)
class SkillHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee_skill", "data", "nivel_anterior", "nivel_novo", "xp_movimento", "origem")
    list_filter = ("origem",)
    date_hierarchy = "data"


@admin.register(SugestaoPromocao)
class SugestaoPromocaoAdmin(admin.ModelAdmin):
    list_display = ("employee_skill", "nivel_atual", "nivel_proposto", "status",
                    "validado_por", "criado_em", "validado_em")
    list_filter = ("status",)
    readonly_fields = ("criado_em", "validado_em")


@admin.register(ProjectSkillRequirement)
class ProjectSkillRequirementAdmin(admin.ModelAdmin):
    list_display = ("project", "skill", "nivel_minimo", "nivel_desejado", "quantidade",
                    "peso", "obrigatorio")
    list_filter = ("obrigatorio", "skill", "project")
    search_fields = ("project__nome", "skill__nome")


class DevelopmentActionInline(admin.TabularInline):
    model = DevelopmentAction
    extra = 0
    fields = ("tipo", "descricao", "skill", "nivel_alvo", "status",
              "prazo", "carga_horaria", "progresso")


@admin.register(DevelopmentPlan)
class DevelopmentPlanAdmin(admin.ModelAdmin):
    list_display = ("user", "titulo", "status", "progresso", "data_inicio", "data_fim",
                    "responsavel_acompanhamento")
    list_filter = ("status",)
    search_fields = ("titulo", "objetivo", "user__nome")
    inlines = (DevelopmentActionInline,)


@admin.register(DevelopmentAction)
class DevelopmentActionAdmin(admin.ModelAdmin):
    list_display = ("descricao", "plan", "tipo", "skill", "status", "prazo",
                    "carga_horaria", "progresso")
    list_filter = ("tipo", "status")
    search_fields = ("descricao", "plan__user__nome")


@admin.register(Training)
class TrainingAdmin(admin.ModelAdmin):
    list_display = ("nome", "skill", "tipo", "carga_horaria", "fornecedor",
                    "nivel_alvo", "xp_concedido", "certificacao", "ativo")
    list_filter = ("tipo", "certificacao", "ativo", "fornecedor")
    search_fields = ("nome", "fornecedor", "descricao")


@admin.register(EmployeeTraining)
class EmployeeTrainingAdmin(admin.ModelAdmin):
    list_display = ("user", "training", "status", "data_inscricao", "data_conclusao", "nota")
    list_filter = ("status", "training__certificacao")
    search_fields = ("user__nome", "training__nome")


@admin.register(Mentorship)
class MentorshipAdmin(admin.ModelAdmin):
    list_display = ("mentor", "mentee", "skill", "status", "data_inicio", "data_fim",
                    "horas_realizadas", "avaliacao")
    list_filter = ("status", "frequencia")
    search_fields = ("mentor__nome", "mentee__nome", "skill__nome", "objetivo")


@admin.register(AllocationRecommendation)
class AllocationRecommendationAdmin(admin.ModelAdmin):
    list_display = ("task", "user", "score", "posicao", "modo", "status", "criado_em")
    list_filter = ("modo", "status")
    search_fields = ("task__nome", "user__nome")
    readonly_fields = ("criado_em", "decidido_em", "justificativa", "pesos", "penalidades")


@admin.register(SkillDemandForecast)
class SkillDemandForecastAdmin(admin.ModelAdmin):
    list_display = ("skill", "periodo", "demanda_estimada", "oferta_estimada", "gap", "situacao")
    list_filter = ("periodo", "skill")
    search_fields = ("skill__nome",)

    @admin.display(description="Situação")
    def situacao(self, obj):
        return obj.situacao


@admin.register(BusFactorAlert)
class BusFactorAlertAdmin(admin.ModelAdmin):
    list_display = ("skill", "quantidade_detentores", "total_projetos_dependentes",
                    "criticidade", "resolvido", "detectado_em")
    list_filter = ("criticidade", "resolvido")
    search_fields = ("skill__nome", "recomendacao")
    readonly_fields = ("detectado_em",)


@admin.register(InternalOpportunity)
class InternalOpportunityAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "nivel_minimo", "vagas", "carga_horaria",
                    "data_abertura", "data_limite", "ativa")
    list_filter = ("tipo", "ativa")
    search_fields = ("titulo", "descricao")
    filter_horizontal = ("skills_requeridas",)


@admin.register(OpportunityApplication)
class OpportunityApplicationAdmin(admin.ModelAdmin):
    list_display = ("opportunity", "user", "status", "aderencia", "criado_em")
    list_filter = ("status",)
    search_fields = ("opportunity__titulo", "user__nome")


@admin.register(PosicaoChave)
class PosicaoChaveAdmin(admin.ModelAdmin):
    list_display = ("titulo", "area", "ocupante", "gestor", "criticidade", "risco_sucessao")
    list_filter = ("criticidade", "risco_sucessao", "area")
    search_fields = ("titulo", "observacao")
    filter_horizontal = ("skills_criticas",)


@admin.register(SuccessionPlan)
class SuccessionPlanAdmin(admin.ModelAdmin):
    list_display = ("posicao", "sucessor", "prontidao", "aderencia", "prioridade")
    list_filter = ("prontidao",)
    search_fields = ("posicao__titulo", "sucessor__nome")

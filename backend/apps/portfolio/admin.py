from django.contrib import admin

from .models import (
    Baseline,
    CampoCustomizado,
    KPI,
    LicaoAprendida,
    Milestone,
    Portfolio,
    Program,
    Project,
    ValorCampoCustomizado,
    Workflow,
    WorkflowState,
    WorkflowTransition,
)


class MilestoneInline(admin.TabularInline):
    model = Milestone
    extra = 0
    fields = ("nome", "data_prevista", "data_real", "status", "critico", "responsavel")


@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ("nome", "responsavel", "status", "orcamento_anual", "criado_em")
    list_filter = ("status",)
    search_fields = ("nome", "descricao")


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ("nome", "portfolio", "gerente", "status", "data_inicio", "data_fim")
    list_filter = ("status", "portfolio")
    search_fields = ("nome", "descricao")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nome", "status", "saude", "prioridade", "manager",
                    "percentual_conclusao", "data_inicio", "data_fim", "orcamento")
    list_filter = ("status", "saude", "prioridade", "criticidade", "area", "portfolio", "arquivado")
    search_fields = ("codigo", "nome", "descricao", "objetivo")
    date_hierarchy = "data_inicio"
    inlines = (MilestoneInline,)
    fieldsets = (
        ("Identificação", {"fields": ("codigo", "nome", "descricao", "objetivo", "icone", "cor", "tags")}),
        ("Estrutura", {"fields": ("portfolio", "program", "projeto_pai", "sponsor", "manager")}),
        ("Classificação", {"fields": ("status", "prioridade", "saude", "criticidade", "categoria", "area")}),
        ("Prazos e progresso", {"fields": ("data_inicio", "data_fim", "data_inicio_real", "data_fim_real",
                                           "percentual_conclusao", "progresso_manual", "esforco_estimado_horas")}),
        ("Financeiro", {"fields": ("orcamento", "orcamento_capex", "orcamento_opex", "custo_real", "receita_prevista")}),
        ("Encerramento", {"fields": ("arquivado", "licoes_aprendidas")}),
    )
    readonly_fields = ("codigo", "custo_real")


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ("nome", "project", "data_prevista", "data_real", "status", "critico")
    list_filter = ("status", "critico")
    search_fields = ("nome", "descricao")


@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ("nome", "project", "valor_meta", "valor_atual", "unidade", "data_referencia")
    list_filter = ("project",)


@admin.register(Baseline)
class BaselineAdmin(admin.ModelAdmin):
    list_display = ("project", "versao", "nome", "data_inicio", "data_fim", "ativa", "criado_em")
    list_filter = ("ativa", "project")


@admin.register(LicaoAprendida)
class LicaoAprendidaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "project", "categoria", "impacto", "autor")
    list_filter = ("categoria", "impacto")
    search_fields = ("titulo", "contexto", "recomendacao")


class WorkflowStateInline(admin.TabularInline):
    model = WorkflowState
    extra = 0
    fields = ("ordem", "nome", "chave", "cor", "wip_limit", "is_inicial", "is_final")


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ("nome", "entidade", "is_padrao")
    list_filter = ("entidade", "is_padrao")
    inlines = (WorkflowStateInline,)


@admin.register(WorkflowState)
class WorkflowStateAdmin(admin.ModelAdmin):
    list_display = ("nome", "workflow", "ordem", "wip_limit", "is_inicial", "is_final")
    list_filter = ("workflow",)


@admin.register(WorkflowTransition)
class WorkflowTransitionAdmin(admin.ModelAdmin):
    list_display = ("workflow", "de", "para", "requer_aprovacao")
    list_filter = ("workflow", "requer_aprovacao")


@admin.register(CampoCustomizado)
class CampoCustomizadoAdmin(admin.ModelAdmin):
    list_display = ("entidade", "secao", "ordem", "nome", "chave", "tipo", "largura", "obrigatorio", "ativo")
    list_filter = ("entidade", "tipo", "ativo", "secao")
    search_fields = ("nome", "chave")


admin.site.register(ValorCampoCustomizado)

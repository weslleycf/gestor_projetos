from django.contrib import admin

from .models import Issue, Risk, RiskHistory


class RiskHistoryInline(admin.TabularInline):
    model = RiskHistory
    extra = 0
    fields = ("criado_em", "probabilidade", "impacto", "severidade", "status", "comentario")
    readonly_fields = ("criado_em",)


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = ("codigo", "descricao_curta", "project", "categoria", "probabilidade", "impacto",
                    "severidade", "nivel", "estrategia", "status", "responsavel")
    list_filter = ("nivel", "categoria", "estrategia", "status", "project")
    search_fields = ("codigo", "descricao", "causa", "efeito", "plano_resposta")
    inlines = (RiskHistoryInline,)
    readonly_fields = ("codigo", "severidade", "nivel", "cor", "severidade_residual")
    fieldsets = (
        ("Identificação", {"fields": ("project", "codigo", "descricao", "causa", "efeito", "categoria", "tags")}),
        ("Análise", {"fields": ("probabilidade", "impacto", "severidade", "nivel", "cor")}),
        ("Risco residual", {"fields": ("prob_residual", "imp_residual", "severidade_residual")}),
        ("Resposta", {"fields": ("estrategia", "plano_resposta", "contingencia", "responsavel",
                                 "status", "data_limite", "custo_mitigacao", "valor_monetario_esperado")}),
        ("Monitoramento", {"fields": ("data_identificacao", "data_encerramento", "gatilhos",
                                      "posicao_matriz_x", "posicao_matriz_y")}),
    )

    @admin.display(description="Descrição")
    def descricao_curta(self, obj):
        return obj.descricao[:70]


@admin.register(RiskHistory)
class RiskHistoryAdmin(admin.ModelAdmin):
    list_display = ("risk", "criado_em", "probabilidade", "impacto", "severidade", "status")
    list_filter = ("status",)
    date_hierarchy = "criado_em"


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ("codigo", "titulo", "project", "tipo", "prioridade", "status",
                    "responsavel", "data_abertura", "data_limite", "idade_dias")
    list_filter = ("tipo", "status", "prioridade", "project")
    search_fields = ("codigo", "titulo", "descricao")
    date_hierarchy = "data_abertura"
    readonly_fields = ("codigo", "idade_dias")

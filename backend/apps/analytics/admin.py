from django.contrib import admin

from .models import AuditoriaVies, PrevisaoProjeto


@admin.register(PrevisaoProjeto)
class PrevisaoProjetoAdmin(admin.ModelAdmin):
    list_display = (
        "project", "data_referencia", "metodo", "prazo_p50", "dias_desvio_p50",
        "probabilidade_atraso", "custo_p50", "probabilidade_estouro", "indice_confianca",
    )
    list_filter = ("metodo", "data_referencia")
    search_fields = ("project__nome", "project__codigo")
    date_hierarchy = "data_referencia"
    readonly_fields = ("criado_em",)


@admin.register(AuditoriaVies)
class AuditoriaViesAdmin(admin.ModelAdmin):
    list_display = (
        "periodo_inicio", "periodo_fim", "metrica", "grupo", "tamanho_grupo",
        "valor_grupo", "valor_referencia", "disparidade", "severidade",
    )
    list_filter = ("metrica", "severidade", "periodo_inicio")
    search_fields = ("grupo", "recomendacao")
    date_hierarchy = "periodo_inicio"
    readonly_fields = ("criado_em",)

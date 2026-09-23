from django.contrib import admin

from .models import AjudaFeedback, GuiaAjuda


@admin.register(GuiaAjuda)
class GuiaAjudaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "grupo", "rota", "ordem", "ativo", "visualizacoes",
                    "percentual_util", "tamanho", "atualizado_em")
    list_filter = ("grupo", "ativo")
    search_fields = ("titulo", "rota", "resumo", "para_que_serve")
    ordering = ("grupo", "ordem")
    readonly_fields = ("visualizacoes", "marcado_util", "marcado_inutil", "criado_em", "atualizado_em")
    fieldsets = (
        ("Identificação", {"fields": ("rota", "titulo", "grupo", "icone", "ordem", "ativo")}),
        ("Conteúdo", {"fields": ("resumo", "para_que_serve", "quando_usar")}),
        ("Passo a passo", {"fields": ("passos",)}),
        ("Referência", {"fields": ("elementos", "campos", "indicadores")}),
        ("Orientação", {"fields": ("dicas", "limitacoes", "atalhos")}),
        ("Ligações", {"fields": ("doc", "permissoes")}),
        ("Uso", {"fields": ("visualizacoes", "marcado_util", "marcado_inutil", "criado_em", "atualizado_em")}),
    )


@admin.register(AjudaFeedback)
class AjudaFeedbackAdmin(admin.ModelAdmin):
    list_display = ("guia", "user", "util", "criado_em")
    list_filter = ("util", "guia")
    search_fields = ("guia__titulo", "user__nome", "comentario")

    def has_add_permission(self, request):
        return False

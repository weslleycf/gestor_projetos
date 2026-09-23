from django.contrib import admin

from .models import Mensagem, Sala


class MensagemInline(admin.TabularInline):
    model = Mensagem
    extra = 0
    fields = ("criado_em", "autor", "texto")
    readonly_fields = ("criado_em",)


@admin.register(Sala)
class SalaAdmin(admin.ModelAdmin):
    list_display = ("nome", "tipo", "project", "arquivada", "criado_em")
    list_filter = ("tipo", "arquivada")
    search_fields = ("nome", "descricao")
    filter_horizontal = ("participantes",)
    inlines = (MensagemInline,)


@admin.register(Mensagem)
class MensagemAdmin(admin.ModelAdmin):
    list_display = ("sala", "autor", "texto_curto", "criado_em", "editada")
    list_filter = ("sala",)
    search_fields = ("texto", "autor__nome")
    date_hierarchy = "criado_em"

    @admin.display(description="Mensagem")
    def texto_curto(self, obj):
        return obj.texto[:70]

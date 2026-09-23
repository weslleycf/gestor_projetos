from django.contrib import admin

from .models import Lancamento, Orcamento, PrevisaoFluxoCaixa


class LancamentoInline(admin.TabularInline):
    model = Lancamento
    extra = 0
    fields = ("data_competencia", "descricao", "tipo", "valor", "status", "fornecedor")


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = ("project", "categoria", "tipo", "valor_planejado", "valor_realizado",
                    "valor_comprometido", "consumo_percentual")
    list_filter = ("tipo", "project")
    search_fields = ("categoria", "centro_custo", "project__nome")
    inlines = (LancamentoInline,)


@admin.register(Lancamento)
class LancamentoAdmin(admin.ModelAdmin):
    list_display = ("data_competencia", "descricao", "tipo", "valor", "status",
                    "project", "fornecedor", "documento")
    list_filter = ("tipo", "status", "categoria", "project")
    search_fields = ("descricao", "fornecedor", "documento", "centro_custo")
    date_hierarchy = "data_competencia"


@admin.register(PrevisaoFluxoCaixa)
class PrevisaoFluxoCaixaAdmin(admin.ModelAdmin):
    list_display = ("project", "periodo", "entradas_previstas", "saidas_previstas", "metodo")
    list_filter = ("metodo", "project")

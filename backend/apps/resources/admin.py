from django.contrib import admin

from .models import Alocacao, CapacidadeSemanal, Recurso, Timesheet


@admin.register(Recurso)
class RecursoAdmin(admin.ModelAdmin):
    list_display = ("nome", "tipo", "fornecedor", "custo_hora", "quantidade_disponivel",
                    "disponibilidade_percentual", "ativo")
    list_filter = ("tipo", "ativo", "fornecedor")
    search_fields = ("nome", "descricao", "codigo", "fornecedor")


@admin.register(Alocacao)
class AlocacaoAdmin(admin.ModelAdmin):
    list_display = ("user", "recurso", "project", "task", "percentual", "data_inicio", "data_fim",
                    "status", "modalidade", "override_manual")
    list_filter = ("status", "modalidade", "override_manual", "project")
    search_fields = ("user__nome", "recurso__nome", "task__nome", "project__nome")
    date_hierarchy = "data_inicio"
    autocomplete_fields = ("project",)


@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    list_display = ("user", "data", "horas", "project", "task", "atividade", "aprovado", "aprovador")
    list_filter = ("aprovado", "atividade", "project")
    search_fields = ("user__nome", "descricao", "task__nome")
    date_hierarchy = "data"


@admin.register(CapacidadeSemanal)
class CapacidadeSemanalAdmin(admin.ModelAdmin):
    list_display = ("user", "semana_inicio", "horas_disponiveis", "motivo")
    list_filter = ("motivo",)
    search_fields = ("user__nome",)

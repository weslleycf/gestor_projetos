from django.contrib import admin

from .models import ChecklistItem, Task, TaskDependency, TaskSkillRequirement


class ChecklistInline(admin.TabularInline):
    model = ChecklistItem
    extra = 0
    fields = ("ordem", "texto", "concluido", "responsavel")


class RequisitoSkillInline(admin.TabularInline):
    model = TaskSkillRequirement
    extra = 0
    fields = ("skill", "nivel_minimo", "peso", "obrigatorio")


class SubtarefaInline(admin.TabularInline):
    model = Task
    fk_name = "parent"
    extra = 0
    fields = ("nome", "status", "responsavel", "data_inicio", "data_fim", "percentual_conclusao")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("nome", "project", "status", "prioridade", "responsavel",
                    "data_inicio", "data_fim", "percentual_conclusao", "critica", "folga_dias")
    list_filter = ("status", "prioridade", "critica", "is_marco", "project")
    search_fields = ("nome", "descricao", "wbs")
    date_hierarchy = "data_inicio"
    inlines = (ChecklistInline, RequisitoSkillInline, SubtarefaInline)
    readonly_fields = ("critica", "folga_dias", "criado_em", "atualizado_em")
    fieldsets = (
        ("Identificação", {"fields": ("project", "parent", "nome", "descricao", "wbs", "nivel")}),
        ("Responsabilidade", {"fields": ("responsavel", "responsaveis_auxiliares")}),
        ("Cronograma", {"fields": ("data_inicio", "data_fim", "data_inicio_real", "data_fim_real",
                                   "esforco_estimado", "esforco_real", "is_marco", "restricao")}),
        ("Execução", {"fields": ("status", "prioridade", "percentual_conclusao", "posicao_visual", "ordem")}),
        ("Caminho crítico", {"fields": ("critica", "folga_dias")}),
        ("Visual", {"fields": ("cor", "icone", "tags", "colapsada")}),
    )


@admin.register(TaskDependency)
class TaskDependencyAdmin(admin.ModelAdmin):
    list_display = ("predecessor", "tipo", "successor", "lag", "obrigatoria")
    list_filter = ("tipo", "obrigatoria")
    search_fields = ("predecessor__nome", "successor__nome")


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ("texto", "task", "concluido", "ordem", "responsavel")
    list_filter = ("concluido",)


@admin.register(TaskSkillRequirement)
class TaskSkillRequirementAdmin(admin.ModelAdmin):
    list_display = ("task", "skill", "nivel_minimo", "peso", "obrigatorio")
    list_filter = ("obrigatorio", "skill")

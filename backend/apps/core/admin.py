from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    Anexo,
    ApiToken,
    Atividade,
    AuditLog,
    Comentario,
    CustomReport,
    DashboardLayout,
    Notificacao,
    RegraNotificacao,
    Role,
    SavedFilter,
    User,
    UserRole,
    UserViewPreference,
    Webhook,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("nome", "email", "perfil", "cargo", "area", "ativo", "is_staff")
    list_filter = ("perfil", "ativo", "area", "is_staff")
    search_fields = ("nome", "email", "cargo")
    ordering = ("nome",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identidade", {"fields": ("nome", "perfil", "ativo", "avatar", "avatar_url", "cor", "icone")}),
        ("Organização", {"fields": ("cargo", "area", "localizacao", "gestor", "data_admissao")}),
        ("Capacidade", {"fields": ("custo_hora", "capacidade_semanal_horas", "custo_hora_visivel")}),
        ("Preferências", {"fields": ("tema", "paleta", "tema_custom", "densidade", "idioma",
                                     "aceita_recomendacoes", "disponivel_para_mentoria")}),
        ("Permissões", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "nome", "perfil", "password1", "password2")}),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("nome", "is_sistema")
    search_fields = ("nome",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "user_nome", "acao", "entidade", "entidade_id")
    list_filter = ("acao", "entidade")
    search_fields = ("user_nome", "entidade", "justificativa")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register([UserRole, Notificacao, RegraNotificacao, Atividade, UserViewPreference,
                     DashboardLayout, SavedFilter, CustomReport, ApiToken, Webhook, Anexo, Comentario])
admin.site.site_header = "SGP — Administração"
admin.site.site_title = "SGP"
admin.site.index_title = "Gestão de Projetos, Portfólio e Capacidades"

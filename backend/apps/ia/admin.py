from django.contrib import admin

from .models import ConversaIA, MensagemIA


class MensagemInline(admin.TabularInline):
    model = MensagemIA
    extra = 0
    fields = ("papel", "texto", "ferramentas", "provedor", "duracao_ms", "util", "criado_em")
    readonly_fields = ("criado_em",)


@admin.register(ConversaIA)
class ConversaIAAdmin(admin.ModelAdmin):
    list_display = ("titulo", "user", "total_mensagens", "criado_em", "atualizado_em")
    list_filter = ("criado_em",)
    search_fields = ("titulo", "user__nome", "user__email")
    inlines = (MensagemInline,)
    date_hierarchy = "criado_em"


@admin.register(MensagemIA)
class MensagemIAAdmin(admin.ModelAdmin):
    list_display = ("conversa", "papel", "provedor", "duracao_ms", "util", "criado_em")
    list_filter = ("papel", "provedor", "util")
    search_fields = ("texto", "conversa__titulo")
    date_hierarchy = "criado_em"

    def has_add_permission(self, request):
        return False

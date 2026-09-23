from django.contrib import admin

from .models import (
    EventoIntegracao,
    Integracao,
    MapeamentoCampo,
    SincronizacaoLog,
    TokenAPI,
    WebhookEntrega,
)


class MapeamentoInline(admin.TabularInline):
    model = MapeamentoCampo
    extra = 0
    fields = ("ordem", "campo_origem", "campo_destino", "transformacao", "obrigatorio", "valor_padrao")


@admin.register(Integracao)
class IntegracaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "tipo", "direcao", "ativa", "status", "modo_simulacao",
                    "taxa_sucesso", "ultima_sincronizacao", "responsavel")
    list_filter = ("tipo", "direcao", "ativa", "status", "modo_simulacao")
    search_fields = ("nome", "descricao", "url_base")
    inlines = (MapeamentoInline,)
    readonly_fields = ("status", "ultima_sincronizacao", "ultimo_erro", "total_execucoes",
                       "total_sucesso", "total_falha", "itens_sincronizados", "criado_em", "atualizado_em")
    fieldsets = (
        ("Identificação", {"fields": ("nome", "tipo", "direcao", "descricao", "cor", "icone")}),
        ("Conexão", {"fields": ("url_base", "autenticacao", "credenciais", "cabecalhos",
                                "modo_simulacao", "responsavel")}),
        ("Seleção de dados", {"fields": ("entidade_alvo", "filtros")}),
        ("Agendamento", {"fields": ("ativa", "frequencia_minutos", "proxima_sincronizacao")}),
        ("Situação", {"fields": ("status", "ultima_sincronizacao", "ultimo_erro", "total_execucoes",
                                 "total_sucesso", "total_falha", "itens_sincronizados")}),
    )


@admin.register(SincronizacaoLog)
class SincronizacaoLogAdmin(admin.ModelAdmin):
    list_display = ("integracao", "inicio", "operacao", "status", "itens_lidos",
                    "itens_criados", "itens_atualizados", "itens_com_erro", "duracao_ms")
    list_filter = ("status", "operacao", "integracao")
    search_fields = ("mensagem", "integracao__nome")
    date_hierarchy = "inicio"

    def has_add_permission(self, request):
        return False


@admin.register(EventoIntegracao)
class EventoIntegracaoAdmin(admin.ModelAdmin):
    list_display = ("tipo", "titulo", "entidade", "processado", "tentativas", "entregas_ok", "ocorrido_em")
    list_filter = ("tipo", "processado")
    search_fields = ("titulo", "entidade", "entidade_id")
    date_hierarchy = "ocorrido_em"

    def has_add_permission(self, request):
        return False


@admin.register(WebhookEntrega)
class WebhookEntregaAdmin(admin.ModelAdmin):
    list_display = ("webhook", "evento", "tentativa", "status_code", "sucesso", "duracao_ms", "criado_em")
    list_filter = ("sucesso", "webhook", "status_code")
    date_hierarchy = "criado_em"

    def has_add_permission(self, request):
        return False


@admin.register(TokenAPI)
class TokenAPIAdmin(admin.ModelAdmin):
    list_display = ("nome", "user", "ativo", "expirado", "total_chamadas", "ultimo_uso", "criado_em")
    list_filter = ("ativo",)
    search_fields = ("nome", "user__nome", "user__email")
    readonly_fields = ("token", "ultimo_uso", "total_chamadas", "criado_em")


admin.site.register(MapeamentoCampo)

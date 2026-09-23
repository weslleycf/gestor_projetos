"""Serializers das integrações."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.serializers import UserResumoSerializer

from .models import (
    EventoIntegracao,
    Integracao,
    MapeamentoCampo,
    SincronizacaoLog,
    TokenAPI,
    WebhookEntrega,
)


class MapeamentoCampoSerializer(serializers.ModelSerializer):
    transformacao_rotulo = serializers.CharField(source="get_transformacao_display", read_only=True)

    class Meta:
        model = MapeamentoCampo
        fields = "__all__"


class IntegracaoSerializer(serializers.ModelSerializer):
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    direcao_rotulo = serializers.CharField(source="get_direcao_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    autenticacao_rotulo = serializers.CharField(source="get_autenticacao_display", read_only=True)
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    mapeamentos = MapeamentoCampoSerializer(many=True, read_only=True)
    taxa_sucesso = serializers.FloatField(read_only=True)
    saudavel = serializers.BooleanField(read_only=True)
    credenciais_mascaradas = serializers.SerializerMethodField()

    class Meta:
        model = Integracao
        fields = "__all__"
        read_only_fields = (
            "status", "ultima_sincronizacao", "ultimo_erro", "total_execucoes",
            "total_sucesso", "total_falha", "itens_sincronizados", "criado_em", "atualizado_em",
        )
        extra_kwargs = {"credenciais": {"write_only": True}}

    def get_credenciais_mascaradas(self, obj) -> dict:
        return obj.mascarar_credenciais()


class SincronizacaoLogSerializer(serializers.ModelSerializer):
    integracao_nome = serializers.CharField(source="integracao.nome", read_only=True)
    integracao_tipo = serializers.CharField(source="integracao.get_tipo_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    disparado_por_nome = serializers.CharField(source="disparado_por.nome", read_only=True, default="")
    total_processado = serializers.IntegerField(read_only=True)
    duracao_segundos = serializers.FloatField(read_only=True)

    class Meta:
        model = SincronizacaoLog
        fields = "__all__"


class EventoIntegracaoSerializer(serializers.ModelSerializer):
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = EventoIntegracao
        fields = "__all__"


class WebhookEntregaSerializer(serializers.ModelSerializer):
    webhook_nome = serializers.CharField(source="webhook.nome", read_only=True)
    evento_tipo = serializers.CharField(source="evento.tipo", read_only=True)

    class Meta:
        model = WebhookEntrega
        fields = "__all__"


class TokenAPISerializer(serializers.ModelSerializer):
    """Credencial de API.

    O titular é sempre o usuário autenticado que criou a credencial — o campo
    é somente leitura para que ninguém possa emitir um token em nome de outra
    pessoa. A view injeta o usuário no momento de salvar.
    """

    expirado = serializers.BooleanField(read_only=True)
    user_nome = serializers.CharField(source="user.nome", read_only=True)

    class Meta:
        model = TokenAPI
        fields = "__all__"
        read_only_fields = ("user", "token", "ultimo_uso", "total_chamadas", "criado_em")

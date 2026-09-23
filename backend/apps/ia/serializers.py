"""Serializers do assistente."""
from __future__ import annotations

from rest_framework import serializers

from .models import ConversaIA, MensagemIA


class MensagemIASerializer(serializers.ModelSerializer):
    papel_rotulo = serializers.CharField(source="get_papel_display", read_only=True)

    class Meta:
        model = MensagemIA
        fields = (
            "id", "papel", "papel_rotulo", "texto", "ferramentas", "fontes",
            "provedor", "modelo", "duracao_ms", "util", "comentario", "criado_em",
        )


class ConversaIASerializer(serializers.ModelSerializer):
    total_mensagens = serializers.IntegerField(read_only=True)

    class Meta:
        model = ConversaIA
        fields = ("id", "titulo", "total_mensagens", "criado_em", "atualizado_em")

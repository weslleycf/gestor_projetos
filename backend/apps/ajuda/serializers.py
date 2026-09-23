"""Serializers da central de ajuda."""
from __future__ import annotations

from rest_framework import serializers

from .models import AjudaFeedback, GuiaAjuda


class GuiaAjudaSerializer(serializers.ModelSerializer):
    total_avaliacoes = serializers.IntegerField(read_only=True)
    percentual_util = serializers.FloatField(read_only=True)

    class Meta:
        model = GuiaAjuda
        fields = (
            "id", "rota", "titulo", "grupo", "icone", "resumo", "para_que_serve",
            "quando_usar", "passos", "elementos", "campos", "indicadores", "dicas",
            "limitacoes", "atalhos", "doc", "permissoes", "ordem", "ativo",
            "visualizacoes", "marcado_util", "marcado_inutil", "total_avaliacoes",
            "percentual_util", "atualizado_em",
        )
        read_only_fields = ("visualizacoes", "marcado_util", "marcado_inutil", "atualizado_em")


class GuiaAjudaResumoSerializer(serializers.ModelSerializer):
    """Versão leve usada na lista da central de ajuda e na busca global.

    Traz o suficiente para montar o cartão: além do texto, as contagens que
    aparecem como selo (passos, limitações), o número de consultas e a avaliação.
    Sem elas os selos do cartão ficavam sempre vazios, porque o conteúdo pesado
    (passo a passo, campos, indicadores) só vem no guia individual.
    """

    total_passos = serializers.SerializerMethodField()
    total_limitacoes = serializers.SerializerMethodField()
    total_avaliacoes = serializers.IntegerField(read_only=True)
    percentual_util = serializers.FloatField(read_only=True)

    class Meta:
        model = GuiaAjuda
        fields = (
            "id", "rota", "titulo", "grupo", "icone", "resumo", "doc", "permissoes",
            "ordem", "visualizacoes", "total_passos", "total_limitacoes",
            "total_avaliacoes", "percentual_util",
        )

    def get_total_passos(self, obj) -> int:
        return len(obj.passos or [])

    def get_total_limitacoes(self, obj) -> int:
        return len(obj.limitacoes or [])


class AjudaFeedbackSerializer(serializers.ModelSerializer):
    user_nome = serializers.CharField(source="user.nome", read_only=True)
    guia_titulo = serializers.CharField(source="guia.titulo", read_only=True)

    class Meta:
        model = AjudaFeedback
        fields = ("id", "guia", "guia_titulo", "user", "user_nome", "util", "comentario", "criado_em")
        read_only_fields = ("user", "criado_em")

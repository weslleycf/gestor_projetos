"""Serializers financeiros."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.serializers import UserResumoSerializer

from .models import Lancamento, Orcamento, PrevisaoFluxoCaixa


class OrcamentoSerializer(serializers.ModelSerializer):
    project_nome = serializers.CharField(source="project.nome", read_only=True)
    saldo = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    consumo_percentual = serializers.FloatField(read_only=True)
    situacao = serializers.CharField(read_only=True)

    class Meta:
        model = Orcamento
        fields = "__all__"
        read_only_fields = ("criado_em",)


class LancamentoSerializer(serializers.ModelSerializer):
    project_nome = serializers.CharField(source="project.nome", read_only=True)
    project_cor = serializers.CharField(source="project.cor", read_only=True)
    orcamento_categoria = serializers.CharField(source="orcamento.categoria", read_only=True, default="")
    criado_por_nome = serializers.CharField(source="criado_por.nome", read_only=True, default="")
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Lancamento
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em")

    def validate_valor(self, valor):
        if valor == 0:
            raise serializers.ValidationError("O valor deve ser diferente de zero.")
        return valor


class PrevisaoFluxoCaixaSerializer(serializers.ModelSerializer):
    saldo_previsto = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = PrevisaoFluxoCaixa
        fields = "__all__"
        read_only_fields = ("criado_em",)

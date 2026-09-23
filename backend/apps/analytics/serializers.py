"""Serializers dos resultados analíticos persistidos (previsões e auditorias de viés)."""
from __future__ import annotations

from rest_framework import serializers

from .models import AuditoriaVies, PrevisaoProjeto


def _validar_probabilidade(valor):
    """Garante que probabilidades e índices permaneçam no intervalo de 0 a 1."""
    if valor is None or 0 <= valor <= 1:
        return valor
    raise serializers.ValidationError("O valor deve estar entre 0 e 1.")


class PrevisaoProjetoSerializer(serializers.ModelSerializer):
    """Previsão persistida de prazo e custo, com leitura executiva do risco."""

    project_nome = serializers.CharField(source="project.nome", read_only=True)
    project_codigo = serializers.CharField(source="project.codigo", read_only=True)
    project_cor = serializers.CharField(source="project.cor", read_only=True)
    metodo_rotulo = serializers.CharField(source="get_metodo_display", read_only=True)
    criado_por_nome = serializers.CharField(source="criado_por.nome", read_only=True, default="")
    nivel_risco = serializers.CharField(read_only=True)
    faixa_prazo_dias = serializers.IntegerField(read_only=True)

    class Meta:
        model = PrevisaoProjeto
        fields = "__all__"
        read_only_fields = ("criado_em", "criado_por")

    def validate_probabilidade_atraso(self, valor):
        return _validar_probabilidade(valor)

    def validate_probabilidade_estouro(self, valor):
        return _validar_probabilidade(valor)

    def validate_indice_confianca(self, valor):
        return _validar_probabilidade(valor)


class AuditoriaViesSerializer(serializers.ModelSerializer):
    """Resultado persistido da auditoria de imparcialidade das recomendações."""

    metrica_rotulo = serializers.CharField(source="get_metrica_display", read_only=True)
    severidade_rotulo = serializers.CharField(source="get_severidade_display", read_only=True)
    disparidade_percentual = serializers.FloatField(read_only=True)

    class Meta:
        model = AuditoriaVies
        fields = "__all__"
        read_only_fields = ("criado_em",)

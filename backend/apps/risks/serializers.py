"""Serializers de riscos e issues."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.serializers import UserResumoSerializer

from .models import Issue, Risk, RiskHistory


class RiskSerializer(serializers.ModelSerializer):
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    project_nome = serializers.CharField(source="project.nome", read_only=True)
    project_cor = serializers.CharField(source="project.cor", read_only=True)
    nivel_rotulo = serializers.SerializerMethodField()
    categoria_rotulo = serializers.CharField(source="get_categoria_display", read_only=True)
    estrategia_rotulo = serializers.CharField(source="get_estrategia_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    exposicao = serializers.FloatField(read_only=True)
    atrasado = serializers.BooleanField(read_only=True)
    reducao_severidade = serializers.IntegerField(read_only=True)

    class Meta:
        model = Risk
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em", "severidade", "nivel", "cor", "codigo")

    def get_nivel_rotulo(self, obj) -> str:
        from .models import classificar_severidade

        return classificar_severidade(obj.severidade)[1]

    def validate(self, attrs):
        prob = attrs.get("probabilidade", getattr(self.instance, "probabilidade", 3))
        imp = attrs.get("impacto", getattr(self.instance, "impacto", 3))
        if not (1 <= prob <= 5) or not (1 <= imp <= 5):
            raise serializers.ValidationError("Probabilidade e impacto devem estar entre 1 e 5.")
        return attrs


class RiskHistorySerializer(serializers.ModelSerializer):
    registrado_por_nome = serializers.CharField(source="registrado_por.nome", read_only=True, default="")

    class Meta:
        model = RiskHistory
        fields = "__all__"
        read_only_fields = ("criado_em",)


class IssueSerializer(serializers.ModelSerializer):
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    reportado_por_nome = serializers.CharField(source="reportado_por.nome", read_only=True, default="")
    project_nome = serializers.CharField(source="project.nome", read_only=True)
    project_cor = serializers.CharField(source="project.cor", read_only=True)
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    prioridade_rotulo = serializers.CharField(source="get_prioridade_display", read_only=True)
    idade_dias = serializers.IntegerField(read_only=True)
    atrasada = serializers.BooleanField(read_only=True)

    class Meta:
        model = Issue
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em", "codigo")

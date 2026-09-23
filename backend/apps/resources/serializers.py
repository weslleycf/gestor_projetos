"""Serializers de recursos, alocação e timesheet."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.serializers import UserResumoSerializer
from apps.tasks.serializers import TaskListSerializer

from .models import Alocacao, CapacidadeSemanal, Recurso, Timesheet


class RecursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recurso
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em")


class AlocacaoSerializer(serializers.ModelSerializer):
    user_detalhe = UserResumoSerializer(source="user", read_only=True)
    recurso_nome = serializers.CharField(source="recurso.nome", read_only=True, default="")
    recurso_cor = serializers.CharField(source="recurso.cor", read_only=True, default="")
    recurso_icone = serializers.CharField(source="recurso.icone", read_only=True, default="")
    project_nome = serializers.CharField(source="project.nome", read_only=True)
    project_cor = serializers.CharField(source="project.cor", read_only=True)
    task_nome = serializers.CharField(source="task.nome", read_only=True, default="")
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    modalidade_rotulo = serializers.CharField(source="get_modalidade_display", read_only=True)
    horas = serializers.FloatField(read_only=True)
    custo_estimado = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    vigente = serializers.BooleanField(read_only=True)
    dias = serializers.IntegerField(read_only=True)

    class Meta:
        model = Alocacao
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em")

    def validate(self, attrs):
        inicio = attrs.get("data_inicio", getattr(self.instance, "data_inicio", None))
        fim = attrs.get("data_fim", getattr(self.instance, "data_fim", None))
        if inicio and fim and fim < inicio:
            raise serializers.ValidationError({"data_fim": "A data final não pode ser anterior à inicial."})
        user = attrs.get("user", getattr(self.instance, "user", None))
        recurso = attrs.get("recurso", getattr(self.instance, "recurso", None))
        if not user and not recurso:
            raise serializers.ValidationError("Informe uma pessoa ou um recurso material.")
        return attrs


class TimesheetSerializer(serializers.ModelSerializer):
    user_detalhe = UserResumoSerializer(source="user", read_only=True)
    task_nome = serializers.CharField(source="task.nome", read_only=True, default="")
    project_nome = serializers.CharField(source="project.nome", read_only=True, default="")
    project_cor = serializers.CharField(source="project.cor", read_only=True, default="")
    aprovador_nome = serializers.CharField(source="aprovador.nome", read_only=True, default="")
    custo = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = Timesheet
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em", "aprovador", "aprovado_em")

    def validate_horas(self, valor):
        if valor <= 0 or valor > 24:
            raise serializers.ValidationError("As horas devem estar entre 0 e 24.")
        return valor


class CapacidadeSemanalSerializer(serializers.ModelSerializer):
    user_nome = serializers.CharField(source="user.nome", read_only=True)

    class Meta:
        model = CapacidadeSemanal
        fields = "__all__"

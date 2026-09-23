"""Serializers de tarefas."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.serializers import UserResumoSerializer

from .models import ChecklistItem, Task, TaskDependency, TaskSkillRequirement


class ChecklistItemSerializer(serializers.ModelSerializer):
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)

    class Meta:
        model = ChecklistItem
        fields = "__all__"
        read_only_fields = ("criado_em",)


class TaskSkillRequirementSerializer(serializers.ModelSerializer):
    skill_nome = serializers.CharField(source="skill.nome", read_only=True)
    skill_icone = serializers.CharField(source="skill.icone", read_only=True)
    skill_cor = serializers.CharField(source="skill.cor", read_only=True)
    skill_categoria = serializers.CharField(source="skill.categoria.nome", read_only=True, default="")

    class Meta:
        model = TaskSkillRequirement
        fields = "__all__"
        read_only_fields = ("criado_em",)


class TaskSerializer(serializers.ModelSerializer):
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    project_nome = serializers.CharField(source="project.nome", read_only=True)
    project_cor = serializers.CharField(source="project.cor", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    prioridade_rotulo = serializers.CharField(source="get_prioridade_display", read_only=True)
    atrasada = serializers.BooleanField(read_only=True)
    duracao_dias = serializers.IntegerField(read_only=True)
    progresso_planejado = serializers.FloatField(read_only=True)
    desvio_prazo_dias = serializers.IntegerField(read_only=True, allow_null=True)
    total_subtarefas = serializers.IntegerField(read_only=True)
    tem_filhos = serializers.BooleanField(read_only=True)
    checklist = ChecklistItemSerializer(many=True, read_only=True)
    requisitos_skill = TaskSkillRequirementSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em", "critica", "folga_dias")

    def validate(self, attrs):
        inicio = attrs.get("data_inicio", getattr(self.instance, "data_inicio", None))
        fim = attrs.get("data_fim", getattr(self.instance, "data_fim", None))
        if inicio and fim and fim < inicio:
            raise serializers.ValidationError({"data_fim": "A data de fim não pode ser anterior à de início."})
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        if parent and self.instance and parent.pk == self.instance.pk:
            raise serializers.ValidationError({"parent": "Uma tarefa não pode ser pai de si mesma."})
        return attrs


class TaskListSerializer(serializers.ModelSerializer):
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    atrasada = serializers.BooleanField(read_only=True)
    duracao_dias = serializers.IntegerField(read_only=True)
    tem_filhos = serializers.BooleanField(read_only=True)
    total_subtarefas = serializers.IntegerField(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id", "project", "parent", "nome", "wbs", "descricao", "responsavel",
            "responsavel_detalhe", "data_inicio", "data_fim", "data_inicio_real", "data_fim_real",
            "esforco_estimado", "esforco_real", "percentual_conclusao", "status", "status_rotulo",
            "prioridade", "posicao_visual", "ordem", "nivel", "is_marco", "critica", "folga_dias",
            "cor", "icone", "tags", "atrasada", "duracao_dias", "tem_filhos", "total_subtarefas",
            "atualizado_em",
        )


class TaskDependencySerializer(serializers.ModelSerializer):
    predecessor_nome = serializers.CharField(source="predecessor.nome", read_only=True)
    successor_nome = serializers.CharField(source="successor.nome", read_only=True)

    class Meta:
        model = TaskDependency
        fields = "__all__"
        read_only_fields = ("criado_em",)

    def validate(self, attrs):
        pred = attrs.get("predecessor")
        suc = attrs.get("successor")
        if pred and suc and pred.pk == suc.pk:
            raise serializers.ValidationError("Uma tarefa não pode depender de si mesma.")
        if pred and suc and pred.project_id != suc.project_id:
            raise serializers.ValidationError("As tarefas devem pertencer ao mesmo projeto.")
        return attrs

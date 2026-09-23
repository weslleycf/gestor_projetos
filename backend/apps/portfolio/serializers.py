"""Serializers do portfólio."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.models import User
from apps.core.serializers import UserResumoSerializer

from .models import (
    Baseline,
    CampoCustomizado,
    KPI,
    LicaoAprendida,
    Milestone,
    Portfolio,
    Program,
    Project,
    ValorCampoCustomizado,
    Workflow,
    WorkflowState,
    WorkflowTransition,
)


class PortfolioSerializer(serializers.ModelSerializer):
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    total_projetos = serializers.SerializerMethodField()
    total_programas = serializers.SerializerMethodField()

    class Meta:
        model = Portfolio
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em")

    def get_total_projetos(self, obj) -> int:
        return obj.projetos.count()

    def get_total_programas(self, obj) -> int:
        return obj.programas.count()


class ProgramSerializer(serializers.ModelSerializer):
    gerente_detalhe = UserResumoSerializer(source="gerente", read_only=True)
    portfolio_nome = serializers.CharField(source="portfolio.nome", read_only=True, default="")
    total_projetos = serializers.IntegerField(source="projetos.count", read_only=True)

    class Meta:
        model = Program
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em")


class ProjectResumoSerializer(serializers.ModelSerializer):
    """Card visual de projeto — usado em listas, timelines e dashboards."""

    manager_detalhe = UserResumoSerializer(source="manager", read_only=True)
    sponsor_detalhe = UserResumoSerializer(source="sponsor", read_only=True)
    program_nome = serializers.CharField(source="program.nome", read_only=True, default="")
    portfolio_nome = serializers.CharField(source="portfolio.nome", read_only=True, default="")
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    saude_rotulo = serializers.CharField(source="get_saude_display", read_only=True)
    prioridade_rotulo = serializers.CharField(source="get_prioridade_display", read_only=True)
    atrasado = serializers.BooleanField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True, allow_null=True)
    progresso_planejado = serializers.FloatField(read_only=True)
    duracao_dias = serializers.IntegerField(read_only=True)
    total_tarefas = serializers.IntegerField(source="tarefas.count", read_only=True)

    class Meta:
        model = Project
        fields = (
            "id", "codigo", "nome", "descricao", "objetivo", "status", "status_rotulo",
            "prioridade", "prioridade_rotulo", "saude", "saude_rotulo", "criticidade",
            "categoria", "area", "tags", "data_inicio", "data_fim", "data_inicio_real",
            "data_fim_real", "orcamento", "orcamento_capex", "orcamento_opex", "custo_real",
            "receita_prevista", "percentual_conclusao", "progresso_planejado", "icone", "cor",
            "manager", "manager_detalhe", "sponsor", "sponsor_detalhe", "program", "program_nome",
            "portfolio", "portfolio_nome", "atrasado", "dias_restantes", "duracao_dias",
            "total_tarefas", "arquivado", "atualizado_em",
        )


class ProjectSerializer(serializers.ModelSerializer):
    manager_detalhe = UserResumoSerializer(source="manager", read_only=True)
    sponsor_detalhe = UserResumoSerializer(source="sponsor", read_only=True)
    program_nome = serializers.CharField(source="program.nome", read_only=True, default="")
    portfolio_nome = serializers.CharField(source="portfolio.nome", read_only=True, default="")
    criado_por_nome = serializers.CharField(source="criado_por.nome", read_only=True, default="")
    atrasado = serializers.BooleanField(read_only=True)
    dias_restantes = serializers.IntegerField(read_only=True, allow_null=True)
    progresso_planejado = serializers.FloatField(read_only=True)
    duracao_dias = serializers.IntegerField(read_only=True)
    total_tarefas = serializers.IntegerField(source="tarefas.count", read_only=True)
    total_riscos = serializers.IntegerField(source="riscos.count", read_only=True)
    total_marcos = serializers.IntegerField(source="marcos.count", read_only=True)
    total_alocacoes = serializers.IntegerField(source="alocacoes.count", read_only=True)

    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ("codigo", "criado_em", "atualizado_em", "custo_real", "arquivado")

    def validate(self, attrs):
        inicio = attrs.get("data_inicio", getattr(self.instance, "data_inicio", None))
        fim = attrs.get("data_fim", getattr(self.instance, "data_fim", None))
        if inicio and fim and fim < inicio:
            raise serializers.ValidationError({"data_fim": "A data de fim não pode ser anterior à de início."})
        return attrs


class MilestoneSerializer(serializers.ModelSerializer):
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    project_nome = serializers.CharField(source="project.nome", read_only=True)
    atrasado = serializers.BooleanField(read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Milestone
        fields = "__all__"
        read_only_fields = ("criado_em",)


class KPISerializer(serializers.ModelSerializer):
    atingimento = serializers.FloatField(read_only=True)
    situacao = serializers.CharField(read_only=True)
    project_nome = serializers.CharField(source="project.nome", read_only=True)

    class Meta:
        model = KPI
        fields = "__all__"
        read_only_fields = ("criado_em",)


class BaselineSerializer(serializers.ModelSerializer):
    criado_por_nome = serializers.CharField(source="criado_por.nome", read_only=True, default="")

    class Meta:
        model = Baseline
        fields = "__all__"
        read_only_fields = ("criado_em", "versao")


class LicaoAprendidaSerializer(serializers.ModelSerializer):
    autor_detalhe = UserResumoSerializer(source="autor", read_only=True)

    class Meta:
        model = LicaoAprendida
        fields = "__all__"
        read_only_fields = ("criado_em",)


class WorkflowStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowState
        fields = "__all__"


class WorkflowTransitionSerializer(serializers.ModelSerializer):
    de_nome = serializers.CharField(source="de.nome", read_only=True)
    para_nome = serializers.CharField(source="para.nome", read_only=True)

    class Meta:
        model = WorkflowTransition
        fields = "__all__"


class WorkflowSerializer(serializers.ModelSerializer):
    estados = WorkflowStateSerializer(many=True, read_only=True)
    transicoes = WorkflowTransitionSerializer(many=True, read_only=True)

    class Meta:
        model = Workflow
        fields = "__all__"
        read_only_fields = ("criado_em",)


class CampoCustomizadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoCustomizado
        fields = "__all__"


class ValorCampoCustomizadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValorCampoCustomizado
        fields = "__all__"

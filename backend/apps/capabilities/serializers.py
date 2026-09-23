"""Serializers de capacidades."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.serializers import UserResumoSerializer

from .models import (
    AllocationRecommendation,
    BusFactorAlert,
    DevelopmentAction,
    DevelopmentPlan,
    EmployeeSkill,
    EmployeeTraining,
    InternalOpportunity,
    Mentorship,
    OpportunityApplication,
    PerfilNivel,
    PosicaoChave,
    ProjectSkillRequirement,
    Skill,
    SkillAssessment,
    SkillCategory,
    SkillDemandForecast,
    SkillEndorsement,
    SkillEvidence,
    SkillHistory,
    SuccessionPlan,
    SugestaoPromocao,
    Training,
)


class SkillCategorySerializer(serializers.ModelSerializer):
    total_skills = serializers.IntegerField(source="skills.count", read_only=True)
    caminho = serializers.CharField(read_only=True)
    filhos = serializers.SerializerMethodField()

    class Meta:
        model = SkillCategory
        fields = "__all__"
        read_only_fields = ("criado_em",)

    def get_filhos(self, obj):
        if obj.subcategorias.exists():
            return SkillCategorySerializer(obj.subcategorias.all(), many=True).data
        return []


class SkillSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True, default="")
    categoria_cor = serializers.CharField(source="categoria.cor", read_only=True, default="#6366F1")
    parent_nome = serializers.CharField(source="parent.nome", read_only=True, default="")
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    criticidade_rotulo = serializers.CharField(source="get_criticidade_display", read_only=True)
    total_detentores = serializers.IntegerField(read_only=True)
    bus_factor = serializers.IntegerField(read_only=True)
    nivel_medio = serializers.FloatField(read_only=True)
    em_risco = serializers.BooleanField(read_only=True)

    class Meta:
        model = Skill
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em")


class SkillArvoreSerializer(serializers.ModelSerializer):
    """Nó do grafo/árvore de taxonomia (RF-45)."""

    filhos = serializers.SerializerMethodField()
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True, default="")
    total_detentores = serializers.IntegerField(read_only=True)

    class Meta:
        model = Skill
        fields = ("id", "nome", "icone", "cor", "tipo", "status", "criticidade", "parent",
                  "categoria", "categoria_nome", "codigo_externo", "framework_origem",
                  "total_detentores", "filhos")

    def get_filhos(self, obj):
        return SkillArvoreSerializer(obj.derivadas.all(), many=True).data


class PerfilNivelSerializer(serializers.ModelSerializer):
    skill_nome = serializers.CharField(source="skill.nome", read_only=True, default="Geral")

    class Meta:
        model = PerfilNivel
        fields = "__all__"


class SkillAssessmentSerializer(serializers.ModelSerializer):
    avaliador_detalhe = UserResumoSerializer(source="avaliador", read_only=True)
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    employee_skill = serializers.PrimaryKeyRelatedField(
        queryset=SkillAssessment._meta.get_field("employee_skill").related_model.objects.all(),
        required=False,
    )

    class Meta:
        model = SkillAssessment
        fields = "__all__"
        read_only_fields = ("criado_em",)


class SkillEndorsementSerializer(serializers.ModelSerializer):
    endorser_detalhe = UserResumoSerializer(source="endorser", read_only=True)
    employee_skill = serializers.PrimaryKeyRelatedField(
        queryset=SkillEndorsement._meta.get_field("employee_skill").related_model.objects.all(),
        required=False,
    )

    class Meta:
        model = SkillEndorsement
        fields = "__all__"
        read_only_fields = ("data",)


class SkillEvidenceSerializer(serializers.ModelSerializer):
    validador_nome = serializers.CharField(source="validador.nome", read_only=True, default="")
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    employee_skill = serializers.PrimaryKeyRelatedField(
        queryset=SkillEvidence._meta.get_field("employee_skill").related_model.objects.all(),
        required=False,
    )
    pode_editar = serializers.SerializerMethodField()

    class Meta:
        model = SkillEvidence
        fields = "__all__"
        read_only_fields = ("criado_em", "validada_em")

    def get_pode_editar(self, obj) -> bool:
        """Quem lançou a evidência pode corrigi-la; o gestor também."""
        from apps.core.permissions import pode_gerenciar_evidencia_capacidade

        usuario = getattr(self.context.get("request"), "user", None)
        return bool(usuario and usuario.is_authenticated and pode_gerenciar_evidencia_capacidade(usuario, obj))


class SkillHistorySerializer(serializers.ModelSerializer):
    skill_nome = serializers.CharField(source="employee_skill.skill.nome", read_only=True)
    skill_cor = serializers.CharField(source="employee_skill.skill.cor", read_only=True)
    registrado_por_nome = serializers.CharField(source="registrado_por.nome", read_only=True, default="")
    origem_rotulo = serializers.CharField(source="get_origem_display", read_only=True)

    class Meta:
        model = SkillHistory
        fields = "__all__"


class EmployeeSkillSerializer(serializers.ModelSerializer):
    skill_detalhe = SkillSerializer(source="skill", read_only=True)
    user_detalhe = UserResumoSerializer(source="user", read_only=True)
    nivel_rotulo = serializers.CharField(source="get_nivel_atual_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    gap = serializers.IntegerField(read_only=True)
    nivel_efetivo = serializers.FloatField(read_only=True)
    xp_para_proximo_nivel = serializers.IntegerField(read_only=True)
    progresso_nivel_percentual = serializers.FloatField(read_only=True)
    dias_sem_uso = serializers.IntegerField(read_only=True, allow_null=True)
    total_avaliacoes = serializers.IntegerField(source="avaliacoes.count", read_only=True)
    total_endossos = serializers.IntegerField(source="endossos.count", read_only=True)
    total_evidencias = serializers.IntegerField(source="evidencias.count", read_only=True)
    pode_editar = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeSkill
        fields = "__all__"
        read_only_fields = ("atualizado_em", "criado_em", "nivel_consolidado")

    def get_pode_editar(self, obj) -> bool:
        """Informa à interface se este usuário pode alterar o vínculo.

        O próprio colaborador ajusta o nível desejado, a visibilidade e o
        destaque; o nível validado continua sendo do avaliador. Expor isso no
        payload evita o botão que sempre termina em erro de permissão.
        """
        from apps.core.permissions import pode_gerenciar_vinculo_capacidade

        usuario = getattr(self.context.get("request"), "user", None)
        return bool(usuario and usuario.is_authenticated and pode_gerenciar_vinculo_capacidade(usuario, obj))


class SugestaoPromocaoSerializer(serializers.ModelSerializer):
    user_nome = serializers.CharField(source="employee_skill.user.nome", read_only=True)
    user_id = serializers.IntegerField(source="employee_skill.user_id", read_only=True)
    user_cor = serializers.CharField(source="employee_skill.user.cor", read_only=True)
    skill_nome = serializers.CharField(source="employee_skill.skill.nome", read_only=True)
    skill_icone = serializers.CharField(source="employee_skill.skill.icone", read_only=True)
    skill_cor = serializers.CharField(source="employee_skill.skill.cor", read_only=True)
    validado_por_nome = serializers.CharField(source="validado_por.nome", read_only=True, default="")

    class Meta:
        model = SugestaoPromocao
        fields = "__all__"
        read_only_fields = ("criado_em", "validado_em")


class ProjectSkillRequirementSerializer(serializers.ModelSerializer):
    skill_detalhe = SkillSerializer(source="skill", read_only=True)
    project_nome = serializers.CharField(source="project.nome", read_only=True)

    class Meta:
        model = ProjectSkillRequirement
        fields = "__all__"
        read_only_fields = ("criado_em",)


class DevelopmentActionSerializer(serializers.ModelSerializer):
    skill_nome = serializers.CharField(source="skill.nome", read_only=True, default="")
    skill_cor = serializers.CharField(source="skill.cor", read_only=True, default="#F59E0B")
    skill_icone = serializers.CharField(source="skill.icone", read_only=True, default="sparkles")
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    atrasada = serializers.BooleanField(read_only=True)

    class Meta:
        model = DevelopmentAction
        fields = "__all__"
        read_only_fields = ("criado_em",)


class DevelopmentPlanSerializer(serializers.ModelSerializer):
    user_detalhe = UserResumoSerializer(source="user", read_only=True)
    acoes = DevelopmentActionSerializer(many=True, read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)
    acompanhamento_nome = serializers.CharField(
        source="responsavel_acompanhamento.nome", read_only=True, default=""
    )

    class Meta:
        model = DevelopmentPlan
        fields = "__all__"
        read_only_fields = ("criado_em", "atualizado_em")


class TrainingSerializer(serializers.ModelSerializer):
    skill_nome = serializers.CharField(source="skill.nome", read_only=True, default="")
    skill_cor = serializers.CharField(source="skill.cor", read_only=True, default="#F59E0B")
    total_participacoes = serializers.IntegerField(source="participacoes.count", read_only=True)

    class Meta:
        model = Training
        fields = "__all__"
        read_only_fields = ("criado_em",)


class EmployeeTrainingSerializer(serializers.ModelSerializer):
    user_detalhe = UserResumoSerializer(source="user", read_only=True)
    training_detalhe = TrainingSerializer(source="training", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = EmployeeTraining
        fields = "__all__"
        read_only_fields = ("criado_em",)


class MentorshipSerializer(serializers.ModelSerializer):
    mentor_detalhe = UserResumoSerializer(source="mentor", read_only=True)
    mentee_detalhe = UserResumoSerializer(source="mentee", read_only=True)
    skill_nome = serializers.CharField(source="skill.nome", read_only=True, default="")
    skill_cor = serializers.CharField(source="skill.cor", read_only=True, default="#F59E0B")
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Mentorship
        fields = "__all__"
        read_only_fields = ("criado_em",)


class AllocationRecommendationSerializer(serializers.ModelSerializer):
    user_detalhe = UserResumoSerializer(source="user", read_only=True)
    task_nome = serializers.CharField(source="task.nome", read_only=True)
    project_id = serializers.IntegerField(source="task.project_id", read_only=True)
    modo_rotulo = serializers.CharField(source="get_modo_display", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AllocationRecommendation
        fields = "__all__"
        read_only_fields = ("criado_em", "decidido_em")


class SkillDemandForecastSerializer(serializers.ModelSerializer):
    skill_nome = serializers.CharField(source="skill.nome", read_only=True)
    situacao = serializers.CharField(read_only=True)

    class Meta:
        model = SkillDemandForecast
        fields = "__all__"
        read_only_fields = ("criado_em",)


class BusFactorAlertSerializer(serializers.ModelSerializer):
    skill_detalhe = SkillSerializer(source="skill", read_only=True)

    class Meta:
        model = BusFactorAlert
        fields = "__all__"
        read_only_fields = ("detectado_em",)


class InternalOpportunitySerializer(serializers.ModelSerializer):
    skills_detalhe = SkillSerializer(source="skills_requeridas", many=True, read_only=True)
    responsavel_detalhe = UserResumoSerializer(source="responsavel", read_only=True)
    project_nome = serializers.CharField(source="project.nome", read_only=True, default="")
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    total_candidaturas = serializers.IntegerField(source="candidaturas.count", read_only=True)

    class Meta:
        model = InternalOpportunity
        fields = "__all__"
        read_only_fields = ("criado_em",)


class OpportunityApplicationSerializer(serializers.ModelSerializer):
    user_detalhe = UserResumoSerializer(source="user", read_only=True)
    opportunity_titulo = serializers.CharField(source="opportunity.titulo", read_only=True)
    status_rotulo = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = OpportunityApplication
        fields = "__all__"
        read_only_fields = ("criado_em", "aderencia", "skills_atendidas", "skills_gap")


class PosicaoChaveSerializer(serializers.ModelSerializer):
    ocupante_detalhe = UserResumoSerializer(source="ocupante", read_only=True)
    gestor_detalhe = UserResumoSerializer(source="gestor", read_only=True)
    skills_detalhe = SkillSerializer(source="skills_criticas", many=True, read_only=True)
    total_sucessores = serializers.IntegerField(source="sucessores.count", read_only=True)

    class Meta:
        model = PosicaoChave
        fields = "__all__"
        read_only_fields = ("criado_em",)


class SuccessionPlanSerializer(serializers.ModelSerializer):
    sucessor_detalhe = UserResumoSerializer(source="sucessor", read_only=True)
    posicao_titulo = serializers.CharField(source="posicao.titulo", read_only=True)
    prontidao_rotulo = serializers.CharField(source="get_prontidao_display", read_only=True)

    class Meta:
        model = SuccessionPlan
        fields = "__all__"
        read_only_fields = ("criado_em",)

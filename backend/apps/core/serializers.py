"""Serializers do núcleo: usuários, RBAC, auditoria, colaboração e preferências."""
from __future__ import annotations

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Anexo,
    ApiToken,
    Atividade,
    AuditLog,
    Comentario,
    CustomReport,
    DashboardLayout,
    Notificacao,
    Perfil,
    RegraNotificacao,
    Role,
    SavedFilter,
    User,
    UserRole,
    UserViewPreference,
    Webhook,
)
from .permissions import permissoes_do_usuario


class UserResumoSerializer(serializers.ModelSerializer):
    """Representação compacta usada em cards, avatares e chips de pessoa."""

    avatar_display = serializers.SerializerMethodField()
    papel = serializers.CharField(source="get_perfil_display", read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "nome", "nome_curto", "email", "iniciais", "cor", "icone",
            "avatar_display", "cargo", "area", "localizacao", "perfil", "papel",
            "disponivel_para_mentoria", "ativo",
        )

    def get_avatar_display(self, obj) -> str:
        if obj.avatar:
            try:
                return obj.avatar.url
            except ValueError:
                pass
        return obj.avatar_url or ""


class UserSerializer(serializers.ModelSerializer):
    avatar_display = serializers.SerializerMethodField()
    papel = serializers.CharField(source="get_perfil_display", read_only=True)
    gestor_nome = serializers.CharField(source="gestor.nome", read_only=True, default="")
    custo_hora = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "email", "nome", "nome_curto", "perfil", "papel", "ativo",
            "avatar", "avatar_url", "avatar_display", "iniciais", "cor", "icone",
            "cargo", "area", "localizacao", "fuso_horario", "gestor", "gestor_nome",
            "data_admissao", "custo_hora", "capacidade_semanal_horas", "custo_hora_visivel",
            "tema", "paleta", "tema_custom", "densidade", "idioma",
            "aceita_recomendacoes", "disponivel_para_mentoria",
            "interesses", "is_staff", "is_superuser", "criado_em", "atualizado_em",
        )
        read_only_fields = ("criado_em", "atualizado_em", "iniciais", "is_superuser")

    def get_avatar_display(self, obj) -> str:
        if obj.avatar:
            try:
                return obj.avatar.url
            except ValueError:
                pass
        return obj.avatar_url or ""

    def get_custo_hora(self, obj):
        request = self.context.get("request")
        solicitante = getattr(request, "user", None) if request else None
        if solicitante is None or not getattr(solicitante, "is_authenticated", False):
            return None
        if solicitante.pode_ver_custo or solicitante.pk == obj.pk:
            return float(obj.custo_hora)
        return None


class UserWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)

    class Meta:
        model = User
        fields = (
            "id", "email", "nome", "perfil", "ativo", "avatar_url", "cor", "icone",
            "cargo", "area", "localizacao", "fuso_horario", "gestor", "data_admissao",
            "custo_hora", "capacidade_semanal_horas", "custo_hora_visivel", "tema",
            "paleta", "tema_custom", "densidade", "idioma",
            "aceita_recomendacoes", "disponivel_para_mentoria",
            "interesses", "is_staff", "password",
        )

    def create(self, validated_data):
        senha = validated_data.pop("password", None) or "sgp123456"
        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(senha)
            user.save()
        return user

    def update(self, instance, validated_data):
        senha = validated_data.pop("password", None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if senha:
            instance.set_password(senha)
        instance.save()
        return instance


class RoleSerializer(serializers.ModelSerializer):
    total_vinculos = serializers.IntegerField(source="vinculos.count", read_only=True)

    class Meta:
        model = Role
        fields = ("id", "nome", "descricao", "permissoes", "is_sistema", "criado_em", "total_vinculos")
        read_only_fields = ("criado_em",)


class UserRoleSerializer(serializers.ModelSerializer):
    user_nome = serializers.CharField(source="user.nome", read_only=True)
    role_nome = serializers.CharField(source="role.nome", read_only=True)

    class Meta:
        model = UserRole
        fields = ("id", "user", "user_nome", "role", "role_nome", "escopo", "escopo_id", "criado_em")
        read_only_fields = ("criado_em",)


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            "id", "user", "user_nome", "entidade", "entidade_id", "acao",
            "valores_anteriores", "valores_novos", "justificativa", "ip",
            "user_agent", "timestamp",
        )


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = (
            "id", "titulo", "mensagem", "nivel", "icone", "cor", "link",
            "entidade", "entidade_id", "lida", "canal", "criado_em",
        )


class RegraNotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegraNotificacao
        fields = "__all__"


class AtividadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Atividade
        fields = (
            "id", "user", "user_nome", "user_cor", "verbo", "entidade",
            "entidade_id", "entidade_nome", "projeto_id", "meta", "criado_em",
        )


class UserViewPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserViewPreference
        fields = ("id", "contexto", "tipo_visualizacao", "configuracao_json", "updated_at")
        read_only_fields = ("updated_at",)


class DashboardLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardLayout
        fields = ("id", "nome", "widgets_json", "is_default", "criado_em", "atualizado_em")
        read_only_fields = ("criado_em", "atualizado_em")


class SavedFilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedFilter
        fields = ("id", "nome", "modulo", "criterios_json", "icone", "cor", "compartilhado", "criado_em")
        read_only_fields = ("criado_em",)


class CustomReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomReport
        fields = ("id", "nome", "descricao", "widgets_json", "agendamento", "destinatarios", "criado_em")
        read_only_fields = ("criado_em",)


class ApiTokenSerializer(serializers.ModelSerializer):
    expirado = serializers.BooleanField(read_only=True)

    class Meta:
        model = ApiToken
        fields = ("id", "nome", "token", "escopos", "ativo", "expira_em", "ultimo_uso", "criado_em", "expirado")
        read_only_fields = ("token", "ultimo_uso", "criado_em")


class WebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Webhook
        fields = ("id", "nome", "url", "eventos", "ativo", "secreto", "criado_em")
        read_only_fields = ("criado_em",)


class AnexoSerializer(serializers.ModelSerializer):
    enviado_por_nome = serializers.CharField(source="enviado_por.nome", read_only=True, default="")
    url = serializers.SerializerMethodField()

    class Meta:
        model = Anexo
        fields = ("id", "nome", "url", "mime", "tamanho", "enviado_por", "enviado_por_nome", "criado_em")
        read_only_fields = ("criado_em",)

    def get_url(self, obj) -> str:
        try:
            return obj.arquivo.url
        except ValueError:
            return ""


class ComentarioSerializer(serializers.ModelSerializer):
    autor_detalhe = UserResumoSerializer(source="autor", read_only=True)
    respostas = serializers.SerializerMethodField()
    editado = serializers.SerializerMethodField()
    pode_editar = serializers.SerializerMethodField()

    class Meta:
        model = Comentario
        fields = (
            "id", "autor", "autor_detalhe", "parent", "texto", "mencoes",
            "reacoes", "resolvido", "criado_em", "atualizado_em", "editado_em",
            "editado", "pode_editar", "respostas",
        )
        read_only_fields = ("criado_em", "atualizado_em", "editado_em", "autor")

    def get_respostas(self, obj):
        if obj.parent_id is not None:
            return []
        return ComentarioSerializer(obj.respostas.all(), many=True, context=self.context).data

    def get_editado(self, obj) -> bool:
        return obj.editado_em is not None

    def get_pode_editar(self, obj) -> bool:
        """Informa à interface se o usuário pode editar ou excluir este comentário.

        Expor isso evita o pior tipo de inconsistência: um botão visível que
        sempre termina em erro de permissão.
        """
        from .permissions import pode_gerenciar_comentario

        usuario = getattr(self.context.get("request"), "user", None)
        return bool(usuario and usuario.is_authenticated and pode_gerenciar_comentario(usuario, obj))


class SGPTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login por e-mail/senha que devolve também o perfil e as permissões."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["nome"] = user.nome
        token["email"] = user.email
        token["perfil"] = user.perfil
        token["iniciais"] = user.iniciais
        token["cor"] = user.cor
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.ativo or not self.user.is_active:
            raise serializers.ValidationError("Usuário inativo. Procure o administrador do SGP.")
        data["usuario"] = UserSerializer(self.user, context=self.context).data
        data["permissoes"] = sorted(permissoes_do_usuario(self.user))
        return data


def resolver_content_type(entidade: str) -> ContentType:
    """Aceita 'tasks.task', 'task' ou 'Task' e devolve o ContentType."""
    if not entidade:
        raise serializers.ValidationError({"entidade": "Informe a entidade (ex.: tasks.task)."})
    if "." in entidade:
        app_label, model = entidade.split(".", 1)
    else:
        from django.apps import apps as django_apps

        alvo = entidade.lower()
        for model_cls in django_apps.get_models():
            if model_cls.__name__.lower() == alvo:
                return ContentType.objects.get_for_model(model_cls)
        raise serializers.ValidationError({"entidade": f"Entidade desconhecida: {entidade}"})
    try:
        return ContentType.objects.get_by_natural_key(app_label, model.lower())
    except ContentType.DoesNotExist as exc:
        raise serializers.ValidationError({"entidade": f"Entidade desconhecida: {entidade}"}) from exc

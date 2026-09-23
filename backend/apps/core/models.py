"""Entidades de núcleo: usuários, RBAC, auditoria e preferências visuais."""
from __future__ import annotations

import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Perfil(models.TextChoices):
    """Perfis funcionais do SGP (especificação §1.4)."""

    ADMIN = "ADMIN", "Administrador"
    EXECUTIVO = "EXECUTIVO", "Executivo (C-Level)"
    PMO = "PMO", "PMO"
    GERENTE = "GERENTE", "Gerente de Projetos"
    LIDER = "LIDER", "Líder Técnico"
    MEMBRO = "MEMBRO", "Membro de Equipe"
    RH = "RH", "RH / DHO"
    STAKEHOLDER = "STAKEHOLDER", "Stakeholder"


class Visibilidade(models.TextChoices):
    """Visibilidade de dados de capacidade (RNF-11, §10.3)."""

    PUBLICO = "PUBLICO", "Público"
    RESTRITO = "RESTRITO", "Restrito (gestor e RH)"
    PRIVADO = "PRIVADO", "Privado"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("O e-mail é obrigatório.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("perfil", Perfil.ADMIN)
        extra.setdefault("nome", "Administrador")
        if extra.get("is_staff") is not True:
            raise ValueError("Superusuário precisa de is_staff=True.")
        return self._create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """Colaborador do SGP. Acumula identidade, perfil profissional e capacidade."""

    email = models.EmailField("e-mail", unique=True, db_index=True)
    nome = models.CharField("nome", max_length=180)
    perfil = models.CharField("perfil", max_length=20, choices=Perfil.choices, default=Perfil.MEMBRO, db_index=True)
    ativo = models.BooleanField("ativo", default=True, db_index=True)

    # Identidade visual
    avatar = models.ImageField("avatar", upload_to="avatares/", blank=True, null=True)
    avatar_url = models.URLField("URL do avatar", blank=True, default="")
    iniciais = models.CharField("iniciais", max_length=4, blank=True, default="")
    cor = models.CharField("cor", max_length=9, default="#3B82F6")
    icone = models.CharField("ícone", max_length=40, blank=True, default="user")

    # Dados organizacionais
    cargo = models.CharField("cargo", max_length=140, blank=True, default="")
    area = models.CharField("área", max_length=140, blank=True, default="", db_index=True)
    localizacao = models.CharField("localização", max_length=140, blank=True, default="")
    fuso_horario = models.CharField("fuso horário", max_length=64, blank=True, default="America/Sao_Paulo")
    gestor = models.ForeignKey(
        "self", verbose_name="gestor", null=True, blank=True, on_delete=models.SET_NULL, related_name="liderados"
    )
    data_admissao = models.DateField("data de admissão", null=True, blank=True)

    # Capacidade e custo
    custo_hora = models.DecimalField("custo/hora (R$)", max_digits=10, decimal_places=2, default=0)
    capacidade_semanal_horas = models.DecimalField(
        "capacidade semanal (h)", max_digits=5, decimal_places=2, default=40
    )
    custo_hora_visivel = models.BooleanField("custo visível a todos", default=False)

    # Preferências de UI
    tema = models.CharField("modo de cor", max_length=10, default="system")
    paleta = models.CharField("paleta de cores", max_length=40, default="sgp")
    tema_custom = models.JSONField("tema personalizado", default=dict, blank=True)
    densidade = models.CharField("densidade", max_length=12, default="padrao")
    idioma = models.CharField("idioma", max_length=8, default="pt-BR")
    aceita_recomendacoes = models.BooleanField(
        "consentiu uso em recomendações de alocação", default=True
    )
    disponivel_para_mentoria = models.BooleanField("disponível para mentoria", default=False)
    interesses = models.JSONField("interesses", default=list, blank=True)

    is_staff = models.BooleanField("acesso ao admin", default=False)
    is_active = models.BooleanField("ativo no sistema", default=True)
    criado_em = models.DateTimeField("criado em", default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome"]

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["perfil", "ativo"]),
            models.Index(fields=["area"]),
        ]

    def __str__(self) -> str:
        return f"{self.nome} <{self.email}>"

    def save(self, *args, **kwargs):
        if not self.iniciais:
            partes = [p for p in (self.nome or "").split() if p]
            self.iniciais = ("".join(p[0] for p in partes[:2]) or "?").upper()
        self.email = (self.email or "").lower()
        super().save(*args, **kwargs)

    @property
    def nome_curto(self) -> str:
        return (self.nome or "").split(" ")[0]

    @property
    def is_administrador(self) -> bool:
        return self.is_superuser or self.perfil == Perfil.ADMIN

    @property
    def pode_ver_custo(self) -> bool:
        return self.custo_hora_visivel or self.perfil in {Perfil.ADMIN, Perfil.PMO, Perfil.GERENTE, Perfil.EXECUTIVO, Perfil.RH}

    def capacidade_periodo(self, inicio, fim, *, dias_uteis=True) -> float:
        """Capacidade disponível em horas no intervalo informado.

        Considera as exceções por semana (férias, afastamento, horas extras)
        cadastradas em CapacidadeSemanal. Sem isso, o modelo tinha a tabela de
        exceções e nenhum efeito: férias não reduziam a capacidade em lugar
        nenhum do sistema.
        """
        if not inicio or not fim:
            return 0.0

        dias = (fim - inicio).days + 1
        if dias_uteis:
            dias = sum(
                1 for i in range(dias) if (inicio + timedelta(days=i)).weekday() < 5
            )
        base = float(self.capacidade_semanal_horas) / 5.0 * dias

        # Ajuste pelas semanas que têm exceção e cruzam o período pedido.
        try:
            excecoes = list(
                self.capacidades_semanais.filter(
                    semana_inicio__gte=inicio - timedelta(days=6),
                    semana_inicio__lte=fim,
                )
            )
        except Exception:  # pragma: no cover - relação ausente em migrações antigas
            return base

        if not excecoes:
            return base

        def uteis(a, b) -> int:
            if b < a:
                return 0
            total_dias = (b - a).days + 1
            if not dias_uteis:
                return total_dias
            return sum(1 for i in range(total_dias) if (a + timedelta(days=i)).weekday() < 5)

        base_por_dia = float(self.capacidade_semanal_horas) / 5.0
        capacidade = base_por_dia * uteis(inicio, fim)

        # Cada exceção substitui a capacidade padrão pelos dias úteis daquela
        # semana que caem dentro do período pedido.
        for excecao in excecoes:
            dias_excecao = uteis(
                max(inicio, excecao.semana_inicio),
                min(fim, excecao.semana_inicio + timedelta(days=4)),
            )
            if dias_excecao:
                capacidade += (float(excecao.horas_disponiveis) / 5.0 - base_por_dia) * dias_excecao

        return max(0.0, capacidade)


class Role(models.Model):
    """Papel RBAC com permissões nomeadas."""

    nome = models.CharField("nome", max_length=80, unique=True)
    descricao = models.TextField("descrição", blank=True, default="")
    permissoes = models.JSONField("permissões", default=list, blank=True)
    is_sistema = models.BooleanField("papel de sistema", default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "papel"
        verbose_name_plural = "papéis"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Escopo(models.TextChoices):
    GLOBAL = "GLOBAL", "Global"
    PORTFOLIO = "PORTFOLIO", "Portfólio"
    PROGRAMA = "PROGRAMA", "Programa"
    PROJETO = "PROJETO", "Projeto"
    PESSOAL = "PESSOAL", "Pessoal"


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="papeis")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="vinculos")
    escopo = models.CharField("escopo", max_length=20, choices=Escopo.choices, default=Escopo.GLOBAL)
    escopo_id = models.PositiveBigIntegerField("id do escopo", null=True, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "vínculo de papel"
        verbose_name_plural = "vínculos de papel"
        unique_together = ("user", "role", "escopo", "escopo_id")

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.role.nome} ({self.escopo})"


class AcaoAuditoria(models.TextChoices):
    CRIAR = "CRIAR", "Criação"
    ATUALIZAR = "ATUALIZAR", "Atualização"
    EXCLUIR = "EXCLUIR", "Exclusão"
    LOGIN = "LOGIN", "Login"
    LOGOUT = "LOGOUT", "Logout"
    EXPORTAR = "EXPORTAR", "Exportação"
    APROVAR = "APROVAR", "Aprovação"
    ALOCAR = "ALOCAR", "Alocação"
    VALIDAR = "VALIDAR", "Validação de capacidade"


class AuditLog(models.Model):
    """Trilha de auditoria imutável (RNF-16, §10.5) — retenção ≥ 5 anos."""

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="auditorias")
    user_nome = models.CharField(max_length=180, blank=True, default="")
    entidade = models.CharField("entidade", max_length=80, db_index=True)
    entidade_id = models.CharField("id da entidade", max_length=64, blank=True, default="")
    acao = models.CharField("ação", max_length=20, choices=AcaoAuditoria.choices, db_index=True)
    valores_anteriores = models.JSONField(default=dict, blank=True)
    valores_novos = models.JSONField(default=dict, blank=True)
    justificativa = models.TextField(blank=True, default="")
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=300, blank=True, default="")
    timestamp = models.DateTimeField(default=timezone.now, db_index=True, editable=False)

    class Meta:
        verbose_name = "registro de auditoria"
        verbose_name_plural = "registros de auditoria"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["entidade", "entidade_id"]),
            models.Index(fields=["-timestamp"]),
        ]

    def __str__(self) -> str:
        return f"{self.timestamp:%d/%m/%Y %H:%M} · {self.user_nome or 'sistema'} · {self.acao} {self.entidade}"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Registros de auditoria são imutáveis.")
        if self.user and not self.user_nome:
            self.user_nome = self.user.nome
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # pragma: no cover - proteção explícita
        raise ValueError("Registros de auditoria não podem ser excluídos.")


class TipoVisualizacao(models.TextChoices):
    GANTT = "GANTT", "Gantt"
    KANBAN = "KANBAN", "Kanban"
    LISTA = "LISTA", "Lista"
    CALENDARIO = "CALENDARIO", "Calendário"
    TIMELINE = "TIMELINE", "Timeline"
    MATRIZ = "MATRIZ", "Matriz"
    GRAFO = "GRAFO", "Grafo"
    DASHBOARD = "DASHBOARD", "Dashboard"


class UserViewPreference(models.Model):
    """Preferência de visualização por contexto (RF-12, §6.3)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="preferencias_visao")
    contexto = models.CharField("contexto", max_length=80)
    tipo_visualizacao = models.CharField(max_length=20, choices=TipoVisualizacao.choices, default=TipoVisualizacao.LISTA)
    configuracao_json = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "preferência de visualização"
        verbose_name_plural = "preferências de visualização"
        unique_together = ("user", "contexto")

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.contexto}"


class DashboardLayout(models.Model):
    """Layout de dashboard por drag-and-drop de widgets (RF-30)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="dashboards")
    nome = models.CharField("nome", max_length=140)
    widgets_json = models.JSONField("widgets", default=list, blank=True)
    is_default = models.BooleanField("padrão", default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "layout de dashboard"
        verbose_name_plural = "layouts de dashboard"
        ordering = ["-is_default", "nome"]

    def __str__(self) -> str:
        return f"{self.nome} ({self.user.nome})"


class SavedFilter(models.Model):
    """Filtro visual salvo — chips coloridos e removíveis (§2.3.2)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="filtros_salvos")
    nome = models.CharField("nome", max_length=140)
    modulo = models.CharField("módulo", max_length=80, db_index=True)
    criterios_json = models.JSONField("critérios", default=dict, blank=True)
    icone = models.CharField("ícone", max_length=40, default="filter")
    cor = models.CharField("cor", max_length=9, default="#6366F1")
    compartilhado = models.BooleanField("compartilhado com a equipe", default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "filtro salvo"
        verbose_name_plural = "filtros salvos"
        ordering = ["modulo", "nome"]

    def __str__(self) -> str:
        return f"{self.nome} · {self.modulo}"


class CustomReport(models.Model):
    """Relatório customizável montado por widgets (RF-30)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="relatorios")
    nome = models.CharField("nome", max_length=140)
    descricao = models.TextField(blank=True, default="")
    widgets_json = models.JSONField("widgets", default=list, blank=True)
    agendamento = models.CharField("agendamento (cron)", max_length=80, blank=True, default="")
    destinatarios = models.JSONField("destinatários", default=list, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "relatório customizado"
        verbose_name_plural = "relatórios customizados"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


def gerar_token_publico() -> str:
    return uuid.uuid4().hex


class ApiToken(models.Model):
    """Token de API pública para integrações (RF-43, §11)."""

    nome = models.CharField("nome", max_length=140)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tokens_api")
    token = models.CharField(max_length=64, unique=True, default=gerar_token_publico)
    escopos = models.JSONField("escopos", default=list, blank=True)
    ativo = models.BooleanField(default=True)
    expira_em = models.DateTimeField(null=True, blank=True)
    ultimo_uso = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "token de API"
        verbose_name_plural = "tokens de API"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return self.nome

    @property
    def expirado(self) -> bool:
        return bool(self.expira_em and self.expira_em < timezone.now())


class Webhook(models.Model):
    """Webhook de integração com painel visual (RF-43)."""

    nome = models.CharField("nome", max_length=140)
    url = models.URLField("URL")
    eventos = models.JSONField("eventos", default=list, blank=True)
    ativo = models.BooleanField(default=True)
    secreto = models.CharField(max_length=80, blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "webhook"
        verbose_name_plural = "webhooks"
        ordering = ["nome"]

    def __str__(self) -> str:
        return f"{self.nome} → {self.url}"


class Anexo(models.Model):
    """Anexo genérico com preview visual (RF-11)."""

    content_type = models.ForeignKey("contenttypes.ContentType", on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    arquivo = models.FileField("arquivo", upload_to="anexos/%Y/%m/")
    nome = models.CharField("nome", max_length=255)
    mime = models.CharField(max_length=120, blank=True, default="")
    tamanho = models.PositiveBigIntegerField(default=0)
    enviado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="anexos")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "anexo"
        verbose_name_plural = "anexos"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return self.nome


class Comentario(models.Model):
    """Comentário com menções e threads visuais (RF-35)."""

    content_type = models.ForeignKey("contenttypes.ContentType", on_delete=models.CASCADE)
    object_id = models.PositiveBigIntegerField()
    autor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comentarios")
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="respostas")
    texto = models.TextField("texto")
    mencoes = models.ManyToManyField(User, blank=True, related_name="mencoes")
    reacoes = models.JSONField("reações", default=dict, blank=True)
    resolvido = models.BooleanField(default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False, db_index=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    # Marca a edição para que a interface possa avisar "editado", em vez de
    # reescrever o histórico silenciosamente.
    editado_em = models.DateTimeField("editado em", null=True, blank=True)

    class Meta:
        verbose_name = "comentário"
        verbose_name_plural = "comentários"
        ordering = ["criado_em"]
        indexes = [models.Index(fields=["content_type", "object_id"])]

    def __str__(self) -> str:
        return f"{self.autor.nome}: {self.texto[:40]}"


class NivelNotificacao(models.TextChoices):
    INFO = "INFO", "Informativo"
    SUCESSO = "SUCESSO", "Sucesso"
    ALERTA = "ALERTA", "Alerta"
    CRITICO = "CRITICO", "Crítico"


class Notificacao(models.Model):
    """Notificação visual in-app (RF-31/RF-36)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notificacoes")
    titulo = models.CharField("título", max_length=200)
    mensagem = models.TextField(blank=True, default="")
    nivel = models.CharField(max_length=12, choices=NivelNotificacao.choices, default=NivelNotificacao.INFO, db_index=True)
    icone = models.CharField(max_length=40, default="bell")
    cor = models.CharField(max_length=9, blank=True, default="")
    link = models.CharField("link", max_length=300, blank=True, default="")
    entidade = models.CharField(max_length=80, blank=True, default="")
    entidade_id = models.CharField(max_length=64, blank=True, default="")
    lida = models.BooleanField(default=False, db_index=True)
    canal = models.CharField(max_length=20, default="IN_APP")
    criado_em = models.DateTimeField(default=timezone.now, db_index=True, editable=False)

    class Meta:
        verbose_name = "notificação"
        verbose_name_plural = "notificações"
        ordering = ["-criado_em"]
        indexes = [models.Index(fields=["user", "lida", "-criado_em"])]

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.titulo}"


class RegraNotificacao(models.Model):
    """Configuração visual de alertas (RF-31)."""

    nome = models.CharField("nome", max_length=140)
    evento = models.CharField("evento", max_length=80, db_index=True)
    condicao_json = models.JSONField("condição", default=dict, blank=True)
    canais = models.JSONField("canais", default=list, blank=True)
    nivel = models.CharField(max_length=12, choices=NivelNotificacao.choices, default=NivelNotificacao.INFO)
    destinatarios = models.JSONField("destinatários", default=list, blank=True)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "regra de notificação"
        verbose_name_plural = "regras de notificação"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Atividade(models.Model):
    """Histórico de atividades em timeline visual (RF-37)."""

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="atividades")
    user_nome = models.CharField(max_length=180, blank=True, default="")
    user_cor = models.CharField(max_length=9, blank=True, default="#3B82F6")
    verbo = models.CharField("verbo", max_length=60)
    entidade = models.CharField("entidade", max_length=80, db_index=True)
    entidade_id = models.CharField(max_length=64, blank=True, default="")
    entidade_nome = models.CharField(max_length=200, blank=True, default="")
    projeto_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    meta = models.JSONField("metadados", default=dict, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, db_index=True, editable=False)

    class Meta:
        verbose_name = "atividade"
        verbose_name_plural = "atividades"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return f"{self.user_nome} {self.verbo} {self.entidade}"

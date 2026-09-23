"""Recursos (humanos e materiais), alocações e timesheet."""
from __future__ import annotations

from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import User
from apps.portfolio.models import Project
from apps.tasks.models import Task


class TipoRecurso(models.TextChoices):
    HUMANO = "HUMANO", "Humano"
    EQUIPAMENTO = "EQUIPAMENTO", "Equipamento"
    SOFTWARE = "SOFTWARE", "Software / Licença"
    INSTALACAO = "INSTALACAO", "Instalação"
    SERVICO = "SERVICO", "Serviço terceirizado"
    MATERIAL = "MATERIAL", "Material"


class ModalidadeAlocacao(models.TextChoices):
    PERFORMANCE = "PERFORMANCE", "Performance imediata"
    DESENVOLVIMENTO = "DESENVOLVIMENTO", "Desenvolvimento"
    MISTA = "MISTA", "Mista (sênior + júnior)"
    MANUAL = "MANUAL", "Manual"


class StatusAlocacao(models.TextChoices):
    PROPOSTA = "PROPOSTA", "Proposta"
    CONFIRMADA = "CONFIRMADA", "Confirmada"
    EM_EXECUCAO = "EM_EXECUCAO", "Em execução"
    CONCLUIDA = "CONCLUIDA", "Concluída"
    CANCELADA = "CANCELADA", "Cancelada"


class Recurso(models.Model):
    """Recurso material ou serviço, cadastrado em cards visuais (RF-13)."""

    nome = models.CharField("nome", max_length=180, db_index=True)
    tipo = models.CharField("tipo", max_length=16, choices=TipoRecurso.choices, default=TipoRecurso.EQUIPAMENTO)
    descricao = models.TextField("descrição", blank=True, default="")
    codigo = models.CharField("código/patrimônio", max_length=60, blank=True, default="")

    custo_hora = models.DecimalField("custo/hora (R$)", max_digits=12, decimal_places=2, default=0)
    custo_unitario = models.DecimalField("custo unitário (R$)", max_digits=12, decimal_places=2, default=0)
    unidade = models.CharField("unidade", max_length=24, default="unidade")
    quantidade_disponivel = models.DecimalField("quantidade disponível", max_digits=10, decimal_places=2, default=1)
    disponibilidade_percentual = models.PositiveSmallIntegerField(
        "disponibilidade (%)", default=100, validators=[MaxValueValidator(100)]
    )
    data_disponivel_de = models.DateField("disponível de", null=True, blank=True)
    data_disponivel_ate = models.DateField("disponível até", null=True, blank=True)

    fornecedor = models.CharField("fornecedor", max_length=180, blank=True, default="")
    localizacao = models.CharField("localização", max_length=140, blank=True, default="")
    ativo = models.BooleanField("ativo", default=True)

    cor = models.CharField("cor", max_length=9, default="#EC4899")
    icone = models.CharField("ícone", max_length=40, default="boxes")
    atributos = models.JSONField("atributos", default=dict, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "recurso"
        verbose_name_plural = "recursos"
        ordering = ["tipo", "nome"]
        indexes = [models.Index(fields=["tipo", "ativo"])]

    def __str__(self) -> str:
        return self.nome


class Alocacao(models.Model):
    """Alocação de pessoa ou recurso material em tarefa/projeto (RF-14)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="alocacoes")
    task = models.ForeignKey(
        Task, null=True, blank=True, on_delete=models.CASCADE, related_name="alocacoes"
    )
    user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.CASCADE, related_name="alocacoes"
    )
    recurso = models.ForeignKey(
        Recurso, null=True, blank=True, on_delete=models.CASCADE, related_name="alocacoes"
    )
    percentual = models.PositiveSmallIntegerField(
        "percentual de dedicação", default=100, validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    horas_planejadas = models.DecimalField("horas planejadas", max_digits=10, decimal_places=2, default=0)
    data_inicio = models.DateField("início", db_index=True)
    data_fim = models.DateField("fim", db_index=True)

    status = models.CharField(max_length=16, choices=StatusAlocacao.choices, default=StatusAlocacao.CONFIRMADA, db_index=True)
    modalidade = models.CharField(max_length=20, choices=ModalidadeAlocacao.choices, default=ModalidadeAlocacao.MANUAL)
    papel = models.CharField("papel no projeto", max_length=120, blank=True, default="")
    justificativa = models.TextField("justificativa", blank=True, default="")
    score_matching = models.FloatField("score do motor de alocação", null=True, blank=True)
    override_manual = models.BooleanField("sobrepôs a recomendação", default=False)
    aprovado_por = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="alocacoes_aprovadas"
    )
    criado_por = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="alocacoes_criadas"
    )
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "alocação"
        verbose_name_plural = "alocações"
        ordering = ["data_inicio", "user__nome"]
        indexes = [
            models.Index(fields=["user", "data_inicio", "data_fim"]),
            models.Index(fields=["project", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(user__isnull=False) | models.Q(recurso__isnull=False),
                name="alocacao_exige_user_ou_recurso",
            )
        ]

    def __str__(self) -> str:
        alvo = self.user.nome if self.user_id else (self.recurso.nome if self.recurso_id else "?")
        return f"{alvo} → {self.task.nome if self.task_id else self.project.nome} ({self.percentual}%)"

    @property
    def dias(self) -> int:
        return (self.data_fim - self.data_inicio).days + 1

    @property
    def horas(self) -> float:
        if self.horas_planejadas:
            return float(self.horas_planejadas)
        if not self.user_id:
            return 0.0
        return self.user.capacidade_periodo(self.data_inicio, self.data_fim) * (self.percentual / 100.0)

    @property
    def custo_estimado(self) -> Decimal:
        if self.recurso_id:
            return (self.recurso.custo_hora or Decimal("0")) * Decimal(str(self.horas))
        if self.user_id:
            return (self.user.custo_hora or Decimal("0")) * Decimal(str(self.horas))
        return Decimal("0")

    @property
    def vigente(self) -> bool:
        hoje = timezone.localdate()
        return self.data_inicio <= hoje <= self.data_fim and self.status in {
            StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO
        }


class Timesheet(models.Model):
    """Apontamento de horas (RF-16)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="apontamentos")
    task = models.ForeignKey(Task, null=True, blank=True, on_delete=models.CASCADE, related_name="apontamentos")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="apontamentos")
    data = models.DateField("data", db_index=True)
    horas = models.DecimalField("horas", max_digits=6, decimal_places=2)
    descricao = models.TextField("descrição", blank=True, default="")
    atividade = models.CharField("atividade", max_length=80, blank=True, default="")
    aprovado = models.BooleanField("aprovado", default=False, db_index=True)
    aprovador = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="apontamentos_aprovados"
    )
    aprovado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "apontamento de horas"
        verbose_name_plural = "apontamentos de horas"
        ordering = ["-data", "user__nome"]
        indexes = [
            models.Index(fields=["user", "data"]),
            models.Index(fields=["project", "data"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.data:%d/%m/%Y} · {self.horas}h"

    @property
    def custo(self) -> Decimal:
        return (self.user.custo_hora or Decimal("0")) * Decimal(str(self.horas))


class CapacidadeSemanal(models.Model):
    """Exceção de capacidade (férias, afastamento, horas extras) por semana."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="capacidades_semanais")
    semana_inicio = models.DateField("início da semana")
    horas_disponiveis = models.DecimalField("horas disponíveis", max_digits=5, decimal_places=2, default=40)
    motivo = models.CharField("motivo", max_length=120, blank=True, default="")
    observacao = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "capacidade semanal"
        verbose_name_plural = "capacidades semanais"
        unique_together = ("user", "semana_inicio")
        ordering = ["-semana_inicio"]

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.semana_inicio:%d/%m/%Y} · {self.horas_disponiveis}h"

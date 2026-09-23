"""Orçamento, lançamentos financeiros e EVM."""
from __future__ import annotations

from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.core.models import User
from apps.portfolio.models import Project


class TipoCusto(models.TextChoices):
    CAPEX = "CAPEX", "CAPEX (investimento)"
    OPEX = "OPEX", "OPEX (operacional)"


class TipoLancamento(models.TextChoices):
    DESPESA = "DESPESA", "Despesa"
    RECEITA = "RECEITA", "Receita"


class StatusLancamento(models.TextChoices):
    PREVISTO = "PREVISTO", "Previsto"
    COMPROMETIDO = "COMPROMETIDO", "Comprometido"
    REALIZADO = "REALIZADO", "Realizado"
    CANCELADO = "CANCELADO", "Cancelado"


class Orcamento(models.Model):
    """Linha orçamentária do projeto (RF-18)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="orcamentos")
    categoria = models.CharField("categoria", max_length=120)
    tipo = models.CharField("tipo", max_length=8, choices=TipoCusto.choices, default=TipoCusto.OPEX)
    centro_custo = models.CharField("centro de custo", max_length=80, blank=True, default="")
    valor_planejado = models.DecimalField("valor planejado (R$)", max_digits=16, decimal_places=2, default=0)
    valor_realizado = models.DecimalField("valor realizado (R$)", max_digits=16, decimal_places=2, default=0)
    valor_comprometido = models.DecimalField("valor comprometido (R$)", max_digits=16, decimal_places=2, default=0)
    cor = models.CharField("cor", max_length=9, default="#3B82F6")
    icone = models.CharField("ícone", max_length=40, default="wallet")
    observacao = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "orçamento"
        verbose_name_plural = "orçamentos"
        ordering = ["project", "categoria"]
        unique_together = ("project", "categoria", "tipo")

    def __str__(self) -> str:
        return f"{self.project.nome} · {self.categoria}"

    @property
    def saldo(self) -> Decimal:
        return (self.valor_planejado or Decimal("0")) - (self.valor_realizado or Decimal("0"))

    @property
    def consumo_percentual(self) -> float:
        if not self.valor_planejado:
            return 0.0
        return round(float(self.valor_realizado) / float(self.valor_planejado) * 100, 2)

    @property
    def situacao(self) -> str:
        pct = self.consumo_percentual
        return "VERDE" if pct <= 90 else "AMARELO" if pct <= 100 else "VERMELHO"


class Lancamento(models.Model):
    """Despesa ou receita do projeto (RF-19)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="lancamentos")
    orcamento = models.ForeignKey(
        Orcamento, null=True, blank=True, on_delete=models.SET_NULL, related_name="lancamentos"
    )
    tipo = models.CharField("tipo", max_length=10, choices=TipoLancamento.choices, default=TipoLancamento.DESPESA, db_index=True)
    categoria = models.CharField("categoria", max_length=120, blank=True, default="")
    descricao = models.CharField("descrição", max_length=250)
    valor = models.DecimalField("valor (R$)", max_digits=16, decimal_places=2)
    data_competencia = models.DateField("data de competência", db_index=True)
    data_pagamento = models.DateField("data de pagamento", null=True, blank=True)
    status = models.CharField(max_length=16, choices=StatusLancamento.choices, default=StatusLancamento.REALIZADO, db_index=True)

    fornecedor = models.CharField("fornecedor/cliente", max_length=180, blank=True, default="")
    documento = models.CharField("documento/NF", max_length=80, blank=True, default="")
    centro_custo = models.CharField("centro de custo", max_length=80, blank=True, default="")
    recorrente = models.BooleanField("recorrente", default=False)
    observacao = models.TextField(blank=True, default="")

    criado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="lancamentos_criados")
    aprovado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="lancamentos_aprovados")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "lançamento"
        verbose_name_plural = "lançamentos"
        ordering = ["-data_competencia"]
        indexes = [
            models.Index(fields=["project", "tipo", "status"]),
            models.Index(fields=["data_competencia"]),
        ]

    def __str__(self) -> str:
        sinal = "-" if self.tipo == TipoLancamento.DESPESA else "+"
        return f"{sinal} R$ {self.valor} · {self.descricao}"

    @property
    def impacto(self) -> Decimal:
        return -self.valor if self.tipo == TipoLancamento.DESPESA else self.valor


class PrevisaoFluxoCaixa(models.Model):
    """Projeção de fluxo de caixa por período (RF-22)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="previsoes_caixa")
    periodo = models.CharField("período (AAAA-MM)", max_length=7, db_index=True)
    entradas_previstas = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    saidas_previstas = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    entradas_realizadas = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    saidas_realizadas = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    metodo = models.CharField("método", max_length=40, default="TENDENCIA")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "previsão de fluxo de caixa"
        verbose_name_plural = "previsões de fluxo de caixa"
        unique_together = ("project", "periodo")
        ordering = ["periodo"]

    def __str__(self) -> str:
        return f"{self.project.nome} · {self.periodo}"

    @property
    def saldo_previsto(self) -> Decimal:
        return (self.entradas_previstas or Decimal("0")) - (self.saidas_previstas or Decimal("0"))

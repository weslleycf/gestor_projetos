"""Modelos analíticos: previsões de projeto e auditorias de viés (Fase 4)."""
from __future__ import annotations

from django.db import models
from django.utils import timezone

from apps.core.models import User
from apps.portfolio.models import Project


class MetodoPrevisao(models.TextChoices):
    """Métodos preditivos suportados pelo módulo de analytics."""

    MONTE_CARLO = "MONTE_CARLO", "Simulação de Monte Carlo"
    REGRESSAO = "REGRESSAO", "Regressão linear de progresso"
    EVM = "EVM", "Valor agregado (EVM)"


class PrevisaoProjeto(models.Model):
    """Resultado de uma previsão de prazo e custo, guardado para auditoria e comparação histórica."""

    project = models.ForeignKey(
        Project, verbose_name="projeto", on_delete=models.CASCADE, related_name="previsoes"
    )
    data_referencia = models.DateField("data de referência", default=timezone.localdate, db_index=True)
    metodo = models.CharField(
        "método", max_length=16, choices=MetodoPrevisao.choices,
        default=MetodoPrevisao.MONTE_CARLO, db_index=True,
    )

    prazo_p10 = models.DateField("prazo P10", null=True, blank=True)
    prazo_p50 = models.DateField("prazo P50", null=True, blank=True)
    prazo_p80 = models.DateField("prazo P80", null=True, blank=True)
    prazo_p90 = models.DateField("prazo P90", null=True, blank=True)
    dias_desvio_p50 = models.IntegerField("desvio do P50 sobre o prazo planejado (dias)", default=0)
    probabilidade_atraso = models.FloatField("probabilidade de atraso", default=0)

    custo_p50 = models.DecimalField("custo final P50 (R$)", max_digits=16, decimal_places=2, default=0)
    custo_p80 = models.DecimalField("custo final P80 (R$)", max_digits=16, decimal_places=2, default=0)
    custo_p90 = models.DecimalField("custo final P90 (R$)", max_digits=16, decimal_places=2, default=0)
    probabilidade_estouro = models.FloatField("probabilidade de estouro de orçamento", default=0)

    indice_confianca = models.FloatField("índice de confiança do dado de entrada", default=0)
    fatores = models.JSONField("fatores de risco explicáveis", default=list, blank=True)
    premissas = models.JSONField("premissas da previsão", default=list, blank=True)

    criado_por = models.ForeignKey(
        User, verbose_name="criado por", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="previsoes_criadas",
    )
    criado_em = models.DateTimeField("criado em", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "previsão de projeto"
        verbose_name_plural = "previsões de projeto"
        ordering = ["-data_referencia", "-criado_em"]
        indexes = [models.Index(fields=["project", "-data_referencia"])]

    def __str__(self) -> str:
        return f"{self.project.nome} · {self.get_metodo_display()} · {self.data_referencia:%d/%m/%Y}"

    @property
    def faixa_prazo_dias(self) -> int | None:
        """Amplitude, em dias, entre o cenário otimista (P10) e o pessimista (P90)."""
        if not (self.prazo_p10 and self.prazo_p90):
            return None
        return (self.prazo_p90 - self.prazo_p10).days

    @property
    def nivel_risco(self) -> str:
        """Leitura executiva da probabilidade de atraso."""
        if self.probabilidade_atraso >= 0.75:
            return "CRITICO"
        if self.probabilidade_atraso >= 0.5:
            return "ALTO"
        if self.probabilidade_atraso >= 0.25:
            return "MEDIO"
        return "BAIXO"


class MetricaVies(models.TextChoices):
    """Métricas comparadas entre grupos na auditoria de imparcialidade (RNF-18)."""

    TAXA_SELECAO = "TAXA_SELECAO", "Taxa de seleção"
    SCORE_MEDIO = "SCORE_MEDIO", "Score médio recebido"
    OVERRIDE = "OVERRIDE", "Taxa de override do gestor"
    DISTRIBUICAO_AREA = "DISTRIBUICAO_AREA", "Distribuição por área"
    DISTRIBUICAO_LOCAL = "DISTRIBUICAO_LOCAL", "Distribuição por localização"
    TEMPO_DE_CASA = "TEMPO_DE_CASA", "Distribuição por tempo de casa"


class SeveridadeVies(models.TextChoices):
    """Classificação da disparidade entre o grupo analisado e a média geral."""

    OK = "OK", "Sem disparidade relevante"
    ATENCAO = "ATENCAO", "Atenção"
    CRITICO = "CRITICO", "Crítico"


class AuditoriaVies(models.Model):
    """Resultado da auditoria de imparcialidade das recomendações de alocação (RNF-18, §9.4).

    Mede disparidade estatística entre grupos de colaboradores. Não é prova de
    discriminação e exige revisão humana antes de qualquer decisão sobre pessoas.
    """

    periodo_inicio = models.DateField("início do período", db_index=True)
    periodo_fim = models.DateField("fim do período", db_index=True)
    metrica = models.CharField("métrica", max_length=20, choices=MetricaVies.choices, db_index=True)
    grupo = models.CharField("grupo analisado", max_length=140, db_index=True)
    tamanho_grupo = models.IntegerField("tamanho da amostra do grupo", default=0)
    valor_grupo = models.FloatField("valor observado no grupo", default=0)
    valor_referencia = models.FloatField("valor de referência (média geral)", default=0)
    disparidade = models.FloatField("disparidade relativa à referência", default=0)
    severidade = models.CharField(
        "severidade", max_length=10, choices=SeveridadeVies.choices,
        default=SeveridadeVies.OK, db_index=True,
    )
    recomendacao = models.TextField("recomendação acionável", blank=True, default="")
    detalhes = models.JSONField("detalhes da apuração", default=dict, blank=True)
    criado_em = models.DateTimeField("criado em", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "auditoria de viés"
        verbose_name_plural = "auditorias de viés"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return f"{self.get_metrica_display()} · {self.grupo} · {self.get_severidade_display()}"

    @property
    def disparidade_percentual(self) -> float:
        """Disparidade em pontos percentuais, para leitura executiva."""
        return round(self.disparidade * 100, 1)

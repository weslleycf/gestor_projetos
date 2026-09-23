"""Riscos, issues, ações corretivas e mudanças."""
from __future__ import annotations

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import User
from apps.portfolio.models import Prioridade, Project


class CategoriaRisco(models.TextChoices):
    ESCOPO = "ESCOPO", "Escopo"
    PRAZO = "PRAZO", "Prazo"
    CUSTO = "CUSTO", "Custo"
    QUALIDADE = "QUALIDADE", "Qualidade"
    RECURSOS = "RECURSOS", "Recursos / Capacidades"
    TECNICO = "TECNICO", "Técnico"
    REGULATORIO = "REGULATORIO", "Regulatório / Compliance"
    SEGURANCA = "SEGURANCA", "Segurança da informação"
    FORNECEDOR = "FORNECEDOR", "Fornecedor"
    MERCADO = "MERCADO", "Mercado"
    PESSOAS = "PESSOAS", "Pessoas"
    OUTRO = "OUTRO", "Outro"


class EstrategiaResposta(models.TextChoices):
    EVITAR = "EVITAR", "Evitar"
    MITIGAR = "MITIGAR", "Mitigar"
    TRANSFERIR = "TRANSFERIR", "Transferir"
    ACEITAR = "ACEITAR", "Aceitar"
    EXPLORAR = "EXPLORAR", "Explorar (oportunidade)"
    ELEVAR = "ELEVAR", "Elevar (oportunidade)"
    COMPARTILHAR = "COMPARTILHAR", "Compartilhar"


class StatusRisco(models.TextChoices):
    IDENTIFICADO = "IDENTIFICADO", "Identificado"
    EM_ANALISE = "EM_ANALISE", "Em análise"
    PLANEJADO = "PLANEJADO", "Com resposta planejada"
    MITIGANDO = "MITIGANDO", "Mitigação em curso"
    MONITORANDO = "MONITORANDO", "Monitorando"
    OCORRIDO = "OCORRIDO", "Ocorrido"
    ENCERRADO = "ENCERRADO", "Encerrado"


NIVEIS_SEVERIDADE = [
    (4, "BAIXO", "Baixo", "#10B981"),
    (9, "MEDIO", "Médio", "#F59E0B"),
    (16, "ALTO", "Alto", "#F97316"),
    (25, "EXTREMO", "Extremo", "#EF4444"),
]


def classificar_severidade(valor: int) -> tuple[str, str, str]:
    for limite, chave, rotulo, cor in NIVEIS_SEVERIDADE:
        if valor <= limite:
            return chave, rotulo, cor
    return "EXTREMO", "Extremo", "#EF4444"


class Risk(models.Model):
    """Risco do projeto posicionado na matriz probabilidade × impacto (RF-23)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="riscos")
    codigo = models.CharField("código", max_length=30, blank=True, default="")
    descricao = models.TextField("descrição")
    causa = models.TextField("causa raiz", blank=True, default="")
    efeito = models.TextField("efeito potencial", blank=True, default="")
    categoria = models.CharField("categoria", max_length=16, choices=CategoriaRisco.choices, default=CategoriaRisco.OUTRO, db_index=True)

    probabilidade = models.PositiveSmallIntegerField(
        "probabilidade (1-5)", default=3, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    impacto = models.PositiveSmallIntegerField(
        "impacto (1-5)", default=3, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    severidade = models.PositiveSmallIntegerField("severidade (P×I)", default=9, db_index=True)
    nivel = models.CharField("nível", max_length=12, default="MEDIO", db_index=True)
    cor = models.CharField("cor", max_length=9, default="#F59E0B")

    prob_residual = models.PositiveSmallIntegerField("probabilidade residual", default=0)
    imp_residual = models.PositiveSmallIntegerField("impacto residual", default=0)
    severidade_residual = models.PositiveSmallIntegerField("severidade residual", default=0)

    estrategia = models.CharField("estratégia", max_length=16, choices=EstrategiaResposta.choices, default=EstrategiaResposta.MITIGAR)
    plano_resposta = models.TextField("plano de resposta", blank=True, default="")
    contingencia = models.TextField("plano de contingência", blank=True, default="")
    responsavel = models.ForeignKey(
        User, verbose_name="responsável", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="riscos",
    )
    status = models.CharField(max_length=16, choices=StatusRisco.choices, default=StatusRisco.IDENTIFICADO, db_index=True)

    data_identificacao = models.DateField("identificado em", default=timezone.localdate)
    data_limite = models.DateField("prazo da resposta", null=True, blank=True)
    data_encerramento = models.DateField("encerrado em", null=True, blank=True)
    custo_mitigacao = models.DecimalField("custo da mitigação (R$)", max_digits=14, decimal_places=2, default=0)
    valor_monetario_esperado = models.DecimalField("valor monetário esperado (R$)", max_digits=14, decimal_places=2, default=0)

    # Posição livre na matriz (permite arrastar com precisão visual)
    posicao_matriz_x = models.FloatField("posição X na matriz", null=True, blank=True)
    posicao_matriz_y = models.FloatField("posição Y na matriz", null=True, blank=True)

    gatilhos = models.JSONField("gatilhos de monitoramento", default=list, blank=True)
    tags = models.JSONField("etiquetas", default=list, blank=True)
    criado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="riscos_criados")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "risco"
        verbose_name_plural = "riscos"
        ordering = ["-severidade", "-atualizado_em"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["severidade"]),
        ]

    def __str__(self) -> str:
        return f"[{self.nivel}] {self.descricao[:60]}"

    def save(self, *args, **kwargs):
        self.severidade = (self.probabilidade or 1) * (self.impacto or 1)
        chave, _rotulo, cor = classificar_severidade(self.severidade)
        self.nivel = chave
        self.cor = cor
        self.severidade_residual = (self.prob_residual or 0) * (self.imp_residual or 0)
        if not self.codigo:
            total = Risk.objects.filter(project=self.project).count() + 1
            self.codigo = f"R-{total:03d}"
        super().save(*args, **kwargs)

    @property
    def exposicao(self) -> float:
        """Exposição = probabilidade normalizada × impacto financeiro estimado."""
        if self.custo_mitigacao:
            return round((self.probabilidade / 5) * float(self.custo_mitigacao), 2)
        return round((self.severidade / 25) * 100, 2)

    @property
    def atrasado(self) -> bool:
        return bool(
            self.data_limite and self.data_limite < timezone.localdate()
            and self.status not in {StatusRisco.ENCERRADO}
        )

    @property
    def reducao_severidade(self) -> int:
        return max(0, self.severidade - self.severidade_residual)


class RiskHistory(models.Model):
    """Histórico de mudanças para o heatmap evolutivo (RF-26)."""

    risk = models.ForeignKey(Risk, on_delete=models.CASCADE, related_name="historico")
    probabilidade = models.PositiveSmallIntegerField()
    impacto = models.PositiveSmallIntegerField()
    severidade = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=16, choices=StatusRisco.choices)
    comentario = models.TextField(blank=True, default="")
    registrado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="historico_riscos")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "histórico de risco"
        verbose_name_plural = "históricos de risco"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return f"{self.risk.codigo} · {self.severidade}"


class TipoIssue(models.TextChoices):
    ISSUE = "ISSUE", "Issue"
    ACAO_CORRETIVA = "ACAO_CORRETIVA", "Ação corretiva"
    MUDANCA = "MUDANCA", "Solicitação de mudança"
    IMPEDIMENTO = "IMPEDIMENTO", "Impedimento"
    DECISAO = "DECISAO", "Decisão pendente"


class StatusIssue(models.TextChoices):
    ABERTA = "ABERTA", "Aberta"
    TRIAGEM = "TRIAGEM", "Em triagem"
    EM_ANALISE = "EM_ANALISE", "Em análise"
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    AGUARDANDO = "AGUARDANDO", "Aguardando terceiros"
    RESOLVIDA = "RESOLVIDA", "Resolvida"
    FECHADA = "FECHADA", "Fechada"
    CANCELADA = "CANCELADA", "Cancelada"


class Issue(models.Model):
    """Issue / ação corretiva / mudança com Kanban dedicado (RF-25)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="issues")
    risk = models.ForeignKey(Risk, null=True, blank=True, on_delete=models.SET_NULL, related_name="issues")
    codigo = models.CharField("código", max_length=30, blank=True, default="")
    titulo = models.CharField("título", max_length=240)
    descricao = models.TextField("descrição", blank=True, default="")
    tipo = models.CharField("tipo", max_length=16, choices=TipoIssue.choices, default=TipoIssue.ISSUE, db_index=True)
    prioridade = models.CharField(max_length=12, choices=Prioridade.choices, default=Prioridade.MEDIA, db_index=True)
    status = models.CharField(max_length=16, choices=StatusIssue.choices, default=StatusIssue.ABERTA, db_index=True)
    impacto = models.TextField("impacto", blank=True, default="")
    solucao = models.TextField("solução aplicada", blank=True, default="")

    responsavel = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="issues")
    reportado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="issues_reportadas")
    data_abertura = models.DateField("aberta em", default=timezone.localdate, db_index=True)
    data_limite = models.DateField("prazo", null=True, blank=True)
    data_resolucao = models.DateField("resolvida em", null=True, blank=True)
    esforco_estimado = models.DecimalField("esforço estimado (h)", max_digits=8, decimal_places=2, default=0)
    custo_estimado = models.DecimalField("custo estimado (R$)", max_digits=14, decimal_places=2, default=0)

    posicao_visual = models.FloatField("posição no Kanban", default=1000.0)
    cor = models.CharField("cor", max_length=9, default="#EF4444")
    icone = models.CharField("ícone", max_length=40, default="alert-circle")
    tags = models.JSONField("etiquetas", default=list, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "issue"
        verbose_name_plural = "issues"
        ordering = ["-prioridade", "-data_abertura"]
        indexes = [models.Index(fields=["project", "status"]), models.Index(fields=["tipo", "status"])]

    def __str__(self) -> str:
        return f"{self.codigo or self.id} · {self.titulo}"

    def save(self, *args, **kwargs):
        if not self.codigo:
            total = Issue.objects.filter(project=self.project).count() + 1
            prefixo = {"ISSUE": "I", "ACAO_CORRETIVA": "AC", "MUDANCA": "M", "IMPEDIMENTO": "IM", "DECISAO": "D"}.get(self.tipo, "I")
            self.codigo = f"{prefixo}-{total:03d}"
        if self.status in {StatusIssue.RESOLVIDA, StatusIssue.FECHADA} and not self.data_resolucao:
            self.data_resolucao = timezone.localdate()
        super().save(*args, **kwargs)

    @property
    def idade_dias(self) -> int:
        fim = self.data_resolucao or timezone.localdate()
        return (fim - self.data_abertura).days

    @property
    def atrasada(self) -> bool:
        return bool(
            self.data_limite and self.data_limite < timezone.localdate()
            and self.status not in {StatusIssue.RESOLVIDA, StatusIssue.FECHADA, StatusIssue.CANCELADA}
        )

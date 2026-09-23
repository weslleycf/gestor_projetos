"""Portfólio, programas, projetos, marcos, KPIs, baselines e workflows."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import User


class StatusPortfolio(models.TextChoices):
    ATIVO = "ATIVO", "Ativo"
    SUSPENSO = "SUSPENSO", "Suspenso"
    ENCERRADO = "ENCERRADO", "Encerrado"


class Portfolio(models.Model):
    nome = models.CharField("nome", max_length=180)
    descricao = models.TextField("descrição", blank=True, default="")
    objetivo_estrategico = models.TextField("objetivo estratégico", blank=True, default="")
    responsavel = models.ForeignKey(
        User, verbose_name="responsável", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="portfolios",
    )
    cor = models.CharField("cor", max_length=9, default="#3B82F6")
    icone = models.CharField("ícone", max_length=40, default="briefcase")
    status = models.CharField(max_length=20, choices=StatusPortfolio.choices, default=StatusPortfolio.ATIVO)
    orcamento_anual = models.DecimalField("orçamento anual (R$)", max_digits=16, decimal_places=2, default=0)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "portfólio"
        verbose_name_plural = "portfólios"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class StatusPrograma(models.TextChoices):
    PLANEJADO = "PLANEJADO", "Planejado"
    ATIVO = "ATIVO", "Ativo"
    PAUSADO = "PAUSADO", "Pausado"
    CONCLUIDO = "CONCLUIDO", "Concluído"
    CANCELADO = "CANCELADO", "Cancelado"


class Program(models.Model):
    portfolio = models.ForeignKey(
        Portfolio, verbose_name="portfólio", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="programas",
    )
    nome = models.CharField("nome", max_length=180)
    descricao = models.TextField("descrição", blank=True, default="")
    gerente = models.ForeignKey(
        User, verbose_name="gerente", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="programas_gerenciados",
    )
    status = models.CharField(max_length=20, choices=StatusPrograma.choices, default=StatusPrograma.PLANEJADO)
    data_inicio = models.DateField("início", null=True, blank=True)
    data_fim = models.DateField("fim", null=True, blank=True)
    cor = models.CharField("cor", max_length=9, default="#8B5CF6")
    icone = models.CharField("ícone", max_length=40, default="layers")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "programa"
        verbose_name_plural = "programas"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class StatusProjeto(models.TextChoices):
    IDEIA = "IDEIA", "Ideia"
    PLANEJADO = "PLANEJADO", "Planejado"
    EM_ANALISE = "EM_ANALISE", "Em análise"
    APROVADO = "APROVADO", "Aprovado"
    EM_EXECUCAO = "EM_EXECUCAO", "Em execução"
    PAUSADO = "PAUSADO", "Pausado"
    CONCLUIDO = "CONCLUIDO", "Concluído"
    CANCELADO = "CANCELADO", "Cancelado"
    ARQUIVADO = "ARQUIVADO", "Arquivado"


class Saude(models.TextChoices):
    VERDE = "VERDE", "No prazo"
    AMARELO = "AMARELO", "Atenção"
    VERMELHO = "VERMELHO", "Crítico"
    CINZA = "CINZA", "Não avaliado"


class Prioridade(models.TextChoices):
    BAIXA = "BAIXA", "Baixa"
    MEDIA = "MEDIA", "Média"
    ALTA = "ALTA", "Alta"
    CRITICA = "CRITICA", "Crítica"


class Criticidade(models.TextChoices):
    BAIXA = "BAIXA", "Baixa"
    MEDIA = "MEDIA", "Média"
    ALTA = "ALTA", "Alta"
    ESTRATEGICA = "ESTRATEGICA", "Estratégica"


class ProjectQuerySet(models.QuerySet):
    def ativos(self):
        return self.exclude(status__in=[StatusProjeto.CONCLUIDO, StatusProjeto.CANCELADO, StatusProjeto.ARQUIVADO])

    def em_risco(self):
        return self.filter(saude__in=[Saude.AMARELO, Saude.VERMELHO]).ativos()


class Project(models.Model):
    """Projeto — entidade central do SGP."""

    codigo = models.CharField("código", max_length=40, blank=True, default="", db_index=True)
    nome = models.CharField("nome", max_length=200, db_index=True)
    descricao = models.TextField("descrição", blank=True, default="")
    objetivo = models.TextField("objetivo", blank=True, default="")

    portfolio = models.ForeignKey(
        Portfolio, null=True, blank=True, on_delete=models.SET_NULL, related_name="projetos"
    )
    program = models.ForeignKey(
        Program, verbose_name="programa", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="projetos",
    )
    projeto_pai = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="subprojetos"
    )
    sponsor = models.ForeignKey(
        User, verbose_name="patrocinador", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="projetos_patrocinados",
    )
    manager = models.ForeignKey(
        User, verbose_name="gerente", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="projetos_gerenciados",
    )

    data_inicio = models.DateField("início planejado", null=True, blank=True)
    data_fim = models.DateField("fim planejado", null=True, blank=True, db_index=True)
    data_inicio_real = models.DateField("início real", null=True, blank=True)
    data_fim_real = models.DateField("fim real", null=True, blank=True)

    orcamento = models.DecimalField("orçamento (R$)", max_digits=16, decimal_places=2, default=Decimal("0"))
    orcamento_capex = models.DecimalField("CAPEX (R$)", max_digits=16, decimal_places=2, default=Decimal("0"))
    orcamento_opex = models.DecimalField("OPEX (R$)", max_digits=16, decimal_places=2, default=Decimal("0"))
    custo_real = models.DecimalField("custo real (R$)", max_digits=16, decimal_places=2, default=Decimal("0"))
    receita_prevista = models.DecimalField("receita prevista (R$)", max_digits=16, decimal_places=2, default=Decimal("0"))

    status = models.CharField(max_length=20, choices=StatusProjeto.choices, default=StatusProjeto.PLANEJADO, db_index=True)
    prioridade = models.CharField(max_length=12, choices=Prioridade.choices, default=Prioridade.MEDIA, db_index=True)
    saude = models.CharField(max_length=12, choices=Saude.choices, default=Saude.CINZA, db_index=True)
    criticidade = models.CharField(max_length=16, choices=Criticidade.choices, default=Criticidade.MEDIA)
    categoria = models.CharField("categoria", max_length=80, blank=True, default="", db_index=True)
    area = models.CharField("área", max_length=120, blank=True, default="", db_index=True)
    tags = models.JSONField("etiquetas", default=list, blank=True)

    percentual_conclusao = models.PositiveSmallIntegerField(
        "percentual de conclusão", default=0, validators=[MaxValueValidator(100)]
    )
    progresso_manual = models.BooleanField("progresso informado manualmente", default=False)
    esforco_estimado_horas = models.DecimalField(
        "esforço estimado (h)", max_digits=10, decimal_places=2, default=0
    )

    # Identidade visual (RF-01)
    icone = models.CharField("ícone", max_length=40, default="folder-kanban")
    cor = models.CharField("cor", max_length=9, default="#3B82F6")
    capa = models.ImageField("capa", upload_to="projetos/capas/", blank=True, null=True)

    arquivado = models.BooleanField("arquivado", default=False)
    licoes_aprendidas = models.TextField("lições aprendidas", blank=True, default="")
    criado_por = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="projetos_criados"
    )
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    objects = ProjectQuerySet.as_manager()

    class Meta:
        verbose_name = "projeto"
        verbose_name_plural = "projetos"
        ordering = ["-prioridade", "nome"]
        indexes = [
            models.Index(fields=["status", "saude"]),
            models.Index(fields=["data_fim"]),
        ]

    def __str__(self) -> str:
        return f"{self.codigo + ' · ' if self.codigo else ''}{self.nome}"

    def save(self, *args, **kwargs):
        if not self.codigo:
            ano = (self.data_inicio or timezone.localdate()).year
            ultimo = Project.objects.filter(codigo__startswith=f"PRJ-{ano}-").count() + 1
            self.codigo = f"PRJ-{ano}-{ultimo:03d}"
        super().save(*args, **kwargs)

    # ---------------------------------------------------------------- prazos
    @property
    def dias_restantes(self) -> int | None:
        if not self.data_fim:
            return None
        return (self.data_fim - timezone.localdate()).days

    @property
    def atrasado(self) -> bool:
        return bool(self.data_fim and self.data_fim < timezone.localdate()
                    and self.status not in {StatusProjeto.CONCLUIDO, StatusProjeto.CANCELADO})

    @property
    def duracao_dias(self) -> int:
        if not (self.data_inicio and self.data_fim):
            return 0
        return (self.data_fim - self.data_inicio).days + 1

    @property
    def progresso_planejado(self) -> float:
        """Percentual que deveria estar concluído hoje (base do SPI temporal)."""
        if not (self.data_inicio and self.data_fim) or self.duracao_dias <= 0:
            return 0.0
        decorrido = (timezone.localdate() - self.data_inicio).days + 1
        return round(max(0.0, min(1.0, decorrido / self.duracao_dias)) * 100, 2)

    def calcular_progresso(self, salvar: bool = True) -> int:
        """Progresso ponderado pelo esforço das tarefas folha."""
        if self.progresso_manual:
            return self.percentual_conclusao
        folhas = self.tarefas.filter(parent__isnull=True) if hasattr(self, "tarefas") else None
        tarefas = list(self.tarefas.all())
        if not tarefas:
            return self.percentual_conclusao
        peso_total = sum(float(t.esforco_estimado or 0) or 1.0 for t in tarefas)
        if peso_total <= 0:
            return self.percentual_conclusao
        acumulado = sum(
            (float(t.esforco_estimado or 0) or 1.0) * (t.percentual_conclusao / 100.0) for t in tarefas
        )
        novo = int(round(acumulado / peso_total * 100))
        if salvar and novo != self.percentual_conclusao:
            self.percentual_conclusao = novo
            self.save(update_fields=["percentual_conclusao", "atualizado_em"])
        return novo

    def recalcular_saude(self, salvar: bool = True) -> str:
        """Semáforo de saúde do projeto (RF-29)."""
        from django.conf import settings as dj_settings

        cfg = dj_settings.SGP
        if self.status in {StatusProjeto.CONCLUIDO, StatusProjeto.CANCELADO, StatusProjeto.ARQUIVADO}:
            saude = Saude.CINZA
        else:
            planejado = self.progresso_planejado
            real = float(self.percentual_conclusao)
            desvio = (planejado - real) / 100.0
            riscos_criticos = self.riscos.filter(severidade__gte=15, status="ABERTO").count() if hasattr(self, "riscos") else 0
            estourado = float(self.custo_real) > float(self.orcamento) > 0
            if self.atrasado or desvio > 0.20 or riscos_criticos >= 3 or estourado:
                saude = Saude.VERMELHO
            elif desvio > 0.08 or riscos_criticos >= 1:
                saude = Saude.AMARELO
            else:
                saude = Saude.VERDE
        if salvar and saude != self.saude:
            self.saude = saude
            self.save(update_fields=["saude", "atualizado_em"])
        return saude

    # ------------------------------------------------------------------- EVM
    def evm(self, data_referencia=None) -> dict:
        """Earned Value Management — PV, EV, AC, CPI, SPI, EAC, VAC (RF-21)."""
        from apps.finance.services import calcular_evm

        return calcular_evm(self, data_referencia=data_referencia)


class StatusMarco(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    CONCLUIDO = "CONCLUIDO", "Concluído"
    ATRASADO = "ATRASADO", "Atrasado"
    CANCELADO = "CANCELADO", "Cancelado"


class Milestone(models.Model):
    """Marco do projeto (RF-03) exibido no Gantt e no calendário."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="marcos")
    nome = models.CharField("nome", max_length=200)
    descricao = models.TextField(blank=True, default="")
    data_prevista = models.DateField("data prevista", db_index=True)
    data_real = models.DateField("data real", null=True, blank=True)
    status = models.CharField(max_length=16, choices=StatusMarco.choices, default=StatusMarco.PENDENTE, db_index=True)
    critico = models.BooleanField("marco crítico", default=False)
    responsavel = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="marcos"
    )
    cor = models.CharField("cor", max_length=9, default="#F59E0B")
    icone = models.CharField("ícone", max_length=40, default="flag")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "marco"
        verbose_name_plural = "marcos"
        ordering = ["data_prevista"]

    def __str__(self) -> str:
        return f"{self.nome} ({self.data_prevista:%d/%m/%Y})"

    @property
    def atrasado(self) -> bool:
        return self.status != StatusMarco.CONCLUIDO and self.data_prevista < timezone.localdate()

    def save(self, *args, **kwargs):
        if self.data_real and self.status == StatusMarco.PENDENTE:
            self.status = StatusMarco.CONCLUIDO
        super().save(*args, **kwargs)


class KPI(models.Model):
    """Indicador do projeto com meta e valor atual (RF-28)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="kpis")
    nome = models.CharField("nome", max_length=140)
    descricao = models.TextField(blank=True, default="")
    unidade = models.CharField("unidade", max_length=24, default="%")
    valor_meta = models.DecimalField("meta", max_digits=16, decimal_places=3, default=0)
    valor_atual = models.DecimalField("valor atual", max_digits=16, decimal_places=3, default=0)
    valor_inicial = models.DecimalField("valor inicial", max_digits=16, decimal_places=3, default=0)
    maior_melhor = models.BooleanField("maior é melhor", default=True)
    data_referencia = models.DateField("data de referência", default=timezone.localdate)
    cor = models.CharField("cor", max_length=9, default="#3B82F6")
    historico = models.JSONField("histórico", default=list, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "KPI"
        verbose_name_plural = "KPIs"
        ordering = ["nome"]

    def __str__(self) -> str:
        return f"{self.nome}: {self.valor_atual}/{self.valor_meta} {self.unidade}"

    @property
    def atingimento(self) -> float:
        if not self.valor_meta:
            return 0.0
        return round(float(self.valor_atual) / float(self.valor_meta) * 100, 1)

    @property
    def situacao(self) -> str:
        pct = self.atingimento
        if self.maior_melhor:
            return "VERDE" if pct >= 95 else "AMARELO" if pct >= 80 else "VERMELHO"
        return "VERDE" if pct <= 100 else "AMARELO" if pct <= 120 else "VERMELHO"


class Baseline(models.Model):
    """Versionamento do plano para comparação visual (RF-04)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="baselines")
    versao = models.PositiveIntegerField("versão", default=1)
    nome = models.CharField("nome", max_length=140, blank=True, default="")
    descricao = models.TextField(blank=True, default="")
    snapshot_json = models.JSONField("snapshot", default=dict, blank=True)
    data_inicio = models.DateField("início", null=True, blank=True)
    data_fim = models.DateField("fim", null=True, blank=True)
    orcamento = models.DecimalField("orçamento", max_digits=16, decimal_places=2, default=0)
    ativa = models.BooleanField("linha de base ativa", default=False)
    criado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="baselines")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "linha de base"
        verbose_name_plural = "linhas de base"
        ordering = ["project", "-versao"]
        unique_together = ("project", "versao")

    def __str__(self) -> str:
        return f"{self.project.nome} · v{self.versao}"

    def save(self, *args, **kwargs):
        if not self.versao or self._state.adding:
            ultima = Baseline.objects.filter(project=self.project).order_by("-versao").first()
            self.versao = (ultima.versao + 1) if ultima else 1
        if self.ativa:
            Baseline.objects.filter(project=self.project).exclude(pk=self.pk).update(ativa=False)
        super().save(*args, **kwargs)

    def comparar(self) -> dict:
        """Comparação visual baseline × plano atual."""
        snap = self.snapshot_json or {}
        tarefas_base = {str(t["id"]): t for t in snap.get("tarefas", [])}
        atuais = {str(t.id): t for t in self.project.tarefas.all()}
        adicionadas, removidas, alteradas = [], [], []
        for tid, tarefa in atuais.items():
            if tid not in tarefas_base:
                adicionadas.append({"id": tid, "nome": tarefa.nome})
                continue
            base = tarefas_base[tid]
            desvios = {}
            for campo in ("data_inicio", "data_fim", "esforco_estimado", "percentual_conclusao"):
                antes = base.get(campo)
                agora = getattr(tarefa, campo)
                if hasattr(agora, "isoformat"):
                    agora = agora.isoformat()
                if isinstance(agora, Decimal):
                    agora = float(agora)
                if isinstance(antes, (int, float)) and isinstance(agora, (int, float)):
                    if abs(float(antes) - float(agora)) > 0.01:
                        desvios[campo] = {"antes": antes, "agora": agora}
                elif str(antes) != str(agora):
                    desvios[campo] = {"antes": antes, "agora": agora}
            if desvios:
                alteradas.append({"id": tid, "nome": tarefa.nome, "desvios": desvios})
        for tid, base in tarefas_base.items():
            if tid not in atuais:
                removidas.append({"id": tid, "nome": base.get("nome", "")})
        return {
            "baseline": {"id": self.id, "versao": self.versao, "nome": self.nome},
            "adicionadas": adicionadas,
            "removidas": removidas,
            "alteradas": alteradas,
            "resumo": {
                "total_adicionadas": len(adicionadas),
                "total_removidas": len(removidas),
                "total_alteradas": len(alteradas),
                "desvio_prazo_dias": (
                    (self.project.data_fim - self.data_fim).days
                    if self.data_fim and self.project.data_fim else None
                ),
                "desvio_orcamento": float(self.project.orcamento) - float(self.orcamento),
            },
        }


class LicaoAprendida(models.Model):
    """Lições aprendidas no encerramento (RF-05)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="licoes")
    titulo = models.CharField("título", max_length=200)
    contexto = models.TextField("contexto", blank=True, default="")
    o_que_funcionou = models.TextField("o que funcionou", blank=True, default="")
    o_que_melhorar = models.TextField("o que melhorar", blank=True, default="")
    recomendacao = models.TextField("recomendação", blank=True, default="")
    categoria = models.CharField("categoria", max_length=60, blank=True, default="")
    impacto = models.CharField(max_length=12, choices=Prioridade.choices, default=Prioridade.MEDIA)
    autor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="licoes")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "lição aprendida"
        verbose_name_plural = "lições aprendidas"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return self.titulo


class Workflow(models.Model):
    """Workflow visual configurável por arrastar estados e conexões (RF-40)."""

    nome = models.CharField("nome", max_length=140)
    entidade = models.CharField("entidade", max_length=60, default="tarefa")
    descricao = models.TextField(blank=True, default="")
    is_padrao = models.BooleanField("padrão", default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "workflow"
        verbose_name_plural = "workflows"
        ordering = ["nome"]

    def __str__(self) -> str:
        return f"{self.nome} ({self.entidade})"


class WorkflowState(models.Model):
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="estados")
    nome = models.CharField("nome", max_length=80)
    chave = models.CharField("chave", max_length=60)
    cor = models.CharField("cor", max_length=9, default="#94A3B8")
    icone = models.CharField("ícone", max_length=40, default="circle")
    ordem = models.PositiveIntegerField("ordem", default=0)
    wip_limit = models.PositiveIntegerField("limite de WIP", default=0)
    is_inicial = models.BooleanField("estado inicial", default=False)
    is_final = models.BooleanField("estado final", default=False)
    posicao_x = models.FloatField("posição X", default=0)
    posicao_y = models.FloatField("posição Y", default=0)

    class Meta:
        verbose_name = "estado de workflow"
        verbose_name_plural = "estados de workflow"
        ordering = ["workflow", "ordem"]
        unique_together = ("workflow", "chave")

    def __str__(self) -> str:
        return self.nome


class WorkflowTransition(models.Model):
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="transicoes")
    de = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name="saidas")
    para = models.ForeignKey(WorkflowState, on_delete=models.CASCADE, related_name="entradas")
    nome = models.CharField("nome", max_length=80, blank=True, default="")
    requer_aprovacao = models.BooleanField(default=False)

    class Meta:
        verbose_name = "transição de workflow"
        verbose_name_plural = "transições de workflow"
        unique_together = ("workflow", "de", "para")

    def __str__(self) -> str:
        return f"{self.de.nome} → {self.para.nome}"


class CampoCustomizado(models.Model):
    """Personalização de campos e formulários por drag-and-drop (RF-42)."""

    class Tipo(models.TextChoices):
        TEXTO = "TEXTO", "Texto"
        NUMERO = "NUMERO", "Número"
        DATA = "DATA", "Data"
        SELECAO = "SELECAO", "Seleção"
        BOOLEANO = "BOOLEANO", "Sim/Não"
        MOEDA = "MOEDA", "Moeda"
        PESSOA = "PESSOA", "Pessoa"

    entidade = models.CharField("entidade", max_length=60, db_index=True)
    nome = models.CharField("nome", max_length=140)
    chave = models.CharField("chave", max_length=60)
    tipo = models.CharField(max_length=12, choices=Tipo.choices, default=Tipo.TEXTO)
    opcoes = models.JSONField("opções", default=list, blank=True)
    obrigatorio = models.BooleanField(default=False)
    valor_padrao = models.CharField(max_length=200, blank=True, default="")
    ajuda = models.CharField("texto de ajuda", max_length=250, blank=True, default="")
    ordem = models.PositiveIntegerField(default=0)
    largura = models.PositiveSmallIntegerField("largura (colunas)", default=6)
    secao = models.CharField("seção do formulário", max_length=80, blank=True, default="Geral")
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "campo customizado"
        verbose_name_plural = "campos customizados"
        ordering = ["entidade", "ordem"]
        unique_together = ("entidade", "chave")

    def __str__(self) -> str:
        return f"{self.entidade}.{self.chave}"


class ValorCampoCustomizado(models.Model):
    campo = models.ForeignKey(CampoCustomizado, on_delete=models.CASCADE, related_name="valores")
    object_id = models.PositiveBigIntegerField()
    valor = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "valor de campo customizado"
        verbose_name_plural = "valores de campos customizados"
        unique_together = ("campo", "object_id")

    def __str__(self) -> str:
        return f"{self.campo.chave}={self.valor}"

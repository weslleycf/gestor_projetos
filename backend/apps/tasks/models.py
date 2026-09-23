"""Tarefas, dependências, checklists e cronograma."""
from __future__ import annotations

from decimal import Decimal

from django.core.validators import MaxValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import User
from apps.portfolio.models import Prioridade, Project


class StatusTarefa(models.TextChoices):
    BACKLOG = "BACKLOG", "Backlog"
    A_FAZER = "A_FAZER", "A fazer"
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    EM_REVISAO = "EM_REVISAO", "Em revisão"
    BLOQUEADA = "BLOQUEADA", "Bloqueada"
    CONCLUIDA = "CONCLUIDA", "Concluída"
    CANCELADA = "CANCELADA", "Cancelada"


STATUS_ABERTOS = [
    StatusTarefa.BACKLOG,
    StatusTarefa.A_FAZER,
    StatusTarefa.EM_ANDAMENTO,
    StatusTarefa.EM_REVISAO,
    StatusTarefa.BLOQUEADA,
]


class TipoDependencia(models.TextChoices):
    FS = "FS", "Término → Início"
    SS = "SS", "Início → Início"
    FF = "FF", "Término → Término"
    SF = "SF", "Início → Término"


class TaskQuerySet(models.QuerySet):
    def abertas(self):
        return self.filter(status__in=STATUS_ABERTOS)

    def atrasadas(self):
        return self.abertas().filter(data_fim__lt=timezone.localdate())

    def criticas(self):
        return self.filter(critica=True)


class Task(models.Model):
    """Tarefa de projeto — item de Gantt, Kanban, lista, calendário e timeline."""

    project = models.ForeignKey(Project, verbose_name="projeto", on_delete=models.CASCADE, related_name="tarefas")
    parent = models.ForeignKey(
        "self", verbose_name="tarefa pai", null=True, blank=True,
        on_delete=models.CASCADE, related_name="subtarefas",
    )
    nome = models.CharField("nome", max_length=240, db_index=True)
    descricao = models.TextField("descrição", blank=True, default="")
    wbs = models.CharField("código EAP", max_length=40, blank=True, default="")
    responsavel = models.ForeignKey(
        User, verbose_name="responsável", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="tarefas",
    )
    responsaveis_auxiliares = models.ManyToManyField(
        User, blank=True, related_name="tarefas_apoio", verbose_name="responsáveis auxiliares"
    )

    data_inicio = models.DateField("início", null=True, blank=True, db_index=True)
    data_fim = models.DateField("fim", null=True, blank=True, db_index=True)
    data_inicio_real = models.DateField("início real", null=True, blank=True)
    data_fim_real = models.DateField("fim real", null=True, blank=True)
    esforco_estimado = models.DecimalField("esforço estimado (h)", max_digits=10, decimal_places=2, default=0)
    esforco_real = models.DecimalField("esforço real (h)", max_digits=10, decimal_places=2, default=0)

    percentual_conclusao = models.PositiveSmallIntegerField(
        "percentual de conclusão", default=0, validators=[MaxValueValidator(100)]
    )
    status = models.CharField(max_length=16, choices=StatusTarefa.choices, default=StatusTarefa.A_FAZER, db_index=True)
    prioridade = models.CharField(max_length=12, choices=Prioridade.choices, default=Prioridade.MEDIA, db_index=True)

    # Posicionamento visual (Kanban / lista / Gantt)
    posicao_visual = models.FloatField("posição no Kanban", default=1000.0)
    ordem = models.PositiveIntegerField("ordem na lista", default=0)
    nivel = models.PositiveSmallIntegerField("nível na EAP", default=0)
    colapsada = models.BooleanField("agrupador colapsado", default=False)

    # Cronograma
    is_marco = models.BooleanField("é um marco", default=False)
    critica = models.BooleanField("no caminho crítico", default=False, db_index=True)
    folga_dias = models.IntegerField("folga (dias)", default=0)
    restricao = models.CharField("restrição", max_length=60, blank=True, default="")

    # Visual
    cor = models.CharField("cor", max_length=9, blank=True, default="")
    icone = models.CharField("ícone", max_length=40, blank=True, default="")
    tags = models.JSONField("etiquetas", default=list, blank=True)
    progresso_informado_por = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="progressos_informados"
    )
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    objects = TaskQuerySet.as_manager()

    class Meta:
        verbose_name = "tarefa"
        verbose_name_plural = "tarefas"
        ordering = ["ordem", "data_inicio", "id"]
        indexes = [
            models.Index(fields=["project", "status"]),
            models.Index(fields=["project", "parent"]),
            models.Index(fields=["responsavel", "status"]),
        ]

    def __str__(self) -> str:
        return self.nome

    def save(self, *args, **kwargs):
        if self.parent and not self.nivel:
            self.nivel = self.parent.nivel + 1
        if self.percentual_conclusao >= 100 and self.status not in {
            StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA
        }:
            self.status = StatusTarefa.CONCLUIDA
            self.data_fim_real = self.data_fim_real or timezone.localdate()
        elif self.status == StatusTarefa.CONCLUIDA and self.percentual_conclusao < 100:
            self.percentual_conclusao = 100
            self.data_fim_real = self.data_fim_real or timezone.localdate()
        if self.status == StatusTarefa.EM_ANDAMENTO and not self.data_inicio_real:
            self.data_inicio_real = timezone.localdate()
        super().save(*args, **kwargs)

    # ------------------------------------------------------------- indicadores
    @property
    def atrasada(self) -> bool:
        return bool(
            self.data_fim and self.data_fim < timezone.localdate()
            and self.status not in {StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA}
        )

    @property
    def duracao_dias(self) -> int:
        if not (self.data_inicio and self.data_fim):
            return 0
        return (self.data_fim - self.data_inicio).days + 1

    @property
    def progresso_planejado(self) -> float:
        if not (self.data_inicio and self.data_fim) or self.duracao_dias <= 0:
            return 0.0
        decorrido = (timezone.localdate() - self.data_inicio).days + 1
        return round(max(0.0, min(1.0, decorrido / self.duracao_dias)) * 100, 2)

    @property
    def desvio_prazo_dias(self) -> int | None:
        if not (self.data_fim and self.data_fim_real):
            return None
        return (self.data_fim_real - self.data_fim).days

    @property
    def total_subtarefas(self) -> int:
        return self.subtarefas.count()

    @property
    def tem_filhos(self) -> bool:
        return self.subtarefas.exists()

    def rollup_percentual(self, salvar: bool = True) -> int:
        """Tarefa pai assume a média ponderada das subtarefas."""
        filhas = list(self.subtarefas.all())
        if not filhas:
            return self.percentual_conclusao
        peso = sum(float(f.esforco_estimado or 0) or 1.0 for f in filhas)
        valor = sum((float(f.esforco_estimado or 0) or 1.0) * f.percentual_conclusao for f in filhas)
        novo = int(round(valor / peso))
        if salvar and novo != self.percentual_conclusao:
            self.percentual_conclusao = novo
            self.save(update_fields=["percentual_conclusao", "atualizado_em"])
        return novo


class TaskDependency(models.Model):
    """Dependência entre tarefas — criada arrastando conectores no Gantt (RF-09)."""

    predecessor = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="sucessoras")
    successor = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="predecessoras")
    tipo = models.CharField("tipo", max_length=2, choices=TipoDependencia.choices, default=TipoDependencia.FS)
    lag = models.IntegerField("defasagem (dias)", default=0)
    obrigatoria = models.BooleanField("obrigatória", default=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "dependência"
        verbose_name_plural = "dependências"
        unique_together = ("predecessor", "successor", "tipo")
        indexes = [models.Index(fields=["predecessor"]), models.Index(fields=["successor"])]

    def __str__(self) -> str:
        return f"{self.predecessor_id} -{self.tipo}-> {self.successor_id}"

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.predecessor_id == self.successor_id:
            raise ValidationError("Uma tarefa não pode depender de si mesma.")
        if self.predecessor_id and self.successor_id and self._cria_ciclo():
            raise ValidationError("A dependência criaria um ciclo no cronograma.")

    def _cria_ciclo(self) -> bool:
        vistos = set()
        pilha = [self.successor_id]
        while pilha:
            atual = pilha.pop()
            if atual == self.predecessor_id:
                return True
            if atual in vistos:
                continue
            vistos.add(atual)
            pilha.extend(
                TaskDependency.objects.filter(predecessor_id=atual).values_list("successor_id", flat=True)
            )
        return False


class ChecklistItem(models.Model):
    """Checklist visual dentro da tarefa (RF-08)."""

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="checklist")
    texto = models.CharField("item", max_length=300)
    concluido = models.BooleanField(default=False)
    ordem = models.PositiveIntegerField(default=0)
    responsavel = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="itens_checklist"
    )
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "item de checklist"
        verbose_name_plural = "itens de checklist"
        ordering = ["ordem", "id"]

    def __str__(self) -> str:
        return self.texto


class TaskSkillRequirement(models.Model):
    """Requisito de capacidade por tarefa (RF-69)."""

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="requisitos_skill")
    skill = models.ForeignKey("capabilities.Skill", on_delete=models.CASCADE, related_name="requisitos_tarefa")
    nivel_minimo = models.PositiveSmallIntegerField("nível mínimo", default=3)
    peso = models.FloatField("peso", default=1.0)
    obrigatorio = models.BooleanField("obrigatório", default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "requisito de capacidade da tarefa"
        verbose_name_plural = "requisitos de capacidade da tarefa"
        unique_together = ("task", "skill")

    def __str__(self) -> str:
        return f"{self.task.nome} · {self.skill.nome} ≥ {self.nivel_minimo}"

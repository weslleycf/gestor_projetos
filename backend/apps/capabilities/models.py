"""Catálogo de capacidades, perfis, evolução, PDI, matching e capacity planning."""
from __future__ import annotations

from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import User, Visibilidade
from apps.portfolio.models import Project
from apps.tasks.models import Task


class NivelProficiencia(models.IntegerChoices):
    """Níveis de proficiência 1–5 (RF-47)."""

    INICIANTE = 1, "Iniciante"
    BASICO = 2, "Básico"
    INTERMEDIARIO = 3, "Intermediário"
    AVANCADO = 4, "Avançado"
    ESPECIALISTA = 5, "Especialista"


DESCRICAO_NIVEIS = {
    1: "Conhecimento teórico, executa com supervisão.",
    2: "Executa tarefas simples com apoio pontual.",
    3: "Autônomo em tarefas típicas.",
    4: "Referência técnica, atua como mentor.",
    5: "Autoridade reconhecida, define padrões.",
}


class TipoSkill(models.TextChoices):
    TECNICA = "TECNICA", "Técnica"
    COMPORTAMENTAL = "COMPORTAMENTAL", "Comportamental"
    IDIOMA = "IDIOMA", "Idioma"
    CERTIFICACAO = "CERTIFICACAO", "Certificação"
    DOMINIO = "DOMINIO", "Domínio de negócio"
    FERRAMENTA = "FERRAMENTA", "Ferramenta"
    METODOLOGIA = "METODOLOGIA", "Metodologia"


class StatusSkill(models.TextChoices):
    ATIVA = "ATIVA", "Ativa"
    EMERGENTE = "EMERGENTE", "Emergente"
    EM_DESCONTINUACAO = "EM_DESCONTINUACAO", "Em descontinuação"
    OBSOLETA = "OBSOLETA", "Obsoleta"


class CriticidadeSkill(models.TextChoices):
    BAIXA = "BAIXA", "Baixa"
    MEDIA = "MEDIA", "Média"
    ALTA = "ALTA", "Alta"
    ESTRATEGICA = "ESTRATEGICA", "Estratégica"


class SkillCategory(models.Model):
    """Categoria hierárquica de capacidades (RF-45)."""

    nome = models.CharField("nome", max_length=160, unique=True)
    parent = models.ForeignKey(
        "self", verbose_name="categoria pai", null=True, blank=True,
        on_delete=models.CASCADE, related_name="subcategorias",
    )
    descricao = models.TextField("descrição", blank=True, default="")
    icone = models.CharField("ícone", max_length=40, default="folder-tree")
    cor = models.CharField("cor", max_length=9, default="#6366F1")
    ordem = models.PositiveIntegerField("ordem", default=0)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "categoria de capacidade"
        verbose_name_plural = "categorias de capacidade"
        ordering = ["ordem", "nome"]

    def __str__(self) -> str:
        return self.nome

    @property
    def caminho(self) -> str:
        partes, atual, guarda = [], self, 0
        while atual is not None and guarda < 10:
            partes.append(atual.nome)
            atual = atual.parent
            guarda += 1
        return " › ".join(reversed(partes))


class Skill(models.Model):
    """Capacidade do catálogo organizacional (RF-44/RF-45/RF-46/RF-48)."""

    nome = models.CharField("nome", max_length=200, db_index=True)
    descricao = models.TextField("descrição", blank=True, default="")
    categoria = models.ForeignKey(
        SkillCategory, verbose_name="categoria", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="skills",
    )
    parent = models.ForeignKey(
        "self", verbose_name="capacidade pai", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="derivadas",
    )
    tipo = models.CharField("tipo", max_length=16, choices=TipoSkill.choices, default=TipoSkill.TECNICA, db_index=True)
    status = models.CharField("status", max_length=20, choices=StatusSkill.choices, default=StatusSkill.ATIVA, db_index=True)
    criticidade = models.CharField("criticidade", max_length=16, choices=CriticidadeSkill.choices, default=CriticidadeSkill.MEDIA, db_index=True)

    framework_origem = models.CharField("framework de origem", max_length=40, blank=True, default="")
    codigo_externo = models.CharField("código externo (SFIA/ESCO/O*NET)", max_length=60, blank=True, default="", db_index=True)
    sinonimos = models.JSONField("sinônimos", default=list, blank=True)
    tags = models.JSONField("etiquetas", default=list, blank=True)

    icone = models.CharField("ícone", max_length=40, default="sparkles")
    cor = models.CharField("cor", max_length=9, default="#F59E0B")
    peso_estrategico = models.FloatField("peso estratégico", default=1.0)
    substituivel = models.BooleanField("substituível por tecnologia similar", default=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "capacidade"
        verbose_name_plural = "capacidades"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["tipo", "status"]),
            models.Index(fields=["criticidade"]),
        ]

    def __str__(self) -> str:
        return self.nome

    @property
    def total_detentores(self) -> int:
        return self.perfis.filter(nivel_atual__gte=3).count()

    @property
    def bus_factor(self) -> int:
        """Quantidade de pessoas com nível ≥ 4 aptas a sustentar a capacidade."""
        return self.perfis.filter(nivel_atual__gte=4).count()

    @property
    def nivel_medio(self) -> float:
        agregado = self.perfis.aggregate(m=models.Avg("nivel_atual"))["m"]
        return round(agregado, 2) if agregado else 0.0

    @property
    def em_risco(self) -> bool:
        return self.criticidade in {CriticidadeSkill.ALTA, CriticidadeSkill.ESTRATEGICA} and self.bus_factor <= 1


class PerfilNivel(models.Model):
    """Critérios objetivos de promoção por nível (RF-47/RF-57)."""

    skill = models.ForeignKey(
        Skill, null=True, blank=True, on_delete=models.CASCADE, related_name="criterios_nivel",
        help_text="Deixe vazio para aplicar a regra geral do catálogo.",
    )
    nivel = models.PositiveSmallIntegerField("nível", choices=NivelProficiencia.choices)
    nome = models.CharField("nome do nível", max_length=60, blank=True, default="")
    descricao = models.TextField("critérios objetivos", blank=True, default="")
    xp_minimo = models.PositiveIntegerField("XP mínimo acumulado", default=100)
    meses_minimos = models.PositiveIntegerField("meses mínimos no nível", default=6)
    evidencias_minimas = models.PositiveIntegerField("evidências válidas mínimas", default=2)
    exige_banca = models.BooleanField("exige validação de banca/mentor", default=False)
    exige_avaliacao_gestor = models.BooleanField("exige avaliação do gestor no nível", default=True)
    cor = models.CharField("cor", max_length=9, default="#3B82F6")
    ordem = models.PositiveSmallIntegerField("ordem", default=0)

    class Meta:
        verbose_name = "critério de nível"
        verbose_name_plural = "critérios de nível"
        ordering = ["nivel"]
        unique_together = ("skill", "nivel")

    def __str__(self) -> str:
        return f"{self.skill.nome if self.skill_id else 'Geral'} · nível {self.nivel}"

    def save(self, *args, **kwargs):
        if self.nivel and not self.nome:
            self.nome = NivelProficiencia(self.nivel).label
            self.ordem = self.nivel
        if self.nivel and self.nivel >= 4:
            self.exige_banca = True
        super().save(*args, **kwargs)


class StatusPerfilSkill(models.TextChoices):
    ATIVA = "ATIVA", "Ativa"
    EM_DESENVOLVIMENTO = "EM_DESENVOLVIMENTO", "Em desenvolvimento"
    ENFERRUJADA = "ENFERRUJADA", "Enferrujada (decay)"
    EM_RECICLAGEM = "EM_RECICLAGEM", "Em reciclagem"
    INATIVA = "INATIVA", "Inativa"


class EmployeeSkill(models.Model):
    """Capacidade no perfil do colaborador (RF-50/RF-51/RF-55/RF-59)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="perfis_skill")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="perfis")
    nivel_atual = models.PositiveSmallIntegerField(
        "nível atual", default=1, choices=NivelProficiencia.choices, db_index=True
    )
    nivel_validado = models.PositiveSmallIntegerField("nível validado", default=0, db_index=True)
    nivel_desejado = models.PositiveSmallIntegerField("nível desejado", default=0)
    nivel_consolidado = models.FloatField("nível consolidado (ponderado)", default=0.0)
    xp_acumulado = models.PositiveIntegerField("XP acumulado", default=0)
    anos_experiencia = models.FloatField("anos de experiência", default=0)
    ultima_utilizacao = models.DateField("última utilização", null=True, blank=True)
    data_atingiu_nivel = models.DateField("atingiu o nível atual em", null=True, blank=True)
    horas_pretendidas = models.PositiveIntegerField("horas de desenvolvimento pretendidas", default=0)

    status = models.CharField(max_length=20, choices=StatusPerfilSkill.choices, default=StatusPerfilSkill.ATIVA, db_index=True)
    visibilidade = models.CharField("visibilidade", max_length=10, choices=Visibilidade.choices, default=Visibilidade.PUBLICO)
    destaque = models.BooleanField("capacidade destaque no perfil", default=False)
    observacoes = models.TextField(blank=True, default="")
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "capacidade do colaborador"
        verbose_name_plural = "capacidades do colaborador"
        unique_together = ("user", "skill")
        ordering = ["-nivel_atual", "skill__nome"]
        indexes = [
            models.Index(fields=["skill", "nivel_atual"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.skill.nome} · N{self.nivel_atual}"

    @property
    def gap(self) -> int:
        return max(0, (self.nivel_desejado or 0) - (self.nivel_atual or 0))

    @property
    def nivel_efetivo(self) -> float:
        return self.nivel_consolidado or float(self.nivel_atual or 0)

    @property
    def xp_para_proximo_nivel(self) -> int:
        from django.conf import settings as dj

        base = dj.SGP["XP_POR_NIVEL"] * max(1, self.nivel_atual)
        return max(0, base - self.xp_acumulado)

    @property
    def progresso_nivel_percentual(self) -> float:
        from django.conf import settings as dj

        base = dj.SGP["XP_POR_NIVEL"] * max(1, self.nivel_atual)
        if base <= 0:
            return 0.0
        return round(min(100.0, self.xp_acumulado / base * 100), 1)

    @property
    def dias_sem_uso(self) -> int | None:
        if not self.ultima_utilizacao:
            return None
        return (timezone.localdate() - self.ultima_utilizacao).days

    def evidencia_valida(self) -> int:
        return self.evidencias.filter(valida=True).count()

    def criterios_proximo_nivel(self) -> dict:
        """Avalia se o colaborador atende aos critérios de promoção (RF-57)."""
        from django.conf import settings as dj

        proximo = min(5, (self.nivel_atual or 1) + 1)
        criterio = (
            PerfilNivel.objects.filter(skill=self.skill, nivel=proximo).first()
            or PerfilNivel.objects.filter(skill__isnull=True, nivel=proximo).first()
        )
        xp_minimo = criterio.xp_minimo if criterio else dj.SGP["XP_POR_NIVEL"] * proximo
        meses_minimos = criterio.meses_minimos if criterio else dj.SGP["MESES_MINIMOS_NO_NIVEL"]
        evidencias_minimas = criterio.evidencias_minimas if criterio else dj.SGP["EVIDENCIAS_MINIMAS"]
        exige_banca = criterio.exige_banca if criterio else proximo >= 4
        exige_gestor = criterio.exige_avaliacao_gestor if criterio else True

        meses_no_nivel = (
            round((timezone.localdate() - self.data_atingiu_nivel).days / 30.0, 1)
            if self.data_atingiu_nivel else 0.0
        )
        avaliacao_gestor = self.avaliacoes.filter(tipo=TipoAvaliacao.GESTOR).order_by("-data").first()
        nivel_gestor = avaliacao_gestor.nivel_atribuido if avaliacao_gestor else 0
        avaliacoes_validas = self.avaliacoes.count()
        evidencias = self.evidencia_valida()

        checagens = [
            {"criterio": f"XP mínimo ({xp_minimo})", "atendido": self.xp_acumulado >= xp_minimo,
             "atual": self.xp_acumulado, "exigido": xp_minimo, "icone": "zap"},
            {"criterio": f"Tempo mínimo no nível ({meses_minimos} meses)", "atendido": meses_no_nivel >= meses_minimos,
             "atual": meses_no_nivel, "exigido": meses_minimos, "icone": "calendar-clock"},
            {"criterio": f"Evidências válidas ({evidencias_minimas})", "atendido": evidencias >= evidencias_minimas,
             "atual": evidencias, "exigido": evidencias_minimas, "icone": "paperclip"},
            {"criterio": "Avaliação do gestor no nível proposto", "atendido": (not exige_gestor) or nivel_gestor >= proximo,
             "atual": nivel_gestor, "exigido": proximo, "icone": "user-check"},
            {"criterio": "Validação por mentor/banca", "atendido": (not exige_banca) or avaliacoes_validas >= 2,
             "atual": avaliacoes_validas, "exigido": 2, "icone": "award"},
        ]
        return {
            "nivel_atual": self.nivel_atual,
            "nivel_proposto": proximo,
            "elegivel": all(c["atendido"] for c in checagens) and self.nivel_atual < 5,
            "checagens": checagens,
            "progresso": round(sum(1 for c in checagens if c["atendido"]) / len(checagens) * 100, 1),
        }


class TipoAvaliacao(models.TextChoices):
    AUTOAVALIACAO = "AUTOAVALIACAO", "Autoavaliação"
    GESTOR = "GESTOR", "Avaliação do gestor"
    PAR = "PAR", "Avaliação de pares"
    MENTOR = "MENTOR", "Avaliação de mentor"
    BANCA = "BANCA", "Banca avaliadora"
    CLIENTE = "CLIENTE", "Avaliação de cliente"
    SISTEMA = "SISTEMA", "Inferida pelo sistema"


class SkillAssessment(models.Model):
    """Avaliação de capacidade por diferentes fontes (RF-51)."""

    employee_skill = models.ForeignKey(EmployeeSkill, on_delete=models.CASCADE, related_name="avaliacoes")
    avaliador = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="avaliacoes_realizadas")
    tipo = models.CharField("tipo", max_length=16, choices=TipoAvaliacao.choices, default=TipoAvaliacao.AUTOAVALIACAO, db_index=True)
    nivel_atribuido = models.PositiveSmallIntegerField("nível atribuído", choices=NivelProficiencia.choices)
    peso = models.FloatField("peso da avaliação", default=1.0)
    comentario = models.TextField("comentário", blank=True, default="")
    data = models.DateField("data", default=timezone.localdate, db_index=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "avaliação de capacidade"
        verbose_name_plural = "avaliações de capacidade"
        ordering = ["-data"]
        indexes = [models.Index(fields=["employee_skill", "tipo"])]

    def __str__(self) -> str:
        return f"{self.employee_skill} · {self.get_tipo_display()} = {self.nivel_atribuido}"


class SkillEndorsement(models.Model):
    """Endosso de capacidade por par ou mentor (RF-52)."""

    employee_skill = models.ForeignKey(EmployeeSkill, on_delete=models.CASCADE, related_name="endossos")
    endorser = models.ForeignKey(User, on_delete=models.CASCADE, related_name="endossos_feitos")
    comentario = models.TextField("comentário", blank=True, default="")
    nivel_sugerido = models.PositiveSmallIntegerField("nível sugerido", default=0)
    data = models.DateTimeField("data", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "endosso"
        verbose_name_plural = "endossos"
        unique_together = ("employee_skill", "endorser")
        ordering = ["-data"]

    def __str__(self) -> str:
        return f"{self.endorser.nome} endossa {self.employee_skill.skill.nome}"


class TipoEvidencia(models.TextChoices):
    PROJETO = "PROJETO", "Entrega de projeto"
    CERTIFICACAO = "CERTIFICACAO", "Certificação"
    TREINAMENTO = "TREINAMENTO", "Treinamento concluído"
    PUBLICACAO = "PUBLICACAO", "Publicação / artigo"
    PALESTRA = "PALESTRA", "Palestra / evento"
    MENTORIA = "MENTORIA", "Mentoria realizada"
    BADGE = "BADGE", "Badge digital"
    AVALIACAO = "AVALIACAO", "Avaliação formal"
    OUTRO = "OUTRO", "Outro"


class SkillEvidence(models.Model):
    """Evidência visual de capacidade (RF-53)."""

    employee_skill = models.ForeignKey(EmployeeSkill, on_delete=models.CASCADE, related_name="evidencias")
    tipo = models.CharField("tipo", max_length=16, choices=TipoEvidencia.choices, default=TipoEvidencia.PROJETO, db_index=True)
    descricao = models.CharField("descrição", max_length=250)
    url = models.URLField("link", blank=True, default="")
    arquivo = models.FileField("arquivo", upload_to="evidencias/%Y/%m/", blank=True, null=True)
    data = models.DateField("data", default=timezone.localdate)
    emitido_por = models.CharField("emitido por", max_length=180, blank=True, default="")
    valida = models.BooleanField("validada", default=False, db_index=True)
    validador = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="evidencias_validadas")
    validada_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "evidência de capacidade"
        verbose_name_plural = "evidências de capacidade"
        ordering = ["-data"]

    def __str__(self) -> str:
        return f"{self.get_tipo_display()}: {self.descricao}"


class OrigemHistorico(models.TextChoices):
    TAREFA = "TAREFA", "Tarefa concluída"
    AVALIACAO = "AVALIACAO", "Avaliação"
    TREINAMENTO = "TREINAMENTO", "Treinamento"
    MENTORIA = "MENTORIA", "Mentoria"
    CERTIFICACAO = "CERTIFICACAO", "Certificação"
    PROMOCAO = "PROMOCAO", "Promoção de nível"
    REGRESSAO = "REGRESSAO", "Regressão de nível"
    DECAY = "DECAY", "Enferrujamento"
    MANUAL = "MANUAL", "Ajuste manual"


class SkillHistory(models.Model):
    """Histórico de evolução da capacidade em timeline (RF-55/RF-61)."""

    employee_skill = models.ForeignKey(EmployeeSkill, on_delete=models.CASCADE, related_name="historico")
    nivel_anterior = models.PositiveSmallIntegerField("nível anterior", default=0)
    nivel_novo = models.PositiveSmallIntegerField("nível novo", default=0)
    xp_movimento = models.IntegerField("XP movimentado", default=0)
    motivo = models.TextField("motivo", blank=True, default="")
    origem = models.CharField("origem", max_length=16, choices=OrigemHistorico.choices, default=OrigemHistorico.MANUAL)
    referencia = models.CharField("referência", max_length=200, blank=True, default="")
    registrado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="historicos_skill")
    data = models.DateTimeField("data", default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "histórico de capacidade"
        verbose_name_plural = "históricos de capacidade"
        ordering = ["-data"]

    def __str__(self) -> str:
        return f"{self.employee_skill.skill.nome}: {self.nivel_anterior} → {self.nivel_novo}"


class SugestaoPromocao(models.Model):
    """Sugestão de promoção aguardando validação (RF-57/RF-58)."""

    class Status(models.TextChoices):
        PENDENTE = "PENDENTE", "Pendente de validação"
        APROVADA = "APROVADA", "Aprovada"
        REJEITADA = "REJEITADA", "Rejeitada"
        EXPIRADA = "EXPIRADA", "Expirada"

    employee_skill = models.ForeignKey(EmployeeSkill, on_delete=models.CASCADE, related_name="sugestoes")
    nivel_proposto = models.PositiveSmallIntegerField("nível proposto", choices=NivelProficiencia.choices)
    nivel_atual = models.PositiveSmallIntegerField("nível atual", default=1)
    justificativa = models.TextField("justificativa", blank=True, default="")
    criterios_atendidos = models.JSONField("critérios atendidos", default=list, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDENTE, db_index=True)
    validado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="promocoes_validadas")
    comentario_validacao = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    validado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "sugestão de promoção"
        verbose_name_plural = "sugestões de promoção"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return f"{self.employee_skill.user.nome} · {self.employee_skill.skill.nome} → N{self.nivel_proposto}"


class ProjectSkillRequirement(models.Model):
    """Requisito de capacidade do projeto (RF-68)."""

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="requisitos_skill")
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="requisitos_projeto")
    nivel_minimo = models.PositiveSmallIntegerField("nível mínimo", default=3, choices=NivelProficiencia.choices)
    nivel_desejado = models.PositiveSmallIntegerField("nível desejado", default=4)
    quantidade = models.PositiveSmallIntegerField("quantidade de pessoas", default=1)
    peso = models.FloatField("peso relativo", default=1.0)
    obrigatorio = models.BooleanField("obrigatório", default=False)
    data_necessidade = models.DateField("necessário a partir de", null=True, blank=True)
    observacao = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "requisito de capacidade do projeto"
        verbose_name_plural = "requisitos de capacidade do projeto"
        unique_together = ("project", "skill")
        ordering = ["-obrigatorio", "-peso"]

    def __str__(self) -> str:
        return f"{self.project.nome} · {self.skill.nome} ≥ N{self.nivel_minimo}"


class StatusPDI(models.TextChoices):
    RASCUNHO = "RASCUNHO", "Rascunho"
    ATIVO = "ATIVO", "Ativo"
    CONCLUIDO = "CONCLUIDO", "Concluído"
    CANCELADO = "CANCELADO", "Cancelado"


class DevelopmentPlan(models.Model):
    """PDI — Plano de Desenvolvimento Individual (RF-75)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pdis")
    titulo = models.CharField("título", max_length=200, default="Meu PDI")
    objetivo = models.TextField("objetivo de carreira", blank=True, default="")
    status = models.CharField(max_length=12, choices=StatusPDI.choices, default=StatusPDI.ATIVO, db_index=True)
    data_inicio = models.DateField("início", default=timezone.localdate)
    data_fim = models.DateField("fim", null=True, blank=True)
    responsavel_acompanhamento = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="pdis_acompanhados"
    )
    progresso = models.PositiveSmallIntegerField("progresso (%)", default=0)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "PDI"
        verbose_name_plural = "PDIs"
        ordering = ["-data_inicio"]

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.titulo}"

    def recalcular_progresso(self, salvar: bool = True) -> int:
        acoes = list(self.acoes.all())
        if not acoes:
            return self.progresso
        valor = int(round(sum(1 for a in acoes if a.status == StatusAcao.CONCLUIDA) / len(acoes) * 100))
        if salvar and valor != self.progresso:
            self.progresso = valor
            self.save(update_fields=["progresso", "atualizado_em"])
        return valor


class TipoAcaoDesenvolvimento(models.TextChoices):
    CURSO = "CURSO", "Curso / treinamento"
    CERTIFICACAO = "CERTIFICACAO", "Certificação"
    MENTORIA = "MENTORIA", "Mentoria"
    PROJETO = "PROJETO", "Atuação em projeto"
    PRATICA = "PRATICA", "Prática deliberada"
    LEITURA = "LEITURA", "Leitura / estudo"
    COMUNIDADE = "COMUNIDADE", "Comunidade de prática"
    PALESTRA = "PALESTRA", "Palestra / docência"
    JOB_ROTATION = "JOB_ROTATION", "Job rotation"


class StatusAcao(models.TextChoices):
    PLANEJADA = "PLANEJADA", "Planejada"
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    CONCLUIDA = "CONCLUIDA", "Concluída"
    ATRASADA = "ATRASADA", "Atrasada"
    CANCELADA = "CANCELADA", "Cancelada"


class DevelopmentAction(models.Model):
    """Ação do PDI vinculada a uma capacidade (RF-75/RF-76)."""

    plan = models.ForeignKey(DevelopmentPlan, on_delete=models.CASCADE, related_name="acoes")
    tipo = models.CharField("tipo", max_length=16, choices=TipoAcaoDesenvolvimento.choices, default=TipoAcaoDesenvolvimento.CURSO)
    descricao = models.CharField("descrição", max_length=250)
    skill = models.ForeignKey(Skill, null=True, blank=True, on_delete=models.SET_NULL, related_name="acoes_desenvolvimento")
    nivel_alvo = models.PositiveSmallIntegerField("nível alvo", default=0)
    status = models.CharField(max_length=16, choices=StatusAcao.choices, default=StatusAcao.PLANEJADA, db_index=True)
    prazo = models.DateField("prazo", null=True, blank=True)
    data_conclusao = models.DateField("concluída em", null=True, blank=True)
    carga_horaria = models.PositiveIntegerField("carga horária (h)", default=0)
    custo = models.DecimalField("custo (R$)", max_digits=12, decimal_places=2, default=0)
    responsavel = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="acoes_pdi")
    progresso = models.PositiveSmallIntegerField("progresso (%)", default=0)
    evidencia_url = models.URLField("evidência", blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "ação de desenvolvimento"
        verbose_name_plural = "ações de desenvolvimento"
        ordering = ["prazo", "id"]

    def __str__(self) -> str:
        return self.descricao

    @property
    def atrasada(self) -> bool:
        return bool(self.prazo and self.prazo < timezone.localdate() and self.status not in {
            StatusAcao.CONCLUIDA, StatusAcao.CANCELADA
        })


class Training(models.Model):
    """Treinamento do catálogo (RF-77)."""

    nome = models.CharField("nome", max_length=200)
    descricao = models.TextField(blank=True, default="")
    skill = models.ForeignKey(Skill, null=True, blank=True, on_delete=models.SET_NULL, related_name="treinamentos")
    tipo = models.CharField("tipo", max_length=40, default="ONLINE")
    carga_horaria = models.PositiveIntegerField("carga horária (h)", default=0)
    fornecedor = models.CharField("fornecedor", max_length=180, blank=True, default="")
    url = models.URLField("link", blank=True, default="")
    custo = models.DecimalField("custo (R$)", max_digits=12, decimal_places=2, default=0)
    nivel_alvo = models.PositiveSmallIntegerField("nível alvo", default=3)
    xp_concedido = models.PositiveIntegerField("XP concedido", default=50)
    certificacao = models.BooleanField("gera certificação", default=False)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "treinamento"
        verbose_name_plural = "treinamentos"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class EmployeeTraining(models.Model):
    """Inscrição e conclusão de treinamento (RF-77)."""

    class Status(models.TextChoices):
        INSCRITO = "INSCRITO", "Inscrito"
        EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
        CONCLUIDO = "CONCLUIDO", "Concluído"
        REPROVADO = "REPROVADO", "Reprovado"
        CANCELADO = "CANCELADO", "Cancelado"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="treinamentos")
    training = models.ForeignKey(Training, on_delete=models.CASCADE, related_name="participacoes")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.INSCRITO, db_index=True)
    data_inscricao = models.DateField("inscrição", default=timezone.localdate)
    data_conclusao = models.DateField("conclusão", null=True, blank=True)
    nota = models.FloatField("nota", null=True, blank=True)
    certificado_url = models.URLField("certificado", blank=True, default="")
    origem = models.CharField("origem", max_length=40, default="MANUAL")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "treinamento do colaborador"
        verbose_name_plural = "treinamentos do colaborador"
        unique_together = ("user", "training")
        ordering = ["-data_inscricao"]

    def __str__(self) -> str:
        return f"{self.user.nome} · {self.training.nome}"


class Mentorship(models.Model):
    """Mentoria formal ou informal (RF-78/RF-79)."""

    class Status(models.TextChoices):
        PROPOSTA = "PROPOSTA", "Proposta"
        ATIVA = "ATIVA", "Ativa"
        CONCLUIDA = "CONCLUIDA", "Concluída"
        CANCELADA = "CANCELADA", "Cancelada"

    mentor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mentorias_como_mentor")
    mentee = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mentorias_como_mentee")
    skill = models.ForeignKey(Skill, null=True, blank=True, on_delete=models.SET_NULL, related_name="mentorias")
    objetivo = models.TextField("objetivo", blank=True, default="")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ATIVA, db_index=True)
    data_inicio = models.DateField("início", default=timezone.localdate)
    data_fim = models.DateField("fim", null=True, blank=True)
    horas_realizadas = models.DecimalField("horas realizadas", max_digits=8, decimal_places=2, default=0)
    frequencia = models.CharField("frequência", max_length=40, blank=True, default="quinzenal")
    avaliacao = models.PositiveSmallIntegerField("avaliação (1-5)", default=0)
    comentario = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "mentoria"
        verbose_name_plural = "mentorias"
        ordering = ["-data_inicio"]

    def __str__(self) -> str:
        return f"{self.mentor.nome} → {self.mentee.nome}"


class ModoAlocacao(models.TextChoices):
    PERFORMANCE = "PERFORMANCE", "Performance imediata"
    DESENVOLVIMENTO = "DESENVOLVIMENTO", "Desenvolvimento"
    MISTO = "MISTO", "Misto (sênior + júnior)"


class StatusRecomendacao(models.TextChoices):
    SUGERIDA = "SUGERIDA", "Sugerida"
    ACEITA = "ACEITA", "Aceita"
    RECUSADA = "RECUSADA", "Recusada"
    EXPIRADA = "EXPIRADA", "Expirada"
    SUBSTITUIDA = "SUBSTITUIDA", "Substituída por override"


class AllocationRecommendation(models.Model):
    """Recomendação do motor de alocação com justificativa auditável (RF-70/RF-74/§9.3)."""

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="recomendacoes")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recomendacoes_recebidas")
    score = models.FloatField("score", default=0)
    posicao = models.PositiveSmallIntegerField("posição no ranking", default=0)
    modo = models.CharField("modo", max_length=16, choices=ModoAlocacao.choices, default=ModoAlocacao.PERFORMANCE)
    justificativa = models.JSONField("justificativa", default=dict, blank=True)
    pesos = models.JSONField("pesos utilizados", default=dict, blank=True)
    penalidades = models.JSONField("penalidades aplicadas", default=list, blank=True)
    status = models.CharField(max_length=12, choices=StatusRecomendacao.choices, default=StatusRecomendacao.SUGERIDA, db_index=True)
    gerado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="recomendacoes_geradas")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    decidido_em = models.DateTimeField(null=True, blank=True)
    observacao_decisao = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "recomendação de alocação"
        verbose_name_plural = "recomendações de alocação"
        ordering = ["-score"]
        indexes = [models.Index(fields=["task", "-score"])]

    def __str__(self) -> str:
        return f"{self.user.nome} → {self.task.nome} ({self.score:.2f})"


class SkillDemandForecast(models.Model):
    """Demanda vs. oferta projetada por capacidade e período (RF-80/RF-81)."""

    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="previsoes")
    periodo = models.CharField("período (AAAA-MM)", max_length=7, db_index=True)
    demanda_estimada = models.FloatField("demanda estimada (FTE)", default=0)
    oferta_estimada = models.FloatField("oferta estimada (FTE)", default=0)
    gap = models.FloatField("gap (FTE)", default=0)
    demanda_nivel_medio = models.FloatField("nível médio demandado", default=0)
    origem = models.CharField("origem do cálculo", max_length=40, default="PORTFOLIO")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "previsão de demanda de capacidade"
        verbose_name_plural = "previsões de demanda de capacidade"
        unique_together = ("skill", "periodo")
        ordering = ["periodo"]

    def __str__(self) -> str:
        return f"{self.skill.nome} · {self.periodo} · gap {self.gap}"

    @property
    def situacao(self) -> str:
        if self.gap > 1:
            return "ESCASSEZ"
        if self.gap < -1:
            return "OCIOSIDADE"
        return "EQUILIBRIO"


class BusFactorAlert(models.Model):
    """Alerta de capacidade crítica sustentada por poucas pessoas (RF-82)."""

    skill = models.ForeignKey(Skill, on_delete=models.CASCADE, related_name="alertas_bus_factor")
    quantidade_detentores = models.PositiveSmallIntegerField("detentores nível ≥ 4", default=0)
    total_projetos_dependentes = models.PositiveSmallIntegerField("projetos dependentes", default=0)
    criticidade = models.CharField("criticidade", max_length=16, choices=CriticidadeSkill.choices, default=CriticidadeSkill.ALTA)
    recomendacao = models.TextField("recomendação", blank=True, default="")
    acoes_sugeridas = models.JSONField("ações sugeridas", default=list, blank=True)
    resolvido = models.BooleanField("resolvido", default=False, db_index=True)
    detectado_em = models.DateTimeField("detectado em", default=timezone.now, editable=False)

    class Meta:
        verbose_name = "alerta de bus factor"
        verbose_name_plural = "alertas de bus factor"
        ordering = ["-detectado_em"]

    def __str__(self) -> str:
        return f"{self.skill.nome} · {self.quantidade_detentores} detentor(es)"


class InternalOpportunity(models.Model):
    """Oportunidade interna publicada no marketplace (RF-85)."""

    class Tipo(models.TextChoices):
        PROJETO = "PROJETO", "Vaga em projeto"
        MENTORIA = "MENTORIA", "Vaga de mentoria"
        TREINAMENTO = "TREINAMENTO", "Trilha de treinamento"
        MOVIMENTACAO = "MOVIMENTACAO", "Movimentação interna"
        COMUNIDADE = "COMUNIDADE", "Comunidade de prática"

    titulo = models.CharField("título", max_length=200)
    descricao = models.TextField("descrição", blank=True, default="")
    tipo = models.CharField("tipo", max_length=16, choices=Tipo.choices, default=Tipo.PROJETO, db_index=True)
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name="oportunidades")
    skills_requeridas = models.ManyToManyField(Skill, blank=True, related_name="oportunidades")
    nivel_minimo = models.PositiveSmallIntegerField("nível mínimo", default=3)
    responsavel = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="oportunidades")
    carga_horaria = models.PositiveIntegerField("carga horária semanal (h)", default=0)
    data_abertura = models.DateField("abertura", default=timezone.localdate)
    data_limite = models.DateField("candidaturas até", null=True, blank=True)
    vagas = models.PositiveSmallIntegerField("vagas", default=1)
    ativa = models.BooleanField("ativa", default=True, db_index=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "oportunidade interna"
        verbose_name_plural = "oportunidades internas"
        ordering = ["-data_abertura"]

    def __str__(self) -> str:
        return self.titulo


class OpportunityApplication(models.Model):
    """Candidatura a oportunidade interna (RF-86)."""

    class Status(models.TextChoices):
        CANDIDATADO = "CANDIDATADO", "Candidatado"
        EM_ANALISE = "EM_ANALISE", "Em análise"
        APROVADO = "APROVADO", "Aprovado"
        RECUSADO = "RECUSADO", "Recusado"
        DESISTIU = "DESISTIU", "Desistiu"

    opportunity = models.ForeignKey(InternalOpportunity, on_delete=models.CASCADE, related_name="candidaturas")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="candidaturas")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.CANDIDATADO, db_index=True)
    motivacao = models.TextField("motivação", blank=True, default="")
    aderencia = models.FloatField("aderência calculada", default=0)
    skills_atendidas = models.JSONField("skills atendidas", default=list, blank=True)
    skills_gap = models.JSONField("gaps", default=list, blank=True)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "candidatura"
        verbose_name_plural = "candidaturas"
        unique_together = ("opportunity", "user")
        ordering = ["-aderencia"]

    def __str__(self) -> str:
        return f"{self.user.nome} → {self.opportunity.titulo}"


class PosicaoChave(models.Model):
    """Posição crítica para o mapa de sucessão (RF-87)."""

    titulo = models.CharField("título da posição", max_length=180)
    area = models.CharField("área", max_length=140, blank=True, default="")
    ocupante = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="posicoes_ocupadas"
    )
    gestor = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="posicoes_gerenciadas"
    )
    skills_criticas = models.ManyToManyField(Skill, blank=True, related_name="posicoes_chave")
    criticidade = models.CharField("criticidade", max_length=16, choices=CriticidadeSkill.choices, default=CriticidadeSkill.ALTA)
    risco_sucessao = models.CharField("risco de sucessão", max_length=12, default="MEDIO")
    observacao = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "posição-chave"
        verbose_name_plural = "posições-chave"
        ordering = ["titulo"]

    def __str__(self) -> str:
        return self.titulo


class SuccessionPlan(models.Model):
    """Sucessor mapeado para uma posição-chave (RF-87/RF-88)."""

    class Prontidao(models.TextChoices):
        PRONTO_AGORA = "PRONTO_AGORA", "Pronto agora"
        PRONTO_1_2_ANOS = "PRONTO_1_2_ANOS", "Pronto em 1–2 anos"
        PRONTO_3_5_ANOS = "PRONTO_3_5_ANOS", "Pronto em 3–5 anos"
        DESENVOLVER = "DESENVOLVER", "A desenvolver"

    posicao = models.ForeignKey(PosicaoChave, on_delete=models.CASCADE, related_name="sucessores")
    sucessor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="planos_sucessao")
    prontidao = models.CharField(max_length=16, choices=Prontidao.choices, default=Prontidao.PRONTO_1_2_ANOS)
    aderencia = models.FloatField("aderência", default=0)
    gaps = models.JSONField("gaps", default=list, blank=True)
    plano_desenvolvimento = models.TextField("plano de desenvolvimento", blank=True, default="")
    prioridade = models.PositiveSmallIntegerField("prioridade", default=1)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "plano de sucessão"
        verbose_name_plural = "planos de sucessão"
        unique_together = ("posicao", "sucessor")
        ordering = ["prioridade"]

    def __str__(self) -> str:
        return f"{self.sucessor.nome} → {self.posicao.titulo}"

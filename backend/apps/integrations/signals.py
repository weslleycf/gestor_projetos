"""Receptores que alimentam a fila de eventos de integração.

Usa sinais do Django em vez de alterar os apps de domínio: a integração
observa o que acontece no SGP e publica eventos, sem acoplar o domínio à
camada de integração.
"""
from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.capabilities.models import EmployeeTraining, SkillEvidence, SugestaoPromocao
from apps.portfolio.models import Milestone, Project
from apps.resources.models import Alocacao, StatusAlocacao
from apps.risks.models import Issue, Risk
from apps.tasks.models import StatusTarefa, Task

from .models import TipoEvento
from .services import registrar_evento


def _descricao(instancia) -> str:
    for atributo in ("nome", "titulo", "descricao", "texto"):
        valor = getattr(instancia, atributo, None)
        if valor:
            return str(valor)[:200]
    return str(instancia)[:200]


def _projeto_id_de(instancia) -> int | None:
    direto = getattr(instancia, "projeto_id", None)
    if direto:
        return direto
    project = getattr(instancia, "project", None)
    if project is not None:
        return project.pk if hasattr(project, "pk") else int(project)
    projeto = getattr(instancia, "project_id", None)
    return projeto or None


@receiver(post_save, sender=Task, dispatch_uid="sgp_evento_tarefa")
def ao_salvar_tarefa(sender, instance: Task, created: bool, **kwargs):
    if created:
        registrar_evento(
            TipoEvento.TAREFA_CRIADA,
            entidade="tasks.task",
            entidade_id=instance.pk,
            titulo=instance.nome,
            projeto_id=instance.project_id,
            payload={
                "id": instance.pk,
                "nome": instance.nome,
                "projeto": instance.project.nome if instance.project_id else "",
                "projeto_id": instance.project_id,
                "status": instance.status,
                "prioridade": instance.prioridade,
                "responsavel": instance.responsavel.nome if instance.responsavel_id else "",
                "data_fim": instance.data_fim.isoformat() if instance.data_fim else None,
            },
        )
        return

    if instance.status == StatusTarefa.CONCLUIDA:
        registrar_evento(
            TipoEvento.TAREFA_CONCLUIDA,
            entidade="tasks.task",
            entidade_id=instance.pk,
            titulo=instance.nome,
            projeto_id=instance.project_id,
            payload={
                "id": instance.pk,
                "nome": instance.nome,
                "projeto_id": instance.project_id,
                "concluida_em": instance.data_fim_real.isoformat() if instance.data_fim_real else None,
                "esforco_real": float(instance.esforco_real or 0),
                "responsavel": instance.responsavel.nome if instance.responsavel_id else "",
            },
        )


@receiver(post_save, sender=Project, dispatch_uid="sgp_evento_projeto")
def ao_salvar_projeto(sender, instance: Project, created: bool, **kwargs):
    if created:
        registrar_evento(
            TipoEvento.PROJETO_CRIADO,
            entidade="portfolio.project",
            entidade_id=instance.pk,
            titulo=instance.nome,
            projeto_id=instance.pk,
            payload={
                "id": instance.pk,
                "codigo": instance.codigo,
                "nome": instance.nome,
                "status": instance.status,
                "prioridade": instance.prioridade,
                "gerente": instance.manager.nome if instance.manager_id else "",
                "data_inicio": instance.data_inicio.isoformat() if instance.data_inicio else None,
                "data_fim": instance.data_fim.isoformat() if instance.data_fim else None,
                "orcamento": float(instance.orcamento or 0),
            },
        )
        return

    if instance.status == "CONCLUIDO":
        registrar_evento(
            TipoEvento.PROJETO_CONCLUIDO,
            entidade="portfolio.project",
            entidade_id=instance.pk,
            titulo=instance.nome,
            projeto_id=instance.pk,
            payload={
                "id": instance.pk,
                "codigo": instance.codigo,
                "nome": instance.nome,
                "concluido_em": instance.data_fim_real.isoformat() if instance.data_fim_real else None,
                "percentual": instance.percentual_conclusao,
            },
        )
    elif instance.saude == "VERMELHO":
        registrar_evento(
            TipoEvento.PROJETO_EM_RISCO,
            entidade="portfolio.project",
            entidade_id=instance.pk,
            titulo=instance.nome,
            projeto_id=instance.pk,
            payload={
                "id": instance.pk,
                "codigo": instance.codigo,
                "nome": instance.nome,
                "saude": instance.saude,
                "progresso_real": instance.percentual_conclusao,
                "progresso_planejado": instance.progresso_planejado,
                "gerente": instance.manager.nome if instance.manager_id else "",
            },
        )


@receiver(post_save, sender=Risk, dispatch_uid="sgp_evento_risco")
def ao_salvar_risco(sender, instance: Risk, created: bool, **kwargs):
    if not created:
        return
    criticidade_alta = instance.nivel in {"ALTO", "EXTREMO"}
    registrar_evento(
        TipoEvento.RISCO_CRITICO if criticidade_alta else TipoEvento.RISCO_CRIADO,
        entidade="risks.risk",
        entidade_id=instance.pk,
        titulo=instance.descricao[:180],
        projeto_id=instance.project_id,
        payload={
            "id": instance.pk,
            "codigo": instance.codigo,
            "descricao": instance.descricao[:400],
            "categoria": instance.categoria,
            "probabilidade": instance.probabilidade,
            "impacto": instance.impacto,
            "severidade": instance.severidade,
            "nivel": instance.nivel,
            "projeto_id": instance.project_id,
            "projeto": instance.project.nome if instance.project_id else "",
            "responsavel": instance.responsavel.nome if instance.responsavel_id else "",
        },
    )


@receiver(post_save, sender=Issue, dispatch_uid="sgp_evento_issue")
def ao_salvar_issue(sender, instance: Issue, created: bool, **kwargs):
    if not created:
        return
    registrar_evento(
        TipoEvento.ISSUE_CRIADA,
        entidade="risks.issue",
        entidade_id=instance.pk,
        titulo=instance.titulo,
        projeto_id=instance.project_id,
        payload={
            "id": instance.pk,
            "codigo": instance.codigo,
            "titulo": instance.titulo,
            "tipo": instance.tipo,
            "prioridade": instance.prioridade,
            "projeto_id": instance.project_id,
            "responsavel": instance.responsavel.nome if instance.responsavel_id else "",
        },
    )


@receiver(post_save, sender=Alocacao, dispatch_uid="sgp_evento_alocacao")
def ao_salvar_alocacao(sender, instance: Alocacao, created: bool, **kwargs):
    if not created or instance.status not in {StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO}:
        return
    registrar_evento(
        TipoEvento.ALOCACAO_CRIADA,
        entidade="resources.alocacao",
        entidade_id=instance.pk,
        titulo=(instance.user.nome if instance.user_id else "") + " em " + instance.project.nome,
        projeto_id=instance.project_id,
        payload={
            "id": instance.pk,
            "pessoa": instance.user.nome if instance.user_id else (instance.recurso.nome if instance.recurso_id else ""),
            "email": instance.user.email if instance.user_id else "",
            "projeto_id": instance.project_id,
            "projeto": instance.project.nome,
            "tarefa": instance.task.nome if instance.task_id else "",
            "percentual": instance.percentual,
            "inicio": instance.data_inicio.isoformat(),
            "fim": instance.data_fim.isoformat(),
            "modalidade": instance.modalidade,
            "score": instance.score_matching,
            "override": instance.override_manual,
        },
    )


@receiver(post_save, sender=Milestone, dispatch_uid="sgp_evento_marco")
def ao_salvar_marco(sender, instance: Milestone, created: bool, **kwargs):
    if instance.status != "CONCLUIDO":
        return
    registrar_evento(
        TipoEvento.MARCO_CONCLUIDO,
        entidade="portfolio.milestone",
        entidade_id=instance.pk,
        titulo=instance.nome,
        projeto_id=instance.project_id,
        payload={
            "id": instance.pk,
            "nome": instance.nome,
            "projeto_id": instance.project_id,
            "projeto": instance.project.nome if instance.project_id else "",
            "data_prevista": instance.data_prevista.isoformat(),
            "data_real": instance.data_real.isoformat() if instance.data_real else None,
            "critico": instance.critico,
        },
    )


@receiver(post_save, sender=SugestaoPromocao, dispatch_uid="sgp_evento_promocao")
def ao_salvar_promocao(sender, instance: SugestaoPromocao, created: bool, **kwargs):
    perfil = instance.employee_skill
    if created:
        registrar_evento(
            TipoEvento.PROMOCAO_SOLICITADA,
            entidade="capabilities.sugestaopromocao",
            entidade_id=instance.pk,
            titulo=perfil.user.nome + " · " + perfil.skill.nome,
            payload={
                "id": instance.pk,
                "pessoa": perfil.user.nome,
                "email": perfil.user.email,
                "capacidade": perfil.skill.nome,
                "nivel_atual": instance.nivel_atual,
                "nivel_proposto": instance.nivel_proposto,
            },
        )
    elif instance.status == "APROVADA":
        registrar_evento(
            TipoEvento.PROMOCAO_APROVADA,
            entidade="capabilities.sugestaopromocao",
            entidade_id=instance.pk,
            titulo=perfil.user.nome + " · " + perfil.skill.nome + " nível " + str(instance.nivel_proposto),
            payload={
                "id": instance.pk,
                "pessoa": perfil.user.nome,
                "email": perfil.user.email,
                "capacidade": perfil.skill.nome,
                "nivel_novo": instance.nivel_proposto,
                "validado_por": instance.validado_por.nome if instance.validado_por_id else "",
            },
        )


@receiver(post_save, sender=EmployeeTraining, dispatch_uid="sgp_evento_treinamento")
def ao_salvar_treinamento(sender, instance: EmployeeTraining, created: bool, **kwargs):
    if instance.status != "CONCLUIDO":
        return
    registrar_evento(
        TipoEvento.TREINAMENTO_CONCLUIDO,
        entidade="capabilities.employeetraining",
        entidade_id=instance.pk,
        titulo=instance.user.nome + " · " + instance.training.nome,
        payload={
            "id": instance.pk,
            "pessoa": instance.user.nome,
            "email": instance.user.email,
            "treinamento": instance.training.nome,
            "fornecedor": instance.training.fornecedor,
            "carga_horaria": instance.training.carga_horaria,
            "nota": instance.nota,
            "concluido_em": instance.data_conclusao.isoformat() if instance.data_conclusao else None,
            "certificado": instance.certificado_url,
            "origem": instance.origem,
        },
    )


@receiver(post_save, sender=SkillEvidence, dispatch_uid="sgp_evento_evidencia")
def ao_salvar_evidencia(sender, instance: SkillEvidence, created: bool, **kwargs):
    if not instance.valida:
        return
    perfil = instance.employee_skill
    registrar_evento(
        TipoEvento.EVIDENCIA_VALIDADA,
        entidade="capabilities.skillevidence",
        entidade_id=instance.pk,
        titulo=perfil.user.nome + " · " + perfil.skill.nome,
        payload={
            "id": instance.pk,
            "pessoa": perfil.user.nome,
            "email": perfil.user.email,
            "capacidade": perfil.skill.nome,
            "tipo": instance.tipo,
            "descricao": instance.descricao[:300],
            "url": instance.url,
            "emitido_por": instance.emitido_por,
            "data": instance.data.isoformat() if instance.data else None,
        },
    )

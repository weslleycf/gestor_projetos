"""Serviços de capacidade: evolução, matching explicável, gap, forecast e bus factor.

Implementa a especificação §3.9 e §9 (motor de alocação inteligente).
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings as dj
from django.db import transaction
from django.db.models import Avg, Count, Max, Q, Sum
from django.utils import timezone

from apps.core.models import Perfil, User, Visibilidade
from apps.core.services import notificar, notificar_muitos, registrar_auditoria

SGP = dj.SGP


# ===========================================================================
# 1. Evolução de capacidade — nível consolidado, XP, promoção e decay
# ===========================================================================
PESOS_AVALIACAO = {
    "AUTOAVALIACAO": 0.5,
    "GESTOR": 1.5,
    "PAR": 1.0,
    "MENTOR": 1.3,
    "BANCA": 1.8,
    "CLIENTE": 1.2,
    "SISTEMA": 0.8,
}


def calcular_nivel_consolidado(employee_skill) -> float:
    """Média ponderada das avaliações configuráveis (RF-54)."""
    from .models import SkillAssessment

    avaliacoes = list(employee_skill.avaliacoes.all())
    if not avaliacoes:
        consolidado = float(employee_skill.nivel_atual or 0)
    else:
        soma_pesos = sum(PESOS_AVALIACAO.get(a.tipo, 1.0) * (a.peso or 1.0) for a in avaliacoes)
        soma = sum(a.nivel_atribuido * PESOS_AVALIACAO.get(a.tipo, 1.0) * (a.peso or 1.0) for a in avaliacoes)
        consolidado = round(soma / soma_pesos, 2) if soma_pesos else float(employee_skill.nivel_atual or 0)
    if employee_skill.nivel_validado:
        consolidado = round((consolidado + employee_skill.nivel_validado) / 2, 2)
    if employee_skill.nivel_consolidado != consolidado:
        employee_skill.nivel_consolidado = consolidado
        employee_skill.save(update_fields=["nivel_consolidado", "atualizado_em"])
    return consolidado


def creditar_xp(user, skill, xp: int, *, origem: str = "MANUAL", motivo: str = "", referencia: str = "",
                registrado_por=None, atualizar_utilizacao: bool = True):
    """Credita XP e verifica critérios de promoção (RF-56/RF-57)."""
    from .models import EmployeeSkill, OrigemHistorico, SkillHistory

    if xp == 0 or skill is None:
        return None
    perfil, _ = EmployeeSkill.objects.get_or_create(
        user=user, skill=skill, defaults={"nivel_atual": 1, "data_atingiu_nivel": timezone.localdate()}
    )
    anterior = perfil.xp_acumulado
    perfil.xp_acumulado = max(0, anterior + xp)
    campos = ["xp_acumulado", "atualizado_em"]
    if atualizar_utilizacao and xp > 0:
        perfil.ultima_utilizacao = timezone.localdate()
        campos.append("ultima_utilizacao")
        if perfil.status == "ENFERRUJADA":
            perfil.status = "ATIVA"
            campos.append("status")
    perfil.save(update_fields=campos)

    SkillHistory.objects.create(
        employee_skill=perfil,
        nivel_anterior=perfil.nivel_atual,
        nivel_novo=perfil.nivel_atual,
        xp_movimento=xp,
        motivo=motivo or f"XP creditado ({origem})",
        origem=origem if origem in OrigemHistorico.values else OrigemHistorico.MANUAL,
        referencia=referencia[:200],
        registrado_por=registrado_por,
    )
    sugestao = verificar_e_sugerir_promocao(perfil, registrado_por=registrado_por)
    return {"perfil": perfil, "xp_anterior": anterior, "xp_atual": perfil.xp_acumulado, "sugestao": sugestao}


def creditar_xp_por_tarefa(task, user=None, registrado_por=None):
    """Concluiu tarefa → credita XP nas capacidades exigidas ou usadas (UC-07)."""
    from apps.tasks.models import TaskSkillRequirement

    responsavel = user or task.responsavel
    if responsavel is None:
        return []
    requisitos = list(TaskSkillRequirement.objects.filter(task=task).select_related("skill"))
    if not requisitos:
        requisitos_skill = list(task.project.requisitos_skill.select_related("skill"))
        resultados = []
        for req in requisitos_skill:
            resultados.append(
                creditar_xp(
                    responsavel, req.skill, SGP["XP_POR_TAREFA_CONCLUIDA"],
                    origem="TAREFA", motivo=f"Conclusão da tarefa: {task.nome}",
                    referencia=f"tarefa#{task.id}", registrado_por=registrado_por,
                )
            )
        return [r for r in resultados if r]
    fator = max(0.2, float(task.esforco_estimado or 1) / 8.0)
    resultados = []
    for req in requisitos:
        xp = int(SGP["XP_POR_TAREFA_CONCLUIDA"] * (req.peso or 1.0) * min(3.0, fator))
        resultados.append(
            creditar_xp(
                responsavel, req.skill, max(1, xp),
                origem="TAREFA", motivo=f"Conclusão da tarefa: {task.nome}",
                referencia=f"tarefa#{task.id}", registrado_por=registrado_por,
            )
        )
    return [r for r in resultados if r]


def verificar_e_sugerir_promocao(employee_skill, registrado_por=None):
    """Gera sugestão de promoção quando os critérios são atingidos (RF-57)."""
    from .models import NivelProficiencia, SugestaoPromocao

    if employee_skill.nivel_atual >= 5:
        return None
    if SugestaoPromocao.objects.filter(
        employee_skill=employee_skill, status=SugestaoPromocao.Status.PENDENTE
    ).exists():
        return None
    analise = employee_skill.criterios_proximo_nivel()
    if not analise["elegivel"]:
        return None
    sugestao = SugestaoPromocao.objects.create(
        employee_skill=employee_skill,
        nivel_atual=employee_skill.nivel_atual,
        nivel_proposto=analise["nivel_proposto"],
        justificativa=(
            f"XP {employee_skill.xp_acumulado}, "
            f"{employee_skill.evidencia_valida()} evidência(s) validada(s) e "
            f"{employee_skill.avaliacoes.count()} avaliação(ões) registradas."
        ),
        criterios_atendidos=analise["checagens"],
    )
    notificar(
        employee_skill.user,
        f"Você está elegível ao nível {analise['nivel_proposto']} em {employee_skill.skill.nome}!",
        mensagem="Sua evolução atingiu os critérios. Aguardando validação.",
        nivel="SUCESSO", icone="trophy", link=f"/capacidades/perfil/{employee_skill.user_id}",
        entidade="capabilities.sugestaopromocao", entidade_id=sugestao.id,
    )
    gestores = [employee_skill.user.gestor] if employee_skill.user.gestor_id else []
    gestores += list(User.objects.filter(perfil__in=[Perfil.RH, Perfil.PMO]))
    notificar_muitos(
        gestores,
        f"Promoção pendente: {employee_skill.user.nome} · {employee_skill.skill.nome}",
        mensagem=f"Nível {employee_skill.nivel_atual} → {analise['nivel_proposto']}",
        nivel="ALERTA", icone="badge-check", link="/capacidades/validacoes",
        entidade="capabilities.sugestaopromocao", entidade_id=sugestao.id,
    )
    return sugestao


@transaction.atomic
def validar_promocao(sugestao, *, aprovador, aprovar: bool, comentario: str = "", nivel_final: int | None = None):
    """Validação humana obrigatória da promoção (RF-58)."""
    from .models import OrigemHistorico, SkillHistory, SugestaoPromocao

    if sugestao.status != SugestaoPromocao.Status.PENDENTE:
        raise ValueError("Esta sugestão já foi decidida.")
    perfil = sugestao.employee_skill
    if aprovar:
        alvo = nivel_final or sugestao.nivel_proposto
        anterior = perfil.nivel_atual
        perfil.nivel_atual = alvo
        perfil.nivel_validado = alvo
        perfil.data_atingiu_nivel = timezone.localdate()
        perfil.save(update_fields=["nivel_atual", "nivel_validado", "data_atingiu_nivel", "atualizado_em"])
        sugestao.status = SugestaoPromocao.Status.APROVADA
        SkillHistory.objects.create(
            employee_skill=perfil, nivel_anterior=anterior, nivel_novo=alvo,
            motivo=comentario or "Promoção validada", origem=OrigemHistorico.PROMOCAO,
            referencia=f"sugestao#{sugestao.id}", registrado_por=aprovador,
        )
        notificar(
            perfil.user,
            f"Nível atualizado: {perfil.skill.nome} → {alvo}",
            mensagem=comentario or "Sua promoção foi validada!",
            nivel="SUCESSO", icone="party-popper",
            link=f"/capacidades/perfil/{perfil.user_id}",
        )
    else:
        sugestao.status = SugestaoPromocao.Status.REJEITADA
        notificar(
            perfil.user,
            f"Promoção não aprovada: {perfil.skill.nome}",
            mensagem=comentario or "Continue desenvolvendo a capacidade.",
            nivel="ALERTA", icone="info",
        )
    sugestao.validado_por = aprovador
    sugestao.validado_em = timezone.now()
    sugestao.comentario_validacao = comentario
    sugestao.save()
    registrar_auditoria(
        entidade="capabilities.sugestaopromocao", acao="VALIDAR", instancia=sugestao,
        user=aprovador, justificativa=comentario,
    )
    return sugestao


def detectar_decay(marcar: bool = True) -> list[dict]:
    """Detecta enferrujamento por falta de uso e sugere reciclagem (RF-59/RF-60)."""
    from .models import EmployeeSkill, StatusPerfilSkill

    limite = timezone.localdate() - timedelta(days=SGP["DIAS_PARA_DECAY"])
    candidatos = EmployeeSkill.objects.select_related("user", "skill").filter(
        nivel_atual__gte=2, ultima_utilizacao__lt=limite
    ).exclude(status=StatusPerfilSkill.ENFERRUJADA)
    resultados = []
    for perfil in candidatos:
        dias = perfil.dias_sem_uso or 0
        resultados.append(
            {
                "employee_skill_id": perfil.id,
                "user": perfil.user.nome,
                "user_id": perfil.user_id,
                "skill": perfil.skill.nome,
                "skill_id": perfil.skill_id,
                "nivel_atual": perfil.nivel_atual,
                "dias_sem_uso": dias,
                "acao_sugerida": (
                    "Mentoria com especialista" if perfil.nivel_atual >= 4
                    else "Treinamento de reciclagem" if perfil.nivel_atual >= 3
                    else "Prática supervisionada"
                ),
            }
        )
        if marcar:
            perfil.status = StatusPerfilSkill.ENFERRUJADA
            perfil.save(update_fields=["status", "atualizado_em"])
            notificar(
                perfil.user,
                f"Capacidade enferrujada: {perfil.skill.nome}",
                mensagem=f"Sem uso há {dias} dias. Considere uma ação de reciclagem no seu PDI.",
                nivel="ALERTA", icone="snowflake", link="/capacidades/pdi",
            )
    return resultados


def registrar_regressao(employee_skill, novo_nivel: int, *, motivo: str, registrado_por=None):
    """Registra regressão de nível com justificativa (RF-61)."""
    from .models import OrigemHistorico, SkillHistory

    anterior = employee_skill.nivel_atual
    employee_skill.nivel_atual = novo_nivel
    employee_skill.data_atingiu_nivel = timezone.localdate()
    employee_skill.save(update_fields=["nivel_atual", "data_atingiu_nivel", "atualizado_em"])
    SkillHistory.objects.create(
        employee_skill=employee_skill, nivel_anterior=anterior, nivel_novo=novo_nivel,
        motivo=motivo, origem=OrigemHistorico.REGRESSAO, registrado_por=registrado_por,
    )
    registrar_auditoria(
        entidade="capabilities.employeeskill", acao="ATUALIZAR", instancia=employee_skill,
        user=registrado_por, justificativa=motivo,
    )
    return employee_skill


def radar_skills(user) -> dict:
    """Radar individual: atual × validado × desejado (RF-50/RF-55)."""
    perfis = list(
        user.perfis_skill.select_related("skill", "skill__categoria").exclude(
            visibilidade=Visibilidade.PRIVADO
        ) if user != getattr(user, "_solicitante", None) else user.perfis_skill.select_related("skill")
    )
    eixos = [
        {
            "skill_id": p.skill_id,
            "skill": p.skill.nome,
            "categoria": p.skill.categoria.nome if p.skill.categoria_id else "",
            "cor": p.skill.cor,
            "icone": p.skill.icone,
            "atual": p.nivel_atual,
            "consolidado": round(p.nivel_efetivo, 2),
            "validado": p.nivel_validado,
            "desejado": p.nivel_desejado,
            "xp": p.xp_acumulado,
            "status": p.status,
            "gap": p.gap,
        }
        for p in perfis
    ]
    eixos.sort(key=lambda e: (-e["consolidado"], e["skill"]))
    return {
        "user_id": user.id,
        "nome": user.nome,
        "total_skills": len(eixos),
        "nivel_medio": round(sum(e["consolidado"] for e in eixos) / len(eixos), 2) if eixos else 0,
        "eixos": eixos[:12],
        "todos": eixos,
        "por_categoria": _agrupar_por_categoria(eixos),
    }


def _agrupar_por_categoria(eixos: list[dict]) -> list[dict]:
    grupos: dict[str, list] = defaultdict(list)
    for eixo in eixos:
        grupos[eixo["categoria"] or "Sem categoria"].append(eixo)
    return [
        {
            "categoria": nome,
            "total": len(itens),
            "nivel_medio": round(sum(i["consolidado"] for i in itens) / len(itens), 2),
            "skills": itens,
        }
        for nome, itens in sorted(grupos.items(), key=lambda kv: -len(kv[1]))
    ]


def creditar_por_timesheet(timesheet, registrado_por=None):
    """Horas aprovadas também geram XP proporcional (RNF de evolução contínua)."""
    if not timesheet.aprovado or not timesheet.task_id:
        return []
    from apps.tasks.models import TaskSkillRequirement

    xp = int(float(timesheet.horas) * SGP["XP_POR_HORA_REGISTRADA"]) or 1
    requisitos = TaskSkillRequirement.objects.filter(task_id=timesheet.task_id).select_related("skill")
    if not requisitos.exists():
        requisitos = timesheet.task.project.requisitos_skill.select_related("skill")
    resultados = []
    for req in requisitos:
        resultados.append(
            creditar_xp(
                timesheet.user, req.skill, xp, origem="TAREFA",
                motivo=f"Horas aprovadas em {timesheet.task.nome}",
                referencia=f"timesheet#{timesheet.id}", registrado_por=registrado_por,
            )
        )
    return [r for r in resultados if r]

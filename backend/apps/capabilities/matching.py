"""Motor de Alocação Inteligente — especificação §9.

Score = w1·SkillMatch + w2·Disponibilidade + w3·Custo
      + w4·Preferência + w5·Experiência + w6·Proximidade - penalidades
"""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from apps.core.models import User
from apps.core.services import notificar, registrar_auditoria

from .services import SGP

PESOS_POR_MODO = {
    "PERFORMANCE": {"skill": 0.45, "disponibilidade": 0.20, "custo": 0.10, "preferencia": 0.05, "experiencia": 0.15, "proximidade": 0.05},
    "DESENVOLVIMENTO": {"skill": 0.25, "disponibilidade": 0.15, "custo": 0.10, "preferencia": 0.20, "experiencia": 0.05, "proximidade": 0.10},
    "MISTO": {"skill": 0.35, "disponibilidade": 0.18, "custo": 0.12, "preferencia": 0.12, "experiencia": 0.13, "proximidade": 0.10},
}
DESCRICAO_MODOS = {
    "PERFORMANCE": "Maximiza aderência técnica e experiência para entrega imediata.",
    "DESENVOLVIMENTO": "Prioriza o crescimento do colaborador com gap controlado e apoio de mentor.",
    "MISTO": "Equilibra entrega e transferência de conhecimento (sênior + em desenvolvimento).",
}
CHAVES_PESO = ("skill", "disponibilidade", "custo", "preferencia", "experiencia", "proximidade")


def fator_skill(nivel: float, requerido: int, modo: str) -> float:
    """f(nível_colab, nível_req) conforme §9.1, com variante de desenvolvimento."""
    if requerido <= 0:
        return 1.0
    if modo == "DESENVOLVIMENTO":
        alvo = max(1, requerido - 1)
        distancia = abs(nivel - alvo)
        base = max(0.0, 1.0 - distancia * 0.35)
        return min(1.0, base + 0.05) if nivel >= requerido else base
    if nivel >= requerido:
        excedente = min(nivel - requerido, 2.0)
        return 1.0 + SGP["BONUS_EXCEDENTE"] * (excedente / 2.0)
    return nivel / requerido


def normalizar(valor: float, minimo: float, maximo: float) -> float:
    if maximo <= minimo:
        return 0.5
    return max(0.0, min(1.0, (valor - minimo) / (maximo - minimo)))


def requisitos_do_alvo(task=None, project=None) -> list[dict]:
    from apps.tasks.models import TaskSkillRequirement

    from .models import ProjectSkillRequirement

    if task is not None:
        reqs = list(TaskSkillRequirement.objects.filter(task=task).select_related("skill"))
        if reqs:
            return [
                {
                    "skill_id": r.skill_id, "skill": r.skill.nome, "icone": r.skill.icone,
                    "cor": r.skill.cor, "nivel_minimo": r.nivel_minimo,
                    "peso": r.peso or 1.0, "obrigatorio": r.obrigatorio,
                }
                for r in reqs
            ]
        project = task.project
    if project is not None:
        return [
            {
                "skill_id": r.skill_id, "skill": r.skill.nome, "icone": r.skill.icone,
                "cor": r.skill.cor, "nivel_minimo": r.nivel_minimo,
                "peso": r.peso or 1.0, "obrigatorio": r.obrigatorio,
            }
            for r in ProjectSkillRequirement.objects.filter(project=project).select_related("skill")
        ]
    return []


def motor_matching(
    *,
    task=None,
    project=None,
    modo: str = "PERFORMANCE",
    candidatos=None,
    limite: int = 10,
    persistir: bool = True,
    solicitante=None,
    incluir_alocados: bool = False,
    pesos_override: dict | None = None,
) -> dict:
    """Executa o matching e devolve cards ranqueados com justificativa visual (§9.3)."""
    from apps.resources.models import Alocacao, StatusAlocacao
    from apps.resources.services import disponibilidade_no_periodo

    from .models import AllocationRecommendation, EmployeeSkill

    if modo not in PESOS_POR_MODO:
        modo = "PERFORMANCE"
    if task is None and project is None:
        raise ValueError("Informe uma tarefa ou um projeto para o motor de alocação.")

    alvo = task if task is not None else project
    alvo_projeto = task.project if task is not None else project
    requisitos = requisitos_do_alvo(task=task, project=project)
    pesos = dict(pesos_override or PESOS_POR_MODO[modo])

    inicio = getattr(alvo, "data_inicio", None) or alvo_projeto.data_inicio or timezone.localdate()
    fim = getattr(alvo, "data_fim", None) or alvo_projeto.data_fim or (inicio + timedelta(days=30))

    pool = list(candidatos) if candidatos is not None else list(
        User.objects.filter(ativo=True, aceita_recomendacoes=True)
    )
    if not incluir_alocados and task is not None:
        ja_alocados = set(
            Alocacao.objects.filter(
                task=task, user__isnull=False,
                status__in=[StatusAlocacao.PROPOSTA, StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO],
            ).values_list("user_id", flat=True)
        )
        pool = [u for u in pool if u.id not in ja_alocados]
    if not pool:
        return {
            "modo": modo, "modo_descricao": DESCRICAO_MODOS.get(modo, ""), "pesos": pesos,
            "requisitos": requisitos, "recomendacoes": [], "total_avaliados": 0,
            "alvo": {"tipo": "tarefa" if task is not None else "projeto", "id": alvo.id,
                     "nome": getattr(alvo, "nome", ""), "projeto": alvo_projeto.nome,
                     "projeto_id": alvo_projeto.id},
            "explicacao_formula": _formula(modo, pesos),
        }

    ids_pool = [u.id for u in pool]
    mapa_perfis: dict[int, dict[int, EmployeeSkill]] = defaultdict(dict)
    for perfil in EmployeeSkill.objects.filter(user_id__in=ids_pool).select_related("skill"):
        mapa_perfis[perfil.user_id][perfil.skill_id] = perfil

    custos = [float(u.custo_hora or 0) for u in pool]
    min_custo, max_custo = (min(custos), max(custos)) if custos else (0.0, 1.0)
    if max_custo <= min_custo:
        max_custo = min_custo + 1.0
    anos_pool = [
        ((timezone.localdate() - u.data_admissao).days / 365.0) if u.data_admissao else 0.0 for u in pool
    ]
    max_exp = max(anos_pool) or 1.0

    carga_periodo: dict[int, int] = defaultdict(int)
    for alocacao in Alocacao.objects.filter(
        user_id__in=ids_pool,
        status__in=[StatusAlocacao.PROPOSTA, StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO],
        data_inicio__lte=fim, data_fim__gte=inicio,
    ):
        carga_periodo[alocacao.user_id] += alocacao.percentual

    tarefas_atrasadas = {
        linha["responsavel_id"]: linha["total"]
        for linha in alvo_projeto.tarefas.filter(data_fim__lt=timezone.localdate())
        .exclude(status__in=["CONCLUIDA", "CANCELADA"]).exclude(responsavel__isnull=True)
        .values("responsavel_id").annotate(total=Count("id"))
    }
    mentores_disponiveis = {
        linha["skill_id"]: linha["total"]
        for linha in EmployeeSkill.objects.filter(
            nivel_atual__gte=4, user__disponivel_para_mentoria=True
        ).values("skill_id").annotate(total=Count("id"))
    }

    peso_skills = sum(r["peso"] for r in requisitos) or 1.0
    resultados = []

    for usuario in pool:
        perfis_usuario = mapa_perfis.get(usuario.id, {})
        skills_atendidas, gaps = [], []
        soma_skill = 0.0
        bloqueio_obrigatoria = False

        for req in requisitos:
            perfil = perfis_usuario.get(req["skill_id"])
            nivel = round(perfil.nivel_efetivo, 2) if perfil else 0.0
            fator = fator_skill(nivel, req["nivel_minimo"], modo)
            soma_skill += req["peso"] * fator
            entrada = {
                "skill": req["skill"], "skill_id": req["skill_id"], "icone": req["icone"],
                "cor": req["cor"], "requerido": req["nivel_minimo"], "atual": nivel,
                "peso": round(req["peso"], 2), "fator": round(fator, 3),
                "obrigatorio": req["obrigatorio"],
            }
            if nivel >= req["nivel_minimo"]:
                skills_atendidas.append(entrada)
            else:
                entrada["deficit"] = round(req["nivel_minimo"] - nivel, 2)
                entrada["acao_sugerida"] = _acao_para_gap(req, perfil, mentores_disponiveis)
                gaps.append(entrada)
                if req["obrigatorio"]:
                    bloqueio_obrigatoria = True

        skill_match = (soma_skill / peso_skills) if requisitos else 0.6
        disponivel = disponibilidade_no_periodo(usuario.id, inicio, fim)
        fator_disponibilidade = disponivel / 100.0
        custo = float(usuario.custo_hora or 0)
        fator_custo = 1.0 - normalizar(custo, min_custo, max_custo)

        interesses = {str(i).lower() for i in (usuario.interesses or [])}
        nomes_skills = {r["skill"].lower() for r in requisitos}
        fator_preferencia = 0.5
        if interesses & nomes_skills:
            fator_preferencia = 1.0
        elif usuario.disponivel_para_mentoria and modo == "DESENVOLVIMENTO":
            fator_preferencia = 0.75
        if any(p.destaque for p in perfis_usuario.values()):
            fator_preferencia = min(1.0, fator_preferencia + 0.1)

        anos = ((timezone.localdate() - usuario.data_admissao).days / 365.0) if usuario.data_admissao else 0.0
        xp_total = sum(p.xp_acumulado for p in perfis_usuario.values())
        fator_experiencia = 0.6 * normalizar(anos, 0, max_exp) + 0.4 * normalizar(xp_total, 0, 2000)

        fator_proximidade = 0.45
        if alvo_projeto.area and usuario.area and alvo_projeto.area.lower() == usuario.area.lower():
            fator_proximidade = 1.0
        elif alvo_projeto.area and usuario.localizacao and alvo_projeto.area.lower() in usuario.localizacao.lower():
            fator_proximidade = 0.7

        penalidades, total_penalidade = [], 0.0
        carga = carga_periodo.get(usuario.id, 0)
        if carga >= 100:
            valor = SGP["PENALIDADES_MATCHING"]["sobrecarga"]
            total_penalidade += valor
            penalidades.append({"motivo": f"Sobrecarga: {carga}% alocado no período", "valor": valor, "icone": "alert-triangle"})
        if bloqueio_obrigatoria:
            valor = SGP["PENALIDADES_MATCHING"]["skill_obrigatoria"]
            total_penalidade += valor
            penalidades.append({"motivo": "Capacidade obrigatória abaixo do mínimo", "valor": valor, "icone": "shield-alert"})
        atrasadas = tarefas_atrasadas.get(usuario.id, 0)
        if atrasadas >= 3:
            valor = SGP["PENALIDADES_MATCHING"]["historico_ruim"]
            total_penalidade += valor
            penalidades.append({"motivo": f"{atrasadas} tarefas atrasadas no projeto", "valor": valor, "icone": "clock-alert"})
        conflito = alvo_projeto.tarefas.filter(
            responsavel=usuario, critica=True, data_inicio__lte=fim, data_fim__gte=inicio,
        ).exclude(status__in=["CONCLUIDA", "CANCELADA"]).count()
        if conflito and carga >= 80:
            valor = SGP["PENALIDADES_MATCHING"]["conflito_critico"]
            total_penalidade += valor
            penalidades.append({"motivo": "Conflito de agenda com tarefa crítica", "valor": valor, "icone": "calendar-x"})

        score_bruto = (
            pesos["skill"] * skill_match
            + pesos["disponibilidade"] * fator_disponibilidade
            + pesos["custo"] * fator_custo
            + pesos["preferencia"] * fator_preferencia
            + pesos["experiencia"] * fator_experiencia
            + pesos["proximidade"] * fator_proximidade
        )
        score = max(0.0, min(1.0, score_bruto - total_penalidade))

        pode_ver_custo = solicitante is None or getattr(solicitante, "pode_ver_custo", False)
        resultados.append(
            {
                "user_id": usuario.id, "nome": usuario.nome, "iniciais": usuario.iniciais,
                "cor": usuario.cor, "cargo": usuario.cargo, "area": usuario.area,
                "localizacao": usuario.localizacao, "perfil": usuario.perfil,
                "score": round(score, 4),
                "componentes": {
                    "skill": round(skill_match, 3),
                    "disponibilidade": round(fator_disponibilidade, 3),
                    "custo": round(fator_custo, 3),
                    "preferencia": round(fator_preferencia, 3),
                    "experiencia": round(fator_experiencia, 3),
                    "proximidade": round(fator_proximidade, 3),
                },
                "justificativa": {
                    "skills_atendidas": skills_atendidas,
                    "gaps": gaps,
                    "disponibilidade": f"{disponivel:.0f}% disponível a partir de {inicio:%d/%m/%Y}",
                    "disponibilidade_percentual": disponivel,
                    "custo_estimado_reais": round(custo * 8 * max(1, (fim - inicio).days), 2) if pode_ver_custo else None,
                    "custo_hora": custo if pode_ver_custo else None,
                    "modo_recomendado": _modo_recomendado(skill_match, gaps, disponivel),
                    "carga_atual_percentual": carga,
                    "anos_de_casa": round(anos, 1),
                    "xp_total": xp_total,
                },
                "penalidades": penalidades,
                "elegivel": (not bloqueio_obrigatoria) and disponivel > 0,
            }
        )

    resultados.sort(key=lambda r: (-r["score"], r["nome"]))
    for indice, item in enumerate(resultados, start=1):
        item["posicao"] = indice
    selecionados = resultados[:limite]

    if persistir and task is not None and selecionados:
        with transaction.atomic():
            AllocationRecommendation.objects.filter(task=task, status="SUGERIDA").update(status="SUBSTITUIDA")
            for item in selecionados:
                recomendacao = AllocationRecommendation.objects.create(
                    task=task, user_id=item["user_id"], score=item["score"],
                    posicao=item["posicao"], modo=modo, justificativa=item["justificativa"],
                    pesos=pesos, penalidades=item["penalidades"], gerado_por=solicitante,
                )
                item["recomendacao_id"] = recomendacao.id

    return {
        "modo": modo,
        "modo_descricao": DESCRICAO_MODOS.get(modo, ""),
        "pesos": pesos,
        "alvo": {
            "tipo": "tarefa" if task is not None else "projeto",
            "id": alvo.id, "nome": getattr(alvo, "nome", ""),
            "projeto": alvo_projeto.nome, "projeto_id": alvo_projeto.id,
            "periodo": {"inicio": inicio.isoformat(), "fim": fim.isoformat()},
        },
        "requisitos": requisitos,
        "recomendacoes": selecionados,
        "total_avaliados": len(resultados),
        "explicacao_formula": _formula(modo, pesos),
    }


def _formula(modo: str, pesos: dict) -> str:
    return (
        "Score = "
        + " + ".join(f"{pesos[c]:.2f}·{c.capitalize()}" for c in CHAVES_PESO)
        + " − penalidades (sobrecarga, skill obrigatória, conflito crítico, histórico)"
    )


def _acao_para_gap(req: dict, perfil, mentores: dict[int, int]) -> str:
    if mentores.get(req["skill_id"]):
        return f"mentoria com especialista em {req['skill']}"
    if perfil is not None and perfil.nivel_atual >= 1:
        return f"treinamento focado em {req['skill']}"
    return f"capacitação inicial em {req['skill']}"


def _modo_recomendado(skill_match: float, gaps: list, disponivel: float) -> str:
    if gaps and skill_match >= 0.65:
        return "DESENVOLVIMENTO"
    if skill_match >= 0.9 and disponivel >= 50:
        return "PERFORMANCE"
    return "MISTO"


def simular_cenario(*, task=None, project=None, modo="PERFORMANCE", ajustes: dict | None = None) -> dict:
    """Simulação what-if: varia pesos, disponibilidade e custo (RF-73)."""
    ajustes = ajustes or {}
    base_original = motor_matching(
        task=task, project=project, modo=modo, persistir=False,
        limite=int(ajustes.get("limite", 8)), solicitante=None,
    )

    candidatos = None
    if ajustes.get("somente_disponiveis"):
        from apps.resources.models import Alocacao, StatusAlocacao

        alvo = task or project
        inicio = getattr(alvo, "data_inicio", None) or timezone.localdate()
        fim = getattr(alvo, "data_fim", None) or (inicio + timedelta(days=30))
        ocupados = set(
            Alocacao.objects.filter(
                data_inicio__lte=fim, data_fim__gte=inicio,
                status__in=[StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO],
            ).values_list("user_id", flat=True)
        )
        candidatos = list(User.objects.filter(ativo=True).exclude(id__in=ocupados))

    pesos = dict(PESOS_POR_MODO.get(modo, PESOS_POR_MODO["PERFORMANCE"]))
    for chave in CHAVES_PESO:
        if chave in ajustes:
            pesos[chave] = float(ajustes[chave])
    soma = sum(pesos.values()) or 1.0
    pesos = {k: round(v / soma, 4) for k, v in pesos.items()}

    cenario = motor_matching(
        task=task, project=project, modo=modo, persistir=False,
        limite=int(ajustes.get("limite", 8)), candidatos=candidatos,
        pesos_override=pesos, solicitante=None,
    )
    cenario["cenario"] = {"pesos_ajustados": pesos, "ajustes": ajustes, "filtro_disponiveis": bool(candidatos is not None)}
    cenario["comparacao"] = [
        {
            "user_id": a["user_id"],
            "nome": a["nome"],
            "score_ajustado": a["score"],
            "score_original": next(
                (b["score"] for b in base_original["recomendacoes"] if b["user_id"] == a["user_id"]), None
            ),
            "posicao_ajustada": a["posicao"],
            "posicao_original": next(
                (b["posicao"] for b in base_original["recomendacoes"] if b["user_id"] == a["user_id"]), None
            ),
        }
        for a in cenario["recomendacoes"]
    ]
    return cenario


def registrar_decisao_alocacao(
    recomendacao, *, decidido_por, aceitar: bool, observacao: str = "",
    task=None, user=None, percentual: int = 100, data_inicio=None, data_fim=None,
):
    """Aceita a recomendação ou registra override manual com justificativa (RF-74)."""
    from apps.resources.models import Alocacao, ModalidadeAlocacao, StatusAlocacao

    from .models import StatusRecomendacao

    recomendacao.status = StatusRecomendacao.ACEITA if aceitar else StatusRecomendacao.RECUSADA
    recomendacao.decidido_em = timezone.now()
    recomendacao.observacao_decisao = observacao
    recomendacao.save()

    alvo_task = task or recomendacao.task
    alvo_user = user or recomendacao.user
    override = user is not None and user.id != recomendacao.user_id
    alocacao = Alocacao.objects.create(
        project=alvo_task.project,
        task=alvo_task,
        user=alvo_user,
        percentual=percentual,
        data_inicio=data_inicio or alvo_task.data_inicio or timezone.localdate(),
        data_fim=data_fim or alvo_task.data_fim or timezone.localdate(),
        status=StatusAlocacao.CONFIRMADA,
        modalidade=ModalidadeAlocacao.__members__.get(recomendacao.modo, ModalidadeAlocacao.MANUAL),
        score_matching=recomendacao.score,
        justificativa=observacao,
        override_manual=override,
        aprovado_por=decidido_por,
        criado_por=decidido_por,
    )
    registrar_auditoria(
        entidade="resources.alocacao", acao="ALOCAR", instancia=alocacao, user=decidido_por,
        justificativa=observacao or "Alocação a partir de recomendação do motor",
        anteriores={"recomendacao_score": recomendacao.score, "recomendado": recomendacao.user.nome},
        novos={"alocado": alvo_user.nome, "override": override},
    )
    notificar(
        alvo_user,
        f"Você foi alocado em {alvo_task.nome}",
        mensagem=f"Projeto {alvo_task.project.nome} · {percentual}% de dedicação",
        nivel="INFO", icone="user-plus", link=f"/projetos/{alvo_task.project_id}",
    )
    return alocacao


def recomendacoes_salvas(task) -> list[dict]:
    """Devolve recomendações persistidas para reabrir o painel sem recalcular."""
    from .models import AllocationRecommendation

    return [
        {
            "recomendacao_id": r.id,
            "user_id": r.user_id,
            "nome": r.user.nome,
            "iniciais": r.user.iniciais,
            "cor": r.user.cor,
            "cargo": r.user.cargo,
            "score": r.score,
            "posicao": r.posicao,
            "modo": r.modo,
            "justificativa": r.justificativa,
            "penalidades": r.penalidades,
            "status": r.status,
            "criado_em": r.criado_em.isoformat(),
        }
        for r in AllocationRecommendation.objects.filter(task=task)
        .exclude(status="SUBSTITUIDA").select_related("user").order_by("-score")
    ]

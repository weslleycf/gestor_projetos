"""Analíticos de capacidade: matriz, gap, forecast, bus factor, trilhas e painéis."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

from apps.core.models import Perfil, User
from apps.portfolio.models import Project, StatusProjeto

from .models import (
    CriticidadeSkill,
    DevelopmentAction,
    DevelopmentPlan,
    EmployeeSkill,
    EmployeeTraining,
    InternalOpportunity,
    Mentorship,
    NivelProficiencia,
    PerfilNivel,
    ProjectSkillRequirement,
    Skill,
    SkillCategory,
    StatusAcao,
    StatusPDI,
    StatusPerfilSkill,
    TipoEvidencia,
)

NIVEL_MAX = 5


# ---------------------------------------------------------------------------
# Matriz de capacidades (RF-63)
# ---------------------------------------------------------------------------
def matriz_skills(*, area=None, categoria=None, tipo=None, usuario_ids=None, limite_skills=40, limite_pessoas=60) -> dict:
    """Heatmap colaboradores × capacidades × níveis."""
    pessoas = User.objects.filter(ativo=True)
    if area:
        pessoas = pessoas.filter(area=area)
    if usuario_ids:
        pessoas = pessoas.filter(id__in=usuario_ids)
    pessoas = pessoas.order_by("nome")[:limite_pessoas]

    skills_qs = Skill.objects.filter(status__in=["ATIVA", "EMERGENTE"])
    if categoria:
        skills_qs = skills_qs.filter(Q(categoria_id=categoria) | Q(categoria__parent_id=categoria))
    if tipo:
        skills_qs = skills_qs.filter(tipo=tipo)

    perfis = EmployeeSkill.objects.filter(user__in=pessoas).select_related("skill")
    contagem: dict[int, int] = defaultdict(int)
    for perfil in perfis:
        contagem[perfil.skill_id] += 1
    ordem_skills = sorted(skills_qs, key=lambda s: (-contagem.get(s.id, 0), s.nome))[:limite_skills]
    ids_skills = [s.id for s in ordem_skills]

    mapa: dict[tuple[int, int], EmployeeSkill] = {
        (p.user_id, p.skill_id): p for p in perfis if p.skill_id in ids_skills
    }

    linhas = []
    for pessoa in pessoas:
        celulas = []
        for skill in ordem_skills:
            perfil = mapa.get((pessoa.id, skill.id))
            celulas.append(
                {
                    "skill_id": skill.id,
                    "nivel": perfil.nivel_atual if perfil else 0,
                    "consolidado": round(perfil.nivel_efetivo, 2) if perfil else 0,
                    "validado": perfil.nivel_validado if perfil else 0,
                    "desejado": perfil.nivel_desejado if perfil else 0,
                    "xp": perfil.xp_acumulado if perfil else 0,
                    "status": perfil.status if perfil else "",
                    "employee_skill_id": perfil.id if perfil else None,
                    "visibilidade": perfil.visibilidade if perfil else "",
                }
            )
        valores = [c["consolidado"] for c in celulas if c["consolidado"]]
        linhas.append(
            {
                "user_id": pessoa.id,
                "nome": pessoa.nome,
                "iniciais": pessoa.iniciais,
                "cor": pessoa.cor,
                "cargo": pessoa.cargo,
                "area": pessoa.area,
                "perfil": pessoa.perfil,
                "total_skills": len(valores),
                "nivel_medio": round(sum(valores) / len(valores), 2) if valores else 0,
                "celulas": celulas,
            }
        )

    colunas = [
        {
            "skill_id": s.id, "nome": s.nome, "icone": s.icone, "cor": s.cor,
            "tipo": s.tipo, "criticidade": s.criticidade,
            "categoria": s.categoria.nome if s.categoria_id else "",
            "detentores": contagem.get(s.id, 0),
            "nivel_medio": s.nivel_medio,
            "bus_factor": s.bus_factor,
        }
        for s in ordem_skills
    ]

    cobertura = []
    for skill in ordem_skills:
        valores = [mapa[(p.id, skill.id)].nivel_atual for p in pessoas if (p.id, skill.id) in mapa]
        cobertura.append(
            {
                "skill_id": skill.id,
                "nome": skill.nome,
                "cor": skill.cor,
                "pessoas": len(valores),
                "nivel_medio": round(sum(valores) / len(valores), 2) if valores else 0,
                "nivel_3_mais": sum(1 for v in valores if v >= 3),
                "nivel_4_mais": sum(1 for v in valores if v >= 4),
                "criticidade": skill.criticidade,
                "em_risco": skill.em_risco,
            }
        )

    return {
        "colunas": colunas,
        "linhas": linhas,
        "cobertura": sorted(cobertura, key=lambda c: (-c["nivel_4_mais"], c["nome"])),
        "filtros": {
            "areas": list(User.objects.filter(ativo=True).exclude(area="").values_list("area", flat=True).distinct().order_by("area")),
            "categorias": [
                {"id": c.id, "nome": c.nome} for c in SkillCategory.objects.all().order_by("nome")
            ],
            "tipos": [{"valor": v, "rotulo": r} for v, r in Skill._meta.get_field("tipo").choices],
        },
        "total_pessoas": pessoas.count(),
        "total_skills": Skill.objects.count(),
        "gerado_em": timezone.now().isoformat(),
    }


# ---------------------------------------------------------------------------
# Gap analysis (RF-64/RF-65/RF-66)
# ---------------------------------------------------------------------------
def gap_analysis(*, project=None, usuario_ids=None) -> dict:
    """Compara capacidades requeridas × disponíveis e sugere ações."""
    from apps.resources.models import Alocacao, StatusAlocacao

    if project is not None:
        requisitos = list(
            ProjectSkillRequirement.objects.filter(project=project).select_related("skill")
        )
        pessoas = list(
            User.objects.filter(
                Q(alocacoes__project=project) | Q(id=project.manager_id) | Q(id=project.sponsor_id)
            ).distinct()
        )
        if not pessoas:
            pessoas = list(User.objects.filter(ativo=True))
    else:
        pessoas = list(User.objects.filter(id__in=usuario_ids or [])) or list(User.objects.filter(ativo=True))
        requisitos = []

    perfis = EmployeeSkill.objects.filter(user__in=pessoas).select_related("skill")
    mapa: dict[tuple[int, int], EmployeeSkill] = {(p.user_id, p.skill_id): p for p in perfis}

    if not requisitos:
        gaps_por_skill: dict[int, dict] = {}
        for perfil in perfis:
            if perfil.nivel_desejado > perfil.nivel_atual:
                entrada = gaps_por_skill.setdefault(
                    perfil.skill_id,
                    {
                        "skill_id": perfil.skill_id, "skill": perfil.skill.nome,
                        "icone": perfil.skill.icone, "cor": perfil.skill.cor,
                        "criticidade": perfil.skill.criticidade,
                        "nivel_minimo": perfil.nivel_desejado, "quantidade": 0,
                        "atendem": 0, "deficit": 0, "pessoas_com_gap": [],
                    },
                )
                entrada["quantidade"] += 1
                if perfil.nivel_atual >= perfil.nivel_desejado:
                    entrada["atendem"] += 1
                else:
                    entrada["pessoas_com_gap"].append(
                        {"user_id": perfil.user_id, "nome": perfil.user.nome,
                         "atual": perfil.nivel_atual, "desejado": perfil.nivel_desejado,
                         "gap": perfil.nivel_desejado - perfil.nivel_atual}
                    )
        itens = list(gaps_por_skill.values())
    else:
        itens = []
        for req in requisitos:
            atendem, com_gap = [], []
            for pessoa in pessoas:
                perfil = mapa.get((pessoa.id, req.skill_id))
                nivel = perfil.nivel_efetivo if perfil else 0
                if nivel >= req.nivel_minimo:
                    atendem.append({"user_id": pessoa.id, "nome": pessoa.nome, "nivel": round(float(nivel), 2)})
                else:
                    com_gap.append(
                        {
                            "user_id": pessoa.id, "nome": pessoa.nome,
                            "nivel": round(float(nivel), 2),
                            "deficit": round(req.nivel_minimo - float(nivel), 2),
                        }
                    )
            deficit = max(0, req.quantidade - len(atendem))
            itens.append(
                {
                    "skill_id": req.skill_id, "skill": req.skill.nome, "icone": req.skill.icone,
                    "cor": req.skill.cor, "criticidade": req.skill.criticidade,
                    "nivel_minimo": req.nivel_minimo, "nivel_desejado": req.nivel_desejado,
                    "quantidade": req.quantidade, "obrigatorio": req.obrigatorio,
                    "peso": req.peso, "atendem": len(atendem), "deficit": deficit,
                    "pessoas_atendem": sorted(atendem, key=lambda a: -a["nivel"]),
                    "pessoas_com_gap": sorted(com_gap, key=lambda a: a["deficit"]),
                }
            )

    for item in itens:
        item["severidade"] = _severidade_gap(item)
        item["acoes_sugeridas"] = _acoes_para_gap(item)

    itens.sort(key=lambda i: (-_peso_severidade(i["severidade"]), -i["deficit"], i["skill"]))
    obrigatorios_pendentes = [i for i in itens if i.get("obrigatorio") and i["deficit"] > 0]
    return {
        "escopo": (
            {"tipo": "projeto", "id": project.id, "nome": project.nome}
            if project is not None else {"tipo": "geral", "pessoas": len(pessoas)}
        ),
        "total_pessoas": len(pessoas),
        "itens": itens,
        "resumo": {
            "total_requisitos": len(itens),
            "criticos": sum(1 for i in itens if i["severidade"] == "CRITICO"),
            "altos": sum(1 for i in itens if i["severidade"] == "ALTO"),
            "medios": sum(1 for i in itens if i["severidade"] == "MEDIO"),
            "baixos": sum(1 for i in itens if i["severidade"] == "BAIXO"),
            "obrigatorios_pendentes": len(obrigatorios_pendentes),
            "indice_cobertura": round(
                sum(min(1.0, i["atendem"] / max(1, i["quantidade"])) for i in itens) / len(itens) * 100, 1
            ) if itens else 100.0,
        },
    }


def _severidade_gap(item: dict) -> str:
    deficit = item.get("deficit", 0)
    obrigatorio = item.get("obrigatorio", False)
    critico = item.get("criticidade") in {"ALTA", "ESTRATEGICA"}
    if deficit <= 0:
        return "OK"
    if obrigatorio or (critico and deficit >= 2):
        return "CRITICO"
    if deficit >= 2 or critico:
        return "ALTO"
    return "MEDIO"


def _peso_severidade(sev: str) -> int:
    return {"CRITICO": 4, "ALTO": 3, "MEDIO": 2, "BAIXO": 1, "OK": 0}.get(sev, 0)


def _acoes_para_gap(item: dict) -> list[dict]:
    acoes = []
    if item["deficit"] > 0:
        if item.get("pessoas_atendem") or item.get("pessoas_com_gap"):
            acoes.append({"tipo": "ALOCAR", "rotulo": "Alocar quem já atende", "icone": "user-check", "cor": "#10B981",
                          "detalhe": f"{item['atendem']} pessoa(s) atendem o nível mínimo."})
        if item.get("pessoas_com_gap"):
            acoes.append({"tipo": "TREINAR", "rotulo": "Treinar e mentorar", "icone": "graduation-cap", "cor": "#3B82F6",
                          "detalhe": f"{len(item['pessoas_com_gap'])} pessoa(s) com gap de até "
                                     f"{max(p['deficit'] for p in item['pessoas_com_gap']):.1f} nível(is)."})
        if item["deficit"] >= 2 or item.get("criticidade") in {"ALTA", "ESTRATEGICA"}:
            acoes.append({"tipo": "CONTRATAR", "rotulo": "Contratar / terceirizar", "icone": "user-plus", "cor": "#F59E0B",
                          "detalhe": f"Déficit de {item['deficit']} pessoa(s) acima da capacidade interna."})
        acoes.append({"tipo": "MENTORAR", "rotulo": "Formar novos detentores", "icone": "network", "cor": "#8B5CF6",
                      "detalhe": "Mentoria interna para elevar o nível e reduzir o bus factor."})
    return acoes


# ---------------------------------------------------------------------------
# Planejamento de capacidade (RF-80/RF-81/RF-83)
# ---------------------------------------------------------------------------
def previsao_demanda(*, horizonte_meses: int = 9, salvar: bool = True) -> dict:
    """Projeta demanda vs. oferta de capacidades por mês (heatmap skill × período)."""
    from .models import SkillDemandForecast

    hoje = timezone.localdate()
    meses = []
    for i in range(horizonte_meses):
        mes = (hoje.replace(day=1) + timedelta(days=31 * i)).replace(day=1)
        meses.append(f"{mes:%Y-%m}")

    projetos = Project.objects.ativos().prefetch_related("requisitos_skill__skill")
    demanda: dict[tuple[int, str], float] = defaultdict(float)
    niveis_demandados: dict[tuple[int, str], list[int]] = defaultdict(list)

    for projeto in projetos:
        inicio = projeto.data_inicio or hoje
        fim = projeto.data_fim or (inicio + timedelta(days=90))
        duracao_meses = max(1, ((fim - inicio).days // 30) + 1)
        for req in projeto.requisitos_skill.all():
            cursor = inicio
            while cursor <= fim:
                chave_mes = f"{cursor:%Y-%m}"
                if chave_mes in meses:
                    fator_mes = 1.0 / duracao_meses
                    demanda[(req.skill_id, chave_mes)] += req.quantidade * req.peso * fator_mes * 3
                    niveis_demandados[(req.skill_id, chave_mes)].append(req.nivel_minimo)
                cursor += timedelta(days=30)

    oferta: dict[int, float] = defaultdict(float)
    for perfil in EmployeeSkill.objects.filter(status=StatusPerfilSkill.ATIVA).select_related("user"):
        disponibilidade = 1.0
        oferta[perfil.skill_id] += (perfil.nivel_atual / NIVEL_MAX) * disponibilidade

    registros, linhas = [], []
    skills_envolvidas = Skill.objects.filter(
        Q(id__in=[k[0] for k in demanda.keys()]) | Q(criticidade__in=["ALTA", "ESTRATEGICA"])
    ).select_related("categoria")

    for skill in skills_envolvidas:
        celulas = []
        for mes in meses:
            dem = round(demanda.get((skill.id, mes), 0.0), 2)
            ofe = round(oferta.get(skill.id, 0.0), 2)
            gap = round(dem - ofe, 2)
            niveis = niveis_demandados.get((skill.id, mes), [])
            celulas.append(
                {
                    "periodo": mes,
                    "demanda": dem,
                    "oferta": ofe,
                    "gap": gap,
                    "nivel_medio_demandado": round(sum(niveis) / len(niveis), 2) if niveis else 0,
                    "situacao": "ESCASSEZ" if gap > 1 else "OCIOSIDADE" if gap < -1 else "EQUILIBRIO",
                }
            )
            if salvar and (dem or ofe):
                registros.append(
                    SkillDemandForecast(
                        skill=skill, periodo=mes, demanda_estimada=dem, oferta_estimada=ofe,
                        gap=gap, demanda_nivel_medio=celulas[-1]["nivel_medio_demandado"],
                    )
                )
        if any(c["demanda"] or c["oferta"] for c in celulas):
            linhas.append(
                {
                    "skill_id": skill.id, "skill": skill.nome, "cor": skill.cor, "icone": skill.icone,
                    "categoria": skill.categoria.nome if skill.categoria_id else "",
                    "criticidade": skill.criticidade, "bus_factor": skill.bus_factor,
                    "celulas": celulas,
                    "gap_total": round(sum(c["gap"] for c in celulas), 2),
                    "pico_demanda": round(max((c["demanda"] for c in celulas), default=0), 2),
                }
            )

    if salvar and registros:
        SkillDemandForecast.objects.bulk_create(registros, ignore_conflicts=True)

    linhas.sort(key=lambda l: -l["gap_total"])
    return {
        "meses": meses,
        "linhas": linhas,
        "resumo": {
            "skills_em_escassez": sum(1 for l in linhas if l["gap_total"] > 1),
            "skills_ociosas": sum(1 for l in linhas if l["gap_total"] < -1),
            "maior_gap": linhas[0]["skill"] if linhas else None,
            "gerado_em": timezone.now().isoformat(),
        },
    }


def detectar_bus_factor(*, salvar: bool = True, limiar: int | None = None) -> dict:
    """Identifica capacidades críticas sustentadas por poucas pessoas (RF-82)."""
    from django.conf import settings as dj

    from .models import BusFactorAlert

    limiar = limiar or dj.SGP["BUS_FACTOR_CRITICO"]
    alertas = []
    for skill in Skill.objects.filter(status__in=["ATIVA", "EMERGENTE"]).prefetch_related("perfis"):
        detentores = skill.perfis.filter(nivel_atual__gte=4).count()
        projetos_dependentes = ProjectSkillRequirement.objects.filter(
            skill=skill, project__status__in=[StatusProjeto.EM_EXECUCAO, StatusProjeto.APROVADO, StatusProjeto.PLANEJADO]
        ).count()
        if detentores > limiar:
            continue
        if skill.criticidade not in {"ALTA", "ESTRATEGICA"} and projetos_dependentes == 0:
            continue
        recomendacao = _recomendacao_bus_factor(skill, detentores, projetos_dependentes)
        alerta = {
            "skill_id": skill.id, "skill": skill.nome, "cor": skill.cor, "icone": skill.icone,
            "criticidade": skill.criticidade, "quantidade_detentores": detentores,
            "total_projetos_dependentes": projetos_dependentes, "recomendacao": recomendacao,
            "acoes_sugeridas": _acoes_bus_factor(skill, detentores),
            "detentores": [
                {"user_id": p.user_id, "nome": p.user.nome, "nivel": p.nivel_atual, "cor": p.user.cor}
                for p in skill.perfis.filter(nivel_atual__gte=4).select_related("user")
            ],
        }
        alertas.append(alerta)
        if salvar:
            BusFactorAlert.objects.update_or_create(
                skill=skill, resolvido=False,
                defaults={
                    "quantidade_detentores": detentores,
                    "total_projetos_dependentes": projetos_dependentes,
                    "criticidade": skill.criticidade,
                    "recomendacao": recomendacao,
                    "acoes_sugeridas": alerta["acoes_sugeridas"],
                },
            )
    alertas.sort(key=lambda a: (a["quantidade_detentores"], -a["total_projetos_dependentes"]))
    return {
        "alertas": alertas,
        "resumo": {
            "total": len(alertas),
            "sem_detentor": sum(1 for a in alertas if a["quantidade_detentores"] == 0),
            "um_detentor": sum(1 for a in alertas if a["quantidade_detentores"] == 1),
        },
    }


def _recomendacao_bus_factor(skill, detentores: int, projetos: int) -> str:
    if detentores == 0:
        return (
            f"Nenhum especialista (nível ≥ 4) em {skill.nome}. "
            f"{projetos} projeto(s) dependem desta capacidade — risco de parada total."
        )
    if detentores == 1:
        return (
            f"Apenas 1 especialista em {skill.nome} sustentando {projetos} projeto(s). "
            "Recomenda-se formar ao menos 2 sucessores em 6 meses."
        )
    return f"{detentores} especialistas em {skill.nome} — abaixo do limiar de segurança."


def _acoes_bus_factor(skill, detentores: int) -> list[dict]:
    return [
        {"tipo": "MENTORAR", "rotulo": "Programa de mentoria", "icone": "users", "cor": "#8B5CF6",
         "detalhe": "Vincular nível 2–3 a mentor nível 4–5 com metas trimestrais."},
        {"tipo": "DOCUMENTAR", "rotulo": "Documentar conhecimento", "icone": "file-text", "cor": "#3B82F6",
         "detalhe": "Criar base de conhecimento e runbooks para reduzir dependência individual."},
        {"tipo": "ROTACIONAR", "rotulo": "Job rotation", "icone": "repeat", "cor": "#F59E0B",
         "detalhe": "Alocar outra pessoa nas tarefas críticas para gerar exposição prática."},
        {"tipo": "CONTRATAR", "rotulo": "Reforço externo", "icone": "user-plus", "cor": "#EF4444",
         "detalhe": "Contratar ou terceirizar enquanto a capacidade interna é desenvolvida."},
    ] if detentores <= 1 else [
        {"tipo": "MENTORAR", "rotulo": "Ampliar detentores", "icone": "users", "cor": "#8B5CF6",
         "detalhe": "Elevar mais 1 pessoa ao nível 4 nos próximos 2 trimestres."},
    ]


# ---------------------------------------------------------------------------
# Mentoria, trilhas e PDI (RF-76/RF-79/RF-88)
# ---------------------------------------------------------------------------
def sugerir_mentores(skill_id: int, *, limite: int = 8, excluir_ids=None) -> list[dict]:
    """Sugere mentores internos nível 4–5 com disponibilidade (RF-79)."""
    from apps.resources.services import disponibilidade_no_periodo

    hoje = timezone.localdate()
    excluir = set(excluir_ids or [])
    perfis = EmployeeSkill.objects.filter(
        skill_id=skill_id, nivel_atual__gte=4, user__ativo=True, user__disponivel_para_mentoria=True
    ).select_related("user", "skill").order_by("-nivel_atual")
    sugestoes = []
    for perfil in perfis:
        if perfil.user_id in excluir:
            continue
        disponibilidade = disponibilidade_no_periodo(
            perfil.user_id, hoje, hoje + timedelta(days=90)
        )
        mentorias_ativas = Mentorship.objects.filter(
            mentor=perfil.user, status=Mentorship.Status.ATIVA
        ).count()
        score = (perfil.nivel_atual / 5) * 0.5 + (disponibilidade / 100) * 0.3 + (
            max(0.0, 1 - mentorias_ativas / 4) * 0.2
        )
        sugestoes.append(
            {
                "user_id": perfil.user_id, "nome": perfil.user.nome, "iniciais": perfil.user.iniciais,
                "cor": perfil.user.cor, "cargo": perfil.user.cargo, "area": perfil.user.area,
                "nivel": perfil.nivel_atual, "skill": perfil.skill.nome,
                "disponibilidade": disponibilidade, "mentorias_ativas": mentorias_ativas,
                "anos_experiencia": perfil.anos_experiencia,
                "score": round(score, 3),
                "justificativa": (
                    f"Nível {perfil.nivel_atual} em {perfil.skill.nome}, "
                    f"{disponibilidade:.0f}% disponível, {mentorias_ativas} mentoria(s) ativa(s)."
                ),
            }
        )
    sugestoes.sort(key=lambda s: -s["score"])
    return sugestoes[:limite]


def trilhas_recomendadas(user, *, limite: int = 8) -> list[dict]:
    """Recomenda trilhas com base em gaps, aspirações e demandas do portfólio (RF-76)."""
    from .models import Training

    perfis = list(user.perfis_skill.select_related("skill"))
    gaps = [p for p in perfis if p.gap > 0 or p.status == StatusPerfilSkill.ENFERRUJADA]
    if not gaps:
        gaps = sorted(perfis, key=lambda p: p.nivel_atual)[:4]

    demanda_skills = {
        linha["skill_id"]: linha["total"]
        for linha in ProjectSkillRequirement.objects.filter(
            project__status__in=[StatusProjeto.EM_EXECUCAO, StatusProjeto.APROVADO, StatusProjeto.PLANEJADO]
        ).values("skill_id").annotate(total=Count("id"))
    }

    trilhas = []
    for perfil in gaps:
        alvo = perfil.nivel_desejado or min(5, perfil.nivel_atual + 1)
        treinamentos = list(
            Training.objects.filter(skill=perfil.skill, ativo=True, nivel_alvo__lte=alvo)
            .order_by("nivel_alvo")[:3]
        )
        mentores = sugerir_mentores(perfil.skill_id, limite=3, excluir_ids=[user.id])
        urgencia = "ALTA" if perfil.status == StatusPerfilSkill.ENFERRUJADA else (
            "MEDIA" if perfil.gap >= 2 else "BAIXA"
        )
        trilhas.append(
            {
                "skill_id": perfil.skill_id, "skill": perfil.skill.nome, "icone": perfil.skill.icone,
                "cor": perfil.skill.cor, "nivel_atual": perfil.nivel_atual,
                "nivel_alvo": alvo, "gap": max(0, alvo - perfil.nivel_atual),
                "status": perfil.status, "urgencia": urgencia,
                "demanda_projetos": demanda_skills.get(perfil.skill_id, 0),
                "xp_necessario": perfil.xp_para_proximo_nivel,
                "progresso": perfil.progresso_nivel_percentual,
                "acoes": (
                    [{"tipo": "TREINAMENTO", "titulo": t.nome, "carga_horaria": t.carga_horaria,
                      "fornecedor": t.fornecedor, "url": t.url} for t in treinamentos]
                    + [{"tipo": "MENTORIA", "titulo": f"Mentoria com {m['nome']} ({m['nivel']})",
                        "carga_horaria": 0, "fornecedor": "interno", "url": ""} for m in mentores[:2]]
                    + [{"tipo": "PRATICA", "titulo": f"Atuar em projeto que exija {perfil.skill.nome}",
                        "carga_horaria": 40, "fornecedor": "interno", "url": ""}]
                ),
                "mentores": mentores,
            }
        )
    trilhas.sort(key=lambda t: (-{"ALTA": 3, "MEDIA": 2, "BAIXA": 1}[t["urgencia"]], -t["demanda_projetos"]))
    return trilhas[:limite]


def aderencia_a_oportunidade(opportunity: InternalOpportunity, user) -> dict:
    """Calcula aderência de um candidato a uma oportunidade interna (RF-86)."""
    skills = list(opportunity.skills_requeridas.all())
    perfis = {p.skill_id: p for p in user.perfis_skill.filter(skill__in=skills)}
    atendidas, gaps = [], []
    for skill in skills:
        perfil = perfis.get(skill.id)
        nivel = round(perfil.nivel_efetivo, 2) if perfil else 0.0
        entrada = {"skill": skill.nome, "skill_id": skill.id, "requerido": opportunity.nivel_minimo, "atual": nivel}
        (atendidas if nivel >= opportunity.nivel_minimo else gaps).append(entrada)
    total = len(skills) or 1
    aderencia = round(len(atendidas) / total * 100, 1)
    return {
        "aderencia": aderencia,
        "skills_atendidas": atendidas,
        "skills_gap": gaps,
        "recomendacao": (
            "Forte candidato" if aderencia >= 80 else
            "Candidato viável com plano de desenvolvimento" if aderencia >= 50 else
            "Requer capacitação antes da candidatura"
        ),
    }


# ---------------------------------------------------------------------------
# Painel de capacidades (dashboard PMO/RH — §8.3)
# ---------------------------------------------------------------------------
def painel_capacidades() -> dict:
    """KPIs consolidados de capacidade para o dashboard executivo."""
    hoje = timezone.localdate()
    total_skills = Skill.objects.count()
    skills_ativas = Skill.objects.filter(status="ATIVA").count()
    total_perfis = EmployeeSkill.objects.count()
    colaboradores = User.objects.filter(ativo=True).count()
    colaboradores_com_perfil = User.objects.filter(ativo=True, perfis_skill__isnull=False).distinct().count()

    bus = detectar_bus_factor(salvar=False)
    gaps_globais = gap_analysis()
    certificacoes = EmployeeTraining.objects.filter(status="CONCLUIDO", training__certificacao=True).count()
    treinamentos_total = EmployeeTraining.objects.exclude(status="CANCELADO").count()
    pdis_ativos = DevelopmentPlan.objects.filter(status=StatusPDI.ATIVO).count()
    acoes_pdi = DevelopmentAction.objects.filter(plan__status=StatusPDI.ATIVO)
    acoes_concluidas = acoes_pdi.filter(status=StatusAcao.CONCLUIDA).count()
    acoes_total = acoes_pdi.count()
    mentorias_ativas = Mentorship.objects.filter(status=Mentorship.Status.ATIVA).count()
    enferrujadas = EmployeeSkill.objects.filter(status=StatusPerfilSkill.ENFERRUJADA).count()
    sugestoes_pendentes = __import__(
        "apps.capabilities.models", fromlist=["SugestaoPromocao"]
    ).SugestaoPromocao.objects.filter(status="PENDENTE").count()

    por_tipo = list(Skill.objects.values("tipo").annotate(total=Count("id")).order_by("-total"))
    por_criticidade = list(Skill.objects.values("criticidade").annotate(total=Count("id")).order_by("-total"))
    distribuicao_niveis = [
        {"nivel": n, "rotulo": NivelProficiencia(n).label, "total": EmployeeSkill.objects.filter(nivel_atual=n).count()}
        for n in range(1, 6)
    ]
    top_skills = [
        {
            "skill_id": s.id, "nome": s.nome, "cor": s.cor, "icone": s.icone,
            "detentores": s.perfis.count(), "nivel_medio": s.nivel_medio, "bus_factor": s.bus_factor,
        }
        for s in Skill.objects.annotate(total=Count("perfis")).order_by("-total")[:10]
    ]

    indice_desenvolvimento = 0.0
    if total_perfis:
        soma_xp = EmployeeSkill.objects.aggregate(t=Avg("xp_acumulado"))["t"] or 0
        indice_desenvolvimento = round(min(100.0, soma_xp / 10.0), 1)

    return {
        "cobertura_skills": {
            "total_catalogo": total_skills, "ativas": skills_ativas,
            "colaboradores": colaboradores, "com_perfil": colaboradores_com_perfil,
            "cobertura_percentual": round(colaboradores_com_perfil / colaboradores * 100, 1) if colaboradores else 0.0,
            "perfis_registrados": total_perfis,
            "media_skills_por_pessoa": round(total_perfis / colaboradores_com_perfil, 1) if colaboradores_com_perfil else 0.0,
        },
        "gap": gaps_globais["resumo"],
        "bus_factor": bus["resumo"],
        "desenvolvimento": {
            "indice": indice_desenvolvimento,
            "pdis_ativos": pdis_ativos,
            "acoes_pdi": acoes_total,
            "acoes_concluidas": acoes_concluidas,
            "progresso_pdi": round(acoes_concluidas / acoes_total * 100, 1) if acoes_total else 0.0,
            "mentorias_ativas": mentorias_ativas,
            "skill_decay": enferrujadas,
            "promocoes_pendentes": sugestoes_pendentes,
        },
        "certificacao": {
            "certificacoes": certificacoes,
            "treinamentos": treinamentos_total,
            "taxa": round(certificacoes / treinamentos_total * 100, 1) if treinamentos_total else 0.0,
        },
        "por_tipo": por_tipo,
        "por_criticidade": por_criticidade,
        "distribuicao_niveis": distribuicao_niveis,
        "top_skills": top_skills,
        "alertas_bus_factor": bus["alertas"][:8],
        "gap_criticos": gaps_globais["itens"][:10],
        "gerado_em": timezone.now().isoformat(),
    }

"""Registro de ferramentas do assistente.

Cada ferramenta é uma consulta bem definida sobre o domínio do SGP, com
permissão declarada e parâmetros descritos em JSON Schema. O mesmo registro
alimenta o assistente dentro da aplicação e o servidor MCP — assim os dois
nunca divergem.

Regra de ouro: **nenhuma ferramenta devolve o que o usuário não pode ver**. A
checagem de permissão acontece antes da execução, não no texto da resposta.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any, Callable

from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

from apps.core.permissions import tem_permissao


class SemPermissao(Exception):
    """O usuário não tem a permissão exigida pela ferramenta."""


class NaoEncontrado(Exception):
    """A ferramenta não localizou o registro pedido."""


@dataclass
class Resultado:
    """O que uma ferramenta devolve."""

    resumo: str
    texto: str
    dados: Any = None
    fontes: list[dict] = field(default_factory=list)

    def como_dicionario(self) -> dict:
        return {"resumo": self.resumo, "texto": self.texto, "dados": self.dados, "fontes": self.fontes}


@dataclass
class Ferramenta:
    nome: str
    rotulo: str
    descricao: str
    categoria: str
    executar: Callable[..., Resultado]
    permissao: str | None = None
    parametros: dict = field(default_factory=dict)
    somente_leitura: bool = True

    def como_dicionario(self) -> dict:
        return {
            "nome": self.nome,
            "rotulo": self.rotulo,
            "descricao": self.descricao,
            "categoria": self.categoria,
            "permissao": self.permissao,
            "parametros": self.parametros,
            "somente_leitura": self.somente_leitura,
        }


REGISTRO: dict[str, Ferramenta] = {}


def ferramenta(
    nome: str,
    rotulo: str,
    descricao: str,
    categoria: str,
    permissao: str | None = None,
    parametros: dict | None = None,
    somente_leitura: bool = True,
):
    def decorador(funcao: Callable[..., Resultado]) -> Callable[..., Resultado]:
        REGISTRO[nome] = Ferramenta(
            nome=nome,
            rotulo=rotulo,
            descricao=descricao,
            categoria=categoria,
            executar=funcao,
            permissao=permissao,
            parametros=parametros
            or {"type": "object", "properties": {}, "additionalProperties": False},
            somente_leitura=somente_leitura,
        )
        return funcao

    return decorador


def ferramentas_disponiveis(usuario) -> list[Ferramenta]:
    """Somente o que o perfil do usuário pode executar."""
    return [
        f for f in REGISTRO.values()
        if f.permissao is None or tem_permissao(usuario, f.permissao)
    ]


def executar_ferramenta(nome: str, usuario, argumentos: dict | None = None) -> Resultado:
    alvo = REGISTRO.get(nome)
    if alvo is None:
        raise NaoEncontrado("Ferramenta desconhecida: " + nome)
    if alvo.permissao and not tem_permissao(usuario, alvo.permissao):
        raise SemPermissao(
            "O seu perfil não tem acesso a esta informação (" + alvo.rotulo + ")."
        )
    return alvo.executar(usuario, **(argumentos or {}))


# ---------------------------------------------------------------------------
# Auxiliares
# ---------------------------------------------------------------------------
def _fonte(tipo: str, id_, rotulo: str, rota: str) -> dict:
    return {"tipo": tipo, "id": id_, "rotulo": rotulo, "rota": rota}


def _rotulo_projeto(projeto) -> str:
    return (projeto.codigo + " · " + projeto.nome) if projeto.codigo else projeto.nome


def _achar_projeto(termo: str):
    from apps.portfolio.models import Project

    if not termo:
        raise NaoEncontrado("Informe o nome ou o código do projeto.")
    alvo = (
        Project.objects.filter(codigo__iexact=termo.strip()).first()
        or Project.objects.filter(nome__icontains=termo.strip()).first()
        or Project.objects.filter(codigo__icontains=termo.strip()).first()
    )
    if not alvo:
        raise NaoEncontrado("Não encontrei nenhum projeto com \"" + termo + "\".")
    return alvo


# ---------------------------------------------------------------------------
# Portfólio e projetos
# ---------------------------------------------------------------------------
@ferramenta(
    "resumo_portfolio",
    "Resumo do portfólio",
    "Situação geral da carteira: quantos projetos, quantos atrasados, em risco, orçamento e progresso médio.",
    "Portfólio",
    permissao="dashboard.ver",
)
def resumo_portfolio(usuario) -> Resultado:
    from apps.portfolio.models import Project

    projetos = Project.objects.filter(arquivado=False)
    total = projetos.count()
    if not total:
        return Resultado("Não há projetos cadastrados.", "O portfólio está vazio.")

    atrasados = [p for p in projetos if p.atrasado] if hasattr(Project, "atrasado") else []
    por_saude = {linha["saude"]: linha["total"] for linha in projetos.values("saude").annotate(total=Count("id"))}
    orcamento = projetos.aggregate(t=Sum("orcamento"))["t"] or 0
    custo = projetos.aggregate(t=Sum("custo_real"))["t"] or 0
    progresso = projetos.aggregate(m=Avg("percentual_conclusao"))["m"] or 0

    texto = (
        str(total) + " projetos ativos. "
        + "Saúde: " + ", ".join(k + " " + str(v) for k, v in por_saude.items()) + ". "
        + "Orçamento somado de R$ " + f"{float(orcamento):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        + " com R$ " + f"{float(custo):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        + " realizados. Progresso médio de " + f"{float(progresso):.1f}" + "%."
    )
    return Resultado(
        resumo=str(total) + " projeto(s) · progresso médio " + f"{float(progresso):.0f}" + "%",
        texto=texto,
        dados={
            "total": total,
            "por_saude": por_saude,
            "orcamento": float(orcamento),
            "custo_real": float(custo),
            "progresso_medio": round(float(progresso), 1),
        },
    )


@ferramenta(
    "projetos_atrasados",
    "Projetos atrasados",
    "Projetos com a data de término já vencida e ainda não concluídos.",
    "Portfólio",
    permissao="projeto.ver",
)
def projetos_atrasados(usuario) -> Resultado:
    from apps.portfolio.models import Project

    hoje = timezone.localdate()
    atrasados = [
        p for p in Project.objects.filter(arquivado=False, data_fim__lt=hoje)
        .exclude(status__in=["CONCLUIDO", "CANCELADO", "ARQUIVADO"])
        .select_related("manager")[:25]
    ]
    if not atrasados:
        return Resultado("Nenhum projeto atrasado.", "Nenhum projeto com prazo vencido e ainda aberto. Bom sinal.")

    linhas = [
        "- " + _rotulo_projeto(p) + " | prazo " + p.data_fim.strftime("%d/%m/%Y")
        + " | " + str(p.percentual_conclusao) + "% concluído"
        + " | gerente " + (p.manager.nome if p.manager_id else "sem responsável")
        for p in atrasados
    ]
    return Resultado(
        resumo=str(len(atrasados)) + " projeto(s) atrasado(s)",
        texto="Projetos com prazo vencido:\n" + "\n".join(linhas),
        dados=[{"id": p.id, "codigo": p.codigo, "nome": p.nome, "prazo": p.data_fim.isoformat(),
                "percentual": p.percentual_conclusao} for p in atrasados],
        fontes=[_fonte("projeto", p.id, _rotulo_projeto(p), "/projetos/" + str(p.id)) for p in atrasados[:8]],
    )


@ferramenta(
    "projetos_em_risco",
    "Projetos em risco",
    "Projetos com saúde amarela ou vermelha segundo as regras de desvio, risco e orçamento do sistema.",
    "Portfólio",
    permissao="projeto.ver",
)
def projetos_em_risco(usuario) -> Resultado:
    from apps.portfolio.models import Project

    em_risco = list(
        Project.objects.filter(arquivado=False)
        .exclude(status__in=["CONCLUIDO", "CANCELADO", "ARQUIVADO"])
        .exclude(saude="VERDE")
        .select_related("manager")[:25]
    )
    if not em_risco:
        return Resultado("Nenhum projeto em risco.", "Todos os projetos ativos estão com saúde verde.")

    linhas = [
        "- " + _rotulo_projeto(p) + " | saúde " + p.saude
        + " | desvio de " + f"{float(p.percentual_conclusao) - float(p.progresso_planejado or 0):+.0f}"
        + " pontos percentuais | gerente " + (p.manager.nome if p.manager_id else "sem responsável")
        for p in em_risco
    ]
    return Resultado(
        resumo=str(len(em_risco)) + " projeto(s) fora do verde",
        texto="Projetos com saúde amarela ou vermelha:\n" + "\n".join(linhas),
        dados=[{"id": p.id, "codigo": p.codigo, "nome": p.nome, "saude": p.saude} for p in em_risco],
        fontes=[_fonte("projeto", p.id, _rotulo_projeto(p), "/projetos/" + str(p.id)) for p in em_risco[:8]],
    )


@ferramenta(
    "detalhe_projeto",
    "Detalhe do projeto",
    "Ficha de um projeto: status, saúde, prazos, progresso, gerente, orçamento e contagens.",
    "Portfólio",
    permissao="projeto.ver",
    parametros={
        "type": "object",
        "properties": {"projeto": {"type": "string", "description": "Nome ou código do projeto"}},
        "required": ["projeto"],
    },
)
def detalhe_projeto(usuario, projeto: str) -> Resultado:
    p = _achar_projeto(projeto)
    contagens = {
        "tarefas": p.tarefas.count(),
        "riscos": p.riscos.count(),
        "marcos": p.marcos.count() if hasattr(p, "marcos") else 0,
        "membros": p.alocacoes.count() if hasattr(p, "alocacoes") else 0,
    }
    texto = (
        _rotulo_projeto(p) + ": status " + p.status + ", saúde " + p.saude + ". "
        + "Prazo de " + (p.data_inicio.strftime("%d/%m/%Y") if p.data_inicio else "?")
        + " a " + (p.data_fim.strftime("%d/%m/%Y") if p.data_fim else "?") + ". "
        + "Progresso de " + str(p.percentual_conclusao) + "% contra "
        + str(p.progresso_planejado or 0) + "% planejado. "
        + "Gerente: " + (p.manager.nome if p.manager_id else "não definido") + ". "
        + "Orçamento de R$ " + f"{float(p.orcamento or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        + " com R$ " + f"{float(p.custo_real or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        + " realizados. "
        + str(contagens["tarefas"]) + " tarefas, " + str(contagens["riscos"]) + " riscos, "
        + str(contagens["marcos"]) + " marcos."
    )
    return Resultado(
        resumo=_rotulo_projeto(p),
        texto=texto,
        dados={"id": p.id, "codigo": p.codigo, "nome": p.nome, "status": p.status, "saude": p.saude, **contagens},
        fontes=[_fonte("projeto", p.id, _rotulo_projeto(p), "/projetos/" + str(p.id))],
    )


@ferramenta(
    "desempenho_projeto",
    "Desempenho de custo e prazo (EVM)",
    "Indicadores de valor agregado do projeto: CPI, SPI, EAC, VAC e o que eles significam.",
    "Financeiro",
    permissao="financeiro.ver",
    parametros={
        "type": "object",
        "properties": {"projeto": {"type": "string", "description": "Nome ou código do projeto"}},
        "required": ["projeto"],
    },
)
def desempenho_projeto(usuario, projeto: str) -> Resultado:
    p = _achar_projeto(projeto)
    evm = p.evm()
    cpi, spi = float(evm.get("CPI") or 0), float(evm.get("SPI") or 0)
    leitura_cpi = "dentro do esperado" if cpi >= 0.95 else ("atenção" if cpi >= 0.85 else "crítico")
    leitura_spi = "no prazo" if spi >= 0.95 else ("atenção" if spi >= 0.85 else "atrasado")
    texto = (
        _rotulo_projeto(p) + ": CPI " + f"{cpi:.2f}" + " (" + leitura_cpi + " no custo), SPI "
        + f"{spi:.2f}" + " (" + leitura_spi + " no prazo). "
        + "Valor agregado de R$ " + f"{float(evm.get('EV') or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        + " contra custo real de R$ " + f"{float(evm.get('AC') or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        + ". Estimativa no término (EAC) de R$ " + f"{float(evm.get('EAC') or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        + ", variação prevista (VAC) de R$ " + f"{float(evm.get('VAC') or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + "."
    )
    return Resultado(
        resumo="CPI " + f"{cpi:.2f}" + " · SPI " + f"{spi:.2f}",
        texto=texto,
        dados={k: (float(v) if isinstance(v, (int, float)) else v) for k, v in evm.items() if k.isupper()},
        fontes=[_fonte("projeto", p.id, _rotulo_projeto(p), "/evm")],
    )


@ferramenta(
    "marcos_proximos",
    "Marcos próximos",
    "Marcos com data prevista nos próximos dias, com o projeto e o responsável.",
    "Portfólio",
    permissao="projeto.ver",
    parametros={
        "type": "object",
        "properties": {"dias": {"type": "integer", "description": "Janela em dias (padrão 30)"}},
    },
)
def marcos_proximos(usuario, dias: int = 30) -> Resultado:
    from apps.portfolio.models import Milestone

    hoje = timezone.localdate()
    limite = hoje + timedelta(days=int(dias or 30))
    marcos = list(
        Milestone.objects.filter(data_prevista__gte=hoje, data_prevista__lte=limite)
        .select_related("project")[:20]
    )
    if not marcos:
        return Resultado("Nenhum marco nos próximos " + str(dias) + " dias.",
                         "Não há marcos previstos nessa janela.")
    linhas = [
        "- " + m.nome + " | " + m.project.nome + " | " + m.data_prevista.strftime("%d/%m/%Y")
        + (" | no caminho crítico" if getattr(m, "critico", False) else "")
        for m in marcos
    ]
    return Resultado(
        resumo=str(len(marcos)) + " marco(s) em " + str(dias) + " dias",
        texto="Marcos previstos:\n" + "\n".join(linhas),
        dados=[{"id": m.id, "nome": m.nome, "data": m.data_prevista.isoformat(),
                "projeto": m.project.nome} for m in marcos],
        fontes=[_fonte("projeto", m.project_id, m.project.nome, "/projetos/" + str(m.project_id)) for m in marcos[:6]],
    )


# ---------------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------------
@ferramenta(
    "minhas_tarefas",
    "Minhas tarefas",
    "Tarefas sob responsabilidade do usuário que está perguntando, ordenadas por prazo.",
    "Execução",
)
def minhas_tarefas(usuario, atrasadas_apenas: bool = False) -> Resultado:
    from apps.tasks.models import Task

    consulta = Task.objects.filter(responsavel=usuario).exclude(status__in=["CONCLUIDA", "CANCELADA"])
    if atrasadas_apenas:
        consulta = consulta.filter(data_fim__lt=timezone.localdate())
    tarefas = list(consulta.select_related("project").order_by("data_fim")[:20])
    if not tarefas:
        return Resultado("Nenhuma tarefa em aberto para você.",
                         "Você não tem tarefas em aberto" + (" atrasadas." if atrasadas_apenas else "."))
    linhas = [
        "- " + t.nome + " | " + t.project.nome + " | prazo "
        + (t.data_fim.strftime("%d/%m/%Y") if t.data_fim else "sem data")
        + " | " + str(t.percentual_conclusao) + "%"
        + (" | ATRASADA" if getattr(t, "atrasada", False) else "")
        for t in tarefas
    ]
    return Resultado(
        resumo=str(len(tarefas)) + " tarefa(s) sua(s)",
        texto="Suas tarefas em aberto:\n" + "\n".join(linhas),
        dados=[{"id": t.id, "nome": t.nome, "projeto": t.project.nome,
                "prazo": t.data_fim.isoformat() if t.data_fim else None} for t in tarefas],
        fontes=[_fonte("tarefa", t.id, t.nome, "/minhas-tarefas") for t in tarefas[:6]],
    )


@ferramenta(
    "tarefas_atrasadas",
    "Tarefas atrasadas",
    "Tarefas com prazo vencido em todos os projetos visíveis.",
    "Execução",
    permissao="tarefa.ver",
)
def tarefas_atrasadas(usuario) -> Resultado:
    from apps.tasks.models import Task

    tarefas = list(
        Task.objects.filter(data_fim__lt=timezone.localdate())
        .exclude(status__in=["CONCLUIDA", "CANCELADA"])
        .select_related("project", "responsavel")[:25]
    )
    if not tarefas:
        return Resultado("Nenhuma tarefa atrasada.", "Não há tarefas com prazo vencido em aberto.")
    linhas = [
        "- " + t.nome + " | " + t.project.nome + " | venceu em " + t.data_fim.strftime("%d/%m/%Y")
        + " | " + (t.responsavel.nome if t.responsavel_id else "sem responsável")
        for t in tarefas
    ]
    return Resultado(
        resumo=str(len(tarefas)) + " tarefa(s) atrasada(s)",
        texto="Tarefas com prazo vencido:\n" + "\n".join(linhas),
        dados=[{"id": t.id, "nome": t.nome, "projeto": t.project.nome} for t in tarefas],
        fontes=[_fonte("tarefa", t.id, t.nome, "/projetos/" + str(t.project_id)) for t in tarefas[:6]],
    )


# ---------------------------------------------------------------------------
# Riscos e issues
# ---------------------------------------------------------------------------
@ferramenta(
    "riscos_criticos",
    "Riscos críticos",
    "Riscos de severidade alta ou extrema, com projeto, responsável e plano de resposta.",
    "Riscos",
    permissao="risco.ver",
)
def riscos_criticos(usuario) -> Resultado:
    from apps.risks.models import Risk

    riscos = [
        r for r in Risk.objects.exclude(status__in=["ENCERRADO", "FECHADO"])
        .select_related("project", "responsavel")[:60]
        if (r.probabilidade or 0) * (r.impacto or 0) >= 10
    ][:20]
    if not riscos:
        return Resultado("Nenhum risco crítico.", "Não há riscos abertos de severidade alta ou extrema.")
    linhas = [
        "- " + r.descricao[:110] + " | " + r.project.nome
        + " | severidade " + str((r.probabilidade or 0) * (r.impacto or 0))
        + " | " + (r.responsavel.nome if getattr(r, "responsavel_id", None) else "sem responsável")
        for r in riscos
    ]
    return Resultado(
        resumo=str(len(riscos)) + " risco(s) crítico(s)",
        texto="Riscos de severidade alta ou extrema:\n" + "\n".join(linhas),
        dados=[{"id": r.id, "descricao": r.descricao, "projeto": r.project.nome} for r in riscos],
        fontes=[_fonte("risco", r.id, r.descricao[:60], "/riscos") for r in riscos[:6]],
    )


@ferramenta(
    "issues_abertas",
    "Issues abertas",
    "Issues e ações corretivas ainda sem solução, com atraso e responsável.",
    "Riscos",
    permissao="risco.ver",
)
def issues_abertas(usuario) -> Resultado:
    from apps.risks.models import Issue

    issues = list(
        Issue.objects.exclude(status__in=["RESOLVIDA", "FECHADA", "CANCELADA"])
        .select_related("project")[:25]
    )
    if not issues:
        return Resultado("Nenhuma issue aberta.", "Não há issues ou ações pendentes.")
    linhas = [
        "- " + i.titulo[:110] + " | " + (i.project.nome if i.project_id else "sem projeto")
        + " | " + i.status + " | prioridade " + str(getattr(i, "prioridade", "-"))
        for i in issues
    ]
    return Resultado(
        resumo=str(len(issues)) + " issue(s) aberta(s)",
        texto="Issues e ações pendentes:\n" + "\n".join(linhas),
        dados=[{"id": i.id, "titulo": i.titulo, "status": i.status} for i in issues],
        fontes=[_fonte("issue", i.id, i.titulo[:60], "/issues") for i in issues[:6]],
    )


# ---------------------------------------------------------------------------
# Pessoas, alocação e capacidade
# ---------------------------------------------------------------------------
@ferramenta(
    "pessoas_sobrecarregadas",
    "Pessoas sobrecarregadas",
    "Colaboradores com alocação confirmada acima da capacidade em alguma semana.",
    "Recursos",
    permissao="alocacao.ver",
)
def pessoas_sobrecarregadas(usuario) -> Resultado:
    from apps.resources.services import detectar_conflitos

    conflitos = detectar_conflitos() or []
    if not conflitos:
        return Resultado("Ninguém sobrecarregado.", "Não há conflito de alocação: ninguém passou da capacidade.")

    # Uma pessoa pode ter várias semanas estouradas. O que interessa ao gestor é
    # a pior semana de cada uma, não 600 linhas repetidas.
    piores: dict[str, dict] = {}
    for c in conflitos:
        nome = str(c.get("user_nome") or "Colaborador")
        atual = piores.get(nome)
        if atual is None or float(c.get("total_percentual") or 0) > float(atual.get("total_percentual") or 0):
            piores[nome] = c
    ranqueados = sorted(piores.values(), key=lambda c: -float(c.get("total_percentual") or 0))[:15]

    linhas = []
    for c in ranqueados:
        semanas = sum(1 for x in conflitos if x.get("user_nome") == c.get("user_nome"))
        linhas.append(
            "- " + str(c.get("user_nome")) + " | pior semana: " + str(c.get("semana"))
            + " com " + f"{float(c.get('total_percentual') or 0):.0f}" + "% da capacidade ("
            + str(c.get("severidade")) + ")"
            + " | " + str(semanas) + " semana(s) acima do limite no período"
        )
    return Resultado(
        resumo=str(len(piores)) + " pessoa(s) sobrecarregada(s) em " + str(len(conflitos)) + " semana(s)",
        texto=(
            str(len(piores)) + " pessoa(s) passaram da capacidade em alguma semana, somando "
            + str(len(conflitos)) + " ocorrências. Pior semana de cada uma:\n" + "\n".join(linhas)
        ),
        dados=ranqueados,
        fontes=[_fonte("alocacao", 0, "Mapa de ocupação", "/alocacao")],
    )


@ferramenta(
    "quem_pode_assumir",
    "Quem pode assumir",
    "Recomenda pessoas para uma tarefa ou capacidade, com o score do motor de alocação e a justificativa.",
    "Recursos",
    permissao="alocacao.ver",
    parametros={
        "type": "object",
        "properties": {
            "capacidade": {"type": "string", "description": "Nome da capacidade ou palavra-chave da tarefa"},
            "modo": {"type": "string", "enum": ["PERFORMANCE", "DESENVOLVIMENTO", "MISTO"]},
        },
        "required": ["capacidade"],
    },
)
def quem_pode_assumir(usuario, capacidade: str, modo: str = "MISTO") -> Resultado:
    from apps.capabilities.models import Skill
    from apps.capabilities.matching import recomendar_para_tarefa

    habilidade = Skill.objects.filter(nome__icontains=capacidade.strip()).first()
    if not habilidade:
        return Resultado(
            "Capacidade não encontrada",
            "Não encontrei a capacidade \"" + capacidade + "\" no catálogo. Vale conferir o nome exato.",
        )
    try:
        recomendacoes = recomendar_para_tarefa(habilidade, modo=modo, limite=5)
    except TypeError:
        recomendacoes = recomendar_para_tarefa(habilidade.id, modo=modo)[:5]

    if not recomendacoes:
        return Resultado("Ninguém elegível", "Nenhum colaborador atende a capacidade " + habilidade.nome + ".")

    linhas = []
    for r in recomendacoes:
        nome = r.get("nome") or r.get("user_nome") or "Colaborador"
        score = r.get("score") or r.get("pontuacao") or 0
        justificativa = r.get("justificativa") or r.get("explicacao") or ""
        linhas.append("- " + str(nome) + " | score " + f"{float(score):.2f}" + (" | " + str(justificativa) if justificativa else ""))
    return Resultado(
        resumo="Top " + str(len(recomendacoes)) + " para " + habilidade.nome,
        texto="Recomendações para " + habilidade.nome + " (modo " + modo + "):\n" + "\n".join(linhas),
        dados=recomendacoes[:5],
        fontes=[_fonte("capacidade", habilidade.id, habilidade.nome, "/matching")],
    )


@ferramenta(
    "capacidades_em_falta",
    "Capacidades em falta",
    "Lacunas entre a capacidade necessária e a disponível, com severidade e ação sugerida.",
    "Capacidades",
    permissao="capacidade.ver",
)
def capacidades_em_falta(usuario) -> Resultado:
    from apps.capabilities.analytics import gap_analysis

    analise = gap_analysis() or {}
    gaps = (analise.get("gaps") if isinstance(analise, dict) else analise) or []
    criticos = [g for g in gaps if str(g.get("severidade", "")).upper() in {"CRITICO", "CRÍTICO", "ALTO"}][:15]
    if not criticos:
        return Resultado("Nenhuma lacuna crítica.", "Não há lacunas graves entre demanda e capacidade disponível.")
    linhas = [
        "- " + str(g.get("skill_nome") or g.get("capacidade") or g.get("nome")) + " | severidade "
        + str(g.get("severidade")) + " | déficit " + str(g.get("deficit") or g.get("gap") or g.get("faltam"))
        + " | atendem hoje: " + str(g.get("atendem") or g.get("detentores") or "-")
        for g in criticos
    ]
    return Resultado(
        resumo=str(len(criticos)) + " lacuna(s) crítica(s)",
        texto="Lacunas de capacidade mais graves:\n" + "\n".join(linhas),
        dados=criticos,
        fontes=[_fonte("capacidade", 0, "Gap analysis", "/gap")],
    )


@ferramenta(
    "bus_factor_critico",
    "Bus factor crítico",
    "Capacidades sustentadas por pouquíssimas pessoas, com risco de parada se alguém sair.",
    "Capacidades",
    permissao="capacidade.ver",
)
def bus_factor_critico(usuario) -> Resultado:
    from apps.capabilities.analytics import detectar_bus_factor

    try:
        analise = detectar_bus_factor()
    except TypeError:
        analise = detectar_bus_factor(salvar=False)
    itens = analise.get("alertas") if isinstance(analise, dict) else analise
    itens = itens or []
    if not itens:
        return Resultado("Nenhum risco de concentração.", "Todas as capacidades têm cobertura adequada.")
    linhas = [
        "- " + str(i.get("skill_nome") or i.get("capacidade")) + " | "
        + str(i.get("detentores") or i.get("total_detentores") or 0) + " detentor(es) nível 4+"
        + (" | " + str(i.get("projetos_dependentes")) + " projeto(s) dependem" if i.get("projetos_dependentes") else "")
        for i in itens[:15]
    ]
    return Resultado(
        resumo=str(len(itens)) + " capacidade(s) em risco",
        texto="Capacidades sustentadas por poucas pessoas:\n" + "\n".join(linhas),
        dados=itens[:15],
        fontes=[_fonte("capacidade", 0, "Bus factor", "/bus-factor")],
    )


# ---------------------------------------------------------------------------
# Financeiro
# ---------------------------------------------------------------------------
@ferramenta(
    "orcamento_consumido",
    "Orçamento consumido",
    "Projetos que mais consumiram orçamento, ordenados pelo percentual gasto.",
    "Financeiro",
    permissao="financeiro.ver",
)
def orcamento_consumido(usuario) -> Resultado:
    from apps.portfolio.models import Project

    projetos = [p for p in Project.objects.filter(arquivado=False, orcamento__gt=0)[:80] if p.orcamento]
    ordenados = sorted(
        projetos,
        key=lambda p: float(p.custo_real or 0) / float(p.orcamento or 1),
        reverse=True,
    )[:15]
    if not ordenados:
        return Resultado("Sem orçamento cadastrado.", "Nenhum projeto tem orçamento informado.")
    linhas = []
    for p in ordenados:
        consumo = float(p.custo_real or 0) / float(p.orcamento or 1) * 100
        linhas.append(
            "- " + _rotulo_projeto(p) + " | " + f"{consumo:.0f}" + "% consumido"
            + " | R$ " + f"{float(p.custo_real or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            + " de R$ " + f"{float(p.orcamento or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            + " | " + str(p.percentual_conclusao) + "% concluído"
        )
    return Resultado(
        resumo="Top " + str(len(ordenados)) + " em consumo",
        texto="Consumo de orçamento por projeto:\n" + "\n".join(linhas),
        dados=[{"id": p.id, "nome": p.nome} for p in ordenados],
        fontes=[_fonte("projeto", p.id, _rotulo_projeto(p), "/projetos/" + str(p.id)) for p in ordenados[:6]],
    )


@ferramenta(
    "resultado_financeiro",
    "Resultado financeiro",
    "Receitas, despesas e saldo do portfólio no período informado.",
    "Financeiro",
    permissao="financeiro.ver",
    parametros={
        "type": "object",
        "properties": {"meses": {"type": "integer", "description": "Quantos meses para trás (padrão 6)"}},
    },
)
def resultado_financeiro(usuario, meses: int = 6) -> Resultado:
    from apps.finance.models import Lancamento

    inicio = timezone.localdate() - timedelta(days=30 * int(meses or 6))
    lancamentos = Lancamento.objects.filter(data_competencia__gte=inicio)
    receitas = lancamentos.filter(tipo="RECEITA").aggregate(t=Sum("valor"))["t"] or 0
    despesas = lancamentos.filter(tipo="DESPESA").aggregate(t=Sum("valor"))["t"] or 0
    saldo = float(receitas) - float(despesas)
    def brl(v):
        return "R$ " + f"{float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return Resultado(
        resumo="Saldo de " + brl(saldo) + " em " + str(meses) + " meses",
        texto=(
            "Nos últimos " + str(meses) + " meses: receitas de " + brl(receitas)
            + ", despesas de " + brl(despesas) + ", saldo de " + brl(saldo) + "."
        ),
        dados={"receitas": float(receitas), "despesas": float(despesas), "saldo": saldo},
        fontes=[_fonte("financeiro", 0, "Painel financeiro", "/financeiro")],
    )


# ---------------------------------------------------------------------------
# Análises preditivas
# ---------------------------------------------------------------------------
@ferramenta(
    "risco_de_atraso",
    "Risco de atraso",
    "Projetos com maior probabilidade estimada de atrasar, com os fatores que puxam o score.",
    "Análises",
    permissao="dashboard.ver",
)
def risco_de_atraso(usuario) -> Resultado:
    from apps.analytics.services import score_risco_atraso
    from apps.portfolio.models import Project, StatusProjeto

    projetos = Project.objects.filter(status=StatusProjeto.EM_EXECUCAO)[:20]
    avaliados = []
    for p in projetos:
        try:
            r = score_risco_atraso(p)
        except Exception:
            continue
        avaliados.append((p, r))
    if not avaliados:
        return Resultado("Sem projetos em execução.", "Não há projetos em execução para avaliar.")
    avaliados.sort(key=lambda par: float(par[1].get("score") or 0), reverse=True)
    linhas = []
    for p, r in avaliados[:10]:
        fatores = [f.get("rotulo") or f.get("nome") for f in (r.get("fatores") or [])[:3]]
        linhas.append(
            "- " + _rotulo_projeto(p) + " | score " + f"{float(r.get('score') or 0):.0f}"
            + " (" + str(r.get("classificacao")) + ")"
            + (" | fatores: " + ", ".join(str(f) for f in fatores if f) if fatores else "")
        )
    return Resultado(
        resumo="Maior risco: " + f"{float(avaliados[0][1].get('score') or 0):.0f}" + " (" + str(avaliados[0][1].get("classificacao")) + ")",
        texto="Projetos com maior risco estimado de atraso:\n" + "\n".join(linhas),
        dados=[{"id": p.id, "nome": p.nome, "score": r.get("score")} for p, r in avaliados[:10]],
        fontes=[_fonte("projeto", p.id, _rotulo_projeto(p), "/analytics") for p, _ in avaliados[:6]],
    )


@ferramenta(
    "previsao_projeto",
    "Previsão de prazo e custo",
    "Estimativa por simulação de cenários: data provável de término, probabilidade de atraso e de estouro.",
    "Análises",
    permissao="dashboard.ver",
    parametros={
        "type": "object",
        "properties": {"projeto": {"type": "string", "description": "Nome ou código do projeto"}},
        "required": ["projeto"],
    },
)
def previsao_projeto(usuario, projeto: str) -> Resultado:
    from apps.analytics.services import simulacao_monte_carlo

    p = _achar_projeto(projeto)
    r = simulacao_monte_carlo(p, iteracoes=500)
    if not r.get("disponivel"):
        return Resultado("Previsão indisponível", str(r.get("motivo") or "Não há dados suficientes para simular."))
    prazo = r.get("prazo") or {}
    prob_atraso = float(r.get("probabilidade_atraso") or 0) * 100
    prob_estouro = float(r.get("probabilidade_estouro") or 0) * 100
    texto = (
        _rotulo_projeto(p) + ": em 500 cenários simulados, a conclusão mais provável é "
        + str(prazo.get("p50")) + " (metade dos cenários termina antes, metade depois). "
        + "O intervalo vai de " + str(prazo.get("p10")) + " a " + str(prazo.get("p90")) + ". "
        + "Probabilidade de atraso: " + f"{prob_atraso:.0f}" + "%. "
        + "Probabilidade de estourar o orçamento: " + f"{prob_estouro:.0f}" + "%. "
        + "Índice de confiança da simulação: " + f"{float(r.get('indice_confianca') or 0):.2f}" + "."
    )
    return Resultado(
        resumo="Conclusão provável em " + str(prazo.get("p50")),
        texto=texto,
        dados={"prazo": prazo, "probabilidade_atraso": prob_atraso, "probabilidade_estouro": prob_estouro},
        fontes=[_fonte("projeto", p.id, _rotulo_projeto(p), "/analytics")],
    )


# ---------------------------------------------------------------------------
# Apoio ao uso da ferramenta
# ---------------------------------------------------------------------------
@ferramenta(
    "como_usar",
    "Como usar o sistema",
    "Explica como executar uma tarefa no SGP, a partir dos guias de uso de cada tela.",
    "Ajuda",
)
def como_usar(usuario, duvida: str) -> Resultado:
    from apps.ajuda.models import GuiaAjuda
    from django.db.models import Q

    # Palavras comuns aparecem em todos os guias e dominariam a pontuação.
    irrelevantes = {
        "para", "como", "faco", "fazer", "quero", "preciso", "pode", "posso", "qual", "quais",
        "onde", "esta", "estao", "sobre", "com", "dos", "das", "uma", "meu", "minha", "sistema",
        "sgp", "tela", "devo", "consigo", "ajuda", "preciso", "seria", "tenho",
    }
    termos = [t for t in re.findall(r"[a-zA-ZÀ-ÿ]{4,}", duvida.lower()) if t not in irrelevantes]
    if not termos:
        return Resultado(
            "Dúvida muito curta",
            "Descreva um pouco melhor o que você quer fazer no sistema. Por exemplo: \"como registrar um risco?\"",
        )

    consulta = Q()
    for termo in termos:
        consulta |= (
            Q(titulo__icontains=termo) | Q(resumo__icontains=termo)
            | Q(para_que_serve__icontains=termo) | Q(grupo__icontains=termo)
        )
    # A busca é por "ou", então vários guias entram. A ordem do banco não diz
    # qual responde melhor: pontuamos pelo peso de cada campo e pelo número de
    # termos atendidos, para o guia certo aparecer primeiro.
    candidatos = list(GuiaAjuda.objects.filter(ativo=True).filter(consulta).distinct()[:40])

    def pontuar(guia) -> int:
        titulo = (guia.titulo or "").lower()
        resumo = (guia.resumo or "").lower()
        corpo = (guia.para_que_serve or "").lower()
        partes = []
        for passo in guia.passos or []:
            if isinstance(passo, dict):
                partes.append(str(passo.get("titulo", "")) + " " + str(passo.get("detalhe", "")))
            else:
                partes.append(str(passo))
        passos = " ".join(partes).lower()
        pontos = 0
        for termo in termos:
            t = termo.lower()
            if t in titulo:
                pontos += 6
            if t in resumo:
                pontos += 3
            if t in corpo:
                pontos += 2
            if t in passos:
                pontos += 1
        return pontos

    guias = sorted(candidatos, key=pontuar, reverse=True)
    guias = [g for g in guias if pontuar(g) > 0][:3]
    if not guias:
        return Resultado(
            "Não encontrei um guia para isso",
            "Não achei um guia que responda a essa dúvida. Abra a Central de ajuda (F1 em qualquer tela) para ver todos os guias.",
            fontes=[_fonte("ajuda", 0, "Central de ajuda", "/ajuda")],
        )

    partes = []
    for g in guias:
        passos = g.passos or []
        corpo = "\n".join(
            str(i + 1) + ". " + str(p.get("titulo", "")) + " — " + str(p.get("detalhe", ""))
            for i, p in enumerate(passos[:6])
        )
        partes.append("**" + g.titulo + "** (" + g.rota + ")\n" + (g.para_que_serve or "") + ("\n" + corpo if corpo else ""))
    return Resultado(
        resumo="Guia de " + guias[0].titulo,
        texto="Encontrei isto no manual da ferramenta:\n\n" + "\n\n".join(partes),
        dados=[{"rota": g.rota, "titulo": g.titulo} for g in guias],
        fontes=[_fonte("ajuda", g.id, g.titulo, g.rota) for g in guias],
    )


@ferramenta(
    "explicar_indicador",
    "O que significa um indicador",
    "Explica um número ou indicador do sistema: o que mede, como ler e o que fazer quando está ruim.",
    "Ajuda",
)
def explicar_indicador(usuario, termo: str) -> Resultado:
    from apps.ajuda.models import GuiaAjuda

    if not termo:
        return Resultado("Informe o indicador", "Diga qual indicador você quer entender (por exemplo: CPI, SPI, bus factor).")

    encontrados = []
    for guia in GuiaAjuda.objects.filter(ativo=True):
        for item in (guia.indicadores or []) + (guia.campos or []):
            nome = str(item.get("nome", ""))
            if termo.lower() in nome.lower():
                encontrados.append((guia, item))
    if not encontrados:
        return Resultado(
            "Indicador não encontrado",
            "Não encontrei \"" + termo + "\" na documentação dos indicadores. Todo card do sistema tem um botão ? que abre a explicação daquele número.",
        )
    guia, item = encontrados[0]
    texto = (
        "**" + str(item.get("nome")) + "**\n"
        + str(item.get("descricao") or item.get("leitura") or "")
        + ("\nComo ler: " + str(item.get("leitura")) if item.get("leitura") and item.get("descricao") else "")
        + ("\nDica: " + str(item.get("dica")) if item.get("dica") else "")
        + "\n\nEssa explicação aparece na tela " + guia.titulo + "."
    )
    return Resultado(
        resumo=str(item.get("nome")),
        texto=texto,
        dados=item,
        fontes=[_fonte("ajuda", guia.id, guia.titulo, guia.rota)],
    )


@ferramenta(
    "buscar",
    "Buscar no sistema",
    "Localiza projetos, tarefas, pessoas e capacidades pelo nome.",
    "Ajuda",
)
def buscar(usuario, termo: str) -> Resultado:
    from apps.capabilities.models import Skill
    from apps.core.models import User
    from apps.portfolio.models import Project
    from apps.tasks.models import Task

    if not termo or len(termo.strip()) < 2:
        return Resultado("Termo muito curto", "Informe ao menos duas letras para a busca.")

    achados: list[str] = []
    fontes: list[dict] = []

    for p in Project.objects.filter(Q(nome__icontains=termo) | Q(codigo__icontains=termo))[:5]:
        achados.append("- Projeto: " + _rotulo_projeto(p) + " | " + p.status + " | " + str(p.percentual_conclusao) + "%")
        fontes.append(_fonte("projeto", p.id, _rotulo_projeto(p), "/projetos/" + str(p.id)))
    for t in Task.objects.filter(nome__icontains=termo).select_related("project")[:5]:
        achados.append("- Tarefa: " + t.nome + " | " + t.project.nome)
        fontes.append(_fonte("tarefa", t.id, t.nome, "/projetos/" + str(t.project_id)))
    for u in User.objects.filter(Q(nome__icontains=termo) | Q(email__icontains=termo))[:5]:
        achados.append("- Pessoa: " + u.nome + " | " + (u.cargo or u.get_perfil_display()))
        fontes.append(_fonte("pessoa", u.id, u.nome, "/pessoas/" + str(u.id)))
    for s in Skill.objects.filter(nome__icontains=termo)[:5]:
        achados.append("- Capacidade: " + s.nome)
        fontes.append(_fonte("capacidade", s.id, s.nome, "/capacidades/skills/" + str(s.id)))

    if not achados:
        return Resultado("Nada encontrado", "Não encontrei nada com \"" + termo + "\".")
    return Resultado(
        resumo=str(len(achados)) + " resultado(s)",
        texto="Encontrei:\n" + "\n".join(achados),
        dados=achados,
        fontes=fontes[:8],
    )

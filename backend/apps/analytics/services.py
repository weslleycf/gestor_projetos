"""Serviços de analytics e IA preditiva (Fase 4).

Monte Carlo, regressão de progresso, EVM preditivo, score de risco explicável,
benchmarking de projetos, auditoria de viés, tendências do portfólio e previsão
de demanda de pessoas. Toda a matemática usa apenas a biblioteca padrão
(random, statistics, math) — sem numpy, pandas ou scipy.
"""
from __future__ import annotations

import calendar
import math
import random
import statistics
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from apps.capabilities.models import AllocationRecommendation, StatusRecomendacao
from apps.core.models import User
from apps.finance.models import StatusLancamento, TipoLancamento
from apps.finance.services import bac_do_projeto, calcular_evm, custo_real_do_projeto
from apps.resources.models import Alocacao, StatusAlocacao
from apps.resources.services import detectar_conflitos
from apps.risks.models import Issue, Risk, StatusRisco
from apps.tasks.models import STATUS_ABERTOS, StatusTarefa, Task, TaskDependency

from .models import AuditoriaVies, MetricaVies, SeveridadeVies

ZERO = Decimal("0")

# Limites de performance e de amostragem dos cálculos.
MAX_ITERACOES_MONTE_CARLO = 1000
MAX_TAREFAS_SIMULACAO = 400
MAX_PROJETOS_ANALISE = 60
HORAS_DIA = 8.0
DURACAO_PADRAO_DIAS = 5.0
MINIMO_AMOSTRA_CONFIAVEL = 10
LIMITE_DISPARIDADE_ATENCAO = 0.15
LIMITE_DISPARIDADE_CRITICO = 0.30

STATUS_ALOCACAO_VIGENTE = [
    StatusAlocacao.PROPOSTA,
    StatusAlocacao.CONFIRMADA,
    StatusAlocacao.EM_EXECUCAO,
]
STATUS_RISCO_ABERTOS = [
    StatusRisco.IDENTIFICADO,
    StatusRisco.EM_ANALISE,
    StatusRisco.PLANEJADO,
    StatusRisco.MITIGANDO,
    StatusRisco.MONITORANDO,
]
NIVEIS_RISCO_GRAVES = ["ALTO", "EXTREMO"]

# Pesos do modelo explicável de risco de atraso — somam 1,00.
PESOS_RISCO_ATRASO = [
    ("desvio_progresso", "Desvio de progresso", 0.30),
    ("spi", "SPI abaixo de 1", 0.15),
    ("tarefas_atrasadas", "Tarefas atrasadas", 0.15),
    ("criticas_atrasadas", "Tarefas críticas atrasadas", 0.15),
    ("riscos_altos", "Riscos altos ou extremos abertos", 0.10),
    ("sobrecarga_equipe", "Sobrecarga da equipe", 0.08),
    ("dependencias_externas", "Tarefas sem responsável ou sem data", 0.07),
]

FAIXAS_CLASSIFICACAO_RISCO = [
    (24, "BAIXO", "Baixo", "#10B981"),
    (49, "MEDIO", "Médio", "#F59E0B"),
    (74, "ALTO", "Alto", "#F97316"),
    (100, "CRITICO", "Crítico", "#EF4444"),
]

METRICAS_BENCHMARKING = [
    ("cpi", "CPI (eficiência de custo)", "índice", True),
    ("spi", "SPI (eficiência de prazo)", "índice", True),
    ("desvio_prazo_dias", "Desvio de prazo", "dias", False),
    ("consumo_orcamentario", "Consumo orçamentário", "%", False),
    ("densidade_riscos", "Densidade de riscos", "riscos/mês", False),
    ("densidade_issues", "Densidade de issues", "issues/mês", False),
    ("progresso", "Progresso realizado", "%", True),
]

DIMENSOES_VIES = [
    ("AREA", "Área", "DISTRIBUICAO_AREA", lambda usuario: usuario.area or "Não informada"),
    ("LOCAL", "Localização", "DISTRIBUICAO_LOCAL", lambda usuario: usuario.localizacao or "Não informada"),
    ("TEMPO_DE_CASA", "Tempo de casa", "TEMPO_DE_CASA", None),
    ("CUSTO_HORA", "Faixa de custo/hora", "TAXA_SELECAO", None),
    ("PERFIL", "Perfil", "TAXA_SELECAO", lambda usuario: usuario.get_perfil_display()),
]

SERIES_TENDENCIA = [
    ("progresso", "Progresso médio", "#3B82F6", "%", True, 0.5,
     "Avanço médio do portfólio, ponderado pelo esforço das tarefas."),
    ("cpi", "CPI médio", "#10B981", "índice", True, 0.01,
     "Eficiência de custo reconstruída por EV ÷ AC em cada mês."),
    ("spi", "SPI médio", "#F59E0B", "índice", True, 0.01,
     "Eficiência de prazo reconstruída por EV ÷ PV em cada mês."),
    ("risco", "Risco médio", "#EF4444", "severidade", False, 0.2,
     "Severidade média dos riscos abertos no mês; aumento indica piora."),
    ("ocupacao", "Ocupação média da equipe", "#8B5CF6", "%", False, 1.0,
     "Carga média das pessoas alocadas; aumento prolongado indica sobrecarga."),
]

MESES_ABREVIADOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

AVISO_METODOLOGICO = (
    "Esta auditoria mede disparidade estatística entre grupos de colaboradores e não constitui prova de "
    "discriminação. Diferenças podem decorrer de especialização técnica, disponibilidade, região de atuação "
    "ou tamanho reduzido da amostra. Todo resultado exige revisão humana qualificada (especificação §9.4) "
    "antes de qualquer decisão que afete pessoas."
)


# ---------------------------------------------------------------------------
# Utilidades numéricas e de calendário
# ---------------------------------------------------------------------------
def _d(valor) -> Decimal:
    """Converte para Decimal preservando a precisão de floats e strings."""
    if valor is None:
        return ZERO
    if isinstance(valor, Decimal):
        return valor
    return Decimal(str(valor))


def _arredondar(valor, casas: int = 2) -> float:
    """Arredonda para float com número explícito de casas (half-up)."""
    return float(_d(valor).quantize(Decimal("1." + "0" * casas), rounding=ROUND_HALF_UP))


def _media(valores: list[float]) -> float:
    """Média aritmética tolerante a lista vazia."""
    return round(sum(valores) / len(valores), 4) if valores else 0.0


def _percentil(valores: list[float], p: float) -> float:
    """Percentil por interpolação linear entre os valores ordenados."""
    if not valores:
        return 0.0
    ordenados = sorted(valores)
    if len(ordenados) == 1:
        return round(float(ordenados[0]), 4)
    posicao = (len(ordenados) - 1) * (p / 100.0)
    base = int(math.floor(posicao))
    resto = posicao - base
    if base + 1 < len(ordenados):
        valor = ordenados[base] + resto * (ordenados[base + 1] - ordenados[base])
    else:
        valor = ordenados[base]
    return round(float(valor), 4)


def _regressao_linear(xs: list[float], ys: list[float]) -> dict:
    """Regressão linear simples por mínimos quadrados: y = intercepto + inclinacao × x."""
    n = len(xs)
    if n < 2:
        return {"inclinacao": 0.0, "intercepto": round(ys[0], 4) if ys else 0.0, "r2": 0.0, "n": n}
    media_x = sum(xs) / n
    media_y = sum(ys) / n
    variancia_x = sum((x - media_x) ** 2 for x in xs)
    if variancia_x <= 0:
        return {"inclinacao": 0.0, "intercepto": round(media_y, 4), "r2": 0.0, "n": n}
    covariancia = sum((x - media_x) * (y - media_y) for x, y in zip(xs, ys))
    inclinacao = covariancia / variancia_x
    intercepto = media_y - inclinacao * media_x
    soma_total = sum((y - media_y) ** 2 for y in ys)
    soma_residuo = sum((y - (intercepto + inclinacao * x)) ** 2 for x, y in zip(xs, ys))
    r2 = 1 - (soma_residuo / soma_total) if soma_total > 0 else 0.0
    return {
        "inclinacao": inclinacao,
        "intercepto": intercepto,
        "r2": max(0.0, min(1.0, r2)),
        "n": n,
    }


def _dias_uteis(inicio: date, fim: date) -> int:
    """Dias úteis (segunda a sexta) no intervalo inclusivo."""
    if fim < inicio:
        return 0
    return sum(1 for i in range((fim - inicio).days + 1) if (inicio + timedelta(days=i)).weekday() < 5)


def _fim_do_mes(mes: date) -> date:
    """Último dia do mês da data informada."""
    return date(mes.year, mes.month, calendar.monthrange(mes.year, mes.month)[1])


def _meses_ate(referencia: date, quantidade: int) -> list[date]:
    """Primeiros dias dos últimos N meses, terminando no mês da data de referência."""
    meses = []
    ano, mes = referencia.year, referencia.month
    for _ in range(quantidade):
        meses.append(date(ano, mes, 1))
        mes -= 1
        if mes == 0:
            mes, ano = 12, ano - 1
    return list(reversed(meses))


def _meses_a_partir(referencia: date, quantidade: int) -> list[date]:
    """Primeiros dias de N meses consecutivos, começando no mês da data de referência."""
    meses = []
    ano, mes = referencia.year, referencia.month
    for _ in range(quantidade):
        meses.append(date(ano, mes, 1))
        mes += 1
        if mes == 13:
            mes, ano = 1, ano + 1
    return meses


def _rotulo_mes(mes: date) -> str:
    """Rótulo curto do mês para os gráficos (ex.: mar/26)."""
    return f"{MESES_ABREVIADOS[mes.month - 1]}/{str(mes.year)[2:]}"


def _histograma(valores: list[float], faixas: int = 20) -> list[dict]:
    """Distribui os valores em faixas iguais para o gráfico de frequência."""
    if not valores:
        return []
    minimo, maximo = min(valores), max(valores)
    if maximo <= minimo:
        return [{"indice": 0, "inicio": round(minimo, 1), "fim": round(maximo, 1), "quantidade": len(valores)}]
    largura = (maximo - minimo) / faixas
    contagens = [0] * faixas
    for valor in valores:
        indice = min(faixas - 1, int((valor - minimo) / largura))
        contagens[indice] += 1
    return [
        {
            "indice": i,
            "inicio": round(minimo + i * largura, 1),
            "fim": round(minimo + (i + 1) * largura, 1),
            "quantidade": contagem,
        }
        for i, contagem in enumerate(contagens)
    ]


def _periodo_mes(mes: date) -> tuple[date, date]:
    """Primeiro e último dia do mês."""
    return mes, _fim_do_mes(mes)


def _duracao_planejada_dias(tarefa) -> float:
    """Duração planejada da tarefa em dias; usa o esforço a 8h/dia quando não há datas."""
    if tarefa.data_inicio and tarefa.data_fim and tarefa.data_fim >= tarefa.data_inicio:
        return float(max(1, (tarefa.data_fim - tarefa.data_inicio).days + 1))
    esforco = float(tarefa.esforco_estimado or 0)
    if esforco > 0:
        return max(1.0, esforco / HORAS_DIA)
    return DURACAO_PADRAO_DIAS


def _duracao_projeto_dias(projeto) -> float:
    """Duração de referência do projeto em dias (realizada quando já encerrado)."""
    inicio = projeto.data_inicio_real or projeto.data_inicio
    fim = projeto.data_fim_real or projeto.data_fim
    if inicio and fim and fim >= inicio:
        return float(max(1, (fim - inicio).days + 1))
    return 30.0


def _desvio_prazo_dias(projeto) -> int | None:
    """Atraso acumulado do projeto em dias; negativo quando concluído antes do prazo."""
    if not projeto.data_fim:
        return None
    if projeto.data_fim_real:
        return (projeto.data_fim_real - projeto.data_fim).days
    return max(0, (timezone.localdate() - projeto.data_fim).days)


def _fracao_concluida(tarefa, cursor: date, hoje: date) -> float:
    """Fração do esforço da tarefa considerada concluída na data informada."""
    inicio = tarefa.data_inicio_real or tarefa.data_inicio
    if inicio is None or cursor < inicio:
        return 0.0
    if tarefa.status not in STATUS_ABERTOS:
        fim = tarefa.data_fim_real or tarefa.data_fim or hoje
        if cursor >= fim:
            return 1.0
        return min(1.0, (cursor - inicio).days / max(1, (fim - inicio).days))
    if cursor >= hoje:
        return max(0.0, min(1.0, tarefa.percentual_conclusao / 100.0))
    return min(1.0, (cursor - inicio).days / max(1, (hoje - inicio).days)) * (tarefa.percentual_conclusao / 100.0)


def _fracao_planejada(tarefa, cursor: date) -> float:
    """Fração do esforço prevista no cronograma para a data informada."""
    if not (tarefa.data_inicio and tarefa.data_fim):
        return 0.0
    if cursor <= tarefa.data_inicio:
        return 0.0
    if cursor >= tarefa.data_fim:
        return 1.0
    return min(1.0, (cursor - tarefa.data_inicio).days / max(1, (tarefa.data_fim - tarefa.data_inicio).days))


def _ordenacao_topologica(ids, predecessoras) -> list[int]:
    """Ordem topológica das tarefas; devolve a ordem natural quando há ciclo."""
    sucessoras: dict[int, list[int]] = defaultdict(list)
    grau = {tid: 0 for tid in ids}
    for sucessora, lista in predecessoras.items():
        for predecessor, _tipo, _lag in lista:
            if predecessor in grau and sucessora in grau:
                sucessoras[predecessor].append(sucessora)
                grau[sucessora] += 1
    fila = [tid for tid in sorted(ids) if grau[tid] == 0]
    ordem: list[int] = []
    while fila:
        atual = fila.pop(0)
        ordem.append(atual)
        for sucessora in sucessoras.get(atual, ()):
            grau[sucessora] -= 1
            if grau[sucessora] == 0:
                fila.append(sucessora)
    return ordem if len(ordem) == len(grau) else sorted(ids)


def _vies_historico(tarefas) -> dict:
    """Desvio médio observado nas tarefas concluídas — calibra as estimativas futuras."""
    desvios = []
    dias = []
    for tarefa in tarefas:
        if tarefa.data_inicio and tarefa.data_fim and tarefa.data_fim_real:
            planejada = max(1, (tarefa.data_fim - tarefa.data_inicio).days + 1)
            dias.append((tarefa.data_fim_real - tarefa.data_fim).days)
            desvios.append(dias[-1] / planejada)
    if not desvios:
        return {"amostra": 0, "vies": 0.0, "desvio_medio_dias": 0.0}
    return {
        "amostra": len(desvios),
        "vies": max(-0.5, min(1.0, sum(desvios) / len(desvios))),
        "desvio_medio_dias": round(sum(dias) / len(dias), 1),
    }


def _indice_confianca(projeto, tarefas) -> float:
    """Completude do dado de entrada da previsão, de 0 a 1."""
    total = len(tarefas)
    base = 0.0
    if total:
        com_datas = sum(1 for t in tarefas if t.data_inicio and t.data_fim) / total
        com_esforco = sum(1 for t in tarefas if float(t.esforco_estimado or 0) > 0) / total
        com_responsavel = sum(1 for t in tarefas if t.responsavel_id) / total
        com_real = sum(1 for t in tarefas if t.data_inicio_real or t.data_fim_real) / total
        base = 0.25 * com_datas + 0.20 * com_esforco + 0.20 * com_responsavel + 0.10 * com_real
    dependencias = 0.0
    if total > 1:
        mapeadas = TaskDependency.objects.filter(predecessor__project=projeto).count()
        dependencias = min(1.0, mapeadas / (total - 1))
    orcamento = 1.0 if float(bac_do_projeto(projeto)) > 0 else 0.0
    custo = 1.0 if float(custo_real_do_projeto(projeto)) > 0 else 0.0
    return round(max(0.0, min(1.0, base + 0.15 * dependencias + 0.05 * orcamento + 0.05 * custo)), 3)


def _classificar_risco(score: float) -> tuple[str, str, str]:
    """Converte o score 0–100 na classificação executiva, no rótulo e na cor."""
    for limite, chave, rotulo, cor in FAIXAS_CLASSIFICACAO_RISCO:
        if score <= limite:
            return chave, rotulo, cor
    return "CRITICO", "Crítico", "#EF4444"


# ---------------------------------------------------------------------------
# 1. Simulação de Monte Carlo
# ---------------------------------------------------------------------------
def simulacao_monte_carlo(project, iteracoes: int = 1000, semente: int | None = None) -> dict:
    """Simula prazo e custo final do projeto por Monte Carlo com distribuição triangular.

    Cada tarefa em aberto tem duração otimista de 70%, moda de 100% e pessimista de 160%
    do esforço restante planejado, calibrado pelo viés observado nas tarefas concluídas.
    As dependências definem a cadeia; tarefas sem predecessora correm em paralelo ponderado
    pela disponibilidade da equipe. Usa random.Random(semente) quando a semente é informada.
    """
    hoje = timezone.localdate()
    iteracoes = max(1, min(int(iteracoes or 1), MAX_ITERACOES_MONTE_CARLO))
    rng = random.Random(semente) if semente is not None else random.Random()

    evm = calcular_evm(project)
    bac = float(evm["BAC"])
    ac = float(evm["AC"])
    cpi = float(evm["CPI"]) or 1.0
    planejada_iso = project.data_fim.isoformat() if project.data_fim else None
    prazo_planejado = (project.data_fim - hoje).days if project.data_fim else None

    todas = list(project.tarefas.all())
    abertas = [t for t in todas if t.status in STATUS_ABERTOS]
    amostragem = len(abertas) > MAX_TAREFAS_SIMULACAO
    if amostragem:
        abertas = sorted(abertas, key=lambda t: -float(t.esforco_estimado or 0))[:MAX_TAREFAS_SIMULACAO]

    if not abertas:
        return {
            "disponivel": False,
            "motivo": "O projeto não possui tarefas em aberto para simular.",
            "metodo": "MONTE_CARLO",
            "data_referencia": hoje.isoformat(),
            "iteracoes": iteracoes,
            "semente": semente,
            "tarefas_consideradas": 0,
            "tarefas_totais": len(todas),
            "amostragem_aplicada": False,
            "vies_calibrado": 0.0,
            "fator_paralelismo": 1.0,
            "prazo": {
                "p10": None, "p50": None, "p80": None, "p90": None,
                "dias_p10": None, "dias_p50": None, "dias_p80": None, "dias_p90": None,
                "otimista_dias": None, "pessimista_dias": None, "media_dias": None,
                "data_planejada": planejada_iso, "desvio_p50_dias": None,
            },
            "custo": {
                "p10": round(bac, 2), "p50": round(bac, 2), "p80": round(bac, 2), "p90": round(bac, 2),
                "media": round(bac, 2), "BAC": round(bac, 2), "AC": round(ac, 2), "moeda": "BRL",
            },
            "probabilidade_atraso": 0.0,
            "probabilidade_estouro": 0.0,
            "indice_confianca": _indice_confianca(project, todas),
            "histograma": [],
            "premissas": ["Sem tarefas em aberto: não há esforço restante para simular."],
        }

    ids = {t.id for t in abertas}
    predecessoras: dict[int, list[tuple[int, str, int]]] = defaultdict(list)
    for predecessor, sucessora, tipo, lag in TaskDependency.objects.filter(
        predecessor_id__in=ids, successor_id__in=ids
    ).values_list("predecessor_id", "successor_id", "tipo", "lag"):
        predecessoras[sucessora].append((predecessor, tipo, lag))
    ordem = _ordenacao_topologica(ids, predecessoras)

    duracao_base = {t.id: _duracao_planejada_dias(t) for t in abertas}
    restante = {t.id: max(0.05, 1 - t.percentual_conclusao / 100.0) for t in abertas}
    vies = _vies_historico([t for t in todas if t.status != StatusTarefa.CANCELADA])

    # Tarefas sem predecessora rodam em paralelo; o paralelismo é limitado pelo número de
    # responsáveis distintos disponíveis (equipes menores alongam as frentes simultâneas).
    raiz = [t.id for t in abertas if not predecessoras.get(t.id)]
    responsaveis = {t.responsavel_id for t in abertas if t.responsavel_id}
    fator_paralelismo = 1.0
    if raiz:
        fator_paralelismo = min(3.0, max(1.0, len(raiz) / max(1, len(responsaveis))))
    modo_custo_base = max(1.0, 1.0 / cpi) if cpi > 0 else 1.0

    prazos: list[float] = []
    custos: list[float] = []
    atrasadas = 0
    estouros = 0

    for _ in range(iteracoes):
        duracao: dict[int, float] = {}
        for tid in ordem:
            referencia = duracao_base[tid] * (1 + vies["vies"]) * restante[tid]
            if not predecessoras.get(tid):
                referencia *= fator_paralelismo
            referencia = max(0.5, referencia)
            duracao[tid] = rng.triangular(referencia * 0.7, referencia * 1.6, referencia)

        inicio_rel: dict[int, float] = {}
        fim_rel: dict[int, float] = {}
        for tid in ordem:
            inicio = 0.0
            for predecessor, tipo, lag in predecessoras.get(tid, ()):
                if predecessor not in fim_rel:
                    continue
                if tipo == "FS":
                    inicio = max(inicio, fim_rel[predecessor] + lag)
                elif tipo == "SS":
                    inicio = max(inicio, inicio_rel[predecessor] + lag)
                elif tipo == "FF":
                    inicio = max(inicio, fim_rel[predecessor] + lag - duracao[tid])
                elif tipo == "SF":
                    inicio = max(inicio, inicio_rel[predecessor] + lag - duracao[tid])
            inicio_rel[tid] = max(0.0, inicio)
            fim_rel[tid] = inicio_rel[tid] + duracao[tid]

        prazo = max(fim_rel.values())
        atraso_relativo = 0.0
        if prazo_planejado is not None:
            atraso_relativo = max(0.0, prazo - prazo_planejado) / max(1.0, abs(float(prazo_planejado)))
        modo_custo = modo_custo_base * (1 + 0.35 * atraso_relativo)
        fator_custo = rng.triangular(0.95, modo_custo * 1.35, modo_custo)
        custo = bac * fator_custo

        prazos.append(prazo)
        custos.append(custo)
        if prazo_planejado is not None and prazo > prazo_planejado:
            atrasadas += 1
        if bac > 0 and custo > bac:
            estouros += 1

    dias_p10 = int(round(_percentil(prazos, 10)))
    dias_p50 = int(round(_percentil(prazos, 50)))
    dias_p80 = int(round(_percentil(prazos, 80)))
    dias_p90 = int(round(_percentil(prazos, 90)))

    premissas = [
        "Duração de cada tarefa modelada por distribuição triangular: otimista de 70%, moda de 100% "
        "e pessimista de 160% do esforço restante planejado.",
        f"{len(abertas)} tarefa(s) em aberto consideradas, com paralelismo limitado a "
        f"{fator_paralelismo:.2f} vezes pela disponibilidade da equipe.",
        "Custo final calculado como BAC multiplicado por um fator de desvio sorteado em cada iteração, "
        f"calibrado pelo CPI atual de {cpi:.3f}.",
    ]
    if vies["amostra"]:
        premissas.append(
            f"Viés de {vies['vies'] * 100:.1f}% aplicado às estimativas, calibrado em "
            f"{vies['amostra']} tarefa(s) concluída(s) com desvio médio de {vies['desvio_medio_dias']:.1f} dia(s)."
        )
    else:
        premissas.append("Nenhuma tarefa concluída com data real registrada: sem correção de viés histórico.")
    if amostragem:
        premissas.append(
            f"Amostra das {MAX_TAREFAS_SIMULACAO} maiores tarefas por esforço, para manter o tempo de resposta."
        )
    if prazo_planejado is None:
        premissas.append("Projeto sem data de término planejada: a probabilidade de atraso não foi avaliada.")

    return {
        "disponivel": True,
        "motivo": "",
        "metodo": "MONTE_CARLO",
        "data_referencia": hoje.isoformat(),
        "iteracoes": iteracoes,
        "semente": semente,
        "tarefas_consideradas": len(abertas),
        "tarefas_totais": len(todas),
        "amostragem_aplicada": amostragem,
        "vies_calibrado": round(vies["vies"], 4),
        "fator_paralelismo": round(fator_paralelismo, 2),
        "prazo": {
            "p10": (hoje + timedelta(days=dias_p10)).isoformat(),
            "p50": (hoje + timedelta(days=dias_p50)).isoformat(),
            "p80": (hoje + timedelta(days=dias_p80)).isoformat(),
            "p90": (hoje + timedelta(days=dias_p90)).isoformat(),
            "dias_p10": dias_p10,
            "dias_p50": dias_p50,
            "dias_p80": dias_p80,
            "dias_p90": dias_p90,
            "otimista_dias": int(round(min(prazos))),
            "pessimista_dias": int(round(max(prazos))),
            "media_dias": round(sum(prazos) / len(prazos), 1),
            "data_planejada": planejada_iso,
            "desvio_p50_dias": (dias_p50 - prazo_planejado) if prazo_planejado is not None else None,
        },
        "custo": {
            "p10": round(_percentil(custos, 10), 2),
            "p50": round(_percentil(custos, 50), 2),
            "p80": round(_percentil(custos, 80), 2),
            "p90": round(_percentil(custos, 90), 2),
            "media": round(sum(custos) / len(custos), 2),
            "BAC": round(bac, 2),
            "AC": round(ac, 2),
            "moeda": "BRL",
        },
        "probabilidade_atraso": round(atrasadas / iteracoes, 4),
        "probabilidade_estouro": round(estouros / iteracoes, 4) if bac > 0 else 0.0,
        "indice_confianca": _indice_confianca(project, todas),
        "histograma": _histograma(prazos),
        "premissas": premissas,
    }


# ---------------------------------------------------------------------------
# 2. Previsão por regressão linear
# ---------------------------------------------------------------------------
def previsao_por_regressao(project) -> dict:
    """Projeta a data de conclusão por regressão linear sobre a série de progresso real.

    O eixo X é o número de dias desde o início da execução e o eixo Y é o percentual
    concluído, ponderado pelo esforço das tarefas. R² indica a qualidade do ajuste.
    """
    hoje = timezone.localdate()
    tarefas = [t for t in project.tarefas.all() if t.status != StatusTarefa.CANCELADA]
    if not tarefas:
        return {
            "disponivel": False,
            "motivo": "O projeto não possui tarefas para compor a série de progresso.",
            "pontos": [],
            "premissas": [],
        }

    com_datas = [t for t in tarefas if (t.data_inicio_real or t.data_inicio)]
    if len(com_datas) < 2:
        return {
            "disponivel": False,
            "motivo": "Menos de duas tarefas possuem datas para reconstruir a série de progresso.",
            "pontos": [],
            "premissas": [],
        }

    pesos = {t.id: float(t.esforco_estimado or 0) or 1.0 for t in com_datas}
    peso_total = sum(pesos.values()) or 1.0
    inicio = min((t.data_inicio_real or t.data_inicio) for t in com_datas)
    if inicio >= hoje:
        return {
            "disponivel": False,
            "motivo": "A execução ainda não começou: não há série histórica de progresso.",
            "pontos": [],
            "premissas": [],
        }

    passo = max(1, (hoje - inicio).days // 24)
    pontos = []
    cursor = inicio
    while cursor < hoje:
        progresso = sum(pesos[t.id] * _fracao_concluida(t, cursor, hoje) for t in com_datas) / peso_total * 100
        pontos.append({"data": cursor.isoformat(), "dia": (cursor - inicio).days, "progresso": round(progresso, 2)})
        cursor += timedelta(days=passo)
    progresso_final = sum(pesos[t.id] * _fracao_concluida(t, hoje, hoje) for t in com_datas) / peso_total * 100
    pontos.append({"data": hoje.isoformat(), "dia": (hoje - inicio).days, "progresso": round(progresso_final, 2)})

    if len(pontos) < 3:
        return {
            "disponivel": False,
            "motivo": "São necessários ao menos 3 pontos de medição para ajustar a regressão.",
            "pontos": pontos,
            "premissas": [],
        }

    regressao = _regressao_linear([p["dia"] for p in pontos], [p["progresso"] for p in pontos])
    inclinacao = regressao["inclinacao"]
    atual = pontos[-1]["progresso"]
    if inclinacao > 0.001:
        dias_para_concluir = max(0, math.ceil((100 - atual) / inclinacao))
        data_projetada = hoje + timedelta(days=dias_para_concluir)
    else:
        dias_para_concluir = None
        data_projetada = None

    desvio_dias = (
        (data_projetada - project.data_fim).days if (data_projetada and project.data_fim) else None
    )
    r2 = round(regressao["r2"], 3)
    qualidade = "ALTA" if r2 >= 0.75 else "MEDIA" if r2 >= 0.40 else "BAIXA"

    return {
        "disponivel": True,
        "motivo": (
            ""
            if data_projetada
            else "A velocidade observada é nula ou negativa: não há projeção de conclusão."
        ),
        "pontos": pontos,
        "inclinacao_dia": round(inclinacao, 4),
        "inclinacao_semana": round(inclinacao * 7, 3),
        "intercepto": round(regressao["intercepto"], 3),
        "r2": r2,
        "qualidade_ajuste": qualidade,
        "progresso_modelado": round(atual, 2),
        "progresso_informado": float(project.percentual_conclusao),
        "progresso_planejado": float(project.progresso_planejado),
        "data_projetada_conclusao": data_projetada.isoformat() if data_projetada else None,
        "data_fim_planejada": project.data_fim.isoformat() if project.data_fim else None,
        "desvio_dias": desvio_dias,
        "atraso_previsto": bool(desvio_dias and desvio_dias > 0),
        "dias_restantes_projetados": dias_para_concluir,
        "premissas": [
            f"Série reconstruída com {len(pontos)} pontos entre {inicio:%d/%m/%Y} e {hoje:%d/%m/%Y}, "
            "ponderada pelo esforço estimado das tarefas.",
            f"R² de {r2}: qualidade de ajuste {qualidade.lower()} para extrapolar a tendência.",
            "Tarefas canceladas foram excluídas da série; tarefas em andamento seguem o progresso informado.",
        ],
    }


# ---------------------------------------------------------------------------
# 3. Previsão de custo (EAC)
# ---------------------------------------------------------------------------
def previsao_custo(project) -> dict:
    """Compara os três métodos de EAC, com média, intervalo e o mais provável no contexto."""
    evm = calcular_evm(project)
    bac = _d(evm["BAC"])
    ev = _d(evm["EV"])
    ac = _d(evm["AC"])
    cpi = _d(evm["CPI"]) or Decimal("1")
    spi = _d(evm["SPI"]) or Decimal("1")

    eac_desempenho = (bac / cpi) if cpi > 0 else bac
    eac_plano = ac + (bac - ev)
    divisor = cpi * spi
    eac_combinado = (ac + (bac - ev) / divisor) if divisor > 0 else bac

    def _item(chave, rotulo, formula, valor, descricao):
        variacao = valor - bac
        return {
            "chave": chave,
            "rotulo": rotulo,
            "formula": formula,
            "valor": _arredondar(valor),
            "variacao_vs_bac": _arredondar(variacao),
            "percentual_vs_bac": _arredondar((variacao / bac * 100) if bac > 0 else ZERO, 1),
            "descricao": descricao,
        }

    metodos = [
        _item(
            "DESEMPENHO_MANTIDO", "Desempenho de custo se mantém", "EAC = BAC / CPI", eac_desempenho,
            "Mantém a eficiência de custo observada até agora no restante do projeto.",
        ),
        _item(
            "RETORNO_AO_PLANO", "Desempenho futuro volta ao plano", "EAC = AC + (BAC - EV)", eac_plano,
            "Assume que o trabalho restante custará exatamente o orçamento previsto.",
        ),
        _item(
            "PRAZO_E_CUSTO", "Considera também o atraso", "EAC = AC + (BAC - EV) / (CPI x SPI)", eac_combinado,
            "Combina ineficiência de custo e de prazo, o cenário mais conservador.",
        ),
    ]

    valores = [item["valor"] for item in metodos]
    if spi < Decimal("0.95"):
        provavel, justificativa = (
            "PRAZO_E_CUSTO",
            f"SPI de {_arredondar(spi, 3)} indica atraso relevante; o método que também corrige o prazo "
            "é o mais aderente ao contexto atual.",
        )
    elif Decimal("0.95") <= cpi <= Decimal("1.05"):
        provavel, justificativa = (
            "DESEMPENHO_MANTIDO",
            f"CPI de {_arredondar(cpi, 3)} está estável em torno de 1; a eficiência de custo tende a se manter.",
        )
    else:
        provavel, justificativa = (
            "RETORNO_AO_PLANO",
            f"CPI de {_arredondar(cpi, 3)} está fora da faixa estável e o SPI de {_arredondar(spi, 3)} não "
            "indica atraso crítico; o trabalho restante deve voltar ao orçamento planejado.",
        )

    return {
        "disponivel": True,
        "BAC": _arredondar(bac),
        "EV": _arredondar(ev),
        "AC": _arredondar(ac),
        "PV": _arredondar(evm["PV"]),
        "CPI": _arredondar(cpi, 3),
        "SPI": _arredondar(spi, 3),
        "metodos": metodos,
        "media": _arredondar(sum(valores) / len(valores)),
        "minimo": _arredondar(min(valores)),
        "maximo": _arredondar(max(valores)),
        "amplitude": _arredondar(max(valores) - min(valores)),
        "amplitude_percentual": _arredondar(
            (_d(max(valores) - min(valores)) / bac * 100) if bac > 0 else ZERO, 1
        ),
        "metodo_provavel": provavel,
        "metodo_provavel_rotulo": next(m["rotulo"] for m in metodos if m["chave"] == provavel),
        "metodo_provavel_valor": next(m["valor"] for m in metodos if m["chave"] == provavel),
        "justificativa": justificativa,
        "situacao_custo": evm["situacao_custo"],
        "situacao_prazo": evm["situacao_prazo"],
        "premissas": [
            "Os três métodos de EAC são calculados sobre o mesmo BAC, EV e AC da linha de base atual.",
            "O intervalo entre o menor e o maior EAC mostra a sensibilidade da projeção às hipóteses adotadas.",
        ],
    }


# ---------------------------------------------------------------------------
# 4. Score de risco de atraso (modelo explicável)
# ---------------------------------------------------------------------------
def score_risco_atraso(project) -> dict:
    """Score de 0 a 100 para o risco de atraso, com fatores ponderados e explicáveis.

    Pesos: desvio de progresso 0,30; SPI 0,15; tarefas atrasadas 0,15; tarefas críticas
    atrasadas 0,15; riscos altos ou extremos 0,10; sobrecarga da equipe 0,08; tarefas sem
    responsável ou sem data 0,07. Classificação: 0–24 BAIXO, 25–49 MEDIO, 50–74 ALTO, 75–100 CRITICO.
    """
    hoje = timezone.localdate()
    evm = calcular_evm(project)
    tarefas = list(project.tarefas.all())
    abertas = [t for t in tarefas if t.status in STATUS_ABERTOS]
    atrasadas = [t for t in abertas if t.data_fim and t.data_fim < hoje]
    criticas = [t for t in abertas if t.critica]
    criticas_atrasadas = [t for t in criticas if t.data_fim and t.data_fim < hoje]

    planejado = float(project.progresso_planejado)
    realizado = float(project.percentual_conclusao)
    desvio = max(0.0, (planejado - realizado) / 100.0)
    spi = float(evm["SPI"])
    riscos_graves = project.riscos.filter(status__in=STATUS_RISCO_ABERTOS, nivel__in=NIVEIS_RISCO_GRAVES).count()
    conflitos = detectar_conflitos(project_id=project.id)
    pessoas = {
        a.user_id for a in Alocacao.objects.filter(project=project, user__isnull=False).only("user_id")
    }
    sem_responsavel = sum(1 for t in abertas if not t.responsavel_id)
    sem_data = sum(1 for t in abertas if not t.data_fim)

    valores = {
        "desvio_progresso": min(1.0, desvio / 0.30),
        "spi": min(1.0, max(0.0, (1.0 - spi) / 0.30)),
        "tarefas_atrasadas": min(1.0, len(atrasadas) / max(1, len(abertas))) if abertas else 0.0,
        "criticas_atrasadas": min(1.0, len(criticas_atrasadas) / max(1, len(criticas))) if criticas else 0.0,
        "riscos_altos": min(1.0, riscos_graves / 3.0),
        "sobrecarga_equipe": min(1.0, len(conflitos) / len(pessoas)) if pessoas else 0.0,
        "dependencias_externas": (
            min(1.0, (sem_responsavel + sem_data) / max(1, len(abertas))) if abertas else 0.0
        ),
    }

    descricoes = {
        "desvio_progresso": (
            f"O projeto está {desvio * 100:.0f} ponto(s) percentual(is) atrás do planejado "
            f"(planejado {planejado:.0f}% contra realizado {realizado:.0f}%)."
            if desvio > 0.005
            else f"O progresso realizado ({realizado:.0f}%) acompanha o planejado ({planejado:.0f}%)."
        ),
        "spi": (
            f"O SPI de {spi:.2f} mostra entrega {((1 - spi) * 100):.0f}% abaixo do ritmo previsto."
            if spi < 0.999
            else f"O SPI de {spi:.2f} indica que a entrega está no ritmo planejado."
        ),
        "tarefas_atrasadas": (
            f"{len(atrasadas)} de {len(abertas)} tarefa(s) em aberto já passaram do prazo."
            if atrasadas
            else "Nenhuma tarefa em aberto está com prazo vencido."
        ),
        "criticas_atrasadas": (
            f"{len(criticas_atrasadas)} de {len(criticas)} tarefa(s) do caminho crítico estão atrasadas."
            if criticas
            else "O projeto não possui tarefas marcadas no caminho crítico."
        ),
        "riscos_altos": (
            f"{riscos_graves} risco(s) de nível alto ou extremo seguem abertos."
            if riscos_graves
            else "Nenhum risco de nível alto ou extremo está aberto."
        ),
        "sobrecarga_equipe": (
            f"{len(conflitos)} conflito(s) de alocação acima de 100% foram detectados na equipe do projeto."
            if conflitos
            else "Não há conflito de alocação acima de 100% na equipe do projeto."
        ),
        "dependencias_externas": (
            f"{sem_responsavel} tarefa(s) sem responsável e {sem_data} sem data de término dependem de definição."
            if (sem_responsavel or sem_data)
            else "Todas as tarefas em aberto têm responsável e data de término definidos."
        ),
    }

    fatores = []
    for chave, rotulo, peso in PESOS_RISCO_ATRASO:
        valor = round(valores[chave], 3)
        contribuicao = round(peso * valor * 100, 1)
        fatores.append(
            {
                "fator": chave,
                "rotulo": rotulo,
                "peso": peso,
                "valor": valor,
                "contribuicao": contribuicao,
                "impacto": (
                    "ALTO" if contribuicao >= 15 else "MEDIO" if contribuicao >= 8
                    else "BAIXO" if contribuicao > 0 else "NENHUM"
                ),
                "descricao": descricoes[chave],
            }
        )

    score = round(max(0.0, min(100.0, sum(f["contribuicao"] for f in fatores))), 1)
    classificacao, rotulo_classificacao, cor = _classificar_risco(score)
    principais = sorted(fatores, key=lambda f: -f["contribuicao"])[:2]
    resumo = (
        "Risco de atraso " + rotulo_classificacao.lower() + ". Principais causas: "
        + "; ".join(f["descricao"] for f in principais if f["contribuicao"] > 0)
        if any(f["contribuicao"] > 0 for f in principais)
        else "Risco de atraso baixo: nenhum fator relevante foi acionado."
    )

    return {
        "score": score,
        "classificacao": classificacao,
        "classificacao_rotulo": rotulo_classificacao,
        "cor": cor,
        "fatores": fatores,
        "indice_confianca": _indice_confianca(project, tarefas),
        "resumo": resumo,
        "evm": {
            "CPI": evm["CPI"],
            "SPI": evm["SPI"],
            "situacao_custo": evm["situacao_custo"],
            "situacao_prazo": evm["situacao_prazo"],
        },
        "detalhes": {
            "tarefas_abertas": len(abertas),
            "tarefas_atrasadas": len(atrasadas),
            "tarefas_criticas_abertas": len(criticas),
            "riscos_graves_abertos": riscos_graves,
            "conflitos_alocacao": len(conflitos),
            "pessoas_alocadas": len(pessoas),
            "tarefas_sem_responsavel": sem_responsavel,
            "tarefas_sem_data": sem_data,
            "desvio_progresso_percentual": round(desvio * 100, 1),
        },
        "premissas": [
            "Cada fator é normalizado entre 0 e 1 e multiplicado pelo peso; a soma dos pesos é 1,00.",
            "O score é a soma das contribuições em pontos percentuais, limitada a 100.",
        ],
    }


# ---------------------------------------------------------------------------
# 5. Benchmarking entre projetos
# ---------------------------------------------------------------------------
def _contagem_por_projeto(queryset) -> dict[int, int]:
    """Conta registros agrupados pelo projeto de origem."""
    return {linha["project_id"]: linha["total"] for linha in queryset.values("project_id").annotate(total=Count("id"))}


def _percentil_desempenho(valores: list[float], valor: float | None, maior_melhor: bool) -> float | None:
    """Posição percentil de desempenho: 100 para o melhor projeto do conjunto."""
    if valor is None or not valores:
        return None
    desempenho = valor if maior_melhor else -valor
    piores_ou_iguais = sum(1 for v in valores if (v if maior_melhor else -v) <= desempenho)
    return round(piores_ou_iguais / len(valores) * 100, 1)


def _resumo_projeto(entrada: dict, chave: str) -> dict:
    """Recorte de um projeto em uma métrica, para as listas de melhores e piores."""
    return {
        "id": entrada["id"],
        "codigo": entrada["codigo"],
        "nome": entrada["nome"],
        "cor": entrada["cor"],
        "valor": entrada["valores"][chave],
        "percentil": entrada["percentis"][chave],
    }


def _praticas_observadas(dados: list[dict], metricas: dict) -> list[dict]:
    """Extrai práticas dos melhores projetos, sempre acompanhadas da evidência numérica."""
    praticas = []
    if len(dados) < 4:
        return praticas

    mediana_cpi = metricas["cpi"]["mediana"]
    acima = [d for d in dados if d["valores"]["cpi"] >= mediana_cpi]
    abaixo = [d for d in dados if d["valores"]["cpi"] < mediana_cpi]
    if len(acima) >= 2 and len(abaixo) >= 2:
        media_acima = _media([float(d["riscos_graves"]) for d in acima])
        media_abaixo = _media([float(d["riscos_graves"]) for d in abaixo])
        if media_abaixo > 0 and media_acima < media_abaixo:
            reducao = (media_abaixo - media_acima) / media_abaixo * 100
            praticas.append(
                {
                    "titulo": "Custo sob controle reduz exposição",
                    "detalhe": (
                        f"Projetos com CPI acima da mediana ({mediana_cpi}) mantêm {reducao:.0f}% menos riscos "
                        "de nível alto ou extremo abertos."
                    ),
                    "evidencia": {
                        "grupo_referencia": len(acima),
                        "grupo_comparacao": len(abaixo),
                        "media_referencia": round(media_acima, 2),
                        "media_comparacao": round(media_abaixo, 2),
                    },
                    "icone": "shield-check",
                }
            )

    mediana_spi = metricas["spi"]["mediana"]
    ageis = [d for d in dados if d["valores"]["spi"] >= mediana_spi]
    lentos = [d for d in dados if d["valores"]["spi"] < mediana_spi]
    if len(ageis) >= 2 and len(lentos) >= 2:
        media_ageis = _media([d["valores"]["densidade_issues"] for d in ageis])
        media_lentos = _media([d["valores"]["densidade_issues"] for d in lentos])
        if media_lentos > 0 and media_ageis < media_lentos:
            reducao = (media_lentos - media_ageis) / media_lentos * 100
            praticas.append(
                {
                    "titulo": "Ritmo de entrega derruba o volume de issues",
                    "detalhe": (
                        f"Projetos com SPI acima da mediana ({mediana_spi}) registram {reducao:.0f}% menos issues "
                        "por mês de duração."
                    ),
                    "evidencia": {
                        "grupo_referencia": len(ageis),
                        "grupo_comparacao": len(lentos),
                        "media_referencia": round(media_ageis, 2),
                        "media_comparacao": round(media_lentos, 2),
                    },
                    "icone": "activity",
                }
            )

    pontuais = [d for d in dados if (d["valores"]["desvio_prazo_dias"] or 0) <= 0]
    atrasados = [d for d in dados if (d["valores"]["desvio_prazo_dias"] or 0) > 0]
    if len(pontuais) >= 2 and len(atrasados) >= 2:
        media_pontuais = _media([d["valores"]["progresso"] for d in pontuais])
        media_atrasados = _media([d["valores"]["progresso"] for d in atrasados])
        if media_pontuais > media_atrasados:
            praticas.append(
                {
                    "titulo": "Pontualidade acompanha avanço físico",
                    "detalhe": (
                        f"Projetos sem atraso acumulado entregam {media_pontuais:.0f}% de progresso médio contra "
                        f"{media_atrasados:.0f}% dos projetos atrasados."
                    ),
                    "evidencia": {
                        "grupo_referencia": len(pontuais),
                        "grupo_comparacao": len(atrasados),
                        "media_referencia": round(media_pontuais, 2),
                        "media_comparacao": round(media_atrasados, 2),
                    },
                    "icone": "calendar-check",
                }
            )

    mediana_consumo = metricas["consumo_orcamentario"]["mediana"]
    enxutos = [d for d in dados if d["valores"]["consumo_orcamentario"] <= mediana_consumo]
    adiantados = [d for d in dados if d["valores"]["consumo_orcamentario"] > mediana_consumo]
    if len(enxutos) >= 2 and len(adiantados) >= 2:
        media_enxutos = _media([d["valores"]["spi"] for d in enxutos])
        media_adiantados = _media([d["valores"]["spi"] for d in adiantados])
        if media_enxutos > media_adiantados:
            praticas.append(
                {
                    "titulo": "Consumo disciplinado sustenta o prazo",
                    "detalhe": (
                        f"Projetos com consumo orçamentário até a mediana ({mediana_consumo}%) apresentam SPI médio "
                        f"de {media_enxutos:.2f} contra {media_adiantados:.2f} dos demais."
                    ),
                    "evidencia": {
                        "grupo_referencia": len(enxutos),
                        "grupo_comparacao": len(adiantados),
                        "media_referencia": round(media_enxutos, 3),
                        "media_comparacao": round(media_adiantados, 3),
                    },
                    "icone": "wallet",
                }
            )
    return praticas


def benchmarking_projetos(projects) -> dict:
    """Compara os projetos do escopo: distribuições, percentis, melhores, piores e práticas.

    Métricas: CPI, SPI, desvio de prazo, consumo orçamentário, densidade de riscos,
    densidade de issues e progresso. O percentil é de desempenho: 100 é o melhor do conjunto.
    """
    lista = list(projects)[:MAX_PROJETOS_ANALISE]
    if not lista:
        return {
            "total_projetos": 0,
            "metricas": {},
            "projetos": [],
            "melhores": {},
            "piores": {},
            "destaques": [],
            "praticas": [],
            "premissas": ["Nenhum projeto no escopo informado."],
        }

    ids = [p.id for p in lista]
    riscos = _contagem_por_projeto(Risk.objects.filter(project_id__in=ids))
    riscos_graves = _contagem_por_projeto(
        Risk.objects.filter(project_id__in=ids, nivel__in=NIVEIS_RISCO_GRAVES, status__in=STATUS_RISCO_ABERTOS)
    )
    issues = _contagem_por_projeto(Issue.objects.filter(project_id__in=ids))

    dados = []
    for projeto in lista:
        evm = calcular_evm(projeto)
        bac = float(evm["BAC"])
        ac = float(evm["AC"])
        meses = max(1.0, _duracao_projeto_dias(projeto) / 30.0)
        dados.append(
            {
                "id": projeto.id,
                "codigo": projeto.codigo,
                "nome": projeto.nome,
                "cor": projeto.cor,
                "area": projeto.area,
                "status": projeto.status,
                "saude": projeto.saude,
                "programa": projeto.program.nome if projeto.program_id else "",
                "riscos_graves": riscos_graves.get(projeto.id, 0),
                "duracao_meses": round(meses, 1),
                "valores": {
                    "cpi": round(float(evm["CPI"]), 3),
                    "spi": round(float(evm["SPI"]), 3),
                    "desvio_prazo_dias": _desvio_prazo_dias(projeto),
                    "consumo_orcamentario": round(ac / bac * 100, 1) if bac > 0 else 0.0,
                    "densidade_riscos": round(riscos.get(projeto.id, 0) / meses, 2),
                    "densidade_issues": round(issues.get(projeto.id, 0) / meses, 2),
                    "progresso": float(projeto.percentual_conclusao),
                },
            }
        )

    metricas = {}
    for chave, rotulo, unidade, maior_melhor in METRICAS_BENCHMARKING:
        valores = [d["valores"][chave] for d in dados if d["valores"][chave] is not None]
        metricas[chave] = {
            "chave": chave,
            "rotulo": rotulo,
            "unidade": unidade,
            "maior_melhor": maior_melhor,
            "minimo": _percentil(valores, 0),
            "p25": _percentil(valores, 25),
            "mediana": round(statistics.median(valores), 4) if valores else 0.0,
            "p75": _percentil(valores, 75),
            "maximo": _percentil(valores, 100),
            "media": _media(valores),
            "amostras": len(valores),
        }

    for entrada in dados:
        entrada["percentis"] = {
            chave: _percentil_desempenho(
                [d["valores"][chave] for d in dados if d["valores"][chave] is not None],
                entrada["valores"][chave],
                maior_melhor,
            )
            for chave, _rotulo, _unidade, maior_melhor in METRICAS_BENCHMARKING
        }
        entrada["indice_geral"] = round(
            _media([p for p in entrada["percentis"].values() if p is not None]), 1
        )

    melhores, piores = {}, {}
    for chave, _rotulo, _unidade, maior_melhor in METRICAS_BENCHMARKING:
        ordenados = sorted(
            [d for d in dados if d["valores"][chave] is not None],
            key=lambda d: d["valores"][chave],
            reverse=maior_melhor,
        )
        melhores[chave] = [_resumo_projeto(d, chave) for d in ordenados[:3]]
        piores[chave] = [_resumo_projeto(d, chave) for d in list(reversed(ordenados))[:3]]

    destaques = []
    for chave, titulo, icone in [
        ("cpi", "Referência em eficiência de custo", "trending-up"),
        ("spi", "Referência em desempenho de prazo", "gauge"),
        ("desvio_prazo_dias", "Referência em pontualidade", "calendar-check"),
        ("densidade_riscos", "Referência em gestão de riscos", "shield-check"),
        ("progresso", "Referência em execução", "rocket"),
    ]:
        if metricas[chave]["amostras"] < 2:
            continue
        vencedores = melhores[chave]
        if not vencedores:
            continue
        vencedor = vencedores[0]
        destaques.append(
            {
                "projeto_id": vencedor["id"],
                "projeto": vencedor["nome"],
                "codigo": vencedor["codigo"],
                "cor": vencedor["cor"],
                "titulo": titulo,
                "metrica": chave,
                "valor": vencedor["valor"],
                "detalhe": (
                    f"{metricas[chave]['rotulo']} de {vencedor['valor']} {metricas[chave]['unidade']} "
                    f"contra mediana de {metricas[chave]['mediana']} do conjunto."
                ),
                "icone": icone,
            }
        )

    return {
        "total_projetos": len(dados),
        "metricas": metricas,
        "projetos": sorted(dados, key=lambda d: -d["indice_geral"]),
        "melhores": melhores,
        "piores": piores,
        "destaques": destaques,
        "praticas": _praticas_observadas(dados, metricas),
        "premissas": [
            "Percentil de desempenho: 100 indica o melhor projeto do conjunto na métrica.",
            "Desvio de prazo é negativo para projetos concluídos antes do prazo e zero para os que "
            "ainda estão dentro do prazo.",
            "Densidades de riscos e issues são calculadas por mês de duração do projeto.",
        ],
    }


# ---------------------------------------------------------------------------
# 6. Auditoria de viés das recomendações de alocação
# ---------------------------------------------------------------------------
def _faixa_tempo_casa(usuario) -> str:
    """Faixa de tempo de casa, em anos completos desde a admissão."""
    if not usuario.data_admissao:
        return "Não informado"
    anos = (timezone.localdate() - usuario.data_admissao).days / 365.25
    if anos < 2:
        return "0-2 anos"
    if anos < 5:
        return "2-5 anos"
    if anos < 10:
        return "5-10 anos"
    return "10+ anos"


def _faixa_custo_hora(usuario) -> str:
    """Faixa de custo/hora do colaborador."""
    custo = float(usuario.custo_hora or 0)
    if custo <= 0:
        return "Não informado"
    if custo <= 50:
        return "Até R$ 50/h"
    if custo <= 100:
        return "R$ 50-100/h"
    if custo <= 150:
        return "R$ 100-150/h"
    return "Acima de R$ 150/h"


def _severidade_disparidade(disparidade: float) -> str:
    """Classifica a disparidade: até 15% OK, de 15% a 30% ATENCAO, acima de 30% CRITICO."""
    modulo = abs(disparidade)
    if modulo < LIMITE_DISPARIDADE_ATENCAO:
        return SeveridadeVies.OK
    if modulo <= LIMITE_DISPARIDADE_CRITICO:
        return SeveridadeVies.ATENCAO
    return SeveridadeVies.CRITICO


def _texto_vies(
    rotulo_dimensao: str, grupo: str, descricao: str, formato: str, valor: float, referencia: float,
    disparidade: float, severidade: str, posicao_media: float, tamanho: int,
) -> str:
    """Frase acionável em linguagem de negócio sobre o grupo auditado."""
    if formato == "percentual":
        valor_texto = f"{valor * 100:.0f}%"
        referencia_texto = f"{referencia * 100:.0f}%"
    else:
        valor_texto = f"{valor:.3f}"
        referencia_texto = f"{referencia:.3f}"

    if severidade == SeveridadeVies.OK:
        return (
            f"Sem disparidade relevante em {rotulo_dimensao.lower()} para {grupo}: {descricao} de "
            f"{valor_texto} contra {referencia_texto} da média geral."
        )

    direcao = "abaixo" if valor < referencia else "acima"
    texto = (
        f"Em {rotulo_dimensao.lower()}, o grupo {grupo} apresenta {descricao} de {valor_texto}, {direcao} "
        f"da média geral de {referencia_texto} (disparidade de {abs(disparidade) * 100:.0f}%)."
    )
    if posicao_media:
        texto += f" Nas recomendações recebidas, o grupo aparece em {posicao_media:.1f}º lugar em média no ranking."
    if formato == "percentual":
        texto += (
            " Revise os pesos do modo Performance ou incentive o modo Desenvolvimento para ampliar a "
            "participação deste grupo nas próximas recomendações."
        )
    else:
        texto += (
            " Revise a calibração do motor de alocação e registre a justificativa das decisões tomadas "
            "para este grupo."
        )
    if tamanho < MINIMO_AMOSTRA_CONFIAVEL:
        texto += (
            f" Amostra pequena ({tamanho} recomendação(ões)): confirme a leitura com mais dados antes de agir."
        )
    return texto


def auditoria_vies(periodo_dias: int = 180, salvar: bool = True) -> dict:
    """Audita a imparcialidade das recomendações de alocação (RNF-18, especificação §9.4).

    Compara grupos por área, localização, tempo de casa, faixa de custo/hora e perfil,
    medindo taxa de seleção, score médio recebido, taxa de override e posição média no
    ranking. A disparidade é relativa à média geral do período. Mede disparidade
    estatística — não é prova de discriminação — e exige revisão humana.
    """
    hoje = timezone.localdate()
    periodo_dias = max(1, min(int(periodo_dias or 180), 1825))
    inicio = hoje - timedelta(days=periodo_dias)

    recomendacoes = list(
        AllocationRecommendation.objects.filter(criado_em__date__gte=inicio)
        .select_related("user")
        .order_by("criado_em")
    )
    overrides = {
        (rec.task_id, rec.user_id)
        for rec in recomendacoes
        if rec.status == StatusRecomendacao.SUBSTITUIDA
    }
    overrides.update(
        Alocacao.objects.filter(criado_em__date__gte=inicio, override_manual=True)
        .exclude(user__isnull=True)
        .values_list("task_id", "user_id")
    )
    overrides_por_usuario: dict[int, int] = defaultdict(int)
    for _task_id, user_id in overrides:
        overrides_por_usuario[user_id] += 1

    total = len(recomendacoes)
    aceitas = sum(1 for rec in recomendacoes if rec.status == StatusRecomendacao.ACEITA)
    taxa_selecao_geral = aceitas / total if total else 0.0
    score_medio_geral = _media([float(rec.score) for rec in recomendacoes])
    taxa_override_geral = min(1.0, len(overrides) / total) if total else 0.0
    posicao_media_geral = _media([float(rec.posicao) for rec in recomendacoes])

    grupos: dict[tuple[str, str, str, str], dict] = {}
    for rec in recomendacoes:
        for chave_dim, rotulo_dim, metrica_dim, extrator in DIMENSOES_VIES:
            rotulo_grupo = extrator(rec.user) if extrator else _rotulo_grupo(rec.user, chave_dim)
            chave = (chave_dim, rotulo_dim, metrica_dim, rotulo_grupo)
            entrada = grupos.setdefault(chave, {"recs": [], "usuarios": set()})
            entrada["recs"].append(rec)
            entrada["usuarios"].add(rec.user_id)

    metricas = []
    registros = []
    for (chave_dim, rotulo_dim, metrica_dim, rotulo_grupo), entrada in sorted(grupos.items()):
        recebidas = entrada["recs"]
        tamanho = len(recebidas)
        pessoas = len(entrada["usuarios"])
        selecionadas = sum(1 for rec in recebidas if rec.status == StatusRecomendacao.ACEITA)
        taxa_selecao = selecionadas / tamanho if tamanho else 0.0
        score_medio = _media([float(rec.score) for rec in recebidas])
        overrides_grupo = sum(overrides_por_usuario.get(uid, 0) for uid in entrada["usuarios"])
        taxa_override = min(1.0, overrides_grupo / tamanho) if tamanho else 0.0
        posicao_media = _media([float(rec.posicao) for rec in recebidas])
        suficiente = tamanho >= MINIMO_AMOSTRA_CONFIAVEL

        candidatos = [
            (metrica_dim, taxa_selecao, taxa_selecao_geral, "taxa de seleção", "percentual"),
            ("SCORE_MEDIO", score_medio, score_medio_geral, "score médio recebido", "indice"),
            ("OVERRIDE", taxa_override, taxa_override_geral, "taxa de override do gestor", "percentual"),
        ]
        for metrica, valor_grupo, referencia, descricao, formato in candidatos:
            disparidade = (valor_grupo - referencia) / referencia if referencia > 0 else 0.0
            severidade = _severidade_disparidade(disparidade)
            recomendacao = _texto_vies(
                rotulo_dim, rotulo_grupo, descricao, formato, valor_grupo, referencia,
                disparidade, severidade, posicao_media, tamanho,
            )
            detalhes = {
                "dimensao": chave_dim,
                "metrica_base": "TAXA_SELECAO" if metrica.startswith("DISTRIBUICAO") else metrica,
                "taxa_selecao": round(taxa_selecao, 4),
                "score_medio": round(score_medio, 4),
                "taxa_override": round(taxa_override, 4),
                "posicao_media": round(posicao_media, 2),
                "recomendacoes_recebidas": tamanho,
                "pessoas_no_grupo": pessoas,
                "amostra_suficiente": suficiente,
                "overrides_registrados": overrides_grupo,
                "referencia_calculada": referencia > 0,
            }
            metricas.append(
                {
                    "dimensao": chave_dim,
                    "dimensao_rotulo": rotulo_dim,
                    "grupo": rotulo_grupo,
                    "metrica": metrica,
                    "metrica_rotulo": dict(MetricaVies.choices).get(metrica, metrica),
                    "tamanho_grupo": tamanho,
                    "pessoas_no_grupo": pessoas,
                    "valor_grupo": round(valor_grupo, 4),
                    "valor_referencia": round(referencia, 4),
                    "disparidade": round(disparidade, 4),
                    "disparidade_percentual": round(disparidade * 100, 1),
                    "severidade": severidade,
                    "severidade_rotulo": dict(SeveridadeVies.choices).get(severidade, severidade),
                    "taxa_selecao": round(taxa_selecao, 4),
                    "score_medio": round(score_medio, 4),
                    "taxa_override": round(taxa_override, 4),
                    "posicao_media": round(posicao_media, 2),
                    "amostra_suficiente": suficiente,
                    "recomendacao": recomendacao,
                    "detalhes": detalhes,
                }
            )
            registros.append(
                {
                    "periodo_inicio": inicio,
                    "periodo_fim": hoje,
                    "metrica": metrica,
                    "grupo": rotulo_grupo[:140],
                    "tamanho_grupo": tamanho,
                    "valor_grupo": round(valor_grupo, 4),
                    "valor_referencia": round(referencia, 4),
                    "disparidade": round(disparidade, 4),
                    "severidade": severidade,
                    "recomendacao": recomendacao,
                    "detalhes": detalhes,
                }
            )

    registros_salvos = 0
    if salvar and registros:
        with transaction.atomic():
            AuditoriaVies.objects.bulk_create([AuditoriaVies(**campos) for campos in registros])
            registros_salvos = len(registros)

    criticos = {(m["dimensao"], m["grupo"]) for m in metricas if m["severidade"] == SeveridadeVies.CRITICO}
    atencao = {(m["dimensao"], m["grupo"]) for m in metricas if m["severidade"] == SeveridadeVies.ATENCAO}
    grupos_avaliados = {(m["dimensao"], m["grupo"]) for m in metricas}
    grupos_criticos = sorted(
        [
            {
                "dimensao": m["dimensao"],
                "dimensao_rotulo": m["dimensao_rotulo"],
                "grupo": m["grupo"],
                "metrica": m["metrica"],
                "disparidade": m["disparidade"],
                "severidade": m["severidade"],
            }
            for m in metricas
            if m["severidade"] == SeveridadeVies.CRITICO
        ],
        key=lambda item: -abs(item["disparidade"]),
    )[:5]

    return {
        "periodo": {"inicio": inicio.isoformat(), "fim": hoje.isoformat(), "dias": periodo_dias},
        "total_recomendacoes": total,
        "total_aceitas": aceitas,
        "total_overrides": len(overrides),
        "metricas": metricas,
        "resumo": {
            "grupos_avaliados": len(grupos_avaliados),
            "registros_ok": sum(1 for m in metricas if m["severidade"] == SeveridadeVies.OK),
            "registros_atencao": sum(1 for m in metricas if m["severidade"] == SeveridadeVies.ATENCAO),
            "registros_criticos": sum(1 for m in metricas if m["severidade"] == SeveridadeVies.CRITICO),
            "grupos_criticos": len(criticos),
            "grupos_em_atencao": len(atencao),
            "dimensoes": [{"chave": dimensao[0], "rotulo": dimensao[1]} for dimensao in DIMENSOES_VIES],
            "taxa_selecao_geral": round(taxa_selecao_geral, 4),
            "score_medio_geral": round(score_medio_geral, 4),
            "taxa_override_geral": round(taxa_override_geral, 4),
            "posicao_media_geral": round(posicao_media_geral, 2),
            "amostra_suficiente": total >= MINIMO_AMOSTRA_CONFIAVEL,
            "minimo_amostra_confiavel": MINIMO_AMOSTRA_CONFIAVEL,
        },
        "grupos_criticos": grupos_criticos,
        "aviso_metodologico": AVISO_METODOLOGICO,
        "salvo": bool(salvar and registros_salvos),
        "registros_salvos": registros_salvos,
    }


def _rotulo_grupo(usuario, chave_dim: str) -> str:
    """Rótulo do grupo do colaborador na dimensão auditada."""
    if chave_dim == "TEMPO_DE_CASA":
        return _faixa_tempo_casa(usuario)
    if chave_dim == "CUSTO_HORA":
        return _faixa_custo_hora(usuario)
    return usuario.get_perfil_display()


# ---------------------------------------------------------------------------
# 7. Tendências do portfólio
# ---------------------------------------------------------------------------
def _classificar_tendencia(valores: list[float | None], maior_melhor: bool, limiar: float) -> dict:
    """Ajusta uma regressão sobre a série e classifica a direção da tendência."""
    pontos = [(indice, valor) for indice, valor in enumerate(valores) if valor is not None]
    if len(pontos) < 2:
        return {"tendencia": "ESTAVEL", "variacao": 0.0, "r2": 0.0, "variacao_total": 0.0, "amostras": len(pontos)}
    regressao = _regressao_linear([float(p[0]) for p in pontos], [float(p[1]) for p in pontos])
    inclinacao = regressao["inclinacao"]
    if abs(inclinacao) <= limiar:
        tendencia = "ESTAVEL"
    elif (inclinacao > 0) == maior_melhor:
        tendencia = "MELHORANDO"
    else:
        tendencia = "PIORANDO"
    return {
        "tendencia": tendencia,
        "variacao": round(inclinacao, 4),
        "r2": round(regressao["r2"], 3),
        "variacao_total": round(pontos[-1][1] - pontos[0][1], 4),
        "amostras": len(pontos),
    }


def tendencias_portfolio(projects, meses: int = 12) -> dict:
    """Séries mensais do portfólio com tendência por regressão linear (RF-34).

    Reconstrói, mês a mês, o progresso, CPI, SPI, o risco médio e a ocupação média da
    equipe a partir dos registros reais (datas de conclusão, lançamentos, riscos e
    alocações) e classifica cada série em MELHORANDO, ESTAVEL ou PIORANDO.
    """
    lista = list(projects)[:MAX_PROJETOS_ANALISE]
    meses = max(3, min(int(meses or 12), 36))
    hoje = timezone.localdate()
    meses_lista = _meses_ate(hoje, meses)

    acumulado: dict[str, list[list[float]]] = {chave: [[] for _ in meses_lista] for chave, *_ in SERIES_TENDENCIA}

    for projeto in lista:
        tarefas = [t for t in projeto.tarefas.all() if t.status != StatusTarefa.CANCELADA]
        if not tarefas:
            continue
        pesos = [float(t.esforco_estimado or 0) or 1.0 for t in tarefas]
        peso_total = sum(pesos) or 1.0
        inicio_projeto = projeto.data_inicio_real or projeto.data_inicio
        bac = float(bac_do_projeto(projeto))
        lancamentos = [
            (lancamento.data_competencia, float(lancamento.valor))
            for lancamento in projeto.lancamentos.filter(
                tipo=TipoLancamento.DESPESA,
                status__in=[StatusLancamento.REALIZADO, StatusLancamento.COMPROMETIDO],
            )
        ]
        riscos = list(projeto.riscos.all())

        for indice, mes in enumerate(meses_lista):
            _inicio_mes, fim_mes = _periodo_mes(mes)
            if inicio_projeto and inicio_projeto > fim_mes:
                continue
            realizado = sum(peso * _fracao_concluida(t, fim_mes, hoje) for t, peso in zip(tarefas, pesos)) / peso_total
            planejado = sum(peso * _fracao_planejada(t, fim_mes) for t, peso in zip(tarefas, pesos)) / peso_total
            ev = bac * realizado
            pv = bac * planejado
            ac = sum(valor for data_competencia, valor in lancamentos if data_competencia <= fim_mes)
            acumulado["progresso"][indice].append(realizado * 100)
            if ac > 0:
                acumulado["cpi"][indice].append(ev / ac)
            if pv > 0:
                acumulado["spi"][indice].append(ev / pv)
            if riscos:
                abertos = [
                    risco for risco in riscos
                    if risco.data_identificacao <= fim_mes
                    and risco.status != StatusRisco.ENCERRADO
                    and (risco.data_encerramento is None or risco.data_encerramento > fim_mes)
                ]
                acumulado["risco"][indice].append(
                    sum(risco.severidade for risco in abertos) / len(abertos) if abertos else 0.0
                )

    alocacoes = list(
        Alocacao.objects.filter(
            project_id__in=[p.id for p in lista], user__isnull=False, status__in=STATUS_ALOCACAO_VIGENTE
        ).only("user_id", "percentual", "data_inicio", "data_fim")
    )
    for indice, mes in enumerate(meses_lista):
        inicio_mes, fim_mes = _periodo_mes(mes)
        cargas: dict[int, int] = defaultdict(int)
        for alocacao in alocacoes:
            if alocacao.data_inicio <= fim_mes and alocacao.data_fim >= inicio_mes:
                cargas[alocacao.user_id] += alocacao.percentual
        if cargas:
            acumulado["ocupacao"][indice].append(min(150.0, sum(cargas.values()) / len(cargas)))

    series = []
    for chave, nome, cor, unidade, maior_melhor, limiar, interpretacao in SERIES_TENDENCIA:
        dados = [
            round(sum(valores) / len(valores), 3) if valores else None
            for valores in acumulado[chave]
        ]
        tendencia = _classificar_tendencia(dados, maior_melhor, limiar)
        series.append(
            {
                "chave": chave,
                "nome": nome,
                "cor": cor,
                "unidade": unidade,
                "maior_melhor": maior_melhor,
                "limiar_estabilidade": limiar,
                "interpretacao": interpretacao,
                "dados": dados,
                "tendencia": tendencia["tendencia"],
                "tendencia_rotulo": tendencia["tendencia"].capitalize(),
                "variacao": tendencia["variacao"],
                "variacao_total": tendencia["variacao_total"],
                "r2": tendencia["r2"],
                "amostras": tendencia["amostras"],
            }
        )

    resumo = {
        "melhorando": sum(1 for serie in series if serie["tendencia"] == "MELHORANDO"),
        "estaveis": sum(1 for serie in series if serie["tendencia"] == "ESTAVEL"),
        "piorando": sum(1 for serie in series if serie["tendencia"] == "PIORANDO"),
        "projetos_analisados": len(lista),
    }
    if resumo["piorando"]:
        resumo["leitura"] = (
            f"{resumo['piorando']} de {len(series)} séries do portfólio estão em piora no horizonte analisado."
        )
    else:
        resumo["leitura"] = "Nenhuma série do portfólio apresenta piora no horizonte analisado."

    return {
        "meses": [f"{mes:%Y-%m}" for mes in meses_lista],
        "rotulos": [_rotulo_mes(mes) for mes in meses_lista],
        "series": series,
        "resumo": resumo,
        "gerado_em": timezone.now().isoformat(),
    }


# ---------------------------------------------------------------------------
# 8. Previsão de demanda de pessoas
# ---------------------------------------------------------------------------
def previsao_demanda_pessoas(projects, meses: int = 12) -> dict:
    """Projeta a necessidade de pessoas (FTE) por mês e compara com a capacidade instalada.

    Soma as alocações futuras já planejadas e as tarefas não concluídas sem responsável,
    compara com a capacidade instalada da equipe envolvida e aponta os meses de pico.
    """
    lista = list(projects)[:MAX_PROJETOS_ANALISE]
    meses = max(3, min(int(meses or 12), 24))
    hoje = timezone.localdate()
    meses_lista = _meses_a_partir(hoje, meses)
    ids = [projeto.id for projeto in lista]

    alocacoes = list(
        Alocacao.objects.filter(
            project_id__in=ids, user__isnull=False, status__in=STATUS_ALOCACAO_VIGENTE
        ).select_related("user")
    )
    tarefas_abertas = list(Task.objects.filter(project_id__in=ids, status__in=STATUS_ABERTOS))
    sem_responsavel = [t for t in tarefas_abertas if not t.responsavel_id]

    ids_pessoas = {alocacao.user_id for alocacao in alocacoes}
    ids_pessoas.update(t.responsavel_id for t in tarefas_abertas if t.responsavel_id)
    pessoas = {u.id: u for u in User.objects.filter(id__in=ids_pessoas)}
    capacidade_instalada = round(
        sum(max(0.0, float(u.capacidade_semanal_horas or 0) / 40.0) for u in pessoas.values()), 2
    )
    horas_organizacao = User.objects.filter(ativo=True).aggregate(total=Sum("capacidade_semanal_horas"))["total"]
    capacidade_organizacional = round(float(horas_organizacao or 0) / 40.0, 2)

    serie = []
    for mes in meses_lista:
        inicio_mes, fim_mes = _periodo_mes(mes)
        uteis_mes = max(1, _dias_uteis(inicio_mes, fim_mes))
        horas_uteis = uteis_mes * HORAS_DIA
        demanda_alocacoes = (
            sum(a.percentual for a in alocacoes if a.data_inicio <= fim_mes and a.data_fim >= inicio_mes) / 100.0
        )
        demanda_tarefas = 0.0
        for tarefa in sem_responsavel:
            restante = max(0.0, 1 - tarefa.percentual_conclusao / 100.0)
            if restante <= 0:
                continue
            esforco = float(tarefa.esforco_estimado or 0)
            if tarefa.data_inicio and tarefa.data_fim:
                if tarefa.data_inicio > fim_mes or tarefa.data_fim < inicio_mes:
                    continue
                sobrepostos = _dias_uteis(max(inicio_mes, tarefa.data_inicio), min(fim_mes, tarefa.data_fim))
                if esforco > 0:
                    dias_tarefa = max(1, _dias_uteis(tarefa.data_inicio, tarefa.data_fim))
                    demanda_tarefas += esforco * restante * (sobrepostos / dias_tarefa) / horas_uteis
                else:
                    demanda_tarefas += min(1.0, sobrepostos / uteis_mes) * restante
            elif mes == meses_lista[0]:
                demanda_tarefas += (esforco * restante / horas_uteis) if esforco > 0 else restante
        demanda = round(demanda_alocacoes + demanda_tarefas, 2)
        gap = round(demanda - capacidade_instalada, 2)
        serie.append(
            {
                "mes": f"{mes:%Y-%m}",
                "rotulo": _rotulo_mes(mes),
                "demanda_fte": demanda,
                "demanda_alocacoes_fte": round(demanda_alocacoes, 2),
                "demanda_sem_responsavel_fte": round(demanda_tarefas, 2),
                "oferta_fte": capacidade_instalada,
                "disponivel_fte": round(max(0.0, capacidade_instalada - demanda), 2),
                "gap": gap,
                "situacao": "ESCASSEZ" if gap > 0.5 else "OCIOSIDADE" if gap < -1.0 else "EQUILIBRIO",
            }
        )

    escassez = [m for m in serie if m["situacao"] == "ESCASSEZ"]
    pico = max(serie, key=lambda m: m["demanda_fte"]) if serie else None
    recomendacoes = []
    if escassez:
        recomendacoes.append(
            f"Alocar ou contratar até {max(m['gap'] for m in escassez):.1f} FTE para cobrir "
            f"{len(escassez)} mês(es) em escassez, com pico em {pico['rotulo']}."
        )
    if sem_responsavel:
        recomendacoes.append(
            f"{len(sem_responsavel)} tarefa(s) em aberto sem responsável somam até "
            f"{max(m['demanda_sem_responsavel_fte'] for m in serie):.1f} FTE projetado; "
            "atribua responsáveis para reduzir o risco de atraso."
        )
    if not escassez and serie:
        recomendacoes.append("A capacidade instalada cobre a demanda projetada em todo o horizonte analisado.")

    return {
        "meses": [f"{mes:%Y-%m}" for mes in meses_lista],
        "rotulos": [_rotulo_mes(mes) for mes in meses_lista],
        "serie": serie,
        "resumo": {
            "capacidade_instalada_fte": capacidade_instalada,
            "capacidade_organizacional_fte": capacidade_organizacional,
            "media_demanda_fte": _media([m["demanda_fte"] for m in serie]),
            "media_gap_fte": _media([m["gap"] for m in serie]),
            "meses_escassez": len(escassez),
            "meses_ociosos": sum(1 for m in serie if m["situacao"] == "OCIOSIDADE"),
            "pico": pico,
            "meses_pico": sorted(serie, key=lambda m: -m["demanda_fte"])[:3],
            "tarefas_sem_responsavel": len(sem_responsavel),
            "recomendacoes": recomendacoes,
        },
        "premissas": [
            "Cada pessoa ativa equivale à capacidade semanal informada dividida por 40 horas.",
            "Tarefas sem esforço informado assumem jornada integral no período em que estão previstas.",
            "Tarefas sem data de início e fim são concentradas no primeiro mês da projeção.",
        ],
        "gerado_em": timezone.now().isoformat(),
    }

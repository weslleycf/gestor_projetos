"""Cálculos financeiros: EVM, curva S, fluxo de caixa e forecast."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum
from django.utils import timezone

from .models import Lancamento, StatusLancamento, TipoLancamento, Orcamento

ZERO = Decimal("0")


def _d(valor) -> Decimal:
    if valor is None:
        return ZERO
    if isinstance(valor, Decimal):
        return valor
    return Decimal(str(valor))


def _arredondar(valor, casas: int = 2) -> float:
    return float(_d(valor).quantize(Decimal("1." + "0" * casas), rounding=ROUND_HALF_UP))


def bac_do_projeto(project) -> Decimal:
    """Budget at Completion — soma do orçamento planejado."""
    total = project.orcamentos.aggregate(t=Sum("valor_planejado"))["t"]
    if total:
        return _d(total)
    return _d(project.orcamento)


def custo_real_do_projeto(project) -> Decimal:
    total = project.lancamentos.filter(
        tipo=TipoLancamento.DESPESA,
        status__in=[StatusLancamento.REALIZADO, StatusLancamento.COMPROMETIDO],
    ).aggregate(t=Sum("valor"))["t"]
    return _d(total)


def calcular_evm(project, data_referencia: date | None = None) -> dict:
    """Earned Value Management completo (RF-21)."""
    referencia = data_referencia or timezone.localdate()
    bac = bac_do_projeto(project)

    # AC — custo real incorrido até a referência
    ac = _d(
        project.lancamentos.filter(
            tipo=TipoLancamento.DESPESA,
            status__in=[StatusLancamento.REALIZADO, StatusLancamento.COMPROMETIDO],
            data_competencia__lte=referencia,
        ).aggregate(t=Sum("valor"))["t"]
    )

    # PV/EV ponderados pelo esforço das tarefas
    tarefas = list(project.tarefas.all())
    peso_total = sum(float(t.esforco_estimado or 0) or 1.0 for t in tarefas)
    pv = ev = ZERO
    for tarefa in tarefas:
        peso = (float(tarefa.esforco_estimado or 0) or 1.0) / peso_total if peso_total else 0
        fatia = bac * Decimal(str(peso))
        pv += fatia * Decimal(str(tarefa.progresso_planejado / 100.0))
        ev += fatia * Decimal(str(tarefa.percentual_conclusao / 100.0))

    if not tarefas:
        pv = bac * Decimal(str(project.progresso_planejado / 100.0))
        ev = bac * Decimal(str(project.percentual_conclusao / 100.0))

    cv = ev - ac
    sv = ev - pv
    cpi = (ev / ac) if ac > 0 else Decimal("1")
    spi = (ev / pv) if pv > 0 else Decimal("1")
    eac = (bac / cpi) if cpi > 0 else bac
    etc = eac - ac
    vac = bac - eac
    tcpi = ((bac - ev) / (bac - ac)) if (bac - ac) > 0 else Decimal("1")

    return {
        "data_referencia": referencia.isoformat(),
        "BAC": _arredondar(bac),
        "PV": _arredondar(pv),
        "EV": _arredondar(ev),
        "AC": _arredondar(ac),
        "CV": _arredondar(cv),
        "SV": _arredondar(sv),
        "CPI": _arredondar(cpi, 3),
        "SPI": _arredondar(spi, 3),
        "EAC": _arredondar(eac),
        "ETC": _arredondar(etc),
        "VAC": _arredondar(vac),
        "TCPI": _arredondar(tcpi, 3),
        "percentual_consumido": _arredondar((ac / bac * 100) if bac > 0 else ZERO, 1),
        "percentual_agregado": _arredondar((ev / bac * 100) if bac > 0 else ZERO, 1),
        "situacao_custo": "VERDE" if cpi >= Decimal("0.95") else "AMARELO" if cpi >= Decimal("0.85") else "VERMELHO",
        "situacao_prazo": "VERDE" if spi >= Decimal("0.95") else "AMARELO" if spi >= Decimal("0.85") else "VERMELHO",
        "projecao_final": _arredondar(eac),
        "orcamento_original": _arredondar(bac),
    }


def curva_s(project, data_referencia: date | None = None, pontos: int = 26) -> dict:
    """Série temporal PV × EV × AC para o gráfico de curva S interativo."""
    referencia = data_referencia or timezone.localdate()
    tarefas = list(project.tarefas.all())
    bac = bac_do_projeto(project)

    inicio = project.data_inicio or min((t.data_inicio for t in tarefas if t.data_inicio), default=None)
    fim = project.data_fim or max((t.data_fim for t in tarefas if t.data_fim), default=None)
    if not inicio or not fim:
        return {"pontos": [], "resumo": calcular_evm(project, referencia)}
    if fim <= inicio:
        fim = inicio + timedelta(days=30)

    lancamentos = list(project.lancamentos.filter(tipo=TipoLancamento.DESPESA))
    peso_total = sum(float(t.esforco_estimado or 0) or 1.0 for t in tarefas) or 1.0
    passos = max(2, min(pontos, 60))
    intervalo = max(1, (fim - inicio).days // passos)

    serie = []
    cursor = inicio
    while cursor <= fim:
        pv = ev = ac = ZERO
        for tarefa in tarefas:
            peso = (float(tarefa.esforco_estimado or 0) or 1.0) / peso_total
            fatia = bac * Decimal(str(peso))
            if tarefa.data_inicio and tarefa.data_fim and tarefa.data_fim > tarefa.data_inicio:
                decorrido = (cursor - tarefa.data_inicio).days
                total_dias = (tarefa.data_fim - tarefa.data_inicio).days
                fracao = max(0.0, min(1.0, decorrido / total_dias))
                pv += fatia * Decimal(str(fracao))
                if cursor >= (tarefa.data_fim_real or tarefa.data_fim):
                    ev += fatia
                elif tarefa.data_inicio_real and cursor >= tarefa.data_inicio_real:
                    ev += fatia * Decimal(str(tarefa.percentual_conclusao / 100.0))
            elif tarefa.data_fim and cursor >= tarefa.data_fim:
                pv += fatia
                ev += fatia
        for lancamento in lancamentos:
            if lancamento.data_competencia <= cursor:
                ac += _d(lancamento.valor)
        serie.append(
            {
                "data": cursor.isoformat(),
                "rotulo": f"{cursor:%d/%m/%y}",
                "PV": _arredondar(pv),
                "EV": _arredondar(ev),
                "AC": _arredondar(ac),
                "desvio_custo": _arredondar(ev - ac),
                "desvio_prazo": _arredondar(ev - pv),
            }
        )
        cursor += timedelta(days=intervalo)

    resumo = calcular_evm(project, referencia)
    # Projeção EAC a partir do ponto atual
    for ponto in serie:
        if ponto["data"] <= referencia.isoformat():
            ponto["EAC_projetado"] = resumo["EAC"]
    return {"pontos": serie, "resumo": resumo}


def consumo_por_categoria(project) -> list[dict]:
    """Orçado × realizado por categoria (RF-20)."""
    itens = []
    for orcamento in project.orcamentos.all():
        real = project.lancamentos.filter(
            tipo=TipoLancamento.DESPESA,
            status__in=[StatusLancamento.REALIZADO, StatusLancamento.COMPROMETIDO],
            orcamento=orcamento,
        ).aggregate(t=Sum("valor"))["t"]
        real = _d(real)
        itens.append(
            {
                "id": orcamento.id,
                "categoria": orcamento.categoria,
                "tipo": orcamento.tipo,
                "cor": orcamento.cor,
                "icone": orcamento.icone,
                "planejado": _arredondar(orcamento.valor_planejado),
                "realizado": _arredondar(real),
                "saldo": _arredondar(_d(orcamento.valor_planejado) - real),
                "consumo": _arredondar((real / _d(orcamento.valor_planejado) * 100) if orcamento.valor_planejado else ZERO, 1),
                "situacao": (
                    "VERDE" if _d(orcamento.valor_planejado) and real <= _d(orcamento.valor_planejado) * Decimal("0.9")
                    else "AMARELO" if real <= _d(orcamento.valor_planejado)
                    else "VERMELHO"
                ),
            }
        )
    return itens


def fluxo_caixa(project, meses: int = 12) -> dict:
    """Realizado + projetado por mês (RF-22)."""
    hoje = timezone.localdate()
    inicio = hoje.replace(day=1) - timedelta(days=30 * 3)
    buckets: dict[str, dict] = {}
    for i in range(meses + 3):
        mes = (inicio + timedelta(days=31 * i)).replace(day=1)
        chave = f"{mes:%Y-%m}"
        buckets[chave] = {"periodo": chave, "entradas": 0.0, "saidas": 0.0, "previsto_entradas": 0.0, "previsto_saidas": 0.0}

    for lancamento in project.lancamentos.all():
        chave = f"{lancamento.data_competencia:%Y-%m}"
        if chave not in buckets:
            buckets[chave] = {"periodo": chave, "entradas": 0.0, "saidas": 0.0, "previsto_entradas": 0.0, "previsto_saidas": 0.0}
        bucket = buckets[chave]
        chave_tipo = "entradas" if lancamento.tipo == TipoLancamento.RECEITA else "saidas"
        if lancamento.status == StatusLancamento.REALIZADO:
            bucket[chave_tipo] += float(lancamento.valor)
        else:
            bucket["previsto_" + chave_tipo] += float(lancamento.valor)

    # Projeção: distribui o saldo do orçamento nos meses restantes do projeto
    restante = float(bac_do_projeto(project)) - float(custo_real_do_projeto(project))
    if restante > 0 and project.data_fim and project.data_fim > hoje:
        meses_restantes = max(1, ((project.data_fim - hoje).days // 30) + 1)
        por_mes = restante / meses_restantes
        for i in range(meses_restantes):
            mes = (hoje.replace(day=1) + timedelta(days=31 * i))
            chave = f"{mes:%Y-%m}"
            if chave in buckets:
                buckets[chave]["previsto_saidas"] += por_mes

    ordenado = sorted(buckets.values(), key=lambda b: b["periodo"])
    saldo_acumulado = 0.0
    for bucket in ordenado:
        bucket["saldo"] = round(bucket["entradas"] - bucket["saidas"], 2)
        bucket["saldo_previsto"] = round(
            bucket["entradas"] + bucket["previsto_entradas"] - bucket["saidas"] - bucket["previsto_saidas"], 2
        )
        saldo_acumulado += bucket["saldo_previsto"]
        bucket["saldo_acumulado"] = round(saldo_acumulado, 2)
        bucket["rotulo"] = bucket["periodo"]
    return {"meses": ordenado, "saldo_final_projetado": round(saldo_acumulado, 2)}


def resumo_financeiro_portfolio(projects) -> dict:
    """Consolidação para o dashboard executivo."""
    planejado = realizado = receita = 0.0
    for project in projects:
        planejado += float(bac_do_projeto(project))
        realizado += float(custo_real_do_projeto(project))
        receita += float(project.receita_prevista or 0)
    cpis, spis = [], []
    for project in projects:
        evm = calcular_evm(project)
        cpis.append(evm["CPI"])
        spis.append(evm["SPI"])
    return {
        "orcamento_planejado": round(planejado, 2),
        "custo_realizado": round(realizado, 2),
        "saldo": round(planejado - realizado, 2),
        "receita_prevista": round(receita, 2),
        "roi_estimado": round((receita - planejado) / planejado * 100, 2) if planejado else 0.0,
        "consumo_percentual": round(realizado / planejado * 100, 2) if planejado else 0.0,
        "cpi_medio": round(sum(cpis) / len(cpis), 3) if cpis else 1.0,
        "spi_medio": round(sum(spis) / len(spis), 3) if spis else 1.0,
    }

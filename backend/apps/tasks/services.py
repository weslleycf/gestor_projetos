"""Serviços de cronograma: caminho crítico (CPM) e catálogo de widgets."""
from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from .models import STATUS_ABERTOS, Task, TaskDependency, TipoDependencia


def _duracao(tarefa: Task) -> int:
    if tarefa.data_inicio and tarefa.data_fim:
        return max(1, (tarefa.data_fim - tarefa.data_inicio).days + 1)
    return 1


def calcular_caminho_critico(project_id: int) -> dict:
    """CPM simplificado: forward/backward pass para folga e caminho crítico (RF-03/UC-02)."""
    tarefas = {t.id: t for t in Task.objects.filter(project_id=project_id)}
    if not tarefas:
        return {"criticas": [], "folgas": {}, "duracao_projeto": 0}

    deps = list(TaskDependency.objects.filter(predecessor__project_id=project_id).select_related("predecessor", "successor"))
    sucessoras = defaultdict(list)
    predecessoras = defaultdict(list)
    for d in deps:
        if d.predecessor_id in tarefas and d.successor_id in tarefas:
            sucessoras[d.predecessor_id].append(d)
            predecessoras[d.successor_id].append(d)

    ordem = _ordenacao_topologica(tarefas, sucessoras, predecessoras)
    if ordem is None:
        return {"criticas": [], "folgas": {}, "duracao_projeto": 0, "erro": "Ciclo detectado nas dependências."}

    # Forward pass — início mais cedo
    inicio_cedo: dict[int, int] = {}
    fim_cedo: dict[int, int] = {}
    for tid in ordem:
        tarefa = tarefas[tid]
        base = 0
        for dep in predecessoras[tid]:
            p = dep.predecessor_id
            if p not in fim_cedo:
                continue
            if dep.tipo == TipoDependencia.FS:
                base = max(base, fim_cedo[p] + 1 + dep.lag)
            elif dep.tipo == TipoDependencia.SS:
                base = max(base, inicio_cedo[p] + dep.lag)
            elif dep.tipo == TipoDependencia.FF:
                base = max(base, fim_cedo[p] + dep.lag - _duracao(tarefa) + 1)
            elif dep.tipo == TipoDependencia.SF:
                base = max(base, inicio_cedo[p] + dep.lag - _duracao(tarefa) + 1)
        inicio_cedo[tid] = base
        fim_cedo[tid] = base + _duracao(tarefa) - 1

    duracao_projeto = max(fim_cedo.values()) if fim_cedo else 0

    # Backward pass — início mais tarde
    inicio_tarde: dict[int, int] = {}
    fim_tarde: dict[int, int] = {}
    for tid in reversed(ordem):
        tarefa = tarefas[tid]
        limite = duracao_projeto - 1
        for dep in sucessoras[tid]:
            s = dep.successor_id
            if s not in inicio_tarde:
                continue
            if dep.tipo == TipoDependencia.FS:
                limite = min(limite, inicio_tarde[s] - 1 - dep.lag)
            elif dep.tipo == TipoDependencia.SS:
                limite = min(limite, inicio_tarde[s] - dep.lag + _duracao(tarefa) - 1)
            elif dep.tipo == TipoDependencia.FF:
                limite = min(limite, fim_tarde[s] - dep.lag)
            elif dep.tipo == TipoDependencia.SF:
                limite = min(limite, fim_tarde[s] - dep.lag + _duracao(tarefa) - 1)
        fim_tarde[tid] = limite
        inicio_tarde[tid] = limite - _duracao(tarefa) + 1

    folgas = {tid: inicio_tarde[tid] - inicio_cedo[tid] for tid in tarefas}
    criticas = [tid for tid, folga in folgas.items() if folga <= 0]

    with transaction.atomic():
        Task.objects.filter(project_id=project_id).update(critica=False)
        for tid, folga in folgas.items():
            Task.objects.filter(pk=tid).update(folga_dias=folga, critica=tid in criticas)

    return {
        "criticas": criticas,
        "folgas": folgas,
        "duracao_projeto": duracao_projeto,
        "caminho": _montar_caminho(criticas, sucessoras),
    }


def _ordenacao_topologica(tarefas, sucessoras, predecessoras):
    grau = {tid: len([d for d in predecessoras[tid] if d.predecessor_id in tarefas]) for tid in tarefas}
    fila = [tid for tid, g in grau.items() if g == 0]
    ordem = []
    while fila:
        atual = fila.pop(0)
        ordem.append(atual)
        for dep in sucessoras[atual]:
            s = dep.successor_id
            if s in grau:
                grau[s] -= 1
                if grau[s] == 0:
                    fila.append(s)
    return ordem if len(ordem) == len(tarefas) else None


def _montar_caminho(criticas, sucessoras) -> list[int]:
    if not criticas:
        return []
    conjunto = set(criticas)
    com_predecessora_critica = set()
    for tid in criticas:
        for dep in sucessoras.get(tid, []):
            if dep.successor_id in conjunto:
                com_predecessora_critica.add(dep.successor_id)
    inicios = [tid for tid in criticas if tid not in com_predecessora_critica]
    if not inicios:
        return sorted(criticas)
    caminho, atual = [], inicios[0]
    visitados = set()
    while atual is not None and atual not in visitados:
        visitados.add(atual)
        caminho.append(atual)
        proximos = [d.successor_id for d in sucessoras.get(atual, []) if d.successor_id in conjunto]
        atual = proximos[0] if proximos else None
    return caminho


def reagendar_por_dependencias(task: Task) -> list[dict]:
    """Empurra sucessoras quando a predecessora é atrasada (arrastar barra no Gantt)."""
    alteracoes = []
    fila = [task]
    vistos = set()
    while fila:
        atual = fila.pop(0)
        if atual.id in vistos:
            continue
        vistos.add(atual.id)
        if not atual.data_fim:
            continue
        for dep in TaskDependency.objects.filter(predecessor=atual).select_related("successor"):
            sucessora = dep.successor
            if dep.tipo != TipoDependencia.FS:
                continue
            minimo = atual.data_fim + timedelta(days=1 + dep.lag)
            if sucessora.data_inicio and sucessora.data_inicio < minimo:
                delta = (minimo - sucessora.data_inicio).days
                sucessora.data_inicio = minimo
                if sucessora.data_fim:
                    sucessora.data_fim = sucessora.data_fim + timedelta(days=delta)
                sucessora.save(update_fields=["data_inicio", "data_fim", "atualizado_em"])
                alteracoes.append(
                    {"id": sucessora.id, "nome": sucessora.nome, "deslocamento_dias": delta}
                )
                fila.append(sucessora)
    if alteracoes:
        calcular_caminho_critico(task.project_id)
    return alteracoes


def cruzar_baseline(project) -> dict:
    """Curva de planejado × realizado por semana (burndown/burnup)."""
    hoje = timezone.localdate()
    tarefas = list(project.tarefas.all())
    if not tarefas:
        return {"pontos": []}
    inicios = [t.data_inicio for t in tarefas if t.data_inicio] or [hoje]
    inicio = min(inicios)
    fim = max([t.data_fim for t in tarefas if t.data_fim] or [hoje])
    total = sum(float(t.esforco_estimado or 0) or 1.0 for t in tarefas)
    pontos = []
    cursor = inicio
    while cursor <= fim:
        planejado = sum(
            (float(t.esforco_estimado or 0) or 1.0)
            for t in tarefas
            if t.data_fim and t.data_fim <= cursor
        )
        realizado = sum(
            (float(t.esforco_estimado or 0) or 1.0) * (t.percentual_conclusao / 100.0)
            for t in tarefas
            if t.data_inicio and t.data_inicio <= cursor
        )
        ideal = total * min(1.0, max(0.0, (cursor - inicio).days / max(1, (fim - inicio).days)))
        pontos.append(
            {
                "data": cursor.isoformat(),
                "planejado": round(planejado, 1),
                "realizado": round(realizado, 1),
                "ideal": round(ideal, 1),
                "restante": round(max(0.0, total - realizado), 1),
                "restante_ideal": round(max(0.0, total - ideal), 1),
            }
        )
        cursor += timedelta(days=7)
    return {"pontos": pontos, "total_horas": round(total, 1)}


def widgets_disponiveis() -> list[dict]:
    """Catálogo de widgets arrastáveis para relatórios customizáveis (RF-30)."""
    return [
        {"id": "kpi-projetos-status", "nome": "Projetos por status", "tipo": "donut", "categoria": "Portfólio", "icone": "pie-chart", "tamanho": "md"},
        {"id": "kpi-saude", "nome": "Saúde do portfólio", "tipo": "donut", "categoria": "Portfólio", "icone": "activity", "tamanho": "sm"},
        {"id": "kpi-orcamento", "nome": "Orçado × Realizado", "tipo": "barras", "categoria": "Financeiro", "icone": "bar-chart-3", "tamanho": "lg"},
        {"id": "kpi-cpi-spi", "nome": "CPI / SPI", "tipo": "gauge", "categoria": "Financeiro", "icone": "gauge", "tamanho": "sm"},
        {"id": "curva-s", "nome": "Curva S (EVM)", "tipo": "linha", "categoria": "Financeiro", "icone": "trending-up", "tamanho": "lg"},
        {"id": "gantt-portfolio", "nome": "Timeline do portfólio", "tipo": "gantt", "categoria": "Cronograma", "icone": "gantt-chart", "tamanho": "full"},
        {"id": "burndown", "nome": "Burndown", "tipo": "area", "categoria": "Cronograma", "icone": "trending-down", "tamanho": "md"},
        {"id": "matriz-riscos", "nome": "Matriz de riscos", "tipo": "matriz", "categoria": "Riscos", "icone": "shield-alert", "tamanho": "md"},
        {"id": "heatmap-capacidade", "nome": "Heatmap de capacidade", "tipo": "heatmap", "categoria": "Capacidades", "icone": "grid-3x3", "tamanho": "lg"},
        {"id": "matriz-skills", "nome": "Matriz de skills", "tipo": "heatmap", "categoria": "Capacidades", "icone": "table", "tamanho": "lg"},
        {"id": "gap-analysis", "nome": "Gap de capacidades", "tipo": "barras", "categoria": "Capacidades", "icone": "target", "tamanho": "md"},
        {"id": "bus-factor", "nome": "Skills críticas (bus factor)", "tipo": "grafo", "categoria": "Capacidades", "icone": "share-2", "tamanho": "md"},
        {"id": "projetos-atrasados", "nome": "Projetos atrasados", "tipo": "lista", "categoria": "Portfólio", "icone": "alarm-clock", "tamanho": "md"},
        {"id": "alocacao-ocupacao", "nome": "Ocupação de recursos", "tipo": "heatmap", "categoria": "Recursos", "icone": "users", "tamanho": "lg"},
        {"id": "aderencia-alocacao", "nome": "Aderência das recomendações", "tipo": "gauge", "categoria": "Alocação", "icone": "crosshair", "tamanho": "sm"},
        {"id": "timeline-atividades", "nome": "Atividades recentes", "tipo": "timeline", "categoria": "Colaboração", "icone": "history", "tamanho": "md"},
    ]

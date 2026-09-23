"""Serviços de recursos: conflitos de alocação, ocupação e capacidade."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from apps.core.models import User

from .models import Alocacao, StatusAlocacao, Timesheet


def _semanas(inicio: date, fim: date) -> list[date]:
    cursor = inicio - timedelta(days=inicio.weekday())
    semanas = []
    while cursor <= fim:
        semanas.append(cursor)
        cursor += timedelta(days=7)
    return semanas


def detectar_conflitos(user_id: int | None = None, project_id: int | None = None) -> list[dict]:
    """Sobrealocação > 100% por semana — alertas vermelhos (RF-15)."""
    qs = Alocacao.objects.filter(
        user__isnull=False, status__in=[StatusAlocacao.PROPOSTA, StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO]
    ).select_related("user", "task", "project")
    if user_id:
        qs = qs.filter(user_id=user_id)
    if project_id:
        qs = qs.filter(project_id=project_id)

    por_usuario: dict[int, list[Alocacao]] = defaultdict(list)
    for alocacao in qs:
        por_usuario[alocacao.user_id].append(alocacao)

    conflitos = []
    for uid, alocacoes in por_usuario.items():
        usuario = alocacoes[0].user
        if not alocacoes:
            continue
        inicio = min(a.data_inicio for a in alocacoes)
        fim = max(a.data_fim for a in alocacoes)
        for semana in _semanas(inicio, fim):
            fim_semana = semana + timedelta(days=6)
            vigentes = [a for a in alocacoes if a.data_inicio <= fim_semana and a.data_fim >= semana]
            total = sum(a.percentual for a in vigentes)
            if total > 100:
                conflitos.append(
                    {
                        "user_id": uid,
                        "user_nome": usuario.nome,
                        "user_cor": usuario.cor,
                        "semana": semana.isoformat(),
                        "total_percentual": total,
                        "excesso": total - 100,
                        "severidade": "CRITICO" if total >= 130 else "ALERTA",
                        "alocacoes": [
                            {
                                "id": a.id,
                                "percentual": a.percentual,
                                "projeto": a.project.nome,
                                "tarefa": a.task.nome if a.task_id else "",
                                "periodo": f"{a.data_inicio:%d/%m} – {a.data_fim:%d/%m}",
                            }
                            for a in vigentes
                        ],
                    }
                )
    return conflitos


def ocupacao_por_semana(user_id: int, semanas: int = 12, referencia: date | None = None) -> list[dict]:
    """Série de ocupação semanal para o heatmap de capacidade."""
    hoje = referencia or timezone.localdate()
    inicio = hoje - timedelta(days=hoje.weekday())
    usuario = User.objects.filter(pk=user_id).first()
    if usuario is None:
        return []
    alocacoes = list(
        Alocacao.objects.filter(user_id=user_id, status__in=[StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO])
    )
    serie = []
    for i in range(semanas):
        semana = inicio + timedelta(weeks=i)
        fim_semana = semana + timedelta(days=6)
        carga = sum(a.percentual for a in alocacoes if a.data_inicio <= fim_semana and a.data_fim >= semana)
        serie.append(
            {
                "semana": semana.isoformat(),
                "rotulo": f"{semana:%d/%m}",
                "ocupacao": carga,
                "disponivel": max(0, 100 - carga),
                "situacao": "SUPERALOCADO" if carga > 100 else "OCUPADO" if carga >= 85 else "DISPONIVEL" if carga > 0 else "OCIOSO",
            }
        )
    return serie


def disponibilidade_no_periodo(user_id: int, inicio: date, fim: date) -> float:
    """Percentual livre do colaborador no período (base do motor de matching)."""
    alocacoes = Alocacao.objects.filter(
        user_id=user_id,
        status__in=[StatusAlocacao.PROPOSTA, StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO],
        data_inicio__lte=fim,
        data_fim__gte=inicio,
    )
    if not alocacoes.exists():
        return 100.0
    total = 0
    dias = (fim - inicio).days + 1
    for dia_offset in range(0, dias, 7):
        semana_ini = inicio + timedelta(days=dia_offset)
        semana_fim = min(fim, semana_ini + timedelta(days=6))
        carga = sum(a.percentual for a in alocacoes if a.data_inicio <= semana_fim and a.data_fim >= semana_ini)
        total += carga
    media = total / max(1, len(range(0, dias, 7)))
    return round(max(0.0, 100.0 - media), 2)


def horas_apontadas(project_id: int | None = None, user_id: int | None = None, inicio=None, fim=None) -> Decimal:
    qs = Timesheet.objects.all()
    if project_id:
        qs = qs.filter(project_id=project_id)
    if user_id:
        qs = qs.filter(user_id=user_id)
    if inicio:
        qs = qs.filter(data__gte=inicio)
    if fim:
        qs = qs.filter(data__lte=fim)
    return qs.aggregate(total=Sum("horas"))["total"] or Decimal("0")


def mapa_ocupacao_equipe(inicio=None, fim=None) -> dict:
    """Heatmap colaboradores × semanas (RF-14/RF-17)."""
    hoje = timezone.localdate()
    inicio = inicio or (hoje - timedelta(days=hoje.weekday()))
    fim = fim or (inicio + timedelta(weeks=11))
    usuarios = list(User.objects.filter(ativo=True).order_by("nome"))
    alocacoes = list(
        Alocacao.objects.filter(
            status__in=[StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO],
            data_inicio__lte=fim,
            data_fim__gte=inicio,
        ).select_related("project")
    )
    semanas = _semanas(inicio, fim)
    linhas = []
    for usuario in usuarios:
        do_usuario = [a for a in alocacoes if a.user_id == usuario.id]
        celulas = []
        for semana in semanas:
            fim_semana = semana + timedelta(days=6)
            vigentes = [a for a in do_usuario if a.data_inicio <= fim_semana and a.data_fim >= semana]
            carga = sum(a.percentual for a in vigentes)
            celulas.append(
                {
                    "semana": semana.isoformat(),
                    "valor": carga,
                    "projetos": sorted({a.project.nome for a in vigentes}),
                }
            )
        if do_usuario or any(c["valor"] for c in celulas):
            linhas.append(
                {
                    "user_id": usuario.id,
                    "nome": usuario.nome,
                    "cor": usuario.cor,
                    "iniciais": usuario.iniciais,
                    "area": usuario.area,
                    "celulas": celulas,
                    "media": round(sum(c["valor"] for c in celulas) / max(1, len(celulas)), 1),
                }
            )
    return {
        "semanas": [{"semana": s.isoformat(), "rotulo": f"{s:%d/%m}"} for s in semanas],
        "linhas": linhas,
    }

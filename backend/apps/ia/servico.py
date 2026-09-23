"""Orquestração das conversas com o assistente."""
from __future__ import annotations

import time

from django.db.models import Q
from django.utils import timezone

from .models import ConversaIA, MensagemIA
from .provedores import responder


def obter_ou_criar_conversa(usuario, conversa_id=None, primeira_mensagem: str = "") -> ConversaIA:
    if conversa_id:
        existente = ConversaIA.objects.filter(pk=conversa_id, user=usuario).first()
        if existente:
            return existente
    titulo = (primeira_mensagem or "Nova conversa").strip()[:80]
    return ConversaIA.objects.create(user=usuario, titulo=titulo or "Nova conversa")


def historico_para_provedor(conversa: ConversaIA) -> list[dict]:
    """Últimas falas no formato esperado pelos provedores externos."""
    mensagens = list(conversa.mensagens.order_by("-criado_em")[:8])
    mensagens.reverse()
    return [
        {"role": "assistant" if m.papel == MensagemIA.Papel.ASSISTENTE else "user", "content": m.texto}
        for m in mensagens
    ]


def conversar(usuario, pergunta: str, conversa_id=None) -> dict:
    """Responde uma pergunta e grava a conversa."""
    inicio = time.monotonic()
    conversa = obter_ou_criar_conversa(usuario, conversa_id, pergunta)

    MensagemIA.objects.create(conversa=conversa, papel=MensagemIA.Papel.USUARIO, texto=pergunta)

    historico = historico_para_provedor(conversa)[:-1]
    texto, usadas, fontes, provedor, modelo = responder(pergunta, usuario, historico)

    duracao = int((time.monotonic() - inicio) * 1000)
    MensagemIA.objects.create(
        conversa=conversa,
        papel=MensagemIA.Papel.ASSISTENTE,
        texto=texto,
        ferramentas=usadas,
        fontes=fontes,
        provedor=provedor,
        modelo=modelo,
        duracao_ms=duracao,
    )
    conversa.save(update_fields=["atualizado_em"])

    return {
        "conversa": conversa.id,
        "titulo": conversa.titulo,
        "resposta": texto,
        "ferramentas": usadas,
        "fontes": fontes,
        "sugestoes": sugestoes_para(usuario, pergunta),
        "provedor": provedor,
        "modelo": modelo,
        "duracao_ms": duracao,
    }


SUGESTOES_BASE = [
    "Quais projetos estão atrasados?",
    "Quais riscos são críticos agora?",
    "Quem está sobrecarregado?",
    "Qual o saldo financeiro dos últimos 6 meses?",
    "Quais capacidades têm bus factor crítico?",
    "Como faço para registrar um risco?",
]

SUGESTOES_POR_PERMISSAO = [
    ("financeiro.ver", "Quais projetos consumiram mais orçamento?"),
    ("alocacao.ver", "Quem pode assumir a capacidade Python?"),
    ("dashboard.ver", "Qual projeto tem maior risco de atrasar?"),
    ("risco.ver", "Quantas issues estão abertas?"),
    ("capacidade.ver", "Onde estão as maiores lacunas de capacidade?"),
    ("projeto.ver", "Quais marcos vencem nos próximos 30 dias?"),
]


def sugestoes_para(usuario, pergunta: str = "") -> list[str]:
    """Perguntas de acompanhamento adequadas ao perfil."""
    from apps.core.permissions import tem_permissao

    sugestoes = [s for s in SUGESTOES_BASE[:3]]
    for permissao, texto in SUGESTOES_POR_PERMISSAO:
        if tem_permissao(usuario, permissao):
            sugestoes.append(texto)
        if len(sugestoes) >= 5:
            break
    return sugestoes[:5]


def estatisticas(usuario=None) -> dict:
    consulta = MensagemIA.objects.filter(papel=MensagemIA.Papel.ASSISTENTE)
    if usuario is not None:
        consulta = consulta.filter(conversa__user=usuario)
    avaliadas = consulta.exclude(util__isnull=True)
    positivas = avaliadas.filter(util=True).count()
    total_avaliadas = avaliadas.count()
    mais_usadas: dict[str, int] = {}
    for mensagem in consulta.only("ferramentas")[:500]:
        for f in mensagem.ferramentas or []:
            nome = f.get("rotulo") or f.get("nome") or "?"
            mais_usadas[nome] = mais_usadas.get(nome, 0) + 1
    ordenadas = sorted(mais_usadas.items(), key=lambda par: -par[1])[:8]
    return {
        "conversas": ConversaIA.objects.filter(user=usuario).count() if usuario else ConversaIA.objects.count(),
        "respostas": consulta.count(),
        "avaliadas": total_avaliadas,
        "percentual_util": round(positivas / total_avaliadas * 100, 1) if total_avaliadas else 0.0,
        "consultas_mais_usadas": [{"rotulo": r, "total": t} for r, t in ordenadas],
    }

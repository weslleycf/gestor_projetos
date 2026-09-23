"""Serviços transversais: auditoria, notificações e timeline de atividades."""
from __future__ import annotations

import decimal
import uuid as _uuid

from django.contrib.contenttypes.models import ContentType

from .middleware import ip_atual, user_agent_atual, usuario_atual
from .models import Atividade, AuditLog, NivelNotificacao, Notificacao


def _serializar(instancia) -> dict:
    if instancia is None:
        return {}
    dados = {}
    for campo in instancia._meta.concrete_fields:
        valor = getattr(instancia, campo.attname, None)
        if hasattr(valor, "isoformat"):
            valor = valor.isoformat()
        elif isinstance(valor, decimal.Decimal):
            valor = float(valor)
        elif isinstance(valor, _uuid.UUID):
            valor = str(valor)
        if isinstance(valor, (str, int, float, bool, type(None), list, dict)):
            dados[campo.name] = valor
        else:
            dados[campo.name] = str(valor)
    return dados


def registrar_auditoria(
    *,
    entidade: str,
    acao: str,
    instancia=None,
    entidade_id: str | int | None = None,
    anteriores: dict | None = None,
    novos: dict | None = None,
    user=None,
    justificativa: str = "",
) -> AuditLog:
    """Grava um evento imutável na trilha de auditoria (RNF-16, §10.5)."""
    usuario = user if user is not None else usuario_atual()
    if usuario is not None and not getattr(usuario, "is_authenticated", False):
        usuario = None
    if instancia is not None and entidade_id is None:
        entidade_id = instancia.pk
    if instancia is not None and novos is None:
        novos = _serializar(instancia)
    return AuditLog.objects.create(
        user=usuario,
        user_nome=getattr(usuario, "nome", "") or "sistema",
        entidade=entidade,
        entidade_id=str(entidade_id or ""),
        acao=acao,
        valores_anteriores=anteriores or {},
        valores_novos=novos or {},
        justificativa=justificativa,
        ip=ip_atual(),
        user_agent=user_agent_atual(),
    )


def registrar_atividade(
    *,
    verbo: str,
    entidade: str,
    entidade_id: str | int | None = None,
    entidade_nome: str = "",
    projeto_id: int | None = None,
    user=None,
    meta: dict | None = None,
) -> Atividade:
    usuario = user if user is not None else usuario_atual()
    if usuario is not None and not getattr(usuario, "is_authenticated", False):
        usuario = None
    return Atividade.objects.create(
        user=usuario,
        user_nome=getattr(usuario, "nome", "") or "Sistema",
        user_cor=getattr(usuario, "cor", "#3B82F6") or "#3B82F6",
        verbo=verbo,
        entidade=entidade,
        entidade_id=str(entidade_id or ""),
        entidade_nome=entidade_nome[:200],
        projeto_id=projeto_id,
        meta=meta or {},
    )


def notificar(
    user,
    titulo: str,
    *,
    mensagem: str = "",
    nivel: str = NivelNotificacao.INFO,
    icone: str = "bell",
    link: str = "",
    entidade: str = "",
    entidade_id: str | int | None = None,
    cor: str = "",
) -> Notificacao | None:
    if user is None:
        return None
    return Notificacao.objects.create(
        user=user,
        titulo=titulo,
        mensagem=mensagem,
        nivel=nivel,
        icone=icone,
        link=link,
        cor=cor,
        entidade=entidade,
        entidade_id=str(entidade_id or ""),
    )


def enviar_email(destinatarios, assunto: str, corpo: str, corpo_html: str = "", remetente=None) -> int:
    """Envia e-mail aos destinatários informados. Devolve quantos foram aceitos.

    Em desenvolvimento o backend configurado é o de console, que imprime a
    mensagem no terminal — nenhum e-mail sai de fato da máquina.
    """
    from django.conf import settings as dj
    from django.core.mail import EmailMultiAlternatives, get_connection

    lista = [d for d in destinatarios if d]
    if not lista:
        return 0
    try:
        conexao = get_connection()
        mensagem = EmailMultiAlternatives(
            subject=assunto,
            body=corpo,
            from_email=remetente or dj.DEFAULT_FROM_EMAIL,
            to=lista,
            connection=conexao,
        )
        if corpo_html:
            mensagem.attach_alternative(corpo_html, "text/html")
        return mensagem.send(fail_silently=True) or 0
    except Exception:
        return 0


def regras_para(evento: str):
    """Regras de notificação ativas aplicáveis a um tipo de evento."""
    from .models import RegraNotificacao

    regras = []
    for regra in RegraNotificacao.objects.filter(ativo=True):
        if regra.evento in {evento, "*"} or regra.evento.split(".")[0] == evento.split(".")[0]:
            regras.append(regra)
    return regras


def notificar_com_regras(
    evento: str,
    users,
    titulo: str,
    *,
    mensagem: str = "",
    nivel: str = NivelNotificacao.INFO,
    icone: str = "bell",
    link: str = "",
    entidade: str = "",
    entidade_id: str | int | None = None,
) -> dict:
    """Notifica no aplicativo e, se alguma regra pedir, também por e-mail.

    Implementa o RF-36 (notificações in-app, e-mail e push) avaliando as regras
    configuradas em Administração › Notificações.
    """
    criadas = notificar_muitos(
        users, titulo, mensagem=mensagem, nivel=nivel, icone=icone, link=link,
        entidade=entidade, entidade_id=entidade_id,
    )
    destinatarios = {n.user for n in criadas if n is not None}
    if not destinatarios:
        return {"notificacoes": 0, "emails": 0, "canais": []}

    regras = regras_para(evento)
    canais = sorted({canal for regra in regras for canal in (regra.canais or [])})
    emails = 0
    if any(canal.upper() in {"EMAIL", "E-MAIL"} for canal in canais):
        corpo = titulo + "\n\n" + (mensagem or "")
        if link:
            corpo += "\n\nAcesse: " + link
        corpo += "\n\n— SGP · Sistema de Gestão de Projetos, Portfólio e Capacidades"
        emails = enviar_email([u.email for u in destinatarios], "[SGP] " + titulo, corpo)

    return {"notificacoes": len(criadas), "emails": emails, "canais": canais}


def notificar_muitos(users, titulo: str, **kwargs):
    vistos = set()
    criadas = []
    for user in users:
        if user is None or user.pk in vistos:
            continue
        vistos.add(user.pk)
        criadas.append(notificar(user, titulo, **kwargs))
    return criadas


def content_type_de(model) -> ContentType:
    return ContentType.objects.get_for_model(model)

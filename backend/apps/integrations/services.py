"""Serviços de integração: fila de eventos, entrega de webhooks e sincronização."""
from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.core.models import Webhook
from apps.core.services import registrar_auditoria

from .connectors import ResultadoOperacao, chamar_api, gerar_csv, obter_conector
from .models import (
    EventoIntegracao,
    Integracao,
    SincronizacaoLog,
    StatusIntegracao,
    StatusSincronizacao,
    TipoEvento,
    WebhookEntrega,
)

MAX_TENTATIVAS = 3
TEMPO_LIMITE_WEBHOOK = 10


# ---------------------------------------------------------------------------
# Fila de eventos (padrão outbox)
# ---------------------------------------------------------------------------
def registrar_evento(
    tipo: str,
    *,
    entidade: str = "",
    entidade_id: str | int | None = None,
    titulo: str = "",
    payload: dict | None = None,
    projeto_id: int | None = None,
) -> EventoIntegracao:
    """Publica um evento de domínio na fila para entrega a sistemas externos."""
    return EventoIntegracao.objects.create(
        tipo=tipo,
        entidade=entidade,
        entidade_id=str(entidade_id or ""),
        projeto_id=projeto_id,
        titulo=(titulo or "")[:200],
        payload=payload or {},
    )


def assinar_payload(secreto: str, corpo: bytes) -> str:
    """Assinatura HMAC-SHA256 usada para o receptor validar a origem."""
    if not secreto:
        return ""
    return "sha256=" + hmac.new(secreto.encode("utf-8"), corpo, hashlib.sha256).hexdigest()


def webhooks_para(evento: EventoIntegracao) -> list[Webhook]:
    """Webhooks ativos interessados no tipo do evento."""
    candidatos = Webhook.objects.filter(ativo=True)
    interessados = []
    for webhook in candidatos:
        eventos = webhook.eventos or []
        if not eventos or evento.tipo in eventos or evento.tipo.split(".")[0] + ".*" in eventos:
            interessados.append(webhook)
    return interessados


def entregar_webhook(webhook: Webhook, evento: EventoIntegracao, tentativa: int = 1) -> WebhookEntrega:
    """Entrega um evento a um webhook, registrando o resultado."""
    carga = {
        "evento": evento.tipo,
        "entidade": evento.entidade,
        "entidade_id": evento.entidade_id,
        "titulo": evento.titulo,
        "projeto_id": evento.projeto_id,
        "ocorrido_em": evento.ocorrido_em.isoformat(),
        "dados": evento.payload,
        "entrega": {"id": evento.id, "tentativa": tentativa, "origem": "SGP"},
    }
    corpo = json.dumps(carga, ensure_ascii=False, default=str).encode("utf-8")

    cabecalhos = {
        "Content-Type": "application/json",
        "User-Agent": "SGP-Webhooks/2.0",
        "X-SGP-Evento": evento.tipo,
        "X-SGP-Entrega": str(evento.id),
        "X-SGP-Tentativa": str(tentativa),
    }
    assinatura = assinar_payload(webhook.secreto or "", corpo)
    if assinatura:
        cabecalhos["X-SGP-Assinatura"] = assinatura

    inicio = time.perf_counter()
    try:
        requisicao = urllib.request.Request(webhook.url, data=corpo, method="POST")
        for chave, valor in cabecalhos.items():
            requisicao.add_header(chave, valor)
        with urllib.request.urlopen(requisicao, timeout=TEMPO_LIMITE_WEBHOOK) as resposta:
            duracao = int((time.perf_counter() - inicio) * 1000)
            return WebhookEntrega.objects.create(
                webhook=webhook,
                evento=evento,
                url=webhook.url,
                tentativa=tentativa,
                status_code=resposta.status,
                sucesso=200 <= resposta.status < 300,
                resposta=resposta.read().decode("utf-8", errors="replace")[:500],
                duracao_ms=duracao,
            )
    except Exception as exc:
        duracao = int((time.perf_counter() - inicio) * 1000)
        return WebhookEntrega.objects.create(
            webhook=webhook,
            evento=evento,
            url=webhook.url,
            tentativa=tentativa,
            sucesso=False,
            erro=str(exc)[:500],
            duracao_ms=duracao,
        )


def despachar_eventos(limite: int = 50, reprocessar: bool = False) -> dict:
    """Processa a fila pendente entregando cada evento aos webhooks interessados."""
    consulta = EventoIntegracao.objects.all() if reprocessar else EventoIntegracao.objects.filter(processado=False)
    eventos = list(consulta.order_by("ocorrido_em")[: max(1, min(limite, 500))])

    resumo = {"eventos": len(eventos), "entregas": 0, "sucessos": 0, "falhas": 0, "sem_destino": 0, "descartados": 0}

    for evento in eventos:
        destinos = webhooks_para(evento)
        if not destinos:
            evento.processado = True
            evento.save(update_fields=["processado"])
            resumo["sem_destino"] += 1
            continue

        tentativa = evento.tentativas + 1
        sucessos_evento = 0
        for webhook in destinos:
            entrega = entregar_webhook(webhook, evento, tentativa)
            resumo["entregas"] += 1
            if entrega.sucesso:
                resumo["sucessos"] += 1
                sucessos_evento += 1
            else:
                resumo["falhas"] += 1

        evento.tentativas = tentativa
        evento.entregas_ok = sucessos_evento
        if sucessos_evento == len(destinos):
            evento.processado = True
            evento.ultimo_erro = ""
        else:
            evento.ultimo_erro = "Falha na entrega na tentativa " + str(tentativa)
            if tentativa >= MAX_TENTATIVAS:
                evento.processado = True
                evento.ultimo_erro += " — número máximo de tentativas atingido (descartado)."
                resumo["descartados"] += 1
        evento.save(update_fields=["tentativas", "entregas_ok", "processado", "ultimo_erro"])

    return resumo


# ---------------------------------------------------------------------------
# Execução de sincronização
# ---------------------------------------------------------------------------
def executar_sincronizacao(
    integracao: Integracao,
    operacao: str = "AUTO",
    usuario=None,
    limite: int = 200,
) -> SincronizacaoLog:
    """Executa a sincronização de uma integração, registrando o resultado."""
    if operacao == "AUTO":
        operacao = "IMPORTAR" if integracao.direcao == "ENTRADA" else "EXPORTAR"
        if integracao.direcao == "BIDIRECIONAL":
            operacao = "IMPORTAR"

    registro = SincronizacaoLog.objects.create(
        integracao=integracao,
        operacao=operacao,
        status=StatusSincronizacao.EM_ANDAMENTO,
        disparado_por=usuario,
    )
    inicio = time.perf_counter()

    status_anterior = integracao.status
    Integracao.objects.filter(pk=integracao.pk).update(status=StatusIntegracao.SINCRONIZANDO)

    try:
        conector = obter_conector(integracao)
        if operacao == "IMPORTAR":
            if not conector.suporta_importacao:
                resultado = ResultadoOperacao(mensagem="Este conector não importa dados para o SGP.")
            else:
                resultado = conector.importar(limite=limite)
        elif operacao == "EXPORTAR":
            if not conector.suporta_exportacao:
                resultado = ResultadoOperacao(mensagem="Este conector não exporta dados do SGP.")
            else:
                resultado = conector.exportar(limite=limite)
        else:
            resultado = conector.testar()
    except Exception as exc:  # falha inesperada do conector
        resultado = ResultadoOperacao(mensagem="Erro inesperado no conector: " + str(exc)[:300])
        resultado.registrar_erro("conector", str(exc))

    duracao = int((time.perf_counter() - inicio) * 1000)
    registro.fim = timezone.now()
    registro.duracao_ms = duracao
    registro.itens_lidos = resultado.lidos
    registro.itens_criados = resultado.criados
    registro.itens_atualizados = resultado.atualizados
    registro.itens_ignorados = resultado.ignorados
    registro.itens_com_erro = len(resultado.erros)
    registro.erros = resultado.erros[:100]
    registro.detalhes = resultado.detalhes
    registro.mensagem = resultado.mensagem

    if resultado.houve_falha_total:
        registro.status = StatusSincronizacao.FALHA
    elif resultado.erros:
        registro.status = StatusSincronizacao.PARCIAL
    elif resultado.simulado:
        registro.status = StatusSincronizacao.SIMULADO
    else:
        registro.status = StatusSincronizacao.SUCESSO
    registro.save()

    # Atualiza os indicadores da integração
    integracao.refresh_from_db()
    integracao.total_execucoes += 1
    if registro.status in {StatusSincronizacao.SUCESSO, StatusSincronizacao.SIMULADO, StatusSincronizacao.PARCIAL}:
        integracao.total_sucesso += 1
        integracao.ultimo_erro = ""
        integracao.status = StatusIntegracao.ATIVA if integracao.ativa else StatusIntegracao.INATIVA
    else:
        integracao.total_falha += 1
        integracao.ultimo_erro = resultado.mensagem or "Falha na sincronização."
        integracao.status = StatusIntegracao.ERRO
    integracao.itens_sincronizados += registro.total_processado
    integracao.ultima_sincronizacao = registro.fim
    if integracao.ativa:
        integracao.agendar_proxima(registro.fim)
    integracao.save(
        update_fields=[
            "total_execucoes", "total_sucesso", "total_falha", "ultimo_erro", "status",
            "itens_sincronizados", "ultima_sincronizacao", "proxima_sincronizacao", "atualizado_em",
        ]
    )

    registrar_auditoria(
        entidade="integrations.integracao",
        acao="EXPORTAR" if operacao == "EXPORTAR" else "ATUALIZAR",
        instancia=integracao,
        user=usuario,
        justificativa="Sincronização " + operacao.lower() + ": " + registro.get_status_display(),
        novos={"status": registro.status, "criados": registro.itens_criados, "atualizados": registro.itens_atualizados},
        anteriores={"status_anterior": status_anterior},
    )
    return registro


def sincronizar_agendadas(limite: int = 10, usuario=None) -> list[SincronizacaoLog]:
    """Executa as integrações ativas cuja próxima execução já venceu."""
    agora = timezone.now()
    vencidas = Integracao.objects.filter(ativa=True).filter(
        models_q_proxima(agora)
    )[:limite]
    return [executar_sincronizacao(integracao, "AUTO", usuario=usuario) for integracao in vencidas]


def models_q_proxima(agora):
    from django.db.models import Q

    return Q(proxima_sincronizacao__isnull=True) | Q(proxima_sincronizacao__lte=agora)


# ---------------------------------------------------------------------------
# Painéis e catálogo
# ---------------------------------------------------------------------------
def resumo_integracoes() -> dict:
    """Indicadores do painel de integrações."""
    from django.db.models import Avg, Count, Sum

    integracoes = list(Integracao.objects.all())
    eventos = EventoIntegracao.objects.all()
    entregas = WebhookEntrega.objects.all()
    recentes = SincronizacaoLog.objects.select_related("integracao").order_by("-inicio")[:15]

    return {
        "integracoes": {
            "total": len(integracoes),
            "ativas": sum(1 for i in integracoes if i.ativa),
            "com_erro": sum(1 for i in integracoes if i.status == StatusIntegracao.ERRO),
            "em_simulacao": sum(1 for i in integracoes if i.modo_simulacao),
            "itens_sincronizados": sum(i.itens_sincronizados for i in integracoes),
            "taxa_sucesso_media": round(
                sum(i.taxa_sucesso for i in integracoes) / len(integracoes), 1
            ) if integracoes else 0.0,
        },
        "eventos": {
            "total": eventos.count(),
            "pendentes": eventos.filter(processado=False).count(),
            "ultimas_24h": eventos.filter(ocorrido_em__gte=timezone.now() - timedelta(hours=24)).count(),
            "por_tipo": list(eventos.values("tipo").annotate(total=Count("id")).order_by("-total")[:10]),
        },
        "webhooks": {
            "total": Webhook.objects.count(),
            "ativos": Webhook.objects.filter(ativo=True).count(),
            "entregas": entregas.count(),
            "sucessos": entregas.filter(sucesso=True).count(),
            "falhas": entregas.filter(sucesso=False).count(),
            "tempo_medio_ms": round(entregas.aggregate(m=Avg("duracao_ms"))["m"] or 0),
            "ultimas": [
                {
                    "id": e.id, "webhook": e.webhook.nome, "evento": e.evento.tipo,
                    "tentativa": e.tentativa, "status_code": e.status_code, "sucesso": e.sucesso,
                    "erro": e.erro[:160], "duracao_ms": e.duracao_ms, "criado_em": e.criado_em.isoformat(),
                }
                for e in entregas.select_related("webhook", "evento")[:10]
            ],
        },
        "execucoes_recentes": [
            {
                "id": r.id, "integracao": r.integracao.nome, "tipo": r.integracao.get_tipo_display(),
                "status": r.status, "operacao": r.operacao, "criados": r.itens_criados,
                "atualizados": r.itens_atualizados, "erros": r.itens_com_erro,
                "duracao_ms": r.duracao_ms, "mensagem": r.mensagem[:200],
                "inicio": r.inicio.isoformat(),
            }
            for r in recentes
        ],
    }


def catalogo_integracoes() -> list[dict]:
    """Catálogo da especificação §11 cruzado com o que está configurado."""
    from .models import TipoIntegracao

    catalogo = [
        ("ERP", "ERP (SAP, Oracle)", "Bidirecional", "Orçamento, custos e centros de custo.", "database"),
        ("CRM", "CRM (Salesforce)", "Unidirecional", "Projetos originados de oportunidades.", "briefcase"),
        ("RH", "RH (Workday, Gupy, Senior)", "Bidirecional", "Cargos, histórico e avaliações.", "users"),
        ("LMS", "LMS (Moodle, Cornerstone, Docebo)", "Bidirecional", "Cursos e certificações.", "graduation-cap"),
        ("JIRA", "Jira", "Bidirecional", "Sincronização de tarefas e status.", "square-kanban"),
        ("AZURE_DEVOPS", "Azure DevOps", "Bidirecional", "Sincronização de work items e builds.", "git-branch"),
        ("TEAMS", "Microsoft Teams", "Unidirecional", "Notificações e colaboração.", "message-square"),
        ("SLACK", "Slack", "Unidirecional", "Notificações e colaboração.", "hash"),
        ("BI", "Power BI / Tableau", "Unidirecional", "Exportação de dados analíticos.", "bar-chart-3"),
        ("GOOGLE_CALENDAR", "Google Calendar", "Bidirecional", "Sincronização de agendas e marcos.", "calendar"),
        ("OUTLOOK", "Microsoft Outlook", "Bidirecional", "Sincronização de agendas e marcos.", "calendar-days"),
        ("GITHUB", "GitHub", "Unidirecional", "Commits e deploys.", "github"),
        ("GITLAB", "GitLab", "Unidirecional", "Commits e pipelines.", "gitlab"),
        ("ESCO", "ESCO / SFIA", "Unidirecional", "Taxonomia padronizada de capacidades.", "sparkles"),
        ("CERTIFICADORA", "Certificadoras (AWS, Azure, PMI)", "Unidirecional", "Validação de credenciais.", "award"),
    ]

    configuradas: dict[str, Integracao] = {}
    for integracao in Integracao.objects.all():
        configuradas.setdefault(integracao.tipo, integracao)

    itens = []
    for tipo, nome, direcao, descricao, icone in catalogo:
        configurada = configuradas.get(tipo) or configuradas.get(tipo.replace("GOOGLE_CALENDAR", "OUTLOOK"))
        itens.append(
            {
                "tipo": tipo,
                "nome": nome,
                "direcao": direcao,
                "descricao": descricao,
                "icone": icone,
                "configurada": configurada is not None,
                "integracao_id": configurada.id if configurada else None,
                "status": configurada.status if configurada else "NAO_CONFIGURADA",
                "modo_simulacao": configurada.modo_simulacao if configurada else None,
                "suporta_conector": tipo in {
                    "ERP", "RH", "LMS", "JIRA", "AZURE_DEVOPS", "TEAMS", "SLACK",
                    "BI", "GOOGLE_CALENDAR", "OUTLOOK", "GITHUB", "GITLAB", "ESCO",
                    "CERTIFICADORA", "CRM",
                },
            }
        )
    return itens


def exportar_dataset(projects=None, formato: str = "JSON") -> dict:
    """Monta o dataset analítico do portfólio para consumo externo."""
    from apps.portfolio.models import Project

    projetos = projects if projects is not None else Project.objects.filter(arquivado=False)
    conector = obter_conector(Integracao(tipo="BI", nome="exportacao", modo_simulacao=True))
    resultado = conector.exportar(limite=1000) if hasattr(conector, "exportar") else None
    linhas = (resultado.detalhes.get("dataset") if resultado else None) or []
    return {
        "formato": formato,
        "total": len(linhas),
        "linhas": linhas,
        "csv": gerar_csv(linhas) if formato.upper() == "CSV" else "",
    }


def testar_conexao(integracao: Integracao, usuario=None) -> dict:
    """Testa a conexão de uma integração sem persistir histórico completo."""
    conector = obter_conector(integracao)
    resultado = conector.testar()
    registrar_auditoria(
        entidade="integrations.integracao",
        acao="ATUALIZAR",
        instancia=integracao,
        user=usuario,
        justificativa="Teste de conexão: " + ("ok" if not resultado.erros else "falha"),
    )
    return {
        "sucesso": not resultado.erros,
        "mensagem": resultado.mensagem,
        "simulado": resultado.simulado,
        "detalhes": resultado.detalhes,
        "requisicao": resultado.detalhes.get("requisicao_prevista"),
    }

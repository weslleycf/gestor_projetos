"""Conectores de integração.

Cada conector traduz o modelo do SGP para o formato do sistema externo e
vice-versa. Onde a integração é tecnicamente possível sem credenciais
(mensageria por webhook de entrada, feed de calendário, exportação de
dataset), a chamada HTTP é real. Onde a API exige credenciais que não temos
(Jira, LMS, ERP, RH), a mesma requisição é montada e registrada, mas o
conector opera em MODO SIMULAÇÃO — o log mostra exatamente o que seria
enviado, pronto para virar uma integração real assim que houver acesso.
"""
from __future__ import annotations

import csv
import io
import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.utils import timezone

from .models import Autenticacao, Integracao, MapeamentoCampo, Transformacao, TipoIntegracao

TEMPO_LIMITE = 12


@dataclass
class ResultadoOperacao:
    """Resultado padronizado de uma execução de conector."""

    lidos: int = 0
    criados: int = 0
    atualizados: int = 0
    ignorados: int = 0
    erros: list = field(default_factory=list)
    detalhes: dict = field(default_factory=dict)
    mensagem: str = ""
    simulado: bool = False

    def registrar_erro(self, referencia: str, mensagem: str) -> None:
        self.erros.append({"referencia": str(referencia), "mensagem": str(mensagem)[:400]})

    @property
    def houve_falha_total(self) -> bool:
        return bool(self.erros) and self.criados == 0 and self.atualizados == 0 and self.lidos == 0


# ---------------------------------------------------------------------------
# Infraestrutura HTTP
# ---------------------------------------------------------------------------
def montar_cabecalhos(integracao: Integracao) -> dict:
    """Monta os cabeçalhos de autenticação a partir das credenciais configuradas."""
    cabecalhos = {"Content-Type": "application/json", "Accept": "application/json"}
    cabecalhos.update({str(k): str(v) for k, v in (integracao.cabecalhos or {}).items()})
    cred = integracao.credenciais or {}

    if integracao.autenticacao == Autenticacao.API_KEY and cred.get("api_key"):
        cabecalhos[str(cred.get("header", "X-API-Key"))] = str(cred["api_key"])
    elif integracao.autenticacao == Autenticacao.BEARER and cred.get("token"):
        cabecalhos["Authorization"] = "Bearer " + str(cred["token"])
    elif integracao.autenticacao == Autenticacao.BASIC:
        import base64

        usuario = str(cred.get("usuario", ""))
        senha = str(cred.get("senha", ""))
        cabecalhos["Authorization"] = "Basic " + base64.b64encode((usuario + ":" + senha).encode()).decode()
    elif integracao.autenticacao == Autenticacao.OAUTH2 and cred.get("access_token"):
        cabecalhos["Authorization"] = "Bearer " + str(cred["access_token"])
    return cabecalhos


def chamar_api(
    integracao: Integracao,
    metodo: str,
    caminho: str,
    *,
    corpo: dict | list | None = None,
    parametros: dict | None = None,
) -> tuple[int, str]:
    """Executa a requisição HTTP. Levanta exceção em falha de rede."""
    base = (integracao.url_base or "").rstrip("/")
    url = caminho if caminho.startswith("http") else base + caminho
    if parametros:
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(parametros)

    dados = None
    if corpo is not None:
        dados = json.dumps(corpo, ensure_ascii=False, default=str).encode("utf-8")

    requisicao = urllib.request.Request(url, data=dados, method=metodo.upper())
    for chave, valor in montar_cabecalhos(integracao).items():
        requisicao.add_header(chave, valor)

    try:
        with urllib.request.urlopen(requisicao, timeout=TEMPO_LIMITE) as resposta:
            return resposta.status, resposta.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode("utf-8", errors="replace")[:2000]
    except Exception as exc:  # rede indisponível, DNS, timeout
        raise RuntimeError(str(exc)[:300]) from exc


def aplicar_transformacao(valor, transformacao: str, traducao: dict | None = None, padrao: str = ""):
    """Aplica a transformação configurada no mapeamento de campo."""
    if valor is None or valor == "":
        return padrao or None
    traducao = traducao or {}
    try:
        if transformacao == Transformacao.MAIUSCULA:
            return str(valor).upper()
        if transformacao == Transformacao.MINUSCULA:
            return str(valor).lower()
        if transformacao == Transformacao.TRIM:
            return str(valor).strip()
        if transformacao == Transformacao.DATA:
            if isinstance(valor, date):
                return valor
            texto = str(valor)[:10]
            return datetime.strptime(texto, "%Y-%m-%d").date()
        if transformacao == Transformacao.NUMERO:
            return float(str(valor).replace(",", "."))
        if transformacao == Transformacao.MOEDA:
            limpo = str(valor).replace("R$", "").replace(".", "").replace(",", ".").strip()
            return Decimal(limpo)
        if transformacao == Transformacao.BOOLEANO:
            return str(valor).strip().lower() in {"1", "true", "sim", "yes", "verdadeiro"}
        if transformacao == Transformacao.ENUM:
            return traducao.get(str(valor), padrao or valor)
        if transformacao in {Transformacao.PESSOA, Transformacao.SKILL}:
            return str(valor).strip()
    except Exception:
        return padrao or None
    return valor


def aplicar_mapeamento(integracao: Integracao, dados: dict) -> tuple[dict, list[dict]]:
    """Converte um registro externo no formato interno segundo os mapeamentos."""
    mapeamentos = list(integracao.mapeamentos.all())
    if not mapeamentos:
        return dict(dados), []
    convertido, pendencias = {}, []
    for mapa in mapeamentos:
        valor = dados.get(mapa.campo_origem)
        if valor in (None, "") and mapa.obrigatorio:
            pendencias.append({"campo": mapa.campo_destino, "motivo": "campo obrigatorio ausente no registro de origem"})
            continue
        convertido[mapa.campo_destino] = aplicar_transformacao(
            valor, mapa.transformacao, mapa.traducao, mapa.valor_padrao
        )
    return convertido, pendencias


def _limite_seguro(limite: int, teto: int = 500) -> int:
    return max(1, min(int(limite or 100), teto))


# ---------------------------------------------------------------------------
# Conector base
# ---------------------------------------------------------------------------
class ConectorBase:
    tipo = ""
    suporta_importacao = True
    suporta_exportacao = True
    descricao = ""

    def __init__(self, integracao: Integracao):
        self.integracao = integracao

    # -- utilidades -------------------------------------------------------
    def registrar_requisicao(self, metodo: str, caminho: str, corpo=None) -> dict:
        """Descreve a requisição que seria feita (usado no modo simulação)."""
        base = (self.integracao.url_base or "").rstrip("/")
        return {
            "metodo": metodo,
            "url": caminho if caminho.startswith("http") else base + caminho,
            "corpo": corpo,
            "autenticacao": self.integracao.autenticacao,
        }

    def testar(self) -> ResultadoOperacao:
        resultado = ResultadoOperacao()
        if self.integracao.modo_simulacao:
            resultado.simulado = True
            resultado.mensagem = (
                "Modo simulação ativo: a conexão com " + self.integracao.get_tipo_display() + " não foi exercitada. "
                "Desative o modo simulação e informe as credenciais para testar de verdade."
            )
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao("GET", "/")
            return resultado
        try:
            status, corpo = chamar_api(self.integracao, "GET", "/")
            resultado.lidos = 1
            resultado.mensagem = "Conexão bem-sucedida (HTTP " + str(status) + ")."
            resultado.detalhes["resposta"] = corpo[:500]
        except Exception as exc:
            resultado.registrar_erro("conexao", str(exc))
            resultado.mensagem = "Falha ao conectar: " + str(exc)
        return resultado

    def importar(self, limite: int = 200) -> ResultadoOperacao:
        return ResultadoOperacao(mensagem="Este conector não importa dados para o SGP.")

    def exportar(self, limite: int = 200) -> ResultadoOperacao:
        return ResultadoOperacao(mensagem="Este conector não exporta dados do SGP.")


# ---------------------------------------------------------------------------
# Mensageria (Teams / Slack) — integração real por webhook de entrada
# ---------------------------------------------------------------------------
class ConectorMensageria(ConectorBase):
    suporta_importacao = False

    def _payload(self, texto: str, titulo: str, cor: str) -> dict:
        if self.integracao.tipo == TipoIntegracao.SLACK:
            return {"text": "*" + titulo + "*\n" + texto}
        return {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": titulo,
            "themeColor": cor.lstrip("#"),
            "title": titulo,
            "text": texto,
        }

    def exportar(self, limite: int = 50) -> ResultadoOperacao:
        from .models import EventoIntegracao

        resultado = ResultadoOperacao()
        destino = (self.integracao.credenciais or {}).get("webhook_url") or self.integracao.url_base
        if not destino:
            resultado.registrar_erro("configuracao", "Informe a URL de webhook de entrada nas credenciais.")
            resultado.mensagem = "URL de webhook não configurada."
            return resultado

        eventos = EventoIntegracao.objects.filter(processado=False).order_by("ocorrido_em")[: _limite_seguro(limite)]
        resultado.lidos = len(eventos)
        resultado.simulado = self.integracao.modo_simulacao

        for evento in eventos:
            titulo = evento.get_tipo_display()
            texto = evento.titulo or evento.entidade
            corpo = self._payload(texto, titulo, self.integracao.cor)
            if self.integracao.modo_simulacao:
                resultado.detalhes.setdefault("requisicoes_previstas", []).append(
                    {"url": destino, "corpo": corpo}
                )
                resultado.ignorados += 1
                continue
            try:
                requisicao = urllib.request.Request(
                    destino, data=json.dumps(corpo, ensure_ascii=False).encode("utf-8"), method="POST"
                )
                requisicao.add_header("Content-Type", "application/json")
                with urllib.request.urlopen(requisicao, timeout=TEMPO_LIMITE) as resposta:
                    if 200 <= resposta.status < 300:
                        resultado.criados += 1
                    else:
                        resultado.registrar_erro(evento.id, "HTTP " + str(resposta.status))
            except Exception as exc:
                resultado.registrar_erro(evento.id, str(exc))

        resultado.mensagem = (
            "Simulação: " + str(resultado.ignorados) + " mensagem(ns) seriam publicadas."
            if self.integracao.modo_simulacao
            else "Publicadas " + str(resultado.criados) + " mensagem(ns) no canal."
        )
        return resultado


# ---------------------------------------------------------------------------
# LMS — importa conclusões de curso e credita XP
# ---------------------------------------------------------------------------
class ConectorLMS(ConectorBase):
    suporta_exportacao = False

    def importar(self, limite: int = 200) -> ResultadoOperacao:
        from apps.capabilities.models import EmployeeTraining, Training
        from apps.capabilities.services import creditar_xp

        resultado = ResultadoOperacao()
        limite = _limite_seguro(limite)

        registros: list[dict] = []
        if self.integracao.modo_simulacao:
            resultado.simulado = True
            treinamentos = list(Training.objects.filter(ativo=True)[:20])
            usuarios = list(
                EmployeeTraining.objects.select_related("user", "training").values("user__email", "user_id", "training_id")[:limite]
            )
            for indice, item in enumerate(usuarios):
                if item["user__email"]:
                    registros.append(
                        {
                            "user_email": item["user__email"],
                            "course_code": "TRN-" + str(item["training_id"]),
                            "completion_date": (timezone.localdate() - timedelta(days=indice)).isoformat(),
                            "score": 70 + (indice * 7) % 30,
                            "certificate_url": "https://lms.exemplo.com/certificado/" + str(item["training_id"]),
                        }
                    )
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao("GET", "/api/v1/completions", None)
            if not registros and treinamentos:
                resultado.mensagem = "Simulação sem inscrições de exemplo para converter em conclusões."
                return resultado
        else:
            try:
                status, corpo = chamar_api(self.integracao, "GET", "/api/v1/completions", parametros={"limit": limite})
                if status >= 400:
                    resultado.registrar_erro("lms", "HTTP " + str(status))
                    resultado.mensagem = "O LMS respondeu com erro " + str(status) + "."
                    return resultado
                registros = json.loads(corpo)
            except Exception as exc:
                resultado.registrar_erro("lms", str(exc))
                resultado.mensagem = "Falha ao consultar o LMS: " + str(exc)
                return resultado

        resultado.lidos = len(registros)
        from apps.core.models import User

        for registro in registros:
            convertido, pendencias = aplicar_mapeamento(self.integracao, registro)
            if pendencias and not convertido:
                resultado.registrar_erro(registro.get("course_code", "?"), "mapeamento incompleto")
                continue
            email = convertido.get("user_email") or registro.get("user_email")
            codigo = convertido.get("course_code") or registro.get("course_code")
            usuario = User.objects.filter(email=email).first() if email else None
            if not usuario or not codigo:
                resultado.ignorados += 1
                continue
            treinamento = None
            if str(codigo).startswith("TRN-"):
                treinamento = Training.objects.filter(pk=str(codigo).replace("TRN-", "")).first()
            treinamento = treinamento or Training.objects.filter(nome__icontains=str(codigo)).first()
            if not treinamento:
                resultado.ignorados += 1
                continue

            inscricao, criada = EmployeeTraining.objects.get_or_create(
                user=usuario, training=treinamento,
                defaults={
                    "status": "CONCLUIDO",
                    "data_conclusao": convertido.get("completion_date") or timezone.localdate(),
                    "nota": convertido.get("score") or registro.get("score"),
                    "certificado_url": convertido.get("certificate_url") or registro.get("certificate_url", ""),
                    "origem": "LMS",
                },
            )
            if criada:
                resultado.criados += 1
                if treinamento.skill_id:
                    creditar_xp(
                        usuario, treinamento.skill, treinamento.xp_concedido,
                        origem="TREINAMENTO",
                        motivo="Conclusão importada do LMS: " + treinamento.nome,
                        referencia="integracao#" + str(self.integracao.id),
                    )
            elif inscricao.status != "CONCLUIDO":
                inscricao.status = "CONCLUIDO"
                inscricao.data_conclusao = convertido.get("completion_date") or timezone.localdate()
                inscricao.origem = "LMS"
                inscricao.save(update_fields=["status", "data_conclusao", "origem"])
                resultado.atualizados += 1
            else:
                resultado.ignorados += 1

        resultado.mensagem = (
            "Simulação: " + str(resultado.criados) + " conclusão(ões) seriam importadas do LMS."
            if resultado.simulado
            else "Importadas " + str(resultado.criados) + " conclusão(ões) do LMS."
        )
        return resultado


# ---------------------------------------------------------------------------
# Jira / Azure DevOps — exporta tarefas como itens e importa status
# ---------------------------------------------------------------------------
class ConectorJira(ConectorBase):
    def exportar(self, limite: int = 100) -> ResultadoOperacao:
        from apps.tasks.models import Task

        resultado = ResultadoOperacao()
        tarefas = (
            Task.objects.filter(project__arquivado=False)
            .exclude(status__in=["CONCLUIDA", "CANCELADA"])
            .select_related("project", "responsavel")[: _limite_seguro(limite)]
        )
        resultado.lidos = len(tarefas)
        projeto_chave = (self.integracao.credenciais or {}).get("projeto_chave", "SGP")
        resultado.simulado = self.integracao.modo_simulacao
        resultado.detalhes["endpoint_previsto"] = "/rest/api/3/issue"
        if not tarefas:
            resultado.mensagem = "Nenhuma tarefa elegível para exportar no momento."

        for tarefa in tarefas:
            corpo = {
                "fields": {
                    "project": {"key": projeto_chave},
                    "summary": tarefa.nome,
                    "description": tarefa.descricao or tarefa.nome,
                    "issuetype": {"name": "Task"},
                    "duedate": tarefa.data_fim.isoformat() if tarefa.data_fim else None,
                    "labels": ["sgp", tarefa.project.codigo or "projeto"],
                }
            }
            if self.integracao.modo_simulacao:
                resultado.detalhes.setdefault("requisicoes_previstas", []).append(
                    self.registrar_requisicao("POST", "/rest/api/3/issue", corpo)
                )
                resultado.ignorados += 1
                continue
            try:
                status, resposta = chamar_api(self.integracao, "POST", "/rest/api/3/issue", corpo=corpo)
                if status in (200, 201):
                    resultado.criados += 1
                    chave = (json.loads(resposta) or {}).get("key")
                    if chave:
                        tarefa.tags = list(dict.fromkeys(list(tarefa.tags or []) + [chave]))
                        tarefa.save(update_fields=["tags", "atualizado_em"])
                else:
                    resultado.registrar_erro(tarefa.id, "HTTP " + str(status) + ": " + resposta[:200])
            except Exception as exc:
                resultado.registrar_erro(tarefa.id, str(exc))

        resultado.mensagem = (
            "Simulação: " + str(resultado.ignorados) + " tarefa(s) seriam criadas como issue."
            if resultado.simulado
            else "Criadas " + str(resultado.criados) + " issue(s) no Jira."
        )
        return resultado

    def importar(self, limite: int = 100) -> ResultadoOperacao:
        from apps.tasks.models import StatusTarefa, Task

        resultado = ResultadoOperacao()
        limite = _limite_seguro(limite)
        registros: list[dict] = []

        if self.integracao.modo_simulacao:
            resultado.simulado = True
            for tarefa in Task.objects.exclude(status__in=["CONCLUIDA", "CANCELADA"]).select_related("project")[:limite]:
                chave = next((t for t in (tarefa.tags or []) if "-" in str(t) and str(t).isupper()), None)
                if chave:
                    registros.append({"key": chave, "status": "Em andamento" if tarefa.status == "EM_ANDAMENTO" else "A fazer"})
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao(
                "GET", "/rest/api/3/search", None
            )
        else:
            try:
                status, corpo = chamar_api(
                    self.integracao, "GET", "/rest/api/3/search",
                    parametros={"jql": "project = " + str((self.integracao.credenciais or {}).get("projeto_chave", "SGP")), "maxResults": limite},
                )
                if status >= 400:
                    resultado.registrar_erro("jira", "HTTP " + str(status))
                    resultado.mensagem = "O Jira respondeu com erro " + str(status) + "."
                    return resultado
                dados = json.loads(corpo)
                registros = [
                    {"key": item.get("key"), "status": ((item.get("fields") or {}).get("status") or {}).get("name")}
                    for item in dados.get("issues", [])
                ]
            except Exception as exc:
                resultado.registrar_erro("jira", str(exc))
                resultado.mensagem = "Falha ao consultar o Jira: " + str(exc)
                return resultado

        traducao = {"A fazer": StatusTarefa.A_FAZER, "Em andamento": StatusTarefa.EM_ANDAMENTO,
                    "Em revisão": StatusTarefa.EM_REVISAO, "Concluído": StatusTarefa.CONCLUIDA,
                    "Done": StatusTarefa.CONCLUIDA, "In Progress": StatusTarefa.EM_ANDAMENTO}
        resultado.lidos = len(registros)
        for registro in registros:
            chave = registro.get("key")
            novo = traducao.get(str(registro.get("status")), None)
            if not chave or not novo:
                resultado.ignorados += 1
                continue
            tarefa = Task.objects.filter(tags__contains=[chave]).first()
            if not tarefa:
                resultado.ignorados += 1
                continue
            if tarefa.status != novo:
                tarefa.status = novo
                if novo == StatusTarefa.CONCLUIDA:
                    tarefa.percentual_conclusao = 100
                tarefa.save(update_fields=["status", "percentual_conclusao", "atualizado_em"])
                resultado.atualizados += 1
            else:
                resultado.ignorados += 1

        resultado.mensagem = "Atualizadas " + str(resultado.atualizados) + " tarefa(s) a partir do Jira."
        return resultado


# ---------------------------------------------------------------------------
# Calendário (Google / Outlook) — feed .ics real
# ---------------------------------------------------------------------------
class ConectorCalendario(ConectorBase):
    suporta_importacao = False

    def exportar(self, limite: int = 300) -> ResultadoOperacao:
        from apps.portfolio.models import Milestone
        from apps.tasks.models import Task

        resultado = ResultadoOperacao()
        limite = _limite_seguro(limite)
        eventos = []

        for tarefa in Task.objects.filter(data_fim__isnull=False, project__arquivado=False).select_related("project")[:limite]:
            eventos.append(
                {
                    "uid": "tarefa-" + str(tarefa.id) + "@sgp",
                    "titulo": tarefa.nome,
                    "inicio": tarefa.data_inicio or tarefa.data_fim,
                    "fim": tarefa.data_fim,
                    "descricao": (tarefa.project.nome or "") + " · " + str(tarefa.percentual_conclusao) + "% concluído",
                }
            )
        for marco in Milestone.objects.select_related("project")[:limite]:
            eventos.append(
                {
                    "uid": "marco-" + str(marco.id) + "@sgp",
                    "titulo": "Marco: " + marco.nome,
                    "inicio": marco.data_prevista,
                    "fim": marco.data_prevista,
                    "descricao": marco.project.nome or "",
                }
            )

        resultado.lidos = len(eventos)
        resultado.detalhes["ics"] = gerar_ics(eventos)
        resultado.detalhes["total_eventos"] = len(eventos)
        resultado.simulado = self.integracao.modo_simulacao

        if self.integracao.modo_simulacao:
            resultado.mensagem = (
                "Simulação: feed .ics gerado com " + str(len(eventos)) + " evento(s). "
                "Publique o endereço do feed ou desative a simulação para enviar direto à API do calendário."
            )
            resultado.ignorados = len(eventos)
            return resultado

        enviados = 0
        for evento in eventos:
            corpo = {
                "summary": evento["titulo"],
                "description": evento["descricao"],
                "start": {"date": evento["inicio"].isoformat() if evento["inicio"] else None},
                "end": {"date": (evento["fim"] or evento["inicio"]).isoformat() if evento["inicio"] else None},
            }
            try:
                status, resposta = chamar_api(self.integracao, "POST", "/calendar/v3/calendars/primary/events", corpo=corpo)
                if status in (200, 201):
                    enviados += 1
                else:
                    resultado.registrar_erro(evento["uid"], "HTTP " + str(status) + ": " + resposta[:160])
            except Exception as exc:
                resultado.registrar_erro(evento["uid"], str(exc))
        resultado.criados = enviados
        resultado.mensagem = "Enviados " + str(enviados) + " evento(s) ao calendário."
        return resultado


def gerar_ics(eventos: list[dict]) -> str:
    """Gera um feed iCalendar (RFC 5545) a partir de uma lista de eventos."""
    linhas = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//SGP//Gestao de Projetos//PT-BR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    for evento in eventos:
        if not evento.get("inicio"):
            continue
        inicio = evento["inicio"]
        fim = evento.get("fim") or inicio
        linhas += [
            "BEGIN:VEVENT",
            "UID:" + str(evento["uid"]),
            "DTSTAMP:" + datetime.utcnow().strftime("%Y%m%dT%H%M%SZ"),
            "DTSTART;VALUE=DATE:" + inicio.strftime("%Y%m%d"),
            "DTEND;VALUE=DATE:" + (fim + timedelta(days=1)).strftime("%Y%m%d"),
            "SUMMARY:" + str(evento["titulo"]).replace("\n", " ")[:200],
            "DESCRIPTION:" + str(evento.get("descricao", "")).replace("\n", " ")[:400],
            "END:VEVENT",
        ]
    linhas.append("END:VCALENDAR")
    return "\r\n".join(linhas)


# ---------------------------------------------------------------------------
# RH — importa colaboradores
# ---------------------------------------------------------------------------
class ConectorRH(ConectorBase):
    suporta_exportacao = False

    def importar(self, limite: int = 300) -> ResultadoOperacao:
        from apps.core.models import Perfil, User

        resultado = ResultadoOperacao()
        limite = _limite_seguro(limite)
        registros: list[dict] = []

        if self.integracao.modo_simulacao:
            resultado.simulado = True
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao("GET", "/api/v1/employees", None)
            resultado.mensagem = (
                "Simulação: a consulta de colaboradores seria feita em /api/v1/employees. "
                "Nenhum registro foi criado para não duplicar pessoas já cadastradas."
            )
            return resultado

        try:
            status, corpo = chamar_api(self.integracao, "GET", "/api/v1/employees", parametros={"limit": limite})
            if status >= 400:
                resultado.registrar_erro("rh", "HTTP " + str(status))
                resultado.mensagem = "O sistema de RH respondeu com erro " + str(status) + "."
                return resultado
            registros = json.loads(corpo)
        except Exception as exc:
            resultado.registrar_erro("rh", str(exc))
            resultado.mensagem = "Falha ao consultar o sistema de RH: " + str(exc)
            return resultado

        resultado.lidos = len(registros)
        for registro in registros:
            convertido, pendencias = aplicar_mapeamento(self.integracao, registro)
            if pendencias and not convertido:
                resultado.registrar_erro(registro.get("email", "?"), "mapeamento incompleto")
                continue
            email = str(convertido.get("email") or registro.get("email") or "").lower()
            if not email:
                resultado.ignorados += 1
                continue
            dados = {
                "nome": convertido.get("nome") or registro.get("nome") or email,
                "cargo": convertido.get("cargo") or registro.get("cargo", ""),
                "area": convertido.get("area") or registro.get("area", ""),
                "localizacao": convertido.get("localizacao") or registro.get("localizacao", ""),
                "data_admissao": convertido.get("data_admissao") or registro.get("data_admissao"),
                "perfil": convertido.get("perfil") or Perfil.MEMBRO,
            }
            usuario, criado = User.objects.update_or_create(email=email, defaults=dados)
            if criado:
                usuario.set_password(ApiTokenSenhaInicial())
                usuario.save(update_fields=["password"])
                resultado.criados += 1
            else:
                resultado.atualizados += 1

        resultado.mensagem = (
            "Importados " + str(resultado.criados) + " colaborador(es) e atualizados " + str(resultado.atualizados) + "."
        )
        return resultado


def ApiTokenSenhaInicial() -> str:
    """Senha inicial de colaborador importado do RH — deve ser trocada no primeiro acesso."""
    return "sgp." + secrets_token(6)


def secrets_token(tamanho: int) -> str:
    import secrets as _secrets

    return _secrets.token_urlsafe(tamanho)[:tamanho]


# ---------------------------------------------------------------------------
# ERP — exporta lançamentos financeiros
# ---------------------------------------------------------------------------
class ConectorERP(ConectorBase):
    suporta_importacao = False

    def exportar(self, limite: int = 300) -> ResultadoOperacao:
        from apps.finance.models import Lancamento

        resultado = ResultadoOperacao()
        lancamentos = Lancamento.objects.filter(status="REALIZADO").select_related("project", "orcamento")[: _limite_seguro(limite)]
        resultado.lidos = len(lancamentos)
        resultado.simulado = self.integracao.modo_simulacao
        corpo = {
            "lancamentos": [
                {
                    "documento": item.documento or ("SGP-" + str(item.id)),
                    "data_competencia": item.data_competencia.isoformat(),
                    "valor": float(item.valor),
                    "tipo": item.tipo,
                    "centro_custo": item.centro_custo or (item.project.codigo or ""),
                    "descricao": item.descricao,
                    "fornecedor": item.fornecedor,
                }
                for item in lancamentos
            ]
        }
        if self.integracao.modo_simulacao:
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao("POST", "/api/financeiro/lancamentos", corpo)
            resultado.ignorados = len(lancamentos)
            resultado.mensagem = "Simulação: " + str(len(lancamentos)) + " lançamento(s) seriam enviados ao ERP."
            return resultado

        try:
            status, resposta = chamar_api(self.integracao, "POST", "/api/financeiro/lancamentos", corpo=corpo)
            if status in (200, 201, 202):
                resultado.criados = len(lancamentos)
                resultado.mensagem = "Enviados " + str(resultado.criados) + " lançamento(s) ao ERP."
            else:
                resultado.registrar_erro("erp", "HTTP " + str(status) + ": " + resposta[:200])
                resultado.mensagem = "O ERP respondeu com erro " + str(status) + "."
        except Exception as exc:
            resultado.registrar_erro("erp", str(exc))
            resultado.mensagem = "Falha ao enviar ao ERP: " + str(exc)
        return resultado


# ---------------------------------------------------------------------------
# BI — exporta dataset analítico
# ---------------------------------------------------------------------------
class ConectorBI(ConectorBase):
    suporta_importacao = False

    def exportar(self, limite: int = 500) -> ResultadoOperacao:
        from apps.portfolio.models import Project

        resultado = ResultadoOperacao()
        linhas = []
        for projeto in Project.objects.filter(arquivado=False).prefetch_related("tarefas", "riscos")[: _limite_seguro(limite)]:
            evm = projeto.evm()
            linhas.append(
                {
                    "codigo": projeto.codigo,
                    "nome": projeto.nome,
                    "programa": projeto.program.nome if projeto.program_id else "",
                    "portfolio": projeto.portfolio.nome if projeto.portfolio_id else "",
                    "area": projeto.area,
                    "status": projeto.status,
                    "saude": projeto.saude,
                    "prioridade": projeto.prioridade,
                    "gerente": projeto.manager.nome if projeto.manager_id else "",
                    "inicio": projeto.data_inicio.isoformat() if projeto.data_inicio else "",
                    "fim": projeto.data_fim.isoformat() if projeto.data_fim else "",
                    "percentual_conclusao": projeto.percentual_conclusao,
                    "progresso_planejado": projeto.progresso_planejado,
                    "orcamento": float(projeto.orcamento),
                    "custo_real": float(projeto.custo_real),
                    "BAC": evm["BAC"],
                    "EV": evm["EV"],
                    "AC": evm["AC"],
                    "CPI": evm["CPI"],
                    "SPI": evm["SPI"],
                    "EAC": evm["EAC"],
                    "VAC": evm["VAC"],
                    "total_tarefas": projeto.tarefas.count(),
                    "total_riscos": projeto.riscos.count(),
                }
            )
        resultado.lidos = len(linhas)
        resultado.detalhes["dataset"] = linhas
        resultado.detalhes["formato"] = (self.integracao.credenciais or {}).get("formato", "JSON")
        resultado.simulado = self.integracao.modo_simulacao

        if self.integracao.modo_simulacao:
            resultado.ignorados = len(linhas)
            resultado.mensagem = "Simulação: dataset com " + str(len(linhas)) + " linha(s) pronto para publicação."
            return resultado

        try:
            status, resposta = chamar_api(self.integracao, "POST", "/datasets/sgp-projetos/rows", corpo={"rows": linhas})
            if status in (200, 201, 202):
                resultado.criados = len(linhas)
                resultado.mensagem = "Publicadas " + str(len(linhas)) + " linha(s) no Power BI/Tableau."
            else:
                resultado.registrar_erro("bi", "HTTP " + str(status) + ": " + resposta[:200])
        except Exception as exc:
            resultado.registrar_erro("bi", str(exc))
            resultado.mensagem = "Falha ao publicar o dataset: " + str(exc)
        return resultado


def gerar_csv(linhas: list[dict]) -> str:
    """Converte uma lista de dicionários em CSV com separador ponto e vírgula."""
    if not linhas:
        return ""
    buffer = io.StringIO()
    escritor = csv.DictWriter(buffer, fieldnames=list(linhas[0].keys()), delimiter=";")
    escritor.writeheader()
    for linha in linhas:
        escritor.writerow(linha)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# Taxonomia ESCO / SFIA
# ---------------------------------------------------------------------------
class ConectorEsco(ConectorBase):
    suporta_exportacao = False

    def importar(self, limite: int = 300) -> ResultadoOperacao:
        from apps.capabilities.models import Skill, SkillCategory

        resultado = ResultadoOperacao()
        limite = _limite_seguro(limite)
        framework = (self.integracao.credenciais or {}).get("framework", "ESCO")

        if self.integracao.modo_simulacao:
            resultado.simulado = True
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao(
                "GET", "/api/v1/taxonomy/search", None
            )
            resultado.mensagem = (
                "Simulação: a taxonomia " + framework + " seria consultada. "
                "Use a importação manual em Capacidades > Importar taxonomia para colar os itens."
            )
            return resultado

        try:
            status, corpo = chamar_api(
                self.integracao, "GET", "/api/v1/taxonomy/search", parametros={"limit": limite, "framework": framework}
            )
            if status >= 400:
                resultado.registrar_erro("esco", "HTTP " + str(status))
                return resultado
            dados = json.loads(corpo)
        except Exception as exc:
            resultado.registrar_erro("esco", str(exc))
            resultado.mensagem = "Falha ao consultar a taxonomia: " + str(exc)
            return resultado

        itens = dados.get("_embedded", {}).get("results", dados if isinstance(dados, list) else [])
        resultado.lidos = len(itens)
        for item in itens:
            nome = str(item.get("preferredLabel") or item.get("title") or "").strip()
            if not nome:
                resultado.ignorados += 1
                continue
            categoria, _ = SkillCategory.objects.get_or_create(nome=str(item.get("category") or framework))
            _, criado = Skill.objects.update_or_create(
                codigo_externo=str(item.get("code") or item.get("uri") or nome)[:60],
                framework_origem=framework,
                defaults={
                    "nome": nome[:200],
                    "descricao": str(item.get("description") or "")[:2000],
                    "categoria": categoria,
                    "tipo": "TECNICA",
                    "sinonimos": item.get("altLabels") or [],
                },
            )
            if criado:
                resultado.criados += 1
            else:
                resultado.atualizados += 1

        resultado.mensagem = (
            "Importadas " + str(resultado.criados) + " capacidade(s) da taxonomia " + framework + "."
        )
        return resultado


# ---------------------------------------------------------------------------
# Git (GitHub / GitLab) — importa atividade de repositório
# ---------------------------------------------------------------------------
class ConectorGit(ConectorBase):
    suporta_exportacao = False

    def importar(self, limite: int = 100) -> ResultadoOperacao:
        from apps.core.services import registrar_atividade

        resultado = ResultadoOperacao()
        limite = _limite_seguro(limite)
        repositorio = (self.integracao.credenciais or {}).get("repositorio", "")
        resultado.simulado = self.integracao.modo_simulacao

        if not repositorio:
            resultado.registrar_erro("configuracao", "Informe o repositório nas credenciais (ex.: empresa/sgp).")
            resultado.mensagem = "Repositório não configurado."
            return resultado

        if self.integracao.modo_simulacao:
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao(
                "GET", "/repos/" + repositorio + "/commits", None
            )
            resultado.mensagem = (
                "Simulação: os commits de " + repositorio + " seriam importados como atividade do projeto. "
                "Configure um token com escopo de leitura para ativar."
            )
            return resultado

        try:
            caminho = "/repos/" + repositorio + "/commits" if self.integracao.tipo == TipoIntegracao.GITHUB else "/api/v4/projects/" + urllib.parse.quote(repositorio, safe="") + "/repository/commits"
            status, corpo = chamar_api(self.integracao, "GET", caminho, parametros={"per_page": min(limite, 100)})
            if status >= 400:
                resultado.registrar_erro("git", "HTTP " + str(status))
                resultado.mensagem = "O repositório respondeu com erro " + str(status) + "."
                return resultado
            commits = json.loads(corpo)
        except Exception as exc:
            resultado.registrar_erro("git", str(exc))
            resultado.mensagem = "Falha ao consultar o repositório: " + str(exc)
            return resultado

        resultado.lidos = len(commits)
        for commit in commits:
            mensagem = (commit.get("commit") or {}).get("message") or commit.get("title") or ""
            autor = ((commit.get("commit") or {}).get("author") or {}).get("name") or commit.get("author_name") or "Repositório"
            registrar_atividade(
                verbo="commitou em " + repositorio,
                entidade="integrations.commit",
                entidade_id=str(commit.get("sha") or commit.get("id") or "")[:40],
                entidade_nome=mensagem.split("\n")[0][:200],
                meta={"autor": autor, "repositorio": repositorio, "origem": "GIT"},
            )
            resultado.criados += 1

        resultado.mensagem = "Importados " + str(resultado.criados) + " commit(s) como atividade."
        return resultado


# ---------------------------------------------------------------------------
# Certificadoras — valida credenciais
# ---------------------------------------------------------------------------
class ConectorCertificadora(ConectorBase):
    suporta_exportacao = False

    def importar(self, limite: int = 200) -> ResultadoOperacao:
        from apps.capabilities.models import SkillEvidence

        resultado = ResultadoOperacao()
        evidencias = SkillEvidence.objects.filter(
            tipo="CERTIFICACAO", valida=False
        ).select_related("employee_skill", "employee_skill__skill")[: _limite_seguro(limite)]
        resultado.lidos = len(evidencias)
        resultado.simulado = self.integracao.modo_simulacao

        if self.integracao.modo_simulacao:
            resultado.detalhes["requisicao_prevista"] = self.registrar_requisicao(
                "POST", "/api/v1/credentials/verify",
                {"credenciais": [e.descricao for e in evidencias[:20]]},
            )
            resultado.ignorados = len(evidencias)
            resultado.mensagem = (
                "Simulação: " + str(len(evidencias)) + " certificação(ões) seriam validadas automaticamente. "
                "Informe a chave da plataforma para ativar a validação real."
            )
            return resultado

        validadas = 0
        for evidencia in evidencias:
            try:
                status, corpo = chamar_api(
                    self.integracao, "POST", "/api/v1/credentials/verify",
                    corpo={"descricao": evidencia.descricao, "url": evidencia.url, "emitido_por": evidencia.emitido_por},
                )
                if status in (200, 201) and "valid" in corpo.lower():
                    evidencia.valida = True
                    evidencia.validada_em = timezone.now()
                    evidencia.save(update_fields=["valida", "validada_em"])
                    validadas += 1
                else:
                    resultado.ignorados += 1
            except Exception as exc:
                resultado.registrar_erro(evidencia.id, str(exc))
        resultado.atualizados = validadas
        resultado.mensagem = "Validadas " + str(validadas) + " certificação(ões)."
        return resultado


# ---------------------------------------------------------------------------
# Registro de conectores
# ---------------------------------------------------------------------------
CONECTORES: dict[str, type[ConectorBase]] = {
    TipoIntegracao.TEAMS: ConectorMensageria,
    TipoIntegracao.SLACK: ConectorMensageria,
    TipoIntegracao.LMS: ConectorLMS,
    TipoIntegracao.JIRA: ConectorJira,
    TipoIntegracao.AZURE_DEVOPS: ConectorJira,
    TipoIntegracao.GOOGLE_CALENDAR: ConectorCalendario,
    TipoIntegracao.OUTLOOK: ConectorCalendario,
    TipoIntegracao.RH: ConectorRH,
    TipoIntegracao.ERP: ConectorERP,
    TipoIntegracao.CRM: ConectorERP,
    TipoIntegracao.BI: ConectorBI,
    TipoIntegracao.ESCO: ConectorEsco,
    TipoIntegracao.GITHUB: ConectorGit,
    TipoIntegracao.GITLAB: ConectorGit,
    TipoIntegracao.CERTIFICADORA: ConectorCertificadora,
}


def obter_conector(integracao: Integracao) -> ConectorBase:
    classe = CONECTORES.get(integracao.tipo, ConectorBase)
    return classe(integracao)

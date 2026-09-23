"""Views das integrações, da API pública e da observabilidade."""
from __future__ import annotations

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP, tem_permissao

from .connectors import gerar_csv, gerar_ics, obter_conector
from .models import (
    EventoIntegracao,
    Integracao,
    MapeamentoCampo,
    SincronizacaoLog,
    TipoIntegracao,
    TokenAPI,
    WebhookEntrega,
)
from .serializers import (
    EventoIntegracaoSerializer,
    IntegracaoSerializer,
    MapeamentoCampoSerializer,
    SincronizacaoLogSerializer,
    TokenAPISerializer,
    WebhookEntregaSerializer,
)
from .services import (
    catalogo_integracoes,
    despachar_eventos,
    executar_sincronizacao,
    registrar_evento,
    resumo_integracoes,
    sincronizar_agendadas,
    testar_conexao,
)


class IntegracaoViewSet(viewsets.ModelViewSet):
    queryset = Integracao.objects.select_related("responsavel").prefetch_related("mapeamentos")
    serializer_class = IntegracaoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"
    permissao_escrita = "admin.ver"
    search_fields = ["nome", "descricao", "url_base"]
    filterset_fields = ["tipo", "direcao", "ativa", "status", "modo_simulacao"]
    ordering = ["tipo", "nome"]

    @action(detail=True, methods=["post"])
    def testar(self, request, pk=None):
        """Testa a conexão sem executar sincronização."""
        integracao = self.get_object()
        return Response(testar_conexao(integracao, usuario=request.user))

    @action(detail=True, methods=["post"])
    def sincronizar(self, request, pk=None):
        """Executa a sincronização agora (importar, exportar ou testar)."""
        integracao = self.get_object()
        operacao = request.data.get("operacao", "AUTO")
        if operacao not in {"AUTO", "IMPORTAR", "EXPORTAR", "TESTAR"}:
            return Response({"erro": True, "mensagem": "Operação inválida."}, status=400)
        registro = executar_sincronizacao(
            integracao,
            operacao=operacao,
            usuario=request.user,
            limite=int(request.data.get("limite", 200)),
        )
        return Response(SincronizacaoLogSerializer(registro).data, status=201)

    @action(detail=True, methods=["get"])
    def historico(self, request, pk=None):
        integracao = self.get_object()
        registros = integracao.execucoes.all()[:50]
        return Response(
            {
                "integracao": IntegracaoSerializer(integracao, context={"request": request}).data,
                "execucoes": SincronizacaoLogSerializer(registros, many=True).data,
                "total": integracao.execucoes.count(),
            }
        )

    @action(detail=True, methods=["post"], url_path="mapeamentos")
    def criar_mapeamento(self, request, pk=None):
        integracao = self.get_object()
        serializer = MapeamentoCampoSerializer(data={**request.data, "integracao": integracao.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    @action(detail=False, methods=["post"], url_path="sincronizar-agendadas")
    def sincronizar_todas(self, request):
        registros = sincronizar_agendadas(limite=int(request.data.get("limite", 10)), usuario=request.user)
        return Response(
            {
                "executadas": len(registros),
                "resultados": SincronizacaoLogSerializer(registros, many=True).data,
            }
        )


class MapeamentoCampoViewSet(viewsets.ModelViewSet):
    queryset = MapeamentoCampo.objects.select_related("integracao")
    serializer_class = MapeamentoCampoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"
    permissao_escrita = "admin.ver"
    filterset_fields = ["integracao", "transformacao", "obrigatorio"]


class SincronizacaoLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SincronizacaoLog.objects.select_related("integracao", "disparado_por")
    serializer_class = SincronizacaoLogSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"
    filterset_fields = ["integracao", "status", "operacao"]
    ordering = ["-inicio"]

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        from django.db.models import Avg, Count, Sum

        consulta = self.filter_queryset(self.get_queryset())
        return Response(
            {
                "total": consulta.count(),
                "por_status": list(consulta.values("status").annotate(total=Count("id"))),
                "criados": consulta.aggregate(t=Sum("itens_criados"))["t"] or 0,
                "atualizados": consulta.aggregate(t=Sum("itens_atualizados"))["t"] or 0,
                "com_erro": consulta.aggregate(t=Sum("itens_com_erro"))["t"] or 0,
                "duracao_media_ms": round(consulta.aggregate(m=Avg("duracao_ms"))["m"] or 0),
            }
        )


class EventoIntegracaoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EventoIntegracao.objects.all()
    serializer_class = EventoIntegracaoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"
    filterset_fields = ["tipo", "processado", "entidade", "projeto_id"]
    ordering = ["-ocorrido_em"]

    @action(detail=True, methods=["post"])
    def reprocessar(self, request, pk=None):
        evento = self.get_object()
        evento.processado = False
        evento.tentativas = 0
        evento.ultimo_erro = ""
        evento.save(update_fields=["processado", "tentativas", "ultimo_erro"])
        return Response(EventoIntegracaoSerializer(evento).data)

    @action(detail=False, methods=["post"], url_path="despachar")
    def despachar(self, request):
        resumo = despachar_eventos(
            limite=int(request.data.get("limite", 50)),
            reprocessar=bool(request.data.get("reprocessar", False)),
        )
        return Response(resumo)

    @action(detail=False, methods=["post"], url_path="simular")
    def simular(self, request):
        """Cria um evento de teste para validar a entrega dos webhooks."""
        evento = registrar_evento(
            request.data.get("tipo", "tarefa.concluida"),
            entidade="integrations.teste",
            entidade_id=0,
            titulo="Evento de teste disparado manualmente",
            payload={"origem": "teste manual", "disparado_por": request.user.nome},
        )
        resumo = despachar_eventos(limite=5)
        return Response({"evento": EventoIntegracaoSerializer(evento).data, "entrega": resumo}, status=201)


class WebhookEntregaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WebhookEntrega.objects.select_related("webhook", "evento")
    serializer_class = WebhookEntregaSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"
    filterset_fields = ["webhook", "sucesso", "status_code"]
    ordering = ["-criado_em"]


class TokenAPIViewSet(viewsets.ModelViewSet):
    queryset = TokenAPI.objects.select_related("user")
    serializer_class = TokenAPISerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "admin.ver"
    permissao_escrita = "admin.ver"
    filterset_fields = ["ativo", "user"]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PainelIntegracoesView(APIView):
    """Painel consolidado: integrações, eventos, webhooks e execuções."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        return Response(
            {
                **resumo_integracoes(),
                "catalogo": catalogo_integracoes(),
                "gerado_em": timezone.now().isoformat(),
            }
        )


class CatalogoIntegracoesView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        return Response({"catalogo": catalogo_integracoes()})


class FeedCalendarioView(APIView):
    """Feed iCalendar (.ics) com tarefas e marcos — consumível por Google/Outlook.

    Um leitor de calendário (Google Calendar, Outlook) não consegue enviar o
    cabeçalho Authorization: ele apenas busca a URL. Por isso este endpoint
    aceita duas formas de autenticação:

    1. JWT no cabeçalho — usado pelo botão de download dentro do SGP;
    2. credencial na URL (?token=...) — usada para **assinar** o feed.

    O token precisa ser uma credencial de API ativa com o escopo "calendario"
    (ou sem escopos, que vale como acesso total). Isso evita que a agenda fique
    exposta e permite revogar o acesso apagando a credencial.
    """

    authentication_classes = []
    permission_classes = []

    def _autorizado(self, request) -> tuple[bool, str]:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        from apps.integrations.models import TokenAPI

        cabecalho = request.headers.get("Authorization", "")
        if cabecalho.startswith("Bearer "):
            try:
                autenticacao = JWTAuthentication()
                resultado = autenticacao.authenticate(request)
                if resultado and tem_permissao(resultado[0], "projeto.ver"):
                    return True, ""
            except (InvalidToken, TokenError):
                pass

        token_url = request.query_params.get("token", "")
        if token_url:
            credencial = TokenAPI.objects.filter(token=token_url, ativo=True).select_related("user").first()
            if credencial and not credencial.expirado:
                escopos = credencial.escopos or []
                if not escopos or "calendario" in escopos or "*" in escopos:
                    TokenAPI.objects.filter(pk=credencial.pk).update(
                        ultimo_uso=timezone.now(), total_chamadas=credencial.total_chamadas + 1
                    )
                    return True, ""

        return False, (
            "Autenticação necessária. Use o botão de download dentro do SGP ou informe ?token= com uma "
            "credencial de API ativa que tenha o escopo 'calendario'."
        )

    def get(self, request):
        from apps.portfolio.models import Milestone
        from apps.tasks.models import Task

        autorizado, motivo = self._autorizado(request)
        if not autorizado:
            return Response({"erro": True, "mensagem": motivo}, status=status.HTTP_401_UNAUTHORIZED)

        projeto_id = request.query_params.get("project")
        tarefas = Task.objects.filter(data_fim__isnull=False, project__arquivado=False).select_related("project")
        marcos = Milestone.objects.select_related("project")
        if projeto_id:
            tarefas = tarefas.filter(project_id=projeto_id)
            marcos = marcos.filter(project_id=projeto_id)

        eventos = [
            {
                "uid": "tarefa-" + str(t.id) + "@sgp",
                "titulo": t.nome,
                "inicio": t.data_inicio or t.data_fim,
                "fim": t.data_fim,
                "descricao": (t.project.nome or "") + " · " + str(t.percentual_conclusao) + "% concluído",
            }
            for t in tarefas[:500]
        ] + [
            {
                "uid": "marco-" + str(m.id) + "@sgp",
                "titulo": "Marco: " + m.nome,
                "inicio": m.data_prevista,
                "fim": m.data_prevista,
                "descricao": m.project.nome or "",
            }
            for m in marcos[:200]
        ]
        resposta = HttpResponse(gerar_ics(eventos), content_type="text/calendar; charset=utf-8")
        resposta["Content-Disposition"] = 'attachment; filename="sgp-calendario.ics"'
        return resposta


class DatasetBIView(APIView):
    """Exporta o dataset analítico do portfólio para Power BI, Tableau ou planilha.

    Aceita JWT no cabeçalho (uso pelo SGP) ou credencial na URL
    (?token=...) com o escopo "relatorios", para que Power BI e Tableau possam
    agendar a atualização sem depender de uma sessão de navegador.
    """

    authentication_classes = []
    permission_classes = []

    def _autorizado(self, request) -> bool:
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        from apps.integrations.models import TokenAPI

        cabecalho = request.headers.get("Authorization", "")
        if cabecalho.startswith("Bearer "):
            try:
                autenticacao = JWTAuthentication()
                resultado = autenticacao.authenticate(request)
                if resultado and tem_permissao(resultado[0], "relatorio.ver"):
                    return True
            except (InvalidToken, TokenError):
                pass

        token_url = request.query_params.get("token", "")
        if token_url:
            credencial = TokenAPI.objects.filter(token=token_url, ativo=True).first()
            if credencial and not credencial.expirado:
                escopos = credencial.escopos or []
                if not escopos or "relatorios" in escopos or "*" in escopos:
                    TokenAPI.objects.filter(pk=credencial.pk).update(
                        ultimo_uso=timezone.now(), total_chamadas=credencial.total_chamadas + 1
                    )
                    return True
        return False

    def get(self, request):
        from apps.portfolio.models import Project

        if not self._autorizado(request):
            return Response(
                {"erro": True, "mensagem": "Informe o token de acesso (?token=) com escopo 'relatorios'."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        formato = (request.query_params.get("formato") or "JSON").upper()
        projetos = Project.objects.filter(arquivado=False).select_related("program", "portfolio", "manager")
        if request.query_params.get("programa"):
            projetos = projetos.filter(program_id=request.query_params["programa"])
        if request.query_params.get("area"):
            projetos = projetos.filter(area=request.query_params["area"])

        linhas = []
        for projeto in projetos[:1000]:
            evm = projeto.evm()
            linhas.append(
                {
                    "codigo": projeto.codigo,
                    "nome": projeto.nome,
                    "programa": projeto.program.nome if projeto.program_id else "",
                    "portfolio": projeto.portfolio.nome if projeto.portfolio_id else "",
                    "area": projeto.area,
                    "categoria": projeto.categoria,
                    "status": projeto.status,
                    "saude": projeto.saude,
                    "prioridade": projeto.prioridade,
                    "gerente": projeto.manager.nome if projeto.manager_id else "",
                    "inicio": projeto.data_inicio.isoformat() if projeto.data_inicio else "",
                    "fim": projeto.data_fim.isoformat() if projeto.data_fim else "",
                    "percentual_conclusao": projeto.percentual_conclusao,
                    "progresso_planejado": projeto.progresso_planejado,
                    "orcamento": float(projeto.orcamento or 0),
                    "custo_real": float(projeto.custo_real or 0),
                    "BAC": evm["BAC"],
                    "PV": evm["PV"],
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

        if formato == "CSV":
            resposta = HttpResponse(
                "\ufeff" + gerar_csv(linhas), content_type="text/csv; charset=utf-8"
            )
            resposta["Content-Disposition"] = 'attachment; filename="sgp-portfolio.csv"'
            return resposta
        return Response({"formato": "JSON", "total": len(linhas), "linhas": linhas})


class TiposIntegracaoView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        from .models import Autenticacao, Direcao, Transformacao

        return Response(
            {
                "tipos": [
                    {
                        "valor": tipo,
                        "rotulo": rotulo,
                        "tem_conector": tipo in {
                            "TEAMS", "SLACK", "LMS", "JIRA", "AZURE_DEVOPS", "GOOGLE_CALENDAR",
                            "OUTLOOK", "RH", "ERP", "CRM", "BI", "ESCO", "GITHUB", "GITLAB", "CERTIFICADORA",
                        },
                    }
                    for tipo, rotulo in TipoIntegracao.choices
                ],
                "direcoes": [{"valor": v, "rotulo": r} for v, r in Direcao.choices],
                "autenticacoes": [{"valor": v, "rotulo": r} for v, r in Autenticacao.choices],
                "transformacoes": [{"valor": v, "rotulo": r} for v, r in Transformacao.choices],
            }
        )

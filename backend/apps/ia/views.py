"""Views do assistente de IA e do servidor MCP."""
from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP

from . import mcp
from .ferramentas import REGISTRO, ferramentas_disponiveis
from .models import ConversaIA, MensagemIA
from .provedores import configuracao, provedor_efetivo
from .serializers import ConversaIASerializer, MensagemIASerializer
from .servico import conversar, estatisticas, sugestoes_para


class ConversarView(APIView):
    """Responde uma pergunta do usuário consultando os dados reais do SGP."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        pergunta = (request.data.get("mensagem") or "").strip()
        if len(pergunta) < 3:
            return Response(
                {"erro": True, "mensagem": "Escreva uma pergunta um pouco mais completa."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(pergunta) > 1000:
            return Response(
                {"erro": True, "mensagem": "A pergunta ficou longa demais. Resuma em até 1000 caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        conversa_id = request.data.get("conversa")
        try:
            conversa_id = int(conversa_id) if conversa_id else None
        except (TypeError, ValueError):
            conversa_id = None
        return Response(conversar(request.user, pergunta, conversa_id), status=status.HTTP_201_CREATED)


class ConversaViewSet(viewsets.ReadOnlyModelViewSet):
    """Histórico de conversas do próprio usuário."""

    serializer_class = ConversaIASerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ConversaIA.objects.filter(user=self.request.user).prefetch_related("mensagens")

    def destroy(self, request, *args, **kwargs):
        conversa = self.get_object()
        conversa.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def mensagens(self, request, pk=None):
        conversa = self.get_object()
        return Response(MensagemIASerializer(conversa.mensagens.all(), many=True).data)

    @action(detail=True, methods=["post"])
    def avaliar(self, request, pk=None):
        """Marca a última resposta da conversa como útil ou não."""
        conversa = self.get_object()
        ultima = conversa.mensagens.filter(papel=MensagemIA.Papel.ASSISTENTE).order_by("-criado_em").first()
        if not ultima:
            return Response(
                {"erro": True, "mensagem": "Esta conversa ainda não tem resposta para avaliar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        util = request.data.get("util")
        if util is None:
            return Response({"erro": True, "mensagem": "Informe se a resposta foi útil."}, status=400)
        ultima.util = bool(util)
        ultima.comentario = request.data.get("comentario", "") or ""
        ultima.save(update_fields=["util", "comentario"])
        return Response({"ok": True, "util": ultima.util})


class FerramentasView(APIView):
    """Catálogo das consultas que o assistente sabe fazer."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        provedor, modelo, motivo = provedor_efetivo()
        return Response(
            {
                "ferramentas": [f.como_dicionario() for f in ferramentas_disponiveis(request.user)],
                "total": len(ferramentas_disponiveis(request.user)),
                "total_geral": len(REGISTRO),
                "provedor": provedor,
                "modelo": modelo,
                "motivo": motivo,
                "disponivel": True,
            }
        )


class SugestoesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"sugestoes": sugestoes_para(request.user)})


class ConfiguracaoIAView(APIView):
    """Como o assistente está configurado, em linguagem de negócio."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        provedor, modelo, motivo = provedor_efetivo()
        cfg = configuracao()
        externo = provedor in {"openai", "anthropic"}
        return Response(
            {
                "provedor": provedor,
                "modelo": modelo,
                "motivo": motivo,
                "disponivel": True,
                "externo": externo,
                "explicacao": (
                    "As respostas usam um serviço de IA externo (" + modelo + "), sempre consultando os dados do SGP "
                    "antes de responder. Nenhum dado é enviado sem ser resultado de uma consulta sua."
                    if externo
                    else "As respostas são montadas pelo motor local do SGP: o sistema interpreta a pergunta, "
                    "consulta os dados e redige a resposta. Nenhuma informação sai do servidor."
                ),
                "chave_configurada": bool(cfg["chave"]),
                "mcp": {
                    "habilitado": True,
                    "transporte": ["stdio", "http"],
                    "endpoint": "/api/v1/ia/mcp/",
                    "comando": "python manage.py servidor_mcp --usuario <email>",
                    "ferramentas": len(ferramentas_disponiveis(request.user)),
                    "protocolo": mcp.PROTOCOL_VERSION,
                    "nome_servidor": mcp.NOME_SERVIDOR,
                },
            }
        )


class MCPView(APIView):
    """Endpoint MCP em JSON-RPC 2.0, autenticado pelo mesmo token da aplicação."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        mensagem = request.data if isinstance(request.data, dict) else {}
        if not mensagem.get("method"):
            return Response(
                mcp._erro_json(mensagem.get("id"), -32600, "Requisição inválida: informe o método."),
                status=status.HTTP_400_BAD_REQUEST,
            )
        resposta = mcp.tratar(mensagem, request.user)
        if resposta is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(resposta)

    def get(self, request):
        """Descoberta: descreve o servidor para clientes que só fazem GET."""
        return Response(
            {
                "nome": mcp.NOME_SERVIDOR,
                "versao": mcp.VERSAO_SERVIDOR,
                "protocolo": mcp.PROTOCOL_VERSION,
                "instrucoes": mcp.INSTRUCOES,
                "ferramentas": len(ferramentas_disponiveis(request.user)),
                "metodos": ["initialize", "tools/list", "tools/call", "ping"],
            }
        )


class EstatisticasIAView(APIView):
    """Uso do assistente — apoio à melhoria das respostas."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "admin.ver"

    def get(self, request):
        return Response(estatisticas())

"""Views da central de ajuda."""
from __future__ import annotations

import re
from pathlib import Path

from django.conf import settings
from django.db.models import Count, F, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP

from .models import GRUPOS, AjudaFeedback, GuiaAjuda
from .serializers import AjudaFeedbackSerializer, GuiaAjudaResumoSerializer, GuiaAjudaSerializer


class GuiaAjudaViewSet(viewsets.ModelViewSet):
    """Guias de uso por página.

    Leitura liberada a qualquer usuário autenticado — a ajuda faz parte da
    aplicação. A edição do conteúdo exige permissão de administração.
    """

    queryset = GuiaAjuda.objects.all()
    serializer_class = GuiaAjudaSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = None
    permissao_escrita = "admin.ver"
    # O resumo é uma leitura, mas com permissão própria — ver get_permissions.
    permissao_resumo = "admin.ver"
    filterset_fields = ["grupo", "ativo"]
    search_fields = ["titulo", "resumo", "para_que_serve", "rota"]
    ordering_fields = ["grupo", "ordem", "titulo", "visualizacoes"]
    ordering = ["grupo", "ordem", "titulo"]

    def get_permissions(self):
        """Permissões por ação.

        A leitura dos guias é aberta a qualquer usuário autenticado — a ajuda faz
        parte da aplicação. O envio de "foi útil?" também: quem consulta precisa
        poder avaliar. Já os indicadores de uso da ajuda são informação de gestão
        e ficam restritos a quem administra.
        """
        if self.action == "feedback":
            return [IsAuthenticated()]
        if self.action == "resumo":
            classe = PermissaoSGP()
            self.permissao_leitura = "admin.ver"
            return [classe]
        return super().get_permissions()

    def get_queryset(self):
        consulta = super().get_queryset()
        if self.action == "list" and self.request.query_params.get("todos") != "1":
            consulta = consulta.filter(ativo=True)
        return consulta

    def get_serializer_class(self):
        if self.action == "list" and self.request.query_params.get("completo") != "1":
            return GuiaAjudaResumoSerializer
        return GuiaAjudaSerializer

    def retrieve(self, request, *args, **kwargs):
        guia = self.get_object()
        GuiaAjuda.objects.filter(pk=guia.pk).update(visualizacoes=F("visualizacoes") + 1)
        guia.refresh_from_db()
        return Response(self.get_serializer(guia).data)

    @action(detail=False, methods=["get"], url_path="por-rota")
    def por_rota(self, request):
        """Guia da página que o usuário está vendo — usado pelo painel contextual."""
        caminho = request.query_params.get("rota") or request.query_params.get("caminho") or ""
        guia = GuiaAjuda.por_caminho(caminho)
        if not guia:
            return Response(
                {
                    "encontrado": False,
                    "rota": caminho,
                    "mensagem": "Ainda não há um guia para esta tela. Consulte a central de ajuda.",
                }
            )
        GuiaAjuda.objects.filter(pk=guia.pk).update(visualizacoes=F("visualizacoes") + 1)
        guia.refresh_from_db()
        dados = GuiaAjudaSerializer(guia, context={"request": request}).data
        minha = AjudaFeedback.objects.filter(guia=guia, user=request.user).first()
        return Response(
            {
                "encontrado": True,
                "guia": dados,
                "meu_feedback": AjudaFeedbackSerializer(minha).data if minha else None,
                "relacionados": GuiaAjudaResumoSerializer(
                    GuiaAjuda.objects.filter(grupo=guia.grupo, ativo=True).exclude(pk=guia.pk)[:6], many=True
                ).data,
            }
        )

    @action(detail=False, methods=["get"])
    def grupos(self, request):
        """Grupos disponíveis com a contagem de guias."""
        contagem = {
            linha["grupo"]: linha["total"]
            for linha in GuiaAjuda.objects.filter(ativo=True).values("grupo").annotate(total=Count("id"))
        }
        return Response(
            {
                "grupos": [
                    {"nome": nome, "rotulo": rotulo, "total": contagem.get(nome, 0)}
                    for nome, rotulo in GRUPOS
                    if contagem.get(nome, 0)
                ],
                "total": sum(contagem.values()),
            }
        )

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        """Indicadores da central de ajuda — quais telas precisam de mais ajuda."""
        guias = list(GuiaAjuda.objects.filter(ativo=True))
        mais_vistos = sorted(guias, key=lambda g: -g.visualizacoes)[:10]
        sem_acesso = [g for g in guias if not g.visualizacoes]
        piores = sorted([g for g in guias if g.total_avaliacoes >= 3], key=lambda g: g.percentual_util)[:5]
        return Response(
            {
                "total_guias": len(guias),
                "grupos": len({g.grupo for g in guias}),
                "visualizacoes": sum(g.visualizacoes for g in guias),
                "avaliacoes": sum(g.total_avaliacoes for g in guias),
                "percentual_util": round(
                    sum(g.marcado_util for g in guias) / max(1, sum(g.total_avaliacoes for g in guias)) * 100, 1
                ),
                "nunca_consultados": len(sem_acesso),
                "mais_vistos": GuiaAjudaResumoSerializer(mais_vistos, many=True).data,
                "menos_uteis": [
                    {
                        **GuiaAjudaResumoSerializer(g).data,
                        "percentual_util": g.percentual_util,
                        "avaliacoes": g.total_avaliacoes,
                    }
                    for g in piores
                ],
                "telas_sem_guia": self._telas_sem_guia(),
            }
        )

    def _telas_sem_guia(self) -> list[str]:
        """Rotas declaradas no frontend que ainda não têm guia — apoio à manutenção."""
        conhecidas = set(GuiaAjuda.objects.values_list("rota", flat=True))
        esperadas = [
            "/login", "/", "/analytics", "/meu-painel", "/timeline",
            "/projetos", "/projetos/novo", "/projetos/:id", "/programas", "/portfolios",
            "/marcos", "/relatorios", "/minhas-tarefas", "/kanban", "/calendario",
            "/timesheet", "/colaboracao", "/alocacao", "/matching", "/recursos",
            "/capacidade", "/capacidade/:userId", "/auditoria-vies", "/financeiro",
            "/lancamentos", "/evm", "/riscos", "/issues", "/capacidades",
            "/capacidades/skills/:id", "/matriz-skills", "/gap", "/bus-factor", "/pessoas",
            "/pessoas/:id", "/pdi", "/validacoes", "/oportunidades", "/sucessao",
            "/integracoes", "/temas", "/preferencias", "/admin/usuarios",
            "/admin/workflows", "/admin/campos", "/admin/auditoria",
        ]
        return [rota for rota in esperadas if rota not in conhecidas]

    @action(detail=True, methods=["post"])
    def feedback(self, request, pk=None):
        """Registra se o guia foi útil."""
        guia = self.get_object()
        util = bool(request.data.get("util", True))
        avaliacao, criada = AjudaFeedback.objects.update_or_create(
            guia=guia, user=request.user,
            defaults={"util": util, "comentario": request.data.get("comentario", "")},
        )
        # Recontagem simples: mantém os contadores sempre coerentes com as
        # avaliações reais, mesmo quando o usuário muda de opinião.
        avaliacoes = AjudaFeedback.objects.filter(guia=guia)
        GuiaAjuda.objects.filter(pk=guia.pk).update(
            marcado_util=avaliacoes.filter(util=True).count(),
            marcado_inutil=avaliacoes.filter(util=False).count(),
        )
        guia.refresh_from_db()
        return Response(
            {
                "avaliacao": AjudaFeedbackSerializer(avaliacao).data,
                "guia": GuiaAjudaResumoSerializer(guia).data,
                "percentual_util": guia.percentual_util,
            }
        )


class AjudaFeedbackViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AjudaFeedback.objects.select_related("guia", "user")
    serializer_class = AjudaFeedbackSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "admin.ver"
    filterset_fields = ["guia", "util", "user"]
    ordering = ["-criado_em"]


class BuscaAjudaView(viewsets.ViewSet):
    """Busca textual nos guias — alimenta a paleta de comandos e a central."""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        termo = (request.query_params.get("q") or "").strip()
        if len(termo) < 2:
            return Response({"resultados": []})
        guias = GuiaAjuda.objects.filter(ativo=True).filter(
            Q(titulo__icontains=termo)
            | Q(resumo__icontains=termo)
            | Q(para_que_serve__icontains=termo)
            | Q(rota__icontains=termo)
            | Q(grupo__icontains=termo)
        )[:10]
        return Response(
            {
                "resultados": [
                    {
                        "id": g.id,
                        "titulo": g.titulo,
                        "grupo": g.grupo,
                        "icone": g.icone,
                        "resumo": g.resumo,
                        "rota": g.rota,
                        "ajuda": True,
                    }
                    for g in guias
                ]
            }
        )

# ---------------------------------------------------------------------------
# Manual do usuário — leitura dentro da aplicação
# ---------------------------------------------------------------------------
PASTA_MANUAL: Path = Path(settings.BASE_DIR).parent / "docs"

# O nome do arquivo é validado por expressão regular e, depois, conferido contra
# o diretório resolvido: sem isso, um caminho como "../../etc/passwd" sairia da
# pasta do manual.
NOME_VALIDO = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\-]*\.md$")


def _titulo_do_markdown(conteudo: str, arquivo: str) -> str:
    """Usa o primeiro título do documento; sem ele, o nome do arquivo."""
    for linha in conteudo.splitlines():
        texto = linha.strip()
        if texto.startswith("# "):
            return texto[2:].strip()
        if texto:
            break
    return arquivo.replace(".md", "").replace("-", " ").capitalize()


def _documentos() -> list[dict]:
    if not PASTA_MANUAL.is_dir():
        return []
    lista = []
    for caminho in sorted(PASTA_MANUAL.glob("*.md")):
        if not NOME_VALIDO.match(caminho.name):
            continue
        try:
            conteudo = caminho.read_text(encoding="utf-8")
        except OSError:
            continue
        lista.append(
            {
                "arquivo": caminho.name,
                "titulo": _titulo_do_markdown(conteudo, caminho.name),
                "ordem": caminho.name,
                "linhas": conteudo.count("\n") + 1,
                "bytes": caminho.stat().st_size,
            }
        )
    return lista


class ManualView(APIView):
    """Entrega o manual em Markdown para o leitor dentro da aplicação.

    O manual vive em `docs/` na raiz do projeto e não é servido como arquivo
    estático: antes, o link apontava para `/docs/<arquivo>.md` e a interface
    respondia com o HTML da própria SPA, então o clique não abria nada. Aqui o
    conteúdo é lido do disco e devolvido como texto.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, arquivo: str | None = None):
        if arquivo is None:
            return Response({"documentos": _documentos()})

        if not NOME_VALIDO.match(arquivo):
            return Response(
                {"erro": True, "mensagem": "Nome de documento inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        caminho = (PASTA_MANUAL / arquivo).resolve()
        if caminho.parent != PASTA_MANUAL.resolve() or not caminho.is_file():
            return Response(
                {"erro": True, "mensagem": "Documento não encontrado: " + arquivo},
                status=status.HTTP_404_NOT_FOUND,
            )

        conteudo = caminho.read_text(encoding="utf-8")
        return Response(
            {
                "arquivo": arquivo,
                "titulo": _titulo_do_markdown(conteudo, arquivo),
                "linhas": conteudo.count("\n") + 1,
                "conteudo": conteudo,
            }
        )

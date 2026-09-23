"""Views de riscos: matriz interativa, heatmap e Kanban de issues."""
from __future__ import annotations

from django.db.models import Count
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP
from apps.core.services import notificar, notificar_muitos, registrar_atividade, registrar_auditoria
from apps.portfolio.models import Project

from .models import (
    NIVEIS_SEVERIDADE,
    CategoriaRisco,
    EstrategiaResposta,
    Issue,
    Risk,
    RiskHistory,
    StatusIssue,
    StatusRisco,
    TipoIssue,
    classificar_severidade,
)
from .serializers import IssueSerializer, RiskHistorySerializer, RiskSerializer


class RiskViewSet(viewsets.ModelViewSet):
    # Excluir é alçada diferente de editar: o líder cria e edita riscos, mas não
    # apaga o histórico de risco do projeto.
    permissoes_por_acao = {"destroy": "risco.excluir"}
    queryset = Risk.objects.select_related("responsavel", "project").all()
    serializer_class = RiskSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "risco.ver"
    permissao_escrita = "risco.editar"
    search_fields = ["descricao", "causa", "efeito", "codigo", "plano_resposta"]
    filterset_fields = ["project", "categoria", "status", "nivel", "estrategia", "responsavel"]
    ordering_fields = ["severidade", "probabilidade", "impacto", "data_identificacao", "data_limite"]
    ordering = ["-severidade"]

    def perform_create(self, serializer):
        risco = serializer.save(criado_por=self.request.user)
        RiskHistory.objects.create(
            risk=risco, probabilidade=risco.probabilidade, impacto=risco.impacto,
            severidade=risco.severidade, status=risco.status, comentario="Risco identificado",
            registrado_por=self.request.user,
        )
        registrar_auditoria(entidade="risks.risk", acao="CRIAR", instancia=risco)
        registrar_atividade(
            verbo="registrou o risco", entidade="risks.risk", entidade_id=risco.id,
            entidade_nome=risco.descricao[:80], projeto_id=risco.project_id,
        )
        if risco.nivel in {"ALTO", "EXTREMO"}:
            gestores = [risco.project.manager, risco.responsavel]
            notificar_muitos(
                [g for g in gestores if g],
                f"Risco {risco.nivel.lower()} em {risco.project.nome}",
                mensagem=risco.descricao[:180], nivel="CRITICO", icone="shield-alert",
                link=f"/riscos/{risco.id}",
            )

    def perform_update(self, serializer):
        anterior = serializer.instance
        valores_antes = {
            "probabilidade": anterior.probabilidade, "impacto": anterior.impacto,
            "severidade": anterior.severidade, "status": anterior.status,
        }
        risco = serializer.save()
        if (
            valores_antes["probabilidade"] != risco.probabilidade
            or valores_antes["impacto"] != risco.impacto
            or valores_antes["status"] != risco.status
        ):
            RiskHistory.objects.create(
                risk=risco, probabilidade=risco.probabilidade, impacto=risco.impacto,
                severidade=risco.severidade, status=risco.status,
                comentario=serializer.context["request"].data.get("comentario", "Atualização"),
                registrado_por=serializer.context["request"].user,
            )
        registrar_auditoria(
            entidade="risks.risk", acao="ATUALIZAR", instancia=risco, anteriores=valores_antes
        )

    @action(detail=False, methods=["get"])
    def matriz(self, request):
        """Matriz probabilidade × impacto 5×5 (RF-23/RF-26)."""
        qs = self.filter_queryset(self.get_queryset()).exclude(status=StatusRisco.ENCERRADO)
        celulas = []
        for probabilidade in range(5, 0, -1):
            for impacto in range(1, 6):
                severidade = probabilidade * impacto
                chave, rotulo, cor = classificar_severidade(severidade)
                riscos = [r for r in qs if r.probabilidade == probabilidade and r.impacto == impacto]
                celulas.append(
                    {
                        "probabilidade": probabilidade, "impacto": impacto,
                        "severidade": severidade, "nivel": chave, "rotulo": rotulo, "cor": cor,
                        "total": len(riscos),
                        "riscos": [
                            {
                                "id": r.id, "codigo": r.codigo, "descricao": r.descricao[:100],
                                "nivel": r.nivel, "status": r.status, "cor": r.cor,
                                "project_id": r.project_id, "projeto": r.project.nome,
                                "responsavel": r.responsavel.nome if r.responsavel_id else "",
                            }
                            for r in riscos
                        ],
                    }
                )
        return Response(
            {
                "celulas": celulas,
                "total": qs.count(),
                "escala": [{"valor": i, "cor": classificar_severidade(i * i)[2]} for i in range(1, 6)],
                "legenda": [
                    {"nivel": chave, "rotulo": rotulo, "cor": cor, "ate": limite}
                    for limite, chave, rotulo, cor in NIVEIS_SEVERIDADE
                ],
                "por_categoria": list(qs.values("categoria").annotate(total=Count("id")).order_by("-total")),
                "por_estrategia": list(qs.values("estrategia").annotate(total=Count("id")).order_by("-total")),
            }
        )

    @action(detail=True, methods=["post"], url_path="mover")
    def mover(self, request, pk=None):
        """Arrastar o risco dentro da matriz (UC-05)."""
        risco = self.get_object()
        probabilidade = int(request.data.get("probabilidade", risco.probabilidade))
        impacto = int(request.data.get("impacto", risco.impacto))
        if not (1 <= probabilidade <= 5) or not (1 <= impacto <= 5):
            return Response({"erro": True, "mensagem": "Valores fora da escala 1–5."}, status=400)
        anterior = risco.severidade
        risco.probabilidade = probabilidade
        risco.impacto = impacto
        risco.posicao_matriz_x = request.data.get("posicao_matriz_x")
        risco.posicao_matriz_y = request.data.get("posicao_matriz_y")
        risco.save()
        RiskHistory.objects.create(
            risk=risco, probabilidade=probabilidade, impacto=impacto, severidade=risco.severidade,
            status=risco.status, comentario=request.data.get("comentario", "Reposicionado na matriz"),
            registrado_por=request.user,
        )
        registrar_atividade(
            verbo="reposicionou o risco", entidade="risks.risk", entidade_id=risco.id,
            entidade_nome=risco.codigo, projeto_id=risco.project_id,
            meta={"severidade_anterior": anterior, "severidade_nova": risco.severidade},
        )
        return Response(RiskSerializer(risco, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="plano-resposta")
    def plano_resposta(self, request, pk=None):
        risco = self.get_object()
        risco.plano_resposta = request.data.get("plano_resposta", risco.plano_resposta)
        risco.contingencia = request.data.get("contingencia", risco.contingencia)
        risco.estrategia = request.data.get("estrategia", risco.estrategia)
        if "prob_residual" in request.data:
            risco.prob_residual = int(request.data["prob_residual"])
        if "imp_residual" in request.data:
            risco.imp_residual = int(request.data["imp_residual"])
        if "data_limite" in request.data and request.data["data_limite"]:
            risco.data_limite = request.data["data_limite"]
        if "responsavel" in request.data:
            risco.responsavel_id = request.data["responsavel"] or None
        risco.status = StatusRisco.PLANEJADO
        risco.save()
        registrar_auditoria(entidade="risks.risk", acao="ATUALIZAR", instancia=risco, justificativa="Plano de resposta")
        if risco.responsavel_id:
            notificar(
                risco.responsavel, f"Plano de resposta atribuído: {risco.codigo}",
                mensagem=risco.plano_resposta[:180], nivel="ALERTA", icone="clipboard-list",
                link=f"/riscos/{risco.id}",
            )
        return Response(RiskSerializer(risco, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def heatmap(self, request):
        """Heatmap de riscos por projeto e categoria (RF-26)."""
        qs = self.filter_queryset(self.get_queryset()).exclude(status=StatusRisco.ENCERRADO)
        projetos = {}
        for risco in qs.select_related("project"):
            item = projetos.setdefault(
                risco.project_id,
                {
                    "project_id": risco.project_id, "projeto": risco.project.nome,
                    "cor": risco.project.cor, "total": 0, "severidade_total": 0,
                    "por_nivel": {"BAIXO": 0, "MEDIO": 0, "ALTO": 0, "EXTREMO": 0},
                    "por_categoria": {},
                },
            )
            item["total"] += 1
            item["severidade_total"] += risco.severidade
            item["por_nivel"][risco.nivel] = item["por_nivel"].get(risco.nivel, 0) + 1
            item["por_categoria"][risco.categoria] = item["por_categoria"].get(risco.categoria, 0) + 1
        lista = list(projetos.values())
        for item in lista:
            item["severidade_media"] = round(item["severidade_total"] / item["total"], 1) if item["total"] else 0
            item["indice_risco"] = round(min(100.0, item["severidade_media"] / 25 * 100), 1)
        return Response({"projetos": sorted(lista, key=lambda i: -i["indice_risco"])})

    @action(detail=True, methods=["get"])
    def historico(self, request, pk=None):
        risco = self.get_object()
        return Response(
            {
                "risco": RiskSerializer(risco, context={"request": request}).data,
                "historico": RiskHistorySerializer(risco.historico.all(), many=True).data,
            }
        )


class RiskHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RiskHistory.objects.select_related("risk", "registrado_por").all()
    serializer_class = RiskHistorySerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "risco.ver"
    filterset_fields = ["risk"]


class IssueViewSet(viewsets.ModelViewSet):
    # Mesma alçada do risco: quem não apaga risco não apaga issue.
    permissoes_por_acao = {"destroy": "risco.excluir"}
    queryset = Issue.objects.select_related("responsavel", "project", "reportado_por").all()
    serializer_class = IssueSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "risco.ver"
    permissao_escrita = "risco.editar"
    search_fields = ["titulo", "descricao", "codigo"]
    filterset_fields = ["project", "tipo", "status", "prioridade", "responsavel"]
    ordering_fields = ["prioridade", "data_abertura", "data_limite", "posicao_visual"]
    ordering = ["-prioridade", "-data_abertura"]

    def perform_create(self, serializer):
        issue = serializer.save(reportado_por=self.request.user)
        registrar_auditoria(entidade="risks.issue", acao="CRIAR", instancia=issue)
        if issue.responsavel_id:
            notificar(
                issue.responsavel, f"Nova {issue.get_tipo_display().lower()}: {issue.codigo}",
                mensagem=issue.titulo, nivel="ALERTA", icone="alert-circle",
                link=f"/projetos/{issue.project_id}?issue={issue.id}",
            )

    @action(detail=False, methods=["get"])
    def kanban(self, request):
        """Kanban dedicado de issues e ações corretivas (RF-25)."""
        qs = self.filter_queryset(self.get_queryset())
        colunas = []
        for chave, rotulo in StatusIssue.choices:
            itens = sorted([i for i in qs if i.status == chave], key=lambda i: i.posicao_visual)
            colunas.append(
                {
                    "status": chave, "rotulo": rotulo, "total": len(itens),
                    "items": IssueSerializer(itens, many=True, context={"request": request}).data,
                }
            )
        return Response(
            {
                "colunas": colunas,
                "total": qs.count(),
                "atrasadas": sum(1 for i in qs if i.atrasada),
                "por_tipo": list(qs.values("tipo").annotate(total=Count("id"))),
            }
        )

    @action(detail=True, methods=["post"], url_path="mover")
    def mover(self, request, pk=None):
        issue = self.get_object()
        novo = request.data.get("status")
        if novo not in dict(StatusIssue.choices):
            return Response({"erro": True, "mensagem": "Status inválido."}, status=400)
        issue.status = novo
        if "posicao_visual" in request.data:
            issue.posicao_visual = float(request.data["posicao_visual"])
        if novo in {StatusIssue.RESOLVIDA, StatusIssue.FECHADA}:
            issue.data_resolucao = timezone.localdate()
        issue.save()
        registrar_atividade(
            verbo=f"moveu {issue.codigo} para {issue.get_status_display()}",
            entidade="risks.issue", entidade_id=issue.id, entidade_nome=issue.titulo,
            projeto_id=issue.project_id,
        )
        return Response(IssueSerializer(issue, context={"request": request}).data)

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        qs = self.filter_queryset(self.get_queryset())
        abertas = qs.exclude(status__in=[StatusIssue.RESOLVIDA, StatusIssue.FECHADA, StatusIssue.CANCELADA])
        return Response(
            {
                "total": qs.count(),
                "abertas": abertas.count(),
                "atrasadas": sum(1 for i in abertas if i.atrasada),
                "tempo_medio_resolucao": round(
                    sum(i.idade_dias for i in qs.exclude(data_resolucao__isnull=True))
                    / max(1, qs.exclude(data_resolucao__isnull=True).count()),
                    1,
                ),
                "por_status": list(qs.values("status").annotate(total=Count("id"))),
                "por_tipo": list(qs.values("tipo").annotate(total=Count("id"))),
                "por_prioridade": list(abertas.values("prioridade").annotate(total=Count("id"))),
            }
        )


class PainelRiscosView(APIView):
    """Dashboard consolidado de riscos do portfólio (RF-26/§8.1)."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "risco.ver"

    def get(self, request):
        riscos = Risk.objects.select_related("project", "responsavel").exclude(status=StatusRisco.ENCERRADO)
        if request.query_params.get("project"):
            riscos = riscos.filter(project_id=request.query_params["project"])
        issues = Issue.objects.select_related("project").exclude(
            status__in=[StatusIssue.RESOLVIDA, StatusIssue.FECHADA, StatusIssue.CANCELADA]
        )
        return Response(
            {
                "total_riscos": riscos.count(),
                "por_nivel": [
                    {"nivel": n, "total": riscos.filter(nivel=n).count()}
                    for n in ["BAIXO", "MEDIO", "ALTO", "EXTREMO"]
                ],
                "por_categoria": list(riscos.values("categoria").annotate(total=Count("id")).order_by("-total")),
                "por_estrategia": list(riscos.values("estrategia").annotate(total=Count("id")).order_by("-total")),
                "exposicao_total": round(sum(r.exposicao for r in riscos), 2),
                "custo_mitigacao": float(sum(r.custo_mitigacao or 0 for r in riscos)),
                "top_riscos": RiskSerializer(riscos.order_by("-severidade")[:15], many=True, context={"request": request}).data,
                "riscos_atrasados": RiskSerializer(
                    [r for r in riscos if r.atrasado][:15], many=True, context={"request": request}
                ).data,
                "matriz_resumo": [
                    {
                        "probabilidade": p, "impacto": i, "severidade": p * i,
                        "nivel": classificar_severidade(p * i)[0],
                        "cor": classificar_severidade(p * i)[2],
                        "total": riscos.filter(probabilidade=p, impacto=i).count(),
                    }
                    for p in range(5, 0, -1) for i in range(1, 6)
                ],
                "issues": {
                    "abertas": issues.count(),
                    "atrasadas": sum(1 for i in issues if i.atrasada),
                    "por_tipo": list(issues.values("tipo").annotate(total=Count("id"))),
                    "por_prioridade": list(issues.values("prioridade").annotate(total=Count("id"))),
                    "por_projeto": list(
                        issues.values("project__nome", "project__cor").annotate(total=Count("id")).order_by("-total")[:10]
                    ),
                },
                "por_projeto": [
                    {
                        "project_id": p.id, "projeto": p.nome, "cor": p.cor,
                        "riscos": p.riscos.exclude(status=StatusRisco.ENCERRADO).count(),
                        "criticos": p.riscos.filter(nivel__in=["ALTO", "EXTREMO"]).exclude(status=StatusRisco.ENCERRADO).count(),
                        "severidade_media": round(
                            sum(r.severidade for r in p.riscos.exclude(status=StatusRisco.ENCERRADO))
                            / max(1, p.riscos.exclude(status=StatusRisco.ENCERRADO).count()), 1
                        ),
                    }
                    for p in Project.objects.filter(arquivado=False)
                ],
                "categorias": [{"valor": v, "rotulo": r} for v, r in CategoriaRisco.choices],
                "estrategias": [{"valor": v, "rotulo": r} for v, r in EstrategiaResposta.choices],
                "tipos_issue": [{"valor": v, "rotulo": r} for v, r in TipoIssue.choices],
                "gerado_em": timezone.now().isoformat(),
            }
        )

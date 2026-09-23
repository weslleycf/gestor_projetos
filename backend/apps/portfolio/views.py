"""Views do portfólio: CRUD, Gantt, timeline, baselines e dashboard executivo."""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP, tem_permissao
from apps.core.services import notificar_muitos, registrar_atividade, registrar_auditoria
from apps.tasks.models import Task
from apps.tasks.services import calcular_caminho_critico, widgets_disponiveis

from .models import (
    Baseline,
    CampoCustomizado,
    KPI,
    LicaoAprendida,
    Milestone,
    Portfolio,
    Prioridade,
    Program,
    Project,
    Saude,
    StatusProjeto,
    ValorCampoCustomizado,
    Workflow,
    WorkflowState,
    WorkflowTransition,
)
from .serializers import (
    BaselineSerializer,
    CampoCustomizadoSerializer,
    KPISerializer,
    LicaoAprendidaSerializer,
    MilestoneSerializer,
    PortfolioSerializer,
    ProgramSerializer,
    ProjectResumoSerializer,
    ProjectSerializer,
    WorkflowSerializer,
    WorkflowStateSerializer,
    WorkflowTransitionSerializer,
)


class PortfolioViewSet(viewsets.ModelViewSet):
    queryset = Portfolio.objects.select_related("responsavel").all()
    serializer_class = PortfolioSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "portfolio.ver"
    permissao_escrita = "portfolio.editar"
    search_fields = ["nome", "descricao"]
    filterset_fields = ["status"]
    ordering = ["nome"]

    def perform_create(self, serializer):
        obj = serializer.save()
        registrar_auditoria(entidade="portfolio.portfolio", acao="CRIAR", instancia=obj)

    def perform_update(self, serializer):
        obj = serializer.save()
        registrar_auditoria(entidade="portfolio.portfolio", acao="ATUALIZAR", instancia=obj)


class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.select_related("gerente", "portfolio").all()
    serializer_class = ProgramSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "programa.ver"
    permissao_escrita = "programa.editar"
    search_fields = ["nome", "descricao"]
    filterset_fields = ["status", "portfolio"]


class ProjectViewSet(viewsets.ModelViewSet):
    # Apagar um projeto é irreversível e restrito ao PMO e ao administrador.
    permissoes_por_acao = {"destroy": "projeto.excluir"}
    queryset = Project.objects.select_related("manager", "sponsor", "program", "portfolio").all()
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "projeto.editar"
    search_fields = ["nome", "codigo", "descricao", "objetivo", "categoria", "area"]
    filterset_fields = ["status", "saude", "prioridade", "criticidade", "categoria", "area",
                        "program", "portfolio", "manager", "sponsor", "arquivado"]
    ordering_fields = ["nome", "data_fim", "data_inicio", "prioridade", "orcamento",
                       "percentual_conclusao", "atualizado_em"]
    ordering = ["-prioridade", "nome"]

    def get_serializer_class(self):
        if self.action == "list" and self.request.query_params.get("resumo") == "1":
            return ProjectResumoSerializer
        if self.action in {"cards", "timeline"}:
            return ProjectResumoSerializer
        return ProjectSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list" and self.request.query_params.get("resumo") == "1":
            return qs
        return qs.prefetch_related("tarefas", "riscos", "marcos", "alocacoes")

    def perform_create(self, serializer):
        projeto = serializer.save(criado_por=self.request.user)
        registrar_auditoria(entidade="portfolio.project", acao="CRIAR", instancia=projeto)
        registrar_atividade(
            verbo="criou o projeto", entidade="portfolio.project", entidade_id=projeto.id,
            entidade_nome=projeto.nome, projeto_id=projeto.id,
        )

    def perform_update(self, serializer):
        anteriores = ProjectSerializer(serializer.instance).data
        projeto = serializer.save()
        registrar_auditoria(
            entidade="portfolio.project", acao="ATUALIZAR", instancia=projeto, anteriores=dict(anteriores)
        )
        registrar_atividade(
            verbo="atualizou o projeto", entidade="portfolio.project", entidade_id=projeto.id,
            entidade_nome=projeto.nome, projeto_id=projeto.id,
        )

    def perform_destroy(self, instance):
        registrar_auditoria(entidade="portfolio.project", acao="EXCLUIR", instancia=instance)
        instance.delete()

    # ------------------------------------------------------------- visualizações
    @action(detail=False, methods=["get"])
    def cards(self, request):
        """Cards visuais do portfólio com semáforo de saúde (RF-06/UC-04)."""
        qs = self.filter_queryset(self.get_queryset()).filter(arquivado=False)
        dados = ProjectResumoSerializer(qs[:300], many=True, context={"request": request}).data
        return Response({"total": qs.count(), "projetos": dados})

    @action(detail=False, methods=["get"])
    def timeline(self, request):
        """Timeline macro do portfólio com zoom por período (DV-02)."""
        qs = self.filter_queryset(self.get_queryset()).filter(arquivado=False)
        inicio = request.query_params.get("inicio")
        fim = request.query_params.get("fim")
        if inicio and fim:
            qs = qs.filter(data_inicio__lte=fim, data_fim__gte=inicio)
        projetos = list(qs.select_related("manager", "program")[:400])
        hoje = timezone.localdate()
        return Response(
            {
                "hoje": hoje.isoformat(),
                "projetos": [
                    {
                        "id": p.id, "codigo": p.codigo, "nome": p.nome, "cor": p.cor, "icone": p.icone,
                        "inicio": p.data_inicio, "fim": p.data_fim, "saude": p.saude,
                        "status": p.status, "status_rotulo": p.get_status_display(),
                        "prioridade": p.prioridade, "percentual": p.percentual_conclusao,
                        "progresso_planejado": p.progresso_planejado,
                        "gerente": p.manager.nome if p.manager_id else "",
                        "programa": p.program.nome if p.program_id else "",
                        "atrasado": p.atrasado, "orcamento": float(p.orcamento),
                        "tarefas": p.tarefas.count(),
                        "marcos": [
                            {"id": m.id, "nome": m.nome, "data": m.data_prevista, "status": m.status,
                             "critico": m.critico}
                            for m in p.marcos.all()[:12]
                        ],
                    }
                    for p in projetos
                ],
            }
        )

    @action(detail=True, methods=["get"])
    def cronograma(self, request, pk=None):
        """Estrutura completa do Gantt: tarefas, dependências, marcos e caminho crítico."""
        projeto = self.get_object()
        tarefas = projeto.tarefas.select_related("responsavel").prefetch_related("subtarefas")
        deps = []
        for dependencia in __import__("apps.tasks.models", fromlist=["TaskDependency"]).TaskDependency.objects.filter(
            predecessor__project=projeto
        ):
            deps.append(
                {
                    "id": dependencia.id, "predecessor": dependencia.predecessor_id,
                    "successor": dependencia.successor_id, "tipo": dependencia.tipo, "lag": dependencia.lag,
                }
            )
        baseline_ativa = projeto.baselines.filter(ativa=True).first()
        return Response(
            {
                "projeto": ProjectSerializer(projeto, context={"request": request}).data,
                "tarefas": [
                    {
                        "id": t.id, "nome": t.nome, "wbs": t.wbs, "parent": t.parent_id,
                        "nivel": t.nivel, "inicio": t.data_inicio, "fim": t.data_fim,
                        "inicio_real": t.data_inicio_real, "fim_real": t.data_fim_real,
                        "esforco": float(t.esforco_estimado or 0), "esforco_real": float(t.esforco_real or 0),
                        "percentual": t.percentual_conclusao, "status": t.status,
                        "status_rotulo": t.get_status_display(), "prioridade": t.prioridade,
                        "cor": t.cor or projeto.cor, "icone": t.icone,
                        "responsavel": t.responsavel_id,
                        "responsavel_nome": t.responsavel.nome if t.responsavel_id else "",
                        "responsavel_cor": t.responsavel.cor if t.responsavel_id else "",
                        "responsavel_iniciais": t.responsavel.iniciais if t.responsavel_id else "",
                        "is_marco": t.is_marco, "critica": t.critica, "folga": t.folga_dias,
                        "atrasada": t.atrasada, "duracao": t.duracao_dias,
                        "progresso_planejado": t.progresso_planejado,
                        "tags": t.tags, "posicao": t.ordem,
                        "total_subtarefas": t.subtarefas.count(),
                    }
                    for t in tarefas
                ],
                "dependencias": deps,
                "marcos": MilestoneSerializer(projeto.marcos.all(), many=True).data,
                "baseline": BaselineSerializer(baseline_ativa).data if baseline_ativa else None,
                "caminho_critico": [t.id for t in tarefas if t.critica],
            }
        )

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        """Dashboard do projeto: KPIs, EVM, riscos, marcos e burndown (RF-28)."""
        from apps.finance.services import calcular_evm, consumo_por_categoria, curva_s
        from apps.resources.services import detectar_conflitos
        from apps.risks.models import Risk, StatusRisco
        from apps.tasks.services import cruzar_baseline

        projeto = self.get_object()
        tarefas = list(projeto.tarefas.all())
        riscos = projeto.riscos.all()
        return Response(
            {
                "projeto": ProjectResumoSerializer(projeto, context={"request": request}).data,
                "progresso": {
                    "percentual": projeto.percentual_conclusao,
                    "planejado": projeto.progresso_planejado,
                    "desvio": round(projeto.progresso_planejado - projeto.percentual_conclusao, 2),
                    "tarefas_total": len(tarefas),
                    "tarefas_concluidas": sum(1 for t in tarefas if t.status == "CONCLUIDA"),
                    "tarefas_atrasadas": sum(1 for t in tarefas if t.atrasada),
                    "tarefas_criticas": sum(1 for t in tarefas if t.critica),
                    "horas_estimadas": round(sum(float(t.esforco_estimado or 0) for t in tarefas), 1),
                    "horas_realizadas": round(sum(float(t.esforco_real or 0) for t in tarefas), 1),
                },
                "evm": calcular_evm(projeto),
                "curva_s": curva_s(projeto),
                "orcamento": consumo_por_categoria(projeto),
                "burndown": cruzar_baseline(projeto),
                "riscos": {
                    "total": riscos.count(),
                    "abertos": riscos.exclude(status=StatusRisco.ENCERRADO).count(),
                    "criticos": riscos.filter(nivel__in=["ALTO", "EXTREMO"]).exclude(status=StatusRisco.ENCERRADO).count(),
                    "por_nivel": list(
                        riscos.exclude(status=StatusRisco.ENCERRADO).values("nivel").annotate(total=Count("id"))
                    ),
                    "top": [
                        {
                            "id": r.id, "codigo": r.codigo, "descricao": r.descricao, "nivel": r.nivel,
                            "severidade": r.severidade, "cor": r.cor, "probabilidade": r.probabilidade,
                            "impacto": r.impacto, "status": r.status,
                            "responsavel": r.responsavel.nome if r.responsavel_id else "",
                        }
                        for r in riscos.exclude(status=StatusRisco.ENCERRADO).order_by("-severidade")[:8]
                    ],
                },
                "marcos": MilestoneSerializer(
                    projeto.marcos.order_by("data_prevista")[:20], many=True
                ).data,
                "kpis": KPISerializer(projeto.kpis.all(), many=True).data,
                "conflitos_recursos": detectar_conflitos(project_id=projeto.id)[:10],
                "tarefas_por_status": list(tarefas.values("status").annotate(total=Count("id"))) if False else [
                    {"status": chave, "total": sum(1 for t in tarefas if t.status == chave)}
                    for chave, _ in Task._meta.get_field("status").choices
                ],
                "por_responsavel": _carga_por_responsavel(tarefas),
            }
        )

    @action(detail=True, methods=["post"], url_path="criar-baseline")
    def criar_baseline(self, request, pk=None):
        projeto = self.get_object()
        nome = request.data.get("nome", "")
        descricao = request.data.get("descricao", "")
        snapshot = {
            "tarefas": [
                {
                    "id": t.id, "nome": t.nome,
                    "data_inicio": t.data_inicio.isoformat() if t.data_inicio else None,
                    "data_fim": t.data_fim.isoformat() if t.data_fim else None,
                    "esforco_estimado": float(t.esforco_estimado or 0),
                    "percentual_conclusao": t.percentual_conclusao,
                }
                for t in projeto.tarefas.all()
            ],
            "orcamento": float(projeto.orcamento),
            "data_inicio": projeto.data_inicio.isoformat() if projeto.data_inicio else None,
            "data_fim": projeto.data_fim.isoformat() if projeto.data_fim else None,
        }
        baseline = Baseline.objects.create(
            project=projeto, nome=nome or f"Baseline {timezone.localdate():%d/%m/%Y}",
            descricao=descricao, snapshot_json=snapshot, data_inicio=projeto.data_inicio,
            data_fim=projeto.data_fim, orcamento=projeto.orcamento, ativa=True,
            criado_por=request.user,
        )
        registrar_auditoria(entidade="portfolio.baseline", acao="CRIAR", instancia=baseline)
        return Response(BaselineSerializer(baseline).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="comparar-baseline/(?P<baseline_id>[^/.]+)")
    def comparar_baseline(self, request, pk=None, baseline_id=None):
        projeto = self.get_object()
        baseline = projeto.baselines.filter(pk=baseline_id).first()
        if not baseline:
            return Response({"erro": True, "mensagem": "Linha de base não encontrada."}, status=404)
        return Response(baseline.comparar())

    @action(detail=True, methods=["post"])
    def recalcular(self, request, pk=None):
        projeto = self.get_object()
        projeto.calcular_progresso()
        projeto.recalcular_saude()
        cpm = calcular_caminho_critico(projeto.id)
        registrar_atividade(
            verbo="recalculou o cronograma", entidade="portfolio.project",
            entidade_id=projeto.id, entidade_nome=projeto.nome, projeto_id=projeto.id,
        )
        return Response({"ok": True, "progresso": projeto.percentual_conclusao,
                         "saude": projeto.saude, "caminho_critico": cpm})

    @action(detail=True, methods=["post"])
    def encerrar(self, request, pk=None):
        """Encerra o projeto registrando lições aprendidas (RF-05)."""
        projeto = self.get_object()
        projeto.licoes_aprendidas = request.data.get("licoes_aprendidas", projeto.licoes_aprendidas)
        projeto.status = StatusProjeto.CONCLUIDO
        projeto.data_fim_real = timezone.localdate()
        projeto.percentual_conclusao = 100
        projeto.arquivado = bool(request.data.get("arquivar", False))
        projeto.recalcular_saude()
        projeto.save()
        registrar_auditoria(
            entidade="portfolio.project", acao="APROVAR", instancia=projeto,
            justificativa="Encerramento do projeto",
        )
        participantes = {projeto.manager, projeto.sponsor}
        notificar_muitos(
            [p for p in participantes if p],
            f"Projeto encerrado: {projeto.nome}",
            mensagem="Lições aprendidas registradas.", nivel="SUCESSO", icone="flag",
            link=f"/projetos/{projeto.id}",
        )
        return Response(ProjectSerializer(projeto, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="assistente/catalogo")
    def assistente_catalogo(self, request):
        """Dados de apoio para o assistente visual de 4 passos (RF-01)."""
        from apps.capabilities.models import Skill

        return Response(
            {
                "passos": [
                    {"numero": 1, "titulo": "Cartão do projeto", "icone": "layout-dashboard",
                     "descricao": "Nome, ícone, cor, patrocinador, gerente e orçamento."},
                    {"numero": 2, "titulo": "Timeline arrastável", "icone": "gantt-chart",
                     "descricao": "Início, fim e marcos arrastáveis."},
                    {"numero": 3, "titulo": "Capacidades requeridas", "icone": "sparkles",
                     "descricao": "Chips clicáveis de skills com nível mínimo."},
                    {"numero": 4, "titulo": "Equipe sugerida", "icone": "users",
                     "descricao": "Cards de pessoas ranqueados pelo motor de alocação."},
                ],
                "icones": [
                    "folder-kanban", "rocket", "target", "shield", "cloud", "database", "smartphone",
                    "globe", "cpu", "chart-line", "building", "heart-pulse", "truck", "graduation-cap",
                ],
                "cores": ["#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981",
                          "#06B6D4", "#6366F1", "#84CC16", "#F97316"],
                "categorias": ["Transformação Digital", "Infraestrutura", "Produto", "Compliance",
                               "Dados & Analytics", "Experiência do Cliente", "Segurança",
                               "Integração", "Modernização"],
                "areas": list(
                    Project.objects.exclude(area="").values_list("area", flat=True).distinct().order_by("area")
                ) or ["Tecnologia", "Negócios", "Operações", "Financeiro", "Pessoas"],
                "skills": [
                    {
                        "id": s.id, "nome": s.nome, "icone": s.icone, "cor": s.cor,
                        "tipo": s.tipo, "criticidade": s.criticidade,
                        "categoria": s.categoria.nome if s.categoria_id else "",
                    }
                    for s in Skill.objects.filter(status__in=["ATIVA", "EMERGENTE"]).order_by("nome")[:400]
                ],
                "gerentes": [
                    {"id": u.id, "nome": u.nome, "cargo": u.cargo, "cor": u.cor, "iniciais": u.iniciais}
                    for u in __import__("apps.core.models", fromlist=["User"]).User.objects.filter(
                        ativo=True, perfil__in=["GERENTE", "PMO", "LIDER", "ADMIN"]
                    ).order_by("nome")
                ],
            }
        )


def _carga_por_responsavel(tarefas: list) -> list[dict]:
    agrupado: dict[int, dict] = {}
    for tarefa in tarefas:
        if not tarefa.responsavel_id:
            continue
        item = agrupado.setdefault(
            tarefa.responsavel_id,
            {
                "user_id": tarefa.responsavel_id, "nome": tarefa.responsavel.nome,
                "cor": tarefa.responsavel.cor, "iniciais": tarefa.responsavel.iniciais,
                "total": 0, "concluidas": 0, "atrasadas": 0, "horas": 0.0,
            },
        )
        item["total"] += 1
        item["horas"] += float(tarefa.esforco_estimado or 0)
        if tarefa.status == "CONCLUIDA":
            item["concluidas"] += 1
        if tarefa.atrasada:
            item["atrasadas"] += 1
    return sorted(agrupado.values(), key=lambda i: -i["total"])


class MilestoneViewSet(viewsets.ModelViewSet):
    # Mesma alçada do projeto: quem não apaga o projeto não apaga o marco dele.
    permissoes_por_acao = {"destroy": "projeto.excluir"}
    queryset = Milestone.objects.select_related("responsavel", "project").all()
    serializer_class = MilestoneSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "projeto.editar"
    filterset_fields = ["project", "status", "critico", "responsavel"]
    ordering = ["data_prevista"]


class KPIViewSet(viewsets.ModelViewSet):
    queryset = KPI.objects.select_related("project").all()
    serializer_class = KPISerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "projeto.editar"
    filterset_fields = ["project"]


class BaselineViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Baseline.objects.select_related("project", "criado_por").all()
    serializer_class = BaselineSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    filterset_fields = ["project", "ativa"]

    @action(detail=True, methods=["get"])
    def comparar(self, request, pk=None):
        return Response(self.get_object().comparar())


class LicaoAprendidaViewSet(viewsets.ModelViewSet):
    queryset = LicaoAprendida.objects.select_related("autor", "project").all()
    serializer_class = LicaoAprendidaSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "projeto.editar"
    filterset_fields = ["project", "categoria", "impacto"]

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)


class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.prefetch_related("estados", "transicoes").all()
    serializer_class = WorkflowSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "workflow.editar"


class WorkflowStateViewSet(viewsets.ModelViewSet):
    queryset = WorkflowState.objects.select_related("workflow").all()
    serializer_class = WorkflowStateSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "workflow.editar"
    filterset_fields = ["workflow"]


class WorkflowTransitionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowTransition.objects.select_related("de", "para").all()
    serializer_class = WorkflowTransitionSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "workflow.editar"
    filterset_fields = ["workflow"]


class CampoCustomizadoViewSet(viewsets.ModelViewSet):
    queryset = CampoCustomizado.objects.all()
    serializer_class = CampoCustomizadoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    permissao_escrita = "admin.ver"
    filterset_fields = ["entidade", "ativo", "secao"]

    @action(detail=False, methods=["get"])
    def schema(self, request):
        entidade = request.query_params.get("entidade", "portfolio.project")
        campos = CampoCustomizado.objects.filter(entidade=entidade, ativo=True)
        return Response(
            {
                "entidade": entidade,
                "campos": CampoCustomizadoSerializer(campos, many=True).data,
                "secoes": sorted({c.secao or "Geral" for c in campos}),
            }
        )


class DashboardExecutivoView(APIView):
    """Dashboard executivo do portfólio com drill-down (RF-27/RF-32/§8.1)."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        from apps.capabilities.analytics import painel_capacidades
        from apps.capabilities.models import AllocationRecommendation, EmployeeSkill, Skill
        from apps.finance.services import resumo_financeiro_portfolio
        from apps.resources.services import detectar_conflitos, mapa_ocupacao_equipe
        from apps.risks.models import Risk, StatusRisco

        programa = request.query_params.get("programa")
        portfolio = request.query_params.get("portfolio")
        area = request.query_params.get("area")
        gerente = request.query_params.get("manager")

        projetos = Project.objects.select_related("manager", "program", "portfolio").filter(arquivado=False)
        if programa:
            projetos = projetos.filter(program_id=programa)
        if portfolio:
            projetos = projetos.filter(portfolio_id=portfolio)
        if area:
            projetos = projetos.filter(area=area)
        if gerente:
            projetos = projetos.filter(manager_id=gerente)
        lista = list(projetos)
        ativos = [p for p in lista if p.status in {StatusProjeto.EM_EXECUCAO, StatusProjeto.APROVADO}]
        hoje = timezone.localdate()

        por_status = [
            {"status": c, "rotulo": r, "total": sum(1 for p in lista if p.status == c)}
            for c, r in StatusProjeto.choices
        ]
        por_saude = [
            {"saude": c, "rotulo": r, "total": sum(1 for p in lista if p.saude == c)}
            for c, r in Saude.choices
        ]
        por_prioridade = [
            {"prioridade": c, "rotulo": r, "total": sum(1 for p in lista if p.prioridade == c)}
            for c, r in Prioridade.choices
        ]

        riscos = Risk.objects.filter(project__in=lista) if lista else Risk.objects.none()
        risco_aberto = riscos.exclude(status=StatusRisco.ENCERRADO)
        matriz_riscos = [
            {
                "id": r.id, "codigo": r.codigo, "descricao": r.descricao[:120], "probabilidade": r.probabilidade,
                "impacto": r.impacto, "severidade": r.severidade, "nivel": r.nivel, "cor": r.cor,
                "projeto": r.project.nome, "project_id": r.project_id, "status": r.status,
                "responsavel": r.responsavel.nome if r.responsavel_id else "",
            }
            for r in risco_aberto.select_related("project", "responsavel")[:200]
        ]

        atrasados = [p for p in lista if p.atrasado]
        marcos_proximos = Milestone.objects.filter(
            project__in=lista, status__in=["PENDENTE", "EM_ANDAMENTO"],
            data_prevista__gte=hoje, data_prevista__lte=hoje + timedelta(days=45),
        ).select_related("project").order_by("data_prevista")[:15]

        skills_criticas = Skill.objects.filter(
            criticidade__in=["ALTA", "ESTRATEGICA"]
        ).prefetch_related("perfis")[:200]

        return Response(
            {
                "filtros_aplicados": {"programa": programa, "portfolio": portfolio, "area": area, "manager": gerente},
                "resumo": {
                    "total_projetos": len(lista),
                    "ativos": len(ativos),
                    "atrasados": len(atrasados),
                    "concluidos": sum(1 for p in lista if p.status == StatusProjeto.CONCLUIDO),
                    "em_risco": sum(1 for p in lista if p.saude in {Saude.AMARELO, Saude.VERMELHO}),
                    "progresso_medio": round(
                        sum(p.percentual_conclusao for p in ativos) / len(ativos), 1
                    ) if ativos else 0.0,
                },
                "por_status": por_status,
                "por_saude": por_saude,
                "por_prioridade": por_prioridade,
                "financeiro": resumo_financeiro_portfolio(lista),
                "evm_por_projeto": [
                    {"id": p.id, "nome": p.nome, "codigo": p.codigo, "cor": p.cor, **p.evm()}
                    for p in ativos[:60]
                ],
                "riscos": {
                    "total": risco_aberto.count(),
                    "criticos": risco_aberto.filter(nivel__in=["ALTO", "EXTREMO"]).count(),
                    "por_nivel": [
                        {"nivel": n, "total": risco_aberto.filter(nivel=n).count()}
                        for n in ["BAIXO", "MEDIO", "ALTO", "EXTREMO"]
                    ],
                    "matriz": matriz_riscos,
                    "top": sorted(matriz_riscos, key=lambda r: -r["severidade"])[:10],
                },
                "projetos_atrasados": [
                    {
                        "id": p.id, "nome": p.nome, "codigo": p.codigo, "cor": p.cor, "saude": p.saude,
                        "dias_atraso": abs(p.dias_restantes or 0), "data_fim": p.data_fim,
                        "manager": p.manager.nome if p.manager_id else "",
                        "percentual": p.percentual_conclusao, "progresso_planejado": p.progresso_planejado,
                    }
                    for p in sorted(atrasados, key=lambda p: p.dias_restantes or 0)[:20]
                ],
                "marcos_proximos": MilestoneSerializer(marcos_proximos, many=True).data,
                "capacidade": {
                    "conflitos": detectar_conflitos()[:15],
                    "ocupacao": mapa_ocupacao_equipe(),
                    "skills_criticas": [
                        {
                            "id": s.id, "nome": s.nome, "cor": s.cor, "icone": s.icone,
                            "criticidade": s.criticidade, "bus_factor": s.bus_factor,
                            "nivel_medio": s.nivel_medio, "detentores": s.perfis.count(),
                        }
                        for s in sorted(skills_criticas, key=lambda s: s.bus_factor)[:12]
                    ],
                },
                "capacidades": painel_capacidades(),
                "alocacao": {
                    "recomendacoes_pendentes": AllocationRecommendation.objects.filter(status="SUGERIDA").count(),
                    "total_perfis_skill": EmployeeSkill.objects.count(),
                    "skills_catalogo": Skill.objects.count(),
                },
                "projetos": ProjectResumoSerializer(lista[:100], many=True, context={"request": request}).data,
                "gerado_em": timezone.now().isoformat(),
            }
        )


class CatalogoWidgetsView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "relatorio.ver"

    def get(self, request):
        return Response({"widgets": widgets_disponiveis()})

"""Views de tarefas: CRUD, Kanban, calendário, Gantt e recomendações."""
from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP
from apps.core.services import registrar_atividade, registrar_auditoria
from apps.portfolio.models import Prioridade

from .models import (
    STATUS_ABERTOS,
    ChecklistItem,
    StatusTarefa,
    Task,
    TaskDependency,
    TaskSkillRequirement,
)
from .serializers import (
    ChecklistItemSerializer,
    TaskDependencySerializer,
    TaskListSerializer,
    TaskSerializer,
    TaskSkillRequirementSerializer,
)
from .services import calcular_caminho_critico, cruzar_baseline, reagendar_por_dependencias


class TaskViewSet(viewsets.ModelViewSet):
    permissoes_por_acao = {"destroy": "tarefa.excluir"}
    queryset = Task.objects.select_related("responsavel", "project", "parent").prefetch_related("checklist")
    permission_classes = [PermissaoSGP]
    permissao_leitura = "tarefa.ver"
    permissao_escrita = "tarefa.editar"
    search_fields = ["nome", "descricao", "wbs"]
    filterset_fields = ["project", "status", "prioridade", "responsavel", "parent", "is_marco",
                        "critica", "nivel"]
    ordering_fields = ["ordem", "data_inicio", "data_fim", "prioridade", "percentual_conclusao", "nome"]
    ordering = ["ordem", "data_inicio"]

    def get_serializer_class(self):
        if self.action == "list":
            return TaskListSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        tarefa = serializer.save()
        if tarefa.status == StatusTarefa.CONCLUIDA:
            self._creditar_conclusao(tarefa)
        registrar_atividade(
            verbo="criou a tarefa", entidade="tasks.task", entidade_id=tarefa.id,
            entidade_nome=tarefa.nome, projeto_id=tarefa.project_id,
        )
        tarefa.project.calcular_progresso()
        tarefa.project.recalcular_saude()

    def perform_update(self, serializer):
        anteriores = TaskSerializer(serializer.instance).data
        estava_concluida = serializer.instance.status == StatusTarefa.CONCLUIDA
        tarefa = serializer.save()
        if tarefa.status == StatusTarefa.CONCLUIDA and not estava_concluida:
            self._creditar_conclusao(tarefa)
        registrar_auditoria(
            entidade="tasks.task", acao="ATUALIZAR", instancia=tarefa, anteriores=dict(anteriores)
        )
        tarefa.rollup_percentual()
        tarefa.project.calcular_progresso()
        tarefa.project.recalcular_saude()

    def perform_destroy(self, instance):
        projeto = instance.project
        registrar_auditoria(entidade="tasks.task", acao="EXCLUIR", instancia=instance)
        instance.delete()
        projeto.calcular_progresso()
        projeto.recalcular_saude()

    def _creditar_conclusao(self, tarefa):
        from apps.capabilities.services import creditar_xp_por_tarefa

        creditar_xp_por_tarefa(tarefa, registrado_por=self.request.user)

    # --------------------------------------------------------------- Kanban
    @action(detail=False, methods=["get"])
    def kanban(self, request):
        """Board Kanban agrupado por status (RF-07/RF-12)."""
        qs = self.filter_queryset(self.get_queryset())
        projeto_id = request.query_params.get("project")
        colunas = []
        for chave, rotulo in StatusTarefa.choices:
            itens = [t for t in qs if t.status == chave]
            itens.sort(key=lambda t: (t.posicao_visual, t.ordem))
            colunas.append(
                {
                    "status": chave,
                    "rotulo": rotulo,
                    "total": len(itens),
                    "wip_excedido": False,
                    "tarefas": TaskListSerializer(itens, many=True, context={"request": request}).data,
                }
            )
        return Response(
            {
                "projeto": projeto_id,
                "colunas": colunas,
                "total": qs.count(),
                "atrasadas": sum(1 for t in qs if t.atrasada),
            }
        )

    @action(detail=True, methods=["post"], url_path="mover")
    def mover(self, request, pk=None):
        """Arrastar card entre colunas do Kanban (RF-07)."""
        tarefa = self.get_object()
        novo_status = request.data.get("status")
        if novo_status not in dict(StatusTarefa.choices):
            return Response({"erro": True, "mensagem": "Status inválido."}, status=400)
        anterior = tarefa.status
        tarefa.status = novo_status
        if "posicao_visual" in request.data:
            tarefa.posicao_visual = float(request.data["posicao_visual"])
        campos = ["status", "posicao_visual", "atualizado_em"]
        if novo_status == StatusTarefa.CONCLUIDA:
            tarefa.percentual_conclusao = 100
            campos.append("percentual_conclusao")
        elif anterior == StatusTarefa.CONCLUIDA and tarefa.percentual_conclusao >= 100:
            tarefa.percentual_conclusao = 80
            campos.append("percentual_conclusao")
        tarefa.save(update_fields=campos)
        if novo_status == StatusTarefa.CONCLUIDA and anterior != StatusTarefa.CONCLUIDA:
            self._creditar_conclusao(tarefa)
        tarefa.project.calcular_progresso()
        tarefa.project.recalcular_saude()
        registrar_atividade(
            verbo=f"moveu para {tarefa.get_status_display()}", entidade="tasks.task",
            entidade_id=tarefa.id, entidade_nome=tarefa.nome, projeto_id=tarefa.project_id,
            meta={"de": anterior, "para": novo_status},
        )
        return Response(TaskListSerializer(tarefa, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="progresso")
    def progresso(self, request, pk=None):
        """Slider de percentual de conclusão (RF-10)."""
        tarefa = self.get_object()
        valor = int(request.data.get("percentual_conclusao", 0))
        valor = max(0, min(100, valor))
        tarefa.percentual_conclusao = valor
        tarefa.progresso_informado_por = request.user
        if valor >= 100:
            tarefa.status = StatusTarefa.CONCLUIDA
        elif valor > 0 and tarefa.status in {StatusTarefa.BACKLOG, StatusTarefa.A_FAZER}:
            tarefa.status = StatusTarefa.EM_ANDAMENTO
        tarefa.save()
        if valor >= 100:
            self._creditar_conclusao(tarefa)
        tarefa.project.calcular_progresso()
        tarefa.project.recalcular_saude()
        return Response(TaskListSerializer(tarefa, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="reagendar")
    def reagendar(self, request, pk=None):
        """Arrastar/redimensionar a barra no Gantt e recalcular dependências (UC-02)."""
        tarefa = self.get_object()
        inicio = request.data.get("data_inicio")
        fim = request.data.get("data_fim")
        if inicio:
            tarefa.data_inicio = date.fromisoformat(inicio)
        if fim:
            tarefa.data_fim = date.fromisoformat(fim)
        if tarefa.data_inicio and tarefa.data_fim and tarefa.data_fim < tarefa.data_inicio:
            tarefa.data_fim = tarefa.data_inicio
        tarefa.save(update_fields=["data_inicio", "data_fim", "atualizado_em"])
        alteradas = reagendar_por_dependencias(tarefa)
        cpm = calcular_caminho_critico(tarefa.project_id)
        tarefa.project.recalcular_saude()
        return Response(
            {
                "tarefa": TaskListSerializer(tarefa, context={"request": request}).data,
                "reagendadas": alteradas,
                "caminho_critico": cpm,
            }
        )

    @action(detail=True, methods=["post"], url_path="recalcular")
    def recalcular(self, request, pk=None):
        tarefa = self.get_object()
        tarefa.rollup_percentual()
        return Response(calcular_caminho_critico(tarefa.project_id))

    # ------------------------------------------------------------ checklist
    @action(detail=True, methods=["post"], url_path="checklist")
    def criar_checklist(self, request, pk=None):
        tarefa = self.get_object()
        item = ChecklistItem.objects.create(
            task=tarefa,
            texto=request.data.get("texto", ""),
            ordem=request.data.get("ordem", tarefa.checklist.count()),
            responsavel_id=request.data.get("responsavel") or None,
        )
        return Response(ChecklistItemSerializer(item).data, status=201)

    @action(detail=True, methods=["post"], url_path="checklist/(?P<item_id>[^/.]+)/alternar")
    def alternar_checklist(self, request, pk=None, item_id=None):
        item = ChecklistItem.objects.filter(pk=item_id, task_id=pk).first()
        if not item:
            return Response({"erro": True, "mensagem": "Item não encontrado."}, status=404)
        item.concluido = not item.concluido
        item.save(update_fields=["concluido"])
        itens = list(self.get_object().checklist.all())
        concluidos = sum(1 for i in itens if i.concluido)
        return Response(
            {
                "item": ChecklistItemSerializer(item).data,
                "progresso_checklist": round(concluidos / len(itens) * 100) if itens else 0,
            }
        )

    # --------------------------------------------------------- dependências
    @action(detail=True, methods=["post"], url_path="dependencias")
    def criar_dependencia(self, request, pk=None):
        tarefa = self.get_object()
        serializer = TaskDependencySerializer(data={**request.data, "successor": request.data.get("successor", pk)})
        serializer.is_valid(raise_exception=True)
        dependencia = serializer.save()
        alteradas = reagendar_por_dependencias(dependencia.predecessor)
        cpm = calcular_caminho_critico(tarefa.project_id)
        return Response(
            {"dependencia": TaskDependencySerializer(dependencia).data,
             "reagendadas": alteradas, "caminho_critico": cpm},
            status=201,
        )

    @action(detail=True, methods=["delete"], url_path="dependencias/(?P<dep_id>[^/.]+)")
    def remover_dependencia(self, request, pk=None, dep_id=None):
        removidas, _ = TaskDependency.objects.filter(pk=dep_id, successor_id=pk).delete()
        calcular_caminho_critico(self.get_object().project_id)
        return Response({"ok": True, "removidas": removidas})

    # ---------------------------------------------------------------- matching
    @action(detail=True, methods=["get"])
    def recomendacoes(self, request, pk=None):
        """Executa o motor de alocação para a tarefa (RF-70/RF-72/UC-06)."""
        from apps.capabilities.matching import motor_matching, recomendacoes_salvas

        tarefa = self.get_object()
        modo = request.query_params.get("modo", "PERFORMANCE")
        if request.query_params.get("salvas") == "1":
            return Response({"recomendacoes": recomendacoes_salvas(tarefa), "modo": modo})
        resultado = motor_matching(
            task=tarefa, modo=modo, solicitante=request.user,
            limite=int(request.query_params.get("limite", 8)),
        )
        return Response(resultado)

    @action(detail=True, methods=["get"], url_path="simular")
    def simular(self, request, pk=None):
        from apps.capabilities.matching import simular_cenario

        tarefa = self.get_object()
        ajustes = {
            chave: float(request.query_params[chave])
            for chave in ("skill", "disponibilidade", "custo", "preferencia", "experiencia", "proximidade")
            if chave in request.query_params
        }
        if request.query_params.get("somente_disponiveis") == "1":
            ajustes["somente_disponiveis"] = True
        return Response(simular_cenario(task=tarefa, modo=request.query_params.get("modo", "PERFORMANCE"), ajustes=ajustes))

    @action(detail=True, methods=["post"], url_path="requisitos-skill")
    def requisitos_skill(self, request, pk=None):
        tarefa = self.get_object()
        serializer = TaskSkillRequirementSerializer(data={**request.data, "task": tarefa.id})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

    @action(detail=True, methods=["post"], url_path="duplicar")
    def duplicar(self, request, pk=None):
        origem = self.get_object()
        copia = Task.objects.create(
            project=origem.project, parent=origem.parent, nome=f"{origem.nome} (cópia)",
            descricao=origem.descricao, responsavel=origem.responsavel, data_inicio=origem.data_inicio,
            data_fim=origem.data_fim, esforco_estimado=origem.esforco_estimado,
            prioridade=origem.prioridade, status=StatusTarefa.A_FAZER, cor=origem.cor, icone=origem.icone,
            tags=list(origem.tags or []),
        )
        for item in origem.checklist.all():
            ChecklistItem.objects.create(task=copia, texto=item.texto, ordem=item.ordem)
        for req in origem.requisitos_skill.all():
            TaskSkillRequirement.objects.create(
                task=copia, skill=req.skill, nivel_minimo=req.nivel_minimo,
                peso=req.peso, obrigatorio=req.obrigatorio,
            )
        return Response(TaskSerializer(copia, context={"request": request}).data, status=201)

    @action(detail=False, methods=["post"], url_path="reordenar")
    def reordenar(self, request):
        """Persiste a ordem visual após drag-and-drop na lista ou no Kanban."""
        itens = request.data.get("itens", [])
        atualizados = 0
        for indice, item in enumerate(itens):
            campos = {}
            if "posicao_visual" in item:
                campos["posicao_visual"] = float(item["posicao_visual"])
            if "ordem" in item:
                campos["ordem"] = int(item["ordem"])
            else:
                campos["ordem"] = indice
            if "status" in item:
                campos["status"] = item["status"]
            if "parent" in item:
                campos["parent_id"] = item["parent"]
            if campos:
                atualizados += Task.objects.filter(pk=item.get("id")).update(**campos)
        return Response({"ok": True, "atualizadas": atualizados})

    @action(detail=False, methods=["get"])
    def calendario(self, request):
        """Visão de calendário de tarefas e marcos (RF-12)."""
        inicio = request.query_params.get("inicio")
        fim = request.query_params.get("fim")
        hoje = timezone.localdate()
        inicio = date.fromisoformat(inicio) if inicio else hoje.replace(day=1)
        fim = date.fromisoformat(fim) if fim else (inicio + timedelta(days=60))
        qs = self.filter_queryset(self.get_queryset()).filter(
            Q(data_inicio__lte=fim, data_fim__gte=inicio)
        )
        eventos = [
            {
                "id": t.id, "titulo": t.nome, "inicio": t.data_inicio, "fim": t.data_fim,
                "tipo": "tarefa", "status": t.status, "cor": t.cor or t.project.cor,
                "percentual": t.percentual_conclusao, "project_id": t.project_id,
                "projeto": t.project.nome, "responsavel": t.responsavel.nome if t.responsavel_id else "",
                "atrasada": t.atrasada, "is_marco": t.is_marco,
            }
            for t in qs[:500]
        ]
        from apps.portfolio.models import Milestone

        marcos = Milestone.objects.filter(
            project__in=qs.values_list("project_id", flat=True), data_prevista__gte=inicio, data_prevista__lte=fim
        ).select_related("project")
        eventos += [
            {
                "id": m.id, "titulo": m.nome, "inicio": m.data_prevista, "fim": m.data_prevista,
                "tipo": "marco", "status": m.status, "cor": m.cor, "percentual": 100 if m.status == "CONCLUIDO" else 0,
                "project_id": m.project_id, "projeto": m.project.nome, "critico": m.critico,
                "responsavel": m.responsavel.nome if m.responsavel_id else "", "is_marco": True,
            }
            for m in marcos
        ]
        return Response({"inicio": inicio.isoformat(), "fim": fim.isoformat(), "eventos": eventos})

    @action(detail=False, methods=["get"])
    def minhas(self, request):
        """Minhas tarefas — widget do colaborador."""
        qs = Task.objects.filter(responsavel=request.user).exclude(
            status__in=[StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA]
        ).select_related("project").order_by("data_fim")
        return Response(
            {
                "total": qs.count(),
                "atrasadas": sum(1 for t in qs if t.atrasada),
                "tarefas": TaskListSerializer(qs[:50], many=True, context={"request": request}).data,
            }
        )


class TaskDependencyViewSet(viewsets.ModelViewSet):
    queryset = TaskDependency.objects.select_related("predecessor", "successor").order_by("id")
    serializer_class = TaskDependencySerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "tarefa.ver"
    permissao_escrita = "tarefa.editar"
    filterset_fields = ["predecessor", "successor", "tipo"]

    def perform_create(self, serializer):
        dependencia = serializer.save()
        reagendar_por_dependencias(dependencia.predecessor)
        calcular_caminho_critico(dependencia.predecessor.project_id)


class ChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = ChecklistItem.objects.select_related("task", "responsavel").order_by("ordem", "id")
    serializer_class = ChecklistItemSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "tarefa.ver"
    permissao_escrita = "tarefa.editar"
    filterset_fields = ["task", "concluido"]


class TaskSkillRequirementViewSet(viewsets.ModelViewSet):
    queryset = TaskSkillRequirement.objects.select_related("task", "skill").order_by("id")
    serializer_class = TaskSkillRequirementSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "tarefa.ver"
    permissao_escrita = "tarefa.editar"
    filterset_fields = ["task", "skill"]


class MinhasTarefasResumoView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "tarefa.ver"

    def get(self, request):
        qs = Task.objects.filter(responsavel=request.user)
        abertas = qs.exclude(status__in=[StatusTarefa.CONCLUIDA, StatusTarefa.CANCELADA])
        return Response(
            {
                "abertas": abertas.count(),
                "atrasadas": sum(1 for t in abertas if t.atrasada),
                "concluidas_mes": qs.filter(
                    status=StatusTarefa.CONCLUIDA, data_fim_real__gte=timezone.localdate().replace(day=1)
                ).count(),
                "horas_semana": round(
                    sum(
                        float(t.esforco_estimado or 0)
                        for t in abertas
                        if t.data_inicio and t.data_inicio <= timezone.localdate() + timedelta(days=7)
                    ),
                    1,
                ),
                "por_status": [
                    {"status": c, "rotulo": r, "total": sum(1 for t in abertas if t.status == c)}
                    for c, r in StatusTarefa.choices
                ],
            }
        )

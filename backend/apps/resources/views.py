"""Views de recursos: CRUD, alocação por drag, conflitos e timesheet."""
from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP
from apps.core.services import registrar_atividade, registrar_auditoria
from apps.portfolio.models import Project
from apps.tasks.models import Task

from .models import Alocacao, CapacidadeSemanal, ModalidadeAlocacao, Recurso, StatusAlocacao, Timesheet
from .serializers import (
    AlocacaoSerializer,
    CapacidadeSemanalSerializer,
    RecursoSerializer,
    TimesheetSerializer,
)
from .services import (
    detectar_conflitos,
    horas_apontadas,
    mapa_ocupacao_equipe,
    ocupacao_por_semana,
)


class RecursoViewSet(viewsets.ModelViewSet):
    queryset = Recurso.objects.all()
    serializer_class = RecursoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "recurso.ver"
    permissao_escrita = "recurso.editar"
    search_fields = ["nome", "descricao", "fornecedor", "codigo"]
    filterset_fields = ["tipo", "ativo", "fornecedor"]
    ordering = ["tipo", "nome"]

    @action(detail=False, methods=["get"])
    def cards(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return Response(
            {
                "recursos": RecursoSerializer(qs, many=True).data,
                "por_tipo": list(qs.values("tipo").annotate(total=Count("id"))),
                "total": qs.count(),
            }
        )


class AlocacaoViewSet(viewsets.ModelViewSet):
    queryset = Alocacao.objects.select_related("user", "recurso", "project", "task").all()
    serializer_class = AlocacaoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "alocacao.ver"
    permissao_escrita = "alocacao.editar"
    filterset_fields = ["project", "task", "user", "recurso", "status", "modalidade"]
    ordering = ["data_inicio"]

    def get_queryset(self):
        qs = super().get_queryset()
        inicio = self.request.query_params.get("de")
        fim = self.request.query_params.get("ate")
        if inicio:
            qs = qs.filter(data_fim__gte=inicio)
        if fim:
            qs = qs.filter(data_inicio__lte=fim)
        return qs

    def perform_create(self, serializer):
        alocacao = serializer.save(criado_por=self.request.user)
        registrar_auditoria(entidade="resources.alocacao", acao="ALOCAR", instancia=alocacao)
        registrar_atividade(
            verbo="alocou", entidade="resources.alocacao", entidade_id=alocacao.id,
            entidade_nome=str(alocacao), projeto_id=alocacao.project_id,
        )

    def perform_update(self, serializer):
        alocacao = serializer.save()
        registrar_auditoria(entidade="resources.alocacao", acao="ATUALIZAR", instancia=alocacao)

    @action(detail=False, methods=["post"], url_path="atribuir")
    def atribuir(self, request):
        """Cria a alocação arrastando o card do colaborador sobre a tarefa (RF-14)."""
        task_id = request.data.get("task") or request.data.get("task_id")
        user_id = request.data.get("user") or request.data.get("user_id")
        recurso_id = request.data.get("recurso")
        tarefa = Task.objects.select_related("project").filter(pk=task_id).first()
        if not tarefa:
            return Response({"erro": True, "mensagem": "Tarefa não encontrada."}, status=404)
        alocacao = Alocacao.objects.create(
            project=tarefa.project,
            task=tarefa,
            user_id=user_id or None,
            recurso_id=recurso_id or None,
            percentual=int(request.data.get("percentual", 100)),
            data_inicio=date.fromisoformat(request.data["data_inicio"]) if request.data.get("data_inicio")
            else (tarefa.data_inicio or timezone.localdate()),
            data_fim=date.fromisoformat(request.data["data_fim"]) if request.data.get("data_fim")
            else (tarefa.data_fim or timezone.localdate()),
            status=StatusAlocacao.CONFIRMADA,
            modalidade=request.data.get("modalidade", ModalidadeAlocacao.MANUAL),
            papel=request.data.get("papel", ""),
            justificativa=request.data.get("justificativa", ""),
            score_matching=request.data.get("score_matching"),
            override_manual=bool(request.data.get("override_manual", False)),
            criado_por=request.user,
        )
        conflitos = detectar_conflitos(user_id=alocacao.user_id) if alocacao.user_id else []
        if not tarefa.responsavel_id and alocacao.user_id:
            tarefa.responsavel_id = alocacao.user_id
            if tarefa.status == "A_FAZER":
                tarefa.status = "EM_ANDAMENTO"
            tarefa.save(update_fields=["responsavel", "status", "atualizado_em"])
        registrar_auditoria(
            entidade="resources.alocacao", acao="ALOCAR", instancia=alocacao,
            justificativa=request.data.get("justificativa", ""),
        )
        return Response(
            {
                "alocacao": AlocacaoSerializer(alocacao, context={"request": request}).data,
                "conflitos": conflitos[:5],
                "aviso": conflitos[0] if conflitos else None,
            },
            status=201,
        )

    @action(detail=False, methods=["get"])
    def conflitos(self, request):
        user_id = request.query_params.get("user")
        project_id = request.query_params.get("project")
        conflitos = detectar_conflitos(
            user_id=int(user_id) if user_id else None,
            project_id=int(project_id) if project_id else None,
        )
        return Response(
            {
                "conflitos": conflitos,
                "total": len(conflitos),
                "criticos": sum(1 for c in conflitos if c["severidade"] == "CRITICO"),
            }
        )

    @action(detail=False, methods=["get"], url_path="mapa-ocupacao")
    def mapa_ocupacao(self, request):
        inicio = request.query_params.get("inicio")
        fim = request.query_params.get("fim")
        return Response(
            mapa_ocupacao_equipe(
                date.fromisoformat(inicio) if inicio else None,
                date.fromisoformat(fim) if fim else None,
            )
        )

    @action(detail=False, methods=["get"], url_path="timeline")
    def timeline(self, request):
        """Timeline arrastável de alocações por pessoa (RF-16)."""
        qs = self.filter_queryset(self.get_queryset()).select_related("user", "project", "task")
        por_pessoa: dict[int, dict] = {}
        for alocacao in qs[:800]:
            if not alocacao.user_id:
                continue
            item = por_pessoa.setdefault(
                alocacao.user_id,
                {
                    "user_id": alocacao.user_id, "nome": alocacao.user.nome,
                    "cor": alocacao.user.cor, "iniciais": alocacao.user.iniciais,
                    "cargo": alocacao.user.cargo, "area": alocacao.user.area,
                    "alocacoes": [],
                },
            )
            item["alocacoes"].append(
                {
                    "id": alocacao.id, "inicio": alocacao.data_inicio, "fim": alocacao.data_fim,
                    "percentual": alocacao.percentual, "projeto": alocacao.project.nome,
                    "project_id": alocacao.project_id, "tarefa": alocacao.task.nome if alocacao.task_id else "",
                    "task_id": alocacao.task_id, "cor": alocacao.project.cor,
                    "status": alocacao.status, "modalidade": alocacao.modalidade,
                }
            )
        return Response({"pessoas": list(por_pessoa.values()), "total": len(por_pessoa)})

    @action(detail=True, methods=["post"], url_path="confirmar")
    def confirmar(self, request, pk=None):
        alocacao = self.get_object()
        alocacao.status = StatusAlocacao.CONFIRMADA
        alocacao.aprovado_por = request.user
        alocacao.save(update_fields=["status", "aprovado_por", "atualizado_em"])
        registrar_auditoria(entidade="resources.alocacao", acao="APROVAR", instancia=alocacao)
        return Response(AlocacaoSerializer(alocacao, context={"request": request}).data)


class TimesheetViewSet(viewsets.ModelViewSet):
    queryset = Timesheet.objects.select_related("user", "task", "project", "aprovador").all()
    serializer_class = TimesheetSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "tarefa.ver"
    permissao_escrita = "timesheet.editar"
    # Aprovar é uma alçada diferente de apontar: quem registra horas é o membro
    # da equipe; quem aprova é o gestor. Exigir "timesheet.editar" nas duas
    # ações fazia o gestor receber 403 exatamente no botão que a tela lhe mostra.
    permissao_aprovar = "timesheet.aprovar"

    def get_permissions(self):
        if self.action in {"aprovar", "aprovar_lote"}:
            self.permissao_leitura = None
            self.permissao_escrita = "timesheet.aprovar"
        return super().get_permissions()
    filterset_fields = ["user", "project", "task", "aprovado", "data"]
    ordering = ["-data"]

    def get_queryset(self):
        qs = super().get_queryset()
        if not (self.request.user.pode_ver_custo or self.request.user.perfil in {"ADMIN", "PMO", "GERENTE", "RH"}):
            qs = qs.filter(user=self.request.user)
        return qs

    def perform_create(self, serializer):
        apontamento = serializer.save(user=self.request.user)
        if apontamento.task_id and not apontamento.project_id:
            apontamento.project = apontamento.task.project
            apontamento.save(update_fields=["project"])
        if apontamento.task_id:
            tarefa = apontamento.task
            tarefa.esforco_real = (tarefa.esforco_real or 0) + apontamento.horas
            tarefa.save(update_fields=["esforco_real", "atualizado_em"])

    @action(detail=False, methods=["get"])
    def semana(self, request):
        """Timesheet visual da semana (RF-16)."""
        referencia = request.query_params.get("data")
        hoje = date.fromisoformat(referencia) if referencia else timezone.localdate()
        inicio = hoje - timedelta(days=hoje.weekday())
        fim = inicio + timedelta(days=6)
        qs = self.get_queryset().filter(data__gte=inicio, data__lte=fim)
        dias = [
            {
                "data": (inicio + timedelta(days=i)).isoformat(),
                "rotulo": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i],
                "horas": float(sum(a.horas for a in qs if a.data == inicio + timedelta(days=i))),
                "apontamentos": [
                    {
                        "id": a.id, "horas": float(a.horas), "task_id": a.task_id,
                        "tarefa": a.task.nome if a.task_id else "", "projeto": a.project.nome if a.project_id else "",
                        "project_id": a.project_id, "cor": a.project.cor if a.project_id else "#94A3B8",
                        "aprovado": a.aprovado, "descricao": a.descricao,
                    }
                    for a in qs
                    if a.data == inicio + timedelta(days=i)
                ],
            }
            for i in range(7)
        ]
        return Response(
            {
                "inicio": inicio.isoformat(),
                "fim": fim.isoformat(),
                "total_horas": float(sum(a.horas for a in qs)),
                "meta_horas": float(request.user.capacidade_semanal_horas),
                "aprovadas": float(sum(a.horas for a in qs if a.aprovado)),
                "pendentes": float(sum(a.horas for a in qs if not a.aprovado)),
                "dias": dias,
            }
        )

    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        apontamento = self.get_object()
        apontamento.aprovado = True
        apontamento.aprovador = request.user
        apontamento.aprovado_em = timezone.now()
        apontamento.save(update_fields=["aprovado", "aprovador", "aprovado_em"])
        from apps.capabilities.services import creditar_por_timesheet

        creditar_por_timesheet(apontamento, registrado_por=request.user)
        registrar_auditoria(entidade="resources.timesheet", acao="APROVAR", instancia=apontamento)
        return Response(TimesheetSerializer(apontamento, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="aprovar-lote")
    def aprovar_lote(self, request):
        ids = request.data.get("ids", [])
        qs = Timesheet.objects.filter(pk__in=ids)
        total = qs.count()
        qs.update(aprovado=True, aprovador=request.user, aprovado_em=timezone.now())
        for apontamento in qs.select_related("task"):
            from apps.capabilities.services import creditar_por_timesheet

            creditar_por_timesheet(apontamento, registrado_por=request.user)
        return Response({"ok": True, "aprovados": total})


class CapacidadeSemanalViewSet(viewsets.ModelViewSet):
    """Exceções de capacidade por semana (férias, afastamento, hora extra).

    A escrita era restrita a `admin.ver`, o que impedia o gestor de registrar
    as férias da própria equipe. Agora vale `alocacao.editar` — de ADMIN, PMO e
    GERENTE — que é quem mexe em alocação e, portanto, em capacidade.
    """

    queryset = CapacidadeSemanal.objects.select_related("user").all()
    serializer_class = CapacidadeSemanalSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "recurso.ver"
    permissao_escrita = "alocacao.editar"
    filterset_fields = ["user", "semana_inicio"]


class CapacidadeColaboradorView(APIView):
    """Ocupação semanal de um colaborador para o heatmap individual."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "recurso.ver"

    def get(self, request, user_id):
        semanas = int(request.query_params.get("semanas", 12))
        return Response(
            {
                "user_id": user_id,
                "semanas": ocupacao_por_semana(user_id, semanas=semanas),
                "horas_apontadas": float(horas_apontadas(user_id=user_id)),
            }
        )


class PainelAlocacaoView(APIView):
    """Dashboard de alocação (§8.4)."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "alocacao.ver"

    def get(self, request):
        from apps.capabilities.models import AllocationRecommendation

        alocacoes = Alocacao.objects.select_related("user")
        total = alocacoes.count()
        por_modo = list(alocacoes.values("modalidade").annotate(total=Count("id")))
        com_override = alocacoes.filter(override_manual=True).count()
        recomendacoes = AllocationRecommendation.objects.all()
        aceitas = recomendacoes.filter(status="ACEITA")
        aderencia = []
        for alocacao in alocacoes.filter(score_matching__isnull=False):
            aderencia.append(alocacao.score_matching)
        return Response(
            {
                "total_alocacoes": total,
                "por_modo": por_modo,
                "taxa_override": round(com_override / total * 100, 1) if total else 0.0,
                "aderencia_media": round(sum(aderencia) / len(aderencia) * 100, 1) if aderencia else 0.0,
                "recomendacoes": {
                    "total": recomendacoes.count(),
                    "sugeridas": recomendacoes.filter(status="SUGERIDA").count(),
                    "aceitas": aceitas.count(),
                    "recusadas": recomendacoes.filter(status="RECUSADA").count(),
                },
                "conflitos": detectar_conflitos()[:20],
                "ocupacao": mapa_ocupacao_equipe(),
                "por_projeto": list(
                    alocacoes.values("project__nome", "project__cor").annotate(
                        total=Count("id"), percentual=Sum("percentual")
                    ).order_by("-total")[:15]
                ),
            }
        )

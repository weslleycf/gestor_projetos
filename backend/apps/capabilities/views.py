"""Views de capacidades: catálogo, perfis, evolução, matching, PDI e capacity."""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import User
from apps.core.permissions import PermissaoSGP, tem_permissao
from apps.core.services import notificar, registrar_auditoria
from apps.portfolio.models import Project, StatusProjeto

from . import analytics
from .matching import (
    DESCRICAO_MODOS,
    PESOS_POR_MODO,
    motor_matching,
    recomendacoes_salvas,
    registrar_decisao_alocacao,
    simular_cenario,
)
from .models import (
    AllocationRecommendation,
    BusFactorAlert,
    DevelopmentAction,
    DevelopmentPlan,
    EmployeeSkill,
    EmployeeTraining,
    InternalOpportunity,
    Mentorship,
    ModoAlocacao,
    OpportunityApplication,
    OrigemHistorico,
    PerfilNivel,
    PosicaoChave,
    ProjectSkillRequirement,
    Skill,
    SkillAssessment,
    SkillCategory,
    SkillDemandForecast,
    SkillEndorsement,
    SkillEvidence,
    SkillHistory,
    StatusAcao,
    StatusPDI,
    StatusPerfilSkill,
    SugestaoPromocao,
    SuccessionPlan,
    TipoAvaliacao,
    Training,
)
from .serializers import (
    AllocationRecommendationSerializer,
    BusFactorAlertSerializer,
    DevelopmentActionSerializer,
    DevelopmentPlanSerializer,
    EmployeeSkillSerializer,
    EmployeeTrainingSerializer,
    InternalOpportunitySerializer,
    MentorshipSerializer,
    OpportunityApplicationSerializer,
    PerfilNivelSerializer,
    PosicaoChaveSerializer,
    ProjectSkillRequirementSerializer,
    SkillArvoreSerializer,
    SkillAssessmentSerializer,
    SkillCategorySerializer,
    SkillDemandForecastSerializer,
    SkillEndorsementSerializer,
    SkillEvidenceSerializer,
    SkillHistorySerializer,
    SkillSerializer,
    SuccessionPlanSerializer,
    SugestaoPromocaoSerializer,
    TrainingSerializer,
)
from .services import (
    calcular_nivel_consolidado,
    creditar_xp,
    detectar_decay,
    radar_skills,
    registrar_regressao,
    validar_promocao,
    verificar_e_sugerir_promocao,
)


# ---------------------------------------------------------------------------
# Catálogo
# ---------------------------------------------------------------------------
class SkillCategoryViewSet(viewsets.ModelViewSet):
    queryset = SkillCategory.objects.prefetch_related("subcategorias", "skills").all()
    serializer_class = SkillCategorySerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    search_fields = ["nome", "descricao"]
    filterset_fields = ["parent"]
    pagination_class = None

    @action(detail=False, methods=["get"])
    def arvore(self, request):
        raizes = SkillCategory.objects.filter(parent__isnull=True)
        return Response({"categorias": SkillCategorySerializer(raizes, many=True).data})


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.select_related("categoria", "parent").all()
    serializer_class = SkillSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    search_fields = ["nome", "descricao", "codigo_externo"]
    filterset_fields = ["categoria", "tipo", "status", "criticidade", "parent", "framework_origem"]
    ordering_fields = ["nome", "criticidade", "criado_em"]
    ordering = ["nome"]

    @action(detail=False, methods=["get"])
    def arvore(self, request):
        """Taxonomia hierárquica visual (RF-45)."""
        raizes = Skill.objects.filter(parent__isnull=True)
        if request.query_params.get("categoria"):
            raizes = raizes.filter(categoria_id=request.query_params["categoria"])
        return Response(
            {
                "raizes": SkillArvoreSerializer(raizes, many=True).data,
                "total": Skill.objects.count(),
                "categorias": SkillCategorySerializer(
                    SkillCategory.objects.filter(parent__isnull=True), many=True
                ).data,
            }
        )

    @action(detail=False, methods=["get"])
    def grafo(self, request):
        """Grafo de capacidades e relações para o editor visual (RF-45/RF-49)."""
        skills = list(Skill.objects.select_related("categoria", "parent"))
        nos = [
            {
                "id": s.id, "nome": s.nome, "icone": s.icone, "cor": s.cor, "tipo": s.tipo,
                "criticidade": s.criticidade, "status": s.status,
                "categoria": s.categoria.nome if s.categoria_id else "",
                "detentores": s.perfis.count(), "bus_factor": s.bus_factor,
                "nivel_medio": s.nivel_medio, "raio": 12 + min(28, s.perfis.count() * 2),
            }
            for s in skills
        ]
        arestas = [{"de": s.parent_id, "para": s.id, "tipo": "hierarquia"} for s in skills if s.parent_id]
        return Response({"nos": nos, "arestas": arestas})

    @action(detail=True, methods=["get"])
    def detalhe(self, request, pk=None):
        skill = self.get_object()
        return Response(
            {
                "skill": SkillSerializer(skill, context={"request": request}).data,
                "detentores": EmployeeSkillSerializer(
                    skill.perfis.select_related("user").order_by("-nivel_atual")[:50], many=True
                ).data,
                "projetos": ProjectSkillRequirementSerializer(
                    skill.requisitos_projeto.select_related("project")[:30], many=True
                ).data,
                "criterios": PerfilNivelSerializer(
                    skill.criterios_nivel.all(), many=True
                ).data or PerfilNivelSerializer(PerfilNivel.objects.filter(skill__isnull=True), many=True).data,
                "oportunidades": InternalOpportunitySerializer(
                    skill.oportunidades.filter(ativa=True)[:10], many=True
                ).data,
                "previsao": SkillDemandForecastSerializer(
                    skill.previsoes.all()[:12], many=True
                ).data,
            }
        )

    @action(detail=False, methods=["post"], url_path="importar-taxonomia")
    def importar_taxonomia(self, request):
        """Importa taxonomia externa (SFIA/ESCO/O*NET) com mapeamento visual (RF-46)."""
        framework = request.data.get("framework", "ESCO")
        itens = request.data.get("itens", [])
        criados, atualizados = [], []
        for item in itens:
            categoria = None
            if item.get("categoria"):
                categoria, _ = SkillCategory.objects.get_or_create(nome=item["categoria"])
            skill, novo = Skill.objects.update_or_create(
                codigo_externo=item.get("codigo_externo", ""),
                framework_origem=framework,
                defaults={
                    "nome": item.get("nome", ""),
                    "descricao": item.get("descricao", ""),
                    "categoria": categoria,
                    "tipo": item.get("tipo", "TECNICA"),
                    "sinonimos": item.get("sinonimos", []),
                },
            )
            (criados if novo else atualizados).append(skill)
        return Response(
            {
                "framework": framework,
                "criados": SkillSerializer(criados, many=True).data,
                "atualizados": SkillSerializer(atualizados, many=True).data,
                "total": len(criados) + len(atualizados),
            },
            status=201,
        )


class PerfilNivelViewSet(viewsets.ModelViewSet):
    queryset = PerfilNivel.objects.select_related("skill").all()
    serializer_class = PerfilNivelSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    filterset_fields = ["skill", "nivel"]


# ---------------------------------------------------------------------------
# Perfis de capacidade
# ---------------------------------------------------------------------------
class EmployeeSkillViewSet(viewsets.ModelViewSet):
    # Avaliar, autoavaliar e endossar são ações distintas, com públicos
    # distintos na matriz. Deixá-las cair em "capacidade.editar" dava 403
    # exatamente para o membro da equipe e o líder que a matriz autoriza.
    permissoes_por_acao = {
        "avaliar": "capacidade.avaliar",
        "autoavaliar": "capacidade.autoavaliar",
        "endossar": "capacidade.endossar",
        # Alterar e remover o vínculo: o dono ajusta o seu, os gestores de
        # capacidade ajustam qualquer um. A posse é conferida em seguida, nos
        # métodos abaixo — aqui só se verifica se o perfil participa do jogo.
        "update": ["capacidade.editar", "capacidade.autoavaliar"],
        "partial_update": ["capacidade.editar", "capacidade.autoavaliar"],
        "destroy": ["capacidade.editar", "capacidade.autoavaliar"],
    }

    def _exigir_posse(self, vinculo):
        from apps.core.permissions import pode_gerenciar_vinculo_capacidade

        if not pode_gerenciar_vinculo_capacidade(self.request.user, vinculo):
            raise PermissionDenied(
                "Você só pode alterar as suas próprias capacidades."
            )

    def perform_update(self, serializer):
        self._exigir_posse(self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir_posse(instance)
        instance.delete()
    queryset = EmployeeSkill.objects.select_related("user", "skill", "skill__categoria").all()
    serializer_class = EmployeeSkillSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    filterset_fields = ["user", "skill", "nivel_atual", "status", "visibilidade", "destaque"]
    ordering_fields = ["nivel_atual", "xp_acumulado", "ultima_utilizacao", "atualizado_em"]
    ordering = ["-nivel_atual"]

    def get_queryset(self):
        qs = super().get_queryset()
        solicitante = self.request.user
        if not tem_permissao(solicitante, "capacidade.validar"):
            qs = qs.exclude(visibilidade="PRIVADO").exclude(
                Q(visibilidade="RESTRITO") & ~Q(user=solicitante)
            )
        return qs

    @action(detail=False, methods=["get"])
    def matriz(self, request):
        """Heatmap colaboradores × skills (RF-63)."""
        return Response(
            analytics.matriz_skills(
                area=request.query_params.get("area"),
                categoria=request.query_params.get("categoria"),
                tipo=request.query_params.get("tipo"),
                limite_skills=int(request.query_params.get("limite_skills", 40)),
                limite_pessoas=int(request.query_params.get("limite_pessoas", 60)),
            )
        )

    @action(detail=False, methods=["get"], url_path="por-usuario/(?P<user_id>[^/.]+)")
    def por_usuario(self, request, user_id=None):
        usuario = User.objects.filter(pk=user_id).first()
        if not usuario:
            return Response({"erro": True, "mensagem": "Colaborador não encontrado."}, status=404)
        return Response(radar_skills(usuario))

    @action(detail=True, methods=["post"])
    def avaliar(self, request, pk=None):
        """Registra autoavaliação, gestor, par ou mentor (RF-51)."""
        perfil = self.get_object()
        serializer = SkillAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        avaliacao = serializer.save(employee_skill=perfil, avaliador=request.user)
        calcular_nivel_consolidado(perfil)
        sugestao = verificar_e_sugerir_promocao(perfil, registrado_por=request.user)
        return Response(
            {
                "avaliacao": SkillAssessmentSerializer(avaliacao).data,
                "perfil": EmployeeSkillSerializer(perfil, context={"request": request}).data,
                "sugestao_promocao": SugestaoPromocaoSerializer(sugestao).data if sugestao else None,
            },
            status=201,
        )

    @action(detail=True, methods=["post"])
    def endossar(self, request, pk=None):
        perfil = self.get_object()
        if perfil.user_id == request.user.id:
            return Response({"erro": True, "mensagem": "Não é possível endossar a própria capacidade."}, status=400)
        endosso, criado = SkillEndorsement.objects.update_or_create(
            employee_skill=perfil, endorser=request.user,
            defaults={
                "comentario": request.data.get("comentario", ""),
                "nivel_sugerido": int(request.data.get("nivel_sugerido", 0) or 0),
            },
        )
        notificar(
            perfil.user, f"{request.user.nome} endossou {perfil.skill.nome}",
            mensagem=endosso.comentario[:180], nivel="SUCESSO", icone="thumbs-up",
            link=f"/capacidades/perfil/{perfil.user_id}",
        )
        return Response(
            {
                "endosso": SkillEndorsementSerializer(endosso).data,
                "total_endossos": perfil.endossos.count(),
                "criado": criado,
            },
            status=201 if criado else 200,
        )

    @action(detail=True, methods=["post"], url_path="evidencias")
    def adicionar_evidencia(self, request, pk=None):
        perfil = self.get_object()
        serializer = SkillEvidenceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evidencia = serializer.save(employee_skill=perfil)
        sugestao = verificar_e_sugerir_promocao(perfil, registrado_por=request.user)
        return Response(
            {
                "evidencia": SkillEvidenceSerializer(evidencia).data,
                "sugestao_promocao": SugestaoPromocaoSerializer(sugestao).data if sugestao else None,
            },
            status=201,
        )

    @action(detail=True, methods=["post"], url_path="validar-evidencia/(?P<evidencia_id>[^/.]+)")
    def validar_evidencia(self, request, pk=None, evidencia_id=None):
        evidencia = SkillEvidence.objects.filter(pk=evidencia_id, employee_skill_id=pk).first()
        if not evidencia:
            return Response({"erro": True, "mensagem": "Evidência não encontrada."}, status=404)
        evidencia.valida = not evidencia.valida
        evidencia.validador = request.user if evidencia.valida else None
        evidencia.validada_em = timezone.now() if evidencia.valida else None
        evidencia.save()
        perfil = evidencia.employee_skill
        sugestao = verificar_e_sugerir_promocao(perfil, registrado_por=request.user) if evidencia.valida else None
        return Response(
            {
                "evidencia": SkillEvidenceSerializer(evidencia).data,
                "criterios": perfil.criterios_proximo_nivel(),
                "sugestao_promocao": SugestaoPromocaoSerializer(sugestao).data if sugestao else None,
            }
        )

    @action(detail=True, methods=["get"])
    def historico(self, request, pk=None):
        perfil = self.get_object()
        return Response(
            {
                "perfil": EmployeeSkillSerializer(perfil, context={"request": request}).data,
                "historico": SkillHistorySerializer(perfil.historico.all(), many=True).data,
                "avaliacoes": SkillAssessmentSerializer(perfil.avaliacoes.all(), many=True).data,
                "endossos": SkillEndorsementSerializer(perfil.endossos.all(), many=True).data,
                # O contexto é obrigatório: sem ele o serializer não sabe quem está
            # perguntando e "pode_editar" volta sempre falso, escondendo do dono
            # os botões de editar e excluir a própria evidência.
            "evidencias": SkillEvidenceSerializer(
                perfil.evidencias.all(), many=True, context={"request": request}
            ).data,
                "criterios_proximo_nivel": perfil.criterios_proximo_nivel(),
            }
        )

    @action(detail=True, methods=["get"], url_path="criterios")
    def criterios(self, request, pk=None):
        return Response(self.get_object().criterios_proximo_nivel())

    @action(detail=True, methods=["post"], url_path="creditar-xp")
    def creditar_xp_manual(self, request, pk=None):
        perfil = self.get_object()
        resultado = creditar_xp(
            perfil.user, perfil.skill, int(request.data.get("xp", 0)),
            origem=request.data.get("origem", "MANUAL"),
            motivo=request.data.get("motivo", "Ajuste manual de XP"),
            registrado_por=request.user,
        )
        return Response(
            {
                "xp_anterior": resultado["xp_anterior"],
                "xp_atual": resultado["xp_atual"],
                "perfil": EmployeeSkillSerializer(perfil, context={"request": request}).data,
                "sugestao_promocao": SugestaoPromocaoSerializer(resultado["sugestao"]).data
                if resultado["sugestao"] else None,
            }
        )

    @action(detail=True, methods=["post"])
    def regredir(self, request, pk=None):
        perfil = self.get_object()
        motivo = request.data.get("motivo", "")
        if not motivo:
            return Response({"erro": True, "mensagem": "Justificativa obrigatória para regressão."}, status=400)
        registrar_regressao(
            perfil, int(request.data.get("nivel", perfil.nivel_atual - 1)),
            motivo=motivo, registrado_por=request.user,
        )
        return Response(EmployeeSkillSerializer(perfil, context={"request": request}).data)


class SkillAssessmentViewSet(viewsets.ModelViewSet):
    queryset = SkillAssessment.objects.select_related("avaliador", "employee_skill").all()
    serializer_class = SkillAssessmentSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.avaliar"
    filterset_fields = ["employee_skill", "tipo", "avaliador"]


class SkillEvidenceViewSet(viewsets.ModelViewSet):
    queryset = SkillEvidence.objects.select_related("employee_skill", "validador").all()
    serializer_class = SkillEvidenceSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    # Quem lançou a evidência pode corrigir o próprio lançamento; a posse é
    # conferida abaixo.
    permissoes_por_acao = {
        "update": ["capacidade.editar", "capacidade.autoavaliar"],
        "partial_update": ["capacidade.editar", "capacidade.autoavaliar"],
        "destroy": ["capacidade.editar", "capacidade.autoavaliar"],
    }
    filterset_fields = ["employee_skill", "tipo", "valida"]

    def _exigir_posse(self, evidencia):
        from apps.core.permissions import pode_gerenciar_evidencia_capacidade

        if not pode_gerenciar_evidencia_capacidade(self.request.user, evidencia):
            raise PermissionDenied(
                "Você só pode alterar as evidências que você lançou."
            )

    def perform_update(self, serializer):
        self._exigir_posse(self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        self._exigir_posse(instance)
        instance.delete()


class SkillHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SkillHistory.objects.select_related("employee_skill", "employee_skill__skill").all()
    serializer_class = SkillHistorySerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    filterset_fields = ["employee_skill", "origem"]
    ordering = ["-data"]


class SugestaoPromocaoViewSet(viewsets.ModelViewSet):
    queryset = SugestaoPromocao.objects.select_related(
        "employee_skill", "employee_skill__user", "employee_skill__skill"
    ).all()
    serializer_class = SugestaoPromocaoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.validar"
    filterset_fields = ["status", "employee_skill"]

    @action(detail=True, methods=["post"])
    def validar(self, request, pk=None):
        """Validação visual da promoção — animação de level up (RF-58/UC-07)."""
        sugestao = self.get_object()
        try:
            validar_promocao(
                sugestao, aprovador=request.user,
                aprovar=bool(request.data.get("aprovar", True)),
                comentario=request.data.get("comentario", ""),
                nivel_final=request.data.get("nivel_final"),
            )
        except ValueError as exc:
            return Response({"erro": True, "mensagem": str(exc)}, status=400)
        return Response(
            {
                "sugestao": SugestaoPromocaoSerializer(sugestao).data,
                "perfil": EmployeeSkillSerializer(sugestao.employee_skill, context={"request": request}).data,
                "level_up": sugestao.status == "APROVADA",
            }
        )


# ---------------------------------------------------------------------------
# Requisitos de projeto
# ---------------------------------------------------------------------------
class ProjectSkillRequirementViewSet(viewsets.ModelViewSet):
    queryset = ProjectSkillRequirement.objects.select_related("project", "skill").all()
    serializer_class = ProjectSkillRequirementSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "projeto.editar"
    filterset_fields = ["project", "skill", "obrigatorio"]

    @action(detail=False, methods=["post"], url_path="definir")
    def definir(self, request):
        """Define os requisitos de capacidade do projeto por chips (RF-68)."""
        project_id = request.data.get("project")
        projeto = Project.objects.filter(pk=project_id).first()
        if not projeto:
            return Response({"erro": True, "mensagem": "Projeto não encontrado."}, status=404)
        itens = request.data.get("requisitos", [])
        if request.data.get("substituir", True):
            projeto.requisitos_skill.all().delete()
        criados = []
        for item in itens:
            requisito, _ = ProjectSkillRequirement.objects.update_or_create(
                project=projeto, skill_id=item["skill"],
                defaults={
                    "nivel_minimo": int(item.get("nivel_minimo", 3)),
                    "nivel_desejado": int(item.get("nivel_desejado", 4)),
                    "quantidade": int(item.get("quantidade", 1)),
                    "peso": float(item.get("peso", 1.0)),
                    "obrigatorio": bool(item.get("obrigatorio", False)),
                },
            )
            criados.append(requisito)
        return Response(ProjectSkillRequirementSerializer(criados, many=True).data, status=201)


# ---------------------------------------------------------------------------
# PDI, treinamentos e mentorias
# ---------------------------------------------------------------------------
class DevelopmentPlanViewSet(viewsets.ModelViewSet):
    queryset = DevelopmentPlan.objects.select_related("user", "responsavel_acompanhamento").prefetch_related("acoes")
    serializer_class = DevelopmentPlanSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "pdi.ver"
    permissao_escrita = "pdi.editar"
    filterset_fields = ["user", "status"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("meus") == "1":
            qs = qs.filter(user=self.request.user)
        return qs

    @action(detail=False, methods=["get"])
    def meu(self, request):
        """PDI do colaborador logado com radar de skills (UC-10)."""
        plano = DevelopmentPlan.objects.filter(user=request.user).order_by("-data_inicio").first()
        return Response(
            {
                "usuario": {"id": request.user.id, "nome": request.user.nome},
                "radar": radar_skills(request.user),
                "pdi": DevelopmentPlanSerializer(plano, context={"request": request}).data if plano else None,
                "trilhas": analytics.trilhas_recomendadas(request.user),
            }
        )

    @action(detail=False, methods=["post"], url_path="gerar")
    def gerar(self, request):
        """Cria o PDI a partir dos gaps detectados (RF-75/RF-76)."""
        user_id = request.data.get("user", request.user.id)
        usuario = User.objects.filter(pk=user_id).first()
        if not usuario:
            return Response({"erro": True, "mensagem": "Colaborador não encontrado."}, status=404)
        plano = DevelopmentPlan.objects.create(
            user=usuario,
            titulo=request.data.get("titulo", f"PDI {timezone.localdate():%Y}"),
            objetivo=request.data.get("objetivo", ""),
            responsavel_acompanhamento=usuario.gestor,
            data_fim=request.data.get("data_fim"),
        )
        trilhas = analytics.trilhas_recomendadas(usuario, limite=int(request.data.get("limite", 5)))
        acoes = []
        for trilha in trilhas:
            for acao in trilha["acoes"][:2]:
                acoes.append(
                    DevelopmentAction.objects.create(
                        plan=plano,
                        tipo={
                            "TREINAMENTO": "CURSO", "MENTORIA": "MENTORIA", "PRATICA": "PROJETO",
                        }.get(acao["tipo"], "PRATICA"),
                        descricao=acao["titulo"][:250],
                        skill_id=trilha["skill_id"],
                        nivel_alvo=trilha["nivel_alvo"],
                        carga_horaria=acao.get("carga_horaria", 0),
                        prazo=timezone.localdate() + timedelta(days=90),
                    )
                )
        return Response(
            {
                "pdi": DevelopmentPlanSerializer(plano, context={"request": request}).data,
                "acoes_criadas": len(acoes),
                "trilhas": trilhas,
            },
            status=201,
        )


class DevelopmentActionViewSet(viewsets.ModelViewSet):
    queryset = DevelopmentAction.objects.select_related("plan", "skill", "responsavel").all()
    serializer_class = DevelopmentActionSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "pdi.ver"
    permissao_escrita = "pdi.editar"
    filterset_fields = ["plan", "status", "tipo", "skill"]

    def perform_update(self, serializer):
        acao = serializer.save()
        if acao.status == StatusAcao.CONCLUIDA and not acao.data_conclusao:
            acao.data_conclusao = timezone.localdate()
            acao.progresso = 100
            acao.save(update_fields=["data_conclusao", "progresso"])
            if acao.skill_id:
                creditar_xp(
                    acao.plan.user, acao.skill, 60, origem="TREINAMENTO",
                    motivo=f"Conclusão da ação de PDI: {acao.descricao[:80]}",
                    registrado_por=self.request.user,
                )
        acao.plan.recalcular_progresso()
        self._notificar_gestor(acao)

    def _notificar_gestor(self, acao):
        gestor = acao.plan.responsavel_acompanhamento
        if gestor and acao.status == StatusAcao.CONCLUIDA:
            notificar(
                gestor, f"Ação de PDI concluída por {acao.plan.user.nome}",
                mensagem=acao.descricao[:180], nivel="SUCESSO", icone="check-circle",
                link="/capacidades/pdi",
            )


class TrainingViewSet(viewsets.ModelViewSet):
    queryset = Training.objects.select_related("skill").all()
    serializer_class = TrainingSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "treinamento.editar"
    search_fields = ["nome", "fornecedor", "descricao"]
    filterset_fields = ["skill", "tipo", "ativo", "certificacao"]


class EmployeeTrainingViewSet(viewsets.ModelViewSet):
    queryset = EmployeeTraining.objects.select_related("user", "training", "training__skill").all()
    serializer_class = EmployeeTrainingSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "treinamento.editar"
    filterset_fields = ["user", "training", "status"]

    def perform_update(self, serializer):
        registro = serializer.save()
        if registro.status == "CONCLUIDO" and registro.training.skill_id:
            creditar_xp(
                registro.user, registro.training.skill, registro.training.xp_concedido,
                origem="TREINAMENTO",
                motivo=f"Conclusão do treinamento: {registro.training.nome}",
                registrado_por=self.request.user,
            )
            if registro.training.certificacao and not registro.certificado_url:
                SkillEvidence.objects.create(
                    employee_skill=EmployeeSkill.objects.get_or_create(
                        user=registro.user, skill=registro.training.skill
                    )[0],
                    tipo="CERTIFICACAO",
                    descricao=f"Certificação: {registro.training.nome}",
                    url=registro.certificado_url,
                    emitido_por=registro.training.fornecedor,
                    valida=True,
                    validador=self.request.user,
                    validada_em=timezone.now(),
                )


class MentorshipViewSet(viewsets.ModelViewSet):
    queryset = Mentorship.objects.select_related("mentor", "mentee", "skill").all()
    serializer_class = MentorshipSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "mentoria.editar"
    filterset_fields = ["mentor", "mentee", "skill", "status"]

    @action(detail=False, methods=["get"])
    def sugerir(self, request):
        """Sugere mentores internos nível 4–5 com disponibilidade (RF-79)."""
        skill_id = request.query_params.get("skill")
        if not skill_id:
            return Response({"erro": True, "mensagem": "Informe a capacidade (skill)."}, status=400)
        return Response(
            {
                "skill_id": int(skill_id),
                "mentores": analytics.sugerir_mentores(
                    int(skill_id), limite=int(request.query_params.get("limite", 8))
                ),
            }
        )


# ---------------------------------------------------------------------------
# Matching e alocação assistida
# ---------------------------------------------------------------------------
class AllocationRecommendationViewSet(viewsets.ModelViewSet):
    queryset = AllocationRecommendation.objects.select_related("user", "task", "task__project").all()
    serializer_class = AllocationRecommendationSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "alocacao.ver"
    permissao_escrita = "alocacao.editar"
    filterset_fields = ["task", "user", "status", "modo"]

    @action(detail=True, methods=["post"])
    def decidir(self, request, pk=None):
        """Aceita/recusa a recomendação e cria a alocação, com override justificado (RF-74)."""
        recomendacao = self.get_object()
        aceitar = bool(request.data.get("aceitar", True))
        if not aceitar:
            recomendacao.status = "RECUSADA"
            recomendacao.decidido_em = timezone.now()
            recomendacao.observacao_decisao = request.data.get("observacao", "")
            recomendacao.save()
            return Response(AllocationRecommendationSerializer(recomendacao).data)
        alocacao = registrar_decisao_alocacao(
            recomendacao,
            decidido_por=request.user,
            aceitar=True,
            observacao=request.data.get("observacao", ""),
            user=User.objects.filter(pk=request.data["user"]).first() if request.data.get("user") else None,
            percentual=int(request.data.get("percentual", 100)),
            data_inicio=request.data.get("data_inicio"),
            data_fim=request.data.get("data_fim"),
        )
        return Response(
            {
                "recomendacao": AllocationRecommendationSerializer(recomendacao).data,
                "alocacao_id": alocacao.id,
                "override": alocacao.override_manual,
            },
            status=201,
        )


class MatchingView(APIView):
    """Executa o motor de alocação para projeto ou tarefa (RF-70/RF-72)."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "alocacao.ver"

    def get(self, request, *args, **kwargs):
        projeto = Project.objects.filter(pk=request.query_params.get("project")).first()
        from apps.tasks.models import Task

        tarefa = Task.objects.filter(pk=request.query_params.get("task")).first()
        if not projeto and not tarefa:
            return Response({"erro": True, "mensagem": "Informe project ou task."}, status=400)
        return Response(
            motor_matching(
                task=tarefa,
                project=projeto if not tarefa else None,
                modo=request.query_params.get("modo", "PERFORMANCE"),
                limite=int(request.query_params.get("limite", 10)),
                solicitante=request.user,
            )
        )

    def post(self, request):
        from apps.tasks.models import Task

        tarefa = Task.objects.filter(pk=request.data.get("task")).first()
        projeto = Project.objects.filter(pk=request.data.get("project")).first()
        if not tarefa and not projeto:
            return Response({"erro": True, "mensagem": "Informe task ou project."}, status=400)
        return Response(
            motor_matching(
                task=tarefa, project=projeto if not tarefa else None,
                modo=request.data.get("modo", "PERFORMANCE"),
                limite=int(request.data.get("limite", 10)),
                persistir=bool(request.data.get("persistir", True)),
                solicitante=request.user,
            )
        )


class SimulacaoWhatIfView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "alocacao.ver"

    def post(self, request):
        from apps.tasks.models import Task

        tarefa = Task.objects.filter(pk=request.data.get("task")).first()
        projeto = Project.objects.filter(pk=request.data.get("project")).first()
        if not tarefa and not projeto:
            return Response({"erro": True, "mensagem": "Informe task ou project."}, status=400)
        return Response(
            simular_cenario(
                task=tarefa, project=projeto if not tarefa else None,
                modo=request.data.get("modo", "PERFORMANCE"),
                ajustes=request.data.get("ajustes", {}),
            )
        )


# ---------------------------------------------------------------------------
# Capacity planning
# ---------------------------------------------------------------------------
class SkillDemandForecastViewSet(viewsets.ModelViewSet):
    queryset = SkillDemandForecast.objects.select_related("skill").all()
    serializer_class = SkillDemandForecastSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    filterset_fields = ["skill", "periodo"]


class BusFactorAlertViewSet(viewsets.ModelViewSet):
    queryset = BusFactorAlert.objects.select_related("skill").all()
    serializer_class = BusFactorAlertSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    filterset_fields = ["skill", "resolvido", "criticidade"]

    @action(detail=True, methods=["post"])
    def resolver(self, request, pk=None):
        alerta = self.get_object()
        alerta.resolvido = True
        alerta.save(update_fields=["resolvido"])
        return Response(BusFactorAlertSerializer(alerta).data)


# ---------------------------------------------------------------------------
# Marketplace e sucessão
# ---------------------------------------------------------------------------
class InternalOpportunityViewSet(viewsets.ModelViewSet):
    queryset = InternalOpportunity.objects.prefetch_related("skills_requeridas").select_related("responsavel", "project")
    serializer_class = InternalOpportunitySerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    filterset_fields = ["tipo", "ativa", "project"]

    @action(detail=True, methods=["get"], url_path="aderencia/(?P<user_id>[^/.]+)")
    def aderencia(self, request, pk=None, user_id=None):
        oportunidade = self.get_object()
        usuario = User.objects.filter(pk=user_id).first()
        if not usuario:
            return Response({"erro": True, "mensagem": "Colaborador não encontrado."}, status=404)
        return Response(analytics.aderencia_a_oportunidade(oportunidade, usuario))

    @action(detail=False, methods=["get"])
    def recomendadas(self, request):
        """Oportunidades ordenadas por aderência ao perfil logado (RF-86)."""
        resultado = []
        for oportunidade in InternalOpportunity.objects.filter(ativa=True).prefetch_related("skills_requeridas")[:60]:
            analise = analytics.aderencia_a_oportunidade(oportunidade, request.user)
            resultado.append(
                {
                    **InternalOpportunitySerializer(oportunidade, context={"request": request}).data,
                    **analise,
                }
            )
        resultado.sort(key=lambda o: -o["aderencia"])
        return Response({"oportunidades": resultado})


class OpportunityApplicationViewSet(viewsets.ModelViewSet):
    queryset = OpportunityApplication.objects.select_related("user", "opportunity").all()
    serializer_class = OpportunityApplicationSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.autoavaliar"
    filterset_fields = ["opportunity", "user", "status"]

    def perform_create(self, serializer):
        oportunidade = serializer.validated_data["opportunity"]
        analise = analytics.aderencia_a_oportunidade(oportunidade, self.request.user)
        candidatura = serializer.save(
            user=self.request.user,
            aderencia=analise["aderencia"],
            skills_atendidas=analise["skills_atendidas"],
            skills_gap=analise["skills_gap"],
        )
        if oportunidade.responsavel_id:
            notificar(
                oportunidade.responsavel,
                f"Nova candidatura: {self.request.user.nome}",
                mensagem=f"{oportunidade.titulo} · aderência {analise['aderencia']}%",
                nivel="INFO", icone="user-check", link="/capacidades/oportunidades",
            )
        return candidatura


class PosicaoChaveViewSet(viewsets.ModelViewSet):
    queryset = PosicaoChave.objects.prefetch_related("skills_criticas").select_related("ocupante", "gestor")
    serializer_class = PosicaoChaveSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    filterset_fields = ["criticidade", "risco_sucessao", "area"]


class SuccessionPlanViewSet(viewsets.ModelViewSet):
    queryset = SuccessionPlan.objects.select_related("posicao", "sucessor").all()
    serializer_class = SuccessionPlanSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "capacidade.editar"
    filterset_fields = ["posicao", "sucessor", "prontidao"]

    @action(detail=False, methods=["get"])
    def mapa(self, request):
        """Mapa de sucessão em grafo: posições × sucessores (RF-87)."""
        posicoes = PosicaoChave.objects.prefetch_related("skills_criticas", "sucessores__sucessor")
        nos, arestas = [], []
        for posicao in posicoes:
            nos.append(
                {
                    "id": f"pos-{posicao.id}", "tipo": "posicao", "titulo": posicao.titulo,
                    "subtitulo": posicao.area, "criticidade": posicao.criticidade,
                    "risco": posicao.risco_sucessao,
                    "ocupante": posicao.ocupante.nome if posicao.ocupante_id else "",
                    "cor": posicao.ocupante.cor if posicao.ocupante_id else "#94A3B8",
                    "icone": "briefcase",
                }
            )
            if posicao.ocupante_id:
                nos.append(
                    {
                        "id": f"usr-{posicao.ocupante_id}", "tipo": "pessoa",
                        "titulo": posicao.ocupante.nome, "subtitulo": posicao.ocupante.cargo,
                        "cor": posicao.ocupante.cor, "icone": "user",
                    }
                )
                arestas.append({"de": f"usr-{posicao.ocupante_id}", "para": f"pos-{posicao.id}", "tipo": "ocupa"})
            for sucessor in posicao.sucessores.all():
                nos.append(
                    {
                        "id": f"usr-{sucessor.sucessor_id}", "tipo": "pessoa",
                        "titulo": sucessor.sucessor.nome, "subtitulo": sucessor.get_prontidao_display(),
                        "cor": sucessor.sucessor.cor, "icone": "user-plus",
                    }
                )
                arestas.append(
                    {
                        "de": f"usr-{sucessor.sucessor_id}", "para": f"pos-{posicao.id}",
                        "tipo": "sucessao", "prontidao": sucessor.prontidao,
                        "aderencia": sucessor.aderencia, "prioridade": sucessor.prioridade,
                    }
                )
        unicos = {no["id"]: no for no in nos}
        return Response({"nos": list(unicos.values()), "arestas": arestas})


# ---------------------------------------------------------------------------
# Painéis analíticos de capacidade
# ---------------------------------------------------------------------------
class GapAnalysisView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"

    def get(self, request):
        projeto = Project.objects.filter(pk=request.query_params.get("project")).first()
        return Response(analytics.gap_analysis(project=projeto))


class CapacidadeForecastView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"

    def get(self, request):
        return Response(
            analytics.previsao_demanda(
                horizonte_meses=int(request.query_params.get("meses", 9)),
                salvar=request.query_params.get("salvar", "1") == "1",
            )
        )


class BusFactorView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"

    def get(self, request):
        return Response(analytics.detectar_bus_factor(salvar=request.query_params.get("salvar", "1") == "1"))


class PainelCapacidadesView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"

    def get(self, request):
        return Response(analytics.painel_capacidades())


class DecayView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"

    def get(self, request):
        return Response({"candidatos": detectar_decay(marcar=False)})

    def post(self, request):
        return Response({"marcados": detectar_decay(marcar=True)})


class TrilhasView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"

    def get(self, request):
        user_id = request.query_params.get("user", request.user.id)
        usuario = User.objects.filter(pk=user_id).first()
        if not usuario:
            return Response({"erro": True, "mensagem": "Colaborador não encontrado."}, status=404)
        return Response(
            {
                "usuario": {"id": usuario.id, "nome": usuario.nome},
                "radar": radar_skills(usuario),
                "trilhas": analytics.trilhas_recomendadas(usuario, limite=int(request.query_params.get("limite", 8))),
            }
        )


class ModosAlocacaoView(APIView):
    permission_classes = [PermissaoSGP]
    permissao_leitura = "alocacao.ver"

    def get(self, request):
        return Response(
            {
                "modos": [
                    {"valor": m, "rotulo": r, "descricao": DESCRICAO_MODOS.get(m, ""), "pesos": PESOS_POR_MODO.get(m, {})}
                    for m, r in ModoAlocacao.choices
                ],
                "tipos_avaliacao": [{"valor": v, "rotulo": r} for v, r in TipoAvaliacao.choices],
                "origens_historico": [{"valor": v, "rotulo": r} for v, r in OrigemHistorico.choices],
                "status_perfil": [{"valor": v, "rotulo": r} for v, r in StatusPerfilSkill.choices],
            }
        )

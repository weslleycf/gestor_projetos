"""Views do núcleo: autenticação, usuários, RBAC, auditoria e colaboração."""
from __future__ import annotations

from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Anexo,
    ApiToken,
    Atividade,
    AuditLog,
    Comentario,
    CustomReport,
    DashboardLayout,
    NivelNotificacao,
    Notificacao,
    Perfil,
    RegraNotificacao,
    Role,
    SavedFilter,
    User,
    UserRole,
    UserViewPreference,
    Webhook,
)
from .permissions import (
    MATRIZ_PERMISSOES,
    PermissaoSGP,
    SomenteAdmin,
    permissoes_do_usuario,
    pode_gerenciar_comentario,
    tem_permissao,
)
from .serializers import (
    AnexoSerializer,
    ApiTokenSerializer,
    AtividadeSerializer,
    AuditLogSerializer,
    ComentarioSerializer,
    CustomReportSerializer,
    DashboardLayoutSerializer,
    NotificacaoSerializer,
    RegraNotificacaoSerializer,
    RoleSerializer,
    SGPTokenObtainPairSerializer,
    SavedFilterSerializer,
    UserResumoSerializer,
    UserRoleSerializer,
    UserSerializer,
    UserViewPreferenceSerializer,
    UserWriteSerializer,
    WebhookSerializer,
    resolver_content_type,
)
from .services import registrar_auditoria


class SGPTokenObtainPairView(TokenObtainPairView):
    serializer_class = SGPTokenObtainPairSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    """Perfil do usuário autenticado + permissões efetivas (usado no boot da SPA)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "usuario": UserSerializer(user, context={"request": request}).data,
                "permissoes": sorted(permissoes_do_usuario(user)),
                "matriz_perfis": {p: sorted(v) for p, v in MATRIZ_PERMISSOES.items()},
                "nao_lidas": Notificacao.objects.filter(user=user, lida=False).count(),
                "config": {
                    "perfis": [{"valor": v, "rotulo": r} for v, r in Perfil.choices],
                    "pesos_matching": settings.SGP["PESOS_MATCHING"],
                    "temas": [
                        {"id": t["id"], "nome": t["nome"], "descricao": t["descricao"],
                         "categoria": t["categoria"], "acessivel": bool(t.get("acessivel"))}
                        for t in settings.SGP["TEMAS"]
                    ],
                    "niveis_proficiencia": [
                        {"valor": n, "rotulo": r} for n, r in __import__(
                            "apps.capabilities.models", fromlist=["NivelProficiencia"]
                        ).NivelProficiencia.choices
                    ],
                },
            }
        )

    def patch(self, request):
        serializer = UserWriteSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        registrar_auditoria(entidade="core.user", acao="ATUALIZAR", instancia=request.user, justificativa="autoedição de perfil")
        return Response(UserSerializer(request.user, context={"request": request}).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        registrar_auditoria(entidade="core.user", acao="LOGOUT", instancia=request.user)
        return Response({"ok": True})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("gestor").all()
    permission_classes = [PermissaoSGP]
    permissao_leitura = "capacidade.ver"
    permissao_escrita = "admin.ver"
    search_fields = ["nome", "email", "cargo", "area"]
    filterset_fields = ["perfil", "area", "ativo", "gestor", "disponivel_para_mentoria"]
    ordering_fields = ["nome", "cargo", "area", "data_admissao", "criado_em"]
    ordering = ["nome"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return UserWriteSerializer
        if self.action == "resumo":
            return UserResumoSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        registrar_auditoria(entidade="core.user", acao="CRIAR", instancia=user, user=self.request.user)

    def perform_update(self, serializer):
        anteriores = UserSerializer(serializer.instance).data
        user = serializer.save()
        registrar_auditoria(
            entidade="core.user", acao="ATUALIZAR", instancia=user,
            anteriores=dict(anteriores), user=self.request.user,
        )

    def perform_destroy(self, instance):
        registrar_auditoria(entidade="core.user", acao="EXCLUIR", instancia=instance, user=self.request.user)
        instance.ativo = False
        instance.is_active = False
        instance.save(update_fields=["ativo", "is_active"])

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        qs = self.filter_queryset(self.get_queryset())
        return Response(UserResumoSerializer(qs[:500], many=True, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="aniversariantes")
    def aniversariantes(self, request):
        hoje = timezone.localdate()
        qs = self.get_queryset().filter(
            data_admissao__month=hoje.month, data_admissao__day=hoje.day
        )
        return Response(UserResumoSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="organograma")
    def organograma(self, request):
        """Grafo de pessoas para o mapa de sucessão (RF-87)."""
        users = self.get_queryset().filter(ativo=True)
        nos = [
            {
                "id": u.id, "nome": u.nome, "cargo": u.cargo, "area": u.area,
                "cor": u.cor, "iniciais": u.iniciais, "perfil": u.perfil,
                "gestor": u.gestor_id,
            }
            for u in users
        ]
        arestas = [{"de": u.gestor_id, "para": u.id, "tipo": "gestao"} for u in users if u.gestor_id]
        return Response({"nos": nos, "arestas": arestas})


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [SomenteAdmin]
    search_fields = ["nome", "descricao"]


class UserRoleViewSet(viewsets.ModelViewSet):
    """Vínculos de papel (quem tem qual papel, em qual escopo).

    Usa `admin.ver` — que é do ADMIN e do PMO — e não `SomenteAdmin`: a tela de
    usuários mostra os botões de atribuir e remover para quem tem essa
    permissão, e com a trava anterior o PMO recebia 403 em um botão visível.
    A definição dos papéis em si continua restrita ao administrador.
    """

    queryset = UserRole.objects.select_related("user", "role").all()
    serializer_class = UserRoleSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "admin.ver"
    permissao_escrita = "admin.ver"
    filterset_fields = ["user", "role", "escopo"]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "auditoria.ver"
    filterset_fields = ["entidade", "acao", "user", "entidade_id"]
    search_fields = ["user_nome", "entidade", "justificativa"]
    ordering = ["-timestamp"]

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        qs = self.filter_queryset(self.get_queryset())
        por_acao = list(qs.values("acao").annotate(total=Count("id")).order_by("-total"))
        por_entidade = list(qs.values("entidade").annotate(total=Count("id")).order_by("-total")[:15])
        por_usuario = list(
            qs.values("user_nome").annotate(total=Count("id")).order_by("-total")[:15]
        )
        return Response({"por_acao": por_acao, "por_entidade": por_entidade, "por_usuario": por_usuario})


class NotificacaoViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["lida", "nivel", "entidade"]
    ordering = ["-criado_em"]

    def get_queryset(self):
        return Notificacao.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="marcar-lida")
    def marcar_lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save(update_fields=["lida"])
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path="marcar-todas-lidas")
    def marcar_todas_lidas(self, request):
        total = self.get_queryset().filter(lida=False).update(lida=True)
        return Response({"ok": True, "atualizadas": total})

    @action(detail=False, methods=["get"], url_path="contagem")
    def contagem(self, request):
        qs = self.get_queryset()
        return Response(
            {
                "total": qs.count(),
                "nao_lidas": qs.filter(lida=False).count(),
                "por_nivel": list(
                    qs.filter(lida=False).values("nivel").annotate(total=Count("id"))
                ),
            }
        )


class RegraNotificacaoViewSet(viewsets.ModelViewSet):
    queryset = RegraNotificacao.objects.all()
    serializer_class = RegraNotificacaoSerializer
    permission_classes = [PermissaoSGP]
    permissao_escrita = "admin.ver"
    permissao_leitura = "dashboard.ver"
    filterset_fields = ["evento", "ativo", "nivel"]


class AtividadeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Atividade.objects.select_related("user").all()
    serializer_class = AtividadeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["entidade", "projeto_id", "user", "verbo"]
    ordering = ["-criado_em"]


class UserViewPreferenceViewSet(viewsets.ModelViewSet):
    serializer_class = UserViewPreferenceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "contexto"

    def get_queryset(self):
        return UserViewPreference.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="definir")
    def definir(self, request):
        contexto = request.data.get("contexto")
        tipo = request.data.get("tipo_visualizacao", "LISTA")
        config = request.data.get("configuracao_json", {})
        if not contexto:
            return Response({"erro": True, "mensagem": "contexto é obrigatório"}, status=400)
        pref, _ = UserViewPreference.objects.update_or_create(
            user=request.user, contexto=contexto,
            defaults={"tipo_visualizacao": tipo, "configuracao_json": config},
        )
        return Response(UserViewPreferenceSerializer(pref).data)


class DashboardLayoutViewSet(viewsets.ModelViewSet):
    serializer_class = DashboardLayoutSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # A lista reúne as composições do próprio usuário e os modelos
        # compartilhados. Ver é diferente de alterar: a posse é conferida nas
        # operações de escrita, logo abaixo.
        return DashboardLayout.objects.filter(Q(user=self.request.user) | Q(is_default=True))

    def _exigir_posse(self, layout):
        if layout.user_id != self.request.user.pk:
            raise PermissionDenied(
                "Esta composição é um modelo compartilhado e só pode ser alterada por quem a criou. "
                "Salve uma cópia sua para personalizar."
            )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        self._exigir_posse(self.get_object())
        serializer.save()

    def perform_destroy(self, instance):
        # Sem esta trava, qualquer usuário apagava o modelo padrão de outro.
        self._exigir_posse(instance)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="tornar-padrao")
    def tornar_padrao(self, request, pk=None):
        layout = self.get_object()
        self._exigir_posse(layout)
        DashboardLayout.objects.filter(user=request.user).update(is_default=False)
        layout.is_default = True
        layout.save(update_fields=["is_default"])
        return Response(DashboardLayoutSerializer(layout).data)

    @action(detail=False, methods=["post"], url_path="salvar-widgets")
    def salvar_widgets(self, request):
        layout_id = request.data.get("id")
        widgets = request.data.get("widgets_json", [])
        if layout_id:
            layout = DashboardLayout.objects.filter(pk=layout_id, user=request.user).first()
            if not layout:
                return Response({"erro": True, "mensagem": "Layout não encontrado"}, status=404)
        else:
            layout = DashboardLayout.objects.create(
                user=request.user, nome=request.data.get("nome", "Meu dashboard")
            )
        layout.widgets_json = widgets
        layout.nome = request.data.get("nome", layout.nome)
        layout.save()
        return Response(DashboardLayoutSerializer(layout).data)


class SavedFilterViewSet(viewsets.ModelViewSet):
    serializer_class = SavedFilterSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["modulo"]

    def get_queryset(self):
        return SavedFilter.objects.filter(Q(user=self.request.user) | Q(compartilhado=True))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CustomReportViewSet(viewsets.ModelViewSet):
    serializer_class = CustomReportSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "relatorio.ver"
    permissao_escrita = "relatorio.criar"

    def get_queryset(self):
        return CustomReport.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get"])
    def executar(self, request, pk=None):
        from apps.tasks.services import widgets_disponiveis

        report = self.get_object()
        return Response({"relatorio": CustomReportSerializer(report).data, "catalogo_widgets": widgets_disponiveis()})


class ApiTokenViewSet(viewsets.ModelViewSet):
    serializer_class = ApiTokenSerializer
    permission_classes = [SomenteAdmin]
    queryset = ApiToken.objects.select_related("user").all()
    filterset_fields = ["ativo", "user"]


class WebhookViewSet(viewsets.ModelViewSet):
    serializer_class = WebhookSerializer
    permission_classes = [SomenteAdmin]
    queryset = Webhook.objects.all()
    filterset_fields = ["ativo"]


class ComentarioViewSet(viewsets.ModelViewSet):
    serializer_class = ComentarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Comentario.objects.select_related("autor").prefetch_related("respostas__autor", "mencoes")
        entidade = self.request.query_params.get("entidade")
        objeto_id = self.request.query_params.get("objeto_id")
        if entidade and objeto_id:
            ct = resolver_content_type(entidade)
            qs = qs.filter(content_type=ct, object_id=objeto_id)
        elif entidade:
            ct = resolver_content_type(entidade)
            qs = qs.filter(content_type=ct)
        return qs.filter(parent__isnull=True)

    def perform_create(self, serializer):
        entidade = self.request.data.get("entidade")
        objeto_id = self.request.data.get("objeto_id")
        ct = resolver_content_type(entidade)
        mencionados = self.request.data.get("mencoes", []) or []
        comentario = serializer.save(
            autor=self.request.user, content_type=ct, object_id=objeto_id
        )
        if mencionados:
            comentario.mencoes.set(User.objects.filter(pk__in=mencionados))
            from .services import notificar_muitos

            notificar_muitos(
                comentario.mencoes.all(),
                f"{self.request.user.nome} mencionou você",
                mensagem=comentario.texto[:180],
                nivel=NivelNotificacao.INFO,
                icone="at-sign",
                entidade=entidade,
                entidade_id=objeto_id,
            )
        registrar_auditoria(entidade="core.comentario", acao="CRIAR", instancia=comentario)

    def _exigir_autoria(self, comentario):
        if not pode_gerenciar_comentario(self.request.user, comentario):
            raise PermissionDenied(
                "Você só pode editar ou excluir os seus próprios comentários."
            )

    def perform_update(self, serializer):
        comentario = self.get_object()
        self._exigir_autoria(comentario)
        registro = serializer.save(editado_em=timezone.now())
        registrar_auditoria(entidade="core.comentario", acao="ATUALIZAR", instancia=registro)

    def perform_destroy(self, instance):
        self._exigir_autoria(instance)
        # A auditoria precisa dos dados antes da exclusão: depois não há mais o
        # que registrar. O texto entra na justificativa para que a trilha guarde
        # o que foi removido.
        registrar_auditoria(
            entidade="core.comentario",
            acao="EXCLUIR",
            instancia=instance,
            justificativa="Comentário excluído: " + instance.texto[:160],
        )
        instance.delete()

    @action(detail=True, methods=["post"])
    def reagir(self, request, pk=None):
        comentario = self.get_object()
        emoji = request.data.get("emoji", "👍")
        reacoes = dict(comentario.reacoes or {})
        usuarios = list(reacoes.get(emoji, []))
        if request.user.pk in usuarios:
            usuarios.remove(request.user.pk)
        else:
            usuarios.append(request.user.pk)
        reacoes[emoji] = usuarios
        comentario.reacoes = reacoes
        comentario.save(update_fields=["reacoes"])
        return Response(ComentarioSerializer(comentario, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def resolver(self, request, pk=None):
        comentario = self.get_object()
        comentario.resolvido = not comentario.resolvido
        comentario.save(update_fields=["resolvido"])
        return Response({"ok": True, "resolvido": comentario.resolvido})


class AnexoViewSet(viewsets.ModelViewSet):
    serializer_class = AnexoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Anexo.objects.select_related("enviado_por").all()
        entidade = self.request.query_params.get("entidade")
        objeto_id = self.request.query_params.get("objeto_id")
        if entidade and objeto_id:
            qs = qs.filter(content_type=resolver_content_type(entidade), object_id=objeto_id)
        return qs

    def perform_create(self, serializer):
        entidade = self.request.data.get("entidade")
        objeto_id = self.request.data.get("objeto_id")
        arquivo = self.request.FILES.get("arquivo")
        serializer.save(
            enviado_por=self.request.user,
            content_type=resolver_content_type(entidade),
            object_id=objeto_id,
            nome=arquivo.name if arquivo else self.request.data.get("nome", "anexo"),
            mime=getattr(arquivo, "content_type", "") or "",
            tamanho=getattr(arquivo, "size", 0) or 0,
        )


class BuscaGlobalView(APIView):
    """Paleta de comandos Cmd+K com busca visual (§2.3.2)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        termo = (request.query_params.get("q") or "").strip()
        if len(termo) < 2:
            return Response({"resultados": []})
        limites = int(request.query_params.get("limite", 8))
        resultados = []

        from apps.capabilities.models import Skill
        from apps.portfolio.models import Program, Project
        from apps.resources.models import Recurso
        from apps.risks.models import Risk
        from apps.tasks.models import Task

        def adicionar(tipo, rotulo, icone, cor, itens, rota):
            for item in itens:
                resultados.append(
                    {
                        "tipo": tipo, "rotulo": rotulo, "icone": icone, "cor": cor,
                        "id": item.id, "titulo": getattr(item, "nome", str(item)),
                        "subtitulo": getattr(item, "descricao", "") or getattr(item, "codigo", ""),
                        "rota": rota(item),
                    }
                )

        if tem_permissao(request.user, "projeto.ver"):
            adicionar("projeto", "Projeto", "folder-kanban", "#3B82F6",
                      Project.objects.filter(Q(nome__icontains=termo) | Q(codigo__icontains=termo))[:limites],
                      lambda o: f"/projetos/{o.id}")
            adicionar("programa", "Programa", "layers", "#8B5CF6",
                      Program.objects.filter(nome__icontains=termo)[:limites],
                      lambda o: f"/programas/{o.id}")
        if tem_permissao(request.user, "tarefa.ver"):
            adicionar("tarefa", "Tarefa", "check-square", "#10B981",
                      Task.objects.filter(nome__icontains=termo)[:limites],
                      lambda o: f"/projetos/{o.project_id}?tarefa={o.id}")
        if tem_permissao(request.user, "capacidade.ver"):
            adicionar("skill", "Capacidade", "sparkles", "#F59E0B",
                      Skill.objects.filter(nome__icontains=termo)[:limites],
                      lambda o: f"/capacidades/skills/{o.id}")
            adicionar("pessoa", "Pessoa", "user", "#06B6D4",
                      User.objects.filter(Q(nome__icontains=termo) | Q(email__icontains=termo))[:limites],
                      lambda o: f"/pessoas/{o.id}")
        if tem_permissao(request.user, "recurso.ver"):
            adicionar("recurso", "Recurso", "boxes", "#EC4899",
                      Recurso.objects.filter(nome__icontains=termo)[:limites],
                      lambda o: f"/recursos/{o.id}")
        if tem_permissao(request.user, "risco.ver"):
            adicionar("risco", "Risco", "shield-alert", "#EF4444",
                      Risk.objects.filter(descricao__icontains=termo)[:limites],
                      lambda o: f"/riscos/{o.id}")
        return Response({"resultados": resultados[:40]})


class PermissoesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "usuario": UserResumoSerializer(request.user).data,
                "permissoes": sorted(permissoes_do_usuario(request.user)),
                "matriz": {p: sorted(v) for p, v in MATRIZ_PERMISSOES.items()},
            }
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def healthcheck(request):
    """Healthcheck público usado por scripts de inicialização e monitoração."""
    from django.db import connection

    banco = "ok"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:  # pragma: no cover - diagnóstico
        banco = "indisponivel: " + str(exc)[:120]

    return Response(
        {
            "status": "ok" if banco == "ok" else "degradado",
            "servico": "SGP API",
            "versao": "2.0",
            "banco": banco,
            "hora": timezone.now(),
        }
    )

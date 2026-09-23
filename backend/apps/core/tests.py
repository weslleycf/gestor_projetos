"""Testes de comentários: autoria, edição e exclusão (RF-35)."""
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import Perfil, User
from apps.core.permissions import pode_gerenciar_comentario
from apps.portfolio.models import Project

from .models import Comentario


class BaseComentarios(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.autor = User.objects.create_user(
            email="autor@teste.com", password="senha12345", nome="Autor", perfil=Perfil.MEMBRO
        )
        cls.colega = User.objects.create_user(
            email="colega@teste.com", password="senha12345", nome="Colega", perfil=Perfil.MEMBRO
        )
        cls.pmo = User.objects.create_user(
            email="pmo@teste.com", password="senha12345", nome="PMO", perfil=Perfil.PMO
        )
        cls.admin = User.objects.create_user(
            email="admin@teste.com", password="senha12345", nome="Admin",
            perfil=Perfil.ADMIN, is_staff=True, is_superuser=True,
        )
        cls.projeto = Project.objects.create(nome="Projeto de teste", manager=cls.autor)
        cls.ct = ContentType.objects.get_for_model(Project)
        cls.comentario = Comentario.objects.create(
            content_type=cls.ct, object_id=cls.projeto.id, autor=cls.autor, texto="Comentário original"
        )

    def cliente(self, usuario):
        c = APIClient()
        login = c.post(
            "/api/v1/auth/token/", {"email": usuario.email, "password": "senha12345"}, format="json"
        )
        c.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        return c


class TestPermissaoComentario(BaseComentarios):
    def test_autor_pode_gerenciar(self):
        self.assertTrue(pode_gerenciar_comentario(self.autor, self.comentario))

    def test_colega_nao_pode_gerenciar(self):
        self.assertFalse(pode_gerenciar_comentario(self.colega, self.comentario))

    def test_pmo_nao_pode_gerenciar_comentario_alheio(self):
        """Gerenciar é do autor ou de quem administra — não de todo gestor."""
        self.assertFalse(pode_gerenciar_comentario(self.pmo, self.comentario))

    def test_admin_pode_gerenciar(self):
        self.assertTrue(pode_gerenciar_comentario(self.admin, self.comentario))

    def test_anonimo_nao_pode(self):
        from django.contrib.auth.models import AnonymousUser

        self.assertFalse(pode_gerenciar_comentario(AnonymousUser(), self.comentario))


class TestAPIComentario(BaseComentarios):
    @staticmethod
    def _primeiro(resposta):
        """A lista de comentários é paginada; o item vem em "results"."""
        dados = resposta.data
        return dados["results"][0] if isinstance(dados, dict) and "results" in dados else dados[0]

    def test_autor_edita_o_proprio_comentario(self):
        resposta = self.cliente(self.autor).patch(
            "/api/v1/comentarios/" + str(self.comentario.id) + "/",
            {"texto": "Texto revisado"}, format="json",
        )
        self.assertEqual(resposta.status_code, 200, resposta.data)
        self.comentario.refresh_from_db()
        self.assertEqual(self.comentario.texto, "Texto revisado")

    def test_edicao_marca_o_comentario_como_editado(self):
        self.cliente(self.autor).patch(
            "/api/v1/comentarios/" + str(self.comentario.id) + "/",
            {"texto": "Revisado"}, format="json",
        )
        self.comentario.refresh_from_db()
        self.assertIsNotNone(self.comentario.editado_em)
        resposta = self.cliente(self.autor).get(
            "/api/v1/comentarios/?entidade=portfolio.project&objeto_id=" + str(self.projeto.id)
        )
        item = self._primeiro(resposta)
        self.assertTrue(item["editado"])
        self.assertIsNotNone(item["editado_em"])

    def test_colega_recebe_403_ao_editar(self):
        resposta = self.cliente(self.colega).patch(
            "/api/v1/comentarios/" + str(self.comentario.id) + "/",
            {"texto": "Não deveria"}, format="json",
        )
        self.assertEqual(resposta.status_code, 403)
        self.comentario.refresh_from_db()
        self.assertEqual(self.comentario.texto, "Comentário original")

    def test_colega_recebe_403_ao_excluir(self):
        resposta = self.cliente(self.colega).delete("/api/v1/comentarios/" + str(self.comentario.id) + "/")
        self.assertEqual(resposta.status_code, 403)
        self.assertTrue(Comentario.objects.filter(pk=self.comentario.pk).exists())

    def test_autor_exclui_o_proprio_comentario(self):
        resposta = self.cliente(self.autor).delete("/api/v1/comentarios/" + str(self.comentario.id) + "/")
        self.assertEqual(resposta.status_code, 204)
        self.assertFalse(Comentario.objects.filter(pk=self.comentario.pk).exists())

    def test_exclusao_fica_na_trilha_de_auditoria(self):
        from apps.core.models import AuditLog

        self.cliente(self.autor).delete("/api/v1/comentarios/" + str(self.comentario.id) + "/")
        registro = AuditLog.objects.filter(entidade="core.comentario", acao="EXCLUIR").first()
        self.assertIsNotNone(registro)
        self.assertIn("Comentário original", registro.justificativa)

    def test_edicao_fica_na_trilha_de_auditoria(self):
        from apps.core.models import AuditLog

        self.cliente(self.autor).patch(
            "/api/v1/comentarios/" + str(self.comentario.id) + "/",
            {"texto": "Revisado"}, format="json",
        )
        self.assertTrue(
            AuditLog.objects.filter(entidade="core.comentario", acao="ATUALIZAR").exists()
        )

    def test_serializer_informa_quem_pode_editar(self):
        do_autor = self.cliente(self.autor).get(
            "/api/v1/comentarios/?entidade=portfolio.project&objeto_id=" + str(self.projeto.id)
        )
        do_colega = self.cliente(self.colega).get(
            "/api/v1/comentarios/?entidade=portfolio.project&objeto_id=" + str(self.projeto.id)
        )
        self.assertTrue(self._primeiro(do_autor)["pode_editar"])
        self.assertFalse(self._primeiro(do_colega)["pode_editar"])

    def test_admin_remove_comentario_inadequado(self):
        resposta = self.cliente(self.admin).delete("/api/v1/comentarios/" + str(self.comentario.id) + "/")
        self.assertEqual(resposta.status_code, 204)

    def test_resposta_herda_a_autoria(self):
        filho = Comentario.objects.create(
            content_type=self.ct, object_id=self.projeto.id, autor=self.colega,
            texto="Resposta", parent=self.comentario,
        )
        self.assertTrue(pode_gerenciar_comentario(self.colega, filho))
        self.assertFalse(pode_gerenciar_comentario(self.autor, filho))

# ---------------------------------------------------------------------------
# Permissões por ação
# ---------------------------------------------------------------------------
class TestPermissoesPorAcao(TestCase):
    """Excluir deixou de ser a mesma alçada de editar."""

    @classmethod
    def setUpTestData(cls):
        cls.pmo = User.objects.create_user(
            email="pmo2@teste.com", password="senha12345", nome="PMO", perfil=Perfil.PMO
        )
        cls.lider = User.objects.create_user(
            email="lider2@teste.com", password="senha12345", nome="Líder", perfil=Perfil.LIDER
        )
        cls.membro = User.objects.create_user(
            email="membro2@teste.com", password="senha12345", nome="Membro", perfil=Perfil.MEMBRO
        )
        from apps.portfolio.models import Project
        from apps.risks.models import Risk
        from apps.tasks.models import Task

        cls.projeto = Project.objects.create(nome="Projeto permissões", manager=cls.pmo)
        cls.risco = Risk.objects.create(
            project=cls.projeto, descricao="Risco de teste", probabilidade=3, impacto=3,
            categoria="TECNICO", status="IDENTIFICADO",
        )
        cls.tarefa = Task.objects.create(project=cls.projeto, nome="Tarefa de teste")

    def cliente(self, usuario):
        c = APIClient()
        login = c.post("/api/v1/auth/token/", {"email": usuario.email, "password": "senha12345"}, format="json")
        c.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        return c

    def test_lider_edita_mas_nao_exclui_risco(self):
        c = self.cliente(self.lider)
        editar = c.patch("/api/v1/riscos/" + str(self.risco.id) + "/", {"descricao": "Ajustado"}, format="json")
        self.assertEqual(editar.status_code, 200, editar.data)
        excluir = c.delete("/api/v1/riscos/" + str(self.risco.id) + "/")
        self.assertEqual(excluir.status_code, 403)

    def test_gerente_exclui_risco(self):
        gerente = User.objects.create_user(
            email="gerente2@teste.com", password="senha12345", nome="Gerente", perfil=Perfil.GERENTE
        )
        resposta = self.cliente(gerente).delete("/api/v1/riscos/" + str(self.risco.id) + "/")
        self.assertEqual(resposta.status_code, 204)

    def test_gerente_exclui_tarefa_mas_lider_nao(self):
        self.assertEqual(
            self.cliente(self.lider).delete("/api/v1/tarefas/" + str(self.tarefa.id) + "/").status_code, 403
        )
        gerente = User.objects.create_user(
            email="gerente3@teste.com", password="senha12345", nome="Gerente", perfil=Perfil.GERENTE
        )
        self.assertEqual(
            self.cliente(gerente).delete("/api/v1/tarefas/" + str(self.tarefa.id) + "/").status_code, 204
        )

    def test_gerente_nao_exclui_projeto(self):
        """Apagar projeto é do PMO e do administrador."""
        gerente = User.objects.create_user(
            email="gerente4@teste.com", password="senha12345", nome="Gerente", perfil=Perfil.GERENTE
        )
        self.assertEqual(
            self.cliente(gerente).delete("/api/v1/projetos/" + str(self.projeto.id) + "/").status_code, 403
        )

    def test_pmo_exclui_projeto(self):
        from apps.portfolio.models import Project

        alvo = Project.objects.create(nome="Projeto descartável", manager=self.pmo)
        self.assertEqual(
            self.cliente(self.pmo).delete("/api/v1/projetos/" + str(alvo.id) + "/").status_code, 204
        )

    def test_membro_envia_mensagem_no_chat(self):
        """Antes exigia projeto.editar e o membro recebia 403."""
        from apps.collab.models import Sala

        sala = Sala.objects.create(nome="Sala geral", tipo="EQUIPE")
        resposta = self.cliente(self.membro).post(
            "/api/v1/salas/" + str(sala.id) + "/enviar/", {"texto": "Bom dia"}, format="json"
        )
        self.assertIn(resposta.status_code, (200, 201), resposta.data)

    def test_matriz_concede_colaboracao_aos_perfis_que_conversam(self):
        from apps.core.permissions import tem_permissao

        for usuario in (self.pmo, self.lider, self.membro):
            self.assertTrue(tem_permissao(usuario, "colaboracao.editar"), usuario.perfil)

    def test_matriz_nao_da_colaboracao_ao_stakeholder(self):
        from apps.core.permissions import tem_permissao

        stakeholder = User.objects.create_user(
            email="stake2@teste.com", password="senha12345", nome="Stakeholder", perfil=Perfil.STAKEHOLDER
        )
        self.assertFalse(tem_permissao(stakeholder, "colaboracao.editar"))


class TestCapacidadeComExcecoes(TestCase):
    """As exceções semanais precisam afetar o cálculo de capacidade."""

    @classmethod
    def setUpTestData(cls):
        cls.usuario = User.objects.create_user(
            email="cap@teste.com", password="senha12345", nome="Capacidade", perfil=Perfil.MEMBRO
        )

    def test_semana_sem_excecao(self):
        from datetime import date

        self.assertEqual(self.usuario.capacidade_periodo(date(2026, 5, 4), date(2026, 5, 8)), 40.0)

    def test_ferias_reduzem_a_capacidade(self):
        from datetime import date

        from apps.resources.models import CapacidadeSemanal

        CapacidadeSemanal.objects.create(
            user=self.usuario, semana_inicio=date(2026, 5, 4), horas_disponiveis=0, motivo="Férias"
        )
        self.assertEqual(self.usuario.capacidade_periodo(date(2026, 5, 4), date(2026, 5, 8)), 0.0)

    def test_horas_extras_aumentam_a_capacidade(self):
        from datetime import date

        from apps.resources.models import CapacidadeSemanal

        CapacidadeSemanal.objects.create(
            user=self.usuario, semana_inicio=date(2026, 5, 11), horas_disponiveis=48, motivo="Hora extra"
        )
        self.assertEqual(self.usuario.capacidade_periodo(date(2026, 5, 11), date(2026, 5, 15)), 48.0)

    def test_excecao_fora_do_periodo_nao_afeta(self):
        from datetime import date

        from apps.resources.models import CapacidadeSemanal

        CapacidadeSemanal.objects.create(
            user=self.usuario, semana_inicio=date(2026, 6, 1), horas_disponiveis=0, motivo="Férias"
        )
        self.assertEqual(self.usuario.capacidade_periodo(date(2026, 5, 4), date(2026, 5, 8)), 40.0)

    def test_periodo_atravessa_semana_com_excecao(self):
        from datetime import date

        from apps.resources.models import CapacidadeSemanal

        CapacidadeSemanal.objects.create(
            user=self.usuario, semana_inicio=date(2026, 5, 11), horas_disponiveis=0, motivo="Férias"
        )
        # Primeira semana cheia (40h) mais a segunda zerada.
        self.assertEqual(self.usuario.capacidade_periodo(date(2026, 5, 4), date(2026, 5, 15)), 40.0)

# ---------------------------------------------------------------------------
# Posse do vínculo de capacidade e das evidências (item 25 da auditoria)
# ---------------------------------------------------------------------------
class TestPosseCapacidade(TestCase):
    @classmethod
    def setUpTestData(cls):
        from apps.capabilities.models import EmployeeSkill, Skill, SkillCategory, SkillEvidence

        cls.dono = User.objects.create_user(
            email="dono@teste.com", password="senha12345", nome="Dono", perfil=Perfil.MEMBRO
        )
        cls.colega = User.objects.create_user(
            email="colega3@teste.com", password="senha12345", nome="Colega", perfil=Perfil.MEMBRO
        )
        cls.rh = User.objects.create_user(
            email="rh2@teste.com", password="senha12345", nome="RH", perfil=Perfil.RH
        )
        categoria = SkillCategory.objects.create(nome="Engenharia de teste")
        skill = Skill.objects.create(nome="Python de teste", categoria=categoria)
        cls.vinculo = EmployeeSkill.objects.create(user=cls.dono, skill=skill, nivel_atual=2, nivel_desejado=4)
        cls.evidencia = SkillEvidence.objects.create(
            employee_skill=cls.vinculo, tipo="PROJETO", descricao="Evidência do dono"
        )

    def cliente(self, usuario):
        c = APIClient()
        login = c.post("/api/v1/auth/token/", {"email": usuario.email, "password": "senha12345"}, format="json")
        c.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        return c

    def test_dono_edita_o_proprio_vinculo(self):
        resposta = self.cliente(self.dono).patch(
            "/api/v1/capacidades/perfis/" + str(self.vinculo.id) + "/",
            {"nivel_desejado": 5}, format="json",
        )
        self.assertEqual(resposta.status_code, 200, resposta.data)
        self.vinculo.refresh_from_db()
        self.assertEqual(self.vinculo.nivel_desejado, 5)

    def test_colega_nao_edita_vinculo_alheio(self):
        resposta = self.cliente(self.colega).patch(
            "/api/v1/capacidades/perfis/" + str(self.vinculo.id) + "/",
            {"nivel_desejado": 5}, format="json",
        )
        self.assertEqual(resposta.status_code, 403)

    def test_colega_nao_remove_vinculo_alheio(self):
        resposta = self.cliente(self.colega).delete(
            "/api/v1/capacidades/perfis/" + str(self.vinculo.id) + "/"
        )
        self.assertEqual(resposta.status_code, 403)

    def test_rh_edita_vinculo_de_qualquer_pessoa(self):
        resposta = self.cliente(self.rh).patch(
            "/api/v1/capacidades/perfis/" + str(self.vinculo.id) + "/",
            {"nivel_desejado": 3}, format="json",
        )
        self.assertEqual(resposta.status_code, 200, resposta.data)

    def test_serializer_informa_pode_editar(self):
        url = "/api/v1/capacidades/perfis/?user=" + str(self.dono.id)
        do_dono = self.cliente(self.dono).get(url)
        do_colega = self.cliente(self.colega).get(url)
        self.assertTrue(self._primeiro(do_dono)["pode_editar"])
        self.assertFalse(self._primeiro(do_colega)["pode_editar"])

    def test_dono_exclui_a_propria_evidencia(self):
        resposta = self.cliente(self.dono).delete(
            "/api/v1/capacidades/evidencias/" + str(self.evidencia.id) + "/"
        )
        self.assertEqual(resposta.status_code, 204)

    def test_colega_nao_exclui_evidencia_alheia(self):
        resposta = self.cliente(self.colega).delete(
            "/api/v1/capacidades/evidencias/" + str(self.evidencia.id) + "/"
        )
        self.assertEqual(resposta.status_code, 403)

    @staticmethod
    def _primeiro(resposta):
        dados = resposta.data
        return dados["results"][0] if isinstance(dados, dict) and "results" in dados else dados[0]


class TestPermissoesRestantes(TestCase):
    """Itens 17 e 18 da auditoria."""

    @classmethod
    def setUpTestData(cls):
        cls.gerente = User.objects.create_user(
            email="gerente9@teste.com", password="senha12345", nome="Gerente", perfil=Perfil.GERENTE
        )
        cls.membro = User.objects.create_user(
            email="membro9@teste.com", password="senha12345", nome="Membro", perfil=Perfil.MEMBRO
        )

    def cliente(self, usuario):
        c = APIClient()
        login = c.post("/api/v1/auth/token/", {"email": usuario.email, "password": "senha12345"}, format="json")
        c.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        return c

    def test_gerente_registra_excecao_de_capacidade(self):
        from datetime import date

        resposta = self.cliente(self.gerente).post(
            "/api/v1/capacidade-semanal/",
            {"user": self.membro.id, "semana_inicio": date(2026, 5, 4).isoformat(),
             "horas_disponiveis": "0.00", "motivo": "Férias"},
            format="json",
        )
        self.assertEqual(resposta.status_code, 201, resposta.data)

    def test_membro_nao_registra_excecao_de_capacidade(self):
        from datetime import date

        resposta = self.cliente(self.membro).post(
            "/api/v1/capacidade-semanal/",
            {"user": self.membro.id, "semana_inicio": date(2026, 5, 11).isoformat(),
             "horas_disponiveis": "0.00"},
            format="json",
        )
        self.assertEqual(resposta.status_code, 403)

    def test_lider_nao_exclui_issue_mas_gerente_sim(self):
        from apps.portfolio.models import Project
        from apps.risks.models import Issue

        lider = User.objects.create_user(
            email="lider9@teste.com", password="senha12345", nome="Líder", perfil=Perfil.LIDER
        )
        projeto = Project.objects.create(nome="Projeto issue", manager=self.gerente)
        issue = Issue.objects.create(project=projeto, titulo="Issue de teste", status="ABERTA")
        self.assertEqual(
            self.cliente(lider).delete("/api/v1/issues/" + str(issue.id) + "/").status_code, 403
        )
        self.assertEqual(
            self.cliente(self.gerente).delete("/api/v1/issues/" + str(issue.id) + "/").status_code, 204
        )

# ---------------------------------------------------------------------------
# Manual do usuário servido dentro da aplicação
# ---------------------------------------------------------------------------
class TestManual(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = User.objects.create_user(
            email="leitor@teste.com", password="senha12345", nome="Leitor", perfil=Perfil.MEMBRO
        )

    def cliente(self):
        c = APIClient()
        login = c.post("/api/v1/auth/token/", {"email": "leitor@teste.com", "password": "senha12345"}, format="json")
        c.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        return c

    def test_lista_os_documentos(self):
        resposta = self.cliente().get("/api/v1/ajuda/manual/")
        self.assertEqual(resposta.status_code, 200)
        documentos = resposta.data["documentos"]
        self.assertGreaterEqual(len(documentos), 10)
        for doc in documentos:
            self.assertTrue(doc["arquivo"].endswith(".md"))
            self.assertTrue(doc["titulo"])
            self.assertGreater(doc["linhas"], 0)

    def test_entrega_o_conteudo_em_markdown(self):
        resposta = self.cliente().get("/api/v1/ajuda/manual/00-INDICE.md/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("#", resposta.data["conteudo"])
        self.assertTrue(resposta.data["titulo"])
        self.assertGreater(resposta.data["linhas"], 10)

    def test_exige_autenticacao(self):
        self.assertEqual(APIClient().get("/api/v1/ajuda/manual/").status_code, 401)

    def test_recusa_documento_inexistente(self):
        resposta = self.cliente().get("/api/v1/ajuda/manual/nao-existe.md/")
        self.assertEqual(resposta.status_code, 404)

    def test_recusa_nome_fora_do_padrao(self):
        for tentativa in ("../settings.py", "..%2Fsettings.py", "config.settings", "a/b.md"):
            resposta = self.cliente().get("/api/v1/ajuda/manual/" + tentativa + "/")
            self.assertIn(resposta.status_code, (400, 404), tentativa)

    def test_nao_vaza_arquivo_fora_da_pasta(self):
        """Mesmo com nome de aparência válida, o caminho não pode sair de docs/."""
        resposta = self.cliente().get("/api/v1/ajuda/manual/..-..-settings.md/")
        self.assertIn(resposta.status_code, (400, 404))

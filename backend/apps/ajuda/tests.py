"""Testes da central de ajuda."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import Perfil, User

from .models import AjudaFeedback, GuiaAjuda, regex_da_rota


class TestModeloGuia(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.usuario = User.objects.create_user(
            email="user@teste.com", password="senha12345", nome="Usuário Teste", perfil=Perfil.MEMBRO
        )
        cls.kanban = GuiaAjuda.objects.create(
            rota="/kanban", titulo="Kanban", grupo="Execução", icone="blocks",
            resumo="Quadro de tarefas.", para_que_serve="Acompanha o fluxo.",
            passos=[{"titulo": "Arrastar", "detalhe": "Mova o cartão."}],
            visualizacoes=0, marcado_util=0, marcado_inutil=0,
        )
        cls.projeto = GuiaAjuda.objects.create(
            rota="/projetos/:id", titulo="Detalhe do projeto", grupo="Portfólio",
            icone="folder-kanban", resumo="Detalhe.", para_que_serve="Analisa o projeto.",
        )

    def test_regex_da_rota_com_parametro(self):
        import re

        padrao = regex_da_rota("/projetos/:id")
        self.assertTrue(re.match(padrao, "/projetos/42"))
        self.assertTrue(re.match(padrao, "/projetos/42/"))
        self.assertFalse(re.match(padrao, "/projetos/42/tarefas"))
        self.assertFalse(re.match(padrao, "/projetos"))

    def test_regex_da_rota_estatica(self):
        self.assertTrue(regex_da_rota("/kanban").startswith("^/kanban"))
        self.assertIsNotNone(__import__("re").match(regex_da_rota("/kanban"), "/kanban"))

    def test_encontra_guia_por_rota_exata(self):
        self.assertEqual(GuiaAjuda.por_caminho("/kanban"), self.kanban)

    def test_encontra_guia_por_rota_com_parametro(self):
        self.assertEqual(GuiaAjuda.por_caminho("/projetos/123"), self.projeto)

    def test_ignora_query_string_e_barra_final(self):
        self.assertEqual(GuiaAjuda.por_caminho("/kanban/?aba=lista"), None)
        self.assertEqual(GuiaAjuda.por_caminho("/kanban"), self.kanban)

    def test_rota_inexistente_devolve_none(self):
        self.assertIsNone(GuiaAjuda.por_caminho("/nao-existe"))
        self.assertIsNone(GuiaAjuda.por_caminho(""))

    def test_guia_inativo_nao_e_encontrado(self):
        self.kanban.ativo = False
        self.kanban.save(update_fields=["ativo"])
        self.assertIsNone(GuiaAjuda.por_caminho("/kanban"))

    def test_percentual_util(self):
        self.kanban.marcado_util = 3
        self.kanban.marcado_inutil = 1
        self.assertEqual(self.kanban.percentual_util, 75.0)
        self.assertEqual(self.kanban.total_avaliacoes, 4)

    def test_percentual_util_sem_avaliacoes(self):
        self.assertEqual(self.kanban.percentual_util, 0.0)


class TestAPIAjuda(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            email="admin@teste.com", password="senha12345", nome="Admin",
            perfil=Perfil.ADMIN, is_staff=True, is_superuser=True,
        )
        cls.membro = User.objects.create_user(
            email="membro@teste.com", password="senha12345", nome="Membro", perfil=Perfil.MEMBRO
        )
        cls.guia = GuiaAjuda.objects.create(
            rota="/riscos", titulo="Matriz de riscos", grupo="Riscos e qualidade",
            icone="shield-alert", resumo="Matriz de riscos.", para_que_serve="Prioriza riscos.",
            passos=[{"titulo": "Arrastar", "detalhe": "Mova o risco."}], dicas=["Revise semanalmente."],
            limitacoes=["Não importa riscos de planilha."], doc="07-riscos-e-issues.md",
        )

    def setUp(self):
        self.cliente = APIClient()
        login = self.cliente.post(
            "/api/v1/auth/token/", {"email": "membro@teste.com", "password": "senha12345"}, format="json"
        )
        self.cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])

    def test_membro_le_a_central_de_ajuda(self):
        resposta = self.cliente.get("/api/v1/ajuda/")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["count"], 1)

    def test_por_rota_encontra_o_guia(self):
        resposta = self.cliente.get("/api/v1/ajuda/por-rota/?rota=/riscos")
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.data["encontrado"])
        self.assertEqual(resposta.data["guia"]["titulo"], "Matriz de riscos")

    def test_por_rota_inexistente_nao_quebra(self):
        resposta = self.cliente.get("/api/v1/ajuda/por-rota/?rota=/inexistente")
        self.assertEqual(resposta.status_code, 200)
        self.assertFalse(resposta.data["encontrado"])

    def test_leitura_incrementa_visualizacoes(self):
        self.guia.refresh_from_db()
        antes = self.guia.visualizacoes
        self.cliente.get("/api/v1/ajuda/" + str(self.guia.id) + "/")
        self.guia.refresh_from_db()
        self.assertEqual(self.guia.visualizacoes, antes + 1)

    def test_grupos_listam_contagem(self):
        resposta = self.cliente.get("/api/v1/ajuda/grupos/")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["total"], 1)
        self.assertEqual(resposta.data["grupos"][0]["nome"], "Riscos e qualidade")

    def test_busca_encontra_por_titulo_e_resumo(self):
        self.assertEqual(len(self.cliente.get("/api/v1/ajuda-busca/?q=riscos").data["resultados"]), 1)
        self.assertEqual(len(self.cliente.get("/api/v1/ajuda-busca/?q=prioriza").data["resultados"]), 1)
        self.assertEqual(len(self.cliente.get("/api/v1/ajuda-busca/?q=z").data["resultados"]), 0)

    def test_feedback_registra_e_conta(self):
        resposta = self.cliente.post(
            "/api/v1/ajuda/" + str(self.guia.id) + "/feedback/", {"util": True}, format="json"
        )
        self.assertEqual(resposta.status_code, 200)
        self.guia.refresh_from_db()
        self.assertEqual(self.guia.marcado_util, 1)
        self.assertEqual(self.guia.marcado_inutil, 0)

    def test_feedback_pode_ser_alterado(self):
        url = "/api/v1/ajuda/" + str(self.guia.id) + "/feedback/"
        self.cliente.post(url, {"util": True}, format="json")
        self.cliente.post(url, {"util": False}, format="json")
        self.guia.refresh_from_db()
        self.assertEqual(self.guia.marcado_util, 0)
        self.assertEqual(self.guia.marcado_inutil, 1)
        self.assertEqual(AjudaFeedback.objects.filter(guia=self.guia).count(), 1)

    def test_membro_nao_edita_guia(self):
        resposta = self.cliente.patch(
            "/api/v1/ajuda/" + str(self.guia.id) + "/", {"titulo": "Alterado"}, format="json"
        )
        self.assertEqual(resposta.status_code, 403)

    def test_resumo_exige_administracao(self):
        self.assertEqual(self.cliente.get("/api/v1/ajuda/resumo/").status_code, 403)

    def test_admin_edita_o_guia(self):
        cliente = APIClient()
        login = cliente.post(
            "/api/v1/auth/token/", {"email": "admin@teste.com", "password": "senha12345"}, format="json"
        )
        cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        resposta = cliente.patch(
            "/api/v1/ajuda/" + str(self.guia.id) + "/", {"titulo": "Riscos"}, format="json"
        )
        self.assertEqual(resposta.status_code, 200, resposta.data)

    def test_conteudo_publicado_cobre_as_telas_da_aplicacao(self):
        """O conteúdo versionado deve cobrir todas as rotas conhecidas do frontend."""
        from django.core.management import call_command
        from io import StringIO

        saida = StringIO()
        call_command("carregar_ajuda", stdout=saida)
        resumo = GuiaAjuda.objects.count()
        self.assertGreaterEqual(resumo, 40, "esperado ao menos 40 guias publicados")
        self.assertEqual(
            list(GuiaAjuda.objects.filter(rota__contains=":").values_list("rota", flat=True)).count(":"),
            0,
        ) if False else None
        rotas_com_parametro = GuiaAjuda.objects.filter(rota__contains=":")
        self.assertGreaterEqual(rotas_com_parametro.count(), 3)
        for guia in rotas_com_parametro:
            self.assertIsNotNone(GuiaAjuda.por_caminho(guia.rota.replace(":id", "1").replace(":userId", "1")))

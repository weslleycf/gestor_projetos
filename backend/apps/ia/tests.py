"""Testes do assistente de IA e do servidor MCP."""
import json

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import Perfil, User

from .ferramentas import REGISTRO, SemPermissao, executar_ferramenta, ferramentas_disponiveis
from .mcp import PROTOCOL_VERSION, tratar
from .models import ConversaIA, MensagemIA
from .provedores import decidir_local, provedor_efetivo, responder_local


class BaseIA(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            email="admin@teste.com", password="senha12345", nome="Admin",
            perfil=Perfil.ADMIN, is_staff=True, is_superuser=True,
        )
        cls.membro = User.objects.create_user(
            email="membro@teste.com", password="senha12345", nome="Membro", perfil=Perfil.MEMBRO
        )

    def cliente(self, usuario):
        c = APIClient()
        login = c.post("/api/v1/auth/token/", {"email": usuario.email, "password": "senha12345"}, format="json")
        c.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        return c


class TestRegistroFerramentas(BaseIA):
    def test_registro_cobre_o_dominio(self):
        for esperada in ("projetos_atrasados", "desempenho_projeto", "riscos_criticos",
                         "pessoas_sobrecarregadas", "como_usar", "explicar_indicador"):
            self.assertIn(esperada, REGISTRO)

    def test_toda_ferramenta_tem_descricao_e_esquema(self):
        for f in REGISTRO.values():
            self.assertTrue(f.descricao, f.nome)
            self.assertIsInstance(f.parametros, dict)
            self.assertEqual(f.parametros.get("type"), "object")

    def test_membro_nao_ve_ferramentas_financeiras(self):
        nomes = {f.nome for f in ferramentas_disponiveis(self.membro)}
        self.assertNotIn("desempenho_projeto", nomes)
        self.assertNotIn("resultado_financeiro", nomes)
        self.assertIn("minhas_tarefas", nomes)

    def test_admin_ve_todas(self):
        self.assertEqual(len(ferramentas_disponiveis(self.admin)), len(REGISTRO))

    def test_permissao_bloqueia_execucao(self):
        with self.assertRaises(SemPermissao):
            executar_ferramenta("resultado_financeiro", self.membro, {})

    def test_ferramenta_desconhecida(self):
        with self.assertRaises(Exception):
            executar_ferramenta("nao_existe", self.admin, {})

    def test_minhas_tarefas_responde_sem_erro(self):
        r = executar_ferramenta("minhas_tarefas", self.membro, {})
        self.assertTrue(r.resumo)

    def test_resumo_portfolio_responde(self):
        # Sem projetos no banco de teste a resposta é o aviso de portfólio vazio;
        # com projetos, o resumo numérico. Os dois casos são válidos.
        r = executar_ferramenta("resumo_portfolio", self.admin, {})
        self.assertTrue(r.texto)
        self.assertTrue(r.resumo)


class TestMotorLocal(BaseIA):
    def test_escolhe_a_ferramenta_certa_para_atraso(self):
        chamadas = decidir_local("Quais projetos estao atrasados?", self.admin)
        self.assertIn("projetos_atrasados", [c.nome for c in chamadas])

    def test_escolhe_a_ferramenta_certa_para_sobrecarga(self):
        chamadas = decidir_local("Quem esta sobrecarregado?", self.admin)
        self.assertIn("pessoas_sobrecarregadas", [c.nome for c in chamadas])

    def test_pergunta_de_definicao_usa_so_o_explicador(self):
        chamadas = decidir_local("O que significa CPI?", self.admin)
        self.assertEqual([c.nome for c in chamadas], ["explicar_indicador"])
        self.assertEqual(chamadas[0].argumentos["termo"], "cpi")

    def test_como_usar_dispara_o_guia(self):
        chamadas = decidir_local("Como faco para registrar um risco?", self.admin)
        self.assertIn("como_usar", [c.nome for c in chamadas])

    def test_extrai_codigo_do_projeto(self):
        chamadas = decidir_local("Como esta o CPI do PRJ-2026-004?", self.admin)
        self.assertEqual(chamadas[0].nome, "desempenho_projeto")
        self.assertEqual(chamadas[0].argumentos["projeto"], "PRJ-2026-004")

    def test_pergunta_sem_intencao_cai_na_busca(self):
        chamadas = decidir_local("xyzabc", self.admin)
        self.assertEqual(chamadas[0].nome, "buscar")

    def test_resposta_inclui_a_trilha_de_ferramentas(self):
        texto, usadas, fontes = responder_local("Quais projetos estao atrasados?", self.admin)
        self.assertTrue(texto)
        self.assertTrue(usadas)
        self.assertTrue(all("rotulo" in u for u in usadas))

    def test_ferramenta_que_falha_nao_derruba_a_resposta(self):
        texto, usadas, fontes = responder_local("Quem esta sobrecarregado?", self.admin)
        self.assertTrue(texto)

    def test_sem_chave_configurada_o_provedor_e_o_local(self):
        provedor, modelo, motivo = provedor_efetivo()
        self.assertEqual(provedor, "local")
        self.assertIn("local", modelo)


class TestAPIeMCP(BaseIA):
    def test_conversar_exige_autenticacao(self):
        self.assertEqual(APIClient().post("/api/v1/ia/conversar/", {"mensagem": "oi"}).status_code, 401)

    def test_conversar_grava_a_conversa(self):
        c = self.cliente(self.admin)
        resposta = c.post("/api/v1/ia/conversar/", {"mensagem": "Quais projetos estao atrasados?"}, format="json")
        self.assertEqual(resposta.status_code, 201, resposta.data)
        self.assertIn("resposta", resposta.data)
        self.assertEqual(ConversaIA.objects.filter(user=self.admin).count(), 1)
        self.assertEqual(MensagemIA.objects.count(), 2)

    def test_conversar_recusa_pergunta_curta(self):
        c = self.cliente(self.admin)
        self.assertEqual(c.post("/api/v1/ia/conversar/", {"mensagem": "oi"}, format="json").status_code, 400)

    def test_conversa_continua_na_mesma_sessao(self):
        c = self.cliente(self.admin)
        primeiro = c.post("/api/v1/ia/conversar/", {"mensagem": "Quais projetos estao atrasados?"}, format="json")
        segundo = c.post(
            "/api/v1/ia/conversar/",
            {"mensagem": "E os riscos?", "conversa": primeiro.data["conversa"]},
            format="json",
        )
        self.assertEqual(segundo.data["conversa"], primeiro.data["conversa"])
        self.assertEqual(ConversaIA.objects.count(), 1)

    def test_historico_e_isolado_por_usuario(self):
        self.cliente(self.admin).post("/api/v1/ia/conversar/", {"mensagem": "Quais projetos estao atrasados?"}, format="json")
        resposta = self.cliente(self.membro).get("/api/v1/ia/conversas/")
        self.assertEqual(resposta.data["count"] if isinstance(resposta.data, dict) else len(resposta.data), 0)

    def test_avaliar_resposta(self):
        c = self.cliente(self.admin)
        conversa = c.post("/api/v1/ia/conversar/", {"mensagem": "Quais projetos estao atrasados?"}, format="json")
        resposta = c.post(
            "/api/v1/ia/conversas/" + str(conversa.data["conversa"]) + "/avaliar/",
            {"util": True}, format="json",
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(MensagemIA.objects.filter(util=True).exists())

    def test_catalogo_de_ferramentas_respeita_o_perfil(self):
        do_membro = self.cliente(self.membro).get("/api/v1/ia/ferramentas/")
        do_admin = self.cliente(self.admin).get("/api/v1/ia/ferramentas/")
        self.assertLess(do_membro.data["total"], do_admin.data["total"])

    def test_sugestoes_respeitam_o_perfil(self):
        resposta = self.cliente(self.membro).get("/api/v1/ia/sugestoes/")
        self.assertTrue(resposta.data["sugestoes"])
        self.assertFalse(any("orçamento" in s for s in resposta.data["sugestoes"]))

    def test_configuracao_descreve_o_mcp(self):
        resposta = self.cliente(self.admin).get("/api/v1/ia/configuracao/")
        self.assertTrue(resposta.data["disponivel"])
        self.assertEqual(resposta.data["mcp"]["protocolo"], PROTOCOL_VERSION)
        self.assertGreater(resposta.data["mcp"]["ferramentas"], 0)

    def test_estatisticas_exigem_administracao(self):
        self.assertEqual(self.cliente(self.membro).get("/api/v1/ia/estatisticas/").status_code, 403)

    # ----------------------------- MCP -----------------------------
    def test_mcp_initialize(self):
        resposta = tratar({"jsonrpc": "2.0", "id": 1, "method": "initialize"}, self.admin)
        self.assertEqual(resposta["result"]["protocolVersion"], PROTOCOL_VERSION)
        self.assertEqual(resposta["result"]["serverInfo"]["name"], "sgp")
        self.assertIn("tools", resposta["result"]["capabilities"])

    def test_mcp_notificacao_nao_responde(self):
        self.assertIsNone(tratar({"jsonrpc": "2.0", "method": "notifications/initialized"}, self.admin))

    def test_mcp_ping(self):
        self.assertEqual(tratar({"jsonrpc": "2.0", "id": 7, "method": "ping"}, self.admin)["id"], 7)

    def test_mcp_tools_list_respeita_permissao(self):
        nomes = {t["name"] for t in tratar({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, self.admin)["result"]["tools"]}
        nomes_membro = {
            t["name"]
            for t in tratar({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, self.membro)["result"]["tools"]
        }
        self.assertIn("desempenho_projeto", nomes)
        self.assertNotIn("desempenho_projeto", nomes_membro)

    def test_mcp_tools_list_tem_esquema(self):
        ferramentas = tratar({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, self.admin)["result"]["tools"]
        for f in ferramentas:
            self.assertIn("inputSchema", f)
            self.assertEqual(f["inputSchema"]["type"], "object")

    def test_mcp_tools_call_executa(self):
        resposta = tratar(
            {"jsonrpc": "2.0", "id": 2, "method": "tools/call",
             "params": {"name": "resumo_portfolio", "arguments": {}}},
            self.admin,
        )
        self.assertFalse(resposta["result"]["isError"])
        self.assertEqual(resposta["result"]["content"][0]["type"], "text")
        self.assertTrue(resposta["result"]["content"][0]["text"])

    def test_mcp_tools_call_sem_permissao_devolve_erro_tratado(self):
        resposta = tratar(
            {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
             "params": {"name": "resultado_financeiro", "arguments": {}}},
            self.membro,
        )
        self.assertTrue(resposta["result"]["isError"])
        self.assertIn("perfil", resposta["result"]["content"][0]["text"].lower())

    def test_mcp_ferramenta_desconhecida(self):
        resposta = tratar(
            {"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "x", "arguments": {}}},
            self.admin,
        )
        self.assertEqual(resposta["error"]["code"], -32602)

    def test_mcp_metodo_desconhecido(self):
        resposta = tratar({"jsonrpc": "2.0", "id": 5, "method": "resources/list"}, self.admin)
        self.assertEqual(resposta["error"]["code"], -32601)

    def test_endpoint_mcp_http(self):
        c = self.cliente(self.admin)
        resposta = c.post(
            "/api/v1/ia/mcp/",
            {"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
            format="json",
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(resposta.data["result"]["tools"])

    def test_endpoint_mcp_get_descreve_o_servidor(self):
        resposta = self.cliente(self.admin).get("/api/v1/ia/mcp/")
        self.assertEqual(resposta.data["nome"], "sgp")
        self.assertIn("tools/call", resposta.data["metodos"])

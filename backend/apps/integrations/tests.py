"""Testes das integrações, da fila de eventos e da entrega de webhooks."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.capabilities.models import EmployeeSkill, Skill, SkillCategory, SugestaoPromocao
from apps.core.models import Perfil, User, Webhook
from apps.portfolio.models import Project, StatusProjeto
from apps.risks.models import Risk
from apps.tasks.models import StatusTarefa, Task

from .connectors import (
    ConectorCalendario,
    ConectorLMS,
    ConectorMensageria,
    aplicar_transformacao,
    gerar_csv,
    gerar_ics,
    obter_conector,
)
from .models import (
    EventoIntegracao,
    Integracao,
    MapeamentoCampo,
    SincronizacaoLog,
    TipoEvento,
    TipoIntegracao,
    Transformacao,
    WebhookEntrega,
)
from .services import (
    assinar_payload,
    catalogo_integracoes,
    despachar_eventos,
    executar_sincronizacao,
    registrar_evento,
    resumo_integracoes,
    webhooks_para,
)


class BaseIntegracoes(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            email="admin@teste.com", password="senha12345", nome="Administrador",
            perfil=Perfil.ADMIN, is_staff=True, is_superuser=True,
        )
        cls.gerente = User.objects.create_user(
            email="gerente@teste.com", password="senha12345", nome="Gerente", perfil=Perfil.GERENTE
        )
        cls.projeto = Project.objects.create(
            nome="Projeto de Integração", manager=cls.gerente,
            data_inicio=timezone.localdate() - timedelta(days=20),
            data_fim=timezone.localdate() + timedelta(days=40),
            status=StatusProjeto.EM_EXECUCAO,
        )


# ---------------------------------------------------------------------------
# Fila de eventos
# ---------------------------------------------------------------------------
class TestFilaDeEventos(BaseIntegracoes):
    def test_criar_tarefa_publica_evento(self):
        tarefa = Task.objects.create(
            project=self.projeto, nome="Tarefa observada",
            data_inicio=timezone.localdate(), data_fim=timezone.localdate() + timedelta(days=3),
        )
        eventos = EventoIntegracao.objects.filter(tipo=TipoEvento.TAREFA_CRIADA)
        self.assertEqual(eventos.count(), 1)
        evento = eventos.first()
        self.assertEqual(evento.entidade_id, str(tarefa.id))
        self.assertEqual(evento.projeto_id, self.projeto.id)
        self.assertIn("nome", evento.payload)

    def test_concluir_tarefa_publica_evento_de_conclusao(self):
        tarefa = Task.objects.create(
            project=self.projeto, nome="Tarefa", status=StatusTarefa.A_FAZER,
            data_inicio=timezone.localdate(), data_fim=timezone.localdate() + timedelta(days=2),
        )
        EventoIntegracao.objects.all().delete()
        tarefa.status = StatusTarefa.CONCLUIDA
        tarefa.percentual_conclusao = 100
        tarefa.save()
        self.assertTrue(EventoIntegracao.objects.filter(tipo=TipoEvento.TAREFA_CONCLUIDA).exists())

    def test_risco_alto_gera_evento_critico(self):
        Risk.objects.create(
            project=self.projeto, descricao="Risco severo", probabilidade=5, impacto=5,
            categoria="TECNICO", status="IDENTIFICADO",
        )
        self.assertTrue(EventoIntegracao.objects.filter(tipo=TipoEvento.RISCO_CRITICO).exists())

    def test_risco_baixo_gera_evento_comum(self):
        Risk.objects.create(
            project=self.projeto, descricao="Risco leve", probabilidade=1, impacto=1,
            categoria="OUTRO", status="IDENTIFICADO",
        )
        self.assertTrue(EventoIntegracao.objects.filter(tipo=TipoEvento.RISCO_CRIADO).exists())
        self.assertFalse(EventoIntegracao.objects.filter(tipo=TipoEvento.RISCO_CRITICO).exists())

    def test_sugestao_de_promocao_publica_evento(self):
        categoria = SkillCategory.objects.create(nome="Engenharia")
        skill = Skill.objects.create(nome="Python", categoria=categoria)
        perfil = EmployeeSkill.objects.create(user=self.gerente, skill=skill, nivel_atual=3)
        SugestaoPromocao.objects.create(employee_skill=perfil, nivel_atual=3, nivel_proposto=4)
        self.assertTrue(EventoIntegracao.objects.filter(tipo=TipoEvento.PROMOCAO_SOLICITADA).exists())


# ---------------------------------------------------------------------------
# Entrega de webhooks
# ---------------------------------------------------------------------------
class TestEntregaWebhook(BaseIntegracoes):
    def setUp(self):
        # A criação do projeto de apoio publica um evento próprio; isolamos a fila
        # para que as contagens reflitam apenas o que cada teste publica.
        EventoIntegracao.objects.all().delete()

    def test_assinatura_hmac_e_estavel(self):
        corpo = b'{"evento":"teste"}'
        primeira = assinar_payload("segredo", corpo)
        segunda = assinar_payload("segredo", corpo)
        self.assertEqual(primeira, segunda)
        self.assertTrue(primeira.startswith("sha256="))
        self.assertNotEqual(primeira, assinar_payload("outro-segredo", corpo))

    def test_assinatura_vazia_sem_segredo(self):
        self.assertEqual(assinar_payload("", b"{}"), "")

    def test_webhook_seleciona_eventos_por_tipo(self):
        especifico = Webhook.objects.create(nome="Tarefas", url="https://exemplo.com/hook", eventos=["tarefa.concluida"])
        geral = Webhook.objects.create(nome="Tudo", url="https://exemplo.com/tudo", eventos=[])
        curinga = Webhook.objects.create(nome="Projetos", url="https://exemplo.com/p", eventos=["projeto.*"])

        evento = registrar_evento(TipoEvento.TAREFA_CONCLUIDA, titulo="Concluída")
        interessados = [w.nome for w in webhooks_para(evento)]
        self.assertIn("Tarefas", interessados)
        self.assertIn("Tudo", interessados)
        self.assertNotIn("Projetos", interessados)

        evento_projeto = registrar_evento(TipoEvento.PROJETO_CRIADO, titulo="Novo projeto")
        self.assertIn("Projetos", [w.nome for w in webhooks_para(evento_projeto)])

    def test_webhook_inativo_nao_recebe(self):
        Webhook.objects.create(nome="Inativo", url="https://exemplo.com/x", eventos=[], ativo=False)
        evento = registrar_evento(TipoEvento.TAREFA_CRIADA, titulo="x")
        self.assertEqual(webhooks_para(evento), [])

    def test_falha_de_entrega_e_registrada_sem_quebrar(self):
        Webhook.objects.create(nome="Destino inválido", url="http://127.0.0.1:9/inexistente", eventos=[])
        evento = registrar_evento(TipoEvento.TAREFA_CRIADA, titulo="Teste")
        resumo = despachar_eventos(limite=5)
        self.assertEqual(resumo["eventos"], 1)
        self.assertEqual(resumo["falhas"], 1)
        self.assertEqual(resumo["sucessos"], 0)
        entrega = WebhookEntrega.objects.filter(evento=evento).first()
        self.assertIsNotNone(entrega)
        self.assertFalse(entrega.sucesso)
        self.assertTrue(entrega.erro)

    def test_evento_sem_destino_e_marcado_como_processado(self):
        evento = registrar_evento(TipoEvento.TAREFA_CRIADA, titulo="Sem webhook")
        resumo = despachar_eventos(limite=5)
        evento.refresh_from_db()
        self.assertTrue(evento.processado)
        self.assertEqual(resumo["sem_destino"], 1)

    def test_reprocessamento_respeita_limite_de_tentativas(self):
        Webhook.objects.create(nome="Falho", url="http://127.0.0.1:9/x", eventos=[])
        evento = registrar_evento(TipoEvento.TAREFA_CRIADA, titulo="Tenta")
        for _ in range(3):
            evento.processado = False
            evento.save(update_fields=["processado"])
            despachar_eventos(limite=1)
        evento.refresh_from_db()
        self.assertTrue(evento.processado)
        self.assertIn("máximo de tentativas", evento.ultimo_erro)


# ---------------------------------------------------------------------------
# Sincronização
# ---------------------------------------------------------------------------
class TestSincronizacao(BaseIntegracoes):
    def test_simulacao_registra_log_e_nao_altera_dados(self):
        Task.objects.create(
            project=self.projeto, nome="Tarefa para exportar",
            data_inicio=timezone.localdate(), data_fim=timezone.localdate() + timedelta(days=5),
            status=StatusTarefa.A_FAZER,
        )
        integracao = Integracao.objects.create(
            nome="Jira de teste", tipo=TipoIntegracao.JIRA, direcao="SAIDA",
            url_base="https://empresa.atlassian.net", modo_simulacao=True, ativa=True,
        )
        antes = Task.objects.count()
        registro = executar_sincronizacao(integracao, "EXPORTAR", usuario=self.admin, limite=10)
        self.assertEqual(registro.status, "SIMULADO")
        self.assertEqual(Task.objects.count(), antes)
        self.assertEqual(registro.itens_lidos, 1)
        self.assertIn("requisicoes_previstas", registro.detalhes)
        self.assertEqual(len(registro.detalhes["requisicoes_previstas"]), 1)
        prevista = registro.detalhes["requisicoes_previstas"][0]
        self.assertEqual(prevista["metodo"], "POST")
        self.assertIn("Tarefa para exportar", str(prevista["corpo"]))
        integracao.refresh_from_db()
        self.assertEqual(integracao.total_execucoes, 1)
        self.assertEqual(integracao.total_sucesso, 1)
        self.assertIsNotNone(integracao.proxima_sincronizacao)

    def test_lms_em_simulacao_nao_duplica_conclusoes(self):
        from apps.capabilities.models import EmployeeTraining, Training

        skill = Skill.objects.create(nome="Terraform", categoria=SkillCategory.objects.create(nome="Cloud"))
        treinamento = Training.objects.create(nome="Terraform avançado", skill=skill, carga_horaria=24, xp_concedido=80)
        integracao = Integracao.objects.create(
            nome="LMS", tipo=TipoIntegracao.LMS, direcao="ENTRADA", modo_simulacao=True, ativa=True,
        )
        executar_sincronizacao(integracao, "IMPORTAR", usuario=self.admin, limite=10)
        # Sem inscrições de exemplo, nada é criado
        self.assertEqual(EmployeeTraining.objects.count(), 0)
        self.assertTrue(treinamento.ativo)

    def test_conector_de_mensageria_sem_url_falha_com_mensagem_clara(self):
        integracao = Integracao.objects.create(
            nome="Teams", tipo=TipoIntegracao.TEAMS, direcao="SAIDA", modo_simulacao=True,
        )
        registro = executar_sincronizacao(integracao, "EXPORTAR", usuario=self.admin, limite=5)
        self.assertEqual(registro.status, "FALHA")
        self.assertIn("webhook", registro.mensagem.lower())

    def test_calendario_gera_feed_ics(self):
        Task.objects.create(
            project=self.projeto, nome="Evento de calendário",
            data_inicio=timezone.localdate(), data_fim=timezone.localdate() + timedelta(days=2),
        )
        integracao = Integracao.objects.create(
            nome="Agenda", tipo=TipoIntegracao.GOOGLE_CALENDAR, direcao="SAIDA", modo_simulacao=True,
        )
        registro = executar_sincronizacao(integracao, "EXPORTAR", usuario=self.admin, limite=20)
        self.assertIn("ics", registro.detalhes)
        self.assertIn("BEGIN:VCALENDAR", registro.detalhes["ics"])
        self.assertIn("Evento de calendário", registro.detalhes["ics"])

    def test_mapeamento_de_campos_e_aplicado(self):
        integracao = Integracao.objects.create(
            nome="ERP", tipo=TipoIntegracao.ERP, direcao="ENTRADA", modo_simulacao=True,
        )
        MapeamentoCampo.objects.create(
            integracao=integracao, campo_origem="nome_completo", campo_destino="nome",
            transformacao=Transformacao.MAIUSCULA,
        )
        MapeamentoCampo.objects.create(
            integracao=integracao, campo_origem="status_externo", campo_destino="status",
            transformacao=Transformacao.ENUM, traducao={"A": "ATIVO", "I": "INATIVO"},
        )
        from .connectors import aplicar_mapeamento

        convertido, pendencias = aplicar_mapeamento(
            integracao, {"nome_completo": "ana silva", "status_externo": "A"}
        )
        self.assertEqual(convertido["nome"], "ANA SILVA")
        self.assertEqual(convertido["status"], "ATIVO")
        self.assertEqual(pendencias, [])

    def test_mapeamento_obrigatorio_ausente_gera_pendencia(self):
        integracao = Integracao.objects.create(nome="RH", tipo=TipoIntegracao.RH, modo_simulacao=True)
        MapeamentoCampo.objects.create(
            integracao=integracao, campo_origem="email", campo_destino="email", obrigatorio=True,
        )
        from .connectors import aplicar_mapeamento

        _, pendencias = aplicar_mapeamento(integracao, {})
        self.assertEqual(len(pendencias), 1)
        self.assertEqual(pendencias[0]["campo"], "email")


# ---------------------------------------------------------------------------
# Utilitários dos conectores
# ---------------------------------------------------------------------------
class TestUtilitariosConectores(TestCase):
    def test_transformacoes(self):
        self.assertEqual(aplicar_transformacao("  oi  ", Transformacao.TRIM), "oi")
        self.assertEqual(aplicar_transformacao("abc", Transformacao.MAIUSCULA), "ABC")
        self.assertEqual(aplicar_transformacao("1.234,50", Transformacao.MOEDA), 1234.50)
        self.assertTrue(aplicar_transformacao("sim", Transformacao.BOOLEANO))
        self.assertFalse(aplicar_transformacao("nao", Transformacao.BOOLEANO))
        self.assertEqual(aplicar_transformacao("A", Transformacao.ENUM, {"A": "X"}), "X")
        self.assertEqual(aplicar_transformacao(None, Transformacao.NENHUMA, None, "padrao"), "padrao")

    def test_ics_valido(self):
        from datetime import date

        ics = gerar_ics([{"uid": "1@sgp", "titulo": "Teste", "inicio": date(2026, 3, 10), "fim": date(2026, 3, 12)}])
        self.assertTrue(ics.startswith("BEGIN:VCALENDAR"))
        self.assertTrue(ics.rstrip().endswith("END:VCALENDAR"))
        self.assertIn("DTSTART;VALUE=DATE:20260310", ics)
        self.assertIn("DTEND;VALUE=DATE:20260313", ics)

    def test_csv_com_separador_ponto_e_virgula(self):
        csv_texto = gerar_csv([{"a": 1, "b": "x"}, {"a": 2, "b": "y"}])
        linhas = [linha.strip() for linha in csv_texto.strip().splitlines()]
        self.assertEqual(linhas[0], "a;b")
        self.assertEqual(len(linhas), 3)
        self.assertEqual(linhas[1], "1;x")

    def test_obter_conector_por_tipo(self):
        self.assertIsInstance(obter_conector(Integracao(tipo=TipoIntegracao.TEAMS)), ConectorMensageria)
        self.assertIsInstance(obter_conector(Integracao(tipo=TipoIntegracao.LMS)), ConectorLMS)
        self.assertIsInstance(obter_conector(Integracao(tipo=TipoIntegracao.OUTLOOK)), ConectorCalendario)


# ---------------------------------------------------------------------------
# Catálogo e painéis
# ---------------------------------------------------------------------------
class TestCatalogoEPaineis(BaseIntegracoes):
    def test_catalogo_cobre_as_integracoes_da_especificacao(self):
        catalogo = catalogo_integracoes()
        self.assertGreaterEqual(len(catalogo), 15)
        tipos = {item["tipo"] for item in catalogo}
        for esperado in ("ERP", "CRM", "RH", "LMS", "JIRA", "TEAMS", "SLACK", "BI", "ESCO"):
            self.assertIn(esperado, tipos)
        self.assertFalse(any(item["configurada"] for item in catalogo))

    def test_catalogo_marca_configurada(self):
        Integracao.objects.create(nome="Jira", tipo=TipoIntegracao.JIRA, modo_simulacao=True)
        item = next(i for i in catalogo_integracoes() if i["tipo"] == "JIRA")
        self.assertTrue(item["configurada"])
        self.assertIsNotNone(item["integracao_id"])

    def test_resumo_traz_estrutura_completa(self):
        resumo = resumo_integracoes()
        for chave in ("integracoes", "eventos", "webhooks", "execucoes_recentes"):
            self.assertIn(chave, resumo)
        self.assertIn("taxa_sucesso_media", resumo["integracoes"])

    def test_credenciais_sao_mascaradas(self):
        integracao = Integracao.objects.create(
            nome="ERP", tipo=TipoIntegracao.ERP,
            credenciais={"api_key": "chave-secreta-1234", "usuario": "integracao"},
        )
        mascarado = integracao.mascarar_credenciais()
        self.assertNotIn("chave-secreta", mascarado["api_key"])
        self.assertTrue(mascarado["api_key"].endswith("1234"))
        self.assertEqual(mascarado["usuario"], "integracao")


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------
class TestAPIIntegracoes(BaseIntegracoes):
    def setUp(self):
        self.cliente = APIClient()
        login = self.cliente.post(
            "/api/v1/auth/token/", {"email": "admin@teste.com", "password": "senha12345"}, format="json"
        )
        self.cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])

    def test_painel_de_integracoes(self):
        resposta = self.cliente.get("/api/v1/dashboard/integracoes/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("catalogo", resposta.data)
        self.assertIn("integracoes", resposta.data)

    def test_criar_e_listar_integracao(self):
        resposta = self.cliente.post(
            "/api/v1/integracoes/",
            {"nome": "Jira da empresa", "tipo": "JIRA", "direcao": "SAIDA",
             "url_base": "https://empresa.atlassian.net", "modo_simulacao": True},
            format="json",
        )
        self.assertEqual(resposta.status_code, 201, resposta.data)
        self.assertEqual(self.cliente.get("/api/v1/integracoes/").data["count"], 1)

    def test_credenciais_nao_sao_devolvidas_na_leitura(self):
        Integracao.objects.create(
            nome="ERP", tipo=TipoIntegracao.ERP, credenciais={"api_key": "segredo-9999"},
        )
        resposta = self.cliente.get("/api/v1/integracoes/")
        item = resposta.data["results"][0]
        self.assertNotIn("credenciais", item)
        self.assertIn("credenciais_mascaradas", item)

    def test_executar_sincronizacao_pela_api(self):
        integracao = Integracao.objects.create(
            nome="Agenda", tipo=TipoIntegracao.GOOGLE_CALENDAR, direcao="SAIDA", modo_simulacao=True,
        )
        resposta = self.cliente.post(
            "/api/v1/integracoes/" + str(integracao.id) + "/sincronizar/",
            {"operacao": "EXPORTAR", "limite": 5}, format="json",
        )
        self.assertEqual(resposta.status_code, 201, resposta.data)
        self.assertEqual(SincronizacaoLog.objects.count(), 1)

    def test_simular_evento_dispara_webhook(self):
        Webhook.objects.create(nome="Teste", url="http://127.0.0.1:9/x", eventos=[])
        resposta = self.cliente.post("/api/v1/integracoes-eventos/simular/", {}, format="json")
        self.assertEqual(resposta.status_code, 201)
        self.assertIn("entrega", resposta.data)

    def test_feed_ics(self):
        Task.objects.create(
            project=self.projeto, nome="Entrega",
            data_inicio=timezone.localdate(), data_fim=timezone.localdate() + timedelta(days=1),
        )
        resposta = self.cliente.get("/api/v1/integracoes/calendario.ics")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("text/calendar", resposta["Content-Type"])
        self.assertIn(b"BEGIN:VCALENDAR", resposta.content)

    def test_dataset_bi_em_csv(self):
        resposta = self.cliente.get("/api/v1/integracoes/dataset/?formato=CSV")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("text/csv", resposta["Content-Type"])

    def test_dataset_bi_em_json(self):
        resposta = self.cliente.get("/api/v1/integracoes/dataset/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("linhas", resposta.data)
        self.assertGreaterEqual(resposta.data["total"], 1)

    def test_rotas_explicitas_nao_colidem_com_o_router(self):
        """Regressão: 'integracoes/dataset/' era capturado como detalhe pelo router."""
        self.assertEqual(self.cliente.get("/api/v1/integracoes/dataset/").status_code, 200)
        self.assertEqual(self.cliente.get("/api/v1/integracoes/calendario.ics").status_code, 200)
        self.assertEqual(self.cliente.get("/api/v1/integracoes-catalogo/").status_code, 200)
        self.assertEqual(self.cliente.get("/api/v1/integracoes-tipos/").status_code, 200)

    def test_gerente_nao_configura_integracao(self):
        cliente = APIClient()
        login = cliente.post(
            "/api/v1/auth/token/", {"email": "gerente@teste.com", "password": "senha12345"}, format="json"
        )
        cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        resposta = cliente.post(
            "/api/v1/integracoes/", {"nome": "X", "tipo": "JIRA"}, format="json"
        )
        self.assertEqual(resposta.status_code, 403)

    def test_tipos_disponiveis(self):
        resposta = self.cliente.get("/api/v1/integracoes-tipos/")
        self.assertEqual(resposta.status_code, 200)
        self.assertGreaterEqual(len(resposta.data["tipos"]), 15)
        self.assertTrue(any(t["tem_conector"] for t in resposta.data["tipos"]))

"""Testes automatizados do SGP — domínio, serviços e API."""
from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.capabilities.matching import fator_skill, motor_matching
from apps.capabilities.models import EmployeeSkill, Skill, SkillCategory, SugestaoPromocao
from apps.capabilities.services import creditar_xp, radar_skills
from apps.core.models import Perfil, User
from apps.core.services import registrar_auditoria
from apps.finance.models import Lancamento, TipoLancamento
from apps.finance.services import calcular_evm
from apps.portfolio.models import Prioridade, Project, Saude, StatusProjeto
from apps.resources.models import Alocacao, StatusAlocacao
from apps.resources.services import detectar_conflitos
from apps.tasks.models import StatusTarefa, Task, TaskDependency, TaskSkillRequirement, TipoDependencia
from apps.tasks.services import calcular_caminho_critico


class BaseSGP(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.gerente = User.objects.create_user(
            email="gerente@teste.com", password="senha12345", nome="Gerente Teste", perfil=Perfil.GERENTE
        )
        cls.membro = User.objects.create_user(
            email="membro@teste.com", password="senha12345", nome="Membro Teste",
            perfil=Perfil.MEMBRO, custo_hora=Decimal("100.00"),
        )
        cls.projeto = Project.objects.create(
            nome="Projeto de Teste", manager=cls.gerente,
            data_inicio=timezone.localdate() - timedelta(days=30),
            data_fim=timezone.localdate() + timedelta(days=60),
            orcamento=Decimal("100000"), status=StatusProjeto.EM_EXECUCAO, area="Tecnologia",
        )


class TestAutenticacao(BaseSGP):
    def test_login_devolve_tokens_e_permissoes(self):
        resposta = APIClient().post(
            "/api/v1/auth/token/", {"email": "gerente@teste.com", "password": "senha12345"}, format="json"
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("access", resposta.data)
        self.assertIn("refresh", resposta.data)
        self.assertIn("projeto.editar", resposta.data["permissoes"])

    def test_credenciais_invalidas_sao_rejeitadas(self):
        resposta = APIClient().post(
            "/api/v1/auth/token/", {"email": "gerente@teste.com", "password": "errada"}, format="json"
        )
        self.assertEqual(resposta.status_code, 401)

    def test_membro_nao_acessa_auditoria(self):
        cliente = APIClient()
        login = cliente.post(
            "/api/v1/auth/token/", {"email": "membro@teste.com", "password": "senha12345"}, format="json"
        )
        cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        self.assertEqual(cliente.get("/api/v1/auditoria/").status_code, 403)

    def test_acesso_anonimo_bloqueado(self):
        self.assertEqual(APIClient().get("/api/v1/projetos/").status_code, 401)


class TestAuditoriaImutavel(BaseSGP):
    def test_registro_nao_pode_ser_alterado_nem_excluido(self):
        registro = registrar_auditoria(entidade="portfolio.project", acao="CRIAR", instancia=self.projeto)
        registro.acao = "EXCLUIR"
        with self.assertRaises(ValueError):
            registro.save()
        with self.assertRaises(ValueError):
            registro.delete()


class TestCaminhoCritico(BaseSGP):
    def test_cpm_identifica_criticas_e_folga(self):
        hoje = timezone.localdate()
        a = Task.objects.create(project=self.projeto, nome="A", data_inicio=hoje,
                                data_fim=hoje + timedelta(days=4), esforco_estimado=Decimal("40"))
        b = Task.objects.create(project=self.projeto, nome="B", data_inicio=hoje + timedelta(days=5),
                                data_fim=hoje + timedelta(days=9), esforco_estimado=Decimal("40"))
        c = Task.objects.create(project=self.projeto, nome="C", data_inicio=hoje,
                                data_fim=hoje + timedelta(days=2), esforco_estimado=Decimal("16"))
        TaskDependency.objects.create(predecessor=a, successor=b, tipo=TipoDependencia.FS)
        resultado = calcular_caminho_critico(self.projeto.id)
        self.assertIn(a.id, resultado["criticas"])
        self.assertIn(b.id, resultado["criticas"])
        self.assertNotIn(c.id, resultado["criticas"])
        a.refresh_from_db()
        self.assertTrue(a.critica)

    def test_dependencia_ciclica_e_rejeitada(self):
        hoje = timezone.localdate()
        a = Task.objects.create(project=self.projeto, nome="A", data_inicio=hoje, data_fim=hoje)
        b = Task.objects.create(project=self.projeto, nome="B", data_inicio=hoje, data_fim=hoje)
        TaskDependency.objects.create(predecessor=a, successor=b, tipo=TipoDependencia.FS)
        with self.assertRaises(ValidationError):
            TaskDependency(predecessor=b, successor=a, tipo=TipoDependencia.FS).full_clean()

    def test_tarefa_nao_depende_de_si_mesma(self):
        hoje = timezone.localdate()
        a = Task.objects.create(project=self.projeto, nome="A", data_inicio=hoje, data_fim=hoje)
        with self.assertRaises(ValidationError):
            TaskDependency(predecessor=a, successor=a, tipo=TipoDependencia.FS).full_clean()


class TestProgressoESaude(BaseSGP):
    def test_conclusao_de_tarefa_atualiza_projeto(self):
        hoje = timezone.localdate()
        Task.objects.create(
            project=self.projeto, nome="T1", data_inicio=hoje - timedelta(days=20),
            data_fim=hoje - timedelta(days=1), esforco_estimado=Decimal("100"),
            percentual_conclusao=100, status=StatusTarefa.CONCLUIDA,
        )
        self.projeto.calcular_progresso()
        self.projeto.refresh_from_db()
        self.assertEqual(self.projeto.percentual_conclusao, 100)

    def test_projeto_atrasado_fica_vermelho(self):
        self.projeto.data_fim = timezone.localdate() - timedelta(days=10)
        self.projeto.percentual_conclusao = 10
        self.projeto.save()
        self.projeto.recalcular_saude()
        self.projeto.refresh_from_db()
        self.assertEqual(self.projeto.saude, Saude.VERMELHO)

    def test_projeto_no_prazo_fica_verde(self):
        self.projeto.percentual_conclusao = int(self.projeto.progresso_planejado)
        self.projeto.save()
        self.projeto.recalcular_saude()
        self.projeto.refresh_from_db()
        self.assertEqual(self.projeto.saude, Saude.VERDE)


class TestFinanceiroEVM(BaseSGP):
    def test_custo_acima_do_agregado_gera_cpi_menor_que_1(self):
        hoje = timezone.localdate()
        Task.objects.create(
            project=self.projeto, nome="T1", data_inicio=hoje - timedelta(days=30),
            data_fim=hoje + timedelta(days=30), esforco_estimado=Decimal("100"),
            percentual_conclusao=50, status=StatusTarefa.EM_ANDAMENTO,
        )
        Lancamento.objects.create(
            project=self.projeto, tipo=TipoLancamento.DESPESA, descricao="Custo alto",
            valor=Decimal("90000"), data_competencia=hoje, status="REALIZADO",
        )
        evm = calcular_evm(self.projeto)
        self.assertLess(evm["CPI"], 1)
        self.assertEqual(evm["BAC"], 100000.0)
        self.assertAlmostEqual(evm["EV"], 50000.0, places=1)
        self.assertAlmostEqual(evm["AC"], 90000.0, places=1)
        self.assertEqual(evm["situacao_custo"], "VERMELHO")

    def test_sem_lancamentos_mantem_cpi_neutro(self):
        hoje = timezone.localdate()
        Task.objects.create(
            project=self.projeto, nome="T1", data_inicio=hoje, data_fim=hoje + timedelta(days=10),
            esforco_estimado=Decimal("50"), percentual_conclusao=50,
        )
        self.assertEqual(calcular_evm(self.projeto)["CPI"], 1.0)


class TestConflitosDeAlocacao(BaseSGP):
    def test_sobrealocacao_e_detectada(self):
        hoje = timezone.localdate()
        for percentual in (70, 60):
            Alocacao.objects.create(
                project=self.projeto, user=self.membro, percentual=percentual,
                data_inicio=hoje, data_fim=hoje + timedelta(days=13), status=StatusAlocacao.CONFIRMADA,
            )
        conflitos = detectar_conflitos(user_id=self.membro.id)
        self.assertTrue(conflitos)
        self.assertEqual(conflitos[0]["total_percentual"], 130)
        self.assertEqual(conflitos[0]["severidade"], "CRITICO")

    def test_alocacao_dentro_do_limite_nao_gera_conflito(self):
        hoje = timezone.localdate()
        Alocacao.objects.create(
            project=self.projeto, user=self.membro, percentual=80,
            data_inicio=hoje, data_fim=hoje + timedelta(days=13),
        )
        self.assertEqual(detectar_conflitos(user_id=self.membro.id), [])


class TestMotorDeMatching(BaseSGP):
    def test_fator_skill_penaliza_deficit_e_bonifica_excedente(self):
        # Déficit: f = nível_colab / nível_req  (§9.1)
        self.assertAlmostEqual(fator_skill(2, 4, "PERFORMANCE"), 0.5)
        self.assertAlmostEqual(fator_skill(3, 4, "PERFORMANCE"), 0.75)
        # Atende exatamente: f = 1,0
        self.assertEqual(fator_skill(4, 4, "PERFORMANCE"), 1.0)
        # Excedente de 1 nível: 1,0 + 0,10 × (1/2) = 1,05
        self.assertAlmostEqual(fator_skill(5, 4, "PERFORMANCE"), 1.05)
        # Excedente de 2 níveis ou mais satura o bônus em 1,10
        self.assertAlmostEqual(fator_skill(5, 3, "PERFORMANCE"), 1.10)
        self.assertAlmostEqual(fator_skill(5, 1, "PERFORMANCE"), 1.10)
        # Acima do teto nunca passa de 1,10
        self.assertLessEqual(fator_skill(5, 1, "PERFORMANCE"), 1.10)
        # Modo desenvolvimento tem alvo em nível_req − 1
        self.assertGreater(fator_skill(3, 4, "DESENVOLVIMENTO"), fator_skill(5, 4, "DESENVOLVIMENTO"))

    def test_matching_ranqueia_melhor_candidato_primeiro(self):
        categoria = SkillCategory.objects.create(nome="Cloud")
        skill = Skill.objects.create(nome="AWS", categoria=categoria)
        junior = User.objects.create_user(email="jr@teste.com", password="x", nome="Junior", perfil=Perfil.MEMBRO)
        senior = User.objects.create_user(email="sr@teste.com", password="x", nome="Senior", perfil=Perfil.MEMBRO)
        EmployeeSkill.objects.create(user=junior, skill=skill, nivel_atual=2)
        EmployeeSkill.objects.create(user=senior, skill=skill, nivel_atual=5)
        hoje = timezone.localdate()
        tarefa = Task.objects.create(
            project=self.projeto, nome="Cloud", data_inicio=hoje, data_fim=hoje + timedelta(days=10),
            esforco_estimado=Decimal("40"),
        )
        TaskSkillRequirement.objects.create(task=tarefa, skill=skill, nivel_minimo=4, peso=1.0, obrigatorio=True)
        resultado = motor_matching(task=tarefa, modo="PERFORMANCE", persistir=False)
        self.assertEqual(resultado["recomendacoes"][0]["nome"], "Senior")
        self.assertTrue(resultado["recomendacoes"][0]["elegivel"])
        ultimo = resultado["recomendacoes"][-1]
        self.assertTrue(any("obrigat" in p["motivo"].lower() for p in ultimo["penalidades"]))

    def test_matching_expoe_explicabilidade_completa(self):
        categoria = SkillCategory.objects.create(nome="Dados")
        skill = Skill.objects.create(nome="SQL", categoria=categoria)
        EmployeeSkill.objects.create(user=self.membro, skill=skill, nivel_atual=3)
        hoje = timezone.localdate()
        tarefa = Task.objects.create(
            project=self.projeto, nome="SQL", data_inicio=hoje, data_fim=hoje + timedelta(days=5)
        )
        TaskSkillRequirement.objects.create(task=tarefa, skill=skill, nivel_minimo=3, peso=1.0)
        resultado = motor_matching(task=tarefa, modo="PERFORMANCE", persistir=False)
        candidato = next(r for r in resultado["recomendacoes"] if r["user_id"] == self.membro.id)
        self.assertEqual(candidato["justificativa"]["skills_atendidas"][0]["skill"], "SQL")
        self.assertEqual(
            set(candidato["componentes"]),
            {"skill", "disponibilidade", "custo", "preferencia", "experiencia", "proximidade"},
        )

    def test_modo_desenvolvimento_favorece_gap_controlado(self):
        categoria = SkillCategory.objects.create(nome="Frontend")
        skill = Skill.objects.create(nome="React", categoria=categoria)
        pleno = User.objects.create_user(email="pl@teste.com", password="x", nome="Pleno", perfil=Perfil.MEMBRO)
        especialista = User.objects.create_user(email="esp@teste.com", password="x", nome="Especialista", perfil=Perfil.MEMBRO)
        EmployeeSkill.objects.create(user=pleno, skill=skill, nivel_atual=3)
        EmployeeSkill.objects.create(user=especialista, skill=skill, nivel_atual=5)
        hoje = timezone.localdate()
        tarefa = Task.objects.create(
            project=self.projeto, nome="React", data_inicio=hoje, data_fim=hoje + timedelta(days=10)
        )
        TaskSkillRequirement.objects.create(task=tarefa, skill=skill, nivel_minimo=4, peso=1.0)
        resultado = motor_matching(task=tarefa, modo="DESENVOLVIMENTO", persistir=False)
        primeiro = resultado["recomendacoes"][0]["nome"]
        self.assertEqual(primeiro, "Pleno")


class TestEvolucaoDeCapacidades(BaseSGP):
    def test_creditar_xp_soma_e_registra_historico(self):
        categoria = SkillCategory.objects.create(nome="Engenharia")
        skill = Skill.objects.create(nome="Python", categoria=categoria)
        resultado = creditar_xp(self.membro, skill, 60, origem="TAREFA", motivo="Teste")
        self.assertEqual(resultado["xp_anterior"], 0)
        self.assertEqual(resultado["xp_atual"], 60)
        self.assertEqual(resultado["perfil"].historico.count(), 1)

    def _preparar_perfil_elegivel(self, skill):
        """Atende XP, tempo de casa, evidências e avaliação do gestor."""
        from apps.capabilities.models import SkillAssessment, SkillEvidence, TipoAvaliacao

        perfil = EmployeeSkill.objects.create(
            user=self.membro, skill=skill, nivel_atual=2, xp_acumulado=0,
            data_atingiu_nivel=timezone.localdate() - timedelta(days=400),
        )
        for indice in range(2):
            SkillEvidence.objects.create(
                employee_skill=perfil, tipo="PROJETO", descricao="Entrega relevante " + str(indice + 1),
                valida=True, validador=self.gerente,
            )
        SkillAssessment.objects.create(
            employee_skill=perfil, avaliador=self.gerente, tipo=TipoAvaliacao.GESTOR,
            nivel_atribuido=3, comentario="Pronto para o próximo nível.",
        )
        return perfil

    def test_promocao_sugerida_ao_atingir_criterios(self):
        categoria = SkillCategory.objects.create(nome="Arquitetura")
        skill = Skill.objects.create(nome="Microsserviços", categoria=categoria)
        self._preparar_perfil_elegivel(skill)
        resultado = creditar_xp(self.membro, skill, 400, origem="TAREFA", motivo="Teste de promoção")
        self.assertIsNotNone(resultado["sugestao"])
        self.assertEqual(resultado["sugestao"].nivel_proposto, 3)
        self.assertEqual(SugestaoPromocao.objects.filter(status="PENDENTE").count(), 1)

    def test_sem_evidencias_nao_ha_sugestao_de_promocao(self):
        categoria = SkillCategory.objects.create(nome="Testes")
        skill = Skill.objects.create(nome="Testes de carga", categoria=categoria)
        EmployeeSkill.objects.create(
            user=self.membro, skill=skill, nivel_atual=2, xp_acumulado=0,
            data_atingiu_nivel=timezone.localdate() - timedelta(days=400),
        )
        resultado = creditar_xp(self.membro, skill, 400, origem="TAREFA", motivo="Sem evidências")
        self.assertIsNone(resultado["sugestao"])
        self.assertEqual(SugestaoPromocao.objects.count(), 0)

    def test_radar_de_skills_agrega_por_categoria(self):
        categoria = SkillCategory.objects.create(nome="Idiomas")
        for nome, nivel in (("Inglês", 4), ("Espanhol", 2)):
            sistema = Skill.objects.create(nome=nome, categoria=categoria)
            EmployeeSkill.objects.create(user=self.membro, skill=sistema, nivel_atual=nivel)
        radar = radar_skills(self.membro)
        self.assertEqual(radar["user_id"], self.membro.id)
        self.assertEqual(radar["total_skills"], 2)
        self.assertEqual(radar["por_categoria"][0]["categoria"], "Idiomas")


class TestAPIProjetos(BaseSGP):
    def setUp(self):
        self.cliente = APIClient()
        login = self.cliente.post(
            "/api/v1/auth/token/", {"email": "gerente@teste.com", "password": "senha12345"}, format="json"
        )
        self.cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])

    def test_criar_projeto_gera_codigo_automatico(self):
        resposta = self.cliente.post(
            "/api/v1/projetos/",
            {
                "nome": "Projeto via API", "orcamento": "50000.00",
                "prioridade": Prioridade.ALTA, "data_inicio": "2026-01-05", "data_fim": "2026-06-30",
            },
            format="json",
        )
        self.assertEqual(resposta.status_code, 201, resposta.data)
        self.assertTrue(resposta.data["codigo"].startswith("PRJ-"))

    def test_dashboard_do_projeto_traz_evm_e_riscos(self):
        resposta = self.cliente.get("/api/v1/projetos/" + str(self.projeto.id) + "/dashboard/")
        self.assertEqual(resposta.status_code, 200)
        for chave in ("evm", "curva_s", "burndown", "riscos", "progresso", "orcamento"):
            self.assertIn(chave, resposta.data)

    def test_cronograma_traz_tarefas_e_dependencias(self):
        resposta = self.cliente.get("/api/v1/projetos/" + str(self.projeto.id) + "/cronograma/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("tarefas", resposta.data)
        self.assertIn("dependencias", resposta.data)

    def test_datas_invertidas_sao_rejeitadas(self):
        resposta = self.cliente.post(
            "/api/v1/projetos/",
            {"nome": "Datas inválidas", "data_inicio": "2026-06-01", "data_fim": "2026-01-01"},
            format="json",
        )
        self.assertEqual(resposta.status_code, 400)
        self.assertIn("data_fim", resposta.data["detalhes"])


class TestAPITarefas(BaseSGP):
    def setUp(self):
        self.cliente = APIClient()
        login = self.cliente.post(
            "/api/v1/auth/token/", {"email": "gerente@teste.com", "password": "senha12345"}, format="json"
        )
        self.cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])
        hoje = timezone.localdate()
        self.tarefa = Task.objects.create(
            project=self.projeto, nome="Tarefa API", data_inicio=hoje, data_fim=hoje + timedelta(days=5),
            esforco_estimado=Decimal("20"), status=StatusTarefa.A_FAZER,
        )

    def test_mover_card_atualiza_status(self):
        resposta = self.cliente.post(
            "/api/v1/tarefas/" + str(self.tarefa.id) + "/mover/", {"status": "EM_ANDAMENTO"}, format="json"
        )
        self.assertEqual(resposta.status_code, 200)
        self.tarefa.refresh_from_db()
        self.assertEqual(self.tarefa.status, StatusTarefa.EM_ANDAMENTO)

    def test_status_invalido_e_rejeitado(self):
        resposta = self.cliente.post(
            "/api/v1/tarefas/" + str(self.tarefa.id) + "/mover/", {"status": "INEXISTENTE"}, format="json"
        )
        self.assertEqual(resposta.status_code, 400)

    def test_progresso_100_conclui_a_tarefa(self):
        resposta = self.cliente.post(
            "/api/v1/tarefas/" + str(self.tarefa.id) + "/progresso/",
            {"percentual_conclusao": 100}, format="json",
        )
        self.assertEqual(resposta.status_code, 200)
        self.tarefa.refresh_from_db()
        self.assertEqual(self.tarefa.status, StatusTarefa.CONCLUIDA)

    def test_kanban_agrupa_por_status(self):
        resposta = self.cliente.get("/api/v1/tarefas/kanban/?project=" + str(self.projeto.id))
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(any(c["status"] == "A_FAZER" for c in resposta.data["colunas"]))


class TestAPICapacidades(BaseSGP):
    def setUp(self):
        self.cliente = APIClient()
        login = self.cliente.post(
            "/api/v1/auth/token/", {"email": "gerente@teste.com", "password": "senha12345"}, format="json"
        )
        self.cliente.credentials(HTTP_AUTHORIZATION="Bearer " + login.data["access"])

    def test_painel_de_capacidades_traz_kpis(self):
        resposta = self.cliente.get("/api/v1/capacidades/painel/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("cobertura_skills", resposta.data)
        self.assertIn("desenvolvimento", resposta.data)

    def test_gap_analysis_responde_para_projeto(self):
        resposta = self.cliente.get("/api/v1/capacidades/gap/?project=" + str(self.projeto.id))
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("resumo", resposta.data)
        self.assertIn("indice_cobertura", resposta.data["resumo"])

    def test_matching_exige_alvo(self):
        self.assertEqual(self.cliente.get("/api/v1/capacidades/matching/").status_code, 400)

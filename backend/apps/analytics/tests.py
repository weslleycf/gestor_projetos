"""Testes do app analytics — Monte Carlo, regressão, risco explicável, benchmarking,
auditoria de viés, tendências e demanda de pessoas (Fase 4)."""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.capabilities.models import AllocationRecommendation, ModoAlocacao, StatusRecomendacao
from apps.core.models import Perfil, User
from apps.finance.models import Lancamento, StatusLancamento, TipoLancamento
from apps.portfolio.models import Project, StatusProjeto
from apps.resources.models import Alocacao, StatusAlocacao
from apps.risks.models import Risk, StatusRisco
from apps.tasks.models import StatusTarefa, Task, TaskDependency, TipoDependencia

from .models import AuditoriaVies, MetodoPrevisao, PrevisaoProjeto
from .services import (
    auditoria_vies,
    benchmarking_projetos,
    previsao_custo,
    previsao_demanda_pessoas,
    previsao_por_regressao,
    score_risco_atraso,
    simulacao_monte_carlo,
    tendencias_portfolio,
)


class BaseAnalytics(TestCase):
    """Cenário comum: um projeto atrasado com problemas e um projeto saudável."""

    @classmethod
    def setUpTestData(cls):
        cls.hoje = timezone.localdate()
        cls.gerente = User.objects.create_user(
            email="gerente@analytics.com", password="senha123456", nome="Gerente Analytics",
            perfil=Perfil.GERENTE, area="Tecnologia", localizacao="Recife/PE",
            custo_hora=Decimal("120.00"), data_admissao=cls.hoje - timedelta(days=365 * 6),
        )
        cls.lider = User.objects.create_user(
            email="lider@analytics.com", password="senha123456", nome="Líder Analytics",
            perfil=Perfil.LIDER, area="Dados", localizacao="São Paulo/SP",
            custo_hora=Decimal("80.00"), data_admissao=cls.hoje - timedelta(days=300),
        )
        cls.rh = User.objects.create_user(
            email="rh@analytics.com", password="senha123456", nome="RH Analytics", perfil=Perfil.RH,
        )

        cls.atrasado = Project.objects.create(
            nome="Projeto Atrasado", manager=cls.gerente, status=StatusProjeto.EM_EXECUCAO,
            area="Tecnologia", data_inicio=cls.hoje - timedelta(days=120),
            data_fim=cls.hoje - timedelta(days=20), orcamento=Decimal("100000"),
            percentual_conclusao=20,
        )
        cls.em_dia = Project.objects.create(
            nome="Projeto em Dia", manager=cls.gerente, status=StatusProjeto.EM_EXECUCAO,
            area="Tecnologia", data_inicio=cls.hoje - timedelta(days=30),
            data_fim=cls.hoje + timedelta(days=31), orcamento=Decimal("80000"),
            percentual_conclusao=50,
        )
        cls.sem_tarefas = Project.objects.create(
            nome="Projeto sem Tarefas", manager=cls.gerente, status=StatusProjeto.PLANEJADO,
            area="Dados", orcamento=Decimal("50000"),
        )

        cls.tarefa_concluida = Task.objects.create(
            project=cls.atrasado, nome="Análise de requisitos", responsavel=cls.gerente,
            data_inicio=cls.hoje - timedelta(days=120), data_fim=cls.hoje - timedelta(days=90),
            data_inicio_real=cls.hoje - timedelta(days=118), data_fim_real=cls.hoje - timedelta(days=80),
            esforco_estimado=Decimal("80"), status=StatusTarefa.CONCLUIDA,
            percentual_conclusao=100, critica=True,
        )
        cls.tarefa_atrasada = Task.objects.create(
            project=cls.atrasado, nome="Desenvolvimento", responsavel=cls.lider,
            data_inicio=cls.hoje - timedelta(days=89), data_fim=cls.hoje - timedelta(days=10),
            esforco_estimado=Decimal("160"), status=StatusTarefa.EM_ANDAMENTO,
            percentual_conclusao=30, critica=True,
        )
        cls.tarefa_orfa = Task.objects.create(
            project=cls.atrasado, nome="Homologação", data_inicio=cls.hoje - timedelta(days=5),
            data_fim=cls.hoje + timedelta(days=25), esforco_estimado=Decimal("40"),
            status=StatusTarefa.A_FAZER, percentual_conclusao=0, critica=True,
        )
        cls.tarefa_atrasada_2 = Task.objects.create(
            project=cls.atrasado, nome="Documentação", responsavel=cls.lider,
            data_inicio=cls.hoje - timedelta(days=40), data_fim=cls.hoje - timedelta(days=15),
            esforco_estimado=Decimal("24"), status=StatusTarefa.A_FAZER, percentual_conclusao=0,
        )
        TaskDependency.objects.create(
            predecessor=cls.tarefa_concluida, successor=cls.tarefa_atrasada, tipo=TipoDependencia.FS
        )
        TaskDependency.objects.create(
            predecessor=cls.tarefa_atrasada, successor=cls.tarefa_orfa, tipo=TipoDependencia.FS
        )

        cls.tarefa_saudavel = Task.objects.create(
            project=cls.em_dia, nome="Planejamento", responsavel=cls.gerente,
            data_inicio=cls.hoje - timedelta(days=30), data_fim=cls.hoje + timedelta(days=5),
            data_inicio_real=cls.hoje - timedelta(days=30), esforco_estimado=Decimal("60"),
            status=StatusTarefa.EM_ANDAMENTO, percentual_conclusao=50,
        )
        Task.objects.create(
            project=cls.em_dia, nome="Execução", responsavel=cls.lider,
            data_inicio=cls.hoje - timedelta(days=10), data_fim=cls.hoje + timedelta(days=31),
            esforco_estimado=Decimal("60"), status=StatusTarefa.A_FAZER, percentual_conclusao=0,
        )

        for probabilidade, impacto in ((4, 4), (5, 5), (3, 4)):
            Risk.objects.create(
                project=cls.atrasado, descricao="Risco relevante do projeto",
                probabilidade=probabilidade, impacto=impacto, status=StatusRisco.MITIGANDO,
            )

        Lancamento.objects.create(
            project=cls.atrasado, tipo=TipoLancamento.DESPESA, status=StatusLancamento.REALIZADO,
            descricao="Desenvolvimento terceirizado", valor=Decimal("60000"),
            data_competencia=cls.hoje - timedelta(days=60),
        )
        Alocacao.objects.create(
            project=cls.atrasado, task=cls.tarefa_atrasada, user=cls.lider, percentual=60,
            data_inicio=cls.hoje - timedelta(days=30), data_fim=cls.hoje + timedelta(days=30),
            status=StatusAlocacao.CONFIRMADA,
        )
        Alocacao.objects.create(
            project=cls.atrasado, task=cls.tarefa_atrasada_2, user=cls.lider, percentual=60,
            data_inicio=cls.hoje - timedelta(days=30), data_fim=cls.hoje + timedelta(days=30),
            status=StatusAlocacao.CONFIRMADA,
        )
        Alocacao.objects.create(
            project=cls.em_dia, task=cls.tarefa_saudavel, user=cls.gerente, percentual=50,
            data_inicio=cls.hoje - timedelta(days=30), data_fim=cls.hoje + timedelta(days=30),
            status=StatusAlocacao.CONFIRMADA,
        )

    def _criar_recomendacoes(self):
        """Cria recomendações e overrides para exercitar a auditoria de viés."""
        recomendacoes = []
        for indice, (usuario, posicao, status) in enumerate(
            [
                (self.gerente, 1, StatusRecomendacao.ACEITA),
                (self.lider, 2, StatusRecomendacao.ACEITA),
                (self.lider, 3, StatusRecomendacao.SUBSTITUIDA),
                (self.gerente, 1, StatusRecomendacao.RECUSADA),
            ]
        ):
            recomendacoes.append(
                AllocationRecommendation.objects.create(
                    task=self.tarefa_atrasada, user=usuario, score=0.9 - indice * 0.1,
                    posicao=posicao, modo=ModoAlocacao.PERFORMANCE, status=status,
                )
            )
        Alocacao.objects.create(
            project=self.atrasado, task=self.tarefa_orfa, user=self.lider, percentual=40,
            data_inicio=self.hoje, data_fim=self.hoje + timedelta(days=20),
            status=StatusAlocacao.PROPOSTA, override_manual=True,
        )
        return recomendacoes


class TestMonteCarlo(BaseAnalytics):
    def test_semente_fixa_e_reprodutivel(self):
        primeira = simulacao_monte_carlo(self.atrasado, iteracoes=200, semente=42)
        segunda = simulacao_monte_carlo(self.atrasado, iteracoes=200, semente=42)
        self.assertEqual(primeira["prazo"]["dias_p50"], segunda["prazo"]["dias_p50"])
        self.assertEqual(primeira["prazo"]["dias_p90"], segunda["prazo"]["dias_p90"])
        self.assertEqual(primeira["custo"]["p50"], segunda["custo"]["p50"])

    def test_percentis_ordenados(self):
        resultado = simulacao_monte_carlo(self.atrasado, iteracoes=300, semente=7)
        prazo = resultado["prazo"]
        self.assertLessEqual(prazo["dias_p10"], prazo["dias_p50"])
        self.assertLessEqual(prazo["dias_p50"], prazo["dias_p80"])
        self.assertLessEqual(prazo["dias_p80"], prazo["dias_p90"])
        custo = resultado["custo"]
        self.assertLessEqual(custo["p10"], custo["p50"])
        self.assertLessEqual(custo["p50"], custo["p80"])
        self.assertLessEqual(custo["p80"], custo["p90"])

    def test_probabilidades_entre_zero_e_um(self):
        resultado = simulacao_monte_carlo(self.atrasado, iteracoes=200, semente=11)
        self.assertGreaterEqual(resultado["probabilidade_atraso"], 0.0)
        self.assertLessEqual(resultado["probabilidade_atraso"], 1.0)
        self.assertGreaterEqual(resultado["probabilidade_estouro"], 0.0)
        self.assertLessEqual(resultado["probabilidade_estouro"], 1.0)
        self.assertGreaterEqual(resultado["indice_confianca"], 0.0)
        self.assertLessEqual(resultado["indice_confianca"], 1.0)

    def test_histograma_de_vinte_faixas(self):
        resultado = simulacao_monte_carlo(self.atrasado, iteracoes=200, semente=3)
        self.assertEqual(len(resultado["histograma"]), 20)
        self.assertEqual(sum(faixa["quantidade"] for faixa in resultado["histograma"]), 200)

    def test_projeto_sem_tarefas_abertas_e_indisponivel(self):
        resultado = simulacao_monte_carlo(self.sem_tarefas)
        self.assertFalse(resultado["disponivel"])
        self.assertIn("motivo", resultado)


class TestRegressao(BaseAnalytics):
    def test_dados_insuficientes_devolve_indisponivel(self):
        resultado = previsao_por_regressao(self.sem_tarefas)
        self.assertFalse(resultado["disponivel"])
        self.assertTrue(resultado["motivo"])

    def test_serie_de_progresso_com_tres_pontos_ou_mais(self):
        resultado = previsao_por_regressao(self.atrasado)
        self.assertTrue(resultado["disponivel"])
        self.assertGreaterEqual(len(resultado["pontos"]), 3)
        self.assertIn(resultado["qualidade_ajuste"], {"ALTA", "MEDIA", "BAIXA"})


class TestPrevisaoCusto(BaseAnalytics):
    def test_tres_metodos_com_media_e_intervalo(self):
        resultado = previsao_custo(self.atrasado)
        self.assertEqual(len(resultado["metodos"]), 3)
        self.assertLessEqual(resultado["minimo"], resultado["media"])
        self.assertLessEqual(resultado["media"], resultado["maximo"])
        self.assertIn(resultado["metodo_provavel"], {m["chave"] for m in resultado["metodos"]})
        self.assertTrue(resultado["justificativa"])


class TestScoreRisco(BaseAnalytics):
    def test_score_entre_0_e_100_com_pesos_somando_1(self):
        resultado = score_risco_atraso(self.atrasado)
        self.assertGreaterEqual(resultado["score"], 0)
        self.assertLessEqual(resultado["score"], 100)
        self.assertAlmostEqual(sum(fator["peso"] for fator in resultado["fatores"]), 1.0, places=6)
        self.assertEqual(len(resultado["fatores"]), 7)
        for fator in resultado["fatores"]:
            self.assertGreaterEqual(fator["valor"], 0.0)
            self.assertLessEqual(fator["valor"], 1.0)
            self.assertTrue(fator["descricao"])
            self.assertGreaterEqual(fator["contribuicao"], 0.0)
        self.assertIn(resultado["classificacao"], {"BAIXO", "MEDIO", "ALTO", "CRITICO"})

    def test_projeto_atrasado_tem_score_maior(self):
        atrasado = score_risco_atraso(self.atrasado)["score"]
        em_dia = score_risco_atraso(self.em_dia)["score"]
        self.assertGreater(atrasado, em_dia)
        self.assertGreaterEqual(atrasado, 50.0)
        self.assertLess(em_dia, 50.0)


class TestBenchmarking(BaseAnalytics):
    def test_percentis_ordenados_e_melhor_com_100(self):
        resultado = benchmarking_projetos([self.atrasado, self.em_dia, self.sem_tarefas])
        self.assertEqual(resultado["total_projetos"], 3)
        self.assertIn("cpi", resultado["metricas"])
        for metrica in resultado["metricas"].values():
            self.assertLessEqual(metrica["minimo"], metrica["p25"])
            self.assertLessEqual(metrica["p25"], metrica["mediana"])
            self.assertLessEqual(metrica["mediana"], metrica["p75"])
            self.assertLessEqual(metrica["p75"], metrica["maximo"])
        melhor = resultado["melhores"]["cpi"][0]
        self.assertEqual(melhor["percentil"], 100.0)
        self.assertIn("praticas", resultado)
        self.assertIn("destaques", resultado)
        for projeto in resultado["projetos"]:
            self.assertIn("cpi", projeto["percentis"])


class TestAuditoriaVies(BaseAnalytics):
    def test_poucos_dados_nao_quebra_e_traz_aviso(self):
        resultado = auditoria_vies(periodo_dias=180, salvar=False)
        self.assertEqual(resultado["metricas"], [])
        self.assertFalse(resultado["salvo"])
        self.assertIn("não constitui prova de discriminação", resultado["aviso_metodologico"])
        self.assertFalse(resultado["resumo"]["amostra_suficiente"])
        self.assertEqual(AuditoriaVies.objects.count(), 0)

    def test_auditoria_com_dados_persiste_grupos(self):
        self._criar_recomendacoes()
        resultado = auditoria_vies(periodo_dias=180, salvar=True)
        self.assertGreater(resultado["registros_salvos"], 0)
        self.assertEqual(AuditoriaVies.objects.count(), resultado["registros_salvos"])
        self.assertGreater(resultado["resumo"]["grupos_avaliados"], 0)
        for metrica in resultado["metricas"]:
            self.assertIn(metrica["severidade"], {"OK", "ATENCAO", "CRITICO"})
            self.assertTrue(metrica["recomendacao"])
            self.assertIn("dimensao", metrica["detalhes"])


class TestTendencias(BaseAnalytics):
    def test_series_com_o_tamanho_pedido(self):
        resultado = tendencias_portfolio([self.atrasado, self.em_dia], meses=8)
        self.assertEqual(len(resultado["meses"]), 8)
        self.assertEqual(len(resultado["rotulos"]), 8)
        self.assertEqual(len(resultado["series"]), 5)
        for serie in resultado["series"]:
            self.assertEqual(len(serie["dados"]), 8)
            self.assertIn(serie["tendencia"], {"MELHORANDO", "ESTAVEL", "PIORANDO"})
            self.assertIn("variacao", serie)


class TestDemandaPessoas(BaseAnalytics):
    def test_serie_de_demanda_e_oferta(self):
        resultado = previsao_demanda_pessoas([self.atrasado, self.em_dia], meses=6)
        self.assertEqual(len(resultado["serie"]), 6)
        self.assertEqual(len(resultado["meses"]), 6)
        for mes in resultado["serie"]:
            self.assertIn("demanda_fte", mes)
            self.assertIn("oferta_fte", mes)
            self.assertIn("gap", mes)
            self.assertEqual(mes["gap"], round(mes["demanda_fte"] - mes["oferta_fte"], 2))
        self.assertGreater(resultado["resumo"]["capacidade_instalada_fte"], 0)
        self.assertIn("pico", resultado["resumo"])


class TestAPIAnalytics(BaseAnalytics):
    def setUp(self):
        self.cliente = APIClient()
        self.cliente.force_authenticate(user=self.gerente)

    def test_previsao_consolidada_do_projeto(self):
        resposta = self.cliente.get(f"/api/v1/analytics/previsao/{self.atrasado.id}/")
        self.assertEqual(resposta.status_code, 200)
        for chave in ("projeto", "monte_carlo", "regressao", "custo", "risco_atraso", "premissas"):
            self.assertIn(chave, resposta.data)

    def test_post_persiste_previsao(self):
        resposta = self.cliente.post(f"/api/v1/analytics/previsao/{self.atrasado.id}/", {}, format="json")
        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data["metodo"], MetodoPrevisao.MONTE_CARLO)
        self.assertEqual(PrevisaoProjeto.objects.count(), 1)
        self.assertIn("analises", resposta.data)

    def test_previsao_de_projeto_inexistente(self):
        self.assertEqual(self.cliente.get("/api/v1/analytics/previsao/999999/").status_code, 404)

    def test_risco_de_atraso_do_portfolio(self):
        resposta = self.cliente.get("/api/v1/analytics/risco-atraso/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("criticos", resposta.data["resumo"])
        self.assertGreaterEqual(len(resposta.data["projetos"]), 1)
        self.assertIn("fatores", resposta.data["projetos"][0])

    def test_benchmarking_e_tendencias(self):
        self.assertEqual(self.cliente.get("/api/v1/analytics/benchmarking/").status_code, 200)
        self.assertEqual(self.cliente.get("/api/v1/analytics/tendencias/?meses=6").status_code, 200)
        self.assertEqual(self.cliente.get("/api/v1/analytics/demanda-pessoas/?meses=6").status_code, 200)
        self.assertEqual(self.cliente.get("/api/v1/analytics/painel/").status_code, 200)

    def test_monte_carlo_sob_demanda(self):
        resposta = self.cliente.post(
            "/api/v1/analytics/monte-carlo/",
            {"project": self.atrasado.id, "iteracoes": 100, "semente": 5},
            format="json",
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data["histograma"]), 20)
        self.assertEqual(resposta.data["iteracoes"], 100)

    def test_monte_carlo_com_projeto_inexistente(self):
        resposta = self.cliente.post("/api/v1/analytics/monte-carlo/", {"project": 999999}, format="json")
        self.assertEqual(resposta.status_code, 404)

    def test_filtro_por_area(self):
        resposta = self.cliente.get("/api/v1/analytics/risco-atraso/?area=Dados")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data["projetos"]), 1)
        self.assertEqual(resposta.data["projetos"][0]["area"], "Dados")

    def test_parametro_invalido_usa_o_padrao(self):
        resposta = self.cliente.get("/api/v1/analytics/tendencias/?meses=abc")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data["meses"]), 12)

    def test_dias_da_auditoria_sao_limitados(self):
        cliente = APIClient()
        cliente.force_authenticate(user=self.rh)
        resposta = cliente.get("/api/v1/analytics/vies/?dias=99999")
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data["periodo"]["dias"], 1825)

    def test_gerente_nao_acessa_auditoria_de_vies(self):
        self.assertEqual(self.cliente.get("/api/v1/analytics/vies/").status_code, 403)

    def test_rh_acessa_auditoria_de_vies(self):
        cliente = APIClient()
        cliente.force_authenticate(user=self.rh)
        resposta = cliente.get("/api/v1/analytics/vies/")
        self.assertEqual(resposta.status_code, 200)
        self.assertIn("aviso_metodologico", resposta.data)
        self.assertIn("metricas", resposta.data)


class TestModelosAnalytics(BaseAnalytics):
    def test_previsao_persistida_expoe_leitura_executiva(self):
        previsao = PrevisaoProjeto.objects.create(
            project=self.atrasado, metodo=MetodoPrevisao.MONTE_CARLO,
            prazo_p10=self.hoje + timedelta(days=10), prazo_p50=self.hoje + timedelta(days=30),
            prazo_p80=self.hoje + timedelta(days=45), prazo_p90=self.hoje + timedelta(days=60),
            probabilidade_atraso=0.8, indice_confianca=0.6,
        )
        self.assertEqual(previsao.faixa_prazo_dias, 50)
        self.assertEqual(previsao.nivel_risco, "CRITICO")
        self.assertEqual(str(previsao), f"Projeto Atrasado · Simulação de Monte Carlo · {self.hoje:%d/%m/%Y}")

    def test_auditoria_de_vies_calcula_disparidade_percentual(self):
        auditoria = AuditoriaVies.objects.create(
            periodo_inicio=self.hoje - timedelta(days=180), periodo_fim=self.hoje,
            metrica="TAXA_SELECAO", grupo="0-2 anos", tamanho_grupo=12,
            valor_grupo=0.4, valor_referencia=0.8, disparidade=-0.5, severidade="CRITICO",
        )
        self.assertEqual(auditoria.disparidade_percentual, -50.0)
        self.assertIn("Taxa de seleção", str(auditoria))


class TestEscopoVazio(TestCase):
    """Serviços analíticos não podem quebrar quando não há projetos no escopo."""

    def test_servicos_com_escopo_vazio(self):
        vazio = Project.objects.none()
        benchmark = benchmarking_projetos(vazio)
        self.assertEqual(benchmark["total_projetos"], 0)
        self.assertEqual(benchmark["praticas"], [])
        tendencias = tendencias_portfolio(vazio, meses=4)
        self.assertEqual(len(tendencias["series"]), 5)
        for serie in tendencias["series"]:
            self.assertEqual(len(serie["dados"]), 4)
            self.assertEqual(serie["tendencia"], "ESTAVEL")
        demanda = previsao_demanda_pessoas(vazio, meses=4)
        self.assertEqual(len(demanda["serie"]), 4)
        self.assertEqual(demanda["resumo"]["capacidade_instalada_fte"], 0.0)
        vies = auditoria_vies(periodo_dias=90, salvar=False)
        self.assertEqual(vies["metricas"], [])
        self.assertTrue(vies["aviso_metodologico"])


class TestLimites(BaseAnalytics):
    """Limites de performance: no máximo 1000 iterações e 400 tarefas por simulação."""

    def test_iteracoes_limitadas_a_mil(self):
        resultado = simulacao_monte_carlo(self.em_dia, iteracoes=5000, semente=1)
        self.assertEqual(resultado["iteracoes"], 1000)

    def test_amostragem_das_maiores_tarefas(self):
        projeto = Project.objects.create(
            nome="Projeto Grande", manager=self.gerente, status=StatusProjeto.EM_EXECUCAO,
            data_inicio=self.hoje - timedelta(days=10), data_fim=self.hoje + timedelta(days=60),
            orcamento=Decimal("200000"),
        )
        Task.objects.bulk_create(
            [
                Task(
                    project=projeto, nome=f"Tarefa {indice}", data_inicio=self.hoje,
                    data_fim=self.hoje + timedelta(days=5), esforco_estimado=Decimal(str(8 + indice % 40)),
                    status=StatusTarefa.A_FAZER, percentual_conclusao=0,
                )
                for indice in range(410)
            ]
        )
        resultado = simulacao_monte_carlo(projeto, iteracoes=50, semente=2)
        self.assertTrue(resultado["amostragem_aplicada"])
        self.assertEqual(resultado["tarefas_consideradas"], 400)
        self.assertEqual(resultado["tarefas_totais"], 410)

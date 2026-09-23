"""Views de analytics e IA preditiva: previsões, risco, benchmarking, viés e tendências."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP
from apps.core.services import registrar_auditoria
from apps.portfolio.models import Project, StatusProjeto

from .models import AuditoriaVies, MetodoPrevisao, PrevisaoProjeto
from .serializers import AuditoriaViesSerializer, PrevisaoProjetoSerializer
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

LIMITE_PROJETOS_RISCO = 100
LIMITE_PROJETOS_PAINEL = 25


def _projetos_filtrados(request):
    """Projetos ativos do escopo informado na query string (programa, área e portfólio)."""
    projetos = (
        Project.objects.filter(arquivado=False)
        .exclude(status__in=[StatusProjeto.CANCELADO, StatusProjeto.ARQUIVADO])
        .select_related("program", "portfolio")
    )
    programa = request.query_params.get("programa")
    area = request.query_params.get("area")
    portfolio = request.query_params.get("portfolio")
    if programa:
        projetos = projetos.filter(program_id=programa)
    if area:
        projetos = projetos.filter(area=area)
    if portfolio:
        projetos = projetos.filter(portfolio_id=portfolio)
    return projetos


def _projeto_ou_none(project_id):
    """Busca o projeto pelo identificador, devolvendo None quando não existe."""
    if not project_id:
        return None
    return Project.objects.filter(pk=project_id).first()


def _resumo_projeto(projeto) -> dict:
    """Identificação visual do projeto usada nas respostas analíticas."""
    return {
        "id": projeto.id,
        "codigo": projeto.codigo,
        "nome": projeto.nome,
        "cor": projeto.cor,
        "area": projeto.area,
    }


def _inteiro(valor, padrao, minimo, maximo):
    """Converte o parâmetro para inteiro dentro dos limites aceitos."""
    if valor in (None, ""):
        return padrao
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        return padrao
    return max(minimo, min(numero, maximo))


def _data_ou_none(valor):
    """Converte uma data em formato ISO para date, tolerando valor vazio."""
    return date.fromisoformat(valor) if valor else None


def _decimal(valor) -> Decimal:
    """Converte o valor monetário calculado em float para Decimal."""
    return Decimal(str(valor or 0))


def _dados_previsao(projeto) -> dict:
    """Executa as quatro análises do projeto e consolida as premissas sem repetição."""
    monte_carlo = simulacao_monte_carlo(projeto)
    regressao = previsao_por_regressao(projeto)
    custo = previsao_custo(projeto)
    risco = score_risco_atraso(projeto)
    premissas = list(
        dict.fromkeys(
            monte_carlo["premissas"] + regressao["premissas"] + custo["premissas"] + risco["premissas"]
        )
    )
    return {
        "monte_carlo": monte_carlo,
        "regressao": regressao,
        "custo": custo,
        "risco_atraso": risco,
        "premissas": premissas,
    }


def _persistir_previsao(projeto, dados: dict, usuario) -> PrevisaoProjeto:
    """Grava o resultado consolidado da previsão para auditoria e comparação histórica."""
    monte_carlo = dados["monte_carlo"]
    prazo = monte_carlo["prazo"]
    custo = monte_carlo["custo"]
    return PrevisaoProjeto.objects.create(
        project=projeto,
        data_referencia=timezone.localdate(),
        metodo=MetodoPrevisao.MONTE_CARLO,
        prazo_p10=_data_ou_none(prazo["p10"]),
        prazo_p50=_data_ou_none(prazo["p50"]),
        prazo_p80=_data_ou_none(prazo["p80"]),
        prazo_p90=_data_ou_none(prazo["p90"]),
        dias_desvio_p50=int(prazo["desvio_p50_dias"] or 0),
        probabilidade_atraso=float(monte_carlo["probabilidade_atraso"]),
        custo_p50=_decimal(custo["p50"]),
        custo_p80=_decimal(custo["p80"]),
        custo_p90=_decimal(custo["p90"]),
        probabilidade_estouro=float(monte_carlo["probabilidade_estouro"]),
        indice_confianca=float(monte_carlo["indice_confianca"]),
        fatores=dados["risco_atraso"]["fatores"],
        premissas=dados["premissas"],
        criado_por=usuario if (usuario is not None and usuario.is_authenticated) else None,
    )


class PrevisaoProjetoViewSet(viewsets.ModelViewSet):
    """Leitura e criação de previsões persistidas de prazo e custo."""

    queryset = PrevisaoProjeto.objects.select_related("project", "criado_por").all()
    serializer_class = PrevisaoProjetoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"
    permissao_escrita = "projeto.editar"
    filterset_fields = ["project", "metodo"]
    ordering_fields = ["data_referencia", "probabilidade_atraso", "criado_em"]
    ordering = ["-data_referencia", "-criado_em"]
    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        previsao = serializer.save(criado_por=self.request.user)
        registrar_auditoria(entidade="analytics.previsaoprojeto", acao="CRIAR", instancia=previsao)


class AuditoriaViesViewSet(viewsets.ModelViewSet):
    """Leitura e criação de auditorias de viés persistidas (RNF-18)."""

    queryset = AuditoriaVies.objects.all()
    serializer_class = AuditoriaViesSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "auditoria.ver"
    permissao_escrita = "auditoria.ver"
    filterset_fields = ["metrica", "severidade", "grupo"]
    ordering = ["-criado_em"]
    http_method_names = ["get", "post", "head", "options"]


class PrevisaoProjetoView(APIView):
    """Previsão consolidada de um projeto: Monte Carlo, regressão, custo e risco explicável."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"
    permissao_escrita = "projeto.editar"

    def get(self, request, project_id):
        projeto = _projeto_ou_none(project_id)
        if projeto is None:
            return Response({"erro": True, "mensagem": "Projeto não encontrado."}, status=404)
        dados = _dados_previsao(projeto)
        dados["projeto"] = _resumo_projeto(projeto)
        return Response(dados)

    def post(self, request, project_id):
        projeto = _projeto_ou_none(project_id)
        if projeto is None:
            return Response({"erro": True, "mensagem": "Projeto não encontrado."}, status=404)
        dados = _dados_previsao(projeto)
        previsao = _persistir_previsao(projeto, dados, request.user)
        registrar_auditoria(
            entidade="analytics.previsaoprojeto", acao="CRIAR", instancia=previsao, user=request.user
        )
        registro = dict(PrevisaoProjetoSerializer(previsao, context={"request": request}).data)
        registro["analises"] = {
            "monte_carlo": dados["monte_carlo"],
            "regressao": dados["regressao"],
            "custo": dados["custo"],
            "risco_atraso": dados["risco_atraso"],
        }
        return Response(registro, status=201)


class RiscoAtrasoListView(APIView):
    """Score de risco de atraso de todos os projetos do escopo, com os fatores explicáveis."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        itens = []
        for projeto in _projetos_filtrados(request)[:LIMITE_PROJETOS_RISCO]:
            risco = score_risco_atraso(projeto)
            itens.append(
                {
                    **_resumo_projeto(projeto),
                    "score": risco["score"],
                    "classificacao": risco["classificacao"],
                    "classificacao_rotulo": risco["classificacao_rotulo"],
                    "cor_risco": risco["cor"],
                    "indice_confianca": risco["indice_confianca"],
                    "resumo": risco["resumo"],
                    "fatores": risco["fatores"],
                }
            )
        itens.sort(key=lambda item: -item["score"])
        return Response(
            {
                "projetos": itens,
                "resumo": {
                    "criticos": sum(1 for i in itens if i["classificacao"] == "CRITICO"),
                    "altos": sum(1 for i in itens if i["classificacao"] == "ALTO"),
                    "medios": sum(1 for i in itens if i["classificacao"] == "MEDIO"),
                    "baixos": sum(1 for i in itens if i["classificacao"] == "BAIXO"),
                },
                "total": len(itens),
                "gerado_em": timezone.now().isoformat(),
            }
        )


class BenchmarkingView(APIView):
    """Comparação entre os projetos do escopo, com percentis, destaques e práticas."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        return Response(benchmarking_projetos(_projetos_filtrados(request)))


class MonteCarloView(APIView):
    """Simulação de Monte Carlo sob demanda, com histograma de 20 faixas para o gráfico."""

    permission_classes = [PermissaoSGP]
    permissao_escrita = "projeto.editar"

    def post(self, request):
        projeto = _projeto_ou_none(request.data.get("project"))
        if projeto is None:
            return Response({"erro": True, "mensagem": "Projeto não encontrado."}, status=404)
        iteracoes = _inteiro(request.data.get("iteracoes"), 1000, 1, 1000)
        semente = request.data.get("semente")
        semente = _inteiro(semente, None, 0, 2147483647) if semente not in (None, "") else None
        resultado = simulacao_monte_carlo(projeto, iteracoes=iteracoes, semente=semente)
        resultado["projeto"] = _resumo_projeto(projeto)
        return Response(resultado)


class ViesView(APIView):
    """Auditoria de imparcialidade das recomendações, sem persistir o resultado."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "auditoria.ver"

    def get(self, request):
        dias = _inteiro(request.query_params.get("dias"), 180, 1, 1825)
        return Response(auditoria_vies(periodo_dias=dias, salvar=False))


class ViesExecutarView(APIView):
    """Executa a auditoria de viés e persiste o resultado para comparação histórica."""

    permission_classes = [PermissaoSGP]
    permissao_escrita = "auditoria.ver"

    def post(self, request):
        dias = _inteiro(request.data.get("dias"), 180, 1, 1825)
        resultado = auditoria_vies(periodo_dias=dias, salvar=True)
        registrar_auditoria(
            entidade="analytics.auditoriavies",
            acao="CRIAR",
            user=request.user,
            novos={"periodo_dias": dias, "registros_salvos": resultado["registros_salvos"]},
            justificativa="Execução da auditoria de imparcialidade das recomendações de alocação (RNF-18).",
        )
        return Response(resultado, status=201 if resultado["registros_salvos"] else 200)


class TendenciasView(APIView):
    """Séries mensais do portfólio com a tendência de cada indicador."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        meses = _inteiro(request.query_params.get("meses"), 12, 3, 36)
        return Response(tendencias_portfolio(_projetos_filtrados(request), meses=meses))


class DemandaPessoasView(APIView):
    """Demanda projetada de pessoas (FTE) por mês e comparação com a capacidade disponível."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        meses = _inteiro(request.query_params.get("meses"), 12, 3, 24)
        return Response(previsao_demanda_pessoas(_projetos_filtrados(request), meses=meses))


class PainelAnalyticsView(APIView):
    """Consolidação da tela de Analytics: risco, previsões recentes, tendências, viés e demanda."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "dashboard.ver"

    def get(self, request):
        projetos = list(_projetos_filtrados(request)[:LIMITE_PROJETOS_PAINEL])
        riscos = [score_risco_atraso(projeto) for projeto in projetos]
        distribuicao = {"BAIXO": 0, "MEDIO": 0, "ALTO": 0, "CRITICO": 0}
        for risco in riscos:
            distribuicao[risco["classificacao"]] += 1
        atencao = sorted(
            [
                {
                    **_resumo_projeto(projeto),
                    "score": risco["score"],
                    "classificacao": risco["classificacao"],
                    "resumo": risco["resumo"],
                }
                for projeto, risco in zip(projetos, riscos)
                if risco["classificacao"] in {"ALTO", "CRITICO"}
            ],
            key=lambda item: -item["score"],
        )[:5]
        previsoes = PrevisaoProjeto.objects.select_related("project").order_by("-criado_em")[:5]
        vies = auditoria_vies(periodo_dias=180, salvar=False)
        return Response(
            {
                "risco_portfolio": {
                    "score_medio": round(sum(r["score"] for r in riscos) / len(riscos), 1) if riscos else 0.0,
                    "distribuicao": distribuicao,
                    "projetos_avaliados": len(projetos),
                    "projetos_em_atencao": atencao,
                },
                "previsoes_recentes": PrevisaoProjetoSerializer(previsoes, many=True).data,
                "tendencias": tendencias_portfolio(projetos, meses=6),
                "vies": {
                    "periodo": vies["periodo"],
                    "resumo": vies["resumo"],
                    "aviso_metodologico": vies["aviso_metodologico"],
                },
                "demanda": previsao_demanda_pessoas(projetos, meses=6),
                "gerado_em": timezone.now().isoformat(),
            }
        )

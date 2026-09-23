"""Views financeiras: orçamento, lançamentos, EVM e fluxo de caixa."""
from __future__ import annotations

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import PermissaoSGP
from apps.core.services import registrar_auditoria
from apps.portfolio.models import Project

from .models import Lancamento, Orcamento, PrevisaoFluxoCaixa, StatusLancamento, TipoLancamento
from .serializers import LancamentoSerializer, OrcamentoSerializer, PrevisaoFluxoCaixaSerializer
from .services import (
    bac_do_projeto,
    calcular_evm,
    consumo_por_categoria,
    custo_real_do_projeto,
    curva_s,
    fluxo_caixa,
    resumo_financeiro_portfolio,
)


class OrcamentoViewSet(viewsets.ModelViewSet):
    queryset = Orcamento.objects.select_related("project").all()
    serializer_class = OrcamentoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "financeiro.ver"
    permissao_escrita = "financeiro.editar"
    filterset_fields = ["project", "tipo", "categoria"]
    ordering = ["project", "categoria"]

    def perform_create(self, serializer):
        orcamento = serializer.save()
        registrar_auditoria(entidade="finance.orcamento", acao="CRIAR", instancia=orcamento)

    @action(detail=False, methods=["post"], url_path="distribuir")
    def distribuir(self, request):
        """Distribui o orçamento total do projeto em linhas por categoria."""
        project_id = request.data.get("project")
        projeto = Project.objects.filter(pk=project_id).first()
        if not projeto:
            return Response({"erro": True, "mensagem": "Projeto não encontrado."}, status=404)
        itens = request.data.get("itens", [])
        criados = []
        for item in itens:
            orcamento, _ = Orcamento.objects.update_or_create(
                project=projeto, categoria=item.get("categoria", "Geral"),
                tipo=item.get("tipo", "OPEX"),
                defaults={"valor_planejado": item.get("valor_planejado", 0), "cor": item.get("cor", "#3B82F6")},
            )
            criados.append(orcamento)
        return Response(OrcamentoSerializer(criados, many=True).data, status=201)


class LancamentoViewSet(viewsets.ModelViewSet):
    queryset = Lancamento.objects.select_related("project", "orcamento", "criado_por").all()
    serializer_class = LancamentoSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "financeiro.ver"
    permissao_escrita = "financeiro.editar"
    search_fields = ["descricao", "fornecedor", "documento", "categoria"]
    filterset_fields = ["project", "tipo", "status", "categoria", "orcamento"]
    ordering_fields = ["data_competencia", "valor", "criado_em"]
    ordering = ["-data_competencia"]

    def perform_create(self, serializer):
        lancamento = serializer.save(criado_por=self.request.user)
        self._sincronizar_orcamento(lancamento)
        registrar_auditoria(entidade="finance.lancamento", acao="CRIAR", instancia=lancamento)

    def perform_update(self, serializer):
        lancamento = serializer.save()
        self._sincronizar_orcamento(lancamento)
        registrar_auditoria(entidade="finance.lancamento", acao="ATUALIZAR", instancia=lancamento)

    def _sincronizar_orcamento(self, lancamento):
        """Mantém o realizado do orçamento e o custo real do projeto coerentes."""
        if lancamento.orcamento_id:
            agregado = Lancamento.objects.filter(
                orcamento_id=lancamento.orcamento_id, tipo=TipoLancamento.DESPESA
            ).exclude(status=StatusLancamento.CANCELADO).aggregate(t=Sum("valor"))["t"] or 0
            Orcamento.objects.filter(pk=lancamento.orcamento_id).update(valor_realizado=agregado)
        projeto = lancamento.project
        total = custo_real_do_projeto(projeto)
        Project.objects.filter(pk=projeto.pk).update(custo_real=total)
        projeto.recalcular_saude()

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        qs = self.filter_queryset(self.get_queryset())
        despesas = qs.filter(tipo=TipoLancamento.DESPESA)
        receitas = qs.filter(tipo=TipoLancamento.RECEITA)
        return Response(
            {
                "despesas_total": float(despesas.aggregate(t=Sum("valor"))["t"] or 0),
                "receitas_total": float(receitas.aggregate(t=Sum("valor"))["t"] or 0),
                "realizado": float(despesas.filter(status=StatusLancamento.REALIZADO).aggregate(t=Sum("valor"))["t"] or 0),
                "comprometido": float(despesas.filter(status=StatusLancamento.COMPROMETIDO).aggregate(t=Sum("valor"))["t"] or 0),
                "previsto": float(despesas.filter(status=StatusLancamento.PREVISTO).aggregate(t=Sum("valor"))["t"] or 0),
                "por_categoria": list(despesas.values("categoria").annotate(total=Sum("valor")).order_by("-total")[:15]),
                "por_mes": list(
                    despesas.values("data_competencia__year", "data_competencia__month")
                    .annotate(total=Sum("valor")).order_by("data_competencia__year", "data_competencia__month")
                ),
            }
        )

    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        lancamento = self.get_object()
        lancamento.status = StatusLancamento.REALIZADO
        lancamento.aprovado_por = request.user
        lancamento.data_pagamento = lancamento.data_pagamento or timezone.localdate()
        lancamento.save()
        self._sincronizar_orcamento(lancamento)
        registrar_auditoria(entidade="finance.lancamento", acao="APROVAR", instancia=lancamento)
        return Response(LancamentoSerializer(lancamento, context={"request": request}).data)


class PrevisaoFluxoCaixaViewSet(viewsets.ModelViewSet):
    queryset = PrevisaoFluxoCaixa.objects.select_related("project").all()
    serializer_class = PrevisaoFluxoCaixaSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "financeiro.ver"
    permissao_escrita = "financeiro.editar"
    filterset_fields = ["project", "periodo"]


class EVMProjetoView(APIView):
    """EVM e curva S de um projeto (RF-21)."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "financeiro.ver"

    def get(self, request, project_id):
        projeto = Project.objects.filter(pk=project_id).first()
        if not projeto:
            return Response({"erro": True, "mensagem": "Projeto não encontrado."}, status=404)
        data_ref = request.query_params.get("data")
        referencia = timezone.datetime.fromisoformat(data_ref).date() if data_ref else None
        return Response(
            {
                "projeto": {"id": projeto.id, "nome": projeto.nome, "codigo": projeto.codigo},
                "evm": calcular_evm(projeto, referencia),
                "curva_s": curva_s(projeto, referencia),
                "por_categoria": consumo_por_categoria(projeto),
                "fluxo_caixa": fluxo_caixa(projeto),
            }
        )


class PainelFinanceiroView(APIView):
    """Dashboard financeiro do portfólio (RF-20/RF-22)."""

    permission_classes = [PermissaoSGP]
    permissao_leitura = "financeiro.ver"

    def get(self, request):
        projetos = Project.objects.filter(arquivado=False).prefetch_related("orcamentos", "lancamentos", "tarefas")
        if request.query_params.get("programa"):
            projetos = projetos.filter(program_id=request.query_params["programa"])
        lista = list(projetos)
        categorias: dict[str, dict] = {}
        for projeto in lista:
            for item in consumo_por_categoria(projeto):
                entrada = categorias.setdefault(
                    item["categoria"],
                    {"categoria": item["categoria"], "planejado": 0.0, "realizado": 0.0, "cor": item["cor"]},
                )
                entrada["planejado"] += item["planejado"]
                entrada["realizado"] += item["realizado"]
        for entrada in categorias.values():
            entrada["saldo"] = round(entrada["planejado"] - entrada["realizado"], 2)
            entrada["consumo"] = round(
                entrada["realizado"] / entrada["planejado"] * 100, 1
            ) if entrada["planejado"] else 0.0

        mensal: dict[str, dict] = {}
        for lancamento in Lancamento.objects.filter(project__in=lista).select_related("project"):
            chave = f"{lancamento.data_competencia:%Y-%m}"
            entrada = mensal.setdefault(chave, {"periodo": chave, "despesas": 0.0, "receitas": 0.0})
            if lancamento.tipo == TipoLancamento.DESPESA:
                entrada["despesas"] += float(lancamento.valor)
            else:
                entrada["receitas"] += float(lancamento.valor)
        serie = sorted(mensal.values(), key=lambda m: m["periodo"])
        saldo = 0.0
        for ponto in serie:
            saldo += ponto["receitas"] - ponto["despesas"]
            ponto["saldo_acumulado"] = round(saldo, 2)

        return Response(
            {
                "resumo": resumo_financeiro_portfolio(lista),
                "por_categoria": sorted(categorias.values(), key=lambda c: -c["planejado"]),
                "serie_mensal": serie,
                "por_projeto": [
                    {
                        "id": p.id, "nome": p.nome, "codigo": p.codigo, "cor": p.cor,
                        "orcamento": float(bac_do_projeto(p)),
                        "realizado": float(custo_real_do_projeto(p)),
                        "percentual_conclusao": p.percentual_conclusao,
                        **{k: v for k, v in calcular_evm(p).items() if k in {"CPI", "SPI", "EAC", "VAC", "situacao_custo", "situacao_prazo"}},
                    }
                    for p in lista[:80]
                ],
                "top_estouros": sorted(
                    [
                        {
                            "id": p.id, "nome": p.nome, "codigo": p.codigo, "cor": p.cor,
                            "orcamento": float(bac_do_projeto(p)),
                            "realizado": float(custo_real_do_projeto(p)),
                            "desvio": float(custo_real_do_projeto(p) - bac_do_projeto(p)),
                            "percentual": round(
                                float(custo_real_do_projeto(p)) / float(bac_do_projeto(p)) * 100, 1
                            ) if bac_do_projeto(p) else 0.0,
                        }
                        for p in lista
                    ],
                    key=lambda i: -i["desvio"],
                )[:10],
                "gerado_em": timezone.now().isoformat(),
            }
        )

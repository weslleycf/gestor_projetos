import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, BarChart3, CircleDollarSign, Download, Gauge, Landmark, Percent,
  PiggyBank, RefreshCw, Scale, Target, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import {
  Alerta, BarraFerramentas, Botao, CabecalhoPagina, CarregandoBloco, Etiqueta, FiltrosAtivos,
  Semaforo, Tabela, Vazio, useAvisos, CORES_SAUDE, type ColunaTabela,
} from "@/components/ui";
import { EscalaCores, GraficoBarras, GraficoLinha, Medidor, type Serie } from "@/components/charts";
import { FiltroSelect, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataHora, indice, mesCurto, moeda, numero, percentual } from "@/lib/format";
import type { Saude } from "@/lib/types";

/* ==========================================================================
   Painel financeiro do portfólio (RF-20 / RF-22 / §8.1)
   ========================================================================== */

interface Opcao {
  id: number;
  nome: string;
}

interface ResumoFinanceiro {
  orcamento_planejado: number;
  custo_realizado: number;
  saldo: number;
  receita_prevista: number;
  roi_estimado: number;
  consumo_percentual: number;
  cpi_medio: number;
  spi_medio: number;
}

interface CategoriaFinanceira {
  categoria: string;
  planejado: number;
  realizado: number;
  saldo: number;
  consumo: number;
  cor: string;
}

interface PontoMensal {
  periodo: string;
  despesas: number;
  receitas: number;
  saldo_acumulado: number;
}

interface ProjetoFinanceiro {
  id: number;
  nome: string;
  codigo: string;
  cor: string;
  orcamento: number;
  realizado: number;
  percentual_conclusao: number;
  CPI: number;
  SPI: number;
  EAC: number;
  VAC: number;
  situacao_custo: Saude;
  situacao_prazo: Saude;
}

interface Estouro {
  id: number;
  nome: string;
  codigo: string;
  cor: string;
  orcamento: number;
  realizado: number;
  desvio: number;
  percentual: number;
}

interface RespostaFinanceiro {
  resumo: ResumoFinanceiro;
  por_categoria: CategoriaFinanceira[];
  serie_mensal: PontoMensal[];
  por_projeto: ProjetoFinanceiro[];
  top_estouros: Estouro[];
  gerado_em: string;
}

function corSituacao(consumo: number, orcamento: number) {
  if (!orcamento) return "#64748B";
  if (consumo <= 90) return "#059669";
  if (consumo <= 100) return "#D97706";
  return "#DC2626";
}

function baixarCSV(nomeArquivo: string, linhas: string[][]) {
  const corpo = linhas
    .map((linha) => linha.map((celula) => '"' + String(celula).replace(/"/g, '""') + '"').join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + corpo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Financeiro() {
  const navegar = useNavigate();
  const { sucesso, alerta, erro: avisarErro } = useAvisos();
  const [programa, setPrograma] = useState("");

  const params = useMemo(() => (programa ? { programa } : {}), [programa]);

  const { data, isLoading, isError, error, refetch, isFetching } = useConsulta<RespostaFinanceiro>(
    CHAVES.dashboardFinanceiro,
    "/dashboard/financeiro/",
    params
  );

  const { data: programas = [] } = useLista<Opcao>(["programas"], "/programas/", { page_size: 200 });

  const resumo = data?.resumo;
  const categorias = useMemo(() => data?.por_categoria ?? [], [data]);
  const serie = useMemo(() => data?.serie_mensal ?? [], [data]);
  const projetos = useMemo(() => data?.por_projeto ?? [], [data]);
  const estouros = useMemo(() => data?.top_estouros ?? [], [data]);

  const maiorDesvio = useMemo(
    () => estouros.reduce((maximo, item) => Math.max(maximo, Math.abs(item.desvio)), 0),
    [estouros]
  );

  const itensMensais: Serie[] = useMemo(
    () => [
      { nome: "Despesas", cor: "#DC2626", dados: serie.map((p) => p.despesas) },
      { nome: "Receitas", cor: "#059669", dados: serie.map((p) => p.receitas) },
      { nome: "Saldo acumulado", cor: "#2563EB", dados: serie.map((p) => p.saldo_acumulado), area: true },
    ],
    [serie]
  );

  const rotulosMensais = useMemo(() => serie.map((p) => mesCurto(p.periodo)), [serie]);

  const itensCategoria = useMemo(
    () =>
      categorias.map((c) => ({
        rotulo: c.categoria,
        valor: c.realizado,
        comparativo: c.planejado,
        cor: corSituacao(c.consumo, c.planejado),
      })),
    [categorias]
  );

  const colunasProjetos: Array<ColunaTabela<ProjetoFinanceiro>> = [
    {
      chave: "nome",
      titulo: "Projeto",
      ordenavel: true,
      valorOrdenacao: (p) => p.nome,
      renderizar: (p) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.cor }} />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-fg">{p.nome}</p>
            <p className="truncate text-2xs text-fg-muted">
              {p.codigo} · {percentual(p.percentual_conclusao, 0)} concluído
            </p>
          </div>
        </div>
      ),
    },
    {
      chave: "orcamento",
      titulo: "Orçamento",
      largura: "130px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.orcamento,
      renderizar: (p) => <span className="tabular-nums text-xs text-fg">{moeda(p.orcamento, true)}</span>,
    },
    {
      chave: "realizado",
      titulo: "Realizado",
      largura: "130px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.realizado,
      renderizar: (p) => (
        <span
          className="tabular-nums text-xs font-semibold"
          style={{ color: p.realizado > p.orcamento ? "#DC2626" : "#059669" }}
        >
          {moeda(p.realizado, true)}
        </span>
      ),
    },
    {
      chave: "CPI",
      titulo: "CPI",
      largura: "80px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.CPI,
      renderizar: (p) => (
        <span
          className="font-semibold tabular-nums"
          style={{ color: CORES_SAUDE[p.situacao_custo]?.cor ?? "#64748B" }}
          title={"Índice de desempenho de custo: " + indice(p.CPI, 2)}
        >
          {indice(p.CPI, 2)}
        </span>
      ),
    },
    {
      chave: "SPI",
      titulo: "SPI",
      largura: "80px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.SPI,
      renderizar: (p) => (
        <span
          className="font-semibold tabular-nums"
          style={{ color: CORES_SAUDE[p.situacao_prazo]?.cor ?? "#64748B" }}
          title={"Índice de desempenho de prazo: " + indice(p.SPI, 2)}
        >
          {indice(p.SPI, 2)}
        </span>
      ),
    },
    {
      chave: "EAC",
      titulo: "EAC",
      largura: "120px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.EAC,
      renderizar: (p) => (
        <span className="tabular-nums text-xs text-fg-muted" title="Estimativa no término">
          {moeda(p.EAC, true)}
        </span>
      ),
    },
    {
      chave: "VAC",
      titulo: "VAC",
      largura: "120px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.VAC,
      renderizar: (p) => (
        <span
          className="font-semibold tabular-nums text-xs"
          style={{ color: p.VAC < 0 ? "#DC2626" : "#059669" }}
          title="Variação no término (orçamento - EAC)"
        >
          {moeda(p.VAC, true)}
        </span>
      ),
    },
    {
      chave: "situacao",
      titulo: "Situação",
      largura: "150px",
      renderizar: (p) => (
        <div className="flex flex-col gap-1">
          <Semaforo saude={p.situacao_custo} tamanho="sm" />
          <span className="text-2xs text-fg-subtle">prazo: {CORES_SAUDE[p.situacao_prazo]?.rotulo ?? "—"}</span>
        </div>
      ),
    },
  ];

  function exportarCSV() {
    if (!resumo) {
      alerta("Nada para exportar", "Os dados financeiros ainda não foram carregados.");
      return;
    }
    const linhas: string[][] = [];
    linhas.push(["Painel financeiro do portfólio"]);
    linhas.push(["Programa", programa ? (programas.find((p) => String(p.id) === programa)?.nome ?? programa) : "Todos"]);
    linhas.push(["Gerado em", data?.gerado_em ? dataHora(data.gerado_em) : ""]);
    linhas.push([]);
    linhas.push(["Indicador", "Valor"]);
    linhas.push(["Orçamento planejado", resumo.orcamento_planejado.toFixed(2)]);
    linhas.push(["Custo realizado", resumo.custo_realizado.toFixed(2)]);
    linhas.push(["Saldo", resumo.saldo.toFixed(2)]);
    linhas.push(["Receita prevista", resumo.receita_prevista.toFixed(2)]);
    linhas.push(["ROI estimado (%)", resumo.roi_estimado.toFixed(2)]);
    linhas.push(["Consumo (%)", resumo.consumo_percentual.toFixed(2)]);
    linhas.push(["CPI médio", resumo.cpi_medio.toFixed(3)]);
    linhas.push(["SPI médio", resumo.spi_medio.toFixed(3)]);
    linhas.push([]);
    linhas.push(["Categoria", "Planejado", "Realizado", "Saldo", "Consumo (%)"]);
    categorias.forEach((c) => {
      linhas.push([c.categoria, c.planejado.toFixed(2), c.realizado.toFixed(2), c.saldo.toFixed(2), c.consumo.toFixed(1)]);
    });
    linhas.push([]);
    linhas.push(["Projeto", "Código", "Orçamento", "Realizado", "CPI", "SPI", "EAC", "VAC", "Situação custo", "Situação prazo"]);
    projetos.forEach((p) => {
      linhas.push([
        p.nome,
        p.codigo,
        p.orcamento.toFixed(2),
        p.realizado.toFixed(2),
        p.CPI.toFixed(3),
        p.SPI.toFixed(3),
        p.EAC.toFixed(2),
        p.VAC.toFixed(2),
        p.situacao_custo,
        p.situacao_prazo,
      ]);
    });
    linhas.push([]);
    linhas.push(["Série mensal", "Despesas", "Receitas", "Saldo acumulado"]);
    serie.forEach((p) => {
      linhas.push([p.periodo, p.despesas.toFixed(2), p.receitas.toFixed(2), p.saldo_acumulado.toFixed(2)]);
    });
    try {
      baixarCSV("financeiro-portfolio.csv", linhas);
      sucesso("CSV exportado", "O arquivo financeiro-portfolio.csv foi gerado.");
    } catch (falha) {
      avisarErro("Não foi possível exportar", String(falha));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Financeiro" subtitulo="Consolidado do portfólio" icone={Wallet} />
        <CarregandoBloco rotulo="Carregando painel financeiro..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Financeiro" subtitulo="Consolidado do portfólio" icone={Wallet} />
        <Alerta tom="danger" titulo="Não foi possível carregar o painel financeiro">
          {mensagemErro(error)}
        </Alerta>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Financeiro do portfólio"
        subtitulo={projetos.length + " projeto(s) no escopo · atualizado em " + dataHora(data.gerado_em)}
        icone={Wallet}
        cor="#059669"
        migalhas={[{ rotulo: "Início", onClick: () => navegar("/") }, { rotulo: "Financeiro" }]}
        acoes={
          <>
            <Botao icone={RefreshCw} onClick={() => refetch()} carregando={isFetching}>
              Atualizar
            </Botao>
            <Botao variante="primario" icone={Download} onClick={exportarCSV}>
              Exportar CSV
            </Botao>
          </>
        }
      />

      <BarraFerramentas>
        <FiltroSelect
          rotulo="Programa"
          valor={programa}
          onChange={setPrograma}
          icone={Target}
          opcoes={programas.map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
        />
        <span className="ml-auto text-2xs text-fg-muted">
          Valores consolidados de orçamento, lançamentos e EVM de todos os projetos ativos.
        </span>
      </BarraFerramentas>

      <FiltrosAtivos
        filtros={
          programa
            ? [
                {
                  chave: "programa",
                  rotulo: "Programa",
                  valor: programas.find((p) => String(p.id) === programa)?.nome ?? programa,
                  onRemover: () => setPrograma(""),
                },
              ]
            : []
        }
        onLimpar={() => setPrograma("")}
      />

      <LinhaKPI
        itens={[
          {
            rotulo: "Orçamento planejado",
            valor: moeda(resumo?.orcamento_planejado, true),
            icone: Landmark,
            cor: "#2563EB",
            subrotulo: "BAC consolidado",
          },
          {
            rotulo: "Custo realizado",
            valor: moeda(resumo?.custo_realizado, true),
            icone: CircleDollarSign,
            cor: "#0891B2",
            subrotulo: "lançamentos realizados + comprometidos",
          },
          {
            rotulo: "Saldo",
            valor: moeda(resumo?.saldo, true),
            icone: PiggyBank,
            cor: (resumo?.saldo ?? 0) < 0 ? "#DC2626" : "#059669",
            subrotulo: "planejado - realizado",
          },
          {
            rotulo: "Receita prevista",
            valor: moeda(resumo?.receita_prevista, true),
            icone: TrendingUp,
            cor: "#059669",
            subrotulo: "contratada / projetada",
          },
          {
            rotulo: "ROI estimado",
            valor: percentual(resumo?.roi_estimado, 1),
            icone: Scale,
            cor: (resumo?.roi_estimado ?? 0) < 0 ? "#DC2626" : "#84CC16",
            subrotulo: "receita x orçamento",
          },
          {
            rotulo: "Consumo",
            valor: percentual(resumo?.consumo_percentual, 1),
            icone: Percent,
            cor: (resumo?.consumo_percentual ?? 0) > 100 ? "#DC2626" : "#F59E0B",
            subrotulo: "do orçamento já consumido",
          },
          {
            rotulo: "CPI médio",
            valor: indice(resumo?.cpi_medio, 2),
            icone: Gauge,
            cor: (resumo?.cpi_medio ?? 1) >= 0.95 ? "#059669" : (resumo?.cpi_medio ?? 1) >= 0.85 ? "#D97706" : "#DC2626",
            subrotulo: "meta ≥ 1,00",
          },
          {
            rotulo: "SPI médio",
            valor: indice(resumo?.spi_medio, 2),
            icone: BarChart3,
            cor: (resumo?.spi_medio ?? 1) >= 0.95 ? "#059669" : (resumo?.spi_medio ?? 1) >= 0.85 ? "#D97706" : "#DC2626",
            subrotulo: "meta ≥ 1,00",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <Gauge className="size-4 text-fg-muted" aria-hidden /> Desempenho de custo (CPI)
          </h3>
          <div className="flex justify-center">
            <Medidor valor={resumo?.cpi_medio ?? 1} titulo="CPI médio do portfólio" meta={1} tamanho={190} formato={(v) => indice(v, 2)} />
          </div>
          <p className="mt-2 text-center text-2xs text-fg-muted">
            Abaixo de 1,00 significa que o portfólio gasta mais do que agrega valor.
          </p>
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
            <TrendingDown className="size-4 text-fg-muted" aria-hidden /> Desempenho de prazo (SPI)
          </h3>
          <div className="flex justify-center">
            <Medidor valor={resumo?.spi_medio ?? 1} titulo="SPI médio do portfólio" meta={1} tamanho={190} formato={(v) => indice(v, 2)} />
          </div>
          <p className="mt-2 text-center text-2xs text-fg-muted">
            Abaixo de 1,00 indica que o avanço físico está atrás do planejado.
          </p>
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <AlertTriangle className="size-4 text-warning" aria-hidden /> Top estouros
          </h3>
          {estouros.length === 0 ? (
            <Vazio icone={PiggyBank} titulo="Nenhum projeto com desvio" descricao="Todos os projetos estão dentro do orçamento aprovado." />
          ) : (
            <ul className="space-y-2.5">
              {estouros.slice(0, 6).map((e, posicao) => {
                const estourou = e.desvio > 0;
                const largura = maiorDesvio ? Math.max(6, Math.round((Math.abs(e.desvio) / maiorDesvio) * 100)) : 0;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => navegar("/projetos/" + e.id)}
                      className="group flex w-full items-center gap-2 text-left"
                    >
                      <span className="w-4 shrink-0 text-2xs font-bold tabular-nums text-fg-subtle">{posicao + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-fg group-hover:text-brand">{e.nome}</span>
                          <span
                            className="shrink-0 text-2xs font-bold tabular-nums"
                            style={{ color: estourou ? "#DC2626" : "#059669" }}
                          >
                            {estourou ? "+" : ""}
                            {moeda(e.desvio, true)}
                          </span>
                        </span>
                        <span className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-surface-3">
                          <span
                            className="block h-full rounded-full transition-all duration-500"
                            style={{ width: largura + "%", backgroundColor: estourou ? "#DC2626" : "#059669" }}
                          />
                        </span>
                        <span className="mt-0.5 flex items-center justify-between text-2xs text-fg-subtle">
                          <span>{e.codigo}</span>
                          <span>
                            {moeda(e.realizado, true)} de {moeda(e.orcamento, true)} ({percentual(e.percentual, 0)})
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 border-t border-border pt-2">
            <EscalaCores rotulos={["≤90%", "≤100%", ">100%"]} cores={["#059669", "#D97706", "#DC2626"]} titulo="Consumo" />
          </div>
        </div>
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <BarChart3 className="size-4 text-fg-muted" aria-hidden /> Planejado × realizado por categoria
          </h3>
          <span className="text-2xs text-fg-muted">Barra clara = planejado · barra colorida = realizado</span>
        </div>
        {itensCategoria.length === 0 ? (
          <Vazio
            icone={Wallet}
            titulo="Nenhuma categoria orçamentária"
            descricao="Distribua o orçamento do projeto para acompanhar o consumo por categoria."
          />
        ) : (
          <GraficoBarras itens={itensCategoria} altura={260} formatarValor={(v) => moeda(v, true)} mostrarEixo />
        )}
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <TrendingUp className="size-4 text-fg-muted" aria-hidden /> Série mensal de despesas, receitas e saldo
          </h3>
          <span className="text-2xs text-fg-muted">{serie.length} período(s)</span>
        </div>
        {serie.length === 0 ? (
          <Vazio icone={BarChart3} titulo="Sem lançamentos no período" descricao="Registre despesas e receitas para visualizar a evolução mensal." />
        ) : (
          <GraficoLinha
            rotulos={rotulosMensais}
            series={itensMensais}
            altura={280}
            formatarValor={(v) => moeda(v, true)}
            mostrarLegenda
            mostrarArea
          />
        )}
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Wallet className="size-4 text-fg-muted" aria-hidden /> Projetos ({projetos.length})
          </h3>
          <span className="text-2xs text-fg-muted">Clique em uma linha para abrir o projeto · colunas ordenáveis</span>
        </header>
        <Tabela
          colunas={colunasProjetos}
          dados={projetos}
          aoClicarLinha={(p) => navegar("/projetos/" + p.id)}
          destaqueLinha={(p) => (p.VAC < 0 ? "bg-danger-soft/25" : undefined)}
          vazio={
            <Vazio
              icone={Wallet}
              titulo="Nenhum projeto no escopo"
              descricao="Ajuste o filtro de programa ou cadastre projetos com orçamento."
            />
          }
          compacta
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <Landmark className="size-4 text-fg-muted" aria-hidden /> Resumo consolidado
          </h3>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
              <dt className="text-2xs text-fg-muted">Orçamento planejado</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">{moeda(resumo?.orcamento_planejado, true)}</dd>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
              <dt className="text-2xs text-fg-muted">Custo realizado</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">{moeda(resumo?.custo_realizado, true)}</dd>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
              <dt className="text-2xs text-fg-muted">Saldo disponível</dt>
              <dd
                className="mt-0.5 text-lg font-bold tabular-nums"
                style={{ color: (resumo?.saldo ?? 0) < 0 ? "#DC2626" : "#059669" }}
              >
                {moeda(resumo?.saldo, true)}
              </dd>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
              <dt className="text-2xs text-fg-muted">Receita prevista</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">{moeda(resumo?.receita_prevista, true)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <Scale className="size-4 text-fg-muted" aria-hidden /> Situação por categoria
          </h3>
          {categorias.length === 0 ? (
            <p className="py-6 text-center text-xs text-fg-muted">Sem categorias cadastradas.</p>
          ) : (
            <ul className="space-y-2">
              {categorias.slice(0, 8).map((c) => (
                <li key={c.categoria} className="flex items-center gap-3">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: corSituacao(c.consumo, c.planejado) }} />
                  <span className="min-w-0 flex-1 truncate text-xs text-fg">{c.categoria}</span>
                  <span className="shrink-0 text-2xs tabular-nums text-fg-muted">{moeda(c.realizado, true)}</span>
                  <Etiqueta tom={c.consumo > 100 ? "danger" : c.consumo > 90 ? "warning" : "success"}>
                    {percentual(c.consumo, 0)}
                  </Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="pb-2 text-center text-2xs text-fg-subtle">
        Consolidação de {numero(projetos.length)} projeto(s) · {numero(serie.length)} período(s) na série mensal
      </p>
    </div>
  );
}

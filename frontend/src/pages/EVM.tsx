import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart3, CalendarClock, CircleDollarSign, Coins, Gauge, Info,
  Landmark, LineChart, Percent, RefreshCw, Target, TrendingDown, TrendingUp, Wallet, X,
} from "lucide-react";
import {
  Alerta, Botao, BotaoIcone, CabecalhoPagina, Campo, CarregandoBloco, Dica, Entrada, Etiqueta,
  Semaforo, Tabela, Vazio, type ColunaTabela,
} from "@/components/ui";
import { GraficoBarras, GraficoLinha, Medidor, type Serie } from "@/components/charts";
import { FiltroSelect, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataHora, indice, mesCurto, moeda, numero, percentual } from "@/lib/format";
import type { EVM as IndicadoresEVM, ProjetoResumo, Saude } from "@/lib/types";

/* ==========================================================================
   Gestão de Valor Agregado (EVM) com curva S interativa — RF-21
   ========================================================================== */

interface PontoCurva {
  data: string;
  rotulo: string;
  PV: number;
  EV: number;
  AC: number;
  desvio_custo: number;
  desvio_prazo: number;
  EAC_projetado?: number;
}

interface CategoriaConsumo {
  id: number;
  categoria: string;
  tipo: string;
  cor: string;
  icone: string;
  planejado: number;
  realizado: number;
  saldo: number;
  consumo: number;
  situacao: Saude;
}

interface MesFluxo {
  id: string;
  periodo: string;
  entradas: number;
  saidas: number;
  previsto_entradas: number;
  previsto_saidas: number;
  saldo: number;
  saldo_previsto: number;
  saldo_acumulado: number;
  rotulo: string;
}

interface RespostaEVM {
  projeto: { id: number; nome: string; codigo: string };
  evm: IndicadoresEVM;
  curva_s: { pontos: PontoCurva[]; resumo: IndicadoresEVM };
  por_categoria: CategoriaConsumo[];
  fluxo_caixa: { meses: Array<Omit<MesFluxo, "id">>; saldo_final_projetado: number };
}

const DICAS: Record<string, string> = {
  BAC: "Budget at Completion — orçamento total aprovado para o projeto.",
  PV: "Planned Value — valor do trabalho que deveria estar pronto na data de referência.",
  EV: "Earned Value — valor do trabalho efetivamente concluído até a data de referência.",
  AC: "Actual Cost — custo real incorrido (lançamentos realizados e comprometidos).",
  CV: "Cost Variance (EV - AC) — positivo indica economia; negativo indica estouro de custo.",
  SV: "Schedule Variance (EV - PV) — positivo indica adiantamento; negativo indica atraso.",
  CPI: "Cost Performance Index (EV / AC) — eficiência de custo. Abaixo de 1,00 há estouro.",
  SPI: "Schedule Performance Index (EV / PV) — eficiência de prazo. Abaixo de 1,00 há atraso.",
  EAC: "Estimate at Completion — custo total estimado no término, projetado pelo desempenho atual.",
  ETC: "Estimate to Complete — quanto ainda falta gastar para concluir o trabalho restante.",
  VAC: "Variance at Completion (BAC - EAC) — positivo indica que o projeto deve terminar abaixo do orçamento.",
  TCPI: "To-Complete Performance Index — eficiência necessária no restante para caber no orçamento.",
};

function corIndice(valor: number) {
  if (valor >= 0.95) return "#059669";
  if (valor >= 0.85) return "#D97706";
  return "#DC2626";
}

function corVariacao(valor: number, invertido = false) {
  const positivo = invertido ? valor < 0 : valor >= 0;
  return positivo ? "#059669" : "#DC2626";
}

function CartaoIndicador({
  sigla,
  nome,
  valor,
  cor,
  subrotulo,
  icone: Icone,
}: {
  sigla: string;
  nome: string;
  valor: string;
  cor: string;
  subrotulo?: string;
  icone: typeof Activity;
}) {
  return (
    <div className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1 transition-shadow hover:shadow-n2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Dica texto={DICAS[sigla] ?? nome}>
            <span className="inline-flex items-center gap-1 text-2xs font-bold uppercase tracking-wide text-fg-muted">
              {sigla}
              <Info className="size-3 text-fg-subtle" aria-hidden />
            </span>
          </Dica>
          <p className="truncate text-2xs text-fg-subtle">{nome}</p>
        </div>
        <span className="grid size-6 shrink-0 place-items-center rounded-md" style={{ backgroundColor: cor + "1f", color: cor }}>
          <Icone className="size-3.5" aria-hidden />
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold tabular-nums" style={{ color: cor }}>
        {valor}
      </p>
      {subrotulo && <p className="mt-0.5 truncate text-2xs text-fg-muted">{subrotulo}</p>}
    </div>
  );
}

export default function EVM() {
  const navegar = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dataReferencia, setDataReferencia] = useState("");
  const [indicePonto, setIndicePonto] = useState<number | null>(null);

  const projetoId = searchParams.get("projeto") ?? "";

  const { data: projetos = [] } = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 300 });

  useEffect(() => {
    if (!projetoId && projetos.length > 0) {
      const proximos = new URLSearchParams(searchParams);
      proximos.set("projeto", String(projetos[0].id));
      setSearchParams(proximos, { replace: true });
    }
  }, [projetoId, projetos, searchParams, setSearchParams]);

  const params = useMemo(() => (dataReferencia ? { data: dataReferencia } : {}), [dataReferencia]);

  const { data, isLoading, isError, error, refetch, isFetching } = useConsulta<RespostaEVM>(
    CHAVES.evm(projetoId),
    projetoId ? "/evm/" + projetoId + "/" : null,
    params
  );

  const evm = data?.evm;
  const pontos = useMemo(() => data?.curva_s.pontos ?? [], [data]);
  const categorias = useMemo(() => data?.por_categoria ?? [], [data]);
  const meses = useMemo(
    () => (data?.fluxo_caixa.meses ?? []).map((m) => ({ ...m, id: m.periodo })),
    [data]
  );

  const indiceReferencia = useMemo(() => {
    if (!pontos.length) return undefined;
    const referencia = dataReferencia || evm?.data_referencia || "";
    let ultimo = 0;
    pontos.forEach((p, i) => {
      if (referencia && p.data <= referencia) ultimo = i;
    });
    return ultimo;
  }, [pontos, dataReferencia, evm]);

  useEffect(() => {
    setIndicePonto(null);
  }, [projetoId, dataReferencia]);

  const seriesCurva: Serie[] = useMemo(
    () => [
      { nome: "PV (planejado)", cor: "#2563EB", dados: pontos.map((p) => p.PV), area: true },
      { nome: "EV (agregado)", cor: "#059669", dados: pontos.map((p) => p.EV), area: true },
      { nome: "AC (custo real)", cor: "#DC2626", dados: pontos.map((p) => p.AC) },
    ],
    [pontos]
  );

  const rotulosCurva = useMemo(() => pontos.map((p) => p.rotulo), [pontos]);

  const seriesDesvio: Serie[] = useMemo(
    () => [
      { nome: "Desvio de custo (EV - AC)", cor: "#DC2626", dados: pontos.map((p) => p.desvio_custo) },
      { nome: "Desvio de prazo (EV - PV)", cor: "#F59E0B", dados: pontos.map((p) => p.desvio_prazo) },
      { nome: "Linha zero", cor: "#94A3B8", dados: pontos.map(() => 0), tracejada: true },
    ],
    [pontos]
  );

  const itensCategoria = useMemo(
    () =>
      categorias.map((c) => ({
        rotulo: c.categoria,
        valor: c.realizado,
        comparativo: c.planejado,
        cor: c.situacao === "VERDE" ? "#059669" : c.situacao === "AMARELO" ? "#D97706" : "#DC2626",
      })),
    [categorias]
  );

  const itensSaldo = useMemo(
    () =>
      meses.map((m) => ({
        rotulo: mesCurto(m.periodo),
        valor: m.saldo_acumulado,
        cor: m.saldo_acumulado < 0 ? "#DC2626" : "#059669",
      })),
    [meses]
  );

  const pontoSelecionado = indicePonto !== null ? pontos[indicePonto] : undefined;

  const colunasFluxo: Array<ColunaTabela<MesFluxo>> = [
    {
      chave: "periodo",
      titulo: "Período",
      largura: "110px",
      ordenavel: true,
      valorOrdenacao: (m) => m.periodo,
      renderizar: (m) => <span className="text-xs font-medium text-fg">{mesCurto(m.periodo)}</span>,
    },
    {
      chave: "entradas",
      titulo: "Entradas",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (m) => m.entradas,
      renderizar: (m) => <span className="tabular-nums text-xs text-success">{moeda(m.entradas, true)}</span>,
    },
    {
      chave: "saidas",
      titulo: "Saídas",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (m) => m.saidas,
      renderizar: (m) => <span className="tabular-nums text-xs text-danger">{moeda(m.saidas, true)}</span>,
    },
    {
      chave: "saldo",
      titulo: "Saldo",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (m) => m.saldo,
      renderizar: (m) => (
        <span className="font-semibold tabular-nums text-xs" style={{ color: m.saldo < 0 ? "#DC2626" : "#059669" }}>
          {moeda(m.saldo, true)}
        </span>
      ),
    },
    {
      chave: "previsto",
      titulo: "Previsto",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (m) => m.saldo_previsto,
      renderizar: (m) => (
        <span className="tabular-nums text-xs text-fg-muted" title="Entradas previstas menos saídas previstas">
          {moeda(m.saldo_previsto, true)}
        </span>
      ),
    },
    {
      chave: "acumulado",
      titulo: "Saldo acumulado",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (m) => m.saldo_acumulado,
      renderizar: (m) => (
        <span className="font-bold tabular-nums text-xs" style={{ color: m.saldo_acumulado < 0 ? "#DC2626" : "#059669" }}>
          {moeda(m.saldo_acumulado, true)}
        </span>
      ),
    },
  ];

  const semProjeto = !projetoId;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Gestão de Valor Agregado"
        subtitulo={
          data
            ? data.projeto.codigo + " · " + data.projeto.nome + " · referência " + dataCurta(evm?.data_referencia)
            : "Curva S e indicadores de desempenho (RF-21)"
        }
        icone={LineChart}
        cor="#8B5CF6"
        migalhas={[{ rotulo: "Início", onClick: () => navegar("/") }, { rotulo: "EVM" }]}
        acoes={
          <>
            <FiltroSelect
              rotulo="Projeto"
              valor={projetoId}
              onChange={(v) => {
                const proximos = new URLSearchParams(searchParams);
                if (v) proximos.set("projeto", v);
                else proximos.delete("projeto");
                setSearchParams(proximos, { replace: true });
              }}
              icone={Target}
              opcoes={projetos.map((p) => ({ valor: String(p.id), rotulo: p.codigo + " · " + p.nome }))}
            />
            <Botao icone={RefreshCw} onClick={() => refetch()} carregando={isFetching}>
              Atualizar
            </Botao>
          </>
        }
      />

      <div className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Data de referência" dica="Recalcula PV, EV e AC considerando apenas o que ocorreu até esta data." htmlFor="evm-data">
            <Entrada
              id="evm-data"
              type="date"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
              className="w-44"
            />
          </Campo>
          {dataReferencia && (
            <Botao icone={X} onClick={() => setDataReferencia("")}>
              Limpar data
            </Botao>
          )}
          {evm && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Etiqueta tom="info" icone={CalendarClock}>
                {dataCurta(evm.data_referencia)}
              </Etiqueta>
              <Semaforo saude={evm.situacao_custo} comRotulo tamanho="sm" />
              <Semaforo saude={evm.situacao_prazo} comRotulo tamanho="sm" />
            </div>
          )}
        </div>
      </div>

      {semProjeto && (
        <Vazio
          icone={LineChart}
          titulo="Selecione um projeto"
          descricao="Escolha um projeto no seletor acima para visualizar a curva S e os indicadores de valor agregado."
        />
      )}

      {!semProjeto && isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os indicadores EVM">
          {mensagemErro(error)}
        </Alerta>
      )}

      {!semProjeto && isLoading && <CarregandoBloco rotulo="Calculando valor agregado..." />}

      {!semProjeto && data && evm && (
        <>
          <LinhaKPI
            itens={[
              { rotulo: "BAC (orçamento)", valor: moeda(evm.BAC, true), icone: Landmark, cor: "#2563EB", subrotulo: "orçamento total aprovado" },
              { rotulo: "PV planejado", valor: moeda(evm.PV, true), icone: BarChart3, cor: "#0891B2", subrotulo: percentual(evm.percentual_agregado, 1) + " do BAC" },
              { rotulo: "EV agregado", valor: moeda(evm.EV, true), icone: TrendingUp, cor: "#059669", subrotulo: "valor entregue" },
              { rotulo: "AC custo real", valor: moeda(evm.AC, true), icone: CircleDollarSign, cor: "#DC2626", subrotulo: percentual(evm.percentual_consumido, 1) + " consumido" },
              { rotulo: "EAC projetado", valor: moeda(evm.EAC, true), icone: Coins, cor: "#8B5CF6", subrotulo: "estimativa no término" },
              {
                rotulo: "VAC",
                valor: moeda(evm.VAC, true),
                icone: TrendingDown,
                cor: corVariacao(evm.VAC),
                subrotulo: evm.VAC < 0 ? "projeção acima do orçamento" : "projeção dentro do orçamento",
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                <Gauge className="size-4 text-fg-muted" aria-hidden /> CPI — eficiência de custo
              </h3>
              <div className="flex justify-center">
                <Medidor valor={evm.CPI} titulo="CPI" meta={1} tamanho={190} formato={(v) => indice(v, 2)} />
              </div>
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                <Activity className="size-4 text-fg-muted" aria-hidden /> SPI — eficiência de prazo
              </h3>
              <div className="flex justify-center">
                <Medidor valor={evm.SPI} titulo="SPI" meta={1} tamanho={190} formato={(v) => indice(v, 2)} />
              </div>
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Percent className="size-4 text-fg-muted" aria-hidden /> Projeção no término
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-fg-muted">Orçamento original (BAC)</dt>
                  <dd className="font-semibold tabular-nums text-fg">{moeda(evm.orcamento_original, true)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-fg-muted">EAC projetado</dt>
                  <dd className="font-semibold tabular-nums" style={{ color: corVariacao(evm.VAC) }}>
                    {moeda(evm.projecao_final, true)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-fg-muted">ETC (falta gastar)</dt>
                  <dd className="font-semibold tabular-nums text-fg">{moeda(evm.ETC, true)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-fg-muted">VAC</dt>
                  <dd className="font-semibold tabular-nums" style={{ color: corVariacao(evm.VAC) }}>
                    {moeda(evm.VAC, true)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-fg-muted">TCPI necessário</dt>
                  <dd className="font-semibold tabular-nums" style={{ color: evm.TCPI > 1.1 ? "#DC2626" : "#059669" }}>
                    {indice(evm.TCPI, 2)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <CartaoIndicador sigla="BAC" nome="Orçamento total" valor={moeda(evm.BAC, true)} cor="#2563EB" icone={Landmark} subrotulo="Budget at Completion" />
            <CartaoIndicador sigla="PV" nome="Valor planejado" valor={moeda(evm.PV, true)} cor="#0891B2" icone={BarChart3} subrotulo="Planned Value" />
            <CartaoIndicador sigla="EV" nome="Valor agregado" valor={moeda(evm.EV, true)} cor="#059669" icone={TrendingUp} subrotulo="Earned Value" />
            <CartaoIndicador sigla="AC" nome="Custo real" valor={moeda(evm.AC, true)} cor="#DC2626" icone={CircleDollarSign} subrotulo="Actual Cost" />
            <CartaoIndicador sigla="CV" nome="Variação de custo" valor={moeda(evm.CV, true)} cor={corVariacao(evm.CV)} icone={Coins} subrotulo={evm.CV < 0 ? "acima do previsto" : "abaixo do previsto"} />
            <CartaoIndicador sigla="SV" nome="Variação de prazo" valor={moeda(evm.SV, true)} cor={corVariacao(evm.SV)} icone={CalendarClock} subrotulo={evm.SV < 0 ? "atrasado" : "adiantado"} />
            <CartaoIndicador sigla="CPI" nome="Índice de custo" valor={indice(evm.CPI, 2)} cor={corIndice(evm.CPI)} icone={Gauge} subrotulo="meta maior ou igual a 1,00" />
            <CartaoIndicador sigla="SPI" nome="Índice de prazo" valor={indice(evm.SPI, 2)} cor={corIndice(evm.SPI)} icone={Activity} subrotulo="meta maior ou igual a 1,00" />
            <CartaoIndicador sigla="EAC" nome="Estimativa no término" valor={moeda(evm.EAC, true)} cor="#8B5CF6" icone={Target} subrotulo="custo total projetado" />
            <CartaoIndicador sigla="ETC" nome="Estimativa para concluir" valor={moeda(evm.ETC, true)} cor="#6366F1" icone={Wallet} subrotulo="trabalho restante" />
            <CartaoIndicador sigla="VAC" nome="Variação no término" valor={moeda(evm.VAC, true)} cor={corVariacao(evm.VAC)} icone={TrendingDown} subrotulo="BAC - EAC" />
            <CartaoIndicador sigla="TCPI" nome="Índice para concluir" valor={indice(evm.TCPI, 2)} cor={evm.TCPI > 1.1 ? "#DC2626" : "#059669"} icone={Percent} subrotulo="eficiência exigida no restante" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 xl:col-span-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <LineChart className="size-4 text-fg-muted" aria-hidden /> Curva S — PV × EV × AC
                </h3>
                <span className="text-2xs text-fg-muted">
                  Clique em um ponto para ver os valores daquele instante · linha vertical = data de referência
                </span>
              </div>
              {pontos.length === 0 ? (
                <Vazio
                  icone={LineChart}
                  titulo="Sem curva S para este projeto"
                  descricao="Defina datas de início e fim do projeto e das tarefas para gerar a curva de valor agregado."
                />
              ) : (
                <GraficoLinha
                  rotulos={rotulosCurva}
                  series={seriesCurva}
                  altura={320}
                  formatarValor={(v) => moeda(v, true)}
                  mostrarLegenda
                  mostrarArea
                  marcadorIndice={indiceReferencia}
                  aoClicarPonto={(i) => setIndicePonto(i)}
                />
              )}
            </div>

            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-fg">Instante selecionado</h3>
                {pontoSelecionado && <BotaoIcone icone={X} rotulo="Limpar seleção" tamanho="sm" onClick={() => setIndicePonto(null)} />}
              </div>
              {!pontoSelecionado ? (
                <p className="py-8 text-center text-xs text-fg-muted">
                  Clique em um ponto da curva S para inspecionar PV, EV, AC e os desvios daquele momento.
                </p>
              ) : (
                <div className="space-y-2.5 text-xs">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{dataCurta(pontoSelecionado.data)}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-fg-muted">PV planejado</span>
                    <span className="font-semibold tabular-nums" style={{ color: "#2563EB" }}>{moeda(pontoSelecionado.PV, true)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-fg-muted">EV agregado</span>
                    <span className="font-semibold tabular-nums" style={{ color: "#059669" }}>{moeda(pontoSelecionado.EV, true)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-fg-muted">AC custo real</span>
                    <span className="font-semibold tabular-nums" style={{ color: "#DC2626" }}>{moeda(pontoSelecionado.AC, true)}</span>
                  </div>
                  <div className="border-t border-border pt-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-fg-muted">Desvio de custo</span>
                      <span className="font-semibold tabular-nums" style={{ color: corVariacao(pontoSelecionado.desvio_custo) }}>
                        {moeda(pontoSelecionado.desvio_custo, true)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="text-fg-muted">Desvio de prazo</span>
                      <span className="font-semibold tabular-nums" style={{ color: corVariacao(pontoSelecionado.desvio_prazo) }}>
                        {moeda(pontoSelecionado.desvio_prazo, true)}
                      </span>
                    </div>
                  </div>
                  {pontoSelecionado.EAC_projetado !== undefined && (
                    <div className="rounded-sgp border border-border bg-surface-2 p-2">
                      <p className="text-2xs text-fg-muted">EAC projetado neste ponto</p>
                      <p className="text-sm font-bold tabular-nums text-fg">{moeda(pontoSelecionado.EAC_projetado, true)}</p>
                    </div>
                  )}
                  <p className="text-2xs text-fg-subtle">Ponto {indicePonto !== null ? indicePonto + 1 : 0} de {pontos.length}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <TrendingDown className="size-4 text-fg-muted" aria-hidden /> Desvios ao longo do tempo
              </h3>
              <span className="text-2xs text-fg-muted">Valores positivos indicam folga; negativos, problema</span>
            </div>
            {pontos.length === 0 ? (
              <p className="py-8 text-center text-xs text-fg-muted">Sem dados de desvio para o período.</p>
            ) : (
              <GraficoLinha
                rotulos={rotulosCurva}
                series={seriesDesvio}
                altura={220}
                formatarValor={(v) => moeda(v, true)}
                mostrarLegenda
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <BarChart3 className="size-4 text-fg-muted" aria-hidden /> Orçado × realizado por categoria
                </h3>
                <span className="text-2xs text-fg-muted">Barra clara = planejado</span>
              </div>
              {itensCategoria.length === 0 ? (
                <Vazio icone={Wallet} titulo="Sem linhas orçamentárias" descricao="Distribua o orçamento do projeto por categoria." />
              ) : (
                <GraficoBarras itens={itensCategoria} altura={240} formatarValor={(v) => moeda(v, true)} mostrarEixo />
              )}
            </div>

            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Coins className="size-4 text-fg-muted" aria-hidden /> Saldo acumulado projetado
              </h3>
              {itensSaldo.length === 0 ? (
                <p className="py-8 text-center text-xs text-fg-muted">Sem fluxo de caixa registrado.</p>
              ) : (
                <>
                  <GraficoBarras itens={itensSaldo} altura={240} formatarValor={(v) => moeda(v, true)} mostrarEixo />
                  <p className="mt-2 text-center text-2xs text-fg-muted">
                    Saldo final projetado:{" "}
                    <strong style={{ color: (data?.fluxo_caixa.saldo_final_projetado ?? 0) < 0 ? "#DC2626" : "#059669" }}>
                      {moeda(data?.fluxo_caixa.saldo_final_projetado, true)}
                    </strong>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Wallet className="size-4 text-fg-muted" aria-hidden /> Fluxo de caixa mensal
              </h3>
              <span className="text-2xs text-fg-muted">
                {numero(meses.length)} período(s) · gerado em {dataHora(evm.data_referencia)}
              </span>
            </header>
            <Tabela
              colunas={colunasFluxo}
              dados={meses}
              vazio={<Vazio icone={Wallet} titulo="Sem fluxo de caixa" descricao="Registre lançamentos para visualizar entradas, saídas e saldos." />}
              compacta
            />
          </div>

          {evm.CPI < 0.9 && (
            <Alerta tom="danger" titulo="Atenção ao desempenho de custo" icone={AlertTriangle}>
              O CPI de {indice(evm.CPI, 2)} indica que cada real gasto entrega apenas {indice(evm.CPI, 2)} de valor agregado.
              Mantido o ritmo, o projeto deve terminar em {moeda(evm.EAC, true)}, {moeda(Math.abs(evm.VAC), true)} acima do orçamento.
            </Alerta>
          )}
        </>
      )}
    </div>
  );
}

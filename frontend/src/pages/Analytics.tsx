/* ==========================================================================
   Analytics e IA preditiva — Fase 4 da especificação.

   Cinco leituras do portfólio:
   · Previsão do projeto — Monte Carlo, regressão, três métodos de EAC;
   · Risco de atraso      — score explicável, fator a fator;
   · Benchmarking         — distribuições, percentis e práticas observadas;
   · Tendências           — séries mensais com direção de cada indicador;
   · Demanda de pessoas   — FTE projetado contra a capacidade instalada.
   ========================================================================== */

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Calculator,
  ChartColumn,
  ChartLine,
  CircleCheck,
  Clock,
  Compass,
  Crosshair,
  Equal,
  FlaskConical,
  Gauge,
  Hourglass,
  Layers,
  Lightbulb,
  Minus,
  Rocket,
  Scale,
  ShieldAlert,
  Sigma,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Users,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Abas,
  Alerta,
  AnelProgresso,
  BarraProgresso,
  Botao,
  CabecalhoPagina,
  CarregandoBloco,
  Cartao,
  Chip,
  Dica,
  Esqueleto,
  Etiqueta,
  GradeCards,
  SecaoColapsavel,
  Segmentado,
  Selecao,
  Tabela,
  Vazio,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import { GraficoBarras, GraficoLinha, Heatmap, EscalaCores, type CelulaHeatmap, type Serie } from "@/components/charts";
import { BarraFerramentas, FiltroSelect, LinhaKPI } from "@/components/layout";
import { useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataRelativa, indice, moeda, numero, percentual } from "@/lib/format";
import { comAlfa, corPorValor, cn } from "@/lib/utils";
import type { Portfolio, Programa, ProjetoResumo } from "@/lib/types";

/* ==========================================================================
   Tipos (espelham os serviços de analytics do backend)
   ========================================================================== */

interface FatorRisco {
  fator: string;
  rotulo: string;
  peso: number;
  valor: number;
  contribuicao: number;
  impacto: string;
  descricao: string;
}

interface MonteCarlo {
  disponivel: boolean;
  motivo: string;
  metodo: string;
  data_referencia: string;
  iteracoes: number;
  semente: number | null;
  tarefas_consideradas: number;
  tarefas_totais: number;
  amostragem_aplicada: boolean;
  vies_calibrado: number;
  fator_paralelismo: number;
  prazo: {
    p10: string | null;
    p50: string | null;
    p80: string | null;
    p90: string | null;
    dias_p10: number | null;
    dias_p50: number | null;
    dias_p80: number | null;
    dias_p90: number | null;
    otimista_dias: number | null;
    pessimista_dias: number | null;
    media_dias: number | null;
    data_planejada: string | null;
    desvio_p50_dias: number | null;
  };
  custo: { p10: number; p50: number; p80: number; p90: number; media: number; BAC: number; AC: number; moeda: string };
  probabilidade_atraso: number;
  probabilidade_estouro: number;
  indice_confianca: number;
  histograma: Array<{ indice: number; inicio: number; fim: number; quantidade: number }>;
  premissas: string[];
}

interface Regressao {
  disponivel: boolean;
  motivo: string;
  pontos: Array<{ data: string; dia: number; progresso: number }>;
  inclinacao_dia?: number;
  inclinacao_semana?: number;
  intercepto?: number;
  r2?: number;
  qualidade_ajuste?: string;
  progresso_modelado?: number;
  progresso_informado?: number;
  progresso_planejado?: number;
  data_projetada_conclusao?: string | null;
  data_fim_planejada?: string | null;
  desvio_dias?: number | null;
  atraso_previsto?: boolean;
  dias_restantes_projetados?: number | null;
  premissas: string[];
}

interface MetodoEAC {
  chave: string;
  rotulo: string;
  formula: string;
  valor: number;
  variacao_vs_bac: number;
  percentual_vs_bac: number;
  descricao: string;
}

interface PrevisaoCusto {
  disponivel: boolean;
  BAC: number;
  EV: number;
  AC: number;
  PV: number;
  CPI: number;
  SPI: number;
  metodos: MetodoEAC[];
  media: number;
  minimo: number;
  maximo: number;
  amplitude: number;
  amplitude_percentual: number;
  metodo_provavel: string;
  metodo_provavel_rotulo: string;
  metodo_provavel_valor: number;
  justificativa: string;
  situacao_custo: string;
  situacao_prazo: string;
  premissas: string[];
}

interface RiscoProjeto {
  score: number;
  classificacao: string;
  classificacao_rotulo: string;
  cor: string;
  fatores: FatorRisco[];
  indice_confianca: number;
  resumo: string;
  evm: { CPI: number; SPI: number; situacao_custo: string; situacao_prazo: string };
  detalhes: Record<string, number>;
  premissas: string[];
}

interface RespostaPrevisao {
  projeto: { id: number; codigo: string; nome: string; cor: string; area: string };
  monte_carlo: MonteCarlo;
  regressao: Regressao;
  custo: PrevisaoCusto;
  risco_atraso: RiscoProjeto;
  premissas: string[];
}

interface PrevisaoGravada {
  id: number;
  project: number;
  project_nome: string;
  project_codigo: string;
  project_cor: string;
  data_referencia: string;
  metodo: string;
  metodo_rotulo: string;
  prazo_p10: string | null;
  prazo_p50: string | null;
  prazo_p80: string | null;
  prazo_p90: string | null;
  dias_desvio_p50: number;
  probabilidade_atraso: number;
  custo_p50: string;
  custo_p80: string;
  custo_p90: string;
  probabilidade_estouro: number;
  indice_confianca: number;
  fatores: FatorRisco[];
  premissas: string[];
  criado_por_nome: string;
  criado_em: string;
  nivel_risco: string;
  faixa_prazo_dias: number | null;
}

interface ItemRiscoLista {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  area: string;
  score: number;
  classificacao: string;
  classificacao_rotulo: string;
  cor_risco: string;
  indice_confianca: number;
  resumo: string;
  fatores: FatorRisco[];
}

interface RespostaRiscoAtraso {
  projetos: ItemRiscoLista[];
  resumo: { criticos: number; altos: number; medios: number; baixos: number };
  total: number;
  gerado_em: string;
}

interface MetricaBench {
  chave: string;
  rotulo: string;
  unidade: string;
  maior_melhor: boolean;
  minimo: number;
  p25: number;
  mediana: number;
  p75: number;
  maximo: number;
  media: number;
  amostras: number;
}

interface ProjetoBench {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  area: string;
  status: string;
  saude: string;
  programa: string;
  riscos_graves: number;
  duracao_meses: number;
  valores: Record<string, number | null>;
  percentis: Record<string, number | null>;
  indice_geral: number;
}

interface ResumoMetrica {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  valor: number | null;
  percentil: number | null;
}

interface PraticaObservada {
  titulo: string;
  detalhe: string;
  evidencia: Record<string, number>;
  icone: string;
}

interface DestaqueBench {
  projeto_id: number;
  projeto: string;
  codigo: string;
  cor: string;
  titulo: string;
  metrica: string;
  valor: number | null;
  detalhe: string;
  icone: string;
}

interface RespostaBenchmarking {
  total_projetos: number;
  metricas: Record<string, MetricaBench>;
  projetos: ProjetoBench[];
  melhores: Record<string, ResumoMetrica[]>;
  piores: Record<string, ResumoMetrica[]>;
  destaques: DestaqueBench[];
  praticas: PraticaObservada[];
  premissas: string[];
}

interface SerieTendencia {
  chave: string;
  nome: string;
  cor: string;
  unidade: string;
  maior_melhor: boolean;
  limiar_estabilidade: number;
  interpretacao: string;
  dados: Array<number | null>;
  tendencia: string;
  tendencia_rotulo: string;
  variacao: number;
  variacao_total: number;
  r2: number;
  amostras: number;
}

interface RespostaTendencias {
  meses: string[];
  rotulos: string[];
  series: SerieTendencia[];
  resumo: { melhorando: number; estaveis: number; piorando: number; projetos_analisados: number; leitura: string };
  gerado_em: string;
}

interface MesDemanda {
  mes: string;
  rotulo: string;
  demanda_fte: number;
  demanda_alocacoes_fte: number;
  demanda_sem_responsavel_fte: number;
  oferta_fte: number;
  disponivel_fte: number;
  gap: number;
  situacao: string;
}

interface RespostaDemanda {
  meses: string[];
  rotulos: string[];
  serie: MesDemanda[];
  resumo: {
    capacidade_instalada_fte: number;
    capacidade_organizacional_fte: number;
    media_demanda_fte: number;
    media_gap_fte: number;
    meses_escassez: number;
    meses_ociosos: number;
    pico: MesDemanda | null;
    meses_pico: MesDemanda[];
    tarefas_sem_responsavel: number;
    recomendacoes: string[];
  };
  premissas: string[];
  gerado_em: string;
}

interface ResumoVies {
  grupos_avaliados: number;
  registros_ok: number;
  registros_atencao: number;
  registros_criticos: number;
  grupos_criticos: number;
  grupos_em_atencao: number;
  dimensoes: Array<{ chave: string; rotulo: string }>;
  taxa_selecao_geral: number;
  score_medio_geral: number;
  taxa_override_geral: number;
  posicao_media_geral: number;
  amostra_suficiente: boolean;
  minimo_amostra_confiavel: number;
}

interface RespostaPainel {
  risco_portfolio: {
    score_medio: number;
    distribuicao: Record<string, number>;
    projetos_avaliados: number;
    projetos_em_atencao: Array<{ id: number; codigo: string; nome: string; cor: string; area: string; score: number; classificacao: string; resumo: string }>;
  };
  previsoes_recentes: PrevisaoGravada[];
  tendencias: RespostaTendencias;
  vies: { periodo: { inicio: string; fim: string; dias: number }; resumo: ResumoVies; aviso_metodologico: string };
  demanda: RespostaDemanda;
  gerado_em: string;
}

/* ==========================================================================
   Apoio de apresentação
   ========================================================================== */

const PALETA_CLASSIFICACAO: Record<string, string> = {
  BAIXO: "#10B981",
  MEDIO: "#F59E0B",
  ALTO: "#F97316",
  CRITICO: "#EF4444",
};

const TONS_CLASSIFICACAO: Record<string, Tom> = {
  BAIXO: "success",
  MEDIO: "warning",
  ALTO: "warning",
  CRITICO: "danger",
};

const TONS_TENDENCIA: Record<string, Tom> = {
  MELHORANDO: "success",
  ESTAVEL: "neutral",
  PIORANDO: "danger",
};

function iconeTendencia(tendencia: string): LucideIcon {
  if (tendencia === "MELHORANDO") return TrendingUp;
  if (tendencia === "PIORANDO") return TrendingDown;
  return Minus;
}

function iconePratica(nome: string): LucideIcon {
  if (nome === "shield-check") return ShieldAlert;
  if (nome === "activity") return Activity;
  if (nome === "calendar-check") return Clock;
  if (nome === "wallet") return Calculator;
  if (nome === "trending-up") return TrendingUp;
  if (nome === "gauge") return Gauge;
  if (nome === "rocket") return Rocket;
  return Lightbulb;
}

function formatarMetrica(unidade: string, valor?: number | null): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  if (unidade === "%") return percentual(valor, 1);
  if (unidade === "dias") return numero(valor, 0) + " d";
  if (unidade === "índice") return indice(valor, 2);
  if (unidade === "severidade") return indice(valor, 2);
  return numero(valor, 2);
}

function textoProbabilidade(valor: number): string {
  return percentual(valor * 100, 0);
}

/* ==========================================================================
   Barras divergentes (linha zero no centro)
   ========================================================================== */

function BarrasDivergentes({
  itens,
  maximo,
  rotuloNegativo,
  rotuloPositivo,
  formatar,
}: {
  itens: Array<{ rotulo: string; valor: number; cor: string; detalhe?: string }>;
  maximo: number;
  rotuloNegativo: string;
  rotuloPositivo: string;
  formatar: (v: number) => string;
}) {
  const limite = Math.abs(maximo) > 0 ? Math.abs(maximo) : 1;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-2xs text-fg-subtle">
        <span>{"← " + rotuloNegativo}</span>
        <span>{"linha zero"}</span>
        <span>{rotuloPositivo + " →"}</span>
      </div>
      {itens.map((item) => {
        const largura = Math.min(1, Math.abs(item.valor) / limite) * 50;
        return (
          <div key={item.rotulo} className="flex items-center gap-2" title={item.detalhe || item.rotulo}>
            <span className="w-28 shrink-0 truncate text-2xs text-fg-muted">{item.rotulo}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-3">
              <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" aria-hidden />
              <span
                className="absolute inset-y-0 rounded-full transition-all duration-500"
                style={
                  item.valor >= 0
                    ? { left: "50%", width: largura + "%", backgroundColor: item.cor }
                    : { right: "50%", width: largura + "%", backgroundColor: item.cor }
                }
              />
            </div>
            <span className="w-20 shrink-0 text-right text-2xs font-semibold tabular-nums" style={{ color: item.cor }}>
              {formatar(item.valor)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Lista de fatores explicáveis do risco de atraso
   ========================================================================== */

function ListaFatores({ fatores }: { fatores: FatorRisco[] }) {
  const maximo = Math.max(1, ...fatores.map((f) => f.contribuicao));
  return (
    <ul className="space-y-2">
      {fatores.map((fator) => {
        const tom: Tom =
          fator.impacto === "ALTO" ? "danger" : fator.impacto === "MEDIO" ? "warning" : fator.impacto === "BAIXO" ? "info" : "neutral";
        return (
          <li key={fator.fator} className="rounded-sgp border border-border bg-surface-2 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-fg">{fator.rotulo}</span>
              <Etiqueta tom={tom}>{fator.impacto.toLowerCase()}</Etiqueta>
              <span className="ml-auto text-2xs text-fg-muted">
                {"peso " + percentual(fator.peso * 100, 0) + " · valor " + indice(fator.valor, 2)}
              </span>
              <span className="text-xs font-bold tabular-nums text-fg">{indice(fator.contribuicao, 1) + " pts"}</span>
            </div>
            <div className="mt-1.5">
              <BarraProgresso
                valor={(fator.contribuicao / maximo) * 100}
                cor={fator.contribuicao > 0 ? (tom === "danger" ? "#EF4444" : tom === "warning" ? "#F59E0B" : "#0891B2") : "#64748B"}
                altura="sm"
              />
            </div>
            <p className="mt-1.5 text-2xs text-fg-muted">{fator.descricao}</p>
          </li>
        );
      })}
    </ul>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Analytics() {
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();

  const [aba, setAba] = useState<"previsao" | "risco" | "benchmarking" | "tendencias" | "demanda">("previsao");
  const [programa, setPrograma] = useState("");
  const [area, setArea] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [meses, setMeses] = useState<"6" | "12" | "24">("12");

  const projetoId = parametros.get("projeto") || "";

  const painel = useConsulta<RespostaPainel>(["analytics", "painel"], "/analytics/painel/");
  const projetos = useLista<ProjetoResumo>(["projetos"], "/projetos/", { ordering: "nome" });
  const programas = useLista<Programa>(["programas"], "/programas/");
  const portfolios = useLista<Portfolio>(["portfolios"], "/portfolios/");

  const previsao = useConsulta<RespostaPrevisao>(
    ["analytics", "previsao", projetoId],
    projetoId ? "/analytics/previsao/" + projetoId + "/" : null
  );
  const previsoes = useLista<PrevisaoGravada>(
    ["analytics", "previsoes"],
    projetoId ? "/analytics/previsoes/" : null,
    useMemo(() => (projetoId ? { project: projetoId } : {}), [projetoId])
  );

  const parametrosEscopo = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (programa) params.programa = programa;
    if (area) params.area = area;
    return params;
  }, [programa, area]);

  const risco = useConsulta<RespostaRiscoAtraso>(["analytics", "risco-atraso"], "/analytics/risco-atraso/", parametrosEscopo);

  const benchmarking = useConsulta<RespostaBenchmarking>(
    ["analytics", "benchmarking"],
    "/analytics/benchmarking/",
    useMemo(() => {
      const params: Record<string, unknown> = { ...parametrosEscopo };
      if (portfolio) params.portfolio = portfolio;
      return params;
    }, [parametrosEscopo, portfolio])
  );

  const tendencias = useConsulta<RespostaTendencias>(["analytics", "tendencias"], "/analytics/tendencias/", {
    meses: Number(meses),
    ...parametrosEscopo,
  });

  const demanda = useConsulta<RespostaDemanda>(["analytics", "demanda"], "/analytics/demanda-pessoas/", { meses: Number(meses) });

  const salvarPrevisao = useMutacao<{ id: number }, PrevisaoGravada>({
    url: (v) => "/analytics/previsao/" + v.id + "/",
    invalidar: [["analytics", "previsoes"], ["analytics", "painel"]],
    mensagemSucesso: (resposta) => "Previsão gravada para " + resposta.project_nome,
  });

  const listaProjetos = projetos.data || [];
  const areasDisponiveis = useMemo(() => {
    const conjunto = new Set<string>();
    listaProjetos.forEach((p) => {
      if (p.area) conjunto.add(p.area);
    });
    return Array.from(conjunto).sort();
  }, [listaProjetos]);

  const selecionarProjeto = (valor: string) => {
    const proximos = new URLSearchParams(parametros);
    if (valor) proximos.set("projeto", valor);
    else proximos.delete("projeto");
    setParametros(proximos, { replace: true });
  };

  /* ---------------------------------------------------------------- KPIs */

  const painelDados = painel.data;
  const kpis = [
    {
      rotulo: "Score médio de risco",
      valor: painelDados ? indice(painelDados.risco_portfolio.score_medio, 1) : "—",
      icone: ShieldAlert,
      cor: "#EF4444",
      subrotulo: "0 a 100 no portfólio",
    },
    {
      rotulo: "Projetos avaliados",
      valor: painelDados ? numero(painelDados.risco_portfolio.projetos_avaliados) : "—",
      icone: Layers,
      cor: "#2563EB",
      subrotulo: "no escopo atual",
    },
    {
      rotulo: "Em atenção",
      valor: painelDados
        ? numero((painelDados.risco_portfolio.distribuicao.ALTO || 0) + (painelDados.risco_portfolio.distribuicao.CRITICO || 0))
        : "—",
      icone: TriangleAlert,
      cor: "#F97316",
      subrotulo: "risco alto ou crítico",
    },
    {
      rotulo: "Séries em piora",
      valor: painelDados ? numero(painelDados.tendencias.resumo.piorando) : "—",
      icone: TrendingDown,
      cor: "#DC2626",
      subrotulo: painelDados ? "de " + numero(painelDados.tendencias.series.length) + " séries monitoradas" : "",
    },
    {
      rotulo: "Meses em escassez",
      valor: painelDados ? numero(painelDados.demanda.resumo.meses_escassez) : "—",
      icone: Users,
      cor: "#8B5CF6",
      subrotulo: painelDados ? "gap médio de " + indice(painelDados.demanda.resumo.media_gap_fte, 2) + " FTE" : "",
    },
    {
      rotulo: "Grupos críticos de viés",
      valor: painelDados ? numero(painelDados.vies.resumo.grupos_criticos) : "—",
      icone: Scale,
      cor: "#D97706",
      subrotulo: painelDados ? numero(painelDados.vies.resumo.registros_atencao) + " registro(s) em atenção" : "",
    },
  ];

  /* -------------------------------------------------- aba 1: previsão */

  const historicoColunas: Array<ColunaTabela<PrevisaoGravada>> = [
    {
      chave: "referencia",
      titulo: "Referência",
      largura: "140px",
      ordenavel: true,
      valorOrdenacao: (p) => p.data_referencia,
      renderizar: (p) => (
        <div className="min-w-0">
          <p className="text-xs text-fg">{dataCurta(p.data_referencia)}</p>
          <p className="text-2xs text-fg-subtle">{p.criado_por_nome || "sistema"}</p>
        </div>
      ),
    },
    { chave: "metodo", titulo: "Método", largura: "170px", renderizar: (p) => <Etiqueta tom="neutral">{p.metodo_rotulo}</Etiqueta> },
    {
      chave: "prazo",
      titulo: "P50 de prazo",
      largura: "130px",
      renderizar: (p) => (
        <div className="min-w-0">
          <p className="text-xs text-fg">{dataCurta(p.prazo_p50)}</p>
          <p className="text-2xs text-fg-subtle">{p.dias_desvio_p50 >= 0 ? "+" + numero(p.dias_desvio_p50) + " d" : numero(p.dias_desvio_p50) + " d"}</p>
        </div>
      ),
    },
    {
      chave: "atraso",
      titulo: "Prob. de atraso",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (p) => p.probabilidade_atraso,
      renderizar: (p) => (
        <div className="min-w-0">
          <BarraProgresso valor={p.probabilidade_atraso * 100} cor={p.probabilidade_atraso >= 0.5 ? "#DC2626" : "#D97706"} altura="sm" mostrarValor />
          <Etiqueta tom={TONS_CLASSIFICACAO[p.nivel_risco] || "neutral"} className="mt-1">{p.nivel_risco}</Etiqueta>
        </div>
      ),
    },
    {
      chave: "custo",
      titulo: "Custo final P50",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (p) => Number(p.custo_p50),
      renderizar: (p) => (
        <div className="min-w-0">
          <p className="text-xs tabular-nums text-fg">{moeda(p.custo_p50, true)}</p>
          <p className="text-2xs text-fg-subtle">{textoProbabilidade(p.probabilidade_estouro) + " de estouro"}</p>
        </div>
      ),
    },
    {
      chave: "faixa",
      titulo: "Faixa P10-P90",
      largura: "120px",
      alinhar: "right",
      renderizar: (p) => <span className="tabular-nums text-xs text-fg-muted">{p.faixa_prazo_dias !== null ? numero(p.faixa_prazo_dias) + " d" : "—"}</span>,
    },
    {
      chave: "confianca",
      titulo: "Confiança do dado",
      largura: "130px",
      alinhar: "right",
      renderizar: (p) => (
        <Etiqueta tom={p.indice_confianca >= 0.7 ? "success" : p.indice_confianca >= 0.4 ? "warning" : "danger"}>
          {percentual(p.indice_confianca * 100, 0)}
        </Etiqueta>
      ),
    },
  ];

  const previsaoDados = previsao.data;
  const mc = previsaoDados ? previsaoDados.monte_carlo : null;
  const histograma =
    mc && mc.histograma.length > 0
      ? mc.histograma.map((faixa) => ({
          rotulo: numero(faixa.inicio, 0) + "–" + numero(faixa.fim, 0),
          valor: faixa.quantidade,
          cor: "#2563EB",
        }))
      : [];

  const regressao = previsaoDados ? previsaoDados.regressao : null;
  const serieRegressao: Serie[] =
    regressao && regressao.pontos.length > 1
      ? [{ nome: "Progresso modelado", cor: "#8B5CF6", dados: regressao.pontos.map((p) => p.progresso), area: true }]
      : [];

  const custo = previsaoDados ? previsaoDados.custo : null;

  /* ---------------------------------------------- aba 2: risco de atraso */

  const riscoDados = risco.data;
  const barrasScore =
    riscoDados && riscoDados.projetos.length > 0
      ? riscoDados.projetos.map((p) => ({
          rotulo: p.codigo,
          valor: p.score,
          cor: p.cor_risco || PALETA_CLASSIFICACAO[p.classificacao] || "#2563EB",
        }))
      : [];

  const kpisRisco = [
    { rotulo: "Críticos", valor: numero(riscoDados ? riscoDados.resumo.criticos : 0), icone: ShieldAlert, cor: "#EF4444" },
    { rotulo: "Altos", valor: numero(riscoDados ? riscoDados.resumo.altos : 0), icone: TriangleAlert, cor: "#F97316" },
    { rotulo: "Médios", valor: numero(riscoDados ? riscoDados.resumo.medios : 0), icone: Activity, cor: "#F59E0B" },
    { rotulo: "Baixos", valor: numero(riscoDados ? riscoDados.resumo.baixos : 0), icone: CircleCheck, cor: "#10B981" },
    { rotulo: "Projetos avaliados", valor: numero(riscoDados ? riscoDados.total : 0), icone: Layers, cor: "#2563EB" },
    {
      rotulo: "Score médio",
      valor: riscoDados && riscoDados.projetos.length > 0 ? indice(riscoDados.projetos.reduce((t, p) => t + p.score, 0) / riscoDados.projetos.length, 1) : "—",
      icone: Gauge,
      cor: "#8B5CF6",
    },
  ];

  /* ------------------------------------------------ aba 3: benchmarking */

  const bench = benchmarking.data;
  const metricasBench = useMemo(() => {
    if (!bench) return [] as MetricaBench[];
    return Object.keys(bench.metricas).map((chave) => bench.metricas[chave]);
  }, [bench]);

  const linhasQuartis = metricasBench.map((metrica) => ({
    id: metrica.chave,
    metrica,
  }));

  const colunasQuartis: Array<ColunaTabela<{ id: string; metrica: MetricaBench }>> = [
    {
      chave: "metrica",
      titulo: "Métrica",
      largura: "230px",
      renderizar: (l) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg">{l.metrica.rotulo}</p>
          <p className="text-2xs text-fg-subtle">
            {l.metrica.unidade + " · " + (l.metrica.maior_melhor ? "maior é melhor" : "menor é melhor") + " · " + numero(l.metrica.amostras) + " projeto(s)"}
          </p>
        </div>
      ),
    },
    { chave: "minimo", titulo: "Mínimo", largura: "100px", alinhar: "right", renderizar: (l) => <span className="tabular-nums text-xs">{formatarMetrica(l.metrica.unidade, l.metrica.minimo)}</span> },
    { chave: "p25", titulo: "P25", largura: "100px", alinhar: "right", renderizar: (l) => <span className="tabular-nums text-xs">{formatarMetrica(l.metrica.unidade, l.metrica.p25)}</span> },
    {
      chave: "mediana",
      titulo: "Mediana",
      largura: "110px",
      alinhar: "right",
      renderizar: (l) => <span className="tabular-nums text-xs font-semibold text-fg">{formatarMetrica(l.metrica.unidade, l.metrica.mediana)}</span>,
    },
    { chave: "p75", titulo: "P75", largura: "100px", alinhar: "right", renderizar: (l) => <span className="tabular-nums text-xs">{formatarMetrica(l.metrica.unidade, l.metrica.p75)}</span> },
    { chave: "maximo", titulo: "Máximo", largura: "100px", alinhar: "right", renderizar: (l) => <span className="tabular-nums text-xs">{formatarMetrica(l.metrica.unidade, l.metrica.maximo)}</span> },
    {
      chave: "media",
      titulo: "Média",
      largura: "110px",
      alinhar: "right",
      renderizar: (l) => <span className="tabular-nums text-xs text-fg-muted">{formatarMetrica(l.metrica.unidade, l.metrica.media)}</span>,
    },
  ];

  const colunasProjetosBench: Array<ColunaTabela<ProjetoBench>> = [
    {
      chave: "projeto",
      titulo: "Projeto",
      largura: "240px",
      ordenavel: true,
      valorOrdenacao: (p) => p.nome,
      renderizar: (p) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.cor }} aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-fg">{p.nome}</p>
            <p className="truncate text-2xs text-fg-subtle">{p.codigo + (p.programa ? " · " + p.programa : "")}</p>
          </div>
        </div>
      ),
    },
    ...metricasBench.map((metrica) => ({
      chave: metrica.chave,
      titulo: metrica.rotulo,
      largura: "150px",
      alinhar: "right" as const,
      renderizar: (p: ProjetoBench) => {
        const valor = p.valores[metrica.chave];
        const percentil = p.percentis[metrica.chave];
        return (
          <div className="min-w-0 text-right">
            <p className="tabular-nums text-xs text-fg">{formatarMetrica(metrica.unidade, valor)}</p>
            <p className="text-2xs" style={{ color: percentil === null || percentil === undefined ? undefined : corPorValor(percentil / 100) }}>
              {percentil === null || percentil === undefined ? "sem percentil" : numero(percentil, 0) + "º percentil"}
            </p>
          </div>
        );
      },
    })),
    {
      chave: "indice",
      titulo: "Índice geral",
      largura: "130px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.indice_geral,
      renderizar: (p) => (
        <div className="min-w-0">
          <p className="tabular-nums text-xs font-semibold text-fg">{numero(p.indice_geral, 1)}</p>
          <BarraProgresso valor={p.indice_geral} cor={corPorValor(p.indice_geral / 100)} altura="sm" />
        </div>
      ),
    },
  ];

  const linhasHeatmap = (bench ? bench.projetos : []).map((p) => ({ id: p.id, rotulo: p.nome, sub: p.codigo, cor: p.cor }));
  const colunasHeatmap = metricasBench.map((m) => ({ id: m.chave, rotulo: m.rotulo, sub: m.unidade }));
  const celulasHeatmap = (linhaId: string | number, colunaId: string | number): CelulaHeatmap | undefined => {
    const projeto = bench ? bench.projetos.find((p) => p.id === Number(linhaId)) : undefined;
    const metrica = metricasBench.find((m) => m.chave === String(colunaId));
    if (!projeto || !metrica) return undefined;
    const percentil = projeto.percentis[metrica.chave];
    const valor = projeto.valores[metrica.chave];
    if (percentil === null || percentil === undefined) return { valor: 0, rotulo: "sem dados", detalhe: <span>Sem medição para este projeto.</span> };
    return {
      valor: percentil,
      rotulo: numero(percentil, 0) + "º percentil",
      detalhe: (
        <div className="space-y-0.5">
          <p className="font-semibold text-fg">{projeto.nome}</p>
          <p className="text-fg-muted">{metrica.rotulo + ": " + formatarMetrica(metrica.unidade, valor)}</p>
          <p className="text-fg-muted">{"Posição: " + numero(percentil, 0) + "º percentil de desempenho"}</p>
        </div>
      ),
    };
  };

  /* -------------------------------------------------- aba 4: tendências */

  const tend = tendencias.data;
  const rotulosTend = tend ? tend.rotulos : [];
  const seriesTend: Serie[] = (tend ? tend.series : []).map((s) => ({
    nome: s.nome,
    cor: s.cor,
    dados: s.dados.map((valor) => (valor === null ? 0 : valor)),
  }));

  /* ---------------------------------------------------- aba 5: demanda */

  const dem = demanda.data;
  const seriesDemanda: Serie[] = dem
    ? [
        { nome: "Demanda projetada (FTE)", cor: "#2563EB", dados: dem.serie.map((m) => m.demanda_fte), area: true },
        { nome: "Capacidade instalada (FTE)", cor: "#059669", dados: dem.serie.map((m) => m.oferta_fte), tracejada: true },
      ]
    : [];
  const barrasGap = dem
    ? dem.serie.map((m) => ({
        rotulo: m.rotulo,
        valor: m.gap,
        cor: m.gap > 0.5 ? "#DC2626" : m.gap < -1 ? "#2563EB" : "#64748B",
        detalhe: m.rotulo + ": demanda " + indice(m.demanda_fte, 2) + " FTE contra oferta " + indice(m.oferta_fte, 2) + " FTE",
      }))
    : [];
  const maximoGap = dem ? Math.max(1, ...dem.serie.map((m) => Math.abs(m.gap))) : 1;

  const kpisDemanda = [
    { rotulo: "Capacidade instalada", valor: dem ? indice(dem.resumo.capacidade_instalada_fte, 2) + " FTE" : "—", icone: Users, cor: "#059669" },
    { rotulo: "Capacidade da organização", valor: dem ? indice(dem.resumo.capacidade_organizacional_fte, 2) + " FTE" : "—", icone: Boxes, cor: "#0891B2" },
    { rotulo: "Demanda média", valor: dem ? indice(dem.resumo.media_demanda_fte, 2) + " FTE" : "—", icone: Target, cor: "#2563EB" },
    { rotulo: "Gap médio", valor: dem ? indice(dem.resumo.media_gap_fte, 2) + " FTE" : "—", icone: Scale, cor: dem && dem.resumo.media_gap_fte > 0 ? "#DC2626" : "#64748B" },
    { rotulo: "Meses em escassez", valor: dem ? numero(dem.resumo.meses_escassez) : "—", icone: TriangleAlert, cor: "#EF4444" },
    { rotulo: "Meses ociosos", valor: dem ? numero(dem.resumo.meses_ociosos) : "—", icone: Hourglass, cor: "#2563EB" },
  ];

  /* ---------------------------------------------------------- renderização */

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Analytics e IA preditiva"
        subtitulo="Previsão de prazo e custo, risco explicável de atraso, benchmarking, tendências e demanda de pessoas"
        icone={ChartLine}
        cor="#8B5CF6"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" icone={Compass} onClick={() => navegar("/matching")}>
              Motor de alocação
            </Botao>
            <Botao variante="secundario" icone={Scale} onClick={() => navegar("/auditoria-vies")}>
              Auditoria de viés
            </Botao>
          </div>
        }
      />

      {painel.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o painel analítico">
          {mensagemErro(painel.error)}
        </Alerta>
      )}

      {painel.isLoading ? <Esqueleto linhas={2} className="rounded-sgp-lg border border-border bg-surface p-4" /> : <LinhaKPI itens={kpis} />}

      <Abas
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: "previsao", rotulo: "Previsão do projeto", icone: WandSparkles },
          { valor: "risco", rotulo: "Risco de atraso", icone: ShieldAlert, contagem: riscoDados ? riscoDados.resumo.criticos + riscoDados.resumo.altos : undefined },
          { valor: "benchmarking", rotulo: "Benchmarking", icone: ChartColumn, contagem: bench ? bench.total_projetos : undefined },
          { valor: "tendencias", rotulo: "Tendências", icone: TrendingUp },
          { valor: "demanda", rotulo: "Demanda de pessoas", icone: Users },
        ]}
      />

      {/* ================================================== aba 1: previsão */}

      {aba === "previsao" && (
        <div className="space-y-3">
          <BarraFerramentas>
            <label className="inline-flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Projeto</span>
              <Selecao
                value={projetoId}
                onChange={(e) => selecionarProjeto(e.target.value)}
                className="h-8 w-72 py-0 text-xs"
                aria-label="Selecionar projeto para a previsão"
              >
                <option value="">Selecione um projeto</option>
                {listaProjetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo + " · " + p.nome}
                  </option>
                ))}
              </Selecao>
            </label>
            {projetoId && (
              <Botao
                tamanho="sm"
                variante="primario"
                icone={WandSparkles}
                carregando={salvarPrevisao.isPending}
                onClick={() => salvarPrevisao.mutate({ id: Number(projetoId) })}
              >
                Salvar previsão
              </Botao>
            )}
            <span className="ml-auto text-2xs text-fg-muted">
              {mc ? numero(mc.iteracoes) + " iterações · " + numero(mc.tarefas_consideradas) + " tarefa(s) em aberto simuladas" : ""}
            </span>
          </BarraFerramentas>

          {!projetoId && (
            <Vazio
              icone={WandSparkles}
              titulo="Escolha um projeto para prever"
              descricao="A previsão combina simulação de Monte Carlo, regressão de progresso e valor agregado para estimar prazo e custo final com intervalo de confiança."
            />
          )}

          {previsao.isError && (
            <Alerta tom="danger" titulo="Não foi possível calcular a previsão">
              {mensagemErro(previsao.error)}
            </Alerta>
          )}

          {previsao.isLoading && projetoId && <CarregandoBloco rotulo="Rodando a simulação e a regressão..." />}

          {previsaoDados && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="size-3 rounded-sm" style={{ backgroundColor: previsaoDados.projeto.cor }} aria-hidden />
                <p className="text-sm font-semibold text-fg">{previsaoDados.projeto.nome}</p>
                <Etiqueta tom="neutral">{previsaoDados.projeto.codigo}</Etiqueta>
                {previsaoDados.projeto.area && <Etiqueta tom="info">{previsaoDados.projeto.area}</Etiqueta>}
                <Etiqueta tom={TONS_CLASSIFICACAO[previsaoDados.risco_atraso.classificacao] || "neutral"} icone={ShieldAlert}>
                  {"risco " + previsaoDados.risco_atraso.classificacao_rotulo.toLowerCase() + " · " + indice(previsaoDados.risco_atraso.score, 1) + " pts"}
                </Etiqueta>
              </div>

              <Cartao
                titulo="Simulação de Monte Carlo"
                subtitulo={mc ? numero(mc.iteracoes) + " cenários · referência de " + dataCurta(mc.data_referencia) : ""}
                icone={FlaskConical}
                corIcone="#2563EB"
                acao={
                  mc ? (
                    <Etiqueta tom={mc.indice_confianca >= 0.7 ? "success" : mc.indice_confianca >= 0.4 ? "warning" : "danger"}>
                      {"confiança do dado " + percentual(mc.indice_confianca * 100, 0)}
                    </Etiqueta>
                  ) : null
                }
              >
                {!mc ? (
                  <Vazio icone={FlaskConical} titulo="Sem simulação" descricao="A API não devolveu o resultado de Monte Carlo." />
                ) : !mc.disponivel ? (
                  <Alerta tom="warning" titulo="Simulação indisponível" icone={FlaskConical}>
                    {mc.motivo || "O projeto não possui dados suficientes para simular prazo e custo."}
                  </Alerta>
                ) : (
                  <div className="space-y-4">
                    <Alerta tom="info" titulo="O que esta simulação faz" icone={Lightbulb}>
                      Rodamos {numero(mc.iteracoes)} cenários. Em cada um, sorteamos uma duração possível para cada uma das{" "}
                      {numero(mc.tarefas_consideradas)} tarefas em aberto — entre 70% (otimista) e 160% (pessimista) do esforço
                      restante — somamos as durações respeitando as dependências e, no fim, olhamos a distribuição dos prazos e
                      custos resultantes. O P50 é o cenário do meio; o P90 é o cenário pessimista que só é superado em 10% das vezes.
                      {mc.vies_calibrado !== 0 && " As estimativas já foram corrigidas por um viés histórico de " + percentual(mc.vies_calibrado * 100, 1) + "."}
                      {mc.amostragem_aplicada && " Por performance, foram usadas as maiores tarefas por esforço."}
                    </Alerta>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-xs font-semibold text-fg">Prazo projetado</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { rotulo: "P10 otimista", valor: mc.prazo.p10, dias: mc.prazo.dias_p10, cor: "#10B981" },
                            { rotulo: "P50 provável", valor: mc.prazo.p50, dias: mc.prazo.dias_p50, cor: "#2563EB" },
                            { rotulo: "P80", valor: mc.prazo.p80, dias: mc.prazo.dias_p80, cor: "#F59E0B" },
                            { rotulo: "P90 pessimista", valor: mc.prazo.p90, dias: mc.prazo.dias_p90, cor: "#EF4444" },
                          ].map((item) => (
                            <div key={item.rotulo} className="rounded-md border border-border bg-surface p-2">
                              <p className="text-2xs text-fg-subtle">{item.rotulo}</p>
                              <p className="mt-0.5 text-xs font-semibold tabular-nums" style={{ color: item.cor }}>
                                {dataCurta(item.valor)}
                              </p>
                              <p className="text-2xs text-fg-muted">{item.dias !== null ? numero(item.dias) + " dias" : "—"}</p>
                            </div>
                          ))}
                        </div>
                        {mc.prazo.data_planejada && (
                          <p className="mt-2 text-2xs text-fg-muted">
                            {"Prazo planejado: " + dataCurta(mc.prazo.data_planejada)}
                            {mc.prazo.desvio_p50_dias !== null &&
                              " · desvio do P50: " + (mc.prazo.desvio_p50_dias >= 0 ? "+" : "") + numero(mc.prazo.desvio_p50_dias) + " dia(s)"}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          <AnelProgresso
                            valor={mc.probabilidade_atraso * 100}
                            tamanho={104}
                            espessura={10}
                            cor={mc.probabilidade_atraso >= 0.5 ? "#DC2626" : mc.probabilidade_atraso >= 0.25 ? "#D97706" : "#059669"}
                            rotulo={textoProbabilidade(mc.probabilidade_atraso)}
                            subrotulo="prob. de atraso"
                          />
                          <div className="min-w-40 flex-1 space-y-2">
                            <BarraProgresso
                              valor={mc.probabilidade_atraso * 100}
                              cor={mc.probabilidade_atraso >= 0.5 ? "#DC2626" : "#D97706"}
                              rotulo="Probabilidade de atraso"
                              mostrarValor
                            />
                            <BarraProgresso
                              valor={mc.probabilidade_estouro * 100}
                              cor={mc.probabilidade_estouro >= 0.5 ? "#DC2626" : "#D97706"}
                              rotulo="Probabilidade de estouro de orçamento"
                              mostrarValor
                            />
                            <p className="text-2xs text-fg-muted">
                              {"Duração média simulada de " + numero(mc.prazo.media_dias, 1) + " dias, entre " + numero(mc.prazo.otimista_dias) + " e " + numero(mc.prazo.pessimista_dias) + " dias nos cenários extremos."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-xs font-semibold text-fg">Custo projetado</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { rotulo: "P10", valor: mc.custo.p10 },
                            { rotulo: "P50 provável", valor: mc.custo.p50 },
                            { rotulo: "P80", valor: mc.custo.p80 },
                            { rotulo: "P90 pessimista", valor: mc.custo.p90 },
                          ].map((item) => (
                            <div key={item.rotulo} className="rounded-md border border-border bg-surface p-2">
                              <p className="text-2xs text-fg-subtle">{item.rotulo}</p>
                              <p className="mt-0.5 text-xs font-semibold tabular-nums text-fg">{moeda(item.valor, true)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 space-y-1 text-2xs text-fg-muted">
                          <p>{"BAC (orçamento aprovado): " + moeda(mc.custo.BAC)}</p>
                          <p>{"AC (custo realizado): " + moeda(mc.custo.AC)}</p>
                          <p>{"Custo médio simulado: " + moeda(mc.custo.media)}</p>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-fg">Distribuição dos prazos simulados</p>
                          <p className="text-2xs text-fg-subtle">Frequência de cenários por faixa de dias até a conclusão.</p>
                          <div className="mt-2">
                            <GraficoBarras
                              itens={histograma}
                              altura={190}
                              formatarValor={(v) => numero(v) + " cenário(s)"}
                              larguraBarra={4}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Cartao>

              <Cartao titulo="Regressão de progresso" subtitulo="Projeção da data de conclusão pela velocidade observada" icone={ChartLine} corIcone="#8B5CF6">
                {!regressao ? (
                  <Vazio icone={ChartLine} titulo="Sem regressão" descricao="A API não devolveu o resultado da regressão." />
                ) : !regressao.disponivel ? (
                  <div className="space-y-2">
                    <Alerta tom="warning" titulo="Regressão indisponível" icone={TriangleAlert}>
                      {regressao.motivo || "Não há série histórica suficiente para ajustar a regressão."}
                    </Alerta>
                    {regressao.pontos.length > 0 && (
                      <GraficoLinha
                        rotulos={regressao.pontos.map((p) => dataCurta(p.data))}
                        series={serieRegressao}
                        altura={200}
                        formatarValor={(v) => percentual(v, 1)}
                        mostrarArea
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-2xs text-fg-subtle">Conclusão projetada</p>
                        <p className="mt-0.5 text-lg font-bold text-fg">{dataCurta(regressao.data_projetada_conclusao)}</p>
                        <p className="mt-0.5 text-2xs text-fg-muted">{"Prazo planejado: " + dataCurta(regressao.data_fim_planejada)}</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-2xs text-fg-subtle">Desvio previsto</p>
                        <p
                          className="mt-0.5 text-lg font-bold"
                          style={{ color: (regressao.desvio_dias || 0) > 0 ? "#DC2626" : "#059669" }}
                        >
                          {(regressao.desvio_dias || 0) > 0 ? "+" : ""}
                          {numero(regressao.desvio_dias)} dia(s)
                        </p>
                        <p className="mt-0.5 text-2xs text-fg-muted">
                          {regressao.atraso_previsto ? "tendência de atraso" : "dentro ou antes do prazo"}
                        </p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-2xs text-fg-subtle">Qualidade do ajuste (R²)</p>
                        <p className="mt-0.5 text-lg font-bold text-fg">{indice(regressao.r2, 3)}</p>
                        <Etiqueta tom={regressao.qualidade_ajuste === "ALTA" ? "success" : regressao.qualidade_ajuste === "MEDIA" ? "warning" : "danger"}>
                          {"ajuste " + (regressao.qualidade_ajuste || "—").toLowerCase()}
                        </Etiqueta>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <p className="text-2xs text-fg-subtle">Velocidade observada</p>
                        <p className="mt-0.5 text-xs font-semibold tabular-nums text-fg">{indice(regressao.inclinacao_semana, 2) + " p.p./semana"}</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <p className="text-2xs text-fg-subtle">Progresso modelado</p>
                        <p className="mt-0.5 text-xs font-semibold tabular-nums text-fg">{percentual(regressao.progresso_modelado, 1)}</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <p className="text-2xs text-fg-subtle">Progresso informado</p>
                        <p className="mt-0.5 text-xs font-semibold tabular-nums text-fg">{percentual(regressao.progresso_informado, 1)}</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <p className="text-2xs text-fg-subtle">Progresso planejado</p>
                        <p className="mt-0.5 text-xs font-semibold tabular-nums text-fg">{percentual(regressao.progresso_planejado, 1)}</p>
                      </div>
                    </div>

                    <GraficoLinha
                      rotulos={regressao.pontos.map((p) => dataCurta(p.data))}
                      series={serieRegressao}
                      altura={220}
                      formatarValor={(v) => percentual(v, 1)}
                      mostrarArea
                    />

                    <ul className="space-y-1 text-2xs text-fg-muted">
                      {regressao.premissas.map((premissa) => (
                        <li key={premissa} className="flex items-start gap-1.5">
                          <CircleCheck className="mt-0.5 size-3 shrink-0 text-brand" aria-hidden />
                          {premissa}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Cartao>

              <Cartao
                titulo="Custo final estimado (EAC)"
                subtitulo="Três métodos lado a lado para mostrar a sensibilidade da projeção"
                icone={Calculator}
                corIcone="#059669"
              >
                {!custo ? (
                  <Vazio icone={Calculator} titulo="Sem previsão de custo" descricao="A API não devolveu os métodos de EAC." />
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {custo.metodos.map((metodo) => {
                        const provavel = metodo.chave === custo.metodo_provavel;
                        return (
                          <div
                            key={metodo.chave}
                            className={cn(
                              "rounded-sgp border p-3",
                              provavel ? "border-brand bg-brand-soft/20" : "border-border bg-surface-2"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-fg">{metodo.rotulo}</p>
                              {provavel && <Etiqueta tom="brand" icone={BadgeCheck}>mais provável</Etiqueta>}
                            </div>
                            <p className="mt-1 font-mono text-2xs text-fg-muted">{metodo.formula}</p>
                            <p className="mt-1.5 text-lg font-bold tabular-nums text-fg">{moeda(metodo.valor)}</p>
                            <p className="text-2xs" style={{ color: metodo.variacao_vs_bac > 0 ? "#DC2626" : "#059669" }}>
                              {(metodo.variacao_vs_bac > 0 ? "+" : "") + moeda(metodo.variacao_vs_bac) + " (" + percentual(metodo.percentual_vs_bac, 1) + " sobre o BAC)"}
                            </p>
                            <p className="mt-1.5 text-2xs text-fg-muted">{metodo.descricao}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-2xs text-fg-subtle">Média dos métodos</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{moeda(custo.media, true)}</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-2xs text-fg-subtle">Intervalo (mínimo → máximo)</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{moeda(custo.minimo, true) + " → " + moeda(custo.maximo, true)}</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-2xs text-fg-subtle">Amplitude da incerteza</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{moeda(custo.amplitude, true) + " (" + percentual(custo.amplitude_percentual, 1) + ")"}</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-2xs text-fg-subtle">Contexto EVM</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{"CPI " + indice(custo.CPI, 3)}</p>
                        <p className="text-2xs text-fg-muted">{"SPI " + indice(custo.SPI, 3) + " · " + custo.situacao_custo + " · " + custo.situacao_prazo}</p>
                      </div>
                    </div>

                    <Alerta tom="brand" titulo={"Método considerado mais provável: " + custo.metodo_provavel_rotulo} icone={Target}>
                      {custo.justificativa + " Valor projetado de " + moeda(custo.metodo_provavel_valor) + "."}
                    </Alerta>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-xs font-semibold text-fg">Comparação entre os métodos</p>
                        <div className="mt-2">
                          <GraficoBarras
                            itens={custo.metodos.map((m) => ({ rotulo: m.rotulo, valor: m.valor, cor: m.chave === custo.metodo_provavel ? "#2563EB" : "#94A3B8", meta: custo.BAC }))}
                            altura={180}
                            formatarValor={(v) => moeda(v, true)}
                          />
                        </div>
                        <p className="mt-1 text-2xs text-fg-subtle">A linha tracejada marca o BAC (orçamento aprovado).</p>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-3">
                        <p className="text-xs font-semibold text-fg">Premissas do cálculo de custo</p>
                        <ul className="mt-1.5 space-y-1 text-2xs text-fg-muted">
                          {custo.premissas.map((premissa) => (
                            <li key={premissa} className="flex items-start gap-1.5">
                              <CircleCheck className="mt-0.5 size-3 shrink-0 text-brand" aria-hidden />
                              {premissa}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </Cartao>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Cartao titulo="Risco de atraso do projeto" subtitulo="Fatores ponderados e explicáveis" icone={ShieldAlert} corIcone="#EF4444">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <AnelProgresso
                        valor={previsaoDados.risco_atraso.score}
                        tamanho={104}
                        espessura={10}
                        cor={previsaoDados.risco_atraso.cor}
                        rotulo={indice(previsaoDados.risco_atraso.score, 1)}
                        subrotulo="score 0–100"
                      />
                      <div className="min-w-40 flex-1">
                        <Etiqueta tom={TONS_CLASSIFICACAO[previsaoDados.risco_atraso.classificacao] || "neutral"}>
                          {previsaoDados.risco_atraso.classificacao_rotulo}
                        </Etiqueta>
                        <p className="mt-1.5 text-2xs text-fg-muted">{previsaoDados.risco_atraso.resumo}</p>
                        <p className="mt-1 text-2xs text-fg-subtle">
                          {"Confiança do dado de entrada: " + percentual(previsaoDados.risco_atraso.indice_confianca * 100, 0)}
                        </p>
                      </div>
                    </div>
                    <ListaFatores fatores={previsaoDados.risco_atraso.fatores} />
                  </div>
                </Cartao>

                <Cartao titulo="Premissas da previsão" subtitulo="Consolidadas por Monte Carlo, regressão, custo e risco" icone={Lightbulb} corIcone="#D97706">
                  <ul className="space-y-1.5 text-2xs text-fg-muted">
                    {previsaoDados.premissas.map((premissa) => (
                      <li key={premissa} className="flex items-start gap-1.5">
                        <CircleCheck className="mt-0.5 size-3 shrink-0 text-brand" aria-hidden />
                        {premissa}
                      </li>
                    ))}
                  </ul>
                </Cartao>
              </div>

              <SecaoColapsavel titulo="Previsões gravadas deste projeto" icone={Clock} abertoInicial contagem={previsoes.data ? previsoes.data.length : 0}>
                <div className="space-y-2">
                  <p className="text-2xs text-fg-muted">
                    Cada vez que você salva uma previsão, o resultado é gravado com data de referência, método e fatores. Isso
                    permite comparar o que o sistema previa com o que de fato aconteceu.
                  </p>
                  {previsoes.isLoading ? (
                    <Esqueleto linhas={3} />
                  ) : (
                    <Tabela
                      colunas={historicoColunas}
                      dados={previsoes.data || []}
                      compacta
                      vazio={<Vazio icone={Clock} titulo="Nenhuma previsão gravada" descricao="Use o botão Salvar previsão para registrar o cenário atual." />}
                    />
                  )}
                </div>
              </SecaoColapsavel>
            </div>
          )}

          {!projetoId && painelDados && painelDados.previsoes_recentes.length > 0 && (
            <SecaoColapsavel titulo="Previsões recentes do portfólio" icone={Clock} abertoInicial={false} contagem={painelDados.previsoes_recentes.length}>
              <Tabela
                colunas={historicoColunas.filter((c) => c.chave !== "confianca")}
                dados={painelDados.previsoes_recentes}
                compacta
                vazio={<Vazio icone={Clock} titulo="Nenhuma previsão recente" />}
              />
            </SecaoColapsavel>
          )}
        </div>
      )}

      {/* ============================================== aba 2: risco de atraso */}

      {aba === "risco" && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Como o score é calculado" icone={Lightbulb}>
            Cada fator é normalizado entre 0 e 1, multiplicado pelo seu peso (a soma dos pesos é 1,00) e convertido em pontos.
            O score final é a soma das contribuições, limitada a 100: até 24 é risco baixo, 25 a 49 médio, 50 a 74 alto e 75 a
            100 crítico. A lista de fatores de cada projeto mostra exatamente o que puxou o score para cima.
          </Alerta>

          <BarraFerramentas>
            <FiltroSelect
              rotulo="Programa"
              valor={programa}
              onChange={setPrograma}
              opcoes={(programas.data || []).map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
            />
            <FiltroSelect rotulo="Área" valor={area} onChange={setArea} opcoes={areasDisponiveis.map((a) => ({ valor: a, rotulo: a }))} />
            <span className="ml-auto text-2xs text-fg-muted">{numero(riscoDados ? riscoDados.total : 0) + " projeto(s) no escopo"}</span>
          </BarraFerramentas>

          <LinhaKPI itens={kpisRisco} />

          {risco.isError && (
            <Alerta tom="danger" titulo="Não foi possível calcular o risco de atraso">
              {mensagemErro(risco.error)}
            </Alerta>
          )}

          {risco.isLoading ? (
            <CarregandoBloco rotulo="Calculando o score de cada projeto..." />
          ) : !riscoDados || riscoDados.projetos.length === 0 ? (
            <Vazio
              icone={ShieldAlert}
              titulo="Nenhum projeto no escopo"
              descricao="Ajuste os filtros de programa e área para avaliar o risco de atraso dos projetos ativos."
            />
          ) : (
            <div className="space-y-3">
              <Cartao titulo="Score de risco por projeto" subtitulo="Cor conforme a classificação: baixo, médio, alto ou crítico" icone={ChartColumn} corIcone="#F97316">
                <GraficoBarras itens={barrasScore} altura={240} formatarValor={(v) => indice(v, 1) + " pts"} mostrarEixo />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {["BAIXO", "MEDIO", "ALTO", "CRITICO"].map((chave) => (
                    <Chip key={chave} cor={PALETA_CLASSIFICACAO[chave]}>
                      {chave.toLowerCase() + ": " + numero(riscoDados.resumo[chave === "BAIXO" ? "baixos" : chave === "MEDIO" ? "medios" : chave === "ALTO" ? "altos" : "criticos"])}
                    </Chip>
                  ))}
                </div>
              </Cartao>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {riscoDados.projetos.map((projeto) => (
                  <div
                    key={projeto.id}
                    className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 transition-all hover:-translate-y-0.5 hover:shadow-n2"
                  >
                    <div className="flex items-start gap-3">
                      <AnelProgresso
                        valor={projeto.score}
                        tamanho={84}
                        espessura={9}
                        cor={projeto.cor_risco || PALETA_CLASSIFICACAO[projeto.classificacao]}
                        rotulo={indice(projeto.score, 1)}
                        subrotulo="score"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: projeto.cor }} aria-hidden />
                          <button
                            type="button"
                            onClick={() => navegar("/projetos/" + projeto.id)}
                            className="truncate text-sm font-semibold text-fg hover:text-brand hover:underline"
                            title="Abrir o projeto"
                          >
                            {projeto.nome}
                          </button>
                          <Etiqueta tom={TONS_CLASSIFICACAO[projeto.classificacao] || "neutral"} icone={ShieldAlert}>
                            {projeto.classificacao_rotulo}
                          </Etiqueta>
                        </div>
                        <p className="mt-0.5 text-2xs text-fg-subtle">
                          {projeto.codigo + (projeto.area ? " · " + projeto.area : "") + " · confiança do dado " + percentual(projeto.indice_confianca * 100, 0)}
                        </p>
                        <p className="mt-1 text-2xs text-fg-muted">{projeto.resumo}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-semibold text-fg">Por que este score</p>
                      <div className="mt-1.5">
                        <ListaFatores fatores={projeto.fatores} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <span className="text-2xs text-fg-subtle">Clique para abrir o projeto e agir sobre as causas.</span>
                      <Botao tamanho="xs" variante="secundario" iconeDireita={ArrowUpRight} onClick={() => navegar("/projetos/" + projeto.id)}>
                        Abrir projeto
                      </Botao>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =============================================== aba 3: benchmarking */}

      {aba === "benchmarking" && (
        <div className="space-y-3">
          <BarraFerramentas>
            <FiltroSelect
              rotulo="Programa"
              valor={programa}
              onChange={setPrograma}
              opcoes={(programas.data || []).map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
            />
            <FiltroSelect rotulo="Área" valor={area} onChange={setArea} opcoes={areasDisponiveis.map((a) => ({ valor: a, rotulo: a }))} />
            <FiltroSelect
              rotulo="Portfólio"
              valor={portfolio}
              onChange={setPortfolio}
              opcoes={(portfolios.data || []).map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
            />
            <span className="ml-auto text-2xs text-fg-muted">{numero(bench ? bench.total_projetos : 0) + " projeto(s) comparados"}</span>
          </BarraFerramentas>

          {benchmarking.isError && (
            <Alerta tom="danger" titulo="Não foi possível montar o benchmarking">
              {mensagemErro(benchmarking.error)}
            </Alerta>
          )}

          {benchmarking.isLoading ? (
            <CarregandoBloco rotulo="Comparando os projetos do escopo..." />
          ) : !bench || bench.projetos.length === 0 ? (
            <Vazio
              icone={ChartColumn}
              titulo="Sem projetos para comparar"
              descricao="Ajuste os filtros de programa, área ou portfólio para incluir projetos no comparativo."
            />
          ) : (
            <div className="space-y-3">
              {bench.destaques.length > 0 && (
                <GradeCards colunas={3}>
                  {bench.destaques.map((destaque) => {
                    const Icone = iconePratica(destaque.icone);
                    return (
                      <div key={destaque.titulo + destaque.projeto_id} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="grid size-9 shrink-0 place-items-center rounded-sgp-lg" style={{ backgroundColor: comAlfa(destaque.cor, 0.12), color: destaque.cor }}>
                            <Icone className="size-4.5" aria-hidden />
                          </span>
                          <Etiqueta tom="success" icone={BadgeCheck}>referência</Etiqueta>
                        </div>
                        <p className="mt-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">{destaque.titulo}</p>
                        <button
                          type="button"
                          onClick={() => navegar("/projetos/" + destaque.projeto_id)}
                          className="mt-0.5 block truncate text-sm font-semibold text-fg hover:text-brand hover:underline"
                        >
                          {destaque.projeto}
                        </button>
                        <p className="mt-1 text-2xs text-fg-muted">{destaque.detalhe}</p>
                      </div>
                    );
                  })}
                </GradeCards>
              )}

              <Cartao titulo="Distribuição das métricas" subtitulo="Mínimo, quartis, mediana e máximo do conjunto comparado" icone={Sigma} corIcone="#2563EB">
                <Tabela colunas={colunasQuartis} dados={linhasQuartis} compacta vazio={<Vazio icone={Sigma} titulo="Sem métricas calculadas" />} />
              </Cartao>

              <Cartao
                titulo="Posição de cada projeto"
                subtitulo="Valor medido e percentil de desempenho (100 é o melhor do conjunto)"
                icone={Layers}
                corIcone="#8B5CF6"
              >
                <Tabela
                  colunas={colunasProjetosBench}
                  dados={bench.projetos}
                  compacta
                  aoClicarLinha={(p) => navegar("/projetos/" + p.id)}
                  vazio={<Vazio icone={Layers} titulo="Sem projetos" />}
                />
              </Cartao>

              <Cartao titulo="Mapa de calor de desempenho" subtitulo="Percentil de cada projeto em cada métrica" icone={ChartColumn} corIcone="#0891B2">
                <Heatmap
                  linhas={linhasHeatmap}
                  colunas={colunasHeatmap}
                  celulas={celulasHeatmap}
                  maximo={100}
                  formatoValor={(v) => (v ? numero(v, 0) : "—")}
                  corDe={(v) => corPorValor(v / 100)}
                  larguraColuna={40}
                  larguraLinha={220}
                  compacto
                  legenda={<EscalaCores rotulos={["0", "25", "50", "75", "100"]} cores={["#EF4444", "#F97316", "#F59E0B", "#84CC16", "#10B981"]} titulo="Percentil" />}
                />
              </Cartao>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Cartao titulo="Melhores do conjunto" subtitulo="Três primeiros colocados por métrica" icone={TrendingUp} corIcone="#059669">
                  <div className="space-y-3">
                    {metricasBench.map((metrica) => (
                      <div key={metrica.chave}>
                        <p className="text-xs font-semibold text-fg">{metrica.rotulo}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(bench.melhores[metrica.chave] || []).map((item) => (
                            <Chip key={metrica.chave + item.id} cor={item.cor || "#059669"} onClick={() => navegar("/projetos/" + item.id)}>
                              {item.nome + ": " + formatarMetrica(metrica.unidade, item.valor)}
                            </Chip>
                          ))}
                          {(bench.melhores[metrica.chave] || []).length === 0 && <span className="text-2xs text-fg-subtle">sem dados suficientes</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Cartao>

                <Cartao titulo="Piores do conjunto" subtitulo="Pontos de atenção que pedem ação do gestor" icone={TrendingDown} corIcone="#DC2626">
                  <div className="space-y-3">
                    {metricasBench.map((metrica) => (
                      <div key={metrica.chave}>
                        <p className="text-xs font-semibold text-fg">{metrica.rotulo}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(bench.piores[metrica.chave] || []).map((item) => (
                            <Chip key={metrica.chave + item.id} cor={item.cor || "#DC2626"} onClick={() => navegar("/projetos/" + item.id)}>
                              {item.nome + ": " + formatarMetrica(metrica.unidade, item.valor)}
                            </Chip>
                          ))}
                          {(bench.piores[metrica.chave] || []).length === 0 && <span className="text-2xs text-fg-subtle">sem dados suficientes</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Cartao>
              </div>

              {bench.praticas.length > 0 && (
                <Cartao titulo="Práticas observadas" subtitulo="Padrões extraídos dos melhores projetos, sempre com a evidência numérica" icone={Lightbulb} corIcone="#D97706">
                  <GradeCards colunas={3}>
                    {bench.praticas.map((pratica) => {
                      const Icone = iconePratica(pratica.icone);
                      return (
                        <div key={pratica.titulo} className="rounded-sgp border border-border bg-surface-2 p-3">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                            <Icone className="size-3.5 text-warning" aria-hidden />
                            {pratica.titulo}
                          </span>
                          <p className="mt-1 text-2xs text-fg-muted">{pratica.detalhe}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.keys(pratica.evidencia).map((chave) => (
                              <span key={chave} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-2xs text-fg-muted">
                                {chave + ": " + String(pratica.evidencia[chave])}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </GradeCards>
                </Cartao>
              )}

              <SecaoColapsavel titulo="Premissas do benchmarking" icone={Lightbulb} abertoInicial={false}>
                <ul className="space-y-1.5 text-2xs text-fg-muted">
                  {bench.premissas.map((premissa) => (
                    <li key={premissa} className="flex items-start gap-1.5">
                      <CircleCheck className="mt-0.5 size-3 shrink-0 text-brand" aria-hidden />
                      {premissa}
                    </li>
                  ))}
                </ul>
              </SecaoColapsavel>
            </div>
          )}
        </div>
      )}

      {/* ================================================= aba 4: tendências */}

      {aba === "tendencias" && (
        <div className="space-y-3">
          <BarraFerramentas>
            <div className="flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Horizonte</span>
              <Segmentado
                valor={meses}
                onChange={setMeses}
                tamanho="sm"
                opcoes={[
                  { valor: "6", rotulo: "6 meses" },
                  { valor: "12", rotulo: "12 meses" },
                  { valor: "24", rotulo: "24 meses" },
                ]}
              />
            </div>
            <FiltroSelect
              rotulo="Programa"
              valor={programa}
              onChange={setPrograma}
              opcoes={(programas.data || []).map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
            />
            {tend && <span className="ml-auto text-2xs text-fg-muted">{numero(tend.resumo.projetos_analisados) + " projeto(s) analisados"}</span>}
          </BarraFerramentas>

          {tendencias.isError && (
            <Alerta tom="danger" titulo="Não foi possível montar as tendências">
              {mensagemErro(tendencias.error)}
            </Alerta>
          )}

          {tendencias.isLoading ? (
            <CarregandoBloco rotulo="Reconstruindo as séries mensais..." />
          ) : !tend || tend.series.length === 0 ? (
            <Vazio icone={TrendingUp} titulo="Sem séries para exibir" descricao="Não há histórico suficiente no escopo selecionado." />
          ) : (
            <div className="space-y-3">
              <Alerta tom={tend.resumo.piorando > 0 ? "warning" : "success"} titulo={tend.resumo.leitura} icone={tend.resumo.piorando > 0 ? TriangleAlert : CircleCheck}>
                {numero(tend.resumo.melhorando) + " série(s) melhorando, " + numero(tend.resumo.estaveis) + " estável(is) e " + numero(tend.resumo.piorando) + " em piora no horizonte de " + numero(tend.meses.length) + " meses."}
              </Alerta>

              <Cartao titulo="Evolução das séries" subtitulo="Indicadores mensais reconstruídos a partir dos registros reais" icone={ChartLine} corIcone="#2563EB">
                <GraficoLinha
                  rotulos={rotulosTend}
                  series={seriesTend}
                  altura={300}
                  formatarValor={(v) => indice(v, 2)}
                  mostrarLegenda
                />
                <p className="mt-1 text-2xs text-fg-subtle">
                  Meses sem medição para uma série são exibidos como zero, para que a linha permaneça contínua.
                </p>
              </Cartao>

              <GradeCards colunas={3}>
                {tend.series.map((serie) => {
                  const Icone = iconeTendencia(serie.tendencia);
                  return (
                    <div key={serie.chave} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-fg">{serie.nome}</p>
                          <p className="text-2xs text-fg-subtle">{"unidade: " + serie.unidade}</p>
                        </div>
                        <Etiqueta tom={TONS_TENDENCIA[serie.tendencia] || "neutral"} icone={Icone}>
                          {serie.tendencia_rotulo}
                        </Etiqueta>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-2xs text-fg-muted">
                        <span className="inline-flex items-center gap-1">
                          {(serie.variacao >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />)}
                          {"variação por mês: " + indice(serie.variacao, 3)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          {(serie.variacao_total >= 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />)}
                          {"no período: " + indice(serie.variacao_total, 2)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Equal className="size-3.5" aria-hidden />
                          {"R² " + indice(serie.r2, 2)}
                        </span>
                      </div>
                      <p className="mt-2 text-2xs text-fg-muted">{serie.interpretacao}</p>
                      <p className="mt-1 text-2xs text-fg-subtle">
                        {"Limiar de estabilidade: " + indice(serie.limiar_estabilidade, 3) + " por mês · " + numero(serie.amostras) + " ponto(s) medido(s)"}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Dica texto={serie.maior_melhor ? "Para esta série, aumentar é melhorar." : "Para esta série, aumentar é piorar."}>
                          <Etiqueta tom={serie.maior_melhor ? "success" : "warning"}>
                            {serie.maior_melhor ? "maior é melhor" : "menor é melhor"}
                          </Etiqueta>
                        </Dica>
                      </div>
                    </div>
                  );
                })}
              </GradeCards>
            </div>
          )}
        </div>
      )}

      {/* ============================================ aba 5: demanda de pessoas */}

      {aba === "demanda" && (
        <div className="space-y-3">
          <BarraFerramentas>
            <div className="flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Horizonte</span>
              <Segmentado
                valor={meses}
                onChange={setMeses}
                tamanho="sm"
                opcoes={[
                  { valor: "6", rotulo: "6 meses" },
                  { valor: "12", rotulo: "12 meses" },
                  { valor: "24", rotulo: "24 meses" },
                ]}
              />
            </div>
            {dem && (
              <span className="ml-auto text-2xs text-fg-muted">
                {"pico de demanda em " + (dem.resumo.pico ? dem.resumo.pico.rotulo + " (" + indice(dem.resumo.pico.demanda_fte, 2) + " FTE)" : "—")}
              </span>
            )}
          </BarraFerramentas>

          {demanda.isError && (
            <Alerta tom="danger" titulo="Não foi possível projetar a demanda">
              {mensagemErro(demanda.error)}
            </Alerta>
          )}

          {demanda.isLoading ? (
            <CarregandoBloco rotulo="Projetando a demanda de pessoas..." />
          ) : !dem ? (
            <Vazio icone={Users} titulo="Sem projeção de demanda" descricao="Não foi possível calcular a demanda de pessoas para o horizonte escolhido." />
          ) : (
            <div className="space-y-3">
              <LinhaKPI itens={kpisDemanda} />

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <Cartao titulo="Demanda contra capacidade" subtitulo="FTE necessário por mês comparado à capacidade instalada da equipe" icone={ChartLine} corIcone="#2563EB">
                  <GraficoLinha rotulos={dem.rotulos} series={seriesDemanda} altura={260} formatarValor={(v) => indice(v, 2) + " FTE"} mostrarLegenda mostrarArea />
                </Cartao>

                <Cartao titulo="Gap por mês" subtitulo="Vermelho indica escassez de pessoas; azul indica ociosidade" icone={Scale} corIcone="#DC2626">
                  <BarrasDivergentes
                    itens={barrasGap}
                    maximo={maximoGap}
                    rotuloNegativo="ociosidade"
                    rotuloPositivo="escassez"
                    formatar={(v) => (v > 0 ? "+" : "") + indice(v, 1)}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <EscalaCores rotulos={["escassez", "equilíbrio", "ociosidade"]} cores={["#DC2626", "#64748B", "#2563EB"]} titulo="Leitura do gap" />
                  </div>
                </Cartao>
              </div>

              <Cartao titulo="Meses de pico" subtitulo="Os três meses com maior demanda projetada" icone={Rocket} corIcone="#8B5CF6">
                <GradeCards colunas={3}>
                  {dem.resumo.meses_pico.map((mes) => (
                    <div key={mes.mes} className="rounded-sgp border border-border bg-surface-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-fg">{mes.rotulo}</p>
                        <Etiqueta tom={mes.situacao === "ESCASSEZ" ? "danger" : mes.situacao === "OCIOSIDADE" ? "info" : "success"}>
                          {mes.situacao.toLowerCase()}
                        </Etiqueta>
                      </div>
                      <div className="mt-2 space-y-1 text-2xs text-fg-muted">
                        <p>{"Demanda: " + indice(mes.demanda_fte, 2) + " FTE"}</p>
                        <p>{"Oferta: " + indice(mes.oferta_fte, 2) + " FTE"}</p>
                        <p>{"Gap: " + (mes.gap > 0 ? "+" : "") + indice(mes.gap, 2) + " FTE"}</p>
                        <p>{"Sem responsável: " + indice(mes.demanda_sem_responsavel_fte, 2) + " FTE"}</p>
                      </div>
                      <div className="mt-2">
                        <BarraProgresso
                          valor={Math.min(100, (mes.demanda_fte / Math.max(0.01, mes.oferta_fte)) * 100)}
                          cor={mes.demanda_fte > mes.oferta_fte ? "#DC2626" : "#059669"}
                          rotulo="Demanda sobre a capacidade"
                          mostrarValor
                          altura="sm"
                        />
                      </div>
                    </div>
                  ))}
                </GradeCards>
              </Cartao>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Cartao titulo="Recomendações" subtitulo="Ações sugeridas a partir do gap projetado" icone={Lightbulb} corIcone="#D97706">
                  <ul className="space-y-2">
                    {dem.resumo.recomendacoes.map((recomendacao) => (
                      <li key={recomendacao} className="flex items-start gap-2 rounded-sgp border border-border bg-surface-2 p-2.5 text-2xs text-fg-muted">
                        <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                        {recomendacao}
                      </li>
                    ))}
                    {dem.resumo.recomendacoes.length === 0 && <li className="text-2xs text-fg-muted">Nenhuma ação sugerida.</li>}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Botao tamanho="sm" variante="secundario" icone={Crosshair} onClick={() => navegar("/matching")}>
                      Alocar pessoas
                    </Botao>
                    <Botao tamanho="sm" variante="secundario" icone={Users} onClick={() => navegar("/capacidade")}>
                      Ver capacidade
                    </Botao>
                    {dem.resumo.tarefas_sem_responsavel > 0 && (
                      <Botao tamanho="sm" variante="secundario" icone={Hourglass} onClick={() => navegar("/projetos")}>
                        {numero(dem.resumo.tarefas_sem_responsavel) + " tarefa(s) sem responsável"}
                      </Botao>
                    )}
                  </div>
                </Cartao>

                <Cartao titulo="Premissas da projeção" subtitulo="Como o cálculo de FTE foi construído" icone={Lightbulb} corIcone="#0891B2">
                  <ul className="space-y-1.5 text-2xs text-fg-muted">
                    {dem.premissas.map((premissa) => (
                      <li key={premissa} className="flex items-start gap-1.5">
                        <CircleCheck className="mt-0.5 size-3 shrink-0 text-brand" aria-hidden />
                        {premissa}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-2xs text-fg-subtle">{"Gerado em " + dataRelativa(dem.gerado_em) + "."}</p>
                </Cartao>
              </div>

              <SecaoColapsavel titulo="Detalhe mês a mês" icone={ChartColumn} abertoInicial={false} contagem={dem.serie.length}>
                <div className="space-y-1.5">
                  {dem.serie.map((mes) => (
                    <div key={mes.mes} className="flex flex-wrap items-center gap-3 rounded-sgp border border-border bg-surface-2 px-3 py-2">
                      <span className="w-20 text-xs font-semibold text-fg">{mes.rotulo}</span>
                      <Etiqueta tom={mes.situacao === "ESCASSEZ" ? "danger" : mes.situacao === "OCIOSIDADE" ? "info" : "success"}>
                        {mes.situacao.toLowerCase()}
                      </Etiqueta>
                      <span className="text-2xs text-fg-muted">{"demanda " + indice(mes.demanda_fte, 2)}</span>
                      <span className="text-2xs text-fg-muted">{"alocações " + indice(mes.demanda_alocacoes_fte, 2)}</span>
                      <span className="text-2xs text-fg-muted">{"sem responsável " + indice(mes.demanda_sem_responsavel_fte, 2)}</span>
                      <span className="text-2xs text-fg-muted">{"oferta " + indice(mes.oferta_fte, 2)}</span>
                      <span className="ml-auto text-2xs font-semibold tabular-nums" style={{ color: mes.gap > 0 ? "#DC2626" : "#2563EB" }}>
                        {"gap " + (mes.gap > 0 ? "+" : "") + indice(mes.gap, 2) + " FTE"}
                      </span>
                    </div>
                  ))}
                </div>
              </SecaoColapsavel>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

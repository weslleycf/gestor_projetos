import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, BarChart3, Briefcase, Building2, CalendarClock, CircleDollarSign,
  Crosshair, Download, Filter, FolderKanban, Gauge, Grid3x3, Layers, RefreshCw, ShieldAlert,
  Sparkles, Target, TrendingDown, TrendingUp, Users, Wallet,
} from "lucide-react";
import {
  Alerta, BarraFerramentas, CabecalhoPagina, CarregandoBloco, Etiqueta, FiltroSelect, GradeCards,
  Semaforo, Tabela, Vazio, CORES_SAUDE, type ColunaTabela,
} from "@/components/ui";
import {
  EscalaCores, GraficoBarras, GraficoDonut, Heatmap, Medidor, type FatiaDonut,
} from "@/components/charts";
import { LinhaKPI } from "@/components/layout";
import { useConsulta, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, moeda, numero, percentual, indice } from "@/lib/format";
import { corPorValor } from "@/lib/utils";
import type { EVM, Marco, ProjetoResumo, Saude } from "@/lib/types";

interface RiscoMatriz {
  id: number;
  codigo: string;
  descricao: string;
  probabilidade: number;
  impacto: number;
  severidade: number;
  nivel: string;
  cor: string;
  projeto: string;
  project_id: number;
  status: string;
  responsavel: string;
}

interface RespostaExecutivo {
  filtros_aplicados: Record<string, string | null>;
  resumo: {
    total_projetos: number;
    ativos: number;
    atrasados: number;
    concluidos: number;
    em_risco: number;
    progresso_medio: number;
  };
  por_status: Array<{ status: string; rotulo: string; total: number }>;
  por_saude: Array<{ saude: Saude; rotulo: string; total: number }>;
  por_prioridade: Array<{ prioridade: string; rotulo: string; total: number }>;
  financeiro: {
    orcamento_planejado: number;
    custo_realizado: number;
    saldo: number;
    receita_prevista: number;
    roi_estimado: number;
    consumo_percentual: number;
    cpi_medio: number;
    spi_medio: number;
  };
  evm_por_projeto: Array<EVM & { id: number; nome: string; codigo: string; cor: string }>;
  riscos: {
    total: number;
    criticos: number;
    por_nivel: Array<{ nivel: string; total: number }>;
    matriz: RiscoMatriz[];
    top: RiscoMatriz[];
  };
  projetos_atrasados: Array<{
    id: number; nome: string; codigo: string; cor: string; saude: Saude; dias_atraso: number;
    data_fim: string; manager: string; percentual: number; progresso_planejado: number;
  }>;
  marcos_proximos: Marco[];
  capacidade: {
    conflitos: Array<{
      user_id: number; user_nome: string; user_cor: string; semana: string;
      total_percentual: number; excesso: number; severidade: string;
      alocacoes: Array<{ id: number; percentual: number; projeto: string; tarefa: string; periodo: string }>;
    }>;
    ocupacao: {
      semanas: Array<{ semana: string; rotulo: string }>;
      linhas: Array<{
        user_id: number; nome: string; cor: string; iniciais: string; area: string;
        celulas: Array<{ semana: string; valor: number; projetos: string[] }>;
        media: number;
      }>;
    };
    skills_criticas: Array<{
      id: number; nome: string; cor: string; icone: string; criticidade: string;
      bus_factor: number; nivel_medio: number; detentores: number;
    }>;
  };
  capacidades: {
    cobertura_skills: {
      total_catalogo: number; ativas: number; colaboradores: number; com_perfil: number;
      cobertura_percentual: number; perfis_registrados: number; media_skills_por_pessoa: number;
    };
    gap: { total_requisitos: number; criticos: number; altos: number; obrigatorios_pendentes: number; indice_cobertura: number };
    desenvolvimento: {
      indice: number; pdis_ativos: number; mentorias_ativas: number; skill_decay: number;
      promocoes_pendentes: number; progresso_pdi: number;
    };
    certificacao: { certificacoes: number; treinamentos: number; taxa: number };
  };
  alocacao: { recomendacoes_pendentes: number; total_perfis_skill: number; skills_catalogo: number };
  projetos: ProjetoResumo[];
  gerado_em: string;
}

const CORES_NIVEL_RISCO: Record<string, string> = {
  BAIXO: "#10B981",
  MEDIO: "#F59E0B",
  ALTO: "#F97316",
  EXTREMO: "#EF4444",
};

export default function DashboardExecutivo() {
  const navegar = useNavigate();
  const [programa, setPrograma] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [area, setArea] = useState("");
  const [gerente, setGerente] = useState("");

  const params = useMemo(
    () => ({
      ...(programa ? { programa } : {}),
      ...(portfolio ? { portfolio } : {}),
      ...(area ? { area } : {}),
      ...(gerente ? { manager: gerente } : {}),
    }),
    [programa, portfolio, area, gerente]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useConsulta<RespostaExecutivo>(
    CHAVES.dashboardExecutivo,
    "/dashboard/executivo/",
    params
  );

  const { data: programas } = useConsulta<{ results: Array<{ id: number; nome: string }> }>(
    ["programas"],
    "/programas/",
    { page_size: 200 }
  );
  const { data: portfolios } = useConsulta<{ results: Array<{ id: number; nome: string }> }>(
    ["portfolios"],
    "/portfolios/",
    { page_size: 200 }
  );
  const { data: usuarios } = useConsulta<{ results: Array<{ id: number; nome: string }> }>(
    ["usuarios-gerentes"],
    "/usuarios/",
    { perfil: "GERENTE", page_size: 100 }
  );
  // A aderência do motor de alocação vem do painel de alocação, não do financeiro.
  const { data: painelAlocacao } = useConsulta<{ aderencia_media: number }>(
    CHAVES.dashboardAlocacao,
    "/dashboard/alocacao/"
  );

  const fatiasStatus: FatiaDonut[] = useMemo(
    () =>
      (data?.por_status ?? [])
        .filter((s) => s.total > 0)
        .map((s, i) => ({
          rotulo: s.rotulo,
          valor: s.total,
          cor: ["#3B82F6", "#8B5CF6", "#F59E0B", "#0891B2", "#10B981", "#EF4444", "#6366F1", "#84CC16", "#94A3B8"][i % 9],
        })),
    [data]
  );

  const fatiasSaude: FatiaDonut[] = useMemo(
    () =>
      (data?.por_saude ?? [])
        .filter((s) => s.total > 0)
        .map((s) => ({
          rotulo: s.rotulo,
          valor: s.total,
          cor: CORES_SAUDE[s.saude]?.cor ?? "#94A3B8",
        })),
    [data]
  );

  const orcamentoBarras = useMemo(() => {
    const projetos = (data?.evm_por_projeto ?? []).slice(0, 12);
    return projetos.map((p) => ({
      rotulo: p.codigo || p.nome.slice(0, 10),
      valor: p.AC,
      comparativo: p.BAC,
      cor: p.situacao_custo === "VERDE" ? "#059669" : p.situacao_custo === "AMARELO" ? "#D97706" : "#DC2626",
    }));
  }, [data]);

  const colunasRiscos: Array<ColunaTabela<RiscoMatriz>> = [
    {
      chave: "codigo",
      titulo: "Código",
      largura: "90px",
      renderizar: (r) => <span className="font-mono text-2xs font-semibold text-fg-muted">{r.codigo}</span>,
    },
    {
      chave: "descricao",
      titulo: "Risco",
      ordenavel: true,
      valorOrdenacao: (r) => r.descricao,
      renderizar: (r) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg">{r.descricao}</p>
          <p className="truncate text-2xs text-fg-muted">{r.projeto}</p>
        </div>
      ),
    },
    {
      chave: "nivel",
      titulo: "Nível",
      largura: "100px",
      renderizar: (r) => (
        <Etiqueta cor={CORES_NIVEL_RISCO[r.nivel]} solido>
          {r.nivel}
        </Etiqueta>
      ),
    },
    {
      chave: "severidade",
      titulo: "P×I",
      largura: "70px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (r) => r.severidade,
      renderizar: (r) => (
        <span className="font-bold tabular-nums text-fg">
          {r.probabilidade}×{r.impacto}
        </span>
      ),
    },
    {
      chave: "responsavel",
      titulo: "Responsável",
      largura: "160px",
      renderizar: (r) => <span className="truncate text-xs text-fg-muted">{r.responsavel || "—"}</span>,
    },
  ];

  const colunasAtrasados: Array<ColunaTabela<RespostaExecutivo["projetos_atrasados"][number]>> = [
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
              {p.codigo} · {p.manager || "sem gerente"}
            </p>
          </div>
        </div>
      ),
    },
    {
      chave: "dias_atraso",
      titulo: "Atraso",
      largura: "100px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.dias_atraso,
      renderizar: (p) => (
        <span className="font-bold tabular-nums text-danger">{p.dias_atraso} dias</span>
      ),
    },
    {
      chave: "progresso",
      titulo: "Real × Planejado",
      largura: "150px",
      renderizar: (p) => (
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-fg">{p.percentual}%</span>
          <span className="text-2xs text-fg-subtle">/</span>
          <span className="w-9 shrink-0 text-xs tabular-nums text-fg-muted">{p.progresso_planejado.toFixed(0)}%</span>
        </div>
      ),
    },
    {
      chave: "prazo",
      titulo: "Prazo",
      largura: "110px",
      renderizar: (p) => <span className="text-xs text-fg-muted">{dataCurta(p.data_fim)}</span>,
    },
    {
      chave: "saude",
      titulo: "Saúde",
      largura: "120px",
      renderizar: (p) => <Semaforo saude={p.saude} />,
    },
  ];

  const exportarCsv = () => {
    if (!data) return;
    const linhas = [
      ["Projeto", "Código", "Gerente", "Progresso (%)", "Planejado (%)", "Dias de atraso", "Saúde"],
      ...data.projetos_atrasados.map((p) => [
        p.nome, p.codigo, p.manager, String(p.percentual),
        p.progresso_planejado.toFixed(0), String(p.dias_atraso), p.saude,
      ]),
    ];
    const csv = linhas.map((l) => l.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\n");
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sgp-projetos-atrasados.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Dashboard executivo" icone={Gauge} subtitulo="Carregando indicadores do portfólio" />
        <CarregandoBloco rotulo="Consolidando projetos, financeiro, riscos e capacidades..." />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Dashboard executivo" icone={Gauge} />
        <Alerta tom="danger" titulo="Não foi possível carregar o dashboard">
          {mensagemErro(error)}
        </Alerta>
      </div>
    );
  }

  const { resumo, financeiro, capacidades, capacidade, alocacao } = data;

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Dashboard executivo"
        subtitulo={"Portfólio consolidado · atualizado em " + dataCurta(data.gerado_em)}
        icone={Gauge}
        cor="#2563EB"
        acoes={
          <>
            <button
              type="button"
              onClick={exportarCsv}
              className="inline-flex h-9 items-center gap-2 rounded-sgp border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-surface-2"
            >
              <Download className="size-3.5" aria-hidden />
              Exportar
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex h-9 items-center gap-2 rounded-sgp bg-brand px-3 text-xs font-semibold text-brand-fg shadow-n1 hover:bg-brand-hover disabled:opacity-50"
            >
              <RefreshCw className={"size-3.5 " + (isFetching ? "animate-spin" : "")} aria-hidden />
              Atualizar
            </button>
          </>
        }
      >
        <BarraFerramentas className="mt-1">
          <Filter className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <FiltroSelect
            rotulo="Portfólio"
            valor={portfolio}
            onChange={setPortfolio}
            opcoes={(portfolios?.results ?? []).map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
            icone={Briefcase}
          />
          <FiltroSelect
            rotulo="Programa"
            valor={programa}
            onChange={setPrograma}
            opcoes={(programas?.results ?? []).map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
            icone={Layers}
          />
          <FiltroSelect
            rotulo="Gerente"
            valor={gerente}
            onChange={setGerente}
            opcoes={(usuarios?.results ?? []).map((u) => ({ valor: String(u.id), rotulo: u.nome }))}
            icone={Users}
          />
          <FiltroSelect
            rotulo="Área"
            valor={area}
            onChange={setArea}
            opcoes={Array.from(new Set(data.projetos.map((p) => p.area).filter(Boolean))).map((a) => ({
              valor: a,
              rotulo: a,
            }))}
            icone={Building2}
          />
          {(programa || portfolio || area || gerente) && (
            <button
              type="button"
              onClick={() => {
                setPrograma("");
                setPortfolio("");
                setArea("");
                setGerente("");
              }}
              className="text-2xs font-medium text-brand underline"
            >
              limpar filtros
            </button>
          )}
        </BarraFerramentas>
      </CabecalhoPagina>

      <LinhaKPI
        itens={[
          { rotulo: "Total de projetos", valor: numero(resumo.total_projetos), icone: FolderKanban, cor: "#2563EB", subrotulo: resumo.ativos + " em andamento" },
          { rotulo: "Em risco", valor: numero(resumo.em_risco), icone: AlertTriangle, cor: "#D97706", subrotulo: "saúde amarela ou vermelha" },
          { rotulo: "Atrasados", valor: numero(resumo.atrasados), icone: CalendarClock, cor: "#DC2626", subrotulo: "prazo vencido" },
          { rotulo: "Progresso médio", valor: percentual(resumo.progresso_medio, 1), icone: TrendingUp, cor: "#059669", subrotulo: "projetos ativos" },
          { rotulo: "Orçamento", valor: moeda(financeiro.orcamento_planejado, true), icone: Wallet, cor: "#8B5CF6", subrotulo: "planejado total" },
          { rotulo: "Realizado", valor: moeda(financeiro.custo_realizado, true), icone: CircleDollarSign, cor: "#F59E0B", subrotulo: percentual(financeiro.consumo_percentual, 1) + " consumido" },
        ]}
      />

      <GradeCards colunas="auto">
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <BarChart3 className="size-4 text-fg-muted" aria-hidden /> Projetos por status
          </h3>
          {fatiasStatus.length ? (
            <GraficoDonut fatias={fatiasStatus} centroRotulo="projetos" centroValor={resumo.total_projetos} />
          ) : (
            <Vazio titulo="Sem projetos" />
          )}
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <Activity className="size-4 text-fg-muted" aria-hidden /> Saúde do portfólio
          </h3>
          {fatiasSaude.length ? (
            <GraficoDonut fatias={fatiasSaude} centroRotulo="projetos" centroValor={resumo.total_projetos} />
          ) : (
            <Vazio titulo="Sem avaliação de saúde" />
          )}
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-1 text-sm font-semibold text-fg">Desempenho (EVM)</h3>
          <p className="mb-3 text-2xs text-fg-muted">Índices médios ponderados do portfólio filtrado</p>
          <div className="flex flex-wrap items-center justify-around gap-4">
            <Medidor valor={financeiro.cpi_medio} titulo="CPI médio" meta={1} tamanho={132} />
            <Medidor valor={financeiro.spi_medio} titulo="SPI médio" meta={1} tamanho={132} />
          </div>
          <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Saldo orçamentário</dt>
              <dd className={"font-semibold tabular-nums " + (financeiro.saldo >= 0 ? "text-success" : "text-danger")}>
                {moeda(financeiro.saldo, true)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">Receita prevista</dt>
              <dd className="font-semibold tabular-nums text-fg">{moeda(financeiro.receita_prevista, true)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-fg-muted">ROI estimado</dt>
              <dd className={"font-semibold tabular-nums " + (financeiro.roi_estimado >= 0 ? "text-success" : "text-danger")}>
                {percentual(financeiro.roi_estimado, 1)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-1 text-sm font-semibold text-fg">Riscos do portfólio</h3>
          <p className="mb-3 text-2xs text-fg-muted">{data.riscos.total} riscos abertos · {data.riscos.criticos} críticos</p>
          {data.riscos.por_nivel.some((n) => n.total > 0) ? (
            <GraficoDonut
              fatias={data.riscos.por_nivel
                .filter((n) => n.total > 0)
                .map((n) => ({ rotulo: n.nivel, valor: n.total, cor: CORES_NIVEL_RISCO[n.nivel] }))}
              centroRotulo="riscos"
              centroValor={data.riscos.total}
            />
          ) : (
            <Vazio icone={ShieldAlert} titulo="Nenhum risco aberto" descricao="Não há riscos ativos no escopo filtrado." />
          )}
        </div>
      </GradeCards>

      <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-fg">Orçado × Realizado por projeto</h3>
              <p className="text-2xs text-fg-muted">Barra clara = orçamento (BAC), barra colorida = custo real (AC)</p>
            </div>
            <EscalaCores rotulos={["Verde", "Atenção", "Crítico"]} cores={["#059669", "#D97706", "#DC2626"]} />
          </header>
          <div className="p-4">
            {orcamentoBarras.length ? (
              <GraficoBarras itens={orcamentoBarras} altura={230} formatarValor={(v) => moeda(v, true)} empilhadoCor="#94A3B8" />
            ) : (
              <Vazio titulo="Sem projetos ativos para exibir" />
            )}
          </div>
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-fg">Matriz de riscos do portfólio</h3>
            <p className="text-2xs text-fg-muted">Distribuição por probabilidade × impacto</p>
          </header>
          <div className="p-4">
            <MatrizRiscosCompacta riscos={data.riscos.matriz} aoClicar={(r) => navegar("/projetos/" + r.project_id + "?aba=riscos")} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <CalendarClock className="size-4 text-danger" aria-hidden /> Projetos atrasados
            </h3>
            <button type="button" onClick={() => navegar("/projetos")} className="text-2xs font-medium text-brand hover:underline">
              ver todos os projetos
            </button>
          </header>
          <Tabela
            colunas={colunasAtrasados}
            dados={data.projetos_atrasados}
            aoClicarLinha={(p) => navegar("/projetos/" + p.id)}
            vazio={<Vazio icone={Activity} titulo="Nenhum projeto atrasado" descricao="Todos os projetos estão dentro do prazo planejado." />}
          />
        </div>

        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <ShieldAlert className="size-4 text-warning" aria-hidden /> Riscos mais severos
            </h3>
            <button type="button" onClick={() => navegar("/riscos")} className="text-2xs font-medium text-brand hover:underline">
              abrir matriz de riscos
            </button>
          </header>
          <Tabela
            colunas={colunasRiscos}
            dados={data.riscos.top}
            aoClicarLinha={(r) => navegar("/projetos/" + r.project_id + "?aba=riscos")}
            vazio={<Vazio icone={ShieldAlert} titulo="Nenhum risco crítico" descricao="Não há riscos de nível alto ou extremo abertos." />}
          />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Grid3x3 className="size-4 text-fg-muted" aria-hidden /> Heatmap de ocupação da equipe
              </h3>
              <p className="text-2xs text-fg-muted">Percentual alocado por pessoa e semana · 12 semanas</p>
            </div>
            <EscalaCores
              rotulos={["0", "50", "85", "100", "130+"]}
              cores={["#E2E8F0", "#93C5FD", "#3B82F6", "#F59E0B", "#DC2626"]}
              titulo="% alocado"
            />
          </header>
          <div className="p-3">
            {capacidade.ocupacao.linhas.length ? (
              <Heatmap
                linhas={capacidade.ocupacao.linhas.slice(0, 14).map((l) => ({
                  id: l.user_id,
                  rotulo: l.nome,
                  sub: l.area,
                  cor: l.cor,
                  avatar: (
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: l.cor }}
                    >
                      {l.iniciais}
                    </span>
                  ),
                }))}
                colunas={capacidade.ocupacao.semanas.map((s) => ({ id: s.semana, rotulo: s.rotulo }))}
                celulas={(linhaId, colunaId) => {
                  const linha = capacidade.ocupacao.linhas.find((l) => l.user_id === linhaId);
                  const celula = linha?.celulas.find((c) => c.semana === colunaId);
                  if (!celula) return { valor: 0, rotulo: "—" };
                  return {
                    valor: celula.valor,
                    cor: corPorValor(celula.valor / 100, true),
                    rotulo: linha?.nome + " · " + celula.valor + "%",
                    detalhe: (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-fg">{linha?.nome}</p>
                        <p className="text-fg-muted">Semana de {dataCurta(celula.semana)}</p>
                        <p className="font-semibold" style={{ color: corPorValor(celula.valor / 100, true) }}>
                          {celula.valor}% alocado
                        </p>
                        {celula.projetos.length > 0 && (
                          <p className="text-fg-muted">{celula.projetos.slice(0, 3).join(", ")}</p>
                        )}
                      </div>
                    ),
                  };
                }}
                maximo={130}
                formatoValor={(v) => (v ? String(v) : "")}
                corDe={(v) => (v === 0 ? "var(--sgp-surface-2)" : corPorValor(v / 100, true))}
                larguraColuna={36}
                larguraLinha={170}
                compacto
                aoClicarCelula={(l) => navegar("/capacidade/" + l)}
              />
            ) : (
              <Vazio icone={Users} titulo="Sem alocações ativas" descricao="Nenhuma pessoa está alocada no período analisado." />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Crosshair className="size-4 text-fg-muted" aria-hidden /> Alocação e capacidades
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <dt className="text-2xs text-fg-muted">Aderência média do matching</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">
                  {painelAlocacao ? percentual(painelAlocacao.aderencia_media, 1) : "—"}
                </dd>
                <p className="mt-0.5 text-[10px] text-fg-subtle">
                  score médio das alocações feitas pelo motor
                </p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <dt className="text-2xs text-fg-muted">Recomendações pendentes</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">{alocacao.recomendacoes_pendentes}</dd>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <dt className="text-2xs text-fg-muted">Cobertura do catálogo</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">
                  {percentual(capacidades.cobertura_skills.cobertura_percentual, 1)}
                </dd>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <dt className="text-2xs text-fg-muted">Índice de desenvolvimento</dt>
                <dd className="mt-0.5 text-lg font-bold tabular-nums text-fg">{indice(capacidades.desenvolvimento.indice, 1)}</dd>
              </div>
            </dl>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
              <div>
                <p className="text-lg font-bold tabular-nums text-fg">{capacidades.desenvolvimento.pdis_ativos}</p>
                <p className="text-2xs text-fg-muted">PDIs ativos</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-fg">{capacidades.desenvolvimento.mentorias_ativas}</p>
                <p className="text-2xs text-fg-muted">Mentorias</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-warning">{capacidades.desenvolvimento.promocoes_pendentes}</p>
                <p className="text-2xs text-fg-muted">Promoções</p>
              </div>
            </div>
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Sparkles className="size-4 text-warning" aria-hidden /> Capacidades críticas
            </h3>
            <ul className="space-y-2">
              {capacidade.skills_criticas.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-2.5">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.cor }} />
                  <button
                    type="button"
                    onClick={() => navegar("/capacidades/skills/" + s.id)}
                    className="min-w-0 flex-1 truncate text-left text-xs font-medium text-fg hover:text-brand hover:underline"
                  >
                    {s.nome}
                  </button>
                  <span className="shrink-0 text-2xs text-fg-muted">{s.detentores} pessoa(s)</span>
                  {s.bus_factor <= 1 && (
                    <Etiqueta tom="danger" icone={AlertTriangle}>
                      bus factor {s.bus_factor}
                    </Etiqueta>
                  )}
                </li>
              ))}
              {capacidade.skills_criticas.length === 0 && (
                <li className="py-4 text-center text-xs text-fg-muted">Nenhuma capacidade crítica identificada.</li>
              )}
            </ul>
          </div>

          {capacidade.conflitos.length > 0 && (
            <Alerta tom="warning" titulo={capacidade.conflitos.length + " conflito(s) de alocação detectado(s)"} icone={AlertTriangle}>
              <ul className="mt-1 space-y-1">
                {capacidade.conflitos.slice(0, 3).map((c, i) => (
                  <li key={i} className="text-2xs">
                    <strong>{c.user_nome}</strong> está com {c.total_percentual}% na semana de {dataCurta(c.semana)} (
                    {c.excesso}% acima do limite) — {c.alocacoes.map((a) => a.projeto).join(", ")}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => navegar("/alocacao")} className="mt-2 text-2xs font-semibold text-brand underline">
                revisar alocações
              </button>
            </Alerta>
          )}
        </div>
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Target className="size-4 text-fg-muted" aria-hidden /> Próximos marcos (45 dias)
          </h3>
          <button type="button" onClick={() => navegar("/marcos")} className="text-2xs font-medium text-brand hover:underline">
            ver todos os marcos
          </button>
        </header>
        {data.marcos_proximos.length === 0 ? (
          <Vazio icone={Target} titulo="Nenhum marco nos próximos 45 dias" />
        ) : (
          <ul className="divide-y divide-border">
            {data.marcos_proximos.map((m) => {
              const dias = Math.ceil((new Date(m.data_prevista).getTime() - Date.now()) / 86_400_000);
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-md"
                    style={{ backgroundColor: m.cor + "22", color: m.cor }}
                  >
                    <Target className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-fg">{m.nome}</p>
                    <p className="truncate text-2xs text-fg-muted">{m.project_nome}</p>
                  </div>
                  {m.critico && <Etiqueta tom="danger">crítico</Etiqueta>}
                  <span className="shrink-0 text-xs tabular-nums text-fg-muted">{dataCurta(m.data_prevista)}</span>
                  <span
                    className={
                      "w-16 shrink-0 text-right text-2xs font-semibold tabular-nums " +
                      (dias <= 7 ? "text-danger" : dias <= 15 ? "text-warning" : "text-fg-muted")
                    }
                  >
                    {dias <= 0 ? "hoje" : "em " + dias + "d"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function MatrizRiscosCompacta({
  riscos,
  aoClicar,
}: {
  riscos: RiscoMatriz[];
  aoClicar: (risco: RiscoMatriz) => void;
}) {
  const grade = useMemo(() => {
    const mapa = new Map<string, RiscoMatriz[]>();
    riscos.forEach((r) => {
      const chave = r.probabilidade + "-" + r.impacto;
      const lista = mapa.get(chave) || [];
      lista.push(r);
      mapa.set(chave, lista);
    });
    return mapa;
  }, [riscos]);

  const cor = (p: number, i: number) => {
    const s = p * i;
    if (s <= 4) return "#10B981";
    if (s <= 9) return "#F59E0B";
    if (s <= 16) return "#F97316";
    return "#EF4444";
  };

  return (
    <div>
      <div className="flex gap-1">
        <div className="flex w-5 shrink-0 flex-col justify-around pb-5 text-2xs font-semibold text-fg-muted">
          {[5, 4, 3, 2, 1].map((p) => (
            <span key={p} className="text-center">
              {p}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].map((p) =>
              [1, 2, 3, 4, 5].map((i) => {
                const lista = grade.get(p + "-" + i) || [];
                const c = cor(p, i);
                return (
                  <button
                    key={p + "-" + i}
                    type="button"
                    onClick={() => lista[0] && aoClicar(lista[0])}
                    title={lista.length ? lista.map((r) => r.codigo + ": " + r.descricao).join("\n") : "Sem riscos (P" + p + " × I" + i + ")"}
                    className="relative grid aspect-square place-items-center rounded-md border transition-all hover:scale-105 hover:ring-2 hover:ring-fg/30"
                    style={{ backgroundColor: c + "26", borderColor: c + "66" }}
                  >
                    {lista.length > 0 && (
                      <span className="text-sm font-bold tabular-nums" style={{ color: c }}>
                        {lista.length}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-1 grid grid-cols-5 gap-1 text-2xs font-semibold text-fg-muted">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-center">
                {i}
              </span>
            ))}
          </div>
          <p className="mt-1 text-center text-2xs text-fg-subtle">Impacto →</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-border pt-3">
        {[
          { rotulo: "Baixo", cor: "#10B981" },
          { rotulo: "Médio", cor: "#F59E0B" },
          { rotulo: "Alto", cor: "#F97316" },
          { rotulo: "Extremo", cor: "#EF4444" },
        ].map((l) => (
          <span key={l.rotulo} className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: l.cor }} />
            {l.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange, Filter, RefreshCw, TrendingUp } from "lucide-react";
import { Timeline, type ItemTimeline } from "@/components/timeline";
import { GraficoBarras, GraficoDonut, type FatiaDonut } from "@/components/charts";
import {
  Alerta, BarraFerramentas, CabecalhoPagina, CarregandoBloco, ControleDeslizante, Entrada,
  FiltroSelect, GradeCards, Segmentado, Vazio,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { useConsulta, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { moeda, numero, percentual, dataCurta } from "@/lib/format";
import { CORES_SAUDE } from "@/components/ui";
import type { Saude } from "@/lib/types";

interface ProjetoTimeline {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  inicio: string | null;
  fim: string | null;
  saude: Saude;
  status: string;
  status_rotulo: string;
  prioridade: string;
  percentual: number;
  progresso_planejado: number;
  gerente: string;
  programa: string;
  atrasado: boolean;
  orcamento: number;
  tarefas: number;
  marcos: Array<{ id: number; nome: string; data: string; status: string; critico: boolean }>;
}

interface RespostaTimeline {
  hoje: string;
  projetos: ProjetoTimeline[];
}

export default function TimelinePortfolio() {
  const navegar = useNavigate();
  const [programa, setPrograma] = useState("");
  const [saude, setSaude] = useState("");
  const [busca, setBusca] = useState("");
  const [zoomInicial, setZoomInicial] = useState(1);
  const [agrupar, setAgrupar] = useState<"programa" | "portfolio" | "nenhum">("programa");

  const { data, isLoading, isError, error, refetch, isFetching } = useConsulta<RespostaTimeline>(
    CHAVES.projetosTimeline,
    "/projetos/timeline/"
  );

  const projetos = data?.projetos ?? [];

  const programas = useMemo(
    () => Array.from(new Set(projetos.map((p) => p.programa).filter(Boolean))).sort(),
    [projetos]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return projetos.filter((p) => {
      if (programa && p.programa !== programa) return false;
      if (saude && p.saude !== saude) return false;
      if (termo && !p.nome.toLowerCase().includes(termo) && !p.codigo.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [projetos, programa, saude, busca]);

  const itens: ItemTimeline[] = useMemo(
    () =>
      filtrados.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nome: p.nome,
        cor: p.cor,
        inicio: p.inicio,
        fim: p.fim,
        saude: p.saude,
        status_rotulo: p.status_rotulo,
        percentual: p.percentual,
        progresso_planejado: p.progresso_planejado,
        gerente: p.gerente,
        programa: p.programa,
        atrasado: p.atrasado,
        orcamento: p.orcamento,
        tarefas: p.tarefas,
        marcos: p.marcos,
        onClick: () => navegar("/projetos/" + p.id),
      })),
    [filtrados, navegar]
  );

  const porSaude: FatiaDonut[] = useMemo(() => {
    const contagem: Record<string, number> = { VERDE: 0, AMARELO: 0, VERMELHO: 0, CINZA: 0 };
    filtrados.forEach((p) => {
      contagem[p.saude] = (contagem[p.saude] || 0) + 1;
    });
    return Object.entries(contagem)
      .filter(([, valor]) => valor > 0)
      .map(([chave, valor]) => ({
        rotulo: CORES_SAUDE[chave]?.rotulo ?? chave,
        valor,
        cor: CORES_SAUDE[chave]?.cor ?? "#94A3B8",
      }));
  }, [filtrados]);

  const porPrograma = useMemo(() => {
    const mapa = new Map<string, number>();
    filtrados.forEach((p) => {
      const chave = p.programa || "Sem programa";
      mapa.set(chave, (mapa.get(chave) || 0) + p.orcamento);
    });
    return Array.from(mapa.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([rotulo, valor], i) => ({
        rotulo: rotulo.length > 22 ? rotulo.slice(0, 21) + "…" : rotulo,
        valor: Math.round(valor),
        cor: ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#6366F1", "#84CC16"][i % 8],
      }));
  }, [filtrados]);

  const indicadores = useMemo(() => {
    const orcamento = filtrados.reduce((a, p) => a + p.orcamento, 0);
    const atrasados = filtrados.filter((p) => p.atrasado).length;
    const tarefas = filtrados.reduce((a, p) => a + p.tarefas, 0);
    const progresso = filtrados.length ? filtrados.reduce((a, p) => a + p.percentual, 0) / filtrados.length : 0;
    return [
      { rotulo: "Projetos no período", valor: numero(filtrados.length), cor: "#2563EB", icone: CalendarRange },
      { rotulo: "Orçamento total", valor: moeda(orcamento, true), cor: "#8B5CF6", icone: TrendingUp },
      { rotulo: "Atrasados", valor: numero(atrasados), cor: "#DC2626", icone: Filter },
      { rotulo: "Progresso médio", valor: percentual(progresso, 1), cor: "#059669", icone: TrendingUp },
      { rotulo: "Tarefas", valor: numero(tarefas), cor: "#0891B2", icone: CalendarRange },
      ...(data?.hoje ? [{ rotulo: "Referência", valor: dataCurta(data.hoje), cor: "#64748B", icone: CalendarRange }] : []),
    ];
  }, [filtrados, data]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Timeline do portfólio"
        subtitulo="Visão macro de todos os projetos com marcos, saúde e drill-down"
        icone={CalendarRange}
        cor="#2563EB"
        acoes={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-9 items-center gap-2 rounded-sgp border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-surface-2 disabled:opacity-50"
          >
            <RefreshCw className={"size-3.5 " + (isFetching ? "animate-spin" : "")} aria-hidden />
            Atualizar
          </button>
        }
      />

      <LinhaKPI itens={indicadores} />

      <BarraFerramentas>
        <Entrada
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="h-8 max-w-64 text-xs"
        />
        <FiltroSelect
          rotulo="Programa"
          valor={programa}
          onChange={setPrograma}
          opcoes={programas.map((p) => ({ valor: p, rotulo: p }))}
        />
        <FiltroSelect
          rotulo="Saúde"
          valor={saude}
          onChange={setSaude}
          opcoes={Object.entries(CORES_SAUDE).map(([valor, cfg]) => ({ valor, rotulo: cfg.rotulo }))}
        />
        <div className="ml-auto flex items-center gap-3">
          <Segmentado<"programa" | "portfolio" | "nenhum">
            valor={agrupar}
            onChange={setAgrupar}
            tamanho="sm"
            opcoes={[
              { valor: "programa", rotulo: "Agrupar por programa" },
              { valor: "portfolio", rotulo: "Por portfólio" },
              { valor: "nenhum", rotulo: "Sem agrupar" },
            ]}
          />
          <div className="w-40">
            <ControleDeslizante
              valor={zoomInicial}
              onChange={setZoomInicial}
              min={0.4}
              max={3}
              passo={0.2}
              rotulo="Zoom"
              sufixo="×"
              mostrarValor
            />
          </div>
        </div>
      </BarraFerramentas>

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar a timeline">
          {mensagemErro(error)}
        </Alerta>
      )}

      {isLoading ? (
        <CarregandoBloco rotulo="Carregando timeline do portfólio..." />
      ) : itens.length === 0 ? (
        <Vazio
          icone={CalendarRange}
          titulo="Nenhum projeto no período"
          descricao="Ajuste os filtros de programa, saúde ou busca para visualizar projetos na timeline."
        />
      ) : (
        <>
          <Timeline
            itens={itens}
            zoomInicial={zoomInicial}
            mostrarMarcos
            agruparPor={agrupar === "nenhum" ? undefined : (item) => (agrupar === "programa" ? item.programa : item.programa)}
          />

          <GradeCards colunas={2}>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 text-sm font-semibold text-fg">Saúde dos projetos filtrados</h3>
              <GraficoDonut fatias={porSaude} centroRotulo="projetos" centroValor={filtrados.length} />
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 text-sm font-semibold text-fg">Orçamento por programa</h3>
              <GraficoBarras
                itens={porPrograma}
                horizontal
                formatarValor={(v) => moeda(v, true)}
              />
            </div>
          </GradeCards>
        </>
      )}
    </div>
  );
}

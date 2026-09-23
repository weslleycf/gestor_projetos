import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  AlarmClock,
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  Check,
  Crosshair,
  FileText,
  Filter,
  FolderKanban,
  Gauge,
  GripVertical,
  Grid3x3,
  History,
  Info,
  LayoutDashboard,
  Layers,
  Mail,
  PieChart,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Share2,
  ShieldAlert,
  Table,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  Avatar,
  BarraProgresso,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  Dica,
  Entrada,
  Esqueleto,
  Etiqueta,
  GradeCards,
  Modal,
  PainelLateral,
  PilhaAvatares,
  SecaoColapsavel,
  Selecao,
  Semaforo,
  Vazio,
  CORES_SAUDE,
  useAvisos,
} from "@/components/ui";
import {
  EscalaCores,
  GraficoBarras,
  GraficoDonut,
  GraficoLinha,
  Heatmap,
  Medidor,
  type BarraItem,
  type CelulaHeatmap,
  type FatiaDonut,
} from "@/components/charts";
import { BarraFerramentas, FiltroSelect } from "@/components/layout";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, corNivel, corPorValor } from "@/lib/utils";
import { dataCurta, dataHora, dataRelativa, indice, moeda, numero, percentual } from "@/lib/format";
import type { ProjetoResumo, WidgetCatalogo } from "@/lib/types";

/* ==========================================================================
   Tipos locais — espelham os serializers consumidos (RF-30)
   ========================================================================== */

interface LayoutWidget {
  id: string;
  tipo: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutSalvo {
  id: number;
  nome: string;
  widgets_json: LayoutWidget[];
  is_default: boolean;
  criado_em: string;
  atualizado_em: string;
}

interface RelatorioSalvo {
  id: number;
  nome: string;
  descricao: string;
  widgets_json: LayoutWidget[];
  agendamento: string;
  destinatarios: string[];
  criado_em: string;
}

interface RespostaWidgets {
  widgets: WidgetCatalogo[];
}

interface ItemStatus {
  status: string;
  rotulo: string;
  total: number;
}

interface ItemSaude {
  saude: string;
  rotulo: string;
  total: number;
}

interface ResumoFinanceiro {
  orcamento_planejado: number;
  custo_realizado: number;
  saldo: number;
  receita_prevista: number;
  consumo_percentual: number;
  cpi_medio: number;
  spi_medio: number;
}

interface LinhaEVM {
  id: number;
  nome: string;
  codigo: string;
  cor: string;
  CPI: number;
  SPI: number;
}

interface ProjetoAtrasado {
  id: number;
  nome: string;
  codigo: string;
  cor: string;
  saude: string;
  dias_atraso: number;
  data_fim: string | null;
  manager: string;
  percentual: number;
  progresso_planejado: number;
}

interface RespostaExecutivo {
  resumo: {
    total_projetos: number;
    ativos: number;
    atrasados: number;
    concluidos: number;
    em_risco: number;
    progresso_medio: number;
  };
  por_status: ItemStatus[];
  por_saude: ItemSaude[];
  financeiro: ResumoFinanceiro;
  evm_por_projeto: LinhaEVM[];
  projetos_atrasados: ProjetoAtrasado[];
}

interface PontoCurva {
  data: string;
  rotulo: string;
  PV: number;
  EV: number;
  AC: number;
}

interface RespostaEVM {
  projeto: { id: number; nome: string; codigo: string };
  evm: { CPI: number; SPI: number; BAC: number; EAC: number; VAC: number };
  curva_s: { pontos: PontoCurva[]; resumo: Record<string, number> };
}

interface PontoBurndown {
  data: string;
  planejado: number;
  realizado: number;
  ideal: number;
  restante: number;
  restante_ideal: number;
}

interface RespostaDashboardProjeto {
  projeto: ProjetoResumo;
  progresso: { percentual: number; planejado: number; tarefas_total: number; tarefas_atrasadas: number };
  burndown: { pontos: PontoBurndown[]; total_horas: number };
}

interface CelulaMatrizRiscoResumo {
  probabilidade: number;
  impacto: number;
  severidade: number;
  nivel: string;
  cor: string;
  total: number;
}

interface RespostaRiscos {
  total_riscos: number;
  exposicao_total: number;
  matriz_resumo: CelulaMatrizRiscoResumo[];
}

interface CelulaOcupacao {
  semana: string;
  valor: number;
  projetos: string[];
}

interface LinhaOcupacao {
  user_id: number;
  nome: string;
  cor: string;
  iniciais: string;
  area: string;
  celulas: CelulaOcupacao[];
  media: number;
}

interface MapaOcupacao {
  semanas: Array<{ semana: string; rotulo: string }>;
  linhas: LinhaOcupacao[];
}

interface ColunaMatrizResumo {
  skill_id: number;
  nome: string;
  cor: string;
  criticidade: string;
  detentores: number;
  bus_factor: number;
}

interface LinhaMatrizResumo {
  user_id: number;
  nome: string;
  iniciais: string;
  cor: string;
  area: string;
  total_skills: number;
  nivel_medio: number;
  celulas: Array<{ skill_id: number; nivel: number; consolidado: number; validado: number }>;
}

interface RespostaMatrizSkills {
  colunas: ColunaMatrizResumo[];
  linhas: LinhaMatrizResumo[];
  total_pessoas: number;
  total_skills: number;
}

interface ItemGap {
  skill_id: number;
  skill: string;
  icone: string;
  cor: string;
  criticidade: string;
  nivel_minimo: number;
  quantidade: number;
  atendem: number;
  deficit: number;
  severidade: string;
  obrigatorio?: boolean;
}

interface RespostaGap {
  itens: ItemGap[];
  resumo: {
    total_requisitos: number;
    criticos: number;
    altos: number;
    medios: number;
    baixos: number;
    obrigatorios_pendentes: number;
    indice_cobertura: number;
  };
}

interface DetentorBusFactor {
  user_id: number;
  nome: string;
  nivel: number;
  cor: string;
}

interface AlertaBusFactor {
  skill_id: number;
  skill: string;
  cor: string;
  icone: string;
  criticidade: string;
  quantidade_detentores: number;
  total_projetos_dependentes: number;
  recomendacao: string;
  detentores: DetentorBusFactor[];
}

interface RespostaBusFactor {
  alertas: AlertaBusFactor[];
  resumo: { total: number; sem_detentor: number; um_detentor: number };
}

interface RespostaAlocacao {
  total_alocacoes: number;
  taxa_override: number;
  aderencia_media: number;
  recomendacoes: { total: number; sugeridas: number; aceitas: number; recusadas: number };
}

interface ItemAtividade {
  id: number;
  user_nome: string;
  user_cor: string;
  verbo: string;
  entidade: string;
  entidade_nome: string;
  projeto_id: number | null;
  criado_em: string;
}

interface RespostaCards {
  total: number;
  projetos: ProjetoResumo[];
}

interface RespostaExecucao {
  relatorio: RelatorioSalvo;
  catalogo_widgets: WidgetCatalogo[];
}

/* ==========================================================================
   Recorte do relatório — filtros e o que cada widget aceita de fato
   ========================================================================== */

type DimensaoRecorte = "portfolio" | "programa" | "area" | "gerente" | "projeto" | "periodo";

interface FiltrosRelatorio {
  portfolio: string;
  programa: string;
  area: string;
  gerente: string;
  projeto: string;
  de: string;
  ate: string;
}

interface OpcaoFiltro {
  valor: string;
  rotulo: string;
}

type AcaoPendente =
  | { tipo: "aplicar"; layout: LayoutSalvo }
  | { tipo: "padrao"; layout: LayoutSalvo }
  | { tipo: "executar"; relatorio: RelatorioSalvo }
  | { tipo: "limpar" }
  | { tipo: "sair" };

const RECORTE_VAZIO: FiltrosRelatorio = {
  portfolio: "",
  programa: "",
  area: "",
  gerente: "",
  projeto: "",
  de: "",
  ate: "",
};

const ROTULO_DIMENSAO: Record<DimensaoRecorte, string> = {
  portfolio: "o portfólio",
  programa: "o programa",
  area: "a área",
  gerente: "o gerente",
  projeto: "o projeto",
  periodo: "o período",
};

/* Dimensões do recorte que cada endpoint de widget aceita de verdade.
   Conferido em backend/apps: /dashboard/executivo/ lê programa, portfolio, area
   e manager; /projetos/cards/ lê portfolio, program, area e manager;
   /dashboard/riscos/ e /capacidades/gap/ leem project; /atividades/ lê
   projeto_id; /capacidades/perfis/matriz/ lê area; /alocacoes/mapa-ocupacao/
   lê inicio e fim; /evm/{id}/ lê data; /dashboard/alocacao/ e
   /capacidades/bus-factor-detect/ não leem nenhum. O que não está na lista
   vira ressalva na faixa de contexto. */
const FILTROS_POR_WIDGET: Record<string, DimensaoRecorte[]> = {
  "kpi-projetos-status": ["portfolio", "programa", "area", "gerente"],
  "kpi-saude": ["portfolio", "programa", "area", "gerente"],
  "kpi-orcamento": ["portfolio", "programa", "area", "gerente"],
  "kpi-cpi-spi": ["portfolio", "programa", "area", "gerente"],
  "projetos-atrasados": ["portfolio", "programa", "area", "gerente"],
  "gantt-portfolio": ["portfolio", "programa", "area", "gerente"],
  "curva-s": ["projeto", "periodo"],
  burndown: ["projeto"],
  "matriz-riscos": ["projeto"],
  "gap-analysis": ["projeto"],
  "timeline-atividades": ["projeto"],
  "matriz-skills": ["area"],
  "heatmap-capacidade": ["periodo"],
  "alocacao-ocupacao": ["periodo"],
  ocupacao: ["periodo"],
  "bus-factor": [],
  "aderencia-alocacao": [],
};

/** Assinatura estável da composição — base para detectar alterações não salvas. */
function assinaturaComposicao(lista: LayoutWidget[]): string {
  return JSON.stringify(
    lista.map((w) => ({ id: w.id, tipo: w.tipo, x: w.x, y: w.y, w: w.w, h: w.h }))
  );
}

/** Liga rótulos em texto: "a", "a e b", "a, b e c". */
function listarEmTexto(itens: string[]): string {
  if (itens.length <= 1) return itens[0] || "";
  return itens.slice(0, -1).join(", ") + " e " + itens[itens.length - 1];
}

/* ==========================================================================
   Constantes visuais
   ========================================================================== */

const PALETA = ["#2563EB", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#6366F1", "#84CC16"];

const TAMANHOS: Record<string, { w: number; h: number }> = {
  sm: { w: 3, h: 2 },
  md: { w: 4, h: 3 },
  lg: { w: 6, h: 3 },
  full: { w: 12, h: 4 },
};

const LARGURAS = [3, 4, 6, 8, 12];
const ALTURAS = [2, 3, 4];

const ICONES_TIPO: Record<string, LucideIcon> = {
  donut: PieChart,
  barras: BarChart3,
  gauge: Gauge,
  linha: TrendingUp,
  area: TrendingDown,
  matriz: Grid3x3,
  heatmap: Table,
  grafo: Share2,
  lista: AlarmClock,
  timeline: History,
  gantt: CalendarRange,
};

const ICONES_CATALOGO: Record<string, LucideIcon> = {
  "pie-chart": PieChart,
  activity: Activity,
  "bar-chart-3": BarChart3,
  gauge: Gauge,
  "trending-up": TrendingUp,
  "gantt-chart": CalendarRange,
  "trending-down": TrendingDown,
  "shield-alert": ShieldAlert,
  "grid-3x3": Grid3x3,
  table: Table,
  target: Target,
  "share-2": Share2,
  "alarm-clock": AlarmClock,
  users: Users,
  crosshair: Crosshair,
  history: History,
};

function iconeDoWidget(widget: WidgetCatalogo): LucideIcon {
  return ICONES_CATALOGO[widget.icone] || ICONES_TIPO[widget.tipo] || LayoutDashboard;
}

function corOcupacao(valor: number): string {
  if (valor <= 0) return "var(--sgp-surface-2)";
  if (valor <= 50) return "#10B981";
  if (valor <= 80) return "#84CC16";
  if (valor <= 100) return "#F59E0B";
  return "#EF4444";
}

function rotuloTipo(tipo: string): string {
  const mapa: Record<string, string> = {
    donut: "Rosca",
    barras: "Barras",
    gauge: "Medidor",
    linha: "Linha",
    area: "Área",
    matriz: "Matriz",
    heatmap: "Mapa de calor",
    grafo: "Grafo",
    lista: "Lista",
    timeline: "Linha do tempo",
    gantt: "Gantt",
  };
  return mapa[tipo] || tipo;
}

/* ==========================================================================
   Cartão de widget sortable
   ========================================================================== */

function CartaoWidget({
  item,
  nome,
  icone: Icone,
  categoria,
  onRemover,
  onRedimensionar,
  children,
}: {
  item: LayoutWidget;
  nome: string;
  icone: LucideIcon;
  categoria: string;
  onRemover: () => void;
  onRedimensionar: (w: number, h: number) => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={"Widget " + nome}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: "span " + item.w + " / span " + item.w,
        minHeight: item.h * 104,
      }}
      className={cn(
        "flex flex-col overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n1",
        isDragging && "drag-ghost z-20"
      )}
    >
      <header className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            style={{ touchAction: "none" }}
            aria-label={"Arrastar para reordenar o widget " + nome}
            className="cursor-grab rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-3 hover:text-fg active:cursor-grabbing"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-soft/60 text-brand">
            <Icone className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-semibold text-fg">{nome}</h3>
            <p className="truncate text-2xs text-fg-subtle">{categoria + " · " + rotuloTipo(item.tipo)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Selecao
            aria-label={"Largura do widget " + nome}
            value={String(item.w)}
            onChange={(e) => onRedimensionar(Number(e.target.value), item.h)}
            className="h-7 w-[74px] py-0 text-2xs"
          >
            {LARGURAS.map((l) => (
              <option key={l} value={l}>
                {l + "/12 col"}
              </option>
            ))}
          </Selecao>
          <Selecao
            aria-label={"Altura do widget " + nome}
            value={String(item.h)}
            onChange={(e) => onRedimensionar(item.w, Number(e.target.value))}
            className="h-7 w-[70px] py-0 text-2xs"
          >
            {ALTURAS.map((a) => (
              <option key={a} value={a}>
                {a + " linhas"}
              </option>
            ))}
          </Selecao>
          <BotaoIcone icone={Trash2} rotulo={"Remover widget " + nome} tamanho="xs" onClick={onRemover} />
        </div>
      </header>
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}

/* ==========================================================================
   Item arrastável do catálogo
   ========================================================================== */

function ItemCatalogo({
  widget,
  adicionado,
  onAdicionar,
}: {
  widget: WidgetCatalogo;
  adicionado: boolean;
  onAdicionar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "cat-" + widget.id,
    data: { origem: "catalogo", widgetId: widget.id },
    disabled: adicionado,
  });
  const Icone = iconeDoWidget(widget);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), touchAction: "none" }}
      className={cn(
        "flex items-center gap-2 rounded-sgp border border-border bg-surface px-2.5 py-2 transition-all",
        !adicionado && "cursor-grab hover:border-brand/50 hover:bg-surface-2 active:cursor-grabbing",
        adicionado && "opacity-55",
        isDragging && "drag-ghost"
      )}
      {...attributes}
      {...listeners}
      title={adicionado ? "Widget já está na composição" : "Arraste para a área de composição"}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-md"
        style={{ backgroundColor: PALETA[0] + "1f", color: PALETA[0] }}
      >
        <Icone className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-fg">{widget.nome}</p>
        <p className="truncate text-2xs text-fg-subtle">{widget.tipo + " · " + widget.tamanho}</p>
      </div>
      {adicionado ? (
        <Check className="size-3.5 shrink-0 text-success" aria-hidden />
      ) : (
        <BotaoIcone
          icone={Plus}
          rotulo={"Adicionar " + widget.nome}
          tamanho="xs"
          onClick={(e) => {
            e.stopPropagation();
            onAdicionar();
          }}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Relatorios() {
  const navegar = useNavigate();
  const { sucesso, erro, alerta } = useAvisos();

  const [widgets, setWidgets] = useState<LayoutWidget[]>([]);
  const [arrastando, setArrastando] = useState<WidgetCatalogo | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>("todas");
  const [modalSalvar, setModalSalvar] = useState(false);
  const [nomeLayout, setNomeLayout] = useState("");
  const [layoutEditando, setLayoutEditando] = useState<LayoutSalvo | null>(null);
  const [confirmacao, setConfirmacao] = useState<{ tipo: "layout" | "relatorio"; id: number; nome: string } | null>(null);
  const [painelRelatorio, setPainelRelatorio] = useState(false);
  const [relatorioEditando, setRelatorioEditando] = useState<RelatorioSalvo | null>(null);
  const [formRelatorio, setFormRelatorio] = useState({
    nome: "",
    descricao: "",
    agendamento: "",
    destinatarios: [] as string[],
  });
  const [novoDestinatario, setNovoDestinatario] = useState("");
  const [filtros, setFiltros] = useState<FiltrosRelatorio>(RECORTE_VAZIO);
  const [geradoEm, setGeradoEm] = useState(() => new Date().toISOString());
  const [origemComposicao, setOrigemComposicao] = useState("");
  const [composicaoBase, setComposicaoBase] = useState(() => assinaturaComposicao([]));
  const [acaoPendente, setAcaoPendente] = useState<AcaoPendente | null>(null);
  const [acaoAposSalvar, setAcaoAposSalvar] = useState<AcaoPendente | null>(null);

  const { setNodeRef: setCanvasRef, isOver: sobreCanvas } = useDroppable({ id: "canvas" });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const ids = useMemo(() => new Set(widgets.map((w) => w.id)), [widgets]);
  const assinaturaAtual = useMemo(() => assinaturaComposicao(widgets), [widgets]);
  const temAlteracoes = assinaturaAtual !== composicaoBase;
  const tem = (id: string) => ids.has(id);
  const usaExecutivo =
    tem("kpi-projetos-status") ||
    tem("kpi-saude") ||
    tem("kpi-orcamento") ||
    tem("kpi-cpi-spi") ||
    tem("projetos-atrasados");
  const usaOcupacao = tem("heatmap-capacidade") || tem("alocacao-ocupacao") || tem("ocupacao");

  /* ---------------------------------------------------------------- dados */

  /* Período invertido não é enviado: os endpoints montam a janela a partir das
     duas pontas e devolveriam um mapa vazio em vez de um recorte. */
  const periodoInvertido = Boolean(filtros.de && filtros.ate && filtros.de > filtros.ate);

  /* Cada parâmetro abaixo usa o nome que o endpoint realmente lê — nada é
     enviado para filtro que o backend ignora. */
  const parametrosRecorte = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (filtros.portfolio) p.portfolio = filtros.portfolio;
    if (filtros.programa) p.program = filtros.programa;
    if (filtros.area) p.area = filtros.area;
    if (filtros.gerente) p.manager = filtros.gerente;
    return p;
  }, [filtros.portfolio, filtros.programa, filtros.area, filtros.gerente]);

  const parametrosExecutivo = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (filtros.portfolio) p.portfolio = filtros.portfolio;
    if (filtros.programa) p.programa = filtros.programa;
    if (filtros.area) p.area = filtros.area;
    if (filtros.gerente) p.manager = filtros.gerente;
    return p;
  }, [filtros.portfolio, filtros.programa, filtros.area, filtros.gerente]);

  const parametrosPeriodo = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (periodoInvertido) return p;
    if (filtros.de) p.inicio = filtros.de;
    if (filtros.ate) p.fim = filtros.ate;
    return p;
  }, [filtros.de, filtros.ate, periodoInvertido]);

  const catalogo = useConsulta<RespostaWidgets>(CHAVES.widgets, "/widgets/");
  // O mapa do catálogo é declarado aqui, e não junto do resto do catálogo mais
  // abaixo, porque a faixa de contexto já precisa dele para nomear os widgets.
  const listaCatalogo = useMemo(() => catalogo.data?.widgets ?? [], [catalogo.data]);
  const porId = useMemo(() => {
    const mapa = new Map<string, WidgetCatalogo>();
    listaCatalogo.forEach((w) => mapa.set(w.id, w));
    return mapa;
  }, [listaCatalogo]);
  const layouts = useLista<LayoutSalvo>(["dashboards"], "/dashboards/");
  const relatorios = useLista<RelatorioSalvo>(CHAVES.relatorios, "/relatorios/");
  // Base sem recorte: alimenta as opções de portfólio, programa, área e gerente.
  const projetosBase = useConsulta<RespostaCards>(CHAVES.projetosCards, "/projetos/cards/");
  const cards = useConsulta<RespostaCards>(CHAVES.projetosCards, "/projetos/cards/", parametrosRecorte);
  const executivo = useConsulta<RespostaExecutivo>(
    CHAVES.dashboardExecutivo,
    "/dashboard/executivo/",
    parametrosExecutivo,
    { enabled: usaExecutivo }
  );

  const listaBase = projetosBase.data?.projetos || [];
  // /projetos/cards/ não aceita o parâmetro project: o recorte por projeto é
  // aplicado sobre a lista já filtrada por portfólio, programa, área e gerente.
  const listaRecorte = useMemo(() => {
    const lista = cards.data?.projetos || [];
    if (!filtros.projeto) return lista;
    return lista.filter((p) => String(p.id) === filtros.projeto);
  }, [cards.data, filtros.projeto]);
  const totalRecorte = filtros.projeto ? listaRecorte.length : cards.data?.total ?? listaRecorte.length;

  const projetoId = useMemo(() => {
    const ativo =
      listaRecorte.find((p) => p.status === "EM_EXECUCAO") || listaRecorte.find((p) => p.status === "APROVADO");
    return (ativo || listaRecorte[0])?.id ?? null;
  }, [listaRecorte]);
  const projetoDoRecorte = useMemo(
    () => listaRecorte.find((p) => String(p.id) === String(projetoId)) || null,
    [listaRecorte, projetoId]
  );

  const evm = useConsulta<RespostaEVM>(
    CHAVES.evm(projetoId),
    projetoId ? "/evm/" + projetoId + "/" : null,
    filtros.ate ? { data: filtros.ate } : {},
    { enabled: tem("curva-s") }
  );
  const dashboardProjeto = useConsulta<RespostaDashboardProjeto>(
    CHAVES.dashboardProjeto(projetoId),
    projetoId ? "/projetos/" + projetoId + "/dashboard/" : null,
    undefined,
    { enabled: tem("burndown") }
  );
  const riscos = useConsulta<RespostaRiscos>(
    CHAVES.dashboardRiscos,
    "/dashboard/riscos/",
    filtros.projeto ? { project: filtros.projeto } : {},
    { enabled: tem("matriz-riscos") }
  );
  const ocupacao = useConsulta<MapaOcupacao>(
    CHAVES.ocupacao,
    "/alocacoes/mapa-ocupacao/",
    parametrosPeriodo,
    { enabled: usaOcupacao }
  );
  const matrizSkills = useConsulta<RespostaMatrizSkills>(
    CHAVES.matrizSkills,
    "/capacidades/perfis/matriz/",
    filtros.area
      ? { area: filtros.area, limite_skills: 12, limite_pessoas: 14 }
      : { limite_skills: 12, limite_pessoas: 14 },
    { enabled: tem("matriz-skills") }
  );
  const gap = useConsulta<RespostaGap>(
    CHAVES.gap,
    "/capacidades/gap/",
    filtros.projeto ? { project: filtros.projeto } : {},
    { enabled: tem("gap-analysis") }
  );
  const busFactor = useConsulta<RespostaBusFactor>(
    CHAVES.busFactor,
    "/capacidades/bus-factor-detect/",
    { salvar: 0 },
    { enabled: tem("bus-factor") }
  );
  const alocacao = useConsulta<RespostaAlocacao>(CHAVES.dashboardAlocacao, "/dashboard/alocacao/", undefined, {
    enabled: tem("aderencia-alocacao"),
  });
  const atividades = useLista<ItemAtividade>(
    CHAVES.atividades,
    "/atividades/",
    filtros.projeto ? { projeto_id: filtros.projeto } : {},
    { enabled: tem("timeline-atividades") }
  );

  /* --------------------------------------------------- opções e faixa de contexto */

  const opcoesPortfolio = useMemo<OpcaoFiltro[]>(() => {
    const mapa = new Map<string, string>();
    listaBase.forEach((p) => {
      if (p.portfolio) mapa.set(String(p.portfolio), p.portfolio_nome || "Portfólio " + p.portfolio);
    });
    return Array.from(mapa.entries())
      .map(([valor, rotulo]) => ({ valor, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  }, [listaBase]);

  const opcoesPrograma = useMemo<OpcaoFiltro[]>(() => {
    const mapa = new Map<string, string>();
    listaBase
      .filter((p) => !filtros.portfolio || String(p.portfolio) === filtros.portfolio)
      .forEach((p) => {
        if (p.program) mapa.set(String(p.program), p.program_nome || "Programa " + p.program);
      });
    return Array.from(mapa.entries())
      .map(([valor, rotulo]) => ({ valor, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  }, [listaBase, filtros.portfolio]);

  const opcoesArea = useMemo<OpcaoFiltro[]>(() => {
    const areas = new Set<string>();
    listaBase
      .filter((p) => !filtros.portfolio || String(p.portfolio) === filtros.portfolio)
      .filter((p) => !filtros.programa || String(p.program) === filtros.programa)
      .forEach((p) => {
        if (p.area) areas.add(p.area);
      });
    return Array.from(areas)
      .sort((a, b) => a.localeCompare(b))
      .map((a) => ({ valor: a, rotulo: a }));
  }, [listaBase, filtros.portfolio, filtros.programa]);

  const opcoesGerente = useMemo<OpcaoFiltro[]>(() => {
    const mapa = new Map<string, string>();
    listaBase
      .filter((p) => !filtros.portfolio || String(p.portfolio) === filtros.portfolio)
      .filter((p) => !filtros.programa || String(p.program) === filtros.programa)
      .filter((p) => !filtros.area || p.area === filtros.area)
      .forEach((p) => {
        if (p.manager) {
          mapa.set(String(p.manager), (p.manager_detalhe && p.manager_detalhe.nome) || "Gerente " + p.manager);
        }
      });
    return Array.from(mapa.entries())
      .map(([valor, rotulo]) => ({ valor, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  }, [listaBase, filtros.portfolio, filtros.programa, filtros.area]);

  const opcoesProjeto = useMemo<OpcaoFiltro[]>(
    () => listaRecorte.map((p) => ({ valor: String(p.id), rotulo: p.codigo + " · " + p.nome })),
    [listaRecorte]
  );

  const recorteAtivo = useMemo<DimensaoRecorte[]>(() => {
    const ativos: DimensaoRecorte[] = [];
    if (filtros.portfolio) ativos.push("portfolio");
    if (filtros.programa) ativos.push("programa");
    if (filtros.area) ativos.push("area");
    if (filtros.gerente) ativos.push("gerente");
    if (filtros.projeto) ativos.push("projeto");
    if ((filtros.de || filtros.ate) && !periodoInvertido) ativos.push("periodo");
    return ativos;
  }, [filtros, periodoInvertido]);

  const algumFiltro = recorteAtivo.length > 0 || periodoInvertido;

  const ressalvasRecorte = useMemo(() => {
    const grupos = new Map<string, string[]>();
    widgets.forEach((item) => {
      const aceita = FILTROS_POR_WIDGET[item.id];
      if (!aceita) return;
      const fora = recorteAtivo.filter((d) => aceita.indexOf(d) < 0);
      if (!fora.length) return;
      const nome = porId.get(item.id)?.nome || item.id;
      const chave = fora.join("|");
      const lista = grupos.get(chave) || [];
      lista.push(nome);
      grupos.set(chave, lista);
    });
    const frases: string[] = [];
    grupos.forEach((nomes, chave) => {
      const dimensoes = chave.split("|").map((d) => ROTULO_DIMENSAO[d as DimensaoRecorte]);
      const plural = nomes.length > 1;
      const sujeito = listarEmTexto(nomes);
      if (dimensoes.length === recorteAtivo.length) {
        frases.push(sujeito + (plural ? " ignoram" : " ignora") + " todo o recorte atual");
      } else {
        frases.push(sujeito + (plural ? " não aplicam" : " não aplica") + " " + listarEmTexto(dimensoes));
      }
    });
    const porProjeto: string[] = [];
    if (ids.has("curva-s")) porProjeto.push("Curva S");
    if (ids.has("burndown")) porProjeto.push("Burndown");
    if (!filtros.projeto && porProjeto.length && projetoDoRecorte) {
      frases.push(
        listarEmTexto(porProjeto) +
          (porProjeto.length > 1 ? " usam " : " usa ") +
          "o projeto " +
          projetoDoRecorte.nome +
          ", o primeiro em execução do recorte"
      );
    }
    if (ids.has("curva-s") && (filtros.de || filtros.ate)) {
      frases.push("A curva S usa apenas a data final do período, como posição de referência do EVM");
    }
    if (recorteAtivo.indexOf("periodo") >= 0) {
      frases.push("O período não entra na contagem de projetos: a listagem de projetos não aceita recorte por datas");
    }
    return frases;
  }, [widgets, ids, recorteAtivo, porId, filtros.projeto, filtros.ate, projetoDoRecorte]);

  const nomeDaOpcao = (opcoes: OpcaoFiltro[], valor: string) => {
    const achou = opcoes.find((o) => o.valor === valor);
    return achou ? achou.rotulo : valor;
  };

  const textoPeriodo = periodoInvertido
    ? "período inválido: " + dataCurta(filtros.de) + " é posterior a " + dataCurta(filtros.ate)
    : filtros.de && filtros.ate
      ? "período de " + dataCurta(filtros.de) + " a " + dataCurta(filtros.ate)
      : filtros.de
        ? "período a partir de " + dataCurta(filtros.de)
        : filtros.ate
          ? "período até " + dataCurta(filtros.ate)
          : "";

  const textoRecorte =
    [
      filtros.projeto
        ? "Projeto " + (projetoDoRecorte?.nome || nomeDaOpcao(opcoesProjeto, filtros.projeto))
        : filtros.portfolio
          ? "Projetos do portfólio " + nomeDaOpcao(opcoesPortfolio, filtros.portfolio)
          : "Projetos de todos os portfólios",
      filtros.programa ? "programa " + nomeDaOpcao(opcoesPrograma, filtros.programa) : "",
      filtros.area ? "área " + filtros.area : "",
      filtros.gerente ? "gerente " + nomeDaOpcao(opcoesGerente, filtros.gerente) : "",
      textoPeriodo,
      recorteAtivo.length === 0 ? "sem filtro: todo o portfólio" : "",
    ]
      .filter(Boolean)
      .join(" · ") +
    " · " +
    numero(totalRecorte) +
    " projeto(s) no recorte";

  const textoOrigem =
    (origemComposicao ? "composição " + origemComposicao : "composição não salva") +
    (temAlteracoes ? " · alterações não salvas" : "");

  const descricaoAcaoPendente = !acaoPendente
    ? ""
    : acaoPendente.tipo === "aplicar"
      ? "aplicar a composição " + acaoPendente.layout.nome
      : acaoPendente.tipo === "padrao"
        ? "definir " + acaoPendente.layout.nome + " como padrão"
        : acaoPendente.tipo === "executar"
          ? "carregar o relatório " + acaoPendente.relatorio.nome
          : acaoPendente.tipo === "limpar"
            ? "limpar a área de composição"
            : "sair da tela de relatórios";

  /* ------------------------------------------------------------ mutações */

  const salvarLayout = useMutacao<{ id?: number; nome: string; widgets_json: LayoutWidget[] }, LayoutSalvo>({
    url: "/dashboards/salvar-widgets/",
    invalidar: [["dashboards"]],
    mensagemSucesso: "Composição salva",
    aoSucesso: (resposta, vars) => {
      setModalSalvar(false);
      setNomeLayout("");
      setLayoutEditando(null);
      setComposicaoBase(assinaturaComposicao(resposta.widgets_json || vars.widgets_json));
      setOrigemComposicao(resposta.nome || vars.nome);
      setGeradoEm(new Date().toISOString());
      if (acaoAposSalvar) {
        const pendente = acaoAposSalvar;
        setAcaoAposSalvar(null);
        executarAcao(pendente);
      }
    },
  });

  const tornarPadrao = useMutacao<{ id: number }, LayoutSalvo>({
    url: (v) => "/dashboards/" + v.id + "/tornar-padrao/",
    invalidar: [["dashboards"]],
    mensagemSucesso: "Layout definido como padrão",
  });

  const excluirLayout = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/dashboards/" + v.id + "/",
    invalidar: [["dashboards"]],
    mensagemSucesso: "Layout excluído",
    aoSucesso: () => setConfirmacao(null),
  });

  const criarRelatorio = useMutacao<
    { nome: string; descricao: string; widgets_json: LayoutWidget[]; agendamento: string; destinatarios: string[] },
    RelatorioSalvo
  >({
    url: "/relatorios/",
    invalidar: [[...CHAVES.relatorios]],
    mensagemSucesso: "Relatório criado",
    aoSucesso: () => setPainelRelatorio(false),
  });

  const atualizarRelatorio = useMutacao<
    { id: number; nome: string; descricao: string; widgets_json: LayoutWidget[]; agendamento: string; destinatarios: string[] },
    RelatorioSalvo
  >({
    metodo: "patch",
    url: (v) => "/relatorios/" + v.id + "/",
    invalidar: [[...CHAVES.relatorios]],
    mensagemSucesso: "Relatório atualizado",
    aoSucesso: () => setPainelRelatorio(false),
  });

  const excluirRelatorio = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/relatorios/" + v.id + "/",
    invalidar: [[...CHAVES.relatorios]],
    mensagemSucesso: "Relatório excluído",
    aoSucesso: () => setConfirmacao(null),
  });

  const executarRelatorio = useMutacao<{ id: number }, RespostaExecucao>({
    url: (v) => "/relatorios/" + v.id + "/executar/",
    mensagemSucesso: "Relatório executado",
    aoSucesso: (resposta) => {
      const composicao = resposta.relatorio.widgets_json || [];
      setWidgets(composicao.map((w) => ({ ...w })));
      setComposicaoBase(assinaturaComposicao(composicao));
      setOrigemComposicao(resposta.relatorio.nome);
      setGeradoEm(new Date().toISOString());
      sucesso("Composição carregada", numero(composicao.length) + " widget(s) aplicados na área de composição.");
    },
  });

  /* ------------------------------------------------------------ catálogo */

  const categorias = useMemo(
    () => Array.from(new Set(listaCatalogo.map((w) => w.categoria))).sort(),
    [listaCatalogo]
  );
  const catalogoVisivel = useMemo(
    () => (categoriaAtiva === "todas" ? listaCatalogo : listaCatalogo.filter((w) => w.categoria === categoriaAtiva)),
    [listaCatalogo, categoriaAtiva]
  );
  const agrupado = useMemo(() => {
    const mapa = new Map<string, WidgetCatalogo[]>();
    catalogoVisivel.forEach((w) => {
      const lista = mapa.get(w.categoria) || [];
      lista.push(w);
      mapa.set(w.categoria, lista);
    });
    return Array.from(mapa.entries());
  }, [catalogoVisivel]);

  /* -------------------------------------------------------------- layout */

  const adicionarWidget = (id: string) => {
    if (ids.has(id)) {
      alerta("Widget já adicionado", "Cada widget aparece uma vez na composição. Redimensione ou reordene o existente.");
      return;
    }
    const widget = porId.get(id);
    if (!widget) return;
    const dimensao = TAMANHOS[widget.tamanho] || TAMANHOS.md;
    setWidgets((atual) => [...atual, { id, tipo: widget.tipo, x: 0, y: atual.length, w: dimensao.w, h: dimensao.h }]);
    sucesso(widget.nome + " adicionado", "Ajuste largura e altura no cabeçalho do widget.");
  };

  const aoIniciarArraste = (evento: DragStartEvent) => {
    const origem = evento.active.data.current as { origem?: string; widgetId?: string } | undefined;
    if (origem?.origem === "catalogo" && origem.widgetId) {
      setArrastando(porId.get(origem.widgetId) || null);
    }
  };

  const aoTerminarArraste = (evento: DragEndEvent) => {
    setArrastando(null);
    const ativoId = String(evento.active.id);
    if (ativoId.indexOf("cat-") === 0) {
      if (!evento.over) return;
      adicionarWidget(ativoId.slice(4));
      return;
    }
    if (evento.over && evento.active.id !== evento.over.id) {
      const alvo = String(evento.over.id);
      const de = widgets.findIndex((w) => w.id === String(evento.active.id));
      const para = widgets.findIndex((w) => w.id === alvo);
      if (de >= 0 && para >= 0) setWidgets(arrayMove(widgets, de, para));
    }
  };

  const redimensionar = (id: string, w: number, h: number) =>
    setWidgets((atual) => atual.map((item) => (item.id === id ? { ...item, w, h } : item)));

  const removerWidget = (id: string) => setWidgets((atual) => atual.filter((item) => item.id !== id));

  /* ------------------------------------------------------------- filtros */

  const carimbar = () => setGeradoEm(new Date().toISOString());

  const atualizarFiltro = (chave: keyof FiltrosRelatorio, valor: string) => {
    setFiltros((atual) => {
      const proximo: FiltrosRelatorio = { ...atual, [chave]: valor };
      // As opções são encadeadas: mudar o nível acima invalida os de baixo.
      if (chave === "portfolio") {
        proximo.programa = "";
        proximo.projeto = "";
      }
      if (chave === "programa" || chave === "area" || chave === "gerente") proximo.projeto = "";
      return proximo;
    });
    carimbar();
  };

  const limparFiltros = () => {
    setFiltros(RECORTE_VAZIO);
    carimbar();
  };

  // Se o projeto escolhido sair do recorte (por troca de área ou gerente), o
  // filtro é limpo em vez de apontar para um projeto invisível na lista.
  useEffect(() => {
    if (!cards.data || !filtros.projeto) return;
    if (listaRecorte.length) return;
    setFiltros((atual) => ({ ...atual, projeto: "" }));
  }, [cards.data, filtros.projeto, listaRecorte.length]);

  // Rede de segurança para recarregar ou fechar a aba com composição pendente.
  useEffect(() => {
    if (!temAlteracoes) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [temAlteracoes]);

  const nomesDaComposicao = (layout: LayoutSalvo) =>
    (layout.widgets_json || []).map((w) => porId.get(w.id)?.nome || w.id);

  const aplicarLayout = (layout: LayoutSalvo) => {
    const composicao = (layout.widgets_json || []).map((w) => ({ ...w }));
    setWidgets(composicao);
    setComposicaoBase(assinaturaComposicao(composicao));
    setOrigemComposicao(layout.nome);
    setGeradoEm(new Date().toISOString());
    sucesso("Layout aplicado", layout.nome + " · " + numero(composicao.length) + " widget(s).");
  };

  const limparComposicao = () => {
    setWidgets([]);
    setComposicaoBase(assinaturaComposicao([]));
    setOrigemComposicao("");
    setGeradoEm(new Date().toISOString());
    sucesso("Composição limpa", "A área de composição foi esvaziada.");
  };

  /* Ação interrompida pelo aviso de alterações não salvas. Só executa depois
     que o usuário escolhe salvar ou descartar. */
  const executarAcao = (acao: AcaoPendente) => {
    setAcaoPendente(null);
    if (acao.tipo === "aplicar") aplicarLayout(acao.layout);
    else if (acao.tipo === "padrao") tornarPadrao.mutate({ id: acao.layout.id });
    else if (acao.tipo === "executar") executarRelatorio.mutate({ id: acao.relatorio.id });
    else if (acao.tipo === "limpar") limparComposicao();
    else navegar("/");
  };

  const solicitar = (acao: AcaoPendente) => {
    if (temAlteracoes) setAcaoPendente(acao);
    else executarAcao(acao);
  };

  const salvarEContinuar = () => {
    setAcaoAposSalvar(acaoPendente);
    setAcaoPendente(null);
    setLayoutEditando(null);
    setNomeLayout(origemComposicao || "Meu relatório");
    setModalSalvar(true);
  };

  const fecharSalvar = () => {
    setModalSalvar(false);
    setAcaoAposSalvar(null);
  };

  const abrirSalvar = (layout?: LayoutSalvo) => {
    setLayoutEditando(layout || null);
    setNomeLayout(layout?.nome || "Meu relatório");
    setModalSalvar(true);
  };

  const abrirRelatorio = (relatorio?: RelatorioSalvo) => {
    setRelatorioEditando(relatorio || null);
    setFormRelatorio({
      nome: relatorio?.nome || "",
      descricao: relatorio?.descricao || "",
      agendamento: relatorio?.agendamento || "",
      destinatarios: relatorio?.destinatarios || [],
    });
    setNovoDestinatario("");
    setPainelRelatorio(true);
  };

  const salvarRelatorio = () => {
    if (!formRelatorio.nome.trim()) {
      erro("Informe o nome do relatório");
      return;
    }
    const corpo = {
      nome: formRelatorio.nome.trim(),
      descricao: formRelatorio.descricao,
      agendamento: formRelatorio.agendamento,
      destinatarios: formRelatorio.destinatarios,
      widgets_json: widgets,
    };
    if (relatorioEditando) atualizarRelatorio.mutate({ id: relatorioEditando.id, ...corpo });
    else criarRelatorio.mutate(corpo);
  };

  const adicionarDestinatario = () => {
    const valor = novoDestinatario.trim();
    if (!valor) return;
    if (formRelatorio.destinatarios.indexOf(valor) >= 0) {
      alerta("Destinatário já incluído");
      return;
    }
    setFormRelatorio((atual) => ({ ...atual, destinatarios: [...atual.destinatarios, valor] }));
    setNovoDestinatario("");
  };

  /* ----------------------------------------------------- conteúdo widgets */

  const dadosExecutivo = executivo.data;
  const fatiasStatus: FatiaDonut[] = (dadosExecutivo?.por_status || [])
    .filter((s) => s.total > 0)
    .map((s, i) => ({ rotulo: s.rotulo, valor: s.total, cor: PALETA[i % PALETA.length] }));
  const fatiasSaude: FatiaDonut[] = (dadosExecutivo?.por_saude || [])
    .filter((s) => s.total > 0)
    .map((s) => ({
      rotulo: CORES_SAUDE[s.saude]?.rotulo || s.rotulo,
      valor: s.total,
      cor: CORES_SAUDE[s.saude]?.cor || "#94A3B8",
    }));
  const barrasOrcamento: BarraItem[] = dadosExecutivo
    ? [
        { rotulo: "Planejado (BAC)", valor: dadosExecutivo.financeiro.orcamento_planejado, cor: "#2563EB" },
        { rotulo: "Realizado (AC)", valor: dadosExecutivo.financeiro.custo_realizado, cor: "#F59E0B" },
        { rotulo: "Saldo", valor: Math.max(0, dadosExecutivo.financeiro.saldo), cor: "#10B981" },
        { rotulo: "Receita prevista", valor: dadosExecutivo.financeiro.receita_prevista, cor: "#8B5CF6" },
      ]
    : [];

  const pontosCurva = evm.data?.curva_s?.pontos || [];
  const pontosBurndown = dashboardProjeto.data?.burndown?.pontos || [];

  const semanasOcupacao = ocupacao.data?.semanas || [];
  const linhasOcupacao = (ocupacao.data?.linhas || []).slice(0, 12);
  const celulasOcupacao = useMemo(() => {
    const mapa = new Map<string, CelulaOcupacao>();
    linhasOcupacao.forEach((linha) => linha.celulas.forEach((c) => mapa.set(linha.user_id + "|" + c.semana, c)));
    return mapa;
  }, [linhasOcupacao]);

  const linhasMatriz = (matrizSkills.data?.linhas || []).slice(0, 12);
  const colunasMatriz = (matrizSkills.data?.colunas || []).slice(0, 12);
  const celulasMatriz = useMemo(() => {
    const mapa = new Map<string, number>();
    linhasMatriz.forEach((linha) => linha.celulas.forEach((c) => mapa.set(linha.user_id + "|" + c.skill_id, c.consolidado)));
    return mapa;
  }, [linhasMatriz]);

  const celulasRisco = useMemo(() => {
    const mapa = new Map<string, CelulaMatrizRiscoResumo>();
    (riscos.data?.matriz_resumo || []).forEach((c) => mapa.set(c.probabilidade + "-" + c.impacto, c));
    return mapa;
  }, [riscos.data]);

  const conteudoWidget = (item: LayoutWidget): ReactNode => {
    switch (item.id) {
      case "kpi-projetos-status":
        return executivo.isLoading ? (
          <Esqueleto linhas={4} />
        ) : (
          <GraficoDonut
            fatias={fatiasStatus}
            tamanho={150}
            espessura={20}
            centroRotulo="projetos"
            centroValor={dadosExecutivo?.resumo.total_projetos ?? 0}
          />
        );
      case "kpi-saude":
        return executivo.isLoading ? (
          <Esqueleto linhas={4} />
        ) : (
          <GraficoDonut
            fatias={fatiasSaude}
            tamanho={150}
            espessura={20}
            centroRotulo="avaliados"
            centroValor={dadosExecutivo?.resumo.total_projetos ?? 0}
          />
        );
      case "kpi-orcamento":
        return executivo.isLoading ? (
          <Esqueleto linhas={4} />
        ) : (
          <div className="space-y-3">
            <GraficoBarras itens={barrasOrcamento} horizontal formatarValor={(v) => moeda(v, true)} />
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom="info">Consumo {percentual(dadosExecutivo?.financeiro.consumo_percentual ?? 0, 1)}</Etiqueta>
              <Etiqueta tom="neutral">Saldo {moeda(dadosExecutivo?.financeiro.saldo ?? 0, true)}</Etiqueta>
            </div>
          </div>
        );
      case "kpi-cpi-spi":
        return executivo.isLoading ? (
          <Esqueleto linhas={4} />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Medidor valor={dadosExecutivo?.financeiro.cpi_medio ?? 1} titulo="CPI médio" tamanho={132} />
            <Medidor valor={dadosExecutivo?.financeiro.spi_medio ?? 1} titulo="SPI médio" tamanho={132} />
          </div>
        );
      case "curva-s":
        if (!projetoId) return <Vazio icone={TrendingUp} titulo="Nenhum projeto ativo" descricao="A curva S usa o primeiro projeto em execução do portfólio." />;
        if (evm.isLoading) return <CarregandoBloco rotulo="Carregando curva S..." />;
        if (!pontosCurva.length) return <Vazio icone={TrendingUp} titulo="Sem dados de EVM" descricao="O projeto selecionado ainda não possui datas ou tarefas suficientes." />;
        return (
          <div className="space-y-2">
            <p className="text-2xs text-fg-muted">
              {(evm.data?.projeto.nome || "") + " (" + (evm.data?.projeto.codigo || "") + ")"}
            </p>
            <GraficoLinha
              rotulos={pontosCurva.map((p) => p.rotulo)}
              series={[
                { nome: "PV", cor: "#2563EB", dados: pontosCurva.map((p) => Number(p.PV)) },
                { nome: "EV", cor: "#10B981", dados: pontosCurva.map((p) => Number(p.EV)) },
                { nome: "AC", cor: "#F59E0B", dados: pontosCurva.map((p) => Number(p.AC)) },
              ]}
              altura={item.h * 104 + 40}
              formatarValor={(v) => moeda(v, true)}
            />
          </div>
        );
      case "burndown":
        if (!projetoId) return <Vazio icone={TrendingDown} titulo="Nenhum projeto ativo" descricao="O burndown usa o primeiro projeto em execução do portfólio." />;
        if (dashboardProjeto.isLoading) return <CarregandoBloco rotulo="Carregando burndown..." />;
        if (!pontosBurndown.length) return <Vazio icone={TrendingDown} titulo="Sem dados de burndown" descricao="Cadastre tarefas com datas e esforço para projetar o burndown." />;
        return (
          <GraficoLinha
            rotulos={pontosBurndown.map((p) => dataCurta(p.data))}
            series={[
              { nome: "Restante real", cor: "#2563EB", dados: pontosBurndown.map((p) => Number(p.restante)) },
              { nome: "Restante ideal", cor: "#94A3B8", dados: pontosBurndown.map((p) => Number(p.restante_ideal)), tracejada: true },
              { nome: "Realizado", cor: "#10B981", dados: pontosBurndown.map((p) => Number(p.realizado)), area: true },
            ]}
            altura={item.h * 104 + 40}
            formatarValor={(v) => numero(v, 0) + " h"}
          />
        );
      case "matriz-riscos": {
        if (riscos.isLoading) return <CarregandoBloco rotulo="Carregando matriz..." />;
        const probabilidades = [5, 4, 3, 2, 1];
        const impactos = [1, 2, 3, 4, 5];
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="w-5" />
              {impactos.map((i) => (
                <span key={i} className="flex-1 text-center text-2xs text-fg-muted">{i}</span>
              ))}
            </div>
            {probabilidades.map((p) => (
              <div key={p} className="flex items-center gap-1">
                <span className="w-5 text-center text-2xs text-fg-muted">{p}</span>
                {impactos.map((i) => {
                  const celula = celulasRisco.get(p + "-" + i);
                  const total = celula?.total ?? 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navegar("/riscos")}
                      title={(celula?.nivel || "Sem riscos") + " · severidade " + (celula?.severidade ?? p * i)}
                      className="grid h-9 flex-1 place-items-center rounded-sm text-2xs font-bold transition-transform hover:scale-105"
                      style={{
                        backgroundColor: total ? celula?.cor || "#94A3B8" : "var(--sgp-surface-3)",
                        color: total ? "#fff" : "var(--sgp-fg-subtle)",
                      }}
                    >
                      {total || "-"}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-2xs text-fg-muted">Probabilidade (linhas) × impacto (colunas)</span>
              <Etiqueta tom="warning">{numero(riscos.data?.total_riscos ?? 0) + " riscos abertos"}</Etiqueta>
            </div>
          </div>
        );
      }
      case "heatmap-capacidade":
      case "alocacao-ocupacao":
      case "ocupacao":
        if (ocupacao.isLoading) return <CarregandoBloco rotulo="Carregando ocupação..." />;
        if (!linhasOcupacao.length) return <Vazio icone={Users} titulo="Sem alocações confirmadas" descricao="Confirme alocações para visualizar o mapa de ocupação." />;
        return (
          <Heatmap
            linhas={linhasOcupacao.map((l) => ({
              id: l.user_id,
              rotulo: l.nome,
              sub: l.area,
              cor: l.cor,
              avatar: <Avatar nome={l.nome} cor={l.cor} iniciais={l.iniciais} tamanho="xs" />,
            }))}
            colunas={semanasOcupacao.map((s) => ({ id: s.semana, rotulo: s.rotulo }))}
            celulas={(linhaId, colunaId) => {
              const celula = celulasOcupacao.get(String(linhaId) + "|" + String(colunaId));
              return {
                valor: celula?.valor ?? 0,
                rotulo: numero(celula?.valor ?? 0, 0) + "% alocado",
                cor: corOcupacao(celula?.valor ?? 0),
                detalhe: (
                  <div className="space-y-0.5">
                    <p className="font-semibold text-fg">{numero(celula?.valor ?? 0, 0) + "% alocado"}</p>
                    {(celula?.projetos || []).map((p) => (
                      <p key={p} className="text-fg-muted">{p}</p>
                    ))}
                  </div>
                ),
              };
            }}
            maximo={120}
            formatoValor={(v) => (v ? numero(v, 0) : "-")}
            corDe={corOcupacao}
            larguraColuna={30}
            larguraLinha={150}
            compacto
            legenda={
              <EscalaCores
                titulo="Ocupação"
                rotulos={["0", "50", "80", "100", "120+"]}
                cores={["#10B981", "#84CC16", "#F59E0B", "#EF4444", "#7F1D1D"]}
              />
            }
          />
        );
      case "matriz-skills":
        if (matrizSkills.isLoading) return <CarregandoBloco rotulo="Carregando matriz de capacidades..." />;
        if (!linhasMatriz.length || !colunasMatriz.length) return <Vazio icone={Table} titulo="Sem perfis de capacidade" descricao="Cadastre capacidades e perfis para montar a matriz." />;
        return (
          <Heatmap
            linhas={linhasMatriz.map((l) => ({
              id: l.user_id,
              rotulo: l.nome,
              sub: l.area,
              cor: l.cor,
              avatar: <Avatar nome={l.nome} cor={l.cor} iniciais={l.iniciais} tamanho="xs" />,
            }))}
            colunas={colunasMatriz.map((c) => ({ id: c.skill_id, rotulo: c.nome, cor: c.cor }))}
            celulas={(linhaId, colunaId) => {
              const nivel = celulasMatriz.get(String(linhaId) + "|" + String(colunaId)) ?? 0;
              return {
                valor: nivel,
                rotulo: "Nível consolidado " + indice(nivel, 2),
                cor: nivel ? corNivel(nivel) : undefined,
                detalhe: <p className="font-semibold text-fg">Nível {indice(nivel, 2)}</p>,
              };
            }}
            maximo={5}
            larguraColuna={30}
            larguraLinha={150}
            compacto
            legenda={<EscalaCores titulo="Nível" rotulos={["1", "2", "3", "4", "5"]} cores={["#334155", "#0369a1", "#0891b2", "#059669", "#7c3aed"]} />}
          />
        );
      case "gap-analysis": {
        if (gap.isLoading) return <CarregandoBloco rotulo="Carregando gap de capacidades..." />;
        const itens = (gap.data?.itens || []).slice(0, 10);
        if (!itens.length) return <Vazio icone={Target} titulo="Nenhum requisito pendente" descricao="Defina requisitos de capacidade nos projetos para acompanhar o gap." />;
        return (
          <div className="space-y-3">
            <GraficoBarras
              itens={itens.map((i) => ({
                rotulo: i.skill,
                valor: i.deficit,
                comparativo: i.atendem,
                cor: corPorValor(1 - Math.min(1, i.deficit / Math.max(1, i.quantidade)), true),
              }))}
              horizontal
              formatarValor={(v) => numero(v, 0) + " pessoa(s)"}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom="info">Cobertura {percentual(gap.data?.resumo.indice_cobertura ?? 0, 1)}</Etiqueta>
              <Etiqueta tom="danger">{numero(gap.data?.resumo.obrigatorios_pendentes ?? 0) + " obrigatórios pendentes"}</Etiqueta>
            </div>
          </div>
        );
      }
      case "bus-factor": {
        if (busFactor.isLoading) return <CarregandoBloco rotulo="Carregando bus factor..." />;
        const alertas = (busFactor.data?.alertas || []).slice(0, 6);
        if (!alertas.length) return <Vazio icone={ShieldAlert} titulo="Nenhuma capacidade em risco" descricao="Todas as capacidades críticas possuem mais de um especialista." />;
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom="danger">{numero(busFactor.data?.resumo.sem_detentor ?? 0) + " sem detentor"}</Etiqueta>
              <Etiqueta tom="warning">{numero(busFactor.data?.resumo.um_detentor ?? 0) + " com um detentor"}</Etiqueta>
            </div>
            {alertas.map((a) => (
              <div key={a.skill_id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2 py-1.5">
                <Etiqueta cor={a.cor} icone={ShieldAlert}>{a.skill}</Etiqueta>
                <span className="h-px flex-1 bg-border-strong" aria-hidden />
                <span className="text-2xs text-fg-muted">{numero(a.total_projetos_dependentes) + " proj."}</span>
                {a.detentores.length ? (
                  <PilhaAvatares
                    pessoas={a.detentores.map((d) => ({ id: d.user_id, nome: d.nome, cor: d.cor }))}
                    maximo={4}
                    tamanho="xs"
                  />
                ) : (
                  <Etiqueta tom="danger">Sem especialista</Etiqueta>
                )}
              </div>
            ))}
          </div>
        );
      }
      case "projetos-atrasados": {
        if (executivo.isLoading) return <CarregandoBloco rotulo="Carregando projetos atrasados..." />;
        const atrasados = dadosExecutivo?.projetos_atrasados || [];
        if (!atrasados.length) return <Vazio icone={Check} titulo="Nenhum projeto atrasado" descricao="Todo o portfólio está dentro do prazo planejado." />;
        return (
          <ul className="space-y-2">
            {atrasados.slice(0, 6).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navegar("/projetos/" + p.id)}
                  className="w-full rounded-sgp border border-border bg-surface-2 px-2.5 py-2 text-left transition-colors hover:border-brand/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-fg">{p.nome}</span>
                    <Etiqueta tom="danger">{numero(p.dias_atraso) + " dias"}</Etiqueta>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Semaforo saude={p.saude} comRotulo={false} tamanho="sm" />
                    <div className="flex-1">
                      <BarraProgresso valor={p.percentual} comparativo={p.progresso_planejado} altura="sm" />
                    </div>
                    <span className="shrink-0 text-2xs tabular-nums text-fg-muted">{percentual(p.percentual, 0)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        );
      }
      case "aderencia-alocacao":
        if (alocacao.isLoading) return <CarregandoBloco rotulo="Carregando aderência..." />;
        return (
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Medidor
              valor={(alocacao.data?.aderencia_media ?? 0) / 100}
              titulo="Aderência média"
              tamanho={132}
              formato={(v) => percentual(v * 100, 1)}
            />
            <div className="space-y-1.5 text-2xs">
              <p className="text-fg-muted">{"Alocações: " + numero(alocacao.data?.total_alocacoes ?? 0)}</p>
              <p className="text-fg-muted">{"Override manual: " + percentual(alocacao.data?.taxa_override ?? 0, 1)}</p>
              <p className="text-fg-muted">{"Recomendações aceitas: " + numero(alocacao.data?.recomendacoes.aceitas ?? 0)}</p>
              <p className="text-fg-muted">{"Sugeridas: " + numero(alocacao.data?.recomendacoes.sugeridas ?? 0)}</p>
            </div>
          </div>
        );
      case "timeline-atividades": {
        if (atividades.isLoading) return <CarregandoBloco rotulo="Carregando atividades..." />;
        const lista = atividades.data || [];
        if (!lista.length) return <Vazio icone={History} titulo="Nenhuma atividade registrada" descricao="As ações recentes da equipe aparecerão aqui." />;
        return (
          <ol className="space-y-2">
            {lista.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <Avatar nome={a.user_nome} cor={a.user_cor} tamanho="xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-fg">
                    <span className="font-medium">{a.user_nome}</span>
                    {" " + a.verbo + " "}
                    <span className="text-fg-muted">{a.entidade_nome || a.entidade}</span>
                  </p>
                  <p className="text-2xs text-fg-subtle" title={dataHora(a.criado_em)}>{dataRelativa(a.criado_em)}</p>
                </div>
              </li>
            ))}
          </ol>
        );
      }
      case "gantt-portfolio": {
        if (cards.isLoading) return <CarregandoBloco rotulo="Carregando cronograma do portfólio..." />;
        const projetos = (cards.data ? cards.data.projetos : []).slice(0, 8);
        if (!projetos.length) {
          return (
            <Vazio
              icone={CalendarRange}
              titulo="Nenhum projeto no portfólio"
              descricao="Cadastre projetos com datas de início e fim para visualizar o cronograma macro."
            />
          );
        }
        const periodos: Array<{ inicio: number; fim: number }> = [];
        projetos.forEach((p) => {
          if (p.data_inicio && p.data_fim) {
            periodos.push({ inicio: Date.parse(p.data_inicio), fim: Date.parse(p.data_fim) });
          }
        });
        const min = periodos.length ? Math.min.apply(null, periodos.map((t) => t.inicio)) : 0;
        const max = periodos.length ? Math.max.apply(null, periodos.map((t) => t.fim)) : 1;
        const faixa = Math.max(1, max - min);
        return (
          <div className="space-y-2">
            {projetos.map((p) => {
              const inicio = p.data_inicio ? Date.parse(p.data_inicio) : null;
              const fim = p.data_fim ? Date.parse(p.data_fim) : null;
              const esquerda = inicio !== null ? ((inicio - min) / faixa) * 100 : 0;
              const largura = inicio !== null && fim !== null ? Math.max(2, ((fim - inicio) / faixa) * 100) : 4;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navegar("/projetos/" + p.id)}
                  className="w-full text-left"
                  title={"Abrir " + p.nome}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-2xs text-fg">{p.nome}</span>
                    <span className="shrink-0 text-2xs tabular-nums text-fg-muted">
                      {dataCurta(p.data_inicio) + " → " + dataCurta(p.data_fim)}
                    </span>
                  </div>
                  <span className="relative mt-1 block h-3 w-full overflow-hidden rounded-full bg-surface-3">
                    <span
                      className="absolute inset-y-0 rounded-full"
                      style={{ left: esquerda + "%", width: largura + "%", backgroundColor: p.cor || "#2563EB" }}
                    />
                  </span>
                </button>
              );
            })}
            <Botao tamanho="xs" variante="fantasma" icone={CalendarRange} onClick={() => navegar("/timeline")}>
              Abrir timeline completa do portfólio
            </Botao>
          </div>
        );
      }
      default:
        return (
          <Vazio
            icone={LayoutDashboard}
            titulo="Widget sem visualização"
            descricao="Este widget do catálogo ainda não possui renderização nesta tela."
          />
        );
    }
  };

  /* ---------------------------------------------------------------- saída */

  const carregandoCatalogo = catalogo.isLoading;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Relatórios customizáveis"
        subtitulo="Monte painéis arrastando widgets, salve composições e agende relatórios"
        icone={LayoutDashboard}
        cor="#2563EB"
        migalhas={[{ rotulo: "Início", onClick: () => solicitar({ tipo: "sair" }) }, { rotulo: "Relatórios" }]}
        acoes={
          <div className="no-print flex flex-wrap items-center gap-2">
            <Botao variante="secundario" icone={Save} onClick={() => abrirSalvar()}>
              Salvar composição
            </Botao>
            <Botao variante="secundario" icone={Printer} onClick={() => window.print()}>
              Imprimir
            </Botao>
            <Botao variante="primario" icone={FileText} onClick={() => abrirRelatorio()}>
              Novo relatório
            </Botao>
          </div>
        }
      />

      {catalogo.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o catálogo de widgets">
          {mensagemErro(catalogo.error)}
        </Alerta>
      )}

      <BarraFerramentas className="no-print">
        <Filter className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
        <FiltroSelect
          rotulo="Portfólio"
          valor={filtros.portfolio}
          onChange={(valor) => atualizarFiltro("portfolio", valor)}
          opcoes={opcoesPortfolio}
          icone={Briefcase}
        />
        <FiltroSelect
          rotulo="Programa"
          valor={filtros.programa}
          onChange={(valor) => atualizarFiltro("programa", valor)}
          opcoes={opcoesPrograma}
          icone={Layers}
        />
        <FiltroSelect
          rotulo="Projeto"
          valor={filtros.projeto}
          onChange={(valor) => atualizarFiltro("projeto", valor)}
          opcoes={opcoesProjeto}
          icone={FolderKanban}
        />
        <FiltroSelect
          rotulo="Área"
          valor={filtros.area}
          onChange={(valor) => atualizarFiltro("area", valor)}
          opcoes={opcoesArea}
          icone={Building2}
        />
        <FiltroSelect
          rotulo="Gerente"
          valor={filtros.gerente}
          onChange={(valor) => atualizarFiltro("gerente", valor)}
          opcoes={opcoesGerente}
          icone={UserCheck}
        />
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <span className="text-2xs font-medium text-fg-muted">Período</span>
          <Entrada
            type="date"
            aria-label="Período — data inicial"
            title="Data inicial do período"
            value={filtros.de}
            onChange={(e) => atualizarFiltro("de", e.target.value)}
            className="h-8 w-[136px] py-0 text-xs"
          />
          <span className="text-2xs text-fg-muted">a</span>
          <Entrada
            type="date"
            aria-label="Período — data final"
            title="Data final do período"
            value={filtros.ate}
            onChange={(e) => atualizarFiltro("ate", e.target.value)}
            className="h-8 w-[136px] py-0 text-xs"
          />
        </span>
        <Botao
          tamanho="xs"
          variante="fantasma"
          icone={RotateCcw}
          onClick={limparFiltros}
          disabled={!algumFiltro}
        >
          Limpar filtros
        </Botao>
      </BarraFerramentas>

      <section
        aria-label="Recorte do relatório"
        className="rounded-sgp-lg border border-border bg-surface-2 px-3 py-2 shadow-n1"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Filter className="size-3.5 shrink-0 text-brand" aria-hidden />
          <h2 className="text-xs font-semibold text-fg">Recorte do relatório</h2>
          <p className="text-xs text-fg-muted">{textoRecorte}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Etiqueta tom={temAlteracoes ? "warning" : "neutral"} icone={LayoutDashboard}>
            {textoOrigem}
          </Etiqueta>
          <Etiqueta tom="neutral" icone={CalendarRange}>{"gerado em " + dataHora(geradoEm)}</Etiqueta>
          <Etiqueta tom="brand">{numero(widgets.length) + " widget(s) na composição"}</Etiqueta>
        </div>
        {periodoInvertido && (
          <p className="mt-1.5 flex items-start gap-1.5 text-2xs text-danger">
            <Info className="mt-px size-3 shrink-0" aria-hidden />
            <span>
              {"Período invertido: " +
                dataCurta(filtros.de) +
                " é posterior a " +
                dataCurta(filtros.ate) +
                ". Ajuste as datas — enquanto isso o período não é aplicado aos widgets."}
            </span>
          </p>
        )}
        {ressalvasRecorte.length > 0 && (
          <p className="mt-1.5 flex items-start gap-1.5 text-2xs text-warning">
            <Info className="mt-px size-3 shrink-0" aria-hidden />
            <span>{"Fora do recorte: " + ressalvasRecorte.join("; ") + "."}</span>
          </p>
        )}
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={aoIniciarArraste}
        onDragEnd={aoTerminarArraste}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
          <aside className="no-print space-y-3">
            <div className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-fg">Catálogo de widgets</h2>
                <Etiqueta tom="neutral">{numero(listaCatalogo.length)}</Etiqueta>
              </div>
              <Selecao
                aria-label="Filtrar por categoria"
                value={categoriaAtiva}
                onChange={(e) => setCategoriaAtiva(e.target.value)}
                className="mb-2 h-8 py-0 text-xs"
              >
                <option value="todas">Todas as categorias</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Selecao>
              {carregandoCatalogo ? (
                <Esqueleto linhas={6} />
              ) : (
                <div className="max-h-[420px] space-y-3 overflow-y-auto scroll-thin pr-1">
                  {agrupado.map(([categoria, itens]) => (
                    <div key={categoria} className="space-y-1.5">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{categoria}</p>
                      {itens.map((w) => (
                        <ItemCatalogo key={w.id} widget={w} adicionado={ids.has(w.id)} onAdicionar={() => adicionarWidget(w.id)} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-2xs text-fg-subtle">
                Arraste um widget para a área de composição ou use o botão de adicionar.
              </p>
            </div>

            <SecaoColapsavel titulo="Composições salvas" icone={Save} contagem={(layouts.data || []).length} abertoInicial>
              {layouts.isLoading ? (
                <Esqueleto linhas={3} />
              ) : (layouts.data || []).length === 0 ? (
                <Vazio icone={LayoutDashboard} titulo="Nenhuma composição salva" descricao="Salve a composição atual para reutilizá-la depois." />
              ) : (
                <ul className="space-y-2">
                  {(layouts.data || []).map((l) => {
                    const nomes = nomesDaComposicao(l);
                    return (
                    <li key={l.id} className="rounded-sgp border border-border bg-surface-2 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-fg">{l.nome}</span>
                        {l.is_default && <Etiqueta tom="success" icone={Check}>padrão</Etiqueta>}
                      </div>
                      <p className="mt-0.5 text-2xs text-fg-subtle">
                        {numero((l.widgets_json || []).length) + " widget(s) · " + dataRelativa(l.atualizado_em)}
                      </p>
                      <p className="mt-0.5 truncate text-2xs text-fg-muted" title={nomes.join(" · ")}>
                        {nomes.slice(0, 3).join(" · ") + (nomes.length > 3 ? " +" + (nomes.length - 3) : "")}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Botao tamanho="xs" variante="fantasma" icone={LayoutDashboard} onClick={() => solicitar({ tipo: "aplicar", layout: l })}>
                          Aplicar
                        </Botao>
                        <Botao tamanho="xs" variante="fantasma" icone={Save} onClick={() => abrirSalvar(l)}>
                          Sobrescrever
                        </Botao>
                        {!l.is_default && (
                          <Botao tamanho="xs" variante="fantasma" icone={Check} onClick={() => solicitar({ tipo: "padrao", layout: l })}>
                            Padrão
                          </Botao>
                        )}
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={"Excluir composição " + l.nome}
                          tamanho="xs"
                          onClick={() => setConfirmacao({ tipo: "layout", id: l.id, nome: l.nome })}
                        />
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </SecaoColapsavel>

            <SecaoColapsavel titulo="Relatórios salvos" icone={FileText} contagem={(relatorios.data || []).length} abertoInicial={false}>
              {relatorios.isLoading ? (
                <Esqueleto linhas={3} />
              ) : (relatorios.data || []).length === 0 ? (
                <Vazio icone={FileText} titulo="Nenhum relatório criado" descricao="Crie relatórios com agendamento e destinatários a partir da composição atual." />
              ) : (
                <ul className="space-y-2">
                  {(relatorios.data || []).map((r) => {
                    const nomes = (r.widgets_json || []).map((w) => porId.get(w.id)?.nome || w.id);
                    return (
                    <li key={r.id} className="rounded-sgp border border-border bg-surface-2 p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-fg">{r.nome}</p>
                          <p className="truncate text-2xs text-fg-subtle">{r.descricao || "Sem descrição"}</p>
                        </div>
                        <Etiqueta tom="neutral">{numero((r.widgets_json || []).length) + " wid."}</Etiqueta>
                      </div>
                      <p className="mt-0.5 truncate text-2xs text-fg-muted" title={nomes.join(" · ")}>
                        {nomes.slice(0, 3).join(" · ") + (nomes.length > 3 ? " +" + (nomes.length - 3) : "")}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {r.agendamento && <Etiqueta tom="info" icone={CalendarRange}>{r.agendamento}</Etiqueta>}
                        {r.destinatarios.length > 0 && (
                          <Etiqueta tom="brand" icone={Mail}>{numero(r.destinatarios.length) + " destinatário(s)"}</Etiqueta>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Botao
                          tamanho="xs"
                          variante="fantasma"
                          icone={Activity}
                          carregando={executarRelatorio.isPending}
                          onClick={() => solicitar({ tipo: "executar", relatorio: r })}
                        >
                          Executar
                        </Botao>
                        <Botao tamanho="xs" variante="fantasma" icone={FileText} onClick={() => abrirRelatorio(r)}>
                          Editar
                        </Botao>
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={"Excluir relatório " + r.nome}
                          tamanho="xs"
                          onClick={() => setConfirmacao({ tipo: "relatorio", id: r.id, nome: r.nome })}
                        />
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </SecaoColapsavel>
          </aside>

          <section
            ref={setCanvasRef}
            className={cn(
              "rounded-sgp-lg border border-dashed border-border bg-bg-alt/60 p-3",
              sobreCanvas && "border-brand bg-brand-soft/20"
            )}
          >
            <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-fg">Área de composição</h2>
                <Etiqueta tom="brand">{numero(widgets.length) + " widget(s)"}</Etiqueta>
                <Etiqueta tom="neutral">grade de 12 colunas</Etiqueta>
                {temAlteracoes && <Etiqueta tom="warning">alterações não salvas</Etiqueta>}
              </div>
              <div className="flex items-center gap-2">
                <Dica texto="A largura varia de 3 a 12 colunas e a altura de 2 a 4 linhas.">
                  <span className="text-2xs text-fg-muted">Redimensione pelos controles do widget</span>
                </Dica>
                <Botao
                  tamanho="xs"
                  variante="fantasma"
                  icone={X}
                  onClick={() => solicitar({ tipo: "limpar" })}
                  disabled={!widgets.length}
                >
                  Limpar
                </Botao>
              </div>
            </div>

            {widgets.length === 0 ? (
              <Vazio
                icone={LayoutDashboard}
                titulo="Composição vazia"
                descricao="Arraste widgets do catálogo à esquerda para montar o seu painel. Tudo é renderizado com dados reais da API."
              />
            ) : (
              <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  {widgets.map((item) => {
                    const meta = porId.get(item.id);
                    return (
                      <CartaoWidget
                        key={item.id}
                        item={item}
                        nome={meta?.nome || item.id}
                        categoria={meta?.categoria || "Widget"}
                        icone={meta ? iconeDoWidget(meta) : LayoutDashboard}
                        onRemover={() => removerWidget(item.id)}
                        onRedimensionar={(w, h) => redimensionar(item.id, w, h)}
                      >
                        {conteudoWidget(item)}
                      </CartaoWidget>
                    );
                  })}
                </div>
              </SortableContext>
            )}
          </section>
        </div>

        <DragOverlay>
          {arrastando ? (
            <div className="flex items-center gap-2 rounded-sgp border border-brand bg-surface px-3 py-2 shadow-n3">
              {(() => {
                const Icone = iconeDoWidget(arrastando);
                return <Icone className="size-4 text-brand" aria-hidden />;
              })()}
              <span className="text-xs font-medium text-fg">{arrastando.nome}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal
        aberto={modalSalvar}
        onFechar={fecharSalvar}
        titulo={layoutEditando ? "Sobrescrever composição" : "Salvar composição"}
        subtitulo={
          acaoAposSalvar
            ? numero(widgets.length) + " widget(s) · depois de salvar, a ação pendente continua"
            : numero(widgets.length) + " widget(s) na área de composição"
        }
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={fecharSalvar}>Cancelar</Botao>
            <Botao
              variante="primario"
              icone={Save}
              carregando={salvarLayout.isPending}
              onClick={() => {
                if (!nomeLayout.trim()) {
                  erro("Informe um nome para a composição");
                  return;
                }
                salvarLayout.mutate({ id: layoutEditando?.id, nome: nomeLayout.trim(), widgets_json: widgets });
              }}
            >
              Salvar
            </Botao>
          </div>
        }
      >
        <Campo rotulo="Nome da composição" obrigatorio htmlFor="nome-layout" dica="Você poderá aplicá-la ou torná-la padrão a qualquer momento.">
          <Entrada
            id="nome-layout"
            value={nomeLayout}
            onChange={(e) => setNomeLayout(e.target.value)}
            placeholder="Ex.: Painel do portfólio 2025"
          />
        </Campo>
      </Modal>

      <Modal
        aberto={acaoPendente !== null}
        onFechar={() => setAcaoPendente(null)}
        titulo="Alterações não salvas"
        largura="sm"
        rodape={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Botao variante="fantasma" onClick={() => setAcaoPendente(null)}>Cancelar</Botao>
            <Botao
              variante="secundario"
              icone={Trash2}
              onClick={() => {
                if (acaoPendente) executarAcao(acaoPendente);
              }}
            >
              Descartar alterações
            </Botao>
            <Botao variante="primario" icone={Save} onClick={salvarEContinuar}>
              Salvar e continuar
            </Botao>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-fg">
            A composição da área de edição tem alterações que ainda não foram salvas. Se você continuar sem salvar,
            esse trabalho é perdido.
          </p>
          <p className="rounded-sgp border border-border bg-surface-2 px-2.5 py-2 text-xs text-fg-muted">
            {"Ação pendente: " + descricaoAcaoPendente + "."}
          </p>
          <p className="text-2xs text-fg-subtle">
            {"Composição atual: " + textoOrigem + "."}
          </p>
        </div>
      </Modal>

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo="Confirmar exclusão"
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirLayout.isPending || excluirRelatorio.isPending}
              onClick={() => {
                if (!confirmacao) return;
                if (confirmacao.tipo === "layout") excluirLayout.mutate({ id: confirmacao.id });
                else excluirRelatorio.mutate({ id: confirmacao.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          {"Deseja realmente excluir " + (confirmacao?.nome || "") + "? Esta ação não pode ser desfeita."}
        </p>
      </Modal>

      <PainelLateral
        aberto={painelRelatorio}
        onFechar={() => setPainelRelatorio(false)}
        titulo={relatorioEditando ? "Editar relatório" : "Novo relatório"}
        subtitulo={numero(widgets.length) + " widget(s) serão salvos com o relatório"}
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setPainelRelatorio(false)}>Cancelar</Botao>
            <Botao
              variante="primario"
              icone={Save}
              carregando={criarRelatorio.isPending || atualizarRelatorio.isPending}
              onClick={salvarRelatorio}
            >
              {relatorioEditando ? "Salvar alterações" : "Criar relatório"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome" obrigatorio htmlFor="rel-nome">
            <Entrada
              id="rel-nome"
              value={formRelatorio.nome}
              onChange={(e) => setFormRelatorio((a) => ({ ...a, nome: e.target.value }))}
              placeholder="Ex.: Status semanal do portfólio"
            />
          </Campo>
          <Campo rotulo="Descrição" htmlFor="rel-desc">
            <Entrada
              id="rel-desc"
              value={formRelatorio.descricao}
              onChange={(e) => setFormRelatorio((a) => ({ ...a, descricao: e.target.value }))}
              placeholder="Objetivo e público do relatório"
            />
          </Campo>
          <Campo
            rotulo="Agendamento"
            htmlFor="rel-agenda"
            dica="Expressão cron mantida pelo backend para envios automáticos."
          >
            <Selecao
              id="rel-agenda"
              value={formRelatorio.agendamento}
              onChange={(e) => setFormRelatorio((a) => ({ ...a, agendamento: e.target.value }))}
            >
              <option value="">Sem agendamento</option>
              <option value="0 7 * * 1">Toda segunda-feira às 07h</option>
              <option value="0 7 * * *">Diariamente às 07h</option>
              <option value="0 8 1 * *">Mensal (dia 1 às 08h)</option>
              <option value="0 18 * * 5">Sexta-feira às 18h</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Destinatários" dica="Pressione Enter para adicionar um e-mail.">
            <div className="flex items-center gap-2">
              <Entrada
                value={novoDestinatario}
                onChange={(e) => setNovoDestinatario(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    adicionarDestinatario();
                  }
                }}
                placeholder="nome@empresa.com.br"
              />
              <Botao variante="secundario" icone={Plus} onClick={adicionarDestinatario}>Incluir</Botao>
            </div>
          </Campo>
          {formRelatorio.destinatarios.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {formRelatorio.destinatarios.map((d) => (
                <Chip
                  key={d}
                  cor="#2563EB"
                  removivel
                  onRemover={() =>
                    setFormRelatorio((a) => ({ ...a, destinatarios: a.destinatarios.filter((x) => x !== d) }))
                  }
                >
                  {d}
                </Chip>
              ))}
            </div>
          )}

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <p className="text-xs font-semibold text-fg">Widgets do relatório</p>
            <p className="mt-0.5 text-2xs text-fg-muted">
              {"A composição atual (" + numero(widgets.length) + " widget(s)) será gravada em widgets_json."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {widgets.map((w) => (
                <Chip key={w.id} cor="#8B5CF6">{porId.get(w.id)?.nome || w.id}</Chip>
              ))}
              {widgets.length === 0 && <span className="text-2xs text-fg-subtle">Nenhum widget na composição.</span>}
            </div>
          </div>

          <Alerta tom="info" titulo="Execução sob demanda">
            O botão Executar consulta novamente o catálogo e reaplica a composição salva na área de edição.
          </Alerta>
        </div>
      </PainelLateral>

      <div className="no-print">
        <GradeCards colunas={3}>
          <div className="rounded-sgp-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-fg">Como montar</p>
            <p className="mt-1 text-2xs text-fg-muted">
              Arraste do catálogo, reordene pelo ícone de alça e ajuste largura (3 a 12 colunas) e altura (2 a 4 linhas).
            </p>
          </div>
          <div className="rounded-sgp-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-fg">Dados reais</p>
            <p className="mt-1 text-2xs text-fg-muted">
              Cada widget consulta o endpoint correspondente do SGP: portfólio, EVM, riscos, capacidade, alocação e atividades.
            </p>
          </div>
          <div className="rounded-sgp-lg border border-border bg-surface p-3">
            <p className="text-xs font-semibold text-fg">Impressão</p>
            <p className="mt-1 text-2xs text-fg-muted">
              O botão Imprimir oculta catálogo, filtros e controles de edição com a classe no-print e mantém a faixa
              de recorte, que é o que dá validade ao número impresso.
            </p>
          </div>
        </GradeCards>
      </div>
    </div>
  );
}

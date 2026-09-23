import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Blocks,
  BookOpen,
  Boxes,
  Brain,
  Briefcase,
  CircleHelp,
  ClipboardList,
  Database,
  Eye,
  FileText,
  Flag,
  GraduationCap,
  Hash,
  Key,
  Lightbulb,
  List,
  ListOrdered,
  Lock,
  MessageCircle,
  PieChart,
  Server,
  Share2,
  Shield,
  SquareKanban,
  Table,
  ThumbsUp,
  UserPlus,
  Wand2,
  Zap,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock,
  Compass,
  FileBarChart,
  Filter,
  FolderKanban,
  Gauge,
  GitBranch,
  Grid3x3,
  HelpCircle,
  History,
  Layers,
  LayoutGrid,
  LineChart,
  ListChecks,
  LogIn,
  Mail,
  MessageSquare,
  MousePointerClick,
  Network,
  Palette,
  Play,
  Plug,
  Plus,
  Radar,
  Route,
  Save,
  Scale,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  UserCheck,
  Users,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/* ==========================================================================
   Central de ajuda — tipos e utilitários
   ========================================================================== */

export interface PassoGuia {
  titulo: string;
  detalhe: string;
  icone?: string;
}

export interface ItemGuia {
  nome: string;
  descricao: string;
  dica?: string;
  leitura?: string;
}

export interface AtalhoGuia {
  tecla: string;
  acao: string;
}

export interface GuiaAjuda {
  id: number;
  rota: string;
  titulo: string;
  grupo: string;
  icone: string;
  resumo: string;
  para_que_serve: string;
  quando_usar: string[];
  passos: PassoGuia[];
  elementos: ItemGuia[];
  campos: ItemGuia[];
  indicadores: ItemGuia[];
  dicas: string[];
  limitacoes: string[];
  atalhos: AtalhoGuia[];
  doc: string;
  permissoes: string[];
  ordem: number;
  ativo: boolean;
  visualizacoes: number;
  percentual_util: number;
  total_avaliacoes: number;
  atualizado_em: string;
}

/**
 * O que a listagem da central de ajuda devolve.
 *
 * É deliberadamente menor que GuiaAjuda: a lista traz só o suficiente para
 * montar os cartões. O conteúdo (passo a passo, campos, indicadores) vem do
 * endpoint do guia individual. Ter os dois tipos separados evita tratar o item
 * da lista como se fosse o guia completo.
 */
export interface GuiaAjudaResumo {
  id: number;
  rota: string;
  titulo: string;
  grupo: string;
  icone: string;
  resumo: string;
  doc: string;
  permissoes: string[];
  ordem: number;
  /** Contagens que aparecem como selo no cartão. */
  visualizacoes: number;
  total_passos: number;
  total_limitacoes: number;
  total_avaliacoes: number;
  percentual_util: number;
}

export interface RespostaGuiaRota {
  encontrado: boolean;
  rota: string;
  mensagem?: string;
  guia?: GuiaAjuda;
  meu_feedback?: { util: boolean } | null;
  relacionados?: GuiaAjuda[];
}

export interface GrupoAjuda {
  nome: string;
  rotulo: string;
  total: number;
}

/**
 * Dicionário de ícones usados pelos guias.
 *
 * Mapeamos apenas os ícones efetivamente citados no conteúdo em vez de
 * importar a biblioteca inteira: manter o pacote completo no bundle custaria
 * centenas de kilobytes por um recurso de apoio.
 */
const ICONES: Record<string, LucideIcon> = {
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
  "arrow-right": ArrowRight,
  "book-open": BookOpen,
  "circle-help": CircleHelp,
  "clipboard-list": ClipboardList,
  "database": Database,
  "eye": Eye,
  "file-text": FileText,
  "flag": Flag,
  "graduation-cap": GraduationCap,
  "hash": Hash,
  "key": Key,
  "lightbulb": Lightbulb,
  "list": List,
  "list-ordered": ListOrdered,
  "lock": Lock,
  "message-circle": MessageCircle,
  "pie-chart": PieChart,
  "server": Server,
  "share-2": Share2,
  "shield": Shield,
  "square-kanban": SquareKanban,
  "table": Table,
  "thumbs-up": ThumbsUp,
  "user-plus": UserPlus,
  "wand-2": Wand2,
  "zap": Zap,
  award: Award,
  "bar-chart-3": BarChart3,
  blocks: Blocks,
  boxes: Boxes,
  brain: Brain,
  briefcase: Briefcase,
  "calendar-days": CalendarDays,
  "calendar-range": CalendarRange,
  "clipboard-check": ClipboardCheck,
  clock: Clock,
  compass: Compass,
  "file-bar-chart": FileBarChart,
  filter: Filter,
  "folder-kanban": FolderKanban,
  gauge: Gauge,
  "git-branch": GitBranch,
  "grid-3x3": Grid3x3,
  "help-circle": HelpCircle,
  history: History,
  layers: Layers,
  "layout-grid": LayoutGrid,
  "line-chart": LineChart,
  "list-checks": ListChecks,
  "log-in": LogIn,
  mail: Mail,
  "message-square": MessageSquare,
  "mouse-pointer-click": MousePointerClick,
  network: Network,
  palette: Palette,
  play: Play,
  plug: Plug,
  plus: Plus,
  radar: Radar,
  route: Route,
  save: Save,
  scale: Scale,
  search: Search,
  settings: Settings,
  "shield-alert": ShieldAlert,
  sparkles: Sparkles,
  target: Target,
  "trending-up": TrendingUp,
  trophy: Trophy,
  upload: Upload,
  "user-check": UserCheck,
  users: Users,
  wallet: Wallet,
  workflow: Workflow,
};

export function iconeDoGuia(nome?: string): LucideIcon {
  if (!nome) return HelpCircle;
  return ICONES[nome] ?? HelpCircle;
}

/**
 * Rota interna do leitor de manual.
 *
 * O manual não é servido como arquivo estático: o conteúdo Markdown é
 * entregue pela API de ajuda e lido dentro da própria aplicação. Por isso o
 * endereço aponta para a tela do leitor (/ajuda/manual/<arquivo>), e não para
 * a pasta docs/ do projeto.
 */
export const ROTA_MANUAL = "/ajuda/manual/";

/** Endereço do capítulo correspondente no leitor de manual. */
export function urlDoManual(doc?: string): string {
  if (!doc) return "";
  // Aceita "01-arquivo.md" e também caminhos como "../docs/01-arquivo.md".
  const arquivo = doc.split("/").filter(Boolean).pop() ?? "";
  if (!arquivo) return "";
  return ROTA_MANUAL + arquivo;
}

export const CHAVE_AJUDA = "sgp.ajuda";
export const CHAVE_VISITAS = "sgp.telasVisitadas";
export const CHAVE_DICA_DISPENSADA = "sgp.dicaAjudaDispensada";

/** Registra que o usuário já abriu uma tela — base da dica de primeira visita. */
export function marcarTelaVisitada(rota: string) {
  try {
    const vistas = new Set<string>(JSON.parse(localStorage.getItem(CHAVE_VISITAS) || "[]"));
    if (vistas.has(rota)) return false;
    vistas.add(rota);
    localStorage.setItem(CHAVE_VISITAS, JSON.stringify([...vistas].slice(-200)));
    return true;
  } catch {
    return false;
  }
}

export function telaJaVisitada(rota: string): boolean {
  try {
    const vistas = new Set<string>(JSON.parse(localStorage.getItem(CHAVE_VISITAS) || "[]"));
    return vistas.has(rota);
  } catch {
    return true;
  }
}

export function dicaDispensada(): boolean {
  return localStorage.getItem(CHAVE_DICA_DISPENSADA) === "1";
}

export function dispensarDica() {
  localStorage.setItem(CHAVE_DICA_DISPENSADA, "1");
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Blocks,
  Brain,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronsUpDown,
  CircleHelp,
  Clock,
  Compass,
  Database,
  FileBarChart,
  Filter,
  FolderKanban,
  Gauge,
  GitBranch,
  Grid3x3,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  Monitor,
  Moon,
  Network,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Plug,
  Plus,
  Radar,
  Route,
  Scale,
  Search,
  Sparkles,
  Settings,
  ShieldAlert,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wallet,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dataRelativa } from "@/lib/format";
import { useAuth } from "@/store/auth";
import { useUi, type Densidade, type Tema } from "@/store/ui";
import { useConsulta, CHAVES } from "@/hooks";
import { SeletorTemaCompacto } from "@/components/seletor-tema";
import { BotaoAjuda, DicaPrimeiraVisita, PainelAjuda, useAtalhoAjuda } from "@/components/ajuda";
import {
  BotaoAssistente,
  PainelAssistente,
  useAtalhoAssistente,
} from "@/components/assistente";
import type { Notificacao } from "@/lib/types";
import {
  Avatar,
  Botao,
  BotaoIcone,
  Chip,
  Dica,
  Entrada,
  EntradaBusca,
  Marca,
  Segmentado,
  Etiqueta,
  useAvisos,
} from "@/components/ui";
import { api } from "@/lib/api";

/* ==========================================================================
   Estrutura de navegação
   ========================================================================== */

interface ItemNav {
  rotulo: string;
  rota: string;
  icone: LucideIcon;
  permissao?: string | string[];
  atalho?: string;
}

interface GrupoNav {
  titulo: string;
  itens: ItemNav[];
}

export const NAVEGACAO: GrupoNav[] = [
  {
    titulo: "Visão geral",
    itens: [
      { rotulo: "Dashboard executivo", rota: "/", icone: LayoutDashboard, permissao: "dashboard.ver" },
      { rotulo: "Análises preditivas", rota: "/analytics", icone: Brain, permissao: "dashboard.ver" },
      { rotulo: "Meu painel", rota: "/meu-painel", icone: Gauge },
      { rotulo: "Timeline do portfólio", rota: "/timeline", icone: CalendarRange, permissao: "projeto.ver" },
    ],
  },
  {
    titulo: "Portfólio",
    itens: [
      { rotulo: "Projetos", rota: "/projetos", icone: FolderKanban, permissao: "projeto.ver" },
      { rotulo: "Programas", rota: "/programas", icone: Layers, permissao: "programa.ver" },
      { rotulo: "Portfólios", rota: "/portfolios", icone: Briefcase, permissao: "portfolio.ver" },
      { rotulo: "Marcos", rota: "/marcos", icone: Target, permissao: "projeto.ver" },
      { rotulo: "Relatórios", rota: "/relatorios", icone: FileBarChart, permissao: "relatorio.ver" },
    ],
  },
  {
    titulo: "Execução",
    itens: [
      { rotulo: "Minhas tarefas", rota: "/minhas-tarefas", icone: ListChecks },
      { rotulo: "Kanban", rota: "/kanban", icone: Blocks, permissao: "tarefa.ver" },
      { rotulo: "Calendário", rota: "/calendario", icone: CalendarDays, permissao: "tarefa.ver" },
      { rotulo: "Timesheet", rota: "/timesheet", icone: Clock },
      { rotulo: "Colaboração", rota: "/colaboracao", icone: Mail, permissao: "projeto.ver" },
    ],
  },
  {
    titulo: "Recursos e alocação",
    itens: [
      { rotulo: "Alocação", rota: "/alocacao", icone: Users, permissao: "alocacao.ver" },
      { rotulo: "Motor de matching", rota: "/matching", icone: Compass, permissao: "alocacao.ver" },
      { rotulo: "Recursos", rota: "/recursos", icone: Boxes, permissao: "recurso.ver" },
      { rotulo: "Capacidade", rota: "/capacidade", icone: Grid3x3, permissao: "capacidade.ver" },
      { rotulo: "Auditoria de viés", rota: "/auditoria-vies", icone: Scale, permissao: "auditoria.ver" },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { rotulo: "Painel financeiro", rota: "/financeiro", icone: Wallet, permissao: "financeiro.ver" },
      { rotulo: "Lançamentos", rota: "/lancamentos", icone: LineChart, permissao: "financeiro.ver" },
      { rotulo: "EVM e curva S", rota: "/evm", icone: TrendingUp, permissao: "financeiro.ver" },
    ],
  },
  {
    titulo: "Riscos e qualidade",
    itens: [
      { rotulo: "Matriz de riscos", rota: "/riscos", icone: ShieldAlert, permissao: "risco.ver" },
      { rotulo: "Issues e ações", rota: "/issues", icone: AlertTriangle, permissao: "risco.ver" },
    ],
  },
  {
    titulo: "Capacidades e talentos",
    itens: [
      { rotulo: "Catálogo de capacidades", rota: "/capacidades", icone: Sparkles, permissao: "capacidade.ver" },
      { rotulo: "Matriz de skills", rota: "/matriz-skills", icone: Grid3x3, permissao: "capacidade.ver" },
      { rotulo: "Gap analysis", rota: "/gap", icone: Target, permissao: "capacidade.ver" },
      { rotulo: "Bus factor", rota: "/bus-factor", icone: Network, permissao: "capacidade.ver" },
      { rotulo: "Pessoas", rota: "/pessoas", icone: Users, permissao: "capacidade.ver" },
      { rotulo: "PDI e trilhas", rota: "/pdi", icone: Route },
      { rotulo: "Validações", rota: "/validacoes", icone: Award, permissao: "capacidade.validar" },
      { rotulo: "Oportunidades", rota: "/oportunidades", icone: Trophy, permissao: "capacidade.ver" },
      { rotulo: "Sucessão", rota: "/sucessao", icone: GitBranch, permissao: "capacidade.ver" },
    ],
  },
  {
    titulo: "Administração",
    itens: [
      { rotulo: "Usuários e papéis", rota: "/admin/usuarios", icone: UserCheck, permissao: "admin.ver" },
      { rotulo: "Workflows", rota: "/admin/workflows", icone: Workflow, permissao: "workflow.editar" },
      { rotulo: "Campos customizados", rota: "/admin/campos", icone: Blocks, permissao: "admin.ver" },
      { rotulo: "Integrações", rota: "/integracoes", icone: Plug, permissao: "dashboard.ver" },
      { rotulo: "Auditoria", rota: "/admin/auditoria", icone: History, permissao: "auditoria.ver" },
      { rotulo: "Temas e aparência", rota: "/temas", icone: Palette },
      { rotulo: "Preferências", rota: "/preferencias", icone: Settings },
    ],
  },
  {
    titulo: "Ajuda",
    itens: [
      { rotulo: "Assistente", rota: "/assistente", icone: Sparkles },
      { rotulo: "Central de ajuda", rota: "/ajuda", icone: CircleHelp },
    ],
  },
];

/* ==========================================================================
   Barra lateral
   ========================================================================== */

function BarraLateral({ aoNavegar }: { aoNavegar?: () => void }) {
  const { recolhida, alternarSidebar } = useUi();
  const { pode } = useAuth();
  const local = useLocation();

  const grupos = useMemo(
    () =>
      NAVEGACAO.map((g) => ({
        ...g,
        itens: g.itens.filter((item) => {
          if (!item.permissao) return true;
          const lista = Array.isArray(item.permissao) ? item.permissao : [item.permissao];
          return lista.some((p) => pode(p));
        }),
      })).filter((g) => g.itens.length > 0),
    [pode]
  );

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-surface transition-all duration-200",
        recolhida ? "w-14" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center border-b border-border", recolhida ? "justify-center px-2" : "px-3")}>
        {recolhida ? <Marca compacto /> : <Marca />}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 scroll-thin" aria-label="Navegação principal">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="mb-2">
            {!recolhida && (
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{grupo.titulo}</p>
            )}
            <ul className="space-y-0.5">
              {grupo.itens.map((item) => {
                const ativo = local.pathname === item.rota || (item.rota !== "/" && local.pathname.startsWith(item.rota));
                const Icone = item.icone;
                const link = (
                  <NavLink
                    to={item.rota}
                    onClick={aoNavegar}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-sgp px-2 py-1.5 text-xs font-medium transition-all",
                      recolhida && "justify-center",
                      ativo ? "bg-brand-soft/60 text-brand" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                    )}
                  >
                    <Icone className={cn("size-4 shrink-0", ativo && "text-brand")} aria-hidden />
                    {!recolhida && <span className="truncate">{item.rotulo}</span>}
                    {!recolhida && ativo && <span className="ml-auto size-1.5 rounded-full bg-brand" />}
                  </NavLink>
                );
                return (
                  <li key={item.rota}>
                    {recolhida ? (
                      <Dica texto={item.rotulo} lado="right">
                        {link}
                      </Dica>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={alternarSidebar}
        className="flex items-center justify-center gap-2 border-t border-border py-2 text-2xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
        aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
      >
        {recolhida ? <PanelLeftOpen className="size-3.5" aria-hidden /> : <PanelLeftClose className="size-3.5" aria-hidden />}
        {!recolhida && "Recolher menu"}
      </button>
    </aside>
  );
}

/* ==========================================================================
   Paleta de comandos (Cmd+K / Ctrl+K)
   ========================================================================== */

interface ResultadoBusca {
  tipo: string;
  rotulo: string;
  icone: string;
  cor: string;
  id: number;
  titulo: string;
  subtitulo: string;
  rota: string;
  /** Preenchidos apenas pelos resultados da central de ajuda. */
  resumo?: string;
  grupo?: string;
}

const ICONES_BUSCA: Record<string, LucideIcon> = {
  "folder-kanban": FolderKanban,
  layers: Layers,
  "check-square": ListChecks,
  sparkles: Sparkles,
  user: Users,
  boxes: Boxes,
  "shield-alert": ShieldAlert,
};

function PaletaComandos() {
  const { paletaAberta, abrirPaleta } = useUi();
  const navigate = useNavigate();
  const [termo, setTermo] = useState("");
  const [indice, setIndice] = useState(0);
  const entradaRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useConsulta<{ resultados: ResultadoBusca[] }>(
    CHAVES.busca(termo),
    termo.trim().length >= 2 ? "/busca/" : null,
    { q: termo, limite: 8 },
    { enabled: termo.trim().length >= 2 }
  );

  const { data: dadosAjuda } = useConsulta<{ resultados: ResultadoBusca[] }>(
    ["busca", "ajuda", termo],
    termo.trim().length >= 2 ? "/ajuda-busca/" : null,
    { q: termo },
    { enabled: termo.trim().length >= 2 }
  );

  const resultados = data?.resultados ?? [];
  const resultadosAjuda = dadosAjuda?.resultados ?? [];

  const atalhos = useMemo(() => {
    const filtro = termo.trim().toLowerCase();
    const todos = NAVEGACAO.flatMap((g) => g.itens);
    if (!filtro) return todos.slice(0, 8);
    return todos.filter((i) => i.rotulo.toLowerCase().includes(filtro)).slice(0, 8);
  }, [termo]);

  useEffect(() => {
    if (paletaAberta) {
      setTermo("");
      setIndice(0);
      setTimeout(() => entradaRef.current?.focus(), 40);
    }
  }, [paletaAberta]);

  const irPara = (rota: string) => {
    abrirPaleta(false);
    navigate(rota);
  };

  useEffect(() => {
    if (!paletaAberta) return;
    const handler = (e: KeyboardEvent) => {
      const total = resultados.length + resultadosAjuda.length + atalhos.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndice((i) => (i + 1) % Math.max(1, total));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndice((i) => (i - 1 + total) % Math.max(1, total));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const baseAjuda = resultados.length;
        const baseAtalhos = baseAjuda + resultadosAjuda.length;
        if (indice < baseAjuda) irPara(resultados[indice].rota);
        else if (indice < baseAtalhos) irPara("/ajuda?guia=" + resultadosAjuda[indice - baseAjuda].id);
        else if (atalhos[indice - baseAtalhos]) irPara(atalhos[indice - baseAtalhos].rota);
      } else if (e.key === "Escape") {
        abrirPaleta(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletaAberta, indice, resultados, resultadosAjuda, atalhos]);

  if (!paletaAberta) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => abrirPaleta(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-sgp-xl border border-border bg-surface shadow-n3 animate-entrada"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          <input
            ref={entradaRef}
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value);
              setIndice(0);
            }}
            placeholder="Buscar projetos, tarefas, pessoas, capacidades ou navegar..."
            className="flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          {isFetching && <span className="text-2xs text-fg-subtle">buscando…</span>}
          <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5 scroll-thin">
          {resultados.length > 0 && (
            <>
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Registros</p>
              {resultados.map((r, i) => {
                const Icone = ICONES_BUSCA[r.icone] || Compass;
                return (
                  <button
                    key={r.tipo + r.id}
                    type="button"
                    onMouseEnter={() => setIndice(i)}
                    onClick={() => irPara(r.rota)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-sgp px-2 py-2 text-left transition-colors",
                      indice === i ? "bg-brand-soft/50" : "hover:bg-surface-2"
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ backgroundColor: r.cor + "20", color: r.cor }}>
                      <Icone className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-fg">{r.titulo}</span>
                      <span className="block truncate text-2xs text-fg-muted">{r.subtitulo || r.rotulo}</span>
                    </span>
                    <Etiqueta tom="neutral">{r.rotulo}</Etiqueta>
                  </button>
                );
              })}
            </>
          )}

          {resultadosAjuda.length > 0 && (
            <>
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
                Ajuda · guias de uso
              </p>
              {resultadosAjuda.map((a, i) => {
                const idx = resultados.length + i;
                return (
                  <button
                    key={"ajuda-" + a.id}
                    type="button"
                    onMouseEnter={() => setIndice(idx)}
                    onClick={() => irPara("/ajuda?guia=" + a.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-sgp px-2 py-2 text-left transition-colors",
                      indice === idx ? "bg-brand-soft/50" : "hover:bg-surface-2"
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-warning-soft/60 text-warning">
                      <CircleHelp className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-fg">{a.titulo}</span>
                      <span className="block truncate text-2xs text-fg-muted">{a.resumo || a.grupo}</span>
                    </span>
                    <Etiqueta tom="warning">ajuda</Etiqueta>
                  </button>
                );
              })}
            </>
          )}

          {atalhos.length > 0 && (
            <>
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Navegar</p>
              {atalhos.map((a, i) => {
                const idx = resultados.length + i;
                const Icone = a.icone;
                return (
                  <button
                    key={a.rota}
                    type="button"
                    onMouseEnter={() => setIndice(idx)}
                    onClick={() => irPara(a.rota)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-sgp px-2 py-2 text-left transition-colors",
                      indice === idx ? "bg-brand-soft/50" : "hover:bg-surface-2"
                    )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-3 text-fg-muted">
                      <Icone className="size-3.5" aria-hidden />
                    </span>
                    <span className="truncate text-xs font-medium text-fg">{a.rotulo}</span>
                  </button>
                );
              })}
            </>
          )}

          {termo.trim().length >= 2 && resultados.length === 0 && atalhos.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-fg-muted">
              Nenhum resultado para “{termo}”. Tente outro termo.
            </p>
          )}
        </div>

        <footer className="flex items-center gap-3 border-t border-border bg-surface-2 px-3 py-2 text-2xs text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 font-semibold">↑</kbd>
            <kbd className="rounded border border-border bg-surface px-1 font-semibold">↓</kbd> navegar
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 font-semibold">↵</kbd> abrir
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 font-semibold">Ctrl</kbd>+
            <kbd className="rounded border border-border bg-surface px-1 font-semibold">K</kbd>
          </span>
        </footer>
      </div>
    </div>
  );
}

/* ==========================================================================
   Painel de notificações
   ========================================================================== */

function PainelNotificacoes({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { atualizarNaoLidas } = useAuth();
  const navigate = useNavigate();
  const { data, refetch } = useConsulta<{ results: Notificacao[]; count: number } | Notificacao[]>(
    CHAVES.notificacoes,
    aberto ? "/notificacoes/" : null,
    { page_size: 30 },
    { enabled: aberto }
  );

  const lista = useMemo(() => (Array.isArray(data) ? data : data?.results ?? []), [data]);

  useEffect(() => {
    atualizarNaoLidas(lista.filter((n) => !n.lida).length);
  }, [lista, atualizarNaoLidas]);

  if (!aberto) return null;

  const marcarLida = async (n: Notificacao) => {
    if (!n.lida) await api.post("/notificacoes/" + n.id + "/marcar-lida/");
    refetch();
  };

  const marcarTodas = async () => {
    await api.post("/notificacoes/marcar-todas-lidas/");
    atualizarNaoLidas(0);
    refetch();
  };

  const CORES_NIVEL: Record<string, string> = {
    INFO: "#0891B2",
    SUCESSO: "#059669",
    ALERTA: "#D97706",
    CRITICO: "#DC2626",
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFechar} aria-hidden />
      <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n3 animate-entrada">
        <header className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <h3 className="text-sm font-semibold text-fg">Notificações</h3>
          <button type="button" onClick={marcarTodas} className="text-2xs font-medium text-brand hover:underline">
            marcar todas como lidas
          </button>
        </header>
        <div className="max-h-96 overflow-y-auto scroll-thin">
          {lista.length === 0 && <p className="px-3 py-10 text-center text-xs text-fg-muted">Nenhuma notificação.</p>}
          {lista.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                marcarLida(n);
                if (n.link) {
                  onFechar();
                  navigate(n.link);
                }
              }}
              className={cn(
                "flex w-full items-start gap-2.5 border-b border-border/60 px-3.5 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2",
                !n.lida && "bg-brand-soft/20"
              )}
            >
              <span
                className="mt-1 size-2 shrink-0 rounded-full"
                style={{ backgroundColor: CORES_NIVEL[n.nivel] || "#94A3B8" }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className={cn("block text-xs text-fg", !n.lida && "font-semibold")}>{n.titulo}</span>
                {n.mensagem && <span className="mt-0.5 block text-2xs text-fg-muted">{n.mensagem}</span>}
                <span className="mt-0.5 block text-2xs text-fg-subtle">{dataRelativa(n.criado_em)}</span>
              </span>
              {!n.lida && <Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ==========================================================================
   Menu do usuário
   ========================================================================== */

function MenuUsuario() {
  const { usuario, sair } = useAuth();
  const { densidade, definirDensidade } = useUi();
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  if (!usuario) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-sgp px-1.5 py-1 transition-colors hover:bg-surface-2"
        aria-expanded={aberto}
      >
        <Avatar nome={usuario.nome} cor={usuario.cor} iniciais={usuario.iniciais} url={usuario.avatar_display} tamanho="sm" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-32 truncate text-xs font-semibold text-fg">{usuario.nome_curto}</span>
          <span className="block text-2xs text-fg-muted">{usuario.papel || usuario.perfil}</span>
        </span>
        <ChevronsUpDown className="size-3.5 text-fg-subtle" aria-hidden />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} aria-hidden />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n3 animate-entrada">
            <div className="flex items-center gap-3 border-b border-border p-3.5">
              <Avatar nome={usuario.nome} cor={usuario.cor} iniciais={usuario.iniciais} tamanho="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{usuario.nome}</p>
                <p className="truncate text-2xs text-fg-muted">{usuario.email}</p>
                <Etiqueta tom="brand" className="mt-1">
                  {usuario.papel || usuario.perfil}
                </Etiqueta>
              </div>
            </div>

            <div className="space-y-3 p-3.5">
              <SeletorTemaCompacto>
                <div>
                  <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Densidade</p>
                  <Segmentado<Densidade>
                    valor={densidade}
                    onChange={definirDensidade}
                    tamanho="sm"
                    opcoes={[
                      { valor: "compacta", rotulo: "Compacta" },
                      { valor: "padrao", rotulo: "Padrão" },
                      { valor: "confortavel", rotulo: "Confortável" },
                    ]}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false);
                    navigate("/temas");
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-sgp border border-border-strong bg-surface py-1.5 text-2xs font-medium text-fg transition-colors hover:bg-surface-2"
                >
                  <Palette className="size-3.5" aria-hidden /> Abrir editor de temas
                </button>
              </SeletorTemaCompacto>
            </div>

            <div className="border-t border-border p-1.5">
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  navigate("/pessoas/" + usuario.id);
                }}
                className="flex w-full items-center gap-2.5 rounded-sgp px-2.5 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Radar className="size-4" aria-hidden /> Meu perfil e capacidades
              </button>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  navigate("/preferencias");
                }}
                className="flex w-full items-center gap-2.5 rounded-sgp px-2.5 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <Settings className="size-4" aria-hidden /> Preferências
              </button>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  sair();
                }}
                className="flex w-full items-center gap-2.5 rounded-sgp px-2.5 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger-soft/40"
              >
                <LogOut className="size-4" aria-hidden /> Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   Shell da aplicação
   ========================================================================== */

export function AppShell({ children }: { children: ReactNode }) {
  const { abrirPaleta, alternarSidebar } = useUi();
  const { naoLidas } = useAuth();
  const [menuMobile, setMenuMobile] = useState(false);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const local = useLocation();
  useAtalhoAjuda();
  useAtalhoAssistente();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        abrirPaleta(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        alternarSidebar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [abrirPaleta, alternarSidebar]);

  useEffect(() => {
    setMenuMobile(false);
    setNotificacoesAbertas(false);
  }, [local.pathname]);

  return (
    // h-dvh em vez de h-full: a altura passa a vir da janela, e não de uma
    // cadeia de height:100% que depende de html, body e #root. Se qualquer elo
    // dessa corrente falhar (CSS antigo em cache, extensão, contexto de iframe),
    // o shell inteiro encolhia até a altura do conteúdo e sobrava um vazio no
    // fim da página.
    <div className="flex h-dvh max-h-dvh w-full overflow-hidden bg-bg">
      <div className="hidden lg:flex">
        <BarraLateral />
      </div>

      {menuMobile && (
        <div className="fixed inset-0 z-[70] flex lg:hidden">
          <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={() => setMenuMobile(false)} aria-hidden />
          <div className="relative z-10 animate-entrada">
            <BarraLateral aoNavegar={() => setMenuMobile(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3">
          <BotaoIcone icone={menuMobile ? X : Menu} rotulo="Menu" onClick={() => setMenuMobile((v) => !v)} className="lg:hidden" />

          <button
            type="button"
            onClick={() => abrirPaleta(true)}
            className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-sgp border border-border-strong bg-surface-2 px-3 text-left text-xs text-fg-subtle transition-colors hover:border-brand/50 hover:bg-surface"
          >
            <Search className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">Buscar ou navegar…</span>
            <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold sm:block">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <BotaoAssistente />
            <BotaoAjuda />

            <Dica texto="Novo projeto">
              <Botao
                variante="primario"
                tamanho="sm"
                icone={Plus}
                onClick={() => (window.location.href = "/projetos/novo")}
                className="hidden sm:inline-flex"
              >
                Novo projeto
              </Botao>
            </Dica>

            <div className="relative">
              <BotaoIcone
                icone={Bell}
                rotulo="Notificações"
                onClick={() => setNotificacoesAbertas((v) => !v)}
                ativo={notificacoesAbertas}
                className="relative"
              />
              {naoLidas > 0 && (
                <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                  {naoLidas > 99 ? "99+" : naoLidas}
                </span>
              )}
              <PainelNotificacoes aberto={notificacoesAbertas} onFechar={() => setNotificacoesAbertas(false)} />
            </div>

            <MenuUsuario />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 sm:py-5">
            <DicaPrimeiraVisita />
            {children}
          </div>
        </main>
      </div>

      <PaletaComandos />
      <PainelAjuda />
      <PainelAssistente />
    </div>
  );
}

/* ==========================================================================
   Blocos auxiliares de página
   ========================================================================== */

// GradeCards, LinhaKPI e FiltroSelect vivem em @/components/ui (contrato único).
export {
  Avatar,
  BarraFerramentas,
  Botao,
  BotaoIcone,
  Chip,
  Entrada,
  EntradaBusca,
  Etiqueta,
  FiltroSelect,
  FiltrosAtivos,
  GradeCards,
  LinhaKPI,
  PilhaAvatares,
} from "@/components/ui";

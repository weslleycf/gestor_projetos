import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  Search,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { iniciaisDe } from "@/lib/format";
import { BotaoExplicacao } from "@/components/explicacao";
import type { Explicacao } from "@/lib/explicacoes";

/* ==========================================================================
   Tokens semânticos compartilhados
   ========================================================================== */

export type Tom = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

/* --------------------------------------------------------------------------
   Resolução das cores semânticas a partir do tema ativo.
   As classes utilitárias já são temáticas (via variáveis CSS), mas alguns
   componentes precisam do valor HEX para compor alfa em JavaScript.
   A leitura é memoizada por tema + modo, então não há custo por render.
   -------------------------------------------------------------------------- */

interface CfgTom {
  texto: string;
  fundo: string;
  borda: string;
  solido: string;
  hex: string;
}

const TONS_BASE: Record<Tom, CfgTom> = {
  brand: { texto: "text-brand", fundo: "bg-brand-soft/60", borda: "border-brand/35", solido: "bg-brand text-brand-fg", hex: "#2563EB" },
  success: { texto: "text-success", fundo: "bg-success-soft/60", borda: "border-success/35", solido: "bg-success text-white", hex: "#059669" },
  warning: { texto: "text-warning", fundo: "bg-warning-soft/60", borda: "border-warning/35", solido: "bg-warning text-white", hex: "#D97706" },
  danger: { texto: "text-danger", fundo: "bg-danger-soft/60", borda: "border-danger/35", solido: "bg-danger text-white", hex: "#DC2626" },
  info: { texto: "text-info", fundo: "bg-info-soft/60", borda: "border-info/35", solido: "bg-info text-white", hex: "#0891B2" },
  neutral: { texto: "text-fg-muted", fundo: "bg-neutral-soft/60", borda: "border-border-strong", solido: "bg-neutral text-white", hex: "#64748B" },
};

const VARIAVEL_TOM: Record<Tom, string> = {
  brand: "--sgp-brand",
  success: "--sgp-success",
  warning: "--sgp-warning",
  danger: "--sgp-danger",
  info: "--sgp-info",
  neutral: "--sgp-neutral",
};

const VARIAVEL_SAUDE: Record<string, string> = {
  VERDE: "--sgp-success",
  AMARELO: "--sgp-warning",
  VERMELHO: "--sgp-danger",
  CINZA: "--sgp-neutral",
};

let cacheChave = "";
let cacheValores: Record<string, string> = {};

/** Lê as variáveis de cor do tema ativo, memoizando por tema + modo. */
function coresDoTema(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const raiz = document.documentElement;
  const chave = (raiz.dataset.tema || "sgp") + "|" + (raiz.classList.contains("dark") ? "escuro" : "claro");
  if (chave === cacheChave && Object.keys(cacheValores).length) return cacheValores;

  const estilo = getComputedStyle(raiz);
  const valores: Record<string, string> = {};
  [...Object.values(VARIAVEL_TOM), ...Object.values(VARIAVEL_SAUDE)].forEach((nome) => {
    const valor = estilo.getPropertyValue(nome).trim();
    if (valor) valores[nome] = valor;
  });
  cacheChave = chave;
  cacheValores = valores;
  return valores;
}

function hexDoTom(tom: Tom): string {
  return coresDoTema()[VARIAVEL_TOM[tom]] || TONS_BASE[tom].hex;
}

export const TONS: Record<Tom, CfgTom> = new Proxy({} as Record<Tom, CfgTom>, {
  get: (_alvo, propriedade: string) => {
    const base = TONS_BASE[propriedade as Tom];
    if (!base) return undefined;
    return { ...base, hex: hexDoTom(propriedade as Tom) };
  },
  has: (_alvo, propriedade: string) => propriedade in TONS_BASE,
  ownKeys: () => Object.keys(TONS_BASE),
  getOwnPropertyDescriptor: (_alvo, propriedade: string) =>
    propriedade in TONS_BASE ? { enumerable: true, configurable: true, value: undefined } : undefined,
});

const SAUDE_BASE: Record<string, { tom: Tom; rotulo: string; icone: LucideIcon }> = {
  VERDE: { tom: "success", rotulo: "No prazo", icone: CheckCircle2 },
  AMARELO: { tom: "warning", rotulo: "Atenção", icone: AlertTriangle },
  VERMELHO: { tom: "danger", rotulo: "Crítico", icone: XCircle },
  CINZA: { tom: "neutral", rotulo: "Não avaliado", icone: Info },
};

export const CORES_SAUDE: Record<string, { cor: string; tom: Tom; rotulo: string; icone: LucideIcon }> = new Proxy(
  {} as Record<string, { cor: string; tom: Tom; rotulo: string; icone: LucideIcon }>,
  {
    get: (_alvo, propriedade: string) => {
      const base = SAUDE_BASE[propriedade];
      if (!base) return undefined;
      return { ...base, cor: coresDoTema()[VARIAVEL_SAUDE[propriedade]] || "#94A3B8" };
    },
    has: (_alvo, propriedade: string) => propriedade in SAUDE_BASE,
    ownKeys: () => Object.keys(SAUDE_BASE),
    getOwnPropertyDescriptor: (_alvo, propriedade: string) =>
      propriedade in SAUDE_BASE ? { enumerable: true, configurable: true, value: undefined } : undefined,
  }
);

/** Invalida a memoização de cores — chamado quando o tema muda. */
export function invalidarCoresDoTema() {
  cacheChave = "";
  cacheValores = {};
}

export const CORES_PRIORIDADE: Record<string, Tom> = {
  BAIXA: "neutral",
  MEDIA: "info",
  ALTA: "warning",
  CRITICA: "danger",
};

/* ==========================================================================
   Botões
   ========================================================================== */

type VarianteBotao = "primario" | "secundario" | "fantasma" | "perigo" | "sucesso" | "aviso";
type TamanhoBotao = "xs" | "sm" | "md" | "lg";

const VARIANTES_BOTAO: Record<VarianteBotao, string> = {
  primario: "bg-brand text-brand-fg hover:bg-brand-hover shadow-n1",
  secundario: "bg-surface text-fg border border-border-strong hover:bg-surface-2 shadow-n1",
  fantasma: "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
  perigo: "bg-danger text-white hover:brightness-110 shadow-n1",
  sucesso: "bg-success text-white hover:brightness-110 shadow-n1",
  aviso: "bg-warning text-white hover:brightness-110 shadow-n1",
};

const TAMANHOS_BOTAO: Record<TamanhoBotao, string> = {
  xs: "h-7 px-2 text-2xs gap-1 rounded-md",
  sm: "h-8 px-2.5 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-sgp",
  lg: "h-11 px-5 text-sm gap-2 rounded-sgp",
};

export interface PropsBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  icone?: LucideIcon;
  iconeDireita?: LucideIcon;
  carregando?: boolean;
  larguraTotal?: boolean;
}

export function Botao({
  variante = "secundario",
  tamanho = "md",
  icone: Icone,
  iconeDireita: IconeDir,
  carregando,
  larguraTotal,
  className,
  children,
  disabled,
  ...resto
}: PropsBotao) {
  return (
    <button
      type="button"
      disabled={disabled || carregando}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "active:scale-[0.98]",
        VARIANTES_BOTAO[variante],
        TAMANHOS_BOTAO[tamanho],
        larguraTotal && "w-full",
        className
      )}
      {...resto}
    >
      {carregando ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        Icone && <Icone className={cn(tamanho === "xs" ? "size-3.5" : "size-4", "shrink-0")} aria-hidden />
      )}
      {children}
      {IconeDir && !carregando && <IconeDir className="size-4 shrink-0" aria-hidden />}
    </button>
  );
}

export interface PropsBotaoIcone extends ButtonHTMLAttributes<HTMLButtonElement> {
  icone: LucideIcon;
  rotulo: string;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  ativo?: boolean;
}

export function BotaoIcone({
  icone: Icone,
  rotulo,
  variante = "fantasma",
  tamanho = "md",
  ativo,
  className,
  ...resto
}: PropsBotaoIcone) {
  const dimensao = tamanho === "xs" ? "size-7" : tamanho === "sm" ? "size-8" : tamanho === "lg" ? "size-11" : "size-9";
  const iconeDim = tamanho === "xs" ? "size-3.5" : tamanho === "lg" ? "size-5" : "size-4";
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      className={cn(
        "inline-flex items-center justify-center rounded-sgp transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50 active:scale-95",
        VARIANTES_BOTAO[variante],
        dimensao,
        ativo && "bg-brand-soft/60 text-brand",
        className
      )}
      {...resto}
    >
      <Icone className={iconeDim} aria-hidden />
    </button>
  );
}

/* ==========================================================================
   Cartões e superfícies
   ========================================================================== */

export interface PropsCartao extends HTMLAttributes<HTMLDivElement> {
  titulo?: ReactNode;
  subtitulo?: ReactNode;
  acao?: ReactNode;
  icone?: LucideIcon;
  corIcone?: string;
  interativo?: boolean;
  selecionado?: boolean;
  semPadding?: boolean;
  elevacao?: 1 | 2 | 3;
}

export function Cartao({
  titulo,
  subtitulo,
  acao,
  icone: Icone,
  corIcone,
  interativo,
  selecionado,
  semPadding,
  elevacao = 1,
  className,
  children,
  ...resto
}: PropsCartao) {
  const sombra = elevacao === 1 ? "shadow-n1" : elevacao === 2 ? "shadow-n2" : "shadow-n3";
  return (
    <div
      className={cn(
        "rounded-sgp-lg border border-border bg-surface transition-all duration-200",
        sombra,
        interativo && "cursor-pointer hover:-translate-y-0.5 hover:shadow-n2 hover:border-border-strong",
        selecionado && "ring-2 ring-brand border-brand",
        className
      )}
      {...resto}
    >
      {(titulo || acao) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icone && (
              <span
                className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md"
                style={{ backgroundColor: (corIcone || "#2563EB") + "1f", color: corIcone || "#2563EB" }}
              >
                <Icone className="size-4" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-fg">{titulo}</h3>
              {subtitulo && <p className="mt-0.5 truncate text-xs text-fg-muted">{subtitulo}</p>}
            </div>
          </div>
          {acao && <div className="flex shrink-0 items-center gap-1.5">{acao}</div>}
        </header>
      )}
      <div className={cn(!semPadding && "p-4")}>{children}</div>
    </div>
  );
}

export function SecaoColapsavel({
  titulo,
  icone: Icone,
  abertoInicial = true,
  contagem,
  children,
  className,
}: {
  titulo: string;
  icone?: LucideIcon;
  abertoInicial?: boolean;
  contagem?: number;
  children: ReactNode;
  className?: string;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  return (
    <div className={cn("rounded-sgp-lg border border-border bg-surface", className)}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={aberto}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-fg">
          {Icone && <Icone className="size-4 text-fg-muted" aria-hidden />}
          {titulo}
          {contagem !== undefined && (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs font-medium text-fg-muted">{contagem}</span>
          )}
        </span>
        <ChevronDown className={cn("size-4 text-fg-muted transition-transform", aberto && "rotate-180")} aria-hidden />
      </button>
      {aberto && <div className="border-t border-border p-4 animate-entrada">{children}</div>}
    </div>
  );
}

/* ==========================================================================
   Etiquetas, chips e indicadores
   ========================================================================== */

export function Etiqueta({
  tom = "neutral",
  icone: Icone,
  children,
  className,
  cor,
  solido,
}: {
  tom?: Tom;
  icone?: LucideIcon;
  children: ReactNode;
  className?: string;
  cor?: string;
  solido?: boolean;
}) {
  const cfg = TONS[tom];
  if (cor) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold whitespace-nowrap",
          className
        )}
        style={
          solido
            ? { backgroundColor: cor, borderColor: cor, color: "#fff" }
            : { backgroundColor: cor + "1f", borderColor: cor + "45", color: cor }
        }
      >
        {Icone && <Icone className="size-3" aria-hidden />}
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold whitespace-nowrap",
        cfg.fundo,
        cfg.borda,
        cfg.texto,
        className
      )}
    >
      {Icone && <Icone className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

export function Chip({
  children,
  cor = "#2563EB",
  icone: Icone,
  removivel,
  onRemover,
  onClick,
  ativo,
  className,
}: {
  children: ReactNode;
  cor?: string;
  icone?: LucideIcon;
  removivel?: boolean;
  onRemover?: () => void;
  onClick?: () => void;
  ativo?: boolean;
  className?: string;
}) {
  return (
    <span
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
        onClick && "cursor-pointer hover:brightness-95 active:scale-95",
        className
      )}
      style={{
        backgroundColor: ativo === false ? "transparent" : cor + (ativo === true ? "33" : "18"),
        borderColor: cor + (ativo === false ? "30" : "55"),
        color: cor,
      }}
    >
      {Icone && <Icone className="size-3.5" aria-hidden />}
      {children}
      {removivel && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemover?.();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10"
          aria-label="Remover filtro"
        >
          <X className="size-3" aria-hidden />
        </button>
      )}
    </span>
  );
}

export function Semaforo({
  saude,
  comRotulo = true,
  tamanho = "md",
}: {
  saude: string;
  comRotulo?: boolean;
  tamanho?: "sm" | "md" | "lg";
}) {
  const cfg = CORES_SAUDE[saude] || CORES_SAUDE.CINZA;
  const Icone = cfg.icone;
  const dim = tamanho === "sm" ? "size-1.5" : tamanho === "lg" ? "size-3.5" : "size-2.5";
  return (
    <span className="inline-flex items-center gap-1.5" title={cfg.rotulo}>
      <span
        className={cn("rounded-full shrink-0", dim, saude === "VERMELHO" && "animate-pulso-alerta")}
        style={{ backgroundColor: cfg.cor, boxShadow: "0 0 0 3px " + cfg.cor + "25" }}
        aria-hidden
      />
      {comRotulo && <span className="text-xs font-medium" style={{ color: cfg.cor }}>{cfg.rotulo}</span>}
      {comRotulo && <BotaoExplicacao termo="Saúde do projeto" />}
      <span className="sr-only">Saúde: {cfg.rotulo}</span>
    </span>
  );
}

export function BarraProgresso({
  valor,
  comparativo,
  cor,
  altura = "md",
  mostrarValor,
  rotulo,
  tom,
}: {
  valor: number;
  comparativo?: number;
  cor?: string;
  altura?: "sm" | "md" | "lg";
  mostrarValor?: boolean;
  rotulo?: string;
  tom?: Tom;
}) {
  const v = Math.max(0, Math.min(100, valor));
  const c = comparativo ?? 0;
  const desvio = c - v;
  const corFinal = cor || (tom ? TONS[tom].hex : desvio > 15 ? "#DC2626" : desvio > 7 ? "#D97706" : "#059669");
  const h = altura === "sm" ? "h-1.5" : altura === "lg" ? "h-3.5" : "h-2.5";
  return (
    <div className="w-full">
      {(rotulo || mostrarValor) && (
        <div className="mb-1 flex items-center justify-between text-2xs text-fg-muted">
          <span>{rotulo}</span>
          {mostrarValor && <span className="font-semibold tabular-nums text-fg">{v.toFixed(0)}%</span>}
        </div>
      )}
      <div className={cn("relative w-full overflow-hidden rounded-full bg-surface-3", h)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        {comparativo !== undefined && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-fg-subtle/25"
            style={{ width: Math.max(0, Math.min(100, c)) + "%" }}
            title={"Planejado: " + c.toFixed(0) + "%"}
          />
        )}
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500")}
          style={{ width: v + "%", backgroundColor: corFinal }}
        />
      </div>
    </div>
  );
}

export function AnelProgresso({
  valor,
  tamanho = 96,
  espessura = 9,
  cor,
  rotulo,
  subrotulo,
}: {
  valor: number;
  tamanho?: number;
  espessura?: number;
  cor?: string;
  rotulo?: string;
  subrotulo?: string;
}) {
  const v = Math.max(0, Math.min(100, valor));
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const corFinal = cor || (v >= 80 ? "#059669" : v >= 50 ? "#0891B2" : v >= 25 ? "#D97706" : "#DC2626");
  return (
    <div className="relative inline-grid place-items-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" stroke="var(--sgp-surface-3)" strokeWidth={espessura} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={corFinal}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - v / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute grid place-items-center text-center">
        <span className="text-lg font-bold tabular-nums text-fg">{rotulo ?? v.toFixed(0) + "%"}</span>
        {subrotulo && <span className="text-2xs text-fg-muted">{subrotulo}</span>}
      </div>
    </div>
  );
}

export function Avatar({
  nome,
  cor,
  iniciais,
  url,
  tamanho = "md",
  className,
  titulo,
  anel,
}: {
  nome?: string;
  cor?: string;
  iniciais?: string;
  url?: string;
  tamanho?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  titulo?: string;
  anel?: boolean;
}) {
  const dim =
    tamanho === "xs" ? "size-5 text-[9px]" : tamanho === "sm" ? "size-7 text-[10px]" : tamanho === "lg" ? "size-12 text-sm" : tamanho === "xl" ? "size-16 text-lg" : "size-9 text-xs";
  const texto = iniciais || iniciaisDe(nome);
  return (
    <span
      title={titulo || nome}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold uppercase text-white select-none",
        dim,
        anel && "ring-2 ring-surface",
        className
      )}
      style={{ backgroundColor: cor || "#64748B" }}
    >
      {url ? <img src={url} alt={nome || ""} className="size-full rounded-full object-cover" /> : texto}
    </span>
  );
}

export function PilhaAvatares({
  pessoas,
  maximo = 4,
  tamanho = "sm",
}: {
  pessoas: Array<{ id: number; nome: string; cor: string; iniciais?: string; avatar_display?: string }>;
  maximo?: number;
  tamanho?: "xs" | "sm" | "md";
}) {
  const visiveis = pessoas.slice(0, maximo);
  const restantes = pessoas.length - visiveis.length;
  return (
    <div className="flex items-center -space-x-2">
      {visiveis.map((p) => (
        <Avatar key={p.id} nome={p.nome} cor={p.cor} iniciais={p.iniciais} url={p.avatar_display} tamanho={tamanho} anel />
      ))}
      {restantes > 0 && (
        <span className="inline-grid size-7 place-items-center rounded-full bg-surface-3 text-2xs font-semibold text-fg-muted ring-2 ring-surface">
          +{restantes}
        </span>
      )}
    </div>
  );
}

/* ==========================================================================
   Formulários
   ========================================================================== */

export function Campo({
  rotulo,
  dica,
  erro,
  obrigatorio,
  children,
  className,
  htmlFor,
}: {
  rotulo?: string;
  dica?: string;
  erro?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {rotulo && (
        <label htmlFor={htmlFor} className="text-xs font-semibold text-fg">
          {rotulo}
          {obrigatorio && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {erro ? (
        <p className="text-2xs font-medium text-danger">{erro}</p>
      ) : (
        dica && <p className="text-2xs text-fg-muted">{dica}</p>
      )}
    </div>
  );
}

const ESTILO_ENTRADA =
  "w-full rounded-sgp border border-border-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle " +
  "transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:opacity-60 disabled:bg-surface-2";

export function Entrada({ className, ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(ESTILO_ENTRADA, className)} {...resto} />;
}

export function EntradaBusca({
  valor,
  onChange,
  placeholder = "Buscar...",
  className,
  autoFoco,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFoco?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
      <input
        type="search"
        value={valor}
        autoFocus={autoFoco}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(ESTILO_ENTRADA, "pl-8 pr-8")}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg"
          aria-label="Limpar busca"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function AreaTexto({ className, ...resto }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(ESTILO_ENTRADA, "min-h-20 resize-y", className)} {...resto} />;
}

export function Selecao({ className, children, ...resto }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(ESTILO_ENTRADA, "appearance-none pr-9", className)} {...resto}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
}

export function Interruptor({
  ativo,
  onChange,
  rotulo,
  descricao,
  tamanho = "md",
}: {
  ativo: boolean;
  onChange: (v: boolean) => void;
  rotulo?: string;
  descricao?: string;
  tamanho?: "sm" | "md";
}) {
  const id = useId();
  const trilha = tamanho === "sm" ? "h-5 w-9" : "h-6 w-11";
  const bolinha = tamanho === "sm" ? "size-3.5" : "size-4.5";
  const deslocamento = tamanho === "sm" ? "translate-x-4" : "translate-x-5";
  return (
    <div className="flex items-center gap-2.5">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ativo}
        onClick={() => onChange(!ativo)}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full px-0.5 transition-colors",
          trilha,
          ativo ? "bg-brand" : "bg-border-strong"
        )}
      >
        <span className={cn("rounded-full bg-white shadow-n1 transition-transform", bolinha, ativo && deslocamento)} />
      </button>
      {(rotulo || descricao) && (
        <label htmlFor={id} className="cursor-pointer leading-tight">
          {rotulo && <span className="block text-xs font-medium text-fg">{rotulo}</span>}
          {descricao && <span className="block text-2xs text-fg-muted">{descricao}</span>}
        </label>
      )}
    </div>
  );
}

export function ControleDeslizante({
  valor,
  onChange,
  min = 0,
  max = 100,
  passo = 1,
  rotulo,
  mostrarValor = true,
  sufixo = "%",
  cor,
  marcos,
}: {
  valor: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  passo?: number;
  rotulo?: string;
  mostrarValor?: boolean;
  sufixo?: string;
  cor?: string;
  marcos?: number[];
}) {
  return (
    <div className="w-full">
      {(rotulo || mostrarValor) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-fg-muted">{rotulo}</span>
          {mostrarValor && (
            <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-bold tabular-nums text-fg">
              {valor}
              {sufixo}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        style={cor ? ({ accentColor: cor } as Record<string, string>) : undefined}
        className="w-full"
      />
      {marcos && (
        <div className="mt-1 flex justify-between text-2xs text-fg-subtle">
          {marcos.map((m) => (
            <button key={m} type="button" onClick={() => onChange(m)} className="hover:text-brand hover:font-semibold">
              {m}
              {sufixo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Segmentado<T extends string>({
  valor,
  onChange,
  opcoes,
  tamanho = "md",
  className,
}: {
  valor: T;
  onChange: (v: T) => void;
  opcoes: Array<{ valor: T; rotulo: string; icone?: LucideIcon; titulo?: string }>;
  tamanho?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-sgp border border-border bg-surface-2 p-0.5", className)} role="tablist">
      {opcoes.map((o) => {
        const Icone = o.icone;
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="tab"
            aria-selected={ativo}
            title={o.titulo || o.rotulo}
            onClick={() => onChange(o.valor)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md font-medium transition-all",
              tamanho === "sm" ? "px-2 py-1 text-2xs" : "px-3 py-1.5 text-xs",
              ativo ? "bg-surface text-fg shadow-n1" : "text-fg-muted hover:text-fg"
            )}
          >
            {Icone && <Icone className="size-3.5" aria-hidden />}
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function Abas<T extends string>({
  valor,
  onChange,
  abas,
  className,
}: {
  valor: T;
  onChange: (v: T) => void;
  abas: Array<{ valor: T; rotulo: string; icone?: LucideIcon; contagem?: number; tom?: Tom }>;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5 overflow-x-auto border-b border-border no-scrollbar", className)} role="tablist">
      {abas.map((a) => {
        const Icone = a.icone;
        const ativo = a.valor === valor;
        return (
          <button
            key={a.valor}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(a.valor)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors",
              ativo ? "text-brand" : "text-fg-muted hover:text-fg"
            )}
          >
            {Icone && <Icone className="size-4" aria-hidden />}
            {a.rotulo}
            {a.contagem !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-2xs tabular-nums",
                  ativo ? "bg-brand-soft/70 text-brand" : "bg-surface-3 text-fg-muted"
                )}
              >
                {a.contagem}
              </span>
            )}
            {ativo && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Estados vazios, esqueletos e alertas
   ========================================================================== */

export function Vazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {Icone && (
        <span className="grid size-14 place-items-center rounded-2xl bg-surface-3 text-fg-subtle">
          <Icone className="size-7" aria-hidden />
        </span>
      )}
      <div>
        <p className="text-sm font-semibold text-fg">{titulo}</p>
        {descricao && <p className="mx-auto mt-1 max-w-sm text-xs text-fg-muted">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Esqueleto({ className, linhas = 1 }: { className?: string; linhas?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-4 animate-pulse rounded-md bg-surface-3" style={{ width: 100 - i * 8 + "%" }} />
      ))}
    </div>
  );
}

export function CarregandoBloco({ rotulo = "Carregando dados..." }: { rotulo?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {rotulo}
    </div>
  );
}

export function Alerta({
  tom = "info",
  titulo,
  children,
  icone,
  acao,
  className,
}: {
  tom?: Tom;
  titulo?: string;
  children?: ReactNode;
  icone?: LucideIcon;
  acao?: ReactNode;
  className?: string;
}) {
  const cfg = TONS[tom];
  const Icone = icone || (tom === "danger" || tom === "warning" ? AlertTriangle : tom === "success" ? CheckCircle2 : Info);
  return (
    <div className={cn("flex items-start gap-2.5 rounded-sgp border p-3", cfg.fundo, cfg.borda, className)} role="alert">
      <Icone className={cn("mt-0.5 size-4 shrink-0", cfg.texto)} aria-hidden />
      <div className="min-w-0 flex-1">
        {titulo && <p className={cn("text-xs font-semibold", cfg.texto)}>{titulo}</p>}
        {children && <div className="mt-0.5 text-xs text-fg-muted">{children}</div>}
      </div>
      {acao}
    </div>
  );
}

export function KPI({
  rotulo,
  valor,
  variacao,
  icone: Icone,
  cor,
  subrotulo,
  tom,
  compacto,
}: {
  rotulo: string;
  valor: ReactNode;
  variacao?: number;
  icone?: LucideIcon;
  cor?: string;
  subrotulo?: string;
  tom?: Tom;
  compacto?: boolean;
}) {
  const corFinal = cor || (tom ? TONS[tom].hex : "#2563EB");
  const positivo = (variacao ?? 0) >= 0;
  return (
    <div className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1 transition-shadow hover:shadow-n2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{rotulo}</span>
        {Icone && (
          <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ backgroundColor: corFinal + "1f", color: corFinal }}>
            <Icone className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p className={cn("mt-1.5 font-bold tabular-nums text-fg", compacto ? "text-lg" : "text-2xl")}>{valor}</p>
      <div className="mt-0.5 flex items-center gap-2">
        {variacao !== undefined && (
          <span className={cn("text-2xs font-semibold", positivo ? "text-success" : "text-danger")}>
            {positivo ? "▲" : "▼"} {Math.abs(variacao).toFixed(1)}%
          </span>
        )}
        {subrotulo && <span className="truncate text-2xs text-fg-muted">{subrotulo}</span>}
      </div>
    </div>
  );
}

/* ==========================================================================
   Sobreposições: modal, painel lateral, dica, confirmação
   ========================================================================== */

function useEsc(ativo: boolean, aoFechar: () => void) {
  useEffect(() => {
    if (!ativo) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ativo, aoFechar]);
}

export function Modal({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  largura = "md",
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo?: ReactNode;
  subtitulo?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  useEsc(aberto, onFechar);
  if (!aberto) return null;
  const larguras = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl", full: "max-w-[95vw]" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="fixed inset-0 bg-overlay backdrop-blur-sm" onClick={onFechar} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn("relative z-10 my-auto w-full rounded-sgp-xl border border-border bg-surface shadow-n3 animate-entrada", larguras[largura])}
      >
        {titulo && (
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-fg">{titulo}</h2>
              {subtitulo && <p className="mt-0.5 text-xs text-fg-muted">{subtitulo}</p>}
            </div>
            <BotaoIcone icone={X} rotulo="Fechar" onClick={onFechar} tamanho="sm" />
          </header>
        )}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
        {rodape && <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{rodape}</footer>}
      </div>
    </div>,
    document.body
  );
}

export function PainelLateral({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  largura = "md",
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo?: ReactNode;
  subtitulo?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: "sm" | "md" | "lg" | "xl";
}) {
  useEsc(aberto, onFechar);
  if (!aberto) return null;
  const larguras = { sm: "w-[380px]", md: "w-[520px]", lg: "w-[720px]", xl: "w-[900px]" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" onClick={onFechar} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn("relative z-10 flex h-full max-w-full flex-col border-l border-border bg-surface shadow-n3 animate-desliza", larguras[largura])}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-fg">{titulo}</h2>
            {subtitulo && <div className="mt-0.5 text-xs text-fg-muted">{subtitulo}</div>}
          </div>
          <BotaoIcone icone={X} rotulo="Fechar" onClick={onFechar} tamanho="sm" />
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
        {rodape && <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{rodape}</footer>}
      </aside>
    </div>,
    document.body
  );
}

export function Dica({ children, texto, lado = "top" }: { children: ReactNode; texto: ReactNode; lado?: "top" | "bottom" | "right" }) {
  const [visivel, setVisivel] = useState(false);
  const posicao =
    lado === "bottom" ? "top-full mt-2" : lado === "right" ? "left-full ml-2 top-1/2 -translate-y-1/2" : "bottom-full mb-2";
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisivel(true)}
      onMouseLeave={() => setVisivel(false)}
      onFocus={() => setVisivel(true)}
      onBlur={() => setVisivel(false)}
    >
      {children}
      {visivel && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-40 w-max max-w-64 rounded-md bg-fg px-2.5 py-1.5 text-2xs font-medium text-bg shadow-n2",
            posicao
          )}
        >
          {texto}
        </span>
      )}
    </span>
  );
}

/* ==========================================================================
   Sistema de avisos (toasts)
   ========================================================================== */

interface Aviso {
  id: number;
  titulo: string;
  descricao?: string;
  tom: Tom;
}

interface ContextoAvisos {
  avisar: (titulo: string, opcoes?: { descricao?: string; tom?: Tom }) => void;
  sucesso: (titulo: string, descricao?: string) => void;
  erro: (titulo: string, descricao?: string) => void;
  alerta: (titulo: string, descricao?: string) => void;
}

const CtxAvisos = createContext<ContextoAvisos | null>(null);

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const remover = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), []);

  const avisar = useCallback(
    (titulo: string, opcoes?: { descricao?: string; tom?: Tom }) => {
      const id = Date.now() + Math.random();
      setAvisos((a) => [...a, { id, titulo, descricao: opcoes?.descricao, tom: opcoes?.tom || "info" }]);
      setTimeout(() => remover(id), 5000);
    },
    [remover]
  );

  const valor = useMemo<ContextoAvisos>(
    () => ({
      avisar,
      sucesso: (t, d) => avisar(t, { descricao: d, tom: "success" }),
      erro: (t, d) => avisar(t, { descricao: d, tom: "danger" }),
      alerta: (t, d) => avisar(t, { descricao: d, tom: "warning" }),
    }),
    [avisar]
  );

  return (
    <CtxAvisos.Provider value={valor}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
          {avisos.map((a) => {
            const cfg = TONS[a.tom];
            const Icone = a.tom === "success" ? CheckCircle2 : a.tom === "danger" ? XCircle : a.tom === "warning" ? AlertTriangle : Info;
            return (
              <div
                key={a.id}
                className="pointer-events-auto flex items-start gap-2.5 rounded-sgp-lg border border-border bg-surface p-3 shadow-n3 animate-desliza"
              >
                <Icone className={cn("mt-0.5 size-4 shrink-0", cfg.texto)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-fg">{a.titulo}</p>
                  {a.descricao && <p className="mt-0.5 text-2xs text-fg-muted">{a.descricao}</p>}
                </div>
                <button type="button" onClick={() => remover(a.id)} className="rounded-full p-0.5 text-fg-subtle hover:bg-surface-2" aria-label="Fechar aviso">
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </CtxAvisos.Provider>
  );
}

export function useAvisos(): ContextoAvisos {
  const ctx = useContext(CtxAvisos);
  if (!ctx) throw new Error("useAvisos deve ser usado dentro de ProvedorAvisos.");
  return ctx;
}

/* ==========================================================================
   Tabela com ordenação
   ========================================================================== */

export interface ColunaTabela<T> {
  chave: string;
  titulo: ReactNode;
  largura?: string;
  alinhar?: "left" | "right" | "center";
  ordenavel?: boolean;
  valorOrdenacao?: (item: T) => string | number;
  renderizar: (item: T) => ReactNode;
}

export function Tabela<T extends { id?: number | string }>({
  colunas,
  dados,
  vazio,
  aoClicarLinha,
  destaqueLinha,
  className,
  compacta,
}: {
  colunas: Array<ColunaTabela<T>>;
  dados: T[];
  vazio?: ReactNode;
  aoClicarLinha?: (item: T) => void;
  destaqueLinha?: (item: T) => string | undefined;
  className?: string;
  compacta?: boolean;
}) {
  const [ordenacao, setOrdenacao] = useState<{ chave: string; desc: boolean } | null>(null);

  const ordenados = useMemo(() => {
    if (!ordenacao) return dados;
    const coluna = colunas.find((c) => c.chave === ordenacao.chave);
    if (!coluna?.valorOrdenacao) return dados;
    const copia = [...dados];
    copia.sort((a, b) => {
      const va = coluna.valorOrdenacao!(a);
      const vb = coluna.valorOrdenacao!(b);
      if (va === vb) return 0;
      const resultado = va > vb ? 1 : -1;
      return ordenacao.desc ? -resultado : resultado;
    });
    return copia;
  }, [dados, ordenacao, colunas]);

  if (!dados.length && vazio) return <>{vazio}</>;

  return (
    <div className={cn("overflow-x-auto scroll-thin", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {colunas.map((c) => {
              const ativo = ordenacao?.chave === c.chave;
              return (
                <th
                  key={c.chave}
                  style={c.largura ? { width: c.largura } : undefined}
                  className={cn(
                    "px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted",
                    c.alinhar === "right" ? "text-right" : c.alinhar === "center" ? "text-center" : "text-left",
                    c.ordenavel && "cursor-pointer select-none hover:text-fg"
                  )}
                  onClick={
                    c.ordenavel
                      ? () => setOrdenacao((o) => (o?.chave === c.chave ? { chave: c.chave, desc: !o.desc } : { chave: c.chave, desc: false }))
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {c.titulo}
                    {c.ordenavel && (
                      <ChevronDown
                        className={cn("size-3 transition-transform", ativo ? "text-brand" : "text-fg-subtle", ativo && ordenacao?.desc && "rotate-180")}
                        aria-hidden
                      />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ordenados.map((item, indice) => (
            <tr
              key={item.id ?? indice}
              onClick={aoClicarLinha ? () => aoClicarLinha(item) : undefined}
              className={cn(
                "border-b border-border/70 transition-colors last:border-0",
                aoClicarLinha && "cursor-pointer",
                "hover:bg-surface-2",
                destaqueLinha?.(item)
              )}
            >
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  className={cn(
                    compacta ? "px-3 py-1.5" : "px-3 py-2.5",
                    c.alinhar === "right" ? "text-right" : c.alinhar === "center" ? "text-center" : "text-left",
                    "text-fg"
                  )}
                >
                  {c.renderizar(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ==========================================================================
   Barra de ferramentas e filtros visuais
   ========================================================================== */

export function BarraFerramentas({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1", className)}>
      {children}
    </div>
  );
}

export function FiltrosAtivos({
  filtros,
  onLimpar,
}: {
  filtros: Array<{ chave: string; rotulo: string; valor: string; cor?: string; onRemover: () => void }>;
  onLimpar?: () => void;
}) {
  if (!filtros.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filtros.map((f) => (
        <Chip key={f.chave} cor={f.cor || "#2563EB"} removivel onRemover={f.onRemover}>
          <span className="font-normal opacity-70">{f.rotulo}:</span> {f.valor}
        </Chip>
      ))}
      {onLimpar && (
        <button type="button" onClick={onLimpar} className="text-2xs font-medium text-fg-muted underline hover:text-fg">
          limpar tudo
        </button>
      )}
    </div>
  );
}

export function CabecalhoPagina({
  titulo,
  subtitulo,
  icone: Icone,
  cor,
  acoes,
  migalhas,
  filhos,
  children,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  icone?: LucideIcon;
  cor?: string;
  acoes?: ReactNode;
  migalhas?: Array<{ rotulo: string; onClick?: () => void }>;
  filhos?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {migalhas && migalhas.length > 0 && (
        <nav className="flex items-center gap-1.5 text-2xs text-fg-muted" aria-label="Trilha de navegação">
          {migalhas.map((m, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-fg-subtle">/</span>}
              {m.onClick ? (
                <button type="button" onClick={m.onClick} className="hover:text-brand hover:underline">
                  {m.rotulo}
                </button>
              ) : (
                <span className="font-medium text-fg">{m.rotulo}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icone && (
            <span
              className="grid size-10 shrink-0 place-items-center rounded-sgp-lg"
              style={{ backgroundColor: (cor || "#2563EB") + "1f", color: cor || "#2563EB" }}
            >
              <Icone className="size-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-fg sm:text-2xl">{titulo}</h1>
            {subtitulo && <div className="mt-0.5 text-xs text-fg-muted">{subtitulo}</div>}
          </div>
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
      </div>
      {children ?? filhos}
    </header>
  );
}

export function EstadoVazioTabela({ mensagem, icone: Icone }: { mensagem: string; icone?: LucideIcon }) {
  return <Vazio icone={Icone} titulo={mensagem} className="py-10" />;
}

export function Marca({ compacto }: { compacto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-sgp bg-brand text-brand-fg shadow-n1">
        <Check className="size-4.5" strokeWidth={3} aria-hidden />
      </span>
      {!compacto && (
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight text-fg">SGP</span>
          <span className="block text-[9px] font-medium uppercase tracking-wider text-fg-muted">Projetos · Capacidades</span>
        </span>
      )}
    </span>
  );
}

/* ==========================================================================
   Blocos de página reutilizáveis
   ========================================================================== */

export function GradeCards({
  children,
  colunas = "auto",
  className,
}: {
  children: ReactNode;
  colunas?: "auto" | 2 | 3 | 4 | 5 | 6 | "2" | "3" | "4" | "5" | "6";
  className?: string;
}) {
  const mapa: Record<string, string> = {
    auto: "grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",
    "2": "grid-cols-1 sm:grid-cols-2",
    "3": "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
    "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    "5": "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    "6": "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };
  return <div className={cn("grid gap-3", mapa[String(colunas)], className)}>{children}</div>;
}

export function LinhaKPI({
  itens,
}: {
  itens: Array<{
    rotulo: string;
    valor: ReactNode;
    icone?: LucideIcon;
    cor?: string;
    subrotulo?: string;
    variacao?: number;
    /** Texto próprio; quando ausente, o catálogo é consultado pelo rótulo. */
    explicacao?: Explicacao;
  }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {itens.map((item, indice) => (
        <div key={item.rotulo + indice} className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1">
          <div className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                {item.rotulo}
              </span>
              <BotaoExplicacao termo={item.rotulo} explicacao={item.explicacao} />
            </span>
            {item.icone && (
              <span
                className="grid size-6 shrink-0 place-items-center rounded-md"
                style={{ backgroundColor: (item.cor || "#2563EB") + "1f", color: item.cor || "#2563EB" }}
              >
                <item.icone className="size-3.5" aria-hidden />
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-fg">{item.valor}</p>
          {item.subrotulo && <p className="mt-0.5 truncate text-2xs text-fg-muted">{item.subrotulo}</p>}
          {item.variacao !== undefined && (
            <p className={cn("mt-0.5 text-2xs font-semibold", item.variacao >= 0 ? "text-success" : "text-danger")}>
              {item.variacao >= 0 ? "▲" : "▼"} {Math.abs(item.variacao).toFixed(1)}%
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function FiltroSelect({
  rotulo,
  valor,
  onChange,
  opcoes,
  icone: Icone,
  className,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: Array<{ valor: string; rotulo: string }>;
  icone?: LucideIcon;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-1.5", className)}>
      {Icone && <Icone className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />}
      <span className="text-2xs font-medium text-fg-muted">{rotulo}</span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
      >
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

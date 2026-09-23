import { create } from "zustand";
import { api } from "@/lib/api";
import { invalidarCoresDoTema } from "@/components/ui";
import {
  TEMA_CUSTOM_VAZIO,
  TEMA_PADRAO,
  TEMAS_POR_ID,
  type ModoTema,
  type TemaCustom,
  type Tokens,
  aplicarTemaNoDocumento,
  resolverCustom,
  resolverTokens,
} from "@/lib/temas";

export type Tema = "claro" | "escuro" | "sistema";
export type Densidade = "compacta" | "padrao" | "confortavel";

/**
 * Valor da escala de espaçamento do Tailwind por densidade.
 * Precisa espelhar o que está em index.css — é o que a pré-visualização usa.
 */
export const ESCALA_DENSIDADE: Record<Densidade, string> = {
  compacta: "0.2125rem",
  padrao: "0.25rem",
  confortavel: "0.2875rem",
};

export const ROTULO_DENSIDADE: Record<Densidade, string> = {
  compacta: "Compacta",
  padrao: "Padrão",
  confortavel: "Confortável",
};

interface EstadoUi {
  /** Modo de cor. */
  tema: Tema;
  /** Identificador do tema (paleta) ativo. */
  paleta: string;
  /** Definição do tema personalizado do usuário. */
  temaCustom: TemaCustom;
  densidade: Densidade;
  sidebarRecolhida: boolean;
  /** Alias de leitura usado pelos componentes do shell. */
  recolhida: boolean;
  paletaAberta: boolean;
  painelAberto: boolean;

  defininirTema: (tema: Tema) => void;
  definirModo: (tema: Tema) => void;
  definirPaleta: (id: string) => void;
  salvarTemaCustom: (custom: TemaCustom, aplicar?: boolean) => void;
  definirDensidade: (densidade: Densidade) => void;
  alternarSidebar: () => void;
  abrirPaleta: (aberta: boolean) => void;
  alternarPainel: (aberto?: boolean) => void;
  /** Reaplica o tema no documento (útil após mudança do sistema operacional). */
  reaplicar: () => void;
  /** Sincroniza com as preferências vindas do backend. */
  sincronizar: (dados: { tema?: string; paleta?: string; tema_custom?: unknown; densidade?: string }) => void;
}

const TEMA_CHAVE = "sgp.tema";
const PALETA_CHAVE = "sgp.paleta";
const CUSTOM_CHAVE = "sgp.temaCustom";
const DENSIDADE_CHAVE = "sgp.densidade";
const SIDEBAR_CHAVE = "sgp.sidebar";

const MAPA_MODO_BACKEND: Record<string, Tema> = {
  light: "claro",
  claro: "claro",
  dark: "escuro",
  escuro: "escuro",
  system: "sistema",
  sistema: "sistema",
};

export const MAPA_MODO_PARA_BACKEND: Record<Tema, string> = {
  claro: "light",
  escuro: "dark",
  sistema: "system",
};

function lerCustom(): TemaCustom {
  try {
    const bruto = localStorage.getItem(CUSTOM_CHAVE);
    if (!bruto) return TEMA_CUSTOM_VAZIO;
    const dados = JSON.parse(bruto) as Partial<TemaCustom>;
    return {
      base: dados.base && TEMAS_POR_ID[dados.base] ? dados.base : TEMA_CUSTOM_VAZIO.base,
      nome: typeof dados.nome === "string" && dados.nome ? dados.nome : TEMA_CUSTOM_VAZIO.nome,
      claro: (dados.claro ?? {}) as Partial<Tokens>,
      escuro: (dados.escuro ?? {}) as Partial<Tokens>,
    };
  } catch {
    return TEMA_CUSTOM_VAZIO;
  }
}

/** Resolve "sistema" para o modo efetivo do sistema operacional. */
export function modoEfetivo(tema: Tema): ModoTema {
  if (tema === "claro") return "claro";
  if (tema === "escuro") return "escuro";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

function aplicarDensidade(densidade: Densidade) {
  const raiz = document.documentElement;
  raiz.classList.remove("density-compacta", "density-confortavel");
  if (densidade === "compacta") raiz.classList.add("density-compacta");
  if (densidade === "confortavel") raiz.classList.add("density-confortavel");
}

/** Persiste as preferências de aparência no backend sem bloquear a interface. */
function persistir(corpo: Record<string, unknown>) {
  api.patch("/auth/me/", corpo).catch(() => undefined);
}

let sincronizando = false;

export const useUi = create<EstadoUi>((set, get) => ({
  tema: (localStorage.getItem(TEMA_CHAVE) as Tema) || "sistema",
  paleta: localStorage.getItem(PALETA_CHAVE) || TEMA_PADRAO,
  temaCustom: lerCustom(),
  densidade: (localStorage.getItem(DENSIDADE_CHAVE) as Densidade) || "padrao",
  sidebarRecolhida: localStorage.getItem(SIDEBAR_CHAVE) === "1",
  get recolhida() {
    return get().sidebarRecolhida;
  },
  paletaAberta: false,
  painelAberto: false,

  reaplicar: () => {
    const { tema, paleta, temaCustom } = get();
    const modo = modoEfetivo(tema);
    const raiz = document.documentElement;
    raiz.classList.toggle("dark", modo === "escuro");
    raiz.style.colorScheme = modo;
    aplicarTemaNoDocumento(paleta, modo, temaCustom, raiz);
    // As cores semânticas lidas em JavaScript precisam ser relidas após a troca.
    invalidarCoresDoTema();
  },

  defininirTema: (tema) => {
    localStorage.setItem(TEMA_CHAVE, tema);
    set({ tema });
    get().reaplicar();
    if (!sincronizando) persistir({ tema: MAPA_MODO_PARA_BACKEND[tema] });
  },

  definirModo: (tema) => get().defininirTema(tema),

  definirPaleta: (id) => {
    const alvo = TEMAS_POR_ID[id] ? id : id === "custom" ? "custom" : TEMA_PADRAO;
    localStorage.setItem(PALETA_CHAVE, alvo);
    set({ paleta: alvo });
    get().reaplicar();
    if (!sincronizando) persistir({ paleta: alvo });
  },

  salvarTemaCustom: (custom, aplicar = true) => {
    localStorage.setItem(CUSTOM_CHAVE, JSON.stringify(custom));
    set({ temaCustom: custom, paleta: aplicar ? "custom" : get().paleta });
    if (aplicar) localStorage.setItem(PALETA_CHAVE, "custom");
    get().reaplicar();
    if (!sincronizando) persistir({ tema_custom: custom, ...(aplicar ? { paleta: "custom" } : {}) });
  },

  definirDensidade: (densidade) => {
    localStorage.setItem(DENSIDADE_CHAVE, densidade);
    aplicarDensidade(densidade);
    set({ densidade });
    if (!sincronizando) persistir({ densidade });
  },

  alternarSidebar: () => {
    const valor = !get().sidebarRecolhida;
    localStorage.setItem(SIDEBAR_CHAVE, valor ? "1" : "0");
    set({ sidebarRecolhida: valor, recolhida: valor });
  },

  abrirPaleta: (aberta) => set({ paletaAberta: aberta }),
  alternarPainel: (aberto) => set({ painelAberto: aberto ?? !get().painelAberto }),

  sincronizar: (dados) => {
    sincronizando = true;
    try {
      const tema = dados.tema ? MAPA_MODO_BACKEND[dados.tema] : undefined;
      const paleta = dados.paleta && (TEMAS_POR_ID[dados.paleta] || dados.paleta === "custom")
        ? dados.paleta
        : undefined;
      const custom = dados.tema_custom && typeof dados.tema_custom === "object" && Object.keys(dados.tema_custom).length
        ? (dados.tema_custom as TemaCustom)
        : undefined;
      const densidade = ["compacta", "padrao", "confortavel"].includes(String(dados.densidade))
        ? (dados.densidade as Densidade)
        : undefined;

      // A escolha local tem precedência: só adota o valor do backend se ainda não houver preferência local.
      if (tema && !localStorage.getItem(TEMA_CHAVE)) {
        localStorage.setItem(TEMA_CHAVE, tema);
        set({ tema });
      }
      if (paleta && !localStorage.getItem(PALETA_CHAVE)) {
        localStorage.setItem(PALETA_CHAVE, paleta);
        set({ paleta });
      }
      if (custom && !localStorage.getItem(CUSTOM_CHAVE)) {
        localStorage.setItem(CUSTOM_CHAVE, JSON.stringify(custom));
        set({ temaCustom: custom });
      }
      if (densidade && !localStorage.getItem(DENSIDADE_CHAVE)) {
        localStorage.setItem(DENSIDADE_CHAVE, densidade);
        set({ densidade });
        aplicarDensidade(densidade);
      }
      get().reaplicar();
    } finally {
      sincronizando = false;
    }
  },
}));

export function inicializarUi() {
  const estado = useUi.getState();
  aplicarDensidade(estado.densidade);
  estado.reaplicar();

  const consulta = window.matchMedia("(prefers-color-scheme: dark)");
  const aoMudar = () => {
    if (useUi.getState().tema === "sistema") useUi.getState().reaplicar();
  };
  if (consulta.addEventListener) consulta.addEventListener("change", aoMudar);
  else consulta.addListener(aoMudar);
}

/** Tokens efetivamente aplicados no documento. */
export function tokensAtuais(paleta?: string, tema?: Tema, custom?: TemaCustom): Tokens {
  const estado = useUi.getState();
  const id = paleta ?? estado.paleta;
  const modo = modoEfetivo(tema ?? estado.tema);
  if (id === "custom") return resolverCustom(custom ?? estado.temaCustom, modo);
  const definicao = TEMAS_POR_ID[id] ?? TEMAS_POR_ID[TEMA_PADRAO];
  return resolverTokens(definicao, modo);
}

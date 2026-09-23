/* ==========================================================================
   Sistema de temas do SGP
   --------------------------------------------------------------------------
   Cada tema é definido por uma "semente" (cor de marca + estados + neutro) e
   os tokens completos são derivados dela por matemática de cor. Isso garante
   consistência entre todos os temas e torna o editor de tema personalizado
   trivial. Um tema pode sobrescrever qualquer token específico.

   INVARIANTE IMPORTANTE: todo token de cor é um HEX de 6 dígitos, porque os
   componentes concatenam alfa em JavaScript (ex.: cor + "1f").
   ========================================================================== */

export type ModoTema = "claro" | "escuro";

export interface Tokens {
  bg: string;
  bgAlt: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  overlay: string;
  brand: string;
  brandHover: string;
  brandSoft: string;
  brandFg: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  neutral: string;
  neutralSoft: string;
  sombra: string;
  raio: string;
}

export const VARIAVEIS: Record<keyof Tokens, string> = {
  bg: "--sgp-bg",
  bgAlt: "--sgp-bg-alt",
  surface: "--sgp-surface",
  surface2: "--sgp-surface-2",
  surface3: "--sgp-surface-3",
  border: "--sgp-border",
  borderStrong: "--sgp-border-strong",
  fg: "--sgp-fg",
  fgMuted: "--sgp-fg-muted",
  fgSubtle: "--sgp-fg-subtle",
  overlay: "--sgp-overlay",
  brand: "--sgp-brand",
  brandHover: "--sgp-brand-hover",
  brandSoft: "--sgp-brand-soft",
  brandFg: "--sgp-brand-fg",
  success: "--sgp-success",
  successSoft: "--sgp-success-soft",
  warning: "--sgp-warning",
  warningSoft: "--sgp-warning-soft",
  danger: "--sgp-danger",
  dangerSoft: "--sgp-danger-soft",
  info: "--sgp-info",
  infoSoft: "--sgp-info-soft",
  neutral: "--sgp-neutral",
  neutralSoft: "--sgp-neutral-soft",
  sombra: "--sgp-sombra",
  raio: "--radius-sgp",
};

/* ==========================================================================
   Matemática de cor
   ========================================================================== */

interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexParaRgb(hex: string): RGB {
  const limpo = (hex || "#000000").replace("#", "").trim();
  const completo = limpo.length === 3 ? limpo.split("").map((c) => c + c).join("") : limpo.padEnd(6, "0").slice(0, 6);
  return {
    r: parseInt(completo.slice(0, 2), 16) || 0,
    g: parseInt(completo.slice(2, 4), 16) || 0,
    b: parseInt(completo.slice(4, 6), 16) || 0,
  };
}

export function rgbParaHex({ r, g, b }: RGB): string {
  const limitar = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [r, g, b].map((v) => limitar(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Interpola linearmente entre duas cores. t = 0 devolve a, t = 1 devolve b. */
export function misturar(a: string, b: string, t: number): string {
  const ca = hexParaRgb(a);
  const cb = hexParaRgb(b);
  const f = Math.max(0, Math.min(1, t));
  return rgbParaHex({
    r: ca.r + (cb.r - ca.r) * f,
    g: ca.g + (cb.g - ca.g) * f,
    b: ca.b + (cb.b - ca.b) * f,
  });
}

function paraHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexParaRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
    else if (max === gg) h = ((bb - rr) / d + 2) / 6;
    else h = ((rr - gg) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function deHsl(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360 / 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  if (ss === 0) {
    const v = Math.round(ll * 255);
    return rgbParaHex({ r: v, g: v, b: v });
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const canal = (t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return rgbParaHex({ r: canal(hh + 1 / 3) * 255, g: canal(hh) * 255, b: canal(hh - 1 / 3) * 255 });
}

/** Soma (ou subtrai) pontos percentuais de luminosidade. */
export function ajustarLuminosidade(hex: string, delta: number): string {
  const { h, s, l } = paraHsl(hex);
  return deHsl(h, s, l + delta);
}

/** Soma (ou subtrai) pontos percentuais de saturação. */
export function ajustarSaturacao(hex: string, delta: number): string {
  const { h, s, l } = paraHsl(hex);
  return deHsl(h, s + delta, l);
}

/** Rotaciona a matiz — usado para derivar cores complementares. */
export function rotacionarMatiz(hex: string, graus: number): string {
  const { h, s, l } = paraHsl(hex);
  return deHsl(h + graus, s, l);
}

function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexParaRgb(hex);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste WCAG 2.1 entre duas cores (1 a 21). */
export function contrasteWCAG(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);
  return (claro + 0.05) / (escuro + 0.05);
}

/** Escolhe texto claro ou escuro conforme o melhor contraste (RNF-15). */
export function textoSobre(fundo: string, claro = "#FFFFFF", escuro = "#0F172A"): string {
  return contrasteWCAG(fundo, escuro) >= contrasteWCAG(fundo, claro) ? escuro : claro;
}

/**
 * Ajusta a luminosidade de uma cor de fundo até que ela atinja o contraste
 * mínimo exigido com o texto informado, preservando matiz e saturação.
 *
 * É o que garante o requisito RNF-15 (WCAG 2.1 AA) mesmo quando a cor de marca
 * é clara demais para receber texto branco — como acontece com o vermelho
 * Bradesco no modo escuro. O deslocamento é o menor possível.
 */
export function garantirContrasteAA(fundo: string, texto: string, minimo = 4.5, limite = 60): string {
  if (contrasteWCAG(texto, fundo) >= minimo) return fundo;

  const luminanciaTexto = luminanciaRelativa(texto);
  // Se o texto é claro, o fundo precisa escurecer; se é escuro, precisa clarear.
  const escurecer = luminanciaTexto > 0.5;
  let cor = fundo;
  let melhor = fundo;
  let melhorRazao = contrasteWCAG(texto, fundo);

  for (let passo = 0; passo < limite; passo++) {
    cor = ajustarLuminosidade(cor, escurecer ? -1 : 1);
    const razao = contrasteWCAG(texto, cor);
    if (razao > melhorRazao) {
      melhorRazao = razao;
      melhor = cor;
    }
    if (razao >= minimo) return cor;
  }
  return melhor;
}

export function rgba(hex: string, alfa: number): string {
  const { r, g, b } = hexParaRgb(hex);
  return "rgba(" + r + ", " + g + ", " + b + ", " + alfa + ")";
}

/* ==========================================================================
   Definição dos temas
   ========================================================================== */

export interface Semente {
  /** Cor primária da marca. */
  marca: string;
  /** Cor secundária (usada como `info` e em destaques). */
  secundaria?: string;
  sucesso?: string;
  aviso?: string;
  perigo?: string;
  /** Matiz de referência para fundos, bordas e textos neutros. */
  neutro?: string;
  /** Fundo base do modo claro; se ausente, é derivado da marca. */
  fundoClaro?: string;
  /** Fundo base do modo escuro; se ausente, é derivado da marca. */
  fundoEscuro?: string;
  /** Texto sobre a cor de marca: "auto" escolhe pelo contraste. */
  textoMarca?: string;
  /** Raio base dos cantos, ex.: "8px". */
  raio?: string;
  /** Cor base das sombras. */
  sombra?: string;
}

export interface DefinicaoTema {
  id: string;
  nome: string;
  descricao: string;
  categoria: "institucional" | "classico" | "vibrante" | "acessibilidade";
  semente: Semente;
  sobrescrever?: { claro?: Partial<Tokens>; escuro?: Partial<Tokens> };
  /** Nota sobre a origem das cores — exibida no seletor. */
  referencia?: string;
  /** Temas de acessibilidade são marcados com selo. */
  acessivel?: boolean;
}

function derivar(semente: Semente, modo: ModoTema): Tokens {
  const marca = semente.marca;
  const neutro = semente.neutro || rotacionarMatiz(marca, 0);
  const escuro = modo === "escuro";

  const sucesso = semente.sucesso || (escuro ? "#10B981" : "#059669");
  const aviso = semente.aviso || (escuro ? "#F59E0B" : "#D97706");
  const perigo = semente.perigo || (escuro ? "#F87171" : "#DC2626");
  const info = semente.secundaria || (escuro ? "#22D3EE" : "#0891B2");

  // A marca clareia no modo escuro para ganhar presença sobre o fundo escuro,
  // mas nunca ao ponto de reprovar no contraste com o texto do botão (RNF-15).
  const marcaBase = escuro ? ajustarLuminosidade(marca, 8) : marca;
  const textoMarca = semente.textoMarca || textoSobre(marcaBase);
  const marcaAjustada = semente.textoMarca
    ? marcaBase
    : garantirContrasteAA(marcaBase, textoMarca, 4.5);

  if (!escuro) {
    const bg = semente.fundoClaro || misturar(neutro, "#F7F9FC", 0.93);
    return {
      bg,
      bgAlt: ajustarLuminosidade(bg, -2.5),
      surface: "#FFFFFF",
      surface2: misturar(bg, "#FFFFFF", 0.5),
      surface3: misturar(bg, neutro, 0.1),
      border: misturar(neutro, "#E4E9F0", 0.9),
      borderStrong: misturar(neutro, "#C7D0DC", 0.88),
      fg: misturar(neutro, "#0F172A", 0.94),
      fgMuted: misturar(neutro, "#64748B", 0.9),
      fgSubtle: misturar(neutro, "#94A3B8", 0.9),
      overlay: rgba(misturar(neutro, "#0F172A", 0.94), 0.45),
      brand: marcaAjustada,
      brandHover: ajustarLuminosidade(marcaAjustada, -7),
      brandSoft: misturar(marcaAjustada, "#FFFFFF", 0.87),
      brandFg: textoMarca,
      success: sucesso,
      successSoft: misturar(sucesso, "#FFFFFF", 0.86),
      warning: aviso,
      warningSoft: misturar(aviso, "#FFFFFF", 0.84),
      danger: perigo,
      dangerSoft: misturar(perigo, "#FFFFFF", 0.88),
      info,
      infoSoft: misturar(info, "#FFFFFF", 0.86),
      neutral: misturar(neutro, "#64748B", 0.88),
      neutralSoft: misturar(neutro, "#E2E8F0", 0.9),
      sombra: semente.sombra || rgba(misturar(neutro, "#0F172A", 0.94), 1),
      raio: semente.raio || "8px",
    };
  }

  const bg = semente.fundoEscuro || misturar(neutro, "#080D18", 0.94);
  return {
    bg,
    bgAlt: ajustarLuminosidade(bg, 2.2),
    surface: ajustarLuminosidade(bg, 5),
    surface2: ajustarLuminosidade(bg, 8.5),
    surface3: ajustarLuminosidade(bg, 13),
    border: ajustarLuminosidade(bg, 16),
    borderStrong: ajustarLuminosidade(bg, 24),
    fg: misturar(neutro, "#E8EDF7", 0.95),
    fgMuted: misturar(neutro, "#9AA9C0", 0.92),
    fgSubtle: misturar(neutro, "#64748B", 0.9),
    overlay: rgba("#020610", 0.7),
    brand: marcaAjustada,
    brandHover: ajustarLuminosidade(marcaAjustada, 9),
    brandSoft: ajustarLuminosidade(misturar(marcaAjustada, bg, 0.55), -6),
    brandFg: textoMarca,
    success: sucesso,
    successSoft: misturar(sucesso, bg, 0.78),
    warning: aviso,
    warningSoft: misturar(aviso, bg, 0.76),
    danger: perigo,
    dangerSoft: misturar(perigo, bg, 0.78),
    info,
    infoSoft: misturar(info, bg, 0.78),
    neutral: misturar(neutro, "#94A3B8", 0.92),
    neutralSoft: ajustarLuminosidade(bg, 11),
    sombra: semente.sombra || "#000000",
    raio: semente.raio || "8px",
  };
}

export function resolverTokens(tema: DefinicaoTema, modo: ModoTema): Tokens {
  return { ...derivar(tema.semente, modo), ...(tema.sobrescrever?.[modo] ?? {}) };
}

/* ==========================================================================
   Temas predefinidos
   ========================================================================== */

export const TEMAS: DefinicaoTema[] = [
  {
    id: "sgp",
    nome: "Azul SGP",
    descricao: "Identidade padrão do sistema. Azul corporativo com neutros frios e alta legibilidade.",
    categoria: "institucional",
    semente: { marca: "#2563EB", secundaria: "#0891B2", neutro: "#2563EB" },
    referencia: "Paleta original do SGP (especificação §2.5).",
  },
  {
    id: "bradesco",
    nome: "Bradesco 2026",
    descricao:
      "Vermelho institucional Bradesco com o roxo da identidade e neutros quentes. Cores vibrantes sobre base sóbria.",
    categoria: "institucional",
    semente: {
      marca: "#CC092F",
      secundaria: "#633280",
      sucesso: "#0F8A5F",
      aviso: "#C77700",
      perigo: "#A5041F",
      neutro: "#CC092F",
      fundoClaro: "#F7F4F5",
      fundoEscuro: "#140A0E",
      sombra: "#3B0A16",
    },
    referencia:
      "Baseado nas cores públicas da marca Bradesco: Vermelho Bradesco #CC092F, Roxo institucional #633280, Preto #231F20 e Cinza #EBEBEB (brandbook Bradesco).",
  },
  {
    id: "esmeralda",
    nome: "Esmeralda",
    descricao: "Verde institucional para contextos financeiros e de sustentabilidade.",
    categoria: "classico",
    semente: { marca: "#047857", secundaria: "#0E7490", neutro: "#047857", fundoEscuro: "#05140F" },
  },
  {
    id: "oceano",
    nome: "Oceano",
    descricao: "Ciano profundo com neutros frios. Boa densidade para dashboards analíticos.",
    categoria: "classico",
    semente: { marca: "#0E7490", secundaria: "#4F46E5", neutro: "#0E7490", fundoEscuro: "#04121A" },
  },
  {
    id: "violeta",
    nome: "Violeta",
    descricao: "Roxo contemporâneo com contraste firme. Destaque para módulos de capacidades.",
    categoria: "vibrante",
    semente: { marca: "#7C3AED", secundaria: "#DB2777", neutro: "#7C3AED", fundoEscuro: "#0C0718" },
  },
  {
    id: "ambar",
    nome: "Âmbar",
    descricao: "Laranja quente com texto escuro sobre a marca. Enérgico, para times operacionais.",
    categoria: "vibrante",
    semente: {
      marca: "#EA580C",
      secundaria: "#0F766E",
      neutro: "#EA580C",
      fundoClaro: "#FBF7F4",
      fundoEscuro: "#170B05",
    },
  },
  {
    id: "grafite",
    nome: "Grafite",
    descricao: "Neutro minimalista com cantos retos. Máxima neutralidade para leitura de dados.",
    categoria: "classico",
    semente: {
      marca: "#334155",
      secundaria: "#0EA5E9",
      neutro: "#334155",
      raio: "2px",
      fundoEscuro: "#0A0D12",
    },
  },
  {
    id: "alto-contraste",
    nome: "Alto contraste",
    descricao:
      "Contraste máximo para baixa visão e uso sob luz forte. Atende WCAG 2.1 AAA no texto principal.",
    categoria: "acessibilidade",
    acessivel: true,
    semente: {
      marca: "#00308F",
      secundaria: "#006B5F",
      sucesso: "#006400",
      aviso: "#8A5000",
      perigo: "#B00020",
      neutro: "#00308F",
      fundoClaro: "#FFFFFF",
      fundoEscuro: "#000000",
      textoMarca: "#FFFFFF",
      raio: "4px",
    },
    sobrescrever: {
      claro: {
        bg: "#FFFFFF",
        bgAlt: "#F2F2F2",
        surface: "#FFFFFF",
        surface2: "#F7F7F7",
        surface3: "#EBEBEB",
        border: "#767676",
        borderStrong: "#000000",
        fg: "#000000",
        fgMuted: "#333333",
        fgSubtle: "#4A4A4A",
        brandSoft: "#DCE6F8",
        neutralSoft: "#E6E6E6",
      },
      escuro: {
        bg: "#000000",
        bgAlt: "#0A0A0A",
        surface: "#121212",
        surface2: "#1A1A1A",
        surface3: "#242424",
        border: "#8A8A8A",
        borderStrong: "#FFFFFF",
        fg: "#FFFFFF",
        fgMuted: "#D9D9D9",
        fgSubtle: "#BFBFBF",
        brand: "#FFD400",
        brandHover: "#FFE066",
        brandSoft: "#3D3200",
        brandFg: "#000000",
        success: "#4ADE80",
        successSoft: "#04331C",
        warning: "#FBBF24",
        warningSoft: "#3A2A00",
        danger: "#FF6B6B",
        dangerSoft: "#3A0A0A",
        info: "#67E8F9",
        infoSoft: "#062A33",
        neutralSoft: "#242424",
      },
    },
  },
];

export const TEMAS_POR_ID: Record<string, DefinicaoTema> = TEMAS.reduce<Record<string, DefinicaoTema>>(
  (acc, tema) => {
    acc[tema.id] = tema;
    return acc;
  },
  {}
);

export const TEMA_PADRAO = "sgp";

/* ==========================================================================
   Tema personalizado
   ========================================================================== */

export interface TemaCustom {
  /** Tema predefinido usado como base estrutural. */
  base: string;
  nome: string;
  /** Ajustes finos sobre a base, por modo. */
  claro: Partial<Tokens>;
  escuro: Partial<Tokens>;
}

export const TEMA_CUSTOM_VAZIO: TemaCustom = { base: TEMA_PADRAO, nome: "Meu tema", claro: {}, escuro: {} };

export function resolverCustom(custom: TemaCustom, modo: ModoTema): Tokens {
  const base = TEMAS_POR_ID[custom.base] ?? TEMAS_POR_ID[TEMA_PADRAO];
  const tokens = resolverTokens(base, modo);
  const ajustes = custom[modo] ?? {};
  const resultado = { ...tokens };
  (Object.keys(ajustes) as Array<keyof Tokens>).forEach((chave) => {
    const valor = ajustes[chave];
    if (valor) resultado[chave] = valor;
  });
  return resultado;
}

/** Campos expostos no editor de tema personalizado. */
export const CAMPOS_EDITAVEIS: Array<{
  chave: keyof Tokens;
  rotulo: string;
  grupo: "Marca" | "Superfícies" | "Texto e bordas" | "Estados";
}> = [
  { chave: "brand", rotulo: "Cor da marca", grupo: "Marca" },
  { chave: "brandHover", rotulo: "Marca (hover)", grupo: "Marca" },
  { chave: "brandSoft", rotulo: "Marca suave", grupo: "Marca" },
  { chave: "brandFg", rotulo: "Texto sobre a marca", grupo: "Marca" },
  { chave: "bg", rotulo: "Fundo da aplicação", grupo: "Superfícies" },
  { chave: "surface", rotulo: "Superfície (cartões)", grupo: "Superfícies" },
  { chave: "surface2", rotulo: "Superfície secundária", grupo: "Superfícies" },
  { chave: "surface3", rotulo: "Superfície terciária", grupo: "Superfícies" },
  { chave: "border", rotulo: "Borda", grupo: "Texto e bordas" },
  { chave: "borderStrong", rotulo: "Borda forte", grupo: "Texto e bordas" },
  { chave: "fg", rotulo: "Texto principal", grupo: "Texto e bordas" },
  { chave: "fgMuted", rotulo: "Texto secundário", grupo: "Texto e bordas" },
  { chave: "fgSubtle", rotulo: "Texto discreto", grupo: "Texto e bordas" },
  { chave: "success", rotulo: "Sucesso", grupo: "Estados" },
  { chave: "warning", rotulo: "Alerta", grupo: "Estados" },
  { chave: "danger", rotulo: "Perigo", grupo: "Estados" },
  { chave: "info", rotulo: "Informativo", grupo: "Estados" },
];

/* ==========================================================================
   Aplicação no documento
   ========================================================================== */

/** Escreve os tokens como variáveis CSS inline no elemento raiz. */
export function aplicarTokens(tokens: Tokens, elemento: HTMLElement = document.documentElement): void {
  (Object.keys(VARIAVEIS) as Array<keyof Tokens>).forEach((chave) => {
    const nome = VARIAVEIS[chave];
    const valor = tokens[chave];
    if (chave === "raio") {
      const px = parseInt(valor, 10) || 8;
      elemento.style.setProperty("--radius-sgp", px + "px");
      elemento.style.setProperty("--radius-sgp-lg", px + 4 + "px");
      elemento.style.setProperty("--radius-sgp-xl", px + 8 + "px");
      return;
    }
    if (valor) elemento.style.setProperty(nome, valor);
  });

  const base = tokens.sombra;
  elemento.style.setProperty("--sgp-shadow-1", "0 1px 2px " + rgba(base, 0.07) + ", 0 1px 3px " + rgba(base, 0.09));
  elemento.style.setProperty("--sgp-shadow-2", "0 4px 8px " + rgba(base, 0.08) + ", 0 2px 4px " + rgba(base, 0.06));
  elemento.style.setProperty("--sgp-shadow-3", "0 16px 32px " + rgba(base, 0.16) + ", 0 4px 12px " + rgba(base, 0.09));
}

/** Remove as variáveis inline, voltando ao tema definido no CSS. */
export function limparTokens(elemento: HTMLElement = document.documentElement): void {
  (Object.keys(VARIAVEIS) as Array<keyof Tokens>).forEach((chave) => {
    elemento.style.removeProperty(VARIAVEIS[chave]);
  });
  ["--radius-sgp", "--radius-sgp-lg", "--radius-sgp-xl", "--sgp-shadow-1", "--sgp-shadow-2", "--sgp-shadow-3"].forEach(
    (nome) => elemento.style.removeProperty(nome)
  );
}

/** Resolve os tokens de um tema (predefinido ou personalizado) e aplica. */
export function aplicarTemaNoDocumento(
  id: string,
  modo: ModoTema,
  custom?: TemaCustom | null,
  elemento: HTMLElement = document.documentElement
): Tokens {
  const tema = TEMAS_POR_ID[id];
  let tokens: Tokens;
  if (id === "custom") {
    tokens = resolverCustom(custom ?? TEMA_CUSTOM_VAZIO, modo);
    elemento.dataset.tema = "custom";
  } else if (tema) {
    tokens = resolverTokens(tema, modo);
    elemento.dataset.tema = tema.id;
  } else {
    tokens = resolverTokens(TEMAS_POR_ID[TEMA_PADRAO], modo);
    elemento.dataset.tema = TEMA_PADRAO;
  }
  aplicarTokens(tokens, elemento);
  return tokens;
}

/** Paleta de amostras para os cartões do seletor. */
export function amostrasDoTema(tema: DefinicaoTema, modo: ModoTema): string[] {
  const t = resolverTokens(tema, modo);
  return [t.brand, t.brandSoft, t.success, t.warning, t.danger, t.info, t.surface, t.fg];
}

/** Contraste do texto principal sobre o fundo — usado no selo de acessibilidade. */
export function contrastePrincipal(tema: DefinicaoTema, modo: ModoTema): number {
  const t = resolverTokens(tema, modo);
  return contrasteWCAG(t.fg, t.bg);
}

export function nivelContraste(razao: number): { rotulo: string; tom: "success" | "warning" | "danger" } {
  if (razao >= 7) return { rotulo: "AAA", tom: "success" };
  if (razao >= 4.5) return { rotulo: "AA", tom: "success" };
  if (razao >= 3) return { rotulo: "AA (texto grande)", tom: "warning" };
  return { rotulo: "Insuficiente", tom: "danger" };
}

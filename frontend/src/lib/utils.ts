import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Identificador estável para listas sem id próprio. */
export function chaveUnica(prefixo: string, indice: number | string) {
  return prefixo + "-" + indice;
}

/** Converte hex para rgba com opacidade — usado em preenchimentos de gráfico. */
export function comAlfa(hex: string | undefined, alfa: number): string {
  const cor = (hex || "#94A3B8").replace("#", "");
  const expandida = cor.length === 3 ? cor.split("").map((c) => c + c).join("") : cor;
  const r = parseInt(expandida.slice(0, 2), 16) || 148;
  const g = parseInt(expandida.slice(2, 4), 16) || 163;
  const b = parseInt(expandida.slice(4, 6), 16) || 184;
  return "rgba(" + r + ", " + g + ", " + b + ", " + alfa + ")";
}

/** Clareia/escurece uma cor hex. percentual entre -1 e 1. */
export function ajustarCor(hex: string, percentual: number): string {
  const cor = (hex || "#94A3B8").replace("#", "");
  const expandida = cor.length === 3 ? cor.split("").map((c) => c + c).join("") : cor;
  const num = parseInt(expandida, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + Math.round(255 * percentual)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * percentual)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * percentual)));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Agrupa um array por uma chave derivada. */
export function agrupar<T, K extends string | number>(itens: T[], seletor: (item: T) => K) {
  return itens.reduce<Record<K, T[]>>((acc, item) => {
    const chave = seletor(item);
    (acc[chave] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function soma(itens: number[]) {
  return itens.reduce((a, b) => a + b, 0);
}

export function media(itens: number[]) {
  return itens.length ? soma(itens) / itens.length : 0;
}

/** Interpola cor entre vermelho → amarelo → verde conforme um valor 0..1. */
export function corPorValor(valor: number, invertido = false): string {
  const v = Math.max(0, Math.min(1, invertido ? 1 - valor : valor));
  if (v >= 0.8) return "#10B981";
  if (v >= 0.6) return "#84CC16";
  if (v >= 0.45) return "#F59E0B";
  if (v >= 0.3) return "#F97316";
  return "#EF4444";
}

/** Cor da escala de calor para níveis de proficiência 0..5. */
export function corNivel(nivel: number): string {
  const mapa: Record<number, string> = {
    0: "var(--sgp-surface-3)",
    1: "#334155",
    2: "#0369a1",
    3: "#0891b2",
    4: "#059669",
    5: "#7c3aed",
  };
  return mapa[Math.round(nivel)] ?? "var(--sgp-surface-3)";
}

export function nivelLegenda() {
  return [
    { nivel: 1, nome: "Iniciante" },
    { nivel: 2, nome: "Básico" },
    { nivel: 3, nome: "Intermediário" },
    { nivel: 4, nome: "Avançado" },
    { nivel: 5, nome: "Especialista" },
  ];
}

export function slug(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

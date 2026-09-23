import { format, formatDistanceToNow, parseISO, differenceInCalendarDays, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

function paraData(valor?: string | Date | null): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return isValid(valor) ? valor : null;
  try {
    const d = parseISO(String(valor).slice(0, 10));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

export function dataCurta(valor?: string | Date | null) {
  const d = paraData(valor);
  return d ? format(d, "dd/MM/yyyy") : "—";
}

export function dataMedia(valor?: string | Date | null) {
  const d = paraData(valor);
  return d ? format(d, "dd MMM yyyy", { locale: ptBR }) : "—";
}

export function dataHora(valor?: string | Date | null) {
  if (!valor) return "—";
  try {
    const d = typeof valor === "string" ? parseISO(valor) : valor;
    return isValid(d) ? format(d, "dd/MM/yyyy HH:mm") : "—";
  } catch {
    return "—";
  }
}

export function dataRelativa(valor?: string | Date | null) {
  const d = paraData(valor) || (valor ? new Date(valor) : null);
  if (!d || !isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function mesCurto(valor?: string | null) {
  if (!valor) return "—";
  const iso = valor.length === 7 ? valor + "-01" : valor;
  const d = paraData(iso);
  return d ? format(d, "MMM/yy", { locale: ptBR }) : valor;
}

export function diasEntre(inicio?: string | null, fim?: string | null) {
  const a = paraData(inicio);
  const b = paraData(fim);
  if (!a || !b) return 0;
  return differenceInCalendarDays(b, a);
}

export function moeda(valor?: number | string | null, compacto = false) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (compacto) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return "R$ " + (n / 1_000_000_000).toFixed(1).replace(".", ",") + " bi";
    if (abs >= 1_000_000) return "R$ " + (n / 1_000_000).toFixed(1).replace(".", ",") + " mi";
    if (abs >= 1_000) return "R$ " + (n / 1_000).toFixed(0) + " mil";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: compacto ? 0 : 2,
  }).format(n);
}

export function numero(valor?: number | string | null, casas = 0) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(n);
}

export function percentual(valor?: number | string | null, casas = 0) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return numero(n, casas) + "%";
}

export function horas(valor?: number | string | null) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return numero(n, n % 1 === 0 ? 0 : 1) + " h";
}

export function indice(valor?: number | null, casas = 2) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return valor.toFixed(casas).replace(".", ",");
}

export function iniciaisDe(nome?: string) {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase() || "?";
}

/** Rótulo curto para um intervalo de datas. */
export function intervalo(inicio?: string | null, fim?: string | null) {
  if (!inicio && !fim) return "Sem datas definidas";
  return dataCurta(inicio) + " → " + dataCurta(fim);
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function hojeISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function somarDias(iso: string, dias: number) {
  const d = paraData(iso) || new Date();
  const novo = new Date(d);
  novo.setDate(novo.getDate() + dias);
  return format(novo, "yyyy-MM-dd");
}

export function inicioDoMes(iso?: string) {
  const d = paraData(iso) || new Date();
  return format(new Date(d.getFullYear(), d.getMonth(), 1), "yyyy-MM-dd");
}

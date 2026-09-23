import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { Paginado } from "./types";

const BASE_URL = "/api/v1";
const CHAVE_ACESSO = "sgp.access";
const CHAVE_REFRESH = "sgp.refresh";
const CHAVE_PERSISTIR = "sgp.persistir";

/**
 * Guarda dos tokens de sessão.
 *
 * Com "manter sessão ativa" marcado, os tokens vão para o armazenamento local e
 * sobrevivem ao fechamento do navegador. Sem a marcação, ficam apenas no
 * armazenamento da aba e são descartados quando ela é fechada — o que é o
 * comportamento esperado em computadores compartilhados.
 */
function destino(persistir: boolean): Storage {
  return persistir ? localStorage : sessionStorage;
}

function outroDestino(persistir: boolean): Storage {
  return persistir ? sessionStorage : localStorage;
}

export const tokens = {
  get access() {
    return localStorage.getItem(CHAVE_ACESSO) ?? sessionStorage.getItem(CHAVE_ACESSO);
  },
  get refresh() {
    return localStorage.getItem(CHAVE_REFRESH) ?? sessionStorage.getItem(CHAVE_REFRESH);
  },
  get persistente() {
    return localStorage.getItem(CHAVE_PERSISTIR) !== "0";
  },
  salvar(access: string, refresh?: string, persistir = true) {
    const alvo = destino(persistir);
    const anterior = outroDestino(persistir);
    alvo.setItem(CHAVE_ACESSO, access);
    if (refresh) alvo.setItem(CHAVE_REFRESH, refresh);
    localStorage.setItem(CHAVE_PERSISTIR, persistir ? "1" : "0");
    anterior.removeItem(CHAVE_ACESSO);
    anterior.removeItem(CHAVE_REFRESH);
  },
  limpar() {
    [localStorage, sessionStorage].forEach((armazem) => {
      armazem.removeItem(CHAVE_ACESSO);
      armazem.removeItem(CHAVE_REFRESH);
    });
  },
};

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = tokens.access;
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

let renovando: Promise<string> | null = null;
let aoExpirar: (() => void) | null = null;

export function registrarExpiracao(callback: () => void) {
  aoExpirar = callback;
}

async function renovarToken(): Promise<string> {
  const refresh = tokens.refresh;
  if (!refresh) throw new Error("Sessão expirada.");
  const resposta = await axios.post(BASE_URL + "/auth/token/refresh/", { refresh });
  tokens.salvar(resposta.data.access, resposta.data.refresh, tokens.persistente);
  return resposta.data.access as string;
}

http.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError) => {
    const original = erro.config as AxiosRequestConfig & { _retentado?: boolean };
    const semToken = !tokens.access;

    if (erro.response?.status === 401 && !original?._retentado && !semToken) {
      original._retentado = true;
      try {
        renovando = renovando || renovarToken();
        const novo = await renovando;
        renovando = null;
        original.headers = { ...(original.headers || {}), Authorization: "Bearer " + novo };
        return http(original);
      } catch (falha) {
        renovando = null;
        tokens.limpar();
        aoExpirar?.();
        return Promise.reject(falha);
      }
    }

    if (erro.response?.status === 401) {
      tokens.limpar();
      aoExpirar?.();
    }
    return Promise.reject(erro);
  }
);

/** Mensagem legível de um erro da API. */
export function mensagemErro(erro: unknown): string {
  const e = erro as AxiosError<{ mensagem?: string; detalhes?: unknown }>;
  if (e?.response?.data?.mensagem) return e.response.data.mensagem;
  if (e?.response?.status === 403) return "Você não tem permissão para esta ação.";
  if (e?.response?.status === 404) return "Registro não encontrado.";
  if (e?.response?.status === 500) return "Erro interno no servidor. Verifique os logs do backend.";
  if (e?.code === "ECONNABORTED") return "Tempo de resposta excedido. Tente novamente.";
  if (e?.message === "Network Error") return "Não foi possível conectar à API. O backend está em execução?";
  return e?.message || "Ocorreu um erro inesperado.";
}

/** Desembrulha resultados paginados ou listas simples. */
export function desembrulhar<T>(dados: Paginado<T> | T[]): T[] {
  return Array.isArray(dados) ? dados : dados.results;
}

export const api = {
  get: async <T>(url: string, params?: Record<string, unknown>) => {
    const { data } = await http.get<T>(url, { params });
    return data;
  },
  getLista: async <T>(url: string, params?: Record<string, unknown>) => {
    const { data } = await http.get<Paginado<T> | T[]>(url, { params });
    return desembrulhar<T>(data);
  },
  post: async <T>(url: string, corpo?: unknown, config?: AxiosRequestConfig) => {
    const { data } = await http.post<T>(url, corpo, config);
    return data;
  },
  patch: async <T>(url: string, corpo?: unknown) => {
    const { data } = await http.patch<T>(url, corpo);
    return data;
  },
  put: async <T>(url: string, corpo?: unknown) => {
    const { data } = await http.put<T>(url, corpo);
    return data;
  },
  del: async (url: string) => {
    await http.delete(url);
  },
  upload: async <T>(url: string, formData: FormData) => {
    const { data } = await http.post<T>(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};

export interface RespostaLogin {
  access: string;
  refresh: string;
  usuario: import("./types").Usuario;
  permissoes: string[];
}

export interface RespostaMe {
  usuario: import("./types").Usuario;
  permissoes: string[];
  matriz_perfis: Record<string, string[]>;
  nao_lidas: number;
  config: {
    perfis: Array<{ valor: string; rotulo: string }>;
    pesos_matching: Record<string, number>;
    niveis_proficiencia: Array<{ valor: number; rotulo: string }>;
  };
}

/* ==========================================================================
   Assistente de IA — tipos e utilitários
   --------------------------------------------------------------------------
   O painel lateral e a tela cheia compartilham tudo o que está aqui: os
   formatos devolvidos por /api/v1/ia/..., os normalizadores que protegem a
   interface de campos ausentes e os rótulos curtos que dão sentido à trilha de
   ferramentas exibida junto de cada resposta.
   ========================================================================== */

import {
  Award,
  Briefcase,
  CalendarDays,
  Compass,
  Database,
  FolderKanban,
  Gauge,
  Grid3x3,
  Layers,
  ListChecks,
  MessageSquare,
  Network,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/* ==========================================================================
   Formatos da API
   ========================================================================== */

/** Uma ferramenta acionada pelo assistente para montar a resposta. */
export interface FerramentaUsada {
  nome: string;
  rotulo?: string;
  argumentos?: Record<string, unknown>;
  /** Resumo do que a ferramenta devolveu, ex.: "3 projeto(s)". */
  resumo?: string;
}

/** Registro de onde um número da resposta saiu. */
export interface FonteIA {
  tipo: string;
  id: number | string;
  rotulo: string;
  rota: string;
}

/** Resposta de POST /ia/conversar/. */
export interface RespostaConversa {
  conversa: number;
  resposta: string;
  ferramentas?: FerramentaUsada[];
  fontes?: FonteIA[];
  sugestoes?: string[];
  provedor?: string;
  duracao_ms?: number;
}

/** Mensagem persistida no histórico. */
export interface MensagemIA {
  id: number;
  papel: "USUARIO" | "ASSISTENTE" | string;
  texto: string;
  ferramentas?: FerramentaUsada[];
  fontes?: FonteIA[];
  provedor?: string;
  modelo?: string;
  duracao_ms?: number;
  util?: boolean | null;
  comentario?: string;
  criado_em?: string;
}

/** Conversa do histórico de GET /ia/conversas/. */
export interface ConversaIA {
  id: number;
  titulo: string;
  criado_em?: string;
  atualizado_em?: string;
  total_mensagens?: number;
}

/** Detalhe de GET /ia/conversas/{id}/. */
export interface DetalheConversa {
  id: number;
  titulo?: string;
  criado_em?: string;
  atualizado_em?: string;
  total_mensagens?: number;
  mensagens?: MensagemIA[];
}

/** Ferramenta do catálogo de GET /ia/ferramentas/. */
export interface FerramentaCatalogo {
  nome: string;
  rotulo: string;
  descricao: string;
  categoria: string;
  permissao?: string;
  parametros?: unknown;
  somente_leitura?: boolean;
}

export interface RespostaFerramentas {
  ferramentas?: FerramentaCatalogo[];
  provedor?: string;
  modelo?: string;
  disponivel?: boolean;
}

export interface McpIA {
  habilitado?: boolean;
  transporte?: string[];
  ferramentas?: number;
  endereco?: string;
}

export interface ConfiguracaoIA {
  provedor?: string;
  modelo?: string;
  disponivel?: boolean;
  motivo?: string;
  mcp?: McpIA;
}

/* ==========================================================================
   Mensagem tratada pela interface
   ========================================================================== */

/**
 * Mensagem como a interface precisa dela: as que vieram do histórico e as que
 * acabaram de ser criadas na sessão usam o mesmo formato, para que a bolha seja
 * desenhada uma única vez.
 */
export interface MensagemLocal {
  chave: string;
  papel: "USUARIO" | "ASSISTENTE";
  texto: string;
  ferramentas: FerramentaUsada[];
  fontes: FonteIA[];
  sugestoes: string[];
  provedor?: string;
  duracao_ms?: number;
  criado_em?: string;
}

export const AVISO_IMPRECISAO =
  "As respostas podem conter imprecisões e devem ser conferidas nos registros citados antes de virarem uma decisão.";

export const CAMINHO_MCP = "/api/v1/ia/mcp/";

/* ==========================================================================
   Chaves de consulta
   ========================================================================== */

export const CHAVES_IA = {
  conversas: ["ia", "conversas"] as const,
  conversa: (id: number | string | null) => ["ia", "conversa", String(id ?? "")] as const,
  sugestoes: ["ia", "sugestoes"] as const,
  ferramentas: ["ia", "ferramentas"] as const,
  configuracao: ["ia", "configuracao"] as const,
};

/* ==========================================================================
   Normalizadores — a interface nunca quebra por um campo ausente
   ========================================================================== */

export function normalizarFerramentas(valor: unknown): FerramentaUsada[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((item) => {
    if (typeof item === "string") return { nome: item, rotulo: item };
    const objeto = (item || {}) as Partial<FerramentaUsada>;
    return {
      nome: String(objeto.nome ?? ""),
      rotulo: String(objeto.rotulo ?? objeto.nome ?? ""),
      argumentos: objeto.argumentos,
      resumo: objeto.resumo === undefined || objeto.resumo === null ? undefined : String(objeto.resumo),
    };
  });
}

export function normalizarFontes(valor: unknown): FonteIA[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => {
      if (typeof item === "string") return { tipo: "registro", id: "", rotulo: item, rota: "" };
      const objeto = (item || {}) as Partial<FonteIA>;
      return {
        tipo: String(objeto.tipo ?? "registro"),
        id: objeto.id ?? "",
        rotulo: String(objeto.rotulo ?? ""),
        rota: String(objeto.rota ?? ""),
      };
    })
    .filter((fonte) => fonte.rotulo.length > 0 || fonte.rota.length > 0);
}

export function normalizarSugestoes(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (valor && typeof valor === "object" && "sugestoes" in valor) {
    return normalizarSugestoes((valor as { sugestoes?: unknown }).sugestoes);
  }
  return [];
}

export function normalizarTransportes(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter((item): item is string => typeof item === "string");
  if (typeof valor === "string" && valor.trim()) return [valor.trim()];
  return [];
}

/** Lista de mensagens de GET /ia/conversas/{id}/ — aceita lista pura ou envelope. */
export function mensagensDaConversa(dados: DetalheConversa | MensagemIA[] | undefined | null): MensagemIA[] {
  if (!dados) return [];
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados.mensagens)) return dados.mensagens;
  const paginado = (dados as { results?: unknown }).results;
  return Array.isArray(paginado) ? (paginado as MensagemIA[]) : [];
}

/** Chave estável de uma mensagem do histórico. */
export function chaveMensagem(mensagem: MensagemIA, indice?: number): string {
  return "msg-" + String(mensagem.id ?? indice ?? 0);
}

/** Converte uma mensagem da API no formato usado pela interface. */
export function paraMensagemLocal(mensagem: MensagemIA, indice: number): MensagemLocal {
  return {
    chave: chaveMensagem(mensagem, indice),
    papel: String(mensagem.papel ?? "").toUpperCase() === "USUARIO" ? "USUARIO" : "ASSISTENTE",
    texto: mensagem.texto || "",
    ferramentas: normalizarFerramentas(mensagem.ferramentas),
    fontes: normalizarFontes(mensagem.fontes),
    sugestoes: [],
    provedor: mensagem.provedor,
    duracao_ms: mensagem.duracao_ms,
    criado_em: mensagem.criado_em,
  };
}

/** Avaliações já registradas, por chave de mensagem. */
export function votosDasMensagens(lista: MensagemIA[]): Record<string, boolean> {
  const votos: Record<string, boolean> = {};
  lista.forEach((mensagem, indice) => {
    if (typeof mensagem.util === "boolean") votos[chaveMensagem(mensagem, indice)] = mensagem.util;
  });
  return votos;
}

/* ==========================================================================
   Rótulos da trilha de ferramentas
   ========================================================================== */

/** Resume "3 projeto(s)" em "3" — o resto do texto já está no rótulo. */
export function resumoCurto(resumo?: string): string {
  if (!resumo) return "";
  const limpo = String(resumo).trim();
  if (!limpo) return "";
  const numero = limpo.match(/^([0-9]+(?:[.,][0-9]+)?)/);
  if (numero) return numero[1];
  return limpo.length > 32 ? limpo.slice(0, 31) + "…" : limpo;
}

/** Texto do chip de ferramenta, ex.: "Projetos atrasados · 3". */
export function rotuloFerramenta(ferramenta: FerramentaUsada): string {
  const base = ferramenta.rotulo || ferramenta.nome || "Consulta";
  const curto = resumoCurto(ferramenta.resumo);
  return curto ? base + " · " + curto : base;
}

export function formatarDuracao(ms?: number): string {
  if (!ms || ms <= 0) return "";
  if (ms < 1000) return ms + " ms";
  return (ms / 1000).toFixed(1).replace(".", ",") + " s";
}

export function contarMensagens(total: number): string {
  return total === 1 ? "1 mensagem" : total + " mensagens";
}

/** Só rotas internas podem ser abertas a partir de uma fonte citada. */
export function rotaNavegavel(rota?: string): boolean {
  if (!rota) return false;
  return rota.startsWith("/") && !rota.startsWith("//");
}

/* ==========================================================================
   Categorias do catálogo de ferramentas
   ========================================================================== */

export interface ConfigCategoria {
  rotulo: string;
  icone: LucideIcon;
  cor: string;
}

const CATEGORIAS: Record<string, ConfigCategoria> = {
  projetos: { rotulo: "Projetos e portfólio", icone: FolderKanban, cor: "#2563EB" },
  portfolio: { rotulo: "Portfólio e programas", icone: Briefcase, cor: "#4F46E5" },
  programas: { rotulo: "Portfólio e programas", icone: Layers, cor: "#4F46E5" },
  tarefas: { rotulo: "Tarefas e execução", icone: ListChecks, cor: "#0891B2" },
  cronograma: { rotulo: "Cronograma e marcos", icone: CalendarDays, cor: "#0891B2" },
  marcos: { rotulo: "Cronograma e marcos", icone: Target, cor: "#0891B2" },
  riscos: { rotulo: "Riscos e issues", icone: ShieldAlert, cor: "#DC2626" },
  issues: { rotulo: "Riscos e issues", icone: ShieldAlert, cor: "#DC2626" },
  financeiro: { rotulo: "Financeiro e EVM", icone: Wallet, cor: "#059669" },
  orcamento: { rotulo: "Financeiro e EVM", icone: Wallet, cor: "#059669" },
  recursos: { rotulo: "Recursos e alocação", icone: Users, cor: "#7C3AED" },
  alocacao: { rotulo: "Recursos e alocação", icone: Users, cor: "#7C3AED" },
  capacidade: { rotulo: "Recursos e alocação", icone: Gauge, cor: "#7C3AED" },
  capacidades: { rotulo: "Capacidades e talentos", icone: Sparkles, cor: "#D97706" },
  pessoas: { rotulo: "Capacidades e talentos", icone: Award, cor: "#D97706" },
  skills: { rotulo: "Capacidades e talentos", icone: Grid3x3, cor: "#D97706" },
  colaboracao: { rotulo: "Colaboração e atividades", icone: MessageSquare, cor: "#0EA5E9" },
  analises: { rotulo: "Análises e tendências", icone: TrendingUp, cor: "#DB2777" },
  analytics: { rotulo: "Análises e tendências", icone: TrendingUp, cor: "#DB2777" },
  integracoes: { rotulo: "Integrações e dados", icone: Network, cor: "#64748B" },
  dados: { rotulo: "Integrações e dados", icone: Database, cor: "#64748B" },
  geral: { rotulo: "Consultas gerais", icone: Compass, cor: "#64748B" },
};

const ORDEM_CATEGORIAS = Object.keys(CATEGORIAS);

export interface GrupoFerramentas extends ConfigCategoria {
  chave: string;
  ferramentas: FerramentaCatalogo[];
}

/** Transforma "gestao_de_riscos" em "Gestao de riscos". */
export function rotuloCategoria(chave?: string): string {
  const bruto = String(chave || "geral").replace(/[-_]+/g, " ").trim();
  if (!bruto) return "Consultas gerais";
  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

export function configCategoria(chave?: string): ConfigCategoria {
  const nome = String(chave || "geral");
  return CATEGORIAS[nome] ?? { rotulo: rotuloCategoria(nome), icone: Wrench, cor: "#64748B" };
}

/** Agrupa o catálogo por categoria, na ordem das áreas do sistema. */
export function agruparPorCategoria(ferramentas: FerramentaCatalogo[]): GrupoFerramentas[] {
  const mapa = new Map<string, FerramentaCatalogo[]>();
  ferramentas.forEach((ferramenta) => {
    const chave = ferramenta.categoria || "geral";
    const lista = mapa.get(chave) ?? [];
    lista.push(ferramenta);
    mapa.set(chave, lista);
  });
  return [...mapa.entries()]
    .map(([chave, lista]) => ({ chave, ferramentas: lista, ...configCategoria(chave) }))
    .sort((a, b) => {
      const posicaoA = ORDEM_CATEGORIAS.indexOf(a.chave);
      const posicaoB = ORDEM_CATEGORIAS.indexOf(b.chave);
      if (posicaoA === -1 && posicaoB === -1) return a.rotulo.localeCompare(b.rotulo, "pt-BR");
      if (posicaoA === -1) return 1;
      if (posicaoB === -1) return -1;
      return posicaoA - posicaoB;
    });
}

/* ==========================================================================
   MCP
   ========================================================================== */

/** Endereço do servidor MCP — o da API quando informado, senão o padrão. */
export function enderecoMcp(mcp?: McpIA): string {
  const informado = mcp?.endereco;
  if (informado && (informado.startsWith("/") || informado.startsWith("http"))) return informado;
  return CAMINHO_MCP;
}

/** Endereço absoluto, que é o que um cliente externo precisa colar. */
export function enderecoMcpCompleto(mcp?: McpIA): string {
  const caminho = enderecoMcp(mcp);
  if (caminho.startsWith("http")) return caminho;
  if (typeof window === "undefined") return caminho;
  return window.location.origin + caminho;
}

/** Rótulo amigável para o provedor que respondeu. */
export function rotuloProvedor(provedor?: string): string {
  if (!provedor) return "";
  const mapa: Record<string, string> = {
    local: "motor local do SGP",
    aberto: "modelo aberto",
    externo: "provedor externo",
    openai: "OpenAI",
    anthropic: "Anthropic",
    azure: "Azure OpenAI",
    ollama: "Ollama",
  };
  return mapa[provedor] ?? provedor;
}

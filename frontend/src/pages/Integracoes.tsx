/* ==========================================================================
   Central de integrações — Fase 3 da especificação (§11).

   Quatro frentes em uma só tela:
   · Integrações  — conexões configuradas, teste de conexão, sincronização,
                    mapeamento de campos e credenciais mascaradas;
   · Execuções    — histórico observável de cada sincronização;
   · Eventos      — fila de eventos, entregas de webhook, webhooks e
                    credenciais de API;
   · Catálogo     — os 15 tipos previstos na especificação, com downloads
                    (feed .ics e dataset analítico).
   ========================================================================== */

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Award,
  BadgeCheck,
  Boxes,
  Braces,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Clock,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  FlaskConical,
  GitBranch,
  Github,
  Gitlab,
  GraduationCap,
  Hash,
  History,
  Inbox,
  KeyRound,
  Layers,
  ListChecks,
  MessageSquare,
  Pencil,
  Percent,
  Play,
  Plug,
  Plus,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  SquareKanban,
  Trash2,
  TriangleAlert,
  Unplug,
  Users,
  Webhook as WebhookIcon,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Abas,
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
  EntradaBusca,
  Esqueleto,
  Etiqueta,
  FiltrosAtivos,
  Interruptor,
  Modal,
  PainelLateral,
  SecaoColapsavel,
  Segmentado,
  Selecao,
  Tabela,
  Vazio,
  useAvisos,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import { BarraFerramentas, FiltroSelect, GradeCards, LinhaKPI } from "@/components/layout";
import { useConsulta, useLista, useMutacao } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { dataHora, dataRelativa, numero, percentual } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Paginado, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Tipos do domínio (espelham os serializers da API v1)
   ========================================================================== */

interface PessoaResumo {
  id: number;
  nome: string;
  cor: string;
  iniciais: string;
  avatar_display?: string;
}

interface MapeamentoCampo {
  id: number;
  integracao: number;
  campo_origem: string;
  campo_destino: string;
  transformacao: string;
  transformacao_rotulo: string;
  traducao: Record<string, string>;
  valor_padrao: string;
  obrigatorio: boolean;
  ordem: number;
}

interface Integracao {
  id: number;
  nome: string;
  tipo: string;
  tipo_rotulo: string;
  direcao: string;
  direcao_rotulo: string;
  descricao: string;
  url_base: string;
  autenticacao: string;
  autenticacao_rotulo: string;
  cabecalhos: Record<string, string>;
  entidade_alvo: string;
  modo_simulacao: boolean;
  ativa: boolean;
  frequencia_minutos: number;
  proxima_sincronizacao: string | null;
  status: string;
  status_rotulo: string;
  ultima_sincronizacao: string | null;
  ultimo_erro: string;
  total_execucoes: number;
  total_sucesso: number;
  total_falha: number;
  itens_sincronizados: number;
  responsavel: number | null;
  responsavel_detalhe: PessoaResumo | null;
  cor: string;
  icone: string;
  criado_em: string;
  atualizado_em: string;
  mapeamentos: MapeamentoCampo[];
  taxa_sucesso: number;
  saudavel: boolean;
  credenciais_mascaradas: Record<string, string>;
}

interface Execucao {
  id: number;
  integracao: number;
  integracao_nome: string;
  integracao_tipo: string;
  inicio: string;
  fim: string | null;
  status: string;
  status_rotulo: string;
  operacao: string;
  itens_lidos: number;
  itens_criados: number;
  itens_atualizados: number;
  itens_ignorados: number;
  itens_com_erro: number;
  mensagem: string;
  erros: unknown[];
  detalhes: Record<string, unknown>;
  duracao_ms: number;
  disparado_por_nome: string;
  total_processado: number;
  duracao_segundos: number;
}

interface EventoIntegracao {
  id: number;
  tipo: string;
  tipo_rotulo: string;
  entidade: string;
  entidade_id: string;
  projeto_id: number | null;
  titulo: string;
  payload: Record<string, unknown>;
  ocorrido_em: string;
  processado: boolean;
  tentativas: number;
  entregas_ok: number;
  ultimo_erro: string;
}

interface Entrega {
  id: number;
  webhook: number;
  webhook_nome: string;
  evento: number;
  evento_tipo: string;
  url: string;
  tentativa: number;
  status_code: number | null;
  sucesso: boolean;
  resposta: string;
  erro: string;
  duracao_ms: number;
  simulado: boolean;
  criado_em: string;
}

interface WebhookConfig {
  id: number;
  nome: string;
  url: string;
  eventos: string[];
  ativo: boolean;
  secreto: string;
  criado_em: string;
}

interface CredencialAPI {
  id: number;
  nome: string;
  user: number;
  user_nome: string;
  token: string;
  escopos: string[];
  ip_permitido: string;
  ativo: boolean;
  expira_em: string | null;
  ultimo_uso: string | null;
  total_chamadas: number;
  criado_em: string;
  expirado: boolean;
}

interface CatalogoItem {
  tipo: string;
  nome: string;
  direcao: string;
  descricao: string;
  icone: string;
  configurada: boolean;
  integracao_id: number | null;
  status: string;
  modo_simulacao: boolean | null;
  suporta_conector: boolean;
}

interface OpcaoApi {
  valor: string;
  rotulo: string;
  tem_conector?: boolean;
}

interface RespostaTipos {
  tipos: OpcaoApi[];
  direcoes: OpcaoApi[];
  autenticacoes: OpcaoApi[];
  transformacoes: OpcaoApi[];
}

interface ResumoExecucoes {
  total: number;
  por_status: Array<{ status: string; total: number }>;
  criados: number;
  atualizados: number;
  com_erro: number;
  duracao_media_ms: number;
}

interface RespostaPainel {
  integracoes: {
    total: number;
    ativas: number;
    com_erro: number;
    em_simulacao: number;
    itens_sincronizados: number;
    taxa_sucesso_media: number;
  };
  eventos: {
    total: number;
    pendentes: number;
    ultimas_24h: number;
    por_tipo: Array<{ tipo: string; total: number }>;
  };
  webhooks: {
    total: number;
    ativos: number;
    entregas: number;
    sucessos: number;
    falhas: number;
    tempo_medio_ms: number;
  };
  execucoes_recentes: Array<{
    id: number;
    integracao: string;
    tipo: string;
    status: string;
    operacao: string;
    criados: number;
    atualizados: number;
    erros: number;
    duracao_ms: number;
    mensagem: string;
    inicio: string;
  }>;
  catalogo: CatalogoItem[];
  gerado_em: string;
}

interface RespostaTeste {
  sucesso: boolean;
  mensagem: string;
  simulado: boolean;
  detalhes: Record<string, unknown>;
  requisicao?: unknown;
}

interface RespostaSincronizacao {
  executadas: number;
  resultados: Execucao[];
}

interface RespostaDespacho {
  eventos: number;
  entregas: number;
  sucessos: number;
  falhas: number;
  sem_destino: number;
  descartados: number;
}

interface RespostaHistorico {
  integracao: Integracao;
  execucoes: Execucao[];
  total: number;
}

interface LinhaChaveValor {
  chave: string;
  valor: string;
}

interface FormularioIntegracao {
  nome: string;
  tipo: string;
  direcao: string;
  descricao: string;
  url_base: string;
  autenticacao: string;
  credenciais: LinhaChaveValor[];
  cabecalhos: LinhaChaveValor[];
  entidade_alvo: string;
  modo_simulacao: boolean;
  ativa: boolean;
  frequencia_minutos: string;
  responsavel: string;
  cor: string;
  icone: string;
}

/* ==========================================================================
   Catálogos de apoio
   ========================================================================== */

const ICONES: Record<string, LucideIcon> = {
  plug: Plug,
  database: Database,
  briefcase: Briefcase,
  users: Users,
  "graduation-cap": GraduationCap,
  "square-kanban": SquareKanban,
  "git-branch": GitBranch,
  "message-square": MessageSquare,
  hash: Hash,
  "bar-chart-3": ChartColumn,
  calendar: Calendar,
  "calendar-days": CalendarDays,
  github: Github,
  gitlab: Gitlab,
  sparkles: Sparkles,
  award: Award,
  server: Server,
  boxes: Boxes,
  zap: Zap,
  webhook: WebhookIcon,
  "refresh-cw": RefreshCw,
  building: Building2,
  key: KeyRound,
};

const ICONES_DISPONIVEIS = [
  "plug",
  "database",
  "briefcase",
  "users",
  "graduation-cap",
  "square-kanban",
  "git-branch",
  "message-square",
  "hash",
  "bar-chart-3",
  "calendar",
  "calendar-days",
  "github",
  "gitlab",
  "sparkles",
  "award",
  "server",
  "boxes",
  "zap",
  "webhook",
];

const CORES_DISPONIVEIS = [
  "#2563EB",
  "#0891B2",
  "#059669",
  "#84CC16",
  "#D97706",
  "#DC2626",
  "#8B5CF6",
  "#EC4899",
];

const CORES_TIPO: Record<string, string> = {
  ERP: "#2563EB",
  CRM: "#D97706",
  RH: "#059669",
  LMS: "#8B5CF6",
  JIRA: "#0891B2",
  AZURE_DEVOPS: "#2563EB",
  TEAMS: "#6366F1",
  SLACK: "#EC4899",
  BI: "#D97706",
  GOOGLE_CALENDAR: "#DC2626",
  OUTLOOK: "#0891B2",
  GITHUB: "#334155",
  GITLAB: "#F97316",
  ESCO: "#14B8A6",
  CERTIFICADORA: "#8B5CF6",
};

const ICONES_TIPO: Record<string, string> = {
  ERP: "database",
  CRM: "briefcase",
  RH: "users",
  LMS: "graduation-cap",
  JIRA: "square-kanban",
  AZURE_DEVOPS: "git-branch",
  TEAMS: "message-square",
  SLACK: "hash",
  BI: "bar-chart-3",
  GOOGLE_CALENDAR: "calendar",
  OUTLOOK: "calendar-days",
  GITHUB: "github",
  GITLAB: "gitlab",
  ESCO: "sparkles",
  CERTIFICADORA: "award",
};

const TONS_STATUS: Record<string, Tom> = {
  ATIVA: "success",
  SINCRONIZANDO: "info",
  ERRO: "danger",
  INATIVA: "neutral",
  CONFIGURANDO: "warning",
};

const TONS_EXECUCAO: Record<string, Tom> = {
  SUCESSO: "success",
  PARCIAL: "warning",
  FALHA: "danger",
  EM_ANDAMENTO: "info",
  SIMULADO: "brand",
};

const TONS_SEVERIDADE: Record<string, Tom> = {
  OK: "success",
  ATENCAO: "warning",
  CRITICO: "danger",
};

const EVENTOS_DISPONIVEIS: Array<{ codigo: string; rotulo: string; descricao: string }> = [
  { codigo: "projeto.criado", rotulo: "Projeto criado", descricao: "Um novo projeto entrou no portfólio." },
  { codigo: "projeto.em_risco", rotulo: "Projeto em risco", descricao: "A saúde do projeto passou para vermelho." },
  { codigo: "projeto.concluido", rotulo: "Projeto concluído", descricao: "O projeto foi encerrado com sucesso." },
  { codigo: "tarefa.criada", rotulo: "Tarefa criada", descricao: "Uma tarefa foi incluída no cronograma." },
  { codigo: "tarefa.concluida", rotulo: "Tarefa concluída", descricao: "Uma tarefa foi finalizada." },
  { codigo: "risco.criado", rotulo: "Risco criado", descricao: "Um novo risco foi identificado." },
  { codigo: "risco.critico", rotulo: "Risco crítico", descricao: "Um risco de nível alto ou extremo foi aberto." },
  { codigo: "issue.criada", rotulo: "Issue criada", descricao: "Um impedimento foi registrado." },
  { codigo: "alocacao.criada", rotulo: "Alocação criada", descricao: "Uma pessoa foi alocada em um projeto." },
  { codigo: "marco.concluido", rotulo: "Marco concluído", descricao: "Um marco do cronograma foi atingido." },
  { codigo: "promocao.solicitada", rotulo: "Promoção solicitada", descricao: "Uma sugestão de promoção foi aberta." },
  { codigo: "promocao.aprovada", rotulo: "Promoção aprovada", descricao: "Uma promoção foi validada pelo gestor." },
  { codigo: "treinamento.concluido", rotulo: "Treinamento concluído", descricao: "Um treinamento foi finalizado." },
  { codigo: "capacidade.evidencia_validada", rotulo: "Evidência validada", descricao: "Uma evidência de capacidade foi validada." },
  { codigo: "orcamento.estourado", rotulo: "Orçamento estourado", descricao: "O consumo ultrapassou o orçamento aprovado." },
];

const ESCOPOS: Array<{ codigo: string; recurso: string }> = [
  { codigo: "portfolio.ver", recurso: "Portfólio" },
  { codigo: "programa.ver", recurso: "Programas" },
  { codigo: "projeto.ver", recurso: "Projetos" },
  { codigo: "projeto.editar", recurso: "Projetos" },
  { codigo: "tarefa.ver", recurso: "Tarefas" },
  { codigo: "tarefa.editar", recurso: "Tarefas" },
  { codigo: "recurso.ver", recurso: "Recursos" },
  { codigo: "alocacao.ver", recurso: "Alocação" },
  { codigo: "alocacao.criar", recurso: "Alocação" },
  { codigo: "financeiro.ver", recurso: "Financeiro" },
  { codigo: "risco.ver", recurso: "Riscos" },
  { codigo: "capacidade.ver", recurso: "Capacidades" },
  { codigo: "dashboard.ver", recurso: "Dashboards" },
  { codigo: "relatorio.ver", recurso: "Relatórios" },
  { codigo: "auditoria.ver", recurso: "Auditoria" },
];

const ROTULOS_DETALHE: Record<string, string> = {
  requisicao_prevista: "Requisição prevista",
  requisicoes_previstas: "Requisições previstas",
  requisicoes: "Requisições",
  metodo: "Método HTTP",
  url: "URL",
  corpo: "Corpo enviado",
  cabecalhos: "Cabeçalhos",
  entidade: "Entidade",
  operacao: "Operação",
  registros: "Registros",
  total: "Total",
  itens: "Itens",
  simulado: "Simulado",
  origem: "Origem",
  destino: "Destino",
  dataset: "Conjunto de dados",
  campos: "Campos",
  motivo: "Motivo",
  mensagem: "Mensagem",
};

const FORMULARIO_VAZIO: FormularioIntegracao = {
  nome: "",
  tipo: "",
  direcao: "SAIDA",
  descricao: "",
  url_base: "",
  autenticacao: "API_KEY",
  credenciais: [],
  cabecalhos: [],
  entidade_alvo: "",
  modo_simulacao: true,
  ativa: false,
  frequencia_minutos: "60",
  responsavel: "",
  cor: "#2563EB",
  icone: "plug",
};

/* ==========================================================================
   Utilitários de apresentação
   ========================================================================== */

function iconeDe(nome?: string | null): LucideIcon {
  if (!nome) return Plug;
  return ICONES[nome] || Plug;
}

function tomStatus(status: string): Tom {
  return TONS_STATUS[status] || "neutral";
}

function iconeStatus(status: string): LucideIcon {
  if (status === "ATIVA") return CircleCheck;
  if (status === "ERRO") return CircleAlert;
  if (status === "SINCRONIZANDO") return RefreshCw;
  if (status === "CONFIGURANDO") return FlaskConical;
  return CircleDashed;
}

function tomExecucao(status: string): Tom {
  return TONS_EXECUCAO[status] || "neutral";
}

function iconeDirecao(direcao: string): LucideIcon {
  if (direcao === "ENTRADA") return ArrowLeft;
  if (direcao === "BIDIRECIONAL") return ArrowLeftRight;
  return ArrowRight;
}

function duracaoTexto(ms?: number | null): string {
  const valor = Number(ms || 0);
  if (valor <= 0) return "—";
  if (valor < 1000) return numero(valor) + " ms";
  return numero(valor / 1000, 2) + " s";
}

function valorTexto(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "sim" : "não";
  if (typeof valor === "object") {
    try {
      return JSON.stringify(valor);
    } catch {
      return "valor não serializável";
    }
  }
  return String(valor);
}

function objetoDeLinhas(linhas: LinhaChaveValor[]): Record<string, string> {
  const saida: Record<string, string> = {};
  linhas.forEach((linha) => {
    const chave = linha.chave.trim();
    if (chave) saida[chave] = linha.valor;
  });
  return saida;
}

function linhasDeObjeto(objeto?: Record<string, string> | null): LinhaChaveValor[] {
  if (!objeto) return [];
  return Object.keys(objeto).map((chave) => ({ chave, valor: String(objeto[chave]) }));
}

function baixarArquivo(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   Editor de pares chave → valor (credenciais e cabeçalhos)
   ========================================================================== */

function EditorChaveValor({
  linhas,
  onChange,
  rotuloChave,
  rotuloValor,
  textoAdicionar,
  placeholderChave,
  placeholderValor,
  oculto,
  dica,
}: {
  linhas: LinhaChaveValor[];
  onChange: (linhas: LinhaChaveValor[]) => void;
  rotuloChave: string;
  rotuloValor: string;
  textoAdicionar: string;
  placeholderChave: string;
  placeholderValor: string;
  oculto?: boolean;
  dica?: string;
}) {
  const atualizar = (indice: number, campo: "chave" | "valor", texto: string) => {
    const copia = linhas.map((linha, i) => (i === indice ? { ...linha, [campo]: texto } : linha));
    onChange(copia);
  };

  return (
    <div className="space-y-2">
      {linhas.length === 0 && (
        <p className="text-2xs text-fg-subtle">Nenhum par informado. Use o botão abaixo para adicionar.</p>
      )}
      {linhas.map((linha, indice) => (
        <div key={indice} className="flex items-center gap-1.5">
          <Entrada
            value={linha.chave}
            onChange={(e) => atualizar(indice, "chave", e.target.value)}
            placeholder={placeholderChave}
            aria-label={rotuloChave + " " + numero(indice + 1)}
            className="flex-1"
          />
          <Entrada
            value={linha.valor}
            onChange={(e) => atualizar(indice, "valor", e.target.value)}
            placeholder={placeholderValor}
            aria-label={rotuloValor + " " + numero(indice + 1)}
            type={oculto ? "password" : "text"}
            className="flex-1"
          />
          <BotaoIcone
            icone={X}
            rotulo="Remover par"
            tamanho="sm"
            onClick={() => onChange(linhas.filter((_, i) => i !== indice))}
          />
        </div>
      ))}
      <Botao
        tamanho="xs"
        variante="fantasma"
        icone={Plus}
        onClick={() => onChange(linhas.concat([{ chave: "", valor: "" }]))}
      >
        {textoAdicionar}
      </Botao>
      {dica && <p className="text-2xs text-fg-muted">{dica}</p>}
    </div>
  );
}

/* ==========================================================================
   Detalhes de uma execução (objeto JSON legível)
   ========================================================================== */

function DetalheValor({ chave, valor }: { chave: string; valor: unknown }) {
  const rotulo = ROTULOS_DETALHE[chave] || chave;
  const simples = valor === null || valor === undefined || typeof valor !== "object";

  if (simples) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-sgp border border-border bg-surface-2 px-2.5 py-1.5">
        <span className="text-2xs font-semibold text-fg-muted">{rotulo}</span>
        <span className="text-right text-xs text-fg">{valorTexto(valor)}</span>
      </div>
    );
  }

  const itens = Array.isArray(valor) ? valor : [valor];
  return (
    <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{rotulo}</p>
      <div className="mt-1.5 space-y-1.5">
        {itens.map((item, indice) => {
          const registro = item as Record<string, unknown>;
          const temDetalhe = registro && typeof registro === "object" && !Array.isArray(registro);
          const url = temDetalhe ? valorTexto(registro.url) : "—";
          const metodo = temDetalhe && registro.metodo ? valorTexto(registro.metodo) : "";
          return (
            <div key={indice} className="rounded-md bg-surface-3/60 p-2">
              {temDetalhe && (registro.url || registro.metodo) ? (
                <p className="flex flex-wrap items-center gap-1.5">
                  {metodo && <Etiqueta tom="brand">{metodo}</Etiqueta>}
                  <span className="break-all font-mono text-2xs text-fg">{url}</span>
                </p>
              ) : null}
              <pre className="mt-1 max-h-52 overflow-auto scroll-thin whitespace-pre-wrap break-words font-mono text-2xs text-fg-muted">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Integracoes() {
  const { sucesso, erro, alerta } = useAvisos();
  const { usuario: usuarioAtual, pode } = useAuth();

  // Integrações, credenciais de API e webhooks são escrita restrita a ADMIN e
  // PMO no servidor: a tela não pode oferecer a ação para quem só consulta.
  const podeAdministrar = pode("admin.ver");

  const [aba, setAba] = useState<"integracoes" | "execucoes" | "eventos" | "catalogo">("integracoes");

  /* -------------------------------------------------- filtros (aba 1) */

  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDirecao, setFiltroDirecao] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroAtiva, setFiltroAtiva] = useState("");
  const [filtroModo, setFiltroModo] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setTermo(busca.trim()), 350);
    return () => clearTimeout(timer);
  }, [busca]);

  /* -------------------------------------------------- filtros (aba 2) */

  const [pagina, setPagina] = useState(1);
  const [filtroIntegracao, setFiltroIntegracao] = useState("");
  const [filtroStatusExec, setFiltroStatusExec] = useState("");
  const [filtroOperacao, setFiltroOperacao] = useState("");

  useEffect(() => {
    setPagina(1);
  }, [filtroIntegracao, filtroStatusExec, filtroOperacao]);

  /* -------------------------------------------------- filtros (aba 3) */

  const [filtroEventoTipo, setFiltroEventoTipo] = useState("");
  const [filtroProcessado, setFiltroProcessado] = useState("");
  const [tipoEventoTeste, setTipoEventoTeste] = useState("tarefa.concluida");

  /* -------------------------------------------------- consultas */

  const painel = useConsulta<RespostaPainel>(["painel-integracoes"], "/dashboard/integracoes/");
  const tipos = useConsulta<RespostaTipos>(["integracoes-tipos"], "/integracoes-tipos/");
  const catalogo = useConsulta<{ catalogo: CatalogoItem[] }>(["integracoes-catalogo"], "/integracoes-catalogo/");
  const pessoas = useLista<UsuarioResumo>(["usuarios", "resumo"], "/usuarios/resumo/");

  const parametrosIntegracoes = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (filtroTipo) params.tipo = filtroTipo;
    if (filtroDirecao) params.direcao = filtroDirecao;
    if (filtroStatus) params.status = filtroStatus;
    if (filtroAtiva) params.ativa = filtroAtiva;
    if (filtroModo) params.modo_simulacao = filtroModo;
    if (termo) params.search = termo;
    return params;
  }, [filtroTipo, filtroDirecao, filtroStatus, filtroAtiva, filtroModo, termo]);

  const integracoes = useLista<Integracao>(["integracoes"], "/integracoes/", parametrosIntegracoes);

  const parametrosExecucoes = useMemo(() => {
    const params: Record<string, unknown> = { page: pagina };
    if (filtroIntegracao) params.integracao = filtroIntegracao;
    if (filtroStatusExec) params.status = filtroStatusExec;
    if (filtroOperacao) params.operacao = filtroOperacao;
    return params;
  }, [pagina, filtroIntegracao, filtroStatusExec, filtroOperacao]);

  const execucoes = useConsulta<Paginado<Execucao>>(["integracoes-execucoes"], "/integracoes-execucoes/", parametrosExecucoes);
  const resumoExecucoes = useConsulta<ResumoExecucoes>(
    ["integracoes-execucoes", "resumo"],
    "/integracoes-execucoes/resumo/",
    useMemo(() => {
      const params: Record<string, unknown> = {};
      if (filtroIntegracao) params.integracao = filtroIntegracao;
      if (filtroStatusExec) params.status = filtroStatusExec;
      if (filtroOperacao) params.operacao = filtroOperacao;
      return params;
    }, [filtroIntegracao, filtroStatusExec, filtroOperacao])
  );

  const parametrosEventos = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (filtroEventoTipo) params.tipo = filtroEventoTipo;
    if (filtroProcessado) params.processado = filtroProcessado;
    return params;
  }, [filtroEventoTipo, filtroProcessado]);

  const eventos = useLista<EventoIntegracao>(["integracoes-eventos"], "/integracoes-eventos/", parametrosEventos);
  const entregas = useLista<Entrega>(["integracoes-entregas"], "/integracoes-entregas/");
  const webhooks = useLista<WebhookConfig>(["webhooks"], "/webhooks/");
  const credenciais = useLista<CredencialAPI>(["credenciais-api"], "/credenciais-api/");

  /* -------------------------------------------------- estados de edição */

  const [painelIntegracao, setPainelIntegracao] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Integracao | null>(null);
  const [formulario, setFormulario] = useState<FormularioIntegracao>(FORMULARIO_VAZIO);
  const [confirmacao, setConfirmacao] = useState<Integracao | null>(null);
  const [sincronizar, setSincronizar] = useState<Integracao | null>(null);
  const [operacao, setOperacao] = useState<"IMPORTAR" | "EXPORTAR" | "TESTAR">("IMPORTAR");
  const [limite, setLimite] = useState("200");
  const [historicoDe, setHistoricoDe] = useState<Integracao | null>(null);
  const [execucaoSelecionada, setExecucaoSelecionada] = useState<Execucao | null>(null);

  const [novoMapeamento, setNovoMapeamento] = useState({
    campo_origem: "",
    campo_destino: "",
    transformacao: "NENHUMA",
    traducao: "",
    valor_padrao: "",
    obrigatorio: false,
    ordem: "0",
  });

  const [painelWebhook, setPainelWebhook] = useState(false);
  const [webhookEmEdicao, setWebhookEmEdicao] = useState<WebhookConfig | null>(null);
  const [formWebhook, setFormWebhook] = useState({ nome: "", url: "", eventos: [] as string[], ativo: true, secreto: "" });
  const [confirmacaoWebhook, setConfirmacaoWebhook] = useState<WebhookConfig | null>(null);

  const [painelCredencial, setPainelCredencial] = useState(false);
  const [credencialEmEdicao, setCredencialEmEdicao] = useState<CredencialAPI | null>(null);
  const [formCredencial, setFormCredencial] = useState({
    nome: "",
    escopos: [] as string[],
    ip_permitido: "",
    expira_em: "",
    ativo: true,
  });
  const [confirmacaoCredencial, setConfirmacaoCredencial] = useState<CredencialAPI | null>(null);
  const [revelados, setRevelados] = useState<string[]>([]);

  const listaIntegracoes = integracoes.data || [];
  const listaExecucoes = execucoes.data ? execucoes.data.results : [];
  const totalExecucoes = execucoes.data ? execucoes.data.count : 0;
  const totalPaginas = Math.max(1, Math.ceil(totalExecucoes / 50));
  const listaEventos = eventos.data || [];
  const listaEntregas = entregas.data || [];
  const listaWebhooks = webhooks.data || [];
  const listaCredenciais = credenciais.data || [];
  const itensCatalogo = catalogo.data ? catalogo.data.catalogo : painel.data ? painel.data.catalogo : [];
  const dados = painel.data;

  const mapeamentos = useLista<MapeamentoCampo>(
    ["integracoes-mapeamentos"],
    emEdicao ? "/integracoes-mapeamentos/" : null,
    useMemo(() => (emEdicao ? { integracao: emEdicao.id } : {}), [emEdicao])
  );

  const historico = useConsulta<RespostaHistorico>(
    ["integracoes", "historico"],
    historicoDe ? "/integracoes/" + historicoDe.id + "/historico/" : null
  );

  /* -------------------------------------------------- mutações */

  const salvarIntegracao = useMutacao<Record<string, unknown>, Integracao>({
    metodo: emEdicao ? "patch" : "post",
    url: emEdicao ? "/integracoes/" + emEdicao.id + "/" : "/integracoes/",
    invalidar: [["integracoes"], ["painel-integracoes"], ["integracoes-catalogo"]],
    mensagemSucesso: emEdicao ? "Integração atualizada" : "Integração criada",
    aoSucesso: () => {
      setPainelIntegracao(false);
      setEmEdicao(null);
    },
  });

  const testarConexao = useMutacao<{ id: number }, RespostaTeste>({
    url: (v) => "/integracoes/" + v.id + "/testar/",
    invalidar: [["integracoes"], ["painel-integracoes"]],
    aoSucesso: (resposta) => {
      if (resposta.sucesso) sucesso("Conexão bem-sucedida", resposta.mensagem);
      else alerta("A conexão falhou", resposta.mensagem);
    },
  });

  const sincronizarAgora = useMutacao<{ id: number; operacao?: string; limite?: number }, Execucao>({
    url: (v) => "/integracoes/" + v.id + "/sincronizar/",
    invalidar: [["integracoes"], ["integracoes-execucoes"], ["painel-integracoes"], ["integracoes-eventos"]],
    mensagemSucesso: (resposta) => "Sincronização " + (resposta.status_rotulo || "concluída"),
    aoSucesso: () => setSincronizar(null),
  });

  const excluirIntegracao = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/integracoes/" + v.id + "/",
    invalidar: [["integracoes"], ["painel-integracoes"], ["integracoes-catalogo"]],
    mensagemSucesso: "Integração excluída",
    aoSucesso: () => {
      setConfirmacao(null);
      setPainelIntegracao(false);
      setEmEdicao(null);
    },
  });

  const criarMapeamento = useMutacao<Record<string, unknown>, MapeamentoCampo>({
    url: (v) => "/integracoes/" + v.integracao + "/mapeamentos/",
    invalidar: [["integracoes-mapeamentos"], ["integracoes"]],
    mensagemSucesso: "Mapeamento adicionado",
    aoSucesso: () =>
      setNovoMapeamento({ campo_origem: "", campo_destino: "", transformacao: "NENHUMA", traducao: "", valor_padrao: "", obrigatorio: false, ordem: "0" }),
  });

  const excluirMapeamento = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/integracoes-mapeamentos/" + v.id + "/",
    invalidar: [["integracoes-mapeamentos"], ["integracoes"]],
    mensagemSucesso: "Mapeamento removido",
  });

  const sincronizarVencidas = useMutacao<{ limite: number }, RespostaSincronizacao>({
    url: "/integracoes/sincronizar-agendadas/",
    invalidar: [["integracoes"], ["integracoes-execucoes"], ["painel-integracoes"]],
    mensagemSucesso: (resposta) => numero(resposta.executadas) + " integração(ões) sincronizada(s)",
  });

  const despacharEventos = useMutacao<{ limite: number }, RespostaDespacho>({
    url: "/integracoes-eventos/despachar/",
    invalidar: [["integracoes-eventos"], ["integracoes-entregas"], ["painel-integracoes"]],
    mensagemSucesso: (resposta) =>
      numero(resposta.entregas) + " entrega(s): " + numero(resposta.sucessos) + " com sucesso e " + numero(resposta.falhas) + " com falha",
  });

  const reprocessarEvento = useMutacao<{ id: number }, EventoIntegracao>({
    url: (v) => "/integracoes-eventos/" + v.id + "/reprocessar/",
    invalidar: [["integracoes-eventos"], ["painel-integracoes"]],
    mensagemSucesso: "Evento devolvido à fila de pendentes",
  });

  const simularEvento = useMutacao<{ tipo: string }, { evento: EventoIntegracao; entrega: RespostaDespacho }>({
    url: "/integracoes-eventos/simular/",
    invalidar: [["integracoes-eventos"], ["integracoes-entregas"], ["painel-integracoes"]],
    mensagemSucesso: "Evento de teste disparado",
  });

  const salvarWebhook = useMutacao<Record<string, unknown>, WebhookConfig>({
    metodo: webhookEmEdicao ? "patch" : "post",
    url: webhookEmEdicao ? "/webhooks/" + webhookEmEdicao.id + "/" : "/webhooks/",
    invalidar: [["webhooks"], ["painel-integracoes"]],
    mensagemSucesso: webhookEmEdicao ? "Webhook atualizado" : "Webhook criado",
    aoSucesso: () => setPainelWebhook(false),
  });

  const alternarWebhook = useMutacao<{ id: number; ativo: boolean }, WebhookConfig>({
    metodo: "patch",
    url: (v) => "/webhooks/" + v.id + "/",
    invalidar: [["webhooks"], ["painel-integracoes"]],
    mensagemSucesso: "Situação do webhook atualizada",
  });

  const excluirWebhook = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/webhooks/" + v.id + "/",
    invalidar: [["webhooks"], ["painel-integracoes"]],
    mensagemSucesso: "Webhook excluído",
    aoSucesso: () => setConfirmacaoWebhook(null),
  });

  const salvarCredencial = useMutacao<Record<string, unknown>, CredencialAPI>({
    metodo: credencialEmEdicao ? "patch" : "post",
    url: credencialEmEdicao ? "/credenciais-api/" + credencialEmEdicao.id + "/" : "/credenciais-api/",
    invalidar: [["credenciais-api"]],
    mensagemSucesso: credencialEmEdicao ? "Credencial atualizada" : "Credencial criada",
    aoSucesso: () => setPainelCredencial(false),
  });

  const alternarCredencial = useMutacao<{ id: number; ativo: boolean }, CredencialAPI>({
    metodo: "patch",
    url: (v) => "/credenciais-api/" + v.id + "/",
    invalidar: [["credenciais-api"]],
    mensagemSucesso: "Situação da credencial atualizada",
  });

  const excluirCredencial = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/credenciais-api/" + v.id + "/",
    invalidar: [["credenciais-api"]],
    mensagemSucesso: "Credencial revogada",
    aoSucesso: () => setConfirmacaoCredencial(null),
  });

  /* -------------------------------------------------- ações de tela */

  const abrirNova = (tipo?: string) => {
    setEmEdicao(null);
    setFormulario({
      ...FORMULARIO_VAZIO,
      tipo: tipo || "",
      cor: tipo ? CORES_TIPO[tipo] || "#2563EB" : "#2563EB",
      icone: tipo ? ICONES_TIPO[tipo] || "plug" : "plug",
    });
    setNovoMapeamento({ campo_origem: "", campo_destino: "", transformacao: "NENHUMA", traducao: "", valor_padrao: "", obrigatorio: false, ordem: "0" });
    setPainelIntegracao(true);
  };

  const abrirEdicao = (integracao: Integracao) => {
    setEmEdicao(integracao);
    setFormulario({
      nome: integracao.nome,
      tipo: integracao.tipo,
      direcao: integracao.direcao,
      descricao: integracao.descricao || "",
      url_base: integracao.url_base || "",
      autenticacao: integracao.autenticacao,
      credenciais: [],
      cabecalhos: linhasDeObjeto(integracao.cabecalhos),
      entidade_alvo: integracao.entidade_alvo || "",
      modo_simulacao: integracao.modo_simulacao,
      ativa: integracao.ativa,
      frequencia_minutos: String(integracao.frequencia_minutos || 60),
      responsavel: integracao.responsavel ? String(integracao.responsavel) : "",
      cor: integracao.cor || "#2563EB",
      icone: integracao.icone || "plug",
    });
    setNovoMapeamento({ campo_origem: "", campo_destino: "", transformacao: "NENHUMA", traducao: "", valor_padrao: "", obrigatorio: false, ordem: "0" });
    setPainelIntegracao(true);
  };

  const enviarIntegracao = () => {
    if (!formulario.nome.trim()) {
      erro("Informe o nome da integração");
      return;
    }
    if (!formulario.tipo) {
      erro("Selecione o tipo da integração");
      return;
    }
    const credenciais = objetoDeLinhas(formulario.credenciais);
    const corpo: Record<string, unknown> = {
      nome: formulario.nome.trim(),
      tipo: formulario.tipo,
      direcao: formulario.direcao,
      descricao: formulario.descricao,
      url_base: formulario.url_base,
      autenticacao: formulario.autenticacao,
      cabecalhos: objetoDeLinhas(formulario.cabecalhos),
      entidade_alvo: formulario.entidade_alvo,
      modo_simulacao: formulario.modo_simulacao,
      ativa: formulario.ativa,
      frequencia_minutos: Number(formulario.frequencia_minutos || 60),
      responsavel: formulario.responsavel ? Number(formulario.responsavel) : null,
      cor: formulario.cor,
      icone: formulario.icone,
    };
    if (Object.keys(credenciais).length > 0) corpo.credenciais = credenciais;
    salvarIntegracao.mutate(corpo);
  };

  const abrirNovoWebhook = () => {
    setWebhookEmEdicao(null);
    setFormWebhook({ nome: "", url: "", eventos: [], ativo: true, secreto: "" });
    setPainelWebhook(true);
  };

  const abrirEdicaoWebhook = (webhook: WebhookConfig) => {
    setWebhookEmEdicao(webhook);
    setFormWebhook({
      nome: webhook.nome,
      url: webhook.url,
      eventos: webhook.eventos || [],
      ativo: webhook.ativo,
      secreto: webhook.secreto || "",
    });
    setPainelWebhook(true);
  };

  const enviarWebhook = () => {
    if (!formWebhook.nome.trim() || !formWebhook.url.trim()) {
      erro("Informe o nome e a URL do webhook");
      return;
    }
    salvarWebhook.mutate({
      nome: formWebhook.nome.trim(),
      url: formWebhook.url.trim(),
      eventos: formWebhook.eventos,
      ativo: formWebhook.ativo,
      secreto: formWebhook.secreto,
    });
  };

  const abrirNovaCredencial = () => {
    setCredencialEmEdicao(null);
    setFormCredencial({ nome: "", escopos: [], ip_permitido: "", expira_em: "", ativo: true });
    setPainelCredencial(true);
  };

  const abrirEdicaoCredencial = (credencial: CredencialAPI) => {
    setCredencialEmEdicao(credencial);
    setFormCredencial({
      nome: credencial.nome,
      escopos: credencial.escopos || [],
      ip_permitido: credencial.ip_permitido || "",
      expira_em: credencial.expira_em ? credencial.expira_em.slice(0, 10) : "",
      ativo: credencial.ativo,
    });
    setPainelCredencial(true);
  };

  const enviarCredencial = () => {
    if (!formCredencial.nome.trim()) {
      erro("Informe o nome da credencial");
      return;
    }
    const corpo: Record<string, unknown> = {
      nome: formCredencial.nome.trim(),
      escopos: formCredencial.escopos,
      ip_permitido: formCredencial.ip_permitido,
      ativo: formCredencial.ativo,
      expira_em: formCredencial.expira_em ? formCredencial.expira_em + "T23:59:00" : null,
    };
    if (usuarioAtual && !credencialEmEdicao) corpo.user = usuarioAtual.id;
    salvarCredencial.mutate(corpo);
  };

  const copiar = (valor: string, rotulo: string) => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      erro("Não foi possível copiar", "O navegador bloqueou o acesso à área de transferência. Revele o valor e copie manualmente.");
      return;
    }
    navigator.clipboard
      .writeText(valor)
      .then(() => sucesso(rotulo + " copiado", "O valor está na área de transferência."))
      .catch(() => erro("Não foi possível copiar", "Revele o valor e copie manualmente."));
  };

  const mascarar = (valor?: string | null) => {
    if (!valor) return "—";
    if (valor.length <= 12) return valor;
    return valor.slice(0, 6) + "••••••••" + valor.slice(-4);
  };

  const alternarRevelado = (chave: string) =>
    setRevelados((atual) => (atual.indexOf(chave) >= 0 ? atual.filter((x) => x !== chave) : atual.concat([chave])));

  const exportarDataset = async (formato: "JSON" | "CSV") => {
    try {
      if (formato === "CSV") {
        const texto = await api.get<string>("/integracoes/dataset/", { formato: "CSV" });
        baixarArquivo(typeof texto === "string" ? texto : JSON.stringify(texto), "sgp-portfolio.csv", "text/csv;charset=utf-8");
      } else {
        const dadosDataset = await api.get<Record<string, unknown>>("/integracoes/dataset/", { formato: "JSON" });
        baixarArquivo(JSON.stringify(dadosDataset, null, 2), "sgp-portfolio.json", "application/json");
      }
      sucesso("Dataset gerado", "O arquivo foi montado a partir do portfólio atual.");
    } catch (falha) {
      erro("Não foi possível gerar o dataset", mensagemErro(falha));
    }
  };

  /* -------------------------------------------------- KPIs */

  const kpis = [
    {
      rotulo: "Integrações",
      valor: numero(dados ? dados.integracoes.total : listaIntegracoes.length),
      icone: Plug,
      cor: "#2563EB",
      subrotulo: numero(dados ? dados.integracoes.ativas : 0) + " ativa(s)",
    },
    {
      rotulo: "Com erro",
      valor: numero(dados ? dados.integracoes.com_erro : 0),
      icone: CircleAlert,
      cor: "#DC2626",
      subrotulo: "exigem correção",
    },
    {
      rotulo: "Em simulação",
      valor: numero(dados ? dados.integracoes.em_simulacao : 0),
      icone: FlaskConical,
      cor: "#D97706",
      subrotulo: "não chamam o sistema externo",
    },
    {
      rotulo: "Itens sincronizados",
      valor: numero(dados ? dados.integracoes.itens_sincronizados : 0),
      icone: Boxes,
      cor: "#0891B2",
      subrotulo: "criados e atualizados",
    },
    {
      rotulo: "Taxa de sucesso média",
      valor: percentual(dados ? dados.integracoes.taxa_sucesso_media : 0, 1),
      icone: Percent,
      cor: "#059669",
      subrotulo: "média entre integrações",
    },
    {
      rotulo: "Eventos pendentes",
      valor: numero(dados ? dados.eventos.pendentes : 0),
      icone: Inbox,
      cor: "#8B5CF6",
      subrotulo: numero(dados ? dados.eventos.total : 0) + " no total · " + numero(dados ? dados.eventos.ultimas_24h : 0) + " nas últimas 24 h",
    },
    {
      rotulo: "Webhooks",
      valor: numero(dados ? dados.webhooks.total : listaWebhooks.length),
      icone: WebhookIcon,
      cor: "#6366F1",
      subrotulo: numero(dados ? dados.webhooks.ativos : 0) + " ativo(s)",
    },
    {
      rotulo: "Entregas de webhook",
      valor: numero(dados ? dados.webhooks.entregas : 0),
      icone: Send,
      cor: "#0EA5E9",
      subrotulo:
        numero(dados ? dados.webhooks.sucessos : 0) + " ok · " + numero(dados ? dados.webhooks.falhas : 0) + " falhas · " + duracaoTexto(dados ? dados.webhooks.tempo_medio_ms : 0),
    },
  ];

  const kpisExecucoes = [
    { rotulo: "Execuções", valor: numero(resumoExecucoes.data ? resumoExecucoes.data.total : 0), icone: History, cor: "#2563EB" },
    { rotulo: "Itens criados", valor: numero(resumoExecucoes.data ? resumoExecucoes.data.criados : 0), icone: Plus, cor: "#059669" },
    { rotulo: "Itens atualizados", valor: numero(resumoExecucoes.data ? resumoExecucoes.data.atualizados : 0), icone: RefreshCw, cor: "#0891B2" },
    { rotulo: "Itens com erro", valor: numero(resumoExecucoes.data ? resumoExecucoes.data.com_erro : 0), icone: CircleAlert, cor: "#DC2626" },
    { rotulo: "Duração média", valor: duracaoTexto(resumoExecucoes.data ? resumoExecucoes.data.duracao_media_ms : 0), icone: Clock, cor: "#8B5CF6" },
    {
      rotulo: "Execuções com falha",
      valor: numero(
        (resumoExecucoes.data ? resumoExecucoes.data.por_status : []).filter((p) => p.status === "FALHA").reduce((total, p) => total + p.total, 0)
      ),
      icone: TriangleAlert,
      cor: "#D97706",
    },
  ];

  /* -------------------------------------------------- filtros ativos */

  const filtrosAtivosIntegracoes: Array<{ chave: string; rotulo: string; valor: string; cor?: string; onRemover: () => void }> = [];
  if (termo) filtrosAtivosIntegracoes.push({ chave: "busca", rotulo: "Busca", valor: termo, onRemover: () => { setBusca(""); setTermo(""); } });
  if (filtroTipo) filtrosAtivosIntegracoes.push({ chave: "tipo", rotulo: "Tipo", valor: filtroTipo, onRemover: () => setFiltroTipo("") });
  if (filtroDirecao) filtrosAtivosIntegracoes.push({ chave: "direcao", rotulo: "Direção", valor: filtroDirecao, onRemover: () => setFiltroDirecao("") });
  if (filtroStatus) filtrosAtivosIntegracoes.push({ chave: "status", rotulo: "Status", valor: filtroStatus, cor: "#D97706", onRemover: () => setFiltroStatus("") });
  if (filtroAtiva) filtrosAtivosIntegracoes.push({ chave: "ativa", rotulo: "Ativa", valor: filtroAtiva === "true" ? "sim" : "não", onRemover: () => setFiltroAtiva("") });
  if (filtroModo) filtrosAtivosIntegracoes.push({ chave: "modo", rotulo: "Modo", valor: filtroModo === "true" ? "simulação" : "real", cor: "#8B5CF6", onRemover: () => setFiltroModo("") });

  const filtrosAtivosExecucoes: Array<{ chave: string; rotulo: string; valor: string; cor?: string; onRemover: () => void }> = [];
  if (filtroIntegracao) {
    const alvo = listaIntegracoes.find((i) => String(i.id) === filtroIntegracao);
    filtrosAtivosExecucoes.push({
      chave: "integracao",
      rotulo: "Integração",
      valor: alvo ? alvo.nome : filtroIntegracao,
      onRemover: () => setFiltroIntegracao(""),
    });
  }
  if (filtroStatusExec) filtrosAtivosExecucoes.push({ chave: "status", rotulo: "Status", valor: filtroStatusExec, cor: "#D97706", onRemover: () => setFiltroStatusExec("") });
  if (filtroOperacao) filtrosAtivosExecucoes.push({ chave: "operacao", rotulo: "Operação", valor: filtroOperacao, cor: "#0891B2", onRemover: () => setFiltroOperacao("") });

  /* -------------------------------------------------- colunas */

  const colunasExecucoes: Array<ColunaTabela<Execucao>> = [
    {
      chave: "inicio",
      titulo: "Início",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (e) => e.inicio,
      renderizar: (e) => (
        <div className="min-w-0">
          <p className="text-xs text-fg">{dataHora(e.inicio)}</p>
          <p className="text-2xs text-fg-subtle">{e.disparado_por_nome || "agendador"}</p>
        </div>
      ),
    },
    {
      chave: "integracao",
      titulo: "Integração",
      largura: "200px",
      ordenavel: true,
      valorOrdenacao: (e) => e.integracao_nome,
      renderizar: (e) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg">{e.integracao_nome}</p>
          <p className="truncate text-2xs text-fg-subtle">{e.integracao_tipo}</p>
        </div>
      ),
    },
    { chave: "operacao", titulo: "Operação", largura: "110px", renderizar: (e) => <Etiqueta tom="neutral">{e.operacao}</Etiqueta> },
    {
      chave: "status",
      titulo: "Status",
      largura: "130px",
      renderizar: (e) => <Etiqueta tom={tomExecucao(e.status)}>{e.status_rotulo}</Etiqueta>,
    },
    { chave: "lidos", titulo: "Lidos", largura: "70px", alinhar: "right", ordenavel: true, valorOrdenacao: (e) => e.itens_lidos, renderizar: (e) => <span className="tabular-nums text-xs">{numero(e.itens_lidos)}</span> },
    { chave: "criados", titulo: "Criados", largura: "70px", alinhar: "right", ordenavel: true, valorOrdenacao: (e) => e.itens_criados, renderizar: (e) => <span className="tabular-nums text-xs text-success">{numero(e.itens_criados)}</span> },
    { chave: "atualizados", titulo: "Atualizados", largura: "90px", alinhar: "right", ordenavel: true, valorOrdenacao: (e) => e.itens_atualizados, renderizar: (e) => <span className="tabular-nums text-xs">{numero(e.itens_atualizados)}</span> },
    { chave: "ignorados", titulo: "Ignorados", largura: "80px", alinhar: "right", renderizar: (e) => <span className="tabular-nums text-xs text-fg-muted">{numero(e.itens_ignorados)}</span> },
    {
      chave: "erros",
      titulo: "Com erro",
      largura: "80px",
      alinhar: "right",
      renderizar: (e) =>
        e.itens_com_erro > 0 ? (
          <span className="tabular-nums text-xs font-semibold text-danger">{numero(e.itens_com_erro)}</span>
        ) : (
          <span className="tabular-nums text-xs text-fg-subtle">0</span>
        ),
    },
    { chave: "duracao", titulo: "Duração", largura: "90px", alinhar: "right", ordenavel: true, valorOrdenacao: (e) => e.duracao_ms, renderizar: (e) => <span className="tabular-nums text-xs text-fg-muted">{duracaoTexto(e.duracao_ms)}</span> },
  ];

  const colunasEventos: Array<ColunaTabela<EventoIntegracao>> = [
    {
      chave: "tipo",
      titulo: "Evento",
      largura: "200px",
      ordenavel: true,
      valorOrdenacao: (e) => e.tipo,
      renderizar: (e) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg">{e.tipo_rotulo}</p>
          <p className="truncate font-mono text-2xs text-fg-subtle">{e.tipo}</p>
        </div>
      ),
    },
    { chave: "titulo", titulo: "Título", largura: "260px", renderizar: (e) => <span className="text-xs text-fg">{e.titulo || "—"}</span> },
    {
      chave: "entidade",
      titulo: "Entidade",
      largura: "180px",
      renderizar: (e) => (
        <span className="font-mono text-2xs text-fg-muted">{e.entidade ? e.entidade + (e.entidade_id ? "#" + e.entidade_id : "") : "—"}</span>
      ),
    },
    { chave: "ocorrido", titulo: "Ocorrido em", largura: "150px", ordenavel: true, valorOrdenacao: (e) => e.ocorrido_em, renderizar: (e) => <span className="text-2xs text-fg-muted" title={dataHora(e.ocorrido_em)}>{dataRelativa(e.ocorrido_em)}</span> },
    { chave: "tentativas", titulo: "Tentativas", largura: "90px", alinhar: "right", renderizar: (e) => <span className="tabular-nums text-xs">{numero(e.tentativas)}</span> },
    { chave: "entregas", titulo: "Entregas ok", largura: "100px", alinhar: "right", renderizar: (e) => <span className="tabular-nums text-xs text-success">{numero(e.entregas_ok)}</span> },
    {
      chave: "processado",
      titulo: "Situação",
      largura: "130px",
      renderizar: (e) =>
        e.processado ? <Etiqueta tom="success" icone={CircleCheck}>processado</Etiqueta> : <Etiqueta tom="warning" icone={Clock}>pendente</Etiqueta>,
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "90px",
      alinhar: "right",
      renderizar: (e) => (
        <Botao
          tamanho="xs"
          variante="secundario"
          icone={RotateCcw}
          carregando={reprocessarEvento.isPending && reprocessarEvento.variables?.id === e.id}
          onClick={() => reprocessarEvento.mutate({ id: e.id })}
        >
          Reprocessar
        </Botao>
      ),
    },
  ];

  // Reprocessar evento é escrita restrita: sem alçada a coluna de ações some.
  const colunasEventosVisiveis = podeAdministrar ? colunasEventos : colunasEventos.filter((c) => c.chave !== "acoes");

  const colunasEntregas: Array<ColunaTabela<Entrega>> = [
    { chave: "webhook", titulo: "Webhook", largura: "190px", ordenavel: true, valorOrdenacao: (e) => e.webhook_nome, renderizar: (e) => <span className="truncate text-xs font-medium text-fg">{e.webhook_nome}</span> },
    { chave: "evento", titulo: "Evento", largura: "190px", renderizar: (e) => <span className="font-mono text-2xs text-fg-muted">{e.evento_tipo}</span> },
    { chave: "tentativa", titulo: "Tentativa", largura: "90px", alinhar: "center", renderizar: (e) => <span className="tabular-nums text-xs">{numero(e.tentativa)}</span> },
    { chave: "status", titulo: "Status HTTP", largura: "110px", alinhar: "center", renderizar: (e) => <span className="tabular-nums text-xs">{e.status_code ? numero(e.status_code) : "—"}</span> },
    {
      chave: "resultado",
      titulo: "Resultado",
      largura: "130px",
      renderizar: (e) =>
        e.sucesso ? (
          <Etiqueta tom="success" icone={CircleCheck}>{e.simulado ? "simulado ok" : "sucesso"}</Etiqueta>
        ) : (
          <Etiqueta tom="danger" icone={CircleAlert}>falha</Etiqueta>
        ),
    },
    { chave: "duracao", titulo: "Duração", largura: "90px", alinhar: "right", renderizar: (e) => <span className="tabular-nums text-xs text-fg-muted">{duracaoTexto(e.duracao_ms)}</span> },
    {
      chave: "erro",
      titulo: "Erro",
      renderizar: (e) =>
        e.erro ? (
          <span className="line-clamp-2 text-2xs text-danger" title={e.erro}>{e.erro}</span>
        ) : (
          <span className="line-clamp-2 text-2xs text-fg-subtle" title={e.resposta}>{e.resposta ? e.resposta.slice(0, 90) : "—"}</span>
        ),
    },
  ];

  const colunasCredenciais: Array<ColunaTabela<CredencialAPI>> = [
    {
      chave: "nome",
      titulo: "Nome",
      largura: "200px",
      ordenavel: true,
      valorOrdenacao: (c) => c.nome,
      renderizar: (c) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-fg">{c.nome}</p>
          <p className="truncate text-2xs text-fg-subtle">{c.user_nome || "—"}</p>
        </div>
      ),
    },
    {
      chave: "token",
      titulo: "Token",
      largura: "280px",
      renderizar: (c) => {
        const revelado = revelados.indexOf("credencial-" + c.id) >= 0;
        return (
          <div className="flex items-center gap-1.5">
            <code className="truncate rounded bg-surface-3 px-1.5 py-0.5 font-mono text-2xs text-fg">
              {revelado ? c.token : mascarar(c.token)}
            </code>
            <BotaoIcone
              icone={revelado ? EyeOff : Eye}
              rotulo={revelado ? "Ocultar token" : "Revelar token"}
              tamanho="xs"
              onClick={() => alternarRevelado("credencial-" + c.id)}
            />
            <BotaoIcone icone={Copy} rotulo="Copiar token" tamanho="xs" onClick={() => copiar(c.token, "Token")} />
          </div>
        );
      },
    },
    {
      chave: "escopos",
      titulo: "Escopos",
      renderizar: (c) => (
        <div className="flex flex-wrap gap-1">
          {(c.escopos || []).slice(0, 3).map((e) => (
            <Chip key={e} cor="#2563EB">{e}</Chip>
          ))}
          {(c.escopos || []).length > 3 && <Etiqueta tom="neutral">{"+" + numero((c.escopos || []).length - 3)}</Etiqueta>}
          {(c.escopos || []).length === 0 && <span className="text-2xs text-fg-subtle">sem escopo</span>}
        </div>
      ),
    },
    {
      chave: "ip",
      titulo: "IP permitido",
      largura: "140px",
      renderizar: (c) => <span className="font-mono text-2xs text-fg-muted">{c.ip_permitido || "qualquer"}</span>,
    },
    {
      chave: "expira",
      titulo: "Expira em",
      largura: "130px",
      ordenavel: true,
      valorOrdenacao: (c) => c.expira_em || "",
      renderizar: (c) =>
        c.expira_em ? <span className="text-2xs text-fg-muted">{dataRelativa(c.expira_em)}</span> : <Etiqueta tom="neutral">sem expiração</Etiqueta>,
    },
    {
      chave: "chamadas",
      titulo: "Chamadas",
      largura: "100px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (c) => c.total_chamadas,
      renderizar: (c) => <span className="tabular-nums text-xs">{numero(c.total_chamadas)}</span>,
    },
    {
      chave: "ativo",
      titulo: "Ativa",
      largura: "90px",
      alinhar: "center",
      renderizar: (c) => (
        <div className="flex flex-col items-center gap-1">
          <Interruptor ativo={c.ativo} tamanho="sm" onChange={(v) => alternarCredencial.mutate({ id: c.id, ativo: v })} />
          {c.expirado && <Etiqueta tom="danger">expirada</Etiqueta>}
        </div>
      ),
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "90px",
      alinhar: "right",
      renderizar: (c) => (
        <div className="flex items-center justify-end gap-1">
          <BotaoIcone icone={Pencil} rotulo={"Editar credencial " + c.nome} tamanho="xs" onClick={() => abrirEdicaoCredencial(c)} />
          <BotaoIcone icone={Trash2} rotulo={"Revogar credencial " + c.nome} tamanho="xs" onClick={() => setConfirmacaoCredencial(c)} />
        </div>
      ),
    },
  ];

  // Ativar, editar ou revogar credencial é escrita restrita a ADMIN e PMO.
  const colunasCredenciaisVisiveis = podeAdministrar
    ? colunasCredenciais
    : colunasCredenciais.filter((c) => c.chave !== "ativo" && c.chave !== "acoes");

  /* -------------------------------------------------- renderização */

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Central de integrações"
        subtitulo="Conexões com sistemas externos, execuções observáveis, fila de eventos e credenciais de API"
        icone={Plug}
        cor="#0891B2"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" icone={Layers} onClick={() => setAba("catalogo")}>
              Ver catálogo
            </Botao>
            {podeAdministrar && (
              <Botao variante="primario" icone={Plus} onClick={() => abrirNova()}>
                Nova integração
              </Botao>
            )}
          </div>
        }
      />

      {!podeAdministrar && (
        <Alerta tom="info" titulo="Perfil de consulta">
          Você acompanha integrações, execuções, a fila de eventos, os webhooks e as credenciais de API. Criar, testar,
          sincronizar, reprocessar, despachar, disparar evento e revogar credencial são ações de ADMIN e PMO. O catálogo e os
          downloads (.ics e dataset analítico) continuam disponíveis.
        </Alerta>
      )}

      {painel.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os indicadores de integração">
          {mensagemErro(painel.error)}
        </Alerta>
      )}

      {painel.isLoading ? <Esqueleto linhas={2} className="rounded-sgp-lg border border-border bg-surface p-4" /> : <LinhaKPI itens={kpis} />}

      <Abas
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: "integracoes", rotulo: "Integrações", icone: Plug, contagem: dados ? dados.integracoes.total : listaIntegracoes.length },
          { valor: "execucoes", rotulo: "Execuções", icone: History, contagem: resumoExecucoes.data ? resumoExecucoes.data.total : undefined },
          { valor: "eventos", rotulo: "Eventos e webhooks", icone: WebhookIcon, contagem: dados ? dados.eventos.pendentes : undefined },
          { valor: "catalogo", rotulo: "Catálogo", icone: Layers, contagem: itensCatalogo.length },
        ]}
      />

      {/* ============================================================ aba 1 */}

      {aba === "integracoes" && (
        <div className="space-y-3">
          <Alerta tom="warning" titulo="Modo simulação × modo real — a decisão mais importante desta tela" icone={FlaskConical}>
            <p>
              <strong className="text-fg">Modo simulação (recomendado para começar):</strong> o conector monta a requisição,
              registra exatamente o que seria enviado ou importado e grava a execução com status SIMULADO. Nada sai do SGP e
              nenhum dado externo é gravado — é a forma segura de validar URL, autenticação e mapeamento de campos.
            </p>
            <p className="mt-1.5">
              <strong className="text-fg">Modo real:</strong> o conector chama o sistema externo de verdade a cada frequência
              configurada. Importações podem criar ou alterar registros no SGP e exportações podem escrever no sistema de
              destino. Ligue o modo real apenas depois de um teste de conexão bem-sucedido e de revisar os mapeamentos.
            </p>
            <p className="mt-1.5">
              Cada card mostra o selo <strong className="text-fg">simulação</strong> ou <strong className="text-fg">real</strong> para
              deixar claro, sem abrir a configuração, o que aquela conexão faz hoje.
            </p>
          </Alerta>

          <BarraFerramentas>
            <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar por nome, descrição ou URL..." className="w-64" />
            <FiltroSelect
              rotulo="Tipo"
              valor={filtroTipo}
              onChange={setFiltroTipo}
              opcoes={(tipos.data ? tipos.data.tipos : []).map((t) => ({ valor: t.valor, rotulo: t.rotulo }))}
            />
            <FiltroSelect
              rotulo="Direção"
              valor={filtroDirecao}
              onChange={setFiltroDirecao}
              opcoes={(tipos.data ? tipos.data.direcoes : []).map((d) => ({ valor: d.valor, rotulo: d.rotulo }))}
            />
            <FiltroSelect
              rotulo="Status"
              valor={filtroStatus}
              onChange={setFiltroStatus}
              opcoes={[
                { valor: "ATIVA", rotulo: "Ativa" },
                { valor: "SINCRONIZANDO", rotulo: "Sincronizando" },
                { valor: "ERRO", rotulo: "Com erro" },
                { valor: "CONFIGURANDO", rotulo: "Em configuração" },
                { valor: "INATIVA", rotulo: "Inativa" },
              ]}
            />
            <FiltroSelect
              rotulo="Ativa"
              valor={filtroAtiva}
              onChange={setFiltroAtiva}
              opcoes={[
                { valor: "true", rotulo: "Somente ativas" },
                { valor: "false", rotulo: "Somente inativas" },
              ]}
            />
            <FiltroSelect
              rotulo="Modo"
              valor={filtroModo}
              onChange={setFiltroModo}
              opcoes={[
                { valor: "true", rotulo: "Simulação" },
                { valor: "false", rotulo: "Real" },
              ]}
            />
            <span className="ml-auto text-2xs text-fg-muted">{numero(listaIntegracoes.length) + " integração(ões) listada(s)"}</span>
          </BarraFerramentas>

          <FiltrosAtivos
            filtros={filtrosAtivosIntegracoes}
            onLimpar={() => {
              setBusca("");
              setTermo("");
              setFiltroTipo("");
              setFiltroDirecao("");
              setFiltroStatus("");
              setFiltroAtiva("");
              setFiltroModo("");
            }}
          />

          {integracoes.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar as integrações">
              {mensagemErro(integracoes.error)}
            </Alerta>
          )}

          {integracoes.isLoading ? (
            <GradeCards colunas={3}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <Esqueleto linhas={4} />
                </div>
              ))}
            </GradeCards>
          ) : listaIntegracoes.length === 0 ? (
            <Vazio
              icone={Unplug}
              titulo="Nenhuma integração encontrada"
              descricao="Configure uma conexão com LMS, Jira, Teams, ERP, RH ou agenda corporativa. Comece pelo catálogo de tipos previstos."
              acao={
                <div className="flex items-center gap-2">
                  <Botao variante="secundario" icone={Layers} onClick={() => setAba("catalogo")}>
                    Abrir catálogo
                  </Botao>
                  {podeAdministrar && (
                    <Botao variante="primario" icone={Plus} onClick={() => abrirNova()}>
                      Nova integração
                    </Botao>
                  )}
                </div>
              }
            />
          ) : (
            <GradeCards colunas={3}>
              {listaIntegracoes.map((integracao) => {
                const Icone = iconeDe(integracao.icone);
                return (
                  <div
                    key={integracao.id}
                    className="flex flex-col rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 transition-shadow hover:shadow-n2"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-sgp-lg"
                        style={{ backgroundColor: (integracao.cor || "#2563EB") + "1f", color: integracao.cor || "#2563EB" }}
                      >
                        <Icone className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold text-fg" title={integracao.nome}>{integracao.nome}</h3>
                          <Etiqueta tom={tomStatus(integracao.status)} icone={iconeStatus(integracao.status)}>
                            {integracao.status_rotulo}
                          </Etiqueta>
                        </div>
                        <p className="mt-0.5 truncate text-2xs text-fg-muted">{integracao.tipo_rotulo}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Etiqueta tom="neutral" icone={iconeDirecao(integracao.direcao)}>{integracao.direcao_rotulo}</Etiqueta>
                          {integracao.modo_simulacao ? (
                            <Chip cor="#D97706" icone={FlaskConical}>simulação</Chip>
                          ) : (
                            <Chip cor="#DC2626" icone={Zap}>real</Chip>
                          )}
                          {integracao.ativa ? (
                            <Chip cor="#059669" icone={CircleCheck}>ativa</Chip>
                          ) : (
                            <Chip cor="#64748B" icone={CircleDashed}>inativa</Chip>
                          )}
                        </div>
                      </div>
                    </div>

                    {integracao.descricao && <p className="mt-2 line-clamp-2 text-2xs text-fg-muted">{integracao.descricao}</p>}

                    <div className="mt-3">
                      <BarraProgresso
                        valor={Math.max(0, Math.min(100, integracao.taxa_sucesso))}
                        cor={integracao.taxa_sucesso >= 90 ? "#059669" : integracao.taxa_sucesso >= 60 ? "#D97706" : "#DC2626"}
                        rotulo="Taxa de sucesso"
                        mostrarValor
                        altura="sm"
                      />
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-2xs">
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <dt className="text-fg-subtle">Última sincronização</dt>
                        <dd className="mt-0.5 text-fg" title={integracao.ultima_sincronizacao ? dataHora(integracao.ultima_sincronizacao) : "Nunca sincronizada"}>
                          {integracao.ultima_sincronizacao ? dataRelativa(integracao.ultima_sincronizacao) : "nunca"}
                        </dd>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <dt className="text-fg-subtle">Próxima</dt>
                        <dd className="mt-0.5 text-fg" title={integracao.proxima_sincronizacao ? dataHora(integracao.proxima_sincronizacao) : "Sem agendamento"}>
                          {integracao.proxima_sincronizacao ? dataRelativa(integracao.proxima_sincronizacao) : "não agendada"}
                        </dd>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <dt className="text-fg-subtle">Itens sincronizados</dt>
                        <dd className="mt-0.5 tabular-nums text-fg">{numero(integracao.itens_sincronizados)}</dd>
                      </div>
                      <div className="rounded-sgp border border-border bg-surface-2 p-2">
                        <dt className="text-fg-subtle">Execuções</dt>
                        <dd className="mt-0.5 tabular-nums text-fg">
                          {numero(integracao.total_execucoes) + " (" + numero(integracao.total_falha) + " falhas)"}
                        </dd>
                      </div>
                    </dl>

                    {integracao.ultimo_erro && (
                      <p className="mt-2 line-clamp-2 rounded-sgp border border-danger/35 bg-danger-soft/25 px-2 py-1.5 text-2xs text-danger" title={integracao.ultimo_erro}>
                        {integracao.ultimo_erro}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {integracao.responsavel_detalhe ? (
                        <>
                          <Avatar
                            nome={integracao.responsavel_detalhe.nome}
                            cor={integracao.responsavel_detalhe.cor}
                            iniciais={integracao.responsavel_detalhe.iniciais}
                            url={integracao.responsavel_detalhe.avatar_display}
                            tamanho="xs"
                          />
                          <span className="text-2xs text-fg-muted">{integracao.responsavel_detalhe.nome}</span>
                        </>
                      ) : (
                        <span className="text-2xs text-fg-subtle">sem responsável</span>
                      )}
                      <span className="ml-auto text-2xs text-fg-subtle">{"frequência de " + numero(integracao.frequencia_minutos) + " min"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                      {podeAdministrar && (
                        <>
                          <Botao
                            tamanho="xs"
                            variante="secundario"
                            icone={FlaskConical}
                            carregando={testarConexao.isPending && testarConexao.variables?.id === integracao.id}
                            onClick={() => testarConexao.mutate({ id: integracao.id })}
                          >
                            Testar conexão
                          </Botao>
                          <Botao
                            tamanho="xs"
                            variante="secundario"
                            icone={Play}
                            onClick={() => {
                              setSincronizar(integracao);
                              setOperacao(integracao.direcao === "ENTRADA" ? "IMPORTAR" : "EXPORTAR");
                              setLimite("200");
                            }}
                          >
                            Sincronizar agora
                          </Botao>
                        </>
                      )}
                      <Botao tamanho="xs" variante="fantasma" icone={History} onClick={() => setHistoricoDe(integracao)}>
                        Histórico
                      </Botao>
                      {podeAdministrar && (
                        <>
                          <BotaoIcone icone={Pencil} rotulo={"Editar integração " + integracao.nome} tamanho="xs" onClick={() => abrirEdicao(integracao)} />
                          <BotaoIcone icone={Trash2} rotulo={"Excluir integração " + integracao.nome} tamanho="xs" onClick={() => setConfirmacao(integracao)} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </GradeCards>
          )}

          <SecaoColapsavel titulo="Como o agendador funciona" icone={Clock} abertoInicial={false}>
            <ul className="space-y-1.5 text-xs text-fg-muted">
              <li>1. Cada integração ativa possui uma frequência em minutos e uma próxima execução calculada após o último sucesso.</li>
              <li>2. O comando periódico do backend executa as integrações vencidas; o botão "Sincronizar todas as vencidas" faz o mesmo sob demanda.</li>
              <li>3. Toda execução é registrada com contadores de lidos, criados, atualizados, ignorados e com erro — abra a aba Execuções para auditar.</li>
              <li>4. Falhas marcam a integração com status "Com erro" e mantêm a última mensagem visível no card.</li>
            </ul>
          </SecaoColapsavel>
        </div>
      )}

      {/* ============================================================ aba 2 */}

      {aba === "execucoes" && (
        <div className="space-y-3">
          <LinhaKPI itens={kpisExecucoes} />

          <BarraFerramentas>
            <FiltroSelect
              rotulo="Integração"
              valor={filtroIntegracao}
              onChange={setFiltroIntegracao}
              opcoes={listaIntegracoes.map((i) => ({ valor: String(i.id), rotulo: i.nome }))}
            />
            <FiltroSelect
              rotulo="Status"
              valor={filtroStatusExec}
              onChange={setFiltroStatusExec}
              opcoes={[
                { valor: "SUCESSO", rotulo: "Sucesso" },
                { valor: "PARCIAL", rotulo: "Sucesso parcial" },
                { valor: "SIMULADO", rotulo: "Simulado" },
                { valor: "FALHA", rotulo: "Falha" },
                { valor: "EM_ANDAMENTO", rotulo: "Em andamento" },
              ]}
            />
            <FiltroSelect
              rotulo="Operação"
              valor={filtroOperacao}
              onChange={setFiltroOperacao}
              opcoes={[
                { valor: "IMPORTAR", rotulo: "Importar" },
                { valor: "EXPORTAR", rotulo: "Exportar" },
                { valor: "TESTAR", rotulo: "Testar" },
              ]}
            />
            {podeAdministrar && (
              <Botao
                tamanho="sm"
                variante="primario"
                icone={RefreshCw}
                carregando={sincronizarVencidas.isPending}
                onClick={() => sincronizarVencidas.mutate({ limite: 10 })}
              >
                Sincronizar todas as vencidas
              </Botao>
            )}
            <span className="ml-auto text-2xs text-fg-muted">
              {numero(totalExecucoes) + " execução(ões) · página " + numero(pagina) + " de " + numero(totalPaginas)}
            </span>
          </BarraFerramentas>

          <FiltrosAtivos
            filtros={filtrosAtivosExecucoes}
            onLimpar={() => {
              setFiltroIntegracao("");
              setFiltroStatusExec("");
              setFiltroOperacao("");
            }}
          />

          {execucoes.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar as execuções">
              {mensagemErro(execucoes.error)}
            </Alerta>
          )}

          <div className="rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
            {execucoes.isLoading ? (
              <CarregandoBloco rotulo="Carregando execuções..." />
            ) : (
              <Tabela
                colunas={colunasExecucoes}
                dados={listaExecucoes}
                compacta
                aoClicarLinha={(e) => setExecucaoSelecionada(e)}
                destaqueLinha={(e) => (e.status === "FALHA" ? "bg-danger-soft/25" : e.status === "PARCIAL" ? "bg-warning-soft/20" : undefined)}
                vazio={
                  <Vazio
                    icone={History}
                    titulo="Nenhuma execução registrada"
                    descricao="Execute uma sincronização ou ajuste os filtros para visualizar o histórico de execuções."
                  />
                }
              />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-2xs text-fg-muted">{"Exibindo " + numero(listaExecucoes.length) + " de " + numero(totalExecucoes) + " execução(ões)"}</span>
            <div className="flex items-center gap-2">
              <Botao
                tamanho="sm"
                variante="secundario"
                disabled={!execucoes.data || !execucoes.data.previous}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Botao>
              <span className="text-2xs tabular-nums text-fg-muted">{numero(pagina) + " / " + numero(totalPaginas)}</span>
              <Botao
                tamanho="sm"
                variante="secundario"
                disabled={!execucoes.data || !execucoes.data.next}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </Botao>
            </div>
          </div>

          <SecaoColapsavel titulo="Últimas execuções do painel consolidado" icone={ScrollText} abertoInicial={false} contagem={dados ? dados.execucoes_recentes.length : 0}>
            {(dados ? dados.execucoes_recentes : []).length === 0 ? (
              <p className="text-xs text-fg-muted">Nenhuma execução recente registrada.</p>
            ) : (
              <ul className="space-y-1.5">
                {(dados ? dados.execucoes_recentes : []).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2.5 py-2">
                    <Etiqueta tom={tomExecucao(r.status)}>{r.status}</Etiqueta>
                    <span className="text-xs font-medium text-fg">{r.integracao}</span>
                    <span className="text-2xs text-fg-muted">{r.tipo}</span>
                    <span className="text-2xs text-fg-muted">{r.operacao}</span>
                    <span className="text-2xs text-fg-muted">{numero(r.criados) + " criados · " + numero(r.atualizados) + " atualizados"}</span>
                    {r.erros > 0 && <span className="text-2xs font-semibold text-danger">{numero(r.erros) + " com erro"}</span>}
                    <span className="ml-auto text-2xs text-fg-subtle">{dataRelativa(r.inicio) + " · " + duracaoTexto(r.duracao_ms)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SecaoColapsavel>
        </div>
      )}

      {/* ============================================================ aba 3 */}

      {aba === "eventos" && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Fila de eventos (padrão outbox)" icone={Inbox}>
            Cada evento de domínio entra numa fila e só é considerado entregue quando todos os webhooks interessados respondem
            com sucesso. Eventos sem webhook interessado são marcados como processados automaticamente. Use "Disparar evento de
            teste" para validar a entrega ponta a ponta antes de ligar um webhook em produção.
          </Alerta>

          <SecaoColapsavel titulo="Fila de eventos" icone={Inbox} abertoInicial contagem={listaEventos.length}>
            <div className="space-y-3">
              <BarraFerramentas>
                <FiltroSelect
                  rotulo="Tipo"
                  valor={filtroEventoTipo}
                  onChange={setFiltroEventoTipo}
                  opcoes={EVENTOS_DISPONIVEIS.map((e) => ({ valor: e.codigo, rotulo: e.rotulo }))}
                />
                <FiltroSelect
                  rotulo="Situação"
                  valor={filtroProcessado}
                  onChange={setFiltroProcessado}
                  opcoes={[
                    { valor: "false", rotulo: "Pendentes" },
                    { valor: "true", rotulo: "Processados" },
                  ]}
                />
                {podeAdministrar && (
                  <>
                    <Botao
                      tamanho="sm"
                      variante="primario"
                      icone={Send}
                      carregando={despacharEventos.isPending}
                      onClick={() => despacharEventos.mutate({ limite: 50 })}
                    >
                      Despachar pendentes
                    </Botao>
                    <div className="flex items-center gap-1.5">
                      <Selecao
                        value={tipoEventoTeste}
                        onChange={(e) => setTipoEventoTeste(e.target.value)}
                        className="h-8 w-56 py-0 text-xs"
                        aria-label="Tipo do evento de teste"
                      >
                        {EVENTOS_DISPONIVEIS.map((e) => (
                          <option key={e.codigo} value={e.codigo}>
                            {e.rotulo}
                          </option>
                        ))}
                      </Selecao>
                      <Botao
                        tamanho="sm"
                        variante="secundario"
                        icone={Zap}
                        carregando={simularEvento.isPending}
                        onClick={() => simularEvento.mutate({ tipo: tipoEventoTeste })}
                      >
                        Disparar evento de teste
                      </Botao>
                    </div>
                  </>
                )}
              </BarraFerramentas>

              {eventos.isError && (
                <Alerta tom="danger" titulo="Não foi possível carregar a fila de eventos">
                  {mensagemErro(eventos.error)}
                </Alerta>
              )}

              {eventos.isLoading ? (
                <CarregandoBloco rotulo="Carregando eventos..." />
              ) : (
                <Tabela
                  colunas={colunasEventosVisiveis}
                  dados={listaEventos}
                  compacta
                  vazio={
                    <Vazio
                      icone={Inbox}
                      titulo="Nenhum evento na fila"
                      descricao="Os eventos aparecem aqui conforme o domínio publica mudanças (projetos, tarefas, riscos, alocações e capacidades)."
                    />
                  }
                />
              )}
            </div>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Entregas de webhook" icone={Send} abertoInicial={false} contagem={listaEntregas.length}>
            <div className="space-y-3">
              <p className="text-xs text-fg-muted">
                Cada tentativa de entrega é registrada com o status HTTP devolvido, o tempo de resposta e o erro. Até três
                tentativas por evento, quando o endpoint não responde com 2xx.
              </p>
              {entregas.isError && (
                <Alerta tom="danger" titulo="Não foi possível carregar as entregas">
                  {mensagemErro(entregas.error)}
                </Alerta>
              )}
              {entregas.isLoading ? (
                <CarregandoBloco rotulo="Carregando entregas..." />
              ) : (
                <Tabela
                  colunas={colunasEntregas}
                  dados={listaEntregas}
                  compacta
                  destaqueLinha={(e) => (e.sucesso ? undefined : "bg-danger-soft/25")}
                  vazio={<Vazio icone={Send} titulo="Nenhuma entrega registrada" descricao="Dispare um evento de teste para validar um webhook." />}
                />
              )}
            </div>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Webhooks configurados" icone={WebhookIcon} abertoInicial contagem={listaWebhooks.length}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-fg-muted">
                  Endpoints que recebem POST em JSON quando os eventos assinados acontecem. O segredo é usado para assinar o
                  corpo com HMAC-SHA256 no cabeçalho X-SGP-Assinatura.
                </p>
                {podeAdministrar && (
                  <Botao tamanho="sm" variante="primario" icone={Plus} onClick={abrirNovoWebhook}>
                    Novo webhook
                  </Botao>
                )}
              </div>

              {webhooks.isError && (
                <Alerta tom="danger" titulo="Não foi possível carregar os webhooks">
                  {mensagemErro(webhooks.error)}
                </Alerta>
              )}

              {webhooks.isLoading ? (
                <CarregandoBloco rotulo="Carregando webhooks..." />
              ) : listaWebhooks.length === 0 ? (
                <Vazio
                  icone={WebhookIcon}
                  titulo="Nenhum webhook configurado"
                  descricao="Cadastre um endpoint para receber notificações de eventos do SGP."
                  acao={
                    podeAdministrar ? (
                      <Botao variante="primario" icone={Plus} onClick={abrirNovoWebhook}>
                        Novo webhook
                      </Botao>
                    ) : undefined
                  }
                />
              ) : (
                <GradeCards colunas={2}>
                  {listaWebhooks.map((webhook) => {
                    const revelado = revelados.indexOf("webhook-" + webhook.id) >= 0;
                    return (
                      <div key={webhook.id} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold text-fg">{webhook.nome}</h4>
                            <p className="truncate font-mono text-2xs text-fg-subtle" title={webhook.url}>{webhook.url}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {webhook.ativo ? (
                              <Etiqueta tom="success" icone={CircleCheck}>ativo</Etiqueta>
                            ) : (
                              <Etiqueta tom="neutral" icone={CircleDashed}>inativo</Etiqueta>
                            )}
                            {podeAdministrar && (
                              <Interruptor ativo={webhook.ativo} tamanho="sm" onChange={(v) => alternarWebhook.mutate({ id: webhook.id, ativo: v })} />
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {(webhook.eventos || []).map((codigo) => (
                            <Chip key={codigo} cor="#8B5CF6">{codigo}</Chip>
                          ))}
                          {(webhook.eventos || []).length === 0 && (
                            <span className="text-2xs text-fg-subtle">todos os eventos (nenhum filtro assinado)</span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                          <span className="text-2xs text-fg-muted">Segredo:</span>
                          <code className="truncate rounded bg-surface-3 px-1.5 py-0.5 font-mono text-2xs text-fg">
                            {webhook.secreto ? (revelado ? webhook.secreto : mascarar(webhook.secreto)) : "não definido"}
                          </code>
                          <BotaoIcone
                            icone={revelado ? EyeOff : Eye}
                            rotulo={revelado ? "Ocultar segredo" : "Revelar segredo"}
                            tamanho="xs"
                            onClick={() => alternarRevelado("webhook-" + webhook.id)}
                          />
                          <BotaoIcone icone={Copy} rotulo="Copiar segredo" tamanho="xs" onClick={() => copiar(webhook.secreto, "Segredo")} />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-2xs text-fg-subtle">{"criado " + dataRelativa(webhook.criado_em)}</span>
                          {podeAdministrar && (
                            <div className="flex items-center gap-1">
                              <Botao tamanho="xs" variante="secundario" icone={Pencil} onClick={() => abrirEdicaoWebhook(webhook)}>
                                Editar
                              </Botao>
                              <BotaoIcone icone={Trash2} rotulo={"Excluir webhook " + webhook.nome} tamanho="xs" onClick={() => setConfirmacaoWebhook(webhook)} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </GradeCards>
              )}
            </div>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Credenciais de API" icone={KeyRound} abertoInicial={false} contagem={listaCredenciais.length}>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-fg-muted">
                  Tokens de acesso à API pública v1, com escopos limitados, restrição de IP de origem e expiração opcional.
                  Envie o valor no cabeçalho Authorization como Bearer.
                </p>
                {podeAdministrar && (
                  <Botao tamanho="sm" variante="primario" icone={KeyRound} onClick={abrirNovaCredencial}>
                    Nova credencial
                  </Botao>
                )}
              </div>

              {credenciais.isError && (
                <Alerta tom="danger" titulo="Não foi possível carregar as credenciais">
                  {mensagemErro(credenciais.error)}
                </Alerta>
              )}

              {credenciais.isLoading ? (
                <CarregandoBloco rotulo="Carregando credenciais..." />
              ) : (
                <Tabela
                  colunas={colunasCredenciaisVisiveis}
                  dados={listaCredenciais}
                  compacta
                  vazio={
                    <Vazio
                      icone={KeyRound}
                      titulo="Nenhuma credencial emitida"
                      descricao="Crie credenciais para permitir que sistemas externos consumam a API do SGP com escopos limitados."
                      acao={
                        podeAdministrar ? (
                          <Botao variante="primario" icone={KeyRound} onClick={abrirNovaCredencial}>
                            Nova credencial
                          </Botao>
                        ) : undefined
                      }
                    />
                  }
                />
              )}

              <Alerta tom="warning" titulo="O valor do token não é exibido novamente">
                Copie e guarde o token em um cofre de segredos no momento da criação. Depois disso, apenas o valor mascarado
                permanece disponível para conferência.
              </Alerta>
            </div>
          </SecaoColapsavel>
        </div>
      )}

      {/* ============================================================ aba 4 */}

      {aba === "catalogo" && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Catálogo de integrações previstas (especificação §11)" icone={Layers}>
            Os 15 tipos abaixo são os previstos na especificação. Clique em Configurar para abrir o formulário de criação já
            com o tipo preenchido — a integração nasce em modo simulação, sem chamar o sistema externo.
          </Alerta>

          <GradeCards colunas={3}>
            {itensCatalogo.map((item) => {
              const Icone = iconeDe(item.icone);
              const cor = CORES_TIPO[item.tipo] || "#2563EB";
              const direcaoIcone = item.direcao === "Bidirecional" ? ArrowLeftRight : ArrowRight;
              return (
                <div key={item.tipo} className="flex flex-col rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-sgp-lg" style={{ backgroundColor: cor + "1f", color: cor }}>
                      <Icone className="size-4.5" aria-hidden />
                    </span>
                    {item.configurada ? (
                      <Etiqueta tom="success" icone={BadgeCheck}>configurada</Etiqueta>
                    ) : (
                      <Etiqueta tom="neutral" icone={Unplug}>não configurada</Etiqueta>
                    )}
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-fg">{item.nome}</h4>
                  <p className="mt-0.5 flex-1 text-2xs text-fg-muted">{item.descricao}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Etiqueta tom={item.direcao === "Bidirecional" ? "brand" : "info"} icone={direcaoIcone}>{item.direcao}</Etiqueta>
                    <Chip cor={item.suporta_conector ? "#059669" : "#64748B"} icone={item.suporta_conector ? CircleCheck : CircleDashed}>
                      {item.suporta_conector ? "conector disponível" : "somente configuração"}
                    </Chip>
                    {item.modo_simulacao === true && <Chip cor="#D97706" icone={FlaskConical}>simulação</Chip>}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
                    {podeAdministrar ? (
                      <>
                        <Botao tamanho="xs" variante="primario" icone={Plus} onClick={() => abrirNova(item.tipo)}>
                          Configurar
                        </Botao>
                        {item.integracao_id && (
                          <Botao
                            tamanho="xs"
                            variante="secundario"
                            icone={Pencil}
                            onClick={() => {
                              const alvo = listaIntegracoes.find((i) => i.id === item.integracao_id);
                              if (alvo) abrirEdicao(alvo);
                              else {
                                setAba("integracoes");
                                alerta("Integração configurada", "Abra o card correspondente na aba Integrações para editá-la.");
                              }
                            }}
                          >
                            Abrir configuração
                          </Botao>
                        )}
                      </>
                    ) : (
                      item.integracao_id && (
                        <Botao tamanho="xs" variante="secundario" icone={Plug} onClick={() => setAba("integracoes")}>
                          Ver na aba Integrações
                        </Botao>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </GradeCards>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                <CalendarPlus className="size-4 text-brand" aria-hidden />
                Feed de calendário (.ics)
              </span>
              <p className="mt-1 text-2xs text-fg-muted">
                Assine o endereço no Google Calendar ("Outros calendários → De URL") ou no Outlook ("Adicionar calendário →
                Assinar da Web") para ver tarefas e marcos do SGP na sua agenda, com atualização automática.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href="/api/v1/integracoes/calendario.ics"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-2.5 text-xs font-medium text-brand-fg shadow-n1 transition-colors hover:bg-brand-hover"
                >
                  <Download className="size-3.5" aria-hidden />
                  Abrir link do feed .ics
                </a>
                <Dica texto="O endereço usa a sessão autenticada deste navegador. Para assinar em outro aplicativo, gere uma credencial de API com escopo projeto.ver.">
                  <span className="text-2xs text-fg-subtle">como assinar</span>
                </Dica>
              </div>
            </div>

            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                <FileJson className="size-4 text-brand" aria-hidden />
                Dataset analítico
              </span>
              <p className="mt-1 text-2xs text-fg-muted">
                Uma linha por projeto com datas, orçamento, custo real, BAC, PV, EV, AC, CPI, SPI, EAC, VAC, progresso, riscos
                e tarefas. Alimenta Power BI, Tableau ou uma planilha do Excel sem digitação manual.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Botao tamanho="sm" variante="secundario" icone={FileJson} onClick={() => exportarDataset("JSON")}>
                  Baixar JSON
                </Botao>
                <Botao tamanho="sm" variante="secundario" icone={FileSpreadsheet} onClick={() => exportarDataset("CSV")}>
                  Baixar CSV
                </Botao>
              </div>
            </div>

            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                <ShieldCheck className="size-4 text-brand" aria-hidden />
                Boas práticas de conexão
              </span>
              <ul className="mt-1 space-y-1 text-2xs text-fg-muted">
                <li>· Valide URL, autenticação e mapeamento em modo simulação antes de ligar o modo real.</li>
                <li>· Restrinja credenciais de API por IP e por escopo, com expiração definida.</li>
                <li>· Acompanhe a taxa de sucesso e os itens com erro na aba Execuções após cada mudança.</li>
                <li>· Use webhooks com segredo para que o destino valide a origem da chamada.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* =============================================== painel de integração */}

      <PainelLateral
        aberto={painelIntegracao}
        onFechar={() => {
          setPainelIntegracao(false);
          setEmEdicao(null);
        }}
        titulo={emEdicao ? "Editar integração" : "Nova integração"}
        subtitulo={emEdicao ? emEdicao.nome + " · " + emEdicao.tipo_rotulo : "Configure a conexão com o sistema externo"}
        largura="lg"
        rodape={
          <div className="flex flex-wrap items-center gap-2">
            {emEdicao && (
              <Botao variante="perigo" icone={Trash2} onClick={() => setConfirmacao(emEdicao)}>
                Excluir
              </Botao>
            )}
            <Botao
              variante="fantasma"
              onClick={() => {
                setPainelIntegracao(false);
                setEmEdicao(null);
              }}
            >
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Check} carregando={salvarIntegracao.isPending} onClick={enviarIntegracao}>
              {emEdicao ? "Salvar integração" : "Criar integração"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Alerta tom={formulario.modo_simulacao ? "warning" : "danger"} titulo={formulario.modo_simulacao ? "Esta integração está em modo simulação" : "Esta integração está em modo real"} icone={formulario.modo_simulacao ? FlaskConical : Zap}>
            {formulario.modo_simulacao
              ? "O conector monta e registra a requisição, mas não chama o sistema externo. Nenhum dado sai ou entra de verdade."
              : "As execuções vão chamar o sistema externo e podem criar, alterar ou exportar registros. Use apenas após validar o teste de conexão."}
          </Alerta>

          <Campo rotulo="Nome" obrigatorio htmlFor="int-nome" dica="Como a conexão aparecerá nos cards e no histórico.">
            <Entrada id="int-nome" value={formulario.nome} onChange={(e) => setFormulario((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Jira da esteira de produtos" />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Tipo" obrigatorio htmlFor="int-tipo">
              <Selecao id="int-tipo" value={formulario.tipo} onChange={(e) => setFormulario((f) => ({ ...f, tipo: e.target.value }))}>
                <option value="">Selecione o tipo</option>
                {(tipos.data ? tipos.data.tipos : []).map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Direção" htmlFor="int-direcao" dica="Define a operação padrão do agendador.">
              <Selecao id="int-direcao" value={formulario.direcao} onChange={(e) => setFormulario((f) => ({ ...f, direcao: e.target.value }))}>
                {(tipos.data ? tipos.data.direcoes : []).map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <Campo rotulo="Descrição" htmlFor="int-descricao" dica="Explique o que a integração sincroniza e por quê.">
            <Entrada id="int-descricao" value={formulario.descricao} onChange={(e) => setFormulario((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex.: espelha épicos e tarefas das squads" />
          </Campo>

          <Campo rotulo="URL base" htmlFor="int-url" dica="Endereço do serviço externo, sem o caminho do recurso.">
            <Entrada id="int-url" value={formulario.url_base} onChange={(e) => setFormulario((f) => ({ ...f, url_base: e.target.value }))} placeholder="https://empresa.atlassian.net" />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Autenticação" htmlFor="int-auth">
              <Selecao id="int-auth" value={formulario.autenticacao} onChange={(e) => setFormulario((f) => ({ ...f, autenticacao: e.target.value }))}>
                {(tipos.data ? tipos.data.autenticacoes : []).map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Entidade alvo no SGP" htmlFor="int-entidade" dica="Ex.: tasks.task, portfolio.milestone, resources.timesheet.">
              <Entrada id="int-entidade" value={formulario.entidade_alvo} onChange={(e) => setFormulario((f) => ({ ...f, entidade_alvo: e.target.value }))} placeholder="tasks.task" />
            </Campo>
          </div>

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
              <KeyRound className="size-3.5 text-fg-muted" aria-hidden />
              Credenciais
            </p>
            <p className="mt-0.5 text-2xs text-fg-muted">
              Os valores são gravados de forma cifrada e nunca voltam para a tela — apenas a versão mascarada é exibida abaixo.
            </p>
            <div className="mt-2">
              <EditorChaveValor
                linhas={formulario.credenciais}
                onChange={(linhas) => setFormulario((f) => ({ ...f, credenciais: linhas }))}
                rotuloChave="Chave"
                rotuloValor="Valor"
                textoAdicionar="Adicionar credencial"
                placeholderChave="api_key"
                placeholderValor="valor secreto"
                oculto
                dica={emEdicao ? "Deixe em branco para manter as credenciais atuais. Informe apenas as que deseja substituir." : undefined}
              />
            </div>
            {emEdicao && (
              <div className="mt-2">
                <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Credenciais atuais (mascaradas)</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Object.keys(emEdicao.credenciais_mascaradas || {}).length === 0 && (
                    <span className="text-2xs text-fg-subtle">nenhuma credencial cadastrada</span>
                  )}
                  {Object.keys(emEdicao.credenciais_mascaradas || {}).map((chave) => (
                    <span key={chave} className="inline-flex items-center gap-1.5 rounded-md bg-surface-3 px-2 py-1">
                      <span className="font-mono text-2xs text-fg-muted">{chave}</span>
                      <span className="font-mono text-2xs text-fg">{emEdicao.credenciais_mascaradas[chave]}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
              <Server className="size-3.5 text-fg-muted" aria-hidden />
              Cabeçalhos adicionais
            </p>
            <div className="mt-2">
              <EditorChaveValor
                linhas={formulario.cabecalhos}
                onChange={(linhas) => setFormulario((f) => ({ ...f, cabecalhos: linhas }))}
                rotuloChave="Cabeçalho"
                rotuloValor="Valor"
                textoAdicionar="Adicionar cabeçalho"
                placeholderChave="X-Organizacao"
                placeholderValor="valor"
              />
            </div>
          </div>

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <Interruptor
              ativo={formulario.modo_simulacao}
              onChange={(v) => setFormulario((f) => ({ ...f, modo_simulacao: v }))}
              rotulo="Modo simulação"
              descricao="Ligado: monta a requisição e registra o que seria enviado, sem chamar o sistema externo. Desligado: executa de verdade."
            />
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className={cn("rounded-md border p-2 text-2xs", formulario.modo_simulacao ? "border-warning/40 bg-warning-soft/25" : "border-border bg-surface")}>
                <p className="font-semibold text-fg">Simulação</p>
                <p className="mt-0.5 text-fg-muted">Nenhum dado sai ou entra. Ideal para validar URL, autenticação e mapeamento.</p>
              </div>
              <div className={cn("rounded-md border p-2 text-2xs", !formulario.modo_simulacao ? "border-danger/40 bg-danger-soft/25" : "border-border bg-surface")}>
                <p className="font-semibold text-fg">Real</p>
                <p className="mt-0.5 text-fg-muted">Chama o sistema externo a cada execução e pode criar, alterar ou exportar registros.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Frequência (minutos)" htmlFor="int-frequencia" dica="Intervalo entre sincronizações automáticas.">
              <Entrada
                id="int-frequencia"
                type="number"
                min={5}
                value={formulario.frequencia_minutos}
                onChange={(e) => setFormulario((f) => ({ ...f, frequencia_minutos: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Responsável" htmlFor="int-responsavel" dica="Pessoa que acompanha falhas e ajustes desta conexão.">
              <Selecao id="int-responsavel" value={formulario.responsavel} onChange={(e) => setFormulario((f) => ({ ...f, responsavel: e.target.value }))}>
                <option value="">Sem responsável</option>
                {(pessoas.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <p className="text-xs font-semibold text-fg">Cor de identificação</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CORES_DISPONIVEIS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    aria-label={"Usar a cor " + cor}
                    onClick={() => setFormulario((f) => ({ ...f, cor }))}
                    className={cn(
                      "size-7 rounded-full border-2 transition-transform",
                      formulario.cor === cor ? "border-fg scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg">Ícone</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ICONES_DISPONIVEIS.map((nome) => {
                  const Icone = iconeDe(nome);
                  const ativo = formulario.icone === nome;
                  return (
                    <button
                      key={nome}
                      type="button"
                      aria-label={"Usar o ícone " + nome}
                      onClick={() => setFormulario((f) => ({ ...f, icone: nome }))}
                      className={cn(
                        "grid size-8 place-items-center rounded-sgp border transition-colors",
                        ativo ? "border-brand bg-brand-soft/40 text-brand" : "border-border bg-surface text-fg-muted hover:text-fg"
                      )}
                    >
                      <Icone className="size-4" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <Interruptor
              ativo={formulario.ativa}
              onChange={(v) => setFormulario((f) => ({ ...f, ativa: v }))}
              rotulo="Integração ativa"
              descricao="Somente integrações ativas entram no agendador automático e em Sincronizar todas as vencidas."
            />
          </div>

          {emEdicao && (
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <ListChecks className="size-3.5 text-fg-muted" aria-hidden />
                Mapeamento de campos
              </p>
              <p className="mt-0.5 text-2xs text-fg-muted">
                Relaciona cada campo do sistema externo ao campo correspondente no SGP. O campo de destino é único por integração.
              </p>

              <div className="mt-2 space-y-1.5">
                {mapeamentos.isLoading && <Esqueleto linhas={2} />}
                {mapeamentos.isError && (
                  <Alerta tom="danger" titulo="Não foi possível carregar os mapeamentos">
                    {mensagemErro(mapeamentos.error)}
                  </Alerta>
                )}
                {mapeamentos.data && mapeamentos.data.length === 0 && (
                  <p className="text-2xs text-fg-subtle">Nenhum mapeamento cadastrado para esta integração.</p>
                )}
                {(mapeamentos.data || []).map((mapeamento) => (
                  <div key={mapeamento.id} className="flex flex-wrap items-center gap-2 rounded-sgp border border-border bg-surface px-2.5 py-2">
                    <span className="font-mono text-2xs text-fg-muted">{mapeamento.campo_origem}</span>
                    <ArrowRight className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                    <span className="font-mono text-2xs font-semibold text-fg">{mapeamento.campo_destino}</span>
                    <Etiqueta tom="neutral">{mapeamento.transformacao_rotulo}</Etiqueta>
                    {mapeamento.obrigatorio && <Etiqueta tom="warning">obrigatório</Etiqueta>}
                    {mapeamento.valor_padrao && <span className="text-2xs text-fg-subtle">{"padrão: " + mapeamento.valor_padrao}</span>}
                    {Object.keys(mapeamento.traducao || {}).length > 0 && (
                      <Dica texto={JSON.stringify(mapeamento.traducao)}>
                        <span className="text-2xs text-fg-subtle">{"tradução (" + numero(Object.keys(mapeamento.traducao).length) + ")"}</span>
                      </Dica>
                    )}
                    <span className="ml-auto text-2xs text-fg-subtle">{"ordem " + numero(mapeamento.ordem)}</span>
                    {podeAdministrar && (
                      <BotaoIcone
                        icone={Trash2}
                        rotulo="Excluir mapeamento"
                        tamanho="xs"
                        onClick={() => excluirMapeamento.mutate({ id: mapeamento.id })}
                      />
                    )}
                  </div>
                ))}
              </div>

              {podeAdministrar && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Campo rotulo="Campo externo" htmlFor="map-origem">
                    <Entrada
                      id="map-origem"
                      value={novoMapeamento.campo_origem}
                      onChange={(e) => setNovoMapeamento((m) => ({ ...m, campo_origem: e.target.value }))}
                      placeholder="fields.summary"
                    />
                  </Campo>
                  <Campo rotulo="Campo no SGP" htmlFor="map-destino">
                    <Entrada
                      id="map-destino"
                      value={novoMapeamento.campo_destino}
                      onChange={(e) => setNovoMapeamento((m) => ({ ...m, campo_destino: e.target.value }))}
                      placeholder="nome"
                    />
                  </Campo>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Campo rotulo="Transformação" htmlFor="map-transformacao">
                    <Selecao
                      id="map-transformacao"
                      value={novoMapeamento.transformacao}
                      onChange={(e) => setNovoMapeamento((m) => ({ ...m, transformacao: e.target.value }))}
                    >
                      {(tipos.data ? tipos.data.transformacoes : []).map((t) => (
                        <option key={t.valor} value={t.valor}>
                          {t.rotulo}
                        </option>
                      ))}
                    </Selecao>
                  </Campo>
                  <Campo rotulo="Valor padrão" htmlFor="map-padrao">
                    <Entrada
                      id="map-padrao"
                      value={novoMapeamento.valor_padrao}
                      onChange={(e) => setNovoMapeamento((m) => ({ ...m, valor_padrao: e.target.value }))}
                      placeholder="usado quando vazio"
                    />
                  </Campo>
                  <Campo rotulo="Ordem" htmlFor="map-ordem">
                    <Entrada
                      id="map-ordem"
                      type="number"
                      min={0}
                      value={novoMapeamento.ordem}
                      onChange={(e) => setNovoMapeamento((m) => ({ ...m, ordem: e.target.value }))}
                    />
                  </Campo>
                </div>
                <Campo rotulo="Tabela de tradução (JSON)" htmlFor="map-traducao" dica="Ex.: {&quot;Done&quot;: &quot;CONCLUIDA&quot;}. Usada na transformação Traduzir valor.">
                  <Entrada
                    id="map-traducao"
                    value={novoMapeamento.traducao}
                    onChange={(e) => setNovoMapeamento((m) => ({ ...m, traducao: e.target.value }))}
                    placeholder="{&quot;Done&quot;: &quot;CONCLUIDA&quot;}"
                  />
                </Campo>
                <Interruptor
                  ativo={novoMapeamento.obrigatorio}
                  onChange={(v) => setNovoMapeamento((m) => ({ ...m, obrigatorio: v }))}
                  rotulo="Campo obrigatório"
                  descricao="Quando ligado, a importação registra erro se o campo externo vier vazio."
                  tamanho="sm"
                />
                <Botao
                  tamanho="sm"
                  variante="secundario"
                  icone={Plus}
                  carregando={criarMapeamento.isPending}
                  onClick={() => {
                    if (!novoMapeamento.campo_origem.trim() || !novoMapeamento.campo_destino.trim()) {
                      erro("Informe o campo externo e o campo no SGP");
                      return;
                    }
                    let traducao: Record<string, string> = {};
                    if (novoMapeamento.traducao.trim()) {
                      try {
                        traducao = JSON.parse(novoMapeamento.traducao) as Record<string, string>;
                      } catch {
                        erro("A tabela de tradução precisa ser um JSON válido", "Exemplo: {\u0022Done\u0022: \u0022CONCLUIDA\u0022}");
                        return;
                      }
                    }
                    criarMapeamento.mutate({
                      integracao: emEdicao.id,
                      campo_origem: novoMapeamento.campo_origem.trim(),
                      campo_destino: novoMapeamento.campo_destino.trim(),
                      transformacao: novoMapeamento.transformacao,
                      traducao,
                      valor_padrao: novoMapeamento.valor_padrao,
                      obrigatorio: novoMapeamento.obrigatorio,
                      ordem: Number(novoMapeamento.ordem || 0),
                    });
                  }}
                >
                  Adicionar mapeamento
                </Botao>
              </div>
              )}
            </div>
          )}

          {!emEdicao && (
            <Alerta tom="info" titulo="Mapeamento de campos disponível após salvar">
              Crie a integração primeiro; em seguida abra a edição para cadastrar o mapeamento entre os campos externos e os
              campos do SGP.
            </Alerta>
          )}
        </div>
      </PainelLateral>

      {/* ======================================================= modal sync */}

      <Modal
        aberto={sincronizar !== null}
        onFechar={() => setSincronizar(null)}
        titulo="Sincronizar agora"
        subtitulo={sincronizar ? sincronizar.nome + (sincronizar.modo_simulacao ? " · modo simulação" : " · modo real") : ""}
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setSincronizar(null)}>
              Cancelar
            </Botao>
            <Botao
              variante={sincronizar && !sincronizar.modo_simulacao ? "aviso" : "primario"}
              icone={Play}
              carregando={sincronizarAgora.isPending}
              onClick={() => {
                if (!sincronizar) return;
                sincronizarAgora.mutate({ id: sincronizar.id, operacao, limite: Number(limite || 200) });
              }}
            >
              Executar sincronização
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          {sincronizar && !sincronizar.modo_simulacao && (
            <Alerta tom="danger" titulo="Esta integração está em modo real">
              A execução vai chamar o sistema externo e pode criar, alterar ou exportar registros de verdade.
            </Alerta>
          )}
          <div>
            <p className="text-xs font-semibold text-fg">Operação</p>
            <div className="mt-1.5">
              <Segmentado
                valor={operacao}
                onChange={setOperacao}
                opcoes={[
                  { valor: "IMPORTAR", rotulo: "Importar", icone: ArrowLeft, titulo: "Traz dados do sistema externo para o SGP" },
                  { valor: "EXPORTAR", rotulo: "Exportar", icone: ArrowRight, titulo: "Envia dados do SGP para o sistema externo" },
                  { valor: "TESTAR", rotulo: "Testar", icone: FlaskConical, titulo: "Somente valida a conexão, sem mover itens" },
                ]}
              />
            </div>
          </div>
          <Campo rotulo="Limite de itens" htmlFor="sync-limite" dica="Quantidade máxima de registros processados nesta execução.">
            <Entrada id="sync-limite" type="number" min={1} value={limite} onChange={(e) => setLimite(e.target.value)} />
          </Campo>
        </div>
      </Modal>

      {/* ================================================= modal confirmação */}

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo="Excluir integração"
        subtitulo={confirmacao ? confirmacao.nome : ""}
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirIntegracao.isPending}
              onClick={() => {
                if (confirmacao) excluirIntegracao.mutate({ id: confirmacao.id });
              }}
            >
              Excluir definitivamente
            </Botao>
          </div>
        }
      >
        <div className="space-y-2">
          <Alerta tom="warning" titulo="A ação é definitiva" icone={TriangleAlert}>
            O histórico de execuções, os mapeamentos de campo e o agendamento desta integração são removidos junto com o
            cadastro. O último erro registrado também é perdido.
          </Alerta>
          {confirmacao && (
            <p className="text-xs text-fg-muted">
              {"Tipo: " + confirmacao.tipo_rotulo + " · " + numero(confirmacao.total_execucoes) + " execução(ões) registrada(s)."}
            </p>
          )}
        </div>
      </Modal>

      {/* ================================================ painel histórico */}

      <PainelLateral
        aberto={historicoDe !== null}
        onFechar={() => setHistoricoDe(null)}
        titulo="Histórico de execuções"
        subtitulo={historicoDe ? historicoDe.nome : ""}
        largura="lg"
        rodape={
          <Botao variante="secundario" onClick={() => setHistoricoDe(null)}>
            Fechar
          </Botao>
        }
      >
        {historico.isLoading && <CarregandoBloco rotulo="Carregando histórico..." />}
        {historico.isError && (
          <Alerta tom="danger" titulo="Não foi possível carregar o histórico">
            {mensagemErro(historico.error)}
          </Alerta>
        )}
        {historico.data && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={tomStatus(historico.data.integracao.status)} icone={iconeStatus(historico.data.integracao.status)}>
                {historico.data.integracao.status_rotulo}
              </Etiqueta>
              {historico.data.integracao.modo_simulacao ? (
                <Chip cor="#D97706" icone={FlaskConical}>simulação</Chip>
              ) : (
                <Chip cor="#DC2626" icone={Zap}>real</Chip>
              )}
              <Chip cor="#2563EB">{numero(historico.data.total) + " execução(ões)"}</Chip>
              <Chip cor="#059669">{percentual(historico.data.integracao.taxa_sucesso, 1) + " de sucesso"}</Chip>
            </div>

            {historico.data.execucoes.length === 0 ? (
              <Vazio icone={History} titulo="Nenhuma execução registrada" descricao="Execute uma sincronização para começar o histórico." />
            ) : (
              <ol className="space-y-2">
                {historico.data.execucoes.map((execucao) => (
                  <li key={execucao.id} className="rounded-sgp border border-border bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Etiqueta tom={tomExecucao(execucao.status)}>{execucao.status_rotulo}</Etiqueta>
                      <Etiqueta tom="neutral">{execucao.operacao}</Etiqueta>
                      <span className="text-2xs text-fg-muted">{dataHora(execucao.inicio)}</span>
                      <span className="ml-auto text-2xs text-fg-subtle">{duracaoTexto(execucao.duracao_ms)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-2xs text-fg-muted">
                      <span>{"lidos: " + numero(execucao.itens_lidos)}</span>
                      <span className="text-success">{"criados: " + numero(execucao.itens_criados)}</span>
                      <span>{"atualizados: " + numero(execucao.itens_atualizados)}</span>
                      <span>{"ignorados: " + numero(execucao.itens_ignorados)}</span>
                      {execucao.itens_com_erro > 0 && <span className="font-semibold text-danger">{"com erro: " + numero(execucao.itens_com_erro)}</span>}
                    </div>
                    {execucao.mensagem && <p className="mt-1 text-2xs text-fg">{execucao.mensagem}</p>}
                    <Botao
                      tamanho="xs"
                      variante="fantasma"
                      icone={ScrollText}
                      className="mt-1.5"
                      onClick={() => {
                        setExecucaoSelecionada(execucao);
                        setHistoricoDe(null);
                      }}
                    >
                      Ver detalhes
                    </Botao>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </PainelLateral>

      {/* ============================================ painel de uma execução */}

      <PainelLateral
        aberto={execucaoSelecionada !== null}
        onFechar={() => setExecucaoSelecionada(null)}
        titulo="Detalhe da execução"
        subtitulo={execucaoSelecionada ? execucaoSelecionada.integracao_nome + " · " + dataHora(execucaoSelecionada.inicio) : ""}
        largura="lg"
        rodape={
          <Botao variante="secundario" onClick={() => setExecucaoSelecionada(null)}>
            Fechar
          </Botao>
        }
      >
        {execucaoSelecionada && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={tomExecucao(execucaoSelecionada.status)}>{execucaoSelecionada.status_rotulo}</Etiqueta>
              <Etiqueta tom="neutral">{execucaoSelecionada.operacao}</Etiqueta>
              <Etiqueta tom="neutral" icone={Clock}>{duracaoTexto(execucaoSelecionada.duracao_ms)}</Etiqueta>
              <Etiqueta tom="neutral" icone={Users}>{execucaoSelecionada.disparado_por_nome || "agendador"}</Etiqueta>
            </div>

            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Mensagem</p>
              <p className="mt-1 text-xs text-fg">{execucaoSelecionada.mensagem || "Sem mensagem registrada."}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { rotulo: "Lidos", valor: execucaoSelecionada.itens_lidos },
                { rotulo: "Criados", valor: execucaoSelecionada.itens_criados },
                { rotulo: "Atualizados", valor: execucaoSelecionada.itens_atualizados },
                { rotulo: "Ignorados", valor: execucaoSelecionada.itens_ignorados },
                { rotulo: "Com erro", valor: execucaoSelecionada.itens_com_erro },
              ].map((item) => (
                <div key={item.rotulo} className="rounded-sgp border border-border bg-surface-2 p-2 text-center">
                  <p className="text-2xs text-fg-subtle">{item.rotulo}</p>
                  <p className={cn("mt-0.5 text-lg font-bold tabular-nums", item.rotulo === "Com erro" && item.valor > 0 ? "text-danger" : "text-fg")}>
                    {numero(item.valor)}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-semibold text-fg">{"Erros registrados (" + numero((execucaoSelecionada.erros || []).length) + ")"}</p>
              {(execucaoSelecionada.erros || []).length === 0 ? (
                <p className="mt-1 text-2xs text-fg-muted">Nenhum erro nesta execução.</p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {(execucaoSelecionada.erros || []).map((item, indice) => (
                    <li key={indice}>
                      <pre className="max-h-40 overflow-auto scroll-thin whitespace-pre-wrap break-words rounded-sgp border border-danger/35 bg-danger-soft/25 p-2 font-mono text-2xs text-danger">
                        {JSON.stringify(item, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-fg">Detalhes da execução</p>
              {Object.keys(execucaoSelecionada.detalhes || {}).length === 0 ? (
                <p className="mt-1 text-2xs text-fg-muted">
                  Esta execução não registrou detalhes — conectores em modo simulação preenchem este campo com as requisições
                  previstas.
                </p>
              ) : (
                <div className="mt-1.5 space-y-2">
                  {Object.keys(execucaoSelecionada.detalhes || {}).map((chave) => (
                    <DetalheValor key={chave} chave={chave} valor={execucaoSelecionada.detalhes[chave]} />
                  ))}
                </div>
              )}
            </div>

            <SecaoColapsavel titulo="Registro bruto" icone={Braces} abertoInicial={false}>
              <pre className="max-h-72 overflow-auto scroll-thin rounded-sgp bg-surface-3 p-2 font-mono text-2xs text-fg">
                {JSON.stringify(execucaoSelecionada, null, 2)}
              </pre>
            </SecaoColapsavel>
          </div>
        )}
      </PainelLateral>

      {/* ================================================= painel de webhook */}

      <PainelLateral
        aberto={painelWebhook}
        onFechar={() => setPainelWebhook(false)}
        titulo={webhookEmEdicao ? "Editar webhook" : "Novo webhook"}
        subtitulo="Endpoint que receberá os eventos selecionados"
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setPainelWebhook(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Check} carregando={salvarWebhook.isPending} onClick={enviarWebhook}>
              {webhookEmEdicao ? "Salvar webhook" : "Criar webhook"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome" obrigatorio htmlFor="wh-nome">
            <Entrada id="wh-nome" value={formWebhook.nome} onChange={(e) => setFormWebhook((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Notificações do PMO no Teams" />
          </Campo>
          <Campo rotulo="URL de destino" obrigatorio htmlFor="wh-url" dica="Endpoint HTTPS que receberá requisições POST em JSON.">
            <Entrada id="wh-url" value={formWebhook.url} onChange={(e) => setFormWebhook((f) => ({ ...f, url: e.target.value }))} placeholder="https://servico.interno/sgp/eventos" />
          </Campo>
          <Campo rotulo="Segredo de assinatura" htmlFor="wh-secreto" dica="Assina o corpo com HMAC-SHA256 no cabeçalho X-SGP-Assinatura.">
            <Entrada id="wh-secreto" value={formWebhook.secreto} onChange={(e) => setFormWebhook((f) => ({ ...f, secreto: e.target.value }))} placeholder="chave compartilhada" />
          </Campo>

          <Interruptor
            ativo={formWebhook.ativo}
            onChange={(v) => setFormWebhook((f) => ({ ...f, ativo: v }))}
            rotulo="Webhook ativo"
            descricao="Somente webhooks ativos recebem entregas."
          />

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-fg">Eventos assinados</p>
            <div className="flex items-center gap-1.5">
              <Etiqueta tom="brand">{numero(formWebhook.eventos.length) + " evento(s)"}</Etiqueta>
              <Botao
                tamanho="xs"
                variante="fantasma"
                onClick={() =>
                  setFormWebhook((f) => ({
                    ...f,
                    eventos: f.eventos.length === EVENTOS_DISPONIVEIS.length ? [] : EVENTOS_DISPONIVEIS.map((e) => e.codigo),
                  }))
                }
              >
                {formWebhook.eventos.length === EVENTOS_DISPONIVEIS.length ? "Limpar" : "Selecionar todos"}
              </Botao>
            </div>
          </div>

          <div className="space-y-1.5">
            {EVENTOS_DISPONIVEIS.map((evento) => {
              const marcado = formWebhook.eventos.indexOf(evento.codigo) >= 0;
              return (
                <label
                  key={evento.codigo}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-sgp border p-2.5 transition-colors",
                    marcado ? "border-brand/50 bg-brand-soft/20" : "border-border bg-surface-2"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-[var(--sgp-brand)]"
                    checked={marcado}
                    onChange={() =>
                      setFormWebhook((f) => ({
                        ...f,
                        eventos: marcado ? f.eventos.filter((x) => x !== evento.codigo) : f.eventos.concat([evento.codigo]),
                      }))
                    }
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-2xs text-fg">{evento.codigo}</span>
                    <span className="block text-2xs text-fg-muted">{evento.rotulo + " — " + evento.descricao}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <Alerta tom="info" titulo="Sem eventos selecionados">
            Um webhook sem eventos assinados recebe todos os eventos publicados na fila. Selecione ao menos um para restringir.
          </Alerta>
        </div>
      </PainelLateral>

      <Modal
        aberto={confirmacaoWebhook !== null}
        onFechar={() => setConfirmacaoWebhook(null)}
        titulo="Excluir webhook"
        subtitulo={confirmacaoWebhook ? confirmacaoWebhook.nome : ""}
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacaoWebhook(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirWebhook.isPending}
              onClick={() => {
                if (confirmacaoWebhook) excluirWebhook.mutate({ id: confirmacaoWebhook.id });
              }}
            >
              Excluir webhook
            </Botao>
          </div>
        }
      >
        <Alerta tom="warning" titulo="As entregas registradas também são removidas" icone={TriangleAlert}>
          O histórico de entregas deste webhook deixa de aparecer na auditoria de integrações.
        </Alerta>
      </Modal>

      {/* =============================================== painel de credencial */}

      <PainelLateral
        aberto={painelCredencial}
        onFechar={() => setPainelCredencial(false)}
        titulo={credencialEmEdicao ? "Editar credencial de API" : "Nova credencial de API"}
        subtitulo="Token com escopos limitados para consumo externo da API v1"
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setPainelCredencial(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={KeyRound} carregando={salvarCredencial.isPending} onClick={enviarCredencial}>
              {credencialEmEdicao ? "Salvar credencial" : "Gerar credencial"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome" obrigatorio htmlFor="cred-nome" dica="Identifique o sistema ou a finalidade do token.">
            <Entrada id="cred-nome" value={formCredencial.nome} onChange={(e) => setFormCredencial((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Painel executivo no Power BI" />
          </Campo>
          <Campo rotulo="IP permitido" htmlFor="cred-ip" dica="Deixe em branco para aceitar qualquer origem.">
            <Entrada id="cred-ip" value={formCredencial.ip_permitido} onChange={(e) => setFormCredencial((f) => ({ ...f, ip_permitido: e.target.value }))} placeholder="203.0.113.10" />
          </Campo>
          <Campo rotulo="Expira em" htmlFor="cred-expira" dica="Deixe em branco para uma credencial sem expiração.">
            <Entrada id="cred-expira" type="date" value={formCredencial.expira_em} onChange={(e) => setFormCredencial((f) => ({ ...f, expira_em: e.target.value }))} />
          </Campo>
          <Interruptor
            ativo={formCredencial.ativo}
            onChange={(v) => setFormCredencial((f) => ({ ...f, ativo: v }))}
            rotulo="Credencial ativa"
            descricao="Credenciais inativas deixam de autenticar imediatamente."
          />

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-fg">Escopos</p>
            <Etiqueta tom="brand">{numero(formCredencial.escopos.length) + " selecionado(s)"}</Etiqueta>
          </div>
          <div className="space-y-2">
            {Array.from(new Set(ESCOPOS.map((e) => e.recurso))).map((recurso) => (
              <div key={recurso} className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{recurso}</p>
                <div className="mt-1.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {ESCOPOS.filter((e) => e.recurso === recurso).map((escopo) => (
                    <label key={escopo.codigo} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-3">
                      <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-[var(--sgp-brand)]"
                        checked={formCredencial.escopos.indexOf(escopo.codigo) >= 0}
                        onChange={() =>
                          setFormCredencial((f) => ({
                            ...f,
                            escopos:
                              f.escopos.indexOf(escopo.codigo) >= 0
                                ? f.escopos.filter((x) => x !== escopo.codigo)
                                : f.escopos.concat([escopo.codigo]),
                          }))
                        }
                      />
                      <span className="font-mono text-2xs text-fg">{escopo.codigo}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Alerta tom="warning" titulo="Guarde o valor no momento da criação">
            O token completo é exibido na lista logo após a criação. Depois disso, apenas os primeiros e últimos caracteres
            permanecem visíveis para conferência.
          </Alerta>
        </div>
      </PainelLateral>

      <Modal
        aberto={confirmacaoCredencial !== null}
        onFechar={() => setConfirmacaoCredencial(null)}
        titulo="Revogar credencial"
        subtitulo={confirmacaoCredencial ? confirmacaoCredencial.nome : ""}
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacaoCredencial(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirCredencial.isPending}
              onClick={() => {
                if (confirmacaoCredencial) excluirCredencial.mutate({ id: confirmacaoCredencial.id });
              }}
            >
              Revogar credencial
            </Botao>
          </div>
        }
      >
        <Alerta tom="warning" titulo="O acesso é interrompido imediatamente" icone={TriangleAlert}>
          Integrações que usam esta credencial passam a receber 401 e deixam de sincronizar até receberem um novo token.
        </Alerta>
      </Modal>
    </div>
  );
}

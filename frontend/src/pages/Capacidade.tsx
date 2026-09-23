/* ==========================================================================
   Planejamento de capacidade do portfólio — RF-80 a RF-84 (UC-09)
   Abas: Demanda × Oferta, Skills críticas (bus factor), Ocupação da equipe e
   Exceções semanais (/capacidade-semanal/).
   ========================================================================== */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  CalendarClock,
  CalendarOff,
  CalendarRange,
  Clock,
  FileText,
  Flame,
  Gauge,
  Layers,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  Repeat,
  Save,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Abas,
  Alerta,
  AreaTexto,
  Avatar,
  BarraFerramentas,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Cartao,
  Chip,
  ControleDeslizante,
  Entrada,
  EntradaBusca,
  Esqueleto,
  Etiqueta,
  Modal,
  PainelLateral,
  SecaoColapsavel,
  Selecao,
  Tabela,
  Vazio,
  useAvisos,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import { EscalaCores, GraficoLinha, Heatmap, type CelulaHeatmap } from "@/components/charts";
import { FiltroSelect, GradeCards, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { ajustarCor, cn, media, soma } from "@/lib/utils";
import { dataCurta, horas, hojeISO, mesCurto, numero, percentual, somarDias } from "@/lib/format";
import type { CelulaForecast, LinhaForecast, Usuario } from "@/lib/types";

/* ==========================================================================
   Tipos das respostas
   ========================================================================== */

interface RespostaForecast {
  meses: string[];
  linhas: LinhaForecast[];
  resumo: { skills_em_escassez: number; skills_ociosas: number; maior_gap: string | null; gerado_em?: string };
}

interface AlertaBusFactor {
  skill_id: number;
  skill: string;
  cor: string;
  icone: string;
  criticidade: string;
  quantidade_detentores: number;
  total_projetos_dependentes: number;
  recomendacao: string;
  acoes_sugeridas: Array<{ tipo: string; rotulo: string; icone: string; cor: string; detalhe: string }>;
  detentores: Array<{ user_id: number; nome: string; nivel: number; cor: string }>;
}

interface RespostaBusFactor {
  alertas: AlertaBusFactor[];
  resumo: { total: number; sem_detentor: number; um_detentor: number };
}

interface CelulaOcupacao {
  semana: string;
  valor: number;
  projetos: string[];
}

interface LinhaOcupacao {
  user_id: number;
  nome: string;
  cor: string;
  iniciais: string;
  area: string;
  celulas: CelulaOcupacao[];
  media: number;
}

interface RespostaOcupacao {
  semanas: Array<{ semana: string; rotulo: string }>;
  linhas: LinhaOcupacao[];
}

type AbaCapacidade = "demanda" | "skills" | "ocupacao" | "excecoes";

/** Exceção semanal de capacidade (/capacidade-semanal/). */
interface ExcecaoCapacidade {
  id: number;
  user: number;
  user_nome: string;
  semana_inicio: string;
  horas_disponiveis: string | number;
  motivo: string;
  observacao: string;
}

interface FormularioExcecao {
  user: string;
  semana_inicio: string;
  horas_disponiveis: string;
  motivo: string;
  observacao: string;
}

const MOTIVOS_EXCECAO = [
  "Férias",
  "Afastamento",
  "Licença",
  "Hora extra",
  "Folga compensatória",
  "Treinamento",
];

const FORMULARIO_EXCECAO_VAZIO: FormularioExcecao = {
  user: "",
  semana_inicio: "",
  horas_disponiveis: "40",
  motivo: "",
  observacao: "",
};

/** Segunda-feira da semana da data informada: é a chave que o servidor usa. */
function segundaDaSemana(iso: string): string {
  if (!iso) return "";
  const data = new Date(iso.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(data.getTime())) return "";
  const dia = data.getDay();
  return somarDias(iso.slice(0, 10), dia === 0 ? -6 : 1 - dia);
}

/** Sexta-feira da mesma semana: o cálculo do servidor considera segunda a sexta. */
function sextaDaSemana(iso: string): string {
  return iso ? somarDias(iso.slice(0, 10), 4) : "";
}

/* ==========================================================================
   Metadados
   ========================================================================== */

const ICONES_ACAO: Record<string, LucideIcon> = {
  users: Users,
  "file-text": FileText,
  repeat: Repeat,
  "user-plus": UserPlus,
  "shield-alert": ShieldAlert,
  "alert-triangle": AlertTriangle,
  "trending-up": TrendingUp,
  target: Target,
  sparkles: Sparkles,
};

const CRITICIDADE_TOM: Record<string, Tom> = {
  BAIXA: "neutral",
  MEDIA: "info",
  ALTA: "warning",
  ESTRATEGICA: "danger",
};

const PALETA_SERIES = ["#2563EB", "#F59E0B", "#8B5CF6", "#059669", "#DC2626"];

function iconeAcao(nome: string): LucideIcon {
  return ICONES_ACAO[nome] ?? Sparkles;
}

function corGap(gap: number, maximoAbsoluto: number): string {
  if (gap > 1) {
    const intensidade = Math.min(1, gap / Math.max(1, maximoAbsoluto));
    return ajustarCor("#DC2626", intensidade * 0.18);
  }
  if (gap < -1) {
    const intensidade = Math.min(1, Math.abs(gap) / Math.max(1, maximoAbsoluto));
    return ajustarCor("#2563EB", intensidade * 0.18);
  }
  return "#059669";
}

const FAIXA_ESCASSEZ = 4.5;
const FAIXA_EQUILIBRIO = 3.5;
const FAIXA_OCIOSIDADE = 2.5;

/** Codifica o gap em faixas legíveis dentro do heatmap (símbolo + intensidade de cor). */
function faixaGap(gap: number): number {
  if (gap > 1) return FAIXA_ESCASSEZ;
  if (gap < -1) return FAIXA_OCIOSIDADE;
  return FAIXA_EQUILIBRIO;
}

function simboloFaixa(valor: number): string {
  if (valor === FAIXA_ESCASSEZ) return "▲";
  if (valor === FAIXA_OCIOSIDADE) return "▼";
  return "=";
}

function situacaoTom(situacao: string): Tom {
  if (situacao === "ESCASSEZ") return "danger";
  if (situacao === "OCIOSIDADE") return "info";
  return "success";
}

function corOcupacaoSemana(valor: number): string {
  if (valor > 100) return "#DC2626";
  if (valor >= 85) return "#D97706";
  if (valor > 0) return "#2563EB";
  return "var(--sgp-surface-2)";
}

/* ==========================================================================
   Grafo skill × detentores × projetos
   ========================================================================== */

function GrafoBusFactor({ alerta }: { alerta: AlertaBusFactor }) {
  const largura = 760;
  const altura = 400;
  const centroX = 250;
  const centroY = altura / 2;
  const raio = 132;
  const detentores = alerta.detentores;
  const total = detentores.length;

  const nos = detentores.map((d, i) => {
    const angulo = (Math.PI * 2 * i) / Math.max(1, total) - Math.PI / 2;
    return {
      ...d,
      x: centroX + raio * Math.cos(angulo),
      y: centroY + raio * Math.sin(angulo),
      rotulo: d.nome.length > 18 ? d.nome.slice(0, 17) + "…" : d.nome,
      iniciais: (d.nome.trim().split(/\s+/)[0] || "?").slice(0, 1) + (d.nome.trim().split(/\s+/)[1] || "").slice(0, 1),
    };
  });

  const projetosX = 590;
  const projetosY = centroY;
  const nomeSkill = alerta.skill.length > 16 ? alerta.skill.slice(0, 15) + "…" : alerta.skill;

  return (
    <svg
      viewBox={"0 0 " + largura + " " + altura}
      className="w-full"
      role="img"
      aria-label={"Grafo de dependência da capacidade " + alerta.skill}
    >
      <line x1={centroX} y1={centroY} x2={projetosX} y2={projetosY} stroke="#DC2626" strokeWidth={2} strokeDasharray="6 5" />
      {nos.map((n) => (
        <line key={"linha-" + n.user_id} x1={centroX} y1={centroY} x2={n.x} y2={n.y} stroke={n.cor} strokeWidth={1.6} opacity={0.65} />
      ))}

      <circle cx={centroX} cy={centroY} r={46} fill={alerta.cor + "26"} stroke={alerta.cor} strokeWidth={2.5} />
      <text x={centroX} y={centroY - 6} textAnchor="middle" className="fill-fg text-[11px] font-bold">
        {nomeSkill}
      </text>
      <text x={centroX} y={centroY + 10} textAnchor="middle" className="fill-fg-muted text-[9px]">
        {"N" + numero(total) + " detentores"}
      </text>
      <title>{alerta.skill + " · criticidade " + alerta.criticidade}</title>

      {nos.map((n) => (
        <g key={"no-" + n.user_id}>
          <circle cx={n.x} cy={n.y} r={26} fill={n.cor} stroke="var(--sgp-surface)" strokeWidth={2} />
          <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-white text-[11px] font-bold">
            {n.iniciais.toUpperCase()}
          </text>
          <text x={n.x} y={n.y + 42} textAnchor="middle" className="fill-fg-muted text-[9px]">
            {n.rotulo}
          </text>
          <text x={n.x} y={n.y + 54} textAnchor="middle" className="fill-fg-subtle text-[9px]">
            {"nível N" + numero(n.nivel)}
          </text>
        </g>
      ))}

      {total === 0 && (
        <g>
          <circle cx={centroX - raio} cy={centroY} r={26} fill="#DC2626" stroke="var(--sgp-surface)" strokeWidth={2} />
          <text x={centroX - raio} y={centroY + 4} textAnchor="middle" className="fill-white text-[11px] font-bold">
            !
          </text>
          <text x={centroX - raio} y={centroY + 42} textAnchor="middle" className="fill-danger text-[9px] font-semibold">
            sem detentor N4+
          </text>
        </g>
      )}

      <circle cx={projetosX} cy={projetosY} r={44} fill="#DC262622" stroke="#DC2626" strokeWidth={2} />
      <text x={projetosX} y={projetosY - 4} textAnchor="middle" className="fill-fg text-[16px] font-bold">
        {numero(alerta.total_projetos_dependentes)}
      </text>
      <text x={projetosX} y={projetosY + 12} textAnchor="middle" className="fill-fg-muted text-[9px]">
        projeto(s)
      </text>
      <text x={projetosX} y={projetosY + 26} textAnchor="middle" className="fill-fg-subtle text-[9px]">
        dependentes
      </text>
    </svg>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Capacidade() {
  const navegar = useNavigate();
  const { sucesso, erro } = useAvisos();
  const { pode } = useAuth();

  const [aba, setAba] = useState<AbaCapacidade>("demanda");
  const [meses, setMeses] = useState(9);
  const [celula, setCelula] = useState<{ linha: LinhaForecast; celula: CelulaForecast } | null>(null);
  const [alertaSelecionado, setAlertaSelecionado] = useState<number | null>(null);
  const [celulaOcupacao, setCelulaOcupacao] = useState<{ linha: LinhaOcupacao; semana: string } | null>(null);

  /* --------------------- Exceções semanais de capacidade ------------------- */

  // Ler as exceções exige recurso.ver e escrever exige alocacao.editar: a aba e
  // os botões seguem exatamente as alçadas do CapacidadeSemanalViewSet.
  const podeLerExcecoes = pode("recurso.ver");
  const podeEditarExcecoes = pode("alocacao.editar");

  const [pessoaExcecao, setPessoaExcecao] = useState("");
  const [periodoDe, setPeriodoDe] = useState(somarDias(hojeISO(), -28));
  const [periodoAte, setPeriodoAte] = useState(somarDias(hojeISO(), 56));
  const [buscaExcecao, setBuscaExcecao] = useState("");
  const [painelExcecao, setPainelExcecao] = useState(false);
  const [editandoExcecao, setEditandoExcecao] = useState<ExcecaoCapacidade | null>(null);
  const [confirmacaoExcecao, setConfirmacaoExcecao] = useState<ExcecaoCapacidade | null>(null);
  const [formularioExcecao, setFormularioExcecao] = useState<FormularioExcecao>(FORMULARIO_EXCECAO_VAZIO);

  /* ------------------------------- Consultas ------------------------------ */

  const forecast = useConsulta<RespostaForecast>(CHAVES.forecast, "/capacidades/forecast/", {
    meses,
    salvar: 0,
  });
  const busFactor = useConsulta<RespostaBusFactor>(CHAVES.busFactor, "/capacidades/bus-factor-detect/", {
    salvar: 0,
  });
  const ocupacao = useConsulta<RespostaOcupacao>(CHAVES.ocupacao, "/alocacoes/mapa-ocupacao/");
  const pessoas = useLista<Usuario>(CHAVES.usuarios, podeLerExcecoes ? "/usuarios/" : null, {
    ativo: "true",
    page_size: 500,
  });
  const excecoes = useLista<ExcecaoCapacidade>(
    ["capacidade-semanal"],
    podeLerExcecoes ? "/capacidade-semanal/" : null,
    { page_size: 500 }
  );

  /* --------------------- Persistência (GET com salvar=1) ------------------- */

  const [salvandoPrevisao, setSalvandoPrevisao] = useState(false);
  const [salvandoAlertas, setSalvandoAlertas] = useState(false);

  async function salvarPrevisao() {
    setSalvandoPrevisao(true);
    try {
      await api.get<RespostaForecast>("/capacidades/forecast/", { meses, salvar: 1 });
      await forecast.refetch();
      sucesso("Previsão de demanda salva", "Os valores projetados ficaram registrados para consulta histórica.");
    } catch (e) {
      erro("Não foi possível salvar a previsão", mensagemErro(e));
    } finally {
      setSalvandoPrevisao(false);
    }
  }

  async function salvarAlertas() {
    setSalvandoAlertas(true);
    try {
      await api.get<RespostaBusFactor>("/capacidades/bus-factor-detect/", { salvar: 1 });
      await busFactor.refetch();
      sucesso("Alertas de bus factor persistidos", "Os riscos detectados ficaram disponíveis para acompanhamento.");
    } catch (e) {
      erro("Não foi possível persistir os alertas", mensagemErro(e));
    } finally {
      setSalvandoAlertas(false);
    }
  }
  /* --------------------- Exceções: escrita e derivados -------------------- */

  const criarExcecao = useMutacao<Record<string, unknown>, ExcecaoCapacidade>({
    url: "/capacidade-semanal/",
    invalidar: [["capacidade-semanal"]],
    mensagemSucesso: "Exceção de capacidade criada",
    aoSucesso: () => {
      setPainelExcecao(false);
      setEditandoExcecao(null);
    },
  });

  const editarExcecao = useMutacao<Record<string, unknown>, ExcecaoCapacidade>({
    metodo: "patch",
    url: (v) => "/capacidade-semanal/" + String(v.id) + "/",
    invalidar: [["capacidade-semanal"]],
    mensagemSucesso: "Exceção de capacidade atualizada",
    aoSucesso: () => {
      setPainelExcecao(false);
      setEditandoExcecao(null);
    },
  });

  const excluirExcecao = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/capacidade-semanal/" + v.id + "/",
    invalidar: [["capacidade-semanal"]],
    mensagemSucesso: "Exceção de capacidade excluída",
    aoSucesso: () => setConfirmacaoExcecao(null),
  });

  const listaExcecoes = excecoes.data ?? [];

  const mapaPessoas = useMemo(() => {
    const mapa = new Map<number, Usuario>();
    (pessoas.data || []).forEach((p) => mapa.set(p.id, p));
    return mapa;
  }, [pessoas.data]);

  function padraoPessoa(userId: number): number {
    const pessoa = mapaPessoas.get(userId);
    const valor = pessoa ? Number(pessoa.capacidade_semanal_horas) : NaN;
    return Number.isFinite(valor) && valor > 0 ? valor : 40;
  }

  // O ViewSet declara filtros exatos por user e semana_inicio; o recorte por
  // período é aplicado aqui, sobre a lista carregada.
  const excecoesFiltradas = useMemo(() => {
    const termo = buscaExcecao.trim().toLowerCase();
    return listaExcecoes
      .filter((e) => {
        const semana = (e.semana_inicio || "").slice(0, 10);
        if (periodoDe && semana < periodoDe) return false;
        if (periodoAte && semana > periodoAte) return false;
        if (!termo) return true;
        const pessoa = mapaPessoas.get(e.user);
        const alvo = [e.user_nome, e.motivo, e.observacao, pessoa ? pessoa.area : ""].join(" ").toLowerCase();
        return alvo.indexOf(termo) >= 0;
      })
      .sort((a, b) => (a.semana_inicio < b.semana_inicio ? 1 : a.semana_inicio > b.semana_inicio ? -1 : 0));
  }, [listaExcecoes, periodoDe, periodoAte, buscaExcecao, mapaPessoas]);

  const estatisticasExcecoes = useMemo(() => {
    let zeradas = 0;
    let extras = 0;
    let reduzidas = 0;
    excecoesFiltradas.forEach((e) => {
      const valor = Number(e.horas_disponiveis);
      const padrao = padraoPessoa(e.user);
      if (valor === 0) zeradas += 1;
      else if (valor > padrao) extras += 1;
      else if (valor < padrao) reduzidas += 1;
    });
    return {
      total: excecoesFiltradas.length,
      pessoas: new Set(excecoesFiltradas.map((e) => e.user)).size,
      zeradas,
      extras,
      reduzidas,
      horas: soma(excecoesFiltradas.map((e) => Number(e.horas_disponiveis))),
    };
  }, [excecoesFiltradas, mapaPessoas]);

  const pessoaEmEdicao = formularioExcecao.user ? mapaPessoas.get(Number(formularioExcecao.user)) : undefined;
  const padraoEmEdicao = pessoaEmEdicao ? padraoPessoa(pessoaEmEdicao.id) : 0;
  const semanaEmEdicao = segundaDaSemana(formularioExcecao.semana_inicio);
  const horasEmEdicao = Number(formularioExcecao.horas_disponiveis);
  const diferencaEmEdicao =
    Number.isFinite(horasEmEdicao) && pessoaEmEdicao ? horasEmEdicao - padraoEmEdicao : 0;

  function abrirNovaExcecao() {
    const pessoaEscolhida = pessoaExcecao;
    setEditandoExcecao(null);
    setFormularioExcecao({
      user: pessoaEscolhida,
      semana_inicio: segundaDaSemana(hojeISO()),
      horas_disponiveis: pessoaEscolhida ? String(padraoPessoa(Number(pessoaEscolhida))) : "40",
      motivo: "",
      observacao: "",
    });
    setPainelExcecao(true);
  }

  function abrirEdicaoExcecao(excecao: ExcecaoCapacidade) {
    setEditandoExcecao(excecao);
    setFormularioExcecao({
      user: String(excecao.user),
      semana_inicio: (excecao.semana_inicio || "").slice(0, 10),
      horas_disponiveis: String(Number(excecao.horas_disponiveis)),
      motivo: excecao.motivo || "",
      observacao: excecao.observacao || "",
    });
    setPainelExcecao(true);
  }

  function enviarExcecao() {
    const pessoaId = Number(formularioExcecao.user);
    if (!pessoaId) {
      erro("Selecione a pessoa da exceção", "A exceção de capacidade vale para uma pessoa em uma semana.");
      return;
    }
    const semana = segundaDaSemana(formularioExcecao.semana_inicio);
    if (!semana) {
      erro("Informe a semana da exceção", "Escolha qualquer dia da semana que receberá o ajuste.");
      return;
    }
    const horasInformadas = Number(formularioExcecao.horas_disponiveis);
    if (!Number.isFinite(horasInformadas) || horasInformadas < 0 || horasInformadas > 999) {
      erro("Horas inválidas", "Informe um valor entre 0 e 999 horas para a semana.");
      return;
    }
    const duplicada = listaExcecoes.find(
      (e) =>
        e.user === pessoaId &&
        (e.semana_inicio || "").slice(0, 10) === semana &&
        (!editandoExcecao || e.id !== editandoExcecao.id)
    );
    if (duplicada) {
      erro(
        "Já existe exceção nessa semana",
        "Edite o registro de " + dataCurta(semana) + " em vez de criar um segundo para a mesma pessoa."
      );
      return;
    }
    const corpo: Record<string, unknown> = {
      user: pessoaId,
      semana_inicio: semana,
      horas_disponiveis: horasInformadas,
      motivo: formularioExcecao.motivo.trim(),
      observacao: formularioExcecao.observacao.trim(),
    };
    if (editandoExcecao) editarExcecao.mutate({ ...corpo, id: editandoExcecao.id });
    else criarExcecao.mutate(corpo);
  }

  const colunasExcecoes: Array<ColunaTabela<ExcecaoCapacidade>> = [
    {
      chave: "pessoa",
      titulo: "Pessoa",
      largura: "230px",
      ordenavel: true,
      valorOrdenacao: (e) => e.user_nome || "",
      renderizar: (e) => {
        const pessoa = mapaPessoas.get(e.user);
        return (
          <div className="flex items-center gap-2">
            <Avatar
              nome={e.user_nome}
              cor={pessoa ? pessoa.cor : "#2563EB"}
              iniciais={pessoa ? pessoa.iniciais : undefined}
              tamanho="sm"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-fg">{e.user_nome}</p>
              <p className="truncate text-2xs text-fg-subtle">{pessoa && pessoa.area ? pessoa.area : "Sem área"}</p>
            </div>
          </div>
        );
      },
    },
    {
      chave: "semana",
      titulo: "Semana",
      largura: "170px",
      ordenavel: true,
      valorOrdenacao: (e) => e.semana_inicio || "",
      renderizar: (e) => (
        <div>
          <p className="text-xs font-medium tabular-nums text-fg">
            {dataCurta(e.semana_inicio) + " – " + dataCurta(sextaDaSemana(e.semana_inicio))}
          </p>
          <p className="text-2xs text-fg-subtle">segunda a sexta</p>
        </div>
      ),
    },
    {
      chave: "horas",
      titulo: "Horas na semana",
      largura: "200px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (e) => Number(e.horas_disponiveis),
      renderizar: (e) => {
        const valor = Number(e.horas_disponiveis);
        const padrao = padraoPessoa(e.user);
        const zerada = valor === 0;
        const extra = valor > padrao;
        return (
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn("text-xs font-semibold tabular-nums", !zerada && !extra && "text-fg")}
              style={zerada ? { color: "#DC2626" } : extra ? { color: "#D97706" } : undefined}
            >
              {horas(valor)}
            </span>
            {zerada ? (
              <Etiqueta tom="danger" icone={CalendarOff}>
                semana zerada
              </Etiqueta>
            ) : extra ? (
              <Etiqueta tom="warning" icone={Flame}>
                hora extra
              </Etiqueta>
            ) : valor < padrao ? (
              <Etiqueta tom="info">abaixo do padrão</Etiqueta>
            ) : (
              <Etiqueta tom="neutral">padrão</Etiqueta>
            )}
          </div>
        );
      },
    },
    {
      chave: "padrao",
      titulo: "Padrão",
      largura: "100px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (e) => padraoPessoa(e.user),
      renderizar: (e) => (
        <span className="text-2xs tabular-nums text-fg-muted">{horas(padraoPessoa(e.user))}</span>
      ),
    },
    {
      chave: "motivo",
      titulo: "Motivo",
      largura: "160px",
      renderizar: (e) =>
        e.motivo ? (
          <Etiqueta tom="brand">{e.motivo}</Etiqueta>
        ) : (
          <span className="text-2xs text-fg-subtle">não informado</span>
        ),
    },
    {
      chave: "observacao",
      titulo: "Observação",
      renderizar: (e) => <span className="text-2xs text-fg-muted">{e.observacao || "—"}</span>,
    },
  ];

  if (podeEditarExcecoes) {
    colunasExcecoes.push({
      chave: "acoes",
      titulo: "Ações",
      largura: "92px",
      alinhar: "right",
      renderizar: (e) => (
        <div className="flex items-center justify-end gap-1">
          <BotaoIcone
            icone={Pencil}
            rotulo={"Editar exceção de " + e.user_nome + " na semana de " + dataCurta(e.semana_inicio)}
            tamanho="xs"
            onClick={() => abrirEdicaoExcecao(e)}
          />
          <BotaoIcone
            icone={Trash2}
            rotulo={"Excluir exceção de " + e.user_nome + " na semana de " + dataCurta(e.semana_inicio)}
            variante="perigo"
            tamanho="xs"
            onClick={() => setConfirmacaoExcecao(e)}
          />
        </div>
      ),
    });
  }

  /* -------------------------------- Derivados ----------------------------- */

  const linhasForecast = forecast.data?.linhas ?? [];
  const mesesForecast = forecast.data?.meses ?? [];
  const alertas = busFactor.data?.alertas ?? [];
  const linhasOcupacao = ocupacao.data?.linhas ?? [];
  const semanas = ocupacao.data?.semanas ?? [];

  const maximoGap = useMemo(() => {
    const valores = linhasForecast.flatMap((l) => l.celulas.map((c) => Math.abs(c.gap)));
    return valores.length ? Math.max.apply(null, valores) : 1;
  }, [linhasForecast]);

  const criticas = useMemo(
    () => [...linhasForecast].sort((a, b) => b.gap_total - a.gap_total).slice(0, 4),
    [linhasForecast]
  );

  const estatisticasOcupacao = useMemo(() => {
    const sobrealocados = linhasOcupacao.filter((l) => l.celulas.some((c) => c.valor > 100));
    const ociosos = linhasOcupacao.filter((l) => l.media === 0);
    const celulasCriticas = soma(linhasOcupacao.map((l) => l.celulas.filter((c) => c.valor > 100).length));
    return {
      pessoas: linhasOcupacao.length,
      utilizacao: media(linhasOcupacao.map((l) => l.media)),
      sobrealocados: sobrealocados.length,
      ociosos: ociosos.length,
      celulasCriticas,
      mediaSemanal: semanas.length,
    };
  }, [linhasOcupacao, semanas]);

  const alertaAtivo = useMemo(() => {
    if (!alertas.length) return null;
    const encontrado = alertas.find((a) => a.skill_id === alertaSelecionado);
    return encontrado ?? alertas[0];
  }, [alertas, alertaSelecionado]);

  /* --------------------------------- Ações -------------------------------- */

  const abasCapacidade: Array<{ valor: AbaCapacidade; rotulo: string; icone: LucideIcon; contagem?: number }> = [
    { valor: "demanda", rotulo: "Demanda × Oferta", icone: BarChart3 },
    { valor: "skills", rotulo: "Skills críticas", icone: ShieldAlert, contagem: alertas.length },
    { valor: "ocupacao", rotulo: "Ocupação", icone: Users, contagem: linhasOcupacao.length },
  ];
  // Sem recurso.ver o servidor recusa a leitura de /capacidade-semanal/: a aba
  // só aparece para quem consegue carregá-la.
  if (podeLerExcecoes) {
    abasCapacidade.push({
      valor: "excecoes",
      rotulo: "Exceções semanais",
      icone: CalendarClock,
      contagem: listaExcecoes.length,
    });
  }

  const celulaOcupacaoSelecionada = celulaOcupacao
    ? celulaOcupacao.linha.celulas.find((c) => c.semana === celulaOcupacao.semana) ?? null
    : null;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Planejamento de capacidade"
        subtitulo="Demanda × oferta de capacidades, riscos de bus factor, ocupação semanal e exceções de capacidade."
        icone={Gauge}
        cor="#0891B2"
        acoes={
          <>
            <Botao
              variante="secundario"
              icone={RefreshCw}
              carregando={
                forecast.isFetching || busFactor.isFetching || ocupacao.isFetching || excecoes.isFetching
              }
              onClick={() => {
                forecast.refetch();
                busFactor.refetch();
                ocupacao.refetch();
                if (podeLerExcecoes) excecoes.refetch();
              }}
            >
              Atualizar
            </Botao>
            <Botao variante="primario" icone={Target} onClick={() => navegar("/gap")}>
              Ver análise de gap
            </Botao>
          </>
        }
      />

      <Abas valor={aba} onChange={setAba} abas={abasCapacidade} />

      {aba === "demanda" && (
        <div className="space-y-4">
          {forecast.isError && (
            <Alerta tom="danger" titulo="Não foi possível projetar a demanda">
              {mensagemErro(forecast.error)}
            </Alerta>
          )}

          <LinhaKPI
            itens={[
              {
                rotulo: "Skills em escassez",
                valor: numero(forecast.data?.resumo.skills_em_escassez ?? 0),
                icone: TrendingUp,
                cor: "#DC2626",
                subrotulo: "gap positivo acumulado",
              },
              {
                rotulo: "Skills ociosas",
                valor: numero(forecast.data?.resumo.skills_ociosas ?? 0),
                icone: TrendingDown,
                cor: "#2563EB",
                subrotulo: "oferta acima da demanda",
              },
              {
                rotulo: "Maior gap",
                valor: forecast.data?.resumo.maior_gap ?? "—",
                icone: Flame,
                cor: "#F59E0B",
                subrotulo: "capacidade mais crítica",
              },
              { rotulo: "Skills analisadas", valor: numero(linhasForecast.length), icone: Layers, cor: "#8B5CF6" },
              { rotulo: "Horizonte", valor: numero(mesesForecast.length) + " meses", icone: BarChart3, cor: "#0891B2" },
              { rotulo: "Pico de demanda", valor: numero(linhasForecast.reduce((acc, l) => Math.max(acc, l.pico_demanda), 0), 1), icone: Activity, cor: "#059669" },
            ]}
          />

          <Cartao
            titulo="Heatmap de gap por capacidade"
            subtitulo="Vermelho indica escassez, azul ociosidade e verde equilíbrio entre demanda e oferta"
            icone={Layers}
            corIcone="#DC2626"
            acao={
              <Botao
                variante="secundario"
                tamanho="sm"
                icone={Sparkles}
                carregando={salvandoPrevisao}
                onClick={salvarPrevisao}
              >
                Salvar previsão
              </Botao>
            }
          >
            <div className="mb-3 flex flex-wrap items-end gap-4">
              <div className="w-64">
                <ControleDeslizante
                  valor={meses}
                  onChange={setMeses}
                  min={3}
                  max={18}
                  rotulo="Horizonte de análise"
                  sufixo=" meses"
                  marcos={[3, 6, 9, 12]}
                />
              </div>
              <EscalaCores
                titulo="Gap (demanda − oferta)"
                rotulos={["▲ escassez", "= equilíbrio", "▼ ociosidade"]}
                cores={["#DC2626", "#059669", "#2563EB"]}
              />
              <span className="text-2xs text-fg-subtle">
                A intensidade da cor acompanha o tamanho do gap; passe o mouse ou clique para ver os valores em FTE.
              </span>
            </div>

            {forecast.isLoading ? (
              <CarregandoBloco rotulo="Projetando demanda e oferta..." />
            ) : linhasForecast.length === 0 ? (
              <Vazio
                icone={Brain}
                titulo="Sem dados de demanda"
                descricao="Cadastre requisitos de capacidade nos projetos ativos para projetar a demanda futura."
                acao={
                  <Botao variante="primario" icone={Target} onClick={() => navegar("/gap")}>
                    Definir requisitos
                  </Botao>
                }
              />
            ) : (
              <Heatmap
                linhas={linhasForecast.map((l) => ({
                  id: l.skill_id,
                  rotulo: l.skill,
                  sub: l.categoria || "Sem categoria",
                  cor: l.cor,
                }))}
                colunas={mesesForecast.map((m) => ({ id: m, rotulo: mesCurto(m) }))}
                celulas={(linhaId, colunaId): CelulaHeatmap => {
                  const linha = linhasForecast.find((l) => String(l.skill_id) === String(linhaId));
                  const alvo = linha?.celulas.find((c) => c.periodo === colunaId);
                  const gap = alvo?.gap ?? 0;
                  return {
                    valor: faixaGap(gap),
                    rotulo: (gap > 0 ? "+" : "") + numero(gap, 1) + " FTE",
                    cor: corGap(gap, maximoGap),
                    detalhe: alvo ? (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-fg">
                          {linha?.skill + " · " + mesCurto(alvo.periodo)}
                        </p>
                        <p className="text-fg-muted">{"Demanda: " + numero(alvo.demanda, 2) + " FTE"}</p>
                        <p className="text-fg-muted">{"Oferta: " + numero(alvo.oferta, 2) + " FTE"}</p>
                        <p className="font-medium" style={{ color: corGap(gap, maximoGap) }}>
                          {"Gap: " + (gap > 0 ? "+" : "") + numero(gap, 2) + " FTE"}
                        </p>
                      </div>
                    ) : undefined,
                  };
                }}
                maximo={5}
                larguraColuna={54}
                larguraLinha={230}
                formatoValor={(v) => simboloFaixa(v)}
                corDe={(v) => (v === FAIXA_ESCASSEZ ? "#DC2626" : v === FAIXA_OCIOSIDADE ? "#2563EB" : "#059669")}
                aoClicarCelula={(linhaId, colunaId) => {
                  const linha = linhasForecast.find((l) => String(l.skill_id) === String(linhaId));
                  const alvo = linha?.celulas.find((c) => c.periodo === colunaId);
                  if (linha && alvo) setCelula({ linha, celula: alvo });
                }}
                compacto
              />
            )}
          </Cartao>

          {criticas.length > 0 && (
            <Cartao
              titulo="Projeção das capacidades mais críticas"
              subtitulo="Linhas cheias representam demanda; tracejadas, a oferta disponível"
              icone={TrendingUp}
              corIcone="#8B5CF6"
            >
              <GraficoLinha
                rotulos={mesesForecast.map((m) => mesCurto(m))}
                series={criticas.flatMap((l, i) => {
                  const cor = l.cor || PALETA_SERIES[i % PALETA_SERIES.length];
                  return [
                    { nome: l.skill + " · demanda", cor, dados: l.celulas.map((c) => c.demanda) },
                    {
                      nome: l.skill + " · oferta",
                      cor: ajustarCor(cor, 0.28),
                      dados: l.celulas.map((c) => c.oferta),
                      tracejada: true,
                    },
                  ];
                })}
                altura={280}
                formatarValor={(v) => numero(v, 1) + " FTE"}
                mostrarLegenda
                mostrarArea={false}
              />
            </Cartao>
          )}

          <GradeCards colunas={3}>
            <Cartao titulo="Resumo da projeção" subtitulo="Leitura rápida do portfólio" icone={Brain} corIcone="#0891B2">
              <div className="space-y-2">
                <Alerta tom="danger" titulo={numero(forecast.data?.resumo.skills_em_escassez ?? 0) + " skill(s) em escassez"} icone={Flame}>
                  A demanda projetada supera a oferta interna. Priorize contratação, mentoria ou redistribuição de escopo.
                </Alerta>
                <Alerta tom="info" titulo={numero(forecast.data?.resumo.skills_ociosas ?? 0) + " skill(s) ociosas"} icone={Snowflake}>
                  Há capacidade disponível acima da demanda: boa oportunidade para realocar pessoas e desenvolver novas skills.
                </Alerta>
                {forecast.data?.resumo.maior_gap && (
                  <Alerta tom="warning" titulo={"Maior gap: " + forecast.data.resumo.maior_gap} icone={AlertTriangle}>
                    É a capacidade com maior desequilíbrio acumulado no horizonte analisado.
                  </Alerta>
                )}
              </div>
            </Cartao>

            <Cartao titulo="Top gaps acumulados" subtitulo="Somatório do gap no horizonte" icone={BarChart3} corIcone="#DC2626">
              {linhasForecast.length === 0 ? (
                <Esqueleto linhas={4} />
              ) : (
                <div className="space-y-2">
                  {[...linhasForecast]
                    .sort((a, b) => b.gap_total - a.gap_total)
                    .slice(0, 8)
                    .map((l) => (
                      <div key={l.skill_id} className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: l.cor }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-fg">{l.skill}</span>
                        <span
                          className="shrink-0 text-2xs font-semibold tabular-nums"
                          style={{ color: l.gap_total > 1 ? "#DC2626" : l.gap_total < -1 ? "#2563EB" : "#059669" }}
                        >
                          {(l.gap_total > 0 ? "+" : "") + numero(l.gap_total, 1)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Cartao>

            <Cartao titulo="Detalhe por capacidade" subtitulo="Pico de demanda e bus factor" icone={Activity} corIcone="#059669">
              {linhasForecast.length === 0 ? (
                <Esqueleto linhas={4} />
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1 scroll-thin">
                  {linhasForecast.slice(0, 12).map((l) => (
                    <div key={l.skill_id} className="rounded-sgp border border-border bg-surface-2 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium text-fg">{l.skill}</span>
                        <Etiqueta tom={CRITICIDADE_TOM[l.criticidade] ?? "neutral"}>{l.criticidade}</Etiqueta>
                      </div>
                      <p className="mt-1 text-2xs text-fg-subtle">
                        {"Pico de demanda " + numero(l.pico_demanda, 1) + " FTE · bus factor N" + numero(l.bus_factor)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Cartao>
          </GradeCards>
        </div>
      )}

      {aba === "skills" && (
        <div className="space-y-4">
          {busFactor.isError && (
            <Alerta tom="danger" titulo="Não foi possível detectar o bus factor">
              {mensagemErro(busFactor.error)}
            </Alerta>
          )}

          <LinhaKPI
            itens={[
              { rotulo: "Alertas ativos", valor: numero(busFactor.data?.resumo.total ?? 0), icone: ShieldAlert, cor: "#DC2626" },
              { rotulo: "Sem detentor", valor: numero(busFactor.data?.resumo.sem_detentor ?? 0), icone: AlertTriangle, cor: "#F59E0B", subrotulo: "nenhum especialista nível 4+" },
              { rotulo: "Um único detentor", valor: numero(busFactor.data?.resumo.um_detentor ?? 0), icone: Users, cor: "#8B5CF6", subrotulo: "risco de parada" },
              { rotulo: "Detentores mapeados", valor: numero(soma(alertas.map((a) => a.quantidade_detentores))), icone: Users, cor: "#0891B2" },
              { rotulo: "Projetos dependentes", valor: numero(soma(alertas.map((a) => a.total_projetos_dependentes))), icone: Layers, cor: "#059669" },
              { rotulo: "Ações sugeridas", valor: numero(soma(alertas.map((a) => a.acoes_sugeridas.length))), icone: Lightbulb, cor: "#F59E0B" },
            ]}
          />

          {busFactor.isLoading ? (
            <CarregandoBloco rotulo="Analisando dependências de capacidade..." />
          ) : alertas.length === 0 ? (
            <Vazio
              icone={ShieldAlert}
              titulo="Nenhum risco de bus factor"
              descricao="Todas as capacidades críticas têm detentores suficientes para sustentar o portfólio."
            />
          ) : (
            <>
              <GradeCards colunas={2}>
                {alertas.map((a) => {
                  const ativo = alertaAtivo?.skill_id === a.skill_id;
                  return (
                    <article
                      key={a.skill_id}
                      className={cn(
                        "rounded-sgp-lg border bg-surface p-3.5 shadow-n1 transition-all",
                        ativo ? "border-danger/50 ring-2 ring-danger/25" : "border-border hover:shadow-n2"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-sgp"
                          style={{ backgroundColor: a.cor + "1f", color: a.cor }}
                        >
                          <ShieldAlert className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">{a.skill}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Etiqueta tom={CRITICIDADE_TOM[a.criticidade] ?? "neutral"}>{a.criticidade}</Etiqueta>
                            <Etiqueta tom={a.quantidade_detentores === 0 ? "danger" : a.quantidade_detentores === 1 ? "warning" : "info"} icone={Users}>
                              {numero(a.quantidade_detentores) + " detentor(es) N4+"}
                            </Etiqueta>
                            <Etiqueta tom="neutral" icone={Layers}>
                              {numero(a.total_projetos_dependentes) + " projeto(s)"}
                            </Etiqueta>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2.5 text-xs text-fg-muted">{a.recomendacao}</p>

                      <div className="mt-2.5">
                        <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Ações sugeridas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {a.acoes_sugeridas.map((acao) => {
                            const Icone = iconeAcao(acao.icone);
                            return (
                              <Chip key={acao.tipo} cor={acao.cor} icone={Icone}>
                                {acao.rotulo}
                              </Chip>
                            );
                          })}
                        </div>
                        <ul className="mt-2 space-y-0.5">
                          {a.acoes_sugeridas.map((acao) => (
                            <li key={"det-" + acao.tipo} className="text-2xs text-fg-subtle">
                              {acao.rotulo + ": " + acao.detalhe}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {a.detentores.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-2xs text-fg-subtle">Detentores:</span>
                          {a.detentores.slice(0, 6).map((d) => (
                            <button
                              key={d.user_id}
                              type="button"
                              onClick={() => navegar("/capacidade/" + d.user_id)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-2xs text-fg transition-colors hover:border-brand hover:text-brand"
                              title={"Ver ocupação de " + d.nome}
                            >
                              <Avatar nome={d.nome} cor={d.cor} tamanho="xs" />
                              {d.nome + " · N" + numero(d.nivel)}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
                        <Botao variante="secundario" tamanho="sm" icone={ArrowRight} onClick={() => setAlertaSelecionado(a.skill_id)}>
                          Ver grafo de dependência
                        </Botao>
                        <Botao variante="secundario" tamanho="sm" icone={Users} onClick={() => navegar("/matriz-skills")}>
                          Ver quem tem a skill
                        </Botao>
                        <Botao variante="fantasma" tamanho="sm" icone={Target} onClick={() => navegar("/pdi")}>
                          Gerar PDI
                        </Botao>
                      </div>
                    </article>
                  );
                })}
              </GradeCards>

              {alertaAtivo && (
                <Cartao
                  titulo={"Grafo de dependência · " + alertaAtivo.skill}
                  subtitulo={
                    numero(alertaAtivo.quantidade_detentores) +
                    " detentor(es) de nível 4+ sustentando " +
                    numero(alertaAtivo.total_projetos_dependentes) +
                    " projeto(s)"
                  }
                  icone={Brain}
                  corIcone={alertaAtivo.cor}
                  acao={
                    <Botao
                      variante="secundario"
                      tamanho="sm"
                      icone={Sparkles}
                      carregando={salvandoAlertas}
                      onClick={salvarAlertas}
                    >
                      Persistir alertas
                    </Botao>
                  }
                >
                  <GrafoBusFactor alerta={alertaAtivo} />
                  <p className="mt-2 text-2xs text-fg-subtle">
                    Nós em círculo representam os detentores mapeados; o nó à direita agrega os projetos que declaram
                    dependência desta capacidade. Clique em um detentor para abrir a ocupação individual.
                  </p>
                </Cartao>
              )}
            </>
          )}
        </div>
      )}

      {aba === "ocupacao" && (
        <div className="space-y-4">
          {ocupacao.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar a ocupação">
              {mensagemErro(ocupacao.error)}
            </Alerta>
          )}

          <LinhaKPI
            itens={[
              { rotulo: "Pessoas no mapa", valor: numero(estatisticasOcupacao.pessoas), icone: Users, cor: "#2563EB" },
              { rotulo: "Utilização média", valor: percentual(estatisticasOcupacao.utilizacao, 1), icone: Activity, cor: "#059669", subrotulo: "média das semanas analisadas" },
              { rotulo: "Sobrealocados", valor: numero(estatisticasOcupacao.sobrealocados), icone: Flame, cor: "#DC2626", subrotulo: "alguma semana acima de 100%" },
              { rotulo: "Ociosos", valor: numero(estatisticasOcupacao.ociosos), icone: Snowflake, cor: "#0891B2", subrotulo: "sem alocação no período" },
              { rotulo: "Semanas críticas", valor: numero(estatisticasOcupacao.celulasCriticas), icone: AlertTriangle, cor: "#F59E0B", subrotulo: "células acima de 100%" },
              { rotulo: "Semanas", valor: numero(estatisticasOcupacao.mediaSemanal), icone: BarChart3, cor: "#8B5CF6" },
            ]}
          />

          <Cartao
            titulo="Ocupação por pessoa e semana"
            subtitulo="Percentual de dedicação somado por semana — clique em uma célula para ver os projetos"
            icone={Users}
            corIcone="#2563EB"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <EscalaCores
                titulo="Ocupação"
                rotulos={["0%", "1-84%", "85-100%", ">100%"]}
                cores={["#64748B", "#2563EB", "#D97706", "#DC2626"]}
              />
              <span className="text-2xs text-fg-subtle">
                Utilização média da equipe: {percentual(estatisticasOcupacao.utilizacao, 1)}
              </span>
            </div>

            {ocupacao.isLoading ? (
              <CarregandoBloco rotulo="Calculando ocupação..." />
            ) : linhasOcupacao.length === 0 ? (
              <Vazio icone={Users} titulo="Sem alocações no período" descricao="Nenhuma pessoa está alocada nas próximas semanas." />
            ) : (
              <Heatmap
                linhas={linhasOcupacao.map((l) => ({
                  id: l.user_id,
                  rotulo: l.nome,
                  sub: l.area || "Sem área",
                  cor: l.cor,
                  avatar: <Avatar nome={l.nome} cor={l.cor} iniciais={l.iniciais} tamanho="xs" />,
                }))}
                colunas={semanas.map((s) => ({ id: s.semana, rotulo: s.rotulo }))}
                celulas={(linhaId, colunaId): CelulaHeatmap => {
                  const linha = linhasOcupacao.find((l) => String(l.user_id) === String(linhaId));
                  const alvo = linha?.celulas.find((c) => c.semana === colunaId);
                  const valor = alvo?.valor ?? 0;
                  return {
                    valor,
                    rotulo: valor ? percentual(valor) : "Sem alocação",
                    cor: corOcupacaoSemana(valor),
                    detalhe: (
                      <div className="space-y-0.5">
                        <p className="font-semibold text-fg">{linha?.nome + " · " + dataCurta(String(colunaId))}</p>
                        <p className="text-fg-muted">{valor ? percentual(valor) + " de dedicação" : "Nenhuma alocação"}</p>
                        {alvo && alvo.projetos.length > 0 && <p className="text-fg-subtle">{alvo.projetos.join(", ")}</p>}
                      </div>
                    ),
                  };
                }}
                maximo={150}
                larguraColuna={48}
                larguraLinha={230}
                formatoValor={(v) => (v ? numero(v) + "%" : "—")}
                corDe={(v) => corOcupacaoSemana(v)}
                aoClicarCelula={(linhaId, colunaId) => {
                  const linha = linhasOcupacao.find((l) => String(l.user_id) === String(linhaId));
                  if (linha) setCelulaOcupacao({ linha, semana: String(colunaId) });
                }}
              />
            )}
          </Cartao>

          <SecaoColapsavel titulo="Ranking de utilização" icone={BarChart3} abertoInicial={false}>
            <div className="space-y-2">
              {[...linhasOcupacao]
                .sort((a, b) => b.media - a.media)
                .map((l) => (
                  <div key={l.user_id} className="flex items-center gap-2">
                    <Avatar nome={l.nome} cor={l.cor} iniciais={l.iniciais} tamanho="xs" />
                    <span className="w-48 shrink-0 truncate text-xs text-fg">{l.nome}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-full transition-all"
                        style={{ width: Math.min(100, l.media) + "%", backgroundColor: corOcupacaoSemana(l.media) }}
                      />
                    </span>
                    <span className="w-14 shrink-0 text-right text-2xs font-semibold tabular-nums text-fg-muted">
                      {percentual(l.media)}
                    </span>
                    <Botao variante="fantasma" tamanho="xs" icone={ArrowRight} onClick={() => navegar("/capacidade/" + l.user_id)}>
                      abrir
                    </Botao>
                  </div>
                ))}
            </div>
          </SecaoColapsavel>
        </div>
      )}

      {aba === "excecoes" && (
        <div className="space-y-4">
          <Alerta tom="info" titulo="A exceção substitui a capacidade padrão daquela semana" icone={CalendarClock}>
            Cada pessoa tem uma capacidade semanal padrão cadastrada no perfil. Uma exceção não soma a esse valor: ela
            o substitui apenas na semana escolhida. Zero hora representa férias ou afastamento; acima do padrão,
            representa hora extra. As exceções já entram no cálculo de capacidade por período, na ocupação da equipe e
            no motor de alocação, então criar ou excluir um registro muda imediatamente a disponibilidade considerada
            pelo sistema.
          </Alerta>

          {excecoes.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar as exceções">
              {mensagemErro(excecoes.error)}
            </Alerta>
          )}

          <LinhaKPI
            itens={[
              { rotulo: "Exceções no período", valor: numero(estatisticasExcecoes.total), icone: CalendarClock, cor: "#0891B2", subrotulo: "semanas ajustadas" },
              { rotulo: "Pessoas com exceção", valor: numero(estatisticasExcecoes.pessoas), icone: Users, cor: "#2563EB" },
              { rotulo: "Semanas zeradas", valor: numero(estatisticasExcecoes.zeradas), icone: CalendarOff, cor: "#DC2626", subrotulo: "férias ou afastamento" },
              { rotulo: "Semanas com hora extra", valor: numero(estatisticasExcecoes.extras), icone: Flame, cor: "#F59E0B", subrotulo: "acima do padrão da pessoa" },
              { rotulo: "Semanas reduzidas", valor: numero(estatisticasExcecoes.reduzidas), icone: Clock, cor: "#8B5CF6", subrotulo: "abaixo do padrão, sem zerar" },
              { rotulo: "Horas somadas", valor: horas(estatisticasExcecoes.horas), icone: Activity, cor: "#059669", subrotulo: "total das semanas listadas" },
            ]}
          />

          <BarraFerramentas>
            <FiltroSelect
              rotulo="Pessoa"
              icone={Users}
              className="max-w-64"
              valor={pessoaExcecao}
              onChange={setPessoaExcecao}
              opcoes={(pessoas.data || []).map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
            />
            <Campo rotulo="De" htmlFor="exc-de">
              <Entrada
                id="exc-de"
                type="date"
                className="h-8 py-0 text-xs"
                value={periodoDe}
                onChange={(e) => setPeriodoDe(e.target.value)}
              />
            </Campo>
            <Campo rotulo="Até" htmlFor="exc-ate">
              <Entrada
                id="exc-ate"
                type="date"
                className="h-8 py-0 text-xs"
                value={periodoAte}
                onChange={(e) => setPeriodoAte(e.target.value)}
              />
            </Campo>
            <EntradaBusca
              valor={buscaExcecao}
              onChange={setBuscaExcecao}
              placeholder="Buscar por motivo ou observação..."
              className="w-56"
            />
            <div className="ml-auto flex items-center gap-2">
              <Botao
                variante="secundario"
                tamanho="sm"
                icone={CalendarRange}
                onClick={() => {
                  setPeriodoDe(somarDias(hojeISO(), -28));
                  setPeriodoAte(somarDias(hojeISO(), 56));
                }}
              >
                Período padrão
              </Botao>
              {podeEditarExcecoes && (
                <Botao variante="primario" tamanho="sm" icone={Plus} onClick={abrirNovaExcecao}>
                  Nova exceção
                </Botao>
              )}
            </div>
          </BarraFerramentas>

          {!podeEditarExcecoes && (
            <Alerta tom="info" titulo="Somente leitura" icone={ShieldAlert}>
              Criar, editar e excluir exceções exige a permissão alocacao.editar, dada a ADMIN, PMO e GERENTE. Fale com
              quem administra a alocação para ajustar uma semana.
            </Alerta>
          )}

          <Cartao
            titulo="Exceções por pessoa e semana"
            subtitulo={
              numero(estatisticasExcecoes.total) +
              " registro(s) entre " +
              dataCurta(periodoDe) +
              " e " +
              dataCurta(periodoAte)
            }
            icone={CalendarClock}
            corIcone="#0891B2"
            acao={
              podeEditarExcecoes ? (
                <Botao variante="primario" tamanho="sm" icone={Plus} onClick={abrirNovaExcecao}>
                  Nova exceção
                </Botao>
              ) : undefined
            }
          >
            {excecoes.isLoading ? (
              <CarregandoBloco rotulo="Carregando exceções de capacidade..." />
            ) : excecoesFiltradas.length === 0 ? (
              <Vazio
                icone={CalendarOff}
                titulo="Nenhuma exceção no período"
                descricao="Sem exceção cadastrada, todas as semanas usam a capacidade padrão do perfil da pessoa. Registre férias, afastamentos e horas extras para o cálculo refletir a realidade."
                acao={
                  podeEditarExcecoes ? (
                    <Botao variante="primario" icone={Plus} onClick={abrirNovaExcecao}>
                      Criar exceção
                    </Botao>
                  ) : undefined
                }
              />
            ) : (
              <Tabela
                colunas={colunasExcecoes}
                dados={excecoesFiltradas}
                compacta
                destaqueLinha={(e) => {
                  const valor = Number(e.horas_disponiveis);
                  if (valor === 0) return "bg-danger-soft/25";
                  if (valor > padraoPessoa(e.user)) return "bg-warning-soft/25";
                  return undefined;
                }}
                vazio={<Vazio icone={CalendarOff} titulo="Nenhuma exceção no período" />}
              />
            )}
          </Cartao>

          <SecaoColapsavel titulo="Como a exceção entra no cálculo" icone={Lightbulb} abertoInicial={false}>
            <ul className="space-y-1.5 text-xs text-fg-muted">
              <li>1. A semana é identificada pela segunda-feira: qualquer dia escolhido no formulário é ajustado para a segunda daquela semana.</li>
              <li>2. O valor informado vale para os cinco dias úteis da semana: 0 h zera os cinco dias e 48 h equivalem a 9,6 h por dia útil.</li>
              <li>3. A capacidade do período soma as semanas do intervalo e substitui o padrão apenas nas semanas com exceção.</li>
              <li>4. A ocupação da equipe e o motor de alocação usam a mesma capacidade, por isso a exceção altera o que o sistema considera disponível.</li>
            </ul>
          </SecaoColapsavel>
        </div>
      )}

      <PainelLateral
        aberto={celula !== null}
        onFechar={() => setCelula(null)}
        largura="sm"
        titulo={celula ? celula.linha.skill : "Célula"}
        subtitulo={celula ? mesCurto(celula.celula.periodo) : ""}
      >
        {celula && (
          <div className="space-y-3">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs text-fg-subtle">Gap do período</p>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: corGap(celula.celula.gap, maximoGap) }}
              >
                {(celula.celula.gap > 0 ? "+" : "") + numero(celula.celula.gap, 2) + " FTE"}
              </p>
              <Etiqueta tom={situacaoTom(celula.celula.situacao)} className="mt-1">
                {celula.celula.situacao === "ESCASSEZ"
                  ? "Escassez de capacidade"
                  : celula.celula.situacao === "OCIOSIDADE"
                    ? "Capacidade ociosa"
                    : "Equilíbrio"}
              </Etiqueta>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-sgp border border-border bg-surface-2 p-2">
                <p className="text-2xs text-fg-subtle">Demanda</p>
                <p className="text-sm font-semibold tabular-nums text-fg">{numero(celula.celula.demanda, 2)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2">
                <p className="text-2xs text-fg-subtle">Oferta</p>
                <p className="text-sm font-semibold tabular-nums text-fg">{numero(celula.celula.oferta, 2)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2">
                <p className="text-2xs text-fg-subtle">Nível médio</p>
                <p className="text-sm font-semibold tabular-nums text-fg">
                  {celula.celula.nivel_medio_demandado ? "N" + numero(celula.celula.nivel_medio_demandado, 1) : "—"}
                </p>
              </div>
            </div>
            <Alerta
              tom={situacaoTom(celula.celula.situacao)}
              titulo={celula.celula.situacao === "ESCASSEZ" ? "Ação recomendada" : "Leitura do período"}
              icone={celula.celula.situacao === "ESCASSEZ" ? Flame : Lightbulb}
            >
              {celula.celula.situacao === "ESCASSEZ"
                ? "Antecipe contratação, mentoria ou redistribuição de escopo para " + celula.linha.skill + "."
                : celula.celula.situacao === "OCIOSIDADE"
                  ? "Capacidade livre em " + celula.linha.skill + ": oportunidade de desenvolvimento e realocação."
                  : "Demanda e oferta equilibradas para " + celula.linha.skill + " neste mês."}
            </Alerta>
          </div>
        )}
      </PainelLateral>

      <PainelLateral
        aberto={celulaOcupacao !== null}
        onFechar={() => setCelulaOcupacao(null)}
        largura="sm"
        titulo={celulaOcupacao ? celulaOcupacao.linha.nome : "Ocupação"}
        subtitulo={celulaOcupacao ? "Semana de " + dataCurta(celulaOcupacao.semana) : ""}
        rodape={
          celulaOcupacao ? (
            <Botao variante="secundario" icone={ArrowRight} onClick={() => navegar("/capacidade/" + celulaOcupacao.linha.user_id)}>
              Abrir capacidade individual
            </Botao>
          ) : null
        }
      >
        {celulaOcupacao && celulaOcupacaoSelecionada && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
              <Avatar
                nome={celulaOcupacao.linha.nome}
                cor={celulaOcupacao.linha.cor}
                iniciais={celulaOcupacao.linha.iniciais}
                tamanho="md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{celulaOcupacao.linha.nome}</p>
                <p className="truncate text-2xs text-fg-muted">{celulaOcupacao.linha.area || "Sem área"}</p>
              </div>
              <span
                className="ml-auto text-lg font-bold tabular-nums"
                style={{ color: corOcupacaoSemana(celulaOcupacaoSelecionada.valor) }}
              >
                {percentual(celulaOcupacaoSelecionada.valor)}
              </span>
            </div>
            <Campo rotulo="Projetos na semana">
              {celulaOcupacaoSelecionada.projetos.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {celulaOcupacaoSelecionada.projetos.map((projeto) => (
                    <Chip key={projeto} cor="#2563EB" icone={Layers}>
                      {projeto}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">Sem alocação registrada nesta semana.</p>
              )}
            </Campo>
            <Campo rotulo="Média do período">
              <span className="text-sm font-semibold tabular-nums text-fg">{percentual(celulaOcupacao.linha.media, 1)}</span>
            </Campo>
          </div>
        )}
      </PainelLateral>

      <PainelLateral
        aberto={painelExcecao}
        onFechar={() => setPainelExcecao(false)}
        largura="md"
        titulo={editandoExcecao ? "Editar exceção de capacidade" : "Nova exceção de capacidade"}
        subtitulo="A semana escolhida passa a usar as horas informadas em vez da capacidade padrão"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setPainelExcecao(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Save}
              carregando={criarExcecao.isPending || editarExcecao.isPending}
              onClick={enviarExcecao}
            >
              {editandoExcecao ? "Salvar alterações" : "Criar exceção"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Pessoa" obrigatorio htmlFor="exc-pessoa" dica="A exceção vale apenas para esta pessoa.">
            <Selecao
              id="exc-pessoa"
              value={formularioExcecao.user}
              onChange={(e) => {
                const pessoaId = e.target.value;
                setFormularioExcecao((f) => ({
                  ...f,
                  user: pessoaId,
                  horas_disponiveis:
                    pessoaId && !editandoExcecao ? String(padraoPessoa(Number(pessoaId))) : f.horas_disponiveis,
                }));
              }}
            >
              <option value="">Selecione a pessoa</option>
              {(pessoas.data || []).map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nome + (p.area ? " · " + p.area : "")}
                </option>
              ))}
            </Selecao>
          </Campo>

          <Campo
            rotulo="Semana"
            obrigatorio
            htmlFor="exc-semana"
            dica={
              semanaEmEdicao
                ? "Semana de " +
                  dataCurta(semanaEmEdicao) +
                  " a " +
                  dataCurta(sextaDaSemana(semanaEmEdicao)) +
                  ". Qualquer dia escolhido é ajustado para a segunda-feira."
                : "Escolha qualquer dia da semana que receberá a exceção."
            }
          >
            <Entrada
              id="exc-semana"
              type="date"
              value={formularioExcecao.semana_inicio}
              onChange={(e) =>
                setFormularioExcecao((f) => ({ ...f, semana_inicio: segundaDaSemana(e.target.value) || e.target.value }))
              }
            />
          </Campo>

          <Campo
            rotulo="Horas disponíveis na semana"
            obrigatorio
            htmlFor="exc-horas"
            dica={
              pessoaEmEdicao
                ? "Capacidade padrão de " +
                  pessoaEmEdicao.nome +
                  ": " +
                  horas(padraoEmEdicao) +
                  ". Use 0 para férias ou afastamento."
                : "Selecione a pessoa para comparar com a capacidade padrão do perfil."
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Entrada
                id="exc-horas"
                type="number"
                min={0}
                max={999}
                step={0.5}
                className="max-w-32"
                value={formularioExcecao.horas_disponiveis}
                onChange={(e) => setFormularioExcecao((f) => ({ ...f, horas_disponiveis: e.target.value }))}
              />
              <Chip
                cor="#DC2626"
                icone={CalendarOff}
                onClick={() => setFormularioExcecao((f) => ({ ...f, horas_disponiveis: "0" }))}
              >
                Zerar (férias ou afastamento)
              </Chip>
              <Chip
                cor="#2563EB"
                icone={Clock}
                onClick={() => setFormularioExcecao((f) => ({ ...f, horas_disponiveis: String(padraoEmEdicao || 40) }))}
              >
                Usar o padrão
              </Chip>
              <Chip
                cor="#F59E0B"
                icone={Flame}
                onClick={() =>
                  setFormularioExcecao((f) => ({
                    ...f,
                    horas_disponiveis: String(Math.round((padraoEmEdicao || 40) * 1.2 * 2) / 2),
                  }))
                }
              >
                +20% (hora extra)
              </Chip>
            </div>
          </Campo>

          <Campo
            rotulo="Motivo"
            htmlFor="exc-motivo"
            dica="Texto curto, com até 120 caracteres, exibido na listagem e no histórico da pessoa."
          >
            <Entrada
              id="exc-motivo"
              maxLength={120}
              value={formularioExcecao.motivo}
              placeholder="Férias, afastamento, hora extra..."
              onChange={(e) => setFormularioExcecao((f) => ({ ...f, motivo: e.target.value }))}
            />
          </Campo>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_EXCECAO.map((m) => (
              <Chip
                key={m}
                cor="#0891B2"
                ativo={formularioExcecao.motivo === m}
                onClick={() => setFormularioExcecao((f) => ({ ...f, motivo: f.motivo === m ? "" : m }))}
              >
                {m}
              </Chip>
            ))}
          </div>

          <Campo
            rotulo="Observação"
            htmlFor="exc-observacao"
            dica="Contexto para consultas futuras: cobertura, acordo, aprovação."
          >
            <AreaTexto
              id="exc-observacao"
              rows={4}
              value={formularioExcecao.observacao}
              onChange={(e) => setFormularioExcecao((f) => ({ ...f, observacao: e.target.value }))}
            />
          </Campo>

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Efeito da exceção</p>
            {pessoaEmEdicao && semanaEmEdicao ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-fg">
                  {pessoaEmEdicao.nome +
                    " · semana de " +
                    dataCurta(semanaEmEdicao) +
                    " a " +
                    dataCurta(sextaDaSemana(semanaEmEdicao))}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Etiqueta tom="neutral">padrão {horas(padraoEmEdicao)}</Etiqueta>
                  <ArrowRight className="size-3.5 text-fg-subtle" aria-hidden />
                  <Etiqueta
                    tom={diferencaEmEdicao === 0 ? "neutral" : diferencaEmEdicao > 0 ? "warning" : "info"}
                  >
                    {horas(Number.isFinite(horasEmEdicao) ? horasEmEdicao : 0)}
                  </Etiqueta>
                  {Number.isFinite(horasEmEdicao) && diferencaEmEdicao !== 0 && (
                    <span
                      className="text-2xs font-semibold"
                      style={{ color: diferencaEmEdicao > 0 ? "#D97706" : "#DC2626" }}
                    >
                      {(diferencaEmEdicao > 0 ? "+" : "") + numero(diferencaEmEdicao, 1) + " h na semana"}
                    </span>
                  )}
                </div>
                <p className="text-2xs text-fg-subtle">
                  {horasEmEdicao === 0
                    ? "Semana zerada: o sistema considera a pessoa indisponível nos cinco dias úteis."
                    : "O valor substitui a capacidade padrão apenas nesta semana; as demais seguem o padrão do perfil."}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-2xs text-fg-subtle">Escolha a pessoa e a semana para ver o efeito no cálculo.</p>
            )}
          </div>
        </div>
      </PainelLateral>

      <Modal
        aberto={confirmacaoExcecao !== null}
        onFechar={() => setConfirmacaoExcecao(null)}
        titulo="Excluir exceção de capacidade"
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacaoExcecao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirExcecao.isPending}
              onClick={() => {
                if (confirmacaoExcecao) excluirExcecao.mutate({ id: confirmacaoExcecao.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          {"Deseja excluir a exceção de " +
            (confirmacaoExcecao ? confirmacaoExcecao.user_nome : "") +
            " na semana de " +
            dataCurta(confirmacaoExcecao ? confirmacaoExcecao.semana_inicio : "") +
            "?"}
        </p>
        <Alerta tom="info" titulo="O que muda" className="mt-3">
          A semana volta a usar a capacidade padrão da pessoa. Se a exceção representava férias ou afastamento, a
          disponibilidade considerada pelo sistema volta ao valor cheio.
        </Alerta>
      </Modal>

      <BarraFerramentas className="justify-between">
        <span className="inline-flex items-center gap-2 text-2xs text-fg-muted">
          <Lightbulb className="size-3.5" aria-hidden />
          A projeção considera requisitos de capacidade dos projetos ativos e o nível atual dos perfis validados.
        </span>
        <span className="inline-flex items-center gap-2 text-2xs text-fg-subtle">
          <TrendingUp className="size-3.5" aria-hidden />
          Gap positivo indica falta de pessoas; negativo indica capacidade sobrando.
        </span>
      </BarraFerramentas>
    </div>
  );
}

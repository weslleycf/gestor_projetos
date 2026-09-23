/* ==========================================================================
   Alocação de recursos — RF-13 a RF-17
   Pool de colaboradores arrastável, timeline por pessoa, painel de conflitos,
   heatmap de ocupação e KPIs do dashboard de alocação.
   ========================================================================== */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  AlertTriangle,
  BadgeCheck,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Flame,
  GripVertical,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Wand2,
  XCircle,
} from "lucide-react";
import {
  Alerta,
  AreaTexto,
  Avatar,
  BarraFerramentas,
  BarraProgresso,
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
  FiltrosAtivos,
  Interruptor,
  Modal,
  PainelLateral,
  SecaoColapsavel,
  Selecao,
  Segmentado,
  Tabela,
  Vazio,
  useAvisos,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import {
  EscalaCores,
  GraficoBarras,
  GraficoDonut,
  Heatmap,
  type CelulaHeatmap,
} from "@/components/charts";
import { GradeCards, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, media } from "@/lib/utils";
import { dataCurta, diasEntre, hojeISO, moeda, numero, percentual, somarDias } from "@/lib/format";
import type { Alocacao, ConflitoAlocacao, ProjetoResumo, Recurso, Tarefa, Usuario } from "@/lib/types";

/* ==========================================================================
   Tipos das respostas da API
   ========================================================================== */

interface ItemTimeline {
  id: number;
  inicio: string;
  fim: string;
  percentual: number;
  projeto: string;
  project_id: number;
  tarefa: string;
  task_id: number | null;
  cor: string;
  status: string;
  modalidade: string;
}

interface PessoaTimeline {
  user_id: number;
  nome: string;
  cor: string;
  iniciais: string;
  cargo: string;
  area: string;
  alocacoes: ItemTimeline[];
}

interface RespostaTimeline {
  pessoas: PessoaTimeline[];
  total: number;
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

interface RespostaConflitos {
  conflitos: ConflitoAlocacao[];
  total: number;
  criticos: number;
}

interface RespostaDashboardAlocacao {
  total_alocacoes: number;
  por_modo: Array<{ modalidade: string; total: number }>;
  taxa_override: number;
  aderencia_media: number;
  recomendacoes: { total: number; sugeridas: number; aceitas: number; recusadas: number };
  conflitos: ConflitoAlocacao[];
  por_projeto: Array<{ project__nome: string; project__cor: string; total: number; percentual: number }>;
}

interface RespostaAtribuir {
  alocacao: Alocacao;
  conflitos: ConflitoAlocacao[];
  aviso: ConflitoAlocacao | null;
}

/* ==========================================================================
   Rótulos auxiliares
   ========================================================================== */

const MODALIDADES: Record<string, { rotulo: string; cor: string }> = {
  PERFORMANCE: { rotulo: "Performance imediata", cor: "#2563EB" },
  DESENVOLVIMENTO: { rotulo: "Desenvolvimento", cor: "#8B5CF6" },
  MISTA: { rotulo: "Mista (sênior + júnior)", cor: "#0891B2" },
  MANUAL: { rotulo: "Manual", cor: "#64748B" },
};

const STATUS_ALOCACAO: Record<string, { rotulo: string; tom: Tom }> = {
  PROPOSTA: { rotulo: "Proposta", tom: "warning" },
  CONFIRMADA: { rotulo: "Confirmada", tom: "info" },
  EM_EXECUCAO: { rotulo: "Em execução", tom: "brand" },
  CONCLUIDA: { rotulo: "Concluída", tom: "success" },
  CANCELADA: { rotulo: "Cancelada", tom: "neutral" },
};

const CORES_OCUPACAO = ["#10B981", "#0891B2", "#D97706", "#DC2626"];

function corOcupacao(valor: number): string {
  if (valor > 100) return "#DC2626";
  if (valor >= 85) return "#D97706";
  if (valor > 0) return "#0891B2";
  return "var(--sgp-surface-2)";
}

function rotuloStatus(status: string) {
  return STATUS_ALOCACAO[status]?.rotulo ?? status;
}

function tomStatus(status: string): Tom {
  return STATUS_ALOCACAO[status]?.tom ?? "neutral";
}

function rotuloModalidade(modalidade: string) {
  return MODALIDADES[modalidade]?.rotulo ?? modalidade;
}

function corModalidade(modalidade: string) {
  return MODALIDADES[modalidade]?.cor ?? "#64748B";
}

/* ==========================================================================
   Cartão arrastável do pool de colaboradores
   ========================================================================== */

interface PropsCartaoPessoa {
  pessoa: Usuario;
  ocupacaoMedia: number;
  alocacoesAtivas: number;
  aoAlocar: (pessoa: Usuario) => void;
  aoAbrirCapacidade: (pessoa: Usuario) => void;
}

function CartaoPessoa({ pessoa, ocupacaoMedia, alocacoesAtivas, aoAlocar, aoAbrirCapacidade }: PropsCartaoPessoa) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "pessoa-" + pessoa.id,
    data: { user_id: pessoa.id },
  });
  const disponibilidade = Math.max(0, 100 - ocupacaoMedia);
  const custoVisivel = pessoa.custo_hora_visivel && pessoa.custo_hora !== null;

  return (
    <div
      ref={setNodeRef}
      style={{ touchAction: "none" }}
      aria-label={"Arrastar " + pessoa.nome + " para a timeline"}
      className={cn(
        "group cursor-grab rounded-sgp border border-border bg-surface p-2.5 shadow-n1 transition-all duration-150 active:cursor-grabbing",
        isDragging ? "opacity-40 ring-2 ring-brand" : "hover:border-border-strong hover:shadow-n2"
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        <Avatar nome={pessoa.nome} cor={pessoa.cor} iniciais={pessoa.iniciais} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-fg">{pessoa.nome}</p>
          <p className="truncate text-2xs text-fg-muted">{pessoa.cargo || "Sem cargo"}</p>
          <p className="truncate text-2xs text-fg-subtle">{pessoa.area || "Sem área"}</p>
        </div>
        <GripVertical className="size-4 shrink-0 text-fg-subtle" aria-hidden />
      </div>

      <div className="mt-2 flex items-center justify-between gap-1.5 text-2xs">
        <span className="truncate text-fg-muted">
          {custoVisivel ? moeda(pessoa.custo_hora) + "/h" : "Custo restrito"}
        </span>
        <Etiqueta tom={ocupacaoMedia > 100 ? "danger" : ocupacaoMedia >= 85 ? "warning" : "success"}>
          {ocupacaoMedia > 0 ? percentual(ocupacaoMedia) : "livre"}
        </Etiqueta>
      </div>

      <div className="mt-1.5">
        <BarraProgresso
          valor={Math.min(100, ocupacaoMedia)}
          cor={corOcupacao(ocupacaoMedia) === "var(--sgp-surface-2)" ? "#0891B2" : corOcupacao(ocupacaoMedia)}
          altura="sm"
          rotulo={"Disponível " + percentual(disponibilidade)}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-2xs text-fg-subtle">{numero(alocacoesAtivas)} alocação(ões) vigente(s)</span>
        <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <BotaoIcone icone={UserPlus} rotulo={"Alocar " + pessoa.nome} tamanho="xs" onClick={() => aoAlocar(pessoa)} />
          <BotaoIcone
            icone={TrendingUp}
            rotulo={"Ver ocupação de " + pessoa.nome}
            tamanho="xs"
            onClick={() => aoAbrirCapacidade(pessoa)}
          />
        </span>
      </div>
    </div>
  );
}

/* ==========================================================================
   Linha droppable da timeline
   ========================================================================== */

interface PropsLinhaTimeline {
  pessoa: PessoaTimeline;
  janela: { inicio: string; fim: string; dias: number };
  emConflito: boolean;
  ocupacaoMedia: number;
  aoSelecionar: (item: ItemTimeline) => void;
}

function LinhaTimelinePessoa({ pessoa, janela, emConflito, ocupacaoMedia, aoSelecionar }: PropsLinhaTimeline) {
  const { setNodeRef, isOver } = useDroppable({ id: "linha-" + pessoa.user_id, data: { user_id: pessoa.user_id } });
  const posicaoHoje = (diasEntre(janela.inicio, hojeISO()) / janela.dias) * 100;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-sgp border p-2 transition-colors",
        isOver ? "border-brand bg-brand-soft/50" : emConflito ? "border-danger/50 bg-danger-soft/20" : "border-border bg-surface"
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar nome={pessoa.nome} cor={pessoa.cor} iniciais={pessoa.iniciais} tamanho="xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-fg">{pessoa.nome}</p>
          <p className="truncate text-2xs text-fg-subtle">
            {pessoa.cargo || "Sem cargo"} · {pessoa.area || "Sem área"}
          </p>
        </div>
        {emConflito && (
          <Etiqueta tom="danger" icone={Flame}>
            sobrealocado
          </Etiqueta>
        )}
        <Etiqueta tom={ocupacaoMedia > 100 ? "danger" : ocupacaoMedia >= 85 ? "warning" : "info"}>
          {percentual(ocupacaoMedia)}
        </Etiqueta>
      </div>

      <div className="relative mt-2 h-9 overflow-hidden rounded-md bg-surface-2">
        {pessoa.alocacoes.map((item) => {
          const inicio = Math.max(0, (diasEntre(janela.inicio, item.inicio) / janela.dias) * 100);
          const fim = Math.min(100, ((diasEntre(janela.inicio, item.fim) + 1) / janela.dias) * 100);
          const largura = Math.max(1.2, fim - inicio);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => aoSelecionar(item)}
              title={item.projeto + (item.tarefa ? " · " + item.tarefa : "") + " · " + item.percentual + "%"}
              className="absolute top-1 bottom-1 rounded-sm border border-black/10 text-[9px] font-bold text-white transition-all hover:z-10 hover:brightness-110"
              style={{ left: inicio + "%", width: largura + "%", backgroundColor: item.cor || "#2563EB" }}
            >
              <span className="sr-only">{item.projeto}</span>
            </button>
          );
        })}
        {posicaoHoje >= 0 && posicaoHoje <= 100 && (
          <span
            className="pointer-events-none absolute inset-y-0 w-px bg-brand"
            style={{ left: posicaoHoje + "%" }}
            title="Hoje"
          />
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

type TipoAlvoAlocacao = "pessoa" | "recurso";

interface FormularioAlocacao {
  tipoAlvo: TipoAlvoAlocacao;
  pessoa: string;
  recurso: string;
  percentual: number;
  horas_planejadas: string;
  data_inicio: string;
  data_fim: string;
  papel: string;
  project: string;
  task: string;
  modalidade: string;
  justificativa: string;
  status: string;
}

function formularioVazio(): FormularioAlocacao {
  return {
    tipoAlvo: "pessoa",
    pessoa: "",
    recurso: "",
    percentual: 100,
    horas_planejadas: "",
    data_inicio: hojeISO(),
    data_fim: somarDias(hojeISO(), 30),
    papel: "",
    project: "",
    task: "",
    modalidade: "MANUAL",
    justificativa: "",
    status: "CONFIRMADA",
  };
}

export default function Alocacao() {
  const navegar = useNavigate();
  const { sucesso, erro, alerta } = useAvisos();

  const [busca, setBusca] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("");
  const [somenteLivres, setSomenteLivres] = useState(false);
  const [periodo, setPeriodo] = useState({ de: "", ate: "" });
  const [statusFiltro, setStatusFiltro] = useState("");

  const [arrastando, setArrastando] = useState<PessoaTimeline | null>(null);
  const [painel, setPainel] = useState<"nova" | "editar" | null>(null);
  const [pessoaAlvo, setPessoaAlvo] = useState<Usuario | null>(null);
  const [alocacaoEdicao, setAlocacaoEdicao] = useState<Alocacao | null>(null);
  const [form, setForm] = useState<FormularioAlocacao>(formularioVazio);
  const [erroForm, setErroForm] = useState("");
  const [retorno, setRetorno] = useState<{ conflitos: ConflitoAlocacao[] } | null>(null);
  const [excluir, setExcluir] = useState<Alocacao | null>(null);
  const [celula, setCelula] = useState<{ linha: LinhaOcupacao; coluna: string } | null>(null);
  const [conflitoAberto, setConflitoAberto] = useState<ConflitoAlocacao | null>(null);

  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /* ------------------------------- Consultas ------------------------------ */

  const usuarios = useLista<Usuario>(CHAVES.usuarios, "/usuarios/", { ativo: "true", page_size: 300 });
  const recursos = useLista<Recurso>(CHAVES.recursos, "/recursos/", { ativo: "true", page_size: 300 });
  const timeline = useConsulta<RespostaTimeline>(CHAVES.alocacoes, "/alocacoes/timeline/", {
    de: periodo.de || undefined,
    ate: periodo.ate || undefined,
  });
  const ocupacao = useConsulta<RespostaOcupacao>(CHAVES.ocupacao, "/alocacoes/mapa-ocupacao/");
  const conflitos = useConsulta<RespostaConflitos>(CHAVES.conflitos, "/alocacoes/conflitos/");
  const painelDash = useConsulta<RespostaDashboardAlocacao>(CHAVES.dashboardAlocacao, "/dashboard/alocacao/");
  const lista = useLista<Alocacao>(CHAVES.alocacoes, "/alocacoes/", {
    page_size: 300,
    status: statusFiltro || undefined,
    project: undefined,
  });
  const projetos = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 300 });
  const tarefas = useLista<Tarefa>(CHAVES.tarefas, form.project ? "/tarefas/" : null, {
    project: form.project || undefined,
    page_size: 300,
  });

  /* ------------------------------- Mutações ------------------------------- */

  const criar = useMutacao<Record<string, unknown>, Alocacao>({
    url: "/alocacoes/",
    invalidar: [CHAVES.alocacoes, CHAVES.conflitos, CHAVES.ocupacao, CHAVES.dashboardAlocacao],
    mensagemSucesso: "Alocação registrada",
  });
  const atribuir = useMutacao<Record<string, unknown>, RespostaAtribuir>({
    url: "/alocacoes/atribuir/",
    invalidar: [CHAVES.alocacoes, CHAVES.conflitos, CHAVES.ocupacao, CHAVES.dashboardAlocacao],
    mensagemSucesso: "Colaborador alocado na tarefa",
  });
  const atualizar = useMutacao<Record<string, unknown>, Alocacao>({
    metodo: "patch",
    url: (v) => "/alocacoes/" + String(v.id) + "/",
    invalidar: [CHAVES.alocacoes, CHAVES.conflitos, CHAVES.ocupacao, CHAVES.dashboardAlocacao],
    mensagemSucesso: "Alocação atualizada",
  });
  const confirmar = useMutacao<number, Alocacao>({
    url: (id) => "/alocacoes/" + id + "/confirmar/",
    invalidar: [CHAVES.alocacoes, CHAVES.conflitos, CHAVES.dashboardAlocacao],
    mensagemSucesso: "Proposta confirmada",
  });
  const remover = useMutacao<number, void>({
    metodo: "delete",
    url: (id) => "/alocacoes/" + id + "/",
    invalidar: [CHAVES.alocacoes, CHAVES.conflitos, CHAVES.ocupacao, CHAVES.dashboardAlocacao],
    mensagemSucesso: "Alocação excluída",
  });

  /* -------------------------------- Derivados ----------------------------- */

  const linhasOcupacao = ocupacao.data?.linhas ?? [];
  const semanas = ocupacao.data?.semanas ?? [];
  const alocacoes = lista.data ?? [];
  const porPessoa = useMemo(() => {
    const mapa = new Map<number, LinhaOcupacao>();
    linhasOcupacao.forEach((linha) => mapa.set(linha.user_id, linha));
    return mapa;
  }, [linhasOcupacao]);

  const pessoasConflito = useMemo(() => {
    const conjunto = new Set<number>();
    (conflitos.data?.conflitos ?? []).forEach((c) => conjunto.add(c.user_id));
    (retorno?.conflitos ?? []).forEach((c) => conjunto.add(c.user_id));
    return conjunto;
  }, [conflitos.data, retorno]);

  const areasDisponiveis = useMemo(() => {
    const conjunto = new Set<string>();
    (usuarios.data ?? []).forEach((u) => {
      if (u.area) conjunto.add(u.area);
    });
    return Array.from(conjunto).sort();
  }, [usuarios.data]);

  const pool = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (usuarios.data ?? []).filter((u) => {
      if (areaFiltro && u.area !== areaFiltro) return false;
      const linha = porPessoa.get(u.id);
      const ocupacaoMediaPessoa = linha ? linha.media : 0;
      if (somenteLivres && ocupacaoMediaPessoa >= 100) return false;
      if (!termo) return true;
      return (
        u.nome.toLowerCase().includes(termo) ||
        (u.cargo || "").toLowerCase().includes(termo) ||
        (u.area || "").toLowerCase().includes(termo)
      );
    });
  }, [usuarios.data, busca, areaFiltro, somenteLivres, porPessoa]);

  const pessoasTimeline = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista_ = timeline.data?.pessoas ?? [];
    if (!termo) return lista_;
    return lista_.filter(
      (p) => p.nome.toLowerCase().includes(termo) || (p.cargo || "").toLowerCase().includes(termo)
    );
  }, [timeline.data, busca]);

  const janela = useMemo(() => {
    const itens = pessoasTimeline.flatMap((p) => p.alocacoes);
    const inicios = itens.map((i) => i.inicio).filter(Boolean).sort();
    const fins = itens.map((i) => i.fim).filter(Boolean).sort();
    const inicio = inicios[0] ?? hojeISO();
    let fim = fins.length ? fins[fins.length - 1] : somarDias(hojeISO(), 90);
    if (diasEntre(inicio, fim) > 545) fim = somarDias(inicio, 545);
    const dias = Math.max(7, diasEntre(inicio, fim) + 1);
    return { inicio, fim, dias };
  }, [pessoasTimeline]);

  const utilizacaoMedia = useMemo(() => media(linhasOcupacao.map((l) => l.media)), [linhasOcupacao]);

  const kpisDashboard = painelDash.data;
  const totalConflitos = conflitos.data?.total ?? 0;

  const alocacoesVigentes = useMemo(() => {
    const hoje = hojeISO();
    return alocacoes.filter((a) => a.data_inicio <= hoje && a.data_fim >= hoje);
  }, [alocacoes]);

  const filtrosAtivos = useMemo(() => {
    const itens: Array<{ chave: string; rotulo: string; valor: string; cor?: string; onRemover: () => void }> = [];
    if (areaFiltro) itens.push({ chave: "area", rotulo: "Área", valor: areaFiltro, onRemover: () => setAreaFiltro("") });
    if (statusFiltro)
      itens.push({
        chave: "status",
        rotulo: "Status",
        valor: rotuloStatus(statusFiltro),
        onRemover: () => setStatusFiltro(""),
      });
    if (somenteLivres)
      itens.push({
        chave: "livres",
        rotulo: "Pool",
        valor: "somente disponíveis",
        onRemover: () => setSomenteLivres(false),
      });
    if (periodo.de || periodo.ate)
      itens.push({
        chave: "periodo",
        rotulo: "Período",
        valor: (periodo.de ? dataCurta(periodo.de) : "...") + " → " + (periodo.ate ? dataCurta(periodo.ate) : "..."),
        onRemover: () => setPeriodo({ de: "", ate: "" }),
      });
    return itens;
  }, [areaFiltro, statusFiltro, somenteLivres, periodo]);

  /* --------------------------------- Ações -------------------------------- */

  function abrirNova(pessoa?: Usuario) {
    setPessoaAlvo(pessoa ?? null);
    setAlocacaoEdicao(null);
    setForm({ ...formularioVazio(), pessoa: pessoa ? String(pessoa.id) : "" });
    setErroForm("");
    setRetorno(null);
    setPainel("nova");
  }

  function escolherPessoa(id: string) {
    const pessoa = (usuarios.data ?? []).find((u) => String(u.id) === id) ?? null;
    setPessoaAlvo(pessoa);
    setForm((f) => ({ ...f, pessoa: id }));
  }

  function abrirEdicao(alocacao: Alocacao) {
    setAlocacaoEdicao(alocacao);
    setPessoaAlvo(
      alocacao.user_detalhe
        ? (alocacao.user_detalhe as unknown as Usuario)
        : (usuarios.data ?? []).find((u) => String(u.id) === String(alocacao.user)) ?? null
    );
    const horas = Number(alocacao.horas_planejadas);
    setForm({
      tipoAlvo: alocacao.user ? "pessoa" : "recurso",
      pessoa: alocacao.user ? String(alocacao.user) : "",
      recurso: alocacao.recurso ? String(alocacao.recurso) : "",
      percentual: alocacao.percentual,
      horas_planejadas: horas > 0 ? String(horas) : "",
      data_inicio: alocacao.data_inicio,
      data_fim: alocacao.data_fim,
      papel: alocacao.papel || "",
      project: String(alocacao.project),
      task: alocacao.task ? String(alocacao.task) : "",
      modalidade: alocacao.modalidade,
      justificativa: alocacao.justificativa || "",
      status: alocacao.status,
    });
    setErroForm("");
    setRetorno(null);
    setPainel("editar");
  }

  function aoIniciarArrasto(evento: DragStartEvent) {
    const id = String(evento.active.id).replace("pessoa-", "");
    const pessoa = (timeline.data?.pessoas ?? []).find((p) => String(p.user_id) === id);
    if (pessoa) {
      setArrastando(pessoa);
      return;
    }
    const usuario = (usuarios.data ?? []).find((u) => String(u.id) === id);
    if (usuario) {
      setArrastando({
        user_id: usuario.id,
        nome: usuario.nome,
        cor: usuario.cor,
        iniciais: usuario.iniciais,
        cargo: usuario.cargo,
        area: usuario.area,
        alocacoes: [],
      });
    }
  }

  function aoTerminarArrasto(evento: DragEndEvent) {
    setArrastando(null);
    if (!evento.over) return;
    const id = String(evento.active.id).replace("pessoa-", "");
    const usuario = (usuarios.data ?? []).find((u) => String(u.id) === id);
    if (usuario) {
      abrirNova(usuario);
      setForm({ ...formularioVazio(), pessoa: String(usuario.id), percentual: 50 });
    }
  }

  async function salvar() {
    setErroForm("");
    const percentualNumero = Math.max(1, Math.min(100, Number(form.percentual) || 100));
    const horasNumero = Number(form.horas_planejadas);
    const horasPlanejadas = Number.isFinite(horasNumero) && horasNumero > 0 ? horasNumero : 0;
    if (form.tipoAlvo === "pessoa" && !pessoaAlvo && !alocacaoEdicao) {
      setErroForm("Informe uma pessoa ou um recurso material para a alocação.");
      return;
    }
    if (form.tipoAlvo === "recurso" && !form.recurso) {
      setErroForm("Informe uma pessoa ou um recurso material para a alocação.");
      return;
    }
    if (!form.data_inicio || !form.data_fim) {
      setErroForm("Informe o período da alocação.");
      return;
    }
    if (diasEntre(form.data_inicio, form.data_fim) < 0) {
      setErroForm("A data final não pode ser anterior à inicial.");
      return;
    }
    if (!form.task && !form.project) {
      setErroForm("Selecione o projeto (ou uma tarefa) de destino.");
      return;
    }
    const corpo: Record<string, unknown> = {
      percentual: percentualNumero,
      horas_planejadas: horasPlanejadas,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      modalidade: form.modalidade,
      papel: form.papel,
      justificativa: form.justificativa,
    };
    if (form.tipoAlvo === "pessoa") {
      corpo.user = pessoaAlvo ? pessoaAlvo.id : (alocacaoEdicao ? alocacaoEdicao.user : null);
      corpo.recurso = null;
    } else {
      corpo.user = null;
      corpo.recurso = Number(form.recurso);
    }
    try {
      if (painel === "editar" && alocacaoEdicao) {
        await atualizar.mutateAsync({
          id: alocacaoEdicao.id,
          ...corpo,
          project: Number(form.project),
          task: form.task ? Number(form.task) : null,
          status: form.status,
        });
        setPainel(null);
        return;
      }
      if (form.task) {
        const resposta = await atribuir.mutateAsync({
          task: Number(form.task),
          ...corpo,
        });
        setRetorno({ conflitos: resposta.conflitos ?? [] });
        if (resposta.aviso) {
          alerta(
            "Sobrealocação detectada",
            resposta.aviso.user_nome + " fica com " + percentual(resposta.aviso.total_percentual) + " na semana de " + dataCurta(resposta.aviso.semana)
          );
        } else {
          sucesso("Alocação sem conflitos", "Nenhuma sobrealocação na semana de entrada.");
        }
      } else {
        await criar.mutateAsync({
          project: Number(form.project),
          status: form.status,
          ...corpo,
        });
      }
      setPainel(null);
    } catch (e) {
      const texto = mensagemErro(e);
      setErroForm(
        texto.indexOf("recurso material") >= 0
          ? "Informe uma pessoa ou um recurso material para concluir a alocação."
          : texto
      );
    }
  }

  /* --------------------------------- Colunas ------------------------------ */

  const colunas: Array<ColunaTabela<Alocacao>> = [
    {
      chave: "pessoa",
      titulo: "Pessoa / recurso",
      largura: "220px",
      ordenavel: true,
      valorOrdenacao: (a) => (a.user_detalhe ? a.user_detalhe.nome : a.recurso_nome),
      renderizar: (a) => (
        <div className="flex items-center gap-2">
          {a.user_detalhe ? (
            <Avatar nome={a.user_detalhe.nome} cor={a.user_detalhe.cor} iniciais={a.user_detalhe.iniciais} tamanho="xs" />
          ) : (
            <span
              className="grid size-5 place-items-center rounded-md text-[9px] font-bold"
              style={{ backgroundColor: (a.recurso_cor || "#EC4899") + "22", color: a.recurso_cor || "#EC4899" }}
            >
              R
            </span>
          )}
          <span className="truncate text-xs font-medium text-fg">
            {a.user_detalhe ? a.user_detalhe.nome : a.recurso_nome || "Sem responsável"}
          </span>
        </div>
      ),
    },
    {
      chave: "projeto",
      titulo: "Projeto / tarefa",
      ordenavel: true,
      valorOrdenacao: (a) => a.project_nome,
      renderizar: (a) => (
        <div className="min-w-0">
          <p className="truncate text-xs text-fg">
            <span className="mr-1.5 inline-block size-2 rounded-sm align-middle" style={{ backgroundColor: a.project_cor }} />
            {a.project_nome}
          </p>
          {a.task_nome && <p className="truncate text-2xs text-fg-subtle">{a.task_nome}</p>}
        </div>
      ),
    },
    {
      chave: "percentual",
      titulo: "Dedicação",
      largura: "150px",
      alinhar: "left",
      ordenavel: true,
      valorOrdenacao: (a) => a.percentual,
      renderizar: (a) => (
        <div className="w-28 space-y-0.5">
          <BarraProgresso valor={a.percentual} cor={a.percentual > 100 ? "#DC2626" : "#2563EB"} altura="sm" mostrarValor />
          {Number(a.horas_planejadas) > 0 && (
            <p className="text-2xs text-fg-subtle">{numero(Number(a.horas_planejadas))} h planejadas</p>
          )}
        </div>
      ),
    },
    {
      chave: "periodo",
      titulo: "Período",
      largura: "180px",
      ordenavel: true,
      valorOrdenacao: (a) => a.data_inicio,
      renderizar: (a) => (
        <span className="text-2xs text-fg-muted">
          {dataCurta(a.data_inicio)} → {dataCurta(a.data_fim)}
        </span>
      ),
    },
    {
      chave: "modalidade",
      titulo: "Modalidade",
      largura: "140px",
      ordenavel: true,
      valorOrdenacao: (a) => a.modalidade,
      renderizar: (a) => (
        <Etiqueta cor={corModalidade(a.modalidade)}>{rotuloModalidade(a.modalidade)}</Etiqueta>
      ),
    },
    {
      chave: "status",
      titulo: "Status",
      largura: "120px",
      ordenavel: true,
      valorOrdenacao: (a) => a.status,
      renderizar: (a) => <Etiqueta tom={tomStatus(a.status)}>{a.status_rotulo || rotuloStatus(a.status)}</Etiqueta>,
    },
    {
      chave: "custo",
      titulo: "Custo estimado",
      largura: "120px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (a) => Number(a.custo_estimado || 0),
      renderizar: (a) => <span className="text-xs tabular-nums text-fg-muted">{moeda(a.custo_estimado)}</span>,
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "130px",
      alinhar: "right",
      renderizar: (a) => (
        <div className="flex items-center justify-end gap-1">
          {a.status === "PROPOSTA" && (
            <BotaoIcone
              icone={CheckCircle2}
              rotulo="Confirmar proposta"
              variante="sucesso"
              tamanho="xs"
              onClick={() => confirmar.mutate(a.id)}
            />
          )}
          <BotaoIcone icone={Pencil} rotulo="Editar alocação" tamanho="xs" onClick={() => abrirEdicao(a)} />
          <BotaoIcone
            icone={Trash2}
            rotulo="Excluir alocação"
            variante="perigo"
            tamanho="xs"
            onClick={() => setExcluir(a)}
          />
        </div>
      ),
    },
  ];

  const carregandoBase = timeline.isLoading || ocupacao.isLoading || usuarios.isLoading;
  const erroBase = timeline.isError || ocupacao.isError;

  const celulaSelecionada = celula
    ? celula.linha.celulas.find((c) => c.semana === celula.coluna) ?? null
    : null;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Alocação de recursos"
        subtitulo={
          numero(alocacoesVigentes.length) +
          " alocações vigentes · " +
          numero(linhasOcupacao.length) +
          " pessoas no mapa de ocupação"
        }
        icone={Users}
        cor="#2563EB"
        acoes={
          <>
            <Botao
              variante="secundario"
              icone={RefreshCw}
              carregando={timeline.isFetching || ocupacao.isFetching}
              onClick={() => {
                timeline.refetch();
                ocupacao.refetch();
                conflitos.refetch();
                painelDash.refetch();
                lista.refetch();
              }}
            >
              Atualizar
            </Botao>
            <Botao variante="primario" icone={Plus} onClick={() => navegar("/matching")}>
              Matching inteligente
            </Botao>
          </>
        }
      />

      {erroBase ? (
        <Alerta tom="danger" titulo="Não foi possível carregar a alocação">
          {mensagemErro(timeline.error || ocupacao.error)}
        </Alerta>
      ) : null}

      <LinhaKPI
        itens={[
          { rotulo: "Alocações", valor: numero(kpisDashboard?.total_alocacoes ?? alocacoes.length), icone: Layers, cor: "#2563EB", subrotulo: numero(alocacoesVigentes.length) + " vigentes hoje" },
          { rotulo: "Taxa de override", valor: percentual(kpisDashboard?.taxa_override ?? 0, 1), icone: Wand2, cor: "#F59E0B", subrotulo: "alocações que sobrepuseram o motor" },
          { rotulo: "Aderência média", valor: percentual(kpisDashboard?.aderencia_media ?? 0, 1), icone: BadgeCheck, cor: "#059669", subrotulo: "score do matching nas alocações" },
          { rotulo: "Sugeridas", valor: numero(kpisDashboard?.recomendacoes.sugeridas ?? 0), icone: Sparkles, cor: "#8B5CF6", subrotulo: "aguardando decisão" },
          { rotulo: "Aceitas", valor: numero(kpisDashboard?.recomendacoes.aceitas ?? 0), icone: CheckCircle2, cor: "#059669", subrotulo: "recomendações convertidas" },
          { rotulo: "Recusadas", valor: numero(kpisDashboard?.recomendacoes.recusadas ?? 0), icone: XCircle, cor: "#DC2626", subrotulo: "descartadas pelo gestor" },
        ]}
      />

      <GradeCards colunas={2}>
        <Cartao titulo="Alocações por modalidade" subtitulo="Distribuição do modo de alocação escolhido" icone={Layers} corIcone="#2563EB">
          {(kpisDashboard?.por_modo ?? []).length ? (
            <GraficoDonut
              unidade=" alocações"
              centroRotulo="alocações"
              fatias={(kpisDashboard?.por_modo ?? []).map((m) => ({
                rotulo: rotuloModalidade(m.modalidade),
                valor: m.total,
                cor: corModalidade(m.modalidade),
              }))}
            />
          ) : (
            <Esqueleto linhas={4} />
          )}
        </Cartao>
        <Cartao
          titulo="Alocações por projeto"
          subtitulo="Top 15 projetos por quantidade de alocações"
          icone={TrendingUp}
          corIcone="#059669"
        >
          {(kpisDashboard?.por_projeto ?? []).length ? (
            <GraficoBarras
              horizontal
              altura={280}
              itens={(kpisDashboard?.por_projeto ?? []).map((p) => ({
                rotulo: p.project__nome,
                valor: p.total,
                cor: p.project__cor || "#2563EB",
              }))}
              formatarValor={(v) => numero(v) + " aloc."}
            />
          ) : (
            <Esqueleto linhas={4} />
          )}
        </Cartao>
      </GradeCards>

      <BarraFerramentas>
        <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar pessoa, cargo ou área..." className="w-64" />
        <Selecao value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)} className="h-8 w-44 py-0 text-xs">
          <option value="">Todas as áreas</option>
          {areasDisponiveis.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Selecao>
        <Selecao
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          className="h-8 w-40 py-0 text-xs"
        >
          <option value="">Todos os status</option>
          {Object.keys(STATUS_ALOCACAO).map((s) => (
            <option key={s} value={s}>
              {rotuloStatus(s)}
            </option>
          ))}
        </Selecao>
        <div className="flex items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 py-1">
          <span className="text-2xs font-medium text-fg-muted">De</span>
          <input
            type="date"
            value={periodo.de}
            onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
            className="h-6 bg-transparent text-2xs text-fg outline-none"
            aria-label="Início do período"
          />
          <span className="text-2xs text-fg-subtle">até</span>
          <input
            type="date"
            value={periodo.ate}
            onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
            className="h-6 bg-transparent text-2xs text-fg outline-none"
            aria-label="Fim do período"
          />
        </div>
        <Interruptor
          ativo={somenteLivres}
          onChange={setSomenteLivres}
          rotulo="Somente disponíveis"
          descricao="oculta quem já está com 100% ou mais"
          tamanho="sm"
        />
        <Botao variante="primario" icone={Plus} className="ml-auto" onClick={() => abrirNova()}>
          Nova alocação
        </Botao>
      </BarraFerramentas>

      <FiltrosAtivos filtros={filtrosAtivos} onLimpar={() => {
        setAreaFiltro("");
        setStatusFiltro("");
        setSomenteLivres(false);
        setPeriodo({ de: "", ate: "" });
      }} />

      <DndContext
        sensors={sensores}
        onDragStart={aoIniciarArrasto}
        onDragEnd={aoTerminarArrasto}
        onDragCancel={() => setArrastando(null)}
      >
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          <section className="xl:col-span-3" aria-label="Pool de colaboradores">
            <Cartao
              titulo="Pool de colaboradores"
              subtitulo={numero(pool.length) + " pessoa(s) · arraste para a timeline"}
              icone={Users}
              corIcone="#2563EB"
            >
              {usuarios.isLoading ? (
                <CarregandoBloco rotulo="Carregando colaboradores..." />
              ) : usuarios.isError ? (
                <Alerta tom="danger" titulo="Falha ao carregar o pool">
                  {mensagemErro(usuarios.error)}
                </Alerta>
              ) : pool.length === 0 ? (
                <Vazio
                  icone={Users}
                  titulo="Nenhum colaborador encontrado"
                  descricao="Ajuste os filtros de busca, área ou disponibilidade."
                />
              ) : (
                <div className="grid max-h-[560px] grid-cols-1 gap-2 overflow-y-auto pr-1 scroll-thin">
                  {pool.map((pessoa) => {
                    const linha = porPessoa.get(pessoa.id);
                    const ativas = alocacoesVigentes.filter((a) => a.user === pessoa.id).length;
                    return (
                      <CartaoPessoa
                        key={pessoa.id}
                        pessoa={pessoa}
                        ocupacaoMedia={linha ? linha.media : 0}
                        alocacoesAtivas={ativas}
                        aoAlocar={abrirNova}
                        aoAbrirCapacidade={(u) => navegar("/capacidade/" + u.id)}
                      />
                    );
                  })}
                </div>
              )}
            </Cartao>
          </section>

          <section className="xl:col-span-6" aria-label="Timeline de alocações por pessoa">
            <Cartao
              titulo="Timeline de alocações"
              subtitulo={
                "Janela de " + dataCurta(janela.inicio) + " a " + dataCurta(janela.fim) + " · solte o card sobre a linha da pessoa"
              }
              icone={CalendarClock}
              corIcone="#0891B2"
            >
              {carregandoBase ? (
                <div className="space-y-2">
                  <Esqueleto linhas={6} />
                  <CarregandoBloco rotulo="Montando timeline..." />
                </div>
              ) : pessoasTimeline.length === 0 ? (
                <Vazio
                  icone={CalendarClock}
                  titulo="Nenhuma alocação no período"
                  descricao="Arraste um colaborador do pool para criar a primeira alocação."
                />
              ) : (
                <div className="max-h-[600px] space-y-2 overflow-y-auto pr-1 scroll-thin">
                  {pessoasTimeline.map((pessoa) => (
                    <LinhaTimelinePessoa
                      key={pessoa.user_id}
                      pessoa={pessoa}
                      janela={janela}
                      emConflito={pessoasConflito.has(pessoa.user_id)}
                      ocupacaoMedia={porPessoa.get(pessoa.user_id)?.media ?? 0}
                      aoSelecionar={(item) => {
                        const completa = alocacoes.find((a) => a.id === item.id);
                        if (completa) abrirEdicao(completa);
                      }}
                    />
                  ))}
                </div>
              )}
            </Cartao>
          </section>

          <section className="xl:col-span-3" aria-label="Painel de conflitos">
            <Cartao
              titulo="Conflitos de alocação"
              subtitulo={numero(totalConflitos) + " sobrealocação(ões) · " + numero(conflitos.data?.criticos ?? 0) + " críticas"}
              icone={ShieldAlert}
              corIcone="#DC2626"
            >
              {retorno && retorno.conflitos.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Após a última alocação</p>
                  {retorno.conflitos.map((c, i) => (
                    <Alerta key={c.user_id + "-" + c.semana + "-" + i} tom="danger" titulo={c.user_nome + " · " + dataCurta(c.semana)}>
                      {percentual(c.total_percentual) + " alocado (" + percentual(c.excesso) + " acima do limite)"}
                    </Alerta>
                  ))}
                </div>
              )}
              {conflitos.isLoading ? (
                <Esqueleto linhas={4} />
              ) : (conflitos.data?.conflitos ?? []).length === 0 ? (
                <Vazio
                  icone={CheckCircle2}
                  titulo="Nenhuma sobrealocação"
                  descricao="Todas as pessoas estão com carga igual ou abaixo de 100%."
                />
              ) : (
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1 scroll-thin">
                  {(conflitos.data?.conflitos ?? []).map((c, i) => (
                    <button
                      key={c.user_id + "-" + c.semana + "-" + i}
                      type="button"
                      onClick={() => setConflitoAberto(c)}
                      className="w-full text-left"
                    >
                      <Alerta
                        tom={c.severidade === "CRITICO" ? "danger" : "warning"}
                        titulo={c.user_nome + " · semana de " + dataCurta(c.semana)}
                        icone={c.severidade === "CRITICO" ? Flame : AlertTriangle}
                      >
                        {percentual(c.total_percentual) + " alocado · excesso de " + percentual(c.excesso) + " em " + numero(c.alocacoes.length) + " alocação(ões)"}
                      </Alerta>
                    </button>
                  ))}
                </div>
              )}
            </Cartao>
          </section>
        </div>

        <DragOverlay dropAnimation={null}>
          {arrastando ? (
            <div className="flex items-center gap-2 rounded-sgp border border-brand bg-surface px-3 py-2 shadow-n3">
              <Avatar nome={arrastando.nome} cor={arrastando.cor} iniciais={arrastando.iniciais} tamanho="sm" />
              <div>
                <p className="text-xs font-semibold text-fg">{arrastando.nome}</p>
                <p className="text-2xs text-fg-muted">Solte sobre a linha da pessoa</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <SecaoColapsavel
        titulo="Heatmap de ocupação da equipe"
        icone={Flame}
        contagem={linhasOcupacao.length}
        abertoInicial
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">
            Utilização média da equipe: <strong className="text-fg">{percentual(utilizacaoMedia, 1)}</strong> · clique em uma
            célula para ver os projetos
          </p>
          <EscalaCores
            titulo="Ocupação semanal"
            rotulos={["0%", "1-84%", "85-100%", ">100%"]}
            cores={CORES_OCUPACAO}
          />
        </div>
        {ocupacao.isLoading ? (
          <CarregandoBloco rotulo="Calculando ocupação..." />
        ) : (
          <Heatmap
            linhas={linhasOcupacao.map((l) => ({
              id: l.user_id,
              rotulo: l.nome,
              sub: l.area,
              cor: l.cor,
              avatar: <Avatar nome={l.nome} cor={l.cor} iniciais={l.iniciais} tamanho="xs" />,
            }))}
            colunas={semanas.map((s) => ({ id: s.semana, rotulo: s.rotulo }))}
            celulas={(linhaId, colunaId): CelulaHeatmap => {
              const linha = linhasOcupacao.find((l) => String(l.user_id) === String(linhaId));
              const celulaAtual = linha?.celulas.find((c) => c.semana === colunaId);
              const valor = celulaAtual?.valor ?? 0;
              return {
                valor,
                rotulo: valor ? percentual(valor) + " alocado" : "Sem alocação",
                cor: corOcupacao(valor),
                detalhe: (
                  <div className="space-y-0.5">
                    <p className="font-semibold text-fg">
                      {linha?.nome} · semana de {dataCurta(String(colunaId))}
                    </p>
                    <p className="text-fg-muted">
                      {valor ? percentual(valor) + " de dedicação" : "Nenhuma alocação registrada"}
                    </p>
                    {celulaAtual && celulaAtual.projetos.length > 0 && (
                      <p className="text-fg-subtle">{celulaAtual.projetos.join(", ")}</p>
                    )}
                  </div>
                ),
              };
            }}
            maximo={150}
            larguraColuna={46}
            larguraLinha={220}
            formatoValor={(v) => (v ? numero(v) + "%" : "—")}
            corDe={(v) => corOcupacao(v)}
            aoClicarCelula={(linhaId, colunaId) => {
              const linha = linhasOcupacao.find((l) => String(l.user_id) === String(linhaId));
              if (linha) setCelula({ linha, coluna: String(colunaId) });
            }}
          />
        )}
      </SecaoColapsavel>

      <Cartao
        titulo="Alocações registradas"
        subtitulo={numero(alocacoes.length) + " registro(s) · edite, confirme propostas ou exclua"}
        icone={Layers}
        corIcone="#8B5CF6"
        semPadding
      >
        {lista.isLoading ? (
          <CarregandoBloco rotulo="Carregando alocações..." />
        ) : lista.isError ? (
          <div className="p-4">
            <Alerta tom="danger" titulo="Falha ao carregar alocações">
              {mensagemErro(lista.error)}
            </Alerta>
          </div>
        ) : (
          <Tabela
            colunas={colunas}
            dados={alocacoes}
            compacta
            destaqueLinha={(a) => (a.percentual > 100 ? "bg-danger-soft/25" : undefined)}
            vazio={
              <Vazio
                icone={Layers}
                titulo="Nenhuma alocação cadastrada"
                descricao="Use o pool à esquerda e arraste um colaborador para a timeline."
              />
            }
          />
        )}
      </Cartao>

      <PainelLateral
        aberto={painel !== null}
        onFechar={() => setPainel(null)}
        largura="md"
        titulo={painel === "editar" ? "Editar alocação" : "Confirmar alocação"}
        subtitulo={
          pessoaAlvo
            ? pessoaAlvo.nome + " · " + (pessoaAlvo.cargo || "sem cargo")
            : alocacaoEdicao
              ? alocacaoEdicao.user_detalhe?.nome ?? alocacaoEdicao.recurso_nome
              : "Defina os dados da alocação"
        }
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setPainel(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={CheckCircle2}
              carregando={criar.isPending || atribuir.isPending || atualizar.isPending}
              onClick={salvar}
            >
              {painel === "editar" ? "Salvar alterações" : "Confirmar alocação"}
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          {erroForm && (
            <Alerta tom="danger" titulo="Não foi possível salvar">
              {erroForm}
            </Alerta>
          )}

          {painel === "nova" && (
            <div className="space-y-2 rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Tipo de alocação</p>
              <Segmentado<TipoAlvoAlocacao>
                valor={form.tipoAlvo}
                onChange={(valor) => setForm((f) => ({ ...f, tipoAlvo: valor }))}
                opcoes={[
                  { valor: "pessoa", rotulo: "Pessoa", icone: Users, titulo: "Alocar um colaborador" },
                  {
                    valor: "recurso",
                    rotulo: "Recurso material",
                    icone: Boxes,
                    titulo: "Alocar equipamento, software, material ou serviço",
                  },
                ]}
              />
              {form.tipoAlvo === "pessoa" ? (
                <Campo rotulo="Pessoa" obrigatorio htmlFor="alocacao-pessoa">
                  <Selecao id="alocacao-pessoa" value={form.pessoa} onChange={(e) => escolherPessoa(e.target.value)}>
                    <option value="">Selecione a pessoa</option>
                    {(usuarios.data ?? []).map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.cargo ? u.nome + " · " + u.cargo : u.nome}
                      </option>
                    ))}
                  </Selecao>
                </Campo>
              ) : (
                <Campo
                  rotulo="Recurso material"
                  obrigatorio
                  htmlFor="alocacao-recurso"
                  dica="Equipamento, software, material ou serviço terceirizado."
                >
                  <Selecao
                    id="alocacao-recurso"
                    value={form.recurso}
                    onChange={(e) => setForm((f) => ({ ...f, recurso: e.target.value }))}
                  >
                    <option value="">Selecione o recurso</option>
                    {(recursos.data ?? []).map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.codigo ? r.nome + " · " + r.codigo : r.nome}
                      </option>
                    ))}
                  </Selecao>
                </Campo>
              )}
            </div>
          )}

          {painel === "editar" && pessoaAlvo && (
            <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
              <Avatar nome={pessoaAlvo.nome} cor={pessoaAlvo.cor} iniciais={pessoaAlvo.iniciais} tamanho="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{pessoaAlvo.nome}</p>
                <p className="truncate text-2xs text-fg-muted">
                  {pessoaAlvo.cargo || "Sem cargo"} · {pessoaAlvo.area || "Sem área"}
                </p>
                <p className="truncate text-2xs text-fg-subtle">
                  {pessoaAlvo.custo_hora_visivel && pessoaAlvo.custo_hora !== null
                    ? moeda(pessoaAlvo.custo_hora) + "/hora"
                    : "Custo restrito ao seu perfil"}
                </p>
              </div>
              {porPessoa.get(pessoaAlvo.id) && (
                <Etiqueta tom={porPessoa.get(pessoaAlvo.id)!.media > 100 ? "danger" : "info"}>
                  {percentual(porPessoa.get(pessoaAlvo.id)!.media)} ocupado
                </Etiqueta>
              )}
            </div>
          )}

          {painel === "editar" && !pessoaAlvo && alocacaoEdicao && (
            <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold"
                style={{
                  backgroundColor: (alocacaoEdicao.recurso_cor || "#EC4899") + "1f",
                  color: alocacaoEdicao.recurso_cor || "#EC4899",
                }}
                aria-hidden
              >
                R
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">
                  {alocacaoEdicao.recurso_nome || "Recurso material"}
                </p>
                <p className="truncate text-2xs text-fg-muted">
                  Recurso material · {numero(alocacaoEdicao.horas)} h planejadas
                </p>
              </div>
              <Etiqueta cor={alocacaoEdicao.recurso_cor || "#EC4899"}>Recurso material</Etiqueta>
            </div>
          )}

          <Campo rotulo="Projeto" obrigatorio htmlFor="alocacao-projeto">
            <Selecao
              id="alocacao-projeto"
              value={form.project}
              onChange={(e) => setForm((f) => ({ ...f, project: e.target.value, task: "" }))}
            >
              <option value="">Selecione o projeto</option>
              {(projetos.data ?? []).map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.codigo + " · " + p.nome}
                </option>
              ))}
            </Selecao>
          </Campo>

          <Campo
            rotulo="Tarefa (opcional)"
            dica={form.project ? "Ao escolher uma tarefa, a alocação é registrada pelo endpoint de atribuição." : "Escolha um projeto para listar as tarefas."}
            htmlFor="alocacao-tarefa"
          >
            <Selecao
              id="alocacao-tarefa"
              value={form.task}
              disabled={!form.project}
              onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))}
            >
              <option value="">Sem tarefa específica</option>
              {(tarefas.data ?? []).map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.wbs ? t.wbs + " · " + t.nome : t.nome}
                </option>
              ))}
            </Selecao>
          </Campo>

          <ControleDeslizante
            valor={form.percentual}
            onChange={(v) => setForm((f) => ({ ...f, percentual: v }))}
            min={1}
            max={100}
            rotulo="Percentual de dedicação"
            sufixo="%"
            marcos={[25, 50, 75, 100]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início" obrigatorio htmlFor="alocacao-inicio">
              <Entrada
                id="alocacao-inicio"
                type="date"
                value={form.data_inicio}
                onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Fim" obrigatorio htmlFor="alocacao-fim">
              <Entrada
                id="alocacao-fim"
                type="date"
                value={form.data_fim}
                onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Papel no projeto" htmlFor="alocacao-papel">
              <Entrada
                id="alocacao-papel"
                value={form.papel}
                placeholder="Ex.: Tech Lead"
                onChange={(e) => setForm((f) => ({ ...f, papel: e.target.value }))}
              />
            </Campo>
            <Campo
              rotulo="Horas planejadas"
              htmlFor="alocacao-horas"
              dica={
                form.tipoAlvo === "recurso"
                  ? "Base do custo estimado do recurso material."
                  : "Vazio usa a capacidade do período com o percentual de dedicação."
              }
            >
              <Entrada
                id="alocacao-horas"
                type="number"
                min={0}
                step="0.5"
                value={form.horas_planejadas}
                placeholder="Ex.: 80"
                onChange={(e) => setForm((f) => ({ ...f, horas_planejadas: e.target.value }))}
              />
            </Campo>
          </div>

          {form.tipoAlvo === "pessoa" && (
            <Campo rotulo="Modalidade" htmlFor="alocacao-modalidade">
              <Selecao
                id="alocacao-modalidade"
                value={form.modalidade}
                onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value }))}
              >
                {Object.keys(MODALIDADES).map((m) => (
                  <option key={m} value={m}>
                    {rotuloModalidade(m)}
                  </option>
                ))}
              </Selecao>
            </Campo>
          )}

          <Campo rotulo="Status" htmlFor="alocacao-status">
            <Selecao
              id="alocacao-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {Object.keys(STATUS_ALOCACAO).map((s) => (
                <option key={s} value={s}>
                  {rotuloStatus(s)}
                </option>
              ))}
            </Selecao>
          </Campo>

          <Campo
            rotulo="Justificativa"
            dica="Registrada na auditoria da alocação e visível para o PMO."
            htmlFor="alocacao-justificativa"
          >
            <AreaTexto
              id="alocacao-justificativa"
              rows={3}
              value={form.justificativa}
              placeholder={
                form.tipoAlvo === "recurso"
                  ? "Por que este recurso material é necessário?"
                  : "Por que esta pessoa é a escolha adequada?"
              }
              onChange={(e) => setForm((f) => ({ ...f, justificativa: e.target.value }))}
            />
          </Campo>

          {retorno && retorno.conflitos.length > 0 && (
            <Alerta tom="warning" titulo="Sobrealocação detectada pelo motor" icone={AlertTriangle}>
              <ul className="space-y-1">
                {retorno.conflitos.map((c, i) => (
                  <li key={c.user_id + "-" + c.semana + "-" + i}>
                    {c.user_nome + " · semana de " + dataCurta(c.semana) + " · " + percentual(c.total_percentual)}
                  </li>
                ))}
              </ul>
            </Alerta>
          )}

          {form.tipoAlvo === "pessoa" && (
            <Alerta tom="info" titulo="Como o motor avalia" icone={Sparkles}>
              O score considera skills, disponibilidade, custo, preferência, experiência e proximidade. Use a tela de
              matching para ver a decomposição completa antes de alocar.
            </Alerta>
          )}
        </div>
      </PainelLateral>

      <Modal
        aberto={excluir !== null}
        onFechar={() => setExcluir(null)}
        titulo="Excluir alocação"
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setExcluir(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={remover.isPending}
              onClick={async () => {
                if (!excluir) return;
                try {
                  await remover.mutateAsync(excluir.id);
                  setExcluir(null);
                } catch (e) {
                  erro("Não foi possível excluir", mensagemErro(e));
                }
              }}
            >
              Excluir definitivamente
            </Botao>
          </>
        }
      >
        {excluir && (
          <div className="space-y-3">
            <p className="text-sm text-fg">
              A alocação de{" "}
              <strong>{excluir.user_detalhe ? excluir.user_detalhe.nome : excluir.recurso_nome}</strong> em{" "}
              <strong>{excluir.project_nome}</strong> será removida.
            </p>
            <p className="text-xs text-fg-muted">
              Período {dataCurta(excluir.data_inicio)} → {dataCurta(excluir.data_fim)} · {percentual(excluir.percentual)} de
              dedicação. Esta ação é registrada na auditoria.
            </p>
          </div>
        )}
      </Modal>

      <PainelLateral
        aberto={celula !== null}
        onFechar={() => setCelula(null)}
        largura="sm"
        titulo={celula ? celula.linha.nome : "Célula"}
        subtitulo={celula ? "Semana de " + dataCurta(celula.coluna) : ""}
      >
        {celula && celulaSelecionada && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
              <Avatar nome={celula.linha.nome} cor={celula.linha.cor} iniciais={celula.linha.iniciais} tamanho="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{celula.linha.nome}</p>
                <p className="truncate text-2xs text-fg-muted">{celula.linha.area || "Sem área"}</p>
              </div>
              <AnelOcupacao valor={celulaSelecionada.valor} />
            </div>
            <Campo rotulo="Projetos na semana">
              {celulaSelecionada.projetos.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {celulaSelecionada.projetos.map((p) => (
                    <Chip key={p} cor="#2563EB" icone={Layers}>
                      {p}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">Nenhum projeto alocado nesta semana.</p>
              )}
            </Campo>
            <Campo rotulo="Média do período">
              <BarraProgresso
                valor={Math.min(100, celula.linha.media)}
                cor={corOcupacao(celula.linha.media) === "var(--sgp-surface-2)" ? "#0891B2" : corOcupacao(celula.linha.media)}
                mostrarValor
                rotulo="Ocupação média"
              />
            </Campo>
          </div>
        )}
      </PainelLateral>

      <Modal
        aberto={conflitoAberto !== null}
        onFechar={() => setConflitoAberto(null)}
        titulo={conflitoAberto ? "Conflito de " + conflitoAberto.user_nome : "Conflito"}
        subtitulo={conflitoAberto ? "Semana de " + dataCurta(conflitoAberto.semana) : ""}
        largura="md"
      >
        {conflitoAberto && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Avatar nome={conflitoAberto.user_nome} cor={conflitoAberto.user_cor} tamanho="md" />
              <div>
                <p className="text-sm font-semibold text-fg">{percentual(conflitoAberto.total_percentual)} alocado</p>
                <p className="text-2xs text-fg-muted">
                  Excesso de {percentual(conflitoAberto.excesso)} · severidade {conflitoAberto.severidade === "CRITICO" ? "crítica" : "alerta"}
                </p>
              </div>
              <Etiqueta tom={conflitoAberto.severidade === "CRITICO" ? "danger" : "warning"} className="ml-auto">
                {conflitoAberto.severidade === "CRITICO" ? "Crítico" : "Alerta"}
              </Etiqueta>
            </div>
            <div className="space-y-1.5">
              {conflitoAberto.alocacoes.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-sgp border border-border bg-surface-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-fg">{a.projeto}</p>
                    <p className="truncate text-2xs text-fg-subtle">{a.tarefa || "Sem tarefa"} · {a.periodo}</p>
                  </div>
                  <Etiqueta tom="info">{percentual(a.percentual)}</Etiqueta>
                </div>
              ))}
            </div>
            <Alerta tom="warning" titulo="Ação recomendada" icone={AlertTriangle}>
              Redistribua parte da dedicação para outra pessoa ou reduza o percentual em uma das alocações da semana.
            </Alerta>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AnelOcupacao({ valor }: { valor: number }) {
  const cor = valor > 100 ? "#DC2626" : valor >= 85 ? "#D97706" : valor > 0 ? "#0891B2" : "#64748B";
  return (
    <span className="ml-auto flex items-center gap-2">
      <span className="text-lg font-bold tabular-nums" style={{ color: cor }}>
        {percentual(valor)}
      </span>
    </span>
  );
}

import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  Ban,
  Check,
  Circle,
  CircleCheck,
  CircleDot,
  CirclePlay,
  Eye,
  Flag,
  Gauge,
  Grid3x3,
  Inbox,
  Layers,
  Link2,
  Lock,
  MousePointerClick,
  Pencil,
  Plus,
  Rocket,
  Send,
  ShieldAlert,
  Star,
  Target,
  Timer,
  Trash2,
  Unlink,
  Users,
  Workflow as WorkflowIcon,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  Entrada,
  Esqueleto,
  Etiqueta,
  GradeCards,
  Interruptor,
  Modal,
  PainelLateral,
  SecaoColapsavel,
  Selecao,
  Vazio,
  useAvisos,
} from "@/components/ui";
import { useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { numero } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Tipos locais (RF-40)
   ========================================================================== */

interface Workflow {
  id: number;
  nome: string;
  entidade: string;
  descricao: string;
  is_padrao: boolean;
  criado_em: string;
}

interface EstadoWorkflow {
  id: number;
  workflow: number;
  nome: string;
  chave: string;
  cor: string;
  icone: string;
  ordem: number;
  wip_limit: number;
  is_inicial: boolean;
  is_final: boolean;
  posicao_x: number;
  posicao_y: number;
}

interface TransicaoWorkflow {
  id: number;
  workflow: number;
  de: number;
  para: number;
  nome: string;
  requer_aprovacao: boolean;
  de_nome?: string;
  para_nome?: string;
}

interface Posicao {
  x: number;
  y: number;
}

interface FormEstado {
  nome: string;
  chave: string;
  cor: string;
  icone: string;
  ordem: string;
  wip_limit: string;
  is_inicial: boolean;
  is_final: boolean;
}

interface FormTransicao {
  de: string;
  para: string;
  nome: string;
  requer_aprovacao: boolean;
}

interface EnvioEstado {
  id?: number;
  workflow: number;
  nome: string;
  chave: string;
  cor: string;
  icone: string;
  ordem: number;
  wip_limit: number;
  is_inicial: boolean;
  is_final: boolean;
  posicao_x: number;
  posicao_y: number;
}

interface EnvioTransicao {
  id?: number;
  workflow: number | null;
  de: number;
  para: number;
  nome: string;
  requer_aprovacao: boolean;
}

/* ==========================================================================
   Catálogos visuais
   ========================================================================== */

const LARGURA_NO = 182;
const ALTURA_NO = 74;
const LARGURA_CANVAS = 1560;
const ALTURA_CANVAS = 900;

const ICONES_ESTADO: Record<string, LucideIcon> = {
  inbox: Inbox,
  circle: Circle,
  "play-circle": CirclePlay,
  eye: Eye,
  ban: Ban,
  "check-circle": CircleCheck,
  "circle-dot": CircleDot,
  star: Star,
  target: Target,
  rocket: Rocket,
  flag: Flag,
  lock: Lock,
  send: Send,
  timer: Timer,
  users: Users,
  "shield-alert": ShieldAlert,
  workflow: WorkflowIcon,
  layers: Layers,
  gauge: Gauge,
  activity: Activity,
  zap: Zap,
};

const NOMES_ICONES = Object.keys(ICONES_ESTADO);

const CORES_ESTADO = [
  "#94A3B8",
  "#64748B",
  "#3B82F6",
  "#0EA5E9",
  "#14B8A6",
  "#10B981",
  "#84CC16",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#6366F1",
];

const ENTIDADES = [
  { valor: "tarefa", rotulo: "Tarefa" },
  { valor: "projeto", rotulo: "Projeto" },
  { valor: "risco", rotulo: "Risco" },
  { valor: "issue", rotulo: "Issue" },
];

const FORM_ESTADO_VAZIO: FormEstado = {
  nome: "",
  chave: "",
  cor: "#3B82F6",
  icone: "circle",
  ordem: "0",
  wip_limit: "0",
  is_inicial: false,
  is_final: false,
};

const FORM_TRANSICAO_VAZIA: FormTransicao = {
  de: "",
  para: "",
  nome: "",
  requer_aprovacao: false,
};

function iconeEstado(nome: string): LucideIcon {
  return ICONES_ESTADO[nome] || Circle;
}

/* ==========================================================================
   Nó arrastável do canvas
   ========================================================================== */

function NoEstado({
  estado,
  posicao,
  selecionado,
  origemConexao,
  modoConexao,
  onClicar,
}: {
  estado: EstadoWorkflow;
  posicao: Posicao;
  selecionado: boolean;
  origemConexao: boolean;
  modoConexao: boolean;
  onClicar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "estado-" + estado.id,
    data: { estadoId: estado.id },
  });
  const Icone = iconeEstado(estado.icone);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClicar}
      role="button"
      tabIndex={0}
      aria-label={"Estado " + estado.nome}
      style={{
        left: posicao.x,
        top: posicao.y,
        width: LARGURA_NO,
        minHeight: ALTURA_NO,
        transform: CSS.Translate.toString(transform),
        touchAction: "none",
        borderColor: selecionado ? estado.cor : undefined,
        boxShadow: selecionado ? "0 0 0 3px " + estado.cor + "33" : undefined,
      }}
      className={cn(
        "absolute select-none rounded-sgp-lg border border-border bg-surface p-2.5 shadow-n1 transition-shadow",
        modoConexao ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing",
        isDragging && "drag-ghost z-30",
        origemConexao && "ring-2 ring-brand"
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: estado.cor + "1f", color: estado.cor }}
        >
          <Icone className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-fg">{estado.nome}</p>
          <p className="truncate font-mono text-2xs text-fg-subtle">{estado.chave}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {estado.is_inicial && <Etiqueta tom="success" icone={Rocket}>inicial</Etiqueta>}
        {estado.is_final && <Etiqueta tom="brand" icone={Flag}>final</Etiqueta>}
        {estado.wip_limit > 0 && <Etiqueta tom="warning">WIP {estado.wip_limit}</Etiqueta>}
        <Etiqueta tom="neutral">{"ordem " + estado.ordem}</Etiqueta>
      </div>
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function AdminWorkflows() {
  const { sucesso, erro, alerta } = useAvisos();

  const [workflowId, setWorkflowId] = useState<number | null>(null);
  const [posicoes, setPosicoes] = useState<Record<number, Posicao>>({});
  const [modoConexao, setModoConexao] = useState(false);
  const [origemConexao, setOrigemConexao] = useState<number | null>(null);
  const [estadoSelecionado, setEstadoSelecionado] = useState<number | null>(null);

  const workflows = useLista<Workflow>(CHAVES.workflows, "/workflows/");
  const estados = useLista<EstadoWorkflow>(
    ["workflow-estados", String(workflowId || "")],
    workflowId ? "/workflow-estados/" : null,
    { workflow: workflowId }
  );
  const transicoes = useLista<TransicaoWorkflow>(
    ["workflow-transicoes", String(workflowId || "")],
    workflowId ? "/workflow-transicoes/" : null,
    { workflow: workflowId }
  );

  const listaWorkflows = workflows.data || [];
  const listaEstados = useMemo(() => estados.data || [], [estados.data]);
  const listaTransicoes = useMemo(() => transicoes.data || [], [transicoes.data]);
  const workflowAtual = listaWorkflows.find((w) => w.id === workflowId) || null;

  useEffect(() => {
    if (workflowId === null && listaWorkflows.length) {
      const padrao = listaWorkflows.find((w) => w.is_padrao);
      setWorkflowId((padrao || listaWorkflows[0]).id);
    }
  }, [listaWorkflows, workflowId]);

  useEffect(() => {
    const mapa: Record<number, Posicao> = {};
    listaEstados.forEach((e) => {
      mapa[e.id] = { x: Number(e.posicao_x) || 0, y: Number(e.posicao_y) || 0 };
    });
    setPosicoes(mapa);
    setOrigemConexao(null);
  }, [listaEstados]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const posicaoDe = (id: number): Posicao => posicoes[id] || { x: 0, y: 0 };

  /* ------------------------------------------------- painel de estado */

  const [painelEstado, setPainelEstado] = useState(false);
  const [estadoEmEdicao, setEstadoEmEdicao] = useState<EstadoWorkflow | null>(null);
  const [formEstado, setFormEstado] = useState<FormEstado>(FORM_ESTADO_VAZIO);

  /* ---------------------------------------------- painel de transição */

  const [painelTransicao, setPainelTransicao] = useState(false);
  const [transicaoEmEdicao, setTransicaoEmEdicao] = useState<TransicaoWorkflow | null>(null);
  const [formTransicao, setFormTransicao] = useState<FormTransicao>(FORM_TRANSICAO_VAZIA);

  /* ---------------------------------------------------------- mutações */

  const moverEstado = useMutacao<{ id: number; posicao_x: number; posicao_y: number }, EstadoWorkflow>({
    metodo: "patch",
    url: (v) => "/workflow-estados/" + v.id + "/",
    invalidar: [["workflow-estados", String(workflowId || "")]],
  });

  const salvarEstado = useMutacao<EnvioEstado, EstadoWorkflow>({
    metodo: estadoEmEdicao ? "patch" : "post",
    url: (v) => (v.id ? "/workflow-estados/" + v.id + "/" : "/workflow-estados/"),
    invalidar: [["workflow-estados", String(workflowId || "")], [...CHAVES.workflows]],
    mensagemSucesso: "Estado salvo",
    aoSucesso: () => setPainelEstado(false),
  });

  const excluirEstado = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/workflow-estados/" + v.id + "/",
    invalidar: [["workflow-estados", String(workflowId || "")], ["workflow-transicoes", String(workflowId || "")]],
    mensagemSucesso: "Estado excluído",
    aoSucesso: () => {
      setConfirmacao(null);
      setPainelEstado(false);
    },
  });

  const salvarTransicao = useMutacao<EnvioTransicao, TransicaoWorkflow>({
    metodo: transicaoEmEdicao ? "patch" : "post",
    url: (v) => (v.id ? "/workflow-transicoes/" + v.id + "/" : "/workflow-transicoes/"),
    invalidar: [["workflow-transicoes", String(workflowId || "")]],
    mensagemSucesso: "Transição salva",
    aoSucesso: () => {
      setPainelTransicao(false);
      setOrigemConexao(null);
    },
  });

  const excluirTransicao = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/workflow-transicoes/" + v.id + "/",
    invalidar: [["workflow-transicoes", String(workflowId || "")]],
    mensagemSucesso: "Transição excluída",
    aoSucesso: () => setConfirmacao(null),
  });

  const salvarWorkflow = useMutacao<Record<string, unknown>, Workflow>({
    url: "/workflows/",
    invalidar: [[...CHAVES.workflows]],
    mensagemSucesso: "Workflow criado",
    aoSucesso: (resposta) => {
      setModalWorkflow(false);
      setWorkflowId(resposta.id);
    },
  });

  const excluirWorkflow = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/workflows/" + v.id + "/",
    invalidar: [[...CHAVES.workflows]],
    mensagemSucesso: "Workflow excluído",
    aoSucesso: () => {
      setConfirmacao(null);
      setWorkflowId(null);
    },
  });

  const abrirNovoEstado = () => {
    setEstadoEmEdicao(null);
    setFormEstado({ ...FORM_ESTADO_VAZIO, ordem: String(listaEstados.length) });
    setPainelEstado(true);
  };

  const abrirEdicaoEstado = (e: EstadoWorkflow) => {
    setEstadoEmEdicao(e);
    setFormEstado({
      nome: e.nome,
      chave: e.chave,
      cor: e.cor,
      icone: e.icone,
      ordem: String(e.ordem),
      wip_limit: String(e.wip_limit),
      is_inicial: e.is_inicial,
      is_final: e.is_final,
    });
    setPainelEstado(true);
  };

  const enviarEstado = () => {
    if (!workflowId) {
      erro("Selecione um workflow antes de criar estados");
      return;
    }
    if (!formEstado.nome.trim() || !formEstado.chave.trim()) {
      erro("Informe nome e chave do estado");
      return;
    }
    const posicao = estadoEmEdicao ? posicaoDe(estadoEmEdicao.id) : { x: 40, y: 40 + listaEstados.length * 96 };
    const corpo: EnvioEstado = {
      workflow: workflowId,
      nome: formEstado.nome.trim(),
      chave: formEstado.chave.trim().toUpperCase().replace(/ /g, "_"),
      cor: formEstado.cor,
      icone: formEstado.icone,
      ordem: Number(formEstado.ordem) || 0,
      wip_limit: Number(formEstado.wip_limit) || 0,
      is_inicial: formEstado.is_inicial,
      is_final: formEstado.is_final,
      posicao_x: posicao.x,
      posicao_y: posicao.y,
    };
    if (estadoEmEdicao) corpo.id = estadoEmEdicao.id;
    salvarEstado.mutate(corpo);
  };

  const abrirNovaTransicao = () => {
    setTransicaoEmEdicao(null);
    setFormTransicao({
      de: listaEstados.length ? String(listaEstados[0].id) : "",
      para: listaEstados.length > 1 ? String(listaEstados[1].id) : "",
      nome: "",
      requer_aprovacao: false,
    });
    setPainelTransicao(true);
  };

  const abrirEdicaoTransicao = (t: TransicaoWorkflow) => {
    setTransicaoEmEdicao(t);
    setFormTransicao({
      de: String(t.de),
      para: String(t.para),
      nome: t.nome,
      requer_aprovacao: t.requer_aprovacao,
    });
    setPainelTransicao(true);
  };

  const enviarTransicao = () => {
    if (!workflowId) {
      erro("Selecione um workflow");
      return;
    }
    if (!formTransicao.de || !formTransicao.para) {
      erro("Selecione os estados de origem e destino");
      return;
    }
    if (formTransicao.de === formTransicao.para) {
      alerta("Transição inválida", "Escolha estados diferentes para origem e destino.");
      return;
    }
    const corpo: EnvioTransicao = {
      workflow: workflowId,
      de: Number(formTransicao.de),
      para: Number(formTransicao.para),
      nome: formTransicao.nome.trim(),
      requer_aprovacao: formTransicao.requer_aprovacao,
    };
    if (transicaoEmEdicao) corpo.id = transicaoEmEdicao.id;
    salvarTransicao.mutate(corpo);
  };

  const nomeEstado = (id: number) => {
    const encontrado = listaEstados.find((e) => e.id === id);
    return encontrado ? encontrado.nome : "estado " + id;
  };

  /* ------------------------------------------------------ interações */

  const aoTerminarArraste = (evento: DragEndEvent) => {
    const dados = evento.active.data.current as { estadoId?: number } | undefined;
    if (!dados || !dados.estadoId) return;
    const atual = posicaoDe(dados.estadoId);
    const x = Math.max(0, Math.min(LARGURA_CANVAS - LARGURA_NO, Math.round(atual.x + evento.delta.x)));
    const y = Math.max(0, Math.min(ALTURA_CANVAS - ALTURA_NO, Math.round(atual.y + evento.delta.y)));
    setPosicoes((mapa) => ({ ...mapa, [dados.estadoId as number]: { x, y } }));
    moverEstado.mutate({ id: dados.estadoId, posicao_x: x, posicao_y: y });
  };

  const clicarNo = (estado: EstadoWorkflow) => {
    if (!modoConexao) {
      setEstadoSelecionado(estado.id);
      abrirEdicaoEstado(estado);
      return;
    }
    if (origemConexao === null) {
      setOrigemConexao(estado.id);
      sucesso("Origem definida", "Agora clique no estado de destino para criar a transição.");
      return;
    }
    if (origemConexao === estado.id) {
      setOrigemConexao(null);
      return;
    }
    const jaExiste = listaTransicoes.some((t) => t.de === origemConexao && t.para === estado.id);
    if (jaExiste) {
      alerta("Transição já existe", nomeEstado(origemConexao) + " → " + estado.nome + " já está configurada.");
      setOrigemConexao(null);
      return;
    }
    salvarTransicao.mutate({
      workflow: workflowId,
      de: origemConexao,
      para: estado.id,
      nome: nomeEstado(origemConexao) + " → " + estado.nome,
      requer_aprovacao: false,
    });
  };

  const organizarEmGrade = () => {
    const colunas = 4;
    listaEstados
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .forEach((e, i) => {
        const x = 40 + (i % colunas) * (LARGURA_NO + 40);
        const y = 40 + Math.floor(i / colunas) * (ALTURA_NO + 70);
        setPosicoes((mapa) => ({ ...mapa, [e.id]: { x, y } }));
        moverEstado.mutate({ id: e.id, posicao_x: x, posicao_y: y });
      });
    sucesso("Estados reorganizados", "As posições foram salvas no workflow.");
  };

  /* ------------------------------------------------------ modal workflow */

  const [modalWorkflow, setModalWorkflow] = useState(false);
  const [formWorkflow, setFormWorkflow] = useState({ nome: "", entidade: "tarefa", descricao: "" });
  const [confirmacao, setConfirmacao] = useState<{ tipo: "workflow" | "estado" | "transicao"; id: number; nome: string } | null>(
    null
  );

  /* --------------------------------------------------------- derivados */

  const colunasKanban = useMemo(
    () => listaEstados.slice().sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    [listaEstados]
  );

  const metricas = useMemo(() => {
    const iniciais = listaEstados.filter((e) => e.is_inicial).length;
    const finais = listaEstados.filter((e) => e.is_final).length;
    const comWip = listaEstados.filter((e) => e.wip_limit > 0).length;
    const aprovacao = listaTransicoes.filter((t) => t.requer_aprovacao).length;
    return { iniciais, finais, comWip, aprovacao };
  }, [listaEstados, listaTransicoes]);

  const arestas = useMemo(
    () =>
      listaTransicoes
        .map((t) => {
          const de = posicoes[t.de];
          const para = posicoes[t.para];
          if (!de || !para) return null;
          return { transicao: t, de, para };
        })
        .filter(Boolean) as Array<{ transicao: TransicaoWorkflow; de: Posicao; para: Posicao }>,
    [listaTransicoes, posicoes]
  );

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Configuração de workflows"
        subtitulo="Monte o fluxo arrastando estados no canvas e conectando as transições"
        icone={WorkflowIcon}
        cor="#8B5CF6"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" icone={Plus} onClick={() => setModalWorkflow(true)}>
              Novo workflow
            </Botao>
            <Botao
              variante={modoConexao ? "primario" : "secundario"}
              icone={MousePointerClick}
              onClick={() => {
                setModoConexao((v) => !v);
                setOrigemConexao(null);
              }}
              disabled={!workflowId}
            >
              {modoConexao ? "Sair do modo conexão" : "Conectar estados"}
            </Botao>
            <Botao variante="secundario" icone={Grid3x3} onClick={organizarEmGrade} disabled={!listaEstados.length}>
              Organizar grade
            </Botao>
          </div>
        }
      />

      {workflows.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os workflows">
          {mensagemErro(workflows.error)}
        </Alerta>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
        <label className="flex items-center gap-2">
          <span className="text-2xs font-medium text-fg-muted">Workflow</span>
          <Selecao
            value={workflowId ? String(workflowId) : ""}
            onChange={(e) => setWorkflowId(e.target.value ? Number(e.target.value) : null)}
            className="h-8 w-72 py-0 text-xs"
            aria-label="Selecionar workflow"
          >
            <option value="">Selecione um workflow</option>
            {listaWorkflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nome + " · " + w.entidade + (w.is_padrao ? " (padrão)" : "")}
              </option>
            ))}
          </Selecao>
        </label>
        {workflowAtual && (
          <>
            <Etiqueta tom="brand" icone={Layers}>{workflowAtual.entidade}</Etiqueta>
            {workflowAtual.is_padrao && <Etiqueta tom="success" icone={Check}>padrão</Etiqueta>}
            <span className="text-2xs text-fg-muted">{workflowAtual.descricao || "Sem descrição"}</span>
            <div className="ml-auto flex items-center gap-2">
              <Botao tamanho="xs" variante="secundario" icone={Plus} onClick={abrirNovoEstado}>
                Novo estado
              </Botao>
              <Botao
                tamanho="xs"
                variante="secundario"
                icone={Link2}
                onClick={abrirNovaTransicao}
                disabled={listaEstados.length < 2}
              >
                Nova transição
              </Botao>
              <BotaoIcone
                icone={Trash2}
                rotulo="Excluir workflow"
                tamanho="xs"
                onClick={() => setConfirmacao({ tipo: "workflow", id: workflowAtual.id, nome: workflowAtual.nome })}
              />
            </div>
          </>
        )}
      </div>

      {modoConexao && (
        <Alerta tom="info" titulo="Modo conexão ativo" icone={MousePointerClick}>
          Clique no estado de origem e depois no estado de destino. A transição é criada imediatamente no workflow
          selecionado. Pressione Esc ou saia do modo para voltar a mover os nós.
        </Alerta>
      )}

      {!workflowId ? (
        <Vazio
          icone={WorkflowIcon}
          titulo="Nenhum workflow selecionado"
          descricao="Escolha um workflow existente ou crie um novo para desenhar o fluxo de trabalho."
          acao={
            <Botao variante="primario" icone={Plus} onClick={() => setModalWorkflow(true)}>
              Criar workflow
            </Botao>
          }
        />
      ) : estados.isLoading ? (
        <CarregandoBloco rotulo="Carregando estados do workflow..." />
      ) : (
        <>
          <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-fg">Canvas do workflow</h2>
                <Etiqueta tom="neutral">{numero(listaEstados.length) + " estados"}</Etiqueta>
                <Etiqueta tom="neutral">{numero(listaTransicoes.length) + " transições"}</Etiqueta>
                {moverEstado.isPending && <Etiqueta tom="info">salvando posição...</Etiqueta>}
              </div>
              <p className="text-2xs text-fg-muted">
                Arraste os nós para reposicionar; a posição é salva automaticamente no servidor.
              </p>
            </div>

            <div className="overflow-auto scroll-thin" style={{ maxHeight: 620 }}>
              {listaEstados.length === 0 ? (
                <Vazio
                  icone={Plus}
                  titulo="Workflow sem estados"
                  descricao="Crie o primeiro estado para começar a desenhar o fluxo."
                  acao={
                    <Botao variante="primario" icone={Plus} onClick={abrirNovoEstado}>
                      Novo estado
                    </Botao>
                  }
                />
              ) : (
                <DndContext sensors={sensors} onDragEnd={aoTerminarArraste}>
                  <div className="relative" style={{ width: LARGURA_CANVAS, height: ALTURA_CANVAS }}>
                    <svg
                      width={LARGURA_CANVAS}
                      height={ALTURA_CANVAS}
                      className="absolute inset-0"
                      aria-hidden
                    >
                      <defs>
                        <marker
                          id="seta-workflow"
                          viewBox="0 0 10 10"
                          refX="9"
                          refY="5"
                          markerWidth="6"
                          markerHeight="6"
                          orient="auto-start-reverse"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sgp-fg-subtle)" />
                        </marker>
                      </defs>
                      {arestas.map(({ transicao, de, para }) => {
                        const auto = transicao.de === transicao.para;
                        if (auto) {
                          const x = de.x + LARGURA_NO / 2;
                          const y = de.y;
                          const caminho =
                            "M " + x + " " + y + " C " + (x + 70) + " " + (y - 60) + ", " + (x - 70) + " " + (y - 60) + ", " + x + " " + y;
                          return (
                            <g key={transicao.id}>
                              <path
                                d={caminho}
                                fill="none"
                                stroke="var(--sgp-fg-subtle)"
                                strokeWidth={1.6}
                                markerEnd="url(#seta-workflow)"
                              />
                            </g>
                          );
                        }
                        const x1 = de.x + LARGURA_NO;
                        const y1 = de.y + ALTURA_NO / 2;
                        const x2 = para.x;
                        const y2 = para.y + ALTURA_NO / 2;
                        const curva = Math.max(40, Math.abs(x2 - x1) / 2);
                        const caminho =
                          "M " + x1 + " " + y1 + " C " + (x1 + curva) + " " + y1 + ", " + (x2 - curva) + " " + y2 + ", " + x2 + " " + y2;
                        const meioX = (x1 + x2) / 2;
                        const meioY = (y1 + y2) / 2;
                        return (
                          <g key={transicao.id}>
                            <path
                              d={caminho}
                              fill="none"
                              stroke={transicao.requer_aprovacao ? "#F59E0B" : "var(--sgp-fg-subtle)"}
                              strokeWidth={transicao.requer_aprovacao ? 2.2 : 1.6}
                              strokeDasharray={transicao.requer_aprovacao ? "6 4" : undefined}
                              markerEnd="url(#seta-workflow)"
                            />
                            <path
                              d={caminho}
                              fill="none"
                              stroke="transparent"
                              strokeWidth={14}
                              style={{ pointerEvents: "stroke", cursor: "pointer" }}
                              onClick={() => abrirEdicaoTransicao(transicao)}
                            />
                            {transicao.nome && (
                              <text
                                x={meioX}
                                y={meioY - 6}
                                textAnchor="middle"
                                className="fill-fg-muted text-[9px]"
                                style={{ pointerEvents: "none" }}
                              >
                                {transicao.nome.length > 24 ? transicao.nome.slice(0, 23) + "…" : transicao.nome}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {listaEstados.map((e) => (
                      <NoEstado
                        key={e.id}
                        estado={e}
                        posicao={posicaoDe(e.id)}
                        selecionado={estadoSelecionado === e.id}
                        origemConexao={origemConexao === e.id}
                        modoConexao={modoConexao}
                        onClicar={() => clicarNo(e)}
                      />
                    ))}
                  </div>
                </DndContext>
              )}
            </div>
          </div>

          <GradeCards colunas={4}>
            <div className="rounded-sgp-lg border border-border bg-surface p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Estados</p>
              <p className="mt-1 text-xl font-bold text-fg">{numero(listaEstados.length)}</p>
              <p className="text-2xs text-fg-muted">
                {metricas.iniciais + " inicial(is) · " + metricas.finais + " final(is)"}
              </p>
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Transições</p>
              <p className="mt-1 text-xl font-bold text-fg">{numero(listaTransicoes.length)}</p>
              <p className="text-2xs text-fg-muted">{metricas.aprovacao + " com aprovação obrigatória"}</p>
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Limites de WIP</p>
              <p className="mt-1 text-xl font-bold text-fg">{numero(metricas.comWip)}</p>
              <p className="text-2xs text-fg-muted">colunas com limite configurado</p>
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Entidade</p>
              <p className="mt-1 text-xl font-bold text-fg">{workflowAtual ? workflowAtual.entidade : "—"}</p>
              <p className="text-2xs text-fg-muted">fluxo aplicado a este tipo de registro</p>
            </div>
          </GradeCards>

          <SecaoColapsavel titulo="Pré-visualização do board Kanban" icone={Layers} contagem={colunasKanban.length} abertoInicial>
            {colunasKanban.length === 0 ? (
              <Vazio icone={Layers} titulo="Sem colunas" descricao="Crie estados para montar o board." />
            ) : (
              <div className="flex gap-3 overflow-x-auto scroll-thin pb-2">
                {colunasKanban.map((c) => (
                  <div key={c.id} className="w-56 shrink-0 rounded-sgp-lg border border-border bg-surface-2">
                    <div
                      className="flex items-center justify-between gap-2 rounded-t-sgp-lg px-3 py-2"
                      style={{ backgroundColor: c.cor + "22", borderBottom: "2px solid " + c.cor }}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {(() => {
                          const Icone = iconeEstado(c.icone);
                          return <Icone className="size-3.5 shrink-0" style={{ color: c.cor }} aria-hidden />;
                        })()}
                        <span className="truncate text-xs font-semibold" style={{ color: c.cor }}>
                          {c.nome}
                        </span>
                      </span>
                      <span className="shrink-0 text-2xs text-fg-muted">
                        {c.wip_limit > 0 ? "WIP " + c.wip_limit : "sem WIP"}
                      </span>
                    </div>
                    <div className="space-y-1.5 p-2">
                      <div className="rounded-sgp border border-dashed border-border-strong bg-surface px-2 py-3 text-center text-2xs text-fg-subtle">
                        Cartões com status {c.chave}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.is_inicial && <Etiqueta tom="success" icone={Rocket}>inicial</Etiqueta>}
                        {c.is_final && <Etiqueta tom="brand" icone={Flag}>final</Etiqueta>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Transições configuradas" icone={Link2} contagem={listaTransicoes.length} abertoInicial={false}>
            {transicoes.isLoading ? (
              <Esqueleto linhas={4} />
            ) : listaTransicoes.length === 0 ? (
              <Vazio
                icone={Unlink}
                titulo="Nenhuma transição"
                descricao="Use o modo conexão ou o botão Nova transição para ligar os estados."
              />
            ) : (
              <div className="space-y-1.5">
                {listaTransicoes.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-2 rounded-sgp border border-border bg-surface-2 px-3 py-2"
                  >
                    <Chip cor="#3B82F6">{nomeEstado(t.de)}</Chip>
                    <span className="text-2xs text-fg-subtle">→</span>
                    <Chip cor="#10B981">{nomeEstado(t.para)}</Chip>
                    <span className="flex-1 truncate text-2xs text-fg-muted">{t.nome || "sem rótulo"}</span>
                    {t.requer_aprovacao && <Etiqueta tom="warning" icone={Lock}>requer aprovação</Etiqueta>}
                    <BotaoIcone icone={Pencil} rotulo="Editar transição" tamanho="xs" onClick={() => abrirEdicaoTransicao(t)} />
                    <BotaoIcone
                      icone={Trash2}
                      rotulo="Excluir transição"
                      tamanho="xs"
                      onClick={() =>
                        setConfirmacao({
                          tipo: "transicao",
                          id: t.id,
                          nome: nomeEstado(t.de) + " → " + nomeEstado(t.para),
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Estados do workflow" icone={CircleDot} contagem={listaEstados.length} abertoInicial={false}>
            <div className="space-y-1.5">
              {colunasKanban.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-sgp border border-border bg-surface-2 px-3 py-2">
                  {(() => {
                    const Icone = iconeEstado(e.icone);
                    return (
                      <span
                        className="grid size-6 place-items-center rounded-md"
                        style={{ backgroundColor: e.cor + "1f", color: e.cor }}
                      >
                        <Icone className="size-3.5" aria-hidden />
                      </span>
                    );
                  })()}
                  <span className="text-xs font-medium text-fg">{e.nome}</span>
                  <Chip cor={e.cor}>{e.chave}</Chip>
                  <span className="text-2xs text-fg-muted">{"ordem " + e.ordem}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Botao tamanho="xs" variante="fantasma" icone={Pencil} onClick={() => abrirEdicaoEstado(e)}>
                      Editar
                    </Botao>
                    <BotaoIcone
                      icone={Trash2}
                      rotulo={"Excluir estado " + e.nome}
                      tamanho="xs"
                      onClick={() => setConfirmacao({ tipo: "estado", id: e.id, nome: e.nome })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SecaoColapsavel>
        </>
      )}

      {/* ------------------------------------------------- painel estado */}

      <PainelLateral
        aberto={painelEstado}
        onFechar={() => setPainelEstado(false)}
        titulo={estadoEmEdicao ? "Editar estado" : "Novo estado"}
        subtitulo={workflowAtual ? workflowAtual.nome : "Selecione um workflow"}
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            {estadoEmEdicao && (
              <Botao
                variante="perigo"
                icone={Trash2}
                onClick={() => setConfirmacao({ tipo: "estado", id: estadoEmEdicao.id, nome: estadoEmEdicao.nome })}
              >
                Excluir
              </Botao>
            )}
            <Botao variante="fantasma" onClick={() => setPainelEstado(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Check} carregando={salvarEstado.isPending} onClick={enviarEstado}>
              Salvar estado
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome" obrigatorio htmlFor="e-nome">
            <Entrada
              id="e-nome"
              value={formEstado.nome}
              onChange={(ev) => setFormEstado((f) => ({ ...f, nome: ev.target.value }))}
              placeholder="Ex.: Em homologação"
            />
          </Campo>
          <Campo rotulo="Chave" obrigatorio htmlFor="e-chave" dica="Identificador técnico usado pelo board (sem espaços).">
            <Entrada
              id="e-chave"
              value={formEstado.chave}
              onChange={(ev) => setFormEstado((f) => ({ ...f, chave: ev.target.value }))}
              placeholder="EM_HOMOLOGACAO"
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Ordem" htmlFor="e-ordem">
              <Entrada
                id="e-ordem"
                type="number"
                min={0}
                value={formEstado.ordem}
                onChange={(ev) => setFormEstado((f) => ({ ...f, ordem: ev.target.value }))}
              />
            </Campo>
            <Campo rotulo="Limite de WIP" htmlFor="e-wip" dica="0 significa sem limite.">
              <Entrada
                id="e-wip"
                type="number"
                min={0}
                value={formEstado.wip_limit}
                onChange={(ev) => setFormEstado((f) => ({ ...f, wip_limit: ev.target.value }))}
              />
            </Campo>
          </div>
          <Campo rotulo="Cor" dica="Usada na coluna do Kanban e no nó do canvas.">
            <div className="flex flex-wrap items-center gap-1.5">
              {CORES_ESTADO.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={"Cor " + c}
                  onClick={() => setFormEstado((f) => ({ ...f, cor: c }))}
                  className={cn(
                    "size-6 rounded-full border-2 transition-transform hover:scale-110",
                    formEstado.cor === c ? "border-fg" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                aria-label="Cor personalizada"
                value={formEstado.cor}
                onChange={(ev) => setFormEstado((f) => ({ ...f, cor: ev.target.value }))}
                className="h-7 w-10 cursor-pointer rounded border border-border-strong bg-surface"
              />
            </div>
          </Campo>
          <Campo rotulo="Ícone" htmlFor="e-icone">
            <Selecao
              id="e-icone"
              value={formEstado.icone}
              onChange={(ev) => setFormEstado((f) => ({ ...f, icone: ev.target.value }))}
            >
              {NOMES_ICONES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Selecao>
          </Campo>
          <div className="flex flex-wrap gap-2">
            {NOMES_ICONES.map((n) => {
              const Icone = iconeEstado(n);
              return (
                <button
                  key={n}
                  type="button"
                  title={n}
                  aria-label={"Ícone " + n}
                  onClick={() => setFormEstado((f) => ({ ...f, icone: n }))}
                  className={cn(
                    "grid size-8 place-items-center rounded-md border transition-colors",
                    formEstado.icone === n ? "border-brand bg-brand-soft/60 text-brand" : "border-border bg-surface text-fg-muted hover:bg-surface-2"
                  )}
                >
                  <Icone className="size-4" aria-hidden />
                </button>
              );
            })}
          </div>
          <div className="space-y-2">
            <Interruptor
              ativo={formEstado.is_inicial}
              onChange={(v) => setFormEstado((f) => ({ ...f, is_inicial: v }))}
              rotulo="Estado inicial"
              descricao="Todo item do fluxo nasce neste estado."
            />
            <Interruptor
              ativo={formEstado.is_final}
              onChange={(v) => setFormEstado((f) => ({ ...f, is_final: v }))}
              rotulo="Estado final"
              descricao="Encerra o ciclo de vida do item."
            />
          </div>
        </div>
      </PainelLateral>

      {/* ----------------------------------------------- painel transição */}

      <PainelLateral
        aberto={painelTransicao}
        onFechar={() => setPainelTransicao(false)}
        titulo={transicaoEmEdicao ? "Editar transição" : "Nova transição"}
        subtitulo="Defina origem, destino e se a mudança exige aprovação"
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setPainelTransicao(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Link2} carregando={salvarTransicao.isPending} onClick={enviarTransicao}>
              Salvar transição
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Estado de origem" obrigatorio htmlFor="t-de">
            <Selecao
              id="t-de"
              value={formTransicao.de}
              onChange={(ev) => setFormTransicao((f) => ({ ...f, de: ev.target.value }))}
            >
              <option value="">Selecione</option>
              {colunasKanban.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Estado de destino" obrigatorio htmlFor="t-para">
            <Selecao
              id="t-para"
              value={formTransicao.para}
              onChange={(ev) => setFormTransicao((f) => ({ ...f, para: ev.target.value }))}
            >
              <option value="">Selecione</option>
              {colunasKanban.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Rótulo da transição" htmlFor="t-nome" dica="Exibido sobre a seta no canvas.">
            <Entrada
              id="t-nome"
              value={formTransicao.nome}
              onChange={(ev) => setFormTransicao((f) => ({ ...f, nome: ev.target.value }))}
              placeholder="Ex.: Enviar para revisão"
            />
          </Campo>
          <Interruptor
            ativo={formTransicao.requer_aprovacao}
            onChange={(v) => setFormTransicao((f) => ({ ...f, requer_aprovacao: v }))}
            rotulo="Requer aprovação"
            descricao="A transição só é concluída após aprovação de um responsável."
          />
          <Alerta tom="info" titulo="Fluxo com aprovação">
            Transições com aprovação são desenhadas com linha tracejada âmbar no canvas para facilitar a leitura do
            processo.
          </Alerta>
        </div>
      </PainelLateral>

      {/* ------------------------------------------------- novo workflow */}

      <Modal
        aberto={modalWorkflow}
        onFechar={() => setModalWorkflow(false)}
        titulo="Novo workflow"
        subtitulo="Cada workflow pertence a uma entidade do sistema"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setModalWorkflow(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Plus}
              carregando={salvarWorkflow.isPending}
              onClick={() => {
                if (!formWorkflow.nome.trim()) {
                  erro("Informe o nome do workflow");
                  return;
                }
                salvarWorkflow.mutate({
                  nome: formWorkflow.nome.trim(),
                  entidade: formWorkflow.entidade,
                  descricao: formWorkflow.descricao,
                });
              }}
            >
              Criar workflow
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome" obrigatorio htmlFor="w-nome">
            <Entrada
              id="w-nome"
              value={formWorkflow.nome}
              onChange={(ev) => setFormWorkflow((f) => ({ ...f, nome: ev.target.value }))}
              placeholder="Ex.: Fluxo de riscos"
            />
          </Campo>
          <Campo rotulo="Entidade" htmlFor="w-entidade">
            <Selecao
              id="w-entidade"
              value={formWorkflow.entidade}
              onChange={(ev) => setFormWorkflow((f) => ({ ...f, entidade: ev.target.value }))}
            >
              {ENTIDADES.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.rotulo}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Descrição" htmlFor="w-desc">
            <Entrada
              id="w-desc"
              value={formWorkflow.descricao}
              onChange={(ev) => setFormWorkflow((f) => ({ ...f, descricao: ev.target.value }))}
              placeholder="Objetivo do fluxo"
            />
          </Campo>
        </div>
      </Modal>

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo="Confirmar exclusão"
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirWorkflow.isPending || excluirEstado.isPending || excluirTransicao.isPending}
              onClick={() => {
                if (!confirmacao) return;
                if (confirmacao.tipo === "workflow") excluirWorkflow.mutate({ id: confirmacao.id });
                else if (confirmacao.tipo === "estado") excluirEstado.mutate({ id: confirmacao.id });
                else excluirTransicao.mutate({ id: confirmacao.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          {"Deseja excluir " + (confirmacao ? confirmacao.nome : "") + "?"}
        </p>
        <Alerta tom="warning" titulo="Efeito em cascata" className="mt-3">
          Excluir um workflow remove todos os seus estados e transições. Excluir um estado remove também as transições
          que partem ou chegam nele. A ação é registrada na auditoria.
        </Alerta>
      </Modal>

      {workflowId && listaEstados.length > 0 && listaEstados.filter((e) => e.is_inicial).length === 0 && (
        <Alerta tom="warning" titulo="Nenhum estado inicial definido">
          Todo workflow precisa de um estado inicial para receber novos itens. Edite um estado e marque a opção
          Estado inicial.
        </Alerta>
      )}

      {workflowId && listaEstados.length > 0 && listaEstados.filter((e) => e.is_final).length === 0 && (
        <Alerta tom="info" titulo="Nenhum estado final definido" icone={Flag}>
          Marque ao menos um estado como final para permitir o encerramento dos itens no board.
        </Alerta>
      )}

      <div className="flex items-center gap-2 text-2xs text-fg-muted">
        <X className="size-3" aria-hidden />
        As alterações de layout são persistidas via PATCH em posicao_x e posicao_y de cada estado.
      </div>
    </div>
  );
}

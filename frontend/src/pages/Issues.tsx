import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  AlertCircle, AlertTriangle, Ban, BarChart3, CalendarClock, CircleHelp, Filter, Gauge,
  GitPullRequest, LayoutList, ListChecks, Plus, RefreshCw, Save, Search, Timer, Trash2, Users, Wrench,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraFerramentas, Botao, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, Entrada, EntradaBusca, Etiqueta, FiltrosAtivos, Modal, PainelLateral,
  Selecao, Tabela, Vazio, useAvisos, CORES_PRIORIDADE, type ColunaTabela,
} from "@/components/ui";
import { GraficoBarras, GraficoDonut, type FatiaDonut } from "@/components/charts";
import { FiltroSelect, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataHora, diasEntre, hojeISO, horas, moeda, numero } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Issue, ProjetoResumo, Risco, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Kanban de issues, ações corretivas, mudanças e impedimentos (RF-25)
   ========================================================================== */

const TIPOS = [
  { valor: "ISSUE", rotulo: "Issue" },
  { valor: "ACAO_CORRETIVA", rotulo: "Ação corretiva" },
  { valor: "MUDANCA", rotulo: "Solicitação de mudança" },
  { valor: "IMPEDIMENTO", rotulo: "Impedimento" },
  { valor: "DECISAO", rotulo: "Decisão pendente" },
];

const PRIORIDADES = [
  { valor: "BAIXA", rotulo: "Baixa" },
  { valor: "MEDIA", rotulo: "Média" },
  { valor: "ALTA", rotulo: "Alta" },
  { valor: "CRITICA", rotulo: "Crítica" },
];

const STATUS = [
  { valor: "ABERTA", rotulo: "Aberta", cor: "#DC2626" },
  { valor: "TRIAGEM", rotulo: "Em triagem", cor: "#D97706" },
  { valor: "EM_ANALISE", rotulo: "Em análise", cor: "#8B5CF6" },
  { valor: "EM_ANDAMENTO", rotulo: "Em andamento", cor: "#2563EB" },
  { valor: "AGUARDANDO", rotulo: "Aguardando terceiros", cor: "#0891B2" },
  { valor: "RESOLVIDA", rotulo: "Resolvida", cor: "#059669" },
  { valor: "FECHADA", rotulo: "Fechada", cor: "#64748B" },
  { valor: "CANCELADA", rotulo: "Cancelada", cor: "#94A3B8" },
];

const CORES_TIPO: Record<string, string> = {
  ISSUE: "#EF4444",
  ACAO_CORRETIVA: "#F59E0B",
  MUDANCA: "#8B5CF6",
  IMPEDIMENTO: "#DC2626",
  DECISAO: "#0891B2",
};

const ICONES_TIPO: Record<string, typeof AlertCircle> = {
  ISSUE: AlertCircle,
  ACAO_CORRETIVA: Wrench,
  MUDANCA: GitPullRequest,
  IMPEDIMENTO: Ban,
  DECISAO: CircleHelp,
};

function rotuloTipo(valor: string) {
  return TIPOS.find((t) => t.valor === valor)?.rotulo ?? valor;
}

function rotuloPrioridade(valor: string) {
  return PRIORIDADES.find((p) => p.valor === valor)?.rotulo ?? valor;
}

function rotuloStatus(valor: string) {
  return STATUS.find((s) => s.valor === valor)?.rotulo ?? valor;
}

function corStatus(valor: string) {
  return STATUS.find((s) => s.valor === valor)?.cor ?? "#64748B";
}

interface ColunaKanban {
  status: string;
  rotulo: string;
  total: number;
  items: Issue[];
}

interface RespostaKanban {
  colunas: ColunaKanban[];
  total: number;
  atrasadas: number;
  por_tipo: Array<{ tipo: string; total: number }>;
}

interface ResumoIssues {
  total: number;
  abertas: number;
  atrasadas: number;
  tempo_medio_resolucao: number;
  por_status: Array<{ status: string; total: number }>;
  por_tipo: Array<{ tipo: string; total: number }>;
  por_prioridade: Array<{ prioridade: string; total: number }>;
}

interface FormularioIssue {
  id: number | null;
  project: string;
  risk: string;
  titulo: string;
  descricao: string;
  tipo: string;
  prioridade: string;
  status: string;
  impacto: string;
  solucao: string;
  responsavel: string;
  data_abertura: string;
  data_limite: string;
  data_resolucao: string;
  esforco_estimado: string;
  custo_estimado: string;
}

function formularioIssueVazio(projeto: string): FormularioIssue {
  return {
    id: null,
    project: projeto,
    risk: "",
    titulo: "",
    descricao: "",
    tipo: "ISSUE",
    prioridade: "MEDIA",
    status: "ABERTA",
    impacto: "",
    solucao: "",
    responsavel: "",
    data_abertura: hojeISO(),
    data_limite: "",
    data_resolucao: "",
    esforco_estimado: "0",
    custo_estimado: "0",
  };
}

function formularioDeIssue(issue: Issue): FormularioIssue {
  return {
    id: issue.id,
    project: String(issue.project),
    risk: issue.risk ? String(issue.risk) : "",
    titulo: issue.titulo,
    descricao: issue.descricao,
    tipo: issue.tipo,
    prioridade: issue.prioridade,
    status: issue.status,
    impacto: issue.impacto,
    solucao: issue.solucao,
    responsavel: issue.responsavel ? String(issue.responsavel) : "",
    data_abertura: issue.data_abertura ?? hojeISO(),
    data_limite: issue.data_limite ?? "",
    data_resolucao: issue.data_resolucao ?? "",
    esforco_estimado: String(Number(issue.esforco_estimado || 0).toFixed(2)),
    custo_estimado: String(Number(issue.custo_estimado || 0).toFixed(2)),
  };
}

function CartaoIssue({
  issue,
  projetoCor,
  selecionada,
  aoSelecionar,
}: {
  issue: Issue;
  projetoCor: string;
  selecionada: boolean;
  aoSelecionar: (issue: Issue) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "issue-" + issue.id,
    data: { issueId: issue.id },
  });
  const Icone = ICONES_TIPO[issue.tipo] ?? AlertCircle;
  const cor = CORES_TIPO[issue.tipo] ?? "#64748B";
  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => aoSelecionar(issue)}
      aria-label={issue.codigo + ": " + issue.titulo}
      style={{
        transform: transform ? "translate3d(" + Math.round(transform.x) + "px, " + Math.round(transform.y) + "px, 0)" : undefined,
        touchAction: "none",
        borderLeftColor: cor,
      }}
      className={cn(
        "cursor-grab rounded-sgp border border-border border-l-4 bg-surface p-2.5 shadow-n1 transition-all hover:shadow-n2 active:cursor-grabbing",
        isDragging && "opacity-40",
        selecionada && "ring-2 ring-brand"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-2xs font-bold text-fg-muted">{issue.codigo}</span>
        <Etiqueta tom={CORES_PRIORIDADE[issue.prioridade] ?? "neutral"}>{issue.prioridade_rotulo}</Etiqueta>
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-medium text-fg">{issue.titulo}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <Icone className="size-3.5 shrink-0" style={{ color: cor }} aria-hidden />
        <span className="truncate text-2xs text-fg-muted">{issue.tipo_rotulo}</span>
        {projetoCor && <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: projetoCor }} title={issue.project_nome} />}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="flex items-center gap-1.5">
          <Avatar nome={issue.responsavel_detalhe?.nome ?? "Sem responsável"} cor={issue.responsavel_detalhe?.cor} tamanho="xs" />
          <span className="text-2xs tabular-nums text-fg-muted">{numero(issue.idade_dias)}d</span>
        </span>
        <span className="flex items-center gap-1.5">
          {issue.data_limite && (
            <span className={cn("text-2xs tabular-nums", issue.atrasada ? "font-semibold text-danger" : "text-fg-muted")}>
              {dataCurta(issue.data_limite)}
            </span>
          )}
          {issue.atrasada && <Etiqueta tom="danger">atrasada</Etiqueta>}
        </span>
      </div>
    </article>
  );
}

function ColunaKanban({
  coluna,
  projetosCor,
  selecionadaId,
  aoSelecionar,
}: {
  coluna: ColunaKanban;
  projetosCor: Record<number, string>;
  selecionadaId: number | null;
  aoSelecionar: (issue: Issue) => void;
}) {
  const cor = corStatus(coluna.status);
  const { setNodeRef, isOver } = useDroppable({ id: "coluna-" + coluna.status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <header
        className="flex items-center justify-between gap-2 rounded-t-sgp border border-b-0 border-border bg-surface px-3 py-2"
        style={{ borderTopColor: cor, borderTopWidth: 3 }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
          <span className="truncate text-xs font-semibold text-fg">{coluna.rotulo}</span>
        </span>
        <span className="rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums" style={{ backgroundColor: cor + "1f", color: cor }}>
          {coluna.total}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-96 flex-1 flex-col gap-2 rounded-b-sgp border border-border bg-surface-2 p-2 transition-colors",
          isOver && "bg-brand-soft/40 ring-2 ring-brand"
        )}
      >
        {coluna.items.length === 0 && (
          <p className="py-6 text-center text-2xs text-fg-subtle">Arraste um card para cá</p>
        )}
        {coluna.items.map((issue) => (
          <CartaoIssue
            key={issue.id}
            issue={issue}
            projetoCor={projetosCor[issue.project] ?? issue.project_cor}
            selecionada={selecionadaId === issue.id}
            aoSelecionar={aoSelecionar}
          />
        ))}
      </div>
    </div>
  );
}

export default function Issues() {
  const { sucesso, alerta, erro: avisarErro } = useAvisos();
  const [searchParams, setSearchParams] = useSearchParams();

  const aba = (searchParams.get("aba") ?? "kanban") as "kanban" | "resumo" | "tabela";
  const [projeto, setProjeto] = useState(searchParams.get("project") ?? "");
  const [tipo, setTipo] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [busca, setBusca] = useState("");

  const [selecionada, setSelecionada] = useState<Issue | null>(null);
  const [formulario, setFormulario] = useState<FormularioIssue | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Issue | null>(null);
  const [movidos, setMovidos] = useState<Record<number, string>>({});
  const [arrastada, setArrastada] = useState<Issue | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const ultimoArraste = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const params = useMemo(
    () => ({
      ...(projeto ? { project: projeto } : {}),
      ...(tipo ? { tipo } : {}),
      ...(prioridade ? { prioridade } : {}),
      ...(responsavel ? { responsavel } : {}),
      ...(busca ? { search: busca } : {}),
      page_size: 400,
    }),
    [projeto, tipo, prioridade, responsavel, busca]
  );

  const { data: kanban, isLoading, isError, error, refetch, isFetching } = useConsulta<RespostaKanban>(
    ["issues", "kanban"],
    "/issues/kanban/",
    params
  );

  const { data: resumo } = useConsulta<ResumoIssues>(["issues", "resumo"], aba === "resumo" ? "/issues/resumo/" : null, params);

  const { data: lista = [] } = useLista<Issue>(CHAVES.issues, aba === "tabela" ? "/issues/" : null, params);

  const { data: projetos = [] } = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 300 });
  const { data: usuarios = [] } = useLista<UsuarioResumo>(["usuarios"], "/usuarios/", { ativo: true, page_size: 500 });
  const { data: riscos = [] } = useLista<Risco>(CHAVES.riscos, formulario?.project ? "/riscos/" : null, {
    project: formulario?.project,
    page_size: 200,
  });

  const projetosCor = useMemo(() => {
    const mapa: Record<number, string> = {};
    projetos.forEach((p) => {
      mapa[p.id] = p.cor;
    });
    return mapa;
  }, [projetos]);

  const colunas = useMemo(() => {
    const base = kanban?.colunas ?? [];
    if (!Object.keys(movidos).length) return base;
    return base.map((coluna) => {
      const itens = (kanban?.colunas ?? []).flatMap((c) => c.items).filter((i) => (movidos[i.id] ?? i.status) === coluna.status);
      return { ...coluna, items: itens, total: itens.length };
    });
  }, [kanban, movidos]);

  const totalFiltrado = useMemo(() => colunas.reduce((soma, c) => soma + c.items.length, 0), [colunas]);
  const atrasadasFiltradas = useMemo(() => colunas.flatMap((c) => c.items).filter((i) => i.atrasada).length, [colunas]);

  const mover = useMutacao<{ id: number; status: string; posicao_visual: number }, Issue>({
    url: (v) => "/issues/" + v.id + "/mover/",
    invalidar: [["issues", "kanban"], CHAVES.issues, ["issues", "resumo"]],
    mensagemSucesso: (resposta) => resposta.codigo + " movida para " + resposta.status_rotulo,
    aoSucesso: (_resposta, variaveis) => {
      setMovidos((atual) => {
        const copia = { ...atual };
        delete copia[variaveis.id];
        return copia;
      });
      setSelecionada(null);
    },
  });

  const editar = useMutacao<Record<string, unknown> & { id: number }, Issue>({
    metodo: "patch",
    url: (v) => "/issues/" + v.id + "/",
    invalidar: [["issues", "kanban"], CHAVES.issues, ["issues", "resumo"]],
    mensagemSucesso: "Issue atualizada",
    aoSucesso: () => setFormulario(null),
  });

  const criar = useMutacao<Record<string, unknown>, Issue>({
    url: "/issues/",
    invalidar: [["issues", "kanban"], CHAVES.issues, ["issues", "resumo"]],
    mensagemSucesso: "Issue registrada",
    aoSucesso: () => {
      setNovoAberto(false);
      setFormulario(null);
    },
  });

  const excluir = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (v) => "/issues/" + v.id + "/",
    invalidar: [["issues", "kanban"], CHAVES.issues, ["issues", "resumo"]],
    mensagemSucesso: "Issue excluída",
    aoSucesso: () => {
      setParaExcluir(null);
      setSelecionada(null);
    },
  });

  function mudarAba(valor: string) {
    const proximos = new URLSearchParams(searchParams);
    proximos.set("aba", valor);
    setSearchParams(proximos, { replace: true });
  }

  function mudarProjeto(valor: string) {
    setProjeto(valor);
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set("project", valor);
    else proximos.delete("project");
    setSearchParams(proximos, { replace: true });
  }

  function aoSoltar(evento: DragEndEvent) {
    setArrastada(null);
    const { active, over } = evento;
    if (!over) return;
    const id = Number(String(active.id).replace("issue-", ""));
    const novoStatus = String(over.id).replace("coluna-", "");
    if (!novoStatus) return;
    const issue = colunas.flatMap((c) => c.items).find((i) => i.id === id);
    if (!issue) return;
    if ((movidos[id] ?? issue.status) === novoStatus) return;
    const destino = colunas.find((c) => c.status === novoStatus);
    const maiorPosicao = destino && destino.items.length ? Math.max(...destino.items.map((i) => i.posicao_visual)) : 0;
    ultimoArraste.current = Date.now();
    setMovidos((atual) => ({ ...atual, [id]: novoStatus }));
    mover.mutate({ id, status: novoStatus, posicao_visual: maiorPosicao + 1000 });
  }

  function abrirEdicao(issue: Issue) {
    if (Date.now() - ultimoArraste.current < 250) return;
    setSelecionada(issue);
    setFormulario(formularioDeIssue(issue));
  }

  function abrirNova() {
    setSelecionada(null);
    setFormulario(formularioIssueVazio(projeto));
    setNovoAberto(true);
  }

  function salvar() {
    if (!formulario) return;
    if (!formulario.project) {
      alerta("Projeto obrigatório", "Selecione o projeto da issue.");
      return;
    }
    if (!formulario.titulo.trim()) {
      alerta("Título obrigatório", "Informe um título para a issue.");
      return;
    }
    const corpo: Record<string, unknown> = {
      project: Number(formulario.project),
      risk: formulario.risk ? Number(formulario.risk) : null,
      titulo: formulario.titulo.trim(),
      descricao: formulario.descricao,
      tipo: formulario.tipo,
      prioridade: formulario.prioridade,
      status: formulario.status,
      impacto: formulario.impacto,
      solucao: formulario.solucao,
      responsavel: formulario.responsavel ? Number(formulario.responsavel) : null,
      data_abertura: formulario.data_abertura || hojeISO(),
      data_limite: formulario.data_limite || null,
      data_resolucao: formulario.data_resolucao || null,
      esforco_estimado: Number(formulario.esforco_estimado || 0),
      custo_estimado: Number(formulario.custo_estimado || 0),
    };
    if (formulario.id) editar.mutate({ ...corpo, id: formulario.id });
    else criar.mutate(corpo);
  }

  const fatiasPrioridade: FatiaDonut[] = useMemo(
    () =>
      (resumo?.por_prioridade ?? []).map((p) => ({
        rotulo: rotuloPrioridade(p.prioridade),
        valor: p.total,
        cor: p.prioridade === "CRITICA" ? "#DC2626" : p.prioridade === "ALTA" ? "#D97706" : p.prioridade === "MEDIA" ? "#0891B2" : "#64748B",
      })),
    [resumo]
  );

  const barrasTipo: FatiaDonut[] = useMemo(
    () => (resumo?.por_tipo ?? []).map((t) => ({ rotulo: rotuloTipo(t.tipo), valor: t.total, cor: CORES_TIPO[t.tipo] ?? "#64748B" })),
    [resumo]
  );

  const barrasStatus: FatiaDonut[] = useMemo(
    () => (resumo?.por_status ?? []).map((s) => ({ rotulo: rotuloStatus(s.status), valor: s.total, cor: corStatus(s.status) })),
    [resumo]
  );

  const colunasTabela: Array<ColunaTabela<Issue>> = [
    {
      chave: "codigo",
      titulo: "Código",
      largura: "100px",
      ordenavel: true,
      valorOrdenacao: (i) => i.codigo,
      renderizar: (i) => <span className="font-mono text-2xs font-semibold text-fg-muted">{i.codigo}</span>,
    },
    {
      chave: "titulo",
      titulo: "Issue",
      ordenavel: true,
      valorOrdenacao: (i) => i.titulo,
      renderizar: (i) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg">{i.titulo}</p>
          <p className="truncate text-2xs text-fg-muted">{i.project_nome}</p>
        </div>
      ),
    },
    {
      chave: "tipo",
      titulo: "Tipo",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (i) => i.tipo,
      renderizar: (i) => {
        const Icone = ICONES_TIPO[i.tipo] ?? AlertCircle;
        return (
          <span className="flex items-center gap-1.5">
            <Icone className="size-3.5 shrink-0" style={{ color: CORES_TIPO[i.tipo] ?? "#64748B" }} aria-hidden />
            <span className="truncate text-xs text-fg-muted">{i.tipo_rotulo}</span>
          </span>
        );
      },
    },
    {
      chave: "prioridade",
      titulo: "Prioridade",
      largura: "110px",
      ordenavel: true,
      valorOrdenacao: (i) => PRIORIDADES.findIndex((p) => p.valor === i.prioridade),
      renderizar: (i) => <Etiqueta tom={CORES_PRIORIDADE[i.prioridade] ?? "neutral"}>{i.prioridade_rotulo}</Etiqueta>,
    },
    {
      chave: "responsavel",
      titulo: "Responsável",
      largura: "180px",
      renderizar: (i) => (
        <span className="flex items-center gap-2">
          <Avatar nome={i.responsavel_detalhe?.nome ?? "Sem responsável"} cor={i.responsavel_detalhe?.cor} tamanho="xs" />
          <span className="truncate text-xs text-fg-muted">{i.responsavel_detalhe?.nome ?? "—"}</span>
        </span>
      ),
    },
    {
      chave: "status",
      titulo: "Status",
      largura: "160px",
      renderizar: (i) => <Etiqueta cor={corStatus(i.status)}>{i.status_rotulo}</Etiqueta>,
    },
    {
      chave: "idade",
      titulo: "Idade",
      largura: "90px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (i) => i.idade_dias,
      renderizar: (i) => <span className="tabular-nums text-xs text-fg-muted">{numero(i.idade_dias)} d</span>,
    },
    {
      chave: "prazo",
      titulo: "Prazo",
      largura: "130px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (i) => i.data_limite ?? "",
      renderizar: (i) => (
        <span className={cn("tabular-nums text-xs", i.atrasada ? "font-semibold text-danger" : "text-fg-muted")}>
          {dataCurta(i.data_limite)}
        </span>
      ),
    },
    {
      chave: "esforco",
      titulo: "Esforço",
      largura: "110px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (i) => Number(i.esforco_estimado),
      renderizar: (i) => <span className="tabular-nums text-xs text-fg">{horas(i.esforco_estimado)}</span>,
    },
    {
      chave: "custo",
      titulo: "Custo",
      largura: "120px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (i) => Number(i.custo_estimado),
      renderizar: (i) => <span className="tabular-nums text-xs text-fg">{moeda(i.custo_estimado, true)}</span>,
    },
  ];

  const filtrosAtivos = [
    ...(projeto
      ? [
          {
            chave: "project",
            rotulo: "Projeto",
            valor: projetos.find((p) => String(p.id) === projeto)?.nome ?? projeto,
            onRemover: () => mudarProjeto(""),
          },
        ]
      : []),
    ...(tipo ? [{ chave: "tipo", rotulo: "Tipo", valor: rotuloTipo(tipo), onRemover: () => setTipo("") }] : []),
    ...(prioridade
      ? [{ chave: "prioridade", rotulo: "Prioridade", valor: rotuloPrioridade(prioridade), onRemover: () => setPrioridade("") }]
      : []),
    ...(responsavel
      ? [
          {
            chave: "responsavel",
            rotulo: "Responsável",
            valor: usuarios.find((u) => String(u.id) === responsavel)?.nome ?? responsavel,
            onRemover: () => setResponsavel(""),
          },
        ]
      : []),
    ...(busca ? [{ chave: "busca", rotulo: "Busca", valor: busca, onRemover: () => setBusca("") }] : []),
  ];

  function limparFiltros() {
    mudarProjeto("");
    setTipo("");
    setPrioridade("");
    setResponsavel("");
    setBusca("");
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Issues, ações e impedimentos"
        subtitulo={
          numero(totalFiltrado) + " item(ns) no quadro · " + numero(atrasadasFiltradas) + " com prazo vencido (RF-25)"
        }
        icone={ListChecks}
        cor="#D97706"
        acoes={
          <>
            <Botao icone={RefreshCw} onClick={() => refetch()} carregando={isFetching}>
              Atualizar
            </Botao>
            <Botao variante="primario" icone={Plus} onClick={abrirNova}>
              Nova issue
            </Botao>
          </>
        }
        filhos={
          <Abas
            valor={aba}
            onChange={mudarAba}
            abas={[
              { valor: "kanban", rotulo: "Kanban", icone: LayoutList, contagem: kanban?.total },
              { valor: "resumo", rotulo: "Resumo", icone: BarChart3 },
              { valor: "tabela", rotulo: "Tabela", icone: ListChecks },
            ]}
          />
        }
      />

      <BarraFerramentas>
        <FiltroSelect
          rotulo="Projeto"
          valor={projeto}
          onChange={mudarProjeto}
          icone={Filter}
          opcoes={projetos.map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
        />
        <FiltroSelect rotulo="Tipo" valor={tipo} onChange={setTipo} opcoes={TIPOS} />
        <FiltroSelect rotulo="Prioridade" valor={prioridade} onChange={setPrioridade} opcoes={PRIORIDADES} />
        <FiltroSelect
          rotulo="Responsável"
          valor={responsavel}
          onChange={setResponsavel}
          icone={Users}
          opcoes={usuarios.map((u) => ({ valor: String(u.id), rotulo: u.nome }))}
        />
        <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar título, descrição ou código..." className="min-w-56 flex-1" />
      </BarraFerramentas>

      <FiltrosAtivos filtros={filtrosAtivos} onLimpar={limparFiltros} />

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o quadro de issues">
          {mensagemErro(error)}
        </Alerta>
      )}

      {aba === "kanban" && (
        <>
          {isLoading && <CarregandoBloco rotulo="Carregando quadro de issues..." />}
          {!isLoading && kanban && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Chip cor="#DC2626" icone={AlertTriangle}>
                  {numero(atrasadasFiltradas)} atrasada(s)
                </Chip>
                {TIPOS.map((t) => {
                  const total = kanban.por_tipo.find((p) => p.tipo === t.valor)?.total ?? 0;
                  if (!total) return null;
                  const Icone = ICONES_TIPO[t.valor] ?? AlertCircle;
                  return (
                    <Chip key={t.valor} cor={CORES_TIPO[t.valor]} icone={Icone}>
                      {t.rotulo}: {numero(total)}
                    </Chip>
                  );
                })}
                <span className="ml-auto text-2xs text-fg-muted">Arraste os cards entre colunas para atualizar o status</span>
              </div>

              <DndContext
                sensors={sensors}
                onDragStart={(evento) => {
                  const id = Number(String(evento.active.id).replace("issue-", ""));
                  const issue = colunas.flatMap((c) => c.items).find((i) => i.id === id);
                  setArrastada(issue ?? null);
                }}
                onDragEnd={aoSoltar}
                onDragCancel={() => setArrastada(null)}
              >
                <div className="flex gap-3 overflow-x-auto pb-3 scroll-thin">
                  {colunas.map((coluna) => (
                    <ColunaKanban
                      key={coluna.status}
                      coluna={coluna}
                      projetosCor={projetosCor}
                      selecionadaId={selecionada?.id ?? null}
                      aoSelecionar={abrirEdicao}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {arrastada ? (
                    <div className="w-64 rotate-2 rounded-sgp border border-brand bg-surface p-2.5 shadow-n3">
                      <p className="font-mono text-2xs font-bold text-fg-muted">{arrastada.codigo}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs font-medium text-fg">{arrastada.titulo}</p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </>
          )}
          {!isLoading && !kanban && !isError && (
            <Vazio icone={ListChecks} titulo="Nenhuma issue cadastrada" descricao="Registre a primeira issue para acompanhar o quadro." acao={<Botao variante="primario" icone={Plus} onClick={abrirNova}>Nova issue</Botao>} />
          )}
        </>
      )}

      {aba === "resumo" && (
        <div className="space-y-4">
          <LinhaKPI
            itens={[
              { rotulo: "Total de issues", valor: numero(resumo?.total ?? 0), icone: ListChecks, cor: "#2563EB", subrotulo: "todas as situações" },
              { rotulo: "Abertas", valor: numero(resumo?.abertas ?? 0), icone: AlertCircle, cor: "#D97706", subrotulo: "em tratamento" },
              { rotulo: "Atrasadas", valor: numero(resumo?.atrasadas ?? 0), icone: CalendarClock, cor: "#DC2626", subrotulo: "prazo vencido" },
              {
                rotulo: "Tempo médio de resolução",
                valor: numero(resumo?.tempo_medio_resolucao ?? 0, 1) + " d",
                icone: Timer,
                cor: "#059669",
                subrotulo: "da abertura ao fechamento",
              },
              {
                rotulo: "Tipos distintos",
                valor: numero((resumo?.por_tipo ?? []).filter((t) => t.total > 0).length),
                icone: GitPullRequest,
                cor: "#8B5CF6",
                subrotulo: "issues, ações, mudanças e impedimentos",
              },
              {
                rotulo: "Críticas abertas",
                valor: numero((resumo?.por_prioridade ?? []).find((p) => p.prioridade === "CRITICA")?.total ?? 0),
                icone: Gauge,
                cor: "#DC2626",
                subrotulo: "prioridade crítica",
              },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <AlertTriangle className="size-4 text-fg-muted" aria-hidden /> Por tipo
              </h3>
              {barrasTipo.length === 0 ? (
                <p className="py-8 text-center text-xs text-fg-muted">Sem dados no filtro atual.</p>
              ) : (
                <GraficoBarras horizontal itens={barrasTipo} altura={200} formatarValor={(v) => numero(v)} />
              )}
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <Gauge className="size-4 text-fg-muted" aria-hidden /> Por prioridade (abertas)
              </h3>
              {fatiasPrioridade.length === 0 ? (
                <p className="py-8 text-center text-xs text-fg-muted">Sem issues abertas.</p>
              ) : (
                <GraficoDonut fatias={fatiasPrioridade} tamanho={168} espessura={22} centroRotulo="abertas" legenda unidade="" />
              )}
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                <LayoutList className="size-4 text-fg-muted" aria-hidden /> Por status
              </h3>
              {barrasStatus.length === 0 ? (
                <p className="py-8 text-center text-xs text-fg-muted">Sem dados no filtro atual.</p>
              ) : (
                <GraficoBarras horizontal itens={barrasStatus} altura={200} formatarValor={(v) => numero(v)} />
              )}
            </div>
          </div>
        </div>
      )}

      {aba === "tabela" && (
        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <ListChecks className="size-4 text-fg-muted" aria-hidden /> Todas as issues
            </h3>
            <span className="text-2xs text-fg-muted">{numero(lista.length)} item(ns) · colunas ordenáveis · clique para editar</span>
          </header>
          <Tabela
            colunas={colunasTabela}
            dados={lista}
            aoClicarLinha={(i) => abrirEdicao(i)}
            destaqueLinha={(i) => (i.atrasada ? "bg-danger-soft/25" : undefined)}
            vazio={
              <Vazio
                icone={Search}
                titulo="Nenhuma issue encontrada"
                descricao="Ajuste os filtros ou registre uma nova issue."
                acao={<Botao variante="primario" icone={Plus} onClick={abrirNova}>Nova issue</Botao>}
              />
            }
            compacta
          />
        </div>
      )}

      <PainelLateral
        aberto={formulario !== null && !novoAberto}
        onFechar={() => {
          setFormulario(null);
          setSelecionada(null);
        }}
        titulo={formulario?.id ? formulario.id + " · " + (selecionada?.codigo ?? "") : "Editar issue"}
        subtitulo={selecionada ? selecionada.project_nome + " · aberta em " + dataCurta(selecionada.data_abertura) : ""}
        largura="lg"
        rodape={
          <>
            {formulario?.id && (
              <Botao
                variante="perigo"
                icone={Trash2}
                onClick={() => selecionada && setParaExcluir(selecionada)}
                className="mr-auto"
              >
                Excluir
              </Botao>
            )}
            <Botao onClick={() => setFormulario(null)}>Cancelar</Botao>
            <Botao variante="primario" icone={Save} carregando={editar.isPending} onClick={salvar}>
              Salvar issue
            </Botao>
          </>
        }
      >
        {formulario && formulario.id !== null && (
          <div className="space-y-4">
            {selecionada && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-sgp border border-border bg-surface-2 py-2">
                  <p className="text-lg font-bold tabular-nums text-fg">{numero(selecionada.idade_dias)}</p>
                  <p className="text-2xs text-fg-muted">dias em aberto</p>
                </div>
                <div className="rounded-sgp border border-border bg-surface-2 py-2">
                  <p className={cn("text-lg font-bold tabular-nums", selecionada.atrasada ? "text-danger" : "text-success")}>
                    {selecionada.atrasada ? "Sim" : "Não"}
                  </p>
                  <p className="text-2xs text-fg-muted">atrasada</p>
                </div>
                <div className="rounded-sgp border border-border bg-surface-2 py-2">
                  <p className="text-lg font-bold tabular-nums text-fg">
                    {selecionada.data_resolucao ? numero(diasEntre(selecionada.data_abertura, selecionada.data_resolucao)) + " d" : "—"}
                  </p>
                  <p className="text-2xs text-fg-muted">até resolver</p>
                </div>
              </div>
            )}

            <Campo rotulo="Título" obrigatorio htmlFor="issue-titulo">
              <Entrada id="issue-titulo" value={formulario.titulo} onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })} />
            </Campo>

            <Campo rotulo="Descrição" htmlFor="issue-descricao">
              <AreaTexto
                id="issue-descricao"
                rows={3}
                value={formulario.descricao}
                onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
              />
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo rotulo="Tipo" htmlFor="issue-tipo">
                <Selecao id="issue-tipo" value={formulario.tipo} onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value })}>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Prioridade" htmlFor="issue-prioridade">
                <Selecao
                  id="issue-prioridade"
                  value={formulario.prioridade}
                  onChange={(e) => setFormulario({ ...formulario, prioridade: e.target.value })}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Status" htmlFor="issue-status">
                <Selecao id="issue-status" value={formulario.status} onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}>
                  {STATUS.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Projeto" htmlFor="issue-project">
                <Selecao id="issue-project" value={formulario.project} onChange={(e) => setFormulario({ ...formulario, project: e.target.value, risk: "" })}>
                  <option value="">Selecione o projeto</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.codigo} · {p.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Responsável" htmlFor="issue-responsavel">
                <Selecao
                  id="issue-responsavel"
                  value={formulario.responsavel}
                  onChange={(e) => setFormulario({ ...formulario, responsavel: e.target.value })}
                >
                  <option value="">Sem responsável</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <Campo
              rotulo="Risco relacionado"
              dica="Opcional. Vincule a issue ao risco do projeto que ela endereça ou mitiga."
              htmlFor="issue-risk"
            >
              <Selecao
                id="issue-risk"
                value={formulario.risk}
                disabled={!formulario.project}
                onChange={(e) => setFormulario({ ...formulario, risk: e.target.value })}
              >
                <option value="">Sem risco relacionado</option>
                {riscos.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.codigo} · {r.descricao.length > 90 ? r.descricao.slice(0, 89) + "…" : r.descricao}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Impacto" dica="O que acontece se a issue não for tratada." htmlFor="issue-impacto">
              <AreaTexto id="issue-impacto" rows={2} value={formulario.impacto} onChange={(e) => setFormulario({ ...formulario, impacto: e.target.value })} />
            </Campo>

            <Campo rotulo="Solução aplicada" htmlFor="issue-solucao">
              <AreaTexto id="issue-solucao" rows={3} value={formulario.solucao} onChange={(e) => setFormulario({ ...formulario, solucao: e.target.value })} />
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo rotulo="Aberta em" htmlFor="issue-abertura">
                <Entrada
                  id="issue-abertura"
                  type="date"
                  value={formulario.data_abertura}
                  onChange={(e) => setFormulario({ ...formulario, data_abertura: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Prazo" htmlFor="issue-prazo">
                <Entrada
                  id="issue-prazo"
                  type="date"
                  value={formulario.data_limite}
                  onChange={(e) => setFormulario({ ...formulario, data_limite: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Resolvida em" htmlFor="issue-resolucao">
                <Entrada
                  id="issue-resolucao"
                  type="date"
                  value={formulario.data_resolucao}
                  onChange={(e) => setFormulario({ ...formulario, data_resolucao: e.target.value })}
                />
              </Campo>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Esforço estimado (h)" htmlFor="issue-esforco">
                <Entrada
                  id="issue-esforco"
                  type="number"
                  step="0.5"
                  value={formulario.esforco_estimado}
                  onChange={(e) => setFormulario({ ...formulario, esforco_estimado: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Custo estimado (R$)" htmlFor="issue-custo">
                <Entrada
                  id="issue-custo"
                  type="number"
                  step="0.01"
                  value={formulario.custo_estimado}
                  onChange={(e) => setFormulario({ ...formulario, custo_estimado: e.target.value })}
                />
              </Campo>
            </div>

            {selecionada && selecionada.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selecionada.tags.map((t, i) => (
                  <Chip key={i} cor={CORES_TIPO[selecionada.tipo] ?? "#64748B"}>
                    {t}
                  </Chip>
                ))}
              </div>
            )}

            {selecionada && (
              <p className="text-2xs text-fg-subtle">
                Criada em {dataHora(selecionada.data_abertura)} · última posição no Kanban {numero(selecionada.posicao_visual)}
              </p>
            )}
          </div>
        )}
      </PainelLateral>

      <Modal
        aberto={novoAberto}
        onFechar={() => {
          setNovoAberto(false);
          setFormulario(null);
        }}
        titulo="Nova issue"
        subtitulo="Registre issues, ações corretivas, mudanças ou impedimentos"
        largura="lg"
        rodape={
          <>
            <Botao
              onClick={() => {
                setNovoAberto(false);
                setFormulario(null);
              }}
            >
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Plus} carregando={criar.isPending} onClick={salvar}>
              Registrar issue
            </Botao>
          </>
        }
      >
        {formulario && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Projeto" obrigatorio htmlFor="nova-project">
                <Selecao id="nova-project" value={formulario.project} onChange={(e) => setFormulario({ ...formulario, project: e.target.value, risk: "" })}>
                  <option value="">Selecione o projeto</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.codigo} · {p.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Tipo" htmlFor="nova-tipo">
                <Selecao id="nova-tipo" value={formulario.tipo} onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value })}>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <Campo rotulo="Título" obrigatorio htmlFor="nova-titulo">
              <Entrada
                id="nova-titulo"
                value={formulario.titulo}
                onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })}
                placeholder="Ex.: Integração com o ERP falha em lotes acima de 5 mil registros"
              />
            </Campo>

            <Campo rotulo="Descrição" htmlFor="nova-descricao">
              <AreaTexto
                id="nova-descricao"
                rows={3}
                value={formulario.descricao}
                onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
              />
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo rotulo="Prioridade" htmlFor="nova-prioridade">
                <Selecao
                  id="nova-prioridade"
                  value={formulario.prioridade}
                  onChange={(e) => setFormulario({ ...formulario, prioridade: e.target.value })}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Status" htmlFor="nova-status">
                <Selecao id="nova-status" value={formulario.status} onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}>
                  {STATUS.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Responsável" htmlFor="nova-responsavel">
                <Selecao
                  id="nova-responsavel"
                  value={formulario.responsavel}
                  onChange={(e) => setFormulario({ ...formulario, responsavel: e.target.value })}
                >
                  <option value="">Sem responsável</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <Campo
              rotulo="Risco relacionado"
              dica="Opcional. Vincule a issue ao risco do projeto que ela endereça ou mitiga."
              htmlFor="nova-risk"
            >
              <Selecao
                id="nova-risk"
                value={formulario.risk}
                disabled={!formulario.project}
                onChange={(e) => setFormulario({ ...formulario, risk: e.target.value })}
              >
                <option value="">Sem risco relacionado</option>
                {riscos.map((r) => (
                  <option key={r.id} value={String(r.id)}>
                    {r.codigo} · {r.descricao.length > 90 ? r.descricao.slice(0, 89) + "…" : r.descricao}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Impacto" htmlFor="nova-impacto">
              <AreaTexto id="nova-impacto" rows={2} value={formulario.impacto} onChange={(e) => setFormulario({ ...formulario, impacto: e.target.value })} />
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo rotulo="Aberta em" htmlFor="nova-abertura">
                <Entrada
                  id="nova-abertura"
                  type="date"
                  value={formulario.data_abertura}
                  onChange={(e) => setFormulario({ ...formulario, data_abertura: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Prazo" htmlFor="nova-prazo">
                <Entrada
                  id="nova-prazo"
                  type="date"
                  value={formulario.data_limite}
                  onChange={(e) => setFormulario({ ...formulario, data_limite: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Esforço estimado (h)" htmlFor="nova-esforco">
                <Entrada
                  id="nova-esforco"
                  type="number"
                  step="0.5"
                  value={formulario.esforco_estimado}
                  onChange={(e) => setFormulario({ ...formulario, esforco_estimado: e.target.value })}
                />
              </Campo>
            </div>

            <Campo rotulo="Custo estimado (R$)" htmlFor="nova-custo">
              <Entrada
                id="nova-custo"
                type="number"
                step="0.01"
                value={formulario.custo_estimado}
                onChange={(e) => setFormulario({ ...formulario, custo_estimado: e.target.value })}
              />
            </Campo>
          </div>
        )}
      </Modal>

      <Modal
        aberto={paraExcluir !== null}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir issue"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao onClick={() => setParaExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={() => paraExcluir && excluir.mutate({ id: paraExcluir.id })}
            >
              Excluir
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão de <strong>{paraExcluir?.codigo}</strong> — {paraExcluir?.titulo}?
        </p>
      </Modal>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2, ChevronRight, Clock,
  DollarSign, Filter, Flame, Gauge, Grid3x3, History, LayoutDashboard, Map as IconeMapa, Pencil, Plus,
  RefreshCw, Save, ShieldAlert, SlidersHorizontal, Target, Trash2, Users, Zap,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraFerramentas, Botao, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, ControleDeslizante, Entrada, Etiqueta, FiltrosAtivos, GradeCards,
  Modal, SecaoColapsavel, Selecao, Tabela, Vazio, useAvisos, type ColunaTabela,
} from "@/components/ui";
import { EscalaCores, GraficoBarras, GraficoDonut, type FatiaDonut } from "@/components/charts";
import { FiltroSelect, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataHora, indice, moeda, numero, percentual } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import type { ProjetoResumo, Risco, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Riscos: matriz interativa 5x5, heatmap por projeto e painel (RF-23/24/26)
   ========================================================================== */

const CATEGORIAS = [
  { valor: "ESCOPO", rotulo: "Escopo" },
  { valor: "PRAZO", rotulo: "Prazo" },
  { valor: "CUSTO", rotulo: "Custo" },
  { valor: "QUALIDADE", rotulo: "Qualidade" },
  { valor: "RECURSOS", rotulo: "Recursos / Capacidades" },
  { valor: "TECNICO", rotulo: "Técnico" },
  { valor: "REGULATORIO", rotulo: "Regulatório / Compliance" },
  { valor: "SEGURANCA", rotulo: "Segurança da informação" },
  { valor: "FORNECEDOR", rotulo: "Fornecedor" },
  { valor: "MERCADO", rotulo: "Mercado" },
  { valor: "PESSOAS", rotulo: "Pessoas" },
  { valor: "OUTRO", rotulo: "Outro" },
];

const ESTRATEGIAS = [
  { valor: "EVITAR", rotulo: "Evitar" },
  { valor: "MITIGAR", rotulo: "Mitigar" },
  { valor: "TRANSFERIR", rotulo: "Transferir" },
  { valor: "ACEITAR", rotulo: "Aceitar" },
  { valor: "EXPLORAR", rotulo: "Explorar (oportunidade)" },
  { valor: "ELEVAR", rotulo: "Elevar (oportunidade)" },
  { valor: "COMPARTILHAR", rotulo: "Compartilhar" },
];

const STATUS_RISCO = [
  { valor: "IDENTIFICADO", rotulo: "Identificado" },
  { valor: "EM_ANALISE", rotulo: "Em análise" },
  { valor: "PLANEJADO", rotulo: "Com resposta planejada" },
  { valor: "MITIGANDO", rotulo: "Mitigação em curso" },
  { valor: "MONITORANDO", rotulo: "Monitorando" },
  { valor: "OCORRIDO", rotulo: "Ocorrido" },
  { valor: "ENCERRADO", rotulo: "Encerrado" },
];

const NIVEIS = [
  { valor: "BAIXO", rotulo: "Baixo" },
  { valor: "MEDIO", rotulo: "Médio" },
  { valor: "ALTO", rotulo: "Alto" },
  { valor: "EXTREMO", rotulo: "Extremo" },
];

const CORES_NIVEL: Record<string, string> = {
  BAIXO: "#10B981",
  MEDIO: "#F59E0B",
  ALTO: "#F97316",
  EXTREMO: "#EF4444",
};

function corSeveridade(severidade: number) {
  if (severidade <= 4) return "#10B981";
  if (severidade <= 9) return "#F59E0B";
  if (severidade <= 16) return "#F97316";
  return "#EF4444";
}

function nivelSeveridade(severidade: number) {
  if (severidade <= 4) return "Baixo";
  if (severidade <= 9) return "Médio";
  if (severidade <= 16) return "Alto";
  return "Extremo";
}

function chaveNivel(severidade: number) {
  if (severidade <= 4) return "BAIXO";
  if (severidade <= 9) return "MEDIO";
  if (severidade <= 16) return "ALTO";
  return "EXTREMO";
}

function rotuloCategoria(valor: string) {
  return CATEGORIAS.find((c) => c.valor === valor)?.rotulo ?? valor;
}

function rotuloEstrategia(valor: string) {
  return ESTRATEGIAS.find((e) => e.valor === valor)?.rotulo ?? valor;
}

function rotuloStatus(valor: string) {
  return STATUS_RISCO.find((s) => s.valor === valor)?.rotulo ?? valor;
}

interface ItemMatriz {
  id: number;
  codigo: string;
  descricao: string;
  nivel: string;
  cor: string;
  responsavel: string;
  corResponsavel: string;
}

interface RespostaMatriz {
  celulas: Array<{
    probabilidade: number;
    impacto: number;
    severidade: number;
    nivel: string;
    rotulo: string;
    cor: string;
    total: number;
    riscos: Array<{
      id: number;
      codigo: string;
      descricao: string;
      nivel: string;
      status: string;
      cor: string;
      project_id: number;
      projeto: string;
      responsavel: string;
    }>;
  }>;
  total: number;
  escala: Array<{ valor: number; cor: string }>;
  legenda: Array<{ nivel: string; rotulo: string; cor: string; ate: number }>;
  por_categoria: Array<{ categoria: string; total: number }>;
  por_estrategia: Array<{ estrategia: string; total: number }>;
}

interface ProjetoHeatmap {
  id?: number;
  project_id: number;
  projeto: string;
  cor: string;
  total: number;
  severidade_media: number;
  indice_risco: number;
  por_nivel: Record<string, number>;
  por_categoria: Record<string, number>;
}

interface HistoricoRisco {
  id: number;
  risk: number;
  probabilidade: number;
  impacto: number;
  severidade: number;
  status: string;
  comentario: string;
  registrado_por: number | null;
  registrado_por_nome: string;
  criado_em: string;
}

interface ProjetoRiscoPainel {
  id?: number;
  project_id: number;
  projeto: string;
  cor: string;
  riscos: number;
  criticos: number;
  severidade_media: number;
}

interface RespostaPainelRiscos {
  total_riscos: number;
  por_nivel: Array<{ nivel: string; total: number }>;
  por_categoria: Array<{ categoria: string; total: number }>;
  por_estrategia: Array<{ estrategia: string; total: number }>;
  exposicao_total: number;
  custo_mitigacao: number;
  top_riscos: Risco[];
  riscos_atrasados: Risco[];
  matriz_resumo: Array<{ probabilidade: number; impacto: number; severidade: number; nivel: string; cor: string; total: number }>;
  issues: {
    abertas: number;
    atrasadas: number;
    por_tipo: Array<{ tipo: string; total: number }>;
    por_prioridade: Array<{ prioridade: string; total: number }>;
    por_projeto: Array<{ project__nome: string; project__cor: string; total: number }>;
  };
  por_projeto: ProjetoRiscoPainel[];
  categorias: Array<{ valor: string; rotulo: string }>;
  estrategias: Array<{ valor: string; rotulo: string }>;
  gerado_em: string;
}

interface FormularioRisco {
  project: string;
  descricao: string;
  causa: string;
  efeito: string;
  categoria: string;
  estrategia: string;
  probabilidade: number;
  impacto: number;
  responsavel: string;
  status: string;
  data_limite: string;
  custo_mitigacao: string;
  valor_monetario_esperado: string;
  plano_resposta: string;
  contingencia: string;
  gatilhos: string;
  tags: string;
}

function formularioRiscoVazio(): FormularioRisco {
  return {
    project: "",
    descricao: "",
    causa: "",
    efeito: "",
    categoria: "ESCOPO",
    estrategia: "MITIGAR",
    probabilidade: 3,
    impacto: 3,
    responsavel: "",
    status: "IDENTIFICADO",
    data_limite: "",
    custo_mitigacao: "0",
    valor_monetario_esperado: "0",
    plano_resposta: "",
    contingencia: "",
    gatilhos: "",
    tags: "",
  };
}

/** Converte listas digitadas (vírgula, ponto e vírgula ou linha) em array de texto. */
function listaDeTexto(valor: string) {
  return valor
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Reaproveita o formulário de criação para corrigir um risco já registrado. */
function formularioDeRisco(risco: Risco): FormularioRisco {
  return {
    project: String(risco.project),
    descricao: risco.descricao,
    causa: risco.causa || "",
    efeito: risco.efeito || "",
    categoria: risco.categoria || "ESCOPO",
    estrategia: risco.estrategia || "MITIGAR",
    probabilidade: risco.probabilidade,
    impacto: risco.impacto,
    responsavel: risco.responsavel ? String(risco.responsavel) : "",
    status: risco.status || "IDENTIFICADO",
    data_limite: risco.data_limite || "",
    custo_mitigacao: String(Number(risco.custo_mitigacao || 0)),
    valor_monetario_esperado: String(Number(risco.valor_monetario_esperado || 0)),
    plano_resposta: risco.plano_resposta || "",
    contingencia: risco.contingencia || "",
    gatilhos: (risco.gatilhos || []).join(", "),
    tags: (risco.tags || []).join(", "),
  };
}

function RiscoArrastavel({
  item,
  selecionado,
  aoSelecionar,
}: {
  item: ItemMatriz;
  selecionado: boolean;
  aoSelecionar: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "risco-" + item.id,
    data: { riscoId: item.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => aoSelecionar(item.id)}
      aria-label={"Risco " + item.codigo + ": " + item.descricao}
      title={item.codigo + " · " + item.descricao}
      style={{
        transform: transform ? "translate3d(" + Math.round(transform.x) + "px, " + Math.round(transform.y) + "px, 0)" : undefined,
        touchAction: "none",
        borderColor: item.cor + "77",
        backgroundColor: item.cor + "18",
      }}
      className={cn(
        "flex cursor-grab items-center gap-1.5 rounded-md border px-1.5 py-1 transition-all active:cursor-grabbing",
        isDragging && "opacity-40",
        selecionado && "ring-2 ring-brand"
      )}
    >
      <span className="shrink-0 font-mono text-2xs font-bold" style={{ color: item.cor }}>
        {item.codigo}
      </span>
      <span className="min-w-0 flex-1 truncate text-2xs text-fg">{item.descricao}</span>
      <Avatar nome={item.responsavel || "Sem responsável"} cor={item.corResponsavel} tamanho="xs" />
    </div>
  );
}

function CelulaMatriz({
  probabilidade,
  impacto,
  itens,
  selecionadoId,
  aoSelecionar,
}: {
  probabilidade: number;
  impacto: number;
  itens: ItemMatriz[];
  selecionadoId: number | null;
  aoSelecionar: (id: number) => void;
}) {
  const severidade = probabilidade * impacto;
  const cor = corSeveridade(severidade);
  const { setNodeRef, isOver } = useDroppable({ id: "celula-" + probabilidade + "-" + impacto });
  return (
    <div
      ref={setNodeRef}
      style={{ borderColor: isOver ? cor : cor + "55", backgroundColor: cor + (isOver ? "33" : "12") }}
      className={cn("flex min-h-24 flex-col gap-1 rounded-sgp border p-1.5 transition-all", isOver && "ring-2 ring-brand")}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-2xs font-bold" style={{ color: cor }}>
          {severidade}
        </span>
        <span className="rounded-full px-1.5 text-2xs font-semibold" style={{ backgroundColor: cor + "26", color: cor }}>
          {itens.length}
        </span>
      </div>
      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto scroll-thin">
        {itens.map((item) => (
          <RiscoArrastavel key={item.id} item={item} selecionado={selecionadoId === item.id} aoSelecionar={aoSelecionar} />
        ))}
      </div>
    </div>
  );
}

export default function Riscos() {
  const navegar = useNavigate();
  const { sucesso, alerta, erro: avisarErro } = useAvisos();
  const { pode } = useAuth();
  const podeEditar = pode("risco.editar");
  const podeExcluir = pode("risco.excluir");
  const [searchParams, setSearchParams] = useSearchParams();

  const aba = (searchParams.get("aba") ?? "matriz") as "matriz" | "heatmap" | "painel";
  const [projeto, setProjeto] = useState(searchParams.get("projeto") ?? "");
  const [categoria, setCategoria] = useState("");
  const [status, setStatus] = useState("");
  const [nivel, setNivel] = useState("");
  const [responsavel, setResponsavel] = useState("");

  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [itemArrastado, setItemArrastado] = useState<ItemMatriz | null>(null);
  const [movimento, setMovimento] = useState<{ riscoId: number; probabilidade: number; impacto: number; codigo: string } | null>(null);
  const [comentario, setComentario] = useState("");
  const [overrides, setOverrides] = useState<Record<number, { probabilidade: number; impacto: number }>>({});
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<Risco | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Risco | null>(null);
  const [formulario, setFormulario] = useState<FormularioRisco>(formularioRiscoVazio());
  const [projetoDrill, setProjetoDrill] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const filtros = useMemo(
    () => ({
      ...(projeto ? { project: projeto } : {}),
      ...(categoria ? { categoria } : {}),
      ...(status ? { status } : {}),
      ...(nivel ? { nivel } : {}),
      ...(responsavel ? { responsavel } : {}),
      page_size: 400,
    }),
    [projeto, categoria, status, nivel, responsavel]
  );

  const { data: riscos = [], isLoading, isError, error, refetch, isFetching } = useLista<Risco>(
    CHAVES.riscos,
    "/riscos/",
    filtros
  );

  const { data: matriz } = useConsulta<RespostaMatriz>(CHAVES.matrizRiscos, "/riscos/matriz/", filtros);
  const { data: projetos = [] } = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 300 });
  const { data: usuarios = [] } = useLista<UsuarioResumo>(["usuarios"], "/usuarios/", { ativo: true, page_size: 500 });

  const { data: heatmap } = useConsulta<{ projetos: ProjetoHeatmap[] }>(
    ["riscos", "heatmap"],
    aba === "heatmap" ? "/riscos/heatmap/" : null,
    { page_size: 200 }
  );

  const { data: painel, isError: erroPainel, error: falhaPainel } = useConsulta<RespostaPainelRiscos>(
    CHAVES.dashboardRiscos,
    aba === "painel" ? "/dashboard/riscos/" : null,
    projeto ? { project: projeto } : {}
  );

  const selecionado = useMemo(() => riscos.find((r) => r.id === selecionadoId) ?? null, [riscos, selecionadoId]);

  // O responsável atual entra na lista mesmo fora dos usuários ativos, para a
  // edição não trocar o responsável do risco por engano.
  const opcoesResponsavel = useMemo(() => {
    const lista = usuarios.map((u) => ({ id: u.id, nome: u.nome }));
    const atual = editando?.responsavel_detalhe;
    if (atual && !lista.some((u) => u.id === atual.id)) lista.push({ id: atual.id, nome: atual.nome });
    return lista;
  }, [usuarios, editando]);

  const { data: historico } = useConsulta<{ risco: Risco; historico: HistoricoRisco[] }>(
    ["riscos", "historico", String(selecionadoId ?? "")],
    selecionadoId ? "/riscos/" + selecionadoId + "/historico/" : null
  );

  const [plano, setPlano] = useState({
    estrategia: "MITIGAR",
    plano_resposta: "",
    contingencia: "",
    prob_residual: 0,
    imp_residual: 0,
    data_limite: "",
    responsavel: "",
  });

  useEffect(() => {
    if (!selecionado) return;
    setPlano({
      estrategia: selecionado.estrategia,
      plano_resposta: selecionado.plano_resposta,
      contingencia: selecionado.contingencia,
      prob_residual: selecionado.prob_residual,
      imp_residual: selecionado.imp_residual,
      data_limite: selecionado.data_limite ?? "",
      responsavel: selecionado.responsavel ? String(selecionado.responsavel) : "",
    });
    // Recarrega o formulário apenas quando muda o risco selecionado, preservando edições em andamento.
  }, [selecionado?.id]);

  const mover = useMutacao<{ id: number; probabilidade: number; impacto: number; comentario: string }, Risco>({
    url: (v) => "/riscos/" + v.id + "/mover/",
    invalidar: [CHAVES.riscos, CHAVES.matrizRiscos, CHAVES.dashboardRiscos, ["riscos", "heatmap"]],
    mensagemSucesso: (resposta) =>
      "Risco reposicionado para P" + resposta.probabilidade + " × I" + resposta.impacto + " (" + resposta.nivel_rotulo + ")",
    aoSucesso: (_resposta, variaveis) => {
      setOverrides((atual) => {
        const copia = { ...atual };
        delete copia[variaveis.id];
        return copia;
      });
      setMovimento(null);
      setComentario("");
    },
  });

  const salvarPlano = useMutacao<Record<string, unknown> & { id: number }, Risco>({
    url: (v) => "/riscos/" + v.id + "/plano-resposta/",
    invalidar: [CHAVES.riscos, CHAVES.matrizRiscos, CHAVES.dashboardRiscos, ["riscos", "historico", String(selecionadoId ?? "")]],
    mensagemSucesso: "Plano de resposta salvo",
  });

  const criar = useMutacao<Record<string, unknown>, Risco>({
    url: "/riscos/",
    invalidar: [CHAVES.riscos, CHAVES.matrizRiscos, CHAVES.dashboardRiscos, ["riscos", "heatmap"]],
    mensagemSucesso: "Risco registrado",
    aoSucesso: () => fecharFormulario(),
  });

  const atualizar = useMutacao<Record<string, unknown> & { id: number }, Risco>({
    metodo: "patch",
    url: (v) => "/riscos/" + v.id + "/",
    invalidar: [CHAVES.riscos, CHAVES.matrizRiscos, CHAVES.dashboardRiscos],
    mensagemSucesso: "Risco atualizado",
    aoSucesso: () => fecharFormulario(),
  });

  const excluir = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (v) => "/riscos/" + v.id + "/",
    invalidar: [CHAVES.riscos, CHAVES.matrizRiscos, CHAVES.dashboardRiscos],
    mensagemSucesso: "Risco excluído",
    aoSucesso: () => {
      setParaExcluir(null);
      setSelecionadoId(null);
    },
  });

  function fecharFormulario() {
    setNovoAberto(false);
    setEditando(null);
    setFormulario(formularioRiscoVazio());
  }

  function abrirEdicao(risco: Risco) {
    setEditando(risco);
    setFormulario(formularioDeRisco(risco));
  }

  function mudarAba(valor: string) {
    const proximos = new URLSearchParams(searchParams);
    proximos.set("aba", valor);
    setSearchParams(proximos, { replace: true });
  }

  function mudarProjeto(valor: string) {
    setProjeto(valor);
    const proximos = new URLSearchParams(searchParams);
    if (valor) proximos.set("projeto", valor);
    else proximos.delete("projeto");
    setSearchParams(proximos, { replace: true });
  }

  const itensPorCelula = useMemo(() => {
    const mapa = new Map<string, ItemMatriz[]>();
    riscos.forEach((r) => {
      const posicao = overrides[r.id] ?? { probabilidade: r.probabilidade, impacto: r.impacto };
      const chave = posicao.probabilidade + "-" + posicao.impacto;
      const lista = mapa.get(chave) ?? [];
      lista.push({
        id: r.id,
        codigo: r.codigo,
        descricao: r.descricao,
        nivel: r.nivel,
        cor: r.cor,
        responsavel: r.responsavel_detalhe?.nome ?? "",
        corResponsavel: r.responsavel_detalhe?.cor ?? "#64748B",
      });
      mapa.set(chave, lista);
    });
    return mapa;
  }, [riscos, overrides]);

  const totalMatriz = matriz?.total ?? riscos.length;

  const fatiasNivel: FatiaDonut[] = useMemo(
    () =>
      (painel?.por_nivel ?? [])
        .filter((n) => n.total > 0)
        .map((n) => ({ rotulo: NIVEIS.find((x) => x.valor === n.nivel)?.rotulo ?? n.nivel, valor: n.total, cor: CORES_NIVEL[n.nivel] ?? "#94A3B8" })),
    [painel]
  );

  const barrasCategoria: FatiaDonut[] = useMemo(
    () =>
      (matriz?.por_categoria ?? []).slice(0, 10).map((c) => ({ rotulo: rotuloCategoria(c.categoria), valor: c.total, cor: "#0891B2" })),
    [matriz]
  );

  const barrasEstrategia: FatiaDonut[] = useMemo(
    () =>
      (matriz?.por_estrategia ?? []).slice(0, 10).map((e) => ({ rotulo: rotuloEstrategia(e.estrategia), valor: e.total, cor: "#8B5CF6" })),
    [matriz]
  );

  const heatmapFiltrado = useMemo(() => heatmap?.projetos ?? [], [heatmap]);
  const projetoDrillDetalhe = useMemo(
    () => heatmapFiltrado.find((p) => p.project_id === projetoDrill) ?? null,
    [heatmapFiltrado, projetoDrill]
  );

  const colunasPainel: Array<ColunaTabela<Risco>> = [
    {
      chave: "codigo",
      titulo: "Código",
      largura: "90px",
      renderizar: (r) => <span className="font-mono text-2xs font-semibold text-fg-muted">{r.codigo}</span>,
    },
    {
      chave: "descricao",
      titulo: "Risco",
      ordenavel: true,
      valorOrdenacao: (r) => r.descricao,
      renderizar: (r) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-fg">{r.descricao}</p>
          <p className="truncate text-2xs text-fg-muted">
            {r.project_nome} · {r.categoria_rotulo}
          </p>
        </div>
      ),
    },
    {
      chave: "nivel",
      titulo: "Nível",
      largura: "110px",
      ordenavel: true,
      valorOrdenacao: (r) => r.severidade,
      renderizar: (r) => (
        <Etiqueta cor={CORES_NIVEL[r.nivel]} solido>
          {r.nivel_rotulo}
        </Etiqueta>
      ),
    },
    {
      chave: "severidade",
      titulo: "P × I",
      largura: "80px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (r) => r.severidade,
      renderizar: (r) => (
        <span className="font-bold tabular-nums text-fg">
          {r.probabilidade}×{r.impacto}
        </span>
      ),
    },
    {
      chave: "exposicao",
      titulo: "Exposição",
      largura: "120px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (r) => r.exposicao,
      renderizar: (r) => <span className="tabular-nums text-xs text-fg">{moeda(r.exposicao, true)}</span>,
    },
    {
      chave: "responsavel",
      titulo: "Responsável",
      largura: "170px",
      renderizar: (r) => (
        <span className="flex items-center gap-2">
          <Avatar nome={r.responsavel_detalhe?.nome ?? "Sem responsável"} cor={r.responsavel_detalhe?.cor} tamanho="xs" />
          <span className="truncate text-xs text-fg-muted">{r.responsavel_detalhe?.nome ?? "—"}</span>
        </span>
      ),
    },
  ];

  function aoIniciarArraste(evento: { active: { id: string | number } }) {
    const id = Number(String(evento.active.id).replace("risco-", ""));
    const item = riscos.find((r) => r.id === id);
    if (item) {
      setItemArrastado({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        nivel: item.nivel,
        cor: item.cor,
        responsavel: item.responsavel_detalhe?.nome ?? "",
        corResponsavel: item.responsavel_detalhe?.cor ?? "#64748B",
      });
    }
  }

  function aoSoltar(evento: DragEndEvent) {
    setItemArrastado(null);
    const { active, over } = evento;
    if (!over) return;
    const id = Number(String(active.id).replace("risco-", ""));
    const partes = String(over.id).replace("celula-", "").split("-");
    const novaProbabilidade = Number(partes[0]);
    const novoImpacto = Number(partes[1]);
    if (!novaProbabilidade || !novoImpacto) return;
    const risco = riscos.find((r) => r.id === id);
    if (!risco) return;
    if (risco.probabilidade === novaProbabilidade && risco.impacto === novoImpacto) return;
    setOverrides((atual) => ({ ...atual, [id]: { probabilidade: novaProbabilidade, impacto: novoImpacto } }));
    setComentario(
      "Reposicionado de P" + risco.probabilidade + "×I" + risco.impacto + " (" + risco.nivel_rotulo + ") para P" +
        novaProbabilidade + "×I" + novoImpacto + " (" + nivelSeveridade(novaProbabilidade * novoImpacto) + ")"
    );
    setMovimento({ riscoId: id, probabilidade: novaProbabilidade, impacto: novoImpacto, codigo: risco.codigo });
  }

  function cancelarMovimento() {
    if (movimento) {
      setOverrides((atual) => {
        const copia = { ...atual };
        delete copia[movimento.riscoId];
        return copia;
      });
    }
    setMovimento(null);
    setComentario("");
  }

  function confirmarMovimento() {
    if (!movimento) return;
    mover.mutate({
      id: movimento.riscoId,
      probabilidade: movimento.probabilidade,
      impacto: movimento.impacto,
      comentario: comentario.trim() || "Reposicionado na matriz",
    });
  }

  function salvarPlanoResposta() {
    if (!selecionado) return;
    salvarPlano.mutate({
      id: selecionado.id,
      estrategia: plano.estrategia,
      plano_resposta: plano.plano_resposta,
      contingencia: plano.contingencia,
      prob_residual: plano.prob_residual,
      imp_residual: plano.imp_residual,
      data_limite: plano.data_limite || null,
      responsavel: plano.responsavel ? Number(plano.responsavel) : null,
    });
  }

  function salvarRisco() {
    if (!formulario.project) {
      alerta("Projeto obrigatório", "Selecione o projeto do risco.");
      return;
    }
    if (!formulario.descricao.trim()) {
      alerta("Descrição obrigatória", "Descreva o risco identificado.");
      return;
    }
    const corpo: Record<string, unknown> = {
      project: Number(formulario.project),
      descricao: formulario.descricao.trim(),
      causa: formulario.causa,
      efeito: formulario.efeito,
      categoria: formulario.categoria,
      estrategia: formulario.estrategia,
      probabilidade: formulario.probabilidade,
      impacto: formulario.impacto,
      responsavel: formulario.responsavel ? Number(formulario.responsavel) : null,
      status: formulario.status,
      data_limite: formulario.data_limite || null,
      custo_mitigacao: Number(formulario.custo_mitigacao || 0),
      valor_monetario_esperado: Number(formulario.valor_monetario_esperado || 0),
      plano_resposta: formulario.plano_resposta,
      contingencia: formulario.contingencia,
      gatilhos: listaDeTexto(formulario.gatilhos),
      tags: listaDeTexto(formulario.tags),
    };
    if (editando) atualizar.mutate({ ...corpo, id: editando.id });
    else criar.mutate(corpo);
  }

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
    ...(categoria ? [{ chave: "categoria", rotulo: "Categoria", valor: rotuloCategoria(categoria), onRemover: () => setCategoria("") }] : []),
    ...(status ? [{ chave: "status", rotulo: "Status", valor: rotuloStatus(status), onRemover: () => setStatus("") }] : []),
    ...(nivel ? [{ chave: "nivel", rotulo: "Nível", valor: NIVEIS.find((n) => n.valor === nivel)?.rotulo ?? nivel, onRemover: () => setNivel("") }] : []),
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
  ];

  function limparFiltros() {
    mudarProjeto("");
    setCategoria("");
    setStatus("");
    setNivel("");
    setResponsavel("");
  }

  const severidadeFormulario = formulario.probabilidade * formulario.impacto;
  const severidadeResidual = plano.prob_residual * plano.imp_residual;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Gestão de riscos"
        subtitulo={numero(totalMatriz) + " risco(s) ativo(s) · matriz probabilidade × impacto (RF-23 / RF-26)"}
        icone={ShieldAlert}
        cor="#EF4444"
        migalhas={[{ rotulo: "Início", onClick: () => navegar("/") }, { rotulo: "Riscos" }]}
        acoes={
          <>
            <Botao icone={RefreshCw} onClick={() => refetch()} carregando={isFetching}>
              Atualizar
            </Botao>
            <Botao
              variante="primario"
              icone={Plus}
              onClick={() => {
                setEditando(null);
                setFormulario({ ...formularioRiscoVazio(), project: projeto });
                setNovoAberto(true);
              }}
            >
              Novo risco
            </Botao>
          </>
        }
        filhos={
          <Abas
            valor={aba}
            onChange={mudarAba}
            abas={[
              { valor: "matriz", rotulo: "Matriz interativa", icone: Grid3x3, contagem: totalMatriz },
              { valor: "heatmap", rotulo: "Heatmap por projeto", icone: IconeMapa },
              { valor: "painel", rotulo: "Painel", icone: LayoutDashboard },
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
        <FiltroSelect
          rotulo="Categoria"
          valor={categoria}
          onChange={setCategoria}
          opcoes={(painel?.categorias ?? CATEGORIAS).map((c) => ({ valor: c.valor, rotulo: c.rotulo }))}
        />
        <FiltroSelect rotulo="Status" valor={status} onChange={setStatus} opcoes={STATUS_RISCO} />
        <FiltroSelect rotulo="Nível" valor={nivel} onChange={setNivel} opcoes={NIVEIS} />
        <FiltroSelect
          rotulo="Responsável"
          valor={responsavel}
          onChange={setResponsavel}
          icone={Users}
          opcoes={usuarios.map((u) => ({ valor: String(u.id), rotulo: u.nome }))}
        />
        <span className="ml-auto text-2xs text-fg-muted">
          Arraste os cards entre as células para reposicionar o risco na matriz.
        </span>
      </BarraFerramentas>

      <FiltrosAtivos filtros={filtrosAtivos} onLimpar={limparFiltros} />

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os riscos">
          {mensagemErro(error)}
        </Alerta>
      )}

      {isLoading && <CarregandoBloco rotulo="Carregando riscos..." />}

      {aba === "matriz" && !isLoading && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Grid3x3 className="size-4 text-fg-muted" aria-hidden /> Matriz de riscos 5 × 5
                </h3>
                <EscalaCores rotulos={["Baixo", "Médio", "Alto", "Extremo"]} cores={["#10B981", "#F59E0B", "#F97316", "#EF4444"]} titulo="Severidade" />
              </div>
              <div className="flex gap-1.5">
                <div className="flex w-7 shrink-0 flex-col justify-around pb-6">
                  {[5, 4, 3, 2, 1].map((p) => (
                    <span key={p} className="text-center text-xs font-bold text-fg-muted" title={"Probabilidade " + p}>
                      {p}
                    </span>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <DndContext
                    sensors={sensors}
                    onDragStart={(evento) => aoIniciarArraste(evento)}
                    onDragEnd={aoSoltar}
                    onDragCancel={() => setItemArrastado(null)}
                  >
                    <div className="grid grid-cols-5 gap-1.5">
                      {[5, 4, 3, 2, 1].map((p) =>
                        [1, 2, 3, 4, 5].map((i) => (
                          <CelulaMatriz
                            key={p + "-" + i}
                            probabilidade={p}
                            impacto={i}
                            itens={itensPorCelula.get(p + "-" + i) ?? []}
                            selecionadoId={selecionadoId}
                            aoSelecionar={setSelecionadoId}
                          />
                        ))
                      )}
                    </div>
                    <DragOverlay>
                      {itemArrastado ? (
                        <div
                          className="flex items-center gap-1.5 rounded-md border bg-surface px-2 py-1 shadow-n3"
                          style={{ borderColor: itemArrastado.cor }}
                        >
                          <span className="font-mono text-2xs font-bold" style={{ color: itemArrastado.cor }}>
                            {itemArrastado.codigo}
                          </span>
                          <span className="max-w-40 truncate text-2xs text-fg">{itemArrastado.descricao}</span>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                  <div className="mt-1 grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="text-center text-xs font-bold text-fg-muted" title={"Impacto " + i}>
                        {i}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-center text-2xs text-fg-subtle">Impacto →</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-2xs text-fg-muted">
                  {numero(totalMatriz)} risco(s) distribuídos · {numero(riscos.filter((r) => r.atrasado).length)} com resposta atrasada
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Chip cor="#EF4444">{numero(riscos.filter((r) => r.nivel === "EXTREMO").length)} extremos</Chip>
                  <Chip cor="#F97316">{numero(riscos.filter((r) => r.nivel === "ALTO").length)} altos</Chip>
                  <Chip cor="#F59E0B">{numero(riscos.filter((r) => r.nivel === "MEDIO").length)} médios</Chip>
                  <Chip cor="#10B981">{numero(riscos.filter((r) => r.nivel === "BAIXO").length)} baixos</Chip>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                  <BarChart3 className="size-4 text-fg-muted" aria-hidden /> Riscos por categoria
                </h3>
                {barrasCategoria.length === 0 ? (
                  <p className="py-6 text-center text-xs text-fg-muted">Sem riscos no filtro atual.</p>
                ) : (
                  <GraficoBarras itens={barrasCategoria} altura={200} formatarValor={(v) => numero(v)} mostrarEixo />
                )}
              </div>
              <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                  <Target className="size-4 text-fg-muted" aria-hidden /> Estratégias de resposta
                </h3>
                {barrasEstrategia.length === 0 ? (
                  <p className="py-6 text-center text-xs text-fg-muted">Sem estratégias registradas.</p>
                ) : (
                  <GraficoBarras itens={barrasEstrategia} altura={200} formatarValor={(v) => numero(v)} mostrarEixo />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {!selecionado && (
              <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                <Vazio
                  icone={ShieldAlert}
                  titulo="Selecione um risco"
                  descricao="Clique em um card da matriz para ver o detalhe, o histórico e o plano de resposta."
                />
              </div>
            )}

            {selecionado && (
              <>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-2xs font-bold" style={{ color: selecionado.cor }}>
                        {selecionado.codigo}
                      </p>
                      <h3 className="text-sm font-semibold text-fg">{selecionado.descricao}</h3>
                      <p className="mt-0.5 text-2xs text-fg-muted">
                        {selecionado.project_nome} · {selecionado.categoria_rotulo}
                      </p>
                    </div>
                    <Etiqueta cor={CORES_NIVEL[selecionado.nivel]} solido>
                      {selecionado.nivel_rotulo}
                    </Etiqueta>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-sgp border border-border bg-surface-2 py-2">
                      <p className="text-lg font-bold tabular-nums text-fg">{selecionado.probabilidade}</p>
                      <p className="text-2xs text-fg-muted">probabilidade</p>
                    </div>
                    <div className="rounded-sgp border border-border bg-surface-2 py-2">
                      <p className="text-lg font-bold tabular-nums text-fg">{selecionado.impacto}</p>
                      <p className="text-2xs text-fg-muted">impacto</p>
                    </div>
                    <div className="rounded-sgp border border-border bg-surface-2 py-2">
                      <p className="text-lg font-bold tabular-nums" style={{ color: selecionado.cor }}>
                        {selecionado.severidade}
                      </p>
                      <p className="text-2xs text-fg-muted">severidade</p>
                    </div>
                  </div>

                  <dl className="mt-3 space-y-2 text-xs">
                    <div>
                      <dt className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Causa raiz</dt>
                      <dd className="text-fg">{selecionado.causa || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Efeito potencial</dt>
                      <dd className="text-fg">{selecionado.efeito || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Estratégia</dt>
                      <dd className="font-medium text-fg">{selecionado.estrategia_rotulo}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Status</dt>
                      <dd>
                        {podeEditar ? (
                          <Selecao
                            value={selecionado.status}
                            onChange={(e) => atualizar.mutate({ id: selecionado.id, status: e.target.value, comentario: "Status alterado no detalhe do risco" })}
                            className="h-7 py-0 text-2xs"
                            aria-label="Alterar status do risco"
                          >
                            {STATUS_RISCO.map((s) => (
                              <option key={s.valor} value={s.valor}>
                                {s.rotulo}
                              </option>
                            ))}
                          </Selecao>
                        ) : (
                          <span className="text-fg">{rotuloStatus(selecionado.status)}</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Responsável</dt>
                      <dd className="flex items-center gap-2">
                        <Avatar nome={selecionado.responsavel_detalhe?.nome ?? "Sem responsável"} cor={selecionado.responsavel_detalhe?.cor} tamanho="xs" />
                        <span className="text-fg">{selecionado.responsavel_detalhe?.nome ?? "—"}</span>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Identificado em</dt>
                      <dd className="tabular-nums text-fg">{dataCurta(selecionado.data_identificacao)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Prazo da resposta</dt>
                      <dd className={cn("tabular-nums", selecionado.atrasado ? "font-semibold text-danger" : "text-fg")}>
                        {dataCurta(selecionado.data_limite)}
                        {selecionado.atrasado ? " · atrasado" : ""}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Custo de mitigação</dt>
                      <dd className="tabular-nums text-fg">{moeda(selecionado.custo_mitigacao)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Valor monetário esperado</dt>
                      <dd className="tabular-nums text-fg">{moeda(selecionado.valor_monetario_esperado)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-fg-muted">Exposição</dt>
                      <dd className="font-semibold tabular-nums" style={{ color: corSeveridade(selecionado.severidade) }}>
                        {moeda(selecionado.exposicao, true)}
                      </dd>
                    </div>
                  </dl>

                  {selecionado.gatilhos.length > 0 && (
                    <div className="mt-3">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Gatilhos de monitoramento</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {selecionado.gatilhos.map((g, i) => (
                          <Chip key={i} cor="#D97706" icone={Zap}>
                            {g}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {selecionado.tags.length > 0 && (
                    <div className="mt-3">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Etiquetas</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {selecionado.tags.map((t, i) => (
                          <Chip key={i} cor="#64748B">
                            {t}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {(podeEditar || podeExcluir) && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                      {podeEditar && (
                        <Botao tamanho="sm" icone={Pencil} onClick={() => abrirEdicao(selecionado)}>
                          Editar risco
                        </Botao>
                      )}
                      {podeExcluir && (
                        <Botao tamanho="sm" variante="perigo" icone={Trash2} onClick={() => setParaExcluir(selecionado)}>
                          Excluir risco
                        </Botao>
                      )}
                    </div>
                  )}
                </div>

                <SecaoColapsavel titulo="Plano de resposta" icone={SlidersHorizontal} contagem={historico?.historico.length ?? 0}>
                  <div className="space-y-3">
                    <Campo rotulo="Estratégia" htmlFor="plano-estrategia">
                      <Selecao
                        id="plano-estrategia"
                        value={plano.estrategia}
                        onChange={(e) => setPlano({ ...plano, estrategia: e.target.value })}
                      >
                        {ESTRATEGIAS.map((e) => (
                          <option key={e.valor} value={e.valor}>
                            {e.rotulo}
                          </option>
                        ))}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Plano de resposta" htmlFor="plano-texto">
                      <AreaTexto
                        id="plano-texto"
                        rows={4}
                        value={plano.plano_resposta}
                        onChange={(e) => setPlano({ ...plano, plano_resposta: e.target.value })}
                        placeholder="Ações preventivas, responsáveis e marcos de verificação..."
                      />
                    </Campo>
                    <Campo rotulo="Plano de contingência" htmlFor="plano-contingencia">
                      <AreaTexto
                        id="plano-contingencia"
                        rows={3}
                        value={plano.contingencia}
                        onChange={(e) => setPlano({ ...plano, contingencia: e.target.value })}
                        placeholder="O que será feito caso o risco se materialize..."
                      />
                    </Campo>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ControleDeslizante
                        valor={plano.prob_residual}
                        onChange={(v) => setPlano({ ...plano, prob_residual: v })}
                        min={0}
                        max={5}
                        rotulo="Probabilidade residual"
                        sufixo=""
                        marcos={[0, 1, 2, 3, 4, 5]}
                      />
                      <ControleDeslizante
                        valor={plano.imp_residual}
                        onChange={(v) => setPlano({ ...plano, imp_residual: v })}
                        min={0}
                        max={5}
                        rotulo="Impacto residual"
                        sufixo=""
                        marcos={[0, 1, 2, 3, 4, 5]}
                      />
                    </div>
                    <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-fg-muted">Severidade residual</span>
                        <span className="font-bold tabular-nums" style={{ color: corSeveridade(severidadeResidual) }}>
                          {severidadeResidual} · {nivelSeveridade(severidadeResidual)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-2xs text-fg-muted">
                        <span>
                          Redução de {selecionado.severidade} para {severidadeResidual}
                        </span>
                        <span className="font-semibold text-success">
                          -{Math.max(0, selecionado.severidade - severidadeResidual)} pontos (
                          {percentual(selecionado.severidade ? (Math.max(0, selecionado.severidade - severidadeResidual) / selecionado.severidade) * 100 : 0, 0)})
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Campo rotulo="Prazo da resposta" htmlFor="plano-prazo">
                        <Entrada
                          id="plano-prazo"
                          type="date"
                          value={plano.data_limite}
                          onChange={(e) => setPlano({ ...plano, data_limite: e.target.value })}
                        />
                      </Campo>
                      <Campo rotulo="Responsável" htmlFor="plano-responsavel">
                        <Selecao
                          id="plano-responsavel"
                          value={plano.responsavel}
                          onChange={(e) => setPlano({ ...plano, responsavel: e.target.value })}
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
                    <Botao variante="primario" icone={Save} larguraTotal carregando={salvarPlano.isPending} onClick={salvarPlanoResposta}>
                      Salvar plano de resposta
                    </Botao>
                  </div>
                </SecaoColapsavel>

                <SecaoColapsavel titulo="Histórico do risco" icone={History} contagem={historico?.historico.length ?? 0}>
                  {(historico?.historico.length ?? 0) === 0 ? (
                    <p className="py-4 text-center text-xs text-fg-muted">Nenhuma movimentação registrada.</p>
                  ) : (
                    <ol className="relative space-y-3 border-l border-border pl-4">
                      {(historico?.historico ?? []).map((h) => (
                        <li key={h.id} className="relative">
                          <span
                            className="absolute -left-[21px] top-1 size-2.5 rounded-full ring-2 ring-surface"
                            style={{ backgroundColor: corSeveridade(h.severidade) }}
                            aria-hidden
                          />
                          <p className="flex items-center gap-1.5 text-2xs text-fg-muted">
                            <Clock className="size-3" aria-hidden />
                            {dataHora(h.criado_em)}
                          </p>
                          <p className="text-xs font-medium text-fg">{h.comentario || "Atualização"}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Etiqueta cor={corSeveridade(h.severidade)}>
                              P{h.probabilidade} × I{h.impacto} = {h.severidade}
                            </Etiqueta>
                            <Etiqueta tom="neutral">{rotuloStatus(h.status)}</Etiqueta>
                            <span className="text-2xs text-fg-subtle">{h.registrado_por_nome || "sistema"}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </SecaoColapsavel>
              </>
            )}
          </div>
        </div>
      )}

      {aba === "heatmap" && (
        <div className="space-y-4">
          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Flame className="size-4 text-danger" aria-hidden /> Índice de risco por projeto
              </h3>
              <span className="text-2xs text-fg-muted">Clique em um projeto para ver o detalhamento por nível e categoria</span>
            </div>
            {heatmapFiltrado.length === 0 ? (
              <Vazio icone={IconeMapa} titulo="Nenhum risco ativo" descricao="Cadastre riscos nos projetos para visualizar o heatmap." />
            ) : (
              <GraficoBarras
                horizontal
                itens={heatmapFiltrado.map((p) => ({
                  rotulo: p.projeto,
                  valor: p.indice_risco,
                  comparativo: 100,
                  cor: p.indice_risco >= 70 ? "#DC2626" : p.indice_risco >= 45 ? "#F97316" : "#10B981",
                }))}
                altura={260}
                formatarValor={(v) => indice(v, 1) + "%"}
              />
            )}
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-fg">Detalhamento por projeto</h3>
              <span className="text-2xs text-fg-muted">{numero(heatmapFiltrado.length)} projeto(s) com riscos ativos</span>
            </header>
            <Tabela
              colunas={[
                {
                  chave: "projeto",
                  titulo: "Projeto",
                  ordenavel: true,
                  valorOrdenacao: (p: ProjetoHeatmap) => p.projeto,
                  renderizar: (p: ProjetoHeatmap) => (
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.cor }} />
                      <span className="truncate text-xs font-medium text-fg">{p.projeto}</span>
                    </span>
                  ),
                },
                {
                  chave: "total",
                  titulo: "Riscos",
                  largura: "90px",
                  alinhar: "right",
                  ordenavel: true,
                  valorOrdenacao: (p: ProjetoHeatmap) => p.total,
                  renderizar: (p: ProjetoHeatmap) => <span className="tabular-nums text-xs text-fg">{p.total}</span>,
                },
                {
                  chave: "media",
                  titulo: "Severidade média",
                  largura: "150px",
                  alinhar: "right",
                  ordenavel: true,
                  valorOrdenacao: (p: ProjetoHeatmap) => p.severidade_media,
                  renderizar: (p: ProjetoHeatmap) => <span className="tabular-nums text-xs text-fg">{indice(p.severidade_media, 1)}</span>,
                },
                {
                  chave: "niveis",
                  titulo: "Distribuição por nível",
                  renderizar: (p: ProjetoHeatmap) => (
                    <span className="flex flex-wrap gap-1.5">
                      {NIVEIS.map((n) => (
                        <Etiqueta key={n.valor} cor={CORES_NIVEL[n.valor]}>
                          {n.rotulo}: {p.por_nivel[n.valor] ?? 0}
                        </Etiqueta>
                      ))}
                    </span>
                  ),
                },
                {
                  chave: "indice",
                  titulo: "Índice",
                  largura: "110px",
                  alinhar: "right",
                  ordenavel: true,
                  valorOrdenacao: (p: ProjetoHeatmap) => p.indice_risco,
                  renderizar: (p: ProjetoHeatmap) => (
                    <span
                      className="font-bold tabular-nums text-xs"
                      style={{ color: p.indice_risco >= 70 ? "#DC2626" : p.indice_risco >= 45 ? "#F97316" : "#10B981" }}
                    >
                      {indice(p.indice_risco, 1)}%
                    </span>
                  ),
                },
                {
                  chave: "acao",
                  titulo: "",
                  largura: "60px",
                  alinhar: "right",
                  renderizar: (p: ProjetoHeatmap) => (
                    <Botao
                      tamanho="xs"
                      iconeDireita={ChevronRight}
                      onClick={() => setProjetoDrill(p.project_id)}
                    >
                      ver
                    </Botao>
                  ),
                },
              ]}
              dados={heatmapFiltrado}
              vazio={<Vazio icone={IconeMapa} titulo="Nenhum projeto com riscos" />}
              compacta
            />
          </div>

          {projetoDrillDetalhe && (
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 animate-entrada">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: projetoDrillDetalhe.cor }} />
                  {projetoDrillDetalhe.projeto} · {projetoDrillDetalhe.total} risco(s)
                </h3>
                <div className="flex gap-2">
                  <Botao tamanho="sm" onClick={() => mudarProjeto(String(projetoDrillDetalhe.project_id))} icone={ArrowRight}>
                    Filtrar na matriz
                  </Botao>
                  <Botao tamanho="sm" variante="fantasma" onClick={() => setProjetoDrill(null)}>
                    Fechar
                  </Botao>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Riscos por nível</p>
                  <GraficoBarras
                    itens={NIVEIS.map((n) => ({
                      rotulo: n.rotulo,
                      valor: projetoDrillDetalhe.por_nivel[n.valor] ?? 0,
                      cor: CORES_NIVEL[n.valor],
                    }))}
                    altura={180}
                    formatarValor={(v) => numero(v)}
                    mostrarEixo
                  />
                </div>
                <div>
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Riscos por categoria</p>
                  <GraficoBarras
                    horizontal
                    itens={Object.entries(projetoDrillDetalhe.por_categoria)
                      .sort((a, b) => b[1] - a[1])
                      .map(([chave, valor]) => ({ rotulo: rotuloCategoria(chave), valor, cor: "#0891B2" }))}
                    altura={180}
                    formatarValor={(v) => numero(v)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {aba === "painel" && (
        <div className="space-y-4">
          {erroPainel && (
            <Alerta tom="danger" titulo="Não foi possível carregar o painel de riscos">
              {mensagemErro(falhaPainel)}
            </Alerta>
          )}

          {!painel && !erroPainel && <CarregandoBloco rotulo="Consolidando painel de riscos..." />}

          {painel && (
            <>
              <LinhaKPI
                itens={[
                  { rotulo: "Riscos ativos", valor: numero(painel.total_riscos), icone: ShieldAlert, cor: "#EF4444", subrotulo: "excluindo encerrados" },
                  { rotulo: "Exposição total", valor: moeda(painel.exposicao_total, true), icone: Gauge, cor: "#F97316", subrotulo: "probabilidade × impacto financeiro" },
                  { rotulo: "Custo de mitigação", valor: moeda(painel.custo_mitigacao, true), icone: DollarSign, cor: "#0891B2", subrotulo: "investimento planejado" },
                  {
                    rotulo: "Riscos extremos",
                    valor: numero(painel.por_nivel.find((n) => n.nivel === "EXTREMO")?.total ?? 0),
                    icone: Flame,
                    cor: "#DC2626",
                    subrotulo: "requerem ação imediata",
                  },
                  { rotulo: "Issues abertas", valor: numero(painel.issues.abertas), icone: AlertTriangle, cor: "#D97706", subrotulo: "acompanhamento" },
                  { rotulo: "Issues atrasadas", valor: numero(painel.issues.atrasadas), icone: CalendarClock, cor: "#DC2626", subrotulo: "prazo vencido" },
                ]}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                    <ShieldAlert className="size-4 text-fg-muted" aria-hidden /> Riscos por nível
                  </h3>
                  {fatiasNivel.length === 0 ? (
                    <p className="py-8 text-center text-xs text-fg-muted">Nenhum risco ativo.</p>
                  ) : (
                    <GraficoDonut fatias={fatiasNivel} tamanho={168} espessura={22} centroRotulo="riscos" centroValor={painel.total_riscos} legenda />
                  )}
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                    <BarChart3 className="size-4 text-fg-muted" aria-hidden /> Riscos por categoria
                  </h3>
                  {(painel.por_categoria.length ?? 0) === 0 ? (
                    <p className="py-8 text-center text-xs text-fg-muted">Sem categorias registradas.</p>
                  ) : (
                    <GraficoBarras
                      horizontal
                      itens={painel.por_categoria.slice(0, 8).map((c) => ({ rotulo: rotuloCategoria(c.categoria), valor: c.total, cor: "#0891B2" }))}
                      altura={200}
                      formatarValor={(v) => numero(v)}
                    />
                  )}
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                    <Target className="size-4 text-fg-muted" aria-hidden /> Estratégias adotadas
                  </h3>
                  {painel.por_estrategia.length === 0 ? (
                    <p className="py-8 text-center text-xs text-fg-muted">Sem estratégias registradas.</p>
                  ) : (
                    <GraficoBarras
                      horizontal
                      itens={painel.por_estrategia.slice(0, 8).map((e) => ({ rotulo: rotuloEstrategia(e.estrategia), valor: e.total, cor: "#8B5CF6" }))}
                      altura={200}
                      formatarValor={(v) => numero(v)}
                    />
                  )}
                </div>
              </div>

              <GradeCards colunas={2}>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                    <Flame className="size-4 text-danger" aria-hidden /> Top riscos por severidade
                  </h3>
                  {painel.top_riscos.length === 0 ? (
                    <p className="py-6 text-center text-xs text-fg-muted">Nenhum risco cadastrado.</p>
                  ) : (
                    <ul className="space-y-2">
                      {painel.top_riscos.slice(0, 8).map((r) => (
                        <li key={r.id} className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-md text-2xs font-bold" style={{ backgroundColor: r.cor + "22", color: r.cor }}>
                            {r.severidade}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              mudarProjeto(String(r.project));
                              mudarAba("matriz");
                              setSelecionadoId(r.id);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-xs font-medium text-fg hover:text-brand">{r.descricao}</p>
                            <p className="truncate text-2xs text-fg-muted">
                              {r.codigo} · {r.project_nome} · P{r.probabilidade} × I{r.impacto}
                            </p>
                          </button>
                          <span className="shrink-0 text-2xs font-semibold tabular-nums text-fg-muted">{moeda(r.exposicao, true)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                    <CalendarClock className="size-4 text-warning" aria-hidden /> Respostas atrasadas
                  </h3>
                  {painel.riscos_atrasados.length === 0 ? (
                    <div className="py-4">
                      <Alerta tom="success" titulo="Nenhuma resposta em atraso" icone={CheckCircle2}>
                        Todos os planos de resposta estão dentro do prazo.
                      </Alerta>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {painel.riscos_atrasados.slice(0, 8).map((r) => (
                        <li key={r.id} className="flex items-center gap-2.5">
                          <Avatar nome={r.responsavel_detalhe?.nome ?? "Sem responsável"} cor={r.responsavel_detalhe?.cor} tamanho="xs" />
                          <button
                            type="button"
                            onClick={() => {
                              mudarProjeto(String(r.project));
                              mudarAba("matriz");
                              setSelecionadoId(r.id);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-xs font-medium text-fg hover:text-brand">{r.descricao}</p>
                            <p className="truncate text-2xs text-fg-muted">
                              {r.codigo} · prazo {dataCurta(r.data_limite)}
                            </p>
                          </button>
                          <Etiqueta tom="danger">atrasado</Etiqueta>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </GradeCards>

              <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <ShieldAlert className="size-4 text-fg-muted" aria-hidden /> Riscos por projeto
                  </h3>
                  <span className="text-2xs text-fg-muted">Gerado em {dataHora(painel.gerado_em)}</span>
                </div>
                <Tabela
                  colunas={[
                    {
                      chave: "projeto",
                      titulo: "Projeto",
                      ordenavel: true,
                      valorOrdenacao: (p: ProjetoRiscoPainel) => p.projeto,
                      renderizar: (p: ProjetoRiscoPainel) => (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.cor }} />
                          <span className="truncate text-xs font-medium text-fg">{p.projeto}</span>
                        </span>
                      ),
                    },
                    {
                      chave: "riscos",
                      titulo: "Riscos ativos",
                      largura: "120px",
                      alinhar: "right",
                      ordenavel: true,
                      valorOrdenacao: (p: ProjetoRiscoPainel) => p.riscos,
                      renderizar: (p: ProjetoRiscoPainel) => <span className="tabular-nums text-xs text-fg">{p.riscos}</span>,
                    },
                    {
                      chave: "criticos",
                      titulo: "Alto/Extremo",
                      largura: "120px",
                      alinhar: "right",
                      ordenavel: true,
                      valorOrdenacao: (p: ProjetoRiscoPainel) => p.criticos,
                      renderizar: (p: ProjetoRiscoPainel) => (
                        <span className={cn("tabular-nums text-xs font-semibold", p.criticos > 0 ? "text-danger" : "text-fg-muted")}>{p.criticos}</span>
                      ),
                    },
                    {
                      chave: "media",
                      titulo: "Severidade média",
                      largura: "150px",
                      alinhar: "right",
                      ordenavel: true,
                      valorOrdenacao: (p: ProjetoRiscoPainel) => p.severidade_media,
                      renderizar: (p: ProjetoRiscoPainel) => (
                        <span className="tabular-nums text-xs text-fg">{indice(p.severidade_media, 1)}</span>
                      ),
                    },
                  ]}
                  dados={painel.por_projeto.filter((p) => p.riscos > 0)}
                  aoClicarLinha={(p) => {
                    mudarProjeto(String(p.project_id));
                    mudarAba("matriz");
                  }}
                  vazio={<Vazio icone={ShieldAlert} titulo="Nenhum projeto com riscos ativos" />}
                  compacta
                />
              </div>

              <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <ShieldAlert className="size-4 text-fg-muted" aria-hidden /> Riscos no filtro atual
                  </h3>
                  <span className="text-2xs text-fg-muted">{numero(riscos.length)} risco(s)</span>
                </header>
                <Tabela
                  colunas={colunasPainel}
                  dados={riscos}
                  aoClicarLinha={(r) => {
                    mudarAba("matriz");
                    setSelecionadoId(r.id);
                  }}
                  vazio={<Vazio icone={ShieldAlert} titulo="Nenhum risco no filtro atual" />}
                  compacta
                />
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-2 text-sm font-semibold text-fg">Issues por tipo</h3>
                  <GraficoBarras
                    horizontal
                    itens={painel.issues.por_tipo.map((t) => ({ rotulo: t.tipo, valor: t.total, cor: "#D97706" }))}
                    altura={160}
                    formatarValor={(v) => numero(v)}
                  />
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-2 text-sm font-semibold text-fg">Issues por prioridade</h3>
                  <GraficoBarras
                    horizontal
                    itens={painel.issues.por_prioridade.map((t) => ({ rotulo: t.prioridade, valor: t.total, cor: "#8B5CF6" }))}
                    altura={160}
                    formatarValor={(v) => numero(v)}
                  />
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-2 text-sm font-semibold text-fg">Issues por projeto</h3>
                  <GraficoBarras
                    horizontal
                    itens={painel.issues.por_projeto.map((t) => ({ rotulo: t.project__nome, valor: t.total, cor: t.project__cor }))}
                    altura={160}
                    formatarValor={(v) => numero(v)}
                  />
                </div>
              </div>

              <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                  <BarChart3 className="size-4 text-fg-muted" aria-hidden /> Matriz consolidada
                </h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 4, 3, 2, 1].map((p) =>
                    [1, 2, 3, 4, 5].map((i) => {
                      const celula = painel.matriz_resumo.find((c) => c.probabilidade === p && c.impacto === i);
                      const cor = celula?.cor ?? corSeveridade(p * i);
                      return (
                        <div
                          key={p + "-" + i}
                          className="grid aspect-square place-items-center rounded-sgp border"
                          style={{ backgroundColor: cor + "1f", borderColor: cor + "55" }}
                          title={"Probabilidade " + p + " × Impacto " + i + " · " + (celula?.total ?? 0) + " risco(s)"}
                        >
                          <span className="text-sm font-bold tabular-nums" style={{ color: cor }}>
                            {celula?.total ?? 0}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-3">
                  <EscalaCores rotulos={["Baixo", "Médio", "Alto", "Extremo"]} cores={["#10B981", "#F59E0B", "#F97316", "#EF4444"]} titulo="Severidade" />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Modal
        aberto={movimento !== null}
        onFechar={cancelarMovimento}
        titulo="Reposicionar risco na matriz"
        subtitulo={movimento ? movimento.codigo + " → P" + movimento.probabilidade + " × I" + movimento.impacto : ""}
        largura="sm"
        rodape={
          <>
            <Botao onClick={cancelarMovimento}>Cancelar</Botao>
            <Botao variante="primario" icone={Save} carregando={mover.isPending} onClick={confirmarMovimento}>
              Confirmar movimento
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-sgp border border-border bg-surface-2 p-3">
            <div className="text-center">
              <p className="text-2xs text-fg-muted">Severidade anterior</p>
              <p className="text-lg font-bold tabular-nums text-fg-muted">
                {movimento ? (riscos.find((r) => r.id === movimento.riscoId)?.severidade ?? 0) : 0}
              </p>
            </div>
            <ArrowRight className="size-4 text-fg-subtle" aria-hidden />
            <div className="text-center">
              <p className="text-2xs text-fg-muted">Nova severidade</p>
              <p
                className="text-lg font-bold tabular-nums"
                style={{ color: movimento ? corSeveridade(movimento.probabilidade * movimento.impacto) : "#64748B" }}
              >
                {movimento ? movimento.probabilidade * movimento.impacto : 0}
              </p>
            </div>
          </div>
          <Campo rotulo="Comentário da movimentação" dica="Registrado no histórico do risco." htmlFor="mov-comentario">
            <AreaTexto id="mov-comentario" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </Campo>
        </div>
      </Modal>

      <Modal
        aberto={novoAberto || editando !== null}
        onFechar={fecharFormulario}
        titulo={editando ? "Editar risco" : "Novo risco"}
        subtitulo={
          editando
            ? editando.codigo + " · " + editando.project_nome
            : "Registre o risco e posicione-o automaticamente na matriz"
        }
        largura="lg"
        rodape={
          <>
            <Botao onClick={fecharFormulario}>Cancelar</Botao>
            <Botao
              variante="primario"
              icone={editando ? Save : Plus}
              carregando={criar.isPending || atualizar.isPending}
              onClick={salvarRisco}
            >
              {editando ? "Salvar risco" : "Registrar risco"}
            </Botao>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Projeto" obrigatorio htmlFor="novo-project">
              <Selecao id="novo-project" value={formulario.project} onChange={(e) => setFormulario({ ...formulario, project: e.target.value })}>
                <option value="">Selecione o projeto</option>
                {projetos.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.codigo} · {p.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Categoria" htmlFor="novo-categoria">
              <Selecao id="novo-categoria" value={formulario.categoria} onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <Campo rotulo="Descrição do risco" obrigatorio htmlFor="novo-descricao">
            <AreaTexto
              id="novo-descricao"
              rows={2}
              value={formulario.descricao}
              onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
              placeholder="Ex.: Indisponibilidade do fornecedor de infraestrutura durante a migração"
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Causa raiz" htmlFor="novo-causa">
              <AreaTexto id="novo-causa" rows={2} value={formulario.causa} onChange={(e) => setFormulario({ ...formulario, causa: e.target.value })} />
            </Campo>
            <Campo rotulo="Efeito potencial" htmlFor="novo-efeito">
              <AreaTexto id="novo-efeito" rows={2} value={formulario.efeito} onChange={(e) => setFormulario({ ...formulario, efeito: e.target.value })} />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ControleDeslizante
              valor={formulario.probabilidade}
              onChange={(v) => setFormulario({ ...formulario, probabilidade: v })}
              min={1}
              max={5}
              rotulo="Probabilidade"
              sufixo=""
              marcos={[1, 2, 3, 4, 5]}
            />
            <ControleDeslizante
              valor={formulario.impacto}
              onChange={(v) => setFormulario({ ...formulario, impacto: v })}
              min={1}
              max={5}
              rotulo="Impacto"
              sufixo=""
              marcos={[1, 2, 3, 4, 5]}
            />
          </div>

          <div
            className="flex items-center justify-between gap-3 rounded-sgp border p-3"
            style={{
              borderColor: corSeveridade(severidadeFormulario) + "66",
              backgroundColor: corSeveridade(severidadeFormulario) + "14",
            }}
          >
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Severidade calculada</p>
              <p className="text-2xl font-bold tabular-nums" style={{ color: corSeveridade(severidadeFormulario) }}>
                {severidadeFormulario}
              </p>
            </div>
            <div className="text-right">
              <Etiqueta cor={CORES_NIVEL[chaveNivel(severidadeFormulario)]} solido>
                {nivelSeveridade(severidadeFormulario)}
              </Etiqueta>
              <p className="mt-1 text-2xs text-fg-muted">
                {formulario.probabilidade} × {formulario.impacto} na matriz 5 × 5
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo rotulo="Estratégia" htmlFor="novo-estrategia">
              <Selecao id="novo-estrategia" value={formulario.estrategia} onChange={(e) => setFormulario({ ...formulario, estrategia: e.target.value })}>
                {ESTRATEGIAS.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Responsável" htmlFor="novo-responsavel">
              <Selecao id="novo-responsavel" value={formulario.responsavel} onChange={(e) => setFormulario({ ...formulario, responsavel: e.target.value })}>
                <option value="">Sem responsável</option>
                {opcoesResponsavel.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Status" htmlFor="novo-status">
              <Selecao id="novo-status" value={formulario.status} onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}>
                {STATUS_RISCO.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo rotulo="Prazo da resposta" htmlFor="novo-prazo">
              <Entrada id="novo-prazo" type="date" value={formulario.data_limite} onChange={(e) => setFormulario({ ...formulario, data_limite: e.target.value })} />
            </Campo>
            <Campo rotulo="Custo de mitigação (R$)" htmlFor="novo-custo">
              <Entrada
                id="novo-custo"
                type="number"
                step="0.01"
                value={formulario.custo_mitigacao}
                onChange={(e) => setFormulario({ ...formulario, custo_mitigacao: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Valor monetário esperado (R$)" htmlFor="novo-vme">
              <Entrada
                id="novo-vme"
                type="number"
                step="0.01"
                value={formulario.valor_monetario_esperado}
                onChange={(e) => setFormulario({ ...formulario, valor_monetario_esperado: e.target.value })}
              />
            </Campo>
          </div>

          <Campo rotulo="Plano de resposta" htmlFor="novo-plano">
            <AreaTexto id="novo-plano" rows={2} value={formulario.plano_resposta} onChange={(e) => setFormulario({ ...formulario, plano_resposta: e.target.value })} />
          </Campo>

          <Campo rotulo="Plano de contingência" htmlFor="novo-contingencia">
            <AreaTexto
              id="novo-contingencia"
              rows={2}
              value={formulario.contingencia}
              onChange={(e) => setFormulario({ ...formulario, contingencia: e.target.value })}
            />
          </Campo>

          <Campo rotulo="Gatilhos de monitoramento" dica="Separe por vírgula, ponto e vírgula ou linha." htmlFor="novo-gatilhos">
            <AreaTexto
              id="novo-gatilhos"
              rows={2}
              value={formulario.gatilhos}
              onChange={(e) => setFormulario({ ...formulario, gatilhos: e.target.value })}
              placeholder="Atraso superior a 5 dias na entrega do fornecedor"
            />
          </Campo>

          <Campo rotulo="Etiquetas" dica="Separe por vírgula, ponto e vírgula ou linha." htmlFor="novo-tags">
            <Entrada
              id="novo-tags"
              value={formulario.tags}
              onChange={(e) => setFormulario({ ...formulario, tags: e.target.value })}
              placeholder="fornecedor, infraestrutura, contrato"
            />
          </Campo>
        </div>
      </Modal>

      <Modal
        aberto={paraExcluir !== null}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir risco"
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
        <div className="space-y-3">
          <p className="text-sm text-fg">
            Confirma a exclusão de <strong>{paraExcluir?.codigo}</strong> — {paraExcluir?.descricao}?
          </p>
          {paraExcluir && (
            <p className="text-2xs text-fg-muted">
              Projeto {paraExcluir.project_nome} · severidade {paraExcluir.severidade} · {paraExcluir.nivel_rotulo}. O
              histórico de movimentações do risco também será removido.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Motor de Alocação Inteligente com explicabilidade — especificação §9
   RF-68 a RF-74: matching, decomposição do score, override e simulação what-if.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Ban,
  Brain,
  CheckCircle2,
  Clock,
  Coins,
  Filter,
  Gauge,
  Info,
  Layers,
  Lightbulb,
  Minus,
  RefreshCw,
  Repeat,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import {
  Alerta,
  AnelProgresso,
  AreaTexto,
  Avatar,
  BarraFerramentas,
  BarraProgresso,
  Botao,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Cartao,
  Chip,
  ControleDeslizante,
  Dica,
  Entrada,
  Esqueleto,
  Etiqueta,
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
import { GraficoBarras } from "@/components/charts";
import { GradeCards, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, media } from "@/lib/utils";
import { dataCurta, hojeISO, moeda, numero, percentual, somarDias } from "@/lib/format";
import type { Alocacao, ProjetoResumo, Recomendacao, ResultadoMatching, Tarefa, Usuario } from "@/lib/types";

/* ==========================================================================
   Tipos auxiliares
   ========================================================================== */

interface RespostaModos {
  modos: Array<{ valor: string; rotulo: string; descricao: string; pesos: Record<string, number> }>;
  tipos_avaliacao: Array<{ valor: string; rotulo: string }>;
  origens_historico: Array<{ valor: string; rotulo: string }>;
  status_perfil: Array<{ valor: string; rotulo: string }>;
}

interface RecomendacaoPersistida {
  id: number;
  task: number;
  task_nome: string;
  project_id: number;
  user: number;
  user_detalhe: { id: number; nome: string; cor: string; iniciais: string; cargo: string; area: string } | null;
  score: number;
  posicao: number;
  modo: string;
  modo_rotulo: string;
  status: string;
  status_rotulo: string;
  penalidades: Array<{ motivo: string; valor: number; icone: string }>;
  criado_em: string;
  decidido_em: string | null;
  observacao_decisao: string;
}

interface RespostaDecisao {
  recomendacao: RecomendacaoPersistida;
  alocacao_id: number;
  override: boolean;
}

interface Parametros {
  project?: number;
  task?: number;
  modo: string;
  limite: number;
}

/* ==========================================================================
   Metadados visuais
   ========================================================================== */

const COMPONENTES: Array<{ chave: string; rotulo: string; cor: string; dica: string }> = [
  { chave: "skill", rotulo: "Skill", cor: "#2563EB", dica: "Aderência técnica aos requisitos do alvo" },
  { chave: "disponibilidade", rotulo: "Disponibilidade", cor: "#059669", dica: "Percentual livre no período do alvo" },
  { chave: "custo", rotulo: "Custo", cor: "#F59E0B", dica: "Custo/hora normalizado dentro do pool" },
  { chave: "preferencia", rotulo: "Preferência", cor: "#8B5CF6", dica: "Interesses declarados e skills em destaque" },
  { chave: "experiencia", rotulo: "Experiência", cor: "#0891B2", dica: "Tempo de casa e XP acumulado em capacidades" },
  { chave: "proximidade", rotulo: "Proximidade", cor: "#EC4899", dica: "Mesma área ou localização do projeto" },
];

const ROTULOS_MODO: Record<string, { rotulo: string; cor: string }> = {
  PERFORMANCE: { rotulo: "Performance", cor: "#2563EB" },
  DESENVOLVIMENTO: { rotulo: "Desenvolvimento", cor: "#8B5CF6" },
  MISTO: { rotulo: "Misto", cor: "#0891B2" },
};

const STATUS_RECOMENDACAO: Record<string, Tom> = {
  SUGERIDA: "warning",
  ACEITA: "success",
  RECUSADA: "danger",
  SUBSTITUIDA: "neutral",
};

function rotuloModo(modo: string) {
  return ROTULOS_MODO[modo]?.rotulo ?? modo;
}

function corModo(modo: string) {
  return ROTULOS_MODO[modo]?.cor ?? "#64748B";
}

/* ==========================================================================
   Cartão de candidato ranqueado
   ========================================================================== */

interface PropsCandidato {
  candidato: Recomendacao;
  pesos: Record<string, number>;
  podeAlocar: boolean;
  podeDecidir: boolean;
  ocupado: boolean;
  aoAlocar: (c: Recomendacao) => void;
  aoRecusar: (c: Recomendacao) => void;
  aoOverride: (c: Recomendacao) => void;
}

function CartaoCandidato({ candidato, pesos, podeAlocar, podeDecidir, ocupado, aoAlocar, aoRecusar, aoOverride }: PropsCandidato) {
  const [expandido, setExpandido] = useState(false);
  const justificativa = candidato.justificativa;
  const score = Math.round(candidato.score * 100);
  const custo = justificativa.custo_estimado_reais;
  const disponibilidade = justificativa.disponibilidade_percentual;

  return (
    <div
      className={cn(
        "rounded-sgp-lg border bg-surface p-3.5 shadow-n1 transition-all",
        candidato.elegivel ? "border-border hover:shadow-n2" : "border-danger/40 bg-danger-soft/10"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar nome={candidato.nome} cor={candidato.cor} iniciais={candidato.iniciais} tamanho="lg" />
          <span
            className="absolute -left-1.5 -top-1.5 grid size-6 place-items-center rounded-full border-2 border-surface text-2xs font-bold text-white"
            style={{ backgroundColor: candidato.posicao <= 3 ? "#2563EB" : "#64748B" }}
            title={"Posição " + candidato.posicao + " no ranking"}
          >
            {candidato.posicao}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{candidato.nome}</p>
              <p className="truncate text-2xs text-fg-muted">
                {candidato.cargo || "Sem cargo"} · {candidato.area || "Sem área"}
              </p>
              <p className="truncate text-2xs text-fg-subtle">{candidato.localizacao || "Localização não informada"}</p>
            </div>
            <AnelProgresso valor={score} tamanho={62} espessura={7} rotulo={String(score)} subrotulo="score" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Etiqueta tom={disponibilidade >= 50 ? "success" : disponibilidade > 0 ? "warning" : "danger"} icone={Gauge}>
              {percentual(disponibilidade) + " disponível"}
            </Etiqueta>
            <Etiqueta tom="neutral" icone={Layers}>
              {percentual(justificativa.carga_atual_percentual) + " alocado no período"}
            </Etiqueta>
            <Etiqueta cor={corModo(justificativa.modo_recomendado)} icone={Lightbulb}>
              {"modo " + rotuloModo(justificativa.modo_recomendado)}
            </Etiqueta>
            {!candidato.elegivel && (
              <Etiqueta tom="danger" icone={Ban}>
                não elegível
              </Etiqueta>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {COMPONENTES.map((c) => {
          const valor = (candidato.componentes[c.chave] ?? 0) * 100;
          const peso = (pesos[c.chave] ?? 0) * 100;
          return (
            <div key={c.chave} title={c.dica}>
              <BarraProgresso
                valor={valor}
                cor={c.cor}
                altura="sm"
                rotulo={c.rotulo + " · peso " + numero(peso, 0) + "%"}
                mostrarValor
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        {justificativa.skills_atendidas.length > 0 && (
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Skills atendidas</p>
            <div className="flex flex-wrap gap-1.5">
              {justificativa.skills_atendidas.map((s) => (
                <Chip key={"at-" + s.skill_id} cor="#059669" icone={CheckCircle2}>
                  {s.skill + " · req N" + s.requerido + " / atual N" + s.atual}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {justificativa.gaps.length > 0 && (
          <div>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Gaps identificados</p>
            <div className="flex flex-wrap gap-1.5">
              {justificativa.gaps.map((g) => (
                <Chip key={"gap-" + g.skill_id} cor="#F59E0B" icone={AlertTriangle}>
                  {g.skill +
                    " · déficit " +
                    numero(g.deficit ?? g.requerido - g.atual, 1) +
                    " · " +
                    (g.acao_sugerida || "capacitação direcionada")}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {candidato.penalidades.length > 0 && (
          <div className="rounded-sgp border border-danger/35 bg-danger-soft/40 p-2">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-danger">
              Penalidades aplicadas
            </p>
            <ul className="space-y-0.5">
              {candidato.penalidades.map((p, i) => (
                <li key={p.motivo + i} className="flex items-center justify-between gap-2 text-2xs text-fg-muted">
                  <span className="truncate">{p.motivo}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-danger">
                    {"-" + numero(p.valor * 100, 0) + " pts"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-2xs font-semibold text-brand hover:underline"
        >
          {expandido ? "Ocultar detalhes de custo e histórico" : "Ver detalhes de custo e histórico"}
        </button>

        {expandido && (
          <div className="grid grid-cols-2 gap-2 rounded-sgp border border-border bg-surface-2 p-2.5 text-2xs">
            <div>
              <p className="text-fg-subtle">Custo estimado no período</p>
              <p className="font-semibold tabular-nums text-fg">{custo === null ? "Restrito" : moeda(custo)}</p>
            </div>
            <div>
              <p className="text-fg-subtle">Custo/hora</p>
              <p className="font-semibold tabular-nums text-fg">
                {justificativa.custo_hora === null ? "Restrito" : moeda(justificativa.custo_hora)}
              </p>
            </div>
            <div>
              <p className="text-fg-subtle">Tempo de casa</p>
              <p className="font-semibold tabular-nums text-fg">{numero(justificativa.anos_de_casa, 1) + " anos"}</p>
            </div>
            <div>
              <p className="text-fg-subtle">XP em capacidades</p>
              <p className="font-semibold tabular-nums text-fg">{numero(justificativa.xp_total)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-fg-subtle">Disponibilidade</p>
              <p className="text-fg-muted">{justificativa.disponibilidade}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Botao
          variante="primario"
          tamanho="sm"
          icone={UserCheck}
          carregando={ocupado}
          disabled={!podeAlocar}
          onClick={() => aoAlocar(candidato)}
        >
          Alocar
        </Botao>
        <Botao variante="secundario" tamanho="sm" icone={Ban} disabled={!podeDecidir} onClick={() => aoRecusar(candidato)}>
          Recusar
        </Botao>
        {podeDecidir ? (
          <Botao variante="fantasma" tamanho="sm" icone={Repeat} onClick={() => aoOverride(candidato)}>
            Override manual
          </Botao>
        ) : (
          <Dica texto="Selecione uma tarefa como alvo: as recomendações precisam ser persistidas para registrar recusa ou override.">
            <span className="text-2xs text-fg-subtle">Override e recusa exigem alvo de tarefa</span>
          </Dica>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Matching() {
  const [params] = useSearchParams();
  const { sucesso, erro, alerta } = useAvisos();

  const tarefaInicial = params.get("task") ?? "";
  const projetoInicial = params.get("project") ?? "";

  const [tipoAlvo, setTipoAlvo] = useState<"projeto" | "tarefa">(tarefaInicial ? "tarefa" : "projeto");
  const [projetoId, setProjetoId] = useState(projetoInicial);
  const [tarefaId, setTarefaId] = useState(tarefaInicial);
  const [modo, setModo] = useState("PERFORMANCE");
  const [limite, setLimite] = useState(8);
  const [parametros, setParametros] = useState<Parametros | null>(null);

  const [pesos, setPesos] = useState<Record<string, number>>({
    skill: 45,
    disponibilidade: 20,
    custo: 10,
    preferencia: 5,
    experiencia: 15,
    proximidade: 5,
  });
  const [somenteDisponiveis, setSomenteDisponiveis] = useState(false);
  const [limiteSimulacao, setLimiteSimulacao] = useState(8);
  const [simulacao, setSimulacao] = useState<ResultadoMatching | null>(null);

  const [recusar, setRecusar] = useState<Recomendacao | null>(null);
  const [observacaoRecusa, setObservacaoRecusa] = useState("");
  const [override, setOverride] = useState<Recomendacao | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    user: "",
    justificativa: "",
    percentual: 100,
    data_inicio: hojeISO(),
    data_fim: somarDias(hojeISO(), 30),
  });

  /* ------------------------------- Consultas ------------------------------ */

  const modos = useConsulta<RespostaModos>(["capacidades", "modos-alocacao"], "/capacidades/modos-alocacao/");
  const projetos = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 300 });
  const tarefas = useLista<Tarefa>(CHAVES.tarefas, projetoId ? "/tarefas/" : null, {
    project: projetoId || undefined,
    page_size: 300,
  });
  const tarefaDetalhe = useConsulta<Tarefa>(
    ["tarefa", tarefaInicial],
    tarefaInicial && !projetoId ? "/tarefas/" + tarefaInicial + "/" : null
  );
  const matching = useConsulta<ResultadoMatching>(
    ["capacidades", "matching"],
    parametros ? "/capacidades/matching/" : null,
    parametros
      ? {
          project: parametros.project,
          task: parametros.task,
          modo: parametros.modo,
          limite: parametros.limite,
        }
      : undefined
  );
  const historico = useLista<RecomendacaoPersistida>(
    ["capacidades", "recomendacoes"],
    tarefaId ? "/capacidades/recomendacoes/" : null,
    { task: tarefaId || undefined }
  );
  const usuarios = useLista<Usuario>(CHAVES.usuarios, override ? "/usuarios/" : null, {
    ativo: "true",
    page_size: 300,
  });

  useEffect(() => {
    if (tarefaDetalhe.data && !projetoId) setProjetoId(String(tarefaDetalhe.data.project));
  }, [tarefaDetalhe.data, projetoId]);

  /* ------------------------------- Mutações ------------------------------- */

  const simular = useMutacao<Record<string, unknown>, ResultadoMatching>({
    url: "/capacidades/simulacao/",
    invalidar: [],
  });
  const decidir = useMutacao<
    { id: number; aceitar: boolean; observacao?: string; user?: number; percentual?: number; data_inicio?: string; data_fim?: string },
    RespostaDecisao
  >({
    url: (v) => "/capacidades/recomendacoes/" + v.id + "/decidir/",
    invalidar: [
      ["capacidades", "recomendacoes"],
      CHAVES.alocacoes,
      CHAVES.conflitos,
      CHAVES.ocupacao,
      CHAVES.dashboardAlocacao,
    ],
  });
  const alocarDireto = useMutacao<Record<string, unknown>, Alocacao>({
    url: "/alocacoes/",
    invalidar: [CHAVES.alocacoes, CHAVES.conflitos, CHAVES.ocupacao, CHAVES.dashboardAlocacao],
    mensagemSucesso: "Alocação registrada a partir do matching",
  });

  /* -------------------------------- Derivados ----------------------------- */

  const modosDisponiveis = modos.data?.modos ?? [];
  const modoAtual = modosDisponiveis.find((m) => m.valor === modo);
  const resultado = matching.data;
  const pesosUsados = resultado?.pesos ?? modoAtual?.pesos ?? {};
  const candidatos = resultado?.recomendacoes ?? [];
  const podeDecidir = Boolean(tarefaId);
  const podeAlocar = Boolean(tarefaId) || Boolean(parametros && parametros.project);
  const periodo = resultado?.alvo.periodo;

  const resumoScore = useMemo(() => {
    if (!candidatos.length) return { media: 0, melhor: 0, elegiveis: 0 };
    return {
      media: media(candidatos.map((c) => c.score * 100)),
      melhor: Math.max(...candidatos.map((c) => c.score * 100)),
      elegiveis: candidatos.filter((c) => c.elegivel).length,
    };
  }, [candidatos]);

  const comparacao = simulacao?.comparacao ?? [];
  const linhasComparacao = useMemo(
    () =>
      comparacao.map((c) => ({
        id: c.user_id,
        nome: c.nome,
        score_original: c.score_original,
        score_ajustado: c.score_ajustado,
        posicao_original: c.posicao_original,
        posicao_ajustada: c.posicao_ajustada,
      })),
    [comparacao]
  );

  const colunasComparacao: Array<ColunaTabela<(typeof linhasComparacao)[number]>> = [
    {
      chave: "nome",
      titulo: "Candidato",
      ordenavel: true,
      valorOrdenacao: (l) => l.nome,
      renderizar: (l) => (
        <div className="flex items-center gap-2">
          <Avatar nome={l.nome} tamanho="xs" />
          <span className="truncate text-xs font-medium text-fg">{l.nome}</span>
        </div>
      ),
    },
    {
      chave: "posicao_original",
      titulo: "Posição antes",
      largura: "120px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (l) => l.posicao_original ?? 999,
      renderizar: (l) => (
        <span className="text-xs tabular-nums text-fg-muted">{l.posicao_original ? "#" + l.posicao_original : "fora"}</span>
      ),
    },
    {
      chave: "posicao_ajustada",
      titulo: "Posição depois",
      largura: "130px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (l) => l.posicao_ajustada,
      renderizar: (l) => {
        const original = l.posicao_original;
        const subiu = original !== null && l.posicao_ajustada < original;
        const desceu = original !== null && l.posicao_ajustada > original;
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums">
            <span className="text-fg">{"#" + l.posicao_ajustada}</span>
            {subiu && <ArrowUp className="size-3.5 text-success" aria-label="Subiu no ranking" />}
            {desceu && <ArrowDown className="size-3.5 text-danger" aria-label="Caiu no ranking" />}
            {!subiu && !desceu && <Minus className="size-3.5 text-fg-subtle" aria-label="Manteve a posição" />}
          </span>
        );
      },
    },
    {
      chave: "score_original",
      titulo: "Score original",
      largura: "130px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (l) => l.score_original ?? 0,
      renderizar: (l) => (
        <span className="text-xs tabular-nums text-fg-muted">
          {l.score_original === null ? "—" : numero(l.score_original * 100, 1) + " pts"}
        </span>
      ),
    },
    {
      chave: "score_ajustado",
      titulo: "Score ajustado",
      largura: "140px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (l) => l.score_ajustado,
      renderizar: (l) => {
        const delta = l.score_original === null ? null : (l.score_ajustado - l.score_original) * 100;
        return (
          <span className="inline-flex items-center justify-end gap-2">
            <span className="text-xs font-semibold tabular-nums text-fg">{numero(l.score_ajustado * 100, 1) + " pts"}</span>
            {delta !== null && (
              <span className={cn("text-2xs font-semibold tabular-nums", delta >= 0 ? "text-success" : "text-danger")}>
                {(delta >= 0 ? "+" : "") + numero(delta, 1)}
              </span>
            )}
          </span>
        );
      },
    },
  ];

  /* --------------------------------- Ações -------------------------------- */

  function executarMatching() {
    setSimulacao(null);
    if (tipoAlvo === "tarefa" && tarefaId) {
      setParametros({ task: Number(tarefaId), modo, limite });
      return;
    }
    if (tipoAlvo === "projeto" && projetoId) {
      setParametros({ project: Number(projetoId), modo, limite });
      return;
    }
    setParametros(null);
    alerta("Selecione o alvo", "Escolha um projeto ou uma tarefa antes de executar o motor.");
  }

  async function executarSimulacao() {
    const alvo: Parametros | null =
      parametros ??
      (tarefaId
        ? { task: Number(tarefaId), modo, limite }
        : projetoId
          ? { project: Number(projetoId), modo, limite }
          : null);
    if (!alvo) {
      alerta("Selecione o alvo", "A simulação precisa de um projeto ou tarefa.");
      return;
    }
    try {
      const resposta = await simular.mutateAsync({
        project: alvo.project,
        task: alvo.task,
        modo,
        ajustes: {
          skill: pesos.skill,
          disponibilidade: pesos.disponibilidade,
          custo: pesos.custo,
          preferencia: pesos.preferencia,
          experiencia: pesos.experiencia,
          proximidade: pesos.proximidade,
          somente_disponiveis: somenteDisponiveis,
          limite: limiteSimulacao,
        },
      });
      setSimulacao(resposta);
      sucesso("Cenário simulado", "Comparação entre o ranking original e o ajustado disponível abaixo.");
    } catch (e) {
      erro("Não foi possível simular", mensagemErro(e));
    }
  }

  async function alocar(candidato: Recomendacao) {
    try {
      if (candidato.recomendacao_id) {
        await decidir.mutateAsync({
          id: candidato.recomendacao_id,
          aceitar: true,
          observacao: "Recomendação aceita pelo gestor a partir do motor de alocação.",
          percentual: 100,
        });
        sucesso("Recomendação aceita", candidato.nome + " foi alocado na tarefa selecionada.");
        return;
      }
      if (parametros && parametros.project) {
        await alocarDireto.mutateAsync({
          project: parametros.project,
          user: candidato.user_id,
          percentual: 100,
          modalidade: modo === "MISTO" ? "MISTA" : modo,
          data_inicio: periodo ? periodo.inicio : hojeISO(),
          data_fim: periodo ? periodo.fim : somarDias(hojeISO(), 30),
          status: "CONFIRMADA",
          justificativa: "Alocação criada a partir do motor de matching (alvo: projeto).",
          score_matching: candidato.score,
        });
        return;
      }
      alerta("Sem recomendação persistida", "Execute o matching de uma tarefa para registrar a decisão.");
    } catch (e) {
      erro("Não foi possível alocar", mensagemErro(e));
    }
  }

  async function confirmarRecusa() {
    if (!recusar || !recusar.recomendacao_id) return;
    if (!observacaoRecusa.trim()) {
      alerta("Justificativa obrigatória", "Descreva o motivo da recusa para manter a rastreabilidade.");
      return;
    }
    try {
      await decidir.mutateAsync({
        id: recusar.recomendacao_id,
        aceitar: false,
        observacao: observacaoRecusa,
      });
      sucesso("Recomendação recusada", "A decisão ficou registrada no histórico da tarefa.");
      setRecusar(null);
      setObservacaoRecusa("");
    } catch (e) {
      erro("Não foi possível registrar a recusa", mensagemErro(e));
    }
  }

  async function confirmarOverride() {
    if (!override || !override.recomendacao_id) return;
    if (!overrideForm.user) {
      alerta("Selecione a pessoa", "O override precisa indicar quem será alocado.");
      return;
    }
    if (!overrideForm.justificativa.trim()) {
      alerta("Justificativa obrigatória", "O override manual exige justificativa para auditoria.");
      return;
    }
    try {
      await decidir.mutateAsync({
        id: override.recomendacao_id,
        aceitar: true,
        user: Number(overrideForm.user),
        percentual: overrideForm.percentual,
        data_inicio: overrideForm.data_inicio,
        data_fim: overrideForm.data_fim,
        observacao: overrideForm.justificativa,
      });
      sucesso("Override registrado", "A alocação substitui a recomendação do motor e fica auditada.");
      setOverride(null);
      setOverrideForm({
        user: "",
        justificativa: "",
        percentual: 100,
        data_inicio: hojeISO(),
        data_fim: somarDias(hojeISO(), 30),
      });
    } catch (e) {
      erro("Não foi possível registrar o override", mensagemErro(e));
    }
  }

  const registroRecusar = recusar;
  const registroOverride = override;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Motor de alocação inteligente"
        subtitulo="Score explicável com pesos por modo, decomposição por componente, override auditado e simulação what-if."
        icone={Brain}
        cor="#8B5CF6"
        acoes={
          <Botao
            variante="secundario"
            icone={RefreshCw}
            carregando={matching.isFetching}
            onClick={() => matching.refetch()}
          >
            Recalcular
          </Botao>
        }
      />

      <Cartao
        titulo="Alvo e modo de alocação"
        subtitulo="Escolha onde alocar e qual estratégia o motor deve priorizar"
        icone={Target}
        corIcone="#2563EB"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Campo rotulo="Tipo de alvo" className="w-44">
              <Segmentado
                valor={tipoAlvo}
                onChange={(v) => {
                  setTipoAlvo(v);
                  setParametros(null);
                  setSimulacao(null);
                }}
                opcoes={[
                  { valor: "projeto", rotulo: "Projeto", icone: Layers },
                  { valor: "tarefa", rotulo: "Tarefa", icone: Target },
                ]}
                tamanho="sm"
              />
            </Campo>

            <Campo rotulo="Projeto" htmlFor="matching-projeto" className="w-72">
              <Selecao
                id="matching-projeto"
                value={projetoId}
                onChange={(e) => {
                  setProjetoId(e.target.value);
                  setTarefaId("");
                  setParametros(null);
                  setSimulacao(null);
                }}
              >
                <option value="">Selecione o projeto</option>
                {(projetos.data ?? []).map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.codigo + " · " + p.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            {tipoAlvo === "tarefa" && (
              <Campo
                rotulo="Tarefa"
                htmlFor="matching-tarefa"
                dica={projetoId ? undefined : "Escolha um projeto para carregar as tarefas."}
                className="w-80"
              >
                <Selecao
                  id="matching-tarefa"
                  value={tarefaId}
                  disabled={!projetoId}
                  onChange={(e) => {
                    setTarefaId(e.target.value);
                    setParametros(null);
                    setSimulacao(null);
                  }}
                >
                  <option value="">Selecione a tarefa</option>
                  {(tarefas.data ?? []).map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.wbs ? t.wbs + " · " + t.nome : t.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            )}

            <Campo rotulo="Limite de resultados" className="w-56">
              <ControleDeslizante
                valor={limite}
                onChange={setLimite}
                min={3}
                max={30}
                rotulo="Candidatos exibidos"
                sufixo=""
              />
            </Campo>

            <Botao variante="primario" tamanho="lg" icone={Zap} carregando={matching.isFetching} onClick={executarMatching}>
              Executar matching
            </Botao>
          </div>

          {modos.isLoading ? (
            <Esqueleto linhas={2} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {modosDisponiveis.map((m) => {
                const ativo = m.valor === modo;
                return (
                  <button
                    key={m.valor}
                    type="button"
                    onClick={() => {
                      setModo(m.valor);
                      setPesos({
                        skill: Math.round((m.pesos.skill ?? 0) * 100),
                        disponibilidade: Math.round((m.pesos.disponibilidade ?? 0) * 100),
                        custo: Math.round((m.pesos.custo ?? 0) * 100),
                        preferencia: Math.round((m.pesos.preferencia ?? 0) * 100),
                        experiencia: Math.round((m.pesos.experiencia ?? 0) * 100),
                        proximidade: Math.round((m.pesos.proximidade ?? 0) * 100),
                      });
                      setParametros(null);
                      setSimulacao(null);
                    }}
                    className={cn(
                      "rounded-sgp-lg border p-3 text-left transition-all",
                      ativo ? "border-brand bg-brand-soft/40 ring-2 ring-brand/40" : "border-border bg-surface hover:border-border-strong"
                    )}
                    aria-pressed={ativo}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: corModo(m.valor) }}>
                        {m.rotulo}
                      </span>
                      {ativo && <CheckCircle2 className="size-4 text-brand" aria-hidden />}
                    </div>
                    <p className="mt-1 text-2xs text-fg-muted">{m.descricao || "Sem descrição cadastrada."}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {COMPONENTES.map((c) => (
                        <span key={c.chave} className="text-2xs text-fg-subtle">
                          {c.rotulo.slice(0, 4) + " " + numero((m.pesos[c.chave] ?? 0) * 100, 0) + "%"}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Cartao>

      {matching.isLoading && <CarregandoBloco rotulo="Avaliando candidatos..." />}

      {matching.isError && (
        <Alerta tom="danger" titulo="Não foi possível executar o motor de alocação">
          {mensagemErro(matching.error)}
        </Alerta>
      )}

      {!parametros && !matching.isLoading && (
        <Vazio
          icone={Sparkles}
          titulo="Execute o matching para ver os candidatos"
          descricao="O motor combina seis componentes ponderados (skill, disponibilidade, custo, preferência, experiência e proximidade) e desconta penalidades de sobrecarga e conflito de agenda."
        />
      )}

      {resultado && (
        <>
          <Cartao
            titulo="Explicabilidade do score"
            subtitulo={numero(resultado.total_avaliados) + " candidato(s) avaliado(s) para " + resultado.alvo.nome}
            icone={Info}
            corIcone="#0891B2"
          >
            <div className="space-y-3">
              <div className="rounded-sgp border border-border bg-surface-2 p-3">
                <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Fórmula aplicada</p>
                <p className="mt-1 font-mono text-2xs text-fg">{resultado.explicacao_formula}</p>
                <p className="mt-1.5 text-2xs text-fg-muted">{resultado.modo_descricao}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Pesos utilizados</p>
                  <GraficoBarras
                    horizontal
                    itens={COMPONENTES.map((c) => ({
                      rotulo: c.rotulo,
                      valor: Math.round((pesosUsados[c.chave] ?? 0) * 100),
                      cor: c.cor,
                    }))}
                    formatarValor={(v) => numero(v, 0) + "%"}
                  />
                </div>
                <div>
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                    Requisitos do alvo ({numero(resultado.requisitos.length)})
                  </p>
                  {resultado.requisitos.length === 0 ? (
                    <Alerta tom="info" titulo="Alvo sem requisitos de capacidade">
                      O componente de skill usa um valor neutro (0,60) até que requisitos sejam definidos para{" "}
                      {resultado.alvo.tipo === "tarefa" ? "a tarefa" : "o projeto"}.
                    </Alerta>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {resultado.requisitos.map((r) => (
                        <Chip key={r.skill_id} cor={r.cor || "#2563EB"} icone={Layers}>
                          {r.skill + " · N" + r.nivel_minimo + " · peso " + numero(r.peso, 1) + (r.obrigatorio ? " · obrigatório" : "")}
                        </Chip>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Etiqueta tom="brand" icone={Target}>
                      {resultado.alvo.tipo === "tarefa" ? "Tarefa" : "Projeto"}: {resultado.alvo.nome}
                    </Etiqueta>
                    <Etiqueta tom="neutral" icone={Layers}>
                      {resultado.alvo.projeto}
                    </Etiqueta>
                    {periodo && (
                      <Etiqueta tom="info" icone={Clock}>
                        {dataCurta(periodo.inicio) + " → " + dataCurta(periodo.fim)}
                      </Etiqueta>
                    )}
                    <Etiqueta cor={corModo(resultado.modo)} icone={Brain}>
                      modo {rotuloModo(resultado.modo)}
                    </Etiqueta>
                  </div>
                </div>
              </div>

              <LinhaKPI
                itens={[
                  { rotulo: "Avaliados", valor: numero(resultado.total_avaliados), icone: Users, cor: "#2563EB" },
                  { rotulo: "Exibidos", valor: numero(candidatos.length), icone: Sparkles, cor: "#8B5CF6" },
                  { rotulo: "Elegíveis", valor: numero(resumoScore.elegiveis), icone: BadgeCheck, cor: "#059669" },
                  { rotulo: "Score médio", valor: numero(resumoScore.media, 1) + " pts", icone: Gauge, cor: "#0891B2" },
                  { rotulo: "Melhor score", valor: numero(resumoScore.melhor, 1) + " pts", icone: TrendingUp, cor: "#F59E0B" },
                  {
                    rotulo: "Com penalidade",
                    valor: numero(candidatos.filter((c) => c.penalidades.length > 0).length),
                    icone: AlertTriangle,
                    cor: "#DC2626",
                  },
                ]}
              />
            </div>
          </Cartao>

          {candidatos.length === 0 ? (
            <Vazio
              icone={Users}
              titulo="Nenhum candidato elegível"
              descricao="Todos os colaboradores já estão alocados nesta tarefa ou nenhum está disponível no período."
            />
          ) : (
            <GradeCards colunas={2}>
              {candidatos.map((c) => (
                <CartaoCandidato
                  key={c.user_id}
                  candidato={c}
                  pesos={pesosUsados}
                  podeAlocar={podeAlocar}
                  podeDecidir={podeDecidir}
                  ocupado={decidir.isPending || alocarDireto.isPending}
                  aoAlocar={alocar}
                  aoRecusar={(rec) => {
                    setRecusar(rec);
                    setObservacaoRecusa("");
                  }}
                  aoOverride={(rec) => {
                    setOverride(rec);
                    setOverrideForm({
                      user: "",
                      justificativa: "",
                      percentual: 100,
                      data_inicio: periodo ? periodo.inicio : hojeISO(),
                      data_fim: periodo ? periodo.fim : somarDias(hojeISO(), 30),
                    });
                  }}
                />
              ))}
            </GradeCards>
          )}
        </>
      )}

      <SecaoColapsavel titulo="Simulação what-if de pesos" icone={SlidersHorizontal} abertoInicial={false}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
              {COMPONENTES.map((c) => (
                <ControleDeslizante
                  key={c.chave}
                  valor={pesos[c.chave] ?? 0}
                  onChange={(v) => setPesos((p) => ({ ...p, [c.chave]: v }))}
                  min={0}
                  max={100}
                  cor={c.cor}
                  rotulo={c.rotulo}
                  sufixo="%"
                  marcos={[0, 25, 50, 75, 100]}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <Interruptor
                ativo={somenteDisponiveis}
                onChange={setSomenteDisponiveis}
                rotulo="Somente disponíveis"
                descricao="remove do pool quem já tem alocação confirmada no período"
              />
              <div className="w-56">
                <ControleDeslizante
                  valor={limiteSimulacao}
                  onChange={setLimiteSimulacao}
                  min={3}
                  max={30}
                  rotulo="Limite de resultados"
                  sufixo=""
                />
              </div>
              <Botao
                variante="primario"
                icone={Wand2}
                carregando={simular.isPending}
                onClick={executarSimulacao}
              >
                Simular cenário
              </Botao>
              <Botao
                variante="fantasma"
                icone={RefreshCw}
                onClick={() => {
                  const base = modoAtual?.pesos;
                  setPesos({
                    skill: Math.round((base?.skill ?? 0.45) * 100),
                    disponibilidade: Math.round((base?.disponibilidade ?? 0.2) * 100),
                    custo: Math.round((base?.custo ?? 0.1) * 100),
                    preferencia: Math.round((base?.preferencia ?? 0.05) * 100),
                    experiencia: Math.round((base?.experiencia ?? 0.15) * 100),
                    proximidade: Math.round((base?.proximidade ?? 0.05) * 100),
                  });
                  setSomenteDisponiveis(false);
                  setSimulacao(null);
                }}
              >
                Restaurar pesos do modo
              </Botao>
            </div>
            <Alerta tom="info" titulo="Como a simulação funciona" icone={Lightbulb}>
              Os pesos informados são normalizados pela soma antes de recalcular o score. O ranking original é mantido para
              comparação, mostrando quem sobe ou cai com o novo cenário.
            </Alerta>
          </div>

          <div className="space-y-3">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Pesos ajustados (normalizados)</p>
              {simulacao?.cenario ? (
                <div className="mt-2">
                  <GraficoBarras
                    horizontal
                    itens={COMPONENTES.map((c) => ({
                      rotulo: c.rotulo,
                      valor: Math.round((simulacao.cenario?.pesos_ajustados[c.chave] ?? 0) * 100),
                      comparativo: Math.round((pesosUsados[c.chave] ?? 0) * 100),
                      cor: c.cor,
                    }))}
                    formatarValor={(v) => numero(v, 0) + "%"}
                  />
                  <p className="mt-2 text-2xs text-fg-subtle">
                    Comparativo em cinza: pesos originais do modo {rotuloModo(resultado ? resultado.modo : modo)}.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-2xs text-fg-muted">Execute a simulação para ver os pesos normalizados.</p>
              )}
            </div>
          </div>
        </div>

        {simulacao && linhasComparacao.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
              Comparativo antes × depois ({numero(linhasComparacao.length)} candidatos)
            </p>
            <GraficoBarras
              altura={220}
              itens={linhasComparacao.map((l) => ({
                rotulo: l.nome.split(" ")[0],
                valor: Math.round(l.score_ajustado * 100),
                comparativo: l.score_original === null ? undefined : Math.round(l.score_original * 100),
                cor: "#8B5CF6",
              }))}
              formatarValor={(v) => numero(v, 0) + " pts"}
            />
            <Tabela colunas={colunasComparacao} dados={linhasComparacao} compacta />
            <div className="flex flex-wrap gap-3 text-2xs text-fg-muted">
              <span className="inline-flex items-center gap-1">
                <ArrowUp className="size-3.5 text-success" aria-hidden /> subiu no ranking
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowDown className="size-3.5 text-danger" aria-hidden /> caiu no ranking
              </span>
              <span className="inline-flex items-center gap-1">
                <Minus className="size-3.5 text-fg-subtle" aria-hidden /> manteve a posição
              </span>
            </div>
          </div>
        )}
      </SecaoColapsavel>

      {tarefaId && (
        <Cartao
          titulo="Histórico de recomendações da tarefa"
          subtitulo="Recomendações persistidas pelo motor com o status da decisão"
          icone={Layers}
          corIcone="#F59E0B"
        >
          {historico.isLoading ? (
            <CarregandoBloco rotulo="Carregando histórico..." />
          ) : (historico.data ?? []).length === 0 ? (
            <Vazio
              icone={Layers}
              titulo="Nenhuma recomendação persistida"
              descricao="Execute o matching desta tarefa para gerar e armazenar as recomendações."
            />
          ) : (
            <div className="space-y-2">
              {(historico.data ?? []).map((h) => (
                <div
                  key={h.id}
                  className="flex flex-wrap items-center gap-3 rounded-sgp border border-border bg-surface-2 p-2.5"
                >
                  <Avatar
                    nome={h.user_detalhe ? h.user_detalhe.nome : "?"}
                    cor={h.user_detalhe ? h.user_detalhe.cor : "#64748B"}
                    iniciais={h.user_detalhe ? h.user_detalhe.iniciais : undefined}
                    tamanho="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-fg">
                      {h.user_detalhe ? h.user_detalhe.nome : "Colaborador removido"}
                    </p>
                    <p className="truncate text-2xs text-fg-subtle">
                      {"Posição #" + h.posicao + " · score " + numero(h.score * 100, 1) + " pts · " + (h.modo_rotulo || rotuloModo(h.modo))}
                    </p>
                  </div>
                  <Etiqueta tom={STATUS_RECOMENDACAO[h.status] ?? "neutral"}>{h.status_rotulo || h.status}</Etiqueta>
                  {h.decidido_em && (
                    <span className="text-2xs text-fg-subtle">decidido em {dataCurta(h.decidido_em)}</span>
                  )}
                  {h.penalidades.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-2xs text-danger">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      {numero(h.penalidades.length) + " penalidade(s)"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Cartao>
      )}

      <Modal
        aberto={registroRecusar !== null}
        onFechar={() => setRecusar(null)}
        titulo="Recusar recomendação"
        subtitulo={registroRecusar ? registroRecusar.nome : ""}
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setRecusar(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Ban} carregando={decidir.isPending} onClick={confirmarRecusa}>
              Registrar recusa
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          {registroRecusar && (
            <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
              <Avatar nome={registroRecusar.nome} cor={registroRecusar.cor} iniciais={registroRecusar.iniciais} tamanho="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{registroRecusar.nome}</p>
                <p className="truncate text-2xs text-fg-muted">
                  {"Score " + numero(registroRecusar.score * 100, 1) + " pts · posição #" + registroRecusar.posicao}
                </p>
              </div>
            </div>
          )}
          <Campo
            rotulo="Justificativa da recusa"
            obrigatorio
            dica="O motivo fica registrado na recomendação e alimenta a taxa de override do dashboard."
            htmlFor="recusa-observacao"
          >
            <AreaTexto
              id="recusa-observacao"
              rows={3}
              value={observacaoRecusa}
              placeholder="Ex.: já alocado em outro projeto crítico no mesmo período."
              onChange={(e) => setObservacaoRecusa(e.target.value)}
            />
          </Campo>
        </div>
      </Modal>

      <PainelLateral
        aberto={registroOverride !== null}
        onFechar={() => setOverride(null)}
        largura="md"
        titulo="Override manual com justificativa"
        subtitulo={
          registroOverride
            ? "Recomendado pelo motor: " + registroOverride.nome + " (score " + numero(registroOverride.score * 100, 1) + " pts)"
            : ""
        }
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setOverride(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="aviso"
              icone={Repeat}
              carregando={decidir.isPending}
              disabled={!overrideForm.justificativa.trim() || !overrideForm.user}
              onClick={confirmarOverride}
            >
              Registrar override
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <Alerta tom="warning" titulo="Decisão auditada" icone={AlertTriangle}>
            O override substitui a recomendação do motor e é contabilizado na taxa de override do dashboard de alocação.
          </Alerta>

          {registroOverride && (
            <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
              <Avatar nome={registroOverride.nome} cor={registroOverride.cor} iniciais={registroOverride.iniciais} tamanho="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{registroOverride.nome}</p>
                <p className="truncate text-2xs text-fg-muted">{registroOverride.justificativa.disponibilidade}</p>
              </div>
              <Etiqueta cor="#2563EB" className="ml-auto">
                {"#" + registroOverride.posicao + " · " + numero(registroOverride.score * 100, 1) + " pts"}
              </Etiqueta>
            </div>
          )}

          <Campo rotulo="Pessoa a alocar" obrigatorio htmlFor="override-pessoa">
            <Selecao
              id="override-pessoa"
              value={overrideForm.user}
              onChange={(e) => setOverrideForm((f) => ({ ...f, user: e.target.value }))}
            >
              <option value="">Selecione o colaborador</option>
              {(usuarios.data ?? []).map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nome + " · " + (u.cargo || "sem cargo") + (registroOverride && u.id === registroOverride.user_id ? " (recomendado)" : "")}
                </option>
              ))}
            </Selecao>
          </Campo>

          <ControleDeslizante
            valor={overrideForm.percentual}
            onChange={(v) => setOverrideForm((f) => ({ ...f, percentual: v }))}
            min={1}
            max={100}
            rotulo="Percentual de dedicação"
            sufixo="%"
            marcos={[25, 50, 75, 100]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início" htmlFor="override-inicio">
              <Entrada
                id="override-inicio"
                type="date"
                value={overrideForm.data_inicio}
                onChange={(e) => setOverrideForm((f) => ({ ...f, data_inicio: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Fim" htmlFor="override-fim">
              <Entrada
                id="override-fim"
                type="date"
                value={overrideForm.data_fim}
                onChange={(e) => setOverrideForm((f) => ({ ...f, data_fim: e.target.value }))}
              />
            </Campo>
          </div>

          <Campo
            rotulo="Justificativa obrigatória"
            obrigatorio
            dica="Explique por que a escolha manual supera a recomendação calculada."
            htmlFor="override-justificativa"
          >
            <AreaTexto
              id="override-justificativa"
              rows={4}
              value={overrideForm.justificativa}
              placeholder="Ex.: decisão de desenvolvimento do colaborador com mentor sênior no mesmo time."
              onChange={(e) => setOverrideForm((f) => ({ ...f, justificativa: e.target.value }))}
            />
          </Campo>

          <Alerta tom="info" titulo="Rastreabilidade" icone={Info}>
            O registro guarda quem decidiu, a recomendação original, a pessoa escolhida e a justificativa informada.
          </Alerta>
        </div>
      </PainelLateral>

      <BarraFerramentas className="justify-between">
        <span className="inline-flex items-center gap-2 text-2xs text-fg-muted">
          <Filter className="size-3.5" aria-hidden />
          O motor ignora candidatos já alocados na tarefa e aplica penalidades por sobrecarga, skill obrigatória em falta,
          conflito com tarefa crítica e histórico de atrasos.
        </span>
        <span className="inline-flex items-center gap-2 text-2xs text-fg-subtle">
          <Coins className="size-3.5" aria-hidden />
          Valores de custo aparecem apenas quando o seu perfil tem permissão de visualização.
        </span>
      </BarraFerramentas>
    </div>
  );
}

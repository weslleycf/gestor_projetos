import { useEffect, useMemo, useState } from "react";
import {
  Activity, CalendarDays, CalendarRange, Check, Copy, GitCompare, Layers, LayoutDashboard, Link2, List,
  ListChecks, MessageSquare, Paperclip, Pencil, Plus, Save, ShieldAlert, Sparkles, Target, Trash2, Users,
  Wallet, type LucideIcon,
} from "lucide-react";
import {
  Alerta, AreaTexto, BarraProgresso, Botao, BotaoIcone, Campo, CarregandoBloco, Cartao, Chip,
  ControleDeslizante, Dica, Entrada, Etiqueta, Modal, PainelLateral, SecaoColapsavel, Selecao, Tabela,
  Vazio, useAvisos, type ColunaTabela,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { ListaAnexos } from "@/components/anexos";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, diasEntre, moeda, numero, percentual } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type {
  Alocacao, ChecklistItem, Dependencia, Prioridade, Projeto, ProjetoBaseline, Skill, StatusTarefa, Tarefa,
} from "@/lib/types";

/* ==========================================================================
   Comum do detalhe do projeto — tipos, constantes, formatadores e componentes
   compartilhados entre as abas e com a casca da pagina.
   ========================================================================== */

export type Aba =
  | "dashboard" | "gantt" | "kanban" | "lista" | "calendario" | "timeline"
  | "riscos" | "financeiro" | "equipe" | "capacidades" | "atividade" | "anexos";

export const ABAS: Array<{ valor: Aba; rotulo: string; icone: LucideIcon }> = [
  { valor: "dashboard", rotulo: "Dashboard", icone: LayoutDashboard },
  { valor: "gantt", rotulo: "Gantt", icone: CalendarRange },
  { valor: "kanban", rotulo: "Kanban", icone: Layers },
  { valor: "lista", rotulo: "Lista", icone: List },
  { valor: "calendario", rotulo: "Calendário", icone: CalendarDays },
  { valor: "timeline", rotulo: "Timeline", icone: Activity },
  { valor: "riscos", rotulo: "Riscos", icone: ShieldAlert },
  { valor: "financeiro", rotulo: "Financeiro", icone: Wallet },
  { valor: "equipe", rotulo: "Equipe", icone: Users },
  { valor: "capacidades", rotulo: "Capacidades", icone: Sparkles },
  { valor: "atividade", rotulo: "Atividade", icone: MessageSquare },
  { valor: "anexos", rotulo: "Anexos", icone: Paperclip },
];

export const ROTULOS_STATUS_PROJETO: Record<string, string> = {
  IDEIA: "Ideia",
  PLANEJADO: "Planejado",
  EM_ANALISE: "Em análise",
  APROVADO: "Aprovado",
  EM_EXECUCAO: "Em execução",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  ARQUIVADO: "Arquivado",
};

export const OPCOES_STATUS_TAREFA: Array<{ valor: StatusTarefa; rotulo: string }> = [
  { valor: "BACKLOG", rotulo: "Backlog" },
  { valor: "A_FAZER", rotulo: "A fazer" },
  { valor: "EM_ANDAMENTO", rotulo: "Em andamento" },
  { valor: "EM_REVISAO", rotulo: "Em revisão" },
  { valor: "BLOQUEADA", rotulo: "Bloqueada" },
  { valor: "CONCLUIDA", rotulo: "Concluída" },
  { valor: "CANCELADA", rotulo: "Cancelada" },
];

export const OPCOES_PRIORIDADE: Array<{ valor: Prioridade; rotulo: string }> = [
  { valor: "BAIXA", rotulo: "Baixa" },
  { valor: "MEDIA", rotulo: "Média" },
  { valor: "ALTA", rotulo: "Alta" },
  { valor: "CRITICA", rotulo: "Crítica" },
];

export const CORES_STATUS_TAREFA: Record<string, string> = {
  BACKLOG: "#64748B",
  A_FAZER: "#0891B2",
  EM_ANDAMENTO: "#2563EB",
  EM_REVISAO: "#8B5CF6",
  BLOQUEADA: "#DC2626",
  CONCLUIDA: "#059669",
  CANCELADA: "#94A3B8",
};

export interface PontoCurva {
  data: string;
  rotulo: string;
  PV: number;
  EV: number;
  AC: number;
  desvio_custo: number;
  desvio_prazo: number;
  EAC_projetado?: number;
}

export interface OrcamentoCategoria {
  id: number;
  categoria: string;
  tipo: string;
  cor: string;
  icone: string;
  planejado: number;
  realizado: number;
  saldo: number;
  consumo: number;
  situacao: string;
}

export interface PessoaOpcao {
  id: number;
  nome: string;
  cor: string;
  iniciais: string;
}

export function usePessoasDoProjeto(projetoId: number): PessoaOpcao[] {
  const { data: catalogo } = useConsulta<{ gerentes: PessoaOpcao[] }>(
    ["projetos", "catalogo"],
    "/projetos/assistente/catalogo/"
  );
  const { data: alocacoes = [] } = useLista<Alocacao>(["alocacoes", "projeto", projetoId], "/alocacoes/", {
    project: projetoId,
  });
  return useMemo(() => {
    const mapa = new Map<number, PessoaOpcao>();
    (catalogo?.gerentes ?? []).forEach((pessoa) => mapa.set(pessoa.id, pessoa));
    alocacoes.forEach((item) => {
      if (item.user_detalhe) {
        mapa.set(item.user_detalhe.id, {
          id: item.user_detalhe.id,
          nome: item.user_detalhe.nome,
          cor: item.user_detalhe.cor,
          iniciais: item.user_detalhe.iniciais,
        });
      }
    });
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [catalogo, alocacoes]);
}

/* ==========================================================================
   Etiquetas da tarefa e comparação com a baseline
   ========================================================================== */

/** Converte listas digitadas (vírgula, ponto e vírgula ou linha) em array de texto. */
export function listaDeTexto(valor: string) {
  return valor
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Texto livre que vira lista, com sugestões das etiquetas já usadas nas tarefas do projeto. */
export function CampoEtiquetas({
  id,
  valor,
  onChange,
  sugestoes,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  sugestoes: string[];
}) {
  const marcadas = listaDeTexto(valor);
  const disponiveis = sugestoes.filter((tag) => !marcadas.includes(tag)).slice(0, 12);

  const adicionar = (tag: string) => {
    const limpa = tag.trim();
    if (!limpa || marcadas.includes(limpa)) return;
    onChange([...marcadas, limpa].join(", "));
  };

  return (
    <Campo
      rotulo="Etiquetas"
      dica="Separe por vírgula, ponto e vírgula ou linha. As sugestões vêm das etiquetas já usadas nas tarefas do projeto."
      htmlFor={id}
    >
      <Entrada
        id={id}
        list={id + "-sugestoes"}
        value={valor}
        placeholder="fornecedor, infraestrutura, contrato"
        onChange={(evento) => onChange(evento.target.value)}
      />
      <datalist id={id + "-sugestoes"}>
        {sugestoes.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
      {marcadas.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Etiquetas da tarefa">
          {marcadas.map((tag) => (
            <li key={tag}>
              <Chip removivel onRemover={() => onChange(marcadas.filter((item) => item !== tag).join(", "))}>
                {tag}
              </Chip>
            </li>
          ))}
        </ul>
      )}
      {disponiveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-2xs text-fg-subtle">Sugestões:</span>
          {disponiveis.map((tag) => (
            <Chip key={tag} ativo={false} onClick={() => adicionar(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
      )}
    </Campo>
  );
}

/** Resposta de GET /projetos/{id}/comparar-baseline/{baselineId}/ — Baseline.comparar(). */
export interface ComparacaoBaseline {
  baseline: { id: number; versao: number; nome: string };
  adicionadas: Array<{ id: string; nome: string }>;
  removidas: Array<{ id: string; nome: string }>;
  alteradas: Array<{
    id: string;
    nome: string;
    desvios: Record<string, { antes: string | number | null; agora: string | number | null }>;
  }>;
  resumo: {
    total_adicionadas: number;
    total_removidas: number;
    total_alteradas: number;
    desvio_prazo_dias: number | null;
    desvio_orcamento: number;
  };
}

export interface LinhaDesvio {
  id: string;
  tarefa: string;
  campo: string;
  antes: string;
  agora: string;
  variacao: string;
  tom: "success" | "warning" | "danger" | "info" | "neutral";
}

export const CAMPOS_BASELINE: Record<string, { rotulo: string; tipo: "data" | "horas" | "percentual" }> = {
  data_inicio: { rotulo: "Início", tipo: "data" },
  data_fim: { rotulo: "Fim", tipo: "data" },
  esforco_estimado: { rotulo: "Esforço estimado", tipo: "horas" },
  percentual_conclusao: { rotulo: "Conclusão", tipo: "percentual" },
};

export function valorNaBaseline(campo: string, valor: string | number | null) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const meta = CAMPOS_BASELINE[campo];
  if (!meta) return String(valor);
  if (meta.tipo === "data") return dataCurta(String(valor));
  if (meta.tipo === "horas") return numero(Number(valor)) + " h";
  return percentual(Number(valor));
}

export function variacaoNaBaseline(campo: string, antes: string | number | null, agora: string | number | null) {
  const meta = CAMPOS_BASELINE[campo];
  if (!meta) return { texto: "alterado", tom: "info" as const };
  if (meta.tipo === "data") {
    if (!antes && !agora) return { texto: "sem data", tom: "neutral" as const };
    if (!antes) return { texto: "data definida", tom: "info" as const };
    if (!agora) return { texto: "data removida", tom: "danger" as const };
    const dias = diasEntre(String(antes), String(agora));
    if (!dias) return { texto: "mesmo dia", tom: "neutral" as const };
    return {
      texto: (dias > 0 ? "+" : "") + numero(dias) + (Math.abs(dias) === 1 ? " dia" : " dias"),
      tom: dias > 0 ? ("danger" as const) : ("success" as const),
    };
  }
  const delta = Number(agora || 0) - Number(antes || 0);
  if (!delta) return { texto: "sem variação", tom: "neutral" as const };
  const sufixo = meta.tipo === "percentual" ? " p.p." : " h";
  return {
    texto: (delta > 0 ? "+" : "") + numero(delta, meta.tipo === "percentual" ? 0 : 1) + sufixo,
    tom: delta > 0 ? ("warning" as const) : ("success" as const),
  };
}


/* ==========================================================================
   Comparação com a baseline (GET /projetos/{id}/comparar-baseline/{id}/)
   ========================================================================== */

export function PainelComparacaoBaseline({
  projetoId,
  aberto,
  onFechar,
  podeCriarBaseline,
  aoCriarBaseline,
}: {
  projetoId: number;
  aberto: boolean;
  onFechar: () => void;
  podeCriarBaseline: boolean;
  aoCriarBaseline: () => void;
}) {
  const [selecionada, setSelecionada] = useState("");
  const baselines = useLista<ProjetoBaseline>(["baselines", projetoId], aberto ? "/baselines/" : null, {
    project: projetoId,
    page_size: 100,
  });

  useEffect(() => {
    if (!aberto) return;
    const lista = baselines.data || [];
    if (!lista.length) return;
    if (selecionada && lista.some((baseline) => String(baseline.id) === selecionada)) return;
    const ativa = lista.find((baseline) => baseline.ativa) || lista[0];
    setSelecionada(String(ativa.id));
  }, [aberto, baselines.data, selecionada]);

  const comparacao = useConsulta<ComparacaoBaseline>(
    ["baseline", "comparacao", projetoId, selecionada],
    aberto && selecionada ? "/projetos/" + projetoId + "/comparar-baseline/" + selecionada + "/" : null
  );

  const linhas = useMemo<LinhaDesvio[]>(() => {
    const saida: LinhaDesvio[] = [];
    (comparacao.data?.alteradas || []).forEach((tarefa) => {
      Object.entries(tarefa.desvios || {}).forEach(([campo, desvio]) => {
        const variacao = variacaoNaBaseline(campo, desvio.antes, desvio.agora);
        saida.push({
          id: tarefa.id + "-" + campo,
          tarefa: tarefa.nome,
          campo: (CAMPOS_BASELINE[campo] || { rotulo: campo }).rotulo,
          antes: valorNaBaseline(campo, desvio.antes),
          agora: valorNaBaseline(campo, desvio.agora),
          variacao: variacao.texto,
          tom: variacao.tom,
        });
      });
    });
    return saida;
  }, [comparacao.data]);

  const colunas: Array<ColunaTabela<LinhaDesvio>> = [
    {
      chave: "tarefa",
      titulo: "Tarefa",
      largura: "30%",
      renderizar: (linha) => <span className="text-xs text-fg">{linha.tarefa}</span>,
    },
    {
      chave: "campo",
      titulo: "Campo",
      largura: "150px",
      renderizar: (linha) => <Etiqueta tom="neutral">{linha.campo}</Etiqueta>,
    },
    {
      chave: "antes",
      titulo: "Na baseline",
      largura: "130px",
      renderizar: (linha) => <span className="text-xs tabular-nums text-fg-muted">{linha.antes}</span>,
    },
    {
      chave: "agora",
      titulo: "Valor atual",
      largura: "130px",
      renderizar: (linha) => <span className="text-xs font-medium tabular-nums text-fg">{linha.agora}</span>,
    },
    {
      chave: "variacao",
      titulo: "Variação",
      largura: "140px",
      alinhar: "right",
      renderizar: (linha) => <Etiqueta tom={linha.tom}>{linha.variacao}</Etiqueta>,
    },
  ];

  const listaBaselines = baselines.data || [];
  const resumo = comparacao.data?.resumo;
  const adicionadas = comparacao.data?.adicionadas || [];
  const removidas = comparacao.data?.removidas || [];

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      largura="xl"
      titulo="Comparação com a baseline"
      subtitulo="Desvios entre o plano registrado na baseline e o plano atual"
      rodape={
        <Botao variante="fantasma" onClick={onFechar}>
          Fechar
        </Botao>
      }
    >
      <div className="space-y-4">
        {baselines.isLoading ? (
          <CarregandoBloco rotulo="Carregando baselines..." />
        ) : baselines.isError ? (
          <Alerta tom="danger" titulo="Não foi possível carregar as baselines">
            {mensagemErro(baselines.error)}
          </Alerta>
        ) : listaBaselines.length === 0 ? (
          <Vazio
            icone={Target}
            titulo="Nenhuma baseline registrada"
            descricao="A comparação usa a fotografia do cronograma, das datas e do orçamento gravada na baseline."
            acao={
              podeCriarBaseline ? (
                <Botao variante="primario" icone={Plus} onClick={aoCriarBaseline}>
                  Criar baseline
                </Botao>
              ) : undefined
            }
          />
        ) : (
          <>
            <Campo
              rotulo="Baseline"
              htmlFor="baseline-comparacao"
              dica="Cada baseline é uma fotografia do plano. A versão ativa é a referência do projeto."
            >
              <Selecao
                id="baseline-comparacao"
                value={selecionada}
                onChange={(evento) => setSelecionada(evento.target.value)}
              >
                {listaBaselines.map((baseline) => (
                  <option key={baseline.id} value={String(baseline.id)}>
                    v{baseline.versao} · {baseline.nome || "Baseline de " + dataCurta(baseline.criado_em)}
                    {baseline.ativa ? " (ativa)" : ""}
                  </option>
                ))}
              </Selecao>
            </Campo>

            {comparacao.isLoading ? (
              <CarregandoBloco rotulo="Comparando o plano atual com a baseline..." />
            ) : comparacao.isError ? (
              <Alerta tom="danger" titulo="Não foi possível comparar com a baseline">
                {mensagemErro(comparacao.error)}
              </Alerta>
            ) : comparacao.data && resumo ? (
              <>
                <LinhaKPI
                  itens={[
                    { rotulo: "Adicionadas", valor: numero(resumo.total_adicionadas), icone: Plus, cor: "#059669", subrotulo: "tarefas fora da baseline" },
                    { rotulo: "Removidas", valor: numero(resumo.total_removidas), icone: Trash2, cor: "#DC2626", subrotulo: "na baseline, fora do plano" },
                    { rotulo: "Alteradas", valor: numero(resumo.total_alteradas), icone: Pencil, cor: "#D97706", subrotulo: numero(linhas.length) + " desvio(s) de campo" },
                    {
                      rotulo: "Desvio de prazo",
                      valor: resumo.desvio_prazo_dias === null ? "—" : (resumo.desvio_prazo_dias > 0 ? "+" : "") + numero(resumo.desvio_prazo_dias) + " dia(s)",
                      icone: CalendarDays,
                      cor: resumo.desvio_prazo_dias && resumo.desvio_prazo_dias > 0 ? "#DC2626" : "#059669",
                      subrotulo: "data final atual contra a baseline",
                    },
                    {
                      rotulo: "Desvio de orçamento",
                      valor: moeda(resumo.desvio_orcamento, true),
                      icone: Wallet,
                      cor: resumo.desvio_orcamento > 0 ? "#D97706" : "#059669",
                      subrotulo: "orçamento atual contra a baseline",
                    },
                  ]}
                />

                <Cartao
                  titulo="Desvios por tarefa"
                  subtitulo={numero(linhas.length) + " desvio(s) de campo em " + numero(resumo.total_alteradas) + " tarefa(s)"}
                  icone={GitCompare}
                  corIcone="#7C3AED"
                >
                  <Tabela<LinhaDesvio>
                    colunas={colunas}
                    dados={linhas}
                    compacta
                    vazio={
                      <Vazio
                        icone={GitCompare}
                        titulo="Nenhum desvio de campo"
                        descricao="As tarefas da baseline seguem com as mesmas datas, esforço e percentual de conclusão."
                      />
                    }
                  />
                </Cartao>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Cartao
                    titulo="Tarefas adicionadas"
                    subtitulo="Criadas depois da baseline"
                    icone={Plus}
                    corIcone="#059669"
                  >
                    {adicionadas.length === 0 ? (
                      <p className="text-2xs text-fg-muted">Nenhuma tarefa nova desde a baseline.</p>
                    ) : (
                      <ul className="space-y-1">
                        {adicionadas.map((tarefa) => (
                          <li key={tarefa.id} className="flex items-center gap-2">
                            <Plus className="size-3 shrink-0 text-success" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-xs text-fg">{tarefa.nome}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Cartao>

                  <Cartao
                    titulo="Tarefas removidas"
                    subtitulo="Presentes na baseline e ausentes do plano"
                    icone={Trash2}
                    corIcone="#DC2626"
                  >
                    {removidas.length === 0 ? (
                      <p className="text-2xs text-fg-muted">Nenhuma tarefa da baseline foi removida.</p>
                    ) : (
                      <ul className="space-y-1">
                        {removidas.map((tarefa) => (
                          <li key={tarefa.id} className="flex items-center gap-2">
                            <Trash2 className="size-3 shrink-0 text-danger" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-xs text-fg">{tarefa.nome}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Cartao>
                </div>

                <p className="px-1 text-2xs text-fg-subtle">
                  Comparação com a baseline v{comparacao.data.baseline.versao}
                  {comparacao.data.baseline.nome ? " · " + comparacao.data.baseline.nome : ""}.
                </p>
              </>
            ) : (
              <Vazio icone={GitCompare} titulo="Sem dados de comparação" descricao="Selecione uma baseline para ver os desvios." />
            )}
          </>
        )}
      </div>
    </PainelLateral>
  );
}

/* ==========================================================================
   Painel lateral de edicao de tarefa (checklist, skills, dependencias)
   ========================================================================== */

export const FORM_TAREFA_VAZIO = {
  nome: "",
  descricao: "",
  responsavel: "",
  data_inicio: "",
  data_fim: "",
  esforco_estimado: "0",
  prioridade: "MEDIA" as Prioridade,
  status: "A_FAZER" as StatusTarefa,
  percentual_conclusao: 0,
  parent: "",
  tags: "",
};

export function PainelTarefa({
  projetoId,
  tarefaId,
  aberto,
  onFechar,
  opcoes,
}: {
  projetoId: number;
  tarefaId: number | null;
  aberto: boolean;
  onFechar: () => void;
  opcoes: Array<{ id: number; nome: string }>;
}) {
  const { erro: avisarErro, sucesso } = useAvisos();
  const { pode } = useAuth();
  const podeVerSkills = pode("capacidade.ver");
  const podeEditarChecklist = pode("tarefa.editar");
  const pessoas = usePessoasDoProjeto(projetoId);
  const [confirmando, setConfirmando] = useState(false);
  const [novoItem, setNovoItem] = useState("");
  const [itemEmEdicao, setItemEmEdicao] = useState<number | null>(null);
  const [textoItem, setTextoItem] = useState("");
  const [itemExcluindo, setItemExcluindo] = useState<ChecklistItem | null>(null);
  const [novaDependencia, setNovaDependencia] = useState({ predecessor: "", tipo: "FS", lag: 0 });
  const [novaSkill, setNovaSkill] = useState({ skill: "", nivel_minimo: 3, peso: 1, obrigatorio: false });
  const [form, setForm] = useState(FORM_TAREFA_VAZIO);

  const detalhe = useConsulta<Tarefa>(
    ["tarefas", "detalhe", tarefaId],
    aberto && tarefaId ? "/tarefas/" + tarefaId + "/" : null
  );

  const predecessoras = useLista<Dependencia>(
    ["dependencias", "sucessor", tarefaId],
    aberto && tarefaId ? "/dependencias/" : null,
    { successor: tarefaId }
  );

  const sucessoras = useLista<Dependencia>(
    ["dependencias", "predecessor", tarefaId],
    aberto && tarefaId ? "/dependencias/" : null,
    { predecessor: tarefaId }
  );

  const skills = useLista<Skill>(CHAVES.skills, aberto && podeVerSkills ? "/capacidades/skills/" : null, {
    page_size: 300,
  });

  const tarefasDoProjeto = useLista<Tarefa>(CHAVES.tarefas, aberto ? "/tarefas/" : null, {
    project: projetoId,
    ordering: "ordem",
  });

  const sugestoesEtiquetas = useMemo(() => {
    const conjunto = new Set<string>();
    (tarefasDoProjeto.data || []).forEach((item) => (item.tags || []).forEach((tag) => conjunto.add(tag)));
    return Array.from(conjunto).sort();
  }, [tarefasDoProjeto.data]);

  const [duplicando, setDuplicando] = useState(false);

  useEffect(() => {
    if (!detalhe.data) return;
    const tarefa = detalhe.data;
    setForm({
      nome: tarefa.nome,
      descricao: tarefa.descricao || "",
      responsavel: tarefa.responsavel ? String(tarefa.responsavel) : "",
      data_inicio: tarefa.data_inicio || "",
      data_fim: tarefa.data_fim || "",
      esforco_estimado: String(tarefa.esforco_estimado || "0"),
      prioridade: tarefa.prioridade,
      status: tarefa.status,
      percentual_conclusao: tarefa.percentual_conclusao,
      parent: tarefa.parent ? String(tarefa.parent) : "",
      tags: (tarefa.tags || []).join(", "),
    });
  }, [detalhe.data]);

  // O painel também cria tarefas: ao abrir em modo de criação, o formulário começa limpo.
  useEffect(() => {
    if (!aberto || tarefaId) return;
    setForm(FORM_TAREFA_VAZIO);
  }, [aberto, tarefaId]);

  const invalidarTarefas = [
    CHAVES.tarefas,
    CHAVES.cronograma(projetoId),
    CHAVES.kanban(projetoId),
    CHAVES.dashboardProjeto(projetoId),
    ["dependencias"],
    ["tarefas", "detalhe", tarefaId],
  ];

  const salvar = useMutacao<Record<string, unknown>, Tarefa>({
    metodo: "patch",
    url: () => "/tarefas/" + tarefaId + "/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Tarefa atualizada",
  });

  const criar = useMutacao<Record<string, unknown>, Tarefa>({
    url: "/tarefas/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Tarefa criada",
    aoSucesso: () => onFechar(),
  });

  const excluir = useMutacao<void, unknown>({
    metodo: "delete",
    url: "/tarefas/" + String(tarefaId) + "/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Tarefa excluída",
    aoSucesso: () => onFechar(),
  });

  const duplicar = useMutacao<{ id: number }, Tarefa>({
    url: (valores) => "/tarefas/" + valores.id + "/duplicar/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Tarefa duplicada",
  });

  const atualizarProgresso = useMutacao<{ percentual_conclusao: number }, Tarefa>({
    url: "/tarefas/" + String(tarefaId) + "/progresso/",
    invalidar: invalidarTarefas,
  });

  const adicionarItem = useMutacao<{ texto: string; ordem: number }, ChecklistItem>({
    url: "/tarefas/" + String(tarefaId) + "/checklist/",
    invalidar: invalidarTarefas,
  });

  const alternarItem = useMutacao<{ itemId: number }, unknown>({
    url: (valores) => "/tarefas/" + String(tarefaId) + "/checklist/" + valores.itemId + "/alternar/",
    invalidar: invalidarTarefas,
  });

  const editarItem = useMutacao<{ id: number; texto: string }, ChecklistItem>({
    metodo: "patch",
    url: (valores) => "/checklist/" + valores.id + "/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Item do checklist atualizado",
  });

  const removerItem = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (valores) => "/checklist/" + valores.id + "/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Item do checklist excluído",
  });

  const criarDependencia = useMutacao<Record<string, unknown>, unknown>({
    url: "/tarefas/" + String(tarefaId) + "/dependencias/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Dependência criada",
  });

  const removerDependencia = useMutacao<{ depId: number }, unknown>({
    metodo: "delete",
    url: (valores) => "/tarefas/" + String(tarefaId) + "/dependencias/" + valores.depId + "/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Dependência removida",
  });

  const criarSkill = useMutacao<Record<string, unknown>, unknown>({
    url: "/tarefas/" + String(tarefaId) + "/requisitos-skill/",
    invalidar: invalidarTarefas,
    mensagemSucesso: "Requisito de capacidade adicionado",
  });

  const salvarTudo = async () => {
    const payload: Record<string, unknown> = {
      nome: form.nome.trim(),
      descricao: form.descricao,
      responsavel: form.responsavel ? Number(form.responsavel) : null,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      esforco_estimado: Number(form.esforco_estimado) || 0,
      prioridade: form.prioridade,
      status: form.status,
      parent: form.parent ? Number(form.parent) : null,
      tags: listaDeTexto(form.tags),
    };
    try {
      if (tarefaId) await salvar.mutateAsync(payload);
      else await criar.mutateAsync({ ...payload, project: projetoId });
    } catch (falha) {
      avisarErro("Não foi possível salvar a tarefa", mensagemErro(falha));
    }
  };

  const adicionarChecklist = async () => {
    if (!novoItem.trim()) return;
    try {
      await adicionarItem.mutateAsync({ texto: novoItem.trim(), ordem: (detalhe.data?.checklist?.length || 0) + 1 });
      setNovoItem("");
    } catch (falha) {
      avisarErro("Não foi possível adicionar o item", mensagemErro(falha));
    }
  };

  const salvarItemChecklist = async (itemId: number) => {
    const conteudo = textoItem.trim();
    if (!conteudo) return;
    try {
      await editarItem.mutateAsync({ id: itemId, texto: conteudo });
      setItemEmEdicao(null);
      setTextoItem("");
    } catch (falha) {
      avisarErro("Não foi possível editar o item", mensagemErro(falha));
    }
  };

  const confirmarExclusaoItem = async () => {
    if (!itemExcluindo) return;
    try {
      await removerItem.mutateAsync({ id: itemExcluindo.id });
      setItemExcluindo(null);
    } catch (falha) {
      avisarErro("Não foi possível excluir o item", mensagemErro(falha));
    }
  };

  const adicionarDependencia = async () => {
    if (!novaDependencia.predecessor) {
      avisarErro("Selecione a tarefa predecessora", "A dependência precisa de uma tarefa de origem.");
      return;
    }
    try {
      await criarDependencia.mutateAsync({
        predecessor: Number(novaDependencia.predecessor),
        successor: tarefaId,
        tipo: novaDependencia.tipo,
        lag: Number(novaDependencia.lag) || 0,
      });
      setNovaDependencia({ predecessor: "", tipo: "FS", lag: 0 });
    } catch (falha) {
      avisarErro("Não foi possível criar a dependência", mensagemErro(falha));
    }
  };

  const adicionarSkill = async () => {
    if (!novaSkill.skill) return;
    try {
      await criarSkill.mutateAsync({
        skill: Number(novaSkill.skill),
        nivel_minimo: novaSkill.nivel_minimo,
        peso: novaSkill.peso,
        obrigatorio: novaSkill.obrigatorio,
      });
      setNovaSkill({ skill: "", nivel_minimo: 3, peso: 1, obrigatorio: false });
    } catch (falha) {
      avisarErro("Não foi possível adicionar o requisito", mensagemErro(falha));
    }
  };

  const tarefa = detalhe.data;
  const checklist = tarefa?.checklist ?? [];
  const concluidos = checklist.filter((item) => item.concluido).length;
  const progressoChecklist = checklist.length ? Math.round((concluidos / checklist.length) * 100) : 0;

  return (
    <>
      <PainelLateral
        aberto={aberto}
        onFechar={onFechar}
        largura="lg"
        titulo={tarefaId ? "Editar tarefa" : "Nova tarefa"}
        subtitulo={tarefa ? (tarefa.wbs ? tarefa.wbs + " · " + tarefa.status : tarefa.nome) : "Preencha os dados da tarefa"}
        rodape={
          <>
            {tarefaId && pode("tarefa.excluir") && (
              <Botao variante="perigo" icone={Trash2} onClick={() => setConfirmando(true)}>
                Excluir
              </Botao>
            )}
            {tarefaId && pode("tarefa.criar") && (
              <Botao variante="secundario" icone={Copy} onClick={() => setDuplicando(true)}>
                Duplicar
              </Botao>
            )}
            <Botao variante="fantasma" onClick={onFechar}>
              Fechar
            </Botao>
            <Botao variante="primario" icone={Save} onClick={salvarTudo} carregando={salvar.isPending || criar.isPending}>
              {tarefaId ? "Salvar" : "Criar tarefa"}
            </Botao>
          </>
        }
      >
        {tarefaId && detalhe.isLoading ? (
          <CarregandoBloco rotulo="Carregando tarefa..." />
        ) : (
          <div className="space-y-4">
            <Campo rotulo="Nome" obrigatorio htmlFor="tarefa-nome">
              <Entrada id="tarefa-nome" value={form.nome} onChange={(evento) => setForm({ ...form, nome: evento.target.value })} />
            </Campo>

            <Campo rotulo="Descrição" htmlFor="tarefa-descricao">
              <AreaTexto
                id="tarefa-descricao"
                rows={2}
                value={form.descricao}
                onChange={(evento) => setForm({ ...form, descricao: evento.target.value })}
              />
            </Campo>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Responsável" htmlFor="tarefa-responsavel">
                <Selecao
                  id="tarefa-responsavel"
                  value={form.responsavel}
                  onChange={(evento) => setForm({ ...form, responsavel: evento.target.value })}
                >
                  <option value="">Sem responsável</option>
                  {pessoas.map((pessoa) => (
                    <option key={pessoa.id} value={String(pessoa.id)}>
                      {pessoa.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Tarefa pai" htmlFor="tarefa-parent">
                <Selecao id="tarefa-parent" value={form.parent} onChange={(evento) => setForm({ ...form, parent: evento.target.value })}>
                  <option value="">Sem tarefa pai</option>
                  {opcoes
                    .filter((opcao) => opcao.id !== tarefaId)
                    .map((opcao) => (
                      <option key={opcao.id} value={String(opcao.id)}>
                        {opcao.nome}
                      </option>
                    ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Início" htmlFor="tarefa-inicio">
                <Entrada
                  id="tarefa-inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={(evento) => setForm({ ...form, data_inicio: evento.target.value })}
                />
              </Campo>
              <Campo rotulo="Fim" htmlFor="tarefa-fim">
                <Entrada
                  id="tarefa-fim"
                  type="date"
                  value={form.data_fim}
                  onChange={(evento) => setForm({ ...form, data_fim: evento.target.value })}
                />
              </Campo>
              <Campo rotulo="Esforço estimado (h)" htmlFor="tarefa-esforco">
                <Entrada
                  id="tarefa-esforco"
                  type="number"
                  min={0}
                  step={1}
                  value={form.esforco_estimado}
                  onChange={(evento) => setForm({ ...form, esforco_estimado: evento.target.value })}
                />
              </Campo>
              <Campo rotulo="Prioridade" htmlFor="tarefa-prioridade">
                <Selecao
                  id="tarefa-prioridade"
                  value={form.prioridade}
                  onChange={(evento) => setForm({ ...form, prioridade: evento.target.value as Prioridade })}
                >
                  {OPCOES_PRIORIDADE.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Status" htmlFor="tarefa-status">
                <Selecao
                  id="tarefa-status"
                  value={form.status}
                  onChange={(evento) => setForm({ ...form, status: evento.target.value as StatusTarefa })}
                >
                  {OPCOES_STATUS_TAREFA.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Progresso" htmlFor="tarefa-progresso">
                <ControleDeslizante
                  valor={form.percentual_conclusao}
                  onChange={(valor) => {
                    setForm({ ...form, percentual_conclusao: valor });
                    if (tarefaId) atualizarProgresso.mutate({ percentual_conclusao: valor });
                  }}
                  min={0}
                  max={100}
                  passo={5}
                  rotulo="Percentual de conclusão"
                  marcos={[0, 25, 50, 75, 100]}
                />
              </Campo>
            </div>

            <CampoEtiquetas
              id="tarefa-etiquetas"
              valor={form.tags}
              onChange={(valor) => setForm({ ...form, tags: valor })}
              sugestoes={sugestoesEtiquetas}
            />

            {tarefaId && (
              <>
                <SecaoColapsavel titulo="Checklist" icone={ListChecks} contagem={checklist.length} abertoInicial>
                  <div className="space-y-2">
                    <BarraProgresso valor={progressoChecklist} altura="sm" rotulo="Itens concluídos" mostrarValor />
                    <div className="flex gap-2">
                      <Entrada
                        value={novoItem}
                        onChange={(evento) => setNovoItem(evento.target.value)}
                        placeholder="Novo item do checklist"
                        aria-label="Novo item do checklist"
                        onKeyDown={(evento) => {
                          if (evento.key === "Enter") adicionarChecklist();
                        }}
                      />
                      <Botao variante="secundario" icone={Plus} onClick={adicionarChecklist} carregando={adicionarItem.isPending}>
                        Adicionar
                      </Botao>
                    </div>
                    {checklist.length === 0 ? (
                      <p className="text-2xs text-fg-subtle">Nenhum item no checklist.</p>
                    ) : (
                      <ul className="space-y-1">
                        {checklist.map((item) => (
                          <li key={item.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => alternarItem.mutate({ itemId: item.id })}
                              className={
                                "grid size-4.5 shrink-0 place-items-center rounded border transition-colors " +
                                (item.concluido ? "border-success bg-success text-white" : "border-border-strong hover:bg-surface-3")
                              }
                              aria-label={item.concluido ? "Reabrir item" : "Concluir item"}
                            >
                              {item.concluido && <Check className="size-3" aria-hidden />}
                            </button>

                            {itemEmEdicao === item.id ? (
                              <>
                                <Entrada
                                  value={textoItem}
                                  autoFocus
                                  aria-label="Editar texto do item do checklist"
                                  onChange={(evento) => setTextoItem(evento.target.value)}
                                  onKeyDown={(evento) => {
                                    if (evento.key === "Enter") salvarItemChecklist(item.id);
                                    if (evento.key === "Escape") setItemEmEdicao(null);
                                  }}
                                  className="h-7 min-w-0 flex-1 px-2 py-0 text-xs"
                                />
                                <Botao
                                  variante="sucesso"
                                  tamanho="xs"
                                  icone={Check}
                                  carregando={editarItem.isPending}
                                  disabled={!textoItem.trim()}
                                  onClick={() => salvarItemChecklist(item.id)}
                                >
                                  Salvar
                                </Botao>
                                <Botao variante="fantasma" tamanho="xs" onClick={() => setItemEmEdicao(null)}>
                                  Cancelar
                                </Botao>
                              </>
                            ) : (
                              <>
                                <span className={"flex-1 text-xs " + (item.concluido ? "text-fg-subtle line-through" : "text-fg")}>
                                  {item.texto}
                                </span>
                                {podeEditarChecklist && (
                                  <>
                                    <Dica texto="Editar texto do item">
                                      <BotaoIcone
                                        icone={Pencil}
                                        rotulo="Editar item do checklist"
                                        tamanho="xs"
                                        onClick={() => {
                                          setItemEmEdicao(item.id);
                                          setTextoItem(item.texto);
                                        }}
                                      />
                                    </Dica>
                                    <Dica texto="Excluir item do checklist">
                                      <BotaoIcone
                                        icone={Trash2}
                                        rotulo="Excluir item do checklist"
                                        tamanho="xs"
                                        className="hover:text-danger"
                                        onClick={() => setItemExcluindo(item)}
                                      />
                                    </Dica>
                                  </>
                                )}
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </SecaoColapsavel>

                <SecaoColapsavel
                  titulo="Requisitos de capacidade"
                  icone={Sparkles}
                  contagem={(tarefa?.requisitos_skill ?? []).length}
                  abertoInicial={false}
                >
                  <div className="space-y-2">
                    {(tarefa?.requisitos_skill ?? []).length === 0 ? (
                      <p className="text-2xs text-fg-subtle">Nenhum requisito de skill vinculado à tarefa.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(tarefa?.requisitos_skill ?? []).map((requisito) => (
                          <Etiqueta key={requisito.id} cor={requisito.skill_cor || "#8B5CF6"} icone={Sparkles}>
                            {requisito.skill_nome} ≥ N{requisito.nivel_minimo}
                            {requisito.obrigatorio ? " (obrigatório)" : ""}
                          </Etiqueta>
                        ))}
                      </div>
                    )}
                    <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                      <Selecao
                        value={novaSkill.skill}
                        onChange={(evento) => setNovaSkill({ ...novaSkill, skill: evento.target.value })}
                        aria-label="Capacidade"
                      >
                        <option value="">Selecione a capacidade</option>
                        {skills.data?.map((skill) => (
                          <option key={skill.id} value={String(skill.id)}>
                            {skill.nome}
                          </option>
                        ))}
                      </Selecao>
                      <Selecao
                        value={String(novaSkill.nivel_minimo)}
                        onChange={(evento) => setNovaSkill({ ...novaSkill, nivel_minimo: Number(evento.target.value) })}
                        aria-label="Nível mínimo"
                      >
                        {[1, 2, 3, 4, 5].map((nivel) => (
                          <option key={nivel} value={String(nivel)}>
                            Nível {nivel}
                          </option>
                        ))}
                      </Selecao>
                      <Botao variante="secundario" icone={Plus} onClick={adicionarSkill} carregando={criarSkill.isPending}>
                        Vincular
                      </Botao>
                    </div>
                  </div>
                </SecaoColapsavel>

                <SecaoColapsavel
                  titulo="Dependências"
                  icone={Link2}
                  contagem={(predecessoras.data?.length || 0) + (sucessoras.data?.length || 0)}
                  abertoInicial={false}
                >
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Predecessoras</p>
                      {(predecessoras.data ?? []).length === 0 ? (
                        <p className="text-2xs text-fg-subtle">Nenhuma tarefa precisa terminar antes desta.</p>
                      ) : (
                        <ul className="space-y-1">
                          {(predecessoras.data ?? []).map((dependencia) => (
                            <li key={dependencia.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2 py-1.5">
                              <Link2 className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                              <span className="min-w-0 flex-1 truncate text-xs text-fg">
                                {dependencia.predecessor_nome || "Tarefa " + dependencia.predecessor}
                              </span>
                              <Etiqueta tom="neutral">{dependencia.tipo}</Etiqueta>
                              <Botao
                                tamanho="xs"
                                variante="fantasma"
                                icone={Trash2}
                                className="text-danger"
                                onClick={() => removerDependencia.mutate({ depId: dependencia.id })}
                                aria-label="Remover dependência"
                              >
                                Remover
                              </Botao>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Sucessoras</p>
                      {(sucessoras.data ?? []).length === 0 ? (
                        <p className="text-2xs text-fg-subtle">Nenhuma tarefa depende desta.</p>
                      ) : (
                        <ul className="space-y-1">
                          {(sucessoras.data ?? []).map((dependencia) => (
                            <li key={dependencia.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2 py-1.5">
                              <Link2 className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                              <span className="min-w-0 flex-1 truncate text-xs text-fg">
                                {dependencia.successor_nome || "Tarefa " + dependencia.successor}
                              </span>
                              <Etiqueta tom="neutral">{dependencia.tipo}</Etiqueta>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_100px_90px_auto]">
                      <Selecao
                        value={novaDependencia.predecessor}
                        onChange={(evento) => setNovaDependencia({ ...novaDependencia, predecessor: evento.target.value })}
                        aria-label="Tarefa predecessora"
                      >
                        <option value="">Predecessora...</option>
                        {opcoes
                          .filter((opcao) => opcao.id !== tarefaId)
                          .map((opcao) => (
                            <option key={opcao.id} value={String(opcao.id)}>
                              {opcao.nome}
                            </option>
                          ))}
                      </Selecao>
                      <Selecao
                        value={novaDependencia.tipo}
                        onChange={(evento) => setNovaDependencia({ ...novaDependencia, tipo: evento.target.value })}
                        aria-label="Tipo de dependência"
                      >
                        <option value="FS">FS</option>
                        <option value="SS">SS</option>
                        <option value="FF">FF</option>
                        <option value="SF">SF</option>
                      </Selecao>
                      <Entrada
                        type="number"
                        min={0}
                        value={novaDependencia.lag}
                        onChange={(evento) => setNovaDependencia({ ...novaDependencia, lag: Number(evento.target.value) })}
                        aria-label="Folga em dias"
                      />
                      <Botao variante="secundario" icone={Plus} onClick={adicionarDependencia} carregando={criarDependencia.isPending}>
                        Criar
                      </Botao>
                    </div>
                  </div>
                </SecaoColapsavel>

                <SecaoColapsavel titulo="Anexos" icone={Paperclip} abertoInicial={false}>
                  <ListaAnexos
                    entidade="tasks.task"
                    objetoId={tarefaId}
                    chaveInvalidar={["tarefas", "detalhe", tarefaId]}
                    compacto
                  />
                </SecaoColapsavel>
              </>
            )}
          </div>
        )}
      </PainelLateral>

      <Modal
        aberto={confirmando}
        onFechar={() => setConfirmando(false)}
        titulo="Excluir tarefa"
        subtitulo="Subtarefas e dependências vinculadas também serão removidas."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setConfirmando(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={async () => {
                try {
                  await excluir.mutateAsync();
                  sucesso("Tarefa excluída");
                  setConfirmando(false);
                } catch (falha) {
                  avisarErro("Não foi possível excluir", mensagemErro(falha));
                }
              }}
            >
              Excluir tarefa
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">Confirma a exclusão da tarefa selecionada?</p>
      </Modal>

      <Modal
        aberto={duplicando}
        onFechar={() => setDuplicando(false)}
        titulo="Duplicar tarefa"
        subtitulo="A cópia entra no cronograma como uma nova tarefa."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setDuplicando(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Copy}
              carregando={duplicar.isPending}
              onClick={async () => {
                if (!tarefaId) return;
                try {
                  await duplicar.mutateAsync({ id: tarefaId });
                  setDuplicando(false);
                } catch (falha) {
                  avisarErro("Não foi possível duplicar", mensagemErro(falha));
                }
              }}
            >
              Duplicar tarefa
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          A cópia de <strong>{tarefa?.nome}</strong> reproduz descrição, responsável, datas, esforço, prioridade, cor e
          etiquetas, além do checklist e dos requisitos de capacidade. Ela nasce com o status A fazer e não copia
          dependências nem horas apontadas.
        </p>
      </Modal>

      <Modal
        aberto={itemExcluindo !== null}
        onFechar={() => setItemExcluindo(null)}
        titulo="Excluir item do checklist"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setItemExcluindo(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} carregando={removerItem.isPending} onClick={confirmarExclusaoItem}>
              Excluir item
            </Botao>
          </>
        }
      >
        <p className="text-xs text-fg-muted">
          O item <strong className="text-fg">{itemExcluindo ? itemExcluindo.texto : ""}</strong> será removido do checklist desta tarefa.
        </p>
      </Modal>
    </>
  );
}

export interface FormEdicaoProjeto {
  nome: string;
  descricao: string;
  objetivo: string;
  status: string;
  prioridade: string;
  criticidade: string;
  manager: string;
  sponsor: string;
  data_inicio: string;
  data_fim: string;
  orcamento: string;
}

/* ==========================================================================
   Painel lateral de edicao do projeto (acao Editar do cabecalho)
   ========================================================================== */

export function PainelEditarProjeto({
  aberto,
  onFechar,
  projeto,
  formEditar,
  setFormEditar,
  gerentes,
  aoSalvar,
  salvando,
}: {
  aberto: boolean;
  onFechar: () => void;
  projeto: Projeto;
  formEditar: FormEdicaoProjeto;
  setFormEditar: (valores: FormEdicaoProjeto) => void;
  gerentes: Array<{ id: number; nome: string }>;
  aoSalvar: () => void;
  salvando: boolean;
}) {
  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      titulo="Editar projeto"
      subtitulo={projeto.codigo}
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" icone={Save} onClick={aoSalvar} carregando={salvando}>
            Salvar alterações
          </Botao>
        </>
      }
    >
      <div className="space-y-3">
        <Campo rotulo="Nome" obrigatorio htmlFor="editar-nome">
          <Entrada
            id="editar-nome"
            value={formEditar.nome}
            onChange={(evento) => setFormEditar({ ...formEditar, nome: evento.target.value })}
          />
        </Campo>
        <Campo rotulo="Descrição" htmlFor="editar-descricao">
          <AreaTexto
            id="editar-descricao"
            rows={3}
            value={formEditar.descricao}
            onChange={(evento) => setFormEditar({ ...formEditar, descricao: evento.target.value })}
          />
        </Campo>
        <Campo rotulo="Objetivo" htmlFor="editar-objetivo">
          <AreaTexto
            id="editar-objetivo"
            rows={3}
            value={formEditar.objetivo}
            onChange={(evento) => setFormEditar({ ...formEditar, objetivo: evento.target.value })}
          />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Status" htmlFor="editar-status">
            <Selecao
              id="editar-status"
              value={formEditar.status}
              onChange={(evento) => setFormEditar({ ...formEditar, status: evento.target.value })}
            >
              {Object.keys(ROTULOS_STATUS_PROJETO).map((chave) => (
                <option key={chave} value={chave}>
                  {ROTULOS_STATUS_PROJETO[chave]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Prioridade" htmlFor="editar-prioridade">
            <Selecao
              id="editar-prioridade"
              value={formEditar.prioridade}
              onChange={(evento) => setFormEditar({ ...formEditar, prioridade: evento.target.value })}
            >
              {OPCOES_PRIORIDADE.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Gerente" htmlFor="editar-gerente">
            <Selecao
              id="editar-gerente"
              value={formEditar.manager}
              onChange={(evento) => setFormEditar({ ...formEditar, manager: evento.target.value })}
            >
              <option value="">Sem gerente</option>
              {gerentes.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Patrocinador" htmlFor="editar-sponsor">
            <Selecao
              id="editar-sponsor"
              value={formEditar.sponsor}
              onChange={(evento) => setFormEditar({ ...formEditar, sponsor: evento.target.value })}
            >
              <option value="">Sem patrocinador</option>
              {gerentes.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Início" htmlFor="editar-inicio">
            <Entrada
              id="editar-inicio"
              type="date"
              value={formEditar.data_inicio}
              onChange={(evento) => setFormEditar({ ...formEditar, data_inicio: evento.target.value })}
            />
          </Campo>
          <Campo rotulo="Fim" htmlFor="editar-fim">
            <Entrada
              id="editar-fim"
              type="date"
              value={formEditar.data_fim}
              onChange={(evento) => setFormEditar({ ...formEditar, data_fim: evento.target.value })}
            />
          </Campo>
        </div>
        <Campo rotulo="Orçamento (R$)" htmlFor="editar-orcamento">
          <Entrada
            id="editar-orcamento"
            type="number"
            min={0}
            step={1000}
            value={formEditar.orcamento}
            onChange={(evento) => setFormEditar({ ...formEditar, orcamento: evento.target.value })}
          />
        </Campo>
      </div>
    </PainelLateral>
  );
}

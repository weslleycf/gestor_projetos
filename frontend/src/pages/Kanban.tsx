import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Eye,
  Flame,
  FolderKanban,
  GripVertical,
  Hourglass,
  Layers,
  LayoutGrid,
  ListChecks,
  Lock,
  MessageSquare,
  Paperclip,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserPlus,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  AreaTexto,
  Avatar,
  BarraProgresso,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  ControleDeslizante,
  Dica,
  Entrada,
  EntradaBusca,
  Esqueleto,
  Etiqueta,
  Interruptor,
  Modal,
  PainelLateral,
  PilhaAvatares,
  SecaoColapsavel,
  Selecao,
  Vazio,
  CORES_PRIORIDADE,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataRelativa, horas as formatarHoras, numero } from "@/lib/format";
import { ListaComentarios } from "@/components/comentarios";
import { ListaAnexos } from "@/components/anexos";
import { useAuth } from "@/store/auth";
import type { ChecklistItem, Comentario, ProjetoResumo, Skill, StatusTarefa, Tarefa, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Metadados de status
   ========================================================================== */

interface MetaStatus {
  valor: StatusTarefa;
  rotulo: string;
  cor: string;
  icone: LucideIcon;
}

const STATUS_TAREFA: MetaStatus[] = [
  { valor: "BACKLOG", rotulo: "Backlog", cor: "#64748B", icone: Layers },
  { valor: "A_FAZER", rotulo: "A fazer", cor: "#0891B2", icone: Circle },
  { valor: "EM_ANDAMENTO", rotulo: "Em andamento", cor: "#2563EB", icone: Play },
  { valor: "EM_REVISAO", rotulo: "Em revisão", cor: "#7C3AED", icone: Eye },
  { valor: "BLOQUEADA", rotulo: "Bloqueada", cor: "#DC2626", icone: Lock },
  { valor: "CONCLUIDA", rotulo: "Concluída", cor: "#059669", icone: CheckCircle2 },
  { valor: "CANCELADA", rotulo: "Cancelada", cor: "#94A3B8", icone: XCircle },
];

const LIMITE_WIP: Partial<Record<StatusTarefa, number>> = {
  EM_ANDAMENTO: 5,
  EM_REVISAO: 3,
  BLOQUEADA: 3,
};

const ROTULO_PRIORIDADE: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

function metaStatus(valor: StatusTarefa): MetaStatus {
  return STATUS_TAREFA.find((s) => s.valor === valor) || STATUS_TAREFA[1];
}

/* ==========================================================================
   Etiquetas da tarefa
   ========================================================================== */

/** Converte listas digitadas (vírgula, ponto e vírgula ou linha) em array de texto. */
function listaDeTexto(valor: string) {
  return valor
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Texto livre que vira lista, com sugestões das etiquetas já usadas nas tarefas carregadas. */
function CampoEtiquetas({
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
      dica="Separe por vírgula, ponto e vírgula ou linha. As sugestões vêm das etiquetas já usadas nas tarefas."
      htmlFor={id}
    >
      <Entrada
        id={id}
        list={id + "-sugestoes"}
        value={valor}
        placeholder="fornecedor, infraestrutura, contrato"
        onChange={(e) => onChange(e.target.value)}
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

/* ==========================================================================
   Contratos da API
   ========================================================================== */

interface ColunaResposta {
  status: StatusTarefa;
  rotulo: string;
  total: number;
  wip_excedido: boolean;
  tarefas: Tarefa[];
}

interface RespostaKanban {
  projeto: number | null;
  colunas: ColunaResposta[];
  total: number;
  atrasadas: number;
}

interface TarefaDetalhe extends Tarefa {
  responsaveis_auxiliares?: number[];
  atualizado_em?: string;
  desvio_prazo_dias?: number | null;
}

/* ==========================================================================
   Cache otimista
   ========================================================================== */

function moverNoCache(
  dados: RespostaKanban | undefined,
  id: number,
  status: StatusTarefa,
  posicao: number
): RespostaKanban | undefined {
  if (!dados) return dados;
  const original = dados.colunas.flatMap((c) => c.tarefas).find((t) => t.id === id);
  if (!original) return dados;
  const movida: Tarefa = {
    ...original,
    status,
    posicao_visual: posicao,
    percentual_conclusao: status === "CONCLUIDA" ? 100 : original.percentual_conclusao,
  };
  const colunas = dados.colunas.map((coluna) => {
    if (coluna.status === status) {
      const lista = coluna.tarefas.filter((t) => t.id !== id).concat(movida);
      lista.sort((a, b) => (a.posicao_visual ?? 0) - (b.posicao_visual ?? 0));
      return { ...coluna, tarefas: lista, total: lista.length };
    }
    const restante = coluna.tarefas.filter((t) => t.id !== id);
    return { ...coluna, tarefas: restante, total: restante.length };
  });
  return { ...dados, colunas };
}

function calcularPosicao(lista: Tarefa[], idMovido: number, idSobre: number | null): number {
  const uteis = lista.filter((t) => t.id !== idMovido);
  if (!uteis.length) return 1000;
  if (idSobre === null) {
    const ultimo = uteis[uteis.length - 1];
    return (ultimo.posicao_visual ?? 1000) + 50;
  }
  const indice = uteis.findIndex((t) => t.id === idSobre);
  if (indice < 0) {
    const ultimo = uteis[uteis.length - 1];
    return (ultimo.posicao_visual ?? 1000) + 50;
  }
  const anterior = uteis[indice - 1];
  const posterior = uteis[indice];
  if (!anterior) return (posterior.posicao_visual ?? 1000) - 50;
  if (!posterior) return (anterior.posicao_visual ?? 1000) + 50;
  return ((anterior.posicao_visual ?? 0) + (posterior.posicao_visual ?? 0)) / 2;
}

/* ==========================================================================
   Card do Kanban
   ========================================================================== */

function CardKanban({
  tarefa,
  coluna,
  projeto,
  checklist,
  auxiliares,
  arrastando,
  aoAbrir,
  aoMover,
  compacto,
  overlay,
}: {
  tarefa: Tarefa;
  coluna: StatusTarefa;
  projeto?: ProjetoResumo;
  checklist: { total: number; concluidos: number };
  auxiliares: UsuarioResumo[];
  arrastando: boolean;
  aoAbrir?: (t: Tarefa) => void;
  aoMover?: (id: number, status: StatusTarefa) => void;
  compacto?: boolean;
  overlay?: boolean;
}) {
  const id = "tarefa:" + tarefa.id;
  const dados = { tarefa, status: coluna };
  const arrastavel = useDraggable({ id, data: dados });
  const soltavel = useDroppable({ id, data: dados });
  const cor = tarefa.cor || projeto?.cor || "#2563EB";
  const percentualChecklist = checklist.total ? Math.round((checklist.concluidos / checklist.total) * 100) : 0;

  const juntarRef = (no: HTMLElement | null) => {
    arrastavel.setNodeRef(no);
    soltavel.setNodeRef(no);
  };

  return (
    <article
      ref={overlay ? undefined : juntarRef}
      style={{
        transform: overlay ? undefined : CSS.Translate.toString(arrastavel.transform),
        touchAction: "none",
        opacity: arrastando && !overlay ? 0.35 : 1,
        borderLeftColor: cor,
      }}
      // shrink-0 é essencial: sem ele os cards encolhem para caber na altura
      // máxima da coluna (o overflow-hidden zera o tamanho mínimo automático de
      // um item flexível) e o texto acaba cortado.
      className={
        "group relative shrink-0 overflow-hidden rounded-sgp border border-border border-l-4 bg-surface p-2.5 shadow-n1 transition-shadow " +
        (overlay ? "w-[280px] rotate-2 shadow-n3 " : "hover:border-border-strong hover:shadow-n2 ") +
        (soltavel.isOver && !overlay ? "ring-2 ring-brand" : "")
      }
      {...(overlay ? {} : arrastavel.attributes)}
      {...(overlay || !arrastavel.listeners ? {} : arrastavel.listeners)}
      onClick={() => aoAbrir?.(tarefa)}
      onKeyDown={(e) => {
        if (e.key === "Enter") aoAbrir?.(tarefa);
      }}
      tabIndex={0}
      role="button"
      aria-label={"Abrir tarefa " + tarefa.nome}
    >
      <header className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 size-3.5 shrink-0 cursor-grab text-fg-subtle" aria-hidden />
        <h3 className="min-w-0 flex-1 text-xs font-semibold leading-snug text-fg">{tarefa.nome}</h3>
        {tarefa.status === "BLOQUEADA" && (
          <span title="Tarefa bloqueada" className="shrink-0 text-danger">
            <Lock className="size-3.5" aria-hidden />
          </span>
        )}
      </header>

      <p className="mt-1 flex flex-wrap items-center gap-1.5 pl-5 text-2xs text-fg-muted">
        <span className="inline-flex items-center gap-1 font-medium" style={{ color: cor }}>
          <FolderKanban className="size-3" aria-hidden />
          {projeto ? projeto.codigo : "PRJ-" + tarefa.project}
        </span>
        {tarefa.data_fim && (
          <span className={"inline-flex items-center gap-1 " + (tarefa.atrasada ? "font-semibold text-danger" : "")}>
            <CalendarDays className="size-3" aria-hidden />
            {dataCurta(tarefa.data_fim)}
          </span>
        )}
        {Number(tarefa.esforco_estimado) > 0 && (
          <span className="inline-flex items-center gap-1">
            <Hourglass className="size-3" aria-hidden />
            {formatarHoras(Number(tarefa.esforco_estimado))}
          </span>
        )}
      </p>

      {tarefa.atrasada && (
        <p className="mt-1.5 pl-5">
          <Etiqueta tom="danger" icone={AlertTriangle}>
            atrasada
          </Etiqueta>
        </p>
      )}

      {(tarefa.tags || []).length > 0 && (
        <p className="mt-1.5 flex flex-wrap items-center gap-1 pl-5">
          {(tarefa.tags || []).slice(0, 3).map((tag) => (
            <Etiqueta key={tag} tom="neutral">
              {tag}
            </Etiqueta>
          ))}
          {(tarefa.tags || []).length > 3 && (
            <span className="text-2xs text-fg-subtle">+{tarefa.tags.length - 3}</span>
          )}
        </p>
      )}

      {!compacto && checklist.total > 0 && (
        <div className="mt-2 pl-5">
          <div className="mb-1 flex items-center justify-between text-2xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-3" aria-hidden />
              Checklist
            </span>
            <span className="font-semibold tabular-nums">
              {checklist.concluidos}/{checklist.total}
            </span>
          </div>
          <BarraProgresso valor={percentualChecklist} cor="#0891B2" altura="sm" />
        </div>
      )}

      <footer className="mt-2 flex items-center justify-between gap-2 pl-5">
        <div className="flex min-w-0 items-center gap-1.5">
          {tarefa.responsavel_detalhe ? (
            <Avatar
              nome={tarefa.responsavel_detalhe.nome}
              cor={tarefa.responsavel_detalhe.cor}
              iniciais={tarefa.responsavel_detalhe.iniciais}
              url={tarefa.responsavel_detalhe.avatar_display}
              tamanho="xs"
              titulo={"Responsável: " + tarefa.responsavel_detalhe.nome}
            />
          ) : (
            <span className="inline-grid size-5 place-items-center rounded-full bg-surface-3 text-[9px] font-bold text-fg-subtle" title="Sem responsável">
              ?
            </span>
          )}
          {auxiliares.length > 0 && (
            <PilhaAvatares
              pessoas={auxiliares.map((u) => ({ id: u.id, nome: u.nome, cor: u.cor, iniciais: u.iniciais, avatar_display: u.avatar_display }))}
              maximo={3}
              tamanho="xs"
            />
          )}
          <Etiqueta tom={CORES_PRIORIDADE[tarefa.prioridade]}>{ROTULO_PRIORIDADE[tarefa.prioridade] || tarefa.prioridade}</Etiqueta>
          {tarefa.critica && (
            <span title="Caminho crítico" className="text-danger">
              <Flame className="size-3.5" aria-hidden />
            </span>
          )}
        </div>
        <span className="shrink-0 text-2xs font-semibold tabular-nums text-fg-muted">{tarefa.percentual_conclusao}%</span>
      </footer>

      {!overlay && aoMover && (
        <div className="mt-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <label className="sr-only" htmlFor={"mover-" + tarefa.id}>
            Mover tarefa para outro status
          </label>
          <Selecao
            id={"mover-" + tarefa.id}
            value={tarefa.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => aoMover(tarefa.id, e.target.value as StatusTarefa)}
            className="h-7 py-0 text-2xs"
          >
            {STATUS_TAREFA.map((s) => (
              <option key={s.valor} value={s.valor}>
                Mover para {s.rotulo}
              </option>
            ))}
          </Selecao>
        </div>
      )}
    </article>
  );
}

/* ==========================================================================
   Coluna do Kanban
   ========================================================================== */

function ColunaKanban({
  coluna,
  projeto,
  checklistPorTarefa,
  auxiliaresPorTarefa,
  arrastando,
  podeCriar,
  aoAbrir,
  aoMover,
  aoCriar,
}: {
  coluna: ColunaResposta;
  projeto?: ProjetoResumo;
  checklistPorTarefa: Record<number, { total: number; concluidos: number }>;
  auxiliaresPorTarefa: Record<number, UsuarioResumo[]>;
  arrastando: number | null;
  podeCriar: boolean;
  aoAbrir: (t: Tarefa) => void;
  aoMover: (id: number, status: StatusTarefa) => void;
  aoCriar: (status: StatusTarefa) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "coluna:" + coluna.status, data: { status: coluna.status } });
  const meta = metaStatus(coluna.status);
  const limite = LIMITE_WIP[coluna.status];
  const excedido = limite !== undefined && coluna.tarefas.length > limite;
  const esforco = coluna.tarefas.reduce((a, t) => a + Number(t.esforco_estimado || 0), 0);

  return (
    <section
      ref={setNodeRef}
      className={
        "flex w-[290px] shrink-0 flex-col rounded-sgp-lg border bg-surface-2 transition-colors " +
        (isOver ? "border-brand bg-brand-soft/30" : "border-border")
      }
      aria-label={"Coluna " + coluna.rotulo}
    >
      <header className="rounded-t-sgp-lg border-b border-border px-3 py-2" style={{ borderTop: "3px solid " + meta.cor }}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-fg">
            <meta.icone className="size-3.5" style={{ color: meta.cor }} aria-hidden />
            {coluna.rotulo}
          </span>
          <span className="flex items-center gap-1">
            {podeCriar && (
              <Dica texto={"Nova tarefa em " + coluna.rotulo}>
                <BotaoIcone
                  icone={Plus}
                  rotulo={"Nova tarefa em " + coluna.rotulo}
                  tamanho="xs"
                  variante="fantasma"
                  onClick={() => aoCriar(coluna.status)}
                />
              </Dica>
            )}
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs font-bold tabular-nums text-fg-muted">{coluna.tarefas.length}</span>
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-2xs text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {formatarHoras(esforco)}
          </span>
          {limite !== undefined && (
            <span className={excedido ? "font-bold text-danger" : ""}>
              WIP {coluna.tarefas.length}/{limite}
            </span>
          )}
        </div>
      </header>

      {excedido && (
        <div className="border-b border-danger/30 bg-danger-soft/40 px-2.5 py-1.5 text-2xs font-semibold text-danger">
          Limite de WIP excedido nesta etapa. Conclua itens antes de puxar novos.
        </div>
      )}

      <div className="flex max-h-[62vh] min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 scroll-thin">
        {coluna.tarefas.length === 0 ? (
          <p className="grid flex-1 place-items-center py-6 text-center text-2xs text-fg-subtle">Solte um card aqui</p>
        ) : (
          coluna.tarefas.map((t) => (
            <CardKanban
              key={t.id}
              tarefa={t}
              coluna={coluna.status}
              projeto={projeto}
              checklist={checklistPorTarefa[t.id] || { total: 0, concluidos: 0 }}
              auxiliares={auxiliaresPorTarefa[t.id] || []}
              arrastando={arrastando === t.id}
              aoAbrir={aoAbrir}
              aoMover={aoMover}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ==========================================================================
   Painel de detalhe e edição
   ========================================================================== */

interface FormularioTarefa {
  nome: string;
  descricao: string;
  responsavel: string;
  data_inicio: string;
  data_fim: string;
  esforco_estimado: string;
  prioridade: string;
  status: StatusTarefa;
  percentual_conclusao: number;
  tags: string;
}

/** Campos da tarefa compartilhados pelo painel de edição e pelo de criação. */
function CamposTarefa({
  formulario,
  definirFormulario,
  usuarios,
  sugestoesEtiquetas,
  prefixo = "tarefa",
  aoMudarStatus,
}: {
  formulario: FormularioTarefa;
  definirFormulario: (valor: FormularioTarefa) => void;
  usuarios: UsuarioResumo[];
  sugestoesEtiquetas: string[];
  prefixo?: string;
  aoMudarStatus?: (status: StatusTarefa) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome" obrigatorio htmlFor={prefixo + "-nome"} className="sm:col-span-2">
          <Entrada
            id={prefixo + "-nome"}
            value={formulario.nome}
            onChange={(e) => definirFormulario({ ...formulario, nome: e.target.value })}
          />
        </Campo>
        <Campo rotulo="Descrição" htmlFor={prefixo + "-descricao"} className="sm:col-span-2">
          <AreaTexto
            id={prefixo + "-descricao"}
            rows={3}
            value={formulario.descricao}
            onChange={(e) => definirFormulario({ ...formulario, descricao: e.target.value })}
          />
        </Campo>
        <Campo rotulo="Responsável" htmlFor={prefixo + "-responsavel"}>
          <Selecao
            id={prefixo + "-responsavel"}
            value={formulario.responsavel}
            onChange={(e) => definirFormulario({ ...formulario, responsavel: e.target.value })}
          >
            <option value="">Sem responsável</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome} — {u.cargo}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Prioridade" htmlFor={prefixo + "-prioridade"}>
          <Selecao
            id={prefixo + "-prioridade"}
            value={formulario.prioridade}
            onChange={(e) => definirFormulario({ ...formulario, prioridade: e.target.value })}
          >
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Início" htmlFor={prefixo + "-inicio"}>
          <Entrada
            id={prefixo + "-inicio"}
            type="date"
            value={formulario.data_inicio}
            onChange={(e) => definirFormulario({ ...formulario, data_inicio: e.target.value })}
          />
        </Campo>
        <Campo rotulo="Fim" htmlFor={prefixo + "-fim"}>
          <Entrada
            id={prefixo + "-fim"}
            type="date"
            value={formulario.data_fim}
            onChange={(e) => definirFormulario({ ...formulario, data_fim: e.target.value })}
          />
        </Campo>
        <Campo rotulo="Esforço estimado (h)" htmlFor={prefixo + "-esforco"}>
          <Entrada
            id={prefixo + "-esforco"}
            type="number"
            min={0}
            step={0.5}
            value={formulario.esforco_estimado}
            onChange={(e) => definirFormulario({ ...formulario, esforco_estimado: e.target.value })}
          />
        </Campo>
        <Campo
          rotulo="Status"
          htmlFor={prefixo + "-status"}
          dica={aoMudarStatus ? "Alterar o status também reposiciona o card no quadro." : "A tarefa entra na coluna deste status."}
        >
          <Selecao
            id={prefixo + "-status"}
            value={formulario.status}
            onChange={(e) => {
              const novo = e.target.value as StatusTarefa;
              definirFormulario({ ...formulario, status: novo });
              aoMudarStatus?.(novo);
            }}
          >
            {STATUS_TAREFA.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>

      <CampoEtiquetas
        id={prefixo + "-etiquetas"}
        valor={formulario.tags}
        onChange={(valor) => definirFormulario({ ...formulario, tags: valor })}
        sugestoes={sugestoesEtiquetas}
      />
    </>
  );
}

function DetalheTarefa({
  tarefaId,
  usuarios,
  skills,
  projeto,
  etiquetasSugeridas,
  aoFechar,
  aoCarregarAuxiliares,
  aoMover,
}: {
  tarefaId: number;
  usuarios: UsuarioResumo[];
  skills: Skill[];
  projeto?: ProjetoResumo;
  etiquetasSugeridas: string[];
  aoFechar: () => void;
  aoCarregarAuxiliares: (id: number, lista: UsuarioResumo[]) => void;
  aoMover: (id: number, status: StatusTarefa) => void;
}) {
  const navegar = useNavigate();
  const { pode } = useAuth();
  const podeEditarChecklist = pode("tarefa.editar");
  const podeCriar = pode("tarefa.criar");
  const { data, isLoading, isError, error } = useConsulta<TarefaDetalhe>(["tarefa", tarefaId], "/tarefas/" + tarefaId + "/");
  const comentarios = useLista<Comentario>(["comentarios", tarefaId], "/comentarios/", {
    entidade: "tasks.task",
    objeto_id: tarefaId,
    page_size: 100,
  });
  const [formulario, definirFormulario] = useState<FormularioTarefa | null>(null);
  const [novoItem, definirNovoItem] = useState("");
  const [novoAuxiliar, definirNovoAuxiliar] = useState("");
  const [requisito, definirRequisito] = useState({ skill: "", nivel_minimo: "3", peso: "1", obrigatorio: true });
  const [confirmarExclusao, definirConfirmarExclusao] = useState(false);
  const [itemEmEdicao, definirItemEmEdicao] = useState<number | null>(null);
  const [textoItem, definirTextoItem] = useState("");
  const [itemExcluindo, definirItemExcluindo] = useState<ChecklistItem | null>(null);
  const [confirmarDuplicacao, definirConfirmarDuplicacao] = useState(false);

  const auxiliares = data?.responsaveis_auxiliares || [];
  const chaveAuxiliares = auxiliares.join(",");

  useEffect(() => {
    if (!data) return;
    definirFormulario({
      nome: data.nome,
      descricao: data.descricao || "",
      responsavel: data.responsavel ? String(data.responsavel) : "",
      data_inicio: data.data_inicio || "",
      data_fim: data.data_fim || "",
      esforco_estimado: data.esforco_estimado ? String(Number(data.esforco_estimado)) : "0",
      prioridade: data.prioridade,
      status: data.status,
      percentual_conclusao: data.percentual_conclusao,
      tags: (data.tags || []).join(", "),
    });
  }, [data]);

  useEffect(() => {
    if (!data) return;
    aoCarregarAuxiliares(
      data.id,
      auxiliares.map((id) => usuarios.find((u) => u.id === id)).filter((u): u is UsuarioResumo => Boolean(u))
    );
  }, [data, usuarios, aoCarregarAuxiliares, chaveAuxiliares]);

  const salvar = useMutacao<{ id: number } & Record<string, unknown>, TarefaDetalhe>({
    metodo: "patch",
    url: (v) => "/tarefas/" + v.id + "/",
    invalidar: [CHAVES.tarefas, CHAVES.kanban(undefined), ["tarefa", tarefaId]],
    mensagemSucesso: "Tarefa atualizada",
  });

  const adicionarItem = useMutacao<{ id: number; texto: string; ordem: number }, ChecklistItem>({
    url: (v) => "/tarefas/" + v.id + "/checklist/",
    invalidar: [["tarefa", tarefaId], ["checklist", "quadro"]],
    mensagemSucesso: "Item adicionado ao checklist",
  });

  const alternarItem = useMutacao<{ id: number; itemId: number }, unknown>({
    url: (v) => "/tarefas/" + v.id + "/checklist/" + v.itemId + "/alternar/",
    invalidar: [["tarefa", tarefaId], ["checklist", "quadro"]],
  });

  const editarItem = useMutacao<{ id: number; texto: string }, ChecklistItem>({
    metodo: "patch",
    url: (v) => "/checklist/" + v.id + "/",
    invalidar: [["tarefa", tarefaId], ["checklist", "quadro"]],
    mensagemSucesso: "Item do checklist atualizado",
  });

  const removerItem = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/checklist/" + v.id + "/",
    invalidar: [["tarefa", tarefaId], ["checklist", "quadro"]],
    mensagemSucesso: "Item do checklist excluído",
  });

  const adicionarRequisito = useMutacao<{ id: number; skill: number; nivel_minimo: number; peso: number; obrigatorio: boolean }, unknown>({
    url: (v) => "/tarefas/" + v.id + "/requisitos-skill/",
    invalidar: [["tarefa", tarefaId]],
    mensagemSucesso: "Requisito de capacidade registrado",
  });

  const removerRequisito = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/requisitos-skill-tarefa/" + v.id + "/",
    invalidar: [["tarefa", tarefaId]],
    mensagemSucesso: "Requisito removido",
  });

  const excluir = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/tarefas/" + v.id + "/",
    invalidar: [CHAVES.tarefas, ["minhas-tarefas"], CHAVES.kanban(undefined)],
    mensagemSucesso: "Tarefa excluída",
  });

  const duplicar = useMutacao<{ id: number }, TarefaDetalhe>({
    url: (v) => "/tarefas/" + v.id + "/duplicar/",
    invalidar: [CHAVES.tarefas, ["minhas-tarefas"], CHAVES.kanban(undefined), ["checklist", "quadro"]],
    mensagemSucesso: "Tarefa duplicada",
  });

  const salvarFormulario = () => {
    if (!formulario) return;
    salvar.mutate({
      id: tarefaId,
      nome: formulario.nome,
      descricao: formulario.descricao,
      responsavel: formulario.responsavel ? Number(formulario.responsavel) : null,
      data_inicio: formulario.data_inicio || null,
      data_fim: formulario.data_fim || null,
      esforco_estimado: Number(formulario.esforco_estimado || 0),
      prioridade: formulario.prioridade,
      status: formulario.status,
      percentual_conclusao: formulario.percentual_conclusao,
      tags: listaDeTexto(formulario.tags),
    });
  };

  const adicionarAuxiliar = (valor: string) => {
    if (!valor || !data) return;
    salvar.mutate({ id: data.id, responsaveis_auxiliares: Array.from(new Set([...auxiliares, Number(valor)])) });
    definirNovoAuxiliar("");
  };

  const removerAuxiliar = (idUsuario: number) => {
    if (!data) return;
    salvar.mutate({ id: data.id, responsaveis_auxiliares: auxiliares.filter((i) => i !== idUsuario) });
  };

  const salvarItemChecklist = (itemId: number) => {
    const conteudo = textoItem.trim();
    if (!conteudo) return;
    editarItem.mutate(
      { id: itemId, texto: conteudo },
      {
        onSuccess: () => {
          definirItemEmEdicao(null);
          definirTextoItem("");
        },
      }
    );
  };

  const confirmarExclusaoItem = () => {
    if (!itemExcluindo) return;
    removerItem.mutate({ id: itemExcluindo.id }, { onSuccess: () => definirItemExcluindo(null) });
  };

  const rodape = (
    <>
      {pode("tarefa.excluir") && (
        <Botao variante="perigo" icone={Trash2} onClick={() => definirConfirmarExclusao(true)}>
          Excluir
        </Botao>
      )}
      {podeCriar && (
        <Botao variante="secundario" icone={Copy} onClick={() => definirConfirmarDuplicacao(true)}>
          Duplicar
        </Botao>
      )}
      <Botao variante="primario" icone={CheckCircle2} carregando={salvar.isPending} onClick={salvarFormulario}>
        Salvar alterações
      </Botao>
    </>
  );

  return (
    <>
      <PainelLateral
        aberto
        onFechar={aoFechar}
        largura="lg"
        titulo={data ? data.nome : "Tarefa"}
        subtitulo={
          data
            ? projeto
              ? projeto.codigo + " · " + projeto.nome
              : data.project_nome
            : "Carregando tarefa..."
        }
        rodape={rodape}
      >
        {isError && (
          <Alerta tom="danger" titulo="Não foi possível carregar a tarefa">
            {mensagemErro(error)}
          </Alerta>
        )}

        {isLoading || !formulario ? (
          <CarregandoBloco rotulo="Carregando tarefa..." />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom="brand">{data?.status_rotulo || metaStatus(formulario.status).rotulo}</Etiqueta>
              <Etiqueta tom={CORES_PRIORIDADE[formulario.prioridade]}>
                {ROTULO_PRIORIDADE[formulario.prioridade] || formulario.prioridade}
              </Etiqueta>
              {data?.atrasada && <Etiqueta tom="danger" icone={AlertTriangle}>atrasada</Etiqueta>}
              {data?.critica && <Etiqueta tom="warning" icone={Flame}>caminho crítico</Etiqueta>}
              <span className="text-2xs text-fg-subtle">{data?.wbs ? "EAP " + data.wbs : ""}</span>
            </div>

            <CamposTarefa
              formulario={formulario}
              definirFormulario={definirFormulario}
              usuarios={usuarios}
              sugestoesEtiquetas={etiquetasSugeridas}
              aoMudarStatus={(novo) => aoMover(tarefaId, novo)}
            />

            <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
              <ControleDeslizante
                valor={formulario.percentual_conclusao}
                onChange={(v) => definirFormulario({ ...formulario, percentual_conclusao: v })}
                rotulo="Percentual de conclusão"
                sufixo="%"
                marcos={[0, 25, 50, 75, 100]}
                cor={metaStatus(formulario.status).cor}
              />
              <p className="mt-1.5 text-2xs text-fg-muted">
                {data && Number(data.esforco_real) > 0
                  ? "Esforço real apontado: " + formatarHoras(Number(data.esforco_real))
                  : "Sem horas apontadas no timesheet."}
                {data && data.progresso_planejado !== undefined ? " · Planejado: " + numero(data.progresso_planejado) + "%" : ""}
              </p>
            </div>

            <SecaoColapsavel titulo="Responsáveis auxiliares" icone={UserPlus} contagem={auxiliares.length}>
              <div className="space-y-2.5">
                {auxiliares.length === 0 ? (
                  <p className="text-2xs text-fg-muted">Nenhum apoio registrado nesta tarefa.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {auxiliares.map((idUsuario) => {
                      const pessoa = usuarios.find((u) => u.id === idUsuario);
                      if (!pessoa) return null;
                      return (
                        <li key={idUsuario}>
                          <Chip cor={pessoa.cor} removivel onRemover={() => removerAuxiliar(idUsuario)}>
                            {pessoa.nome_curto || pessoa.nome}
                          </Chip>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Campo rotulo="Adicionar apoio" htmlFor="tarefa-auxiliar">
                  <Selecao id="tarefa-auxiliar" value={novoAuxiliar} onChange={(e) => adicionarAuxiliar(e.target.value)}>
                    <option value="">Selecione uma pessoa</option>
                    {usuarios
                      .filter((u) => !auxiliares.includes(u.id) && u.id !== data?.responsavel)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} — {u.area}
                        </option>
                      ))}
                  </Selecao>
                </Campo>
              </div>
            </SecaoColapsavel>

            <SecaoColapsavel titulo="Checklist" icone={ListChecks} contagem={(data?.checklist || []).length}>
              <div className="space-y-2">
                <ul className="space-y-1.5">
                  {(data?.checklist || []).map((item) => (
                    <li key={item.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => alternarItem.mutate({ id: tarefaId, itemId: item.id })}
                        className="shrink-0"
                        aria-label={item.concluido ? "Marcar como pendente" : "Marcar como concluído"}
                      >
                        {item.concluido ? (
                          <CheckCircle2 className="size-4 text-success" aria-hidden />
                        ) : (
                          <Circle className="size-4 text-fg-subtle" aria-hidden />
                        )}
                      </button>

                      {itemEmEdicao === item.id ? (
                        <>
                          <Entrada
                            value={textoItem}
                            autoFocus
                            aria-label="Editar texto do item do checklist"
                            onChange={(e) => definirTextoItem(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") salvarItemChecklist(item.id);
                              if (e.key === "Escape") definirItemEmEdicao(null);
                            }}
                            className="h-7 min-w-0 flex-1 text-xs"
                          />
                          <BotaoIcone
                            icone={Check}
                            rotulo="Salvar item"
                            tamanho="xs"
                            variante="sucesso"
                            disabled={!textoItem.trim() || editarItem.isPending}
                            onClick={() => salvarItemChecklist(item.id)}
                          />
                          <BotaoIcone icone={X} rotulo="Cancelar edição do item" tamanho="xs" onClick={() => definirItemEmEdicao(null)} />
                        </>
                      ) : (
                        <>
                          <span className={"min-w-0 flex-1 text-xs " + (item.concluido ? "text-fg-muted line-through" : "text-fg")}>{item.texto}</span>
                          {item.responsavel_detalhe && (
                            <Avatar
                              nome={item.responsavel_detalhe.nome}
                              cor={item.responsavel_detalhe.cor}
                              iniciais={item.responsavel_detalhe.iniciais}
                              tamanho="xs"
                            />
                          )}
                          {podeEditarChecklist && (
                            <>
                              <Dica texto="Editar texto do item">
                                <BotaoIcone
                                  icone={Pencil}
                                  rotulo="Editar item do checklist"
                                  tamanho="xs"
                                  onClick={() => {
                                    definirItemEmEdicao(item.id);
                                    definirTextoItem(item.texto);
                                  }}
                                />
                              </Dica>
                              <Dica texto="Excluir item do checklist">
                                <BotaoIcone
                                  icone={Trash2}
                                  rotulo="Excluir item do checklist"
                                  tamanho="xs"
                                  className="hover:text-danger"
                                  onClick={() => definirItemExcluindo(item)}
                                />
                              </Dica>
                            </>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                  {(data?.checklist || []).length === 0 && <li className="text-2xs text-fg-muted">Checklist vazio.</li>}
                </ul>
                <div className="flex items-end gap-2">
                  <Campo rotulo="Novo item" htmlFor="checklist-novo" className="flex-1">
                    <Entrada
                      id="checklist-novo"
                      value={novoItem}
                      placeholder="Ex.: Validar com o negócio"
                      onChange={(e) => definirNovoItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && novoItem.trim()) {
                          adicionarItem.mutate({ id: tarefaId, texto: novoItem.trim(), ordem: (data?.checklist || []).length });
                          definirNovoItem("");
                        }
                      }}
                    />
                  </Campo>
                  <Botao
                    variante="secundario"
                    icone={Plus}
                    carregando={adicionarItem.isPending}
                    disabled={!novoItem.trim()}
                    onClick={() => {
                      adicionarItem.mutate({ id: tarefaId, texto: novoItem.trim(), ordem: (data?.checklist || []).length });
                      definirNovoItem("");
                    }}
                  >
                    Adicionar
                  </Botao>
                </div>
              </div>
            </SecaoColapsavel>

            <SecaoColapsavel titulo="Requisitos de capacidade" icone={Sparkles} contagem={(data?.requisitos_skill || []).length} abertoInicial={false}>
              <div className="space-y-2.5">
                <ul className="space-y-1.5">
                  {(data?.requisitos_skill || []).map((req) => (
                    <li key={req.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2.5 py-1.5">
                      <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: req.skill_cor }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-xs text-fg">{req.skill_nome}</span>
                      <Etiqueta tom="info">nível {req.nivel_minimo}</Etiqueta>
                      {req.obrigatorio && <Etiqueta tom="warning">obrigatório</Etiqueta>}
                      <span className="text-2xs tabular-nums text-fg-muted">peso {req.peso}</span>
                      <BotaoIcone
                        icone={Trash2}
                        rotulo="Remover requisito"
                        tamanho="xs"
                        variante="fantasma"
                        onClick={() => removerRequisito.mutate({ id: req.id })}
                      />
                    </li>
                  ))}
                  {(data?.requisitos_skill || []).length === 0 && (
                    <li className="text-2xs text-fg-muted">Nenhuma capacidade exigida — o motor de matching usa os requisitos definidos no projeto.</li>
                  )}
                </ul>
                <div className="grid gap-2 sm:grid-cols-4">
                  <Campo rotulo="Capacidade" htmlFor="requisito-skill" className="sm:col-span-2">
                    <Selecao id="requisito-skill" value={requisito.skill} onChange={(e) => definirRequisito({ ...requisito, skill: e.target.value })}>
                      <option value="">Selecione</option>
                      {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </Selecao>
                  </Campo>
                  <Campo rotulo="Nível mínimo" htmlFor="requisito-nivel">
                    <Selecao id="requisito-nivel" value={requisito.nivel_minimo} onChange={(e) => definirRequisito({ ...requisito, nivel_minimo: e.target.value })}>
                      <option value="1">1 — Iniciante</option>
                      <option value="2">2 — Básico</option>
                      <option value="3">3 — Intermediário</option>
                      <option value="4">4 — Avançado</option>
                      <option value="5">5 — Especialista</option>
                    </Selecao>
                  </Campo>
                  <Campo rotulo="Peso" htmlFor="requisito-peso">
                    <Entrada
                      id="requisito-peso"
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={requisito.peso}
                      onChange={(e) => definirRequisito({ ...requisito, peso: e.target.value })}
                    />
                  </Campo>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Interruptor
                    ativo={requisito.obrigatorio}
                    onChange={(v) => definirRequisito({ ...requisito, obrigatorio: v })}
                    rotulo="Requisito obrigatório"
                    descricao="Candidatos sem esta capacidade são desclassificados no matching."
                  />
                  <Botao
                    variante="secundario"
                    icone={Plus}
                    disabled={!requisito.skill}
                    carregando={adicionarRequisito.isPending}
                    onClick={() => {
                      adicionarRequisito.mutate({
                        id: tarefaId,
                        skill: Number(requisito.skill),
                        nivel_minimo: Number(requisito.nivel_minimo),
                        peso: Number(requisito.peso),
                        obrigatorio: requisito.obrigatorio,
                      });
                      definirRequisito({ skill: "", nivel_minimo: "3", peso: "1", obrigatorio: true });
                    }}
                  >
                    Adicionar requisito
                  </Botao>
                </div>
              </div>
            </SecaoColapsavel>

            <SecaoColapsavel titulo="Anexos" icone={Paperclip}>
              <ListaAnexos
                entidade="tasks.task"
                objetoId={tarefaId}
                chaveInvalidar={["tarefa", tarefaId]}
                compacto
              />
            </SecaoColapsavel>

            <SecaoColapsavel titulo="Comentários" icone={MessageSquare} contagem={(comentarios.data || []).length}>
              <ListaComentarios
                entidade="tasks.task"
                objetoId={tarefaId}
                chaveInvalidar={["comentarios", tarefaId]}
                compacto
              />
            </SecaoColapsavel>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Botao variante="fantasma" tamanho="sm" icone={FolderKanban} onClick={() => navegar("/projetos/" + (data ? data.project : ""))}>
                Abrir projeto
              </Botao>
              <span className="ml-auto text-2xs text-fg-subtle">
                {data && data.atualizado_em ? "Atualizada " + dataRelativa(data.atualizado_em) : ""}
              </span>
            </div>
          </div>
        )}
      </PainelLateral>

      <Modal
        aberto={confirmarExclusao}
        onFechar={() => definirConfirmarExclusao(false)}
        titulo="Excluir tarefa"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirConfirmarExclusao(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={() =>
                excluir.mutate(
                  { id: tarefaId },
                  {
                    onSuccess: () => {
                      definirConfirmarExclusao(false);
                      aoFechar();
                    },
                  }
                )
              }
            >
              Excluir tarefa
            </Botao>
          </>
        }
      >
        <p className="text-xs text-fg-muted">
          A tarefa <strong className="text-fg">{data?.nome}</strong> e seus itens de checklist, dependências e requisitos serão removidos do cronograma do projeto.
        </p>
      </Modal>

      <Modal
        aberto={confirmarDuplicacao}
        onFechar={() => definirConfirmarDuplicacao(false)}
        titulo="Duplicar tarefa"
        subtitulo="A cópia entra no quadro como uma nova tarefa."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirConfirmarDuplicacao(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Copy}
              carregando={duplicar.isPending}
              onClick={() =>
                duplicar.mutate(
                  { id: tarefaId },
                  {
                    onSuccess: () => {
                      definirConfirmarDuplicacao(false);
                      aoFechar();
                    },
                  }
                )
              }
            >
              Duplicar tarefa
            </Botao>
          </>
        }
      >
        <p className="text-xs text-fg-muted">
          A cópia de <strong className="text-fg">{data?.nome}</strong> reproduz descrição, responsável, datas, esforço,
          prioridade, cor e etiquetas, além do checklist e dos requisitos de capacidade. Ela nasce com o status
          A fazer e não copia dependências nem horas apontadas.
        </p>
      </Modal>

      <Modal
        aberto={itemExcluindo !== null}
        onFechar={() => definirItemExcluindo(null)}
        titulo="Excluir item do checklist"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirItemExcluindo(null)}>
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

/* ==========================================================================
   Criação de tarefa pelo próprio quadro
   ========================================================================== */

const FORMULARIO_TAREFA_VAZIO: FormularioTarefa = {
  nome: "",
  descricao: "",
  responsavel: "",
  data_inicio: "",
  data_fim: "",
  esforco_estimado: "0",
  prioridade: "MEDIA",
  status: "A_FAZER",
  percentual_conclusao: 0,
  tags: "",
};

function PainelNovaTarefa({
  projetoId,
  projeto,
  usuarios,
  etiquetasSugeridas,
  statusInicial,
  aoFechar,
}: {
  projetoId: number;
  projeto?: ProjetoResumo;
  usuarios: UsuarioResumo[];
  etiquetasSugeridas: string[];
  statusInicial: StatusTarefa;
  aoFechar: () => void;
}) {
  const [formulario, definirFormulario] = useState<FormularioTarefa>({ ...FORMULARIO_TAREFA_VAZIO, status: statusInicial });

  const criar = useMutacao<Record<string, unknown>, Tarefa>({
    url: "/tarefas/",
    invalidar: [CHAVES.tarefas, CHAVES.kanban(projetoId), ["minhas-tarefas"], ["checklist", "quadro"]],
    mensagemSucesso: "Tarefa criada",
    aoSucesso: () => aoFechar(),
  });

  const enviar = () => {
    const nome = formulario.nome.trim();
    if (!nome) return;
    criar.mutate({
      project: projetoId,
      nome,
      descricao: formulario.descricao,
      responsavel: formulario.responsavel ? Number(formulario.responsavel) : null,
      data_inicio: formulario.data_inicio || null,
      data_fim: formulario.data_fim || null,
      esforco_estimado: Number(formulario.esforco_estimado || 0),
      prioridade: formulario.prioridade,
      status: formulario.status,
      tags: listaDeTexto(formulario.tags),
    });
  };

  return (
    <PainelLateral
      aberto
      onFechar={aoFechar}
      largura="lg"
      titulo="Nova tarefa"
      subtitulo={projeto ? projeto.codigo + " · " + projeto.nome : "Tarefa do projeto selecionado"}
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" icone={Plus} carregando={criar.isPending} disabled={!formulario.nome.trim()} onClick={enviar}>
            Criar tarefa
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <Alerta tom="info" titulo={"A tarefa entra na coluna " + metaStatus(formulario.status).rotulo}>
          Ajuste o status no formulário para escolher a coluna em que o card nasce no quadro.
        </Alerta>

        <CamposTarefa
          prefixo="nova-tarefa"
          formulario={formulario}
          definirFormulario={definirFormulario}
          usuarios={usuarios}
          sugestoesEtiquetas={etiquetasSugeridas}
        />
      </div>
    </PainelLateral>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Kanban() {
  const qc = useQueryClient();
  const { pode } = useAuth();
  const podeCriar = pode("tarefa.criar");
  const [projetoId, definirProjetoId] = useState("");
  const [responsavel, definirResponsavel] = useState("");
  const [prioridade, definirPrioridade] = useState("");
  const [etiqueta, definirEtiqueta] = useState("");
  const [busca, definirBusca] = useState("");
  const [mostrarEncerradas, definirMostrarEncerradas] = useState(false);
  const [tarefaAberta, definirTarefaAberta] = useState<number | null>(null);
  const [arrastando, definirArrastando] = useState<Tarefa | null>(null);
  const [auxiliaresPorTarefa, definirAuxiliaresPorTarefa] = useState<Record<number, UsuarioResumo[]>>({});
  const [novaTarefa, definirNovaTarefa] = useState<{ aberto: boolean; status: StatusTarefa }>({ aberto: false, status: "A_FAZER" });

  const projetos = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 200 });
  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, "/usuarios/resumo/");
  const skills = useLista<Skill>(CHAVES.skills, "/capacidades/skills/", { page_size: 300 });
  const checklist = useLista<ChecklistItem>(["checklist", "quadro"], "/checklist/", { page_size: 1000 });

  const parametrosQuadro = projetoId ? { project: projetoId } : undefined;
  const board = useConsulta<RespostaKanban>(CHAVES.kanban(projetoId), "/tarefas/kanban/", parametrosQuadro);
  const chaveQuadro = [...CHAVES.kanban(projetoId), parametrosQuadro ?? {}];

  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const mover = useMutacao<{ id: number; status: StatusTarefa; posicao_visual: number }, Tarefa>({
    url: (v) => "/tarefas/" + v.id + "/mover/",
    invalidar: [CHAVES.kanban(projetoId), CHAVES.tarefas, ["minhas-tarefas"]],
  });

  const mapaProjetos = useMemo(() => {
    const mapa = new Map<number, ProjetoResumo>();
    projetos.data?.forEach((p) => mapa.set(p.id, p));
    return mapa;
  }, [projetos.data]);

  const checklistPorTarefa = useMemo(() => {
    const mapa: Record<number, { total: number; concluidos: number }> = {};
    checklist.data?.forEach((item) => {
      const atual = mapa[item.task] || { total: 0, concluidos: 0 };
      atual.total += 1;
      if (item.concluido) atual.concluidos += 1;
      mapa[item.task] = atual;
    });
    return mapa;
  }, [checklist.data]);

  const etiquetasDisponiveis = useMemo(() => {
    const conjunto = new Set<string>();
    board.data?.colunas.forEach((c) => c.tarefas.forEach((t) => (t.tags || []).forEach((tag) => conjunto.add(tag))));
    return Array.from(conjunto).sort();
  }, [board.data]);

  const colunas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = board.data?.colunas ?? [];
    return base
      .filter((c) => mostrarEncerradas || (c.status !== "CONCLUIDA" && c.status !== "CANCELADA"))
      .map((c) => {
        const tarefas = c.tarefas.filter((t) => {
          if (responsavel && String(t.responsavel) !== responsavel) return false;
          if (prioridade && t.prioridade !== prioridade) return false;
          if (etiqueta && !(t.tags || []).includes(etiqueta)) return false;
          if (termo && !t.nome.toLowerCase().includes(termo) && !(t.descricao || "").toLowerCase().includes(termo)) return false;
          return true;
        });
        return { ...c, tarefas, total: tarefas.length };
      });
  }, [board.data, responsavel, prioridade, etiqueta, busca, mostrarEncerradas]);

  const visiveis = useMemo(() => colunas.flatMap((c) => c.tarefas), [colunas]);
  const totalAtrasadas = visiveis.filter((t) => t.atrasada).length;
  const colunasExcedidas = colunas.filter((c) => LIMITE_WIP[c.status] !== undefined && c.tarefas.length > (LIMITE_WIP[c.status] as number)).length;
  const esforcoTotal = visiveis.reduce((a, t) => a + Number(t.esforco_estimado || 0), 0);
  const bloqueadas = visiveis.filter((t) => t.status === "BLOQUEADA").length;
  const projetoSelecionado = projetoId ? mapaProjetos.get(Number(projetoId)) : undefined;

  const aplicarMover = (id: number, status: StatusTarefa, posicao: number) => {
    qc.setQueryData<RespostaKanban>(chaveQuadro, (antigo) => moverNoCache(antigo, id, status, posicao));
    mover.mutate(
      { id, status, posicao_visual: posicao },
      { onError: () => qc.invalidateQueries({ queryKey: chaveQuadro }) }
    );
  };

  const moverPorStatus = (id: number, status: StatusTarefa) => {
    const destino = colunas.find((c) => c.status === status);
    aplicarMover(id, status, destino ? calcularPosicao(destino.tarefas, id, null) : 1000);
  };

  const registrarAuxiliares = useCallback((id: number, lista: UsuarioResumo[]) => {
    definirAuxiliaresPorTarefa((atual) => {
      const anterior = atual[id] || [];
      const igual = anterior.length === lista.length && anterior.every((u, i) => u.id === lista[i].id);
      if (igual) return atual;
      return { ...atual, [id]: lista };
    });
  }, []);

  const listaUsuarios = useMemo(() => usuarios.data || [], [usuarios.data]);
  const listaSkills = useMemo(() => skills.data || [], [skills.data]);

  const abrirNovaTarefa = (status: StatusTarefa) => {
    if (!projetoId) return;
    definirTarefaAberta(null);
    definirNovaTarefa({ aberto: true, status });
  };

  const abrirTarefa = (id: number) => {
    definirNovaTarefa({ aberto: false, status: "A_FAZER" });
    definirTarefaAberta(id);
  };

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Kanban de execução"
        subtitulo={projetoSelecionado ? projetoSelecionado.codigo + " · " + projetoSelecionado.nome : "Todos os projetos — arraste os cards para atualizar o status"}
        icone={LayoutGrid}
        cor="#7C3AED"
        migalhas={[{ rotulo: "Execução" }, { rotulo: "Kanban" }]}
        acoes={
          <>
            {podeCriar && (
              <Botao
                variante="primario"
                icone={Plus}
                disabled={!projetoId}
                title={projetoId ? "Criar tarefa no projeto selecionado" : "Selecione um projeto para criar a tarefa"}
                onClick={() => abrirNovaTarefa("A_FAZER")}
              >
                Nova tarefa
              </Botao>
            )}
            <Botao variante="secundario" icone={RefreshCw} onClick={() => board.refetch()} carregando={board.isFetching}>
              Atualizar
            </Botao>
          </>
        }
      />

      <LinhaKPI
        itens={[
          { rotulo: "Cards no quadro", valor: numero(visiveis.length), icone: LayoutGrid, cor: "#7C3AED", subrotulo: "após os filtros" },
          { rotulo: "Atrasados", valor: numero(totalAtrasadas), icone: AlertTriangle, cor: "#DC2626", subrotulo: "com prazo vencido" },
          { rotulo: "Bloqueados", valor: numero(bloqueadas), icone: Lock, cor: "#D97706", subrotulo: "aguardando desbloqueio" },
          { rotulo: "Colunas no limite", valor: numero(colunasExcedidas), icone: ListChecks, cor: "#0891B2", subrotulo: "WIP excedido" },
          { rotulo: "Esforço estimado", valor: formatarHoras(esforcoTotal), icone: Hourglass, cor: "#2563EB", subrotulo: "nos cards visíveis" },
          {
            rotulo: "Projeto",
            valor: projetoSelecionado ? projetoSelecionado.codigo : "Todos",
            icone: FolderKanban,
            cor: "#059669",
            subrotulo: projetoSelecionado ? projetoSelecionado.status_rotulo : "visão consolidada",
          },
        ]}
      />

      <div className="flex flex-wrap items-end gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Projeto</span>
          <Selecao value={projetoId} onChange={(e) => definirProjetoId(e.target.value)} className="h-8 w-52 text-xs">
            <option value="">Todos os projetos</option>
            {(projetos.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} · {p.nome}
              </option>
            ))}
          </Selecao>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Responsável</span>
          <Selecao value={responsavel} onChange={(e) => definirResponsavel(e.target.value)} className="h-8 w-44 text-xs">
            <option value="">Todos</option>
            {(usuarios.data || []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </Selecao>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Prioridade</span>
          <Selecao value={prioridade} onChange={(e) => definirPrioridade(e.target.value)} className="h-8 w-36 text-xs">
            <option value="">Todas</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </Selecao>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Etiqueta</span>
          <Selecao value={etiqueta} onChange={(e) => definirEtiqueta(e.target.value)} className="h-8 w-40 text-xs">
            <option value="">Todas</option>
            {etiquetasDisponiveis.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Selecao>
        </label>
        <EntradaBusca valor={busca} onChange={definirBusca} placeholder="Buscar tarefa..." className="w-56" />
        <div className="ml-auto flex items-center gap-3">
          <Interruptor ativo={mostrarEncerradas} onChange={definirMostrarEncerradas} rotulo="Mostrar encerradas" descricao="Concluídas e canceladas" tamanho="sm" />
        </div>
      </div>

      {board.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o quadro">
          {mensagemErro(board.error)}
        </Alerta>
      )}

      {board.isLoading ? (
        <CarregandoBloco rotulo="Carregando quadro Kanban..." />
      ) : visiveis.length === 0 ? (
        <Vazio
          icone={LayoutGrid}
          titulo="Nenhum card para os filtros aplicados"
          descricao="Ajuste o projeto, o responsável, a prioridade, a etiqueta ou a busca para visualizar tarefas no quadro."
          acao={
            podeCriar && projetoId ? (
              <Botao variante="primario" icone={Plus} onClick={() => abrirNovaTarefa("A_FAZER")}>
                Nova tarefa
              </Botao>
            ) : undefined
          }
        />
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCorners}
          onDragStart={(evento: DragStartEvent) => {
            const dados = evento.active.data.current as { tarefa?: Tarefa } | undefined;
            definirArrastando(dados?.tarefa || null);
          }}
          onDragEnd={(evento: DragEndEvent) => {
            const tarefa = arrastando;
            definirArrastando(null);
            const alvo = evento.over;
            if (!tarefa || !alvo) return;
            const dadosAlvo = alvo.data.current as { status?: StatusTarefa; tarefa?: Tarefa } | undefined;
            const statusDestino = dadosAlvo?.status;
            if (!statusDestino) return;
            const colunaDestino = colunas.find((c) => c.status === statusDestino);
            if (!colunaDestino) return;
            const idSobre = dadosAlvo && dadosAlvo.tarefa && dadosAlvo.tarefa.id !== tarefa.id ? dadosAlvo.tarefa.id : null;
            if (statusDestino === tarefa.status && idSobre === null) return;
            aplicarMover(tarefa.id, statusDestino, calcularPosicao(colunaDestino.tarefas, tarefa.id, idSobre));
          }}
          onDragCancel={() => definirArrastando(null)}
        >
          <div className="flex gap-3 overflow-x-auto pb-3 scroll-thin">
            {colunas.map((coluna) => (
              <ColunaKanban
                key={coluna.status}
                coluna={coluna}
                projeto={projetoSelecionado}
                checklistPorTarefa={checklistPorTarefa}
                auxiliaresPorTarefa={auxiliaresPorTarefa}
                arrastando={arrastando ? arrastando.id : null}
                podeCriar={podeCriar && Boolean(projetoId)}
                aoAbrir={(t) => abrirTarefa(t.id)}
                aoMover={moverPorStatus}
                aoCriar={abrirNovaTarefa}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {arrastando ? (
              <CardKanban
                tarefa={arrastando}
                coluna={arrastando.status}
                projeto={mapaProjetos.get(arrastando.project)}
                checklist={checklistPorTarefa[arrastando.id] || { total: 0, concluidos: 0 }}
                auxiliares={auxiliaresPorTarefa[arrastando.id] || []}
                arrastando={false}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {tarefaAberta !== null && (
        <DetalheTarefa
          tarefaId={tarefaAberta}
          usuarios={listaUsuarios}
          skills={listaSkills}
          projeto={mapaProjetos.get(visiveis.find((t) => t.id === tarefaAberta)?.project || 0)}
          etiquetasSugeridas={etiquetasDisponiveis}
          aoFechar={() => definirTarefaAberta(null)}
          aoCarregarAuxiliares={registrarAuxiliares}
          aoMover={moverPorStatus}
        />
      )}

      {novaTarefa.aberto && projetoId && (
        <PainelNovaTarefa
          projetoId={Number(projetoId)}
          projeto={projetoSelecionado}
          usuarios={listaUsuarios}
          etiquetasSugeridas={etiquetasDisponiveis}
          statusInicial={novaTarefa.status}
          aoFechar={() => definirNovaTarefa({ aberto: false, status: "A_FAZER" })}
        />
      )}

      <p className="text-2xs text-fg-subtle">
        Arraste os cards entre as colunas para atualizar o status e a posição. O quadro exibe {numero(visiveis.length)} de {numero(board.data?.total ?? 0)} tarefas
        {board.data ? " · " + numero(board.data.atrasadas) + " atrasadas no total do filtro" : ""}.
      </p>
    </div>
  );
}

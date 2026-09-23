import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Alerta, Avatar, BarraProgresso, Botao, CarregandoBloco, CORES_PRIORIDADE, Etiqueta } from "@/components/ui";
import { CHAVES, useConsulta, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, numero } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Marco, StatusTarefa, Tarefa } from "@/lib/types";
import { AlertTriangle, Diamond, Layers, Plus } from "lucide-react";

import { CORES_STATUS_TAREFA, PainelTarefa } from "./comum";

interface ColunaKanban {
  status: StatusTarefa;
  rotulo: string;
  total: number;
  wip_excedido: boolean;
  tarefas: Tarefa[];
}

interface RespostaKanban {
  projeto: number | string;
  colunas: ColunaKanban[];
  total: number;
  atrasadas: number;
}

/* ==========================================================================
   Aba Kanban — board com drag-and-drop e atualizacao otimista (RF-07)
   ========================================================================== */

function CartaoKanban({ tarefa, aoAbrir }: { tarefa: Tarefa; aoAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "tarefa-" + String(tarefa.id),
    data: { tarefaId: tarefa.id, status: tarefa.status },
  });
  const responsavel = tarefa.responsavel_detalhe;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={aoAbrir}
      style={{
        transform: transform ? "translate3d(" + transform.x + "px, " + transform.y + "px, 0)" : undefined,
        touchAction: "none",
      }}
      className={
        "cursor-grab space-y-2 rounded-sgp border bg-surface p-2.5 shadow-n1 transition-shadow active:cursor-grabbing " +
        (isDragging ? "z-50 border-brand opacity-90 shadow-n3" : "border-border hover:shadow-n2")
      }
      role="button"
      tabIndex={0}
      aria-label={"Tarefa " + tarefa.nome}
    >
      <div className="flex items-start gap-2">
        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: tarefa.cor || "#2563EB" }} aria-hidden />
        <p className="min-w-0 flex-1 text-xs font-medium text-fg">{tarefa.nome}</p>
        {tarefa.critica && <Etiqueta tom="danger">Crítica</Etiqueta>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Etiqueta tom={CORES_PRIORIDADE[tarefa.prioridade] || "neutral"}>{tarefa.prioridade}</Etiqueta>
        {tarefa.atrasada && (
          <Etiqueta tom="danger" icone={AlertTriangle}>
            Atrasada
          </Etiqueta>
        )}
        {tarefa.is_marco && <Etiqueta tom="warning" icone={Diamond}>Marco</Etiqueta>}
      </div>
      <BarraProgresso valor={tarefa.percentual_conclusao} comparativo={tarefa.progresso_planejado} altura="sm" mostrarValor />
      <div className="flex items-center justify-between gap-2 text-2xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          {responsavel ? (
            <>
              <Avatar nome={responsavel.nome} cor={responsavel.cor} iniciais={responsavel.iniciais} url={responsavel.avatar_display} tamanho="xs" />
              <span className="truncate">{responsavel.nome_curto}</span>
            </>
          ) : (
            <span className="text-fg-subtle">Sem responsável</span>
          )}
        </span>
        <span className="shrink-0 tabular-nums">{dataCurta(tarefa.data_fim)}</span>
      </div>
    </div>
  );
}

function ColunaKanbanBoard({ coluna, aoAbrir }: { coluna: ColunaKanban; aoAbrir: (id: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "coluna-" + coluna.status, data: { status: coluna.status } });
  const cor = CORES_STATUS_TAREFA[coluna.status] || "#64748B";
  const limiteWip = 6;
  const excedido = coluna.total > limiteWip;
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-sgp-lg border border-border bg-surface-2">
      <header className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: cor }} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-fg">{coluna.rotulo}</span>
        <Etiqueta tom={excedido ? "warning" : "neutral"}>
          {numero(coluna.total)}
          <span className="opacity-70">/{limiteWip}</span>
        </Etiqueta>
      </header>
      <div
        ref={setNodeRef}
        className={
          "flex max-h-[560px] min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2 scroll-thin transition-colors " +
          (isOver ? "bg-brand-soft/40" : "")
        }
      >
        {coluna.tarefas.length === 0 ? (
          <p className="rounded-sgp border border-dashed border-border px-2 py-6 text-center text-2xs text-fg-subtle">
            Arraste tarefas para cá
          </p>
        ) : (
          coluna.tarefas.map((tarefa) => (
            <CartaoKanban key={tarefa.id} tarefa={tarefa} aoAbrir={() => aoAbrir(tarefa.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function moverEntreColunas(estado: RespostaKanban | undefined, tarefaId: number, destino: StatusTarefa): RespostaKanban | undefined {
  if (!estado) return estado;
  let movida: Tarefa | null = null;
  const colunas = estado.colunas.map((coluna) => {
    const restantes = coluna.tarefas.filter((tarefa) => {
      if (tarefa.id === tarefaId) {
        movida = { ...tarefa, status: destino };
        return false;
      }
      return true;
    });
    return { ...coluna, tarefas: restantes, total: restantes.length };
  });
  if (!movida) return estado;
  const atualizadas = colunas.map((coluna) =>
    coluna.status === destino
      ? { ...coluna, tarefas: [movida as Tarefa].concat(coluna.tarefas), total: coluna.total + 1 }
      : coluna
  );
  return { ...estado, colunas: atualizadas };
}

export function AbaKanban({ projetoId }: { projetoId: number }) {
  const qc = useQueryClient();
  const { pode } = useAuth();
  const [tarefaAberta, setTarefaAberta] = useState<number | null>(null);
  const [criandoTarefa, setCriandoTarefa] = useState(false);
  const chaveKanban = CHAVES.kanban(projetoId);

  const { data, isLoading, isError, error } = useConsulta<RespostaKanban>(chaveKanban, "/tarefas/kanban/", {
    project: projetoId,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const mover = useMutacao<{ id: number; status: StatusTarefa; posicao_visual: number }, Tarefa>({
    url: (valores) => "/tarefas/" + valores.id + "/mover/",
    invalidar: [chaveKanban, CHAVES.tarefas, CHAVES.cronograma(projetoId), CHAVES.dashboardProjeto(projetoId)],
    mensagemSucesso: "Card movido",
  });

  const aoSoltar = (evento: DragEndEvent) => {
    const destinoBruto = evento.over ? String(evento.over.id) : "";
    if (!destinoBruto.startsWith("coluna-")) return;
    const destino = destinoBruto.replace("coluna-", "") as StatusTarefa;
    const idTarefa = Number(String(evento.active.id).replace("tarefa-", ""));
    const atual = qc.getQueryData<RespostaKanban>(chaveKanban);
    const tarefaAtual = atual?.colunas.flatMap((coluna) => coluna.tarefas).find((tarefa) => tarefa.id === idTarefa);
    if (tarefaAtual && tarefaAtual.status === destino) return;
    qc.setQueryData<RespostaKanban>(chaveKanban, (estado) => moverEntreColunas(estado, idTarefa, destino));
    mover.mutate({ id: idTarefa, status: destino, posicao_visual: 0 });
  };

  if (isLoading) return <CarregandoBloco rotulo="Carregando board Kanban..." />;
  if (isError || !data) {
    return (
      <Alerta tom="danger" titulo="Não foi possível carregar o Kanban">
        {mensagemErro(error)}
      </Alerta>
    );
  }

  const opcoes = data.colunas.flatMap((coluna) => coluna.tarefas).map((tarefa) => ({ id: tarefa.id, nome: tarefa.nome }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1 text-2xs text-fg-muted">
        {pode("tarefa.criar") && (
          <Botao
            variante="primario"
            icone={Plus}
            tamanho="sm"
            onClick={() => {
              setTarefaAberta(null);
              setCriandoTarefa(true);
            }}
          >
            Nova tarefa
          </Botao>
        )}
        <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
          <Layers className="size-3.5" aria-hidden />
          {numero(data.total)} tarefa(s) no board
        </span>
        <span className="inline-flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 text-danger" aria-hidden />
          {numero(data.atrasadas)} atrasada(s)
        </span>
        <span className="ml-auto italic">Arraste os cards entre as colunas — o status é salvo automaticamente.</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <div className="flex gap-3 overflow-x-auto pb-2 scroll-thin">
          {data.colunas.map((coluna) => (
            <ColunaKanbanBoard key={coluna.status} coluna={coluna} aoAbrir={setTarefaAberta} />
          ))}
        </div>
      </DndContext>

      <PainelTarefa
        projetoId={projetoId}
        tarefaId={criandoTarefa ? null : tarefaAberta}
        aberto={criandoTarefa || tarefaAberta !== null}
        onFechar={() => {
          setTarefaAberta(null);
          setCriandoTarefa(false);
        }}
        opcoes={opcoes}
      />
    </div>
  );
}

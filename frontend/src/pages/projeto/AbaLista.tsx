import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Alerta, Avatar, BarraProgresso, Botao, CarregandoBloco, Etiqueta, Vazio } from "@/components/ui";
import { CHAVES, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, numero } from "@/lib/format";
import type { Tarefa } from "@/lib/types";
import { AlertTriangle, Diamond, GripVertical, List, ListChecks } from "lucide-react";

import { OPCOES_STATUS_TAREFA, PainelTarefa, usePessoasDoProjeto, type PessoaOpcao } from "./comum";

/* ==========================================================================
   Aba Lista — tabela ordenavel, edicao inline e reordenacao por drag (RF-10)
   ========================================================================== */

function LinhaOrdenavelTarefa({
  tarefa,
  nivel,
  temFilhos,
  expandida,
  aoAlternar,
  aoAbrir,
  aoAtualizar,
  pessoas,
}: {
  tarefa: Tarefa;
  nivel: number;
  temFilhos: boolean;
  expandida: boolean;
  aoAlternar: () => void;
  aoAbrir: () => void;
  aoAtualizar: (valores: Record<string, unknown>) => void;
  pessoas: PessoaOpcao[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id });
  const responsavel = tarefa.responsavel_detalhe;
  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: transform ? "translate3d(0, " + Math.round(transform.y) + "px, 0)" : undefined,
        transition: transition || undefined,
      }}
      onClick={aoAbrir}
      className={
        "cursor-pointer border-b border-border/70 transition-colors hover:bg-surface-2 " +
        (isDragging ? "bg-brand-soft/40 shadow-n2" : "") +
        (tarefa.atrasada ? " bg-danger-soft/25" : "")
      }
    >
      <td className="px-2 py-2">
        <span className="flex items-center gap-1" style={{ paddingLeft: nivel * 16 }}>
          <span
            {...attributes}
            {...listeners}
            onClick={(evento) => evento.stopPropagation()}
            style={{ touchAction: "none" }}
            className="cursor-grab rounded p-0.5 text-fg-subtle hover:bg-surface-3 hover:text-fg active:cursor-grabbing"
            title="Arraste para reordenar"
            aria-label="Reordenar tarefa"
          >
            <GripVertical className="size-3.5" aria-hidden />
          </span>
          {temFilhos ? (
            <button
              type="button"
              onClick={(evento) => {
                evento.stopPropagation();
                aoAlternar();
              }}
              className="grid size-4 shrink-0 place-items-center rounded text-fg-muted hover:bg-surface-3"
              aria-label={expandida ? "Recolher subtarefas" : "Expandir subtarefas"}
            >
              <span className="text-[10px] leading-none">{expandida ? "▾" : "▸"}</span>
            </button>
          ) : (
            <span className="size-4 shrink-0" aria-hidden />
          )}
          {tarefa.is_marco ? (
            <Diamond className="size-3.5 shrink-0 text-warning" aria-hidden />
          ) : (
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: tarefa.cor || "#2563EB" }} aria-hidden />
          )}
          <span className="truncate text-xs font-medium text-fg" title={tarefa.nome}>
            {tarefa.nome}
          </span>
          {tarefa.critica && <Etiqueta tom="danger">Crítica</Etiqueta>}
          {tarefa.atrasada && <Etiqueta tom="warning" icone={AlertTriangle}>Atrasada</Etiqueta>}
        </span>
      </td>
      <td className="px-2 py-2 text-2xs tabular-nums text-fg-muted">{tarefa.wbs || "—"}</td>
      <td className="px-2 py-2" onClick={(evento) => evento.stopPropagation()}>
        <select
          value={tarefa.status}
          onChange={(evento) => aoAtualizar({ status: evento.target.value })}
          aria-label={"Status de " + tarefa.nome}
          className="h-7 rounded-md border border-border-strong bg-surface px-1.5 text-2xs text-fg outline-none focus:border-brand"
        >
          {OPCOES_STATUS_TAREFA.map((item) => (
            <option key={item.valor} value={item.valor}>
              {item.rotulo}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2" onClick={(evento) => evento.stopPropagation()}>
        <select
          value={tarefa.responsavel ? String(tarefa.responsavel) : ""}
          onChange={(evento) => aoAtualizar({ responsavel: evento.target.value ? Number(evento.target.value) : null })}
          aria-label={"Responsável de " + tarefa.nome}
          className="h-7 w-36 rounded-md border border-border-strong bg-surface px-1.5 text-2xs text-fg outline-none focus:border-brand"
        >
          <option value="">Sem responsável</option>
          {pessoas.map((pessoa) => (
            <option key={pessoa.id} value={String(pessoa.id)}>
              {pessoa.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-2xs tabular-nums text-fg-muted">{dataCurta(tarefa.data_inicio)}</td>
      <td className="px-2 py-2 text-2xs tabular-nums text-fg-muted">{dataCurta(tarefa.data_fim)}</td>
      <td className="px-2 py-2 text-2xs tabular-nums text-fg-muted">{numero(Number(tarefa.esforco_estimado))} h</td>
      <td className="px-2 py-2" style={{ minWidth: 140 }}>
        <BarraProgresso valor={tarefa.percentual_conclusao} comparativo={tarefa.progresso_planejado} altura="sm" mostrarValor />
      </td>
      <td className="px-2 py-2 text-right">
        {responsavel ? (
          <Avatar nome={responsavel.nome} cor={responsavel.cor} iniciais={responsavel.iniciais} url={responsavel.avatar_display} tamanho="xs" />
        ) : (
          <span className="text-2xs text-fg-subtle">—</span>
        )}
      </td>
    </tr>
  );
}

export function AbaLista({ projetoId }: { projetoId: number }) {
  const qc = useQueryClient();
  const pessoas = usePessoasDoProjeto(projetoId);
  const { data: tarefas = [], isLoading, isError, error } = useLista<Tarefa>(CHAVES.tarefas, "/tarefas/", {
    project: projetoId,
    ordering: "ordem",
  });
  const [expandidas, setExpandidas] = useState<number[]>([]);
  const [ordenacao, setOrdenacao] = useState<{ chave: string; desc: boolean }>({ chave: "ordem", desc: false });
  const [ordemManual, setOrdemManual] = useState<number[] | null>(null);
  const [tarefaAberta, setTarefaAberta] = useState<number | null>(null);

  const porPai = useMemo(() => {
    const mapa: Record<string, Tarefa[]> = {};
    tarefas.forEach((tarefa) => {
      const chave = String(tarefa.parent || "");
      (mapa[chave] ||= []).push(tarefa);
    });
    Object.keys(mapa).forEach((chave) => {
      mapa[chave].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
    });
    return mapa;
  }, [tarefas]);

  const visiveis = useMemo(() => {
    const lista: Array<{ tarefa: Tarefa; nivel: number }> = [];
    const empilhar = (itens: Tarefa[], nivel: number) => {
      itens.forEach((tarefa) => {
        lista.push({ tarefa, nivel });
        if (expandidas.indexOf(tarefa.id) >= 0) empilhar(porPai[String(tarefa.id)] || [], nivel + 1);
      });
    };
    empilhar(porPai[""] || [], 0);
    if (ordenacao.chave === "ordem" && !ordemManual) return lista;
    const copia = lista.slice();
    copia.sort((a, b) => {
      const va = valorDe(a.tarefa, ordenacao.chave);
      const vb = valorDe(b.tarefa, ordenacao.chave);
      if (va === vb) return 0;
      const resultado = va > vb ? 1 : -1;
      return ordenacao.desc ? -resultado : resultado;
    });
    return copia;
  }, [porPai, expandidas, ordenacao, ordemManual]);

  const [ordemArrastada, setOrdemArrastada] = useState<number[] | null>(null);
  const idsVisiveis = (ordemArrastada || visiveis.map((item) => item.tarefa.id)).slice();

  const salvarTarefa = useMutacao<Record<string, unknown> & { id: number }, Tarefa>({
    metodo: "patch",
    url: (valores) => "/tarefas/" + valores.id + "/",
    invalidar: [CHAVES.tarefas, CHAVES.cronograma(projetoId), CHAVES.kanban(projetoId), CHAVES.dashboardProjeto(projetoId)],
  });

  const reordenar = useMutacao<{ itens: Array<{ id: number; ordem: number }> }, unknown>({
    url: "/tarefas/reordenar/",
    invalidar: [CHAVES.tarefas, CHAVES.cronograma(projetoId)],
    mensagemSucesso: "Ordem atualizada",
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const aoSoltar = (evento: DragEndEvent) => {
    const ativo = Number(evento.active.id);
    const sobre = evento.over ? Number(evento.over.id) : null;
    if (!sobre || ativo === sobre) return;
    const atual = idsVisiveis.slice();
    const de = atual.indexOf(ativo);
    const para = atual.indexOf(sobre);
    if (de < 0 || para < 0) return;
    const nova = arrayMove(atual, de, para);
    setOrdemArrastada(nova);
    setOrdemManual(nova);
    reordenar.mutate(
      { itens: nova.map((id, posicao) => ({ id, ordem: posicao })) },
      {
        onSuccess: () => {
          setOrdemArrastada(null);
          setOrdemManual(null);
        },
        onError: () => {
          setOrdemArrastada(null);
          setOrdemManual(null);
        },
      }
    );
  };

  if (isLoading) return <CarregandoBloco rotulo="Carregando tarefas..." />;
  if (isError) {
    return (
      <Alerta tom="danger" titulo="Não foi possível carregar as tarefas">
        {mensagemErro(error)}
      </Alerta>
    );
  }

  if (!tarefas.length) {
    return (
      <Vazio
        icone={ListChecks}
        titulo="Nenhuma tarefa cadastrada"
        descricao="Crie tarefas na aba Gantt para montar a estrutura analítica do projeto."
      />
    );
  }

  const colunas: Array<{ chave: string; titulo: string; ordenavel?: boolean; alinhar?: "right" }> = [
    { chave: "nome", titulo: "Tarefa", ordenavel: true },
    { chave: "wbs", titulo: "WBS", ordenavel: true },
    { chave: "status", titulo: "Status", ordenavel: true },
    { chave: "responsavel", titulo: "Responsável (inline)", ordenavel: true },
    { chave: "data_inicio", titulo: "Início", ordenavel: true },
    { chave: "data_fim", titulo: "Fim", ordenavel: true },
    { chave: "esforco", titulo: "Esforço", ordenavel: true },
    { chave: "progresso", titulo: "Progresso", ordenavel: true },
    { chave: "avatar", titulo: "", alinhar: "right" },
  ];

  const idsFiltrados = new Set(visiveis.map((item) => item.tarefa.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1 text-2xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
          <List className="size-3.5" aria-hidden />
          {numero(tarefas.length)} tarefa(s) · {numero(visiveis.length)} visível(is)
        </span>
        <Botao
          variante="fantasma"
          tamanho="sm"
          onClick={() => setExpandidas(expandidas.length ? [] : tarefas.filter((item) => item.tem_filhos).map((item) => item.id))}
        >
          {expandidas.length ? "Recolher tudo" : "Expandir tudo"}
        </Botao>
        <span className="ml-auto italic">
          Arraste pelo ícone à esquerda para reordenar · clique na linha para editar detalhes, checklist e dependências.
        </span>
      </div>

      <div className="overflow-x-auto rounded-sgp-lg border border-border bg-surface p-2 shadow-n1 scroll-thin">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {colunas.map((coluna) => (
                  <th
                    key={coluna.chave}
                    className={
                      "px-2 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted " +
                      (coluna.alinhar === "right" ? "text-right" : "text-left") +
                      (coluna.ordenavel ? " cursor-pointer select-none hover:text-fg" : "")
                    }
                    onClick={
                      coluna.ordenavel
                        ? () =>
                            setOrdenacao((atual) =>
                              atual.chave === coluna.chave ? { chave: coluna.chave, desc: !atual.desc } : { chave: coluna.chave, desc: false }
                            )
                        : undefined
                    }
                  >
                    {coluna.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <SortableContext items={idsVisiveis} strategy={verticalListSortingStrategy}>
              <tbody>
                {idsVisiveis
                  .filter((id) => idsFiltrados.has(id))
                  .map((id) => {
                    const item = visiveis.find((linha) => linha.tarefa.id === id);
                    if (!item) return null;
                    const filhos = porPai[String(id)] || [];
                    return (
                      <LinhaOrdenavelTarefa
                        key={id}
                        tarefa={item.tarefa}
                        nivel={item.nivel}
                        temFilhos={filhos.length > 0}
                        expandida={expandidas.indexOf(id) >= 0}
                        aoAlternar={() =>
                          setExpandidas((atual) =>
                            atual.indexOf(id) >= 0 ? atual.filter((valor) => valor !== id) : atual.concat(id)
                          )
                        }
                        aoAbrir={() => setTarefaAberta(id)}
                        aoAtualizar={(valores) => salvarTarefa.mutate({ ...valores, id })}
                        pessoas={pessoas}
                      />
                    );
                  })}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>

      <PainelTarefa
        projetoId={projetoId}
        tarefaId={tarefaAberta}
        aberto={tarefaAberta !== null}
        onFechar={() => setTarefaAberta(null)}
        opcoes={tarefas.map((tarefa) => ({ id: tarefa.id, nome: tarefa.nome }))}
      />
    </div>
  );
}

function valorDe(tarefa: Tarefa, chave: string): string | number {
  if (chave === "nome") return tarefa.nome;
  if (chave === "wbs") return tarefa.wbs || "";
  if (chave === "status") return tarefa.status;
  if (chave === "responsavel") return tarefa.responsavel_detalhe?.nome || "";
  if (chave === "data_inicio") return tarefa.data_inicio || "";
  if (chave === "data_fim") return tarefa.data_fim || "";
  if (chave === "esforco") return Number(tarefa.esforco_estimado) || 0;
  if (chave === "progresso") return tarefa.percentual_conclusao;
  return tarefa.ordem;
}

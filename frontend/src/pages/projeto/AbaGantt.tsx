import { useMemo, useState } from "react";
import { Alerta, Botao, CarregandoBloco, Interruptor } from "@/components/ui";
import { Gantt } from "@/components/gantt";
import { CHAVES, useConsulta, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { numero } from "@/lib/format";
import type { PayloadCronograma } from "@/lib/types";
import { Award, Link2, Plus, RefreshCw, Target } from "lucide-react";

import { PainelTarefa } from "./comum";

/* ==========================================================================
   Aba Gantt — cronograma interativo com reagendamento (UC-02)
   ========================================================================== */

export function AbaGantt({ projetoId }: { projetoId: number }) {
  const cronograma = useConsulta<PayloadCronograma>(
    CHAVES.cronograma(projetoId),
    "/projetos/" + projetoId + "/cronograma/"
  );
  const [zoom, setZoom] = useState(1);
  const [mostrarCritico, setMostrarCritico] = useState(true);
  const [mostrarDependencias, setMostrarDependencias] = useState(true);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [painel, setPainel] = useState<{ aberto: boolean; tarefaId: number | null }>({ aberto: false, tarefaId: null });

  const reagendar = useMutacao<{ id: number; data_inicio: string; data_fim: string }, unknown>({
    url: (valores) => "/tarefas/" + valores.id + "/reagendar/",
    invalidar: [CHAVES.cronograma(projetoId), CHAVES.kanban(projetoId), CHAVES.dashboardProjeto(projetoId)],
    mensagemSucesso: "Tarefa reagendada",
  });

  const { data, isLoading, isError, error, refetch } = cronograma;

  const opcoes = useMemo(
    () => (data?.tarefas ?? []).map((tarefa) => ({ id: tarefa.id, nome: tarefa.nome })),
    [data]
  );

  if (isLoading) return <CarregandoBloco rotulo="Montando o cronograma..." />;
  if (isError || !data) {
    return (
      <Alerta tom="danger" titulo="Não foi possível carregar o cronograma">
        {mensagemErro(error)}
      </Alerta>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <Botao variante="primario" icone={Plus} tamanho="sm" onClick={() => setPainel({ aberto: true, tarefaId: null })}>
          Nova tarefa
        </Botao>
        <Botao variante="secundario" icone={RefreshCw} tamanho="sm" onClick={() => refetch()}>
          Atualizar
        </Botao>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <div className="flex items-center gap-1">
          <Botao
            variante="fantasma"
            tamanho="sm"
            onClick={() => setZoom((valor) => Math.max(0.35, Number((valor / 1.3).toFixed(2))))}
            aria-label="Reduzir zoom"
          >
            −
          </Botao>
          <span className="w-12 text-center text-2xs font-semibold tabular-nums text-fg-muted">
            {Math.round(zoom * 100)}%
          </span>
          <Botao
            variante="fantasma"
            tamanho="sm"
            onClick={() => setZoom((valor) => Math.min(3, Number((valor * 1.3).toFixed(2))))}
            aria-label="Aumentar zoom"
          >
            +
          </Botao>
        </div>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Interruptor ativo={mostrarCritico} onChange={setMostrarCritico} rotulo="Caminho crítico" tamanho="sm" />
        <Interruptor ativo={mostrarDependencias} onChange={setMostrarDependencias} rotulo="Dependências" tamanho="sm" />
        <div className="ml-auto flex flex-wrap items-center gap-3 text-2xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="size-3" aria-hidden />
            {numero(data.dependencias.length)} dependência(s)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Target className="size-3" aria-hidden />
            {numero(data.caminho_critico.length)} tarefa(s) crítica(s)
          </span>
          {data.baseline && (
            <span className="inline-flex items-center gap-1.5">
              <Award className="size-3" aria-hidden />
              Baseline: {data.baseline.nome}
            </span>
          )}
        </div>
      </div>

      <Gantt
        tarefas={data.tarefas}
        dependencias={data.dependencias}
        marcos={data.marcos}
        zoom={zoom}
        mostrarCritico={mostrarCritico}
        mostrarDependencias={mostrarDependencias}
        selecionada={selecionada}
        aoSelecionar={(tarefaId) => {
          setSelecionada(tarefaId);
          setPainel({ aberto: true, tarefaId });
        }}
        aoReagendar={(tarefaId, inicio, fim) =>
          reagendar.mutate(
            { id: tarefaId, data_inicio: inicio, data_fim: fim },
            { onSuccess: () => refetch() }
          )
        }
        alturaMaxima={620}
      />

      <PainelTarefa
        projetoId={projetoId}
        tarefaId={painel.tarefaId}
        aberto={painel.aberto}
        onFechar={() => setPainel({ aberto: false, tarefaId: null })}
        opcoes={opcoes}
      />
    </div>
  );
}

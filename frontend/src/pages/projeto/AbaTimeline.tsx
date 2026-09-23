import { useMemo, useState } from "react";
import { Alerta, CarregandoBloco } from "@/components/ui";
import { Timeline, type ItemTimeline } from "@/components/timeline";
import { CHAVES, useConsulta } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { numero, percentual } from "@/lib/format";
import type { PayloadCronograma } from "@/lib/types";
import { Activity } from "lucide-react";

import { PainelTarefa } from "./comum";

/* ==========================================================================
   Aba Timeline — uma linha por tarefa, agrupada por fase (DV-02)
   ========================================================================== */

export function AbaTimeline({ projetoId }: { projetoId: number }) {
  const cronograma = useConsulta<PayloadCronograma>(CHAVES.cronograma(projetoId), "/projetos/" + projetoId + "/cronograma/");
  const [tarefaAberta, setTarefaAberta] = useState<number | null>(null);

  const itens = useMemo<ItemTimeline[]>(() => {
    const tarefas = cronograma.data?.tarefas ?? [];
    const mapa = new Map(tarefas.map((tarefa) => [tarefa.id, tarefa]));
    return tarefas.map((tarefa) => {
      const pai = tarefa.parent ? mapa.get(tarefa.parent) : undefined;
      return {
        id: tarefa.id,
        codigo: tarefa.wbs || "Tarefa",
        nome: tarefa.nome,
        cor: tarefa.cor || "#2563EB",
        inicio: tarefa.inicio,
        fim: tarefa.fim,
        saude: tarefa.atrasada ? "VERMELHO" : tarefa.status === "CONCLUIDA" ? "VERDE" : tarefa.critica ? "AMARELO" : "CINZA",
        status_rotulo: tarefa.status_rotulo || tarefa.status,
        percentual: tarefa.percentual,
        progresso_planejado: tarefa.progresso_planejado || 0,
        gerente: tarefa.responsavel_nome || "",
        programa: pai ? pai.nome : "Nível raiz",
        atrasado: Boolean(tarefa.atrasada),
        orcamento: 0,
        tarefas: tarefa.total_subtarefas,
        marcos: [],
        onClick: () => setTarefaAberta(tarefa.id),
      };
    });
  }, [cronograma.data]);

  if (cronograma.isLoading) return <CarregandoBloco rotulo="Montando a timeline do projeto..." />;
  if (cronograma.isError) {
    return (
      <Alerta tom="danger" titulo="Não foi possível carregar a timeline">
        {mensagemErro(cronograma.error)}
      </Alerta>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1 text-2xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5 font-semibold text-fg">
          <Activity className="size-3.5" aria-hidden />
          {numero(itens.length)} tarefa(s) na linha do tempo
        </span>
        <span className="ml-auto italic">Agrupadas por fase (tarefa pai) · clique em uma barra para editar a tarefa.</span>
      </div>
      <Timeline itens={itens} zoomInicial={1} mostrarMarcos={false} agruparPor={(item) => item.programa} />
      <PainelTarefa
        projetoId={projetoId}
        tarefaId={tarefaAberta}
        aberto={tarefaAberta !== null}
        onFechar={() => setTarefaAberta(null)}
        opcoes={(cronograma.data?.tarefas ?? []).map((tarefa) => ({ id: tarefa.id, nome: tarefa.nome }))}
      />
    </div>
  );
}

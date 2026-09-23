import { useMemo, useState } from "react";
import { Alerta, Botao, CarregandoBloco } from "@/components/ui";
import { CHAVES, useConsulta, useLista } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { DIAS_SEMANA, MESES, hojeISO, numero } from "@/lib/format";
import type { EventoCalendario, Tarefa } from "@/lib/types";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";

import { PainelTarefa } from "./comum";

interface RespostaCalendario {
  inicio: string;
  fim: string;
  eventos: EventoCalendario[];
}

/* ==========================================================================
   Aba Calendario — grade mensal com tarefas e marcos (RF-12)
   ========================================================================== */

function paraISO(data: Date) {
  return (
    data.getFullYear() +
    "-" +
    String(data.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(data.getDate()).padStart(2, "0")
  );
}

export function AbaCalendario({ projetoId }: { projetoId: number }) {
  const [referencia, setReferencia] = useState(() => {
    const hoje = hojeISO();
    const partes = hoje.split("-").map(Number);
    return paraISO(new Date(partes[0], partes[1] - 1, 1));
  });
  const [tarefaAberta, setTarefaAberta] = useState<number | null>(null);

  const partes = referencia.split("-").map(Number);
  const ano = partes[0];
  const mes = partes[1] - 1;
  const primeiro = new Date(ano, mes, 1);
  const ultimo = new Date(ano, mes + 1, 0);
  const inicio = paraISO(primeiro);
  const fim = paraISO(ultimo);

  const { data, isLoading, isError, error } = useConsulta<RespostaCalendario>(
    CHAVES.calendario,
    "/tarefas/calendario/",
    { inicio, fim, project: projetoId }
  );

  const deslocamento = (primeiro.getDay() + 6) % 7;
  const celulas = useMemo(() => {
    const lista: Array<{ iso: string; doMes: boolean }> = [];
    const base = new Date(ano, mes, 1 - deslocamento);
    for (let i = 0; i < 42; i += 1) {
      const dia = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      lista.push({ iso: paraISO(dia), doMes: dia.getMonth() === mes });
    }
    return lista;
  }, [ano, mes, deslocamento]);

  const eventos = data?.eventos ?? [];
  const tarefasDoProjeto = useLista<Tarefa>(CHAVES.tarefas, "/tarefas/", { project: projetoId });

  const mudarMes = (delta: number) => {
    const novo = new Date(ano, mes + delta, 1);
    setReferencia(paraISO(novo));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <div className="flex items-center gap-2">
          <Botao variante="fantasma" tamanho="sm" icone={ChevronLeft} onClick={() => mudarMes(-1)} aria-label="Mês anterior">
            Anterior
          </Botao>
          <span className="min-w-40 text-center text-sm font-semibold text-fg">
            {MESES[mes]} de {ano}
          </span>
          <Botao variante="fantasma" tamanho="sm" iconeDireita={ChevronRight} onClick={() => mudarMes(1)} aria-label="Próximo mês">
            Próximo
          </Botao>
          <Botao
            variante="secundario"
            tamanho="sm"
            onClick={() => {
              const hoje = hojeISO();
              const partesHoje = hoje.split("-").map(Number);
              setReferencia(paraISO(new Date(partesHoje[0], partesHoje[1] - 1, 1)));
            }}
          >
            Hoje
          </Botao>
        </div>
        <div className="flex items-center gap-3 text-2xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-brand" aria-hidden />
            Tarefas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Flag className="size-3 text-warning" aria-hidden />
            Marcos
          </span>
          <span>{numero(eventos.length)} evento(s) no mês</span>
        </div>
      </div>

      {isLoading && <CarregandoBloco rotulo="Carregando calendário..." />}
      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o calendário">
          {mensagemErro(error)}
        </Alerta>
      )}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n1">
          <div className="grid grid-cols-7 border-b border-border bg-surface-2">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="px-2 py-1.5 text-center text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celulas.map((celula) => {
              const doDia = eventos.filter((evento) => evento.inicio && evento.fim && evento.inicio <= celula.iso && evento.fim >= celula.iso);
              const eHoje = celula.iso === hojeISO();
              return (
                <div
                  key={celula.iso}
                  className={
                    "min-h-24 border-b border-r border-border/70 p-1.5 align-top last:border-r-0 " +
                    (celula.doMes ? "bg-surface" : "bg-surface-2/60") +
                    (eHoje ? " ring-1 ring-inset ring-brand" : "")
                  }
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={"text-2xs font-semibold tabular-nums " + (celula.doMes ? "text-fg" : "text-fg-subtle")}>
                      {celula.iso.slice(8, 10)}
                    </span>
                    {doDia.length > 3 && <span className="text-2xs text-fg-subtle">+{doDia.length - 3}</span>}
                  </div>
                  <div className="space-y-1">
                    {doDia.slice(0, 3).map((evento) => (
                      <button
                        key={evento.tipo + "-" + String(evento.id) + "-" + celula.iso}
                        type="button"
                        onClick={() => {
                          if (evento.tipo === "tarefa") setTarefaAberta(evento.id);
                        }}
                        title={evento.titulo + " · " + evento.projeto + (evento.responsavel ? " · " + evento.responsavel : "")}
                        className={
                          "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-2xs transition-colors hover:brightness-95 " +
                          (evento.atrasada ? "ring-1 ring-danger/60" : "")
                        }
                        style={{ backgroundColor: (evento.cor || "#2563EB") + "22", color: evento.cor || "#2563EB" }}
                      >
                        {evento.is_marco || evento.tipo === "marco" ? (
                          <Flag className="size-2.5 shrink-0" aria-hidden />
                        ) : (
                          <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: evento.cor || "#2563EB" }} aria-hidden />
                        )}
                        <span className="truncate font-medium">{evento.titulo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PainelTarefa
        projetoId={projetoId}
        tarefaId={tarefaAberta}
        aberto={tarefaAberta !== null}
        onFechar={() => setTarefaAberta(null)}
        opcoes={(tarefasDoProjeto.data ?? []).map((tarefa) => ({ id: tarefa.id, nome: tarefa.nome }))}
      />
    </div>
  );
}

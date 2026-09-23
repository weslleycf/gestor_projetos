import { useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Diamond, Flag, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dataCurta, diasEntre } from "@/lib/format";
import type { Dependencia, TarefaGantt } from "@/lib/types";

/* ==========================================================================
   Gantt interativo — arrastar para reagendar, redimensionar para ajustar
   duração, zoom e caminho crítico.  Especificação §2.3.1 / RF-03 / UC-02.
   ========================================================================== */

const LARGURA_ROTULO = 260;
const ALTURA_LINHA = 34;
const ALTURA_CABECALHO = 58;

export interface GanttProps {
  tarefas: TarefaGantt[];
  dependencias: Dependencia[];
  marcos?: Array<{ id: number; nome: string; data_prevista: string; cor: string; status: string; critico: boolean }>;
  zoom?: number;
  aoReagendar?: (tarefaId: number, inicio: string, fim: string) => void;
  aoSelecionar?: (tarefaId: number) => void;
  selecionada?: number | null;
  mostrarCritico?: boolean;
  mostrarDependencias?: boolean;
  alturaMaxima?: number;
}

function paraData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

function paraISO(data: Date) {
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return data.getFullYear() + "-" + m + "-" + d;
}

function somar(data: Date, dias: number) {
  const n = new Date(data);
  n.setDate(n.getDate() + dias);
  return n;
}

export function Gantt({
  tarefas,
  dependencias,
  marcos = [],
  zoom = 1,
  aoReagendar,
  aoSelecionar,
  selecionada,
  mostrarCritico = true,
  mostrarDependencias = true,
  alturaMaxima = 560,
}: GanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [arrasto, setArrasto] = useState<{
    id: number;
    tipo: "mover" | "inicio" | "fim";
    xInicial: number;
    inicioOriginal: string;
    fimOriginal: string;
    deslocamento: number;
  } | null>(null);
  const [previa, setPrevia] = useState<Record<number, { inicio: string; fim: string }>>({});
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const [hoverDep, setHoverDep] = useState<number | null>(null);

  const escalaDia = 4 * zoom;

  const { inicio, fim, diasTotais, meses } = useMemo(() => {
    const datas = [
      ...tarefas.flatMap((t) => [t.inicio, t.fim].filter(Boolean) as string[]),
      ...marcos.map((m) => m.data_prevista),
    ];
    if (!datas.length) {
      const hoje = new Date();
      return { inicio: hoje, fim: somar(hoje, 60), diasTotais: 60, meses: [] as Array<{ rotulo: string; dias: number }> };
    }
    const ordenadas = datas.map(paraData).sort((a, b) => a.getTime() - b.getTime());
    const primeiro = somar(ordenadas[0], -3);
    const ultimo = somar(ordenadas[ordenadas.length - 1], 5);
    const total = Math.max(14, diasEntre(paraISO(primeiro), paraISO(ultimo)));

    const listaMeses: Array<{ rotulo: string; dias: number }> = [];
    let cursor = new Date(primeiro);
    while (cursor <= ultimo) {
      const fimMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const limite = fimMes > ultimo ? somar(ultimo, 1) : fimMes;
      const dias = Math.max(1, diasEntre(paraISO(cursor), paraISO(limite)));
      listaMeses.push({
        rotulo: cursor.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        dias,
      });
      cursor = limite;
    }
    return { inicio: primeiro, fim: ultimo, diasTotais: total, meses: listaMeses };
  }, [tarefas, marcos]);

  const x = (iso: string) => diasEntre(paraISO(inicio), iso) * escalaDia;

  const visiveis = useMemo(() => {
    const porPai: Record<string, TarefaGantt[]> = {};
    const raizes: TarefaGantt[] = [];
    tarefas.forEach((t) => {
      if (t.parent) (porPai[String(t.parent)] ||= []).push(t);
      else raizes.push(t);
    });
    const resultado: Array<TarefaGantt & { profundidade: number }> = [];
    const empilhar = (lista: TarefaGantt[], profundidade: number) => {
      lista
        .slice()
        .sort((a, b) => (a.inicio || "").localeCompare(b.inicio || "") || a.id - b.id)
        .forEach((t) => {
          resultado.push({ ...t, profundidade });
          const filhos = porPai[String(t.id)];
          if (filhos && (expandidas.has(t.id) || t.total_subtarefas === 0)) {
            if (expandidas.has(t.id)) empilhar(filhos, profundidade + 1);
          }
        });
    };
    empilhar(raizes, 0);
    return resultado;
  }, [tarefas, expandidas]);

  const maxY = visiveis.length * ALTURA_LINHA;
  const hoje = paraISO(new Date());

  const iniciarArrasto = (
    evento: React.MouseEvent,
    tarefa: TarefaGantt,
    tipo: "mover" | "inicio" | "fim"
  ) => {
    if (!aoReagendar || !tarefa.inicio || !tarefa.fim || tarefa.is_marco) return;
    evento.preventDefault();
    evento.stopPropagation();
    setArrasto({
      id: tarefa.id,
      tipo,
      xInicial: evento.clientX,
      inicioOriginal: tarefa.inicio,
      fimOriginal: tarefa.fim,
      deslocamento: 0,
    });
  };

  const aoMover = (evento: React.MouseEvent) => {
    if (!arrasto) return;
    const deslocamento = Math.round((evento.clientX - arrasto.xInicial) / escalaDia);
    if (deslocamento === arrasto.deslocamento) return;
    setArrasto({ ...arrasto, deslocamento });
    const base = paraData(arrasto.inicioOriginal);
    const baseFim = paraData(arrasto.fimOriginal);
    if (arrasto.tipo === "mover") {
      setPrevia({
        [arrasto.id]: {
          inicio: paraISO(somar(base, deslocamento)),
          fim: paraISO(somar(baseFim, deslocamento)),
        },
      });
    } else if (arrasto.tipo === "inicio") {
      const novoInicio = somar(base, deslocamento);
      if (novoInicio <= baseFim) setPrevia({ [arrasto.id]: { inicio: paraISO(novoInicio), fim: arrasto.fimOriginal } });
    } else {
      const novoFim = somar(baseFim, deslocamento);
      if (novoFim >= base) setPrevia({ [arrasto.id]: { inicio: arrasto.inicioOriginal, fim: paraISO(novoFim) } });
    }
  };

  const finalizar = () => {
    if (arrasto && previa[arrasto.id] && arrasto.deslocamento !== 0) {
      aoReagendar?.(arrasto.id, previa[arrasto.id].inicio, previa[arrasto.id].fim);
    }
    setArrasto(null);
    setPrevia({});
  };

  if (!tarefas.length) {
    return (
      <div className="grid place-items-center gap-2 rounded-sgp-lg border border-dashed border-border py-16 text-center">
        <Flag className="size-8 text-fg-subtle" aria-hidden />
        <p className="text-sm font-medium text-fg">Nenhuma tarefa no cronograma</p>
        <p className="text-xs text-fg-muted">Crie tarefas para visualizá-las no Gantt.</p>
      </div>
    );
  }

  const posicaoTarefa = (t: TarefaGantt) => {
    const p = previa[t.id];
    const ini = p?.inicio || t.inicio;
    const fi = p?.fim || t.fim;
    if (!ini || !fi) return null;
    const esquerda = x(ini);
    const largura = Math.max(escalaDia, diasEntre(ini, fi) * escalaDia);
    return { esquerda, largura, ini, fi };
  };

  const mapaTarefas = new Map(tarefas.map((t) => [t.id, t]));

  return (
    <div className="overflow-hidden rounded-sgp-lg border border-border bg-surface">
      <div
        ref={containerRef}
        className="relative flex overflow-hidden select-none"
        style={{ maxHeight: alturaMaxima }}
        onMouseMove={aoMover}
        onMouseUp={finalizar}
        onMouseLeave={finalizar}
      >
        {/* Coluna fixa com os nomes */}
        <div className="z-20 shrink-0 border-r border-border bg-surface" style={{ width: LARGURA_ROTULO }}>
          <div className="sticky top-0 z-10 flex items-center border-b border-border bg-surface-2 px-3" style={{ height: ALTURA_CABECALHO }}>
            <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Estrutura analítica</span>
          </div>
          <div className="overflow-hidden" style={{ height: maxY }}>
            {visiveis.map((t) => (
              <div
                key={t.id}
                onClick={() => aoSelecionar?.(t.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 border-b border-border/60 px-2 transition-colors hover:bg-surface-2",
                  selecionada === t.id && "bg-brand-soft/40"
                )}
                style={{ height: ALTURA_LINHA, paddingLeft: 8 + t.profundidade * 14 }}
              >
                {t.total_subtarefas > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandidas((s) => {
                        const novo = new Set(s);
                        if (novo.has(t.id)) novo.delete(t.id);
                        else novo.add(t.id);
                        return novo;
                      });
                    }}
                    className="grid size-4 shrink-0 place-items-center rounded text-fg-muted hover:bg-surface-3"
                    aria-label={expandidas.has(t.id) ? "Recolher subtarefas" : "Expandir subtarefas"}
                  >
                    <span className="text-[10px] leading-none">{expandidas.has(t.id) ? "▾" : "▸"}</span>
                  </button>
                )}
                {t.is_marco ? (
                  <Diamond className="size-3 shrink-0 text-warning" aria-hidden />
                ) : (
                  <span
                    className="size-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: t.critica && mostrarCritico ? "#DC2626" : t.cor }}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "truncate text-xs",
                    t.critica && mostrarCritico ? "font-semibold text-danger" : "text-fg",
                    t.atrasada && "text-danger"
                  )}
                  title={t.nome}
                >
                  {t.nome}
                </span>
                {t.atrasada && <AlertTriangle className="size-3 shrink-0 text-danger" aria-hidden />}
              </div>
            ))}
          </div>
        </div>

        {/* Área do cronograma */}
        <div className="relative flex-1 overflow-auto scroll-thin">
          <div style={{ width: diasTotais * escalaDia + 40, minWidth: "100%" }}>
            {/* Cabeçalho de meses e dias */}
            <div className="sticky top-0 z-10 border-b border-border bg-surface-2" style={{ height: ALTURA_CABECALHO }}>
              <div className="flex h-7 border-b border-border/60">
                {meses.map((m, i) => (
                  <div
                    key={i}
                    className="flex shrink-0 items-center border-r border-border/60 px-2 text-2xs font-semibold uppercase text-fg-muted"
                    style={{ width: m.dias * escalaDia }}
                  >
                    <span className="sticky left-2 truncate">{m.rotulo}</span>
                  </div>
                ))}
              </div>
              <div className="flex h-[30px]">
                {Array.from({ length: diasTotais }).map((_, i) => {
                  const data = somar(inicio, i);
                  const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
                  const eHoje = paraISO(data) === hoje;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex shrink-0 items-center justify-center border-r border-border/30 text-[9px]",
                        fimDeSemana ? "bg-surface-3/60 text-fg-subtle" : "text-fg-subtle",
                        eHoje && "bg-brand/12 font-bold text-brand"
                      )}
                      style={{ width: escalaDia }}
                    >
                      {escalaDia >= 12 ? data.getDate() : ""}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grade + barras */}
            <div className="relative" style={{ height: maxY }}>
              {Array.from({ length: diasTotais }).map((_, i) => {
                const data = somar(inicio, i);
                const fimDeSemana = data.getDay() === 0 || data.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={cn("absolute top-0 bottom-0 border-r border-border/25", fimDeSemana && "bg-surface-3/35")}
                    style={{ left: i * escalaDia, width: escalaDia }}
                  />
                );
              })}

              {/* Linha de hoje */}
              <div
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-brand"
                style={{ left: x(hoje) }}
                title={"Hoje · " + dataCurta(hoje)}
              />

              {/* Linhas de grade horizontais */}
              {visiveis.map((_, i) => (
                <div key={i} className="absolute inset-x-0 border-b border-border/40" style={{ top: (i + 1) * ALTURA_LINHA }} />
              ))}

              {/* Conectores de dependência */}
              {mostrarDependencias && (
                <svg className="pointer-events-none absolute inset-0" width={diasTotais * escalaDia + 40} height={maxY}>
                  {dependencias.map((d) => {
                    const de = mapaTarefas.get(d.predecessor);
                    const para = mapaTarefas.get(d.successor);
                    if (!de || !para) return null;
                    const posDe = posicaoTarefa(de);
                    const posPara = posicaoTarefa(para);
                    if (!posDe || !posPara) return null;
                    const idxDe = visiveis.findIndex((v) => v.id === de.id);
                    const idxPara = visiveis.findIndex((v) => v.id === para.id);
                    if (idxDe < 0 || idxPara < 0) return null;
                    const yDe = idxDe * ALTURA_LINHA + ALTURA_LINHA / 2;
                    const yPara = idxPara * ALTURA_LINHA + ALTURA_LINHA / 2;
                    const xDe = posDe.esquerda + posDe.largura;
                    const xPara = posPara.esquerda;
                    const destacado = hoverDep === d.id;
                    const meio = xDe + Math.max(10, (xPara - xDe) / 2);
                    return (
                      <g
                        key={d.id}
                        onMouseEnter={() => setHoverDep(d.id)}
                        onMouseLeave={() => setHoverDep(null)}
                        className="pointer-events-auto"
                      >
                        <path
                          d={
                            xPara > xDe
                              ? "M" + xDe + " " + yDe + " H" + meio + " V" + yPara + " H" + xPara
                              : "M" + xDe + " " + yDe + " h10 V" + (yPara > yDe ? yPara + 12 : yPara - 12) + " H" + (xPara - 10) + " V" + yPara + " H" + xPara
                          }
                          fill="none"
                          stroke={destacado ? "#2563EB" : "var(--sgp-fg-subtle)"}
                          strokeWidth={destacado ? 2 : 1.2}
                          strokeDasharray={d.tipo === "FS" ? undefined : "4 3"}
                          markerEnd="url(#seta-dep)"
                        />
                      </g>
                    );
                  })}
                  <defs>
                    <marker id="seta-dep" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L6,3 L0,6 Z" fill="var(--sgp-fg-subtle)" />
                    </marker>
                  </defs>
                </svg>
              )}

              {/* Barras */}
              {visiveis.map((t, indice) => {
                const pos = posicaoTarefa(t);
                if (!pos) return null;
                const arrastando = arrasto?.id === t.id;
                const corBarra = t.atrasada ? "#DC2626" : t.critica && mostrarCritico ? "#B91C1C" : t.cor;
                const topo = indice * ALTURA_LINHA + 7;
                const alturaBarra = ALTURA_LINHA - 14;

                if (t.is_marco) {
                  return (
                    <div
                      key={t.id}
                      className="absolute z-[5] grid -translate-x-1/2 cursor-pointer place-items-center"
                      style={{ left: pos.esquerda, top: topo - 2 }}
                      onClick={() => aoSelecionar?.(t.id)}
                      title={t.nome + " · " + dataCurta(t.fim)}
                    >
                      <Diamond
                        className={cn("size-5 drop-shadow", selecionada === t.id && "animate-pulse")}
                        style={{ color: t.cor || "#F59E0B", fill: t.cor || "#F59E0B" }}
                        aria-hidden
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={t.id}
                    className={cn(
                      "group absolute z-[5] flex items-center rounded-md border shadow-n1 transition-shadow",
                      arrastando ? "z-20 ring-2 ring-brand shadow-n3" : "hover:shadow-n2"
                    )}
                    style={{
                      left: pos.esquerda,
                      top: topo,
                      width: pos.largura,
                      height: alturaBarra,
                      backgroundColor: corBarra + "2e",
                      borderColor: corBarra + "80",
                    }}
                    onMouseDown={(e) => iniciarArrasto(e, t, "mover")}
                    onClick={() => !arrasto && aoSelecionar?.(t.id)}
                    title={t.nome + " · " + dataCurta(pos.ini) + " → " + dataCurta(pos.fi) + " · " + t.percentual + "%"}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-l-md transition-all"
                      style={{ width: t.percentual + "%", backgroundColor: corBarra + "cc" }}
                    />
                    {!t.critica && t.status === "CONCLUIDA" && (
                      <div className="absolute inset-y-0 left-0 rounded-l-md bg-success/85" style={{ width: t.percentual + "%" }} />
                    )}
                    <span
                      className={cn(
                        "relative z-10 truncate px-2 text-2xs font-semibold",
                        t.percentual > 45 ? "text-white" : "text-fg"
                      )}
                    >
                      {pos.largura > 60 ? t.nome : ""}
                    </span>
                    {t.folga > 0 && mostrarCritico && (
                      <span
                        className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-fg-subtle/35"
                        style={{ left: "100%", width: Math.min(60, t.folga * escalaDia) }}
                        title={"Folga: " + t.folga + " dia(s)"}
                      />
                    )}
                    {aoReagendar && (
                      <>
                        <span
                          className="absolute inset-y-0 left-0 w-1.5 cursor-ew-resize rounded-l-md opacity-0 group-hover:opacity-100 bg-brand"
                          onMouseDown={(e) => iniciarArrasto(e, t, "inicio")}
                          title="Redimensionar início"
                        />
                        <span
                          className="absolute inset-y-0 right-0 w-1.5 cursor-ew-resize rounded-r-md opacity-0 group-hover:opacity-100 bg-brand"
                          onMouseDown={(e) => iniciarArrasto(e, t, "fim")}
                          title="Redimensionar fim"
                        />
                      </>
                    )}
                    {t.responsavel_nome && pos.largura > 90 && (
                      <span
                        className="absolute right-1.5 top-1/2 z-10 grid size-4 -translate-y-1/2 place-items-center rounded-full text-[8px] font-bold text-white"
                        style={{ backgroundColor: t.responsavel_cor }}
                        title={t.responsavel_nome}
                      >
                        {t.responsavel_iniciais}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Marcos na área do cronograma */}
              {marcos.map((m) => (
                <div
                  key={"marco-" + m.id}
                  className="absolute z-[6] -translate-x-1/2 cursor-help"
                  style={{ left: x(m.data_prevista), top: 2 }}
                  title={"Marco: " + m.nome + " · " + dataCurta(m.data_prevista)}
                >
                  <Flag className="size-3.5 drop-shadow" style={{ color: m.cor }} aria-hidden />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-surface-2 px-3 py-2 text-2xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-danger" /> Caminho crítico
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand" /> Hoje
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Link2 className="size-3" /> Dependência FS (linha cheia) / SS-FF (tracejada)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flag className="size-3" /> Marco
        </span>
        {aoReagendar && <span className="ml-auto italic">Arraste a barra para reagendar · arraste as bordas para redimensionar</span>}
      </footer>
    </div>
  );
}

import { useMemo, useState } from "react";
import { CalendarDays, ZoomIn, ZoomOut } from "lucide-react";
import { cn, comAlfa } from "@/lib/utils";
import { dataCurta, diasEntre } from "@/lib/format";
import { CORES_SAUDE } from "@/components/ui";

/* ==========================================================================
   Timeline macro do portfólio com zoom e faixas de período (§8.5)
   ========================================================================== */

export interface ItemTimeline {
  id: number;
  codigo: string;
  nome: string;
  cor: string;
  inicio: string | null;
  fim: string | null;
  saude: string;
  status_rotulo: string;
  percentual: number;
  progresso_planejado: number;
  gerente: string;
  programa: string;
  atrasado: boolean;
  orcamento: number;
  tarefas: number;
  marcos: Array<{ id: number; nome: string; data: string; status: string; critico: boolean }>;
  onClick?: () => void;
}

function paraData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

function somar(data: Date, dias: number) {
  const n = new Date(data);
  n.setDate(n.getDate() + dias);
  return n;
}

function iso(data: Date) {
  return data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0") + "-" + String(data.getDate()).padStart(2, "0");
}

export function Timeline({
  itens,
  zoomInicial = 1,
  mostrarMarcos = true,
  agruparPor,
}: {
  itens: ItemTimeline[];
  zoomInicial?: number;
  mostrarMarcos?: boolean;
  agruparPor?: (item: ItemTimeline) => string;
}) {
  const [zoom, setZoom] = useState(zoomInicial);
  const [expandido, setExpandido] = useState<number | null>(null);

  const { inicio, fim, dias, meses } = useMemo(() => {
    const datas = itens.flatMap((i) => [i.inicio, i.fim].filter(Boolean) as string[]);
    if (!datas.length) {
      const hoje = new Date();
      return { inicio: hoje, fim: somar(hoje, 365), dias: 365, meses: [] as Array<{ rotulo: string; dias: number; ano: number }> };
    }
    const ordenadas = datas.map(paraData).sort((a, b) => a.getTime() - b.getTime());
    const primeiro = somar(ordenadas[0], -10);
    const ultimo = somar(ordenadas[ordenadas.length - 1], 10);
    const total = Math.max(30, diasEntre(iso(primeiro), iso(ultimo)));
    const lista: Array<{ rotulo: string; dias: number; ano: number }> = [];
    let cursor = new Date(primeiro.getFullYear(), primeiro.getMonth(), 1);
    while (cursor <= ultimo) {
      const proximo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const de = cursor < primeiro ? primeiro : cursor;
      const ate = proximo > ultimo ? somar(ultimo, 1) : proximo;
      lista.push({
        rotulo: cursor.toLocaleDateString("pt-BR", { month: "short" }),
        ano: cursor.getFullYear(),
        dias: Math.max(1, diasEntre(iso(de), iso(ate))),
      });
      cursor = proximo;
    }
    return { inicio: primeiro, fim: ultimo, dias: total, meses: lista };
  }, [itens]);

  const dia = 2.2 * zoom;
  const largura = dias * dia;
  const mesesVisiveis = zoom < 0.55 ? meses.filter((_, i) => i % 3 === 0) : meses;

  const grupos = useMemo(() => {
    if (!agruparPor) return { "": itens };
    return itens.reduce<Record<string, ItemTimeline[]>>((acc, item) => {
      const chave = agruparPor(item) || "Sem agrupamento";
      (acc[chave] ||= []).push(item);
      return acc;
    }, {});
  }, [itens, agruparPor]);

  const posX = (dataIso: string) => diasEntre(iso(inicio), dataIso) * dia;

  if (!itens.length) {
    return (
      <div className="grid place-items-center gap-2 rounded-sgp-lg border border-dashed border-border py-16">
        <CalendarDays className="size-8 text-fg-subtle" aria-hidden />
        <p className="text-sm font-medium text-fg">Nenhum projeto no período</p>
        <p className="text-xs text-fg-muted">Ajuste os filtros para visualizar a timeline.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sgp-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-3 py-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
          {itens.length} projeto(s) · {dataCurta(iso(inicio))} → {dataCurta(iso(fim))}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.25, z / 1.4))}
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-3 hover:text-fg"
            aria-label="Reduzir zoom"
          >
            <ZoomOut className="size-3.5" aria-hidden />
          </button>
          <span className="w-10 text-center text-2xs font-semibold tabular-nums text-fg-muted">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(6, z * 1.4))}
            className="rounded-md p-1.5 text-fg-muted hover:bg-surface-3 hover:text-fg"
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex max-h-[600px] overflow-auto scroll-thin">
        <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-surface" style={{ width: 250 }}>
          <div className="h-9 border-b border-border bg-surface-2 px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
            Projeto
          </div>
          {Object.entries(grupos).map(([grupo, lista]) => (
            <div key={grupo}>
              {agruparPor && (
                <div className="border-b border-border bg-surface-3/60 px-3 py-1 text-2xs font-bold uppercase tracking-wide text-fg-muted">
                  {grupo} · {lista.length}
                </div>
              )}
              {lista.map((item) => (
                <div
                  key={item.id}
                  onClick={item.onClick}
                  className={cn(
                    "flex h-11 cursor-pointer items-center gap-2 border-b border-border/60 px-3 transition-colors hover:bg-surface-2",
                    expandido === item.id && "bg-brand-soft/30"
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.cor }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-fg" title={item.nome}>
                      {item.nome}
                    </p>
                    <p className="truncate text-2xs text-fg-subtle">
                      {item.codigo} · {item.gerente}
                    </p>
                  </div>
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: CORES_SAUDE[item.saude]?.cor || "#94A3B8" }}
                    title={CORES_SAUDE[item.saude]?.rotulo}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ width: largura, minWidth: "100%" }} className="relative">
          <div className="sticky top-0 z-10 border-b border-border bg-surface-2">
            <div className="flex h-5">
              {mesesVisiveis.map((m, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r border-border/50 px-1 text-2xs font-semibold text-fg-muted"
                  style={{ width: m.dias * dia * (zoom < 0.55 ? 3 : 1) }}
                >
                  {m.ano}
                </div>
              ))}
            </div>
            <div className="flex h-4">
              {mesesVisiveis.map((m, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r border-border/50 px-1 text-2xs uppercase text-fg-subtle"
                  style={{ width: m.dias * dia * (zoom < 0.55 ? 3 : 1) }}
                >
                  {m.rotulo}
                </div>
              ))}
            </div>
          </div>

          <div className="relative" style={{ height: Object.values(grupos).reduce((a, l) => a + l.length, 0) * 44 + Object.keys(grupos).length * 20 }}>
            <div className="absolute inset-y-0 w-0.5 bg-brand" style={{ left: posX(iso(new Date())) }} title="Hoje" />

            {Object.entries(grupos).map(([grupo, lista], indiceGrupo) => (
              <div key={grupo}>
                {agruparPor && <div className="h-5 border-b border-border bg-surface-3/60" />}
                {lista.map((item, i) => {
                  const topo = Object.entries(grupos)
                    .slice(0, indiceGrupo)
                    .reduce((a, [, l]) => a + l.length, 0) * 44 + indiceGrupo * 20 + i * 44 + 6;
                  return (
                    <div
                      key={item.id}
                      className="absolute inset-x-0 h-11 border-b border-border/50"
                      style={{ top: topo - 6 }}
                    >
                      {item.inicio && item.fim && (
                        <div
                          className={cn(
                            "group absolute top-2 flex h-7 cursor-pointer items-center rounded-md border shadow-n1 transition-all hover:shadow-n2 hover:z-10",
                            item.atrasado && "ring-1 ring-danger/60"
                          )}
                          style={{
                            left: posX(item.inicio),
                            width: Math.max(12, diasEntre(item.inicio, item.fim) * dia),
                            backgroundColor: comAlfa(item.cor, 0.22),
                            borderColor: comAlfa(item.cor, 0.55),
                          }}
                          onClick={() => setExpandido((v) => (v === item.id ? null : item.id))}
                          title={item.nome + " · " + item.status_rotulo + " · " + item.percentual + "%"}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-l-md"
                            style={{ width: item.percentual + "%", backgroundColor: comAlfa(item.cor, 0.75) }}
                          />
                          <span className="relative z-10 truncate px-2 text-2xs font-semibold text-fg">
                            {diasEntre(item.inicio, item.fim) * dia > 90 ? item.nome : ""}
                          </span>
                          {mostrarMarcos &&
                            item.marcos.map((m) => (
                              <span
                                key={m.id}
                                className="absolute -top-1 z-10 size-2 rotate-45"
                                style={{ left: posX(m.data) - posX(item.inicio ?? iso(inicio)), backgroundColor: m.critico ? "#DC2626" : "#F59E0B" }}
                                title={"Marco: " + m.nome + " · " + dataCurta(m.data)}
                              />
                            ))}
                        </div>
                      )}
                      {expandido === item.id && (
                        <div
                          className="absolute top-10 z-30 w-64 rounded-sgp border border-border bg-surface p-3 shadow-n3 animate-entrada"
                          style={{ left: Math.max(4, posX(item.inicio || iso(inicio))) }}
                        >
                          <p className="text-xs font-semibold text-fg">{item.nome}</p>
                          <dl className="mt-2 space-y-1 text-2xs">
                            <div className="flex justify-between">
                              <dt className="text-fg-muted">Programa</dt>
                              <dd className="font-medium text-fg">{item.programa || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-fg-muted">Gerente</dt>
                              <dd className="font-medium text-fg">{item.gerente || "—"}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-fg-muted">Progresso</dt>
                              <dd className="font-medium tabular-nums text-fg">
                                {item.percentual}% <span className="text-fg-subtle">/ {item.progresso_planejado.toFixed(0)}%</span>
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-fg-muted">Tarefas</dt>
                              <dd className="font-medium tabular-nums text-fg">{item.tarefas}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

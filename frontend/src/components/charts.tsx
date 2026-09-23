import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { comAlfa, cn, corPorValor } from "@/lib/utils";
import { numero, percentual } from "@/lib/format";
import { geometriaLinha, larguraUtilizavel } from "@/lib/graficos";
import { AjudaInline, BotaoExplicacao } from "@/components/explicacao";

/* ==========================================================================
   Medição do contêiner
   --------------------------------------------------------------------------
   Os gráficos que ocupam toda a largura disponível eram desenhados em um
   viewBox de 100 unidades com preserveAspectRatio="none". Isso estica o
   desenho horizontalmente: um círculo de raio 2 vira um traço de ~28px de
   largura por 2px de altura. Medindo o contêiner e desenhando em pixels
   reais, círculos continuam círculos, raios de canto continuam iguais e as
   espessuras de linha ficam previsíveis.
   ========================================================================== */

function useLargura(minimo = 160) {
  const referencia = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) return;

    const medir = () => {
      const medida = larguraUtilizavel(elemento.getBoundingClientRect().width, minimo);
      setLargura((anterior) => (Math.abs(anterior - medida) < 1 ? anterior : medida));
    };

    medir();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", medir);
      return () => window.removeEventListener("resize", medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [minimo]);

  return [referencia, largura] as const;
}

/* ==========================================================================
   Primitivas compartilhadas
   ========================================================================== */

export interface Serie {
  nome: string;
  cor: string;
  dados: number[];
  tracejada?: boolean;
  area?: boolean;
}

interface DicaEstado {
  x: number;
  y: number;
  conteudo: ReactNode;
}

function DicaFlutuante({ dica }: { dica: DicaEstado | null }) {
  if (!dica) return null;
  return (
    <div
      className="pointer-events-none absolute z-30 w-max max-w-64 -translate-x-1/2 -translate-y-full rounded-sgp border border-border bg-surface px-2.5 py-1.5 text-2xs shadow-n3"
      style={{ left: dica.x, top: dica.y - 8 }}
    >
      {dica.conteudo}
    </div>
  );
}

function Legenda({ series, className }: { series: Array<{ nome: string; cor: string; tracejada?: boolean }>; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {series.map((s) => (
        <span key={s.nome} className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
          <span
            className="h-0.5 w-4 rounded-full"
            style={{
              backgroundColor: s.tracejada ? "transparent" : s.cor,
              borderTop: s.tracejada ? "2px dashed " + s.cor : undefined,
            }}
          />
          {s.nome}
        </span>
      ))}
    </div>
  );
}

/* ==========================================================================
   Donut / rosca
   ========================================================================== */

export interface FatiaDonut {
  rotulo: string;
  valor: number;
  cor: string;
  icone?: string;
}

export function GraficoDonut({
  fatias,
  tamanho = 168,
  espessura = 22,
  centroRotulo,
  centroValor,
  legenda = true,
  unidade = "",
}: {
  fatias: FatiaDonut[];
  tamanho?: number;
  espessura?: number;
  centroRotulo?: string;
  centroValor?: ReactNode;
  legenda?: boolean;
  unidade?: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const total = fatias.reduce((a, f) => a + f.valor, 0);
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <div className="relative" style={{ width: tamanho, height: tamanho }}>
        <svg width={tamanho} height={tamanho} className="-rotate-90">
          <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" stroke="var(--sgp-surface-3)" strokeWidth={espessura} />
          {total > 0 &&
            fatias.map((f, i) => {
              const fracao = f.valor / total;
              const dash = circunferencia * fracao;
              const offset = circunferencia * acumulado;
              acumulado += fracao;
              if (f.valor === 0) return null;
              return (
                <circle
                  key={f.rotulo}
                  cx={tamanho / 2}
                  cy={tamanho / 2}
                  r={raio}
                  fill="none"
                  stroke={f.cor}
                  strokeWidth={ativo === i ? espessura + 4 : espessura}
                  strokeDasharray={dash + " " + (circunferencia - dash)}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setAtivo(i)}
                  onMouseLeave={() => setAtivo(null)}
                  opacity={ativo === null || ativo === i ? 1 : 0.35}
                >
                  <title>{f.rotulo + ": " + f.valor + unidade + " (" + percentual(total ? (f.valor / total) * 100 : 0, 1) + ")"}</title>
                </circle>
              );
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-bold tabular-nums text-fg">
              {ativo !== null ? fatias[ativo].valor : (centroValor ?? total)}
            </p>
            <p className="max-w-24 text-2xs leading-tight text-fg-muted">
              {ativo !== null ? fatias[ativo].rotulo : (centroRotulo ?? "total")}
            </p>
          </div>
        </div>
      </div>
      {legenda && (
        <ul className="flex min-w-40 flex-1 flex-col gap-1.5">
          {fatias.map((f, i) => (
            <li
              key={f.rotulo}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md px-2 py-1 transition-colors",
                ativo === i && "bg-surface-2"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: f.cor }} />
                <span className="truncate text-xs text-fg">{f.rotulo}</span>
              </span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-fg-muted">
                {f.valor}
                {unidade}
                <span className="ml-1.5 opacity-60">{total ? ((f.valor / total) * 100).toFixed(0) : 0}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ==========================================================================
   Barras (verticais, horizontais e comparativas)
   ========================================================================== */

export interface BarraItem {
  rotulo: string;
  valor: number;
  cor?: string;
  comparativo?: number;
  meta?: number;
}

export function GraficoBarras({
  itens,
  altura = 200,
  horizontal,
  formatarValor = (v: number) => numero(v),
  mostrarEixo = true,
  empilhadoCor,
  larguraBarra,
}: {
  itens: BarraItem[];
  altura?: number;
  horizontal?: boolean;
  formatarValor?: (v: number) => string;
  mostrarEixo?: boolean;
  empilhadoCor?: string;
  larguraBarra?: number;
}) {
  if (!itens.length) return <p className="py-8 text-center text-xs text-fg-muted">Sem dados para exibir.</p>;

  if (horizontal) {
    const maximo = Math.max(...itens.map((i) => Math.max(i.valor, i.comparativo ?? 0)), 1);
    return (
      <div className="flex flex-col gap-2.5">
        {itens.map((item) => (
          <div key={item.rotulo} className="group">
            <div className="mb-1 flex items-center justify-between gap-2 text-2xs">
              <span className="truncate font-medium text-fg">{item.rotulo}</span>
              <span className="shrink-0 tabular-nums text-fg-muted">{formatarValor(item.valor)}</span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
              {item.comparativo !== undefined && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-fg-subtle/30"
                  style={{ width: (item.comparativo / maximo) * 100 + "%" }}
                  title={"Comparativo: " + formatarValor(item.comparativo)}
                />
              )}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{ width: (item.valor / maximo) * 100 + "%", backgroundColor: item.cor || "#2563EB" }}
              />
              {item.meta !== undefined && (
                <div className="absolute inset-y-0 w-0.5 bg-fg" style={{ left: (item.meta / maximo) * 100 + "%" }} title={"Meta: " + formatarValor(item.meta)} />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const [referencia, largura] = useLargura();
  const maximo = Math.max(...itens.map((i) => Math.max(i.valor, i.comparativo ?? 0, i.meta ?? 0)), 1) * 1.1;
  const larguraColuna = largura / Math.max(1, itens.length);
  // larguraBarra é expressa em pontos percentuais da largura total, como antes.
  const larguraEfetiva = larguraBarra ? (larguraBarra / 100) * largura : larguraColuna * 0.62;

  return (
    <div className="w-full">
      <div ref={referencia} className="w-full" style={{ height: altura }}>
        {largura > 0 && (
          <svg width={largura} height={altura} viewBox={"0 0 " + largura + " " + altura} className="block">
            {mostrarEixo &&
              [0, 0.25, 0.5, 0.75, 1].map((f) => (
                <line
                  key={f}
                  x1={0}
                  x2={largura}
                  y1={altura - f * altura}
                  y2={altura - f * altura}
                  stroke="var(--sgp-border)"
                  strokeWidth={1}
                  strokeDasharray={f === 0 ? undefined : "3 3"}
                />
              ))}
            {itens.map((item, i) => {
              const x = i * larguraColuna;
              const xBarra = x + (larguraColuna - larguraEfetiva) / 2;
              const h = (item.valor / maximo) * altura;
              const hComp = item.comparativo !== undefined ? (item.comparativo / maximo) * altura : 0;
              const comComparativo = item.comparativo !== undefined;
              return (
                <g key={item.rotulo}>
                  {comComparativo && (
                    <rect
                      x={xBarra}
                      y={altura - hComp}
                      width={larguraEfetiva}
                      height={hComp}
                      fill={comAlfa(empilhadoCor || "#94A3B8", 0.35)}
                      rx={3}
                    />
                  )}
                  <rect
                    x={comComparativo ? xBarra + larguraEfetiva * 0.55 : xBarra}
                    y={altura - h}
                    width={comComparativo ? larguraEfetiva * 0.45 : larguraEfetiva}
                    height={Math.max(h, 2)}
                    fill={item.cor || "#2563EB"}
                    rx={3}
                    className="transition-all duration-500"
                  >
                    <title>{item.rotulo + ": " + formatarValor(item.valor)}</title>
                  </rect>
                  {item.meta !== undefined && (
                    <line
                      x1={xBarra - 2}
                      x2={xBarra + larguraEfetiva + 2}
                      y1={altura - (item.meta / maximo) * altura}
                      y2={altura - (item.meta / maximo) * altura}
                      stroke="var(--sgp-fg)"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <div className="mt-1 flex">
        {itens.map((item) => (
          <span
            key={item.rotulo}
            className="truncate px-0.5 text-center text-2xs text-fg-muted"
            style={{ width: largura > 0 ? larguraColuna + "px" : undefined }}
            title={item.rotulo}
          >
            {item.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Linhas e áreas (curva S, burndown, evolução)
   ========================================================================== */

export function GraficoLinha({
  rotulos,
  series,
  altura = 240,
  formatarValor = (v: number) => numero(v, 0),
  mostrarLegenda = true,
  mostrarArea,
  larguraRotulo = 8,
  marcadorIndice,
  aoClicarPonto,
}: {
  rotulos: string[];
  series: Serie[];
  altura?: number;
  formatarValor?: (v: number) => string;
  mostrarLegenda?: boolean;
  mostrarArea?: boolean;
  larguraRotulo?: number;
  marcadorIndice?: number;
  aoClicarPonto?: (indice: number, serie: string) => void;
}) {
  const [dica, setDica] = useState<DicaEstado | null>(null);
  const [indiceAtivo, setIndiceAtivo] = useState<number | null>(null);

  const { maximo, minimo } = useMemo(() => {
    const valores = series.flatMap((s) => s.dados).filter((v) => Number.isFinite(v));
    const max = valores.length ? Math.max(...valores) : 1;
    const min = valores.length ? Math.min(...valores, 0) : 0;
    return { maximo: max * 1.08 || 1, minimo: min < 0 ? min * 1.08 : 0 };
  }, [series]);

  if (!rotulos.length || !series.length) {
    return <p className="py-8 text-center text-xs text-fg-muted">Sem dados para exibir.</p>;
  }

  const [referencia, largura] = useLargura();
  const { L, T, alturaUtil, base, x, y } = geometriaLinha({
    largura,
    altura,
    larguraRotulo,
    quantidade: rotulos.length,
    maximo,
    minimo,
  });

  const caminho = (dados: number[]) => dados.map((v, i) => (i === 0 ? "M" : "L") + x(i).toFixed(2) + " " + y(v).toFixed(2)).join(" ");
  const area = (dados: number[]) =>
    caminho(dados) + " L" + x(dados.length - 1).toFixed(2) + " " + base + " L" + x(0).toFixed(2) + " " + base + " Z";

  const passoRotulo = Math.max(1, Math.ceil(rotulos.length / 10));

  return (
    <div className="w-full">
      <div ref={referencia} className="relative w-full" style={{ height: altura }}>
      {largura > 0 && (
      <svg width={largura} height={altura} viewBox={"0 0 " + largura + " " + altura} className="block">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={"grad-" + i + "-" + s.nome.replace(/\W/g, "")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.cor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.cor} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={L}
            x2={largura}
            y1={T + alturaUtil * f}
            y2={T + alturaUtil * f}
            stroke="var(--sgp-border)"
            strokeWidth={1}
            strokeDasharray={f === 1 ? undefined : "3 3"}
          />
        ))}

        {series.map((s, i) =>
          mostrarArea || s.area ? (
            <path key={"area-" + i} d={area(s.dados)} fill={"url(#grad-" + i + "-" + s.nome.replace(/\W/g, "") + ")"} />
          ) : null
        )}

        {series.map((s, i) => (
          <path
            key={"linha-" + i}
            d={caminho(s.dados)}
            fill="none"
            stroke={s.cor}
            strokeWidth={2}
            strokeDasharray={s.tracejada ? "5 4" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {marcadorIndice !== undefined && marcadorIndice >= 0 && marcadorIndice < rotulos.length && (
          <line
            x1={x(marcadorIndice)}
            x2={x(marcadorIndice)}
            y1={T}
            y2={base}
            stroke="var(--sgp-brand)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {indiceAtivo !== null && (
          <line x1={x(indiceAtivo)} x2={x(indiceAtivo)} y1={T} y2={base} stroke="var(--sgp-fg-subtle)" strokeWidth={1} />
        )}

        {series.map((s, i) =>
          s.dados.map((v, j) => {
            const ativo = indiceAtivo === j;
            return (
              <g key={i + "-" + j}>
                {/* Área de captura maior que o ponto visível, para facilitar o hover */}
                <circle
                  cx={x(j)}
                  cy={y(v)}
                  r={11}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setIndiceAtivo(j);
                    setDica({
                      x: x(j),
                      y: y(v),
                      conteudo: (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-fg">{rotulos[j]}</p>
                          <p className="flex items-center gap-1.5">
                            <span className="size-2 rounded-sm" style={{ backgroundColor: s.cor }} />
                            {s.nome}: <strong className="tabular-nums">{formatarValor(v)}</strong>
                          </p>
                        </div>
                      ),
                    });
                  }}
                  onMouseLeave={() => {
                    setIndiceAtivo(null);
                    setDica(null);
                  }}
                  onClick={() => aoClicarPonto?.(j, s.nome)}
                />
                <circle
                  cx={x(j)}
                  cy={y(v)}
                  r={ativo ? 4.5 : 2.6}
                  fill={s.cor}
                  stroke="var(--sgp-surface)"
                  strokeWidth={1.5}
                  className="pointer-events-none transition-all duration-150"
                />
              </g>
            );
          })
        )}
      </svg>
      )}

      <DicaFlutuante dica={dica} />
      </div>

      <div className="flex" style={{ paddingLeft: L + "px" }}>
        {rotulos.map((r, i) => (
          <span
            key={i}
            className="flex-1 truncate text-2xs text-fg-muted"
            style={{ textAlign: i === 0 ? "left" : i === rotulos.length - 1 ? "right" : "center" }}
          >
            {i % passoRotulo === 0 ? r : ""}
          </span>
        ))}
      </div>

      {mostrarLegenda && <Legenda series={series} className="mt-2" />}
    </div>
  );
}

/* ==========================================================================
   Medidor (gauge) para CPI/SPI
   ========================================================================== */

export function Medidor({
  valor,
  titulo,
  meta = 1,
  tamanho = 140,
  formato = (v: number) => v.toFixed(2),
}: {
  valor: number;
  titulo: string;
  meta?: number;
  tamanho?: number;
  formato?: (v: number) => string;
}) {
  const maximo = 2;
  const fracao = Math.max(0, Math.min(1, valor / maximo));
  // O arco vai de 180° (esquerda) a 360° (direita) passando pelo topo. A agulha
  // precisa usar a MESMA escala: 270° é o topo. Usar -90°..90° colocava a agulha
  // apontando para a direita no meio da escala, atravessando o valor exibido.
  const angulo = 180 + fracao * 180;
  const espessura = 8;
  const raio = tamanho / 2 - espessura - 2;
  const centro = tamanho / 2;
  const comprimento = raio - 14;
  // Espaço para o pivô; o valor é exibido em uma linha própria, abaixo do arco,
  // para nunca se sobrepor à agulha.
  const alturaArco = centro + 10;
  const cor = valor >= 0.95 ? "#059669" : valor >= 0.85 ? "#D97706" : "#DC2626";

  const arco = (de: number, ate: number, corArco: string) => {
    const rad = (g: number) => (g * Math.PI) / 180;
    const x1 = centro + raio * Math.cos(rad(de));
    const y1 = centro + raio * Math.sin(rad(de));
    const x2 = centro + raio * Math.cos(rad(ate));
    const y2 = centro + raio * Math.sin(rad(ate));
    return <path d={"M" + x1 + " " + y1 + " A" + raio + " " + raio + " 0 0 1 " + x2 + " " + y2} fill="none" stroke={corArco} strokeWidth={espessura} strokeLinecap="round" />;
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={tamanho} height={alturaArco} className="overflow-visible">
        {arco(180, 180 + (0.85 / maximo) * 180, "#DC2626")}
        {arco(180 + (0.85 / maximo) * 180, 180 + (0.95 / maximo) * 180, "#D97706")}
        {arco(180 + (0.95 / maximo) * 180, 360, "#059669")}
        <line
          x1={centro}
          y1={centro}
          x2={centro + comprimento * Math.cos((angulo * Math.PI) / 180)}
          y2={centro + comprimento * Math.sin((angulo * Math.PI) / 180)}
          stroke={cor}
          strokeWidth={2.5}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <circle cx={centro} cy={centro} r={4.5} fill={cor} />
      </svg>
      <p className="-mt-1 text-xl font-bold leading-none tabular-nums" style={{ color: cor }}>
        {formato(valor)}
      </p>
      <p className="mt-1.5 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
        {titulo}
        <BotaoExplicacao termo={titulo} />
      </p>
      <p className="text-2xs text-fg-subtle">meta ≥ {formato(meta)}</p>
    </div>
  );
}

/* ==========================================================================
   Radar de capacidades
   ========================================================================== */

export function RadarSkills({
  eixos,
  tamanho = 300,
  maximo = 5,
  series,
}: {
  eixos: string[];
  tamanho?: number;
  maximo?: number;
  series: Array<{ nome: string; cor: string; valores: number[]; preenchido?: boolean }>;
}) {
  if (eixos.length < 3) {
    return <p className="py-8 text-center text-xs text-fg-muted">São necessárias ao menos 3 capacidades para o radar.</p>;
  }
  const centro = tamanho / 2;
  const raio = centro - 42;
  const n = eixos.length;
  const ponto = (indice: number, valor: number) => {
    const angulo = (Math.PI * 2 * indice) / n - Math.PI / 2;
    const r = (Math.max(0, Math.min(maximo, valor)) / maximo) * raio;
    return [centro + r * Math.cos(angulo), centro + r * Math.sin(angulo)];
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <svg width={tamanho} height={tamanho} className="shrink-0">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={eixos.map((_, i) => ponto(i, maximo * f).join(",")).join(" ")}
            fill="none"
            stroke="var(--sgp-border)"
            strokeWidth={1}
          />
        ))}
        {eixos.map((_, i) => {
          const [px, py] = ponto(i, maximo);
          return <line key={i} x1={centro} y1={centro} x2={px} y2={py} stroke="var(--sgp-border)" strokeWidth={1} />;
        })}
        {series.map((s) => (
          <polygon
            key={s.nome}
            points={s.valores.map((v, i) => ponto(i, v).join(",")).join(" ")}
            fill={s.preenchido === false ? "none" : comAlfa(s.cor, 0.2)}
            stroke={s.cor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {series.map((s) =>
          s.valores.map((v, i) => {
            const [px, py] = ponto(i, v);
            return <circle key={s.nome + i} cx={px} cy={py} r={3} fill={s.cor} stroke="var(--sgp-surface)" strokeWidth={1.5} />;
          })
        )}
        {eixos.map((eixo, i) => {
          const [px, py] = ponto(i, maximo * 1.19);
          const ancora = px < centro - 8 ? "end" : px > centro + 8 ? "start" : "middle";
          return (
            <text key={eixo + i} x={px} y={py} textAnchor={ancora} dominantBaseline="middle" className="fill-fg-muted text-[9px] font-medium">
              {eixo.length > 16 ? eixo.slice(0, 15) + "…" : eixo}
            </text>
          );
        })}
      </svg>
      <Legenda series={series} className="max-w-48 flex-col items-start" />
    </div>
  );
}

/* ==========================================================================
   Heatmap genérico (matriz de skills, capacidade, forecast)
   ========================================================================== */

export interface CelulaHeatmap {
  valor: number;
  rotulo?: string;
  detalhe?: ReactNode;
  cor?: string;
}

export function Heatmap({
  linhas,
  colunas,
  celulas,
  maximo = 5,
  formatoValor = (v: number) => (v ? String(v) : "—"),
  corDe,
  larguraColuna = 34,
  larguraLinha = 190,
  alturaLinha = 30,
  aoClicarCelula,
  legenda,
  compacto,
}: {
  linhas: Array<{ id: string | number; rotulo: string; sub?: string; cor?: string; avatar?: ReactNode }>;
  colunas: Array<{ id: string | number; rotulo: string; sub?: string; cor?: string; icone?: ReactNode }>;
  celulas: (linhaId: string | number, colunaId: string | number) => CelulaHeatmap | undefined;
  maximo?: number;
  formatoValor?: (v: number) => string;
  corDe?: (valor: number) => string;
  larguraColuna?: number;
  larguraLinha?: number;
  alturaLinha?: number;
  aoClicarCelula?: (linhaId: string | number, colunaId: string | number) => void;
  legenda?: ReactNode;
  compacto?: boolean;
}) {
  const [dica, setDica] = useState<DicaEstado | null>(null);
  const cor = corDe || ((v: number) => corPorValor(v / maximo));

  if (!linhas.length || !colunas.length) {
    return <p className="py-8 text-center text-xs text-fg-muted">Nenhum dado disponível para o mapa de calor.</p>;
  }

  const alturaLinhaFinal = compacto ? 26 : alturaLinha;

  return (
    <div className="relative">
      <div className="overflow-auto scroll-thin" style={{ maxHeight: compacto ? 420 : 640 }}>
        <div className="inline-block min-w-full">
          <div className="flex sticky top-0 z-10 bg-surface">
            <div className="sticky left-0 z-20 shrink-0 border-b border-r border-border bg-surface px-2 py-2" style={{ width: larguraLinha }}>
              <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                {linhas.length} linha(s) × {colunas.length} coluna(s)
              </span>
            </div>
            {colunas.map((c) => (
              <div
                key={c.id}
                style={{ width: larguraColuna, borderTopColor: c.cor }}
                className="shrink-0 border-b border-l border-border px-0.5 py-2 text-center"
                title={c.rotulo + (c.sub ? " · " + c.sub : "")}
              >
                <div className="flex h-14 flex-col items-center justify-end gap-0.5">
                  {c.icone}
                  <span
                    className="text-2xs font-semibold text-fg-muted"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 58 }}
                  >
                    {c.rotulo.length > 18 ? c.rotulo.slice(0, 17) + "…" : c.rotulo}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {linhas.map((l) => (
            <div key={l.id} className="flex items-center">
              <div
                className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-b border-r border-border bg-surface px-2"
                style={{ width: larguraLinha, height: alturaLinhaFinal }}
              >
                {l.avatar}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-fg" style={{ color: l.cor }}>
                    {l.rotulo}
                  </p>
                  {l.sub && !compacto && <p className="truncate text-2xs text-fg-subtle">{l.sub}</p>}
                </div>
              </div>
              {colunas.map((c) => {
                const celula = celulas(l.id, c.id);
                const valor = celula?.valor ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => aoClicarCelula?.(l.id, c.id)}
                    onMouseEnter={(e) => {
                      if (!celula?.detalhe) return;
                      const caixa = (e.currentTarget.closest(".relative") as HTMLElement).getBoundingClientRect();
                      const alvo = e.currentTarget.getBoundingClientRect();
                      setDica({
                        x: alvo.left - caixa.left + alvo.width / 2,
                        y: alvo.top - caixa.top,
                        conteudo: celula.detalhe,
                      });
                    }}
                    onMouseLeave={() => setDica(null)}
                    style={{
                      width: larguraColuna,
                      height: alturaLinhaFinal,
                      backgroundColor: celula?.cor || (valor ? cor(valor) : "var(--sgp-surface-2)"),
                    }}
                    className={cn(
                      "shrink-0 border-b border-l border-border text-2xs font-bold tabular-nums transition-all",
                      "hover:z-10 hover:scale-110 hover:ring-2 hover:ring-fg/40",
                      valor >= 4 ? "text-white" : valor >= 2 ? "text-white" : "text-fg-muted"
                    )}
                    title={celula?.rotulo}
                  >
                    {formatoValor(valor)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <DicaFlutuante dica={dica} />
      {legenda && <div className="mt-2.5">{legenda}</div>}
      <p className="sr-only">Mapa de calor com {linhas.length} linhas e {colunas.length} colunas.</p>
    </div>
  );
}

/* ==========================================================================
   Escala de cores reutilizável
   ========================================================================== */

export function EscalaCores({
  rotulos,
  cores,
  titulo,
}: {
  rotulos: string[];
  cores: string[];
  titulo?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {titulo && <span className="text-2xs font-semibold text-fg-muted">{titulo}</span>}
      <div className="flex items-center gap-0.5">
        {cores.map((c, i) => (
          <span
            key={i}
            className="grid h-5 min-w-7 place-items-center rounded-sm px-1 text-2xs font-bold text-white"
            style={{ backgroundColor: c }}
          >
            {rotulos[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Sparkline compacta
   ========================================================================== */

export function Sparkline({
  dados,
  cor = "#2563EB",
  altura = 32,
  largura = 96,
  area = true,
}: {
  dados: number[];
  cor?: string;
  altura?: number;
  largura?: number;
  area?: boolean;
}) {
  if (dados.length < 2) return <span className="text-2xs text-fg-subtle">—</span>;
  const max = Math.max(...dados);
  const min = Math.min(...dados);
  const faixa = max - min || 1;
  const passo = largura / (dados.length - 1);
  const y = (v: number) => altura - 2 - ((v - min) / faixa) * (altura - 4);
  const caminho = dados.map((v, i) => (i === 0 ? "M" : "L") + (i * passo).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  return (
    <svg width={largura} height={altura} className="shrink-0">
      {area && <path d={caminho + " L" + largura + " " + altura + " L0 " + altura + " Z"} fill={comAlfa(cor, 0.15)} />}
      <path d={caminho} fill="none" stroke={cor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={largura} cy={y(dados[dados.length - 1])} r={2.5} fill={cor} />
    </svg>
  );
}

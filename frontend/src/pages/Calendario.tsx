import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Eye,
  Flag,
  FolderKanban,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Target,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  BarraProgresso,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Entrada,
  Esqueleto,
  Etiqueta,
  PainelLateral,
  Segmentado,
  Selecao,
  Vazio,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataMedia, DIAS_SEMANA, hojeISO, numero, percentual } from "@/lib/format";
import type { EventoCalendario, Marco, ProjetoResumo, StatusTarefa } from "@/lib/types";

/* ==========================================================================
   Metadados
   ========================================================================== */

interface MetaStatus {
  rotulo: string;
  cor: string;
  icone: LucideIcon;
}

const STATUS_TAREFA: Record<string, MetaStatus> = {
  BACKLOG: { rotulo: "Backlog", cor: "#64748B", icone: Layers },
  A_FAZER: { rotulo: "A fazer", cor: "#0891B2", icone: Circle },
  EM_ANDAMENTO: { rotulo: "Em andamento", cor: "#2563EB", icone: Play },
  EM_REVISAO: { rotulo: "Em revisão", cor: "#7C3AED", icone: Eye },
  BLOQUEADA: { rotulo: "Bloqueada", cor: "#DC2626", icone: Lock },
  CONCLUIDA: { rotulo: "Concluída", cor: "#059669", icone: CheckCircle2 },
  CANCELADA: { rotulo: "Cancelada", cor: "#94A3B8", icone: XCircle },
};

const STATUS_MARCO: Record<string, MetaStatus> = {
  PENDENTE: { rotulo: "Pendente", cor: "#64748B", icone: Flag },
  EM_ANDAMENTO: { rotulo: "Em andamento", cor: "#2563EB", icone: Play },
  CONCLUIDO: { rotulo: "Concluído", cor: "#059669", icone: CheckCircle2 },
  ATRASADO: { rotulo: "Atrasado", cor: "#DC2626", icone: AlertTriangle },
  CANCELADO: { rotulo: "Cancelado", cor: "#94A3B8", icone: XCircle },
};

function metaEvento(evento: EventoCalendario): MetaStatus {
  if (evento.tipo === "marco") return STATUS_MARCO[evento.status] || STATUS_MARCO.PENDENTE;
  return STATUS_TAREFA[evento.status] || STATUS_TAREFA.A_FAZER;
}

/* ==========================================================================
   Utilidades de data (sem dependências externas)
   ========================================================================== */

function paraData(iso: string): Date {
  const partes = iso.slice(0, 10).split("-");
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

function paraISO(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return data.getFullYear() + "-" + mes + "-" + dia;
}

function inicioDaSemana(iso: string): string {
  const data = paraData(iso);
  const deslocamento = (data.getDay() + 6) % 7;
  return paraISO(new Date(data.getFullYear(), data.getMonth(), data.getDate() - deslocamento));
}

function intervalo(modo: "mes" | "semana", referencia: string): { inicio: string; fim: string } {
  const data = paraData(referencia);
  if (modo === "semana") {
    const inicio = inicioDaSemana(referencia);
    return { inicio, fim: paraISO(new Date(paraData(inicio).getFullYear(), paraData(inicio).getMonth(), paraData(inicio).getDate() + 6)) };
  }
  return {
    inicio: paraISO(new Date(data.getFullYear(), data.getMonth(), 1)),
    fim: paraISO(new Date(data.getFullYear(), data.getMonth() + 1, 0)),
  };
}

function deslocar(modo: "mes" | "semana", referencia: string, passo: number): string {
  const data = paraData(referencia);
  if (modo === "semana") return paraISO(new Date(data.getFullYear(), data.getMonth(), data.getDate() + passo * 7));
  return paraISO(new Date(data.getFullYear(), data.getMonth() + passo, 1));
}

function tituloPeriodo(modo: "mes" | "semana", referencia: string): string {
  const data = paraData(referencia);
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  if (modo === "mes") return meses[data.getMonth()] + " de " + data.getFullYear();
  const faixa = intervalo("semana", referencia);
  return dataCurta(faixa.inicio) + " a " + dataCurta(faixa.fim);
}

/* ==========================================================================
   Painel do dia
   ========================================================================== */

function PainelDia({
  dia,
  eventos,
  mapaProjetos,
  aoFechar,
  aoMover,
  aoReagendar,
  reagendando,
}: {
  dia: string;
  eventos: EventoCalendario[];
  mapaProjetos: Map<number, ProjetoResumo>;
  aoFechar: () => void;
  aoMover: (id: number, status: StatusTarefa) => void;
  aoReagendar: (id: number, inicio: string, fim: string) => void;
  reagendando: boolean;
}) {
  const navegar = useNavigate();
  const [edicao, definirEdicao] = useState<{ id: number; inicio: string; fim: string } | null>(null);

  return (
    <PainelLateral
      aberto
      onFechar={aoFechar}
      largura="md"
      titulo={dataMedia(dia)}
      subtitulo={numero(eventos.length) + " evento(s) neste dia"}
    >
      {eventos.length === 0 ? (
        <Vazio icone={CalendarDays} titulo="Nenhum evento neste dia" descricao="Selecione outro dia do calendário para ver tarefas, marcos e alocações." />
      ) : (
        <ul className="space-y-3">
          {eventos.map((evento) => {
            const meta = metaEvento(evento);
            const projeto = mapaProjetos.get(evento.project_id);
            const emEdicao = edicao !== null && edicao.id === evento.id;
            return (
              <li key={evento.tipo + "-" + evento.id} className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md" style={{ backgroundColor: evento.cor + "1f", color: evento.cor }}>
                    {evento.tipo === "marco" ? <Flag className="size-4" aria-hidden /> : <meta.icone className="size-4" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-fg">{evento.titulo}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-fg-muted">
                      <span className="inline-flex items-center gap-1" style={{ color: evento.cor }}>
                        <FolderKanban className="size-3" aria-hidden />
                        {projeto ? projeto.codigo : evento.projeto}
                      </span>
                      {evento.responsavel && <span>· {evento.responsavel}</span>}
                      <span>· {dataCurta(evento.inicio)} → {dataCurta(evento.fim)}</span>
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Etiqueta tom={evento.tipo === "marco" ? "warning" : "info"} icone={meta.icone}>
                        {evento.tipo === "marco" ? "Marco · " + meta.rotulo : meta.rotulo}
                      </Etiqueta>
                      {evento.atrasada && (
                        <Etiqueta tom="danger" icone={AlertTriangle}>
                          atrasado
                        </Etiqueta>
                      )}
                      {evento.critico && <Etiqueta tom="warning">crítico</Etiqueta>}
                    </div>
                  </div>
                </div>

                {evento.tipo === "tarefa" && (
                  <div className="mt-2.5">
                    <BarraProgresso valor={evento.percentual} cor={evento.cor} altura="sm" mostrarValor rotulo="Progresso" />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {evento.tipo === "tarefa" ? (
                    <>
                      <label className="inline-flex flex-col gap-1">
                        <span className="text-2xs font-medium text-fg-muted">Status</span>
                        <Selecao
                          value={evento.status}
                          onChange={(e) => aoMover(evento.id, e.target.value as StatusTarefa)}
                          className="h-8 w-40 text-xs"
                        >
                          {Object.entries(STATUS_TAREFA).map(([valor, info]) => (
                            <option key={valor} value={valor}>
                              {info.rotulo}
                            </option>
                          ))}
                        </Selecao>
                      </label>
                      <Botao
                        tamanho="sm"
                        variante={emEdicao ? "primario" : "secundario"}
                        icone={CalendarDays}
                        onClick={() =>
                          definirEdicao(
                            emEdicao
                              ? null
                              : { id: evento.id, inicio: evento.inicio ? evento.inicio.slice(0, 10) : dia, fim: evento.fim ? evento.fim.slice(0, 10) : dia }
                          )
                        }
                      >
                        Reagendar
                      </Botao>
                      <Botao
                        tamanho="sm"
                        variante="fantasma"
                        icone={FolderKanban}
                        onClick={() => navegar("/projetos/" + evento.project_id + "?tarefa=" + evento.id)}
                      >
                        Abrir tarefa
                      </Botao>
                    </>
                  ) : (
                    <Botao tamanho="sm" variante="fantasma" icone={Target} onClick={() => navegar("/projetos/" + evento.project_id)}>
                      Abrir projeto do marco
                    </Botao>
                  )}
                </div>

                {emEdicao && edicao && (
                  <div className="mt-2.5 grid gap-2 rounded-sgp border border-border bg-surface-2 p-2.5 sm:grid-cols-3">
                    <Campo rotulo="Novo início" htmlFor={"inicio-" + evento.id}>
                      <Entrada
                        id={"inicio-" + evento.id}
                        type="date"
                        value={edicao.inicio}
                        onChange={(e) => definirEdicao({ ...edicao, inicio: e.target.value })}
                      />
                    </Campo>
                    <Campo rotulo="Novo fim" htmlFor={"fim-" + evento.id}>
                      <Entrada
                        id={"fim-" + evento.id}
                        type="date"
                        value={edicao.fim}
                        onChange={(e) => definirEdicao({ ...edicao, fim: e.target.value })}
                      />
                    </Campo>
                    <div className="flex items-end">
                      <Botao
                        variante="primario"
                        icone={CheckCircle2}
                        carregando={reagendando}
                        larguraTotal
                        onClick={() => {
                          aoReagendar(evento.id, edicao.inicio, edicao.fim);
                          definirEdicao(null);
                        }}
                      >
                        Confirmar
                      </Botao>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PainelLateral>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Calendario() {
  const [modo, definirModo] = useState<"mes" | "semana">("mes");
  const [referencia, definirReferencia] = useState(hojeISO());
  const [projetoId, definirProjetoId] = useState("");
  const [diaSelecionado, definirDiaSelecionado] = useState<string | null>(null);

  const faixa = useMemo(() => intervalo(modo, referencia), [modo, referencia]);
  const parametros = projetoId ? { inicio: faixa.inicio, fim: faixa.fim, project: projetoId } : { inicio: faixa.inicio, fim: faixa.fim };

  const calendario = useConsulta<{ inicio: string; fim: string; eventos: EventoCalendario[] }>(CHAVES.calendario, "/tarefas/calendario/", parametros);
  const marcos = useLista<Marco>(["marcos", "calendario"], "/marcos/", { page_size: 500 });
  const projetos = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 200 });

  const mover = useMutacao<{ id: number; status: StatusTarefa }, unknown>({
    url: (v) => "/tarefas/" + v.id + "/mover/",
    invalidar: [CHAVES.calendario, CHAVES.tarefas, ["minhas-tarefas"]],
    mensagemSucesso: "Status atualizado",
  });

  const reagendar = useMutacao<{ id: number; data_inicio: string; data_fim: string }, unknown>({
    url: (v) => "/tarefas/" + v.id + "/reagendar/",
    invalidar: [CHAVES.calendario, CHAVES.tarefas, ["minhas-tarefas"]],
    mensagemSucesso: "Tarefa reagendada",
  });

  const mapaProjetos = useMemo(() => {
    const mapa = new Map<number, ProjetoResumo>();
    projetos.data?.forEach((p) => mapa.set(p.id, p));
    return mapa;
  }, [projetos.data]);

  const eventos = useMemo(() => {
    const vindosApi = calendario.data?.eventos ?? [];
    const chaves = new Set(vindosApi.map((e) => e.tipo + "-" + e.id));
    const listaMarcos = (marcos.data || [])
      .filter((m) => (projetoId ? String(m.project) === projetoId : true))
      .filter((m) => m.data_prevista >= faixa.inicio && m.data_prevista <= faixa.fim)
      .filter((m) => !chaves.has("marco-" + m.id))
      .map<EventoCalendario>((m) => ({
        id: m.id,
        titulo: m.nome,
        inicio: m.data_prevista,
        fim: m.data_prevista,
        tipo: "marco",
        status: m.status,
        cor: m.cor || "#D97706",
        percentual: m.status === "CONCLUIDO" ? 100 : 0,
        project_id: m.project,
        projeto: m.project_nome || "",
        responsavel: m.responsavel_detalhe ? m.responsavel_detalhe.nome : "",
        critico: m.critico,
        atrasado: m.atrasado,
        is_marco: true,
      }));
    return vindosApi.concat(listaMarcos);
  }, [calendario.data, marcos.data, projetoId, faixa]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    eventos.forEach((evento) => {
      const inicio = evento.inicio ? evento.inicio.slice(0, 10) : "";
      const fim = evento.fim ? evento.fim.slice(0, 10) : inicio;
      if (!inicio) return;
      let atual = paraData(inicio);
      const limite = paraData(fim >= inicio ? fim : inicio);
      let guarda = 0;
      while (atual <= limite && guarda < 400) {
        const chave = paraISO(atual);
        const lista = mapa.get(chave) || [];
        lista.push(evento);
        mapa.set(chave, lista);
        atual = new Date(atual.getFullYear(), atual.getMonth(), atual.getDate() + 1);
        guarda += 1;
      }
    });
    return mapa;
  }, [eventos]);

  const celulas = useMemo(() => {
    if (modo === "semana") {
      const base = paraData(faixa.inicio);
      return Array.from({ length: 7 }, (_, i) => paraISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
    }
    const primeiro = paraData(faixa.inicio);
    const deslocamento = (primeiro.getDay() + 6) % 7;
    const inicioGrade = new Date(primeiro.getFullYear(), primeiro.getMonth(), primeiro.getDate() - deslocamento);
    return Array.from({ length: 42 }, (_, i) => paraISO(new Date(inicioGrade.getFullYear(), inicioGrade.getMonth(), inicioGrade.getDate() + i)));
  }, [modo, faixa]);

  const tarefas = eventos.filter((e) => e.tipo === "tarefa");
  const listaMarcos = eventos.filter((e) => e.tipo === "marco");
  const atrasados = eventos.filter((e) => e.atrasada).length;
  const progressoMedio = tarefas.length ? tarefas.reduce((a, e) => a + e.percentual, 0) / tarefas.length : 0;
  const hoje = hojeISO();
  const mesReferencia = paraData(faixa.inicio).getMonth();
  const eventosDia = diaSelecionado ? porDia.get(diaSelecionado) || [] : [];

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Calendário de execução"
        subtitulo="Tarefas, marcos e alocações do período com reagendamento direto"
        icone={CalendarDays}
        cor="#0891B2"
        migalhas={[{ rotulo: "Execução" }, { rotulo: "Calendário" }]}
        acoes={
          <Botao variante="secundario" icone={RefreshCw} onClick={() => calendario.refetch()} carregando={calendario.isFetching}>
            Atualizar
          </Botao>
        }
      />

      <LinhaKPI
        itens={[
          { rotulo: "Eventos no período", valor: numero(eventos.length), icone: CalendarDays, cor: "#0891B2", subrotulo: tituloPeriodo(modo, referencia) },
          { rotulo: "Tarefas", valor: numero(tarefas.length), icone: Layers, cor: "#2563EB", subrotulo: "barras de execução" },
          { rotulo: "Marcos", valor: numero(listaMarcos.length), icone: Flag, cor: "#D97706", subrotulo: "entregas-chave" },
          { rotulo: "Atrasados", valor: numero(atrasados), icone: AlertTriangle, cor: "#DC2626", subrotulo: "prazo vencido" },
          { rotulo: "Progresso médio", valor: percentual(progressoMedio, 0), icone: CheckCircle2, cor: "#059669", subrotulo: "das tarefas do período" },
          { rotulo: "Projeto", valor: projetoId ? (mapaProjetos.get(Number(projetoId))?.codigo || "—") : "Todos", icone: FolderKanban, cor: "#7C3AED", subrotulo: "filtro aplicado" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <div className="flex items-center gap-1">
          <BotaoIcone icone={ChevronLeft} rotulo="Período anterior" onClick={() => definirReferencia(deslocar(modo, referencia, -1))} />
          <Botao variante="secundario" tamanho="sm" onClick={() => definirReferencia(hoje)}>
            Hoje
          </Botao>
          <BotaoIcone icone={ChevronRight} rotulo="Próximo período" onClick={() => definirReferencia(deslocar(modo, referencia, 1))} />
        </div>
        <h2 className="text-sm font-semibold capitalize text-fg">{tituloPeriodo(modo, referencia)}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
          <Segmentado<"mes" | "semana">
            valor={modo}
            onChange={(v) => definirModo(v)}
            tamanho="sm"
            opcoes={[
              { valor: "mes", rotulo: "Mês", titulo: "Visão mensal" },
              { valor: "semana", rotulo: "Semana", titulo: "Visão semanal" },
            ]}
          />
        </div>
      </div>

      {calendario.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o calendário">
          {mensagemErro(calendario.error)}
        </Alerta>
      )}

      {calendario.isLoading ? (
        <CarregandoBloco rotulo="Carregando eventos do calendário..." />
      ) : (
        <section className="overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="grid grid-cols-7 border-b border-border bg-surface-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-2xs font-bold uppercase tracking-wide text-fg-muted">
                {d}
              </div>
            ))}
          </header>
          <div className="grid grid-cols-7">
            {celulas.map((dia) => {
              const doDia = porDia.get(dia) || [];
              const doMes = paraData(dia).getMonth() === mesReferencia;
              const limite = modo === "semana" ? 8 : 3;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => definirDiaSelecionado(dia)}
                  style={{ minHeight: modo === "semana" ? 260 : 116 }}
                  className={
                    "flex flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-surface-2 " +
                    (doMes || modo === "semana" ? "bg-surface " : "bg-surface-2/40 ") +
                    (dia === hoje ? "ring-2 ring-inset ring-brand " : "")
                  }
                  aria-label={"Eventos de " + dataCurta(dia) + ": " + doDia.length}
                >
                  <span className="flex items-center justify-between">
                    <span className={"text-2xs font-bold tabular-nums " + (dia === hoje ? "text-brand" : doMes || modo === "semana" ? "text-fg" : "text-fg-subtle")}>
                      {paraData(dia).getDate()}
                    </span>
                    {doDia.length > 0 && (
                      <span className="rounded-full bg-surface-3 px-1.5 text-[10px] font-semibold text-fg-muted">{doDia.length}</span>
                    )}
                  </span>
                  <span className="flex flex-col gap-1">
                    {doDia.slice(0, limite).map((evento) => {
                      const meta = metaEvento(evento);
                      return (
                        <span
                          key={evento.tipo + "-" + evento.id + "-" + dia}
                          className="flex items-center gap-1 truncate rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: evento.cor + "1f", color: evento.cor, borderLeft: "3px solid " + evento.cor }}
                          title={evento.titulo + " · " + meta.rotulo}
                        >
                          {evento.tipo === "marco" ? (
                            <Flag className="size-2.5 shrink-0" aria-hidden />
                          ) : (
                            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.cor }} aria-hidden />
                          )}
                          <span className="truncate">{evento.titulo}</span>
                          {evento.atrasada && <AlertTriangle className="size-2.5 shrink-0" aria-hidden />}
                        </span>
                      );
                    })}
                    {doDia.length > limite && <span className="px-1 text-[10px] font-semibold text-fg-muted">+{doDia.length - limite} mais</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-surface-2 px-3 py-2.5">
            <span className="text-2xs font-bold uppercase tracking-wide text-fg-muted">Legenda</span>
            {Object.entries(STATUS_TAREFA).map(([valor, info]) => (
              <span key={valor} className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: info.cor }} aria-hidden />
                {info.rotulo}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
              <Flag className="size-3 text-warning" aria-hidden />
              Marco do projeto
            </span>
            <span className="inline-flex items-center gap-1.5 text-2xs text-danger">
              <AlertTriangle className="size-3" aria-hidden />
              Atrasado
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 text-2xs text-fg-muted">
              <Clock className="size-3" aria-hidden />
              Clique em um dia para ver detalhes e reagendar
            </span>
          </footer>
        </section>
      )}

      {calendario.isFetching && !calendario.isLoading && (
        <div className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
          <Esqueleto linhas={2} />
        </div>
      )}

      {diaSelecionado && (
        <PainelDia
          dia={diaSelecionado}
          eventos={eventosDia}
          mapaProjetos={mapaProjetos}
          aoFechar={() => definirDiaSelecionado(null)}
          aoMover={(id, status) => mover.mutate({ id, status })}
          aoReagendar={(id, inicio, fim) => reagendar.mutate({ id, data_inicio: inicio, data_fim: fim })}
          reagendando={reagendar.isPending}
        />
      )}
    </div>
  );
}

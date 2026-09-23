import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Flame,
  FolderKanban,
  Hourglass,
  Layers,
  ListChecks,
  Lock,
  Play,
  Plus,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  AreaTexto,
  Avatar,
  BarraProgresso,
  Botao,
  CabecalhoPagina,
  Campo,
  ControleDeslizante,
  Entrada,
  Esqueleto,
  Etiqueta,
  GradeCards,
  Modal,
  Selecao,
  Segmentado,
  Vazio,
  CORES_PRIORIDADE,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { GraficoDonut, type FatiaDonut } from "@/components/charts";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { dataCurta, DIAS_SEMANA, hojeISO, horas as formatarHoras, numero, percentual, somarDias } from "@/lib/format";
import type { ProjetoResumo, StatusTarefa, Tarefa } from "@/lib/types";

/* ==========================================================================
   Metadados de status e prioridade
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

const ROTULO_PRIORIDADE: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

const COR_PRIORIDADE: Record<string, string> = {
  BAIXA: "#64748B",
  MEDIA: "#0891B2",
  ALTA: "#D97706",
  CRITICA: "#DC2626",
};

const ATIVIDADES = ["Desenvolvimento", "Análise", "Reunião", "Testes", "Documentação", "Suporte", "Gestão"];

function metaStatus(valor: StatusTarefa): MetaStatus {
  return STATUS_TAREFA.find((s) => s.valor === valor) || STATUS_TAREFA[1];
}

/* ==========================================================================
   Contratos das respostas da API
   ========================================================================== */

interface ResumoMinhas {
  abertas: number;
  atrasadas: number;
  concluidas_mes: number;
  horas_semana: number;
  por_status: Array<{ status: StatusTarefa; rotulo: string; total: number }>;
}

interface RespostaMinhas {
  total: number;
  atrasadas: number;
  tarefas: Tarefa[];
}

interface ApontamentoSemana {
  id: number;
  horas: number;
  task_id: number | null;
  tarefa: string;
  projeto: string;
  project_id: number | null;
  cor: string;
  aprovado: boolean;
  descricao: string;
}

interface DiaSemana {
  data: string;
  rotulo: string;
  horas: number;
  apontamentos: ApontamentoSemana[];
}

interface SemanaTimesheet {
  inicio: string;
  fim: string;
  total_horas: number;
  meta_horas: number;
  aprovadas: number;
  pendentes: number;
  dias: DiaSemana[];
}

type Agrupamento = "prazo" | "projeto";

const ORDEM_PRAZO = ["Atrasadas", "Hoje", "Esta semana", "Próximas", "Sem prazo"];

function fimDaSemana(): string {
  const agora = new Date();
  const diaSemana = (agora.getDay() + 6) % 7;
  return somarDias(hojeISO(), 6 - diaSemana);
}

function faixaPrazo(tarefa: Tarefa, limiteSemana: string): string {
  const hoje = hojeISO();
  if (tarefa.atrasada || (tarefa.data_fim && tarefa.data_fim < hoje)) return "Atrasadas";
  if (!tarefa.data_fim) return "Sem prazo";
  if (tarefa.data_fim === hoje) return "Hoje";
  if (tarefa.data_fim <= limiteSemana) return "Esta semana";
  return "Próximas";
}

/* ==========================================================================
   Cartão de tarefa pessoal
   ========================================================================== */

function CartaoTarefaPessoal({
  tarefa,
  projeto,
  mostrarProjeto,
  aoSalvarProgresso,
  aoMover,
}: {
  tarefa: Tarefa;
  projeto?: ProjetoResumo;
  mostrarProjeto: boolean;
  aoSalvarProgresso: (id: number, valor: number) => void;
  aoMover: (id: number, status: StatusTarefa) => void;
}) {
  const [valor, definirValor] = useState(tarefa.percentual_conclusao);
  const temporizador = useRef<number | null>(null);
  const meta = metaStatus(tarefa.status);
  const cor = projeto?.cor || tarefa.cor || "#2563EB";

  useEffect(() => {
    definirValor(tarefa.percentual_conclusao);
  }, [tarefa.percentual_conclusao]);

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    },
    []
  );

  const aoMudarProgresso = (novo: number) => {
    definirValor(novo);
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => aoSalvarProgresso(tarefa.id, novo), 550);
  };

  return (
    <article
      className="relative overflow-hidden rounded-sgp-lg border border-border bg-surface p-3 shadow-n1 transition-shadow hover:shadow-n2"
      style={tarefa.atrasada ? { borderColor: "#DC262655" } : undefined}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: cor }} aria-hidden />

      <div className="flex items-start justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          {mostrarProjeto && (
            <p className="flex items-center gap-1.5 text-2xs font-semibold" style={{ color: cor }}>
              <FolderKanban className="size-3" aria-hidden />
              <span className="truncate">{projeto ? projeto.codigo + " · " + projeto.nome : "Projeto " + tarefa.project}</span>
            </p>
          )}
          <h3 className="mt-0.5 text-sm font-semibold leading-snug text-fg">{tarefa.nome}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-fg-muted">
            <CalendarDays className="size-3" aria-hidden />
            {tarefa.data_fim ? dataCurta(tarefa.data_fim) : "Sem prazo"}
            {tarefa.atrasada && (
              <span className="inline-flex items-center gap-1 font-semibold text-danger">
                <AlertTriangle className="size-3" aria-hidden />
                atrasada
              </span>
            )}
            {tarefa.esforco_estimado && Number(tarefa.esforco_estimado) > 0 && (
              <span className="inline-flex items-center gap-1">
                <Hourglass className="size-3" aria-hidden />
                {formatarHoras(Number(tarefa.esforco_estimado))}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Etiqueta tom={CORES_PRIORIDADE[tarefa.prioridade]}>{ROTULO_PRIORIDADE[tarefa.prioridade] || tarefa.prioridade}</Etiqueta>
          {tarefa.critica && (
            <span title="Tarefa no caminho crítico">
              <Etiqueta tom="danger" icone={Flame}>
                crítica
              </Etiqueta>
            </span>
          )}
        </div>
      </div>

      <div className="mt-2.5 pl-1.5">
        <ControleDeslizante
          valor={valor}
          onChange={aoMudarProgresso}
          rotulo="Progresso"
          sufixo="%"
          marcos={[0, 50, 100]}
          cor={meta.cor}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pl-1.5">
        <div className="flex items-center gap-2">
          {tarefa.responsavel_detalhe ? (
            <Avatar
              nome={tarefa.responsavel_detalhe.nome}
              cor={tarefa.responsavel_detalhe.cor}
              iniciais={tarefa.responsavel_detalhe.iniciais}
              url={tarefa.responsavel_detalhe.avatar_display}
              tamanho="xs"
            />
          ) : null}
          <Selecao
            value={tarefa.status}
            onChange={(e) => aoMover(tarefa.id, e.target.value as StatusTarefa)}
            className="h-7 w-40 py-0 text-2xs"
            aria-label={"Alterar status de " + tarefa.nome}
          >
            {STATUS_TAREFA.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
        </div>
        {tarefa.status !== "CONCLUIDA" && (
          <Botao tamanho="xs" variante="sucesso" icone={CheckCircle2} onClick={() => aoMover(tarefa.id, "CONCLUIDA")}>
            Concluir
          </Botao>
        )}
      </div>
    </article>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function MinhasTarefas() {
  const navegar = useNavigate();
  const { usuario } = useAuth();
  const [agrupamento, definirAgrupamento] = useState<Agrupamento>("prazo");
  const [prioridade, definirPrioridade] = useState("");
  const [diaApontamento, definirDiaApontamento] = useState<string | null>(null);
  const [formulario, definirFormulario] = useState({ task: "", data: hojeISO(), horas: "1", atividade: "Desenvolvimento", descricao: "" });

  const resumo = useConsulta<ResumoMinhas>(["minhas-tarefas"], "/minhas-tarefas/");
  const minhas = useConsulta<RespostaMinhas>(["tarefas", "minhas"], "/tarefas/minhas/");
  const semana = useConsulta<SemanaTimesheet>(CHAVES.timesheet, "/timesheet/semana/");
  const projetos = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 200 });

  const progresso = useMutacao<{ id: number; percentual_conclusao: number }, Tarefa>({
    url: (v) => "/tarefas/" + v.id + "/progresso/",
    invalidar: [CHAVES.tarefas, ["minhas-tarefas"], CHAVES.timesheet],
    mensagemSucesso: "Progresso atualizado",
  });

  const mover = useMutacao<{ id: number; status: StatusTarefa }, Tarefa>({
    url: (v) => "/tarefas/" + v.id + "/mover/",
    invalidar: [CHAVES.tarefas, ["minhas-tarefas"], CHAVES.timesheet],
    mensagemSucesso: "Tarefa atualizada",
  });

  const apontar = useMutacao<{ user: number; task: number | null; data: string; horas: number; descricao: string; atividade: string }, unknown>({
    url: "/timesheet/",
    invalidar: [CHAVES.timesheet, CHAVES.tarefas],
    mensagemSucesso: "Horas apontadas",
  });

  const mapaProjetos = useMemo(() => {
    const mapa = new Map<number, ProjetoResumo>();
    projetos.data?.forEach((p) => mapa.set(p.id, p));
    return mapa;
  }, [projetos.data]);

  const tarefas = useMemo(() => {
    const lista = minhas.data?.tarefas ?? [];
    if (!prioridade) return lista;
    return lista.filter((t) => t.prioridade === prioridade);
  }, [minhas.data, prioridade]);

  const limiteSemana = useMemo(() => fimDaSemana(), []);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Tarefa[]>();
    tarefas.forEach((t) => {
      const chave = agrupamento === "prazo" ? faixaPrazo(t, limiteSemana) : String(t.project);
      const atual = mapa.get(chave) || [];
      atual.push(t);
      mapa.set(chave, atual);
    });
    const entradas = Array.from(mapa.entries());
    if (agrupamento === "prazo") {
      entradas.sort((a, b) => ORDEM_PRAZO.indexOf(a[0]) - ORDEM_PRAZO.indexOf(b[0]));
    } else {
      entradas.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entradas.map(([chave, itens]) => {
      const projeto = mapaProjetos.get(Number(chave));
      return {
        chave,
        itens,
        titulo: agrupamento === "prazo" ? chave : projeto ? projeto.codigo + " · " + projeto.nome : "Projeto " + chave,
        cor: projeto?.cor || "#2563EB",
      };
    });
  }, [tarefas, agrupamento, mapaProjetos, limiteSemana]);

  const fatias: FatiaDonut[] = useMemo(() => {
    const porStatus = resumo.data?.por_status ?? [];
    return porStatus
      .filter((s) => s.total > 0)
      .map((s) => ({ rotulo: s.rotulo, valor: s.total, cor: metaStatus(s.status).cor }));
  }, [resumo.data]);

  const diasSemana = semana.data?.dias ?? [];
  const totalSemana = semana.data?.total_horas ?? 0;
  const metaSemana = semana.data?.meta_horas ?? 0;
  const tarefasAlta = tarefas.filter((t) => t.prioridade === "ALTA" || t.prioridade === "CRITICA").length;
  const progressoMedio = tarefas.length ? tarefas.reduce((a, t) => a + t.percentual_conclusao, 0) / tarefas.length : 0;

  const indicadores = [
    { rotulo: "Tarefas abertas", valor: numero(resumo.data?.abertas ?? 0), icone: ListChecks, cor: "#2563EB", subrotulo: "atribuídas a você" },
    { rotulo: "Atrasadas", valor: numero(resumo.data?.atrasadas ?? 0), icone: AlertTriangle, cor: "#DC2626", subrotulo: "exigem atenção" },
    { rotulo: "Concluídas no mês", valor: numero(resumo.data?.concluidas_mes ?? 0), icone: CheckCircle2, cor: "#059669", subrotulo: "no mês corrente" },
    { rotulo: "Horas estimadas", valor: formatarHoras(resumo.data?.horas_semana ?? 0), icone: Hourglass, cor: "#7C3AED", subrotulo: "próximos 7 dias" },
    { rotulo: "Alta prioridade", valor: numero(tarefasAlta), icone: Flame, cor: "#D97706", subrotulo: "alta ou crítica" },
    { rotulo: "Progresso médio", valor: percentual(progressoMedio, 0), icone: TrendingUp, cor: "#0891B2", subrotulo: "das tarefas abertas" },
  ];

  const abrirApontamento = (data: string) => {
    definirFormulario({
      task: tarefas[0] ? String(tarefas[0].id) : "",
      data,
      horas: "1",
      atividade: "Desenvolvimento",
      descricao: "",
    });
    definirDiaApontamento(data);
  };

  const enviarApontamento = () => {
    const horasValor = Number(formulario.horas);
    if (!usuario || !formulario.data || !Number.isFinite(horasValor) || horasValor <= 0) return;
    apontar.mutate(
      {
        user: usuario.id,
        task: formulario.task ? Number(formulario.task) : null,
        data: formulario.data,
        horas: horasValor,
        descricao: formulario.descricao,
        atividade: formulario.atividade,
      },
      { onSuccess: () => definirDiaApontamento(null) }
    );
  };

  const carregando = minhas.isLoading || resumo.isLoading;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Minhas tarefas"
        subtitulo="Seu painel pessoal de execução, prazos e apontamento de horas"
        icone={ListChecks}
        cor="#2563EB"
        migalhas={[{ rotulo: "Execução" }, { rotulo: "Minhas tarefas" }]}
        acoes={
          <Botao variante="primario" icone={Plus} onClick={() => abrirApontamento(hojeISO())}>
            Apontar horas
          </Botao>
        }
      />

      <LinhaKPI itens={indicadores} />

      {resumo.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar seus indicadores">
          {mensagemErro(resumo.error)}
        </Alerta>
      )}

      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmentado<Agrupamento>
              valor={agrupamento}
              onChange={definirAgrupamento}
              tamanho="sm"
              opcoes={[
                { valor: "prazo", rotulo: "Por prazo", icone: CalendarClock, titulo: "Agrupar por urgência" },
                { valor: "projeto", rotulo: "Por projeto", icone: FolderKanban, titulo: "Agrupar por projeto" },
              ]}
            />
            <Selecao
              value={prioridade}
              onChange={(e) => definirPrioridade(e.target.value)}
              className="h-8 w-44 text-xs"
              aria-label="Filtrar por prioridade"
            >
              <option value="">Todas as prioridades</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </Selecao>
          </div>

          {minhas.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar suas tarefas">
              {mensagemErro(minhas.error)}
            </Alerta>
          )}

          {carregando ? (
            <div className="space-y-3">
              <Esqueleto linhas={3} />
              <Esqueleto linhas={3} />
            </div>
          ) : grupos.length === 0 ? (
            <Vazio
              icone={CheckCircle2}
              titulo="Nenhuma tarefa aberta para você"
              descricao="Quando houver tarefas atribuídas ao seu usuário, elas aparecem aqui agrupadas por prazo ou projeto."
            />
          ) : (
            grupos.map((grupo) => (
              <div key={grupo.chave} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: grupo.cor }} aria-hidden />
                  <h2 className="text-xs font-bold uppercase tracking-wide text-fg-muted">{grupo.titulo}</h2>
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs font-semibold text-fg-muted">{grupo.itens.length}</span>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <GradeCards colunas={2}>
                  {grupo.itens.map((t) => (
                    <CartaoTarefaPessoal
                      key={t.id}
                      tarefa={t}
                      projeto={mapaProjetos.get(t.project)}
                      mostrarProjeto={agrupamento === "prazo"}
                      aoSalvarProgresso={(id, valor) => progresso.mutate({ id, percentual_conclusao: valor })}
                      aoMover={(id, status) => mover.mutate({ id, status })}
                    />
                  ))}
                </GradeCards>
              </div>
            ))
          )}
        </section>

        <aside className="space-y-3">
          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <h2 className="mb-3 text-sm font-semibold text-fg">Tarefas por status</h2>
            {resumo.isLoading ? (
              <Esqueleto linhas={4} />
            ) : fatias.length === 0 ? (
              <Vazio icone={Layers} titulo="Sem tarefas em aberto" className="py-6" />
            ) : (
              <GraficoDonut fatias={fatias} centroRotulo="tarefas" centroValor={resumo.data?.abertas ?? 0} tamanho={150} espessura={20} />
            )}
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-fg">Timesheet da semana</h2>
                <p className="mt-0.5 text-2xs text-fg-muted">
                  {semana.data ? dataCurta(semana.data.inicio) + " a " + dataCurta(semana.data.fim) : "Semana corrente"}
                </p>
              </div>
              <Etiqueta tom={totalSemana >= metaSemana && metaSemana > 0 ? "success" : "info"}>
                {formatarHoras(totalSemana)} / {formatarHoras(metaSemana)}
              </Etiqueta>
            </div>

            <div className="mt-3">
              <BarraProgresso
                valor={metaSemana > 0 ? Math.min(100, (totalSemana / metaSemana) * 100) : 0}
                cor={totalSemana > metaSemana && metaSemana > 0 ? "#D97706" : "#2563EB"}
                altura="md"
                mostrarValor
                rotulo="Progresso da meta semanal"
              />
            </div>

            {semana.isLoading ? (
              <div className="mt-3">
                <Esqueleto linhas={3} />
              </div>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {diasSemana.map((dia) => (
                  <li key={dia.data} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2.5 py-2">
                    <span className="w-9 shrink-0 text-2xs font-bold uppercase text-fg-muted">{dia.rotulo}</span>
                    <span className="w-16 shrink-0 text-2xs tabular-nums text-fg-muted">{dataCurta(dia.data)}</span>
                    <span className="flex-1 text-2xs text-fg-muted">
                      {dia.apontamentos.length === 0 ? "sem apontamentos" : numero(dia.apontamentos.length) + " apontamento(s)"}
                    </span>
                    <span className="shrink-0 text-xs font-bold tabular-nums text-fg">{formatarHoras(dia.horas)}</span>
                    <Botao tamanho="xs" variante="fantasma" icone={Plus} onClick={() => abrirApontamento(dia.data)}>
                      Apontar
                    </Botao>
                  </li>
                ))}
              </ul>
            )}

            {semana.isError && (
              <div className="mt-3">
                <Alerta tom="danger" titulo="Não foi possível carregar o timesheet">
                  {mensagemErro(semana.error)}
                </Alerta>
              </div>
            )}
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <Clock className="size-4 text-brand" aria-hidden />
              Apontamentos recentes
            </h2>
            {semana.isLoading ? (
              <Esqueleto linhas={3} />
            ) : (
              <ul className="space-y-1.5">
                {diasSemana
                  .flatMap((d) => d.apontamentos.map((a) => ({ ...a, dia: d.data })))
                  .slice(0, 8)
                  .map((a) => (
                    <li key={a.id} className="flex items-center gap-2 text-2xs">
                      <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: a.cor }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-fg" title={a.tarefa}>
                        {a.tarefa || "Sem tarefa"}
                      </span>
                      <span className="shrink-0 tabular-nums text-fg-muted">{formatarHoras(a.horas)}</span>
                      <Etiqueta tom={a.aprovado ? "success" : "warning"}>{a.aprovado ? "aprovado" : "pendente"}</Etiqueta>
                    </li>
                  ))}
                {diasSemana.every((d) => d.apontamentos.length === 0) && (
                  <li className="py-2 text-center text-2xs text-fg-muted">Nenhum apontamento nesta semana.</li>
                )}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => navegar("/timesheet")}
            className="w-full rounded-sgp-lg border border-border bg-surface p-3 text-left text-xs font-medium text-brand shadow-n1 transition-colors hover:bg-surface-2"
          >
            Abrir timesheet completo e aprovações →
          </button>
        </aside>
      </div>

      <Modal
        aberto={diaApontamento !== null}
        onFechar={() => definirDiaApontamento(null)}
        titulo="Apontar horas"
        subtitulo={diaApontamento ? "Data: " + dataCurta(diaApontamento) : undefined}
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirDiaApontamento(null)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Plus} carregando={apontar.isPending} onClick={enviarApontamento}>
              Apontar horas
            </Botao>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Tarefa" htmlFor="apontamento-tarefa" className="sm:col-span-2" dica="Somente tarefas atribuídas a você aparecem na lista.">
            <Selecao
              id="apontamento-tarefa"
              value={formulario.task}
              onChange={(e) => definirFormulario({ ...formulario, task: e.target.value })}
            >
              <option value="">Sem tarefa vinculada</option>
              {tarefas.map((t) => (
                <option key={t.id} value={t.id}>
                  {(mapaProjetos.get(t.project)?.codigo || "PRJ") + " · " + t.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Data" obrigatorio htmlFor="apontamento-data">
            <Entrada
              id="apontamento-data"
              type="date"
              value={formulario.data}
              onChange={(e) => definirFormulario({ ...formulario, data: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Horas" obrigatorio htmlFor="apontamento-horas" dica="Entre 0,5 e 24 horas por dia.">
            <Entrada
              id="apontamento-horas"
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={formulario.horas}
              onChange={(e) => definirFormulario({ ...formulario, horas: e.target.value })}
            />
          </Campo>
          <Campo rotulo="Atividade" htmlFor="apontamento-atividade">
            <Selecao
              id="apontamento-atividade"
              value={formulario.atividade}
              onChange={(e) => definirFormulario({ ...formulario, atividade: e.target.value })}
            >
              {ATIVIDADES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Descrição" htmlFor="apontamento-descricao" className="sm:col-span-2">
            <AreaTexto
              id="apontamento-descricao"
              rows={3}
              value={formulario.descricao}
              placeholder="O que foi realizado neste período?"
              onChange={(e) => definirFormulario({ ...formulario, descricao: e.target.value })}
            />
          </Campo>
        </div>

        {diasSemana.length > 0 && (
          <p className="mt-3 text-2xs text-fg-muted">
            Semana atual: {DIAS_SEMANA.join(" · ")} — total apontado de {formatarHoras(totalSemana)} em {formatarHoras(metaSemana)} planejadas.
          </p>
        )}
      </Modal>
    </div>
  );
}

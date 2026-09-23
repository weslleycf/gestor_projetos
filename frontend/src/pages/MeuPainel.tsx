import { useMemo, useState as useStateLocal } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, Award, Bell, BookOpen, CalendarClock, CheckCircle2, Clock, Compass,
  Flame, FolderKanban, Gauge, History, ListChecks, Route, Sparkles, Target, TrendingUp, Users,
} from "lucide-react";
import {
  Abas, Alerta, Avatar, BarraProgresso, CabecalhoPagina, CarregandoBloco, Chip, Etiqueta,
  GradeCards, Semaforo, Vazio,
} from "@/components/ui";
import { GraficoBarras, GraficoDonut, RadarSkills, Sparkline, type FatiaDonut } from "@/components/charts";
import { LinhaKPI } from "@/components/layout";
import { useConsulta, useLista, CHAVES } from "@/hooks";
import { useAuth } from "@/store/auth";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataRelativa, horas, numero, percentual } from "@/lib/format";
import type { Atividade, Notificacao, ProjetoResumo, Tarefa, Trilha } from "@/lib/types";

interface ResumoMinhasTarefas {
  abertas: number;
  atrasadas: number;
  concluidas_mes: number;
  horas_semana: number;
  por_status: Array<{ status: string; rotulo: string; total: number }>;
}

interface TimesheetSemana {
  inicio: string;
  fim: string;
  total_horas: number;
  meta_horas: number;
  aprovadas: number;
  pendentes: number;
  dias: Array<{ data: string; rotulo: string; horas: number; apontamentos: Array<{ id: number; horas: number; tarefa: string; projeto: string; cor: string; aprovado: boolean }> }>;
}

interface RadarPessoa {
  user_id: number;
  nome: string;
  total_skills: number;
  nivel_medio: number;
  eixos: Array<{ skill: string; atual: number; consolidado: number; desejado: number; cor: string }>;
  todos: Array<{ skill_id: number; skill: string; consolidado: number; desejado: number; status: string; gap: number; xp: number }>;
}

interface PayloadMeuPDI {
  usuario: { id: number; nome: string };
  radar: RadarPessoa;
  trilhas: Trilha[];
  pdi: {
    id: number;
    titulo: string;
    objetivo: string;
    status_rotulo: string;
    progresso: number;
    data_inicio: string;
    data_fim: string | null;
    acoes: Array<{
      id: number; descricao: string; status: string; status_rotulo: string; tipo_rotulo: string;
      skill_nome: string; skill_cor: string; prazo: string | null; progresso: number; atrasada: boolean;
      carga_horaria: number;
    }>;
  } | null;
}

type AbaPainel = "visao" | "tarefas" | "pdi" | "capacidades" | "atividade";

export default function MeuPainel() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [aba, setAba] = useAbaPainel();

  const resumoTarefas = useConsulta<ResumoMinhasTarefas>(CHAVES.tarefas, "/minhas-tarefas/");
  const minhasTarefas = useConsulta<{ total: number; atrasadas: number; tarefas: Tarefa[] }>(
    CHAVES.tarefas,
    "/tarefas/minhas/"
  );
  const semana = useConsulta<TimesheetSemana>(CHAVES.timesheet, "/timesheet/semana/");
  const meuPdi = useConsulta<PayloadMeuPDI>(CHAVES.pdis, "/capacidades/pdi/meu/");
  const { data: notificacoes = [] } = useLista<Notificacao>(CHAVES.notificacoes, "/notificacoes/", {
    lida: false,
    page_size: 20,
  });
  const { data: atividades = [] } = useLista<Atividade>(CHAVES.atividades, "/atividades/", { page_size: 20 });
  const { data: projetos = [] } = useLista<ProjetoResumo>(CHAVES.projetosCards, "/projetos/?resumo=1", {
    manager: usuario?.id,
    page_size: 12,
  });
  const { data: alocacoes = [] } = useLista<{
    id: number;
    project: number;
    project_nome: string;
    project_cor: string;
    percentual: number;
    data_inicio: string;
    data_fim: string;
    papel: string;
    status: string;
  }>(CHAVES.alocacoes, "/alocacoes/", { user: usuario?.id, page_size: 30 });

  const erro = resumoTarefas.error || semana.error || meuPdi.error;

  const porStatus: FatiaDonut[] = useMemo(
    () =>
      (resumoTarefas.data?.por_status ?? [])
        .filter((s) => s.total > 0)
        .map((s) => ({
          rotulo: s.rotulo,
          valor: s.total,
          cor:
            s.status === "CONCLUIDA" ? "#059669"
            : s.status === "EM_ANDAMENTO" ? "#2563EB"
            : s.status === "BLOQUEADA" ? "#DC2626"
            : s.status === "EM_REVISAO" ? "#D97706"
            : "#94A3B8",
        })),
    [resumoTarefas.data]
  );

  const horasPorDia = useMemo(
    () =>
      (semana.data?.dias ?? []).map((d) => ({
        rotulo: d.rotulo,
        valor: d.horas,
        cor: d.horas > 8 ? "#D97706" : d.horas > 0 ? "#2563EB" : "#94A3B8",
        meta: 8,
      })),
    [semana.data]
  );

  const alocacoesAtivas = alocacoes.filter((a) => a.status === "CONFIRMADA" || a.status === "EM_EXECUCAO");
  const cargaTotal = alocacoesAtivas.reduce((a, x) => a + x.percentual, 0);

  if (erro) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Meu painel" icone={Gauge} />
        <Alerta tom="danger" titulo="Não foi possível carregar seu painel">
          {mensagemErro(erro)}
        </Alerta>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo={"Olá, " + (usuario?.nome_curto ?? "") + "!"}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <span>{usuario?.cargo || "Colaborador"} · {usuario?.area || "sem área"}</span>
            {cargaTotal > 0 && (
              <Etiqueta tom={cargaTotal > 100 ? "danger" : cargaTotal > 85 ? "warning" : "success"} icone={Users}>
                {cargaTotal}% alocado
              </Etiqueta>
            )}
          </span>
        }
        icone={Gauge}
        cor={usuario?.cor || "#2563EB"}
        acoes={
          <button
            type="button"
            onClick={() => navegar("/timesheet")}
            className="inline-flex h-9 items-center gap-2 rounded-sgp bg-brand px-3 text-xs font-semibold text-brand-fg shadow-n1 hover:bg-brand-hover"
          >
            <Clock className="size-3.5" aria-hidden />
            Apontar horas
          </button>
        }
      />

      <LinhaKPI
        itens={[
          { rotulo: "Tarefas abertas", valor: numero(resumoTarefas.data?.abertas ?? 0), icone: ListChecks, cor: "#2563EB" },
          { rotulo: "Atrasadas", valor: numero(resumoTarefas.data?.atrasadas ?? 0), icone: AlertTriangle, cor: "#DC2626" },
          { rotulo: "Concluídas no mês", valor: numero(resumoTarefas.data?.concluidas_mes ?? 0), icone: CheckCircle2, cor: "#059669" },
          { rotulo: "Horas na semana", valor: horas(semana.data?.total_horas ?? 0), icone: Clock, cor: "#8B5CF6", subrotulo: "meta " + horas(semana.data?.meta_horas ?? 40) },
          { rotulo: "Capacidades", valor: numero(meuPdi.data?.radar.total_skills ?? 0), icone: Sparkles, cor: "#F59E0B" },
          { rotulo: "Nível médio", valor: (meuPdi.data?.radar.nivel_medio ?? 0).toFixed(2).replace(".", ","), icone: TrendingUp, cor: "#0891B2" },
        ]}
      />

      {resumoTarefas.data && resumoTarefas.data.atrasadas > 0 && (
        <Alerta tom="danger" titulo={resumoTarefas.data.atrasadas + " tarefa(s) sua(s) estão atrasadas"} icone={AlertTriangle}
          acao={
            <button type="button" onClick={() => setAba("tarefas")} className="shrink-0 text-2xs font-semibold text-brand underline">
              ver tarefas
            </button>
          }
        >
          Priorize as entregas com prazo vencido para manter o cronograma do projeto.
        </Alerta>
      )}

      <Abas<AbaPainel>
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: "visao", rotulo: "Visão geral", icone: Gauge },
          { valor: "tarefas", rotulo: "Minhas tarefas", icone: ListChecks, contagem: resumoTarefas.data?.abertas },
          { valor: "pdi", rotulo: "PDI e trilhas", icone: Route },
          { valor: "capacidades", rotulo: "Minhas capacidades", icone: Sparkles, contagem: meuPdi.data?.radar.total_skills },
          { valor: "atividade", rotulo: "Atividade", icone: History, contagem: atividades.length },
        ]}
      />

      {aba === "visao" && (
        <div className="space-y-4">
          <GradeCards colunas="auto">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 text-sm font-semibold text-fg">Minhas tarefas por status</h3>
              {porStatus.length ? (
                <GraficoDonut fatias={porStatus} centroRotulo="tarefas" centroValor={resumoTarefas.data?.abertas ?? 0} />
              ) : (
                <Vazio icone={CheckCircle2} titulo="Nenhuma tarefa aberta" descricao="Você está em dia com suas entregas." />
              )}
            </div>

            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-1 text-sm font-semibold text-fg">Horas da semana</h3>
              <p className="mb-3 text-2xs text-fg-muted">
                {dataCurta(semana.data?.inicio)} a {dataCurta(semana.data?.fim)} · {horas(semana.data?.aprovadas ?? 0)} aprovadas,{" "}
                {horas(semana.data?.pendentes ?? 0)} pendentes
              </p>
              {horasPorDia.length ? (
                <GraficoBarras itens={horasPorDia} altura={170} formatarValor={(v) => horas(v)} larguraBarra={5} />
              ) : (
                <Vazio icone={Clock} titulo="Sem apontamentos" />
              )}
            </div>

            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 text-sm font-semibold text-fg">Minhas alocações</h3>
              {alocacoesAtivas.length ? (
                <ul className="space-y-2.5">
                  {alocacoesAtivas.slice(0, 6).map((a) => (
                    <li key={a.id}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => navegar("/projetos/" + a.project)}
                          className="min-w-0 truncate text-left text-xs font-medium text-fg hover:text-brand hover:underline"
                        >
                          {a.project_nome}
                        </button>
                        <span className="shrink-0 text-2xs font-bold tabular-nums text-fg-muted">{a.percentual}%</span>
                      </div>
                      <BarraProgresso valor={a.percentual} cor={a.project_cor} altura="sm" />
                      <p className="mt-0.5 text-2xs text-fg-subtle">
                        {a.papel || "Sem papel definido"} · {dataCurta(a.data_inicio)} → {dataCurta(a.data_fim)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Vazio icone={Users} titulo="Sem alocações ativas" descricao="Você não está alocado em nenhum projeto no momento." />
              )}
            </div>
          </GradeCards>

          <div className="grid gap-3 xl:grid-cols-2">
            <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Bell className="size-4 text-warning" aria-hidden /> Notificações não lidas
                </h3>
                <button type="button" onClick={() => navegar("/preferencias")} className="text-2xs font-medium text-brand hover:underline">
                  configurar alertas
                </button>
              </header>
              {notificacoes.length === 0 ? (
                <Vazio icone={CheckCircle2} titulo="Nenhuma notificação pendente" />
              ) : (
                <ul className="divide-y divide-border">
                  {notificacoes.slice(0, 6).map((n) => (
                    <li key={n.id} className="flex items-start gap-2.5 px-4 py-2.5">
                      <span
                        className="mt-1 size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            n.nivel === "CRITICO" ? "#DC2626" : n.nivel === "ALERTA" ? "#D97706" : n.nivel === "SUCESSO" ? "#059669" : "#0891B2",
                        }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-fg">{n.titulo}</p>
                        {n.mensagem && <p className="truncate text-2xs text-fg-muted">{n.mensagem}</p>}
                        <p className="mt-0.5 text-2xs text-fg-subtle">{dataRelativa(n.criado_em)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
              <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <FolderKanban className="size-4 text-fg-muted" aria-hidden /> Projetos que eu gerencio
                </h3>
                <button type="button" onClick={() => navegar("/projetos")} className="text-2xs font-medium text-brand hover:underline">
                  ver todos
                </button>
              </header>
              {projetos.length === 0 ? (
                <Vazio icone={FolderKanban} titulo="Você não gerencia projetos" />
              ) : (
                <ul className="divide-y divide-border">
                  {projetos.slice(0, 6).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.cor }} />
                      <button
                        type="button"
                        onClick={() => navegar("/projetos/" + p.id)}
                        className="min-w-0 flex-1 truncate text-left text-xs font-medium text-fg hover:text-brand hover:underline"
                      >
                        {p.nome}
                      </button>
                      <Semaforo saude={p.saude} comRotulo={false} />
                      <span className="w-10 shrink-0 text-right text-2xs font-semibold tabular-nums text-fg-muted">
                        {p.percentual_conclusao}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {aba === "tarefas" && (
        <div className="space-y-3">
          {minhasTarefas.isLoading ? (
            <CarregandoBloco rotulo="Carregando suas tarefas..." />
          ) : (minhasTarefas.data?.tarefas ?? []).length === 0 ? (
            <Vazio icone={CheckCircle2} titulo="Nenhuma tarefa atribuída a você" descricao="Quando uma tarefa for atribuída, ela aparecerá aqui." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(minhasTarefas.data?.tarefas ?? []).map((t) => {
                const atrasada = Boolean(t.atrasada);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navegar("/projetos/" + t.project + "?tarefa=" + t.id)}
                    className="rounded-sgp-lg border border-border bg-surface p-3.5 text-left shadow-n1 transition-all hover:-translate-y-0.5 hover:shadow-n2"
                    style={{ borderLeftWidth: 3, borderLeftColor: t.project_cor || "#94A3B8" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-xs font-semibold text-fg">{t.nome}</p>
                      {atrasada && <Etiqueta tom="danger" icone={AlertTriangle}>atrasada</Etiqueta>}
                    </div>
                    <p className="mt-1 truncate text-2xs text-fg-muted">{t.project_nome || "Projeto"}</p>
                    <div className="mt-2">
                      <BarraProgresso valor={t.percentual_conclusao} comparativo={t.progresso_planejado} altura="sm" mostrarValor />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-2xs text-fg-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3" aria-hidden /> {dataCurta(t.data_fim)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden /> {horas(t.esforco_estimado)}
                      </span>
                      <Etiqueta
                        tom={t.prioridade === "CRITICA" ? "danger" : t.prioridade === "ALTA" ? "warning" : "neutral"}
                      >
                        {t.prioridade}
                      </Etiqueta>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {aba === "pdi" && (
        <div className="space-y-4">
          {meuPdi.isLoading ? (
            <CarregandoBloco rotulo="Carregando seu PDI..." />
          ) : (
            <>
              <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr]">
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
                    <Target className="size-4 text-fg-muted" aria-hidden /> Meu radar de capacidades
                  </h3>
                  {(meuPdi.data?.radar.eixos ?? []).length >= 3 ? (
                    <RadarSkills
                      eixos={(meuPdi.data?.radar.eixos ?? []).slice(0, 10).map((e) => e.skill)}
                      series={[
                        {
                          nome: "Nível atual",
                          cor: "#2563EB",
                          valores: (meuPdi.data?.radar.eixos ?? []).slice(0, 10).map((e) => e.consolidado),
                        },
                        {
                          nome: "Nível desejado",
                          cor: "#F59E0B",
                          preenchido: false,
                          valores: (meuPdi.data?.radar.eixos ?? []).slice(0, 10).map((e) => e.desejado || e.consolidado),
                        },
                      ]}
                    />
                  ) : (
                    <Vazio icone={Sparkles} titulo="Poucas capacidades registradas" descricao="Registre ao menos 3 capacidades para visualizar o radar." />
                  )}
                </div>

                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-fg">
                    <Route className="size-4 text-success" aria-hidden /> Meu PDI
                  </h3>
                  {meuPdi.data?.pdi ? (
                    <>
                      <p className="text-2xs text-fg-muted">
                        {meuPdi.data.pdi.titulo} · {meuPdi.data.pdi.status_rotulo} · {dataCurta(meuPdi.data.pdi.data_inicio)} →{" "}
                        {dataCurta(meuPdi.data.pdi.data_fim)}
                      </p>
                      {meuPdi.data.pdi.objetivo && <p className="mt-1 text-xs text-fg">{meuPdi.data.pdi.objetivo}</p>}
                      <div className="mt-3">
                        <BarraProgresso valor={meuPdi.data.pdi.progresso} rotulo="Progresso do PDI" mostrarValor cor="#059669" />
                      </div>
                      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto scroll-thin">
                        {meuPdi.data.pdi.acoes.slice(0, 8).map((a) => (
                          <li key={a.id} className="rounded-sgp border border-border bg-surface-2 p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 text-xs font-medium text-fg">{a.descricao}</p>
                              <Etiqueta tom={a.status === "CONCLUIDA" ? "success" : a.atrasada ? "danger" : "info"}>
                                {a.status_rotulo}
                              </Etiqueta>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs text-fg-muted">
                              <span>{a.tipo_rotulo}</span>
                              {a.skill_nome && <Chip cor={a.skill_cor}>{a.skill_nome}</Chip>}
                              {a.prazo && <span>prazo {dataCurta(a.prazo)}</span>}
                              {a.carga_horaria > 0 && <span>{a.carga_horaria}h</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => navegar("/pdi")}
                        className="mt-3 w-full rounded-sgp border border-border-strong bg-surface py-2 text-xs font-medium text-fg hover:bg-surface-2"
                      >
                        Gerenciar meu PDI completo
                      </button>
                    </>
                  ) : (
                    <Vazio
                      icone={Route}
                      titulo="Você ainda não tem um PDI"
                      descricao="Gere um plano de desenvolvimento a partir dos seus gaps de capacidade."
                      acao={
                        <button
                          type="button"
                          onClick={() => navegar("/pdi")}
                          className="rounded-sgp bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg"
                        >
                          Criar meu PDI
                        </button>
                      }
                    />
                  )}
                </div>
              </div>

              <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
                <header className="border-b border-border px-4 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <BookOpen className="size-4 text-fg-muted" aria-hidden /> Trilhas recomendadas para você
                  </h3>
                  <p className="text-2xs text-fg-muted">Baseadas nos seus gaps, aspirações e na demanda do portfólio</p>
                </header>
                {(meuPdi.data?.trilhas ?? []).length === 0 ? (
                  <Vazio icone={BookOpen} titulo="Nenhuma trilha sugerida no momento" />
                ) : (
                  <ul className="divide-y divide-border">
                    {(meuPdi.data?.trilhas ?? []).slice(0, 6).map((t) => (
                      <li key={t.skill_id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: t.cor }} />
                          <span className="text-xs font-semibold text-fg">{t.skill}</span>
                          <Etiqueta tom={t.urgencia === "ALTA" ? "danger" : t.urgencia === "MEDIA" ? "warning" : "neutral"}>
                            urgência {t.urgencia.toLowerCase()}
                          </Etiqueta>
                          <Etiqueta tom="info">
                            N{t.nivel_atual} → N{t.nivel_alvo}
                          </Etiqueta>
                          {t.demanda_projetos > 0 && (
                            <span className="text-2xs text-fg-muted">{t.demanda_projetos} projeto(s) demandam</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <BarraProgresso
                            valor={t.progresso}
                            rotulo={"XP para o próximo nível: faltam " + numero(t.xp_necessario) + " XP"}
                            cor={t.cor}
                            altura="sm"
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {t.acoes.slice(0, 4).map((a, i) => (
                            <Chip key={i} cor="#6366F1" icone={a.tipo === "MENTORIA" ? Users : a.tipo === "TREINAMENTO" ? BookOpen : Target}>
                              {a.titulo.length > 40 ? a.titulo.slice(0, 39) + "…" : a.titulo}
                            </Chip>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {aba === "capacidades" && (
        <div className="space-y-4">
          {meuPdi.isLoading ? (
            <CarregandoBloco rotulo="Carregando suas capacidades..." />
          ) : (
            <>
              <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-fg">Minhas capacidades</h3>
                    <p className="text-2xs text-fg-muted">
                      {meuPdi.data?.radar.total_skills ?? 0} capacidades registradas · nível médio{" "}
                      {(meuPdi.data?.radar.nivel_medio ?? 0).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navegar("/pessoas/" + (usuario?.id ?? ""))}
                    className="rounded-sgp border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-2"
                  >
                    Abrir meu perfil completo
                  </button>
                </div>
              </div>

              <GradeCards colunas="auto">
                {(meuPdi.data?.radar.todos ?? []).slice(0, 18).map((c) => (
                  <div key={c.skill_id} className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-xs font-semibold text-fg">{c.skill}</p>
                      {c.status === "ENFERRUJADA" && <Etiqueta tom="warning" icone={Flame}>decay</Etiqueta>}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                        {c.consolidado.toFixed(1)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <BarraProgresso
                          valor={(c.consolidado / 5) * 100}
                          cor="#2563EB"
                          altura="sm"
                          rotulo={"XP " + numero(c.xp)}
                          mostrarValor={false}
                        />
                        {c.desejado > c.consolidado && (
                          <p className="mt-1 text-2xs text-warning">
                            gap de {(c.desejado - c.consolidado).toFixed(1)} para o nível desejado
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(meuPdi.data?.radar.todos ?? []).length === 0 && (
                  <Vazio icone={Sparkles} titulo="Nenhuma capacidade registrada" descricao="Seu perfil de capacidades ainda não foi preenchido." />
                )}
              </GradeCards>
            </>
          )}
        </div>
      )}

      {aba === "atividade" && (
        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Activity className="size-4 text-fg-muted" aria-hidden /> Atividade recente do sistema
            </h3>
          </header>
          {atividades.length === 0 ? (
            <Vazio icone={History} titulo="Nenhuma atividade registrada" />
          ) : (
            <ul className="relative px-4 py-3">
              <span className="absolute bottom-3 left-[27px] top-6 w-px bg-border" aria-hidden />
              {atividades.slice(0, 15).map((a) => (
                <li key={a.id} className="relative flex gap-3 py-2">
                  <Avatar nome={a.user_nome} cor={a.user_cor} tamanho="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-fg">
                      <strong className="font-semibold">{a.user_nome}</strong> {a.verbo}{" "}
                      <span className="text-fg-muted">{a.entidade_nome}</span>
                    </p>
                    <p className="text-2xs text-fg-subtle">{dataRelativa(a.criado_em)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Mantém a aba ativa na URL para permitir links diretos. */
function useAbaPainel() {
  const [aba, setAba] = useStateComUrl("aba", "visao");
  return [aba as AbaPainel, setAba] as const;
}

function useStateComUrl(chave: string, padrao: string) {
  const params = new URLSearchParams(window.location.search);
  const inicial = params.get(chave) || padrao;
  const [valor, setValor] = useStateLocal(inicial);
  const definir = (novo: string) => {
    setValor(novo);
    const url = new URL(window.location.href);
    url.searchParams.set(chave, novo);
    window.history.replaceState({}, "", url.toString());
  };
  return [valor, definir] as const;
}


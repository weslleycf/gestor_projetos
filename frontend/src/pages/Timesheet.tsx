import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FolderKanban,
  Hourglass,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Abas,
  Alerta,
  Avatar,
  AreaTexto,
  BarraProgresso,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Entrada,
  Esqueleto,
  Etiqueta,
  Modal,
  Selecao,
  Tabela,
  Vazio,
  type ColunaTabela,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { GraficoBarras, GraficoDonut, type BarraItem, type FatiaDonut } from "@/components/charts";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, horas as formatarHoras, hojeISO, MESES, numero, percentual } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Tarefa, Timesheet } from "@/lib/types";

/* ==========================================================================
   Contratos e constantes
   ========================================================================== */

interface ApontamentoSemana {
  id: number;
  data: string;
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

interface FormularioApontamento {
  id: number | null;
  task: string;
  data: string;
  horas: string;
  atividade: string;
  descricao: string;
}

const ATIVIDADES = ["Desenvolvimento", "Análise", "Reunião", "Testes", "Documentação", "Suporte", "Gestão"];

type AbaTimesheet = "meu" | "aprovacao";

function paraData(iso: string): Date {
  const partes = iso.slice(0, 10).split("-");
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
}

function paraISO(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return data.getFullYear() + "-" + mes + "-" + dia;
}

function deslocarSemana(referencia: string, passo: number): string {
  const data = paraData(referencia);
  return paraISO(new Date(data.getFullYear(), data.getMonth(), data.getDate() + passo * 7));
}

const CORES_PROJETO = ["#2563EB", "#7C3AED", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#6366F1", "#84CC16"];

/* ==========================================================================
   Página
   ========================================================================== */

export default function TimesheetPage() {
  const { usuario, pode } = useAuth();
  const [aba, definirAba] = useState<AbaTimesheet>("meu");
  const [referencia, definirReferencia] = useState(hojeISO());
  const [formulario, definirFormulario] = useState<FormularioApontamento | null>(null);
  const [excluindo, definirExcluindo] = useState<ApontamentoSemana | null>(null);
  const [confirmarEnvio, definirConfirmarEnvio] = useState(false);
  const [selecionados, definirSelecionados] = useState<number[]>([]);

  // Aprovar é uma alçada do gestor, não do perfil que aponta horas. Usar a
  // permissão (e não o nome do perfil) mantém a tela alinhada com o servidor.
  const podeAprovar = pode("timesheet.aprovar");
  const podeApontar = pode("timesheet.editar");

  const semana = useConsulta<SemanaTimesheet>(CHAVES.timesheet, "/timesheet/semana/", { data: referencia });
  const minhasTarefas = useLista<Tarefa>(CHAVES.tarefas, usuario ? "/tarefas/" : null, {
    responsavel: usuario?.id,
    page_size: 200,
  });
  const pendentes = useLista<Timesheet>(["timesheet", "pendentes"], podeAprovar ? "/timesheet/" : null, {
    aprovado: false,
    page_size: 200,
  });

  const criar = useMutacao<{ user: number; task: number | null; data: string; horas: number; atividade: string; descricao: string }, Timesheet>({
    url: "/timesheet/",
    invalidar: [CHAVES.timesheet, ["timesheet", "pendentes"], CHAVES.tarefas],
    mensagemSucesso: "Apontamento registrado",
  });

  const editar = useMutacao<{ id: number; data: string; horas: number; atividade: string; descricao: string; task: number | null }, Timesheet>({
    metodo: "patch",
    url: (v) => "/timesheet/" + v.id + "/",
    invalidar: [CHAVES.timesheet, ["timesheet", "pendentes"]],
    mensagemSucesso: "Apontamento atualizado",
  });

  const excluir = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/timesheet/" + v.id + "/",
    invalidar: [CHAVES.timesheet, ["timesheet", "pendentes"], CHAVES.tarefas],
    mensagemSucesso: "Apontamento excluído",
  });

  const aprovarLote = useMutacao<{ ids: number[] }, { aprovados: number }>({
    url: "/timesheet/aprovar-lote/",
    invalidar: [CHAVES.timesheet, ["timesheet", "pendentes"]],
    mensagemSucesso: (resposta) => numero(resposta.aprovados) + " apontamento(s) aprovado(s)",
  });

  const aprovar = useMutacao<{ id: number }, Timesheet>({
    url: (v) => "/timesheet/" + v.id + "/aprovar/",
    invalidar: [CHAVES.timesheet, ["timesheet", "pendentes"]],
    mensagemSucesso: "Apontamento aprovado",
  });

  const dias = semana.data?.dias ?? [];
  const totalHoras = semana.data?.total_horas ?? 0;
  const metaHoras = semana.data?.meta_horas ?? 0;
  const aprovadas = semana.data?.aprovadas ?? 0;
  const pendentesHoras = semana.data?.pendentes ?? 0;
  const hoje = hojeISO();

  const projetosEnvolvidos = useMemo(() => {
    const mapa = new Map<string, { horas: number; cor: string }>();
    dias.forEach((dia) =>
      dia.apontamentos.forEach((a) => {
        const chave = a.projeto || "Sem projeto";
        const atual = mapa.get(chave) || { horas: 0, cor: a.cor || "#94A3B8" };
        atual.horas += a.horas;
        mapa.set(chave, atual);
      })
    );
    return Array.from(mapa.entries()).sort((a, b) => b[1].horas - a[1].horas);
  }, [dias]);

  const barrasPorDia: BarraItem[] = useMemo(
    () =>
      dias.map((dia) => ({
        rotulo: dia.rotulo,
        valor: Number(dia.horas.toFixed(1)),
        cor: dia.data === hoje ? "#2563EB" : "#7C3AED",
        meta: metaHoras > 0 ? Number((metaHoras / 7).toFixed(1)) : undefined,
      })),
    [dias, hoje, metaHoras]
  );

  const fatiasPorProjeto: FatiaDonut[] = useMemo(
    () => projetosEnvolvidos.map(([rotulo, info], i) => ({ rotulo, valor: Number(info.horas.toFixed(1)), cor: info.cor || CORES_PROJETO[i % 8] })),
    [projetosEnvolvidos]
  );

  const apontamentosSemana = useMemo(() => dias.flatMap((d) => d.apontamentos.map((a) => ({ ...a, dia: d.data }))), [dias]);
  const pendentesSemana = apontamentosSemana.filter((a) => !a.aprovado);

  const abrirNovo = (data: string) => {
    definirFormulario({
      id: null,
      task: minhasTarefas.data && minhasTarefas.data.length ? String(minhasTarefas.data[0].id) : "",
      data,
      horas: "1",
      atividade: "Desenvolvimento",
      descricao: "",
    });
  };

  const abrirEdicao = (apontamento: ApontamentoSemana, dia: string) => {
    definirFormulario({
      id: apontamento.id,
      task: apontamento.task_id ? String(apontamento.task_id) : "",
      data: dia,
      horas: String(apontamento.horas),
      atividade: "Desenvolvimento",
      descricao: apontamento.descricao || "",
    });
  };

  const salvarFormulario = () => {
    if (!formulario || !usuario) return;
    const horasValor = Number(formulario.horas);
    if (!formulario.data || !Number.isFinite(horasValor) || horasValor <= 0) return;
    const corpo = {
      data: formulario.data,
      horas: horasValor,
      atividade: formulario.atividade,
      descricao: formulario.descricao,
      task: formulario.task ? Number(formulario.task) : null,
    };
    if (formulario.id) {
      editar.mutate({ id: formulario.id, ...corpo }, { onSuccess: () => definirFormulario(null) });
    } else {
      criar.mutate({ user: usuario.id, ...corpo }, { onSuccess: () => definirFormulario(null) });
    }
  };

  const colunasAprovacao: Array<ColunaTabela<Timesheet>> = [
    {
      chave: "selecao",
      titulo: "",
      largura: "40px",
      renderizar: (item) => (
        <input
          type="checkbox"
          className="size-4 cursor-pointer accent-[#2563EB]"
          checked={selecionados.includes(item.id)}
          onChange={(e) =>
            definirSelecionados((atual) => (e.target.checked ? atual.concat(item.id) : atual.filter((i) => i !== item.id)))
          }
          aria-label={"Selecionar apontamento de " + (item.user_detalhe ? item.user_detalhe.nome : "")}
        />
      ),
    },
    {
      chave: "colaborador",
      titulo: "Colaborador",
      largura: "200px",
      ordenavel: true,
      valorOrdenacao: (item) => (item.user_detalhe ? item.user_detalhe.nome : ""),
      renderizar: (item) => (
        <span className="flex items-center gap-2">
          <Avatar
            nome={item.user_detalhe?.nome}
            cor={item.user_detalhe?.cor}
            iniciais={item.user_detalhe?.iniciais}
            url={item.user_detalhe?.avatar_display}
            tamanho="xs"
          />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-fg">{item.user_detalhe ? item.user_detalhe.nome : "Usuário"}</span>
            <span className="block truncate text-2xs text-fg-muted">{item.user_detalhe ? item.user_detalhe.cargo : ""}</span>
          </span>
        </span>
      ),
    },
    {
      chave: "data",
      titulo: "Data",
      largura: "110px",
      ordenavel: true,
      valorOrdenacao: (item) => item.data,
      renderizar: (item) => <span className="text-xs tabular-nums text-fg-muted">{dataCurta(item.data)}</span>,
    },
    {
      chave: "tarefa",
      titulo: "Tarefa",
      renderizar: (item) => (
        <span className="min-w-0">
          <span className="block truncate text-xs text-fg">{item.task_nome || "Sem tarefa"}</span>
          <span className="block truncate text-2xs text-fg-muted">{item.atividade || "—"}</span>
        </span>
      ),
    },
    {
      chave: "projeto",
      titulo: "Projeto",
      largura: "180px",
      renderizar: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: item.project_cor || "#94A3B8" }}>
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: item.project_cor || "#94A3B8" }} aria-hidden />
          <span className="truncate">{item.project_nome || "—"}</span>
        </span>
      ),
    },
    {
      chave: "horas",
      titulo: "Horas",
      largura: "80px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (item) => Number(item.horas),
      renderizar: (item) => <span className="text-xs font-semibold tabular-nums text-fg">{formatarHoras(Number(item.horas))}</span>,
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "120px",
      alinhar: "right",
      renderizar: (item) => (
        <span className="inline-flex items-center gap-1">
          <Botao tamanho="xs" variante="sucesso" icone={CheckCircle2} carregando={aprovar.isPending} onClick={() => aprovar.mutate({ id: item.id })}>
            Aprovar
          </Botao>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Timesheet"
        subtitulo="Apontamento visual de horas, metas semanais e aprovação de lançamentos"
        icone={Clock}
        cor="#7C3AED"
        migalhas={[{ rotulo: "Execução" }, { rotulo: "Timesheet" }]}
        acoes={
          <>
            <Botao variante="secundario" icone={RefreshCw} onClick={() => semana.refetch()} carregando={semana.isFetching}>
              Atualizar
            </Botao>
            {podeApontar && (
              <Botao variante="primario" icone={Plus} onClick={() => abrirNovo(hoje)}>
                Apontar horas
              </Botao>
            )}
          </>
        }
      />

      <Abas<AbaTimesheet>
        valor={aba}
        onChange={(v) => definirAba(v)}
        abas={[
          { valor: "meu", rotulo: "Minha semana", icone: CalendarDays, contagem: apontamentosSemana.length },
          { valor: "aprovacao", rotulo: "Aprovações", icone: CheckCircle2, contagem: pendentes.data ? pendentes.data.length : undefined },
        ]}
      />

      {semana.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o timesheet">
          {mensagemErro(semana.error)}
        </Alerta>
      )}

      {aba === "meu" ? (
        <>
          {!podeApontar && (
            <Alerta tom="info" titulo="Perfil de consulta">
              Seu perfil consulta as horas apontadas, mas não registra, edita nem exclui apontamentos. Solicite o lançamento de
              horas ao seu gestor, ao PMO ou ao RH.
            </Alerta>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
            <div className="flex items-center gap-1">
              <BotaoIcone icone={ChevronLeft} rotulo="Semana anterior" onClick={() => definirReferencia(deslocarSemana(referencia, -1))} />
              <Botao variante="secundario" tamanho="sm" onClick={() => definirReferencia(hoje)}>
                Semana atual
              </Botao>
              <BotaoIcone icone={ChevronRight} rotulo="Próxima semana" onClick={() => definirReferencia(deslocarSemana(referencia, 1))} />
            </div>
            <h2 className="text-sm font-semibold text-fg">
              {semana.data ? dataCurta(semana.data.inicio) + " a " + dataCurta(semana.data.fim) : dataCurta(referencia)}
            </h2>
            <span className="text-2xs text-fg-muted">
              {MESES[paraData(referencia).getMonth()]} de {paraData(referencia).getFullYear()}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Botao
                variante="sucesso"
                icone={Send}
                disabled={pendentesSemana.length === 0}
                onClick={() => definirConfirmarEnvio(true)}
              >
                Enviar para aprovação
              </Botao>
            </div>
          </div>

          <LinhaKPI
            itens={[
              { rotulo: "Horas apontadas", valor: formatarHoras(totalHoras), icone: Clock, cor: "#7C3AED", subrotulo: "na semana" },
              { rotulo: "Meta semanal", valor: formatarHoras(metaHoras), icone: Target, cor: "#2563EB", subrotulo: "capacidade do usuário" },
              {
                rotulo: "Saldo da meta",
                valor: formatarHoras(totalHoras - metaHoras),
                icone: TrendingUp,
                cor: totalHoras >= metaHoras ? "#059669" : "#D97706",
                subrotulo: totalHoras >= metaHoras ? "meta atingida" : "horas restantes",
              },
              { rotulo: "Aprovadas", valor: formatarHoras(aprovadas), icone: CheckCircle2, cor: "#059669", subrotulo: "validadas pelo gestor" },
              { rotulo: "Pendentes", valor: formatarHoras(pendentesHoras), icone: Hourglass, cor: "#D97706", subrotulo: "aguardando aprovação" },
              { rotulo: "Apontamentos", valor: numero(apontamentosSemana.length), icone: CalendarDays, cor: "#0891B2", subrotulo: numero(projetosEnvolvidos.length) + " projeto(s)" },
            ]}
          />

          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-fg">Progresso da meta semanal</h2>
              <span className="text-2xs text-fg-muted">
                {percentual(metaHoras > 0 ? (totalHoras / metaHoras) * 100 : 0, 0)} de {formatarHoras(metaHoras)}
              </span>
            </div>
            <div className="mt-2">
              <BarraProgresso
                valor={metaHoras > 0 ? Math.min(100, (totalHoras / metaHoras) * 100) : 0}
                cor={totalHoras > metaHoras && metaHoras > 0 ? "#D97706" : "#2563EB"}
                altura="lg"
                mostrarValor
              />
            </div>
          </div>

          {semana.isLoading ? (
            <CarregandoBloco rotulo="Carregando a semana..." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {dias.map((dia) => (
                <section
                  key={dia.data}
                  className={"flex min-h-56 flex-col rounded-sgp-lg border bg-surface shadow-n1 " + (dia.data === hoje ? "border-brand" : "border-border")}
                  aria-label={"Apontamentos de " + dia.rotulo}
                >
                  <header className="flex items-center justify-between gap-2 border-b border-border px-2.5 py-2">
                    <span>
                      <span className="block text-2xs font-bold uppercase tracking-wide text-fg-muted">{dia.rotulo}</span>
                      <span className={"block text-xs font-semibold " + (dia.data === hoje ? "text-brand" : "text-fg")}>{dataCurta(dia.data)}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-2xs font-bold tabular-nums text-fg-muted">
                      {formatarHoras(dia.horas)}
                    </span>
                  </header>

                  <div className="flex flex-1 flex-col gap-1.5 p-2">
                    {dia.apontamentos.length === 0 ? (
                      <p className="py-3 text-center text-2xs text-fg-subtle">Sem apontamentos</p>
                    ) : (
                      dia.apontamentos.slice(0, 12).map((a) => (
                        <article key={a.id} className="group rounded-sgp border border-border bg-surface-2 p-2" style={{ borderLeft: "3px solid " + (a.cor || "#94A3B8") }}>
                          <p className="truncate text-2xs font-semibold text-fg" title={a.tarefa}>
                            {a.tarefa || "Sem tarefa"}
                          </p>
                          <p className="truncate text-[10px] text-fg-muted">{a.projeto || "Sem projeto"}</p>
                          <div className="mt-1 flex items-center justify-between gap-1">
                            <span className="text-2xs font-bold tabular-nums text-fg">{formatarHoras(a.horas)}</span>
                            <span className="flex items-center gap-0.5">
                              <Etiqueta tom={a.aprovado ? "success" : "warning"}>{a.aprovado ? "ok" : "pend."}</Etiqueta>
                              {podeApontar && (
                                <>
                                  <BotaoIcone icone={Pencil} rotulo="Editar apontamento" tamanho="xs" onClick={() => abrirEdicao(a, dia.data)} />
                                  <BotaoIcone
                                    icone={Trash2}
                                    rotulo="Excluir apontamento"
                                    tamanho="xs"
                                    variante="fantasma"
                                    onClick={() => definirExcluindo(a)}
                                  />
                                </>
                              )}
                            </span>
                          </div>
                        </article>
                      ))
                    )}
                    {dia.apontamentos.length > 12 && (
                      <p className="text-[10px] font-semibold text-fg-muted">+{dia.apontamentos.length - 12} apontamento(s)</p>
                    )}
                  </div>

                  {podeApontar && (
                    <footer className="border-t border-border p-2">
                      <Botao tamanho="xs" variante="fantasma" icone={Plus} larguraTotal onClick={() => abrirNovo(dia.data)}>
                        Adicionar
                      </Botao>
                    </footer>
                  )}
                </section>
              ))}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h2 className="mb-3 text-sm font-semibold text-fg">Horas por dia</h2>
              {semana.isLoading ? <Esqueleto linhas={5} /> : <GraficoBarras itens={barrasPorDia} altura={200} formatarValor={(v) => formatarHoras(v)} />}
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h2 className="mb-3 text-sm font-semibold text-fg">Horas por projeto</h2>
              {semana.isLoading ? (
                <Esqueleto linhas={5} />
              ) : fatiasPorProjeto.length === 0 ? (
                <Vazio icone={FolderKanban} titulo="Nenhuma hora apontada" className="py-6" />
              ) : (
                <GraficoDonut fatias={fatiasPorProjeto} centroRotulo="horas" centroValor={numero(totalHoras, 1)} unidade=" h" tamanho={150} espessura={20} />
              )}
            </div>
          </div>
        </>
      ) : (
        <section className="space-y-3">
          {!podeAprovar ? (
            <Alerta tom="warning" titulo="Aprovação restrita">
              Seu perfil não aprova apontamentos de outros colaboradores. Os lançamentos ficam disponíveis para o gestor, o PMO ou o RH.
            </Alerta>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
                <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                  <Users className="size-3.5" aria-hidden />
                  {numero(pendentes.data ? pendentes.data.length : 0)} apontamento(s) pendente(s)
                </span>
                <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
                  <Hourglass className="size-3" aria-hidden />
                  {formatarHoras((pendentes.data || []).reduce((a, t) => a + Number(t.horas), 0))} aguardando validação
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <Botao
                    variante="secundario"
                    tamanho="sm"
                    onClick={() => definirSelecionados((pendentes.data || []).map((t) => t.id))}
                    disabled={!pendentes.data || pendentes.data.length === 0}
                  >
                    Selecionar todos
                  </Botao>
                  <Botao
                    variante="sucesso"
                    icone={CheckCircle2}
                    carregando={aprovarLote.isPending}
                    disabled={selecionados.length === 0}
                    onClick={() =>
                      aprovarLote.mutate({ ids: selecionados }, { onSuccess: () => definirSelecionados([]) })
                    }
                  >
                    Aprovar selecionados ({selecionados.length})
                  </Botao>
                </div>
              </div>

              {pendentes.isError && (
                <Alerta tom="danger" titulo="Não foi possível carregar os apontamentos pendentes">
                  {mensagemErro(pendentes.error)}
                </Alerta>
              )}

              {pendentes.isLoading ? (
                <CarregandoBloco rotulo="Carregando pendentes..." />
              ) : (
                <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
                  <Tabela
                    colunas={colunasAprovacao}
                    dados={pendentes.data || []}
                    compacta
                    vazio={
                      <Vazio
                        icone={CheckCircle2}
                        titulo="Nenhum apontamento pendente"
                        descricao="Todos os lançamentos de horas enviados já foram aprovados."
                      />
                    }
                  />
                </div>
              )}
            </>
          )}

          <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <AlertTriangle className="size-4 text-warning" aria-hidden />
              Como funciona a aprovação
            </h2>
            <p className="text-xs text-fg-muted">
              Ao registrar um apontamento ele entra automaticamente na fila de aprovação do seu gestor, do PMO ou do RH. A aprovação credita XP de
              capacidade ao colaborador e alimenta o esforço real das tarefas. Aprovações em lote usam o mesmo fluxo do botão individual.
            </p>
          </div>
        </section>
      )}

      <Modal
        aberto={formulario !== null}
        onFechar={() => definirFormulario(null)}
        titulo={formulario && formulario.id ? "Editar apontamento" : "Novo apontamento"}
        subtitulo={formulario ? dataCurta(formulario.data) : undefined}
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirFormulario(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={CheckCircle2}
              carregando={criar.isPending || editar.isPending}
              onClick={salvarFormulario}
            >
              {formulario && formulario.id ? "Salvar alterações" : "Registrar horas"}
            </Botao>
          </>
        }
      >
        {formulario && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Tarefa" htmlFor="timesheet-task" className="sm:col-span-2" dica="Apenas tarefas atribuídas a você são listadas.">
              <Selecao id="timesheet-task" value={formulario.task} onChange={(e) => definirFormulario({ ...formulario, task: e.target.value })}>
                <option value="">Sem tarefa vinculada</option>
                {(minhasTarefas.data || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Data" obrigatorio htmlFor="timesheet-data">
              <Entrada id="timesheet-data" type="date" value={formulario.data} onChange={(e) => definirFormulario({ ...formulario, data: e.target.value })} />
            </Campo>
            <Campo rotulo="Horas" obrigatorio htmlFor="timesheet-horas" dica="Entre 0,5 e 24 horas por dia.">
              <Entrada
                id="timesheet-horas"
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={formulario.horas}
                onChange={(e) => definirFormulario({ ...formulario, horas: e.target.value })}
              />
            </Campo>
            <Campo rotulo="Atividade" htmlFor="timesheet-atividade">
              <Selecao
                id="timesheet-atividade"
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
            <Campo rotulo="Descrição" htmlFor="timesheet-descricao" className="sm:col-span-2">
              <AreaTexto
                id="timesheet-descricao"
                rows={3}
                value={formulario.descricao}
                placeholder="Detalhe o que foi executado neste período..."
                onChange={(e) => definirFormulario({ ...formulario, descricao: e.target.value })}
              />
            </Campo>
          </div>
        )}
      </Modal>

      <Modal
        aberto={excluindo !== null}
        onFechar={() => definirExcluindo(null)}
        titulo="Excluir apontamento"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirExcluindo(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={() =>
                excluindo
                  ? excluir.mutate({ id: excluindo.id }, { onSuccess: () => definirExcluindo(null) })
                  : undefined
              }
            >
              Excluir apontamento
            </Botao>
          </>
        }
      >
        <p className="text-xs text-fg-muted">
          {excluindo
            ? "Serão removidas " + formatarHoras(excluindo.horas) + " do apontamento de " + dataCurta(excluindo.data) + " (" + (excluindo.tarefa || "sem tarefa") + ")."
            : ""}
        </p>
      </Modal>

      <Modal
        aberto={confirmarEnvio}
        onFechar={() => definirConfirmarEnvio(false)}
        titulo="Enviar para aprovação"
        subtitulo={semana.data ? dataCurta(semana.data.inicio) + " a " + dataCurta(semana.data.fim) : undefined}
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirConfirmarEnvio(false)}>
              Cancelar
            </Botao>
            {/* Antes este botão aprovava os apontamentos, apesar do rótulo
                "Enviar para aprovação" — quem apontava horas aprovava as
                próprias horas. Aprovar agora só aparece para quem tem alçada. */}
            {podeAprovar ? (
              <Botao
                variante="sucesso"
                icone={Send}
                carregando={aprovarLote.isPending}
                disabled={pendentesSemana.length === 0}
                onClick={() =>
                  aprovarLote.mutate(
                    { ids: pendentesSemana.map((a) => a.id) },
                    { onSuccess: () => definirConfirmarEnvio(false) }
                  )
                }
              >
                Aprovar a semana
              </Botao>
            ) : (
              <Botao variante="primario" icone={Check} onClick={() => definirConfirmarEnvio(false)}>
                Entendi
              </Botao>
            )}
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-fg-muted">
            {numero(pendentesSemana.length)} apontamento(s) pendente(s), somando{" "}
            {formatarHoras(pendentesSemana.reduce((a, x) => a + x.horas, 0))} nesta semana.
          </p>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto scroll-thin">
            {pendentesSemana.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2.5 py-1.5">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: a.cor || "#94A3B8" }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-xs text-fg">{a.tarefa || "Sem tarefa"}</span>
                <span className="text-2xs tabular-nums text-fg-muted">{dataCurta(a.dia)}</span>
                <span className="text-2xs font-semibold tabular-nums text-fg">{formatarHoras(a.horas)}</span>
              </li>
            ))}
          </ul>
          {!podeAprovar && (
            <Alerta tom="info" titulo="Envio registrado na fila do gestor">
              Os apontamentos já ficam pendentes para o seu gestor, o PMO ou o RH. Seu perfil não executa a aprovação final.
            </Alerta>
          )}
        </div>
      </Modal>
    </div>
  );
}

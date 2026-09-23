import {
  Alerta, AnelProgresso, Avatar, BarraProgresso, CarregandoBloco, Cartao, Etiqueta, Vazio,
} from "@/components/ui";
import { GraficoBarras, GraficoLinha, Medidor, type Serie } from "@/components/charts";
import { LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataRelativa, indice, moeda, numero, percentual } from "@/lib/format";
import type { ConflitoAlocacao, EVM, Marco, Projeto, ProjetoResumo } from "@/lib/types";
import {
  AlertTriangle, BarChart3, CheckCircle2, Flag, Gauge, ListChecks, ShieldAlert, Target, TrendingUp, Users,
  Wallet,
} from "lucide-react";

import { CORES_STATUS_TAREFA, OPCOES_STATUS_TAREFA, type OrcamentoCategoria, type PontoCurva } from "./comum";

interface ProgressoDashboard {
  percentual: number;
  planejado: number;
  desvio: number;
  tarefas_total: number;
  tarefas_concluidas: number;
  tarefas_atrasadas: number;
  tarefas_criticas: number;
  horas_estimadas: number;
  horas_realizadas: number;
}

interface RiscoTop {
  id: number;
  codigo: string;
  descricao: string;
  nivel: string;
  severidade: number;
  cor: string;
  probabilidade: number;
  impacto: number;
  status: string;
  responsavel: string;
}

interface CargaResponsavel {
  user_id: number;
  nome: string;
  cor: string;
  iniciais: string;
  total: number;
  concluidas: number;
  atrasadas: number;
  horas: number;
}

interface DashboardProjeto {
  projeto: ProjetoResumo;
  progresso: ProgressoDashboard;
  evm: EVM;
  curva_s: { pontos: PontoCurva[]; resumo: EVM };
  orcamento: OrcamentoCategoria[];
  riscos: {
    total: number;
    abertos: number;
    criticos: number;
    por_nivel: Array<{ nivel: string; total: number }>;
    top: RiscoTop[];
  };
  marcos: Marco[];
  kpis: Array<{ id: number; nome: string; unidade: string; valor_meta: string; valor_atual: string; atingimento: number; situacao: string; cor: string }>;
  conflitos_recursos: ConflitoAlocacao[];
  tarefas_por_status: Array<{ status: string; total: number }>;
  por_responsavel: CargaResponsavel[];
}

/* ==========================================================================
   Aba Dashboard — EVM, curva S, orcamento, riscos e carga (RF-28)
   ========================================================================== */

export function AbaDashboard({ projetoId, projeto }: { projetoId: number; projeto: Projeto }) {
  const { data, isLoading, isError, error } = useConsulta<DashboardProjeto>(
    CHAVES.dashboardProjeto(projetoId),
    "/projetos/" + projetoId + "/dashboard/"
  );

  if (isLoading) return <CarregandoBloco rotulo="Carregando indicadores do projeto..." />;
  if (isError || !data) {
    return (
      <Alerta tom="danger" titulo="Não foi possível carregar o dashboard do projeto">
        {mensagemErro(error)}
      </Alerta>
    );
  }

  const progresso = data.progresso;
  const evm = data.evm;
  const pontos = data.curva_s?.pontos ?? [];
  const rotulosCurva = pontos.map((ponto) => ponto.rotulo);
  const seriesCurva: Serie[] = [
    { nome: "PV (planejado)", cor: "#2563EB", dados: pontos.map((ponto) => ponto.PV), tracejada: true },
    { nome: "EV (agregado)", cor: "#059669", dados: pontos.map((ponto) => ponto.EV) },
    { nome: "AC (custo real)", cor: "#DC2626", dados: pontos.map((ponto) => ponto.AC) },
  ];
  const categorias = data.orcamento ?? [];
  const statusTarefas = (data.tarefas_por_status ?? []).filter((item) => item.total > 0);
  const responsaveis = data.por_responsavel ?? [];
  const conflitos = data.conflitos_recursos ?? [];
  const maxHorasResponsavel = Math.max(1, ...responsaveis.map((item) => item.horas));

  return (
    <div className="space-y-4">
      <LinhaKPI
        itens={[
          { rotulo: "Tarefas", valor: numero(progresso.tarefas_total), icone: ListChecks, cor: "#2563EB", subrotulo: numero(progresso.tarefas_concluidas) + " concluída(s)" },
          { rotulo: "Atrasadas", valor: numero(progresso.tarefas_atrasadas), icone: AlertTriangle, cor: "#DC2626", subrotulo: "exigem atenção" },
          { rotulo: "Críticas", valor: numero(progresso.tarefas_criticas), icone: Target, cor: "#8B5CF6", subrotulo: "no caminho crítico" },
          { rotulo: "Horas estimadas", valor: numero(progresso.horas_estimadas), icone: Gauge, cor: "#0891B2", subrotulo: "esforço planejado" },
          { rotulo: "Horas realizadas", valor: numero(progresso.horas_realizadas), icone: TrendingUp, cor: "#059669", subrotulo: "apontadas nas tarefas" },
          { rotulo: "Riscos abertos", valor: numero(data.riscos.abertos), icone: ShieldAlert, cor: "#D97706", subrotulo: numero(data.riscos.criticos) + " crítico(s)" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <div className="grid gap-3 md:grid-cols-2">
            <Cartao titulo="Progresso físico" subtitulo="Executado × planejado pela linha de base" icone={Gauge} corIcone="#2563EB">
              <div className="flex flex-wrap items-center gap-4">
                <AnelProgresso
                  valor={progresso.percentual}
                  tamanho={128}
                  espessura={11}
                  subrotulo="concluído"
                  cor={progresso.desvio > 10 ? "#DC2626" : progresso.desvio > 5 ? "#D97706" : "#059669"}
                />
                <div className="min-w-40 flex-1 space-y-2">
                  <BarraProgresso valor={progresso.percentual} comparativo={progresso.planejado} altura="md" rotulo="Executado" mostrarValor />
                  <BarraProgresso valor={progresso.planejado} altura="sm" rotulo="Planejado para hoje" mostrarValor cor="#0891B2" />
                  <p className={"text-2xs font-semibold " + (progresso.desvio > 0 ? "text-danger" : "text-success")}>
                    {progresso.desvio > 0
                      ? "Desvio de " + percentual(progresso.desvio, 1) + " atrás do planejado"
                      : "Adiantado em " + percentual(Math.abs(progresso.desvio), 1)}
                  </p>
                  <p className="text-2xs text-fg-muted">
                    {numero(progresso.tarefas_concluidas)} de {numero(progresso.tarefas_total)} tarefas concluídas ·{" "}
                    {numero(progresso.tarefas_atrasadas)} atrasadas
                  </p>
                </div>
              </div>
            </Cartao>

            <Cartao titulo="Valor agregado (EVM)" subtitulo={"Referência: " + dataCurta(evm.data_referencia)} icone={TrendingUp} corIcone="#059669">
              <div className="flex items-center justify-around gap-3">
                <Medidor valor={evm.CPI} titulo="CPI" meta={1} tamanho={132} formato={(valor) => indice(valor)} />
                <Medidor valor={evm.SPI} titulo="SPI" meta={1} tamanho={132} formato={(valor) => indice(valor)} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { rotulo: "PV", valor: evm.PV, cor: "#2563EB" },
                  { rotulo: "EV", valor: evm.EV, cor: "#059669" },
                  { rotulo: "AC", valor: evm.AC, cor: "#DC2626" },
                  { rotulo: "EAC", valor: evm.EAC, cor: "#D97706" },
                  { rotulo: "VAC", valor: evm.VAC, cor: evm.VAC < 0 ? "#DC2626" : "#059669" },
                  { rotulo: "ETC", valor: evm.ETC, cor: "#8B5CF6" },
                ].map((item) => (
                  <div key={item.rotulo} className="rounded-sgp border border-border bg-surface-2 px-2.5 py-2">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted" style={{ color: item.cor }}>
                      {item.rotulo}
                    </p>
                    <p className="text-sm font-bold tabular-nums text-fg">{moeda(item.valor, true)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-2xs text-fg-muted">
                BAC {moeda(evm.BAC, true)} · consumido {percentual(evm.percentual_consumido, 1)} · agregado{" "}
                {percentual(evm.percentual_agregado, 1)}
              </p>
            </Cartao>
          </div>

          <Cartao titulo="Curva S — planejado × agregado × custo real" subtitulo={numero(pontos.length) + " ponto(s) na série"} icone={BarChart3} corIcone="#2563EB">
            <GraficoLinha
              rotulos={rotulosCurva}
              series={seriesCurva}
              altura={280}
              mostrarLegenda
              formatarValor={(valor) => moeda(valor, true)}
            />
            <p className="mt-2 text-2xs text-fg-muted">
              Projeção EAC: <span className="font-semibold text-fg">{moeda(evm.EAC, true)}</span> · VAC{" "}
              <span className={"font-semibold " + (evm.VAC < 0 ? "text-danger" : "text-success")}>{moeda(evm.VAC, true)}</span> · TCPI{" "}
              {indice(evm.TCPI)}
            </p>
          </Cartao>

          <div className="grid gap-3 md:grid-cols-2">
            <Cartao titulo="Orçamento por categoria" subtitulo="Planejado × realizado" icone={Wallet} corIcone="#0891B2">
              {categorias.length === 0 ? (
                <Vazio icone={Wallet} titulo="Sem orçamento distribuído" descricao="Distribua o orçamento em categorias para acompanhar o consumo." />
              ) : (
                <GraficoBarras
                  itens={categorias.map((item) => ({
                    rotulo: item.categoria,
                    valor: item.realizado,
                    comparativo: item.planejado,
                    cor: item.cor || "#2563EB",
                  }))}
                  horizontal
                  formatarValor={(valor) => moeda(valor, true)}
                  mostrarEixo={false}
                />
              )}
            </Cartao>

            <Cartao titulo="Tarefas por status" subtitulo="Distribuição do fluxo de trabalho" icone={ListChecks} corIcone="#8B5CF6">
              {statusTarefas.length === 0 ? (
                <Vazio icone={ListChecks} titulo="Nenhuma tarefa cadastrada" descricao="Crie tarefas na aba Gantt para acompanhar a execução." />
              ) : (
                <GraficoBarras
                  itens={statusTarefas.map((item) => ({
                    rotulo: (OPCOES_STATUS_TAREFA.find((opcao) => opcao.valor === item.status)?.rotulo || item.status).slice(0, 10),
                    valor: item.total,
                    cor: CORES_STATUS_TAREFA[item.status] || "#2563EB",
                  }))}
                  altura={200}
                  formatarValor={(valor) => numero(valor)}
                />
              )}
            </Cartao>
          </div>
        </div>

        <div className="space-y-3">
          <Cartao titulo="Top riscos" subtitulo={numero(data.riscos.total) + " risco(s) · " + numero(data.riscos.criticos) + " crítico(s)"} icone={ShieldAlert} corIcone="#DC2626">
            {data.riscos.top.length === 0 ? (
              <p className="text-xs text-fg-muted">Nenhum risco aberto registrado para este projeto.</p>
            ) : (
              <ul className="space-y-2">
                {data.riscos.top.map((risco) => (
                  <li key={risco.id} className="flex items-start gap-2 rounded-sgp border border-border bg-surface-2 px-2.5 py-2">
                    <span className="mt-0.5 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: risco.cor }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-2xs font-semibold text-fg-subtle">{risco.codigo}</span>
                      <span className="block text-xs text-fg">{risco.descricao}</span>
                      <span className="mt-0.5 block text-2xs text-fg-muted">
                        P{risco.probabilidade} × I{risco.impacto} · severidade {numero(risco.severidade)}
                        {risco.responsavel ? " · " + risco.responsavel : ""}
                      </span>
                    </span>
                    <Etiqueta cor={risco.cor}>{risco.nivel}</Etiqueta>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao titulo="Próximos marcos" subtitulo={numero(data.marcos.length) + " marco(s)"} icone={Flag} corIcone="#F59E0B">
            {data.marcos.length === 0 ? (
              <p className="text-xs text-fg-muted">Nenhum marco cadastrado.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.marcos.slice(0, 8).map((marco) => (
                  <li key={marco.id} className="flex items-center gap-2 rounded-sgp px-1 py-1.5 hover:bg-surface-2">
                    <Flag className="size-3.5 shrink-0" style={{ color: marco.cor || "#F59E0B" }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-fg">{marco.nome}</span>
                      <span className="block text-2xs text-fg-muted">
                        {dataCurta(marco.data_prevista)}
                        {marco.critico ? " · crítico" : ""}
                      </span>
                    </span>
                    {marco.atrasado ? (
                      <Etiqueta tom="danger">Atrasado</Etiqueta>
                    ) : marco.status === "CONCLUIDO" ? (
                      <Etiqueta tom="success" icone={CheckCircle2}>
                        Concluído
                      </Etiqueta>
                    ) : (
                      <Etiqueta tom="neutral">{marco.status_rotulo || marco.status}</Etiqueta>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao titulo="Carga por responsável" subtitulo="Tarefas e horas estimadas" icone={Users} corIcone="#0891B2">
            {responsaveis.length === 0 ? (
              <p className="text-xs text-fg-muted">Nenhuma tarefa com responsável definido.</p>
            ) : (
              <ul className="space-y-2">
                {responsaveis.slice(0, 8).map((pessoa) => (
                  <li key={pessoa.user_id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar nome={pessoa.nome} cor={pessoa.cor} iniciais={pessoa.iniciais} tamanho="xs" />
                      <span className="min-w-0 flex-1 truncate text-xs text-fg">{pessoa.nome}</span>
                      <span className="shrink-0 text-2xs tabular-nums text-fg-muted">
                        {numero(pessoa.total)} tarefa(s) · {numero(pessoa.horas)} h
                      </span>
                    </div>
                    <BarraProgresso
                      valor={(pessoa.horas / maxHorasResponsavel) * 100}
                      altura="sm"
                      cor={pessoa.atrasadas > 0 ? "#D97706" : "#059669"}
                    />
                    <p className="text-2xs text-fg-subtle">
                      {numero(pessoa.concluidas)} concluída(s) · {numero(pessoa.atrasadas)} atrasada(s)
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          {conflitos.length > 0 && (
            <Cartao titulo="Conflitos de recursos" subtitulo={numero(conflitos.length) + " alerta(s) de sobrecarga"} icone={AlertTriangle} corIcone="#DC2626">
              <ul className="space-y-2">
                {conflitos.map((conflito, posicao) => (
                  <li key={String(conflito.user_id) + "-" + String(posicao)} className="rounded-sgp border border-danger/40 bg-danger-soft/25 px-2.5 py-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-danger">
                      <AlertTriangle className="size-3.5" aria-hidden />
                      {conflito.user_nome} · {numero(conflito.total_percentual)}% na semana {dataCurta(conflito.semana)}
                    </p>
                    <p className="mt-0.5 text-2xs text-fg-muted">
                      Excesso de {numero(conflito.excesso)}% · severidade {conflito.severidade}
                    </p>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}

          {data.kpis.length > 0 && (
            <Cartao titulo="KPIs do projeto" subtitulo={numero(data.kpis.length) + " indicador(es)"} icone={Target} corIcone="#8B5CF6">
              <ul className="space-y-2">
                {data.kpis.map((kpi) => (
                  <li key={kpi.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-fg">{kpi.nome}</span>
                      <span className="shrink-0 tabular-nums text-fg-muted">
                        {numero(Number(kpi.valor_atual))} / {numero(Number(kpi.valor_meta))} {kpi.unidade}
                      </span>
                    </div>
                    <BarraProgresso
                      valor={Math.min(120, kpi.atingimento)}
                      altura="sm"
                      cor={kpi.situacao === "VERDE" ? "#059669" : kpi.situacao === "AMARELO" ? "#D97706" : "#DC2626"}
                      mostrarValor
                    />
                  </li>
                ))}
              </ul>
            </Cartao>
          )}

          <p className="px-1 text-2xs text-fg-subtle">
            Painel do projeto {projeto.codigo} · atualizado {dataRelativa(projeto.atualizado_em)}
          </p>
        </div>
      </div>
    </div>
  );
}

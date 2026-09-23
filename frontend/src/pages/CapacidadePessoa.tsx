/* ==========================================================================
   Ocupação semanal de um colaborador — RF-14 / RF-17
   Rota: /capacidade/:userId
   ========================================================================== */
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarDays,
  Clock,
  ExternalLink,
  Flame,
  Gauge,
  Layers,
  RefreshCw,
  Snowflake,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  Avatar,
  BarraFerramentas,
  BarraProgresso,
  Botao,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Cartao,
  Chip,
  ControleDeslizante,
  Esqueleto,
  Etiqueta,
  Tabela,
  Vazio,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import { EscalaCores, GraficoLinha, Sparkline } from "@/components/charts";
import { GradeCards, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { media, soma } from "@/lib/utils";
import { dataCurta, hojeISO, moeda, numero, percentual } from "@/lib/format";
import type { Alocacao, Usuario } from "@/lib/types";

/* ==========================================================================
   Tipos
   ========================================================================== */

interface SemanaOcupacao {
  semana: string;
  rotulo: string;
  ocupacao: number;
  disponivel: number;
  situacao: "SUPERALOCADO" | "OCUPADO" | "DISPONIVEL" | "OCIOSO" | string;
}

interface RespostaCapacidade {
  user_id: number;
  semanas: SemanaOcupacao[];
  horas_apontadas: number;
}

/* ==========================================================================
   Metadados
   ========================================================================== */

interface DefSituacao {
  rotulo: string;
  tom: Tom;
  cor: string;
  icone: LucideIcon;
  descricao: string;
}

const SITUACOES: Record<string, DefSituacao> = {
  SUPERALOCADO: {
    rotulo: "Superalocado",
    tom: "danger",
    cor: "#DC2626",
    icone: Flame,
    descricao: "acima de 100% de dedicação",
  },
  OCUPADO: { rotulo: "Ocupado", tom: "warning", cor: "#D97706", icone: Clock, descricao: "entre 85% e 100%" },
  DISPONIVEL: { rotulo: "Disponível", tom: "success", cor: "#059669", icone: UserCheck, descricao: "com folga de capacidade" },
  OCIOSO: { rotulo: "Ocioso", tom: "info", cor: "#0891B2", icone: Snowflake, descricao: "sem alocação na semana" },
};

function defSituacao(situacao: string): DefSituacao {
  return SITUACOES[situacao] ?? SITUACOES.DISPONIVEL;
}

const MODALIDADE_ROTULO: Record<string, string> = {
  PERFORMANCE: "Performance imediata",
  DESENVOLVIMENTO: "Desenvolvimento",
  MISTA: "Mista",
  MANUAL: "Manual",
};

/* ==========================================================================
   Página
   ========================================================================== */

export default function CapacidadePessoa() {
  const { userId } = useParams<{ userId: string }>();
  const navegar = useNavigate();

  const [semanas, setSemanas] = useState(12);

  /* ------------------------------- Consultas ------------------------------ */

  const pessoa = useConsulta<Usuario>(["usuario", userId ?? ""], userId ? "/usuarios/" + userId + "/" : null);
  const capacidade = useConsulta<RespostaCapacidade>(
    ["capacidade", "colaborador"],
    userId ? "/capacidade/" + userId + "/" : null,
    { semanas }
  );
  const alocacoes = useLista<Alocacao>(CHAVES.alocacoes, userId ? "/alocacoes/" : null, {
    user: userId || undefined,
    page_size: 200,
  });

  /* -------------------------------- Derivados ----------------------------- */

  const serie = capacidade.data?.semanas ?? [];
  const horasApontadas = capacidade.data?.horas_apontadas ?? 0;
  const hoje = hojeISO();

  const estatisticas = useMemo(() => {
    const ocupacoes = serie.map((s) => s.ocupacao);
    return {
      media: media(ocupacoes),
      maxima: ocupacoes.length ? Math.max.apply(null, ocupacoes) : 0,
      minima: ocupacoes.length ? Math.min.apply(null, ocupacoes) : 0,
      superalocadas: serie.filter((s) => s.situacao === "SUPERALOCADO").length,
      ociosas: serie.filter((s) => s.situacao === "OCIOSO").length,
      disponiveis: serie.filter((s) => s.situacao === "DISPONIVEL").length,
      ocupadas: serie.filter((s) => s.situacao === "OCUPADO").length,
      atual: serie.length ? serie[0].ocupacao : 0,
    };
  }, [serie]);

  const futuras = useMemo(
    () =>
      (alocacoes.data ?? [])
        .filter((a) => a.data_fim >= hoje)
        .sort((a, b) => (a.data_inicio < b.data_inicio ? -1 : 1)),
    [alocacoes.data, hoje]
  );

  const custoTotal = useMemo(() => soma(futuras.map((a) => Number(a.custo_estimado || 0))), [futuras]);

  const alocacoesVigentes = useMemo(
    () => futuras.filter((a) => a.data_inicio <= hoje && a.data_fim >= hoje),
    [futuras, hoje]
  );

  /* --------------------------------- Colunas ------------------------------ */

  const colunas: Array<ColunaTabela<Alocacao>> = [
    {
      chave: "projeto",
      titulo: "Projeto / tarefa",
      ordenavel: true,
      valorOrdenacao: (a) => a.project_nome,
      renderizar: (a) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-xs font-medium text-fg">
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: a.project_cor }} />
            {a.project_nome}
          </p>
          <p className="truncate text-2xs text-fg-subtle">{a.task_nome || "Sem tarefa vinculada"}</p>
        </div>
      ),
    },
    {
      chave: "periodo",
      titulo: "Período",
      largura: "180px",
      ordenavel: true,
      valorOrdenacao: (a) => a.data_inicio,
      renderizar: (a) => (
        <span className="text-2xs text-fg-muted">
          {dataCurta(a.data_inicio) + " → " + dataCurta(a.data_fim)}
        </span>
      ),
    },
    {
      chave: "percentual",
      titulo: "Dedicação",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (a) => a.percentual,
      renderizar: (a) => (
        <div className="w-28">
          <BarraProgresso valor={a.percentual} cor={a.project_cor || "#2563EB"} altura="sm" mostrarValor />
        </div>
      ),
    },
    {
      chave: "modalidade",
      titulo: "Modalidade",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (a) => a.modalidade,
      renderizar: (a) => (
        <Etiqueta tom="brand">{MODALIDADE_ROTULO[a.modalidade] ?? a.modalidade}</Etiqueta>
      ),
    },
    {
      chave: "status",
      titulo: "Status",
      largura: "120px",
      ordenavel: true,
      valorOrdenacao: (a) => a.status,
      renderizar: (a) => <Etiqueta tom={a.vigente ? "success" : "neutral"}>{a.status_rotulo || a.status}</Etiqueta>,
    },
    {
      chave: "custo",
      titulo: "Custo estimado",
      largura: "130px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (a) => Number(a.custo_estimado || 0),
      renderizar: (a) => <span className="text-xs tabular-nums text-fg-muted">{moeda(a.custo_estimado)}</span>,
    },
  ];

  /* ---------------------------------- UI ---------------------------------- */

  if (!userId) {
    return (
      <Vazio
        icone={Users}
        titulo="Colaborador não informado"
        descricao="Abra esta tela a partir do mapa de ocupação ou da lista de pessoas."
        acao={
          <Botao variante="primario" icone={ArrowLeft} onClick={() => navegar("/capacidade")}>
            Voltar ao planejamento
          </Botao>
        }
      />
    );
  }

  const dadosPessoa = pessoa.data;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo={dadosPessoa ? dadosPessoa.nome : "Ocupação do colaborador"}
        subtitulo={
          dadosPessoa
            ? (dadosPessoa.cargo || "Cargo não informado") + " · " + (dadosPessoa.area || "Área não informada")
            : "Carregando dados do colaborador..."
        }
        icone={Gauge}
        cor="#0891B2"
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Planejamento de capacidade", onClick: () => navegar("/capacidade") },
          { rotulo: dadosPessoa ? dadosPessoa.nome : "Colaborador" },
        ]}
        acoes={
          <>
            <Botao
              variante="secundario"
              icone={RefreshCw}
              carregando={capacidade.isFetching}
              onClick={() => {
                capacidade.refetch();
                alocacoes.refetch();
                pessoa.refetch();
              }}
            >
              Atualizar
            </Botao>
            <Botao variante="primario" icone={ExternalLink} onClick={() => navegar("/pessoas/" + userId)}>
              Perfil de capacidades
            </Botao>
          </>
        }
        filhos={
          pessoa.isLoading ? (
            <Esqueleto linhas={2} />
          ) : dadosPessoa ? (
            <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
              <Avatar
                nome={dadosPessoa.nome}
                cor={dadosPessoa.cor}
                iniciais={dadosPessoa.iniciais}
                url={dadosPessoa.avatar_display}
                tamanho="xl"
                anel
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{dadosPessoa.nome}</p>
                <p className="truncate text-2xs text-fg-muted">
                  {dadosPessoa.cargo || "Sem cargo"} · {dadosPessoa.area || "Sem área"} ·{" "}
                  {dadosPessoa.localizacao || "Localização não informada"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Etiqueta tom="neutral" icone={Briefcase}>
                    {dadosPessoa.perfil}
                  </Etiqueta>
                  <Etiqueta tom="info" icone={Clock}>
                    {"Capacidade semanal: " + numero(dadosPessoa.capacidade_semanal_horas) + " h"}
                  </Etiqueta>
                  {dadosPessoa.custo_hora_visivel && dadosPessoa.custo_hora !== null ? (
                    <Etiqueta tom="warning" icone={BarChart3}>
                      {moeda(dadosPessoa.custo_hora) + "/hora"}
                    </Etiqueta>
                  ) : (
                    <Etiqueta tom="neutral">Custo restrito</Etiqueta>
                  )}
                  <Etiqueta tom={dadosPessoa.ativo ? "success" : "neutral"}>
                    {dadosPessoa.ativo ? "ativo" : "inativo"}
                  </Etiqueta>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-2xs text-fg-subtle">Ocupação atual</span>
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: defSituacao(serie.length ? serie[0].situacao : "OCIOSO").cor }}
                >
                  {percentual(estatisticas.atual)}
                </span>
                <Etiqueta tom={defSituacao(serie.length ? serie[0].situacao : "OCIOSO").tom}>
                  {defSituacao(serie.length ? serie[0].situacao : "OCIOSO").rotulo}
                </Etiqueta>
              </div>
            </div>
          ) : pessoa.isError ? (
            <Alerta tom="danger" titulo="Não foi possível carregar o colaborador">
              {mensagemErro(pessoa.error)}
            </Alerta>
          ) : null
        }
      />

      {capacidade.isError && (
        <Alerta tom="danger" titulo="Não foi possível calcular a ocupação">
          {mensagemErro(capacidade.error)}
        </Alerta>
      )}

      <LinhaKPI
        itens={[
          { rotulo: "Ocupação média", valor: percentual(estatisticas.media, 1), icone: Gauge, cor: "#2563EB", subrotulo: "no horizonte analisado" },
          { rotulo: "Pico de ocupação", valor: percentual(estatisticas.maxima, 0), icone: Flame, cor: "#DC2626", subrotulo: "maior semana" },
          { rotulo: "Menor ocupação", valor: percentual(estatisticas.minima, 0), icone: Snowflake, cor: "#0891B2", subrotulo: "semana mais livre" },
          { rotulo: "Horas apontadas", valor: numero(horasApontadas, 1) + " h", icone: Clock, cor: "#8B5CF6", subrotulo: "timesheet registrado" },
          { rotulo: "Semanas superalocadas", valor: numero(estatisticas.superalocadas), icone: AlertTriangle, cor: "#DC2626", subrotulo: "acima de 100%" },
          { rotulo: "Alocações futuras", valor: numero(futuras.length), icone: Layers, cor: "#059669", subrotulo: numero(alocacoesVigentes.length) + " vigentes hoje" },
        ]}
      />

      <Cartao
        titulo="Ocupação ao longo das semanas"
        subtitulo={"Percentual de dedicação semanal · linha de referência em 100%"}
        icone={BarChart3}
        corIcone="#2563EB"
        acao={
          <div className="w-56">
            <ControleDeslizante
              valor={semanas}
              onChange={setSemanas}
              min={4}
              max={26}
              rotulo="Horizonte"
              sufixo=" sem"
              marcos={[4, 12, 26]}
            />
          </div>
        }
      >
        {capacidade.isLoading ? (
          <CarregandoBloco rotulo="Calculando ocupação semanal..." />
        ) : serie.length === 0 ? (
          <Vazio
            icone={CalendarDays}
            titulo="Sem semanas para exibir"
            descricao="Não há dados de capacidade para este colaborador no período solicitado."
          />
        ) : (
          <GraficoLinha
            rotulos={serie.map((s) => s.rotulo)}
            series={[
              { nome: "Ocupação", cor: "#2563EB", dados: serie.map((s) => s.ocupacao), area: true },
              { nome: "Disponível", cor: "#059669", dados: serie.map((s) => s.disponivel), tracejada: true },
              { nome: "Referência 100%", cor: "#DC2626", dados: serie.map(() => 100), tracejada: true },
            ]}
            altura={280}
            formatarValor={(v) => numero(v, 0) + "%"}
            mostrarLegenda
            mostrarArea
          />
        )}
      </Cartao>

      <Cartao
        titulo="Situação semana a semana"
        subtitulo="Classificação automática da carga alocada em cada semana"
        icone={CalendarDays}
        corIcone="#0891B2"
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {Object.keys(SITUACOES).map((chave) => {
            const def = SITUACOES[chave];
            const Icone = def.icone;
            return (
              <span key={chave} className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
                <Icone className="size-3.5" style={{ color: def.cor }} aria-hidden />
                {def.rotulo + " · " + def.descricao}
              </span>
            );
          })}
          <EscalaCores
            titulo="Carga"
            rotulos={["0%", "1-84%", "85-100%", ">100%"]}
            cores={["#64748B", "#2563EB", "#D97706", "#DC2626"]}
          />
        </div>

        {capacidade.isLoading ? (
          <Esqueleto linhas={3} />
        ) : serie.length === 0 ? (
          <Vazio icone={CalendarDays} titulo="Nenhuma semana calculada" />
        ) : (
          <GradeCards colunas={6}>
            {serie.map((semana) => {
              const def = defSituacao(semana.situacao);
              const Icone = def.icone;
              return (
                <div
                  key={semana.semana}
                  className="rounded-sgp-lg border p-2.5 shadow-n1"
                  style={{ borderColor: def.cor + "55", backgroundColor: def.cor + "12" }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-fg">{semana.rotulo}</span>
                    <Icone className="size-3.5" style={{ color: def.cor }} aria-hidden />
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: def.cor }}>
                    {percentual(semana.ocupacao)}
                  </p>
                  <p className="text-2xs text-fg-muted">{"livre " + percentual(semana.disponivel)}</p>
                  <div className="mt-1.5">
                    <BarraProgresso valor={Math.min(100, semana.ocupacao)} cor={def.cor} altura="sm" />
                  </div>
                  <p className="mt-1.5 truncate text-2xs font-medium" style={{ color: def.cor }}>
                    {def.rotulo}
                  </p>
                  <p className="truncate text-2xs text-fg-subtle">{dataCurta(semana.semana)}</p>
                </div>
              );
            })}
          </GradeCards>
        )}
      </Cartao>

      <Cartao
        titulo="Alocações futuras"
        subtitulo={numero(futuras.length) + " alocação(ões) a partir de hoje · custo estimado " + moeda(custoTotal)}
        icone={Layers}
        corIcone="#059669"
        semPadding
      >
        {alocacoes.isLoading ? (
          <CarregandoBloco rotulo="Carregando alocações..." />
        ) : alocacoes.isError ? (
          <div className="p-4">
            <Alerta tom="danger" titulo="Não foi possível carregar as alocações">
              {mensagemErro(alocacoes.error)}
            </Alerta>
          </div>
        ) : (
          <Tabela
            colunas={colunas}
            dados={futuras}
            compacta
            destaqueLinha={(a) => (a.vigente ? "bg-success-soft/25" : undefined)}
            vazio={
              <Vazio
                icone={Layers}
                titulo="Nenhuma alocação futura"
                descricao="Este colaborador não possui alocações ativas ou planejadas a partir de hoje."
                acao={
                  <Botao variante="primario" icone={Layers} onClick={() => navegar("/alocacao")}>
                    Alocar no planejamento
                  </Botao>
                }
              />
            }
          />
        )}
      </Cartao>

      <GradeCards colunas={3}>
        <Cartao titulo="Distribuição da carga" subtitulo="Como as semanas se classificam" icone={BarChart3} corIcone="#8B5CF6">
          <div className="space-y-2.5">
            {[
              { chave: "SUPERALOCADO", total: estatisticas.superalocadas },
              { chave: "OCUPADO", total: estatisticas.ocupadas },
              { chave: "DISPONIVEL", total: estatisticas.disponiveis },
              { chave: "OCIOSO", total: estatisticas.ociosas },
            ].map((item) => {
              const def = defSituacao(item.chave);
              const Icone = def.icone;
              const total = Math.max(1, serie.length);
              return (
                <div key={item.chave}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-fg">
                      <Icone className="size-3.5" style={{ color: def.cor }} aria-hidden />
                      {def.rotulo}
                    </span>
                    <span className="text-2xs tabular-nums text-fg-muted">
                      {numero(item.total) + " de " + numero(serie.length) + " semanas"}
                    </span>
                  </div>
                  <BarraProgresso valor={(item.total / total) * 100} cor={def.cor} altura="sm" mostrarValor />
                </div>
              );
            })}
          </div>
        </Cartao>

        <Cartao titulo="Tendência de ocupação" subtitulo="Evolução semanal da carga alocada" icone={Gauge} corIcone="#2563EB">
          {serie.length === 0 ? (
            <Esqueleto linhas={2} />
          ) : (
            <div className="space-y-3">
              <Sparkline dados={serie.map((s) => s.ocupacao)} cor="#2563EB" altura={56} largura={280} area />
              <div className="grid grid-cols-2 gap-2 text-2xs">
                <div className="rounded-sgp border border-border bg-surface-2 p-2">
                  <p className="text-fg-subtle">Média</p>
                  <p className="text-sm font-semibold tabular-nums text-fg">{percentual(estatisticas.media, 1)}</p>
                </div>
                <div className="rounded-sgp border border-border bg-surface-2 p-2">
                  <p className="text-fg-subtle">Variação</p>
                  <p className="text-sm font-semibold tabular-nums text-fg">
                    {numero(estatisticas.maxima - estatisticas.minima, 0) + " pts"}
                  </p>
                </div>
              </div>
              <Alerta
                tom={estatisticas.superalocadas > 0 ? "warning" : "success"}
                titulo={
                  estatisticas.superalocadas > 0
                    ? numero(estatisticas.superalocadas) + " semana(s) acima de 100%"
                    : "Carga dentro do limite"
                }
                icone={estatisticas.superalocadas > 0 ? AlertTriangle : BadgeCheck}
              >
                {estatisticas.superalocadas > 0
                  ? "Redistribua alocações ou reduza a dedicação para evitar sobrecarga e risco de atraso."
                  : "Nenhuma semana ultrapassou a capacidade de 100% no horizonte analisado."}
              </Alerta>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Contexto do colaborador" subtitulo="Dados cadastrais relevantes para a alocação" icone={Users} corIcone="#0891B2">
          {!dadosPessoa ? (
            <Esqueleto linhas={4} />
          ) : (
            <div className="space-y-2.5 text-xs">
              <Campo rotulo="Gestor">
                <span className="text-fg">{dadosPessoa.gestor_nome || "Não informado"}</span>
              </Campo>
              <Campo rotulo="Admissão">
                <span className="text-fg">{dadosPessoa.data_admissao ? dataCurta(dadosPessoa.data_admissao) : "Não informada"}</span>
              </Campo>
              <Campo rotulo="Aceita recomendações do motor">
                <Etiqueta tom={dadosPessoa.aceita_recomendacoes ? "success" : "warning"}>
                  {dadosPessoa.aceita_recomendacoes ? "sim" : "não"}
                </Etiqueta>
              </Campo>
              <Campo rotulo="Mentoria">
                <Etiqueta tom={dadosPessoa.disponivel_para_mentoria ? "success" : "neutral"}>
                  {dadosPessoa.disponivel_para_mentoria ? "disponível como mentor" : "não disponível"}
                </Etiqueta>
              </Campo>
              {dadosPessoa.interesses.length > 0 && (
                <Campo rotulo="Interesses">
                  <div className="flex flex-wrap gap-1.5">
                    {dadosPessoa.interesses.slice(0, 8).map((interesse) => (
                      <Chip key={interesse} cor="#8B5CF6">
                        {interesse}
                      </Chip>
                    ))}
                  </div>
                </Campo>
              )}
              <Botao
                variante="secundario"
                tamanho="sm"
                icone={ExternalLink}
                larguraTotal
                onClick={() => navegar("/pessoas/" + dadosPessoa.id)}
              >
                Abrir perfil de capacidades
              </Botao>
            </div>
          )}
        </Cartao>
      </GradeCards>

      <BarraFerramentas className="justify-between">
        <span className="inline-flex items-center gap-2 text-2xs text-fg-muted">
          <Clock className="size-3.5" aria-hidden />
          A ocupação considera alocações confirmadas e em execução no período de cada semana.
        </span>
        <span className="inline-flex items-center gap-2 text-2xs text-fg-subtle">
          <AlertTriangle className="size-3.5" aria-hidden />
          Semanas acima de 100% geram alertas de conflito na tela de alocação.
        </span>
      </BarraFerramentas>
    </div>
  );
}

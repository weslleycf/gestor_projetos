/* ==========================================================================
   Auditoria de viés das recomendações de alocação — RNF-18 / especificação §9.4.

   A tela mede disparidade estatística entre grupos de colaboradores nas
   recomendações do motor de matching: taxa de seleção, score médio recebido,
   taxa de override do gestor e distribuição por área, localização, tempo de
   casa, faixa de custo/hora e perfil.

   O aviso metodológico é parte obrigatória da leitura: disparidade não é prova
   de discriminação e todo resultado exige revisão humana qualificada.
   ========================================================================== */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Clock,
  Compass,
  Crosshair,
  History,
  Layers,
  Lightbulb,
  ListChecks,
  Pencil,
  Percent,
  RefreshCw,
  Scale,
  ScrollText,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  CarregandoBloco,
  Cartao,
  Chip,
  Esqueleto,
  Etiqueta,
  GradeCards,
  PainelLateral,
  SecaoColapsavel,
  Segmentado,
  Selecao,
  Tabela,
  Vazio,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import { EscalaCores } from "@/components/charts";
import { BarraFerramentas, FiltroSelect, LinhaKPI } from "@/components/layout";
import { useConsulta, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, dataHora, dataRelativa, indice, numero, percentual } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Paginado } from "@/lib/types";

/* ==========================================================================
   Tipos devolvidos pela auditoria
   ========================================================================== */

interface DetalhesVies {
  dimensao: string;
  metrica_base: string;
  taxa_selecao: number;
  score_medio: number;
  taxa_override: number;
  posicao_media: number;
  recomendacoes_recebidas: number;
  pessoas_no_grupo: number;
  amostra_suficiente: boolean;
  overrides_registrados: number;
  referencia_calculada: boolean;
}

interface MetricaVies {
  dimensao: string;
  dimensao_rotulo: string;
  grupo: string;
  metrica: string;
  metrica_rotulo: string;
  tamanho_grupo: number;
  pessoas_no_grupo: number;
  valor_grupo: number;
  valor_referencia: number;
  disparidade: number;
  disparidade_percentual: number;
  severidade: string;
  severidade_rotulo: string;
  taxa_selecao: number;
  score_medio: number;
  taxa_override: number;
  posicao_media: number;
  amostra_suficiente: boolean;
  recomendacao: string;
  detalhes: DetalhesVies;
}

interface ResumoVies {
  grupos_avaliados: number;
  registros_ok: number;
  registros_atencao: number;
  registros_criticos: number;
  grupos_criticos: number;
  grupos_em_atencao: number;
  dimensoes: Array<{ chave: string; rotulo: string }>;
  taxa_selecao_geral: number;
  score_medio_geral: number;
  taxa_override_geral: number;
  posicao_media_geral: number;
  amostra_suficiente: boolean;
  minimo_amostra_confiavel: number;
}

interface GrupoCritico {
  dimensao: string;
  dimensao_rotulo: string;
  grupo: string;
  metrica: string;
  disparidade: number;
  severidade: string;
}

interface RespostaVies {
  periodo: { inicio: string; fim: string; dias: number };
  total_recomendacoes: number;
  total_aceitas: number;
  total_overrides: number;
  metricas: MetricaVies[];
  resumo: ResumoVies;
  grupos_criticos: GrupoCritico[];
  aviso_metodologico: string;
  salvo: boolean;
  registros_salvos: number;
}

interface RegistroAuditoria {
  id: number;
  periodo_inicio: string;
  periodo_fim: string;
  metrica: string;
  metrica_rotulo: string;
  grupo: string;
  tamanho_grupo: number;
  valor_grupo: number;
  valor_referencia: number;
  disparidade: number;
  disparidade_percentual: number;
  severidade: string;
  severidade_rotulo: string;
  recomendacao: string;
  detalhes: Record<string, unknown>;
  criado_em: string;
}

/* ==========================================================================
   Apoio de apresentação
   ========================================================================== */

const TONS_SEVERIDADE: Record<string, Tom> = {
  OK: "success",
  ATENCAO: "warning",
  CRITICO: "danger",
};

const PALETA_SEVERIDADE: Record<string, string> = {
  OK: "#059669",
  ATENCAO: "#D97706",
  CRITICO: "#DC2626",
};

const EXPLICACOES_DIMENSAO: Record<string, string> = {
  AREA: "Compara as recomendações recebidas pelas áreas da organização: quem foi mais ou menos selecionado e com que score.",
  LOCAL: "Compara as localidades de trabalho cadastradas, para verificar se a distância pesa nas recomendações.",
  TEMPO_DE_CASA: "Agrupa as pessoas por faixa de tempo de casa, para verificar se a experiência influencia a seleção.",
  CUSTO_HORA: "Agrupa por faixa de custo/hora, para verificar se o custo do profissional influencia a decisão do motor.",
  PERFIL: "Compara os perfis de acesso do sistema, para verificar se o papel da pessoa influencia as recomendações.",
};

const METRICAS_FILTRO: Array<{ valor: string; rotulo: string }> = [
  { valor: "TAXA_SELECAO", rotulo: "Taxa de seleção" },
  { valor: "SCORE_MEDIO", rotulo: "Score médio recebido" },
  { valor: "OVERRIDE", rotulo: "Taxa de override do gestor" },
  { valor: "DISTRIBUICAO_AREA", rotulo: "Distribuição por área" },
  { valor: "DISTRIBUICAO_LOCAL", rotulo: "Distribuição por localização" },
  { valor: "TEMPO_DE_CASA", rotulo: "Distribuição por tempo de casa" },
];

function ehPercentual(metrica: string): boolean {
  return metrica !== "SCORE_MEDIO";
}

function formatarValorVies(metrica: string, valor: number): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return ehPercentual(metrica) ? percentual(valor * 100, 1) : indice(valor, 2);
}

function corDaDisparidade(severidade: string, disparidade: number): string {
  if (severidade === "CRITICO") return disparidade < 0 ? "#DC2626" : "#EF4444";
  if (severidade === "ATENCAO") return "#F59E0B";
  return disparidade < 0 ? "#0891B2" : "#059669";
}

/* ==========================================================================
   Barras divergentes (linha zero no centro)
   ========================================================================== */

function BarrasDivergentes({
  itens,
  maximo,
  rotuloNegativo,
  rotuloPositivo,
  formatar,
}: {
  itens: Array<{ rotulo: string; valor: number; cor: string; detalhe?: string }>;
  maximo: number;
  rotuloNegativo: string;
  rotuloPositivo: string;
  formatar: (v: number) => string;
}) {
  const limite = Math.abs(maximo) > 0 ? Math.abs(maximo) : 1;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-2xs text-fg-subtle">
        <span>{"← " + rotuloNegativo}</span>
        <span>linha zero (média geral)</span>
        <span>{rotuloPositivo + " →"}</span>
      </div>
      {itens.map((item) => {
        const largura = Math.min(1, Math.abs(item.valor) / limite) * 50;
        return (
          <div key={item.rotulo} className="flex items-center gap-2" title={item.detalhe || item.rotulo}>
            <span className="w-32 shrink-0 truncate text-2xs text-fg-muted">{item.rotulo}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-3">
              <span className="absolute inset-y-0 left-1/2 w-px bg-border-strong" aria-hidden />
              <span
                className="absolute inset-y-0 rounded-full transition-all duration-500"
                style={
                  item.valor >= 0
                    ? { left: "50%", width: largura + "%", backgroundColor: item.cor }
                    : { right: "50%", width: largura + "%", backgroundColor: item.cor }
                }
              />
            </div>
            <span className="w-16 shrink-0 text-right text-2xs font-semibold tabular-nums" style={{ color: item.cor }}>
              {formatar(item.valor)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function AuditoriaVies() {
  const navegar = useNavigate();

  const [dias, setDias] = useState<"30" | "90" | "180" | "365">("180");
  const [pagina, setPagina] = useState(1);
  const [filtroMetrica, setFiltroMetrica] = useState("");
  const [filtroSeveridade, setFiltroSeveridade] = useState("");
  const [registroSelecionado, setRegistroSelecionado] = useState<RegistroAuditoria | null>(null);

  const vies = useConsulta<RespostaVies>(["analytics", "vies"], "/analytics/vies/", { dias: Number(dias) });

  const parametrosHistorico = useMemo(() => {
    const params: Record<string, unknown> = { page: pagina };
    if (filtroMetrica) params.metrica = filtroMetrica;
    if (filtroSeveridade) params.severidade = filtroSeveridade;
    return params;
  }, [pagina, filtroMetrica, filtroSeveridade]);

  const historico = useConsulta<Paginado<RegistroAuditoria>>(["analytics", "auditorias"], "/analytics/auditorias/", parametrosHistorico);

  const executar = useMutacao<{ dias: number }, RespostaVies>({
    url: "/analytics/vies/executar/",
    invalidar: [["analytics", "vies"], ["analytics", "auditorias"]],
    mensagemSucesso: (resposta) =>
      "Auditoria executada: " + numero(resposta.registros_salvos) + " registro(s) gravado(s) no histórico",
  });

  const dados = vies.data;
  const resumo = dados ? dados.resumo : null;
  const registros = historico.data ? historico.data.results : [];
  const totalRegistros = historico.data ? historico.data.count : 0;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / 50));

  /* -------------------------------------------------- agrupamento por dimensão */

  const porDimensao = useMemo(() => {
    const mapa = new Map<string, MetricaVies[]>();
    (dados ? dados.metricas : []).forEach((item) => {
      const atual = mapa.get(item.dimensao) || [];
      atual.push(item);
      mapa.set(item.dimensao, atual);
    });
    return Array.from(mapa.entries()).map(([chave, itens]) => ({
      chave,
      rotulo: itens.length > 0 ? itens[0].dimensao_rotulo : chave,
      itens,
      selecao: itens.filter((item) => item.metrica !== "SCORE_MEDIO" && item.metrica !== "OVERRIDE"),
    }));
  }, [dados]);

  const metricasAgrupadas = useMemo(() => {
    if (!resumo) return [] as Array<{ valor: string; rotulo: string }>;
    const chaves = new Set((dados ? dados.metricas : []).map((item) => item.metrica));
    return METRICAS_FILTRO.filter((item) => chaves.has(item.valor));
  }, [dados, resumo]);

  /* -------------------------------------------------- indicadores */

  const kpis = [
    {
      rotulo: "Grupos avaliados",
      valor: numero(resumo ? resumo.grupos_avaliados : 0),
      icone: Users,
      cor: "#2563EB",
      subrotulo: resumo ? numero(resumo.dimensoes.length) + " dimensão(ões)" : "",
    },
    {
      rotulo: "Registros críticos",
      valor: numero(resumo ? resumo.registros_criticos : 0),
      icone: ShieldAlert,
      cor: "#DC2626",
      subrotulo: "disparidade acima de 30%",
    },
    {
      rotulo: "Registros em atenção",
      valor: numero(resumo ? resumo.registros_atencao : 0),
      icone: CircleAlert,
      cor: "#D97706",
      subrotulo: "entre 15% e 30%",
    },
    {
      rotulo: "Sem disparidade",
      valor: numero(resumo ? resumo.registros_ok : 0),
      icone: CircleCheck,
      cor: "#059669",
      subrotulo: "abaixo de 15%",
    },
    {
      rotulo: "Grupos críticos",
      valor: numero(resumo ? resumo.grupos_criticos : 0),
      icone: TriangleAlert,
      cor: "#EF4444",
      subrotulo: resumo ? numero(resumo.grupos_em_atencao) + " em atenção" : "",
    },
    {
      rotulo: "Taxa de seleção geral",
      valor: resumo ? percentual(resumo.taxa_selecao_geral * 100, 1) : "—",
      icone: Percent,
      cor: "#0891B2",
      subrotulo: dados ? numero(dados.total_aceitas) + " de " + numero(dados.total_recomendacoes) + " recomendações" : "",
    },
    {
      rotulo: "Score médio recebido",
      valor: resumo ? indice(resumo.score_medio_geral, 2) : "—",
      icone: Target,
      cor: "#8B5CF6",
      subrotulo: "média das recomendações",
    },
    {
      rotulo: "Taxa de override",
      valor: resumo ? percentual(resumo.taxa_override_geral * 100, 1) : "—",
      icone: SlidersHorizontal,
      cor: "#D97706",
      subrotulo: dados ? numero(dados.total_overrides) + " decisão(ões) substituída(s)" : "",
    },
    {
      rotulo: "Posição média no ranking",
      valor: resumo ? indice(resumo.posicao_media_geral, 2) : "—",
      icone: Crosshair,
      cor: "#0EA5E9",
      subrotulo: "quanto menor, melhor colocado",
    },
    {
      rotulo: "Recomendações analisadas",
      valor: numero(dados ? dados.total_recomendacoes : 0),
      icone: ClipboardList,
      cor: "#6366F1",
      subrotulo: "no período auditado",
    },
    {
      rotulo: "Período analisado",
      valor: numero(dados ? dados.periodo.dias : Number(dias)) + " dias",
      icone: Clock,
      cor: "#64748B",
      subrotulo: dados ? dataCurta(dados.periodo.inicio) + " a " + dataCurta(dados.periodo.fim) : "",
    },
    {
      rotulo: "Amostra mínima",
      valor: resumo ? numero(resumo.minimo_amostra_confiavel) + " rec." : "—",
      icone: ListChecks,
      cor: resumo && resumo.amostra_suficiente ? "#059669" : "#DC2626",
      subrotulo: resumo && resumo.amostra_suficiente ? "amostra suficiente" : "amostra insuficiente",
    },
  ];

  /* -------------------------------------------------- tabelas */

  const colunasMetricas: Array<ColunaTabela<{ id: string; item: MetricaVies }>> = [
    {
      chave: "grupo",
      titulo: "Grupo",
      largura: "210px",
      renderizar: (l) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-fg">{l.item.grupo}</p>
          <p className="text-2xs text-fg-subtle">
            {numero(l.item.tamanho_grupo) + " recomendação(ões) · " + numero(l.item.pessoas_no_grupo) + " pessoa(s)"}
          </p>
        </div>
      ),
    },
    {
      chave: "metrica",
      titulo: "Indicador",
      largura: "200px",
      renderizar: (l) => (
        <div className="min-w-0">
          <Etiqueta tom="neutral">{l.item.metrica_rotulo}</Etiqueta>
          <p className="mt-0.5 text-2xs text-fg-subtle">{l.item.amostra_suficiente ? "amostra suficiente" : "amostra pequena"}</p>
        </div>
      ),
    },
    {
      chave: "valor",
      titulo: "Valor do grupo",
      largura: "130px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (l) => l.item.valor_grupo,
      renderizar: (l) => <span className="tabular-nums text-xs font-semibold text-fg">{formatarValorVies(l.item.metrica, l.item.valor_grupo)}</span>,
    },
    {
      chave: "referencia",
      titulo: "Média geral",
      largura: "120px",
      alinhar: "right",
      renderizar: (l) => <span className="tabular-nums text-xs text-fg-muted">{formatarValorVies(l.item.metrica, l.item.valor_referencia)}</span>,
    },
    {
      chave: "disparidade",
      titulo: "Disparidade",
      largura: "120px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (l) => l.item.disparidade,
      renderizar: (l) => (
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: corDaDisparidade(l.item.severidade, l.item.disparidade) }}
        >
          {(l.item.disparidade > 0 ? "+" : "") + percentual(l.item.disparidade * 100, 1)}
        </span>
      ),
    },
    {
      chave: "severidade",
      titulo: "Severidade",
      largura: "130px",
      renderizar: (l) => <Etiqueta tom={TONS_SEVERIDADE[l.item.severidade] || "neutral"}>{l.item.severidade_rotulo}</Etiqueta>,
    },
    {
      chave: "recomendacao",
      titulo: "Recomendação",
      renderizar: (l) => <p className="max-w-2xl text-2xs text-fg-muted">{l.item.recomendacao}</p>,
    },
  ];

  const colunasHistorico: Array<ColunaTabela<RegistroAuditoria>> = [
    {
      chave: "criado",
      titulo: "Executada em",
      largura: "160px",
      ordenavel: true,
      valorOrdenacao: (r) => r.criado_em,
      renderizar: (r) => (
        <div className="min-w-0">
          <p className="text-xs text-fg">{dataHora(r.criado_em)}</p>
          <p className="text-2xs text-fg-subtle">{dataRelativa(r.criado_em)}</p>
        </div>
      ),
    },
    {
      chave: "periodo",
      titulo: "Período",
      largura: "180px",
      renderizar: (r) => <span className="text-2xs text-fg-muted">{dataCurta(r.periodo_inicio) + " a " + dataCurta(r.periodo_fim)}</span>,
    },
    { chave: "metrica", titulo: "Métrica", largura: "190px", renderizar: (r) => <Etiqueta tom="neutral">{r.metrica_rotulo}</Etiqueta> },
    { chave: "grupo", titulo: "Grupo", largura: "170px", ordenavel: true, valorOrdenacao: (r) => r.grupo, renderizar: (r) => <span className="text-xs font-medium text-fg">{r.grupo}</span> },
    { chave: "amostra", titulo: "Amostra", largura: "90px", alinhar: "right", ordenavel: true, valorOrdenacao: (r) => r.tamanho_grupo, renderizar: (r) => <span className="tabular-nums text-xs">{numero(r.tamanho_grupo)}</span> },
    {
      chave: "valores",
      titulo: "Grupo × média",
      largura: "160px",
      alinhar: "right",
      renderizar: (r) => (
        <span className="tabular-nums text-xs text-fg-muted">
          {formatarValorVies(r.metrica, r.valor_grupo) + " × " + formatarValorVies(r.metrica, r.valor_referencia)}
        </span>
      ),
    },
    {
      chave: "disparidade",
      titulo: "Disparidade",
      largura: "110px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (r) => r.disparidade,
      renderizar: (r) => (
        <span className="text-xs font-bold tabular-nums" style={{ color: corDaDisparidade(r.severidade, r.disparidade) }}>
          {(r.disparidade > 0 ? "+" : "") + percentual(r.disparidade * 100, 1)}
        </span>
      ),
    },
    {
      chave: "severidade",
      titulo: "Severidade",
      largura: "130px",
      renderizar: (r) => <Etiqueta tom={TONS_SEVERIDADE[r.severidade] || "neutral"}>{r.severidade_rotulo}</Etiqueta>,
    },
  ];

  /* -------------------------------------------------- orientações */

  const orientacoes: Array<{ titulo: string; texto: string; icone: LucideIcon; botao: string; destino: string }> = [
    {
      titulo: "Revise os pesos do modo Performance",
      texto:
        "Quando um grupo aparece pouco nas recomendações, vale revisar os pesos do modo Performance no motor de matching. Reduzir o peso de custo e de proximidade e aumentar o de aderência técnica costuma equilibrar a seleção sem perder qualidade.",
      icone: Scale,
      botao: "Abrir motor de alocação",
      destino: "/matching",
    },
    {
      titulo: "Incentive o modo Desenvolvimento",
      texto:
        "O modo Desenvolvimento prioriza potencial e lacunas de competência, ampliando a participação de grupos com menos histórico de alocação. Use-o em tarefas de menor criticidade para gerar evidências e reduzir a disparidade ao longo do tempo.",
      icone: Lightbulb,
      botao: "Simular alocação",
      destino: "/matching",
    },
    {
      titulo: "Revise o ranking com o time",
      texto:
        "Leve os grupos com disparidade para a reunião de alocação e discuta caso a caso. O número aponta onde olhar — a decisão sobre pessoas continua sendo humana e colegiada.",
      icone: Compass,
      botao: "Ver alocações",
      destino: "/alocacao",
    },
    {
      titulo: "Registre a justificativa nos overrides",
      texto:
        "Toda vez que a escolha manual substituir a recomendação do motor, registre o motivo. Overrides justificados viram trilha de auditoria e explicam parte da disparidade medida no período seguinte.",
      icone: Pencil,
      botao: "Abrir trilha de auditoria",
      destino: "/admin/auditoria",
    },
  ];

  /* -------------------------------------------------- renderização */

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Auditoria de viés das recomendações"
        subtitulo="Disparidade estatística entre grupos nas recomendações do motor de alocação (RNF-18, §9.4)"
        icone={Scale}
        cor="#D97706"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Período</span>
              <Segmentado
                valor={dias}
                onChange={(valor) => {
                  setDias(valor);
                  setPagina(1);
                }}
                tamanho="sm"
                opcoes={[
                  { valor: "30", rotulo: "30 dias" },
                  { valor: "90", rotulo: "90 dias" },
                  { valor: "180", rotulo: "180 dias" },
                  { valor: "365", rotulo: "365 dias" },
                ]}
              />
            </div>
            <Botao
              variante="primario"
              icone={RefreshCw}
              carregando={executar.isPending}
              onClick={() => executar.mutate({ dias: Number(dias) })}
            >
              Executar nova auditoria
            </Botao>
          </div>
        }
      />

      {/* ============================================ aviso metodológico */}

      <Alerta tom="warning" titulo="Aviso metodológico — leia antes de qualquer decisão" icone={ShieldAlert}>
        <p>{dados ? dados.aviso_metodologico : "Carregando o aviso metodológico da auditoria..."}</p>
        <p className="mt-1.5">
          Na prática: esta tela <strong className="text-fg">não aponta culpados nem comprova discriminação</strong>. Ela mostra
          onde a diferença entre grupos passa dos limites de atenção (15%) e de criticidade (30%) e, por isso, exige
          <strong className="text-fg"> revisão humana qualificada</strong> antes de qualquer decisão que afete pessoas —
          contratação, promoção, alocação ou avaliação.
        </p>
        <p className="mt-1.5">
          Diferenças podem decorrer de especialização técnica, disponibilidade, região de atuação, regime de trabalho ou
          tamanho reduzido da amostra. Resultados com menos de {resumo ? numero(resumo.minimo_amostra_confiavel) : "10"}{" "}
          recomendação(ões) no grupo são sinalizados em cada linha da tabela.
        </p>
      </Alerta>

      {vies.isError && (
        <Alerta tom="danger" titulo="Não foi possível executar a auditoria de viés">
          {mensagemErro(vies.error)}
        </Alerta>
      )}

      {resumo && !resumo.amostra_suficiente && (
        <Alerta tom="info" titulo="Amostra do período abaixo do mínimo confiável" icone={ClipboardList}>
          {"Foram analisadas " + numero(dados ? dados.total_recomendacoes : 0) + " recomendação(ões); o mínimo confiável é de " + numero(resumo.minimo_amostra_confiavel) + ". Amplie o período da auditoria antes de tirar conclusões."}
        </Alerta>
      )}

      {dados && dados.grupos_criticos.length > 0 && (
        <Alerta tom="danger" titulo={"Grupos com disparidade crítica: " + numero(dados.grupos_criticos.length) + " ocorrência(s)"} icone={ShieldAlert}>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {dados.grupos_criticos.map((grupo) => (
              <Chip key={grupo.dimensao + grupo.grupo + grupo.metrica} cor="#DC2626" icone={TriangleAlert}>
                {grupo.dimensao_rotulo + " · " + grupo.grupo + " · " + percentual(grupo.disparidade * 100, 1)}
              </Chip>
            ))}
          </div>
        </Alerta>
      )}

      {vies.isLoading ? (
        <Esqueleto linhas={3} className="rounded-sgp-lg border border-border bg-surface p-4" />
      ) : (
        <LinhaKPI itens={kpis} />
      )}

      {/* ================================================== métricas */}

      {vies.isLoading ? (
        <CarregandoBloco rotulo="Apurando disparidades entre grupos..." />
      ) : !dados || dados.metricas.length === 0 ? (
        <Vazio
          icone={Scale}
          titulo="Nenhuma recomendação no período"
          descricao="A auditoria compara as recomendações geradas pelo motor de alocação. Amplie o período ou gere recomendações no matching para ter dados."
          acao={
            <Botao variante="primario" icone={RefreshCw} onClick={() => executar.mutate({ dias: Number(dias) })}>
              Executar nova auditoria
            </Botao>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta tom="neutral" icone={Layers}>{numero(porDimensao.length) + " dimensão(ões) auditada(s)"}</Etiqueta>
            <Etiqueta tom="neutral" icone={ClipboardList}>{numero(dados.metricas.length) + " comparação(ões)"}</Etiqueta>
            {dados.salvo && <Etiqueta tom="success" icone={CircleCheck}>{"última execução gravou " + numero(dados.registros_salvos) + " registro(s)"}</Etiqueta>}
            <span className="ml-auto">
              <EscalaCores rotulos={["até 15%", "15% a 30%", "acima de 30%"]} cores={["#059669", "#D97706", "#DC2626"]} titulo="Severidade da disparidade" />
            </span>
          </div>

          {porDimensao.map((dimensao) => {
            const itensGrafico = dimensao.selecao.map((item) => ({
              rotulo: item.grupo,
              valor: item.disparidade,
              cor: corDaDisparidade(item.severidade, item.disparidade),
              detalhe:
                item.grupo +
                ": " +
                formatarValorVies(item.metrica, item.valor_grupo) +
                " contra média geral de " +
                formatarValorVies(item.metrica, item.valor_referencia) +
                " · " +
                item.metrica_rotulo,
            }));
            const maximo = Math.max(0.01, ...dimensao.selecao.map((item) => Math.abs(item.disparidade)));
            const criticos = dimensao.itens.filter((item) => item.severidade === "CRITICO").length;
            const atencao = dimensao.itens.filter((item) => item.severidade === "ATENCAO").length;
            return (
              <SecaoColapsavel
                key={dimensao.chave}
                titulo={dimensao.rotulo}
                icone={Layers}
                abertoInicial={criticos > 0}
                contagem={dimensao.selecao.length}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-2xs text-fg-muted">{EXPLICACOES_DIMENSAO[dimensao.chave] || "Comparação entre os grupos desta dimensão."}</p>
                    <span className="ml-auto flex items-center gap-1.5">
                      {criticos > 0 && <Etiqueta tom="danger" icone={ShieldAlert}>{numero(criticos) + " crítica(s)"}</Etiqueta>}
                      {atencao > 0 && <Etiqueta tom="warning" icone={CircleAlert}>{numero(atencao) + " em atenção"}</Etiqueta>}
                      {criticos === 0 && atencao === 0 && <Etiqueta tom="success" icone={CircleCheck}>sem disparidade relevante</Etiqueta>}
                    </span>
                  </div>

                  <div className="rounded-sgp border border-border bg-surface-2 p-3">
                    <p className="text-xs font-semibold text-fg">Disparidade na taxa de seleção por grupo</p>
                    <p className="text-2xs text-fg-subtle">
                      Barras à direita indicam seleção acima da média geral; à esquerda, abaixo. Vermelho marca disparidade
                      negativa relevante.
                    </p>
                    <div className="mt-2">
                      <BarrasDivergentes
                        itens={itensGrafico}
                        maximo={maximo}
                        rotuloNegativo="abaixo da média"
                        rotuloPositivo="acima da média"
                        formatar={(v) => (v > 0 ? "+" : "") + percentual(v * 100, 0)}
                      />
                    </div>
                  </div>

                  <Tabela
                    colunas={colunasMetricas}
                    dados={dimensao.itens.map((item) => ({ id: item.dimensao + "|" + item.metrica + "|" + item.grupo, item }))}
                    compacta
                    destaqueLinha={(l) => (l.item.severidade === "CRITICO" ? "bg-danger-soft/25" : l.item.severidade === "ATENCAO" ? "bg-warning-soft/20" : undefined)}
                    vazio={<Vazio icone={Scale} titulo="Sem grupos nesta dimensão" />}
                  />
                </div>
              </SecaoColapsavel>
            );
          })}
        </div>
      )}

      {/* ================================================== como agir */}

      <SecaoColapsavel titulo="Como agir" icone={Lightbulb} abertoInicial contagem={orientacoes.length}>
        <div className="space-y-3">
          <p className="text-xs text-fg-muted">
            A auditoria só produz efeito quando vira ação de gestão. Estas são as quatro alavancas que atacam as causas mais
            comuns de disparidade nas recomendações de alocação.
          </p>
          <GradeCards colunas={2}>
            {orientacoes.map((orientacao) => (
              <div key={orientacao.titulo} className="flex flex-col rounded-sgp border border-border bg-surface-2 p-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-fg">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-warning-soft/60 text-warning">
                    <orientacao.icone className="size-4" aria-hidden />
                  </span>
                  {orientacao.titulo}
                </span>
                <p className="mt-1.5 flex-1 text-2xs text-fg-muted">{orientacao.texto}</p>
                <div className="mt-2">
                  <Botao tamanho="xs" variante="secundario" iconeDireita={ArrowUpRight} onClick={() => navegar(orientacao.destino)}>
                    {orientacao.botao}
                  </Botao>
                </div>
              </div>
            ))}
          </GradeCards>

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
              <BookOpen className="size-3.5 text-fg-muted" aria-hidden />
              Boas práticas de leitura
            </p>
            <ul className="mt-1.5 space-y-1 text-2xs text-fg-muted">
              <li>· Compare sempre períodos equivalentes e com amostra suficiente; grupos pequenos oscilam muito.</li>
              <li>· Cruze a disparidade de seleção com o score médio recebido: score igual com seleção menor é sinal mais forte.</li>
              <li>· Taxa alta de override no mesmo grupo indica que a decisão humana está substituindo o motor — investigue o motivo registrado.</li>
              <li>· Registre o resultado da revisão: sem registro, a próxima auditoria não consegue explicar a evolução.</li>
            </ul>
          </div>
        </div>
      </SecaoColapsavel>

      {/* ================================================== histórico */}

      <Cartao
        titulo="Histórico de auditorias"
        subtitulo="Cada execução com gravação gera registros comparáveis ao longo do tempo"
        icone={History}
        corIcone="#64748B"
      >
        <div className="space-y-3">
          <BarraFerramentas>
            <FiltroSelect rotulo="Métrica" valor={filtroMetrica} onChange={(valor) => { setFiltroMetrica(valor); setPagina(1); }} opcoes={metricasAgrupadas} />
            <FiltroSelect
              rotulo="Severidade"
              valor={filtroSeveridade}
              onChange={(valor) => {
                setFiltroSeveridade(valor);
                setPagina(1);
              }}
              opcoes={[
                { valor: "OK", rotulo: "Sem disparidade" },
                { valor: "ATENCAO", rotulo: "Atenção" },
                { valor: "CRITICO", rotulo: "Crítico" },
              ]}
            />
            <Selecao
              value={String(pagina)}
              onChange={(e) => setPagina(Number(e.target.value))}
              className="h-8 w-32 py-0 text-xs"
              aria-label="Página do histórico"
            >
              {Array.from({ length: totalPaginas }).map((_, indice) => (
                <option key={indice + 1} value={indice + 1}>
                  {"Página " + (indice + 1)}
                </option>
              ))}
            </Selecao>
            <span className="ml-auto text-2xs text-fg-muted">
              {numero(totalRegistros) + " registro(s) · página " + numero(pagina) + " de " + numero(totalPaginas)}
            </span>
          </BarraFerramentas>

          {historico.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar o histórico de auditorias">
              {mensagemErro(historico.error)}
            </Alerta>
          )}

          {historico.isLoading ? (
            <CarregandoBloco rotulo="Carregando o histórico..." />
          ) : (
            <Tabela
              colunas={colunasHistorico}
              dados={registros}
              compacta
              aoClicarLinha={(registro) => setRegistroSelecionado(registro)}
              destaqueLinha={(registro) =>
                registro.severidade === "CRITICO" ? "bg-danger-soft/25" : registro.severidade === "ATENCAO" ? "bg-warning-soft/20" : undefined
              }
              vazio={
                <Vazio
                  icone={History}
                  titulo="Nenhuma auditoria gravada"
                  descricao="Use Executar nova auditoria para gravar o resultado do período e acompanhar a evolução."
                  acao={
                    <Botao variante="primario" icone={RefreshCw} onClick={() => executar.mutate({ dias: Number(dias) })}>
                      Executar nova auditoria
                    </Botao>
                  }
                />
              }
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-2xs text-fg-muted">{"Exibindo " + numero(registros.length) + " de " + numero(totalRegistros) + " registro(s)"}</span>
            <div className="flex items-center gap-2">
              <Botao tamanho="sm" variante="secundario" disabled={!historico.data || !historico.data.previous} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
                Anterior
              </Botao>
              <span className="text-2xs tabular-nums text-fg-muted">{numero(pagina) + " / " + numero(totalPaginas)}</span>
              <Botao tamanho="sm" variante="secundario" disabled={!historico.data || !historico.data.next} onClick={() => setPagina((p) => p + 1)}>
                Próxima
              </Botao>
            </div>
          </div>
        </div>
      </Cartao>

      {/* ======================================== detalhe de um registro */}

      <PainelLateral
        aberto={registroSelecionado !== null}
        onFechar={() => setRegistroSelecionado(null)}
        titulo="Registro de auditoria"
        subtitulo={registroSelecionado ? registroSelecionado.grupo + " · " + registroSelecionado.metrica_rotulo : ""}
        largura="lg"
        rodape={
          <Botao variante="secundario" onClick={() => setRegistroSelecionado(null)}>
            Fechar
          </Botao>
        }
      >
        {registroSelecionado && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta tom={TONS_SEVERIDADE[registroSelecionado.severidade] || "neutral"}>{registroSelecionado.severidade_rotulo}</Etiqueta>
              <Etiqueta tom="neutral">{registroSelecionado.metrica_rotulo}</Etiqueta>
              <Etiqueta tom="neutral" icone={Clock}>{dataHora(registroSelecionado.criado_em)}</Etiqueta>
              <Etiqueta tom="neutral" icone={Users}>{numero(registroSelecionado.tamanho_grupo) + " recomendação(ões)"}</Etiqueta>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-sgp border border-border bg-surface-2 p-2">
                <p className="text-2xs text-fg-subtle">Valor do grupo</p>
                <p className="mt-0.5 text-xs font-semibold tabular-nums text-fg">{formatarValorVies(registroSelecionado.metrica, registroSelecionado.valor_grupo)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2">
                <p className="text-2xs text-fg-subtle">Média geral</p>
                <p className="mt-0.5 text-xs font-semibold tabular-nums text-fg">{formatarValorVies(registroSelecionado.metrica, registroSelecionado.valor_referencia)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2">
                <p className="text-2xs text-fg-subtle">Disparidade</p>
                <p
                  className="mt-0.5 text-xs font-bold tabular-nums"
                  style={{ color: corDaDisparidade(registroSelecionado.severidade, registroSelecionado.disparidade) }}
                >
                  {(registroSelecionado.disparidade > 0 ? "+" : "") + percentual(registroSelecionado.disparidade * 100, 1)}
                </p>
              </div>
            </div>

            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Período apurado</p>
              <p className="mt-1 text-xs text-fg">
                {dataCurta(registroSelecionado.periodo_inicio) + " a " + dataCurta(registroSelecionado.periodo_fim)}
              </p>
            </div>

            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Recomendação registrada</p>
              <p className="mt-1 text-xs text-fg">{registroSelecionado.recomendacao || "Sem recomendação registrada."}</p>
            </div>

            <SecaoColapsavel titulo="Detalhes da apuração" icone={ScrollText} abertoInicial={false}>
              <div className="space-y-1.5">
                {Object.keys(registroSelecionado.detalhes || {}).map((chave) => (
                  <div key={chave} className="flex items-start justify-between gap-3 rounded-sgp border border-border bg-surface-2 px-2.5 py-1.5">
                    <span className="font-mono text-2xs text-fg-muted">{chave}</span>
                    <span className="text-right text-xs text-fg">{String(registroSelecionado.detalhes[chave])}</span>
                  </div>
                ))}
              </div>
              <pre className="mt-2 max-h-64 overflow-auto scroll-thin rounded-sgp bg-surface-3 p-2 font-mono text-2xs text-fg">
                {JSON.stringify(registroSelecionado, null, 2)}
              </pre>
            </SecaoColapsavel>

            <Alerta tom="warning" titulo="Revisão humana obrigatória" icone={ShieldAlert}>
              Este registro aponta disparidade estatística em um grupo e não constitui prova de discriminação. Analise o contexto
              (disponibilidade, especialização, tamanho da amostra) antes de qualquer decisão sobre pessoas.
            </Alerta>
          </div>
        )}
      </PainelLateral>

      <div className={cn("rounded-sgp border border-border bg-surface-2 p-3 text-2xs text-fg-muted")}>
        <span className="flex items-center gap-1.5">
          <Scale className="size-3.5 shrink-0 text-warning" aria-hidden />
          {"Metodologia: disparidade relativa à média geral do período; limites de " + percentual(15, 0) + " para atenção e " + percentual(30, 0) + " para criticidade. " + (dados ? "Última apuração concluída em " + dataHora(dados.periodo.fim) + "." : "Apuração em andamento.")}
        </span>
      </div>
    </div>
  );
}

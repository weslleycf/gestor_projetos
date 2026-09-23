import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, Building2, CalendarRange, CheckCircle2, Cloud, Cpu, Database, Download,
  FolderKanban, Globe, GraduationCap, HeartPulse, Layers, LayoutGrid, LineChart, List, Plus,
  Rocket, Shield, Smartphone, Target, TrendingUp, Truck, Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta, Avatar, BarraFerramentas, BarraProgresso, Botao, CabecalhoPagina, CarregandoBloco,
  EntradaBusca, Etiqueta, FiltrosAtivos, Interruptor, Segmentado, Semaforo, Tabela, Vazio, useAvisos,
  CORES_PRIORIDADE, type ColunaTabela,
} from "@/components/ui";
import { FiltroSelect, GradeCards, LinhaKPI } from "@/components/layout";
import { Timeline, type ItemTimeline } from "@/components/timeline";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, diasEntre, moeda, numero, percentual } from "@/lib/format";
import { media, soma } from "@/lib/utils";
import type { ProjetoResumo } from "@/lib/types";

/* ==========================================================================
   Lista inteligente de projetos com tres visualizacoes (RF-06 / RF-32 / DV-02)
   Cards, Lista ordenavel e Timeline macro do portfolio.
   ========================================================================== */

type Visao = "cards" | "lista" | "timeline";

const CONTEXTO_VISAO = "projetos.lista";

const ICONES_PROJETO: Record<string, LucideIcon> = {
  "folder-kanban": FolderKanban,
  rocket: Rocket,
  target: Target,
  shield: Shield,
  cloud: Cloud,
  database: Database,
  smartphone: Smartphone,
  globe: Globe,
  cpu: Cpu,
  "chart-line": LineChart,
  building: Building2,
  "heart-pulse": HeartPulse,
  truck: Truck,
  "graduation-cap": GraduationCap,
};

const OPCOES_STATUS = [
  { valor: "IDEIA", rotulo: "Ideia" },
  { valor: "PLANEJADO", rotulo: "Planejado" },
  { valor: "EM_ANALISE", rotulo: "Em análise" },
  { valor: "APROVADO", rotulo: "Aprovado" },
  { valor: "EM_EXECUCAO", rotulo: "Em execução" },
  { valor: "PAUSADO", rotulo: "Pausado" },
  { valor: "CONCLUIDO", rotulo: "Concluído" },
  { valor: "CANCELADO", rotulo: "Cancelado" },
  { valor: "ARQUIVADO", rotulo: "Arquivado" },
];

const OPCOES_SAUDE = [
  { valor: "VERDE", rotulo: "No prazo" },
  { valor: "AMARELO", rotulo: "Atenção" },
  { valor: "VERMELHO", rotulo: "Crítico" },
  { valor: "CINZA", rotulo: "Não avaliado" },
];

const OPCOES_PRIORIDADE = [
  { valor: "BAIXA", rotulo: "Baixa" },
  { valor: "MEDIA", rotulo: "Média" },
  { valor: "ALTA", rotulo: "Alta" },
  { valor: "CRITICA", rotulo: "Crítica" },
];

const OPCOES_CRITICIDADE = [
  { valor: "BAIXA", rotulo: "Baixa" },
  { valor: "MEDIA", rotulo: "Média" },
  { valor: "ALTA", rotulo: "Alta" },
  { valor: "ESTRATEGICA", rotulo: "Estratégica" },
];

const CORES_STATUS: Record<string, string> = {
  IDEIA: "#94A3B8",
  PLANEJADO: "#0891B2",
  EM_ANALISE: "#8B5CF6",
  APROVADO: "#2563EB",
  EM_EXECUCAO: "#059669",
  PAUSADO: "#D97706",
  CONCLUIDO: "#0F766E",
  CANCELADO: "#DC2626",
  ARQUIVADO: "#64748B",
};

interface CatalogoAssistente {
  icones: string[];
  cores: string[];
  categorias: string[];
  areas: string[];
  skills: Array<{ id: number; nome: string; icone: string; cor: string; tipo: string; criticidade: string; categoria: string }>;
  gerentes: Array<{ id: number; nome: string; cargo: string; cor: string; iniciais: string }>;
}

interface PreferenciaVisao {
  id: number;
  contexto: string;
  tipo_visualizacao: string;
  configuracao_json: Record<string, unknown>;
  updated_at: string;
}

function limparCampo(valor: string) {
  return valor.split(";").join(",").split(String.fromCharCode(10)).join(" ");
}

interface PropsCartaoProjeto {
  projeto: ProjetoResumo;
  aoAbrir: () => void;
  aoFiltrarPrograma: (nome: string) => void;
}

function CartaoProjeto({ projeto, aoAbrir, aoFiltrarPrograma }: PropsCartaoProjeto) {
  const Icone = ICONES_PROJETO[projeto.icone] || FolderKanban;
  const gerente = projeto.manager_detalhe;
  const dias = projeto.dias_restantes;
  const textoPrazo =
    dias === null || dias === undefined
      ? "Sem prazo definido"
      : projeto.atrasado
        ? numero(Math.abs(dias)) + " dia(s) de atraso"
        : numero(dias) + " dia(s) restantes";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={aoAbrir}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          aoAbrir();
        }
      }}
      aria-label={"Abrir projeto " + projeto.nome}
      className="group flex h-full cursor-pointer flex-col gap-3 rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-n2 animate-entrada"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-sgp"
          style={{ backgroundColor: projeto.cor + "1f", color: projeto.cor }}
          aria-hidden
        >
          <Icone className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-2xs font-semibold uppercase tracking-wide text-fg-subtle">{projeto.codigo}</p>
          <h3 className="truncate text-sm font-semibold text-fg" title={projeto.nome}>
            {projeto.nome}
          </h3>
        </div>
        <Semaforo saude={projeto.saude} comRotulo={false} tamanho="md" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Etiqueta cor={CORES_STATUS[projeto.status] || "#64748B"}>{projeto.status_rotulo || projeto.status}</Etiqueta>
        <Etiqueta tom={CORES_PRIORIDADE[projeto.prioridade] || "neutral"}>{projeto.prioridade_rotulo || projeto.prioridade}</Etiqueta>
        {projeto.atrasado && (
          <Etiqueta tom="danger" icone={AlertTriangle}>
            Atrasado
          </Etiqueta>
        )}
      </div>

      <BarraProgresso
        valor={projeto.percentual_conclusao}
        comparativo={projeto.progresso_planejado}
        altura="sm"
        rotulo="Executado × planejado"
        mostrarValor
      />

      {projeto.program_nome ? (
        <button
          type="button"
          onClick={(evento) => {
            evento.stopPropagation();
            aoFiltrarPrograma(projeto.program_nome);
          }}
          className="inline-flex w-fit items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-2xs font-medium text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <Layers className="size-3" aria-hidden />
          {projeto.program_nome}
        </button>
      ) : (
        <span className="inline-flex w-fit items-center gap-1 text-2xs text-fg-subtle">
          <Layers className="size-3" aria-hidden />
          Sem programa
        </span>
      )}

      <div className="mt-auto space-y-2 border-t border-border pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            {gerente ? (
              <>
                <Avatar nome={gerente.nome} cor={gerente.cor} iniciais={gerente.iniciais} url={gerente.avatar_display} tamanho="xs" />
                <span className="truncate text-2xs text-fg-muted" title={gerente.nome}>
                  {gerente.nome_curto || gerente.nome}
                </span>
              </>
            ) : (
              <span className="text-2xs text-fg-subtle">Sem gerente</span>
            )}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-2xs font-semibold tabular-nums text-fg">
            <Wallet className="size-3 text-fg-subtle" aria-hidden />
            {moeda(projeto.orcamento, true)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={
              "inline-flex items-center gap-1 text-2xs font-medium " +
              (projeto.atrasado ? "text-danger" : "text-fg-muted")
            }
          >
            {projeto.atrasado ? <AlertTriangle className="size-3" aria-hidden /> : <CalendarRange className="size-3" aria-hidden />}
            {textoPrazo}
          </span>
          <span className="inline-flex items-center gap-1 text-2xs text-fg-muted">
            <CheckCircle2 className="size-3" aria-hidden />
            {numero(projeto.total_tarefas)} tarefa(s)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Projetos() {
  const navegar = useNavigate();
  const { sucesso, erro: avisarErro } = useAvisos();
  const [params, setParams] = useSearchParams();

  const visao = (params.get("visao") as Visao) || "cards";
  const busca = params.get("q") || "";
  const status = params.get("status") || "";
  const saude = params.get("saude") || "";
  const prioridade = params.get("prioridade") || "";
  const criticidade = params.get("criticidade") || "";
  const area = params.get("area") || "";
  const programa = params.get("programa") || "";
  const gerente = params.get("gerente") || "";

  const [termo, setTermo] = useState(busca);
  const [compacta, setCompacta] = useState(false);

  const atualizar = useCallback(
    (chave: string, valor: string) => {
      const proximo = new URLSearchParams(params);
      if (valor) proximo.set(chave, valor);
      else proximo.delete(chave);
      setParams(proximo, { replace: true });
    },
    [params, setParams]
  );

  useEffect(() => {
    setTermo(busca);
  }, [busca]);

  useEffect(() => {
    if (termo === busca) return;
    const timer = setTimeout(() => {
      const proximo = new URLSearchParams(params);
      if (termo) proximo.set("q", termo);
      else proximo.delete("q");
      setParams(proximo, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [termo, busca, params, setParams]);

  const filtrosApi = useMemo(() => {
    const filtros: Record<string, unknown> = {};
    if (busca) filtros.search = busca;
    if (status) filtros.status = status;
    if (saude) filtros.saude = saude;
    if (prioridade) filtros.prioridade = prioridade;
    if (criticidade) filtros.criticidade = criticidade;
    if (area) filtros.area = area;
    if (programa) filtros.program = programa;
    if (gerente) filtros.manager = gerente;
    return filtros;
  }, [busca, status, saude, prioridade, criticidade, area, programa, gerente]);

  const { data, isLoading, isError, error } = useConsulta<{ total: number; projetos: ProjetoResumo[] }>(
    CHAVES.projetosCards,
    "/projetos/cards/",
    filtrosApi
  );

  const { data: catalogo } = useConsulta<CatalogoAssistente>(["projetos", "catalogo"], "/projetos/assistente/catalogo/");
  const { data: programas = [] } = useLista<{ id: number; nome: string }>(["programas", "opcoes"], "/programas/");
  const { data: preferencias = [] } = useLista<PreferenciaVisao>(["preferencias-visao"], "/preferencias-visao/");

  const timeline = useConsulta<{ hoje: string; projetos: ItemTimeline[] }>(
    CHAVES.projetosTimeline,
    visao === "timeline" ? "/projetos/timeline/" : null,
    filtrosApi
  );

  const salvarVisao = useMutacao<
    { contexto: string; tipo_visualizacao: string; configuracao_json: Record<string, unknown> },
    PreferenciaVisao
  >({
    url: "/preferencias-visao/definir/",
    invalidar: [["preferencias-visao"]],
  });

  const preferenciaAplicada = useRef(false);
  useEffect(() => {
    if (preferenciaAplicada.current) return;
    if (params.get("visao") || !preferencias.length) return;
    const preferencia = preferencias.find((item) => item.contexto === CONTEXTO_VISAO);
    preferenciaAplicada.current = true;
    const valor = String(preferencia?.tipo_visualizacao || "").toLowerCase();
    if (valor === "cards" || valor === "lista" || valor === "timeline") {
      const proximo = new URLSearchParams(params);
      proximo.set("visao", valor);
      setParams(proximo, { replace: true });
    }
  }, [preferencias, params, setParams]);

  const trocarVisao = (valor: Visao) => {
    atualizar("visao", valor);
    salvarVisao.mutate({
      contexto: CONTEXTO_VISAO,
      tipo_visualizacao: valor.toUpperCase(),
      configuracao_json: { filtros: filtrosApi },
    });
  };

  const projetos = data?.projetos ?? [];

  const kpis = useMemo(() => {
    const emExecucao = projetos.filter((item) => item.status === "EM_EXECUCAO").length;
    const atrasados = projetos.filter((item) => item.atrasado).length;
    const emRisco = projetos.filter((item) => item.saude === "AMARELO" || item.saude === "VERMELHO").length;
    const orcamento = soma(projetos.map((item) => Number(item.orcamento) || 0));
    const progresso = media(projetos.map((item) => item.percentual_conclusao));
    return [
      { rotulo: "Projetos", valor: numero(data?.total ?? projetos.length), icone: FolderKanban, cor: "#2563EB", subrotulo: "no filtro atual" },
      { rotulo: "Em execução", valor: numero(emExecucao), icone: Rocket, cor: "#0891B2", subrotulo: "em andamento" },
      { rotulo: "Atrasados", valor: numero(atrasados), icone: AlertTriangle, cor: "#DC2626", subrotulo: "prazo vencido" },
      { rotulo: "Em risco", valor: numero(emRisco), icone: Shield, cor: "#D97706", subrotulo: "saúde amarela ou vermelha" },
      { rotulo: "Orçamento", valor: moeda(orcamento, true), icone: Wallet, cor: "#059669", subrotulo: "soma do portfólio filtrado" },
      { rotulo: "Progresso médio", valor: percentual(progresso, 0), icone: TrendingUp, cor: "#8B5CF6", subrotulo: "conclusão média" },
    ];
  }, [projetos, data]);

  const filtrosAtivos = useMemo(() => {
    const lista: Array<{ chave: string; rotulo: string; valor: string; cor?: string; onRemover: () => void }> = [];
    if (busca) lista.push({ chave: "q", rotulo: "Busca", valor: busca, onRemover: () => atualizar("q", "") });
    if (status) lista.push({ chave: "status", rotulo: "Status", valor: status, cor: CORES_STATUS[status], onRemover: () => atualizar("status", "") });
    if (saude) lista.push({ chave: "saude", rotulo: "Saúde", valor: saude, onRemover: () => atualizar("saude", "") });
    if (prioridade) lista.push({ chave: "prioridade", rotulo: "Prioridade", valor: prioridade, onRemover: () => atualizar("prioridade", "") });
    if (criticidade) lista.push({ chave: "criticidade", rotulo: "Criticidade", valor: criticidade, onRemover: () => atualizar("criticidade", "") });
    if (area) lista.push({ chave: "area", rotulo: "Área", valor: area, onRemover: () => atualizar("area", "") });
    if (programa) {
      const nome = programas.find((item) => String(item.id) === programa)?.nome || programa;
      lista.push({ chave: "programa", rotulo: "Programa", valor: nome, onRemover: () => atualizar("programa", "") });
    }
    if (gerente) {
      const nome = catalogo?.gerentes.find((item) => String(item.id) === gerente)?.nome || gerente;
      lista.push({ chave: "gerente", rotulo: "Gerente", valor: nome, onRemover: () => atualizar("gerente", "") });
    }
    return lista;
  }, [busca, status, saude, prioridade, criticidade, area, programa, gerente, programas, catalogo, atualizar]);

  const limparFiltros = () => {
    const proximo = new URLSearchParams();
    const visaoAtual = params.get("visao");
    if (visaoAtual) proximo.set("visao", visaoAtual);
    setParams(proximo, { replace: true });
  };

  const exportar = () => {
    if (!projetos.length) {
      avisarErro("Nada para exportar", "Nenhum projeto corresponde aos filtros atuais.");
      return;
    }
    const cabecalho = ["Código", "Nome", "Status", "Saúde", "Prioridade", "Gerente", "Início", "Fim", "Progresso", "Orçamento"];
    const linhas = projetos.map((item) => [
      item.codigo,
      item.nome,
      item.status_rotulo || item.status,
      item.saude_rotulo || item.saude,
      item.prioridade_rotulo || item.prioridade,
      item.manager_detalhe?.nome || "",
      item.data_inicio || "",
      item.data_fim || "",
      String(item.percentual_conclusao),
      String(item.orcamento),
    ]);
    const csv = [cabecalho]
      .concat(linhas)
      .map((linha) => linha.map((celula) => limparCampo(String(celula))).join(";"))
      .join(String.fromCharCode(10));
    const blob = new Blob([String.fromCharCode(65279) + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "projetos.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    sucesso("Exportação gerada", numero(projetos.length) + " projeto(s) exportado(s) para CSV.");
  };

  const abrirProjeto = useCallback(
    (id: number) => {
      navegar("/projetos/" + id);
    },
    [navegar]
  );

  const colunas = useMemo<Array<ColunaTabela<ProjetoResumo>>>(
    () => [
      {
        chave: "codigo",
        titulo: "Código",
        largura: "120px",
        ordenavel: true,
        valorOrdenacao: (item) => item.codigo,
        renderizar: (item) => <span className="text-2xs font-semibold tabular-nums text-fg-muted">{item.codigo}</span>,
      },
      {
        chave: "nome",
        titulo: "Nome",
        ordenavel: true,
        valorOrdenacao: (item) => item.nome,
        renderizar: (item) => (
          <span className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.cor }} aria-hidden />
            <span className="truncate text-xs font-medium text-fg" title={item.descricao}>
              {item.nome}
            </span>
          </span>
        ),
      },
      {
        chave: "status",
        titulo: "Status",
        largura: "130px",
        ordenavel: true,
        valorOrdenacao: (item) => item.status,
        renderizar: (item) => <Etiqueta cor={CORES_STATUS[item.status] || "#64748B"}>{item.status_rotulo || item.status}</Etiqueta>,
      },
      {
        chave: "saude",
        titulo: "Saúde",
        largura: "130px",
        ordenavel: true,
        valorOrdenacao: (item) => item.saude,
        renderizar: (item) => <Semaforo saude={item.saude} tamanho="sm" />,
      },
      {
        chave: "prioridade",
        titulo: "Prioridade",
        largura: "110px",
        ordenavel: true,
        valorOrdenacao: (item) => item.prioridade,
        renderizar: (item) => <Etiqueta tom={CORES_PRIORIDADE[item.prioridade] || "neutral"}>{item.prioridade_rotulo || item.prioridade}</Etiqueta>,
      },
      {
        chave: "gerente",
        titulo: "Gerente",
        largura: "180px",
        ordenavel: true,
        valorOrdenacao: (item) => item.manager_detalhe?.nome || "",
        renderizar: (item) =>
          item.manager_detalhe ? (
            <span className="flex items-center gap-2">
              <Avatar
                nome={item.manager_detalhe.nome}
                cor={item.manager_detalhe.cor}
                iniciais={item.manager_detalhe.iniciais}
                url={item.manager_detalhe.avatar_display}
                tamanho="xs"
              />
              <span className="truncate text-xs text-fg-muted">{item.manager_detalhe.nome_curto || item.manager_detalhe.nome}</span>
            </span>
          ) : (
            <span className="text-2xs text-fg-subtle">—</span>
          ),
      },
      {
        chave: "prazo",
        titulo: "Prazo",
        largura: "150px",
        ordenavel: true,
        valorOrdenacao: (item) => item.data_fim || "",
        renderizar: (item) => (
          <span className="flex flex-col">
            <span className="text-xs tabular-nums text-fg-muted">{dataCurta(item.data_fim)}</span>
            <span className={"text-2xs " + (item.atrasado ? "font-semibold text-danger" : "text-fg-subtle")}>
              {item.atrasado
                ? numero(Math.abs(item.dias_restantes || 0)) + " dia(s) de atraso"
                : item.dias_restantes === null
                  ? "sem prazo"
                  : numero(item.dias_restantes) + " dia(s)"}
            </span>
          </span>
        ),
      },
      {
        chave: "progresso",
        titulo: "Progresso",
        largura: "160px",
        ordenavel: true,
        valorOrdenacao: (item) => item.percentual_conclusao,
        renderizar: (item) => (
          <BarraProgresso valor={item.percentual_conclusao} comparativo={item.progresso_planejado} altura="sm" mostrarValor />
        ),
      },
      {
        chave: "orcamento",
        titulo: "Orçamento",
        largura: "130px",
        alinhar: "right",
        ordenavel: true,
        valorOrdenacao: (item) => Number(item.orcamento) || 0,
        renderizar: (item) => <span className="text-xs font-semibold tabular-nums text-fg">{moeda(item.orcamento, true)}</span>,
      },
    ],
    []
  );

  const itensTimeline = useMemo<ItemTimeline[]>(
    () =>
      (timeline.data?.projetos ?? []).map((item) => ({
        ...item,
        onClick: () => abrirProjeto(item.id),
      })),
    [timeline.data, abrirProjeto]
  );

  const duracaoMedia = useMemo(() => {
    const duracoes = projetos
      .filter((item) => item.data_inicio && item.data_fim)
      .map((item) => diasEntre(item.data_inicio, item.data_fim));
    return duracoes.length ? Math.round(media(duracoes)) : 0;
  }, [projetos]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Projetos"
        subtitulo={
          numero(data?.total ?? projetos.length) +
          " projeto(s) · " +
          numero(kpis[1].valor as string) +
          " em execução · duração média de " +
          numero(duracaoMedia) +
          " dia(s)"
        }
        icone={FolderKanban}
        cor="#2563EB"
        acoes={
          <>
            <Botao variante="secundario" icone={Download} onClick={exportar}>
              Exportar
            </Botao>
            <Botao variante="primario" icone={Plus} onClick={() => navegar("/projetos/novo")}>
              Novo projeto
            </Botao>
          </>
        }
      />

      <LinhaKPI itens={kpis} />

      <BarraFerramentas>
        <EntradaBusca valor={termo} onChange={setTermo} placeholder="Buscar por nome, código, área..." className="w-full sm:w-72" />
        <FiltroSelect rotulo="Status" valor={status} onChange={(valor) => atualizar("status", valor)} opcoes={OPCOES_STATUS} />
        <FiltroSelect rotulo="Saúde" valor={saude} onChange={(valor) => atualizar("saude", valor)} opcoes={OPCOES_SAUDE} />
        <FiltroSelect rotulo="Prioridade" valor={prioridade} onChange={(valor) => atualizar("prioridade", valor)} opcoes={OPCOES_PRIORIDADE} />
        <FiltroSelect rotulo="Criticidade" valor={criticidade} onChange={(valor) => atualizar("criticidade", valor)} opcoes={OPCOES_CRITICIDADE} />
        <FiltroSelect
          rotulo="Área"
          valor={area}
          onChange={(valor) => atualizar("area", valor)}
          opcoes={(catalogo?.areas ?? []).map((item) => ({ valor: item, rotulo: item }))}
        />
        <FiltroSelect
          rotulo="Programa"
          valor={programa}
          onChange={(valor) => atualizar("programa", valor)}
          opcoes={programas.map((item) => ({ valor: String(item.id), rotulo: item.nome }))}
        />
        <FiltroSelect
          rotulo="Gerente"
          valor={gerente}
          onChange={(valor) => atualizar("gerente", valor)}
          opcoes={(catalogo?.gerentes ?? []).map((item) => ({ valor: String(item.id), rotulo: item.nome }))}
        />
        <div className="ml-auto flex items-center gap-2">
          <Interruptor ativo={compacta} onChange={setCompacta} rotulo="Compacta" tamanho="sm" />
          <Segmentado<Visao>
            valor={visao}
            onChange={trocarVisao}
            opcoes={[
              { valor: "cards", rotulo: "Cards", icone: LayoutGrid, titulo: "Visualização em cards" },
              { valor: "lista", rotulo: "Lista", icone: List, titulo: "Visualização em lista ordenável" },
              { valor: "timeline", rotulo: "Timeline", icone: CalendarRange, titulo: "Timeline macro do portfólio" },
            ]}
          />
        </div>
      </BarraFerramentas>

      <FiltrosAtivos filtros={filtrosAtivos} onLimpar={limparFiltros} />

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os projetos">
          {mensagemErro(error)}
        </Alerta>
      )}

      {isLoading && <CarregandoBloco rotulo="Carregando projetos..." />}

      {!isLoading && !isError && visao === "cards" && (
        projetos.length ? (
          <GradeCards colunas="auto">
            {projetos.map((projeto) => (
              <CartaoProjeto
                key={projeto.id}
                projeto={projeto}
                aoAbrir={() => abrirProjeto(projeto.id)}
                aoFiltrarPrograma={() => atualizar("programa", String(projeto.program || ""))}
              />
            ))}
          </GradeCards>
        ) : (
          <Vazio
            icone={FolderKanban}
            titulo="Nenhum projeto encontrado"
            descricao="Ajuste os filtros ou crie o primeiro projeto do portfólio."
            acao={
              <Botao variante="primario" icone={Plus} onClick={() => navegar("/projetos/novo")}>
                Novo projeto
              </Botao>
            }
          />
        )
      )}

      {!isLoading && !isError && visao === "lista" && (
        <div className="rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
          <Tabela<ProjetoResumo>
            colunas={colunas}
            dados={projetos}
            compacta={compacta}
            aoClicarLinha={(item) => abrirProjeto(item.id)}
            destaqueLinha={(item) => (item.atrasado ? "bg-danger-soft/25" : undefined)}
            vazio={
              <Vazio
                icone={FolderKanban}
                titulo="Nenhum projeto encontrado"
                descricao="Refine a busca ou remova alguns filtros."
              />
            }
          />
        </div>
      )}

      {!isLoading && !isError && visao === "timeline" && (
        <>
          {timeline.isLoading && <CarregandoBloco rotulo="Montando a timeline..." />}
          {timeline.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar a timeline">
              Tente novamente em instantes.
            </Alerta>
          )}
          {!timeline.isLoading && !timeline.isError && (
            <Timeline itens={itensTimeline} zoomInicial={1} mostrarMarcos agruparPor={(item) => item.programa} />
          )}
        </>
      )}
    </div>
  );
}

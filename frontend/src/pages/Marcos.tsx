import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Award, CalendarDays, CalendarRange, CheckCircle2, Flag, FolderKanban, List,
  Pencil, Plus, Save, Target, Timer, Trash2,
} from "lucide-react";
import {
  Alerta, Avatar, BarraFerramentas, Botao, BotaoIcone, CabecalhoPagina, Campo, CarregandoBloco,
  Entrada, EntradaBusca, Etiqueta, FiltrosAtivos, Interruptor, Modal, Segmentado, Semaforo, Tabela,
  Vazio, useAvisos, type ColunaTabela,
} from "@/components/ui";
import { FiltroSelect, LinhaKPI } from "@/components/layout";
import { Timeline, type ItemTimeline } from "@/components/timeline";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { MESES, dataCurta, hojeISO, mesCurto, numero, somarDias } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Marco, ProjetoResumo } from "@/lib/types";

/* ==========================================================================
   Marcos — lista, timeline e calendario horizontal agrupado por mes (RF-03)
   ========================================================================== */

type Visao = "lista" | "timeline" | "calendario";

const ROTULOS_STATUS: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
};

const TONS_STATUS: Record<string, "neutral" | "brand" | "success" | "danger" | "warning"> = {
  PENDENTE: "neutral",
  EM_ANDAMENTO: "brand",
  CONCLUIDO: "success",
  ATRASADO: "danger",
  CANCELADO: "warning",
};

const OPCOES_STATUS = Object.keys(ROTULOS_STATUS).map((chave) => ({ valor: chave, rotulo: ROTULOS_STATUS[chave] }));

const OPCOES_CRITICO = [
  { valor: "true", rotulo: "Somente críticos" },
  { valor: "false", rotulo: "Somente não críticos" },
];

interface Catalogo {
  gerentes: Array<{ id: number; nome: string; cargo: string; cor: string; iniciais: string }>;
}

interface FormularioMarco {
  project: string;
  nome: string;
  descricao: string;
  data_prevista: string;
  critico: boolean;
  responsavel: string;
  cor: string;
}

const FORMULARIO_VAZIO: FormularioMarco = {
  project: "",
  nome: "",
  descricao: "",
  data_prevista: hojeISO(),
  critico: false,
  responsavel: "",
  cor: "#F59E0B",
};

function chaveMes(iso: string) {
  return iso ? iso.slice(0, 7) : "";
}

function rotuloMes(chave: string) {
  if (!chave) return "Sem data";
  const partes = chave.split("-");
  const indice = Number(partes[1]) - 1;
  return (MESES[indice] || chave) + " / " + partes[0];
}

export default function Marcos() {
  const navegar = useNavigate();
  const { erro: avisarErro } = useAvisos();
  const { pode } = useAuth();
  const podeEditar = pode("projeto.editar");
  const podeExcluir = pode("projeto.excluir");
  const [visao, setVisao] = useState<Visao>("lista");
  const [termo, setTermo] = useState("");
  const [filtroProjeto, setFiltroProjeto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCritico, setFiltroCritico] = useState("");
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Marco | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Marco | null>(null);
  const [formulario, setFormulario] = useState<FormularioMarco>(FORMULARIO_VAZIO);

  const parametros = useMemo(() => {
    const filtros: Record<string, unknown> = {};
    if (filtroProjeto) filtros.project = filtroProjeto;
    if (filtroStatus) filtros.status = filtroStatus;
    if (filtroCritico) filtros.critico = filtroCritico;
    return filtros;
  }, [filtroProjeto, filtroStatus, filtroCritico]);

  const { data: marcos = [], isLoading, isError, error } = useLista<Marco>(["marcos"], "/marcos/", parametros);
  const cards = useConsulta<{ total: number; projetos: ProjetoResumo[] }>(CHAVES.projetosCards, "/projetos/cards/");
  const { data: catalogo } = useConsulta<Catalogo>(["projetos", "catalogo"], "/projetos/assistente/catalogo/");

  const projetos = cards.data?.projetos ?? [];

  const filtrados = useMemo(() => {
    const busca = termo.trim().toLowerCase();
    return marcos.filter((marco) => {
      if (periodoInicio && marco.data_prevista < periodoInicio) return false;
      if (periodoFim && marco.data_prevista > periodoFim) return false;
      if (busca) {
        const alvo = (marco.nome + " " + marco.descricao + " " + (marco.project_nome || "")).toLowerCase();
        if (!alvo.includes(busca)) return false;
      }
      return true;
    });
  }, [marcos, termo, periodoInicio, periodoFim]);

  const kpis = useMemo(() => {
    const hoje = hojeISO();
    const limite = somarDias(hoje, 30);
    const atrasados = filtrados.filter((marco) => marco.atrasado || marco.status === "ATRASADO").length;
    const concluidos = filtrados.filter((marco) => marco.status === "CONCLUIDO").length;
    const criticos = filtrados.filter((marco) => marco.critico).length;
    const proximos = filtrados.filter(
      (marco) => marco.status !== "CONCLUIDO" && marco.data_prevista >= hoje && marco.data_prevista <= limite
    ).length;
    return [
      { rotulo: "Marcos", valor: numero(filtrados.length), icone: Flag, cor: "#F59E0B", subrotulo: "no filtro atual" },
      { rotulo: "Atrasados", valor: numero(atrasados), icone: AlertTriangle, cor: "#DC2626", subrotulo: "exigem ação" },
      { rotulo: "Concluídos", valor: numero(concluidos), icone: CheckCircle2, cor: "#059669", subrotulo: "finalizados" },
      { rotulo: "Críticos", valor: numero(criticos), icone: Target, cor: "#8B5CF6", subrotulo: "impactam o caminho crítico" },
      { rotulo: "Próximos 30 dias", valor: numero(proximos), icone: Timer, cor: "#0891B2", subrotulo: "a vencer" },
      { rotulo: "Projetos", valor: numero(projetos.length), icone: FolderKanban, cor: "#2563EB", subrotulo: "com marcos cadastrados" },
    ];
  }, [filtrados, projetos]);

  const concluir = useMutacao<{ id: number; data_real: string }, Marco>({
    metodo: "patch",
    url: (valores) => "/marcos/" + valores.id + "/",
    invalidar: [["marcos"], CHAVES.projetosCards, CHAVES.projetosTimeline],
    mensagemSucesso: "Marco concluído",
  });

  const criar = useMutacao<Record<string, unknown>, Marco>({
    url: "/marcos/",
    invalidar: [["marcos"], CHAVES.projetosCards, CHAVES.projetosTimeline, CHAVES.cronograma(formulario.project)],
    mensagemSucesso: "Marco criado",
  });

  const editar = useMutacao<Record<string, unknown> & { id: number }, Marco>({
    metodo: "patch",
    url: (valores) => "/marcos/" + valores.id + "/",
    invalidar: [["marcos"], CHAVES.projetosCards, CHAVES.projetosTimeline, CHAVES.projeto(editando?.project)],
    mensagemSucesso: "Marco atualizado",
    aoSucesso: () => fecharFormulario(),
  });

  const excluir = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (valores) => "/marcos/" + valores.id + "/",
    invalidar: [["marcos"], CHAVES.projetosCards, CHAVES.projetosTimeline, CHAVES.projeto(paraExcluir?.project)],
    mensagemSucesso: "Marco excluído",
    aoSucesso: () => setParaExcluir(null),
  });

  const marcarConcluido = async (marco: Marco) => {
    try {
      await concluir.mutateAsync({ id: marco.id, data_real: hojeISO() });
    } catch (falha) {
      avisarErro("Não foi possível concluir o marco", mensagemErro(falha));
    }
  };

  const formularioDeMarco = (marco: Marco): FormularioMarco => ({
    project: String(marco.project),
    nome: marco.nome,
    descricao: marco.descricao || "",
    data_prevista: marco.data_prevista || hojeISO(),
    critico: marco.critico,
    responsavel: marco.responsavel ? String(marco.responsavel) : "",
    cor: marco.cor || "#F59E0B",
  });

  // O responsavel atual do marco entra na lista mesmo que nao esteja no catalogo,
  // para a edicao nao trocar o responsavel por engano.
  const opcoesResponsavel = useMemo(() => {
    const lista = (catalogo?.gerentes ?? []).map((item) => ({ id: item.id, nome: item.nome }));
    const atual = editando?.responsavel_detalhe;
    if (atual && !lista.some((item) => item.id === atual.id)) lista.push({ id: atual.id, nome: atual.nome });
    return lista;
  }, [catalogo, editando]);

  const abrirNovo = () => {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (marco: Marco) => {
    setEditando(marco);
    setFormulario(formularioDeMarco(marco));
    setModalAberto(true);
  };

  const fecharFormulario = () => {
    setModalAberto(false);
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
  };

  const salvar = async () => {
    if (!editando && !formulario.project) {
      avisarErro("Selecione o projeto", "Todo marco pertence a um projeto.");
      return;
    }
    if (!formulario.nome.trim()) {
      avisarErro("Informe o nome do marco", "O nome é obrigatório.");
      return;
    }
    if (!formulario.data_prevista) {
      avisarErro("Informe a data prevista", "A data prevista é obrigatória.");
      return;
    }
    const corpo = {
      nome: formulario.nome.trim(),
      descricao: formulario.descricao,
      data_prevista: formulario.data_prevista,
      critico: formulario.critico,
      cor: formulario.cor,
      responsavel: formulario.responsavel ? Number(formulario.responsavel) : null,
    };
    try {
      if (editando) await editar.mutateAsync({ ...corpo, id: editando.id });
      else await criar.mutateAsync({ ...corpo, project: Number(formulario.project) });
      fecharFormulario();
    } catch (falha) {
      avisarErro(editando ? "Não foi possível salvar o marco" : "Não foi possível criar o marco", mensagemErro(falha));
    }
  };

  const colunas = useMemo<Array<ColunaTabela<Marco>>>(
    () => [
      {
        chave: "nome",
        titulo: "Marco",
        ordenavel: true,
        valorOrdenacao: (item) => item.nome,
        renderizar: (item) => (
          <span className="flex items-center gap-2">
            <Flag
              className="size-3.5 shrink-0"
              style={{ color: item.cor || "#F59E0B" }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-fg">{item.nome}</span>
              <span className="block truncate text-2xs text-fg-subtle">{item.descricao || "Sem descrição"}</span>
            </span>
            {item.critico && <Etiqueta tom="brand">Crítico</Etiqueta>}
          </span>
        ),
      },
      {
        chave: "projeto",
        titulo: "Projeto",
        largura: "200px",
        ordenavel: true,
        valorOrdenacao: (item) => item.project_nome || "",
        renderizar: (item) => (
          <button
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              navegar("/projetos/" + item.project);
            }}
            className="truncate text-xs text-brand hover:underline"
          >
            {item.project_nome || "Projeto " + item.project}
          </button>
        ),
      },
      {
        chave: "data_prevista",
        titulo: "Previsto",
        largura: "130px",
        ordenavel: true,
        valorOrdenacao: (item) => item.data_prevista,
        renderizar: (item) => (
          <span className={"text-xs tabular-nums " + (item.atrasado ? "font-semibold text-danger" : "text-fg-muted")}>
            {dataCurta(item.data_prevista)}
          </span>
        ),
      },
      {
        chave: "data_real",
        titulo: "Realizado",
        largura: "130px",
        ordenavel: true,
        valorOrdenacao: (item) => item.data_real || "",
        renderizar: (item) => (
          <span className="text-xs tabular-nums text-fg-muted">{item.data_real ? dataCurta(item.data_real) : "—"}</span>
        ),
      },
      {
        chave: "status",
        titulo: "Status",
        largura: "140px",
        ordenavel: true,
        valorOrdenacao: (item) => item.status,
        renderizar: (item) => (
          <span className="flex items-center gap-1.5">
            <Etiqueta tom={TONS_STATUS[item.status] || "neutral"}>{ROTULOS_STATUS[item.status] || item.status}</Etiqueta>
            {item.atrasado && <AlertTriangle className="size-3.5 text-danger" aria-label="Marco atrasado" />}
          </span>
        ),
      },
      {
        chave: "responsavel",
        titulo: "Responsável",
        largura: "190px",
        ordenavel: true,
        valorOrdenacao: (item) => item.responsavel_detalhe?.nome || "",
        renderizar: (item) =>
          item.responsavel_detalhe ? (
            <span className="flex items-center gap-2">
              <Avatar
                nome={item.responsavel_detalhe.nome}
                cor={item.responsavel_detalhe.cor}
                iniciais={item.responsavel_detalhe.iniciais}
                url={item.responsavel_detalhe.avatar_display}
                tamanho="xs"
              />
              <span className="truncate text-xs text-fg-muted">{item.responsavel_detalhe.nome_curto}</span>
            </span>
          ) : (
            <span className="text-2xs text-fg-subtle">—</span>
          ),
      },
      {
        chave: "acoes",
        titulo: "Ações",
        largura: "210px",
        alinhar: "right",
        renderizar: (item) => (
          <span className="inline-flex items-center justify-end gap-1.5">
            {item.status === "CONCLUIDO" ? (
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-success">
                <CheckCircle2 className="size-3.5" aria-hidden />
                Concluído
              </span>
            ) : (
              podeEditar && (
                <Botao
                  tamanho="xs"
                  variante="sucesso"
                  icone={CheckCircle2}
                  carregando={concluir.isPending}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    marcarConcluido(item);
                  }}
                >
                  Concluir
                </Botao>
              )
            )}
            {podeEditar && (
              <BotaoIcone
                icone={Pencil}
                rotulo={"Editar marco " + item.nome}
                tamanho="xs"
                onClick={(evento) => {
                  evento.stopPropagation();
                  abrirEdicao(item);
                }}
              />
            )}
            {podeExcluir && (
              <BotaoIcone
                icone={Trash2}
                rotulo={"Excluir marco " + item.nome}
                variante="perigo"
                tamanho="xs"
                onClick={(evento) => {
                  evento.stopPropagation();
                  setParaExcluir(item);
                }}
              />
            )}
          </span>
        ),
      },
    ],
    [concluir.isPending, navegar, podeEditar, podeExcluir]
  );

  const itensTimeline = useMemo<ItemTimeline[]>(
    () =>
      filtrados.map((marco) => ({
        id: marco.id,
        codigo: marco.project_nome || "Projeto " + marco.project,
        nome: marco.nome,
        cor: marco.cor || (marco.critico ? "#DC2626" : "#F59E0B"),
        inicio: somarDias(marco.data_prevista, -2),
        fim: somarDias(marco.data_prevista, 2),
        saude: marco.status === "CONCLUIDO" ? "VERDE" : marco.atrasado ? "VERMELHO" : marco.critico ? "AMARELO" : "CINZA",
        status_rotulo: ROTULOS_STATUS[marco.status] || marco.status,
        percentual: marco.status === "CONCLUIDO" ? 100 : 0,
        progresso_planejado: marco.data_prevista < hojeISO() ? 100 : 0,
        gerente: marco.responsavel_detalhe?.nome || "",
        programa: marco.project_nome || "Projeto " + marco.project,
        atrasado: Boolean(marco.atrasado),
        orcamento: 0,
        tarefas: 0,
        marcos: [],
        onClick: () => navegar("/projetos/" + marco.project),
      })),
    [filtrados, navegar]
  );

  const meses = useMemo(() => {
    const mapa: Record<string, Marco[]> = {};
    filtrados.forEach((marco) => {
      const chave = chaveMes(marco.data_prevista);
      (mapa[chave] ||= []).push(marco);
    });
    return Object.keys(mapa)
      .sort()
      .map((chave) => ({
        chave,
        rotulo: rotuloMes(chave),
        itens: (mapa[chave] || []).slice().sort((a, b) => a.data_prevista.localeCompare(b.data_prevista)),
      }));
  }, [filtrados]);

  const filtrosAtivos = useMemo(() => {
    const lista: Array<{ chave: string; rotulo: string; valor: string; cor?: string; onRemover: () => void }> = [];
    if (termo) lista.push({ chave: "q", rotulo: "Busca", valor: termo, onRemover: () => setTermo("") });
    if (filtroProjeto) {
      const nome = projetos.find((item) => String(item.id) === filtroProjeto)?.nome || filtroProjeto;
      lista.push({ chave: "projeto", rotulo: "Projeto", valor: nome, onRemover: () => setFiltroProjeto("") });
    }
    if (filtroStatus) lista.push({ chave: "status", rotulo: "Status", valor: ROTULOS_STATUS[filtroStatus] || filtroStatus, onRemover: () => setFiltroStatus("") });
    if (filtroCritico) lista.push({ chave: "critico", rotulo: "Criticidade", valor: filtroCritico === "true" ? "Crítico" : "Não crítico", onRemover: () => setFiltroCritico("") });
    if (periodoInicio) lista.push({ chave: "inicio", rotulo: "A partir de", valor: dataCurta(periodoInicio), onRemover: () => setPeriodoInicio("") });
    if (periodoFim) lista.push({ chave: "fim", rotulo: "Até", valor: dataCurta(periodoFim), onRemover: () => setPeriodoFim("") });
    return lista;
  }, [termo, filtroProjeto, filtroStatus, filtroCritico, periodoInicio, periodoFim, projetos]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Marcos"
        subtitulo={numero(filtrados.length) + " marco(s) · " + numero(filtrados.filter((item) => item.critico).length) + " crítico(s)"}
        icone={Flag}
        cor="#F59E0B"
        acoes={
          <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
            Novo marco
          </Botao>
        }
      />

      <LinhaKPI itens={kpis} />

      <BarraFerramentas>
        <EntradaBusca valor={termo} onChange={setTermo} placeholder="Buscar marco ou projeto..." className="w-full sm:w-64" />
        <FiltroSelect
          rotulo="Projeto"
          valor={filtroProjeto}
          onChange={setFiltroProjeto}
          opcoes={projetos.map((item) => ({ valor: String(item.id), rotulo: item.nome }))}
        />
        <FiltroSelect rotulo="Status" valor={filtroStatus} onChange={setFiltroStatus} opcoes={OPCOES_STATUS} />
        <FiltroSelect rotulo="Criticidade" valor={filtroCritico} onChange={setFiltroCritico} opcoes={OPCOES_CRITICO} />
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">De</span>
          <input
            type="date"
            value={periodoInicio}
            onChange={(evento) => setPeriodoInicio(evento.target.value)}
            aria-label="Período inicial"
            className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
          />
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Até</span>
          <input
            type="date"
            value={periodoFim}
            onChange={(evento) => setPeriodoFim(evento.target.value)}
            aria-label="Período final"
            className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
          />
        </label>
        <div className="ml-auto">
          <Segmentado<Visao>
            valor={visao}
            onChange={setVisao}
            opcoes={[
              { valor: "lista", rotulo: "Lista", icone: List, titulo: "Lista ordenável de marcos" },
              { valor: "timeline", rotulo: "Timeline", icone: CalendarRange, titulo: "Linha do tempo por projeto" },
              { valor: "calendario", rotulo: "Calendário", icone: CalendarDays, titulo: "Calendário horizontal por mês" },
            ]}
          />
        </div>
      </BarraFerramentas>

      <FiltrosAtivos
        filtros={filtrosAtivos}
        onLimpar={() => {
          setTermo("");
          setFiltroProjeto("");
          setFiltroStatus("");
          setFiltroCritico("");
          setPeriodoInicio("");
          setPeriodoFim("");
        }}
      />

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os marcos">
          {mensagemErro(error)}
        </Alerta>
      )}

      {isLoading && <CarregandoBloco rotulo="Carregando marcos..." />}

      {!isLoading && !isError && visao === "lista" && (
        <div className="rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
          <Tabela<Marco>
            colunas={colunas}
            dados={filtrados}
            aoClicarLinha={(item) => navegar("/projetos/" + item.project)}
            destaqueLinha={(item) => (item.atrasado ? "bg-danger-soft/25" : undefined)}
            vazio={
              <Vazio
                icone={Flag}
                titulo="Nenhum marco encontrado"
                descricao="Crie marcos para acompanhar as entregas-chave dos projetos."
                acao={
                  <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
                    Novo marco
                  </Botao>
                }
              />
            }
          />
        </div>
      )}

      {!isLoading && !isError && visao === "timeline" && (
        <Timeline itens={itensTimeline} zoomInicial={1} mostrarMarcos={false} agruparPor={(item) => item.programa} />
      )}

      {!isLoading && !isError && visao === "calendario" && (
        meses.length === 0 ? (
          <Vazio icone={CalendarDays} titulo="Nenhum marco no período" descricao="Ajuste os filtros de período para visualizar os marcos." />
        ) : (
          <div className="overflow-x-auto rounded-sgp-lg border border-border bg-surface p-3 shadow-n1 scroll-thin">
            <div className="flex min-w-full gap-3">
              {meses.map((mes) => (
                <div key={mes.chave} className="flex w-56 shrink-0 flex-col gap-2">
                  <div className="rounded-sgp border border-border bg-surface-2 px-2.5 py-1.5">
                    <p className="text-xs font-semibold text-fg">{mes.rotulo}</p>
                    <p className="text-2xs text-fg-muted">{numero(mes.itens.length)} marco(s)</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {mes.itens.map((marco) => (
                      <button
                        key={marco.id}
                        type="button"
                        onClick={() => navegar("/projetos/" + marco.project)}
                        title={marco.nome + " · " + dataCurta(marco.data_prevista)}
                        className={
                          "flex flex-col gap-1 rounded-sgp border px-2 py-1.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-n2 " +
                          (marco.atrasado ? "border-danger/50 bg-danger-soft/25" : "border-border bg-surface-2")
                        }
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-2xs font-bold tabular-nums text-fg-subtle">
                            {marco.data_prevista ? marco.data_prevista.slice(8, 10) : "--"}
                          </span>
                          <Flag className="size-3 shrink-0" style={{ color: marco.cor || "#F59E0B" }} aria-hidden />
                          {marco.critico && <Etiqueta tom="brand">Crítico</Etiqueta>}
                          {marco.status === "CONCLUIDO" && <CheckCircle2 className="size-3 text-success" aria-hidden />}
                          {marco.atrasado && <AlertTriangle className="size-3 text-danger" aria-hidden />}
                        </span>
                        <span className="line-clamp-2 text-2xs font-medium text-fg">{marco.nome}</span>
                        <span className="flex items-center gap-1 truncate text-2xs text-fg-subtle">
                          <Semaforo
                            saude={marco.status === "CONCLUIDO" ? "VERDE" : marco.atrasado ? "VERMELHO" : "CINZA"}
                            comRotulo={false}
                            tamanho="sm"
                          />
                          {marco.project_nome || "Projeto " + marco.project}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {!isLoading && !isError && filtrados.length > 0 && filtrados.some((item) => item.atrasado) && (
        <Alerta tom="warning" titulo="Marcos atrasados exigem ação" icone={AlertTriangle}>
          {numero(filtrados.filter((item) => item.atrasado).length)} marco(s) com data prevista vencida. Marque como concluído
          ou reprograme o cronograma do projeto.
        </Alerta>
      )}

      <Modal
        aberto={modalAberto}
        onFechar={fecharFormulario}
        titulo={editando ? "Editar marco" : "Novo marco"}
        subtitulo={
          editando
            ? (editando.project_nome || "Projeto " + editando.project) + " · previsto para " + dataCurta(editando.data_prevista)
            : "Marcos destacam entregas-chave no Gantt, no calendário e na timeline."
        }
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={fecharFormulario}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={editando ? Save : Award}
              onClick={salvar}
              carregando={editando ? editar.isPending : criar.isPending}
            >
              {editando ? "Salvar marco" : "Criar marco"}
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <Campo
            rotulo="Projeto"
            obrigatorio={!editando}
            dica={editando ? "O projeto do marco não muda nesta edição." : undefined}
            htmlFor="marco-projeto"
          >
            <select
              id="marco-projeto"
              value={formulario.project}
              onChange={(evento) => setFormulario({ ...formulario, project: evento.target.value })}
              disabled={editando !== null}
              className="w-full rounded-sgp border border-border-strong bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60"
            >
              <option value="">Selecione o projeto</option>
              {projetos.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.codigo} · {item.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Nome do marco" obrigatorio htmlFor="marco-nome">
            <Entrada
              id="marco-nome"
              value={formulario.nome}
              onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })}
              placeholder="Ex.: Go-live do módulo financeiro"
            />
          </Campo>

          <Campo rotulo="Descrição" htmlFor="marco-descricao">
            <Entrada
              id="marco-descricao"
              value={formulario.descricao}
              onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })}
              placeholder="Critério de aceite ou evidência esperada"
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Data prevista" obrigatorio htmlFor="marco-data">
              <Entrada
                id="marco-data"
                type="date"
                value={formulario.data_prevista}
                onChange={(evento) => setFormulario({ ...formulario, data_prevista: evento.target.value })}
              />
            </Campo>
            <Campo rotulo="Responsável" htmlFor="marco-responsavel">
              <select
                id="marco-responsavel"
                value={formulario.responsavel}
                onChange={(evento) => setFormulario({ ...formulario, responsavel: evento.target.value })}
                className="w-full rounded-sgp border border-border-strong bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand"
              >
                <option value="">Sem responsável</option>
                {opcoesResponsavel.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Interruptor
              ativo={formulario.critico}
              onChange={(valor) => setFormulario({ ...formulario, critico: valor })}
              rotulo="Marco crítico"
              descricao="Impacta o caminho crítico do projeto."
            />
            <div className="flex items-center gap-2">
              <span className="text-2xs font-medium text-fg-muted">Cor</span>
              {["#F59E0B", "#DC2626", "#2563EB", "#059669", "#8B5CF6"].map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={"Cor " + cor}
                  onClick={() => setFormulario({ ...formulario, cor })}
                  className={
                    "size-6 rounded-full border-2 transition-transform " +
                    (formulario.cor === cor ? "border-fg scale-110" : "border-transparent hover:scale-105")
                  }
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={paraExcluir !== null}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir marco"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setParaExcluir(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={() => paraExcluir && excluir.mutate({ id: paraExcluir.id })}
            >
              Excluir marco
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-fg">
            Confirma a exclusão do marco <strong>{paraExcluir?.nome}</strong>?
          </p>
          {paraExcluir && (
            <p className="text-2xs text-fg-muted">
              {paraExcluir.project_nome || "Projeto " + paraExcluir.project} · previsto para{" "}
              {dataCurta(paraExcluir.data_prevista)} · {ROTULOS_STATUS[paraExcluir.status] || paraExcluir.status}
            </p>
          )}
        </div>
      </Modal>

      <p className="text-2xs text-fg-subtle">
        Última referência de mês: {mesCurto(hojeISO())} · marcos concluídos registram a data real de entrega.
      </p>
    </div>
  );
}

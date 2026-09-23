import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Building2, Cloud, Cpu, Database, FolderKanban, Globe, GraduationCap,
  HeartPulse, Layers, LineChart, Pencil, Plus, Rocket, Shield, Smartphone, Target, Trash2, Truck,
  Wallet, type LucideIcon,
} from "lucide-react";
import {
  Alerta, AreaTexto, Avatar, BarraFerramentas, BarraProgresso, Botao, CabecalhoPagina,
  Campo, CarregandoBloco, Entrada, EntradaBusca, Etiqueta, Modal,
  PainelLateral, PilhaAvatares, Selecao, Semaforo, Vazio, useAvisos,
} from "@/components/ui";
import { FiltroSelect, GradeCards, LinhaKPI } from "@/components/layout";
import { GraficoBarras } from "@/components/charts";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, intervalo, moeda, numero, percentual } from "@/lib/format";
import { media, soma } from "@/lib/utils";
import type { ProjetoResumo, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Programas — cards com orcamento agregado, progresso medio e drill-down (RF-32)
   ========================================================================== */

const ICONES: Record<string, LucideIcon> = {
  layers: Layers,
  briefcase: Wallet,
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
  "folder-kanban": FolderKanban,
};

const ROTULOS_STATUS: Record<string, string> = {
  PLANEJADO: "Planejado",
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const TONS_STATUS: Record<string, "brand" | "success" | "warning" | "neutral" | "danger"> = {
  PLANEJADO: "brand",
  ATIVO: "success",
  PAUSADO: "warning",
  CONCLUIDO: "neutral",
  CANCELADO: "danger",
};

const OPCOES_STATUS = Object.keys(ROTULOS_STATUS).map((chave) => ({ valor: chave, rotulo: ROTULOS_STATUS[chave] }));

interface Programa {
  id: number;
  portfolio: number | null;
  nome: string;
  descricao: string;
  gerente: number | null;
  gerente_detalhe: UsuarioResumo | null;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  cor: string;
  icone: string;
  portfolio_nome: string;
  total_projetos: number;
  criado_em: string;
  atualizado_em: string;
}

interface Portfolio {
  id: number;
  nome: string;
  cor: string;
}

interface Catalogo {
  gerentes: Array<{ id: number; nome: string; cargo: string; cor: string; iniciais: string }>;
}

interface FormularioPrograma {
  nome: string;
  descricao: string;
  portfolio: string;
  gerente: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  cor: string;
  icone: string;
}

const FORMULARIO_VAZIO: FormularioPrograma = {
  nome: "",
  descricao: "",
  portfolio: "",
  gerente: "",
  status: "PLANEJADO",
  data_inicio: "",
  data_fim: "",
  cor: "#8B5CF6",
  icone: "layers",
};

const PALETA = ["#8B5CF6", "#2563EB", "#0891B2", "#059669", "#D97706", "#DC2626", "#EC4899", "#64748B"];
const ICONES_DISPONIVEIS = ["layers", "rocket", "target", "shield", "cloud", "database", "globe", "cpu", "building", "truck"];

export default function Programas() {
  const navegar = useNavigate();
  const { erro: avisarErro } = useAvisos();
  const [params, setParams] = useSearchParams();
  const programaAberto = params.get("programa") || "";
  const [termo, setTermo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroPortfolio, setFiltroPortfolio] = useState("");
  const [painelAberto, setPainelAberto] = useState(false);
  const [editando, setEditando] = useState<Programa | null>(null);
  const [formulario, setFormulario] = useState<FormularioPrograma>(FORMULARIO_VAZIO);
  const [confirmacao, setConfirmacao] = useState<Programa | null>(null);

  const { data: programas = [], isLoading, isError, error } = useLista<Programa>(["programas"], "/programas/");
  const { data: portfolios = [] } = useLista<Portfolio>(["portfolios"], "/portfolios/");
  const { data: catalogo } = useConsulta<Catalogo>(["projetos", "catalogo"], "/projetos/assistente/catalogo/");
  const cards = useConsulta<{ total: number; projetos: ProjetoResumo[] }>(CHAVES.projetosCards, "/projetos/cards/");

  const projetos = cards.data?.projetos ?? [];

  const porPrograma = useMemo(() => {
    const mapa: Record<string, ProjetoResumo[]> = {};
    projetos.forEach((projeto) => {
      const chave = String(projeto.program || "");
      (mapa[chave] ||= []).push(projeto);
    });
    return mapa;
  }, [projetos]);

  const resumoPrograma = (programa: Programa) => {
    const lista = porPrograma[String(programa.id)] || [];
    const orcamento = soma(lista.map((item) => Number(item.orcamento) || 0));
    const progresso = media(lista.map((item) => item.percentual_conclusao));
    const atrasados = lista.filter((item) => item.atrasado).length;
    const emRisco = lista.filter((item) => item.saude === "AMARELO" || item.saude === "VERMELHO").length;
    return { lista, orcamento, progresso, atrasados, emRisco };
  };

  const filtrados = useMemo(() => {
    const busca = termo.trim().toLowerCase();
    return programas.filter((programa) => {
      if (filtroStatus && programa.status !== filtroStatus) return false;
      if (filtroPortfolio && String(programa.portfolio || "") !== filtroPortfolio) return false;
      if (busca && !(programa.nome + " " + programa.descricao).toLowerCase().includes(busca)) return false;
      return true;
    });
  }, [programas, termo, filtroStatus, filtroPortfolio]);

  const kpis = useMemo(() => {
    const ativos = programas.filter((item) => item.status === "ATIVO").length;
    const semGerente = programas.filter((item) => !item.gerente).length;
    const orcamento = soma(projetos.map((item) => Number(item.orcamento) || 0));
    const progresso = media(projetos.map((item) => item.percentual_conclusao));
    return [
      { rotulo: "Programas", valor: numero(programas.length), icone: Layers, cor: "#8B5CF6", subrotulo: "cadastrados" },
      { rotulo: "Ativos", valor: numero(ativos), icone: Rocket, cor: "#059669", subrotulo: "em andamento" },
      { rotulo: "Projetos", valor: numero(projetos.length), icone: FolderKanban, cor: "#2563EB", subrotulo: "no portfólio" },
      { rotulo: "Orçamento", valor: moeda(orcamento, true), icone: Wallet, cor: "#0891B2", subrotulo: "agregado dos projetos" },
      { rotulo: "Progresso médio", valor: percentual(progresso, 0), icone: Target, cor: "#D97706", subrotulo: "conclusão média" },
      { rotulo: "Sem gerente", valor: numero(semGerente), icone: AlertTriangle, cor: "#DC2626", subrotulo: "precisam de responsável" },
    ];
  }, [programas, projetos]);

  const abrirNovo = () => {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setPainelAberto(true);
  };

  const abrirEdicao = (programa: Programa) => {
    setEditando(programa);
    setFormulario({
      nome: programa.nome,
      descricao: programa.descricao,
      portfolio: programa.portfolio ? String(programa.portfolio) : "",
      gerente: programa.gerente ? String(programa.gerente) : "",
      status: programa.status,
      data_inicio: programa.data_inicio || "",
      data_fim: programa.data_fim || "",
      cor: programa.cor || "#8B5CF6",
      icone: programa.icone || "layers",
    });
    setPainelAberto(true);
  };

  const invalidar = [["programas"], CHAVES.projetosCards, ["portfolios"]];

  const criar = useMutacao<Record<string, unknown>, Programa>({
    url: "/programas/",
    invalidar,
    mensagemSucesso: "Programa criado",
  });

  const atualizar = useMutacao<Record<string, unknown> & { id: number }, Programa>({
    metodo: "patch",
    url: (valores) => "/programas/" + valores.id + "/",
    invalidar,
    mensagemSucesso: "Programa atualizado",
  });

  const excluir = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (valores) => "/programas/" + valores.id + "/",
    invalidar,
    mensagemSucesso: "Programa excluído",
  });

  const salvar = async () => {
    if (!formulario.nome.trim()) {
      avisarErro("Informe o nome do programa", "O nome é obrigatório para salvar.");
      return;
    }
    if (formulario.data_inicio && formulario.data_fim && formulario.data_fim < formulario.data_inicio) {
      avisarErro("Datas inconsistentes", "A data final não pode ser anterior à inicial.");
      return;
    }
    const payload: Record<string, unknown> = {
      nome: formulario.nome.trim(),
      descricao: formulario.descricao,
      status: formulario.status,
      cor: formulario.cor,
      icone: formulario.icone,
      portfolio: formulario.portfolio ? Number(formulario.portfolio) : null,
      gerente: formulario.gerente ? Number(formulario.gerente) : null,
      data_inicio: formulario.data_inicio || null,
      data_fim: formulario.data_fim || null,
    };
    try {
      if (editando) await atualizar.mutateAsync({ ...payload, id: editando.id });
      else await criar.mutateAsync(payload);
      setPainelAberto(false);
    } catch (falha) {
      avisarErro("Não foi possível salvar", mensagemErro(falha));
    }
  };

  const confirmarExclusao = async () => {
    if (!confirmacao) return;
    try {
      await excluir.mutateAsync({ id: confirmacao.id });
      setConfirmacao(null);
      if (programaAberto === String(confirmacao.id)) {
        const proximo = new URLSearchParams(params);
        proximo.delete("programa");
        setParams(proximo, { replace: true });
      }
    } catch (falha) {
      avisarErro("Não foi possível excluir", mensagemErro(falha));
    }
  };

  const selecionar = (programa: Programa) => {
    const proximo = new URLSearchParams(params);
    if (programaAberto === String(programa.id)) proximo.delete("programa");
    else proximo.set("programa", String(programa.id));
    setParams(proximo, { replace: true });
  };

  const programaSelecionado = programas.find((item) => String(item.id) === programaAberto) || null;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Programas"
        subtitulo={numero(programas.length) + " programa(s) · " + numero(projetos.length) + " projeto(s) vinculados"}
        icone={Layers}
        cor="#8B5CF6"
        acoes={
          <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
            Novo programa
          </Botao>
        }
      />

      <LinhaKPI itens={kpis} />

      <BarraFerramentas>
        <EntradaBusca valor={termo} onChange={setTermo} placeholder="Buscar programa..." className="w-full sm:w-72" />
        <FiltroSelect rotulo="Status" valor={filtroStatus} onChange={setFiltroStatus} opcoes={OPCOES_STATUS} />
        <FiltroSelect
          rotulo="Portfólio"
          valor={filtroPortfolio}
          onChange={setFiltroPortfolio}
          opcoes={portfolios.map((item) => ({ valor: String(item.id), rotulo: item.nome }))}
        />
        {(termo || filtroStatus || filtroPortfolio) && (
          <Botao
            variante="fantasma"
            tamanho="sm"
            onClick={() => {
              setTermo("");
              setFiltroStatus("");
              setFiltroPortfolio("");
            }}
          >
            Limpar filtros
          </Botao>
        )}
        <span className="ml-auto text-2xs text-fg-muted">
          Clique em um programa para ver os projetos vinculados (drill-down).
        </span>
      </BarraFerramentas>

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os programas">
          {mensagemErro(error)}
        </Alerta>
      )}

      {isLoading && <CarregandoBloco rotulo="Carregando programas..." />}

      {!isLoading && !isError && !filtrados.length && (
        <Vazio
          icone={Layers}
          titulo="Nenhum programa encontrado"
          descricao="Crie um programa para agrupar projetos relacionados e acompanhar o orçamento agregado."
          acao={
            <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
              Novo programa
            </Botao>
          }
        />
      )}

      {!isLoading && !isError && filtrados.length > 0 && (
        <GradeCards colunas="auto">
          {filtrados.map((programa) => {
            const { lista, orcamento, progresso, atrasados, emRisco } = resumoPrograma(programa);
            const Icone = ICONES[programa.icone] || Layers;
            const selecionado = programaAberto === String(programa.id);
            const pessoas = lista
              .filter((item) => item.manager_detalhe)
              .map((item) => ({
                id: item.manager_detalhe!.id,
                nome: item.manager_detalhe!.nome,
                cor: item.manager_detalhe!.cor,
                iniciais: item.manager_detalhe!.iniciais,
                avatar_display: item.manager_detalhe!.avatar_display,
              }));
            return (
              <div
                key={programa.id}
                role="button"
                tabIndex={0}
                onClick={() => selecionar(programa)}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") selecionar(programa);
                }}
                aria-label={"Programa " + programa.nome}
                className={
                  "flex h-full cursor-pointer flex-col gap-3 rounded-sgp-lg border bg-surface p-3.5 shadow-n1 transition-all hover:-translate-y-0.5 hover:shadow-n2 animate-entrada " +
                  (selecionado ? "border-brand ring-2 ring-brand/40" : "border-border hover:border-border-strong")
                }
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-sgp"
                    style={{ backgroundColor: programa.cor + "1f", color: programa.cor }}
                    aria-hidden
                  >
                    <Icone className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-fg" title={programa.nome}>
                      {programa.nome}
                    </h3>
                    <p className="truncate text-2xs text-fg-muted" title={programa.descricao}>
                      {programa.portfolio_nome || "Sem portfólio"}
                    </p>
                  </div>
                  <Etiqueta tom={TONS_STATUS[programa.status] || "neutral"}>{ROTULOS_STATUS[programa.status] || programa.status}</Etiqueta>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <FolderKanban className="size-3" aria-hidden />
                    {numero(lista.length)} projeto(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="size-3" aria-hidden />
                    {moeda(orcamento, true)}
                  </span>
                  {atrasados > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-danger">
                      <AlertTriangle className="size-3" aria-hidden />
                      {numero(atrasados)} atrasado(s)
                    </span>
                  )}
                  {emRisco > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-warning">
                      <Shield className="size-3" aria-hidden />
                      {numero(emRisco)} em risco
                    </span>
                  )}
                </div>

                <BarraProgresso valor={progresso} altura="sm" rotulo="Progresso médio dos projetos" mostrarValor />

                {lista.length > 0 ? (
                  <div className="rounded-sgp border border-border bg-surface-2 p-2">
                    <GraficoBarras
                      itens={lista.slice(0, 6).map((item) => ({
                        rotulo: item.codigo,
                        valor: item.percentual_conclusao,
                        cor: item.cor,
                        comparativo: item.progresso_planejado,
                      }))}
                      altura={92}
                      mostrarEixo={false}
                      formatarValor={(valor) => percentual(valor, 0)}
                    />
                  </div>
                ) : (
                  <p className="rounded-sgp border border-dashed border-border px-2 py-3 text-center text-2xs text-fg-subtle">
                    Nenhum projeto vinculado a este programa.
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {programa.gerente_detalhe ? (
                      <>
                        <Avatar
                          nome={programa.gerente_detalhe.nome}
                          cor={programa.gerente_detalhe.cor}
                          iniciais={programa.gerente_detalhe.iniciais}
                          url={programa.gerente_detalhe.avatar_display}
                          tamanho="xs"
                        />
                        <span className="truncate text-2xs text-fg-muted">{programa.gerente_detalhe.nome_curto}</span>
                      </>
                    ) : (
                      <span className="text-2xs text-fg-subtle">Sem gerente designado</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {pessoas.length > 0 && <PilhaAvatares pessoas={pessoas} maximo={3} tamanho="xs" />}
                    <span className="text-2xs tabular-nums text-fg-subtle">{intervalo(programa.data_inicio, programa.data_fim)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Botao
                    tamanho="xs"
                    variante="secundario"
                    icone={FolderKanban}
                    onClick={(evento) => {
                      evento.stopPropagation();
                      selecionar(programa);
                    }}
                  >
                    Ver projetos
                  </Botao>
                  <Botao
                    tamanho="xs"
                    variante="fantasma"
                    icone={Pencil}
                    onClick={(evento) => {
                      evento.stopPropagation();
                      abrirEdicao(programa);
                    }}
                  >
                    Editar
                  </Botao>
                  <Botao
                    tamanho="xs"
                    variante="fantasma"
                    icone={Trash2}
                    className="ml-auto text-danger"
                    onClick={(evento) => {
                      evento.stopPropagation();
                      setConfirmacao(programa);
                    }}
                  >
                    Excluir
                  </Botao>
                </div>
              </div>
            );
          })}
        </GradeCards>
      )}

      {programaSelecionado && (
        <section className="space-y-3 rounded-sgp-lg border border-border bg-surface-2 p-3.5 animate-entrada">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-brand" aria-hidden />
              <h2 className="text-sm font-semibold text-fg">
                Projetos de {programaSelecionado.nome}
                <span className="ml-2 text-2xs font-normal text-fg-muted">
                  {numero((porPrograma[String(programaSelecionado.id)] || []).length)} projeto(s)
                </span>
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Botao
                tamanho="sm"
                variante="secundario"
                icone={ArrowRight}
                onClick={() => navegar("/projetos?programa=" + programaSelecionado.id)}
              >
                Abrir na lista de projetos
              </Botao>
              <Botao
                tamanho="sm"
                variante="fantasma"
                onClick={() => {
                  const proximo = new URLSearchParams(params);
                  proximo.delete("programa");
                  setParams(proximo, { replace: true });
                }}
              >
                Fechar
              </Botao>
            </div>
          </div>

          {(porPrograma[String(programaSelecionado.id)] || []).length === 0 ? (
            <p className="rounded-sgp border border-dashed border-border bg-surface px-3 py-6 text-center text-xs text-fg-muted">
              Nenhum projeto vinculado. Edite o programa ou associe projetos a ele.
            </p>
          ) : (
            <GradeCards colunas={4}>
              {(porPrograma[String(programaSelecionado.id)] || []).map((projeto) => (
                <button
                  key={projeto.id}
                  type="button"
                  onClick={() => navegar("/projetos/" + projeto.id)}
                  className="flex flex-col gap-2 rounded-sgp border border-border bg-surface p-3 text-left shadow-n1 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-n2"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: projeto.cor }} aria-hidden />
                    <span className="truncate text-2xs font-semibold text-fg-subtle">{projeto.codigo}</span>
                    <Semaforo saude={projeto.saude} comRotulo={false} tamanho="sm" />
                  </span>
                  <span className="line-clamp-2 text-xs font-medium text-fg">{projeto.nome}</span>
                  <BarraProgresso valor={projeto.percentual_conclusao} comparativo={projeto.progresso_planejado} altura="sm" mostrarValor />
                  <span className="flex items-center justify-between text-2xs text-fg-muted">
                    <span>{projeto.status_rotulo}</span>
                    <span className="tabular-nums">{moeda(projeto.orcamento, true)}</span>
                  </span>
                  <span className="text-2xs text-fg-subtle">Prazo: {dataCurta(projeto.data_fim)}</span>
                </button>
              ))}
            </GradeCards>
          )}
        </section>
      )}

      <PainelLateral
        aberto={painelAberto}
        onFechar={() => setPainelAberto(false)}
        titulo={editando ? "Editar programa" : "Novo programa"}
        subtitulo="Programas agrupam projetos relacionados e somam seus orçamentos."
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setPainelAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={salvar} carregando={criar.isPending || atualizar.isPending}>
              {editando ? "Salvar alterações" : "Criar programa"}
            </Botao>
          </>
        }
      >
        <div className="space-y-4">
          <Campo rotulo="Nome" obrigatorio htmlFor="programa-nome">
            <Entrada
              id="programa-nome"
              value={formulario.nome}
              onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })}
              placeholder="Ex.: Programa de Transformação Digital"
            />
          </Campo>

          <Campo rotulo="Descrição" dica="Objetivo do programa e resultado esperado." htmlFor="programa-descricao">
            <AreaTexto
              id="programa-descricao"
              rows={3}
              value={formulario.descricao}
              onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })}
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Portfólio" htmlFor="programa-portfolio">
              <Selecao
                id="programa-portfolio"
                value={formulario.portfolio}
                onChange={(evento) => setFormulario({ ...formulario, portfolio: evento.target.value })}
              >
                <option value="">Sem portfólio</option>
                {portfolios.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Gerente" htmlFor="programa-gerente">
              <Selecao
                id="programa-gerente"
                value={formulario.gerente}
                onChange={(evento) => setFormulario({ ...formulario, gerente: evento.target.value })}
              >
                <option value="">Sem gerente</option>
                {(catalogo?.gerentes ?? []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Status" htmlFor="programa-status">
              <Selecao
                id="programa-status"
                value={formulario.status}
                onChange={(evento) => setFormulario({ ...formulario, status: evento.target.value })}
              >
                {OPCOES_STATUS.map((item) => (
                  <option key={item.valor} value={item.valor}>
                    {item.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Início" htmlFor="programa-inicio">
              <Entrada
                id="programa-inicio"
                type="date"
                value={formulario.data_inicio}
                onChange={(evento) => setFormulario({ ...formulario, data_inicio: evento.target.value })}
              />
            </Campo>

            <Campo rotulo="Fim" htmlFor="programa-fim">
              <Entrada
                id="programa-fim"
                type="date"
                value={formulario.data_fim}
                onChange={(evento) => setFormulario({ ...formulario, data_fim: evento.target.value })}
              />
            </Campo>
          </div>

          <Campo rotulo="Cor" dica="Usada nos cards e gráficos do programa.">
            <div className="flex flex-wrap items-center gap-2">
              {PALETA.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={"Cor " + cor}
                  onClick={() => setFormulario({ ...formulario, cor })}
                  className={
                    "size-7 rounded-full border-2 transition-transform " +
                    (formulario.cor === cor ? "border-fg scale-110" : "border-transparent hover:scale-105")
                  }
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </Campo>

          <Campo rotulo="Ícone">
            <div className="flex flex-wrap items-center gap-2">
              {ICONES_DISPONIVEIS.map((chave) => {
                const Icone = ICONES[chave] || Layers;
                const ativo = formulario.icone === chave;
                return (
                  <button
                    key={chave}
                    type="button"
                    aria-label={"Ícone " + chave}
                    onClick={() => setFormulario({ ...formulario, icone: chave })}
                    className={
                      "grid size-9 place-items-center rounded-sgp border transition-colors " +
                      (ativo ? "border-brand bg-brand-soft/60 text-brand" : "border-border text-fg-muted hover:bg-surface-2")
                    }
                  >
                    <Icone className="size-4" aria-hidden />
                  </button>
                );
              })}
            </div>
          </Campo>
        </div>
      </PainelLateral>

      <Modal
        aberto={Boolean(confirmacao)}
        onFechar={() => setConfirmacao(null)}
        titulo="Excluir programa"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} onClick={confirmarExclusao} carregando={excluir.isPending}>
              Excluir programa
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão do programa <strong>{confirmacao?.nome}</strong>?
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          Os projetos vinculados permanecem no portfólio, mas ficam sem programa.
        </p>
      </Modal>
    </div>
  );
}

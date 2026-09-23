import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Briefcase, Building2, FolderKanban, Layers, Pencil, Plus, Rocket,
  Target, Trash2, TrendingUp, Wallet,
} from "lucide-react";
import {
  Alerta, AreaTexto, Avatar, BarraFerramentas, BarraProgresso, Botao, CabecalhoPagina, Campo,
  CarregandoBloco, CORES_SAUDE, Entrada, EntradaBusca, Etiqueta, Modal,
  PainelLateral, Selecao, Vazio, useAvisos,
} from "@/components/ui";
import { FiltroSelect, GradeCards, LinhaKPI } from "@/components/layout";
import { GraficoBarras, GraficoDonut, type FatiaDonut } from "@/components/charts";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, moeda, numero, percentual } from "@/lib/format";
import { media, soma } from "@/lib/utils";
import type { ProjetoResumo, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Portfolios — saude agregada, orcamento planejado x realizado e drill-down
   ========================================================================== */

const ROTULOS_STATUS: Record<string, string> = {
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  ENCERRADO: "Encerrado",
};

const TONS_STATUS: Record<string, "success" | "warning" | "neutral"> = {
  ATIVO: "success",
  SUSPENSO: "warning",
  ENCERRADO: "neutral",
};

const OPCOES_STATUS = Object.keys(ROTULOS_STATUS).map((chave) => ({ valor: chave, rotulo: ROTULOS_STATUS[chave] }));
const PALETA = ["#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#6366F1"];

interface Portfolio {
  id: number;
  nome: string;
  descricao: string;
  objetivo_estrategico: string;
  responsavel: number | null;
  responsavel_detalhe: UsuarioResumo | null;
  cor: string;
  icone: string;
  status: string;
  orcamento_anual: string;
  total_projetos: number;
  total_programas: number;
  criado_em: string;
  atualizado_em: string;
}

interface ProgramaResumo {
  id: number;
  nome: string;
  portfolio: number | null;
  status: string;
  gerente: number | null;
  gerente_detalhe: UsuarioResumo | null;
  data_inicio: string | null;
  data_fim: string | null;
  cor: string;
  total_projetos: number;
}

interface Catalogo {
  gerentes: Array<{ id: number; nome: string; cargo: string; cor: string; iniciais: string }>;
}

interface FormularioPortfolio {
  nome: string;
  descricao: string;
  objetivo_estrategico: string;
  responsavel: string;
  status: string;
  orcamento_anual: string;
  cor: string;
}

const FORMULARIO_VAZIO: FormularioPortfolio = {
  nome: "",
  descricao: "",
  objetivo_estrategico: "",
  responsavel: "",
  status: "ATIVO",
  orcamento_anual: "0",
  cor: "#3B82F6",
};

export default function Portfolios() {
  const navegar = useNavigate();
  const { erro: avisarErro } = useAvisos();
  const [termo, setTermo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  const [editando, setEditando] = useState<Portfolio | null>(null);
  const [formulario, setFormulario] = useState<FormularioPortfolio>(FORMULARIO_VAZIO);
  const [confirmacao, setConfirmacao] = useState<Portfolio | null>(null);

  const { data: portfolios = [], isLoading, isError, error } = useLista<Portfolio>(["portfolios"], "/portfolios/");
  const { data: programas = [] } = useLista<ProgramaResumo>(["programas"], "/programas/");
  const { data: catalogo } = useConsulta<Catalogo>(["projetos", "catalogo"], "/projetos/assistente/catalogo/");
  const cards = useConsulta<{ total: number; projetos: ProjetoResumo[] }>(CHAVES.projetosCards, "/projetos/cards/");

  const projetos = cards.data?.projetos ?? [];

  const porPortfolio = useMemo(() => {
    const mapa: Record<string, ProjetoResumo[]> = {};
    projetos.forEach((projeto) => {
      const chave = String(projeto.portfolio || "");
      (mapa[chave] ||= []).push(projeto);
    });
    return mapa;
  }, [projetos]);

  const resumo = (portfolio: Portfolio) => {
    const lista = porPortfolio[String(portfolio.id)] || [];
    const realizado = soma(lista.map((item) => Number(item.custo_real) || 0));
    const planejado = soma(lista.map((item) => Number(item.orcamento) || 0));
    const progresso = media(lista.map((item) => item.percentual_conclusao));
    const saudaveis = lista.filter((item) => item.saude === "VERDE").length;
    const atencao = lista.filter((item) => item.saude === "AMARELO").length;
    const criticos = lista.filter((item) => item.saude === "VERMELHO").length;
    const semAvaliacao = lista.length - saudaveis - atencao - criticos;
    const atrasados = lista.filter((item) => item.atrasado).length;
    const fatias: FatiaDonut[] = [
      { rotulo: "No prazo", valor: saudaveis, cor: CORES_SAUDE.VERDE.cor },
      { rotulo: "Atenção", valor: atencao, cor: CORES_SAUDE.AMARELO.cor },
      { rotulo: "Crítico", valor: criticos, cor: CORES_SAUDE.VERMELHO.cor },
      { rotulo: "Não avaliado", valor: semAvaliacao, cor: CORES_SAUDE.CINZA.cor },
    ].filter((fatia) => fatia.valor > 0);
    return { lista, realizado, planejado, progresso, atrasados, fatias };
  };

  const filtrados = useMemo(() => {
    const busca = termo.trim().toLowerCase();
    return portfolios.filter((item) => {
      if (filtroStatus && item.status !== filtroStatus) return false;
      if (busca && !(item.nome + " " + item.descricao + " " + item.objetivo_estrategico).toLowerCase().includes(busca)) return false;
      return true;
    });
  }, [portfolios, termo, filtroStatus]);

  const kpis = useMemo(() => {
    const orcamentoAnual = soma(portfolios.map((item) => Number(item.orcamento_anual) || 0));
    const planejado = soma(projetos.map((item) => Number(item.orcamento) || 0));
    const realizado = soma(projetos.map((item) => Number(item.custo_real) || 0));
    const progresso = media(projetos.map((item) => item.percentual_conclusao));
    const atrasados = projetos.filter((item) => item.atrasado).length;
    return [
      { rotulo: "Portfólios", valor: numero(portfolios.length), icone: Briefcase, cor: "#3B82F6", subrotulo: "carteiras ativas" },
      { rotulo: "Programas", valor: numero(programas.length), icone: Layers, cor: "#8B5CF6", subrotulo: "agrupadores" },
      { rotulo: "Projetos", valor: numero(projetos.length), icone: FolderKanban, cor: "#0891B2", subrotulo: "em todos os portfólios" },
      { rotulo: "Orçamento anual", valor: moeda(orcamentoAnual, true), icone: Wallet, cor: "#059669", subrotulo: "previsto nas carteiras" },
      { rotulo: "Realizado", valor: moeda(realizado, true), icone: TrendingUp, cor: "#D97706", subrotulo: "de " + moeda(planejado, true) + " planejado" },
      { rotulo: "Progresso médio", valor: percentual(progresso, 0), icone: Target, cor: "#2563EB", subrotulo: numero(atrasados) + " projeto(s) atrasado(s)" },
    ];
  }, [portfolios, programas, projetos]);

  const comparativo = useMemo(
    () =>
      portfolios.map((portfolio) => {
        const dados = resumo(portfolio);
        return {
          rotulo: portfolio.nome,
          valor: dados.realizado,
          comparativo: dados.planejado,
          cor: portfolio.cor,
        };
      }),
    [portfolios, porPortfolio]
  );

  const abrirNovo = () => {
    setEditando(null);
    setFormulario(FORMULARIO_VAZIO);
    setPainelAberto(true);
  };

  const abrirEdicao = (portfolio: Portfolio) => {
    setEditando(portfolio);
    setFormulario({
      nome: portfolio.nome,
      descricao: portfolio.descricao,
      objetivo_estrategico: portfolio.objetivo_estrategico,
      responsavel: portfolio.responsavel ? String(portfolio.responsavel) : "",
      status: portfolio.status,
      orcamento_anual: String(portfolio.orcamento_anual || "0"),
      cor: portfolio.cor || "#3B82F6",
    });
    setPainelAberto(true);
  };

  const invalidar = [["portfolios"], ["programas"], CHAVES.projetosCards];

  const criar = useMutacao<Record<string, unknown>, Portfolio>({
    url: "/portfolios/",
    invalidar,
    mensagemSucesso: "Portfólio criado",
  });

  const atualizar = useMutacao<Record<string, unknown> & { id: number }, Portfolio>({
    metodo: "patch",
    url: (valores) => "/portfolios/" + valores.id + "/",
    invalidar,
    mensagemSucesso: "Portfólio atualizado",
  });

  const excluir = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (valores) => "/portfolios/" + valores.id + "/",
    invalidar,
    mensagemSucesso: "Portfólio excluído",
  });

  const salvar = async () => {
    if (!formulario.nome.trim()) {
      avisarErro("Informe o nome do portfólio", "O nome é obrigatório para salvar.");
      return;
    }
    const payload: Record<string, unknown> = {
      nome: formulario.nome.trim(),
      descricao: formulario.descricao,
      objetivo_estrategico: formulario.objetivo_estrategico,
      status: formulario.status,
      cor: formulario.cor,
      orcamento_anual: Number(formulario.orcamento_anual) || 0,
      responsavel: formulario.responsavel ? Number(formulario.responsavel) : null,
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
      if (abertoId === confirmacao.id) setAbertoId(null);
      setConfirmacao(null);
    } catch (falha) {
      avisarErro("Não foi possível excluir", mensagemErro(falha));
    }
  };

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Portfólios"
        subtitulo={numero(portfolios.length) + " carteira(s) · " + numero(programas.length) + " programa(s) · " + numero(projetos.length) + " projeto(s)"}
        icone={Briefcase}
        cor="#3B82F6"
        acoes={
          <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
            Novo portfólio
          </Botao>
        }
      />

      <LinhaKPI itens={kpis} />

      <BarraFerramentas>
        <EntradaBusca valor={termo} onChange={setTermo} placeholder="Buscar portfólio..." className="w-full sm:w-72" />
        <FiltroSelect rotulo="Status" valor={filtroStatus} onChange={setFiltroStatus} opcoes={OPCOES_STATUS} />
        {(termo || filtroStatus) && (
          <Botao
            variante="fantasma"
            tamanho="sm"
            onClick={() => {
              setTermo("");
              setFiltroStatus("");
            }}
          >
            Limpar filtros
          </Botao>
        )}
        <span className="ml-auto text-2xs text-fg-muted">
          Clique em um portfólio para listar seus programas (drill-down).
        </span>
      </BarraFerramentas>

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os portfólios">
          {mensagemErro(error)}
        </Alerta>
      )}

      {isLoading && <CarregandoBloco rotulo="Carregando portfólios..." />}

      {!isLoading && !isError && !filtrados.length && (
        <Vazio
          icone={Briefcase}
          titulo="Nenhum portfólio encontrado"
          descricao="Crie um portfólio para consolidar programas, projetos e orçamento anual."
          acao={
            <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
              Novo portfólio
            </Botao>
          }
        />
      )}

      {!isLoading && !isError && filtrados.length > 0 && (
        <GradeCards colunas="auto">
          {filtrados.map((portfolio) => {
            const dados = resumo(portfolio);
            const aberto = abertoId === portfolio.id;
            const consumo = dados.planejado > 0 ? (dados.realizado / dados.planejado) * 100 : 0;
            const programasDoPortfolio = programas.filter((item) => item.portfolio === portfolio.id);
            return (
              <div
                key={portfolio.id}
                className={
                  "flex h-full flex-col gap-3 rounded-sgp-lg border bg-surface p-3.5 shadow-n1 transition-all animate-entrada " +
                  (aberto ? "border-brand ring-2 ring-brand/40" : "border-border hover:border-border-strong hover:shadow-n2")
                }
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-sgp"
                    style={{ backgroundColor: portfolio.cor + "1f", color: portfolio.cor }}
                    aria-hidden
                  >
                    <Briefcase className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-fg" title={portfolio.nome}>
                      {portfolio.nome}
                    </h3>
                    <p className="truncate text-2xs text-fg-muted" title={portfolio.objetivo_estrategico}>
                      {portfolio.objetivo_estrategico || "Sem objetivo estratégico definido"}
                    </p>
                  </div>
                  <Etiqueta tom={TONS_STATUS[portfolio.status] || "neutral"}>
                    {ROTULOS_STATUS[portfolio.status] || portfolio.status}
                  </Etiqueta>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="size-3" aria-hidden />
                    {numero(programasDoPortfolio.length)} programa(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FolderKanban className="size-3" aria-hidden />
                    {numero(dados.lista.length)} projeto(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="size-3" aria-hidden />
                    {moeda(portfolio.orcamento_anual, true)} / ano
                  </span>
                  {dados.atrasados > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-danger">
                      <AlertTriangle className="size-3" aria-hidden />
                      {numero(dados.atrasados)} atrasado(s)
                    </span>
                  )}
                </div>

                {portfolio.responsavel_detalhe && (
                  <div className="flex items-center gap-2 rounded-sgp bg-surface-2 px-2 py-1.5">
                    <Avatar
                      nome={portfolio.responsavel_detalhe.nome}
                      cor={portfolio.responsavel_detalhe.cor}
                      iniciais={portfolio.responsavel_detalhe.iniciais}
                      url={portfolio.responsavel_detalhe.avatar_display}
                      tamanho="xs"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-2xs font-medium text-fg">{portfolio.responsavel_detalhe.nome}</span>
                      <span className="block truncate text-2xs text-fg-subtle">
                        {portfolio.responsavel_detalhe.cargo || portfolio.responsavel_detalhe.papel}
                      </span>
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 items-center gap-2">
                  {dados.fatias.length > 0 ? (
                    <GraficoDonut
                      fatias={dados.fatias}
                      tamanho={108}
                      espessura={14}
                      centroRotulo="projetos"
                      centroValor={dados.lista.length}
                      legenda={false}
                      unidade=""
                    />
                  ) : (
                    <p className="text-center text-2xs text-fg-subtle">Sem projetos vinculados.</p>
                  )}
                  <div className="space-y-2">
                    <BarraProgresso valor={dados.progresso} altura="sm" rotulo="Progresso médio" mostrarValor />
                    <BarraProgresso
                      valor={consumo}
                      altura="sm"
                      rotulo="Consumo do orçamento"
                      mostrarValor
                      cor={consumo > 100 ? "#DC2626" : consumo > 90 ? "#D97706" : "#059669"}
                    />
                    <div className="space-y-0.5 text-2xs">
                      <p className="flex items-center justify-between">
                        <span className="text-fg-muted">Planejado</span>
                        <span className="font-semibold tabular-nums text-fg">{moeda(dados.planejado, true)}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-fg-muted">Realizado</span>
                        <span className="font-semibold tabular-nums text-fg">{moeda(dados.realizado, true)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-2.5">
                  <Botao
                    tamanho="xs"
                    variante="secundario"
                    icone={Layers}
                    onClick={() => setAbertoId(aberto ? null : portfolio.id)}
                  >
                    {aberto ? "Ocultar programas" : "Ver programas"}
                  </Botao>
                  <Botao tamanho="xs" variante="fantasma" icone={Pencil} onClick={() => abrirEdicao(portfolio)}>
                    Editar
                  </Botao>
                  <Botao
                    tamanho="xs"
                    variante="fantasma"
                    icone={Trash2}
                    className="ml-auto text-danger"
                    onClick={() => setConfirmacao(portfolio)}
                  >
                    Excluir
                  </Botao>
                </div>

                {aberto && (
                  <div className="space-y-2 rounded-sgp border border-border bg-surface-2 p-2.5 animate-entrada">
                    <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                      Programas do portfólio
                    </p>
                    {programasDoPortfolio.length === 0 && (
                      <p className="text-2xs text-fg-subtle">Nenhum programa vinculado a este portfólio.</p>
                    )}
                    {programasDoPortfolio.map((programa) => (
                      <button
                        key={programa.id}
                        type="button"
                        onClick={() => navegar("/programas?programa=" + programa.id)}
                        className="flex w-full items-center gap-2 rounded-sgp border border-border bg-surface px-2 py-1.5 text-left transition-colors hover:border-border-strong hover:bg-surface-2"
                      >
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: programa.cor }} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-2xs font-medium text-fg">{programa.nome}</span>
                          <span className="block truncate text-2xs text-fg-subtle">
                            {numero(programa.total_projetos)} projeto(s) · {dataCurta(programa.data_inicio)} → {dataCurta(programa.data_fim)}
                          </span>
                        </span>
                        <ArrowRight className="size-3 shrink-0 text-fg-subtle" aria-hidden />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </GradeCards>
      )}

      {!isLoading && !isError && filtrados.length > 0 && (
        <section className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-brand" aria-hidden />
              <h2 className="text-sm font-semibold text-fg">Orçamento planejado × realizado por portfólio</h2>
            </div>
            <span className="text-2xs text-fg-muted">A barra clara representa o orçamento planejado dos projetos do portfólio.</span>
          </header>
          <GraficoBarras
            itens={comparativo}
            horizontal
            formatarValor={(valor) => moeda(valor, true)}
            mostrarEixo={false}
          />
        </section>
      )}

      <PainelLateral
        aberto={painelAberto}
        onFechar={() => setPainelAberto(false)}
        titulo={editando ? "Editar portfólio" : "Novo portfólio"}
        subtitulo="Portfólios consolidam programas, projetos e orçamento anual."
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setPainelAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" onClick={salvar} carregando={criar.isPending || atualizar.isPending}>
              {editando ? "Salvar alterações" : "Criar portfólio"}
            </Botao>
          </>
        }
      >
        <div className="space-y-4">
          <Campo rotulo="Nome" obrigatorio htmlFor="portfolio-nome">
            <Entrada
              id="portfolio-nome"
              value={formulario.nome}
              onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })}
              placeholder="Ex.: Portfólio de Inovação"
            />
          </Campo>

          <Campo rotulo="Descrição" htmlFor="portfolio-descricao">
            <AreaTexto
              id="portfolio-descricao"
              rows={2}
              value={formulario.descricao}
              onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })}
            />
          </Campo>

          <Campo rotulo="Objetivo estratégico" dica="Como este portfólio apoia a estratégia da organização." htmlFor="portfolio-objetivo">
            <AreaTexto
              id="portfolio-objetivo"
              rows={3}
              value={formulario.objetivo_estrategico}
              onChange={(evento) => setFormulario({ ...formulario, objetivo_estrategico: evento.target.value })}
            />
          </Campo>

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Responsável" htmlFor="portfolio-responsavel">
              <Selecao
                id="portfolio-responsavel"
                value={formulario.responsavel}
                onChange={(evento) => setFormulario({ ...formulario, responsavel: evento.target.value })}
              >
                <option value="">Sem responsável</option>
                {(catalogo?.gerentes ?? []).map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>

            <Campo rotulo="Status" htmlFor="portfolio-status">
              <Selecao
                id="portfolio-status"
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

            <Campo rotulo="Orçamento anual (R$)" htmlFor="portfolio-orcamento">
              <Entrada
                id="portfolio-orcamento"
                type="number"
                min={0}
                step={1000}
                value={formulario.orcamento_anual}
                onChange={(evento) => setFormulario({ ...formulario, orcamento_anual: evento.target.value })}
              />
            </Campo>
          </div>

          <Campo rotulo="Cor" dica="Usada nos cards e nos gráficos comparativos.">
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
        </div>
      </PainelLateral>

      <Modal
        aberto={Boolean(confirmacao)}
        onFechar={() => setConfirmacao(null)}
        titulo="Excluir portfólio"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} onClick={confirmarExclusao} carregando={excluir.isPending}>
              Excluir portfólio
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão do portfólio <strong>{confirmacao?.nome}</strong>?
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          Programas e projetos permanecem cadastrados, mas ficam desvinculados do portfólio.
        </p>
      </Modal>

      <p className="flex items-center gap-1.5 text-2xs text-fg-subtle">
        <Rocket className="size-3" aria-hidden />
        A saúde agregada considera o semáforo de cada projeto vinculado ao portfólio.
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import {
  ArrowDownCircle, ArrowUpCircle, BadgeCheck, BarChart3, CalendarDays, CheckCheck, CircleDollarSign,
  FileText, Filter, Pencil, Plus, Receipt, RefreshCw, Search, Trash2, TrendingUp, Wallet,
} from "lucide-react";
import {
  Alerta, AreaTexto, BarraFerramentas, Botao, BotaoIcone, CabecalhoPagina, Campo, CarregandoBloco,
  Chip, Entrada, EntradaBusca, Etiqueta, FiltrosAtivos, Interruptor, Modal, PainelLateral, Selecao,
  Tabela, Vazio, useAvisos, type ColunaTabela,
} from "@/components/ui";
import { GraficoBarras } from "@/components/charts";
import { FiltroSelect, LinhaKPI } from "@/components/layout";
import { api, mensagemErro } from "@/lib/api";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { dataCurta, hojeISO, mesCurto, moeda, numero } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Lancamento, Orcamento, ProjetoResumo } from "@/lib/types";

/* ==========================================================================
   Lançamentos financeiros: despesas e receitas (RF-19)
   ========================================================================== */

const TIPOS = [
  { valor: "DESPESA", rotulo: "Despesa" },
  { valor: "RECEITA", rotulo: "Receita" },
];

const STATUS = [
  { valor: "PREVISTO", rotulo: "Previsto" },
  { valor: "COMPROMETIDO", rotulo: "Comprometido" },
  { valor: "REALIZADO", rotulo: "Realizado" },
  { valor: "CANCELADO", rotulo: "Cancelado" },
];

interface LancamentoCompleto extends Lancamento {
  recorrente: boolean;
  observacao: string;
}

interface ResumoLancamentos {
  despesas_total: number;
  receitas_total: number;
  realizado: number;
  comprometido: number;
  previsto: number;
  por_categoria: Array<{ categoria: string; total: number }>;
  por_mes: Array<{ data_competencia__year: number; data_competencia__month: number; total: number }>;
}

interface FormularioLancamento {
  id: number | null;
  project: string;
  orcamento: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: string;
  data_competencia: string;
  data_pagamento: string;
  status: string;
  fornecedor: string;
  documento: string;
  centro_custo: string;
  observacao: string;
  recorrente: boolean;
}

function formularioVazio(): FormularioLancamento {
  return {
    id: null,
    project: "",
    orcamento: "",
    tipo: "DESPESA",
    categoria: "",
    descricao: "",
    valor: "",
    data_competencia: hojeISO(),
    data_pagamento: "",
    status: "REALIZADO",
    fornecedor: "",
    documento: "",
    centro_custo: "",
    observacao: "",
    recorrente: false,
  };
}

function formularioDe(lancamento: LancamentoCompleto): FormularioLancamento {
  return {
    id: lancamento.id,
    project: String(lancamento.project),
    orcamento: lancamento.orcamento ? String(lancamento.orcamento) : "",
    tipo: lancamento.tipo,
    categoria: lancamento.categoria,
    descricao: lancamento.descricao,
    valor: String(Number(lancamento.valor).toFixed(2)),
    data_competencia: lancamento.data_competencia ?? "",
    data_pagamento: lancamento.data_pagamento ?? "",
    status: lancamento.status,
    fornecedor: lancamento.fornecedor,
    documento: lancamento.documento,
    centro_custo: lancamento.centro_custo,
    // Preenchidos com o valor atual: o formulário de edição envia o objeto
    // inteiro, então começar vazio apagava a observação e desmarcava
    // "recorrente" a cada edição de um lançamento existente.
    observacao: lancamento.observacao ?? "",
    recorrente: lancamento.recorrente ?? false,
  };
}

function corStatus(status: string) {
  if (status === "REALIZADO") return "#059669";
  if (status === "COMPROMETIDO") return "#0891B2";
  if (status === "PREVISTO") return "#D97706";
  return "#64748B";
}

export default function Lancamentos() {
  const { sucesso, alerta, erro: avisarErro } = useAvisos();
  const { pode } = useAuth();

  // Criar, editar, excluir e aprovar são alçadas do financeiro: quem só
  // acompanha (EXECUTIVO) recebe 403 do servidor se a tela oferecer o botão.
  const podeEditar = pode("financeiro.editar");

  const [projeto, setProjeto] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [categoria, setCategoria] = useState("");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("competencia");

  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [aprovandoLote, setAprovandoLote] = useState(false);
  const [formulario, setFormulario] = useState<FormularioLancamento | null>(null);
  const [paraExcluir, setParaExcluir] = useState<LancamentoCompleto | null>(null);

  const params = useMemo(
    () => ({
      ...(projeto ? { project: projeto } : {}),
      ...(tipo ? { tipo } : {}),
      ...(status ? { status } : {}),
      ...(categoria ? { categoria } : {}),
      ...(busca ? { search: busca } : {}),
      page_size: 500,
    }),
    [projeto, tipo, status, categoria, busca]
  );

  const { data: lancamentos = [], isLoading, isError, error, refetch, isFetching } = useLista<LancamentoCompleto>(
    CHAVES.lancamentos,
    "/lancamentos/",
    params
  );

  const { data: resumo } = useConsulta<ResumoLancamentos>(["lancamentos", "resumo"], "/lancamentos/resumo/", params);

  const { data: projetos = [] } = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 300 });

  const { data: orcamentosFormulario = [] } = useLista<Orcamento>(
    CHAVES.orcamentos,
    formulario?.project ? "/orcamentos/" : null,
    { project: formulario?.project, page_size: 200 }
  );

  const filtrados = useMemo(
    () =>
      lancamentos.filter((l) => {
        if (dataDe && l.data_competencia < dataDe) return false;
        if (dataAte && l.data_competencia > dataAte) return false;
        return true;
      }),
    [lancamentos, dataDe, dataAte]
  );

  const ordenados = useMemo(() => {
    const copia = [...filtrados];
    copia.sort((a, b) => {
      if (ordem === "valor") return Number(b.valor) - Number(a.valor);
      if (ordem === "descricao") return a.descricao.localeCompare(b.descricao, "pt-BR");
      return b.data_competencia.localeCompare(a.data_competencia);
    });
    return copia;
  }, [filtrados, ordem]);

  const categorias = useMemo(() => {
    const conjunto = new Set<string>();
    (resumo?.por_categoria ?? []).forEach((c) => c.categoria && conjunto.add(c.categoria));
    lancamentos.forEach((l) => l.categoria && conjunto.add(l.categoria));
    orcamentosFormulario.forEach((o) => o.categoria && conjunto.add(o.categoria));
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [resumo, lancamentos, orcamentosFormulario]);

  const itensCategoria = useMemo(
    () => (resumo?.por_categoria ?? []).slice(0, 12).map((c) => ({ rotulo: c.categoria || "Sem categoria", valor: c.total, cor: "#0891B2" })),
    [resumo]
  );

  const itensMes = useMemo(
    () =>
      (resumo?.por_mes ?? []).slice(-12).map((m) => ({
        rotulo: mesCurto(String(m.data_competencia__year) + "-" + String(m.data_competencia__month).padStart(2, "0")),
        valor: m.total,
        cor: "#2563EB",
      })),
    [resumo]
  );

  const criar = useMutacao<Record<string, unknown>, Lancamento>({
    url: "/lancamentos/",
    invalidar: [CHAVES.lancamentos, CHAVES.orcamentos, CHAVES.projetos, CHAVES.dashboardFinanceiro],
    mensagemSucesso: "Lançamento registrado",
    aoSucesso: () => setFormulario(null),
  });

  const editar = useMutacao<Record<string, unknown> & { id: number }, Lancamento>({
    metodo: "patch",
    url: (v) => "/lancamentos/" + v.id + "/",
    invalidar: [CHAVES.lancamentos, CHAVES.orcamentos, CHAVES.projetos, CHAVES.dashboardFinanceiro],
    mensagemSucesso: "Lançamento atualizado",
    aoSucesso: () => setFormulario(null),
  });

  const excluir = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (v) => "/lancamentos/" + v.id + "/",
    invalidar: [CHAVES.lancamentos, CHAVES.orcamentos, CHAVES.projetos, CHAVES.dashboardFinanceiro],
    mensagemSucesso: "Lançamento excluído",
    aoSucesso: () => setParaExcluir(null),
  });

  const aprovar = useMutacao<{ id: number }, Lancamento>({
    url: (v) => "/lancamentos/" + v.id + "/aprovar/",
    invalidar: [CHAVES.lancamentos, CHAVES.orcamentos, CHAVES.projetos, CHAVES.dashboardFinanceiro],
    mensagemSucesso: "Lançamento aprovado",
  });

  async function aprovarLote() {
    if (!selecionados.length) {
      alerta("Nenhum lançamento selecionado", "Marque ao menos um lançamento na tabela.");
      return;
    }
    setAprovandoLote(true);
    try {
      await Promise.all(selecionados.map((id) => api.post("/lancamentos/" + id + "/aprovar/")));
      sucesso(selecionados.length + " lançamento(s) aprovado(s)", "Os registros foram marcados como realizados.");
      setSelecionados([]);
      refetch();
    } catch (falha) {
      avisarErro("Falha na aprovação em lote", mensagemErro(falha));
    } finally {
      setAprovandoLote(false);
    }
  }

  function abrirNovo() {
    const inicial = formularioVazio();
    setFormulario({ ...inicial, project: projeto || "", categoria });
  }

  function salvar() {
    if (!formulario) return;
    if (!formulario.project) {
      alerta("Projeto obrigatório", "Selecione o projeto do lançamento.");
      return;
    }
    if (!formulario.descricao.trim()) {
      alerta("Descrição obrigatória", "Informe uma descrição para o lançamento.");
      return;
    }
    if (!formulario.valor || Number(formulario.valor) === 0) {
      alerta("Valor inválido", "O valor deve ser diferente de zero.");
      return;
    }
    if (!formulario.data_competencia) {
      alerta("Data obrigatória", "Informe a data de competência.");
      return;
    }
    const corpo: Record<string, unknown> = {
      project: Number(formulario.project),
      orcamento: formulario.orcamento ? Number(formulario.orcamento) : null,
      tipo: formulario.tipo,
      categoria: formulario.categoria,
      descricao: formulario.descricao.trim(),
      valor: Number(formulario.valor),
      data_competencia: formulario.data_competencia,
      data_pagamento: formulario.data_pagamento || null,
      status: formulario.status,
      fornecedor: formulario.fornecedor,
      documento: formulario.documento,
      centro_custo: formulario.centro_custo,
      observacao: formulario.observacao,
      recorrente: formulario.recorrente,
    };
    if (formulario.id) editar.mutate({ ...corpo, id: formulario.id });
    else criar.mutate(corpo);
  }

  function alternarSelecao(id: number) {
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  const todosSelecionados = ordenados.length > 0 && ordenados.every((l) => selecionados.includes(l.id));

  const colunas: Array<ColunaTabela<LancamentoCompleto>> = [
    {
      chave: "selecao",
      titulo: (
        <input
          type="checkbox"
          aria-label="Selecionar todos os lançamentos"
          checked={todosSelecionados}
          onChange={(e) => setSelecionados(e.target.checked ? ordenados.map((l) => l.id) : [])}
          style={{ accentColor: "#2563EB" }}
        />
      ),
      largura: "34px",
      renderizar: (l) => (
        <input
          type="checkbox"
          aria-label={"Selecionar " + l.descricao}
          checked={selecionados.includes(l.id)}
          onChange={() => alternarSelecao(l.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ accentColor: "#2563EB" }}
        />
      ),
    },
    {
      chave: "competencia",
      titulo: "Competência",
      largura: "110px",
      ordenavel: true,
      valorOrdenacao: (l) => l.data_competencia,
      renderizar: (l) => (
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <span className="tabular-nums text-xs text-fg">{dataCurta(l.data_competencia)}</span>
        </div>
      ),
    },
    {
      chave: "descricao",
      titulo: "Descrição",
      ordenavel: true,
      valorOrdenacao: (l) => l.descricao,
      renderizar: (l) => (
        <div className="flex min-w-0 items-start gap-2">
          <span
            className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md"
            style={{
              backgroundColor: (l.tipo === "RECEITA" ? "#059669" : "#DC2626") + "1f",
              color: l.tipo === "RECEITA" ? "#059669" : "#DC2626",
            }}
          >
            {l.tipo === "RECEITA" ? <ArrowUpCircle className="size-3.5" aria-hidden /> : <ArrowDownCircle className="size-3.5" aria-hidden />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-fg">{l.descricao}</p>
            <p className="truncate text-2xs text-fg-muted">
              {l.fornecedor || "sem fornecedor"}
              {l.documento ? " · " + l.documento : ""}
              {l.recorrente ? " · recorrente" : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      chave: "categoria",
      titulo: "Categoria",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (l) => l.categoria,
      renderizar: (l) => <span className="truncate text-xs text-fg-muted">{l.categoria || "—"}</span>,
    },
    {
      chave: "projeto",
      titulo: "Projeto",
      largura: "170px",
      ordenavel: true,
      valorOrdenacao: (l) => l.project_nome,
      renderizar: (l) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: l.project_cor }} />
          <span className="truncate text-xs text-fg-muted">{l.project_nome}</span>
        </span>
      ),
    },
    {
      chave: "valor",
      titulo: "Valor",
      largura: "140px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (l) => Number(l.valor),
      renderizar: (l) => (
        <span
          className="font-semibold tabular-nums"
          style={{ color: l.tipo === "RECEITA" ? "#059669" : "#DC2626" }}
          title={l.tipo_rotulo}
        >
          {l.tipo === "RECEITA" ? "+" : "-"}
          {moeda(l.valor)}
        </span>
      ),
    },
    {
      chave: "status",
      titulo: "Status",
      largura: "120px",
      renderizar: (l) => (
        <Etiqueta cor={corStatus(l.status)} solido={l.status === "REALIZADO"}>
          {l.status_rotulo}
        </Etiqueta>
      ),
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "140px",
      alinhar: "right",
      renderizar: (l) => (
        <div className="flex items-center justify-end gap-1">
          {l.status !== "REALIZADO" && l.status !== "CANCELADO" && (
            <BotaoIcone
              icone={BadgeCheck}
              rotulo="Aprovar lançamento"
              variante="sucesso"
              tamanho="sm"
              onClick={() => aprovar.mutate({ id: l.id })}
            />
          )}
          <BotaoIcone icone={Pencil} rotulo="Editar lançamento" tamanho="sm" onClick={() => setFormulario(formularioDe(l))} />
          <BotaoIcone icone={Trash2} rotulo="Excluir lançamento" variante="perigo" tamanho="sm" onClick={() => setParaExcluir(l)} />
        </div>
      ),
    },
  ];

  // Sem alçada de escrita a seleção e as ações não têm uso: a aprovação em
  // lote, a edição e a exclusão seriam recusadas pelo servidor.
  const colunasVisiveis = podeEditar ? colunas : colunas.filter((c) => c.chave !== "selecao" && c.chave !== "acoes");

  const filtrosAtivos = [
    ...(projeto
      ? [
          {
            chave: "project",
            rotulo: "Projeto",
            valor: projetos.find((p) => String(p.id) === projeto)?.nome ?? projeto,
            onRemover: () => setProjeto(""),
          },
        ]
      : []),
    ...(tipo
      ? [{ chave: "tipo", rotulo: "Tipo", valor: tipo === "RECEITA" ? "Receita" : "Despesa", onRemover: () => setTipo("") }]
      : []),
    ...(status
      ? [
          {
            chave: "status",
            rotulo: "Status",
            valor: STATUS.find((s) => s.valor === status)?.rotulo ?? status,
            onRemover: () => setStatus(""),
          },
        ]
      : []),
    ...(categoria ? [{ chave: "categoria", rotulo: "Categoria", valor: categoria, onRemover: () => setCategoria("") }] : []),
    ...(dataDe ? [{ chave: "de", rotulo: "De", valor: dataCurta(dataDe), onRemover: () => setDataDe("") }] : []),
    ...(dataAte ? [{ chave: "ate", rotulo: "Até", valor: dataCurta(dataAte), onRemover: () => setDataAte("") }] : []),
    ...(busca ? [{ chave: "busca", rotulo: "Busca", valor: busca, onRemover: () => setBusca("") }] : []),
  ];

  function limparFiltros() {
    setProjeto("");
    setTipo("");
    setStatus("");
    setCategoria("");
    setDataDe("");
    setDataAte("");
    setBusca("");
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Lançamentos financeiros"
        subtitulo={numero(ordenados.length) + " registro(s) · despesas e receitas do portfólio (RF-19)"}
        icone={Receipt}
        cor="#0891B2"
        acoes={
          <>
            <Botao icone={RefreshCw} onClick={() => refetch()} carregando={isFetching}>
              Atualizar
            </Botao>
            {podeEditar && (
              <>
                <Botao icone={CheckCheck} onClick={aprovarLote} carregando={aprovandoLote} disabled={!selecionados.length}>
                  Aprovar selecionados ({selecionados.length})
                </Botao>
                <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
                  Novo lançamento
                </Botao>
              </>
            )}
          </>
        }
      />

      {!podeEditar && (
        <Alerta tom="info" titulo="Perfil de consulta">
          Seu perfil acompanha os lançamentos financeiros, mas não cria, edita, exclui nem aprova registros. Solicite a
          alteração ao gestor do projeto, ao PMO ou ao financeiro.
        </Alerta>
      )}

      <LinhaKPI
        itens={[
          { rotulo: "Despesas", valor: moeda(resumo?.despesas_total, true), icone: ArrowDownCircle, cor: "#DC2626", subrotulo: "total lançado" },
          { rotulo: "Receitas", valor: moeda(resumo?.receitas_total, true), icone: ArrowUpCircle, cor: "#059669", subrotulo: "total lançado" },
          { rotulo: "Realizado", valor: moeda(resumo?.realizado, true), icone: BadgeCheck, cor: "#0891B2", subrotulo: "despesas realizadas" },
          { rotulo: "Comprometido", valor: moeda(resumo?.comprometido, true), icone: FileText, cor: "#8B5CF6", subrotulo: "contratado a pagar" },
          { rotulo: "Previsto", valor: moeda(resumo?.previsto, true), icone: Wallet, cor: "#D97706", subrotulo: "a realizar" },
          {
            rotulo: "Resultado",
            valor: moeda((resumo?.receitas_total ?? 0) - (resumo?.despesas_total ?? 0), true),
            icone: TrendingUp,
            cor: (resumo?.receitas_total ?? 0) - (resumo?.despesas_total ?? 0) < 0 ? "#DC2626" : "#059669",
            subrotulo: "receitas - despesas",
          },
        ]}
      />

      <BarraFerramentas>
        <FiltroSelect
          rotulo="Projeto"
          valor={projeto}
          onChange={setProjeto}
          icone={Filter}
          opcoes={projetos.map((p) => ({ valor: String(p.id), rotulo: p.nome }))}
        />
        <FiltroSelect
          rotulo="Tipo"
          valor={tipo}
          onChange={setTipo}
          opcoes={TIPOS.map((t) => ({ valor: t.valor, rotulo: t.rotulo }))}
        />
        <FiltroSelect
          rotulo="Status"
          valor={status}
          onChange={setStatus}
          opcoes={STATUS.map((s) => ({ valor: s.valor, rotulo: s.rotulo }))}
        />
        <FiltroSelect
          rotulo="Categoria"
          valor={categoria}
          onChange={setCategoria}
          opcoes={categorias.map((c) => ({ valor: c, rotulo: c }))}
        />
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">De</span>
          <Entrada type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} className="h-8 w-36 py-0 text-xs" aria-label="Data inicial" />
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Até</span>
          <Entrada type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} className="h-8 w-36 py-0 text-xs" aria-label="Data final" />
        </label>
        <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar descrição, fornecedor, documento..." className="min-w-56 flex-1" />
        <FiltroSelect
          rotulo="Ordenar"
          valor={ordem}
          onChange={setOrdem}
          opcoes={[
            { valor: "competencia", rotulo: "Competência" },
            { valor: "valor", rotulo: "Valor" },
            { valor: "descricao", rotulo: "Descrição" },
          ]}
        />
      </BarraFerramentas>

      <FiltrosAtivos filtros={filtrosAtivos} onLimpar={limparFiltros} />

      {isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os lançamentos">
          {mensagemErro(error)}
        </Alerta>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <BarChart3 className="size-4 text-fg-muted" aria-hidden /> Despesas por categoria
          </h3>
          {itensCategoria.length === 0 ? (
            <p className="py-8 text-center text-xs text-fg-muted">Sem despesas no filtro atual.</p>
          ) : (
            <GraficoBarras itens={itensCategoria} altura={240} formatarValor={(v) => moeda(v, true)} mostrarEixo />
          )}
        </div>
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <CalendarDays className="size-4 text-fg-muted" aria-hidden /> Despesas por mês
          </h3>
          {itensMes.length === 0 ? (
            <p className="py-8 text-center text-xs text-fg-muted">Sem lançamentos no período.</p>
          ) : (
            <GraficoBarras itens={itensMes} altura={240} formatarValor={(v) => moeda(v, true)} mostrarEixo />
          )}
        </div>
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Receipt className="size-4 text-fg-muted" aria-hidden /> Lançamentos
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Chip cor="#059669" icone={ArrowUpCircle}>
              {numero(lancamentos.filter((l) => l.tipo === "RECEITA").length)} receita(s)
            </Chip>
            <Chip cor="#DC2626" icone={ArrowDownCircle}>
              {numero(lancamentos.filter((l) => l.tipo === "DESPESA").length)} despesa(s)
            </Chip>
            <Chip cor="#D97706" icone={CircleDollarSign}>
              {moeda(ordenados.reduce((total, l) => total + (l.tipo === "DESPESA" ? Number(l.valor) : 0), 0), true)} no filtro
            </Chip>
          </div>
        </header>
        {isLoading ? (
          <CarregandoBloco rotulo="Carregando lançamentos..." />
        ) : (
          <Tabela
            colunas={colunasVisiveis}
            dados={ordenados}
            destaqueLinha={(l) => (l.status === "CANCELADO" ? "bg-neutral-soft/40 opacity-70" : undefined)}
            vazio={
              <Vazio
                icone={Search}
                titulo="Nenhum lançamento encontrado"
                descricao={
                  podeEditar
                    ? "Ajuste os filtros ou registre o primeiro lançamento financeiro do projeto."
                    : "Ajuste os filtros para encontrar lançamentos do portfólio."
                }
                acao={
                  podeEditar ? (
                    <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
                      Novo lançamento
                    </Botao>
                  ) : undefined
                }
              />
            }
            compacta
          />
        )}
      </div>

      <PainelLateral
        aberto={formulario !== null}
        onFechar={() => setFormulario(null)}
        titulo={formulario?.id ? "Editar lançamento" : "Novo lançamento"}
        subtitulo={formulario?.id ? "Atualize os dados do lançamento #" + formulario.id : "Registre uma despesa ou receita do projeto"}
        largura="lg"
        rodape={
          <>
            <Botao onClick={() => setFormulario(null)}>Cancelar</Botao>
            <Botao variante="primario" icone={BadgeCheck} onClick={salvar} carregando={criar.isPending || editar.isPending}>
              Salvar lançamento
            </Botao>
          </>
        }
      >
        {formulario && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Projeto" obrigatorio htmlFor="lanc-project">
                <Selecao
                  id="lanc-project"
                  value={formulario.project}
                  onChange={(e) => setFormulario({ ...formulario, project: e.target.value, orcamento: "" })}
                >
                  <option value="">Selecione o projeto</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.codigo} · {p.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Orçamento vinculado" dica="Opcional — mantém o realizado da linha orçamentária" htmlFor="lanc-orcamento">
                <Selecao
                  id="lanc-orcamento"
                  value={formulario.orcamento}
                  onChange={(e) => {
                    const escolhido = orcamentosFormulario.find((o) => String(o.id) === e.target.value);
                    setFormulario({
                      ...formulario,
                      orcamento: e.target.value,
                      categoria: escolhido ? escolhido.categoria : formulario.categoria,
                    });
                  }}
                  disabled={!formulario.project}
                >
                  <option value="">Sem vínculo</option>
                  {orcamentosFormulario.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.categoria} · {o.tipo} · {moeda(o.valor_planejado, true)}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Tipo" obrigatorio htmlFor="lanc-tipo">
                <Selecao id="lanc-tipo" value={formulario.tipo} onChange={(e) => setFormulario({ ...formulario, tipo: e.target.value })}>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Status" htmlFor="lanc-status">
                <Selecao id="lanc-status" value={formulario.status} onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}>
                  {STATUS.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <Campo rotulo="Descrição" obrigatorio htmlFor="lanc-descricao">
              <Entrada
                id="lanc-descricao"
                value={formulario.descricao}
                onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })}
                placeholder="Ex.: Licenças de infraestrutura — lote 2"
              />
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo rotulo="Valor (R$)" obrigatorio htmlFor="lanc-valor">
                <Entrada
                  id="lanc-valor"
                  type="number"
                  step="0.01"
                  value={formulario.valor}
                  onChange={(e) => setFormulario({ ...formulario, valor: e.target.value })}
                  placeholder="0,00"
                />
              </Campo>
              <Campo rotulo="Competência" obrigatorio htmlFor="lanc-competencia">
                <Entrada
                  id="lanc-competencia"
                  type="date"
                  value={formulario.data_competencia}
                  onChange={(e) => setFormulario({ ...formulario, data_competencia: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Pagamento" dica="Preenchido na aprovação quando vazio" htmlFor="lanc-pagamento">
                <Entrada
                  id="lanc-pagamento"
                  type="date"
                  value={formulario.data_pagamento}
                  onChange={(e) => setFormulario({ ...formulario, data_pagamento: e.target.value })}
                />
              </Campo>
            </div>

            <Campo rotulo="Categoria" dica="Usada nas análises por categoria do painel financeiro" htmlFor="lanc-categoria">
              <Entrada
                id="lanc-categoria"
                list="categorias-lancamentos"
                value={formulario.categoria}
                onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
                placeholder="Ex.: Infraestrutura"
              />
              <datalist id="categorias-lancamentos">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo rotulo="Fornecedor / cliente" htmlFor="lanc-fornecedor">
                <Entrada
                  id="lanc-fornecedor"
                  value={formulario.fornecedor}
                  onChange={(e) => setFormulario({ ...formulario, fornecedor: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Documento / NF" htmlFor="lanc-documento">
                <Entrada
                  id="lanc-documento"
                  value={formulario.documento}
                  onChange={(e) => setFormulario({ ...formulario, documento: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Centro de custo" htmlFor="lanc-centro">
                <Entrada
                  id="lanc-centro"
                  value={formulario.centro_custo}
                  onChange={(e) => setFormulario({ ...formulario, centro_custo: e.target.value })}
                />
              </Campo>
            </div>

            <Campo rotulo="Observação" htmlFor="lanc-observacao">
              <AreaTexto
                id="lanc-observacao"
                rows={3}
                value={formulario.observacao}
                onChange={(e) => setFormulario({ ...formulario, observacao: e.target.value })}
                placeholder="Detalhes adicionais, condições de pagamento, rateios..."
              />
            </Campo>

            <Interruptor
              ativo={formulario.recorrente}
              onChange={(v) => setFormulario({ ...formulario, recorrente: v })}
              rotulo="Lançamento recorrente"
              descricao="Marque para despesas ou receitas que se repetem mensalmente."
            />
          </div>
        )}
      </PainelLateral>

      <Modal
        aberto={paraExcluir !== null}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir lançamento"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao onClick={() => setParaExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={() => paraExcluir && excluir.mutate({ id: paraExcluir.id })}
            >
              Excluir
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão do lançamento <strong>{paraExcluir?.descricao}</strong> no valor de{" "}
          <strong>{moeda(paraExcluir?.valor)}</strong>?
        </p>
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Detalhe do projeto — 11 abas visuais (RF-02 a RF-12, RF-20 a RF-28, RF-68)
   ========================================================================== */

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraProgresso, Botao, CabecalhoPagina, Campo, CarregandoBloco,
  CORES_PRIORIDADE, Entrada, Esqueleto, Etiqueta, Interruptor, Modal, Semaforo, useAvisos,
} from "@/components/ui";
import { CHAVES, useConsulta, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { intervalo, moeda, numero, percentual } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Projeto } from "@/lib/types";
import {
  AlertTriangle, ArrowLeft, Award, CalendarRange, FolderKanban, GitCompare, Layers, ListChecks, Pencil,
  RefreshCw, Target, Trash2, TrendingUp, Wallet,
} from "lucide-react";

import {
  ABAS, PainelComparacaoBaseline, PainelEditarProjeto, ROTULOS_STATUS_PROJETO, type Aba,
  type FormEdicaoProjeto,
} from "./projeto/comum";
import { AbaDashboard } from "./projeto/AbaDashboard";
import { AbaGantt } from "./projeto/AbaGantt";
import { AbaKanban } from "./projeto/AbaKanban";
import { AbaLista } from "./projeto/AbaLista";
import { AbaCalendario } from "./projeto/AbaCalendario";
import { AbaTimeline } from "./projeto/AbaTimeline";
import { AbaRiscos } from "./projeto/AbaRiscos";
import { AbaFinanceiro } from "./projeto/AbaFinanceiro";
import { AbaEquipe } from "./projeto/AbaEquipe";
import { AbaCapacidades } from "./projeto/AbaCapacidades";
import { AbaAtividade } from "./projeto/AbaAtividade";
import { AbaAnexos } from "./projeto/AbaAnexos";

export default function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const projetoId = Number(id);
  const navegar = useNavigate();
  const { erro: avisarErro } = useAvisos();
  const { pode } = useAuth();
  const [params, setParams] = useSearchParams();

  const abaParametro = params.get("aba") || "dashboard";
  const aba = (ABAS.some((item) => item.valor === abaParametro) ? abaParametro : "dashboard") as Aba;

  const definirAba = (valor: Aba) => {
    const proximo = new URLSearchParams(params);
    proximo.set("aba", valor);
    setParams(proximo, { replace: true });
  };

  const { data: projeto, isLoading, isError, error } = useConsulta<Projeto>(
    CHAVES.projeto(projetoId),
    id ? "/projetos/" + projetoId + "/" : null
  );

  const { data: catalogo } = useConsulta<{ gerentes: Array<{ id: number; nome: string; cor: string; iniciais: string }> }>(
    ["projetos", "catalogo"],
    "/projetos/assistente/catalogo/"
  );

  const [modalBaseline, setModalBaseline] = useState(false);
  const [painelBaseline, setPainelBaseline] = useState(false);
  const [formBaseline, setFormBaseline] = useState({ nome: "", descricao: "" });
  const [modalEncerrar, setModalEncerrar] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [codigoConfirmacao, setCodigoConfirmacao] = useState("");
  const [licoes, setLicoes] = useState("");
  const [arquivar, setArquivar] = useState(false);
  const [painelEditar, setPainelEditar] = useState(false);
  const [formEditar, setFormEditar] = useState<FormEdicaoProjeto>({
    nome: "",
    descricao: "",
    objetivo: "",
    status: "PLANEJADO",
    prioridade: "MEDIA",
    criticidade: "MEDIA",
    manager: "",
    sponsor: "",
    data_inicio: "",
    data_fim: "",
    orcamento: "0",
  });

  useEffect(() => {
    if (!projeto) return;
    setFormEditar({
      nome: projeto.nome,
      descricao: projeto.descricao || "",
      objetivo: projeto.objetivo || "",
      status: projeto.status,
      prioridade: projeto.prioridade,
      criticidade: projeto.criticidade,
      manager: projeto.manager ? String(projeto.manager) : "",
      sponsor: projeto.sponsor ? String(projeto.sponsor) : "",
      data_inicio: projeto.data_inicio || "",
      data_fim: projeto.data_fim || "",
      orcamento: String(projeto.orcamento || "0"),
    });
    setLicoes(projeto.licoes_aprendidas || "");
  }, [projeto]);

  const invalidarProjeto = [
    CHAVES.projeto(projetoId),
    CHAVES.dashboardProjeto(projetoId),
    CHAVES.cronograma(projetoId),
    CHAVES.projetos,
    CHAVES.projetosCards,
    CHAVES.projetosTimeline,
  ];

  const recalcular = useMutacao<void, unknown>({
    url: "/projetos/" + projetoId + "/recalcular/",
    invalidar: invalidarProjeto,
    mensagemSucesso: "Cronograma e progresso recalculados",
  });

  const criarBaseline = useMutacao<{ nome: string; descricao: string }, unknown>({
    url: "/projetos/" + projetoId + "/criar-baseline/",
    invalidar: [CHAVES.cronograma(projetoId)],
    mensagemSucesso: "Baseline criada para comparação",
  });

  const encerrar = useMutacao<{ licoes_aprendidas: string; arquivar: boolean }, Projeto>({
    url: "/projetos/" + projetoId + "/encerrar/",
    invalidar: invalidarProjeto,
    mensagemSucesso: "Projeto encerrado com lições aprendidas",
  });

  const excluirProjeto = useMutacao<void, unknown>({
    metodo: "delete",
    url: "/projetos/" + projetoId + "/",
    invalidar: [CHAVES.projetos, CHAVES.projetosCards, CHAVES.projetosTimeline],
    mensagemSucesso: "Projeto excluído",
    aoSucesso: () => {
      setModalExcluir(false);
      navegar("/projetos");
    },
  });

  const salvarEdicao = useMutacao<Record<string, unknown> & { id: number }, Projeto>({
    metodo: "patch",
    url: (valores) => "/projetos/" + valores.id + "/",
    invalidar: invalidarProjeto,
    mensagemSucesso: "Projeto atualizado",
  });

  const abrirEdicao = () => {
    if (!projeto) return;
    setFormEditar({
      nome: projeto.nome,
      descricao: projeto.descricao || "",
      objetivo: projeto.objetivo || "",
      status: projeto.status,
      prioridade: projeto.prioridade,
      criticidade: projeto.criticidade,
      manager: projeto.manager ? String(projeto.manager) : "",
      sponsor: projeto.sponsor ? String(projeto.sponsor) : "",
      data_inicio: projeto.data_inicio || "",
      data_fim: projeto.data_fim || "",
      orcamento: String(projeto.orcamento || "0"),
    });
    setPainelEditar(true);
  };

  const confirmarEdicao = async () => {
    if (!formEditar.nome.trim()) {
      avisarErro("Informe o nome do projeto", "O nome é obrigatório.");
      return;
    }
    if (formEditar.data_inicio && formEditar.data_fim && formEditar.data_fim < formEditar.data_inicio) {
      avisarErro("Datas inconsistentes", "A data final não pode ser anterior à inicial.");
      return;
    }
    try {
      await salvarEdicao.mutateAsync({
        id: projetoId,
        nome: formEditar.nome.trim(),
        descricao: formEditar.descricao,
        objetivo: formEditar.objetivo,
        status: formEditar.status,
        prioridade: formEditar.prioridade,
        criticidade: formEditar.criticidade,
        manager: formEditar.manager ? Number(formEditar.manager) : null,
        sponsor: formEditar.sponsor ? Number(formEditar.sponsor) : null,
        data_inicio: formEditar.data_inicio || null,
        data_fim: formEditar.data_fim || null,
        orcamento: Number(formEditar.orcamento) || 0,
      });
      setPainelEditar(false);
    } catch (falha) {
      avisarErro("Não foi possível salvar", mensagemErro(falha));
    }
  };

  const confirmarEncerramento = async () => {
    try {
      await encerrar.mutateAsync({ licoes_aprendidas: licoes, arquivar });
      setModalEncerrar(false);
    } catch (falha) {
      avisarErro("Não foi possível encerrar", mensagemErro(falha));
    }
  };

  const confirmarExclusao = async () => {
    try {
      await excluirProjeto.mutateAsync();
      setCodigoConfirmacao("");
    } catch (falha) {
      avisarErro("Não foi possível excluir o projeto", mensagemErro(falha));
    }
  };

  const confirmarBaseline = async () => {
    try {
      await criarBaseline.mutateAsync({ nome: formBaseline.nome, descricao: formBaseline.descricao });
      setModalBaseline(false);
      setFormBaseline({ nome: "", descricao: "" });
    } catch (falha) {
      avisarErro("Não foi possível criar a baseline", mensagemErro(falha));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Esqueleto linhas={4} />
        <CarregandoBloco rotulo="Carregando projeto..." />
      </div>
    );
  }

  if (isError || !projeto) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina
          titulo="Projeto"
          icone={FolderKanban}
          cor="#2563EB"
          migalhas={[{ rotulo: "Projetos", onClick: () => navegar("/projetos") }, { rotulo: "Detalhe" }]}
        />
        <Alerta tom="danger" titulo="Não foi possível carregar o projeto">
          {mensagemErro(error)}
        </Alerta>
        <Botao variante="secundario" icone={ArrowLeft} onClick={() => navegar("/projetos")}>
          Voltar para projetos
        </Botao>
      </div>
    );
  }

  const gerente = projeto.manager_detalhe;
  const patrocinador = projeto.sponsor_detalhe;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo={projeto.nome}
        icone={FolderKanban}
        cor={projeto.cor}
        migalhas={[{ rotulo: "Projetos", onClick: () => navegar("/projetos") }, { rotulo: projeto.codigo || "Projeto" }]}
        acoes={
          <>
            <Botao variante="secundario" icone={RefreshCw} onClick={() => recalcular.mutate()} carregando={recalcular.isPending}>
              Recalcular
            </Botao>
            {pode("projeto.editar") && (
              <Botao variante="secundario" icone={Target} onClick={() => setModalBaseline(true)}>
                Criar baseline
              </Botao>
            )}
            <Botao variante="secundario" icone={GitCompare} onClick={() => setPainelBaseline(true)}>
              Comparar baseline
            </Botao>
            <Botao variante="secundario" icone={Award} onClick={() => setModalEncerrar(true)}>
              Encerrar
            </Botao>
            <Botao variante="primario" icone={Pencil} onClick={abrirEdicao}>
              Editar
            </Botao>
            {pode("projeto.excluir") && (
              <Botao
                variante="perigo"
                icone={Trash2}
                onClick={() => {
                  setCodigoConfirmacao("");
                  setModalExcluir(true);
                }}
              >
                Excluir
              </Botao>
            )}
          </>
        }
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-fg-muted">{projeto.codigo}</span>
            <Semaforo saude={projeto.saude} tamanho="sm" />
            <Etiqueta tom="neutral">{ROTULOS_STATUS_PROJETO[projeto.status] || projeto.status}</Etiqueta>
            <Etiqueta tom={CORES_PRIORIDADE[projeto.prioridade] || "neutral"}>{projeto.prioridade_rotulo || projeto.prioridade}</Etiqueta>
            {projeto.atrasado && (
              <Etiqueta tom="danger" icone={AlertTriangle}>
                Atrasado
              </Etiqueta>
            )}
            {projeto.program_nome && <Etiqueta tom="info" icone={Layers}>{projeto.program_nome}</Etiqueta>}
          </span>
        }
        filhos={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sgp-lg border border-border bg-surface px-3 py-2 text-2xs text-fg-muted shadow-n1">
            <span className="inline-flex items-center gap-1.5">
              {gerente ? (
                <>
                  <Avatar nome={gerente.nome} cor={gerente.cor} iniciais={gerente.iniciais} url={gerente.avatar_display} tamanho="xs" />
                  <span className="text-fg">Gerente:</span> {gerente.nome}
                </>
              ) : (
                <span>Sem gerente designado</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              {patrocinador ? (
                <>
                  <Avatar nome={patrocinador.nome} cor={patrocinador.cor} iniciais={patrocinador.iniciais} url={patrocinador.avatar_display} tamanho="xs" />
                  <span className="text-fg">Patrocinador:</span> {patrocinador.nome}
                </>
              ) : (
                <span>Sem patrocinador</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="size-3.5" aria-hidden />
              {intervalo(projeto.data_inicio, projeto.data_fim)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="size-3.5" aria-hidden />
              Orçamento: <span className="font-semibold tabular-nums text-fg">{moeda(projeto.orcamento, true)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="size-3.5" aria-hidden />
              Realizado: <span className="font-semibold tabular-nums text-fg">{moeda(projeto.custo_real, true)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="size-3.5" aria-hidden />
              {numero(projeto.total_tarefas)} tarefa(s) · {numero(projeto.total_marcos)} marco(s)
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <BarraProgresso valor={projeto.percentual_conclusao} comparativo={projeto.progresso_planejado} altura="sm" />
              <span className="w-24 text-right text-2xs font-semibold tabular-nums text-fg">
                {percentual(projeto.percentual_conclusao, 0)} / {percentual(projeto.progresso_planejado, 0)}
              </span>
            </span>
          </div>
        }
      />

      <Abas<Aba> valor={aba} onChange={definirAba} abas={ABAS} />

      {aba === "dashboard" && <AbaDashboard projetoId={projetoId} projeto={projeto} />}
      {aba === "gantt" && <AbaGantt projetoId={projetoId} />}
      {aba === "kanban" && <AbaKanban projetoId={projetoId} />}
      {aba === "lista" && <AbaLista projetoId={projetoId} />}
      {aba === "calendario" && <AbaCalendario projetoId={projetoId} />}
      {aba === "timeline" && <AbaTimeline projetoId={projetoId} />}
      {aba === "riscos" && <AbaRiscos projetoId={projetoId} />}
      {aba === "financeiro" && <AbaFinanceiro projetoId={projetoId} projeto={projeto} />}
      {aba === "equipe" && <AbaEquipe projetoId={projetoId} projeto={projeto} />}
      {aba === "capacidades" && <AbaCapacidades projetoId={projetoId} podeVerSkills={pode("capacidade.ver")} />}
      {aba === "atividade" && <AbaAtividade projetoId={projetoId} />}
      {aba === "anexos" && <AbaAnexos projetoId={projetoId} />}

      <Modal
        aberto={modalBaseline}
        onFechar={() => setModalBaseline(false)}
        titulo="Criar baseline"
        subtitulo="Congela datas, esforço e orçamento para comparar planejado × realizado."
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalBaseline(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Target} onClick={confirmarBaseline} carregando={criarBaseline.isPending}>
              Criar baseline
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome da baseline" dica="Se vazio, o sistema nomeia com a data atual." htmlFor="baseline-nome">
            <Entrada
              id="baseline-nome"
              value={formBaseline.nome}
              onChange={(evento) => setFormBaseline({ ...formBaseline, nome: evento.target.value })}
              placeholder="Ex.: Baseline aprovada em comitê"
            />
          </Campo>
          <Campo rotulo="Descrição" htmlFor="baseline-descricao">
            <AreaTexto
              id="baseline-descricao"
              rows={3}
              value={formBaseline.descricao}
              onChange={(evento) => setFormBaseline({ ...formBaseline, descricao: evento.target.value })}
            />
          </Campo>
          <Alerta tom="info" titulo="O que é registrado">
            Snapshot das tarefas (datas, esforço e progresso), orçamento e período do projeto.
          </Alerta>
        </div>
      </Modal>

      <Modal
        aberto={modalEncerrar}
        onFechar={() => setModalEncerrar(false)}
        titulo="Encerrar projeto"
        subtitulo="O status passa para Concluído e a data real de término é registrada."
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalEncerrar(false)}>
              Cancelar
            </Botao>
            <Botao variante="sucesso" icone={Award} onClick={confirmarEncerramento} carregando={encerrar.isPending}>
              Encerrar projeto
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Lições aprendidas" dica="O que funcionou, o que não funcionou e recomendações." htmlFor="licoes">
            <AreaTexto id="licoes" rows={6} value={licoes} onChange={(evento) => setLicoes(evento.target.value)} />
          </Campo>
          <Interruptor
            ativo={arquivar}
            onChange={setArquivar}
            rotulo="Arquivar após encerrar"
            descricao="Remove o projeto das listas e timelines ativas."
          />
          <Alerta tom="warning" titulo="Ação irreversível pela interface">
            O encerramento grava 100% de progresso e notifica gerente e patrocinador.
          </Alerta>
        </div>
      </Modal>

      <Modal
        aberto={modalExcluir}
        onFechar={() => setModalExcluir(false)}
        titulo="Excluir projeto"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalExcluir(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              disabled={codigoConfirmacao.trim() !== projeto.codigo}
              carregando={excluirProjeto.isPending}
              onClick={confirmarExclusao}
            >
              Excluir projeto
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <Alerta tom="danger" titulo="Exclusão definitiva" icone={AlertTriangle}>
            Tarefas, riscos, marcos, alocações, orçamento e lançamentos do projeto são removidos junto com ele. A
            exclusão fica registrada na auditoria, mas não há como recuperar os dados.
          </Alerta>
          <Campo
            rotulo={"Digite o código " + projeto.codigo + " para confirmar"}
            dica="A digitação do código evita exclusões acidentais."
            htmlFor="excluir-codigo"
          >
            <Entrada
              id="excluir-codigo"
              value={codigoConfirmacao}
              onChange={(evento) => setCodigoConfirmacao(evento.target.value)}
              placeholder={projeto.codigo}
              autoComplete="off"
              autoFocus
            />
          </Campo>
          <p className="text-xs text-fg-muted">
            {projeto.nome} · {numero(projeto.total_tarefas)} tarefa(s) · {numero(projeto.total_marcos)} marco(s) ·{" "}
            {numero(projeto.total_riscos)} risco(s)
          </p>
        </div>
      </Modal>

      <PainelEditarProjeto
        aberto={painelEditar}
        onFechar={() => setPainelEditar(false)}
        projeto={projeto}
        formEditar={formEditar}
        setFormEditar={setFormEditar}
        gerentes={catalogo?.gerentes ?? []}
        aoSalvar={confirmarEdicao}
        salvando={salvarEdicao.isPending}
      />

      <PainelComparacaoBaseline
        projetoId={projetoId}
        aberto={painelBaseline}
        onFechar={() => setPainelBaseline(false)}
        podeCriarBaseline={pode("projeto.editar")}
        aoCriarBaseline={() => {
          setPainelBaseline(false);
          setModalBaseline(true);
        }}
      />
    </div>
  );
}

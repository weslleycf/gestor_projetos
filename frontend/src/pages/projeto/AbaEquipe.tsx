import { useState } from "react";
import {
  Alerta, Avatar, BarraProgresso, Botao, Campo, CarregandoBloco, ControleDeslizante, Entrada, Etiqueta,
  PainelLateral, Selecao, Vazio, useAvisos,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, diasEntre, hojeISO, moeda, numero, percentual, somarDias } from "@/lib/format";
import { soma } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import type { Alocacao, ConflitoAlocacao, Projeto, Tarefa } from "@/lib/types";
import {
  AlertTriangle, CalendarRange, Check, Gauge, Pencil, Save, Trash2, UserPlus, Users, Wallet,
} from "lucide-react";

/* ==========================================================================
   Aba Equipe — alocacoes, conflitos e motor de matching embutido (RF-14/16)
   ========================================================================== */

const OPCOES_STATUS_ALOCACAO: Array<{ valor: string; rotulo: string }> = [
  { valor: "PROPOSTA", rotulo: "Proposta" },
  { valor: "CONFIRMADA", rotulo: "Confirmada" },
  { valor: "EM_EXECUCAO", rotulo: "Em execução" },
  { valor: "CONCLUIDA", rotulo: "Concluída" },
  { valor: "CANCELADA", rotulo: "Cancelada" },
];

export function AbaEquipe({ projetoId, projeto }: { projetoId: number; projeto: Projeto }) {
  const { erro: avisarErro } = useAvisos();
  const { pode } = useAuth();
  const podeEditarAlocacao = pode("alocacao.editar");
  const [painelAlocar, setPainelAlocar] = useState(false);
  const [modo, setModo] = useState("PERFORMANCE");
  const [tarefaEscolhida, setTarefaEscolhida] = useState("");
  const [percentual, setPercentual] = useState(100);
  const [alocacaoEmEdicao, setAlocacaoEmEdicao] = useState<Alocacao | null>(null);
  const [formAlocacao, setFormAlocacao] = useState({
    percentual: 100,
    data_inicio: "",
    data_fim: "",
    papel: "",
    status: "CONFIRMADA",
  });
  const [erroAlocacao, setErroAlocacao] = useState("");

  const alocacoes = useLista<Alocacao>(CHAVES.alocacoes, "/alocacoes/", { project: projetoId });
  const conflitos = useConsulta<{ conflitos: ConflitoAlocacao[]; total: number; criticos: number }>(
    CHAVES.conflitos,
    "/alocacoes/conflitos/",
    { project: projetoId }
  );
  const tarefas = useLista<Tarefa>(CHAVES.tarefas, "/tarefas/", { project: projetoId });

  const matching = useConsulta<import("@/lib/types").ResultadoMatching>(
    ["matching", "equipe", projetoId, modo],
    painelAlocar ? "/capacidades/matching/" : null,
    { project: projetoId, modo, limite: 8 },
    { enabled: painelAlocar }
  );

  const invalidarAlocacoes = [CHAVES.alocacoes, CHAVES.conflitos, CHAVES.dashboardProjeto(projetoId), CHAVES.projetosCards];

  const atribuir = useMutacao<Record<string, unknown>, Alocacao>({
    url: "/alocacoes/atribuir/",
    invalidar: invalidarAlocacoes,
    mensagemSucesso: "Pessoa alocada na tarefa",
  });

  const alocarProjeto = useMutacao<Record<string, unknown>, Alocacao>({
    url: "/alocacoes/",
    invalidar: invalidarAlocacoes,
    mensagemSucesso: "Alocação criada no projeto",
  });

  const confirmarAlocacao = useMutacao<{ id: number }, Alocacao>({
    url: (valores) => "/alocacoes/" + valores.id + "/confirmar/",
    invalidar: invalidarAlocacoes,
    mensagemSucesso: "Alocação confirmada",
  });

  const removerAlocacao = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (valores) => "/alocacoes/" + valores.id + "/",
    invalidar: invalidarAlocacoes,
    mensagemSucesso: "Alocação removida",
  });

  const editarAlocacao = useMutacao<Record<string, unknown> & { id: number }, Alocacao>({
    metodo: "patch",
    url: (valores) => "/alocacoes/" + valores.id + "/",
    invalidar: invalidarAlocacoes,
    mensagemSucesso: "Alocação atualizada",
  });

  const abrirEdicaoAlocacao = (alocacao: Alocacao) => {
    setAlocacaoEmEdicao(alocacao);
    setFormAlocacao({
      percentual: alocacao.percentual,
      data_inicio: alocacao.data_inicio,
      data_fim: alocacao.data_fim,
      papel: alocacao.papel || "",
      status: alocacao.status,
    });
    setErroAlocacao("");
  };

  const salvarAlocacao = async () => {
    if (!alocacaoEmEdicao) return;
    setErroAlocacao("");
    if (!formAlocacao.data_inicio || !formAlocacao.data_fim) {
      setErroAlocacao("Informe o período da alocação.");
      return;
    }
    if (diasEntre(formAlocacao.data_inicio, formAlocacao.data_fim) < 0) {
      setErroAlocacao("A data final não pode ser anterior à inicial.");
      return;
    }
    try {
      await editarAlocacao.mutateAsync({
        id: alocacaoEmEdicao.id,
        percentual: Math.max(1, Math.min(100, Number(formAlocacao.percentual) || 100)),
        data_inicio: formAlocacao.data_inicio,
        data_fim: formAlocacao.data_fim,
        papel: formAlocacao.papel,
        status: formAlocacao.status,
      });
      setAlocacaoEmEdicao(null);
    } catch (falha) {
      setErroAlocacao(mensagemErro(falha));
    }
  };

  const lista = alocacoes.data ?? [];
  const custoTotal = soma(lista.map((item) => Number(item.custo_estimado) || 0));

  const alocar = async (pessoa: { user_id: number; nome: string; score: number }) => {
    try {
      if (tarefaEscolhida) {
        await atribuir.mutateAsync({
          task: Number(tarefaEscolhida),
          user: pessoa.user_id,
          percentual,
          data_inicio: projeto.data_inicio || hojeISO(),
          data_fim: projeto.data_fim || somarDias(hojeISO(), 30),
          modalidade: modo,
          papel: "",
          justificativa: "Selecionado pelo motor de matching na aba Equipe.",
          score_matching: pessoa.score,
        });
      } else {
        await alocarProjeto.mutateAsync({
          project: projetoId,
          user: pessoa.user_id,
          percentual,
          data_inicio: projeto.data_inicio || hojeISO(),
          data_fim: projeto.data_fim || somarDias(hojeISO(), 30),
          status: "CONFIRMADA",
          modalidade: modo,
          papel: "",
          justificativa: "Selecionado pelo motor de matching na aba Equipe.",
          score_matching: pessoa.score,
        });
      }
    } catch (falha) {
      avisarErro("Não foi possível alocar", mensagemErro(falha));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-fg">
          <Users className="size-3.5" aria-hidden />
          {numero(lista.length)} alocação(ões) · custo estimado {moeda(custoTotal)}
        </span>
        {(conflitos.data?.total || 0) > 0 && (
          <Etiqueta tom={conflitos.data?.criticos ? "danger" : "warning"} icone={AlertTriangle}>
            {numero(conflitos.data?.total || 0)} conflito(s) · {numero(conflitos.data?.criticos || 0)} crítico(s)
          </Etiqueta>
        )}
        <Botao variante="primario" icone={UserPlus} tamanho="sm" className="ml-auto" onClick={() => setPainelAlocar(true)}>
          Alocar pessoa
        </Botao>
      </div>

      {(conflitos.data?.conflitos ?? []).length > 0 && (
        <Alerta tom="warning" titulo="Conflitos de alocação detectados">
          <ul className="space-y-1">
            {(conflitos.data?.conflitos ?? []).slice(0, 5).map((conflito, posicao) => (
              <li key={String(conflito.user_id) + "-" + String(posicao)}>
                {conflito.user_nome} · {numero(conflito.total_percentual)}% na semana de {dataCurta(conflito.semana)} (excesso de{" "}
                {numero(conflito.excesso)}%)
              </li>
            ))}
          </ul>
        </Alerta>
      )}

      {alocacoes.isLoading ? (
        <CarregandoBloco rotulo="Carregando alocações..." />
      ) : lista.length === 0 ? (
        <Vazio
          icone={Users}
          titulo="Nenhuma pessoa alocada"
          descricao="Use o motor de matching para sugerir as pessoas com maior aderência ao projeto."
          acao={
            <Botao variante="primario" icone={UserPlus} onClick={() => setPainelAlocar(true)}>
              Alocar pessoa
            </Botao>
          }
        />
      ) : (
        <GradeCards colunas={3}>
          {lista.map((alocacao) => (
            <div key={alocacao.id} className="flex flex-col gap-2 rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
              <div className="flex items-start gap-2.5">
                {alocacao.user_detalhe ? (
                  <Avatar
                    nome={alocacao.user_detalhe.nome}
                    cor={alocacao.user_detalhe.cor}
                    iniciais={alocacao.user_detalhe.iniciais}
                    url={alocacao.user_detalhe.avatar_display}
                    tamanho="md"
                  />
                ) : (
                  <Avatar nome={alocacao.recurso_nome || "Recurso"} cor={alocacao.recurso_cor || "#EC4899"} iniciais="RC" tamanho="md" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">
                    {alocacao.user_detalhe?.nome || alocacao.recurso_nome || "Recurso"}
                  </p>
                  <p className="truncate text-2xs text-fg-muted">
                    {alocacao.papel || alocacao.modalidade_rotulo || alocacao.modalidade}
                  </p>
                </div>
                <Etiqueta tom={alocacao.status === "PROPOSTA" ? "warning" : alocacao.status === "CONFIRMADA" ? "success" : "neutral"}>
                  {alocacao.status_rotulo || alocacao.status}
                </Etiqueta>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-fg-muted">
                <span className="inline-flex items-center gap-1">
                  <Gauge className="size-3" aria-hidden />
                  {numero(alocacao.percentual)}% de dedicação
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarRange className="size-3" aria-hidden />
                  {dataCurta(alocacao.data_inicio)} → {dataCurta(alocacao.data_fim)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wallet className="size-3" aria-hidden />
                  {moeda(alocacao.custo_estimado, true)}
                </span>
              </div>
              {alocacao.task_nome && <p className="truncate text-2xs text-fg-subtle">Tarefa: {alocacao.task_nome}</p>}
              {alocacao.score_matching !== null && alocacao.score_matching !== undefined && (
                <BarraProgresso
                  valor={alocacao.score_matching <= 1 ? alocacao.score_matching * 100 : alocacao.score_matching}
                  altura="sm"
                  rotulo="Score do motor de alocação"
                  mostrarValor
                  cor="#8B5CF6"
                />
              )}
              <div className="mt-auto flex items-center gap-1.5 border-t border-border pt-2">
                {alocacao.status === "PROPOSTA" && (
                  <Botao
                    tamanho="xs"
                    variante="sucesso"
                    icone={Check}
                    onClick={() => confirmarAlocacao.mutate({ id: alocacao.id })}
                    carregando={confirmarAlocacao.isPending}
                  >
                    Confirmar
                  </Botao>
                )}
                {podeEditarAlocacao && (
                  <Botao
                    tamanho="xs"
                    variante="secundario"
                    icone={Pencil}
                    onClick={() => abrirEdicaoAlocacao(alocacao)}
                  >
                    Editar
                  </Botao>
                )}
                <Botao
                  tamanho="xs"
                  variante="fantasma"
                  icone={Trash2}
                  className="ml-auto text-danger"
                  onClick={() => removerAlocacao.mutate({ id: alocacao.id })}
                  carregando={removerAlocacao.isPending}
                >
                  Remover
                </Botao>
              </div>
            </div>
          ))}
        </GradeCards>
      )}

      <PainelLateral
        aberto={painelAlocar}
        onFechar={() => setPainelAlocar(false)}
        titulo="Alocar pessoa"
        subtitulo="Motor de matching com lista ranqueada por aderência ao projeto."
        largura="xl"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-sgp border border-border bg-surface-2 p-3">
            <label className="flex flex-col gap-1 text-2xs font-medium text-fg-muted">
              Modo de alocação
              <Selecao value={modo} onChange={(evento) => setModo(evento.target.value)} aria-label="Modo de alocação">
                <option value="PERFORMANCE">Performance imediata</option>
                <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                <option value="MISTA">Mista</option>
              </Selecao>
            </label>
            <label className="flex min-w-52 flex-1 flex-col gap-1 text-2xs font-medium text-fg-muted">
              Tarefa (opcional)
              <Selecao value={tarefaEscolhida} onChange={(evento) => setTarefaEscolhida(evento.target.value)} aria-label="Tarefa">
                <option value="">Alocação no projeto (sem tarefa específica)</option>
                {(tarefas.data ?? []).map((tarefa) => (
                  <option key={tarefa.id} value={String(tarefa.id)}>
                    {tarefa.nome}
                  </option>
                ))}
              </Selecao>
            </label>
            <div className="w-40">
              <ControleDeslizante
                valor={percentual}
                onChange={setPercentual}
                min={10}
                max={100}
                passo={10}
                rotulo="Dedicação"
                marcos={[50, 100]}
              />
            </div>
          </div>

          {matching.isLoading && <CarregandoBloco rotulo="Executando o motor de matching..." />}
          {matching.isError && (
            <Alerta tom="danger" titulo="Não foi possível executar o motor de matching">
              {mensagemErro(matching.error)}
            </Alerta>
          )}
          {matching.data && (
            <>
              <p className="text-2xs text-fg-muted">
                {numero(matching.data.total_avaliados)} pessoa(s) avaliada(s) · {numero(matching.data.requisitos.length)}{" "}
                requisito(s) considerados · modo {matching.data.modo_descricao || matching.data.modo}
              </p>
              <ul className="space-y-2">
                {matching.data.recomendacoes.map((pessoa) => {
                  const score = pessoa.score <= 1 ? pessoa.score * 100 : pessoa.score;
                  return (
                    <li key={pessoa.user_id} className="rounded-sgp border border-border bg-surface p-3 shadow-n1">
                      <div className="flex items-start gap-3">
                        <Avatar nome={pessoa.nome} cor={pessoa.cor} iniciais={pessoa.iniciais} tamanho="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg">
                            #{pessoa.posicao} {pessoa.nome}
                          </p>
                          <p className="truncate text-2xs text-fg-muted">
                            {pessoa.cargo || pessoa.perfil} · {pessoa.area} · {pessoa.justificativa?.disponibilidade || "disponibilidade não informada"}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(pessoa.justificativa?.skills_atendidas ?? []).slice(0, 4).map((skill) => (
                              <Etiqueta key={skill.skill_id} cor={skill.cor || "#059669"} icone={Check}>
                                {skill.skill}
                              </Etiqueta>
                            ))}
                            {(pessoa.justificativa?.gaps ?? []).slice(0, 3).map((gap) => (
                              <Etiqueta key={gap.skill_id} tom="warning" icone={AlertTriangle}>
                                {gap.skill} N{gap.atual}/{gap.requerido}
                              </Etiqueta>
                            ))}
                          </div>
                        </div>
                        <div className="w-32 shrink-0 space-y-1">
                          <BarraProgresso valor={score} altura="sm" rotulo="Score" mostrarValor cor="#8B5CF6" />
                          <p className="text-right text-2xs text-fg-muted">
                            {pessoa.justificativa?.custo_estimado_reais ? moeda(pessoa.justificativa.custo_estimado_reais, true) : "custo não informado"}
                          </p>
                          <Botao
                            tamanho="xs"
                            variante="primario"
                            icone={UserPlus}
                            larguraTotal
                            carregando={atribuir.isPending || alocarProjeto.isPending}
                            onClick={() => alocar({ user_id: pessoa.user_id, nome: pessoa.nome, score: pessoa.score })}
                          >
                            Alocar
                          </Botao>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </PainelLateral>

      <PainelLateral
        aberto={alocacaoEmEdicao !== null}
        onFechar={() => setAlocacaoEmEdicao(null)}
        titulo="Editar alocação"
        subtitulo={
          alocacaoEmEdicao
            ? (alocacaoEmEdicao.user_detalhe?.nome || alocacaoEmEdicao.recurso_nome || "Recurso") +
              " · " +
              (alocacaoEmEdicao.task_nome || alocacaoEmEdicao.project_nome)
            : undefined
        }
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setAlocacaoEmEdicao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Save}
              carregando={editarAlocacao.isPending}
              onClick={salvarAlocacao}
            >
              Salvar alterações
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          {erroAlocacao && (
            <Alerta tom="danger" titulo="Não foi possível salvar">
              {erroAlocacao}
            </Alerta>
          )}
          {alocacaoEmEdicao && (
            <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
              {alocacaoEmEdicao.user_detalhe ? (
                <Avatar
                  nome={alocacaoEmEdicao.user_detalhe.nome}
                  cor={alocacaoEmEdicao.user_detalhe.cor}
                  iniciais={alocacaoEmEdicao.user_detalhe.iniciais}
                  url={alocacaoEmEdicao.user_detalhe.avatar_display}
                  tamanho="md"
                />
              ) : (
                <Avatar
                  nome={alocacaoEmEdicao.recurso_nome || "Recurso"}
                  cor={alocacaoEmEdicao.recurso_cor || "#EC4899"}
                  iniciais="RC"
                  tamanho="md"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">
                  {alocacaoEmEdicao.user_detalhe?.nome || alocacaoEmEdicao.recurso_nome || "Recurso"}
                </p>
                <p className="truncate text-2xs text-fg-muted">
                  {alocacaoEmEdicao.project_nome}
                  {alocacaoEmEdicao.task_nome ? " · " + alocacaoEmEdicao.task_nome : ""}
                </p>
              </div>
              <Etiqueta tom="neutral">{numero(alocacaoEmEdicao.horas)} h</Etiqueta>
            </div>
          )}
          <ControleDeslizante
            valor={formAlocacao.percentual}
            onChange={(valor) => setFormAlocacao({ ...formAlocacao, percentual: valor })}
            min={1}
            max={100}
            rotulo="Percentual de dedicação"
            sufixo="%"
            marcos={[25, 50, 75, 100]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Início" obrigatorio htmlFor="equipe-alocacao-inicio">
              <Entrada
                id="equipe-alocacao-inicio"
                type="date"
                value={formAlocacao.data_inicio}
                onChange={(evento) => setFormAlocacao({ ...formAlocacao, data_inicio: evento.target.value })}
              />
            </Campo>
            <Campo rotulo="Fim" obrigatorio htmlFor="equipe-alocacao-fim">
              <Entrada
                id="equipe-alocacao-fim"
                type="date"
                value={formAlocacao.data_fim}
                onChange={(evento) => setFormAlocacao({ ...formAlocacao, data_fim: evento.target.value })}
              />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Papel no projeto" htmlFor="equipe-alocacao-papel">
              <Entrada
                id="equipe-alocacao-papel"
                value={formAlocacao.papel}
                placeholder="Ex.: Tech Lead"
                onChange={(evento) => setFormAlocacao({ ...formAlocacao, papel: evento.target.value })}
              />
            </Campo>
            <Campo rotulo="Status" htmlFor="equipe-alocacao-status">
              <Selecao
                id="equipe-alocacao-status"
                value={formAlocacao.status}
                onChange={(evento) => setFormAlocacao({ ...formAlocacao, status: evento.target.value })}
              >
                {OPCOES_STATUS_ALOCACAO.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>
          <Alerta tom="info" titulo="Edição da alocação">
            Dedicação, período, papel e status são gravados na alocação. Para trocar a pessoa ou o recurso
            material, exclua a alocação e crie outra na tela de Alocação.
          </Alerta>
        </div>
      </PainelLateral>
    </div>
  );
}

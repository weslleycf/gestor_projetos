import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  CircleHelp,
  Copy,
  History,
  Info,
  Link2,
  MessageSquare,
  Plug,
  Plus,
  RefreshCw,
  Server,
  Sparkles,
  SquarePen,
  Trash2,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import {
  Alerta,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  CarregandoBloco,
  Esqueleto,
  Etiqueta,
  GradeCards,
  Modal,
  SecaoColapsavel,
  Vazio,
  useAvisos,
} from "@/components/ui";
import { ConversaAssistente } from "@/components/assistente";
import { useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataRelativa } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  agruparPorCategoria,
  CHAVES_IA,
  contarMensagens,
  enderecoMcp,
  enderecoMcpCompleto,
  normalizarTransportes,
  rotuloProvedor,
  type ConfiguracaoIA,
  type ConversaIA,
  type RespostaFerramentas,
} from "@/lib/assistente";

/* ==========================================================================
   Assistente de IA — tela cheia
   --------------------------------------------------------------------------
   Reúne o que o painel lateral mostra em pouco espaço: o histórico de conversas
   à esquerda, a conversa ativa à direita e, abaixo, o que o assistente sabe
   responder e como as mesmas consultas ficam disponíveis para assistentes
   externos compatíveis com MCP.
   ========================================================================== */

const ROTULO_TRANSPORTE: Record<string, string> = {
  stdio: "programa local (stdio)",
  http: "HTTP",
  sse: "eventos (SSE)",
  websocket: "WebSocket",
};

function rotuloTransporte(valor: string): string {
  return ROTULO_TRANSPORTE[valor] ?? valor;
}

export default function Assistente() {
  const navegar = useNavigate();
  const { sucesso, erro: avisarErro } = useAvisos();
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [sessao, setSessao] = useState(0);
  const [confirmacao, setConfirmacao] = useState<ConversaIA | null>(null);
  const [copiado, setCopiado] = useState(false);

  const conversas = useLista<ConversaIA>(CHAVES_IA.conversas, "/ia/conversas/");
  const lista = conversas.data ?? [];

  const ferramentas = useConsulta<RespostaFerramentas>(CHAVES_IA.ferramentas, "/ia/ferramentas/");
  const configuracao = useConsulta<ConfiguracaoIA>(CHAVES_IA.configuracao, "/ia/configuracao/");

  const catalogo = useMemo(
    () => (Array.isArray(ferramentas.data?.ferramentas) ? ferramentas.data?.ferramentas ?? [] : []),
    [ferramentas.data]
  );
  const grupos = useMemo(() => agruparPorCategoria(catalogo), [catalogo]);

  const apagar = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (valores) => "/ia/conversas/" + valores.id + "/",
    invalidar: [CHAVES_IA.conversas],
    mensagemSucesso: "Conversa apagada",
  });

  const confirmarExclusao = async () => {
    if (!confirmacao) return;
    try {
      await apagar.mutateAsync({ id: confirmacao.id });
      if (selecionada === confirmacao.id) {
        setSelecionada(null);
        setSessao((valor) => valor + 1);
      }
      setConfirmacao(null);
    } catch {
      /* o aviso de erro já é exibido pela mutação */
    }
  };

  const abrirConversa = (id: number) => {
    setSelecionada(id);
    setSessao((valor) => valor + 1);
  };

  const comecarConversa = () => {
    setSelecionada(null);
    setSessao((valor) => valor + 1);
  };

  const copiarEndereco = async (valor: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(valor);
      setCopiado(true);
      sucesso("Endereço copiado", "Cole no cliente MCP que for usar as consultas.");
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      avisarErro("Não foi possível copiar", "Selecione o endereço manualmente: " + valor);
    }
  };

  const mcp = configuracao.data?.mcp;
  const caminhoMcp = enderecoMcp(mcp);
  const enderecoCompleto = enderecoMcpCompleto(mcp);
  const transportes = normalizarTransportes(mcp?.transporte);
  const totalFerramentas = catalogo.length;
  const totalExpostas = mcp?.ferramentas ?? totalFerramentas;
  const queAlteramDados = catalogo.filter((ferramenta) => ferramenta.somente_leitura === false).length;

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Assistente"
        subtitulo="Pergunte em português sobre projetos, tarefas, riscos, custos e capacidades — cada resposta cita de onde veio o número"
        icone={Sparkles}
        cor="#7C3AED"
        acoes={
          <Botao variante="secundario" icone={CircleHelp} onClick={() => navegar("/ajuda")}>
            Como usar cada tela
          </Botao>
        }
      />

      <Alerta tom="warning" icone={TriangleAlert} titulo="Confira antes de decidir">
        O assistente monta a resposta a partir dos registros do SGP, mas pode interpretar mal uma pergunta ou
        arredondar um número. Use as fontes citadas em cada resposta para conferir o dado na tela de origem.
      </Alerta>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-sgp-lg border border-border bg-surface shadow-n1">
          <header className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <History className="size-4 text-fg-muted" aria-hidden />
              Conversas
              {lista.length > 0 && <Etiqueta tom="neutral">{lista.length}</Etiqueta>}
            </h2>
            <BotaoIcone
              icone={RefreshCw}
              rotulo="Atualizar o histórico"
              tamanho="sm"
              onClick={() => conversas.refetch()}
              className={cn(conversas.isFetching && "animate-spin")}
            />
          </header>

          <div className="border-b border-border p-2.5">
            <Botao variante="primario" tamanho="sm" icone={Plus} larguraTotal onClick={comecarConversa}>
              Nova conversa
            </Botao>
          </div>

          <div className="max-h-[420px] flex-1 overflow-y-auto p-1.5 scroll-thin lg:max-h-none">
            {conversas.isLoading && (
              <div className="p-2">
                <Esqueleto linhas={4} />
              </div>
            )}

            {conversas.isError && (
              <div className="p-2">
                <Alerta tom="danger" titulo="Não foi possível carregar o histórico">
                  {mensagemErro(conversas.error)}
                </Alerta>
              </div>
            )}

            {!conversas.isLoading && !conversas.isError && lista.length === 0 && (
              <Vazio
                icone={MessageSquare}
                titulo="Nenhuma conversa ainda"
                descricao="As conversas que você abrir com o assistente ficam salvas aqui, com as perguntas e as respostas."
                acao={
                  <Botao variante="secundario" tamanho="sm" icone={Sparkles} onClick={comecarConversa}>
                    Fazer a primeira pergunta
                  </Botao>
                }
              />
            )}

            {lista.map((conversa) => {
              const ativa = selecionada === conversa.id;
              return (
                <div
                  key={conversa.id}
                  className={cn(
                    "group flex items-start gap-1.5 rounded-sgp p-1.5 transition-colors",
                    ativa ? "bg-brand-soft/50" : "hover:bg-surface-2"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => abrirConversa(conversa.id)}
                    aria-current={ativa ? "true" : undefined}
                    className="min-w-0 flex-1 rounded-sgp px-1.5 py-1 text-left"
                  >
                    <span className={cn("block truncate text-xs", ativa ? "font-semibold text-brand" : "font-medium text-fg")}>
                      {conversa.titulo || "Conversa sem título"}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-fg-subtle">
                      {dataRelativa(conversa.criado_em)}
                      {conversa.total_mensagens !== undefined
                        ? " · " + contarMensagens(conversa.total_mensagens)
                        : ""}
                    </span>
                  </button>
                  <BotaoIcone
                    icone={Trash2}
                    rotulo={"Apagar a conversa " + (conversa.titulo || conversa.id)}
                    tamanho="xs"
                    onClick={() => setConfirmacao(conversa)}
                    className="mt-0.5 opacity-50 transition-opacity hover:opacity-100 group-hover:opacity-100"
                  />
                </div>
              );
            })}
          </div>
        </aside>

        <div className="overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n1">
          <ConversaAssistente
            key={sessao}
            conversaId={selecionada}
            aoTrocarConversa={(id) => setSelecionada(id)}
            className="h-[min(74vh,680px)] min-h-[460px]"
          />
        </div>
      </div>

      <SecaoColapsavel
        titulo="O que o assistente sabe responder"
        icone={Wrench}
        contagem={totalFerramentas || undefined}
        abertoInicial
      >
        {ferramentas.isLoading && <CarregandoBloco rotulo="Carregando o catálogo de consultas..." />}

        {ferramentas.isError && (
          <Alerta tom="danger" titulo="Não foi possível carregar o catálogo de consultas">
            {mensagemErro(ferramentas.error)}
          </Alerta>
        )}

        {!ferramentas.isLoading && !ferramentas.isError && grupos.length === 0 && (
          <Vazio
            icone={Wrench}
            titulo="Nenhuma consulta publicada"
            descricao="O assistente ainda não tem ferramentas registradas neste ambiente."
          />
        )}

        {grupos.length > 0 && (
          <div className="space-y-4">
            <p className="text-2xs leading-relaxed text-fg-muted">
              Cada consulta abaixo é uma pergunta que o assistente consegue responder com os dados do SGP.
              {queAlteramDados > 0
                ? " As marcadas com \"altera dados\" não são apenas leitura: use-as com atenção, porque elas mudam registros no sistema."
                : " Todas as consultas publicadas hoje são somente leitura."}
            </p>

            {grupos.map((grupo) => {
              const Icone = grupo.icone;
              return (
                <section key={grupo.chave} className="space-y-2">
                  <h3 className="flex flex-wrap items-center gap-2 text-xs font-semibold text-fg">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-md"
                      style={{ backgroundColor: grupo.cor + "1f", color: grupo.cor }}
                    >
                      <Icone className="size-3.5" aria-hidden />
                    </span>
                    {grupo.rotulo}
                    <Etiqueta tom="neutral">{grupo.ferramentas.length}</Etiqueta>
                  </h3>
                  <GradeCards colunas="3">
                    {grupo.ferramentas.map((ferramenta) => (
                      <div
                        key={ferramenta.nome}
                        className="flex flex-col gap-1.5 rounded-sgp-lg border border-border bg-surface-2 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 text-xs font-semibold text-fg">{ferramenta.rotulo || ferramenta.nome}</p>
                          {ferramenta.somente_leitura === false && (
                            <Etiqueta tom="warning" icone={SquarePen}>
                              altera dados
                            </Etiqueta>
                          )}
                        </div>
                        <p className="text-2xs leading-relaxed text-fg-muted">{ferramenta.descricao}</p>
                        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-[10px] text-fg-subtle">
                          <span className="font-mono">{ferramenta.nome}</span>
                          {ferramenta.permissao && (
                            <span className="inline-flex items-center gap-1">
                              <Link2 className="size-3 shrink-0" aria-hidden />
                              {ferramenta.permissao}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </GradeCards>
                </section>
              );
            })}
          </div>
        )}
      </SecaoColapsavel>

      <SecaoColapsavel
        titulo="Integração com outros assistentes (MCP)"
        icone={Plug}
        contagem={totalExpostas || undefined}
        abertoInicial
      >
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-fg-muted">
            Além do assistente que você usa aqui dentro, o SGP publica as mesmas consultas para assistentes
            externos que falam MCP (Model Context Protocol) — o padrão usado por assistentes de área de trabalho e
            por ambientes de desenvolvimento. Na prática: quem já trabalha com um desses assistentes pode perguntar
            sobre projetos, tarefas, riscos, custos e capacidades sem abrir o SGP, e recebe os mesmos números,
            calculados na mesma base de dados.
          </p>
          <p className="text-xs leading-relaxed text-fg-muted">
            O acesso continua limitado pelas permissões: o assistente externo só enxerga o que o perfil de quem
            pergunta poderia ver dentro do sistema. Nada é ampliado pelo fato de a consulta vir de fora.
          </p>

          {configuracao.isLoading && <CarregandoBloco rotulo="Lendo a configuração do assistente..." />}

          {configuracao.isError && (
            <Alerta tom="danger" titulo="Não foi possível ler a configuração do assistente">
              {mensagemErro(configuracao.error)}
            </Alerta>
          )}

          {configuracao.data && (
            <>
              <div className="rounded-sgp-lg border border-border bg-surface-2 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
                      <Server className="size-3.5 shrink-0" aria-hidden />
                      Endereço do servidor MCP
                    </p>
                    <p className="mt-1 break-all font-mono text-xs font-semibold text-fg">{caminhoMcp}</p>
                    <p className="mt-1 break-all text-[10px] text-fg-subtle">Endereço completo: {enderecoCompleto}</p>
                  </div>
                  <Botao
                    variante="secundario"
                    tamanho="sm"
                    icone={copiado ? Check : Copy}
                    onClick={() => void copiarEndereco(enderecoCompleto)}
                  >
                    {copiado ? "Copiado" : "Copiar endereço"}
                  </Botao>
                </div>

                <dl className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Ferramentas expostas</dt>
                    <dd className="mt-1 text-sm font-bold tabular-nums text-fg">{totalExpostas}</dd>
                    <dd className="text-[10px] text-fg-muted">
                      consultas do catálogo disponíveis para clientes externos
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Formas de conexão</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {transportes.length === 0 ? (
                        <span className="text-2xs text-fg-muted">Não informadas</span>
                      ) : (
                        transportes.map((transporte) => (
                          <Etiqueta key={transporte} tom="info" icone={Plug}>
                            {rotuloTransporte(transporte)}
                          </Etiqueta>
                        ))
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Situação</dt>
                    <dd className="mt-1.5">
                      {mcp?.habilitado === false ? (
                        <Etiqueta tom="neutral">desativada neste ambiente</Etiqueta>
                      ) : (
                        <Etiqueta tom="success" icone={Check}>
                          habilitada
                        </Etiqueta>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Quem responde</dt>
                    <dd className="mt-1 text-xs text-fg">
                      {rotuloProvedor(configuracao.data.provedor) || "não informado"}
                      {configuracao.data.modelo ? " · " + configuracao.data.modelo : ""}
                    </dd>
                  </div>
                </dl>
              </div>

              {mcp?.habilitado === false && (
                <Alerta tom="warning" icone={TriangleAlert} titulo="Servidor MCP desativado nesta instalação">
                  O endereço acima só passa a aceitar chamadas de assistentes externos quando a integração for
                  habilitada. Enquanto isso, as consultas continuam disponíveis normalmente pelo assistente dentro
                  do SGP.
                </Alerta>
              )}

              {configuracao.data.disponivel === false && (
                <Alerta tom="info" icone={Info} titulo="Sem provedor de modelo configurado">
                  {configuracao.data.motivo ||
                    "O assistente responde pelo motor local do SGP: as respostas são montadas a partir das consultas ao banco de dados, sem enviar dados para fora do sistema."}
                </Alerta>
              )}

              <p className="text-[10px] leading-relaxed text-fg-subtle">
                Para conectar, informe o endereço acima no seu cliente MCP. O acesso é autenticado com as
                credenciais de API do SGP, como em qualquer outra chamada, e as consultas aparecem no cliente com o
                nome e a descrição que estão no catálogo desta página.
              </p>
            </>
          )}
        </div>
      </SecaoColapsavel>

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo="Apagar conversa"
        subtitulo={confirmacao?.titulo}
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} carregando={apagar.isPending} onClick={confirmarExclusao}>
              Apagar conversa
            </Botao>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-fg-muted">
          A conversa e todas as mensagens dela saem do seu histórico do assistente. Esta ação não pode ser
          desfeita e as perguntas já feitas não podem ser recuperadas depois.
        </p>
      </Modal>
    </div>
  );
}

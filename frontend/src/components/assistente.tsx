import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  Lightbulb,
  Link2,
  MessageSquare,
  Plus,
  Send,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import {
  Alerta,
  AreaTexto,
  Botao,
  BotaoIcone,
  CarregandoBloco,
  Chip,
  Dica,
  GradeCards,
  PainelLateral,
  useAvisos,
} from "@/components/ui";
import { useConsulta } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import {
  AVISO_IMPRECISAO,
  CHAVES_IA,
  contarMensagens,
  formatarDuracao,
  mensagensDaConversa,
  normalizarFerramentas,
  normalizarFontes,
  normalizarSugestoes,
  paraMensagemLocal,
  rotaNavegavel,
  rotuloFerramenta,
  rotuloProvedor,
  votosDasMensagens,
  type DetalheConversa,
  type FonteIA,
  type MensagemLocal,
  type RespostaConversa,
} from "@/lib/assistente";
import { dataRelativa } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Estado global leve do painel do assistente
   --------------------------------------------------------------------------
   Mesmo desenho do painel de ajuda: qualquer botão da aplicação pode abrir o
   assistente sem passar props por toda a árvore, e o atalho Ctrl+I vale em
   qualquer tela.
   ========================================================================== */

type Ouvinte = (aberto: boolean) => void;
const ouvintes = new Set<Ouvinte>();

export function abrirAssistente() {
  ouvintes.forEach((fn) => fn(true));
}

export function fecharAssistente() {
  ouvintes.forEach((fn) => fn(false));
}

export function useAssistenteControlado() {
  const [aberto, setAberto] = useState(false);
  useEffect(() => {
    const fn: Ouvinte = (valor) => setAberto(valor);
    ouvintes.add(fn);
    return () => {
      ouvintes.delete(fn);
    };
  }, []);
  return { aberto, setAberto };
}

/** Atalho global: Ctrl+I (ou Cmd+I) abre e fecha o assistente. */
export function useAtalhoAssistente() {
  useEffect(() => {
    const handler = (evento: KeyboardEvent) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "i") {
        evento.preventDefault();
        abrirAssistente();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

/* ==========================================================================
   Pedaços da resposta
   ========================================================================== */

function TrilhaFerramentas({ ferramentas }: { ferramentas: MensagemLocal["ferramentas"] }) {
  if (ferramentas.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
        <Settings className="size-3 shrink-0" aria-hidden />
        Dados consultados
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ferramentas.map((ferramenta, indice) => (
          <Chip
            key={ferramenta.nome + indice}
            cor="#64748B"
            icone={Settings}
            className="text-2xs"
          >
            {rotuloFerramenta(ferramenta)}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function ListaFontes({ fontes, aoNavegar }: { fontes: FonteIA[]; aoNavegar?: () => void }) {
  const navegar = useNavigate();
  if (fontes.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
        <Link2 className="size-3 shrink-0" aria-hidden />
        Fontes
      </p>
      <div className="flex flex-wrap gap-1.5">
        {fontes.map((fonte, indice) => {
          const abre = rotaNavegavel(fonte.rota);
          const rotulo = fonte.rotulo || fonte.rota || "Registro";
          if (!abre) {
            return (
              <span
                key={rotulo + indice}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-2xs text-fg-muted"
                title={rotulo}
              >
                <span className="truncate">{rotulo}</span>
              </span>
            );
          }
          return (
            <button
              key={rotulo + indice}
              type="button"
              onClick={() => {
                aoNavegar?.();
                navegar(fonte.rota);
              }}
              title={"Abrir " + fonte.rota}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1",
                "text-2xs font-medium text-fg transition-colors hover:border-brand/50 hover:text-brand"
              )}
            >
              <ArrowRight className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{rotulo}</span>
              {fonte.tipo && <span className="shrink-0 text-[10px] text-fg-subtle">{fonte.tipo}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CarregandoResposta() {
  return (
    <div className="flex items-center gap-2.5 px-1 text-xs text-fg-muted" role="status" aria-live="polite">
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((indice) => (
          <span
            key={indice}
            className="size-1.5 animate-pulse rounded-full bg-brand"
            style={{ animationDelay: indice * 160 + "ms" }}
          />
        ))}
      </span>
      Consultando os dados do SGP...
    </div>
  );
}

function BolhaMensagem({
  mensagem,
  avaliar,
  voto,
  aoVotar,
  aoPerguntar,
  aoNavegar,
}: {
  mensagem: MensagemLocal;
  avaliar: boolean;
  voto?: boolean;
  aoVotar: (util: boolean) => void;
  aoPerguntar: (pergunta: string) => void;
  aoNavegar?: () => void;
}) {
  const doUsuario = mensagem.papel === "USUARIO";
  const meta = [
    mensagem.criado_em ? dataRelativa(mensagem.criado_em) : "",
    rotuloProvedor(mensagem.provedor),
    formatarDuracao(mensagem.duracao_ms) ? "em " + formatarDuracao(mensagem.duracao_ms) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (doUsuario) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-sgp-lg rounded-br-sm border border-brand/30 bg-brand-soft/50 px-3.5 py-2.5">
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-fg">{mensagem.texto}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-sgp bg-brand-soft/60 text-brand" aria-hidden>
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 rounded-sgp-lg rounded-tl-sm border border-border bg-surface-2 px-3.5 py-2.5">
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-fg">{mensagem.texto}</p>

        <TrilhaFerramentas ferramentas={mensagem.ferramentas} />
        <ListaFontes fontes={mensagem.fontes} aoNavegar={aoNavegar} />

        {mensagem.sugestoes.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
              <Lightbulb className="size-3 shrink-0" aria-hidden />
              Continue perguntando
            </p>
            <div className="flex flex-wrap gap-1.5">
              {mensagem.sugestoes.map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  onClick={() => aoPerguntar(sugestao)}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/40 bg-brand-soft/40 px-2.5 py-1",
                    "text-2xs font-medium text-brand transition-colors hover:bg-brand-soft/70"
                  )}
                >
                  <ArrowRight className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{sugestao}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          <span className="text-[10px] text-fg-subtle">{meta || "Resposta do assistente"}</span>
          {avaliar && (
            <span className="flex items-center gap-1">
              <span className="text-2xs text-fg-muted">Esta resposta ajudou?</span>
              <BotaoIcone
                icone={ThumbsUp}
                rotulo="Resposta útil"
                tamanho="xs"
                ativo={voto === true}
                onClick={() => aoVotar(true)}
              />
              <BotaoIcone
                icone={ThumbsDown}
                rotulo="Resposta com problemas"
                tamanho="xs"
                ativo={voto === false}
                onClick={() => aoVotar(false)}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Conversa — usada pelo painel lateral e pela tela cheia
   ========================================================================== */

export function ConversaAssistente({
  conversaId = null,
  aoTrocarConversa,
  aoNavegar,
  className,
}: {
  /** Conversa aberta; nulo começa uma conversa nova. */
  conversaId?: number | null;
  /** Avisa a tela quando a conversa em uso muda (inclusive ao criar uma nova). */
  aoTrocarConversa?: (id: number | null) => void;
  /** Chamado antes de navegar para uma fonte — o painel usa para se fechar. */
  aoNavegar?: () => void;
  className?: string;
}) {
  const { sucesso, erro: avisarErro } = useAvisos();
  const qc = useQueryClient();

  const [conversa, setConversa] = useState<number | null>(conversaId);
  const [conversaDaProp, setConversaDaProp] = useState<number | null>(conversaId);
  const [mensagens, setMensagens] = useState<MensagemLocal[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [votos, setVotos] = useState<Record<string, boolean>>({});
  const [carregada, setCarregada] = useState(false);
  const contador = useRef(0);
  const areaRef = useRef<HTMLDivElement | null>(null);

  // Troca de conversa pedida de fora: zera a sessão e recarrega do histórico.
  if (conversaId !== conversaDaProp) {
    setConversaDaProp(conversaId);
    if (conversaId !== conversa) {
      setConversa(conversaId);
      setMensagens([]);
      setVotos({});
      setFalha(null);
      setCarregada(false);
    }
  }

  const detalhe = useConsulta<DetalheConversa>(
    CHAVES_IA.conversa(conversaId),
    conversaId ? "/ia/conversas/" + conversaId + "/" : null,
    undefined,
    { staleTime: 0, enabled: Boolean(conversaId) && !carregada }
  );

  const sugestoesIniciais = useConsulta<{ sugestoes?: string[] }>(CHAVES_IA.sugestoes, "/ia/sugestoes/", undefined, {
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!conversaId || carregada || !detalhe.isSuccess) return;
    const lista = mensagensDaConversa(detalhe.data);
    setMensagens(lista.map(paraMensagemLocal));
    setVotos(votosDasMensagens(lista));
    setCarregada(true);
  }, [conversaId, carregada, detalhe.isSuccess, detalhe.data]);

  useEffect(() => {
    const area = areaRef.current;
    if (area) area.scrollTop = area.scrollHeight;
  }, [mensagens.length, enviando, falha]);

  const ultimoAssistente = useMemo(() => {
    for (let indice = mensagens.length - 1; indice >= 0; indice -= 1) {
      if (mensagens[indice].papel === "ASSISTENTE") return indice;
    }
    return -1;
  }, [mensagens]);

  const sugestoes = useMemo(
    () => normalizarSugestoes(sugestoesIniciais.data),
    [sugestoesIniciais.data]
  );

  const proximaChave = (prefixo: string) => {
    contador.current += 1;
    return prefixo + "-" + String(Date.now()) + "-" + String(contador.current);
  };

  const enviar = async (perguntaForcada?: string) => {
    const conteudo = String(perguntaForcada ?? texto).trim();
    if (!conteudo || enviando) return;
    setTexto("");
    setFalha(null);
    setMensagens((atual) => [
      ...atual,
      {
        chave: proximaChave("usuario"),
        papel: "USUARIO",
        texto: conteudo,
        ferramentas: [],
        fontes: [],
        sugestoes: [],
      },
    ]);
    setEnviando(true);
    try {
      const corpo: Record<string, unknown> = { mensagem: conteudo };
      if (conversa) corpo.conversa = conversa;
      const resposta = await api.post<RespostaConversa>("/ia/conversar/", corpo);
      setMensagens((atual) => [
        ...atual,
        {
          chave: proximaChave("assistente"),
          papel: "ASSISTENTE",
          texto: resposta.resposta || "",
          ferramentas: normalizarFerramentas(resposta.ferramentas),
          fontes: normalizarFontes(resposta.fontes),
          sugestoes: normalizarSugestoes(resposta.sugestoes),
          provedor: resposta.provedor,
          duracao_ms: resposta.duracao_ms,
        },
      ]);
      if (resposta.conversa) {
        // A conversa criada aqui já está na tela: marcamos como carregada para
        // que a consulta do histórico não sobrescreva as mensagens locais.
        setConversa(resposta.conversa);
        setConversaDaProp(resposta.conversa);
        setCarregada(true);
        aoTrocarConversa?.(resposta.conversa);
      }
      qc.invalidateQueries({ queryKey: CHAVES_IA.conversas });
    } catch (erro) {
      setFalha(mensagemErro(erro));
    } finally {
      setEnviando(false);
    }
  };

  const avaliar = async (chave: string, util: boolean) => {
    if (!conversa) return;
    try {
      await api.post("/ia/conversas/" + conversa + "/avaliar/", { util, comentario: "" });
      setVotos((atual) => ({ ...atual, [chave]: util }));
      if (util) sucesso("Obrigado pelo retorno", "Que bom que a resposta ajudou.");
      else sucesso("Retorno registrado", "Vamos usar isso para melhorar as respostas.");
    } catch (erro) {
      avisarErro("Não foi possível registrar a avaliação", mensagemErro(erro));
    }
  };

  const novaConversa = () => {
    setConversa(null);
    setConversaDaProp(null);
    setMensagens([]);
    setVotos({});
    setFalha(null);
    setTexto("");
    setCarregada(false);
    aoTrocarConversa?.(null);
  };

  const carregandoHistorico = Boolean(conversaId) && !carregada && detalhe.isLoading;
  const semMensagens = mensagens.length === 0 && !enviando && !carregandoHistorico;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand-soft/60 text-brand" aria-hidden>
            <Bot className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-fg">
              {conversa ? "Conversa em andamento" : "Nova conversa"}
            </span>
            <span className="block truncate text-[10px] text-fg-subtle">
              {conversa
                ? contarMensagens(mensagens.length) + " · salva no seu histórico"
                : "A primeira pergunta abre uma conversa no seu histórico"}
            </span>
          </span>
        </span>
        <Botao variante="fantasma" tamanho="sm" icone={Plus} onClick={novaConversa}>
          Nova conversa
        </Botao>
      </header>

      <div ref={areaRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 scroll-thin">
        {carregandoHistorico && <CarregandoBloco rotulo="Carregando a conversa..." />}

        {Boolean(conversaId) && detalhe.isError && (
          <Alerta tom="danger" titulo="Não foi possível carregar a conversa">
            {mensagemErro(detalhe.error)}
          </Alerta>
        )}

        {semMensagens && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-sgp-lg border border-brand/30 bg-brand-soft/30 p-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-fg">Pergunte em português sobre os dados do SGP</p>
                <p className="mt-0.5 text-2xs leading-relaxed text-fg-muted">
                  O assistente consulta projetos, tarefas, riscos, custos e capacidades, cita de onde tirou cada
                  número e respeita as suas permissões: ele não devolve o que o seu perfil não pode ver.
                </p>
              </div>
            </div>

            {sugestoes.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
                  <Lightbulb className="size-3.5 shrink-0" aria-hidden />
                  Perguntas sugeridas para o seu perfil
                </p>
                <GradeCards colunas="2">
                  {sugestoes.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => void enviar(sugestao)}
                      className={cn(
                        "flex items-start gap-2 rounded-sgp-lg border border-border bg-surface p-3 text-left",
                        "transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-n2"
                      )}
                    >
                      <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                      <span className="text-2xs font-medium leading-relaxed text-fg">{sugestao}</span>
                    </button>
                  ))}
                </GradeCards>
              </>
            )}
          </div>
        )}

        {mensagens.map((mensagem, indice) => (
          <BolhaMensagem
            key={mensagem.chave}
            mensagem={mensagem}
            avaliar={Boolean(conversa) && indice === ultimoAssistente}
            voto={votos[mensagem.chave]}
            aoVotar={(util) => void avaliar(mensagem.chave, util)}
            aoPerguntar={(pergunta) => void enviar(pergunta)}
            aoNavegar={aoNavegar}
          />
        ))}

        {enviando && <CarregandoResposta />}

        {falha && (
          <Alerta tom="danger" titulo="Não foi possível consultar o assistente">
            {falha}
          </Alerta>
        )}
      </div>

      <div className="space-y-2 border-t border-border px-4 py-3">
        <AreaTexto
          rows={2}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              void enviar();
            }
          }}
          aria-label="Pergunta para o assistente"
          placeholder="Pergunte em português. Ex.: quais projetos estão atrasados?"
          className="resize-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-fg-subtle">
            <kbd className="rounded border border-border bg-surface-2 px-1 font-semibold">Enter</kbd> envia ·{" "}
            <kbd className="rounded border border-border bg-surface-2 px-1 font-semibold">Shift</kbd>+
            <kbd className="rounded border border-border bg-surface-2 px-1 font-semibold">Enter</kbd> quebra linha
          </span>
          <Botao
            variante="primario"
            tamanho="sm"
            icone={Send}
            carregando={enviando}
            disabled={!texto.trim()}
            onClick={() => void enviar()}
          >
            Perguntar
          </Botao>
        </div>

        <p className="flex items-start gap-1.5 border-t border-border pt-2 text-[10px] leading-relaxed text-fg-subtle">
          <TriangleAlert className="mt-px size-3 shrink-0 text-warning" aria-hidden />
          <span>{AVISO_IMPRECISAO}</span>
        </p>
      </div>
    </div>
  );
}

/* ==========================================================================
   Painel lateral
   ========================================================================== */

export function PainelAssistente({
  abertoForcado,
  onFecharForcado,
}: {
  abertoForcado?: boolean;
  onFecharForcado?: () => void;
} = {}) {
  const controlado = useAssistenteControlado();
  const aberto = abertoForcado ?? controlado.aberto;
  const setAberto = (valor: boolean) => {
    if (valor === false && onFecharForcado) onFecharForcado();
    else controlado.setAberto(valor);
  };
  const navegar = useNavigate();

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={() => setAberto(false)}
      largura="lg"
      titulo={
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-brand" aria-hidden />
          Assistente do SGP
        </span>
      }
      subtitulo="Perguntas sobre os seus dados, com a origem de cada número"
      rodape={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-fg-subtle">
            <kbd className="rounded border border-border bg-surface-2 px-1 font-semibold">Ctrl</kbd>+
            <kbd className="rounded border border-border bg-surface-2 px-1 font-semibold">I</kbd> abre e fecha o
            assistente
          </span>
          <Botao
            variante="fantasma"
            tamanho="sm"
            icone={ExternalLink}
            onClick={() => {
              setAberto(false);
              navegar("/assistente");
            }}
          >
            Abrir tela cheia
          </Botao>
        </div>
      }
    >
      <ConversaAssistente
        className="h-[calc(100dvh-300px)] min-h-[440px]"
        aoNavegar={() => setAberto(false)}
      />
    </PainelLateral>
  );
}

/* ==========================================================================
   Botão da barra superior
   ========================================================================== */

export function BotaoAssistente() {
  return (
    <Dica texto="Assistente de IA (Ctrl+I)">
      <button
        type="button"
        onClick={abrirAssistente}
        aria-label="Abrir o assistente de IA"
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-sgp transition-all active:scale-95",
          "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg"
        )}
      >
        <Sparkles className="size-4" aria-hidden />
      </button>
    </Dica>
  );
}

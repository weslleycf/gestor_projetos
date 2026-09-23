import { useState } from "react";
import {
  Check,
  MessageSquare,
  Pencil,
  Reply,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  AreaTexto,
  Avatar,
  Botao,
  BotaoIcone,
  Campo,
  Chip,
  Dica,
  Esqueleto,
  Etiqueta,
  Modal,
  useAvisos,
} from "@/components/ui";
import { useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import type { Comentario } from "@/lib/types";
import { dataRelativa } from "@/lib/format";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Lista de comentários compartilhada (RF-35)
   --------------------------------------------------------------------------
   Kanban, detalhe do projeto e demais telas usam este mesmo bloco. Antes cada
   tela repetia a sua versão e elas divergiam: uma tinha reação e resolução, a
   outra não tinha nem edição nem exclusão. Centralizar garante que toda tela
   ofereça exatamente as mesmas ações.
   ========================================================================== */

const EMOJIS = ["👍", "🎉", "🚀", "✅", "👀", "❤️"];

export function ListaComentarios({
  entidade,
  objetoId,
  chaveInvalidar,
  placeholder = "Escreva uma atualização para a equipe...",
  vazio = "Nenhum comentário ainda.",
  className,
  compacto = false,
}: {
  /** Identificador da entidade dona do comentário, ex.: "tasks.task". */
  entidade: string;
  objetoId: number | string;
  /** Chave de cache a invalidar depois de cada alteração. */
  chaveInvalidar: unknown[];
  placeholder?: string;
  vazio?: string;
  className?: string;
  compacto?: boolean;
}) {
  const { usuario, pode } = useAuth();
  const { sucesso, erro: avisarErro } = useAvisos();
  const [texto, setTexto] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [textoEdicao, setTextoEdicao] = useState("");
  const [excluindo, setExcluindo] = useState<Comentario | null>(null);
  const [respondendo, setRespondendo] = useState<number | null>(null);
  const [textoResposta, setTextoResposta] = useState("");

  const comentarios = useLista<Comentario>(["comentarios", chaveInvalidar[1]], "/comentarios/", {
    entidade,
    objeto_id: objetoId,
  });
  const lista = comentarios.data ?? [];

  const invalidar = [["comentarios", chaveInvalidar[1]], chaveInvalidar];

  const comentar = useMutacao<{ texto: string; parent?: number }, Comentario>({
    url: "/comentarios/",
    invalidar,
    mensagemSucesso: "Comentário publicado",
  });

  const editar = useMutacao<{ id: number; texto: string }, Comentario>({
    metodo: "patch",
    url: (v) => "/comentarios/" + v.id + "/",
    invalidar,
    mensagemSucesso: "Comentário atualizado",
  });

  const excluir = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/comentarios/" + v.id + "/",
    invalidar,
    mensagemSucesso: "Comentário excluído",
  });

  const reagir = useMutacao<{ id: number; emoji: string }, Comentario>({
    url: (v) => "/comentarios/" + v.id + "/reagir/",
    invalidar,
  });

  const resolver = useMutacao<{ id: number }, Comentario>({
    url: (v) => "/comentarios/" + v.id + "/resolver/",
    invalidar,
  });

  const publicar = async (parent?: number) => {
    const conteudo = (parent ? textoResposta : texto).trim();
    if (!conteudo) return;
    try {
      await comentar.mutateAsync({ texto: conteudo, ...(parent ? { parent } : {}) });
      if (parent) {
        setTextoResposta("");
        setRespondendo(null);
      } else {
        setTexto("");
      }
    } catch (falha) {
      avisarErro("Não foi possível comentar", mensagemErro(falha));
    }
  };

  const salvarEdicao = async (id: number) => {
    const conteudo = textoEdicao.trim();
    if (!conteudo) return;
    try {
      await editar.mutateAsync({ id, texto: conteudo });
      setEditandoId(null);
      setTextoEdicao("");
    } catch (falha) {
      avisarErro("Não foi possível editar", mensagemErro(falha));
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await excluir.mutateAsync({ id: excluindo.id });
      setExcluindo(null);
    } catch (falha) {
      avisarErro("Não foi possível excluir", mensagemErro(falha));
    }
  };

  const euPosso = (c: Comentario) => c.pode_editar ?? (c.autor === usuario?.id || pode("admin.ver"));

  const CartaoComentario = ({ c, resposta = false }: { c: Comentario; resposta?: boolean }) => {
    const emEdicao = editandoId === c.id;
    const minhasReacoes = Object.entries(c.reacoes || {});
    return (
      <li
        className={cn(
          "flex items-start gap-2.5 rounded-sgp border p-2.5",
          resposta ? "ml-6 border-border/60 bg-surface" : "border-border bg-surface-2",
          c.resolvido && "border-success/40 bg-success-soft/20"
        )}
      >
        <Avatar
          nome={c.autor_detalhe?.nome}
          cor={c.autor_detalhe?.cor}
          iniciais={c.autor_detalhe?.iniciais}
          url={c.autor_detalhe?.avatar_display}
          tamanho="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-2xs font-semibold text-fg">
              {c.autor_detalhe?.nome || "Usuário"}
            </span>
            <span className="text-2xs text-fg-subtle">· {dataRelativa(c.criado_em)}</span>
            {c.editado && (
              <Dica texto={"Editado em " + (c.editado_em ? new Date(c.editado_em).toLocaleString("pt-BR") : "")}>
                <span className="text-[10px] italic text-fg-subtle">editado</span>
              </Dica>
            )}
            {c.resolvido && <Etiqueta tom="success" icone={Check}>resolvido</Etiqueta>}
            {c.autor === usuario?.id && <Etiqueta tom="neutral">você</Etiqueta>}
          </div>

          {emEdicao ? (
            <div className="mt-1.5 space-y-2">
              <AreaTexto
                rows={3}
                value={textoEdicao}
                autoFocus
                onChange={(e) => setTextoEdicao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditandoId(null);
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) salvarEdicao(c.id);
                }}
              />
              <div className="flex items-center gap-2">
                <Botao
                  tamanho="sm"
                  variante="primario"
                  icone={Check}
                  carregando={editar.isPending}
                  disabled={!textoEdicao.trim()}
                  onClick={() => salvarEdicao(c.id)}
                >
                  Salvar
                </Botao>
                <Botao
                  tamanho="sm"
                  variante="fantasma"
                  icone={X}
                  onClick={() => {
                    setEditandoId(null);
                    setTextoEdicao("");
                  }}
                >
                  Cancelar
                </Botao>
                <span className="text-[10px] text-fg-subtle">Ctrl+Enter salva · Esc cancela</span>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 whitespace-pre-line text-xs text-fg">{c.texto}</p>
          )}

          {!emEdicao && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {minhasReacoes.map(([emoji, pessoas]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => reagir.mutate({ id: c.id, emoji })}
                  title={pessoas.length + " reação(ões)"}
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[10px] transition-colors",
                    usuario?.id && pessoas.includes(usuario.id)
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border bg-surface text-fg-muted hover:border-border-strong"
                  )}
                >
                  {emoji} {pessoas.length}
                </button>
              ))}

              <div className="flex items-center gap-0.5">
                {EMOJIS.map((emoji) => (
                  <Dica key={emoji} texto={"Reagir com " + emoji}>
                    <button
                      type="button"
                      onClick={() => reagir.mutate({ id: c.id, emoji })}
                      aria-label={"Reagir com " + emoji}
                      className="rounded px-0.5 text-xs opacity-45 transition-opacity hover:opacity-100"
                    >
                      {emoji}
                    </button>
                  </Dica>
                ))}
              </div>

              {!resposta && !compacto && (
                <Dica texto="Responder neste comentário">
                  <BotaoIcone
                    icone={Reply}
                    rotulo="Responder"
                    tamanho="sm"
                    onClick={() => {
                      setRespondendo(respondendo === c.id ? null : c.id);
                      setTextoResposta("");
                    }}
                  />
                </Dica>
              )}

              <Dica texto={c.resolvido ? "Reabrir comentário" : "Marcar como resolvido"}>
                <BotaoIcone
                  icone={c.resolvido ? Undo2 : Check}
                  rotulo={c.resolvido ? "Reabrir" : "Resolver"}
                  tamanho="sm"
                  ativo={c.resolvido}
                  onClick={() => resolver.mutate({ id: c.id })}
                />
              </Dica>

              {/* Editar e excluir só aparecem para quem realmente pode — o servidor
                  informa isso em pode_editar, evitando botão que sempre dá erro. */}
              {euPosso(c) && (
                <>
                  <Dica texto="Editar comentário">
                    <BotaoIcone
                      icone={Pencil}
                      rotulo="Editar comentário"
                      tamanho="sm"
                      onClick={() => {
                        setEditandoId(c.id);
                        setTextoEdicao(c.texto);
                      }}
                    />
                  </Dica>
                  <Dica texto="Excluir comentário">
                    <BotaoIcone
                      icone={Trash2}
                      rotulo="Excluir comentário"
                      tamanho="sm"
                      className="hover:text-danger"
                      onClick={() => setExcluindo(c)}
                    />
                  </Dica>
                </>
              )}
            </div>
          )}

          {respondendo === c.id && (
            <div className="mt-2 space-y-2 border-l-2 border-brand/40 pl-2.5">
              <AreaTexto
                rows={2}
                value={textoResposta}
                autoFocus
                placeholder="Escreva uma resposta..."
                onChange={(e) => setTextoResposta(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Botao
                  tamanho="sm"
                  variante="secundario"
                  icone={MessageSquare}
                  carregando={comentar.isPending}
                  disabled={!textoResposta.trim()}
                  onClick={() => publicar(c.id)}
                >
                  Responder
                </Botao>
                <Botao tamanho="sm" variante="fantasma" onClick={() => setRespondendo(null)}>
                  Cancelar
                </Botao>
              </div>
            </div>
          )}

          {c.respostas?.length > 0 && (
            <ul className="mt-2 space-y-2">
              {c.respostas.map((filho) => (
                <CartaoComentario key={filho.id} c={filho} resposta />
              ))}
            </ul>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      <ul className="space-y-2">
        {lista.map((c) => (
          <CartaoComentario key={c.id} c={c} />
        ))}
        {comentarios.isLoading && (
          <li>
            <Esqueleto linhas={2} />
          </li>
        )}
        {!comentarios.isLoading && lista.length === 0 && (
          <li className="text-2xs text-fg-muted">{vazio}</li>
        )}
      </ul>

      <Campo rotulo="Novo comentário">
        <AreaTexto
          rows={2}
          value={texto}
          placeholder={placeholder}
          onChange={(e) => setTexto(e.target.value)}
        />
      </Campo>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-fg-subtle">
          Use Ctrl+Enter para publicar
        </span>
        <Botao
          variante="secundario"
          icone={MessageSquare}
          carregando={comentar.isPending}
          disabled={!texto.trim()}
          onClick={() => publicar()}
        >
          Comentar
        </Botao>
      </div>

      <Modal
        aberto={excluindo !== null}
        onFechar={() => setExcluindo(null)}
        titulo="Excluir comentário"
        largura="sm"
        rodape={
          <div className="flex justify-end gap-2">
            <Botao variante="fantasma" onClick={() => setExcluindo(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={confirmarExclusao}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-xs text-fg-muted">
          Esta ação não pode ser desfeita. O comentário e as respostas dele serão removidos da conversa.
        </p>
        {excluindo && (
          <p className="mt-2 whitespace-pre-line rounded-sgp border border-border bg-surface-2 p-2.5 text-xs text-fg">
            {excluindo.texto}
          </p>
        )}
      </Modal>
    </div>
  );
}

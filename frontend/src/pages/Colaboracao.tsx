import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AtSign,
  Check,
  CornerUpLeft,
  Filter,
  Hash,
  Layers,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  Abas,
  Alerta,
  AreaTexto,
  Avatar,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  Entrada,
  EntradaBusca,
  Esqueleto,
  Etiqueta,
  Modal,
  PilhaAvatares,
  SecaoColapsavel,
  Selecao,
  Vazio,
} from "@/components/ui";
import { ListaAnexos } from "@/components/anexos";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataHora, dataRelativa, numero } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Atividade, Mensagem, ProjetoResumo, Sala, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Constantes
   ========================================================================== */

const EMOJIS = ["👍", "🎉", "🚀", "✅", "👀", "❤️"];

const TIPOS_SALA = [
  { valor: "PROJETO", rotulo: "Projeto" },
  { valor: "EQUIPE", rotulo: "Equipe" },
  { valor: "AREA", rotulo: "Área" },
  { valor: "DIRETO", rotulo: "Mensagem direta" },
];

const ROTULO_ENTIDADE: Record<string, string> = {
  "tasks.task": "Tarefa",
  "portfolio.project": "Projeto",
  "risks.risk": "Risco",
  "risks.issue": "Issue",
  "resources.alocacao": "Alocação",
  "resources.timesheet": "Apontamento",
  "finance.lancamento": "Lançamento",
  "core.comentario": "Comentário",
  "core.user": "Usuário",
  "capabilities.employeeskill": "Capacidade",
  "collab.mensagem": "Mensagem",
};

type AbaColaboracao = "chat" | "atividades";

/* ==========================================================================
   Página
   ========================================================================== */

export default function Colaboracao() {
  const { usuario, pode } = useAuth();
  const navegar = useNavigate();
  const qc = useQueryClient();

  const [aba, definirAba] = useState<AbaColaboracao>("chat");
  const [salaSelecionada, definirSalaSelecionada] = useState<number | null>(null);
  const [buscaSala, definirBuscaSala] = useState("");
  const [texto, definirTexto] = useState("");
  const [mencoes, definirMencoes] = useState<number[]>([]);
  const [respondendo, definirRespondendo] = useState<Mensagem | null>(null);
  const [editandoId, definirEditandoId] = useState<number | null>(null);
  const [textoEdicao, definirTextoEdicao] = useState("");
  const [excluindo, definirExcluindo] = useState<Mensagem | null>(null);
  const [modalSala, definirModalSala] = useState(false);
  const [filtroEntidade, definirFiltroEntidade] = useState("");
  const [novaSala, definirNovaSala] = useState({ nome: "", tipo: "PROJETO", project: "", descricao: "", participantes: [] as number[] });

  const salas = useLista<Sala>(["salas"], "/salas/", { page_size: 100 });
  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, "/usuarios/resumo/");
  const projetos = useLista<ProjetoResumo>(CHAVES.projetos, "/projetos/", { page_size: 200 });
  const atividades = useLista<Atividade>(CHAVES.atividades, "/atividades/", {
    page_size: 100,
    ...(filtroEntidade ? { entidade: filtroEntidade } : {}),
  });

  const paramsConversa = { limite: 200 };
  const chaveConversa = ["salas", salaSelecionada, "mensagens", paramsConversa];
  const conversa = useConsulta<{ sala: Sala; mensagens: Mensagem[] }>(
    ["salas", salaSelecionada, "mensagens"],
    salaSelecionada ? "/salas/" + salaSelecionada + "/mensagens/" : null,
    paramsConversa
  );

  const enviar = useMutacao<{ sala: number; texto: string; mencoes: number[]; reply_to: number | null }, Mensagem>({
    url: (v) => "/salas/" + v.sala + "/enviar/",
    invalidar: [["salas", salaSelecionada, "mensagens"], ["salas"]],
  });

  const reagir = useMutacao<{ id: number; emoji: string }, Mensagem>({
    url: (v) => "/mensagens/" + v.id + "/reagir/",
    invalidar: [["salas", salaSelecionada, "mensagens"]],
  });

  const editarMensagem = useMutacao<{ id: number; texto: string }, Mensagem>({
    metodo: "patch",
    url: (v) => "/mensagens/" + v.id + "/",
    invalidar: [["salas", salaSelecionada, "mensagens"], ["salas"]],
    mensagemSucesso: "Mensagem atualizada",
  });

  const excluirMensagem = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/mensagens/" + v.id + "/",
    invalidar: [["salas", salaSelecionada, "mensagens"], ["salas"]],
    mensagemSucesso: "Mensagem excluída",
  });

  const criarSala = useMutacao<
    { nome: string; tipo: string; project: number | null; descricao: string; participantes: number[]; cor: string; icone: string },
    Sala
  >({
    url: "/salas/",
    invalidar: [["salas"]],
    mensagemSucesso: "Sala criada",
  });

  useEffect(() => {
    if (salaSelecionada !== null) return;
    const lista = salas.data || [];
    if (lista.length) definirSalaSelecionada(lista[0].id);
  }, [salas.data, salaSelecionada]);

  const salasFiltradas = useMemo(() => {
    const termo = buscaSala.trim().toLowerCase();
    const lista = salas.data || [];
    if (!termo) return lista;
    return lista.filter((s) => s.nome.toLowerCase().includes(termo) || (s.project_nome || "").toLowerCase().includes(termo));
  }, [salas.data, buscaSala]);

  const salaAtual = useMemo(
    () => (salas.data || []).find((s) => s.id === salaSelecionada) || conversa.data?.sala || null,
    [salas.data, salaSelecionada, conversa.data]
  );

  const mensagens = conversa.data?.mensagens ?? [];

  const termoMencao = useMemo(() => {
    const indice = texto.lastIndexOf("@");
    if (indice < 0) return null;
    const trecho = texto.slice(indice + 1);
    if (trecho.length > 24 || trecho.indexOf("\n") >= 0) return null;
    return trecho.trim().toLowerCase();
  }, [texto]);

  const sugestoesMencao = useMemo(() => {
    if (termoMencao === null) return [];
    const lista = usuarios.data || [];
    const filtrados = termoMencao
      ? lista.filter((u) => u.nome.toLowerCase().includes(termoMencao) || u.nome_curto.toLowerCase().includes(termoMencao))
      : lista;
    return filtrados.slice(0, 6);
  }, [termoMencao, usuarios.data]);

  const mapaMensagens = useMemo(() => {
    const mapa = new Map<number, Mensagem>();
    mensagens.forEach((m) => mapa.set(m.id, m));
    return mapa;
  }, [mensagens]);

  const mapaSalas = useMemo(() => {
    const mapa = new Map<number, Sala>();
    (salas.data || []).forEach((s) => mapa.set(s.id, s));
    return mapa;
  }, [salas.data]);

  const inserirMencao = (pessoa: UsuarioResumo) => {
    const indice = texto.lastIndexOf("@");
    const base = indice >= 0 ? texto.slice(0, indice) : texto;
    definirTexto(base + "@" + (pessoa.nome_curto || pessoa.nome) + " ");
    if (!mencoes.includes(pessoa.id)) definirMencoes(mencoes.concat(pessoa.id));
  };

  const enviarMensagem = () => {
    const conteudo = texto.trim();
    if (!conteudo || !salaSelecionada) return;
    enviar.mutate(
      { sala: salaSelecionada, texto: conteudo, mencoes, reply_to: respondendo ? respondendo.id : null },
      {
        onSuccess: () => {
          definirTexto("");
          definirMencoes([]);
          definirRespondendo(null);
        },
      }
    );
  };

  const alternarReacao = (mensagem: Mensagem, emoji: string) => {
    const atual = mensagem.reacoes || {};
    const pessoas = atual[emoji] || [];
    const meuId = usuario ? usuario.id : 0;
    const novas = pessoas.includes(meuId) ? pessoas.filter((p) => p !== meuId) : pessoas.concat(meuId);
    const otimista: Mensagem = { ...mensagem, reacoes: { ...atual, [emoji]: novas } };
    qc.setQueryData<{ sala: Sala; mensagens: Mensagem[] }>(chaveConversa, (antigo) => {
      if (!antigo) return antigo;
      return { ...antigo, mensagens: antigo.mensagens.map((m) => (m.id === mensagem.id ? otimista : m)) };
    });
    reagir.mutate(
      { id: mensagem.id, emoji },
      { onError: () => qc.invalidateQueries({ queryKey: ["salas", salaSelecionada, "mensagens"] }) }
    );
  };

  // A moderação do chat é do perfil ADMIN no servidor (pode_gerenciar_autor).
  // Usar "admin.ver" aqui mostrava os ícones ao PMO, que recebia 403 ao clicar.
  const podeGerenciarMensagem = (mensagem: Mensagem) =>
    mensagem.autor === usuario?.id || usuario?.perfil === "ADMIN";

  const salvarEdicao = (id: number) => {
    const conteudo = textoEdicao.trim();
    if (!conteudo) return;
    editarMensagem.mutate(
      { id, texto: conteudo },
      {
        onSuccess: () => {
          definirEditandoId(null);
          definirTextoEdicao("");
        },
      }
    );
  };

  const confirmarExclusaoMensagem = () => {
    if (!excluindo) return;
    excluirMensagem.mutate({ id: excluindo.id }, { onSuccess: () => definirExcluindo(null) });
  };

  const salvarSala = () => {
    if (!novaSala.nome.trim()) return;
    criarSala.mutate(
      {
        nome: novaSala.nome.trim(),
        tipo: novaSala.tipo,
        project: novaSala.project ? Number(novaSala.project) : null,
        descricao: novaSala.descricao,
        participantes: novaSala.participantes,
        cor: "#6366F1",
        icone: "message-circle",
      },
      {
        onSuccess: (sala) => {
          definirModalSala(false);
          definirNovaSala({ nome: "", tipo: "PROJETO", project: "", descricao: "", participantes: [] });
          if (sala && sala.id) definirSalaSelecionada(sala.id);
        },
      }
    );
  };

  const totalMensagens = (salas.data || []).reduce((a, s) => a + (s.total_mensagens || 0), 0);
  const participantesSala = salaAtual ? salaAtual.participantes_detalhe || [] : [];

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Colaboração"
        subtitulo="Salas de projeto, chat com reações e feed de atividades da equipe"
        icone={MessagesSquare}
        cor="#6366F1"
        migalhas={[{ rotulo: "Execução" }, { rotulo: "Colaboração" }]}
        acoes={
          <>
            <Botao variante="secundario" icone={RefreshCw} onClick={() => salas.refetch()} carregando={salas.isFetching}>
              Atualizar
            </Botao>
            <Botao variante="primario" icone={Plus} onClick={() => definirModalSala(true)}>
              Nova sala
            </Botao>
          </>
        }
      />

      <Abas<AbaColaboracao>
        valor={aba}
        onChange={(v) => definirAba(v)}
        abas={[
          { valor: "chat", rotulo: "Salas e chat", icone: MessageSquare, contagem: (salas.data || []).length },
          { valor: "atividades", rotulo: "Feed de atividades", icone: Activity, contagem: atividades.data ? atividades.data.length : undefined },
        ]}
      />

      {aba === "chat" ? (
        <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
          <aside className="flex flex-col rounded-sgp-lg border border-border bg-surface shadow-n1">
            <header className="space-y-2 border-b border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-fg">Salas</h2>
                <Etiqueta tom="brand">{numero((salas.data || []).length)}</Etiqueta>
              </div>
              <EntradaBusca valor={buscaSala} onChange={definirBuscaSala} placeholder="Buscar sala..." />
              <p className="text-2xs text-fg-muted">{numero(totalMensagens)} mensagem(ns) no total</p>
            </header>

            {salas.isError && (
              <div className="p-3">
                <Alerta tom="danger" titulo="Não foi possível carregar as salas">
                  {mensagemErro(salas.error)}
                </Alerta>
              </div>
            )}

            <div className="max-h-[62vh] flex-1 overflow-y-auto p-1.5 scroll-thin">
              {salas.isLoading ? (
                <div className="p-2">
                  <Esqueleto linhas={5} />
                </div>
              ) : salasFiltradas.length === 0 ? (
                <Vazio
                  icone={MessagesSquare}
                  titulo="Nenhuma sala encontrada"
                  descricao="Crie uma sala de projeto ou de equipe para centralizar a conversa."
                  acao={
                    <Botao variante="primario" tamanho="sm" icone={Plus} onClick={() => definirModalSala(true)}>
                      Nova sala
                    </Botao>
                  }
                  className="py-8"
                />
              ) : (
                <ul className="space-y-1">
                  {salasFiltradas.map((sala) => {
                    const ativa = sala.id === salaSelecionada;
                    const ultima = sala.ultima_mensagem;
                    return (
                      <li key={sala.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-current={ativa}
                          onClick={() => definirSalaSelecionada(sala.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") definirSalaSelecionada(sala.id);
                          }}
                          className={
                            "flex w-full cursor-pointer items-start gap-2.5 rounded-sgp p-2 text-left transition-colors " +
                            (ativa ? "bg-brand-soft/50 ring-1 ring-brand/40" : "hover:bg-surface-2")
                          }
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-sgp" style={{ backgroundColor: (sala.cor || "#6366F1") + "1f", color: sala.cor || "#6366F1" }}>
                            <Hash className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-semibold text-fg">{sala.nome}</span>
                              {ultima && <span className="shrink-0 text-[10px] text-fg-subtle">{dataRelativa(ultima.criado_em)}</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-2xs text-fg-muted">
                              {ultima ? ultima.autor + ": " + ultima.texto : sala.project_nome || "Sem mensagens ainda"}
                            </span>
                            <span className="mt-1 flex items-center gap-1.5">
                              <Etiqueta tom="neutral">{sala.tipo}</Etiqueta>
                              {sala.participantes_detalhe && sala.participantes_detalhe.length > 0 && (
                                <PilhaAvatares
                                  pessoas={sala.participantes_detalhe.map((p) => ({
                                    id: p.id,
                                    nome: p.nome,
                                    cor: p.cor,
                                    iniciais: p.iniciais,
                                    avatar_display: p.avatar_display,
                                  }))}
                                  maximo={3}
                                  tamanho="xs"
                                />
                              )}
                            </span>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section className="flex min-h-[62vh] flex-col rounded-sgp-lg border border-border bg-surface shadow-n1">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-fg">{salaAtual ? salaAtual.nome : "Selecione uma sala"}</h2>
                <p className="mt-0.5 truncate text-2xs text-fg-muted">
                  {salaAtual
                    ? (salaAtual.project_nome ? salaAtual.project_nome + " · " : "") + numero(salaAtual.total_mensagens || 0) + " mensagem(ns)"
                    : "Escolha uma sala na lista ao lado para conversar com a equipe."}
                </p>
              </div>
              {participantesSala.length > 0 && (
                <PilhaAvatares
                  pessoas={participantesSala.map((p) => ({ id: p.id, nome: p.nome, cor: p.cor, iniciais: p.iniciais, avatar_display: p.avatar_display }))}
                  maximo={6}
                />
              )}
            </header>

            {conversa.isError && (
              <div className="p-3">
                <Alerta tom="danger" titulo="Não foi possível carregar as mensagens">
                  {mensagemErro(conversa.error)}
                </Alerta>
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-3.5 scroll-thin">
              {conversa.isLoading ? (
                <CarregandoBloco rotulo="Carregando conversa..." />
              ) : !salaSelecionada ? (
                <Vazio icone={MessagesSquare} titulo="Nenhuma sala selecionada" descricao="Escolha uma sala para ver as mensagens." />
              ) : mensagens.length === 0 ? (
                <Vazio icone={MessageSquare} titulo="Nenhuma mensagem ainda" descricao="Envie a primeira mensagem para iniciar a conversa desta sala." />
              ) : (
                mensagens.map((mensagem) => {
                  const minha = usuario ? mensagem.autor === usuario.id : false;
                  const resposta = mensagem.reply_to ? mapaMensagens.get(mensagem.reply_to) : undefined;
                  const reacoes = Object.entries(mensagem.reacoes || {});
                  return (
                    <article key={mensagem.id} className={"flex gap-2.5 " + (minha ? "flex-row-reverse" : "")}>
                      <Avatar
                        nome={mensagem.autor_detalhe?.nome}
                        cor={mensagem.autor_detalhe?.cor}
                        iniciais={mensagem.autor_detalhe?.iniciais}
                        url={mensagem.autor_detalhe?.avatar_display}
                        tamanho="sm"
                      />
                      <div className={"min-w-0 max-w-[78%] " + (minha ? "items-end text-right" : "")}>
                        <p className={"flex items-center gap-1.5 text-2xs text-fg-muted " + (minha ? "justify-end" : "")}>
                          <span className="font-semibold text-fg">{mensagem.autor_detalhe ? mensagem.autor_detalhe.nome : "Usuário"}</span>
                          <span>{dataHora(mensagem.criado_em)}</span>
                          {mensagem.editada && <span className="italic">editada</span>}
                        </p>

                        {resposta && (
                          <p className="mt-1 truncate rounded-sgp border-l-2 border-border-strong bg-surface-2 px-2 py-1 text-2xs text-fg-muted">
                            <CornerUpLeft className="mr-1 inline size-3" aria-hidden />
                            {resposta.autor_detalhe ? resposta.autor_detalhe.nome : "Usuário"}: {resposta.texto}
                          </p>
                        )}

                        {editandoId === mensagem.id ? (
                          <div className="mt-1 space-y-2 rounded-sgp-lg border border-border bg-surface-2 p-2 text-left">
                            <AreaTexto
                              rows={2}
                              value={textoEdicao}
                              autoFocus
                              aria-label="Editar mensagem"
                              onChange={(e) => definirTextoEdicao(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") definirEditandoId(null);
                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) salvarEdicao(mensagem.id);
                              }}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Botao
                                tamanho="sm"
                                variante="primario"
                                icone={Check}
                                carregando={editarMensagem.isPending}
                                disabled={!textoEdicao.trim()}
                                onClick={() => salvarEdicao(mensagem.id)}
                              >
                                Salvar
                              </Botao>
                              <Botao
                                tamanho="sm"
                                variante="fantasma"
                                icone={X}
                                onClick={() => {
                                  definirEditandoId(null);
                                  definirTextoEdicao("");
                                }}
                              >
                                Cancelar
                              </Botao>
                              <span className="text-[10px] text-fg-subtle">Ctrl+Enter salva · Esc cancela</span>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={
                              "mt-1 inline-block rounded-sgp-lg px-3 py-2 text-xs leading-relaxed " +
                              (minha ? "bg-brand text-brand-fg" : "border border-border bg-surface-2 text-fg")
                            }
                          >
                            <p className="whitespace-pre-line text-left">{mensagem.texto}</p>
                          </div>
                        )}

                        {mensagem.mencoes_detalhe && mensagem.mencoes_detalhe.length > 0 && (
                          <p className={"mt-1 flex flex-wrap items-center gap-1 " + (minha ? "justify-end" : "")}>
                            {mensagem.mencoes_detalhe.map((p) => (
                              <Chip key={p.id} cor={p.cor} icone={AtSign}>
                                {p.nome_curto || p.nome}
                              </Chip>
                            ))}
                          </p>
                        )}

                        <div className={"mt-1 flex flex-wrap items-center gap-1 " + (minha ? "justify-end" : "")}>
                          {reacoes.map(([emoji, pessoas]) => (
                            <Chip
                              key={emoji}
                              cor={usuario && pessoas.includes(usuario.id) ? "#2563EB" : "#64748B"}
                              ativo={usuario ? pessoas.includes(usuario.id) : false}
                              onClick={() => alternarReacao(mensagem, emoji)}
                            >
                              {emoji} {pessoas.length}
                            </Chip>
                          ))}
                          <span className="group relative">
                            <BotaoIcone icone={Smile} rotulo="Reagir" tamanho="xs" />
                            <span className="absolute bottom-full left-0 z-20 mb-1 hidden gap-1 rounded-sgp border border-border bg-surface p-1.5 shadow-n3 group-hover:flex group-focus-within:flex">
                              {EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => alternarReacao(mensagem, emoji)}
                                  className="rounded-md px-1 text-base transition-transform hover:scale-125"
                                  aria-label={"Reagir com " + emoji}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </span>
                          </span>
                          <BotaoIcone icone={CornerUpLeft} rotulo="Responder em thread" tamanho="xs" onClick={() => definirRespondendo(mensagem)} />
                          {podeGerenciarMensagem(mensagem) && (
                            <>
                              <BotaoIcone
                                icone={Pencil}
                                rotulo="Editar mensagem"
                                tamanho="xs"
                                onClick={() => {
                                  definirEditandoId(mensagem.id);
                                  definirTextoEdicao(mensagem.texto);
                                }}
                              />
                              <BotaoIcone
                                icone={Trash2}
                                rotulo="Excluir mensagem"
                                tamanho="xs"
                                className="hover:text-danger"
                                onClick={() => definirExcluindo(mensagem)}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}

              {salaSelecionada && (
                <SecaoColapsavel titulo="Anexos da sala" icone={Paperclip} abertoInicial={false}>
                  <ListaAnexos
                    entidade="collab.sala"
                    objetoId={salaSelecionada}
                    chaveInvalidar={["salas", salaSelecionada, "mensagens"]}
                    compacto
                  />
                </SecaoColapsavel>
              )}
            </div>

            <footer className="border-t border-border p-3">
              {respondendo && (
                <div className="mb-2 flex items-center gap-2 rounded-sgp border-l-2 border-brand bg-surface-2 px-2.5 py-1.5">
                  <CornerUpLeft className="size-3.5 shrink-0 text-brand" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-2xs text-fg-muted">
                    Respondendo {respondendo.autor_detalhe ? respondendo.autor_detalhe.nome : "mensagem"}: {respondendo.texto}
                  </span>
                  <BotaoIcone icone={X} rotulo="Cancelar resposta" tamanho="xs" onClick={() => definirRespondendo(null)} />
                </div>
              )}

              {sugestoesMencao.length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-1.5 rounded-sgp border border-border bg-surface-2 p-2">
                  {sugestoesMencao.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => inserirMencao(p)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-1 text-2xs text-fg transition-colors hover:border-brand hover:text-brand"
                      >
                        <Avatar nome={p.nome} cor={p.cor} iniciais={p.iniciais} tamanho="xs" />
                        {p.nome}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-end gap-2">
                <AreaTexto
                  rows={2}
                  value={texto}
                  disabled={!salaSelecionada}
                  placeholder={salaSelecionada ? "Escreva uma mensagem... use @ para mencionar alguém" : "Selecione uma sala para escrever"}
                  onChange={(e) => definirTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviarMensagem();
                    }
                  }}
                  className="flex-1"
                />
                <Botao variante="primario" icone={Send} carregando={enviar.isPending} disabled={!texto.trim() || !salaSelecionada} onClick={enviarMensagem}>
                  Enviar
                </Botao>
              </div>
              <p className="mt-1.5 text-2xs text-fg-subtle">
                Enter envia · Shift + Enter quebra linha
                {mencoes.length > 0 ? " · " + numero(mencoes.length) + " pessoa(s) mencionada(s)" : ""}
              </p>
            </footer>
          </section>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
            <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
              <Filter className="size-3.5" aria-hidden />
              Filtrar por entidade
            </span>
            <Selecao value={filtroEntidade} onChange={(e) => definirFiltroEntidade(e.target.value)} className="h-8 w-56 text-xs">
              <option value="">Todas as entidades</option>
              {Object.entries(ROTULO_ENTIDADE).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </Selecao>
            <div className="ml-auto flex items-center gap-2">
              <Etiqueta tom="info" icone={Activity}>
                {numero((atividades.data || []).length)} eventos
              </Etiqueta>
              <Botao variante="secundario" tamanho="sm" icone={RefreshCw} onClick={() => atividades.refetch()} carregando={atividades.isFetching}>
                Atualizar
              </Botao>
            </div>
          </div>

          {atividades.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar as atividades">
              {mensagemErro(atividades.error)}
            </Alerta>
          )}

          {atividades.isLoading ? (
            <CarregandoBloco rotulo="Carregando feed de atividades..." />
          ) : (atividades.data || []).length === 0 ? (
            <Vazio
              icone={Activity}
              titulo="Nenhuma atividade registrada"
              descricao="As ações da equipe em tarefas, riscos, alocações e projetos aparecem aqui em ordem cronológica."
            />
          ) : (
            <ol className="relative space-y-2 pl-6">
              <span className="absolute left-2.5 top-2 h-[calc(100%-1rem)] w-px bg-border" aria-hidden />
              {(atividades.data || []).map((item) => (
                <li key={item.id} className="relative">
                  <span
                    className="absolute -left-[18px] top-2 size-3 rounded-full ring-4 ring-surface"
                    style={{ backgroundColor: item.user_cor || "#64748B" }}
                    aria-hidden
                  />
                  <div className="flex items-start gap-2.5 rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
                    <Avatar nome={item.user_nome} cor={item.user_cor} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-fg">
                        <span className="font-semibold">{item.user_nome}</span> {item.verbo}{" "}
                        {item.entidade_nome && <span className="font-medium text-brand">{item.entidade_nome}</span>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-fg-muted">
                        <Etiqueta tom="neutral" icone={Layers}>
                          {ROTULO_ENTIDADE[item.entidade] || item.entidade}
                        </Etiqueta>
                        {item.projeto_id && (
                          <button
                            type="button"
                            onClick={() => navegar("/projetos/" + item.projeto_id)}
                            className="font-medium text-brand hover:underline"
                          >
                            abrir projeto
                          </button>
                        )}
                        <span>· {dataRelativa(item.criado_em)}</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <Modal
        aberto={modalSala}
        onFechar={() => definirModalSala(false)}
        titulo="Nova sala"
        subtitulo="Crie um canal para um projeto, uma equipe ou um assunto"
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirModalSala(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Plus} carregando={criarSala.isPending} disabled={!novaSala.nome.trim()} onClick={salvarSala}>
              Criar sala
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome da sala" obrigatorio htmlFor="sala-nome">
              <Entrada id="sala-nome" value={novaSala.nome} placeholder="Ex.: Squad Pagamentos" onChange={(e) => definirNovaSala({ ...novaSala, nome: e.target.value })} />
            </Campo>
            <Campo rotulo="Tipo" htmlFor="sala-tipo">
              <Selecao id="sala-tipo" value={novaSala.tipo} onChange={(e) => definirNovaSala({ ...novaSala, tipo: e.target.value })}>
                {TIPOS_SALA.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Projeto vinculado" htmlFor="sala-projeto" className="sm:col-span-2" dica="Opcional — salas de área ou equipe podem ficar sem projeto.">
              <Selecao id="sala-projeto" value={novaSala.project} onChange={(e) => definirNovaSala({ ...novaSala, project: e.target.value })}>
                <option value="">Sem projeto</option>
                {(projetos.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Descrição" htmlFor="sala-descricao" className="sm:col-span-2">
              <AreaTexto id="sala-descricao" rows={2} value={novaSala.descricao} onChange={(e) => definirNovaSala({ ...novaSala, descricao: e.target.value })} />
            </Campo>
          </div>

          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-fg">
              <Users className="size-3.5" aria-hidden />
              Participantes
              {novaSala.participantes.length > 0 && <span className="text-2xs font-normal text-fg-muted">({novaSala.participantes.length} selecionado(s))</span>}
            </p>
            <ul className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-sgp border border-border bg-surface-2 p-2 scroll-thin">
              {(usuarios.data || []).map((u) => {
                const selecionado = novaSala.participantes.includes(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() =>
                        definirNovaSala({
                          ...novaSala,
                          participantes: selecionado
                            ? novaSala.participantes.filter((i) => i !== u.id)
                            : novaSala.participantes.concat(u.id),
                        })
                      }
                      className={
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-2xs transition-colors " +
                        (selecionado ? "border-brand bg-brand-soft/60 text-brand" : "border-border bg-surface text-fg-muted hover:border-border-strong")
                      }
                    >
                      <Avatar nome={u.nome} cor={u.cor} iniciais={u.iniciais} tamanho="xs" />
                      {u.nome}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-2xs text-fg-subtle">
            Os participantes selecionados passam a ver a sala na lista e recebem notificação quando forem mencionados com @.
          </p>
        </div>
      </Modal>

      <Modal
        aberto={excluindo !== null}
        onFechar={() => definirExcluindo(null)}
        titulo="Excluir mensagem"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => definirExcluindo(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} carregando={excluirMensagem.isPending} onClick={confirmarExclusaoMensagem}>
              Excluir mensagem
            </Botao>
          </>
        }
      >
        <p className="text-2xs text-fg-muted">
          A mensagem e as respostas em thread ligadas a ela saem da conversa desta sala.
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

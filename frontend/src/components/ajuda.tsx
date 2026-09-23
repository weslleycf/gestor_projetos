import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  HelpCircle,
  Info,
  Lightbulb,
  ListOrdered,
  MousePointerClick,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import {
  Alerta,
  Botao,
  BotaoIcone,
  Chip,
  Dica,
  Etiqueta,
  PainelLateral,
  useAvisos,
} from "@/components/ui";
import { useConsulta } from "@/hooks";
import { api } from "@/lib/api";
import {
  CHAVE_AJUDA,
  CHAVE_DICA_DISPENSADA,
  CHAVE_VISITAS,
  dispensarDica,
  iconeDoGuia,
  marcarTelaVisitada,
  telaJaVisitada,
  urlDoManual,
  type GuiaAjuda,
  type RespostaGuiaRota,
} from "@/lib/ajuda";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Estado global leve do painel de ajuda
   ========================================================================== */

type Ouvinte = (aberto: boolean) => void;
const ouvintes = new Set<Ouvinte>();

export function abrirAjuda() {
  ouvintes.forEach((fn) => fn(true));
}

export function useAjudaControlada() {
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

/** Busca o guia da tela atual. */
export function useGuiaDaRota(rota: string, ativo = true) {
  return useConsulta<RespostaGuiaRota>(
    [...CHAVE_AJUDA, "rota", rota],
    ativo ? "/ajuda/por-rota/" : null,
    { rota },
    { enabled: ativo, staleTime: 5 * 60_000 }
  );
}

/* ==========================================================================
   Seções do guia
   ========================================================================== */

function Secao({
  titulo,
  icone: Icone,
  children,
  contagem,
}: {
  titulo: string;
  icone: typeof Info;
  children: React.ReactNode;
  contagem?: number;
}) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-fg-subtle">
        <Icone className="size-3.5 shrink-0" aria-hidden />
        {titulo}
        {contagem !== undefined && <span className="font-normal normal-case">({contagem})</span>}
      </h4>
      {children}
    </section>
  );
}

function ListaItens({ itens, tipo }: { itens: Array<{ nome: string; descricao: string; dica?: string; leitura?: string }>; tipo: "campo" | "indicador" | "elemento" }) {
  const cores = { campo: "#2563EB", indicador: "#059669", elemento: "#8B5CF6" };
  return (
    <ul className="space-y-1.5">
      {itens.map((item, indice) => (
        <li key={item.nome + indice} className="rounded-sgp border border-border bg-surface-2 p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: cores[tipo] }} />
            {item.nome}
          </p>
          <p className="mt-0.5 text-2xs leading-relaxed text-fg-muted">{item.descricao}</p>
          {item.leitura && (
            <p className="mt-1 text-2xs leading-relaxed text-fg-muted">
              <span className="font-semibold text-fg">Como ler: </span>
              {item.leitura}
            </p>
          )}
          {item.dica && (
            <p className="mt-1 flex items-start gap-1 text-2xs leading-relaxed text-warning">
              <Lightbulb className="mt-0.5 size-3 shrink-0" aria-hidden />
              {item.dica}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ==========================================================================
   Painel de ajuda contextual
   ========================================================================== */

export function PainelAjuda({
  guiaForcado,
  carregandoForcado = false,
  abertoForcado,
  onFecharForcado,
}: {
  /** Exibe um guia específico em vez do guia da rota atual. */
  guiaForcado?: GuiaAjuda | null;
  /** O guia avulso ainda está sendo buscado. */
  carregandoForcado?: boolean;
  abertoForcado?: boolean;
  onFecharForcado?: () => void;
} = {}) {
  const controlado = useAjudaControlada();
  const aberto = abertoForcado ?? controlado.aberto;
  const setAberto = (valor: boolean) => {
    if (valor === false && onFecharForcado) onFecharForcado();
    else controlado.setAberto(valor);
  };
  const local = useLocation();
  const navegar = useNavigate();
  const { sucesso } = useAvisos();
  const { data, isLoading } = useGuiaDaRota(local.pathname, aberto && !guiaForcado);

  const guia = guiaForcado ?? data?.guia;
  // Ao exibir um guia avulso (vindo da central) não há lista de relacionados.
  const relacionados = guiaForcado ? [] : (data?.relacionados ?? []);
  // Telas de detalhe (/skills/:id, /usuarios/:userId) não abrem sem um
  // identificador, então ficam fora dos atalhos: mostramos só o que é
  // alcançável a partir daqui.
  const alcancaveis = relacionados.filter((outro) => !outro.rota.includes(":"));
  const Icone = iconeDoGuia(guia?.icone);
  const [voto, setVoto] = useState<boolean | null>(null);

  useEffect(() => {
    setVoto(data?.meu_feedback ? data.meu_feedback.util : null);
  }, [data]);

  const avaliar = async (util: boolean) => {
    if (!guia) return;
    try {
      await api.post("/ajuda/" + guia.id + "/feedback/", { util });
      setVoto(util);
      sucesso(util ? "Obrigado pelo retorno!" : "Retorno registrado", util ? "Que bom que ajudou." : "Vamos revisar este guia.");
    } catch {
      /* silencioso: a avaliação é opcional */
    }
  };

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={() => setAberto(false)}
      largura="lg"
      titulo={
        <span className="flex items-center gap-2">
          <Icone className="size-4 shrink-0 text-brand" aria-hidden />
          {guia ? guia.titulo : "Ajuda desta tela"}
        </span>
      }
      subtitulo={guia ? guia.grupo + " · guia de uso" : "Como usar esta página"}
      rodape={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xs text-fg-muted">Este guia ajudou?</span>
            <BotaoIcone
              icone={ThumbsUp}
              rotulo="Sim, ajudou"
              tamanho="sm"
              ativo={voto === true}
              onClick={() => avaliar(true)}
            />
            <BotaoIcone
              icone={ThumbsDown}
              rotulo="Não ajudou"
              tamanho="sm"
              ativo={voto === false}
              onClick={() => avaliar(false)}
            />
          </div>
          <div className="flex items-center gap-2">
            {guia?.doc && (
              <Botao
                variante="secundario"
                tamanho="sm"
                icone={BookOpen}
                onClick={() => {
                  // Navega para o leitor interno do manual na mesma aba.
                  setAberto(false);
                  navegar(urlDoManual(guia.doc));
                }}
              >
                Capítulo do manual
              </Botao>
            )}
            <Botao variante="fantasma" tamanho="sm" onClick={() => { setAberto(false); navegar("/ajuda"); }}>
              Central de ajuda
            </Botao>
          </div>
        </div>
      }
    >
      {(isLoading || carregandoForcado) && (
        <p className="py-10 text-center text-xs text-fg-muted">Carregando o guia...</p>
      )}

      {!isLoading && !carregandoForcado && !guia && (
        <div className="space-y-3">
          <Alerta tom="info" icone={CircleHelp} titulo="Ainda não há um guia para esta tela">
            {data?.mensagem || "Consulte a central de ajuda para ver todos os guias disponíveis."}
          </Alerta>
          <Botao variante="primario" icone={HelpCircle} larguraTotal onClick={() => { setAberto(false); navegar("/ajuda"); }}>
            Abrir a central de ajuda
          </Botao>
        </div>
      )}

      {guia && (
        <div className="space-y-5">
          <p className="rounded-sgp-lg border border-brand/30 bg-brand-soft/40 p-3 text-xs leading-relaxed text-fg">
            {guia.para_que_serve}
          </p>

          {guia.quando_usar?.length > 0 && (
            <Secao titulo="Quando usar" icone={MousePointerClick}>
              <ul className="space-y-1.5">
                {guia.quando_usar.map((item, indice) => (
                  <li key={indice} className="flex items-start gap-2 text-xs text-fg-muted">
                    <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {guia.passos?.length > 0 && (
            <Secao titulo="Passo a passo" icone={ListOrdered} contagem={guia.passos.length}>
              <ol className="space-y-2">
                {guia.passos.map((passo, indice) => {
                  const IconePasso = passo.icone ? iconeDoGuia(passo.icone) : null;
                  return (
                    <li key={indice} className="flex gap-2.5">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-fg">
                        {indice + 1}
                      </span>
                      <div className="min-w-0 flex-1 rounded-sgp border border-border bg-surface-2 p-2.5">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                          {IconePasso && <IconePasso className="size-3.5 shrink-0 text-brand" aria-hidden />}
                          {passo.titulo}
                        </p>
                        <p className="mt-1 text-2xs leading-relaxed text-fg-muted">{passo.detalhe}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Secao>
          )}

          {guia.elementos?.length > 0 && (
            <Secao titulo="Elementos da tela" icone={Sparkles}>
              <ListaItens itens={guia.elementos} tipo="elemento" />
            </Secao>
          )}

          {guia.campos?.length > 0 && (
            <Secao titulo="Campos e o que significam" icone={Info} contagem={guia.campos.length}>
              <ListaItens itens={guia.campos} tipo="campo" />
            </Secao>
          )}

          {guia.indicadores?.length > 0 && (
            <Secao titulo="Como ler os indicadores" icone={Check} contagem={guia.indicadores.length}>
              <ListaItens itens={guia.indicadores} tipo="indicador" />
            </Secao>
          )}

          {guia.dicas?.length > 0 && (
            <Secao titulo="Dicas" icone={Lightbulb}>
              <ul className="space-y-1.5">
                {guia.dicas.map((item, indice) => (
                  <li key={indice} className="flex items-start gap-2 rounded-sgp border border-warning/30 bg-warning-soft/40 p-2.5 text-2xs leading-relaxed text-fg">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {guia.atalhos?.length > 0 && (
            <Secao titulo="Atalhos" icone={MousePointerClick}>
              <ul className="space-y-1.5">
                {guia.atalhos.map((atalho, indice) => (
                  <li key={indice} className="flex items-center gap-2 text-2xs text-fg-muted">
                    <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-fg">
                      {atalho.tecla}
                    </kbd>
                    {atalho.acao}
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {guia.limitacoes?.length > 0 && (
            <Secao titulo="O que esta tela não faz" icone={ShieldAlert}>
              <ul className="space-y-1.5">
                {guia.limitacoes.map((item, indice) => (
                  <li key={indice} className="flex items-start gap-2 rounded-sgp border border-border bg-surface-2 p-2.5 text-2xs leading-relaxed text-fg-muted">
                    <X className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {alcancaveis.length > 0 && (
            <Secao titulo="Outras telas deste grupo" icone={BookOpen}>
              <div className="flex flex-wrap gap-1.5">
                {alcancaveis.map((outro) => (
                  <Chip
                    key={outro.id}
                    cor="#6366F1"
                    icone={iconeDoGuia(outro.icone)}
                    onClick={() => {
                      setAberto(false);
                      navegar(outro.rota);
                    }}
                  >
                    {outro.titulo}
                  </Chip>
                ))}
              </div>
            </Secao>
          )}

          <p className="border-t border-border pt-3 text-[10px] leading-relaxed text-fg-subtle">
            Guia da tela {guia.rota} · {guia.visualizacoes} consulta(s) · atualizado em{" "}
            {new Date(guia.atualizado_em).toLocaleDateString("pt-BR")}
          </p>
        </div>
      )}
    </PainelLateral>
  );
}

/* ==========================================================================
   Botão de ajuda da barra superior
   ========================================================================== */

export function BotaoAjuda() {
  const local = useLocation();
  const [novidade, setNovidade] = useState(false);

  useEffect(() => {
    // Marca a visita e sinaliza com um pulso quando a tela é nova para o usuário.
    const primeira = marcarTelaVisitada(local.pathname);
    setNovidade(primeira && !telaJaVisitada(local.pathname));
  }, [local.pathname]);

  return (
    <Dica texto="Guia desta tela (F1)">
      <button
        type="button"
        onClick={abrirAjuda}
        aria-label="Abrir o guia desta tela"
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-sgp transition-all active:scale-95",
          "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg"
        )}
      >
        <CircleHelp className="size-4" aria-hidden />
        {novidade && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand animate-pulso-alerta" aria-hidden />
        )}
      </button>
    </Dica>
  );
}

/* ==========================================================================
   Dica de primeira visita
   ========================================================================== */

export function DicaPrimeiraVisita() {
  const local = useLocation();
  const navegar = useNavigate();
  const [visivel, setVisivel] = useState(false);
  const { data } = useGuiaDaRota(local.pathname, visivel);

  useEffect(() => {
    if (window.localStorage.getItem(CHAVE_DICA_DISPENSADA) === "1") {
      setVisivel(false);
      return;
    }
    const jaVista = telaJaVisitada(local.pathname);
    const temporizador = window.setTimeout(() => setVisivel(!jaVista), 1200);
    return () => window.clearTimeout(temporizador);
  }, [local.pathname]);

  const guia = data?.guia;

  if (!visivel || !guia) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-sgp-lg border border-brand/30 bg-brand-soft/40 px-3.5 py-2.5 animate-entrada">
      <CircleHelp className="size-4 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-xs text-fg">
        <span className="font-semibold">Primeira vez nesta tela?</span>{" "}
        <span className="text-fg-muted">
          {guia.resumo} Existe um guia com o passo a passo.
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Botao variante="primario" tamanho="sm" icone={BookOpen} onClick={abrirAjuda}>
          Ver o guia
        </Botao>
        <Botao
          variante="fantasma"
          tamanho="sm"
          onClick={() => {
            dispensarDica();
            setVisivel(false);
          }}
        >
          Não mostrar de novo
        </Botao>
        <BotaoIcone icone={X} rotulo="Fechar" tamanho="sm" onClick={() => setVisivel(false)} />
      </div>
    </div>
  );
}

/** Atalho global: F1 abre o guia da tela. */
export function useAtalhoAjuda() {
  useEffect(() => {
    const handler = (evento: KeyboardEvent) => {
      if (evento.key === "F1" || (evento.shiftKey && evento.key === "/")) {
        evento.preventDefault();
        abrirAjuda();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

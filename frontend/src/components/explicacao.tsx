import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, Lightbulb, Sigma, TrendingUp, X } from "lucide-react";
import {
  assinarExplicacoes,
  carregarExplicacoes,
  explicacaoDe,
  explicacoesCarregadas,
  type Explicacao,
} from "@/lib/explicacoes";
import { cn } from "@/lib/utils";

/**
 * Garante o catálogo carregado e redesenha o componente quando ele chega.
 *
 * O catálogo é baixado sob demanda (fora do pacote inicial), então os botões de
 * ajuda aparecem assim que o primeiro pedaço termina de carregar.
 */
export function useExplicacoes(): boolean {
  // Estado React, e não uma assinatura externa: o primeiro render acontece antes
  // de o catálogo chegar, então o componente precisa de um redesenho garantido
  // quando o carregamento termina. Com subscrição externa o botão simplesmente
  // não aparecia.
  const [prontas, definirProntas] = useState(explicacoesCarregadas());

  useEffect(() => {
    if (explicacoesCarregadas()) {
      definirProntas(true);
      return;
    }
    const cancelar = assinarExplicacoes(() => definirProntas(true));
    carregarExplicacoes().finally(() => definirProntas(explicacoesCarregadas()));
    return cancelar;
  }, []);

  return prontas;
}

/* ==========================================================================
   Explicação de card
   --------------------------------------------------------------------------
   Um botão "?" que abre o texto do catálogo. O painel é desenhado em um portal
   porque muitos cards usam overflow-hidden — sem o portal, a explicação seria
   cortada exatamente nos cards em que ela é mais necessária.
   ========================================================================== */

export function ConteudoExplicacao({ explicacao }: { explicacao: Explicacao }) {
  return (
    <div className="space-y-2.5 text-2xs leading-relaxed">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-fg">{explicacao.termo}</p>
        <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
          {explicacao.categoria}
        </span>
      </div>

      <p className="text-fg-muted">{explicacao.o_que_e}</p>

      {explicacao.formula && (
        <p className="flex items-center gap-1.5 rounded-sgp border border-border bg-surface-2 px-2 py-1.5 font-mono text-[10px] text-fg">
          <Sigma className="size-3 shrink-0 text-brand" aria-hidden />
          {explicacao.formula}
        </p>
      )}

      {explicacao.como_ler && (
        <div>
          <p className="mb-0.5 flex items-center gap-1 font-semibold text-fg">
            <TrendingUp className="size-3 shrink-0 text-brand" aria-hidden />
            Como ler
          </p>
          <p className="text-fg-muted">{explicacao.como_ler}</p>
        </div>
      )}

      {explicacao.o_que_fazer && (
        <div>
          <p className="mb-0.5 flex items-center gap-1 font-semibold text-fg">
            <Lightbulb className="size-3 shrink-0 text-warning" aria-hidden />
            O que fazer
          </p>
          <p className="text-fg-muted">{explicacao.o_que_fazer}</p>
        </div>
      )}

      {explicacao.exemplo && (
        <p className="rounded-sgp border border-border bg-surface-2 px-2 py-1.5 text-fg-muted">
          <span className="font-semibold text-fg">Exemplo: </span>
          {explicacao.exemplo}
        </p>
      )}

      {explicacao.fonte && (
        <p className="border-t border-border pt-1.5 text-[10px] text-fg-subtle">{explicacao.fonte}</p>
      )}
    </div>
  );
}

/**
 * Botão "?" com a explicação do termo informado.
 * Não desenha nada quando não existe explicação cadastrada.
 */
export function BotaoExplicacao({
  termo,
  explicacao,
  className,
  rotuloAcessivel,
}: {
  /** Rótulo exibido no card — a chave de busca no catálogo. */
  termo?: string;
  /** Explicação pronta, quando a página quer fornecer o texto. */
  explicacao?: Explicacao;
  className?: string;
  rotuloAcessivel?: string;
}) {
  useExplicacoes();
  const alvo = explicacao ?? explicacaoDe(termo);
  const botao = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ topo: 0, esquerda: 0 });

  const reposicionar = () => {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const largura = 320;
    const altura = 300;
    let esquerda = r.right - largura;
    if (esquerda < 8) esquerda = 8;
    if (esquerda + largura > window.innerWidth - 8) esquerda = window.innerWidth - largura - 8;
    // Abre para baixo; se não couber, abre para cima.
    let topo = r.bottom + 6;
    if (topo + altura > window.innerHeight - 8) topo = Math.max(8, r.top - altura - 6);
    setPosicao({ topo, esquerda });
  };

  useEffect(() => {
    if (!aberto) return;
    reposicionar();
    const fechar = (e: MouseEvent) => {
      if (!botao.current?.contains(e.target as Node)) setAberto(false);
    };
    const escapar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    const rolar = () => setAberto(false);
    document.addEventListener("mousedown", fechar);
    document.addEventListener("keydown", escapar);
    window.addEventListener("scroll", rolar, true);
    window.addEventListener("resize", rolar);
    return () => {
      document.removeEventListener("mousedown", fechar);
      document.removeEventListener("keydown", escapar);
      window.removeEventListener("scroll", rolar, true);
      window.removeEventListener("resize", rolar);
    };
  }, [aberto]);

  if (!alvo) return null;

  return (
    <>
      <button
        ref={botao}
        type="button"
        aria-label={rotuloAcessivel || "O que significa " + alvo.termo}
        aria-expanded={aberto}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setAberto((v) => !v);
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          "inline-grid size-4 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-2",
          "text-fg-subtle transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand",
          aberto && "border-brand bg-brand-soft text-brand",
          className
        )}
      >
        <HelpCircle className="size-2.5" aria-hidden />
      </button>

      {aberto &&
        createPortal(
          <div
            role="dialog"
            aria-label={"Explicação de " + alvo.termo}
            style={{ top: posicao.topo, left: posicao.esquerda, width: 320 }}
            className="fixed z-[90] rounded-sgp-lg border border-border bg-surface p-3 shadow-n3 animate-entrada"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAberto(false)}
              aria-label="Fechar explicação"
              className="absolute right-2 top-2 rounded p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-3" aria-hidden />
            </button>
            <ConteudoExplicacao explicacao={alvo} />
          </div>,
          document.body
        )}
    </>
  );
}

/**
 * Envolve um card qualquer e acrescenta o botão de explicação no canto.
 * Use quando o card não for um indicador (cartão de projeto, de risco, etc.).
 */
export function CartaoExplicavel({
  termo,
  explicacao,
  titulo,
  descricao,
  children,
  className,
  acoes,
}: {
  termo?: string;
  explicacao?: Explicacao;
  titulo?: ReactNode;
  descricao?: string;
  children?: ReactNode;
  className?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className={cn("rounded-sgp-lg border border-border bg-surface shadow-n1", className)}>
      {(titulo || descricao || termo || explicacao) && (
        <header className="flex items-start justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="min-w-0">
            {titulo && <p className="truncate text-xs font-semibold text-fg">{titulo}</p>}
            {descricao && <p className="mt-0.5 text-2xs text-fg-muted">{descricao}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {acoes}
            <BotaoExplicacao termo={termo} explicacao={explicacao} />
          </div>
        </header>
      )}
      {children}
    </div>
  );
}

/**
 * Selo de ajuda para títulos de gráficos e blocos, quando só cabe uma linha.
 *
 * Usa o atributo nativo de título de propósito: este arquivo é importado por
 * componentes de base (indicadores e gráficos), então não pode depender de
 * outros componentes da interface — isso criaria um ciclo de importação.
 */
export function AjudaInline({ texto, className }: { texto: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={texto}
      title={texto}
      className={cn(
        "inline-grid size-3.5 shrink-0 cursor-help place-items-center rounded-full",
        "border border-border-strong text-fg-subtle transition-colors hover:border-brand hover:text-brand",
        className
      )}
    >
      <HelpCircle className="size-2.5" aria-hidden />
    </span>
  );
}

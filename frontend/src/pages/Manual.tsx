import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Printer,
} from "lucide-react";
import {
  Alerta,
  Botao,
  CabecalhoPagina,
  CarregandoBloco,
  Esqueleto,
  Vazio,
} from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { useConsulta } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { urlDoManual } from "@/lib/ajuda";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Leitor do manual do SGP
   --------------------------------------------------------------------------
   A rota (/ajuda/manual/:arquivo) é registrada em App.tsx. O conteúdo vem da
   API de ajuda em Markdown puro e é renderizado pelo interpretador próprio de
   @/components/markdown, sem biblioteca externa e sem injetar HTML.
   ========================================================================== */

interface DocumentoManual {
  arquivo: string;
  titulo: string;
  conteudo: string;
}

interface ResumoDocumento {
  arquivo: string;
  titulo: string;
  ordem?: number;
  linhas?: number;
}

export default function Manual() {
  const { arquivo } = useParams<{ arquivo: string }>();
  const navegar = useNavigate();
  const raiz = useRef<HTMLDivElement>(null);
  const [indiceAberto, setIndiceAberto] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const documento = useConsulta<DocumentoManual>(
    ["ajuda", "manual", arquivo ?? ""],
    arquivo ? "/ajuda/manual/" + encodeURIComponent(arquivo) + "/" : null
  );
  const lista = useConsulta<{ documentos: ResumoDocumento[] }>(["ajuda", "manual"], "/ajuda/manual/");

  // Índice na ordem publicada pela API (o campo ordem é opcional).
  const documentos = useMemo(() => {
    const itens = lista.data?.documentos ?? [];
    return [...itens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [lista.data]);

  const posicao = documentos.findIndex((item) => item.arquivo === arquivo);
  const anterior = posicao > 0 ? documentos[posicao - 1] : null;
  const proximo = posicao >= 0 && posicao < documentos.length - 1 ? documentos[posicao + 1] : null;

  /**
   * O conteúdo do arquivo começa com o título do capítulo, que já aparece no
   * cabeçalho da página; a primeira linha de título é descartada para não
   * repetir a mesma informação duas vezes na tela.
   */
  const conteudo = useMemo(() => {
    const bruto = documento.data?.conteudo ?? "";
    const linhas = bruto.replace(/\r\n?/g, "\n").split("\n");
    let inicio = 0;
    while (inicio < linhas.length && !linhas[inicio].trim()) inicio++;
    if (inicio < linhas.length && /^#\s+/.test(linhas[inicio].trim())) {
      inicio++;
      while (inicio < linhas.length && !linhas[inicio].trim()) inicio++;
    }
    return linhas.slice(inicio).join("\n");
  }, [documento.data]);

  // Ao trocar de capítulo a leitura recomeça do topo.
  useEffect(() => {
    const rolagem = raiz.current?.closest("main");
    if (rolagem) rolagem.scrollTop = 0;
    else window.scrollTo({ top: 0 });
  }, [arquivo]);

  /**
   * Barra de progresso de leitura. O AppShell rola dentro do elemento main,
   * então o painel acompanha esse contêiner e cai para a janela se ele não
   * existir (por exemplo, se a página for usada fora do shell).
   */
  useEffect(() => {
    const rolagem = raiz.current?.closest("main") ?? null;
    const calcular = () => {
      if (rolagem) {
        const total = rolagem.scrollHeight - rolagem.clientHeight;
        setProgresso(total > 0 ? Math.min(100, Math.max(0, (rolagem.scrollTop / total) * 100)) : 0);
      } else {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        setProgresso(total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0);
      }
    };
    calcular();
    window.addEventListener("resize", calcular);
    if (rolagem) rolagem.addEventListener("scroll", calcular, { passive: true });
    else window.addEventListener("scroll", calcular, { passive: true });
    return () => {
      window.removeEventListener("resize", calcular);
      if (rolagem) rolagem.removeEventListener("scroll", calcular);
      else window.removeEventListener("scroll", calcular);
    };
  }, [arquivo, documento.data]);

  if (!arquivo) {
    return (
      <Vazio
        icone={BookOpen}
        titulo="Nenhum capítulo selecionado"
        descricao="Escolha um capítulo na central de ajuda para começar a leitura."
        acao={
          <Botao variante="primario" icone={ArrowLeft} onClick={() => navegar("/ajuda")}>
            Voltar para a central de ajuda
          </Botao>
        }
      />
    );
  }

  const titulo = documento.data?.titulo ?? "Manual do SGP";

  return (
    <div ref={raiz} className="space-y-5">
      <div
        className="sticky top-0 z-20 h-1 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-label="Progresso de leitura do capítulo"
        aria-valuenow={Math.round(progresso)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-brand transition-all duration-150" style={{ width: progresso + "%" }} />
      </div>

      <CabecalhoPagina
        titulo={titulo}
        subtitulo="Manual completo do SGP — leitura dentro da aplicação"
        icone={BookOpen}
        cor="#2563EB"
        migalhas={[
          { rotulo: "Central de ajuda", onClick: () => navegar("/ajuda") },
          { rotulo: "Manual" },
        ]}
        acoes={
          <>
            <Botao
              variante="secundario"
              tamanho="sm"
              icone={List}
              iconeDireita={ChevronDown}
              className="lg:hidden"
              onClick={() => setIndiceAberto((valor) => !valor)}
            >
              {indiceAberto ? "Ocultar índice" : "Índice (" + documentos.length + ")"}
            </Botao>
            <Botao variante="secundario" tamanho="sm" icone={ArrowLeft} onClick={() => navegar("/ajuda")}>
              Voltar para a central de ajuda
            </Botao>
            <Botao variante="secundario" tamanho="sm" icone={Printer} onClick={() => window.print()}>
              Imprimir
            </Botao>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={cn(indiceAberto ? "block" : "hidden", "lg:block lg:sticky lg:top-2 lg:self-start")}>
          <nav
            aria-label="Índice do manual"
            className="max-h-[65vh] space-y-0.5 overflow-y-auto rounded-sgp-lg border border-border bg-surface p-2 shadow-n1 scroll-thin lg:max-h-[calc(100vh-6rem)]"
          >
            <p className="px-2 py-1 text-2xs font-bold uppercase tracking-wide text-fg-subtle">Capítulos</p>
            {lista.isLoading && <Esqueleto linhas={6} className="px-2 py-2" />}
            {lista.isError && (
              <p className="px-2 py-1.5 text-2xs leading-relaxed text-danger">
                Não foi possível carregar o índice. Use os botões no fim do capítulo para navegar.
              </p>
            )}
            {documentos.map((item) => {
              const atual = item.arquivo === arquivo;
              return (
                <Link
                  key={item.arquivo}
                  to={urlDoManual(item.arquivo)}
                  aria-current={atual ? "page" : undefined}
                  className={cn(
                    "flex items-start gap-2 rounded-sgp px-2 py-1.5 text-xs transition-colors",
                    atual ? "bg-brand-soft font-semibold text-brand" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                  )}
                >
                  <span className="mt-0.5 w-4 shrink-0 text-right text-2xs tabular-nums text-fg-subtle">
                    {item.ordem ?? ""}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">{item.titulo}</span>
                    {item.linhas !== undefined && (
                      <span className="block text-2xs text-fg-subtle">{item.linhas} linhas</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <article className="min-w-0 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 sm:p-6">
          {documento.isLoading && <CarregandoBloco rotulo="Carregando o capítulo do manual..." />}

          {documento.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar o capítulo">
              {mensagemErro(documento.error)}
            </Alerta>
          )}

          {!documento.isLoading && !documento.isError && !documento.data && (
            <Vazio
              icone={BookOpen}
              titulo="Capítulo não encontrado"
              descricao="O arquivo solicitado não está disponível no manual publicado."
              acao={
                <Botao variante="primario" icone={ArrowLeft} onClick={() => navegar("/ajuda")}>
                  Voltar para a central de ajuda
                </Botao>
              }
            />
          )}

          {documento.data && (
            <>
              <Markdown conteudo={conteudo} />
              <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                {anterior ? (
                  <Botao variante="fantasma" tamanho="sm" icone={ChevronLeft} onClick={() => navegar(urlDoManual(anterior.arquivo))}>
                    {anterior.titulo}
                  </Botao>
                ) : (
                  <span />
                )}
                {proximo ? (
                  <Botao
                    variante="fantasma"
                    tamanho="sm"
                    iconeDireita={ChevronRight}
                    onClick={() => navegar(urlDoManual(proximo.arquivo))}
                  >
                    {proximo.titulo}
                  </Botao>
                ) : (
                  <span />
                )}
              </footer>
            </>
          )}
        </article>
      </div>
    </div>
  );
}

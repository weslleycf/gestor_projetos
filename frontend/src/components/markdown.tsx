import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Alerta, Tabela, type ColunaTabela } from "@/components/ui";
import { urlDoManual } from "@/lib/ajuda";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Leitor de Markdown do manual
   --------------------------------------------------------------------------
   Interpretador próprio, linha a linha, escrito para não acrescentar nenhuma
   dependência ao projeto. Cobre exatamente o subconjunto que os arquivos de
   docs/ usam (conferido lendo os documentos antes de escrever este código):
   títulos de # a ####, parágrafos com quebra suave, tabelas com alinhamento,
   listas com e sem numeração e um nível de aninhamento, negrito, itálico,
   código em linha, citações de atenção, réguas e links entre capítulos.

   Decisões de projeto:
   - nada de dangerouslySetInnerHTML: cada trecho vira elemento React, então
     o conteúdo do arquivo nunca é interpretado como HTML pelo navegador;
   - o documento é convertido em uma lista de blocos antes de renderizar, o
     que mantém o JSX simples e permite memoizar a análise;
   - o manual não usa blocos de código cercados, imagens, links de referência
     nem HTML embutido; ainda assim a cerca de código é tratada, porque o
     custo é baixo e evita que um capítulo futuro quebre a leitura.
   ========================================================================== */

/** Aspas inversas obtidas por código, sem escrever o caractere no arquivo. */
const CRASE = String.fromCharCode(96);
const CERCA = CRASE.repeat(3);

/* ==========================================================================
   Trechos em linha: negrito, itálico, código e links
   ========================================================================== */

/**
 * Fonte do reconhecedor de trechos em linha. A ordem das alternativas é a
 * precedência: código antes de negrito (para que asteriscos dentro de código
 * não sejam interpretados), negrito antes de itálico (para que os dois
 * asteriscos não sejam lidos como um itálico vazio) e link por último.
 */
const FONTE_TRECHO = [
  CRASE + "([^" + CRASE + "]+)" + CRASE,
  "\\*\\*([^*]+)\\*\\*",
  "\\*([^*]+)\\*",
  "\\[([^\\]]+)\\]\\(([^)]+)\\)",
].join("|");

/** Converte um trecho de texto em nós React, aplicando os marcadores. */
function emLinha(texto: string, prefixo: string): ReactNode[] {
  // Um novo reconhecedor a cada chamada: a função é recursiva (negrito dentro
  // de link, por exemplo) e o estado de lastIndex seria compartilhado.
  const re = new RegExp(FONTE_TRECHO, "g");
  const nos: ReactNode[] = [];
  let ultimo = 0;
  let contador = 0;
  let achado = re.exec(texto);
  while (achado) {
    if (achado.index > ultimo) nos.push(texto.slice(ultimo, achado.index));
    const chave = prefixo + "-t" + contador++;
    const codigo = achado[1];
    const negrito = achado[2];
    const italico = achado[3];
    const rotulo = achado[4];
    const destino = achado[5];
    if (codigo !== undefined) {
      nos.push(
        <code key={chave} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.85em] text-fg">
          {codigo}
        </code>
      );
    } else if (negrito !== undefined) {
      nos.push(
        <strong key={chave} className="font-semibold text-fg">
          {emLinha(negrito, chave)}
        </strong>
      );
    } else if (italico !== undefined) {
      nos.push(
        <em key={chave} className="italic">
          {emLinha(italico, chave)}
        </em>
      );
    } else if (rotulo !== undefined && destino !== undefined) {
      nos.push(
        <Vinculo key={chave} destino={destino}>
          {emLinha(rotulo, chave)}
        </Vinculo>
      );
    }
    ultimo = achado.index + achado[0].length;
    achado = re.exec(texto);
  }
  if (ultimo < texto.length) nos.push(texto.slice(ultimo));
  return nos;
}

/** Classe comum dos vínculos do texto. */
const CLASSE_VINCULO =
  "font-medium text-brand underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand";

/**
 * Vínculo do manual. Links para outro arquivo .md viram navegação interna do
 * leitor (mesma aba, sem recarregar a aplicação); links http(s) abrem em nova
 * aba, porque saem do sistema.
 */
function Vinculo({ destino, children }: { destino: string; children: ReactNode }) {
  if (/^https?:\/\//i.test(destino)) {
    return (
      <a href={destino} target="_blank" rel="noopener noreferrer" className={CLASSE_VINCULO}>
        {children}
      </a>
    );
  }
  // Âncora dentro do próprio capítulo: o navegador resolve sozinho.
  if (destino.startsWith("#")) {
    return (
      <a href={destino} className={CLASSE_VINCULO}>
        {children}
      </a>
    );
  }
  const arquivo = destino.split("#")[0];
  if (arquivo.toLowerCase().endsWith(".md")) {
    return (
      <Link to={urlDoManual(arquivo)} className={CLASSE_VINCULO}>
        {children}
      </Link>
    );
  }
  return (
    <a href={destino} className={CLASSE_VINCULO}>
      {children}
    </a>
  );
}

/* ==========================================================================
   Blocos do documento
   ========================================================================== */

type Alinhamento = "left" | "right" | "center" | undefined;

interface ItemLista {
  texto: string;
  ordenada: boolean;
  filhos: ItemLista[];
}

type Bloco =
  | { tipo: "titulo"; nivel: number; id: string; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: ItemLista[] }
  | { tipo: "citacao"; texto: string }
  | { tipo: "tabela"; cabecalho: string[]; alinhamentos: Alinhamento[]; linhas: string[][] }
  | { tipo: "regua" }
  | { tipo: "codigo"; texto: string };

const RE_TITULO = /^(#{1,6})\s+(.*)$/;
const RE_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const RE_REGUA = /^(?:-{3,}|\*{3,}|_{3,})$/;

/** Divide uma linha de tabela em células, descartando as barras das pontas. */
function dividirLinha(linha: string): string[] {
  let texto = linha.trim();
  if (texto.startsWith("|")) texto = texto.slice(1);
  if (texto.endsWith("|")) texto = texto.slice(0, -1);
  return texto.split("|").map((celula) => celula.trim());
}

/** Linha separadora de tabela: só barras, hifens, dois-pontos e espaços. */
function ehSeparadora(linha: string): boolean {
  const texto = linha.trim();
  if (!texto.includes("-")) return false;
  return /^\|?[\s:|-]+\|?$/.test(texto);
}

/** Alinhamento declarado na linha separadora (---, :---, :---:, ---:). */
function alinhamentoDe(celula: string): Alinhamento {
  const esquerda = celula.startsWith(":");
  const direita = celula.endsWith(":");
  if (esquerda && direita) return "center";
  if (direita) return "right";
  if (esquerda) return "left";
  return undefined;
}

/** Identificador de âncora do título, sem acentos e sem pontuação. */
function idDeAncora(texto: string): string {
  const base = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "secao";
}

/** Monta a árvore das listas a partir do nível de indentação de cada item. */
function aninhar(brutos: Array<{ nivel: number; texto: string; ordenada: boolean }>): ItemLista[] {
  const raiz: ItemLista[] = [];
  const pilha: Array<{ nivel: number; item: ItemLista }> = [];
  brutos.forEach((bruto) => {
    const item: ItemLista = { texto: bruto.texto, ordenada: bruto.ordenada, filhos: [] };
    while (pilha.length > 0 && pilha[pilha.length - 1].nivel >= bruto.nivel) pilha.pop();
    if (pilha.length > 0) pilha[pilha.length - 1].item.filhos.push(item);
    else raiz.push(item);
    pilha.push({ nivel: bruto.nivel, item });
  });
  return raiz;
}

/** Indica se a linha começa um bloco novo — usado para encerrar parágrafos. */
function iniciaBloco(linhas: string[], indice: number): boolean {
  const texto = linhas[indice].trim();
  if (!texto) return true;
  if (texto.startsWith(CERCA)) return true;
  if (texto.startsWith(">")) return true;
  if (texto.startsWith("|") && indice + 1 < linhas.length && ehSeparadora(linhas[indice + 1])) return true;
  if (RE_REGUA.test(texto)) return true;
  if (RE_TITULO.test(texto)) return true;
  return RE_ITEM.test(linhas[indice]);
}

/** Percorre o documento linha a linha e devolve a lista de blocos. */
function analisar(conteudo: string): Bloco[] {
  const linhas = conteudo.replace(/\r\n?/g, "\n").split("\n");
  const blocos: Bloco[] = [];
  const ancoras = new Map<string, number>();
  let i = 0;

  while (i < linhas.length) {
    const bruta = linhas[i];
    const texto = bruta.trim();

    if (!texto) {
      i++;
      continue;
    }

    // Cerca de código: consome tudo até a cerca de fechamento.
    if (texto.startsWith(CERCA)) {
      const corpo: string[] = [];
      i++;
      while (i < linhas.length && !linhas[i].trim().startsWith(CERCA)) {
        corpo.push(linhas[i]);
        i++;
      }
      i++;
      blocos.push({ tipo: "codigo", texto: corpo.join("\n") });
      continue;
    }

    if (RE_REGUA.test(texto)) {
      blocos.push({ tipo: "regua" });
      i++;
      continue;
    }

    const titulo = RE_TITULO.exec(texto);
    if (titulo) {
      const id = idDeAncora(titulo[2]);
      const repetido = ancoras.get(id) ?? 0;
      ancoras.set(id, repetido + 1);
      blocos.push({ tipo: "titulo", nivel: titulo[1].length, id: repetido > 0 ? id + "-" + (repetido + 1) : id, texto: titulo[2].trim() });
      i++;
      continue;
    }

    // Tabela: a linha de cabeçalho só é tabela se a seguinte for separadora.
    if (texto.startsWith("|") && i + 1 < linhas.length && ehSeparadora(linhas[i + 1])) {
      const cabecalho = dividirLinha(texto);
      const alinhamentos = dividirLinha(linhas[i + 1]).map(alinhamentoDe);
      i += 2;
      const corpo: string[][] = [];
      while (i < linhas.length && linhas[i].trim().startsWith("|")) {
        corpo.push(dividirLinha(linhas[i]));
        i++;
      }
      blocos.push({ tipo: "tabela", cabecalho, alinhamentos, linhas: corpo });
      continue;
    }

    // Citação: linhas consecutivas iniciadas por > viram um único bloco.
    if (texto.startsWith(">")) {
      const partes: string[] = [];
      while (i < linhas.length && linhas[i].trim().startsWith(">")) {
        partes.push(linhas[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocos.push({ tipo: "citacao", texto: partes.join(" ").trim() });
      continue;
    }

    const item = RE_ITEM.exec(bruta);
    if (item) {
      const brutos: Array<{ nivel: number; texto: string; ordenada: boolean }> = [];
      while (i < linhas.length) {
        const atual = linhas[i];
        const alvo = RE_ITEM.exec(atual);
        if (alvo) {
          // Dois espaços de indentação equivalem a um nível de aninhamento.
          const espacos = alvo[1].replace(/\t/g, "    ").length;
          brutos.push({ nivel: Math.floor(espacos / 2), texto: alvo[3].trim(), ordenada: /\d/.test(alvo[2]) });
          i++;
          continue;
        }
        // Continuação do item anterior, como acontece nas listas do manual.
        if (atual.trim() && /^\s{2,}/.test(atual) && brutos.length > 0) {
          brutos[brutos.length - 1].texto += " " + atual.trim();
          i++;
          continue;
        }
        break;
      }
      blocos.push({ tipo: "lista", itens: aninhar(brutos) });
      continue;
    }

    // Parágrafo: as linhas do arquivo são quebradas por largura, então são
    // reunidas em um único texto até surgir uma linha vazia ou outro bloco.
    const partes: string[] = [];
    while (i < linhas.length && linhas[i].trim() && !iniciaBloco(linhas, i)) {
      partes.push(linhas[i].trim());
      i++;
    }
    if (partes.length === 0) {
      // Rede de segurança: garante avanço mesmo diante de uma linha inesperada.
      partes.push(texto);
      i++;
    }
    blocos.push({ tipo: "paragrafo", texto: partes.join(" ") });
  }

  return blocos;
}

/* ==========================================================================
   Renderização
   ========================================================================== */

const TAGS_TITULO = ["h2", "h3", "h4", "h5", "h6"] as const;

/** O nível 1 do arquivo vira h2: o h1 da página é o título do capítulo. */
const ESTILO_TITULO: Record<number, string> = {
  1: "mb-2 mt-7 border-b border-border pb-1.5 text-xl font-bold tracking-tight text-fg",
  2: "mb-1.5 mt-5 text-lg font-bold tracking-tight text-fg",
  3: "mb-1 mt-4 text-base font-semibold text-fg",
  4: "mb-1 mt-3 text-sm font-semibold text-fg",
  5: "mb-1 mt-3 text-2xs font-semibold uppercase tracking-wide text-fg-muted",
};

/** Lista (com os filhos aninhados) — agrupa itens do mesmo tipo seguidos. */
function ItensLista({ itens, chave }: { itens: ItemLista[]; chave: string }) {
  const grupos: Array<{ ordenada: boolean; itens: ItemLista[]; inicio: number }> = [];
  itens.forEach((item, indice) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.ordenada === item.ordenada) ultimo.itens.push(item);
    else grupos.push({ ordenada: item.ordenada, itens: [item], inicio: indice });
  });
  return (
    <>
      {grupos.map((grupo) => {
        const Tag = grupo.ordenada ? "ol" : "ul";
        return (
          <Tag
            key={chave + "-g" + grupo.inicio}
            className={cn(
              "my-2 space-y-1 pl-5 text-sm leading-relaxed text-fg-muted marker:text-brand",
              grupo.ordenada ? "list-decimal" : "list-disc"
            )}
          >
            {grupo.itens.map((item, indice) => (
              <li key={chave + "-g" + grupo.inicio + "-i" + indice} className="pl-0.5">
                {emLinha(item.texto, chave + "-g" + grupo.inicio + "-i" + indice)}
                {item.filhos.length > 0 && (
                  <ItensLista itens={item.filhos} chave={chave + "-g" + grupo.inicio + "-i" + indice + "-f"} />
                )}
              </li>
            ))}
          </Tag>
        );
      })}
    </>
  );
}

/** Renderiza um bloco já interpretado. */
function BlocoMarkdown({ bloco, chave }: { bloco: Bloco; chave: string }) {
  if (bloco.tipo === "titulo") {
    const Tag = TAGS_TITULO[Math.min(Math.max(bloco.nivel, 1), 5) - 1];
    return (
      <Tag id={bloco.id} className={cn("scroll-mt-24", ESTILO_TITULO[Math.min(bloco.nivel, 5)])}>
        {emLinha(bloco.texto, chave)}
      </Tag>
    );
  }

  if (bloco.tipo === "paragrafo") {
    return <p className="my-2 text-sm leading-relaxed text-fg-muted">{emLinha(bloco.texto, chave)}</p>;
  }

  if (bloco.tipo === "lista") {
    return <ItensLista itens={bloco.itens} chave={chave} />;
  }

  if (bloco.tipo === "citacao") {
    // O manual abre os avisos com um termo em negrito (**Atenção:**). Nesses
    // casos o bloco vira um Alerta do design system; as demais citações ficam
    // como citação destacada.
    const destaque = /^\*\*([^*]+?):?\*\*:?\s*/.exec(bloco.texto);
    if (destaque) {
      const termo = destaque[1].replace(/:$/, "");
      return (
        <Alerta tom={/aten/i.test(termo) ? "warning" : "info"} titulo={termo} className="my-3">
          {emLinha(bloco.texto.slice(destaque[0].length), chave)}
        </Alerta>
      );
    }
    return (
      <blockquote className="my-3 rounded-sgp border-l-4 border-brand/50 bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed text-fg-muted">
        {emLinha(bloco.texto, chave)}
      </blockquote>
    );
  }

  if (bloco.tipo === "tabela") {
    const colunas: Array<ColunaTabela<{ id: number; celulas: ReactNode[] }>> = bloco.cabecalho.map((titulo, indice) => ({
      chave: chave + "-c" + indice,
      titulo: <span>{emLinha(titulo, chave + "-h" + indice)}</span>,
      alinhar: bloco.alinhamentos[indice],
      renderizar: (linha) => <>{linha.celulas[indice] ?? null}</>,
    }));
    const dados = bloco.linhas.map((celulas, indice) => ({
      id: indice,
      celulas: celulas.map((celula, coluna) => (
        <span key={coluna}>{emLinha(celula, chave + "-l" + indice + "-c" + coluna)}</span>
      )),
    }));
    return (
      <div className="my-3 overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n1">
        <Tabela colunas={colunas} dados={dados} compacta />
      </div>
    );
  }

  if (bloco.tipo === "regua") {
    return <hr className="my-5 border-t border-border" />;
  }

  return (
    <pre className="my-3 overflow-x-auto rounded-sgp-lg border border-border bg-surface-2 p-3 text-2xs scroll-thin">
      <code className="font-mono text-fg">{bloco.texto}</code>
    </pre>
  );
}

/**
 * Renderiza um documento Markdown do manual.
 *
 * Uso: <Markdown conteudo={documento.conteudo} />
 */
export function Markdown({ conteudo }: { conteudo: string }) {
  const blocos = useMemo(() => analisar(conteudo), [conteudo]);
  return (
    <div className="max-w-none">
      {blocos.map((bloco, indice) => (
        <BlocoMarkdown key={"b" + indice} bloco={bloco} chave={"b" + indice} />
      ))}
    </div>
  );
}

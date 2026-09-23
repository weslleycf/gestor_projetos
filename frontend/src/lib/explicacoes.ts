/* ==========================================================================
   Catálogo de explicações dos cards
   --------------------------------------------------------------------------
   Cada card do sistema pode explicar a si mesmo. O texto vive em arquivos
   JSON nesta pasta, carregados em tempo de build. A busca é feita pelo rótulo
   exibido na tela, então quem escreve a página não precisa fazer nada: basta o
   rótulo bater com o termo cadastrado.
   ========================================================================== */

export interface Explicacao {
  termo: string;
  sinonimos: string[];
  categoria: string;
  o_que_e: string;
  como_ler: string;
  o_que_fazer?: string;
  formula?: string;
  exemplo?: string;
  fonte: string;
}

/** Normaliza para comparação: sem acento, minúsculo, espaços colapsados. */
export function normalizarTermo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

/**
 * Carregamento sob demanda.
 *
 * O catálogo tem centenas de verbetes e passaria de 120 KB comprimidos se
 * entrasse no pacote inicial. Com o carregamento dinâmico, cada arquivo vira um
 * pedaço separado, baixado uma única vez e só quando alguma tela precisa —
 * normalmente no primeiro card com botão de ajuda.
 */
const carregadores = import.meta.glob("./explicacoes/*.json") as Record<
  string,
  () => Promise<{ default?: unknown }>
>;

let explicacoes: Explicacao[] = [];
let indice = new Map<string, Explicacao>();
let carregamento: Promise<void> | null = null;
let versao = 0;
const ouvintes = new Set<() => void>();

function avisar() {
  versao += 1;
  ouvintes.forEach((fn) => fn());
}

/** Permite que a interface se redesenhe quando o catálogo termina de carregar. */
export function assinarExplicacoes(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function versaoExplicacoes(): number {
  return versao;
}

export function explicacoesCarregadas(): boolean {
  return explicacoes.length > 0;
}

export function listarExplicacoes(): Explicacao[] {
  return explicacoes;
}

export function categoriasExplicacao(): string[] {
  return [...new Set(explicacoes.map((e) => e.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Carrega todos os arquivos do catálogo. Chamadas repetidas reaproveitam a mesma promessa. */
export function carregarExplicacoes(): Promise<void> {
  if (carregamento) return carregamento;
  carregamento = (async () => {
    const modulos = await Promise.all(Object.values(carregadores).map((carregar) => carregar()));
    const lista: Explicacao[] = [];
    for (const modulo of modulos) {
      const bruto = (modulo as { default?: unknown }).default ?? modulo;
      if (!Array.isArray(bruto)) continue;
      for (const item of bruto) {
        const e = item as Partial<Explicacao>;
        if (!e || typeof e.termo !== "string" || !e.o_que_e) continue;
        lista.push({
          termo: e.termo,
          sinonimos: Array.isArray(e.sinonimos) ? e.sinonimos.filter((s) => typeof s === "string") : [],
          categoria: typeof e.categoria === "string" ? e.categoria : "Geral",
          o_que_e: e.o_que_e,
          como_ler: e.como_ler || "",
          o_que_fazer: e.o_que_fazer,
          formula: e.formula,
          exemplo: e.exemplo,
          fonte: e.fonte || "",
        });
      }
    }
    // Um mesmo número pode aparecer em vários arquivos. Fica a versão mais completa.
    const porTermo = new Map<string, Explicacao>();
    for (const e of lista) {
      const chave = normalizarTermo(e.termo);
      const atual = porTermo.get(chave);
      if (!atual || (e.como_ler || "").length + (e.o_que_fazer || "").length >
          (atual.como_ler || "").length + (atual.o_que_fazer || "").length) {
        porTermo.set(chave, e);
      }
    }
    explicacoes = [...porTermo.values()].sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));
    indice = new Map();
    for (const e of explicacoes) {
      for (const chave of [e.termo, ...e.sinonimos]) {
        const k = normalizarTermo(chave);
        if (k && !indice.has(k)) indice.set(k, e);
      }
    }
    cache.clear();
    avisar();
  })().catch((erro) => {
    // Sem isto, uma falha de rede deixava a promessa rejeitada para sempre: o
    // catálogo nunca carregava e nenhum card mostrava o botão de ajuda, sem
    // nenhum aviso ao usuário.
    carregamento = null;
    if (typeof console !== "undefined") {
      console.warn("[SGP] não foi possível carregar o catálogo de explicações.", erro);
    }
  });
  return carregamento;
}

const cache = new Map<string, Explicacao | null>();

/**
 * Procura a explicação de um rótulo exibido na tela.
 *
 * A busca é tolerante de propósito: "CPI médio" encontra a explicação de "CPI" e
 * "Atrasados (filtro)" encontra a de "Atrasados". Preferimos explicar a mais do
 * que deixar o usuário sem resposta.
 */
export function explicacaoDe(rotulo?: string): Explicacao | undefined {
  if (!rotulo) return undefined;
  if (cache.has(rotulo)) return cache.get(rotulo) ?? undefined;

  let achado: Explicacao | undefined;
  const direto = normalizarTermo(rotulo);
  if (indice.has(direto)) {
    achado = indice.get(direto);
  } else {
    const semParenteses = normalizarTermo(rotulo.replace(/\([^)]*\)/g, " "));
    if (semParenteses && indice.has(semParenteses)) {
      achado = indice.get(semParenteses);
    } else {
      // Casamento por prefixo: "cpi medio do portfolio" -> "cpi".
      // O mínimo é 2 caracteres porque várias siglas do EVM têm essa medida
      // (PV, EV, AC, CV, SV). Como o candidato precisa ser um termo exato do
      // catálogo, encurtar o limite não gera casamento indevido.
      const palavras = (semParenteses || direto).split(" ").filter(Boolean);
      for (let tamanho = Math.min(palavras.length, 5); tamanho >= 1 && !achado; tamanho--) {
        const candidato = palavras.slice(0, tamanho).join(" ");
        if (candidato.length >= 2 && indice.has(candidato)) achado = indice.get(candidato);
      }
    }
  }

  cache.set(rotulo, achado ?? null);
  return achado;
}

/** Busca livre no glossário, usada pela central de ajuda. */
export function buscarExplicacoes(termo: string): Explicacao[] {
  const busca = normalizarTermo(termo);
  if (!busca) return explicacoes;
  return explicacoes.filter((e) =>
    [e.termo, e.o_que_e, e.como_ler, e.categoria, ...e.sinonimos]
      .map(normalizarTermo)
      .some((texto) => texto.includes(busca))
  );
}

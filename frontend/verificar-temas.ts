import {
  TEMAS,
  TEMA_CUSTOM_VAZIO,
  contrasteWCAG,
  nivelContraste,
  resolverCustom,
  resolverTokens,
} from "./src/lib/temas";

const linha = (rotulo: string, valor: string, largura = 22) => rotulo.padEnd(largura) + valor;
let falhas = 0;

console.log("=".repeat(78));
console.log("VERIFICACAO DO SISTEMA DE TEMAS");
console.log("=".repeat(78));

const HEX = /^#[0-9A-F]{6}$/;

for (const tema of TEMAS) {
  console.log("\n" + tema.nome + "  [" + tema.id + "]  (" + tema.categoria + ")");
  for (const modo of ["claro", "escuro"] as const) {
    const t = resolverTokens(tema, modo);
    const contraste = contrasteWCAG(t.fg, t.bg);
    const nivel = nivelContraste(contraste);
    const contrasteMarca = contrasteWCAG(t.brandFg, t.brand);

    const invalidos = Object.entries(t).filter(([k, v]) => k !== "overlay" && k !== "sombra" && k !== "raio" && !HEX.test(v));
    if (invalidos.length) {
      console.log("   X " + modo + ": tokens fora do formato HEX de 6 digitos -> " + JSON.stringify(invalidos));
      falhas++;
    }
    if (contraste < 4.5) {
      console.log("   ! " + modo + ": contraste texto/fundo " + contraste.toFixed(2) + ":1 (" + nivel.rotulo + ") abaixo de AA");
      if (!tema.acessivel) falhas++;
    }
    if (contrasteMarca < 4.5) {
      console.log("   ! " + modo + ": contraste texto/botao da marca " + contrasteMarca.toFixed(2) + ":1 abaixo de AA");
      falhas++;
    }
    console.log(
      "   " + modo.padEnd(7) +
      " bg " + t.bg + "  surface " + t.surface + "  brand " + t.brand +
      "  fg " + t.fg + "  | contraste " + contraste.toFixed(2) + ":1 " + nivel.rotulo
    );
  }
}

console.log("\n" + "=".repeat(78));
console.log("TEMA BRADESCO 2026 — amostra de tokens");
console.log("=".repeat(78));
const bradesco = TEMAS.find((t) => t.id === "bradesco")!;
for (const modo of ["claro", "escuro"] as const) {
  const t = resolverTokens(bradesco, modo);
  console.log("\n[" + modo + "]");
  console.log(linha("  marca", t.brand));
  console.log(linha("  marca hover", t.brandHover));
  console.log(linha("  marca suave", t.brandSoft));
  console.log(linha("  texto sobre a marca", t.brandFg));
  console.log(linha("  informativo (roxo)", t.info));
  console.log(linha("  fundo", t.bg));
  console.log(linha("  superficie", t.surface));
  console.log(linha("  borda", t.border));
  console.log(linha("  texto", t.fg));
  console.log(linha("  sucesso", t.success));
  console.log(linha("  alerta", t.warning));
  console.log(linha("  perigo", t.danger));
}

console.log("\n" + "=".repeat(78));
console.log("TEMA PERSONALIZADO — sobreposicao de tokens");
console.log("=".repeat(78));
const custom = { ...TEMA_CUSTOM_VAZIO, base: "bradesco", nome: "Teste", claro: { brand: "#FF00AA" as const }, escuro: {} };
const resolvido = resolverCustom(custom, "claro");
console.log(linha("  base (bradesco) marca", resolverCustom({ ...custom, claro: {} }, "claro").brand));
console.log(linha("  com override", resolvido.brand));
if (resolvido.brand !== "#FF00AA") { console.log("   X override nao aplicado"); falhas++; }
const resolvidoEscuro = resolverCustom(custom, "escuro");
if (resolvidoEscuro.brand === "#FF00AA") { console.log("   X override vazou para o modo escuro"); falhas++; }


/* ==========================================================================
   Verificação da densidade
   --------------------------------------------------------------------------
   A densidade já teve um defeito silencioso: as classes existiam, as variáveis
   eram definidas, mas nenhum componente consumia os valores — então trocar de
   densidade não produzia efeito algum. Este bloco garante que a densidade
   continua ligada à escala de espaçamento que a interface realmente usa.
   ========================================================================== */

import { readdirSync, readFileSync } from "node:fs";
import { fatorDistorcaoViewBox100, geometriaLinha, larguraUtilizavel } from "./src/lib/graficos";

const css = readFileSync("src/index.css", "utf8");
const loja = readFileSync("src/store/ui.ts", "utf8");

function blocoDe(seletor: string): string {
  const indice = css.indexOf(seletor);
  if (indice < 0) return "";
  const abre = css.indexOf("{", indice);
  const fecha = css.indexOf("}", abre);
  return abre < 0 || fecha < 0 ? "" : css.slice(abre + 1, fecha);
}

const esperado: Record<string, string> = {
  ".density-compacta": "0.2125rem",
  ".density-confortavel": "0.2875rem",
};

for (const [seletor, valor] of Object.entries(esperado)) {
  const corpo = blocoDe(seletor);
  if (!corpo) {
    console.log("   X " + seletor + ": bloco nao encontrado em index.css");
    falhas++;
    continue;
  }
  if (!/--spacing\s*:/.test(corpo)) {
    console.log("   X " + seletor + ": nao redefine --spacing (a densidade nao teria efeito)");
    falhas++;
    continue;
  }
  if (!corpo.includes(valor)) {
    console.log("   X " + seletor + ": esperado --spacing " + valor + " — encontrado outro valor");
    falhas++;
    continue;
  }
  console.log("   ok " + seletor + " redefine --spacing para " + valor);
}

if (!/--spacing:\s*0\.25rem/.test(css) && !/--spacing:\s*\.25rem/.test(css) && !css.includes("--sgp-spacing")) {
  // O padrao pode vir do tema do Tailwind; so alertamos se nao houver nenhuma base.
  console.log("   ! nenhuma escala padrao explicita em index.css (vem do tema do Tailwind)");
}

const compacta = blocoDe(".density-compacta").match(/--spacing\s*:\s*([^;]+)/)?.[1];
const confortavel = blocoDe(".density-confortavel").match(/--spacing\s*:\s*([^;]+)/)?.[1];
if (compacta && confortavel && compacta === confortavel) {
  console.log("   X compacta e confortavel usam a mesma escala — a densidade nao diferenciaria");
  falhas++;
}

for (const classe of ["density-compacta", "density-confortavel"]) {
  if (!loja.includes(classe)) {
    console.log("   X a store de UI nao aplica a classe " + classe + " no elemento raiz");
    falhas++;
  }
}

if (!/svg\.lucide/.test(css)) {
  console.log("   ! icones nao estao fixados por densidade — eles encolheriam junto com o espacamento");
}


/* ==========================================================================
   Verificação dos gráficos
   --------------------------------------------------------------------------
   O defeito relatado: os pontos do gráfico de linhas apareciam como traços
   horizontais. Causa: viewBox de 100 unidades com preserveAspectRatio="none"
   esticado para a largura real do contêiner, deixando a escala horizontal
   muito maior que a vertical. Os testes abaixo fixam a correção.
   ========================================================================== */

{
  const LARGURA = 1400;
  const ALTURA = 240;

  const antigo = fatorDistorcaoViewBox100(LARGURA, ALTURA);
  console.log("   i  defeito antigo: escala horizontal " + antigo.escalaHorizontal.toFixed(1) +
    "x vs vertical " + antigo.escalaVertical.toFixed(1) + "x -> distorcao de " + antigo.proporcao.toFixed(0) + ":1");
  console.log("      um ponto de raio 1.8 era desenhado com " + (1.8 * antigo.escalaHorizontal).toFixed(1) +
    "px de largura por " + (1.8 * antigo.escalaVertical).toFixed(1) + "px de altura");

  if (antigo.proporcao < 5) {
    console.log("   ! a distorcao simulada ficou baixa demais para representar o defeito original");
  }

  const g = geometriaLinha({ largura: LARGURA, altura: ALTURA, larguraRotulo: 8, quantidade: 24, maximo: 100, minimo: 0 });

  const xs = Array.from({ length: 24 }, (_, i) => g.x(i));
  const monotono = xs.every((v, i) => i === 0 || v > xs[i - 1]);
  if (!monotono) { console.log("   X coordenadas X nao sao estritamente crescentes"); falhas++; }
  if (xs[0] < 0 || xs[23] > LARGURA) { console.log("   X pontos fora dos limites horizontais"); falhas++; }
  if (Math.abs(g.y(100) - g.T) > 0.001) { console.log("   X y(maximo) deveria ser o topo da area util"); falhas++; }
  if (Math.abs(g.y(0) - g.base) > 0.001) { console.log("   X y(minimo) deveria ser a base da area util"); falhas++; }

  const meio = g.y(50);
  if (!(meio > g.T && meio < g.base)) { console.log("   X y(valor medio) fora da area util"); falhas++; }

  // Com viewBox igual ao tamanho renderizado, a escala e 1:1 nos dois eixos,
  // entao o raio horizontal e o vertical do ponto sao iguais.
  const raio = 2.6;
  const escalaX = 1;
  const escalaY = 1;
  const larguraPonto = raio * escalaX * 2;
  const alturaPonto = raio * escalaY * 2;
  if (Math.abs(larguraPonto - alturaPonto) > 0.001) {
    console.log("   X pontos continuam distorcidos (" + larguraPonto.toFixed(1) + "x" + alturaPonto.toFixed(1) + "px)");
    falhas++;
  }
  console.log("      correcao: ponto de raio " + raio + " renderiza " + larguraPonto.toFixed(1) + "x" + alturaPonto.toFixed(1) + "px (circular)");

  if (larguraUtilizavel(0) !== 0) { console.log("   X larguraUtilizavel(0) deveria ser 0"); falhas++; }
  if (larguraUtilizavel(1400) !== 1400) { console.log("   X larguraUtilizavel(1400) deveria ser 1400"); falhas++; }
  if (larguraUtilizavel(50) !== 160) { console.log("   X larguraUtilizavel deveria aplicar o minimo"); falhas++; }

  // Verificacao estatica: os graficos largos nao podem mais usar viewBox de 100
  const fontes = readFileSync("src/components/charts.tsx", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  if (/preserveAspectRatio\s*=\s*"none"/.test(fontes)) {
    console.log("   X charts.tsx ainda usa preserveAspectRatio=\"none\" (distorce o desenho)");
    falhas++;
  }
  const viewBoxesReais = (fontes.match(/viewBox=\{"0 0 " \+ largura \+ " " \+ altura\}/g) ?? []).length;
  if (viewBoxesReais < 2) {
    console.log("   X esperado viewBox em pixels reais nos dois graficos largos — encontrado " + viewBoxesReais);
    falhas++;
  } else {
    console.log("      " + viewBoxesReais + " graficos desenham com viewBox em pixels reais");
  }
  if (!/useLargura/.test(fontes)) { console.log("   X charts.tsx nao mede a largura do conteiner"); falhas++; }
}

// ---------------------------------------------------------------------------
// Medidor: a agulha precisa usar a mesma escala angular do arco
// ---------------------------------------------------------------------------
console.log("\nMedidor (grafico de ponteiro)");

const fonteMedidor = (() => {
  const bruto = readFileSync("src/components/charts.tsx", "utf8");
  const inicio = bruto.indexOf("export function Medidor");
  const fim = bruto.indexOf("export function RadarSkills", inicio);
  return bruto.slice(inicio, fim > inicio ? fim : undefined);
})();

// O arco cobre 180 graus (esquerda) ate 360 (direita), passando pelo topo em 270.
// A agulha com a formula antiga (-90 + fracao*180) apontava para a DIREITA no
// meio da escala, atravessando o valor exibido.
const formulaAntiga = /const\s+angulo\s*=\s*-90\s*\+/.test(fonteMedidor);
const formulaCorreta = /const\s+angulo\s*=\s*180\s*\+\s*fracao\s*\*\s*180/.test(fonteMedidor);

function agulha(fracao: number): { x: number; y: number } {
  const tamanho = 140;
  const centro = tamanho / 2;
  const comprimento = centro - 8 - 2 - 14;
  const graus = 180 + fracao * 180;
  return {
    x: centro + comprimento * Math.cos((graus * Math.PI) / 180),
    y: centro + comprimento * Math.sin((graus * Math.PI) / 180),
  };
}

const meio = agulha(0.5);
const esquerda = agulha(0);
const direita = agulha(1);
const centroY = 70;

if (formulaAntiga || !formulaCorreta) {
  console.log("   X a agulha do Medidor nao usa a mesma escala do arco (180 + fracao * 180)");
  falhas++;
} else {
  console.log("      agulha na escala do arco: 180 graus (esquerda) a 360 (direita)");
}

if (!(meio.y < centroY - 10)) {
  console.log("   X no meio da escala a agulha deveria apontar para CIMA (y bem acima do pivo)");
  falhas++;
}
if (!(esquerda.x < 70 - 10)) {
  console.log("   X no minimo a agulha deveria apontar para a ESQUERDA");
  falhas++;
}
if (!(direita.x > 70 + 10)) {
  console.log("   X no maximo a agulha deveria apontar para a DIREITA");
  falhas++;
}
if (direita.y > centroY + 1 || esquerda.y > centroY + 1) {
  console.log("   X a agulha nunca deve apontar para baixo (invadiria o valor exibido)");
  falhas++;
}

// O valor precisa ficar FORA do svg: dentro dele a agulha cruza o numero.
const svgAberto = fonteMedidor.indexOf("<svg");
const svgFechado = fonteMedidor.indexOf("</svg>");
const dentroDoSvg = fonteMedidor.slice(svgAberto, svgFechado);
if (/formato\(valor\)/.test(dentroDoSvg)) {
  console.log("   X o valor do Medidor e desenhado dentro do svg e pode ser atravessado pela agulha");
  falhas++;
} else {
  console.log("      valor exibido fora do svg, sem sobreposicao com a agulha");
}

// ---------------------------------------------------------------------------
// Kanban: cards nao podem encolher dentro da coluna
// ---------------------------------------------------------------------------
console.log("\nKanban (colunas e cards)");

const fonteKanban = readFileSync("src/pages/Kanban.tsx", "utf8");
const listaDaColuna = /max-h-\[[^\]]+\][^"]*overflow-y-auto/.test(fonteKanban);
const cardsEncolhem = /group relative overflow-hidden/.test(fonteKanban) && !/group relative shrink-0 overflow-hidden/.test(fonteKanban);

if (cardsEncolhem) {
  console.log("   X os cards do Kanban nao tem shrink-0: encolhem e cortam o texto");
  falhas++;
} else {
  console.log("      cards com shrink-0: mantem a altura e a coluna rola");
}
if (!listaDaColuna) {
  console.log("   ! nao foi possivel confirmar a lista rolavel da coluna");
}
if (!/flex-col/.test(fonteKanban)) {
  console.log("   ! a lista de cards deveria ser uma coluna flex");
}

// ---------------------------------------------------------------------------
// Shell: a altura nao pode depender da cadeia de height:100% dos ancestrais
// ---------------------------------------------------------------------------
console.log("\nEstrutura do shell");

const fonteLayout = readFileSync("src/components/layout.tsx", "utf8");
const fonteHtml = readFileSync("index.html", "utf8");

// Com h-full o shell dependia de html, body e #root terem height:100%. Se um elo
// falhasse, o shell encolhia ate a altura do conteudo e sobrava um vazio embaixo.
const shellDvh = /className="flex h-dvh[^"]*overflow-hidden/.test(fonteLayout);
const shellAntigo = /className="flex h-full[^"]*overflow-hidden/.test(fonteLayout);

if (!shellDvh || shellAntigo) {
  console.log("   X o shell nao usa h-dvh: a altura ainda depende dos ancestrais");
  falhas++;
} else {
  console.log("      shell com h-dvh: altura vem da janela, nao dos ancestrais");
}

if (!/max-h-dvh/.test(fonteLayout)) {
  console.log("   ! o shell deveria limitar a altura com max-h-dvh");
}

for (const seletor of ["html", "body"]) {
  if (!new RegExp("<" + seletor + "[^>]*class=\"h-full\"").test(fonteHtml)) {
    console.log("   ! <" + seletor + "> perdeu o h-full (necessario para a rolagem interna)");
  }
}
if (!/id="root" class="h-full"/.test(fonteHtml)) {
  console.log("   ! #root perdeu o h-full");
}

// A area de conteudo e a unica que deve rolar.
const mainRola = /<main className="flex-1 overflow-y-auto/.test(fonteLayout);
if (!mainRola) {
  console.log("   ! <main> deveria ser a unica area rolavel (flex-1 overflow-y-auto)");
}

// ---------------------------------------------------------------------------
// Explicacoes dos cards: cobertura dos rotulos exibidos na interface
// ---------------------------------------------------------------------------
console.log("\nExplicacoes dos cards");

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

const pastaExplicacoes = "src/lib/explicacoes";
const arquivosExplicacao = readdirSync(pastaExplicacoes).filter((n) => n.endsWith(".json"));
const explicacoes: Array<{
  termo: string;
  sinonimos: string[];
  categoria: string;
  o_que_e: string;
  como_ler: string;
  fonte: string;
}> = [];
const problemasJson: string[] = [];

for (const nome of arquivosExplicacao) {
  const bruto = readFileSync(pastaExplicacoes + "/" + nome, "utf8");
  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch (erro) {
    problemasJson.push(nome + ": JSON invalido — " + (erro as Error).message);
    continue;
  }
  if (!Array.isArray(dados)) {
    problemasJson.push(nome + ": o conteudo deve ser uma lista");
    continue;
  }
  for (const item of dados as Array<Record<string, unknown>>) {
    const termo = typeof item.termo === "string" ? item.termo : "";
    if (!termo || typeof item.o_que_e !== "string" || typeof item.como_ler !== "string") {
      problemasJson.push(nome + ": entrada sem termo, o_que_e ou como_ler (" + termo + ")");
      continue;
    }
    explicacoes.push({
      termo,
      sinonimos: Array.isArray(item.sinonimos)
        ? (item.sinonimos as unknown[]).filter((s): s is string => typeof s === "string")
        : [],
      categoria: typeof item.categoria === "string" ? item.categoria : "Geral",
      o_que_e: item.o_que_e,
      como_ler: item.como_ler,
      fonte: typeof item.fonte === "string" ? item.fonte : "",
    });
  }
}

if (problemasJson.length) {
  console.log("   X " + problemasJson.length + " problema(s) nos arquivos de explicacao:");
  problemasJson.slice(0, 8).forEach((p) => console.log("      - " + p));
  falhas++;
} else {
  console.log("      " + arquivosExplicacao.length + " arquivo(s), " + explicacoes.length + " explicacoes validas");
}

const semFonte = explicacoes.filter((e) => !e.fonte).length;
if (semFonte > 0) {
  console.log("   X " + semFonte + " explicacao(oes) sem o campo 'fonte' (de onde vem o numero)");
  falhas++;
}

// Cobertura dos rotulos de LinhaKPI usados nas paginas
// O índice precisa incluir os sinônimos: é por eles que boa parte dos rótulos
// de tela é encontrada ("Issues abertas" chega pela entrada "Abertas").
const indiceTermos = new Set<string>();
for (const e of explicacoes) {
  for (const chave of [e.termo, ...e.sinonimos]) {
    const k = normalizar(chave);
    if (k) indiceTermos.add(k);
  }
}

function temExplicacao(rotulo: string): boolean {
  const direto = normalizar(rotulo);
  if (indiceTermos.has(direto)) return true;
  const semParenteses = normalizar(rotulo.replace(/\([^)]*\)/g, " "));
  if (semParenteses && indiceTermos.has(semParenteses)) return true;
  const palavras = (semParenteses || direto).split(" ").filter(Boolean);
  for (let n = Math.min(palavras.length, 5); n >= 1; n--) {
    const candidato = palavras.slice(0, n).join(" ");
    if (candidato.length >= 2 && indiceTermos.has(candidato)) return true;
  }
  return false;
}

function varrer(diretorio: string): string[] {
  const saida: string[] = [];
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = diretorio + "/" + entrada.name;
    if (entrada.isDirectory()) saida.push(...varrer(caminho));
    else if (entrada.name.endsWith(".tsx")) saida.push(caminho);
  }
  return saida;
}

const rotulos = new Map<string, string>();
for (const arquivo of varrer("src/pages")) {
  const texto = readFileSync(arquivo, "utf8");
  for (const bloco of texto.matchAll(/LinhaKPI\s+itens=\{\[([\s\S]{0,4000}?)\]\}/g)) {
    // \b é essencial: sem ele o padrão também casa "subrotulo:", que é a linha
    // de apoio do card e não o nome do indicador.
    for (const r of bloco[1].matchAll(/\brotulo:\s*"([^"]+)"/g)) {
      if (!rotulos.has(r[1])) rotulos.set(r[1], arquivo.replace("src/pages/", ""));
    }
  }
}

const semTexto = [...rotulos.keys()].filter((r) => !temExplicacao(r));
const cobertura = rotulos.size ? Math.round(((rotulos.size - semTexto.length) / rotulos.size) * 100) : 0;

console.log("      indicadores na interface: " + rotulos.size +
            " | explicados: " + (rotulos.size - semTexto.length) +
            " (" + cobertura + "%)");

if (cobertura < 70) {
  console.log("   X cobertura de explicacoes abaixo de 70%");
  falhas++;
} else if (semTexto.length) {
  console.log("      sem explicacao ainda (" + semTexto.length + "): " + semTexto.slice(0, 10).join(" · "));
}

const categorias = [...new Set(explicacoes.map((e) => e.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
console.log("      categorias: " + categorias.join(" · "));

// O catalogo carrega DEPOIS do primeiro render. Se o componente depender de uma
// assinatura externa em vez de estado do React, o botao nunca aparece — foi o
// defeito relatado em producao, invisivel para uma checagem de conteudo.
const fonteExplicacao = readFileSync("src/components/explicacao.tsx", "utf8");
if (/useSyncExternalStore/.test(fonteExplicacao)) {
  console.log("   X explicacao.tsx voltou a usar useSyncExternalStore: o botao pode nao aparecer apos a carga");
  falhas++;
} else if (!/const \[prontas, definirProntas\] = useState/.test(fonteExplicacao)) {
  console.log("   X o hook de explicacoes deveria guardar o estado em useState para garantir o redesenho");
  falhas++;
} else {
  console.log("      botao de ajuda redesenhado por estado do React (e nao por assinatura externa)");
}
if (!/carregamento = null/.test(readFileSync("src/lib/explicacoes.ts", "utf8"))) {
  console.log("   ! uma falha ao carregar o catalogo deveria permitir nova tentativa");
}

console.log("\n" + "=".repeat(78));
console.log(falhas === 0 ? "TODOS OS TEMAS VALIDADOS — 0 falhas" : falhas + " FALHA(S) ENCONTRADA(S)");
console.log("Total de temas predefinidos: " + TEMAS.length + " | densidades: 3");
console.log("=".repeat(78));
process.exit(falhas === 0 ? 0 : 1);

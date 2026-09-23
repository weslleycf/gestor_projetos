/* ==========================================================================
   Geometria dos gráficos
   --------------------------------------------------------------------------
   Funções puras, sem React, para que possam ser verificadas automaticamente.

   Contexto do defeito que originou este módulo: os gráficos que ocupam toda a
   largura eram desenhados em um viewBox de 100 unidades com
   preserveAspectRatio="none". Como o viewBox era esticado para a largura real
   do contêiner (~1400px) mas a altura permanecia 1:1, a escala horizontal
   ficava ~14x maior que a vertical. Um <circle r="1.8"> era renderizado como
   uma elipse de 50x4 px — o "traço" que aparecia nos pontos da série.

   A correção é desenhar em pixels reais: medir o contêiner e usar um viewBox
   com as mesmas dimensões do elemento renderizado, o que mantém a escala 1:1
   nos dois eixos.
   ========================================================================== */

export interface GeometriaLinha {
  L: number;
  R: number;
  T: number;
  B: number;
  larguraUtil: number;
  alturaUtil: number;
  passo: number;
  base: number;
  x: (indice: number) => number;
  y: (valor: number) => number;
}

export function geometriaLinha(opcoes: {
  largura: number;
  altura: number;
  /** Percentual da largura reservado à margem esquerda. */
  larguraRotulo: number;
  quantidade: number;
  maximo: number;
  minimo: number;
}): GeometriaLinha {
  const { largura, altura, larguraRotulo, quantidade, maximo, minimo } = opcoes;

  const L = (larguraRotulo / 100) * largura;
  const R = 4;
  const T = 10;
  const B = 4;
  const larguraUtil = Math.max(20, largura - L - R);
  const alturaUtil = Math.max(20, altura - T - B);
  const passo = quantidade > 1 ? larguraUtil / (quantidade - 1) : 0;
  const base = T + alturaUtil;
  const faixa = maximo - minimo || 1;

  return {
    L,
    R,
    T,
    B,
    larguraUtil,
    alturaUtil,
    passo,
    base,
    x: (indice: number) => (quantidade > 1 ? L + indice * passo : L + larguraUtil / 2),
    y: (valor: number) => base - ((valor - minimo) / faixa) * alturaUtil,
  };
}

/**
 * Fator de distorção que um viewBox de 100 unidades com
 * preserveAspectRatio="none" aplicaria a um círculo.
 * Serve para documentar e verificar o defeito corrigido.
 */
export function fatorDistorcaoViewBox100(larguraRenderizada: number, alturaRenderizada: number) {
  const escalaHorizontal = larguraRenderizada / 100;
  const escalaVertical = alturaRenderizada / alturaRenderizada;
  return {
    escalaHorizontal,
    escalaVertical,
    proporcao: escalaHorizontal / escalaVertical,
  };
}

/** Verifica se uma largura medida é utilizável para desenhar. */
export function larguraUtilizavel(largura: number, minimo = 160): number {
  return Number.isFinite(largura) && largura > 0 ? Math.max(minimo, Math.round(largura)) : 0;
}

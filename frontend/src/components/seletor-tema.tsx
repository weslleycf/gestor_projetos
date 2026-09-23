import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Accessibility,
  Check,
  Contrast,
  Download,
  Eye,
  Moon,
  Paintbrush,
  Palette,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import {
  Botao,
  BotaoIcone,
  Campo,
  Chip,
  Dica,
  Entrada,
  Etiqueta,
  Modal,
  Segmentado,
  useAvisos,
} from "@/components/ui";
import {
  CAMPOS_EDITAVEIS,
  TEMAS,
  TEMAS_POR_ID,
  TEMA_CUSTOM_VAZIO,
  aplicarTemaNoDocumento,
  ajustarLuminosidade,
  contrastePrincipal,
  contrasteWCAG,
  nivelContraste,
  resolverCustom,
  resolverTokens,
  type DefinicaoTema,
  type ModoTema,
  type TemaCustom,
  type Tokens,
} from "@/lib/temas";
import { invalidarCoresDoTema } from "@/components/ui";
import {
  ESCALA_DENSIDADE,
  ROTULO_DENSIDADE,
  modoEfetivo,
  useUi,
  type Densidade,
  type Tema,
} from "@/store/ui";
import { cn, comAlfa } from "@/lib/utils";

/* ==========================================================================
   Utilidades de pré-visualização
   ========================================================================== */

/**
 * Converte tokens em variáveis CSS inline. Como as classes utilitárias do
 * design system leem essas variáveis, envolver qualquer conteúdo com este
 * estilo faz o componente ser renderizado com o tema indicado — permitindo
 * pré-visualização fiel sem aplicar o tema globalmente.
 */
export function estiloDeTokens(tokens: Tokens): CSSProperties {
  const estilo: Record<string, string> = {
    "--sgp-bg": tokens.bg,
    "--sgp-bg-alt": tokens.bgAlt,
    "--sgp-surface": tokens.surface,
    "--sgp-surface-2": tokens.surface2,
    "--sgp-surface-3": tokens.surface3,
    "--sgp-border": tokens.border,
    "--sgp-border-strong": tokens.borderStrong,
    "--sgp-fg": tokens.fg,
    "--sgp-fg-muted": tokens.fgMuted,
    "--sgp-fg-subtle": tokens.fgSubtle,
    "--sgp-brand": tokens.brand,
    "--sgp-brand-hover": tokens.brandHover,
    "--sgp-brand-soft": tokens.brandSoft,
    "--sgp-brand-fg": tokens.brandFg,
    "--sgp-success": tokens.success,
    "--sgp-success-soft": tokens.successSoft,
    "--sgp-warning": tokens.warning,
    "--sgp-warning-soft": tokens.warningSoft,
    "--sgp-danger": tokens.danger,
    "--sgp-danger-soft": tokens.dangerSoft,
    "--sgp-info": tokens.info,
    "--sgp-info-soft": tokens.infoSoft,
    "--sgp-neutral": tokens.neutral,
    "--sgp-neutral-soft": tokens.neutralSoft,
    "--radius-sgp": tokens.raio,
    "--radius-sgp-lg": parseInt(tokens.raio, 10) + 4 + "px",
    "--radius-sgp-xl": parseInt(tokens.raio, 10) + 8 + "px",
    colorScheme: modoClaro(tokens) ? "light" : "dark",
  };
  return estilo as CSSProperties;
}

function modoClaro(tokens: Tokens): boolean {
  return contrasteWCAG(tokens.bg, "#FFFFFF") < contrasteWCAG(tokens.bg, "#000000");
}

/* ==========================================================================
   Prévia compacta — mini interface renderizada com os tokens do tema
   ========================================================================== */

export function PreviaTema({ tokens, compacta }: { tokens: Tokens; compacta?: boolean }) {
  const barras = [82, 64, 91, 47, 73];
  return (
    <div
      style={estiloDeTokens(tokens)}
      className="overflow-hidden rounded-sgp-lg border border-border bg-bg p-3"
      aria-hidden
    >
      <div className="rounded-sgp-lg border border-border bg-surface p-2.5 shadow-n1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span className="grid size-5 place-items-center rounded-md bg-brand text-brand-fg">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="text-2xs font-bold text-fg">SGP</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-success" />
            <span className="size-2 rounded-full bg-warning" />
            <span className="size-2 rounded-full bg-danger" />
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="rounded-sgp bg-brand px-2 py-0.5 text-[9px] font-bold text-brand-fg">Primário</span>
          <span className="rounded-sgp border border-border bg-surface-2 px-2 py-0.5 text-[9px] font-semibold text-fg">
            Secundário
          </span>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: comAlfa(tokens.success, 0.18), color: tokens.success }}>
            sucesso
          </span>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: comAlfa(tokens.warning, 0.2), color: tokens.warning }}>
            atenção
          </span>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ backgroundColor: comAlfa(tokens.danger, 0.18), color: tokens.danger }}>
            crítico
          </span>
        </div>

        {!compacta && (
          <>
            <div className="mt-2 flex items-end gap-1">
              {barras.map((altura, indice) => (
                <span
                  key={indice}
                  className="flex-1 rounded-sm"
                  style={{
                    height: (altura / 100) * 32,
                    backgroundColor: indice === 4 ? tokens.brand : comAlfa(tokens.brand, 0.4 - indice * 0.06),
                  }}
                />
              ))}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-brand" style={{ width: "68%" }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Cartão de tema
   ========================================================================== */

function SeloContraste({ tema, modo }: { tema: DefinicaoTema; modo: ModoTema }) {
  const razao = contrastePrincipal(tema, modo);
  const nivel = nivelContraste(razao);
  return (
    <Dica texto={"Contraste do texto principal sobre o fundo: " + razao.toFixed(2) + ":1 (WCAG 2.1)"}>
      <Etiqueta tom={nivel.tom} icone={Contrast}>
        {nivel.rotulo}
      </Etiqueta>
    </Dica>
  );
}

export function CartaoTema({
  tema,
  modo,
  ativo,
  aoAplicar,
  aoExportar,
}: {
  tema: DefinicaoTema;
  modo: ModoTema;
  ativo: boolean;
  aoAplicar: () => void;
  aoExportar?: () => void;
}) {
  const tokens = useMemo(() => resolverTokens(tema, modo), [tema, modo]);
  const [detalhado, setDetalhado] = useState(false);

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-sgp-lg border bg-surface shadow-n1 transition-all",
        ativo ? "border-brand ring-2 ring-brand/40" : "border-border hover:-translate-y-0.5 hover:shadow-n2"
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b border-border px-3.5 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 truncate text-sm font-semibold text-fg">
            {tema.nome}
            {ativo && <Check className="size-3.5 shrink-0 text-brand" aria-label="Tema em uso" />}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-2xs text-fg-muted">{tema.descricao}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Etiqueta tom={tema.categoria === "acessibilidade" ? "info" : "neutral"}>
            {tema.categoria === "acessibilidade" ? "acessível" : tema.categoria}
          </Etiqueta>
          <SeloContraste tema={tema} modo={modo} />
        </div>
      </header>

      <div className="p-3">
        <PreviaTema tokens={tokens} compacta={!detalhado} />
      </div>

      <div className="flex flex-wrap gap-1 px-3">
        {(["brand", "surface", "success", "warning", "danger", "info", "fg"] as Array<keyof Tokens>).map((chave) => (
          <Dica key={chave} texto={chave + ": " + tokens[chave]}>
            <span
              className="size-5 rounded-md border border-border"
              style={{ backgroundColor: tokens[chave] }}
            />
          </Dica>
        ))}
      </div>

      <footer className="mt-auto flex items-center gap-1.5 border-t border-border px-3 py-2.5">
        <Botao
          variante={ativo ? "fantasma" : "primario"}
          tamanho="sm"
          icone={ativo ? Check : Paintbrush}
          onClick={aoAplicar}
          disabled={ativo}
          className="flex-1"
        >
          {ativo ? "Em uso" : "Aplicar tema"}
        </Botao>
        <BotaoIcone
          icone={Eye}
          rotulo={detalhado ? "Prévia compacta" : "Prévia detalhada"}
          tamanho="sm"
          ativo={detalhado}
          onClick={() => setDetalhado((v) => !v)}
        />
        {aoExportar && <BotaoIcone icone={Download} rotulo="Exportar tema" tamanho="sm" onClick={aoExportar} />}
      </footer>

      {tema.referencia && (
        <p className="border-t border-border bg-surface-2 px-3 py-2 text-[10px] leading-relaxed text-fg-subtle">
          {tema.referencia}
        </p>
      )}
    </article>
  );
}

/* ==========================================================================
   Galeria
   ========================================================================== */

const CATEGORIAS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "institucional", rotulo: "Institucional" },
  { valor: "classico", rotulo: "Clássicos" },
  { valor: "vibrante", rotulo: "Vibrantes" },
  { valor: "acessibilidade", rotulo: "Acessibilidade" },
];

export function GaleriaTemas() {
  const { paleta, tema, definirPaleta, temaCustom, salvarTemaCustom } = useUi();
  const { sucesso } = useAvisos();
  const [categoria, setCategoria] = useState("todos");
  const modo = modoEfetivo(tema);

  const lista = useMemo(
    () => (categoria === "todos" ? TEMAS : TEMAS.filter((t) => t.categoria === categoria)),
    [categoria]
  );

  const exportar = (definicao: DefinicaoTema) => {
    const conteudo = JSON.stringify(
      {
        nome: definicao.nome,
        base: definicao.id,
        claro: resolverTokens(definicao, "claro"),
        escuro: resolverTokens(definicao, "escuro"),
      },
      null,
      2
    );
    const blob = new Blob([conteudo], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sgp-tema-" + definicao.id + ".json";
    a.click();
    URL.revokeObjectURL(url);
    sucesso("Tema exportado", definicao.nome + ".json");
  };

  const exportarCustom = () => {
    const blob = new Blob([JSON.stringify(temaCustom, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sgp-tema-personalizado.json";
    a.click();
    URL.revokeObjectURL(url);
    sucesso("Tema personalizado exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado
          valor={categoria}
          onChange={setCategoria}
          tamanho="sm"
          opcoes={CATEGORIAS.map((c) => ({ valor: c.valor, rotulo: c.rotulo }))}
        />
        <div className="flex items-center gap-2">
          {Object.keys(temaCustom.claro).length + Object.keys(temaCustom.escuro).length > 0 && (
            <Chip
              cor={resolverTokens(TEMAS_POR_ID[temaCustom.base] ?? TEMAS_POR_ID.sgp, modo).brand}
              icone={Wand2}
              ativo={paleta === "custom"}
              onClick={() => definirPaleta("custom")}
            >
              Meu tema personalizado
            </Chip>
          )}
          <Botao variante="secundario" tamanho="sm" icone={Download} onClick={exportarCustom}>
            Exportar meu tema
          </Botao>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {lista.map((definicao) => (
          <CartaoTema
            key={definicao.id}
            tema={definicao}
            modo={modo}
            ativo={paleta === definicao.id}
            aoAplicar={() => {
              definirPaleta(definicao.id);
              sucesso("Tema aplicado", definicao.nome);
            }}
            aoExportar={() => exportar(definicao)}
          />
        ))}
      </div>

      <p className="text-2xs leading-relaxed text-fg-subtle">
        O selo de contraste indica a razão WCAG 2.1 entre o texto principal e o fundo. O SGP exige nível AA (4,5:1)
        para texto normal, conforme o requisito RNF-15 da especificação. Os temas são salvos na sua conta e
        acompanham você em qualquer navegador.
      </p>
    </div>
  );
}

/* ==========================================================================
   Editor de tema personalizado
   ========================================================================== */

export function EditorTemaCustom() {
  const { temaCustom, salvarTemaCustom, tema, paleta, definirPaleta } = useUi();
  const { sucesso, avisar } = useAvisos();
  const [rascunho, setRascunho] = useState<TemaCustom>(temaCustom);
  const [aba, setAba] = useState<ModoTema>("claro");
  const [importando, setImportando] = useState(false);
  const entradaArquivo = useRef<HTMLInputElement>(null);
  const modo = modoEfetivo(tema);

  const base = TEMAS_POR_ID[rascunho.base] ?? TEMAS_POR_ID.sgp;
  const tokensBase = resolverTokens(base, aba);
  const tokensRascunho = resolverCustom(rascunho, aba);
  const alterados = Object.keys(rascunho[aba] ?? {}).length;

  /** Aplica o rascunho imediatamente no documento (WYSIWYG), sem persistir. */
  const preVisualizar = (novo: TemaCustom) => {
    setRascunho(novo);
    aplicarTemaNoDocumento("custom", modoEfetivo(tema), novo);
    invalidarCoresDoTema();
  };

  const alterar = (chave: keyof Tokens, valor: string) => {
    preVisualizar({ ...rascunho, [aba]: { ...rascunho[aba], [chave]: valor } });
  };

  const limparCampo = (chave: keyof Tokens) => {
    const ajustes = { ...rascunho[aba] };
    delete ajustes[chave];
    preVisualizar({ ...rascunho, [aba]: ajustes });
  };

  const restaurar = () => {
    const vazio: TemaCustom = { ...rascunho, claro: {}, escuro: {} };
    preVisualizar(vazio);
    avisar("Ajustes revertidos para a base", { tom: "info", descricao: base.nome });
  };

  const salvar = () => {
    salvarTemaCustom(rascunho, true);
    sucesso("Tema personalizado salvo", "Ele já está aplicado à sua conta.");
  };

  const cancelar = () => {
    aplicarTemaNoDocumento(paleta, modoEfetivo(tema), temaCustom);
    invalidarCoresDoTema();
    setRascunho(temaCustom);
  };

  const exportarJson = () => {
    const blob = new Blob([JSON.stringify(rascunho, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sgp-tema-personalizado.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importarJson = async (arquivo: File) => {
    try {
      const texto = await arquivo.text();
      const dados = JSON.parse(texto) as Partial<TemaCustom>;
      const novo: TemaCustom = {
        base: dados.base && TEMAS_POR_ID[dados.base] ? dados.base : rascunho.base,
        nome: dados.nome || "Tema importado",
        claro: (dados.claro ?? {}) as Partial<Tokens>,
        escuro: (dados.escuro ?? {}) as Partial<Tokens>,
      };
      preVisualizar(novo);
      sucesso("Tema importado", "Revise os valores e clique em Salvar para aplicar.");
    } catch {
      avisar("Arquivo inválido", { tom: "danger", descricao: "Envie um JSON exportado pelo SGP." });
    }
  };

  const grupos = ["Marca", "Superfícies", "Texto e bordas", "Estados"] as const;
  const razaoTexto = contrasteWCAG(tokensRascunho.fg, tokensRascunho.bg);
  const nivel = nivelContraste(razaoTexto);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Nome do tema" className="w-52">
            <Entrada
              value={rascunho.nome}
              onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })}
              placeholder="Meu tema"
            />
          </Campo>
          <Campo rotulo="Tema base" dica="Os ajustes abaixo partem desta paleta." className="w-52">
            <select
              value={rascunho.base}
              onChange={(e) => preVisualizar({ ...rascunho, base: e.target.value })}
              className="h-9 w-full rounded-sgp border border-border-strong bg-surface px-3 text-sm text-fg outline-none focus:border-brand"
            >
              {TEMAS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Segmentado<ModoTema>
            valor={aba}
            onChange={setAba}
            opcoes={[
              { valor: "claro", rotulo: "Modo claro", icone: Sun },
              { valor: "escuro", rotulo: "Modo escuro", icone: Moon },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={nivel.tom} icone={Accessibility}>
            contraste {razaoTexto.toFixed(2)}:1 · {nivel.rotulo}
          </Etiqueta>
          {alterados > 0 && <Etiqueta tom="brand">{alterados} ajuste(s) neste modo</Etiqueta>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-3">
          {grupos.map((grupo) => (
            <section key={grupo} className="rounded-sgp-lg border border-border bg-surface shadow-n1">
              <header className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{grupo}</h4>
                <span className="text-2xs text-fg-subtle">
                  {CAMPOS_EDITAVEIS.filter((c) => c.grupo === grupo).length} tokens
                </span>
              </header>
              <div className="grid gap-3 p-3.5 sm:grid-cols-2">
                {CAMPOS_EDITAVEIS.filter((c) => c.grupo === grupo).map((campo) => {
                  const definido = rascunho[aba]?.[campo.chave];
                  const valor = tokensRascunho[campo.chave];
                  const padrao = tokensBase[campo.chave];
                  return (
                    <div key={campo.chave} className="flex items-center gap-2.5">
                      <label className="relative shrink-0" title={"Escolher " + campo.rotulo}>
                        <input
                          type="color"
                          value={valor}
                          onChange={(e) => alterar(campo.chave, e.target.value.toUpperCase())}
                          className="size-9 cursor-pointer rounded-sgp border border-border-strong bg-surface p-0.5"
                          aria-label={campo.rotulo}
                        />
                        {definido && (
                          <span className="pointer-events-none absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-brand ring-2 ring-surface" />
                        )}
                      </label>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-fg">{campo.rotulo}</p>
                        <input
                          value={valor}
                          onChange={(e) => {
                            const texto = e.target.value.trim();
                            if (/^#[0-9A-Fa-f]{6}$/.test(texto) || /^#[0-9A-Fa-f]{3}$/.test(texto)) {
                              alterar(campo.chave, texto.toUpperCase());
                            }
                          }}
                          onBlur={(e) => {
                            const texto = e.target.value.trim();
                            if (!/^#[0-9A-Fa-f]{3,6}$/.test(texto)) alterar(campo.chave, valor);
                          }}
                          className="w-full bg-transparent font-mono text-2xs text-fg-muted outline-none"
                          aria-label={campo.rotulo + " (hexadecimal)"}
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Dica texto={"Clarear · padrão: " + padrao}>
                          <BotaoIcone
                            icone={Sun}
                            rotulo="Clarear"
                            tamanho="xs"
                            onClick={() => alterar(campo.chave, ajustarLuminosidade(valor, 6))}
                          />
                        </Dica>
                        <Dica texto="Escurecer">
                          <BotaoIcone
                            icone={Moon}
                            rotulo="Escurecer"
                            tamanho="xs"
                            onClick={() => alterar(campo.chave, ajustarLuminosidade(valor, -6))}
                          />
                        </Dica>
                        <Dica texto="Restaurar valor do tema base">
                          <BotaoIcone
                            icone={RotateCcw}
                            rotulo="Restaurar"
                            tamanho="xs"
                            disabled={!definido}
                            onClick={() => limparCampo(campo.chave)}
                          />
                        </Dica>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-3">
          <div className="sticky top-0 space-y-3">
            <section className="rounded-sgp-lg border border-border bg-surface shadow-n1">
              <header className="border-b border-border px-3.5 py-2.5">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <Eye className="size-3.5" aria-hidden /> Pré-visualização em tempo real
                </h4>
              </header>
              <div style={estiloDeTokens(tokensRascunho)} className="rounded-b-sgp-lg bg-bg p-4">
                <div className="space-y-3 rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-sgp bg-brand text-brand-fg">
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                      <span className="leading-tight">
                        <span className="block text-sm font-extrabold text-fg">SGP</span>
                        <span className="block text-[9px] uppercase tracking-wider text-fg-muted">
                          Gestão de Projetos
                        </span>
                      </span>
                    </span>
                    <span className="rounded-sgp bg-brand px-2.5 py-1 text-2xs font-bold text-brand-fg">Ação</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-2xs font-semibold text-brand">marca</span>
                    <span className="rounded-full px-2 py-0.5 text-2xs font-semibold" style={{ backgroundColor: comAlfa(tokensRascunho.success, 0.18), color: tokensRascunho.success }}>
                      sucesso
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-2xs font-semibold" style={{ backgroundColor: comAlfa(tokensRascunho.warning, 0.2), color: tokensRascunho.warning }}>
                      atenção
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-2xs font-semibold" style={{ backgroundColor: comAlfa(tokensRascunho.danger, 0.18), color: tokensRascunho.danger }}>
                      crítico
                    </span>
                    <span className="rounded-full border border-border-strong px-2 py-0.5 text-2xs font-semibold text-fg-muted">
                      neutro
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex justify-between text-2xs text-fg-muted">
                        <span>Progresso do projeto</span>
                        <span className="font-semibold text-fg">68%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-brand" style={{ width: "68%" }} />
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: "42%", backgroundColor: tokensRascunho.warning }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { rotulo: "CPI", valor: "1,04", cor: tokensRascunho.success },
                      { rotulo: "SPI", valor: "0,92", cor: tokensRascunho.warning },
                      { rotulo: "VAC", valor: "-8%", cor: tokensRascunho.danger },
                    ].map((kpi) => (
                      <div key={kpi.rotulo} className="rounded-sgp border border-border bg-surface-2 p-2">
                        <p className="text-[9px] uppercase tracking-wide text-fg-muted">{kpi.rotulo}</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: kpi.cor }}>
                          {kpi.valor}
                        </p>
                      </div>
                    ))}
                  </div>

                  <table className="w-full text-2xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1 text-left font-semibold uppercase tracking-wide text-fg-muted">Tarefa</th>
                        <th className="py-1 text-right font-semibold uppercase tracking-wide text-fg-muted">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Modelagem de dados", "100%"],
                        ["Implementação da API", "72%"],
                        ["Testes de carga", "35%"],
                      ].map(([nome, valor]) => (
                        <tr key={nome} className="border-b border-border/60 last:border-0">
                          <td className="py-1 text-fg">{nome}</td>
                          <td className="py-1 text-right tabular-nums text-fg-muted">{valor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2">
              <Botao variante="primario" icone={Save} onClick={salvar} className="flex-1">
                Salvar e aplicar
              </Botao>
              <Botao variante="secundario" icone={RotateCcw} onClick={restaurar}>
                Restaurar base
              </Botao>
              <Botao variante="fantasma" onClick={cancelar} disabled={paleta !== "custom" && !alterados}>
                Descartar
              </Botao>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Botao variante="secundario" tamanho="sm" icone={Download} onClick={exportarJson}>
                Exportar JSON
              </Botao>
              <Botao variante="secundario" tamanho="sm" icone={Upload} onClick={() => setImportando(true)}>
                Importar JSON
              </Botao>
              <Botao
                variante="fantasma"
                tamanho="sm"
                icone={Trash2}
                onClick={() => {
                  const vazio: TemaCustom = { ...TEMA_CUSTOM_VAZIO, base: rascunho.base };
                  preVisualizar(vazio);
                  salvarTemaCustom(vazio, false);
                  definirPaleta(TEMAS_POR_ID[vazio.base] ? vazio.base : "sgp");
                  sucesso("Tema personalizado removido");
                }}
              >
                Excluir tema
              </Botao>
            </div>
          </div>
        </div>
      </div>

      <Modal
        aberto={importando}
        onFechar={() => setImportando(false)}
        titulo="Importar tema personalizado"
        subtitulo="Selecione um arquivo JSON exportado pelo SGP"
        largura="sm"
      >
        <input
          ref={entradaArquivo}
          type="file"
          accept="application/json,.json"
          className="w-full rounded-sgp border border-dashed border-border-strong bg-surface-2 p-6 text-xs text-fg-muted"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) {
              importarJson(arquivo);
              setImportando(false);
            }
          }}
        />
        <p className="mt-3 text-2xs text-fg-subtle">
          O arquivo deve conter as chaves <code className="rounded bg-surface-3 px-1">base</code>,{" "}
          <code className="rounded bg-surface-3 px-1">claro</code> e{" "}
          <code className="rounded bg-surface-3 px-1">escuro</code> com os tokens de cor.
        </p>
      </Modal>
    </div>
  );
}


/* ==========================================================================
   Seletor de densidade com comparação visual
   --------------------------------------------------------------------------
   Cada opção é renderizada com a sua própria escala de espaçamento, então a
   diferença fica evidente antes de aplicar — princípio "visual-first" (DV-01).
   ========================================================================== */

function MiniLista({ escala, rotulo }: { escala: string; rotulo: string }) {
  const estilo = { "--spacing": escala } as CSSProperties;
  return (
    <div style={estilo} className="rounded-sgp-lg border border-border bg-surface p-2">
      <div className="flex flex-col gap-1.5">
        {[
          { nome: "Migração para Nuvem", pct: 82, cor: "#2563EB" },
          { nome: "Portal do Cliente", pct: 46, cor: "#059669" },
          { nome: "Adequação LGPD", pct: 91, cor: "#D97706" },
        ].map((item) => (
          <div key={item.nome} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2 py-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.cor }} />
            <span className="min-w-0 flex-1 truncate text-2xs font-medium text-fg">{item.nome}</span>
            <span className="shrink-0 text-[9px] font-bold tabular-nums text-fg-muted">{item.pct}%</span>
            <span className="h-1 w-8 shrink-0 overflow-hidden rounded-full bg-surface-3">
              <span className="block h-full rounded-full" style={{ width: item.pct + "%", backgroundColor: item.cor }} />
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2 pt-0.5">
          <span className="rounded-sgp bg-brand px-2 py-1 text-[9px] font-bold text-brand-fg">Ação</span>
          <span className="rounded-sgp border border-border-strong px-2 py-1 text-[9px] font-semibold text-fg-muted">
            Secundário
          </span>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[9px] font-semibold uppercase tracking-wide text-fg-subtle">{rotulo}</p>
    </div>
  );
}

export function SeletorDensidade({ colunas = 3 }: { colunas?: 1 | 3 }) {
  const { densidade, definirDensidade } = useUi();
  const { sucesso } = useAvisos();

  const opcoes: Array<{ valor: Densidade; descricao: string }> = [
    { valor: "compacta", descricao: "85% do espaçamento — mais dados na tela" },
    { valor: "padrao", descricao: "100% — equilíbrio padrão do sistema" },
    { valor: "confortavel", descricao: "115% — mais respiro e área de toque" },
  ];

  return (
    <div className={cn("grid gap-3", colunas === 3 ? "sm:grid-cols-3" : "grid-cols-1")}>
      {opcoes.map((opcao) => {
        const ativo = densidade === opcao.valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => {
              definirDensidade(opcao.valor);
              sucesso("Densidade aplicada", ROTULO_DENSIDADE[opcao.valor]);
            }}
            className={cn(
              "flex flex-col gap-2 rounded-sgp-lg border p-2.5 text-left transition-all",
              ativo
                ? "border-brand bg-brand-soft/40 ring-2 ring-brand/30"
                : "border-border bg-surface hover:-translate-y-0.5 hover:border-border-strong hover:shadow-n2"
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                {ativo && <Check className="size-3.5 shrink-0 text-brand" aria-hidden />}
                {ROTULO_DENSIDADE[opcao.valor]}
              </span>
              <span className="shrink-0 font-mono text-[9px] text-fg-subtle">{ESCALA_DENSIDADE[opcao.valor]}</span>
            </span>

            <MiniLista escala={ESCALA_DENSIDADE[opcao.valor]} rotulo={ativo ? "em uso" : "prévia"} />

            <span className="text-2xs leading-snug text-fg-muted">{opcao.descricao}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   Seletor compacto — usado no menu do usuário
   ========================================================================== */

export function SeletorTemaCompacto({ children }: { children?: ReactNode }) {
  const { tema, paleta, defininirTema, definirPaleta } = useUi();
  const modo = modoEfetivo(tema);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Modo</p>
        <Segmentado<Tema>
          valor={tema}
          onChange={defininirTema}
          tamanho="sm"
          opcoes={[
            { valor: "claro", rotulo: "Claro", icone: Sun },
            { valor: "escuro", rotulo: "Escuro", icone: Moon },
            { valor: "sistema", rotulo: "Auto", icone: Sparkles },
          ]}
        />
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
          <Palette className="size-3" aria-hidden /> Tema
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {TEMAS.map((definicao) => {
            const tokens = resolverTokens(definicao, modo);
            const ativo = paleta === definicao.id;
            return (
              <Dica key={definicao.id} texto={definicao.nome}>
                <button
                  type="button"
                  onClick={() => definirPaleta(definicao.id)}
                  aria-label={"Aplicar tema " + definicao.nome}
                  aria-pressed={ativo}
                  className={cn(
                    "relative grid h-9 w-full place-items-center overflow-hidden rounded-sgp border transition-all",
                    ativo ? "border-brand ring-2 ring-brand/40" : "border-border hover:scale-105"
                  )}
                  style={{ background: "linear-gradient(135deg, " + tokens.brand + " 0 50%, " + tokens.surface + " 50% 100%)" }}
                >
                  {ativo && (
                    <span className="grid size-4 place-items-center rounded-full bg-surface shadow-n1">
                      <Check className="size-2.5 text-brand" strokeWidth={4} aria-hidden />
                    </span>
                  )}
                </button>
              </Dica>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}

import { useState } from "react";
import {
  Accessibility,
  BookOpen,
  Check,
  Contrast,
  Eye,
  Info,
  Layers,
  Moon,
  Palette,
  Paintbrush,
  Sparkles,
  Sun,
  Wand2,
} from "lucide-react";
import {
  Abas,
  Alerta,
  CabecalhoPagina,
  Dica,
  Etiqueta,
  GradeCards,
  SecaoColapsavel,
} from "@/components/ui";
import { EscalaCores } from "@/components/charts";
import { EditorTemaCustom, GaleriaTemas, PreviaTema, SeletorDensidade } from "@/components/seletor-tema";
import { useUi, modoEfetivo, type Tema } from "@/store/ui";
import { TEMAS, TEMAS_POR_ID, contrasteWCAG, resolverTokens } from "@/lib/temas";

type Aba = "predefinidos" | "personalizado" | "densidade" | "como-funciona";

export default function Temas() {
  const { tema, paleta, defininirTema, temaCustom } = useUi();
  const [aba, setAba] = useState<Aba>("predefinidos");
  const modo = modoEfetivo(tema);
  const atual = TEMAS_POR_ID[paleta] ?? TEMAS_POR_ID.sgp;
  const tokensAtuais = paleta === "custom"
    ? resolverTokens(TEMAS_POR_ID[temaCustom.base] ?? TEMAS_POR_ID.sgp, modo)
    : resolverTokens(atual, modo);

  const temPersonalizado =
    Object.keys(temaCustom.claro).length + Object.keys(temaCustom.escuro).length > 0;

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Temas e aparência"
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {paleta === "custom" ? temaCustom.nome : atual.nome} · modo {modo}
            </span>
            <Etiqueta tom="neutral" icone={Layers}>
              {TEMAS.length} temas predefinidos
            </Etiqueta>
            {temPersonalizado && (
              <Etiqueta tom="brand" icone={Wand2}>
                tema personalizado ativo
              </Etiqueta>
            )}
          </span>
        }
        icone={Palette}
        cor={tokensAtuais.brand}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xs font-medium text-fg-muted">Modo de cor</span>
            {(
              [
                { valor: "claro" as Tema, rotulo: "Claro", icone: Sun },
                { valor: "escuro" as Tema, rotulo: "Escuro", icone: Moon },
                { valor: "sistema" as Tema, rotulo: "Sistema", icone: Sparkles },
              ]
            ).map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => defininirTema(opcao.valor)}
                aria-pressed={tema === opcao.valor}
                className={
                  "inline-flex h-9 items-center gap-1.5 rounded-sgp border px-3 text-xs font-medium transition-all " +
                  (tema === opcao.valor
                    ? "border-brand bg-brand-soft/60 text-brand"
                    : "border-border-strong bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg")
                }
              >
                <opcao.icone className="size-3.5" aria-hidden />
                {opcao.rotulo}
              </button>
            ))}
          </div>
        }
      />

      <Abas<Aba>
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: "predefinidos", rotulo: "Temas predefinidos", icone: Palette, contagem: TEMAS.length },
          { valor: "personalizado", rotulo: "Criar meu tema", icone: Paintbrush },
          { valor: "densidade", rotulo: "Densidade", icone: Layers },
          { valor: "como-funciona", rotulo: "Como funciona", icone: BookOpen },
        ]}
      />

      {aba === "predefinidos" && (
        <div className="space-y-4">
          <Alerta tom="info" icone={Eye} titulo="Pré-visualização real">
            Cada cartão abaixo renderiza componentes de verdade do SGP com os tokens daquele tema — o que você vê é
            exatamente o resultado final (WYSIWYG, diretriz DV-03). Clique em <strong>Aplicar tema</strong> para usar,
            ou no ícone de olho para ampliar a prévia.
          </Alerta>
          <GaleriaTemas />
        </div>
      )}

      {aba === "personalizado" && (
        <div className="space-y-4">
          <Alerta tom="brand" icone={Wand2} titulo="Editor visual com aplicação instantânea">
            Escolha um tema base e ajuste qualquer token de cor. As mudanças são aplicadas imediatamente em toda a
            interface para você avaliar no contexto real; nada é salvo até você clicar em <strong>Salvar e aplicar</strong>.
          </Alerta>
          <EditorTemaCustom />
        </div>
      )}

      {aba === "densidade" && (
        <div className="space-y-4">
          <Alerta tom="brand" icone={Layers} titulo="Densidade atua na escala de espaçamento">
            A densidade redefine a escala base de espaçamento do design system, que sustenta todos os paddings,
            margens e gaps da interface. Por isso a mudança é imediata e vale para todas as telas — tabelas, listas,
            cartões, formulários e barras de ferramentas. Ícones e textos mantêm o tamanho: o que muda é o
            <strong> espaço entre os elementos</strong>, não o conteúdo.
          </Alerta>

          <SeletorDensidade />

          <GradeCards colunas="auto">
            <section className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="text-sm font-semibold text-fg">Quando usar cada densidade</h3>
              <ul className="mt-2 space-y-2 text-xs text-fg-muted">
                <li>
                  <strong className="text-fg">Compacta</strong> — análise de muitos dados: matriz de skills, heatmaps,
                  listas de tarefas longas, conferência de lançamentos.
                </li>
                <li>
                  <strong className="text-fg">Padrão</strong> — uso geral e dashboards. Equilíbrio entre densidade e
                  respiro, recomendado para o dia a dia.
                </li>
                <li>
                  <strong className="text-fg">Confortável</strong> — tablets, telas sensíveis ao toque, apresentações e
                  uso prolongado com menos fadiga visual.
                </li>
              </ul>
            </section>

            <section className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="text-sm font-semibold text-fg">Como é implementado</h3>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Cada densidade declara um valor de <code className="rounded bg-surface-3 px-1">--spacing</code> no
                elemento raiz. Os utilitários do Tailwind são compilados como{" "}
                <code className="rounded bg-surface-3 px-1">calc(var(--spacing) * N)</code>, então redefinir essa
                variável reflui a aplicação inteira sem alterar um único componente. A preferência é gravada no
                usuário e reaplicada no próximo acesso.
              </p>
              <p className="mt-2 text-2xs text-fg-subtle">
                Escalas: compacta 0,2125rem · padrão 0,25rem · confortável 0,2875rem por unidade.
              </p>
            </section>
          </GradeCards>
        </div>
      )}

      {aba === "como-funciona" && (
        <div className="space-y-4">
          <GradeCards colunas="auto">
            <section className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Layers className="size-4 text-fg-muted" aria-hidden /> Arquitetura de tokens
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Toda a interface consome apenas variáveis CSS <code className="rounded bg-surface-3 px-1">--sgp-*</code>,
                mapeadas para utilitários Tailwind via <code className="rounded bg-surface-3 px-1">@theme inline</code>.
                Um tema é um conjunto desses tokens — trocar de tema reescreve as variáveis no elemento raiz, sem
                recarregar a página e sem recompilar CSS.
              </p>
            </section>

            <section className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Paintbrush className="size-4 text-fg-muted" aria-hidden /> Derivação por semente
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                Cada tema predefinido é declarado apenas com uma <strong>semente</strong> — cor de marca, cores de
                estado e matiz neutra. Os 27 tokens são derivados por matemática de cor (mistura, luminosidade,
                saturação), o que garante consistência entre todos os temas e evita paletas desalinhadas.
              </p>
            </section>

            <section className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Accessibility className="size-4 text-fg-muted" aria-hidden /> Acessibilidade
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                O contraste entre texto principal e fundo é calculado em tempo real pela fórmula WCAG 2.1 e exibido
                no selo de cada tema. A especificação exige nível <strong>AA (4,5:1)</strong> — RNF-15. O tema
                Alto contraste vai além e atinge AAA.
              </p>
            </section>

            <section className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Check className="size-4 text-fg-muted" aria-hidden /> Portabilidade
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                A escolha é salva na sua conta (campos <code className="rounded bg-surface-3 px-1">paleta</code> e{" "}
                <code className="rounded bg-surface-3 px-1">tema_custom</code> do usuário), então acompanha você em
                qualquer navegador. Temas personalizados podem ser exportados e importados em JSON.
              </p>
            </section>
          </GradeCards>

          <SecaoColapsavel titulo="Mapa completo de tokens" icone={Palette} abertoInicial>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                  Tokens do tema ativo ({paleta === "custom" ? temaCustom.nome : atual.nome} · {modo})
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {(Object.keys(tokensAtuais) as Array<keyof typeof tokensAtuais>).map((chave) => {
                    const valor = tokensAtuais[chave];
                    const eCor = /^#[0-9A-Fa-f]{6}$/.test(valor);
                    return (
                      <div
                        key={chave}
                        className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 p-2"
                      >
                        <span
                          className="size-7 shrink-0 rounded-md border border-border"
                          style={eCor ? { backgroundColor: valor } : { background: "var(--sgp-surface-3)" }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-[10px] text-fg-muted">--sgp-{chave}</span>
                          <span className="block truncate font-mono text-2xs font-semibold text-fg">{valor}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Paleta do tema Bradesco 2026" icone={Info} abertoInicial>
            <div className="space-y-4">
              <Alerta tom="warning" titulo="Sobre a origem das cores">
                Esta paleta foi construída a partir das <strong>cores públicas documentadas da marca Bradesco</strong>:
                Vermelho Bradesco <code className="rounded bg-surface-3 px-1">#CC092F</code>, Roxo institucional{" "}
                <code className="rounded bg-surface-3 px-1">#633280</code>, Preto{" "}
                <code className="rounded bg-surface-3 px-1">#231F20</code>, Cinza{" "}
                <code className="rounded bg-surface-3 px-1">#EBEBEB</code> e Branco. O brandbook oficial de fev/2026 é
                publicado em PDF e não é legível por este ambiente, então <strong>os valores devem ser conferidos
                contra o guia oficial antes de uso institucional</strong>. Ao aplicar o tema, as cores ficam editáveis
                na aba "Criar meu tema", caso o time de marca informe os valores exatos.
              </Alerta>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-sgp-lg border border-border bg-surface p-4">
                  <p className="mb-3 text-xs font-semibold text-fg">Cores da marca</p>
                  <ul className="space-y-2">
                    {[
                      { nome: "Vermelho Bradesco", hex: "#CC092F", uso: "Cor primária — botões, links, destaques" },
                      { nome: "Roxo institucional", hex: "#633280", uso: "Cor secundária — informativo e gráficos" },
                      { nome: "Preto institucional", hex: "#231F20", uso: "Texto e elementos de alto contraste" },
                      { nome: "Cinza claro", hex: "#EBEBEB", uso: "Superfícies e divisores" },
                      { nome: "Branco", hex: "#FFFFFF", uso: "Fundo de conteúdo" },
                    ].map((cor) => (
                      <li key={cor.hex} className="flex items-center gap-2.5">
                        <span
                          className="size-8 shrink-0 rounded-md border border-border"
                          style={{ backgroundColor: cor.hex }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-fg">{cor.nome}</span>
                          <span className="block text-2xs text-fg-muted">{cor.uso}</span>
                        </span>
                        <span className="shrink-0 font-mono text-2xs font-semibold text-fg-muted">{cor.hex}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-sgp-lg border border-border bg-surface p-4">
                  <p className="mb-3 text-xs font-semibold text-fg">Prévia do tema aplicado (modo claro e escuro)</p>
                  <div className="space-y-3">
                    <PreviaTema tokens={resolverTokens(TEMAS_POR_ID.bradesco, "claro")} />
                    <PreviaTema tokens={resolverTokens(TEMAS_POR_ID.bradesco, "escuro")} />
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                  Contraste de cada tema (WCAG 2.1 — texto principal sobre o fundo)
                </p>
                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1.5 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                          Tema
                        </th>
                        <th className="py-1.5 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                          Claro
                        </th>
                        <th className="py-1.5 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                          Escuro
                        </th>
                        <th className="py-1.5 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                          Conformidade
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {TEMAS.map((definicao) => {
                        const claro = contrasteWCAG(
                          resolverTokens(definicao, "claro").fg,
                          resolverTokens(definicao, "claro").bg
                        );
                        const escuro = contrasteWCAG(
                          resolverTokens(definicao, "escuro").fg,
                          resolverTokens(definicao, "escuro").bg
                        );
                        const pior = Math.min(claro, escuro);
                        return (
                          <tr key={definicao.id} className="border-b border-border/60 last:border-0">
                            <td className="py-1.5">
                              <span className="flex items-center gap-2">
                                <span
                                  className="size-3 shrink-0 rounded-sm"
                                  style={{ backgroundColor: definicao.semente.marca }}
                                />
                                <span className="font-medium text-fg">{definicao.nome}</span>
                              </span>
                            </td>
                            <td className="py-1.5 text-right tabular-nums text-fg-muted">{claro.toFixed(2)}:1</td>
                            <td className="py-1.5 text-right tabular-nums text-fg-muted">{escuro.toFixed(2)}:1</td>
                            <td className="py-1.5">
                              <Etiqueta tom={pior >= 7 ? "success" : pior >= 4.5 ? "success" : pior >= 3 ? "warning" : "danger"}>
                                {pior >= 7 ? "AAA" : pior >= 4.5 ? "AA" : pior >= 3 ? "AA (texto grande)" : "Insuficiente"}
                              </Etiqueta>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <EscalaCores
                  rotulos={["Insuficiente", "AA grande", "AA", "AAA"]}
                  cores={["#DC2626", "#D97706", "#059669", "#047857"]}
                  titulo="Escala de conformidade"
                />
                <Dica texto="Critério WCAG 2.1: AA exige 4,5:1 para texto normal e 3:1 para texto grande; AAA exige 7:1.">
                  <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
                    <Contrast className="size-3.5" aria-hidden /> como interpretamos o selo
                  </span>
                </Dica>
              </div>
            </div>
          </SecaoColapsavel>
        </div>
      )}
    </div>
  );
}

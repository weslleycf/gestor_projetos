import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  CircleHelp,
  Eye,
  HelpCircle,
  Lightbulb,
  Printer,
  Search,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import {
  Abas,
  Alerta,
  BarraFerramentas,
  CabecalhoPagina,
  CarregandoBloco,
  Chip,
  Dica,
  EntradaBusca,
  Etiqueta,
  GradeCards,
  SecaoColapsavel,
  Tabela,
  Vazio,
  type ColunaTabela,
} from "@/components/ui";
import { PainelAjuda, useGuiaDaRota } from "@/components/ajuda";
import { ConteudoExplicacao, useExplicacoes } from "@/components/explicacao";
import {
  buscarExplicacoes,
  categoriasExplicacao,
  listarExplicacoes,
} from "@/lib/explicacoes";
import { useConsulta, useLista } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import {
  iconeDoGuia,
  urlDoManual,
  type GrupoAjuda,
  type GuiaAjuda,
  type GuiaAjudaResumo,
} from "@/lib/ajuda";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

interface ResumoAjuda {
  total_guias: number;
  grupos: number;
  visualizacoes: number;
  avaliacoes: number;
  percentual_util: number;
  nunca_consultados: number;
  mais_vistos: GuiaAjuda[];
  menos_uteis: Array<GuiaAjuda & { percentual_util: number; avaliacoes: number }>;
  telas_sem_guia: string[];
}

type Aba = "guias" | "glossario" | "manual" | "indicadores";

/** Capítulo do manual como a API de ajuda o descreve. */
interface ManualPublicado {
  arquivo: string;
  titulo: string;
  ordem?: number;
  linhas?: number;
}

/** Item exibido na aba "Manual completo". */
interface ItemManual {
  arquivo: string;
  titulo: string;
  ordem?: number;
  linhas?: number;
  descricao?: string;
}

/**
 * Reserva local da lista de capítulos, usada enquanto a consulta ao endpoint
 * do manual não responde. Também guarda as descrições, que a API não envia.
 */
const MANUAL: ItemManual[] = [
  { arquivo: "00-INDICE.md", titulo: "Índice do manual", descricao: "Como usar o manual e trilhas de leitura por papel." },
  { arquivo: "01-visao-geral-e-primeiros-passos.md", titulo: "Visão geral e primeiros passos", descricao: "O sistema, os perfis, o login, a navegação, os temas e a densidade." },
  { arquivo: "02-perfis-permissoes-e-seguranca.md", titulo: "Perfis, permissões e segurança", descricao: "Quem pode ver e fazer o quê, privacidade das capacidades, LGPD e auditoria." },
  { arquivo: "03-projetos-e-cronograma.md", titulo: "Projetos e cronograma", descricao: "Portfólio, programas, assistente de cadastro, Gantt, baseline e marcos." },
  { arquivo: "04-tarefas-e-execucao.md", titulo: "Tarefas e execução", descricao: "Tarefas, Kanban, lista, calendário, timeline, checklist e timesheet." },
  { arquivo: "05-recursos-e-alocacao.md", titulo: "Recursos e alocação", descricao: "Alocação, conflitos, ocupação e o motor de alocação inteligente." },
  { arquivo: "06-financeiro-e-evm.md", titulo: "Financeiro e EVM", descricao: "Orçamento, lançamentos, orçado × realizado, curva S e fluxo de caixa." },
  { arquivo: "07-riscos-e-issues.md", titulo: "Riscos e issues", descricao: "Matriz probabilidade × impacto, estratégias de resposta e Kanban de issues." },
  { arquivo: "08-capacidades-e-talentos.md", titulo: "Capacidades e talentos", descricao: "Catálogo, níveis, avaliações, XP, promoções, gap, PDI e sucessão." },
  { arquivo: "09-dashboards-e-relatorios.md", titulo: "Dashboards e relatórios", descricao: "Os seis dashboards, drill-down, relatórios por widgets e exportações." },
  { arquivo: "10-colaboracao-e-notificacoes.md", titulo: "Colaboração e notificações", descricao: "Comentários, menções, chat, atividades e regras de notificação." },
  { arquivo: "11-administracao.md", titulo: "Administração", descricao: "Usuários, papéis, workflows, campos personalizados e auditoria." },
  { arquivo: "12-perguntas-frequentes.md", titulo: "Perguntas frequentes", descricao: "Dúvidas transversais e tabela de problemas comuns e solução." },
  { arquivo: "13-integracoes-e-analytics.md", titulo: "Integrações e análises preditivas", descricao: "Conectores, webhooks, Monte Carlo, previsão e auditoria de viés." },
];

export default function Ajuda() {
  const navegar = useNavigate();
  const { usuario, pode } = useAuth();
  const [aba, setAba] = useState<Aba>("guias");
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState("");
  const [buscaGlossario, setBuscaGlossario] = useState("");
  const [categoriaGlossario, setCategoriaGlossario] = useState("");
  // A listagem devolve o RESUMO do guia (id, título, grupo, resumo), sem o passo
  // a passo nem os campos. Guardamos o identificador e buscamos o guia completo
  // ao abrir — antes o painel recebia o resumo e aparecia sem conteúdo.
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [params] = useSearchParams();
  const guiaDaUrl = params.get("guia");

  const { data: guiaCompleto, isFetching: carregandoGuia } = useConsulta<GuiaAjuda>(
    ["ajuda", "guia", selecionadoId],
    selecionadoId ? "/ajuda/" + selecionadoId + "/" : null
  );

  const grupos = useConsulta<{ grupos: GrupoAjuda[]; total: number }>(
    ["ajuda", "grupos"],
    "/ajuda/grupos/"
  );
  // A listagem devolve o resumo do guia — o tipo reflete isso de propósito, para
  // que ninguém volte a tratar o item da lista como se tivesse o conteúdo todo.
  const { data: guias = [] } = useLista<GuiaAjudaResumo>(["ajuda", "lista"], "/ajuda/", { ativo: true });
  const resumo = useConsulta<ResumoAjuda>(
    ["ajuda", "resumo"],
    pode("admin.ver") ? "/ajuda/resumo/" : null
  );
  // A lista de capítulos vem do próprio manual publicado, para não desatualizar.
  const manualPublicado = useConsulta<{ documentos: ManualPublicado[] }>(["ajuda", "manual"], "/ajuda/manual/");
  const documentosManual = useMemo<ItemManual[]>(() => {
    const publicados: ManualPublicado[] = manualPublicado.data?.documentos ?? [];
    const base: ManualPublicado[] = publicados.length > 0 ? publicados : MANUAL;
    return base
      .map((item) => ({
        arquivo: item.arquivo,
        titulo: item.titulo,
        ordem: item.ordem,
        linhas: item.linhas,
        descricao: MANUAL.find((conhecido) => conhecido.arquivo === item.arquivo)?.descricao,
      }))
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.arquivo.localeCompare(b.arquivo, "pt-BR"));
  }, [manualPublicado.data]);

  // Abre um guia direto pela URL — usado pela paleta de comandos (Ctrl+K).
  useEffect(() => {
    if (!guiaDaUrl) return;
    const alvo = guias.find((g) => String(g.id) === guiaDaUrl);
    if (alvo) setSelecionadoId(alvo.id);
  }, [guiaDaUrl, guias]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return guias.filter((guia) => {
      if (grupo && guia.grupo !== grupo) return false;
      if (!termo) return true;
      return (
        guia.titulo.toLowerCase().includes(termo) ||
        guia.resumo.toLowerCase().includes(termo) ||
        guia.grupo.toLowerCase().includes(termo) ||
        guia.rota.toLowerCase().includes(termo)
      );
    });
  }, [guias, busca, grupo]);

  const porGrupo = useMemo(() => {
    const mapa = new Map<string, GuiaAjudaResumo[]>();
    filtrados.forEach((guia) => {
      const lista = mapa.get(guia.grupo) ?? [];
      lista.push(guia);
      mapa.set(guia.grupo, lista);
    });
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [filtrados]);

  const explicacoesProntas = useExplicacoes();
  const explicacoesFiltradas = useMemo(() => {
    const porBusca = buscarExplicacoes(buscaGlossario);
    return categoriaGlossario ? porBusca.filter((e) => e.categoria === categoriaGlossario) : porBusca;
  }, [buscaGlossario, categoriaGlossario]);

  const abrirGuia = (guia: { id: number }) => setSelecionadoId(guia.id);

  const colunasMaisVistos: Array<ColunaTabela<GuiaAjuda>> = [
    {
      chave: "titulo",
      titulo: "Guia",
      renderizar: (g) => (
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface-3 text-fg-muted">
            {(() => {
              const Icone = iconeDoGuia(g.icone);
              return <Icone className="size-3.5" aria-hidden />;
            })()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-fg">{g.titulo}</p>
            <p className="truncate text-2xs text-fg-muted">{g.grupo}</p>
          </div>
        </div>
      ),
    },
    {
      chave: "visualizacoes",
      titulo: "Consultas",
      largura: "110px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (g) => g.visualizacoes,
      renderizar: (g) => <span className="tabular-nums text-xs text-fg-muted">{g.visualizacoes}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <CabecalhoPagina
        titulo="Central de ajuda"
        subtitulo="Guia de uso de cada tela, para consulta rápida enquanto você trabalha"
        icone={CircleHelp}
        cor="#2563EB"
        acoes={
          <>
            <Dica texto="Abre o guia da tela em que você está (F1)">
              <BotaoAjudaWrapper />
            </Dica>
          </>
        }
      />

      <Abas<Aba>
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: "guias", rotulo: "Guias por tela", icone: HelpCircle, contagem: guias.length },
          {
            valor: "glossario",
            rotulo: "Glossário dos cards",
            icone: BookMarked,
            contagem: listarExplicacoes().length || undefined,
          },
          { valor: "manual", rotulo: "Manual completo", icone: BookOpen, contagem: documentosManual.length },
          { valor: "indicadores", rotulo: "Uso da ajuda", icone: BarChart3 },
        ]}
      />

      {aba === "guias" && (
        <div className="space-y-4">
          <Alerta tom="info" icone={Lightbulb} titulo="Como consultar">
            Escolha um guia abaixo ou pressione <strong>F1</strong> em qualquer tela para ver o guia daquela página
            sem sair do que você está fazendo. Cada guia traz o passo a passo, o significado dos campos, como ler os
            indicadores e — igualmente importante — o que aquela tela não faz.
          </Alerta>

          <BarraFerramentas>
            <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar por tela, assunto ou grupo..." className="min-w-64 flex-1" />
            <Dica texto="Limpar filtros">
              <Chip cor="#64748B" ativo={!grupo} onClick={() => setGrupo("")}>
                Todos os grupos
              </Chip>
            </Dica>
            {(grupos.data?.grupos ?? []).map((g) => (
              <Chip key={g.nome} cor="#2563EB" ativo={grupo === g.nome} onClick={() => setGrupo(g.nome)}>
                {g.rotulo} ({g.total})
              </Chip>
            ))}
          </BarraFerramentas>

          {guias.length === 0 && (
            <Vazio
              icone={CircleHelp}
              titulo="Nenhum guia carregado"
              descricao="Os guias são carregados no banco de dados. Rode o comando de carga da central de ajuda."
            />
          )}

          {porGrupo.map(([nome, lista]) => (
            <section key={nome} className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                {nome}
                <Etiqueta tom="neutral">{lista.length} guia(s)</Etiqueta>
              </h2>
              <GradeCards colunas="auto">
                {lista.map((guia) => {
                  const Icone = iconeDoGuia(guia.icone);
                  return (
                    <button
                      key={guia.id}
                      type="button"
                      onClick={() => abrirGuia(guia)}
                      className={cn(
                        "flex flex-col gap-2 rounded-sgp-lg border border-border bg-surface p-3.5 text-left shadow-n1",
                        "transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-n2"
                      )}
                    >
                      <span className="flex items-start gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-sgp bg-brand-soft/60 text-brand">
                          <Icone className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-fg">{guia.titulo}</span>
                          <span className="block truncate font-mono text-[10px] text-fg-subtle">{guia.rota}</span>
                        </span>
                        {guia.visualizacoes > 0 && (
                          <span className="shrink-0 text-2xs tabular-nums text-fg-subtle">{guia.visualizacoes}</span>
                        )}
                      </span>
                      <span className="line-clamp-3 text-2xs leading-relaxed text-fg-muted">{guia.resumo}</span>
                      <span className="mt-auto flex flex-wrap items-center gap-1.5">
                        {guia.total_passos > 0 && <Etiqueta tom="brand">{guia.total_passos} passos</Etiqueta>}
                        {guia.total_limitacoes > 0 && <Etiqueta tom="warning">tem limitações</Etiqueta>}
                        {guia.percentual_util >= 80 && guia.total_avaliacoes >= 3 && (
                          <Etiqueta tom="success" icone={ThumbsUp}>bem avaliado</Etiqueta>
                        )}
                      </span>
                    </button>
                  );
                })}
              </GradeCards>
            </section>
          ))}

          {filtrados.length === 0 && guias.length > 0 && (
            <Vazio icone={Search} titulo="Nenhum guia encontrado" descricao="Ajuste a busca ou escolha outro grupo." />
          )}
        </div>
      )}

      {aba === "glossario" && (
        <div className="space-y-4">
          <Alerta tom="info" icone={BookMarked} titulo="O que significa cada número">
            Todo card do sistema tem um botão <strong>?</strong> que abre a explicação daquele indicador. Esta aba
            reúne todas elas para consulta em um só lugar. São {listarExplicacoes().length} termos em{" "}
            {categoriasExplicacao().length} categorias.
          </Alerta>

          <BarraFerramentas>
            <EntradaBusca
              valor={buscaGlossario}
              onChange={setBuscaGlossario}
              placeholder="Buscar termo, fórmula ou explicação..."
              className="min-w-64 flex-1"
            />
            <Chip cor="#64748B" ativo={!categoriaGlossario} onClick={() => setCategoriaGlossario("")}>
              Todas as categorias
            </Chip>
            {categoriasExplicacao().map((c) => (
              <Chip
                key={c}
                cor="#2563EB"
                ativo={categoriaGlossario === c}
                onClick={() => setCategoriaGlossario(c)}
              >
                {c}
              </Chip>
            ))}
          </BarraFerramentas>

          {!explicacoesProntas ? (
            <CarregandoBloco rotulo="Carregando o glossário dos cards..." />
          ) : explicacoesFiltradas.length === 0 ? (
            <Vazio
              icone={Search}
              titulo="Nenhuma explicação encontrada"
              descricao="Tente outro termo ou escolha outra categoria."
            />
          ) : (
            <GradeCards colunas="3">
              {explicacoesFiltradas.map((e) => (
                <div
                  key={e.termo}
                  className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1"
                >
                  <ConteudoExplicacao explicacao={e} />
                </div>
              ))}
            </GradeCards>
          )}
        </div>
      )}

      {aba === "manual" && (
        <div className="space-y-4">
          <Alerta tom="brand" icone={BookOpen} titulo="Manual completo do SGP">
            Os guias desta central são a consulta rápida. O manual abaixo é a referência detalhada, com as regras de
            negócio, os cálculos e as boas práticas de cada módulo. Cada capítulo abre no leitor interno do SGP, na
            própria aplicação, sem sair da tela nem abrir uma aba nova.
          </Alerta>

          <GradeCards colunas="2">
            {documentosManual.map((item) => (
              <Link
                key={item.arquivo}
                to={urlDoManual(item.arquivo)}
                className="group flex items-start gap-3 rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-n2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-sgp bg-surface-3 text-fg-muted">
                  <BookOpen className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-fg">{item.titulo}</span>
                  {item.descricao && (
                    <span className="mt-0.5 block text-2xs leading-relaxed text-fg-muted">{item.descricao}</span>
                  )}
                  <span className="mt-1 block font-mono text-[10px] text-fg-subtle">
                    {item.arquivo}
                    {item.linhas !== undefined ? " · " + item.linhas + " linhas" : ""}
                  </span>
                </span>
                <ArrowRight
                  className="mt-1 size-3.5 shrink-0 text-fg-subtle transition-colors group-hover:text-brand"
                  aria-hidden
                />
              </Link>
            ))}
          </GradeCards>

          <Alerta tom="info" titulo="Como o manual é publicado">
            Os capítulos ficam em Markdown na pasta <code className="rounded bg-surface-3 px-1">docs/</code> e são
            entregues pela API de ajuda. O leitor interno interpreta esse Markdown na própria tela, então os vínculos
            entre capítulos continuam funcionando sem publicar arquivos estáticos.
          </Alerta>
        </div>
      )}

      {aba === "indicadores" && (
        <div className="space-y-4">
          {!pode("admin.ver") ? (
            <Vazio
              icone={BarChart3}
              titulo="Área restrita"
              descricao="Os indicadores de uso da ajuda ficam disponíveis para administradores e para o PMO."
            />
          ) : resumo.isLoading ? (
            <CarregandoBloco rotulo="Consolidando o uso da ajuda..." />
          ) : resumo.isError ? (
            <Alerta tom="danger" titulo="Não foi possível carregar os indicadores">
              {mensagemErro(resumo.error)}
            </Alerta>
          ) : resumo.data ? (
            <>
              <GradeCards colunas="auto">
                <div className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Guias publicados</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{resumo.data.total_guias}</p>
                  <p className="text-2xs text-fg-muted">em {resumo.data.grupos} grupos</p>
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Consultas</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{resumo.data.visualizacoes}</p>
                  <p className="text-2xs text-fg-muted">aberturas de guia</p>
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Avaliações</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{resumo.data.avaliacoes}</p>
                  <p className="text-2xs text-fg-muted">{resumo.data.percentual_util}% consideraram útil</p>
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Nunca consultados</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-fg">{resumo.data.nunca_consultados}</p>
                  <p className="text-2xs text-fg-muted">guias ainda sem acesso</p>
                </div>
              </GradeCards>

              <GradeCards colunas="2">
                <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
                  <header className="border-b border-border px-4 py-2.5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Eye className="size-4 text-fg-muted" aria-hidden /> Guias mais consultados
                    </h3>
                  </header>
                  <Tabela
                    colunas={colunasMaisVistos}
                    dados={resumo.data.mais_vistos}
                    aoClicarLinha={(g) => abrirGuia(g)}
                    vazio={<Vazio icone={Eye} titulo="Nenhuma consulta registrada ainda" />}
                    compacta
                  />
                </div>

                <div className="space-y-3">
                  {resumo.data.menos_uteis.length > 0 && (
                    <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                        <Lightbulb className="size-4 text-warning" aria-hidden /> Guias a revisar
                      </h3>
                      <p className="mb-3 text-2xs text-fg-muted">
                        Menor proporção de avaliações positivas — bons candidatos a reescrita.
                      </p>
                      <ul className="space-y-2">
                        {resumo.data.menos_uteis.map((g) => (
                          <li key={g.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => abrirGuia(g)}
                              className="min-w-0 flex-1 truncate text-left text-xs font-medium text-fg hover:text-brand hover:underline"
                            >
                              {g.titulo}
                            </button>
                            <Etiqueta tom={g.percentual_util >= 60 ? "warning" : "danger"}>
                              {g.percentual_util}% útil
                            </Etiqueta>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <SecaoColapsavel
                    titulo="Telas sem guia"
                    icone={Sparkles}
                    contagem={resumo.data.telas_sem_guia.length}
                    abertoInicial={resumo.data.telas_sem_guia.length > 0}
                  >
                    {resumo.data.telas_sem_guia.length === 0 ? (
                      <p className="text-xs text-fg-muted">Todas as telas da aplicação têm guia. 🎉</p>
                    ) : (
                      <>
                        <p className="mb-2 text-2xs text-fg-muted">
                          Estas rotas existem na aplicação mas ainda não têm guia publicado:
                        </p>
                        <ul className="space-y-1">
                          {resumo.data.telas_sem_guia.map((rota) => (
                            <li key={rota} className="font-mono text-2xs text-fg-muted">
                              {rota}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </SecaoColapsavel>
                </div>
              </GradeCards>

              <Alerta tom="info" icone={Printer} titulo="Como melhorar a ajuda">
                Os indicadores mostram quais telas as pessoas procuram entender e quais guias não estão ajudando.
                Use-os para priorizar a revisão: um guia muito consultado merece mais detalhe; um guia mal avaliado
                costuma indicar que a tela precisa ficar mais clara, não que o texto precise crescer.
              </Alerta>
            </>
          ) : null}
        </div>
      )}

      <PainelAjuda
        guiaForcado={guiaCompleto ?? null}
        carregandoForcado={carregandoGuia && !guiaCompleto}
        abertoForcado={selecionadoId !== null}
        onFecharForcado={() => setSelecionadoId(null)}
      />
    </div>
  );
}

/** Botão que abre o guia da tela atual, reaproveitado no cabeçalho. */
function BotaoAjudaWrapper() {
  const navegar = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navegar("/ajuda")}
      className="inline-flex h-9 items-center gap-2 rounded-sgp border border-border-strong bg-surface px-3 text-xs font-medium text-fg hover:bg-surface-2"
    >
      <CircleHelp className="size-3.5" aria-hidden />
      Como usar cada tela
    </button>
  );
}

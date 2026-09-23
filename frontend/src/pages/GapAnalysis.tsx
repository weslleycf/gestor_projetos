import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, BarChart3, Check, Download, GraduationCap, Layers3, Plus, ShieldAlert, Sparkles,
  Target, TrendingDown, UserCheck, UserPlus, Users, Zap, type LucideIcon,
} from "lucide-react";
import {
  Alerta, AnelProgresso, Avatar, BarraProgresso, Botao, CabecalhoPagina, Campo, CarregandoBloco,
  Chip, Entrada, Etiqueta, KPI, Modal, PainelLateral, PilhaAvatares, Segmentado, Selecao, Vazio,
  useAvisos, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { EscalaCores, GraficoBarras, GraficoDonut, type BarraItem, type FatiaDonut } from "@/components/charts";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { cn, corPorValor } from "@/lib/utils";
import { dataCurta, hojeISO, numero, percentual, somarDias } from "@/lib/format";
import type { AcaoPDI, PDI, Projeto } from "@/lib/types";

/* ==========================================================================
   Análise de gap de capacidades (RF-64 · RF-65 · RF-66 · UC-08)
   ========================================================================== */

const CORES_SEVERIDADE: Record<string, string> = {
  OK: "#059669",
  BAIXO: "#0891B2",
  MEDIO: "#F59E0B",
  ALTO: "#F97316",
  CRITICO: "#DC2626",
};

const TONS_SEVERIDADE: Record<string, Tom> = {
  OK: "success",
  BAIXO: "info",
  MEDIO: "warning",
  ALTO: "warning",
  CRITICO: "danger",
};

const ICONES_ACAO: Record<string, LucideIcon> = {
  ALOCAR: UserCheck,
  TREINAR: GraduationCap,
  CONTRATAR: UserPlus,
  MENTORAR: Users,
  DOCUMENTAR: Layers3,
  ROTACIONAR: Zap,
};

interface PessoaAtende {
  user_id: number;
  nome: string;
  nivel: number;
}

interface PessoaGap {
  user_id: number;
  nome: string;
  nivel?: number;
  atual?: number;
  desejado?: number;
  deficit?: number;
  gap?: number;
}

interface ItemGap {
  skill_id: number;
  skill: string;
  icone: string;
  cor: string;
  criticidade: string;
  nivel_minimo: number;
  nivel_desejado?: number;
  quantidade: number;
  obrigatorio?: boolean;
  peso?: number;
  atendem: number;
  deficit: number;
  severidade: string;
  pessoas_atendem?: PessoaAtende[];
  pessoas_com_gap?: PessoaGap[];
  acoes_sugeridas: Array<{ tipo: string; rotulo: string; icone: string; cor: string; detalhe: string }>;
}

interface RespostaGap {
  escopo: { tipo: string; id?: number; nome?: string; pessoas?: number };
  total_pessoas: number;
  itens: ItemGap[];
  resumo: {
    total_requisitos: number;
    criticos: number;
    altos: number;
    medios: number;
    baixos: number;
    obrigatorios_pendentes: number;
    indice_cobertura: number;
  };
}

type Escopo = "geral" | "projeto";

function nivelDe(p: PessoaGap) {
  return p.nivel !== undefined ? p.nivel : (p.atual !== undefined ? p.atual : 0);
}

function deficitDe(p: PessoaGap) {
  return p.deficit !== undefined ? p.deficit : (p.gap !== undefined ? p.gap : 0);
}

function iniciaisDe(nome: string) {
  return nome.split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase();
}

export default function GapAnalysis() {
  const navegar = useNavigate();
  const [escopo, setEscopo] = useState<Escopo>("geral");
  const [projeto, setProjeto] = useState("");
  const [detalhe, setDetalhe] = useState<ItemGap | null>(null);
  const [itemPlano, setItemPlano] = useState<ItemGap | null>(null);

  const projetos = useLista<Projeto>(CHAVES.projetos, "/projetos/", { page_size: 300, ordering: "nome" });

  const gap = useConsulta<RespostaGap>(CHAVES.gap, "/capacidades/gap/", {
    project: escopo === "projeto" && projeto ? projeto : undefined,
  });

  const dados = gap.data;
  const itens = dados?.itens || [];

  const fatiasSeveridade: FatiaDonut[] = useMemo(() => {
    const contagem: Record<string, number> = {};
    itens.forEach((i) => { contagem[i.severidade] = (contagem[i.severidade] || 0) + 1; });
    return Object.keys(contagem)
      .sort()
      .map((chave) => ({ rotulo: chave, valor: contagem[chave], cor: CORES_SEVERIDADE[chave] || "#64748B" }));
  }, [itens]);

  const barrasDeficit: BarraItem[] = useMemo(
    () => itens.filter((i) => i.deficit > 0).slice(0, 20).map((i) => ({
      rotulo: i.skill,
      valor: i.deficit,
      comparativo: i.quantidade,
      cor: CORES_SEVERIDADE[i.severidade] || "#DC2626",
    })),
    [itens]
  );

  const projetoSelecionado = useMemo(
    () => (projetos.data || []).find((p) => String(p.id) === projeto),
    [projetos.data, projeto]
  );

  const exportarCsv = () => {
    if (!itens.length) return;
    const cabecalho = ["Capacidade", "Criticidade", "Nivel minimo", "Quantidade", "Atendem", "Deficit", "Severidade", "Obrigatorio", "Pessoas com gap"];
    const linhas = itens.map((i) => [
      i.skill,
      i.criticidade,
      String(i.nivel_minimo),
      String(i.quantidade),
      String(i.atendem),
      String(i.deficit),
      i.severidade,
      i.obrigatorio ? "Sim" : "Nao",
      (i.pessoas_com_gap || []).map((p) => p.nome).join(" | "),
    ]);
    const conteudoCsv = [cabecalho.join(";")]
      .concat(linhas.map((l) => l.map((c) => "\"" + String(c).replace(/\"/g, "'") + "\"").join(";")))
      .join("\n");
    const blob = new Blob([conteudoCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gap-capacidades-" + hojeISO() + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const primeiroComGap = itens.find((i) => (i.pessoas_com_gap || []).length > 0) || null;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Análise de gap"
        subtitulo={dados
          ? (dados.escopo.tipo === "projeto"
            ? "Escopo do projeto " + (dados.escopo.nome || "")
            : "Escopo geral do portfólio · " + numero(dados.total_pessoas) + " pessoas avaliadas")
          : "Comparando demanda e oferta de capacidades"}
        icone={Target}
        cor="#DC2626"
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Capacidades", onClick: () => navegar("/capacidades") },
          { rotulo: "Gap" },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={Download} onClick={exportarCsv} disabled={!itens.length}>Exportar CSV</Botao>
            <Botao variante="secundario" icone={ShieldAlert} onClick={() => navegar("/bus-factor")}>Bus factor</Botao>
            <Botao variante="primario" icone={Plus} onClick={() => setItemPlano(primeiroComGap)} disabled={!primeiroComGap}>Registrar plano</Botao>
          </>
        }
        filhos={
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Segmentado
                valor={escopo}
                onChange={(v) => setEscopo(v)}
                opcoes={[
                  { valor: "geral", rotulo: "Gap geral", icone: Layers3, titulo: "Compara o nível desejado de cada pessoa com o nível atual" },
                  { valor: "projeto", rotulo: "Por projeto", icone: Target, titulo: "Compara os requisitos de capacidade do projeto com a equipe disponível" },
                ]}
              />
              {escopo === "projeto" && (
                <label className="inline-flex items-center gap-1.5">
                  <span className="text-2xs font-medium text-fg-muted">Projeto</span>
                  <select
                    value={projeto}
                    onChange={(e) => setProjeto(e.target.value)}
                    className="h-8 min-w-64 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
                  >
                    <option value="">Selecione o projeto</option>
                    {(projetos.data || []).map((p) => (<option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>))}
                  </select>
                </label>
              )}
              {projetoSelecionado && (
                <Chip cor={projetoSelecionado.cor || "#2563EB"} onClick={() => navegar("/projetos/" + projetoSelecionado.id)}>
                  {projetoSelecionado.nome}
                </Chip>
              )}
            </div>
          </>
        }
      />

      {escopo === "projeto" && !projeto && (
        <Alerta tom="info" titulo="Selecione um projeto" icone={Target}>
          A análise por projeto compara os requisitos de capacidade definidos no projeto com o nível efetivo da equipe alocada.
          Sem projeto selecionado, o sistema exibe o gap geral entre nível atual e desejado de cada colaborador.
        </Alerta>
      )}

      {gap.isLoading && <CarregandoBloco rotulo="Calculando o gap de capacidades..." />}
      {gap.isError && <Alerta tom="danger" titulo="Não foi possível calcular o gap">{mensagemErro(gap.error)}</Alerta>}

      {dados && (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <div className="flex flex-col items-center gap-2">
                <AnelProgresso
                  valor={dados.resumo.indice_cobertura}
                  tamanho={132}
                  espessura={11}
                  cor={corPorValor(dados.resumo.indice_cobertura / 100)}
                  rotulo={percentual(dados.resumo.indice_cobertura, 0)}
                  subrotulo="índice de cobertura"
                />
                <p className="text-center text-2xs text-fg-muted">
                  Proporção média dos requisitos já atendidos no escopo {dados.escopo.tipo === "projeto" ? "do projeto" : "geral"}.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-3">
              <KPI rotulo="Requisitos analisados" valor={numero(dados.resumo.total_requisitos)} icone={Target} cor="#2563EB" subrotulo={numero(dados.total_pessoas) + " pessoas no escopo"} compacto />
              <KPI rotulo="Severidade crítica" valor={numero(dados.resumo.criticos)} icone={AlertTriangle} cor="#DC2626" subrotulo="risco imediato de entrega" compacto />
              <KPI rotulo="Severidade alta" valor={numero(dados.resumo.altos)} icone={TrendingDown} cor="#F97316" compacto />
              <KPI rotulo="Severidade média" valor={numero(dados.resumo.medios)} icone={BarChart3} cor="#F59E0B" compacto />
              <KPI rotulo="Obrigatórios pendentes" valor={numero(dados.resumo.obrigatorios_pendentes)} icone={ShieldAlert} cor="#DC2626" subrotulo="requisitos marcados como obrigatórios" compacto />
              <KPI rotulo="Sem déficit" valor={numero(dados.resumo.total_requisitos - dados.resumo.criticos - dados.resumo.altos - dados.resumo.medios)} icone={Check} cor="#059669" subrotulo="requisitos sob controle" compacto />
            </div>
          </div>

          {itens.length === 0 ? (
            <Vazio
              icone={Check}
              titulo="Nenhum gap identificado"
              descricao={escopo === "projeto"
                ? "O projeto não possui requisitos de capacidade ou todos estão atendidos."
                : "Todos os colaboradores estão no nível desejado para as capacidades registradas."}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 lg:col-span-2">
                  <h3 className="mb-3 text-sm font-semibold text-fg">Déficit de pessoas por capacidade</h3>
                  {barrasDeficit.length ? (
                    <GraficoBarras itens={barrasDeficit} horizontal formatarValor={(v) => numero(v) + " pessoa(s)"} />
                  ) : (
                    <p className="py-6 text-center text-xs text-fg-muted">Nenhum déficit de pessoas no escopo atual.</p>
                  )}
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 text-sm font-semibold text-fg">Distribuição por severidade</h3>
                  <GraficoDonut fatias={fatiasSeveridade} tamanho={160} espessura={22} centroRotulo="requisitos" legenda />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-3">
                <EscalaCores
                  rotulos={["OK", "Baixo", "Médio", "Alto", "Crítico"]}
                  cores={[CORES_SEVERIDADE.OK, CORES_SEVERIDADE.BAIXO, CORES_SEVERIDADE.MEDIO, CORES_SEVERIDADE.ALTO, CORES_SEVERIDADE.CRITICO]}
                  titulo="Severidade"
                />
                <span className="text-2xs text-fg-muted">Ordenado por severidade e déficit. Clique nos números para ver quem atende e quem precisa evoluir.</span>
              </div>

              <GradeCards colunas="2">
                {itens.map((item) => (
                  <CartaoGap
                    key={item.skill_id}
                    item={item}
                    aoDetalhar={() => setDetalhe(item)}
                    aoPlanejar={() => setItemPlano(item)}
                    aoAbrirSkill={() => navegar("/capacidades/skills/" + item.skill_id)}
                  />
                ))}
              </GradeCards>
            </>
          )}
        </>
      )}

      <PainelLateral
        aberto={Boolean(detalhe)}
        onFechar={() => setDetalhe(null)}
        titulo={detalhe ? detalhe.skill : "Detalhe do gap"}
        subtitulo={detalhe ? "Severidade " + detalhe.severidade + " · nível mínimo N" + detalhe.nivel_minimo : undefined}
        largura="md"
        rodape={
          detalhe ? (
            <>
              <Botao variante="fantasma" onClick={() => navegar("/capacidades/skills/" + detalhe.skill_id)}>Abrir capacidade</Botao>
              <Botao variante="primario" icone={Plus} onClick={() => { setItemPlano(detalhe); setDetalhe(null); }}>Registrar plano</Botao>
            </>
          ) : undefined
        }
      >
        {detalhe && <DetalheGap item={detalhe} />}
      </PainelLateral>

      <ModalRegistrarPlano item={itemPlano} onFechar={() => setItemPlano(null)} aoConcluir={() => gap.refetch()} />
    </div>
  );
}

/* ==========================================================================
   Cartão de um item de gap
   ========================================================================== */

function CartaoGap({
  item, aoDetalhar, aoPlanejar, aoAbrirSkill,
}: {
  item: ItemGap; aoDetalhar: () => void; aoPlanejar: () => void; aoAbrirSkill: () => void;
}) {
  const cor = CORES_SEVERIDADE[item.severidade] || "#64748B";
  const pessoasComGap = item.pessoas_com_gap || [];
  const pessoasAtendem = item.pessoas_atendem || [];
  const avataresAtendem = pessoasAtendem.slice(0, 6).map((p) => ({
    id: p.user_id,
    nome: p.nome,
    cor: "#2563EB",
    iniciais: iniciaisDe(p.nome),
  }));

  return (
    <div className={cn("rounded-sgp-lg border bg-surface p-4 shadow-n1", item.severidade === "CRITICO" ? "border-danger/45" : "border-border")}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-sgp-lg" style={{ backgroundColor: (item.cor || "#6366F1") + "1f", color: item.cor || "#6366F1" }}>
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={aoAbrirSkill} className="max-w-full truncate text-sm font-semibold text-fg hover:text-brand">{item.skill}</button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Etiqueta tom={item.criticidade === "ESTRATEGICA" || item.criticidade === "ALTA" ? "danger" : "info"}>Criticidade {item.criticidade}</Etiqueta>
            <Etiqueta tom="neutral">Mínimo N{item.nivel_minimo}{item.nivel_desejado ? " · desejado N" + item.nivel_desejado : ""}</Etiqueta>
            <Etiqueta tom="neutral">{numero(item.quantidade)} pessoa(s) necessária(s)</Etiqueta>
            {item.obrigatorio && <Etiqueta tom="danger" icone={AlertTriangle}>Obrigatório</Etiqueta>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Déficit</p>
          <p className={cn("text-2xl font-bold tabular-nums", item.deficit > 0 ? "text-danger" : "text-success")}>{numero(item.deficit)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-2xs text-fg-muted">
          <span>Atendem {numero(item.atendem)} de {numero(item.quantidade)}</span>
          <span className="font-semibold" style={{ color: cor }}>{item.severidade}</span>
        </div>
        <BarraProgresso valor={item.quantidade ? (item.atendem / item.quantidade) * 100 : 0} cor={cor} altura="md" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={aoDetalhar} className="rounded-sgp border border-border bg-surface-2 p-2.5 text-left transition-colors hover:border-border-strong">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Já atendem</p>
          <div className="mt-1 flex items-center gap-2">
            {avataresAtendem.length ? <PilhaAvatares pessoas={avataresAtendem} maximo={4} tamanho="xs" /> : <span className="text-2xs text-fg-subtle">Ninguém</span>}
            <span className="text-sm font-bold tabular-nums text-fg">{numero(item.atendem)}</span>
          </div>
        </button>
        <button type="button" onClick={aoDetalhar} className="rounded-sgp border border-border bg-surface-2 p-2.5 text-left transition-colors hover:border-border-strong">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Precisam evoluir</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-bold tabular-nums text-danger">{numero(pessoasComGap.length)}</span>
            <span className="truncate text-2xs text-fg-muted">{pessoasComGap.slice(0, 2).map((p) => p.nome.split(" ")[0]).join(", ") || "—"}</span>
          </div>
        </button>
      </div>

      {item.acoes_sugeridas.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Ações sugeridas</p>
          <div className="flex flex-wrap gap-1.5">
            {item.acoes_sugeridas.map((a) => {
              const Icone = ICONES_ACAO[a.tipo] || Zap;
              return (
                <button
                  key={a.tipo}
                  type="button"
                  title={a.detalhe}
                  onClick={aoPlanejar}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold transition-all hover:brightness-95 active:scale-95"
                  style={{ backgroundColor: a.cor + "1f", borderColor: a.cor + "55", color: a.cor }}
                >
                  <Icone className="size-3.5" aria-hidden />
                  {a.tipo}
                </button>
              );
            })}
          </div>
          <ul className="mt-2 space-y-1">
            {item.acoes_sugeridas.slice(0, 3).map((a) => (
              <li key={a.tipo} className="flex items-start gap-1.5 text-2xs text-fg-muted">
                <span className="mt-1 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.cor }} />
                <span><strong className="text-fg">{a.rotulo}:</strong> {a.detalhe}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Drill-down do item de gap
   ========================================================================== */

function DetalheGap({ item }: { item: ItemGap }) {
  const navegar = useNavigate();
  const pessoasComGap = item.pessoas_com_gap || [];
  const pessoasAtendem = item.pessoas_atendem || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Etiqueta tom={TONS_SEVERIDADE[item.severidade] || "neutral"}>Severidade {item.severidade}</Etiqueta>
        <Etiqueta tom="neutral">Criticidade {item.criticidade}</Etiqueta>
        {item.obrigatorio && <Etiqueta tom="danger">Obrigatório</Etiqueta>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-sgp border border-border bg-surface-2 p-3">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Déficit</p>
          <p className={cn("text-lg font-bold tabular-nums", item.deficit > 0 ? "text-danger" : "text-success")}>{numero(item.deficit)}</p>
        </div>
        <div className="rounded-sgp border border-border bg-surface-2 p-3">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Atendem</p>
          <p className="text-lg font-bold tabular-nums text-fg">{numero(item.atendem)}</p>
        </div>
        <div className="rounded-sgp border border-border bg-surface-2 p-3">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Necessário</p>
          <p className="text-lg font-bold tabular-nums text-fg">{numero(item.quantidade)}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-fg">
          <AlertTriangle className="size-3.5 text-danger" aria-hidden />
          Pessoas que precisam evoluir ({numero(pessoasComGap.length)})
        </h4>
        {pessoasComGap.length === 0 ? (
          <p className="rounded-sgp border border-border bg-surface-2 p-3 text-2xs text-fg-muted">Nenhuma pessoa com déficit nesta capacidade.</p>
        ) : (
          <ul className="space-y-1.5">
            {pessoasComGap.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface p-2.5">
                <Avatar nome={p.nome} tamanho="sm" cor="#64748B" />
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => navegar("/pessoas/" + p.user_id)} className="max-w-full truncate text-xs font-medium text-fg hover:text-brand">{p.nome}</button>
                  <p className="text-2xs text-fg-muted">nível atual {numero(nivelDe(p), 2)} · exige N{item.nivel_minimo}</p>
                </div>
                <Etiqueta tom="danger">déficit {numero(deficitDe(p), 2)}</Etiqueta>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-fg">
          <Check className="size-3.5 text-success" aria-hidden />
          Pessoas que já atendem ({numero(pessoasAtendem.length)})
        </h4>
        {pessoasAtendem.length === 0 ? (
          <p className="rounded-sgp border border-border bg-surface-2 p-3 text-2xs text-fg-muted">Nenhuma pessoa atinge o nível mínimo exigido.</p>
        ) : (
          <ul className="space-y-1.5">
            {pessoasAtendem.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface p-2.5">
                <Avatar nome={p.nome} tamanho="sm" cor="#059669" />
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => navegar("/pessoas/" + p.user_id)} className="max-w-full truncate text-xs font-medium text-fg hover:text-brand">{p.nome}</button>
                  <p className="text-2xs text-fg-muted">nível efetivo {numero(p.nivel, 2)}</p>
                </div>
                <Etiqueta tom="success">atende</Etiqueta>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Modal: registrar plano de desenvolvimento para o gap (UC-08)
   ========================================================================== */

function ModalRegistrarPlano({ item, onFechar, aoConcluir }: { item: ItemGap | null; onFechar: () => void; aoConcluir: () => void }) {
  const { sucesso, erro: avisarErro } = useAvisos();
  const [titulo, setTitulo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [prazo, setPrazo] = useState(somarDias(hojeISO(), 90));
  const [carga, setCarga] = useState(20);
  const [tipo, setTipo] = useState("PRATICA");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);

  const gerarPdi = useMutacao<Record<string, unknown>, { pdi: PDI; acoes_criadas: number }>({
    url: "/capacidades/pdi/gerar/",
    invalidar: [CHAVES.pdis],
  });

  const criarAcao = useMutacao<Record<string, unknown>, AcaoPDI>({
    url: "/capacidades/pdi-acoes/",
    invalidar: [CHAVES.pdis],
  });

  const pessoas = item ? (item.pessoas_com_gap || []) : [];

  const registrar = async () => {
    if (!item) return;
    if (!selecionados.length) {
      avisarErro("Selecione ao menos uma pessoa", "Escolha quem receberá as ações de desenvolvimento.");
      return;
    }
    setEnviando(true);
    let acoes = 0;
    try {
      for (const userId of selecionados) {
        let planoId: number | null = null;
        const planos = await api.getLista<PDI>("/capacidades/pdi/", { user: userId, page_size: 5 });
        const ativo = planos.find((p) => p.status === "ATIVO") || planos[0];
        if (ativo) {
          planoId = ativo.id;
        } else {
          const gerado = await gerarPdi.mutateAsync({
            user: userId,
            titulo: titulo || "PDI " + item.skill,
            objetivo: objetivo || "Reduzir o gap da capacidade " + item.skill,
            data_fim: prazo,
            limite: 3,
          });
          planoId = gerado && gerado.pdi ? gerado.pdi.id : null;
        }
        if (!planoId) continue;
        await criarAcao.mutateAsync({
          plan: planoId,
          tipo,
          descricao: "Desenvolver " + item.skill + " até o nível N" + item.nivel_minimo,
          skill: item.skill_id,
          nivel_alvo: item.nivel_minimo,
          prazo,
          carga_horaria: carga,
          status: "PLANEJADA",
        });
        acoes += 1;
      }
      sucesso("Plano registrado", numero(acoes) + " ação(ões) de desenvolvimento criadas.");
      setSelecionados([]);
      aoConcluir();
      onFechar();
    } catch (e) {
      avisarErro("Não foi possível registrar o plano", mensagemErro(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto={Boolean(item)}
      onFechar={onFechar}
      titulo="Registrar plano de desenvolvimento"
      subtitulo={item ? item.skill + " · déficit de " + numero(item.deficit) + " pessoa(s)" : undefined}
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao variante="primario" icone={Plus} carregando={enviando} disabled={!selecionados.length} onClick={registrar}>
            Criar {numero(selecionados.length)} ação(ões) de PDI
          </Botao>
        </>
      }
    >
      {item && (
        <div className="space-y-4">
          <Alerta tom="info" titulo="Como funciona">
            Para cada pessoa selecionada o sistema reaproveita o PDI ativo ou gera um novo plano e cria uma ação de
            desenvolvimento vinculada à capacidade {item.skill} com nível alvo N{item.nivel_minimo}.
          </Alerta>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Título do PDI" htmlFor="pl-titulo" dica="Usado apenas quando a pessoa ainda não possui plano.">
              <Entrada id="pl-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={"PDI " + item.skill} />
            </Campo>
            <Campo rotulo="Prazo da ação" htmlFor="pl-prazo">
              <Entrada id="pl-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </Campo>
            <Campo rotulo="Objetivo" htmlFor="pl-obj" className="sm:col-span-2">
              <Entrada id="pl-obj" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: elevar a equipe ao nível mínimo exigido pelo portfólio" />
            </Campo>
            <Campo rotulo="Tipo de ação" htmlFor="pl-tipo">
              <Selecao id="pl-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="PRATICA">Prática deliberada</option>
                <option value="CURSO">Curso / treinamento</option>
                <option value="MENTORIA">Mentoria</option>
                <option value="PROJETO">Atuação em projeto</option>
                <option value="CERTIFICACAO">Certificação</option>
                <option value="JOB_ROTATION">Job rotation</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Carga horária (h)" htmlFor="pl-carga">
              <Entrada id="pl-carga" type="number" min="0" value={carga} onChange={(e) => setCarga(Number(e.target.value))} />
            </Campo>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-fg">Pessoas com gap ({numero(pessoas.length)})</h4>
              <Botao
                tamanho="xs"
                variante="fantasma"
                onClick={() => setSelecionados(selecionados.length === pessoas.length ? [] : pessoas.map((p) => p.user_id))}
              >
                {selecionados.length === pessoas.length ? "Desmarcar todas" : "Selecionar todas"}
              </Botao>
            </div>
            {pessoas.length === 0 ? (
              <p className="rounded-sgp border border-border bg-surface-2 p-3 text-2xs text-fg-muted">
                Nenhuma pessoa com gap nesta capacidade — considere alocar quem já atende ou contratar reforço externo.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto scroll-thin">
                {pessoas.map((p) => {
                  const marcado = selecionados.indexOf(p.user_id) >= 0;
                  return (
                    <li key={p.user_id}>
                      <button
                        type="button"
                        onClick={() => setSelecionados(marcado ? selecionados.filter((id) => id !== p.user_id) : selecionados.concat([p.user_id]))}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-sgp border p-2.5 text-left transition-all",
                          marcado ? "border-brand bg-brand-soft/30" : "border-border bg-surface hover:border-border-strong"
                        )}
                      >
                        <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", marcado ? "border-brand bg-brand text-brand-fg" : "border-border-strong")}>
                          {marcado && <Check className="size-3" aria-hidden />}
                        </span>
                        <Avatar nome={p.nome} tamanho="sm" cor="#64748B" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-fg">{p.nome}</p>
                          <p className="text-2xs text-fg-muted">nível {numero(nivelDe(p), 2)} → alvo N{item.nivel_minimo} · déficit {numero(deficitDe(p), 2)}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Ações recomendadas para este gap</p>
            <div className="space-y-1">
              {item.acoes_sugeridas.map((a) => (
                <div key={a.tipo} className="flex items-start gap-2 text-2xs">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.cor }} />
                  <span className="text-fg-muted"><strong className="text-fg">{a.rotulo}:</strong> {a.detalhe}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-2xs text-fg-subtle">Referência de data: {dataCurta(hojeISO())}</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
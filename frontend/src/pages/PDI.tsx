import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  AlertTriangle, Award, BarChart3, BookOpen, CalendarClock, Check, ChevronRight, Clock, ExternalLink,
  GraduationCap, Layers3, Pencil, Plus, Rocket, Target, TrendingUp, Trophy, Trash2, UserCheck, UserPlus,
  Users, Zap, type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraProgresso, Botao, BotaoIcone, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, ControleDeslizante, Entrada, Esqueleto, Etiqueta, Interruptor, KPI, Modal,
  PainelLateral, PilhaAvatares, Selecao, Tabela, Vazio, useAvisos, type ColunaTabela, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { EscalaCores, GraficoBarras, GraficoDonut, RadarSkills, type BarraItem, type FatiaDonut, type Serie } from "@/components/charts";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, comAlfa, corNivel, corPorValor, nivelLegenda } from "@/lib/utils";
import { dataCurta, horas, moeda, numero, percentual, somarDias, hojeISO } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { AcaoPDI, PDI, Skill, Trilha, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   PDI, trilhas, mentorias e treinamentos (RF-75 a RF-79 · UC-10)
   ========================================================================== */

const STATUS_ACAO = ["PLANEJADA", "EM_ANDAMENTO", "CONCLUIDA", "ATRASADA", "CANCELADA"] as const;

const ROTULO_STATUS: Record<string, string> = {
  PLANEJADA: "Planejada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
};

const COR_STATUS: Record<string, string> = {
  PLANEJADA: "#64748B",
  EM_ANDAMENTO: "#2563EB",
  CONCLUIDA: "#059669",
  ATRASADA: "#DC2626",
  CANCELADA: "#94A3B8",
};

const TIPOS_ACAO = [
  { valor: "CURSO", rotulo: "Curso / treinamento" },
  { valor: "CERTIFICACAO", rotulo: "Certificação" },
  { valor: "MENTORIA", rotulo: "Mentoria" },
  { valor: "PROJETO", rotulo: "Atuação em projeto" },
  { valor: "PRATICA", rotulo: "Prática deliberada" },
  { valor: "LEITURA", rotulo: "Leitura / estudo" },
  { valor: "COMUNIDADE", rotulo: "Comunidade de prática" },
  { valor: "PALESTRA", rotulo: "Palestra / docência" },
  { valor: "JOB_ROTATION", rotulo: "Job rotation" },
];

interface Mentor {
  user_id: number;
  nome: string;
  iniciais: string;
  cor: string;
  cargo: string;
  area: string;
  nivel: number;
  skill: string;
  disponibilidade: number;
  mentorias_ativas: number;
  anos_experiencia: number;
  score: number;
  justificativa: string;
}

interface RadarResposta {
  user_id: number;
  nome: string;
  total_skills: number;
  nivel_medio: number;
  eixos: Array<{ skill_id: number; skill: string; cor: string; atual: number; consolidado: number; desejado: number }>;
}

interface RespostaMeuPdi {
  usuario: { id: number; nome: string };
  radar: RadarResposta;
  pdi: PDI | null;
  trilhas: Trilha[];
}

interface Mentoria {
  id: number;
  mentor: number;
  mentee: number;
  mentor_detalhe: UsuarioResumo | null;
  mentee_detalhe: UsuarioResumo | null;
  skill: number | null;
  skill_nome: string;
  skill_cor: string;
  objetivo: string;
  status: string;
  status_rotulo: string;
  data_inicio: string;
  data_fim: string | null;
  horas_realizadas: string;
  frequencia: string;
  avaliacao: number;
  comentario: string;
}

interface Treinamento {
  id: number;
  nome: string;
  descricao: string;
  skill: number | null;
  skill_nome: string;
  skill_cor: string;
  tipo: string;
  carga_horaria: number;
  fornecedor: string;
  url: string;
  custo: string;
  nivel_alvo: number;
  xp_concedido: number;
  certificacao: boolean;
  ativo: boolean;
  total_participacoes: number;
}

interface Participacao {
  id: number;
  user: number;
  user_detalhe: UsuarioResumo | null;
  training: number;
  training_detalhe: Treinamento | null;
  status: string;
  status_rotulo: string;
  data_inscricao: string;
  data_conclusao: string | null;
  nota: number | null;
  certificado_url: string;
  origem: string;
}

type AbaPdi = "meu" | "equipe" | "mentorias" | "treinamentos";

export default function PDI() {
  const navegar = useNavigate();
  const [aba, setAba] = useState<AbaPdi>("meu");

  const meu = useConsulta<RespostaMeuPdi>(["pdi-meu"], "/capacidades/pdi/meu/");

  const trilhas = meu.data?.trilhas || [];
  const pdi = meu.data?.pdi || null;

  const resumoTrilhas = useMemo(() => {
    const alta = trilhas.filter((t) => t.urgencia === "ALTA").length;
    const gapTotal = trilhas.reduce((a, t) => a + t.gap, 0);
    const demanda = trilhas.reduce((a, t) => a + t.demanda_projetos, 0);
    const progresso = trilhas.length ? trilhas.reduce((a, t) => a + t.progresso, 0) / trilhas.length : 0;
    return { alta, gapTotal, demanda, progresso };
  }, [trilhas]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="PDI e trilhas de desenvolvimento"
        subtitulo={meu.data ? "Plano de desenvolvimento de " + meu.data.usuario.nome : "Acompanhe o plano de desenvolvimento individual e as trilhas recomendadas"}
        icone={Trophy}
        cor="#7C3AED"
        migalhas={[{ rotulo: "Início", onClick: () => navegar("/") }, { rotulo: "PDI e trilhas" }]}
        acoes={
          <>
            <Botao variante="secundario" icone={Layers3} onClick={() => navegar("/matriz-skills")}>Matriz de capacidades</Botao>
            <Botao variante="secundario" icone={Target} onClick={() => navegar("/gap")}>Análise de gap</Botao>
          </>
        }
        filhos={
          <>
            <Abas
              valor={aba}
              onChange={(v) => setAba(v)}
              abas={[
                { valor: "meu", rotulo: "Meu PDI", icone: Rocket, contagem: pdi ? pdi.acoes.length : 0 },
                { valor: "equipe", rotulo: "Equipe", icone: Users },
                { valor: "mentorias", rotulo: "Mentorias", icone: GraduationCap },
                { valor: "treinamentos", rotulo: "Treinamentos", icone: BookOpen },
              ]}
            />
          </>
        }
      />

      {aba === "meu" && (
        <>
          {meu.isLoading && <CarregandoBloco rotulo="Carregando seu plano de desenvolvimento..." />}
          {meu.isError && <Alerta tom="danger" titulo="Não foi possível carregar o PDI">{mensagemErro(meu.error)}</Alerta>}
          {meu.data && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KPI rotulo="Trilhas recomendadas" valor={numero(trilhas.length)} icone={Rocket} cor="#7C3AED" subrotulo={numero(resumoTrilhas.alta) + " de urgência alta"} compacto />
                <KPI rotulo="Gap total" valor={numero(resumoTrilhas.gapTotal)} icone={TrendingUp} cor="#D97706" subrotulo="níveis a evoluir" compacto />
                <KPI rotulo="Demanda em projetos" valor={numero(resumoTrilhas.demanda)} icone={Target} cor="#2563EB" subrotulo="requisitos ativos" compacto />
                <KPI rotulo="Progresso médio" valor={percentual(resumoTrilhas.progresso, 0)} icone={Zap} cor="#059669" subrotulo="XP para o próximo nível" compacto />
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 lg:col-span-2">
                  <h3 className="mb-2 text-sm font-semibold text-fg">Radar de capacidades (atual × desejado)</h3>
                  {(meu.data.radar.eixos || []).length >= 3 ? (
                    <RadarSkills
                      eixos={meu.data.radar.eixos.slice(0, 10).map((e) => e.skill)}
                      tamanho={320}
                      maximo={5}
                      series={[
                        { nome: "Atual", cor: "#2563EB", valores: meu.data.radar.eixos.slice(0, 10).map((e) => e.consolidado || e.atual) },
                        { nome: "Desejado", cor: "#F59E0B", valores: meu.data.radar.eixos.slice(0, 10).map((e) => e.desejado || e.atual), preenchido: false },
                      ]}
                    />
                  ) : (
                    <Vazio icone={Target} titulo="Radar indisponível" descricao="Registre ao menos 3 capacidades no seu perfil para visualizar o radar." />
                  )}
                </div>
                <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <h3 className="mb-3 text-sm font-semibold text-fg">Progresso do PDI</h3>
                  {pdi ? (
                    <>
                      <div className="flex items-center justify-center">
                        <div className="relative grid place-items-center">
                          <span className="text-3xl font-black tabular-nums text-fg">{percentual(pdi.progresso, 0)}</span>
                        </div>
                      </div>
                      <BarraProgresso valor={pdi.progresso} cor={pdi.progresso >= 70 ? "#059669" : pdi.progresso >= 40 ? "#0891B2" : "#D97706"} altura="lg" />
                      <div className="mt-3 space-y-1.5 text-2xs text-fg-muted">
                        <p><strong className="text-fg">{pdi.titulo}</strong></p>
                        <p>{dataCurta(pdi.data_inicio)} → {pdi.data_fim ? dataCurta(pdi.data_fim) : "sem prazo"}</p>
                        <p>Acompanhamento: {pdi.acompanhamento_nome || "—"}</p>
                        <p>{numero(pdi.acoes.filter((a) => a.status === "CONCLUIDA").length)} de {numero(pdi.acoes.length)} ações concluídas</p>
                        <p>{numero(pdi.acoes.filter((a) => a.atrasada).length)} ação(ões) atrasada(s)</p>
                      </div>
                      {pdi.objetivo && <p className="mt-2 border-t border-border pt-2 text-2xs text-fg-muted">{pdi.objetivo}</p>}
                    </>
                  ) : (
                    <Vazio icone={Rocket} titulo="Sem PDI ativo" descricao="Gere seu plano a partir das trilhas recomendadas." />
                  )}
                </div>
              </div>

              <SecaoTrilhas trilhas={trilhas} />

              <SecaoAcoesKanban pdi={pdi} aoConcluir={() => meu.refetch()} />
            </>
          )}
        </>
      )}

      {aba === "equipe" && <AbaEquipe />}
      {aba === "mentorias" && <AbaMentorias />}
      {aba === "treinamentos" && <AbaTreinamentos />}
    </div>
  );
}

/* ==========================================================================
   Trilhas recomendadas
   ========================================================================== */

function SecaoTrilhas({ trilhas }: { trilhas: Trilha[] }) {
  const navegar = useNavigate();
  const [expandida, setExpandida] = useState<number | null>(null);

  if (!trilhas.length) {
    return (
      <Vazio
        icone={Rocket}
        titulo="Nenhuma trilha recomendada"
        descricao="Assim que houver gaps de capacidade ou demanda de projetos, as trilhas aparecem aqui automaticamente."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">Trilhas recomendadas ({numero(trilhas.length)})</h3>
        <EscalaCores rotulos={["Alta", "Média", "Baixa"]} cores={["#DC2626", "#F59E0B", "#059669"]} titulo="Urgência" />
      </div>
      <GradeCards colunas="2">
        {trilhas.map((t) => {
          const corUrgencia = t.urgencia === "ALTA" ? "#DC2626" : t.urgencia === "MEDIA" ? "#F59E0B" : "#059669";
          const aberta = expandida === t.skill_id;
          return (
            <div key={t.skill_id} className={cn("rounded-sgp-lg border bg-surface p-4 shadow-n1", t.urgencia === "ALTA" ? "border-danger/40" : "border-border")}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-sgp-lg" style={{ backgroundColor: comAlfa(t.cor || "#7C3AED", 0.16), color: t.cor || "#7C3AED" }}>
                  <Rocket className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <button type="button" onClick={() => navegar("/capacidades/skills/" + t.skill_id)} className="max-w-full truncate text-sm font-semibold text-fg hover:text-brand">{t.skill}</button>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Etiqueta tom={t.urgencia === "ALTA" ? "danger" : t.urgencia === "MEDIA" ? "warning" : "success"}>Urgência {t.urgencia}</Etiqueta>
                    <Etiqueta tom="neutral">N{t.nivel_atual} → N{t.nivel_alvo}</Etiqueta>
                    <Etiqueta tom="info" icone={Target}>{numero(t.demanda_projetos)} projeto(s)</Etiqueta>
                    {t.status === "ENFERRUJADA" && <Etiqueta tom="warning">Enferrujada</Etiqueta>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xs uppercase tracking-wide text-fg-muted">Gap</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: corUrgencia }}>{numero(t.gap)}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-2xs text-fg-muted">
                  <span>Progresso para o próximo nível</span>
                  <span className="font-semibold text-fg">{percentual(t.progresso, 0)} · faltam {numero(t.xp_necessario)} XP</span>
                </div>
                <BarraProgresso valor={t.progresso} cor={corNivel(t.nivel_atual)} altura="md" />
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <button type="button" onClick={() => setExpandida(aberta ? null : t.skill_id)} className="flex w-full items-center justify-between text-2xs font-semibold text-fg">
                  Ações sugeridas ({numero(t.acoes.length)})
                  <ChevronRight className={cn("size-3.5 transition-transform", aberta && "rotate-90")} aria-hidden />
                </button>
                {aberta && (
                  <ul className="mt-2 space-y-1.5">
                    {t.acoes.map((a, i) => (
                      <li key={a.titulo + i} className="flex flex-wrap items-center gap-2 rounded-sgp border border-border bg-surface-2 p-2">
                        <Etiqueta tom={a.tipo === "TREINAMENTO" ? "info" : a.tipo === "MENTORIA" ? "brand" : "neutral"}>{a.tipo}</Etiqueta>
                        <span className="min-w-0 flex-1 truncate text-2xs text-fg">{a.titulo}</span>
                        {a.carga_horaria ? <span className="shrink-0 text-2xs text-fg-muted">{horas(a.carga_horaria)}</span> : null}
                        {a.fornecedor ? <span className="shrink-0 text-2xs text-fg-subtle">{a.fornecedor}</span> : null}
                        {a.url ? (
                          <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-2xs font-semibold text-brand underline">
                            Abrir <ExternalLink className="size-3" aria-hidden />
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {t.mentores.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Mentores</span>
                  <PilhaAvatares
                    pessoas={t.mentores.map((m) => ({ id: m.user_id, nome: m.nome, cor: m.cor, iniciais: m.iniciais }))}
                    maximo={4}
                    tamanho="xs"
                  />
                  <span className="text-2xs text-fg-muted">{t.mentores.slice(0, 2).map((m) => m.nome.split(" ")[0] + " (N" + m.nivel + ")").join(", ")}</span>
                </div>
              )}
            </div>
          );
        })}
      </GradeCards>
    </div>
  );
}

/* ==========================================================================
   Kanban das ações do PDI (drag-and-drop)
   ========================================================================== */

function SecaoAcoesKanban({ pdi, aoConcluir }: { pdi: PDI | null; aoConcluir: () => void }) {
  const { sucesso } = useAvisos();
  const [modalGerar, setModalGerar] = useState(false);
  const [modalAcao, setModalAcao] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [prazo, setPrazo] = useState(somarDias(hojeISO(), 90));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const gerar = useMutacao<Record<string, unknown>, { pdi: PDI; acoes_criadas: number }>({
    url: "/capacidades/pdi/gerar/",
    invalidar: [["pdi-meu"], CHAVES.pdis],
    mensagemSucesso: "PDI gerado a partir das trilhas recomendadas",
    aoSucesso: () => { setModalGerar(false); setTitulo(""); setObjetivo(""); aoConcluir(); },
  });

  const mover = useMutacao<{ id: number; status: string }, AcaoPDI>({
    metodo: "patch",
    url: (v) => "/capacidades/pdi-acoes/" + v.id + "/",
    invalidar: [["pdi-meu"], CHAVES.pdis, CHAVES.perfisSkill],
    mensagemSucesso: "Status da ação atualizado",
    aoSucesso: (resposta, vars) => {
      if (vars.status === "CONCLUIDA") sucesso("Ação concluída", "O XP referente foi creditado automaticamente no perfil.");
      aoConcluir();
    },
  });

  const aoSoltar = (evento: DragEndEvent) => {
    const destino = evento.over ? String(evento.over.id) : "";
    if (!destino) return;
    const id = Number(String(evento.active.id).replace("acao-", ""));
    mover.mutate({ id, status: destino });
  };

  const acoes = pdi ? pdi.acoes : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">Ações do PDI</h3>
        <div className="flex flex-wrap gap-1.5">
          <Botao variante="secundario" tamanho="sm" icone={Rocket} onClick={() => setModalGerar(true)}>Gerar PDI</Botao>
          <Botao variante="primario" tamanho="sm" icone={Plus} disabled={!pdi} onClick={() => setModalAcao(true)}>Nova ação manual</Botao>
        </div>
      </div>

      {!pdi ? (
        <Vazio
          icone={Rocket}
          titulo="Nenhum PDI ativo"
          descricao="Gere o plano a partir das trilhas recomendadas — as ações são criadas automaticamente com carga horária e prazos."
          acao={<Botao variante="primario" icone={Rocket} onClick={() => setModalGerar(true)}>Gerar meu PDI</Botao>}
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={aoSoltar}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {STATUS_ACAO.map((status) => (
              <ColunaKanban
                key={status}
                status={status}
                acoes={acoes.filter((a) => a.status === status)}
                aoMover={(id, novo) => mover.mutate({ id, status: novo })}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Modal
        aberto={modalGerar}
        onFechar={() => setModalGerar(false)}
        titulo="Gerar PDI"
        subtitulo="Cria o plano e as ações a partir das trilhas recomendadas"
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalGerar(false)}>Cancelar</Botao>
            <Botao variante="primario" icone={Rocket} carregando={gerar.isPending} onClick={() => gerar.mutate({ titulo: titulo || undefined, objetivo, data_fim: prazo, limite: 5 })}>
              Gerar plano
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Título" htmlFor="gp-titulo" dica="Deixe vazio para o padrão do sistema.">
            <Entrada id="gp-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="PDI 2026" />
          </Campo>
          <Campo rotulo="Objetivo" htmlFor="gp-obj">
            <AreaTexto id="gp-obj" rows={3} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: tornar-me referência técnica em arquitetura de dados" />
          </Campo>
          <Campo rotulo="Prazo do plano" htmlFor="gp-prazo">
            <Entrada id="gp-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </Campo>
        </div>
      </Modal>

      <ModalNovaAcao aberto={modalAcao} onFechar={() => setModalAcao(false)} planoId={pdi ? pdi.id : null} aoConcluir={aoConcluir} />
    </div>
  );
}

function ColunaKanban({
  status, acoes, aoMover,
}: {
  status: string;
  acoes: AcaoPDI[];
  aoMover: (id: number, status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cor = COR_STATUS[status] || "#64748B";
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-40 flex-col gap-2 rounded-sgp-lg border bg-surface-2 p-2.5 transition-colors",
        isOver ? "border-brand bg-brand-soft/25" : "border-border"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide" style={{ color: cor }}>
          <span className="size-2 rounded-full" style={{ backgroundColor: cor }} />
          {ROTULO_STATUS[status] || status}
        </span>
        <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-2xs tabular-nums text-fg-muted">{acoes.length}</span>
      </div>

      {acoes.length === 0 && <p className="rounded-sgp border border-dashed border-border px-2 py-4 text-center text-2xs text-fg-subtle">Solte um card aqui</p>}

      {acoes.map((a) => (
        <CardAcao key={a.id} acao={a} aoMover={aoMover} />
      ))}
    </div>
  );
}

function CardAcao({ acao, aoMover }: { acao: AcaoPDI; aoMover: (id: number, status: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: "acao-" + acao.id });
  const estilo = {
    transform: transform ? "translate3d(" + transform.x + "px, " + transform.y + "px, 0)" : undefined,
    touchAction: "none" as const,
  };
  return (
    <div
      ref={setNodeRef}
      style={estilo}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-sgp border bg-surface p-2.5 shadow-n1 transition-shadow active:cursor-grabbing",
        acao.atrasada ? "border-danger/50" : "border-border",
        isDragging && "opacity-60 shadow-n3"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-2xs font-semibold text-fg">{acao.descricao}</p>
        {acao.atrasada && <AlertTriangle className="size-3.5 shrink-0 text-danger" aria-hidden />}
      </div>
      <p className="mt-1 text-2xs text-fg-muted">
        {acao.tipo_rotulo || acao.tipo}
        {acao.skill_nome ? " · " + acao.skill_nome : ""}
        {acao.nivel_alvo ? " → N" + acao.nivel_alvo : ""}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {acao.prazo && <span className="text-2xs text-fg-subtle">prazo {dataCurta(acao.prazo)}</span>}
        {acao.carga_horaria ? <span className="text-2xs text-fg-subtle">· {horas(acao.carga_horaria)}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
        {STATUS_ACAO.filter((s) => s !== acao.status).slice(0, 3).map((s) => (
          <button
            key={s}
            type="button"
            onClick={(e) => { e.stopPropagation(); aoMover(acao.id, s); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full border px-1.5 py-0.5 text-2xs font-medium transition-colors hover:brightness-95"
            style={{ borderColor: (COR_STATUS[s] || "#64748B") + "55", color: COR_STATUS[s] || "#64748B", backgroundColor: (COR_STATUS[s] || "#64748B") + "14" }}
          >
            {ROTULO_STATUS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Modal: nova ação manual
   ========================================================================== */

function ModalNovaAcao({
  aberto, onFechar, planoId, aoConcluir,
}: {
  aberto: boolean; onFechar: () => void; planoId: number | null; aoConcluir: () => void;
}) {
  const skills = useLista<Skill>(CHAVES.skills, aberto ? "/capacidades/skills/" : null, { page_size: 300 });
  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, aberto ? "/usuarios/" : null, { ativo: true, page_size: 300 });
  const [form, setForm] = useState({
    tipo: "CURSO", descricao: "", skill: "", nivel_alvo: 4, prazo: somarDias(hojeISO(), 90),
    carga_horaria: 20, custo: 0, responsavel: "",
  });

  const criar = useMutacao<Record<string, unknown>, AcaoPDI>({
    url: "/capacidades/pdi-acoes/",
    invalidar: [["pdi-meu"], CHAVES.pdis],
    mensagemSucesso: "Ação adicionada ao PDI",
    aoSucesso: () => {
      setForm({ tipo: "CURSO", descricao: "", skill: "", nivel_alvo: 4, prazo: somarDias(hojeISO(), 90), carga_horaria: 20, custo: 0, responsavel: "" });
      aoConcluir();
      onFechar();
    },
  });

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Nova ação de desenvolvimento"
      subtitulo="Inclua uma ação manual no plano de desenvolvimento"
      largura="md"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            icone={Plus}
            carregando={criar.isPending}
            disabled={!form.descricao.trim() || !planoId}
            onClick={() =>
              criar.mutate({
                plan: planoId,
                tipo: form.tipo,
                descricao: form.descricao,
                skill: form.skill ? Number(form.skill) : null,
                nivel_alvo: Number(form.nivel_alvo),
                prazo: form.prazo || null,
                carga_horaria: Number(form.carga_horaria),
                custo: Number(form.custo),
                responsavel: form.responsavel ? Number(form.responsavel) : null,
                status: "PLANEJADA",
              })
            }
          >
            Adicionar ação
          </Botao>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo rotulo="Tipo" htmlFor="na-tipo">
          <Selecao id="na-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS_ACAO.map((t) => (<option key={t.valor} value={t.valor}>{t.rotulo}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Prazo" htmlFor="na-prazo">
          <Entrada id="na-prazo" type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
        </Campo>
        <Campo rotulo="Descrição" obrigatorio htmlFor="na-desc" className="sm:col-span-2">
          <Entrada id="na-desc" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: certificação AWS Solutions Architect" />
        </Campo>
        <Campo rotulo="Capacidade" htmlFor="na-skill">
          <Selecao id="na-skill" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })}>
            <option value="">Sem vínculo</option>
            {(skills.data || []).map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Nível alvo" htmlFor="na-nivel">
          <Selecao id="na-nivel" value={form.nivel_alvo} onChange={(e) => setForm({ ...form, nivel_alvo: Number(e.target.value) })}>
            {nivelLegenda().map((n) => (<option key={n.nivel} value={n.nivel}>{n.nivel} — {n.nome}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Carga horária (h)" htmlFor="na-carga">
          <Entrada id="na-carga" type="number" min="0" value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: Number(e.target.value) })} />
        </Campo>
        <Campo rotulo="Custo (R$)" htmlFor="na-custo">
          <Entrada id="na-custo" type="number" min="0" step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: Number(e.target.value) })} />
        </Campo>
        <Campo rotulo="Responsável" htmlFor="na-resp" className="sm:col-span-2" dica="Quem acompanha a execução desta ação.">
          <Selecao id="na-resp" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })}>
            <option value="">Sem responsável definido</option>
            {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>))}
          </Selecao>
        </Campo>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   Aba: equipe
   ========================================================================== */

function AbaEquipe() {
  const navegar = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [status, setStatus] = useState("");

  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, "/usuarios/", { ativo: true, page_size: 300 });
  const pdis = useLista<PDI>(CHAVES.pdis, "/capacidades/pdi/", {
    user: usuario || undefined,
    status: status || undefined,
    page_size: 200,
  });

  const lista = pdis.data || [];

  const agregado = useMemo(() => {
    const acoes = lista.flatMap((p) => p.acoes);
    const atrasadas = acoes.filter((a) => a.atrasada);
    const concluidas = acoes.filter((a) => a.status === "CONCLUIDA");
    const porStatus: Record<string, number> = {};
    acoes.forEach((a) => { porStatus[a.status] = (porStatus[a.status] || 0) + 1; });
    const progressoMedio = lista.length ? lista.reduce((a, p) => a + p.progresso, 0) / lista.length : 0;
    return { acoes, atrasadas, concluidas, porStatus, progressoMedio };
  }, [lista]);

  const barras: BarraItem[] = lista.slice(0, 20).map((p) => ({
    rotulo: p.user_detalhe?.nome || "Colaborador " + p.user,
    valor: p.progresso,
    cor: p.progresso >= 70 ? "#059669" : p.progresso >= 40 ? "#0891B2" : "#D97706",
  }));

  const fatias: FatiaDonut[] = Object.keys(agregado.porStatus).map((s) => ({
    rotulo: ROTULO_STATUS[s] || s,
    valor: agregado.porStatus[s],
    cor: COR_STATUS[s] || "#64748B",
  }));

  const colunas: Array<ColunaTabela<PDI>> = [
    {
      chave: "pessoa",
      titulo: "Colaborador",
      largura: "240px",
      ordenavel: true,
      valorOrdenacao: (p) => p.user_detalhe?.nome || "",
      renderizar: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar nome={p.user_detalhe?.nome} cor={p.user_detalhe?.cor} iniciais={p.user_detalhe?.iniciais} tamanho="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-fg">{p.user_detalhe?.nome || "—"}</p>
            <p className="truncate text-2xs text-fg-muted">{p.user_detalhe?.cargo || p.user_detalhe?.area || "—"}</p>
          </div>
        </div>
      ),
    },
    { chave: "titulo", titulo: "Plano", largura: "220px", renderizar: (p) => <span className="text-xs text-fg">{p.titulo}</span> },
    {
      chave: "progresso",
      titulo: "Progresso",
      largura: "200px",
      ordenavel: true,
      valorOrdenacao: (p) => p.progresso,
      renderizar: (p) => (
        <div className="w-40">
          <BarraProgresso valor={p.progresso} cor={p.progresso >= 70 ? "#059669" : p.progresso >= 40 ? "#0891B2" : "#D97706"} altura="sm" mostrarValor />
        </div>
      ),
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "130px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (p) => p.acoes.length,
      renderizar: (p) => (
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold tabular-nums text-fg">{numero(p.acoes.filter((a) => a.status === "CONCLUIDA").length)}/{numero(p.acoes.length)}</span>
          <span className="text-2xs text-fg-muted">{numero(p.acoes.filter((a) => a.atrasada).length)} atrasada(s)</span>
        </div>
      ),
    },
    {
      chave: "status",
      titulo: "Status",
      largura: "120px",
      renderizar: (p) => <Etiqueta tom={p.status === "ATIVO" ? "success" : p.status === "CONCLUIDO" ? "info" : "neutral"}>{p.status_rotulo || p.status}</Etiqueta>,
    },
    {
      chave: "prazo",
      titulo: "Prazo",
      largura: "120px",
      ordenavel: true,
      valorOrdenacao: (p) => p.data_fim || "",
      renderizar: (p) => <span className="text-xs text-fg-muted">{p.data_fim ? dataCurta(p.data_fim) : "—"}</span>,
    },
    {
      chave: "abrir",
      titulo: "",
      largura: "80px",
      alinhar: "right",
      renderizar: (p) => <Botao tamanho="xs" variante="fantasma" icone={ChevronRight} onClick={() => navegar("/pessoas/" + p.user)}>Perfil</Botao>,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Colaborador</span>
          <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className="h-8 min-w-56 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todos</option>
            {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Status do plano</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todos</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="ATIVO">Ativo</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </label>
        {(usuario || status) && (
          <Botao tamanho="xs" variante="fantasma" onClick={() => { setUsuario(""); setStatus(""); }}>Limpar filtros</Botao>
        )}
      </div>

      {pdis.isLoading && <CarregandoBloco rotulo="Carregando PDIs da equipe..." />}
      {pdis.isError && <Alerta tom="danger" titulo="Não foi possível carregar os PDIs">{mensagemErro(pdis.error)}</Alerta>}

      {pdis.data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KPI rotulo="Planos" valor={numero(lista.length)} icone={Trophy} cor="#7C3AED" compacto />
            <KPI rotulo="Ações totais" valor={numero(agregado.acoes.length)} icone={Layers3} cor="#2563EB" compacto />
            <KPI rotulo="Concluídas" valor={numero(agregado.concluidas.length)} icone={Check} cor="#059669" compacto />
            <KPI rotulo="Atrasadas" valor={numero(agregado.atrasadas.length)} icone={AlertTriangle} cor="#DC2626" compacto />
            <KPI rotulo="Progresso médio" valor={percentual(agregado.progressoMedio, 0)} icone={TrendingUp} cor="#0891B2" compacto />
          </div>

          {agregado.atrasadas.length > 0 && (
            <Alerta tom="danger" titulo={numero(agregado.atrasadas.length) + " ação(ões) atrasada(s)"} icone={CalendarClock}>
              <ul className="mt-1 space-y-0.5">
                {agregado.atrasadas.slice(0, 6).map((a) => (
                  <li key={a.id} className="text-2xs text-fg-muted">
                    <strong className="text-fg">{a.descricao}</strong> — prazo {a.prazo ? dataCurta(a.prazo) : "—"}{a.skill_nome ? " · " + a.skill_nome : ""}
                  </li>
                ))}
              </ul>
            </Alerta>
          )}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-fg">Progresso por colaborador</h3>
              {barras.length ? <GraficoBarras itens={barras} horizontal formatarValor={(v) => percentual(v, 0)} /> : <p className="py-6 text-center text-xs text-fg-muted">Nenhum plano no filtro atual.</p>}
            </div>
            <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <h3 className="mb-3 text-sm font-semibold text-fg">Ações por status</h3>
              {fatias.length ? <GraficoDonut fatias={fatias} tamanho={160} espessura={22} centroRotulo="ações" legenda /> : <p className="py-6 text-center text-xs text-fg-muted">Nenhuma ação registrada.</p>}
            </div>
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
            <Tabela
              colunas={colunas}
              dados={lista}
              compacta
              vazio={<Vazio icone={Trophy} titulo="Nenhum PDI encontrado" descricao="Nenhum plano corresponde aos filtros selecionados." />}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   Aba: mentorias
   ========================================================================== */

function AbaMentorias() {
  const { sucesso } = useAvisos();
  const [mentor, setMentor] = useState("");
  const [mentee, setMentee] = useState("");
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(false);

  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, "/usuarios/", { ativo: true, page_size: 300 });
  const skills = useLista<Skill>(CHAVES.skills, "/capacidades/skills/", { page_size: 300 });
  const mentorias = useLista<Mentoria>(CHAVES.mentorias, "/capacidades/mentorias/", {
    mentor: mentor || undefined,
    mentee: mentee || undefined,
    status: status || undefined,
    page_size: 200,
  });

  const [skillNova, setSkillNova] = useState("");
  const [mentorNovo, setMentorNovo] = useState("");
  const [menteeNovo, setMenteeNovo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [frequencia, setFrequencia] = useState("quinzenal");

  const sugestoes = useConsulta<{ skill_id: number; mentores: Mentor[] }>(
    ["mentores-sugeridos", skillNova],
    modal && skillNova ? "/capacidades/mentorias/sugerir/" : null,
    { skill: skillNova }
  );

  const criar = useMutacao<Record<string, unknown>, Mentoria>({
    url: "/capacidades/mentorias/",
    invalidar: [CHAVES.mentorias],
    mensagemSucesso: "Mentoria criada",
    aoSucesso: () => {
      setModal(false);
      setSkillNova(""); setMentorNovo(""); setMenteeNovo(""); setObjetivo("");
    },
  });

  const atualizar = useMutacao<{ id: number; corpo: Record<string, unknown> }, Mentoria>({
    metodo: "patch",
    url: (v) => "/capacidades/mentorias/" + v.id + "/",
    invalidar: [CHAVES.mentorias],
    mensagemSucesso: "Mentoria atualizada",
  });

  const lista = mentorias.data || [];
  const ativas = lista.filter((m) => m.status === "ATIVA");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Mentor</span>
          <select value={mentor} onChange={(e) => setMentor(e.target.value)} className="h-8 min-w-48 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todos</option>
            {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Mentorado</span>
          <select value={mentee} onChange={(e) => setMentee(e.target.value)} className="h-8 min-w-48 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todos</option>
            {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todos</option>
            <option value="PROPOSTA">Proposta</option>
            <option value="ATIVA">Ativa</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </label>
        <Botao variante="primario" tamanho="sm" icone={Plus} className="ml-auto" onClick={() => setModal(true)}>Nova mentoria</Botao>
      </div>

      {mentorias.isLoading && <CarregandoBloco rotulo="Carregando mentorias..." />}
      {mentorias.isError && <Alerta tom="danger" titulo="Não foi possível carregar as mentorias">{mensagemErro(mentorias.error)}</Alerta>}

      {mentorias.data && (
        lista.length === 0 ? (
          <Vazio icone={GraduationCap} titulo="Nenhuma mentoria registrada" descricao="Conecte especialistas nível 4–5 a quem precisa evoluir para reduzir o bus factor." acao={<Botao variante="primario" icone={Plus} onClick={() => setModal(true)}>Nova mentoria</Botao>} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KPI rotulo="Mentorias" valor={numero(lista.length)} icone={GraduationCap} cor="#7C3AED" compacto />
              <KPI rotulo="Ativas" valor={numero(ativas.length)} icone={UserCheck} cor="#059669" compacto />
              <KPI rotulo="Horas realizadas" valor={numero(ativas.reduce((a, m) => a + Number(m.horas_realizadas || 0), 0), 1)} icone={Clock} cor="#2563EB" compacto />
              <KPI rotulo="Avaliação média" valor={numero(ativas.filter((m) => m.avaliacao > 0).reduce((a, m, _i, arr) => a + m.avaliacao / arr.length, 0), 1)} icone={Award} cor="#D97706" subrotulo="escala 1 a 5" compacto />
            </div>
            <GradeCards colunas="3">
              {lista.map((m) => (
                <div key={m.id} className="flex flex-col gap-2 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <div className="flex items-center justify-between gap-2">
                    <Etiqueta tom={m.status === "ATIVA" ? "success" : m.status === "PROPOSTA" ? "info" : m.status === "CANCELADA" ? "danger" : "neutral"}>
                      {m.status_rotulo || m.status}
                    </Etiqueta>
                    {m.skill_nome && <Chip cor={m.skill_cor || "#F59E0B"}>{m.skill_nome}</Chip>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar nome={m.mentor_detalhe?.nome} cor={m.mentor_detalhe?.cor} iniciais={m.mentor_detalhe?.iniciais} tamanho="md" />
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    <Avatar nome={m.mentee_detalhe?.nome} cor={m.mentee_detalhe?.cor} iniciais={m.mentee_detalhe?.iniciais} tamanho="md" />
                    <div className="min-w-0">
                      <p className="truncate text-2xs text-fg-muted">mentor → mentorado</p>
                      <p className="truncate text-xs font-medium text-fg">{m.mentor_detalhe?.nome} → {m.mentee_detalhe?.nome}</p>
                    </div>
                  </div>
                  {m.objetivo && <p className="text-2xs text-fg-muted">{m.objetivo}</p>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Etiqueta tom="neutral" icone={Clock}>{numero(m.horas_realizadas, 1)} h realizadas</Etiqueta>
                    <Etiqueta tom="neutral">{m.frequencia}</Etiqueta>
                    {m.avaliacao > 0 && <Etiqueta tom="warning" icone={Award}>Nota {m.avaliacao}</Etiqueta>}
                  </div>
                  <p className="text-2xs text-fg-subtle">
                    {dataCurta(m.data_inicio)}{m.data_fim ? " → " + dataCurta(m.data_fim) : ""}
                  </p>
                  <div className="mt-auto flex flex-wrap justify-end gap-1.5 border-t border-border pt-2">
                    {m.status === "PROPOSTA" && (
                      <Botao tamanho="xs" variante="sucesso" icone={Check} onClick={() => atualizar.mutate({ id: m.id, corpo: { status: "ATIVA" } })}>Ativar</Botao>
                    )}
                    {m.status === "ATIVA" && (
                      <Botao
                        tamanho="xs"
                        variante="secundario"
                        icone={Trophy}
                        onClick={() => atualizar.mutate(
                          { id: m.id, corpo: { status: "CONCLUIDA" } },
                          { onSuccess: () => sucesso("Mentoria concluída", "O histórico foi atualizado.") }
                        )}
                      >
                        Concluir
                      </Botao>
                    )}
                    <Botao tamanho="xs" variante="fantasma" onClick={() => atualizar.mutate({ id: m.id, corpo: { horas_realizadas: Number(m.horas_realizadas || 0) + 2 } })}>
                      +2h
                    </Botao>
                  </div>
                </div>
              ))}
            </GradeCards>
          </>
        )
      )}

      <Modal
        aberto={modal}
        onFechar={() => setModal(false)}
        titulo="Nova mentoria"
        subtitulo="Conecte um especialista a quem precisa evoluir (RF-79)"
        largura="lg"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModal(false)}>Cancelar</Botao>
            <Botao
              variante="primario"
              icone={GraduationCap}
              carregando={criar.isPending}
              disabled={!mentorNovo || !menteeNovo}
              onClick={() => criar.mutate({ mentor: Number(mentorNovo), mentee: Number(menteeNovo), skill: skillNova ? Number(skillNova) : null, objetivo, frequencia, status: "PROPOSTA" })}
            >
              Criar mentoria
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Capacidade" htmlFor="mn-skill" dica="Usada para sugerir mentores qualificados.">
              <Selecao id="mn-skill" value={skillNova} onChange={(e) => { setSkillNova(e.target.value); setMentorNovo(""); }}>
                <option value="">Sem vínculo</option>
                {(skills.data || []).map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
              </Selecao>
            </Campo>
            <Campo rotulo="Frequência" htmlFor="mn-freq">
              <Selecao id="mn-freq" value={frequencia} onChange={(e) => setFrequencia(e.target.value)}>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
                <option value="sob demanda">Sob demanda</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Mentor" obrigatorio htmlFor="mn-mentor">
              <Selecao id="mn-mentor" value={mentorNovo} onChange={(e) => setMentorNovo(e.target.value)}>
                <option value="">Selecione o mentor</option>
                {(sugestoes.data?.mentores || []).map((m) => (<option key={m.user_id} value={m.user_id}>{m.nome} — nível {m.nivel}</option>))}
                {(usuarios.data || []).map((u) => (<option key={"u-" + u.id} value={u.id}>{u.nome} — {u.cargo}</option>))}
              </Selecao>
            </Campo>
            <Campo rotulo="Mentorado" obrigatorio htmlFor="mn-mentee">
              <Selecao id="mn-mentee" value={menteeNovo} onChange={(e) => setMenteeNovo(e.target.value)}>
                <option value="">Selecione o colaborador</option>
                {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>))}
              </Selecao>
            </Campo>
            <Campo rotulo="Objetivo" htmlFor="mn-obj" className="sm:col-span-2">
              <AreaTexto id="mn-obj" rows={2} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: atingir nível 4 com prática supervisionada em 6 meses" />
            </Campo>
          </div>

          {skillNova && (
            <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Mentores sugeridos para esta capacidade</p>
              {sugestoes.isLoading && <p className="text-2xs text-fg-muted">Buscando mentores disponíveis...</p>}
              {sugestoes.data && sugestoes.data.mentores.length === 0 && (
                <p className="text-2xs text-fg-muted">Nenhum mentor nível 4–5 disponível para esta capacidade.</p>
              )}
              <ul className="space-y-1.5">
                {(sugestoes.data?.mentores || []).map((m) => (
                  <li key={m.user_id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface p-2">
                    <Avatar nome={m.nome} cor={m.cor} iniciais={m.iniciais} tamanho="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-2xs font-medium text-fg">{m.nome} · nível {m.nivel}</p>
                      <p className="truncate text-2xs text-fg-muted">{m.justificativa}</p>
                    </div>
                    <Botao tamanho="xs" variante="fantasma" onClick={() => setMentorNovo(String(m.user_id))}>Selecionar</Botao>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Aba: treinamentos
   ========================================================================== */
const TIPOS_TREINAMENTO = [
  { valor: "ONLINE", rotulo: "Online" },
  { valor: "PRESENCIAL", rotulo: "Presencial" },
  { valor: "HIBRIDO", rotulo: "Híbrido" },
];

const FORM_TREINAMENTO_VAZIO = {
  nome: "",
  descricao: "",
  skill: "",
  tipo: "ONLINE",
  carga_horaria: "8",
  fornecedor: "",
  url: "",
  custo: "0",
  nivel_alvo: "3",
  xp_concedido: "50",
  certificacao: false,
  ativo: true,
};

function AbaTreinamentos() {
  const { pode } = useAuth();
  const { erro } = useAvisos();
  const gerenciar = pode("treinamento.editar");

  const [skill, setSkill] = useState("");
  const [somenteCertificacao, setSomenteCertificacao] = useState(false);
  const [colaborador, setColaborador] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Treinamento | null>(null);
  const [form, setForm] = useState(FORM_TREINAMENTO_VAZIO);
  const [inscricaoAberta, setInscricaoAberta] = useState(false);
  const [formInscricao, setFormInscricao] = useState({ user: "", training: "" });
  const [paraExcluir, setParaExcluir] = useState<Treinamento | null>(null);

  const skills = useLista<Skill>(CHAVES.skills, "/capacidades/skills/", { page_size: 300 });
  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, "/usuarios/", { ativo: true, page_size: 300 });
  const treinamentos = useLista<Treinamento>(["treinamentos"], "/capacidades/treinamentos/", {
    skill: skill || undefined,
    certificacao: somenteCertificacao ? true : undefined,
    page_size: 300,
  });
  const participacoes = useLista<Participacao>(["treinamentos-colaborador"], "/capacidades/treinamentos-colaborador/", {
    user: colaborador || undefined,
    page_size: 300,
  });

  const atualizar = useMutacao<{ id: number; status: string }, Participacao>({
    metodo: "patch",
    url: (v) => "/capacidades/treinamentos-colaborador/" + v.id + "/",
    invalidar: [["treinamentos-colaborador"], CHAVES.perfisSkill],
    mensagemSucesso: "Participação atualizada",
  });

  const salvarTreinamento = useMutacao<Record<string, unknown>, Treinamento>({
    metodo: editando ? "patch" : "post",
    url: editando ? "/capacidades/treinamentos/" + editando.id + "/" : "/capacidades/treinamentos/",
    invalidar: [["treinamentos"], CHAVES.painelCapacidades],
    mensagemSucesso: editando ? "Treinamento atualizado" : "Treinamento criado",
    aoSucesso: () => {
      setFormAberto(false);
      setEditando(null);
    },
  });

  const excluirTreinamento = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/capacidades/treinamentos/" + v.id + "/",
    invalidar: [["treinamentos"], ["treinamentos-colaborador"], CHAVES.painelCapacidades],
    mensagemSucesso: "Treinamento excluído do catálogo",
    aoSucesso: () => setParaExcluir(null),
  });

  const inscrever = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/treinamentos-colaborador/",
    invalidar: [["treinamentos-colaborador"], ["treinamentos"], CHAVES.painelCapacidades],
    mensagemSucesso: "Colaborador inscrito no treinamento",
    aoSucesso: () => {
      setInscricaoAberta(false);
      setFormInscricao({ user: "", training: "" });
    },
  });

  const abrirNovoTreinamento = () => {
    setEditando(null);
    setForm(FORM_TREINAMENTO_VAZIO);
    setFormAberto(true);
  };

  const abrirEdicaoTreinamento = (t: Treinamento) => {
    setEditando(t);
    setForm({
      nome: t.nome,
      descricao: t.descricao || "",
      skill: t.skill ? String(t.skill) : "",
      tipo: t.tipo || "ONLINE",
      carga_horaria: String(t.carga_horaria || 0),
      fornecedor: t.fornecedor || "",
      url: t.url || "",
      custo: t.custo === null || t.custo === undefined ? "0" : String(t.custo),
      nivel_alvo: String(t.nivel_alvo || 3),
      xp_concedido: String(t.xp_concedido || 0),
      certificacao: Boolean(t.certificacao),
      ativo: Boolean(t.ativo),
    });
    setFormAberto(true);
  };

  const enviarTreinamento = () => {
    if (!form.nome.trim()) {
      erro("Informe o nome do treinamento");
      return;
    }
    salvarTreinamento.mutate({
      nome: form.nome.trim(),
      descricao: form.descricao,
      skill: form.skill ? Number(form.skill) : null,
      tipo: form.tipo,
      carga_horaria: Number(form.carga_horaria) || 0,
      fornecedor: form.fornecedor,
      url: form.url,
      custo: Number(form.custo) || 0,
      nivel_alvo: Number(form.nivel_alvo) || 3,
      xp_concedido: Number(form.xp_concedido) || 0,
      certificacao: form.certificacao,
      ativo: form.ativo,
    });
  };

  const enviarInscricao = () => {
    if (!formInscricao.user || !formInscricao.training) {
      erro("Selecione o colaborador e o treinamento");
      return;
    }
    inscrever.mutate({
      user: Number(formInscricao.user),
      training: Number(formInscricao.training),
      status: "INSCRITO",
      origem: "MANUAL",
    });
  };

  const lista = treinamentos.data || [];
  const participacoesLista = participacoes.data || [];
  const concluidas = participacoesLista.filter((p) => p.status === "CONCLUIDO");

  const colunas: Array<ColunaTabela<Participacao>> = [
    {
      chave: "pessoa",
      titulo: "Colaborador",
      largura: "220px",
      renderizar: (p) => (
        <div className="flex items-center gap-2">
          <Avatar nome={p.user_detalhe?.nome} cor={p.user_detalhe?.cor} iniciais={p.user_detalhe?.iniciais} tamanho="xs" />
          <span className="truncate text-xs text-fg">{p.user_detalhe?.nome || "—"}</span>
        </div>
      ),
    },
    { chave: "treinamento", titulo: "Treinamento", largura: "240px", renderizar: (p) => <span className="text-xs text-fg">{p.training_detalhe?.nome || "—"}</span> },
    { chave: "fornecedor", titulo: "Fornecedor", largura: "160px", renderizar: (p) => <span className="text-xs text-fg-muted">{p.training_detalhe?.fornecedor || "—"}</span> },
    {
      chave: "carga",
      titulo: "Carga",
      largura: "100px",
      alinhar: "right",
      renderizar: (p) => <span className="text-xs tabular-nums text-fg-muted">{horas(p.training_detalhe?.carga_horaria || 0)}</span>,
    },
    {
      chave: "nota",
      titulo: "Nota",
      largura: "90px",
      alinhar: "center",
      renderizar: (p) => (p.nota !== null && p.nota !== undefined ? <Etiqueta tom={p.nota >= 7 ? "success" : "warning"}>{numero(p.nota, 1)}</Etiqueta> : <span className="text-2xs text-fg-subtle">—</span>),
    },
    {
      chave: "status",
      titulo: "Status",
      largura: "160px",
      renderizar: (p) =>
        gerenciar ? (
          <Selecao
            value={p.status}
            onChange={(e) => atualizar.mutate({ id: p.id, status: e.target.value })}
            className="h-8 w-40 text-xs"
          >
            <option value="INSCRITO">Inscrito</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="REPROVADO">Reprovado</option>
            <option value="CANCELADO">Cancelado</option>
          </Selecao>
        ) : (
          <Etiqueta tom={p.status === "CONCLUIDO" ? "success" : p.status === "CANCELADO" ? "neutral" : "info"}>
            {p.status_rotulo || p.status}
          </Etiqueta>
        ),
    },
    {
      chave: "certificado",
      titulo: "",
      largura: "90px",
      alinhar: "right",
      renderizar: (p) => (p.certificado_url ? (
        <a href={p.certificado_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs font-semibold text-brand underline">
          Certificado <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : <span className="text-2xs text-fg-subtle">—</span>),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Capacidade</span>
          <select value={skill} onChange={(e) => setSkill(e.target.value)} className="h-8 min-w-48 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todas</option>
            {(skills.data || []).map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Colaborador</span>
          <select value={colaborador} onChange={(e) => setColaborador(e.target.value)} className="h-8 min-w-48 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todos</option>
            {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
          </select>
        </label>
        <Chip cor="#D97706" ativo={somenteCertificacao} onClick={() => setSomenteCertificacao(!somenteCertificacao)}>Apenas com certificação</Chip>
      </div>

      {treinamentos.isLoading && <CarregandoBloco rotulo="Carregando catálogo de treinamentos..." />}
      {treinamentos.isError && <Alerta tom="danger" titulo="Não foi possível carregar os treinamentos">{mensagemErro(treinamentos.error)}</Alerta>}

      {treinamentos.data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPI rotulo="Treinamentos" valor={numero(lista.length)} icone={BookOpen} cor="#2563EB" compacto />
            <KPI rotulo="Carga horária total" valor={horas(lista.reduce((a, t) => a + (t.carga_horaria || 0), 0))} icone={Clock} cor="#0891B2" compacto />
            <KPI rotulo="Participações" valor={numero(participacoesLista.length)} icone={Users} cor="#7C3AED" subrotulo={numero(concluidas.length) + " concluídas"} compacto />
            <KPI rotulo="Investimento" valor={moeda(lista.reduce((a, t) => a + Number(t.custo || 0), 0), true)} icone={Award} cor="#059669" subrotulo="custo do catálogo" compacto />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-fg">Catálogo de treinamentos</h3>
            {gerenciar && (
              <Botao tamanho="xs" variante="primario" icone={Plus} onClick={abrirNovoTreinamento}>
                Novo treinamento
              </Botao>
            )}
          </div>

          {lista.length === 0 ? (
            <Vazio
              icone={BookOpen}
              titulo="Nenhum treinamento no catálogo"
              descricao="Cadastre cursos e certificações para vincular às trilhas de desenvolvimento."
              acao={
                gerenciar ? (
                  <Botao variante="primario" icone={Plus} onClick={abrirNovoTreinamento}>
                    Novo treinamento
                  </Botao>
                ) : undefined
              }
            />
          ) : (
            <GradeCards colunas="3">
              {lista.map((t) => (
                <div key={t.id} className="flex flex-col gap-2 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg">{t.nome}</p>
                      <p className="truncate text-2xs text-fg-muted">{t.fornecedor || "Fornecedor não informado"} · {t.tipo}</p>
                    </div>
                    {t.certificacao && <Etiqueta tom="warning" icone={Award}>Certificação</Etiqueta>}
                  </div>
                  {t.descricao && <p className="text-2xs text-fg-muted">{t.descricao}</p>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Etiqueta tom="neutral" icone={Clock}>{horas(t.carga_horaria)}</Etiqueta>
                    <Etiqueta tom="neutral" icone={Target}>Nível alvo N{t.nivel_alvo}</Etiqueta>
                    <Etiqueta tom={t.ativo ? "success" : "neutral"}>{t.ativo ? "Ativo" : "Inativo"}</Etiqueta>
                    {t.skill_nome && <Chip cor={t.skill_cor || "#F59E0B"}>{t.skill_nome}</Chip>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-2xs text-fg-muted">
                      {moeda(t.custo, true)} · +{numero(t.xp_concedido)} XP · {numero(t.total_participacoes)} participação(ões)
                    </span>
                    <div className="flex items-center gap-1.5">
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs font-semibold text-brand underline">
                          Abrir <ExternalLink className="size-3" aria-hidden />
                        </a>
                      )}
                      {gerenciar && (
                        <>
                          <BotaoIcone
                            icone={Pencil}
                            rotulo={"Editar " + t.nome}
                            tamanho="xs"
                            onClick={() => abrirEdicaoTreinamento(t)}
                          />
                          <BotaoIcone
                            icone={Trash2}
                            rotulo={"Excluir " + t.nome}
                            tamanho="xs"
                            onClick={() => setParaExcluir(t)}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </GradeCards>
          )}

          <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-semibold text-fg">Participações ({numero(participacoesLista.length)})</h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xs text-fg-muted">Ao marcar como concluído o sistema credita o XP e gera a evidência de certificação.</span>
                {gerenciar && (
                  <Botao tamanho="xs" variante="secundario" icone={UserPlus} onClick={() => setInscricaoAberta(true)}>
                    Inscrever colaborador
                  </Botao>
                )}
              </div>
            </div>
            <Tabela
              colunas={colunas}
              dados={participacoesLista}
              compacta
              vazio={<Vazio icone={BookOpen} titulo="Nenhuma participação registrada" descricao="As inscrições de colaboradores em treinamentos aparecem aqui." />}
            />
          </div>
        </>
      )}

      <PainelLateral
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        titulo={editando ? "Editar treinamento" : "Novo treinamento"}
        subtitulo="O catálogo alimenta as trilhas de desenvolvimento e as recomendações de capacidade"
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setFormAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Check} carregando={salvarTreinamento.isPending} onClick={enviarTreinamento}>
              {editando ? "Salvar treinamento" : "Criar treinamento"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome" obrigatorio htmlFor="t-nome">
            <Entrada id="t-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: AWS Solutions Architect Associate" />
          </Campo>
          <Campo rotulo="Descrição" htmlFor="t-desc">
            <AreaTexto id="t-desc" rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Capacidade vinculada" htmlFor="t-skill">
              <Selecao id="t-skill" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })}>
                <option value="">Sem vínculo</option>
                {(skills.data || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Modalidade" htmlFor="t-tipo">
              <Selecao id="t-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS_TREINAMENTO.map((t) => (
                  <option key={t.valor} value={t.valor}>{t.rotulo}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Carga horária (h)" htmlFor="t-carga">
              <Entrada id="t-carga" type="number" min={0} value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} />
            </Campo>
            <Campo rotulo="Fornecedor" htmlFor="t-forn">
              <Entrada id="t-forn" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
            </Campo>
            <Campo rotulo="Link" htmlFor="t-url">
              <Entrada id="t-url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
            </Campo>
            <Campo rotulo="Custo (R$)" htmlFor="t-custo">
              <Entrada id="t-custo" type="number" min={0} step="0.01" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
            </Campo>
            <Campo rotulo="Nível alvo" htmlFor="t-nivel">
              <Selecao id="t-nivel" value={form.nivel_alvo} onChange={(e) => setForm({ ...form, nivel_alvo: e.target.value })}>
                {nivelLegenda().map((n) => (
                  <option key={n.nivel} value={n.nivel}>{n.nivel} — {n.nome}</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="XP concedido" htmlFor="t-xp">
              <Entrada id="t-xp" type="number" min={0} value={form.xp_concedido} onChange={(e) => setForm({ ...form, xp_concedido: e.target.value })} />
            </Campo>
          </div>
          <Interruptor
            ativo={form.certificacao}
            onChange={(v) => setForm({ ...form, certificacao: v })}
            rotulo="Gera certificação"
            descricao="Ao concluir, o sistema cria a evidência de certificação no perfil do colaborador."
          />
          <Interruptor ativo={form.ativo} onChange={(v) => setForm({ ...form, ativo: v })} rotulo="Disponível no catálogo" />
        </div>
      </PainelLateral>

      <Modal
        aberto={inscricaoAberta}
        onFechar={() => setInscricaoAberta(false)}
        titulo="Inscrever colaborador"
        subtitulo="A inscrição cria a participação que depois registra a conclusão e o XP"
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setInscricaoAberta(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={UserPlus} carregando={inscrever.isPending} onClick={enviarInscricao}>
              Inscrever
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Colaborador" obrigatorio htmlFor="i-user">
            <Selecao id="i-user" value={formInscricao.user} onChange={(e) => setFormInscricao({ ...formInscricao, user: e.target.value })}>
              <option value="">Selecione o colaborador</option>
              {(usuarios.data || []).map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Treinamento" obrigatorio htmlFor="i-training">
            <Selecao id="i-training" value={formInscricao.training} onChange={(e) => setFormInscricao({ ...formInscricao, training: e.target.value })}>
              <option value="">Selecione o treinamento</option>
              {lista.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </Selecao>
          </Campo>
          <Alerta tom="info" titulo="Uma inscrição por colaborador">
            O mesmo colaborador não pode ser inscrito duas vezes no mesmo treinamento.
          </Alerta>
        </div>
      </Modal>

      <Modal
        aberto={paraExcluir !== null}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir treinamento"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setParaExcluir(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirTreinamento.isPending}
              onClick={() => {
                if (paraExcluir) excluirTreinamento.mutate({ id: paraExcluir.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão de <strong>{paraExcluir?.nome}</strong> do catálogo?
        </p>
        <Alerta tom="warning" titulo="Participações removidas" className="mt-3">
          As participações e as evidências geradas por este treinamento deixam de aparecer no perfil dos colaboradores.
        </Alerta>
      </Modal>
    </div>
  );
}


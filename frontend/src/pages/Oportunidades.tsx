import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Award, Briefcase, Calendar, Check, ChevronRight, Clock, GraduationCap, Layers3,
  Pencil, Plus, Rocket, Send, Sparkles, Star, Target, Trash2, Users, X, type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraProgresso, Botao, BotaoIcone, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, ControleDeslizante, Entrada, Etiqueta, Interruptor, KPI, Modal, PainelLateral,
  Selecao, Vazio, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { EscalaCores, GraficoBarras, type BarraItem } from "@/components/charts";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, comAlfa, corPorValor, nivelLegenda } from "@/lib/utils";
import { dataCurta, numero, percentual } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Projeto, Skill, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Marketplace interno de oportunidades (RF-85 · RF-86)
   ========================================================================== */

const TIPOS_OPORTUNIDADE = [
  { valor: "PROJETO", rotulo: "Vaga em projeto" },
  { valor: "MENTORIA", rotulo: "Vaga de mentoria" },
  { valor: "TREINAMENTO", rotulo: "Trilha de treinamento" },
  { valor: "MOVIMENTACAO", rotulo: "Movimentação interna" },
  { valor: "COMUNIDADE", rotulo: "Comunidade de prática" },
];

const ICONES_TIPO: Record<string, LucideIcon> = {
  PROJETO: Briefcase,
  MENTORIA: GraduationCap,
  TREINAMENTO: Award,
  MOVIMENTACAO: Rocket,
  COMUNIDADE: Users,
};

const TOM_STATUS_CANDIDATURA: Record<string, Tom> = {
  CANDIDATADO: "info",
  EM_ANALISE: "warning",
  APROVADO: "success",
  RECUSADO: "danger",
  DESISTIU: "neutral",
};

interface SkillResumo {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  criticidade: string;
}

interface Oportunidade {
  id: number;
  titulo: string;
  descricao: string;
  tipo: string;
  tipo_rotulo: string;
  project: number | null;
  project_nome: string;
  skills_requeridas: number[];
  skills_detalhe: SkillResumo[];
  nivel_minimo: number;
  responsavel: number | null;
  responsavel_detalhe: UsuarioResumo | null;
  carga_horaria: number;
  data_abertura: string;
  data_limite: string | null;
  vagas: number;
  ativa: boolean;
  total_candidaturas: number;
  criado_em: string;
}

interface AderenciaSkill {
  skill: string;
  skill_id: number;
  requerido: number;
  atual: number;
}

interface OportunidadeRecomendada extends Oportunidade {
  aderencia: number;
  skills_atendidas: AderenciaSkill[];
  skills_gap: AderenciaSkill[];
  recomendacao: string;
}

interface Candidatura {
  id: number;
  opportunity: number;
  opportunity_titulo: string;
  user: number;
  user_detalhe: UsuarioResumo | null;
  status: string;
  status_rotulo: string;
  motivacao: string;
  aderencia: number;
  skills_atendidas: AderenciaSkill[];
  skills_gap: AderenciaSkill[];
  criado_em: string;
}

interface FormularioOportunidade {
  titulo: string;
  tipo: string;
  descricao: string;
  project: string;
  nivel_minimo: number;
  vagas: number;
  carga_horaria: number;
  data_limite: string;
  responsavel: string;
}

function formularioVazio(): FormularioOportunidade {
  return {
    titulo: "", tipo: "PROJETO", descricao: "", project: "", nivel_minimo: 3,
    vagas: 1, carga_horaria: 10, data_limite: "", responsavel: "",
  };
}

type AbaOportunidades = "recomendadas" | "todas" | "candidaturas";

export default function Oportunidades() {
  const navegar = useNavigate();
  const { usuario, pode } = useAuth();
  const podeEditar = pode("capacidade.editar");
  const podeCancelar = pode("capacidade.autoavaliar");
  const [aba, setAba] = useState<AbaOportunidades>("recomendadas");
  const [tipo, setTipo] = useState("");
  const [ativa, setAtiva] = useState("true");
  const [candidatar, setCandidatar] = useState<Oportunidade | null>(null);
  const [detalhe, setDetalhe] = useState<Oportunidade | null>(null);
  const [modalOportunidade, setModalOportunidade] = useState(false);
  const [editando, setEditando] = useState<Oportunidade | null>(null);
  const [paraExcluir, setParaExcluir] = useState<Oportunidade | null>(null);
  const [paraCancelar, setParaCancelar] = useState<Candidatura | null>(null);

  const recomendadas = useConsulta<{ oportunidades: OportunidadeRecomendada[] }>(
    ["oportunidades-recomendadas"],
    "/capacidades/oportunidades/recomendadas/"
  );

  const todas = useLista<Oportunidade>(CHAVES.oportunidades, "/capacidades/oportunidades/", {
    tipo: tipo || undefined,
    ativa: ativa === "" ? undefined : ativa,
    page_size: 200,
  });

  const candidaturas = useLista<Candidatura>(["candidaturas"], "/capacidades/candidaturas/", {
    user: usuario ? usuario.id : undefined,
    page_size: 100,
  });

  const excluir = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (v) => "/capacidades/oportunidades/" + v.id + "/",
    invalidar: [CHAVES.oportunidades, ["oportunidades-recomendadas"]],
    mensagemSucesso: "Oportunidade excluída",
    aoSucesso: () => {
      setParaExcluir(null);
      setDetalhe(null);
    },
  });

  const cancelar = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (v) => "/capacidades/candidaturas/" + v.id + "/",
    invalidar: [["candidaturas"], ["oportunidades-recomendadas"], CHAVES.oportunidades],
    mensagemSucesso: "Candidatura cancelada",
    aoSucesso: () => setParaCancelar(null),
  });

  function abrirNova() {
    setEditando(null);
    setModalOportunidade(true);
  }

  function abrirEdicao(oportunidade: Oportunidade) {
    setDetalhe(null);
    setEditando(oportunidade);
    setModalOportunidade(true);
  }

  function fecharFormulario() {
    setModalOportunidade(false);
    setEditando(null);
  }

  const listaRecomendadas = useMemo(
    () => [...(recomendadas.data?.oportunidades || [])].sort((a, b) => b.aderencia - a.aderencia),
    [recomendadas.data]
  );

  const minhasCandidaturas = candidaturas.data || [];
  const idsCandidatados = useMemo(() => minhasCandidaturas.map((c) => c.opportunity), [minhasCandidaturas]);

  const barrasAderencia: BarraItem[] = listaRecomendadas.slice(0, 12).map((o) => ({
    rotulo: o.titulo,
    valor: o.aderencia,
    cor: corPorValor(o.aderencia / 100),
  }));

  const resumo = useMemo(() => {
    const media = listaRecomendadas.length
      ? listaRecomendadas.reduce((a, o) => a + o.aderencia, 0) / listaRecomendadas.length
      : 0;
    const fortes = listaRecomendadas.filter((o) => o.aderencia >= 80).length;
    const aprovadas = minhasCandidaturas.filter((c) => c.status === "APROVADO").length;
    return { media, fortes, aprovadas };
  }, [listaRecomendadas, minhasCandidaturas]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Oportunidades internas"
        subtitulo="Marketplace de vagas, mentorias e movimentações com aderência calculada ao seu perfil"
        icone={Rocket}
        cor="#7C3AED"
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Capacidades", onClick: () => navegar("/capacidades") },
          { rotulo: "Oportunidades" },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={Award} onClick={() => navegar("/pdi")}>PDI e trilhas</Botao>
            {podeEditar && <Botao variante="primario" icone={Plus} onClick={abrirNova}>Criar oportunidade</Botao>}
          </>
        }
        filhos={
          <>
            <Abas
              valor={aba}
              onChange={(v) => setAba(v)}
              abas={[
                { valor: "recomendadas", rotulo: "Recomendadas para mim", icone: Sparkles, contagem: listaRecomendadas.length },
                { valor: "todas", rotulo: "Todas", icone: Layers3, contagem: (todas.data || []).length },
                { valor: "candidaturas", rotulo: "Minhas candidaturas", icone: Send, contagem: minhasCandidaturas.length },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI rotulo="Oportunidades abertas" valor={numero((todas.data || []).filter((o) => o.ativa).length)} icone={Rocket} cor="#7C3AED" compacto />
        <KPI rotulo="Aderência média" valor={percentual(resumo.media, 0)} icone={Target} cor={corPorValor(resumo.media / 100)} subrotulo="nas recomendações" compacto />
        <KPI rotulo="Forte aderência" valor={numero(resumo.fortes)} icone={Star} cor="#059669" subrotulo="80% ou mais" compacto />
        <KPI rotulo="Candidaturas aprovadas" valor={numero(resumo.aprovadas)} icone={Check} cor="#2563EB" subrotulo={numero(minhasCandidaturas.length) + " no total"} compacto />
      </div>

      {aba === "recomendadas" && (
        <>
          {recomendadas.isLoading && <CarregandoBloco rotulo="Calculando aderência das oportunidades..." />}
          {recomendadas.isError && <Alerta tom="danger" titulo="Não foi possível carregar as recomendações">{mensagemErro(recomendadas.error)}</Alerta>}
          {recomendadas.data && (
            listaRecomendadas.length === 0 ? (
              <Vazio
                icone={Sparkles}
                titulo="Nenhuma oportunidade recomendada"
                descricao="Registre suas capacidades no perfil para que o motor calcule a aderência às vagas internas."
              />
            ) : (
              <>
                {barrasAderencia.length > 0 && (
                  <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                    <h3 className="mb-3 text-sm font-semibold text-fg">Aderência ao seu perfil</h3>
                    <GraficoBarras itens={barrasAderencia} horizontal formatarValor={(v) => percentual(v, 0)} />
                  </div>
                )}
                <GradeCards colunas="2">
                  {listaRecomendadas.map((o) => (
                    <CartaoOportunidade
                      key={o.id}
                      oportunidade={o}
                      aderencia={o.aderencia}
                      recomendacao={o.recomendacao}
                      skillsAtendidas={o.skills_atendidas}
                      skillsGap={o.skills_gap}
                      jaCandidatado={idsCandidatados.indexOf(o.id) >= 0}
                      aoDetalhar={() => setDetalhe(o)}
                      aoCandidatar={() => setCandidatar(o)}
                      podeEditar={podeEditar}
                      aoEditar={() => abrirEdicao(o)}
                      aoExcluir={() => setParaExcluir(o)}
                    />
                  ))}
                </GradeCards>
              </>
            )
          )}
        </>
      )}

      {aba === "todas" && (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
            <label className="inline-flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
                <option value="">Todos</option>
                {TIPOS_OPORTUNIDADE.map((t) => (<option key={t.valor} value={t.valor}>{t.rotulo}</option>))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Situação</span>
              <select value={ativa} onChange={(e) => setAtiva(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
                <option value="true">Ativas</option>
                <option value="false">Encerradas</option>
                <option value="">Todas</option>
              </select>
            </label>
            {(tipo || ativa !== "true") && (
              <Botao tamanho="xs" variante="fantasma" icone={X} onClick={() => { setTipo(""); setAtiva("true"); }}>Limpar filtros</Botao>
            )}
          </div>

          {todas.isLoading && <CarregandoBloco rotulo="Carregando oportunidades..." />}
          {todas.isError && <Alerta tom="danger" titulo="Não foi possível carregar as oportunidades">{mensagemErro(todas.error)}</Alerta>}
          {todas.data && (
            (todas.data || []).length === 0 ? (
              <Vazio
                icone={Rocket}
                titulo="Nenhuma oportunidade encontrada"
                descricao="Ajuste os filtros ou crie a primeira oportunidade interna."
                acao={podeEditar ? <Botao variante="primario" icone={Plus} onClick={abrirNova}>Criar oportunidade</Botao> : undefined}
              />
            ) : (
              <GradeCards colunas="2">
                {(todas.data || []).map((o) => (
                  <CartaoOportunidade
                    key={o.id}
                    oportunidade={o}
                    jaCandidatado={idsCandidatados.indexOf(o.id) >= 0}
                    aoDetalhar={() => setDetalhe(o)}
                    aoCandidatar={() => setCandidatar(o)}
                    podeEditar={podeEditar}
                    aoEditar={() => abrirEdicao(o)}
                    aoExcluir={() => setParaExcluir(o)}
                  />
                ))}
              </GradeCards>
            )
          )}
        </>
      )}

      {aba === "candidaturas" && (
        <>
          {candidaturas.isLoading && <CarregandoBloco rotulo="Carregando suas candidaturas..." />}
          {candidaturas.isError && <Alerta tom="danger" titulo="Não foi possível carregar as candidaturas">{mensagemErro(candidaturas.error)}</Alerta>}
          {candidaturas.data && (
            minhasCandidaturas.length === 0 ? (
              <Vazio icone={Send} titulo="Nenhuma candidatura registrada" descricao="Candidate-se a uma oportunidade para acompanhar o processo aqui." />
            ) : (
              <div className="space-y-2">
                {minhasCandidaturas.map((c) => (
                  <div key={c.id} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">{c.opportunity_titulo}</p>
                        <p className="text-2xs text-fg-muted">Candidatura enviada {dataCurta(c.criado_em)}</p>
                        {c.motivacao && <p className="mt-1 max-w-3xl text-2xs text-fg-muted">{c.motivacao}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Etiqueta tom={TOM_STATUS_CANDIDATURA[c.status] || "neutral"}>{c.status_rotulo || c.status}</Etiqueta>
                        <span className="text-sm font-bold tabular-nums" style={{ color: corPorValor(c.aderencia / 100) }}>{percentual(c.aderencia, 0)}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <BarraProgresso valor={c.aderencia} cor={corPorValor(c.aderencia / 100)} altura="sm" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(c.skills_atendidas || []).map((s) => (<Chip key={"ok-" + s.skill_id} cor="#059669">{s.skill} · N{s.atual}</Chip>))}
                      {(c.skills_gap || []).map((s) => (<Chip key={"gap-" + s.skill_id} cor="#DC2626">{s.skill} · falta N{s.requerido}</Chip>))}
                    </div>
                    {podeCancelar && (
                      <div className="mt-2 flex justify-end border-t border-border pt-2">
                        <Botao tamanho="xs" variante="fantasma" icone={X} onClick={() => setParaCancelar(c)}>
                          Cancelar candidatura
                        </Botao>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      <ModalCandidatura oportunidade={candidatar} onFechar={() => setCandidatar(null)} aoConcluir={() => { candidaturas.refetch(); recomendadas.refetch(); }} />
      <ModalOportunidade aberto={modalOportunidade} oportunidade={editando} onFechar={fecharFormulario} aoConcluir={() => { todas.refetch(); recomendadas.refetch(); }} />

      <PainelLateral
        aberto={Boolean(detalhe)}
        onFechar={() => setDetalhe(null)}
        titulo={detalhe ? detalhe.titulo : "Oportunidade"}
        subtitulo={detalhe ? detalhe.tipo_rotulo || detalhe.tipo : undefined}
        largura="md"
        rodape={
          detalhe && (podeEditar || detalhe.ativa) ? (
            <>
              {podeEditar && (
                <>
                  <Botao variante="secundario" icone={Pencil} className="mr-auto" onClick={() => abrirEdicao(detalhe)}>Editar</Botao>
                  <Botao variante="perigo" icone={Trash2} onClick={() => setParaExcluir(detalhe)}>Excluir</Botao>
                </>
              )}
              {detalhe.ativa && (
                <Botao
                  variante="primario"
                  icone={Send}
                  disabled={idsCandidatados.indexOf(detalhe.id) >= 0}
                  onClick={() => { setCandidatar(detalhe); setDetalhe(null); }}
                >
                  {idsCandidatados.indexOf(detalhe.id) >= 0 ? "Candidatura já enviada" : "Candidatar-se"}
                </Botao>
              )}
            </>
          ) : undefined
        }
      >
        {detalhe && <DetalheOportunidade oportunidade={detalhe} />}
      </PainelLateral>

      <Modal
        aberto={paraExcluir !== null}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir oportunidade"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao onClick={() => setParaExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluir.isPending}
              onClick={() => paraExcluir && excluir.mutate({ id: paraExcluir.id })}
            >
              Excluir
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão de <strong>{paraExcluir?.titulo}</strong>?
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          As candidaturas registradas para esta oportunidade são removidas junto com ela.
        </p>
      </Modal>

      <Modal
        aberto={paraCancelar !== null}
        onFechar={() => setParaCancelar(null)}
        titulo="Cancelar candidatura"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao onClick={() => setParaCancelar(null)}>Voltar</Botao>
            <Botao
              variante="perigo"
              icone={X}
              carregando={cancelar.isPending}
              onClick={() => paraCancelar && cancelar.mutate({ id: paraCancelar.id })}
            >
              Cancelar candidatura
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma o cancelamento da candidatura a <strong>{paraCancelar?.opportunity_titulo}</strong>?
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          O registro é removido e a vaga volta a aparecer como disponível para você.
        </p>
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Cartão de oportunidade
   ========================================================================== */

function CartaoOportunidade({
  oportunidade, aderencia, recomendacao, skillsAtendidas, skillsGap, jaCandidatado, aoDetalhar, aoCandidatar,
  podeEditar, aoEditar, aoExcluir,
}: {
  oportunidade: Oportunidade;
  aderencia?: number;
  recomendacao?: string;
  skillsAtendidas?: AderenciaSkill[];
  skillsGap?: AderenciaSkill[];
  jaCandidatado: boolean;
  aoDetalhar: () => void;
  aoCandidatar: () => void;
  podeEditar: boolean;
  aoEditar: () => void;
  aoExcluir: () => void;
}) {
  const Icone = ICONES_TIPO[oportunidade.tipo] || Rocket;
  const cor = aderencia !== undefined ? corPorValor(aderencia / 100) : "#7C3AED";
  const encerrada = !oportunidade.ativa;

  return (
    <div className={cn("flex flex-col gap-3 rounded-sgp-lg border bg-surface p-4 shadow-n1", encerrada ? "border-border opacity-80" : "border-border")}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-sgp-lg" style={{ backgroundColor: comAlfa("#7C3AED", 0.16), color: "#7C3AED" }}>
          <Icone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={aoDetalhar} className="max-w-full truncate text-left text-sm font-semibold text-fg hover:text-brand">
            {oportunidade.titulo}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Etiqueta tom="brand">{oportunidade.tipo_rotulo || oportunidade.tipo}</Etiqueta>
            {oportunidade.project_nome && <Etiqueta tom="neutral" icone={Briefcase}>{oportunidade.project_nome}</Etiqueta>}
            <Etiqueta tom={encerrada ? "neutral" : "success"}>{encerrada ? "Encerrada" : "Ativa"}</Etiqueta>
            {jaCandidatado && <Etiqueta tom="info" icone={Check}>Candidatura enviada</Etiqueta>}
          </div>
        </div>
        {aderencia !== undefined && (
          <div className="shrink-0 text-right">
            <p className="text-2xs uppercase tracking-wide text-fg-muted">Aderência</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: cor }}>{percentual(aderencia, 0)}</p>
          </div>
        )}
      </div>

      {oportunidade.descricao && <p className="line-clamp-3 text-2xs text-fg-muted">{oportunidade.descricao}</p>}

      {aderencia !== undefined && (
        <div>
          <BarraProgresso valor={aderencia} cor={cor} altura="md" />
          {recomendacao && <p className="mt-1 text-2xs font-medium" style={{ color: cor }}>{recomendacao}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(oportunidade.skills_detalhe || []).map((s) => (
          <Chip key={s.id} cor={s.cor || "#F59E0B"}>{s.nome}</Chip>
        ))}
        {(oportunidade.skills_detalhe || []).length === 0 && <span className="text-2xs text-fg-subtle">Sem capacidades específicas exigidas</span>}
      </div>

      {(skillsAtendidas || skillsGap || []).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-sgp border border-success/30 bg-success-soft/20 p-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-success">Atendidas ({numero((skillsAtendidas || []).length)})</p>
            <ul className="mt-1 space-y-0.5">
              {(skillsAtendidas || []).slice(0, 4).map((s) => (
                <li key={s.skill_id} className="flex items-center gap-1 text-2xs text-fg-muted">
                  <Check className="size-3 shrink-0 text-success" aria-hidden />{s.skill} · N{s.atual} ≥ N{s.requerido}
                </li>
              ))}
              {(skillsAtendidas || []).length === 0 && <li className="text-2xs text-fg-subtle">Nenhuma</li>}
            </ul>
          </div>
          <div className="rounded-sgp border border-danger/30 bg-danger-soft/20 p-2.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-danger">Gaps ({(skillsGap || []).length})</p>
            <ul className="mt-1 space-y-0.5">
              {(skillsGap || []).slice(0, 4).map((s) => (
                <li key={s.skill_id} className="flex items-center gap-1 text-2xs text-fg-muted">
                  <AlertTriangle className="size-3 shrink-0 text-danger" aria-hidden />{s.skill} · N{s.atual} &lt; N{s.requerido}
                </li>
              ))}
              {(skillsGap || []).length === 0 && <li className="text-2xs text-fg-subtle">Nenhum</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">
        <div>
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível mínimo</p>
          <p className="text-sm font-bold tabular-nums text-fg">N{oportunidade.nivel_minimo}</p>
        </div>
        <div>
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Vagas</p>
          <p className="text-sm font-bold tabular-nums text-fg">{numero(oportunidade.vagas)}</p>
        </div>
        <div>
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Carga semanal</p>
          <p className="text-sm font-bold tabular-nums text-fg">{oportunidade.carga_horaria ? numero(oportunidade.carga_horaria) + "h" : "—"}</p>
        </div>
        <div>
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Candidaturas até</p>
          <p className="text-sm font-bold text-fg">{oportunidade.data_limite ? dataCurta(oportunidade.data_limite) : "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
          {oportunidade.responsavel_detalhe ? (
            <>
              <Avatar nome={oportunidade.responsavel_detalhe.nome} cor={oportunidade.responsavel_detalhe.cor} iniciais={oportunidade.responsavel_detalhe.iniciais} tamanho="xs" />
              {oportunidade.responsavel_detalhe.nome} · {numero(oportunidade.total_candidaturas)} candidatura(s)
            </>
          ) : (
            <>{numero(oportunidade.total_candidaturas)} candidatura(s)</>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {podeEditar && (
            <>
              <BotaoIcone icone={Pencil} rotulo={"Editar " + oportunidade.titulo} tamanho="xs" onClick={aoEditar} />
              <BotaoIcone icone={Trash2} rotulo={"Excluir " + oportunidade.titulo} variante="perigo" tamanho="xs" onClick={aoExcluir} />
            </>
          )}
          <Botao tamanho="xs" variante="fantasma" icone={ChevronRight} onClick={aoDetalhar}>Detalhes</Botao>
          <Botao
            tamanho="xs"
            variante="primario"
            icone={Send}
            disabled={encerrada || jaCandidatado}
            onClick={aoCandidatar}
          >
            {jaCandidatado ? "Candidatado" : "Candidatar-se"}
          </Botao>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Detalhe da oportunidade
   ========================================================================== */

function DetalheOportunidade({ oportunidade }: { oportunidade: Oportunidade }) {
  const navegar = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Etiqueta tom="brand">{oportunidade.tipo_rotulo || oportunidade.tipo}</Etiqueta>
        <Etiqueta tom={oportunidade.ativa ? "success" : "neutral"}>{oportunidade.ativa ? "Ativa" : "Encerrada"}</Etiqueta>
        <Etiqueta tom="neutral" icone={Calendar}>Aberta em {dataCurta(oportunidade.data_abertura)}</Etiqueta>
        {oportunidade.data_limite && <Etiqueta tom="warning" icone={Clock}>Até {dataCurta(oportunidade.data_limite)}</Etiqueta>}
      </div>

      {oportunidade.descricao && <p className="text-xs text-fg-muted">{oportunidade.descricao}</p>}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-sgp border border-border bg-surface-2 p-3">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível mínimo</p>
          <p className="text-lg font-bold tabular-nums text-fg">N{oportunidade.nivel_minimo}</p>
          <p className="text-2xs text-fg-muted">{nivelLegenda().find((n) => n.nivel === oportunidade.nivel_minimo)?.nome}</p>
        </div>
        <div className="rounded-sgp border border-border bg-surface-2 p-3">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Vagas</p>
          <p className="text-lg font-bold tabular-nums text-fg">{numero(oportunidade.vagas)}</p>
          <p className="text-2xs text-fg-muted">{numero(oportunidade.total_candidaturas)} candidatura(s)</p>
        </div>
        <div className="rounded-sgp border border-border bg-surface-2 p-3">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Carga horária semanal</p>
          <p className="text-lg font-bold tabular-nums text-fg">{oportunidade.carga_horaria ? numero(oportunidade.carga_horaria) + "h" : "—"}</p>
        </div>
        <div className="rounded-sgp border border-border bg-surface-2 p-3">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Responsável</p>
          <p className="truncate text-sm font-bold text-fg">{oportunidade.responsavel_detalhe?.nome || "—"}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold text-fg">Capacidades requeridas</h4>
        <div className="flex flex-wrap gap-1.5">
          {(oportunidade.skills_detalhe || []).map((s) => (
            <button key={s.id} type="button" onClick={() => navegar("/capacidades/skills/" + s.id)}>
              <Chip cor={s.cor || "#F59E0B"}>{s.nome} · {s.criticidade}</Chip>
            </button>
          ))}
          {(oportunidade.skills_detalhe || []).length === 0 && <span className="text-2xs text-fg-subtle">Nenhuma capacidade específica.</span>}
        </div>
      </div>

      {oportunidade.project && (
        <Botao variante="fantasma" icone={Briefcase} larguraTotal onClick={() => navegar("/projetos/" + oportunidade.project)}>
          Abrir projeto {oportunidade.project_nome}
        </Botao>
      )}
    </div>
  );
}

/* ==========================================================================
   Modal: candidatar-se
   ========================================================================== */

function ModalCandidatura({ oportunidade, onFechar, aoConcluir }: { oportunidade: Oportunidade | null; onFechar: () => void; aoConcluir: () => void }) {
  const [motivacao, setMotivacao] = useState("");

  const candidatar = useMutacao<Record<string, unknown>, Candidatura>({
    url: "/capacidades/candidaturas/",
    invalidar: [["candidaturas"], ["oportunidades-recomendadas"], CHAVES.oportunidades],
    mensagemSucesso: "Candidatura enviada com sucesso",
    aoSucesso: () => { setMotivacao(""); aoConcluir(); onFechar(); },
  });

  return (
    <Modal
      aberto={Boolean(oportunidade)}
      onFechar={onFechar}
      titulo="Candidatar-se"
      subtitulo={oportunidade ? oportunidade.titulo + " · " + (oportunidade.tipo_rotulo || oportunidade.tipo) : undefined}
      largura="md"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            icone={Send}
            carregando={candidatar.isPending}
            onClick={() => oportunidade && candidatar.mutate({ opportunity: oportunidade.id, motivacao })}
          >
            Enviar candidatura
          </Botao>
        </>
      }
    >
      {oportunidade && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Aderência calculada automaticamente">
            O sistema compara suas capacidades com o nível mínimo exigido e registra o percentual de aderência na candidatura.
          </Alerta>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível mínimo</p>
              <p className="text-lg font-bold tabular-nums text-fg">N{oportunidade.nivel_minimo}</p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Vagas</p>
              <p className="text-lg font-bold tabular-nums text-fg">{numero(oportunidade.vagas)}</p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Prazo</p>
              <p className="text-sm font-bold text-fg">{oportunidade.data_limite ? dataCurta(oportunidade.data_limite) : "—"}</p>
            </div>
          </div>
          <Campo rotulo="Motivação" htmlFor="cd-motiv" dica="Destaque experiências e o que você pretende desenvolver.">
            <AreaTexto
              id="cd-motiv"
              rows={4}
              value={motivacao}
              onChange={(e) => setMotivacao(e.target.value)}
              placeholder="Ex.: atuei na migração de dois serviços críticos e quero aprofundar arquitetura orientada a eventos."
            />
          </Campo>
          <div className="flex flex-wrap gap-1.5">
            {(oportunidade.skills_detalhe || []).map((s) => (<Chip key={s.id} cor={s.cor || "#F59E0B"}>{s.nome}</Chip>))}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ==========================================================================
   Modal: nova oportunidade
   ========================================================================== */

function ModalOportunidade({
  aberto, oportunidade, onFechar, aoConcluir,
}: {
  aberto: boolean;
  oportunidade: Oportunidade | null;
  onFechar: () => void;
  aoConcluir: () => void;
}) {
  const editando = Boolean(oportunidade);
  const projetos = useLista<Projeto>(CHAVES.projetos, aberto ? "/projetos/" : null, { page_size: 300 });
  const skills = useLista<Skill>(CHAVES.skills, aberto ? "/capacidades/skills/" : null, { page_size: 300 });
  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, aberto ? "/usuarios/" : null, { ativo: true, page_size: 300 });

  const [form, setForm] = useState<FormularioOportunidade>(formularioVazio());
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [ativa, setAtiva] = useState(true);
  const [buscaSkill, setBuscaSkill] = useState("");

  useEffect(() => {
    if (!aberto) return;
    setBuscaSkill("");
    if (oportunidade) {
      setForm({
        titulo: oportunidade.titulo,
        tipo: oportunidade.tipo,
        descricao: oportunidade.descricao,
        project: oportunidade.project ? String(oportunidade.project) : "",
        nivel_minimo: oportunidade.nivel_minimo,
        vagas: oportunidade.vagas,
        carga_horaria: oportunidade.carga_horaria,
        data_limite: oportunidade.data_limite || "",
        responsavel: oportunidade.responsavel ? String(oportunidade.responsavel) : "",
      });
      setSelecionadas(oportunidade.skills_requeridas || []);
      setAtiva(oportunidade.ativa);
      return;
    }
    setForm(formularioVazio());
    setSelecionadas([]);
    setAtiva(true);
  }, [aberto, oportunidade]);

  const salvar = useMutacao<Record<string, unknown>, Oportunidade>({
    metodo: editando ? "patch" : "post",
    url: () => (oportunidade ? "/capacidades/oportunidades/" + oportunidade.id + "/" : "/capacidades/oportunidades/"),
    invalidar: [CHAVES.oportunidades, ["oportunidades-recomendadas"]],
    mensagemSucesso: editando ? "Oportunidade atualizada" : "Oportunidade publicada",
    aoSucesso: () => {
      aoConcluir();
      onFechar();
    },
  });

  const filtradas = useMemo(() => {
    const termo = buscaSkill.trim().toLowerCase();
    const lista = skills.data || [];
    return termo ? lista.filter((s) => s.nome.toLowerCase().indexOf(termo) >= 0) : lista;
  }, [skills.data, buscaSkill]);

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? "Editar oportunidade" : "Criar oportunidade interna"}
      subtitulo={
        oportunidade
          ? oportunidade.titulo + " · " + (oportunidade.tipo_rotulo || oportunidade.tipo)
          : "Publique vagas de projeto, mentoria, treinamento ou movimentação (RF-85)"
      }
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            icone={editando ? Check : Plus}
            carregando={salvar.isPending}
            disabled={!form.titulo.trim()}
            onClick={() =>
              salvar.mutate({
                titulo: form.titulo.trim(),
                tipo: form.tipo,
                descricao: form.descricao,
                project: form.project ? Number(form.project) : null,
                skills_requeridas: selecionadas,
                nivel_minimo: Number(form.nivel_minimo),
                vagas: Number(form.vagas),
                carga_horaria: Number(form.carga_horaria),
                data_limite: form.data_limite || null,
                responsavel: form.responsavel ? Number(form.responsavel) : null,
                ativa,
              })
            }
          >
            {editando ? "Salvar alterações" : "Publicar oportunidade"}
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Título" obrigatorio htmlFor="no-titulo" className="sm:col-span-2">
            <Entrada id="no-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Tech lead do módulo de pagamentos" />
          </Campo>
          <Campo rotulo="Tipo" htmlFor="no-tipo">
            <Selecao id="no-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPOS_OPORTUNIDADE.map((t) => (<option key={t.valor} value={t.valor}>{t.rotulo}</option>))}
            </Selecao>
          </Campo>
          <Campo rotulo="Projeto vinculado" htmlFor="no-proj">
            <Selecao id="no-proj" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}>
              <option value="">Sem projeto</option>
              {(projetos.data || []).map((p) => (<option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>))}
            </Selecao>
          </Campo>
          <Campo rotulo="Descrição" htmlFor="no-desc" className="sm:col-span-2">
            <AreaTexto id="no-desc" rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Responsabilidades, contexto e o que a pessoa vai desenvolver." />
          </Campo>
          <Campo rotulo="Vagas" htmlFor="no-vagas">
            <Entrada id="no-vagas" type="number" min="1" value={form.vagas} onChange={(e) => setForm({ ...form, vagas: Number(e.target.value) })} />
          </Campo>
          <Campo rotulo="Carga horária semanal (h)" htmlFor="no-carga">
            <Entrada id="no-carga" type="number" min="0" value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: Number(e.target.value) })} />
          </Campo>
          <Campo rotulo="Candidaturas até" htmlFor="no-prazo">
            <Entrada id="no-prazo" type="date" value={form.data_limite} onChange={(e) => setForm({ ...form, data_limite: e.target.value })} />
          </Campo>
          <Campo rotulo="Responsável" htmlFor="no-resp">
            <Selecao id="no-resp" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })}>
              <option value="">Sem responsável</option>
              {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
            </Selecao>
          </Campo>
        </div>

        <ControleDeslizante
          valor={form.nivel_minimo}
          onChange={(v) => setForm({ ...form, nivel_minimo: v })}
          min={1}
          max={5}
          rotulo="Nível mínimo exigido"
          sufixo=""
          marcos={[1, 2, 3, 4, 5]}
        />
        <p className="text-2xs text-fg-muted">
          N{form.nivel_minimo} — {nivelLegenda().find((n) => n.nivel === form.nivel_minimo)?.nome}
        </p>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-fg">Capacidades requeridas ({numero(selecionadas.length)})</h4>
            <Entrada value={buscaSkill} onChange={(e) => setBuscaSkill(e.target.value)} placeholder="Filtrar capacidades..." className="h-8 w-56 text-xs" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selecionadas.map((id) => {
              const s = (skills.data || []).find((x) => x.id === id);
              return (
                <Chip key={id} cor={s?.cor || "#F59E0B"} removivel onRemover={() => setSelecionadas(selecionadas.filter((x) => x !== id))}>
                  {s?.nome || "Capacidade " + id}
                </Chip>
              );
            })}
            {selecionadas.length === 0 && <span className="text-2xs text-fg-subtle">Nenhuma capacidade selecionada.</span>}
          </div>
          <div className="mt-2 max-h-56 overflow-y-auto rounded-sgp border border-border bg-surface-2 p-2 scroll-thin">
            <div className="flex flex-wrap gap-1.5">
              {filtradas.slice(0, 80).map((s) => {
                const marcada = selecionadas.indexOf(s.id) >= 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelecionadas(marcada ? selecionadas.filter((x) => x !== s.id) : selecionadas.concat([s.id]))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium transition-all",
                      marcada ? "border-brand bg-brand-soft/50 text-brand" : "border-border bg-surface text-fg-muted hover:border-border-strong"
                    )}
                  >
                    {marcada && <Check className="size-3" aria-hidden />}
                    {s.nome}
                  </button>
                );
              })}
              {filtradas.length === 0 && <span className="text-2xs text-fg-subtle">Nenhuma capacidade encontrada.</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface-2 p-3">
          {editando ? (
            <Interruptor
              ativo={ativa}
              onChange={setAtiva}
              rotulo="Oportunidade ativa"
              descricao="Desligue para encerrar a vaga e tirá-la do marketplace interno."
            />
          ) : (
            <span className="text-2xs text-fg-muted">A oportunidade é publicada como ativa e fica visível imediatamente no marketplace interno.</span>
          )}
          <EscalaCores rotulos={["1", "2", "3", "4", "5"]} cores={["#334155", "#0369a1", "#0891b2", "#059669", "#7c3aed"]} titulo="Níveis" />
        </div>
      </div>
    </Modal>
  );
}
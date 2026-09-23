import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle, Award, BarChart3, Boxes, CalendarClock, ChevronRight, ClipboardCheck, GraduationCap,
  Layers3, Paperclip, Pencil, Scale, Sparkles, Target, TrendingDown, TrendingUp, UserCheck, Users,
  UsersRound, Zap, type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraProgresso, Botao, CabecalhoPagina, Campo, CarregandoBloco,
  Chip, ControleDeslizante, Entrada, Esqueleto, Etiqueta, Interruptor, KPI, Modal, PainelLateral,
  Selecao, Tabela, Vazio, useAvisos, type ColunaTabela, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { GraficoBarras, GraficoLinha, type BarraItem, type Serie } from "@/components/charts";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, comAlfa, corNivel, nivelLegenda } from "@/lib/utils";
import { dataCurta, mesCurto, numero } from "@/lib/format";
import type { PerfilSkill, Skill } from "@/lib/types";

/* ==========================================================================
   Detalhe da capacidade: detentores, requisitos, critérios e previsão
   ========================================================================== */

const COR_CRITICIDADE: Record<string, string> = {
  BAIXA: "#10B981", MEDIA: "#0891B2", ALTA: "#F59E0B", ESTRATEGICA: "#DC2626",
};

const TOM_CRITICIDADE: Record<string, Tom> = {
  BAIXA: "success", MEDIA: "info", ALTA: "warning", ESTRATEGICA: "danger",
};

const ICONES: Record<string, LucideIcon> = {
  sparkles: Sparkles, network: Users, boxes: Boxes, target: Target, layers: Layers3,
  award: Award, graduation: GraduationCap, zap: Zap, scale: Scale,
};

function iconeDe(nome?: string): LucideIcon {
  return ICONES[(nome || "").toLowerCase()] || Sparkles;
}

interface RequisitoProjeto {
  id: number;
  project: number;
  project_nome: string;
  skill: number;
  nivel_minimo: number;
  nivel_desejado: number;
  quantidade: number;
  peso: number;
  obrigatorio: boolean;
  data_necessidade: string | null;
  observacao: string;
}

interface CriterioNivel {
  id: number;
  skill: number | null;
  skill_nome: string;
  nivel: number;
  nome: string;
  descricao: string;
  xp_minimo: number;
  meses_minimos: number;
  evidencias_minimas: number;
  exige_banca: boolean;
  exige_avaliacao_gestor: boolean;
  cor: string;
  ordem: number;
}

interface PrevisaoSkill {
  id: number;
  skill: number;
  periodo: string;
  demanda_estimada: number;
  oferta_estimada: number;
  gap: number;
  demanda_nivel_medio: number;
  situacao: string;
}

interface OportunidadeSkill {
  id: number;
  titulo: string;
  tipo: string;
  ativa: boolean;
  vagas: number;
  nivel_minimo: number;
}

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

interface RespostaDetalhe {
  skill: Skill;
  detentores: PerfilSkill[];
  projetos: RequisitoProjeto[];
  criterios: CriterioNivel[];
  oportunidades: OportunidadeSkill[];
  previsao: PrevisaoSkill[];
}

type AbaSkill = "detentores" | "projetos" | "criterios" | "previsao";

export default function SkillDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const [aba, setAba] = useState<AbaSkill>("detentores");
  const [painelEditar, setPainelEditar] = useState(false);
  const [painelCriterios, setPainelCriterios] = useState(false);
  const [modalMentores, setModalMentores] = useState(false);

  const detalhe = useConsulta<RespostaDetalhe>(
    ["skill-detalhe", id],
    id ? "/capacidades/skills/" + id + "/detalhe/" : null
  );

  const skill = detalhe.data?.skill;
  const detentores = detalhe.data?.detentores || [];
  const projetos = detalhe.data?.projetos || [];
  const criterios = detalhe.data?.criterios || [];
  const previsao = detalhe.data?.previsao || [];

  const indicadores = useMemo(() => {
    const niveis = detentores.map((d) => d.nivel_atual || 0);
    const media = niveis.length ? niveis.reduce((a, b) => a + b, 0) / niveis.length : 0;
    const validados = detentores.filter((d) => (d.nivel_validado || 0) > 0).length;
    const xpTotal = detentores.reduce((a, d) => a + (d.xp_acumulado || 0), 0);
    const atrasados = detentores.filter((d) => (d.dias_sem_uso || 0) > 365).length;
    return { media, validados, xpTotal, atrasados, total: detentores.length };
  }, [detentores]);

  const cor = skill ? (COR_CRITICIDADE[skill.criticidade] || skill.cor || "#6366F1") : "#6366F1";

  if (detalhe.isLoading) {
    return (
      <div className="space-y-4">
        <Esqueleto linhas={2} />
        <CarregandoBloco rotulo="Carregando capacidade..." />
      </div>
    );
  }

  if (detalhe.isError || !skill) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina
          titulo="Capacidade"
          icone={Boxes}
          migalhas={[{ rotulo: "Capacidades", onClick: () => navegar("/capacidades") }, { rotulo: "Detalhe" }]}
        />
        <Alerta tom="danger" titulo="Não foi possível carregar a capacidade">
          {detalhe.isError ? mensagemErro(detalhe.error) : "Capacidade não encontrada."}
        </Alerta>
        <Botao variante="secundario" onClick={() => navegar("/capacidades")}>Voltar ao catálogo</Botao>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo={skill.nome}
        subtitulo={skill.categoria_nome || "Sem categoria"}
        icone={iconeDe(skill.icone)}
        cor={cor}
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Capacidades", onClick: () => navegar("/capacidades") },
          { rotulo: skill.nome },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={UsersRound} onClick={() => setModalMentores(true)}>Sugerir mentores</Botao>
            <Botao variante="secundario" icone={Scale} onClick={() => setPainelCriterios(true)}>Ajustar critérios</Botao>
            <Botao variante="primario" icone={Pencil} onClick={() => setPainelEditar(true)}>Editar capacidade</Botao>
          </>
        }
        filhos={
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <Etiqueta tom={TOM_CRITICIDADE[skill.criticidade] || "neutral"} icone={AlertTriangle}>{skill.criticidade_rotulo || skill.criticidade}</Etiqueta>
              <Etiqueta tom="info" icone={Layers3}>{skill.tipo_rotulo || skill.tipo}</Etiqueta>
              <Etiqueta tom={skill.status === "ATIVA" ? "success" : "neutral"}>{skill.status_rotulo || skill.status}</Etiqueta>
              {skill.framework_origem && <Etiqueta tom="brand">{skill.framework_origem}</Etiqueta>}
              {skill.codigo_externo && <Etiqueta tom="neutral">{skill.codigo_externo}</Etiqueta>}
              {skill.parent_nome && <Etiqueta tom="neutral">Deriva de {skill.parent_nome}</Etiqueta>}
              {skill.substituivel ? <Etiqueta tom="neutral">Substituível</Etiqueta> : <Etiqueta tom="warning">Não substituível</Etiqueta>}
              <Etiqueta tom="brand">Peso estratégico {numero(skill.peso_estrategico, 2)}</Etiqueta>
            </div>
            {skill.descricao && <p className="max-w-4xl text-xs text-fg-muted">{skill.descricao}</p>}
            {(skill.sinonimos || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Sinônimos</span>
                {skill.sinonimos.map((s) => (<Chip key={s} cor="#64748B">{s}</Chip>))}
              </div>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI rotulo="Detentores (nível ≥ 3)" valor={numero(skill.total_detentores)} icone={Users} cor="#2563EB" subrotulo={numero(indicadores.total) + " perfis registrados"} compacto />
        <KPI rotulo="Nível médio" valor={numero(skill.nivel_medio, 2)} icone={TrendingUp} cor="#059669" subrotulo={"média dos detentores " + numero(indicadores.media, 2)} compacto />
        <KPI rotulo="Bus factor" valor={numero(skill.bus_factor)} icone={AlertTriangle} cor={skill.bus_factor <= 1 ? "#DC2626" : "#0891B2"} subrotulo="especialistas nível ≥ 4" compacto />
        <KPI rotulo="Projetos que exigem" valor={numero(projetos.length)} icone={Target} cor="#D97706" subrotulo={numero(projetos.filter((p) => p.obrigatorio).length) + " obrigatórios"} compacto />
      </div>

      {skill.em_risco && (
        <Alerta tom="danger" titulo="Capacidade em risco de dependência" icone={AlertTriangle}>
          Criticidade {skill.criticidade_rotulo || skill.criticidade} sustentada por {numero(skill.bus_factor)} especialista(s) de nível ≥ 4.
          Recomenda-se um plano de mentoria para formar novos detentores.
        </Alerta>
      )}

      <Abas
        valor={aba}
        onChange={(v) => setAba(v)}
        abas={[
          { valor: "detentores", rotulo: "Detentores", icone: Users, contagem: detentores.length },
          { valor: "projetos", rotulo: "Projetos", icone: Target, contagem: projetos.length },
          { valor: "criterios", rotulo: "Critérios", icone: ClipboardCheck, contagem: criterios.length },
          { valor: "previsao", rotulo: "Previsão", icone: TrendingUp, contagem: previsao.length },
        ]}
      />

      {aba === "detentores" && (
        <AbaDetentores detentores={detentores} indicadores={indicadores} aoAbrirPessoa={(userId) => navegar("/pessoas/" + userId)} />
      )}

      {aba === "projetos" && (
        <AbaProjetos projetos={projetos} aoAbrirProjeto={(projectId) => navegar("/projetos/" + projectId)} />
      )}

      {aba === "criterios" && <AbaCriterios criterios={criterios} cor={cor} aoAjustar={() => setPainelCriterios(true)} />}

      {aba === "previsao" && <AbaPrevisao previsao={previsao} cor={cor} />}

      <PainelEditarSkill aberto={painelEditar} onFechar={() => setPainelEditar(false)} skill={skill} aoConcluir={() => detalhe.refetch()} />

      <PainelCriterios
        aberto={painelCriterios}
        onFechar={() => setPainelCriterios(false)}
        skillId={skill.id}
        criterios={criterios}
        aoConcluir={() => detalhe.refetch()}
      />

      <ModalMentores aberto={modalMentores} onFechar={() => setModalMentores(false)} skillId={skill.id} skillNome={skill.nome} />
    </div>
  );
}

/* ==========================================================================
   Aba: detentores
   ========================================================================== */

function AbaDetentores({
  detentores, indicadores, aoAbrirPessoa,
}: {
  detentores: PerfilSkill[];
  indicadores: { media: number; validados: number; xpTotal: number; atrasados: number; total: number };
  aoAbrirPessoa: (userId: number) => void;
}) {
  const colunas: Array<ColunaTabela<PerfilSkill>> = [
    {
      chave: "pessoa",
      titulo: "Colaborador",
      largura: "260px",
      ordenavel: true,
      valorOrdenacao: (p) => p.user_detalhe?.nome || "",
      renderizar: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar nome={p.user_detalhe?.nome} cor={p.user_detalhe?.cor} iniciais={p.user_detalhe?.iniciais} url={p.user_detalhe?.avatar_display} tamanho="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-fg">{p.user_detalhe?.nome || "—"}</p>
            <p className="truncate text-2xs text-fg-muted">{p.user_detalhe?.cargo || p.user_detalhe?.area || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      chave: "nivel",
      titulo: "Nível",
      largura: "210px",
      ordenavel: true,
      valorOrdenacao: (p) => p.nivel_atual,
      renderizar: (p) => (
        <div className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-md text-2xs font-bold text-white" style={{ backgroundColor: corNivel(p.nivel_atual) }}>N{p.nivel_atual}</span>
          <div className="w-20">
            <BarraProgresso valor={(p.nivel_atual / 5) * 100} cor={corNivel(p.nivel_atual)} altura="sm" />
          </div>
          <span className="truncate text-2xs text-fg-muted">{p.nivel_rotulo || nivelLegenda().find((n) => n.nivel === p.nivel_atual)?.nome}</span>
        </div>
      ),
    },
    {
      chave: "consolidado",
      titulo: "Consolidado × validado",
      largura: "190px",
      ordenavel: true,
      valorOrdenacao: (p) => p.nivel_efetivo,
      renderizar: (p) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Etiqueta tom="info">consolidado {numero(p.nivel_efetivo, 2)}</Etiqueta>
          <Etiqueta tom={p.nivel_validado > 0 ? "success" : "neutral"}>{p.nivel_validado > 0 ? "validado N" + p.nivel_validado : "não validado"}</Etiqueta>
        </div>
      ),
    },
    {
      chave: "xp",
      titulo: "XP",
      largura: "150px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (p) => p.xp_acumulado,
      renderizar: (p) => (
        <div>
          <p className="text-xs font-semibold tabular-nums text-fg">{numero(p.xp_acumulado)}</p>
          <p className="text-2xs text-fg-muted">{numero(p.xp_para_proximo_nivel)} p/ o próximo nível</p>
        </div>
      ),
    },
    {
      chave: "status",
      titulo: "Status",
      largura: "150px",
      renderizar: (p) => (
        <div className="flex flex-col gap-1">
          <Etiqueta tom={p.status === "ATIVA" ? "success" : p.status === "ENFERRUJADA" ? "warning" : p.status === "EM_DESENVOLVIMENTO" ? "info" : "neutral"}>
            {p.status_rotulo || p.status}
          </Etiqueta>
          {p.dias_sem_uso !== null && p.dias_sem_uso !== undefined && (
            <span className={cn("text-2xs", p.dias_sem_uso > 365 ? "text-danger" : "text-fg-subtle")}>{numero(p.dias_sem_uso)} dias sem uso</span>
          )}
        </div>
      ),
    },
    {
      chave: "evidencias",
      titulo: "Evidências",
      largura: "150px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (p) => p.total_evidencias,
      renderizar: (p) => (
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-fg">
            <Paperclip className="size-3.5 text-fg-muted" aria-hidden />{numero(p.total_evidencias)}
          </span>
          <span className="text-2xs text-fg-subtle">{numero(p.total_avaliacoes)} aval. · {numero(p.total_endossos)} end.</span>
        </div>
      ),
    },
    {
      chave: "gap",
      titulo: "Gap para o desejado",
      largura: "140px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (p) => p.gap,
      renderizar: (p) => (
        <Etiqueta tom={p.gap > 0 ? "warning" : "success"}>{p.gap > 0 ? "faltam " + numero(p.gap) + " nível(is)" : "meta atingida"}</Etiqueta>
      ),
    },
    {
      chave: "acoes",
      titulo: "",
      largura: "90px",
      alinhar: "right",
      renderizar: (p) => <Botao tamanho="xs" variante="fantasma" icone={ChevronRight} onClick={() => aoAbrirPessoa(p.user)}>Perfil</Botao>,
    },
  ];

  if (!detentores.length) {
    return <Vazio icone={Users} titulo="Nenhum detentor registrado" descricao="Associe capacidades aos perfis dos colaboradores na matriz de skills." />;
  }

  return (
    <div className="space-y-3">
      <GradeCards colunas="4">
        <KPI rotulo="Detentores" valor={numero(indicadores.total)} icone={Users} cor="#2563EB" compacto />
        <KPI rotulo="Com nível validado" valor={numero(indicadores.validados)} icone={UserCheck} cor="#059669" compacto />
        <KPI rotulo="XP acumulado" valor={numero(indicadores.xpTotal)} icone={Zap} cor="#D97706" compacto />
        <KPI rotulo="Possível decay" valor={numero(indicadores.atrasados)} icone={TrendingDown} cor="#DC2626" subrotulo="mais de 365 dias sem uso" compacto />
      </GradeCards>

      <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
        <Tabela
          colunas={colunas}
          dados={detentores}
          compacta
          aoClicarLinha={(p) => aoAbrirPessoa(p.user)}
          destaqueLinha={(p) => (p.status === "ENFERRUJADA" ? "bg-warning-soft/25" : undefined)}
          vazio={<Vazio icone={Users} titulo="Nenhum detentor" />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 rounded-sgp-lg border border-border bg-surface p-3">
        <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Escala de nível</span>
        {nivelLegenda().map((n) => (
          <span key={n.nivel} className="inline-flex items-center gap-1.5 text-2xs text-fg-muted">
            <span className="grid size-5 place-items-center rounded-sm text-[10px] font-bold text-white" style={{ backgroundColor: corNivel(n.nivel) }}>{n.nivel}</span>
            {n.nome}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
   Aba: requisitos por projeto
   ========================================================================== */

function AbaProjetos({ projetos, aoAbrirProjeto }: { projetos: RequisitoProjeto[]; aoAbrirProjeto: (id: number) => void }) {
  if (!projetos.length) {
    return (
      <Vazio
        icone={Target}
        titulo="Nenhum projeto exige esta capacidade"
        descricao="Defina os requisitos de capacidade dos projetos para habilitar a análise de gap e o forecast."
      />
    );
  }

  const colunas: Array<ColunaTabela<RequisitoProjeto>> = [
    {
      chave: "projeto",
      titulo: "Projeto",
      largura: "280px",
      ordenavel: true,
      valorOrdenacao: (r) => r.project_nome || "",
      renderizar: (r) => <span className="text-xs font-semibold text-fg">{r.project_nome || "Projeto " + r.project}</span>,
    },
    {
      chave: "minimo",
      titulo: "Nível mínimo",
      largura: "140px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (r) => r.nivel_minimo,
      renderizar: (r) => (
        <span className="grid size-7 place-items-center rounded-md text-2xs font-bold text-white" style={{ backgroundColor: corNivel(r.nivel_minimo) }}>N{r.nivel_minimo}</span>
      ),
    },
    {
      chave: "desejado",
      titulo: "Nível desejado",
      largura: "140px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (r) => r.nivel_desejado,
      renderizar: (r) => (
        <span className="grid size-7 place-items-center rounded-md text-2xs font-bold" style={{ backgroundColor: comAlfa(corNivel(r.nivel_desejado), 0.18), color: corNivel(r.nivel_desejado) }}>N{r.nivel_desejado}</span>
      ),
    },
    { chave: "quantidade", titulo: "Pessoas", largura: "100px", alinhar: "center", ordenavel: true, valorOrdenacao: (r) => r.quantidade, renderizar: (r) => <span className="text-xs font-semibold tabular-nums text-fg">{numero(r.quantidade)}</span> },
    { chave: "peso", titulo: "Peso", largura: "100px", alinhar: "center", ordenavel: true, valorOrdenacao: (r) => r.peso, renderizar: (r) => <span className="text-xs tabular-nums text-fg-muted">{numero(r.peso, 2)}</span> },
    {
      chave: "obrigatorio",
      titulo: "Obrigatório",
      largura: "140px",
      alinhar: "center",
      renderizar: (r) => (r.obrigatorio ? <Etiqueta tom="danger" icone={AlertTriangle}>Obrigatório</Etiqueta> : <Etiqueta tom="neutral">Desejável</Etiqueta>),
    },
    {
      chave: "necessidade",
      titulo: "Necessário a partir de",
      largura: "160px",
      ordenavel: true,
      valorOrdenacao: (r) => r.data_necessidade || "",
      renderizar: (r) => <span className="text-xs text-fg-muted">{r.data_necessidade ? dataCurta(r.data_necessidade) : "—"}</span>,
    },
    {
      chave: "acoes",
      titulo: "",
      largura: "90px",
      alinhar: "right",
      renderizar: (r) => <Botao tamanho="xs" variante="fantasma" icone={ChevronRight} onClick={() => aoAbrirProjeto(r.project)}>Abrir</Botao>,
    },
  ];

  return (
    <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
      <Tabela colunas={colunas} dados={projetos} compacta vazio={<Vazio icone={Target} titulo="Nenhum requisito" />} />
    </div>
  );
}

/* ==========================================================================
   Aba: critérios de nível
   ========================================================================== */

function AbaCriterios({ criterios, cor, aoAjustar }: { criterios: CriterioNivel[]; cor: string; aoAjustar: () => void }) {
  if (!criterios.length) {
    return (
      <Vazio
        icone={ClipboardCheck}
        titulo="Sem critérios objetivos cadastrados"
        descricao="Cadastre os critérios de cada nível (XP, tempo, evidências, banca) para automatizar as sugestões de promoção."
        acao={<Botao variante="primario" icone={Scale} onClick={aoAjustar}>Definir critérios</Botao>}
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">Critérios avaliados automaticamente na sugestão de promoção (RF-57).</p>
        <Botao variante="secundario" tamanho="sm" icone={Scale} onClick={aoAjustar}>Ajustar critérios</Botao>
      </div>
      <GradeCards colunas="3">
        {criterios.map((c) => (
          <div key={c.id} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="flex items-start gap-2">
              <span className="grid size-9 place-items-center rounded-sgp text-sm font-bold text-white" style={{ backgroundColor: c.cor || corNivel(c.nivel) }}>N{c.nivel}</span>
              <div>
                <p className="text-sm font-semibold text-fg">{c.nome || "Nível " + c.nivel}</p>
                <p className="text-2xs text-fg-muted">{c.skill ? "Critério específico desta capacidade" : "Regra geral do catálogo"}</p>
              </div>
            </div>
            {c.descricao && <p className="mt-2 text-xs text-fg-muted">{c.descricao}</p>}
            <ul className="mt-3 space-y-1.5">
              <li className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-fg-muted"><Zap className="size-3.5" aria-hidden />XP mínimo</span>
                <span className="font-semibold tabular-nums text-fg">{numero(c.xp_minimo)}</span>
              </li>
              <li className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-fg-muted"><CalendarClock className="size-3.5" aria-hidden />Meses mínimos no nível</span>
                <span className="font-semibold tabular-nums text-fg">{numero(c.meses_minimos)}</span>
              </li>
              <li className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-fg-muted"><Paperclip className="size-3.5" aria-hidden />Evidências válidas</span>
                <span className="font-semibold tabular-nums text-fg">{numero(c.evidencias_minimas)}</span>
              </li>
              <li className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-fg-muted"><Award className="size-3.5" aria-hidden />Banca / mentor</span>
                <Etiqueta tom={c.exige_banca ? "warning" : "neutral"}>{c.exige_banca ? "Exigida" : "Dispensada"}</Etiqueta>
              </li>
              <li className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 text-fg-muted"><UserCheck className="size-3.5" aria-hidden />Avaliação do gestor</span>
                <Etiqueta tom={c.exige_avaliacao_gestor ? "info" : "neutral"}>{c.exige_avaliacao_gestor ? "Exigida" : "Dispensada"}</Etiqueta>
              </li>
            </ul>
          </div>
        ))}
      </GradeCards>
      <p className="text-2xs text-fg-subtle">Cor de referência da capacidade: <span style={{ color: cor }}>{cor}</span></p>
    </div>
  );
}

/* ==========================================================================
   Aba: previsão de demanda × oferta
   ========================================================================== */

function AbaPrevisao({ previsao, cor }: { previsao: PrevisaoSkill[]; cor: string }) {
  if (!previsao.length) {
    return (
      <Vazio
        icone={TrendingUp}
        titulo="Sem previsão calculada"
        descricao="Execute o forecast de capacidade para projetar demanda e oferta desta capacidade."
      />
    );
  }

  const ordenada = [...previsao].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const rotulos = ordenada.map((p) => mesCurto(p.periodo));
  const series: Serie[] = [
    { nome: "Demanda (FTE)", cor: "#DC2626", dados: ordenada.map((p) => p.demanda_estimada), area: true },
    { nome: "Oferta (FTE)", cor: "#059669", dados: ordenada.map((p) => p.oferta_estimada) },
    { nome: "Gap", cor: "#F59E0B", dados: ordenada.map((p) => p.gap), tracejada: true },
  ];
  const barras: BarraItem[] = ordenada.map((p) => ({
    rotulo: mesCurto(p.periodo),
    valor: p.demanda_estimada,
    comparativo: p.oferta_estimada,
    cor: p.situacao === "ESCASSEZ" ? "#DC2626" : p.situacao === "OCIOSIDADE" ? "#0891B2" : "#059669",
  }));
  const gapTotal = ordenada.reduce((a, p) => a + p.gap, 0);
  const mesesEscassez = ordenada.filter((p) => p.situacao === "ESCASSEZ").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI rotulo="Gap acumulado" valor={numero(gapTotal, 2)} icone={gapTotal > 0 ? TrendingUp : TrendingDown} cor={gapTotal > 0 ? "#DC2626" : "#059669"} subrotulo="FTE no horizonte" compacto />
        <KPI rotulo="Meses em escassez" valor={numero(mesesEscassez)} icone={AlertTriangle} cor="#D97706" subrotulo={"de " + numero(ordenada.length) + " períodos"} compacto />
        <KPI rotulo="Pico de demanda" valor={numero(Math.max(...ordenada.map((p) => p.demanda_estimada)), 2)} icone={BarChart3} cor="#2563EB" subrotulo="FTE" compacto />
        <KPI rotulo="Oferta atual" valor={numero(ordenada[0]?.oferta_estimada || 0, 2)} icone={Users} cor="#0891B2" subrotulo="FTE interno" compacto />
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <h3 className="mb-3 text-sm font-semibold text-fg">Demanda × oferta por período</h3>
        <GraficoLinha rotulos={rotulos} series={series} altura={260} mostrarArea mostrarLegenda formatarValor={(v) => numero(v, 2)} />
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <h3 className="mb-3 text-sm font-semibold text-fg">Comparativo por período (barra = demanda, fundo = oferta)</h3>
        <GraficoBarras itens={barras} horizontal formatarValor={(v) => numero(v, 2) + " FTE"} />
      </div>

      <div className="overflow-hidden rounded-sgp-lg border border-border bg-surface shadow-n1">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">Período</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">Demanda</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">Oferta</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">Gap</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">Nível médio demandado</th>
              <th className="px-3 py-2 text-center text-2xs font-semibold uppercase tracking-wide text-fg-muted">Situação</th>
            </tr>
          </thead>
          <tbody>
            {ordenada.map((p) => (
              <tr key={p.id} className="border-b border-border/70 last:border-0 hover:bg-surface-2">
                <td className="px-3 py-2 text-xs text-fg">{mesCurto(p.periodo)}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-fg">{numero(p.demanda_estimada, 2)}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-fg">{numero(p.oferta_estimada, 2)}</td>
                <td className={cn("px-3 py-2 text-right text-xs font-semibold tabular-nums", p.gap > 1 ? "text-danger" : p.gap < -1 ? "text-info" : "text-fg")}>{numero(p.gap, 2)}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-fg-muted">{numero(p.demanda_nivel_medio, 2)}</td>
                <td className="px-3 py-2 text-center">
                  <Etiqueta tom={p.situacao === "ESCASSEZ" ? "danger" : p.situacao === "OCIOSIDADE" ? "info" : "success"}>{p.situacao}</Etiqueta>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-2xs text-fg-subtle">Valores em FTE (equivalente a tempo integral). Cor da capacidade: <span style={{ color: cor }}>{cor}</span></p>
    </div>
  );
}

/* ==========================================================================
   Painel: editar capacidade
   ========================================================================== */

function PainelEditarSkill({
  aberto, onFechar, skill, aoConcluir,
}: {
  aberto: boolean; onFechar: () => void; skill: Skill; aoConcluir: () => void;
}) {
  const navegar = useNavigate();
  const [categoria, setCategoria] = useState(skill.categoria ? String(skill.categoria) : "");
  const [parent, setParent] = useState(skill.parent ? String(skill.parent) : "");
  const [form, setForm] = useState({
    nome: skill.nome,
    descricao: skill.descricao,
    tipo: skill.tipo,
    status: skill.status,
    criticidade: skill.criticidade,
    framework_origem: skill.framework_origem,
    codigo_externo: skill.codigo_externo,
    icone: skill.icone,
    cor: skill.cor,
    peso_estrategico: skill.peso_estrategico,
    substituivel: skill.substituivel,
    sinonimos: (skill.sinonimos || []).join(", "),
  });

  const salvar = useMutacao<Record<string, unknown>, Skill>({
    metodo: "patch",
    url: "/capacidades/skills/" + skill.id + "/",
    invalidar: [CHAVES.skills, ["skill-detalhe", String(skill.id)], CHAVES.arvoreSkills, CHAVES.grafoSkills],
    mensagemSucesso: "Capacidade atualizada",
    aoSucesso: () => { aoConcluir(); onFechar(); },
  });

  const categorias = useLista<{ id: number; nome: string; caminho?: string }>(CHAVES.categoriasSkill, aberto ? "/capacidades/categorias/" : null, { page_size: 200 });
  const todasSkills = useLista<Skill>(CHAVES.skills, aberto ? "/capacidades/skills/" : null, { page_size: 300 });

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      titulo="Editar capacidade"
      subtitulo={skill.nome}
      largura="md"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            carregando={salvar.isPending}
            onClick={() =>
              salvar.mutate({
                nome: form.nome,
                descricao: form.descricao,
                tipo: form.tipo,
                status: form.status,
                criticidade: form.criticidade,
                framework_origem: form.framework_origem,
                codigo_externo: form.codigo_externo,
                icone: form.icone,
                cor: form.cor,
                peso_estrategico: Number(form.peso_estrategico),
                substituivel: form.substituivel,
                sinonimos: form.sinonimos.split(",").map((s) => s.trim()).filter(Boolean),
                categoria: categoria ? Number(categoria) : null,
                parent: parent ? Number(parent) : null,
              })
            }
          >
            Salvar alterações
          </Botao>
        </>
      }
    >
      <div className="space-y-3">
        <Campo rotulo="Nome" obrigatorio htmlFor="ed-nome">
          <Entrada id="ed-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </Campo>
        <Campo rotulo="Descrição" htmlFor="ed-desc">
          <AreaTexto id="ed-desc" rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </Campo>
        <Campo rotulo="Categoria" htmlFor="ed-cat">
          <Selecao id="ed-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Sem categoria</option>
            {(categorias.data || []).map((c) => (<option key={c.id} value={c.id}>{c.caminho || c.nome}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Capacidade pai" htmlFor="ed-pai">
          <Selecao id="ed-pai" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">Nenhuma (raiz)</option>
            {(todasSkills.data || []).filter((s) => s.id !== skill.id).map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
          </Selecao>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Tipo" htmlFor="ed-tipo">
            <Selecao id="ed-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="TECNICA">Técnica</option>
              <option value="COMPORTAMENTAL">Comportamental</option>
              <option value="IDIOMA">Idioma</option>
              <option value="CERTIFICACAO">Certificação</option>
              <option value="DOMINIO">Domínio de negócio</option>
              <option value="FERRAMENTA">Ferramenta</option>
              <option value="METODOLOGIA">Metodologia</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Status" htmlFor="ed-status">
            <Selecao id="ed-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ATIVA">Ativa</option>
              <option value="EMERGENTE">Emergente</option>
              <option value="EM_DESCONTINUACAO">Em descontinuação</option>
              <option value="OBSOLETA">Obsoleta</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Criticidade" htmlFor="ed-crit">
            <Selecao id="ed-crit" value={form.criticidade} onChange={(e) => setForm({ ...form, criticidade: e.target.value })}>
              <option value="BAIXA">Baixa</option>
              <option value="MEDIA">Média</option>
              <option value="ALTA">Alta</option>
              <option value="ESTRATEGICA">Estratégica</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Peso estratégico" htmlFor="ed-peso">
            <Entrada id="ed-peso" type="number" step="0.1" min="0" value={form.peso_estrategico} onChange={(e) => setForm({ ...form, peso_estrategico: Number(e.target.value) })} />
          </Campo>
          <Campo rotulo="Framework" htmlFor="ed-fw">
            <Entrada id="ed-fw" value={form.framework_origem} onChange={(e) => setForm({ ...form, framework_origem: e.target.value })} />
          </Campo>
          <Campo rotulo="Código externo" htmlFor="ed-cod">
            <Entrada id="ed-cod" value={form.codigo_externo} onChange={(e) => setForm({ ...form, codigo_externo: e.target.value })} />
          </Campo>
        </div>
        <Campo rotulo="Sinônimos" htmlFor="ed-sin" dica="Separe por vírgula.">
          <Entrada id="ed-sin" value={form.sinonimos} onChange={(e) => setForm({ ...form, sinonimos: e.target.value })} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Ícone" htmlFor="ed-icone">
            <Selecao id="ed-icone" value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })}>
              <option value="sparkles">Brilho</option>
              <option value="network">Rede</option>
              <option value="boxes">Blocos</option>
              <option value="target">Alvo</option>
              <option value="layers">Camadas</option>
              <option value="award">Prêmio</option>
            </Selecao>
          </Campo>
          <Campo rotulo="Cor" htmlFor="ed-cor">
            <div className="flex items-center gap-2">
              <input id="ed-cor" type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-9 w-14 cursor-pointer rounded-sgp border border-border-strong bg-surface" />
              <Entrada value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </div>
          </Campo>
        </div>
        <Interruptor ativo={form.substituivel} onChange={(v) => setForm({ ...form, substituivel: v })} rotulo="Substituível por tecnologia similar" />
        <Botao variante="fantasma" icone={Layers3} larguraTotal onClick={() => navegar("/matriz-skills")}>Ver na matriz de capacidades</Botao>
      </div>
    </PainelLateral>
  );
}

/* ==========================================================================
   Painel: ajuste dos critérios de nível
   ========================================================================== */

interface AjusteCriterio {
  xp_minimo: number;
  meses_minimos: number;
  evidencias_minimas: number;
  exige_banca: boolean;
  exige_avaliacao_gestor: boolean;
  descricao: string;
}

function PainelCriterios({
  aberto, onFechar, skillId, criterios, aoConcluir,
}: {
  aberto: boolean; onFechar: () => void; skillId: number; criterios: CriterioNivel[]; aoConcluir: () => void;
}) {
  const existentes = useMemo(() => {
    const mapa: Record<number, CriterioNivel | undefined> = {};
    [1, 2, 3, 4, 5].forEach((n) => { mapa[n] = criterios.find((c) => c.nivel === n); });
    return mapa;
  }, [criterios]);

  const [ajustes, setAjustes] = useState<Record<number, AjusteCriterio>>({});

  const valorDe = (nivel: number): AjusteCriterio => {
    const salvo = ajustes[nivel];
    if (salvo) return salvo;
    const base = existentes[nivel];
    return {
      xp_minimo: base ? base.xp_minimo : 100 * nivel,
      meses_minimos: base ? base.meses_minimos : 6,
      evidencias_minimas: base ? base.evidencias_minimas : 2,
      exige_banca: base ? base.exige_banca : nivel >= 4,
      exige_avaliacao_gestor: base ? base.exige_avaliacao_gestor : true,
      descricao: base ? base.descricao : "",
    };
  };

  const salvar = useMutacao<{ id: number; corpo: Record<string, unknown> }, CriterioNivel>({
    metodo: "patch",
    url: (v) => "/capacidades/criterios-nivel/" + v.id + "/",
    invalidar: [["skill-detalhe", String(skillId)]],
    mensagemSucesso: "Critério atualizado",
    aoSucesso: () => aoConcluir(),
  });

  const criar = useMutacao<Record<string, unknown>, CriterioNivel>({
    url: "/capacidades/criterios-nivel/",
    invalidar: [["skill-detalhe", String(skillId)]],
    mensagemSucesso: "Critério criado para a capacidade",
    aoSucesso: () => aoConcluir(),
  });

  const aplicar = (nivel: number) => {
    const dados = valorDe(nivel);
    const corpo = {
      nivel,
      xp_minimo: Number(dados.xp_minimo),
      meses_minimos: Number(dados.meses_minimos),
      evidencias_minimas: Number(dados.evidencias_minimas),
      exige_banca: dados.exige_banca,
      exige_avaliacao_gestor: dados.exige_avaliacao_gestor,
      descricao: dados.descricao,
    };
    const existente = existentes[nivel];
    if (existente) salvar.mutate({ id: existente.id, corpo });
    else criar.mutate({ ...corpo, skill: skillId });
  };

  const ajustarExigencia = (nivel: number, fator: number) => {
    const atual = valorDe(nivel);
    setAjustes({
      ...ajustes,
      [nivel]: {
        ...atual,
        xp_minimo: Math.max(0, Math.round(atual.xp_minimo * fator)),
        meses_minimos: Math.max(0, Math.round(atual.meses_minimos * (fator > 1 ? 1.25 : 0.8))),
        evidencias_minimas: Math.max(0, Math.round(atual.evidencias_minimas * (fator > 1 ? 1.5 : 0.7))),
      },
    });
  };

  return (
    <PainelLateral
      aberto={aberto}
      onFechar={onFechar}
      titulo="Critérios objetivos de nível"
      subtitulo="Promover ou rebaixar a exigência de cada nível (RF-47 · RF-57)"
      largura="lg"
      rodape={<Botao variante="fantasma" onClick={onFechar}>Fechar</Botao>}
    >
      <div className="space-y-4">
        {!aberto ? null : (
          <>
            <Alerta tom="info" titulo="Como funciona">
              Os critérios alimentam o cálculo automático de elegibilidade. Ao atingir todos os critérios, o sistema cria uma
              sugestão de promoção que passa pela fila de validação.
            </Alerta>

            {[1, 2, 3, 4, 5].map((nivel) => {
              const dados = valorDe(nivel);
              const existente = existentes[nivel];
              return (
                <div key={nivel} className="rounded-sgp-lg border border-border bg-surface p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-sgp text-xs font-bold text-white" style={{ backgroundColor: corNivel(nivel) }}>N{nivel}</span>
                      <div>
                        <p className="text-sm font-semibold text-fg">{nivelLegenda().find((n) => n.nivel === nivel)?.nome}</p>
                        <p className="text-2xs text-fg-muted">{existente ? "Critério específico cadastrado" : "Usando regra geral do catálogo"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Botao tamanho="xs" variante="fantasma" icone={TrendingUp} onClick={() => ajustarExigencia(nivel, 1.2)}>Promover exigência</Botao>
                      <Botao tamanho="xs" variante="fantasma" icone={TrendingDown} onClick={() => ajustarExigencia(nivel, 0.8)}>Rebaixar</Botao>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Campo rotulo="XP mínimo" htmlFor={"crit-xp-" + nivel}>
                      <Entrada id={"crit-xp-" + nivel} type="number" min="0" value={dados.xp_minimo} onChange={(e) => setAjustes({ ...ajustes, [nivel]: { ...dados, xp_minimo: Number(e.target.value) } })} />
                    </Campo>
                    <Campo rotulo="Meses mínimos" htmlFor={"crit-meses-" + nivel}>
                      <Entrada id={"crit-meses-" + nivel} type="number" min="0" value={dados.meses_minimos} onChange={(e) => setAjustes({ ...ajustes, [nivel]: { ...dados, meses_minimos: Number(e.target.value) } })} />
                    </Campo>
                    <Campo rotulo="Evidências válidas" htmlFor={"crit-evid-" + nivel}>
                      <Entrada id={"crit-evid-" + nivel} type="number" min="0" value={dados.evidencias_minimas} onChange={(e) => setAjustes({ ...ajustes, [nivel]: { ...dados, evidencias_minimas: Number(e.target.value) } })} />
                    </Campo>
                  </div>

                  <div className="mt-3 space-y-2">
                    <ControleDeslizante
                      valor={dados.xp_minimo}
                      onChange={(v) => setAjustes({ ...ajustes, [nivel]: { ...dados, xp_minimo: v } })}
                      min={0}
                      max={1200}
                      passo={25}
                      rotulo="XP mínimo acumulado"
                      sufixo=" xp"
                      cor={corNivel(nivel)}
                      marcos={[0, 300, 600, 900, 1200]}
                    />
                    <div className="flex flex-wrap gap-4">
                      <Interruptor ativo={dados.exige_banca} onChange={(v) => setAjustes({ ...ajustes, [nivel]: { ...dados, exige_banca: v } })} rotulo="Exige banca/mentor" tamanho="sm" />
                      <Interruptor ativo={dados.exige_avaliacao_gestor} onChange={(v) => setAjustes({ ...ajustes, [nivel]: { ...dados, exige_avaliacao_gestor: v } })} rotulo="Exige avaliação do gestor" tamanho="sm" />
                    </div>
                    <Campo rotulo="Descrição dos critérios" htmlFor={"crit-desc-" + nivel}>
                      <Entrada
                        id={"crit-desc-" + nivel}
                        value={dados.descricao}
                        placeholder="Ex.: referência técnica reconhecida, atua como mentor."
                        onChange={(e) => setAjustes({ ...ajustes, [nivel]: { ...dados, descricao: e.target.value } })}
                      />
                    </Campo>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Botao tamanho="sm" variante={existente ? "secundario" : "primario"} carregando={salvar.isPending || criar.isPending} onClick={() => aplicar(nivel)}>
                      {existente ? "Salvar critério" : "Criar critério do nível " + nivel}
                    </Botao>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </PainelLateral>
  );
}

/* ==========================================================================
   Modal: sugestão de mentores
   ========================================================================== */

function ModalMentores({ aberto, onFechar, skillId, skillNome }: { aberto: boolean; onFechar: () => void; skillId: number; skillNome: string }) {
  const mentores = useConsulta<{ skill_id: number; mentores: Mentor[] }>(
    ["mentores-sugeridos", skillId],
    aberto ? "/capacidades/mentorias/sugerir/" : null,
    { skill: skillId }
  );
  const usuarios = useLista<{ id: number; nome: string; cargo: string }>(CHAVES.usuarios, aberto ? "/usuarios/" : null, { ativo: true, page_size: 300 });

  const [mentor, setMentor] = useState("");
  const [mentee, setMentee] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const criarMentoria = useMutacao<Record<string, unknown>, { id: number }>({
    url: "/capacidades/mentorias/",
    invalidar: [CHAVES.mentorias],
    mensagemSucesso: "Mentoria proposta com sucesso",
    aoSucesso: () => { setMentor(""); setMentee(""); setObjetivo(""); onFechar(); },
  });

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Sugerir mentores"
      subtitulo={"Especialistas nível 4–5 disponíveis para " + skillNome}
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Fechar</Botao>
          <Botao
            variante="primario"
            icone={GraduationCap}
            carregando={criarMentoria.isPending}
            disabled={!mentor || !mentee}
            onClick={() => criarMentoria.mutate({ mentor: Number(mentor), mentee: Number(mentee), skill: skillId, objetivo, status: "PROPOSTA" })}
          >
            Propor mentoria
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        {mentores.isLoading && <CarregandoBloco rotulo="Buscando mentores disponíveis..." />}
        {mentores.isError && <Alerta tom="danger" titulo="Não foi possível buscar mentores">{mensagemErro(mentores.error)}</Alerta>}
        {mentores.data && mentores.data.mentores.length === 0 && (
          <Vazio
            icone={UsersRound}
            titulo="Nenhum mentor disponível"
            descricao="Não há especialistas nível 4–5 com disponibilidade para mentoria marcada nesta capacidade."
          />
        )}
        {mentores.data && mentores.data.mentores.length > 0 && (
          <div className="space-y-2">
            {mentores.data.mentores.map((m) => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => setMentor(String(m.user_id))}
                className={cn(
                  "flex w-full flex-wrap items-center gap-3 rounded-sgp-lg border bg-surface p-3 text-left transition-all",
                  mentor === String(m.user_id) ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-border-strong"
                )}
              >
                <Avatar nome={m.nome} cor={m.cor} iniciais={m.iniciais} tamanho="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{m.nome}</p>
                  <p className="truncate text-2xs text-fg-muted">{m.cargo}{m.area ? " · " + m.area : ""}</p>
                  <p className="mt-0.5 text-2xs text-fg-subtle">{m.justificativa}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Etiqueta tom="success">Nível {m.nivel}</Etiqueta>
                  <span className="text-2xs text-fg-muted">{numero(m.disponibilidade, 0)}% livre · {numero(m.mentorias_ativas)} mentoria(s)</span>
                  <span className="text-2xs font-semibold text-brand">score {numero(m.score, 2)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="rounded-sgp-lg border border-border bg-surface-2 p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Dados da mentoria</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Mentor selecionado" obrigatorio htmlFor="men-mentor">
              <Selecao id="men-mentor" value={mentor} onChange={(e) => setMentor(e.target.value)}>
                <option value="">Selecione o mentor</option>
                {(mentores.data?.mentores || []).map((m) => (<option key={m.user_id} value={m.user_id}>{m.nome} — nível {m.nivel}</option>))}
              </Selecao>
            </Campo>
            <Campo rotulo="Mentorado" obrigatorio htmlFor="men-mentee">
              <Selecao id="men-mentee" value={mentee} onChange={(e) => setMentee(e.target.value)}>
                <option value="">Selecione o colaborador</option>
                {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>))}
              </Selecao>
            </Campo>
            <Campo rotulo="Objetivo da mentoria" htmlFor="men-obj" className="sm:col-span-2">
              <Entrada id="men-obj" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: elevar para nível 4 em 6 meses com prática supervisionada." />
            </Campo>
          </div>
        </div>
      </div>
    </Modal>
  );
}
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Check, FileText, GraduationCap, Layers3, Network, Plus, Repeat, ShieldAlert,
  Sparkles, Target, UserPlus, Users, Zap, type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, Botao, CabecalhoPagina, Campo, CarregandoBloco, Chip, Entrada,
  Etiqueta, KPI, Modal, PainelLateral, PilhaAvatares, Selecao, Vazio, useAvisos, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { cn, comAlfa, corPorValor } from "@/lib/utils";
import { hojeISO, numero, percentual, somarDias } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { AcaoPDI, PDI, PerfilSkill } from "@/lib/types";

/* ==========================================================================
   Bus factor: capacidades críticas sustentadas por poucas pessoas (RF-82)
   ========================================================================== */

const COR_CRITICIDADE: Record<string, string> = {
  BAIXA: "#10B981", MEDIA: "#0891B2", ALTA: "#F59E0B", ESTRATEGICA: "#DC2626",
};

const PESO_CRITICIDADE: Record<string, number> = {
  ESTRATEGICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1,
};

const TOM_CRITICIDADE: Record<string, Tom> = {
  BAIXA: "success", MEDIA: "info", ALTA: "warning", ESTRATEGICA: "danger",
};

const ICONES_ACAO: Record<string, LucideIcon> = {
  MENTORAR: Users, DOCUMENTAR: FileText, ROTACIONAR: Repeat, CONTRATAR: UserPlus, TREINAR: GraduationCap,
};

interface Detentor {
  user_id: number;
  nome: string;
  nivel: number;
  cor: string;
}

interface AcaoSugerida {
  tipo: string;
  rotulo: string;
  icone: string;
  cor: string;
  detalhe: string;
}

interface AlertaBusFactor {
  skill_id: number;
  skill: string;
  cor: string;
  icone: string;
  criticidade: string;
  quantidade_detentores: number;
  total_projetos_dependentes: number;
  recomendacao: string;
  acoes_sugeridas: AcaoSugerida[];
  detentores: Detentor[];
}

interface RespostaBusFactor {
  alertas: AlertaBusFactor[];
  resumo: { total: number; sem_detentor: number; um_detentor: number };
}

/** Alerta persistido em /capacidades/bus-factor/ — o que a ação resolver grava. */
interface AlertaPersistido {
  id: number;
  skill: number;
  quantidade_detentores: number;
  total_projetos_dependentes: number;
  criticidade: string;
  recomendacao: string;
  acoes_sugeridas: AcaoSugerida[];
  resolvido: boolean;
  detectado_em: string;
}

interface RequisitoProjeto {
  id: number;
  project: number;
  project_nome: string;
  skill: number;
  nivel_minimo: number;
  quantidade: number;
  obrigatorio: boolean;
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

type AbaBus = "alertas" | "grafo";

export default function BusFactor() {
  const navegar = useNavigate();
  const { pode } = useAuth();
  const podeEditar = pode("capacidade.editar");
  const [aba, setAba] = useState<AbaBus>("alertas");
  const [criticidade, setCriticidade] = useState("");
  const [somenteSemEspecialista, setSomenteSemEspecialista] = useState(false);
  const [alertaGrafo, setAlertaGrafo] = useState<AlertaBusFactor | null>(null);
  const [alertaPlano, setAlertaPlano] = useState<AlertaBusFactor | null>(null);
  const [resolvendo, setResolvendo] = useState(0);

  const deteccao = useConsulta<RespostaBusFactor>(CHAVES.busFactor, "/capacidades/bus-factor-detect/", { salvar: 0 });
  const requisitos = useLista<RequisitoProjeto>(["requisitos-projeto"], "/capacidades/requisitos-projeto/", { page_size: 500 });
  const persistidos = useLista<AlertaPersistido>(["bus-factor-alertas"], "/capacidades/bus-factor/", { page_size: 500 });

  /* O alerta exibido vem da detecção, que é recalculada a cada consulta. O
     registro persistido é quem guarda a marca de resolvido e é ele que a ação
     resolver atualiza — daí o cruzamento por capacidade. */
  const situacaoPorSkill = useMemo(() => {
    const mapa: Record<number, { pendente: AlertaPersistido | null; resolvido: AlertaPersistido | null }> = {};
    (persistidos.data || []).forEach((registro) => {
      const atual = mapa[registro.skill] || { pendente: null, resolvido: null };
      if (registro.resolvido) atual.resolvido = registro;
      else atual.pendente = registro;
      mapa[registro.skill] = atual;
    });
    return mapa;
  }, [persistidos.data]);

  const registrar = useMutacao<Record<string, unknown>, AlertaPersistido>({
    url: "/capacidades/bus-factor/",
    invalidar: [["bus-factor-alertas"]],
  });

  const resolver = useMutacao<{ id: number }, AlertaPersistido>({
    url: (v) => "/capacidades/bus-factor/" + v.id + "/resolver/",
    invalidar: [["bus-factor-alertas"]],
    mensagemSucesso: "Alerta marcado como resolvido",
  });

  async function marcarResolvido(alerta: AlertaBusFactor) {
    setResolvendo(alerta.skill_id);
    try {
      let pendente = situacaoPorSkill[alerta.skill_id]?.pendente || null;
      if (!pendente) {
        /* A detecção é recalculada a cada consulta e não guarda o alerta; sem o
           registro persistido não existe id para a ação resolver. */
        try {
          pendente = await registrar.mutateAsync({
            skill: alerta.skill_id,
            quantidade_detentores: alerta.quantidade_detentores,
            total_projetos_dependentes: alerta.total_projetos_dependentes,
            criticidade: alerta.criticidade,
            recomendacao: alerta.recomendacao,
            acoes_sugeridas: alerta.acoes_sugeridas,
            resolvido: false,
          });
        } catch {
          /* o aviso de erro já é exibido pela própria mutação */
          return;
        }
      }
      if (!pendente) return;
      try {
        await resolver.mutateAsync({ id: pendente.id });
      } catch {
        /* o aviso de erro já é exibido pela própria mutação */
      }
    } finally {
      setResolvendo(0);
    }
  }

  const alertas = useMemo(() => {
    const lista = (deteccao.data?.alertas || []).filter((a) => {
      if (criticidade && a.criticidade !== criticidade) return false;
      if (somenteSemEspecialista && a.quantidade_detentores > 1) return false;
      return true;
    });
    return [...lista].sort((a, b) => {
      const peso = (PESO_CRITICIDADE[b.criticidade] || 0) - (PESO_CRITICIDADE[a.criticidade] || 0);
      if (peso !== 0) return peso;
      if (a.quantidade_detentores !== b.quantidade_detentores) return a.quantidade_detentores - b.quantidade_detentores;
      return b.total_projetos_dependentes - a.total_projetos_dependentes;
    });
  }, [deteccao.data, criticidade, somenteSemEspecialista]);

  const resumo = deteccao.data?.resumo || { total: 0, sem_detentor: 0, um_detentor: 0 };

  function estaResolvido(skillId: number) {
    const situacao = situacaoPorSkill[skillId];
    return Boolean(situacao && !situacao.pendente && situacao.resolvido);
  }

  const projetosPorSkill = useMemo(() => {
    const mapa: Record<number, RequisitoProjeto[]> = {};
    (requisitos.data || []).forEach((r) => {
      const atual = mapa[r.skill] || [];
      atual.push(r);
      mapa[r.skill] = atual;
    });
    return mapa;
  }, [requisitos.data]);

  const exposicao = useMemo(
    () => (deteccao.data?.alertas || []).reduce((a, x) => a + x.total_projetos_dependentes, 0),
    [deteccao.data]
  );

  const indiceRisco = useMemo(() => {
    const lista = deteccao.data?.alertas || [];
    if (!lista.length) return 0;
    const semEspecialista = lista.filter((a) => a.quantidade_detentores === 0).length;
    const umEspecialista = lista.filter((a) => a.quantidade_detentores === 1).length;
    return Math.min(100, Math.round(((semEspecialista * 2 + umEspecialista) / (lista.length * 2)) * 100));
  }, [deteccao.data]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Bus factor de capacidades"
        subtitulo="Capacidades críticas sustentadas por poucas pessoas — risco de parada total"
        icone={ShieldAlert}
        cor="#DC2626"
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Capacidades", onClick: () => navegar("/capacidades") },
          { rotulo: "Bus factor" },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={Target} onClick={() => navegar("/gap")}>Análise de gap</Botao>
            <Botao variante="primario" icone={Plus} onClick={() => setAlertaPlano(alertas[0] || null)} disabled={!alertas.length}>
              Registrar plano de mitigação
            </Botao>
          </>
        }
        filhos={
          <>
            <Abas
              valor={aba}
              onChange={(v) => setAba(v)}
              abas={[
                { valor: "alertas", rotulo: "Alertas", icone: AlertTriangle, contagem: alertas.length },
                { valor: "grafo", rotulo: "Grafo de dependência", icone: Network },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI rotulo="Capacidades em alerta" valor={numero(resumo.total)} icone={ShieldAlert} cor="#DC2626" compacto />
        <KPI rotulo="Sem especialista" valor={numero(resumo.sem_detentor)} icone={AlertTriangle} cor="#DC2626" subrotulo="nenhum detentor nível ≥ 4" compacto />
        <KPI rotulo="Com um especialista" valor={numero(resumo.um_detentor)} icone={Users} cor="#F59E0B" subrotulo="bus factor igual a 1" compacto />
        <KPI rotulo="Projetos expostos" valor={numero(exposicao)} icone={Target} cor="#2563EB" subrotulo="dependências diretas" compacto />
        <KPI rotulo="Índice de risco" valor={percentual(indiceRisco, 0)} icone={Zap} cor={corPorValor(1 - indiceRisco / 100)} subrotulo="concentração de conhecimento" compacto />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Criticidade</span>
          <select value={criticidade} onChange={(e) => setCriticidade(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todas</option>
            <option value="ESTRATEGICA">Estratégica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </label>
        <Chip cor="#DC2626" ativo={somenteSemEspecialista} onClick={() => setSomenteSemEspecialista(!somenteSemEspecialista)}>
          Apenas 0 ou 1 detentor
        </Chip>
        {(criticidade || somenteSemEspecialista) && (
          <Botao tamanho="xs" variante="fantasma" onClick={() => { setCriticidade(""); setSomenteSemEspecialista(false); }}>Limpar filtros</Botao>
        )}
        <span className="ml-auto text-2xs text-fg-muted">
          {numero(alertas.length)} de {numero(resumo.total)} alertas exibidos
        </span>
      </div>

      {deteccao.isLoading && <CarregandoBloco rotulo="Detectando concentração de conhecimento..." />}
      {deteccao.isError && <Alerta tom="danger" titulo="Não foi possível detectar o bus factor">{mensagemErro(deteccao.error)}</Alerta>}

      {aba === "alertas" && deteccao.data && (
        alertas.length === 0 ? (
          <Vazio
            icone={Check}
            titulo="Nenhuma capacidade em risco"
            descricao="Todas as capacidades críticas possuem um número saudável de especialistas nível 4 ou superior."
          />
        ) : (
          <GradeCards colunas="2">
            {alertas.map((a) => (
              <CartaoAlerta
                key={a.skill_id}
                alerta={a}
                projetos={(projetosPorSkill[a.skill_id] || []).slice(0, 4)}
                aoAbrirSkill={() => navegar("/capacidades/skills/" + a.skill_id)}
                aoVerGrafo={() => { setAlertaGrafo(a); setAba("grafo"); }}
                aoPlanejar={() => setAlertaPlano(a)}
                resolvido={estaResolvido(a.skill_id)}
                podeEditar={podeEditar}
                resolvendo={resolvendo === a.skill_id}
                aoResolver={() => marcarResolvido(a)}
              />
            ))}
          </GradeCards>
        )
      )}

      {aba === "grafo" && (
        deteccao.isLoading ? <CarregandoBloco rotulo="Montando o grafo de dependências..." /> : (
          <SecaoGrafo
            alertas={alertas.length ? alertas : (deteccao.data?.alertas || [])}
            selecionado={alertaGrafo || alertas[0] || null}
            projetosPorSkill={projetosPorSkill}
            aoSelecionar={setAlertaGrafo}
            aoAbrirSkill={(id) => navegar("/capacidades/skills/" + id)}
            aoPlanejar={setAlertaPlano}
          />
        )
      )}

      <ModalMitigacao alerta={alertaPlano} onFechar={() => setAlertaPlano(null)} aoConcluir={() => deteccao.refetch()} />
    </div>
  );
}

/* ==========================================================================
   Cartão de alerta
   ========================================================================== */

function CartaoAlerta({
  alerta, projetos, aoAbrirSkill, aoVerGrafo, aoPlanejar, resolvido, podeEditar, resolvendo, aoResolver,
}: {
  alerta: AlertaBusFactor;
  projetos: RequisitoProjeto[];
  aoAbrirSkill: () => void;
  aoVerGrafo: () => void;
  aoPlanejar: () => void;
  resolvido: boolean;
  podeEditar: boolean;
  resolvendo: boolean;
  aoResolver: () => void;
}) {
  const cor = COR_CRITICIDADE[alerta.criticidade] || "#DC2626";
  const critico = alerta.quantidade_detentores <= 1;
  const avatares = alerta.detentores.map((d) => ({ id: d.user_id, nome: d.nome, cor: d.cor, iniciais: undefined }));

  return (
    <div
      className={cn(
        "rounded-sgp-lg border bg-surface p-4 shadow-n1",
        resolvido ? "border-success/40 opacity-80" : critico ? "border-danger/50" : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-sgp-lg" style={{ backgroundColor: comAlfa(alerta.cor || cor, 0.14), color: alerta.cor || cor }}>
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={aoAbrirSkill} className="max-w-full truncate text-sm font-semibold text-fg hover:text-brand">{alerta.skill}</button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Etiqueta tom={TOM_CRITICIDADE[alerta.criticidade] || "neutral"}>Criticidade {alerta.criticidade}</Etiqueta>
            <Etiqueta tom="neutral" icone={Target}>{numero(alerta.total_projetos_dependentes)} projeto(s) dependente(s)</Etiqueta>
            {alerta.quantidade_detentores === 0 && <Etiqueta tom="danger" icone={AlertTriangle}>Sem especialista</Etiqueta>}
            {alerta.quantidade_detentores === 1 && <Etiqueta tom="warning" icone={AlertTriangle}>Bus factor 1</Etiqueta>}
            {resolvido && <Etiqueta tom="success" icone={Check}>Resolvido</Etiqueta>}
          </div>
        </div>
        <div className="shrink-0 text-center">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Detentores N4+</p>
          <p className={cn("text-2xl font-bold tabular-nums", critico ? "text-danger animate-pulso-alerta" : "text-fg")}>{numero(alerta.quantidade_detentores)}</p>
        </div>
      </div>

      <Alerta tom={critico ? "danger" : "warning"} className="mt-3">
        {alerta.recomendacao}
      </Alerta>

      <div className="mt-3">
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Especialistas atuais</p>
        {alerta.detentores.length === 0 ? (
          <p className="rounded-sgp border border-dashed border-danger/50 bg-danger-soft/25 p-2.5 text-2xs font-medium text-danger">
            Nenhum colaborador com nível 4 ou superior — não há especialista interno capaz de sustentar esta capacidade.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {alerta.detentores.map((d) => (
              <span key={d.user_id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-1">
                <Avatar nome={d.nome} cor={d.cor} tamanho="xs" />
                <span className="text-2xs font-medium text-fg">{d.nome}</span>
                <span className="text-2xs font-bold" style={{ color: corPorValor(d.nivel / 5) }}>N{d.nivel}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {projetos.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Projetos que exigem</p>
          <div className="flex flex-wrap gap-1.5">
            {projetos.map((p) => (
              <Chip key={p.id} cor={p.obrigatorio ? "#DC2626" : "#2563EB"}>
                {p.project_nome} · N{p.nivel_minimo}{p.obrigatorio ? " · obrigatório" : ""}
              </Chip>
            ))}
            {alerta.total_projetos_dependentes > projetos.length && (
              <Chip cor="#64748B">+{numero(alerta.total_projetos_dependentes - projetos.length)} outros</Chip>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Ações sugeridas</p>
        <div className="flex flex-wrap gap-1.5">
          {alerta.acoes_sugeridas.map((a) => {
            const Icone = ICONES_ACAO[a.tipo] || Zap;
            return (
              <span
                key={a.tipo}
                title={a.detalhe}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-semibold"
                style={{ backgroundColor: a.cor + "1f", borderColor: a.cor + "55", color: a.cor }}
              >
                <Icone className="size-3.5" aria-hidden />
                {a.rotulo}
              </span>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5">
        {resolvido && (
          <span className="mr-auto text-2xs text-fg-muted">Alerta marcado como resolvido.</span>
        )}
        <Botao tamanho="xs" variante="fantasma" icone={Network} onClick={aoVerGrafo}>Ver grafo</Botao>
        <Botao tamanho="xs" variante="secundario" icone={Layers3} onClick={aoAbrirSkill}>Detalhe da capacidade</Botao>
        <Botao tamanho="xs" variante="primario" icone={Plus} onClick={aoPlanejar}>Mitigar risco</Botao>
        {podeEditar && !resolvido && (
          <Botao tamanho="xs" variante="sucesso" icone={Check} carregando={resolvendo} onClick={aoResolver}>
            Marcar como resolvido
          </Botao>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Grafo de dependência da capacidade selecionada
   ========================================================================== */

function SecaoGrafo({
  alertas, selecionado, projetosPorSkill, aoSelecionar, aoAbrirSkill, aoPlanejar,
}: {
  alertas: AlertaBusFactor[];
  selecionado: AlertaBusFactor | null;
  projetosPorSkill: Record<number, RequisitoProjeto[]>;
  aoSelecionar: (a: AlertaBusFactor) => void;
  aoAbrirSkill: (id: number) => void;
  aoPlanejar: (a: AlertaBusFactor) => void;
}) {
  if (!alertas.length) {
    return <Vazio icone={Network} titulo="Nenhuma dependência crítica" descricao="Não há capacidades com concentração de conhecimento para exibir no grafo." />;
  }

  const alerta = selecionado || alertas[0];
  const projetos = (projetosPorSkill[alerta.skill_id] || []).slice(0, 8);
  const detentores = alerta.detentores;
  const largura = 920;
  const altura = 520;
  const cx = largura / 2;
  const cy = altura / 2;
  const cor = COR_CRITICIDADE[alerta.criticidade] || "#DC2626";

  const posicoesDetentores = detentores.map((d, i) => {
    const angulo = Math.PI * (0.55 + (i / Math.max(1, detentores.length)) * 0.9);
    return { ...d, x: cx - 260 * Math.cos(angulo), y: cy + 190 * Math.sin(angulo) - 60 };
  });

  const posicoesProjetos = projetos.map((p, i) => {
    const angulo = -Math.PI * (0.35 - (i / Math.max(1, projetos.length)) * 1.3);
    return { ...p, x: cx + 270 * Math.cos(angulo) + 40, y: cy + 200 * Math.sin(angulo) };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 rounded-sgp-lg border border-border bg-surface p-3">
        <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Capacidade analisada</span>
        {alertas.slice(0, 12).map((a) => (
          <Chip
            key={a.skill_id}
            cor={COR_CRITICIDADE[a.criticidade] || "#DC2626"}
            ativo={a.skill_id === alerta.skill_id}
            onClick={() => aoSelecionar(a)}
          >
            {a.skill} · {numero(a.quantidade_detentores)}
          </Chip>
        ))}
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div>
            <h3 className="text-sm font-semibold text-fg">{alerta.skill}</h3>
            <p className="text-2xs text-fg-muted">
              {numero(detentores.length)} especialista(s) nível ≥ 4 · {numero(alerta.total_projetos_dependentes)} projeto(s) dependente(s) · criticidade {alerta.criticidade}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Botao tamanho="xs" variante="secundario" icone={Layers3} onClick={() => aoAbrirSkill(alerta.skill_id)}>Abrir capacidade</Botao>
            <Botao tamanho="xs" variante="primario" icone={Plus} onClick={() => aoPlanejar(alerta)}>Mitigar risco</Botao>
          </div>
        </div>

        <div className="overflow-hidden rounded-b-sgp-lg bg-bg-alt" style={{ height: 520 }}>
          <svg width="100%" height="100%" viewBox={"0 0 " + largura + " " + altura} role="img" aria-label={"Grafo de dependencia da capacidade " + alerta.skill}>
            {posicoesDetentores.map((d) => (
              <line key={"h-" + d.user_id} x1={d.x} y1={d.y} x2={cx} y2={cy} stroke="#059669" strokeWidth={1.6} opacity={0.55} />
            ))}
            {posicoesProjetos.map((p) => (
              <line key={"p-" + p.id} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={p.obrigatorio ? "#DC2626" : "#2563EB"} strokeWidth={p.obrigatorio ? 2 : 1.2} strokeDasharray="5 4" opacity={0.6} />
            ))}

            <circle cx={cx} cy={cy} r={62} fill={comAlfa(cor, 0.16)} stroke={cor} strokeWidth={2.5} />
            <text x={cx} y={cy - 6} textAnchor="middle" className="fill-fg text-[13px] font-bold">
              {alerta.skill.length > 20 ? alerta.skill.slice(0, 19) + "…" : alerta.skill}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" className="fill-fg-muted text-[11px]">
              N4+ {numero(alerta.quantidade_detentores)}
            </text>
            <text x={cx} y={cy + 28} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              criticidade {alerta.criticidade}
            </text>

            <text x={cx - 300} y={30} className="fill-fg-muted text-[11px] font-semibold">Especialistas</text>
            {posicoesDetentores.map((d) => (
              <g key={"d-" + d.user_id}>
                <circle cx={d.x} cy={d.y} r={22} fill={d.cor || "#64748B"} stroke="var(--sgp-surface)" strokeWidth={2} />
                <text x={d.x} y={d.y + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">
                  {d.nome.split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase()}
                </text>
                <text x={d.x} y={d.y + 36} textAnchor="middle" className="fill-fg text-[10px]">
                  {d.nome.length > 16 ? d.nome.slice(0, 15) + "…" : d.nome}
                </text>
                <text x={d.x} y={d.y + 48} textAnchor="middle" className="fill-fg-subtle text-[9px]">nível {d.nivel}</text>
              </g>
            ))}

            {detentores.length === 0 && (
              <g>
                <rect x={cx - 330} y={cy - 30} width={200} height={62} rx={10} fill={comAlfa("#DC2626", 0.12)} stroke="#DC2626" strokeDasharray="4 3" />
                <text x={cx - 230} y={cy - 2} textAnchor="middle" className="fill-danger text-[11px] font-bold">Nenhum especialista</text>
                <text x={cx - 230} y={cy + 16} textAnchor="middle" className="fill-fg-muted text-[10px]">risco de parada total</text>
              </g>
            )}

            <text x={cx + 230} y={30} className="fill-fg-muted text-[11px] font-semibold">Projetos dependentes</text>
            {posicoesProjetos.map((p) => (
              <g key={"pr-" + p.id}>
                <rect x={p.x - 78} y={p.y - 20} width={156} height={40} rx={8} fill={comAlfa(p.obrigatorio ? "#DC2626" : "#2563EB", 0.12)} stroke={p.obrigatorio ? "#DC2626" : "#2563EB"} />
                <text x={p.x} y={p.y - 3} textAnchor="middle" className="fill-fg text-[10px] font-semibold">
                  {p.project_nome.length > 20 ? p.project_nome.slice(0, 19) + "…" : p.project_nome}
                </text>
                <text x={p.x} y={p.y + 12} textAnchor="middle" className="fill-fg-muted text-[9px]">
                  exige N{p.nivel_minimo} · {numero(p.quantidade)} pessoa(s){p.obrigatorio ? " · obrigatório" : ""}
                </text>
              </g>
            ))}

            {posicoesProjetos.length === 0 && (
              <g>
                <rect x={cx + 180} y={cy + 60} width={220} height={46} rx={10} fill={comAlfa("#64748B", 0.12)} stroke="#64748B" strokeDasharray="4 3" />
                <text x={cx + 290} y={cy + 88} textAnchor="middle" className="fill-fg-muted text-[10px]">Sem requisitos de projeto registrados</text>
              </g>
            )}
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2">
          <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted"><span className="h-0.5 w-5 rounded-full bg-success" />holder nível ≥ 4</span>
          <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted"><span className="h-0.5 w-5 rounded-full bg-info" style={{ borderTop: "2px dashed #2563EB" }} />projeto dependente</span>
          <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted"><span className="h-0.5 w-5 rounded-full bg-danger" style={{ borderTop: "2px dashed #DC2626" }} />requisito obrigatório</span>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Modal: plano de mitigação (mentoria + ações de PDI)
   ========================================================================== */

function ModalMitigacao({ alerta, onFechar, aoConcluir }: { alerta: AlertaBusFactor | null; onFechar: () => void; aoConcluir: () => void }) {
  const { sucesso, erro: avisarErro } = useAvisos();
  const skillId = alerta ? alerta.skill_id : 0;

  const [mentor, setMentor] = useState("");
  const [tipoAcao, setTipoAcao] = useState("MENTORIA");
  const [objetivo, setObjetivo] = useState("");
  const [prazo, setPrazo] = useState(somarDias(hojeISO(), 120));
  const [carga, setCarga] = useState(24);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [enviando, setEnviando] = useState(false);

  const mentores = useConsulta<{ skill_id: number; mentores: Mentor[] }>(
    ["mentores-sugeridos", skillId],
    alerta ? "/capacidades/mentorias/sugerir/" : null,
    { skill: skillId }
  );

  const perfis = useConsulta<PerfilSkill[] | { results: PerfilSkill[] }>(
    ["perfis-skill", skillId],
    alerta ? "/capacidades/perfis/" : null,
    { skill: skillId, page_size: 200 }
  );

  const candidatos = useMemo(() => {
    const bruto = perfis.data;
    if (!bruto) return [];
    const lista = Array.isArray(bruto) ? bruto : bruto.results;
    return lista
      .filter((p) => p.nivel_atual >= 2 && p.nivel_atual <= 3)
      .sort((a, b) => b.nivel_atual - a.nivel_atual);
  }, [perfis.data]);

  const criarMentoria = useMutacao<Record<string, unknown>, { id: number }>({
    url: "/capacidades/mentorias/",
    invalidar: [CHAVES.mentorias],
  });

  const gerarPdi = useMutacao<Record<string, unknown>, { pdi: PDI }>({
    url: "/capacidades/pdi/gerar/",
    invalidar: [CHAVES.pdis],
  });

  const criarAcao = useMutacao<Record<string, unknown>, AcaoPDI>({
    url: "/capacidades/pdi-acoes/",
    invalidar: [CHAVES.pdis],
  });

  const registrar = async () => {
    if (!alerta) return;
    if (!selecionados.length) {
      avisarErro("Selecione ao menos uma pessoa", "Escolha quem participará do plano de mitigação.");
      return;
    }
    setEnviando(true);
    let total = 0;
    try {
      for (const userId of selecionados) {
        if (mentor) {
          await criarMentoria.mutateAsync({
            mentor: Number(mentor),
            mentee: userId,
            skill: alerta.skill_id,
            objetivo: objetivo || "Formar novo detentor de " + alerta.skill,
            status: "PROPOSTA",
          });
          total += 1;
        }
        const planos = await api.getLista<PDI>("/capacidades/pdi/", { user: userId, page_size: 5 });
        const ativo = planos.find((p) => p.status === "ATIVO") || planos[0];
        let planoId = ativo ? ativo.id : null;
        if (!planoId) {
          const gerado = await gerarPdi.mutateAsync({
            user: userId,
            titulo: "Mitigação de bus factor — " + alerta.skill,
            objetivo: objetivo || "Formar sucessores para reduzir a dependência de " + alerta.skill,
            data_fim: prazo,
            limite: 2,
          });
          planoId = gerado && gerado.pdi ? gerado.pdi.id : null;
        }
        if (!planoId) continue;
        await criarAcao.mutateAsync({
          plan: planoId,
          tipo: tipoAcao,
          descricao: "Mitigar bus factor de " + alerta.skill + " (nível alvo N4)",
          skill: alerta.skill_id,
          nivel_alvo: 4,
          prazo,
          carga_horaria: carga,
          status: "PLANEJADA",
        });
        total += 1;
      }
      sucesso("Plano de mitigação registrado", numero(total) + " registro(s) criados para " + alerta.skill + ".");
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
      aberto={Boolean(alerta)}
      onFechar={onFechar}
      titulo="Registrar plano de mitigação"
      subtitulo={alerta ? alerta.skill + " · " + numero(alerta.quantidade_detentores) + " especialista(s) nível ≥ 4" : undefined}
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao variante="primario" icone={Plus} carregando={enviando} disabled={!selecionados.length} onClick={registrar}>
            Registrar plano para {numero(selecionados.length)} pessoa(s)
          </Botao>
        </>
      }
    >
      {alerta && (
        <div className="space-y-4">
          <Alerta tom="danger" titulo="Risco identificado" icone={AlertTriangle}>
            {alerta.recomendacao}
          </Alerta>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Mentor responsável" htmlFor="mt-mentor" dica="Especialistas nível 4–5 disponíveis para esta capacidade.">
              <Selecao id="mt-mentor" value={mentor} onChange={(e) => setMentor(e.target.value)}>
                <option value="">Sem mentoria formal</option>
                {(mentores.data?.mentores || []).map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.nome} — nível {m.nivel} ({numero(m.disponibilidade, 0)}% livre)</option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Tipo de ação de PDI" htmlFor="mt-tipo">
              <Selecao id="mt-tipo" value={tipoAcao} onChange={(e) => setTipoAcao(e.target.value)}>
                <option value="MENTORIA">Mentoria</option>
                <option value="CURSO">Curso / treinamento</option>
                <option value="PROJETO">Atuação em projeto crítico</option>
                <option value="PRATICA">Prática deliberada</option>
                <option value="JOB_ROTATION">Job rotation</option>
                <option value="COMUNIDADE">Comunidade de prática</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Prazo" htmlFor="mt-prazo">
              <Entrada id="mt-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </Campo>
            <Campo rotulo="Carga horária (h)" htmlFor="mt-carga">
              <Entrada id="mt-carga" type="number" min="0" value={carga} onChange={(e) => setCarga(Number(e.target.value))} />
            </Campo>
            <Campo rotulo="Objetivo" htmlFor="mt-obj" className="sm:col-span-2">
              <AreaTexto id="mt-obj" rows={2} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: formar dois sucessores nível 4 em seis meses" />
            </Campo>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold text-fg">Candidatos a sucessores (nível 2–3)</h4>
            {perfis.isLoading && <CarregandoBloco rotulo="Carregando perfis..." />}
            {!perfis.isLoading && candidatos.length === 0 && (
              <p className="rounded-sgp border border-border bg-surface-2 p-3 text-2xs text-fg-muted">
                Não há colaboradores de nível 2–3 nesta capacidade. Considere a ação de reforço externo ou job rotation.
              </p>
            )}
            <ul className="max-h-64 space-y-1.5 overflow-y-auto scroll-thin">
              {candidatos.map((p) => {
                const marcado = selecionados.indexOf(p.user) >= 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelecionados(marcado ? selecionados.filter((x) => x !== p.user) : selecionados.concat([p.user]))}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-sgp border p-2.5 text-left transition-all",
                        marcado ? "border-brand bg-brand-soft/30" : "border-border bg-surface hover:border-border-strong"
                      )}
                    >
                      <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", marcado ? "border-brand bg-brand text-brand-fg" : "border-border-strong")}>
                        {marcado && <Check className="size-3" aria-hidden />}
                      </span>
                      <Avatar nome={p.user_detalhe?.nome} cor={p.user_detalhe?.cor} iniciais={p.user_detalhe?.iniciais} tamanho="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-fg">{p.user_detalhe?.nome}</p>
                        <p className="truncate text-2xs text-fg-muted">
                          {p.user_detalhe?.cargo || p.user_detalhe?.area} · nível {p.nivel_atual} · {numero(p.xp_acumulado)} XP
                        </p>
                      </div>
                      <Etiqueta tom="info">N{p.nivel_atual} → N4</Etiqueta>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Ações sugeridas pela detecção</p>
            <div className="space-y-1">
              {alerta.acoes_sugeridas.map((a) => (
                <div key={a.tipo} className="flex items-start gap-2 text-2xs">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.cor }} />
                  <span className="text-fg-muted"><strong className="text-fg">{a.rotulo}:</strong> {a.detalhe}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
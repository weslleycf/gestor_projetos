import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Award, Check, CheckCircle2, Clock, Layers3, PartyPopper, ShieldCheck,
  Sparkles, ThumbsDown, ThumbsUp, TrendingUp, Trophy, UserCheck, X, XCircle, type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, Avatar, BarraProgresso, Botao, CabecalhoPagina, Campo, CarregandoBloco, Chip,
  ControleDeslizante, AreaTexto, Entrada, Etiqueta, KPI, Modal, Selecao, Vazio, useAvisos,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, comAlfa, corNivel, nivelLegenda } from "@/lib/utils";
import { dataRelativa, numero } from "@/lib/format";
import type { SugestaoPromocao } from "@/lib/types";

/* ==========================================================================
   Fila de validação de promoções (RF-57 · RF-58 · UC-07)
   ========================================================================== */

const ICONES_CRITERIO: Record<string, LucideIcon> = {
  zap: TrendingUp,
  "calendar-clock": Clock,
  paperclip: Layers3,
  "user-check": UserCheck,
  award: Award,
};

type AbaValidacao = "PENDENTE" | "APROVADA" | "REJEITADA";

interface RespostaValidacao {
  sugestao: SugestaoPromocao;
  perfil: unknown;
  level_up: boolean;
}

export default function Validacoes() {
  const navegar = useNavigate();
  const { sucesso } = useAvisos();
  const [aba, setAba] = useState<AbaValidacao>("PENDENTE");
  const [decisao, setDecisao] = useState<{ sugestao: SugestaoPromocao; aprovar: boolean } | null>(null);
  const [recemAprovadas, setRecemAprovadas] = useState<number[]>([]);

  const pendentes = useLista<SugestaoPromocao>(CHAVES.promocoes, "/capacidades/promocoes/", { status: "PENDENTE", page_size: 200 });
  const aprovadas = useLista<SugestaoPromocao>(CHAVES.promocoes, "/capacidades/promocoes/", { status: "APROVADA", page_size: 200 });
  const rejeitadas = useLista<SugestaoPromocao>(CHAVES.promocoes, "/capacidades/promocoes/", { status: "REJEITADA", page_size: 200 });

  const lista = aba === "PENDENTE" ? (pendentes.data || []) : aba === "APROVADA" ? (aprovadas.data || []) : (rejeitadas.data || []);
  const carregando = aba === "PENDENTE" ? pendentes.isLoading : aba === "APROVADA" ? aprovadas.isLoading : rejeitadas.isLoading;
  const erro = aba === "PENDENTE" ? pendentes.error : aba === "APROVADA" ? aprovadas.error : rejeitadas.error;

  const indicadores = useMemo(() => ({
    pendentes: (pendentes.data || []).length,
    aprovadas: (aprovadas.data || []).length,
    rejeitadas: (rejeitadas.data || []).length,
    elegiveis: (pendentes.data || []).filter((s) => s.criterios_atendidos.every((c) => c.atendido)).length,
  }), [pendentes.data, aprovadas.data, rejeitadas.data]);

  const recarregar = () => {
    pendentes.refetch();
    aprovadas.refetch();
    rejeitadas.refetch();
  };

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Validação de promoções"
        subtitulo="Aprovação humana obrigatória para cada mudança de nível (RF-58)"
        icone={ShieldCheck}
        cor="#059669"
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Capacidades", onClick: () => navegar("/capacidades") },
          { rotulo: "Validações" },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={Layers3} onClick={() => navegar("/matriz-skills")}>Matriz de capacidades</Botao>
            <Botao variante="secundario" icone={Trophy} onClick={() => navegar("/pdi")}>PDI e trilhas</Botao>
          </>
        }
        filhos={
          <>
            <Abas
              valor={aba}
              onChange={(v) => setAba(v)}
              abas={[
                { valor: "PENDENTE", rotulo: "Pendentes", icone: Clock, contagem: indicadores.pendentes },
                { valor: "APROVADA", rotulo: "Aprovadas", icone: CheckCircle2, contagem: indicadores.aprovadas },
                { valor: "REJEITADA", rotulo: "Rejeitadas", icone: XCircle, contagem: indicadores.rejeitadas },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI rotulo="Aguardando validação" valor={numero(indicadores.pendentes)} icone={Clock} cor="#D97706" subrotulo="fila de aprovação" compacto />
        <KPI rotulo="Elegíveis a todos os critérios" valor={numero(indicadores.elegiveis)} icone={CheckCircle2} cor="#059669" subrotulo="critérios 100% atendidos" compacto />
        <KPI rotulo="Aprovadas" valor={numero(indicadores.aprovadas)} icone={Trophy} cor="#2563EB" compacto />
        <KPI rotulo="Rejeitadas" valor={numero(indicadores.rejeitadas)} icone={XCircle} cor="#DC2626" compacto />
      </div>

      {carregando && <CarregandoBloco rotulo="Carregando a fila de validação..." />}
      {erro && <Alerta tom="danger" titulo="Não foi possível carregar as promoções">{mensagemErro(erro)}</Alerta>}

      {!carregando && !erro && lista.length === 0 && (
        aba === "PENDENTE" ? (
          <Vazio
            icone={PartyPopper}
            titulo="Nenhuma promoção aguardando validação"
            descricao="Quando alguém atingir todos os critérios objetivos de um nível, a sugestão aparecerá aqui para aprovação."
          />
        ) : (
          <Vazio
            icone={aba === "APROVADA" ? CheckCircle2 : XCircle}
            titulo={aba === "APROVADA" ? "Nenhuma promoção aprovada" : "Nenhuma promoção rejeitada"}
            descricao="O histórico de decisões aparecerá aqui conforme as validações forem registradas."
          />
        )
      )}

      {!carregando && !erro && lista.length > 0 && (
        <GradeCards colunas="2">
          {lista.map((s) => (
            <CartaoPromocao
              key={s.id}
              sugestao={s}
              recente={recemAprovadas.indexOf(s.id) >= 0}
              aoAprovar={() => setDecisao({ sugestao: s, aprovar: true })}
              aoRejeitar={() => setDecisao({ sugestao: s, aprovar: false })}
              aoAbrirPessoa={() => navegar("/pessoas/" + s.user_id)}
            />
          ))}
        </GradeCards>
      )}

      <ModalDecisao
        decisao={decisao}
        onFechar={() => setDecisao(null)}
        aoConcluir={(resposta, aprovado) => {
          recarregar();
          if (aprovado) {
            const id = resposta.sugestao.id;
            setRecemAprovadas((atual) => atual.concat([id]));
            setTimeout(() => setRecemAprovadas((atual) => atual.filter((x) => x !== id)), 5000);
            sucesso(
              "Promoção aprovada",
              resposta.sugestao.user_nome + " agora é nível " + resposta.sugestao.nivel_proposto + " em " + resposta.sugestao.skill_nome + "."
            );
          } else {
            sucesso("Promoção rejeitada", "O colaborador foi notificado para continuar o desenvolvimento.");
          }
        }}
      />
    </div>
  );
}

/* ==========================================================================
   Cartão de sugestão de promoção
   ========================================================================== */

function CartaoPromocao({
  sugestao, recente, aoAprovar, aoRejeitar, aoAbrirPessoa,
}: {
  sugestao: SugestaoPromocao;
  recente: boolean;
  aoAprovar: () => void;
  aoRejeitar: () => void;
  aoAbrirPessoa: () => void;
}) {
  const pendente = sugestao.status === "PENDENTE";
  const atendidos = sugestao.criterios_atendidos.filter((c) => c.atendido).length;
  const total = sugestao.criterios_atendidos.length || 1;
  const progresso = (atendidos / total) * 100;
  const corSkill = sugestao.skill_cor || "#F59E0B";

  return (
    <div
      className={cn(
        "rounded-sgp-lg border bg-surface p-4 shadow-n1 transition-all",
        recente ? "animate-level-up border-success ring-2 ring-success/40" : pendente ? "border-border" : sugestao.status === "APROVADA" ? "border-success/40" : "border-danger/40"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar nome={sugestao.user_nome} cor={sugestao.user_cor} tamanho="lg" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={aoAbrirPessoa} className="max-w-full truncate text-sm font-semibold text-fg hover:text-brand">
            {sugestao.user_nome}
          </button>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-2xs text-fg-muted">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: corSkill }} />
            {sugestao.skill_nome}
          </p>
          <p className="mt-0.5 text-2xs text-fg-subtle">Sugerida {dataRelativa(sugestao.criado_em)}</p>
        </div>
        <Etiqueta tom={pendente ? "warning" : sugestao.status === "APROVADA" ? "success" : "danger"}>
          {pendente ? "Pendente" : sugestao.status === "APROVADA" ? "Aprovada" : "Rejeitada"}
        </Etiqueta>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
        <div className="text-center">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível atual</p>
          <span className="mx-auto mt-1 grid size-10 place-items-center rounded-sgp text-sm font-bold text-white" style={{ backgroundColor: corNivel(sugestao.nivel_atual) }}>
            N{sugestao.nivel_atual}
          </span>
        </div>
        <ArrowRight className={cn("size-6 shrink-0 text-brand", pendente && "animate-pulse")} aria-hidden />
        <div className="text-center">
          <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível proposto</p>
          <span
            className={cn("mx-auto mt-1 grid size-10 place-items-center rounded-sgp text-sm font-bold text-white", recente && "animate-level-up")}
            style={{ backgroundColor: corNivel(sugestao.nivel_proposto) }}
          >
            N{sugestao.nivel_proposto}
          </span>
        </div>
        <div className="ml-2 min-w-0 flex-1">
          <p className="truncate text-2xs text-fg-muted">{nivelLegenda().find((n) => n.nivel === sugestao.nivel_proposto)?.nome || ""}</p>
          <BarraProgresso valor={progresso} cor={progresso >= 100 ? "#059669" : "#D97706"} altura="sm" />
          <p className="mt-1 text-2xs text-fg-subtle">{numero(atendidos)} de {numero(total)} critérios atendidos</p>
        </div>
      </div>

      {sugestao.justificativa && (
        <p className="mt-3 rounded-sgp border border-border bg-surface-2 p-2.5 text-2xs text-fg-muted">{sugestao.justificativa}</p>
      )}

      <div className="mt-3">
        <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Critérios objetivos</p>
        <ul className="space-y-1.5">
          {sugestao.criterios_atendidos.map((c) => {
            const Icone = ICONES_CRITERIO[c.icone] || Award;
            return (
              <li
                key={c.criterio}
                className={cn("flex items-center gap-2 rounded-sgp border p-2", c.atendido ? "border-success/30 bg-success-soft/25" : "border-danger/30 bg-danger-soft/20")}
              >
                {c.atendido
                  ? <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-white"><Check className="size-3" aria-hidden /></span>
                  : <span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger text-white"><X className="size-3" aria-hidden /></span>}
                <Icone className={cn("size-3.5 shrink-0", c.atendido ? "text-success" : "text-danger")} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-2xs font-medium text-fg">{c.criterio}</span>
                <span className="shrink-0 text-2xs tabular-nums text-fg-muted">
                  {numero(c.atual, 1)} <span className="opacity-60">/ {numero(c.exigido, 1)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {sugestao.validado_por_nome && (
        <p className="mt-3 text-2xs text-fg-subtle">Validado por {sugestao.validado_por_nome}</p>
      )}

      {pendente && (
        <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
          <Botao variante="perigo" tamanho="sm" icone={ThumbsDown} onClick={aoRejeitar}>Rejeitar</Botao>
          <Botao variante="sucesso" tamanho="sm" icone={ThumbsUp} onClick={aoAprovar}>Aprovar promoção</Botao>
        </div>
      )}

      {recente && (
        <div className="mt-3 flex items-center gap-2 rounded-sgp border border-success/40 bg-success-soft/30 p-2.5">
          <PartyPopper className="size-4 shrink-0 text-success animate-pulse" aria-hidden />
          <p className="text-2xs font-semibold text-success">Level up registrado! O histórico de evolução foi atualizado.</p>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Modal de decisão
   ========================================================================== */

function ModalDecisao({
  decisao, onFechar, aoConcluir,
}: {
  decisao: { sugestao: SugestaoPromocao; aprovar: boolean } | null;
  onFechar: () => void;
  aoConcluir: (resposta: RespostaValidacao, aprovado: boolean) => void;
}) {
  const [comentario, setComentario] = useState("");
  const [nivelFinal, setNivelFinal] = useState(0);

  const sugestao = decisao ? decisao.sugestao : null;
  const aprovar = decisao ? decisao.aprovar : false;
  const nivel = nivelFinal || (sugestao ? sugestao.nivel_proposto : 3);

  const validar = useMutacao<{ id: number; corpo: Record<string, unknown> }, RespostaValidacao>({
    url: (v) => "/capacidades/promocoes/" + v.id + "/validar/",
    invalidar: [CHAVES.promocoes, CHAVES.perfisSkill, ["perfil-historico"], ["historico-skill"], ["perfis-usuario"], CHAVES.matrizSkills],
    aoSucesso: (resposta) => {
      aoConcluir(resposta, aprovar);
      setComentario("");
      setNivelFinal(0);
      onFechar();
    },
  });

  const enviar = () => {
    if (!sugestao) return;
    validar.mutate({
      id: sugestao.id,
      corpo: {
        aprovar,
        comentario,
        nivel_final: aprovar ? nivel : null,
      },
    });
  };

  const bloqueado = !aprovar && comentario.trim().length < 5;

  return (
    <Modal
      aberto={Boolean(decisao)}
      onFechar={onFechar}
      titulo={aprovar ? "Aprovar promoção" : "Rejeitar promoção"}
      subtitulo={sugestao ? sugestao.user_nome + " · " + sugestao.skill_nome + " · N" + sugestao.nivel_atual + " → N" + sugestao.nivel_proposto : undefined}
      largura="md"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante={aprovar ? "sucesso" : "perigo"}
            icone={aprovar ? ThumbsUp : ThumbsDown}
            carregando={validar.isPending}
            disabled={bloqueado}
            onClick={enviar}
          >
            {aprovar ? "Confirmar promoção" : "Confirmar rejeição"}
          </Botao>
        </>
      }
    >
      {sugestao && (
        <div className="space-y-3">
          <Alerta tom={aprovar ? "success" : "warning"} titulo={aprovar ? "Confirme o nível final" : "Justificativa obrigatória"} icone={aprovar ? CheckCircle2 : AlertTriangle}>
            {aprovar
              ? "A aprovação atualiza o nível atual e validado do colaborador, registra o histórico e notifica o interessado."
              : "Explique o motivo da rejeição — o colaborador receberá a justificativa para direcionar o desenvolvimento."}
          </Alerta>

          {aprovar && (
            <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
              <ControleDeslizante
                valor={nivel}
                onChange={setNivelFinal}
                min={Math.max(1, sugestao.nivel_atual + 1)}
                max={5}
                rotulo="Nível final aprovado"
                sufixo=""
                cor={corNivel(nivel)}
                marcos={[sugestao.nivel_atual + 1, 3, 4, 5]}
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: corNivel(nivel) }}>N{nivel}</span>
                <span className="text-xs text-fg-muted">{nivelLegenda().find((n) => n.nivel === nivel)?.nome}</span>
                {nivel !== sugestao.nivel_proposto && (
                  <Etiqueta tom="warning">ajustado do proposto N{sugestao.nivel_proposto}</Etiqueta>
                )}
              </div>
            </div>
          )}

          <Campo
            rotulo="Comentário"
            htmlFor="vd-com"
            obrigatorio={!aprovar}
            dica={aprovar ? "Opcional — fica registrado na auditoria e no histórico do colaborador." : "Mínimo de 5 caracteres."}
            erro={bloqueado && comentario.length > 0 ? "Informe ao menos 5 caracteres." : undefined}
          >
            <AreaTexto
              id="vd-com"
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder={aprovar ? "Ex.: critérios validados pela banca e entregas confirmadas pelo gestor." : "Ex.: evidências insuficientes para o nível 4; focar em mentoria e certificação."}
            />
          </Campo>

          <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Critérios avaliados</p>
            <ul className="space-y-1">
              {sugestao.criterios_atendidos.map((c) => (
                <li key={c.criterio} className="flex items-center gap-2 text-2xs">
                  {c.atendido ? <Check className="size-3 shrink-0 text-success" aria-hidden /> : <X className="size-3 shrink-0 text-danger" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate text-fg-muted">{c.criterio}</span>
                  <span className="shrink-0 tabular-nums text-fg-subtle">{numero(c.atual, 1)} / {numero(c.exigido, 1)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}
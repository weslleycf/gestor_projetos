import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity, AlertTriangle, Award, BadgeCheck, CalendarClock, Check, Clock, ExternalLink,
  GraduationCap, History, Layers3, LineChart, Mail, MapPin, Paperclip, Pencil, Plus, Snowflake,
  Sparkles, Target, ThumbsUp, Trash2, TrendingUp, UserCheck, Users, Zap, type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraProgresso, Botao, BotaoIcone, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, ControleDeslizante, Entrada, Esqueleto, Etiqueta, KPI, Modal, PainelLateral,
  Selecao, Vazio, useAvisos,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { EscalaCores, GraficoLinha, RadarSkills, Sparkline, type Serie } from "@/components/charts";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { cn, comAlfa, corNivel, nivelLegenda } from "@/lib/utils";
import { dataCurta, dataHora, numero, percentual } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { AcaoPDI, PDI, PerfilSkill, Usuario } from "@/lib/types";

/* ==========================================================================
   Perfil de capacidades do colaborador (RF-50 a RF-55)
   ========================================================================== */

const TIPOS_AVALIACAO = [
  { valor: "AUTOAVALIACAO", rotulo: "Autoavaliação" },
  { valor: "GESTOR", rotulo: "Avaliação do gestor" },
  { valor: "PAR", rotulo: "Avaliação de pares" },
  { valor: "MENTOR", rotulo: "Avaliação de mentor" },
  { valor: "BANCA", rotulo: "Banca avaliadora" },
  { valor: "CLIENTE", rotulo: "Avaliação de cliente" },
];

const TIPOS_EVIDENCIA = [
  { valor: "PROJETO", rotulo: "Entrega de projeto" },
  { valor: "CERTIFICACAO", rotulo: "Certificação" },
  { valor: "TREINAMENTO", rotulo: "Treinamento concluído" },
  { valor: "PUBLICACAO", rotulo: "Publicação / artigo" },
  { valor: "PALESTRA", rotulo: "Palestra / evento" },
  { valor: "MENTORIA", rotulo: "Mentoria realizada" },
  { valor: "BADGE", rotulo: "Badge digital" },
  { valor: "AVALIACAO", rotulo: "Avaliação formal" },
  { valor: "OUTRO", rotulo: "Outro" },
];

const CORES_ESCALA = [corNivel(1), corNivel(2), corNivel(3), corNivel(4), corNivel(5)];

interface EixoRadar {
  skill_id: number;
  skill: string;
  categoria: string;
  cor: string;
  icone: string;
  atual: number;
  consolidado: number;
  validado: number;
  desejado: number;
  xp: number;
  status: string;
  gap: number;
}

interface RespostaRadar {
  user_id: number;
  nome: string;
  total_skills: number;
  nivel_medio: number;
  eixos: EixoRadar[];
  todos: EixoRadar[];
  por_categoria: Array<{ categoria: string; total: number; nivel_medio: number; skills: EixoRadar[] }>;
}

interface HistoricoItem {
  id: number;
  employee_skill: number;
  skill_nome: string;
  skill_cor: string;
  nivel_anterior: number;
  nivel_novo: number;
  xp_movimento: number;
  motivo: string;
  origem: string;
  origem_rotulo: string;
  registrado_por_nome: string;
  data: string;
}

interface AvaliacaoItem {
  id: number;
  employee_skill: number;
  tipo: string;
  tipo_rotulo: string;
  nivel_atribuido: number;
  peso: number;
  comentario: string;
  data: string;
  avaliador_detalhe: { nome: string; cor: string; iniciais: string } | null;
}

interface EvidenciaItem {
  id: number;
  employee_skill: number;
  tipo: string;
  tipo_rotulo: string;
  descricao: string;
  url: string;
  data: string;
  emitido_por: string;
  valida: boolean;
  validador_nome: string;
  validada_em: string | null;
  pode_editar?: boolean;
}

interface CriterioPerfil {
  nivel_atual: number;
  nivel_proposto: number;
  elegivel: boolean;
  progresso: number;
  checagens: Array<{ criterio: string; atendido: boolean; atual: number; exigido: number; icone: string }>;
}

interface SemanaOcupacao {
  semana: string;
  rotulo: string;
  ocupacao: number;
  disponivel: number;
  situacao: string;
}

interface RespostaOcupacao {
  user_id: number;
  semanas: SemanaOcupacao[];
  horas_apontadas: number;
}

type AbaPessoa = "capacidades" | "evolucao" | "evidencias" | "avaliacoes" | "pdi" | "ocupacao";

function iniciaisDe(nome: string) {
  return nome.split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase();
}

const CORES_STATUS: Record<string, string> = {
  ATIVA: "#059669",
  EM_DESENVOLVIMENTO: "#2563EB",
  ENFERRUJADA: "#D97706",
  EM_RECICLAGEM: "#0891B2",
  INATIVA: "#94A3B8",
};

export default function PessoaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navegar = useNavigate();
  const { sucesso } = useAvisos();
  const [aba, setAba] = useState<AbaPessoa>("capacidades");
  const [perfilAcoes, setPerfilAcoes] = useState<PerfilSkill | null>(null);
  const [skillDetalhe, setSkillDetalhe] = useState<PerfilSkill | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const niveisAnteriores = useRef<Record<number, number>>({});

  const usuario = useConsulta<Usuario>(["usuario", id], id ? "/usuarios/" + id + "/" : null);
  const radar = useConsulta<RespostaRadar>(["perfis-usuario", id], id ? "/capacidades/perfis/por-usuario/" + id + "/" : null);
  const perfis = useLista<PerfilSkill>(CHAVES.perfisSkill, id ? "/capacidades/perfis/" : null, { user: id, page_size: 200 });
  const historico = useLista<HistoricoItem>(["historico-skill"], "/capacidades/historico/", { page_size: 400 });
  const evidencias = useLista<EvidenciaItem>(["evidencias-skill"], "/capacidades/evidencias/", { page_size: 400 });
  const avaliacoes = useLista<AvaliacaoItem>(["avaliacoes-skill"], "/capacidades/avaliacoes/", { page_size: 400 });
  const pdis = useLista<PDI>(CHAVES.pdis, id ? "/capacidades/pdi/" : null, { user: id, page_size: 20 });
  const ocupacao = useConsulta<RespostaOcupacao>(["ocupacao", id], id ? "/capacidade/" + id + "/" : null, { semanas: 12 });

  const pessoa = usuario.data;
  const lista = perfis.data || [];
  const idsPerfis = useMemo(() => lista.map((p) => p.id), [lista]);

  const meuHistorico = useMemo(
    () => (historico.data || []).filter((h) => idsPerfis.indexOf(h.employee_skill) >= 0),
    [historico.data, idsPerfis]
  );
  const minhasEvidencias = useMemo(
    () => (evidencias.data || []).filter((e) => idsPerfis.indexOf(e.employee_skill) >= 0),
    [evidencias.data, idsPerfis]
  );
  const minhasAvaliacoes = useMemo(
    () => (avaliacoes.data || []).filter((a) => idsPerfis.indexOf(a.employee_skill) >= 0),
    [avaliacoes.data, idsPerfis]
  );

  useEffect(() => {
    if (!lista.length) return;
    const anteriores = niveisAnteriores.current;
    let promovido: number | null = null;
    lista.forEach((p) => {
      const antes = anteriores[p.id];
      if (antes !== undefined && p.nivel_atual > antes) promovido = p.id;
      anteriores[p.id] = p.nivel_atual;
    });
    if (promovido !== null) {
      setLevelUp(promovido);
      const timer = setTimeout(() => setLevelUp(null), 3200);
      return () => clearTimeout(timer);
    }
  }, [lista]);

  const indicadores = useMemo(() => {
    const xpTotal = lista.reduce((a, p) => a + (p.xp_acumulado || 0), 0);
    return {
      total: lista.length,
      media: lista.length ? lista.reduce((a, p) => a + p.nivel_efetivo, 0) / lista.length : 0,
      desenvolvimento: lista.filter((p) => p.status === "EM_DESENVOLVIMENTO" || p.status === "EM_RECICLAGEM").length,
      enferrujadas: lista.filter((p) => p.status === "ENFERRUJADA").length,
      xpTotal,
    };
  }, [lista]);

  const eixosRadar = useMemo(() => {
    const base = (radar.data?.todos || []).slice(0, 10);
    if (base.length < 3) {
      return { nomes: lista.slice(0, 10).map((p) => p.skill_detalhe?.nome || "Skill"), atuais: lista.slice(0, 10).map((p) => p.nivel_efetivo), desejados: lista.slice(0, 10).map((p) => p.nivel_desejado || p.nivel_atual) };
    }
    return {
      nomes: base.map((e) => e.skill),
      atuais: base.map((e) => e.consolidado || e.atual),
      desejados: base.map((e) => e.desejado || e.atual),
    };
  }, [radar.data, lista]);

  const seriesEvolucao = useMemo(() => {
    const porSkill: Record<string, HistoricoItem[]> = {};
    meuHistorico.forEach((h) => {
      const chave = h.skill_nome || "Capacidade";
      const atual = porSkill[chave] || [];
      atual.push(h);
      porSkill[chave] = atual;
    });
    const chaves = Object.keys(porSkill)
      .sort((a, b) => porSkill[b].length - porSkill[a].length)
      .slice(0, 6);
    if (!chaves.length) return { rotulos: [] as string[], series: [] as Serie[] };

    const datas = Array.from(new Set(meuHistorico.map((h) => h.data.slice(0, 10)))).sort();
    const rotulos = datas.map((d) => dataCurta(d));
    const series: Serie[] = chaves.map((chave) => {
      const itens = [...porSkill[chave]].sort((a, b) => a.data.localeCompare(b.data));
      let indice = 0;
      let nivel = itens[0].nivel_anterior || itens[0].nivel_novo;
      const dados = datas.map((data) => {
        while (indice < itens.length && itens[indice].data.slice(0, 10) <= data) {
          nivel = itens[indice].nivel_novo;
          indice += 1;
        }
        return nivel;
      });
      return { nome: chave, cor: itens[0].skill_cor || "#2563EB", dados };
    });
    return { rotulos, series };
  }, [meuHistorico]);

  if (usuario.isLoading || radar.isLoading) {
    return (
      <div className="space-y-4">
        <Esqueleto linhas={2} />
        <CarregandoBloco rotulo="Carregando perfil de capacidades..." />
      </div>
    );
  }

  if (usuario.isError || !pessoa) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Pessoa" icone={Users} migalhas={[{ rotulo: "Pessoas", onClick: () => navegar("/pessoas") }, { rotulo: "Perfil" }]} />
        <Alerta tom="danger" titulo="Não foi possível carregar o perfil">
          {usuario.isError ? mensagemErro(usuario.error) : "Colaborador não encontrado."}
        </Alerta>
        <Botao variante="secundario" onClick={() => navegar("/pessoas")}>Voltar ao diretório</Botao>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo={pessoa.nome}
        subtitulo={(pessoa.cargo || "Cargo não informado") + (pessoa.area ? " · " + pessoa.area : "")}
        icone={UserCheck}
        cor={pessoa.cor || "#2563EB"}
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Pessoas", onClick: () => navegar("/pessoas") },
          { rotulo: pessoa.nome },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={Layers3} onClick={() => navegar("/matriz-skills")}>Matriz de capacidades</Botao>
            <Botao variante="secundario" icone={Award} onClick={() => navegar("/pdi")}>PDI e trilhas</Botao>
          </>
        }
        filhos={
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Avatar nome={pessoa.nome} cor={pessoa.cor} iniciais={pessoa.iniciais} url={pessoa.avatar_display} tamanho="xl" anel />
              <div className="flex flex-wrap items-center gap-1.5">
                <Etiqueta tom="brand">{pessoa.perfil}</Etiqueta>
                <Etiqueta tom="neutral" icone={Mail}>{pessoa.email}</Etiqueta>
                {pessoa.localizacao && <Etiqueta tom="neutral" icone={MapPin}>{pessoa.localizacao}</Etiqueta>}
                <Etiqueta tom="neutral" icone={UserCheck}>Gestor: {pessoa.gestor_nome || "—"}</Etiqueta>
                {pessoa.disponivel_para_mentoria && <Etiqueta tom="success" icone={GraduationCap}>Disponível para mentoria</Etiqueta>}
                {!pessoa.ativo && <Etiqueta tom="neutral">Inativo</Etiqueta>}
                <Etiqueta tom="brand" icone={Award}>Nível médio {numero(indicadores.media, 2)}</Etiqueta>
              </div>
              {(pessoa.interesses || []).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-fg-subtle">Interesses</span>
                  {(pessoa.interesses || []).map((i) => (<Chip key={i} cor="#0891B2">{i}</Chip>))}
                </div>
              )}
            </div>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI rotulo="Capacidades mapeadas" valor={numero(indicadores.total)} icone={Layers3} cor="#2563EB" subrotulo={numero(radar.data?.total_skills || 0) + " no radar"} compacto />
        <KPI rotulo="Nível médio" valor={numero(indicadores.media, 2)} icone={TrendingUp} cor="#059669" subrotulo="consolidado" compacto />
        <KPI rotulo="Em desenvolvimento" valor={numero(indicadores.desenvolvimento)} icone={Target} cor="#0891B2" subrotulo="reciclagem incluída" compacto />
        <KPI rotulo="Enferrujadas" valor={numero(indicadores.enferrujadas)} icone={Snowflake} cor="#D97706" subrotulo="sem uso recente" compacto />
        <KPI rotulo="XP total" valor={numero(indicadores.xpTotal)} icone={Zap} cor="#7C3AED" compacto />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-fg">Radar de capacidades (atual × desejado)</h3>
          {eixosRadar.nomes.length >= 3 ? (
            <RadarSkills
              eixos={eixosRadar.nomes}
              tamanho={330}
              maximo={5}
              series={[
                { nome: "Atual", cor: "#2563EB", valores: eixosRadar.atuais },
                { nome: "Desejado", cor: "#F59E0B", valores: eixosRadar.desejados, preenchido: false },
              ]}
            />
          ) : (
            <Vazio icone={Target} titulo="Radar indisponível" descricao="São necessárias ao menos 3 capacidades registradas para desenhar o radar." />
          )}
        </div>
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 text-sm font-semibold text-fg">Distribuição por categoria</h3>
          {(radar.data?.por_categoria || []).length === 0 ? (
            <p className="text-2xs text-fg-muted">Nenhuma capacidade registrada.</p>
          ) : (
            <ul className="space-y-2.5">
              {(radar.data?.por_categoria || []).slice(0, 7).map((c) => (
                <li key={c.categoria}>
                  <div className="mb-1 flex items-center justify-between text-2xs">
                    <span className="truncate font-medium text-fg">{c.categoria}</span>
                    <span className="shrink-0 text-fg-muted">{numero(c.total)} · N{numero(c.nivel_medio, 2)}</span>
                  </div>
                  <BarraProgresso valor={(c.nivel_medio / 5) * 100} cor={corNivel(Math.round(c.nivel_medio))} altura="sm" />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 border-t border-border pt-3">
            <EscalaCores rotulos={["1", "2", "3", "4", "5"]} cores={CORES_ESCALA} titulo="Nível" />
          </div>
        </div>
      </div>

      <Abas
        valor={aba}
        onChange={(v) => setAba(v)}
        abas={[
          { valor: "capacidades", rotulo: "Capacidades", icone: Layers3, contagem: lista.length },
          { valor: "evolucao", rotulo: "Evolução", icone: LineChart, contagem: meuHistorico.length },
          { valor: "evidencias", rotulo: "Evidências", icone: Paperclip, contagem: minhasEvidencias.length },
          { valor: "avaliacoes", rotulo: "Avaliações", icone: Award, contagem: minhasAvaliacoes.length },
          { valor: "pdi", rotulo: "PDI", icone: Target, contagem: (pdis.data || []).length },
          { valor: "ocupacao", rotulo: "Ocupação", icone: Activity },
        ]}
      />

      {aba === "capacidades" && (
        <AbaCapacidades
          perfis={lista}
          carregando={perfis.isLoading}
          erro={perfis.isError ? perfis.error : null}
          levelUp={levelUp}
          aoAbrirAcoes={setPerfilAcoes}
          aoAbrirDetalhe={setSkillDetalhe}
          aoAbrirSkill={(skillId) => navegar("/capacidades/skills/" + skillId)}
        />
      )}

      {aba === "evolucao" && <AbaEvolucao historico={meuHistorico} rotulos={seriesEvolucao.rotulos} series={seriesEvolucao.series} />}

      {aba === "evidencias" && (
        <AbaEvidencias
          evidencias={minhasEvidencias}
          aoValidar={async (perfilId, evidenciaId) => {
            await api.post("/capacidades/perfis/" + perfilId + "/validar-evidencia/" + evidenciaId + "/");
            evidencias.refetch();
          }}
        />
      )}

      {aba === "avaliacoes" && (
        <AbaAvaliacoes
          avaliacoes={minhasAvaliacoes}
          perfis={lista}
          aoConcluir={() => { avaliacoes.refetch(); perfis.refetch(); radar.refetch(); }}
        />
      )}

      {aba === "pdi" && (
        <AbaPdi
          pdis={pdis.data || []}
          carregando={pdis.isLoading}
          erro={pdis.isError ? pdis.error : null}
          userId={Number(id)}
          aoConcluir={() => { pdis.refetch(); perfis.refetch(); radar.refetch(); }}
        />
      )}

      {aba === "ocupacao" && (
        <AbaOcupacao
          dados={ocupacao.data}
          carregando={ocupacao.isLoading}
          erro={ocupacao.isError ? ocupacao.error : null}
          nome={pessoa.nome}
        />
      )}

      <PainelAcoes
        perfil={perfilAcoes}
        onFechar={() => setPerfilAcoes(null)}
        aoConcluir={(promocao) => {
          perfis.refetch();
          radar.refetch();
          historico.refetch();
          evidencias.refetch();
          avaliacoes.refetch();
          if (promocao) sucesso("Elegível a promoção", "Uma sugestão de promoção foi criada e aguarda validação.");
        }}
      />

      <ModalDetalheSkill perfil={skillDetalhe} onFechar={() => setSkillDetalhe(null)} />
    </div>
  );
}

/* ==========================================================================
   Aba: capacidades
   ========================================================================== */

function AbaCapacidades({
  perfis, carregando, erro, levelUp, aoAbrirAcoes, aoAbrirDetalhe, aoAbrirSkill,
}: {
  perfis: PerfilSkill[];
  carregando: boolean;
  erro: Error | null;
  levelUp: number | null;
  aoAbrirAcoes: (p: PerfilSkill) => void;
  aoAbrirDetalhe: (p: PerfilSkill) => void;
  aoAbrirSkill: (id: number) => void;
}) {
  if (carregando) return <CarregandoBloco rotulo="Carregando capacidades do perfil..." />;
  if (erro) return <Alerta tom="danger" titulo="Não foi possível carregar as capacidades">{mensagemErro(erro)}</Alerta>;
  if (!perfis.length) {
    return (
      <Vazio
        icone={Layers3}
        titulo="Nenhuma capacidade registrada"
        descricao="Adicione capacidades ao perfil pela matriz de capacidades para acompanhar a evolução deste colaborador."
      />
    );
  }

  const ordenados = [...perfis].sort((a, b) => b.nivel_efetivo - a.nivel_efetivo);

  return (
    <div className="space-y-2">
      {ordenados.map((p) => {
        const cor = p.skill_detalhe?.cor || "#6366F1";
        const tamanhoBolha = 26 + p.nivel_atual * 6;
        const animar = levelUp === p.id;
        return (
          <div
            key={p.id}
            className={cn(
              "rounded-sgp-lg border border-border bg-surface p-3.5 shadow-n1 transition-all",
              animar && "animate-level-up border-success ring-2 ring-success/40"
            )}
          >
            <div className="flex flex-wrap items-start gap-3">
              <span
                className="grid shrink-0 place-items-center rounded-full font-bold text-white"
                style={{ width: tamanhoBolha, height: tamanhoBolha, backgroundColor: corNivel(p.nivel_atual), fontSize: 11 }}
                title={"Nível " + p.nivel_atual}
              >
                N{p.nivel_atual}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => aoAbrirSkill(p.skill)} className="truncate text-sm font-semibold text-fg hover:text-brand">
                    {p.skill_detalhe?.nome || "Capacidade " + p.skill}
                  </button>
                  <Etiqueta tom={p.status === "ATIVA" ? "success" : p.status === "ENFERRUJADA" ? "warning" : "info"}>{p.status_rotulo || p.status}</Etiqueta>
                  {p.destaque && <Etiqueta tom="brand" icone={Sparkles}>Destaque</Etiqueta>}
                  {animar && <Etiqueta tom="success" icone={BadgeCheck}>Promoção aprovada</Etiqueta>}
                </div>
                <p className="mt-0.5 text-2xs text-fg-muted">
                  {p.skill_detalhe?.categoria_nome || "Sem categoria"} · atual N{p.nivel_atual} · validado {p.nivel_validado || "—"} · desejado {p.nivel_desejado || "—"}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-2xs text-fg-muted">
                      <span>Progresso para o nível {Math.min(5, p.nivel_atual + 1)}</span>
                      <span className="font-semibold text-fg">{percentual(p.progresso_nivel_percentual, 0)}</span>
                    </div>
                    <BarraProgresso valor={p.progresso_nivel_percentual} cor={corNivel(p.nivel_atual)} altura="sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-2xs text-fg-muted">
                    <Etiqueta tom="neutral" icone={Zap}>{numero(p.xp_acumulado)} XP</Etiqueta>
                    <Etiqueta tom="neutral" icone={Paperclip}>{numero(p.total_evidencias)} evidência(s)</Etiqueta>
                    <Etiqueta tom="neutral" icone={Award}>{numero(p.total_avaliacoes)} avaliação(ões)</Etiqueta>
                    <Etiqueta tom="neutral" icone={ThumbsUp}>{numero(p.total_endossos)} endosso(s)</Etiqueta>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-2xs font-semibold" style={{ color: CORES_STATUS[p.status] || "#64748B" }}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: CORES_STATUS[p.status] || "#64748B" }} />
                  {numero(p.xp_para_proximo_nivel)} XP p/ N{Math.min(5, p.nivel_atual + 1)}
                </span>
                {p.dias_sem_uso !== null && p.dias_sem_uso !== undefined && (
                  <span className={cn("text-2xs", p.dias_sem_uso > 365 ? "text-danger" : "text-fg-subtle")}>{numero(p.dias_sem_uso)} dias sem uso</span>
                )}
                <div className="flex gap-1.5">
                  <Botao tamanho="xs" variante="fantasma" icone={History} onClick={() => aoAbrirDetalhe(p)}>Detalhes</Botao>
                  <Botao tamanho="xs" variante="secundario" icone={Award} onClick={() => aoAbrirAcoes(p)}>Avaliar</Botao>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-3">
        <EscalaCores rotulos={["1", "2", "3", "4", "5"]} cores={CORES_ESCALA} titulo="Nível" />
        <span className="text-2xs text-fg-muted">O tamanho da bolha é proporcional ao nível atual da capacidade.</span>
      </div>
    </div>
  );
}

/* ==========================================================================
   Aba: evolução
   ========================================================================== */

function AbaEvolucao({ historico, rotulos, series }: { historico: HistoricoItem[]; rotulos: string[]; series: Serie[] }) {
  if (!historico.length) {
    return <Vazio icone={LineChart} titulo="Sem histórico de evolução" descricao="As movimentações de nível e XP aparecem aqui conforme forem registradas." />;
  }
  return (
    <div className="space-y-3">
      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <h3 className="mb-3 text-sm font-semibold text-fg">Evolução dos níveis ao longo do tempo</h3>
        <GraficoLinha rotulos={rotulos} series={series} altura={280} mostrarLegenda formatarValor={(v) => "N" + numero(v)} />
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <h3 className="mb-3 text-sm font-semibold text-fg">Linha do tempo ({numero(historico.length)} movimentações)</h3>
        <ol className="relative space-y-3 border-l border-dashed border-border pl-4">
          {historico.slice(0, 60).map((h) => {
            const promocao = h.nivel_novo > h.nivel_anterior;
            const regressao = h.nivel_novo < h.nivel_anterior;
            const cor = promocao ? "#059669" : regressao ? "#DC2626" : h.skill_cor || "#0891B2";
            return (
              <li key={h.id} className="relative">
                <span className="absolute -left-[26px] grid size-5 place-items-center rounded-full text-white" style={{ backgroundColor: cor }}>
                  {promocao ? <TrendingUp className="size-3" aria-hidden /> : regressao ? <AlertTriangle className="size-3" aria-hidden /> : <Zap className="size-3" aria-hidden />}
                </span>
                <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-2xs font-semibold text-fg">
                      {h.skill_nome}: {h.nivel_anterior > 0 ? "N" + h.nivel_anterior + " → " : ""}N{h.nivel_novo}
                    </p>
                    <span className="text-2xs text-fg-subtle">{dataHora(h.data)}</span>
                  </div>
                  <p className="mt-0.5 text-2xs text-fg-muted">{h.motivo || "Sem justificativa registrada"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Etiqueta tom="neutral">{h.origem_rotulo || h.origem}</Etiqueta>
                    {h.xp_movimento !== 0 && (
                      <Etiqueta tom={h.xp_movimento > 0 ? "success" : "danger"} icone={Zap}>{h.xp_movimento > 0 ? "+" : ""}{numero(h.xp_movimento)} XP</Etiqueta>
                    )}
                    {h.registrado_por_nome && <span className="text-2xs text-fg-subtle">por {h.registrado_por_nome}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ==========================================================================
   Aba: evidências
   ========================================================================== */

function AbaEvidencias({ evidencias, aoValidar }: { evidencias: EvidenciaItem[]; aoValidar: (perfilId: number, evidenciaId: number) => Promise<void> }) {
  const { pode } = useAuth();
  const podeEditar = pode("capacidade.editar");
  const [enviando, setEnviando] = useState<number | null>(null);
  const [editando, setEditando] = useState<EvidenciaItem | null>(null);
  const [paraExcluir, setParaExcluir] = useState<EvidenciaItem | null>(null);
  const [form, setForm] = useState({ tipo: "PROJETO", descricao: "", url: "", data: "", emitido_por: "" });

  const invalidar = [["evidencias-skill"], ["historico-skill"], ["perfis-usuario"], CHAVES.perfisSkill];

  const salvarEvidencia = useMutacao<{ id: number } & Record<string, unknown>, unknown>({
    metodo: "patch",
    url: (v) => "/capacidades/evidencias/" + v.id + "/",
    invalidar,
    mensagemSucesso: "Evidência atualizada",
    aoSucesso: () => setEditando(null),
  });

  const excluirEvidencia = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/capacidades/evidencias/" + v.id + "/",
    invalidar,
    mensagemSucesso: "Evidência excluída",
    aoSucesso: () => setParaExcluir(null),
  });

  const abrirEdicao = (e: EvidenciaItem) => {
    setForm({
      tipo: e.tipo,
      descricao: e.descricao,
      url: e.url || "",
      data: e.data || "",
      emitido_por: e.emitido_por || "",
    });
    setEditando(e);
  };

  if (!evidencias.length) {
    return <Vazio icone={Paperclip} titulo="Nenhuma evidência cadastrada" descricao="As evidências sustentam a validação de nível e alimentam os critérios de promoção." />;
  }

  const validadas = evidencias.filter((e) => e.valida).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-sgp-lg border border-border bg-surface p-3">
        <Etiqueta tom="success" icone={Check}>{numero(validadas)} validadas</Etiqueta>
        <Etiqueta tom="warning" icone={Clock}>{numero(evidencias.length - validadas)} aguardando validação</Etiqueta>
        <span className="text-2xs text-fg-muted">
          Quem lançou a evidência pode corrigi-la ou excluí-la; o nível validado é definido pelo avaliador.
        </span>
      </div>
      <GradeCards colunas="3">
        {evidencias.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="flex items-start justify-between gap-2">
              <Etiqueta tom={e.valida ? "success" : "warning"} icone={e.valida ? BadgeCheck : Clock}>{e.tipo_rotulo || e.tipo}</Etiqueta>
              <span className="text-2xs text-fg-subtle">{dataCurta(e.data)}</span>
            </div>
            <p className="text-xs font-medium text-fg">{e.descricao}</p>
            {e.emitido_por && <p className="text-2xs text-fg-muted">Emitido por {e.emitido_por}</p>}
            <p className="text-2xs text-fg-muted">
              {e.valida ? "Validada por " + (e.validador_nome || "—") + (e.validada_em ? " em " + dataCurta(e.validada_em) : "") : "Aguardando validação"}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2">
              {e.url ? (
                <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs font-semibold text-brand underline">
                  Abrir evidência <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : (
                <span className="text-2xs text-fg-subtle">Sem link</span>
              )}
              <div className="flex items-center gap-1.5">
                <Botao
                  tamanho="xs"
                  variante={e.valida ? "sucesso" : "secundario"}
                  icone={e.valida ? Check : BadgeCheck}
                  carregando={enviando === e.id}
                  onClick={async () => {
                    setEnviando(e.id);
                    try {
                      await aoValidar(e.employee_skill, e.id);
                    } finally {
                      setEnviando(null);
                    }
                  }}
                >
                  {e.valida ? "Validada" : "Validar"}
                </Botao>
                {(e.pode_editar || podeEditar) && (
                  <>
                    <BotaoIcone icone={Pencil} rotulo={"Editar evidência " + e.descricao} tamanho="xs" onClick={() => abrirEdicao(e)} />
                    <BotaoIcone icone={Trash2} rotulo={"Excluir evidência " + e.descricao} tamanho="xs" onClick={() => setParaExcluir(e)} />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </GradeCards>

      <Modal
        aberto={editando !== null}
        onFechar={() => setEditando(null)}
        titulo="Editar evidência"
        subtitulo="A evidência sustenta a validação do nível do colaborador"
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Botao>
            <Botao
              variante="primario"
              icone={Check}
              carregando={salvarEvidencia.isPending}
              disabled={!form.descricao.trim()}
              onClick={() => {
                if (!editando) return;
                salvarEvidencia.mutate({
                  id: editando.id,
                  tipo: form.tipo,
                  descricao: form.descricao,
                  url: form.url,
                  data: form.data || undefined,
                  emitido_por: form.emitido_por,
                });
              }}
            >
              Salvar evidência
            </Botao>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo rotulo="Tipo" htmlFor="pe-tipo">
            <Selecao id="pe-tipo" value={form.tipo} onChange={(ev) => setForm({ ...form, tipo: ev.target.value })}>
              {TIPOS_EVIDENCIA.map((t) => (
                <option key={t.valor} value={t.valor}>{t.rotulo}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Data" htmlFor="pe-data">
            <Entrada id="pe-data" type="date" value={form.data} onChange={(ev) => setForm({ ...form, data: ev.target.value })} />
          </Campo>
          <Campo rotulo="Descrição" obrigatorio htmlFor="pe-desc" className="sm:col-span-2">
            <Entrada id="pe-desc" value={form.descricao} onChange={(ev) => setForm({ ...form, descricao: ev.target.value })} />
          </Campo>
          <Campo rotulo="Link" htmlFor="pe-url">
            <Entrada id="pe-url" value={form.url} onChange={(ev) => setForm({ ...form, url: ev.target.value })} placeholder="https://" />
          </Campo>
          <Campo rotulo="Emitido por" htmlFor="pe-emit">
            <Entrada id="pe-emit" value={form.emitido_por} onChange={(ev) => setForm({ ...form, emitido_por: ev.target.value })} />
          </Campo>
        </div>
      </Modal>

      <Modal
        aberto={paraExcluir !== null}
        onFechar={() => setParaExcluir(null)}
        titulo="Excluir evidência"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setParaExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirEvidencia.isPending}
              onClick={() => {
                if (paraExcluir) excluirEvidencia.mutate({ id: paraExcluir.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão da evidência <strong>{paraExcluir?.descricao}</strong>?
        </p>
        {paraExcluir && paraExcluir.valida && (
          <Alerta tom="warning" titulo="Evidência validada" className="mt-3">
            Esta evidência já foi validada e conta para os critérios de promoção do colaborador.
          </Alerta>
        )}
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Aba: avaliações
   ========================================================================== */

function AbaAvaliacoes({
  avaliacoes, perfis, aoConcluir,
}: {
  avaliacoes: AvaliacaoItem[];
  perfis: PerfilSkill[];
  aoConcluir: () => void;
}) {
  const [perfil, setPerfil] = useState(perfis.length ? String(perfis[0].id) : "");
  const [tipo, setTipo] = useState("GESTOR");
  const [nivel, setNivel] = useState(3);
  const [comentario, setComentario] = useState("");

  const avaliar = useMutacao<Record<string, unknown>, { sugestao_promocao: unknown }>({
    url: "/capacidades/perfis/" + (perfil || 0) + "/avaliar/",
    invalidar: [CHAVES.perfisSkill, ["avaliacoes-skill"], ["historico-skill"], ["perfis-usuario"]],
    mensagemSucesso: "Avaliação registrada",
    aoSucesso: () => { setComentario(""); aoConcluir(); },
  });

  return (
    <div className="space-y-3">
      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <h3 className="mb-3 text-sm font-semibold text-fg">Nova avaliação</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo rotulo="Capacidade" obrigatorio htmlFor="av-perfil">
            <Selecao id="av-perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)}>
              {perfis.map((p) => (<option key={p.id} value={p.id}>{p.skill_detalhe?.nome || "Capacidade " + p.skill} (N{p.nivel_atual})</option>))}
            </Selecao>
          </Campo>
          <Campo rotulo="Tipo de avaliação" htmlFor="av-tipo">
            <Selecao id="av-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_AVALIACAO.map((t) => (<option key={t.valor} value={t.valor}>{t.rotulo}</option>))}
            </Selecao>
          </Campo>
          <Campo rotulo="Nível atribuído" htmlFor="av-nivel">
            <Selecao id="av-nivel" value={nivel} onChange={(e) => setNivel(Number(e.target.value))}>
              {nivelLegenda().map((n) => (<option key={n.nivel} value={n.nivel}>{n.nivel} — {n.nome}</option>))}
            </Selecao>
          </Campo>
          <Campo rotulo="Comentário" htmlFor="av-com" className="sm:col-span-3">
            <AreaTexto id="av-com" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Evidências observadas, contexto das entregas e pontos de melhoria." />
          </Campo>
        </div>
        <div className="mt-3 flex justify-end">
          <Botao
            variante="primario"
            icone={Award}
            carregando={avaliar.isPending}
            disabled={!perfil}
            onClick={() => avaliar.mutate({ tipo, nivel_atribuido: nivel, comentario, peso: 1 })}
          >
            Registrar avaliação
          </Botao>
        </div>
      </div>

      {avaliacoes.length === 0 ? (
        <Vazio icone={Award} titulo="Nenhuma avaliação registrada" descricao="Avaliações de gestor, pares, mentores e bancas compõem o nível consolidado." />
      ) : (
        <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">Capacidade</th>
                <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">Tipo</th>
                <th className="px-3 py-2 text-center text-2xs font-semibold uppercase tracking-wide text-fg-muted">Nível</th>
                <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">Avaliador</th>
                <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">Comentário</th>
                <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">Data</th>
              </tr>
            </thead>
            <tbody>
              {avaliacoes.map((a) => {
                const dono = perfis.find((p) => p.id === a.employee_skill);
                return (
                  <tr key={a.id} className="border-b border-border/70 last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-2 text-xs text-fg">{dono?.skill_detalhe?.nome || "—"}</td>
                    <td className="px-3 py-2 text-xs text-fg-muted">{a.tipo_rotulo || a.tipo}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="grid size-6 place-items-center rounded-md text-2xs font-bold text-white" style={{ backgroundColor: corNivel(a.nivel_atribuido) }}>N{a.nivel_atribuido}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar nome={a.avaliador_detalhe?.nome} cor={a.avaliador_detalhe?.cor} iniciais={a.avaliador_detalhe?.iniciais} tamanho="xs" />
                        <span className="text-2xs text-fg">{a.avaliador_detalhe?.nome || "Sistema"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-2xs text-fg-muted">{a.comentario || "—"}</td>
                    <td className="px-3 py-2 text-right text-2xs text-fg-subtle">{dataCurta(a.data)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Aba: PDI
   ========================================================================== */

function AbaPdi({
  pdis, carregando, erro, userId, aoConcluir,
}: {
  pdis: PDI[];
  carregando: boolean;
  erro: Error | null;
  userId: number;
  aoConcluir: () => void;
}) {
  const { sucesso } = useAvisos();
  const [modalGerar, setModalGerar] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const gerar = useMutacao<Record<string, unknown>, { pdi: PDI; acoes_criadas: number }>({
    url: "/capacidades/pdi/gerar/",
    invalidar: [CHAVES.pdis],
    mensagemSucesso: "PDI gerado com ações automáticas",
    aoSucesso: () => { setModalGerar(false); setTitulo(""); setObjetivo(""); aoConcluir(); },
  });

  const atualizarAcao = useMutacao<{ id: number; status: string }, AcaoPDI>({
    metodo: "patch",
    url: (v) => "/capacidades/pdi-acoes/" + v.id + "/",
    invalidar: [CHAVES.pdis, CHAVES.perfisSkill],
    mensagemSucesso: "Status da ação atualizado",
    aoSucesso: () => aoConcluir(),
  });

  if (carregando) return <CarregandoBloco rotulo="Carregando PDI..." />;
  if (erro) return <Alerta tom="danger" titulo="Não foi possível carregar o PDI">{mensagemErro(erro)}</Alerta>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">{numero(pdis.length)} plano(s) de desenvolvimento registrados.</p>
        <Botao variante="primario" icone={Plus} onClick={() => setModalGerar(true)}>Gerar PDI a partir dos gaps</Botao>
      </div>

      {pdis.length === 0 ? (
        <Vazio
          icone={Target}
          titulo="Nenhum PDI registrado"
          descricao="Gere um plano a partir dos gaps de capacidade detectados — as ações são criadas automaticamente a partir das trilhas recomendadas."
          acao={<Botao variante="primario" icone={Plus} onClick={() => setModalGerar(true)}>Gerar PDI</Botao>}
        />
      ) : (
        pdis.map((plano) => (
          <div key={plano.id} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-fg">{plano.titulo}</h3>
                <p className="text-2xs text-fg-muted">
                  {dataCurta(plano.data_inicio)} → {plano.data_fim ? dataCurta(plano.data_fim) : "sem prazo"} · acompanhamento {plano.acompanhamento_nome || "—"}
                </p>
                {plano.objetivo && <p className="mt-1 max-w-3xl text-2xs text-fg-muted">{plano.objetivo}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Etiqueta tom={plano.status === "ATIVO" ? "success" : plano.status === "CONCLUIDO" ? "info" : "neutral"}>{plano.status_rotulo || plano.status}</Etiqueta>
                <span className="text-sm font-bold tabular-nums text-fg">{percentual(plano.progresso, 0)}</span>
              </div>
            </div>

            <div className="mt-2">
              <BarraProgresso valor={plano.progresso} cor={plano.progresso >= 70 ? "#059669" : plano.progresso >= 40 ? "#0891B2" : "#D97706"} altura="md" mostrarValor />
            </div>

            <ul className="mt-3 space-y-1.5">
              {plano.acoes.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-sgp border p-2.5",
                    a.atrasada ? "border-danger/45 bg-danger-soft/20" : "border-border bg-surface-2"
                  )}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ backgroundColor: comAlfa(a.skill_cor || "#F59E0B", 0.16), color: a.skill_cor || "#F59E0B" }}>
                    <Target className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-fg">{a.descricao}</p>
                    <p className="truncate text-2xs text-fg-muted">
                      {a.tipo_rotulo || a.tipo}
                      {a.skill_nome ? " · " + a.skill_nome : ""}
                      {a.nivel_alvo ? " → N" + a.nivel_alvo : ""}
                      {a.prazo ? " · prazo " + dataCurta(a.prazo) : ""}
                      {a.carga_horaria ? " · " + numero(a.carga_horaria) + "h" : ""}
                    </p>
                  </div>
                  {a.atrasada && <Etiqueta tom="danger" icone={AlertTriangle}>Atrasada</Etiqueta>}
                  <Selecao
                    value={a.status}
                    onChange={(e) => {
                      const novoStatus = e.target.value;
                      atualizarAcao.mutate(
                        { id: a.id, status: novoStatus },
                        { onSuccess: () => { if (novoStatus === "CONCLUIDA") sucesso("Ação concluída", "O XP correspondente foi creditado no perfil."); } }
                      );
                    }}
                    className="h-8 w-40 text-xs"
                  >
                    <option value="PLANEJADA">Planejada</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="CONCLUIDA">Concluída</option>
                    <option value="ATRASADA">Atrasada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </Selecao>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <Modal
        aberto={modalGerar}
        onFechar={() => setModalGerar(false)}
        titulo="Gerar PDI"
        subtitulo="As ações são criadas automaticamente a partir das trilhas recomendadas"
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalGerar(false)}>Cancelar</Botao>
            <Botao variante="primario" icone={Target} carregando={gerar.isPending} onClick={() => gerar.mutate({ user: userId, titulo: titulo || undefined, objetivo, limite: 5 })}>
              Gerar plano
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Título" htmlFor="gp-titulo" dica="Deixe vazio para usar o padrão do sistema.">
            <Entrada id="gp-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="PDI 2026" />
          </Campo>
          <Campo rotulo="Objetivo de carreira" htmlFor="gp-obj">
            <AreaTexto id="gp-obj" rows={3} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: evoluir para especialista em arquitetura de dados" />
          </Campo>
        </div>
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Aba: ocupação semanal
   ========================================================================== */

function AbaOcupacao({
  dados, carregando, erro, nome,
}: {
  dados?: RespostaOcupacao;
  carregando: boolean;
  erro: Error | null;
  nome: string;
}) {
  if (carregando) return <CarregandoBloco rotulo="Carregando ocupação semanal..." />;
  if (erro) return <Alerta tom="danger" titulo="Não foi possível carregar a ocupação">{mensagemErro(erro)}</Alerta>;
  if (!dados || !dados.semanas.length) {
    return <Vazio icone={Activity} titulo="Sem dados de ocupação" descricao="Nenhuma alocação confirmada no período analisado." />;
  }

  const ocupacoes = dados.semanas.map((s) => s.ocupacao);
  const media = ocupacoes.reduce((a, b) => a + b, 0) / ocupacoes.length;
  const pico = Math.max(...ocupacoes);
  const superalocadas = dados.semanas.filter((s) => s.situacao === "SUPERALOCADO").length;
  const ociosas = dados.semanas.filter((s) => s.situacao === "OCIOSO").length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI rotulo="Ocupação média" valor={percentual(media, 1)} icone={Activity} cor={media > 100 ? "#DC2626" : media > 85 ? "#D97706" : "#059669"} compacto />
        <KPI rotulo="Pico de ocupação" valor={percentual(pico, 0)} icone={TrendingUp} cor="#2563EB" compacto />
        <KPI rotulo="Semanas superalocadas" valor={numero(superalocadas)} icone={AlertTriangle} cor="#DC2626" compacto />
        <KPI rotulo="Semanas ociosas" valor={numero(ociosas)} icone={Clock} cor="#0891B2" compacto />
        <KPI rotulo="Horas apontadas" valor={numero(dados.horas_apontadas, 1)} icone={CalendarClock} cor="#7C3AED" subrotulo="timesheet aprovado e pendente" compacto />
      </div>

      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">Ocupação semanal de {nome}</h3>
          <Sparkline dados={ocupacoes} cor="#2563EB" altura={36} largura={180} />
        </div>
        <div className="space-y-2">
          {dados.semanas.map((s) => {
            const cor = s.situacao === "SUPERALOCADO" ? "#DC2626" : s.situacao === "OCUPADO" ? "#D97706" : s.situacao === "DISPONIVEL" ? "#059669" : "#94A3B8";
            return (
              <div key={s.semana} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-2xs text-fg-muted">{s.rotulo}</span>
                <div className="flex-1">
                  <BarraProgresso valor={Math.min(100, s.ocupacao)} cor={cor} altura="md" mostrarValor rotulo={s.situacao} />
                </div>
                <span className="w-24 shrink-0 text-right text-2xs text-fg-muted">{numero(s.disponivel, 0)}% livre</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Painel de ações rápidas no perfil
   ========================================================================== */

function PainelAcoes({
  perfil, onFechar, aoConcluir,
}: {
  perfil: PerfilSkill | null;
  onFechar: () => void;
  aoConcluir: (promocao: boolean) => void;
}) {
  const { sucesso } = useAvisos();
  const [formAvaliacao, setFormAvaliacao] = useState({ tipo: "GESTOR", nivel_atribuido: 3, comentario: "" });
  const [formEndosso, setFormEndosso] = useState({ nivel_sugerido: 3, comentario: "" });
  const [formEvidencia, setFormEvidencia] = useState({ tipo: "PROJETO", descricao: "", url: "", emitido_por: "" });
  const [formXp, setFormXp] = useState({ xp: 50, motivo: "", origem: "MANUAL" });

  const perfilId = perfil ? perfil.id : 0;
  const invalidar = [CHAVES.perfisSkill, ["historico-skill"], ["avaliacoes-skill"], ["evidencias-skill"], ["perfis-usuario"], ["perfil-criterios", String(perfilId)]];

  const avaliar = useMutacao<Record<string, unknown>, { sugestao_promocao: unknown }>({
    url: "/capacidades/perfis/" + perfilId + "/avaliar/",
    invalidar,
    mensagemSucesso: "Avaliação registrada",
    aoSucesso: (r) => aoConcluir(Boolean(r && r.sugestao_promocao)),
  });

  const endossar = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/perfis/" + perfilId + "/endossar/",
    invalidar,
    mensagemSucesso: "Endosso registrado",
    aoSucesso: () => aoConcluir(false),
  });

  const adicionarEvidencia = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/perfis/" + perfilId + "/evidencias/",
    invalidar,
    mensagemSucesso: "Evidência adicionada",
    aoSucesso: () => aoConcluir(false),
  });

  const creditarXp = useMutacao<Record<string, unknown>, { xp_atual: number; sugestao_promocao: unknown }>({
    url: "/capacidades/perfis/" + perfilId + "/creditar-xp/",
    invalidar,
    mensagemSucesso: "XP creditado",
    aoSucesso: (r) => aoConcluir(Boolean(r && r.sugestao_promocao)),
  });

  const criterios = useConsulta<CriterioPerfil>(
    ["perfil-criterios", perfilId],
    perfil ? "/capacidades/perfis/" + perfilId + "/criterios/" : null
  );

  return (
    <PainelLateral
      aberto={Boolean(perfil)}
      onFechar={onFechar}
      titulo={perfil ? perfil.skill_detalhe?.nome || "Capacidade" : "Ações"}
      subtitulo={perfil ? "Nível " + perfil.nivel_atual + " · " + numero(perfil.xp_acumulado) + " XP" : undefined}
      largura="md"
      rodape={<Botao variante="fantasma" onClick={onFechar}>Fechar</Botao>}
    >
      {perfil && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Atual</p>
              <p className="text-lg font-bold tabular-nums text-fg">{perfil.nivel_atual}</p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Validado</p>
              <p className="text-lg font-bold tabular-nums text-fg">{perfil.nivel_validado || "—"}</p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Desejado</p>
              <p className="text-lg font-bold tabular-nums text-fg">{perfil.nivel_desejado || "—"}</p>
            </div>
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-fg">Progresso para o nível {Math.min(5, perfil.nivel_atual + 1)}</span>
              <span className="font-semibold tabular-nums text-fg">{percentual(perfil.progresso_nivel_percentual, 1)}</span>
            </div>
            <BarraProgresso valor={perfil.progresso_nivel_percentual} cor={corNivel(perfil.nivel_atual)} altura="md" />
            <p className="mt-1 text-2xs text-fg-muted">faltam {numero(perfil.xp_para_proximo_nivel)} XP para o próximo nível</p>
          </div>

          {criterios.data && (
            <div className="rounded-sgp-lg border border-border bg-surface p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-fg">Critérios para o nível {criterios.data.nivel_proposto}</span>
                <Etiqueta tom={criterios.data.elegivel ? "success" : "warning"}>{criterios.data.elegivel ? "Elegível" : numero(criterios.data.progresso, 0) + "%"}</Etiqueta>
              </div>
              <ul className="space-y-1.5">
                {criterios.data.checagens.map((c) => (
                  <li key={c.criterio} className="flex items-start gap-2">
                    {c.atendido
                      ? <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-success-soft text-success"><Check className="size-3" aria-hidden /></span>
                      : <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"><AlertTriangle className="size-3" aria-hidden /></span>}
                    <div className="min-w-0">
                      <p className="text-2xs font-medium text-fg">{c.criterio}</p>
                      <p className="text-2xs text-fg-muted">atual {numero(c.atual, 1)} × exigido {numero(c.exigido, 1)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-sgp-lg border border-border bg-surface p-3">
            <p className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold text-fg"><Zap className="size-3.5" aria-hidden />Creditar XP</p>
            <ControleDeslizante
              valor={formXp.xp}
              onChange={(v) => setFormXp({ ...formXp, xp: v })}
              min={0}
              max={500}
              passo={10}
              rotulo="XP a creditar"
              sufixo=" xp"
              cor="#7C3AED"
              marcos={[0, 100, 200, 300, 500]}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Campo rotulo="Origem" htmlFor="pa-xp-origem">
                <Selecao id="pa-xp-origem" value={formXp.origem} onChange={(e) => setFormXp({ ...formXp, origem: e.target.value })}>
                  <option value="MANUAL">Ajuste manual</option>
                  <option value="TAREFA">Tarefa concluída</option>
                  <option value="TREINAMENTO">Treinamento</option>
                  <option value="MENTORIA">Mentoria</option>
                  <option value="CERTIFICACAO">Certificação</option>
                </Selecao>
              </Campo>
              <Campo rotulo="Motivo" htmlFor="pa-xp-motivo">
                <Entrada id="pa-xp-motivo" value={formXp.motivo} onChange={(e) => setFormXp({ ...formXp, motivo: e.target.value })} />
              </Campo>
            </div>
            <div className="mt-2 flex justify-end">
              <Botao
                tamanho="sm"
                variante="secundario"
                carregando={creditarXp.isPending}
                onClick={() => creditarXp.mutate(
                  { xp: formXp.xp, motivo: formXp.motivo, origem: formXp.origem },
                  { onSuccess: () => sucesso("XP creditado", numero(formXp.xp) + " XP adicionados.") }
                )}
              >
                Creditar XP
              </Botao>
            </div>
          </div>
        </div>
      )}
    </PainelLateral>
  );
}

/* ==========================================================================
   Modal: detalhe do perfil na capacidade
   ========================================================================== */

function ModalDetalheSkill({ perfil, onFechar }: { perfil: PerfilSkill | null; onFechar: () => void }) {
  const historico = useConsulta<{
    historico: HistoricoItem[];
    avaliacoes: AvaliacaoItem[];
    endossos: Array<{ id: number; comentario: string; nivel_sugerido: number; data: string; endorser_detalhe: { nome: string; cor: string; iniciais: string } | null }>;
    evidencias: EvidenciaItem[];
  }>(
    ["perfil-historico", perfil ? perfil.id : 0],
    perfil ? "/capacidades/perfis/" + perfil.id + "/historico/" : null
  );

  return (
    <Modal
      aberto={Boolean(perfil)}
      onFechar={onFechar}
      titulo={perfil ? (perfil.skill_detalhe?.nome || "Capacidade") : "Detalhe"}
      subtitulo={perfil ? "Nível " + perfil.nivel_atual + " · consolidado " + numero(perfil.nivel_efetivo, 2) : undefined}
      largura="lg"
      rodape={<Botao variante="fantasma" onClick={onFechar}>Fechar</Botao>}
    >
      {perfil && (
        <div className="space-y-3">
          {historico.isLoading && <CarregandoBloco rotulo="Carregando histórico..." />}
          {historico.data && (
            <>
              <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
                <h4 className="mb-2 text-xs font-semibold text-fg">Histórico ({numero(historico.data.historico.length)})</h4>
                <ul className="space-y-1.5">
                  {historico.data.historico.slice(0, 12).map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 rounded-sgp border border-border bg-surface p-2">
                      <span className="min-w-0 truncate text-2xs text-fg">N{h.nivel_anterior} → N{h.nivel_novo} · {h.motivo || h.origem_rotulo}</span>
                      <span className="shrink-0 text-2xs text-fg-subtle">{dataCurta(h.data)}</span>
                    </li>
                  ))}
                  {historico.data.historico.length === 0 && <li className="text-2xs text-fg-muted">Sem movimentações.</li>}
                </ul>
              </div>

              <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
                <h4 className="mb-2 text-xs font-semibold text-fg">Endossos ({numero(historico.data.endossos.length)})</h4>
                <ul className="space-y-1.5">
                  {historico.data.endossos.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface p-2">
                      <Avatar nome={e.endorser_detalhe?.nome} cor={e.endorser_detalhe?.cor} iniciais={e.endorser_detalhe?.iniciais} tamanho="xs" />
                      <span className="min-w-0 flex-1 truncate text-2xs text-fg">{e.endorser_detalhe?.nome || "—"} sugere N{e.nivel_sugerido} — {e.comentario || "sem comentário"}</span>
                      <span className="shrink-0 text-2xs text-fg-subtle">{dataCurta(e.data)}</span>
                    </li>
                  ))}
                  {historico.data.endossos.length === 0 && <li className="text-2xs text-fg-muted">Nenhum endosso registrado.</li>}
                </ul>
              </div>

              <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
                <h4 className="mb-2 text-xs font-semibold text-fg">Evidências ({numero(historico.data.evidencias.length)})</h4>
                <ul className="space-y-1.5">
                  {historico.data.evidencias.map((e) => (
                    <li key={e.id} className="rounded-sgp border border-border bg-surface p-2">
                      <p className="text-2xs font-semibold text-fg">{e.tipo_rotulo}: {e.descricao}</p>
                      <p className="text-2xs text-fg-muted">{dataCurta(e.data)} · {e.valida ? "validada por " + (e.validador_nome || "—") : "aguardando validação"}</p>
                    </li>
                  ))}
                  {historico.data.evidencias.length === 0 && <li className="text-2xs text-fg-muted">Nenhuma evidência cadastrada.</li>}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

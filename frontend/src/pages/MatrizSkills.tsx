import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Award, BarChart3, Boxes, CalendarClock, Check, GraduationCap, Grid3x3, History,
  Layers3, Paperclip, Pencil, Plus, ShieldAlert, Sparkles, ThumbsUp, Trash2, UserCheck, Users, X, Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraProgresso, Botao, BotaoIcone, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, ControleDeslizante, Entrada, Etiqueta, Interruptor, KPI, Modal, PainelLateral,
  PilhaAvatares, Selecao, Vazio, useAvisos, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { EscalaCores, GraficoBarras, Heatmap, type BarraItem } from "@/components/charts";
import { useConsulta, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, corNivel, nivelLegenda } from "@/lib/utils";
import { dataCurta, dataHora, numero, percentual } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { ColunaMatrizSkills, LinhaMatrizSkills, PerfilSkill } from "@/lib/types";

/* ==========================================================================
   Matriz colaboradores × capacidades em heatmap (RF-63)
   ========================================================================== */

interface CelulaCobertura {
  skill_id: number;
  nome: string;
  cor: string;
  pessoas: number;
  nivel_medio: number;
  nivel_3_mais: number;
  nivel_4_mais: number;
  criticidade: string;
  em_risco: boolean;
}

interface RespostaMatriz {
  colunas: ColunaMatrizSkills[];
  linhas: LinhaMatrizSkills[];
  cobertura: CelulaCobertura[];
  filtros: {
    areas: string[];
    categorias: Array<{ id: number; nome: string }>;
    tipos: Array<{ valor: string; rotulo: string }>;
  };
  total_pessoas: number;
  total_skills: number;
  gerado_em: string;
}

interface CriterioPerfil {
  nivel_atual: number;
  nivel_proposto: number;
  elegivel: boolean;
  progresso: number;
  checagens: Array<{ criterio: string; atendido: boolean; atual: number; exigido: number; icone: string }>;
}

interface HistoricoItem {
  id: number;
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
  tipo: string;
  tipo_rotulo: string;
  nivel_atribuido: number;
  peso: number;
  comentario: string;
  data: string;
  avaliador_detalhe: { nome: string; cor: string; iniciais: string; avatar_display?: string } | null;
}

interface EndossoItem {
  id: number;
  comentario: string;
  nivel_sugerido: number;
  data: string;
  endorser_detalhe: { nome: string; cor: string; iniciais: string } | null;
}

interface EvidenciaItem {
  id: number;
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

interface RespostaHistorico {
  perfil: PerfilSkill;
  historico: HistoricoItem[];
  avaliacoes: AvaliacaoItem[];
  endossos: EndossoItem[];
  evidencias: EvidenciaItem[];
  criterios_proximo_nivel: CriterioPerfil;
}

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

type AbaMatriz = "matriz" | "cobertura";

export default function MatrizSkills() {
  const navegar = useNavigate();
  const [aba, setAba] = useState<AbaMatriz>("matriz");
  const [area, setArea] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [limiteSkills, setLimiteSkills] = useState(40);
  const [limitePessoas, setLimitePessoas] = useState(60);
  const [celula, setCelula] = useState<{ linha: LinhaMatrizSkills; coluna: ColunaMatrizSkills; perfilId: number | null } | null>(null);

  const matriz = useConsulta<RespostaMatriz>(CHAVES.matrizSkills, "/capacidades/perfis/matriz/", {
    area: area || undefined,
    categoria: categoria || undefined,
    tipo: tipo || undefined,
    limite_skills: limiteSkills,
    limite_pessoas: limitePessoas,
  });

  const dados = matriz.data;
  const linhas = dados?.linhas || [];
  const colunas = dados?.colunas || [];
  const cobertura = dados?.cobertura || [];

  const resumo = useMemo(() => {
    const skillsSemEspecialista = cobertura.filter((c) => c.nivel_4_mais === 0).length;
    const mediaNivel = linhas.length ? linhas.reduce((a, l) => a + (l.nivel_medio || 0), 0) / linhas.length : 0;
    const celulasPreenchidas = linhas.reduce((a, l) => a + l.celulas.filter((c) => c.nivel > 0).length, 0);
    return { skillsSemEspecialista, mediaNivel, celulasPreenchidas };
  }, [cobertura, linhas]);

  const aoClicarCelula = (linhaId: string | number, colunaId: string | number) => {
    const linha = linhas.find((l) => String(l.user_id) === String(linhaId));
    const coluna = colunas.find((c) => String(c.skill_id) === String(colunaId));
    if (!linha || !coluna) return;
    const registro = linha.celulas.find((c) => String(c.skill_id) === String(colunaId));
    setCelula({ linha, coluna, perfilId: registro?.employee_skill_id ?? null });
  };

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Matriz de capacidades"
        subtitulo={numero(dados?.total_pessoas || 0) + " colaboradores · " + numero(colunas.length) + " capacidades no recorte de " + numero(dados?.total_skills || 0) + " do catálogo"}
        icone={Grid3x3}
        cor="#0891B2"
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Capacidades", onClick: () => navegar("/capacidades") },
          { rotulo: "Matriz" },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={ShieldAlert} onClick={() => navegar("/gap")}>Análise de gap</Botao>
            <Botao variante="secundario" icone={Users} onClick={() => navegar("/pessoas")}>Diretório de pessoas</Botao>
          </>
        }
        filhos={
          <>
            <Abas
              valor={aba}
              onChange={(v) => setAba(v)}
              abas={[
                { valor: "matriz", rotulo: "Heatmap", icone: Grid3x3, contagem: linhas.length * colunas.length },
                { valor: "cobertura", rotulo: "Cobertura", icone: BarChart3, contagem: cobertura.length },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI rotulo="Pessoas no recorte" valor={numero(linhas.length)} icone={Users} cor="#2563EB" subrotulo={numero(resumo.celulasPreenchidas) + " capacidades registradas"} compacto />
        <KPI rotulo="Nível médio da equipe" valor={numero(resumo.mediaNivel, 2)} icone={Layers3} cor="#059669" subrotulo="escala 1 a 5" compacto />
        <KPI rotulo="Capacidades no recorte" valor={numero(colunas.length)} icone={Boxes} cor="#6366F1" subrotulo={numero(dados?.total_skills || 0) + " no catálogo"} compacto />
        <KPI rotulo="Sem especialista (N4+)" valor={numero(resumo.skillsSemEspecialista)} icone={AlertTriangle} cor="#DC2626" subrotulo="candidatas a bus factor" compacto />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Área</span>
          <select value={area} onChange={(e) => setArea(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todas</option>
            {(dados?.filtros?.areas || []).map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todas</option>
            {(dados?.filtros?.categorias || []).map((c) => (<option key={c.id} value={c.id}>{c.nome}</option>))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todos</option>
            {(dados?.filtros?.tipos || []).map((t) => (<option key={t.valor} value={t.valor}>{t.rotulo}</option>))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Skills</span>
          <input type="number" min={5} max={200} value={limiteSkills} onChange={(e) => setLimiteSkills(Number(e.target.value))} className="h-8 w-20 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand" />
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Pessoas</span>
          <input type="number" min={5} max={300} value={limitePessoas} onChange={(e) => setLimitePessoas(Number(e.target.value))} className="h-8 w-20 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand" />
        </label>
        {(area || categoria || tipo) && (
          <Botao tamanho="xs" variante="fantasma" icone={X} onClick={() => { setArea(""); setCategoria(""); setTipo(""); }}>Limpar filtros</Botao>
        )}
      </div>

      {matriz.isLoading && <CarregandoBloco rotulo="Montando a matriz de capacidades..." />}
      {matriz.isError && <Alerta tom="danger" titulo="Não foi possível carregar a matriz">{mensagemErro(matriz.error)}</Alerta>}

      {dados && aba === "matriz" && (
        linhas.length === 0 || colunas.length === 0 ? (
          <Vazio
            icone={Grid3x3}
            titulo="Matriz sem dados no recorte"
            descricao="Ajuste os filtros de área, categoria ou tipo — ou registre capacidades nos perfis dos colaboradores."
            acao={<Botao variante="secundario" onClick={() => { setArea(""); setCategoria(""); setTipo(""); }}>Limpar filtros</Botao>}
          />
        ) : (
          <div className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
            <Heatmap
              linhas={linhas.map((l) => ({
                id: l.user_id,
                rotulo: l.nome,
                sub: (l.area || l.cargo || "") + " · média " + numero(l.nivel_medio, 2) + " · " + numero(l.total_skills) + " skills",
                cor: l.cor,
                avatar: <Avatar nome={l.nome} cor={l.cor} iniciais={l.iniciais} tamanho="sm" />,
              }))}
              colunas={colunas.map((c) => ({
                id: c.skill_id,
                rotulo: c.nome,
                sub: numero(c.detentores) + " detentor(es) · N4+ " + numero(c.bus_factor),
                cor: c.cor,
                icone: <Sparkles className="size-3" style={{ color: c.cor }} aria-hidden />,
              }))}
              celulas={(linhaId, colunaId) => {
                const linha = linhas.find((l) => String(l.user_id) === String(linhaId));
                const celulaAtual = linha?.celulas.find((c) => String(c.skill_id) === String(colunaId));
                const coluna = colunas.find((c) => String(c.skill_id) === String(colunaId));
                if (!celulaAtual || celulaAtual.nivel === 0) {
                  return {
                    valor: 0,
                    rotulo: linha?.nome + " · " + coluna?.nome + ": sem registro",
                    detalhe: (
                      <span>
                        <strong className="text-fg">{linha?.nome}</strong> ainda não possui{" "}
                        <strong className="text-fg">{coluna?.nome}</strong> no perfil. Clique para adicionar.
                      </span>
                    ),
                  };
                }
                return {
                  valor: celulaAtual.nivel,
                  cor: corNivel(celulaAtual.nivel),
                  rotulo: linha?.nome + " · " + coluna?.nome + ": N" + celulaAtual.nivel,
                  detalhe: (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-fg">{linha?.nome}</p>
                      <p className="text-fg-muted">{coluna?.nome} · nível {celulaAtual.nivel}</p>
                      <p className="text-fg-muted">consolidado {numero(celulaAtual.consolidado, 2)} · validado {celulaAtual.validado || "—"}</p>
                      <p className="text-fg-muted">desejado {celulaAtual.desejado || "—"} · XP {numero(celulaAtual.xp)}</p>
                    </div>
                  ),
                };
              }}
              maximo={5}
              formatoValor={(v) => (v ? String(v) : "—")}
              larguraColuna={36}
              larguraLinha={210}
              aoClicarCelula={aoClicarCelula}
              legenda={
                <div className="flex flex-wrap items-center gap-3">
                  <EscalaCores rotulos={["1", "2", "3", "4", "5"]} cores={CORES_ESCALA} titulo="Nível" />
                  <span className="text-2xs text-fg-muted">Células vazias indicam capacidade ainda não registrada no perfil — clique para incluir.</span>
                </div>
              }
            />
          </div>
        )
      )}

      {dados && aba === "cobertura" && <AbaCobertura cobertura={cobertura} aoAbrirSkill={(id) => navegar("/capacidades/skills/" + id)} />}

      <PainelPerfil
        celula={celula}
        onFechar={() => setCelula(null)}
        aoAtualizar={() => matriz.refetch()}
        aoAbrirPessoa={(id) => navegar("/pessoas/" + id)}
      />
    </div>
  );
}

/* ==========================================================================
   Aba: cobertura por capacidade
   ========================================================================== */

function AbaCobertura({ cobertura, aoAbrirSkill }: { cobertura: CelulaCobertura[]; aoAbrirSkill: (id: number) => void }) {
  if (!cobertura.length) {
    return <Vazio icone={BarChart3} titulo="Sem dados de cobertura" descricao="A matriz não retornou capacidades para o recorte selecionado." />;
  }

  const barras3: BarraItem[] = cobertura.slice(0, 18).map((c) => ({
    rotulo: c.nome,
    valor: c.nivel_3_mais,
    comparativo: c.pessoas,
    cor: c.nivel_3_mais === 0 ? "#DC2626" : c.nivel_3_mais <= 1 ? "#F59E0B" : c.cor || "#059669",
  }));
  const barras4: BarraItem[] = cobertura.slice(0, 18).map((c) => ({
    rotulo: c.nome,
    valor: c.nivel_4_mais,
    cor: c.nivel_4_mais === 0 ? "#DC2626" : c.nivel_4_mais <= 1 ? "#F59E0B" : "#7C3AED",
  }));

  const semEspecialista = cobertura.filter((c) => c.nivel_4_mais === 0);
  const comUmEspecialista = cobertura.filter((c) => c.nivel_4_mais === 1);

  return (
    <div className="space-y-3">
      <GradeCards colunas="3">
        <KPI rotulo="Capacidades no recorte" valor={numero(cobertura.length)} icone={Boxes} cor="#2563EB" compacto />
        <KPI rotulo="Sem nível 4 ou superior" valor={numero(semEspecialista.length)} icone={AlertTriangle} cor="#DC2626" subrotulo="risco de dependência total" compacto />
        <KPI rotulo="Com apenas um especialista" valor={numero(comUmEspecialista.length)} icone={ShieldAlert} cor="#F59E0B" subrotulo="bus factor igual a 1" compacto />
      </GradeCards>

      {(semEspecialista.length > 0 || comUmEspecialista.length > 0) && (
        <Alerta tom="danger" titulo="Capacidades com cobertura crítica" icone={AlertTriangle}>
          <div className="flex flex-wrap gap-1.5">
            {[...semEspecialista, ...comUmEspecialista].slice(0, 12).map((c) => (
              <Chip key={c.skill_id} cor={c.nivel_4_mais === 0 ? "#DC2626" : "#F59E0B"} onClick={() => aoAbrirSkill(c.skill_id)}>
                {c.nome} · N4+ {c.nivel_4_mais}
              </Chip>
            ))}
          </div>
        </Alerta>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-1 text-sm font-semibold text-fg">Pessoas com nível ≥ 3</h3>
          <p className="mb-3 text-2xs text-fg-muted">Barra colorida = pessoas com nível ≥ 3; fundo cinza = total de pessoas com a capacidade registrada.</p>
          <GraficoBarras itens={barras3} horizontal formatarValor={(v) => numero(v) + " pessoa(s)"} />
        </div>
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-1 text-sm font-semibold text-fg">Pessoas com nível ≥ 4</h3>
          <p className="mb-3 text-2xs text-fg-muted">Detentores aptos a sustentar a capacidade e atuar como mentores (bus factor).</p>
          <GraficoBarras itens={barras4} horizontal formatarValor={(v) => numero(v) + " especialista(s)"} />
        </div>
      </div>

      <div className="overflow-auto rounded-sgp-lg border border-border bg-surface shadow-n1 scroll-thin">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">Capacidade</th>
              <th className="px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">Criticidade</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">Pessoas</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">Nível médio</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">N3+</th>
              <th className="px-3 py-2 text-right text-2xs font-semibold uppercase tracking-wide text-fg-muted">N4+</th>
              <th className="px-3 py-2 text-center text-2xs font-semibold uppercase tracking-wide text-fg-muted">Risco</th>
            </tr>
          </thead>
          <tbody>
            {cobertura.map((c) => (
              <tr key={c.skill_id} className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-surface-2" onClick={() => aoAbrirSkill(c.skill_id)}>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                    <span className="text-xs font-medium text-fg">{c.nome}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-fg-muted">{c.criticidade}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-fg">{numero(c.pessoas)}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-fg">{numero(c.nivel_medio, 2)}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-fg">{numero(c.nivel_3_mais)}</td>
                <td className={cn("px-3 py-2 text-right text-xs font-semibold tabular-nums", c.nivel_4_mais <= 1 ? "text-danger" : "text-fg")}>{numero(c.nivel_4_mais)}</td>
                <td className="px-3 py-2 text-center">
                  {c.em_risco || c.nivel_4_mais <= 1 ? <Etiqueta tom="danger" icone={AlertTriangle}>Bus factor</Etiqueta> : <Etiqueta tom="success">Coberto</Etiqueta>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==========================================================================
   Painel: perfil do colaborador na capacidade selecionada
   ========================================================================== */

function PainelPerfil({
  celula, onFechar, aoAtualizar, aoAbrirPessoa,
}: {
  celula: { linha: LinhaMatrizSkills; coluna: ColunaMatrizSkills; perfilId: number | null } | null;
  onFechar: () => void;
  aoAtualizar: () => void;
  aoAbrirPessoa: (id: number) => void;
}) {
  const { sucesso } = useAvisos();
  const { pode } = useAuth();
  const podeEditar = pode("capacidade.editar");
  const perfilId = celula?.perfilId ?? null;
  const [abaPainel, setAbaPainel] = useState<"detalhe" | "criterios">("detalhe");
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [formVinculo, setFormVinculo] = useState({ nivel_desejado: 0, visibilidade: "PUBLICO", destaque: false });
  const [evidenciaEditando, setEvidenciaEditando] = useState<EvidenciaItem | null>(null);
  const [evidenciaParaExcluir, setEvidenciaParaExcluir] = useState<EvidenciaItem | null>(null);
  const [formEvidenciaEdicao, setFormEvidenciaEdicao] = useState({
    tipo: "PROJETO",
    descricao: "",
    url: "",
    data: "",
    emitido_por: "",
  });
  const [formAvaliacao, setFormAvaliacao] = useState({ tipo: "GESTOR", nivel_atribuido: 3, peso: 1, comentario: "" });
  const [formEndosso, setFormEndosso] = useState({ nivel_sugerido: 3, comentario: "" });
  const [formEvidencia, setFormEvidencia] = useState({ tipo: "PROJETO", descricao: "", url: "", data: "", emitido_por: "" });
  const [formXp, setFormXp] = useState({ xp: 50, motivo: "", origem: "MANUAL" });
  const [novaSkillNivel, setNovaSkillNivel] = useState(3);

  const historico = useConsulta<RespostaHistorico>(
    ["perfil-historico", perfilId],
    perfilId ? "/capacidades/perfis/" + perfilId + "/historico/" : null
  );
  const criterios = useConsulta<CriterioPerfil>(
    ["perfil-criterios", perfilId],
    perfilId ? "/capacidades/perfis/" + perfilId + "/criterios/" : null
  );

  const invalidar = [CHAVES.matrizSkills, CHAVES.perfisSkill, ["perfil-historico", String(perfilId)], ["perfil-criterios", String(perfilId)]];

  const aoSucessoMutacao = () => { historico.refetch(); criterios.refetch(); aoAtualizar(); };

  const avaliar = useMutacao<Record<string, unknown>, { sugestao_promocao: unknown }>({
    url: "/capacidades/perfis/" + (perfilId || 0) + "/avaliar/",
    invalidar,
    mensagemSucesso: "Avaliação registrada",
    aoSucesso: aoSucessoMutacao,
  });

  const endossar = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/perfis/" + (perfilId || 0) + "/endossar/",
    invalidar,
    mensagemSucesso: "Endosso registrado",
    aoSucesso: aoSucessoMutacao,
  });

  const adicionarEvidencia = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/perfis/" + (perfilId || 0) + "/evidencias/",
    invalidar,
    mensagemSucesso: "Evidência adicionada ao perfil",
    aoSucesso: aoSucessoMutacao,
  });

  const validarEvidencia = useMutacao<{ evidenciaId: number }, unknown>({
    url: (v) => "/capacidades/perfis/" + (perfilId || 0) + "/validar-evidencia/" + v.evidenciaId + "/",
    invalidar,
    mensagemSucesso: "Validação da evidência atualizada",
    aoSucesso: aoSucessoMutacao,
  });

  const creditarXp = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/perfis/" + (perfilId || 0) + "/creditar-xp/",
    invalidar,
    mensagemSucesso: "XP creditado no perfil",
    aoSucesso: aoSucessoMutacao,
  });

  const criarPerfil = useMutacao<Record<string, unknown>, PerfilSkill>({
    url: "/capacidades/perfis/",
    invalidar: [CHAVES.matrizSkills, CHAVES.perfisSkill],
    mensagemSucesso: "Capacidade adicionada ao perfil",
    aoSucesso: () => { onFechar(); aoAtualizar(); },
  });

  const editarVinculo = useMutacao<Record<string, unknown>, PerfilSkill>({
    metodo: "patch",
    url: "/capacidades/perfis/" + (perfilId || 0) + "/",
    invalidar,
    mensagemSucesso: "Vínculo de capacidade atualizado",
    aoSucesso: aoSucessoMutacao,
  });

  const removerVinculo = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/capacidades/perfis/" + v.id + "/",
    invalidar: [CHAVES.matrizSkills, CHAVES.perfisSkill, ["perfis-usuario"]],
    mensagemSucesso: "Capacidade removida do perfil",
    aoSucesso: () => {
      setConfirmarRemocao(false);
      onFechar();
      aoAtualizar();
    },
  });

  const editarEvidencia = useMutacao<{ id: number } & Record<string, unknown>, unknown>({
    metodo: "patch",
    url: (v) => "/capacidades/evidencias/" + v.id + "/",
    invalidar,
    mensagemSucesso: "Evidência atualizada",
    aoSucesso: () => {
      setEvidenciaEditando(null);
      aoSucessoMutacao();
    },
  });

  const excluirEvidencia = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/capacidades/evidencias/" + v.id + "/",
    invalidar,
    mensagemSucesso: "Evidência excluída",
    aoSucesso: () => {
      setEvidenciaParaExcluir(null);
      aoSucessoMutacao();
    },
  });

  const abrirEdicaoEvidencia = (ev: EvidenciaItem) => {
    setFormEvidenciaEdicao({
      tipo: ev.tipo,
      descricao: ev.descricao,
      url: ev.url || "",
      data: ev.data || "",
      emitido_por: ev.emitido_por || "",
    });
    setEvidenciaEditando(ev);
  };

  const perfil = historico.data?.perfil;
  const crit = criterios.data || historico.data?.criterios_proximo_nivel;
  // O servidor devolve pode_editar no vinculo e na evidencia: o dono ajusta o
  // que e seu e capacidade.editar segue como alternativa para os gestores.
  const podeEditarVinculo = Boolean(perfil?.pode_editar) || podeEditar;
  const podeEditarEvidencia = (ev: EvidenciaItem) => Boolean(ev.pode_editar) || podeEditarVinculo;

  useEffect(() => {
    if (!perfil) return;
    setFormVinculo({
      nivel_desejado: perfil.nivel_desejado || 0,
      visibilidade: perfil.visibilidade || "PUBLICO",
      destaque: Boolean(perfil.destaque),
    });
  }, [perfil?.id]);

  return (
    <PainelLateral
      aberto={Boolean(celula)}
      onFechar={onFechar}
      titulo={celula?.linha.nome || "Perfil"}
      subtitulo={celula?.coluna.nome}
      largura="lg"
      rodape={
        celula ? (
          <Botao variante="fantasma" icone={UserCheck} onClick={() => aoAbrirPessoa(celula.linha.user_id)}>Abrir perfil completo</Botao>
        ) : undefined
      }
    >
      {celula && !perfilId && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Capacidade não registrada">
            {celula.linha.nome} ainda não possui {celula.coluna.nome} no perfil de capacidades. Defina o nível inicial para criar o vínculo.
          </Alerta>
          <div className="rounded-sgp-lg border border-border bg-surface p-4">
            <ControleDeslizante
              valor={novaSkillNivel}
              onChange={setNovaSkillNivel}
              min={1}
              max={5}
              rotulo="Nível inicial"
              sufixo=""
              cor={corNivel(novaSkillNivel)}
              marcos={[1, 2, 3, 4, 5]}
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-md text-xs font-bold text-white" style={{ backgroundColor: corNivel(novaSkillNivel) }}>N{novaSkillNivel}</span>
              <span className="text-xs text-fg-muted">{nivelLegenda().find((n) => n.nivel === novaSkillNivel)?.nome}</span>
            </div>
            <div className="mt-3 flex justify-end">
              <Botao
                variante="primario"
                icone={Plus}
                carregando={criarPerfil.isPending}
                onClick={() =>
                  criarPerfil.mutate({
                    user: celula.linha.user_id,
                    skill: celula.coluna.skill_id,
                    nivel_atual: novaSkillNivel,
                    nivel_desejado: Math.min(5, novaSkillNivel + 1),
                    status: "ATIVA",
                  })
                }
              >
                Adicionar capacidade ao perfil
              </Botao>
            </div>
          </div>
          <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
            <p className="text-2xs text-fg-muted">
              Detentores atuais de {celula.coluna.nome}: {numero(celula.coluna.detentores)} · nível médio {numero(celula.coluna.nivel_medio, 2)} ·
              especialistas N4+ {numero(celula.coluna.bus_factor)}.
            </p>
          </div>
        </div>
      )}

      {celula && perfilId && (
        <div className="space-y-4">
          {historico.isLoading && <CarregandoBloco rotulo="Carregando perfil de capacidade..." />}
          {historico.isError && <Alerta tom="danger" titulo="Não foi possível carregar o perfil">{mensagemErro(historico.error)}</Alerta>}

          {perfil && (
            <>
              <div className="flex items-center gap-3">
                <Avatar nome={celula.linha.nome} cor={celula.linha.cor} iniciais={celula.linha.iniciais} tamanho="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-fg">{celula.linha.nome}</p>
                  <p className="truncate text-2xs text-fg-muted">{celula.linha.cargo}{celula.linha.area ? " · " + celula.linha.area : ""}</p>
                </div>
                <span className="grid size-11 place-items-center rounded-sgp-lg text-sm font-bold text-white" style={{ backgroundColor: corNivel(perfil.nivel_atual) }}>N{perfil.nivel_atual}</span>
              </div>

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
                <p className="mt-1 text-2xs text-fg-muted">
                  {numero(perfil.xp_acumulado)} XP acumulado · faltam {numero(perfil.xp_para_proximo_nivel)} XP
                  {perfil.ultima_utilizacao ? " · última utilização " + dataCurta(perfil.ultima_utilizacao) : ""}
                </p>
              </div>

              <Abas
                valor={abaPainel}
                onChange={(v) => setAbaPainel(v)}
                abas={[
                  { valor: "detalhe", rotulo: "Histórico", icone: History, contagem: historico.data?.historico.length || 0 },
                  { valor: "criterios", rotulo: "Critérios", icone: Award, contagem: crit?.checagens.length || 0 },
                ]}
              />

              {abaPainel === "detalhe" && (
                <div className="space-y-4">
                  <TimelineVertical itens={historico.data?.historico || []} />

                  <div className="rounded-sgp-lg border border-border bg-surface p-3">
                    <h4 className="mb-2 text-xs font-semibold text-fg">Avaliações ({numero(historico.data?.avaliacoes.length || 0)})</h4>
                    {(historico.data?.avaliacoes || []).length === 0 ? (
                      <p className="text-2xs text-fg-muted">Nenhuma avaliação registrada.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {(historico.data?.avaliacoes || []).map((a) => (
                          <li key={a.id} className="flex items-start gap-2 rounded-sgp border border-border bg-surface-2 p-2">
                            <Avatar nome={a.avaliador_detalhe?.nome} cor={a.avaliador_detalhe?.cor} iniciais={a.avaliador_detalhe?.iniciais} tamanho="xs" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-2xs font-semibold text-fg">{a.tipo_rotulo} · N{a.nivel_atribuido}</p>
                              <p className="truncate text-2xs text-fg-muted">{a.comentario || "Sem comentário"}</p>
                            </div>
                            <span className="shrink-0 text-2xs text-fg-subtle">{dataCurta(a.data)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-sgp-lg border border-border bg-surface p-3">
                    <h4 className="mb-2 text-xs font-semibold text-fg">Endossos ({numero(historico.data?.endossos.length || 0)})</h4>
                    {(historico.data?.endossos || []).length === 0 ? (
                      <p className="text-2xs text-fg-muted">Nenhum endosso de par ou mentor.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {(historico.data?.endossos || []).map((e) => (
                          <li key={e.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 p-2">
                            <Avatar nome={e.endorser_detalhe?.nome} cor={e.endorser_detalhe?.cor} iniciais={e.endorser_detalhe?.iniciais} tamanho="xs" />
                            <span className="min-w-0 flex-1 truncate text-2xs text-fg">{e.endorser_detalhe?.nome} sugere N{e.nivel_sugerido}</span>
                            <span className="shrink-0 text-2xs text-fg-subtle">{dataCurta(e.data)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-sgp-lg border border-border bg-surface p-3">
                    <h4 className="mb-2 text-xs font-semibold text-fg">Evidências ({numero(historico.data?.evidencias.length || 0)})</h4>
                    {(historico.data?.evidencias || []).length === 0 ? (
                      <p className="text-2xs text-fg-muted">Nenhuma evidência cadastrada.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {(historico.data?.evidencias || []).map((ev) => (
                          <li key={ev.id} className="rounded-sgp border border-border bg-surface-2 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-2xs font-semibold text-fg">{ev.tipo_rotulo}: {ev.descricao}</p>
                                <p className="truncate text-2xs text-fg-muted">
                                  {dataCurta(ev.data)}{ev.emitido_por ? " · " + ev.emitido_por : ""}
                                  {ev.valida ? " · validada por " + (ev.validador_nome || "—") : " · aguardando validação"}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {ev.url && (
                                  <a href={ev.url} target="_blank" rel="noreferrer" className="text-2xs font-semibold text-brand underline">Abrir</a>
                                )}
                                <Botao
                                  tamanho="xs"
                                  variante={ev.valida ? "sucesso" : "secundario"}
                                  icone={ev.valida ? Check : Paperclip}
                                  carregando={validarEvidencia.isPending}
                                  onClick={() => validarEvidencia.mutate({ evidenciaId: ev.id })}
                                >
                                  {ev.valida ? "Validada" : "Validar"}
                                </Botao>
                                {podeEditarEvidencia(ev) && (
                                  <>
                                    <BotaoIcone
                                      icone={Pencil}
                                      rotulo={"Editar evidência " + ev.descricao}
                                      tamanho="xs"
                                      onClick={() => abrirEdicaoEvidencia(ev)}
                                    />
                                    <BotaoIcone
                                      icone={Trash2}
                                      rotulo={"Excluir evidência " + ev.descricao}
                                      tamanho="xs"
                                      onClick={() => setEvidenciaParaExcluir(ev)}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {abaPainel === "criterios" && crit && (
                <div className="space-y-3">
                  <div className="rounded-sgp-lg border border-border bg-surface p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-fg">Progresso para o nível {crit.nivel_proposto}</span>
                      <Etiqueta tom={crit.elegivel ? "success" : "warning"} icone={crit.elegivel ? Check : CalendarClock}>
                        {crit.elegivel ? "Elegível" : "Não elegível"}
                      </Etiqueta>
                    </div>
                    <BarraProgresso valor={crit.progresso} cor={crit.elegivel ? "#059669" : "#D97706"} altura="md" mostrarValor />
                  </div>
                  <ul className="space-y-1.5">
                    {crit.checagens.map((c) => (
                      <li key={c.criterio} className="flex items-start gap-2 rounded-sgp border border-border bg-surface p-2.5">
                        {c.atendido ? (
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success"><Check className="size-3" aria-hidden /></span>
                        ) : (
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"><X className="size-3" aria-hidden /></span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-2xs font-semibold text-fg">{c.criterio}</p>
                          <p className="text-2xs text-fg-muted">atual {numero(c.atual, 1)} × exigido {numero(c.exigido, 1)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3 rounded-sgp-lg border border-border bg-surface p-3">
                <h4 className="text-xs font-semibold text-fg">Ações rápidas</h4>

                {podeEditarVinculo && (
                  <div className="rounded-sgp border border-border bg-surface-2 p-3">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold text-fg"><Pencil className="size-3.5" aria-hidden />Editar vínculo da capacidade</p>
                    <p className="mb-2 text-2xs text-fg-muted">
                      O próprio colaborador ajusta o nível desejado, a visibilidade e o destaque deste vínculo; o nível validado é definido pelo avaliador.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Campo rotulo="Nível desejado" htmlFor="pv-desejado">
                        <Selecao
                          id="pv-desejado"
                          value={formVinculo.nivel_desejado}
                          onChange={(e) => setFormVinculo({ ...formVinculo, nivel_desejado: Number(e.target.value) })}
                        >
                          <option value={0}>Não definido</option>
                          {nivelLegenda().map((n) => (
                            <option key={n.nivel} value={n.nivel}>{n.nivel} — {n.nome}</option>
                          ))}
                        </Selecao>
                      </Campo>
                      <Campo rotulo="Visibilidade" htmlFor="pv-visibilidade">
                        <Selecao
                          id="pv-visibilidade"
                          value={formVinculo.visibilidade}
                          onChange={(e) => setFormVinculo({ ...formVinculo, visibilidade: e.target.value })}
                        >
                          <option value="PUBLICO">Público</option>
                          <option value="RESTRITO">Restrito (gestor e RH)</option>
                          <option value="PRIVADO">Privado</option>
                        </Selecao>
                      </Campo>
                    </div>
                    <div className="mt-2">
                      <Interruptor
                        ativo={formVinculo.destaque}
                        onChange={(v) => setFormVinculo({ ...formVinculo, destaque: v })}
                        rotulo="Destacar no perfil"
                        descricao="Capacidades em destaque aparecem no topo do perfil do colaborador."
                        tamanho="sm"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <Botao tamanho="xs" variante="fantasma" icone={Trash2} onClick={() => setConfirmarRemocao(true)}>
                        Remover capacidade do perfil
                      </Botao>
                      <Botao
                        tamanho="xs"
                        variante="primario"
                        icone={Check}
                        carregando={editarVinculo.isPending}
                        onClick={() =>
                          editarVinculo.mutate({
                            nivel_desejado: formVinculo.nivel_desejado,
                            visibilidade: formVinculo.visibilidade,
                            destaque: formVinculo.destaque,
                          })
                        }
                      >
                        Salvar vínculo
                      </Botao>
                    </div>
                  </div>
                )}

                <div className="rounded-sgp border border-border bg-surface-2 p-3">
                  <p className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold text-fg"><Award className="size-3.5" aria-hidden />Registrar avaliação</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo rotulo="Tipo" htmlFor="av-tipo">
                      <Selecao id="av-tipo" value={formAvaliacao.tipo} onChange={(e) => setFormAvaliacao({ ...formAvaliacao, tipo: e.target.value })}>
                        {TIPOS_AVALIACAO.map((t) => (<option key={t.valor} value={t.valor}>{t.rotulo}</option>))}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Nível atribuído" htmlFor="av-nivel">
                      <Selecao id="av-nivel" value={formAvaliacao.nivel_atribuido} onChange={(e) => setFormAvaliacao({ ...formAvaliacao, nivel_atribuido: Number(e.target.value) })}>
                        {nivelLegenda().map((n) => (<option key={n.nivel} value={n.nivel}>{n.nivel} — {n.nome}</option>))}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Comentário" htmlFor="av-com" className="col-span-2">
                      <AreaTexto id="av-com" rows={2} value={formAvaliacao.comentario} onChange={(e) => setFormAvaliacao({ ...formAvaliacao, comentario: e.target.value })} />
                    </Campo>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Botao
                      tamanho="sm"
                      variante="primario"
                      carregando={avaliar.isPending}
                      onClick={() => avaliar.mutate({ tipo: formAvaliacao.tipo, nivel_atribuido: formAvaliacao.nivel_atribuido, comentario: formAvaliacao.comentario, peso: 1 })}
                    >
                      Registrar avaliação
                    </Botao>
                  </div>
                </div>

                <div className="rounded-sgp border border-border bg-surface-2 p-3">
                  <p className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold text-fg"><ThumbsUp className="size-3.5" aria-hidden />Endossar capacidade</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo rotulo="Nível sugerido" htmlFor="en-nivel">
                      <Selecao id="en-nivel" value={formEndosso.nivel_sugerido} onChange={(e) => setFormEndosso({ ...formEndosso, nivel_sugerido: Number(e.target.value) })}>
                        {nivelLegenda().map((n) => (<option key={n.nivel} value={n.nivel}>{n.nivel} — {n.nome}</option>))}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Comentário" htmlFor="en-com">
                      <Entrada id="en-com" value={formEndosso.comentario} onChange={(e) => setFormEndosso({ ...formEndosso, comentario: e.target.value })} />
                    </Campo>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Botao tamanho="sm" variante="secundario" carregando={endossar.isPending} onClick={() => endossar.mutate({ comentario: formEndosso.comentario, nivel_sugerido: formEndosso.nivel_sugerido })}>
                      Endossar
                    </Botao>
                  </div>
                </div>

                <div className="rounded-sgp border border-border bg-surface-2 p-3">
                  <p className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold text-fg"><Paperclip className="size-3.5" aria-hidden />Adicionar evidência</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo rotulo="Tipo" htmlFor="ev-tipo">
                      <Selecao id="ev-tipo" value={formEvidencia.tipo} onChange={(e) => setFormEvidencia({ ...formEvidencia, tipo: e.target.value })}>
                        {TIPOS_EVIDENCIA.map((t) => (<option key={t.valor} value={t.valor}>{t.rotulo}</option>))}
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Data" htmlFor="ev-data">
                      <Entrada id="ev-data" type="date" value={formEvidencia.data} onChange={(e) => setFormEvidencia({ ...formEvidencia, data: e.target.value })} />
                    </Campo>
                    <Campo rotulo="Descrição" htmlFor="ev-desc" className="col-span-2" obrigatorio>
                      <Entrada id="ev-desc" value={formEvidencia.descricao} onChange={(e) => setFormEvidencia({ ...formEvidencia, descricao: e.target.value })} placeholder="Ex.: liderou a migração do serviço de pagamentos" />
                    </Campo>
                    <Campo rotulo="Link" htmlFor="ev-url">
                      <Entrada id="ev-url" value={formEvidencia.url} onChange={(e) => setFormEvidencia({ ...formEvidencia, url: e.target.value })} placeholder="https://" />
                    </Campo>
                    <Campo rotulo="Emitido por" htmlFor="ev-emit">
                      <Entrada id="ev-emit" value={formEvidencia.emitido_por} onChange={(e) => setFormEvidencia({ ...formEvidencia, emitido_por: e.target.value })} />
                    </Campo>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Botao
                      tamanho="sm"
                      variante="secundario"
                      carregando={adicionarEvidencia.isPending}
                      disabled={!formEvidencia.descricao.trim()}
                      onClick={() =>
                        adicionarEvidencia.mutate({
                          tipo: formEvidencia.tipo,
                          descricao: formEvidencia.descricao,
                          url: formEvidencia.url,
                          data: formEvidencia.data || undefined,
                          emitido_por: formEvidencia.emitido_por,
                        })
                      }
                    >
                      Adicionar evidência
                    </Botao>
                  </div>
                </div>

                <div className="rounded-sgp border border-border bg-surface-2 p-3">
                  <p className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold text-fg"><Zap className="size-3.5" aria-hidden />Creditar XP manual</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Campo rotulo="XP" htmlFor="xp-valor">
                      <Entrada id="xp-valor" type="number" value={formXp.xp} onChange={(e) => setFormXp({ ...formXp, xp: Number(e.target.value) })} />
                    </Campo>
                    <Campo rotulo="Origem" htmlFor="xp-origem">
                      <Selecao id="xp-origem" value={formXp.origem} onChange={(e) => setFormXp({ ...formXp, origem: e.target.value })}>
                        <option value="MANUAL">Ajuste manual</option>
                        <option value="TAREFA">Tarefa concluída</option>
                        <option value="TREINAMENTO">Treinamento</option>
                        <option value="MENTORIA">Mentoria</option>
                        <option value="CERTIFICACAO">Certificação</option>
                      </Selecao>
                    </Campo>
                    <Campo rotulo="Motivo" htmlFor="xp-motivo" className="col-span-2">
                      <Entrada id="xp-motivo" value={formXp.motivo} onChange={(e) => setFormXp({ ...formXp, motivo: e.target.value })} placeholder="Ex.: evidência validada pela banca" />
                    </Campo>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Botao
                      tamanho="sm"
                      variante="secundario"
                      carregando={creditarXp.isPending}
                      onClick={() => creditarXp.mutate({ xp: formXp.xp, motivo: formXp.motivo, origem: formXp.origem }, { onSuccess: () => sucesso("XP creditado", numero(formXp.xp) + " XP adicionados a " + celula.coluna.nome) })}
                    >
                      Creditar XP
                    </Botao>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      <Modal
        aberto={confirmarRemocao}
        onFechar={() => setConfirmarRemocao(false)}
        titulo="Remover capacidade do perfil"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmarRemocao(false)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={removerVinculo.isPending}
              onClick={() => {
                if (perfilId) removerVinculo.mutate({ id: perfilId });
              }}
            >
              Remover
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          Remover <strong>{celula?.coluna.nome}</strong> do perfil de <strong>{celula?.linha.nome}</strong>?
        </p>
        <Alerta tom="warning" titulo="Histórico preservado" className="mt-3">
          As avaliações, os endossos e as evidências desta capacidade deixam de aparecer no perfil do colaborador.
        </Alerta>
      </Modal>
      <Modal
        aberto={evidenciaEditando !== null}
        onFechar={() => setEvidenciaEditando(null)}
        titulo="Editar evidência"
        subtitulo={celula?.coluna.nome}
        largura="md"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setEvidenciaEditando(null)}>Cancelar</Botao>
            <Botao
              variante="primario"
              icone={Check}
              carregando={editarEvidencia.isPending}
              disabled={!formEvidenciaEdicao.descricao.trim()}
              onClick={() => {
                if (!evidenciaEditando) return;
                editarEvidencia.mutate({
                  id: evidenciaEditando.id,
                  tipo: formEvidenciaEdicao.tipo,
                  descricao: formEvidenciaEdicao.descricao,
                  url: formEvidenciaEdicao.url,
                  data: formEvidenciaEdicao.data || undefined,
                  emitido_por: formEvidenciaEdicao.emitido_por,
                });
              }}
            >
              Salvar evidência
            </Botao>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Tipo" htmlFor="ee-tipo">
            <Selecao id="ee-tipo" value={formEvidenciaEdicao.tipo} onChange={(e) => setFormEvidenciaEdicao({ ...formEvidenciaEdicao, tipo: e.target.value })}>
              {TIPOS_EVIDENCIA.map((t) => (
                <option key={t.valor} value={t.valor}>{t.rotulo}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Data" htmlFor="ee-data">
            <Entrada id="ee-data" type="date" value={formEvidenciaEdicao.data} onChange={(e) => setFormEvidenciaEdicao({ ...formEvidenciaEdicao, data: e.target.value })} />
          </Campo>
          <Campo rotulo="Descrição" obrigatorio htmlFor="ee-desc" className="col-span-2">
            <Entrada id="ee-desc" value={formEvidenciaEdicao.descricao} onChange={(e) => setFormEvidenciaEdicao({ ...formEvidenciaEdicao, descricao: e.target.value })} />
          </Campo>
          <Campo rotulo="Link" htmlFor="ee-url">
            <Entrada id="ee-url" value={formEvidenciaEdicao.url} onChange={(e) => setFormEvidenciaEdicao({ ...formEvidenciaEdicao, url: e.target.value })} placeholder="https://" />
          </Campo>
          <Campo rotulo="Emitido por" htmlFor="ee-emit">
            <Entrada id="ee-emit" value={formEvidenciaEdicao.emitido_por} onChange={(e) => setFormEvidenciaEdicao({ ...formEvidenciaEdicao, emitido_por: e.target.value })} />
          </Campo>
        </div>
      </Modal>
      <Modal
        aberto={evidenciaParaExcluir !== null}
        onFechar={() => setEvidenciaParaExcluir(null)}
        titulo="Excluir evidência"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setEvidenciaParaExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirEvidencia.isPending}
              onClick={() => {
                if (evidenciaParaExcluir) excluirEvidencia.mutate({ id: evidenciaParaExcluir.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão da evidência <strong>{evidenciaParaExcluir?.descricao}</strong>?
        </p>
        {evidenciaParaExcluir && evidenciaParaExcluir.valida && (
          <Alerta tom="warning" titulo="Evidência validada" className="mt-3">
            Esta evidência já foi validada e conta para os critérios de promoção do colaborador.
          </Alerta>
        )}
      </Modal>
    </PainelLateral>
  );
}

/* ==========================================================================
   Timeline vertical do histórico de evolução
   ========================================================================== */

const ICONE_ORIGEM: Record<string, LucideIcon> = {
  TAREFA: Check, AVALIACAO: Award, TREINAMENTO: GraduationCap, MENTORIA: Users,
  CERTIFICACAO: Award, PROMOCAO: Zap, REGRESSAO: AlertTriangle, DECAY: CalendarClock, MANUAL: History,
};

function TimelineVertical({ itens }: { itens: HistoricoItem[] }) {
  if (!itens.length) {
    return <p className="rounded-sgp border border-border bg-surface-2 p-3 text-2xs text-fg-muted">Sem movimentações registradas no histórico desta capacidade.</p>;
  }
  return (
    <div className="rounded-sgp-lg border border-border bg-surface p-3">
      <h4 className="mb-3 text-xs font-semibold text-fg">Histórico de evolução</h4>
      <ol className="relative space-y-3 border-l border-dashed border-border pl-4">
        {itens.map((h) => {
          const Icone = ICONE_ORIGEM[h.origem] || History;
          const promocao = h.nivel_novo > h.nivel_anterior;
          const regressao = h.nivel_novo < h.nivel_anterior;
          const cor = promocao ? "#059669" : regressao ? "#DC2626" : "#0891B2";
          return (
            <li key={h.id} className="relative">
              <span className="absolute -left-[26px] grid size-5 place-items-center rounded-full text-white" style={{ backgroundColor: cor }}>
                <Icone className="size-3" aria-hidden />
              </span>
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-2xs font-semibold text-fg">
                    {h.nivel_anterior > 0 ? "N" + h.nivel_anterior + " → N" + h.nivel_novo : h.origem_rotulo || h.origem}
                  </p>
                  <span className="text-2xs text-fg-subtle">{dataHora(h.data)}</span>
                </div>
                <p className="mt-0.5 text-2xs text-fg-muted">{h.motivo || "Sem justificativa registrada"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Etiqueta tom="neutral">{h.origem_rotulo || h.origem}</Etiqueta>
                  {h.xp_movimento !== 0 && <Etiqueta tom={h.xp_movimento > 0 ? "success" : "danger"} icone={Zap}>{h.xp_movimento > 0 ? "+" : ""}{numero(h.xp_movimento)} XP</Etiqueta>}
                  {h.registrado_por_nome && <span className="text-2xs text-fg-subtle">por {h.registrado_por_nome}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
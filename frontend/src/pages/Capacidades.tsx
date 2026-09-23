import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Boxes, ChevronDown, ChevronRight, FileJson, FolderTree, GitBranch,
  Grid3x3, Layers3, Network, Plus, ScanSearch, Share2, Sparkles, Target, ZoomIn, ZoomOut,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta, Abas, AreaTexto, Botao, BotaoIcone, CabecalhoPagina, Campo, CarregandoBloco,
  Chip, Entrada, EntradaBusca, Etiqueta, FiltrosAtivos, Interruptor, KPI, Modal,
  PainelLateral, Selecao, Vazio, useAvisos, type Tom,
} from "@/components/ui";
import { FiltroSelect, GradeCards } from "@/components/layout";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, comAlfa } from "@/lib/utils";
import { numero, percentual } from "@/lib/format";
import type { Skill } from "@/lib/types";

/* ==========================================================================
   Catálogo de capacidades (RF-44 a RF-49): cards, árvore e grafo
   ========================================================================== */

const COR_CRITICIDADE: Record<string, string> = {
  BAIXA: "#10B981",
  MEDIA: "#0891B2",
  ALTA: "#F59E0B",
  ESTRATEGICA: "#DC2626",
};

const TOM_CRITICIDADE: Record<string, Tom> = {
  BAIXA: "success",
  MEDIA: "info",
  ALTA: "warning",
  ESTRATEGICA: "danger",
};

const ICONES: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  network: Network,
  boxes: Boxes,
  "folder-tree": FolderTree,
  target: Target,
  layers: Layers3,
  git: GitBranch,
  shield: AlertTriangle,
  search: ScanSearch,
};

function iconeDe(nome?: string): LucideIcon {
  return ICONES[(nome || "").toLowerCase()] || Sparkles;
}

function corDe(criticidade?: string, cor?: string) {
  return cor || COR_CRITICIDADE[criticidade || ""] || "#6366F1";
}

interface NoCategoria {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  descricao?: string;
  caminho?: string;
  total_skills?: number;
  filhos: NoCategoria[];
}

interface NoArvore {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  tipo: string;
  status: string;
  criticidade: string;
  parent: number | null;
  categoria: number | null;
  categoria_nome: string;
  codigo_externo: string;
  framework_origem: string;
  total_detentores: number;
  filhos: NoArvore[];
}

interface NoGrafo {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  tipo: string;
  criticidade: string;
  status: string;
  categoria: string;
  detentores: number;
  bus_factor: number;
  nivel_medio: number;
  raio: number;
}

interface ArestaGrafo {
  de: number;
  para: number;
  tipo: string;
}

interface RespostaArvore {
  raizes: NoArvore[];
  total: number;
  categorias: NoCategoria[];
}

interface RespostaGrafo {
  nos: NoGrafo[];
  arestas: ArestaGrafo[];
}

interface ItemImportacao {
  nome: string;
  codigo_externo?: string;
  categoria?: string;
  descricao?: string;
  tipo?: string;
}

type Visualizacao = "cards" | "arvore" | "grafo";

export default function Capacidades() {
  const navegar = useNavigate();
  const { sucesso, erro: avisarErro } = useAvisos();

  const [visual, setVisual] = useState<Visualizacao>("cards");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [criticidade, setCriticidade] = useState("");
  const [status, setStatus] = useState("");

  const [modalNova, setModalNova] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [detalheNo, setDetalheNo] = useState<NoArvore | null>(null);
  const [noGrafo, setNoGrafo] = useState<NoGrafo | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setBuscaAplicada(busca), 350);
    return () => clearTimeout(timer);
  }, [busca]);

  const categorias = useLista<NoCategoria>(CHAVES.categoriasSkill, "/capacidades/categorias/", { page_size: 200 });

  const skills = useLista<Skill>(
    CHAVES.skills,
    visual === "cards" ? "/capacidades/skills/" : null,
    { search: buscaAplicada || undefined, categoria: categoria || undefined, tipo: tipo || undefined, criticidade: criticidade || undefined, status: status || undefined, page_size: 200 }
  );

  const arvore = useConsulta<RespostaArvore>(CHAVES.arvoreSkills, visual === "arvore" ? "/capacidades/skills/arvore/" : null, { categoria: categoria || undefined });
  const grafo = useConsulta<RespostaGrafo>(CHAVES.grafoSkills, visual === "grafo" ? "/capacidades/skills/grafo/" : null);

  const listaSkills = skills.data || [];
  const listaCategorias = categorias.data || [];

  const resumo = useMemo(() => {
    const emRisco = listaSkills.filter((s) => s.em_risco).length;
    const mediaNivel = listaSkills.length
      ? listaSkills.reduce((a, s) => a + (s.nivel_medio || 0), 0) / listaSkills.length
      : 0;
    const detentores = listaSkills.reduce((a, s) => a + (s.total_detentores || 0), 0);
    const semDetentor = listaSkills.filter((s) => (s.bus_factor || 0) === 0).length;
    return { total: listaSkills.length, emRisco, mediaNivel, detentores, semDetentor };
  }, [listaSkills]);

  const filtrosAtivos = [
    categoria ? { chave: "categoria", rotulo: "Categoria", valor: listaCategorias.find((c) => String(c.id) === categoria)?.nome || categoria, cor: "#6366F1", onRemover: () => setCategoria("") } : null,
    tipo ? { chave: "tipo", rotulo: "Tipo", valor: tipo, cor: "#0891B2", onRemover: () => setTipo("") } : null,
    criticidade ? { chave: "criticidade", rotulo: "Criticidade", valor: criticidade, cor: corDe(criticidade), onRemover: () => setCriticidade("") } : null,
    status ? { chave: "status", rotulo: "Status", valor: status, cor: "#059669", onRemover: () => setStatus("") } : null,
    buscaAplicada ? { chave: "busca", rotulo: "Busca", valor: buscaAplicada, cor: "#2563EB", onRemover: () => { setBusca(""); setBuscaAplicada(""); } } : null,
  ].filter(Boolean) as Array<{ chave: string; rotulo: string; valor: string; cor: string; onRemover: () => void }>;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Catálogo de capacidades"
        subtitulo={numero(resumo.total) + " capacidades · " + numero(resumo.detentores) + " vínculos de detentores · nível médio " + numero(resumo.mediaNivel, 2)}
        icone={Boxes}
        cor="#6366F1"
        migalhas={[{ rotulo: "Início", onClick: () => navegar("/") }, { rotulo: "Capacidades" }]}
        acoes={
          <>
            <Botao variante="secundario" icone={FileJson} onClick={() => setModalImportar(true)}>Importar taxonomia</Botao>
            <Botao variante="primario" icone={Plus} onClick={() => setModalNova(true)}>Nova capacidade</Botao>
          </>
        }
        filhos={
          <>
            <Abas
              valor={visual}
              onChange={(v) => setVisual(v)}
              abas={[
                { valor: "cards", rotulo: "Cards", icone: Grid3x3, contagem: visual === "cards" ? listaSkills.length : undefined },
                { valor: "arvore", rotulo: "Árvore", icone: FolderTree },
                { valor: "grafo", rotulo: "Grafo", icone: Share2 },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KPI rotulo="Capacidades" valor={numero(resumo.total)} icone={Boxes} cor="#6366F1" subrotulo="no filtro atual" compacto />
        <KPI rotulo="Detentores (nível ≥ 3)" valor={numero(resumo.detentores)} icone={Target} cor="#0891B2" compacto />
        <KPI rotulo="Nível médio" valor={numero(resumo.mediaNivel, 2)} icone={Layers3} cor="#059669" subrotulo="escala 1 a 5" compacto />
        <KPI rotulo="Em risco" valor={numero(resumo.emRisco)} icone={AlertTriangle} cor="#DC2626" subrotulo="criticidade alta + bus factor ≤ 1" compacto />
        <KPI rotulo="Sem especialista" valor={numero(resumo.semDetentor)} icone={AlertTriangle} cor="#D97706" subrotulo="bus factor zero" compacto />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar capacidade, código externo..." className="min-w-56 flex-1" />
        <FiltroSelect rotulo="Categoria" valor={categoria} onChange={setCategoria} opcoes={listaCategorias.map((c) => ({ valor: String(c.id), rotulo: c.nome }))} />
        <FiltroSelect rotulo="Tipo" valor={tipo} onChange={setTipo} opcoes={[
          { valor: "TECNICA", rotulo: "Técnica" },
          { valor: "COMPORTAMENTAL", rotulo: "Comportamental" },
          { valor: "IDIOMA", rotulo: "Idioma" },
          { valor: "CERTIFICACAO", rotulo: "Certificação" },
          { valor: "DOMINIO", rotulo: "Domínio de negócio" },
          { valor: "FERRAMENTA", rotulo: "Ferramenta" },
          { valor: "METODOLOGIA", rotulo: "Metodologia" },
        ]} />
        <FiltroSelect rotulo="Criticidade" valor={criticidade} onChange={setCriticidade} opcoes={[
          { valor: "BAIXA", rotulo: "Baixa" },
          { valor: "MEDIA", rotulo: "Média" },
          { valor: "ALTA", rotulo: "Alta" },
          { valor: "ESTRATEGICA", rotulo: "Estratégica" },
        ]} />
        <FiltroSelect rotulo="Status" valor={status} onChange={setStatus} opcoes={[
          { valor: "ATIVA", rotulo: "Ativa" },
          { valor: "EMERGENTE", rotulo: "Emergente" },
          { valor: "EM_DESCONTINUACAO", rotulo: "Em descontinuação" },
          { valor: "OBSOLETA", rotulo: "Obsoleta" },
        ]} />
      </div>

      {filtrosAtivos.length > 0 && (
        <FiltrosAtivos filtros={filtrosAtivos} onLimpar={() => { setCategoria(""); setTipo(""); setCriticidade(""); setStatus(""); setBusca(""); setBuscaAplicada(""); }} />
      )}

      {visual === "cards" && (
        <SecaoCards
          skills={listaSkills}
          carregando={skills.isLoading}
          erro={skills.isError ? skills.error : null}
          aoAbrir={(id) => navegar("/capacidades/skills/" + id)}
          aoCriar={() => setModalNova(true)}
        />
      )}

      {visual === "arvore" && (
        <SecaoArvore
          arvore={arvore.data}
          carregando={arvore.isLoading}
          erro={arvore.isError ? arvore.error : null}
          aoSelecionar={setDetalheNo}
        />
      )}

      {visual === "grafo" && (
        <SecaoGrafo
          dados={grafo.data}
          carregando={grafo.isLoading}
          erro={grafo.isError ? grafo.error : null}
          tipo={tipo}
          criticidade={criticidade}
          aoSelecionar={setNoGrafo}
        />
      )}

      <ModalNovaCapacidade
        aberto={modalNova}
        onFechar={() => setModalNova(false)}
        categorias={listaCategorias}
        skills={listaSkills}
        aoConcluir={(nome) => { sucesso("Capacidade criada", nome); skills.refetch(); categorias.refetch(); }}
      />

      <ModalImportarTaxonomia
        aberto={modalImportar}
        onFechar={() => setModalImportar(false)}
        aoConcluir={(total, framework) => {
          sucesso("Taxonomia importada", numero(total) + " item(ns) do framework " + framework);
          skills.refetch();
          categorias.refetch();
          if (arvore.data) arvore.refetch();
        }}
        aoFalhar={(msg) => avisarErro("Falha na importação", msg)}
      />

      <PainelLateral
        aberto={Boolean(detalheNo)}
        onFechar={() => setDetalheNo(null)}
        titulo={detalheNo?.nome || "Capacidade"}
        subtitulo={detalheNo ? (detalheNo.categoria_nome || "Sem categoria") + " · " + detalheNo.tipo : undefined}
        largura="md"
        rodape={detalheNo ? <Botao variante="primario" icone={ArrowRight} onClick={() => navegar("/capacidades/skills/" + detalheNo.id)}>Abrir detalhe completo</Botao> : undefined}
      >
        {detalheNo && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-sgp-lg" style={{ backgroundColor: corDe(detalheNo.criticidade, detalheNo.cor) + "1f", color: corDe(detalheNo.criticidade, detalheNo.cor) }}>
                {(() => { const I = iconeDe(detalheNo.icone); return <I className="size-5" aria-hidden />; })()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{detalheNo.nome}</p>
                <p className="text-2xs text-fg-muted">{detalheNo.framework_origem || "Taxonomia interna"}{detalheNo.codigo_externo ? " · " + detalheNo.codigo_externo : ""}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Etiqueta tom={TOM_CRITICIDADE[detalheNo.criticidade] || "neutral"}>Criticidade {detalheNo.criticidade}</Etiqueta>
              <Etiqueta tom="info">{detalheNo.tipo}</Etiqueta>
              <Etiqueta tom="neutral">{detalheNo.status}</Etiqueta>
              {detalheNo.total_detentores <= 1 && detalheNo.criticidade !== "BAIXA" && (
                <Etiqueta tom="danger" icone={AlertTriangle}>Bus factor crítico</Etiqueta>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-sgp border border-border bg-surface-2 p-3">
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Detentores (nível ≥ 3)</p>
                <p className="text-lg font-bold tabular-nums text-fg">{numero(detalheNo.total_detentores)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-3">
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Subcapacidades</p>
                <p className="text-lg font-bold tabular-nums text-fg">{numero(detalheNo.filhos?.length || 0)}</p>
              </div>
            </div>
            {detalheNo.filhos?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-fg">Capacidades derivadas</p>
                {detalheNo.filhos.map((f) => (
                  <button key={f.id} type="button" onClick={() => setDetalheNo(f)} className="flex w-full items-center justify-between gap-2 rounded-sgp border border-border bg-surface px-3 py-2 text-left hover:bg-surface-2">
                    <span className="truncate text-xs text-fg">{f.nome}</span>
                    <span className="shrink-0 text-2xs text-fg-muted">{numero(f.total_detentores)} detentor(es)</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </PainelLateral>

      <PainelLateral
        aberto={Boolean(noGrafo)}
        onFechar={() => setNoGrafo(null)}
        titulo={noGrafo?.nome || "Capacidade"}
        subtitulo={noGrafo ? noGrafo.categoria + " · " + noGrafo.tipo : undefined}
        largura="sm"
        rodape={noGrafo ? <Botao variante="primario" icone={ArrowRight} onClick={() => navegar("/capacidades/skills/" + noGrafo.id)}>Ver detalhe</Botao> : undefined}
      >
        {noGrafo && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-sgp border border-border bg-surface-2 p-3">
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Detentores</p>
                <p className="text-lg font-bold tabular-nums text-fg">{numero(noGrafo.detentores)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-3">
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Bus factor</p>
                <p className={cn("text-lg font-bold tabular-nums", noGrafo.bus_factor <= 1 ? "text-danger" : "text-fg")}>{numero(noGrafo.bus_factor)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-3">
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível médio</p>
                <p className="text-lg font-bold tabular-nums text-fg">{numero(noGrafo.nivel_medio, 2)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-3">
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Criticidade</p>
                <p className="text-sm font-bold" style={{ color: corDe(noGrafo.criticidade, noGrafo.cor) }}>{noGrafo.criticidade}</p>
              </div>
            </div>
            {noGrafo.bus_factor <= 1 && (
              <Alerta tom={noGrafo.criticidade === "BAIXA" ? "warning" : "danger"} titulo="Dependência concentrada">
                Apenas {numero(noGrafo.bus_factor)} pessoa(s) com nível ≥ 4 sustentam esta capacidade.
              </Alerta>
            )}
          </div>
        )}
      </PainelLateral>
    </div>
  );
}

/* ==========================================================================
   Visualização em cards
   ========================================================================== */

function SecaoCards({
  skills, carregando, erro, aoAbrir, aoCriar,
}: {
  skills: Skill[]; carregando: boolean; erro: Error | null; aoAbrir: (id: number) => void; aoCriar: () => void;
}) {
  if (carregando) return <CarregandoBloco rotulo="Carregando catálogo de capacidades..." />;
  if (erro) return <Alerta tom="danger" titulo="Não foi possível carregar o catálogo">{mensagemErro(erro)}</Alerta>;
  if (!skills.length) {
    return (
      <Vazio
        icone={Boxes}
        titulo="Nenhuma capacidade encontrada"
        descricao="Ajuste os filtros ou cadastre a primeira capacidade do catálogo organizacional."
        acao={<Botao variante="primario" icone={Plus} onClick={aoCriar}>Nova capacidade</Botao>}
      />
    );
  }
  return (
    <GradeCards colunas="4">
      {skills.map((s) => {
        const Icone = iconeDe(s.icone);
        const cor = corDe(s.criticidade, s.cor);
        const risco = s.em_risco || (s.bus_factor <= 1 && (s.criticidade === "ALTA" || s.criticidade === "ESTRATEGICA"));
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => aoAbrir(s.id)}
            className={cn(
              "group flex flex-col gap-3 rounded-sgp-lg border bg-surface p-4 text-left shadow-n1 transition-all",
              "hover:-translate-y-0.5 hover:shadow-n2",
              risco ? "border-danger/45" : "border-border hover:border-border-strong"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-sgp-lg" style={{ backgroundColor: cor + "1f", color: cor }}>
                <Icone className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{s.nome}</p>
                <p className="truncate text-2xs text-fg-muted">{s.categoria_nome || "Sem categoria"} · {s.tipo_rotulo || s.tipo}</p>
              </div>
              {risco && <AlertTriangle className="size-4 shrink-0 text-danger animate-pulso-alerta" aria-hidden />}
            </div>

            <div className="flex flex-wrap gap-1">
              <Etiqueta tom={TOM_CRITICIDADE[s.criticidade] || "neutral"}>{s.criticidade_rotulo || s.criticidade}</Etiqueta>
              <Etiqueta tom={s.status === "ATIVA" ? "success" : s.status === "EMERGENTE" ? "info" : "neutral"}>{s.status_rotulo || s.status}</Etiqueta>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
              <div>
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível médio</p>
                <p className="text-sm font-bold tabular-nums text-fg">{numero(s.nivel_medio, 2)}</p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Detentores</p>
                <p className="text-sm font-bold tabular-nums text-fg">{numero(s.total_detentores)}</p>
              </div>
              <div>
                <p className="text-2xs uppercase tracking-wide text-fg-muted">Bus factor</p>
                <p className={cn("text-sm font-bold tabular-nums", s.bus_factor <= 1 ? "text-danger" : "text-fg")}>{numero(s.bus_factor)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {(s.sinonimos || []).slice(0, 2).map((sin) => (
                  <Chip key={sin} cor="#64748B">{sin}</Chip>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-2xs font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">
                Abrir <ArrowRight className="size-3" aria-hidden />
              </span>
            </div>
          </button>
        );
      })}
    </GradeCards>
  );
}

/* ==========================================================================
   Visualização em árvore (categorias + taxonomia)
   ========================================================================== */

function SecaoArvore({
  arvore, carregando, erro, aoSelecionar,
}: {
  arvore?: RespostaArvore; carregando: boolean; erro: Error | null; aoSelecionar: (no: NoArvore) => void;
}) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const primeiraCarga = useRef(true);

  useEffect(() => {
    if (!arvore || !primeiraCarga.current) return;
    const inicial: Record<string, boolean> = {};
    (arvore.categorias || []).forEach((c) => { inicial["cat-" + c.id] = true; });
    (arvore.raizes || []).forEach((n) => { inicial["no-" + n.id] = true; });
    setAbertos(inicial);
    primeiraCarga.current = false;
  }, [arvore]);

  const alternar = useCallback((chave: string) => {
    setAbertos((a) => ({ ...a, [chave]: !a[chave] }));
  }, []);

  if (carregando) return <CarregandoBloco rotulo="Carregando taxonomia..." />;
  if (erro) return <Alerta tom="danger" titulo="Não foi possível carregar a taxonomia">{mensagemErro(erro)}</Alerta>;
  if (!arvore || (!arvore.raizes.length && !(arvore.categorias || []).length)) {
    return <Vazio icone={FolderTree} titulo="Taxonomia vazia" descricao="Cadastre capacidades e categorias para visualizar a árvore hierárquica." />;
  }

  const skillsPorCategoria = (categoriaId: number) => (arvore.raizes || []).filter((n) => n.categoria === categoriaId);

  return (
    <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">{numero(arvore.total)} capacidades no catálogo · {numero((arvore.categorias || []).length)} categorias raiz</p>
        <div className="flex gap-1.5">
          <Botao tamanho="xs" variante="fantasma" onClick={() => setAbertos({})}>Recolher tudo</Botao>
          <Botao
            tamanho="xs"
            variante="fantasma"
            onClick={() => {
              const todos: Record<string, boolean> = {};
              const marcar = (nos: NoArvore[]) => nos.forEach((n) => { todos["no-" + n.id] = true; marcar(n.filhos || []); });
              (arvore.categorias || []).forEach((c) => { todos["cat-" + c.id] = true; });
              marcar(arvore.raizes || []);
              setAbertos(todos);
            }}
          >
            Expandir tudo
          </Botao>
        </div>
      </div>

      <ul className="space-y-1">
        {(arvore.categorias || []).map((cat) => {
          const chaveCat = "cat-" + cat.id;
          const abertoCat = abertos[chaveCat] !== false;
          const nos = skillsPorCategoria(cat.id);
          return (
            <li key={chaveCat}>
              <div className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 px-2 py-1.5">
                <button type="button" onClick={() => alternar(chaveCat)} className="grid size-6 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-surface-3" aria-label={abertoCat ? "Recolher categoria" : "Expandir categoria"} aria-expanded={abertoCat}>
                  {abertoCat ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
                </button>
                <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ backgroundColor: (cat.cor || "#6366F1") + "1f", color: cat.cor || "#6366F1" }}>
                  {(() => { const I = iconeDe(cat.icone); return <I className="size-3.5" aria-hidden />; })()}
                </span>
                <span className="truncate text-xs font-semibold text-fg">{cat.nome}</span>
                <Etiqueta tom="neutral" className="ml-auto shrink-0">{numero(cat.total_skills ?? nos.length)} capacidades</Etiqueta>
              </div>

              {abertoCat && (
                <div className="ml-4 border-l border-dashed border-border pl-3">
                  {nos.length === 0 ? (
                    <p className="py-2 pl-2 text-2xs text-fg-subtle">Sem capacidades de nível raiz nesta categoria.</p>
                  ) : (
                    <ul className="space-y-1 py-1">
                      {nos.map((no) => (
                        <RamoArvore key={no.id} no={no} nivel={0} abertos={abertos} alternar={alternar} aoSelecionar={aoSelecionar} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {(arvore.categorias || []).length === 0 && (
        <ul className="space-y-1">
          {(arvore.raizes || []).map((no) => (
            <RamoArvore key={no.id} no={no} nivel={0} abertos={abertos} alternar={alternar} aoSelecionar={aoSelecionar} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RamoArvore({
  no, nivel, abertos, alternar, aoSelecionar,
}: {
  no: NoArvore; nivel: number; abertos: Record<string, boolean>; alternar: (c: string) => void; aoSelecionar: (n: NoArvore) => void;
}) {
  const chave = "no-" + no.id;
  const temFilhos = (no.filhos || []).length > 0;
  const aberto = Boolean(abertos[chave]);
  const Icone = iconeDe(no.icone);
  const cor = corDe(no.criticidade, no.cor);
  return (
    <li>
      <div className="flex items-center gap-2 rounded-sgp px-2 py-1.5 transition-colors hover:bg-surface-2">
        {temFilhos ? (
          <button type="button" onClick={() => alternar(chave)} className="grid size-6 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-surface-3" aria-label={aberto ? "Recolher" : "Expandir"} aria-expanded={aberto}>
            {aberto ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
          </button>
        ) : (
          <span className="grid size-6 shrink-0 place-items-center text-fg-subtle" aria-hidden>
            <span className="size-1.5 rounded-full bg-border-strong" />
          </span>
        )}
        <span className="grid size-7 shrink-0 place-items-center rounded-md" style={{ backgroundColor: comAlfa(cor, 0.12), color: cor }}>
          <Icone className="size-3.5" aria-hidden />
        </span>
        <button type="button" onClick={() => aoSelecionar(no)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-fg hover:text-brand">
          {no.nome}
        </button>
        {no.codigo_externo && <span className="hidden shrink-0 text-2xs text-fg-subtle sm:inline">{no.codigo_externo}</span>}
        <Etiqueta tom={TOM_CRITICIDADE[no.criticidade] || "neutral"} className="shrink-0">{no.criticidade}</Etiqueta>
        <span className={cn("shrink-0 text-2xs font-semibold tabular-nums", no.total_detentores <= 1 ? "text-danger" : "text-fg-muted")}>
          {numero(no.total_detentores)} detentor(es)
        </span>
        {temFilhos && <span className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-2xs text-fg-muted">{no.filhos.length}</span>}
      </div>
      {temFilhos && aberto && (
        <ul className={cn("space-y-1 border-l border-dashed border-border", nivel < 2 ? "ml-5 pl-3" : "ml-3 pl-2")}>
          {no.filhos.map((f) => (
            <RamoArvore key={f.id} no={f} nivel={nivel + 1} abertos={abertos} alternar={alternar} aoSelecionar={aoSelecionar} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* ==========================================================================
   Visualização em grafo (SVG com zoom e pan)
   ========================================================================== */

const CORES_NIVEL_GRAFO: Record<string, string> = {
  BAIXA: "#10B981",
  MEDIA: "#0891B2",
  ALTA: "#F59E0B",
  ESTRATEGICA: "#DC2626",
};

function SecaoGrafo({
  dados, carregando, erro, tipo, criticidade, aoSelecionar,
}: {
  dados?: RespostaGrafo; carregando: boolean; erro: Error | null; tipo: string; criticidade: string; aoSelecionar: (n: NoGrafo) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const origem = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const alvo = container.current;
    if (!alvo) return;
    const aoRolar = (evento: WheelEvent) => {
      evento.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.4, z + (evento.deltaY < 0 ? 0.12 : -0.12))));
    };
    alvo.addEventListener("wheel", aoRolar, { passive: false });
    return () => alvo.removeEventListener("wheel", aoRolar);
  }, [carregando]);

  const layout = useMemo(() => {
    const nos = (dados?.nos || []).filter((n) => (!tipo || n.tipo === tipo) && (!criticidade || n.criticidade === criticidade));
    const ids = new Set(nos.map((n) => n.id));
    const arestas = (dados?.arestas || []).filter((a) => ids.has(a.de) && ids.has(a.para));

    const grupos = new Map<string, NoGrafo[]>();
    nos.forEach((n) => {
      const chave = n.categoria || "Sem categoria";
      const atual = grupos.get(chave) || [];
      atual.push(n);
      grupos.set(chave, atual);
    });

    const chaves = Array.from(grupos.keys());
    const largura = 1000;
    const altura = 720;
    const cx = largura / 2;
    const cy = altura / 2;
    const raioGrupo = Math.min(300, 90 + chaves.length * 24);
    const posicoes = new Map<number, { x: number; y: number; grupo: string }>();
    const centros: Array<{ chave: string; x: number; y: number; cor: string }> = [];

    chaves.forEach((chave, indice) => {
      const angulo = (Math.PI * 2 * indice) / Math.max(1, chaves.length) - Math.PI / 2;
      const gx = chaves.length === 1 ? cx : cx + raioGrupo * Math.cos(angulo);
      const gy = chaves.length === 1 ? cy : cy + raioGrupo * Math.sin(angulo);
      const membros = grupos.get(chave) || [];
      const raioInterno = Math.max(28, Math.min(120, 22 + membros.length * 6));
      centros.push({ chave, x: gx, y: gy, cor: membros[0]?.cor || "#6366F1" });
      membros.forEach((no, i) => {
        const a = (Math.PI * 2 * i) / Math.max(1, membros.length) - Math.PI / 2;
        posicoes.set(no.id, {
          x: membros.length === 1 ? gx : gx + raioInterno * Math.cos(a),
          y: membros.length === 1 ? gy : gy + raioInterno * Math.sin(a),
          grupo: chave,
        });
      });
    });

    return { nos, arestas, posicoes, centros, largura, altura };
  }, [dados, tipo, criticidade]);

  const vizinhos = useMemo(() => {
    if (selecionado === null) return null;
    const conjunto = new Set<number>([selecionado]);
    layout.arestas.forEach((a) => {
      if (a.de === selecionado) conjunto.add(a.para);
      if (a.para === selecionado) conjunto.add(a.de);
    });
    return conjunto;
  }, [selecionado, layout.arestas]);

  if (carregando) return <CarregandoBloco rotulo="Calculando grafo de capacidades..." />;
  if (erro) return <Alerta tom="danger" titulo="Não foi possível carregar o grafo">{mensagemErro(erro)}</Alerta>;
  if (!layout.nos.length) {
    return <Vazio icone={Share2} titulo="Nenhum nó para exibir" descricao="Ajuste os filtros de tipo ou criticidade para visualizar o grafo de capacidades." />;
  }

  return (
    <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-xs text-fg-muted">{numero(layout.nos.length)} nós · {numero(layout.arestas.length)} relações hierárquicas · {numero(layout.centros.length)} categorias</p>
        <div className="flex items-center gap-1.5">
          <BotaoIcone icone={ZoomOut} rotulo="Reduzir zoom" tamanho="sm" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))} />
          <span className="w-12 text-center text-2xs font-semibold tabular-nums text-fg-muted">{percentual(zoom * 100, 0)}</span>
          <BotaoIcone icone={ZoomIn} rotulo="Ampliar zoom" tamanho="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.15))} />
          <Botao tamanho="xs" variante="fantasma" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelecionado(null); }}>Centralizar</Botao>
        </div>
      </div>

      <div
        ref={container}
        className={cn("relative overflow-hidden rounded-b-sgp-lg bg-bg-alt", arrastando ? "cursor-grabbing" : "cursor-grab")}
        style={{ height: 560 }}
        onMouseDown={(e) => {
          setArrastando(true);
          origem.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        }}
        onMouseMove={(e) => {
          if (!arrastando) return;
          setPan({ x: origem.current.px + (e.clientX - origem.current.x), y: origem.current.py + (e.clientY - origem.current.y) });
        }}
        onMouseUp={() => setArrastando(false)}
        onMouseLeave={() => setArrastando(false)}
        role="application"
        aria-label="Grafo de capacidades com zoom e pan"
      >
        <svg width="100%" height="100%" viewBox={"0 0 " + layout.largura + " " + layout.altura}>
          <g transform={"translate(" + pan.x + " " + pan.y + ") scale(" + zoom + ") translate(" + (layout.largura / 2) * (1 / zoom - 1) + " " + (layout.altura / 2) * (1 / zoom - 1) + ")"}>
            {layout.centros.map((c) => (
              <g key={c.chave}>
                <circle cx={c.x} cy={c.y} r={150} fill={comAlfa(c.cor, 0.05)} stroke={comAlfa(c.cor, 0.22)} strokeDasharray="5 6" />
                <text x={c.x} y={c.y - 156} textAnchor="middle" className="fill-fg-muted text-[11px] font-semibold">{c.chave}</text>
              </g>
            ))}

            {layout.arestas.map((a, i) => {
              const de = layout.posicoes.get(a.de);
              const para = layout.posicoes.get(a.para);
              if (!de || !para) return null;
              const destaque = vizinhos ? (vizinhos.has(a.de) && vizinhos.has(a.para)) : true;
              return (
                <line
                  key={a.de + "-" + a.para + "-" + i}
                  x1={de.x}
                  y1={de.y}
                  x2={para.x}
                  y2={para.y}
                  stroke="var(--sgp-border-strong)"
                  strokeWidth={destaque ? 1.4 : 0.6}
                  opacity={destaque ? 0.75 : 0.18}
                />
              );
            })}

            {layout.nos.map((no) => {
              const pos = layout.posicoes.get(no.id);
              if (!pos) return null;
              const cor = CORES_NIVEL_GRAFO[no.criticidade] || no.cor || "#6366F1";
              const visivel = vizinhos ? vizinhos.has(no.id) : true;
              const raio = Math.max(9, Math.min(30, no.raio || 14));
              return (
                <g
                  key={no.id}
                  transform={"translate(" + pos.x + " " + pos.y + ")"}
                  opacity={visivel ? 1 : 0.25}
                  className="cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setSelecionado(no.id); aoSelecionar(no); }}
                >
                  <circle r={raio} fill={comAlfa(cor, selecionado === no.id ? 0.95 : 0.75)} stroke={no.bus_factor <= 1 ? "#DC2626" : "var(--sgp-surface)"} strokeWidth={no.bus_factor <= 1 ? 2.4 : 1.6} />
                  <text y={raio + 12} textAnchor="middle" className="fill-fg text-[10px] font-medium">
                    {no.nome.length > 18 ? no.nome.slice(0, 17) + "…" : no.nome}
                  </text>
                  <text y={raio + 23} textAnchor="middle" className="fill-fg-subtle text-[9px]">
                    {numero(no.detentores)} · BF {numero(no.bus_factor)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 rounded-sgp border border-border bg-surface/95 px-3 py-2 shadow-n2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Criticidade</p>
          {(["BAIXA", "MEDIA", "ALTA", "ESTRATEGICA"] as const).map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-2xs text-fg-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: CORES_NIVEL_GRAFO[c] }} />
              {c}
            </span>
          ))}
          <p className="mt-1 text-2xs text-fg-subtle">Borda vermelha = bus factor crítico</p>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Modal de nova capacidade
   ========================================================================== */

function ModalNovaCapacidade({
  aberto, onFechar, categorias, skills, aoConcluir,
}: {
  aberto: boolean; onFechar: () => void; categorias: NoCategoria[]; skills: Skill[]; aoConcluir: (nome: string) => void;
}) {
  const [form, setForm] = useState({
    nome: "", descricao: "", categoria: "", parent: "", tipo: "TECNICA", status: "ATIVA",
    criticidade: "MEDIA", framework_origem: "", codigo_externo: "", sinonimos: "",
    icone: "sparkles", cor: "#6366F1", peso_estrategico: 1, substituivel: true,
  });

  const criar = useMutacao<Record<string, unknown>, Skill>({
    url: "/capacidades/skills/",
    invalidar: [CHAVES.skills, CHAVES.arvoreSkills, CHAVES.grafoSkills, CHAVES.categoriasSkill],
    mensagemSucesso: "Capacidade cadastrada no catálogo",
    aoSucesso: (resposta) => {
      aoConcluir(resposta?.nome || form.nome);
      onFechar();
      setForm({ nome: "", descricao: "", categoria: "", parent: "", tipo: "TECNICA", status: "ATIVA", criticidade: "MEDIA", framework_origem: "", codigo_externo: "", sinonimos: "", icone: "sparkles", cor: "#6366F1", peso_estrategico: 1, substituivel: true });
    },
  });

  const valido = form.nome.trim().length >= 2;

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Nova capacidade"
      subtitulo="Cadastro no catálogo organizacional (RF-44)"
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            icone={Plus}
            carregando={criar.isPending}
            disabled={!valido}
            onClick={() =>
              criar.mutate({
                nome: form.nome,
                descricao: form.descricao,
                categoria: form.categoria ? Number(form.categoria) : null,
                parent: form.parent ? Number(form.parent) : null,
                tipo: form.tipo,
                status: form.status,
                criticidade: form.criticidade,
                framework_origem: form.framework_origem,
                codigo_externo: form.codigo_externo,
                sinonimos: form.sinonimos.split(",").map((s) => s.trim()).filter(Boolean),
                icone: form.icone,
                cor: form.cor,
                peso_estrategico: Number(form.peso_estrategico),
                substituivel: form.substituivel,
              })
            }
          >
            Cadastrar capacidade
          </Botao>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome" obrigatorio htmlFor="cap-nome" className="sm:col-span-2">
          <Entrada id="cap-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Arquitetura de microsserviços" />
        </Campo>
        <Campo rotulo="Descrição" htmlFor="cap-desc" className="sm:col-span-2" dica="O que a capacidade abrange e como é demonstrada.">
          <AreaTexto id="cap-desc" rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        </Campo>
        <Campo rotulo="Categoria" htmlFor="cap-cat">
          <Selecao id="cap-cat" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            <option value="">Sem categoria</option>
            {categorias.map((c) => (<option key={c.id} value={c.id}>{c.caminho || c.nome}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Capacidade pai" htmlFor="cap-pai" dica="Cria hierarquia na taxonomia.">
          <Selecao id="cap-pai" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}>
            <option value="">Nenhuma (raiz)</option>
            {skills.map((s) => (<option key={s.id} value={s.id}>{s.nome}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Tipo" htmlFor="cap-tipo">
          <Selecao id="cap-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="TECNICA">Técnica</option>
            <option value="COMPORTAMENTAL">Comportamental</option>
            <option value="IDIOMA">Idioma</option>
            <option value="CERTIFICACAO">Certificação</option>
            <option value="DOMINIO">Domínio de negócio</option>
            <option value="FERRAMENTA">Ferramenta</option>
            <option value="METODOLOGIA">Metodologia</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Status" htmlFor="cap-status">
          <Selecao id="cap-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ATIVA">Ativa</option>
            <option value="EMERGENTE">Emergente</option>
            <option value="EM_DESCONTINUACAO">Em descontinuação</option>
            <option value="OBSOLETA">Obsoleta</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Criticidade" htmlFor="cap-crit">
          <Selecao id="cap-crit" value={form.criticidade} onChange={(e) => setForm({ ...form, criticidade: e.target.value })}>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="ESTRATEGICA">Estratégica</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Framework de origem" htmlFor="cap-fw" dica="SFIA, ESCO, O*NET ou interno.">
          <Entrada id="cap-fw" value={form.framework_origem} onChange={(e) => setForm({ ...form, framework_origem: e.target.value })} placeholder="ESCO" />
        </Campo>
        <Campo rotulo="Código externo" htmlFor="cap-cod">
          <Entrada id="cap-cod" value={form.codigo_externo} onChange={(e) => setForm({ ...form, codigo_externo: e.target.value })} placeholder="Ex.: SFA-ARCH-01" />
        </Campo>
        <Campo rotulo="Sinônimos" htmlFor="cap-sin" dica="Separe por vírgula." className="sm:col-span-2">
          <Entrada id="cap-sin" value={form.sinonimos} onChange={(e) => setForm({ ...form, sinonimos: e.target.value })} placeholder="microsserviços, service mesh" />
        </Campo>
        <Campo rotulo="Ícone" htmlFor="cap-icone">
          <Selecao id="cap-icone" value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })}>
            <option value="sparkles">Brilho</option>
            <option value="network">Rede</option>
            <option value="boxes">Blocos</option>
            <option value="target">Alvo</option>
            <option value="layers">Camadas</option>
            <option value="git">Ramificação</option>
            <option value="shield">Escudo</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Cor" htmlFor="cap-cor">
          <div className="flex items-center gap-2">
            <input id="cap-cor" type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} className="h-9 w-14 cursor-pointer rounded-sgp border border-border-strong bg-surface" />
            <Entrada value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
          </div>
        </Campo>
        <Campo rotulo="Peso estratégico" htmlFor="cap-peso" dica="Usado nos cálculos de matching e priorização.">
          <Entrada id="cap-peso" type="number" step="0.1" min="0" value={form.peso_estrategico} onChange={(e) => setForm({ ...form, peso_estrategico: Number(e.target.value) })} />
        </Campo>
        <div className="flex items-end sm:col-span-2">
          <Interruptor ativo={form.substituivel} onChange={(v) => setForm({ ...form, substituivel: v })} rotulo="Substituível por tecnologia similar" descricao="Marque quando houver alternativa no mercado." />
        </div>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   Modal de importação de taxonomia (SFIA / ESCO / O*NET)
   ========================================================================== */

function ModalImportarTaxonomia({
  aberto, onFechar, aoConcluir, aoFalhar,
}: {
  aberto: boolean; onFechar: () => void; aoConcluir: (total: number, framework: string) => void; aoFalhar: (msg: string) => void;
}) {
  const [framework, setFramework] = useState("ESCO");
  const [texto, setTexto] = useState("");

  const itens = useMemo<ItemImportacao[] | null>(() => {
    if (!texto.trim()) return null;
    try {
      const bruto = JSON.parse(texto) as unknown;
      const lista = Array.isArray(bruto) ? bruto : (bruto as { itens?: unknown[] }).itens;
      if (!Array.isArray(lista)) return null;
      return lista
        .map((item) => {
          const obj = item as Record<string, unknown>;
          return {
            nome: String(obj.nome || "").trim(),
            codigo_externo: obj.codigo_externo ? String(obj.codigo_externo) : "",
            categoria: obj.categoria ? String(obj.categoria) : "",
            descricao: obj.descricao ? String(obj.descricao) : "",
            tipo: obj.tipo ? String(obj.tipo) : "TECNICA",
          };
        })
        .filter((i) => i.nome.length > 0);
    } catch {
      return null;
    }
  }, [texto]);

  const importar = useMutacao<{ framework: string; itens: ItemImportacao[] }, { total: number; criados: Skill[]; atualizados: Skill[] }>({
    url: "/capacidades/skills/importar-taxonomia/",
    invalidar: [CHAVES.skills, CHAVES.arvoreSkills, CHAVES.grafoSkills, CHAVES.categoriasSkill],
    mensagemSucesso: "Taxonomia processada",
    aoSucesso: (resposta) => {
      aoConcluir(resposta?.total ?? 0, framework);
      setTexto("");
      onFechar();
    },
  });

  const exemplo = "[" + "\n" +
    "  { \"nome\": \"Análise de dados\", \"codigo_externo\": \"ESCO-2511\", \"categoria\": \"Dados\", \"descricao\": \"\", \"tipo\": \"TECNICA\" }," + "\n" +
    "  { \"nome\": \"Comunicação executiva\", \"codigo_externo\": \"SFIA-RSXX\", \"categoria\": \"Comportamental\", \"tipo\": \"COMPORTAMENTAL\" }" + "\n" +
    "]";

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Importar taxonomia externa"
      subtitulo="Mapeamento de framework de referência para o catálogo interno (RF-46)"
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            icone={FileJson}
            carregando={importar.isPending}
            disabled={!itens || itens.length === 0}
            onClick={() => {
              if (!itens || !itens.length) {
                aoFalhar("Cole um JSON válido com ao menos um item contendo o campo nome.");
                return;
              }
              importar.mutate({ framework, itens });
            }}
          >
            Importar {itens ? numero(itens.length) : 0} item(ns)
          </Botao>
        </>
      }
    >
      <div className="space-y-3">
        <Campo rotulo="Framework de origem" htmlFor="imp-fw" dica="Itens com o mesmo código externo são atualizados em vez de duplicados.">
          <Selecao id="imp-fw" value={framework} onChange={(e) => setFramework(e.target.value)}>
            <option value="SFIA">SFIA</option>
            <option value="ESCO">ESCO</option>
            <option value="O*NET">O*NET</option>
            <option value="INTERNO">Taxonomia interna</option>
          </Selecao>
        </Campo>

        <Campo rotulo="Itens (JSON)" htmlFor="imp-json" obrigatorio dica="Array de objetos com nome, codigo_externo, categoria, descricao e tipo.">
          <AreaTexto
            id="imp-json"
            rows={12}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={exemplo}
            className="font-mono text-2xs"
          />
        </Campo>

        {texto.trim().length > 0 && !itens && <Alerta tom="danger" titulo="JSON inválido">Verifique a sintaxe e se cada item possui o campo nome.</Alerta>}
        {itens && itens.length > 0 && (
          <Alerta tom="success" titulo={numero(itens.length) + " item(ns) reconhecido(s)"}>
            Prévia: {itens.slice(0, 5).map((i) => i.nome).join(", ")}
            {itens.length > 5 ? " e mais " + numero(itens.length - 5) : ""}.
          </Alerta>
        )}
        {!texto.trim() && (
          <Alerta tom="info" titulo="Formato aceito">
            Aceita um array direto ou um objeto com a chave itens. Categorias inexistentes são criadas automaticamente.
          </Alerta>
        )}
      </div>
    </Modal>
  );
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award, Briefcase, Building2, ChevronDown, ChevronRight, GraduationCap, Grid3x3, Layers3,
  LayoutGrid, Mail, MapPin, Network, Search, Table2, UserCheck, Users, X, type LucideIcon,
} from "lucide-react";
import {
  Alerta, Abas, Avatar, Botao, CabecalhoPagina, CarregandoBloco, Chip, EntradaBusca, Etiqueta,
  KPI, Segmentado, Tabela, Vazio, type ColunaTabela, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { useConsulta, useLista, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, corNivel } from "@/lib/utils";
import { numero } from "@/lib/format";
import type { Usuario } from "@/lib/types";

/* ==========================================================================
   Diretório de pessoas e organograma (RF-50 · RF-87)
   ========================================================================== */

const TOM_PERFIL: Record<string, Tom> = {
  ADMIN: "danger",
  EXECUTIVO: "brand",
  PMO: "info",
  GERENTE: "warning",
  LIDER: "warning",
  MEMBRO: "neutral",
  RH: "success",
  STAKEHOLDER: "neutral",
};

const ROTULO_PERFIL: Record<string, string> = {
  ADMIN: "Administrador",
  EXECUTIVO: "Executivo",
  PMO: "PMO",
  GERENTE: "Gerente",
  LIDER: "Líder",
  MEMBRO: "Membro",
  RH: "RH",
  STAKEHOLDER: "Stakeholder",
};

interface LinhaMatriz {
  user_id: number;
  nome: string;
  total_skills: number;
  nivel_medio: number;
}

interface RespostaMatriz {
  linhas: LinhaMatriz[];
  total_pessoas: number;
}

interface NoOrganograma {
  id: number;
  nome: string;
  cargo: string;
  area: string;
  cor: string;
  iniciais: string;
  perfil: string;
  gestor: number | null;
}

interface ArestaOrganograma {
  de: number;
  para: number;
  tipo: string;
}

interface RespostaOrganograma {
  nos: NoOrganograma[];
  arestas: ArestaOrganograma[];
}

type AbaPessoas = "diretorio" | "organograma";

export default function Pessoas() {
  const navegar = useNavigate();
  const [aba, setAba] = useState<AbaPessoas>("diretorio");
  const [visual, setVisual] = useState<"cards" | "tabela">("cards");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [perfil, setPerfil] = useState("");
  const [area, setArea] = useState("");
  const [ativo, setAtivo] = useState("true");
  const [somenteMentores, setSomenteMentores] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBuscaAplicada(busca), 350);
    return () => clearTimeout(timer);
  }, [busca]);

  const pessoas = useLista<Usuario>(CHAVES.usuarios, aba === "diretorio" ? "/usuarios/" : null, {
    perfil: perfil || undefined,
    area: area || undefined,
    ativo: ativo === "" ? undefined : ativo,
    search: buscaAplicada || undefined,
    page_size: 300,
  });

  const matriz = useConsulta<RespostaMatriz>(CHAVES.matrizSkills, "/capacidades/perfis/matriz/", {
    limite_skills: 120,
    limite_pessoas: 300,
  });

  const organograma = useConsulta<RespostaOrganograma>(["organograma"], aba === "organograma" ? "/usuarios/organograma/" : null);

  const lista = pessoas.data || [];
  const filtrada = useMemo(
    () => (somenteMentores ? lista.filter((p) => p.disponivel_para_mentoria) : lista),
    [lista, somenteMentores]
  );

  const resumoPorUsuario = useMemo(() => {
    const mapa: Record<number, LinhaMatriz> = {};
    (matriz.data?.linhas || []).forEach((l) => { mapa[l.user_id] = l; });
    return mapa;
  }, [matriz.data]);

  const areas = useMemo(() => {
    const conjunto = new Set<string>();
    lista.forEach((p) => { if (p.area) conjunto.add(p.area); });
    return Array.from(conjunto).sort();
  }, [lista]);

  const indicadores = useMemo(() => {
    const mentores = lista.filter((p) => p.disponivel_para_mentoria).length;
    const medias = lista.map((p) => resumoPorUsuario[p.id]?.nivel_medio || 0).filter((v) => v > 0);
    const media = medias.length ? medias.reduce((a, b) => a + b, 0) / medias.length : 0;
    const comSkills = lista.filter((p) => (resumoPorUsuario[p.id]?.total_skills || 0) > 0).length;
    return { mentores, media, comSkills };
  }, [lista, resumoPorUsuario]);

  const colunas: Array<ColunaTabela<Usuario>> = [
    {
      chave: "nome",
      titulo: "Colaborador",
      largura: "260px",
      ordenavel: true,
      valorOrdenacao: (p) => p.nome,
      renderizar: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar nome={p.nome} cor={p.cor} iniciais={p.iniciais} url={p.avatar_display} tamanho="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-fg">{p.nome}</p>
            <p className="truncate text-2xs text-fg-muted">{p.email}</p>
          </div>
        </div>
      ),
    },
    { chave: "cargo", titulo: "Cargo", largura: "200px", ordenavel: true, valorOrdenacao: (p) => p.cargo || "", renderizar: (p) => <span className="text-xs text-fg">{p.cargo || "—"}</span> },
    { chave: "area", titulo: "Área", largura: "160px", ordenavel: true, valorOrdenacao: (p) => p.area || "", renderizar: (p) => <span className="text-xs text-fg-muted">{p.area || "—"}</span> },
    {
      chave: "perfil",
      titulo: "Perfil",
      largura: "140px",
      ordenavel: true,
      valorOrdenacao: (p) => p.perfil,
      renderizar: (p) => <Etiqueta tom={TOM_PERFIL[p.perfil] || "neutral"}>{ROTULO_PERFIL[p.perfil] || p.perfil}</Etiqueta>,
    },
    { chave: "local", titulo: "Localização", largura: "150px", renderizar: (p) => <span className="text-xs text-fg-muted">{p.localizacao || "—"}</span> },
    {
      chave: "skills",
      titulo: "Capacidades",
      largura: "150px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (p) => resumoPorUsuario[p.id]?.total_skills || 0,
      renderizar: (p) => {
        const linha = resumoPorUsuario[p.id];
        return (
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold tabular-nums text-fg">{numero(linha?.total_skills || 0)}</span>
            <span className="text-2xs" style={{ color: corNivel(Math.round(linha?.nivel_medio || 0)) }}>média {numero(linha?.nivel_medio || 0, 2)}</span>
          </div>
        );
      },
    },
    {
      chave: "mentoria",
      titulo: "Mentoria",
      largura: "130px",
      alinhar: "center",
      renderizar: (p) => (p.disponivel_para_mentoria ? <Etiqueta tom="success" icone={GraduationCap}>Disponível</Etiqueta> : <Etiqueta tom="neutral">Indisponível</Etiqueta>),
    },
    {
      chave: "acoes",
      titulo: "",
      largura: "80px",
      alinhar: "right",
      renderizar: (p) => <Botao tamanho="xs" variante="fantasma" icone={Layers3} onClick={() => navegar("/pessoas/" + p.id)}>Perfil</Botao>,
    },
  ];

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Pessoas"
        subtitulo={numero(lista.length) + " colaboradores · " + numero(indicadores.mentores) + " disponíveis para mentoria"}
        icone={Users}
        cor="#2563EB"
        migalhas={[{ rotulo: "Início", onClick: () => navegar("/") }, { rotulo: "Pessoas" }]}
        acoes={
          <>
            <Botao variante="secundario" icone={Grid3x3} onClick={() => navegar("/matriz-skills")}>Matriz de capacidades</Botao>
            <Botao variante="secundario" icone={Award} onClick={() => navegar("/pdi")}>PDI e trilhas</Botao>
          </>
        }
        filhos={
          <>
            <Abas
              valor={aba}
              onChange={(v) => setAba(v)}
              abas={[
                { valor: "diretorio", rotulo: "Diretório", icone: Users, contagem: lista.length },
                { valor: "organograma", rotulo: "Organograma", icone: Network },
              ]}
            />
          </>
        }
      />

      {aba === "diretorio" && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPI rotulo="Colaboradores ativos" valor={numero(lista.length)} icone={Users} cor="#2563EB" compacto />
            <KPI rotulo="Com capacidades mapeadas" valor={numero(indicadores.comSkills)} icone={Layers3} cor="#059669" subrotulo="perfis registrados" compacto />
            <KPI rotulo="Nível médio geral" valor={numero(indicadores.media, 2)} icone={Award} cor="#D97706" subrotulo="escala 1 a 5" compacto />
            <KPI rotulo="Mentores disponíveis" valor={numero(indicadores.mentores)} icone={GraduationCap} cor="#7C3AED" subrotulo="aceitam mentoria" compacto />
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
            <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar por nome, cargo, área ou e-mail..." className="min-w-64 flex-1" />
            <label className="inline-flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Perfil</span>
              <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
                <option value="">Todos</option>
                {Object.keys(ROTULO_PERFIL).map((p) => (<option key={p} value={p}>{ROTULO_PERFIL[p]}</option>))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Área</span>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
                <option value="">Todas</option>
                {areas.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <span className="text-2xs font-medium text-fg-muted">Situação</span>
              <select value={ativo} onChange={(e) => setAtivo(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
                <option value="">Todos</option>
              </select>
            </label>
            <Chip cor="#7C3AED" ativo={somenteMentores} onClick={() => setSomenteMentores(!somenteMentores)}>Apenas mentores</Chip>
            <Segmentado
              valor={visual}
              onChange={(v) => setVisual(v)}
              opcoes={[
                { valor: "cards", rotulo: "Cards", icone: LayoutGrid },
                { valor: "tabela", rotulo: "Tabela", icone: Table2 },
              ]}
            />
            {(busca || perfil || area || somenteMentores) && (
              <Botao tamanho="xs" variante="fantasma" icone={X} onClick={() => { setBusca(""); setBuscaAplicada(""); setPerfil(""); setArea(""); setSomenteMentores(false); }}>
                Limpar
              </Botao>
            )}
          </div>

          {pessoas.isLoading && <CarregandoBloco rotulo="Carregando diretório de pessoas..." />}
          {pessoas.isError && <Alerta tom="danger" titulo="Não foi possível carregar as pessoas">{mensagemErro(pessoas.error)}</Alerta>}

          {pessoas.data && filtrada.length === 0 && (
            <Vazio
              icone={Search}
              titulo="Nenhuma pessoa encontrada"
              descricao="Ajuste a busca ou os filtros de perfil, área e situação."
              acao={<Botao variante="secundario" onClick={() => { setBusca(""); setBuscaAplicada(""); setPerfil(""); setArea(""); setSomenteMentores(false); }}>Limpar filtros</Botao>}
            />
          )}

          {pessoas.data && filtrada.length > 0 && visual === "cards" && (
            <GradeCards colunas="4">
              {filtrada.map((p) => {
                const linha = resumoPorUsuario[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navegar("/pessoas/" + p.id)}
                    className="flex flex-col gap-3 rounded-sgp-lg border border-border bg-surface p-4 text-left shadow-n1 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-n2"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar nome={p.nome} cor={p.cor} iniciais={p.iniciais} url={p.avatar_display} tamanho="xl" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{p.nome}</p>
                        <p className="truncate text-2xs text-fg-muted">{p.cargo || "Cargo não informado"}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Etiqueta tom={TOM_PERFIL[p.perfil] || "neutral"}>{ROTULO_PERFIL[p.perfil] || p.perfil}</Etiqueta>
                          {p.disponivel_para_mentoria && <Etiqueta tom="success" icone={GraduationCap}>Mentor</Etiqueta>}
                          {!p.ativo && <Etiqueta tom="neutral">Inativo</Etiqueta>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 border-t border-border pt-3">
                      <p className="flex items-center gap-1.5 text-2xs text-fg-muted">
                        <Building2 className="size-3.5 shrink-0" aria-hidden />{p.area || "Área não informada"}
                      </p>
                      <p className="flex items-center gap-1.5 text-2xs text-fg-muted">
                        <MapPin className="size-3.5 shrink-0" aria-hidden />{p.localizacao || "Localização não informada"}
                      </p>
                      <p className="flex items-center gap-1.5 text-2xs text-fg-muted">
                        <UserCheck className="size-3.5 shrink-0" aria-hidden />Gestor: {p.gestor_nome || "—"}
                      </p>
                      <p className="flex items-center gap-1.5 text-2xs text-fg-muted">
                        <Mail className="size-3.5 shrink-0" aria-hidden />{p.email}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                      <div>
                        <p className="text-2xs uppercase tracking-wide text-fg-muted">Capacidades</p>
                        <p className="text-sm font-bold tabular-nums text-fg">{numero(linha?.total_skills || 0)}</p>
                      </div>
                      <div>
                        <p className="text-2xs uppercase tracking-wide text-fg-muted">Nível médio</p>
                        <p className="text-sm font-bold tabular-nums" style={{ color: corNivel(Math.round(linha?.nivel_medio || 0)) }}>
                          {numero(linha?.nivel_medio || 0, 2)}
                        </p>
                      </div>
                    </div>

                    {(p.interesses || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 border-t border-border pt-3">
                        {(p.interesses || []).slice(0, 4).map((i) => (<Chip key={i} cor="#0891B2">{i}</Chip>))}
                        {p.interesses.length > 4 && <Chip cor="#64748B">+{p.interesses.length - 4}</Chip>}
                      </div>
                    )}
                  </button>
                );
              })}
            </GradeCards>
          )}

          {pessoas.data && filtrada.length > 0 && visual === "tabela" && (
            <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
              <Tabela
                colunas={colunas}
                dados={filtrada}
                compacta
                aoClicarLinha={(p) => navegar("/pessoas/" + p.id)}
                vazio={<Vazio icone={Users} titulo="Nenhuma pessoa" />}
              />
            </div>
          )}
        </>
      )}

      {aba === "organograma" && (
        <SecaoOrganograma
          dados={organograma.data}
          carregando={organograma.isLoading}
          erro={organograma.isError ? organograma.error : null}
          resumoPorUsuario={resumoPorUsuario}
          aoAbrir={(id) => navegar("/pessoas/" + id)}
        />
      )}
    </div>
  );
}

/* ==========================================================================
   Organograma hierárquico
   ========================================================================== */

function SecaoOrganograma({
  dados, carregando, erro, resumoPorUsuario, aoAbrir,
}: {
  dados?: RespostaOrganograma;
  carregando: boolean;
  erro: Error | null;
  resumoPorUsuario: Record<number, LinhaMatriz>;
  aoAbrir: (id: number) => void;
}) {
  const [recolhidos, setRecolhidos] = useState<number[]>([]);

  const arvore = useMemo(() => {
    if (!dados) return { raizes: [] as NoOrganograma[], filhos: {} as Record<number, NoOrganograma[]> };
    const ids = new Set(dados.nos.map((n) => n.id));
    const filhos: Record<number, NoOrganograma[]> = {};
    const raizes: NoOrganograma[] = [];
    dados.nos.forEach((n) => {
      if (n.gestor && ids.has(n.gestor)) {
        const atual = filhos[n.gestor] || [];
        atual.push(n);
        filhos[n.gestor] = atual;
      } else {
        raizes.push(n);
      }
    });
    Object.keys(filhos).forEach((k) => {
      filhos[Number(k)].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    });
    return { raizes: raizes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), filhos };
  }, [dados]);

  if (carregando) return <CarregandoBloco rotulo="Montando o organograma..." />;
  if (erro) return <Alerta tom="danger" titulo="Não foi possível carregar o organograma">{mensagemErro(erro)}</Alerta>;
  if (!dados || dados.nos.length === 0) {
    return <Vazio icone={Network} titulo="Organograma vazio" descricao="Nenhum colaborador ativo com relação de gestão cadastrada." />;
  }

  const alternar = (id: number) => setRecolhidos(recolhidos.indexOf(id) >= 0 ? recolhidos.filter((x) => x !== id) : recolhidos.concat([id]));

  const renderizarNo = (no: NoOrganograma, nivel: number) => {
    const subordinados = arvore.filhos[no.id] || [];
    const recolhido = recolhidos.indexOf(no.id) >= 0;
    const resumo = resumoPorUsuario[no.id];
    return (
      <li key={no.id} className="relative">
        <div className="flex items-center gap-2">
          {subordinados.length > 0 ? (
            <button
              type="button"
              onClick={() => alternar(no.id)}
              className="grid size-6 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-surface-3"
              aria-label={recolhido ? "Expandir equipe" : "Recolher equipe"}
              aria-expanded={!recolhido}
            >
              {recolhido ? <ChevronRight className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
            </button>
          ) : (
            <span className="grid size-6 shrink-0 place-items-center text-fg-subtle" aria-hidden>
              <span className="size-1.5 rounded-full bg-border-strong" />
            </span>
          )}
          <button
            type="button"
            onClick={() => aoAbrir(no.id)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sgp border border-border bg-surface px-2.5 py-1.5 text-left transition-all hover:border-brand/50 hover:shadow-n1"
          >
            <Avatar nome={no.nome} cor={no.cor} iniciais={no.iniciais} tamanho={nivel === 0 ? "md" : "sm"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-fg">{no.nome}</p>
              <p className="truncate text-2xs text-fg-muted">{no.cargo || "Cargo não informado"}{no.area ? " · " + no.area : ""}</p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <Etiqueta tom={TOM_PERFIL[no.perfil] || "neutral"}>{ROTULO_PERFIL[no.perfil] || no.perfil}</Etiqueta>
              {resumo && (
                <span className="inline-flex items-center gap-1 text-2xs text-fg-muted">
                  <Briefcase className="size-3" aria-hidden />{numero(resumo.total_skills)} · N{numero(resumo.nivel_medio, 1)}
                </span>
              )}
              {subordinados.length > 0 && (
                <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-2xs text-fg-muted">{subordinados.length}</span>
              )}
            </div>
          </button>
        </div>
        {subordinados.length > 0 && !recolhido && (
          <ul className="ml-3 mt-1.5 space-y-1.5 border-l border-dashed border-border pl-4">
            {subordinados.map((s) => renderizarNo(s, nivel + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sgp-lg border border-border bg-surface p-3">
        <p className="text-xs text-fg-muted">
          {numero(dados.nos.length)} colaboradores ativos · {numero(arvore.raizes.length)} raiz(zes) de hierarquia
        </p>
        <div className="flex gap-1.5">
          <Botao tamanho="xs" variante="fantasma" onClick={() => setRecolhidos([])}>Expandir tudo</Botao>
          <Botao
            tamanho="xs"
            variante="fantasma"
            onClick={() => setRecolhidos(dados.nos.filter((n) => (arvore.filhos[n.id] || []).length > 0).map((n) => n.id))}
          >
            Recolher tudo
          </Botao>
        </div>
      </div>
      <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
        <ul className="space-y-2">
          {arvore.raizes.map((r) => renderizarNo(r, 0))}
        </ul>
      </div>
    </div>
  );
}
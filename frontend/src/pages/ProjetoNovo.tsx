import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Building2, CalendarRange, Check, ChevronLeft, ChevronRight, Cloud, Cpu, Database,
  Flag, FolderKanban, Globe, GraduationCap, HeartPulse, LineChart, Plus, Rocket, Save,
  Shield, Smartphone, Sparkles, Target, Trash2, Truck, UserPlus, Users, Wallet, type LucideIcon,
} from "lucide-react";
import {
  Alerta, AnelProgresso, AreaTexto, Avatar, BarraProgresso, Botao, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, ControleDeslizante, Entrada, EntradaBusca, Etiqueta, Interruptor,
  Selecao, Semaforo, Vazio, useAvisos,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { CHAVES, useConsulta, useMutacao } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { dataCurta, diasEntre, hojeISO, moeda, numero, somarDias } from "@/lib/format";
import { soma } from "@/lib/utils";
import type { Alocacao, Marco, Projeto, ResultadoMatching } from "@/lib/types";

/* ==========================================================================
   Assistente visual de criacao de projeto em 4 passos (RF-01 / secao 2.4)
   Passo 1 cartao, passo 2 timeline arrastavel, passo 3 capacidades,
   passo 4 equipe sugerida pelo motor de matching.
   ========================================================================== */

const ICONES: Record<string, LucideIcon> = {
  "folder-kanban": FolderKanban,
  rocket: Rocket,
  target: Target,
  shield: Shield,
  cloud: Cloud,
  database: Database,
  smartphone: Smartphone,
  globe: Globe,
  cpu: Cpu,
  "chart-line": LineChart,
  building: Building2,
  "heart-pulse": HeartPulse,
  truck: Truck,
  "graduation-cap": GraduationCap,
};

const PASSOS = [
  { numero: 1, titulo: "Cartão do projeto", icone: FolderKanban, descricao: "Identidade visual, responsáveis e orçamento." },
  { numero: 2, titulo: "Timeline arrastável", icone: CalendarRange, descricao: "Início, fim e marcos do projeto." },
  { numero: 3, titulo: "Capacidades requeridas", icone: Sparkles, descricao: "Skills com nível mínimo e desejado." },
  { numero: 4, titulo: "Equipe sugerida", icone: Users, descricao: "Pessoas ranqueadas pelo motor de matching." },
];

const OPCOES_PRIORIDADE = [
  { valor: "BAIXA", rotulo: "Baixa" },
  { valor: "MEDIA", rotulo: "Média" },
  { valor: "ALTA", rotulo: "Alta" },
  { valor: "CRITICA", rotulo: "Crítica" },
];

const OPCOES_CRITICIDADE = [
  { valor: "BAIXA", rotulo: "Baixa" },
  { valor: "MEDIA", rotulo: "Média" },
  { valor: "ALTA", rotulo: "Alta" },
  { valor: "ESTRATEGICA", rotulo: "Estratégica" },
];

interface SkillCatalogo {
  id: number;
  nome: string;
  icone: string;
  cor: string;
  tipo: string;
  criticidade: string;
  categoria: string;
}

interface Catalogo {
  passos: Array<{ numero: number; titulo: string; icone: string; descricao: string }>;
  icones: string[];
  cores: string[];
  categorias: string[];
  areas: string[];
  skills: SkillCatalogo[];
  gerentes: Array<{ id: number; nome: string; cargo: string; cor: string; iniciais: string }>;
}

interface DadosProjeto {
  nome: string;
  descricao: string;
  objetivo: string;
  categoria: string;
  area: string;
  icone: string;
  cor: string;
  sponsor: string;
  manager: string;
  prioridade: string;
  criticidade: string;
  orcamento_total: string;
  percentual_capex: number;
  receita_prevista: string;
  data_inicio: string;
  data_fim: string;
}

interface MarcoForm {
  chave: string;
  nome: string;
  data_prevista: string;
}

interface RequisitoForm {
  skill: number;
  nome: string;
  icone: string;
  cor: string;
  categoria: string;
  tipo: string;
  nivel_minimo: number;
  nivel_desejado: number;
  quantidade: number;
  peso: number;
  obrigatorio: boolean;
}

const DADOS_INICIAIS: DadosProjeto = {
  nome: "",
  descricao: "",
  objetivo: "",
  categoria: "",
  area: "",
  icone: "folder-kanban",
  cor: "#3B82F6",
  sponsor: "",
  manager: "",
  prioridade: "MEDIA",
  criticidade: "MEDIA",
  orcamento_total: "0",
  percentual_capex: 60,
  receita_prevista: "0",
  data_inicio: hojeISO(),
  data_fim: somarDias(hojeISO(), 90),
};

function normalizarScore(score: number) {
  const valor = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, valor));
}

export default function ProjetoNovo() {
  const navegar = useNavigate();
  const { sucesso, erro: avisarErro } = useAvisos();

  const [passo, setPasso] = useState(1);
  const [dados, setDados] = useState<DadosProjeto>(DADOS_INICIAIS);
  const [marcos, setMarcos] = useState<MarcoForm[]>([]);
  const [novoMarco, setNovoMarco] = useState<{ nome: string; data_prevista: string }>({ nome: "", data_prevista: hojeISO() });
  const [requisitos, setRequisitos] = useState<RequisitoForm[]>([]);
  const [buscaSkill, setBuscaSkill] = useState("");
  const [filtroCategoriaSkill, setFiltroCategoriaSkill] = useState("");
  const [filtroTipoSkill, setFiltroTipoSkill] = useState("");
  const [modo, setModo] = useState("PERFORMANCE");
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [projetoId, setProjetoId] = useState<number | null>(null);
  const [marcosCriados, setMarcosCriados] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [arrasto, setArrasto] = useState<{ x: number; inicio: string; fim: string; tipo: "mover" | "inicio" | "fim" } | null>(null);
  const trilhaRef = useRef<HTMLDivElement>(null);

  const { data: catalogo, isLoading: carregandoCatalogo, isError: erroCatalogo, error: erroCatalogoObj } = useConsulta<Catalogo>(
    ["projetos", "catalogo"],
    "/projetos/assistente/catalogo/"
  );

  const anoBase = Number((dados.data_inicio || hojeISO()).slice(0, 4)) || new Date().getFullYear();
  const inicioAno = anoBase + "-01-01";
  const fimAno = anoBase + "-12-31";
  const totalDiasAno = diasEntre(inicioAno, fimAno) + 1;
  const duracao = Math.max(0, diasEntre(dados.data_inicio, dados.data_fim));
  const posicaoInicio = Math.max(0, Math.min(100, (diasEntre(inicioAno, dados.data_inicio) / totalDiasAno) * 100));
  const posicaoFim = Math.max(0, Math.min(100, (diasEntre(inicioAno, dados.data_fim) / totalDiasAno) * 100));
  const larguraBarra = Math.max(0.8, posicaoFim - posicaoInicio);
  const diaInicio = Math.max(0, Math.min(totalDiasAno - 1, diasEntre(inicioAno, dados.data_inicio)));
  const diaFim = Math.max(0, Math.min(totalDiasAno - 1, diasEntre(inicioAno, dados.data_fim)));

  useEffect(() => {
    if (!arrasto) return;
    const mover = (evento: MouseEvent) => {
      const caixa = trilhaRef.current?.getBoundingClientRect();
      const largura = caixa?.width || 1;
      const delta = Math.round(((evento.clientX - arrasto.x) / largura) * totalDiasAno);
      setDados((atual) => {
        if (arrasto.tipo === "inicio") {
          const inicio = somarDias(arrasto.inicio, delta);
          return { ...atual, data_inicio: inicio > atual.data_fim ? atual.data_fim : inicio };
        }
        if (arrasto.tipo === "fim") {
          const fim = somarDias(arrasto.fim, delta);
          return { ...atual, data_fim: fim < atual.data_inicio ? atual.data_inicio : fim };
        }
        return { ...atual, data_inicio: somarDias(arrasto.inicio, delta), data_fim: somarDias(arrasto.fim, delta) };
      });
    };
    const soltar = () => setArrasto(null);
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
    };
  }, [arrasto, totalDiasAno]);

  const orcamentoTotal = Number(dados.orcamento_total) || 0;
  const capex = Math.round((orcamentoTotal * dados.percentual_capex) / 100);
  const opex = orcamentoTotal - capex;

  const podeAvancar1 = dados.nome.trim().length >= 3 && Boolean(dados.categoria) && Boolean(dados.area) && Boolean(dados.manager);
  const podeAvancar2 = Boolean(dados.data_inicio) && Boolean(dados.data_fim) && dados.data_fim >= dados.data_inicio;
  const podeAvancar3 = requisitos.length > 0;

  const categoriasSkill = useMemo(
    () => Array.from(new Set((catalogo?.skills ?? []).map((item) => item.categoria).filter(Boolean))).sort(),
    [catalogo]
  );
  const tiposSkill = useMemo(
    () => Array.from(new Set((catalogo?.skills ?? []).map((item) => item.tipo).filter(Boolean))).sort(),
    [catalogo]
  );

  const skillsFiltradas = useMemo(() => {
    const busca = buscaSkill.trim().toLowerCase();
    return (catalogo?.skills ?? []).filter((skill) => {
      if (filtroCategoriaSkill && skill.categoria !== filtroCategoriaSkill) return false;
      if (filtroTipoSkill && skill.tipo !== filtroTipoSkill) return false;
      if (busca && !skill.nome.toLowerCase().includes(busca)) return false;
      return true;
    });
  }, [catalogo, buscaSkill, filtroCategoriaSkill, filtroTipoSkill]);

  const invalidarProjetos = [CHAVES.projetos, CHAVES.projetosCards, CHAVES.projetosTimeline];

  const criarProjeto = useMutacao<Record<string, unknown>, Projeto>({
    url: "/projetos/",
    invalidar: invalidarProjetos,
  });

  const atualizarProjeto = useMutacao<Record<string, unknown> & { id: number }, Projeto>({
    metodo: "patch",
    url: (valores) => "/projetos/" + valores.id + "/",
    invalidar: invalidarProjetos,
  });

  const criarMarco = useMutacao<Record<string, unknown>, Marco>({
    url: "/marcos/",
    invalidar: [["marcos"]],
  });

  const definirRequisitos = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/requisitos-projeto/definir/",
    invalidar: [["capacidades", "gap"], ["requisitos-projeto"]],
  });

  const criarAlocacao = useMutacao<Record<string, unknown>, Alocacao>({
    url: "/alocacoes/",
    invalidar: [CHAVES.alocacoes, ["alocacoes", "conflitos"], CHAVES.projetosCards],
  });

  const matching = useConsulta<ResultadoMatching>(
    ["matching", "projeto", String(projetoId || "")],
    projetoId ? "/capacidades/matching/" : null,
    { project: projetoId, modo, limite: 12 }
  );

  const recomendacoes = matching.data?.recomendacoes ?? [];

  const escolhidas = useMemo(
    () => recomendacoes.filter((item) => selecionados[String(item.user_id)]),
    [recomendacoes, selecionados]
  );

  const custoEstimado = soma(escolhidas.map((item) => Number(item.justificativa?.custo_estimado_reais) || 0));

  const adicionarSkill = (skill: SkillCatalogo) => {
    setRequisitos((atual) => {
      if (atual.some((item) => item.skill === skill.id)) return atual.filter((item) => item.skill !== skill.id);
      return atual.concat({
        skill: skill.id,
        nome: skill.nome,
        icone: skill.icone,
        cor: skill.cor,
        categoria: skill.categoria,
        tipo: skill.tipo,
        nivel_minimo: 3,
        nivel_desejado: 4,
        quantidade: 1,
        peso: 1,
        obrigatorio: false,
      });
    });
  };

  const atualizarRequisito = (skillId: number, parcial: Partial<RequisitoForm>) => {
    setRequisitos((atual) => atual.map((item) => (item.skill === skillId ? { ...item, ...parcial } : item)));
  };

  const adicionarMarco = () => {
    if (!novoMarco.nome.trim() || !novoMarco.data_prevista) {
      avisarErro("Marco incompleto", "Informe o nome e a data prevista do marco.");
      return;
    }
    setMarcos((atual) =>
      atual.concat({
        chave: String(Date.now()) + "-" + String(atual.length),
        nome: novoMarco.nome.trim(),
        data_prevista: novoMarco.data_prevista,
      })
    );
    setNovoMarco({ nome: "", data_prevista: hojeISO() });
  };

  const payloadProjeto = () => ({
    nome: dados.nome.trim(),
    descricao: dados.descricao,
    objetivo: dados.objetivo,
    categoria: dados.categoria,
    area: dados.area,
    icone: dados.icone,
    cor: dados.cor,
    sponsor: dados.sponsor ? Number(dados.sponsor) : null,
    manager: dados.manager ? Number(dados.manager) : null,
    prioridade: dados.prioridade,
    criticidade: dados.criticidade,
    orcamento: orcamentoTotal,
    orcamento_capex: capex,
    orcamento_opex: opex,
    receita_prevista: Number(dados.receita_prevista) || 0,
    data_inicio: dados.data_inicio,
    data_fim: dados.data_fim,
    status: "PLANEJADO",
  });

  const persistir = async () => {
    let id = projetoId;
    if (!id) {
      const criado = await criarProjeto.mutateAsync(payloadProjeto());
      id = criado.id;
    } else {
      await atualizarProjeto.mutateAsync({ ...payloadProjeto(), id });
    }
    if (marcosCriados.length) {
      for (const marcoId of marcosCriados) {
        try {
          await api.del("/marcos/" + marcoId + "/");
        } catch (falha) {
          void falha;
        }
      }
    }
    const novosIds: number[] = [];
    for (const marco of marcos) {
      const criado = await criarMarco.mutateAsync({
        project: id,
        nome: marco.nome,
        data_prevista: marco.data_prevista,
        critico: false,
      });
      novosIds.push(criado.id);
    }
    setMarcosCriados(novosIds);
    await definirRequisitos.mutateAsync({
      project: id,
      substituir: true,
      requisitos: requisitos.map((item) => ({
        skill: item.skill,
        nivel_minimo: item.nivel_minimo,
        nivel_desejado: item.nivel_desejado,
        quantidade: item.quantidade,
        peso: item.peso,
        obrigatorio: item.obrigatorio,
      })),
    });
    setProjetoId(id);
    return id;
  };

  const irPara = async (destino: number) => {
    if (destino === passo) return;
    if (destino < passo) {
      setPasso(destino);
      return;
    }
    if (passo === 1 && !podeAvancar1) {
      avisarErro("Complete o cartão do projeto", "Nome, categoria, área e gerente são obrigatórios.");
      return;
    }
    if (passo === 2 && !podeAvancar2) {
      avisarErro("Revise a timeline", "Informe início e fim com a data final posterior à inicial.");
      return;
    }
    if (passo === 3 && !podeAvancar3) {
      avisarErro("Selecione ao menos uma capacidade", "Os requisitos alimentam o motor de matching do passo 4.");
      return;
    }
    if (destino === 4 && passo === 3) {
      setSalvando(true);
      try {
        await persistir();
      } catch (falha) {
        avisarErro("Não foi possível salvar o projeto", mensagemErro(falha));
        setSalvando(false);
        return;
      }
      setSalvando(false);
    }
    setPasso(destino);
  };

  const finalizar = async () => {
    if (!projetoId) {
      avisarErro("Projeto ainda não salvo", "Volte ao passo 3 e avance novamente para gerar as recomendações.");
      return;
    }
    setSalvando(true);
    try {
      for (const pessoa of escolhidas) {
        await criarAlocacao.mutateAsync({
          project: projetoId,
          user: pessoa.user_id,
          percentual: 100,
          data_inicio: dados.data_inicio,
          data_fim: dados.data_fim,
          status: "PROPOSTA",
          modalidade: modo === "DESENVOLVIMENTO" ? "DESENVOLVIMENTO" : modo === "MISTA" ? "MISTA" : "PERFORMANCE",
          papel: pessoa.cargo || "",
          justificativa: "Sugerido pelo motor de matching no assistente de criação do projeto.",
          score_matching: pessoa.score,
        });
      }
      sucesso(
        "Projeto criado com sucesso",
        dados.nome + " foi criado" + (escolhidas.length ? " com " + numero(escolhidas.length) + " alocação(ões) proposta(s)." : ".")
      );
      navegar("/projetos/" + projetoId);
    } catch (falha) {
      avisarErro("Não foi possível concluir", mensagemErro(falha));
    }
    setSalvando(false);
  };

  if (carregandoCatalogo) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Novo projeto" subtitulo="Assistente de criação em 4 passos" icone={Plus} cor="#2563EB" />
        <CarregandoBloco rotulo="Carregando catálogo do assistente..." />
      </div>
    );
  }

  if (erroCatalogo) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Novo projeto" subtitulo="Assistente de criação em 4 passos" icone={Plus} cor="#2563EB" />
        <Alerta tom="danger" titulo="Não foi possível carregar o catálogo">
          {mensagemErro(erroCatalogoObj)}
        </Alerta>
      </div>
    );
  }

  const IconeProjeto = ICONES[dados.icone] || FolderKanban;
  const gerenteSelecionado = (catalogo?.gerentes ?? []).find((item) => String(item.id) === dados.manager) || null;
  const patrocinadorSelecionado = (catalogo?.gerentes ?? []).find((item) => String(item.id) === dados.sponsor) || null;

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Novo projeto"
        subtitulo="Assistente visual em 4 passos: cartão, timeline, capacidades e equipe sugerida."
        icone={Plus}
        cor="#2563EB"
        migalhas={[
          { rotulo: "Projetos", onClick: () => navegar("/projetos") },
          { rotulo: "Novo projeto" },
        ]}
      />

      <div className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
        <div className="flex flex-wrap items-center gap-3">
          {PASSOS.map((item, indice) => {
            const Icone = item.icone;
            const ativo = passo === item.numero;
            const concluido = passo > item.numero;
            return (
              <div key={item.numero} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => irPara(item.numero <= passo ? item.numero : passo + 1)}
                  className={
                    "flex items-center gap-2 rounded-sgp border px-2.5 py-1.5 text-left transition-colors " +
                    (ativo
                      ? "border-brand bg-brand-soft/60 text-brand"
                      : concluido
                        ? "border-success/40 bg-success-soft/40 text-success"
                        : "border-border text-fg-muted hover:bg-surface-2")
                  }
                  aria-current={ativo ? "step" : undefined}
                >
                  <span
                    className={
                      "grid size-6 shrink-0 place-items-center rounded-full text-2xs font-bold " +
                      (ativo ? "bg-brand text-brand-fg" : concluido ? "bg-success text-white" : "bg-surface-3 text-fg-muted")
                    }
                  >
                    {concluido ? <Check className="size-3.5" aria-hidden /> : item.numero}
                  </span>
                  <span className="hidden sm:block">
                    <span className="block text-2xs font-semibold">{item.titulo}</span>
                    <span className="block text-2xs opacity-80">{item.descricao}</span>
                  </span>
                </button>
                <Icone className="hidden size-4 shrink-0 text-fg-subtle lg:block" aria-hidden />
                {indice < PASSOS.length - 1 && <span className="hidden h-0.5 flex-1 rounded-full bg-border lg:block" />}
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <BarraProgresso valor={(passo / PASSOS.length) * 100} altura="sm" rotulo={"Passo " + passo + " de 4"} mostrarValor />
        </div>
      </div>

      {passo === 1 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <h2 className="text-sm font-semibold text-fg">Cartão do projeto</h2>

            <Campo rotulo="Nome do projeto" obrigatorio dica="Mínimo de 3 caracteres." htmlFor="novo-nome">
              <Entrada
                id="novo-nome"
                value={dados.nome}
                onChange={(evento) => setDados({ ...dados, nome: evento.target.value })}
                placeholder="Ex.: Modernização do portal do cliente"
              />
            </Campo>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Descrição" htmlFor="novo-descricao">
                <AreaTexto
                  id="novo-descricao"
                  rows={3}
                  value={dados.descricao}
                  onChange={(evento) => setDados({ ...dados, descricao: evento.target.value })}
                />
              </Campo>
              <Campo rotulo="Objetivo" dica="Resultado mensurável esperado." htmlFor="novo-objetivo">
                <AreaTexto
                  id="novo-objetivo"
                  rows={3}
                  value={dados.objetivo}
                  onChange={(evento) => setDados({ ...dados, objetivo: evento.target.value })}
                />
              </Campo>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Categoria" obrigatorio htmlFor="novo-categoria">
                <Selecao
                  id="novo-categoria"
                  value={dados.categoria}
                  onChange={(evento) => setDados({ ...dados, categoria: evento.target.value })}
                >
                  <option value="">Selecione a categoria</option>
                  {(catalogo?.categorias ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Área" obrigatorio htmlFor="novo-area">
                <Selecao id="novo-area" value={dados.area} onChange={(evento) => setDados({ ...dados, area: evento.target.value })}>
                  <option value="">Selecione a área</option>
                  {(catalogo?.areas ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <Campo rotulo="Ícone" dica="Identidade visual do cartão do projeto.">
              <div className="flex flex-wrap gap-2">
                {(catalogo?.icones ?? []).map((chave) => {
                  const Icone = ICONES[chave] || FolderKanban;
                  const ativo = dados.icone === chave;
                  return (
                    <button
                      key={chave}
                      type="button"
                      aria-label={"Ícone " + chave}
                      onClick={() => setDados({ ...dados, icone: chave })}
                      className={
                        "grid size-10 place-items-center rounded-sgp border transition-all " +
                        (ativo ? "border-brand bg-brand-soft/60 text-brand scale-105" : "border-border text-fg-muted hover:bg-surface-2")
                      }
                    >
                      <Icone className="size-4.5" aria-hidden />
                    </button>
                  );
                })}
              </div>
            </Campo>

            <Campo rotulo="Cor">
              <div className="flex flex-wrap gap-2">
                {(catalogo?.cores ?? []).map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    aria-label={"Cor " + cor}
                    onClick={() => setDados({ ...dados, cor })}
                    className={
                      "size-8 rounded-full border-2 transition-transform " +
                      (dados.cor === cor ? "border-fg scale-110" : "border-transparent hover:scale-105")
                    }
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </Campo>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Patrocinador" htmlFor="novo-sponsor">
                <Selecao
                  id="novo-sponsor"
                  value={dados.sponsor}
                  onChange={(evento) => setDados({ ...dados, sponsor: evento.target.value })}
                >
                  <option value="">Sem patrocinador</option>
                  {(catalogo?.gerentes ?? []).map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Gerente" obrigatorio htmlFor="novo-gerente">
                <Selecao
                  id="novo-gerente"
                  value={dados.manager}
                  onChange={(evento) => setDados({ ...dados, manager: evento.target.value })}
                >
                  <option value="">Selecione o gerente</option>
                  {(catalogo?.gerentes ?? []).map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.nome}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Prioridade" htmlFor="novo-prioridade">
                <Selecao
                  id="novo-prioridade"
                  value={dados.prioridade}
                  onChange={(evento) => setDados({ ...dados, prioridade: evento.target.value })}
                >
                  {OPCOES_PRIORIDADE.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Criticidade" htmlFor="novo-criticidade">
                <Selecao
                  id="novo-criticidade"
                  value={dados.criticidade}
                  onChange={(evento) => setDados({ ...dados, criticidade: evento.target.value })}
                >
                  {OPCOES_CRITICIDADE.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </div>

            <div className="space-y-3 rounded-sgp border border-border bg-surface-2 p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <Wallet className="size-3.5 text-fg-muted" aria-hidden />
                Orçamento
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Orçamento total (R$)" htmlFor="novo-orcamento">
                  <Entrada
                    id="novo-orcamento"
                    type="number"
                    min={0}
                    step={1000}
                    value={dados.orcamento_total}
                    onChange={(evento) => setDados({ ...dados, orcamento_total: evento.target.value })}
                  />
                </Campo>
                <Campo rotulo="Receita prevista (R$)" htmlFor="novo-receita">
                  <Entrada
                    id="novo-receita"
                    type="number"
                    min={0}
                    step={1000}
                    value={dados.receita_prevista}
                    onChange={(evento) => setDados({ ...dados, receita_prevista: evento.target.value })}
                  />
                </Campo>
              </div>
              <ControleDeslizante
                valor={dados.percentual_capex}
                onChange={(valor) => setDados({ ...dados, percentual_capex: valor })}
                min={0}
                max={100}
                rotulo="Divisão CAPEX / OPEX"
                sufixo="% CAPEX"
                marcos={[0, 25, 50, 75, 100]}
              />
              <div className="grid grid-cols-2 gap-2 text-2xs">
                <div className="rounded-sgp border border-border bg-surface px-2 py-1.5">
                  <p className="text-fg-muted">CAPEX</p>
                  <p className="font-semibold tabular-nums text-fg">{moeda(capex, true)}</p>
                </div>
                <div className="rounded-sgp border border-border bg-surface px-2 py-1.5">
                  <p className="text-fg-muted">OPEX</p>
                  <p className="font-semibold tabular-nums text-fg">{moeda(opex, true)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="sticky top-2 space-y-3 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Pré-visualização do cartão</p>
              <div className="flex flex-col gap-3 rounded-sgp-lg border border-border bg-surface-2 p-3.5">
                <div className="flex items-start gap-2.5">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-sgp"
                    style={{ backgroundColor: dados.cor + "1f", color: dados.cor }}
                    aria-hidden
                  >
                    <IconeProjeto className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-2xs font-semibold uppercase tracking-wide text-fg-subtle">PRJ-{anoBase}-###</p>
                    <h3 className="truncate text-sm font-semibold text-fg">{dados.nome || "Nome do projeto"}</h3>
                    <p className="truncate text-2xs text-fg-muted">{dados.categoria || "Categoria não definida"}</p>
                  </div>
                  <Semaforo saude="CINZA" comRotulo={false} tamanho="md" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Etiqueta tom="brand">Planejado</Etiqueta>
                  <Etiqueta tom={dados.prioridade === "CRITICA" ? "danger" : dados.prioridade === "ALTA" ? "warning" : "info"}>
                    {dados.prioridade}
                  </Etiqueta>
                  <Etiqueta tom="neutral">{dados.criticidade}</Etiqueta>
                  {dados.area && <Etiqueta tom="neutral">{dados.area}</Etiqueta>}
                </div>
                <BarraProgresso valor={0} comparativo={0} altura="sm" rotulo="Executado × planejado" mostrarValor />
                <div className="flex items-center justify-between gap-2 border-t border-border pt-2 text-2xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {gerenteSelecionado ? (
                      <>
                        <Avatar nome={gerenteSelecionado.nome} cor={gerenteSelecionado.cor} iniciais={gerenteSelecionado.iniciais} tamanho="xs" />
                        <span className="truncate text-fg-muted">{gerenteSelecionado.nome}</span>
                      </>
                    ) : (
                      <span className="text-fg-subtle">Gerente não definido</span>
                    )}
                  </span>
                  <span className="font-semibold tabular-nums text-fg">{moeda(orcamentoTotal, true)}</span>
                </div>
                <div className="flex items-center justify-between text-2xs text-fg-muted">
                  <span>{dataCurta(dados.data_inicio)} → {dataCurta(dados.data_fim)}</span>
                  <span>{numero(duracao)} dia(s)</span>
                </div>
                {patrocinadorSelecionado && (
                  <p className="text-2xs text-fg-subtle">Patrocinador: {patrocinadorSelecionado.nome}</p>
                )}
              </div>

              {!podeAvancar1 && (
                <Alerta tom="info" titulo="Campos obrigatórios">
                  Nome (3+ caracteres), categoria, área e gerente precisam estar preenchidos para avançar.
                </Alerta>
              )}
            </div>
          </div>
        </div>
      )}

      {passo === 2 && (
        <div className="space-y-4 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h2 className="text-sm font-semibold text-fg">Timeline arrastável</h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Início" obrigatorio htmlFor="novo-inicio">
              <Entrada
                id="novo-inicio"
                type="date"
                value={dados.data_inicio}
                onChange={(evento) => {
                  const inicio = evento.target.value;
                  setDados((atual) => ({
                    ...atual,
                    data_inicio: inicio,
                    data_fim: atual.data_fim < inicio ? inicio : atual.data_fim,
                  }));
                }}
              />
            </Campo>
            <Campo rotulo="Fim" obrigatorio htmlFor="novo-fim">
              <Entrada
                id="novo-fim"
                type="date"
                value={dados.data_fim}
                onChange={(evento) => {
                  const fim = evento.target.value;
                  setDados((atual) => ({
                    ...atual,
                    data_fim: fim < atual.data_inicio ? atual.data_inicio : fim,
                  }));
                }}
              />
            </Campo>
            <div className="rounded-sgp border border-border bg-surface-2 px-3 py-2">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Duração</p>
              <p className="text-lg font-bold tabular-nums text-fg">{numero(duracao)} dia(s)</p>
              <p className="text-2xs text-fg-muted">{numero(Math.round(duracao / 7))} semana(s) · {numero(Math.round(duracao / 30))} mês(es)</p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 px-3 py-2">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Posição em {anoBase}</p>
              <p className="text-lg font-bold tabular-nums text-fg">{numero(posicaoInicio)}% → {numero(posicaoFim)}%</p>
              <p className="text-2xs text-fg-muted">Percentual do ano coberto pelo projeto</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-2xs text-fg-muted">
              <span>Janeiro {anoBase}</span>
              <span className="italic">Arraste a barra para mover o período · use as alças para ajustar início e fim</span>
              <span>Dezembro {anoBase}</span>
            </div>
            <div
              ref={trilhaRef}
              className="relative h-20 select-none overflow-hidden rounded-sgp border border-border bg-surface-2"
            >
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-1">
                {Array.from({ length: 12 }).map((_, indice) => (
                  <span key={indice} className="h-6 w-px bg-border" />
                ))}
              </div>
              <div
                className="absolute top-1/2 flex h-9 -translate-y-1/2 cursor-grab items-center rounded-md border shadow-n1 active:cursor-grabbing"
                style={{
                  left: posicaoInicio + "%",
                  width: larguraBarra + "%",
                  backgroundColor: dados.cor + "33",
                  borderColor: dados.cor + "88",
                  touchAction: "none",
                }}
                onMouseDown={(evento) => setArrasto({ x: evento.clientX, inicio: dados.data_inicio, fim: dados.data_fim, tipo: "mover" })}
                title={"Arraste para mover · " + dataCurta(dados.data_inicio) + " → " + dataCurta(dados.data_fim)}
              >
                <span
                  className="absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l-md opacity-0 hover:opacity-100"
                  style={{ backgroundColor: dados.cor }}
                  onMouseDown={(evento) => {
                    evento.stopPropagation();
                    setArrasto({ x: evento.clientX, inicio: dados.data_inicio, fim: dados.data_fim, tipo: "inicio" });
                  }}
                  aria-hidden
                />
                <span className="relative z-10 truncate px-2 text-2xs font-semibold text-fg">
                  {dados.nome || "Novo projeto"} · {numero(duracao)} dia(s)
                </span>
                <span
                  className="absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r-md opacity-0 hover:opacity-100"
                  style={{ backgroundColor: dados.cor }}
                  onMouseDown={(evento) => {
                    evento.stopPropagation();
                    setArrasto({ x: evento.clientX, inicio: dados.data_inicio, fim: dados.data_fim, tipo: "fim" });
                  }}
                  aria-hidden
                />
              </div>
              {marcos.map((marco) => {
                const posicao = Math.max(0, Math.min(100, (diasEntre(inicioAno, marco.data_prevista) / totalDiasAno) * 100));
                return (
                  <span
                    key={marco.chave}
                    className="absolute bottom-1 -translate-x-1/2"
                    style={{ left: posicao + "%" }}
                    title={"Marco: " + marco.nome + " · " + dataCurta(marco.data_prevista)}
                  >
                    <Flag className="size-4 text-warning" aria-hidden />
                  </span>
                );
              })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ControleDeslizante
                valor={diaInicio}
                onChange={(valor) => {
                  const inicio = somarDias(inicioAno, valor);
                  setDados((atual) => ({ ...atual, data_inicio: inicio, data_fim: atual.data_fim < inicio ? inicio : atual.data_fim }));
                }}
                min={0}
                max={totalDiasAno - 1}
                rotulo="Dia do ano — início"
                sufixo=""
                marcos={[0, 91, 182, 273, totalDiasAno - 1]}
              />
              <ControleDeslizante
                valor={diaFim}
                onChange={(valor) => {
                  const fim = somarDias(inicioAno, valor);
                  setDados((atual) => ({ ...atual, data_fim: fim < atual.data_inicio ? atual.data_inicio : fim }));
                }}
                min={0}
                max={totalDiasAno - 1}
                rotulo="Dia do ano — fim"
                sufixo=""
                marcos={[0, 91, 182, 273, totalDiasAno - 1]}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-sgp border border-border bg-surface-2 p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-fg">
              <Flag className="size-3.5 text-warning" aria-hidden />
              Marcos do projeto ({numero(marcos.length)})
            </h3>
            <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <Entrada
                value={novoMarco.nome}
                onChange={(evento) => setNovoMarco({ ...novoMarco, nome: evento.target.value })}
                placeholder="Nome do marco"
                aria-label="Nome do marco"
              />
              <Entrada
                type="date"
                value={novoMarco.data_prevista}
                onChange={(evento) => setNovoMarco({ ...novoMarco, data_prevista: evento.target.value })}
                aria-label="Data prevista do marco"
              />
              <Botao variante="secundario" icone={Plus} onClick={adicionarMarco}>
                Adicionar marco
              </Botao>
            </div>
            {marcos.length === 0 ? (
              <p className="text-2xs text-fg-subtle">
                Nenhum marco adicionado. Marcos aparecem como bandeirinhas na barra e no Gantt do projeto.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {marcos.map((marco) => (
                  <li
                    key={marco.chave}
                    className="flex items-center gap-2 rounded-sgp border border-border bg-surface px-2.5 py-1.5"
                  >
                    <Flag className="size-3.5 shrink-0 text-warning" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-xs text-fg">{marco.nome}</span>
                    <span className="shrink-0 text-2xs tabular-nums text-fg-muted">{dataCurta(marco.data_prevista)}</span>
                    <Botao
                      tamanho="xs"
                      variante="fantasma"
                      icone={Trash2}
                      className="text-danger"
                      onClick={() => setMarcos((atual) => atual.filter((item) => item.chave !== marco.chave))}
                      aria-label={"Remover marco " + marco.nome}
                    >
                      Remover
                    </Botao>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!podeAvancar2 && (
            <Alerta tom="warning" titulo="Datas inconsistentes" icone={AlertTriangle}>
              Informe a data de início e uma data final igual ou posterior para prosseguir.
            </Alerta>
          )}
        </div>
      )}

      {passo === 3 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="space-y-3 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-fg">Capacidades requeridas</h2>
              <span className="text-2xs text-fg-muted">Clique nos chips para incluir ou remover capacidades</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <EntradaBusca valor={buscaSkill} onChange={setBuscaSkill} placeholder="Buscar capacidade..." className="w-full sm:w-64" />
              <Selecao value={filtroCategoriaSkill} onChange={(evento) => setFiltroCategoriaSkill(evento.target.value)} aria-label="Categoria da capacidade">
                <option value="">Todas as categorias</option>
                {categoriasSkill.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Selecao>
              <Selecao value={filtroTipoSkill} onChange={(evento) => setFiltroTipoSkill(evento.target.value)} aria-label="Tipo da capacidade">
                <option value="">Todos os tipos</option>
                {tiposSkill.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Selecao>
            </div>
            {skillsFiltradas.length === 0 ? (
              <Vazio icone={Sparkles} titulo="Nenhuma capacidade encontrada" descricao="Ajuste a busca ou os filtros de categoria e tipo." />
            ) : (
              <div className="flex max-h-[460px] flex-wrap gap-2 overflow-y-auto rounded-sgp border border-border bg-surface-2 p-3 scroll-thin">
                {skillsFiltradas.map((skill) => {
                  const ativo = requisitos.some((item) => item.skill === skill.id);
                  return (
                    <Chip
                      key={skill.id}
                      cor={skill.cor || "#2563EB"}
                      ativo={ativo}
                      onClick={() => adicionarSkill(skill)}
                      icone={ativo ? Check : Plus}
                    >
                      {skill.nome}
                      {ativo && <span className="ml-1 text-2xs opacity-70">N{requisitos.find((item) => item.skill === skill.id)?.nivel_minimo}</span>}
                    </Chip>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-fg">Requisitos selecionados</h2>
              <span className="text-2xs font-semibold text-fg-muted">{numero(requisitos.length)}</span>
            </div>
            {requisitos.length === 0 ? (
              <p className="rounded-sgp border border-dashed border-border px-3 py-8 text-center text-xs text-fg-muted">
                Selecione ao menos uma capacidade para alimentar o motor de matching.
              </p>
            ) : (
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1 scroll-thin">
                {requisitos.map((item) => (
                  <div key={item.skill} className="space-y-2 rounded-sgp border border-border bg-surface-2 p-3">
                    <div className="flex items-start gap-2">
                      <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.cor }} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-fg">{item.nome}</p>
                        <p className="truncate text-2xs text-fg-subtle">
                          {item.categoria || "Sem categoria"} · {item.tipo || "Sem tipo"}
                        </p>
                      </div>
                      <Botao
                        tamanho="xs"
                        variante="fantasma"
                        icone={Trash2}
                        className="text-danger"
                        onClick={() => setRequisitos((atual) => atual.filter((outro) => outro.skill !== item.skill))}
                        aria-label={"Remover " + item.nome}
                      >
                        Remover
                      </Botao>
                    </div>
                    <ControleDeslizante
                      valor={item.nivel_minimo}
                      onChange={(valor) =>
                        atualizarRequisito(item.skill, {
                          nivel_minimo: valor,
                          nivel_desejado: Math.max(valor, item.nivel_desejado),
                        })
                      }
                      min={1}
                      max={5}
                      rotulo="Nível mínimo"
                      sufixo=""
                      marcos={[1, 2, 3, 4, 5]}
                    />
                    <ControleDeslizante
                      valor={item.nivel_desejado}
                      onChange={(valor) => atualizarRequisito(item.skill, { nivel_desejado: Math.max(valor, item.nivel_minimo) })}
                      min={1}
                      max={5}
                      rotulo="Nível desejado"
                      sufixo=""
                      marcos={[1, 2, 3, 4, 5]}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-2xs text-fg-muted">
                        Quantidade
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={item.quantidade}
                          onChange={(evento) => atualizarRequisito(item.skill, { quantidade: Math.max(1, Number(evento.target.value) || 1) })}
                          className="h-7 w-16 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
                          aria-label={"Quantidade de pessoas para " + item.nome}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-2xs text-fg-muted">
                        Peso
                        <input
                          type="number"
                          min={0.1}
                          max={5}
                          step={0.1}
                          value={item.peso}
                          onChange={(evento) => atualizarRequisito(item.skill, { peso: Number(evento.target.value) || 1 })}
                          className="h-7 w-16 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
                          aria-label={"Peso do requisito " + item.nome}
                        />
                      </label>
                      <Interruptor
                        ativo={item.obrigatorio}
                        onChange={(valor) => atualizarRequisito(item.skill, { obrigatorio: valor })}
                        rotulo="Obrigatório"
                        tamanho="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!podeAvancar3 && (
              <Alerta tom="info" titulo="Requisitos obrigatórios">
                Selecione ao menos uma capacidade para o motor sugerir a equipe no próximo passo.
              </Alerta>
            )}
          </div>
        </div>
      )}

      {passo === 4 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-2xs font-medium text-fg-muted">
                Modo de alocação
                <Selecao value={modo} onChange={(evento) => setModo(evento.target.value)} aria-label="Modo de alocação">
                  <option value="PERFORMANCE">Performance imediata</option>
                  <option value="DESENVOLVIMENTO">Desenvolvimento</option>
                  <option value="MISTA">Mista</option>
                </Selecao>
              </label>
              <Etiqueta tom="brand" icone={Sparkles}>
                {numero(requisitos.length)} requisito(s) enviados ao motor
              </Etiqueta>
              {matching.data && <Etiqueta tom="neutral">{numero(matching.data.total_avaliados)} pessoa(s) avaliada(s)</Etiqueta>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xs text-fg-muted">Custo estimado da seleção</p>
                <p className="text-sm font-bold tabular-nums text-fg">{moeda(custoEstimado)}</p>
              </div>
              <Botao variante="primario" icone={Save} onClick={finalizar} carregando={salvando}>
                Finalizar e criar projeto
              </Botao>
            </div>
          </div>

          <Alerta tom="info" titulo="Projeto já salvo para consulta do motor">
            O projeto <strong>{dados.nome}</strong> foi gravado com marcos e requisitos. Ao finalizar, as pessoas
            selecionadas entram como alocações com status PROPOSTA para aprovação do gerente.
          </Alerta>

          {matching.isLoading && <CarregandoBloco rotulo="Executando o motor de matching..." />}

          {matching.isError && (
            <Alerta tom="danger" titulo="Não foi possível executar o motor de matching">
              {mensagemErro(matching.error)}
            </Alerta>
          )}

          {!matching.isLoading && !matching.isError && recomendacoes.length === 0 && (
            <Vazio
              icone={Users}
              titulo="Nenhuma pessoa recomendada"
              descricao="Revise os requisitos de capacidade ou amplie o quadro de colaboradores elegíveis."
              acao={
                <Botao variante="secundario" icone={ChevronLeft} onClick={() => setPasso(3)}>
                  Voltar aos requisitos
                </Botao>
              }
            />
          )}

          {!matching.isLoading && recomendacoes.length > 0 && (
            <GradeCards colunas={3}>
              {recomendacoes.map((pessoa) => {
                const marcada = Boolean(selecionados[String(pessoa.user_id)]);
                const percentualScore = normalizarScore(pessoa.score);
                return (
                  <div
                    key={pessoa.user_id}
                    className={
                      "flex flex-col gap-3 rounded-sgp-lg border bg-surface p-3.5 shadow-n1 transition-all " +
                      (marcada ? "border-brand ring-2 ring-brand/40" : "border-border hover:border-border-strong hover:shadow-n2")
                    }
                  >
                    <div className="flex items-start gap-3">
                      <AnelProgresso
                        valor={percentualScore}
                        tamanho={64}
                        espessura={7}
                        rotulo={numero(percentualScore)}
                        subrotulo="score"
                        cor={percentualScore >= 80 ? "#059669" : percentualScore >= 60 ? "#D97706" : "#DC2626"}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Avatar nome={pessoa.nome} cor={pessoa.cor} iniciais={pessoa.iniciais} tamanho="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-fg">{pessoa.nome}</p>
                            <p className="truncate text-2xs text-fg-muted">{pessoa.cargo || pessoa.perfil}</p>
                          </div>
                        </div>
                        <p className="mt-1 truncate text-2xs text-fg-subtle">
                          {pessoa.area} · {pessoa.localizacao || "Local não informado"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Etiqueta tom={pessoa.elegivel ? "success" : "warning"}>
                            {pessoa.elegivel ? "Elegível" : "Com restrições"}
                          </Etiqueta>
                          <Etiqueta tom="neutral">
                            {numero(pessoa.justificativa?.disponibilidade_percentual || 0)}% disponível
                          </Etiqueta>
                          {pessoa.justificativa?.custo_estimado_reais ? (
                            <Etiqueta tom="info">{moeda(pessoa.justificativa.custo_estimado_reais, true)}</Etiqueta>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Skills atendidas</p>
                      {(pessoa.justificativa?.skills_atendidas ?? []).length === 0 ? (
                        <p className="text-2xs text-fg-subtle">Nenhuma skill do requisito é atendida.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(pessoa.justificativa?.skills_atendidas ?? []).map((skill) => (
                            <Etiqueta key={skill.skill_id} cor={skill.cor || "#059669"} icone={Check}>
                              {skill.skill} N{skill.atual}
                            </Etiqueta>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Gaps</p>
                      {(pessoa.justificativa?.gaps ?? []).length === 0 ? (
                        <p className="text-2xs text-success">Sem gaps relevantes.</p>
                      ) : (
                        <ul className="space-y-1">
                          {(pessoa.justificativa?.gaps ?? []).map((gap) => (
                            <li key={gap.skill_id} className="flex items-center gap-1.5 text-2xs text-fg-muted">
                              <AlertTriangle className="size-3 shrink-0 text-warning" aria-hidden />
                              <span className="truncate">
                                {gap.skill}: N{gap.atual} / mínimo N{gap.requerido}
                                {gap.obrigatorio ? " (obrigatório)" : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
                      <BarraProgresso valor={percentualScore} altura="sm" rotulo="Aderência ao requisito" mostrarValor />
                      <Botao
                        variante={marcada ? "sucesso" : "secundario"}
                        tamanho="sm"
                        icone={marcada ? Check : UserPlus}
                        onClick={() =>
                          setSelecionados((atual) => ({ ...atual, [String(pessoa.user_id)]: !atual[String(pessoa.user_id)] }))
                        }
                      >
                        {marcada ? "Selecionado" : "Selecionar"}
                      </Botao>
                    </div>
                  </div>
                );
              })}
            </GradeCards>
          )}
        </div>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 rounded-sgp-lg border border-border bg-surface p-3 shadow-n2">
        <Botao variante="fantasma" icone={ChevronLeft} onClick={() => irPara(Math.max(1, passo - 1))} disabled={passo === 1}>
          Anterior
        </Botao>
        <div className="flex items-center gap-2">
          <Botao variante="fantasma" onClick={() => navegar("/projetos")}>
            Cancelar
          </Botao>
          {passo < 4 ? (
            <Botao variante="primario" iconeDireita={ChevronRight} onClick={() => irPara(passo + 1)} carregando={salvando}>
              Próximo
            </Botao>
          ) : (
            <Botao variante="primario" icone={Save} onClick={finalizar} carregando={salvando}>
              Finalizar e criar projeto
            </Botao>
          )}
        </div>
      </div>
    </div>
  );
}

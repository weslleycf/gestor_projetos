import { Fragment, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Boxes,
  Check,
  Clock,
  FileText,
  FolderKanban,
  GraduationCap,
  KeyRound,
  Layers,
  LayoutDashboard,
  ListChecks,
  Lock,
  MapPin,
  Pencil,
  Plus,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Abas,
  Alerta,
  Avatar,
  BarraFerramentas,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  Entrada,
  EntradaBusca,
  Esqueleto,
  Etiqueta,
  FiltrosAtivos,
  GradeCards,
  Interruptor,
  KPI,
  Modal,
  PainelLateral,
  SecaoColapsavel,
  Segmentado,
  Selecao,
  Tabela,
  Vazio,
  useAvisos,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataRelativa, moeda, numero } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Usuario, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Tipos locais (RF-39)
   ========================================================================== */

interface Papel {
  id: number;
  nome: string;
  descricao: string;
  permissoes: string[];
  is_sistema: boolean;
  criado_em: string;
  total_vinculos: number;
}

interface VinculoPapel {
  id: number;
  user: number;
  user_nome: string;
  role: number;
  role_nome: string;
  escopo: string;
  escopo_id: number | null;
  criado_em: string;
}

interface RespostaPermissoes {
  usuario: UsuarioResumo;
  permissoes: string[];
  matriz: Record<string, string[]>;
}

interface RecursoInfo {
  rotulo: string;
  icone: LucideIcon;
  cor: string;
}

interface FormUsuario {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
  ativo: boolean;
  cargo: string;
  area: string;
  localizacao: string;
  fuso_horario: string;
  gestor: string;
  data_admissao: string;
  custo_hora: string;
  capacidade_semanal_horas: string;
  custo_hora_visivel: boolean;
  tema: string;
  densidade: string;
  idioma: string;
  aceita_recomendacoes: boolean;
  disponivel_para_mentoria: boolean;
  interesses: string[];
  is_staff: boolean;
}

/* ==========================================================================
   Catálogos visuais
   ========================================================================== */

const RECURSOS: Record<string, RecursoInfo> = {
  portfolio: { rotulo: "Portfólio", icone: Layers, cor: "#8B5CF6" },
  programa: { rotulo: "Programas", icone: FolderKanban, cor: "#6366F1" },
  projeto: { rotulo: "Projetos", icone: FolderKanban, cor: "#2563EB" },
  tarefa: { rotulo: "Tarefas", icone: ListChecks, cor: "#0891B2" },
  recurso: { rotulo: "Recursos", icone: Boxes, cor: "#0EA5E9" },
  alocacao: { rotulo: "Alocação", icone: Users, cor: "#14B8A6" },
  financeiro: { rotulo: "Financeiro", icone: Wallet, cor: "#059669" },
  risco: { rotulo: "Riscos e issues", icone: ShieldAlert, cor: "#DC2626" },
  capacidade: { rotulo: "Capacidades", icone: GraduationCap, cor: "#7C3AED" },
  pdi: { rotulo: "PDI e mentoria", icone: BadgeCheck, cor: "#DB2777" },
  mentoria: { rotulo: "Mentorias", icone: BadgeCheck, cor: "#DB2777" },
  treinamento: { rotulo: "Treinamentos", icone: GraduationCap, cor: "#9333EA" },
  timesheet: { rotulo: "Timesheet", icone: Clock, cor: "#F59E0B" },
  dashboard: { rotulo: "Dashboards", icone: LayoutDashboard, cor: "#3B82F6" },
  relatorio: { rotulo: "Relatórios", icone: FileText, cor: "#EC4899" },
  auditoria: { rotulo: "Auditoria", icone: ScrollText, cor: "#64748B" },
  privacidade: { rotulo: "Privacidade", icone: Lock, cor: "#475569" },
  admin: { rotulo: "Administração", icone: UserCog, cor: "#0F172A" },
  workflow: { rotulo: "Workflows", icone: Layers, cor: "#8B5CF6" },
};

const ORDEM_RECURSOS = [
  "portfolio",
  "programa",
  "projeto",
  "tarefa",
  "recurso",
  "alocacao",
  "financeiro",
  "risco",
  "capacidade",
  "pdi",
  "dashboard",
  "relatorio",
  "auditoria",
  "admin",
];

const PERFIS_PADRAO = [
  { valor: "ADMIN", rotulo: "Administrador" },
  { valor: "EXECUTIVO", rotulo: "Executivo (C-Level)" },
  { valor: "PMO", rotulo: "PMO" },
  { valor: "GERENTE", rotulo: "Gerente de Projetos" },
  { valor: "LIDER", rotulo: "Líder Técnico" },
  { valor: "MEMBRO", rotulo: "Membro de Equipe" },
  { valor: "RH", rotulo: "RH / DHO" },
  { valor: "STAKEHOLDER", rotulo: "Stakeholder" },
];

const TOM_PERFIL: Record<string, Tom> = {
  ADMIN: "danger",
  EXECUTIVO: "brand",
  PMO: "info",
  GERENTE: "success",
  LIDER: "warning",
  MEMBRO: "neutral",
  RH: "brand",
  STAKEHOLDER: "neutral",
};

const CORES_PERFIL: Record<string, string> = {
  ADMIN: "#DC2626",
  EXECUTIVO: "#2563EB",
  PMO: "#0891B2",
  GERENTE: "#059669",
  LIDER: "#D97706",
  MEMBRO: "#64748B",
  RH: "#7C3AED",
  STAKEHOLDER: "#475569",
};

const FORM_VAZIO: FormUsuario = {
  nome: "",
  email: "",
  senha: "",
  perfil: "MEMBRO",
  ativo: true,
  cargo: "",
  area: "",
  localizacao: "",
  fuso_horario: "America/Sao_Paulo",
  gestor: "",
  data_admissao: "",
  custo_hora: "0",
  capacidade_semanal_horas: "40",
  custo_hora_visivel: false,
  tema: "system",
  densidade: "padrao",
  idioma: "pt-BR",
  aceita_recomendacoes: true,
  disponivel_para_mentoria: false,
  interesses: [],
  is_staff: false,
};

function recursoDe(permissao: string): string {
  const parte = permissao.split(".")[0];
  return RECURSOS[parte] ? parte : "admin";
}

function ordenarRecursos(chaves: string[]): string[] {
  const conhecidos = ORDEM_RECURSOS.filter((r) => chaves.indexOf(r) >= 0);
  const extras = chaves.filter((r) => ORDEM_RECURSOS.indexOf(r) < 0).sort();
  return conhecidos.concat(extras);
}

function agruparPorRecurso(permissoes: string[]): Array<{ recurso: string; itens: string[] }> {
  const mapa = new Map<string, string[]>();
  permissoes.forEach((p) => {
    if (p === "*") return;
    const recurso = recursoDe(p);
    const atual = mapa.get(recurso) || [];
    atual.push(p);
    mapa.set(recurso, atual);
  });
  return ordenarRecursos(Array.from(mapa.keys())).map((r) => ({ recurso: r, itens: mapa.get(r) || [] }));
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function AdminUsuarios() {
  const { erro } = useAvisos();
  const { usuario: eu, config, pode } = useAuth();

  const [aba, setAba] = useState<"usuarios" | "papeis" | "matriz">("usuarios");

  /* ------------------------------------------------------------- filtros */

  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setTermo(busca.trim()), 350);
    return () => clearTimeout(timer);
  }, [busca]);

  const parametros = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (filtroPerfil) params.perfil = filtroPerfil;
    if (filtroArea) params.area = filtroArea;
    if (filtroAtivo) params.ativo = filtroAtivo;
    if (termo) params.search = termo;
    return params;
  }, [filtroPerfil, filtroArea, filtroAtivo, termo]);

  const usuarios = useLista<Usuario>(CHAVES.usuarios, "/usuarios/", parametros);
  const resumo = useLista<UsuarioResumo>(["usuarios", "resumo"], "/usuarios/resumo/");
  const papeis = useLista<Papel>(CHAVES.papeis, "/papeis/");
  const permissoes = useConsulta<RespostaPermissoes>(["permissoes"], "/permissoes/");

  const perfis = config && config.perfis && config.perfis.length ? config.perfis : PERFIS_PADRAO;
  const lista = usuarios.data || [];
  const areas = useMemo(
    () => Array.from(new Set((resumo.data || []).map((u) => u.area).filter(Boolean))).sort(),
    [resumo.data]
  );

  /* -------------------------------------------------- formulário usuário */

  const [painelAberto, setPainelAberto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormUsuario>(FORM_VAZIO);
  const [novoInteresse, setNovoInteresse] = useState("");
  const [confirmacao, setConfirmacao] = useState<{ tipo: "usuario" | "papel" | "vinculo"; id: number; nome: string } | null>(null);

  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    setNovoInteresse("");
    setPainelAberto(true);
  };

  const abrirEdicao = (u: Usuario) => {
    setEditando(u);
    setNovoInteresse("");
    setForm({
      nome: u.nome,
      email: u.email,
      senha: "",
      perfil: u.perfil,
      ativo: u.ativo,
      cargo: u.cargo,
      area: u.area,
      localizacao: u.localizacao,
      fuso_horario: u.fuso_horario || "America/Sao_Paulo",
      gestor: u.gestor ? String(u.gestor) : "",
      data_admissao: u.data_admissao || "",
      custo_hora: u.custo_hora === null || u.custo_hora === undefined ? "" : String(u.custo_hora),
      capacidade_semanal_horas: u.capacidade_semanal_horas || "40",
      custo_hora_visivel: u.custo_hora_visivel,
      tema: u.tema || "system",
      densidade: u.densidade || "padrao",
      idioma: u.idioma || "pt-BR",
      aceita_recomendacoes: u.aceita_recomendacoes,
      disponivel_para_mentoria: u.disponivel_para_mentoria,
      interesses: u.interesses || [],
      is_staff: u.is_staff,
    });
    setPainelAberto(true);
  };

  const salvarUsuario = useMutacao<Record<string, unknown>, Usuario>({
    metodo: editando ? "patch" : "post",
    url: editando ? "/usuarios/" + editando.id + "/" : "/usuarios/",
    invalidar: [[...CHAVES.usuarios], ["usuarios", "resumo"]],
    mensagemSucesso: editando ? "Usuário atualizado" : "Usuário criado",
    aoSucesso: () => setPainelAberto(false),
  });

  const alternarAtivo = useMutacao<{ id: number; ativo: boolean }, Usuario>({
    metodo: "patch",
    url: (v) => "/usuarios/" + v.id + "/",
    invalidar: [[...CHAVES.usuarios]],
    mensagemSucesso: "Situação do usuário atualizada",
  });

  const excluirUsuario = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/usuarios/" + v.id + "/",
    invalidar: [[...CHAVES.usuarios]],
    mensagemSucesso: "Usuário desativado",
    aoSucesso: () => setConfirmacao(null),
  });

  const enviarUsuario = () => {
    if (!form.nome.trim() || !form.email.trim()) {
      erro("Informe nome e e-mail do usuário");
      return;
    }
    const corpo: Record<string, unknown> = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      perfil: form.perfil,
      ativo: form.ativo,
      cargo: form.cargo,
      area: form.area,
      localizacao: form.localizacao,
      fuso_horario: form.fuso_horario,
      gestor: form.gestor ? Number(form.gestor) : null,
      data_admissao: form.data_admissao || null,
      custo_hora: form.custo_hora === "" ? 0 : Number(form.custo_hora),
      capacidade_semanal_horas: form.capacidade_semanal_horas === "" ? 40 : Number(form.capacidade_semanal_horas),
      custo_hora_visivel: form.custo_hora_visivel,
      tema: form.tema,
      densidade: form.densidade,
      idioma: form.idioma,
      aceita_recomendacoes: form.aceita_recomendacoes,
      disponivel_para_mentoria: form.disponivel_para_mentoria,
      interesses: form.interesses,
      is_staff: form.is_staff,
    };
    if (form.senha.trim()) corpo.password = form.senha.trim();
    salvarUsuario.mutate(corpo);
  };

  /* ------------------------------------------------------------- papéis */

  const [painelPapel, setPainelPapel] = useState(false);
  const [papelEditando, setPapelEditando] = useState<Papel | null>(null);
  const [formPapel, setFormPapel] = useState<{ nome: string; descricao: string; permissoes: string[] }>({
    nome: "",
    descricao: "",
    permissoes: [],
  });
  const [papelExpandido, setPapelExpandido] = useState<number | null>(null);

  const vinculos = useLista<VinculoPapel>(
    ["vinculos-papel", String(papelExpandido || "")],
    papelExpandido ? "/vinculos-papel/" : null,
    { role: papelExpandido }
  );

  const [vinculoAberto, setVinculoAberto] = useState(false);
  const [papelVinculo, setPapelVinculo] = useState<Papel | null>(null);
  const [formVinculo, setFormVinculo] = useState({ user: "", escopo: "GLOBAL", escopo_id: "" });

  const pessoas = useLista<UsuarioResumo>(CHAVES.usuarios, vinculoAberto ? "/usuarios/" : null, {
    ativo: true,
    page_size: 500,
  });

  const salvarPapel = useMutacao<Record<string, unknown>, Papel>({
    metodo: papelEditando ? "patch" : "post",
    url: papelEditando ? "/papeis/" + papelEditando.id + "/" : "/papeis/",
    invalidar: [[...CHAVES.papeis]],
    mensagemSucesso: papelEditando ? "Papel atualizado" : "Papel criado",
    aoSucesso: () => {
      setPainelPapel(false);
      setPapelEditando(null);
    },
  });

  const excluirPapel = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/papeis/" + v.id + "/",
    invalidar: [[...CHAVES.papeis]],
    mensagemSucesso: "Papel excluído",
    aoSucesso: () => setConfirmacao(null),
  });

  const atribuirVinculo = useMutacao<Record<string, unknown>, VinculoPapel>({
    url: "/vinculos-papel/",
    invalidar: [["vinculos-papel"], [...CHAVES.papeis]],
    mensagemSucesso: "Papel atribuído ao usuário",
    aoSucesso: () => setVinculoAberto(false),
  });

  const removerVinculo = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/vinculos-papel/" + v.id + "/",
    invalidar: [["vinculos-papel"], [...CHAVES.papeis]],
    mensagemSucesso: "Vínculo removido",
    aoSucesso: () => setConfirmacao(null),
  });

  const abrirVinculo = (p: Papel) => {
    setPapelVinculo(p);
    setFormVinculo({ user: "", escopo: "GLOBAL", escopo_id: "" });
    setVinculoAberto(true);
  };

  const enviarVinculo = () => {
    if (!papelVinculo) return;
    if (!formVinculo.user) {
      erro("Selecione o usuário que receberá o papel");
      return;
    }
    if (formVinculo.escopo !== "GLOBAL" && !formVinculo.escopo_id.trim()) {
      erro("Informe o identificador do escopo");
      return;
    }
    atribuirVinculo.mutate({
      user: Number(formVinculo.user),
      role: papelVinculo.id,
      escopo: formVinculo.escopo,
      escopo_id: formVinculo.escopo === "GLOBAL" ? null : Number(formVinculo.escopo_id),
    });
  };

  const abrirNovoPapel = () => {
    setPapelEditando(null);
    setFormPapel({ nome: "", descricao: "", permissoes: [] });
    setPainelPapel(true);
  };

  const abrirEdicaoPapel = (p: Papel) => {
    setPapelEditando(p);
    setFormPapel({ nome: p.nome, descricao: p.descricao, permissoes: p.permissoes || [] });
    setPainelPapel(true);
  };

  const alternarPermissao = (codigo: string) =>
    setFormPapel((atual) => ({
      ...atual,
      permissoes:
        atual.permissoes.indexOf(codigo) >= 0
          ? atual.permissoes.filter((p) => p !== codigo)
          : atual.permissoes.concat([codigo]),
    }));

  const enviarPapel = () => {
    if (!formPapel.nome.trim()) {
      erro("Informe o nome do papel");
      return;
    }
    salvarPapel.mutate({
      nome: formPapel.nome.trim(),
      descricao: formPapel.descricao,
      permissoes: formPapel.permissoes,
    });
  };

  /* -------------------------------------------------------- matriz RBAC */

  const matriz = permissoes.data ? permissoes.data.matriz : {};
  const perfisMatriz = useMemo(() => Object.keys(matriz), [matriz]);
  const catalogoPermissoes = useMemo(() => {
    const conjunto = new Set<string>();
    Object.keys(matriz).forEach((perfil) => (matriz[perfil] || []).forEach((p) => conjunto.add(p)));
    conjunto.delete("*");
    return Array.from(conjunto).sort();
  }, [matriz]);
  const gruposPermissoes = useMemo(() => {
    const mapa = new Map<string, string[]>();
    catalogoPermissoes.forEach((p) => {
      const recurso = recursoDe(p);
      const atual = mapa.get(recurso) || [];
      atual.push(p);
      mapa.set(recurso, atual);
    });
    return ordenarRecursos(Array.from(mapa.keys())).map((r) => ({ recurso: r, itens: mapa.get(r) || [] }));
  }, [catalogoPermissoes]);

  const possui = (perfil: string, permissao: string) => {
    const lista = matriz[perfil] || [];
    if (lista.indexOf("*") >= 0) return true;
    return lista.indexOf(permissao) >= 0;
  };

  const totalConcedidas = (perfil: string) => {
    const lista = matriz[perfil] || [];
    if (lista.indexOf("*") >= 0) return catalogoPermissoes.length;
    return catalogoPermissoes.filter((p) => lista.indexOf(p) >= 0).length;
  };

  /* ------------------------------------------------------------ colunas */

  const colunas: Array<ColunaTabela<Usuario>> = [
    {
      chave: "nome",
      titulo: "Usuário",
      largura: "260px",
      ordenavel: true,
      valorOrdenacao: (u) => u.nome,
      renderizar: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar nome={u.nome} cor={u.cor} iniciais={u.iniciais} url={u.avatar_display} tamanho="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-fg">{u.nome}</p>
            <p className="truncate text-2xs text-fg-muted">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      chave: "perfil",
      titulo: "Perfil",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (u) => u.perfil,
      renderizar: (u) => (
        <Etiqueta tom={TOM_PERFIL[u.perfil] || "neutral"} icone={KeyRound}>
          {u.papel || u.perfil}
        </Etiqueta>
      ),
    },
    {
      chave: "cargo",
      titulo: "Cargo",
      largura: "170px",
      ordenavel: true,
      valorOrdenacao: (u) => u.cargo,
      renderizar: (u) => <span className="text-xs text-fg-muted">{u.cargo || "—"}</span>,
    },
    {
      chave: "area",
      titulo: "Área",
      largura: "140px",
      ordenavel: true,
      valorOrdenacao: (u) => u.area,
      renderizar: (u) => <span className="text-xs text-fg-muted">{u.area || "—"}</span>,
    },
    {
      chave: "gestor",
      titulo: "Gestor",
      largura: "160px",
      renderizar: (u) => <span className="text-xs text-fg-muted">{u.gestor_nome || "—"}</span>,
    },
    {
      chave: "custo",
      titulo: "Custo/hora",
      largura: "110px",
      alinhar: "right",
      ordenavel: true,
      valorOrdenacao: (u) => (u.custo_hora === null ? -1 : u.custo_hora),
      renderizar: (u) =>
        u.custo_hora === null || u.custo_hora === undefined ? (
          <span className="text-2xs text-fg-subtle" title="Visível apenas para administradores, RH e o próprio usuário">
            restrito
          </span>
        ) : (
          <span className="text-xs tabular-nums text-fg">{moeda(u.custo_hora)}</span>
        ),
    },
    {
      chave: "ativo",
      titulo: "Ativo",
      largura: "100px",
      alinhar: "center",
      renderizar: (u) => (
        <div className="flex justify-center">
          <Interruptor
            ativo={u.ativo}
            tamanho="sm"
            onChange={(v) => alternarAtivo.mutate({ id: u.id, ativo: v })}
          />
        </div>
      ),
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "110px",
      alinhar: "right",
      renderizar: (u) => (
        <div className="flex items-center justify-end gap-1">
          <BotaoIcone icone={Pencil} rotulo={"Editar " + u.nome} tamanho="xs" onClick={() => abrirEdicao(u)} />
          <BotaoIcone
            icone={Trash2}
            rotulo={"Desativar " + u.nome}
            tamanho="xs"
            onClick={() => setConfirmacao({ tipo: "usuario", id: u.id, nome: u.nome })}
          />
        </div>
      ),
    },
  ];

  const filtrosAtivos = [
    filtroPerfil
      ? {
          chave: "perfil",
          rotulo: "Perfil",
          valor: (perfis.find((p) => p.valor === filtroPerfil) || { rotulo: filtroPerfil }).rotulo,
          onRemover: () => setFiltroPerfil(""),
        }
      : null,
    filtroArea ? { chave: "area", rotulo: "Área", valor: filtroArea, onRemover: () => setFiltroArea("") } : null,
    filtroAtivo
      ? {
          chave: "ativo",
          rotulo: "Situação",
          valor: filtroAtivo === "true" ? "ativos" : "inativos",
          onRemover: () => setFiltroAtivo(""),
        }
      : null,
    termo
      ? {
          chave: "busca",
          rotulo: "Busca",
          valor: termo,
          onRemover: () => {
            setBusca("");
            setTermo("");
          },
        }
      : null,
  ].filter(Boolean) as Array<{ chave: string; rotulo: string; valor: string; onRemover: () => void }>;

  const kpis = useMemo(() => {
    const ativos = lista.filter((u) => u.ativo).length;
    const mentores = lista.filter((u) => u.disponivel_para_mentoria).length;
    const staff = lista.filter((u) => u.is_staff).length;
    const areasDistintas = new Set(lista.map((u) => u.area).filter(Boolean)).size;
    return [
      { rotulo: "Usuários listados", valor: numero(lista.length), icone: Users, cor: "#2563EB" },
      {
        rotulo: "Ativos",
        valor: numero(ativos),
        icone: Check,
        cor: "#059669",
        subrotulo: numero(lista.length - ativos) + " inativo(s)",
      },
      { rotulo: "Mentores", valor: numero(mentores), icone: GraduationCap, cor: "#7C3AED" },
      { rotulo: "Acesso ao admin", valor: numero(staff), icone: ShieldCheck, cor: "#DC2626" },
      { rotulo: "Áreas", valor: numero(areasDistintas), icone: MapPin, cor: "#0891B2" },
      { rotulo: "Papéis", valor: numero((papeis.data || []).length), icone: KeyRound, cor: "#F59E0B" },
    ];
  }, [lista, papeis.data]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Usuários, perfis e permissões"
        subtitulo="Gestão de acessos, papéis customizados e matriz RBAC do SGP"
        icone={UserCog}
        cor="#2563EB"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" icone={KeyRound} onClick={abrirNovoPapel}>
              Novo papel
            </Botao>
            <Botao variante="primario" icone={UserPlus} onClick={abrirNovo}>
              Novo usuário
            </Botao>
          </div>
        }
      />

      <Abas
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: "usuarios", rotulo: "Usuários", icone: Users, contagem: lista.length },
          { valor: "papeis", rotulo: "Papéis", icone: KeyRound, contagem: (papeis.data || []).length },
          { valor: "matriz", rotulo: "Matriz de permissões", icone: ShieldCheck, contagem: perfisMatriz.length },
        ]}
      />

      {aba === "usuarios" && (
        <div className="space-y-3">
          <LinhaKPI itens={kpis} />

          <BarraFerramentas>
            <EntradaBusca
              valor={busca}
              onChange={setBusca}
              placeholder="Buscar por nome, e-mail, cargo ou área..."
              className="w-72"
            />
            <Selecao
              value={filtroPerfil}
              onChange={(e) => setFiltroPerfil(e.target.value)}
              className="h-8 w-48 py-0 text-xs"
              aria-label="Filtrar por perfil"
            >
              <option value="">Todos os perfis</option>
              {perfis.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </Selecao>
            <Selecao
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
              className="h-8 w-44 py-0 text-xs"
              aria-label="Filtrar por área"
            >
              <option value="">Todas as áreas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Selecao>
            <Segmentado
              valor={filtroAtivo}
              onChange={setFiltroAtivo}
              tamanho="sm"
              opcoes={[
                { valor: "", rotulo: "Todos" },
                { valor: "true", rotulo: "Ativos" },
                { valor: "false", rotulo: "Inativos" },
              ]}
            />
          </BarraFerramentas>

          <FiltrosAtivos
            filtros={filtrosAtivos}
            onLimpar={() => {
              setFiltroPerfil("");
              setFiltroArea("");
              setFiltroAtivo("");
              setBusca("");
              setTermo("");
            }}
          />

          {usuarios.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar os usuários">
              {mensagemErro(usuarios.error)}
            </Alerta>
          )}

          <div className="rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
            {usuarios.isLoading ? (
              <CarregandoBloco rotulo="Carregando usuários..." />
            ) : (
              <Tabela
                colunas={colunas}
                dados={lista}
                compacta
                vazio={
                  <Vazio
                    icone={Users}
                    titulo="Nenhum usuário encontrado"
                    descricao="Ajuste os filtros ou cadastre um novo usuário."
                    acao={
                      <Botao variante="primario" icone={UserPlus} onClick={abrirNovo}>
                        Novo usuário
                      </Botao>
                    }
                  />
                }
              />
            )}
          </div>
        </div>
      )}

      {aba === "papeis" && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Papéis complementam a matriz de perfis">
            As permissões de um papel são somadas às do perfil do usuário. Papéis de sistema não podem ser removidos.
          </Alerta>

          {papeis.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar os papéis">
              {mensagemErro(papeis.error)}
            </Alerta>
          )}

          {papeis.isLoading ? (
            <CarregandoBloco rotulo="Carregando papéis..." />
          ) : (papeis.data || []).length === 0 ? (
            <Vazio
              icone={KeyRound}
              titulo="Nenhum papel cadastrado"
              descricao="Crie papéis para conceder permissões específicas além do perfil."
              acao={
                <Botao variante="primario" icone={Plus} onClick={abrirNovoPapel}>
                  Novo papel
                </Botao>
              }
            />
          ) : (
            <GradeCards colunas={3}>
              {(papeis.data || []).map((p) => {
                const grupos = agruparPorRecurso(p.permissoes || []);
                const aberto = papelExpandido === p.id;
                return (
                  <div key={p.id} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-fg">{p.nome}</h3>
                        <p className="mt-0.5 text-2xs text-fg-muted">{p.descricao || "Sem descrição"}</p>
                      </div>
                      {p.is_sistema ? (
                        <Etiqueta tom="neutral" icone={Lock}>
                          sistema
                        </Etiqueta>
                      ) : (
                        <Etiqueta tom="brand">customizado</Etiqueta>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Etiqueta tom="info" icone={Users}>
                        {numero(p.total_vinculos) + " vínculo(s)"}
                      </Etiqueta>
                      <Etiqueta tom="neutral" icone={KeyRound}>
                        {numero((p.permissoes || []).length) + " permissões"}
                      </Etiqueta>
                      <Etiqueta tom="neutral" icone={Clock}>
                        {dataRelativa(p.criado_em)}
                      </Etiqueta>
                    </div>

                    <div className="mt-3 space-y-2">
                      {grupos.slice(0, aberto ? grupos.length : 3).map((g) => {
                        const info = RECURSOS[g.recurso] || { rotulo: g.recurso, icone: KeyRound, cor: "#64748B" };
                        const Icone = info.icone;
                        return (
                          <div key={g.recurso}>
                            <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                              <Icone className="size-3" style={{ color: info.cor }} aria-hidden />
                              {info.rotulo}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {g.itens.map((permissao) => (
                                <Chip key={permissao} cor={info.cor}>
                                  {permissao}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {grupos.length > 3 && !aberto && (
                        <button
                          type="button"
                          onClick={() => setPapelExpandido(p.id)}
                          className="text-2xs font-medium text-brand hover:underline"
                        >
                          {"mostrar todas as " + numero(grupos.length) + " categorias"}
                        </button>
                      )}
                    </div>

                    {aberto && (
                      <div className="mt-3 rounded-sgp border border-border bg-surface-2 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-2xs font-semibold text-fg">Vínculos de usuários</p>
                          {pode("admin.ver") && (
                            <Botao tamanho="xs" variante="fantasma" icone={Plus} onClick={() => abrirVinculo(p)}>
                              Atribuir papel
                            </Botao>
                          )}
                        </div>
                        {vinculos.isLoading ? (
                          <Esqueleto linhas={2} className="mt-2" />
                        ) : (vinculos.data || []).length === 0 ? (
                          <p className="mt-1 text-2xs text-fg-subtle">Nenhum usuário vinculado a este papel.</p>
                        ) : (
                          <ul className="mt-1.5 space-y-1">
                            {(vinculos.data || []).map((v) => (
                              <li key={v.id} className="flex items-center justify-between gap-2 text-2xs">
                                <span className="truncate text-fg">{v.user_nome}</span>
                                <span className="flex shrink-0 items-center gap-1">
                                  <Etiqueta tom="neutral">{v.escopo}</Etiqueta>
                                  {pode("admin.ver") && (
                                    <BotaoIcone
                                      icone={Trash2}
                                      rotulo={"Remover vínculo de " + v.user_nome + " com o papel " + p.nome}
                                      tamanho="xs"
                                      onClick={() =>
                                        setConfirmacao({
                                          tipo: "vinculo",
                                          id: v.id,
                                          nome: v.user_nome + " com o papel " + p.nome,
                                        })
                                      }
                                    />
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-1.5">
                      <Botao tamanho="xs" variante="secundario" icone={Pencil} onClick={() => abrirEdicaoPapel(p)}>
                        Editar
                      </Botao>
                      <Botao
                        tamanho="xs"
                        variante="fantasma"
                        icone={Users}
                        onClick={() => setPapelExpandido(aberto ? null : p.id)}
                      >
                        {aberto ? "Ocultar vínculos" : "Ver vínculos"}
                      </Botao>
                      <BotaoIcone
                        icone={Trash2}
                        rotulo={"Excluir papel " + p.nome}
                        tamanho="xs"
                        disabled={p.is_sistema}
                        onClick={() => setConfirmacao({ tipo: "papel", id: p.id, nome: p.nome })}
                      />
                    </div>
                  </div>
                );
              })}
            </GradeCards>
          )}
        </div>
      )}

      {aba === "matriz" && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Matriz de permissões por perfil (RBAC)">
            Cada linha é uma permissão no formato recurso.ação. O perfil Administrador possui o curinga que concede
            todas as permissões do sistema.
          </Alerta>

          {permissoes.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar a matriz de permissões">
              {mensagemErro(permissoes.error)}
            </Alerta>
          )}

          {permissoes.isLoading ? (
            <CarregandoBloco rotulo="Carregando matriz RBAC..." />
          ) : catalogoPermissoes.length === 0 ? (
            <Vazio
              icone={ShieldCheck}
              titulo="Matriz indisponível"
              descricao="O endpoint de permissões não retornou dados para exibição."
            />
          ) : (
            <>
              <GradeCards colunas={4}>
                {perfisMatriz.map((perfil) => (
                  <KPI
                    key={perfil}
                    rotulo={(perfis.find((p) => p.valor === perfil) || { rotulo: perfil }).rotulo}
                    valor={numero(totalConcedidas(perfil))}
                    subrotulo={"de " + numero(catalogoPermissoes.length) + " permissões"}
                    icone={ShieldCheck}
                    cor={CORES_PERFIL[perfil] || "#2563EB"}
                    compacto
                  />
                ))}
              </GradeCards>

              <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-brand" aria-hidden />
                    <h2 className="text-sm font-semibold text-fg">Grade de permissões</h2>
                    <Etiqueta tom="neutral">{numero(catalogoPermissoes.length) + " permissões"}</Etiqueta>
                    <Etiqueta tom="brand">{numero(perfisMatriz.length) + " perfis"}</Etiqueta>
                  </div>
                  <div className="flex items-center gap-3 text-2xs text-fg-muted">
                    <span className="inline-flex items-center gap-1">
                      <span className="grid size-4 place-items-center rounded bg-success-soft text-success">
                        <Check className="size-3" aria-hidden />
                      </span>
                      concedida
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="grid size-4 place-items-center rounded bg-surface-3 text-fg-subtle">
                        <X className="size-3" aria-hidden />
                      </span>
                      não concedida
                    </span>
                  </div>
                </div>

                <div className="overflow-auto scroll-thin" style={{ maxHeight: 620 }}>
                  <table className="w-full border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-surface">
                      <tr className="border-b border-border">
                        <th className="sticky left-0 z-20 min-w-56 border-r border-border bg-surface px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                          Permissão
                        </th>
                        {perfisMatriz.map((perfil) => (
                          <th key={perfil} className="px-2 py-2 text-center text-2xs font-semibold text-fg-muted">
                            <span
                              className="block whitespace-nowrap"
                              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                            >
                              {(perfis.find((p) => p.valor === perfil) || { rotulo: perfil }).rotulo}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gruposPermissoes.map((grupo) => {
                        const info = RECURSOS[grupo.recurso] || {
                          rotulo: grupo.recurso,
                          icone: KeyRound,
                          cor: "#64748B",
                        };
                        const Icone = info.icone;
                        return (
                          <Fragment key={grupo.recurso}>
                            <tr className="bg-surface-2">
                              <td colSpan={perfisMatriz.length + 1} className="px-3 py-1.5">
                                <span
                                  className="inline-flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide"
                                  style={{ color: info.cor }}
                                >
                                  <Icone className="size-3.5" aria-hidden />
                                  {info.rotulo}
                                </span>
                              </td>
                            </tr>
                            {grupo.itens.map((permissao) => (
                              <tr key={permissao} className="border-b border-border/60 last:border-0 hover:bg-surface-2">
                                <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-1.5 font-mono text-2xs text-fg">
                                  {permissao}
                                </td>
                                {perfisMatriz.map((perfil) => (
                                  <td key={perfil + permissao} className="px-2 py-1.5 text-center">
                                    {possui(perfil, permissao) ? (
                                      <span
                                        className="inline-grid size-4.5 place-items-center rounded bg-success-soft text-success"
                                        title={"Concedida para " + perfil}
                                      >
                                        <Check className="size-3" aria-hidden />
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-grid size-4.5 place-items-center rounded bg-surface-3 text-fg-subtle"
                                        title="Não concedida"
                                      >
                                        <X className="size-3" aria-hidden />
                                      </span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-sgp-lg border border-border bg-surface p-3">
                <p className="text-xs font-semibold text-fg">Permissões efetivas do seu usuário</p>
                <p className="mt-0.5 text-2xs text-fg-muted">
                  {eu ? eu.nome + " · " + (eu.papel || eu.perfil) : "Sessão não identificada"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(permissoes.data ? permissoes.data.permissoes : []).map((p) => (
                    <Chip key={p} cor={p === "*" ? "#DC2626" : "#2563EB"}>
                      {p}
                    </Chip>
                  ))}
                  {(permissoes.data ? permissoes.data.permissoes : []).length === 0 && (
                    <span className="text-2xs text-fg-subtle">Nenhuma permissão atribuída.</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------- painel usuário */}

      <PainelLateral
        aberto={painelAberto}
        onFechar={() => setPainelAberto(false)}
        titulo={editando ? "Editar usuário" : "Novo usuário"}
        subtitulo={editando ? editando.email : "Identificação, acesso, custo e preferências"}
        largura="lg"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setPainelAberto(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Check} carregando={salvarUsuario.isPending} onClick={enviarUsuario}>
              {editando ? "Salvar alterações" : "Criar usuário"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <SecaoColapsavel titulo="Identificação" icone={Users} abertoInicial>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Nome completo" obrigatorio htmlFor="u-nome" className="sm:col-span-2">
                <Entrada id="u-nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </Campo>
              <Campo rotulo="E-mail" obrigatorio htmlFor="u-email">
                <Entrada
                  id="u-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Campo>
              <Campo
                rotulo="Senha"
                htmlFor="u-senha"
                dica={editando ? "Deixe em branco para manter a senha atual." : "Mínimo de 6 caracteres."}
              >
                <Entrada
                  id="u-senha"
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
                  placeholder="mínimo 6 caracteres"
                />
              </Campo>
              <Campo rotulo="Cargo" htmlFor="u-cargo">
                <Entrada id="u-cargo" value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
              </Campo>
              <Campo rotulo="Área" htmlFor="u-area">
                <Entrada
                  id="u-area"
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                  list="areas-conhecidas"
                />
              </Campo>
              <Campo rotulo="Localização" htmlFor="u-local">
                <Entrada
                  id="u-local"
                  value={form.localizacao}
                  onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
                />
              </Campo>
              <Campo rotulo="Fuso horário" htmlFor="u-fuso">
                <Entrada
                  id="u-fuso"
                  value={form.fuso_horario}
                  onChange={(e) => setForm((f) => ({ ...f, fuso_horario: e.target.value }))}
                />
              </Campo>
            </div>
            <datalist id="areas-conhecidas">
              {areas.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Vínculo e acesso" icone={ShieldCheck} abertoInicial>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Perfil de acesso" obrigatorio htmlFor="u-perfil">
                <Selecao
                  id="u-perfil"
                  value={form.perfil}
                  onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}
                >
                  {perfis.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Gestor imediato" htmlFor="u-gestor">
                <Selecao
                  id="u-gestor"
                  value={form.gestor}
                  onChange={(e) => setForm((f) => ({ ...f, gestor: e.target.value }))}
                >
                  <option value="">Sem gestor</option>
                  {(resumo.data || [])
                    .filter((u) => !editando || u.id !== editando.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome + " · " + (u.cargo || u.area || u.perfil)}
                      </option>
                    ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Data de admissão" htmlFor="u-admissao">
                <Entrada
                  id="u-admissao"
                  type="date"
                  value={form.data_admissao}
                  onChange={(e) => setForm((f) => ({ ...f, data_admissao: e.target.value }))}
                />
              </Campo>
              <Campo rotulo="Idioma" htmlFor="u-idioma">
                <Selecao
                  id="u-idioma"
                  value={form.idioma}
                  onChange={(e) => setForm((f) => ({ ...f, idioma: e.target.value }))}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </Selecao>
              </Campo>
            </div>
            <div className="mt-3 space-y-2">
              <Interruptor
                ativo={form.ativo}
                onChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
                rotulo="Usuário ativo"
                descricao="Usuários inativos não conseguem autenticar no SGP."
              />
              <Interruptor
                ativo={form.is_staff}
                onChange={(v) => setForm((f) => ({ ...f, is_staff: v }))}
                rotulo="Acesso ao Django admin"
                descricao="Concede acesso administrativo técnico ao backend."
              />
            </div>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Custo e capacidade" icone={Wallet} abertoInicial={false}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Custo por hora (R$)" htmlFor="u-custo">
                <Entrada
                  id="u-custo"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.custo_hora}
                  onChange={(e) => setForm((f) => ({ ...f, custo_hora: e.target.value }))}
                />
              </Campo>
              <Campo rotulo="Capacidade semanal (horas)" htmlFor="u-capacidade">
                <Entrada
                  id="u-capacidade"
                  type="number"
                  min={0}
                  step="1"
                  value={form.capacidade_semanal_horas}
                  onChange={(e) => setForm((f) => ({ ...f, capacidade_semanal_horas: e.target.value }))}
                />
              </Campo>
            </div>
            <div className="mt-3">
              <Interruptor
                ativo={form.custo_hora_visivel}
                onChange={(v) => setForm((f) => ({ ...f, custo_hora_visivel: v }))}
                rotulo="Custo visível para todos"
                descricao="Quando desligado, apenas administradores, RH e o próprio usuário veem o custo."
              />
            </div>
          </SecaoColapsavel>

          <SecaoColapsavel titulo="Preferências do usuário" icone={LayoutDashboard} abertoInicial={false}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Tema" htmlFor="u-tema">
                <Selecao id="u-tema" value={form.tema} onChange={(e) => setForm((f) => ({ ...f, tema: e.target.value }))}>
                  <option value="system">Seguir o sistema</option>
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </Selecao>
              </Campo>
              <Campo rotulo="Densidade" htmlFor="u-densidade">
                <Selecao
                  id="u-densidade"
                  value={form.densidade}
                  onChange={(e) => setForm((f) => ({ ...f, densidade: e.target.value }))}
                >
                  <option value="compacta">Compacta</option>
                  <option value="padrao">Padrão</option>
                  <option value="confortavel">Confortável</option>
                </Selecao>
              </Campo>
            </div>
            <div className="mt-3 space-y-2">
              <Interruptor
                ativo={form.aceita_recomendacoes}
                onChange={(v) => setForm((f) => ({ ...f, aceita_recomendacoes: v }))}
                rotulo="Aceita ser recomendado em alocações"
                descricao="Consentimento para uso do perfil no motor de recomendações."
              />
              <Interruptor
                ativo={form.disponivel_para_mentoria}
                onChange={(v) => setForm((f) => ({ ...f, disponivel_para_mentoria: v }))}
                rotulo="Disponível para mentoria"
              />
            </div>
            <div className="mt-3">
              <Campo rotulo="Interesses" dica="Temas usados em recomendações de desenvolvimento.">
                <div className="flex items-center gap-2">
                  <Entrada
                    value={novoInteresse}
                    onChange={(e) => setNovoInteresse(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const valor = novoInteresse.trim();
                      if (!valor) return;
                      setForm((f) => ({
                        ...f,
                        interesses: f.interesses.indexOf(valor) >= 0 ? f.interesses : f.interesses.concat([valor]),
                      }));
                      setNovoInteresse("");
                    }}
                    placeholder="Ex.: arquitetura, dados, liderança"
                  />
                  <Botao
                    variante="secundario"
                    icone={Plus}
                    onClick={() => {
                      const valor = novoInteresse.trim();
                      if (!valor) return;
                      setForm((f) => ({
                        ...f,
                        interesses: f.interesses.indexOf(valor) >= 0 ? f.interesses : f.interesses.concat([valor]),
                      }));
                      setNovoInteresse("");
                    }}
                  >
                    Incluir
                  </Botao>
                </div>
              </Campo>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.interesses.map((i) => (
                  <Chip
                    key={i}
                    cor="#7C3AED"
                    removivel
                    onRemover={() =>
                      setForm((f) => ({ ...f, interesses: f.interesses.filter((x) => x !== i) }))
                    }
                  >
                    {i}
                  </Chip>
                ))}
                {form.interesses.length === 0 && (
                  <span className="text-2xs text-fg-subtle">Nenhum interesse informado.</span>
                )}
              </div>
            </div>
          </SecaoColapsavel>

          <Alerta tom="warning" titulo="Custo é dado sensível">
            Valores de custo/hora são informações de RH. A visibilidade ampla deve ser concedida apenas com
            justificativa de negócio, pois as alterações ficam registradas na trilha de auditoria.
          </Alerta>
        </div>
      </PainelLateral>

      {/* --------------------------------------------------- painel papel */}

      <PainelLateral
        aberto={painelPapel}
        onFechar={() => setPainelPapel(false)}
        titulo={papelEditando ? "Editar papel" : "Novo papel"}
        subtitulo="Selecione as permissões agrupadas por recurso"
        largura="lg"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setPainelPapel(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Check} carregando={salvarPapel.isPending} onClick={enviarPapel}>
              {papelEditando ? "Salvar papel" : "Criar papel"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome do papel" obrigatorio htmlFor="p-nome">
            <Entrada
              id="p-nome"
              value={formPapel.nome}
              onChange={(e) => setFormPapel((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex.: Coordenador de PMO"
            />
          </Campo>
          <Campo rotulo="Descrição" htmlFor="p-desc">
            <Entrada
              id="p-desc"
              value={formPapel.descricao}
              onChange={(e) => setFormPapel((f) => ({ ...f, descricao: e.target.value }))}
            />
          </Campo>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-fg">Permissões</p>
            <Etiqueta tom="brand">{numero(formPapel.permissoes.length) + " selecionadas"}</Etiqueta>
          </div>

          {permissoes.isLoading ? (
            <Esqueleto linhas={6} />
          ) : (
            <div className="space-y-3">
              {gruposPermissoes.map((grupo) => {
                const info = RECURSOS[grupo.recurso] || { rotulo: grupo.recurso, icone: KeyRound, cor: "#64748B" };
                const Icone = info.icone;
                const marcadas = grupo.itens.filter((p) => formPapel.permissoes.indexOf(p) >= 0).length;
                const todasMarcadas = marcadas === grupo.itens.length;
                return (
                  <div key={grupo.recurso} className="rounded-sgp border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: info.cor }}>
                        <Icone className="size-3.5" aria-hidden />
                        {info.rotulo}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs text-fg-muted">
                          {numero(marcadas) + "/" + numero(grupo.itens.length)}
                        </span>
                        <button
                          type="button"
                          className="text-2xs font-medium text-brand hover:underline"
                          onClick={() =>
                            setFormPapel((f) => {
                              const restantes = f.permissoes.filter((p) => grupo.itens.indexOf(p) < 0);
                              return { ...f, permissoes: todasMarcadas ? restantes : restantes.concat(grupo.itens) };
                            })
                          }
                        >
                          {todasMarcadas ? "desmarcar tudo" : "marcar tudo"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {grupo.itens.map((permissao) => (
                        <label
                          key={permissao}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-surface-3"
                        >
                          <input
                            type="checkbox"
                            checked={formPapel.permissoes.indexOf(permissao) >= 0}
                            onChange={() => alternarPermissao(permissao)}
                            className="size-4 shrink-0 accent-[var(--sgp-brand)]"
                          />
                          <span className="font-mono text-2xs text-fg">{permissao}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PainelLateral>

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo={
          confirmacao && confirmacao.tipo === "papel"
            ? "Excluir papel"
            : confirmacao && confirmacao.tipo === "vinculo"
              ? "Remover vínculo de papel"
              : "Desativar usuário"
        }
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirUsuario.isPending || excluirPapel.isPending || removerVinculo.isPending}
              onClick={() => {
                if (!confirmacao) return;
                if (confirmacao.tipo === "papel") excluirPapel.mutate({ id: confirmacao.id });
                else if (confirmacao.tipo === "vinculo") removerVinculo.mutate({ id: confirmacao.id });
                else excluirUsuario.mutate({ id: confirmacao.id });
              }}
            >
              Confirmar
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          {confirmacao && confirmacao.tipo === "papel"
            ? "Excluir o papel " + confirmacao.nome + " remove as permissões concedidas por ele em todos os vínculos."
            : confirmacao && confirmacao.tipo === "vinculo"
              ? "O vínculo de " + confirmacao.nome + " será removido e o usuário deixa de receber as permissões concedidas por este papel."
              : "O usuário " + (confirmacao ? confirmacao.nome : "") + " será desativado e não poderá mais autenticar no SGP."}
        </p>
        {confirmacao && confirmacao.tipo === "usuario" && (
          <Alerta tom="warning" titulo="Registro em auditoria" className="mt-3">
            A desativação é gravada na trilha de auditoria imutável com autor, data e endereço IP.
          </Alerta>
        )}
      </Modal>

      <Modal
        aberto={vinculoAberto}
        onFechar={() => setVinculoAberto(false)}
        titulo="Atribuir papel"
        subtitulo={papelVinculo ? papelVinculo.nome : undefined}
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setVinculoAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Check}
              carregando={atribuirVinculo.isPending}
              onClick={enviarVinculo}
            >
              Atribuir
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Usuário" obrigatorio htmlFor="v-usuario">
            <Selecao
              id="v-usuario"
              value={formVinculo.user}
              onChange={(e) => setFormVinculo((atual) => ({ ...atual, user: e.target.value }))}
            >
              <option value="">Selecione o usuário</option>
              {(pessoas.data || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          {pessoas.isLoading && <Esqueleto linhas={2} />}
          <Campo rotulo="Escopo" htmlFor="v-escopo" dica="Delimita onde o papel passa a valer para o usuário.">
            <Selecao
              id="v-escopo"
              value={formVinculo.escopo}
              onChange={(e) => setFormVinculo((atual) => ({ ...atual, escopo: e.target.value }))}
            >
              <option value="GLOBAL">Global</option>
              <option value="PORTFOLIO">Portfólio</option>
              <option value="PROGRAMA">Programa</option>
              <option value="PROJETO">Projeto</option>
              <option value="PESSOAL">Pessoal</option>
            </Selecao>
          </Campo>
          {formVinculo.escopo !== "GLOBAL" && (
            <Campo
              rotulo="Identificador do escopo"
              obrigatorio
              htmlFor="v-escopo-id"
              dica="Id do portfólio, programa ou projeto em que o papel vale."
            >
              <Entrada
                id="v-escopo-id"
                type="number"
                min={1}
                value={formVinculo.escopo_id}
                onChange={(e) => setFormVinculo((atual) => ({ ...atual, escopo_id: e.target.value }))}
              />
            </Campo>
          )}
          <Alerta tom="info" titulo="Permissões somadas">
            As permissões do papel somam-se às do perfil do usuário enquanto o vínculo existir.
          </Alerta>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  Bookmark,
  Check,
  Clock,
  Cloud,
  Fingerprint,
  Globe2,
  KeyRound,
  Languages,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  Avatar,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  Entrada,
  Esqueleto,
  Etiqueta,
  GradeCards,
  Interruptor,
  KPI,
  Modal,
  PainelLateral,
  SecaoColapsavel,
  Segmentado,
  Selecao,
  Vazio,
  useAvisos,
} from "@/components/ui";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataHora, dataRelativa, numero } from "@/lib/format";
import { useAuth } from "@/store/auth";
import { useUi, modoEfetivo, type Densidade, type Tema } from "@/store/ui";
import { TEMAS, resolverCustom, resolverTokens } from "@/lib/temas";
import { SeletorDensidade } from "@/components/seletor-tema";
import { cn } from "@/lib/utils";
import type { Usuario } from "@/lib/types";

/* ==========================================================================
   Tipos locais
   ========================================================================== */

interface RespostaMe {
  usuario: Usuario;
  permissoes: string[];
  nao_lidas: number;
}

interface PreferenciaVisao {
  id: number;
  contexto: string;
  tipo_visualizacao: string;
  configuracao_json: Record<string, unknown>;
  updated_at: string;
}

interface RegraNotificacao {
  id: number;
  nome: string;
  evento: string;
  condicao_json: Record<string, unknown>;
  canais: string[];
  nivel: string;
  destinatarios: number[];
  ativo: boolean;
  criado_em: string;
}

interface FormularioRegra {
  nome: string;
  evento: string;
  nivel: string;
  canais: string[];
  destinatarios: number[];
  ativo: boolean;
}

interface FiltroSalvo {
  id: number;
  nome: string;
  modulo: string;
  criterios_json: Record<string, unknown>;
  icone: string;
  cor: string;
  compartilhado: boolean;
  criado_em: string;
}

/* ==========================================================================
   Catálogos
   ========================================================================== */

const CORES_AVATAR = [
  "#2563EB",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#6366F1",
  "#84CC16",
  "#F97316",
  "#14B8A6",
  "#A855F7",
];

const FUSOS = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Rio_Branco",
  "Europe/Lisbon",
  "UTC",
];

const CONTEXTOS: Array<{ chave: string; rotulo: string; descricao: string; icone: LucideIcon }> = [
  { chave: "projetos.lista", rotulo: "Projetos", descricao: "Como a lista de projetos abre por padrão.", icone: LayoutDashboard },
  { chave: "tarefas.visao", rotulo: "Tarefas", descricao: "Visualização inicial do módulo de tarefas.", icone: Check },
  { chave: "riscos.visao", rotulo: "Riscos", descricao: "Formato preferido para analisar riscos.", icone: ShieldCheck },
  { chave: "capacidades.visao", rotulo: "Capacidades", descricao: "Matriz, grafo ou lista do catálogo de capacidades.", icone: Sparkles },
  { chave: "alocacao.visao", rotulo: "Alocação", descricao: "Como as alocações da equipe são exibidas.", icone: Users },
  { chave: "financeiro.visao", rotulo: "Financeiro", descricao: "Formato dos painéis financeiros.", icone: Bookmark },
  { chave: "pdi.visao", rotulo: "PDI", descricao: "Acompanhamento do plano de desenvolvimento.", icone: Sparkles },
  { chave: "relatorios.visao", rotulo: "Relatórios", descricao: "Modo de abertura dos relatórios salvos.", icone: LayoutDashboard },
  { chave: "auditoria.visao", rotulo: "Auditoria", descricao: "Visualização da trilha de auditoria.", icone: Lock },
];

const TIPOS_VISAO = [
  { valor: "LISTA", rotulo: "Lista" },
  { valor: "KANBAN", rotulo: "Kanban" },
  { valor: "GANTT", rotulo: "Gantt" },
  { valor: "CALENDARIO", rotulo: "Calendário" },
  { valor: "TIMELINE", rotulo: "Timeline" },
  { valor: "MATRIZ", rotulo: "Matriz" },
  { valor: "GRAFO", rotulo: "Grafo" },
  { valor: "DASHBOARD", rotulo: "Dashboard" },
];

const VISIBILIDADES = [
  { valor: "PUBLICO", rotulo: "Público", descricao: "Qualquer pessoa autenticada pode ver as capacidades." },
  { valor: "RESTRITO", rotulo: "Restrito", descricao: "Visível apenas para o próprio usuário, gestor e RH." },
  { valor: "PRIVADO", rotulo: "Privado", descricao: "Visível apenas para você." },
];

const CANAIS = [
  { valor: "IN_APP", rotulo: "No aplicativo", icone: Bell },
  { valor: "EMAIL", rotulo: "E-mail", icone: Mail },
  { valor: "TEAMS", rotulo: "Microsoft Teams", icone: Users },
  { valor: "SLACK", rotulo: "Slack", icone: BellRing },
  { valor: "PUSH", rotulo: "Push no navegador", icone: BellRing },
];

const NIVEIS_NOTIFICACAO = [
  { valor: "INFO", rotulo: "Informativo" },
  { valor: "SUCESSO", rotulo: "Sucesso" },
  { valor: "ALERTA", rotulo: "Alerta" },
  { valor: "CRITICO", rotulo: "Crítico" },
];

/** Eventos aceitos em RegraNotificacao.evento — o servidor compara o prefixo antes do ponto. */
const EVENTOS_NOTIFICACAO: Array<{ codigo: string; rotulo: string; descricao: string }> = [
  { codigo: "projeto.criado", rotulo: "Projeto criado", descricao: "Um novo projeto entrou no portfólio." },
  { codigo: "projeto.em_risco", rotulo: "Projeto em risco", descricao: "A saúde do projeto passou para vermelho." },
  { codigo: "projeto.concluido", rotulo: "Projeto concluído", descricao: "O projeto foi encerrado com sucesso." },
  { codigo: "tarefa.criada", rotulo: "Tarefa criada", descricao: "Uma tarefa foi incluída no cronograma." },
  { codigo: "tarefa.concluida", rotulo: "Tarefa concluída", descricao: "Uma tarefa foi finalizada." },
  { codigo: "risco.criado", rotulo: "Risco criado", descricao: "Um novo risco foi identificado." },
  { codigo: "risco.critico", rotulo: "Risco crítico", descricao: "Um risco de nível alto ou extremo foi aberto." },
  { codigo: "issue.criada", rotulo: "Issue criada", descricao: "Um impedimento foi registrado." },
  { codigo: "alocacao.criada", rotulo: "Alocação criada", descricao: "Uma pessoa foi alocada em um projeto." },
  { codigo: "marco.concluido", rotulo: "Marco concluído", descricao: "Um marco do cronograma foi atingido." },
  { codigo: "promocao.solicitada", rotulo: "Promoção solicitada", descricao: "Uma sugestão de promoção foi aberta." },
  { codigo: "promocao.aprovada", rotulo: "Promoção aprovada", descricao: "Uma promoção foi validada pelo gestor." },
  { codigo: "treinamento.concluido", rotulo: "Treinamento concluído", descricao: "Um treinamento foi finalizado." },
  { codigo: "capacidade.evidencia_validada", rotulo: "Evidência validada", descricao: "Uma evidência de capacidade foi validada." },
  { codigo: "orcamento.estourado", rotulo: "Orçamento estourado", descricao: "O consumo ultrapassou o orçamento aprovado." },
];

const REGRA_VAZIA: FormularioRegra = {
  nome: "",
  evento: "",
  nivel: "ALERTA",
  canais: ["IN_APP"],
  destinatarios: [],
  ativo: true,
};

const MODULOS_FILTRO = [
  { valor: "projetos", rotulo: "Projetos" },
  { valor: "tarefas", rotulo: "Tarefas" },
  { valor: "riscos", rotulo: "Riscos" },
  { valor: "capacidades", rotulo: "Capacidades" },
  { valor: "alocacao", rotulo: "Alocação" },
  { valor: "financeiro", rotulo: "Financeiro" },
  { valor: "relatorios", rotulo: "Relatórios" },
];

const ICONES_FILTRO = ["filter", "alert-triangle", "shield-alert", "users", "target", "wallet", "calendar", "star"];

const CONTEXTO_VISIBILIDADE = "capacidades.visibilidade";

/* ==========================================================================
   Utilitários
   ========================================================================== */

function expiracaoDoToken(token: string | null): string | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length < 2) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const conteudo = JSON.parse(atob(base64)) as { exp?: number };
    if (!conteudo.exp) return null;
    return new Date(conteudo.exp * 1000).toISOString();
  } catch {
    return null;
  }
}

function mascarar(valor: string) {
  if (valor.length <= 16) return valor;
  return valor.slice(0, 10) + "••••••••" + valor.slice(-6);
}

function criteriosLegiveis(criterios: Record<string, unknown>): string {
  const chaves = Object.keys(criterios || {});
  if (!chaves.length) return "sem critérios";
  return chaves
    .map((c) => {
      const valor = criterios[c];
      const texto = Array.isArray(valor) ? valor.join(", ") : String(valor);
      return c + ": " + texto;
    })
    .join(" · ");
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Preferencias() {
  const navegar = useNavigate();
  const { sucesso, erro } = useAvisos();
  const { carregarSessao, sair, usuario: usuarioSessao, pode } = useAuth();

  // As regras de notificação são globais do sistema: só ADMIN e PMO as
  // alteram. Para os demais a tela mostra o estado atual em modo leitura.
  const podeAdministrar = pode("admin.ver");
  const { tema, densidade, defininirTema, definirDensidade, paleta, definirPaleta, temaCustom } = useUi();

  const [token] = useState<string | null>(() => localStorage.getItem("sgp.access"));

  const me = useConsulta<RespostaMe>(["me"], "/auth/me/");
  const usuario = me.data ? me.data.usuario : usuarioSessao;

  const [form, setForm] = useState({
    nome: "",
    cargo: "",
    area: "",
    localizacao: "",
    fuso_horario: "America/Sao_Paulo",
    cor: "#2563EB",
    iniciais: "",
    avatar_url: "",
  });
  const [interesses, setInteresses] = useState<string[]>([]);
  const [novoInteresse, setNovoInteresse] = useState("");
  const [visibilidade, setVisibilidade] = useState("RESTRITO");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!usuario || carregado) return;
    setForm({
      nome: usuario.nome || "",
      cargo: usuario.cargo || "",
      area: usuario.area || "",
      localizacao: usuario.localizacao || "",
      fuso_horario: usuario.fuso_horario || "America/Sao_Paulo",
      cor: usuario.cor || "#2563EB",
      iniciais: usuario.iniciais || "",
      avatar_url: usuario.avatar_url || "",
    });
    setInteresses(usuario.interesses || []);
    setCarregado(true);
  }, [usuario, carregado]);

  const salvar = useMutacao<Record<string, unknown>, Usuario>({
    metodo: "patch",
    url: "/auth/me/",
    invalidar: [["me"]],
    mensagemSucesso: "Preferências atualizadas",
    aoSucesso: () => {
      carregarSessao();
    },
  });

  const prefs = useLista<PreferenciaVisao>(["preferencias-visao"], "/preferencias-visao/");
  const regras = useLista<RegraNotificacao>(["regras-notificacao"], "/regras-notificacao/");

  /* ---------------------------------------------------------- aparência */

  useEffect(() => {
    if (!usuario) return;
    if (!localStorage.getItem("sgp.tema")) {
      const doBackend =
        usuario.tema === "light" ? "claro" : usuario.tema === "dark" ? "escuro" : usuario.tema === "system" ? "sistema" : null;
      if (doBackend) defininirTema(doBackend);
    }
    if (usuario.densidade === "compacta" || usuario.densidade === "confortavel" || usuario.densidade === "padrao") {
      definirDensidade(usuario.densidade);
    }
  }, [usuario, defininirTema, definirDensidade]);

  const aplicarTema = (valor: string) => {
    defininirTema(valor as Tema);
    salvar.mutate({ tema: valor === "claro" ? "light" : valor === "escuro" ? "dark" : "system" });
  };

  const aplicarDensidade = (valor: string) => {
    definirDensidade(valor as Densidade);
    salvar.mutate({ densidade: valor });
  };

  /* ------------------------------------------------ preferências de visão */

  const definirVisao = useMutacao<
    { contexto: string; tipo_visualizacao: string; configuracao_json: Record<string, unknown> },
    PreferenciaVisao
  >({
    url: "/preferencias-visao/definir/",
    invalidar: [["preferencias-visao"]],
    mensagemSucesso: "Visualização padrão salva",
  });

  const mapaVisoes = useMemo(() => {
    const mapa = new Map<string, string>();
    (prefs.data || []).forEach((p) => mapa.set(p.contexto, p.tipo_visualizacao));
    return mapa;
  }, [prefs.data]);

  useEffect(() => {
    const preferencia = (prefs.data || []).find((p) => p.contexto === CONTEXTO_VISIBILIDADE);
    if (!preferencia) return;
    const valor = preferencia.configuracao_json ? preferencia.configuracao_json.visibilidade : undefined;
    if (typeof valor === "string") setVisibilidade(valor);
  }, [prefs.data]);

  /* ------------------------------------------------------ notificações */

  const alternarRegra = useMutacao<{ id: number; ativo: boolean }, RegraNotificacao>({
    metodo: "patch",
    url: (v) => "/regras-notificacao/" + v.id + "/",
    invalidar: [["regras-notificacao"]],
    mensagemSucesso: "Regra atualizada",
  });

  const alterarCanais = useMutacao<{ id: number; canais: string[] }, RegraNotificacao>({
    metodo: "patch",
    url: (v) => "/regras-notificacao/" + v.id + "/",
    invalidar: [["regras-notificacao"]],
    mensagemSucesso: "Canais atualizados",
  });

  const alternarCanal = (regra: RegraNotificacao, canal: string) => {
    const atuais = regra.canais || [];
    const novos = atuais.indexOf(canal) >= 0 ? atuais.filter((c) => c !== canal) : atuais.concat([canal]);
    alterarCanais.mutate({ id: regra.id, canais: novos });
  };

  /* ----------------------------------------- criar e excluir regra */

  const [painelRegra, setPainelRegra] = useState(false);
  const [confirmacaoRegra, setConfirmacaoRegra] = useState<RegraNotificacao | null>(null);
  const [formRegra, setFormRegra] = useState<FormularioRegra>(REGRA_VAZIA);

  const pessoas = useLista<Usuario>(CHAVES.usuarios, painelRegra ? "/usuarios/" : null, {
    ativo: "true",
    page_size: 300,
  });

  const mapaPessoas = useMemo(() => {
    const mapa = new Map<number, Usuario>();
    (pessoas.data || []).forEach((p) => mapa.set(p.id, p));
    return mapa;
  }, [pessoas.data]);

  const eventoEscolhido = EVENTOS_NOTIFICACAO.find((e) => e.codigo === formRegra.evento);

  const criarRegra = useMutacao<Record<string, unknown>, RegraNotificacao>({
    url: "/regras-notificacao/",
    invalidar: [["regras-notificacao"]],
    mensagemSucesso: "Regra de notificação criada",
    aoSucesso: () => {
      setPainelRegra(false);
      setFormRegra(REGRA_VAZIA);
    },
  });

  const excluirRegra = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/regras-notificacao/" + v.id + "/",
    invalidar: [["regras-notificacao"]],
    mensagemSucesso: "Regra de notificação excluída",
    aoSucesso: () => setConfirmacaoRegra(null),
  });

  function abrirNovaRegra() {
    setFormRegra(REGRA_VAZIA);
    setPainelRegra(true);
  }

  function enviarRegra() {
    const nome = formRegra.nome.trim();
    if (!nome) {
      erro("Informe o nome da regra", "O nome identifica a regra na lista e na auditoria.");
      return;
    }
    if (!formRegra.evento) {
      erro("Selecione o evento que dispara a regra");
      return;
    }
    if (formRegra.canais.length === 0) {
      erro("Selecione ao menos um canal de entrega", "Sem canal, a regra não avisa ninguém.");
      return;
    }
    criarRegra.mutate({
      nome,
      evento: formRegra.evento,
      nivel: formRegra.nivel,
      canais: formRegra.canais,
      destinatarios: formRegra.destinatarios,
      ativo: formRegra.ativo,
    });
  }

  /* ------------------------------------------------------ filtros salvos */

  const [moduloFiltro, setModuloFiltro] = useState("");
  const filtros = useLista<FiltroSalvo>(
    ["filtros-salvos", moduloFiltro || "todos"],
    "/filtros-salvos/",
    moduloFiltro ? { modulo: moduloFiltro } : undefined
  );

  const [modalFiltro, setModalFiltro] = useState(false);
  const [formFiltro, setFormFiltro] = useState({
    nome: "",
    modulo: "projetos",
    icone: "filter",
    cor: "#6366F1",
    compartilhado: false,
  });
  const [criterios, setCriterios] = useState<Array<{ chave: string; valor: string }>>([]);
  const [novoCriterio, setNovoCriterio] = useState({ chave: "", valor: "" });
  const [confirmacao, setConfirmacao] = useState<FiltroSalvo | null>(null);

  const criarFiltro = useMutacao<Record<string, unknown>, FiltroSalvo>({
    url: "/filtros-salvos/",
    invalidar: [["filtros-salvos"]],
    mensagemSucesso: "Filtro salvo",
    aoSucesso: () => {
      setModalFiltro(false);
      setFormFiltro({ nome: "", modulo: "projetos", icone: "filter", cor: "#6366F1", compartilhado: false });
      setCriterios([]);
      setNovoCriterio({ chave: "", valor: "" });
    },
  });

  const excluirFiltro = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/filtros-salvos/" + v.id + "/",
    invalidar: [["filtros-salvos"]],
    mensagemSucesso: "Filtro excluído",
    aoSucesso: () => setConfirmacao(null),
  });

  const adicionarCriterio = () => {
    const chave = novoCriterio.chave.trim();
    const valor = novoCriterio.valor.trim();
    if (!chave || !valor) {
      erro("Informe a chave e o valor do critério");
      return;
    }
    setCriterios((atual) => atual.concat([{ chave, valor }]));
    setNovoCriterio({ chave: "", valor: "" });
  };

  const enviarFiltro = () => {
    if (!formFiltro.nome.trim()) {
      erro("Informe o nome do filtro");
      return;
    }
    const criteriosJson: Record<string, unknown> = {};
    criterios.forEach((c) => {
      criteriosJson[c.chave] = c.valor.indexOf(",") >= 0 ? c.valor.split(",").map((v) => v.trim()) : c.valor;
    });
    criarFiltro.mutate({
      nome: formFiltro.nome.trim(),
      modulo: formFiltro.modulo,
      icone: formFiltro.icone,
      cor: formFiltro.cor,
      compartilhado: formFiltro.compartilhado,
      criterios_json: criteriosJson,
    });
  };

  /* ------------------------------------------------------------- perfil */

  const salvarPerfil = () => {
    if (!form.nome.trim()) {
      erro("O nome não pode ficar em branco");
      return;
    }
    salvar.mutate({
      nome: form.nome.trim(),
      cargo: form.cargo,
      area: form.area,
      localizacao: form.localizacao,
      fuso_horario: form.fuso_horario,
      cor: form.cor,
      iniciais: form.iniciais,
      avatar_url: form.avatar_url,
    });
  };

  const adicionarInteresse = () => {
    const valor = novoInteresse.trim();
    if (!valor) return;
    if (interesses.indexOf(valor) >= 0) {
      erro("Este interesse já está na lista");
      return;
    }
    const atualizados = interesses.concat([valor]);
    setInteresses(atualizados);
    setNovoInteresse("");
    salvar.mutate({ interesses: atualizados });
  };

  const removerInteresse = (valor: string) => {
    const atualizados = interesses.filter((i) => i !== valor);
    setInteresses(atualizados);
    salvar.mutate({ interesses: atualizados });
  };

  const expiracao = expiracaoDoToken(token);

  if (me.isLoading) return <CarregandoBloco rotulo="Carregando suas preferências..." />;

  if (me.isError) {
    return (
      <div className="space-y-4">
        <CabecalhoPagina titulo="Preferências" icone={Settings2} cor="#2563EB" />
        <Alerta tom="danger" titulo="Não foi possível carregar seu perfil">
          {mensagemErro(me.error)}
        </Alerta>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Preferências"
        subtitulo="Perfil, aparência, privacidade, visualizações, notificações e segurança"
        icone={Settings2}
        cor="#2563EB"
        migalhas={[{ rotulo: "Início", onClick: () => navegar("/") }, { rotulo: "Preferências" }]}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" icone={LayoutDashboard} onClick={() => navegar("/meu-painel")}>
              Meu painel
            </Botao>
            <Botao variante="primario" icone={Save} carregando={salvar.isPending} onClick={salvarPerfil}>
              Salvar perfil
            </Botao>
          </div>
        }
      />

      <GradeCards colunas={4}>
        <KPI rotulo="Perfil de acesso" valor={usuario ? usuario.papel || usuario.perfil : "—"} icone={UserCog} cor="#2563EB" compacto />
        <KPI rotulo="Permissões" valor={numero(me.data ? me.data.permissoes.length : 0)} icone={ShieldCheck} cor="#059669" compacto />
        <KPI rotulo="Notificações não lidas" valor={numero(me.data ? me.data.nao_lidas : 0)} icone={Bell} cor="#F59E0B" compacto />
        <KPI rotulo="Filtros salvos" valor={numero((filtros.data || []).length)} icone={Bookmark} cor="#8B5CF6" compacto />
      </GradeCards>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* --------------------------------------------------------- perfil */}
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <div className="mb-3 flex items-center gap-2">
            <UserCog className="size-4 text-brand" aria-hidden />
            <h2 className="text-sm font-semibold text-fg">Perfil</h2>
          </div>

          <div className="mb-3 flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
            <Avatar
              nome={form.nome || "Usuário"}
              cor={form.cor}
              iniciais={form.iniciais}
              url={form.avatar_url}
              tamanho="xl"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{form.nome || "Sem nome"}</p>
              <p className="truncate text-2xs text-fg-muted">{usuario ? usuario.email : ""}</p>
              <p className="truncate text-2xs text-fg-subtle">
                {[form.cargo, form.area].filter(Boolean).join(" · ") || "Cargo e área não informados"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Nome" obrigatorio htmlFor="p-nome">
              <Entrada id="p-nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            </Campo>
            <Campo rotulo="E-mail" htmlFor="p-email" dica="O e-mail de acesso não pode ser alterado por aqui.">
              <Entrada id="p-email" value={usuario ? usuario.email : ""} readOnly disabled />
            </Campo>
            <Campo rotulo="Cargo" htmlFor="p-cargo">
              <Entrada id="p-cargo" value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
            </Campo>
            <Campo rotulo="Área" htmlFor="p-area">
              <Entrada id="p-area" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
            </Campo>
            <Campo rotulo="Localização" htmlFor="p-local">
              <Entrada
                id="p-local"
                value={form.localizacao}
                onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Fuso horário" htmlFor="p-fuso">
              <Selecao
                id="p-fuso"
                value={form.fuso_horario}
                onChange={(e) => setForm((f) => ({ ...f, fuso_horario: e.target.value }))}
              >
                {FUSOS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Iniciais exibidas" htmlFor="p-iniciais" dica="Máximo de 4 caracteres.">
              <Entrada
                id="p-iniciais"
                value={form.iniciais}
                maxLength={4}
                onChange={(e) => setForm((f) => ({ ...f, iniciais: e.target.value.toUpperCase() }))}
              />
            </Campo>
            <Campo rotulo="Foto (URL)" htmlFor="p-avatar" dica="Endereço público de uma imagem quadrada.">
              <Entrada
                id="p-avatar"
                value={form.avatar_url}
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                placeholder="https://..."
              />
            </Campo>
          </div>

          <div className="mt-3">
            <Campo rotulo="Cor do avatar" dica="Usada em avatares, gráficos e etiquetas com o seu nome.">
              <div className="flex flex-wrap items-center gap-1.5">
                {CORES_AVATAR.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={"Cor " + c}
                    onClick={() => setForm((f) => ({ ...f, cor: c }))}
                    className={cn(
                      "size-7 rounded-full border-2 transition-transform hover:scale-110",
                      form.cor === c ? "border-fg" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Cor personalizada do avatar"
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                  className="h-8 w-10 cursor-pointer rounded border border-border-strong bg-surface"
                />
              </div>
            </Campo>
          </div>

          <div className="mt-3 flex justify-end">
            <Botao variante="primario" icone={Save} carregando={salvar.isPending} onClick={salvarPerfil}>
              Salvar dados do perfil
            </Botao>
          </div>
        </div>

        {/* ----------------------------------------------------- aparência */}
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <div className="mb-3 flex items-center gap-2">
            <Palette className="size-4 text-brand" aria-hidden />
            <h2 className="text-sm font-semibold text-fg">Aparência</h2>
          </div>
          <Alerta tom="info" titulo="Aplicação imediata">
            Tema e densidade são aplicados na hora em toda a interface e também gravados no seu usuário para valerem
            nos próximos acessos.
          </Alerta>

          <div className="mt-3 space-y-4">
            <Campo rotulo="Modo de cor" dica="Seguir o sistema acompanha a preferência do seu sistema operacional.">
              <Segmentado
                valor={tema}
                onChange={aplicarTema}
                opcoes={[
                  { valor: "claro", rotulo: "Claro", icone: Sun },
                  { valor: "escuro", rotulo: "Escuro", icone: Moon },
                  { valor: "sistema", rotulo: "Sistema", icone: Monitor },
                ]}
              />
            </Campo>

            <Campo
              rotulo="Tema (paleta de cores)"
              dica="São 8 temas predefinidos, incluindo Bradesco 2026 e Alto contraste, além do seu tema personalizado."
            >
              <div className="flex flex-wrap items-center gap-2">
                {TEMAS.map((definicao) => {
                  const tokens = resolverTokens(definicao, modoEfetivo(tema));
                  const ativo = paleta === definicao.id;
                  return (
                    <button
                      key={definicao.id}
                      type="button"
                      onClick={() => definirPaleta(definicao.id)}
                      aria-pressed={ativo}
                      title={definicao.nome + " — " + definicao.descricao}
                      className={cn(
                        "flex items-center gap-2 rounded-sgp border px-2.5 py-1.5 text-xs font-medium transition-all",
                        ativo
                          ? "border-brand bg-brand-soft/50 text-brand ring-2 ring-brand/30"
                          : "border-border-strong bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg"
                      )}
                    >
                      <span
                        className="size-4 shrink-0 rounded-full border border-border"
                        style={{ backgroundColor: tokens.brand }}
                      />
                      {definicao.nome}
                    </button>
                  );
                })}
                {Object.keys(temaCustom.claro).length + Object.keys(temaCustom.escuro).length > 0 && (
                  <button
                    type="button"
                    onClick={() => definirPaleta("custom")}
                    aria-pressed={paleta === "custom"}
                    className={cn(
                      "flex items-center gap-2 rounded-sgp border px-2.5 py-1.5 text-xs font-medium transition-all",
                      paleta === "custom"
                        ? "border-brand bg-brand-soft/50 text-brand ring-2 ring-brand/30"
                        : "border-border-strong bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg"
                    )}
                  >
                    <span
                      className="size-4 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: resolverCustom(temaCustom, modoEfetivo(tema)).brand }}
                    />
                    {temaCustom.nome}
                  </button>
                )}
              </div>
            </Campo>

            <Botao variante="secundario" icone={Palette} onClick={() => navegar("/temas")}>
              Abrir editor de temas
            </Botao>
            <Campo
              rotulo="Densidade"
              dica="Controla a escala de espaçamento de toda a interface. Compare as opções e clique para aplicar."
            >
              <SeletorDensidade />
            </Campo>

            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Pré-visualização</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-sgp border border-border bg-surface p-2">
                  <span className="text-xs text-fg">Cartão de exemplo</span>
                  <Etiqueta tom="success" icone={Check}>saudável</Etiqueta>
                </div>
                <div className="flex items-center gap-2">
                  <Botao tamanho="sm" variante="primario">Ação primária</Botao>
                  <Botao tamanho="sm" variante="secundario">Secundária</Botao>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip cor="#2563EB">planejado</Chip>
                  <Chip cor="#F59E0B">atenção</Chip>
                  <Chip cor="#DC2626">crítico</Chip>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------- privacidade e capacidades */}
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand" aria-hidden />
            <h2 className="text-sm font-semibold text-fg">Privacidade e capacidades</h2>
          </div>

          <div className="space-y-3">
            <Interruptor
              ativo={usuario ? usuario.aceita_recomendacoes : true}
              onChange={(v) => salvar.mutate({ aceita_recomendacoes: v })}
              rotulo="Aceito ser recomendado em alocações"
              descricao="Permite que o motor de matching considere o seu perfil ao sugerir responsáveis para tarefas e projetos."
            />
            <Interruptor
              ativo={usuario ? usuario.disponivel_para_mentoria : false}
              onChange={(v) => salvar.mutate({ disponivel_para_mentoria: v })}
              rotulo="Disponível para mentoria"
              descricao="Você passa a aparecer nas sugestões de mentores para as capacidades em que é referência."
            />

            <Campo
              rotulo="Visibilidade padrão das capacidades"
              dica="Aplicada por padrão aos seus registros de capacidade no SGP."
            >
              <div className="space-y-1.5">
                {VISIBILIDADES.map((v) => (
                  <label
                    key={v.valor}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-sgp border p-2.5 transition-colors",
                      visibilidade === v.valor ? "border-brand/50 bg-brand-soft/20" : "border-border bg-surface-2"
                    )}
                  >
                    <input
                      type="radio"
                      name="visibilidade-capacidades"
                      className="mt-0.5 size-4 shrink-0 accent-[var(--sgp-brand)]"
                      checked={visibilidade === v.valor}
                      onChange={() => {
                        setVisibilidade(v.valor);
                        definirVisao.mutate({
                          contexto: CONTEXTO_VISIBILIDADE,
                          tipo_visualizacao: "LISTA",
                          configuracao_json: { visibilidade: v.valor },
                        });
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-fg">{v.rotulo}</span>
                      <span className="block text-2xs text-fg-muted">{v.descricao}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Campo>

            <Campo rotulo="Interesses" dica="Usados em recomendações de desenvolvimento e alocação.">
              <div className="flex items-center gap-2">
                <Entrada
                  value={novoInteresse}
                  onChange={(e) => setNovoInteresse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    adicionarInteresse();
                  }}
                  placeholder="Ex.: arquitetura, dados, liderança"
                />
                <Botao variante="secundario" icone={Plus} onClick={adicionarInteresse}>
                  Incluir
                </Botao>
              </div>
            </Campo>
            <div className="flex flex-wrap gap-1.5">
              {interesses.map((i) => (
                <Chip key={i} cor="#7C3AED" removivel onRemover={() => removerInteresse(i)}>
                  {i}
                </Chip>
              ))}
              {interesses.length === 0 && <span className="text-2xs text-fg-subtle">Nenhum interesse cadastrado.</span>}
            </div>

            <Alerta tom="info" titulo="LGPD: seus dados e seu direito de contestação" icone={Fingerprint}>
              O SGP trata dados pessoais e de desempenho para fins de gestão de projetos e desenvolvimento de
              capacidades, com base no legítimo interesse e no consentimento registrado acima. Você pode solicitar a
              correção de dados incorretos, contestar avaliações de capacidade junto ao RH ou ao seu gestor e revogar o
              consentimento para recomendações a qualquer momento. As avaliações contestadas permanecem registradas,
              com a devida justificativa, na trilha de auditoria imutável do sistema.
            </Alerta>
          </div>
        </div>

        {/* --------------------------------------------- visualizações padrão */}
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <div className="mb-3 flex items-center gap-2">
            <LayoutDashboard className="size-4 text-brand" aria-hidden />
            <h2 className="text-sm font-semibold text-fg">Visualizações padrão</h2>
          </div>
          <p className="mb-3 text-2xs text-fg-muted">
            Escolha o formato de visualização que cada módulo deve abrir por padrão. A preferência é gravada em
            /preferencias-visao/definir/.
          </p>

          {prefs.isLoading ? (
            <Esqueleto linhas={6} />
          ) : (
            <div className="space-y-2">
              {CONTEXTOS.map((c) => (
                <div
                  key={c.chave}
                  className="flex flex-wrap items-center gap-2 rounded-sgp border border-border bg-surface-2 px-3 py-2"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-soft/50 text-brand">
                    <c.icone className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-fg">{c.rotulo}</span>
                    <span className="block truncate text-2xs text-fg-muted">{c.descricao}</span>
                  </span>
                  <Selecao
                    aria-label={"Visualização padrão de " + c.rotulo}
                    className="h-8 w-40 py-0 text-xs"
                    value={mapaVisoes.get(c.chave) || "LISTA"}
                    onChange={(e) =>
                      definirVisao.mutate({
                        contexto: c.chave,
                        tipo_visualizacao: e.target.value,
                        configuracao_json: {},
                      })
                    }
                  >
                    {TIPOS_VISAO.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </option>
                    ))}
                  </Selecao>
                  {mapaVisoes.get(c.chave) && (
                    <Etiqueta tom="success" icone={Check}>
                      definida
                    </Etiqueta>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --------------------------------------------------- notificações */}
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-brand" aria-hidden />
              <h2 className="text-sm font-semibold text-fg">Notificações</h2>
            </div>
            {podeAdministrar && (
              <Botao tamanho="sm" variante="primario" icone={Plus} onClick={abrirNovaRegra}>
                Nova regra
              </Botao>
            )}
          </div>
          <p className="mb-3 text-2xs text-fg-muted">
            As regras definem quais eventos geram notificação e por qual canal elas são entregues. Criar, excluir e
            ajustar regras exige admin.ver; os demais perfis acompanham em modo leitura.
          </p>

          {!podeAdministrar && (
            <Alerta tom="info" titulo="Regras em modo leitura" className="mb-3">
              As regras de notificação são globais do sistema e só ADMIN e PMO podem alterá-las. O estado abaixo é apenas
              informativo: fale com o administrador para criar, excluir, ativar, desativar ou trocar os canais de uma
              regra.
            </Alerta>
          )}

          {regras.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar as regras">
              {mensagemErro(regras.error)}
            </Alerta>
          )}

          {regras.isLoading ? (
            <Esqueleto linhas={5} />
          ) : (regras.data || []).length === 0 ? (
            <Vazio
              icone={Bell}
              titulo="Nenhuma regra de notificação"
              descricao="Sem regra cadastrada, os eventos seguem apenas a notificação padrão no aplicativo. Crie a primeira regra para escolher evento, canais, nível e destinatários."
              acao={
                podeAdministrar ? (
                  <Botao variante="primario" icone={Plus} onClick={abrirNovaRegra}>
                    Criar regra
                  </Botao>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2">
              {(regras.data || []).map((r) => (
                <div key={r.id} className="rounded-sgp border border-border bg-surface-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-fg">{r.nome}</p>
                      <p className="truncate font-mono text-2xs text-fg-subtle">{r.evento}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Etiqueta
                        tom={r.nivel === "CRITICO" ? "danger" : r.nivel === "ALERTA" ? "warning" : r.nivel === "SUCESSO" ? "success" : "info"}
                      >
                        {r.nivel}
                      </Etiqueta>
                      {podeAdministrar ? (
                        <Interruptor ativo={r.ativo} tamanho="sm" onChange={(v) => alternarRegra.mutate({ id: r.id, ativo: v })} />
                      ) : (
                        <Etiqueta tom={r.ativo ? "success" : "neutral"}>{r.ativo ? "ativa" : "inativa"}</Etiqueta>
                      )}
                      {podeAdministrar && (
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={"Excluir regra " + r.nome}
                          variante="perigo"
                          tamanho="sm"
                          onClick={() => setConfirmacaoRegra(r)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {CANAIS.map((c) => {
                      const ativo = (r.canais || []).indexOf(c.valor) >= 0;
                      return (
                        <Chip
                          key={c.valor}
                          cor="#0891B2"
                          icone={c.icone}
                          ativo={ativo}
                          onClick={podeAdministrar ? () => alternarCanal(r, c.valor) : undefined}
                        >
                          {c.rotulo}
                        </Chip>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-2xs text-fg-subtle">
                    <span>{numero((r.destinatarios || []).length) + " destinatário(s) explícito(s)"}</span>
                    <span aria-hidden>·</span>
                    <span>{"criada " + dataRelativa(r.criado_em)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------- filtros salvos */}
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bookmark className="size-4 text-brand" aria-hidden />
              <h2 className="text-sm font-semibold text-fg">Filtros salvos</h2>
            </div>
            <div className="flex items-center gap-2">
              <Selecao
                aria-label="Filtrar por módulo"
                className="h-8 w-36 py-0 text-xs"
                value={moduloFiltro}
                onChange={(e) => setModuloFiltro(e.target.value)}
              >
                <option value="">Todos os módulos</option>
                {MODULOS_FILTRO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.rotulo}
                  </option>
                ))}
              </Selecao>
              <Botao tamanho="sm" variante="primario" icone={Plus} onClick={() => setModalFiltro(true)}>
                Novo filtro
              </Botao>
            </div>
          </div>

          {filtros.isLoading ? (
            <Esqueleto linhas={4} />
          ) : (filtros.data || []).length === 0 ? (
            <Vazio
              icone={Bookmark}
              titulo="Nenhum filtro salvo"
              descricao="Salve combinações de filtros recorrentes para reaplicá-las com um clique."
              acao={
                <Botao variante="primario" icone={Plus} onClick={() => setModalFiltro(true)}>
                  Criar filtro
                </Botao>
              }
            />
          ) : (
            <div className="space-y-2">
              {(filtros.data || []).map((f) => (
                <div key={f.id} className="flex items-start gap-2 rounded-sgp border border-border bg-surface-2 p-2.5">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-md"
                    style={{ backgroundColor: f.cor + "1f", color: f.cor }}
                  >
                    <Bookmark className="size-3.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-fg">{f.nome}</p>
                      <Etiqueta tom="neutral">{f.modulo}</Etiqueta>
                      {f.compartilhado && <Etiqueta tom="info" icone={Users}>compartilhado</Etiqueta>}
                    </div>
                    <p className="mt-0.5 text-2xs text-fg-muted">{criteriosLegiveis(f.criterios_json)}</p>
                    <p className="mt-0.5 text-2xs text-fg-subtle">{"criado " + dataRelativa(f.criado_em)}</p>
                  </div>
                  <BotaoIcone icone={Trash2} rotulo={"Excluir filtro " + f.nome} tamanho="xs" onClick={() => setConfirmacao(f)} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------ segurança */}
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1 xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Lock className="size-4 text-brand" aria-hidden />
            <h2 className="text-sm font-semibold text-fg">Segurança</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <KeyRound className="size-3.5 text-brand" aria-hidden />
                Token da sessão (JWT)
              </p>
              <code className="mt-2 block break-all rounded bg-surface-3 px-2 py-1.5 font-mono text-2xs text-fg">
                {token ? mascarar(token) : "sessão não identificada"}
              </code>
              <p className="mt-2 flex items-center gap-1.5 text-2xs text-fg-muted">
                <Clock className="size-3" aria-hidden />
                {expiracao ? "Expira em " + dataHora(expiracao) : "Expiração não informada pelo token"}
              </p>
            </div>

            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <Globe2 className="size-3.5 text-brand" aria-hidden />
                Preferências regionais
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-2xs text-fg-muted">
                <Languages className="size-3" aria-hidden />
                {"Idioma: " + (usuario ? usuario.idioma || "pt-BR" : "pt-BR")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-2xs text-fg-muted">
                <MapPin className="size-3" aria-hidden />
                {"Fuso: " + form.fuso_horario}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-2xs text-fg-muted">
                <Clock className="size-3" aria-hidden />
                {"Última atualização: " + (usuario ? dataRelativa(usuario.atualizado_em) : "—")}
              </p>
            </div>

            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <LogOut className="size-3.5 text-danger" aria-hidden />
                Encerrar sessões
              </p>
              <p className="mt-2 text-2xs text-fg-muted">
                Remove os tokens de acesso e atualização armazenados neste navegador e encerra a sessão atual.
              </p>
              <Botao
                variante="perigo"
                tamanho="sm"
                icone={LogOut}
                className="mt-2"
                onClick={() => {
                  sair();
                  sucesso("Sessões encerradas", "Os tokens locais foram removidos.");
                  navegar("/login");
                }}
              >
                Sair de todos os dispositivos
              </Botao>
            </div>
          </div>

          <div className="mt-3">
            <Alerta tom="warning" titulo="MFA e SSO no roadmap" icone={ShieldCheck}>
              Autenticação multifator e login federado (SSO/SAML) estão previstos no roadmap de segurança do SGP e
              ainda não estão disponíveis nesta versão. Enquanto isso, use senhas fortes e revogue sessões em
              dispositivos compartilhados.
            </Alerta>
          </div>
        </div>
      </div>

      <SecaoColapsavel titulo="Como suas preferências são usadas" icone={Cloud} abertoInicial={false}>
        <ul className="space-y-1.5 text-xs text-fg-muted">
          <li>1. O perfil alimenta avatares, notificações e o motor de recomendação de alocação.</li>
          <li>2. Tema e densidade são aplicados localmente na hora e persistidos em /auth/me/.</li>
          <li>3. As visualizações padrão são gravadas contexto a contexto em /preferencias-visao/definir/.</li>
          <li>4. Os filtros salvos ficam disponíveis nos módulos correspondentes e podem ser compartilhados com a equipe.</li>
          <li>5. As regras e os canais de notificação são globais do sistema: só ADMIN e PMO alteram, os demais acompanham em modo leitura.</li>
        </ul>
      </SecaoColapsavel>

      {/* ------------------------------------------------------ modal filtro */}

      <Modal
        aberto={modalFiltro}
        onFechar={() => setModalFiltro(false)}
        titulo="Novo filtro salvo"
        subtitulo="Combine critérios para reutilizar nos módulos do SGP"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setModalFiltro(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Save} carregando={criarFiltro.isPending} onClick={enviarFiltro}>
              Salvar filtro
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <Campo rotulo="Nome" obrigatorio htmlFor="f-nome">
            <Entrada
              id="f-nome"
              value={formFiltro.nome}
              onChange={(e) => setFormFiltro((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex.: Projetos críticos em execução"
            />
          </Campo>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Módulo" htmlFor="f-modulo">
              <Selecao
                id="f-modulo"
                value={formFiltro.modulo}
                onChange={(e) => setFormFiltro((f) => ({ ...f, modulo: e.target.value }))}
              >
                {MODULOS_FILTRO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Ícone" htmlFor="f-icone" dica="Identificador do ícone exibido no card.">
              <Selecao
                id="f-icone"
                value={formFiltro.icone}
                onChange={(e) => setFormFiltro((f) => ({ ...f, icone: e.target.value }))}
              >
                {ICONES_FILTRO.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <Campo rotulo="Cor" dica="Usada no card do filtro.">
            <div className="flex flex-wrap items-center gap-1.5">
              {CORES_AVATAR.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={"Cor " + c}
                  onClick={() => setFormFiltro((f) => ({ ...f, cor: c }))}
                  className={cn(
                    "size-6 rounded-full border-2 transition-transform hover:scale-110",
                    formFiltro.cor === c ? "border-fg" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Campo>

          <Campo rotulo="Critérios" dica="Separe múltiplos valores por vírgula para gerar uma lista.">
            <div className="flex flex-wrap items-center gap-2">
              <Entrada
                className="max-w-40"
                value={novoCriterio.chave}
                onChange={(e) => setNovoCriterio((c) => ({ ...c, chave: e.target.value }))}
                placeholder="status"
              />
              <Entrada
                value={novoCriterio.valor}
                onChange={(e) => setNovoCriterio((c) => ({ ...c, valor: e.target.value }))}
                placeholder="EM_EXECUCAO"
              />
              <Botao variante="secundario" icone={Plus} onClick={adicionarCriterio}>
                Adicionar
              </Botao>
            </div>
          </Campo>
          <div className="flex flex-wrap gap-1.5">
            {criterios.map((c) => (
              <Chip
                key={c.chave}
                cor="#6366F1"
                removivel
                onRemover={() => setCriterios((atual) => atual.filter((x) => x.chave !== c.chave))}
              >
                {c.chave + ": " + c.valor}
              </Chip>
            ))}
            {criterios.length === 0 && <span className="text-2xs text-fg-subtle">Nenhum critério adicionado.</span>}
          </div>

          <Interruptor
            ativo={formFiltro.compartilhado}
            onChange={(v) => setFormFiltro((f) => ({ ...f, compartilhado: v }))}
            rotulo="Compartilhar com a equipe"
            descricao="Filtros compartilhados ficam visíveis para os demais usuários do módulo."
          />
        </div>
      </Modal>

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo="Excluir filtro salvo"
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirFiltro.isPending}
              onClick={() => {
                if (confirmacao) excluirFiltro.mutate({ id: confirmacao.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          {"Deseja excluir o filtro " + (confirmacao ? confirmacao.nome : "") + "? Ele deixará de aparecer no módulo "
            + (confirmacao ? confirmacao.modulo : "") + "."}
        </p>
        <Alerta tom="info" titulo="Filtros compartilhados" className="mt-3">
          Se o filtro foi compartilhado, ele também sai da lista dos demais usuários do módulo.
        </Alerta>
      </Modal>

      {/* -------------------------------------------- painel nova regra */}
      {podeAdministrar && (
        <PainelLateral
          aberto={painelRegra}
          onFechar={() => setPainelRegra(false)}
          largura="md"
          titulo="Nova regra de notificação"
          subtitulo="Escolha o evento, os canais, o nível e quem deve receber o aviso"
          rodape={
            <div className="flex items-center gap-2">
              <Botao variante="fantasma" onClick={() => setPainelRegra(false)}>
                Cancelar
              </Botao>
              <Botao variante="primario" icone={Save} carregando={criarRegra.isPending} onClick={enviarRegra}>
                Criar regra
              </Botao>
            </div>
          }
        >
          <div className="space-y-3">
            <Alerta tom="info" titulo="Como a regra é aplicada" icone={BellRing}>
              A regra vale para todo o sistema. O evento é comparado pelo prefixo antes do ponto: uma regra de
              projeto.criado também atende projeto.concluido, e a opção Todos os eventos equivale ao curinga. A
              notificação no aplicativo é sempre criada para quem o evento notifica; o envio de e-mail acontece quando
              alguma regra ativa daquele evento tem o canal E-mail.
            </Alerta>

            <Campo rotulo="Nome" obrigatorio htmlFor="nr-nome" dica="Identifica a regra na lista e na auditoria.">
              <Entrada
                id="nr-nome"
                maxLength={140}
                value={formRegra.nome}
                placeholder="Ex.: Risco crítico avisa o gerente"
                onChange={(e) => setFormRegra((f) => ({ ...f, nome: e.target.value }))}
              />
            </Campo>

            <Campo
              rotulo="Evento"
              obrigatorio
              htmlFor="nr-evento"
              dica="Eventos com o mesmo prefixo antes do ponto também disparam esta regra."
            >
              <Selecao
                id="nr-evento"
                value={formRegra.evento}
                onChange={(e) => setFormRegra((f) => ({ ...f, evento: e.target.value }))}
              >
                <option value="">Selecione o evento</option>
                <option value="*">Todos os eventos</option>
                {EVENTOS_NOTIFICACAO.map((e) => (
                  <option key={e.codigo} value={e.codigo}>
                    {e.rotulo + " — " + e.codigo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            {eventoEscolhido && <p className="-mt-1.5 text-2xs text-fg-muted">{eventoEscolhido.descricao}</p>}

            <Campo rotulo="Nível" dica="Cor e prioridade do aviso no aplicativo.">
              <Segmentado
                valor={formRegra.nivel}
                onChange={(v) => setFormRegra((f) => ({ ...f, nivel: v }))}
                opcoes={NIVEIS_NOTIFICACAO}
                tamanho="sm"
              />
            </Campo>

            <Campo
              rotulo="Canais"
              obrigatorio
              dica="O aviso no aplicativo é sempre criado; hoje o canal E-mail é o único com envio externo implementado no servidor."
            >
              <div className="flex flex-wrap gap-1.5">
                {CANAIS.map((c) => {
                  const ativo = formRegra.canais.indexOf(c.valor) >= 0;
                  return (
                    <Chip
                      key={c.valor}
                      cor="#0891B2"
                      icone={c.icone}
                      ativo={ativo}
                      onClick={() =>
                        setFormRegra((f) => ({
                          ...f,
                          canais: ativo ? f.canais.filter((x) => x !== c.valor) : f.canais.concat([c.valor]),
                        }))
                      }
                    >
                      {c.rotulo}
                    </Chip>
                  );
                })}
              </div>
            </Campo>

            <Campo
              rotulo="Destinatários"
              dica="Opcional. A lista fica registrada na regra; a notificação no aplicativo continua indo para quem o próprio evento notifica."
            >
              <div className="space-y-2">
                <Selecao
                  aria-label="Adicionar destinatário à regra"
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (!id) return;
                    setFormRegra((f) =>
                      f.destinatarios.indexOf(id) >= 0 ? f : { ...f, destinatarios: f.destinatarios.concat([id]) }
                    );
                  }}
                >
                  <option value="">Adicionar pessoa...</option>
                  {(pessoas.data || [])
                    .filter((p) => formRegra.destinatarios.indexOf(p.id) < 0)
                    .map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.nome + (p.cargo ? " · " + p.cargo : "")}
                      </option>
                    ))}
                </Selecao>
                {pessoas.isLoading ? (
                  <Esqueleto linhas={2} />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {formRegra.destinatarios.map((id) => {
                      const pessoa = mapaPessoas.get(id);
                      return (
                        <Chip
                          key={id}
                          cor="#7C3AED"
                          removivel
                          onRemover={() =>
                            setFormRegra((f) => ({ ...f, destinatarios: f.destinatarios.filter((x) => x !== id) }))
                          }
                        >
                          {pessoa ? pessoa.nome : "Usuário " + id}
                        </Chip>
                      );
                    })}
                    {formRegra.destinatarios.length === 0 && (
                      <span className="text-2xs text-fg-subtle">
                        Nenhum destinatário explícito: a regra acompanha os destinatários naturais do evento.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Campo>

            <Interruptor
              ativo={formRegra.ativo}
              onChange={(v) => setFormRegra((f) => ({ ...f, ativo: v }))}
              rotulo="Regra ativa"
              descricao="Regras inativas ficam cadastradas, mas não são avaliadas na hora de notificar. É o jeito seguro de pausar sem perder a configuração."
            />
          </div>
        </PainelLateral>
      )}

      {/* ------------------------------------------ exclusão de regra */}
      {podeAdministrar && (
        <Modal
          aberto={confirmacaoRegra !== null}
          onFechar={() => setConfirmacaoRegra(null)}
          titulo="Excluir regra de notificação"
          largura="sm"
          rodape={
            <div className="flex items-center gap-2">
              <Botao variante="fantasma" onClick={() => setConfirmacaoRegra(null)}>
                Cancelar
              </Botao>
              <Botao
                variante="perigo"
                icone={Trash2}
                carregando={excluirRegra.isPending}
                onClick={() => {
                  if (confirmacaoRegra) excluirRegra.mutate({ id: confirmacaoRegra.id });
                }}
              >
                Excluir
              </Botao>
            </div>
          }
        >
          <p className="text-sm text-fg">
            {"Deseja excluir a regra " +
              (confirmacaoRegra ? confirmacaoRegra.nome : "") +
              " (" +
              (confirmacaoRegra ? confirmacaoRegra.evento : "") +
              ")?"}
          </p>
          <Alerta tom="info" titulo="Regra global" className="mt-3">
            A regra vale para todo o sistema: a exclusão afeta imediatamente todos os usuários que recebiam esses avisos.
            Se a intenção é apenas pausar, desligue o interruptor da regra em vez de excluí-la.
          </Alerta>
        </Modal>
      )}

      <div className="flex items-center gap-2 text-2xs text-fg-muted">
        <X className="size-3" aria-hidden />
        Preferências salvas automaticamente no seu usuário sempre que você altera um controle.
      </div>
    </div>
  );
}

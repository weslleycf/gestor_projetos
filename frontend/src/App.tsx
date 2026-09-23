import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout";
import { useAuth } from "@/store/auth";
import { Marca } from "@/components/ui";

/* ==========================================================================
   Code-splitting por rota — cada página é carregada sob demanda.
   ========================================================================== */

const Login = lazy(() => import("@/pages/Login"));
const DashboardExecutivo = lazy(() => import("@/pages/DashboardExecutivo"));
const MeuPainel = lazy(() => import("@/pages/MeuPainel"));
const TimelinePortfolio = lazy(() => import("@/pages/TimelinePortfolio"));

const Projetos = lazy(() => import("@/pages/Projetos"));
const ProjetoNovo = lazy(() => import("@/pages/ProjetoNovo"));
const ProjetoDetalhe = lazy(() => import("@/pages/ProjetoDetalhe"));
const Programas = lazy(() => import("@/pages/Programas"));
const Portfolios = lazy(() => import("@/pages/Portfolios"));
const Marcos = lazy(() => import("@/pages/Marcos"));

const MinhasTarefas = lazy(() => import("@/pages/MinhasTarefas"));
const Kanban = lazy(() => import("@/pages/Kanban"));
const Calendario = lazy(() => import("@/pages/Calendario"));
const Timesheet = lazy(() => import("@/pages/Timesheet"));
const Colaboracao = lazy(() => import("@/pages/Colaboracao"));

const Alocacao = lazy(() => import("@/pages/Alocacao"));
const Matching = lazy(() => import("@/pages/Matching"));
const Recursos = lazy(() => import("@/pages/Recursos"));
const Capacidade = lazy(() => import("@/pages/Capacidade"));
const CapacidadePessoa = lazy(() => import("@/pages/CapacidadePessoa"));

const Financeiro = lazy(() => import("@/pages/Financeiro"));
const Lancamentos = lazy(() => import("@/pages/Lancamentos"));
const EVM = lazy(() => import("@/pages/EVM"));

const Riscos = lazy(() => import("@/pages/Riscos"));
const Issues = lazy(() => import("@/pages/Issues"));

const Capacidades = lazy(() => import("@/pages/Capacidades"));
const SkillDetalhe = lazy(() => import("@/pages/SkillDetalhe"));
const MatrizSkills = lazy(() => import("@/pages/MatrizSkills"));
const GapAnalysis = lazy(() => import("@/pages/GapAnalysis"));
const BusFactor = lazy(() => import("@/pages/BusFactor"));
const Pessoas = lazy(() => import("@/pages/Pessoas"));
const PessoaDetalhe = lazy(() => import("@/pages/PessoaDetalhe"));
const PDI = lazy(() => import("@/pages/PDI"));
const Validacoes = lazy(() => import("@/pages/Validacoes"));
const Oportunidades = lazy(() => import("@/pages/Oportunidades"));
const Sucessao = lazy(() => import("@/pages/Sucessao"));

const Relatorios = lazy(() => import("@/pages/Relatorios"));
const Integracoes = lazy(() => import("@/pages/Integracoes"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const AuditoriaVies = lazy(() => import("@/pages/AuditoriaVies"));
const Temas = lazy(() => import("@/pages/Temas"));
const Ajuda = lazy(() => import("@/pages/Ajuda"));
const Assistente = lazy(() => import("@/pages/Assistente"));
const Manual = lazy(() => import("@/pages/Manual"));
const Preferencias = lazy(() => import("@/pages/Preferencias"));
const AdminUsuarios = lazy(() => import("@/pages/admin/Usuarios"));
const AdminWorkflows = lazy(() => import("@/pages/admin/Workflows"));
const AdminCampos = lazy(() => import("@/pages/admin/Campos"));
const AdminAuditoria = lazy(() => import("@/pages/admin/Auditoria"));

function TelaCarregamento({ rotulo = "Carregando..." }: { rotulo?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      <p className="text-sm text-fg-muted">{rotulo}</p>
    </div>
  );
}

function TelaSessao() {
  return (
    <div className="grid h-full w-full place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <Marca />
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Carregando sua sessão...
        </div>
      </div>
    </div>
  );
}

function RotaProtegida({ children, permissao }: { children: ReactNode; permissao?: string | string[] }) {
  const { usuario, carregando, pode } = useAuth();
  const local = useLocation();

  if (carregando) return <TelaSessao />;
  if (!usuario) return <Navigate to="/login" state={{ de: local.pathname }} replace />;

  if (permissao) {
    const lista = Array.isArray(permissao) ? permissao : [permissao];
    if (!lista.some((p) => pode(p))) {
      return (
        <AppShell>
          <div className="mx-auto max-w-lg rounded-sgp-lg border border-border bg-surface p-8 text-center shadow-n1">
            <p className="text-lg font-bold text-fg">Acesso restrito</p>
            <p className="mt-2 text-sm text-fg-muted">
              Seu perfil não possui permissão para acessar este módulo. Procure o administrador do SGP ou o PMO.
            </p>
          </div>
        </AppShell>
      );
    }
  }

  return (
    <AppShell>
      <Suspense fallback={<TelaCarregamento rotulo="Carregando módulo..." />}>{children}</Suspense>
    </AppShell>
  );
}

export default function App() {
  const { carregarSessao, usuario } = useAuth();

  useEffect(() => {
    carregarSessao();
  }, [carregarSessao]);

  return (
    <Suspense fallback={<TelaSessao />}>
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />

        <Route path="/" element={<RotaProtegida permissao="dashboard.ver"><DashboardExecutivo /></RotaProtegida>} />
        <Route path="/meu-painel" element={<RotaProtegida><MeuPainel /></RotaProtegida>} />
        <Route path="/timeline" element={<RotaProtegida permissao="projeto.ver"><TimelinePortfolio /></RotaProtegida>} />
        <Route path="/analytics" element={<RotaProtegida permissao="dashboard.ver"><Analytics /></RotaProtegida>} />

        <Route path="/projetos" element={<RotaProtegida permissao="projeto.ver"><Projetos /></RotaProtegida>} />
        <Route path="/projetos/novo" element={<RotaProtegida permissao="projeto.editar"><ProjetoNovo /></RotaProtegida>} />
        <Route path="/projetos/:id" element={<RotaProtegida permissao="projeto.ver"><ProjetoDetalhe /></RotaProtegida>} />
        <Route path="/programas" element={<RotaProtegida permissao="programa.ver"><Programas /></RotaProtegida>} />
        <Route path="/portfolios" element={<RotaProtegida permissao="portfolio.ver"><Portfolios /></RotaProtegida>} />
        <Route path="/marcos" element={<RotaProtegida permissao="projeto.ver"><Marcos /></RotaProtegida>} />
        <Route path="/relatorios" element={<RotaProtegida permissao="relatorio.ver"><Relatorios /></RotaProtegida>} />

        <Route path="/minhas-tarefas" element={<RotaProtegida><MinhasTarefas /></RotaProtegida>} />
        <Route path="/kanban" element={<RotaProtegida permissao="tarefa.ver"><Kanban /></RotaProtegida>} />
        <Route path="/calendario" element={<RotaProtegida permissao="tarefa.ver"><Calendario /></RotaProtegida>} />
        <Route path="/timesheet" element={<RotaProtegida><Timesheet /></RotaProtegida>} />
        <Route path="/colaboracao" element={<RotaProtegida permissao="projeto.ver"><Colaboracao /></RotaProtegida>} />

        <Route path="/alocacao" element={<RotaProtegida permissao="alocacao.ver"><Alocacao /></RotaProtegida>} />
        <Route path="/matching" element={<RotaProtegida permissao="alocacao.ver"><Matching /></RotaProtegida>} />
        <Route path="/recursos" element={<RotaProtegida permissao="recurso.ver"><Recursos /></RotaProtegida>} />
        <Route path="/capacidade" element={<RotaProtegida permissao="capacidade.ver"><Capacidade /></RotaProtegida>} />
        <Route path="/capacidade/:userId" element={<RotaProtegida permissao="capacidade.ver"><CapacidadePessoa /></RotaProtegida>} />
        <Route path="/auditoria-vies" element={<RotaProtegida permissao="auditoria.ver"><AuditoriaVies /></RotaProtegida>} />

        <Route path="/financeiro" element={<RotaProtegida permissao="financeiro.ver"><Financeiro /></RotaProtegida>} />
        <Route path="/lancamentos" element={<RotaProtegida permissao="financeiro.ver"><Lancamentos /></RotaProtegida>} />
        <Route path="/evm" element={<RotaProtegida permissao="financeiro.ver"><EVM /></RotaProtegida>} />

        <Route path="/riscos" element={<RotaProtegida permissao="risco.ver"><Riscos /></RotaProtegida>} />
        <Route path="/issues" element={<RotaProtegida permissao="risco.ver"><Issues /></RotaProtegida>} />

        <Route path="/capacidades" element={<RotaProtegida permissao="capacidade.ver"><Capacidades /></RotaProtegida>} />
        <Route path="/capacidades/skills/:id" element={<RotaProtegida permissao="capacidade.ver"><SkillDetalhe /></RotaProtegida>} />
        <Route path="/matriz-skills" element={<RotaProtegida permissao="capacidade.ver"><MatrizSkills /></RotaProtegida>} />
        <Route path="/gap" element={<RotaProtegida permissao="capacidade.ver"><GapAnalysis /></RotaProtegida>} />
        <Route path="/bus-factor" element={<RotaProtegida permissao="capacidade.ver"><BusFactor /></RotaProtegida>} />
        <Route path="/pessoas" element={<RotaProtegida permissao="capacidade.ver"><Pessoas /></RotaProtegida>} />
        <Route path="/pessoas/:id" element={<RotaProtegida permissao="capacidade.ver"><PessoaDetalhe /></RotaProtegida>} />
        <Route path="/pdi" element={<RotaProtegida><PDI /></RotaProtegida>} />
        <Route path="/validacoes" element={<RotaProtegida permissao="capacidade.validar"><Validacoes /></RotaProtegida>} />
        <Route path="/oportunidades" element={<RotaProtegida permissao="capacidade.ver"><Oportunidades /></RotaProtegida>} />
        <Route path="/sucessao" element={<RotaProtegida permissao="capacidade.ver"><Sucessao /></RotaProtegida>} />

        <Route path="/temas" element={<RotaProtegida><Temas /></RotaProtegida>} />
        <Route path="/ajuda" element={<RotaProtegida><Ajuda /></RotaProtegida>} />
        <Route path="/ajuda/manual/:arquivo" element={<RotaProtegida><Manual /></RotaProtegida>} />
        <Route path="/assistente" element={<RotaProtegida><Assistente /></RotaProtegida>} />
        <Route path="/preferencias" element={<RotaProtegida><Preferencias /></RotaProtegida>} />
        <Route path="/admin/usuarios" element={<RotaProtegida permissao="admin.ver"><AdminUsuarios /></RotaProtegida>} />
        <Route path="/admin/workflows" element={<RotaProtegida permissao="workflow.editar"><AdminWorkflows /></RotaProtegida>} />
        <Route path="/admin/campos" element={<RotaProtegida permissao="admin.ver"><AdminCampos /></RotaProtegida>} />
        <Route path="/integracoes" element={<RotaProtegida permissao="dashboard.ver"><Integracoes /></RotaProtegida>} />
        <Route path="/admin/auditoria" element={<RotaProtegida permissao="auditoria.ver"><AdminAuditoria /></RotaProtegida>} />

        <Route
          path="*"
          element={
            <RotaProtegida>
              <div className="mx-auto max-w-lg rounded-sgp-lg border border-border bg-surface p-10 text-center shadow-n1">
                <p className="text-3xl font-black text-brand">404</p>
                <p className="mt-2 text-lg font-bold text-fg">Página não encontrada</p>
                <p className="mt-2 text-sm text-fg-muted">O endereço acessado não existe no SGP.</p>
              </div>
            </RotaProtegida>
          }
        />
      </Routes>
    </Suspense>
  );
}

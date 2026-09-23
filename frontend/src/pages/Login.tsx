import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, Check, Eye, EyeOff, Gauge, Grid3x3, Layers, LineChart,
  Loader2, Lock, Mail, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { mensagemErro } from "@/lib/api";
import { Alerta, Botao, Campo, Entrada, Marca, Segmentado } from "@/components/ui";
import { cn } from "@/lib/utils";

const DESTAQUES = [
  { icone: Layers, titulo: "Portfólio visual", descricao: "Gantt, Kanban, timeline e calendário como cidadãos de primeira classe." },
  { icone: Sparkles, titulo: "Capacidades e talentos", descricao: "Matriz de skills, gap analysis, PDI e evolução por XP." },
  { icone: Users, titulo: "Alocação inteligente", descricao: "Motor de matching explicável com modos de performance e desenvolvimento." },
  { icone: LineChart, titulo: "Governança e EVM", descricao: "Curva S, riscos, financeiro e auditoria imutável." },
];

const CONTAS_DEMO = [
  { email: "admin@empresa.com.br", rotulo: "Administrador", perfil: "Acesso total" },
  { email: "helena.marques@empresa.com.br", rotulo: "Executiva", perfil: "Dashboards e portfólio" },
  { email: "bruno.carvalho@empresa.com.br", rotulo: "Gerente de Projetos", perfil: "Execução e alocação" },
  { email: "ana.cunha@empresa.com.br", rotulo: "Membro de Equipe", perfil: "Tarefas e PDI" },
];

export default function Login() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState("admin@empresa.com.br");
  const [senha, setSenha] = useState("sgp123456");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState<"entrar" | "contas">("entrar");
  const [manterSessao, setManterSessao] = useState(true);

  const destino = (local.state as { de?: string } | null)?.de || "/";

  const submeter = async (evento: FormEvent) => {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await entrar(email.trim(), senha, manterSessao);
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  };

  const entrarComo = async (conta: string) => {
    setErro("");
    setCarregando(true);
    setEmail(conta);
    setSenha("sgp123456");
    try {
      await entrar(conta, "sgp123456", manterSessao);
      navegar(destino, { replace: true });
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,.45) 0, transparent 45%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.3) 0, transparent 40%)",
          }}
          aria-hidden
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-sgp-lg bg-white/20 backdrop-blur">
              <Check className="size-5" strokeWidth={3} aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight">SGP</span>
              <span className="block text-2xs font-medium uppercase tracking-wider text-white/75">
                Gestão de Projetos, Portfólio e Capacidades
              </span>
            </span>
          </span>
        </div>

        <div className="relative max-w-lg space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
              Se não é visual, não é intuitivo.
              <br />
              Se não é intuitivo, não é adotado.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/80">
              Um sistema visual e em tempo real para acompanhar a execução dos projetos, alocar pessoas com base em
              habilidades e desenvolver continuamente as capacidades da organização.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {DESTAQUES.map((d) => (
              <li key={d.titulo} className="rounded-sgp-lg border border-white/20 bg-white/10 p-3.5 backdrop-blur">
                <d.icone className="size-4.5" aria-hidden />
                <p className="mt-2 text-xs font-bold">{d.titulo}</p>
                <p className="mt-0.5 text-2xs leading-relaxed text-white/75">{d.descricao}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-1.5 text-2xs text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden /> RBAC com escopos
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="size-3.5" aria-hidden /> KPIs em tempo real
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Grid3x3 className="size-3.5" aria-hidden /> Heatmaps e matrizes
          </span>
        </div>
      </section>

      <section className="flex flex-col justify-center bg-bg px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Marca />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-fg">Acessar o SGP</h2>
          <p className="mt-1 text-xs text-fg-muted">
            Entre com suas credenciais corporativas. O acesso é controlado por perfil e escopo.
          </p>

          <div className="mt-5">
            <Segmentado<"entrar" | "contas">
              valor={aba}
              onChange={setAba}
              className="w-full"
              opcoes={[
                { valor: "entrar", rotulo: "Entrar", icone: Lock },
                { valor: "contas", rotulo: "Contas de demonstração", icone: Users },
              ]}
            />
          </div>

          {erro && (
            <Alerta tom="danger" titulo="Não foi possível entrar" icone={AlertTriangle} className="mt-4">
              {erro}
            </Alerta>
          )}

          {aba === "entrar" ? (
            <form onSubmit={submeter} className="mt-5 space-y-4">
              <Campo rotulo="E-mail corporativo" obrigatorio htmlFor="email">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                  <Entrada
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    className="pl-9"
                  />
                </div>
              </Campo>

              <Campo rotulo="Senha" obrigatorio htmlFor="senha">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
                  <Entrada
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fg-subtle hover:bg-surface-2 hover:text-fg"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              </Campo>

              <label className="flex items-start gap-2 text-xs text-fg-muted">
                <input
                  type="checkbox"
                  checked={manterSessao}
                  onChange={(e) => setManterSessao(e.target.checked)}
                  className="mt-0.5 size-3.5 rounded border-border-strong accent-[var(--sgp-brand)]"
                />
                <span>
                  Manter sessão ativa neste dispositivo
                  <span className="mt-0.5 block text-2xs text-fg-subtle">
                    {manterSessao
                      ? "Você continuará conectado ao reabrir o navegador."
                      : "A sessão será encerrada ao fechar esta aba."}
                  </span>
                </span>
              </label>

              <Botao type="submit" variante="primario" tamanho="lg" larguraTotal carregando={carregando} iconeDireita={ArrowRight}>
                Entrar no SGP
              </Botao>
            </form>
          ) : (
            <div className="mt-5 space-y-2">
              {CONTAS_DEMO.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  disabled={carregando}
                  onClick={() => entrarComo(c.email)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-sgp-lg border border-border bg-surface p-3 text-left shadow-n1 transition-all",
                    "hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-n2 disabled:opacity-60"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-fg">{c.rotulo}</span>
                    <span className="block truncate text-2xs text-fg-muted">{c.email}</span>
                    <span className="mt-0.5 block text-2xs text-fg-subtle">{c.perfil}</span>
                  </span>
                  {carregando && email === c.email ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-brand" aria-hidden />
                  ) : (
                    <ArrowRight className="size-4 shrink-0 text-brand" aria-hidden />
                  )}
                </button>
              ))}
              <p className="pt-1 text-2xs leading-relaxed text-fg-subtle">
                Senha padrão das contas de demonstração: <code className="rounded bg-surface-3 px-1 py-0.5 font-mono">sgp123456</code>.
                Em produção, o acesso deve ocorrer por SSO (SAML/OAuth2) com MFA obrigatório para perfis administrativos.
              </p>
            </div>
          )}

          <p className="mt-8 text-2xs leading-relaxed text-fg-subtle">
            Ao entrar você concorda com as políticas de uso e privacidade. Os dados de capacidades são tratados conforme
            a LGPD (RNF-10) e todas as ações relevantes ficam registradas em trilha de auditoria imutável.
          </p>
        </div>
      </section>
    </div>
  );
}

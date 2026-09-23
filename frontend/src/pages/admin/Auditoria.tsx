import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  GitCompare,
  History,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  ScrollText,
  ShieldAlert,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  Avatar,
  BarraFerramentas,
  Botao,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  Entrada,
  EntradaBusca,
  Esqueleto,
  Etiqueta,
  FiltrosAtivos,
  Modal,
  PainelLateral,
  SecaoColapsavel,
  Selecao,
  Tabela,
  Vazio,
  useAvisos,
  type ColunaTabela,
  type Tom,
} from "@/components/ui";
import { LinhaKPI } from "@/components/layout";
import { GraficoBarras, GraficoDonut, type BarraItem, type FatiaDonut } from "@/components/charts";
import { useConsulta, useLista, CHAVES } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";
import { dataHora, dataRelativa, numero } from "@/lib/format";
import type { UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Tipos locais (RNF-16 / §10.5)
   ========================================================================== */

interface RegistroAuditoria {
  id: number;
  user: number | null;
  user_nome: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  valores_anteriores: Record<string, unknown>;
  valores_novos: Record<string, unknown>;
  justificativa: string;
  ip: string | null;
  user_agent: string;
  timestamp: string;
}

interface RespostaPaginada<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ResumoAuditoria {
  por_acao: Array<{ acao: string; total: number }>;
  por_entidade: Array<{ entidade: string; total: number }>;
  por_usuario: Array<{ user_nome: string; total: number }>;
}

interface Diferenca {
  chave: string;
  antes: string;
  depois: string;
  situacao: "adicionado" | "removido" | "alterado" | "igual";
}

/* ==========================================================================
   Catálogos visuais
   ========================================================================== */

const ACOES: Array<{ valor: string; rotulo: string; cor: string; tom: Tom; icone: LucideIcon }> = [
  { valor: "CRIAR", rotulo: "Criação", cor: "#059669", tom: "success", icone: Plus },
  { valor: "ATUALIZAR", rotulo: "Atualização", cor: "#2563EB", tom: "brand", icone: Pencil },
  { valor: "EXCLUIR", rotulo: "Exclusão", cor: "#DC2626", tom: "danger", icone: Trash2 },
  { valor: "LOGIN", rotulo: "Login", cor: "#0891B2", tom: "info", icone: LogIn },
  { valor: "LOGOUT", rotulo: "Logout", cor: "#64748B", tom: "neutral", icone: LogOut },
  { valor: "EXPORTAR", rotulo: "Exportação", cor: "#8B5CF6", tom: "brand", icone: Download },
  { valor: "APROVAR", rotulo: "Aprovação", cor: "#10B981", tom: "success", icone: Check },
  { valor: "ALOCAR", rotulo: "Alocação", cor: "#F59E0B", tom: "warning", icone: Users },
  { valor: "VALIDAR", rotulo: "Validação", cor: "#7C3AED", tom: "brand", icone: BadgeCheck },
];

const PALETA = ["#2563EB", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#06B6D4", "#6366F1", "#84CC16"];

function infoAcao(acao: string) {
  return (
    ACOES.find((a) => a.valor === acao) || { valor: acao, rotulo: acao, cor: "#64748B", tom: "neutral" as Tom, icone: History }
  );
}

function valorLegivel(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "sim" : "não";
  if (typeof valor === "object") {
    try {
      return JSON.stringify(valor);
    } catch {
      return "valor não serializável";
    }
  }
  return String(valor);
}

function compararValores(antes: Record<string, unknown>, depois: Record<string, unknown>): Diferenca[] {
  const anteriores = antes || {};
  const novos = depois || {};
  const chaves = Array.from(new Set(Object.keys(anteriores).concat(Object.keys(novos)))).sort();
  return chaves.map((chave) => {
    const temAntes = Object.prototype.hasOwnProperty.call(anteriores, chave);
    const temDepois = Object.prototype.hasOwnProperty.call(novos, chave);
    const textoAntes = temAntes ? valorLegivel(anteriores[chave]) : "—";
    const textoDepois = temDepois ? valorLegivel(novos[chave]) : "—";
    let situacao: Diferenca["situacao"] = "igual";
    if (!temAntes && temDepois) situacao = "adicionado";
    else if (temAntes && !temDepois) situacao = "removido";
    else if (textoAntes !== textoDepois) situacao = "alterado";
    return { chave, antes: textoAntes, depois: textoDepois, situacao };
  });
}

function celulaCsv(valor: string): string {
  return '"' + String(valor === null || valor === undefined ? "" : valor).replace(/"/g, '""') + '"';
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function AdminAuditoria() {
  const { sucesso, erro } = useAvisos();

  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [filtroEntidade, setFiltroEntidade] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [selecionado, setSelecionado] = useState<RegistroAuditoria | null>(null);
  const [exportando, setExportando] = useState(false);
  const [avisoAberto, setAvisoAberto] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTermo(busca.trim()), 350);
    return () => clearTimeout(timer);
  }, [busca]);

  useEffect(() => {
    setPagina(1);
  }, [termo, filtroEntidade, filtroAcao, filtroUsuario]);

  const parametros = useMemo(() => {
    const params: Record<string, unknown> = { page: pagina };
    if (filtroEntidade) params.entidade = filtroEntidade;
    if (filtroAcao) params.acao = filtroAcao;
    if (filtroUsuario) params.user = filtroUsuario;
    if (termo) params.search = termo;
    return params;
  }, [pagina, filtroEntidade, filtroAcao, filtroUsuario, termo]);

  const registros = useConsulta<RespostaPaginada<RegistroAuditoria>>(CHAVES.auditoria, "/auditoria/", parametros);
  const resumo = useConsulta<ResumoAuditoria>(["auditoria", "resumo"], "/auditoria/resumo/", parametros);
  const pessoas = useLista<UsuarioResumo>(["usuarios", "resumo"], "/usuarios/resumo/");

  const lista = registros.data ? registros.data.results : [];
  const total = registros.data ? registros.data.count : 0;
  const totalPaginas = Math.max(1, Math.ceil(total / 50));
  const dadosResumo = resumo.data;

  const entidadesDisponiveis = useMemo(() => {
    const valores = new Set<string>();
    (dadosResumo ? dadosResumo.por_entidade : []).forEach((e) => valores.add(e.entidade));
    lista.forEach((r) => valores.add(r.entidade));
    return Array.from(valores).sort();
  }, [dadosResumo, lista]);

  /* ------------------------------------------------------------- gráficos */

  const fatiasAcao: FatiaDonut[] = (dadosResumo ? dadosResumo.por_acao : []).map((a, i) => {
    const info = infoAcao(a.acao);
    return { rotulo: info.rotulo, valor: a.total, cor: info.cor || PALETA[i % PALETA.length] };
  });

  const fatiasEntidade: FatiaDonut[] = (dadosResumo ? dadosResumo.por_entidade : [])
    .slice(0, 8)
    .map((e, i) => ({ rotulo: e.entidade, valor: e.total, cor: PALETA[i % PALETA.length] }));

  const barrasUsuario: BarraItem[] = (dadosResumo ? dadosResumo.por_usuario : [])
    .slice(0, 8)
    .map((u, i) => ({ rotulo: u.user_nome || "sistema", valor: u.total, cor: PALETA[i % PALETA.length] }));

  const kpis = useMemo(() => {
    const criacoes = (dadosResumo ? dadosResumo.por_acao : []).find((a) => a.acao === "CRIAR");
    const exclusoes = (dadosResumo ? dadosResumo.por_acao : []).find((a) => a.acao === "EXCLUIR");
    const acessos = (dadosResumo ? dadosResumo.por_acao : []).find((a) => a.acao === "LOGIN");
    return [
      { rotulo: "Registros no filtro", valor: numero(total), icone: ScrollText, cor: "#2563EB" },
      { rotulo: "Criações", valor: numero(criacoes ? criacoes.total : 0), icone: Plus, cor: "#059669" },
      { rotulo: "Exclusões", valor: numero(exclusoes ? exclusoes.total : 0), icone: Trash2, cor: "#DC2626" },
      { rotulo: "Logins", valor: numero(acessos ? acessos.total : 0), icone: LogIn, cor: "#0891B2" },
      {
        rotulo: "Entidades distintas",
        valor: numero((dadosResumo ? dadosResumo.por_entidade : []).length),
        icone: GitCompare,
        cor: "#8B5CF6",
      },
      {
        rotulo: "Usuários ativos na trilha",
        valor: numero((dadosResumo ? dadosResumo.por_usuario : []).length),
        icone: Users,
        cor: "#F59E0B",
      },
    ];
  }, [dadosResumo, total]);

  /* --------------------------------------------------------------- colunas */

  const colunas: Array<ColunaTabela<RegistroAuditoria>> = [
    {
      chave: "timestamp",
      titulo: "Data/hora",
      largura: "160px",
      ordenavel: true,
      valorOrdenacao: (r) => r.timestamp,
      renderizar: (r) => (
        <div className="min-w-0">
          <p className="text-xs tabular-nums text-fg">{dataHora(r.timestamp)}</p>
          <p className="text-2xs text-fg-subtle">{dataRelativa(r.timestamp)}</p>
        </div>
      ),
    },
    {
      chave: "usuario",
      titulo: "Usuário",
      largura: "200px",
      ordenavel: true,
      valorOrdenacao: (r) => r.user_nome || "",
      renderizar: (r) => (
        <div className="flex items-center gap-2">
          <Avatar nome={r.user_nome || "Sistema"} tamanho="sm" cor="#64748B" />
          <span className="truncate text-xs text-fg">{r.user_nome || "Sistema"}</span>
        </div>
      ),
    },
    {
      chave: "acao",
      titulo: "Ação",
      largura: "130px",
      ordenavel: true,
      valorOrdenacao: (r) => r.acao,
      renderizar: (r) => {
        const info = infoAcao(r.acao);
        return (
          <Etiqueta tom={info.tom} icone={info.icone}>
            {info.rotulo}
          </Etiqueta>
        );
      },
    },
    {
      chave: "entidade",
      titulo: "Entidade",
      largura: "190px",
      ordenavel: true,
      valorOrdenacao: (r) => r.entidade,
      renderizar: (r) => <span className="font-mono text-2xs text-fg-muted">{r.entidade}</span>,
    },
    {
      chave: "entidade_id",
      titulo: "ID",
      largura: "80px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (r) => Number(r.entidade_id) || 0,
      renderizar: (r) => <span className="text-2xs tabular-nums text-fg-muted">{r.entidade_id || "—"}</span>,
    },
    {
      chave: "ip",
      titulo: "IP",
      largura: "130px",
      renderizar: (r) => <span className="font-mono text-2xs text-fg-subtle">{r.ip || "—"}</span>,
    },
    {
      chave: "justificativa",
      titulo: "Justificativa",
      renderizar: (r) => (
        <span className="line-clamp-1 text-xs text-fg-muted" title={r.justificativa}>
          {r.justificativa || "—"}
        </span>
      ),
    },
  ];

  const filtrosAtivos = [
    filtroEntidade
      ? { chave: "entidade", rotulo: "Entidade", valor: filtroEntidade, onRemover: () => setFiltroEntidade("") }
      : null,
    filtroAcao
      ? {
          chave: "acao",
          rotulo: "Ação",
          valor: infoAcao(filtroAcao).rotulo,
          onRemover: () => setFiltroAcao(""),
        }
      : null,
    filtroUsuario
      ? {
          chave: "user",
          rotulo: "Usuário",
          valor: (pessoas.data || []).find((p) => String(p.id) === filtroUsuario)?.nome || filtroUsuario,
          onRemover: () => setFiltroUsuario(""),
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

  /* -------------------------------------------------------------- exportação */

  const exportarCsv = () => {
    setExportando(true);
    const parametrosExportacao: Record<string, unknown> = { page: 1, page_size: 1000 };
    if (filtroEntidade) parametrosExportacao.entidade = filtroEntidade;
    if (filtroAcao) parametrosExportacao.acao = filtroAcao;
    if (filtroUsuario) parametrosExportacao.user = filtroUsuario;
    if (termo) parametrosExportacao.search = termo;

    api
      .get<RespostaPaginada<RegistroAuditoria>>("/auditoria/", parametrosExportacao)
      .then((resposta) => {
        const cabecalho = ["Data/hora", "Usuário", "Ação", "Entidade", "ID", "IP", "Justificativa"].join(";");
        const linhas = resposta.results.map((r) =>
          [
            celulaCsv(dataHora(r.timestamp)),
            celulaCsv(r.user_nome || "Sistema"),
            celulaCsv(infoAcao(r.acao).rotulo),
            celulaCsv(r.entidade),
            celulaCsv(r.entidade_id),
            celulaCsv(r.ip || ""),
            celulaCsv(r.justificativa || ""),
          ].join(";")
        );
        const conteudo = cabecalho + "\n" + linhas.join("\n");
        const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "auditoria-sgp.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        sucesso("Exportação concluída", numero(resposta.results.length) + " registro(s) exportados em CSV.");
      })
      .catch((falha) => erro("Não foi possível exportar", mensagemErro(falha)))
      .then(() => setExportando(false));
  };

  /* --------------------------------------------------------------- detalhe */

  const diferencas = useMemo(
    () => (selecionado ? compararValores(selecionado.valores_anteriores, selecionado.valores_novos) : []),
    [selecionado]
  );
  const alteradas = diferencas.filter((d) => d.situacao !== "igual");

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Trilha de auditoria"
        subtitulo="Registro imutável de quem fez o quê, quando e a partir de qual endereço"
        icone={ScrollText}
        cor="#64748B"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" icone={ShieldAlert} onClick={() => setAvisoAberto(true)}>
              Política de retenção
            </Botao>
            <Botao variante="primario" icone={FileSpreadsheet} carregando={exportando} onClick={exportarCsv}>
              Exportar CSV
            </Botao>
          </div>
        }
      />

      <Alerta tom="warning" titulo="Registros imutáveis e retidos por no mínimo 5 anos" icone={ShieldAlert}>
        A trilha de auditoria é somente leitura: não é possível editar ou excluir lançamentos pela interface. Os dados
        são retidos por no mínimo 5 anos e o acesso é restrito a perfis autorizados, conforme a política de segurança
        da informação.
      </Alerta>

      <LinhaKPI itens={kpis} />

      {resumo.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar o resumo da auditoria">
          {mensagemErro(resumo.error)}
        </Alerta>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 text-sm font-semibold text-fg">Distribuição por ação</h3>
          {resumo.isLoading ? <Esqueleto linhas={4} /> : <GraficoDonut fatias={fatiasAcao} tamanho={150} espessura={20} centroRotulo="eventos" />}
        </div>
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 text-sm font-semibold text-fg">Entidades mais auditadas</h3>
          {resumo.isLoading ? <Esqueleto linhas={4} /> : <GraficoDonut fatias={fatiasEntidade} tamanho={150} espessura={20} centroRotulo="entidades" />}
        </div>
        <div className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
          <h3 className="mb-3 text-sm font-semibold text-fg">Volume por usuário</h3>
          {resumo.isLoading ? (
            <Esqueleto linhas={4} />
          ) : barrasUsuario.length === 0 ? (
            <p className="py-8 text-center text-xs text-fg-muted">Sem dados para exibir.</p>
          ) : (
            <GraficoBarras itens={barrasUsuario} horizontal formatarValor={(v) => numero(v) + " eventos"} />
          )}
        </div>
      </div>

      <BarraFerramentas>
        <EntradaBusca
          valor={busca}
          onChange={setBusca}
          placeholder="Buscar por usuário, entidade ou justificativa..."
          className="w-72"
        />
        <Selecao
          value={filtroEntidade}
          onChange={(e) => setFiltroEntidade(e.target.value)}
          className="h-8 w-52 py-0 text-xs"
          aria-label="Filtrar por entidade"
        >
          <option value="">Todas as entidades</option>
          {entidadesDisponiveis.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Selecao>
        <Selecao
          value={filtroAcao}
          onChange={(e) => setFiltroAcao(e.target.value)}
          className="h-8 w-44 py-0 text-xs"
          aria-label="Filtrar por ação"
        >
          <option value="">Todas as ações</option>
          {ACOES.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.rotulo}
            </option>
          ))}
        </Selecao>
        <Selecao
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          className="h-8 w-52 py-0 text-xs"
          aria-label="Filtrar por usuário"
        >
          <option value="">Todos os usuários</option>
          {(pessoas.data || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Selecao>
        <span className="ml-auto text-2xs text-fg-muted">
          {numero(total) + " registro(s) · página " + numero(pagina) + " de " + numero(totalPaginas)}
        </span>
      </BarraFerramentas>

      <FiltrosAtivos
        filtros={filtrosAtivos}
        onLimpar={() => {
          setFiltroEntidade("");
          setFiltroAcao("");
          setFiltroUsuario("");
          setBusca("");
          setTermo("");
        }}
      />

      {registros.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar a trilha de auditoria">
          {mensagemErro(registros.error)}
        </Alerta>
      )}

      <div className="rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        {registros.isLoading ? (
          <CarregandoBloco rotulo="Carregando registros de auditoria..." />
        ) : (
          <Tabela
            colunas={colunas}
            dados={lista}
            compacta
            aoClicarLinha={(r) => setSelecionado(r)}
            vazio={
              <Vazio
                icone={ScrollText}
                titulo="Nenhum registro encontrado"
                descricao="Ajuste os filtros de entidade, ação, usuário ou busca para localizar eventos."
              />
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-2xs text-fg-muted">
          {"Exibindo " + numero(lista.length) + " de " + numero(total) + " registro(s)"}
        </span>
        <div className="flex items-center gap-2">
          <Botao
            tamanho="sm"
            variante="secundario"
            icone={ChevronLeft}
            disabled={!registros.data || !registros.data.previous}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Botao>
          <span className="text-2xs tabular-nums text-fg-muted">
            {numero(pagina) + " / " + numero(totalPaginas)}
          </span>
          <Botao
            tamanho="sm"
            variante="secundario"
            iconeDireita={ChevronRight}
            disabled={!registros.data || !registros.data.next}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </Botao>
        </div>
      </div>

      <SecaoColapsavel titulo="Como interpretar a trilha" icone={History} abertoInicial={false}>
        <ul className="space-y-1.5 text-xs text-fg-muted">
          <li>1. Cada linha representa uma operação registrada automaticamente pelo backend, com carimbo de data e hora.</li>
          <li>2. Clique em uma linha para abrir o comparativo campo a campo entre os valores anteriores e os novos.</li>
          <li>3. Campos em verde foram adicionados ou alterados; campos em vermelho foram removidos.</li>
          <li>4. A exportação em CSV respeita exatamente os filtros aplicados na tela.</li>
          <li>5. Logins, logouts e exportações também são auditados, garantindo rastreabilidade de acessos.</li>
        </ul>
      </SecaoColapsavel>

      {/* ------------------------------------------------------ painel diff */}

      <PainelLateral
        aberto={selecionado !== null}
        onFechar={() => setSelecionado(null)}
        titulo="Detalhe do registro"
        subtitulo={selecionado ? selecionado.entidade + " · " + (selecionado.entidade_id || "sem id") : ""}
        largura="lg"
        rodape={
          <Botao variante="secundario" onClick={() => setSelecionado(null)}>
            Fechar
          </Botao>
        }
      >
        {selecionado && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const info = infoAcao(selecionado.acao);
                return (
                  <Etiqueta tom={info.tom} icone={info.icone}>
                    {info.rotulo}
                  </Etiqueta>
                );
              })()}
              <Etiqueta tom="neutral" icone={Clock}>
                {dataHora(selecionado.timestamp)}
              </Etiqueta>
              <Etiqueta tom="neutral" icone={Users}>
                {selecionado.user_nome || "Sistema"}
              </Etiqueta>
              {selecionado.ip && <Etiqueta tom="neutral">{selecionado.ip}</Etiqueta>}
            </div>

            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Justificativa</p>
              <p className="mt-1 text-xs text-fg">{selecionado.justificativa || "Não informada."}</p>
              {selecionado.user_agent && (
                <p className="mt-2 break-all text-2xs text-fg-subtle">{selecionado.user_agent}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-fg">Comparativo antes × depois</p>
              <div className="flex items-center gap-2">
                <Etiqueta tom="success">{numero(alteradas.length) + " campo(s) alterado(s)"}</Etiqueta>
                <Etiqueta tom="neutral">{numero(diferencas.length) + " campo(s) no total"}</Etiqueta>
              </div>
            </div>

            {diferencas.length === 0 ? (
              <Vazio
                icone={GitCompare}
                titulo="Sem alterações de campos"
                descricao="Este evento não registrou valores anteriores ou novos (por exemplo, login e logout)."
              />
            ) : (
              <div className="space-y-1.5">
                {diferencas.map((d) => (
                  <div
                    key={d.chave}
                    className={
                      "rounded-sgp border p-2.5 " +
                      (d.situacao === "adicionado"
                        ? "border-success/35 bg-success-soft/25"
                        : d.situacao === "removido"
                        ? "border-danger/35 bg-danger-soft/25"
                        : d.situacao === "alterado"
                        ? "border-warning/35 bg-warning-soft/20"
                        : "border-border bg-surface-2")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-2xs font-semibold text-fg">{d.chave}</span>
                      <Etiqueta tom={d.situacao === "adicionado" ? "success" : d.situacao === "removido" ? "danger" : d.situacao === "alterado" ? "warning" : "neutral"}>
                        {d.situacao}
                      </Etiqueta>
                    </div>
                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-md bg-danger-soft/30 px-2 py-1.5">
                        <p className="text-2xs font-semibold uppercase tracking-wide text-danger">Antes</p>
                        <p className="mt-0.5 break-words text-xs text-fg">{d.antes}</p>
                      </div>
                      <div className="rounded-md bg-success-soft/30 px-2 py-1.5">
                        <p className="text-2xs font-semibold uppercase tracking-wide text-success">Depois</p>
                        <p className="mt-0.5 break-words text-xs text-fg">{d.depois}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <SecaoColapsavel titulo="Payload bruto" icone={GitCompare} abertoInicial={false}>
              <div className="space-y-2">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">valores_anteriores</p>
                  <pre className="mt-1 max-h-56 overflow-auto scroll-thin rounded-sgp bg-surface-3 p-2 font-mono text-2xs text-fg">
                    {JSON.stringify(selecionado.valores_anteriores || {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">valores_novos</p>
                  <pre className="mt-1 max-h-56 overflow-auto scroll-thin rounded-sgp bg-surface-3 p-2 font-mono text-2xs text-fg">
                    {JSON.stringify(selecionado.valores_novos || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </SecaoColapsavel>

            <div className="flex flex-wrap gap-1.5">
              <Chip cor="#2563EB">{"entidade: " + selecionado.entidade}</Chip>
              <Chip cor="#8B5CF6">{"id: " + (selecionado.entidade_id || "—")}</Chip>
              <Chip cor="#64748B">{"registro #" + numero(selecionado.id)}</Chip>
            </div>
          </div>
        )}
      </PainelLateral>

      <Modal
        aberto={avisoAberto}
        onFechar={() => setAvisoAberto(false)}
        titulo="Política de retenção e imutabilidade"
        largura="md"
        rodape={
          <Botao variante="secundario" onClick={() => setAvisoAberto(false)}>
            Entendi
          </Botao>
        }
      >
        <div className="space-y-3">
          <Alerta tom="warning" titulo="Retenção mínima de 5 anos" icone={ShieldAlert}>
            Os registros de auditoria não podem ser alterados nem excluídos pela aplicação e permanecem disponíveis por
            no mínimo 5 anos após a criação.
          </Alerta>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold text-fg">Operações registradas</p>
              <p className="mt-1 text-2xs text-fg-muted">
                Criação, atualização, exclusão, aprovação, alocação, validação, exportação, login e logout.
              </p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold text-fg">Dados capturados</p>
              <p className="mt-1 text-2xs text-fg-muted">
                Autor, data e hora, entidade afetada, identificador, IP, user agent, justificativa e o comparativo de
                valores.
              </p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold text-fg">Acesso</p>
              <p className="mt-1 text-2xs text-fg-muted">
                Restrito à permissão auditoria.ver, concedida a ADMIN, EXECUTIVO, PMO e RH conforme a matriz RBAC.
              </p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold text-fg">Exportação</p>
              <p className="mt-1 text-2xs text-fg-muted">
                Toda exportação também gera um evento de auditoria com o autor e os filtros utilizados.
              </p>
            </div>
          </div>
          <Campo rotulo="Escopo atual dos filtros">
            <Entrada readOnly value={JSON.stringify(parametros)} />
          </Campo>
        </div>
      </Modal>
    </div>
  );
}

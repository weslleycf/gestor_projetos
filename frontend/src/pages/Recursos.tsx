/* ==========================================================================
   Cadastro de recursos materiais em cards visuais — RF-13
   Agrupamento por tipo, filtros, donut por tipo, CRUD em painel lateral
   e alocações de cada recurso.
   ========================================================================== */
import { useMemo, useState } from "react";
import {
  Boxes,
  Building2,
  Car,
  CalendarDays,
  CheckCircle2,
  Cpu,
  FlaskConical,
  Handshake,
  HardDrive,
  Layers,
  MapPin,
  Monitor,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  Alerta,
  AreaTexto,
  BarraFerramentas,
  BarraProgresso,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Cartao,
  Chip,
  Entrada,
  EntradaBusca,
  Esqueleto,
  Etiqueta,
  FiltrosAtivos,
  Modal,
  PainelLateral,
  Selecao,
  Vazio,
  useAvisos,
} from "@/components/ui";
import { EscalaCores, GraficoDonut } from "@/components/charts";
import { GradeCards, LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { agrupar, cn, media, soma } from "@/lib/utils";
import { dataCurta, moeda, numero, percentual } from "@/lib/format";
import type { Alocacao, Recurso } from "@/lib/types";

/* ==========================================================================
   Tipos e metadados
   ========================================================================== */

interface RespostaCardsRecursos {
  recursos: Recurso[];
  por_tipo: Array<{ tipo: string; total: number }>;
  total: number;
}

interface DefTipo {
  valor: string;
  rotulo: string;
  cor: string;
  icone: LucideIcon;
}

const TIPOS: DefTipo[] = [
  { valor: "HUMANO", rotulo: "Humano", cor: "#2563EB", icone: Users },
  { valor: "EQUIPAMENTO", rotulo: "Equipamento", cor: "#F59E0B", icone: Wrench },
  { valor: "SOFTWARE", rotulo: "Software / Licença", cor: "#8B5CF6", icone: Monitor },
  { valor: "INSTALACAO", rotulo: "Instalação", cor: "#0891B2", icone: Building2 },
  { valor: "SERVICO", rotulo: "Serviço terceirizado", cor: "#EC4899", icone: Handshake },
  { valor: "MATERIAL", rotulo: "Material", cor: "#059669", icone: Package },
];

const ICONES: Record<string, LucideIcon> = {
  boxes: Boxes,
  package: Package,
  wrench: Wrench,
  truck: Truck,
  cpu: Cpu,
  monitor: Monitor,
  "hard-drive": HardDrive,
  "building-2": Building2,
  flask: FlaskConical,
  car: Car,
  users: Users,
  wallet: Wallet,
};

function defTipo(tipo: string): DefTipo {
  return TIPOS.find((t) => t.valor === tipo) ?? { valor: tipo, rotulo: tipo, cor: "#64748B", icone: Boxes };
}

function iconeDe(nome: string, tipo: string): LucideIcon {
  return ICONES[nome] ?? defTipo(tipo).icone;
}

interface FormularioRecurso {
  nome: string;
  tipo: string;
  descricao: string;
  codigo: string;
  custo_hora: string;
  custo_unitario: string;
  unidade: string;
  quantidade_disponivel: string;
  disponibilidade_percentual: number;
  data_disponivel_de: string;
  data_disponivel_ate: string;
  fornecedor: string;
  localizacao: string;
  cor: string;
  icone: string;
  ativo: boolean;
}

function formularioVazio(): FormularioRecurso {
  return {
    nome: "",
    tipo: "EQUIPAMENTO",
    descricao: "",
    codigo: "",
    custo_hora: "0",
    custo_unitario: "0",
    unidade: "unidade",
    quantidade_disponivel: "1",
    disponibilidade_percentual: 100,
    data_disponivel_de: "",
    data_disponivel_ate: "",
    fornecedor: "",
    localizacao: "",
    cor: "#EC4899",
    icone: "boxes",
    ativo: true,
  };
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function Recursos() {
  const { erro } = useAvisos();

  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [fornecedorFiltro, setFornecedorFiltro] = useState("");
  const [ativoFiltro, setAtivoFiltro] = useState("");

  const [painel, setPainel] = useState<"novo" | "editar" | null>(null);
  const [form, setForm] = useState<FormularioRecurso>(formularioVazio);
  const [erroForm, setErroForm] = useState("");
  const [recursoEdicao, setRecursoEdicao] = useState<Recurso | null>(null);
  const [excluir, setExcluir] = useState<Recurso | null>(null);
  const [detalhe, setDetalhe] = useState<Recurso | null>(null);

  /* ------------------------------- Consultas ------------------------------ */

  const cards = useConsulta<RespostaCardsRecursos>(CHAVES.recursos, "/recursos/cards/", {
    tipo: tipoFiltro || undefined,
    fornecedor: fornecedorFiltro || undefined,
    ativo: ativoFiltro || undefined,
    search: busca.trim() || undefined,
  });
  const catalogo = useLista<Recurso>(["recursos", "opcoes"], "/recursos/", { page_size: 300 });
  const alocacoes = useLista<Alocacao>(["alocacoes", "recurso"], detalhe ? "/alocacoes/" : null, {
    recurso: detalhe ? detalhe.id : undefined,
    page_size: 200,
  });

  /* ------------------------------- Mutações ------------------------------- */

  const criar = useMutacao<Record<string, unknown>, Recurso>({
    url: "/recursos/",
    invalidar: [CHAVES.recursos, ["recursos", "opcoes"]],
    mensagemSucesso: "Recurso cadastrado",
  });
  const atualizar = useMutacao<Record<string, unknown>, Recurso>({
    metodo: "patch",
    url: (v) => "/recursos/" + String(v.id) + "/",
    invalidar: [CHAVES.recursos, ["recursos", "opcoes"]],
    mensagemSucesso: "Recurso atualizado",
  });
  const remover = useMutacao<number, void>({
    metodo: "delete",
    url: (id) => "/recursos/" + id + "/",
    invalidar: [CHAVES.recursos, ["recursos", "opcoes"]],
    mensagemSucesso: "Recurso removido",
  });

  /* -------------------------------- Derivados ----------------------------- */

  const recursos = cards.data?.recursos ?? [];
  const porTipo = cards.data?.por_tipo ?? [];

  const fornecedores = useMemo(() => {
    const conjunto = new Set<string>();
    (catalogo.data ?? []).forEach((r) => {
      if (r.fornecedor) conjunto.add(r.fornecedor);
    });
    return Array.from(conjunto).sort();
  }, [catalogo.data]);

  const grupos = useMemo(() => {
    const mapa = agrupar(recursos, (r) => r.tipo);
    return TIPOS.filter((t) => (mapa[t.valor] ?? []).length > 0).map((t) => ({
      tipo: t,
      itens: mapa[t.valor] ?? [],
    }));
  }, [recursos]);

  const resumo = useMemo(() => {
    const ativos = recursos.filter((r) => r.ativo);
    const custos = recursos.map((r) => Number(r.custo_hora || 0)).filter((v) => v > 0);
    return {
      total: recursos.length,
      ativos: ativos.length,
      custoMedio: media(custos),
      disponibilidadeMedia: media(recursos.map((r) => r.disponibilidade_percentual)),
      restritos: recursos.filter((r) => r.disponibilidade_percentual < 50).length,
      quantidadeTotal: soma(recursos.map((r) => Number(r.quantidade_disponivel || 0))),
    };
  }, [recursos]);

  const filtrosAtivos = useMemo(() => {
    const itens: Array<{ chave: string; rotulo: string; valor: string; cor?: string; onRemover: () => void }> = [];
    if (tipoFiltro)
      itens.push({
        chave: "tipo",
        rotulo: "Tipo",
        valor: defTipo(tipoFiltro).rotulo,
        cor: defTipo(tipoFiltro).cor,
        onRemover: () => setTipoFiltro(""),
      });
    if (fornecedorFiltro)
      itens.push({
        chave: "fornecedor",
        rotulo: "Fornecedor",
        valor: fornecedorFiltro,
        onRemover: () => setFornecedorFiltro(""),
      });
    if (ativoFiltro)
      itens.push({
        chave: "ativo",
        rotulo: "Situação",
        valor: ativoFiltro === "true" ? "ativos" : "inativos",
        onRemover: () => setAtivoFiltro(""),
      });
    return itens;
  }, [tipoFiltro, fornecedorFiltro, ativoFiltro]);

  /* --------------------------------- Ações -------------------------------- */

  function abrirNovo() {
    setForm(formularioVazio());
    setRecursoEdicao(null);
    setErroForm("");
    setPainel("novo");
  }

  function abrirEdicao(recurso: Recurso) {
    setRecursoEdicao(recurso);
    setForm({
      nome: recurso.nome,
      tipo: recurso.tipo,
      descricao: recurso.descricao || "",
      codigo: recurso.codigo || "",
      custo_hora: String(recurso.custo_hora || "0"),
      custo_unitario: String(recurso.custo_unitario || "0"),
      unidade: recurso.unidade || "unidade",
      quantidade_disponivel: String(recurso.quantidade_disponivel || "1"),
      disponibilidade_percentual: recurso.disponibilidade_percentual,
      data_disponivel_de: (recurso as Recurso & { data_disponivel_de?: string | null }).data_disponivel_de || "",
      data_disponivel_ate: (recurso as Recurso & { data_disponivel_ate?: string | null }).data_disponivel_ate || "",
      fornecedor: recurso.fornecedor || "",
      localizacao: recurso.localizacao || "",
      cor: recurso.cor || "#EC4899",
      icone: recurso.icone || "boxes",
      ativo: recurso.ativo,
    });
    setErroForm("");
    setPainel("editar");
  }

  async function salvar() {
    setErroForm("");
    if (!form.nome.trim()) {
      setErroForm("Informe o nome do recurso.");
      return;
    }
    const corpo: Record<string, unknown> = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      descricao: form.descricao,
      codigo: form.codigo,
      custo_hora: Number(form.custo_hora) || 0,
      custo_unitario: Number(form.custo_unitario) || 0,
      unidade: form.unidade || "unidade",
      quantidade_disponivel: Number(form.quantidade_disponivel) || 0,
      disponibilidade_percentual: form.disponibilidade_percentual,
      data_disponivel_de: form.data_disponivel_de || null,
      data_disponivel_ate: form.data_disponivel_ate || null,
      fornecedor: form.fornecedor,
      localizacao: form.localizacao,
      cor: form.cor,
      icone: form.icone,
      ativo: form.ativo,
    };
    try {
      if (painel === "editar" && recursoEdicao) {
        await atualizar.mutateAsync({ id: recursoEdicao.id, ...corpo });
      } else {
        await criar.mutateAsync(corpo);
      }
      setPainel(null);
    } catch (e) {
      setErroForm(mensagemErro(e));
    }
  }

  /* ---------------------------------- UI ---------------------------------- */

  const IconeFormulario = iconeDe(form.icone, form.tipo);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Recursos materiais"
        subtitulo={
          numero(resumo.total) +
          " recurso(s) cadastrado(s) · " +
          numero(resumo.ativos) +
          " ativo(s) · " +
          numero(resumo.quantidadeTotal, 0) +
          " unidade(s) disponíveis"
        }
        icone={Boxes}
        cor="#EC4899"
        acoes={
          <>
            <Botao
              variante="secundario"
              icone={RefreshCw}
              carregando={cards.isFetching}
              onClick={() => {
                cards.refetch();
                catalogo.refetch();
              }}
            >
              Atualizar
            </Botao>
            <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
              Novo recurso
            </Botao>
          </>
        }
      />

      {cards.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os recursos">
          {mensagemErro(cards.error)}
        </Alerta>
      )}

      <LinhaKPI
        itens={[
          { rotulo: "Recursos", valor: numero(resumo.total), icone: Boxes, cor: "#EC4899", subrotulo: numero(resumo.ativos) + " ativos" },
          { rotulo: "Custo médio/hora", valor: moeda(resumo.custoMedio), icone: Wallet, cor: "#F59E0B", subrotulo: "média dos recursos com custo" },
          { rotulo: "Disponibilidade média", valor: percentual(resumo.disponibilidadeMedia, 0), icone: CheckCircle2, cor: "#059669", subrotulo: "quanto do recurso está livre" },
          { rotulo: "Baixa disponibilidade", valor: numero(resumo.restritos), icone: Layers, cor: "#DC2626", subrotulo: "abaixo de 50% disponível" },
          { rotulo: "Quantidade total", valor: numero(resumo.quantidadeTotal, 1), icone: Package, cor: "#0891B2", subrotulo: "somatório das unidades" },
          { rotulo: "Fornecedores", valor: numero(fornecedores.length), icone: Truck, cor: "#8B5CF6", subrotulo: "parceiros cadastrados" },
        ]}
      />

      <BarraFerramentas>
        <EntradaBusca valor={busca} onChange={setBusca} placeholder="Buscar recurso, código ou fornecedor..." className="w-72" />
        <Selecao value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="h-8 w-48 py-0 text-xs">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </Selecao>
        <Selecao
          value={fornecedorFiltro}
          onChange={(e) => setFornecedorFiltro(e.target.value)}
          className="h-8 w-48 py-0 text-xs"
        >
          <option value="">Todos os fornecedores</option>
          {fornecedores.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </Selecao>
        <Selecao value={ativoFiltro} onChange={(e) => setAtivoFiltro(e.target.value)} className="h-8 w-36 py-0 text-xs">
          <option value="">Todos</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
        </Selecao>
      </BarraFerramentas>

      <FiltrosAtivos
        filtros={filtrosAtivos}
        onLimpar={() => {
          setTipoFiltro("");
          setFornecedorFiltro("");
          setAtivoFiltro("");
        }}
      />

      <GradeCards colunas={3}>
        <Cartao titulo="Recursos por tipo" subtitulo="Distribuição do catálogo" icone={Layers} corIcone="#8B5CF6">
          {cards.isLoading ? (
            <Esqueleto linhas={4} />
          ) : porTipo.length === 0 ? (
            <Vazio icone={Boxes} titulo="Sem recursos para exibir" descricao="Cadastre o primeiro recurso material." />
          ) : (
            <GraficoDonut
              unidade=" recursos"
              centroRotulo="recursos"
              fatias={porTipo.map((p) => ({
                rotulo: defTipo(p.tipo).rotulo,
                valor: p.total,
                cor: defTipo(p.tipo).cor,
              }))}
            />
          )}
        </Cartao>

        <Cartao
          titulo="Ocupação do catálogo"
          subtitulo="Utilização média por tipo de recurso"
          icone={Wrench}
          corIcone="#F59E0B"
        >
          {cards.isLoading ? (
            <Esqueleto linhas={4} />
          ) : recursos.length === 0 ? (
            <Vazio icone={Wrench} titulo="Nada para medir" />
          ) : (
            <div className="space-y-3">
              {TIPOS.filter((t) => (porTipo.find((p) => p.tipo === t.valor)?.total ?? 0) > 0).map((t) => {
                const doTipo = recursos.filter((r) => r.tipo === t.valor);
                const disponibilidade = media(doTipo.map((r) => r.disponibilidade_percentual));
                const utilizacao = Math.max(0, 100 - disponibilidade);
                return (
                  <div key={t.valor}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-fg">
                        <t.icone className="size-3.5" style={{ color: t.cor }} aria-hidden />
                        {t.rotulo}
                      </span>
                      <span className="text-2xs text-fg-muted">
                        {numero(doTipo.length) + " item(ns) · " + percentual(disponibilidade, 0) + " livre"}
                      </span>
                    </div>
                    <BarraProgresso valor={utilizacao} cor={t.cor} altura="sm" />
                  </div>
                );
              })}
              <EscalaCores
                titulo="Utilização"
                rotulos={["0%", "50%", "100%"]}
                cores={["#059669", "#F59E0B", "#DC2626"]}
              />
            </div>
          )}
        </Cartao>

        <Cartao titulo="Alertas de disponibilidade" subtitulo="Recursos com pouca capacidade livre" icone={FlaskConical} corIcone="#DC2626">
          {recursos.filter((r) => r.disponibilidade_percentual < 50).length === 0 ? (
            <Vazio icone={CheckCircle2} titulo="Nenhum recurso restrito" descricao="Todos os recursos têm 50% ou mais de disponibilidade." />
          ) : (
            <div className="space-y-2">
              {recursos
                .filter((r) => r.disponibilidade_percentual < 50)
                .slice(0, 6)
                .map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 p-2">
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-md"
                      style={{ backgroundColor: (r.cor || "#EC4899") + "1f", color: r.cor || "#EC4899" }}
                    >
                      {(() => {
                        const I = iconeDe(r.icone, r.tipo);
                        return <I className="size-4" aria-hidden />;
                      })()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-fg">{r.nome}</p>
                      <p className="truncate text-2xs text-fg-subtle">{r.fornecedor || "Fornecedor não informado"}</p>
                    </div>
                    <Etiqueta tom={r.disponibilidade_percentual < 20 ? "danger" : "warning"}>
                      {percentual(r.disponibilidade_percentual) + " livre"}
                    </Etiqueta>
                  </div>
                ))}
            </div>
          )}
        </Cartao>
      </GradeCards>

      {cards.isLoading ? (
        <CarregandoBloco rotulo="Carregando recursos..." />
      ) : recursos.length === 0 ? (
        <Vazio
          icone={Boxes}
          titulo="Nenhum recurso encontrado"
          descricao="Ajuste os filtros ou cadastre um novo recurso material, serviço ou licença."
          acao={
            <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
              Novo recurso
            </Botao>
          }
        />
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <section key={grupo.tipo.valor} aria-label={"Recursos do tipo " + grupo.tipo.rotulo}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="grid size-7 place-items-center rounded-md"
                  style={{ backgroundColor: grupo.tipo.cor + "1f", color: grupo.tipo.cor }}
                >
                  <grupo.tipo.icone className="size-4" aria-hidden />
                </span>
                <h2 className="text-sm font-semibold text-fg">{grupo.tipo.rotulo}</h2>
                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-2xs font-medium text-fg-muted">
                  {numero(grupo.itens.length)}
                </span>
              </div>
              <GradeCards colunas={4}>
                {grupo.itens.map((recurso) => {
                  const Icone = iconeDe(recurso.icone, recurso.tipo);
                  const utilizacao = Math.max(0, 100 - recurso.disponibilidade_percentual);
                  return (
                    <article
                      key={recurso.id}
                      className={cn(
                        "rounded-sgp-lg border bg-surface shadow-n1 transition-all hover:-translate-y-0.5 hover:shadow-n2",
                        recurso.ativo ? "border-border" : "border-border/60 opacity-70"
                      )}
                    >
                      <div className="flex items-start gap-2.5 border-b border-border p-3">
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-sgp"
                          style={{ backgroundColor: (recurso.cor || "#EC4899") + "1f", color: recurso.cor || "#EC4899" }}
                        >
                          <Icone className="size-4.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fg" title={recurso.nome}>
                            {recurso.nome}
                          </p>
                          <p className="truncate text-2xs text-fg-muted">
                            {recurso.fornecedor || "Fornecedor não informado"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <BotaoIcone
                            icone={Layers}
                            rotulo={"Ver alocações de " + recurso.nome}
                            tamanho="xs"
                            onClick={() => setDetalhe(recurso)}
                          />
                          <BotaoIcone
                            icone={Pencil}
                            rotulo={"Editar " + recurso.nome}
                            tamanho="xs"
                            onClick={() => abrirEdicao(recurso)}
                          />
                          <BotaoIcone
                            icone={Trash2}
                            rotulo={"Excluir " + recurso.nome}
                            variante="perigo"
                            tamanho="xs"
                            onClick={() => setExcluir(recurso)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Etiqueta cor={defTipo(recurso.tipo).cor}>{defTipo(recurso.tipo).rotulo}</Etiqueta>
                          {recurso.codigo && <Etiqueta tom="neutral">{recurso.codigo}</Etiqueta>}
                          <Etiqueta tom={recurso.ativo ? "success" : "neutral"}>
                            {recurso.ativo ? "ativo" : "inativo"}
                          </Etiqueta>
                        </div>

                        {recurso.descricao && (
                          <p className="line-clamp-2 text-2xs text-fg-muted" title={recurso.descricao}>
                            {recurso.descricao}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-2xs">
                          <div>
                            <p className="text-fg-subtle">Custo/hora</p>
                            <p className="font-semibold tabular-nums text-fg">{moeda(recurso.custo_hora)}</p>
                          </div>
                          <div>
                            <p className="text-fg-subtle">Custo unitário</p>
                            <p className="font-semibold tabular-nums text-fg">{moeda(recurso.custo_unitario)}</p>
                          </div>
                          <div>
                            <p className="text-fg-subtle">Quantidade</p>
                            <p className="font-semibold tabular-nums text-fg">
                              {numero(recurso.quantidade_disponivel, 2) + " " + (recurso.unidade || "un")}
                            </p>
                          </div>
                          <div>
                            <p className="text-fg-subtle">Disponibilidade</p>
                            <p className="font-semibold tabular-nums" style={{ color: disponibilidadeCor(recurso.disponibilidade_percentual) }}>
                              {percentual(recurso.disponibilidade_percentual)}
                            </p>
                          </div>
                        </div>

                        <div>
                          <BarraProgresso
                            valor={utilizacao}
                            cor={disponibilidadeCor(recurso.disponibilidade_percentual)}
                            altura="sm"
                            rotulo={"Utilização · " + percentual(utilizacao, 0)}
                            mostrarValor
                          />
                        </div>

                        <p className="flex items-center gap-1.5 text-2xs text-fg-subtle">
                          <MapPin className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{recurso.localizacao || "Localização não informada"}</span>
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                          {(recurso as Recurso & { data_disponivel_de?: string | null }).data_disponivel_de && (
                            <Chip cor="#0891B2" icone={CalendarDays}>
                              {"de " + dataCurta((recurso as Recurso & { data_disponivel_de?: string | null }).data_disponivel_de)}
                            </Chip>
                          )}
                          {(recurso as Recurso & { data_disponivel_ate?: string | null }).data_disponivel_ate && (
                            <Chip cor="#0891B2" icone={CalendarDays}>
                              {"até " + dataCurta((recurso as Recurso & { data_disponivel_ate?: string | null }).data_disponivel_ate)}
                            </Chip>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </GradeCards>
            </section>
          ))}
        </div>
      )}

      <PainelLateral
        aberto={painel !== null}
        onFechar={() => setPainel(null)}
        largura="md"
        titulo={painel === "editar" ? "Editar recurso" : "Novo recurso"}
        subtitulo={painel === "editar" && recursoEdicao ? recursoEdicao.nome : "Cadastre equipamentos, licenças, serviços e materiais"}
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setPainel(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={CheckCircle2}
              carregando={criar.isPending || atualizar.isPending}
              onClick={salvar}
            >
              {painel === "editar" ? "Salvar alterações" : "Cadastrar recurso"}
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          {erroForm && (
            <Alerta tom="danger" titulo="Não foi possível salvar">
              {erroForm}
            </Alerta>
          )}

          <div className="flex items-center gap-3 rounded-sgp border border-border bg-surface-2 p-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-sgp"
              style={{ backgroundColor: form.cor + "1f", color: form.cor }}
            >
              <IconeFormulario className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{form.nome || "Novo recurso"}</p>
              <p className="truncate text-2xs text-fg-muted">{defTipo(form.tipo).rotulo + " · " + (form.unidade || "unidade")}</p>
            </div>
          </div>

          <Campo rotulo="Nome" obrigatorio htmlFor="recurso-nome">
            <Entrada
              id="recurso-nome"
              value={form.nome}
              placeholder="Ex.: Notebook Dell Latitude 5540"
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Tipo" htmlFor="recurso-tipo">
              <Selecao id="recurso-tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Código / patrimônio" htmlFor="recurso-codigo">
              <Entrada
                id="recurso-codigo"
                value={form.codigo}
                placeholder="PAT-00123"
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              />
            </Campo>
          </div>

          <Campo rotulo="Descrição" htmlFor="recurso-descricao">
            <AreaTexto
              id="recurso-descricao"
              rows={3}
              value={form.descricao}
              placeholder="Especificações, condições de uso e observações."
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Custo por hora (R$)" htmlFor="recurso-custo-hora">
              <Entrada
                id="recurso-custo-hora"
                type="number"
                min={0}
                step="0.01"
                value={form.custo_hora}
                onChange={(e) => setForm((f) => ({ ...f, custo_hora: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Custo unitário (R$)" htmlFor="recurso-custo-unitario">
              <Entrada
                id="recurso-custo-unitario"
                type="number"
                min={0}
                step="0.01"
                value={form.custo_unitario}
                onChange={(e) => setForm((f) => ({ ...f, custo_unitario: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Unidade" dica="Ex.: unidade, licença, m², dia" htmlFor="recurso-unidade">
              <Entrada
                id="recurso-unidade"
                value={form.unidade}
                onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Quantidade disponível" htmlFor="recurso-quantidade">
              <Entrada
                id="recurso-quantidade"
                type="number"
                min={0}
                step="0.01"
                value={form.quantidade_disponivel}
                onChange={(e) => setForm((f) => ({ ...f, quantidade_disponivel: e.target.value }))}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Disponível de" htmlFor="recurso-de">
              <Entrada
                id="recurso-de"
                type="date"
                value={form.data_disponivel_de}
                onChange={(e) => setForm((f) => ({ ...f, data_disponivel_de: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Disponível até" htmlFor="recurso-ate">
              <Entrada
                id="recurso-ate"
                type="date"
                value={form.data_disponivel_ate}
                onChange={(e) => setForm((f) => ({ ...f, data_disponivel_ate: e.target.value }))}
              />
            </Campo>
          </div>

          <Campo rotulo="Disponibilidade (%)" htmlFor="recurso-disponibilidade">
            <input
              id="recurso-disponibilidade"
              type="range"
              min={0}
              max={100}
              value={form.disponibilidade_percentual}
              onChange={(e) => setForm((f) => ({ ...f, disponibilidade_percentual: Number(e.target.value) }))}
              className="w-full"
              style={{ accentColor: disponibilidadeCor(form.disponibilidade_percentual) }}
            />
          </Campo>
          <p className="-mt-2 text-2xs text-fg-muted">
            {"Capacidade livre informada pelo fornecedor: " + percentual(form.disponibilidade_percentual)}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Fornecedor" htmlFor="recurso-fornecedor">
              <Entrada
                id="recurso-fornecedor"
                value={form.fornecedor}
                placeholder="Ex.: Dell Brasil"
                onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))}
              />
            </Campo>
            <Campo rotulo="Localização" htmlFor="recurso-localizacao">
              <Entrada
                id="recurso-localizacao"
                value={form.localizacao}
                placeholder="Ex.: São Paulo · SP"
                onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Cor de identificação" htmlFor="recurso-cor">
              <div className="flex items-center gap-2">
                <input
                  id="recurso-cor"
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))}
                  className="h-9 w-14 cursor-pointer rounded-sgp border border-border-strong bg-surface"
                  aria-label="Cor do recurso"
                />
                <Entrada value={form.cor} onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))} />
              </div>
            </Campo>
            <Campo rotulo="Ícone" htmlFor="recurso-icone">
              <Selecao id="recurso-icone" value={form.icone} onChange={(e) => setForm((f) => ({ ...f, icone: e.target.value }))}>
                {Object.keys(ICONES).map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          </div>

          <Campo rotulo="Situação" htmlFor="recurso-ativo">
            <Selecao
              id="recurso-ativo"
              value={form.ativo ? "true" : "false"}
              onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.value === "true" }))}
            >
              <option value="true">Ativo no catálogo</option>
              <option value="false">Inativo</option>
            </Selecao>
          </Campo>
        </div>
      </PainelLateral>

      <PainelLateral
        aberto={detalhe !== null}
        onFechar={() => setDetalhe(null)}
        largura="lg"
        titulo={detalhe ? detalhe.nome : "Recurso"}
        subtitulo={detalhe ? defTipo(detalhe.tipo).rotulo + " · " + (detalhe.fornecedor || "sem fornecedor") : ""}
        rodape={
          detalhe ? (
            <Botao
              variante="secundario"
              icone={Pencil}
              onClick={() => {
                const alvo = detalhe;
                setDetalhe(null);
                abrirEdicao(alvo);
              }}
            >
              Editar recurso
            </Botao>
          ) : null
        }
      >
        {detalhe && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <p className="text-2xs text-fg-subtle">Custo/hora</p>
                <p className="text-sm font-semibold tabular-nums text-fg">{moeda(detalhe.custo_hora)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <p className="text-2xs text-fg-subtle">Quantidade</p>
                <p className="text-sm font-semibold tabular-nums text-fg">
                  {numero(detalhe.quantidade_disponivel, 2) + " " + (detalhe.unidade || "un")}
                </p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <p className="text-2xs text-fg-subtle">Disponibilidade</p>
                <p className="text-sm font-semibold tabular-nums text-fg">{percentual(detalhe.disponibilidade_percentual)}</p>
              </div>
              <div className="rounded-sgp border border-border bg-surface-2 p-2.5">
                <p className="text-2xs text-fg-subtle">Alocações</p>
                <p className="text-sm font-semibold tabular-nums text-fg">{numero((alocacoes.data ?? []).length)}</p>
              </div>
            </div>

            {detalhe.descricao && <p className="text-xs text-fg-muted">{detalhe.descricao}</p>}

            <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Alocações do recurso</p>
            {alocacoes.isLoading ? (
              <Esqueleto linhas={3} />
            ) : (alocacoes.data ?? []).length === 0 ? (
              <Vazio
                icone={Layers}
                titulo="Recurso sem alocações"
                descricao="Nenhum projeto está usando este recurso no momento."
              />
            ) : (
              <div className="space-y-2">
                {(alocacoes.data ?? []).map((a) => (
                  <div key={a.id} className="rounded-sgp border border-border bg-surface-2 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: a.project_cor }} />
                        <span className="truncate text-xs font-medium text-fg">{a.project_nome}</span>
                      </span>
                      <Etiqueta tom="info">{percentual(a.percentual)}</Etiqueta>
                    </div>
                    <p className="mt-1 truncate text-2xs text-fg-subtle">
                      {(a.task_nome || "Sem tarefa") + " · " + dataCurta(a.data_inicio) + " → " + dataCurta(a.data_fim)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Etiqueta tom={a.vigente ? "success" : "neutral"}>{a.status_rotulo || a.status}</Etiqueta>
                      <span className="text-2xs text-fg-subtle">{moeda(a.custo_estimado)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PainelLateral>

      <Modal
        aberto={excluir !== null}
        onFechar={() => setExcluir(null)}
        titulo="Excluir recurso"
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setExcluir(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={remover.isPending}
              onClick={async () => {
                if (!excluir) return;
                try {
                  await remover.mutateAsync(excluir.id);
                  setExcluir(null);
                } catch (e) {
                  erro("Não foi possível excluir", mensagemErro(e));
                }
              }}
            >
              Excluir recurso
            </Botao>
          </>
        }
      >
        {excluir && (
          <div className="space-y-3">
            <p className="text-sm text-fg">
              O recurso <strong>{excluir.nome}</strong> será removido do catálogo.
            </p>
            <Alerta tom="warning" titulo="Alocações vinculadas" icone={Layers}>
              Alocações que usam este recurso também deixam de existir. Prefira marcar como inativo quando houver histórico
              em projetos.
            </Alerta>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Auxiliares
   ========================================================================== */

function disponibilidadeCor(valor: number): string {
  if (valor >= 80) return "#059669";
  if (valor >= 50) return "#0891B2";
  if (valor >= 20) return "#F59E0B";
  return "#DC2626";
}

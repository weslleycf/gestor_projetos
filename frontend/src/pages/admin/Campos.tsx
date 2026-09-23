import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BadgeCheck,
  Braces,
  CalendarDays,
  Check,
  FileCode,
  GripVertical,
  Hash,
  LayoutDashboard,
  ListChecks,
  Lock,
  Pencil,
  Plus,
  Rows3,
  Settings2,
  Table,
  ToggleLeft,
  Trash2,
  Type,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Abas,
  Alerta,
  BarraFerramentas,
  Botao,
  BotaoIcone,
  CabecalhoPagina,
  Campo,
  CarregandoBloco,
  Chip,
  Dica,
  Entrada,
  Etiqueta,
  GradeCards,
  Interruptor,
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
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { numero } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Tipos locais (RF-42)
   ========================================================================== */

interface CampoCustomizado {
  id: number;
  entidade: string;
  nome: string;
  chave: string;
  tipo: string;
  opcoes: string[];
  obrigatorio: boolean;
  valor_padrao: string;
  ajuda: string;
  ordem: number;
  largura: number;
  secao: string;
  ativo: boolean;
}

interface RespostaSchema {
  entidade: string;
  campos: CampoCustomizado[];
  secoes: string[];
}

interface FormCampo {
  entidade: string;
  nome: string;
  chave: string;
  tipo: string;
  opcoes: string[];
  obrigatorio: boolean;
  valor_padrao: string;
  ajuda: string;
  ordem: string;
  largura: string;
  secao: string;
  ativo: boolean;
}

/* ==========================================================================
   Catálogos
   ========================================================================== */

const ENTIDADES = [
  { valor: "portfolio.project", rotulo: "Projeto" },
  { valor: "tasks.task", rotulo: "Tarefa" },
  { valor: "risks.risk", rotulo: "Risco" },
];

const TIPOS: Array<{ valor: string; rotulo: string; icone: LucideIcon; tom: Tom }> = [
  { valor: "TEXTO", rotulo: "Texto", icone: Type, tom: "brand" },
  { valor: "NUMERO", rotulo: "Número", icone: Hash, tom: "info" },
  { valor: "DATA", rotulo: "Data", icone: CalendarDays, tom: "warning" },
  { valor: "SELECAO", rotulo: "Seleção", icone: ListChecks, tom: "success" },
  { valor: "BOOLEANO", rotulo: "Sim/Não", icone: ToggleLeft, tom: "neutral" },
  { valor: "MOEDA", rotulo: "Moeda", icone: Wallet, tom: "success" },
  { valor: "PESSOA", rotulo: "Pessoa", icone: BadgeCheck, tom: "brand" },
];

const LARGURAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const FORM_VAZIO: FormCampo = {
  entidade: "portfolio.project",
  nome: "",
  chave: "",
  tipo: "TEXTO",
  opcoes: [],
  obrigatorio: false,
  valor_padrao: "",
  ajuda: "",
  ordem: "0",
  largura: "6",
  secao: "Geral",
  ativo: true,
};

function infoTipo(tipo: string) {
  return TIPOS.find((t) => t.valor === tipo) || TIPOS[0];
}

function rotuloEntidade(entidade: string) {
  return (ENTIDADES.find((e) => e.valor === entidade) || { rotulo: entidade }).rotulo;
}

/* ==========================================================================
   Pré-visualização de campo (renderiza o input conforme o tipo)
   ========================================================================== */

function PreviewCampo({ campo }: { campo: CampoCustomizado }) {
  if (campo.tipo === "BOLEANO") {
    return <Interruptor ativo={false} onChange={() => undefined} rotulo="Sim" tamanho="sm" />;
  }
  if (campo.tipo === "SELECAO") {
    return (
      <Selecao disabled value="">
        <option value="">Selecione</option>
        {(campo.opcoes || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Selecao>
    );
  }
  if (campo.tipo === "DATA") return <Entrada disabled type="date" />;
  if (campo.tipo === "NUMERO") return <Entrada disabled type="number" placeholder="0" />;
  if (campo.tipo === "MOEDA") return <Entrada disabled placeholder="R$ 0,00" />;
  if (campo.tipo === "PESSOA") return <Entrada disabled placeholder="Selecione uma pessoa" />;
  return <Entrada disabled placeholder={campo.ajuda || "Texto livre"} />;
}

/* ==========================================================================
   Campo sortable do editor visual
   ========================================================================== */

function CampoSortable({
  campo,
  onEditar,
  onRemover,
}: {
  campo: CampoCustomizado;
  onEditar: () => void;
  onRemover: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: "campo-" + campo.id,
  });
  const info = infoTipo(campo.tipo);
  const Icone = info.icone;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: "span " + campo.largura + " / span " + campo.largura,
      }}
      className={cn(
        "rounded-sgp border border-border bg-surface p-2.5 shadow-n1 transition-shadow",
        isDragging && "drag-ghost z-20"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          style={{ touchAction: "none" }}
          aria-label={"Arrastar o campo " + campo.nome}
          className="mt-0.5 cursor-grab rounded-md p-0.5 text-fg-subtle hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <Icone className="size-3.5 shrink-0" style={{ color: "#64748B" }} aria-hidden />
            <span className="truncate text-2xs font-semibold text-fg">{campo.nome}</span>
            {campo.obrigatorio && <span className="text-danger">*</span>}
            {!campo.ativo && <Etiqueta tom="neutral" icone={Lock}>inativo</Etiqueta>}
          </span>
          <span className="mt-0.5 block truncate font-mono text-2xs text-fg-subtle">{campo.chave}</span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <BotaoIcone icone={Pencil} rotulo={"Editar " + campo.nome} tamanho="xs" onClick={onEditar} />
          <BotaoIcone icone={Trash2} rotulo={"Excluir " + campo.nome} tamanho="xs" onClick={onRemover} />
        </div>
      </div>
      <div className="mt-2">
        <PreviewCampo campo={campo} />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-2xs text-fg-subtle">{info.rotulo + " · " + numero(campo.largura) + "/12 col"}</span>
        {campo.ajuda && <span className="truncate text-2xs text-fg-subtle">{campo.ajuda}</span>}
      </div>
    </div>
  );
}

/* ==========================================================================
   Página
   ========================================================================== */

export default function AdminCampos() {
  const { sucesso, erro, alerta } = useAvisos();

  const [aba, setAba] = useState<"campos" | "editor" | "schema">("campos");
  const [entidade, setEntidade] = useState("portfolio.project");
  const [filtroAtivo, setFiltroAtivo] = useState("");

  const parametros = useMemo(() => {
    const params: Record<string, unknown> = { entidade };
    if (filtroAtivo) params.ativo = filtroAtivo;
    return params;
  }, [entidade, filtroAtivo]);

  const campos = useLista<CampoCustomizado>(CHAVES.camposCustomizados, "/campos-customizados/", parametros);
  const lista = useMemo(() => campos.data || [], [campos.data]);

  const [locais, setLocais] = useState<CampoCustomizado[]>([]);
  useEffect(() => {
    setLocais(lista.slice().sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)));
  }, [lista]);

  const schema = useConsulta<RespostaSchema>(
    ["campos-schema", entidade],
    aba === "schema" ? "/campos-customizados/schema/" : null,
    { entidade }
  );

  /* -------------------------------------------------------------- seções */

  const secoes = useMemo(() => {
    const mapa = new Map<string, CampoCustomizado[]>();
    locais.forEach((c) => {
      const chave = c.secao || "Geral";
      const atual = mapa.get(chave) || [];
      atual.push(c);
      mapa.set(chave, atual);
    });
    return Array.from(mapa.entries());
  }, [locais]);

  const totalPorTipo = useMemo(() => {
    const mapa = new Map<string, number>();
    lista.forEach((c) => mapa.set(c.tipo, (mapa.get(c.tipo) || 0) + 1));
    return mapa;
  }, [lista]);

  /* ---------------------------------------------------------- estado do formulário */

  const [painelCampo, setPainelCampo] = useState(false);
  const [campoEmEdicao, setCampoEmEdicao] = useState<CampoCustomizado | null>(null);
  const [form, setForm] = useState<FormCampo>(FORM_VAZIO);
  const [novaOpcao, setNovaOpcao] = useState("");
  const [confirmacao, setConfirmacao] = useState<{ id: number; nome: string } | null>(null);

  /* ----------------------------------------------------------- mutações */

  const salvarCampo = useMutacao<Record<string, unknown>, CampoCustomizado>({
    metodo: campoEmEdicao ? "patch" : "post",
    url: campoEmEdicao ? "/campos-customizados/" + campoEmEdicao.id + "/" : "/campos-customizados/",
    invalidar: [[...CHAVES.camposCustomizados], ["campos-schema", entidade]],
    mensagemSucesso: campoEmEdicao ? "Campo atualizado" : "Campo criado",
    aoSucesso: () => setPainelCampo(false),
  });

  const alternarAtivo = useMutacao<{ id: number; ativo: boolean }, CampoCustomizado>({
    metodo: "patch",
    url: (v) => "/campos-customizados/" + v.id + "/",
    invalidar: [[...CHAVES.camposCustomizados], ["campos-schema", entidade]],
    mensagemSucesso: "Situação do campo atualizada",
  });

  const excluirCampo = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (v) => "/campos-customizados/" + v.id + "/",
    invalidar: [[...CHAVES.camposCustomizados], ["campos-schema", entidade]],
    mensagemSucesso: "Campo excluído",
    aoSucesso: () => {
      setConfirmacao(null);
      setPainelCampo(false);
    },
  });

  const reordenar = useMutacao<{ id: number; ordem: number; secao: string }, CampoCustomizado>({
    metodo: "patch",
    url: (v) => "/campos-customizados/" + v.id + "/",
    invalidar: [[...CHAVES.camposCustomizados], ["campos-schema", entidade]],
  });

  /* ---------------------------------------------------------- formulário */

  const abrirNovo = () => {
    setCampoEmEdicao(null);
    setForm({ ...FORM_VAZIO, entidade, ordem: String(lista.length), secao: secoes.length ? secoes[0][0] : "Geral" });
    setNovaOpcao("");
    setPainelCampo(true);
  };

  const abrirEdicao = (c: CampoCustomizado) => {
    setCampoEmEdicao(c);
    setNovaOpcao("");
    setForm({
      entidade: c.entidade,
      nome: c.nome,
      chave: c.chave,
      tipo: c.tipo,
      opcoes: c.opcoes || [],
      obrigatorio: c.obrigatorio,
      valor_padrao: c.valor_padrao || "",
      ajuda: c.ajuda || "",
      ordem: String(c.ordem),
      largura: String(c.largura),
      secao: c.secao || "Geral",
      ativo: c.ativo,
    });
    setPainelCampo(true);
  };

  const enviar = () => {
    if (!form.nome.trim() || !form.chave.trim()) {
      erro("Informe nome e chave do campo");
      return;
    }
    const corpo: Record<string, unknown> = {
      entidade: form.entidade,
      nome: form.nome.trim(),
      chave: form.chave.trim(),
      tipo: form.tipo,
      opcoes: form.tipo === "SELECAO" ? form.opcoes : [],
      obrigatorio: form.obrigatorio,
      valor_padrao: form.valor_padrao,
      ajuda: form.ajuda,
      ordem: Number(form.ordem) || 0,
      largura: Number(form.largura) || 6,
      secao: form.secao.trim() || "Geral",
      ativo: form.ativo,
    };
    if (campoEmEdicao) corpo.id = campoEmEdicao.id;
    salvarCampo.mutate(corpo);
  };

  const adicionarOpcao = () => {
    const valor = novaOpcao.trim();
    if (!valor) return;
    if (form.opcoes.indexOf(valor) >= 0) {
      alerta("Opção duplicada", "Esta opção já existe na lista.");
      return;
    }
    setForm((f) => ({ ...f, opcoes: f.opcoes.concat([valor]) }));
    setNovaOpcao("");
  };

  /* ---------------------------------------------------- drag and drop */

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const aoSoltar = (evento: DragEndEvent) => {
    const ativoId = String(evento.active.id).replace("campo-", "");
    if (!evento.over) return;
    const alvoId = String(evento.over.id).replace("campo-", "");
    if (ativoId === alvoId) return;
    const origem = locais.find((c) => c.id === Number(ativoId));
    const destino = locais.find((c) => c.id === Number(alvoId));
    if (!origem || !destino) return;

    const novos = locais.filter((c) => c.id !== origem.id);
    const indiceDestino = novos.findIndex((c) => c.id === destino.id);
    const movido: CampoCustomizado = { ...origem, secao: destino.secao || "Geral" };
    novos.splice(indiceDestino, 0, movido);

    const porSecao = new Map<string, number>();
    const comOrdem = novos.map((c) => {
      const chave = c.secao || "Geral";
      const ordem = porSecao.get(chave) || 0;
      porSecao.set(chave, ordem + 1);
      return { ...c, ordem };
    });

    const anteriores = new Map(locais.map((c) => [c.id, c]));
    const alterados = comOrdem.filter((c) => {
      const antes = anteriores.get(c.id);
      return !antes || antes.ordem !== c.ordem || antes.secao !== c.secao;
    });

    setLocais(comOrdem);
    alterados.forEach((c) => reordenar.mutate({ id: c.id, ordem: c.ordem, secao: c.secao || "Geral" }));
    if (alterados.length) {
      sucesso("Ordem atualizada", numero(alterados.length) + " campo(s) reposicionados em " + (destino.secao || "Geral") + ".");
    }
  };

  /* --------------------------------------------------------------- colunas */

  const colunas: Array<ColunaTabela<CampoCustomizado>> = [
    {
      chave: "ordem",
      titulo: "#",
      largura: "60px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (c) => c.ordem,
      renderizar: (c) => <span className="text-2xs tabular-nums text-fg-muted">{numero(c.ordem)}</span>,
    },
    {
      chave: "nome",
      titulo: "Campo",
      largura: "240px",
      ordenavel: true,
      valorOrdenacao: (c) => c.nome,
      renderizar: (c) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-fg">
            {c.nome}
            {c.obrigatorio && <span className="ml-1 text-danger">*</span>}
          </p>
          <p className="truncate font-mono text-2xs text-fg-subtle">{c.chave}</p>
        </div>
      ),
    },
    {
      chave: "tipo",
      titulo: "Tipo",
      largura: "130px",
      ordenavel: true,
      valorOrdenacao: (c) => c.tipo,
      renderizar: (c) => {
        const info = infoTipo(c.tipo);
        return (
          <Etiqueta tom={info.tom} icone={info.icone}>
            {info.rotulo}
          </Etiqueta>
        );
      },
    },
    {
      chave: "secao",
      titulo: "Seção",
      largura: "150px",
      ordenavel: true,
      valorOrdenacao: (c) => c.secao,
      renderizar: (c) => <span className="text-xs text-fg-muted">{c.secao || "Geral"}</span>,
    },
    {
      chave: "largura",
      titulo: "Largura",
      largura: "110px",
      alinhar: "center",
      ordenavel: true,
      valorOrdenacao: (c) => c.largura,
      renderizar: (c) => (
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-9 text-2xs tabular-nums text-fg-muted">{numero(c.largura) + "/12"}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
            <span className="block h-full rounded-full bg-brand" style={{ width: (c.largura / 12) * 100 + "%" }} />
          </span>
        </div>
      ),
    },
    {
      chave: "obrigatorio",
      titulo: "Obrigatório",
      largura: "110px",
      alinhar: "center",
      renderizar: (c) =>
        c.obrigatorio ? <Etiqueta tom="danger">obrigatório</Etiqueta> : <span className="text-2xs text-fg-subtle">opcional</span>,
    },
    {
      chave: "ativo",
      titulo: "Ativo",
      largura: "100px",
      alinhar: "center",
      renderizar: (c) => (
        <div className="flex justify-center">
          <Interruptor ativo={c.ativo} tamanho="sm" onChange={(v) => alternarAtivo.mutate({ id: c.id, ativo: v })} />
        </div>
      ),
    },
    {
      chave: "acoes",
      titulo: "Ações",
      largura: "110px",
      alinhar: "right",
      renderizar: (c) => (
        <div className="flex items-center justify-end gap-1">
          <BotaoIcone icone={Pencil} rotulo={"Editar " + c.nome} tamanho="xs" onClick={() => abrirEdicao(c)} />
          <BotaoIcone
            icone={Trash2}
            rotulo={"Excluir " + c.nome}
            tamanho="xs"
            onClick={() => setConfirmacao({ id: c.id, nome: c.nome })}
          />
        </div>
      ),
    },
  ];

  const kpis = [
    { rotulo: "Campos da entidade", valor: numero(lista.length), icone: Table, cor: "#2563EB" },
    { rotulo: "Ativos", valor: numero(lista.filter((c) => c.ativo).length), icone: Check, cor: "#059669" },
    { rotulo: "Obrigatórios", valor: numero(lista.filter((c) => c.obrigatorio).length), icone: Lock, cor: "#DC2626" },
    { rotulo: "Seções", valor: numero(secoes.length), icone: Rows3, cor: "#8B5CF6" },
    { rotulo: "Seleções", valor: numero(totalPorTipo.get("SELECAO") || 0), icone: ListChecks, cor: "#0891B2" },
    { rotulo: "Moeda", valor: numero(totalPorTipo.get("MOEDA") || 0), icone: Wallet, cor: "#F59E0B" },
  ];

  const jsonSchema = useMemo(() => JSON.stringify(schema.data || {}, null, 2), [schema.data]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Campos e formulários customizados"
        subtitulo="Personalize entidades do SGP e monte o formulário por arrastar e soltar"
        icone={Settings2}
        cor="#8B5CF6"
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Selecao
              value={entidade}
              onChange={(e) => setEntidade(e.target.value)}
              className="h-9 w-44 py-0 text-xs"
              aria-label="Selecionar entidade"
            >
              {ENTIDADES.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.rotulo + " (" + e.valor + ")"}
                </option>
              ))}
            </Selecao>
            <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
              Novo campo
            </Botao>
          </div>
        }
      />

      <Abas
        valor={aba}
        onChange={setAba}
        abas={[
          { valor: "campos", rotulo: "Campos", icone: Table, contagem: lista.length },
          { valor: "editor", rotulo: "Editor visual", icone: LayoutDashboard, contagem: secoes.length },
          { valor: "schema", rotulo: "Schema", icone: Braces },
        ]}
      />

      {campos.isError && (
        <Alerta tom="danger" titulo="Não foi possível carregar os campos customizados">
          {mensagemErro(campos.error)}
        </Alerta>
      )}

      {aba === "campos" && (
        <div className="space-y-3">
          <GradeCards colunas={4}>
            {kpis.map((k) => (
              <div key={k.rotulo} className="rounded-sgp-lg border border-border bg-surface p-3 shadow-n1">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">{k.rotulo}</span>
                  <span
                    className="grid size-6 place-items-center rounded-md"
                    style={{ backgroundColor: k.cor + "1f", color: k.cor }}
                  >
                    <k.icone className="size-3.5" aria-hidden />
                  </span>
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-fg">{k.valor}</p>
              </div>
            ))}
          </GradeCards>

          <BarraFerramentas>
            <span className="text-2xs font-medium text-fg-muted">Entidade</span>
            <Selecao
              value={entidade}
              onChange={(e) => setEntidade(e.target.value)}
              className="h-8 w-44 py-0 text-xs"
              aria-label="Entidade filtrada"
            >
              {ENTIDADES.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.rotulo}
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
            <span className="ml-auto text-2xs text-fg-muted">
              {"Campos aplicados em " + rotuloEntidade(entidade)}
            </span>
          </BarraFerramentas>

          <div className="rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
            {campos.isLoading ? (
              <CarregandoBloco rotulo="Carregando campos..." />
            ) : (
              <Tabela
                colunas={colunas}
                dados={lista}
                compacta
                vazio={
                  <Vazio
                    icone={Table}
                    titulo="Nenhum campo customizado"
                    descricao="Crie campos para estender o cadastro desta entidade sem alterar o código."
                    acao={
                      <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
                        Novo campo
                      </Botao>
                    }
                  />
                }
              />
            )}
          </div>
        </div>
      )}

      {aba === "editor" && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Editor visual do formulário">
            Os campos abaixo são agrupados por seção e respeitam a largura configurada em uma grade de 12 colunas.
            Arraste pelo ícone de alça para reordenar; a nova ordem é persistida por PATCH.
          </Alerta>

          {campos.isLoading ? (
            <CarregandoBloco rotulo="Montando o formulário..." />
          ) : locais.length === 0 ? (
            <Vazio
              icone={LayoutDashboard}
              titulo="Formulário vazio"
              descricao="Adicione campos para visualizar o formulário desta entidade."
              acao={
                <Botao variante="primario" icone={Plus} onClick={abrirNovo}>
                  Novo campo
                </Botao>
              }
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
              <div className="space-y-4">
                {secoes.map(([secao, itens]) => (
                  <div key={secao} className="rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Rows3 className="size-4 text-brand" aria-hidden />
                        <h3 className="text-sm font-semibold text-fg">{secao}</h3>
                        <Etiqueta tom="neutral">{numero(itens.length) + " campo(s)"}</Etiqueta>
                      </span>
                      <span className="text-2xs text-fg-muted">
                        {"Total de colunas usadas: " +
                          numero(itens.reduce((soma, c) => soma + c.largura, 0)) +
                          " · linhas estimadas: " +
                          numero(Math.max(1, Math.ceil(itens.reduce((s, c) => s + c.largura, 0) / 12)))}
                      </span>
                    </div>
                    <SortableContext items={itens.map((c) => "campo-" + c.id)} strategy={verticalListSortingStrategy}>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        {itens.map((c) => (
                          <CampoSortable
                            key={c.id}
                            campo={c}
                            onEditar={() => abrirEdicao(c)}
                            onRemover={() => setConfirmacao({ id: c.id, nome: c.nome })}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                ))}
              </div>
            </DndContext>
          )}
        </div>
      )}

      {aba === "schema" && (
        <div className="space-y-3">
          <Alerta tom="info" titulo="Schema da entidade" icone={FileCode}>
            {"Resultado de GET /campos-customizados/schema/?entidade=" + entidade + ", com os campos ativos e as seções do formulário."}
          </Alerta>

          {schema.isError && (
            <Alerta tom="danger" titulo="Não foi possível carregar o schema">
              {mensagemErro(schema.error)}
            </Alerta>
          )}

          {schema.isLoading ? (
            <CarregandoBloco rotulo="Carregando schema..." />
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <span className="flex items-center gap-2">
                    <Braces className="size-4 text-brand" aria-hidden />
                    <h3 className="text-sm font-semibold text-fg">JSON do schema</h3>
                  </span>
                  <Etiqueta tom="neutral">{numero((schema.data ? schema.data.campos : []).length) + " campos"}</Etiqueta>
                </div>
                <pre className="max-h-[520px] overflow-auto scroll-thin px-4 py-3 font-mono text-2xs leading-relaxed text-fg">
                  {jsonSchema}
                </pre>
              </div>

              <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <span className="flex items-center gap-2">
                    <LayoutDashboard className="size-4 text-brand" aria-hidden />
                    <h3 className="text-sm font-semibold text-fg">Pré-visualização do formulário</h3>
                  </span>
                  <Etiqueta tom="brand">{rotuloEntidade(entidade)}</Etiqueta>
                </div>
                <div className="max-h-[520px] space-y-4 overflow-auto scroll-thin p-4">
                  {(schema.data ? schema.data.secoes : []).map((secao) => (
                    <div key={secao}>
                      <p className="mb-2 text-2xs font-bold uppercase tracking-wide text-fg-muted">{secao}</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        {(schema.data ? schema.data.campos : [])
                          .filter((c) => (c.secao || "Geral") === secao)
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((c) => (
                            <div key={c.id} style={{ gridColumn: "span " + c.largura + " / span " + c.largura }}>
                              <Campo rotulo={c.nome} obrigatorio={c.obrigatorio} dica={c.ajuda} htmlFor={"prev-" + c.id}>
                                <PreviewCampo campo={c} />
                              </Campo>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                  {(schema.data ? schema.data.campos : []).length === 0 && (
                    <Vazio
                      icone={Braces}
                      titulo="Nenhum campo ativo"
                      descricao="Ative ou crie campos para vê-los no schema desta entidade."
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <SecaoColapsavel titulo="Como os campos são resolvidos" icone={FileCode} abertoInicial={false}>
            <ul className="space-y-1.5 text-xs text-fg-muted">
              <li>{"1. O schema da entidade é consultado em /campos-customizados/schema/?entidade=" + entidade + "."}</li>
              <li>2. Apenas campos com ativo igual a verdadeiro entram no formulário renderizado.</li>
              <li>3. Cada campo declara tipo, largura de 1 a 12 colunas e a seção onde é exibido.</li>
              <li>4. Campos do tipo SELECAO usam a lista de opções cadastrada; MOEDA e PESSOA têm renderização dedicada.</li>
              <li>5. Os valores informados são persistidos em ValorCampoCustomizado por objeto.</li>
            </ul>
          </SecaoColapsavel>
        </div>
      )}

      {/* ---------------------------------------------------- painel campo */}

      <PainelLateral
        aberto={painelCampo}
        onFechar={() => setPainelCampo(false)}
        titulo={campoEmEdicao ? "Editar campo" : "Novo campo"}
        subtitulo={rotuloEntidade(form.entidade) + " · " + form.entidade}
        largura="lg"
        rodape={
          <div className="flex items-center gap-2">
            {campoEmEdicao && (
              <Botao
                variante="perigo"
                icone={Trash2}
                onClick={() => setConfirmacao({ id: campoEmEdicao.id, nome: campoEmEdicao.nome })}
              >
                Excluir
              </Botao>
            )}
            <Botao variante="fantasma" onClick={() => setPainelCampo(false)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Check} carregando={salvarCampo.isPending} onClick={enviar}>
              {campoEmEdicao ? "Salvar campo" : "Criar campo"}
            </Botao>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Entidade" obrigatorio htmlFor="c-entidade">
              <Selecao
                id="c-entidade"
                value={form.entidade}
                onChange={(e) => setForm((f) => ({ ...f, entidade: e.target.value }))}
              >
                {ENTIDADES.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.rotulo + " (" + e.valor + ")"}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Tipo" obrigatorio htmlFor="c-tipo">
              <Selecao id="c-tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Nome exibido" obrigatorio htmlFor="c-nome">
              <Entrada
                id="c-nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Centro de custo"
              />
            </Campo>
            <Campo rotulo="Chave técnica" obrigatorio htmlFor="c-chave" dica="Sem espaços; única por entidade.">
              <Entrada
                id="c-chave"
                value={form.chave}
                onChange={(e) => setForm((f) => ({ ...f, chave: e.target.value }))}
                placeholder="centro_custo"
              />
            </Campo>
            <Campo rotulo="Seção do formulário" htmlFor="c-secao">
              <Entrada
                id="c-secao"
                value={form.secao}
                onChange={(e) => setForm((f) => ({ ...f, secao: e.target.value }))}
                list="secoes-existentes"
                placeholder="Geral"
              />
            </Campo>
            <Campo rotulo="Ordem" htmlFor="c-ordem" dica="Posição dentro da seção.">
              <Entrada
                id="c-ordem"
                type="number"
                min={0}
                value={form.ordem}
                onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
              />
            </Campo>
          </div>
          <datalist id="secoes-existentes">
            {secoes.map(([secao]) => (
              <option key={secao} value={secao} />
            ))}
          </datalist>

          <Campo rotulo="Largura na grade (1 a 12 colunas)" htmlFor="c-largura">
            <Selecao
              id="c-largura"
              value={form.largura}
              onChange={(e) => setForm((f) => ({ ...f, largura: e.target.value }))}
            >
              {LARGURAS.map((l) => (
                <option key={l} value={l}>
                  {numero(l) + " de 12 colunas"}
                </option>
              ))}
            </Selecao>
          </Campo>

          <div className="rounded-sgp border border-border bg-surface-2 p-3">
            <p className="text-2xs font-semibold text-fg">Pré-visualização</p>
            <div className="mt-2 grid grid-cols-12 gap-2">
              <div style={{ gridColumn: "span " + (Number(form.largura) || 6) + " / span " + (Number(form.largura) || 6) }}>
                <Campo rotulo={form.nome || "Nome do campo"} obrigatorio={form.obrigatorio} dica={form.ajuda}>
                  <PreviewCampo
                    campo={{
                      id: 0,
                      entidade: form.entidade,
                      nome: form.nome,
                      chave: form.chave,
                      tipo: form.tipo,
                      opcoes: form.opcoes,
                      obrigatorio: form.obrigatorio,
                      valor_padrao: form.valor_padrao,
                      ajuda: form.ajuda,
                      ordem: Number(form.ordem) || 0,
                      largura: Number(form.largura) || 6,
                      secao: form.secao,
                      ativo: form.ativo,
                    }}
                  />
                </Campo>
              </div>
            </div>
          </div>

          {form.tipo === "SELECAO" && (
            <Campo rotulo="Opções da seleção" dica="Pressione Enter para adicionar cada opção.">
              <div className="flex items-center gap-2">
                <Entrada
                  value={novaOpcao}
                  onChange={(e) => setNovaOpcao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    adicionarOpcao();
                  }}
                  placeholder="Ex.: Produção"
                />
                <Botao variante="secundario" icone={Plus} onClick={adicionarOpcao}>
                  Incluir
                </Botao>
              </div>
            </Campo>
          )}
          {form.tipo === "SELECAO" && (
            <div className="flex flex-wrap gap-1.5">
              {form.opcoes.map((o) => (
                <Chip
                  key={o}
                  cor="#10B981"
                  removivel
                  onRemover={() => setForm((f) => ({ ...f, opcoes: f.opcoes.filter((x) => x !== o) }))}
                >
                  {o}
                </Chip>
              ))}
              {form.opcoes.length === 0 && <span className="text-2xs text-fg-subtle">Nenhuma opção cadastrada.</span>}
            </div>
          )}

          <Campo rotulo="Valor padrão" htmlFor="c-padrao">
            <Entrada
              id="c-padrao"
              value={form.valor_padrao}
              onChange={(e) => setForm((f) => ({ ...f, valor_padrao: e.target.value }))}
              placeholder="Opcional"
            />
          </Campo>
          <Campo rotulo="Texto de ajuda" htmlFor="c-ajuda">
            <Entrada
              id="c-ajuda"
              value={form.ajuda}
              onChange={(e) => setForm((f) => ({ ...f, ajuda: e.target.value }))}
              placeholder="Explicação exibida abaixo do campo"
            />
          </Campo>

          <div className="space-y-2">
            <Interruptor
              ativo={form.obrigatorio}
              onChange={(v) => setForm((f) => ({ ...f, obrigatorio: v }))}
              rotulo="Preenchimento obrigatório"
              descricao="Bloqueia o salvamento do registro sem este campo."
            />
            <Interruptor
              ativo={form.ativo}
              onChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              rotulo="Campo ativo"
              descricao="Campos inativos não aparecem no formulário nem no schema."
            />
          </div>

          <Alerta tom="warning" titulo="Campos personalizados e API">
            A chave técnica é usada na API e nos valores gravados. Alterá-la depois de haver dados pode exigir
            migração manual dos valores.
          </Alerta>
        </div>
      </PainelLateral>

      <Modal
        aberto={confirmacao !== null}
        onFechar={() => setConfirmacao(null)}
        titulo="Excluir campo customizado"
        largura="sm"
        rodape={
          <div className="flex items-center gap-2">
            <Botao variante="fantasma" onClick={() => setConfirmacao(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirCampo.isPending}
              onClick={() => {
                if (confirmacao) excluirCampo.mutate({ id: confirmacao.id });
              }}
            >
              Excluir
            </Botao>
          </div>
        }
      >
        <p className="text-sm text-fg">
          {"Deseja excluir o campo " + (confirmacao ? confirmacao.nome : "") + "?"}
        </p>
        <Alerta tom="warning" titulo="Valores associados" className="mt-3">
          Os valores já gravados para este campo deixam de ser exibidos nos formulários e no schema da entidade.
        </Alerta>
      </Modal>

      <div className="flex items-center gap-2 text-2xs text-fg-muted">
        <Dica texto="Campos inativos continuam existindo no banco e podem ser reativados a qualquer momento.">
          <span className="inline-flex items-center gap-1">
            <X className="size-3" aria-hidden />
            Prefira desativar um campo a excluí-lo quando houver histórico relevante.
          </span>
        </Dica>
      </div>
    </div>
  );
}

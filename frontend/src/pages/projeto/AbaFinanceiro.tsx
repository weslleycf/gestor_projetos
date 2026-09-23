import { useMemo, useState } from "react";
import {
  Alerta, BarraProgresso, Botao, BotaoIcone, Campo, CarregandoBloco, Cartao, Entrada, Etiqueta, Modal,
  PainelLateral, Selecao, Tabela, Vazio, type ColunaTabela,
} from "@/components/ui";
import { GraficoBarras, GraficoLinha } from "@/components/charts";
import { LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { dataCurta, moeda, numero } from "@/lib/format";
import { soma } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import type { EVM, Lancamento, Orcamento, Projeto } from "@/lib/types";
import {
  BarChart3, CheckCircle2, Gauge, List, Pencil, Plus, Save, Sparkles, Trash2, TrendingUp, Wallet,
} from "lucide-react";

import type { OrcamentoCategoria, PontoCurva } from "./comum";

interface FluxoCaixa {
  meses: Array<{
    periodo: string;
    entradas: number;
    saidas: number;
    previsto_entradas: number;
    previsto_saidas: number;
    saldo: number;
    saldo_previsto: number;
    saldo_acumulado: number;
    rotulo: string;
  }>;
  saldo_final_projetado: number;
}

interface RespostaEVM {
  projeto: Projeto;
  evm: EVM;
  curva_s: { pontos: PontoCurva[]; resumo: EVM };
  por_categoria: OrcamentoCategoria[];
  fluxo_caixa: FluxoCaixa;
}

/* ==========================================================================
   Aba Financeiro — orcado x realizado, lancamentos e fluxo de caixa (RF-20/22)
   ========================================================================== */

type TipoCustoOrcamento = "CAPEX" | "OPEX";

interface ItemDistribuicao {
  categoria: string;
  tipo: TipoCustoOrcamento;
  valor_planejado: string;
  cor: string;
}

const CORES_ORCAMENTO = ["#2563EB", "#0891B2", "#059669", "#D97706", "#DC2626", "#8B5CF6", "#EC4899", "#64748B"];

export function AbaFinanceiro({ projetoId, projeto }: { projetoId: number; projeto: Projeto }) {
  const { pode } = useAuth();
  const podeEditar = pode("financeiro.editar");

  const orcamentos = useLista<Orcamento>(CHAVES.orcamentos, "/orcamentos/", { project: projetoId });
  const lancamentos = useLista<Lancamento>(CHAVES.lancamentos, "/lancamentos/", { project: projetoId });
  const evm = useConsulta<RespostaEVM>(CHAVES.evm(projetoId), "/evm/" + projetoId + "/");

  const [painelLinha, setPainelLinha] = useState<"nova" | "editar" | null>(null);
  const [linhaEdicao, setLinhaEdicao] = useState<Orcamento | null>(null);
  const [formLinha, setFormLinha] = useState<{ categoria: string; tipo: TipoCustoOrcamento; valor_planejado: string; centro_custo: string; cor: string }>({
    categoria: "",
    tipo: "OPEX",
    valor_planejado: "",
    centro_custo: "",
    cor: "#2563EB",
  });
  const [erroLinha, setErroLinha] = useState("");
  const [modalDistribuir, setModalDistribuir] = useState(false);
  const [itensDistribuir, setItensDistribuir] = useState<ItemDistribuicao[]>([]);
  const [erroDistribuir, setErroDistribuir] = useState("");
  const [linhaExcluir, setLinhaExcluir] = useState<Orcamento | null>(null);

  const invalidarOrcamento = [
    CHAVES.orcamentos,
    CHAVES.evm(projetoId),
    CHAVES.dashboardProjeto(projetoId),
    CHAVES.dashboardFinanceiro,
  ];

  const criarLinha = useMutacao<Record<string, unknown>, Orcamento>({
    url: "/orcamentos/",
    invalidar: invalidarOrcamento,
    mensagemSucesso: "Linha orçamentária criada",
  });

  const atualizarLinha = useMutacao<Record<string, unknown> & { id: number }, Orcamento>({
    metodo: "patch",
    url: (valores) => "/orcamentos/" + valores.id + "/",
    invalidar: invalidarOrcamento,
    mensagemSucesso: "Linha orçamentária atualizada",
  });

  const removerLinha = useMutacao<{ id: number }, unknown>({
    metodo: "delete",
    url: (valores) => "/orcamentos/" + valores.id + "/",
    invalidar: invalidarOrcamento,
    mensagemSucesso: "Linha orçamentária excluída",
  });

  const distribuirOrcamento = useMutacao<Record<string, unknown>, Orcamento[]>({
    url: "/orcamentos/distribuir/",
    invalidar: invalidarOrcamento,
    mensagemSucesso: "Orçamento distribuído por categoria",
  });

  const abrirNovaLinha = () => {
    setLinhaEdicao(null);
    setFormLinha({ categoria: "", tipo: "OPEX", valor_planejado: "", centro_custo: "", cor: "#2563EB" });
    setErroLinha("");
    setPainelLinha("nova");
  };

  const abrirEdicaoLinha = (item: Orcamento) => {
    setLinhaEdicao(item);
    setFormLinha({
      categoria: item.categoria,
      tipo: item.tipo,
      valor_planejado: String(Number(item.valor_planejado) || 0),
      centro_custo: item.centro_custo || "",
      cor: item.cor || "#2563EB",
    });
    setErroLinha("");
    setPainelLinha("editar");
  };

  const confirmarLinha = async () => {
    setErroLinha("");
    const categoria = formLinha.categoria.trim();
    if (!categoria) {
      setErroLinha("Informe a categoria da linha orçamentária.");
      return;
    }
    const valor = Number(formLinha.valor_planejado);
    if (!Number.isFinite(valor) || valor < 0) {
      setErroLinha("Informe um valor planejado igual ou maior que zero.");
      return;
    }
    const corpo = {
      project: projetoId,
      categoria,
      tipo: formLinha.tipo,
      valor_planejado: valor,
      centro_custo: formLinha.centro_custo.trim(),
      cor: formLinha.cor,
    };
    try {
      if (painelLinha === "editar" && linhaEdicao) {
        await atualizarLinha.mutateAsync({ id: linhaEdicao.id, ...corpo });
      } else {
        await criarLinha.mutateAsync(corpo);
      }
      setPainelLinha(null);
    } catch (falha) {
      setErroLinha(mensagemErro(falha));
    }
  };

  const abrirDistribuir = () => {
    const atuais = orcamentos.data ?? [];
    const itens: ItemDistribuicao[] = atuais.length
      ? atuais.map((item) => ({
          categoria: item.categoria,
          tipo: item.tipo,
          valor_planejado: String(Number(item.valor_planejado) || 0),
          cor: item.cor || "#2563EB",
        }))
      : [
          { categoria: "Pessoal", tipo: "OPEX", valor_planejado: String(Number(projeto.orcamento_opex) || 0), cor: "#2563EB" },
          { categoria: "Infraestrutura", tipo: "CAPEX", valor_planejado: String(Number(projeto.orcamento_capex) || 0), cor: "#8B5CF6" },
        ];
    setItensDistribuir(itens);
    setErroDistribuir("");
    setModalDistribuir(true);
  };

  const atualizarItemDistribuicao = (posicao: number, campos: Partial<ItemDistribuicao>) => {
    setItensDistribuir((itens) => itens.map((item, i) => (i === posicao ? { ...item, ...campos } : item)));
  };

  const confirmarDistribuir = async () => {
    setErroDistribuir("");
    const validos = itensDistribuir.filter((item) => item.categoria.trim());
    if (validos.length === 0) {
      setErroDistribuir("Informe ao menos uma categoria para distribuir o orçamento.");
      return;
    }
    if (validos.some((item) => !Number.isFinite(Number(item.valor_planejado)) || Number(item.valor_planejado) < 0)) {
      setErroDistribuir("Os valores planejados devem ser iguais ou maiores que zero.");
      return;
    }
    try {
      await distribuirOrcamento.mutateAsync({
        project: projetoId,
        itens: validos.map((item) => ({
          categoria: item.categoria.trim(),
          tipo: item.tipo,
          valor_planejado: Number(item.valor_planejado) || 0,
          cor: item.cor,
        })),
      });
      setModalDistribuir(false);
    } catch (falha) {
      setErroDistribuir(mensagemErro(falha));
    }
  };

  const confirmarExclusaoLinha = () => {
    if (!linhaExcluir) return;
    removerLinha.mutate({ id: linhaExcluir.id }, { onSuccess: () => setLinhaExcluir(null) });
  };

  const totalProjeto = Number(projeto.orcamento) || 0;
  const totalDistribuido = soma((orcamentos.data ?? []).map((item) => Number(item.valor_planejado) || 0));
  const totalItens = soma(itensDistribuir.map((item) => Number(item.valor_planejado) || 0));

  const colunas = useMemo<Array<ColunaTabela<Lancamento>>>(
    () => [
      {
        chave: "data",
        titulo: "Competência",
        largura: "120px",
        ordenavel: true,
        valorOrdenacao: (item) => item.data_competencia,
        renderizar: (item) => <span className="text-xs tabular-nums text-fg-muted">{dataCurta(item.data_competencia)}</span>,
      },
      {
        chave: "descricao",
        titulo: "Descrição",
        ordenavel: true,
        valorOrdenacao: (item) => item.descricao,
        renderizar: (item) => (
          <span className="min-w-0">
            <span className="block truncate text-xs text-fg">{item.descricao}</span>
            <span className="block truncate text-2xs text-fg-subtle">
              {item.categoria || item.orcamento_categoria || "Sem categoria"}
              {item.fornecedor ? " · " + item.fornecedor : ""}
            </span>
          </span>
        ),
      },
      {
        chave: "tipo",
        titulo: "Tipo",
        largura: "110px",
        ordenavel: true,
        valorOrdenacao: (item) => item.tipo,
        renderizar: (item) => (
          <Etiqueta tom={item.tipo === "RECEITA" ? "success" : "warning"}>{item.tipo_rotulo || item.tipo}</Etiqueta>
        ),
      },
      {
        chave: "status",
        titulo: "Status",
        largura: "130px",
        ordenavel: true,
        valorOrdenacao: (item) => item.status,
        renderizar: (item) => <Etiqueta tom="neutral">{item.status_rotulo || item.status}</Etiqueta>,
      },
      {
        chave: "valor",
        titulo: "Valor",
        largura: "130px",
        alinhar: "right",
        ordenavel: true,
        valorOrdenacao: (item) => Number(item.valor) || 0,
        renderizar: (item) => (
          <span className={"text-xs font-semibold tabular-nums " + (item.tipo === "RECEITA" ? "text-success" : "text-fg")}>
            {moeda(item.valor)}
          </span>
        ),
      },
    ],
    []
  );

  const fluxo = evm.data?.fluxo_caixa;
  const meses = fluxo?.meses ?? [];

  return (
    <div className="space-y-3">
      {evm.data && (
        <LinhaKPI
          itens={[
            { rotulo: "BAC", valor: moeda(evm.data.evm.BAC, true), icone: Wallet, cor: "#2563EB", subrotulo: "orçamento total" },
            { rotulo: "AC", valor: moeda(evm.data.evm.AC, true), icone: TrendingUp, cor: "#DC2626", subrotulo: "custo real incorrido" },
            { rotulo: "EV", valor: moeda(evm.data.evm.EV, true), icone: CheckCircle2, cor: "#059669", subrotulo: "valor agregado" },
            { rotulo: "EAC", valor: moeda(evm.data.evm.EAC, true), icone: Gauge, cor: "#D97706", subrotulo: "projeção final" },
            { rotulo: "VAC", valor: moeda(evm.data.evm.VAC, true), icone: BarChart3, cor: evm.data.evm.VAC < 0 ? "#DC2626" : "#059669", subrotulo: "variação no término" },
            { rotulo: "Saldo projetado", valor: moeda(fluxo?.saldo_final_projetado ?? 0, true), icone: Wallet, cor: "#0891B2", subrotulo: "fluxo de caixa acumulado" },
          ]}
        />
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        <Cartao
          titulo="Orçado × realizado por categoria"
          subtitulo={
            numero(orcamentos.data?.length || 0) +
            " categoria(s) · distribuído " +
            moeda(totalDistribuido, true) +
            " de " +
            moeda(totalProjeto, true)
          }
          icone={Wallet}
          corIcone="#0891B2"
          acao={
            podeEditar ? (
              <>
                <Botao tamanho="xs" variante="secundario" icone={Plus} onClick={abrirNovaLinha}>
                  Nova linha
                </Botao>
                <Botao tamanho="xs" variante="primario" icone={Sparkles} onClick={abrirDistribuir}>
                  Distribuir orçamento
                </Botao>
              </>
            ) : undefined
          }
        >
          {(orcamentos.data ?? []).length === 0 ? (
            <Vazio
              icone={Wallet}
              titulo="Sem orçamento por categoria"
              descricao="Distribua o orçamento do projeto para acompanhar o consumo por categoria."
              acao={
                podeEditar ? (
                  <Botao variante="primario" icone={Sparkles} onClick={abrirDistribuir}>
                    Distribuir orçamento
                  </Botao>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              <GraficoBarras
                itens={(orcamentos.data ?? []).map((item) => ({
                  rotulo: item.categoria,
                  valor: Number(item.valor_realizado) || 0,
                  comparativo: Number(item.valor_planejado) || 0,
                  cor: item.cor || "#2563EB",
                }))}
                horizontal
                formatarValor={(valor) => moeda(valor, true)}
                mostrarEixo={false}
              />
              <ul className="space-y-1.5">
                {(orcamentos.data ?? []).map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-2xs">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.cor }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-fg">
                      {item.categoria}
                      <span className="ml-1 text-2xs text-fg-subtle">{item.tipo}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-fg-muted">
                      {moeda(item.valor_realizado, true)} / {moeda(item.valor_planejado, true)}
                    </span>
                    <span className="w-24 shrink-0">
                      <BarraProgresso
                        valor={Math.min(100, item.consumo_percentual)}
                        altura="sm"
                        cor={item.consumo_percentual > 100 ? "#DC2626" : item.consumo_percentual > 90 ? "#D97706" : "#059669"}
                      />
                    </span>
                    {podeEditar && (
                      <span className="flex shrink-0 items-center gap-0.5">
                        <BotaoIcone
                          icone={Pencil}
                          rotulo="Editar linha orçamentária"
                          tamanho="xs"
                          onClick={() => abrirEdicaoLinha(item)}
                        />
                        <BotaoIcone
                          icone={Trash2}
                          rotulo="Excluir linha orçamentária"
                          variante="perigo"
                          tamanho="xs"
                          onClick={() => setLinhaExcluir(item)}
                        />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Fluxo de caixa" subtitulo="Entradas, saídas e saldo acumulado" icone={TrendingUp} corIcone="#059669">
          {meses.length === 0 ? (
            <Vazio icone={TrendingUp} titulo="Sem lançamentos no período" descricao="Registre lançamentos para projetar o fluxo de caixa." />
          ) : (
            <GraficoLinha
              rotulos={meses.map((item) => item.rotulo)}
              series={[
                { nome: "Entradas", cor: "#059669", dados: meses.map((item) => item.entradas) },
                { nome: "Saídas", cor: "#DC2626", dados: meses.map((item) => item.saidas), tracejada: true },
                { nome: "Saldo acumulado", cor: "#2563EB", dados: meses.map((item) => item.saldo_acumulado), area: true },
              ]}
              altura={260}
              mostrarLegenda
              formatarValor={(valor) => moeda(valor, true)}
            />
          )}
        </Cartao>
      </div>

      <Cartao titulo="Lançamentos do projeto" subtitulo={numero(lancamentos.data?.length || 0) + " lançamento(s)"} icone={List} corIcone="#8B5CF6">
        {lancamentos.isLoading ? (
          <CarregandoBloco rotulo="Carregando lançamentos..." />
        ) : (
          <Tabela<Lancamento>
            colunas={colunas}
            dados={lancamentos.data ?? []}
            compacta
            vazio={<Vazio icone={Wallet} titulo="Nenhum lançamento registrado" descricao="Os lançamentos alimentam o custo real e o EVM do projeto." />}
          />
        )}
      </Cartao>

      <PainelLateral
        aberto={painelLinha !== null}
        onFechar={() => setPainelLinha(null)}
        titulo={painelLinha === "editar" ? "Editar linha orçamentária" : "Nova linha orçamentária"}
        subtitulo={projeto.codigo + " · " + projeto.nome}
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setPainelLinha(null)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Save}
              carregando={criarLinha.isPending || atualizarLinha.isPending}
              onClick={confirmarLinha}
            >
              {painelLinha === "editar" ? "Salvar alterações" : "Criar linha"}
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          {erroLinha && (
            <Alerta tom="danger" titulo="Não foi possível salvar">
              {erroLinha}
            </Alerta>
          )}
          <Campo rotulo="Categoria" obrigatorio htmlFor="orcamento-categoria" dica="Ex.: Pessoal, Licenças, Infraestrutura.">
            <Entrada
              id="orcamento-categoria"
              value={formLinha.categoria}
              onChange={(evento) => setFormLinha({ ...formLinha, categoria: evento.target.value })}
              placeholder="Ex.: Pessoal"
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Tipo de custo" htmlFor="orcamento-tipo">
              <Selecao
                id="orcamento-tipo"
                value={formLinha.tipo}
                onChange={(evento) => setFormLinha({ ...formLinha, tipo: evento.target.value === "CAPEX" ? "CAPEX" : "OPEX" })}
              >
                <option value="OPEX">OPEX (operacional)</option>
                <option value="CAPEX">CAPEX (investimento)</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Valor planejado (R$)" obrigatorio htmlFor="orcamento-valor">
              <Entrada
                id="orcamento-valor"
                type="number"
                min={0}
                step="0.01"
                value={formLinha.valor_planejado}
                onChange={(evento) => setFormLinha({ ...formLinha, valor_planejado: evento.target.value })}
              />
            </Campo>
          </div>
          <Campo rotulo="Centro de custo" htmlFor="orcamento-centro" dica="Opcional. Usado nos lançamentos e nos relatórios financeiros.">
            <Entrada
              id="orcamento-centro"
              value={formLinha.centro_custo}
              onChange={(evento) => setFormLinha({ ...formLinha, centro_custo: evento.target.value })}
            />
          </Campo>
          <Campo rotulo="Cor" dica="Usada no gráfico de orçado × realizado.">
            <div className="flex flex-wrap items-center gap-1.5">
              {CORES_ORCAMENTO.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  aria-label={"Cor " + cor}
                  onClick={() => setFormLinha({ ...formLinha, cor })}
                  className={"size-6 rounded-full border-2 transition-transform hover:scale-110 " + (formLinha.cor === cor ? "border-fg" : "border-transparent")}
                  style={{ backgroundColor: cor }}
                />
              ))}
              <input
                type="color"
                aria-label="Cor personalizada"
                value={formLinha.cor}
                onChange={(evento) => setFormLinha({ ...formLinha, cor: evento.target.value })}
                className="h-7 w-10 cursor-pointer rounded border border-border-strong bg-surface"
              />
            </div>
          </Campo>
          <Alerta tom="info" titulo="Valor realizado">
            O realizado desta linha é atualizado automaticamente pelos lançamentos vinculados a ela.
          </Alerta>
        </div>
      </PainelLateral>

      <Modal
        aberto={modalDistribuir}
        onFechar={() => setModalDistribuir(false)}
        titulo="Distribuir orçamento"
        subtitulo={"Projeto " + projeto.codigo + " · orçamento total de " + moeda(totalProjeto, true)}
        largura="lg"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setModalDistribuir(false)}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              icone={Sparkles}
              carregando={distribuirOrcamento.isPending}
              onClick={confirmarDistribuir}
            >
              Distribuir orçamento
            </Botao>
          </>
        }
      >
        <div className="space-y-3">
          {erroDistribuir && (
            <Alerta tom="danger" titulo="Não foi possível distribuir">
              {erroDistribuir}
            </Alerta>
          )}
          <Alerta tom="info" titulo="Como funciona" icone={Sparkles}>
            Cada item cria ou atualiza a linha orçamentária da categoria escolhida no projeto. Categorias que já
            existem são atualizadas com o novo valor planejado.
          </Alerta>
          <div className="space-y-2">
            {itensDistribuir.map((item, posicao) => (
              <div key={"item-" + String(posicao)} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-5">
                  <Campo rotulo="Categoria" htmlFor={"distribuir-categoria-" + String(posicao)}>
                    <Entrada
                      id={"distribuir-categoria-" + String(posicao)}
                      value={item.categoria}
                      placeholder="Ex.: Pessoal"
                      onChange={(evento) => atualizarItemDistribuicao(posicao, { categoria: evento.target.value })}
                    />
                  </Campo>
                </div>
                <div className="col-span-2">
                  <Campo rotulo="Tipo" htmlFor={"distribuir-tipo-" + String(posicao)}>
                    <Selecao
                      id={"distribuir-tipo-" + String(posicao)}
                      value={item.tipo}
                      onChange={(evento) =>
                        atualizarItemDistribuicao(posicao, { tipo: evento.target.value === "CAPEX" ? "CAPEX" : "OPEX" })
                      }
                    >
                      <option value="OPEX">OPEX</option>
                      <option value="CAPEX">CAPEX</option>
                    </Selecao>
                  </Campo>
                </div>
                <div className="col-span-3">
                  <Campo rotulo="Valor planejado" htmlFor={"distribuir-valor-" + String(posicao)}>
                    <Entrada
                      id={"distribuir-valor-" + String(posicao)}
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.valor_planejado}
                      onChange={(evento) => atualizarItemDistribuicao(posicao, { valor_planejado: evento.target.value })}
                    />
                  </Campo>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1.5 pb-1">
                  <input
                    type="color"
                    aria-label="Cor da categoria"
                    value={item.cor}
                    onChange={(evento) => atualizarItemDistribuicao(posicao, { cor: evento.target.value })}
                    className="h-7 w-9 cursor-pointer rounded border border-border-strong bg-surface"
                  />
                  <BotaoIcone
                    icone={Trash2}
                    rotulo="Remover categoria"
                    variante="perigo"
                    tamanho="xs"
                    onClick={() => setItensDistribuir((itens) => itens.filter((_, i) => i !== posicao))}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Botao
              tamanho="sm"
              icone={Plus}
              onClick={() =>
                setItensDistribuir((itens) => [
                  ...itens,
                  {
                    categoria: "",
                    tipo: "OPEX",
                    valor_planejado: "",
                    cor: CORES_ORCAMENTO[itens.length % CORES_ORCAMENTO.length],
                  },
                ])
              }
            >
              Adicionar categoria
            </Botao>
            <span className="ml-auto text-2xs text-fg-muted">
              Neste formulário: <span className="font-semibold tabular-nums text-fg">{moeda(totalItens)}</span> de{" "}
              {moeda(totalProjeto)}
            </span>
          </div>
          {totalProjeto > 0 && totalItens > totalProjeto && (
            <Alerta tom="warning" titulo="Acima do orçamento do projeto">
              A soma das linhas ultrapassa o orçamento total em {moeda(totalItens - totalProjeto)}.
            </Alerta>
          )}
        </div>
      </Modal>

      <Modal
        aberto={linhaExcluir !== null}
        onFechar={() => setLinhaExcluir(null)}
        titulo="Excluir linha orçamentária"
        subtitulo={linhaExcluir ? linhaExcluir.categoria + " · " + moeda(linhaExcluir.valor_planejado) : undefined}
        largura="sm"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setLinhaExcluir(null)}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} carregando={removerLinha.isPending} onClick={confirmarExclusaoLinha}>
              Excluir linha
            </Botao>
          </>
        }
      >
        <p className="text-xs text-fg-muted">
          A linha sai do orçado × realizado do projeto. Os lançamentos já vinculados continuam registrados, mas ficam
          sem linha orçamentária.
        </p>
      </Modal>
    </div>
  );
}

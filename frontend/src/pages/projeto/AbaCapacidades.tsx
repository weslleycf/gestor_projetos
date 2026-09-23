import { useState } from "react";
import {
  Alerta, BarraProgresso, Botao, CarregandoBloco, Cartao, Chip, ControleDeslizante, Esqueleto, Etiqueta,
  Interruptor, Selecao, useAvisos,
} from "@/components/ui";
import { GraficoBarras } from "@/components/charts";
import { LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { indice, numero, percentual } from "@/lib/format";
import type { GapItem, Skill } from "@/lib/types";
import { AlertTriangle, Plus, ShieldAlert, Sparkles, Target } from "lucide-react";

interface RequisitoProjeto {
  id: number;
  project: number;
  skill: number;
  nivel_minimo: number;
  nivel_desejado: number;
  quantidade: number;
  peso: number;
  obrigatorio: boolean;
  observacao: string;
  skill_detalhe?: Skill;
}

interface RespostaGap {
  escopo: { tipo: string; id?: number; nome?: string; pessoas?: number };
  total_pessoas: number;
  itens: GapItem[];
  resumo: {
    total_requisitos: number;
    criticos: number;
    altos: number;
    medios: number;
    baixos: number;
    obrigatorios_pendentes: number;
    indice_cobertura: number;
  };
}

/* ==========================================================================
   Aba Capacidades — requisitos e gap analysis do projeto (RF-68/RF-69)
   ========================================================================== */

export function AbaCapacidades({ projetoId, podeVerSkills }: { projetoId: number; podeVerSkills: boolean }) {
  const { erro: avisarErro } = useAvisos();
  const requisitos = useLista<RequisitoProjeto>(["requisitos-projeto"], "/capacidades/requisitos-projeto/", {
    project: projetoId,
  });
  const gap = useConsulta<RespostaGap>(CHAVES.gap, "/capacidades/gap/", { project: projetoId });
  const skills = useLista<Skill>(CHAVES.skills, podeVerSkills ? "/capacidades/skills/" : null, { page_size: 300 });
  const [novo, setNovo] = useState({ skill: "", nivel_minimo: 3, nivel_desejado: 4, quantidade: 1, peso: 1, obrigatorio: false });

  const definir = useMutacao<Record<string, unknown>, unknown>({
    url: "/capacidades/requisitos-projeto/definir/",
    invalidar: [["requisitos-projeto"], CHAVES.gap, CHAVES.dashboardProjeto(projetoId)],
    mensagemSucesso: "Requisitos atualizados",
  });

  const lista = requisitos.data ?? [];

  const enviar = async (itens: Array<Record<string, unknown>>) => {
    try {
      await definir.mutateAsync({ project: projetoId, substituir: true, requisitos: itens });
    } catch (falha) {
      avisarErro("Não foi possível atualizar os requisitos", mensagemErro(falha));
    }
  };

  const adicionar = () => {
    if (!novo.skill) {
      avisarErro("Selecione uma capacidade", "Escolha a skill que o projeto precisa.");
      return;
    }
    const itens = lista.map((item) => ({
      skill: item.skill,
      nivel_minimo: item.nivel_minimo,
      nivel_desejado: item.nivel_desejado,
      quantidade: item.quantidade,
      peso: item.peso,
      obrigatorio: item.obrigatorio,
    }));
    itens.push({
      skill: Number(novo.skill),
      nivel_minimo: novo.nivel_minimo,
      nivel_desejado: novo.nivel_desejado,
      quantidade: novo.quantidade,
      peso: novo.peso,
      obrigatorio: novo.obrigatorio,
    });
    enviar(itens);
    setNovo({ skill: "", nivel_minimo: 3, nivel_desejado: 4, quantidade: 1, peso: 1, obrigatorio: false });
  };

  const remover = (skillId: number) => {
    const itens = lista
      .filter((item) => item.skill !== skillId)
      .map((item) => ({
        skill: item.skill,
        nivel_minimo: item.nivel_minimo,
        nivel_desejado: item.nivel_desejado,
        quantidade: item.quantidade,
        peso: item.peso,
        obrigatorio: item.obrigatorio,
      }));
    enviar(itens);
  };

  const resumoGap = gap.data?.resumo;
  const severidadeCor: Record<string, string> = {
    CRITICO: "#DC2626",
    ALTO: "#F97316",
    MEDIO: "#F59E0B",
    BAIXO: "#0891B2",
    OK: "#059669",
  };

  return (
    <div className="space-y-3">
      <LinhaKPI
        itens={[
          { rotulo: "Requisitos", valor: numero(resumoGap?.total_requisitos || lista.length), icone: Sparkles, cor: "#8B5CF6", subrotulo: "skills exigidas" },
          { rotulo: "Cobertura", valor: percentual(resumoGap?.indice_cobertura || 0, 1), icone: Target, cor: "#059669", subrotulo: "índice de cobertura" },
          { rotulo: "Críticos", valor: numero(resumoGap?.criticos || 0), icone: AlertTriangle, cor: "#DC2626", subrotulo: "gaps críticos" },
          { rotulo: "Altos", valor: numero(resumoGap?.altos || 0), icone: AlertTriangle, cor: "#F97316", subrotulo: "gaps altos" },
          { rotulo: "Médios", valor: numero(resumoGap?.medios || 0), icone: AlertTriangle, cor: "#F59E0B", subrotulo: "gaps médios" },
          { rotulo: "Obrigatórios pendentes", valor: numero(resumoGap?.obrigatorios_pendentes || 0), icone: ShieldAlert, cor: "#D97706", subrotulo: "bloqueiam a alocação" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[400px_1fr]">
        <Cartao titulo="Requisitos de capacidade" subtitulo={numero(lista.length) + " requisito(s) definidos"} icone={Sparkles} corIcone="#8B5CF6">
          <div className="space-y-3">
            {requisitos.isLoading ? (
              <Esqueleto linhas={4} />
            ) : lista.length === 0 ? (
              <p className="rounded-sgp border border-dashed border-border px-3 py-6 text-center text-xs text-fg-muted">
                Nenhum requisito definido. Adicione as capacidades necessárias para alimentar o motor de matching.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {lista.map((item) => (
                  <Chip
                    key={item.id}
                    cor={item.skill_detalhe?.cor || "#8B5CF6"}
                    removivel
                    onRemover={() => remover(item.skill)}
                  >
                    {item.skill_detalhe?.nome || "Skill " + String(item.skill)} ≥ N{item.nivel_minimo}
                    <span className="ml-1 text-2xs opacity-70">
                      x{item.quantidade}
                      {item.obrigatorio ? " · obrig." : ""}
                    </span>
                  </Chip>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">Adicionar requisito</p>
              <Selecao value={novo.skill} onChange={(evento) => setNovo({ ...novo, skill: evento.target.value })} aria-label="Capacidade">
                <option value="">Selecione a capacidade</option>
                {(skills.data ?? []).map((skill) => (
                  <option key={skill.id} value={String(skill.id)}>
                    {skill.nome}
                  </option>
                ))}
              </Selecao>
              <div className="grid grid-cols-2 gap-2">
                <ControleDeslizante
                  valor={novo.nivel_minimo}
                  onChange={(valor) => setNovo({ ...novo, nivel_minimo: valor, nivel_desejado: Math.max(valor, novo.nivel_desejado) })}
                  min={1}
                  max={5}
                  rotulo="Nível mínimo"
                  sufixo=""
                  marcos={[1, 3, 5]}
                />
                <ControleDeslizante
                  valor={novo.nivel_desejado}
                  onChange={(valor) => setNovo({ ...novo, nivel_desejado: Math.max(valor, novo.nivel_minimo) })}
                  min={1}
                  max={5}
                  rotulo="Nível desejado"
                  sufixo=""
                  marcos={[1, 3, 5]}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-2xs text-fg-muted">
                  Quantidade
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={novo.quantidade}
                    onChange={(evento) => setNovo({ ...novo, quantidade: Math.max(1, Number(evento.target.value) || 1) })}
                    className="h-7 w-16 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
                    aria-label="Quantidade de pessoas"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-2xs text-fg-muted">
                  Peso
                  <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={novo.peso}
                    onChange={(evento) => setNovo({ ...novo, peso: Number(evento.target.value) || 1 })}
                    className="h-7 w-16 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand"
                    aria-label="Peso do requisito"
                  />
                </label>
                <Interruptor
                  ativo={novo.obrigatorio}
                  onChange={(valor) => setNovo({ ...novo, obrigatorio: valor })}
                  rotulo="Obrigatório"
                  tamanho="sm"
                />
              </div>
              <Botao variante="primario" icone={Plus} larguraTotal onClick={adicionar} carregando={definir.isPending}>
                Adicionar requisito
              </Botao>
              {!podeVerSkills && (
                <p className="text-2xs text-fg-subtle">
                  Seu perfil não permite listar o catálogo completo de capacidades.
                </p>
              )}
            </div>
          </div>
        </Cartao>

        <Cartao
          titulo="Gap analysis do projeto"
          subtitulo={gap.data ? numero(gap.data.total_pessoas) + " pessoa(s) avaliada(s) no escopo" : "Analisando cobertura"}
          icone={Target}
          corIcone="#DC2626"
        >
          {gap.isLoading && <CarregandoBloco rotulo="Calculando gaps de capacidade..." />}
          {gap.isError && (
            <Alerta tom="danger" titulo="Não foi possível calcular o gap">
              {mensagemErro(gap.error)}
            </Alerta>
          )}
          {gap.data && (
            <div className="space-y-3">
              <GraficoBarras
                itens={(gap.data.itens ?? []).slice(0, 12).map((item) => ({
                  rotulo: item.skill,
                  valor: item.deficit,
                  cor: severidadeCor[item.severidade] || "#64748B",
                  meta: item.quantidade,
                }))}
                horizontal
                formatarValor={(valor) => numero(valor) + " pessoa(s)"}
                mostrarEixo={false}
              />

              <ul className="space-y-2">
                {(gap.data.itens ?? []).map((item) => (
                  <li key={item.skill_id} className="space-y-2 rounded-sgp border border-border bg-surface-2 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.cor }} aria-hidden />
                      <span className="text-xs font-semibold text-fg">{item.skill}</span>
                      <Etiqueta cor={severidadeCor[item.severidade] || "#64748B"}>{item.severidade}</Etiqueta>
                      <Etiqueta tom="neutral">
                        mínimo N{item.nivel_minimo} · {numero(item.atendem)}/{numero(item.quantidade)} atendem
                      </Etiqueta>
                      {item.obrigatorio && <Etiqueta tom="danger">Obrigatório</Etiqueta>}
                    </div>
                    <BarraProgresso
                      valor={item.quantidade ? Math.min(100, (item.atendem / item.quantidade) * 100) : 0}
                      altura="sm"
                      rotulo="Cobertura do requisito"
                      mostrarValor
                      cor={severidadeCor[item.severidade] || "#64748B"}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Quem atende</p>
                        {item.pessoas_atendem.length === 0 ? (
                          <p className="text-2xs text-fg-subtle">Nenhuma pessoa atende o nível mínimo.</p>
                        ) : (
                          <ul className="space-y-0.5">
                            {item.pessoas_atendem.slice(0, 4).map((pessoa) => (
                              <li key={pessoa.user_id} className="flex items-center justify-between gap-2 text-2xs text-fg-muted">
                                <span className="truncate">{pessoa.nome}</span>
                                <span className="tabular-nums text-success">N{pessoa.nivel}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Quem tem gap</p>
                        {item.pessoas_com_gap.length === 0 ? (
                          <p className="text-2xs text-fg-subtle">Nenhum gap identificado.</p>
                        ) : (
                          <ul className="space-y-0.5">
                            {item.pessoas_com_gap.slice(0, 4).map((pessoa) => (
                              <li key={pessoa.user_id} className="flex items-center justify-between gap-2 text-2xs text-fg-muted">
                                <span className="truncate">{pessoa.nome}</span>
                                <span className="tabular-nums text-warning">
                                  N{pessoa.nivel} (-{indice(pessoa.deficit, 1)})
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    {item.acoes_sugeridas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.acoes_sugeridas.map((acao) => (
                          <Etiqueta key={acao.tipo} cor={acao.cor || "#2563EB"} icone={Sparkles}>
                            {acao.rotulo}
                          </Etiqueta>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Cartao>
      </div>
    </div>
  );
}

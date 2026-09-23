import { useEffect, useState, type ReactNode } from "react";
import {
  DndContext, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Alerta, AreaTexto, BarraProgresso, Botao, Campo, CarregandoBloco, Cartao, ControleDeslizante, Entrada,
  Etiqueta, PainelLateral, Selecao, useAvisos,
} from "@/components/ui";
import { EscalaCores } from "@/components/charts";
import { LinhaKPI } from "@/components/layout";
import { CHAVES, useConsulta, useLista, useMutacao } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { moeda, numero } from "@/lib/format";
import { soma } from "@/lib/utils";
import type { Risco } from "@/lib/types";
import { AlertTriangle, List, Save, ShieldAlert, Wallet } from "lucide-react";

const OPCOES_ESTRATEGIA = [
  { valor: "EVITAR", rotulo: "Evitar" },
  { valor: "MITIGAR", rotulo: "Mitigar" },
  { valor: "TRANSFERIR", rotulo: "Transferir" },
  { valor: "ACEITAR", rotulo: "Aceitar" },
  { valor: "EXPLORAR", rotulo: "Explorar" },
  { valor: "ELEVAR", rotulo: "Elevar" },
  { valor: "COMPARTILHAR", rotulo: "Compartilhar" },
];

/* ==========================================================================
   Aba Riscos — matriz 5x5 arrastavel e plano de resposta (RF-23/RF-26)
   ========================================================================== */

function CelulaMatriz({
  probabilidade,
  impacto,
  cor,
  total,
  rotulo,
  children,
}: {
  probabilidade: number;
  impacto: number;
  cor: string;
  total: number;
  rotulo: string;
  children?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "celula-" + String(probabilidade) + "-" + String(impacto),
    data: { probabilidade, impacto },
  });
  return (
    <div
      ref={setNodeRef}
      title={rotulo + " · P" + probabilidade + " × I" + impacto + " · " + numero(total) + " risco(s)"}
      className={
        "min-h-20 rounded-sgp border p-1 transition-all " + (isOver ? "ring-2 ring-brand scale-[1.02]" : "border-border/60")
      }
      style={{ backgroundColor: cor + "26" }}
    >
      <span className="mb-1 flex items-center justify-between text-2xs font-semibold" style={{ color: cor }}>
        <span>P{probabilidade}×I{impacto}</span>
        <span className="tabular-nums">{total > 0 ? total : ""}</span>
      </span>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ChipRisco({ risco, aoAbrir }: { risco: Risco; aoAbrir: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "risco-" + String(risco.id),
    data: { riscoId: risco.id },
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      onClick={(evento) => {
        evento.stopPropagation();
        aoAbrir();
      }}
      style={{
        transform: transform ? "translate3d(" + transform.x + "px, " + transform.y + "px, 0)" : undefined,
        touchAction: "none",
        backgroundColor: risco.cor + "33",
        borderColor: risco.cor + "88",
        color: risco.cor,
      }}
      className={
        "w-full cursor-grab truncate rounded border px-1 py-0.5 text-left text-2xs font-medium active:cursor-grabbing " +
        (isDragging ? "z-50 shadow-n3" : "")
      }
      title={risco.codigo + " · " + risco.descricao}
    >
      {risco.codigo || "R" + String(risco.id)}
    </button>
  );
}

export function AbaRiscos({ projetoId }: { projetoId: number }) {
  const { erro: avisarErro } = useAvisos();
  const matriz = useConsulta<{
    celulas: import("@/lib/types").CelulaMatrizRisco[];
    total: number;
    legenda: Array<{ nivel: string; rotulo: string; cor: string; ate: number }>;
  }>(CHAVES.matrizRiscos, "/riscos/matriz/", { project: projetoId });

  const riscos = useLista<Risco>(CHAVES.riscos, "/riscos/", { project: projetoId });
  const [riscoAberto, setRiscoAberto] = useState<Risco | null>(null);
  const [plano, setPlano] = useState({
    plano_resposta: "",
    contingencia: "",
    estrategia: "MITIGAR",
    prob_residual: 3,
    imp_residual: 3,
    data_limite: "",
  });

  useEffect(() => {
    if (!riscoAberto) return;
    setPlano({
      plano_resposta: riscoAberto.plano_resposta || "",
      contingencia: riscoAberto.contingencia || "",
      estrategia: riscoAberto.estrategia || "MITIGAR",
      prob_residual: riscoAberto.prob_residual || 3,
      imp_residual: riscoAberto.imp_residual || 3,
      data_limite: riscoAberto.data_limite || "",
    });
  }, [riscoAberto]);

  const invalidarRiscos = [CHAVES.matrizRiscos, CHAVES.riscos, CHAVES.dashboardRiscos, CHAVES.dashboardProjeto(projetoId)];

  const mover = useMutacao<{ id: number; probabilidade: number; impacto: number }, Risco>({
    url: (valores) => "/riscos/" + valores.id + "/mover/",
    invalidar: invalidarRiscos,
    mensagemSucesso: "Risco reposicionado na matriz",
  });

  const salvarPlano = useMutacao<Record<string, unknown> & { id: number }, Risco>({
    url: (valores) => "/riscos/" + valores.id + "/plano-resposta/",
    invalidar: invalidarRiscos,
    mensagemSucesso: "Plano de resposta registrado",
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const aoSoltarRisco = (evento: DragEndEvent) => {
    const alvo = evento.over ? String(evento.over.id) : "";
    const origem = String(evento.active.id).replace("risco-", "");
    if (!alvo.startsWith("celula-")) return;
    const partes = alvo.replace("celula-", "").split("-");
    const probabilidade = Number(partes[0]);
    const impacto = Number(partes[1]);
    const id = Number(origem);
    if (!id || !probabilidade || !impacto) return;
    mover.mutate({ id, probabilidade, impacto });
  };

  const confirmarPlano = async () => {
    if (!riscoAberto) return;
    try {
      await salvarPlano.mutateAsync({
        id: riscoAberto.id,
        plano_resposta: plano.plano_resposta,
        contingencia: plano.contingencia,
        estrategia: plano.estrategia,
        prob_residual: plano.prob_residual,
        imp_residual: plano.imp_residual,
        data_limite: plano.data_limite || null,
      });
      setRiscoAberto(null);
    } catch (falha) {
      avisarErro("Não foi possível salvar o plano", mensagemErro(falha));
    }
  };

  if (matriz.isLoading) return <CarregandoBloco rotulo="Carregando matriz de riscos..." />;
  if (matriz.isError) {
    return (
      <Alerta tom="danger" titulo="Não foi possível carregar a matriz de riscos">
        {mensagemErro(matriz.error)}
      </Alerta>
    );
  }

  const celulas = matriz.data?.celulas ?? [];
  const lista = riscos.data ?? [];
  const porNivel = ["EXTREMO", "ALTO", "MEDIO", "BAIXO"].map((nivel) => ({
    nivel,
    total: lista.filter((risco) => risco.nivel === nivel).length,
    cor: (matriz.data?.legenda ?? []).find((item) => item.nivel === nivel)?.cor || "#64748B",
  }));

  return (
    <div className="space-y-3">
      <LinhaKPI
        itens={[
          { rotulo: "Riscos abertos", valor: numero(matriz.data?.total || 0), icone: ShieldAlert, cor: "#DC2626", subrotulo: "na matriz atual" },
          ...porNivel.map((item) => ({
            rotulo: item.nivel.charAt(0) + item.nivel.slice(1).toLowerCase(),
            valor: numero(item.total),
            icone: AlertTriangle,
            cor: item.cor,
            subrotulo: "severidade " + item.nivel.toLowerCase(),
          })),
          { rotulo: "Exposição", valor: moeda(soma(lista.map((risco) => Number(risco.valor_monetario_esperado) || 0)), true), icone: Wallet, cor: "#D97706", subrotulo: "valor monetário esperado" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
        <Cartao
          titulo="Matriz probabilidade × impacto"
          subtitulo="Arraste um risco entre as células para reavaliar severidade"
          icone={ShieldAlert}
          corIcone="#DC2626"
        >
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoSoltarRisco}>
            <div className="flex gap-2">
              <div className="flex flex-col justify-around py-6 text-2xs font-semibold uppercase tracking-wide text-fg-muted">
                <span className="rotate-180" style={{ writingMode: "vertical-rl" }}>
                  Probabilidade
                </span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 4, 3, 2, 1].map((probabilidade) =>
                    [1, 2, 3, 4, 5].map((impacto) => {
                      const celula = celulas.find(
                        (item) => item.probabilidade === probabilidade && item.impacto === impacto
                      );
                      return (
                        <CelulaMatriz
                          key={String(probabilidade) + "-" + String(impacto)}
                          probabilidade={probabilidade}
                          impacto={impacto}
                          cor={celula?.cor || "#64748B"}
                          total={celula?.total || 0}
                          rotulo={celula?.rotulo || "Risco"}
                        >
                          {(celula?.riscos ?? []).slice(0, 4).map((item) => {
                            const completo = lista.find((risco) => risco.id === item.id);
                            return (
                              <ChipRisco
                                key={item.id}
                                risco={
                                  completo || {
                                    id: item.id,
                                    project: projetoId,
                                    project_nome: item.projeto,
                                    project_cor: item.cor,
                                    codigo: item.codigo,
                                    descricao: item.descricao,
                                    causa: "",
                                    efeito: "",
                                    categoria: "",
                                    categoria_rotulo: "",
                                    probabilidade,
                                    impacto,
                                    severidade: probabilidade * impacto,
                                    nivel: "MEDIO",
                                    nivel_rotulo: item.nivel,
                                    cor: item.cor,
                                    prob_residual: 0,
                                    imp_residual: 0,
                                    severidade_residual: 0,
                                    estrategia: "",
                                    estrategia_rotulo: "",
                                    plano_resposta: "",
                                    contingencia: "",
                                    responsavel: null,
                                    responsavel_detalhe: null,
                                    status: item.status,
                                    status_rotulo: item.status,
                                    data_identificacao: "",
                                    data_limite: null,
                                    custo_mitigacao: "0",
                                    valor_monetario_esperado: "0",
                                    gatilhos: [],
                                    tags: [],
                                    exposicao: 0,
                                    atrasado: false,
                                    reducao_severidade: 0,
                                  }
                                }
                                aoAbrir={() => {
                                  const alvo = lista.find((risco) => risco.id === item.id) || null;
                                  setRiscoAberto(alvo);
                                }}
                              />
                            );
                          })}
                          {(celula?.total || 0) > 4 && (
                            <span className="block text-2xs text-fg-subtle">+{(celula?.total || 0) - 4}</span>
                          )}
                        </CelulaMatriz>
                      );
                    })
                  )}
                </div>
                <p className="mt-1.5 text-center text-2xs font-semibold uppercase tracking-wide text-fg-muted">Impacto</p>
              </div>
            </div>
          </DndContext>
          <div className="mt-3">
            <EscalaCores
              titulo="Severidade"
              rotulos={["Baixo", "Médio", "Alto", "Extremo"]}
              cores={["#10B981", "#F59E0B", "#F97316", "#EF4444"]}
            />
          </div>
        </Cartao>

        <Cartao titulo="Riscos do projeto" subtitulo={numero(lista.length) + " risco(s) registrado(s)"} icone={List} corIcone="#8B5CF6">
          {lista.length === 0 ? (
            <p className="text-xs text-fg-muted">Nenhum risco cadastrado para este projeto.</p>
          ) : (
            <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1 scroll-thin">
              {lista.map((risco) => (
                <li key={risco.id}>
                  <button
                    type="button"
                    onClick={() => setRiscoAberto(risco)}
                    className="w-full rounded-sgp border border-border bg-surface-2 px-2.5 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-3"
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: risco.cor }} aria-hidden />
                      <span className="text-2xs font-semibold text-fg-subtle">{risco.codigo}</span>
                      <Etiqueta cor={risco.cor}>{risco.nivel_rotulo}</Etiqueta>
                      {risco.atrasado && <Etiqueta tom="danger">Atrasado</Etiqueta>}
                    </span>
                    <span className="mt-1 block text-xs text-fg">{risco.descricao}</span>
                    <span className="mt-0.5 block text-2xs text-fg-muted">
                      {risco.categoria_rotulo || risco.categoria} · severidade {numero(risco.severidade)} ·{" "}
                      {risco.status_rotulo || risco.status}
                    </span>
                    <span className="mt-1 block">
                      <BarraProgresso
                        valor={Math.min(100, (risco.severidade / 25) * 100)}
                        altura="sm"
                        cor={risco.cor}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <PainelLateral
        aberto={riscoAberto !== null}
        onFechar={() => setRiscoAberto(null)}
        titulo="Plano de resposta"
        subtitulo={riscoAberto ? riscoAberto.codigo + " · " + riscoAberto.nivel_rotulo : ""}
        largura="md"
        rodape={
          <>
            <Botao variante="fantasma" onClick={() => setRiscoAberto(null)}>
              Cancelar
            </Botao>
            <Botao variante="primario" icone={Save} onClick={confirmarPlano} carregando={salvarPlano.isPending}>
              Registrar plano
            </Botao>
          </>
        }
      >
        {riscoAberto && (
          <div className="space-y-3">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-xs font-semibold text-fg">{riscoAberto.descricao}</p>
              {riscoAberto.causa && <p className="mt-1 text-2xs text-fg-muted">Causa: {riscoAberto.causa}</p>}
              {riscoAberto.efeito && <p className="mt-1 text-2xs text-fg-muted">Efeito: {riscoAberto.efeito}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Etiqueta cor={riscoAberto.cor}>{riscoAberto.nivel_rotulo}</Etiqueta>
                <Etiqueta tom="neutral">
                  P{riscoAberto.probabilidade} × I{riscoAberto.impacto}
                </Etiqueta>
                <Etiqueta tom="neutral">Exposição {numero(riscoAberto.exposicao)}</Etiqueta>
                {riscoAberto.responsavel_detalhe && <Etiqueta tom="info">{riscoAberto.responsavel_detalhe.nome}</Etiqueta>}
              </div>
            </div>

            <Campo rotulo="Plano de resposta" htmlFor="risco-plano">
              <AreaTexto
                id="risco-plano"
                rows={4}
                value={plano.plano_resposta}
                onChange={(evento) => setPlano({ ...plano, plano_resposta: evento.target.value })}
              />
            </Campo>

            <Campo rotulo="Contingência" dica="O que será feito se o risco se materializar." htmlFor="risco-contingencia">
              <AreaTexto
                id="risco-contingencia"
                rows={3}
                value={plano.contingencia}
                onChange={(evento) => setPlano({ ...plano, contingencia: evento.target.value })}
              />
            </Campo>

            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Estratégia" htmlFor="risco-estrategia">
                <Selecao
                  id="risco-estrategia"
                  value={plano.estrategia}
                  onChange={(evento) => setPlano({ ...plano, estrategia: evento.target.value })}
                >
                  {OPCOES_ESTRATEGIA.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.rotulo}
                    </option>
                  ))}
                </Selecao>
              </Campo>
              <Campo rotulo="Data limite" htmlFor="risco-data">
                <Entrada
                  id="risco-data"
                  type="date"
                  value={plano.data_limite}
                  onChange={(evento) => setPlano({ ...plano, data_limite: evento.target.value })}
                />
              </Campo>
            </div>

            <ControleDeslizante
              valor={plano.prob_residual}
              onChange={(valor) => setPlano({ ...plano, prob_residual: valor })}
              min={1}
              max={5}
              rotulo="Probabilidade residual"
              sufixo=""
              marcos={[1, 2, 3, 4, 5]}
            />
            <ControleDeslizante
              valor={plano.imp_residual}
              onChange={(valor) => setPlano({ ...plano, imp_residual: valor })}
              min={1}
              max={5}
              rotulo="Impacto residual"
              sufixo=""
              marcos={[1, 2, 3, 4, 5]}
            />
            <Alerta tom="info" titulo="Severidade residual">
              P{plano.prob_residual} × I{plano.imp_residual} = {numero(plano.prob_residual * plano.imp_residual)} após a resposta
              planejada.
            </Alerta>
          </div>
        )}
      </PainelLateral>
    </div>
  );
}

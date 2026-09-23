import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Award, Briefcase, Check, Crown, GraduationCap, Layers3, Network, Pencil, Plus,
  Rocket, ShieldAlert, Target, TrendingUp, Trash2, UserCheck, UserPlus, Users, type LucideIcon,
} from "lucide-react";
import {
  Abas, Alerta, AreaTexto, Avatar, BarraProgresso, Botao, BotaoIcone, CabecalhoPagina, Campo,
  CarregandoBloco, Chip, ControleDeslizante, Entrada, Etiqueta, KPI, Modal, PainelLateral,
  PilhaAvatares, Selecao, Vazio, type Tom,
} from "@/components/ui";
import { GradeCards } from "@/components/layout";
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { mensagemErro } from "@/lib/api";
import { cn, comAlfa, corPorValor, nivelLegenda } from "@/lib/utils";
import { dataCurta, numero, percentual } from "@/lib/format";
import { useAuth } from "@/store/auth";
import type { Skill, UsuarioResumo } from "@/lib/types";

/* ==========================================================================
   Mapa de sucessão de posições-chave (RF-87 · RF-88)
   ========================================================================== */

const COR_CRITICIDADE: Record<string, string> = {
  BAIXA: "#10B981", MEDIA: "#0891B2", ALTA: "#F59E0B", ESTRATEGICA: "#DC2626",
};

const TOM_CRITICIDADE: Record<string, Tom> = {
  BAIXA: "success", MEDIA: "info", ALTA: "warning", ESTRATEGICA: "danger",
};

const COR_RISCO: Record<string, string> = {
  BAIXO: "#059669", MEDIO: "#D97706", ALTO: "#DC2626", CRITICO: "#7F1D1D",
};

const ROTULO_PRONTIDAO: Record<string, string> = {
  PRONTO_AGORA: "Pronto agora",
  PRONTO_1_2_ANOS: "Pronto em 1–2 anos",
  PRONTO_3_5_ANOS: "Pronto em 3–5 anos",
  DESENVOLVER: "A desenvolver",
};

const TOM_PRONTIDAO: Record<string, Tom> = {
  PRONTO_AGORA: "success",
  PRONTO_1_2_ANOS: "info",
  PRONTO_3_5_ANOS: "warning",
  DESENVOLVER: "neutral",
};

interface NoMapa {
  id: string;
  tipo: string;
  titulo: string;
  subtitulo?: string;
  criticidade?: string;
  risco?: string;
  ocupante?: string;
  cor: string;
  icone: string;
}

interface ArestaMapa {
  de: string;
  para: string;
  tipo: string;
  prontidao?: string;
  aderencia?: number;
  prioridade?: number;
}

interface RespostaMapa {
  nos: NoMapa[];
  arestas: ArestaMapa[];
}

interface PosicaoChave {
  id: number;
  titulo: string;
  area: string;
  ocupante: number | null;
  ocupante_detalhe: UsuarioResumo | null;
  gestor: number | null;
  gestor_detalhe: UsuarioResumo | null;
  skills_criticas: number[];
  skills_detalhe: Skill[];
  criticidade: string;
  risco_sucessao: string;
  observacao: string;
  total_sucessores: number;
  criado_em: string;
}

interface PlanoSucessao {
  id: number;
  posicao: number;
  posicao_titulo: string;
  sucessor: number;
  sucessor_detalhe: UsuarioResumo | null;
  prontidao: string;
  prontidao_rotulo: string;
  aderencia: number;
  gaps: Array<{ skill?: string; atual?: number; requerido?: number; descricao?: string }>;
  plano_desenvolvimento: string;
  prioridade: number;
  criado_em: string;
}

type AbaSucessao = "mapa" | "posicoes";

export default function Sucessao() {
  const navegar = useNavigate();
  const { pode } = useAuth();
  const podeEditar = pode("capacidade.editar");
  const [aba, setAba] = useState<AbaSucessao>("mapa");
  const [criticidade, setCriticidade] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [painelPosicao, setPainelPosicao] = useState<PosicaoChave | null>(null);
  const [painelSucessor, setPainelSucessor] = useState<PosicaoChave | null>(null);
  const [planoEdicao, setPlanoEdicao] = useState<PlanoSucessao | null>(null);
  const [planoExcluir, setPlanoExcluir] = useState<PlanoSucessao | null>(null);
  const [posicaoExcluir, setPosicaoExcluir] = useState<PosicaoChave | null>(null);
  const [posicaoEdicao, setPosicaoEdicao] = useState<PosicaoChave | null>(null);
  const [modalPosicao, setModalPosicao] = useState(false);

  const mapa = useConsulta<RespostaMapa>(CHAVES.sucessao, "/capacidades/sucessao/mapa/");
  const posicoes = useLista<PosicaoChave>(CHAVES.sucessao, "/capacidades/posicoes/", {
    criticidade: criticidade || undefined,
    page_size: 200,
  });

  const listaPosicoes = posicoes.data || [];

  const excluirPosicao = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (v) => "/capacidades/posicoes/" + v.id + "/",
    invalidar: [CHAVES.sucessao, ["posicoes"]],
    mensagemSucesso: "Posição-chave excluída",
    aoSucesso: () => {
      setPosicaoExcluir(null);
      setPainelPosicao(null);
      setSelecionado(null);
    },
  });

  const excluirPlano = useMutacao<{ id: number }, void>({
    metodo: "delete",
    url: (v) => "/capacidades/sucessao/" + v.id + "/",
    invalidar: [CHAVES.sucessao],
    mensagemSucesso: "Sucessor removido do plano",
    aoSucesso: () => setPlanoExcluir(null),
  });

  function abrirNovaPosicao() {
    setPosicaoEdicao(null);
    setModalPosicao(true);
  }

  function abrirEdicaoPosicao(posicao: PosicaoChave) {
    setPainelPosicao(null);
    setPosicaoEdicao(posicao);
    setModalPosicao(true);
  }

  function fecharModalPosicao() {
    setModalPosicao(false);
    setPosicaoEdicao(null);
  }

  function abrirNovoSucessor(posicao: PosicaoChave) {
    setPainelPosicao(null);
    setPlanoEdicao(null);
    setPainelSucessor(posicao);
  }

  function abrirEdicaoPlano(plano: PlanoSucessao, posicao: PosicaoChave) {
    setPainelPosicao(null);
    setPlanoEdicao(plano);
    setPainelSucessor(posicao);
  }

  function fecharPainelSucessor() {
    setPainelSucessor(null);
    setPlanoEdicao(null);
  }

  const indicadores = useMemo(() => {
    const criticas = listaPosicoes.filter((p) => p.criticidade === "ALTA" || p.criticidade === "ESTRATEGICA").length;
    const semPronto = listaPosicoes.filter((p) => p.total_sucessores === 0).length;
    const riscoAlto = listaPosicoes.filter((p) => p.risco_sucessao === "ALTO" || p.risco_sucessao === "CRITICO").length;
    const cobertura = listaPosicoes.length
      ? (listaPosicoes.filter((p) => p.total_sucessores > 0).length / listaPosicoes.length) * 100
      : 0;
    return { criticas, semPronto, riscoAlto, cobertura };
  }, [listaPosicoes]);

  const posicoesDoMapa = useMemo(() => {
    const nos = mapa.data?.nos || [];
    const idsComSucessor = new Set((mapa.data?.arestas || []).filter((a) => a.tipo === "sucessao").map((a) => a.para));
    return nos
      .filter((n) => n.tipo === "posicao")
      .map((n) => ({
        ...n,
        temSucessor: idsComSucessor.has(n.id),
        posicaoId: Number(n.id.replace("pos-", "")),
      }))
      .filter((n) => !criticidade || n.criticidade === criticidade);
  }, [mapa.data, criticidade]);

  const posicaoSelecionada = useMemo(() => {
    if (!selecionado || !selecionado.startsWith("pos-")) return null;
    const id = Number(selecionado.replace("pos-", ""));
    return listaPosicoes.find((p) => p.id === id) || null;
  }, [selecionado, listaPosicoes]);

  return (
    <div className="space-y-4">
      <CabecalhoPagina
        titulo="Mapa de sucessão"
        subtitulo={numero(listaPosicoes.length) + " posições-chave · " + percentual(indicadores.cobertura, 0) + " com sucessores mapeados"}
        icone={Network}
        cor="#7C3AED"
        migalhas={[
          { rotulo: "Início", onClick: () => navegar("/") },
          { rotulo: "Capacidades", onClick: () => navegar("/capacidades") },
          { rotulo: "Sucessão" },
        ]}
        acoes={
          <>
            <Botao variante="secundario" icone={ShieldAlert} onClick={() => navegar("/bus-factor")}>Bus factor</Botao>
            {podeEditar && <Botao variante="primario" icone={Plus} onClick={abrirNovaPosicao}>Nova posição-chave</Botao>}
          </>
        }
        filhos={
          <>
            <Abas
              valor={aba}
              onChange={(v) => setAba(v)}
              abas={[
                { valor: "mapa", rotulo: "Mapa de sucessão", icone: Network, contagem: posicoesDoMapa.length },
                { valor: "posicoes", rotulo: "Posições-chave", icone: Briefcase, contagem: listaPosicoes.length },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI rotulo="Posições críticas" valor={numero(indicadores.criticas)} icone={Crown} cor="#DC2626" subrotulo="criticidade alta ou estratégica" compacto />
        <KPI rotulo="Sem sucessor mapeado" valor={numero(indicadores.semPronto)} icone={AlertTriangle} cor="#D97706" subrotulo="nenhum candidato preparado" compacto />
        <KPI rotulo="Risco alto de sucessão" valor={numero(indicadores.riscoAlto)} icone={ShieldAlert} cor="#DC2626" compacto />
        <KPI rotulo="Cobertura de sucessão" valor={percentual(indicadores.cobertura, 0)} icone={TrendingUp} cor={corPorValor(indicadores.cobertura / 100)} subrotulo="posições com sucessores" compacto />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-sgp-lg border border-border bg-surface p-2 shadow-n1">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-2xs font-medium text-fg-muted">Criticidade</span>
          <select value={criticidade} onChange={(e) => setCriticidade(e.target.value)} className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-fg outline-none focus:border-brand">
            <option value="">Todas</option>
            <option value="ESTRATEGICA">Estratégica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
        </label>
        {criticidade && <Botao tamanho="xs" variante="fantasma" onClick={() => setCriticidade("")}>Limpar filtro</Botao>}
        <span className="ml-auto text-2xs text-fg-muted">Clique em um nó do grafo para destacar as conexões e ver o plano de desenvolvimento.</span>
      </div>

      {mapa.isLoading && <CarregandoBloco rotulo="Montando o mapa de sucessão..." />}
      {mapa.isError && <Alerta tom="danger" titulo="Não foi possível carregar o mapa">{mensagemErro(mapa.error)}</Alerta>}

      {mapa.data && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <GrafoSucessao
              dados={mapa.data}
              posicoesFiltradas={posicoesDoMapa.map((p) => p.id)}
              selecionado={selecionado}
              aoSelecionar={setSelecionado}
              aoAbrirPosicao={(posicaoId) => {
                const pos = listaPosicoes.find((p) => p.id === posicaoId);
                if (pos) setPainelPosicao(pos);
              }}
              aoAbrirPessoa={(userId) => navegar("/pessoas/" + userId)}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-fg">Posições-chave</h3>
            {posicoes.isLoading && <CarregandoBloco rotulo="Carregando posições..." />}
            {listaPosicoes.length === 0 && !posicoes.isLoading && (
              <p className="rounded-sgp-lg border border-border bg-surface p-3 text-2xs text-fg-muted">
                Nenhuma posição-chave cadastrada para o filtro atual.
              </p>
            )}
            <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1 scroll-thin">
              {listaPosicoes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setPainelPosicao(p); setSelecionado("pos-" + p.id); }}
                  className={cn(
                    "w-full rounded-sgp-lg border bg-surface p-3 text-left transition-all hover:border-border-strong hover:shadow-n2",
                    selecionado === "pos-" + p.id ? "border-brand ring-2 ring-brand/25" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-fg">{p.titulo}</p>
                      <p className="truncate text-2xs text-fg-muted">{p.area || "Área não informada"}</p>
                    </div>
                    <Etiqueta tom={TOM_CRITICIDADE[p.criticidade] || "neutral"}>{p.criticidade}</Etiqueta>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {p.ocupante_detalhe ? (
                      <Avatar nome={p.ocupante_detalhe.nome} cor={p.ocupante_detalhe.cor} iniciais={p.ocupante_detalhe.iniciais} tamanho="xs" />
                    ) : (
                      <span className="grid size-5 place-items-center rounded-full bg-surface-3 text-2xs text-fg-subtle">?</span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-2xs text-fg-muted">{p.ocupante_detalhe?.nome || "Posição vaga"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Etiqueta tom="neutral" icone={Users}>{numero(p.total_sucessores)} sucessor(es)</Etiqueta>
                    <span className="inline-flex items-center gap-1 text-2xs font-semibold" style={{ color: COR_RISCO[p.risco_sucessao] || "#64748B" }}>
                      <span className="size-2 rounded-full" style={{ backgroundColor: COR_RISCO[p.risco_sucessao] || "#64748B" }} />
                      risco {p.risco_sucessao}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {aba === "posicoes" && (
        <GradeCards colunas="3">
          {listaPosicoes.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-sgp-lg border border-border bg-surface p-4 shadow-n1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg">{p.titulo}</p>
                  <p className="truncate text-2xs text-fg-muted">{p.area || "Área não informada"}</p>
                </div>
                <Etiqueta tom={TOM_CRITICIDADE[p.criticidade] || "neutral"}>{p.criticidade}</Etiqueta>
              </div>

              <div className="flex items-center gap-2 rounded-sgp border border-border bg-surface-2 p-2.5">
                {p.ocupante_detalhe ? (
                  <>
                    <Avatar nome={p.ocupante_detalhe.nome} cor={p.ocupante_detalhe.cor} iniciais={p.ocupante_detalhe.iniciais} tamanho="md" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-fg">{p.ocupante_detalhe.nome}</p>
                      <p className="truncate text-2xs text-fg-muted">{p.ocupante_detalhe.cargo}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-2xs text-fg-muted">Posição sem ocupante definido.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-2xs uppercase tracking-wide text-fg-muted">Risco de sucessão</p>
                  <p className="text-xs font-bold" style={{ color: COR_RISCO[p.risco_sucessao] || "#64748B" }}>{p.risco_sucessao}</p>
                </div>
                <div>
                  <p className="text-2xs uppercase tracking-wide text-fg-muted">Sucessores</p>
                  <p className="text-xs font-bold tabular-nums text-fg">{numero(p.total_sucessores)}</p>
                </div>
              </div>

              {p.skills_detalhe.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.skills_detalhe.slice(0, 4).map((s) => (<Chip key={s.id} cor={s.cor || "#F59E0B"}>{s.nome}</Chip>))}
                </div>
              )}

              <div className="mt-auto flex flex-wrap items-center justify-end gap-1.5 border-t border-border pt-2">
                <Botao tamanho="xs" variante="fantasma" icone={Users} onClick={() => setPainelPosicao(p)}>Ver plano</Botao>
                {podeEditar && (
                  <>
                    <BotaoIcone icone={Pencil} rotulo={"Editar " + p.titulo} tamanho="xs" onClick={() => abrirEdicaoPosicao(p)} />
                    <BotaoIcone icone={Trash2} rotulo={"Excluir " + p.titulo} variante="perigo" tamanho="xs" onClick={() => setPosicaoExcluir(p)} />
                    <Botao tamanho="xs" variante="primario" icone={UserPlus} onClick={() => abrirNovoSucessor(p)}>Adicionar sucessor</Botao>
                  </>
                )}
              </div>
            </div>
          ))}
        </GradeCards>
      )}

      <PainelPosicao
        posicao={painelPosicao}
        podeEditar={podeEditar}
        onFechar={() => setPainelPosicao(null)}
        aoAdicionarSucessor={abrirNovoSucessor}
        aoEditarPosicao={abrirEdicaoPosicao}
        aoExcluirPosicao={setPosicaoExcluir}
        aoEditarPlano={(plano) => { if (painelPosicao) abrirEdicaoPlano(plano, painelPosicao); }}
        aoExcluirPlano={setPlanoExcluir}
        aoAbrirPessoa={(id) => navegar("/pessoas/" + id)}
      />

      <PainelSucessor
        posicao={painelSucessor}
        plano={planoEdicao}
        onFechar={fecharPainelSucessor}
        aoConcluir={() => {
          posicoes.refetch();
          mapa.refetch();
        }}
      />

      <ModalPosicao
        aberto={modalPosicao}
        posicao={posicaoEdicao}
        onFechar={fecharModalPosicao}
        aoConcluir={() => { posicoes.refetch(); mapa.refetch(); }}
      />

      <Modal
        aberto={posicaoExcluir !== null}
        onFechar={() => setPosicaoExcluir(null)}
        titulo="Excluir posição-chave"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao onClick={() => setPosicaoExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirPosicao.isPending}
              onClick={() => posicaoExcluir && excluirPosicao.mutate({ id: posicaoExcluir.id })}
            >
              Excluir
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma a exclusão de <strong>{posicaoExcluir?.titulo}</strong>?
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          Os planos de sucessão mapeados para esta posição são removidos junto com ela.
        </p>
      </Modal>

      <Modal
        aberto={planoExcluir !== null}
        onFechar={() => setPlanoExcluir(null)}
        titulo="Excluir sucessor do plano"
        subtitulo="Esta ação não pode ser desfeita."
        largura="sm"
        rodape={
          <>
            <Botao onClick={() => setPlanoExcluir(null)}>Cancelar</Botao>
            <Botao
              variante="perigo"
              icone={Trash2}
              carregando={excluirPlano.isPending}
              onClick={() => planoExcluir && excluirPlano.mutate({ id: planoExcluir.id })}
            >
              Excluir
            </Botao>
          </>
        }
      >
        <p className="text-sm text-fg">
          Confirma a remoção de <strong>{planoExcluir?.sucessor_detalhe?.nome || "sucessor"}</strong> do plano de sucessão de{" "}
          <strong>{planoExcluir?.posicao_titulo}</strong>?
        </p>
        <p className="mt-2 text-xs text-fg-muted">
          O mapeamento de prontidão, aderência e plano de desenvolvimento deste candidato é apagado.
        </p>
      </Modal>
    </div>
  );
}

/* ==========================================================================
   Grafo de sucessão em SVG
   ========================================================================== */

function GrafoSucessao({
  dados, posicoesFiltradas, selecionado, aoSelecionar, aoAbrirPosicao, aoAbrirPessoa,
}: {
  dados: RespostaMapa;
  posicoesFiltradas: string[];
  selecionado: string | null;
  aoSelecionar: (id: string) => void;
  aoAbrirPosicao: (posicaoId: number) => void;
  aoAbrirPessoa: (userId: number) => void;
}) {
  const layout = useMemo(() => {
    const posicoes = dados.nos.filter((n) => n.tipo === "posicao" && posicoesFiltradas.indexOf(n.id) >= 0);
    const nosPorId: Record<string, NoMapa> = {};
    dados.nos.forEach((n) => { nosPorId[n.id] = n; });
    const alturaBloco = 150;
    const altura = Math.max(460, posicoes.length * alturaBloco + 60);
    const largura = 980;
    const cx = largura / 2;
    const posicionados: Array<{ no: NoMapa; x: number; y: number }> = [];
    const pessoas: Array<{ no: NoMapa; x: number; y: number; tipo: string; aderencia?: number; prioridade?: number }> = [];
    const conexoes: Array<{ de: { x: number; y: number }; para: { x: number; y: number }; tipo: string; aderencia?: number; prioridade?: number }> = [];

    posicoes.forEach((posicao, indice) => {
      const y = 70 + indice * alturaBloco;
      posicionados.push({ no: posicao, x: cx, y });

      const ocupacao = dados.arestas.find((a) => a.tipo === "ocupa" && a.para === posicao.id);
      if (ocupacao) {
        const pessoa = nosPorId[ocupacao.de];
        if (pessoa) {
          const ponto = { x: cx - 260, y };
          pessoas.push({ no: pessoa, x: ponto.x, y: ponto.y, tipo: "ocupa" });
          conexoes.push({ de: ponto, para: { x: cx, y }, tipo: "ocupa" });
        }
      }

      const sucessoes = dados.arestas
        .filter((a) => a.tipo === "sucessao" && a.para === posicao.id)
        .sort((a, b) => (a.prioridade || 9) - (b.prioridade || 9));

      sucessoes.forEach((aresta, i) => {
        const pessoa = nosPorId[aresta.de];
        if (!pessoa) return;
        const ponto = { x: cx + 250, y: y - 44 + i * 46 };
        pessoas.push({ no: pessoa, x: ponto.x, y: ponto.y, tipo: "sucessao", aderencia: aresta.aderencia, prioridade: aresta.prioridade });
        conexoes.push({ de: ponto, para: { x: cx, y }, tipo: "sucessao", aderencia: aresta.aderencia, prioridade: aresta.prioridade });
      });
    });

    const unicas: Record<string, { no: NoMapa; x: number; y: number; tipo: string; aderencia?: number; prioridade?: number }> = {};
    pessoas.forEach((p) => {
      const existente = unicas[p.no.id];
      if (!existente || p.tipo === "ocupa") unicas[p.no.id] = p;
    });

    return { posicionados, pessoas: Object.keys(unicas).map((k) => unicas[k]), conexoes, largura, altura };
  }, [dados, posicoesFiltradas]);

  const relacionadas = useMemo(() => {
    if (!selecionado) return null;
    const conjunto = new Set<string>([selecionado]);
    dados.arestas.forEach((a) => {
      if (a.de === selecionado) conjunto.add(a.para);
      if (a.para === selecionado) conjunto.add(a.de);
    });
    return conjunto;
  }, [selecionado, dados.arestas]);

  if (!layout.posicionados.length) {
    return (
      <Vazio
        icone={Network}
        titulo="Nenhuma posição para exibir"
        descricao="Cadastre posições-chave e mapeie sucessores para visualizar o grafo de sucessão."
      />
    );
  }

  return (
    <div className="rounded-sgp-lg border border-border bg-surface shadow-n1">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-xs text-fg-muted">
          {numero(layout.posicionados.length)} posições · {numero(layout.pessoas.length)} pessoas · {numero(layout.conexoes.length)} conexões
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted"><span className="h-0.5 w-5 rounded-full bg-brand" />ocupa a posição</span>
          <span className="inline-flex items-center gap-1.5 text-2xs text-fg-muted"><span className="h-0.5 w-5" style={{ borderTop: "2px dashed #7C3AED" }} />sucessão mapeada</span>
        </div>
      </div>

      <div className="overflow-auto rounded-b-sgp-lg bg-bg-alt scroll-thin">
        <svg viewBox={"0 0 " + layout.largura + " " + layout.altura} width="100%" height={Math.min(720, layout.altura)} role="img" aria-label="Mapa de sucessão das posições-chave">
          {layout.conexoes.map((c, i) => {
            const origem = layout.pessoas.find((p) => p.x === c.de.x && p.y === c.de.y);
            const destino = layout.posicionados.find((p) => p.x === c.para.x && p.y === c.para.y);
            const destaque = relacionadas ? (
              (origem && relacionadas.has(origem.no.id)) || (destino && relacionadas.has(destino.no.id))
            ) : true;
            const espessura = c.tipo === "sucessao" ? Math.max(1, 4 - (c.prioridade || 1)) : 2;
            return (
              <line
                key={i}
                x1={c.de.x}
                y1={c.de.y}
                x2={c.para.x}
                y2={c.para.y}
                stroke={c.tipo === "sucessao" ? "#7C3AED" : "#2563EB"}
                strokeWidth={destaque ? espessura : 0.8}
                strokeDasharray={c.tipo === "sucessao" ? "6 4" : undefined}
                opacity={destaque ? 0.75 : 0.15}
              />
            );
          })}

          {layout.pessoas.map((p) => {
            const visivel = relacionadas ? relacionadas.has(p.no.id) : true;
            const raio = p.tipo === "ocupa" ? 24 : 20;
            return (
              <g
                key={p.no.id + "-" + p.y}
                transform={"translate(" + p.x + " " + p.y + ")"}
                opacity={visivel ? 1 : 0.28}
                className="cursor-pointer"
                onClick={() => selecionado === p.no.id ? aoSelecionar("") : aoSelecionar(p.no.id)}
                onDoubleClick={() => aoAbrirPessoa(Number(p.no.id.replace("usr-", "")))}
              >
                <circle r={raio} fill={p.no.cor || "#64748B"} stroke={selecionado === p.no.id ? "#2563EB" : "var(--sgp-surface)"} strokeWidth={selecionado === p.no.id ? 3 : 2} />
                <text y={4} textAnchor="middle" className="fill-white text-[10px] font-bold">
                  {p.no.titulo.split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase()}
                </text>
                <text y={raio + 13} textAnchor="middle" className="fill-fg text-[10px] font-medium">
                  {p.no.titulo.length > 20 ? p.no.titulo.slice(0, 19) + "…" : p.no.titulo}
                </text>
                {p.tipo === "sucessao" && (
                  <text y={raio + 24} textAnchor="middle" className="fill-fg-subtle text-[9px]">
                    {p.no.subtitulo || ROTULO_PRONTIDAO.PRONTO_1_2_ANOS}{p.aderencia !== undefined ? " · " + numero(p.aderencia, 0) + "%" : ""}
                  </text>
                )}
              </g>
            );
          })}

          {layout.posicionados.map((p) => {
            const visivel = relacionadas ? relacionadas.has(p.no.id) : true;
            const cor = COR_CRITICIDADE[p.no.criticidade || ""] || "#7C3AED";
            return (
              <g
                key={p.no.id}
                transform={"translate(" + p.x + " " + p.y + ")"}
                opacity={visivel ? 1 : 0.3}
                className="cursor-pointer"
                onClick={() => {
                  const id = p.no.id;
                  aoSelecionar(selecionado === id ? "" : id);
                  aoAbrirPosicao(Number(id.replace("pos-", "")));
                }}
              >
                <rect x={-110} y={-38} width={220} height={76} rx={12} fill={comAlfa(cor, 0.12)} stroke={selecionado === p.no.id ? "#2563EB" : cor} strokeWidth={selecionado === p.no.id ? 3 : 1.8} />
                <text y={-16} textAnchor="middle" className="fill-fg text-[12px] font-bold">
                  {p.no.titulo.length > 26 ? p.no.titulo.slice(0, 25) + "…" : p.no.titulo}
                </text>
                <text y={1} textAnchor="middle" className="fill-fg-muted text-[10px]">
                  {p.no.subtitulo || "Área não informada"}
                </text>
                <text y={18} textAnchor="middle" className="fill-fg-subtle text-[9px]">
                  criticidade {p.no.criticidade || "—"} · risco {p.no.risco || "—"}
                </text>
                <text y={31} textAnchor="middle" style={{ fill: cor }} className="text-[9px] font-semibold">
                  {p.no.ocupante ? "ocupada por " + (p.no.ocupante.length > 22 ? p.no.ocupante.slice(0, 21) + "…" : p.no.ocupante) : "posição vaga"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ==========================================================================
   Painel: plano de sucessão da posição
   ========================================================================== */

function PainelPosicao({
  posicao, podeEditar, onFechar, aoAdicionarSucessor, aoEditarPosicao, aoExcluirPosicao,
  aoEditarPlano, aoExcluirPlano, aoAbrirPessoa,
}: {
  posicao: PosicaoChave | null;
  podeEditar: boolean;
  onFechar: () => void;
  aoAdicionarSucessor: (p: PosicaoChave) => void;
  aoEditarPosicao: (p: PosicaoChave) => void;
  aoExcluirPosicao: (p: PosicaoChave) => void;
  aoEditarPlano: (plano: PlanoSucessao) => void;
  aoExcluirPlano: (plano: PlanoSucessao) => void;
  aoAbrirPessoa: (id: number) => void;
}) {
  const planos = useLista<PlanoSucessao>(CHAVES.sucessao, posicao ? "/capacidades/sucessao/" : null, { posicao: posicao ? posicao.id : undefined, page_size: 100 });

  return (
    <PainelLateral
      aberto={Boolean(posicao)}
      onFechar={onFechar}
      titulo={posicao ? posicao.titulo : "Posição-chave"}
      subtitulo={posicao ? (posicao.area || "Área não informada") + " · criticidade " + posicao.criticidade : undefined}
      largura="lg"
      rodape={
        posicao && podeEditar ? (
          <>
            <Botao variante="secundario" icone={Pencil} className="mr-auto" onClick={() => aoEditarPosicao(posicao)}>Editar posição</Botao>
            <Botao variante="perigo" icone={Trash2} onClick={() => aoExcluirPosicao(posicao)}>Excluir</Botao>
            <Botao variante="primario" icone={UserPlus} onClick={() => aoAdicionarSucessor(posicao)}>Adicionar sucessor</Botao>
          </>
        ) : undefined
      }
    >
      {posicao && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Risco de sucessão</p>
              <p className="text-lg font-bold" style={{ color: COR_RISCO[posicao.risco_sucessao] || "#64748B" }}>{posicao.risco_sucessao}</p>
            </div>
            <div className="rounded-sgp border border-border bg-surface-2 p-3">
              <p className="text-2xs uppercase tracking-wide text-fg-muted">Sucessores mapeados</p>
              <p className="text-lg font-bold tabular-nums text-fg">{numero(posicao.total_sucessores)}</p>
            </div>
          </div>

          <div className="rounded-sgp-lg border border-border bg-surface p-3">
            <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Ocupante atual</p>
            {posicao.ocupante_detalhe ? (
              <button type="button" onClick={() => aoAbrirPessoa(posicao.ocupante as number)} className="flex w-full items-center gap-3 rounded-sgp border border-border bg-surface-2 p-2.5 text-left hover:border-border-strong">
                <Avatar nome={posicao.ocupante_detalhe.nome} cor={posicao.ocupante_detalhe.cor} iniciais={posicao.ocupante_detalhe.iniciais} tamanho="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-fg">{posicao.ocupante_detalhe.nome}</p>
                  <p className="truncate text-2xs text-fg-muted">{posicao.ocupante_detalhe.cargo} · {posicao.ocupante_detalhe.area}</p>
                </div>
                <Etiqueta tom="info">Ver perfil</Etiqueta>
              </button>
            ) : (
              <Alerta tom="warning" titulo="Posição vaga">
                Nenhum ocupante definido — o risco de descontinuidade é imediato.
              </Alerta>
            )}
          </div>

          {posicao.skills_detalhe.length > 0 && (
            <div>
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Capacidades críticas da posição</p>
              <div className="flex flex-wrap gap-1.5">
                {posicao.skills_detalhe.map((s) => (
                  <Chip key={s.id} cor={s.cor || "#F59E0B"}>{s.nome} · {s.criticidade}</Chip>
                ))}
              </div>
            </div>
          )}

          {posicao.observacao && <p className="rounded-sgp border border-border bg-surface-2 p-3 text-2xs text-fg-muted">{posicao.observacao}</p>}

          <div>
            <h4 className="mb-2 text-sm font-semibold text-fg">Planos de desenvolvimento</h4>
            {planos.isLoading && <CarregandoBloco rotulo="Carregando sucessores..." />}
            {planos.isError && <Alerta tom="danger" titulo="Não foi possível carregar os planos">{mensagemErro(planos.error)}</Alerta>}
            {planos.data && planos.data.length === 0 && (
              <Vazio icone={Users} titulo="Nenhum sucessor mapeado" descricao="Mapeie candidatos com prontidão, aderência e plano de desenvolvimento." />
            )}
            <ul className="space-y-2">
              {(planos.data || []).map((plano) => (
                <li key={plano.id} className="rounded-sgp-lg border border-border bg-surface p-3">
                  <div className="flex items-start gap-2.5">
                    <Avatar nome={plano.sucessor_detalhe?.nome} cor={plano.sucessor_detalhe?.cor} iniciais={plano.sucessor_detalhe?.iniciais} tamanho="md" />
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => aoAbrirPessoa(plano.sucessor)} className="max-w-full truncate text-xs font-semibold text-fg hover:text-brand">
                        {plano.sucessor_detalhe?.nome || "Sucessor " + plano.sucessor}
                      </button>
                      <p className="truncate text-2xs text-fg-muted">{plano.sucessor_detalhe?.cargo || "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Etiqueta tom="neutral">prioridade {numero(plano.prioridade)}</Etiqueta>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Etiqueta tom={TOM_PRONTIDAO[plano.prontidao] || "neutral"} icone={GraduationCap}>{plano.prontidao_rotulo || ROTULO_PRONTIDAO[plano.prontidao]}</Etiqueta>
                    <Etiqueta tom="info">aderência {percentual(plano.aderencia, 0)}</Etiqueta>
                  </div>

                  <div className="mt-2">
                    <BarraProgresso valor={plano.aderencia} cor={corPorValor(plano.aderencia / 100)} altura="sm" />
                  </div>

                  {plano.plano_desenvolvimento && (
                    <p className="mt-2 rounded-sgp border border-border bg-surface-2 p-2 text-2xs text-fg-muted">{plano.plano_desenvolvimento}</p>
                  )}

                  {(plano.gaps || []).length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {(plano.gaps || []).map((g, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-2xs text-fg-muted">
                          <AlertTriangle className="size-3 shrink-0 text-warning" aria-hidden />
                          {g.descricao || (g.skill ? g.skill + ": nível " + numero(g.atual || 0, 1) + " de " + numero(g.requerido || 0, 1) : "Gap não detalhado")}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
                    <p className="text-2xs text-fg-subtle">Mapeado em {dataCurta(plano.criado_em)}</p>
                    {podeEditar && (
                      <span className="flex items-center gap-1">
                        <BotaoIcone
                          icone={Pencil}
                          rotulo={"Editar plano de " + (plano.sucessor_detalhe?.nome || "sucessor")}
                          tamanho="xs"
                          onClick={() => aoEditarPlano(plano)}
                        />
                        <BotaoIcone
                          icone={Trash2}
                          rotulo={"Excluir " + (plano.sucessor_detalhe?.nome || "sucessor") + " do plano"}
                          variante="perigo"
                          tamanho="xs"
                          onClick={() => aoExcluirPlano(plano)}
                        />
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </PainelLateral>
  );
}

/* ==========================================================================
   Painel: adicionar sucessor
   ========================================================================== */

function PainelSucessor({
  posicao, plano, onFechar, aoConcluir,
}: {
  posicao: PosicaoChave | null;
  plano: PlanoSucessao | null;
  onFechar: () => void;
  aoConcluir: () => void;
}) {
  const editando = Boolean(plano);
  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, posicao ? "/usuarios/" : null, { ativo: true, page_size: 300 });
  const [sucessor, setSucessor] = useState("");
  const [prontidao, setProntidao] = useState("PRONTO_1_2_ANOS");
  const [aderencia, setAderencia] = useState(60);
  const [prioridade, setPrioridade] = useState(1);
  const [desenvolvimento, setDesenvolvimento] = useState("");

  useEffect(() => {
    if (!posicao) return;
    if (plano) {
      setSucessor(String(plano.sucessor));
      setProntidao(plano.prontidao);
      setAderencia(Math.round(plano.aderencia || 0));
      setPrioridade(plano.prioridade || 1);
      setDesenvolvimento(plano.plano_desenvolvimento || "");
      return;
    }
    setSucessor("");
    setProntidao("PRONTO_1_2_ANOS");
    setAderencia(60);
    setPrioridade(1);
    setDesenvolvimento("");
  }, [posicao, plano]);

  const salvar = useMutacao<Record<string, unknown>, PlanoSucessao>({
    metodo: editando ? "patch" : "post",
    url: () => (plano ? "/capacidades/sucessao/" + plano.id + "/" : "/capacidades/sucessao/"),
    invalidar: [CHAVES.sucessao],
    mensagemSucesso: editando ? "Plano de sucessão atualizado" : "Sucessor mapeado",
    aoSucesso: () => {
      aoConcluir();
      onFechar();
    },
  });

  return (
    <PainelLateral
      aberto={Boolean(posicao)}
      onFechar={onFechar}
      titulo={editando ? "Editar sucessor" : "Adicionar sucessor"}
      subtitulo={posicao ? posicao.titulo : undefined}
      largura="md"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            icone={editando ? Check : UserPlus}
            carregando={salvar.isPending}
            disabled={!sucessor}
            onClick={() =>
              posicao && salvar.mutate({
                posicao: posicao.id,
                sucessor: Number(sucessor),
                prontidao,
                aderencia: Number(aderencia),
                prioridade: Number(prioridade),
                plano_desenvolvimento: desenvolvimento,
              })
            }
          >
            {editando ? "Salvar alterações" : "Mapear sucessor"}
          </Botao>
        </>
      }
    >
      {posicao && (
        <div className="space-y-4">
          <Alerta tom="info" titulo="Prontidão e aderência">
            A aderência representa o quanto o candidato já atende às capacidades críticas da posição. Use o plano de
            desenvolvimento para registrar o caminho até a prontidão.
          </Alerta>

          <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
            <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Posição</p>
            <p className="text-sm font-semibold text-fg">{posicao.titulo}</p>
            <p className="text-2xs text-fg-muted">{posicao.area || "Área não informada"} · criticidade {posicao.criticidade} · risco {posicao.risco_sucessao}</p>
            {posicao.skills_detalhe.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {posicao.skills_detalhe.map((s) => (<Chip key={s.id} cor={s.cor || "#F59E0B"}>{s.nome}</Chip>))}
              </div>
            )}
          </div>

          <Campo rotulo="Sucessor" obrigatorio htmlFor="su-pessoa">
            <Selecao id="su-pessoa" value={sucessor} onChange={(e) => setSucessor(e.target.value)}>
              <option value="">Selecione o colaborador</option>
              {(usuarios.data || [])
                .filter((u) => u.id !== posicao.ocupante)
                .map((u) => (<option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>))}
            </Selecao>
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Prontidão" htmlFor="su-pront">
              <Selecao id="su-pront" value={prontidao} onChange={(e) => setProntidao(e.target.value)}>
                <option value="PRONTO_AGORA">Pronto agora</option>
                <option value="PRONTO_1_2_ANOS">Pronto em 1–2 anos</option>
                <option value="PRONTO_3_5_ANOS">Pronto em 3–5 anos</option>
                <option value="DESENVOLVER">A desenvolver</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Prioridade" htmlFor="su-prio" dica="1 é a maior prioridade.">
              <Entrada id="su-prio" type="number" min="1" max="9" value={prioridade} onChange={(e) => setPrioridade(Number(e.target.value))} />
            </Campo>
          </div>

          <ControleDeslizante
            valor={aderencia}
            onChange={setAderencia}
            min={0}
            max={100}
            rotulo="Aderência às capacidades da posição"
            sufixo="%"
            cor={corPorValor(aderencia / 100)}
            marcos={[0, 25, 50, 75, 100]}
          />

          <Campo rotulo="Plano de desenvolvimento" htmlFor="su-plano" dica="Ações, mentorias e prazos para atingir a prontidão.">
            <AreaTexto
              id="su-plano"
              rows={5}
              value={desenvolvimento}
              onChange={(e) => setDesenvolvimento(e.target.value)}
              placeholder="Ex.: mentoria com o ocupante atual por 6 meses, certificação em arquitetura e condução de duas iniciativas críticas."
            />
          </Campo>

          {sucessor && (
            <div className="rounded-sgp-lg border border-border bg-surface-2 p-3">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-fg-muted">Resumo do mapeamento</p>
              <p className="text-2xs text-fg-muted">
                {(usuarios.data || []).find((u) => String(u.id) === sucessor)?.nome} · {ROTULO_PRONTIDAO[prontidao]} · aderência {percentual(aderencia, 0)} ·
                prioridade {numero(prioridade)}
              </p>
            </div>
          )}
        </div>
      )}
    </PainelLateral>
  );
}

/* ==========================================================================
   Modal: nova posição-chave / edição
   ========================================================================== */

function ModalPosicao({
  aberto, posicao, onFechar, aoConcluir,
}: {
  aberto: boolean;
  posicao: PosicaoChave | null;
  onFechar: () => void;
  aoConcluir: () => void;
}) {
  const editando = Boolean(posicao);
  const usuarios = useLista<UsuarioResumo>(CHAVES.usuarios, aberto ? "/usuarios/" : null, { ativo: true, page_size: 300 });
  const skills = useLista<Skill>(CHAVES.skills, aberto ? "/capacidades/skills/" : null, { page_size: 300 });

  const [form, setForm] = useState({
    titulo: "", area: "", ocupante: "", gestor: "", criticidade: "ALTA",
    risco_sucessao: "MEDIO", observacao: "",
  });
  const [selecionadas, setSelecionadas] = useState<number[]>([]);

  useEffect(() => {
    if (!aberto) return;
    if (posicao) {
      setForm({
        titulo: posicao.titulo,
        area: posicao.area,
        ocupante: posicao.ocupante ? String(posicao.ocupante) : "",
        gestor: posicao.gestor ? String(posicao.gestor) : "",
        criticidade: posicao.criticidade,
        risco_sucessao: posicao.risco_sucessao,
        observacao: posicao.observacao,
      });
      setSelecionadas(posicao.skills_criticas || []);
      return;
    }
    setForm({ titulo: "", area: "", ocupante: "", gestor: "", criticidade: "ALTA", risco_sucessao: "MEDIO", observacao: "" });
    setSelecionadas([]);
  }, [aberto, posicao]);

  const salvar = useMutacao<Record<string, unknown>, PosicaoChave>({
    metodo: editando ? "patch" : "post",
    url: () => (posicao ? "/capacidades/posicoes/" + posicao.id + "/" : "/capacidades/posicoes/"),
    invalidar: [CHAVES.sucessao, ["posicoes"]],
    mensagemSucesso: editando ? "Posição-chave atualizada" : "Posição-chave criada",
    aoSucesso: () => {
      aoConcluir();
      onFechar();
    },
  });

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={editando ? "Editar posição-chave" : "Nova posição-chave"}
      subtitulo={editando ? posicao?.titulo : "Posições críticas monitoradas no mapa de sucessão (RF-87)"}
      largura="lg"
      rodape={
        <>
          <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao
            variante="primario"
            icone={editando ? Check : Plus}
            carregando={salvar.isPending}
            disabled={!form.titulo.trim()}
            onClick={() =>
              salvar.mutate({
                titulo: form.titulo,
                area: form.area,
                ocupante: form.ocupante ? Number(form.ocupante) : null,
                gestor: form.gestor ? Number(form.gestor) : null,
                criticidade: form.criticidade,
                risco_sucessao: form.risco_sucessao,
                observacao: form.observacao,
                skills_criticas: selecionadas,
              })
            }
          >
            {editando ? "Salvar alterações" : "Criar posição"}
          </Botao>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo rotulo="Título da posição" obrigatorio htmlFor="np-titulo" className="sm:col-span-2">
          <Entrada id="np-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Gerente de Arquitetura de Dados" />
        </Campo>
        <Campo rotulo="Área" htmlFor="np-area">
          <Entrada id="np-area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="Ex.: Tecnologia" />
        </Campo>
        <Campo rotulo="Criticidade" htmlFor="np-crit">
          <Selecao id="np-crit" value={form.criticidade} onChange={(e) => setForm({ ...form, criticidade: e.target.value })}>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="ESTRATEGICA">Estratégica</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Ocupante atual" htmlFor="np-ocup">
          <Selecao id="np-ocup" value={form.ocupante} onChange={(e) => setForm({ ...form, ocupante: e.target.value })}>
            <option value="">Posição vaga</option>
            {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Gestor responsável" htmlFor="np-gestor">
          <Selecao id="np-gestor" value={form.gestor} onChange={(e) => setForm({ ...form, gestor: e.target.value })}>
            <option value="">Sem gestor definido</option>
            {(usuarios.data || []).map((u) => (<option key={u.id} value={u.id}>{u.nome}</option>))}
          </Selecao>
        </Campo>
        <Campo rotulo="Risco de sucessão" htmlFor="np-risco" dica="Avalie a dificuldade de reposição da posição.">
          <Selecao id="np-risco" value={form.risco_sucessao} onChange={(e) => setForm({ ...form, risco_sucessao: e.target.value })}>
            <option value="BAIXO">Baixo</option>
            <option value="MEDIO">Médio</option>
            <option value="ALTO">Alto</option>
            <option value="CRITICO">Crítico</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Observações" htmlFor="np-obs" className="sm:col-span-2">
          <AreaTexto id="np-obs" rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Contexto da posição, exposição e impactos de uma vacância." />
        </Campo>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold text-fg">Capacidades críticas ({numero(selecionadas.length)})</p>
          <div className="flex flex-wrap gap-1.5">
            {selecionadas.map((id) => {
              const s = (skills.data || []).find((x) => x.id === id);
              return (
                <Chip key={id} cor={s?.cor || "#F59E0B"} removivel onRemover={() => setSelecionadas(selecionadas.filter((x) => x !== id))}>
                  {s?.nome || "Capacidade " + id}
                </Chip>
              );
            })}
            {selecionadas.length === 0 && <span className="text-2xs text-fg-subtle">Nenhuma capacidade selecionada.</span>}
          </div>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-sgp border border-border bg-surface-2 p-2 scroll-thin">
            <div className="flex flex-wrap gap-1.5">
              {(skills.data || []).slice(0, 80).map((s) => {
                const marcada = selecionadas.indexOf(s.id) >= 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelecionadas(marcada ? selecionadas.filter((x) => x !== s.id) : selecionadas.concat([s.id]))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-medium transition-all",
                      marcada ? "border-brand bg-brand-soft/50 text-brand" : "border-border bg-surface text-fg-muted hover:border-border-strong"
                    )}
                  >
                    {marcada && <Check className="size-3" aria-hidden />}
                    {s.nome}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <Alerta tom="info" titulo="Próximos passos">
            Após criar a posição, mapeie os sucessores com prontidão, aderência e plano de desenvolvimento para que o
            mapa de sucessão reflita a cobertura real.
          </Alerta>
        </div>
      </div>
    </Modal>
  );
}
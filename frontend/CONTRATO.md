# Contrato de implementação — páginas do SGP (frontend React)

Você está implementando **páginas** de uma SPA React 19 + TypeScript + Vite + Tailwind v4.
Vários agentes trabalham em paralelo em arquivos diferentes. **Siga este contrato à risca.**

## Regras invioláveis

1. **Não crie nem altere** arquivos fora da sua lista de páginas atribuídas.
2. **Não rode `npx tsc`** — outros agentes ainda estão escrevendo arquivos e você veria erros que não são seus.
3. **Não instale dependências.** As disponíveis são: react, react-dom, react-router-dom,
   @tanstack/react-query, axios, zustand, lucide-react, @dnd-kit/{core,sortable,modifiers,utilities},
   date-fns, clsx, tailwind-merge. **Não use bibliotecas de gráficos** — use os componentes de `@/components/charts`.
4. **Sem backticks em templates dentro de template literals** ao escrever arquivos — use concatenação com `+`.
5. Todo texto da interface em **português do Brasil**. Acessibilidade: use `aria-label`, `title`, `role` quando fizer sentido.
6. Sem TODOs, sem placeholders, sem `any` desnecessário, sem dados mock — **sempre consuma a API real**.

## Design system (especificação §2)

- Tokens Tailwind disponíveis: `bg-bg`, `bg-bg-alt`, `bg-surface`, `bg-surface-2`, `bg-surface-3`,
  `border-border`, `border-border-strong`, `text-fg`, `text-fg-muted`, `text-fg-subtle`,
  `text-brand`, `bg-brand`, `bg-brand-soft`, `text-brand-fg`, `text-success`, `bg-success-soft`,
  `text-warning`, `bg-warning-soft`, `text-danger`, `bg-danger-soft`, `text-info`, `bg-info-soft`,
  `bg-neutral-soft`, `rounded-sgp`, `rounded-sgp-lg`, `rounded-sgp-xl`, `shadow-n1`, `shadow-n2`, `shadow-n3`,
  `text-2xs`.
- Modo escuro é automático via tokens — **nunca** use `dark:` nem cores fixas `bg-white`/`text-black`.
  Para cores dinâmicas por dado use `style={{ backgroundColor: cor + "1f", color: cor }}` (hex + alfa).
- Animações prontas: `animate-entrada`, `animate-level-up`, `animate-pulso-alerta`, `animate-desliza`.
- Densidade do usuário é aplicada por CSS vars — use o utilitário `sgp-pad` só quando fizer sentido.

## Imports permitidos

```ts
import { useNavigate, useParams, useSearchParams, Link, NavLink } from "react-router-dom";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { /* ...icones... */ } from "lucide-react";

// Biblioteca de UI — TODOS estes exports existem em "@/components/ui"
import {
  Abas, Alerta, AnelProgresso, AreaTexto, Avatar, BarraFerramentas, BarraProgresso, Botao, BotaoIcone,
  CabecalhoPagina, Campo, CarregandoBloco, Chip, ControleDeslizante, Dica, Entrada, EntradaBusca,
  Esqueleto, EstadoVazioTabela, Etiqueta, FiltrosAtivos, GradeCards, Interruptor, KPI, Marca, Modal,
  PainelLateral, PilhaAvatares, SecaoColapsavel, Segmentado, Selecao, Semaforo, Tabela,
  Vazio, useAvisos, TONS, CORES_SAUDE, CORES_PRIORIDADE,
  type ColunaTabela, type Tom, type PropsBotao, type BarraItem, type FatiaDonut,
} from "@/components/ui";

// Gráficos (SVG puro, sem dependências)
import {
  GraficoDonut, GraficoBarras, GraficoLinha, Medidor, RadarSkills, Heatmap, EscalaCores, Sparkline,
  type Serie, type FatiaDonut as FatiaDonutChart, type BarraItem as BarraItemChart, type CelulaHeatmap,
} from "@/components/charts";

// Gantt e timeline
import { Gantt } from "@/components/gantt";
import { Timeline, type ItemTimeline } from "@/components/timeline";

// Blocos de layout
import { AppShell, GradeCards, LinhaKPI, FiltroSelect } from "@/components/layout";

// Dados
import { useConsulta, useLista, useMutacao, CHAVES } from "@/hooks";
import { api, mensagemErro } from "@/lib/api";

// Utilidades
import { cn, comAlfa, corPorValor, corNivel, ajustarCor, agrupar, soma, media, nivelLegenda } from "@/lib/utils";
import {
  dataCurta, dataMedia, dataHora, dataRelativa, mesCurto, diasEntre, moeda, numero, percentual,
  horas, indice, intervalo, iniciaisDe, hojeISO, somarDias, inicioDoMes, MESES, DIAS_SEMANA,
} from "@/lib/format";

// Estado global
import { useAuth } from "@/store/auth";
import { useUi } from "@/store/ui";

// Tipos do domínio (todos existem em "@/lib/types")
import type {
  Alocacao, AcaoPDI, CelulaForecast, CelulaMatrizRisco, ChecklistItem, ColunaMatrizSkills, Comentario,
  ConflitoAlocacao, Dependencia, EVM, EventoCalendario, GapItem, ID, Issue, Lancamento, LinhaForecast,
  LinhaMatrizSkills, Marco, Notificacao, Orcamento, PayloadCronograma, PDI, PerfilNivelCriterio, PerfilSkill,
  Prioridade, Projeto, ProjetoResumo, Recurso, Recomendacao, ResultadoMatching, Risco, Saude, Skill,
  StatusTarefa, SugestaoPromocao, Tarefa, TarefaGantt, Timesheet, Trilha, Usuario, UsuarioResumo, WidgetCatalogo,
} from "@/lib/types";
```

## Assinaturas exatas dos componentes mais usados

```ts
// Botão
<Botao variante="primario|secundario|fantasma|perigo|sucesso|aviso" tamanho="xs|sm|md|lg"
       icone={Icone} iconeDireita={Icone} carregando larguraTotal onClick>Texto</Botao>
<BotaoIcone icone={Icone} rotulo="..." variante=... tamanho=... ativo onClick />

// Cartão
<Cartao titulo="..." subtitulo="..." acao={<Botao/>} icone={Icone} corIcone="#3B82F6"
        interativo selecionado semPadding elevacao={1|2|3}>conteúdo</Cartao>

// Etiquetas e chips
<Etiqueta tom="brand|success|warning|danger|info|neutral" icone={Icone} cor="#hex" solido>texto</Etiqueta>
<Chip cor="#hex" icone={Icone} removivel onRemover onClick ativo>texto</Chip>
<Semaforo saude="VERDE|AMARELO|VERMELHO|CINZA" comRotulo tamanho="sm|md|lg" />

// Progresso
<BarraProgresso valor={45} comparativo={60} cor="#hex" altura="sm|md|lg" mostrarValor rotulo="..." />
<AnelProgresso valor={72} tamanho={110} espessura={10} cor="#hex" rotulo="72%" subrotulo="concluído" />

// Avatares
<Avatar nome cor iniciais url tamanho="xs|sm|md|lg|xl" anel />
<PilhaAvatares pessoas={[{id,nome,cor,iniciais,avatar_display}]} maximo={4} tamanho="sm" />

// Formulários
<Campo rotulo="Nome" dica="..." erro="..." obrigatorio htmlFor="id"><Entrada id="id" /></Campo>
<Entrada value onChange placeholder type disabled />
<EntradaBusca valor={q} onChange={setQ} placeholder="Buscar..." />
<AreaTexto rows={4} value onChange />
<Selecao value onChange><option value="">Todos</option></Selecao>
<Interruptor ativo={v} onChange={setV} rotulo="..." descricao="..." tamanho="sm|md" />
<ControleDeslizante valor={v} onChange={setV} min={0} max={100} rotulo="..." sufixo="%" marcos={[0,25,50,75,100]} />
<Segmentado valor={v} onChange={setV} opcoes={[{valor,rotulo,icone,titulo}]} tamanho="sm|md" />
<Abas valor={v} onChange={setV} abas={[{valor,rotulo,icone,contagem}]} />

// Feedback
<Vazio icone={Icone} titulo="..." descricao="..." acao={<Botao/>} />
<Esqueleto linhas={3} /> <CarregandoBloco rotulo="Carregando..." />
<Alerta tom="info|success|warning|danger" titulo="..." icone={Icone} acao={<Botao/>}>texto</Alerta>
<KPI rotulo="..." valor="R$ 1,2 mi" variacao={-4.2} icone={Icone} cor="#hex" subrotulo="..." compacto />
<SecaoColapsavel titulo="..." icone={Icone} abertoInicial contagem={3}>conteúdo</SecaoColapsavel>

// Sobreposições
<Modal aberto onFechar titulo subtitulo rodape={<Botao/>} largura="sm|md|lg|xl|full">conteúdo</Modal>
<PainelLateral aberto onFechar titulo subtitulo rodape largura="sm|md|lg|xl">conteúdo</PainelLateral>
<Dica texto="ajuda">{elemento}</Dica>

// Barra de ferramentas e filtros
<BarraFerramentas><EntradaBusca/><FiltroSelect rotulo="Status" valor={s} onChange={setS} opcoes={[{valor,rotulo}]} /></BarraFerramentas>
<FiltrosAtivos filtros={[{chave,rotulo,valor,cor,onRemover}]} onLimpar={()=>{}} />

// Cabeçalho de página
<CabecalhoPagina titulo="Projetos" subtitulo="12 ativos" icone={FolderKanban} cor="#3B82F6"
                 acoes={<Botao variante="primario" icone={Plus}>Novo</Botao>}
                 migalhas={[{rotulo:"Início",onClick:()=>nav("/")},{rotulo:"Projetos"}]}>
  {/* filhos opcionais abaixo do título */}
</CabecalhoPagina>

// Tabela genérica e ordenável
<Tabela colunas={[{chave:"nome",titulo:"Nome",largura:"220px",alinhar:"left|right|center",
                   ordenavel:true, valorOrdenacao:(i)=>i.nome, renderizar:(i)=>(...) }]}
         dados={lista} vazio={<Vazio titulo="Nada aqui" />} aoClicarLinha={(i)=>nav(...)}
         destaqueLinha={(i)=> i.atrasado ? "bg-danger-soft/25" : undefined} compacta />

// Grade responsiva
<GradeCards colunas="auto"|2|3|4|5|6>...</GradeCards>
<LinhaKPI itens={[{rotulo,valor,icone,cor,subrotulo,variacao}]} />

// Gráficos
<GraficoDonut fatias={[{rotulo,valor,cor}]} tamanho={168} espessura={22} centroRotulo="projetos"
              centroValor={12} legenda unidade="" />
<GraficoBarras itens={[{rotulo,valor,cor,comparativo,meta}]} altura={200} horizontal
              formatarValor={(v)=>moeda(v,true)} mostrarEixo larguraBarra={6} />
<GraficoLinha rotulos={["jan","fev"]} series={[{nome:"PV",cor:"#3B82F6",dados:[1,2],tracejada,area}]}
              altura={260} formatarValor={(v)=>moeda(v,true)} mostrarLegenda mostrarArea
              marcadorIndice={indiceHoje} aoClicarPonto={(i,serie)=>{}} />
<Medidor valor={0.92} titulo="CPI" meta={1} tamanho={140} formato={(v)=>v.toFixed(2)} />
<RadarSkills eixos={["AWS","SQL","React"]} tamanho={300} maximo={5}
             series={[{nome:"Atual",cor:"#3B82F6",valores:[4,3,5]},{nome:"Desejado",cor:"#F59E0B",valores:[5,4,5],preenchido:false}]} />
<Heatmap linhas={[{id,rotulo,sub,cor,avatar}]} colunas={[{id,rotulo,sub,cor,icone}]}
         celulas={(linhaId,colunaId)=>({valor:3,rotulo:"AWS: N3",detalhe:<>...</>})}
         maximo={5} formatoValor={(v)=>v?v:"—"} larguraColuna={34} larguraLinha={190}
         aoClicarCelula={(l,c)=>{}} compacto legenda={<EscalaCores rotulos={["1","2","3","4","5"]} cores={["#334155","#0369a1","#0891b2","#059669","#7c3aed"]} titulo="Nível" />} />
<EscalaCores rotulos={["Baixo","Médio","Alto"]} cores={["#10B981","#F59E0B","#EF4444"]} titulo="Severidade" />
<Sparkline dados={[1,3,2,5,4]} cor="#2563EB" altura={32} largura={96} area />

// Gantt (já implementado — apenas use)
<Gantt tarefas={PayloadCronograma["tarefas"]} dependencias={payload.dependencias} marcos={payload.marcos}
       zoom={1} aoReagendar={(id,inicio,fim)=>mut.mutate({...})} aoSelecionar={setSelecionada}
       selecionada={sel} mostrarCritico mostrarDependencias alturaMaxima={560} />

// Timeline de portfólio
<Timeline itens={[{id,codigo,nome,cor,inicio,fim,saude,status_rotulo,percentual,progresso_planejado,
                   gerente,programa,atrasado,orcamento,tarefas,marcos,onClick}]}
          zoomInicial={1} mostrarMarcos agruparPor={(i)=>i.programa} />

// Avisos (toasts)
const { sucesso, erro, alerta, avisar } = useAvisos();
```

## Camada de dados

```ts
// Consulta de objeto único
const { data, isLoading, isError } = useConsulta<Projeto>(CHAVES.projeto(id), id ? "/projetos/" + id + "/" : null);

// Consulta de lista (desembrulha {results: []} automaticamente)
const { data: projetos = [] } = useLista<ProjetoResumo>(CHAVES.projetosCards, "/projetos/cards/", { status });

// Mutação — invalidação automática + toast de sucesso/erro
const mover = useMutacao<{ id: number; status: string }, Tarefa>({
  url: (v) => "/tarefas/" + v.id + "/mover/",
  invalidar: [CHAVES.kanban(projetoId), CHAVES.tarefas],
  mensagemSucesso: "Card movido",
});
mover.mutate({ id: 3, status: "EM_ANDAMENTO" });
```

Para chamadas pontuais use `api.get`, `api.getLista`, `api.post`, `api.patch`, `api.del`, `api.upload`.
Erros: `mensagemErro(erro)`.

## Endpoints da API (base `/api/v1`)

### Portfólio
- `GET /projetos/` (filtros: status, saude, prioridade, criticidade, categoria, area, program, portfolio, manager, sponsor, arquivado; busca: search; ordenação: ordering; `?resumo=1` devolve ProjectResumo)
- `GET /projetos/cards/` → `{total, projetos: ProjetoResumo[]}`
- `GET /projetos/timeline/?inicio&fim` → `{hoje, projetos:[{id,codigo,nome,cor,icone,inicio,fim,saude,status,status_rotulo,prioridade,percentual,progresso_planejado,gerente,programa,atrasado,orcamento,tarefas,marcos[]}]}`
- `GET /projetos/{id}/cronograma/` → `PayloadCronograma`
- `GET /projetos/{id}/dashboard/` → `{projeto, progresso:{percentual,planejado,desvio,tarefas_total,tarefas_concluidas,tarefas_atrasadas,tarefas_criticas,horas_estimadas,horas_realizadas}, evm:EVM, curva_s:{pontos,resumo}, orcamento:[...consumo_por_categoria], burndown:{pontos,total_horas}, riscos:{total,abertos,criticos,por_nivel,top[]}, marcos:Marco[], kpis:[...], conflitos_recursos:[...], tarefas_por_status:[{status,total}], por_responsavel:[{user_id,nome,cor,iniciais,total,concluidas,atrasadas,horas}]}`
- `POST /projetos/{id}/criar-baseline/` `{nome,descricao}`
- `GET /projetos/{id}/comparar-baseline/{baselineId}/`
- `POST /projetos/{id}/recalcular/` | `POST /projetos/{id}/encerrar/` `{licoes_aprendidas,arquivar}`
- `GET /projetos/assistente/catalogo/` → `{passos[4], icones[], cores[], categorias[], areas[], skills[], gerentes[]}`
- `POST/PATCH/DELETE /projetos/{id}/` (ProjectSerializer: nome, descricao, objetivo, categoria, area, program, portfolio, sponsor, manager, data_inicio, data_fim, orcamento, orcamento_capex, orcamento_opex, receita_prevista, status, prioridade, criticidade, icone, cor, tags[], esforco_estimado_horas, licoes_aprendidas)
- `/portfolios/`, `/programas/`, `/marcos/` (filtro `project`), `/kpis/`, `/baselines/`, `/licoes/`
- `GET /dashboard/executivo/?programa&portfolio&area&manager` → ver estrutura no seed (resumo, por_status, por_saude, por_prioridade, financeiro, evm_por_projeto, riscos{matriz,top}, projetos_atrasados, marcos_proximos, capacidade{conflitos,ocupacao,skills_criticas}, capacidades, alocacao, projetos)
- `GET /widgets/` → `{widgets: WidgetCatalogo[]}`

### Tarefas
- `GET /tarefas/?project=&status=&responsavel=&parent=` | `POST/PATCH/DELETE /tarefas/{id}/`
- `GET /tarefas/kanban/?project=` → `{projeto,colunas:[{status,rotulo,total,tarefas:Tarefa[]}],total,atrasadas}`
- `POST /tarefas/{id}/mover/` `{status, posicao_visual}`
- `POST /tarefas/{id}/progresso/` `{percentual_conclusao}`
- `POST /tarefas/{id}/reagendar/` `{data_inicio, data_fim}` → `{tarefa, reagendadas[], caminho_critico}`
- `POST /tarefas/reordenar/` `{itens:[{id,ordem,posicao_visual,status,parent}]}`
- `GET /tarefas/calendario/?inicio&fim&project=` → `{inicio,fim,eventos:EventoCalendario[]}`
- `GET /tarefas/minhas/` | `GET /minhas-tarefas/`
- `GET /tarefas/{id}/recomendacoes/?modo=PERFORMANCE|DESENVOLVIMENTO|MISTO&limite=8` → `ResultadoMatching`
- `GET /tarefas/{id}/simular/?skill=&disponibilidade=&custo=&preferencia=&experiencia=&proximidade=&somente_disponiveis=1`
- `POST /tarefas/{id}/requisitos-skill/` `{skill,nivel_minimo,peso,obrigatorio}`
- `POST /tarefas/{id}/duplicar/` | `POST /tarefas/{id}/checklist/` `{texto,ordem}`
- `POST /tarefas/{id}/checklist/{itemId}/alternar/`
- `POST /tarefas/{id}/dependencias/` `{predecessor, successor, tipo, lag}` | `DELETE /tarefas/{id}/dependencias/{depId}/`
- `/dependencias/`, `/checklist/`, `/requisitos-skill-tarefa/`

### Recursos e alocação
- `GET /alocacoes/?project=&task=&user=&status=&de=&ate=` | `POST /alocacoes/atribuir/` `{task,user|recurso,percentual,data_inicio,data_fim,modalidade,papel,justificativa,score_matching,override_manual}` → `{alocacao, conflitos[], aviso}`
- `GET /alocacoes/conflitos/?user=&project=` → `{conflitos:ConflitoAlocacao[], total, criticos}`
- `GET /alocacoes/mapa-ocupacao/?inicio&fim` → `{semanas:[{semana,rotulo}], linhas:[{user_id,nome,cor,iniciais,area,celulas:[{semana,valor,projetos[]}],media}]}`
- `GET /alocacoes/timeline/` → `{pessoas:[{user_id,nome,cor,iniciais,cargo,area,alocacoes:[{id,inicio,fim,percentual,projeto,project_id,tarefa,task_id,cor,status,modalidade}]}],total}`
- `POST /alocacoes/{id}/confirmar/` | `DELETE /alocacoes/{id}/`
- `GET /recursos/`, `GET /recursos/cards/` → `{recursos,por_tipo,total}`
- `GET /timesheet/?user=&project=&data=` | `POST /timesheet/` `{task,data,horas,descricao,atividade}`
- `GET /timesheet/semana/?data=` → `{inicio,fim,total_horas,meta_horas,aprovadas,pendentes,dias:[{data,rotulo,horas,apontamentos[]}]}`
- `POST /timesheet/{id}/aprovar/` | `POST /timesheet/aprovar-lote/` `{ids}`
- `GET /capacidade/{userId}/?semanas=12` → `{user_id, semanas:[{semana,rotulo,ocupacao,disponivel,situacao}], horas_apontadas}`
- `GET /dashboard/alocacao/` → `{total_alocacoes,por_modo,taxa_override,aderencia_media,recomendacoes{total,sugeridas,aceitas,recusadas},conflitos,ocupacao,por_projeto}`

### Motor de matching
- `GET /capacidades/matching/?task=|project=&modo=&limite=` → `ResultadoMatching`
- `POST /capacidades/simulacao/` `{task|project, modo, ajustes:{skill,disponibilidade,custo,preferencia,experiencia,proximidade,somente_disponiveis,limite}}` → ResultadoMatching + `{cenario,comparacao}`
- `POST /capacidades/recomendacoes/{id}/decidir/` `{aceitar,observacao,user?,percentual?,data_inicio?,data_fim?}`
- `GET /capacidades/modos-alocacao/` → `{modos[{valor,rotulo,descricao,pesos}],tipos_avaliacao,origens_historico,status_perfil}`

### Financeiro
- `GET /orcamentos/?project=` | `POST /orcamentos/distribuir/` `{project, itens:[{categoria,tipo,valor_planejado,cor}]}`
- `GET /lancamentos/?project=&tipo=&status=&categoria=` | `POST /lancamentos/` `{project,orcamento,tipo,categoria,descricao,valor,data_competencia,data_pagamento,status,fornecedor,documento,centro_custo}`
- `GET /lancamentos/resumo/` → `{despesas_total,receitas_total,realizado,comprometido,previsto,por_categoria,por_mes}`
- `POST /lancamentos/{id}/aprovar/`
- `GET /evm/{projectId}/?data=` → `{projeto, evm:EVM, curva_s:{pontos:[{data,rotulo,PV,EV,AC,desvio_custo,desvio_prazo,EAC_projetado?}],resumo}, por_categoria, fluxo_caixa:{meses:[{periodo,entradas,saidas,previsto_entradas,previsto_saidas,saldo,saldo_previsto,saldo_acumulado,rotulo}],saldo_final_projetado}}`
- `GET /dashboard/financeiro/?programa=` → `{resumo,por_categoria,serie_mensal,por_projeto,top_estouros}`
- `/previsoes-caixa/`

### Riscos e issues
- `GET /riscos/?project=&categoria=&status=&nivel=&estrategia=&responsavel=` | CRUD `/riscos/{id}/`
- `GET /riscos/matriz/?project=` → `{celulas:CelulaMatrizRisco[],total,escala,legenda,por_categoria,por_estrategia}`
- `POST /riscos/{id}/mover/` `{probabilidade,impacto,posicao_matriz_x,posicao_matriz_y,comentario}`
- `POST /riscos/{id}/plano-resposta/` `{plano_resposta,contingencia,estrategia,prob_residual,imp_residual,data_limite,responsavel}`
- `GET /riscos/heatmap/` → `{projetos:[{project_id,projeto,cor,total,severidade_media,indice_risco,por_nivel,por_categoria}]}`
- `GET /riscos/{id}/historico/` → `{risco,historico[]}`
- `GET /issues/?project=&tipo=&status=&prioridade=` | CRUD
- `GET /issues/kanban/?project=` → `{colunas:[{status,rotulo,total,items:Issue[]}],total,atrasadas,por_tipo}`
- `POST /issues/{id}/mover/` `{status,posicao_visual}` | `GET /issues/resumo/`
- `GET /dashboard/riscos/?project=` → `{total_riscos,por_nivel,por_categoria,por_estrategia,exposicao_total,custo_mitigacao,top_riscos,riscos_atrasados,matriz_resumo,issues{...},por_projeto,categorias,estrategias,tipos_issue}`
- `/riscos-historico/`

### Capacidades
- `GET /capacidades/skills/?categoria=&tipo=&status=&criticidade=&search=` | CRUD | `GET /capacidades/skills/{id}/detalhe/` → `{skill,detentores,projetos,criterios,oportunidades,previsao}`
- `GET /capacidades/skills/arvore/?categoria=` → `{raizes[],total,categorias[]}` (cada nó: id,nome,icone,cor,tipo,status,criticidade,parent,categoria,categoria_nome,codigo_externo,framework_origem,total_detentores,filhos[])
- `GET /capacidades/skills/grafo/` → `{nos:[{id,nome,icone,cor,tipo,criticidade,status,categoria,detentores,bus_factor,nivel_medio,raio}],arestas:[{de,para,tipo}]}`
- `POST /capacidades/skills/importar-taxonomia/` `{framework, itens:[{nome,codigo_externo,categoria,descricao,tipo,sinonimos}]}`
- `GET /capacidades/categorias/` | `GET /capacidades/categorias/arvore/`
- `GET /capacidades/criterios-nivel/?skill=`
- `GET /capacidades/perfis/?user=&skill=&nivel_atual=&status=&visibilidade=` | CRUD
- `GET /capacidades/perfis/matriz/?area=&categoria=&tipo=&limite_skills=&limite_pessoas=` → `{colunas:ColunaMatrizSkills[], linhas:LinhaMatrizSkills[], cobertura[], filtros{areas,categorias,tipos}, total_pessoas, total_skills}`
- `GET /capacidades/perfis/por-usuario/{userId}/` → `{user_id,nome,total_skills,nivel_medio,eixos[],todos[],por_categoria[]}`
- `GET /capacidades/perfis/{id}/historico/` → `{perfil,historico[],avaliacoes[],endossos[],evidencias[],criterios_proximo_nivel:PerfilNivelCriterio}`
- `GET /capacidades/perfis/{id}/criterios/` → `PerfilNivelCriterio`
- `POST /capacidades/perfis/{id}/avaliar/` `{tipo:AUTOAVALIACAO|GESTOR|PAR|MENTOR|BANCA|CLIENTE,nivel_atribuido,comentario,peso}` → `{avaliacao,perfil,sugestao_promocao}`
- `POST /capacidades/perfis/{id}/endossar/` `{comentario,nivel_sugerido}`
- `POST /capacidades/perfis/{id}/evidencias/` `{tipo:PROJETO|CERTIFICACAO|TREINAMENTO|PUBLICACAO|PALESTRA|MENTORIA|BADGE|AVALIACAO|OUTRO,descricao,url,data,emitido_por}`
- `POST /capacidades/perfis/{id}/validar-evidencia/{evidenciaId}/`
- `POST /capacidades/perfis/{id}/creditar-xp/` `{xp,motivo,origem}` | `POST /capacidades/perfis/{id}/regredir/` `{nivel,motivo}`
- `GET/POST /capacidades/promocoes/?status=` | `POST /capacidades/promocoes/{id}/validar/` `{aprovar,comentario,nivel_final}`
- `GET/POST /capacidades/requisitos-projeto/?project=` | `POST /capacidades/requisitos-projeto/definir/` `{project,substituir,requisitos:[{skill,nivel_minimo,nivel_desejado,quantidade,peso,obrigatorio}]}`
- `GET /capacidades/gap/?project=` → `{escopo,total_pessoas,itens:GapItem[],resumo{total_requisitos,criticos,altos,medios,baixos,obrigatorios_pendentes,indice_cobertura}}`
- `GET /capacidades/forecast/?meses=9&salvar=0|1` → `{meses[],linhas:LinhaForecast[],resumo{skills_em_escassez,skills_ociosas,maior_gap}}`
- `GET /capacidades/bus-factor-detect/?salvar=0|1` → `{alertas:[{skill_id,skill,cor,icone,criticidade,quantidade_detentores,total_projetos_dependentes,recomendacao,acoes_sugeridas[],detentores[]}],resumo{total,sem_detentor,um_detentor}}`
- `GET /capacidades/bus-factor/` (CRUD de alertas persistidos) | `POST /capacidades/bus-factor/{id}/resolver/`
- `GET /capacidades/painel/` → `{cobertura_skills{...},gap{...},bus_factor{...},desenvolvimento{indice,pdis_ativos,acoes_pdi,acoes_concluidas,progresso_pdi,mentorias_ativas,skill_decay,promocoes_pendentes},certificacao{certificacoes,treinamentos,taxa},por_tipo,por_criticidade,distribuicao_niveis,top_skills,alertas_bus_factor,gap_criticos}`
- `GET/POST /capacidades/pdi/?user=&status=&meus=1` | `GET /capacidades/pdi/meu/` → `{usuario,radar,trilhas[],pdi}`
- `POST /capacidades/pdi/gerar/` `{user,titulo,objetivo,data_fim,limite}` | `/capacidades/pdi-acoes/` (CRUD, `PATCH` com status CONCLUIDA credita XP)
- `/capacidades/treinamentos/`, `/capacidades/treinamentos-colaborador/` | `GET /capacidades/trilhas/?user=&limite=` → `{usuario,radar,trilhas:Trilha[]}`
- `/capacidades/mentorias/` | `GET /capacidades/mentorias/sugerir/?skill=&limite=`
- `GET /capacidades/oportunidades/?tipo=&ativa=` | `GET /capacidades/oportunidades/recomendadas/` | `GET /capacidades/oportunidades/{id}/aderencia/{userId}/`
- `/capacidades/candidaturas/` | `/capacidades/posicoes/` | `/capacidades/sucessao/` | `GET /capacidades/sucessao/mapa/` → `{nos:[{id,tipo,titulo,subtitulo,criticidade,risco,ocupante,cor,icone}],arestas:[{de,para,tipo,prontidao,aderencia,prioridade}]}`
- `GET /capacidades/decay/` (GET lista candidatos, POST marca) | `GET /capacidades/previsoes/`

### Core / admin / colaboração
- `GET /usuarios/?perfil=&area=&ativo=&gestor=&search=` | `GET /usuarios/resumo/` | `GET /usuarios/organograma/` → `{nos:[{id,nome,cargo,area,cor,iniciais,perfil,gestor}],arestas:[{de,para,tipo}]}` | CRUD `/usuarios/{id}/`
- `GET/POST /papeis/` → `{id,nome,descricao,permissoes[],is_sistema,total_vinculos}` | `/vinculos-papel/`
- `GET /permissoes/` → `{usuario,permissoes[],matriz:{PERFIL:[permissoes]}}`
- `GET /auditoria/?entidade=&acao=&user=&search=` | `GET /auditoria/resumo/` → `{por_acao,por_entidade,por_usuario}`
- `GET /atividades/?entidade=&projeto_id=&user=` | `GET /notificacoes/?lida=&nivel=` | `POST /notificacoes/{id}/marcar-lida/` | `GET /notificacoes/contagem/`
- `GET/POST /regras-notificacao/`
- `GET/PATCH /auth/me/` | `GET /preferencias-visao/` | `POST /preferencias-visao/definir/` `{contexto,tipo_visualizacao,configuracao_json}`
- `GET/POST /dashboards/` | `POST /dashboards/{id}/tornar-padrao/` | `POST /dashboards/salvar-widgets/` `{id?,nome,widgets_json}`
- `GET/POST /filtros-salvos/?modulo=` | `GET/POST /relatorios/` | `GET /relatorios/{id}/executar/`
- `GET/POST /tokens-api/` | `GET/POST /webhooks/`
- `GET /comentarios/?entidade=tasks.task&objeto_id=12` | `POST /comentarios/` `{entidade,objeto_id,texto,parent?,mencoes:[]}` | `POST /comentarios/{id}/reagir/` `{emoji}` | `POST /comentarios/{id}/resolver/`
- `GET /anexos/?entidade=&objeto_id=` | `POST /anexos/` (multipart: arquivo, entidade, objeto_id)
- `GET/POST /salas/` | `GET /salas/{id}/mensagens/` | `POST /salas/{id}/enviar/` `{texto,mencoes,reply_to}` | `POST /mensagens/{id}/reagir/`
- `GET /workflows/`, `/workflow-estados/`, `/workflow-transicoes/` | `GET/POST /campos-customizados/` | `GET /campos-customizados/schema/?entidade=`
- `GET /busca/?q=` | `GET /widgets/` | `GET /health/`

## Padrões de UX a seguir

- **Carregamento**: use `CarregandoBloco` ou `Esqueleto`. Nunca deixe a tela vazia sem feedback.
- **Erro**: `<Alerta tom="danger" titulo="Não foi possível carregar">{mensagemErro(erro)}</Alerta>`.
- **Vazio**: `<Vazio icone={...} titulo="..." descricao="..." acao={<Botao/>} />`.
- **Drag-and-drop**: use `@dnd-kit/core` (`DndContext`, `useDraggable`, `useDroppable`) e `@dnd-kit/sortable`
  (`SortableContext`, `verticalListSortingStrategy`, `arrayMove`). Sempre aplique `touch-action: none` no handle
  e `attributes`/`listeners` do `useSortable`. Feedback visual imediato (≤300 ms) é requisito RNF-03.
- **Drill-down**: clicar em qualquer agregado navega para o detalhe (RF-32).
- **Filtros**: chips removíveis com `FiltrosAtivos`, estado na URL via `useSearchParams` quando fizer sentido.
- **Sem modais desnecessários** (DV-08): prefira `PainelLateral` para edição e edição inline na tabela/lista.
- Densidade e tema já são globais — não reimplemente.
- Toda ação destrutiva pede confirmação via `Modal`.

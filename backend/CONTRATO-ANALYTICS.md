# Contrato — app \`analytics\` (Fase 4: Analytics e IA preditiva)

Crie o app Django \`apps/analytics\` no projeto SGP em
\`C:\\Users\\wesll\\OneDrive\\Documentos\\projetos\\gestor_projetos\\backend\`.

## Arquivos que você deve criar (somente estes)

\`\`\`
backend/apps/analytics/__init__.py
backend/apps/analytics/apps.py           # AnalyticsConfig, name="apps.analytics", label="analytics"
backend/apps/analytics/models.py
backend/apps/analytics/services.py       # toda a matemática aqui
backend/apps/analytics/serializers.py
backend/apps/analytics/views.py
backend/apps/analytics/urls.py
backend/apps/analytics/admin.py
backend/apps/analytics/tests.py
backend/apps/analytics/migrations/__init__.py
\`\`\`

**NÃO edite** \`config/settings.py\`, \`config/urls.py\` nem nenhum arquivo de outro app — o integrador registra o app.
**NÃO rode** \`makemigrations\` nem \`migrate\` — apenas crie \`migrations/__init__.py\` vazio.

## Estilo do projeto (siga o existente)

Leia antes de escrever: \`apps/finance/services.py\`, \`apps/capabilities/analytics.py\`,
\`apps/capabilities/matching.py\`, \`apps/core/permissions.py\`, \`apps/core/services.py\`.
- Comentários e docstrings em português; nomes de campos em português.
- Python 3.14, Django 6. Sem dependências novas (nada de numpy/pandas/scipy) — use \`random\`, \`statistics\` e matemática pura.
- Valores monetários em \`Decimal\`, mas os cálculos estatísticos podem usar \`float\` com arredondamento explícito.
- Nunca use crases dentro de strings.

## Models

### \`PrevisaoProjeto\`
Guarda o resultado de uma previsão para auditoria e comparação histórica.
\`\`\`
project (FK Project, related_name="previsoes")
data_referencia (DateField, default hoje)
metodo (CharField: MONTE_CARLO | REGRESSAO | EVM)
prazo_p10, prazo_p50, prazo_p80, prazo_p90 (DateField, null)
dias_desvio_p50 (IntegerField) — diferença entre p50 e o prazo planejado
probabilidade_atraso (FloatField 0..1)
custo_p50, custo_p80, custo_p90 (Decimal)
probabilidade_estouro (FloatField 0..1)
indice_confianca (FloatField 0..1) — quão completo é o dado de entrada
fatores (JSONField) — lista de {fator, peso, valor, impacto, descricao} para explicabilidade
premissas (JSONField) — lista de textos
criado_por (FK User, null)
criado_em
\`\`\`
Meta: ordering = ["-data_referencia", "-criado_em"], indexes em (project, -data_referencia).

### \`AuditoriaVies\`
Resultado da auditoria de imparcialidade das recomendações de alocação (RNF-18).
\`\`\`
periodo_inicio, periodo_fim (DateField)
metrica (CharField: TAXA_SELECAO | SCORE_MEDIO | OVERRIDE | DISTRIBUICAO_AREA | DISTRIBUICAO_LOCAL | TEMPO_DE_CASA)
grupo (CharField) — ex.: "Tecnologia", "Recife/PE", "0-2 anos"
tamanho_grupo (IntegerField)
valor_grupo (FloatField)
valor_referencia (FloatField) — média geral
disparidade (FloatField) — (valor_grupo - valor_referencia) / valor_referencia
severidade (CharField: OK | ATENCAO | CRITICO)
recomendacao (TextField)
detalhes (JSONField)
criado_em
\`\`\`
Meta: ordering = ["-criado_em"].

## Serviços (\`services.py\`) — o núcleo

### 1. \`simulacao_monte_carlo(project, iteracoes=1000, semente=None)\`
- Para cada tarefa não concluída, modela a duração com **distribuição triangular**:
  mínimo = esforço restante otimista (70% do planejado), moda = planejado, máximo = pessimista (160% do planejado).
  Considere o atraso já observado das tarefas concluídas para calibrar (se a média de desvio das concluídas é +18%,
  aplique esse viés às estimativas).
- Some as durações por caminho crítico simplificado: use a cadeia de dependências (\`TaskDependency\`) para
  respeitar predecessoras; tarefas sem dependência entram em paralelo ponderado por disponibilidade.
- Rode \`iteracoes\` vezes com \`random.Random(semente)\` quando \`semente\` for informado (reprodutibilidade nos testes).
- Devolva percentis 10/50/80/90 do prazo (em dias a partir de hoje) e do custo final, além de
  \`probabilidade_atraso\` (fração de iterações que passam da data planejada) e \`probabilidade_estouro\`
  (fração que passa do orçamento). Base do custo: BAC × fator de desvio sorteado por iteração.
- Performance: no máximo 1000 iterações e limite de 400 tarefas (amostre as maiores por esforço se exceder).

### 2. \`previsao_por_regressao(project)\`
- Regressão linear simples sobre a série de progresso: eixo X = dias desde o início, eixo Y = percentual concluído.
- Projete a data em que atinge 100% e compare com \`data_fim\`. Calcule R² para indicar qualidade do ajuste.
- Se não houver dados suficientes (menos de 3 pontos), devolva \`disponivel=False\` com o motivo.

### 3. \`previsao_custo(project)\`
- Três métodos de EAC (já existe \`calcular_evm\` em \`apps/finance/services.py\` — reaproveite):
  1. EAC = BAC / CPI (desempenho de custo se mantém)
  2. EAC = AC + (BAC − EV) (desempenho futuro volta ao plano)
  3. EAC = AC + (BAC − EV) / (CPI × SPI) (considera também o atraso)
- Devolva os três, a média, o intervalo (mínimo e máximo) e qual método é mais provável dado o contexto
  (se SPI < 0,95 use o método 3; se CPI estável, método 1).

### 4. \`score_risco_atraso(project)\` — modelo explicável
Devolva \`score\` de 0 a 100 e a lista de \`fatores\` com peso, valor e contribuição. Fatores e pesos sugeridos:
- desvio de progresso (planejado − real): peso 0,30
- SPI abaixo de 1: peso 0,15
- tarefas atrasadas / total: peso 0,15
- tarefas no caminho crítico atrasadas: peso 0,15
- riscos de nível alto/extremo abertos: peso 0,10
- sobrecarga da equipe (conflitos de alocação): peso 0,08
- dependências externas sem responsável ou sem data: peso 0,07
Classifique: 0–24 BAIXO, 25–49 MEDIO, 50–74 ALTO, 75–100 CRITICO. Cada fator traz uma frase de explicação
em linguagem de negócio.

### 5. \`benchmarking_projetos(projects)\`
- Para um conjunto de projetos, calcule para cada um: CPI, SPI, desvio de prazo em dias, consumo orçamentário,
  densidade de riscos, densidade de issues, progresso.
- Devolva a distribuição (mínimo, p25, mediana, p75, máximo) de cada métrica e a **posição percentil** de cada
  projeto. Identifique os 3 melhores e os 3 piores por métrica, e destaques ("referência em pontualidade").
- Devolva também uma lista de \`praticas\` observadas nos melhores (ex.: "projetos com CPI acima da mediana têm
  40% menos riscos críticos").

### 6. \`auditoria_vies(periodo_dias=180, salvar=True)\`
- Analise as \`AllocationRecommendation\` do período e as \`Alocacao\` resultantes, comparando grupos por:
  área, localização, tempo de casa (faixas 0-2, 2-5, 5-10, 10+ anos), faixa de custo/hora e perfil.
- Métricas por grupo: taxa de seleção (recomendações ACEITAS / total recomendado), score médio recebido,
  taxa de override (quando o gestor escolheu alguém diferente do topo do ranking), posição média no ranking.
- Calcule a \`disparidade\` de cada grupo contra a média geral e classifique:
  |disparidade| < 0,15 OK · 0,15 a 0,30 ATENCAO · > 0,30 CRITICO.
- Gere \`recomendacao\` textual acionável por grupo problemático (ex.: "profissionais com menos de 2 anos de casa
  aparecem em 4º lugar em média no ranking; revise os pesos do modo Performance ou incentive o modo Desenvolvimento").
- **Importante**: deixe explícito no retorno que a auditoria mede disparidade estatística, não prova de
  discriminação, e que exige revisão humana — a especificação §9.4 exige isso.

### 7. \`tendencias_portfolio(projects, meses=12)\`
- Séries mensais de: progresso médio, CPI médio, SPI médio, risco médio, ocupação média da equipe.
- Para cada série, calcule a tendência (inclinação da regressão) e classifique em MELHORANDO, ESTAVEL, PIORANDO.

### 8. \`previsao_demanda_pessoas(projects, meses=12)\`
- Projete a necessidade de pessoas (FTE) por mês somando as alocações futuras já planejadas e as tarefas
  não concluídas sem responsável; compare com a capacidade disponível e aponte os meses de pico.

## Serializers, views e URLs

Use \`ModelViewSet\` para \`PrevisaoProjeto\` e \`AuditoriaVies\` (leitura + criação) e \`APIView\` para os cálculos.
Todas as views usam \`PermissaoSGP\` de \`apps.core.permissions\` com \`permissao_leitura = "dashboard.ver"\`
(exceto a auditoria de viés, que usa \`"auditoria.ver"\`, e a criação de previsões, que usa \`"projeto.editar"\`).

Rotas finais (registre o router em \`urls.py\` com prefixo próprio):

| Método | Rota | Retorno |
|---|---|---|
| GET | \`analytics/previsao/<project_id>/\` | \`{projeto, monte_carlo, regressao, custo, risco_atraso, premissas}\` |
| POST | \`analytics/previsao/<project_id>/\` | calcula, **persiste** \`PrevisaoProjeto\` e devolve o registro |
| GET | \`analytics/risco-atraso/?programa=&area=\` | \`{projetos:[{id, codigo, nome, cor, score, classificacao, fatores[]}], resumo:{criticos, altos, medios, baixos}}\` |
| GET | \`analytics/benchmarking/?programa=&area=&portfolio=\` | \`{metricas:{chave:{minimo,p25,mediana,p75,maximo,unidade,rotulo}}, projetos:[{...percentis}], melhores, piores, praticas[]}\` |
| POST | \`analytics/monte-carlo/\` \`{project, iteracoes, semente}\` | resultado da simulação + histograma de 20 faixas para o gráfico |
| GET | \`analytics/vies/?dias=180\` | \`{periodo, metricas[], resumo, aviso_metodologico}\` |
| POST | \`analytics/vies/executar/\` \`{dias}\` | roda e **persiste** \`AuditoriaVies\` |
| GET | \`analytics/tendencias/?meses=12&programa=\` | \`{meses[], series:[{nome, cor, dados[], tendencia, variacao}]}\` |
| GET | \`analytics/demanda-pessoas/?meses=12\` | \`{meses[], serie:[{mes, demanda_fte, oferta_fte, gap}], resumo}\` |
| GET/POST | \`analytics/previsoes/\` | CRUD de previsões persistidas (filtros: project, metodo) |
| GET | \`analytics/auditorias/\` | CRUD de auditorias de viés persistidas |
| GET | \`analytics/painel/\` | consolidação para a tela: risco médio do portfólio, previsões recentes, tendências, viés e demanda |

## Testes (\`tests.py\`)

Use \`django.test.TestCase\`. Cubra pelo menos:
- Monte Carlo com semente fixa é reprodutível (duas execuções dão o mesmo p50).
- p10 ≤ p50 ≤ p80 ≤ p90.
- \`probabilidade_atraso\` fica entre 0 e 1.
- Regressão com dados insuficientes devolve \`disponivel=False\`.
- \`score_risco_atraso\` devolve score entre 0 e 100, com fatores cujos pesos somam aproximadamente 1.
- Projeto atrasado tem score maior que projeto em dia.
- Benchmarking devolve percentis ordenados e o percentil do melhor projeto é 100.
- Auditoria de viés com poucos dados não quebra e devolve o aviso metodológico.
- Tendências devolvem série do tamanho pedido.

Escreva código completo e funcional. Responda ao final com um resumo curto: arquivos criados, funções públicas
de \`services.py\` com assinatura, e as rotas registradas.

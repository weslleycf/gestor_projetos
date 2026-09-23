# SGP — Sistema de Gestão de Projetos, Portfólio e Capacidades

Implementação da especificação consolidada v2.0: sistema **visual, intuitivo e em tempo real** para gestão de
projetos, portfólio e capacidades organizacionais.

- **Backend:** Django 6 + Django REST Framework + SimpleJWT + SQLite (desenvolvimento)
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 (design system próprio, gráficos em SVG puro)
- **Escopo desta entrega:** Fases 1 e 2 da especificação com profundidade (MVP Visual + Gestão)

---

## 1. Como executar

Pré-requisitos: Python 3.12+, Node.js 20+.

### Backend

```powershell
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_sgp          # dados de demonstração realistas (recomendado)
python manage.py runserver 127.0.0.1:8000
```

API em http://127.0.0.1:8000/api/v1/ · Admin Django em http://127.0.0.1:8000/admin/

Para recriar a base do zero: `python manage.py seed_sgp --limpar`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Aplicação em **http://localhost:5173** — o Vite faz proxy de `/api` e `/media` para o backend.

### Script único (Windows)

```powershell
.\iniciar.ps1
```

Sobe o backend em segundo plano, aguarda o healthcheck e inicia o Vite.

---

## 2. Contas de demonstração

Senha padrão: `sgp123456`

| E-mail | Perfil | O que enxerga |
|---|---|---|
| admin@empresa.com.br | Administrador | Acesso total, administração, auditoria |
| helena.marques@empresa.com.br | Executiva (C-Level) | Dashboards executivos, portfólio, financeiro |
| ricardo.tavares@empresa.com.br | PMO | Governança, capacidades, validação de promoções |
| bruno.carvalho@empresa.com.br | Gerente de Projetos | Execução, alocação, riscos, financeiro do projeto |
| thiago.menezes@empresa.com.br | Líder Técnico | Tarefas, alocação, mentoria |
| ana.cunha@empresa.com.br | Membro de Equipe | Tarefas, timesheet, PDI, perfil de capacidades |
| larissa.fontes@empresa.com.br | RH / DHO | Capacidades, PDI, mentorias, treinamentos |
| otavio.lemos@empresa.com.br | Stakeholder | Acompanhamento pontual |

---

## 3. Arquitetura

```
gestor_projetos/
├── backend/
│   ├── config/                  # settings, urls, wsgi/asgi
│   ├── apps/
│   │   ├── core/                # User, RBAC, auditoria, notificações, preferências, comentários
│   │   ├── portfolio/           # Portfolio, Program, Project, Milestone, KPI, Baseline, Workflow, campos
│   │   ├── tasks/               # Task, dependências (CPM), checklist, requisitos de skill por tarefa
│   │   ├── resources/           # Recurso, Alocação, Timesheet, capacidade semanal, conflitos
│   │   ├── finance/             # Orçamento, Lançamento, EVM, curva S, fluxo de caixa
│   │   ├── risks/               # Risk (matriz P×I), RiskHistory, Issue
│   │   ├── capabilities/        # Catálogo, perfis, evolução/XP, matching, gap, capacity, PDI, sucessão
│   │   └── collab/              # Salas e chat
│   ├── smoke_test.py            # teste de fumaça de 134 endpoints
│   └── db.sqlite3
└── frontend/
    ├── CONTRATO.md              # contrato de design system e componentes
    └── src/
        ├── components/          # ui.tsx, charts.tsx, gantt.tsx, timeline.tsx, layout.tsx, seletor-tema.tsx
        ├── lib/                 # api, tipos do domínio, formatação pt-BR, utilitários, temas.ts
        ├── store/               # autenticação (zustand) e preferências de UI (tema/densidade)
        ├── hooks.ts             # camada de dados (react-query)
        └── pages/               # ~40 telas
```

### Decisões de arquitetura relevantes

| Decisão | Justificativa |
|---|---|
| **Monólito modular** em vez de microsserviços | A especificação §5.1 propõe microsserviços, mas um monólito Django com apps bem separados entrega o mesmo domínio com muito menos custo operacional. Cada app é candidato natural a extração futura. |
| **Gráficos em SVG puro** (sem Recharts/D3) | Controle total do design system — cores semânticas, modo escuro por token, acessibilidade — e zero peso de dependência. Gantt, timeline, heatmap, radar, medidor e curva S são componentes próprios. |
| **Matching como serviço de domínio** (`capabilities/matching.py`) | Implementa literalmente a fórmula do §9.1, com pesos por modo e explicabilidade auditável persistida em `AllocationRecommendation`. |
| **CPM próprio** (`tasks/services.py`) | Forward/backward pass com os quatro tipos de dependência (FS/SS/FF/SF) e detecção de ciclos. |
| **Auditoria imutável** | `AuditLog.save()` rejeita updates e `delete()` é bloqueado — garante a trilha de 5 anos do RNF-16. |
| **RBAC por matriz de permissões** | `core/permissions.py` define a matriz por perfil; o frontend recebe as permissões efetivas no boot e filtra navegação e rotas. |

---

## 4. Requisitos atendidos

### Fase 1 — MVP Visual
- **RF-01** Assistente visual de projeto em 4 passos (cartão, timeline arrastável, chips de skills, equipe sugerida)
- **RF-03** Gantt interativo com drag para reagendar, redimensionar duração, dependências e caminho crítico
- **RF-06** Classificação e filtros visuais com chips removíveis
- **RF-07 / RF-10 / RF-12** Kanban com drag, slider de progresso e alternância Gantt / Kanban / Lista / Calendário / Timeline
- **RF-27 a RF-32** Dashboard executivo com drill-down, semáforo de saúde, alertas e relatórios por widgets
- **RF-39** RBAC com perfis, papéis, escopos e matriz de permissões visual
- **RF-44 / RF-45 / RF-47** Catálogo de capacidades com taxonomia em árvore e grafo, níveis 1–5 com critérios objetivos
- **RF-50 / RF-51 / RF-53** Perfil de capacidades com radar, avaliações multi-fonte e evidências
- **RF-63** Matriz de capacidades (heatmap colaboradores × skills)

### Fase 2 — Gestão
- **RF-13 a RF-17** Recursos, alocação por drag, detecção de conflitos, timesheet visual e custo por projeto
- **RF-18 a RF-22** Orçamento CAPEX/OPEX, lançamentos, orçado × realizado, EVM com curva S e fluxo de caixa
- **RF-23 a RF-26** Matriz de riscos interativa por arrastar, plano de resposta, Kanban de issues e heatmap de riscos
- **RF-30** Relatórios customizáveis por drag-and-drop de widgets
- **RF-33 / RF-34** Comparativo entre projetos e forecast de tendências
- **RF-56 a RF-62** XP por tarefa, sugestão de promoção, validação por gestor ou banca, decay e reciclagem
- **RF-64 a RF-67** Gap analysis individual e coletivo com severidade e ações sugeridas
- **RF-68 a RF-74** Motor de alocação com score explicável, três modos, what-if e override justificado
- **RF-80 a RF-84** Demanda × oferta, bus factor, alertas de escassez e ociosidade, cenários
- **RF-85 a RF-88** Marketplace interno com aderência calculada e mapa de sucessão em grafo

### Fase 3 — Colaboração e integrações
- **RF-35 a RF-38** Comentários com menções, threads, reações, chat por projeto/equipe e histórico de atividades
- **RF-16** Timesheet visual com apontamento por dia, envio para aprovação e aprovação em lote
- **RF-56 a RF-62, RF-75 a RF-79** PDI, mentorias, treinamentos e evolução por XP com animação de level up
- **Integrações reais** LMS, Jira, Azure DevOps, Teams, Slack, Google Calendar, Outlook, ERP, CRM, RH,
  Power BI/Tableau, GitHub, GitLab, taxonomia ESCO/SFIA e certificadoras — com conectores, mapeamento de campos,
  modo simulação e histórico de execução
- **RF-36** Notificação in-app **e por e-mail**, avaliando as regras configuradas

### Fase 4 — Analytics e IA preditiva
- **Simulação de Monte Carlo** por projeto: 1.000 cenários, distribuição triangular por tarefa, viés calibrado pelas
  tarefas já concluídas, cadeia de dependências e paralelismo ponderado pela equipe → P10/P50/P80/P90 de prazo e
  custo, probabilidade de atraso e de estouro, com histograma
- **Previsão por regressão linear** do percentual concluído, com R² e data projetada de término
- **Previsão de custo** pelos três métodos de EAC (desempenho mantido, retorno ao plano, prazo e custo)
- **Score de risco de atraso explicável**: 7 fatores com peso, contribuição e frase de justificativa
- **Benchmarking entre projetos** com percentis, melhores, piores e práticas observadas com evidência numérica
- **Tendências do portfólio** (melhorando, estável, piorando) e **demanda de pessoas** (FTE) por mês
- **RNF-18** Auditoria contínua de viés nas recomendações de alocação, com aviso metodológico explícito
- **RF-43** API pública com credenciais de escopo, **webhooks com entrega real**, assinatura HMAC-SHA256,
  retentativa com backoff e histórico de entregas

### Fase 5 — Escala e operação
- **Aplicativo instalável (PWA)** com manifesto, ícones, atalhos e service worker — a API nunca é cacheada, apenas
  o shell da aplicação
- **Feed de calendário (.ics)** assinável no Google Calendar e no Outlook, e **dataset analítico** em JSON ou CSV
  para Power BI, Tableau e Excel
- **Observabilidade das integrações**: taxa de sucesso por integração, execuções com duração e erros, fila de
  eventos com tentativas e entregas descartadas após o limite
- **Auditoria imutável** de todas as ações relevantes, com diff antes × depois

### Requisitos não funcionais
- **RNF-11 / RNF-12 / RNF-13** Visibilidade de skills configurável, curva de aprendizado curta, interface responsiva
- **RNF-15** Contraste AA, foco visível, navegação por teclado, atributos ARIA nos componentes
- **RNF-16** Trilha de auditoria imutável com diff antes × depois
- **RNF-17 / RNF-18** Recomendações auditáveis com justificativa e registro de override manual

---

## 5. Motor de Alocação Inteligente (§9)

```
Score = w1·SkillMatch + w2·Disponibilidade + w3·Custo + w4·Preferência
      + w5·Experiência + w6·Proximidade − penalidades
```

| Modo | Skill | Disponib. | Custo | Prefer. | Exper. | Proxim. |
|---|---|---|---|---|---|---|
| Performance imediata | 0,45 | 0,20 | 0,10 | 0,05 | 0,15 | 0,05 |
| Desenvolvimento | 0,25 | 0,15 | 0,10 | 0,20 | 0,05 | 0,10 |
| Misto | 0,35 | 0,18 | 0,12 | 0,12 | 0,13 | 0,10 |

Penalidades: sobrecarga ≥ 100% (−0,35), skill obrigatória abaixo do mínimo (−0,50), histórico de atrasos (−0,10),
conflito com tarefa crítica (−0,15). Bônus por exceder o nível exigido: +0,10 no máximo.

No modo **Desenvolvimento** a função de aderência tem alvo em `nível_requerido − 1`, favorecendo o
crescimento com gap controlado e sugerindo o mentor interno adequado.

Toda recomendação é persistida com a justificativa completa (skills atendidas, gaps, disponibilidade, custo,
penalidades aplicadas) e pode ser aceita, recusada ou substituída por override manual com justificativa registrada
em auditoria.

---

## 6. Sistema de temas e acessibilidade visual

O SGP tem **8 temas predefinidos** e um **editor de tema personalizado**, todos aplicáveis em tempo real e
persistidos por usuário.

### 6.1 Como funciona

Toda a interface consome apenas variáveis CSS (`--sgp-*`), mapeadas para utilitários Tailwind via
`@theme inline`. Trocar de tema reescreve essas variáveis no elemento raiz — sem recarregar a página e sem
recompilar CSS.

Cada tema é declarado por uma **semente** (cor de marca, cores de estado e matiz neutra) e os 27 tokens são
derivados por matemática de cor (mistura, luminosidade, saturação, contraste). Isso mantém todas as paletas
consistentes entre si e faz o editor personalizado funcionar com poucas linhas.

### 6.2 Temas predefinidos

| Tema | Categoria | Marca | Observação |
|---|---|---|---|
| Azul SGP | Institucional | `#2563EB` | Identidade padrão do sistema |
| **Bradesco 2026** | Institucional | `#CC092F` | Vermelho Bradesco + roxo `#633280` |
| Esmeralda | Clássico | `#047857` | Verde institucional |
| Oceano | Clássico | `#0E7490` | Ciano para dashboards analíticos |
| Violeta | Vibrante | `#7C3AED` | Roxo contemporâneo |
| Âmbar | Vibrante | `#EA580C` | Laranja com texto escuro sobre a marca |
| Grafite | Clássico | `#334155` | Neutro minimalista, cantos retos (raio 2px) |
| Alto contraste | Acessibilidade | `#00308F` | Contraste 21:1 (WCAG AAA) |

Cada tema tem variante **clara e escura**, e o modo pode seguir o sistema operacional.

### 6.3 Tema Bradesco 2026

Construído a partir das cores públicas documentadas da marca:

| Cor | Hex | Uso no SGP |
|---|---|---|
| Vermelho Bradesco | `#CC092F` | Cor primária — botões, links, séries de gráfico |
| Roxo institucional | `#633280` | Cor secundária — informativo e destaques |
| Preto institucional | `#231F20` | Texto e elementos de alto contraste |
| Cinza claro | `#EBEBEB` | Superfícies e divisores |
| Branco | `#FFFFFF` | Fundo de conteúdo |

> **Ressalva importante.** O brandbook oficial (fev/2026) é publicado em PDF e não pôde ser lido por este
> ambiente. Os valores acima vêm de fontes públicas convergentes e **devem ser conferidos contra o guia oficial
> antes de uso institucional**. Se o time de marca informar valores exatos, basta editá-los na aba
> **Criar meu tema** — nenhum código precisa mudar.

No modo escuro o vermelho é clareado para ganhar presença sobre o fundo, mas o sistema **reduz automaticamente a
luminosidade até garantir 4,5:1** com o texto do botão (`garantirContrasteAA`), resultando em `#E90B36`.

### 6.4 Acessibilidade (RNF-15)

O contraste WCAG 2.1 entre texto e fundo é calculado em tempo real e exibido no selo de cada tema. A verificação
automatizada `frontend/verificar-temas.ts` valida, para os 8 temas nos dois modos:

- formato dos 27 tokens (hex de 6 dígitos — exigido porque os componentes compõem alfa em JavaScript);
- contraste texto principal × fundo ≥ 4,5:1 (AA);
- contraste texto × botão da marca ≥ 4,5:1.

Resultado atual: **todos os temas passam**, com 14,6:1 a 21:1 no texto principal.

### 6.5 Tema personalizado

Na aba **Criar meu tema** (`/temas`) é possível escolher um tema base e ajustar 17 tokens de cor, agrupados em
Marca, Superfícies, Texto e bordas, e Estados. As alterações são aplicadas imediatamente em toda a interface
(WYSIWYG, diretriz DV-03) e só são gravadas ao clicar em **Salvar e aplicar**. Temas podem ser exportados e
importados em JSON.

### 6.6 Onde configurar

| Local | O que oferece |
|---|---|
| Menu do usuário (topo) | Modo de cor, grade de temas e densidade |
| `/temas` | Galeria com pré-visualização real, editor personalizado e documentação |
| `/preferencias` | Seleção rápida de paleta junto das demais preferências |

A escolha é gravada nos campos `paleta` e `tema_custom` do usuário, então acompanha a pessoa em qualquer
navegador. O catálogo de temas também é exposto pela API em `GET /api/v1/auth/me/` (chave `config.temas`).

---

## 7. Testes

```powershell
cd backend
python smoke_test.py        # 134 endpoints, incluindo verificação de RBAC negado
python manage.py test       # testes unitários do Django
```

O `smoke_test.py` cobre autenticação JWT, CRUD de todos os módulos, ações customizadas (mover card,
reagendar tarefa, criar baseline, executar matching, simular cenário, validar promoção, aprovar horas) e a
verificação de que um perfil sem permissão recebe HTTP 403.

O `frontend/verificar-temas.ts` valida os 8 temas nos dois modos (formato dos tokens e contraste WCAG AA).
Ambos são executados automaticamente por `.\verificar.ps1`.

---

## 8. Integrações (Fase 3)

O SGP conversa com os sistemas que a empresa já usa por meio de **conectores**. Cada integração tem direção
(entrada, saída ou bidirecional), autenticação, mapeamento de campos e agendamento próprio.

### Como funciona

| Conceito | O que é |
|---|---|
| **Conector** | Tradutor entre o modelo do SGP e o formato do sistema externo. Cada tipo tem o seu. |
| **Mapeamento de campo** | Regra que liga um campo externo a um campo do SGP, com transformação (maiúsculas, data, moeda, tradução de valores) |
| **Modo simulação** | O conector monta a requisição e registra exatamente o que seria enviado, **sem chamar** o sistema externo. É o padrão e serve para validar o mapeamento antes de ligar a integração |
| **Fila de eventos** | Todo acontecimento relevante do SGP vira um evento (padrão *outbox*), entregue aos webhooks interessados |
| **Webhook** | Endpoint do cliente que recebe os eventos, com assinatura **HMAC-SHA256** para validar a origem |
| **Execução** | Cada sincronização é registrada com itens lidos, criados, atualizados, ignorados, com erro e duração |

### Integrações suportadas

ERP (SAP, Oracle) · CRM (Salesforce) · RH (Workday, Gupy, Senior) · LMS (Moodle, Cornerstone, Docebo) ·
Jira · Azure DevOps · Microsoft Teams · Slack · Power BI / Tableau · Google Calendar · Outlook · GitHub · GitLab ·
ESCO / SFIA · certificadoras (AWS, Azure, PMI)

### Onde as chamadas são reais

Integrações que **funcionam sem credenciais de terceiros** e por isso são exercitadas de verdade:

- **Mensageria (Teams e Slack)** — publicação em canal via *incoming webhook*
- **Calendário** — geração de feed **.ics** (RFC 5545) em `/api/v1/integracoes/calendario.ics`
- **Power BI / Tableau** — dataset do portfólio em JSON ou CSV em `/api/v1/integracoes/dataset/`

As demais exigem credenciais que um ambiente de demonstração não possui. Nesses casos o conector monta a
requisição real, registra o corpo exato no histórico da execução e opera em **modo simulação** — pronto para virar
integração real assim que houver acesso.

### Operação agendada

```powershell
python manage.py sincronizar_integracoes              # tudo o que estiver vencido
python manage.py sincronizar_integracoes --integracao 3 --operacao IMPORTAR
python manage.py sincronizar_integracoes --sem-eventos
```

Agende esse comando no Windows Task Scheduler ou no cron. A frequência de cada integração é configurada na
própria tela.

---

## 9. Analytics e IA preditiva (Fase 4)

| Recurso | Método | O que entrega |
|---|---|---|
| **Simulação de Monte Carlo** | 1.000 cenários com distribuição triangular (70% / 100% / 160% do esforço restante), viés calibrado pelas tarefas concluídas, cadeia de dependências e paralelismo ponderado pela equipe | P10/P50/P80/P90 de prazo e custo, probabilidade de atraso e de estouro, histograma de 20 faixas |
| **Previsão por regressão** | Regressão linear do percentual concluído ao longo do tempo | Data projetada de término, R² e comparação com o prazo planejado |
| **Previsão de custo** | Três métodos de EAC | Intervalo de estimativa e indicação do método mais provável dado o contexto |
| **Risco de atraso** | Modelo explicável de 7 fatores com pesos que somam 1,00 | Score de 0 a 100, classificação BAIXO/MÉDIO/ALTO/CRÍTICO e a contribuição de cada fator em linguagem de negócio |
| **Benchmarking** | Percentis por métrica entre projetos comparáveis | Posição percentil, melhores, piores e práticas observadas com evidência numérica |
| **Tendências** | Regressão sobre séries mensais | Melhorando / estável / piorando por indicador |
| **Demanda de pessoas** | Projeção de FTE por mês | Demanda × oferta e meses de pico |
| **Auditoria de viés** (RNF-18) | Disparidade estatística por grupo nas recomendações de alocação | Severidade OK / ATENÇÃO / CRÍTICO, recomendação acionável e **aviso metodológico explícito** |

> **Sobre a auditoria de viés.** Ela mede **disparidade estatística**, não prova discriminação. A especificação
> §9.4 exige revisão humana em decisões de alto impacto, e a tela deixa isso explícito.

---

## 10. Manual do usuário

A documentação completa, escrita para **usuário de negócio**, está em [`docs/`](docs/00-INDICE.md).

| # | Documento | Assunto |
|---|---|---|
| 00 | [Índice do manual](docs/00-INDICE.md) | Como usar, trilhas de leitura por papel e convenções |
| 01 | [Visão geral e primeiros passos](docs/01-visao-geral-e-primeiros-passos.md) | O que é o SGP, perfis, login, navegação, busca global, temas e densidade |
| 02 | [Perfis, permissões e segurança](docs/02-perfis-permissoes-e-seguranca.md) | Matriz de permissões, escopos, privacidade das capacidades, LGPD, auditoria |
| 03 | [Projetos e cronograma](docs/03-projetos-e-cronograma.md) | Portfólio, programas, assistente de cadastro, Gantt, baseline, marcos |
| 04 | [Tarefas e execução](docs/04-tarefas-e-execucao.md) | Tarefas, Kanban, lista, calendário, timeline, checklist, timesheet |
| 05 | [Recursos e alocação](docs/05-recursos-e-alocacao.md) | Alocação, conflitos, ocupação e o motor de matching explicado |
| 06 | [Financeiro e EVM](docs/06-financeiro-e-evm.md) | Orçamento, lançamentos, EVM indicador por indicador, curva S, fluxo de caixa |
| 07 | [Riscos e issues](docs/07-riscos-e-issues.md) | Matriz probabilidade × impacto, estratégias, risco residual, Kanban de issues |
| 08 | [Capacidades e talentos](docs/08-capacidades-e-talentos.md) | Catálogo, níveis, avaliações, XP, promoções, matriz, gap, PDI, sucessão |
| 09 | [Dashboards e relatórios](docs/09-dashboards-e-relatorios.md) | Os seis dashboards, drill-down, relatórios por widgets, exportações |
| 10 | [Colaboração e notificações](docs/10-colaboracao-e-notificacoes.md) | Comentários, menções, chat, atividades e regras de notificação |
| 11 | [Administração](docs/11-administracao.md) | Usuários, papéis, workflows, campos, integrações, API e auditoria |
| 12 | [Perguntas frequentes](docs/12-perguntas-frequentes.md) | Dúvidas transversais, problemas comuns e o que o sistema recalcula |

Cada documento segue a mesma estrutura: para que serve, quem usa, como chegar, conceitos, tarefas passo a passo,
campos, regras de negócio, como ler os indicadores, boas práticas, perguntas frequentes e — igualmente importante —
**o que aquele módulo não faz**.

A versão de consulta rápida, tela a tela, está dentro da própria aplicação — veja a seção 11.

---

## 11. Central de ajuda dentro da aplicação

Além do manual em `docs/`, o SGP tem **ajuda embutida**: um guia de uso para cada uma das 46 telas, consultável
sem sair do que se está fazendo.

### Como o usuário acessa

| Caminho | O que faz |
|---|---|
| **Tecla F1** (ou Shift+/) | Abre o guia da tela atual em um painel lateral |
| **Botão ? na barra superior** | Mesmo efeito, com um ponto pulsante quando a tela é nova para o usuário |
| **Ctrl+K** | A busca global passou a incluir os guias: digite um assunto e vá direto ao guia |
| **Administração › Central de ajuda** | Lista todos os guias, com busca, filtro por grupo e o manual completo |
| **Dica de primeira visita** | Na primeira vez em cada tela, uma faixa oferece o guia — dispensável e lembrada |

### Explicação dentro de cada card

Além do guia por tela, **cada indicador explica a si mesmo**. Todo card de número — os KPIs do topo das telas,
os medidores de CPI e SPI, o semáforo de saúde — traz um botão **?** que abre, ali mesmo:

| Bloco | O que responde |
|---|---|
| **O que é** | O significado do número em linguagem de negócio |
| **Fórmula** | O cálculo, quando existe (CPI = EV ÷ AC) |
| **Como ler** | As faixas reais do sistema: o que é verde, o que é âmbar, o que é vermelho |
| **O que fazer** | A ação prática quando o valor está ruim |
| **Exemplo** | Um caso numérico concreto |
| **Fonte** | De onde o número vem, em linguagem de negócio |

São **610 explicações** cobrindo **100% dos indicadores** da interface, em 7 categorias. O botão aparece sozinho:
o componente de indicador consulta o catálogo pelo rótulo exibido, então não foi preciso alterar as ~20 telas que
usam KPIs.

O catálogo é versionado em JSON, em `frontend/src/lib/explicacoes/`, e aparece reunido na aba
**Glossário dos cards** da central de ajuda, com busca por termo, fórmula ou texto.

Os ~475 KB de catálogo **não entram no carregamento inicial**: cada arquivo vira um pedaço separado, baixado uma
única vez, sob demanda. O pacote inicial segue em 363 KB (110 KB comprimidos).

> **Atenção:** a busca é tolerante de propósito — "CPI médio" encontra a explicação de "CPI". Quando dois
> indicadores diferentes têm o mesmo nome em telas distintas, a explicação é separada por sinônimo para não
> induzir a leitura errada.

### O que cada guia traz

Resumo em uma frase, para que serve, quando usar, **passo a passo numerado** com os rótulos exatos da tela,
elementos visuais, campos e o que significam, como ler os indicadores, dicas, atalhos e — igualmente importante —
**o que aquela tela não faz**. Ao final, o usuário avalia se o guia ajudou e pode abrir o capítulo correspondente
do manual.

### Conteúdo e manutenção

O conteúdo é **versionado em JSON**, em `backend/apps/ajuda/conteudo/` (9 arquivos, um por grupo). O comando abaixo
valida e carrega; a edição também pode ser feita no admin do Django, sem novo deploy.

```powershell
python manage.py carregar_ajuda --validar   # só valida os arquivos
python manage.py carregar_ajuda --limpar    # recarrega do zero
```

O carregador recusa JSON inválido, rota duplicada e campo obrigatório ausente, e ao final informa **quais telas
ainda não têm guia** — o mesmo dado aparece na aba **Uso da ajuda**, restrita a administradores.

### Os indicadores de ajuda

A aba **Uso da ajuda** mostra quais guias as pessoas mais consultam, quais têm pior avaliação e quantas telas
seguem sem guia. Serve para priorizar a melhoria: um guia muito consultado merece mais detalhe; um guia mal
avaliado costuma indicar que **a tela** precisa ficar mais clara, não que o texto precise crescer.

---

## 12. Assistente de IA e servidor MCP

Um **registro único de 21 consultas** sobre o domínio, com duas saídas: o assistente dentro da aplicação e um
**servidor MCP** para clientes externos.

### Como funciona

O usuário pergunta em português (**Ctrl+I** em qualquer tela). O assistente escolhe as consultas, executa contra o
banco e responde **mostrando a trilha** — quais consultas rodaram e o que cada uma encontrou — além de atalhos
para os registros citados. Toda consulta passa pela matriz de permissões **antes** de executar.

### Sem dependência de serviço pago

O provedor é plugável e resolvido por configuração:

| Configuração | Comportamento |
|---|---|
| *(nada definido)* | **Motor local**: o SGP interpreta a pergunta, escolhe as consultas e redige a resposta. Nenhum dado sai do servidor. |
| `SGP_IA_PROVEDOR=openai` | Qualquer endpoint compatível com OpenAI — inclusive **Ollama** e LM Studio, apontando `SGP_IA_URL` |
| `SGP_IA_PROVEDOR=anthropic` | API de Mensagens da Anthropic |
| `SGP_IA_CHAVE` / `SGP_IA_MODELO` | Chave e modelo. Em `auto`, uma chave presente ativa o provedor externo |

Se o provedor externo falhar, a resposta cai automaticamente no motor local, com aviso.

### Servidor MCP

Protocolo JSON-RPC 2.0, com `initialize`, `tools/list`, `tools/call` e `ping`:

```powershell
python manage.py servidor_mcp --usuario admin@empresa.com.br            # stdio, para clientes de mesa
python manage.py servidor_mcp --usuario admin@empresa.com.br --listar   # só lista o que seria exposto
```

Também em HTTP, autenticado pelo mesmo token, em `POST /api/v1/ia/mcp/`.

### As consultas disponíveis

Portfólio (resumo, atrasados, em risco, detalhe, marcos) · Execução (minhas tarefas, tarefas atrasadas) ·
Riscos (críticos, issues) · Recursos (sobrecarregados, quem pode assumir) · Capacidades (lacunas, bus factor) ·
Financeiro (orçamento consumido, resultado) · Análises (risco de atraso, previsão) · Ajuda (como usar o sistema,
o que significa um indicador, busca).

As duas últimas são o diferencial de apoio: o assistente **consulta o próprio manual** para responder dúvidas de
uso, e o catálogo de explicações dos cards para definir indicadores.

---

## 13. Próximos passos

- WebSockets/SSE para colaboração em tempo real e CRDT para edição concorrente (hoje a atualização é por consulta)
- SSO SAML/OAuth2 com MFA e criptografia em repouso (a especificação §10.1 prevê; a entrega usa JWT local)
- PostgreSQL + Redis + busca full-text para a escala do RNF-02/RNF-06 (hoje SQLite)
- Aplicativo mobile nativo em React Native (a entrega tem PWA instalável e layout responsivo)
- Internacionalização completa pt-BR / en / es (hoje somente pt-BR)
- Envio automático dos relatórios agendados (o agendamento é persistido, a geração é sob demanda)
- Camada semântica sobre os indicadores para consumo por assistentes de IA

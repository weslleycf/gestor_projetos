# Esquema dos guias de uso dentro da aplicação

Cada arquivo JSON desta pasta é carregado pelo comando \`python manage.py carregar_ajuda\` e vira um **guia de
consulta rápida** exibido dentro do SGP, na tela da própria página.

## Regras de redação

- **Público:** usuário de negócio. Zero jargão técnico (nada de endpoint, JSON, API, componente, migration).
- **Tom:** direto, na segunda pessoa ("Clique em **Salvar**"). Rótulos de tela entre asteriscos duplos: \`**Salvar**\`.
- **Precisão:** leia o código real da página antes de escrever. Não invente botão, aba, campo nem regra.
  - \`frontend/src/pages/<SuaPagina>.tsx\` — a tela
  - \`frontend/src/components/layout.tsx\` — menu lateral (constante NAVEGACAO)
  - \`backend/apps/<app>/models.py\` — regras de negócio e cálculos
  - \`docs/<numero>-<assunto>.md\` — o manual completo, para alinhar a linguagem
- **Tamanho:** cada guia deve caber numa consulta rápida. Resumo de 1 frase, \`para_que_serve\` de 2 a 4 frases,
  de 4 a 8 passos, de 3 a 5 dicas, de 1 a 3 limitações.
- Escreva **somente** o arquivo JSON da sua lista. Não altere código nem outro arquivo.

## Formato

Um arquivo JSON é uma **lista** de guias. Exemplo completo de um guia:

\`\`\`json
[
  {
    "rota": "/projetos",
    "titulo": "Projetos",
    "grupo": "Portfólio",
    "icone": "folder-kanban",
    "resumo": "Lista todos os projetos do portfólio nas visões de cartões, lista e timeline.",
    "para_que_serve": "É o ponto de partida para acompanhar a carteira de projetos. Aqui você compara prazos, orçamento e saúde em uma única tela, identifica o que está atrasado e entra no detalhe de cada projeto. Use os filtros para montar recortes por área, programa, gerente ou situação.",
    "quando_usar": [
      "Para saber quais projetos estão atrasados ou em risco",
      "Antes de uma reunião de comitê, para montar o recorte do período",
      "Para localizar um projeto específico e abrir o cronograma"
    ],
    "passos": [
      { "titulo": "Escolher a visão", "detalhe": "Use o seletor **Cards**, **Lista** ou **Timeline** no topo. Os cartões mostram a saúde por semáforo; a lista é melhor para ordenar e comparar números; a timeline dá a visão macro dos prazos.", "icone": "layout-grid" },
      { "titulo": "Filtrar o recorte", "detalhe": "Na barra de ferramentas, escolha **Status**, **Saúde**, **Prioridade**, **Criticidade**, **Área**, **Programa** e **Gerente**. Os filtros aplicados aparecem como chips removíveis abaixo.", "icone": "filter" }
    ],
    "elementos": [
      { "nome": "Semáforo de saúde", "descricao": "Verde no prazo, amarelo atenção, vermelho crítico." },
      { "nome": "Barra de progresso", "descricao": "A parte escura é o realizado; a faixa clara atrás é o planejado." }
    ],
    "campos": [
      { "nome": "Progresso", "descricao": "Percentual concluído, calculado pelo esforço das tarefas.", "dica": "Compare sempre com o planejado ao lado." }
    ],
    "indicadores": [
      { "nome": "Atrasados", "descricao": "Projetos com prazo vencido e ainda abertos.", "leitura": "Qualquer valor acima de zero pede ação imediata." }
    ],
    "dicas": [
      "Salve o recorte que você usa toda semana como filtro salvo, em **Preferências**.",
      "A visão escolhida fica gravada no seu usuário e volta na próxima visita."
    ],
    "limitacoes": [
      "Os valores vêm da última atualização; não há atualização automática em segundo plano."
    ],
    "atalhos": [
      { "tecla": "Ctrl+K", "acao": "Abrir a busca global e pular direto para um projeto" }
    ],
    "doc": "03-projetos-e-cronograma.md",
    "permissoes": ["projeto.ver"],
    "ordem": 30
  }
]
\`\`\`

## Campos

| Campo | Obrigatório | Formato | Observação |
|---|---|---|---|
| \`rota\` | sim | texto | Rota exata da página, iniciando com \`/\`. É a chave do guia. |
| \`titulo\` | sim | texto | Nome da página, igual ao menu. |
| \`grupo\` | sim | texto | Use exatamente o grupo informado na sua lista. |
| \`icone\` | sim | texto | Nome de ícone da biblioteca Lucide, em minúsculas com hífen. |
| \`resumo\` | sim | 1 frase | Aparece no cartão da central de ajuda. |
| \`para_que_serve\` | sim | 2 a 4 frases | O valor de negócio, antes do "como fazer". |
| \`quando_usar\` | sim | 3 a 5 itens | Situações concretas do dia a dia. |
| \`passos\` | sim | 4 a 8 itens | Cada um com \`titulo\`, \`detalhe\` e \`icone\` opcional. |
| \`elementos\` | opcional | lista | Partes visuais da tela: \`nome\` e \`descricao\`. |
| \`campos\` | opcional | lista | \`nome\`, \`descricao\` e \`dica\` opcional. |
| \`indicadores\` | opcional | lista | \`nome\`, \`descricao\` e \`leitura\` (como interpretar). |
| \`dicas\` | sim | 3 a 5 itens | Atalhos e boas práticas. |
| \`limitacoes\` | sim | 1 a 3 itens | O que a tela **não** faz. Seja honesto. |
| \`atalhos\` | opcional | lista | \`tecla\` e \`acao\`. |
| \`doc\` | sim | arquivo | Nome do arquivo em \`docs/\` correspondente, ex.: \`05-recursos-e-alocacao.md\`. |
| \`permissoes\` | sim | lista | Permissões que dão acesso à página (veja o item da sua lista). |
| \`ordem\` | sim | número | Ordem de exibição dentro do grupo, de 10 em 10. |

## JSON válido

Sem comentários, sem vírgula sobrando, com aspas duplas. Acentuação em português é esperada e bem-vinda.

# Assistente de IA e integração por MCP

## Em uma frase

O assistente é um chat em português que consulta os dados reais do SGP e mostra de onde tirou cada número — e as
mesmas consultas ficam disponíveis para ferramentas externas compatíveis com MCP.

## Para que serve

Você sabe o que quer saber, mas não sabe em qual tela procurar. Em vez de abrir cinco telas e montar filtros, você
pergunta: **"quais projetos estão atrasados?"**, **"quem está sobrecarregado?"**, **"o que significa SPI?"**. O
assistente escolhe a consulta certa, busca no banco e responde citando os registros.

Ele **não inventa**: toda resposta vem de uma consulta registrada, e a trilha de consultas aparece logo abaixo do
texto. Se não houver dado suficiente, ele diz o que falta.

## Quem usa

Todos os perfis. O assistente **respeita a matriz de permissões**: ele só enxerga o que o seu perfil enxerga. Um
membro de equipe não recebe informação financeira; se perguntar, ouve que o perfil dele não acessa aquele dado — a
mesma regra das telas.

## Como chegar

| Caminho | O que acontece |
|---|---|
| **Ctrl+I** em qualquer tela | Abre o painel do assistente sem sair do que você está fazendo |
| Ícone de brilho na barra superior | Mesmo efeito, para quem prefere o mouse |
| **Ajuda › Assistente** | Tela cheia, com o histórico de conversas ao lado |

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Consulta** | Uma pergunta bem definida ao banco de dados, como "projetos atrasados" ou "riscos críticos". O assistente escolhe entre 21 delas. |
| **Trilha** | Os chips que aparecem abaixo da resposta, mostrando quais consultas foram feitas e o que cada uma encontrou. |
| **Fonte** | O registro citado na resposta, com atalho para abrir a tela dele. |
| **Motor local** | Modo em que o próprio SGP interpreta a pergunta e monta a resposta, sem enviar nada para fora. |
| **MCP** | *Model Context Protocol*: um padrão que permite a outros assistentes (Claude Desktop, IDEs, agentes) usarem as mesmas consultas do SGP. |

## Tarefas passo a passo

### Fazer uma pergunta
1. Pressione **Ctrl+I** ou clique no ícone de brilho.
2. Escreva em português, como falaria com um colega.
3. **Enter** envia; **Shift+Enter** quebra linha.
4. Leia a resposta e confira os chips de consulta abaixo dela.

### Conferir de onde veio o número
Os nomes citados na resposta são clicáveis e levam ao registro. Os chips mostram o resumo de cada consulta — se
diz **Projetos atrasados · 3**, foram encontrados três.

### Avaliar a resposta
Os polegares ao lado da resposta registram se ela foi útil. Isso alimenta o painel de uso e ajuda a melhorar as
consultas que as pessoas mais precisam.

### Usar as mesmas consultas em outro assistente (MCP)
O SGP publica as consultas por MCP em dois transportes:

- **Local (stdio)** — para clientes de mesa, no comando `python manage.py servidor_mcp --usuario <email>`.
  O cliente conversa por JSON-RPC 2.0 e as permissões são as do usuário informado.
- **Remoto (HTTP)** — em `/api/v1/ia/mcp/`, autenticado com o mesmo token da aplicação. Aceita
  `initialize`, `tools/list`, `tools/call` e `ping`.

Para listar o que seria exposto, sem subir o servidor:
`python manage.py servidor_mcp --usuario <email> --listar`.

## Campos e o que significam

| Campo | Significado |
|---|---|
| **Trilha de ferramentas** | Consultas executadas, com o resumo do resultado de cada uma |
| **Fontes** | Registros citados, com atalho para a tela correspondente |
| **Sugestões** | Próximas perguntas adequadas ao seu perfil |
| **Provedor** | Se as respostas vêm do motor local do SGP ou de um serviço de IA externo configurado |

## Regras de negócio

- **Nada de escrita.** Todas as consultas são de leitura. Criar, editar e excluir continua nas telas.
- **Permissão primeiro.** A verificação acontece antes da execução da consulta, não no texto.
- **Sem serviço externo por padrão.** Sem chave configurada, o motor local responde e nenhum dado sai do servidor.
  Com chave configurada, o provedor externo recebe apenas o resultado das consultas feitas em seu nome.
- **Histórico é seu.** Cada pessoa vê apenas as próprias conversas.

## Como ler os indicadores

| Indicador | Como interpretar |
|---|---|
| Número de consultas na trilha | Quantas consultas foram necessárias. Uma resposta com três consultas é mais ampla; com uma, mais direta. |
| Tempo de resposta | Respostas do motor local ficam na casa das dezenas de milissegundos. |
| Percentual de respostas úteis | No painel de uso: abaixo de 70% indica consultas que precisam melhorar. |

## Boas práticas

- Dê contexto: **"como está o CPI do PRJ-2026-004?"** funciona melhor que **"como está o projeto?"**.
- Use o assistente para descobrir **onde** está a informação; use a tela para agir sobre ela.
- Peça explicações: **"o que significa bus factor?"** devolve o texto do próprio manual.
- Confira antes de decidir. A trilha e as fontes existem exatamente para isso.

## Perguntas frequentes

**O assistente altera dados?** Não. Todas as consultas são de leitura.

**Preciso de chave de IA para usar?** Não. Sem chave, o motor local do SGP responde. Com chave, as respostas
ficam mais fluentes, mas continuam saindo das mesmas consultas.

**Por que ele disse que meu perfil não acessa?** Porque a consulta exige uma permissão que o seu perfil não tem.
É a mesma regra das telas, descrita no manual de perfis e permissões.

**As conversas ficam salvas?** Sim, por usuário, e podem ser apagadas na tela cheia.

**Ele entende qualquer pergunta?** Não. Perguntas diretas funcionam bem. Formulações muito indiretas podem cair
na busca por nome — nesse caso, reformule citando o assunto.

## O que este módulo não faz

- Não escreve, não aprova e não altera nada.
- Não aprende com as conversas: a avaliação serve para medir qualidade, não para treinar o sistema.
- Sem serviço de IA configurado, não mantém conversa livre sobre assuntos fora do SGP.
- Não substitui a conferência humana. As respostas podem conter imprecisões.

## Veja também

- [Visão geral e primeiros passos](01-visao-geral-e-primeiros-passos.md)
- [Perfis, permissões e segurança](02-perfis-permissoes-e-seguranca.md)
- [Integrações e análises preditivas](13-integracoes-e-analytics.md)
- [Perguntas frequentes](12-perguntas-frequentes.md)

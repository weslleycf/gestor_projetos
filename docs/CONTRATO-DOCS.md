# Contrato de redação — Manual do Usuário do SGP

Você escreve **documentação de negócio** para o Sistema de Gestão de Projetos, Portfólio e Capacidades (SGP).

## Público-alvo e tom

Escreva para **usuário de negócio**, não para programador. O leitor é gerente de projetos, analista de PMO,
gestor de RH ou executivo. Regras:

- **Zero jargão técnico.** Nunca escreva "endpoint", "JSON", "campo do modelo", "serializer", "API" (exceto quando
  a própria tela se chama assim), "componente React", "migration". Se precisar citar tecnologia, explique em uma
  linha e siga.
- **Fale com o leitor.** Use "você". Prefira "Clique em Salvar" a "o usuário deve salvar".
- **Nomeie exatamente o que está na tela.** Se o botão diz "Aplicar tema", escreva **Aplicar tema** em negrito.
  Nunca invente um rótulo.
- **Explique o porquê antes do como.** Comece cada tarefa dizendo para que ela serve no mundo real.
- **Use o vocabulário do negócio**: projeto, portfólio, marco, risco, capacidade, alocação, orçado, realizado.
- Nada de código, nada de trechos de programação, nada de nomes de arquivos internos.

## Precisão obrigatória

Antes de escrever, **leia o código real** para não inventar telas, botões ou regras:

- \`frontend/src/components/layout.tsx\` — contém a constante \`NAVEGACAO\` com os **rótulos exatos do menu lateral**,
  agrupados por seção. Use esses nomes.
- \`frontend/src/pages/*.tsx\` — as telas. Leia as que correspondem ao seu módulo para descobrir abas, botões,
  colunas de tabela, filtros e textos de ajuda.
- \`backend/apps/*/models.py\` — as **regras de negócio**: cálculos, validações, estados, campos obrigatórios.
- \`backend/apps/core/permissions.py\` — a matriz de permissões por perfil (para o doc de acesso).
- \`frontend/src/lib/temas.ts\` e \`frontend/src/pages/Temas.tsx\` — temas e densidade.
- \`README.md\` — visão geral, contas de demonstração, arquitetura.

Se algo não existir no código, **não documente**. Se existir mas você não tiver certeza, descreva com cautela.

## Estrutura obrigatória de cada documento

Cada arquivo começa com um título \`# \` e segue **exatamente** esta sequência de seções:

1. **Em uma frase** — o que este módulo resolve, em uma frase direta.
2. **Para que serve** — 2 a 4 parágrafos curtos explicando o valor de negócio.
3. **Quem usa** — tabela com Perfil × O que faz neste módulo × Frequência típica.
4. **Como chegar** — o caminho exato no menu (ex.: *Portfólio › Projetos*), com o que aparece ao abrir.
5. **Conceitos que você precisa conhecer** — glossário local do módulo, em tabela Termo | Significado.
6. **Tarefas passo a passo** — a parte mais longa. Cada tarefa com:
   - título no imperativo ("Cadastrar um projeto"),
   - para que serve,
   - passos numerados citando os rótulos reais da tela,
   - o que acontece depois (quem é notificado, o que é recalculado),
   - um exemplo prático quando ajudar.
   Cubra **todas** as ações principais do módulo.
7. **Campos e o que significam** — tabela Campo | O que é | Como preencher | Obrigatório.
8. **Regras de negócio** — como o sistema calcula e decide, em linguagem simples. Aqui é onde você explica
   fórmulas (EVM, score de alocação, XP, severidade de risco) traduzidas para o negócio.
9. **Como ler os indicadores** — tabela Indicador | O que mede | Como interpretar | Faixa saudável.
10. **Boas práticas** — 4 a 8 recomendações práticas.
11. **Perguntas frequentes** — 6 a 10 perguntas reais com respostas curtas.
12. **O que este módulo não faz** — limites honestos, para evitar expectativa errada.
13. **Veja também** — links relativos para os outros documentos do manual.

## Formatação

- Markdown puro: títulos \`##\`/\`###\`, tabelas, listas numeradas, **negrito** para rótulos de tela.
- Blocos de destaque com \`> **Atenção:** ...\` para armadilhas comuns.
- Cada documento entre 400 e 900 linhas. Profundidade importa mais que brevidade.
- Links relativos entre documentos: \`[Nome](../docs/arquivo.md)\` — use apenas para arquivos que existem na lista.

## Regras

- Escreva **somente** os arquivos da sua lista. Não crie nem altere outros arquivos.
- Não rode build, tsc ou testes.
- Tudo em português do Brasil.

## Lista completa dos documentos do manual

| Arquivo | Assunto |
|---|---|
| \`docs/01-visao-geral-e-primeiros-passos.md\` | O que é o SGP, perfis, login, navegação, busca global, notificações, temas e densidade |
| \`docs/02-perfis-permissoes-e-seguranca.md\` | Perfis, matriz de permissões, escopos, privacidade das capacidades, LGPD, auditoria |
| \`docs/03-projetos-e-cronograma.md\` | Portfólio, programas, projetos, assistente de cadastro, Gantt, baseline, marcos, encerramento |
| \`docs/04-tarefas-e-execucao.md\` | Tarefas, Kanban, lista, calendário, timeline, checklist, dependências, minhas tarefas, timesheet |
| \`docs/05-recursos-e-alocacao.md\` | Recursos, alocação, conflitos, ocupação, capacidade e o motor de alocação inteligente |
| \`docs/06-financeiro-e-evm.md\` | Orçamento, lançamentos, orçado × realizado, EVM completo, curva S, fluxo de caixa |
| \`docs/07-riscos-e-issues.md\` | Matriz de riscos, probabilidade × impacto, plano de resposta, risco residual, issues |
| \`docs/08-capacidades-e-talentos.md\` | Catálogo, níveis, perfis, avaliações, evidências, XP, promoções, matriz, gap, bus factor, PDI, mentorias, sucessão |
| \`docs/09-dashboards-e-relatorios.md\` | Dashboard executivo, do projeto, financeiro, riscos, alocação, capacidades e relatórios por widgets |
| \`docs/10-colaboracao-e-notificacoes.md\` | Comentários, menções, chat por projeto, histórico de atividades, notificações e regras |
| \`docs/11-administracao.md\` | Usuários, papéis, workflows, campos personalizados, integrações, auditoria |
| \`docs/12-perguntas-frequentes.md\` | Dúvidas transversais, problemas comuns e o que fazer em cada caso |

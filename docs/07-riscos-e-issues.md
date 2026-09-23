# Riscos e issues

## Em uma frase

O módulo de Riscos e issues mostra o que **pode** dar errado antes que aconteça (riscos, na matriz
probabilidade × impacto) e o que **já** deu errado (issues, no Kanban de tratamento), com plano de resposta,
responsável e prazo para cada um.

## Para que serve

Todo projeto convive com incerteza. A diferença entre um projeto que sofre e um projeto que reage bem está em
quanto tempo ele levou para enxergar o problema. Este módulo existe para encurtar esse tempo.

A **Matriz de riscos** é o coração do módulo: uma grade 5 × 5 em que cada risco é posicionado conforme a chance de
acontecer (probabilidade) e o tamanho do estrago se acontecer (impacto). A posição na grade — a severidade — diz
qual risco merece atenção primeiro, sem discussão e sem achismo.

Para cada risco relevante, o time escreve um **plano de resposta** (o que faremos para reduzir a chance ou o
efeito) e um **plano de contingência** (o que faremos se acontecer mesmo assim), com responsável, prazo e
**gatilhos** — os sinais que disparam a contingência. Depois de agir, o time informa a **severidade residual**,
que mostra o quanto o risco foi de fato reduzido.

Quando um risco se materializa — ou quando aparece qualquer outro problema no dia a dia — ele vira uma **issue**.
As issues são tratadas em um Kanban próprio, com colunas que vão de **Aberta** a **Fechada**, incluindo ações
corretivas, solicitações de mudança, impedimentos e decisões pendentes.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| Administrador | Acessa tudo e mantém o vocabulário de categorias e estratégias | Pontual |
| Executivo (C-Level) | Lê o **Painel** e o **Heatmap por projeto** para saber onde estão os riscos altos e extremos do portfólio | Mensal |
| PMO | Acompanha o heatmap entre projetos, cobra planos de resposta atrasados e padroniza categorias | Semanal |
| Gerente de Projetos | Registra e posiciona riscos, escreve planos de resposta e contingência, mantém o Kanban de issues | Diária |
| Líder Técnico | Registra riscos técnicos do time, acompanha e atualiza as issues em tratamento | Diária |
| Stakeholder | Consulta os riscos do projeto em que está envolvido | Pontual |
| Membro de Equipe, RH | Não têm acesso a este módulo | — |

> **Atenção:** para registrar, alterar ou excluir riscos é preciso ter permissão de edição de riscos —
> administrador, PMO, gerente de projetos e líder técnico. Executivo e stakeholder apenas consultam.

## Como chegar

O módulo fica no grupo **Riscos e qualidade** do menu lateral, com dois itens:

| Caminho no menu | O que aparece ao abrir |
|---|---|
| **Riscos e qualidade › Matriz de riscos** | A tela **Gestão de riscos**, aberta na aba **Matriz interativa**: a grade 5 × 5 com os cards dos riscos, o detalhe do risco selecionado, o plano de resposta e o histórico |
| **Riscos e qualidade › Issues e ações** | A tela **Issues, ações e impedimentos**, aberta na aba **Kanban**: as oito colunas de status com os cards das issues |

A tela **Gestão de riscos** tem três abas:

- **Matriz interativa** — a grade 5 × 5, os gráficos **Riscos por categoria** e **Estratégias de resposta** e o
  painel lateral de detalhe do risco selecionado.
- **Heatmap por projeto** — o **Índice de risco por projeto**, a tabela **Detalhamento por projeto** e o
  drill-down por nível e categoria.
- **Painel** — o consolidado do portfólio: indicadores, distribuição por nível, categoria e estratégia, os
  **Top riscos por severidade**, as **Respostas atrasadas**, a **Matriz consolidada** e os gráficos de issues.

A tela **Issues, ações e impedimentos** também tem três abas: **Kanban**, **Resumo** e **Tabela**.

Há ainda um atalho dentro do projeto: abra **Portfólio › Projetos**, clique no projeto e escolha a aba
**Riscos**. Lá aparecem a matriz do projeto, os indicadores por nível e a exposição em valor monetário esperado.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Risco** | Algo que **pode** acontecer no futuro e prejudicar o projeto. Tem causa, efeito e probabilidade |
| **Issue** | Algo que **já** aconteceu e precisa de tratamento. Um risco que se materializa vira uma issue |
| **Ação corretiva** | Issue cujo objetivo é corrigir um desvio já existente |
| **Solicitação de mudança** | Issue que propõe alterar escopo, prazo, custo ou qualidade e precisa de decisão |
| **Impedimento** | Issue que está bloqueando o trabalho de alguém |
| **Decisão pendente** | Issue que existe porque uma decisão ainda não foi tomada |
| **Probabilidade** | Escala de 1 a 5: quão provável é que o risco aconteça |
| **Impacto** | Escala de 1 a 5: quão grave é o efeito se o risco acontecer |
| **Severidade** | Probabilidade multiplicada pelo impacto, de 1 a 25. É a prioridade do risco |
| **Nível** | A faixa da severidade: **Baixo**, **Médio**, **Alto** ou **Extremo** |
| **Matriz 5 × 5** | A grade com probabilidade em um eixo e impacto no outro. Cada célula tem uma severidade |
| **Categoria** | A natureza do risco: escopo, prazo, custo, qualidade, recursos, técnico, regulatório, segurança, fornecedor, mercado, pessoas ou outro |
| **Estratégia de resposta** | A abordagem escolhida para lidar com o risco — evitar, mitigar, transferir, aceitar, explorar, elevar ou compartilhar |
| **Plano de resposta** | O que será feito **antes** do risco acontecer, para reduzir a probabilidade ou o impacto |
| **Plano de contingência** | O que será feito **se** o risco acontecer |
| **Gatilho** | O sinal concreto que indica que o risco está se aproximando e a contingência deve ser acionada |
| **Risco residual** | A probabilidade e o impacto que **restam** depois de aplicar o plano de resposta |
| **Redução de severidade** | Quanto a severidade caiu da situação original para a residual |
| **Custo de mitigação** | Quanto custa executar o plano de resposta |
| **Valor monetário esperado (VME)** | Quanto o risco representa em dinheiro, considerando a chance de acontecer. É um valor informado pelo time |
| **Exposição** | Quanto o risco representa financeiramente para o projeto, calculado pelo sistema |
| **Heatmap** | O mapa de calor que compara o nível de risco entre projetos |
| **Índice de risco** | Nota de 0 a 100% que resume a severidade média dos riscos de um projeto |
| **Prioridade** | Nas issues: **Baixa**, **Média**, **Alta** ou **Crítica** |
| **Idade** | Quantos dias a issue está aberta, da abertura até hoje (ou até a resolução) |

## Tarefas passo a passo

### Registrar um risco

**Para que serve:** colocar o risco no radar do time e dar a ele uma prioridade objetiva na matriz. Risco que não
está registrado não é monitorado.

1. Abra **Riscos e qualidade › Matriz de riscos**.
2. Clique em **Novo risco**. A janela **Novo risco** abre com o subtítulo "Registre o risco e posicione-o
   automaticamente na matriz".
3. Em **Projeto**, escolha o projeto. É obrigatório.
4. Em **Categoria**, escolha a natureza do risco.
5. Em **Descrição do risco**, escreva o risco de forma concreta. É obrigatório.
6. Em **Causa raiz**, registre a origem — o que faria esse risco existir.
7. Em **Efeito potencial**, registre a consequência se ele acontecer.
8. Ajuste o controle **Probabilidade**, de 1 a 5.
9. Ajuste o controle **Impacto**, de 1 a 5.
10. Observe o quadro **Severidade calculada**: ele mostra o valor, o nível e a multiplicação usada.
11. Em **Estratégia**, escolha a resposta pretendida.
12. Em **Responsável**, escolha quem acompanha o risco.
13. Em **Status**, escolha a situação atual.
14. Em **Prazo da resposta**, informe até quando a resposta deve estar pronta.
15. Preencha **Custo de mitigação (R$)** e **Valor monetário esperado (R$)** quando houver número.
16. Preencha **Plano de resposta** e **Plano de contingência**.
17. Em **Gatilhos de monitoramento**, liste os sinais de alerta.
18. Clique em **Registrar risco**.

**O que acontece depois:** o risco entra na matriz na célula correspondente à probabilidade e ao impacto, recebe
um código automático no formato R-001, R-002 e assim por diante, e o primeiro registro do histórico é criado com
o comentário "Risco identificado". Se o risco for de nível **Alto** ou **Extremo**, o gerente do projeto e o
responsável recebem uma notificação.

**Exemplo prático:** "Indisponibilidade do fornecedor de infraestrutura durante a migração", categoria
**Fornecedor**, probabilidade 3, impacto 5 — severidade 15, nível **Alto**. O responsável é o líder de
infraestrutura, com prazo de resposta em 30 dias, gatilho "atraso superior a 5 dias na entrega do fornecedor".

> **Atenção:** o campo **Gatilhos de monitoramento** aceita vários itens separados por vírgula, ponto e vírgula
> ou linha. Cada item vira uma etiqueta no detalhe do risco. Escreva gatilhos observáveis — "atraso de 5 dias",
> não "fornecedor ruim".

### Reposicionar um risco arrastando na matriz

**Para que serve:** reavaliar o risco quando a realidade muda. A matriz é viva: um risco que era improvável pode
virar provável depois de uma mudança de cenário.

1. Abra **Riscos e qualidade › Matriz de riscos**, na aba **Matriz interativa**.
2. Localize o card do risco na grade 5 × 5. Os eixos são **Probabilidade** (de 5, no topo, a 1) e **Impacto**
   (de 1 a 5, da esquerda para a direita).
3. Arraste o card e solte-o na célula que representa a nova avaliação.
4. A janela **Reposicionar risco na matriz** abre, mostrando a **Severidade anterior**, a **Nova severidade** e
   o código do risco no subtítulo.
5. Confira o **Comentário da movimentação**, que o sistema já preenche descrevendo a mudança. Ajuste o texto se
   quiser registrar o motivo.
6. Clique em **Confirmar movimento** para salvar, ou em **Cancelar** para desfazer o arraste.

**O que acontece depois:** a severidade, o nível e a cor do risco são recalculados, um registro é adicionado ao
**Histórico do risco** com data, autor, a nova posição e o comentário, e a matriz e o heatmap são atualizados.

**Exemplo prático:** o fornecedor confirmou o atraso. O risco sai de probabilidade 2 × impacto 4 (severidade 8,
**Médio**) para probabilidade 5 × impacto 4 (severidade 20, **Extremo**). O comentário registra o motivo, e o
risco salta para o topo das prioridades.

> **Atenção:** soltar o card na mesma célula de origem não gera movimento nem histórico. Se você arrastar por
> engano, clique em **Cancelar** — o risco volta para a posição original.

### Reavaliar probabilidade e impacto pelos controles

**Para que serve:** a mesma reavaliação do arraste, mas com o valor exato nas mãos.

1. Abra **Riscos e qualidade › Matriz de riscos**.
2. Na aba **Painel**, localize o risco na tabela **Riscos no filtro atual** e clique na linha para abrir o
   detalhe na matriz — ou clique diretamente no card do risco na aba **Matriz interativa**.
3. O painel de detalhe abre à direita com os valores de **probabilidade**, **impacto** e **severidade**.
4. Para mudar a situação do risco, use a lista **Status** no próprio detalhe.
5. Para reavaliar a posição, use o arraste na matriz (tarefa anterior).

### Analisar o detalhe de um risco

**Para que serve:** ter tudo sobre o risco em uma única leitura antes de decidir.

1. Abra **Riscos e qualidade › Matriz de riscos**.
2. Clique em um card na matriz. O card selecionado ganha um contorno destacado.
3. Leia o painel à direita:
   - o código, a descrição, o projeto e a categoria, com a etiqueta de nível;
   - os três números: **probabilidade**, **impacto** e **severidade**;
   - **Causa raiz** e **Efeito potencial**;
   - **Estratégia**, **Status**, **Responsável** e **Identificado em**;
   - **Prazo da resposta** — aparece em vermelho com a marca "· atrasado" quando venceu;
   - **Custo de mitigação**, **Valor monetário esperado** e **Exposição**;
   - as etiquetas de **Gatilhos de monitoramento**.
4. Use as seções recolhíveis **Plano de resposta** e **Histórico do risco** para ver mais.

> **Atenção:** o **Status** pode ser alterado direto nesse painel, pela lista suspensa. A mudança é gravada na
> hora e entra no histórico com o comentário "Status alterado no detalhe do risco".

### Escrever o plano de resposta e o plano de contingência

**Para que serve:** transformar um risco identificado em ação concreta, com responsável e prazo. É o que
diferencia uma lista de preocupações de um plano de gestão.

1. Abra **Riscos e qualidade › Matriz de riscos** e clique no card do risco.
2. No painel de detalhe, abra a seção recolhível **Plano de resposta**.
3. Em **Estratégia**, escolha a abordagem (veja a tabela em **Regras de negócio**).
4. Em **Plano de resposta**, descreva as ações preventivas, quem faz o quê e quais marcos serão verificados.
5. Em **Plano de contingência**, descreva o que será feito se o risco acontecer mesmo assim.
6. Ajuste **Probabilidade residual** e **Impacto residual** nos controles, de 0 a 5. Use 0 quando o risco for
   totalmente eliminado pela resposta.
7. Confira o quadro **Severidade residual**: ele mostra o novo valor, o novo nível, a redução em pontos e a
   redução em percentual.
8. Em **Prazo da resposta**, ajuste a data limite.
9. Em **Responsável**, escolha quem responde pelo plano.
10. Clique em **Salvar plano de resposta**.

**O que acontece depois:** o plano é gravado, o status do risco passa automaticamente para **Com resposta
planejada** e o responsável recebe uma notificação com o código do risco e o início do plano. A alteração fica
registrada na auditoria.

**Exemplo prático:** o risco de indisponibilidade do fornecedor recebe a estratégia **Mitigar**, com o plano de
resposta "contratar fornecedor secundário homologado até 30/06 e manter estoque de contingência de 2 semanas". A
probabilidade residual cai de 3 para 1 e o impacto residual de 5 para 3 — severidade residual 3, nível **Baixo**.
A redução sai de 15 para 3, uma queda de 12 pontos (80%).

> **Atenção:** informar a severidade residual não faz o risco desaparecer da matriz. Ele continua posicionado na
> posição **original**; o residual é um indicador do efeito da resposta. Para mudar a posição, arraste o card.

### Registrar gatilhos de monitoramento

**Para que serve:** dar ao time um sinal objetivo para agir. "Ficar de olho" não é gatilho; "atraso de cinco dias
na entrega" é.

1. Abra **Riscos e qualidade › Matriz de riscos** e clique em **Novo risco** — ou edite um risco existente pela
   janela de edição.
2. No campo **Gatilhos de monitoramento**, escreva um gatilho por linha, ou separe-os por vírgula ou ponto e
   vírgula.
3. Salve.

**O que acontece depois:** cada gatilho aparece como uma etiqueta laranja na seção **Gatilhos de monitoramento**
do detalhe do risco, com o ícone de raio.

**Exemplo prático:** "ocupação do fornecedor acima de 90%", "atraso superior a 5 dias na entrega", "rotatividade
acima de 10% no time".

### Usar o heatmap de riscos por projeto

**Para que serve:** comparar projetos e descobrir onde o portfólio está mais exposto. É a visão que o comitê
executivo precisa.

1. Abra **Riscos e qualidade › Matriz de riscos** e mude para a aba **Heatmap por projeto**.
2. Leia o gráfico **Índice de risco por projeto**: barras verdes até 45%, laranjas de 45% a 70% e vermelhas a
   partir de 70%.
3. Na tabela **Detalhamento por projeto**, veja **Projeto**, **Riscos**, **Severidade média**, **Distribuição
   por nível** e **Índice**.
4. Clique em **ver** na linha de um projeto para abrir o detalhamento, com **Riscos por nível** e **Riscos por
   categoria**.
5. Clique em **Filtrar na matriz** para voltar à aba **Matriz interativa** já filtrada por aquele projeto, ou em
   **Fechar** para recolher o detalhamento.

**O que acontece depois:** nada é alterado. Riscos com status **Encerrado** não entram no heatmap.

### Ler o painel de riscos

**Para que serve:** ter o retrato consolidado do portfólio em uma única tela, incluindo o cruzamento com as
issues.

1. Abra **Riscos e qualidade › Matriz de riscos** e mude para a aba **Painel**.
2. Leia os indicadores do topo: **Riscos ativos**, **Exposição total**, **Custo de mitigação**, **Riscos
   extremos**, **Issues abertas** e **Issues atrasadas**.
3. Analise os gráficos **Riscos por nível**, **Riscos por categoria** e **Estratégias adotadas**.
4. Leia **Top riscos por severidade** e clique em qualquer item para abrir o risco na matriz.
5. Verifique **Respostas atrasadas**. Se não houver nenhuma, o sistema mostra a mensagem "Nenhuma resposta em
   atraso".
6. Consulte **Riscos por projeto** e clique em uma linha para filtrar a matriz por aquele projeto.
7. Leia **Riscos no filtro atual**, com as colunas **Código**, **Risco**, **Nível**, **P × I**, **Exposição** e
   **Responsável**.
8. Veja os gráficos **Issues por tipo**, **Issues por prioridade** e **Issues por projeto**.
9. Feche com a **Matriz consolidada**, que mostra a contagem de riscos em cada célula da grade 5 × 5.

**O que acontece depois:** nada é alterado. Use o filtro **Projeto** no topo para restringir todo o painel a um
projeto.

### Registrar uma issue, ação corretiva, mudança ou impedimento

**Para que serve:** tirar o problema da conversa informal e colocá-lo em um fluxo com responsável, prazo e
status — para que nada se perca.

1. Abra **Riscos e qualidade › Issues e ações**.
2. Clique em **Nova issue**. A janela **Nova issue** abre com o subtítulo "Registre issues, ações corretivas,
   mudanças ou impedimentos".
3. Em **Projeto**, escolha o projeto. É obrigatório.
4. Em **Tipo**, escolha **Issue**, **Ação corretiva**, **Solicitação de mudança**, **Impedimento** ou **Decisão
   pendente**.
5. Em **Título**, escreva uma frase que descreva o problema. É obrigatório.
6. Em **Descrição**, detalhe o contexto.
7. Em **Prioridade**, escolha **Baixa**, **Média**, **Alta** ou **Crítica**.
8. Em **Status**, escolha a situação inicial — normalmente **Aberta**.
9. Em **Responsável**, escolha quem vai tratar.
10. Em **Impacto**, descreva o que acontece se a issue não for tratada.
11. Em **Aberta em**, confirme a data de abertura.
12. Em **Prazo**, informe o limite desejado.
13. Em **Esforço estimado (h)** e **Custo estimado (R$)**, informe a estimativa quando houver.
14. Clique em **Registrar issue**.

**O que acontece depois:** a issue recebe um código automático com prefixo conforme o tipo — **I** para issue,
**AC** para ação corretiva, **M** para solicitação de mudança, **IM** para impedimento e **D** para decisão
pendente — e entra na primeira coluna do Kanban. Se houver responsável definido, ele recebe uma notificação.

**Exemplo prático:** "Integração com o ERP falha em lotes acima de 5 mil registros", tipo **Issue**, prioridade
**Alta**, responsável o analista de integração, prazo em dez dias.

> **Atenção:** o sistema não bloqueia a criação de issues parecidas. Antes de registrar, use a busca para
> verificar se já existe um item em aberto sobre o mesmo assunto — duplicidade polui o Kanban.

### Mover uma issue no Kanban

**Para que serve:** refletir o andamento real do tratamento sem abrir formulário. O Kanban é o retrato do fluxo.

1. Abra **Riscos e qualidade › Issues e ações**, na aba **Kanban**.
2. Localize o card na coluna atual. As colunas são **Aberta**, **Em triagem**, **Em análise**, **Em andamento**,
   **Aguardando terceiros**, **Resolvida**, **Fechada** e **Cancelada**.
3. Arraste o card e solte-o na coluna de destino.

**O que acontece depois:** o status da issue é atualizado, o card passa a ocupar a última posição da nova coluna
e o movimento é registrado no histórico de atividades do projeto. Ao entrar em **Resolvida** ou **Fechada**, o
sistema grava automaticamente a data de resolução.

**Exemplo prático:** a issue está em **Aguardando terceiros** porque dependia do fornecedor. O fornecedor
respondeu: arraste o card para **Em andamento**. Quando a correção for validada, arraste para **Resolvida**.

> **Atenção:** arrastar para **Resolvida** ou **Fechada** grava a data de resolução na hora. Se a validação
> falhar depois, arraste o card de volta — mas a data já registrada permanece até que você a ajuste na edição.

### Editar uma issue

**Para que serve:** manter descrição, responsável, prazo, esforço e custo corretos, e registrar a solução
aplicada.

1. Abra **Riscos e qualidade › Issues e ações**.
2. Clique no card, no Kanban, ou na linha, na aba **Tabela**.
3. No painel lateral **Editar issue**, revise os três números do topo: **dias em aberto**, se está **atrasada** e
   quantos dias levou **até resolver**.
4. Ajuste **Título**, **Descrição**, **Tipo**, **Prioridade**, **Status**, **Projeto**, **Responsável**,
   **Impacto** e **Solução aplicada**.
5. Ajuste **Aberta em**, **Prazo** e **Resolvida em**.
6. Ajuste **Esforço estimado (h)** e **Custo estimado (R$)**.
7. Clique em **Salvar issue**.

**O que acontece depois:** a issue é atualizada no Kanban e nas abas **Resumo** e **Tabela**.

> **Atenção:** registrar a **Solução aplicada** não é burocracia — é o que permite reaproveitar a resposta
> quando o mesmo problema aparecer em outro projeto.

### Excluir uma issue

**Para que serve:** remover um registro criado por engano.

1. Abra **Riscos e qualidade › Issues e ações** e clique no card ou na linha da issue.
2. No painel lateral, clique em **Excluir**.
3. Leia a confirmação, que mostra o código e o título.
4. Clique em **Excluir**.

**O que acontece depois:** a issue sai do Kanban, da tabela e dos indicadores. A exclusão não pode ser desfeita.

> **Atenção:** se a issue foi cancelada por decisão do time, prefira mover o card para **Cancelada** em vez de
> excluir. Assim o registro permanece visível e a decisão fica documentada.

### Analisar o resumo das issues

**Para que serve:** entender o volume e a qualidade do tratamento — quantas issues existem, quantas estão
atrasadas e quanto tempo o time leva para resolver.

1. Abra **Riscos e qualidade › Issues e ações** e mude para a aba **Resumo**.
2. Leia os indicadores: **Total de issues**, **Abertas**, **Atrasadas**, **Tempo médio de resolução**, **Tipos
   distintos** e **Críticas abertas**.
3. Analise os gráficos **Por tipo**, **Por prioridade (abertas)** e **Por status**.
4. Ajuste os filtros no topo para analisar um projeto, um tipo, uma prioridade ou um responsável específico.

### Usar a tabela de issues

**Para que serve:** analisar muitas issues ao mesmo tempo, ordenar por idade, prazo, esforço ou custo, e exportar
o raciocínio para uma reunião.

1. Abra **Riscos e qualidade › Issues e ações** e mude para a aba **Tabela**.
2. Leia as colunas: **Código**, **Issue**, **Tipo**, **Prioridade**, **Responsável**, **Status**, **Idade**,
   **Prazo**, **Esforço** e **Custo**.
3. Clique no cabeçalho de uma coluna para ordenar.
4. Linhas com prazo vencido aparecem destacadas em vermelho.
5. Clique em qualquer linha para abrir a edição.

### Filtrar riscos

**Para que serve:** trabalhar com um recorte — um projeto, um nível, uma categoria, um responsável.

1. Abra **Riscos e qualidade › Matriz de riscos**.
2. Use os filtros **Projeto**, **Categoria**, **Status**, **Nível** e **Responsável**.
3. Os filtros valem para as três abas: matriz, heatmap e painel.
4. Os filtros aplicados aparecem como etiquetas removíveis; clique no X para remover um ou em **Limpar** para
   tirar todos.

### Consultar o histórico de um risco

**Para que serve:** reconstruir a trajetória do risco — quando foi identificado, quando mudou de posição, quando
o status mudou e quem fez cada alteração.

1. Abra **Riscos e qualidade › Matriz de riscos** e clique no card do risco.
2. Abra a seção recolhível **Histórico do risco**. O número ao lado do título indica quantos registros existem.
3. Cada registro mostra data e hora, o comentário, a etiqueta com **P × I = severidade**, o status e quem
   registrou.

**O que acontece depois:** a leitura é apenas informativa. O histórico é alimentado automaticamente a cada
movimentação, mudança de severidade, alteração de status e salvamento de plano de resposta.

### Acompanhar as respostas atrasadas

**Para que serve:** garantir que os planos de resposta não fiquem parados. Um plano sem prazo cumprido é uma
promessa vazia.

1. Abra **Riscos e qualidade › Matriz de riscos** e vá para a aba **Painel**.
2. Leia o cartão **Respostas atrasadas**. Cada item mostra o responsável, a descrição do risco, o código e o
   prazo vencido.
3. Clique em um item para abrir o risco na matriz e ajustar o plano.
4. Na aba **Matriz interativa**, o rodapé da matriz mostra quantos riscos estão com resposta atrasada.
5. No detalhe do risco, o campo **Prazo da resposta** aparece em vermelho com a marca "· atrasado".

## Campos e o que significam

### Risco

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Projeto** | O projeto ao qual o risco pertence | Escolha na lista | Sim |
| **Descrição do risco** | O que pode acontecer | Frase concreta, começando pelo evento | Sim |
| **Causa raiz** | A origem do risco | Texto livre | Não |
| **Efeito potencial** | A consequência se acontecer | Texto livre | Não |
| **Categoria** | A natureza do risco | Escolha entre as doze categorias | Sim |
| **Probabilidade** | Chance de acontecer, de 1 a 5 | Ajuste o controle | Sim |
| **Impacto** | Gravidade do efeito, de 1 a 5 | Ajuste o controle | Sim |
| **Severidade** | Probabilidade × impacto, de 1 a 25 | Calculada pelo sistema | Automático |
| **Nível** | **Baixo**, **Médio**, **Alto** ou **Extremo** | Calculado pelo sistema | Automático |
| **Estratégia** | A abordagem de resposta | Escolha entre as sete estratégias | Sim |
| **Plano de resposta** | O que será feito antes do risco acontecer | Ações, responsáveis e marcos | Não |
| **Plano de contingência** | O que será feito se acontecer | Ações de reação | Não |
| **Gatilhos de monitoramento** | Sinais que indicam aproximação do risco | Um por linha, ou separados por vírgula ou ponto e vírgula | Não |
| **Probabilidade residual** | A chance que resta após a resposta, de 0 a 5 | Ajuste o controle | Não |
| **Impacto residual** | O impacto que resta após a resposta, de 0 a 5 | Ajuste o controle | Não |
| **Severidade residual** | Probabilidade residual × impacto residual | Calculada pelo sistema | Automático |
| **Responsável** | Quem responde pelo risco | Escolha na lista | Não |
| **Status** | A situação do risco no ciclo de vida | Escolha na lista | Sim |
| **Prazo da resposta** | Até quando o plano deve estar pronto | Informe a data | Não |
| **Custo de mitigação (R$)** | Quanto custa executar a resposta | Informe o valor | Não |
| **Valor monetário esperado (R$)** | Quanto o risco representa em dinheiro | Informe o valor | Não |

### Issue

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Projeto** | O projeto onde o problema ocorreu | Escolha na lista | Sim |
| **Título** | Resumo do problema | Frase curta e específica | Sim |
| **Descrição** | O contexto do problema | Texto livre | Não |
| **Tipo** | **Issue**, **Ação corretiva**, **Solicitação de mudança**, **Impedimento** ou **Decisão pendente** | Escolha na lista | Sim |
| **Prioridade** | **Baixa**, **Média**, **Alta** ou **Crítica** | Escolha na lista | Sim |
| **Status** | A coluna do Kanban em que a issue está | Escolha na lista ou arraste o card | Sim |
| **Impacto** | O que acontece se a issue não for tratada | Texto livre | Não |
| **Solução aplicada** | O que resolveu o problema | Texto livre, preenchido ao resolver | Não |
| **Responsável** | Quem trata a issue | Escolha na lista | Não |
| **Aberta em** | Quando a issue foi registrada | Informe a data | Sim |
| **Prazo** | Até quando deve ser resolvida | Informe a data | Não |
| **Resolvida em** | Quando foi resolvida | Preenchida automaticamente ao mover para **Resolvida** ou **Fechada** | Automático |
| **Esforço estimado (h)** | Horas previstas para resolver | Informe o número | Não |
| **Custo estimado (R$)** | Custo previsto do tratamento | Informe o valor | Não |

## Regras de negócio

### Como a severidade é calculada

**Severidade = probabilidade × impacto.** As duas escalas vão de 1 a 5, então a severidade vai de 1 a 25. O
cálculo é feito pelo sistema toda vez que o risco é salvo — você não digita a severidade, você digita a
probabilidade e o impacto.

Você pode ler a matriz assim: a probabilidade diz "quão provável", o impacto diz "quão caro", e a multiplicação
diz "quanto isso deveria ocupar da minha atenção".

### As faixas de severidade

| Severidade | Nível | Cor | Leitura de negócio |
|---|---|---|---|
| 1 a 4 | **Baixo** | Verde | Aceitável. Monitore e siga |
| 5 a 9 | **Médio** | Amarelo | Exige plano de resposta, mas não urgência |
| 10 a 16 | **Alto** | Laranja | Exige plano de resposta com prazo curto e acompanhamento frequente |
| 17 a 25 | **Extremo** | Vermelho | Exige ação imediata e visibilidade na instância de governança |

Riscos **Altos** e **Extremos** disparam notificação para o gerente do projeto e para o responsável no momento do
cadastro.

### Códigos automáticos

Riscos recebem códigos sequenciais por projeto, no formato **R-001**, **R-002** e assim por diante. Issues
recebem um prefixo conforme o tipo: **I** para issue, **AC** para ação corretiva, **M** para solicitação de
mudança, **IM** para impedimento e **D** para decisão pendente — sempre com três dígitos.

### Como as sete estratégias de resposta funcionam

| Estratégia | Quando usar | Exemplo |
|---|---|---|
| **Evitar** | Quando é possível eliminar a causa do risco e o custo de fazer isso é menor que o risco | Trocar uma tecnologia instável por outra já dominada pelo time |
| **Mitigar** | Quando não dá para eliminar o risco, mas dá para reduzir a probabilidade ou o impacto. É a estratégia mais comum | Contratar um fornecedor secundário homologado para reduzir a chance de parada |
| **Transferir** | Quando outra parte pode assumir o risco — por contrato, seguro ou garantia | Exigir do fornecedor cláusula de multa por atraso e seguro de responsabilidade |
| **Aceitar** | Quando o custo de agir é maior que o risco, ou quando o risco é baixo. Aceitar é uma decisão consciente, não omissão | Aceitar o risco de oscilação cambial de um contrato pequeno e monitorar |
| **Explorar** | Para **oportunidades**: quando se quer aumentar a chance de um evento positivo acontecer | Antecipar a contratação de um especialista para aproveitar uma janela de mercado |
| **Elevar** | Para **oportunidades**: quando se quer aumentar o impacto positivo, garantindo que ele seja maior se acontecer | Ampliar o escopo de um piloto bem-sucedido para capturar mais ganho |
| **Compartilhar** | Para **oportunidades**: quando o ganho depende de parceiro ou de outra área | Fechar parceria para dividir o investimento e o retorno de uma nova linha |

**Em linguagem de negócio:** as quatro primeiras tratam ameaças; as três últimas tratam oportunidades. A escolha
não é técnica, é econômica — vale mais gastar para reduzir o risco do que conviver com ele?

### Risco residual e redução de severidade

Depois de definir o plano de resposta, você informa a **probabilidade residual** e o **impacto residual**, ambas
de 0 a 5. O sistema calcula a **severidade residual** multiplicando as duas. Usar zero significa que a resposta
elimina o risco completamente.

A **redução de severidade** é a diferença entre a severidade original e a residual. O sistema mostra a redução em
pontos e em percentual — por exemplo, "Redução de 15 para 3" e "-12 pontos (80%)".

> **Atenção:** o risco continua posicionado na matriz na posição **original**. A severidade residual não move o
> card. Se a resposta efetivamente mudou a realidade, arraste o card para a nova célula — assim a matriz reflete
> o presente.

### Como a exposição é calculada

Na tela de riscos, o sistema calcula a exposição de cada risco assim:

- se houver **custo de mitigação** informado: exposição = (probabilidade ÷ 5) × custo de mitigação;
- se não houver custo de mitigação: exposição = (severidade ÷ 25) × 100.

Na aba **Riscos** do projeto, o cartão **Exposição** soma os valores de **Valor monetário esperado** informados
nos riscos daquele projeto.

**Em linguagem de negócio:** a exposição é uma estimativa de quanto aquele risco "pesa" financeiramente,
ponderada pela chance de acontecer. O **Valor monetário esperado** é o número que o time informa; a exposição da
tela de riscos é o número que o sistema calcula.

### Quando um risco é considerado atrasado

Um risco é marcado como atrasado quando o **Prazo da resposta** já passou e o status não é **Encerrado**. Riscos
atrasados aparecem no cartão **Respostas atrasadas** do painel, no rodapé da matriz e em vermelho no detalhe.

### Como o índice de risco por projeto é calculado

O sistema soma a severidade de todos os riscos ativos do projeto — excluindo os **Encerrados** — e divide pela
quantidade, chegando à **severidade média**. O **índice de risco** é essa média dividida por 25 e multiplicada
por 100, limitada a 100%.

**Em linguagem de negócio:** se todos os riscos de um projeto fossem de severidade 25, o índice seria 100%. Se
todos fossem de severidade 5, o índice seria 20%. As cores seguem a mesma lógica do semáforo: verde abaixo de
45%, laranja de 45% a 70% e vermelho a partir de 70%.

### Como a exposição total do painel é calculada

O painel soma a exposição de cada risco ativo do portfólio, usando a mesma regra descrita acima. Também soma o
**Custo de mitigação** de todos os riscos ativos, que representa o investimento planejado para tratar o risco.

### O que é registrado no histórico automaticamente

O sistema cria um registro no histórico sempre que:

- o risco é cadastrado — com o comentário "Risco identificado";
- o risco é reposicionado na matriz — com o comentário que você escreveu;
- a probabilidade, o impacto ou o status mudam em uma edição;
- o status é alterado pelo detalhe do risco — com o comentário "Status alterado no detalhe do risco".

Cada registro guarda a probabilidade, o impacto, a severidade, o status, o comentário, a data e quem registrou.

### Quando o plano de resposta é salvo

Ao clicar em **Salvar plano de resposta**, o sistema grava a estratégia, os dois planos, as severidades residuais,
o prazo e o responsável — e muda o status do risco para **Com resposta planejada**. Se houver responsável
definido, ele recebe uma notificação com o código do risco e o início do plano.

### O ciclo de vida do risco

| Status | Significado |
|---|---|
| **Identificado** | O risco foi registrado, mas ainda não foi analisado |
| **Em análise** | O time está avaliando probabilidade, impacto e alternativas |
| **Com resposta planejada** | O plano de resposta está escrito e aprovado. É o status assumido automaticamente ao salvar o plano |
| **Mitigação em curso** | As ações do plano estão sendo executadas |
| **Monitorando** | O plano foi executado; o risco segue sob observação |
| **Ocorrido** | O risco se materializou. A partir daqui ele deve virar uma issue |
| **Encerrado** | O risco não existe mais. Sai da matriz, do heatmap e dos indicadores |

### O Kanban de issues e o que ele registra

O Kanban tem uma coluna por status, na ordem do fluxo: **Aberta**, **Em triagem**, **Em análise**, **Em
andamento**, **Aguardando terceiros**, **Resolvida**, **Fechada** e **Cancelada**.

Ao mover um card para **Resolvida** ou **Fechada**, o sistema grava automaticamente a data de resolução e o
movimento entra no histórico de atividades do projeto. O status **Cancelada** não conta como resolvida.

### Como a idade e o atraso das issues são calculados

A **idade** é o número de dias entre a abertura e hoje — ou entre a abertura e a data de resolução, quando já
resolvida. Uma issue é considerada **atrasada** quando o **Prazo** já passou e o status não é **Resolvida**,
**Fechada** nem **Cancelada**.

O **Tempo médio de resolução** é a média de dias das issues que já têm data de resolução.

## Como ler os indicadores

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Riscos ativos** | Riscos com status diferente de **Encerrado** | Volume de incerteza sob gestão | Sem faixa fixa; comparar entre projetos de porte semelhante |
| **Riscos extremos** | Riscos de severidade 17 a 25 | Os que exigem ação imediata | Zero |
| **Exposição total** | Soma da exposição dos riscos ativos | Quanto o portfólio tem em jogo por causa dos riscos | Quanto menor, melhor; comparar com o orçamento |
| **Custo de mitigação** | Soma do custo planejado das respostas | Quanto se pretende investir para tratar os riscos | Deve ser menor que a exposição total |
| **Respostas atrasadas** | Riscos com prazo de resposta vencido | Planos que não estão sendo cumpridos | Zero |
| **Riscos por nível** | Distribuição entre Baixo, Médio, Alto e Extremo | Uma pirâmide saudável tem mais riscos baixos e poucos extremos | Poucos altos e extremos |
| **Riscos por categoria** | Concentração por natureza do risco | Categorias concentradas indicam fragilidade estrutural | Distribuição equilibrada |
| **Estratégias adotadas** | Quantos riscos usam cada estratégia | Muitos riscos **Aceitar** podem indicar acomodação | Maioria em **Mitigar** |
| **Severidade média** | Média das severidades dos riscos do projeto | Resume o peso médio do risco do projeto | Abaixo de 10 |
| **Índice de risco** | Severidade média convertida em percentual de 0 a 100% | Compara projetos entre si | Abaixo de 45% |
| **Issues abertas** | Issues sem resolução, fechamento ou cancelamento | Volume de problemas em tratamento | Estável ou em queda |
| **Issues atrasadas** | Issues com prazo vencido e ainda abertas | Problemas que passaram do prazo combinado | Zero |
| **Tempo médio de resolução** | Média de dias entre abertura e resolução | Velocidade de resposta do time | Quanto menor, melhor; comparar com o prazo médio prometido |
| **Idade** | Dias que uma issue está aberta | Issues muito antigas indicam problema sem dono ou sem decisão | Abaixo do prazo definido |
| **Críticas abertas** | Issues de prioridade **Crítica** ainda abertas | O que precisa de atenção hoje | Zero |

## Boas práticas

1. **Escreva o risco como evento, não como preocupação.** "Indisponibilidade do fornecedor durante a migração"
   é um risco; "o fornecedor é ruim" é um julgamento.
2. **Sempre preencha a causa raiz.** É a causa que se combate. Sem ela, o plano de resposta vira paliativo.
3. **Reserve meia hora por semana para a matriz.** Riscos envelhecem rápido; uma matriz desatualizada dá falsa
   segurança.
4. **Escreva gatilhos observáveis.** Um gatilho precisa ser algo que qualquer pessoa do time consiga verificar
   sozinha, sem interpretação.
5. **Não deixe risco Alto ou Extremo sem responsável.** Risco sem dono é risco sem resposta.
6. **Aceitar é uma decisão, não um esquecimento.** Quando escolher **Aceitar**, registre no plano de resposta o
   porquê e qual será o monitoramento.
7. **Transforme risco ocorrido em issue na mesma reunião.** O risco saiu do campo da possibilidade — agora
   precisa de prazo e responsável.
8. **Feche o ciclo.** Toda issue resolvida deve ter a **Solução aplicada** preenchida; é isso que transforma
   problema em aprendizado.

## Perguntas frequentes

**1. Qual é a diferença entre risco e issue?**
Risco é algo que **pode** acontecer; issue é algo que **já** aconteceu. O risco tem probabilidade e impacto; a
issue tem prioridade, responsável e prazo.

**2. Posso registrar um risco sem projeto?**
Não. Todo risco pertence a um projeto, e o campo **Projeto** é obrigatório.

**3. Por que minha severidade mudou sozinha?**
Porque ela é calculada: sempre que a probabilidade ou o impacto mudam, o sistema recalcula a severidade, o nível
e a cor. Você não digita a severidade.

**4. O que significa o número dentro de cada célula da matriz?**
É a severidade daquela célula — probabilidade × impacto. A etiqueta menor ao lado mostra quantos riscos estão
posicionados ali.

**5. Arrastei um risco para a célula errada. Como desfaço?**
Na janela **Reposicionar risco na matriz**, clique em **Cancelar**. Nada é gravado até você clicar em **Confirmar
movimento**.

**6. Informei a severidade residual. O risco sai da matriz?**
Não. O card continua na posição original. Para refletir a nova realidade, arraste o card para a célula
correspondente.

**7. O que acontece quando movo uma issue para Resolvida?**
O sistema grava automaticamente a data de resolução, e o movimento entra no histórico de atividades do projeto.
Se a resolução não se confirmar, arraste o card de volta e ajuste a data na edição.

**8. Por que um projeto aparece no heatmap e não aparece no painel?**
Porque o heatmap só mostra projetos com pelo menos um risco ativo, e o painel lista todos os projetos, mesmo os
que têm zero riscos — nesse caso, com os valores zerados.

**9. Quem é notificado quando eu cadastro um risco extremo?**
O gerente do projeto e o responsável pelo risco recebem uma notificação com o nível do risco e o projeto. Ao
salvar o plano de resposta, o responsável é notificado novamente.

**10. O que é "Exposição" e por que ela muda entre a tela de riscos e a aba do projeto?**
Na tela de riscos, a exposição é calculada pelo sistema a partir da probabilidade e do custo de mitigação. Na aba
**Riscos** do projeto, o cartão **Exposição** soma os valores de **Valor monetário esperado** informados nos
riscos. São duas leituras complementares: uma calculada, outra informada pelo time.

## O que este módulo não faz

- **Não cria riscos automaticamente.** O sistema não varre tarefas, prazos ou custos para sugerir riscos. A
  identificação é trabalho humano.
- **Não transforma risco ocorrido em issue sozinho.** Ao marcar um risco como **Ocorrido**, nada é criado
  automaticamente — a issue precisa ser registrada.
- **Não dispara a contingência sozinho.** Os gatilhos são textos de monitoramento; o sistema não observa os
  indicadores citados nem avisa quando eles são atingidos.
- **Não calcula o valor monetário esperado.** O campo é informado pelo time; o sistema apenas soma e exibe.
- **Não tem workflow de aprovação de risco.** Não há alçada, aprovação em cadeia ou comitê dentro do módulo.
- **Não controla o orçamento da mitigação.** O **Custo de mitigação** é um valor de referência e não gera
  lançamento financeiro automaticamente.
- **Não faz análise de causa raiz estruturada.** Não há diagrama de Ishikawa, cinco porquês ou registro de ação
  preventiva formal.
- **Não substitui o comitê de riscos.** Ele organiza, prioriza e registra; a decisão continua sendo das pessoas.

## Veja também

- [Visão geral e primeiros passos](../docs/01-visao-geral-e-primeiros-passos.md) — navegação, perfis e notificações
- [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — quem pode ver e editar riscos
- [Projetos e cronograma](../docs/03-projetos-e-cronograma.md) — cadastro do projeto e a aba Riscos
- [Tarefas e execução](../docs/04-tarefas-e-execucao.md) — origem dos impedimentos e das ações corretivas
- [Financeiro e EVM](../docs/06-financeiro-e-evm.md) — custo de mitigação, exposição e orçamento do projeto
- [Dashboards e relatórios](../docs/09-dashboards-e-relatorios.md) — painel executivo e o painel de riscos
- [Colaboração e notificações](../docs/10-colaboracao-e-notificacoes.md) — comentários, menções e histórico
- [Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais do sistema

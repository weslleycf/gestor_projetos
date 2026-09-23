# Financeiro e EVM

## Em uma frase

O módulo Financeiro reúne o orçamento aprovado, os lançamentos de despesa e receita e os indicadores de valor
agregado (EVM) que mostram se o dinheiro gasto está virando entrega — e onde o projeto vai terminar se o ritmo
atual continuar.

## Para que serve

Projeto sem controle financeiro é projeto que surpreende. Este módulo existe para tirar a surpresa: ele consolida
o orçamento planejado de todos os projetos, registra cada despesa e cada receita com data de competência, e
compara o que foi gasto com o que foi efetivamente entregue.

O Painel financeiro dá a visão de portfólio: quanto existe de orçamento, quanto já foi consumido, quais projetos
estouraram e como o custo se distribui por categoria. É a tela para responder "onde está o dinheiro" em segundos.

A tela **EVM e curva S** entra no nível do projeto e responde à pergunta seguinte: "esse gasto está comprando
entrega?". Comparando o valor do trabalho que **deveria** estar pronto (PV), o valor do trabalho que **está**
pronto (EV) e o que **foi efetivamente gasto** (AC), o sistema projeta o custo final do projeto e o quanto ainda
falta gastar.

Com isso, o gerente consegue agir cedo: em vez de descobrir o estouro no encerramento, ele vê a tendência na
curva S e tem tempo para renegociar escopo, prazo ou fornecedor.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| Administrador | Acessa tudo, corrige cadastros financeiros e audita lançamentos | Pontual |
| Executivo (C-Level) | Acompanha o painel financeiro do portfólio, o CPI e o SPI médios e a lista de **Top estouros** | Semanal ou mensal |
| PMO | Padroniza categorias orçamentárias, confere orçado × realizado entre projetos e cobra desvios | Diária ou semanal |
| Gerente de Projetos | Registra e aprova lançamentos, acompanha o EVM e a curva S do seu projeto e explica os desvios | Diária |
| Líder Técnico, Membro de Equipe, RH e Stakeholder | Não têm acesso ao módulo financeiro — dependem dos relatórios enviados pelo PMO ou pelo gerente | — |

> **Atenção:** o acesso ao módulo depende da permissão financeira do seu perfil. Se os itens do grupo
> **Financeiro** não aparecem no menu lateral, seu perfil não tem essa permissão — peça ao administrador.

## Como chegar

O módulo fica no grupo **Financeiro** do menu lateral, com três itens:

| Caminho no menu | O que aparece ao abrir |
|---|---|
| **Financeiro › Painel financeiro** | Consolidado do portfólio: indicadores no topo, gráficos de CPI e SPI, **Top estouros**, planejado × realizado por categoria, série mensal, tabela de projetos, resumo consolidado e situação por categoria |
| **Financeiro › Lançamentos** | Lista de todas as despesas e receitas, com filtros, indicadores do período, gráficos por categoria e por mês e a tabela de lançamentos com as ações de aprovar, editar e excluir |
| **Financeiro › EVM e curva S** | Indicadores de valor agregado do projeto escolhido, a curva S interativa, os desvios ao longo do tempo, o orçado × realizado por categoria, o saldo acumulado projetado e o fluxo de caixa mensal |

Há ainda um atalho dentro do projeto: abra **Portfólio › Projetos**, clique no projeto e escolha a aba
**Financeiro**. Lá aparecem o orçado × realizado por categoria e o fluxo de caixa daquele projeto.

Ao abrir **EVM e curva S** sem ter escolhido nada, o sistema seleciona automaticamente o primeiro projeto da
lista. Use o seletor **Projeto** no topo para trocar.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **CAPEX** | Despesa de investimento: o que vira ativo ou capacidade duradoura (equipamentos, licenças perpétuas, infraestrutura) |
| **OPEX** | Despesa operacional: o que se consome no dia a dia (serviços mensais, horas de terceiros, suporte) |
| **Categoria orçamentária** | A "gaveta" do orçamento — por exemplo, Infraestrutura, Pessoal, Licenças. É por ela que o sistema mostra o consumo |
| **Linha orçamentária** | Cada linha do orçamento do projeto, com uma categoria, um tipo (CAPEX ou OPEX) e um valor planejado |
| **Valor planejado** | Quanto foi reservado para aquela categoria antes de gastar |
| **Valor comprometido** | Dinheiro já contratado, mas ainda não pago — a nota emitida, o serviço contratado |
| **Valor realizado** | Dinheiro efetivamente incorrido na categoria |
| **Saldo** | Planejado menos realizado. Saldo negativo significa estouro |
| **Consumo** | Quanto do planejado já foi usado, em percentual |
| **Despesa** | Saída de dinheiro. No sistema, entra com sinal negativo no resultado |
| **Receita** | Entrada de dinheiro. Pode ser contratada com o cliente ou projetada |
| **Data de competência** | O mês a que a despesa ou receita pertence, independentemente de quando será paga |
| **Data de pagamento** | Quando o dinheiro efetivamente sai ou entra |
| **Centro de custo** | O código contábil interno ao qual a despesa será apropriada |
| **Lançamento recorrente** | Marcação para despesas ou receitas que se repetem todo mês |
| **BAC** | *Budget at Completion* — o orçamento total aprovado para o projeto |
| **PV** | *Planned Value* — o valor do trabalho que **deveria** estar pronto na data de referência |
| **EV** | *Earned Value* — o valor do trabalho que **efetivamente** está pronto |
| **AC** | *Actual Cost* — o custo real já incorrido |
| **CV** | *Cost Variance* — variação de custo: EV menos AC |
| **SV** | *Schedule Variance* — variação de prazo: EV menos PV |
| **CPI** | *Cost Performance Index* — eficiência de custo: quanto de valor cada real gasto entrega |
| **SPI** | *Schedule Performance Index* — eficiência de prazo: quanto do planejado já foi entregue |
| **EAC** | *Estimate at Completion* — quanto o projeto deve custar no total, projetado pelo desempenho atual |
| **ETC** | *Estimate to Complete* — quanto ainda falta gastar para concluir |
| **VAC** | *Variance at Completion* — sobra ou estouro projetado no término |
| **TCPI** | *To-Complete Performance Index* — a eficiência que você precisa atingir no que resta para caber no orçamento |
| **Curva S** | O gráfico que mostra PV, EV e AC acumulados ao longo do tempo. Chama-se curva S pelo formato em "S" que o acúmulo de trabalho costuma desenhar |
| **Fluxo de caixa** | Entradas e saídas de dinheiro mês a mês, com o saldo acumulado |
| **ROI estimado** | Retorno sobre o investimento: a relação entre a receita prevista e o orçamento planejado |
| **Data de referência** | A data "de corte" do cálculo. Tudo o que aconteceu depois dela é ignorado naquele cálculo |

## Tarefas passo a passo

### Definir o orçamento total de um projeto e a divisão CAPEX/OPEX

**Para que serve:** sem orçamento aprovado não existe EVM. O valor total informado aqui é o BAC do projeto — a
régua contra a qual todo o desempenho será medido.

1. Abra **Portfólio › Projetos** e clique em **Novo projeto**.
2. Avance no assistente até o bloco **Orçamento**.
3. Preencha **Orçamento total (R$)**.
4. Preencha **Receita prevista (R$)** se houver receita contratada ou projetada para o projeto.
5. Ajuste o controle **Divisão CAPEX / OPEX**. O rótulo mostra **% CAPEX**; abaixo dele o sistema exibe, em tempo
   real, quanto do total ficou em **CAPEX** e quanto ficou em **OPEX**.
6. Conclua o assistente.

**O que acontece depois:** o projeto passa a ter orçamento aprovado, e o valor entra imediatamente na soma do
**Painel financeiro**. O EVM do projeto já pode ser calculado, ainda que todos os indicadores comecem em zero.

**Exemplo prático:** orçamento total de R$ 1.200.000 com o controle em 60% gera R$ 720.000 de CAPEX e R$ 480.000
de OPEX. Uma migração de data center costuma ter CAPEX alto; um contrato de sustentação, OPEX alto.

> **Atenção:** a divisão CAPEX/OPEX é registrada no projeto. O detalhamento por categoria é o passo seguinte —
> cada linha orçamentária recebe o seu próprio tipo (CAPEX ou OPEX).

### Ajustar o orçamento e a receita prevista de um projeto já cadastrado

**Para que serve:** corrigir o valor aprovado quando há aditivo contratual, corte de verba ou revisão de escopo.

1. Abra **Portfólio › Projetos** e clique no projeto desejado.
2. Clique em **Editar**.
3. Altere **Orçamento (R$)**.
4. Clique em **Salvar alterações**.

**O que acontece depois:** o BAC do projeto é recalculado e todos os indicadores derivados — EAC, VAC, consumo e
os semáforos de custo — mudam junto. O **Painel financeiro** reflete o novo valor na próxima atualização.

> **Atenção:** se o projeto tiver linhas orçamentárias por categoria cadastradas, o BAC passa a ser a **soma
> dessas linhas**, e não o valor do campo **Orçamento (R$)**. Nesse caso, ajuste as linhas para mudar o BAC.

### Acompanhar o painel financeiro do portfólio

**Para que serve:** ver, em uma única tela, quanto o conjunto de projetos tem de orçamento, quanto gastou e onde
estão os problemas.

1. Abra **Financeiro › Painel financeiro**.
2. Se quiser olhar apenas um programa, escolha-o no filtro **Programa**.
3. Leia a faixa de indicadores no topo: **Orçamento planejado**, **Custo realizado**, **Saldo**, **Receita
   prevista**, **ROI estimado**, **Consumo**, **CPI médio** e **SPI médio**.
4. Olhe os medidores **Desempenho de custo (CPI)** e **Desempenho de prazo (SPI)**.
5. Desça até **Top estouros** e clique em qualquer projeto da lista para abrir a página dele.
6. Compare **Planejado × realizado por categoria** — a barra clara é o planejado; a barra colorida é o realizado.
7. Confira a **Série mensal de despesas, receitas e saldo** e a tabela **Projetos**, que traz orçamento,
   realizado, CPI, SPI, EAC, VAC e a situação de cada projeto.
8. Clique em **Atualizar** quando quiser recarregar os números.

**O que acontece depois:** nada é alterado — é uma tela de leitura. As linhas com VAC negativo aparecem
destacadas em vermelho na tabela de projetos.

**Exemplo prático:** se **Consumo** está em 78% e **CPI médio** em 0,86, o portfólio gastou menos do que o
orçamento total, mas cada real gasto está entregando menos do que deveria. O problema ainda não apareceu no
saldo — vai aparecer no fim se nada mudar.

### Exportar o painel financeiro em CSV

**Para que serve:** levar os números para uma reunião de comitê, para uma planilha de acompanhamento ou para o
fechamento contábil.

1. Abra **Financeiro › Painel financeiro** e ajuste o filtro **Programa** se quiser exportar só um recorte.
2. Clique em **Exportar CSV**.
3. O arquivo financeiro-portfolio.csv é baixado. Ele abre em qualquer planilha.

O arquivo sai com o nome do programa, a data de geração, a faixa de indicadores, a quebra por categoria, a lista
de projetos com CPI, SPI, EAC e VAC, e a série mensal.

> **Atenção:** o arquivo é gerado com os dados que estão na tela no momento do clique. Se você mudou o filtro e
> não esperou o recarregamento, exporte novamente.

### Registrar uma despesa ou receita

**Para que serve:** lançar é o ato que alimenta todo o módulo. Sem lançamento não existe custo real, não existe
AC e não existe EVM.

1. Abra **Financeiro › Lançamentos**.
2. Clique em **Novo lançamento**. O painel lateral abre à direita.
3. Em **Projeto**, escolha o projeto. Este campo é obrigatório.
4. Em **Orçamento vinculado**, escolha a linha orçamentária que receberá a despesa — é opcional, mas recomendado
   (veja a tarefa seguinte).
5. Em **Tipo**, escolha **Despesa** ou **Receita**.
6. Em **Status**, escolha **Previsto**, **Comprometido**, **Realizado** ou **Cancelado**.
7. Em **Descrição**, escreva um texto que você reconheça daqui a seis meses. É obrigatório.
8. Em **Valor (R$)**, informe o valor. Precisa ser diferente de zero.
9. Em **Competência**, informe a data a que o lançamento pertence. É obrigatório.
10. Em **Pagamento**, informe a data efetiva, se já houver.
11. Em **Categoria**, escolha uma categoria existente ou digite uma nova. As categorias já usadas aparecem como
    sugestão.
12. Preencha **Fornecedor / cliente**, **Documento / NF** e **Centro de custo** quando aplicável.
13. Use **Observação** para condições de pagamento, rateios e detalhes.
14. Ligue **Lançamento recorrente** se for uma despesa ou receita que se repete todo mês.
15. Clique em **Salvar lançamento**.

**O que acontece depois:** o lançamento entra na lista, os indicadores da faixa do topo são recalculados, o custo
real do projeto é atualizado e a saúde do projeto é reavaliada. Se o lançamento estiver vinculado a uma linha
orçamentária, o realizado dessa linha é recalculado.

> **Atenção:** o status escolhido no cadastro muda o indicador. **Previsto** não entra no custo realizado;
> **Comprometido** e **Realizado** entram. Um lançamento previsto é uma intenção; um comprometido é um
> compromisso assumido.

### Vincular o lançamento a uma linha orçamentária

**Para que serve:** é o vínculo que faz o orçado × realizado por categoria funcionar. Sem ele, a despesa aparece
no total do projeto, mas não consome a gaveta certa.

1. Ao criar ou editar um lançamento, escolha primeiro o **Projeto**.
2. Abra **Orçamento vinculado**. As opções mostram categoria, tipo (CAPEX ou OPEX) e valor planejado.
3. Escolha a linha correta.
4. Ao escolher a linha, o campo **Categoria** do lançamento é preenchido automaticamente com a categoria dela.
   Ajuste se precisar.
5. Clique em **Salvar lançamento**.

**O que acontece depois:** o realizado daquela linha sobe, o consumo percentual da categoria é recalculado e o
semáforo da categoria pode mudar de verde para amarelo ou vermelho.

> **Atenção:** o campo **Orçamento vinculado** fica bloqueado enquanto você não escolher o projeto. Vincular a
> linha errada distorce o consumo da categoria — se acontecer, edite o lançamento e troque o vínculo.

### Aprovar lançamentos

**Para que serve:** aprovar é o ato de reconhecer que a despesa aconteceu. É a passagem de "comprometido" para
"realizado" e o que dá segurança contábil ao número.

1. Abra **Financeiro › Lançamentos**.
2. Encontre o lançamento. Você pode filtrar por **Status** para ver apenas o que está pendente.
3. Para aprovar um único lançamento, clique no ícone de aprovação na coluna **Ações** — o botão **Aprovar
   lançamento**.
4. Para aprovar vários de uma vez, marque a caixa de seleção de cada linha (ou a caixa do cabeçalho para
   selecionar tudo o que está filtrado) e clique em **Aprovar selecionados**.
5. Confirme a mensagem de sucesso.

**O que acontece depois:** o status do lançamento passa a **Realizado**, o sistema registra quem aprovou e
preenche a data de pagamento com a data de hoje caso ela esteja vazia. O realizado da linha orçamentária, o custo
real do projeto e a saúde do projeto são recalculados. A aprovação fica registrada na auditoria.

**Exemplo prático:** o gerente registra trinta notas de fornecedor no início do mês como **Comprometido**. Depois
da conferência, seleciona todas e clica em **Aprovar selecionados** — as trinta viram **Realizado** de uma vez.

> **Atenção:** lançamentos já **Realizado** ou **Cancelado** não exibem o botão de aprovação. Para reaprovar, é
> preciso voltar o status pela edição.

### Editar um lançamento

**Para que serve:** corrigir valor, data, categoria, vínculo ou status de um registro já salvo.

1. Abra **Financeiro › Lançamentos**.
2. Clique no ícone de lápis na coluna **Ações** — o botão **Editar lançamento**.
3. Ajuste os campos no painel lateral.
4. Clique em **Salvar lançamento**.

**O que acontece depois:** os totais, o consumo por categoria, o custo real do projeto e o EVM são recalculados
com o novo valor. A alteração fica na auditoria.

### Excluir um lançamento

**Para que serve:** remover um registro lançado por engano.

1. Abra **Financeiro › Lançamentos**.
2. Clique no ícone de lixeira na coluna **Ações** — o botão **Excluir lançamento**.
3. Leia a confirmação, que mostra a descrição e o valor.
4. Clique em **Excluir**.

**O que acontece depois:** o lançamento sai da lista e dos totais. A exclusão não pode ser desfeita.

> **Atenção:** se o valor já foi contabilizado fora do sistema, prefira mudar o status para **Cancelado** em vez
> de excluir. Assim o registro continua visível e a trilha permanece, mas o valor não conta nos indicadores.

### Filtrar e ordenar lançamentos

**Para que serve:** encontrar rapidamente um lançamento específico ou analisar um recorte — um fornecedor, um
mês, uma categoria.

1. Abra **Financeiro › Lançamentos**.
2. Use os filtros: **Projeto**, **Tipo**, **Status**, **Categoria**, **De** e **Até** (intervalo de
   competência).
3. Use a busca para procurar por descrição, fornecedor ou documento.
4. Em **Ordenar**, escolha **Competência**, **Valor** ou **Descrição**.
5. Os filtros aplicados aparecem como etiquetas removíveis logo abaixo da barra; clique no X de uma etiqueta para
   removê-la ou em **Limpar** para tirar todos.
6. Os indicadores do topo e os dois gráficos respondem aos filtros na hora.

### Acompanhar o EVM de um projeto

**Para que serve:** saber se o gasto está comprando entrega e onde o projeto vai terminar.

1. Abra **Financeiro › EVM e curva S**.
2. No seletor **Projeto**, escolha o projeto. O cabeçalho passa a mostrar código, nome e data de referência.
3. Leia a faixa de indicadores: **BAC (orçamento)**, **PV planejado**, **EV agregado**, **AC custo real**, **EAC
   projetado** e **VAC**.
4. Olhe os medidores **CPI — eficiência de custo** e **SPI — eficiência de prazo**. A meta é 1,00.
5. Leia o quadro **Projeção no término**: **Orçamento original (BAC)**, **EAC projetado**, **ETC (falta
   gastar)**, **VAC** e **TCPI necessário**.
6. Percorra os doze cartões de indicadores — passe o mouse sobre a sigla para ver a explicação.
7. Analise a **Curva S — PV × EV × AC**.
8. Verifique o gráfico **Desvios ao longo do tempo**: valores positivos são folga, negativos são problema.
9. Confira **Saldo acumulado projetado** e a tabela **Fluxo de caixa mensal**.
10. Se o CPI estiver abaixo de 0,90, o sistema exibe um alerta vermelho no fim da página explicando a projeção de
    estouro.

**O que acontece depois:** nada é alterado. É uma tela de leitura e diagnóstico.

### Mudar a data de referência do EVM

**Para que serve:** refazer o cálculo como se hoje fosse outro dia. Serve para entender o que aconteceu em um
marco passado ou para simular o fechamento de um período.

1. Abra **Financeiro › EVM e curva S**.
2. No campo **Data de referência**, escolha a data desejada.
3. Todos os indicadores, a curva S e o fluxo de caixa são recalculados considerando apenas o que ocorreu até essa
   data.
4. Para voltar ao cálculo de hoje, clique em **Limpar data**.

**Exemplo prático:** na reunião de encerramento de fase, coloque como referência a data do marco e mostre o CPI do
projeto naquele instante. Comparar com o CPI de hoje conta a história da fase.

### Inspecionar um instante da curva S

**Para que serve:** descobrir exatamente quando o desvio começou.

1. Abra **Financeiro › EVM e curva S** e escolha o projeto.
2. Clique em qualquer ponto da **Curva S — PV × EV × AC**.
3. O painel **Instante selecionado** mostra a data do ponto, o **PV planejado**, o **EV agregado**, o **AC custo
   real**, o **Desvio de custo** e o **Desvio de prazo** daquele momento.
4. Para limpar a seleção, clique no X do painel. Para inspecionar outro ponto, basta clicar nele.

**Exemplo prático:** o desvio de prazo começa a aparecer em um ponto e cresce nos seguintes. Volte alguns pontos
antes dele e verifique o que mudou no projeto naquelas semanas — normalmente é aí que está a causa.

### Ler a projeção no término

**Para que serve:** saber, hoje, quanto o projeto vai custar no fim — e se isso cabe no orçamento.

1. Abra **Financeiro › EVM e curva S** e escolha o projeto.
2. Vá ao quadro **Projeção no término**.
3. Compare **Orçamento original (BAC)** com **EAC projetado**.
4. Leia **ETC (falta gastar)** para saber o quanto ainda precisa ser desembolsado.
5. Leia **VAC**: positivo significa que o projeto deve terminar abaixo do orçamento; negativo, acima.
6. Leia **TCPI necessário**: é a eficiência que o time precisa atingir no que resta. Quanto mais acima de 1,00,
   mais difícil é a recuperação.

> **Atenção:** o EAC é uma projeção, não uma sentença. Ele assume que o desempenho passado continua. Se você
> tomar uma ação concreta — reduzir escopo, trocar fornecedor, repactuar contrato —, o EAC vai mudar nas próximas
> atualizações. Projeção serve para agir, não para constatar.

### Acompanhar o orçado × realizado por categoria

**Para que serve:** descobrir qual gaveta do orçamento está consumindo mais do que deveria.

1. Abra **Financeiro › EVM e curva S** e escolha o projeto.
2. Vá ao gráfico **Orçado × realizado por categoria**. A barra clara é o planejado; a colorida é o realizado.
3. Para a visão consolidada de todos os projetos, use o card **Planejado × realizado por categoria** do
   **Painel financeiro**.
4. Para o detalhamento com percentual por linha, abra o projeto em **Portfólio › Projetos**, entre na aba
   **Financeiro** e leia o card **Orçado × realizado por categoria**.

**O que acontece depois:** nada é alterado. Se uma categoria estourou, verifique se os lançamentos estão vinculados
à linha certa antes de concluir que o problema é real.

### Projetar o fluxo de caixa do projeto

**Para que serve:** antecipar a necessidade de caixa. Um projeto pode estar dentro do orçamento e, ainda assim,
precisar de dinheiro antes de receber.

1. Abra **Financeiro › EVM e curva S** e escolha o projeto.
2. Leia o gráfico **Saldo acumulado projetado** e o valor de **Saldo final projetado** abaixo dele.
3. Desça até a tabela **Fluxo de caixa mensal**. As colunas são **Período**, **Entradas**, **Saídas**,
   **Saldo**, **Previsto** e **Saldo acumulado**.
4. Clique no cabeçalho de qualquer coluna para ordenar.

**Exemplo prático:** um mês com **Saídas** altas e **Saldo** negativo, seguido de meses positivos, indica uma
necessidade pontual de caixa. Leve esse número para a conversa com o financeiro antes que o mês chegue.

## Campos e o que significam

### Lançamento

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Projeto** | O projeto ao qual a despesa ou receita pertence | Escolha na lista | Sim |
| **Orçamento vinculado** | A linha orçamentária que receberá o valor | Escolha a linha com a categoria e o tipo corretos | Não |
| **Tipo** | Se o lançamento é **Despesa** ou **Receita** | Escolha na lista | Sim |
| **Status** | **Previsto**, **Comprometido**, **Realizado** ou **Cancelado** | Escolha o estágio real do valor | Sim |
| **Descrição** | O que o lançamento representa | Texto curto e reconhecível | Sim |
| **Valor (R$)** | O valor do lançamento | Informe com duas casas decimais; não pode ser zero | Sim |
| **Competência** | O mês a que o valor pertence | Informe a data | Sim |
| **Pagamento** | Quando o dinheiro efetivamente sai ou entra | Informe a data ou deixe vazio; a aprovação preenche com a data de hoje | Não |
| **Categoria** | A gaveta usada nas análises | Escolha uma existente ou digite uma nova | Não |
| **Fornecedor / cliente** | Quem recebe ou paga | Texto livre | Não |
| **Documento / NF** | Nota fiscal, contrato ou pedido | Texto livre | Não |
| **Centro de custo** | Código contábil interno | Texto livre | Não |
| **Observação** | Detalhes, condições de pagamento, rateios | Texto livre | Não |
| **Lançamento recorrente** | Marca despesas ou receitas que se repetem mensalmente | Ligue o interruptor | Não |

### Linha orçamentária

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Categoria** | O nome da gaveta orçamentária | Texto curto — por exemplo, Infraestrutura | Sim |
| **Tipo** | **CAPEX** ou **OPEX** | Escolha o tipo do gasto | Sim |
| **Centro de custo** | Código contábil interno | Texto livre | Não |
| **Valor planejado (R$)** | Quanto foi reservado para a categoria | Informe o valor aprovado | Sim |
| **Valor realizado (R$)** | Quanto já foi gasto na categoria | Preenchido automaticamente pelos lançamentos vinculados | Automático |
| **Valor comprometido (R$)** | Quanto está contratado e ainda não pago | Mantido pelo sistema | Automático |
| **Cor** | Cor usada nos gráficos | Definida no cadastro | Não |
| **Observação** | Anotações sobre a linha | Texto livre | Não |

### Orçamento do projeto

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Orçamento total (R$)** | O valor aprovado para o projeto no assistente de cadastro | Informe o total aprovado | Recomendado |
| **Receita prevista (R$)** | Quanto o projeto deve gerar de receita | Informe a receita contratada ou projetada | Não |
| **Divisão CAPEX / OPEX** | O percentual do orçamento que é investimento | Ajuste o controle; o sistema calcula os dois valores | Não |
| **Orçamento (R$)** | O mesmo valor, editável depois pelo painel **Editar projeto** | Ajuste e clique em **Salvar alterações** | Recomendado |

## Regras de negócio

### Como o custo realizado é apurado

O sistema soma as despesas com status **Realizado** e **Comprometido**. Despesas apenas **Previstas** não entram
no custo; despesas **Canceladas** nunca entram. Receitas não reduzem o custo — elas aparecem separadamente.

### Como o orçamento total do projeto (BAC) é definido

Se o projeto tiver linhas orçamentárias cadastradas, o BAC é a **soma dos valores planejados** dessas linhas. Se
não tiver nenhuma, o sistema usa o campo **Orçamento (R$)** do projeto. Por isso, um projeto com linhas
orçamentárias tem o BAC controlado pelas linhas, não pelo campo do cadastro.

### Como o PV e o EV são calculados

O sistema distribui o BAC entre as tarefas do projeto proporcionalmente ao **esforço estimado** de cada uma. Se
uma tarefa não tem esforço informado, ela conta como uma unidade.

- O **PV** de uma tarefa é a fatia dela no BAC multiplicada pelo **progresso planejado** na data de referência.
- O **EV** de uma tarefa é a fatia dela no BAC multiplicada pelo **percentual de conclusão** real.

Se o projeto não tiver tarefas cadastradas, o sistema usa o progresso planejado e o percentual de conclusão do
próprio projeto, aplicados sobre o BAC.

**Em linguagem de negócio:** o orçamento é "fatiado" entre as tarefas conforme o esforço que cada uma exige. Uma
tarefa que consome 20% do esforço carrega 20% do orçamento. Ganhar valor significa concluir essas fatias.

### As fórmulas do EVM

| Indicador | Como o sistema calcula |
|---|---|
| **CV** (variação de custo) | EV − AC |
| **SV** (variação de prazo) | EV − PV |
| **CPI** (índice de custo) | EV ÷ AC. Se não houver custo lançado, o sistema assume 1,00 |
| **SPI** (índice de prazo) | EV ÷ PV. Se não houver valor planejado, o sistema assume 1,00 |
| **EAC** (estimativa no término) | BAC ÷ CPI — ou seja, o orçamento corrigido pelo desempenho atual |
| **ETC** (falta gastar) | EAC − AC |
| **VAC** (variação no término) | BAC − EAC |
| **TCPI** (índice para concluir) | (BAC − EV) ÷ (BAC − AC). Se o orçamento já estiver consumido, assume 1,00 |
| **Percentual consumido** | AC ÷ BAC × 100 |
| **Percentual agregado** | EV ÷ BAC × 100 |

### Os semáforos de custo e prazo

| Situação | Faixa | Leitura de negócio |
|---|---|---|
| Verde | CPI ou SPI maior ou igual a 0,95 | Desempenho dentro do aceitável |
| Amarelo | entre 0,85 e 0,95 | Desvio que exige atenção e plano de correção |
| Vermelho | abaixo de 0,85 | Desvio relevante; a recuperação exige decisão de patrocinador |

O mesmo critério é usado para o **CPI médio** e o **SPI médio** exibidos no painel do portfólio, calculados como a
média simples dos índices de todos os projetos ativos.

### Situação de cada linha orçamentária

Cada linha recebe um semáforo conforme o consumo:

| Consumo da linha | Situação |
|---|---|
| Até 90% do planejado | Verde |
| Acima de 90% e até 100% | Amarelo |
| Acima de 100% | Vermelho — a categoria estourou |

O valor realizado de uma linha é recalculado sempre que um lançamento de despesa vinculado a ela é salvo.
Despesas canceladas não entram nesse valor.

### O que acontece quando você aprova um lançamento

O status passa a **Realizado**, o sistema grava quem aprovou e, se a data de pagamento estiver vazia, preenche com
a data de hoje. Em seguida, o realizado da linha orçamentária é recalculado, o custo real do projeto é atualizado
e a saúde do projeto é reavaliada. A aprovação fica registrada na trilha de auditoria.

### Como a curva S é montada

O sistema percorre o período do projeto — da data de início à data de término, considerando também as datas das
tarefas — e calcula, ponto a ponto, três valores acumulados:

- **PV**: quanto do orçamento já deveria ter virado entrega naquele dia, distribuindo linearmente a duração de
  cada tarefa.
- **EV**: quanto do orçamento já virou entrega de fato, considerando o percentual de conclusão das tarefas.
- **AC**: quanto já foi gasto, somando as despesas com competência até aquele dia.

O gráfico mostra uma linha vertical na data de referência. Para gerar a curva, o projeto precisa ter data de
início e data de término definidas.

### Como o fluxo de caixa é projetado

O sistema monta a série mensal somando as entradas e saídas por mês de competência. Lançamentos com status
**Realizado** entram como realizado; os demais entram como previsto. Para os meses futuros, o saldo restante do
orçamento é distribuído nos meses que faltam até a data de término do projeto, gerando a linha **Previsto**. O
**Saldo acumulado** soma, mês a mês, o realizado e o previsto.

### Como o ROI estimado é calculado

ROI estimado = (Receita prevista − Orçamento planejado) ÷ Orçamento planejado × 100. Se o projeto não tiver
orçamento planejado, o sistema exibe zero.

## Como ler os indicadores

### A tabela do EVM para quem não é da área financeira

| Sigla | O que significa | Como interpretar | O que fazer quando está ruim |
|---|---|---|---|
| **BAC** | Orçamento total aprovado do projeto | É a régua. Todo o resto é comparado com ele | Se o BAC não reflete a realidade aprovada, corrija o orçamento do projeto ou as linhas por categoria antes de qualquer análise |
| **PV** | Valor do trabalho que **deveria** estar pronto na data de referência | É o plano. Sem PV não existe medida de atraso | Se o PV está baixo demais, o cronograma pode estar subestimado. Revise as datas e o esforço das tarefas |
| **EV** | Valor do trabalho que **está** pronto | É a entrega. Comparado ao PV, mostra o atraso; comparado ao AC, mostra a eficiência | EV baixo com tarefas marcadas como concluídas indica que os percentuais de conclusão não estão sendo atualizados. Cobre a atualização das tarefas |
| **AC** | Custo real já incorrido | É o gasto. Só faz sentido ao lado do EV | AC alto sem EV correspondente indica gasto antecipado ou lançamento em categoria errada. Revise os vínculos e o status dos lançamentos |
| **CV** | Variação de custo (EV − AC), em reais | Positivo: você entregou mais do que gastou. Negativo: gastou mais do que entregou | Negativo e crescendo: revise os contratos e o escopo do que resta. Leve o número para o patrocinador enquanto ainda há margem de manobra |
| **SV** | Variação de prazo (EV − PV), em reais | Positivo: adiantado. Negativo: atrasado. O valor representa quanto trabalho deixou de ser entregue | Negativo: revise o caminho crítico, realoque pessoas e renegocie prazos antes que o atraso chegue ao marco final |
| **CPI** | Eficiência de custo (EV ÷ AC) | 1,00 significa que cada real gasto virou um real de entrega. 0,90 significa que cada real entrega apenas noventa centavos | Abaixo de 0,95: investigue as causas, corte o que não agrega e renegocie fornecedores. Abaixo de 0,85: escale para o patrocinador — a recuperação exige decisão de escopo |
| **SPI** | Eficiência de prazo (EV ÷ PV) | 1,00 significa entrega no ritmo planejado. 0,90 significa 10% atrás do plano | Abaixo de 0,95: revise dependências, remova bloqueios e considere reforço temporário. Se o atraso for estrutural, renegocie o cronograma formalmente |
| **EAC** | Quanto o projeto deve custar no total | É o BAC corrigido pelo CPI. Se o EAC é maior que o BAC, o projeto tende a estourar | Acima do BAC: decida — corte escopo, reduza custo ou aprove orçamento adicional. Não deixe o número crescer sem decisão registrada |
| **ETC** | Quanto ainda falta gastar | Some o ETC ao AC para chegar ao EAC | Se o ETC é alto e o prazo é curto, o ritmo de gasto necessário pode ser inviável. Reveja o plano de desembolso com o financeiro |
| **VAC** | Sobra ou estouro projetado (BAC − EAC) | Positivo: deve sobrar. Negativo: deve faltar | Negativo: informe o patrocinador com o número exato e apresente opções. VAC negativo descoberto tarde vira crise |
| **TCPI** | Eficiência necessária no que resta | Igual a 1,00: basta manter o ritmo dentro do orçamento. Acima de 1,10: a recuperação é difícil | Muito acima de 1,10: recuperar mantendo o escopo é improvável. Reduza escopo, amplie orçamento ou aceite formalmente a projeção |

> **Atenção:** CPI e SPI respondem perguntas diferentes. Um projeto pode estar dentro do orçamento e atrasado
> (CPI bom, SPI ruim) ou adiantado e caro (SPI bom, CPI ruim). Nunca leia um sem o outro.

### Indicadores do painel financeiro

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Orçamento planejado** | Soma do BAC de todos os projetos no filtro | Base de comparação de tudo | — |
| **Custo realizado** | Soma das despesas realizadas e comprometidas | Deve crescer junto com a entrega | — |
| **Saldo** | Planejado menos realizado | Positivo: ainda há orçamento. Negativo: já se gastou mais do que se planejou | Maior ou igual a zero |
| **Receita prevista** | Soma das receitas contratadas ou projetadas | Só tem valor se comparada ao orçamento | — |
| **ROI estimado** | (Receita − Orçamento) ÷ Orçamento | Positivo indica que o projeto se paga | Acima de zero |
| **Consumo** | Percentual do orçamento já usado | Compare sempre com o percentual de conclusão do trabalho | Próximo do percentual entregue |
| **CPI médio** | Média dos índices de custo dos projetos ativos | Abaixo de 1,00 o gasto está entregando menos do que deveria | Maior ou igual a 0,95 |
| **SPI médio** | Média dos índices de prazo dos projetos ativos | Abaixo de 1,00 o avanço físico está atrás do plano | Maior ou igual a 0,95 |
| **Top estouros** | Projetos com maior diferença entre realizado e orçamento | Os primeiros da lista são os que exigem conversa primeiro | Nenhum projeto com desvio positivo |
| **Consumo por categoria** | Quanto cada categoria usou do seu planejado | Vermelho indica categoria estourada | Até 90% em verde |

## Boas práticas

1. **Lance no mês certo.** A data de competência define em qual período o valor aparece. Lançar tudo no último dia
   do mês distorce a curva S e o fluxo de caixa.
2. **Use os quatro status com disciplina.** Previsto é intenção, comprometido é contrato assinado, realizado é
   dinheiro incorrido. Misturar os conceitos faz o custo real mentir.
3. **Vincule sempre que existir linha orçamentária.** Uma despesa sem vínculo não consome a gaveta certa, e a
   análise por categoria perde valor.
4. **Aprove em lote, uma vez por semana.** Aprovar trinta lançamentos de uma vez é mais rápido do que trinta
   aprovações soltas — e mantém a data de pagamento coerente.
5. **Padronize os nomes das categorias.** "Infra", "Infraestrutura" e "infra-estrutura" viram três linhas
   diferentes no gráfico. Combine o vocabulário com o PMO.
6. **Olhe o CPI e o SPI juntos, toda semana.** O melhor momento de corrigir um desvio é quando ele ainda é
   pequeno.
7. **Leve o TCPI para a conversa de recuperação.** Ele mostra o quanto o time precisaria melhorar — é o argumento
   mais honesto para negociar escopo, prazo ou orçamento.
8. **Exporte o CSV antes do comitê.** O arquivo leva o recorte exato que está na tela e evita debate sobre qual
   número é o correto.

## Perguntas frequentes

**1. Por que meu CPI não aparece como 1,00 mesmo sem nenhuma despesa lançada?**
Porque o sistema assume 1,00 quando não há custo ou valor planejado para dividir. Sem lançamento, não existe
desvio a medir — o índice é neutro por definição.

**2. Cadastrei a despesa como Previsto. Ela já conta no custo realizado?**
Não. Só **Comprometido** e **Realizado** entram no custo real. Use **Previsto** para planejamento e mude o status
quando o compromisso for assumido.

**3. Por que o realizado da linha orçamentária é diferente do custo realizado do painel?**
Porque a linha considera apenas as despesas vinculadas a ela. O painel soma todas as despesas do projeto,
vinculadas ou não.

**4. A cerimônia de aprovação mudou o valor do lançamento?**
Não. A aprovação muda o status, registra quem aprovou e preenche a data de pagamento. O valor permanece o que
foi lançado.

**5. Posso ter dois lançamentos iguais no mesmo mês?**
Sim. O sistema não bloqueia duplicidade de descrição ou valor. Se lançar duas vezes por engano, exclua o
duplicado ou mude o status para **Cancelado**.

**6. A curva S não aparece. O que falta?**
O projeto precisa ter data de início e data de término definidas, e as tarefas precisam ter datas. Sem esse
período, o sistema não tem como distribuir o valor ao longo do tempo.

**7. Por que o EAC está maior que o orçamento se ainda não terminei?**
Porque o EAC projeta o custo final mantendo o desempenho atual. Se o CPI é 0,85, o sistema assume que o restante
também será gasto com essa eficiência. É um alerta, não uma fatalidade — ações concretas mudam a projeção.

**8. Quem pode aprovar lançamentos?**
Quem tem a permissão de edição financeira — administrador, PMO e gerente de projetos. Executivo, líder técnico,
membro de equipe, RH e stakeholder não têm acesso ao módulo.

**9. O que é a data de referência e quando devo usá-la?**
É a data de corte do cálculo. Use quando quiser reproduzir o que o projeto mostrava em uma data passada — em
reuniões de encerramento de fase ou em análises de causa de desvio.

**10. O lançamento recorrente cria as parcelas seguintes automaticamente?**
Não. A marcação identifica a despesa como recorrente para consulta e organização. O cadastro das parcelas
seguintes é manual.

## O que este módulo não faz

- **Não faz contabilidade oficial.** Os lançamentos são gerenciais; o sistema não emite nota fiscal, não calcula
  imposto e não substitui o ERP financeiro.
- **Não movimenta dinheiro.** Não há pagamento, transferência, conciliação bancária nem integração automática
  com extrato.
- **Não cria parcelas automaticamente.** Um lançamento recorrente é apenas marcado como tal.
- **Não controla câmbio nem moeda estrangeira.** Os valores são tratados em reais.
- **Não rateia despesas entre projetos.** Um lançamento pertence a um único projeto. Para dividir um custo,
  cadastre um lançamento em cada projeto.
- **Não faz depreciação nem cálculo contábil de CAPEX.** A divisão CAPEX/OPEX existe para análise gerencial.
- **Não altera datas de tarefas nem cronograma.** O EVM lê o progresso das tarefas; ele não reprograma nada.
- **Não substitui o julgamento do gerente.** CPI, SPI e EAC são indicadores, não decisões.

## Veja também

- [Visão geral e primeiros passos](../docs/01-visao-geral-e-primeiros-passos.md) — navegação, perfis e busca global
- [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — quem pode ver e editar o financeiro
- [Projetos e cronograma](../docs/03-projetos-e-cronograma.md) — cadastro do projeto, orçamento total e datas
- [Tarefas e execução](../docs/04-tarefas-e-execucao.md) — progresso das tarefas, que alimenta o valor agregado
- [Riscos e issues](../docs/07-riscos-e-issues.md) — valor monetário esperado e exposição de riscos
- [Dashboards e relatórios](../docs/09-dashboards-e-relatorios.md) — painel executivo e relatórios por widgets
- [Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais do sistema

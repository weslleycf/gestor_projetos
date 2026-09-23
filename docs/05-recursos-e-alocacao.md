# 05 · Recursos e alocação

## Em uma frase

O módulo de Recursos e alocação mostra quem está livre, quando e a que custo — e recomenda, com
justificativa auditável, a melhor pessoa para cada tarefa.

## Para que serve

Todo projeto atrasa por dois motivos clássicos: a pessoa certa não estava disponível na semana certa, ou
ninguém percebeu a tempo que ela estava comprometida em três frentes ao mesmo tempo. Este módulo existe para
eliminar os dois. Ele reúne, em uma única tela, o retrato da ocupação de cada colaborador semana a semana, os
conflitos de sobrealocação já detectados e o catálogo de recursos materiais que os projetos consomem.

O ganho de negócio aparece primeiro na prevenção. Quando você arrasta um colaborador para uma alocação, o
sistema soma imediatamente a dedicação dele naquela semana e avisa se o total passou de 100%. O aviso chega
antes do compromisso existir de fato, e não três meses depois, quando o atraso já virou cobrança do cliente.
A sobrecarga deixa de ser uma descoberta tardia e passa a ser uma decisão consciente.

O segundo ganho é a qualidade da escolha. Em vez de alocar por memória ou por proximidade pessoal, você usa o
**Motor de matching**, que avalia todos os candidatos elegíveis com uma nota de 0 a 100 e mostra, item por
item, por que cada um ficou naquela posição: quanto da exigência técnica ele atende, quanto está livre, quanto
custa, se declarou interesse naquela capacidade, há quanto tempo está na empresa e se fica perto do time.
Nada é caixa-preta: cada recomendação vem com skills atendidas, lacunas identificadas e as penalidades
aplicadas, e toda decisão fica registrada para auditoria.

O terceiro ganho é o planejamento de médio prazo. O mapa de ocupação e o planejamento de capacidade mostram,
semana a semana e mês a mês, onde falta gente e onde sobra. Isso transforma a conversa de contratação e de
mentoria: em vez de reagir a um incêndio, você antecipa a formação de uma capacidade que o portfólio vai
precisar em dois ou três meses.

Por último, o módulo dá base financeira à decisão. O custo por hora de cada pessoa e de cada recurso material
é usado no cálculo do custo estimado da alocação e alimenta o painel financeiro do portfólio. Alocar é também
uma escolha de custo — e o sistema deixa isso visível.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| Administrador | Cadastra recursos, ajusta custo por hora e capacidade semanal das pessoas, corrige alocações e resolve exceções | Semanal |
| Executivo (C-Level) | Acompanha ocupação consolidada, conflitos críticos e aderência do motor; usa os números para decidir contratação | Mensal |
| PMO | Governa o catálogo de recursos, revisa conflitos de sobrealocação, audita overrides manuais e padroniza o uso do motor | Diária ou semanal |
| Gerente de Projetos | Aloca e realoca a equipe do projeto, executa o matching, aceita ou recusa recomendações e justifica overrides | Diária |
| Líder Técnico | Ajusta dedicação de curto prazo, aponta sobrecarga da equipe e sugere alocações em modo Desenvolvimento | Diária |
| Membro de Equipe | Consulta a própria ocupação semanal e as alocações futuras antes de assumir novos compromissos | Semanal |
| RH / DHO | Analisa ocupação, ociosidade e oportunidades de desenvolvimento reveladas pelo mapa de capacidade | Mensal |
| Stakeholder | Verifica quem está trabalhando no projeto e a carga da equipe em reuniões de acompanhamento | Pontual |

> **Atenção:** o menu **Alocação** e o **Motor de matching** exigem a permissão de alocação. Perfis sem essa
> permissão não enxergam esses itens na barra lateral e, se tentarem abrir o endereço direto, recebem uma tela
> de acesso negado. O mesmo vale para **Recursos** e **Capacidade**, que dependem das permissões de recurso e
> de capacidade.

## Como chegar

O módulo vive na seção **Recursos e alocação** do menu lateral, com quatro telas:

- **Recursos e alocação › Alocação** — é a tela principal. Abre com o subtítulo informando quantas alocações
  estão vigentes hoje e quantas pessoas aparecem no mapa de ocupação. Na parte de cima ficam seis indicadores,
  dois gráficos (alocações por modalidade e alocações por projeto) e a barra de filtros. Abaixo, três colunas
  lado a lado: o **Pool de colaboradores** (arrastável) à esquerda, a **Timeline de alocações** no centro e o
  painel **Conflitos de alocação** à direita. Mais abaixo vêm o **Heatmap de ocupação da equipe** e a tabela
  **Alocações registradas**.
- **Recursos e alocação › Motor de matching** — a tela do motor de alocação inteligente. Abre com o cartão
  **Alvo e modo de alocação**; abaixo aparecem, depois de executar, a explicabilidade do score, os cartões de
  candidatos, a simulação what-if e o histórico de recomendações da tarefa.
- **Recursos e alocação › Recursos** — o catálogo de recursos materiais (equipamentos, licenças, instalações,
  serviços terceirizados e materiais). Abre com indicadores do catálogo, três cartões de análise e os recursos
  agrupados por tipo, em cartões visuais.
- **Recursos e alocação › Capacidade** — o planejamento de capacidade, com as abas **Demanda × Oferta**,
  **Skills críticas** e **Ocupação**.

Duas telas complementares completam o quadro: **Capacidades e talentos › Gap analysis**, para ver a lacuna
entre demanda e oferta por capacidade, e **Capacidades e talentos › Bus factor**, para o risco de dependência
de uma única pessoa.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| Alocação | O compromisso de uma pessoa (ou de um recurso material) com um projeto ou tarefa, em um período, com um percentual de dedicação |
| Percentual de dedicação | Quanto da capacidade semanal da pessoa a alocação consome. Vai de 1% a 100% por alocação |
| Alocação vigente | Alocação cuja data de início já passou, cuja data de fim ainda não chegou e cujo status é Confirmada ou Em execução |
| Sobrealocação | Soma dos percentuais de dedicação da mesma pessoa em uma mesma semana acima de 100% |
| Conflito crítico | Sobrealocação de 130% ou mais em uma semana — o caso que exige ação imediata |
| Ocupação | Percentual de dedicação somado por pessoa e por semana, exibido em mapa de calor |
| Ocupação média | Média das semanas analisadas para uma pessoa. É o número que aparece no card do pool e no heatmap |
| Capacidade semanal | Quantidade de horas por semana que a pessoa pode dedicar ao trabalho. O padrão é 40 horas |
| Pool de colaboradores | Lista de pessoas disponíveis para arrastar até a timeline, já filtrada por busca, área e disponibilidade |
| Mapa de ocupação | Grade de pessoas por semanas em que cada célula mostra o percentual alocado naquela semana |
| Motor de alocação inteligente | O serviço que calcula e ranqueia candidatos para um projeto ou tarefa, com nota e justificativa |
| Modo de alocação | A estratégia do motor: Performance imediata, Desenvolvimento ou Mista (sênior + júnior) |
| Score | A nota do candidato, de 0 a 100, resultante da soma ponderada de seis componentes menos as penalidades |
| Componente | Cada um dos seis fatores do score: skill, disponibilidade, custo, preferência, experiência e proximidade |
| Peso | O quanto cada componente influencia o score final. Os pesos mudam conforme o modo escolhido |
| Penalidade | Desconto aplicado ao score por sobrecarga, skill obrigatória em falta, histórico de atrasos ou conflito com tarefa crítica |
| Elegível | Candidato sem bloqueio de skill obrigatória e com alguma disponibilidade no período |
| Recomendação | O cartão gerado pelo motor para um candidato, com posição, score, justificativa e status da decisão |
| Override manual | Decisão de alocar alguém diferente do recomendado, sempre com justificativa registrada |
| Aderência média | Score médio do motor nas alocações criadas a partir de recomendações |
| Taxa de override | Proporção de alocações que sobrepuseram a recomendação do motor |
| Simulação what-if | Recálculo do ranking com pesos ajustados por você, sem alterar nada de verdade |
| Recurso material | Item do catálogo que não é pessoa: equipamento, licença de software, instalação, serviço ou material |
| Disponibilidade do recurso | Percentual da capacidade do recurso que ainda está livre. A utilização é o complemento |
| Custo estimado | Custo da alocação, calculado como custo por hora vezes as horas do período |
| FTE | Equivalente a tempo integral. Uma pessoa alocada a 100% equivale a 1 FTE |

## Tarefas passo a passo

### Cadastrar um recurso material

Serve para dar visibilidade a tudo que o projeto consome além de pessoas — notebooks, licenças, bancadas,
salas, serviços de terceiros — e para que esse consumo apareça com custo e disponibilidade.

1. Abra **Recursos e alocação › Recursos**.
2. Clique em **Novo recurso**.
3. Em **Nome**, descreva o item de forma reconhecível. Por exemplo: "Notebook Dell Latitude 5540".
4. Escolha o **Tipo**: Humano, Equipamento, Software / Licença, Instalação, Serviço terceirizado ou Material.
5. Se o item tem patrimônio ou código interno, preencha **Código / patrimônio**.
6. Use **Descrição** para especificações, condições de uso e observações.
7. Informe **Custo por hora (R$)** e **Custo unitário (R$)**. O custo por hora é o que entra no cálculo do custo
   estimado quando o recurso é usado em uma alocação.
8. Preencha **Unidade** (unidade, licença, m², dia) e **Quantidade disponível**.
9. Se a disponibilidade é temporária, informe **Disponível de** e **Disponível até**.
10. Ajuste **Disponibilidade (%)** na barra deslizante. O texto abaixo confirma a leitura: "Capacidade livre
    informada pelo fornecedor".
11. Preencha **Fornecedor** e **Localização**.
12. Escolha **Cor de identificação** e **Ícone** — eles aparecem no cartão do recurso e nos gráficos.
13. Em **Situação**, mantenha **Ativo no catálogo** ou marque como inativo.
14. Clique em **Cadastrar recurso**.

O recurso passa a aparecer no grupo do tipo escolhido, nos indicadores do catálogo e no gráfico **Recursos por
tipo**. Se a disponibilidade informada for menor que 50%, ele é listado em **Alertas de disponibilidade**.

**Exemplo prático.** Uma sala de treinamento usada em três projetos: cadastre o tipo Instalação, com
disponibilidade de 40% e o período em que está liberada. Assim que outro projeto precisar dela, o cartão já
mostrará a restrição.

### Editar, inativar ou excluir um recurso

Serve para manter o catálogo confiável. Um catálogo desatualizado contamina os indicadores de disponibilidade
e o custo estimado das alocações.

1. Em **Recursos e alocação › Recursos**, localize o cartão do recurso. Use a busca "Buscar recurso, código ou
   fornecedor...", o filtro de tipo, o de fornecedor e o de situação.
2. Para editar, clique no ícone **Editar** do cartão, altere o que precisa e clique em **Salvar alterações**.
3. Para ver o que o recurso está consumindo, clique em **Ver alocações de** — o painel lateral mostra as
   alocações vinculadas, com projeto, tarefa, período, status e custo estimado.
4. Para retirar o recurso de circulação sem perder histórico, edite-o e mude **Situação** para **Inativo**. Ele
   continua no histórico dos projetos, mas deixa de contar como disponível.
5. Para remover definitivamente, clique no ícone **Excluir** do cartão e confirme em **Excluir recurso**.

> **Atenção:** excluir um recurso também elimina as alocações que usam esse recurso. Quando houver histórico em
> projetos, prefira marcar como **Inativo**.

### Alocar uma pessoa arrastando o card para a timeline

É o caminho mais rápido para montar a equipe de um projeto. Serve quando você já sabe quem quer e só precisa
registrar o compromisso.

1. Abra **Recursos e alocação › Alocação**.
2. Use a busca e os filtros para reduzir o **Pool de colaboradores**. O interruptor **Somente disponíveis**
   oculta quem já está com 100% ou mais.
3. Cada card mostra o custo por hora (ou "Custo restrito"), a ocupação média em forma de etiqueta, uma barra
   com o percentual disponível e quantas alocações estão vigentes hoje. A etiqueta de ocupação fica verde abaixo
   de 85%, âmbar entre 85% e 100% e vermelha acima de 100%; a barra usa azul na ocupação normal, âmbar a partir
   de 85% e vermelho acima de 100%.
4. Arraste o card e solte-o sobre a linha da pessoa na **Timeline de alocações**. A linha fica destacada quando
   o card está sobre ela.
5. O painel lateral **Confirmar alocação** abre com o percentual já preenchido em 50%.
6. Escolha o **Projeto** e, se quiser amarrar a alocação a uma entrega específica, a **Tarefa (opcional)**.
7. Ajuste **Percentual de dedicação** na barra deslizante, com marcas em 25%, 50%, 75% e 100%.
8. Confirme **Início** e **Fim** — o padrão é hoje até 30 dias à frente.
9. Se fizer sentido, informe **Papel no projeto**, **Modalidade**, **Status** e uma **Justificativa**.
10. Clique em **Confirmar alocação**.

Depois de salvar, o sistema recalcula o mapa de ocupação, a lista de conflitos e os indicadores do painel de
alocação. Se a nova alocação levar a pessoa acima de 100% em alguma semana, aparece um aviso com o nome, a
semana e o total alocado — mas a alocação é criada mesmo assim, porque a decisão final é sempre sua.

**Exemplo prático.** Você precisa de um analista por 20% durante dois meses. Filtre por área, ative **Somente
disponíveis** e solte o card sobre a linha da pessoa na semana de início desejada.

### Alocar uma pessoa em uma tarefa específica

Serve para que o esforço fique amarrado à entrega e para que o motor de matching saiba quem já está na tarefa.

1. Arraste o card do colaborador para a timeline ou clique no ícone **Alocar** do card.
2. No painel **Confirmar alocação**, escolha primeiro o **Projeto**.
3. Em **Tarefa (opcional)**, selecione a tarefa. A dica ao lado explica que, ao escolher uma tarefa, o registro
   passa pela atribuição, que devolve os conflitos da semana de entrada.
4. Defina **Percentual de dedicação**, **Início** e **Fim**.
5. Clique em **Confirmar alocação**.

Quando a alocação é feita por tarefa, o painel mostra no rodapé a lista de conflitos detectados e a mensagem
"Sobrealocação detectada pelo motor" com a semana e o total. Sem conflito, aparece "Alocação sem conflitos".

### Ajustar uma alocação existente

Serve para reagir a mudanças de escopo, férias ou prioridade sem apagar o histórico.

1. Vá até a tabela **Alocações registradas** ou clique sobre a barra colorida na **Timeline de alocações**.
2. Clique no ícone **Editar alocação**.
3. Altere **Percentual de dedicação**, **Início**, **Fim**, **Papel no projeto**, **Modalidade**, **Status** ou
   **Justificativa**. Projeto e tarefa aparecem como seleção.
4. Clique em **Salvar alterações**.

O mapa de ocupação, a lista de conflitos e os indicadores são atualizados na hora. A alteração fica registrada
na trilha de auditoria.

### Confirmar uma proposta de alocação

Serve para formalizar uma reserva que ainda estava apenas sinalizada.

1. Localize a alocação com status **Proposta** na tabela **Alocações registradas**.
2. Clique no ícone **Confirmar proposta**, na coluna de ações.
3. A etiqueta de status muda para **Confirmada** e a alocação passa a contar no mapa de ocupação e nos
   conflitos.

> **Atenção:** apenas alocações com status Confirmada ou Em execução entram no mapa de ocupação e na detecção
> de conflitos. Uma proposta não reserva capacidade de verdade.

### Excluir uma alocação

Serve para liberar a pessoa quando o trabalho acabou ou quando a decisão foi revista.

1. Na tabela **Alocações registradas**, clique no ícone **Excluir alocação**.
2. Leia o resumo apresentado: pessoa, projeto, período e percentual.
3. Clique em **Excluir definitivamente**.

A exclusão é registrada na auditoria e a ocupação das semanas envolvidas é recalculada.

### Resolver um conflito de sobrealocação

É a tarefa mais importante da rotina de um gerente. Um conflito não resolvido vira atraso, retrabalho e, muitas
vezes, horas extras não planejadas.

1. No painel **Conflitos de alocação**, veja o total de sobrealocações e quantas são críticas.
2. Cada alerta mostra o nome, a semana e o total alocado. A cor indica a severidade: âmbar para alerta e
   vermelho, com ícone de chama, para crítico.
3. Clique no alerta para abrir o detalhe. O modal lista todas as alocações daquela semana, com projeto, tarefa,
   período e percentual de cada uma, e mostra o excesso em pontos percentuais.
4. Siga a **Ação recomendada**: redistribuir parte da dedicação para outra pessoa ou reduzir o percentual em
   uma das alocações da semana.
5. Para reduzir, clique em **Editar alocação** na tabela e ajuste o percentual. Para redistribuir, arraste outro
   colaborador do pool e crie a nova alocação.
6. Confira o painel **Conflitos de alocação** novamente. Ele é recalculado a cada alteração.

**Exemplo prático.** Ana está com 60% em um projeto e 60% em outro na semana de 12/05 — total de 120%. O
sistema classifica como alerta. Reduzindo uma das alocações para 40%, o total cai para 100% e o conflito
desaparece.

### Ler o mapa de ocupação da equipe

Serve para enxergar o todo de uma vez e planejar a redistribuição antes que o problema estoure.

1. Role até **Heatmap de ocupação da equipe**, na tela **Alocação**.
2. Leia a utilização média da equipe, logo acima da grade.
3. Cada linha é uma pessoa e cada coluna é uma semana. A legenda mostra a escala: 0%, de 1% a 84%, de 85% a
   100% e acima de 100%.
4. Passe o mouse sobre uma célula para ver o detalhe: nome, semana, percentual de dedicação e os projetos
   envolvidos.
5. Clique na célula para abrir o painel lateral, que mostra os projetos daquela semana em etiquetas e a média do
   período da pessoa.

> **Atenção:** uma célula vazia significa ausência de alocação registrada, e não férias. O sistema não conhece
> folgas, afastamentos ou férias a menos que uma alocação ou capacidade semanal tenha sido informada.

### Acompanhar a ocupação individual de uma pessoa

Serve para conversar com a pessoa sobre carga de trabalho com números na mão — e para decidir se ela pode
assumir mais um compromisso.

1. No card da pessoa, no **Pool de colaboradores**, clique no ícone **Ver ocupação**.
2. A tela de ocupação individual abre com seis indicadores: **Ocupação média**, **Pico de ocupação**, **Menor
   ocupação**, **Horas apontadas**, **Semanas superalocadas** e **Alocações futuras**.
3. O gráfico **Ocupação ao longo das semanas** mostra a dedicação semanal com uma linha de referência em 100%.
4. O cartão **Situação semana a semana** classifica cada semana: **Superalocado** (acima de 100%), **Ocupado**
   (entre 85% e 100%), **Disponível** (com folga) e **Ocioso** (sem alocação).
5. O cartão **Alocações futuras** lista o que está por vir, com o custo estimado total.
6. Os cartões **Distribuição da carga**, **Tendência de ocupação** e **Contexto do colaborador** completam a
   análise, com a capacidade semanal em horas e os dados cadastrais relevantes para a alocação.

### Executar o motor de alocação para um projeto

Serve para escolher a equipe com critério, em vez de por memória, e para deixar a decisão documentada.

1. Abra **Recursos e alocação › Motor de matching**. Você também pode chegar por **Matching inteligente**, na
   tela **Alocação**.
2. No cartão **Alvo e modo de alocação**, escolha o **Tipo de alvo**: **Projeto** ou **Tarefa**.
3. Selecione o **Projeto**. Ao escolher o tipo Tarefa, o campo **Tarefa** é habilitado para seleção.
4. Ajuste **Candidatos exibidos** no controle **Limite de resultados**, de 3 a 30.
5. Escolha o modo de alocação clicando em um dos três cartões (veja a tarefa seguinte).
6. Clique em **Executar matching**.

O motor avalia todos os colaboradores ativos que consentiram em participar de recomendações, desconsidera quem
já está alocado na tarefa (quando o alvo é uma tarefa) e devolve o ranking. Se o alvo tiver requisitos de
capacidade cadastrados na tarefa, eles valem; caso contrário, valem os requisitos do projeto.

Os cartões de recomendação são gravados quando o alvo é uma tarefa, o que permite aceitar, recusar ou
sobrepor a recomendação depois. Ao executar o motor novamente para a mesma tarefa, as recomendações anteriores
que ainda estavam como sugeridas passam a substituídas.

### Escolher o modo de alocação

Serve para dizer ao motor o que a organização quer privilegiar: velocidade de entrega ou formação de pessoas.

1. No cartão **Alvo e modo de alocação**, clique em um dos três cartões de modo.
2. Leia a descrição e os pesos resumidos exibidos em cada cartão antes de decidir.
   - **Performance**: maximiza aderência técnica e experiência para entrega imediata.
   - **Desenvolvimento**: prioriza o crescimento do colaborador, com lacuna controlada e apoio de mentor.
   - **Misto**: equilibra entrega e transferência de conhecimento, combinando sênior e profissional em
     desenvolvimento.
3. Clique em **Executar matching** para recalcular com o novo modo.

Trocar de modo zera o resultado anterior e a simulação, para evitar comparações enganosas. Os pesos aplicados
são sempre exibidos no resultado, na seção **Pesos utilizados**.

### Ler o card de recomendação

Serve para decidir com transparência. Você precisa saber por que aquele nome está em primeiro lugar — e o que
ele custa.

1. Depois de executar o motor, localize a posição do candidato: a bolinha no alto do avatar mostra a colocação
   no ranking. As três primeiras posições aparecem em azul.
2. O anel ao lado do nome mostra o **score** em pontos. O número foi arredondado para facilitar a leitura.
3. As etiquetas abaixo do nome resumem o essencial: percentual **disponível**, percentual **alocado no
   período**, **modo** recomendado pelo motor e, quando aplicável, **não elegível**.
4. As seis barras mostram a decomposição do score por componente, cada uma com o respectivo peso. Por exemplo,
   "Skill · peso 45%" com o valor obtido naquele fator.
5. Em **Skills atendidas**, as etiquetas verdes trazem cada capacidade exigida com o nível requerido e o nível
   atual da pessoa.
6. Em **Gaps identificados**, as etiquetas âmbar mostram as capacidades em falta, o tamanho do déficit e a ação
   sugerida — mentoria com especialista, treinamento focado ou capacitação inicial.
7. Quando houver, o bloco **Penalidades aplicadas** lista cada desconto e o quanto ele tirou do score, em
   pontos.
8. Clique em **Ver detalhes de custo e histórico** para abrir custo estimado no período, custo por hora, tempo
   de casa, XP em capacidades e a frase de disponibilidade.
9. Use os botões no rodapé do card: **Alocar**, **Recusar** ou **Override manual**.

> **Atenção:** o botão **Alocar** cria a alocação de 100% de dedicação no período do alvo. Se você precisa de
> outro percentual, use **Override manual** e informe o valor desejado, ou ajuste depois na tela **Alocação**.

### Alocar a partir de uma recomendação

Serve para converter a sugestão em compromisso real, com o score gravado na alocação.

1. Execute o motor com o alvo em **Tarefa** (recomendado) ou em **Projeto**.
2. No card do candidato escolhido, clique em **Alocar**.
3. Quando o alvo é uma tarefa, a recomendação passa para o status **Aceita** e a alocação é criada com
   modalidade igual ao modo usado, score do motor registrado e justificativa padrão de aceite.
4. Quando o alvo é um projeto, a alocação é criada diretamente com o percentual de 100% no período do alvo, o
   score do motor e a modalidade correspondente ao modo.

A pessoa alocada recebe uma notificação informando o projeto e o percentual de dedicação. A operação é
registrada na auditoria, com o score e o nome do recomendado.

### Recusar uma recomendação com justificativa

Serve para manter a rastreabilidade quando o motor sugere alguém que não pode ser alocado — por exemplo, porque
a pessoa está saindo de férias ou porque há um acordo interno que o sistema não conhece.

1. No card do candidato, clique em **Recusar**. O botão só fica disponível quando o alvo é uma tarefa, porque é
   preciso ter uma recomendação gravada.
2. No modal **Recusar recomendação**, escreva a **Justificativa da recusa**. O campo é obrigatório.
3. Clique em **Registrar recusa**.

A recomendação passa para o status **Recusada**, com data da decisão e o motivo. A recusa alimenta a taxa de
override do painel de alocação e aparece no histórico de recomendações da tarefa.

### Registrar um override manual

Serve para quando a decisão humana supera a recomendação calculada — uma escolha de desenvolvimento, uma
negociação com o cliente, uma restrição de segurança. O sistema aceita, mas exige o motivo.

1. No card do candidato recomendado, clique em **Override manual**.
2. Leia o aviso "Decisão auditada": o override substitui a recomendação do motor e é contabilizado na taxa de
   override.
3. Em **Pessoa a alocar**, escolha o colaborador que será alocado de fato. A lista marca quem foi o recomendado
   com a indicação "(recomendado)".
4. Ajuste **Percentual de dedicação**, **Início** e **Fim**.
5. Escreva a **Justificativa obrigatória**, explicando por que a escolha manual supera a recomendação calculada.
6. Clique em **Registrar override**.

O sistema cria a alocação com a marca de override, o score da recomendação original, a pessoa escolhida e a
justificativa. A decisão fica na auditoria com o nome de quem decidiu e a recomendação original, e a pessoa
alocada é notificada.

**Exemplo prático.** O motor recomenda um sênior de 12 anos de casa. Você prefere uma analista de nível 3 com
mentoria do sênior, para formar a sucessora. Registre o override com a justificativa "decisão de
desenvolvimento do colaborador com mentor sênior no mesmo time".

### Simular um cenário what-if de pesos

Serve para responder perguntas do tipo "e se eu priorizasse custo em vez de experiência?" sem mexer em nada de
verdade.

1. Na tela **Motor de matching**, abra a seção **Simulação what-if de pesos**.
2. Ajuste os seis controles deslizantes: **Skill**, **Disponibilidade**, **Custo**, **Preferência**,
   **Experiência** e **Proximidade**, de 0% a 100% cada.
3. Opcionalmente, ligue **Somente disponíveis** para remover do pool quem já tem alocação confirmada no
   período, e ajuste o **Limite de resultados**.
4. Clique em **Simular cenário**.
5. Leia o bloco **Pesos ajustados (normalizados)**, que mostra os pesos efetivamente usados depois da
   normalização, comparados em cinza com os pesos originais do modo.
6. Analise o **Comparativo antes × depois**: o gráfico de barras e a tabela com **Candidato**, **Posição
   antes**, **Posição depois**, **Score original** e **Score ajustado**. As setas indicam quem subiu, quem caiu
   e quem manteve a posição.
7. Para voltar ao ponto de partida, clique em **Restaurar pesos do modo**.

> **Atenção:** a simulação não cria, altera nem exclui alocações, e não grava recomendações. Ela existe apenas
> para apoiar a decisão.

### Consultar o histórico de recomendações da tarefa

Serve para saber o que o motor sugeriu, o que foi aceito, o que foi recusado e quando.

1. Escolha um alvo do tipo **Tarefa** e execute o matching ao menos uma vez.
2. Role até o cartão **Histórico de recomendações da tarefa**.
3. Cada linha mostra o candidato, a posição, o score, o modo, o status da decisão (**Sugerida**, **Aceita**,
   **Recusada** ou **Substituída**), a data da decisão e quantas penalidades foram aplicadas.

### Manter os dados que alimentam o motor

Serve para que as recomendações reflitam a realidade. O motor decide a partir de dados cadastrais; se eles
estiverem errados, a recomendação também estará.

1. Abra **Administração › Usuários e papéis** e localize a pessoa.
2. Na seção **Custo e capacidade**, revise **Custo por hora (R$)** e **Capacidade semanal (horas)**. O padrão de
   capacidade é 40 horas semanais.
3. Ainda em **Custo e capacidade**, verifique o interruptor **Custo visível para todos**. Desligado, apenas
   administradores, RH e o próprio usuário veem o custo.
4. Na seção de preferências, confira **Aceita ser recomendado em alocações** — quem estiver desligado fica fora
   do pool do motor — e **Disponível para mentoria**.
5. Em **Interesses**, cadastre os temas que a pessoa quer desenvolver. Eles aumentam o fator de preferência
   quando coincidem com as capacidades exigidas pelo alvo.
6. Salve as alterações.

## Campos e o que significam

### Recurso material

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| Nome | Identificação do recurso no catálogo | Texto reconhecível, como o modelo do equipamento ou o nome da licença | Sim |
| Tipo | Categoria do recurso | Humano, Equipamento, Software / Licença, Instalação, Serviço terceirizado ou Material | Sim |
| Código / patrimônio | Número de patrimônio ou código interno | Use o padrão da empresa. Exemplo: PAT-00123 | Não |
| Descrição | Especificações, condições de uso e observações | Texto livre | Não |
| Custo por hora (R$) | Valor da hora de uso do recurso | Informe o valor acordado com o fornecedor | Não |
| Custo unitário (R$) | Valor por unidade do recurso | Use quando o consumo é medido em unidades | Não |
| Unidade | Como o recurso é medido | Exemplos: unidade, licença, m², dia | Não |
| Quantidade disponível | Quanto existe disponível para uso | Número decimal | Não |
| Disponível de | Início da janela de disponibilidade | Data | Não |
| Disponível até | Fim da janela de disponibilidade | Data | Não |
| Disponibilidade (%) | Percentual da capacidade que está livre | Barra deslizante de 0% a 100% | Não |
| Fornecedor | Quem fornece o recurso | Nome do parceiro | Não |
| Localização | Onde o recurso está | Exemplo: São Paulo · SP | Não |
| Cor de identificação | Cor usada nos gráficos e no cartão | Escolha no seletor ou digite o código da cor | Não |
| Ícone | Ícone exibido no cartão | Escolha na lista | Não |
| Situação | Se o recurso está em uso | Ativo no catálogo ou Inativo | Não |

### Alocação

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| Projeto | Projeto que recebe a alocação | Selecione na lista, que mostra código e nome | Sim |
| Tarefa (opcional) | Entrega específica dentro do projeto | Só fica habilitada depois de escolher o projeto. A lista mostra a estrutura analítica quando existe | Não |
| Percentual de dedicação | Quanto da capacidade semanal a alocação consome | Barra deslizante de 1% a 100%, com marcas em 25%, 50%, 75% e 100% | Sim |
| Início | Primeiro dia da alocação | Data. O padrão é hoje | Sim |
| Fim | Último dia da alocação | Data. O padrão é 30 dias após o início | Sim |
| Papel no projeto | Função da pessoa na alocação | Exemplo: Tech Lead | Não |
| Modalidade | Estratégia da alocação | Performance imediata, Desenvolvimento, Mista (sênior + júnior) ou Manual | Não |
| Status | Estágio da alocação | Proposta, Confirmada, Em execução, Concluída ou Cancelada | Não |
| Justificativa | Motivo da escolha | Texto registrado na auditoria e visível para o PMO | Não |

### Motor de matching

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| Tipo de alvo | Se a busca é para o projeto inteiro ou para uma tarefa | Alterne entre **Projeto** e **Tarefa** | Sim |
| Projeto | Projeto de destino | Selecione na lista | Sim |
| Tarefa | Tarefa de destino | Habilitada apenas no tipo Tarefa | Apenas no tipo Tarefa |
| Candidatos exibidos | Quantos candidatos o ranking devolve | Controle deslizante de 3 a 30 | Não |
| Pessoa a alocar | Quem será alocado no override | Selecione na lista. Quem foi recomendado aparece marcado | Sim, no override |
| Justificativa obrigatória | Motivo do override | Texto livre. É o que sustenta a decisão na auditoria | Sim, no override |

### Campos exibidos na tabela de alocações

| Coluna | O que mostra |
|---|---|
| Pessoa / recurso | O colaborador alocado, com avatar, ou o recurso material quando a alocação não tem pessoa |
| Projeto / tarefa | Projeto, com a cor de identificação, e a tarefa quando houver |
| Dedicação | Percentual de dedicação em barra. Acima de 100% a barra fica vermelha |
| Período | Data de início e de fim |
| Modalidade | Modo de alocação, com cor própria |
| Status | Situação da alocação, com cor por estado |
| Custo estimado | Custo da alocação no período |
| Ações | **Confirmar proposta** (quando o status é Proposta), **Editar alocação** e **Excluir alocação** |

## Regras de negócio

### Como o sistema detecta sobrealocação

A verificação é semanal, e não média. Para cada pessoa, o sistema pega todas as alocações com status
**Proposta**, **Confirmada** ou **Em execução**, encontra o período total coberto e percorre semana a semana, de
segunda a domingo. Em cada semana, soma o percentual de todas as alocações que têm interseção com aquela
semana. Se a soma passar de 100%, existe sobrealocação.

A severidade é classificada em dois níveis: **Alerta** quando o total fica entre 101% e 129%, e **Crítico**
quando o total chega a 130% ou mais. O detalhamento de cada conflito lista as alocações da semana, com projeto,
tarefa, período e percentual, para que a causa fique evidente.

Uma semana com 60% + 40% = 100% não gera conflito. Uma semana com 60% + 60% = 120% gera alerta. Uma semana com
80% + 50% = 130% gera conflito crítico.

> **Atenção:** o sistema **avisa**, mas não bloqueia. A alocação é gravada mesmo com conflito. O bloqueio
> automático existe apenas na elegibilidade do motor de matching, que marca como não elegível quem tem skill
> obrigatória abaixo do mínimo ou nenhuma disponibilidade no período.

### Como a ocupação é calculada

O mapa de ocupação considera apenas alocações com status **Confirmada** ou **Em execução**. Para cada pessoa e
cada semana, soma os percentuais das alocações vigentes naquele intervalo. O resultado é o valor da célula. A
ocupação média de uma pessoa é a soma dos valores de todas as semanas analisadas dividida pelo número de
semanas. A utilização média da equipe é a média das ocupações médias de todas as pessoas que aparecem no mapa.

As cores seguem uma escala fixa: 0% sem alocação; de 1% a 84% em azul; de 85% a 100% em âmbar; acima de 100%
em vermelho. A mesma escala é usada nos cards do pool, na timeline e no heatmap.

Na ocupação individual, cada semana recebe uma classificação textual: **Superalocado** acima de 100%,
**Ocupado** entre 85% e 100%, **Disponível** quando há folga e **Ocioso** quando não há alocação.

O mapa cobre por padrão um horizonte de doze semanas a partir da semana corrente. O planejamento de capacidade
vai além, com horizonte ajustável de 3 a 18 meses.

### Como o custo estimado da alocação é calculado

O sistema calcula a quantidade de horas da alocação e multiplica pelo custo por hora da pessoa ou do recurso.
As horas vêm de duas formas. Se a alocação tem horas planejadas informadas, esse é o número usado. Caso
contrário, o sistema calcula a capacidade da pessoa no período — a capacidade semanal dividida por cinco,
multiplicada pelos dias úteis do intervalo — e aplica o percentual de dedicação.

Se o seu perfil não tem permissão de visualização de custo, os valores aparecem como "Custo restrito" nos
cartões e "Restrito" no detalhe. A permissão é concedida a administradores, PMO, gerentes, executivos e RH, ou
a qualquer usuário quando o interruptor **Custo visível para todos** está ligado no cadastro dele.

### O motor de alocação inteligente, em linguagem de negócio

O score de um candidato é uma nota de 0 a 100, calculada assim:

**Score = peso da skill × aderência técnica + peso da disponibilidade × disponibilidade + peso do custo ×
economia + peso da preferência × interesse + peso da experiência × bagagem + peso da proximidade ×
proximidade − penalidades**

Cada componente vale de 0 a 1. O resultado final nunca é negativo nem passa de 1.

**Os seis componentes, um por um:**

1. **Skill (aderência técnica).** Compara o nível que a pessoa tem em cada capacidade exigida com o nível
   mínimo pedido. Para cada capacidade, a razão entre o nível atual e o requerido; quando a pessoa supera o
   exigido, ganha um bônus de até 10% (limitado a dois níveis de excedente). A média é ponderada pelo peso de
   cada requisito. Se o alvo não tem requisito cadastrado, o componente recebe um valor neutro de 0,60.
2. **Disponibilidade.** É o percentual livre da pessoa no período do alvo, calculado semana a semana e
   descontando todas as alocações propostas, confirmadas e em execução. Quem está 100% livre recebe 1,0; quem
   está totalmente comprometido recebe 0.
3. **Custo.** É relativo ao pool avaliado, não um valor absoluto. O sistema identifica o maior e o menor custo
   por hora entre os candidatos e dá nota máxima ao mais barato, nota mínima ao mais caro e valores
   proporcionais aos demais.
4. **Preferência.** Começa em 0,5. Sobe para 1,0 quando os interesses declarados pela pessoa coincidem com
   alguma capacidade exigida pelo alvo. No modo Desenvolvimento, quem está disponível para mentoria recebe
   0,75. Se a pessoa tem alguma capacidade marcada como destaque no perfil, o componente sobe mais 0,1, sem
   passar de 1,0.
5. **Experiência.** Combina dois elementos: 60% pelo tempo de casa, medido em anos desde a admissão e comparado
   com o colega mais antigo do pool, e 40% pelo XP acumulado nas capacidades, comparado com um teto de 2.000
   pontos.
6. **Proximidade.** Começa em 0,45. Vai a 1,0 quando a área da pessoa é a mesma do projeto, e a 0,7 quando a
   área do projeto aparece na localização cadastrada da pessoa.

**Os três modos e seus pesos:**

| Modo | Skill | Disponibilidade | Custo | Preferência | Experiência | Proximidade |
|---|---|---|---|---|---|---|
| Performance imediata | 0,45 | 0,20 | 0,10 | 0,05 | 0,15 | 0,05 |
| Desenvolvimento | 0,25 | 0,15 | 0,10 | 0,20 | 0,05 | 0,10 |
| Mista (sênior + júnior) | 0,35 | 0,18 | 0,12 | 0,12 | 0,13 | 0,10 |

No modo **Desenvolvimento** há uma diferença importante: o alvo de aderência deixa de ser o nível exigido e
passa a ser um nível abaixo dele. Quem está exatamente um degrau abaixo do requisito é favorecido, porque
aprende com o desafio sem ficar perdido. Quem já domina o nível exigido recebe um pequeno acréscimo, e quem
está dois ou mais níveis abaixo perde pontos rapidamente. É o modo indicado para formar sucessores.

**As penalidades aplicadas ao score:**

| Situação | Desconto |
|---|---|
| Sobrecarga: 100% ou mais alocado no período do alvo | −0,35 |
| Capacidade obrigatória abaixo do nível mínimo | −0,50 |
| Histórico: três ou mais tarefas atrasadas no projeto do alvo | −0,10 |
| Conflito de agenda com tarefa crítica do projeto, com carga de 80% ou mais | −0,15 |

As penalidades se acumulam. O candidato com skill obrigatória em falta é marcado como **não elegível**, o que
não o remove da lista, mas sinaliza que a alocação exige uma decisão consciente e um plano de capacitação.

**Quem entra no pool.** Colaboradores ativos e que consentiram em ser recomendados. Quando o alvo é uma tarefa,
o sistema exclui quem já está alocado nela com status proposta, confirmada ou em execução. O período avaliado é
o da tarefa, ou o do projeto quando a tarefa não tem datas próprias.

**Como o ranking é montado.** Os candidatos são ordenados do maior score para o menor e, em caso de empate, por
ordem alfabética de nome. A posição no ranking é a que aparece na bolinha do avatar.

**O modo sugerido no card.** Independentemente do modo que você escolheu para rodar o motor, cada card sugere um
modo de alocação. Se o candidato tem lacunas e ainda assim atende bem ao conjunto (aderência igual ou superior
a 0,65), a sugestão é **Desenvolvimento**. Se atende muito bem (0,90 ou mais) e está pelo menos 50% livre, a
sugestão é **Performance**. Nos demais casos, **Misto**.

**A ação sugerida para cada lacuna.** Quando existe alguém de nível 4 ou superior disponível para mentoria
naquela capacidade, a sugestão é mentoria com especialista. Se a pessoa já tem algum nível na capacidade, a
sugestão é treinamento focado. Se não tem nenhum, capacitação inicial.

### O que acontece quando você decide

Ao **aceitar** ou **recusar**, a recomendação muda de status, recebe a data da decisão e guarda o motivo. Ao
aceitar, o sistema cria a alocação com status **Confirmada**, modalidade igual ao modo usado no motor, o score
do motor gravado na alocação e o nome de quem aprovou.

Quando o override aponta para outra pessoa, a alocação nasce marcada como override. A auditoria registra, na
mesma operação, o score da recomendação original, o nome do recomendado, o nome de quem foi alocado de fato e a
justificativa. A pessoa alocada recebe uma notificação com o projeto e o percentual de dedicação.

Na tela **Alocação**, o indicador **Taxa de override** mostra a proporção de alocações que sobrepuseram o motor,
e **Aderência média** mostra o score médio das alocações originadas de recomendações. Uma taxa de override alta
e persistente é um sinal: ou o motor não está calibrado para a sua realidade, ou existem restrições que não
estão cadastradas no sistema.

### Como a simulação what-if recalcula o ranking

A simulação usa exatamente o mesmo motor, com duas diferenças: não grava recomendações e permite que você
informe os pesos. Os pesos que você digita são normalizados pela soma antes do cálculo — ou seja, o que importa
é a proporção entre eles, não o valor absoluto. Depois, o sistema roda o motor duas vezes: uma com os pesos do
modo, para ter o ranking original, e outra com os seus pesos, para o ranking ajustado. A comparação mostra, para
cada candidato, a posição antes, a posição depois e a variação em pontos. Quem estava fora do ranking original
aparece como "fora" na coluna de posição anterior.

## Como ler os indicadores

### Painel da tela Alocação

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| Alocações | Total de alocações registradas | O subtítulo mostra quantas estão vigentes hoje. Crescimento sem aumento de entrega indica pulverização | Cresce junto com o portfólio |
| Taxa de override | Percentual de alocações que sobrepuseram o motor | Acima de 30% indica que o motor não reflete a realidade ou que há restrições não cadastradas | Abaixo de 20% |
| Aderência média | Score médio do motor nas alocações feitas a partir de recomendações | Quanto maior, melhor a escolha técnica. Queda sugere pressão por prazo ou pool restrito | Acima de 70% |
| Sugeridas | Recomendações aguardando decisão | Fila de trabalho do gestor. Acúmulo significa decisões pendentes e capacidade não reservada | Próxima de zero |
| Aceitas | Recomendações convertidas em alocação | Comparar com as recusadas mostra a confiança no motor | Maioria das decididas |
| Recusadas | Recomendações descartadas | Recusas frequentes em um mesmo perfil merecem investigação | Menos de um terço das decididas |
| Sobrealocações | Semanas com mais de 100% de dedicação | O subtítulo separa as críticas. Qualquer número acima de zero exige plano de ação | Zero |
| Utilização média da equipe | Média das ocupações médias | Entre 70% e 85% costuma indicar equilíbrio entre produtividade e folga para imprevistos | 70% a 85% |

### Gráficos do painel de alocação

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| Alocações por modalidade | Distribuição das alocações entre Performance, Desenvolvimento, Mista e Manual | Muitas alocações manuais indicam que o motor está sendo pouco usado | Maioria em Performance, Desenvolvimento ou Mista |
| Alocações por projeto | Os 15 projetos com mais alocações | Concentração excessiva em poucos projetos pode indicar priorização desequilibrada | Distribuição coerente com a prioridade do portfólio |

### Catálogo de recursos materiais

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| Recursos | Total no catálogo e quantos estão ativos | Muitos inativos podem indicar catálogo desatualizado | Maioria ativa |
| Custo médio/hora | Média dos recursos com custo informado | Serve de referência para negociar contratos e comparar alternativas | Estável no tempo |
| Disponibilidade média | Quanto do catálogo está livre | Queda generalizada indica saturação de equipamentos ou licenças | Acima de 60% |
| Baixa disponibilidade | Recursos com menos de 50% livres | É a lista de risco. Cada item merece plano de reposição ou renovação | Zero |
| Quantidade total | Somatório das unidades disponíveis | Ajuda a dimensionar compras e inventário | Suficiente para a demanda |
| Fornecedores | Parceiros cadastrados | Muitos fornecedores para o mesmo tipo aumentam o esforço de gestão | Concentração consciente |
| Ocupação do catálogo | Utilização média por tipo | Tipos com utilização perto de 100% são gargalo recorrente | Abaixo de 85% por tipo |

### Motor de matching

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| Avaliados | Quantos candidatos entraram no cálculo | Número muito baixo indica pool restrito — verifique consentimentos e filtros | Próximo ao total de elegíveis da área |
| Exibidos | Quantos aparecem no ranking | É o limite que você definiu | — |
| Elegíveis | Candidatos sem bloqueio de skill obrigatória e com disponibilidade | Se for zero, revise os requisitos ou antecipe a contratação | Maioria dos exibidos |
| Score médio | Média das notas exibidas | Referência de qualidade do pool para aquele alvo | Acima de 60 pontos |
| Melhor score | A maior nota | Abaixo de 60 pontos, nenhum candidato atende bem: considere outro modo ou capacitação | Acima de 75 pontos |
| Com penalidade | Quantos candidatos receberam desconto | Muitos casos indicam sobrecarga generalizada ou requisitos mal calibrados | Menos da metade |

### Capacidade e ocupação

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| Pessoas no mapa | Quantas pessoas têm alocação registrada | Base do cálculo da utilização média | Todo o time alocável |
| Utilização média | Média das ocupações médias | Queda indica ociosidade; alta indica risco de sobrecarga | 70% a 85% |
| Sobrealocados | Pessoas com alguma semana acima de 100% | É o número que exige ação primeiro | Zero |
| Ociosos | Pessoas sem nenhuma alocação no período | Oportunidade de realocação ou de desenvolvimento | Próximo de zero |
| Semanas críticas | Células do heatmap acima de 100% | Concentração em poucas semanas pode indicar pico sazonal planejável | Zero |
| Ocupação média, pico e menor ocupação | Retrato individual da carga | Diferença grande entre pico e média indica calendário irregular | Pico abaixo de 110% |
| Semanas superalocadas | Quantas semanas da pessoa passam de 100% | Sinal claro de necessidade de redistribuição | Zero |
| Alocações futuras | Compromissos já assumidos a partir de hoje | Evita aceitar novos compromissos sem base | — |
| Skills em escassez | Capacidades em que a demanda projetada supera a oferta | Prioriza contratação, mentoria ou redistribuição de escopo | Zero |
| Skills ociosas | Capacidades com oferta acima da demanda | Oportunidade de realocar pessoas e desenvolver novas competências | Zero |

## Boas práticas

1. **Resolva conflitos na semana em que aparecem.** Um alerta de 120% hoje é um atraso de duas semanas no mês
   que vem. Abra o painel **Conflitos de alocação** na segunda-feira e trate a lista até o fim do dia.
2. **Use o modo Desenvolvimento de forma deliberada.** Reserve uma parcela das alocações para formar pessoas.
   É a única maneira de reduzir dependências de longo prazo sem comprometer a entrega atual.
3. **Nunca faça override sem justificativa útil.** "Decisão do gestor" não ajuda ninguém seis meses depois.
   Escreva a restrição real: contrato, segurança, acordo sindical, desenvolvimento.
4. **Mantenha custo por hora e capacidade semanal atualizados.** Eles alimentam o score de custo, o custo
   estimado das alocações e o painel financeiro do portfólio.
5. **Cadastre os requisitos de capacidade do projeto e da tarefa.** Sem eles, o componente de skill usa um valor
   neutro e o motor perde o principal critério de decisão.
6. **Prefira alocar por tarefa quando a entrega é específica.** Isso evita que a mesma pessoa seja recomendada
   duas vezes para a mesma tarefa e dá rastreabilidade entre esforço e entrega.
7. **Confirme as propostas antes de contar com a capacidade.** Propostas não entram no mapa de ocupação nem na
   detecção de conflitos.
8. **Revise a taxa de override uma vez por mês com o PMO.** Se ela sobe, investigue se o problema está nos dados
   cadastrais, nos pesos do modo ou na agenda real da empresa.

## Perguntas frequentes

**O sistema impede alocar alguém acima de 100%?**
Não. Ele detecta, classifica a severidade e avisa, mas a decisão é sua. O objetivo é tornar o risco visível, não
travar a operação.

**Por que ninguém apareceu na lista de candidatos?**
As causas mais comuns são: todos os colaboradores elegíveis já estão alocados na tarefa; ninguém consentiu em
participar de recomendações; ou a combinação de filtros deixou o pool vazio. Verifique também se o projeto e a
tarefa foram realmente selecionados — sem alvo, o motor não executa.

**Por que o motor recomendou alguém com nível abaixo do exigido?**
Provavelmente no modo Desenvolvimento, em que o alvo de aderência fica um nível abaixo do requisito, de
propósito. Também pode ocorrer quando as outras capacidades exigidas e a disponibilidade compensam a lacuna. O
card mostra essa lacuna em **Gaps identificados**, com o déficit e a ação sugerida.

**O que significa "não elegível" no card?**
Que o candidato tem uma capacidade obrigatória abaixo do nível mínimo ou nenhuma disponibilidade no período.
Ele continua na lista porque a decisão é sua, mas a alocação exigirá um plano de capacitação ou uma
redistribuição.

**Por que o custo aparece como "Restrito"?**
Porque o seu perfil não tem permissão de visualização de custo e o interruptor **Custo visível para todos** está
desligado no cadastro da pessoa. Administradores, PMO, gerentes, executivos e RH veem os valores.

**Posso alocar a mesma pessoa em dois projetos ao mesmo tempo?**
Pode. O sistema somará os percentuais por semana e avisará se passar de 100%. Alocar a mesma pessoa em dois
projetos com 50% cada é uma prática comum e saudável.

**Excluir o projeto apaga as alocações?**
Sim. As alocações são vinculadas ao projeto e desaparecem com ele. Por isso, prefira encerrar o projeto ou
concluir as alocações em vez de excluí-lo.

**A simulação what-if muda alguma coisa de verdade?**
Não. Ela recalcula o ranking com os seus pesos, mostra o comparativo e não grava nada — nem recomendações, nem
alocações.

**Arrastei o card e nada aconteceu. O que houve?**
Verifique se você soltou o card sobre a linha de uma pessoa na **Timeline de alocações**. Soltar sobre o vazio
ou sobre outra área não cria alocação. Em telas pequenas, confirme também se o painel **Confirmar alocação**
abriu no lado direito.

**Como tiro uma pessoa do motor de recomendações?**
Em **Administração › Usuários e papéis**, desligue **Aceita ser recomendado em alocações**. Ela sai do pool sem
perder o histórico de alocações nem o perfil de capacidades.

## O que este módulo não faz

- **Não bloqueia alocação acima de 100%.** O sistema detecta e classifica o conflito, mas não impede o registro.
- **Não redistribui carga automaticamente.** A recomendação é sempre uma sugestão: aceitar, recusar ou sobrepor
  depende de uma pessoa.
- **Não controla férias, afastamentos e folgas.** A capacidade semanal cadastrada é um valor-base por pessoa. O
  sistema guarda registros de exceção por semana, com horas disponíveis e motivo, mas esta entrega não oferece
  uma tela dedicada para mantê-los; considere a capacidade-base ao planejar períodos longos de ausência.
- **Não faz apontamento de horas.** O registro de horas trabalhadas vive no módulo de tarefas e execução, na
  tela **Timesheet**, e alimenta o indicador de horas apontadas.
- **Não aplica o motor de score a recursos materiais.** O matching ranqueia pessoas. Recursos materiais entram
  como alocação no projeto e aparecem no catálogo com as respectivas alocações, mas não competem por score.
- **Não reserva estoque de recurso material.** A quantidade disponível é informativa; o sistema não dá baixa
  automática a cada uso.
- **Não considera fuso horário nem custo de deslocamento** no cálculo de disponibilidade, custo ou proximidade.
- **Não prevê turnover nem ausências futuras.** O planejamento de capacidade projeta demanda e oferta a partir
  dos requisitos cadastrados e dos perfis validados, não de eventos futuros desconhecidos.
- **Não envia a recomendação para aprovação de terceiros.** A decisão é registrada por quem opera a tela, com
  trilha de auditoria, mas não há fluxo de aprovação em duas etapas.

## Veja também

- [01 · Visão geral e primeiros passos](../docs/01-visao-geral-e-primeiros-passos.md) — navegação, perfis e busca global
- [02 · Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — quem pode ver custo, alocar e auditar
- [03 · Projetos e cronograma](../docs/03-projetos-e-cronograma.md) — datas do projeto, que definem o período avaliado pelo motor
- [04 · Tarefas e execução](../docs/04-tarefas-e-execucao.md) — tarefas, esforço e timesheet
- [06 · Financeiro e EVM](../docs/06-financeiro-e-evm.md) — como o custo das alocações chega ao orçado × realizado
- [08 · Capacidades e talentos](../docs/08-capacidades-e-talentos.md) — níveis, XP, mentorias e sucessão que alimentam o motor
- [09 · Dashboards e relatórios](../docs/09-dashboards-e-relatorios.md) — painel de alocação, ocupação e indicadores consolidados
- [12 · Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais e problemas comuns

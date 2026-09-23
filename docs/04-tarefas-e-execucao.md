# Tarefas e execução

## Em uma frase

É o módulo onde o plano vira trabalho: cada pessoa vê o que precisa fazer, arrasta o card quando avança, marca o progresso, aponta as horas e ganha XP pelas capacidades que exercita.

## Para que serve

Projeto é o combinado; tarefa é o trabalho. Este módulo existe para que o compromisso assumido no cronograma chegue até a mesa de quem executa. Aqui a tarefa deixa de ser um item de planilha e passa a ter responsável, prazo, esforço, checklist, dependências e histórico.

O segundo valor é a **flexibilidade de leitura**. A mesma tarefa pode ser vista de cinco formas — Gantt, Kanban, Lista, Calendário e Timeline — e cada forma responde a uma pergunta diferente. O gerente quer saber se o prazo fecha (Gantt). O time quer saber o que puxar agora (Kanban). Quem cobra entrega quer a lista ordenada. Quem vive de agenda quer o calendário. Quem apresenta para o patrocinador quer a timeline. Você não precisa escolher uma: alterna conforme a conversa.

O terceiro valor é a **execução sem atrito**. Arrastar um card muda o status e é salvo na hora. O controle deslizante de progresso registra o avanço em segundos. O checklist quebra a tarefa em passos verificáveis. O cronômetro não existe: as horas vêm do timesheet semanal, que alimenta o esforço real da tarefa e o custo do projeto.

Por fim, o módulo conecta execução e desenvolvimento de pessoas. Concluir uma tarefa **credita XP nas capacidades exigidas por ela**; aprovar horas também. Isso transforma o trabalho do dia a dia em evidência objetiva de evolução profissional — sem questionário e sem achismo.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| Administrador | Ajusta dados, apoia a operação e corrige registros | Pontual |
| Executivo (C-Level) | Consulta o andamento consolidado e as tarefas críticas | Mensal |
| PMO | Padroniza o uso do Kanban e do checklist, acompanha WIP, audita apontamentos e aprova horas | Diária |
| Gerente de Projetos | Cria e distribui tarefas, define prazos e dependências, acompanha o progresso e aprova horas | Diária |
| Líder Técnico | Detalha subtarefas, ajusta responsáveis, resolve bloqueios e orienta o time | Diária |
| Membro de Equipe | Executa tarefas, arrasta cards, marca progresso, aponta horas e mantém o checklist | Diária |
| RH / DHO | Acompanha apontamentos e aprova horas quando necessário | Semanal |
| Stakeholder | Consulta tarefas e marcos dos projetos de interesse | Mensal |

## Como chegar

O módulo aparece em dois lugares do sistema.

**No menu lateral, grupo Execução:**

- **Execução › Minhas tarefas** — seu painel pessoal: tarefas atribuídas a você, agrupadas **Por prazo** ou **Por projeto**, com o gráfico **Tarefas por status**, o **Timesheet da semana** e os **Apontamentos recentes**.
- **Execução › Kanban** — o quadro de execução de todos os projetos, com filtros de projeto, responsável, prioridade e etiqueta. O título da tela é **Kanban de execução**.
- **Execução › Calendário** — o **Calendário de execução**, com tarefas, marcos e alocações do período e reagendamento direto.
- **Execução › Timesheet** — apontamento de horas e aprovação, nas abas **Minha semana** e **Aprovações**.

**Dentro de um projeto** (aba **Gantt**, **Kanban**, **Lista**, **Calendário** ou **Timeline**), você trabalha nas mesmas tarefas, com o escopo limitado àquele projeto:

- **Gantt** — cronograma com dependências, caminho crítico, folga e marcos. É onde se cria tarefa pelo botão **Nova tarefa**.
- **Kanban** — quadro do projeto, com arraste entre colunas.
- **Lista** — tabela ordenável com edição direta de status e responsável e reordenação por arraste.
- **Calendário** — grade mensal do projeto, com tarefas e marcos.
- **Timeline** — uma linha por tarefa, agrupada pela tarefa-pai (a fase).

Ao abrir uma tarefa em qualquer uma dessas visões, o painel lateral **Editar tarefa** aparece com checklist, dependências e requisitos de capacidade.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Tarefa** | A unidade de trabalho. Tem nome, responsável, prazo, esforço, status, prioridade e percentual de conclusão. |
| **Subtarefa** | Tarefa filha de outra. Serve para detalhar o trabalho sem perder a visão do conjunto. |
| **Tarefa pai** | A tarefa que agrupa subtarefas. Seu percentual é calculado a partir das filhas. |
| **EAP (estrutura analítica)** | A árvore de tarefas do projeto, com níveis (tarefa, subtarefa, sub-subtarefa). |
| **Código EAP (WBS)** | O código hierárquico da tarefa, usado como referência em conversas e documentos. |
| **Esforço estimado** | Quantas horas a tarefa deve consumir. É o peso da tarefa no cálculo do progresso do projeto. |
| **Esforço real** | Quantas horas foram efetivamente apontadas no timesheet para a tarefa. |
| **Percentual de conclusão** | Quanto da tarefa está pronto, de 0% a 100%. |
| **Progresso planejado** | Quanto do prazo da tarefa já passou, em percentual. É a régua para saber se ela está atrasada em relação ao tempo. |
| **Status** | Backlog, A fazer, Em andamento, Em revisão, Bloqueada, Concluída ou Cancelada. |
| **Prioridade** | Baixa, Média, Alta ou Crítica. |
| **Responsável** | A pessoa que responde pela tarefa. Recebe o XP ao concluí-la. |
| **Responsáveis auxiliares** | Quem apoia a tarefa sem ser o dono dela. Aparece no card e no detalhe. |
| **Checklist** | Lista de passos verificáveis dentro da tarefa, com progresso próprio. |
| **Dependência** | Ligação entre duas tarefas. Tipos: Término → Início (FS), Início → Início (SS), Término → Término (FF) e Início → Término (SF). |
| **Defasagem (lag)** | Dias de intervalo embutidos na dependência. |
| **Tarefa crítica** | Tarefa sem folga, que está no caminho crítico do projeto. Atraso nela é atraso no projeto. |
| **Folga** | Dias que a tarefa pode atrasar sem afetar o fim do projeto. |
| **Marco** | Entrega-chave sem duração, exibida como losango no Gantt e bandeirinha no calendário. |
| **Posição no Kanban** | A ordem do card dentro da coluna. É definida pelo lugar onde você solta o card. |
| **WIP (trabalho em progresso)** | Quantidade de cards em uma coluna ao mesmo tempo. O sistema sinaliza colunas acima do limite. |
| **Apontamento** | Registro de horas de uma pessoa em uma data, opcionalmente ligado a uma tarefa e a uma atividade. |
| **Atividade** | A natureza do trabalho apontado: Desenvolvimento, Análise, Reunião, Testes, Documentação, Suporte ou Gestão. |
| **Meta semanal** | Quantas horas a pessoa deveria apontar na semana, definida pela sua capacidade semanal. |
| **XP** | Pontos de experiência creditados na capacidade quando você conclui tarefas ou tem horas aprovadas. |
| **Rollup** | O cálculo automático do percentual da tarefa-pai a partir das subtarefas. |

## Tarefas passo a passo

### Criar uma tarefa

**Para que serve.** Registrar trabalho com dono, prazo e esforço — a base de tudo o que o SGP calcula depois.

1. Abra o projeto e vá até a aba **Gantt**.
2. Clique em **Nova tarefa**. O painel lateral abre com o título **Nova tarefa**.
3. Preencha **Nome** (obrigatório) e, se quiser, **Descrição**.
4. Selecione o **Responsável** e, quando for uma subtarefa, a **Tarefa pai**.
5. Informe **Início**, **Fim** e **Esforço estimado (h)**.
6. Defina **Prioridade** e **Status**.
7. Clique em **Criar tarefa**.

**O que acontece depois.** A mensagem **Tarefa criada** confirma o registro, a barra aparece no Gantt, o progresso e a saúde do projeto são recalculados e a atividade "criou a tarefa" entra no histórico do projeto.

> **Atenção:** a data de fim não pode ser anterior à de início. O sistema recusa a gravação nesse caso.

### Criar subtarefas e montar a EAP

**Para que serve.** Quebrar o trabalho em partes gerenciáveis. A EAP é o que permite delegar sem perder o controle do todo.

1. Crie a tarefa que será o agrupador (por exemplo, "Módulo financeiro").
2. Crie as tarefas filhas escolhendo essa tarefa no campo **Tarefa pai**.
3. No **Gantt**, use as setas na coluna **Estrutura analítica** para expandir ou recolher as subtarefas.
4. Na aba **Lista**, use **Expandir tudo** ou **Recolher tudo** para ver a árvore inteira ou só o primeiro nível.

**O que acontece depois.** A tarefa-pai assume a **média ponderada pelo esforço das subtarefas**. Se as filhas somam 40 horas e 25 estão concluídas, o pai reflete esse avanço automaticamente — você não digita o percentual do agrupador.

> **Atenção:** apagar uma tarefa-pai remove também as subtarefas e as dependências ligadas a ela. O diálogo **Excluir tarefa** avisa: "Subtarefas e dependências vinculadas também serão removidas."

### Editar uma tarefa pelo painel lateral

**Para que serve.** Ajustar qualquer detalhe da tarefa, além de trabalhar checklist, dependências e capacidades no mesmo lugar.

1. Clique na tarefa — no Gantt, no card do Kanban, na linha da Lista, no evento do Calendário ou na barra da Timeline.
2. No painel **Editar tarefa**, altere **Nome**, **Descrição**, **Responsável**, **Tarefa pai**, **Início**, **Fim**, **Esforço estimado (h)**, **Prioridade**, **Status** e o controle **Percentual de conclusão**.
3. Abra as seções **Checklist**, **Requisitos de capacidade** e **Dependências** conforme precisar.
4. Clique em **Salvar**.

**O que acontece depois.** A mensagem **Tarefa atualizada** confirma. O sistema recalcula o percentual da tarefa-pai, o progresso do projeto, a saúde e o caminho crítico, e registra a alteração na trilha de auditoria com o antes e o depois.

### Editar direto na Lista e reordenar tarefas

**Para que serve.** Fazer ajustes rápidos em lote, sem abrir painel a cada tarefa — e definir a ordem em que o trabalho aparece para o time.

1. Na aba **Lista** do projeto, clique no seletor de **Status** ou de **Responsável (inline)** da linha e mude o valor. A alteração é salva na hora.
2. Clique no título de uma coluna (Tarefa, WBS, Status, Responsável, Início, Fim, Esforço, Progresso) para ordenar; clique de novo para inverter.
3. Para reordenar, arraste a linha pelo ícone de alça à esquerda. A nova ordem é gravada e confirmada com **Ordem atualizada**.
4. Clique em qualquer outro ponto da linha para abrir o painel de detalhe.

### Arrastar cards no Kanban

**Para que serve.** Mostrar o fluxo de trabalho andando. Mover o card é a forma mais rápida de dizer "isto avançou de etapa".

1. Abra a aba **Kanban** do projeto ou **Execução › Kanban** para o quadro consolidado.
2. Arraste o card para a coluna de destino e solte.
3. O card assume o novo status imediatamente na tela e a mudança é salva em seguida.

**O que acontece depois.** No Kanban do projeto o sistema confirma com **Card movido**; no quadro consolidado a mudança é aplicada na hora, sem aviso. Nos dois casos, a atividade "moveu para [novo status]" é registrada com o status de origem e destino, e o progresso e a saúde do projeto são recalculados.

Regras do arraste que valem a pena conhecer:

- Ao entrar na coluna **Concluída**, o percentual da tarefa vai para 100% automaticamente.
- Ao **sair** da coluna **Concluída**, o percentual cai para 80% — o sistema entende que a entrega foi reaberta.
- No quadro consolidado, você pode soltar o card **sobre outro card** para posicioná-lo exatamente naquela posição da coluna.

> **Atenção:** o Kanban do projeto mostra no cabeçalho de cada coluna a contagem em relação a um limite de 6 cards. No **Kanban de execução**, os limites são 5 para **Em andamento**, 3 para **Em revisão** e 3 para **Bloqueada**, e o indicador **Colunas no limite** aponta quantas colunas passaram do teto. Limite estourado não bloqueia nada — é um alerta de gestão.

### Atualizar o percentual pelo controle deslizante

**Para que serve.** Registrar avanço parcial sem mudar de coluna. É o jeito mais fiel de representar trabalho que está pela metade.

1. Abra a tarefa e localize o controle **Percentual de conclusão**.
2. Deslize até o valor desejado (de 0 a 100, em passos).
3. No **Minhas tarefas** e no **Kanban de execução**, o controle fica no próprio card e no painel: o valor é salvo automaticamente após uma breve pausa.

**O que acontece depois.** Se você chegar a 100%, a tarefa passa para **Concluída** e a data real de término é registrada. Se sair de zero em uma tarefa em **Backlog** ou **A fazer**, ela passa para **Em andamento** e a data real de início é gravada. O sistema também guarda quem informou o progresso.

### Montar e usar o checklist

**Para que serve.** Quebrar a tarefa em passos verificáveis — o que reduz a dependência de memória e facilita a passagem do trabalho para outra pessoa.

1. Abra a tarefa e expanda **Checklist**.
2. Escreva o item no campo **Novo item do checklist** (ou **Novo item**, no Kanban de execução) e clique em **Adicionar**.
3. Marque o quadradinho de cada item conforme conclui; clique de novo para reabrir.
4. Acompanhe a barra **Itens concluídos** — no card do Kanban, ela aparece como a fração de itens prontos.

**O que acontece depois.** Cada item concluído atualiza o progresso do checklist, exibido no card. O checklist **não** altera o percentual de conclusão da tarefa por si só — o percentual é decisão de quem executa.

### Vincular dependências e defasagem

**Para que serve.** Registrar a ordem obrigatória entre tarefas. Sem isso, o cronograma não sabe o que empurra o quê.

1. Abra a tarefa e expanda **Dependências**.
2. Veja as listas **Predecessoras** e **Sucessoras**.
3. Para criar, escolha a tarefa predecessora, o **tipo** e a **folga em dias** (a defasagem), e clique em **Criar**.
4. Para remover, clique em **Remover** na predecessora correspondente.

**O que significa cada tipo:**

| Tipo | Nome | O que a ligação diz |
|---|---|---|
| **FS** | Término → Início | A sucessora só começa depois que a predecessora terminar. É o tipo mais comum e o único que empurra barras automaticamente no Gantt. |
| **SS** | Início → Início | As duas começam juntas (ou com defasagem). Útil para frentes paralelas que precisam partir do mesmo marco. |
| **FF** | Término → Término | As duas terminam juntas. Útil quando as entregas precisam sair no mesmo pacote. |
| **SF** | Início → Término | A sucessora só termina depois que a predecessora começar. É o tipo mais raro, usado em situações de substituição. |

**O que acontece depois.** As tarefas sucessoras são reorganizadas quando necessário, o caminho crítico e as folgas são recalculados, e a atividade entra no histórico.

> **Atenção:** as duas tarefas precisam pertencer ao mesmo projeto, e a ligação não pode criar um ciclo. O sistema avisa "A dependência criaria um ciclo no cronograma." e não grava.

### Definir responsável e responsáveis auxiliares

**Para que serve.** Deixar claro quem responde e quem apoia. O responsável recebe o XP da conclusão; os auxiliares aparecem no card para que ninguém fique invisível no trabalho.

1. No painel da tarefa, escolha o **Responsável**. A lista traz as pessoas ligadas ao projeto.
2. No **Kanban de execução**, expanda **Responsáveis auxiliares** e escolha a pessoa em **Adicionar apoio**. Ela entra como chip.
3. Para tirar um apoio, clique no **x** do chip.

**O que acontece depois.** Os avatares dos auxiliares aparecem no card do Kanban, e o responsável passa a ver a tarefa em **Minhas tarefas**.

### Vincular requisitos de capacidade à tarefa

**Para que serve.** Dizer quais competências a tarefa exige. É isso que faz a conclusão gerar XP nas capacidades certas e permite ao motor de alocação sugerir a pessoa adequada.

1. Abra a tarefa e expanda **Requisitos de capacidade**.
2. Escolha a **Capacidade**, o **Nível mínimo** (1 a 5) e o **Peso**.
3. Ligue o interruptor **Requisito obrigatório** quando a tarefa não puder ser feita sem aquele nível.
4. Clique em **Vincular** (no painel do projeto) ou em **Adicionar requisito** (no Kanban de execução).
5. Para remover, use o botão de remoção ao lado do requisito.

**O que acontece depois.** Os requisitos aparecem como etiquetas na tarefa e alimentam o cálculo de XP na conclusão, além do gap de capacidades do projeto.

> **Atenção:** se a tarefa não tiver nenhum requisito próprio, a conclusão credita XP nas capacidades exigidas **pelo projeto**, com a pontuação padrão. Vale a pena detalhar os requisitos das tarefas mais relevantes.

### Comentar em uma tarefa

**Para que serve.** Deixar a decisão registrada no lugar onde o trabalho acontece, em vez de perdê-la em uma conversa paralela.

1. No painel de detalhe da tarefa, no **Kanban de execução**, expanda **Comentários**.
2. Escreva no campo **Novo comentário** (por exemplo, "Escreva uma atualização para a equipe...") e publique.

**O que acontece depois.** O comentário entra na lista com autor e data, a equipe pode ser mencionada e o histórico fica disponível para quem abrir a tarefa depois.

### Usar o Minhas tarefas

**Para que serve.** Ter uma única lista do que é seu, ordenada por urgência ou por projeto, sem precisar caçar tarefas em cada projeto.

1. Abra **Execução › Minhas tarefas**. No topo, os indicadores: **Tarefas abertas**, **Atrasadas**, **Concluídas no mês**, **Horas estimadas** (dos próximos 7 dias), **Alta prioridade** e **Progresso médio**.
2. Escolha o agrupamento: **Por prazo** (Atrasadas, Hoje, Esta semana, Próximas, Sem prazo) ou **Por projeto**.
3. Filtre por prioridade no seletor **Todas as prioridades**.
4. Em cada cartão, use o controle **Progresso** para atualizar o andamento e clique em **Concluir** quando terminar. Também é possível trocar o status pelo seletor do cartão.
5. À direita, acompanhe **Tarefas por status**, o **Timesheet da semana** e os **Apontamentos recentes**.
6. Clique em **Abrir timesheet completo e aprovações** para ir à tela completa de horas.

**O que acontece depois.** Cada ajuste é salvo automaticamente e reflete no projeto, no Kanban e no dashboard. Tarefas concluídas saem da lista.

### Ver e reagendar tarefas no Calendário de execução

**Para que serve.** Enxergar a carga por dia e resolver choques de agenda na hora, sem abrir o Gantt.

1. Abra **Execução › Calendário**.
2. Navegue com **Período anterior**, **Hoje** e **Próximo período**, escolha entre visão de **mês** ou **semana** e filtre por projeto.
3. Clique em um dia para ver os eventos no painel lateral: tarefas (com barra de **Progresso**) e marcos.
4. Em uma tarefa, use o seletor **Status** para mudar a situação, clique em **Reagendar** e informe **Novo início** e **Novo fim**, confirmando em **Confirmar**.
5. Use **Abrir tarefa** para ir direto ao projeto, ou **Abrir projeto do marco** quando o evento for um marco.

**O que acontece depois.** O reagendamento atualiza as datas, empurra as sucessoras ligadas por Término → Início e recalcula o caminho crítico.

> **Atenção:** na aba **Calendário** dentro do projeto, a grade mostra as tarefas do projeto e abre o painel de edição ao clicar em um evento — o reagendamento com campos de data está na tela **Calendário de execução**, no menu Execução.

### Apontar horas no timesheet da semana

**Para que serve.** Registrar o esforço real. É o que alimenta o custo do projeto, o esforço real da tarefa, o comparativo orçado × realizado e o XP por hora aprovada.

1. Abra **Execução › Timesheet**. A aba **Minha semana** mostra os sete dias, com o total de cada dia.
2. Clique em **Apontar horas**, no cabeçalho, ou em **Adicionar** no rodapé do dia.
3. No diálogo, escolha a **Tarefa** (a lista traz apenas as tarefas atribuídas a você; é possível registrar **Sem tarefa vinculada**), a **Data**, as **Horas** e a **Atividade**.
4. Escreva a **Descrição** com o que foi executado.
5. Clique em **Registrar horas**.

**O que acontece depois.** O apontamento aparece no dia, entra como **pendente** na fila de aprovação, soma no esforço real da tarefa e no custo do projeto. Os gráficos **Horas por dia** e **Horas por projeto** e a barra **Progresso da meta semanal** se atualizam. Para corrigir, use o ícone de lápis no apontamento; para remover, use a lixeira e confirme em **Excluir apontamento**.

> **Atenção:** cada apontamento aceita de 0,5 a 24 horas por dia. O total da semana é comparado com a sua **Meta semanal**, que vem da sua capacidade semanal de horas — definida em **Administração › Usuários e papéis**.

### Enviar a semana para aprovação

**Para que serve.** Fechar a semana e encaminhar os lançamentos para validação, garantindo que as horas entrem nos números oficiais do projeto.

1. Na aba **Minha semana**, revise os apontamentos pendentes.
2. Clique em **Enviar para aprovação**.
3. Confira a lista e o total de horas no diálogo e clique em **Confirmar envio**.

**O que acontece depois.** Se o seu perfil aprova apontamentos, o envio aprova os lançamentos da semana de uma vez. Se não aprova, o aviso **Envio registrado na fila do gestor** explica que os apontamentos já ficam pendentes para o seu gestor, o PMO ou o RH — e a aprovação final é feita por eles.

### Aprovar horas

**Para que serve.** Validar as horas antes que elas virem custo e XP. É o controle que impede lançamento duplicado, esquecido ou fora do combinado.

1. Abra **Execução › Timesheet** e vá para a aba **Aprovações**.
2. Confira os apontamentos pendentes: **Colaborador**, **Data**, **Tarefa**, **Projeto** e **Horas**.
3. Aprove um por um, com o botão **Aprovar** na linha, ou marque as caixas de seleção e clique em **Aprovar selecionados (N)**. Use **Selecionar todos** para marcar a fila inteira.
4. Se o seu perfil não aprova, a tela mostra o aviso **Aprovação restrita**: os lançamentos ficam disponíveis para o gestor, o PMO ou o RH.

**O que acontece depois.** O apontamento passa a **aprovado**, com aprovador e data registrados. A aprovação credita XP de capacidade ao colaborador (proporcional às horas), alimenta o esforço real das tarefas e entra na trilha de auditoria.

### Excluir uma tarefa

1. Abra a tarefa e clique em **Excluir**, no rodapé do painel.
2. Leia o aviso: "Subtarefas e dependências vinculadas também serão removidas."
3. Confirme em **Excluir tarefa**.

**O que acontece depois.** A tarefa sai do cronograma, do Kanban e das listas; o progresso e a saúde do projeto são recalculados; e a exclusão fica registrada na auditoria.

## Campos e o que significam

### Tarefa

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Nome** | O que precisa ser feito | Comece por um verbo: "Validar", "Configurar", "Homologar" | Sim |
| **Descrição** | Detalhe do trabalho | Contexto suficiente para outra pessoa executar | Não |
| **Código EAP (WBS)** | Código hierárquico da tarefa | Usado como referência em atas e documentos | Não |
| **Tarefa pai** | A tarefa que agrupa esta | Escolha quando for uma subtarefa | Não |
| **Nível na EAP** | Profundidade na árvore | Preenchido automaticamente a partir da tarefa pai | Automático |
| **Responsável** | Quem responde pela tarefa | Selecione entre as pessoas do projeto | Não |
| **Responsáveis auxiliares** | Quem apoia a tarefa | Adicione no **Kanban de execução**, seção **Responsáveis auxiliares** | Não |
| **Início** | Data de começo prevista | Data no calendário | Não |
| **Fim** | Data de término prevista | Data no calendário, nunca antes do início | Não |
| **Início real / Fim real** | Quando a tarefa começou e terminou de fato | Gravados automaticamente ao entrar em andamento e ao concluir | Automático |
| **Esforço estimado (h)** | Horas previstas | Número em horas; é o peso da tarefa no progresso do projeto | Não |
| **Esforço real (h)** | Horas apontadas | Soma dos apontamentos aprovados ou registrados no timesheet | Automático |
| **Percentual de conclusão** | Quanto está pronto | Controle deslizante de 0 a 100 | Não (padrão 0) |
| **Status** | Etapa atual | Backlog, A fazer, Em andamento, Em revisão, Bloqueada, Concluída ou Cancelada | Não (padrão A fazer) |
| **Prioridade** | Urgência relativa | Baixa, Média, Alta ou Crítica | Não (padrão Média) |
| **É um marco** | Marca a tarefa como entrega-chave | Exibida como losango, sem barra de duração | Não |
| **No caminho crítico** | Se a tarefa tem folga zero | Calculado pelo sistema | Automático |
| **Folga (dias)** | Dias que pode atrasar sem afetar o fim | Calculado pelo sistema | Automático |
| **Posição no Kanban** | Ordem dentro da coluna | Definida ao arrastar o card | Automático |
| **Ordem na lista** | Ordem na visão Lista | Definida ao arrastar a linha | Automático |
| **Etiquetas** | Marcadores livres | Usadas nos filtros do Kanban | Não |

### Item de checklist

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Item** | O passo a executar | Frase curta e verificável | Sim |
| **Concluído** | Se o passo foi cumprido | Marque no quadradinho | Não (padrão não) |
| **Ordem** | Posição na lista | Definida pela ordem de criação | Automático |
| **Responsável** | Quem cuida do passo | Opcional, quando o passo tem dono próprio | Não |

### Dependência

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Predecessora** | A tarefa que vem antes | Escolha entre as tarefas do projeto | Sim |
| **Sucessora** | A tarefa que vem depois | Preenchida com a tarefa que você está editando | Sim |
| **Tipo** | FS, SS, FF ou SF | Ver a tabela de significados das dependências | Não (padrão FS) |
| **Defasagem (dias)** | Intervalo entre as duas | Número de dias; use 0 para encadeamento imediato | Não (padrão 0) |
| **Obrigatória** | Se a ligação é inegociável | Mantenha ligado na maioria dos casos | Não |

### Requisito de capacidade da tarefa

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Capacidade** | A competência exigida | Escolha no catálogo de capacidades | Sim |
| **Nível mínimo** | Piso aceitável, de 1 a 5 | Use 3 como padrão para trabalho com autonomia | Não (padrão 3) |
| **Peso** | Quanto esse requisito pesa no XP e na avaliação | Deixe 1 quando não houver razão para diferenciar | Não (padrão 1) |
| **Obrigatório** | Se a tarefa não pode ser feita sem o nível | Ligue nos casos em que a ausência gera risco | Não |

### Apontamento de horas

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Tarefa** | Em que a hora foi gasta | A lista traz as tarefas atribuídas a você | Não |
| **Data** | O dia do trabalho | Data no calendário | Sim |
| **Horas** | Quanto tempo | De 0,5 a 24 horas por dia | Sim |
| **Atividade** | Natureza do trabalho | Desenvolvimento, Análise, Reunião, Testes, Documentação, Suporte ou Gestão | Não |
| **Descrição** | O que foi feito | Uma ou duas linhas objetivas | Não |
| **Aprovado** | Se o lançamento foi validado | Alterado na aba **Aprovações** | Automático |

## Regras de negócio

### O que acontece quando você muda o status ou o percentual

O sistema mantém status e percentual coerentes entre si:

- Percentual em 100% faz a tarefa virar **Concluída** e grava a data real de término.
- Marcar a tarefa como **Concluída** com percentual menor faz o percentual ir para 100% e grava a data real de término.
- Passar para **Em andamento** grava a data real de início, se ainda não houver.
- No arraste do Kanban, entrar em **Concluída** leva o percentual a 100%; sair de **Concluída** derruba o percentual para 80%.
- No controle deslizante, sair de 0% em uma tarefa em **Backlog** ou **A fazer** move a tarefa para **Em andamento**.

### Como a tarefa-pai calcula o seu percentual

O percentual da tarefa-pai é a **média ponderada pelo esforço das subtarefas** — o mesmo critério usado no projeto. Subtarefas sem esforço informado entram com peso 1. Uma subtarefa de 80 horas puxa o pai oito vezes mais do que uma de 10 horas.

### Como o projeto enxerga o progresso das tarefas

O percentual do projeto é a média ponderada pelo esforço de **todas** as tarefas. Por isso, concluir tarefas pequenas move pouco o ponteiro, e concluir uma tarefa grande move muito. A saúde do projeto reage na sequência, comparando o progresso executado com o progresso planejado.

### Como o caminho crítico e a folga são calculados

O sistema percorre a rede de dependências duas vezes: para frente, descobrindo a data mais cedo de cada tarefa; e para trás, descobrindo a data mais tarde sem atrasar o fim do projeto. A diferença entre as duas é a **folga**. Tarefas com folga zero formam o **caminho crítico** e ficam destacadas em vermelho.

Atraso em uma tarefa crítica é atraso no projeto. Atraso em uma tarefa com folga consome a folga, mas não muda o fim — até que a folga acabe.

### Como funciona o empurrão automático das sucessoras

Ao reagendar uma tarefa (no Gantt ou no Calendário), o sistema verifica as sucessoras ligadas por **Término → Início** e empurra para a primeira data válida as que começariam antes do novo fim, somando a defasagem. Depois recalcula o caminho crítico.

Os outros tipos de dependência (SS, FF e SF) influenciam o cálculo de datas e folgas, mas **não movem barras automaticamente**.

### O que o sistema impede

- Uma tarefa depender de si mesma.
- Uma dependência entre tarefas de projetos diferentes.
- Uma dependência que crie ciclo no cronograma.
- Uma tarefa ser pai de si mesma.
- Data de fim anterior à data de início.
- Apontamento com menos de 0,5 ou mais de 24 horas no mesmo dia.

### Como o esforço real é formado

Cada apontamento vinculado a uma tarefa soma horas ao **esforço real** dela e ao custo do projeto. Apontamentos sem tarefa vinculada contam no total de horas da pessoa e no custo, mas não entram no esforço real de nenhuma tarefa.

### Como concluir uma tarefa gera XP nas capacidades

Ao concluir uma tarefa, o sistema credita XP ao responsável nas capacidades exigidas por ela:

1. **Ponto de partida:** 20 pontos de XP por requisito de capacidade da tarefa.
2. **Peso do requisito:** multiplica-se pelo peso configurado no requisito.
3. **Esforço da tarefa:** multiplica-se por um fator calculado a partir do esforço estimado dividido por 8 horas, limitado entre 0,2 e 3,0. Uma tarefa de 8 horas usa fator 1; uma de 40 horas usa o teto de 3.
4. **Mínimo:** cada capacidade recebe pelo menos 1 ponto.
5. **Sem requisitos próprios:** se a tarefa não tiver requisitos cadastrados, o sistema usa os requisitos do projeto e credita 20 pontos em cada um.

O XP só é creditado na **transição** para Concluída — editar uma tarefa que já estava concluída não duplica pontos. O crédito aparece no histórico da capacidade com o motivo "Conclusão da tarefa: [nome]" e a referência da tarefa.

### Como as horas aprovadas geram XP

Cada apontamento **aprovado** e vinculado a uma tarefa credita XP proporcional: **0,5 ponto por hora**, com mínimo de 1 ponto, nas capacidades exigidas pela tarefa (ou pelas do projeto, quando a tarefa não tem requisitos). Por isso a aprovação é um ato relevante: além de validar custo, ela libera a evolução de capacidade.

### Como o XP vira promoção

O XP acumulado em cada capacidade é comparado com a régua do próximo nível. Se a capacidade não tiver critério específico, a base padrão é 100 pontos multiplicados pelo nível atual. Além do XP, o sistema verifica tempo mínimo no nível, evidências validadas e avaliação do gestor — e, para níveis mais altos, banca. Quando tudo é atendido, o sistema gera uma **sugestão de promoção** e notifica o colaborador e os validadores, mas **a promoção só acontece com validação humana**.

### Como o XP mantém a capacidade viva

Usar a capacidade em uma tarefa atualiza a data da última utilização. Capacidades muito tempo sem uso podem ser marcadas como enferrujadas e, ao voltarem a ser usadas, são reativadas — o que incentiva rodízio em vez de especialização congelada.

### Como os limites de trabalho em progresso são sinalizados

O Kanban do projeto exibe, no cabeçalho de cada coluna, a contagem em relação ao limite de 6 cards. O **Kanban de execução** trabalha com limites específicos para **Em andamento** (5), **Em revisão** (3) e **Bloqueada** (3), e resume no indicador **Colunas no limite** quantas colunas passaram do teto. Passar do limite gera destaque visual, não bloqueio.

### Como a semana do timesheet é calculada

A semana começa na segunda-feira e termina no domingo. O **total de horas** é a soma dos apontamentos da semana; a **meta semanal** vem da capacidade semanal configurada para o usuário; **aprovadas** e **pendentes** separam o que já foi validado do que ainda aguarda. Apontamentos são considerados pendentes até que alguém com permissão de aprovação os valide.

## Como ler os indicadores

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Tarefas abertas** (Minhas tarefas) | Tudo o que está com você e não foi concluído nem cancelado | Volume alto significa fila longa; verifique prioridades antes de aceitar mais | Compatível com a sua capacidade semanal |
| **Atrasadas** (Minhas tarefas) | Suas tarefas com prazo vencido | Cada atraso aqui já impacta o cronograma de alguém | Zero |
| **Concluídas no mês** (Minhas tarefas) | Entregas do mês corrente | Compare com o volume de tarefas abertas para ver se a fila cresce ou diminui | Tendência estável ou de queda na fila |
| **Horas estimadas** (Minhas tarefas) | Esforço previsto para os próximos 7 dias | Serve para negociar prazo antes de estourar a semana | Próximo da sua capacidade semanal |
| **Progresso médio** (Minhas tarefas) | Média do percentual das suas tarefas | Muito baixo com muitas tarefas em andamento indica dispersão | Poucas tarefas em andamento com progresso avançando |
| **Cards no quadro** (Kanban) | Tarefas visíveis após os filtros | Use junto de **Bloqueados** e **Colunas no limite** para avaliar o fluxo | Fluxo contínuo, poucas colunas estouradas |
| **Bloqueados** (Kanban) | Tarefas em **Bloqueada** | Bloqueio parado é o maior inimigo do prazo; trate como fila de escalação | Zero ou com prazo definido para resolver |
| **Colunas no limite** (Kanban) | Colunas acima do WIP combinado | Muitos cards em andamento ao mesmo tempo reduzem a vazão | Zero |
| **Esforço estimado** (Kanban) | Soma das horas dos cards visíveis | Ajuda a perceber se o quadro está carregado demais para a semana | Compatível com a equipe disponível |
| **Horas apontadas × Meta semanal** (Timesheet) | Quanto foi registrado contra o esperado | Abaixo da meta pode indicar sub-registro, não ociosidade | Próximo de 100% |
| **Aprovadas × Pendentes** (Timesheet) | Quanto já foi validado | Pendência acumulada distorce custo e XP | Aprovação semanal em dia |
| **Saldo da meta** (Timesheet) | Diferença entre apontado e meta | Positivo é meta atingida; negativo mostra horas restantes | Zero ou positivo |
| **Progresso × planejado no card** | Executado contra o tempo decorrido da tarefa | Se a barra executada fica atrás da referência, a tarefa está escorregando | Executado igual ou acima do planejado |
| **Itens do checklist** (card) | Fração de passos concluídos | Bom termômetro de tarefa longa, que não muda de coluna todo dia | Avanço constante |
| **Crítica** (etiqueta no card) | Tarefa no caminho crítico | Priorize essas acima das demais | Acompanhamento diário |
| **Folga** (Gantt) | Dias que a tarefa pode escorregar | Folga caindo é aviso antecipado de atraso | Folga estável ou crescente |

## Boas práticas

1. **Nomeie a tarefa pelo resultado, não pela atividade.** "Homologar integração com o ERP" diz mais do que "Trabalhar no ERP".
2. **Estime esforço em todas as tarefas.** O esforço é o peso do progresso do projeto; sem ele, o percentual fica distorcido.
3. **Detalhe em subtarefas só quando houver ganho de controle.** Tarefa de duas horas não precisa virar estrutura de três níveis.
4. **Use o checklist para passos que costumam ser esquecidos.** Checklist é memória externa, não burocracia.
5. **Mantenha o Kanban enxuto.** Respeite os limites de trabalho em progresso: menos cards em andamento significa mais entregas por semana.
6. **Aponte horas toda semana, não no fim do mês.** Registro tardio é impreciso e atrasa a aprovação, o custo e o XP.
7. **Vincule requisitos de capacidade às tarefas relevantes.** É o que faz a conclusão gerar XP na capacidade certa e melhora as recomendações de alocação.
8. **Resolva o que está em Bloqueada primeiro.** Bloqueio é a única categoria de tarefa que não anda sozinha — e a que mais contamina prazo.

## Perguntas frequentes

**1. Por que não consigo criar uma tarefa?**
A criação exige permissão de cadastro de tarefas. Perfis de execução normalmente editam tarefas existentes, mas não criam. Se precisar criar, peça ao gerente do projeto ou ao PMO.

**2. Arrastei o card para "Concluída" e o percentual foi para 100%. Posso voltar?**
Sim. Ao sair da coluna **Concluída**, o percentual passa a 80% automaticamente — o sistema entende que a entrega foi reaberta.

**3. Quem recebe o XP quando a tarefa é concluída?**
O responsável pela tarefa. Os responsáveis auxiliares aparecem no card, mas o crédito de XP da conclusão é de quem responde pela entrega.

**4. Concluí a tarefa e não vi XP nenhum. Por quê?**
Verifique se a tarefa (ou o projeto) tem requisitos de capacidade cadastrados e se você é o responsável. O XP é creditado nas capacidades exigidas — sem requisito, não há onde creditar.

**5. As horas que apontei já contam no custo do projeto?**
Elas contam no esforço real e no custo assim que são registradas. A aprovação formaliza o lançamento, libera o XP por hora e registra o aprovador na auditoria.

**6. Posso apontar horas em uma tarefa que não é minha?**
A lista de tarefas do apontamento traz as tarefas atribuídas a você. Se precisar registrar trabalho em outra tarefa, peça ao gerente para ajustar o responsável ou para lançar o apontamento.

**7. O que significa a etiqueta "Crítica" no card?**
Que a tarefa está no caminho crítico do projeto: qualquer atraso nela empurra a data final.

**8. Por que minha tarefa atrasada não aparece como atrasada?**
A marcação considera a data de fim planejada anterior a hoje e o status diferente de Concluída e Cancelada. Tarefas sem data de fim não são marcadas como atrasadas.

**9. Reordenei as tarefas na Lista. Isso muda o Gantt?**
A reordenação altera a ordem de exibição e a sequência da estrutura analítica. As datas do Gantt só mudam por reagendamento ou por dependência.

**10. O checklist concluído não deveria fechar a tarefa?**
Não. O checklist mede passos internos; quem decide o percentual da tarefa é quem executa. Ao chegar a 100%, a tarefa é concluída automaticamente.

## O que este módulo não faz

- **Não controla ponto nem jornada.** O timesheet registra esforço por tarefa e por atividade; não é relógio de ponto nem apuração de horas extras.
- **Não cronometra trabalho em tempo real.** Não existe botão de iniciar/parar; as horas são informadas depois do trabalho.
- **Não bloqueia a conclusão com checklist pendente.** O checklist é orientativo; o sistema não impede concluir uma tarefa com itens abertos.
- **Não distribui tarefas automaticamente.** O motor de alocação sugere pessoas para tarefas e projetos, mas a atribuição é sempre uma decisão humana.
- **Não cria recorrência automática.** Tarefas repetitivas precisam ser criadas novamente.
- **Não tem aplicativo móvel nem notificação em tempo real.** A atualização depende de recarregar a tela ou da atualização automática dos dados.
- **Não substitui a gestão de riscos nem o controle financeiro.** Bloqueios e impedimentos viram tarefas; riscos e issues têm módulo próprio.
- **Não impede lançamentos retroativos.** Você pode apontar horas de datas passadas; cabe à aprovação validar.

## Veja também

- [Visão geral e primeiros passos](../docs/01-visao-geral-e-primeiros-passos.md) — navegação, busca global, notificações e temas.
- [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — quem cria, edita e aprova.
- [Projetos e cronograma](../docs/03-projetos-e-cronograma.md) — portfólio, programas, assistente de cadastro, Gantt, baseline e marcos.
- [Recursos e alocação](../docs/05-recursos-e-alocacao.md) — alocação de pessoas, conflitos e capacidade.
- [Financeiro e EVM](../docs/06-financeiro-e-evm.md) — orçado × realizado e valor agregado.
- [Riscos e issues](../docs/07-riscos-e-issues.md) — riscos, plano de resposta e impedimentos.
- [Capacidades e talentos](../docs/08-capacidades-e-talentos.md) — XP, níveis, evidências, promoções e PDI.
- [Dashboards e relatórios](../docs/09-dashboards-e-relatorios.md) — dashboard do projeto e relatórios.
- [Colaboração e notificações](../docs/10-colaboracao-e-notificacoes.md) — comentários, menções e histórico de atividades.
- [Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais e problemas comuns.

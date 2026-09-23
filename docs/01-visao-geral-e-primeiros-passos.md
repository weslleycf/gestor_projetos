# Visão geral e primeiros passos

## Em uma frase

O SGP reúne, em um único lugar visual e sempre atualizado, os projetos, o portfólio, o dinheiro, os riscos e as
capacidades das pessoas — para que cada decisão seja tomada olhando o mesmo retrato da organização.

## Para que serve

A maioria das organizações não perde projetos por falta de talento, e sim por falta de visão. O cronograma vive em
uma planilha, o orçamento em outra, as competências das pessoas em um sistema de RH que ninguém consulta, e os riscos
na cabeça de quem está na reunião. O SGP existe para acabar com essa dispersão: ele é o retrato único onde o projeto,
o dinheiro e as pessoas aparecem juntos, na mesma tela, com a mesma data de referência.

O segundo problema que o SGP resolve é o da **capacidade**. Saber quem está livre na semana que vem, quem domina
determinada tecnologia, quem está sobrecarregado e quem está desenvolvendo uma competência nova é o que separa um
plano viável de uma promessa quebrada. Aqui, cada pessoa tem um perfil de capacidades, e o sistema usa esse perfil
para sugerir quem colocar em cada tarefa — sempre com a justificativa à vista.

O terceiro problema é o da **adoção**. Sistemas de gestão costumam morrer porque são feios, lentos ou exigem que a
pessoa mude de tela para entender o que aconteceu. O SGP foi construído na direção oposta: tudo é visual (Gantt,
Kanban, matrizes, heatmaps, gráficos), o menu é curto e direto, quatro pessoas diferentes podem trabalhar com o
sistema em quatro aparências diferentes e ninguém precisa de treinamento longo para achar o que procura.

Por fim, o SGP é um sistema **de governança**. Toda ação relevante — quem criou, quem alterou, quem aprovou, quem
exportou — fica registrada em uma trilha que não pode ser editada nem apagada. Isso protege a organização em
auditorias e protege as pessoas, porque decisões deixam de depender de memória.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| **Administrador** | Entra com acesso total, cadastra pessoas, ajusta papéis, confere a auditoria e configura a aparência padrão | Diário, no início e no fim do dia |
| **Executivo (C-Level)** | Abre o **Dashboard executivo**, filtra por portfólio, programa, gerente ou área e acompanha custo, prazo e risco | 2 a 3 vezes por semana, em ciclos de comitê |
| **PMO** | Usa o dashboard como painel de governança, confere marcos, alimenta o catálogo de capacidades e cobra planos de resposta | Diário |
| **Gerente de Projetos** | Entra pelo **Meu painel**, vê suas tarefas atrasadas, o time alocado e o financeiro do projeto | Várias vezes ao dia |
| **Líder Técnico** | Acompanha **Minhas tarefas**, o **Kanban** do time e as mentorias que conduz | Diário |
| **Membro de Equipe** | Registra horas no **Timesheet**, atualiza o andamento das tarefas e cuida do próprio **PDI e trilhas** | Diário |
| **RH / DHO** | Abre capacidades, lacunas de competência, validações de nível e trilhas de desenvolvimento | Semanal |
| **Stakeholder** | Consulta o andamento do projeto e a lista de riscos abertos, sem editar nada | Quinzenal, antes de reuniões |

> **Atenção:** o menu que você vê não é o menu completo do sistema. Cada perfil enxerga apenas os itens para os quais
> tem permissão. Se uma tela não aparece para você, isso é uma decisão de acesso — e não um defeito. O
> [documento de perfis e permissões](../docs/02-perfis-permissoes-e-seguranca.md) mostra a matriz completa.

## Como chegar

O SGP é acessado pelo navegador, no endereço informado pelo time de TI da sua organização. No ambiente de
demonstração, o endereço é **http://localhost:5173**. Nada precisa ser instalado no computador.

Ao abrir o endereço, você cai na tela **Acessar o SGP**, com o formulário de entrada à direita e uma faixa
institucional à esquerda com quatro destaques do sistema: **Portfólio visual**, **Capacidades e talentos**,
**Alocação inteligente** e **Governança e EVM**.

Depois de entrar, a primeira tela é o **Dashboard executivo**, salvo quando você tinha sido levado ao login no meio
de um caminho — nesse caso, o SGP devolve você exatamente para a tela onde estava.

O caminho de volta para essa tela, a qualquer momento, é **Visão geral › Dashboard executivo**.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Portfólio** | O conjunto de projetos e programas agrupados por um critério de negócio (uma diretoria, uma unidade, uma estratégia). É o nível mais alto de agrupamento. |
| **Programa** | Um grupo de projetos que compartilham objetivo, orçamento ou equipe. Fica dentro de um portfólio. |
| **Projeto** | O esforço com início, fim, responsável e orçamento que entrega um resultado. É a unidade central do SGP. |
| **Marco** | Uma data que não pode escorregar: a entrega de uma fase, uma aprovação regulatória, um go-live. Marcos críticos aparecem em destaque. |
| **Saúde do projeto** | O semáforo verde, amarelo, vermelho ou cinza que resume a situação do projeto. É calculado pelo próprio sistema, não digitado à mão. |
| **Capacidade** | Uma competência da organização ou de uma pessoa — por exemplo, "Modelagem de dados", "Negociação com fornecedores", "Segurança da informação". |
| **Alocação** | O percentual do tempo de uma pessoa dedicado a um projeto em determinado período. |
| **EVM** | *Earned Value Management*: a comparação entre o que foi planejado, o que foi entregue e o que foi gasto. É o que responde "estamos adiantados ou atrasados, e isso custou quanto?". |
| **Dashboard executivo** | A tela de visão consolidada do portfólio, com indicadores de prazo, custo, risco e capacidade. |
| **Meu painel** | A tela pessoal, com as suas tarefas, as suas horas, o seu PDI e as suas capacidades. |
| **Menu lateral** | A coluna à esquerda com os grupos e itens de navegação. Pode ser recolhida. |
| **Busca global** | A caixa no topo da tela que procura registros e telas ao mesmo tempo. Abre com **Ctrl+K**. |
| **Notificação** | O aviso que aparece no sino do topo, com quatro níveis: Informativo, Sucesso, Alerta e Crítico. |
| **Tema** | A paleta de cores da interface. O SGP traz oito temas predefinidos e um tema personalizado. |
| **Densidade** | O quanto de espaço existe entre os elementos da tela. São três: Compacta, Padrão e Confortável. |
| **Perfil** | O papel funcional da pessoa no sistema — Administrador, Executivo, PMO, Gerente, Líder, Membro, RH ou Stakeholder. Define o que ela pode fazer. |

## Tarefas passo a passo

### Entrar no SGP com as suas credenciais

Serve para abrir o sistema com a sua identidade, garantindo que você veja apenas o que lhe cabe ver e que suas ações
fiquem registradas em seu nome.

1. Abra o endereço do SGP no navegador.
2. Na tela **Acessar o SGP**, confirme que a aba selecionada é **Entrar**.
3. Preencha **E-mail corporativo** com o seu endereço completo.
4. Preencha **Senha**. Se quiser conferir o que digitou, clique no ícone de olho ao lado do campo — o rótulo do botão
   alterna entre **Mostrar senha** e **Ocultar senha**.
5. Deixe marcada a opção **Manter sessão ativa neste dispositivo** se este é um computador de uso pessoal. Em
   computador compartilhado, desmarque.
6. Clique em **Entrar no SGP**.

**O que acontece depois:** o SGP carrega o seu perfil, as suas permissões, as suas preferências de aparência e o
contador de notificações não lidas. A partir daí, todas as ações que você realizar ficam associadas ao seu nome na
trilha de auditoria.

> **Atenção:** se aparecer o aviso **Não foi possível entrar**, confira se o e-mail está completo e sem espaços no
> início ou no fim. Depois de várias tentativas seguidas, procure o administrador do SGP — o sistema não bloqueia a
> conta sozinho e não envia e-mail de recuperação de senha.

### Entrar usando uma conta de demonstração

Serve para conhecer o sistema sem ter um cadastro, ou para ver como a mesma informação aparece na tela de outro
perfil — um recurso muito útil antes de uma apresentação para a diretoria.

1. Na tela **Acessar o SGP**, clique na aba **Contas de demonstração**.
2. Aparecem quatro atalhos: **Administrador** (acesso total), **Executiva** (dashboards e portfólio),
   **Gerente de Projetos** (execução e alocação) e **Membro de Equipe** (tarefas e PDI).
3. Clique em qualquer um deles. O SGP entra imediatamente com aquele perfil e preenche o formulário com o e-mail
   correspondente.

**O que acontece depois:** você cai no **Dashboard executivo** com o conjunto de permissões daquele perfil. A senha
padrão dessas contas é **sgp123456** e aparece escrita no rodapé da própria aba.

> **Atenção:** as contas de demonstração são um recurso de vitrine e de treinamento. Em produção, o acesso deve
> acontecer por login corporativo único com verificação em duas etapas — recurso previsto no roteiro de segurança do
> SGP, ainda não disponível nesta versão.

### Conhecer a tela inicial e o dashboard executivo

Serve para responder, em menos de um minuto, às perguntas que a diretoria faz: quantos projetos temos, quantos estão
em risco, quanto já foi gasto e o que vence nas próximas semanas.

1. Abra **Visão geral › Dashboard executivo**.
2. Confira a faixa superior de indicadores: **Total de projetos**, **Em risco**, **Atrasados**, **Progresso médio**,
   **Orçamento** e **Realizado**.
3. Se quiser recortar a visão, use os filtros **Portfólio**, **Programa**, **Gerente** e **Área**. Para voltar à visão
   completa, clique em **limpar filtros**.
4. Desça a tela e percorra os cartões: **Projetos por status**, **Saúde do portfólio**, **Desempenho (EVM)** e
   **Riscos do portfólio**.
5. Percorra os blocos analíticos: **Orçado × Realizado por projeto**, **Matriz de riscos do portfólio**,
   **Projetos atrasados**, **Riscos mais severos**, **Heatmap de ocupação da equipe**, **Alocação e capacidades**,
   **Capacidades críticas** e **Próximos marcos (45 dias)**.
6. Se quiser levar a lista de projetos atrasados para uma reunião, clique em **Exportar**.
7. Para garantir que está vendo o retrato mais recente, clique em **Atualizar**.

**O que acontece depois:** clicar em **Exportar** baixa um arquivo de planilha com os projetos atrasados, contendo
nome, código, gerente, progresso, progresso planejado, dias de atraso e saúde. Clicar em **Atualizar** recarrega todos
os indicadores da tela. Clicar em qualquer linha de projeto leva ao detalhe do projeto; clicar em um risco leva à aba
de riscos do projeto correspondente.

**Exemplo prático:** em uma reunião de comitê, filtre por **Portfólio** "Transformação Digital" e por **Gerente**
"Bruno Carvalho". Os seis indicadores do topo e todos os cartões passam a refletir apenas esse recorte — o que evita
a discussão clássica em que cada área cita um número diferente.

### Navegar pelo menu lateral

Serve para chegar a qualquer módulo em no máximo dois cliques, sem decorar caminhos.

1. Use a coluna à esquerda, organizada em oito grupos.
2. Clique no nome do item desejado. O item ativo ganha destaque colorido e um ponto ao lado do nome.
3. Se quiser mais espaço na tela, clique em **Recolher menu** no rodapé da coluna. O menu passa a mostrar apenas os
   ícones; ao passar o mouse sobre um ícone, o nome do item aparece.
4. Para reabrir, clique em **Expandir menu**. Você também pode usar **Ctrl+B** para alternar entre os dois estados.
5. Em telas pequenas, use o botão **Menu** no topo para abrir e fechar a coluna lateral.

Os grupos e itens reais do sistema são:

| Grupo | Itens |
|---|---|
| **Visão geral** | Dashboard executivo · Meu painel · Timeline do portfólio |
| **Portfólio** | Projetos · Programas · Portfólios · Marcos · Relatórios |
| **Execução** | Minhas tarefas · Kanban · Calendário · Timesheet · Colaboração |
| **Recursos e alocação** | Alocação · Motor de matching · Recursos · Capacidade |
| **Financeiro** | Painel financeiro · Lançamentos · EVM e curva S |
| **Riscos e qualidade** | Matriz de riscos · Issues e ações |
| **Capacidades e talentos** | Catálogo de capacidades · Matriz de skills · Gap analysis · Bus factor · Pessoas · PDI e trilhas · Validações · Oportunidades · Sucessão |
| **Administração** | Usuários e papéis · Workflows · Campos customizados · Integrações · Auditoria · Temas e aparência · Preferências |

**O que acontece depois:** grupos que ficariam vazios para o seu perfil simplesmente não aparecem. Um Membro de
Equipe, por exemplo, não vê os grupos **Financeiro** nem **Riscos e qualidade**, porque não tem acesso a eles.

### Encontrar qualquer coisa com a busca global (Ctrl+K)

Serve para não precisar lembrar em qual menu uma informação mora. A busca procura registros e telas ao mesmo tempo.

1. Aperte **Ctrl+K** em qualquer tela (em computadores Mac, **Cmd+K**). Você também pode clicar na caixa
   **Buscar ou navegar…** no topo.
2. Digite pelo menos dois caracteres. A lista de **Registros** aparece com o que combina: projetos, programas,
   tarefas, capacidades, pessoas, recursos e riscos.
3. A seção **Navegar** mostra as telas cujo nome combina com o que você digitou.
4. Use as setas **↑** e **↓** para percorrer os resultados e **Enter** para abrir. Para fechar sem abrir nada,
   aperte **Esc** ou clique fora da janela.

**O que acontece depois:** o registro escolhido abre na tela correspondente — um projeto abre no detalhe do projeto,
uma tarefa abre o projeto já com a tarefa em foco, uma pessoa abre o perfil dela.

**Exemplo prático:** você está em uma reunião e alguém pergunta pelo risco de um fornecedor específico. **Ctrl+K**,
digite o nome do fornecedor, e a lista de riscos aparece com o código do risco e o projeto ao qual ele pertence.

> **Atenção:** a busca respeita as suas permissões. Se você não tem acesso ao módulo financeiro, nenhum valor
> financeiro aparecerá nos resultados — nem por engano.

### Acompanhar as notificações

Serve para saber o que mudou sem precisar varrer o sistema inteiro.

1. Clique no ícone de **Notificações** (o sino) no canto superior direito.
2. O painel abre com as notificações mais recentes, cada uma com um ponto colorido à esquerda: azul para
   informativo, verde para sucesso, laranja para alerta e vermelho para crítico.
3. Clique em uma notificação para marcá-la como lida. Se ela tiver um destino associado, o SGP abre a tela
   correspondente.
4. Para limpar tudo de uma vez, clique em **marcar todas como lidas**.

**O que acontece depois:** o número vermelho sobre o sino diminui conforme você lê. Quando passa de 99, ele aparece
como **99+**. Notificações ainda não lidas ficam levemente destacadas no painel.

### Usar o menu do usuário

Serve para trocar a aparência da interface, chegar ao seu perfil e sair do sistema com segurança.

1. Clique no seu nome, no canto superior direito.
2. No topo do menu aparecem a sua foto ou iniciais, o seu nome completo, o seu e-mail e o seu perfil.
3. Em **Modo**, escolha entre **Claro**, **Escuro** e **Auto** (o modo **Auto** acompanha a configuração do seu
   sistema operacional).
4. Em **Tema**, clique em uma das oito amostras de cor. A mudança é aplicada na hora, sem recarregar a página.
5. Em **Densidade**, escolha entre **Compacta**, **Padrão** e **Confortável**.
6. Para ajustar cores com liberdade, clique em **Abrir editor de temas**.
7. Para ver o seu perfil de capacidades, clique em **Meu perfil e capacidades**.
8. Para ajustar preferências detalhadas, clique em **Preferências**.
9. Para sair, clique em **Sair**.

**O que acontece depois:** a aparência escolhida é gravada na sua conta e vale em qualquer navegador em que você
entrar. A opção **Sair** encerra a sessão neste navegador e a remove do dispositivo.

### Escolher um tema visual

Serve para deixar o sistema confortável para os seus olhos, alinhado à identidade da sua organização ou adequado a
uma condição de baixa visão.

1. Abra **Administração › Temas e aparência**. A tela está organizada em quatro abas: **Temas predefinidos**,
   **Criar meu tema**, **Densidade** e **Como funciona**.
2. Na aba **Temas predefinidos**, use o filtro de categoria — **Todos**, **Institucional**, **Clássicos**,
   **Vibrantes** ou **Acessibilidade** — para reduzir a lista.
3. Cada cartão mostra uma pré-visualização real de componentes do SGP com as cores daquele tema. Use o ícone de olho
   para alternar entre prévia compacta e detalhada.
4. Quando gostar de um tema, clique em **Aplicar tema**. O cartão do tema em uso passa a exibir **Em uso**.
5. No topo da tela, defina o **Modo de cor**: **Claro**, **Escuro** ou **Sistema**.

Os oito temas predefinidos são:

| Tema | Categoria | Perfil de uso |
|---|---|---|
| **Azul SGP** | Institucional | Identidade padrão do sistema. Azul corporativo com neutros frios. |
| **Bradesco 2026** | Institucional | Vermelho institucional com o roxo da marca. Para uso alinhado à identidade Bradesco. |
| **Esmeralda** | Clássico | Verde institucional, adequado a contextos financeiros e de sustentabilidade. |
| **Oceano** | Clássico | Ciano profundo, boa densidade para painéis analíticos. |
| **Violeta** | Vibrante | Roxo contemporâneo; destaca bem os módulos de capacidades. |
| **Âmbar** | Vibrante | Laranja quente com texto escuro sobre a marca; enérgico, para times operacionais. |
| **Grafite** | Clássico | Neutro minimalista, com cantos retos. Máxima neutralidade para leitura de dados. |
| **Alto contraste** | Acessibilidade | Contraste máximo para baixa visão e uso sob luz forte. Atende ao nível AAA de acessibilidade. |

**O que acontece depois:** o tema é aplicado imediatamente em toda a interface — inclusive nos gráficos, matrizes e
semáforos — e fica gravado na sua conta. Cada tema tem variante clara e escura.

**Sobre o tema Bradesco 2026:** ele foi construído a partir das cores públicas documentadas da marca — Vermelho
Bradesco, Roxo institucional, Preto institucional e Cinza claro. Como o manual de marca oficial é publicado em
documento fechado, os valores devem ser conferidos com o time de marca antes de um uso institucional amplo. Se os
valores exatos forem diferentes, eles podem ser ajustados na aba **Criar meu tema**, sem depender de TI.

> **Atenção:** o tema **Alto contraste** é o único marcado como recurso de acessibilidade. Ele usa fundo branco puro
> no modo claro e preto puro no modo escuro, bordas reforçadas e um amarelo de altíssimo contraste no modo escuro.
> Se você tem baixa visão ou trabalha sob luz solar direta, este é o tema recomendado.

### Criar o seu próprio tema

Serve para alinhar o sistema à identidade visual da sua área ou para ajustar uma cor específica que incomoda no dia
a dia.

1. Abra **Administração › Temas e aparência** e vá para a aba **Criar meu tema**.
2. Escolha um tema base entre os oito predefinidos.
3. Ajuste as cores desejadas. Os campos estão agrupados em **Marca**, **Superfícies**, **Texto e bordas** e
   **Estados**.
4. Observe a pré-visualização: as mudanças são aplicadas na hora em toda a interface, mas nada é gravado enquanto
   você não confirmar.
5. Quando estiver satisfeito, clique em **Salvar e aplicar**. Para voltar ao tema base, clique em **Restaurar base**.
   Para abandonar as alterações, clique em **Descartar**.
6. Se quiser guardar uma cópia, clique em **Exportar JSON**. Para trazer um tema que outra pessoa preparou, use
   **Importar JSON**.

**O que acontece depois:** o tema personalizado passa a ser o seu tema ativo e acompanha você em qualquer navegador.
Para removê-lo, use **Excluir tema**.

### Escolher a densidade da interface

Serve para colocar mais informação na tela quando você está analisando muitos dados, ou mais respiro quando está
usando um tablet ou apresentando para uma plateia.

1. Abra **Administração › Temas e aparência** e vá para a aba **Densidade**. Você também encontra o seletor no menu
   do usuário e em **Preferências**.
2. Compare as três opções, cada uma com uma prévia real de lista na própria escala.
3. Clique na opção desejada.

| Densidade | Escala de espaçamento | Quando usar |
|---|---|---|
| **Compacta** | 85% | Análise de muitos dados: matriz de skills, heatmaps, listas longas de tarefas, conferência de lançamentos. |
| **Padrão** | 100% | Uso geral e dashboards. Equilíbrio entre densidade e respiro; recomendado para o dia a dia. |
| **Confortável** | 115% | Tablets, telas sensíveis ao toque, apresentações e uso prolongado com menos fadiga visual. |

**O que acontece depois:** a mudança é imediata e vale para todas as telas. O que muda é o **espaço entre os
elementos** — ícones e textos mantêm o tamanho. A preferência é gravada na sua conta e reaplicada no próximo acesso.

> **Atenção:** densidade e tema são independentes. Você pode usar **Alto contraste** com **Compacta**, por exemplo —
> a combinação é livre.

### Conferir e ajustar as suas preferências

Serve para deixar o sistema do seu jeito e para controlar o uso dos seus dados pessoais e de capacidade.

1. Abra **Administração › Preferências** (ou clique em **Preferências** no menu do usuário).
2. Revise as seções da tela: perfil, aparência, privacidade e capacidades, visualizações padrão, notificações,
   filtros salvos e segurança.
3. Ajuste o que quiser. Não existe botão de salvar: as preferências são gravadas automaticamente assim que você
   altera um controle.

**O que acontece depois:** o tema e a densidade são aplicados na hora; a visibilidade padrão das suas capacidades
passa a valer para os novos registros; as visualizações padrão definem em que formato cada módulo abre para você.

## Campos e o que significam

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **E-mail corporativo** | Seu identificador de acesso ao SGP | Digite o endereço completo, no formato nome@empresa.com.br | Sim |
| **Senha** | Sua credencial secreta | Digite a senha; use o ícone de olho para conferir | Sim |
| **Manter sessão ativa neste dispositivo** | Mantém você conectado mesmo depois de fechar o navegador | Deixe marcado em computador pessoal; desmarque em computador compartilhado | Não |
| **Modo** | Define se a interface usa cores claras, escuras ou acompanha o sistema operacional | Escolha **Claro**, **Escuro** ou **Auto** | Não |
| **Tema** | A paleta de cores da interface | Clique na amostra desejada | Não |
| **Densidade** | O espaço entre os elementos da tela | Escolha **Compacta**, **Padrão** ou **Confortável** | Não |
| **Termo de busca** | O texto digitado na busca global | Digite ao menos dois caracteres | Sim, para buscar |
| **Portfólio / Programa / Gerente / Área** | Filtros do dashboard executivo | Selecione um valor; use **limpar filtros** para voltar | Não |
| **Visibilidade padrão das capacidades** | Como os seus novos registros de capacidade nascem | Escolha entre Público, Restrito e Privado | Não |
| **Aceito ser recomendado em alocações** | Autoriza o motor de alocação a considerar o seu perfil | Ligue ou desligue o interruptor | Não |
| **Disponível para mentoria** | Faz você aparecer nas sugestões de mentor | Ligue ou desligue o interruptor | Não |

## Regras de negócio

**O menu é montado a partir das suas permissões.** Cada item do menu lateral declara a permissão necessária. O
sistema exibe o item apenas se você tiver aquela permissão, e esconde o grupo inteiro quando nenhum item dele
sobraria. Alguns itens não exigem permissão específica e aparecem para todo mundo que está autenticado:
**Meu painel**, **Minhas tarefas**, **Timesheet**, **PDI e trilhas**, **Temas e aparência** e **Preferências**.

**As telas continuam protegidas mesmo que você digite o endereço direto.** Esconder o item do menu é a parte visual
da regra; a proteção real acontece em cada operação do sistema. Se você tentar abrir ou alterar algo sem permissão, a
operação é recusada e um aviso de acesso negado aparece.

**A busca global respeita as mesmas regras do menu.** O sistema só procura registros dos módulos aos quais você tem
acesso. Projetos e programas exigem acesso a projetos; tarefas exigem acesso a tarefas; capacidades e pessoas exigem
acesso a capacidades; recursos exigem acesso a recursos; riscos exigem acesso a riscos. A busca só começa a partir de
dois caracteres digitados e devolve até oito resultados por tipo de registro.

**Temas são aplicados sem recarregar a página.** A troca reescreve as cores da interface na hora, o que permite
comparar dois temas lado a lado e ver o efeito real em tabelas e gráficos antes de decidir.

**A preferência de aparência acompanha a pessoa, não o computador.** Tema, modo de cor, densidade e tema
personalizado ficam gravados no seu cadastro. Isso significa que, ao entrar em outro navegador, você encontra o
sistema do jeito que deixou. Se você já tiver escolhido uma aparência naquele navegador, a escolha local é mantida.

**A densidade mexe apenas no espaçamento.** Ela redefine a escala base que sustenta paddings, margens e espaçamentos
de toda a interface. Tamanhos de fonte e de ícones não mudam — o objetivo é ganhar espaço útil, não encolher o
conteúdo.

**Os indicadores têm prazo de validade curto.** Cada tela guarda a última leitura por 30 segundos. Se você navegar
para outra tela e voltar dentro desse intervalo, os números vêm da leitura anterior e a tela responde na hora. Passado
o intervalo, a próxima visita busca dados novos automaticamente.

**Alterações disparam atualização das telas relacionadas.** Quando você salva algo — um andamento de tarefa, um
lançamento, uma alocação — o SGP atualiza automaticamente os blocos que dependem daquela informação. É por isso que,
ao concluir uma tarefa, o progresso do projeto e o semáforo de saúde podem mudar sem que você precise clicar em nada.

**As contas de demonstração compartilham a mesma senha.** Todas usam **sgp123456**. Elas servem para demonstração e
treinamento e não devem ser usadas para trabalho real.

## Como ler os indicadores

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Total de projetos** | Quantidade de projetos no recorte atual | Serve de denominador para todos os outros números; o subtítulo mostra quantos estão em andamento | Depende do portfólio |
| **Em risco** | Projetos com saúde amarela ou vermelha | Quanto maior a proporção sobre o total, mais atenção de governança a execução exige | Até 15% do total |
| **Atrasados** | Projetos com prazo vencido | É o indicador mais objetivo do painel: não depende de interpretação | Zero, ou com plano de recuperação registrado |
| **Progresso médio** | Percentual médio de conclusão dos projetos ativos | Compare sempre com o progresso planejado antes de comemorar ou cobrar | Alinhado ao planejado |
| **Orçamento** | Soma do orçamento planejado no recorte | É o total autorizado, não o gasto | Referência estável |
| **Realizado** | Custo já incorrido, com o percentual consumido no subtítulo | Consumo muito acima do progresso é sinal de estouro | Consumo próximo do progresso |
| **CPI médio** | Relação entre o que foi entregue e o que foi gasto | Acima de 1 significa entrega por menos dinheiro que o previsto | Igual ou maior que 1,00 |
| **SPI médio** | Relação entre o que foi entregue e o que estava planejado | Abaixo de 1 significa atraso de cronograma | Igual ou maior que 1,00 |
| **Saldo orçamentário** | Orçamento menos custo realizado | Verde quando positivo, vermelho quando negativo | Positivo |
| **Receita prevista** | Receita esperada no recorte | Serve para comparar retorno com investimento | Positiva |
| **ROI estimado** | Retorno esperado sobre o investimento | Percentual; negativo indica projeto que destrói valor no cenário atual | Positivo |
| **Cobertura do catálogo** | Proporção de capacidades do catálogo que têm pelo menos uma pessoa com perfil registrado | Cobertura baixa significa catálogo bonito, mas sem lastro na realidade | Acima de 70% |
| **Índice de desenvolvimento** | Combina PDIs ativos, mentorias, reciclagem e promoções pendentes | Mede se a organização está desenvolvendo gente, não apenas executando projetos | Crescente ao longo do trimestre |
| **Recomendações pendentes** | Sugestões do motor de alocação aguardando decisão | Muitas pendências indicam que a alocação está sendo feita fora do sistema | Baixo e decrescente |
| **Capacidades críticas** | Capacidades com poucos detentores no recorte | Um selo de **bus factor** aparece quando só uma pessoa domina o assunto | Todo item crítico com dois ou mais detentores |
| **Próximos marcos (45 dias)** | Marcos que vencem nas próximas seis semanas | Datas em vermelho ou laranja exigem ação imediata | Nenhum marco crítico em vermelho |
| **Tarefas abertas / Atrasadas / Concluídas no mês** | Sua carga pessoal no **Meu painel** | Atrasadas exigem priorização antes de assumir trabalho novo | Atrasadas igual a zero |
| **Horas na semana** | Horas apontadas no **Timesheet** contra a sua meta | Ajuda a perceber sobrecarga e subapontamento | Próximo da meta semanal |

## Boas práticas

1. **Comece o dia pelo Meu painel e termine pelo Dashboard executivo.** O primeiro mostra o que depende de você; o
   segundo mostra o efeito do trabalho de todos.
2. **Aprenda três atalhos e ganhe tempo todos os dias:** **Ctrl+K** para buscar, **Ctrl+B** para recolher o menu e o
   clique no sino para notificações.
3. **Use os filtros antes de discutir números.** Grande parte das divergências em reunião desaparece quando todos
   olham o mesmo recorte de portfólio, programa, gerente e área.
4. **Trate os 30 segundos como o que eles são.** Se você acabou de alterar algo e o número não mudou, use **Atualizar**
   — não conclua que o sistema está errado.
5. **Escolha a densidade pela tarefa, não pelo gosto.** **Compacta** para analisar, **Padrão** para o dia a dia,
   **Confortável** para apresentar.
6. **Se você tem baixa visão, use o tema Alto contraste.** Ele foi desenhado exatamente para isso e não é uma opção
   "de nicho".
7. **Ajuste a privacidade das capacidades cedo.** Quanto antes você definir o que é público, restrito e privado,
   menos retrabalho depois — e o motor de alocação continua funcionando normalmente para o que você autorizou.
8. **Não compartilhe a senha nem use uma conta de demonstração para trabalho real.** Tudo o que acontece no sistema é
   registrado em nome de quem entrou.

## Perguntas frequentes

**1. Não encontro um módulo no menu. O que aconteceu?**
O menu mostra apenas os itens para os quais o seu perfil tem permissão. Isso é proposital. Para saber o que o seu
perfil pode fazer, veja a [matriz de permissões](../docs/02-perfis-permissoes-e-seguranca.md) ou fale com o
administrador do SGP.

**2. Esqueci a minha senha. Consigo recuperar sozinho?**
Não. Nesta versão o SGP não tem recuperação de senha por e-mail nem autoatendimento. Procure o administrador do
sistema, que redefine a senha em **Administração › Usuários e papéis**.

**3. Posso deixar o sistema com a aparência de outra pessoa?**
Não. Tema, modo de cor e densidade são preferências pessoais, gravadas no seu cadastro. O que você pode fazer é
exportar o seu tema personalizado e enviar o arquivo para outra pessoa importar.

**4. O tema Bradesco 2026 é oficial?**
Ele foi montado a partir das cores públicas documentadas da marca Bradesco e é fiel à identidade. Como o manual de
marca oficial é publicado em documento fechado, confirme os valores com o time de marca antes de um uso institucional
amplo — e, se houver diferença, ajuste na aba **Criar meu tema**.

**5. Por que às vezes vejo um número diferente do que vi há um minuto?**
Duas razões possíveis: os filtros do dashboard (portfólio, programa, gerente e área) podem estar aplicados, ou a tela
está mostrando a leitura dos últimos 30 segundos. Clique em **limpar filtros** e depois em **Atualizar** para
confirmar.

**6. A busca global não acha o que eu quero. Por quê?**
Três motivos comuns: o termo tem menos de dois caracteres; o registro está em um módulo ao qual você não tem acesso;
ou o nome procurado é diferente do nome cadastrado. Tente pelo código do projeto, que costuma ser mais curto e
único.

**7. Preciso instalar algo para usar o SGP?**
Não. O SGP roda no navegador. No ambiente de demonstração, basta abrir **http://localhost:5173**.

**8. Posso usar o SGP no celular?**
A interface é responsiva: em telas pequenas, o menu lateral vira um botão **Menu** no topo e os blocos se reorganizam
em uma coluna. A experiência completa, porém, é pensada para telas maiores — o uso em celular é adequado para
consultas rápidas e aprovações pontuais.

**9. O que acontece se eu fechar o navegador sem clicar em Sair?**
Com a opção **Manter sessão ativa neste dispositivo** marcada, você continua conectado. Se estiver em computador
compartilhado, saia explicitamente pelo menu do usuário.

**10. As minhas escolhas de aparência valem para os meus colegas?**
Não. Aparência é individual. O que é compartilhado são os dados: projetos, alocações, riscos e capacidades.

## O que este módulo não faz

- **Não tem recuperação de senha por autoatendimento.** Redefinição é feita pelo administrador.
- **Não tem login único corporativo nem verificação em duas etapas nesta versão.** Ambos estão previstos no roteiro
  de segurança e ainda não estão disponíveis.
- **Não é um aplicativo móvel nativo.** Funciona bem no navegador do celular, mas não há aplicativo para instalar.
- **Não atualiza em tempo real entre pessoas.** Duas pessoas trabalhando na mesma tela não veem a alteração uma da
  outra no instante em que ela acontece; a atualização ocorre na próxima consulta ou ao clicar em **Atualizar**.
- **Não traduz a interface para outros idiomas.** O sistema está em português do Brasil.
- **Não permite que cada pessoa crie o seu próprio conjunto de menus.** O menu é definido pelas permissões do perfil.
- **Não tem tema por área ou por projeto.** Tema e densidade são escolhas individuais.

## Veja também

- [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — quem pode fazer o quê, escopos,
  privacidade das capacidades, LGPD e trilha de auditoria.
- [Projetos e cronograma](../docs/03-projetos-e-cronograma.md) — portfólios, programas, projetos, Gantt, marcos e
  encerramento.
- [Tarefas e execução](../docs/04-tarefas-e-execucao.md) — tarefas, Kanban, calendário, checklist, dependências,
  minhas tarefas e timesheet.
- [Dashboards e relatórios](../docs/09-dashboards-e-relatorios.md) — leitura detalhada do dashboard executivo e dos
  relatórios por widgets.
- [Colaboração e notificações](../docs/10-colaboracao-e-notificacoes.md) — comentários, menções, chat por projeto,
  histórico e regras de notificação.
- [Administração](../docs/11-administracao.md) — usuários, papéis, workflows, campos personalizados, integrações e
  auditoria.
- [Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais e problemas comuns.

# Administração da plataforma

## Em uma frase

A administração reúne as decisões que valem para toda a organização dentro do SGP: quem entra no sistema, o que cada
pessoa pode fazer, como o trabalho caminha de um estado para outro, quais campos aparecem nos formulários, como as
pessoas são avisadas, como o SGP conversa com outros sistemas e o registro de tudo o que aconteceu.

## Para que serve

O SGP só é confiável quando as regras de acesso, os formulários e os fluxos são iguais para todo mundo. A administração
é o lugar onde essas regras são definidas uma única vez e passam a valer para toda a organização. Sem isso, cada área
criaria a sua própria planilha de campos, cada gerente inventaria o seu jeito de marcar o andamento das tarefas e
ninguém conseguiria comparar nada.

O primeiro valor deste módulo é a **clareza sobre quem pode o quê**. Cada pessoa recebe um perfil funcional — e esse
perfil determina o que aparece no menu e o que pode ser alterado. Papéis sob medida cobrem as exceções legítimas, como
um auditor externo que precisa apenas consultar. O resultado é um ambiente em que o acesso é uma decisão consciente e
registrada, e não um acidente de configuração.

O segundo valor é a **padronização do trabalho**. Workflows definem por quais estados uma tarefa, um projeto ou um
risco passam, com limites de trabalho em andamento que evitam que a equipe comece mais do que consegue terminar. Campos
personalizados permitem guardar informações específicas da sua organização — centro de custo, número de contrato,
unidade solicitante — sem depender de desenvolvimento e sem quebrar o padrão do sistema.

O terceiro valor é a **memória do que aconteceu**. A trilha de auditoria registra quem criou, alterou, excluiu,
aprovou, alocou, validou, exportou, entrou e saiu — com data, hora, endereço de rede e o valor anterior e o novo de cada
campo. Essa trilha é imutável e retida por no mínimo cinco anos. É ela que responde à pergunta "de onde veio esse
número?" e que sustenta auditorias internas, pedidos de compliance e investigações pontuais.

Por fim, a administração **conecta o SGP ao resto do mundo**: credenciais de API com escopos limitados, webhooks
assinados, integrações com ERP, RH, LMS, agendas e ferramentas de desenvolvimento, e exportações prontas para
Power BI, Tableau, Excel e calendários — sempre começando em modo simulação, validando e só depois ligando o modo real.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| **Administrador** | Cadastra pessoas, define perfis e papéis, mantém workflows e campos personalizados, emite credenciais de API, configura webhooks e consulta a trilha | Diário, ou sob demanda |
| **PMO** | Mantém workflows e campos personalizados, acompanha a matriz de permissões e revisa integrações | Semanal |
| **RH / DHO** | Mantém o cadastro das pessoas, custo por hora, capacidade semanal, gestor e data de admissão; consulta a trilha | Diário |
| **Executivo (C-Level)** | Consulta a trilha de auditoria e a matriz de permissões em ciclos de governança | Eventual |
| **Gerente de Projetos** | Não administra acessos; usa os workflows e os campos personalizados definidos aqui | Semanal |
| **Líder Técnico** | Não administra acessos; usa os workflows definidos aqui | Semanal |
| **Membro de Equipe** | Ajusta as próprias notificações em **Preferências** e usa os campos personalizados dos formulários | No primeiro acesso e depois sob demanda |
| **Stakeholder** | Não usa este módulo | Não se aplica |

## Como chegar

| Caminho | O que aparece ao abrir |
|---|---|
| **Administração › Usuários e papéis** | Três abas: **Usuários**, **Papéis** e **Matriz de permissões**. No topo, os botões **Novo papel** e **Novo usuário**. Exige a permissão de administração. |
| **Administração › Workflows** | O seletor de workflow, o **Canvas do workflow** com os estados arrastáveis, a **Pré-visualização do board Kanban**, as **Transições configuradas** e a lista **Estados do workflow**. Exige a permissão de edição de workflows. |
| **Administração › Campos customizados** | O seletor de entidade (Projeto, Tarefa ou Risco) e as abas **Campos**, **Editor visual** e **Schema**. Exige a permissão de administração. |
| **Administração › Integrações** | A **Central de integrações**, com as abas **Integrações**, **Execuções**, **Eventos e webhooks** e **Catálogo**. Exige a permissão de administração. |
| **Administração › Auditoria** | A **Trilha de auditoria**, com os gráficos de distribuição, os filtros, a tabela paginada e os botões **Política de retenção** e **Exportar CSV**. Exige a permissão de auditoria. |
| **Administração › Preferências** | Os blocos de privacidade, aparência, preferências de visão, **Notificações** e filtros salvos de cada pessoa. Disponível para todos. |

> **Atenção:** se um item do grupo **Administração** não aparece no seu menu, o seu perfil não tem a permissão
> correspondente. Isso não é um defeito: o menu é montado a partir das suas permissões efetivas. Peça ao
> administrador para revisar o seu acesso.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Perfil** | O papel funcional da pessoa no sistema. São oito: Administrador, Executivo (C-Level), PMO, Gerente de Projetos, Líder Técnico, Membro de Equipe, RH/DHO e Stakeholder. |
| **Papel** | Um conjunto de permissões criado sob medida pela organização, como "Auditor" ou "Coordenador de PMO". Papéis **somam-se** ao perfil. |
| **Permissão** | A autorização para um tipo de operação em um módulo, escrita no formato *módulo.ação* — por exemplo, *projeto.editar*. |
| **Curinga** | A autorização total, mostrada como um asterisco. Só o Administrador e as contas técnicas a possuem. |
| **Vínculo** | A ligação entre uma pessoa e um papel, com um escopo. É o vínculo que dá efeito prático ao papel. |
| **Escopo** | O nível em que um papel é atribuído: Global, Portfólio, Programa, Projeto ou Pessoal. |
| **Papel de sistema** | Papel que já vem com o SGP e não pode ser excluído. Serve de exemplo e de base para os papéis da casa. |
| **Matriz de permissões** | A grade que cruza as permissões catalogadas com os oito perfis, mostrando o que cada perfil concede. |
| **Custo por hora** | O valor da hora da pessoa. É dado sensível de RH e tem visibilidade controlada. |
| **Capacidade semanal** | Quantas horas por semana a pessoa está disponível para o trabalho. Alimenta a alocação e a demanda de pessoas. |
| **Workflow** | O fluxo de trabalho de uma entidade: quais estados existem e por quais caminhos se passa de um a outro. |
| **Estado** | Uma etapa do fluxo — por exemplo, "Em análise" ou "Em homologação". Cada estado tem nome, chave, cor, ícone e ordem. |
| **Chave do estado** | O identificador curto do estado, sem espaços, usado pelo board. Não pode repetir dentro do mesmo workflow. |
| **Transição** | O caminho permitido de um estado para outro, com rótulo opcional e a marcação de aprovação obrigatória. |
| **Limite de WIP** | O número máximo de itens que podem ficar parados em um estado ao mesmo tempo. Zero significa sem limite. |
| **Estado inicial** | O estado em que todo item novo nasce. Um workflow precisa de pelo menos um. |
| **Estado final** | O estado que encerra o ciclo de vida do item. |
| **Campo personalizado** | Um campo criado pela organização para guardar informação que o SGP não traz de fábrica. |
| **Schema** | A descrição técnica da entidade com os campos ativos e as seções. É o que a tela mostra na aba **Schema**. |
| **Regra de notificação** | A configuração que diz qual evento gera aviso, por qual canal, com qual nível e para quem. |
| **Canal** | Por onde o aviso é entregue: **No aplicativo**, **E-mail**, **Microsoft Teams**, **Slack** ou **Push no navegador**. |
| **Nível da notificação** | A gravidade do aviso: Informativo, Sucesso, Alerta ou Crítico. Muda a cor e o destaque na lista. |
| **Credencial de API** | Uma chave de acesso que permite que outro sistema consulte o SGP sem usar a senha de uma pessoa. |
| **Escopo da credencial** | O conjunto de operações que a credencial pode executar. Quanto menor, mais seguro. |
| **IP permitido** | O endereço de rede autorizado a usar a credencial. Em branco, aceita qualquer origem. |
| **Webhook** | Um endereço de outro sistema que recebe um aviso automático sempre que um evento assinado acontece. |
| **Segredo de assinatura** | A chave combinada entre o SGP e o sistema de destino para provar que a chamada veio mesmo do SGP. |
| **Trilha de auditoria** | O registro cronológico e imutável das operações do sistema. |
| **Imutabilidade** | A garantia de que um registro de auditoria não pode ser alterado nem excluído depois de gravado. |
| **Retenção** | Por quanto tempo um registro é mantido. Na trilha, o mínimo é de cinco anos. |
| **Comparativo antes × depois** | A leitura, campo a campo, do valor anterior e do valor novo de um registro alterado. |

## Tarefas passo a passo

### Cadastrar uma pessoa no SGP

Serve para dar acesso a alguém que acabou de entrar na organização ou que passará a usar o sistema.

1. Abra **Administração › Usuários e papéis** e confirme que você está na aba **Usuários**.
2. Clique em **Novo usuário**. Um painel lateral abre com o título **Novo usuário**.
3. No bloco **Identificação**, preencha **Nome completo** e **E-mail**. Os dois são obrigatórios — o e-mail é o que a
   pessoa usará para entrar.
4. Ainda em **Identificação**, informe **Senha** (mínimo de 6 caracteres) e, se quiser, **Cargo**, **Área**,
   **Localização** e **Fuso horário**. O campo **Área** sugere valores já usados na organização.
5. No bloco **Vínculo e acesso**, escolha o **Perfil de acesso**. Ele define o menu e as ações da pessoa.
6. Se quiser registrar a hierarquia, escolha o **Gestor imediato** e informe a **Data de admissão**. O **Idioma**
   define o idioma da interface.
7. Confirme que **Usuário ativo** está ligado. Deixe **Acesso ao Django admin** desligado, salvo para contas técnicas
   nominadas.
8. Se você já conhece o custo e a disponibilidade da pessoa, abra o bloco **Custo e capacidade** e preencha
   **Custo por hora (R$)** e **Capacidade semanal (horas)**.
9. Clique em **Criar usuário**.

**O que acontece depois:** a pessoa passa a conseguir entrar com o e-mail e a senha informados. A criação é gravada na
trilha de auditoria com autor, data e hora. Nenhuma notificação é enviada automaticamente — avise a pessoa por um canal
seguro e peça que troque a senha.

**Exemplo prático:** ao cadastrar uma analista de PMO, você escolhe o perfil **PMO**, liga **Usuário ativo** e informa
o gestor imediato. Ela já entra vendo portfólio, programas, projetos, tarefas, riscos e relatórios, sem acesso ao
financeiro nem à administração de acessos.

> **Atenção:** o e-mail é único no sistema. Se a pessoa já teve uma conta desativada, reative o cadastro existente em
> vez de criar um novo — assim o histórico de tarefas, avaliações e alocações dela é preservado.

### Editar os dados de uma pessoa

Serve para manter o cadastro correto quando alguém muda de cargo, de área, de gestor ou de custo.

1. Na aba **Usuários**, localize a pessoa pela busca (**Buscar por nome, e-mail, cargo ou área...**) ou pelos filtros
   **Perfil**, **Área** e **Ativos/Inativos**.
2. Clique no ícone de edição da linha. O painel **Editar usuário** abre com os dados atuais.
3. Altere o que for necessário. Deixe **Senha** em branco para manter a senha atual — preencha apenas se for definir
   uma nova.
4. Clique em **Salvar alterações**.

**O que acontece depois:** a alteração fica registrada na trilha de auditoria com o valor anterior e o novo de cada
campo. Se você trocou o perfil de acesso, o menu da pessoa reflete a mudança no próximo acesso.

> **Atenção:** reduzir o perfil de alguém que está conectado só tem efeito na próxima verificação de sessão. Avise a
> pessoa antes de fazer a mudança para que ela não tenha a impressão de que o sistema "quebrou".

### Definir custo por hora, capacidade semanal e visibilidade do custo

Serve para que os cálculos de alocação, orçamento e demanda de pessoas usem números realistas.

1. Abra o cadastro da pessoa em **Editar usuário**.
2. Abra o bloco **Custo e capacidade**.
3. Preencha **Custo por hora (R$)** com o valor cheio da hora daquela pessoa.
4. Preencha **Capacidade semanal (horas)** com a disponibilidade real. O padrão é 40 horas; use menos para quem tem
   jornada reduzida ou parte da semana dedicada a outras frentes.
5. Decida sobre **Custo visível para todos**. Desligado, apenas administradores, RH e a própria pessoa veem o valor —
   na lista, os demais veem **restrito**.
6. Clique em **Salvar alterações**.

**O que acontece depois:** a capacidade semanal passa a alimentar a ocupação da equipe, a detecção de conflitos e a
projeção de demanda de pessoas. O custo por hora entra nos cálculos financeiros do projeto.

**Exemplo prático:** uma pessoa contratada para 30 horas semanais deve ter **Capacidade semanal (horas)** igual a 30.
Deixar 40 faria o sistema entendê-la como sobrecarregada em todos os meses.

> **Atenção:** valores de custo/hora são informação de RH. A tela mostra o aviso "Custo é dado sensível" — ampliar a
> visibilidade deve ser uma decisão consciente, porque toda alteração fica na trilha de auditoria.

### Ajustar as preferências iniciais de quem entra

Serve para deixar a experiência da pessoa adequada desde o primeiro acesso, sem depender de ela descobrir as
configurações sozinha.

1. Em **Editar usuário**, abra o bloco **Preferências do usuário**.
2. Escolha o **Tema**: **Seguir o sistema**, **Claro** ou **Escuro**.
3. Escolha a **Densidade**: **Compacta**, **Padrão** ou **Confortável**.
4. Defina o consentimento em **Aceita ser recomendado em alocações**. Desligado, a pessoa deixa de aparecer nas
   recomendações automáticas do motor de alocação.
5. Marque **Disponível para mentoria** se ela puder ser sugerida como mentor.
6. Em **Interesses**, digite um tema e clique em **Incluir** para adicioná-lo. Os interesses alimentam sugestões de
   desenvolvimento.
7. Clique em **Salvar alterações**.

**O que acontece depois:** as preferências de tema e densidade aparecem como padrão no primeiro acesso da pessoa, que
pode alterá-las depois em **Administração › Preferências**.

### Ativar e desativar uma pessoa

Serve para cortar o acesso imediatamente sem apagar o histórico — o caso típico de desligamento ou de afastamento.

1. Na aba **Usuários**, localize a pessoa.
2. Para desativar, clique no ícone de lixeira da linha ou desligue o interruptor da coluna **Ativo**.
3. Se você usou a lixeira, confirme em **Desativar usuário**. A tela avisa que a desativação é gravada na trilha com
   autor, data e endereço de rede.
4. Para reativar, ligue novamente o interruptor **Ativo** na linha da pessoa.

**O que acontece depois:** a pessoa desativada não consegue mais autenticar. Tudo o que ela fez continua no sistema:
tarefas, avaliações, alocações, comentários e registros de auditoria. O histórico permanece intacto para as análises.

> **Atenção:** desativar **não é** excluir. O SGP não apaga pessoas: apagar destruiria a trilha de auditoria e a
> memória dos projetos. Se a intenção é apenas impedir o acesso, desativar é a ação correta — e é reversível.

### Criar um papel sob medida

Serve para atender situações que os oito perfis padrão não cobrem — por exemplo, um auditor que só pode consultar ou um
coordenador que enxerga todo o portfólio sem tocar em capacidades.

1. Em **Administração › Usuários e papéis**, clique em **Novo papel**.
2. Preencha **Nome do papel** com algo que diga o que ele faz, como "Auditor externo".
3. Escreva uma **Descrição** curta. Ela aparece no card do papel e ajuda quem revisar os acessos depois.
4. Percorra os grupos de **Permissões** — Portfólio, Programas, Projetos, Tarefas, Recursos, Alocação, Financeiro,
   Riscos e issues, Capacidades, PDI e mentoria, Mentorias, Treinamentos, Timesheet, Dashboards, Relatórios,
   Auditoria, Privacidade, Administração e Workflows.
5. Marque as permissões desejadas. Use **marcar tudo** e **desmarcar tudo** dentro de um grupo para agilizar.
6. Clique em **Criar papel**.

**O que acontece depois:** o papel fica disponível para ser vinculado a pessoas. O contador **selecionadas** mostra
quantas permissões você marcou. Papéis de sistema aparecem com a etiqueta **sistema** e não podem ser excluídos.

> **Atenção:** papéis **somam**. Um papel nunca retira uma permissão que o perfil já concede. Para reduzir acesso, o
> caminho é trocar o **Perfil de acesso** da pessoa.

### Editar um papel e escolher permissões por recurso

Serve para ajustar um papel quando a necessidade da organização muda.

1. Localize o card do papel e clique em **Editar**.
2. Altere o nome, a descrição ou marque e desmarque permissões.
3. Clique em **Salvar papel**.

**O que acontece depois:** a mudança vale para todos os vínculos daquele papel. Quem estava vinculado ganha ou perde as
permissões na próxima verificação de sessão.

**Exemplo prático:** o papel "Auditor" tinha *projeto.ver*, *financeiro.ver* e *auditoria.ver*. Ao acrescentar
*relatorio.ver*, todos os auditores passam a poder abrir a área de relatórios sem que você toque em cada cadastro.

### Vincular um papel a uma pessoa e escolher o escopo

Serve para conceder a permissão extra a quem realmente precisa dela.

O vínculo é o que dá efeito ao papel: enquanto ninguém está vinculado, o papel existe mas não autoriza nada. Use
**Ver vínculos** no card do papel para conferir quem já está ligado a ele e com qual escopo. Ao criar um vínculo,
escolha o escopo adequado ao caso — **Global** quando a permissão vale para toda a organização, ou **Portfólio**,
**Programa**, **Projeto** e **Pessoal** quando a atuação é restrita a uma frente.

**O que acontece depois:** as permissões do papel entram no conjunto efetivo da pessoa, somadas às do perfil. Na aba
**Matriz de permissões**, o bloco **Permissões efetivas do seu usuário** mostra exatamente o conjunto que vale para
você naquele momento.

> **Atenção:** o escopo é **registrado** e serve à governança e à auditoria, mas nesta versão ele **não filtra
> registros automaticamente**. Quem tem *financeiro.ver* com escopo de um projeto específico continua vendo o
> financeiro dos outros projetos. Trate o escopo como documentação da intenção, não como cerca eletrônica.

### Excluir um papel

Serve para tirar de circulação um papel que não faz mais sentido.

1. No card do papel, clique no ícone de lixeira.
2. Leia o aviso: excluir o papel remove as permissões concedidas por ele **em todos os vínculos**.
3. Confirme em **Excluir papel**.

**O que acontece depois:** as pessoas que tinham o papel perdem as permissões extras e continuam com as do perfil. Papéis
marcados como **sistema** têm o botão desabilitado.

### Consultar a matriz de permissões e as suas permissões efetivas

Serve para responder, sem abrir chamado, "por que essa pessoa consegue fazer isso?".

1. Abra **Administração › Usuários e papéis** e vá à aba **Matriz de permissões**.
2. Os cartões do topo mostram, por perfil, quantas permissões ele concede sobre o total catalogado.
3. Na **Grade de permissões**, cada linha é uma permissão e cada coluna, um perfil. Um visto verde significa
   **concedida**; um X cinza, **não concedida**.
4. No fim da página, o bloco **Permissões efetivas do seu usuário** lista o seu conjunto real, incluindo o curinga
   quando aplicável.

**O que acontece depois:** nenhuma alteração é feita. Esta é uma tarefa de leitura, usada antes de conceder ou revisar
acessos.

### Criar um workflow

Serve para que o andamento do trabalho siga o processo da sua organização, e não um padrão genérico.

1. Abra **Administração › Workflows** e clique em **Novo workflow**.
2. Preencha **Nome** — por exemplo, "Fluxo de riscos".
3. Escolha a **Entidade**: **Tarefa**, **Projeto**, **Risco** ou **Issue**.
4. Escreva uma **Descrição** com o objetivo do fluxo.
5. Clique em **Criar workflow**.

**O que acontece depois:** o novo workflow é selecionado automaticamente e o canvas abre vazio, com o convite para
criar o primeiro estado. Cada workflow pertence a uma entidade.

### Criar os estados do fluxo

Serve para desenhar as etapas pelas quais um item passa.

1. Com o workflow selecionado, clique em **Novo estado**.
2. Preencha **Nome** — por exemplo, "Em homologação".
3. Preencha **Chave**, o identificador curto usado pelo board, sem espaços — por exemplo, *EM_HOMOLOGACAO*. A chave não
   pode repetir dentro do mesmo workflow.
4. Informe a **Ordem** e, se quiser limitar o trabalho em andamento, o **Limite de WIP** (0 significa sem limite).
   O limite aparece como etiqueta **WIP** no cabeçalho da coluna do board; sem limite, a coluna mostra **sem WIP**.
5. Escolha a **Cor** e o **Ícone**, usados no nó do canvas e na coluna do board.
6. Ligue **Estado inicial** se for o estado em que todo item novo nasce, ou **Estado final** se ele encerra o ciclo de
   vida do item.
7. Clique em **Salvar**.

**O que acontece depois:** o estado aparece no canvas e nas seções **Pré-visualização do board Kanban** e **Estados do
workflow**. Arraste o nó para posicioná-lo; a posição é salva automaticamente.

> **Atenção:** se nenhum estado estiver marcado como inicial, o sistema exibe o aviso "Nenhum estado inicial definido".
> Um workflow sem estado inicial não consegue receber itens novos. Sem estado final, os itens não têm como ser
> encerrados.

### Conectar estados e criar transições

Serve para definir quais caminhos são permitidos entre as etapas — por exemplo, de "Em análise" só se vai para
"Aprovado" ou "Rejeitado".

1. Clique em **Conectar estados**. O aviso **Modo conexão ativo** explica o funcionamento.
2. Clique no estado de origem e depois no estado de destino. A transição é criada imediatamente.
3. Para um controle mais fino, clique em **Nova transição** e preencha **Estado de origem**, **Estado de destino** e o
   **Rótulo da transição**, que aparece sobre a seta no canvas.
4. Ligue **Requer aprovação** quando a mudança só puder ser concluída após a aprovação de um responsável. As setas com
   aprovação aparecem tracejadas e em laranja.
5. Clique em **Salvar**.

**O que acontece depois:** as transições passam a valer para a entidade daquele workflow. A seção **Transições
configuradas** lista tudo o que foi criado, e cada linha pode ser editada ou excluída.

**Exemplo prático:** um fluxo de riscos pode ir de "Identificado" para "Em análise", de "Em análise" para "Mitigando" e
de "Mitigando" para "Encerrado" — com **Requer aprovação** ligado apenas na passagem para "Encerrado".

### Pré-visualizar o board Kanban

Serve para conferir, antes de publicar o fluxo, como as colunas vão aparecer para a equipe.

1. Na seção **Pré-visualização do board Kanban**, observe cada coluna com o nome, a cor, o ícone e o limite de WIP.
2. Confira as etiquetas **inicial** e **final** nas colunas correspondentes.
3. Se algo estiver fora de ordem, ajuste a **Ordem** nos estados e salve. Use **Organizar grade** para alinhar os nós
   do canvas quando o desenho estiver confuso.

**O que acontece depois:** o board real do módulo de tarefas passa a refletir a mesma configuração.

### Excluir estados, transições ou o workflow inteiro

Serve para limpar um desenho que não será mais usado.

1. No nó, na lista de transições ou no cabeçalho do workflow, clique no ícone de lixeira.
2. Leia o aviso **Efeito em cascata**: excluir um workflow remove todos os seus estados e transições; excluir um estado
   remove também as transições que partem ou chegam nele.
3. Clique em **Excluir**.

**O que acontece depois:** a ação é registrada na trilha de auditoria. Itens que estavam em um estado excluído precisam
ser reencaixados no fluxo.

> **Atenção:** não existe "desfazer" para exclusão de workflow. Se a intenção é apenas aposentar um fluxo, mantenha-o
> cadastrado e crie outro para os itens novos — o histórico dos itens antigos continua legível.

### Criar um campo personalizado

Serve para guardar uma informação que o SGP não traz de fábrica, como centro de custo, número de contrato ou unidade
solicitante.

1. Abra **Administração › Campos customizados**.
2. No topo, escolha a **Entidade**: **Projeto**, **Tarefa** ou **Risco**. O seletor mostra ao lado do nome o
   identificador interno da entidade, que ajuda quem dá suporte.
3. Clique em **Novo campo**.
4. Preencha **Nome exibido** — o rótulo que aparecerá no formulário — e a **Chave técnica**, sem espaços e única
   dentro da entidade.
5. Escolha o **Tipo**: **Texto**, **Número**, **Data**, **Seleção**, **Sim/Não**, **Moeda** ou **Pessoa**.
6. Se o tipo for **Seleção**, cadastre as **Opções da seleção**, pressionando Enter para adicionar cada uma.
7. Defina a **Seção do formulário**, a **Ordem** dentro da seção e a **Largura na grade (1 a 12 colunas)**.
8. Informe, se quiser, **Valor padrão** e **Texto de ajuda** — a explicação que aparece abaixo do campo.
9. Ligue **Preenchimento obrigatório** se o registro não puder ser salvo sem esse valor.
10. Deixe **Campo ativo** ligado e clique em **Criar campo**.

**O que acontece depois:** o campo passa a aparecer no formulário da entidade, na seção escolhida, respeitando a largura
configurada. O schema da entidade é atualizado e passa a devolvê-lo entre os campos ativos.

> **Atenção:** a chave técnica é o que liga o campo ao valor gravado. Renomeá-la depois de haver dados preenchidos faz
> o sistema perder a ligação com os valores antigos. Se precisar mudar o rótulo, altere apenas o **Nome exibido**.

### Montar o formulário por arrastar e soltar

Serve para organizar a ordem em que as informações aparecem para quem preenche.

1. Vá à aba **Editor visual**. Os campos aparecem agrupados por seção, em uma grade de 12 colunas.
2. Arraste um campo pelo ícone de alça para reordená-lo dentro da seção.
3. Confira, no cabeçalho de cada seção, o total de colunas usadas e a estimativa de linhas.
4. A nova ordem é gravada automaticamente.

**O que acontece depois:** a ordem vale para todos os formulários daquela entidade. Campos obrigatórios aparecem com um
asterisco e campos desativados recebem a etiqueta **inativo**.

> **Atenção:** a largura não é ajustada pelo arraste — ela vem do cadastro do campo (1 a 12 colunas). Se um campo ocupa
> a linha inteira, reduza a **Largura na grade** no painel **Editar campo**.

### Conferir o schema da entidade

Serve para responder com precisão o que existe hoje no formulário de uma entidade.

1. Vá à aba **Schema**. O sistema consulta a entidade selecionada e devolve os campos ativos e as seções.
2. No painel **JSON do schema** está a descrição completa; no painel **Pré-visualização do formulário**, o formulário
   como ele fica de verdade, seção por seção.

**O que acontece depois:** nenhuma alteração é feita. Apenas campos com **Campo ativo** ligado entram no schema.

### Ajustar as notificações que você recebe

Serve para decidir por qual canal cada tipo de aviso chega até você — e para silenciar o que não é relevante.

As regras de notificação são mantidas pelo administrador do SGP e dizem **qual evento** gera aviso, com **qual nível** e
para **quais destinatários**. O que cada pessoa controla é o canal de entrega.

1. Abra **Administração › Preferências** e localize o bloco **Notificações**.
2. Cada linha mostra o nome da regra, o evento que a dispara e o nível (**INFO**, **SUCESSO**, **ALERTA** ou
   **CRITICO**).
3. Clique nos canais que você quer receber: **No aplicativo**, **E-mail**, **Microsoft Teams**, **Slack** ou
   **Push no navegador**.
4. Use o interruptor da regra para desligá-la quando não quiser mais recebê-la.
5. As alterações são gravadas automaticamente.

**O que acontece depois:** a notificação no aplicativo é criada sempre; o e-mail é enviado quando o canal **E-mail**
está marcado em alguma regra aplicável ao evento.

> **Atenção:** nesta versão não existe uma tela visual para **criar** regras de notificação. As regras existentes
> aparecem em **Preferências** para ajuste de canais; criar uma regra nova depende do administrador do SGP.

### Emitir uma credencial de API

Serve para que outro sistema — um painel de BI, um script de carga, uma automação interna — consulte o SGP sem usar a
senha de uma pessoa.

1. Abra **Administração › Integrações**. Na **Central de integrações**, as credenciais ficam na seção **Credenciais de
   API**; na tela **API pública e webhooks**, na aba **Tokens de API**.
2. Clique em **Nova credencial** (ou **Novo token**).
3. Preencha **Nome** identificando o sistema e a finalidade — por exemplo, "Painel executivo no Power BI".
4. Marque os **Escopos** necessários, agrupados por recurso. Marque o mínimo indispensável.
5. Informe **IP permitido** se o sistema de destino tiver endereço fixo. Em branco, qualquer origem é aceita.
6. Informe **Expira em** para dar prazo de validade à credencial.
7. Confirme **Credencial ativa** e clique para gerar.
8. Copie o valor exibido e guarde-o em um cofre de segredos.

**O que acontece depois:** a credencial aparece na lista, inicialmente mascarada, com as ações **Revelar token** e
**Copiar token**. A partir daí, o sistema de destino pode consultar o SGP nos limites dos escopos concedidos. O campo
**Chamadas** conta quantas vezes a credencial foi usada.

> **Atenção:** o valor do token é exibido **apenas uma vez**, no momento da criação. Depois de fechar a janela ele não
> é mostrado novamente na íntegra — se perder o valor, revogue a credencial e emita outra. Nunca deixe um token em
> código-fonte, planilha compartilhada ou mensagem de chat: use variáveis de ambiente ou cofre de segredos.

Para **suspender** temporariamente um sistema, desligue **Credencial ativa** na linha: o acesso para sem que o token seja
perdido. Para **revogar** de vez, clique no ícone de lixeira da linha, leia o aviso de que o acesso é interrompido
imediatamente e confirme em **Revogar credencial** — a operação fica na trilha de auditoria com autor, data e IP.

### Configurar um webhook

Serve para avisar outro sistema, em tempo real, quando algo acontece no SGP — por exemplo, publicar toda tarefa
concluída no canal do time.

1. Abra **Administração › Integrações** e vá à seção **Webhooks configurados** (ou à tela **API pública e webhooks**,
   aba **Webhooks**).
2. Clique em **Novo webhook**.
3. Preencha **Nome** e a **URL de destino**, que deve ser um endereço seguro que aceite requisições de entrada.
4. Preencha o **Segredo de assinatura**, a chave combinada com quem vai receber as chamadas.
5. Marque os **Eventos assinados** que devem ser entregues. Sem nenhum evento marcado, o webhook recebe **todos os
   eventos**.
6. Confirme **Webhook ativo** e salve.

**O que acontece depois:** cada evento assinado passa a ser entregue ao endereço, com a assinatura no cabeçalho e o
registro de cada tentativa. O detalhamento de eventos, tentativas e assinatura está em
[Integrações e análises preditivas](../docs/13-integracoes-e-analytics.md).

### Consultar a trilha de auditoria

Serve para investigar o que aconteceu com um registro, quem alterou um valor e quando.

1. Abra **Administração › Auditoria**. O aviso do topo reforça que os registros são imutáveis e retidos por no mínimo
   cinco anos.
2. Use os filtros: **Buscar por usuário, entidade ou justificativa...**, **Todas as entidades**, **Todas as ações** e
   **Todos os usuários**.
3. Observe os gráficos **Distribuição por ação**, **Entidades mais auditadas** e **Volume por usuário**.
4. Percorra a tabela com as colunas **Data/hora**, **Usuário**, **Ação**, **Entidade**, **ID**, **IP** e
   **Justificativa**.
5. Use **Anterior** e **Próxima** para navegar entre as páginas.

**O que acontece depois:** nenhuma alteração é feita. A consulta em si não gera um registro de auditoria; a
**exportação** gera.

### Abrir o comparativo antes × depois

Serve para ver exatamente qual campo mudou e de qual valor para qual valor.

1. Clique em qualquer linha da tabela. O painel **Detalhe do registro** abre à direita.
2. No topo, confira a ação, a data e hora, o autor e o endereço de rede.
3. Leia a **Justificativa** informada quando a operação foi realizada.
4. No bloco **Comparativo antes × depois**, cada campo aparece com o valor **Antes** e o valor **Depois**, marcado como
   *adicionado*, *removido*, *alterado* ou *igual*.
5. Se precisar do dado completo, abra a seção **Payload bruto** para ver os valores anteriores e novos na íntegra.

**O que acontece depois:** eventos sem alteração de campos — como login e logout — mostram o aviso "Sem alterações de
campos", o que é esperado.

### Exportar a trilha

Serve para levar o recorte para uma planilha, um parecer ou uma auditoria externa.

1. Aplique os filtros desejados.
2. Clique em **Exportar CSV**. A exportação respeita exatamente os filtros da tela.
3. Guarde o arquivo com o cuidado devido: ele contém dados pessoais e de acesso.

**O que acontece depois:** a exportação gera um registro de **Exportação** na própria trilha, com autor e filtros
utilizados. O botão **Política de retenção** abre o resumo das regras de guarda, das operações registradas, dos dados
capturados e do acesso permitido.

## Campos e o que significam

### Cadastro de usuário

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Nome completo** | Nome da pessoa como aparecerá no sistema | Nome e sobrenome; as iniciais do avatar são geradas a partir dele | Sim |
| **E-mail** | Identificação de acesso | E-mail corporativo válido, único no sistema | Sim |
| **Senha** | Senha de entrada | Mínimo de 6 caracteres; em branco na edição mantém a atual | Sim no cadastro |
| **Cargo** | Função na organização | Texto livre, como "Analista de PMO Sênior" | Não |
| **Área** | Área a que a pessoa pertence | Texto livre, com sugestão das áreas já cadastradas | Não |
| **Localização** e **Fuso horário** | Cidade ou unidade de trabalho e o fuso dos horários exibidos | Texto livre; o fuso padrão é *America/Sao_Paulo* | Não |
| **Perfil de acesso** | O perfil funcional que define menu e ações | Uma das oito opções | Sim |
| **Gestor imediato** e **Data de admissão** | A quem a pessoa se reporta e quando entrou na organização | Selecione a pessoa ou **Sem gestor**; a data alimenta o tempo de casa | Não |
| **Idioma** | Idioma da interface | Português (Brasil), English (US) ou Español | Não |
| **Usuário ativo** | Se a pessoa pode autenticar | Ligado por padrão; desligado, ela não entra | Não |
| **Acesso ao Django admin** | Acesso à área administrativa técnica | Deixe desligado, salvo para contas técnicas nominadas | Não |
| **Custo por hora (R$)** | Valor da hora da pessoa | Número decimal; padrão 0 | Não |
| **Capacidade semanal (horas)** | Disponibilidade semanal | Número de horas; padrão 40 | Não |
| **Custo visível para todos** | Se o custo aparece para qualquer pessoa | Desligado restringe a administradores, RH e a própria pessoa | Não |
| **Tema** e **Densidade** | Modo de cor e espaçamento da interface | **Seguir o sistema**, **Claro** ou **Escuro**; **Compacta**, **Padrão** ou **Confortável** | Não |
| **Aceita ser recomendado em alocações** | Consentimento para entrar nas recomendações automáticas | Ligado por padrão; desligado retira a pessoa das sugestões | Não |
| **Disponível para mentoria** | Se pode ser sugerida como mentor | Desligado por padrão | Não |
| **Interesses** | Temas de desenvolvimento | Digite e clique em **Incluir**; remova clicando no chip | Não |

### Papel

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Nome do papel** | Como o papel aparece nos cards | Único no sistema; use um nome que descreva a finalidade | Sim |
| **Descrição** | Explicação curta do papel | Uma frase objetiva | Não |
| **Permissões** | Lista de permissões marcadas | Marque por grupo de recurso | Não |
| **Vínculo** | Ligação entre pessoa e papel | Criado ao vincular o papel a alguém | Não |

### Workflow, estado e transição

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Nome** (workflow) | Nome do fluxo | Texto livre, como "Fluxo de riscos" | Sim |
| **Entidade** (workflow) | A que tipo de registro o fluxo se aplica | **Tarefa**, **Projeto**, **Risco** ou **Issue** | Não |
| **Descrição** (workflow) | Objetivo do fluxo | Texto livre | Não |
| **Nome** (estado) | Nome da etapa | Texto livre, como "Em homologação" | Sim |
| **Chave** (estado) | Identificador curto usado pelo board | Sem espaços; único dentro do workflow | Sim |
| **Ordem** (estado) | Posição na sequência | Número inteiro | Não |
| **Limite de WIP** | Máximo de itens no estado | Número inteiro; 0 significa sem limite | Não |
| **Cor** | Cor do nó no canvas e da coluna no board | Escolha na paleta | Não |
| **Ícone** | Ícone exibido no nó e na coluna | Escolha na lista | Não |
| **Estado inicial** | Se é o estado de entrada | Ligue em exatamente um estado por fluxo | Não |
| **Estado final** | Se encerra o ciclo de vida | Ligue em pelo menos um estado | Não |
| **Estado de origem** | De onde a transição parte | Seleção entre os estados do workflow | Sim |
| **Estado de destino** | Para onde a transição leva | Seleção entre os estados do workflow | Sim |
| **Rótulo da transição** | Texto exibido sobre a seta | Texto curto, como "Enviar para revisão" | Não |
| **Requer aprovação** | Se a mudança precisa de aprovação | Ligue quando houver alçada | Não |

### Campo personalizado

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Entidade** | A que registro o campo pertence | Projeto, Tarefa ou Risco | Sim |
| **Tipo** | A natureza do dado | Texto, Número, Data, Seleção, Sim/Não, Moeda ou Pessoa | Sim |
| **Nome exibido** | O rótulo mostrado no formulário | Texto livre, como "Centro de custo" | Sim |
| **Chave técnica** | O identificador do campo | Sem espaços; única por entidade | Sim |
| **Seção do formulário** | Onde o campo aparece | Texto livre; o padrão é "Geral" | Não |
| **Ordem** | Posição dentro da seção | Número inteiro | Não |
| **Largura na grade (1 a 12 colunas)** | Quanto da linha o campo ocupa | De 1 a 12; 6 corresponde a meia linha | Não |
| **Opções da seleção** | Valores possíveis de um campo de Seleção | Pressione Enter após cada opção | Só para Seleção |
| **Valor padrão** | Valor pré-preenchido | Texto livre | Não |
| **Texto de ajuda** | Explicação exibida abaixo do campo | Uma frase curta | Não |
| **Preenchimento obrigatório** | Se bloqueia o salvamento sem o campo | Ligue quando o dado for indispensável | Não |
| **Campo ativo** | Se aparece no formulário e no schema | Desligado, o campo deixa de ser exibido | Não |

### Credencial de API e webhook

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Nome** | Identificação da credencial ou do webhook | Cite o sistema e a finalidade | Sim |
| **Escopos** | Operações autorizadas na credencial | Marque o mínimo necessário, por recurso | Não |
| **IP permitido** | Origem autorizada a usar a credencial | Endereço de rede; em branco aceita qualquer origem | Não |
| **Expira em** | Data em que a credencial deixa de valer | Formato de data; em branco cria sem expiração | Não |
| **Credencial ativa** | Se a credencial autentica | Desligue para suspender sem revogar | Não |
| **URL de destino** | Endereço que recebe os eventos | Endereço seguro que aceite requisições de entrada | Sim |
| **Segredo de assinatura** | Chave combinada para validar a origem | Texto secreto, guardado dos dois lados | Não |
| **Eventos assinados** | Quais eventos são entregues | Marque os eventos desejados; nenhum marcado significa todos | Não |
| **Webhook ativo** | Se o webhook recebe entregas | Desligado, ele para de receber | Não |

## Regras de negócio

### Como as permissões são decididas

O conjunto efetivo de permissões de uma pessoa é montado em três passos. Primeiro entra o que o **perfil** concede.
Depois somam-se as permissões de todos os **papéis vinculados**, independentemente do escopo registrado. Por fim, se a
pessoa for administradora, ela recebe o **curinga**, que concede tudo. Nada é subtraído em nenhum passo: perfil e papéis
apenas acrescentam.

O sistema verifica duas coisas ao abrir uma tela ou executar uma ação: uma permissão de **leitura** e uma permissão de
**gravação**. Qualquer operação que consulte dados usa a permissão de leitura; qualquer operação que crie, altere ou
exclua usa a permissão de gravação.

### O que cada permissão significa

**Portfólio, programas e projetos**

| Permissão | O que autoriza |
|---|---|
| *portfolio.ver* | Consultar portfólios e seus indicadores |
| *portfolio.criar* | Cadastrar um novo portfólio |
| *portfolio.editar* | Alterar dados de um portfólio |
| *programa.ver* | Consultar programas |
| *programa.criar* | Cadastrar um novo programa |
| *programa.editar* | Alterar dados de um programa |
| *projeto.ver* | Consultar projetos, cronogramas e marcos |
| *projeto.criar* | Cadastrar novos projetos |
| *projeto.editar* | Alterar projetos, cronogramas, marcos, comentários e previsões |
| *projeto.excluir* | Excluir projetos |

**Execução, recursos e alocação**

| Permissão | O que autoriza |
|---|---|
| *tarefa.ver* | Consultar tarefas, board, calendário e cronograma |
| *tarefa.criar* | Criar tarefas |
| *tarefa.editar* | Alterar tarefas, mover no board e apontar horas |
| *tarefa.excluir* | Excluir tarefas |
| *recurso.ver* | Consultar o cadastro de recursos |
| *recurso.criar* | Cadastrar recursos |
| *recurso.editar* | Alterar recursos |
| *alocacao.ver* | Consultar alocações, ocupação e conflitos |
| *alocacao.criar* | Criar alocações e aceitar recomendações do motor |
| *alocacao.editar* | Alterar alocações existentes |
| *timesheet.editar* | Apontar horas no timesheet |

**Financeiro, riscos e issues**

| Permissão | O que autoriza |
|---|---|
| *financeiro.ver* | Consultar orçamento, lançamentos, EVM e curva S |
| *financeiro.editar* | Lançar e alterar valores, orçamentos e linhas de base financeiras |
| *risco.ver* | Consultar riscos, matriz e issues |
| *risco.criar* | Registrar riscos e issues |
| *risco.editar* | Alterar riscos, planos de resposta e issues |
| *risco.excluir* | Excluir riscos e issues |

**Capacidades, desenvolvimento e pessoas**

| Permissão | O que autoriza |
|---|---|
| *capacidade.ver* | Consultar o catálogo, a matriz de skills, o gap e as pessoas |
| *capacidade.criar* | Criar capacidades e perfis no catálogo |
| *capacidade.editar* | Alterar capacidades, perfis e evidências |
| *capacidade.avaliar* | Registrar avaliações de nível de proficiência |
| *capacidade.autoavaliar* | Registrar a própria autoavaliação |
| *capacidade.validar* | Validar níveis e evidências apresentadas |
| *capacidade.endossar* | Endossar a capacidade de outra pessoa |
| *pdi.ver* | Consultar planos de desenvolvimento individuais |
| *pdi.editar* | Criar e alterar planos de desenvolvimento |
| *mentoria.editar* | Registrar e alterar mentorias |
| *treinamento.editar* | Registrar e alterar treinamentos |
| *privacidade.editar* | Administrar as configurações de privacidade das capacidades |

**Informação, governança e plataforma**

| Permissão | O que autoriza |
|---|---|
| *dashboard.ver* | Consultar dashboards, indicadores e análises |
| *relatorio.ver* | Consultar relatórios |
| *relatorio.criar* | Criar e editar relatórios customizados |
| *auditoria.ver* | Consultar a trilha de auditoria e executar a auditoria de viés |
| *admin.ver* | Acessar a administração: usuários, papéis, campos, integrações e credenciais |
| *workflow.editar* | Criar e alterar workflows, estados e transições |

### A matriz de permissões por perfil

| Perfil | O que pode fazer no SGP |
|---|---|
| **Administrador** | Tudo. Recebe o curinga, que concede todas as permissões do sistema, incluindo administração, auditoria e edição de workflows. |
| **Executivo (C-Level)** | Consulta portfólio, programas, projetos, tarefas, recursos, alocação, financeiro, riscos, capacidades, dashboards, relatórios e auditoria. Não altera nada. |
| **PMO** | Praticamente toda a operação: cria e edita portfólio, programas, projetos, tarefas, recursos, alocação, riscos e capacidades; edita o financeiro; cria relatórios; acessa a administração e edita workflows; consulta a auditoria. Não exclui projetos por permissão própria. |
| **Gerente de Projetos** | Cria e edita projetos, tarefas, recursos, alocação, riscos e o financeiro; avalia e valida capacidades; consulta portfólio, programas, relatórios e dashboards; mantém PDIs. Não acessa administração nem auditoria. |
| **Líder Técnico** | Consulta projetos; cria e edita tarefas e riscos; cria alocações; avalia e endossa capacidades; mantém PDIs e mentorias. Não acessa financeiro, administração nem auditoria. |
| **Membro de Equipe** | Consulta projetos, tarefas, capacidades e dashboards; edita tarefas; registra a própria autoavaliação e endossa colegas; mantém o próprio PDI e o timesheet. |
| **RH / DHO** | Mantém o catálogo de capacidades, avalia, valida e endossa; administra PDIs, mentorias e treinamentos; cria relatórios; consulta pessoas, projetos e recursos; acessa a auditoria e a privacidade das capacidades. Não acessa o financeiro. |
| **Stakeholder** | Consulta projetos, tarefas, riscos, dashboards e relatórios. É o perfil de leitura mais restrito. |

### Limitações reais da verificação de permissões

- **A gravação é verificada uma única vez por módulo.** O sistema pede uma permissão de escrita por tela. Na prática,
  quem tem a permissão de edição de um módulo também consegue **criar** e **excluir** registros daquele módulo. Os
  códigos de criação e de exclusão aparecem na matriz por completude, mas não são avaliados separadamente.
- **O escopo não filtra registros.** O escopo do vínculo é registrado e aparece na auditoria, mas não recorta
  automaticamente o que a pessoa vê. A autorização efetiva é o conjunto de permissões.
- **Não há controle campo a campo.** A permissão é por módulo e por tipo de operação, não por campo do formulário.
- **Não há autoatendimento de senha.** Não existe "esqueci minha senha": a redefinição é feita pelo administrador no
  cadastro da pessoa.
- **Não há verificação em duas etapas nem login único corporativo.** Estão previstos no roteiro e ainda não estão
  disponíveis nesta versão.

### Desativar, excluir e o que fica no histórico

A ação de excluir um usuário pela interface **não apaga** a pessoa: ela marca o cadastro como inativo e registra a
operação na trilha. Essa escolha é deliberada — apagar a pessoa destruiria a memória dos projetos e a própria trilha de
auditoria. O mesmo raciocínio vale para a exclusão de um papel: o papel sai de circulação e as permissões que ele
concedia deixam de valer em todos os vínculos, mas os registros históricos permanecem.

### Workflows: o que o sistema valida

- Cada workflow pertence a uma entidade e pode ter quantos estados você quiser. A **chave** do estado não pode repetir
  dentro do mesmo workflow.
- A transição é única por par origem-destino: não existem dois caminhos iguais entre os mesmos estados.
- Quando um estado é excluído, as transições que partem ou chegam nele também são removidas.
- O sistema avisa quando não há **estado inicial** e quando não há **estado final** — os dois avisos aparecem no rodapé
  da tela de workflows.
- A posição dos nós no canvas é gravada automaticamente, então o desenho é o mesmo para quem abrir a tela depois.

### Campos personalizados: como o formulário é montado

O formulário de uma entidade é montado a partir do schema daquela entidade. Entram apenas os campos com **Campo ativo**
ligado. Cada campo declara o tipo, a seção, a ordem e a largura em uma grade de 12 colunas. Campos de **Seleção** usam a
lista de opções cadastrada; campos de **Moeda** e de **Pessoa** têm apresentação própria. Os valores informados ficam
guardados por registro, o que permite manter o histórico mesmo se o campo for desativado depois.

### Notificações: como a decisão é tomada

Quando acontece um evento que tem regra de notificação ativa, o sistema segue três passos. Primeiro cria a notificação
no aplicativo para os destinatários da regra. Depois verifica se alguma regra aplicável pede o canal **E-mail** — se
pedir, dispara a mensagem. Por fim, os canais **Microsoft Teams**, **Slack** e **Push no navegador** ficam registrados
na regra como destino pretendido; a entrega nesses canais depende de um webhook ou de uma integração configurada em
**Administração › Integrações**.

O nível da regra define a cor e a prioridade visual do aviso: **Informativo**, **Sucesso**, **Alerta** ou **Crítico**.

## Como ler os indicadores

### Aba Usuários

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Usuários listados** | Quantidade de contas no filtro atual | Serve para dimensionar a base analisada | Coerente com o quadro da organização |
| **Ativos** | Contas que conseguem entrar | O subtítulo mostra quantos estão inativos | Zero contas ativas de ex-colaboradores |
| **Mentores** | Pessoas marcadas como disponíveis para mentoria | Base para as trilhas de desenvolvimento | Crescente, cobrindo as capacidades críticas |
| **Acesso ao admin** | Contas com acesso à área administrativa técnica | Cada conta aqui é um risco a mais | Mínimo indispensável, sempre nominado |
| **Áreas** | Quantas áreas distintas aparecem nos cadastros | Muitas áreas com poucas pessoas indicam cadastro fragmentado | Alinhada ao organograma |
| **Papéis** | Quantos papéis existem além dos oito perfis | Papéis demais indicam governança confusa | Poucos, com nomes claros |

### Aba Matriz de permissões

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Permissões por perfil** | Quantas permissões cada perfil concede sobre o total catalogado | Compara a amplitude dos perfis; a curva deve ser crescente do Stakeholder ao Administrador | Sem curinga fora de contas administrativas |

### Tela de campos customizados

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Campos da entidade** | Quantos campos existem para a entidade selecionada | Muitos campos tornam o formulário pesado | O necessário para o negócio |
| **Ativos** | Campos que aparecem no formulário | Campos inativos são histórico, não erro | A maior parte ativa |
| **Obrigatórios** | Campos que bloqueiam o salvamento | Obrigatoriedade em excesso trava o cadastro | Poucos e realmente indispensáveis |
| **Seções** e **Seleções** | Agrupamentos do formulário e campos de lista | Muitas seções dispersam a atenção; listas padronizam os dados | De 2 a 5 seções bem nomeadas |

### Tela de auditoria

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Registros no filtro** | Volume de eventos no recorte aplicado | Base para as demais leituras | Estável ao longo do tempo |
| **Criações** | Quantos registros foram criados | Picos acompanham ciclos de planejamento | Coerente com a operação |
| **Exclusões** | Quantos registros foram excluídos | Picos de exclusão merecem investigação | Baixo e justificado |
| **Logins** | Quantos acessos ocorreram | Ajuda a detectar acessos fora de horário | Coerente com a jornada |
| **Entidades distintas** | Quantos tipos de registro foram afetados | Mostra a abrangência da atividade | Amplo em operações normais |
| **Usuários ativos na trilha** | Quantas pessoas diferentes aparecem | Concentração em poucos nomes pode indicar acúmulo de funções | Distribuído pela equipe |

### Central de integrações

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Integrações** | Quantas conexões existem | Base do painel | Coerente com o parque de sistemas |
| **Com erro** | Conexões que falharam na última execução | Exigem correção antes de qualquer conclusão | Zero |
| **Em simulação** | Conexões que não chamam o sistema externo | É o estado esperado ao validar uma configuração | Alto durante a implantação, zero depois |
| **Itens sincronizados** | Total de registros criados e atualizados | Mede o volume efetivamente trocado | Crescente e compatível com a operação |
| **Taxa de sucesso média** | Média das taxas de sucesso das conexões | Abaixo de 90% pede investigação | Acima de 95% |
| **Eventos pendentes** | Eventos aguardando entrega aos webhooks | Fila crescendo indica destino indisponível | Próximo de zero |
| **Entregas de webhook** | Tentativas registradas, com sucessos e falhas | Falhas recorrentes apontam problema no receptor | Predominância de sucessos |

## Boas práticas

1. **Comece pelo perfil, não pelo papel.** Os oito perfis cobrem a maior parte dos casos. Crie um papel apenas quando
   houver uma necessidade concreta e registrada — papéis em excesso tornam a revisão de acessos impossível.
2. **Revise acessos a cada trimestre.** Percorra a lista de usuários e confirme quem ainda está na empresa, quem mudou
   de função e quem acumulou permissões que já não fazem sentido.
3. **Trate as contas com acesso administrativo como exceção.** Elas devem ser poucas, nominadas e conhecidas.
   Compartilhar uma conta administrativa destrói o valor da trilha de auditoria.
4. **Padronize a chave dos campos personalizados antes de criar.** Combine uma convenção — minúsculas, sem acento, com
   sublinhado — para que ninguém precise adivinhar o nome de um campo seis meses depois.
5. **Obrigue apenas o indispensável.** Cada campo marcado como **Preenchimento obrigatório** é um obstáculo a mais
   para quem cadastra no meio de uma reunião.
6. **Desenhe o workflow antes de abrir o canvas.** Rascunhe os estados em uma folha: isso evita criar e excluir estados
   repetidamente e deixa o fluxo mais simples para a equipe.
7. **Use o limite de WIP com moderação.** Comece com limites generosos e aperte conforme o time ganha ritmo; limites
   apertados demais param a operação.
8. **Emita credenciais com escopo mínimo e prazo de validade.** Uma credencial que pode tudo e nunca expira é o caminho
   mais curto para um incidente de segurança.
9. **Antes de desativar alguém, reatribua o trabalho aberto.** Verifique tarefas em andamento, alocações futuras e
   aprovações pendentes para que nada fique órfão.

## Perguntas frequentes

**1. Desativei uma pessoa. O histórico dela some?**
Não. Desativar apenas impede o acesso. Tarefas, avaliações, alocações, comentários e registros de auditoria continuam
no sistema — é isso que mantém a memória dos projetos e a consistência dos indicadores históricos.

**2. Consigo excluir uma pessoa definitivamente?**
Pela interface, não. A ação de excluir desativa o cadastro. Essa é uma proteção deliberada: apagar uma pessoa
destruiria a trilha de auditoria e o histórico de alocações.

**3. Por que a pessoa continua vendo uma tela depois que eu tirei a permissão?**
As permissões são verificadas a cada operação. Se ela já estava com a tela aberta, a mudança vale na próxima
verificação de sessão. Peça que ela recarregue a página.

**4. Um papel pode retirar uma permissão que o perfil concede?**
Não. Papéis apenas somam. Para reduzir acesso, troque o **Perfil de acesso** da pessoa.

**5. A pessoa pode trocar a própria senha?**
Não há autoatendimento de senha nesta versão. A redefinição é feita pelo administrador no cadastro, preenchendo o campo
**Senha** e salvando.

**6. Criei um campo personalizado e ele não aparece no formulário. O que houve?**
Verifique se **Campo ativo** está ligado e se você selecionou a entidade correta no topo da tela. Campos inativos não
aparecem no formulário nem no schema.

**7. Posso mudar a chave técnica de um campo que já tem valores preenchidos?**
Não é recomendável. A chave liga o campo aos valores gravados; renomeá-la faz o sistema perder a ligação com o que já
foi preenchido. Altere apenas o **Nome exibido**.

**8. O que acontece se eu excluir um workflow em uso?**
Todos os estados e transições dele são removidos, e os itens que estavam nesses estados ficam sem etapa
correspondente. Se a intenção é apenas aposentar o fluxo, mantenha-o cadastrado e crie outro para os itens novos.

**9. Por que o webhook não recebeu nada depois que eu o criei?**
Confira se ele está **ativo**, se os eventos assinados incluem o que aconteceu e se o endereço respondeu com sucesso.
Sem nenhum evento marcado, o webhook recebe todos os eventos — o que costuma gerar volume maior do que o esperado.

**10. Quem consegue ver o custo por hora das pessoas?**
A própria pessoa, as contas com **Custo visível para todos** ligado e, por padrão, os perfis Administrador, PMO,
Gerente de Projetos, Executivo e RH. Para os demais, o valor aparece como **restrito**.

**11. Consigo recuperar uma credencial de API que perdi?**
Não. O valor é exibido apenas no momento da criação. Revogue a credencial perdida e emita outra — assim você também
elimina o risco de o token antigo continuar circulando.

## O que este módulo não faz

- **Não tem autoatendimento de senha.** Não existe fluxo de "esqueci minha senha"; a redefinição passa pelo
  administrador.
- **Não tem verificação em duas etapas nem login único corporativo (SSO).** Estão previstos no roteiro de segurança e
  ainda não estão disponíveis nesta versão.
- **Não separa criação, edição e exclusão.** A verificação de gravação é única por módulo: quem edita também cria e
  exclui. Os códigos de criação e exclusão existem na matriz, mas não bloqueiam nada por si sós.
- **Não usa o escopo para filtrar registros.** O escopo do papel é registrado para governança e auditoria, mas não
  recorta automaticamente o que a pessoa vê.
- **Não controla permissão campo a campo.** O controle é por módulo e por tipo de operação.
- **Não permite excluir registros de auditoria.** A trilha é imutável, inclusive para o Administrador.
- **Não tem editor visual de regras de notificação.** As regras existentes aparecem em **Preferências** para ajuste de
  canais; criar regras novas depende do administrador do SGP.
- **Não entrega notificações em Teams, Slack e push por conta própria.** Esses canais dependem de um webhook ou de uma
  integração configurada.
- **Não executa integrações que exigem credenciais de terceiros.** Nesta entrega, essas conexões operam em modo
  simulação: registram o que seria enviado, sem chamar o sistema externo.
- **Não tem edição colaborativa em tempo real.** Dois administradores editando o mesmo workflow ao mesmo tempo podem
  sobrescrever a posição dos nós um do outro.
- **Não agenda o envio de relatórios.** O agendamento de um relatório é persistido, mas o envio é sob demanda.
- **Não substitui a avaliação jurídica de conformidade.** O sistema oferece rastreabilidade e controles; a adequação à
  LGPD depende também de processos, contratos e políticas da organização.

## Veja também

- [Visão geral e primeiros passos](../docs/01-visao-geral-e-primeiros-passos.md) — login, navegação, busca global,
  notificações, temas e densidade.
- [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — a matriz de permissões, os escopos,
  a privacidade das capacidades, a LGPD e a trilha de auditoria em detalhe.
- [Integrações e análises preditivas](../docs/13-integracoes-e-analytics.md) — conectores, mapeamento de campos, modo
  simulação, eventos, webhooks, exportações prontas e previsões.
- [Colaboração e notificações](../docs/10-colaboracao-e-notificacoes.md) — comentários, menções, chat por projeto,
  histórico de atividades e as regras de notificação.
- [Tarefas e execução](../docs/04-tarefas-e-execucao.md) — como os workflows e os campos personalizados aparecem no
  dia a dia da equipe.
- [Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais e problemas comuns.

# Perfis, permissões e segurança

## Em uma frase

Este módulo define quem pode ver e fazer o quê no SGP, protege os dados pessoais de capacidade e registra em uma
trilha que ninguém consegue apagar tudo o que acontece no sistema.

## Para que serve

Todo sistema de gestão carrega informação sensível. Um cronograma revela a estratégia da empresa; um orçamento revela
quanto se investe em cada frente; um perfil de capacidades revela o que cada pessoa sabe, quanto custa e onde ela
pretende chegar. O SGP parte do princípio de que **acesso é decisão de negócio, não detalhe técnico**. Por isso, cada
pessoa entra com um perfil funcional — Administrador, Executivo, PMO, Gerente de Projetos, Líder Técnico, Membro de
Equipe, RH/DHO ou Stakeholder — e esse perfil determina o que aparece no menu, o que pode ser aberto e o que pode ser
alterado.

O segundo valor deste módulo é a **confiança no dado**. Quando alguém pergunta "de onde veio esse número?", o SGP
responde com uma trilha de auditoria que mostra quem fez, o que fez, quando fez, de qual endereço de rede fez e com
que justificativa. Essa trilha é **imutável**: um registro de auditoria não pode ser alterado nem apagado, nem pelo
administrador. É isso que transforma o sistema em instrumento de governança, e não apenas em mais uma planilha
compartilhada.

O terceiro valor é a **privacidade das pessoas**. Um catálogo de competências só funciona se as pessoas confiarem
nele. Por isso, cada registro de capacidade tem um nível de visibilidade escolhido pela própria pessoa — público,
restrito ou privado — e existe um consentimento explícito para que o perfil seja usado nas recomendações automáticas
de alocação. Quem não autoriza continua usando o sistema normalmente: apenas não aparece nas sugestões.

Por fim, este módulo dá sustentação à **Lei Geral de Proteção de Dados** no dia a dia. O SGP trata dados pessoais e
de desempenho com finalidade declarada, permite corrigir informações incorretas, registrar contestação de avaliações
e revogar consentimento a qualquer momento — sempre deixando rastro do que foi contestado, por quem e com qual
justificativa.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| **Administrador** | Cadastra pessoas, atribui perfis e papéis, redefine senhas, consulta a auditoria e concede acesso administrativo | Diário, ou sob demanda |
| **Executivo (C-Level)** | Consulta a trilha de auditoria em investigações e acompanha quem tem acesso ao quê | Eventual, em ciclos de compliance |
| **PMO** | Ajusta papéis de governança, mantém workflows, concede acessos administrativos e revisa a trilha | Semanal |
| **Gerente de Projetos** | Avalia capacidades do time e valida níveis; não administra acessos | Semanal |
| **Líder Técnico** | Avalia e endossa capacidades dos liderados; não administra acessos | Semanal |
| **Membro de Equipe** | Define a visibilidade das próprias capacidades, autoriza ou revoga o uso do perfil em recomendações e ajusta a mentoria | No primeiro acesso e depois sob demanda |
| **RH / DHO** | Mantém o catálogo, valida níveis, administra privacidade e acompanha a trilha de auditoria | Diário |
| **Stakeholder** | Não usa este módulo; apenas é afetado pelas regras de acesso | Não se aplica |

## Como chegar

| Caminho | O que aparece ao abrir |
|---|---|
| **Administração › Usuários e papéis** | Três abas: **Usuários** (lista com perfil, cargo, área, gestor, custo/hora e situação), **Papéis** (papéis com permissões próprias) e **Matriz de permissões** (a matriz completa por perfil). Exige a permissão de administração. |
| **Administração › Auditoria** | A trilha completa, com resumo por tipo de ação, filtros por período, usuário, ação e registro afetado, além das seções **Como interpretar a trilha** e **Política de retenção e imutabilidade**. Exige a permissão de auditoria. |
| **Administração › Preferências** | Blocos **Privacidade e capacidades** (visibilidade padrão, consentimento, mentoria, interesses) e **Segurança** (sessão, preferências regionais, encerramento de sessões). |
| **Menu do usuário › Meu perfil e capacidades** | O seu próprio perfil, com o radar de capacidades e o histórico. |

> **Atenção:** se você não vê **Usuários e papéis** no menu, o seu perfil não tem permissão de administração. Isso não
> impede você de ajustar a privacidade das suas próprias capacidades, que fica em **Preferências** e está disponível
> para todos.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Perfil** | O papel funcional da pessoa no sistema. São oito, e cada um traz um conjunto predefinido de permissões. |
| **Papel** | Um conjunto de permissões criado sob medida pela organização — por exemplo, "Auditor" ou "Gestor de Portfólio". Papéis **somam-se** ao perfil. |
| **Permissão** | A autorização para realizar um tipo de operação em um módulo. Tem um nome curto no formato *módulo.ação*. |
| **Curinga** | A autorização total, representada por um asterisco. É concedida apenas ao Administrador e ao superusuário. |
| **Escopo** | O nível em que um papel é atribuído: global, portfólio, programa, projeto ou pessoal. |
| **Visibilidade** | O grau de exposição de um registro de capacidade: Público, Restrito ou Privado. |
| **Consentimento** | A autorização dada pela própria pessoa para que o seu perfil de capacidades seja considerado nas recomendações automáticas de alocação. |
| **Trilha de auditoria** | O registro cronológico de tudo o que acontece no sistema: criação, alteração, exclusão, aprovação, alocação, validação, exportação, entrada e saída. |
| **Imutabilidade** | A garantia de que um registro de auditoria não pode ser alterado nem excluído depois de gravado. |
| **Retenção** | Por quanto tempo um registro é mantido. Na trilha de auditoria, o mínimo é de cinco anos. |
| **LGPD** | A Lei Geral de Proteção de Dados. No SGP, ela se traduz em finalidade declarada, consentimento registrado, direito de correção e direito de contestação. |
| **Contestação** | O direito de discordar de uma avaliação de capacidade. A avaliação contestada permanece registrada, com a justificativa, na trilha de auditoria. |
| **Legítimo interesse** | Uma das bases legais que autorizam o tratamento de dados para gestão de projetos e desenvolvimento de pessoas. |
| **Custo por hora** | O valor/hora da pessoa ou do recurso. É dado sensível de RH e tem visibilidade controlada. |
| **Superusuário** | Conta técnica com acesso total, usada pela equipe de TI. Não deve ser usada para o trabalho do dia a dia. |
| **Administrador** | Perfil de negócio com acesso total ao SGP, incluindo administração e auditoria. |

## Tarefas passo a passo

### Descobrir o que o seu perfil pode fazer

Serve para você saber, sem perguntar a ninguém, quais telas e ações estão disponíveis para o seu caso.

1. Olhe o menu lateral. Os grupos e itens visíveis são exatamente aquilo a que você tem acesso.
2. Se você tem permissão de administração, abra **Administração › Usuários e papéis** e vá à aba **Matriz de
   permissões**. Ela mostra, perfil por perfil, o que cada um pode fazer.
3. Para conferir o seu próprio caso, observe que papéis adicionais aparecem no seu cadastro — eles somam permissões ao
   seu perfil.

**O que acontece depois:** nenhuma alteração é feita. Esta é uma tarefa de leitura.

### Trocar o perfil de uma pessoa

Serve quando alguém muda de função — um analista que passa a gerir projetos, um gerente que assume a liderança técnica
de uma frente.

1. Abra **Administração › Usuários e papéis**, aba **Usuários**.
2. Localize a pessoa e clique em editar.
3. No bloco **Vínculo e acesso**, altere **Perfil de acesso** para o novo perfil.
4. Se necessário, ajuste também **Gestor imediato** e **Cargo**.
5. Salve.

**O que acontece depois:** no próximo acesso da pessoa, o menu dela já reflete o novo perfil. A alteração fica
registrada na trilha de auditoria com o valor anterior e o novo, quem alterou e quando.

**Exemplo prático:** Ana era Membro de Equipe e passou a liderar duas pessoas. Ao trocar o perfil para **Líder
Técnico**, ela ganha a capacidade de criar tarefas, avaliar capacidades e editar PDIs — mas continua sem acesso ao
financeiro do projeto e à administração de acessos.

> **Atenção:** ampliar perfil é fácil; reduzir também. Se você rebaixar o perfil de alguém enquanto essa pessoa está
> conectada, a mudança vale a partir da próxima verificação de sessão. Avise a pessoa para evitar a impressão de que o
> sistema "quebrou".

### Criar um papel sob medida

Serve para atender situações que os oito perfis padrão não cobrem — por exemplo, um auditor externo que só pode ver,
ou um gestor de portfólio que enxerga tudo de portfólio sem tocar em capacidades.

1. Abra **Administração › Usuários e papéis** e vá à aba **Papéis**.
2. Crie um novo papel com um nome que diga o que ele faz. Papéis de sistema já vêm preenchidos e servem de exemplo.
3. Marque as permissões desejadas, agrupadas por módulo: Portfólio, Programas, Projetos, Tarefas, Recursos, Alocação,
   Financeiro, Riscos e issues, Capacidades, PDI e mentoria, Mentorias, Treinamentos, Timesheet, Dashboards,
   Relatórios, Auditoria, Privacidade, Administração e Workflows.
4. Salve o papel.
5. Volte à aba **Usuários**, abra a pessoa desejada e vincule o novo papel.

**O que acontece depois:** as permissões do papel **somam-se** às do perfil da pessoa. Um papel nunca retira uma
permissão que o perfil já concede.

> **Atenção:** papéis são aditivos. Se você quer reduzir o acesso de alguém, o caminho é mudar o **perfil de acesso**,
> não criar um papel restritivo.

### Dar um papel com escopo a alguém

Serve para registrar em que nível organizacional aquele papel vale — o que é essencial para auditoria e para revisões
periódicas de acesso.

1. Abra **Administração › Usuários e papéis**, aba **Usuários**, e edite a pessoa.
2. Vincule o papel desejado.
3. Escolha o **escopo** do vínculo:

| Escopo | O que significa |
|---|---|
| **Global** | O papel vale para toda a organização. |
| **Portfólio** | O papel vale no âmbito de um portfólio específico. |
| **Programa** | O papel vale no âmbito de um programa específico. |
| **Projeto** | O papel vale apenas naquele projeto. |
| **Pessoal** | O papel vale apenas para os próprios registros da pessoa. |

4. Informe o item correspondente ao escopo escolhido, quando o escopo não for global nem pessoal.
5. Salve.

**O que acontece depois:** o vínculo fica registrado com o escopo escolhido, formando o histórico de governança de
acessos da organização.

### Ajustar a visibilidade das suas capacidades

Serve para você decidir quem pode ver o que você sabe. É a tarefa mais importante deste módulo para quem se preocupa
com privacidade.

1. Abra **Administração › Preferências** e localize o bloco **Privacidade e capacidades**.
2. Em **Visibilidade padrão das capacidades**, escolha uma das três opções:

| Opção | Quem enxerga |
|---|---|
| **Público** | Qualquer pessoa autenticada no SGP pode ver as suas capacidades. |
| **Restrito** | Apenas você, o seu gestor e o RH. |
| **Privado** | Apenas você. |

3. A escolha é gravada imediatamente e passa a valer para os seus registros de capacidade.

**O que acontece depois:** as capacidades marcadas como **Privado** deixam de aparecer para outras pessoas nas telas de
perfil, na matriz de skills, no gap analysis e nas listas de pessoas. As marcadas como **Restrito** ficam visíveis
apenas para você, para o seu gestor e para o RH.

> **Atenção:** a visibilidade protege a exibição, não a sua carreira. Se você marcar tudo como **Privado**, o motor de
> alocação não terá como sugerir você para as tarefas em que você é forte — e a matriz de skills da sua área vai
> parecer ter uma lacuna que na verdade não existe. O meio-termo mais comum é **Restrito** para o conjunto geral e
> **Público** para as competências que você quer que sejam conhecidas.

### Autorizar ou revogar o uso do seu perfil em recomendações

Serve para você decidir se quer ser sugerido automaticamente quando um gerente precisa alocar alguém.

1. Abra **Administração › Preferências**, bloco **Privacidade e capacidades**.
2. Localize o interruptor **Aceito ser recomendado em alocações**.
3. Ligue-o para autorizar ou desligue-o para revogar.
4. Se quiser receber convites de mentoria, ligue também **Disponível para mentoria**.

**O que acontece depois:** com o consentimento desligado, o seu nome deixa de aparecer na lista de candidatos do
**Motor de matching**. Você continua vendo tudo o que é seu, continua apontando horas, continua recebendo tarefas
atribuídas manualmente — apenas não é sugerido automaticamente.

**Exemplo prático:** Thiago, Líder Técnico, está em um período de foco em um projeto crítico. Ele desliga **Aceito ser
recomendado em alocações** durante três meses para não receber novas sugestões. Ao religar, volta a aparecer.

### Contestar uma avaliação de capacidade (LGPD)

Serve para você discordar de uma avaliação registrada sobre você, de forma formal e rastreável.

1. Reúna o contexto: qual capacidade, qual nível foi atribuído, quem avaliou e quando.
2. Procure o RH ou o seu gestor — são eles que conseguem registrar a contestação e a justificativa no sistema.
3. Peça que a contestação seja registrada com a justificativa e a data.
4. Acompanhe o resultado: a avaliação original **não é apagada**; ela permanece no histórico junto da contestação.

**O que acontece depois:** o registro da avaliação e da contestação permanece na trilha de auditoria imutável, com
autoria e justificativa. O nível consolidado da capacidade pode ser revisto à luz da contestação, e essa mudança
também fica registrada.

> **Atenção:** contestar não é o mesmo que apagar. O SGP foi construído para preservar o histórico — inclusive o
> histórico de divergências. O que muda é o nível considerado válido dali em diante.

### Consultar a trilha de auditoria

Serve para responder a perguntas como "quem mudou a data deste projeto?", "quem aprovou este lançamento?" ou "quem
exportou esta lista?".

1. Abra **Administração › Auditoria**.
2. Observe o resumo por tipo de ação, no topo: **Criação**, **Atualização**, **Exclusão**, **Login**, **Logout**,
   **Exportação**, **Aprovação**, **Alocação** e **Validação**.
3. Use os filtros para reduzir a lista por período, usuário, ação e registro afetado.
4. Percorra as colunas **Data/hora**, **Usuário**, **Ação**, **Entidade**, **ID**, **IP** e **Justificativa**.
5. Clique em um registro para abrir o detalhe, com a comparação entre o valor anterior e o novo de cada campo.
6. Se quiser entender a lógica da tela, abra a seção **Como interpretar a trilha**.

**O que acontece depois:** a consulta é somente leitura e não altera nada. O próprio acesso à trilha é restrito aos
perfis com permissão de auditoria.

**Exemplo prático:** em uma auditoria interna, perguntam por que o orçamento de um projeto mudou em março. Filtrando
por período e pelo registro afetado, aparece o registro de atualização com o valor anterior, o valor novo, o autor e a
justificativa informada.

### Exportar a trilha de auditoria

Serve para levar o histórico a uma auditoria externa ou arquivá-lo junto do processo de conformidade.

1. Abra **Administração › Auditoria**.
2. Aplique exatamente os filtros que você quer no arquivo — período, usuário, ação, registro.
3. Clique em **Exportar CSV**.
4. Confira o resumo apresentado: ele informa quantos registros foram exportados.

**O que acontece depois:** o arquivo é baixado no seu computador e a exportação **também gera um registro de
auditoria**, com o seu nome, a data e os filtros utilizados. A exportação respeita exatamente os filtros aplicados na
tela.

> **Atenção:** exportar dados pessoais para fora do sistema é uma operação com implicação de LGPD. Exporte apenas o
> necessário, guarde o arquivo em local controlado e apague a cópia local quando ela deixar de ser necessária.

### Encerrar as sessões abertas

Serve para proteger a sua conta quando você usa computadores compartilhados ou desconfia que deixou uma sessão aberta.

1. Abra **Administração › Preferências** e localize o bloco **Segurança**.
2. Confira a validade da sua sessão atual e as suas preferências regionais.
3. Clique em **Sair de todos os dispositivos**.

**O que acontece depois:** os dados de acesso guardados naquele navegador são removidos e a sessão é encerrada. Você
volta para a tela de login.

> **Atenção:** esta ação encerra a sessão no navegador em que você está. Ela não bloqueia a conta nem impede um novo
> login imediato com a mesma senha.

### Definir quem vê o custo por hora

Serve para proteger uma informação sensível de RH sem impedir que o financeiro do projeto funcione.

1. Abra **Administração › Usuários e papéis**, aba **Usuários**, e edite a pessoa.
2. No bloco **Custo e capacidade**, informe **Custo por hora (R$)** e **Capacidade semanal (horas)**.
3. Decida sobre o interruptor **Custo visível para todos**.
4. Salve.

**O que acontece depois:** o custo por hora aparece para o próprio dono do dado, para quem tem **Custo visível para
todos** ligado e, por padrão, para os perfis Administrador, PMO, Gerente de Projetos, Executivo e RH. Para os demais,
o valor aparece como **Restrito**. No **Motor de matching**, o custo estimado e o valor/hora também são omitidos de
quem não pode ver custo.

> **Atenção:** a tela de cadastro traz um aviso explícito de que custo é dado sensível. Ligue **Custo visível para
> todos** apenas quando houver uma razão de negócio clara e comunicada.

### Redefinir a senha de alguém

Serve para devolver o acesso a quem esqueceu a senha ou suspeita que ela foi exposta.

1. Abra **Administração › Usuários e papéis**, aba **Usuários**, e edite a pessoa.
2. No bloco **Identificação**, localize o campo de senha.
3. Informe uma senha nova, com pelo menos seis caracteres.
4. Salve e comunique a nova senha à pessoa por um canal seguro, pedindo a troca no primeiro acesso.

**O que acontece depois:** a senha antiga deixa de funcionar. Se a pessoa estiver com uma sessão aberta, oriente-a a
sair e entrar novamente.

> **Atenção:** o SGP não envia e-mail de redefinição nem permite que a própria pessoa recupere a senha nesta versão.
> Esse é o motivo pelo qual a redefinição é uma tarefa do administrador.

### Desativar o acesso de quem saiu da empresa

Serve para cumprir a boa prática de revogar acessos imediatamente após um desligamento.

1. Abra **Administração › Usuários e papéis**, aba **Usuários**.
2. Localize a pessoa e edite o cadastro.
3. No bloco **Vínculo e acesso**, desligue **Usuário ativo**.
4. Se houver **Acesso ao Django admin** ligado, desligue também.
5. Salve.

**O que acontece depois:** a pessoa deixa de conseguir entrar no SGP. O histórico dela — tarefas concluídas,
avaliações, alocações e registros de auditoria — é preservado, porque o SGP mantém o vínculo histórico em vez de
apagar a pessoa.

## Campos e o que significam

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Perfil de acesso** | O perfil funcional que determina o conjunto base de permissões | Escolha entre Administrador, Executivo (C-Level), PMO, Gerente de Projetos, Líder Técnico, Membro de Equipe, RH / DHO e Stakeholder | Sim |
| **Usuário ativo** | Se a pessoa pode entrar no sistema | Desligue no desligamento ou em afastamentos longos | Não |
| **Acesso ao Django admin** | Acesso à área técnica de administração do sistema | Conceda apenas à equipe de TI | Não |
| **Papéis** | Permissões adicionais somadas ao perfil | Vincule um ou mais papéis e defina o escopo de cada um | Não |
| **Escopo do papel** | O nível em que o papel vale: Global, Portfólio, Programa, Projeto ou Pessoal | Escolha o nível e informe o item correspondente | Sim, ao vincular papel |
| **Custo por hora (R$)** | Valor/hora da pessoa, usado em custo de alocação e no motor de matching | Informe o valor; deixe zero se não se aplica | Não |
| **Capacidade semanal (horas)** | Quantas horas por semana a pessoa tem disponíveis | Padrão de 40 horas | Não |
| **Custo visível para todos** | Libera o custo/hora para qualquer pessoa autenticada | Ligue apenas com justificativa de negócio | Não |
| **Aceito ser recomendado em alocações** | Consentimento para uso do perfil nas recomendações automáticas | Ligado por padrão; desligue para sair das sugestões | Não |
| **Disponível para mentoria** | Faz a pessoa aparecer nas sugestões de mentor | Desligado por padrão; ligue se quiser mentorar | Não |
| **Visibilidade padrão das capacidades** | Grau de exposição aplicado aos seus registros de capacidade | Escolha Público, Restrito ou Privado | Não |
| **Interesses** | Temas de interesse usados em recomendações de desenvolvimento e alocação | Digite e clique em **Incluir** | Não |
| **Justificativa** | O motivo declarado de uma decisão registrada na trilha | Escreva de forma objetiva; é o campo mais consultado em auditoria | Sim, em decisões de exceção |
| **Data/hora** (auditoria) | Momento exato do registro | Preenchido pelo sistema | — |
| **Usuário** (auditoria) | Quem realizou a ação | Preenchido pelo sistema | — |
| **Ação** (auditoria) | O tipo de operação: Criação, Atualização, Exclusão, Login, Logout, Exportação, Aprovação, Alocação ou Validação | Preenchido pelo sistema | — |
| **Entidade** (auditoria) | O tipo de registro afetado | Preenchido pelo sistema | — |
| **IP** (auditoria) | O endereço de rede de origem da ação | Preenchido pelo sistema | — |

## Regras de negócio

### Como as permissões são calculadas

Cada pessoa tem **um perfil** e, opcionalmente, **vários papéis**. A permissão efetiva é a soma das permissões do
perfil com as permissões de todos os papéis vinculados. Um papel nunca remove uma permissão concedida pelo perfil.

O Administrador e o superusuário recebem o **curinga**, que concede tudo. Além disso, uma permissão declarada
como *módulo* seguida de ponto e asterisco concede todas as ações daquele módulo.

### Leitura e escrita são verificadas em separado

Cada tela do sistema declara duas permissões: uma para **consultar** e outra para **gravar**. Consultar exige a
permissão de leitura do módulo; criar, alterar ou excluir exige a permissão de escrita. É por isso que existem perfis
que enxergam um módulo inteiro sem conseguir tocar em nada — o caso típico do **Executivo**, que vê financeiro,
portfólio e riscos, mas não altera nenhum deles.

Na versão atual, a verificação de escrita é **uma só por módulo** e corresponde à permissão de edição. Isso significa
que quem pode editar um módulo também consegue criar e excluir registros daquele módulo. Os códigos de criação e
exclusão existem na matriz de permissões e descrevem a intenção de governança — a exclusão está declarada para
projetos, tarefas e riscos —, mas quem decide, na prática, é a permissão de edição.

### A matriz de permissões completa, em linguagem de negócio

| Código | O que autoriza, em linguagem de negócio | Perfis que têm |
|---|---|---|
| **Curinga** (asterisco) | Acesso total ao sistema, sem restrição | Administrador |
| **portfolio.ver** | Consultar portfólios | Administrador, Executivo, PMO, Gerente |
| **portfolio.criar** | Criar portfólios | Administrador, PMO |
| **portfolio.editar** | Alterar e excluir portfólios | Administrador, PMO |
| **programa.ver** | Consultar programas | Administrador, Executivo, PMO, Gerente |
| **programa.criar** | Criar programas | Administrador, PMO |
| **programa.editar** | Alterar e excluir programas | Administrador, PMO |
| **projeto.ver** | Consultar projetos, marcos, cronograma e linhas de base | Todos os oito perfis |
| **projeto.criar** | Criar projetos | Administrador, PMO, Gerente |
| **projeto.editar** | Alterar projetos, marcos, indicadores, lições aprendidas e requisitos de capacidade do projeto | Administrador, PMO, Gerente |
| **projeto.excluir** | Excluir projetos | Administrador, PMO |
| **tarefa.ver** | Consultar tarefas, Kanban, calendário e apontamentos de horas | Todos os oito perfis |
| **tarefa.criar** | Criar tarefas | Administrador, PMO, Gerente, Líder |
| **tarefa.editar** | Alterar tarefas, dependências, checklists e o andamento do trabalho | Administrador, PMO, Gerente, Líder, Membro |
| **tarefa.excluir** | Excluir tarefas | Administrador, PMO, Gerente |
| **recurso.ver** | Consultar recursos, materiais e a capacidade semanal das pessoas | Administrador, Executivo, PMO, Gerente, Líder, RH |
| **recurso.criar** | Cadastrar recursos e materiais | Administrador, PMO, Gerente |
| **recurso.editar** | Alterar e excluir recursos e materiais | Administrador, PMO, Gerente |
| **alocacao.ver** | Consultar alocações, conflitos, mapa de ocupação, motor de matching e simulações | Administrador, Executivo, PMO, Gerente, Líder |
| **alocacao.criar** | Alocar pessoas em projetos e tarefas | Administrador, PMO, Gerente, Líder |
| **alocacao.editar** | Alterar, confirmar e excluir alocações; decidir recomendações do motor | Administrador, PMO, Gerente |
| **financeiro.ver** | Consultar orçamento, lançamentos, painel financeiro, EVM e curva S | Administrador, Executivo, PMO, Gerente |
| **financeiro.editar** | Criar, alterar, aprovar e excluir orçamentos, lançamentos e previsões de caixa | Administrador, PMO, Gerente |
| **risco.ver** | Consultar a matriz de riscos, o histórico de riscos e as issues | Administrador, Executivo, PMO, Gerente, Líder, Stakeholder |
| **risco.criar** | Registrar riscos, planos de resposta, issues e ações | Administrador, PMO, Gerente, Líder |
| **risco.editar** | Alterar riscos, issues e ações corretivas | Administrador, PMO, Gerente, Líder |
| **risco.excluir** | Excluir riscos e issues | Administrador, PMO, Gerente |
| **capacidade.ver** | Consultar o catálogo de capacidades, a matriz de skills, o gap analysis, o bus factor, as pessoas, as oportunidades e a sucessão | Administrador, Executivo, PMO, Gerente, Líder, Membro, RH |
| **capacidade.criar** | Cadastrar capacidades e categorias no catálogo | Administrador, PMO, RH |
| **capacidade.editar** | Alterar o catálogo, os critérios de nível, os registros de capacidade e as evidências | Administrador, PMO, RH |
| **capacidade.avaliar** | Registrar avaliações de capacidade de outras pessoas | Administrador, Gerente, Líder, RH |
| **capacidade.autoavaliar** | Registrar a avaliação da própria capacidade e candidatar-se a oportunidades internas | Administrador, Membro |
| **capacidade.endossar** | Endossar a capacidade de um colega, sugerindo um nível | Administrador, Líder, Membro, RH |
| **capacidade.validar** | Validar níveis, aprovar ou reprovar sugestões de promoção e decidir sobre registros de capacidade | Administrador, PMO, Gerente, RH |
| **pdi.ver** | Consultar planos de desenvolvimento individual, ações, mentorias e treinamentos | Administrador, Gerente, Líder, Membro, RH |
| **pdi.editar** | Criar e alterar planos de desenvolvimento e as ações do plano | Administrador, Gerente, Líder, Membro, RH |
| **mentoria.editar** | Registrar e alterar mentorias | Administrador, Líder, RH |
| **treinamento.editar** | Cadastrar treinamentos e registrar a participação das pessoas | Administrador, RH |
| **timesheet.editar** | Registrar e alterar os próprios apontamentos de horas e aprovar horas do time | Administrador, Membro |
| **dashboard.ver** | Abrir o dashboard executivo e os painéis consolidados | Todos os oito perfis |
| **relatorio.ver** | Consultar relatórios, o catálogo de widgets e as regras de notificação | Administrador, Executivo, PMO, Gerente, RH, Stakeholder |
| **relatorio.criar** | Criar e alterar relatórios customizados | Administrador, PMO, RH |
| **auditoria.ver** | Consultar a trilha de auditoria | Administrador, Executivo, PMO, RH |
| **admin.ver** | Abrir as telas administrativas: usuários, campos personalizados e integrações | Administrador, PMO |
| **workflow.editar** | Criar e alterar workflows, estados e transições | Administrador, PMO |
| **privacidade.editar** | Administrar as regras de privacidade e de tratamento de dados pessoais | Administrador, RH |

### O que cada perfil pode e não pode fazer

**Administrador.** Pode tudo. Cria e altera qualquer registro, administra usuários, papéis, tokens de integração e
campos personalizados, consulta e exporta a trilha de auditoria. Não pode, na prática, apagar ou editar um registro de
auditoria — a imutabilidade vale para ele também.

**Executivo (C-Level).** Pode consultar dashboards, portfólio, programas, projetos, tarefas, recursos, alocação,
financeiro, riscos, capacidades, relatórios e a trilha de auditoria. Não pode criar nem alterar nada, não vê
**Usuários e papéis** nem **Workflows**, e não acessa o conteúdo dos planos de desenvolvimento individual.

**PMO.** Pode criar e alterar portfólios, programas, projetos, tarefas, recursos, alocação, financeiro, riscos,
catálogo de capacidades, relatórios e workflows; consulta a auditoria; abre as telas administrativas. Não administra
usuários, papéis, tokens nem webhooks — essas operações são exclusivas do Administrador — e não acessa o conteúdo dos
planos de desenvolvimento individual.

**Gerente de Projetos.** Pode criar projetos e alterar os seus; criar e alterar tarefas, alocações, riscos, issues,
orçamento e lançamentos do projeto; avaliar capacidades do time; validar níveis e promoções. Não vê a trilha de
auditoria, não administra acessos nem workflows, e não cria capacidades no catálogo.

**Líder Técnico.** Pode criar tarefas, criar alocações para o time, registrar riscos e avaliar e endossar capacidades,
além de editar PDIs e mentorias. Não altera alocações já existentes de outras pessoas, não exclui tarefas nem riscos,
não vê financeiro, programas, portfólios nem relatórios, e não valida promoções.

**Membro de Equipe.** Pode atualizar o andamento das próprias tarefas, apontar horas, autoavaliar-se, endossar
colegas e editar o próprio PDI. Não cria tarefas, não aloca pessoas, não vê financeiro nem riscos e não valida níveis.

**RH / DHO.** Pode criar e alterar o catálogo de capacidades, avaliar e validar níveis, gerenciar PDIs, mentorias e
treinamentos, criar relatórios, consultar a auditoria e administrar as regras de privacidade. Não altera projetos,
tarefas, alocações nem financeiro, e não administra usuários.

**Stakeholder.** Pode consultar projetos, tarefas, dashboards, riscos e relatórios. Não altera absolutamente nada e
não acessa capacidades, financeiro nem administração.

### Privacidade das capacidades

Cada registro de capacidade tem um nível de visibilidade: **Público**, **Restrito (gestor e RH)** ou **Privado**. Ao
listar as capacidades de outras pessoas, o sistema remove automaticamente os registros marcados como **Privado** e
também os marcados como **Restrito** de quem não é o próprio dono do registro. Você sempre vê tudo o que é seu,
independentemente da marcação.

A visibilidade não impede o funcionamento do sistema: ela decide **quem enxerga**. Um registro privado continua
contando para a sua própria trilha, para o seu PDI e para o seu radar de capacidades.

### Consentimento para uso em recomendações

O motor de alocação considera apenas pessoas **ativas** e que **autorizaram** o uso do perfil em recomendações. Quem
não autorizou simplesmente não entra no conjunto de candidatos — não há penalidade, registro de recusa nem
consequência automática. O consentimento pode ser ligado e desligado a qualquer momento, sem afetar o histórico.

### LGPD, finalidade e direito de contestação

O SGP trata dados pessoais e de desempenho para duas finalidades declaradas: **gestão de projetos** e
**desenvolvimento de capacidades**. As bases legais são o legítimo interesse e o consentimento registrado.

Como consequência, todo titular de dados tem, no sistema:

- **Direito de informação:** o próprio bloco **Privacidade e capacidades** explica, na tela, como os dados são usados.
- **Direito de correção:** dados cadastrais e de capacidade podem ser corrigidos pelo próprio titular ou pelo RH.
- **Direito de contestação:** avaliações de capacidade podem ser contestadas junto ao RH ou ao gestor, com
  justificativa registrada.
- **Direito de revogação:** o consentimento para uso em recomendações pode ser revogado a qualquer momento, com efeito
  imediato nas próximas execuções do motor.
- **Rastreabilidade:** avaliações contestadas permanecem registradas, com a justificativa, na trilha de auditoria.

### A trilha de auditoria

**O que é registrado.** Criação, atualização, exclusão, aprovação, alocação, validação, exportação, entrada e saída do
sistema. Em cada registro ficam gravados: data e hora, autor, tipo de ação, tipo e identificação do registro afetado,
valor anterior e valor novo de cada campo alterado, justificativa quando informada, endereço de rede de origem e
identificação do navegador utilizado.

**Imutabilidade.** Um registro de auditoria não pode ser alterado nem excluído — nem por um administrador. O sistema
recusa a operação. Essa é a garantia que dá valor à trilha.

**Retenção.** O período mínimo de guarda é de **cinco anos**, conforme a política de segurança adotada.

**Quem pode ver.** Apenas os perfis com permissão de auditoria: Administrador, Executivo, PMO e RH. Ver e exportar são
operações registradas — ou seja, quem consulta a trilha também aparece nela.

**Exportação.** A exportação em CSV respeita exatamente os filtros aplicados na tela e gera um registro de
**Exportação** na própria trilha.

## Como ler os indicadores

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Usuários listados** | Quantidade de contas no sistema | Crescimento abrupto merece verificação | Coerente com o quadro da organização |
| **Usuários ativos** | Contas que conseguem entrar | Contas inativas de pessoas desligadas devem ser desativadas rapidamente | Zero contas ativas de ex-colaboradores |
| **Mentores** | Pessoas marcadas como disponíveis para mentoria | Base para as trilhas de desenvolvimento | Crescente, cobrindo as capacidades críticas |
| **Acesso ao admin** | Quantas contas têm acesso à área técnica | Cada conta aqui é um risco a mais | Mínimo indispensável |
| **Áreas** | Quantas áreas distintas aparecem nos cadastros | Ajuda a detectar cadastros com área em branco ou grafia inconsistente | Estável e alinhada ao organograma |
| **Papéis** | Quantos papéis existem, além dos oito perfis | Papéis demais indicam governança confusa | Poucos, com nomes claros |
| **Registros por tipo de ação** | Volume de Criação, Atualização e Exclusão no período | Picos de exclusão merecem investigação | Estável, com exclusões justificadas |
| **Registros de Login e Logout** | Acessos ao sistema no período | Login sem logout correspondente sugere sessão esquecida aberta | Equilibrado |
| **Registros de Exportação** | Quantas exportações de dados ocorreram | Cada exportação é uma cópia de dados fora do sistema | Baixo e sempre justificado |
| **Registros de Alocação** | Quantas alocações foram feitas no período | Mede a adesão ao sistema como fonte da verdade da alocação | Crescente |
| **Registros de Validação** | Quantas validações de capacidade e de promoção ocorreram | Validação parada significa catálogo desatualizado | Fluxo contínuo |
| **Taxa de consentimento** | Proporção de pessoas que autorizam o uso do perfil em recomendações | Taxa baixa esvazia o motor de matching | Acima de 80% |
| **Registros com visibilidade Privado** | Proporção de capacidades que ninguém além do dono enxerga | Concentração alta reduz a utilidade da matriz de skills | Baixa e consciente |

## Boas práticas

1. **Dê o menor acesso que resolve o problema.** Comece pelo perfil padrão e conceda papéis adicionais apenas quando
   houver uma necessidade concreta e registrada.
2. **Revise acessos periodicamente.** Uma vez por trimestre, percorra a lista de usuários, confirme quem ainda está na
   empresa, quem mudou de função e quem acumulou permissões que já não fazem sentido.
3. **Trate a permissão de administração como exceção.** As contas com **Acesso ao admin** ligado devem ser poucas,
   nominadas e conhecidas.
4. **Use perfis, não senhas compartilhadas.** Cada pessoa entra com a própria conta, porque é isso que dá sentido à
   trilha de auditoria.
5. **Explique a privacidade antes de cobrar preenchimento.** Quem entende que pode marcar uma capacidade como
   **Privado** preenche o perfil com mais honestidade.
6. **Escreva justificativas úteis.** "Ajuste" não ajuda ninguém seis meses depois; "antecipação solicitada pelo
   cliente em reunião de 12/03" ajuda.
7. **Exporte com parcimônia e guarde com cuidado.** Toda exportação fica registrada e gera uma cópia de dados pessoais
   fora do sistema.
8. **Oriente sobre o direito de contestação.** Divulgar esse direito é o que transforma o catálogo de capacidades em
   um instrumento confiável em vez de uma fonte de ressentimento.

## Perguntas frequentes

**1. Por que eu não consigo ver o grupo Financeiro no menu?**
Porque o seu perfil não tem acesso ao módulo financeiro. O menu é montado a partir das suas permissões. Quem vê
financeiro são Administrador, Executivo, PMO e Gerente de Projetos.

**2. Um papel pode tirar uma permissão que o meu perfil concede?**
Não. Papéis apenas somam. Para reduzir acesso, o caminho é trocar o **perfil de acesso** da pessoa.

**3. O administrador consegue apagar um registro de auditoria?**
Não. A trilha é imutável por construção: o sistema recusa alteração e exclusão de registros de auditoria, inclusive
para o Administrador e o superusuário.

**4. Por quanto tempo a trilha fica guardada?**
No mínimo cinco anos, conforme a política de retenção.

**5. Quem consegue ver o meu custo por hora?**
Você mesmo, as pessoas com **Custo visível para todos** ligado e, por padrão, os perfis Administrador, PMO, Gerente de
Projetos, Executivo e RH. Para os demais, o valor aparece como **Restrito**.

**6. Se eu marcar as minhas capacidades como privadas, perco oportunidades?**
Você deixa de aparecer na matriz de skills e nas sugestões do motor de alocação para essas capacidades. Continua
podendo ser alocado manualmente. O mais comum é usar **Restrito** para o conjunto geral e **Público** para o que você
quer que seja conhecido.

**7. Como faço para sair das recomendações automáticas de alocação?**
Abra **Administração › Preferências**, bloco **Privacidade e capacidades**, e desligue **Aceito ser recomendado em
alocações**. O efeito é imediato nas próximas execuções do motor.

**8. Posso contestar uma avaliação que considero injusta?**
Sim. Procure o RH ou o seu gestor para registrar a contestação com justificativa. A avaliação original permanece no
histórico, junto da contestação, e o nível pode ser revisto.

**9. O que acontece com os dados de quem é desligado da empresa?**
O acesso é desativado, mas o histórico permanece: tarefas concluídas, avaliações, alocações e registros de auditoria
são preservados. Apagar a pessoa destruiria a trilha e a memória dos projetos.

**10. Consigo ver quem exportou uma lista de dados pessoais?**
Sim, se você tem permissão de auditoria. Toda exportação gera um registro de **Exportação** com autor, data e filtros
utilizados.

## O que este módulo não faz

- **Não tem verificação em duas etapas nem login único corporativo.** Estão previstos no roteiro de segurança e ainda
  não estão disponíveis nesta versão.
- **Não tem recuperação de senha por autoatendimento.** A redefinição é feita pelo administrador.
- **Não usa o escopo para filtrar registros automaticamente.** O escopo do papel é registrado e serve à governança e à
  auditoria; nesta versão, a permissão efetiva é o conjunto de permissões do perfil somado ao dos papéis, sem recorte
  automático por portfólio, programa ou projeto.
- **Não controla permissão campo a campo.** O controle é por módulo e por tipo de operação (consultar ou gravar).
- **Não criptografa dados em repouso nesta versão.** Esse recurso está no roteiro de evolução.
- **Não expira senhas automaticamente nem aplica política de complexidade além do tamanho mínimo.** A política de
  senhas fortes depende de orientação interna.
- **Não impede captura de tela nem cópia manual de dados.** A trilha registra exportações formais, não cópias
  informais.
- **Não substitui a avaliação jurídica de conformidade.** O sistema oferece os recursos de privacidade e
  rastreabilidade; a adequação à LGPD depende também de processos, contratos e políticas da organização.

## Veja também

- [Visão geral e primeiros passos](../docs/01-visao-geral-e-primeiros-passos.md) — login, navegação, busca global,
  notificações, temas e densidade.
- [Administração](../docs/11-administracao.md) — usuários, papéis, workflows, campos personalizados, integrações e
  auditoria em detalhe.
- [Capacidades e talentos](../docs/08-capacidades-e-talentos.md) — catálogo, níveis, avaliações, evidências, XP,
  promoções, matriz, gap, bus factor, PDI, mentorias e sucessão.
- [Recursos e alocação](../docs/05-recursos-e-alocacao.md) — alocação, conflitos, ocupação e o motor de alocação
  inteligente.
- [Colaboração e notificações](../docs/10-colaboracao-e-notificacoes.md) — comentários, menções, chat por projeto,
  histórico e regras de notificação.
- [Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais e problemas comuns.

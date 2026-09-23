# Perguntas frequentes

## Em uma frase

Este é o documento para consultar quando algo no SGP não faz o que você esperava — em vez de abrir um chamado ou
perguntar no corredor.

## Para que serve

Nenhum manual é lido de ponta a ponta. Na prática, as pessoas procuram ajuda quando algo trava: um módulo que não
aparece, um número que não bate, um lançamento digitado errado, um projeto que ficou vermelho sem explicação. Este
documento reúne essas situações em um só lugar, com respostas curtas e caminhos concretos.

A maioria das dúvidas do dia a dia no SGP não é sobre funcionalidade — é sobre **confiança no dado**. "O dashboard diz
que temos doze projetos atrasados, mas eu conheço oito." "O orçamento mostra um valor que eu não reconheço." "Por que
meu projeto está vermelho se eu entreguei tudo?" Quase sempre a resposta está em um destes três lugares: um filtro
aplicado sem que a pessoa percebesse, uma regra de cálculo automático que ninguém explicou, ou uma permissão de acesso
que esconde parte da informação.

Por isso, este documento foi organizado começando pelas perguntas que mais aparecem, mesmo quando parecem óbvias. Cada
resposta diz **onde ir**, **o que fazer** e, quando importa, **por que o sistema se comporta assim**. A seção de
problemas comuns, em formato de tabela, foi feita para consulta rápida durante uma reunião ou no meio de uma tarefa.

Se depois de ler aqui a dúvida continuar, o caminho é o seguinte: dúvidas de acesso e senha vão para o administrador
do SGP; dúvidas sobre regras de negócio vão para o PMO; dúvidas sobre capacidades, avaliações e privacidade vão para o
RH; e dúvidas sobre valores financeiros vão para o responsável financeiro do projeto.

## Quem usa

| Perfil | O que costuma procurar aqui | Frequência típica |
|---|---|---|
| **Administrador** | Redefinição de senha, contas inativas, registros de auditoria e permissões | Semanal |
| **Executivo (C-Level)** | Divergência de números entre o dashboard e os relatórios que recebe | Mensal, antes de comitês |
| **PMO** | Regras de cálculo, saúde do projeto, workflow e padronização de cadastro | Semanal |
| **Gerente de Projetos** | Projeto vermelho, alocação diferente da sugerida, correção de lançamento, riscos que se concretizam | Várias vezes por semana |
| **Líder Técnico** | Tarefas atrasadas, horas apontadas pela equipe e pedido de capacidade nova | Semanal |
| **Membro de Equipe** | Esqueci a senha, não vejo um módulo, privacidade das minhas capacidades, horas não aprovadas | No início do uso e depois sob demanda |
| **RH / DHO** | Privacidade, consentimento, contestações e capacidade fora do catálogo | Semanal |
| **Stakeholder** | Por que não consigo editar; por que não vejo o financeiro | Eventual |

## Como chegar

Este documento não é uma tela do sistema — é uma referência de consulta. Mas os caminhos citados nas respostas são
todos reais, e vale guardar os atalhos:

| Se a sua dúvida é sobre | Vá para |
|---|---|
| Aparência, privacidade, notificações, filtros e segurança da sua conta | **Administração › Preferências** |
| Acesso, perfil, senha e papéis | **Administração › Usuários e papéis** |
| Quem fez o quê e quando | **Administração › Auditoria** |
| Números consolidados do portfólio | **Visão geral › Dashboard executivo** |
| Suas tarefas, suas horas e o seu PDI | **Visão geral › Meu painel** |
| Correção de valores financeiros | **Financeiro › Lançamentos** |
| Projeto vermelho, prazos e marcos | **Portfólio › Projetos** |
| Alocação diferente da sugerida | **Recursos e alocação › Motor de matching** |
| Capacidade que não existe no catálogo | **Capacidades e talentos › Catálogo de capacidades** |
| Risco que se concretizou | **Riscos e qualidade › Matriz de riscos** e **Issues e ações** |

> **Atenção:** boa parte das dúvidas deste documento se resolve com **Ctrl+K** — a busca global. Se você sabe o nome
> ou o código do que procura, ela é quase sempre o caminho mais rápido.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Perfil** | O papel funcional da pessoa no sistema. Determina o que aparece no menu e o que pode ser alterado. |
| **Permissão** | A autorização para consultar ou gravar em um módulo. É o que explica por que uma tela não aparece para você. |
| **Filtro aplicado** | Qualquer recorte ativo na tela — portfólio, programa, gerente, área, período ou status. É a causa mais comum de números que "não batem". |
| **Leitura recente** | O SGP guarda a última consulta de cada tela por 30 segundos para responder rápido. Dentro desse intervalo, os números vêm da leitura anterior. |
| **Saúde do projeto** | O semáforo verde, amarelo, vermelho ou cinza calculado automaticamente a partir de atraso, desvio de progresso, riscos críticos e estouro de orçamento. |
| **Progresso planejado** | Quanto do prazo do projeto já deveria ter sido percorrido, na data de hoje. |
| **Progresso real** | Quanto foi efetivamente concluído, ponderado pelo esforço estimado das tarefas. |
| **Desvio** | A diferença entre o progresso planejado e o progresso real. É o que empurra o projeto para amarelo ou vermelho. |
| **Recálculo automático** | Conjunto de valores que o SGP atualiza sozinho quando você altera algo — progresso, saúde, custo real, indicadores e conflitos. |
| **Orçado × Realizado** | Comparação entre o valor autorizado e o valor efetivamente gasto em uma linha orçamentária. |
| **Severidade do risco** | O resultado da multiplicação entre probabilidade e impacto, em uma escala de 1 a 25. |
| **Risco residual** | A severidade que sobra depois de aplicar o plano de resposta. |
| **Ocorrido** | Situação em que o risco deixou de ser possibilidade e virou problema. |
| **Issue** | O registro de um problema, impedimento, ação corretiva, solicitação de mudança ou decisão pendente. |
| **Override** | A decisão de alocar uma pessoa diferente da sugerida pelo motor, com justificativa registrada. |
| **Visibilidade** | O grau de exposição de um registro de capacidade: Público, Restrito ou Privado. |
| **Consentimento** | A autorização para que o seu perfil de capacidades seja usado nas recomendações automáticas de alocação. |
| **Trilha de auditoria** | O registro imutável de tudo o que acontece no sistema, com autor, data, valores anterior e novo e justificativa. |
| **Exportação** | A geração de um arquivo de planilha com os dados da tela. Sempre respeita os filtros aplicados e fica registrada na auditoria. |

## Tarefas passo a passo

### Resolver "não consigo ver um módulo"

Serve para entender, em um minuto, se o problema é permissão, filtro ou navegação — as três causas possíveis.

1. Confirme que o item realmente não está no menu lateral. Percorra os oito grupos: **Visão geral**, **Portfólio**,
   **Execução**, **Recursos e alocação**, **Financeiro**, **Riscos e qualidade**, **Capacidades e talentos** e
   **Administração**.
2. Lembre-se de que grupos sem nenhum item acessível **desaparecem** para o seu perfil. A ausência do grupo
   **Financeiro** significa que você não tem acesso ao financeiro, e não que a tela sumiu.
3. Se você vê o item mas a tela abre sem dados, verifique se há filtros aplicados. Use **limpar filtros** e clique em
   **Atualizar**.
4. Se o item não aparece e você acredita que deveria aparecer, fale com o administrador do SGP para conferir o seu
   **Perfil de acesso** e os seus **Papéis**.
5. Para saber o que cada perfil enxerga, consulte a matriz de permissões em
   [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md).

**O que acontece depois:** se for uma questão de perfil, a mudança é feita em **Administração › Usuários e papéis** e
passa a valer no seu próximo acesso. A alteração fica registrada na trilha de auditoria.

**Exemplo prático:** um Membro de Equipe não vê **Alocação** nem **Motor de matching**, porque esses módulos exigem
permissão de alocação. Ele continua vendo as suas próprias alocações no **Meu painel**, que é pessoal e está
disponível para todos.

### Resolver "esqueci a minha senha"

Serve para recuperar o acesso quando não há autoatendimento disponível.

1. Procure o administrador do SGP na sua organização.
2. Informe o seu e-mail corporativo cadastrado.
3. O administrador abre **Administração › Usuários e papéis**, aba **Usuários**, localiza o seu cadastro e define uma
   senha nova, com pelo menos seis caracteres.
4. Entre com a senha provisória e troque por uma sua, em **Preferências**, na primeira oportunidade.
5. Se você suspeita que alguém teve acesso à sua conta, use **Sair de todos os dispositivos** em
   **Preferências**, bloco **Segurança**, antes de trocar a senha.

**O que acontece depois:** a senha antiga deixa de funcionar imediatamente. Se você estiver com uma sessão aberta em
outro computador, ela será encerrada na próxima verificação.

> **Atenção:** o SGP **não** tem recuperação de senha por e-mail nem pergunta secreta nesta versão. Se ninguém na sua
> organização consegue redefinir a sua senha, isso é um problema de administração de acessos, não do seu cadastro.

### Entender por que os números do dashboard não batem

Serve para acabar com a discussão mais comum em reunião de resultados — sem precisar de suporte técnico.

1. Abra **Visão geral › Dashboard executivo**.
2. Olhe a barra de filtros logo abaixo do título. Verifique se há algo selecionado em **Portfólio**, **Programa**,
   **Gerente** ou **Área**. Um filtro esquecido é a causa mais frequente.
3. Se houver qualquer filtro aplicado, clique em **limpar filtros**.
4. Confira o subtítulo do título, que mostra a data e a hora da última atualização.
5. Clique em **Atualizar** para forçar uma leitura nova.
6. Compare com a origem: cada indicador tem uma definição diferente. **Total de projetos** conta todos os projetos do
   recorte; **Em risco** conta apenas os de saúde amarela ou vermelha; **Atrasados** conta apenas os de prazo vencido.
7. Se a divergência for de valor financeiro, confira em **Financeiro › Painel financeiro** se o número vem de orçamento
   planejado, de valor comprometido ou de valor realizado.

**O que acontece depois:** clicar em **Atualizar** recarrega todos os blocos da tela. O botão mostra um giro enquanto
a leitura acontece.

**Exemplo prático:** a diretoria vê "18 projetos" e o gerente vê "6". O gerente estava com o filtro **Gerente**
apontando para o próprio nome. Nenhum dos dois estava errado — estavam vendo recortes diferentes.

> **Atenção:** o SGP guarda a última leitura de cada tela por **30 segundos**. Se você acabou de alterar algo e o
> número não mudou, espere meio minuto e clique em **Atualizar** antes de concluir que há um erro.

### Corrigir um lançamento errado

Serve para consertar um valor, uma data ou uma classificação incorreta sem deixar o financeiro do projeto
inconsistente.

1. Abra **Financeiro › Lançamentos**.
2. Use os filtros **Projeto**, **Tipo**, **Status**, **Categoria** ou **Ordenar** para localizar o registro.
3. Clique no ícone de lápis, com a descrição **Editar lançamento**.
4. Corrija os campos necessários — **Valor (R$)**, **Competência**, **Tipo**, **Categoria**, **Orçamento vinculado**
   ou **Status**.
5. Clique em **Salvar**.

**O que acontece depois:** o SGP recalcula automaticamente o **valor realizado** da linha orçamentária vinculada e o
**custo real** do projeto, e em seguida recalcula a **saúde** do projeto. A alteração fica registrada na trilha de
auditoria, com o valor anterior e o novo.

Se o lançamento não deveria existir, use o ícone de lixeira, com a descrição **Excluir lançamento**, e confirme na
janela **Excluir lançamento**. A exclusão também dispara os mesmos recálculos.

Se o lançamento está correto, mas ainda não foi pago, use a ação **Aprovar lançamento** (o ícone de conferido na
linha). A aprovação marca o lançamento como **Realizado**, registra quem aprovou e preenche a **data de pagamento**
com a data de hoje, quando ela estiver vazia. Para vários lançamentos de uma vez, marque as caixas de seleção e clique
em **Aprovar selecionados**.

> **Atenção:** excluir um lançamento é diferente de cancelá-lo. Se o valor existiu, mas foi cancelado depois, o
> caminho correto é **Editar lançamento** e mudar o **Status** para **Cancelado** — assim o registro permanece no
> histórico e deixa de contar no realizado.

### Entender por que o meu projeto ficou vermelho

Serve para descobrir qual dos quatro gatilhos automáticos fez o semáforo mudar, e o que fazer a respeito.

1. Abra **Portfólio › Projetos** e localize o projeto. O semáforo aparece na lista.
2. Abra o projeto e confira, nesta ordem:
   - **Prazo:** a data de fim já passou e o projeto não está concluído?
   - **Progresso real × progresso planejado:** o desvio passou de 20 pontos percentuais?
   - **Riscos:** existem três ou mais riscos **abertos** com severidade igual ou maior que 15?
   - **Financeiro:** o custo real ultrapassou o orçamento?
3. Corrija a origem do problema: atualize o andamento das tarefas, ajuste datas com justificativa, trate os riscos ou
   revise o orçamento e os lançamentos.
4. Use a ação de recálculo do projeto para forçar a reavaliação do semáforo depois das correções.

**O que acontece depois:** o semáforo é recalculado toda vez que algo relevante muda — andamento de tarefa, datas,
riscos e lançamentos financeiros. Não é preciso marcar o projeto como vermelho à mão.

As quatro faixas funcionam assim:

| Semáforo | Quando aparece |
|---|---|
| **Vermelho** | Projeto atrasado, ou desvio de progresso acima de 20 pontos, ou três ou mais riscos abertos com severidade 15 ou mais, ou custo real acima do orçamento. |
| **Amarelo** | Desvio de progresso acima de 8 pontos, ou pelo menos um risco aberto com severidade 15 ou mais. |
| **Verde** | Nenhuma das condições acima. |
| **Cinza** | Projeto concluído, cancelado ou arquivado — o semáforo deixa de ser avaliado. |

**Exemplo prático:** um projeto estava verde e ficou vermelho depois que o time registrou dois riscos de severidade 20
na mesma semana. O progresso estava em dia e o orçamento, intacto. O gatilho foi o terceiro risco crítico — e o
caminho de recuperação é tratar os riscos, não mexer no cronograma.

### Registrar uma alocação diferente da sugerida pelo motor

Serve para usar o seu conhecimento de contexto sem perder a rastreabilidade da decisão.

1. Abra **Recursos e alocação › Motor de matching**.
2. Escolha a tarefa ou o projeto alvo da alocação.
3. Analise os candidatos sugeridos: cada cartão mostra o score, os componentes que o formaram, as capacidades
   atendidas, as lacunas, a disponibilidade e as penalidades aplicadas.
4. Se você concordar com a sugestão, use a ação de alocar do cartão.
5. Se você quiser outra pessoa, clique em **Override manual** no cartão do candidato.
6. Na janela **Override manual com justificativa**, que mostra quem foi recomendado pelo motor e com qual score,
   preencha **Pessoa a alocar**, **Percentual**, **Início**, **Fim** e **Justificativa**.
7. Clique em **Registrar override**.

**O que acontece depois:** a alocação substitui a recomendação do motor, o sistema verifica se há conflito de
sobrecarga na semana e avisa, e a decisão fica registrada com autor, recomendação original, pessoa escolhida e
justificativa. A taxa de override aparece no painel de alocação.

Se você não concordar com a sugestão e não quiser alocar ninguém dali, use **Recusar** e informe o motivo — ele fica
registrado na recomendação e também alimenta a taxa de override.

> **Atenção:** a justificativa é obrigatória no override, e o botão **Registrar override** fica bloqueado enquanto ela
> estiver vazia. Além disso, recusa e override só funcionam quando existe uma tarefa alvo selecionada: a recomendação
> precisa estar gravada para ser substituída ou recusada com rastro.

**Exemplo prático:** o motor sugeriu uma pessoa com score mais alto, mas ela está em período de férias na segunda
metade do período. O gerente registra o override escolhendo outra pessoa e escrevendo: "titular em férias de 15 a 30;
substituição alinhada com o líder técnico em 12/03". Seis meses depois, qualquer auditor entende a decisão.

### Pedir uma capacidade nova no catálogo

Serve para incluir uma competência que ainda não existe no catálogo — uma tecnologia nova, uma certificação
regulatória, uma prática que passou a ser exigida.

1. Antes de pedir, confirme que a capacidade realmente não existe. Abra **Capacidades e talentos › Catálogo de
   capacidades** e use a busca, ou aperte **Ctrl+K** e digite o nome.
2. Verifique também se ela não está cadastrada com outro nome — catálogos costumam acumular sinônimos.
3. Se você tem permissão de edição do catálogo (Administrador, PMO ou RH), cadastre você mesmo: na tela do catálogo,
   clique em **Nova capacidade**, preencha os dados, indique a categoria e a criticidade e salve.
4. Se você não tem essa permissão, encaminhe o pedido ao PMO ou ao RH com estas informações: nome da capacidade,
   categoria sugerida, por que ela é necessária, quais projetos ou posições a exigem e quem são as pessoas que já a
   dominam.
5. Acompanhe o cadastro: quando a capacidade entrar no catálogo, ela poderá ser vinculada ao seu perfil e aos
   requisitos das tarefas e dos projetos.

**O que acontece depois:** a capacidade passa a aparecer no catálogo, na matriz de skills, nos requisitos de projeto e
no gap analysis. Se ela for marcada como crítica, entra nos alertas de **Bus factor**.

> **Atenção:** cada pessoa só pode registrar a **própria** capacidade. Incluir uma competência no perfil de outra
> pessoa é papel do RH, do gestor ou do próprio titular.

### Agir quando um risco se concretiza

Serve para transformar um risco que virou problema em trabalho rastreável, sem perder o histórico.

1. Abra **Riscos e qualidade › Matriz de riscos** e localize o risco. Você pode chegar por **Ctrl+K** digitando a
   descrição ou o código do risco.
2. Abra o risco e mude o **status** para **Ocorrido**.
3. Registre no histórico do risco a data e o que aconteceu, para que a curva da matriz preserve a evolução.
4. Preencha ou revise o **plano de contingência** com o que está sendo feito de fato.
5. Abra **Riscos e qualidade › Issues e ações** e registre uma nova issue vinculada a esse risco, escolhendo o **tipo**
   adequado: **Issue**, **Ação corretiva**, **Solicitação de mudança**, **Impedimento** ou **Decisão pendente**.
6. Defina **responsável**, **prazo**, **prioridade**, **impacto** e **esforço estimado**.
7. Acompanhe a issue no Kanban de **Issues e ações** até que ela seja **Resolvida** ou **Fechada**.
8. Ao encerrar o assunto, marque o risco como **Encerrado** e registre a **lição aprendida** no projeto.

**O que acontece depois:** o sistema gera automaticamente o código da issue com um prefixo por tipo (por exemplo, I
para issue, AC para ação corretiva, M para mudança, IM para impedimento e D para decisão). Ao marcar a issue como
resolvida ou fechada, a data de resolução é preenchida automaticamente. Ao mudar o status do risco, a contagem de
riscos abertos críticos do projeto muda — e isso pode alterar o semáforo de saúde do projeto.

> **Atenção:** apenas riscos com status **Aberto** e severidade igual ou maior que 15 contam para o semáforo vermelho.
> Marcar o risco como **Ocorrido** ou **Encerrado** tira o peso dele do cálculo — o que não significa que o problema
> acabou; significa que ele saiu da contagem de risco e passou a viver como issue.

### Exportar dados do SGP

Serve para levar informação a uma reunião, a uma auditoria ou a uma planilha de acompanhamento.

1. Abra a tela cujos dados você quer levar.
2. Aplique os filtros desejados **antes** de exportar — o arquivo respeita exatamente o que está na tela.
3. Clique no botão de exportação da tela:

| Tela | Botão | O que sai no arquivo |
|---|---|---|
| **Visão geral › Dashboard executivo** | **Exportar** | Lista de projetos atrasados, com nome, código, gerente, progresso, progresso planejado, dias de atraso e saúde |
| **Financeiro › Lançamentos** | **Exportar CSV** | Lançamentos financeiros conforme os filtros aplicados |
| **Portfólio › Projetos** | **Exportar** | Projetos conforme os filtros aplicados |
| **Capacidades e talentos › Gap analysis** | **Exportar CSV** | Lacunas de capacidade conforme os filtros aplicados |
| **Administração › Auditoria** | **Exportar CSV** | Registros da trilha conforme os filtros aplicados |

4. Abra o arquivo baixado. Ele usa ponto e vírgula como separador e já vem preparado para abrir corretamente no Excel
   em português.
5. Se a tela informar que nada foi exportado, é porque nenhum registro corresponde aos filtros atuais — limpe os
   filtros e tente de novo.

**O que acontece depois:** a exportação da trilha de auditoria gera um registro de **Exportação**, com o seu nome, a
data e os filtros usados. Guarde o arquivo em local controlado e apague a cópia local quando ela deixar de ser
necessária.

> **Atenção:** exportar significa criar uma cópia dos dados fora do sistema. Arquivos com nomes de pessoas,
> avaliações de capacidade ou valores de custo são dados pessoais e devem ser tratados como tal.

### Entender como funciona a privacidade das suas capacidades

Serve para você decidir quem enxerga o que você sabe — e entender o efeito dessa escolha.

1. Abra **Administração › Preferências** e localize o bloco **Privacidade e capacidades**.
2. Em **Visibilidade padrão das capacidades**, escolha **Público**, **Restrito** ou **Privado**. A escolha vale para
   os seus registros de capacidade.
3. Revise o interruptor **Aceito ser recomendado em alocações** — é ele que decide se o seu perfil entra nas sugestões
   automáticas do motor de alocação.
4. Revise o interruptor **Disponível para mentoria** — é ele que faz você aparecer nas sugestões de mentor.
5. Leia o aviso **LGPD: seus dados e seu direito de contestação**, que resume como os seus dados são tratados.

**O que acontece depois:** nas listas consultadas por outras pessoas, os registros marcados como **Privado** somem, e
os marcados como **Restrito** aparecem apenas para você, para o seu gestor e para o RH. Você continua vendo tudo o que
é seu.

> **Atenção:** visibilidade é sobre exibição, não sobre mérito. Marcar tudo como **Privado** faz a matriz de skills da
> sua área parecer mais pobre do que é e reduz as suas chances de ser lembrado para tarefas em que você é forte. O
> meio-termo mais adotado é **Restrito** no conjunto geral e **Público** no que você quer que seja conhecido.

### Descobrir o que o sistema recalcula sozinho

Serve para você parar de tentar corrigir à mão números que o SGP calcula — e para saber o que realmente exige ação
sua.

1. Lembre-se da regra geral: **você informa fatos, o sistema calcula conclusões**. Você informa andamento de tarefa,
   datas, valores lançados, probabilidade e impacto de risco, horas apontadas e alocações. O sistema calcula progresso,
   saúde, custo real, indicadores, conflitos e códigos.
2. Ao terminar uma alteração, observe se o número que te incomodava mudou sozinho. Se não mudou, clique em
   **Atualizar** na tela — pode ser apenas a leitura de 30 segundos.
3. Se o que te incomoda é um número calculado a partir de um dado errado, corrija o **dado de origem**, não o número
   final.
4. Consulte a tabela de recálculos na seção **Regras de negócio** deste documento para saber exatamente o que dispara
   o quê.

**O que acontece depois:** nada fica "pendente de recalcular". O SGP não tem uma fila de processamento que você precise
acionar.

### Encontrar rapidamente qualquer registro

Serve para não perder tempo navegando por menus quando você já sabe o que procura.

1. Aperte **Ctrl+K** em qualquer tela.
2. Digite pelo menos dois caracteres do nome ou do código.
3. Percorra a seção **Registros** (projetos, programas, tarefas, capacidades, pessoas, recursos e riscos) ou a seção
   **Navegar** (telas).
4. Use **↑** e **↓** para escolher e **Enter** para abrir; **Esc** fecha.

**O que acontece depois:** o registro abre na tela correspondente. Lembre-se de que a busca respeita as suas
permissões: módulos aos quais você não tem acesso não aparecem nos resultados.

### Problemas comuns e solução

| Problema | Causa provável | O que fazer |
|---|---|---|
| Não vejo um módulo no menu | O seu perfil não tem permissão para aquele módulo, ou o grupo ficou vazio e foi ocultado | Confira a matriz em [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) e fale com o administrador |
| A tela abre, mas sem nenhum dado | Filtros aplicados, período sem registros ou falta de permissão de leitura | Clique em **limpar filtros**, depois em **Atualizar**; se persistir, verifique o seu perfil |
| Os números do dashboard não batem com o meu relatório | Filtro de portfólio, programa, gerente ou área aplicado sem perceber | Clique em **limpar filtros** e em **Atualizar** |
| Alterei algo e o número não mudou | A tela está mostrando a leitura dos últimos 30 segundos | Espere meio minuto e clique em **Atualizar** |
| Esqueci a senha | Não há autoatendimento nesta versão | Peça ao administrador para redefinir em **Administração › Usuários e papéis** |
| Fui desconectado no meio do trabalho | A sessão expirou | Entre novamente; o SGP devolve você à tela onde estava |
| Meu projeto ficou vermelho sem eu mudar nada | Atraso, desvio de progresso acima de 20 pontos, três ou mais riscos abertos severidade 15+ ou estouro de orçamento | Veja a tarefa "Entender por que o meu projeto ficou vermelho" |
| O semáforo continua vermelho depois da correção | O gatilho ainda está ativo em outro critério | Revise os quatro critérios, um por um, e force o recálculo do projeto |
| Lancei um valor errado no financeiro | Erro de digitação ou classificação | **Financeiro › Lançamentos** → **Editar lançamento**; o orçamento e o custo real se ajustam sozinhos |
| Apaguei um lançamento que deveria apenas ser cancelado | Exclusão remove o registro do histórico | Recadastre o lançamento e use o **Status** **Cancelado** quando o valor existiu e foi revertido |
| O motor de matching não sugere a pessoa que eu quero | A pessoa desligou **Aceito ser recomendado em alocações**, está inativa ou tem a capacidade marcada como privada | Use **Override manual** com justificativa ou peça a ela para revisar o consentimento em **Preferências** |
| O botão **Registrar override** está bloqueado | Falta preencher a justificativa ou escolher a pessoa | Preencha **Pessoa a alocar** e **Justificativa** |
| Não consigo cadastrar uma capacidade nova | O seu perfil não tem permissão de edição do catálogo | Peça ao PMO ou ao RH; quem edita o catálogo são Administrador, PMO e RH |
| O sistema avisa que a pessoa está sobrecarregada | A soma das alocações dela passa de 100% na semana | Revise as alocações em **Alocação**; acima de 130% o conflito é classificado como crítico |
| As minhas horas não aparecem como aprovadas | O apontamento ainda está pendente de aprovação | Verifique em **Execução › Timesheet** e peça a aprovação ao responsável |
| Meu PDI não aparece para mim | O item **PDI e trilhas** é visível para todos, mas os dados exigem permissão de PDI | Fale com o RH ou com o administrador para conferir o seu perfil |
| Não consigo exportar | Nenhum registro corresponde aos filtros, ou o seu perfil não tem acesso ao módulo | Limpe os filtros; se persistir, verifique as suas permissões |
| Não encontro um registro na busca global | Menos de dois caracteres digitados, módulo sem acesso, ou nome diferente do cadastrado | Tente pelo código do projeto ou da tarefa |
| O menu lateral sumiu | Ele foi recolhido | Clique em **Expandir menu** ou aperte **Ctrl+B** |
| O texto está pequeno ou a tela está apertada | Densidade e tamanho de fonte são coisas diferentes | Ajuste a **Densidade** no menu do usuário; para leitura confortável, considere o tema **Alto contraste** |
| Preciso ver o que outra pessoa vê | Cada perfil tem um conjunto de permissões | Entre com uma conta de demonstração na aba **Contas de demonstração** da tela de login |
| A interface está com cores estranhas | Um tema personalizado foi aplicado | Menu do usuário → **Abrir editor de temas** → **Restaurar base** |
| Quero saber quem alterou um registro | A trilha de auditoria responde isso | **Administração › Auditoria**, com filtros por período e por registro |

## Campos e o que significam

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Termo de busca** | Texto digitado na busca global | Ao menos dois caracteres | Sim, para buscar |
| **Portfólio, Programa, Gerente, Área** | Filtros do dashboard executivo | Selecione; use **limpar filtros** para voltar à visão completa | Não |
| **Projeto** | Projeto ao qual o lançamento pertence | Selecione na lista | Sim, em lançamentos |
| **Orçamento vinculado** | Linha orçamentária que recebe o valor | Opcional; mantém o realizado da linha coerente | Não |
| **Tipo** | Despesa ou receita | Escolha conforme a natureza do lançamento | Sim, em lançamentos |
| **Status** | Previsto, Comprometido, Realizado ou Cancelado | Use **Cancelado** quando o valor existiu e foi revertido | Não |
| **Descrição** | Identificação curta do lançamento | Escreva de forma reconhecível em relatório | Sim, em lançamentos |
| **Valor (R$)** | Valor do lançamento | Informe o valor; o sinal é definido pelo tipo | Sim, em lançamentos |
| **Competência** | Data a que o valor se refere | Informe a data | Sim, em lançamentos |
| **Pagamento** | Data efetiva de pagamento | Preenchida automaticamente na aprovação quando estiver vazia | Não |
| **Categoria** | Classificação usada nas análises do painel financeiro | Escolha uma categoria existente | Não |
| **Fornecedor / cliente** | Contraparte do lançamento | Preencha quando aplicável | Não |
| **Documento / NF** | Número do documento fiscal | Preencha quando aplicável | Não |
| **Centro de custo** | Centro de custo contábil | Preencha conforme a sua organização | Não |
| **Recorrente** | Indica lançamento que se repete | Ligue quando for o caso | Não |
| **Pessoa a alocar** | Quem você quer alocar no override | Selecione na lista; a pessoa recomendada pelo motor aparece marcada | Sim, no override |
| **Percentual** | Quanto do tempo da pessoa será dedicado | Informe o percentual do período | Sim, no override |
| **Início e Fim** | Vigência da alocação | Informe as duas datas | Sim, no override |
| **Justificativa** | Motivo da decisão fora do padrão | Escreva de forma objetiva e verificável | Sim, no override e em decisões de exceção |
| **Nome da capacidade** | Como a competência aparece no catálogo | Use um nome claro e único, evitando sinônimos | Sim, ao cadastrar capacidade |
| **Categoria da capacidade** | Agrupamento no catálogo | Escolha a categoria mais próxima | Sim, ao cadastrar capacidade |
| **Criticidade** | O quanto a organização depende daquela capacidade | Use os níveis previstos; criticidade alta entra nos alertas de bus factor | Não |
| **Probabilidade** | Chance de o risco acontecer, de 1 a 5 | Ajuste conforme a evidência mais recente | Sim, em riscos |
| **Impacto** | Gravidade caso o risco aconteça, de 1 a 5 | Ajuste conforme o efeito no projeto | Sim, em riscos |
| **Estratégia** | Evitar, Mitigar, Transferir, Aceitar, Explorar, Elevar ou Compartilhar | Escolha a resposta planejada | Não |
| **Plano de resposta** | O que será feito para reduzir o risco | Descreva ações concretas e responsáveis | Não |
| **Plano de contingência** | O que será feito se o risco acontecer | Descreva o plano alternativo | Não |
| **Visibilidade padrão das capacidades** | Exposição dos seus registros de capacidade | Escolha Público, Restrito ou Privado | Não |
| **Aceito ser recomendado em alocações** | Consentimento para uso em recomendações | Ligue ou desligue | Não |
| **Disponível para mentoria** | Aparição nas sugestões de mentor | Ligue ou desligue | Não |
| **Filtros** (exportação) | Recorte aplicado antes de gerar o arquivo | Ajuste antes de exportar; o arquivo respeita o que está na tela | Não |

## Regras de negócio

### O que o sistema recalcula automaticamente

| Quando você faz isto | O sistema recalcula sozinho |
|---|---|
| Atualiza o andamento de uma tarefa | Progresso do projeto, ponderado pelo esforço estimado das tarefas, e o semáforo de saúde |
| Conclui ou reabre uma tarefa | Progresso do projeto e saúde; as tarefas atrasadas desaparecem ou reaparecem nas listas |
| Altera datas de tarefa ou de projeto | Progresso planejado, atraso e saúde do projeto |
| Altera dependências entre tarefas | Caminho crítico e datas calculadas do cronograma |
| Cria, altera, aprova ou exclui um lançamento | Valor realizado da linha orçamentária, custo real do projeto, situação do orçamento (verde até 90%, amarelo até 100%, vermelho acima de 100%) e saúde do projeto |
| Cria ou altera uma alocação | Conflitos de sobrecarga da semana, mapa de ocupação da equipe e capacidade disponível |
| Aprova horas no timesheet | Custo por projeto e ocupação da pessoa |
| Altera probabilidade ou impacto de um risco | Severidade, nível, cor, severidade residual e a contagem de riscos críticos do projeto |
| Muda o status de um risco | Contagem de riscos abertos críticos e, por consequência, a saúde do projeto |
| Cria uma issue | Código automático conforme o tipo; ao concluir, a data de resolução |
| Altera o andamento de uma ação de PDI | Progresso do plano de desenvolvimento |
| Executa o motor de matching | Score, classificação, penalidades e justificativa de cada candidato |

### Por que os números podem parecer diferentes entre telas

O **Dashboard executivo** aplica os filtros de portfólio, programa, gerente e área escolhidos na tela. O **Meu painel**
mostra apenas o que é seu. O **Financeiro** trabalha com três valores distintos que não podem ser somados
indistintamente: **previsto**, **comprometido** e **realizado**. E a lista de **Projetos** pode estar filtrada por
status, área ou gerente.

Antes de concluir que existe um erro, verifique nesta ordem: os filtros de cada tela, a data da última atualização e a
definição de cada indicador.

### Quais são os prazos de atualização

Cada tela guarda a última leitura por **30 segundos**. Dentro desse intervalo, a tela responde com a leitura anterior.
Passado o intervalo, a próxima visita busca dados novos. Alterações feitas por você atualizam automaticamente os
blocos dependentes; alterações feitas por outras pessoas aparecem na sua próxima consulta ou ao clicar em
**Atualizar**.

### Como o sistema decide a saúde de um projeto

O semáforo é recalculado a cada mudança relevante. Fica **cinza** quando o projeto está concluído, cancelado ou
arquivado. Fica **vermelho** quando o projeto está atrasado, ou quando o desvio entre progresso planejado e real passa
de 20 pontos percentuais, ou quando há três ou mais riscos abertos com severidade 15 ou mais, ou quando o custo real
ultrapassa o orçamento. Fica **amarelo** quando o desvio passa de 8 pontos ou existe pelo menos um risco aberto
severidade 15 ou mais. Fora disso, fica **verde**.

### Como o sistema mede o progresso de um projeto

O progresso é ponderado pelo **esforço estimado** de cada tarefa. Uma tarefa de 80 horas que chega a 50% contribui
muito mais para o percentual do projeto do que uma tarefa de 4 horas concluída. Quando o projeto tem um percentual
informado manualmente, esse valor prevalece sobre o cálculo.

### Quando uma alocação é considerada um conflito

O sistema soma as alocações de cada pessoa por semana, considerando as que estão propostas, confirmadas ou em execução.
Se a soma passar de **100%**, existe conflito. A partir de **130%**, o conflito é classificado como crítico. Alocações
canceladas ou encerradas não entram na conta.

### Como o risco ganha severidade e nível

A severidade é a multiplicação entre probabilidade e impacto, de 1 a 25. A classificação é: até 4, **Baixo**; de 5 a 9,
**Médio**; de 10 a 16, **Alto**; acima de 16, **Extremo**. A cor do risco na matriz vem da mesma regra.

### O que a privacidade alcança

Ao listar capacidades de outras pessoas, o sistema remove os registros marcados como **Privado** e os marcados como
**Restrito** que não pertencem a quem está consultando. O dono sempre vê tudo o que é seu. O motor de alocação só
considera pessoas ativas e que autorizaram o uso do perfil em recomendações.

### O que sempre deixa rastro

Criação, atualização, exclusão, aprovação, alocação, validação, exportação, entrada e saída do sistema ficam na trilha
de auditoria, com autor, data, valores anterior e novo, justificativa quando informada e endereço de rede de origem. A
trilha é imutável e tem retenção mínima de cinco anos. Ver e exportar também são registrados.

## Como ler os indicadores

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Em risco** | Projetos com saúde amarela ou vermelha | Proporção alta sobre o total indica problema sistêmico, não pontual | Até 15% do total |
| **Atrasados** | Projetos com prazo vencido | Indicador objetivo: não depende de interpretação | Zero, ou com plano de recuperação registrado |
| **Progresso médio** | Conclusão média dos projetos ativos | Só faz sentido comparado ao progresso planejado | Alinhado ao planejado |
| **Desvio de progresso** | Diferença entre planejado e real, em pontos percentuais | Acima de 8 acende o amarelo; acima de 20, o vermelho | Até 8 pontos |
| **Riscos críticos abertos** | Riscos com severidade 15 ou mais e status aberto | Três ou mais no mesmo projeto levam o projeto a vermelho | Zero por projeto |
| **Consumo do orçamento** | Quanto do orçamento já foi gasto | Consumo muito acima do progresso indica estouro | Próximo ao progresso |
| **CPI médio** | Entrega por real gasto | Abaixo de 1 significa gastar mais do que entrega | Igual ou maior que 1,00 |
| **SPI médio** | Entrega por prazo planejado | Abaixo de 1 significa atraso | Igual ou maior que 1,00 |
| **Sobrealocação semanal** | Soma das alocações de uma pessoa na semana | Acima de 100% é conflito; a partir de 130%, crítico | Até 100% |
| **Taxa de override** | Frequência com que a decisão humana substitui a sugestão do motor | Taxa muito alta sugere que os pesos do motor precisam de revisão | Baixa e estável |
| **Recomendações pendentes** | Sugestões aguardando decisão | Acúmulo indica alocação sendo feita fora do sistema | Baixo e decrescente |
| **Horas da semana** | Horas apontadas contra a sua meta | Ajuda a perceber sobrecarga e subapontamento | Próximo da meta semanal |
| **Registros de Exportação** | Quantas exportações ocorreram | Cada exportação é uma cópia de dados fora do sistema | Baixo e justificado |
| **Registros de Exclusão** | Quantas exclusões ocorreram | Picos merecem investigação | Estável |

## Boas práticas

1. **Antes de reportar um erro, olhe os filtros.** É a causa mais frequente de divergência e leva cinco segundos para
   verificar.
2. **Corrija o dado de origem, não o número final.** Progresso, saúde, custo real e indicadores são consequência; se
   estão errados, o problema está no que os alimenta.
3. **Escreva justificativas que sobrevivam ao tempo.** Quem lê a trilha seis meses depois não tem o contexto da
   reunião; a justificativa é o único lugar onde ele existe.
4. **Prefira cancelar a excluir.** Excluir apaga o histórico; cancelar preserva o registro e o contexto.
5. **Encerre o risco quando ele deixa de ser risco.** Um risco ocorrido continua contando para o semáforo enquanto
   estiver aberto.
6. **Use o override com parcimônia e transparência.** O motor sugere; o gestor decide. Substituir sem justificar
   destrói a confiança na ferramenta.
7. **Revise a privacidade das suas capacidades ao entrar no sistema.** Cinco minutos no primeiro acesso evitam
   retrabalho depois.
8. **Guarde o hábito do Ctrl+K.** Saber onde a informação mora é útil; não precisar saber é melhor ainda.

## Perguntas frequentes

**1. Existe aplicativo do SGP para celular?**
Não há aplicativo nativo. A interface funciona no navegador do celular, com o menu lateral virando um botão **Menu** no
topo, mas a experiência completa é pensada para telas maiores.

**2. Consigo usar o SGP em dois navegadores ao mesmo tempo?**
Sim. As suas preferências de aparência acompanham a sua conta. Lembre-se de que a última alteração feita em uma sessão
não aparece automaticamente na outra — é preciso atualizar a tela.

**3. Por que o sistema não me deixa editar nada?**
Provavelmente você está com um perfil de consulta — Executivo ou Stakeholder são os casos típicos. Consultar não é o
mesmo que alterar. Se você acredita que deveria editar, fale com o administrador do SGP.

**4. Como faço para o sistema abrir sempre no Kanban em vez da lista?**
Abra **Administração › Preferências**, bloco **Visualizações padrão**, e escolha o formato desejado para cada módulo.
As opções incluem Lista, Kanban, Gantt, Calendário, Timeline, Matriz, Grafo e Dashboard.

**5. Posso levar os gráficos do dashboard para uma apresentação?**
Cada tela tem o seu caminho de exportação em arquivo de planilha, e as listas podem ser filtradas antes de exportar.
Não há exportação de imagem dos gráficos nesta versão.

**6. O SGP serve como sistema oficial de ponto?**
Não. O **Timesheet** registra horas por tarefa e projeto para fins de gestão e de custo, e as horas passam por
aprovação. Ele não substitui o controle de jornada formal da organização.

**7. Perdi uma informação que eu tinha certeza que existia. O que pode ter acontecido?**
Três hipóteses, em ordem de probabilidade: um filtro está aplicado; a informação está em um módulo ao qual você perdeu
acesso; ou o registro foi excluído — o que pode ser confirmado em **Administração › Auditoria**, na ação **Exclusão**.

**8. Quem aprova as minhas horas?**
Depende do processo da sua organização. No sistema, quem tiver permissão de timesheet e de edição do módulo de tarefas
consegue aprovar. Na dúvida, procure o seu líder técnico ou o gerente do projeto.

**9. Consigo recuperar um registro excluído?**
Não pela tela. O que existe é o registro da exclusão na trilha de auditoria, com os valores anteriores — o que permite
recadastrar a informação com fidelidade. Por isso, prefira **Cancelado** a excluir.

**10. O SGP avisa por e-mail quando algo muda?**
Os canais de notificação incluem aplicativo, e-mail, Microsoft Teams, Slack e push no navegador, e são ajustados em
**Preferências**, no bloco **Notificações**, conforme as regras definidas pela organização. O canal de aplicativo está
sempre disponível no sino do topo.

## O que este módulo não faz

- **Não abre chamado de suporte nem registra ticket.** Dúvidas de acesso vão para o administrador; dúvidas de regra de
  negócio, para o PMO; dúvidas de capacidade e privacidade, para o RH.
- **Não substitui treinamento.** Ele responde dúvidas pontuais; a formação no uso do sistema continua sendo necessária.
- **Não desfaz operações.** Não existe botão de "desfazer" no SGP. O caminho é corrigir pela tela de origem, com o
  rastro preservado na auditoria.
- **Não recupera registros excluídos.** A trilha mostra o que foi excluído e com quais valores, mas a restauração é
  manual.
- **Não explica decisões do motor de matching além do que está na justificativa.** Se o score surpreender de forma
  recorrente, o caminho é revisar os pesos por modo com o PMO.
- **Não atualiza em tempo real entre pessoas.** Alterações feitas por outra pessoa aparecem na sua próxima consulta.
- **Não substitui os sistemas oficiais de RH, contabilidade ou ponto.** Ele consolida a visão de projetos,
  capacidades e custos de projeto.
- **Não garante conformidade jurídica sozinho.** Ele oferece privacidade, consentimento, contestação e trilha; a
  conformidade com a LGPD depende também de processos e políticas da organização.

## Veja também

- [Visão geral e primeiros passos](../docs/01-visao-geral-e-primeiros-passos.md) — login, navegação, busca global,
  notificações, temas e densidade.
- [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — perfis, matriz de permissões,
  escopos, privacidade, LGPD e auditoria.
- [Projetos e cronograma](../docs/03-projetos-e-cronograma.md) — portfólio, programas, projetos, Gantt, marcos e
  encerramento.
- [Tarefas e execução](../docs/04-tarefas-e-execucao.md) — tarefas, Kanban, dependências, minhas tarefas e timesheet.
- [Recursos e alocação](../docs/05-recursos-e-alocacao.md) — alocação, conflitos, ocupação e motor de matching.
- [Financeiro e EVM](../docs/06-financeiro-e-evm.md) — orçamento, lançamentos, orçado × realizado, EVM e fluxo de
  caixa.
- [Riscos e issues](../docs/07-riscos-e-issues.md) — matriz de riscos, plano de resposta, risco residual e issues.
- [Capacidades e talentos](../docs/08-capacidades-e-talentos.md) — catálogo, níveis, avaliações, XP, matriz, gap,
  bus factor, PDI, mentorias e sucessão.
- [Dashboards e relatórios](../docs/09-dashboards-e-relatorios.md) — dashboard executivo, painéis e relatórios por
  widgets.
- [Colaboração e notificações](../docs/10-colaboracao-e-notificacoes.md) — comentários, menções, chat e regras de
  notificação.
- [Administração](../docs/11-administracao.md) — usuários, papéis, workflows, campos personalizados, integrações e
  auditoria.

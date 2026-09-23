# Integrações, API pública e análises preditivas

## Em uma frase

Este módulo liga o SGP aos outros sistemas da empresa e transforma o histórico do portfólio em previsões de prazo,
custo e risco — sempre com a mesma regra de ouro: nada sai do SGP sem que você saiba exatamente o que seria enviado.

## Para que serve

Nenhuma empresa gira em torno de um único sistema. O orçamento mora no ERP, as pessoas no sistema de RH, os cursos no
LMS, as tarefas de desenvolvimento no Jira ou no Azure DevOps, as conversas no Teams ou no Slack, os painéis no Power BI
e as agendas no Google Calendar ou no Outlook. Enquanto essas informações ficam em ilhas, alguém precisa digitá-las duas
vezes — e é aí que nascem as divergências. Este módulo existe para acabar com a digitação dupla: o que é do SGP
permanece no SGP e o que é do outro sistema é trocado automaticamente, com registro de cada troca.

O segundo valor é a **segurança para começar**. Ligar uma integração em produção sem testar é a forma mais rápida de
duplicar cadastros, sobrescrever dados bons ou disparar mensagens erradas para centenas de pessoas. Por isso toda
integração nasce em **modo simulação**: o sistema monta a requisição, grava exatamente o que seria enviado ou importado
e não chama o sistema externo. Você valida o endereço, as credenciais e o mapeamento de campos sem risco; quando
estiver tudo certo, desliga a simulação e acompanha as primeiras execuções de perto.

O terceiro valor é a **observabilidade**. Cada execução deixa um registro com quantos itens foram lidos, criados,
atualizados, ignorados e quantos deram erro, além da duração e da mensagem do conector. Quando algo falha, não é
preciso adivinhar: o histórico mostra a mensagem, o erro item a item e os detalhes da execução. A pergunta "por que o
projeto do Jira não atualizou?" passa a ter resposta em dois cliques.

O quarto valor é a **antecipação**. Com o histórico de tarefas, apontamentos, riscos e alocações, o SGP consegue
responder perguntas que a planilha não responde: qual a chance real de este projeto terminar no prazo? Quanto ele deve
custar de verdade? Quais projetos têm maior risco de atraso e por causa de quais fatores? Quantas pessoas vamos precisar
nos próximos meses? E, tão importante quanto, as recomendações do motor de alocação estão tratando todos os grupos de
forma equilibrada? As respostas são estatísticas, vêm acompanhadas das premissas e do índice de confiança do dado — e
nunca substituem a decisão humana.

## Quem usa

| Perfil | O que faz neste módulo | Frequência típica |
|---|---|---|
| **Administrador** | Configura integrações, credenciais de API e webhooks; acompanha execuções e trata erros | Sob demanda, com picos na implantação |
| **PMO** | Acompanha a saúde das integrações, valida mapeamentos e usa o benchmarking e as tendências do portfólio | Semanal |
| **Executivo (C-Level)** | Lê as previsões de prazo e custo, o risco do portfólio e as tendências | Mensal, em ciclos de governança |
| **Gerente de Projetos** | Gera previsões do projeto, lê o risco de atraso e usa a demanda de pessoas para planejar a equipe | Semanal |
| **RH / DHO** | Acompanha a importação de colaboradores e a auditoria de imparcialidade das recomendações | Mensal |
| **Líder Técnico** | Consulta o risco de atraso dos seus projetos e a demanda de pessoas | Semanal |
| **Membro de Equipe** | Consome as agendas e as notificações geradas pelas integrações | Diário |
| **Stakeholder** | Consulta o feed de calendário e recebe as mensagens publicadas nos canais | Eventual |

## Como chegar

| Caminho no menu | O que aparece ao abrir |
|---|---|
| **Administração › Integrações** | A **Central de integrações**, com os indicadores do topo e as abas **Integrações**, **Execuções**, **Eventos e webhooks** e **Catálogo**. |
| **Administração › Integrações** › **Catálogo** | Os 15 tipos de integração previstos e os blocos de exportação pronta: **Feed de calendário (.ics)** e **Dataset analítico**. |
| **Administração › Integrações** › **Eventos e webhooks** | A fila de eventos, as entregas de webhook, o cadastro de webhooks e a gestão das **credenciais de API** (token, escopos, IP permitido, expiração). |
| **Visão geral › Análises preditivas** | As abas **Previsão do projeto**, **Risco de atraso**, **Benchmarking**, **Tendências** e **Demanda de pessoas**. Exige permissão de dashboards. |
| **Recursos e alocação › Auditoria de viés** | O aviso metodológico, os indicadores, as dimensões auditadas, o bloco **Como agir** e o **Histórico de auditorias**. Exige permissão de auditoria. |

> **Atenção:** na aba **Catálogo**, a etiqueta **conector disponível** indica que existe um conector pronto para aquele
> tipo; a etiqueta **somente configuração** indica que a integração pode ser cadastrada e planejada, mas ainda não
> executa a troca. Confira sempre a etiqueta antes de prometer uma automação a alguém.

## Conceitos que você precisa conhecer

| Termo | Significado |
|---|---|
| **Integração** | O cadastro de uma conexão com um sistema externo: tipo, direção, endereço, credenciais, modo e frequência. |
| **Conector** | A peça que sabe traduzir os dados do SGP para o formato do outro sistema e vice-versa. É ele que executa a operação. |
| **Direção** | O sentido da troca: **Entrada (importa para o SGP)**, **Saída (exporta do SGP)** ou **Bidirecional**. |
| **Operação** | O que a execução faz: **Importar** (traz dados), **Exportar** (envia dados) ou **Testar** (só valida a conexão). |
| **Modo simulação** | Estado em que o conector monta a requisição e registra o que seria enviado, sem chamar o sistema externo. |
| **Modo real** | Estado em que o conector chama o sistema externo de verdade, podendo criar, alterar ou exportar registros. |
| **Mapeamento de campo** | A correspondência entre um campo do sistema externo e um campo do SGP, com a transformação aplicada no caminho. |
| **Transformação** | O ajuste feito no valor durante a importação — por exemplo, converter texto em data ou traduzir um status. |
| **Entidade alvo no SGP** | O tipo de registro do SGP que a integração manipula — por exemplo, tarefas, marcos ou apontamentos. |
| **Agendador** | O mecanismo que executa sozinho as integrações ativas quando a próxima execução vence. |
| **Execução** | Uma rodada de sincronização, com data, operação, contadores, duração e mensagem. |
| **Item lido** | Registro consultado no sistema de origem durante a execução. |
| **Item ignorado** | Registro lido que não gerou mudança — porque já estava igual, porque não foi encontrado no SGP ou porque não tinha o mapeamento necessário. |
| **Item com erro** | Registro que não pôde ser processado. Cada erro traz a referência e a mensagem. |
| **Evento** | Um acontecimento de negócio do SGP publicado para o mundo externo — por exemplo, "Tarefa concluída". |
| **Fila de eventos** | A lista de eventos aguardando entrega aos webhooks interessados. |
| **Webhook** | Um endereço de outro sistema que recebe um aviso automático a cada evento assinado. |
| **Segredo de assinatura** | A chave combinada entre o SGP e quem recebe, usada para provar que a chamada veio mesmo do SGP. |
| **Assinatura** | O código calculado sobre o conteúdo da mensagem com o segredo. Se o conteúdo mudar, a assinatura deixa de bater. |
| **Tentativa** | Cada envio de um evento a um webhook. Um mesmo evento pode ser entregue mais de uma vez em caso de falha. |
| **Feed de calendário (.ics)** | Um endereço que pode ser assinado no Google Calendar ou no Outlook para mostrar tarefas e marcos do SGP. |
| **Dataset analítico** | A relação de projetos, uma linha por projeto, pronta para consumo em ferramentas de análise. |
| **Monte Carlo** | A técnica de rodar milhares de cenários possíveis para entender a distribuição dos resultados, em vez de um único número. |
| **Percentil (P10, P50, P80, P90)** | Uma posição na distribuição: o P80, por exemplo, é o valor que só é superado em 20% dos cenários. |
| **Probabilidade de atraso** | A fração dos cenários simulados que terminam depois da data planejada. |
| **Probabilidade de estouro** | A fração dos cenários simulados cujo custo ultrapassa o orçamento aprovado. |
| **Viés calibrado** | A correção aplicada às estimativas com base no atraso que já foi observado nas tarefas concluídas. |
| **Índice de confiança** | O quanto o dado de entrada está completo. Quanto menor, mais frágil é a previsão. |
| **R²** | A qualidade do ajuste de uma projeção sobre o histórico. Vai de 0 a 1: quanto mais perto de 1, melhor a projeção descreve o passado. |
| **EAC** | A estimativa do custo final do projeto. É calculada por três métodos diferentes, que respondem a hipóteses diferentes. |
| **Score de risco de atraso** | Uma nota de 0 a 100 que resume a chance de o projeto atrasar, com os fatores que mais pesaram. |
| **Benchmarking** | A comparação entre os projetos do escopo, com destaque para os melhores e os piores em cada métrica. |
| **Percentil de desempenho** | A posição de um projeto em relação ao grupo: 100 é o melhor do conjunto naquela métrica. |
| **Tendência** | A direção de uma série ao longo dos meses: **MELHORANDO**, **ESTAVEL** ou **PIORANDO**. |
| **FTE** | Equivalente a uma pessoa em tempo integral. Meio FTE é metade da jornada de uma pessoa. |
| **Auditoria de viés** | A comparação, entre grupos de colaboradores, das recomendações geradas pelo motor de alocação. |
| **Disparidade** | A diferença percentual entre o valor de um grupo e a média geral do período. |

## Tarefas passo a passo

### Parte 1 — Integrações

O catálogo reúne os quinze tipos previstos. A coluna de direção mostra o sentido indicado; a última coluna mostra o que
a troca significa no dia a dia.

| Integração | Direção | O que troca |
|---|---|---|
| **ERP (SAP, Oracle)** | Bidirecional | Orçamento, custos e centros de custo. Na prática, envia os lançamentos financeiros já realizados, com documento, data de competência, valor, tipo, centro de custo, descrição e fornecedor. |
| **CRM (Salesforce)** | Unidirecional | Vínculo entre oportunidades comerciais e as iniciativas do portfólio. Nesta versão, o conector disponível reaproveita o fluxo financeiro do ERP. |
| **RH (Workday, Gupy, Senior)** | Bidirecional | Cargos, histórico e avaliações. Importa colaboradores com nome, cargo, área, localização, data de admissão e perfil, criando ou atualizando o cadastro da pessoa no SGP. |
| **LMS (Moodle, Cornerstone, Docebo)** | Bidirecional | Cursos e certificações. Importa conclusões de treinamento — pessoa, código do curso, data, nota e certificado — e credita a experiência correspondente. |
| **Jira** | Bidirecional | Tarefas e status. Exporta as tarefas abertas do SGP como issues e importa o status de volta, atualizando a tarefa correspondente. |
| **Azure DevOps** | Bidirecional | Itens de trabalho e builds, pelo mesmo conector do Jira. |
| **Microsoft Teams** | Unidirecional | Notificações e colaboração: publica mensagens nos canais a partir dos eventos pendentes. |
| **Slack** | Unidirecional | Notificações e colaboração: mesma lógica do Teams, no formato do Slack. |
| **Power BI / Tableau** | Unidirecional | Exportação de dados analíticos: publica uma linha por projeto, com datas, orçamento, custo real e todos os índices do EVM. |
| **Google Calendar** | Bidirecional | Agendas e marcos: gera o feed de calendário e, em modo real, envia os eventos diretamente à agenda. |
| **Microsoft Outlook** | Bidirecional | Agendas e marcos, pela mesma lógica do Google Calendar. |
| **GitHub** | Unidirecional | Commits e deploys: importa os commits do repositório e registra cada um como atividade do projeto. |
| **GitLab** | Unidirecional | Commits e pipelines, pela mesma lógica do GitHub. |
| **ESCO / SFIA** | Unidirecional | Taxonomia padronizada de capacidades: importa itens de competência com nome, descrição, sinônimos e código externo. |
| **Certificadoras (AWS, Azure, PMI)** | Unidirecional | Validação de credenciais: verifica as certificações pendentes e marca como válidas as que forem confirmadas. |

#### Configurar uma integração

Serve para criar a conexão com um sistema externo. Comece sempre em modo simulação.

1. Abra **Administração › Integrações** e clique em **Nova integração** — ou vá à aba **Catálogo**, localize o tipo
   desejado e clique em **Configurar**, que abre o formulário já com o tipo preenchido.
2. Em **Nome**, escreva como a conexão aparecerá nos cards e no histórico. Use algo reconhecível, como "Jira da
   esteira de produtos".
3. Escolha o **Tipo** e confira a **Direção**, que define a operação padrão do agendador.
4. Escreva uma **Descrição** explicando o que a integração sincroniza e por quê — isso ajuda quem herdar a configuração.
5. Informe a **URL base**, o endereço do serviço externo sem o caminho do recurso.
6. Escolha a **Autenticação** e preencha as credenciais correspondentes.
7. Se a integração manipular um tipo específico de registro, informe a **Entidade alvo no SGP**.
8. Confirme que **Modo simulação** está ligado. Esse é o estado recomendado para começar.
9. Defina a **Frequência (minutos)** entre sincronizações automáticas.
10. Escolha o **Responsável**, a pessoa que acompanhará falhas e ajustes desta conexão.
11. Ligue **Integração ativa** e salve.

**O que acontece depois:** a integração aparece como card, com o selo **simulação** ou **real** e a etiqueta **ativa** ou
**inativa**. Somente integrações ativas entram no agendador automático e em **Sincronizar todas as vencidas**.

> **Atenção:** cadastrar a integração **não** cria a conexão com o outro lado. É preciso que alguém no sistema de destino
> autorize o acesso e forneça as credenciais. Combine isso antes de prometer prazo.

#### Fazer o mapeamento de campos

Serve para dizer ao sistema qual campo do outro lado corresponde a qual campo do SGP e como o valor deve ser ajustado.

1. Abra a integração e localize a seção de **mapeamentos**. O mapeamento fica disponível depois que a integração é
   salva pela primeira vez.
2. Clique para adicionar um novo par.
3. Em **Campo externo**, informe o nome do campo no sistema de origem — por exemplo, *fields.summary*.
4. Em **Campo no SGP**, informe o campo de destino — por exemplo, *nome*.
5. Escolha a **Transformação** adequada ao tipo de dado.
6. Se a transformação for **Traduzir valor (de/para)**, preencha a **Tabela de tradução (JSON)** com os pares de/para —
   por exemplo, os nomes de status do outro sistema e os status equivalentes no SGP.
7. Preencha o **Valor padrão**, usado quando o campo vier vazio.
8. Ajuste a **Ordem** e ligue **Campo obrigatório** quando a importação precisar falhar caso o campo venha em branco.
9. Salve o par e repita para os demais campos.

**O que acontece depois:** a partir da próxima importação, cada registro externo é convertido segundo os pares
configurados. Se um campo obrigatório vier vazio, o sistema registra a pendência e o item aparece em **com erro** no
histórico, sem interromper os demais.

As transformações disponíveis são:

| Transformação | O que faz |
|---|---|
| **Sem transformação** | Mantém o valor exatamente como veio. |
| **Maiúsculas** | Converte o texto para maiúsculas. |
| **Minúsculas** | Converte o texto para minúsculas. |
| **Remover espaços** | Elimina espaços no início e no fim do texto. |
| **Converter para data** | Interpreta o valor como data. |
| **Converter para número** | Interpreta o valor como número. |
| **Converter para moeda** | Interpreta o valor como valor monetário, tratando símbolo e separadores. |
| **Converter para sim/não** | Interpreta o valor como verdadeiro ou falso. |
| **Traduzir valor (de/para)** | Substitui o valor conforme a tabela de tradução — o recurso certo para status. |
| **Localizar pessoa pelo e-mail** | Usa o e-mail para encontrar a pessoa correspondente no SGP. |
| **Localizar capacidade pelo nome** | Usa o nome para encontrar a capacidade correspondente no catálogo. |

> **Atenção:** a tabela de tradução é o ponto mais delicado de uma importação. Se o outro sistema mudar o nome de um
> status e a tradução não for atualizada, os itens passam a ser **ignorados** silenciosamente. Revise a tabela sempre
> que o sistema de origem for atualizado.

#### Testar a conexão

Serve para descobrir, antes de qualquer sincronização, se o endereço e as credenciais estão corretos.

1. No card da integração, clique em **Testar conexão**.
2. Leia a mensagem devolvida.

**O que acontece depois:** o resultado é registrado na trilha de auditoria. Com o **Modo simulação** ligado, o sistema
avisa que a conexão **não foi exercitada** e mostra a requisição prevista — ou seja, o teste só é conclusivo com a
simulação desligada e as credenciais informadas.

> **Atenção:** um teste bem-sucedido não garante que a sincronização vai funcionar. Ele prova que o endereço responde;
> não prova que os campos estão mapeados corretamente nem que as permissões do usuário de integração cobrem todas as
> operações necessárias.

#### Sincronizar agora

Serve para executar a troca sob demanda, sem esperar o agendador.

1. No card, clique em **Sincronizar agora**.
2. Escolha a **Operação**: **Importar** (traz dados do sistema externo para o SGP), **Exportar** (envia dados do SGP
   para o sistema externo) ou **Testar** (somente valida a conexão, sem mover itens).
3. Ajuste o **Limite de itens**, a quantidade máxima de registros processados nesta execução.
4. Clique em **Executar sincronização**.

**O que acontece depois:** a execução é registrada com a data, a operação, os contadores e a duração, e os indicadores
do card são atualizados. Se a integração estiver em modo real, a tela exibe um aviso vermelho antes de executar,
lembrando que registros podem ser criados ou alterados de verdade.

#### Agendar por frequência

Serve para que a troca aconteça sozinha, sem ninguém clicar em nada.

A **Frequência (minutos)** define o intervalo entre execuções automáticas. Depois de cada execução, o sistema calcula a
**Próxima** data e hora; o card mostra "nunca" quando a integração ainda não rodou e "não agendada" quando não há
próxima execução marcada. A seção **Como o agendador funciona** resume o comportamento: só integrações **ativas** entram
no agendador; o comando periódico do SGP executa o que venceu; e o botão **Sincronizar todas as vencidas**, na aba
**Execuções**, faz o mesmo sob demanda.

**Exemplo prático:** uma integração de RH com frequência de 720 minutos roda duas vezes por dia. Uma integração de
mensageria com frequência de 15 minutos publica os avisos quase em tempo real.

> **Atenção:** desligar **Integração ativa** retira a conexão do agendador imediatamente, mas não apaga nada do que já
> foi sincronizado. Use isso para pausar uma integração instável sem perder a configuração.

#### Ler o histórico de execuções e agir diante de erros

Serve para descobrir o que aconteceu em cada rodada e onde está o problema quando algo não sincroniza.

1. No card, clique em **Histórico**. O painel **Histórico de execuções** abre com o status atual, o modo e a taxa de
   sucesso da integração.
2. Percorra a lista. Cada execução mostra o status, a operação, a data e hora, a duração e os contadores
   **lidos**, **criados**, **atualizados**, **ignorados** e **com erro**.
3. Clique em **Ver detalhes** em uma execução. O painel **Detalhe da execução** abre com a **Mensagem**, os cinco
   contadores em destaque, os **Erros registrados** e os **Detalhes da execução**.
4. Use a seção **Registro bruto** quando precisar do conteúdo completo.

**O que acontece depois:** nenhuma alteração é feita. O histórico serve de base para a correção.

Como agir diante dos cenários mais comuns:

- **Todos os itens ignorados e nenhum erro.** Normalmente significa que nada mudou desde a última execução, ou que o
  mapeamento não encontrou correspondência. Confira a tabela de tradução e a **Entidade alvo no SGP**.
- **Muitos itens com erro e mensagem de rede.** O sistema externo está indisponível, o endereço mudou ou as credenciais
  expiraram. Teste a conexão e revise **URL base** e autenticação.
- **Erro de mapeamento incompleto.** Um campo marcado como **Campo obrigatório** veio vazio. Ajuste o **Valor padrão**
  ou revise a obrigatoriedade.
- **Itens criados em duplicidade.** O critério de identificação do registro não está estável. Interrompa a execução
  automática, desligue **Integração ativa** e revise o mapeamento antes de religar.
- **Status "Com erro" no card.** A última execução falhou. A mensagem do último erro aparece no próprio card, em
  destaque vermelho.

### Parte 2 — Eventos e webhooks

A aba **Eventos e webhooks** reúne três blocos: a **Fila de eventos**, as **Entregas de webhook** e os **Webhooks
configurados**. Cada evento de domínio entra em uma fila e só é considerado entregue quando todos os webhooks
interessados respondem com sucesso. Eventos sem webhook interessado são marcados como processados automaticamente.

| Evento | O que significa |
|---|---|
| **Projeto criado** | Um novo projeto entrou no portfólio. |
| **Projeto em risco** | A saúde do projeto passou para vermelho. |
| **Projeto concluído** | O projeto foi encerrado com sucesso. |
| **Tarefa criada** | Uma tarefa foi incluída no cronograma. |
| **Tarefa concluída** | Uma tarefa foi finalizada. |
| **Risco criado** | Um novo risco foi identificado. |
| **Risco crítico** | Um risco de nível alto ou extremo foi aberto. |
| **Issue criada** | Um impedimento foi registrado. |
| **Alocação criada** | Uma pessoa foi alocada em um projeto. |
| **Marco concluído** | Um marco do cronograma foi atingido. |
| **Promoção solicitada** | Uma sugestão de promoção foi aberta. |
| **Promoção aprovada** | Uma promoção foi validada pelo gestor. |
| **Treinamento concluído** | Um treinamento foi finalizado. |
| **Evidência validada** | Uma evidência de capacidade foi validada. |
| **Orçamento estourado** | O consumo ultrapassou o orçamento aprovado. |

#### Configurar um webhook

Serve para avisar outro sistema, em tempo real, quando algo acontece no SGP — por exemplo, publicar toda tarefa
concluída no canal do time ou abrir um chamado quando um risco crítico é identificado.

1. Na aba **Eventos e webhooks**, no bloco **Webhooks configurados**, clique em **Novo webhook**.
2. Preencha **Nome** e a **URL de destino** — o endereço que receberá as chamadas.
3. Preencha o **Segredo de assinatura**, a chave combinada com quem vai receber.
4. Marque os **Eventos assinados** desejados. Use **Selecionar todos** para marcar todos e **Limpar** para desmarcar.
5. Confirme **Webhook ativo** e salve.

**O que acontece depois:** cada evento marcado passa a ser entregue ao endereço. Sem nenhum evento marcado, o webhook
recebe **todos os eventos** — útil para um coletor genérico, mas perigoso se o destino não souber lidar com volume.

#### Usar a assinatura para validar a origem

Serve para quem recebe ter certeza de que a chamada veio mesmo do SGP e de que o conteúdo não foi alterado no caminho.

O SGP assina o conteúdo de cada entrega com o **segredo** combinado, usando um cálculo de verificação conhecido como
HMAC-SHA256, e envia o resultado em um cabeçalho da mensagem. Quem recebe repete o mesmo cálculo com o mesmo segredo e
compara os dois resultados: se forem iguais, a mensagem é autêntica e íntegra; se forem diferentes, ela deve ser
descartada. Além da assinatura, cada entrega informa qual evento a originou, o identificador da entrega e o número da
tentativa.

**Exemplo prático:** um serviço interno recebe o aviso de **Risco crítico**, recalcula a assinatura com o segredo
compartilhado, confirma que bate e só então abre o chamado no sistema de suporte. Se a assinatura não bater, o serviço
ignora a chamada e registra o ocorrido.

> **Atenção:** guarde o segredo como qualquer outra credencial — em cofre de segredos, nunca no código do receptor nem
> em uma mensagem de chat. Um segredo vazado permite que terceiros enviem mensagens falsas que passam na validação.

#### Entender tentativas, retentativa e descarte

Se o destino não responder com sucesso, o SGP tenta novamente. São até **três tentativas** por evento. Enquanto
houver falha, o evento permanece pendente e a lista **Entregas de webhook** registra cada tentativa com o status
devolvido, o tempo de resposta e o erro. Esgotadas as três tentativas, o evento é marcado como processado e
**descartado**, com a mensagem de erro guardada — ele não fica preso na fila para sempre.

**O que fazer:** corrija o destino (endereço, disponibilidade, autenticação) e use **Reprocessar** no evento desejado
para colocá-lo de volta na fila. É possível também usar **Despachar pendentes** para forçar a entrega de tudo o que
está aguardando.

#### Disparar evento de teste

Serve para validar a integração do outro lado antes de ligar um webhook em produção.

1. Na barra de ferramentas da **Fila de eventos**, escolha o tipo no seletor ao lado do botão.
2. Clique em **Disparar evento de teste**.
3. O sistema cria um evento de teste e tenta entregá-lo aos webhooks interessados.
4. Confira o resultado no bloco **Entregas de webhook**: status devolvido, tempo de resposta e erro, se houver.

**O que acontece depois:** o evento de teste aparece na fila com o título "Evento de teste disparado manualmente" e a
entrega é registrada. É a forma mais rápida de provar que o receptor está preparado — inclusive para validar a
assinatura.

### Parte 3 — Exportações prontas

Na aba **Catálogo**, o bloco **Feed de calendário (.ics)** e o bloco **Dataset analítico** entregam dados prontos, sem
depender de credenciais de terceiros.

#### Assinar o feed de calendário no Google Calendar

Serve para que tarefas e marcos do SGP apareçam na agenda da pessoa, com atualização automática.

1. Na aba **Catálogo**, clique em **Abrir link do feed .ics** e confirme que o arquivo abre com os eventos esperados.
2. Copie o endereço exibido.
3. No Google Calendar, no menu de outros calendários, escolha a opção de adicionar por URL e cole o endereço.
4. Confirme a assinatura.

**O que acontece depois:** tarefas com data de término e marcos aparecem na agenda. Cada evento traz o nome do item, a
descrição com o projeto e o percentual concluído, e a data correspondente.

#### Assinar o feed de calendário no Outlook

Serve para o mesmo objetivo, no ambiente Microsoft.

1. Copie o endereço do feed.
2. No Outlook, use a opção de **Adicionar calendário** e escolha **Assinar da Web**.
3. Cole o endereço e confirme.

**O que acontece depois:** o calendário passa a ser atualizado conforme o SGP muda.

> **Atenção:** o endereço do feed usa a sessão autenticada do navegador. Para assinar em outro aplicativo — ou em outra
> máquina —, gere uma **credencial de API** com o escopo de leitura de projetos e use-a na assinatura. Sem isso, a
> agenda de outra pessoa não conseguirá ler o feed.

#### Baixar o dataset analítico

Serve para alimentar Power BI, Tableau ou uma planilha do Excel sem digitação manual.

1. Na aba **Catálogo**, localize o bloco **Dataset analítico**.
2. Clique em **Baixar JSON** para o formato consumido por ferramentas de análise ou em **Baixar CSV** para abrir em
   planilha.
3. Opcionalmente, use os filtros de programa e de área para reduzir o conjunto.

**O que acontece depois:** o arquivo traz uma linha por projeto, com código, nome, programa, portfólio, área,
categoria, status, saúde, prioridade, gerente, datas de início e fim, percentual de conclusão, progresso planejado,
orçamento, custo real e os índices do EVM (BAC, PV, EV, AC, CPI, SPI, EAC e VAC), além da contagem de tarefas e de
riscos. O formato CSV usa ponto e vírgula como separador e já vem preparado para abrir corretamente no Excel em
português.

> **Atenção:** o dataset é um retrato do momento em que você clicou. Ele não se atualiza sozinho dentro da ferramenta de
> análise; para painéis sempre atualizados, use a integração de BI ou agende a coleta do lado da ferramenta.

### Parte 4 — Análises preditivas

#### Gerar a previsão de um projeto

Serve para responder, com base no histórico real, quando o projeto deve terminar e quanto deve custar.

1. Abra a tela **Analytics e IA preditiva**, na aba **Previsão do projeto**.
2. Escolha o projeto. A previsão combina simulação de Monte Carlo, regressão de progresso e valor agregado.
3. Leia os cartões: **Simulação de Monte Carlo**, **Regressão de progresso**, **Custo final estimado (EAC)**,
   **Risco de atraso do projeto** e **Premissas da previsão**.
4. Clique em **Salvar previsão** para gravar o cenário atual na seção **Previsões gravadas deste projeto**.

**O que acontece depois:** a previsão gravada fica disponível para comparação futura — o que o sistema previa contra o
que de fato aconteceu. Isso permite calibrar a confiança que a equipe deposita nas estimativas.

#### Ler o risco de atraso de cada projeto

Serve para priorizar a atenção do gestor onde ela faz mais diferença.

1. Na aba **Risco de atraso**, use os filtros **Programa** e **Área**.
2. Leia o aviso **Como o score é calculado** antes de interpretar os números.
3. Percorra os cartões **Críticos**, **Altos**, **Médios**, **Baixos**, **Projetos avaliados** e **Score médio**.
4. No cartão **Score de risco por projeto**, clique em um projeto para ver a lista de fatores.

**O que acontece depois:** nenhuma alteração é feita. A lista de fatores mostra exatamente o que puxou o score para
cima, o que permite atacar a causa em vez do sintoma.

#### Comparar projetos no benchmarking

Serve para descobrir quem está indo melhor, quem precisa de ajuda e o que os melhores têm em comum.

1. Na aba **Benchmarking**, use os filtros **Programa**, **Área** e **Portfólio**.
2. Leia o cartão **Distribuição das métricas**, com mínimo, P25, mediana, P75, máximo e média de cada indicador.
3. No cartão **Posição de cada projeto**, veja o valor medido e o percentil de desempenho de cada projeto.
4. Use o **Mapa de calor de desempenho** para localizar rapidamente os pontos fracos.
5. Leia **Melhores do conjunto**, **Piores do conjunto** e **Práticas observadas**.

**O que acontece depois:** nenhuma alteração é feita. As práticas observadas sempre vêm acompanhadas da evidência
numérica que as sustenta.

#### Acompanhar as tendências

Serve para saber se o portfólio está melhorando ou piorando, e em qual indicador.

1. Na aba **Tendências**, escolha o horizonte: **6 meses**, **12 meses** ou **24 meses**.
2. Filtre por **Programa**, se quiser reduzir o escopo.
3. Leia o cartão **Evolução das séries**, com o progresso médio, o CPI, o SPI, o risco médio e a ocupação média da
   equipe.

**O que acontece depois:** cada série traz a classificação **MELHORANDO**, **ESTAVEL** ou **PIORANDO** e a variação do
período. Uma série isolada em piora não é alarme; várias séries em piora ao mesmo tempo são.

#### Planejar a demanda de pessoas

Serve para responder "quantas pessoas vamos precisar nos próximos meses?" com base no que já está planejado.

1. Na aba **Demanda de pessoas**, escolha o horizonte de **6**, **12** ou **24 meses**.
2. Leia os cartões **Capacidade instalada**, **Capacidade da organização**, **Demanda média**, **Gap médio**,
   **Meses em escassez** e **Meses ociosos**.
3. No cartão **Demanda contra capacidade**, compare as duas linhas mês a mês.
4. Use o **Gap por mês** e os **Meses de pico** para decidir quando agir.
5. Leia as **Recomendações** e as **Premissas da projeção**.

**O que acontece depois:** nenhuma alocação é criada automaticamente. A projeção é um insumo para a conversa de
planejamento com as áreas.

### Parte 5 — Auditoria de viés

#### Executar a auditoria de viés

Serve para verificar se as recomendações do motor de alocação estão tratando todos os grupos de colaboradores de forma
equilibrada. É um requisito de governança e de responsabilidade no uso de automação sobre pessoas.

1. Abra a tela **Auditoria de viés das recomendações**.
2. Escolha o **Período**: **30 dias**, **90 dias**, **180 dias** ou **365 dias**.
3. Leia o **Aviso metodológico** antes de qualquer conclusão.
4. Clique em **Executar nova auditoria** para gravar o resultado e acompanhar a evolução ao longo do tempo.
5. Percorra as dimensões auditadas e o bloco **Como agir**.
6. Consulte o **Histórico de auditorias** para comparar execuções.

**O que acontece depois:** cada execução com gravação cria registros comparáveis, com métrica, grupo, amostra,
disparidade, severidade e recomendação. A execução fica registrada na trilha de auditoria do SGP.

> **Atenção:** a auditoria mede **disparidade estatística**, não prova de discriminação. Diferenças podem decorrer de
> especialização técnica, disponibilidade, região de atuação ou amostra pequena. Todo resultado exige revisão humana
> qualificada antes de qualquer decisão que afete pessoas.

## Campos e o que significam

### Integração

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Nome** | Como a conexão aparece nos cards e no histórico | Texto reconhecível | Sim |
| **Tipo** | Qual sistema externo é | Um dos quinze tipos do catálogo | Sim |
| **Direção** | Sentido da troca | **Entrada**, **Saída** ou **Bidirecional** | Não |
| **Descrição** | O que a integração sincroniza | Uma frase objetiva | Não |
| **URL base** | Endereço do serviço externo | Endereço sem o caminho do recurso | Não |
| **Autenticação** | Como o SGP se identifica no outro lado | **Sem autenticação**, **Chave de API**, **Token Bearer**, **Usuário e senha**, **OAuth 2.0**, **URL de webhook (entrada)** ou **Arquivo / planilha** | Não |
| **Entidade alvo no SGP** | Que tipo de registro a integração manipula | Texto do tipo de registro, como tarefas ou marcos | Não |
| **Modo simulação** | Se o sistema externo é realmente chamado | Ligado monta e registra a requisição; desligado executa de verdade | Não |
| **Integração ativa** | Se entra no agendador automático | Ligue quando a configuração estiver validada | Não |
| **Frequência (minutos)** | Intervalo entre execuções automáticas | Número de minutos | Não |
| **Responsável** | Quem acompanha falhas e ajustes | Seleção entre as pessoas cadastradas | Não |
| **Limite de itens** | Máximo de registros por execução | Número; o padrão é 200 | Não |

### Mapeamento de campo

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **Campo externo** | Nome do campo no sistema de origem | Texto exato, como *fields.summary* | Sim |
| **Campo no SGP** | Campo de destino no SGP | Nome do campo, como *nome* | Sim |
| **Transformação** | Ajuste aplicado ao valor | Uma das onze opções | Não |
| **Tabela de tradução (JSON)** | Pares de/para usados na tradução de valores | Lista de pares, como os status de origem e destino | Só para **Traduzir valor** |
| **Valor padrão** | Valor usado quando o campo vier vazio | Texto livre | Não |
| **Ordem** | Sequência de aplicação dos mapeamentos | Número inteiro | Não |
| **Campo obrigatório** | Se a ausência do valor gera erro | Ligue quando o dado for indispensável | Não |

### Webhook e credencial de API

| Campo | O que é | Como preencher | Obrigatório |
|---|---|---|---|
| **URL de destino** | Endereço que recebe os eventos | Endereço seguro que aceite requisições de entrada | Sim |
| **Segredo de assinatura** | Chave combinada para validar a origem | Texto secreto, guardado dos dois lados | Não |
| **Eventos assinados** | Quais eventos são entregues | Marque os desejados; nenhum marcado significa todos | Não |
| **Webhook ativo** | Se o webhook recebe entregas | Desligado, ele para de receber | Não |
| **Escopos** | Operações autorizadas na credencial | Marque o mínimo necessário, por recurso | Não |
| **IP permitido** | Origem autorizada a usar a credencial | Endereço de rede; em branco aceita qualquer origem | Não |
| **Expira em** | Quando a credencial deixa de valer | Formato de data; em branco cria sem expiração | Não |

## Regras de negócio

### Modo simulação e modo real

Esta é a decisão mais importante da tela. Em **modo simulação**, o conector monta a requisição, registra exatamente o
que seria enviado ou importado e grava a execução com status **Simulado**. Nada sai do SGP e nenhum dado externo é
gravado. É a forma segura de validar endereço, autenticação e mapeamento.

Em **modo real**, o conector chama o sistema externo de verdade a cada frequência configurada. Importações podem criar
ou alterar registros no SGP e exportações podem escrever no sistema de destino. Ligue o modo real apenas depois de um
teste de conexão bem-sucedido e de revisar os mapeamentos.

Cada card mostra o selo **simulação** ou **real** para deixar claro, sem abrir a configuração, o que aquela conexão
faz hoje. No teste de conexão, o modo simulação impede que a conexão seja exercitada — o sistema avisa isso e mostra a
requisição prevista.

### Como o mapeamento decide o destino de cada item

Para cada registro lido, o sistema percorre os pares de mapeamento configurados. Se o campo de origem vem vazio e o par
está marcado como **Campo obrigatório**, o item é registrado como pendência e aparece em **com erro**. Caso contrário, a
transformação é aplicada e, se o valor continuar vazio, entra o **Valor padrão**.

Quando a integração não tem nenhum mapeamento configurado, o registro é usado como veio. Se o registro não encontra
correspondência no SGP — por exemplo, um e-mail que não existe no cadastro —, ele é contado como **ignorado**, sem
interromper a execução.

### Como o agendador calcula a próxima execução

Cada execução bem-sucedida de uma integração ativa agenda a próxima, somando a **Frequência (minutos)** ao horário em
que a execução terminou. Integrações inativas continuam executáveis sob demanda, mas não entram no agendador. O status
da integração reflete o resultado: **Ativa** quando a última execução foi bem-sucedida, **Com erro** quando falhou e
**Sincronizando** enquanto está rodando.

### Como a fila de eventos e as tentativas funcionam

Todo evento nasce na fila com data e hora. Quando a entrega é processada, o sistema procura os webhooks ativos
interessados no tipo do evento. Se nenhum webhook se interessa, o evento é marcado como processado automaticamente. Se
há interessados, cada um recebe uma tentativa; o evento só é considerado entregue quando **todos** respondem com
sucesso. A cada rodada sem sucesso, o contador de tentativas aumenta — até o limite de **três**. Ao atingir o limite, o
evento é marcado como processado e descartado, com o erro guardado para consulta. O botão **Reprocessar** devolve o
evento à fila, zerando as tentativas.

### Análise preditiva: simulação de Monte Carlo

A simulação responde "qual a chance de este projeto terminar no prazo?" rodando até mil cenários. Em cada cenário, o
sistema sorteia uma duração possível para cada tarefa em aberto dentro de uma faixa que vai de 70% (cenário otimista) a
160% (cenário pessimista) do esforço restante planejado, com o valor mais provável no centro. Depois soma as durações
respeitando as dependências entre tarefas e observa a distribuição dos resultados.

Três detalhes tornam a simulação realista:

- **Viés calibrado.** Se as tarefas já concluídas atrasaram, em média, 18% além do planejado, esse desvio é aplicado às
  estimativas futuras. Quando não há tarefa concluída com data real registrada, não há correção — e a premissa diz isso.
- **Paralelismo limitado pela equipe.** Tarefas sem predecessora correm em paralelo, mas o ganho é limitado pelo número
  de responsáveis distintos. Equipes pequenas alongam as frentes simultâneas.
- **Custo atrelado ao atraso.** O custo final é o orçamento aprovado multiplicado por um fator sorteado, calibrado pelo
  desempenho de custo atual e agravado pelo atraso.

Para manter o tempo de resposta, projetos com muitas tarefas em aberto usam as maiores por esforço, e a premissa
correspondente aparece no resultado.

### P10, P50, P80 e P90: como ler os percentis

Os percentis descrevem a distribuição dos cenários simulados. O **P10** é o cenário otimista: apenas 10% dos cenários
terminam antes dele. O **P50** é o cenário do meio — metade termina antes, metade depois; é a estimativa mais provável.
O **P80** é o cenário com 80% de confiança: em quatro de cada cinco simulações o projeto termina até essa data. O
**P90** é o cenário pessimista, superado em apenas 10% das vezes.

Na prática, use o **P50** para conversar sobre expectativa e o **P80** para assumir compromisso público. A distância
entre o P10 e o P90 mostra a incerteza: uma faixa larga significa que as estimativas ainda são frágeis.

A **probabilidade de atraso** é a fração dos cenários que terminam depois da data planejada. A leitura executiva é:
abaixo de 25%, risco baixo; de 25% a 50%, médio; de 50% a 75%, alto; acima de 75%, crítico. A **probabilidade de
estouro** segue a mesma lógica para o orçamento: é a fração dos cenários cujo custo ultrapassa o orçamento aprovado.

O **índice de confiança** mede o quanto o dado de entrada está completo: presença de datas nas tarefas, esforço
estimado, responsável definido, datas reais de execução, dependências mapeadas, orçamento e custo real registrados.
Quanto mais baixo, mais a previsão depende de suposição — e menos ela deve ser usada para decidir.

### Previsão por regressão: a velocidade observada

A regressão olha para o passado do projeto: quantos por cento foram concluídos a cada dia desde o início da execução. A
partir dessa série, o sistema ajusta uma reta e projeta em que dia o projeto chega a 100%. O **R²** diz o quanto essa
reta descreve bem o passado: acima de 0,75 o ajuste é **ALTA**; entre 0,40 e 0,75, **MEDIA**; abaixo de 0,40, **BAIXA**.
Um ajuste baixo significa que o ritmo do projeto oscilou muito — e a data projetada deve ser lida com desconfiança.

A projeção também informa a velocidade em pontos percentuais por semana, o desvio previsto em dias contra a data
planejada e se há tendência de atraso.

Quando não há dados suficientes, a tela mostra **Regressão indisponível** com o motivo: projeto sem tarefas para compor
a série; menos de duas tarefas com datas; execução que ainda não começou; menos de três pontos de medição; ou
velocidade nula ou negativa, caso em que não há projeção de conclusão. Nesses casos, use a simulação de Monte Carlo e o
score de risco, e trabalhe para completar os dados que faltam.

### Previsão de custo: os três métodos de EAC

O EAC é a estimativa do custo final. O sistema calcula três respostas, porque cada uma embute uma hipótese diferente:

| Método | Fórmula em palavras | Quando é mais indicado |
|---|---|---|
| **Desempenho de custo se mantém** | Divide o orçamento aprovado pela eficiência de custo atual | Quando o CPI está estável em torno de 1 e a equipe deve manter o mesmo ritmo de gasto. |
| **Desempenho futuro volta ao plano** | Soma o custo já realizado ao que falta do orçamento | Quando o desvio de custo foi um evento pontual e o trabalho restante deve custar o previsto. |
| **Considera também o atraso** | Soma o custo realizado ao orçamento restante ajustado pela ineficiência de custo **e** de prazo | Quando há atraso relevante. É o cenário mais conservador. |

O sistema aponta o método **mais provável** conforme o contexto: se o SPI está abaixo de 0,95, o método que também
corrige o prazo; se o CPI está entre 0,95 e 1,05, o método de desempenho mantido; nos demais casos, o retorno ao plano.
A tela mostra ainda a média dos três, o intervalo entre o menor e o maior e a amplitude da incerteza em reais e em
percentual sobre o orçamento. Uma amplitude grande não é erro: é o retrato honesto de quanto a projeção depende da
hipótese escolhida.

### Score de risco de atraso: os sete fatores

O score vai de 0 a 100 e é a soma de sete fatores ponderados. Cada fator é normalizado entre 0 e 1, multiplicado pelo
peso e convertido em pontos. A soma dos pesos é 1,00.

| Fator | Peso | O que observa |
|---|---|---|
| **Desvio de progresso** | 0,30 | A diferença entre o percentual planejado e o realizado |
| **SPI abaixo de 1** | 0,15 | O quanto a entrega está abaixo do ritmo previsto |
| **Tarefas atrasadas** | 0,15 | A proporção de tarefas em aberto com prazo vencido |
| **Tarefas críticas atrasadas** | 0,15 | O atraso dentro do caminho crítico |
| **Riscos altos ou extremos abertos** | 0,10 | Quantos riscos graves seguem sem tratamento |
| **Sobrecarga da equipe** | 0,08 | Quantos conflitos de alocação acima de 100% existem |
| **Tarefas sem responsável ou sem data** | 0,07 | Quanto trabalho aberto ainda depende de definição |

Cada fator recebe um impacto: **ALTO** a partir de 15 pontos, **MEDIO** a partir de 8, **BAIXO** quando contribui com
algum ponto e **NENHUM** quando não contribui. A classificação final é **BAIXO** de 0 a 24, **MÉDIO** de 25 a 49,
**ALTO** de 50 a 74 e **CRÍTICO** de 75 a 100. O resumo do projeto destaca as duas causas principais, para que a ação
seja tomada sobre a causa e não sobre a nota.

### Como o benchmarking é calculado

O benchmarking compara os projetos do escopo em sete métricas: CPI, SPI, desvio de prazo em dias, consumo orçamentário,
densidade de riscos por mês, densidade de issues por mês e progresso realizado. Para cada métrica, o sistema devolve
mínimo, P25, mediana, P75, máximo, média e o tamanho da amostra.

O **percentil de desempenho** posiciona cada projeto dentro do conjunto: 100 é o melhor, 0 é o pior. Em métricas em que
menor é melhor — como desvio de prazo, consumo orçamentário e densidade de riscos — a posição é invertida para que a
leitura continue sendo "quanto maior, melhor". O **índice geral** é a média dos percentis do projeto em todas as
métricas.

O sistema lista ainda os três melhores e os três piores por métrica, os destaques — como "Referência em pontualidade" —
e as **práticas observadas** nos melhores projetos, sempre com a evidência numérica que sustenta a afirmação.

### Como as tendências são classificadas

As séries mensais são reconstruídas a partir dos registros reais: datas de conclusão das tarefas, lançamentos
financeiros, riscos abertos e alocações vigentes. Para cada série, o sistema ajusta uma reta e compara a inclinação com
um limiar de estabilidade. Se a inclinação indica melhora além do limiar, a tendência é **MELHORANDO**; se indica piora,
**PIORANDO**; caso contrário, **ESTAVEL**. Séries de risco e de ocupação são invertidas: nelas, subir é piorar.

### Como a demanda de pessoas é projetada

Para cada mês do horizonte, a demanda em FTE soma duas coisas: as alocações futuras já planejadas e as tarefas não
concluídas que ainda não têm responsável, distribuídas pelo período em que estão previstas. A oferta é a capacidade
instalada da equipe envolvida — a soma das capacidades semanais das pessoas dividida por 40 horas. A diferença é o
**gap**: acima de meio FTE positivo o mês é classificado como **ESCASSEZ**; abaixo de um FTE negativo, como
**OCIOSIDADE**; no meio, **EQUILIBRIO**.

Tarefas sem esforço informado assumem jornada integral no período previsto, e tarefas sem data são concentradas no
primeiro mês da projeção — por isso as premissas aparecem junto do resultado. Se há escassez, a recomendação indica
quantos FTE faltam e qual é o mês de pico; se há tarefas sem responsável, a recomendação pede a atribuição.

### Auditoria de viés: o que ela mede e o que não mede

A auditoria compara as recomendações geradas pelo motor de alocação entre grupos de colaboradores. Ela **mede**:
quantas recomendações cada grupo recebeu, qual a taxa de seleção (recomendações aceitas sobre o total recomendado), o
score médio recebido, a taxa de override (quando o gestor escolheu alguém diferente do topo do ranking) e a posição
média no ranking. As dimensões comparadas são **área**, **localização**, **tempo de casa** (faixas de 0 a 2, 2 a 5, 5
a 10 e mais de 10 anos), **faixa de custo/hora** e **perfil**.

A auditoria **não mede** intenção, mérito, competência nem adequação técnica. Ela não identifica culpados e não prova
discriminação. Diferenças podem decorrer de especialização técnica, disponibilidade, região de atuação, regime de
trabalho ou simplesmente de uma amostra pequena.

O aviso metodológico exibido na tela é parte obrigatória da leitura: *"Esta auditoria mede disparidade estatística entre
grupos de colaboradores e não constitui prova de discriminação. Diferenças podem decorrer de especialização técnica,
disponibilidade, região de atuação ou tamanho reduzido da amostra. Todo resultado exige revisão humana qualificada
(especificação §9.4) antes de qualquer decisão que afete pessoas."*

A **disparidade** de cada grupo é calculada como a diferença percentual entre o valor do grupo e a média geral do
período. A severidade segue três faixas: **até 15%** é **OK** (sem disparidade relevante); **de 15% a 30%** é
**ATENÇÃO**; **acima de 30%** é **CRÍTICO**. Grupos com menos de dez recomendações recebem o alerta de amostra pequena
em cada linha, e o resumo indica se o período analisado tem amostra suficiente — sem isso, conclusões são frágeis.

Cada grupo problemático recebe uma recomendação acionável, como revisar os pesos do modo Performance do motor de
alocação, incentivar o modo Desenvolvimento em tarefas de menor criticidade, levar o caso para a reunião de alocação ou
registrar a justificativa dos overrides. O bloco **Como agir** transforma isso em quatro caminhos concretos com atalho
para a tela correspondente.

## Como ler os indicadores

### Central de integrações

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Integrações** | Quantas conexões existem | Base do painel | Coerente com o parque de sistemas |
| **Com erro** | Conexões cuja última execução falhou | Exigem correção imediata | Zero |
| **Em simulação** | Conexões que não chamam o sistema externo | Estado esperado durante a validação | Alto na implantação, zero depois |
| **Itens sincronizados** | Registros criados e atualizados no total | Mede o volume efetivamente trocado | Crescente e compatível com a operação |
| **Taxa de sucesso média** | Média das taxas de sucesso das conexões | Abaixo de 90% pede investigação | Acima de 95% |
| **Eventos pendentes** | Eventos aguardando entrega | Fila crescendo indica destino indisponível | Próximo de zero |
| **Webhooks** e **Entregas de webhook** | Quantos webhooks existem e quantas tentativas houve | Falhas recorrentes apontam problema no receptor | Predominância de sucessos |

### Execuções

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Execuções** | Quantas rodadas ocorreram no filtro | Volume de atividade da integração | Compatível com a frequência configurada |
| **Itens criados** | Registros novos gerados | Picos indicam carga inicial ou duplicidade | Próximo de zero após a carga inicial |
| **Itens atualizados** | Registros alterados | Mede a sincronização corrente | Estável ao longo do tempo |
| **Itens com erro** | Registros que falharam | Cada erro precisa de causa identificada | Zero |
| **Duração média** | Tempo médio das execuções | Aumento súbito indica volume maior ou lentidão no destino | Estável |
| **Lidos**, **Ignorados** | Registros consultados e descartados | Muitos ignorados com poucos erros sugerem mapeamento frouxo | Ignorados baixos e explicáveis |

### Analytics e IA preditiva

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Probabilidade de atraso** | Fração de cenários que passam do prazo | Abaixo de 25% é risco baixo; acima de 75% é crítico | Abaixo de 25% |
| **Probabilidade de estouro de orçamento** | Fração de cenários acima do orçamento aprovado | Mesma leitura da probabilidade de atraso | Abaixo de 25% |
| **Confiança do dado** | Completude das informações de entrada | Abaixo de 40% a previsão é frágil | Acima de 70% |
| **Faixa P10-P90** | Amplitude entre o cenário otimista e o pessimista | Faixa estreita significa estimativa madura | Estreita em relação ao prazo total |
| **Score médio de risco** | Média do risco de atraso dos projetos do escopo | Serve para comparar áreas e programas | Abaixo de 25 |
| **Projetos avaliados** / **Em atenção** | Quantos projetos entraram na análise e quantos têm risco alto ou crítico | Projetos em atenção pedem plano de recuperação | Poucos em atenção, com ação registrada |
| **Séries em piora** | Quantas séries do portfólio pioraram | Uma série isolada não é alarme; várias juntas são | Zero |
| **Meses em escassez** | Meses em que a demanda supera a capacidade | Base para contratar, realocar ou repactuar prazo | Zero |
| **Grupos críticos de viés** | Grupos com disparidade acima de 30% | Exige apuração com revisão humana | Zero |

### Auditoria de viés

| Indicador | O que mede | Como interpretar | Faixa saudável |
|---|---|---|---|
| **Grupos avaliados** | Quantos grupos entraram na comparação | Base da leitura | Cobertura ampla das dimensões |
| **Registros críticos** e **em atenção** | Comparações acima de 30% e entre 15% e 30% | Prioriza a apuração | Zero críticos |
| **Sem disparidade** | Comparações abaixo de 15% | Mostra que a maior parte está equilibrada | Maioria dos registros |
| **Taxa de seleção geral** | Recomendações aceitas sobre o total | Mede a aderência dos gestores ao motor | Estável e crescente |
| **Score médio recebido** | Média do score das recomendações | Quanto maior, melhor a aderência técnica das sugestões | Estável |
| **Taxa de override** | Decisões manuais que substituíram a recomendação | Override alto e sem justificativa enfraquece o motor | Baixa, com justificativas registradas |
| **Posição média no ranking** | Em que posição média o grupo aparece | Quanto menor, melhor colocado | Distribuída entre os grupos |
| **Amostra mínima** | Se o período tem recomendações suficientes | Sem amostra suficiente, não conclua | A partir de 10 recomendações |

## Boas práticas

1. **Comece sempre em modo simulação.** Valide endereço, autenticação e mapeamento com o selo **simulação** ligado.
   Desligue apenas depois de um teste de conexão bem-sucedido e de conferir os primeiros resultados.
2. **Nomeie o responsável por cada integração.** Uma conexão sem dono é uma conexão que ninguém corrige quando falha.
3. **Revise as primeiras execuções em modo real.** Abra o **Histórico de execuções** das três primeiras rodadas e
   confirme os contadores antes de deixar a integração rodando sozinha.
4. **Trate as falhas de webhook como incidente de operação.** Uma fila de eventos crescendo significa que algum
   receptor está fora do ar e que avisos importantes não estão chegando.
5. **Proteja os segredos.** Tokens e segredos de assinatura vivem em cofre de segredos, nunca no código do receptor nem
   em mensagem de chat.
6. **Prefira escopos mínimos e prazo de validade nas credenciais de API.** Facilita revogar e reduz o estrago de um
   vazamento.
7. **Leia as premissas antes dos números.** Toda previsão traz as premissas e o índice de confiança; elas explicam por
   que o resultado é o que é.
8. **Use o P80 para compromisso e o P50 para expectativa.** Assumir a data do P50 com o cliente é o caminho mais curto
   para um atraso anunciado.
9. **Ataque os fatores, não a nota.** O score de risco é explicável justamente para que a ação seja sobre a causa —
   tarefa sem responsável, risco sem tratamento, sobrecarga da equipe.
10. **Trate a auditoria de viés como conversa de governança, não como veredito.** Leve os grupos com disparidade para a
    reunião de alocação e decida caso a caso, com justificativa registrada.

## Perguntas frequentes

**1. Ligar uma integração em modo real pode duplicar registros no SGP?**
Pode. Se o critério de identificação do registro não estiver estável, a mesma pessoa ou a mesma tarefa podem ser criadas
mais de uma vez. Por isso o caminho seguro é validar em modo simulação, acompanhar as primeiras execuções e conferir os
contadores **criados** e **ignorados**.

**2. Precisa existir alguém do outro lado para a integração funcionar?**
Sim. O SGP monta a chamada, mas quem autoriza o acesso e fornece as credenciais é a equipe que administra o sistema
externo. Um endereço que não aceita o formato da chamada não funciona por mais bem configurado que esteja o SGP.

**3. Por que todos os itens aparecem como ignorados?**
As causas mais comuns são: nada mudou desde a última execução; a tabela de tradução não cobre os valores que chegaram; o
registro de origem não encontra correspondência no SGP; ou a **Entidade alvo no SGP** está incorreta.

**4. Meu webhook não recebeu nada. Por onde começo?**
Confira se ele está **ativo**, se os eventos assinados incluem o que aconteceu e se o endereço respondeu. Use
**Disparar evento de teste** para validar a entrega ponta a ponta e ver o status devolvido.

**5. Quantas vezes o SGP tenta entregar um evento?**
Até três tentativas por evento. Depois disso, o evento é descartado e o erro fica guardado. Você pode devolvê-lo à fila
com **Reprocessar**.

**6. Preciso validar a assinatura no meu sistema?**
É fortemente recomendado. Sem validar, qualquer pessoa que descubra o endereço pode enviar mensagens falsas que o seu
sistema tratará como se viessem do SGP.

**7. O feed de calendário funciona na agenda de outra pessoa?**
O endereço padrão usa a sessão autenticada do navegador. Para assinar em outro aplicativo ou outra máquina, gere uma
credencial de API com escopo de leitura de projetos e use-a na assinatura.

**8. Por que a regressão está indisponível para um projeto que já começou?**
Faltam pontos de medição. A regressão precisa de pelo menos duas tarefas com datas e de três pontos na série. Projetos
recentes ou com poucas tarefas datadas caem nesse caso — use a simulação de Monte Carlo e o score de risco enquanto os
dados não se completam.

**9. Qual dos três EAC devo usar para reportar ao cliente?**
Depende do contexto. Com atraso relevante, o método que considera prazo e custo é o mais realista; com eficiência de
custo estável, o de desempenho mantido. Apresente o intervalo entre o menor e o maior: ele mostra honestamente o quanto
a projeção depende da hipótese.

**10. A auditoria de viés pode ser usada para questionar a conduta de um gestor?**
Não. Ela mede disparidade estatística entre grupos e não prova discriminação nem aponta culpados. Qualquer conclusão
sobre pessoas exige revisão humana qualificada e o contexto do caso.

## O que este módulo não faz

- **Não executa integrações que exigem credenciais de terceiros nesta entrega.** ERP, RH, LMS, Jira, Azure DevOps,
  GitHub, GitLab, ESCO/SFIA, certificadoras, BI e agendas operam em **modo simulação**: registram exatamente o que
  seria enviado, sem chamar o sistema externo.
- **Não faz chamadas reais para a maioria dos destinos.** As exceções são a mensageria por webhook de entrada, o feed
  de calendário e a exportação do dataset, que funcionam de ponta a ponta.
- **Não tem edição colaborativa em tempo real.** Duas pessoas editando a mesma configuração ao mesmo tempo podem
  sobrescrever a alteração uma da outra.
- **Não agenda o envio de relatórios.** O agendamento de um relatório é persistido, mas o envio é sob demanda.
- **Não garante o resultado da previsão.** A previsão é estatística: descreve o que os dados atuais permitem esperar,
  não o que vai acontecer. Mudanças de escopo, troca de equipe ou uma decisão de negócio derrubam qualquer projeção.
- **Não substitui o julgamento do gestor.** O score de risco, o benchmarking e as recomendações do motor são insumos;
  a decisão sobre pessoas continua humana, colegiada e registrada.
- **Não faz a auditoria de viés por conta própria em tempo real.** Ela é executada sob demanda, em um período escolhido,
  e o resultado só é comparável ao longo do tempo se for gravado.
- **Não envia notificações para Teams, Slack ou push sem webhook configurado.** Esses canais dependem de uma integração
  ou de um webhook ativo.
- **Não corrige automaticamente falhas de integração.** Não há nova tentativa infinita nem ajuste automático de
  mapeamento: o sistema registra o erro e espera a correção de quem é responsável.
- **Não substitui a avaliação jurídica de conformidade.** A auditoria de imparcialidade é um instrumento de governança;
  a adequação legal depende também de processos, contratos e políticas da organização.

## Veja também

- [Administração](../docs/11-administracao.md) — usuários, papéis, permissões, workflows, campos personalizados,
  credenciais de API, webhooks e trilha de auditoria.
- [Recursos e alocação](../docs/05-recursos-e-alocacao.md) — o motor de alocação inteligente, os modos Performance e
  Desenvolvimento e os conflitos de capacidade que alimentam a auditoria de viés.
- [Financeiro e EVM](../docs/06-financeiro-e-evm.md) — orçamento, lançamentos e todos os indicadores que sustentam a
  previsão de custo.
- [Dashboards e relatórios](../docs/09-dashboards-e-relatorios.md) — os painéis do portfólio, do projeto, financeiro,
  de riscos, de alocação e de capacidades.
- [Projetos e cronograma](../docs/03-projetos-e-cronograma.md) — linha de base, marcos e dependências que alimentam a
  simulação de Monte Carlo.
- [Perfis, permissões e segurança](../docs/02-perfis-permissoes-e-seguranca.md) — quem pode ver o quê, escopos de
  acesso e a trilha de auditoria.
- [Perguntas frequentes](../docs/12-perguntas-frequentes.md) — dúvidas transversais e problemas comuns.

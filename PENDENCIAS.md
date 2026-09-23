# Pendências de interface — capacidade da API × o que a tela oferece

Auditoria feita cruzando todos os `ViewSet` e `@action` do backend com as chamadas realmente feitas em
`frontend/src`. O defeito que motivou a revisão: **na tela Kanban não dava para editar nem excluir um
comentário**, embora a API aceitasse as duas operações desde o início.

O padrão a vigiar é sempre o mesmo: **capacidade existe no servidor e não chega ao usuário**, ou **a tela oferece
um botão que o servidor vai recusar**.

---

## Fechado — permissões (backend)

O habilitador foi permitir **permissão por ação** no `PermissaoSGP`: um dicionário
`permissoes_por_acao = {"destroy": "risco.excluir"}`. Antes, todo `destroy` caía em `*.editar`.

| Recurso | O que mudou |
|---|---|
| **Riscos, tarefas, projetos, marcos, issues** | `destroy` passou a exigir `risco.excluir`, `tarefa.excluir`, `projeto.excluir`. Antes um líder apagava risco, tarefa e issue sem ter essas permissões na matriz. |
| **Capacidade — avaliar/autoavaliar/endossar** | Permissão própria por ação. Caindo em `capacidade.editar`, davam 403 exatamente para membro e líder, que a matriz autoriza. |
| **Vínculo de capacidade e evidências** | O **dono** passou a poder editar o próprio vínculo (nível desejado, visibilidade, destaque), remover a capacidade do perfil e corrigir ou excluir as evidências que lançou. O nível validado continua sendo do avaliador. O serializer devolve `pode_editar`. |
| **Chat** | Criada `colaboracao.editar` (ADMIN, PMO, GERENTE, LÍDER, MEMBRO, RH) para criar sala, enviar e reagir. Com `projeto.editar`, cinco perfis recebiam 403. |
| **Timesheet** | `timesheet.aprovar` (ADMIN, PMO, GERENTE, RH) aplicada em `aprovar` e `aprovar-lote`. O gestor recebia 403 no botão que a própria tela lhe mostrava. |
| **Exceções de capacidade** | Escrita passou de `admin.ver` para `alocacao.editar`: o gestor não conseguia registrar as férias da própria equipe. |
| **Vínculos de papel** | `admin.ver` em vez de `SomenteAdmin`. A definição dos papéis segue restrita ao administrador. |
| **Capacidade semanal** | As exceções por semana passaram a **afetar o cálculo** de `capacidade_periodo`. A tabela existia e não tinha efeito nenhum. |

## Fechado — interface

| # | Recurso | O que foi feito |
|---|---|---|
| — | **Comentários** | `components/comentarios.tsx`: criar, **editar**, **excluir**, reagir, resolver e responder, com trava de autoria e marca **editado**. Kanban e projeto passaram a usar o mesmo componente. |
| 1 | **Anexos (RF-11)** | `components/anexos.tsx`: upload por arrastar-e-soltar, lista, download e exclusão, aplicado em quatro pontos. O helper de upload existia e nunca era chamado. |
| 2 | Timesheet — aprovação | Gate por permissão; **Enviar para aprovação** deixou de aprovar as próprias horas. |
| 4 | **Orçamento do projeto** | CRUD das linhas orçamentárias e **Distribuir orçamento**. O cartão vazio pedia a ação sem oferecer o botão. |
| 5 | Capacidade — avaliar/endossar | Permissão por ação e botão oculto para quem não pode. |
| 6 | Timesheet — apontar | Gate em apontar, adicionar, editar e excluir. |
| 7 | Lançamentos — escrita | Gate em criar, aprovar, editar e excluir. |
| 8 | **Riscos — excluir** | Botão com confirmação, como Issues já fazia. |
| 9 | Tokens de API | Página órfã de 903 linhas removida. |
| 10 | Projetos — excluir | Confirmação por código do projeto. |
| 11 | Marcos | **Editar** e **Excluir** na coluna de ações. |
| 12 | Checklist da tarefa | Edição inline do texto e exclusão do item. |
| 13 | Mensagens do chat | **Editar** e **Excluir**; moderação alinhada ao perfil ADMIN. |
| 15 | Treinamentos | **Novo**, editar, excluir e **Inscrever colaborador**. |
| 16 | Riscos — editar | Formulário em modo edição com todos os campos, incluindo etiquetas. |
| 17 | **Exceções de capacidade** | Tela de férias, afastamento e hora extra por semana, com CRUD. |
| 19 | Lançamentos — edição apagava dados | O formulário partia vazio e apagava observação e "recorrente". |
| 20 | Aba Equipe do projeto | **Editar alocação** (dedicação, período, papel, status). |
| 21 | Alocação | Seletor **Pessoa / recurso material** e campo **Horas planejadas**. |
| 22 | Regras de notificação | Gate de escrita e **criar/excluir regra** pela tela. |
| 23 | Vínculos de papel | **Atribuir papel** e **Remover vínculo**. |
| 24 | Integrações — escrita | Gates de `admin.ver` em tudo que escreve. |
| 25 | Vínculo de capacidade | Editar vínculo, remover capacidade e editar/excluir evidência — pelo dono ou pelos gestores. |

## Fechado — gravidade baixa

- **Duplicar tarefa** — botão com confirmação; o texto diz o que a cópia realmente leva (checklist, requisitos de capacidade, etiquetas, datas, esforço, prioridade e cor; **não** copia dependências).
- **Criar tarefa pelo Kanban** — **Nova tarefa** no cabeçalho e um **+** em cada coluna, que abre o painel já com o status da coluna.
- **Etiquetas** — campo no formulário da tarefa, com sugestões a partir das etiquetas já usadas; o filtro do Kanban passou a ter opções.
- **Comparação com baseline** — painel com seletor, indicadores de adicionadas/removidas/alteradas, desvio de prazo e de orçamento e a tabela de desvios.
- **Oportunidades** — editar, excluir e **cancelar candidatura**.
- **Sucessão** — editar e excluir posição-chave e plano de sucessão.
- **Bus factor** — **Marcar como resolvido**.
- **Issues** — seletor **Risco relacionado** no formulário.

---

## Pendente

| Item | O que falta |
|---|---|
| Baixa | **Candidatura**: o status `DESISTIU` existe no modelo e nada no backend o escreve — hoje cancelar é excluir. |
| Baixa | `/capacidades/decay/` e `regredir` sem tela. |
| Baixa | `GET /usuarios/aniversariantes/`, `/notificacoes/contagem/` e `/riscos-historico/` sem consumidor. |
| Baixa | `RegraNotificacaoViewSet` permite **editar** regra pela API; a tela cobre criar, ativar/desativar e excluir. |

## Verificado e correto

Excluir usuário desativa em vez de apagar, e o modal diz isso · papéis têm CRUD completo, inclusive permissões ·
a troca de senha funciona nos dois lados · as ações de notificação usadas pela tela existem no servidor · os
`@action` do fluxo de integrações têm botão · Analytics não oferece método que a API proíbe · Issues exclui de
ponta a ponta · a validação de promoção usa a mesma permissão nas duas pontas · o resumo de Lançamentos respeita
os filtros da listagem · conflitos de alocação são exibidos ao usuário em vez de ignorados.

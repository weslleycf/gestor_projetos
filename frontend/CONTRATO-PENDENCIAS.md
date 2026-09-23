# Contrato — fechamento das pendências de interface

Leia **PENDENCIAS.md** na raiz do projeto: é a auditoria que originou este trabalho. Cada agente recebe uma lista
de itens numerados e deve fechar **exatamente** esses.

## Regra geral

O defeito a corrigir é sempre um destes dois:

1. **A tela não oferece algo que a API já permite** → acrescente a ação.
2. **A tela oferece um botão que o servidor vai recusar com 403** → esconda ou desabilite o botão para quem não
   tem a permissão.

## Permissões — use sempre `pode()` da store de autenticação

```tsx
import { useAuth } from "@/store/auth";
const { pode } = useAuth();
…
{pode("financeiro.editar") && <Botao …>Novo lançamento</Botao>}
```

Códigos disponíveis (backend/apps/core/permissions.py é a fonte da verdade):

| Código | Quem tem |
|---|---|
| `timesheet.editar` | MEMBRO |
| `timesheet.aprovar` | ADMIN, PMO, GERENTE, RH |
| `colaboracao.editar` | ADMIN, PMO, GERENTE, LIDER, MEMBRO, RH — **novo**, para enviar mensagem no chat |
| `financeiro.editar` | ADMIN, PMO, GERENTE |
| `risco.editar` / `risco.excluir` | ADMIN, PMO, GERENTE (LIDER só tem criar/editar) |
| `tarefa.editar` / `tarefa.excluir` | ADMIN, PMO, GERENTE (LIDER só tem criar/editar) |
| `projeto.editar` / `projeto.excluir` | ADMIN, PMO (GERENTE só tem editar) |
| `capacidade.avaliar` | ADMIN, PMO, GERENTE, RH, LIDER |
| `capacidade.autoavaliar` | ADMIN, MEMBRO |
| `capacidade.endossar` | ADMIN, PMO, RH, LIDER, MEMBRO |
| `capacidade.validar` | ADMIN, PMO, GERENTE, RH |
| `capacidade.editar` | ADMIN, PMO, RH |
| `treinamento.editar` | ADMIN, RH |
| `pdi.editar` / `mentoria.editar` | ADMIN, PMO, GERENTE, LIDER, MEMBRO, RH |
| `alocacao.editar` | ADMIN, PMO, GERENTE |
| `recurso.editar` | ADMIN, PMO, GERENTE |
| `admin.ver` | ADMIN, PMO |
| `auditoria.ver` | ADMIN, PMO, EXECUTIVO, RH |

Quando a ação é **destrutiva**, além do gate use **`Modal` de confirmação** com o nome do registro, no mesmo
padrão que já existe em `Issues.tsx` (exclusão) e `Programas.tsx`.

## Convenções obrigatórias

- Siga `frontend/CONTRATO.md` (design system, componentes, tokens). Nada de `dark:`, nada de cor fixa.
- Texto em português do Brasil, rótulos iguais aos da tela vizinha.
- Use `useMutacao` de `@/hooks` para escrita e `useLista`/`useConsulta` para leitura, sempre com `invalidar`.
- Erros com `mensagemErro(erro)` e `useAvisos`; vazio com `Vazio`; carregando com `Esqueleto`/`CarregandoBloco`.
- Não invente endpoint: use os que a auditoria citou.
- **Não altere arquivos fora da sua lista** — outro agente pode estar no mesmo diretório.
- Não rode `tsc` nem build. Ao escrever, o conteúdo passa por template literal: **não use crases**.

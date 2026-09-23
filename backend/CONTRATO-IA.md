# Contrato — Assistente de IA e servidor MCP

## O que é

Um **registro único de ferramentas** sobre o domínio do SGP (projetos, tarefas, riscos, capacidade, finanças,
capacidades) com duas saídas:

1. **Assistente dentro da aplicação** — chat que responde perguntas sobre os dados do usuário, citando de onde tirou
   cada número.
2. **Servidor MCP** — as mesmas ferramentas expostas pelo *Model Context Protocol*, para uso por clientes externos
   (Claude Desktop, IDEs, agentes).

Toda ferramenta respeita a **matriz de permissões**: o assistente nunca devolve o que o usuário não pode ver.

## Endpoints

### Conversar
`POST /api/v1/ia/conversar/`
```json
{ "mensagem": "Quais projetos estão atrasados?", "conversa": 12 }
```
Resposta:
```json
{
  "conversa": 12,
  "resposta": "Encontrei 3 projetos com prazo vencido...",
  "ferramentas": [
    { "nome": "projetos_atrasados", "rotulo": "Projetos atrasados", "argumentos": {}, "resumo": "3 projeto(s)" }
  ],
  "fontes": [
    { "tipo": "projeto", "id": 42, "rotulo": "PRJ-2026-004 · Adequação à LGPD", "rota": "/projetos/42" }
  ],
  "sugestoes": ["Qual o CPI médio do portfólio?", "Quem está sobrecarregado?"],
  "provedor": "local",
  "duracao_ms": 240
}
```

### Histórico e avaliação
- `GET /api/v1/ia/conversas/` — lista as conversas do usuário (`id`, `titulo`, `criado_em`, `total_mensagens`)
- `GET /api/v1/ia/conversas/{id}/` — mensagens da conversa
- `DELETE /api/v1/ia/conversas/{id}/` — apaga a conversa
- `POST /api/v1/ia/conversas/{id}/avaliar/` — `{ "util": true, "comentario": "" }`

### Catálogo e configuração
- `GET /api/v1/ia/ferramentas/` — `{ "ferramentas": [{ "nome", "rotulo", "descricao", "categoria", "permissao", "parametros", "somente_leitura" }], "provedor": "local", "modelo": "", "disponivel": true }`
- `GET /api/v1/ia/sugestoes/` — `{ "sugestoes": ["..."] }` — perguntas recomendadas para o perfil do usuário
- `GET /api/v1/ia/configuracao/` — `{ "provedor", "modelo", "disponivel", "motivo", "mcp": { "habilitado": true, "transporte": ["stdio", "http"], "ferramentas": 24 } }`

### MCP (JSON-RPC 2.0)
`POST /api/v1/ia/mcp/` aceita `initialize`, `tools/list` e `tools/call` e devolve JSON-RPC 2.0.

## Regras de redação da resposta

- Responda em português, direto, sem jargão técnico.
- **Sempre** cite de onde veio o número ("segundo os lançamentos e o valor agregado do projeto X").
- Quando a pergunta não puder ser respondida com os dados disponíveis, diga o que falta — **nunca invente**.
- Se o usuário não tem permissão para um dado, diga que o perfil dele não acessa aquela informação.

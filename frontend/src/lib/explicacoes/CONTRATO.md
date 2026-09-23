# Contrato das explicações dos cards

Cada card do SGP (indicador, medidor, cartão de projeto, de risco, de capacidade...) ganha um **botão de ajuda**
que abre uma explicação curta. O texto vem do catálogo em `frontend/src/lib/explicacoes/*.json`.

## Regras de redação

- **Público:** usuário de negócio. Nada de jargão técnico (endpoint, JSON, API, componente).
- **Curto e direto.** É uma explicação de card, não um capítulo. `o_que_e` com 1 a 2 frases.
- **Explique o número, não o rótulo.** "Atrasados: 3" precisa dizer o que conta como atrasado e por que importa.
- **Precisão:** leia o código da tela e do backend antes de escrever. Não invente fórmula nem faixa de corte.
  - `frontend/src/pages/<Pagina>.tsx` — o card e os rótulos exatos
  - `backend/apps/<app>/models.py` e `services.py` — o cálculo real
  - `docs/<n>-<assunto>.md` — o manual, para alinhar a linguagem
- **Rótulos de tela** entre asteriscos duplos: `**Exportar**`.
- Escreva **somente** o arquivo JSON da sua lista.

## Formato

Um arquivo JSON é uma **lista** de explicações. Exemplo completo:

```json
[
  {
    "termo": "CPI",
    "sinonimos": ["CPI médio", "Índice de desempenho de custo", "custo"],
    "categoria": "Financeiro",
    "o_que_e": "Mostra quanto de valor o projeto entregou para cada real gasto. É o principal termômetro de eficiência de custo do projeto.",
    "como_ler": "Acima de 1,00 significa que você está gastando menos do que o previsto para o que já entregou. Abaixo de 1,00 significa gasto acima do previsto. A faixa saudável é a partir de 0,95; abaixo de 0,85 o sistema mostra vermelho.",
    "o_que_fazer": "Se estiver abaixo de 0,95, revise os lançamentos da categoria que mais consumiu orçamento e verifique se o escopo cresceu sem revisão de orçamento.",
    "formula": "CPI = EV ÷ AC",
    "exemplo": "EV de R$ 400 mil com AC de R$ 500 mil resulta em CPI de 0,80: cada real gasto entregou 80 centavos de valor.",
    "fonte": "Calculado a partir do valor agregado e das despesas realizadas e comprometidas."
  }
]
```

## Campos

| Campo | Obrigatório | Observação |
|---|---|---|
| `termo` | sim | O texto exato que aparece no card, como **CPI**, **Atrasados**, **Bus factor**. É a chave de busca. |
| `sinonimos` | sim | Outras formas como o mesmo número aparece no sistema. Use lista vazia se não houver. Mínimo 1 item quando o rótulo varia entre telas. |
| `categoria` | sim | Agrupa o glossário. Use: "Financeiro", "Prazos e progresso", "Riscos", "Recursos e alocação", "Capacidades", "Projetos e portfólio", "Integrações e análises". |
| `o_que_e` | sim | 1 a 2 frases. O que o número significa, em linguagem de negócio. |
| `como_ler` | sim | Como interpretar, citando as faixas reais do sistema (verde/amarelo/vermelho, limites, percentis). |
| `o_que_fazer` | opcional | Ação prática quando o valor está ruim. Omita quando o número for apenas informativo. |
| `formula` | opcional | Só quando existe uma fórmula real. Sem fórmulas inventadas. |
| `exemplo` | opcional | Um exemplo numérico concreto ajuda muito. |
| `fonte` | sim | De onde o número vem, em linguagem de negócio. Ex.: "Soma das tarefas com prazo vencido e ainda abertas." |

## JSON válido

Sem comentários, sem vírgula sobrando, aspas duplas, acentuação correta em português.

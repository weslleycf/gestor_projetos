"""Provedores de IA do assistente.

O SGP não exige nenhum serviço pago para funcionar. O provedor é escolhido por
configuração, nesta ordem:

* `SGP_IA_PROVEDOR` = `openai` | `anthropic` | `local` | `auto` (padrão).
* Em `auto`, usa um serviço externo quando houver chave configurada e cai para o
  **motor local** quando não houver.

O motor local não é um modelo de linguagem: ele interpreta a pergunta, escolhe
as ferramentas do registro e redige a resposta a partir do que elas devolvem.
Isso garante que o assistente **funcione sempre**, sem inventar números — e é o
que roda por padrão em desenvolvimento.
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from .ferramentas import REGISTRO, Resultado, executar_ferramenta, ferramentas_disponiveis


@dataclass
class ChamadaFerramenta:
    nome: str
    argumentos: dict


@dataclass
class RespostaProvedor:
    texto: str
    chamadas: list[ChamadaFerramenta]
    final: bool = False


def configuracao() -> dict:
    provedor = (os.environ.get("SGP_IA_PROVEDOR") or "auto").strip().lower()
    chave = os.environ.get("SGP_IA_CHAVE") or os.environ.get("OPENAI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY") or ""
    modelo = os.environ.get("SGP_IA_MODELO") or ""
    url = os.environ.get("SGP_IA_URL") or ""
    return {"provedor": provedor, "chave": chave, "modelo": modelo, "url": url}


def provedor_efetivo() -> tuple[str, str, str]:
    """Devolve (provedor, modelo, motivo) já resolvendo o modo automático."""
    cfg = configuracao()
    if cfg["provedor"] == "local":
        return "local", "motor local do SGP", "configurado explicitamente"
    if cfg["provedor"] == "ollama":
        return "openai", cfg["modelo"] or "llama3.1", "servidor local compatível com OpenAI"
    if cfg["provedor"] == "openai":
        if not cfg["chave"] and not cfg["url"]:
            return "local", "motor local do SGP", "nenhuma chave configurada"
        return "openai", cfg["modelo"] or "gpt-4o-mini", "chave configurada"
    if cfg["provedor"] == "anthropic":
        if not cfg["chave"]:
            return "local", "motor local do SGP", "nenhuma chave configurada"
        return "anthropic", cfg["modelo"] or "claude-3-5-sonnet-latest", "chave configurada"
    # auto
    if cfg["chave"]:
        if cfg["chave"].startswith("sk-ant"):
            return "anthropic", cfg["modelo"] or "claude-3-5-sonnet-latest", "chave Anthropic detectada"
        return "openai", cfg["modelo"] or "gpt-4o-mini", "chave OpenAI detectada"
    return "local", "motor local do SGP", "nenhuma chave configurada — usando o motor local"


# ---------------------------------------------------------------------------
# Motor local: interpreta a pergunta e escolhe as ferramentas
# ---------------------------------------------------------------------------
def _normalizar(texto: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", texto.lower()).strip()


INTENCOES: list[dict] = [
    {
        "nome": "Atrasos",
        "termos": ["atrasad", "vencid", "fora do prazo", "atraso", "atrasando"],
        "ferramentas": [("projetos_atrasados", {}), ("tarefas_atrasadas", {})],
    },
    {
        "nome": "Risco",
        "termos": ["em risco", "risco de atraso", "critico", "criticos", "riscos", "risco"],
        "ferramentas": [("riscos_criticos", {}), ("projetos_em_risco", {})],
    },
    {
        "nome": "Chance de atrasar",
        "termos": ["atrasar", "atrasa", "chance de atraso", "vai atrasar"],
        "ferramentas": [("risco_de_atraso", {})],
    },
    {
        "nome": "Custo e prazo",
        "termos": ["cpi", "spi", "evm", "valor agregado", "eac", "estouro", "custo", "orcamento", "desempenho"],
        "ferramentas": [("orcamento_consumido", {}), ("resultado_financeiro", {})],
    },
    {
        "nome": "Previsão",
        "termos": ["previsao", "prever", "vai terminar", "probabilidade", "monte carlo", "cenario"],
        "ferramentas": [("risco_de_atraso", {})],
    },
    {
        "nome": "Pessoas",
        "termos": ["sobrecarregad", "capacidade", "ocupad", "alocacao", "disponivel", "quem pode", "livre"],
        "ferramentas": [("pessoas_sobrecarregadas", {}), ("capacidades_em_falta", {})],
    },
    {
        "nome": "Concentração de conhecimento",
        "termos": ["bus factor", "concentracao", "so uma pessoa", "poucas pessoas", "dependencia"],
        "ferramentas": [("bus_factor_critico", {})],
    },
    {
        "nome": "Portfólio",
        "termos": ["portfolio", "resumo", "visao geral", "panorama", "como esta", "situacao"],
        "ferramentas": [("resumo_portfolio", {})],
    },
    {
        "nome": "Marcos",
        "termos": ["marco", "entrega", "milestone"],
        "ferramentas": [("marcos_proximos", {})],
    },
    {
        "nome": "Minhas tarefas",
        "termos": ["minhas tarefas", "o que eu tenho", "meu trabalho", "minha fila"],
        "ferramentas": [("minhas_tarefas", {})],
    },
    {
        "nome": "Issues",
        "termos": ["issue", "acao corretiva", "impedimento", "chamado"],
        "ferramentas": [("issues_abertas", {})],
    },
]


def _extrair_projeto(texto: str) -> str | None:
    """Procura um código (PRJ-2026-004) ou o nome de um projeto entre aspas."""
    codigo = re.search(r"\b([A-Z]{2,5}-\d{4}-\d{3})\b", texto.upper())
    if codigo:
        return codigo.group(1)
    aspas = re.search(r"[\"']([^\"']{3,60})[\"']", texto)
    if aspas:
        return aspas.group(1)
    return None


def decidir_local(pergunta: str, usuario) -> list[ChamadaFerramenta]:
    """Escolhe as ferramentas a executar para a pergunta."""
    texto = _normalizar(pergunta)
    disponiveis = {f.nome for f in ferramentas_disponiveis(usuario)}
    chamadas: list[ChamadaFerramenta] = []

    projeto = _extrair_projeto(pergunta)
    if projeto:
        if re.search(r"previs|probabilidade|cenario|vai terminar", texto):
            chamadas.append(ChamadaFerramenta("previsao_projeto", {"projeto": projeto}))
        elif re.search(r"cpi|spi|evm|valor agregado|eac|custo|desempenho", texto):
            chamadas.append(ChamadaFerramenta("desempenho_projeto", {"projeto": projeto}))
        else:
            chamadas.append(ChamadaFerramenta("detalhe_projeto", {"projeto": projeto}))

    # "onde" ficou de fora de propósito: aparece em perguntas de dados
    # ("onde estão as lacunas?") e desviava a resposta para o manual.
    if re.search(r"\bcomo\b|passo a passo|nao sei usar|tutorial|me ensina", texto):
        chamadas.append(ChamadaFerramenta("como_usar", {"duvida": pergunta}))

    if re.search(r"o que (e|significa)|significa|explica", texto):
        termo = re.sub(r".*?(o que (e|significa)|significa|explica)\s*", "", texto, flags=re.I).strip()
        if termo:
            chamadas.append(ChamadaFerramenta("explicar_indicador", {"termo": termo}))

    # "O que significa X?" é uma pergunta de definição: basta o explicador.
    # Somar consultas de dados aqui só polui a resposta.
    if any(c.nome == "explicar_indicador" for c in chamadas):
        return chamadas[:2]

    pontuadas = []
    for intencao in INTENCOES:
        acerto = sum(1 for termo in intencao["termos"] if termo in texto)
        if acerto:
            pontuadas.append((acerto, intencao))
    pontuadas.sort(key=lambda par: -par[0])
    for _, intencao in pontuadas[:2]:
        for nome, argumentos in intencao["ferramentas"]:
            if nome in disponiveis and not any(c.nome == nome for c in chamadas):
                chamadas.append(ChamadaFerramenta(nome, argumentos))

    if not chamadas:
        chamadas.append(ChamadaFerramenta("buscar", {"termo": pergunta.strip()[:60]}))
    return chamadas[:3]


def sintetizar_local(pergunta: str, resultados: list[tuple[str, Resultado]]) -> str:
    """Redige a resposta a partir do que as ferramentas devolveram."""
    if not resultados:
        return (
            "Não consegui encontrar uma consulta que responda a essa pergunta. "
            "Tente algo como \"quais projetos estão atrasados?\", \"como está o CPI do PRJ-2026-004?\" "
            "ou \"quem pode assumir a capacidade Python?\"."
        )

    partes = []
    for nome, resultado in resultados:
        rotulo = REGISTRO[nome].rotulo if nome in REGISTRO else nome
        if len(resultados) > 1:
            partes.append("**" + rotulo + "** — " + resultado.texto)
        else:
            partes.append(resultado.texto)
    corpo = "\n\n".join(partes)

    if len(resultados) == 1 and not resultado.fontes:
        return corpo
    return corpo


def responder_local(pergunta: str, usuario) -> tuple[str, list[dict], list[dict]]:
    """Executa as ferramentas escolhidas e devolve (texto, ferramentas usadas, fontes)."""
    usadas: list[dict] = []
    fontes: list[dict] = []
    resultados: list[tuple[str, Resultado]] = []

    for chamada in decidir_local(pergunta, usuario):
        try:
            resultado = executar_ferramenta(chamada.nome, usuario, chamada.argumentos)
        except Exception as erro:  # noqa: BLE001 — a falha de uma ferramenta não derruba a resposta
            usadas.append({"nome": chamada.nome, "rotulo": REGISTRO[chamada.nome].rotulo,
                           "argumentos": chamada.argumentos, "resumo": "não foi possível consultar",
                           "erro": str(erro)})
            continue
        usadas.append({
            "nome": chamada.nome,
            "rotulo": REGISTRO[chamada.nome].rotulo,
            "argumentos": chamada.argumentos,
            "resumo": resultado.resumo,
        })
        fontes.extend(resultado.fontes)
        resultados.append((chamada.nome, resultado))

    return sintetizar_local(pergunta, resultados), usadas, fontes[:8]


# ---------------------------------------------------------------------------
# Provedores externos (opcionais)
# ---------------------------------------------------------------------------
def _esquema_para_openai(usuario) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": f.nome,
                "description": f.descricao,
                "parameters": f.parametros,
            },
        }
        for f in ferramentas_disponiveis(usuario)
    ]


def _post_json(url: str, corpo: dict, cabecalhos: dict, tempo: int = 60) -> dict:
    dados = json.dumps(corpo).encode("utf-8")
    requisicao = urllib.request.Request(url, data=dados, method="POST")
    requisicao.add_header("Content-Type", "application/json")
    for chave, valor in cabecalhos.items():
        requisicao.add_header(chave, valor)
    with urllib.request.urlopen(requisicao, timeout=tempo) as resposta:
        return json.loads(resposta.read().decode("utf-8"))


PROMPT_SISTEMA = (
    "Você é o assistente do SGP, um sistema de gestão de projetos, portfólio e capacidades. "
    "Responda em português do Brasil, de forma direta e sem jargão técnico. "
    "Use as ferramentas disponíveis para consultar os dados reais antes de responder — nunca invente números. "
    "Cite de onde veio cada informação. Se uma ferramenta recusar por permissão, explique que o perfil do "
    "usuário não acessa aquela informação. Se não houver dados suficientes, diga o que falta."
)


def responder_openai(pergunta: str, usuario, historico: list[dict]) -> tuple[str, list[dict], list[dict]]:
    cfg = configuracao()
    _, modelo, _ = provedor_efetivo()
    base = cfg["url"] or "https://api.openai.com/v1"
    mensagens = [{"role": "system", "content": PROMPT_SISTEMA}]
    mensagens.extend(historico[-8:])
    mensagens.append({"role": "user", "content": pergunta})

    usadas: list[dict] = []
    fontes: list[dict] = []

    for _ in range(5):
        corpo = {"model": modelo, "messages": mensagens, "tools": _esquema_para_openai(usuario), "temperature": 0.2}
        try:
            resposta = _post_json(
                base.rstrip("/") + "/chat/completions",
                corpo,
                {"Authorization": "Bearer " + cfg["chave"]},
            )
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as erro:
            texto, usadas_local, fontes_local = responder_local(pergunta, usuario)
            return (
                "(O serviço de IA não respondeu — " + type(erro).__name__ + ". Segue a resposta do motor local.)\n\n" + texto,
                usadas_local,
                fontes_local,
            )

        escolha = (resposta.get("choices") or [{}])[0].get("message") or {}
        chamadas = escolha.get("tool_calls") or []
        if not chamadas:
            return escolha.get("content") or "", usadas, fontes

        mensagens.append(escolha)
        for chamada in chamadas:
            funcao = chamada.get("function") or {}
            nome = funcao.get("name") or ""
            try:
                argumentos = json.loads(funcao.get("arguments") or "{}")
            except json.JSONDecodeError:
                argumentos = {}
            try:
                resultado = executar_ferramenta(nome, usuario, argumentos)
                conteudo = resultado.texto
                resumo = resultado.resumo
                fontes.extend(resultado.fontes)
            except Exception as erro:  # noqa: BLE001
                conteudo = "Não foi possível consultar: " + str(erro)
                resumo = "falhou"
            usadas.append({"nome": nome, "rotulo": REGISTRO[nome].rotulo if nome in REGISTRO else nome,
                           "argumentos": argumentos, "resumo": resumo})
            mensagens.append({"role": "tool", "tool_call_id": chamada.get("id"), "content": conteudo})

    return "Não consegui concluir a consulta dentro do limite de passos.", usadas, fontes[:8]


def responder_anthropic(pergunta: str, usuario, historico: list[dict]) -> tuple[str, list[dict], list[dict]]:
    cfg = configuracao()
    _, modelo, _ = provedor_efetivo()
    mensagens = list(historico[-8:]) + [{"role": "user", "content": pergunta}]
    usadas: list[dict] = []
    fontes: list[dict] = []

    for _ in range(5):
        corpo = {
            "model": modelo,
            "max_tokens": 1500,
            "system": PROMPT_SISTEMA,
            "messages": mensagens,
            "tools": [
                {"name": f.nome, "description": f.descricao, "input_schema": f.parametros}
                for f in ferramentas_disponiveis(usuario)
            ],
        }
        try:
            resposta = _post_json(
                "https://api.anthropic.com/v1/messages",
                corpo,
                {"x-api-key": cfg["chave"], "anthropic-version": "2023-06-01"},
            )
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError) as erro:
            texto, usadas_local, fontes_local = responder_local(pergunta, usuario)
            return (
                "(O serviço de IA não respondeu — " + type(erro).__name__ + ". Segue a resposta do motor local.)\n\n" + texto,
                usadas_local,
                fontes_local,
            )

        blocos = resposta.get("content") or []
        texto = "".join(b.get("text", "") for b in blocos if b.get("type") == "text")
        chamadas = [b for b in blocos if b.get("type") == "tool_use"]
        if not chamadas:
            return texto, usadas, fontes

        mensagens.append({"role": "assistant", "content": blocos})
        resultados_bloco = []
        for chamada in chamadas:
            nome = chamada.get("name") or ""
            argumentos = chamada.get("input") or {}
            try:
                resultado = executar_ferramenta(nome, usuario, argumentos)
                conteudo, resumo = resultado.texto, resultado.resumo
                fontes.extend(resultado.fontes)
            except Exception as erro:  # noqa: BLE001
                conteudo, resumo = "Não foi possível consultar: " + str(erro), "falhou"
            usadas.append({"nome": nome, "rotulo": REGISTRO[nome].rotulo if nome in REGISTRO else nome,
                           "argumentos": argumentos, "resumo": resumo})
            resultados_bloco.append({"type": "tool_result", "tool_use_id": chamada.get("id"), "content": conteudo})
        mensagens.append({"role": "user", "content": resultados_bloco})

    return "Não consegui concluir a consulta dentro do limite de passos.", usadas, fontes[:8]


def responder(pergunta: str, usuario, historico: list[dict] | None = None) -> tuple[str, list[dict], list[dict], str, str]:
    """Ponto de entrada único: devolve (texto, ferramentas, fontes, provedor, modelo)."""
    provedor, modelo, _ = provedor_efetivo()
    historico = historico or []
    if provedor == "openai":
        texto, usadas, fontes = responder_openai(pergunta, usuario, historico)
    elif provedor == "anthropic":
        texto, usadas, fontes = responder_anthropic(pergunta, usuario, historico)
    else:
        texto, usadas, fontes = responder_local(pergunta, usuario)
    return texto, usadas, fontes, provedor, modelo

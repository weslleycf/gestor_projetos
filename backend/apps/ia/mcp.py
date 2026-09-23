"""Servidor MCP — expõe as ferramentas do SGP pelo Model Context Protocol.

Implementação do protocolo em JSON-RPC 2.0 sobre stdio (uso local, por clientes
como Claude Desktop e IDEs) e sobre HTTP (uso remoto, autenticado pelo mesmo JWT
da aplicação).

Os métodos implementados são os do núcleo da especificação MCP:
initialize, notifications/initialized, ping, tools/list e tools/call.
"""
from __future__ import annotations

import json
import sys
from typing import Any

from .ferramentas import REGISTRO, SemPermissao, executar_ferramenta, ferramentas_disponiveis

PROTOCOL_VERSION = "2024-11-05"
NOME_SERVIDOR = "sgp"
VERSAO_SERVIDOR = "1.0.0"

INSTRUCOES = (
    "Ferramentas de consulta do SGP (Sistema de Gestão de Projetos, Portfólio e Capacidades). "
    "Todas as consultas respeitam as permissões do usuário autenticado. "
    "Use estas ferramentas para responder sobre projetos, tarefas, riscos, alocação, orçamento, "
    "capacidades da equipe e para explicar como usar o próprio sistema."
)


def _resultado_json(id_: Any, resultado: Any) -> dict:
    return {"jsonrpc": "2.0", "id": id_, "result": resultado}


def _erro_json(id_: Any, codigo: int, mensagem: str, dados: Any = None) -> dict:
    erro: dict = {"code": codigo, "message": mensagem}
    if dados is not None:
        erro["data"] = dados
    return {"jsonrpc": "2.0", "id": id_, "error": erro}


def listar_ferramentas(usuario) -> list[dict]:
    return [
        {
            "name": f.nome,
            "description": f.descricao + (" (somente leitura)" if f.somente_leitura else ""),
            "inputSchema": f.parametros,
        }
        for f in ferramentas_disponiveis(usuario)
    ]


def tratar(mensagem: dict, usuario) -> dict | None:
    """Processa uma mensagem JSON-RPC. Devolve None para notificações."""
    metodo = mensagem.get("method")
    id_ = mensagem.get("id")
    parametros = mensagem.get("params") or {}

    if metodo == "initialize":
        return _resultado_json(id_, {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": NOME_SERVIDOR, "version": VERSAO_SERVIDOR},
            "instructions": INSTRUCOES,
        })

    if metodo in {"notifications/initialized", "initialized"}:
        return None

    if metodo == "ping":
        return _resultado_json(id_, {})

    if metodo == "tools/list":
        return _resultado_json(id_, {"tools": listar_ferramentas(usuario)})

    if metodo == "tools/call":
        nome = parametros.get("name") or ""
        argumentos = parametros.get("arguments") or {}
        if nome not in REGISTRO:
            return _erro_json(id_, -32602, "Ferramenta desconhecida: " + str(nome))
        try:
            resultado = executar_ferramenta(nome, usuario, argumentos)
        except SemPermissao as erro:
            # Recusa de permissão é resultado, não falha do protocolo: o cliente
            # precisa poder explicar ao usuário por que o dado não está acessível.
            return _resultado_json(id_, {
                "content": [{"type": "text", "text": str(erro)}],
                "isError": True,
            })
        except Exception as erro:  # noqa: BLE001
            return _resultado_json(id_, {
                "content": [{"type": "text", "text": "Não foi possível executar a ferramenta: " + str(erro)}],
                "isError": True,
            })
        return _resultado_json(id_, {
            "content": [{"type": "text", "text": resultado.texto}],
            "structuredContent": resultado.como_dicionario(),
            "isError": False,
        })

    return _erro_json(id_, -32601, "Método não suportado: " + str(metodo))


def executar_stdio(usuario, entrada=None, saida=None) -> None:
    """Laço do servidor MCP sobre stdio, uma mensagem JSON por linha."""
    entrada = entrada or sys.stdin
    saida = saida or sys.stdout
    for linha in entrada:
        linha = linha.strip()
        if not linha:
            continue
        try:
            mensagem = json.loads(linha)
        except json.JSONDecodeError:
            saida.write(json.dumps(_erro_json(None, -32700, "JSON inválido")) + "\n")
            saida.flush()
            continue
        resposta = tratar(mensagem, usuario)
        if resposta is not None:
            saida.write(json.dumps(resposta, ensure_ascii=False) + "\n")
            saida.flush()

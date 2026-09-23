"""Middleware que disponibiliza a requisição atual para a trilha de auditoria."""
from __future__ import annotations

import threading

_local = threading.local()


def requisicao_atual():
    return getattr(_local, "request", None)


def usuario_atual():
    req = requisicao_atual()
    user = getattr(req, "user", None)
    return user if user is not None and getattr(user, "is_authenticated", False) else None


def ip_atual() -> str | None:
    req = requisicao_atual()
    if req is None:
        return None
    encaminhado = req.META.get("HTTP_X_FORWARDED_FOR")
    if encaminhado:
        return encaminhado.split(",")[0].strip()
    return req.META.get("REMOTE_ADDR")


def user_agent_atual() -> str:
    req = requisicao_atual()
    return (req.META.get("HTTP_USER_AGENT", "") if req else "")[:300]


class AuditContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.request = request
        try:
            return self.get_response(request)
        finally:
            _local.request = None

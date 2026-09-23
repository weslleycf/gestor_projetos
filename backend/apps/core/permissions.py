"""RBAC do SGP (§3.8 RF-39, §10.1)."""
from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Perfil

# Matriz de permissões por perfil. O curinga "*" concede tudo.
MATRIZ_PERMISSOES: dict[str, set[str]] = {
    Perfil.ADMIN: {"*"},
    Perfil.EXECUTIVO: {
        "portfolio.ver", "programa.ver", "projeto.ver", "tarefa.ver", "recurso.ver",
        "financeiro.ver", "risco.ver", "capacidade.ver", "dashboard.ver", "relatorio.ver",
        "alocacao.ver", "auditoria.ver",
    },
    Perfil.PMO: {
        "portfolio.ver", "portfolio.criar", "portfolio.editar",
        "programa.ver", "programa.criar", "programa.editar",
        "projeto.ver", "projeto.criar", "projeto.editar", "projeto.excluir",
        "tarefa.ver", "tarefa.criar", "tarefa.editar", "tarefa.excluir",
        "recurso.ver", "recurso.criar", "recurso.editar",
        "alocacao.ver", "alocacao.criar", "alocacao.editar",
        "financeiro.ver", "financeiro.editar",
        "risco.ver", "risco.criar", "risco.editar", "risco.excluir",
        "capacidade.ver", "capacidade.criar", "capacidade.editar", "capacidade.validar",
        "dashboard.ver", "relatorio.ver", "relatorio.criar",
        "auditoria.ver", "admin.ver", "workflow.editar",
        "timesheet.aprovar", "colaboracao.editar",
    },
    Perfil.GERENTE: {
        "portfolio.ver", "programa.ver",
        "projeto.ver", "projeto.criar", "projeto.editar",
        "tarefa.ver", "tarefa.criar", "tarefa.editar", "tarefa.excluir",
        "recurso.ver", "recurso.criar", "recurso.editar",
        "alocacao.ver", "alocacao.criar", "alocacao.editar",
        "financeiro.ver", "financeiro.editar",
        "risco.ver", "risco.criar", "risco.editar", "risco.excluir",
        "capacidade.ver", "capacidade.avaliar", "capacidade.validar",
        "dashboard.ver", "relatorio.ver", "pdi.ver", "pdi.editar",
        "timesheet.aprovar", "colaboracao.editar",
    },
    Perfil.LIDER: {
        "projeto.ver", "tarefa.ver", "tarefa.criar", "tarefa.editar",
        "recurso.ver", "alocacao.ver", "alocacao.criar",
        "risco.ver", "risco.criar", "risco.editar",
        "capacidade.ver", "capacidade.avaliar", "capacidade.endossar",
        "dashboard.ver", "pdi.ver", "pdi.editar", "mentoria.editar",
        "colaboracao.editar",
    },
    Perfil.MEMBRO: {
        "projeto.ver", "tarefa.ver", "tarefa.editar",
        "capacidade.ver", "capacidade.autoavaliar", "capacidade.endossar",
        "dashboard.ver", "pdi.ver", "pdi.editar", "timesheet.editar",
        "colaboracao.editar",
    },
    Perfil.RH: {
        "capacidade.ver", "capacidade.criar", "capacidade.editar", "capacidade.validar",
        "capacidade.avaliar", "capacidade.endossar",
        "pdi.ver", "pdi.editar", "mentoria.editar", "treinamento.editar",
        "dashboard.ver", "relatorio.ver", "relatorio.criar",
        "projeto.ver", "recurso.ver", "auditoria.ver", "privacidade.editar",
        "timesheet.aprovar", "colaboracao.editar",
    },
    Perfil.STAKEHOLDER: {"projeto.ver", "tarefa.ver", "dashboard.ver", "risco.ver", "relatorio.ver"},
}


def permissoes_do_usuario(user) -> set[str]:
    if not user or not user.is_authenticated:
        return set()
    if user.is_superuser:
        return {"*"}
    perms = set(MATRIZ_PERMISSOES.get(user.perfil, set()))
    for vinculo in user.papeis.select_related("role"):
        perms.update(vinculo.role.permissoes or [])
    return perms


def tem_permissao(user, codigo: str) -> bool:
    perms = permissoes_do_usuario(user)
    return "*" in perms or codigo in perms or codigo.split(".")[0] + ".*" in perms


def pode_gerenciar_autor(user, objeto) -> bool:
    """Autor do conteúdo ou administrador da plataforma.

    Vale para qualquer registro que tenha um campo "autor" — comentários,
    mensagens de chat, anexos. A moderação é do perfil ADMIN, e não de quem tem
    a permissão genérica "admin.ver": essa permissão também é dada ao PMO, que
    passaria a poder alterar a fala de qualquer pessoa sem que isso fosse uma
    decisão explícita.
    """
    if not user or not user.is_authenticated:
        return False
    autor_id = getattr(objeto, "autor_id", None)
    if autor_id is not None and autor_id == user.pk:
        return True
    return bool(user.is_superuser) or getattr(user, "perfil", None) == Perfil.ADMIN


def pode_gerenciar_vinculo_capacidade(user, vinculo) -> bool:
    """Quem pode alterar um vínculo de capacidade de alguém.

    O próprio colaborador — para ajustar nível desejado, visibilidade e
    destaque — ou quem tem `capacidade.editar` (ADMIN, PMO, RH) para qualquer
    pessoa. O nível validado continua sendo do avaliador, não do dono.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(vinculo, "user_id", None) == user.pk:
        return True
    return tem_permissao(user, "capacidade.editar")


def pode_gerenciar_evidencia_capacidade(user, evidencia) -> bool:
    """Quem pode corrigir ou excluir uma evidência de capacidade.

    Quem lançou a evidência (o dono do vínculo ou o avaliador registrado) e quem
    administra capacidades.
    """
    if not user or not user.is_authenticated:
        return False
    vinculo = getattr(evidencia, "employee_skill", None)
    if vinculo is not None and getattr(vinculo, "user_id", None) == user.pk:
        return True
    if getattr(evidencia, "registrado_por_id", None) == user.pk:
        return True
    return tem_permissao(user, "capacidade.editar")


def pode_gerenciar_comentario(user, comentario) -> bool:
    """Quem pode editar ou excluir um comentário.

    O autor sempre pode. Quem administra a plataforma também, para conseguir
    remover conteúdo inadequado. Ninguém edita o comentário de outra pessoa —
    sem essa trava, qualquer usuário autenticado poderia reescrever o que um
    colega disse.

    A moderação é do perfil ADMIN, e não de quem tem a permissão genérica
    "admin.ver": essa permissão também é dada ao PMO, que passaria a poder
    alterar a fala de qualquer pessoa sem que isso fosse uma decisão explícita.
    """
    return pode_gerenciar_autor(user, comentario)


class PermissaoSGP(BasePermission):
    """Exige a permissão declarada na view.

    A ordem de decisão é:

    1. `permissoes_por_acao` — um dicionário como `{"destroy": "risco.excluir"}`.
       Existe porque excluir e editar são alçadas diferentes: sem isso, todo
       `destroy` caía em `*.editar` e um líder podia apagar um risco que a
       matriz não lhe permite excluir.
    2. `permissao_leitura` em métodos de leitura e `permissao_escrita` na
       escrita, com `permissao_requerida` como alternativa única.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        acao = getattr(view, "action", None)
        por_acao = getattr(view, "permissoes_por_acao", None) or {}
        codigo = por_acao.get(acao) if acao else None

        if codigo is None:
            if request.method in SAFE_METHODS:
                codigo = getattr(view, "permissao_leitura", None) or getattr(view, "permissao_requerida", None)
            else:
                codigo = getattr(view, "permissao_escrita", None) or getattr(view, "permissao_requerida", None)

        if codigo is None:
            return True
        if isinstance(codigo, (list, tuple, set)):
            return any(tem_permissao(request.user, c) for c in codigo)
        return tem_permissao(request.user, codigo)


class SomenteAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_administrador)


class SomenteLeituraOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_administrador


class PodeVerCusto(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.pode_ver_custo)

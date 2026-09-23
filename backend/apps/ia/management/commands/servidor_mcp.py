"""Servidor MCP do SGP sobre stdio.

Uso típico, para plugar em um cliente MCP (Claude Desktop, IDE, agente):

    python manage.py servidor_mcp --usuario admin@empresa.com.br

O cliente conversa por JSON-RPC 2.0, uma mensagem por linha. Todas as consultas
respeitam as permissões do usuário informado.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.core.models import User
from apps.ia import mcp


class Command(BaseCommand):
    help = "Executa o servidor MCP do SGP sobre stdio (Model Context Protocol)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--usuario",
            default="",
            help="E-mail do usuário cujas permissões serão usadas nas consultas.",
        )
        parser.add_argument(
            "--listar",
            action="store_true",
            help="Apenas lista as ferramentas expostas e sai.",
        )

    def handle(self, *args, **options):
        email = (options["usuario"] or "").strip()
        if not email:
            raise CommandError(
                "Informe o usuário com --usuario <email>. As consultas usam as permissões dele."
            )
        usuario = User.objects.filter(email__iexact=email).first()
        if not usuario:
            raise CommandError("Usuário não encontrado: " + email)
        if not usuario.is_active:
            raise CommandError("O usuário " + email + " está desativado.")

        if options["listar"]:
            self.stdout.write("Ferramentas expostas por MCP para " + usuario.nome + ":")
            for f in mcp.listar_ferramentas(usuario):
                self.stdout.write("  · " + f["name"].ljust(26) + f["description"][:70])
            return

        self.stderr.write(
            "Servidor MCP do SGP ativo (protocolo " + mcp.PROTOCOL_VERSION + ") para " + usuario.nome + "."
        )
        mcp.executar_stdio(usuario)

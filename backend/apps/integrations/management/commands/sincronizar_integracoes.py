"""Executa as integrações agendadas e entrega os eventos pendentes.

Uso típico em produção (agendador de tarefas ou cron):

    python manage.py sincronizar_integracoes                # tudo o que estiver vencido
    python manage.py sincronizar_integracoes --integracao 3 --operacao IMPORTAR
    python manage.py sincronizar_integracoes --limite 20 --sem-eventos
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.integrations.models import Integracao
from apps.integrations.services import (
    despachar_eventos,
    executar_sincronizacao,
    sincronizar_agendadas,
)


class Command(BaseCommand):
    help = "Sincroniza as integrações vencidas e entrega os webhooks pendentes."

    def add_arguments(self, parser):
        parser.add_argument("--integracao", type=int, help="Executa apenas a integração com este identificador.")
        parser.add_argument(
            "--operacao",
            choices=["AUTO", "IMPORTAR", "EXPORTAR", "TESTAR"],
            default="AUTO",
            help="Operação a executar quando --integracao é informado.",
        )
        parser.add_argument("--limite", type=int, default=200, help="Máximo de registros por integração.")
        parser.add_argument("--sem-eventos", action="store_true", help="Não entrega os webhooks pendentes.")
        parser.add_argument("--reprocessar", action="store_true", help="Reenvia eventos já processados.")

    def handle(self, *args, **options):
        inicio = timezone.now()
        self.stdout.write(self.style.MIGRATE_HEADING("SGP · sincronização de integrações"))

        if options["integracao"]:
            integracao = Integracao.objects.filter(pk=options["integracao"]).first()
            if not integracao:
                raise CommandError("Integração não encontrada: " + str(options["integracao"]))
            registros = [
                executar_sincronizacao(
                    integracao,
                    operacao=options["operacao"],
                    limite=options["limite"],
                )
            ]
        else:
            registros = sincronizar_agendadas(limite=10)

        if not registros:
            self.stdout.write("  · nenhuma integração vencida no momento")
        for registro in registros:
            estilo = self.style.SUCCESS if registro.status in {"SUCESSO", "SIMULADO", "PARCIAL"} else self.style.ERROR
            self.stdout.write(
                "  · " + registro.integracao.nome + " [" + registro.operacao + "] "
                + estilo(registro.status)
                + " — lidos " + str(registro.itens_lidos)
                + ", criados " + str(registro.itens_criados)
                + ", atualizados " + str(registro.itens_atualizados)
                + ", erros " + str(registro.itens_com_erro)
                + " (" + str(registro.duracao_segundos) + "s)"
            )
            if registro.mensagem:
                self.stdout.write("      " + registro.mensagem[:200])

        if not options["sem_eventos"]:
            resumo = despachar_eventos(limite=200, reprocessar=options["reprocessar"])
            self.stdout.write(
                "\n  Eventos: " + str(resumo["eventos"])
                + " · entregas " + str(resumo["entregas"])
                + " · sucessos " + str(resumo["sucessos"])
                + " · falhas " + str(resumo["falhas"])
                + " · sem destino " + str(resumo["sem_destino"])
                + " · descartados " + str(resumo["descartados"])
            )

        duracao = (timezone.now() - inicio).total_seconds()
        self.stdout.write(self.style.SUCCESS("\nConcluído em " + str(round(duracao, 2)) + "s."))

"""Carrega os guias de ajuda a partir dos arquivos JSON de conteudo/.

Uso:
    python manage.py carregar_ajuda              # carrega e atualiza
    python manage.py carregar_ajuda --limpar     # remove os guias antes
    python manage.py carregar_ajuda --validar    # só valida, sem gravar
"""
from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.ajuda.models import GuiaAjuda, regex_da_rota

PASTA = Path(__file__).resolve().parent.parent.parent / "conteudo"

CAMPOS_OBRIGATORIOS = ("rota", "titulo", "grupo", "resumo", "para_que_serve")
CAMPOS_LISTA = ("quando_usar", "passos", "elementos", "campos", "indicadores",
                "dicas", "limitacoes", "atalhos", "permissoes")


class Command(BaseCommand):
    help = "Carrega os guias de ajuda da aplicação a partir dos arquivos JSON."

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true", help="Remove os guias existentes antes de carregar.")
        parser.add_argument("--validar", action="store_true", help="Apenas valida os arquivos, sem gravar.")

    def handle(self, *args, **options):
        if not PASTA.exists():
            raise CommandError("Pasta de conteúdo não encontrada: " + str(PASTA))

        arquivos = sorted(PASTA.glob("*.json"))
        if not arquivos:
            raise CommandError("Nenhum arquivo JSON encontrado em " + str(PASTA))

        self.stdout.write(self.style.MIGRATE_HEADING("SGP · carregando a central de ajuda"))

        problemas: list[str] = []
        guias: list[dict] = []
        rotas_vistas: dict[str, str] = {}

        for arquivo in arquivos:
            try:
                dados = json.loads(arquivo.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                problemas.append(arquivo.name + ": JSON inválido — " + str(exc))
                continue
            if not isinstance(dados, list):
                problemas.append(arquivo.name + ": o conteúdo deve ser uma lista de guias")
                continue

            for indice, guia in enumerate(dados):
                referencia = arquivo.name + "[" + str(indice) + "]"
                if not isinstance(guia, dict):
                    problemas.append(referencia + ": cada item deve ser um objeto")
                    continue
                faltando = [campo for campo in CAMPOS_OBRIGATORIOS if not guia.get(campo)]
                if faltando:
                    problemas.append(referencia + ": campos obrigatórios ausentes — " + ", ".join(faltando))
                    continue
                rota = str(guia["rota"])
                if not rota.startswith("/"):
                    problemas.append(referencia + ": a rota deve começar com /")
                    continue
                if rota in rotas_vistas:
                    problemas.append(referencia + ": rota duplicada " + rota + " (já em " + rotas_vistas[rota] + ")")
                    continue
                rotas_vistas[rota] = arquivo.name
                if ":" in rota:
                    try:
                        regex_da_rota(rota)
                    except Exception as exc:  # pragma: no cover - proteção
                        problemas.append(referencia + ": rota com parâmetro inválida — " + str(exc))
                        continue
                for campo in CAMPOS_LISTA:
                    if campo in guia and not isinstance(guia[campo], list):
                        problemas.append(referencia + ": o campo " + campo + " deve ser uma lista")
                guia["_arquivo"] = arquivo.name
                guias.append(guia)

        if problemas:
            self.stdout.write(self.style.ERROR("\n  " + str(len(problemas)) + " problema(s) encontrado(s):"))
            for problema in problemas[:40]:
                self.stdout.write("    - " + problema)
            if options["validar"]:
                return
            raise CommandError("Corrija os problemas acima antes de carregar.")

        self.stdout.write("  · " + str(len(arquivos)) + " arquivo(s) lido(s), " + str(len(guias)) + " guia(s) válido(s)")

        if options["validar"]:
            por_grupo: dict[str, int] = {}
            for guia in guias:
                por_grupo[guia["grupo"]] = por_grupo.get(guia["grupo"], 0) + 1
            for grupo, total in sorted(por_grupo.items()):
                self.stdout.write("    " + grupo.ljust(28) + str(total).rjust(3) + " guia(s)")
            self.stdout.write(self.style.SUCCESS("\nValidação concluída — nada foi gravado."))
            return

        with transaction.atomic():
            if options["limpar"]:
                removidos, _ = GuiaAjuda.objects.all().delete()
                self.stdout.write("  · " + str(removidos) + " registro(s) anterior(es) removido(s)")

            criados = atualizados = 0
            for guia in guias:
                # Todo campo de lista é normalizado para [] e todo campo de texto
                # para "": as colunas são NOT NULL, então um guia que omite uma
                # seção opcional (elementos, campos, indicadores, atalhos) não
                # pode gravar NULL.
                dados: dict = {}
                for campo in CAMPOS_LISTA:
                    dados[campo] = list(guia.get(campo) or [])
                for campo in ("icone", "resumo", "para_que_serve", "doc"):
                    dados[campo] = guia.get(campo) or ""
                dados["titulo"] = guia["titulo"]
                dados["grupo"] = guia["grupo"]
                dados["icone"] = dados["icone"] or "help-circle"
                dados["ordem"] = int(guia.get("ordem") or 100)
                dados["ativo"] = True
                _, criado = GuiaAjuda.objects.update_or_create(rota=guia["rota"], defaults=dados)
                if criado:
                    criados += 1
                else:
                    atualizados += 1

        self.stdout.write(
            "  · criados " + str(criados) + ", atualizados " + str(atualizados)
        )
        faltando = [
            rota for rota in (
                "/login", "/", "/analytics", "/meu-painel", "/timeline", "/projetos",
                "/projetos/novo", "/projetos/:id", "/programas", "/portfolios", "/marcos",
                "/relatorios", "/minhas-tarefas", "/kanban", "/calendario", "/timesheet",
                "/colaboracao", "/alocacao", "/matching", "/recursos", "/capacidade",
                "/capacidade/:userId", "/auditoria-vies", "/financeiro", "/lancamentos",
                "/evm", "/riscos", "/issues", "/capacidades", "/capacidades/skills/:id",
                "/matriz-skills", "/gap", "/bus-factor", "/pessoas", "/pessoas/:id", "/pdi",
                "/validacoes", "/oportunidades", "/sucessao", "/integracoes", "/temas",
                "/preferencias", "/admin/usuarios", "/admin/workflows", "/admin/campos",
                "/admin/auditoria",
            )
            if rota not in rotas_vistas
        ]
        if faltando:
            self.stdout.write(self.style.WARNING(
                "\n  ! " + str(len(faltando)) + " tela(s) sem guia: " + ", ".join(faltando[:12])
                + (" ..." if len(faltando) > 12 else "")
            ))
        else:
            self.stdout.write(self.style.SUCCESS("\n  Todas as telas da aplicação têm guia."))
        self.stdout.write(self.style.SUCCESS("\nCentral de ajuda carregada."))

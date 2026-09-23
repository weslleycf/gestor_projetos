"""Central de ajuda: guias de uso por página, exibidos dentro da aplicação."""
from __future__ import annotations

import re

from django.db import models
from django.utils import timezone

from apps.core.models import User

GRUPOS = [
    ("Fundamentos", "Fundamentos"),
    ("Visão geral", "Visão geral"),
    ("Portfólio", "Portfólio"),
    ("Execução", "Execução"),
    ("Recursos e alocação", "Recursos e alocação"),
    ("Financeiro", "Financeiro"),
    ("Riscos e qualidade", "Riscos e qualidade"),
    ("Capacidades e talentos", "Capacidades e talentos"),
    ("Administração", "Administração"),
]


def regex_da_rota(rota: str) -> str:
    """Converte /projetos/:id em uma expressão que casa com /projetos/1234."""
    partes = []
    for segmento in rota.strip("/").split("/"):
        partes.append("[^/]+" if segmento.startswith(":") else re.escape(segmento))
    return "^/" + "/".join(partes) + "/?$"


class GuiaAjuda(models.Model):
    """Guia de consulta rápida de uma página da aplicação.

    O conteúdo é carregado dos arquivos JSON em apps/ajuda/conteudo pelo
    comando carregar_ajuda, e pode ser ajustado no admin sem novo deploy.
    """

    rota = models.CharField("rota", max_length=160, unique=True)
    titulo = models.CharField("título da página", max_length=160)
    grupo = models.CharField("grupo", max_length=60, choices=GRUPOS, db_index=True)
    icone = models.CharField("ícone", max_length=40, default="help-circle")

    resumo = models.CharField("resumo", max_length=300, blank=True, default="")
    para_que_serve = models.TextField("para que serve", blank=True, default="")
    quando_usar = models.JSONField("quando usar", default=list, blank=True)
    passos = models.JSONField("passo a passo", default=list, blank=True)
    elementos = models.JSONField("elementos da tela", default=list, blank=True)
    campos = models.JSONField("campos", default=list, blank=True)
    indicadores = models.JSONField("indicadores", default=list, blank=True)
    dicas = models.JSONField("dicas", default=list, blank=True)
    limitacoes = models.JSONField("o que não faz", default=list, blank=True)
    atalhos = models.JSONField("atalhos", default=list, blank=True)

    doc = models.CharField("documento do manual", max_length=120, blank=True, default="")
    permissoes = models.JSONField("permissões de acesso", default=list, blank=True)
    ordem = models.PositiveIntegerField("ordem", default=100)
    ativo = models.BooleanField("ativo", default=True, db_index=True)

    visualizacoes = models.PositiveIntegerField("visualizações", default=0)
    marcado_util = models.PositiveIntegerField("avaliações positivas", default=0)
    marcado_inutil = models.PositiveIntegerField("avaliações negativas", default=0)

    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "guia de ajuda"
        verbose_name_plural = "guias de ajuda"
        ordering = ["grupo", "ordem", "titulo"]
        indexes = [models.Index(fields=["grupo", "ordem"])]

    def __str__(self) -> str:
        return self.titulo + " (" + self.rota + ")"

    @property
    def total_avaliacoes(self) -> int:
        return self.marcado_util + self.marcado_inutil

    @property
    def percentual_util(self) -> float:
        if not self.total_avaliacoes:
            return 0.0
        return round(self.marcado_util / self.total_avaliacoes * 100, 1)

    @property
    def tamanho(self) -> int:
        """Número de blocos de conteúdo — usado para achar guias muito curtos."""
        return (
            len(self.passos or []) + len(self.dicas or []) + len(self.campos or [])
            + len(self.indicadores or []) + len(self.elementos or [])
        )

    @classmethod
    def por_caminho(cls, caminho: str):
        """Encontra o guia de uma página pelo endereço acessado."""
        if not caminho:
            return None
        limpo = caminho.split("?")[0].split("#")[0]
        if not limpo.startswith("/"):
            limpo = "/" + limpo
        exato = cls.objects.filter(rota=limpo, ativo=True).first()
        if exato:
            return exato
        # Rotas com parâmetro, como /projetos/:id, casam com /projetos/1234.
        for guia in cls.objects.filter(ativo=True, rota__contains=":"):
            if re.match(regex_da_rota(guia.rota), limpo):
                return guia
        return None


class AjudaFeedback(models.Model):
    """Avaliação do usuário sobre a utilidade de um guia."""

    guia = models.ForeignKey(GuiaAjuda, on_delete=models.CASCADE, related_name="avaliacoes")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="avaliacoes_ajuda")
    util = models.BooleanField("foi útil", default=True)
    comentario = models.TextField("comentário", blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "avaliação de guia"
        verbose_name_plural = "avaliações de guia"
        ordering = ["-criado_em"]
        unique_together = ("guia", "user")

    def __str__(self) -> str:
        return self.guia.titulo + " · " + ("útil" if self.util else "não útil")

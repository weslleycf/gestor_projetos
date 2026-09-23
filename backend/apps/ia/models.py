"""Histórico do assistente de IA."""
from __future__ import annotations

from django.db import models
from django.utils import timezone

from apps.core.models import User


class ConversaIA(models.Model):
    """Uma sessão de conversa com o assistente."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="conversas_ia")
    titulo = models.CharField("título", max_length=200, default="Nova conversa")
    criado_em = models.DateTimeField(default=timezone.now, editable=False, db_index=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "conversa com o assistente"
        verbose_name_plural = "conversas com o assistente"
        ordering = ["-atualizado_em"]

    def __str__(self) -> str:
        return self.titulo + " (" + self.user.nome + ")"

    @property
    def total_mensagens(self) -> int:
        return self.mensagens.count()


class MensagemIA(models.Model):
    """Uma fala da conversa, do usuário ou do assistente."""

    class Papel(models.TextChoices):
        USUARIO = "USUARIO", "Usuário"
        ASSISTENTE = "ASSISTENTE", "Assistente"

    conversa = models.ForeignKey(ConversaIA, on_delete=models.CASCADE, related_name="mensagens")
    papel = models.CharField(max_length=12, choices=Papel.choices)
    texto = models.TextField("texto")
    # Trilha de auditoria do raciocínio: quais ferramentas foram consultadas e
    # de quais registros veio cada número. Sem isso a resposta não é conferível.
    ferramentas = models.JSONField("ferramentas usadas", default=list, blank=True)
    fontes = models.JSONField("fontes", default=list, blank=True)
    provedor = models.CharField("provedor", max_length=40, blank=True, default="")
    modelo = models.CharField(max_length=80, blank=True, default="")
    duracao_ms = models.PositiveIntegerField(default=0)
    util = models.BooleanField("avaliada como útil", null=True, blank=True)
    comentario = models.TextField("comentário da avaliação", blank=True, default="")
    criado_em = models.DateTimeField(default=timezone.now, editable=False, db_index=True)

    class Meta:
        verbose_name = "mensagem do assistente"
        verbose_name_plural = "mensagens do assistente"
        ordering = ["criado_em"]
        indexes = [models.Index(fields=["conversa", "criado_em"])]

    def __str__(self) -> str:
        return self.get_papel_display() + ": " + self.texto[:50]

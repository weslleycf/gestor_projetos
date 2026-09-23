"""Colaboração: salas e chat por projeto/equipe (RF-38)."""
from __future__ import annotations

from django.db import models
from django.utils import timezone

from apps.core.models import User
from apps.portfolio.models import Project


class Sala(models.Model):
    """Canal de conversa por projeto, equipe ou tópico."""

    class Tipo(models.TextChoices):
        PROJETO = "PROJETO", "Projeto"
        EQUIPE = "EQUIPE", "Equipe"
        AREA = "AREA", "Área"
        DIRETO = "DIRETO", "Mensagem direta"

    nome = models.CharField("nome", max_length=160)
    tipo = models.CharField("tipo", max_length=10, choices=Tipo.choices, default=Tipo.PROJETO)
    descricao = models.TextField(blank=True, default="")
    project = models.ForeignKey(
        Project, null=True, blank=True, on_delete=models.CASCADE, related_name="salas"
    )
    participantes = models.ManyToManyField(User, blank=True, related_name="salas", verbose_name="participantes")
    icone = models.CharField("ícone", max_length=40, default="message-circle")
    cor = models.CharField("cor", max_length=9, default="#6366F1")
    arquivada = models.BooleanField(default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "sala"
        verbose_name_plural = "salas"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome


class Mensagem(models.Model):
    sala = models.ForeignKey(Sala, on_delete=models.CASCADE, related_name="mensagens")
    autor = models.ForeignKey(User, on_delete=models.CASCADE, related_name="mensagens")
    texto = models.TextField("mensagem")
    reply_to = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="respostas"
    )
    mencoes = models.ManyToManyField(User, blank=True, related_name="mensagens_mencionadas")
    reacoes = models.JSONField("reações", default=dict, blank=True)
    anexo = models.FileField("anexo", upload_to="chat/%Y/%m/", blank=True, null=True)
    editada = models.BooleanField(default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False, db_index=True)

    class Meta:
        verbose_name = "mensagem"
        verbose_name_plural = "mensagens"
        ordering = ["criado_em"]
        indexes = [models.Index(fields=["sala", "-criado_em"])]

    def __str__(self) -> str:
        return f"{self.autor.nome}: {self.texto[:40]}"

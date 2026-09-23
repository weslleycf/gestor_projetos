"""Serializers de colaboração."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.serializers import UserResumoSerializer

from .models import Mensagem, Sala


class MensagemSerializer(serializers.ModelSerializer):
    autor_detalhe = UserResumoSerializer(source="autor", read_only=True)
    mencoes_detalhe = UserResumoSerializer(source="mencoes", many=True, read_only=True)
    anexo_url = serializers.SerializerMethodField()

    class Meta:
        model = Mensagem
        fields = ("id", "sala", "autor", "autor_detalhe", "texto", "reply_to", "mencoes",
                  "mencoes_detalhe", "reacoes", "anexo", "anexo_url", "editada", "criado_em")
        read_only_fields = ("criado_em", "autor")

    def get_anexo_url(self, obj) -> str:
        try:
            return obj.anexo.url if obj.anexo else ""
        except ValueError:
            return ""


class SalaSerializer(serializers.ModelSerializer):
    participantes_detalhe = UserResumoSerializer(source="participantes", many=True, read_only=True)
    project_nome = serializers.CharField(source="project.nome", read_only=True, default="")
    ultima_mensagem = serializers.SerializerMethodField()
    total_mensagens = serializers.IntegerField(source="mensagens.count", read_only=True)

    class Meta:
        model = Sala
        fields = "__all__"
        read_only_fields = ("criado_em",)

    def get_ultima_mensagem(self, obj):
        mensagem = obj.mensagens.select_related("autor").order_by("-criado_em").first()
        if not mensagem:
            return None
        return {
            "texto": mensagem.texto[:120],
            "autor": mensagem.autor.nome,
            "autor_cor": mensagem.autor.cor,
            "criado_em": mensagem.criado_em.isoformat(),
        }

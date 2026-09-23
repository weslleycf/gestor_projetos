"""Views de colaboração."""
from __future__ import annotations

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.core.models import User
from apps.core.permissions import PermissaoSGP, pode_gerenciar_autor
from apps.core.services import notificar_muitos, registrar_auditoria

from .models import Mensagem, Sala
from .serializers import MensagemSerializer, SalaSerializer


class SalaViewSet(viewsets.ModelViewSet):
    queryset = Sala.objects.prefetch_related("participantes").select_related("project").all()
    serializer_class = SalaSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    # Criar sala e enviar mensagem é colaborar. Com "projeto.editar", cinco
    # perfis que deveriam conversar recebiam 403 ao enviar.
    permissao_escrita = "colaboracao.editar"
    filterset_fields = ["tipo", "project", "arquivada"]

    @action(detail=True, methods=["get"])
    def mensagens(self, request, pk=None):
        sala = self.get_object()
        qs = sala.mensagens.select_related("autor").prefetch_related("mencoes")
        limite = int(request.query_params.get("limite", 100))
        return Response({"sala": SalaSerializer(sala).data, "mensagens": MensagemSerializer(qs[:limite], many=True).data})

    @action(detail=True, methods=["post"], url_path="enviar")
    def enviar(self, request, pk=None):
        sala = self.get_object()
        mensagem = Mensagem.objects.create(
            sala=sala, autor=request.user, texto=request.data.get("texto", ""),
            reply_to_id=request.data.get("reply_to") or None,
        )
        ids = request.data.get("mencoes", []) or []
        if ids:
            mensagem.mencoes.set(User.objects.filter(pk__in=ids))
            notificar_muitos(
                mensagem.mencoes.all(), f"{request.user.nome} mencionou você em {sala.nome}",
                mensagem=mensagem.texto[:180], nivel="INFO", icone="at-sign", link="/colaboracao",
            )
        return Response(MensagemSerializer(mensagem, context={"request": request}).data, status=201)


class MensagemViewSet(viewsets.ModelViewSet):
    queryset = Mensagem.objects.select_related("autor", "sala").all()
    serializer_class = MensagemSerializer
    permission_classes = [PermissaoSGP]
    permissao_leitura = "projeto.ver"
    # Escrever no chat é colaborar, não administrar projeto: exigir
    # "projeto.editar" barrava cinco perfis que deveriam poder conversar.
    permissao_escrita = "colaboracao.editar"
    filterset_fields = ["sala", "autor"]

    def _exigir_autoria(self, mensagem):
        if not pode_gerenciar_autor(self.request.user, mensagem):
            raise PermissionDenied("Você só pode editar ou excluir as suas próprias mensagens.")

    def perform_update(self, serializer):
        self._exigir_autoria(self.get_object())
        mensagem = serializer.save(editada=True)
        registrar_auditoria(entidade="collab.mensagem", acao="ATUALIZAR", instancia=mensagem)
        return mensagem

    def perform_destroy(self, instance):
        self._exigir_autoria(instance)
        registrar_auditoria(
            entidade="collab.mensagem",
            acao="EXCLUIR",
            instancia=instance,
            justificativa="Mensagem excluída: " + instance.texto[:160],
        )
        instance.delete()

    @action(detail=True, methods=["post"])
    def reagir(self, request, pk=None):
        mensagem = self.get_object()
        emoji = request.data.get("emoji", "👍")
        reacoes = dict(mensagem.reacoes or {})
        usuarios = list(reacoes.get(emoji, []))
        if request.user.pk in usuarios:
            usuarios.remove(request.user.pk)
        else:
            usuarios.append(request.user.pk)
        reacoes[emoji] = usuarios
        mensagem.reacoes = reacoes
        mensagem.save(update_fields=["reacoes"])
        return Response(MensagemSerializer(mensagem, context={"request": request}).data)

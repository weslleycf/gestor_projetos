"""Integrações com sistemas externos, fila de eventos e entrega de webhooks.

Cobre a Fase 3 (integrações com LMS, Jira, Teams/Slack e agendas), a Fase 4
(API pública e webhooks com entrega real) e a Fase 5 (operação e observabilidade).
"""
from __future__ import annotations

import secrets
from datetime import timedelta

from django.db import models
from django.utils import timezone

from apps.core.models import User


def gerar_token_integracao() -> str:
    """Gerador de token usado como valor padrão do campo (serializável em migração)."""
    return secrets.token_hex(32)


class TipoIntegracao(models.TextChoices):
    """Catálogo de integrações previstas na especificação §11."""

    LMS = "LMS", "LMS (Moodle, Cornerstone, Docebo)"
    JIRA = "JIRA", "Jira"
    AZURE_DEVOPS = "AZURE_DEVOPS", "Azure DevOps"
    TEAMS = "TEAMS", "Microsoft Teams"
    SLACK = "SLACK", "Slack"
    GOOGLE_CALENDAR = "GOOGLE_CALENDAR", "Google Calendar"
    OUTLOOK = "OUTLOOK", "Microsoft Outlook"
    ERP = "ERP", "ERP (SAP, Oracle)"
    RH = "RH", "RH (Workday, Gupy, Senior)"
    CRM = "CRM", "CRM (Salesforce)"
    BI = "BI", "Power BI / Tableau"
    GITHUB = "GITHUB", "GitHub"
    GITLAB = "GITLAB", "GitLab"
    ESCO = "ESCO", "Taxonomia ESCO / SFIA"
    CERTIFICADORA = "CERTIFICADORA", "Plataforma de certificação"


class Direcao(models.TextChoices):
    ENTRADA = "ENTRADA", "Entrada (importa para o SGP)"
    SAIDA = "SAIDA", "Saída (exporta do SGP)"
    BIDIRECIONAL = "BIDIRECIONAL", "Bidirecional"


class Autenticacao(models.TextChoices):
    NENHUMA = "NENHUMA", "Sem autenticação"
    API_KEY = "API_KEY", "Chave de API"
    BEARER = "BEARER", "Token Bearer"
    BASIC = "BASIC", "Usuário e senha"
    OAUTH2 = "OAUTH2", "OAuth 2.0"
    WEBHOOK = "WEBHOOK", "URL de webhook (entrada)"
    ARQUIVO = "ARQUIVO", "Arquivo / planilha"


class StatusIntegracao(models.TextChoices):
    INATIVA = "INATIVA", "Inativa"
    ATIVA = "ATIVA", "Ativa"
    SINCRONIZANDO = "SINCRONIZANDO", "Sincronizando"
    ERRO = "ERRO", "Com erro"
    CONFIGURANDO = "CONFIGURANDO", "Em configuração"


class Integracao(models.Model):
    """Conexão configurada com um sistema externo."""

    nome = models.CharField("nome", max_length=160)
    tipo = models.CharField("tipo", max_length=20, choices=TipoIntegracao.choices, db_index=True)
    direcao = models.CharField("direção", max_length=14, choices=Direcao.choices, default=Direcao.SAIDA)
    descricao = models.TextField("descrição", blank=True, default="")

    url_base = models.URLField("URL base", blank=True, default="", max_length=500)
    autenticacao = models.CharField("autenticação", max_length=12, choices=Autenticacao.choices, default=Autenticacao.API_KEY)
    credenciais = models.JSONField("credenciais", default=dict, blank=True)
    cabecalhos = models.JSONField("cabeçalhos adicionais", default=dict, blank=True)

    entidade_alvo = models.CharField(
        "entidade no SGP", max_length=60, blank=True, default="",
        help_text="Ex.: tasks.task, portfolio.milestone, resources.timesheet.",
    )
    filtros = models.JSONField("filtros de seleção", default=dict, blank=True)

    modo_simulacao = models.BooleanField(
        "modo simulação", default=True,
        help_text="Quando ativo, o conector monta a requisição e registra o que seria enviado, sem chamar o sistema externo.",
    )
    ativa = models.BooleanField("ativa", default=False, db_index=True)
    frequencia_minutos = models.PositiveIntegerField("frequência (min)", default=60)
    proxima_sincronizacao = models.DateTimeField("próxima sincronização", null=True, blank=True, db_index=True)

    status = models.CharField("status", max_length=14, choices=StatusIntegracao.choices, default=StatusIntegracao.CONFIGURANDO, db_index=True)
    ultima_sincronizacao = models.DateTimeField("última sincronização", null=True, blank=True)
    ultimo_erro = models.TextField("último erro", blank=True, default="")
    total_execucoes = models.PositiveIntegerField("execuções", default=0)
    total_sucesso = models.PositiveIntegerField("execuções com sucesso", default=0)
    total_falha = models.PositiveIntegerField("execuções com falha", default=0)
    itens_sincronizados = models.PositiveIntegerField("itens sincronizados", default=0)

    responsavel = models.ForeignKey(
        User, verbose_name="responsável", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="integracoes",
    )
    cor = models.CharField("cor", max_length=9, default="#2563EB")
    icone = models.CharField("ícone", max_length=40, default="plug")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "integração"
        verbose_name_plural = "integrações"
        ordering = ["tipo", "nome"]
        indexes = [models.Index(fields=["ativa", "proxima_sincronizacao"])]

    def __str__(self) -> str:
        return f"{self.get_tipo_display()} · {self.nome}"

    @property
    def saudavel(self) -> bool:
        return self.status in {StatusIntegracao.ATIVA, StatusIntegracao.SINCRONIZANDO}

    @property
    def taxa_sucesso(self) -> float:
        if not self.total_execucoes:
            return 0.0
        return round(self.total_sucesso / self.total_execucoes * 100, 1)

    def agendar_proxima(self, referencia=None):
        base = referencia or timezone.now()
        self.proxima_sincronizacao = base + timedelta(minutes=self.frequencia_minutos or 60)
        return self.proxima_sincronizacao

    def mascarar_credenciais(self) -> dict:
        """Devolve as credenciais com os valores sensíveis ocultos."""
        saida = {}
        for chave, valor in (self.credenciais or {}).items():
            texto = str(valor)
            sensivel = any(t in chave.lower() for t in ("token", "senha", "password", "secret", "key", "chave"))
            if sensivel:
                saida[chave] = ("•" * 8 + texto[-4:]) if len(texto) > 4 else "•" * 8
            else:
                saida[chave] = valor
        return saida


class Transformacao(models.TextChoices):
    NENHUMA = "NENHUMA", "Sem transformação"
    MAIUSCULA = "MAIUSCULA", "Maiúsculas"
    MINUSCULA = "MINUSCULA", "Minúsculas"
    TRIM = "TRIM", "Remover espaços"
    DATA = "DATA", "Converter para data"
    NUMERO = "NUMERO", "Converter para número"
    MOEDA = "MOEDA", "Converter para moeda"
    BOOLEANO = "BOOLEANO", "Converter para sim/não"
    ENUM = "ENUM", "Traduzir valor (de/para)"
    PESSOA = "PESSOA", "Localizar pessoa pelo e-mail"
    SKILL = "SKILL", "Localizar capacidade pelo nome"


class MapeamentoCampo(models.Model):
    """Correspondência entre um campo do sistema externo e um campo do SGP."""

    integracao = models.ForeignKey(Integracao, on_delete=models.CASCADE, related_name="mapeamentos")
    campo_origem = models.CharField("campo externo", max_length=160)
    campo_destino = models.CharField("campo no SGP", max_length=160)
    transformacao = models.CharField("transformação", max_length=12, choices=Transformacao.choices, default=Transformacao.NENHUMA)
    traducao = models.JSONField("tabela de tradução", default=dict, blank=True)
    valor_padrao = models.CharField("valor padrão", max_length=200, blank=True, default="")
    obrigatorio = models.BooleanField("obrigatório", default=False)
    ordem = models.PositiveIntegerField("ordem", default=0)

    class Meta:
        verbose_name = "mapeamento de campo"
        verbose_name_plural = "mapeamentos de campo"
        ordering = ["integracao", "ordem"]
        unique_together = ("integracao", "campo_destino")

    def __str__(self) -> str:
        return f"{self.campo_origem} -> {self.campo_destino}"


class StatusSincronizacao(models.TextChoices):
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    SUCESSO = "SUCESSO", "Sucesso"
    PARCIAL = "PARCIAL", "Sucesso parcial"
    FALHA = "FALHA", "Falha"
    SIMULADO = "SIMULADO", "Simulado"


class SincronizacaoLog(models.Model):
    """Histórico de execuções — base da observabilidade das integrações."""

    integracao = models.ForeignKey(Integracao, on_delete=models.CASCADE, related_name="execucoes")
    inicio = models.DateTimeField("início", default=timezone.now, db_index=True)
    fim = models.DateTimeField("fim", null=True, blank=True)
    status = models.CharField("status", max_length=14, choices=StatusSincronizacao.choices, default=StatusSincronizacao.EM_ANDAMENTO, db_index=True)
    operacao = models.CharField("operação", max_length=12, default="IMPORTAR")
    itens_lidos = models.PositiveIntegerField("itens lidos", default=0)
    itens_criados = models.PositiveIntegerField("criados", default=0)
    itens_atualizados = models.PositiveIntegerField("atualizados", default=0)
    itens_ignorados = models.PositiveIntegerField("ignorados", default=0)
    itens_com_erro = models.PositiveIntegerField("com erro", default=0)
    mensagem = models.TextField("mensagem", blank=True, default="")
    erros = models.JSONField("erros", default=list, blank=True)
    detalhes = models.JSONField("detalhes", default=dict, blank=True)
    duracao_ms = models.PositiveIntegerField("duração (ms)", default=0)
    disparado_por = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="sincronizacoes")
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "execução de integração"
        verbose_name_plural = "execuções de integração"
        ordering = ["-inicio"]
        indexes = [models.Index(fields=["integracao", "-inicio"])]

    def __str__(self) -> str:
        return f"{self.integracao.nome} · {self.inicio:%d/%m %H:%M} · {self.status}"

    @property
    def total_processado(self) -> int:
        return self.itens_criados + self.itens_atualizados

    @property
    def duracao_segundos(self) -> float:
        return round(self.duracao_ms / 1000, 2)


class TipoEvento(models.TextChoices):
    """Eventos de domínio publicáveis para sistemas externos."""

    PROJETO_CRIADO = "projeto.criado", "Projeto criado"
    PROJETO_ATUALIZADO = "projeto.atualizado", "Projeto atualizado"
    PROJETO_CONCLUIDO = "projeto.concluido", "Projeto concluído"
    PROJETO_EM_RISCO = "projeto.em_risco", "Projeto entrou em risco"
    TAREFA_CRIADA = "tarefa.criada", "Tarefa criada"
    TAREFA_CONCLUIDA = "tarefa.concluida", "Tarefa concluída"
    TAREFA_ATRASADA = "tarefa.atrasada", "Tarefa atrasada"
    MARCO_CONCLUIDO = "marco.concluido", "Marco concluído"
    RISCO_CRIADO = "risco.criado", "Risco criado"
    RISCO_CRITICO = "risco.critico", "Risco crítico identificado"
    ISSUE_CRIADA = "issue.criada", "Issue criada"
    ALOCACAO_CRIADA = "alocacao.criada", "Alocação criada"
    ALOCACAO_CONFLITO = "alocacao.conflito", "Conflito de alocação"
    ORCAMENTO_ESTOURADO = "orcamento.estourado", "Orçamento estourado"
    PROMOCAO_SOLICITADA = "promocao.solicitada", "Promoção solicitada"
    PROMOCAO_APROVADA = "promocao.aprovada", "Promoção aprovada"
    EVIDENCIA_VALIDADA = "capacidade.evidencia_validada", "Evidência validada"
    TREINAMENTO_CONCLUIDO = "capacidade.treinamento_concluido", "Treinamento concluído"


class EventoIntegracao(models.Model):
    """Fila de eventos de domínio (padrão outbox) para entrega a terceiros."""

    tipo = models.CharField("tipo de evento", max_length=40, choices=TipoEvento.choices, db_index=True)
    entidade = models.CharField("entidade", max_length=80, blank=True, default="")
    entidade_id = models.CharField("id da entidade", max_length=64, blank=True, default="")
    projeto_id = models.PositiveBigIntegerField("projeto", null=True, blank=True, db_index=True)
    titulo = models.CharField("título", max_length=200, blank=True, default="")
    payload = models.JSONField("conteúdo", default=dict, blank=True)
    ocorrido_em = models.DateTimeField("ocorrido em", default=timezone.now, db_index=True)
    processado = models.BooleanField("processado", default=False, db_index=True)
    tentativas = models.PositiveIntegerField("tentativas de entrega", default=0)
    entregas_ok = models.PositiveIntegerField("entregas bem-sucedidas", default=0)
    ultimo_erro = models.TextField("último erro", blank=True, default="")

    class Meta:
        verbose_name = "evento de integração"
        verbose_name_plural = "eventos de integração"
        ordering = ["-ocorrido_em"]
        indexes = [models.Index(fields=["processado", "ocorrido_em"])]

    def __str__(self) -> str:
        return f"{self.get_tipo_display()} · {self.titulo or self.entidade_id}"


class WebhookEntrega(models.Model):
    """Tentativa de entrega de um evento a um webhook — com retry e assinatura."""

    webhook = models.ForeignKey("core.Webhook", on_delete=models.CASCADE, related_name="entregas")
    evento = models.ForeignKey(EventoIntegracao, on_delete=models.CASCADE, related_name="entregas")
    url = models.URLField("URL", max_length=500)
    tentativa = models.PositiveIntegerField("tentativa", default=1)
    status_code = models.PositiveIntegerField("status HTTP", null=True, blank=True)
    sucesso = models.BooleanField("sucesso", default=False, db_index=True)
    resposta = models.TextField("resposta", blank=True, default="")
    erro = models.TextField("erro", blank=True, default="")
    duracao_ms = models.PositiveIntegerField("duração (ms)", default=0)
    simulado = models.BooleanField("simulado", default=False)
    criado_em = models.DateTimeField(default=timezone.now, editable=False, db_index=True)

    class Meta:
        verbose_name = "entrega de webhook"
        verbose_name_plural = "entregas de webhook"
        ordering = ["-criado_em"]
        indexes = [models.Index(fields=["webhook", "-criado_em"])]

    def __str__(self) -> str:
        return f"{self.webhook.nome} · tentativa {self.tentativa} · {'ok' if self.sucesso else 'falha'}"


class TokenAPI(models.Model):
    """Credencial de acesso à API pública (RF-43), com escopos e auditoria de uso."""

    nome = models.CharField("nome", max_length=140)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tokens_integracao")
    token = models.CharField(max_length=64, unique=True, default=gerar_token_integracao)
    escopos = models.JSONField("escopos", default=list, blank=True)
    ip_permitido = models.CharField("IP permitido", max_length=120, blank=True, default="")
    ativo = models.BooleanField("ativo", default=True)
    expira_em = models.DateTimeField("expira em", null=True, blank=True)
    ultimo_uso = models.DateTimeField("último uso", null=True, blank=True)
    total_chamadas = models.PositiveIntegerField("chamadas", default=0)
    criado_em = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        verbose_name = "credencial de API"
        verbose_name_plural = "credenciais de API"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return self.nome

    @property
    def expirado(self) -> bool:
        return bool(self.expira_em and self.expira_em < timezone.now())

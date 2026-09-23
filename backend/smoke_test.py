"""Smoke test da API do SGP — exercita os endpoints principais."""
import json
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient  # noqa: E402

from apps.core.models import User  # noqa: E402
from apps.portfolio.models import Project  # noqa: E402

client = APIClient()
falhas = []
ok = 0


def checar(rotulo, resposta, esperado=200, exigir_chave=None):
    global ok
    if resposta.status_code != esperado:
        falhas.append(f"{rotulo}: HTTP {resposta.status_code} (esperado {esperado}) -> {str(resposta.content[:300])}")
        return None
    if exigir_chave:
        try:
            dados = resposta.json()
        except Exception as exc:
            falhas.append(f"{rotulo}: JSON invalido ({exc})")
            return None
        if exigir_chave not in dados:
            falhas.append(f"{rotulo}: chave '{exigir_chave}' ausente. Chaves: {list(dados)[:12]}")
            return None
    ok += 1
    return resposta


# ------------------------------------------------------------------ autenticacao
login = client.post("/api/v1/auth/token/", {"email": "admin@empresa.com.br", "password": "sgp123456"}, format="json")
dados = checar("POST /auth/token/", login, 200, "access")
if dados:
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")

checar("GET /auth/me/", client.get("/api/v1/auth/me/"), 200, "permissoes")
checar("GET /permissoes/", client.get("/api/v1/permissoes/"), 200, "matriz")
checar("GET /health/", client.get("/api/v1/health/"), 200, "status")

# --------------------------------------------------------------------- core
for rota in ("usuarios", "usuarios/resumo", "usuarios/organograma", "papeis", "auditoria",
             "notificacoes", "notificacoes/contagem", "atividades", "dashboards", "filtros-salvos",
             "relatorios", "tokens-api", "webhooks", "comentarios", "anexos"):
    checar(f"GET /{rota}/", client.get(f"/api/v1/{rota}/"))
checar("GET /busca/?q=cloud", client.get("/api/v1/busca/?q=cloud"), 200, "resultados")

# ---------------------------------------------------------------- portfolio
checar("GET /projetos/", client.get("/api/v1/projetos/?page_size=5"))
checar("GET /projetos/?resumo=1", client.get("/api/v1/projetos/?resumo=1&page_size=5"))
checar("GET /projetos/cards/", client.get("/api/v1/projetos/cards/"), 200, "projetos")
checar("GET /projetos/timeline/", client.get("/api/v1/projetos/timeline/"), 200, "projetos")
checar("GET /projetos/assistente/catalogo/", client.get("/api/v1/projetos/assistente/catalogo/"), 200, "passos")
checar("GET /portfolios/", client.get("/api/v1/portfolios/"))
checar("GET /programas/", client.get("/api/v1/programas/"))
checar("GET /marcos/", client.get("/api/v1/marcos/"))
checar("GET /kpis/", client.get("/api/v1/kpis/"))
checar("GET /baselines/", client.get("/api/v1/baselines/"))
checar("GET /licoes/", client.get("/api/v1/licoes/"))
checar("GET /workflows/", client.get("/api/v1/workflows/"))
checar("GET /campos-customizados/schema/", client.get("/api/v1/campos-customizados/schema/?entidade=portfolio.project"), 200, "campos")
checar("GET /widgets/", client.get("/api/v1/widgets/"), 200, "widgets")
checar("GET /dashboard/executivo/", client.get("/api/v1/dashboard/executivo/"), 200, "resumo")

projeto = client.get("/api/v1/projetos/?page_size=1").json()["results"][0]
pid = projeto["id"]
checar(f"GET /projetos/{pid}/dashboard/", client.get(f"/api/v1/projetos/{pid}/dashboard/"), 200, "evm")
checar(f"GET /projetos/{pid}/cronograma/", client.get(f"/api/v1/projetos/{pid}/cronograma/"), 200, "tarefas")
checar(f"POST /projetos/{pid}/criar-baseline/", client.post(f"/api/v1/projetos/{pid}/criar-baseline/", {"nome": "Smoke"}, format="json"), 201, "id")
checar(f"POST /projetos/{pid}/recalcular/", client.post(f"/api/v1/projetos/{pid}/recalcular/", {}, format="json"), 200, "progresso")

# -------------------------------------------------------------------- tasks
checar("GET /tarefas/", client.get("/api/v1/tarefas/?page_size=5"))
checar("GET /tarefas/kanban/", client.get(f"/api/v1/tarefas/kanban/?project={pid}"), 200, "colunas")
checar("GET /tarefas/calendario/", client.get("/api/v1/tarefas/calendario/"), 200, "eventos")
checar("GET /tarefas/minhas/", client.get("/api/v1/tarefas/minhas/"), 200, "tarefas")
checar("GET /minhas-tarefas/", client.get("/api/v1/minhas-tarefas/"), 200, "abertas")
checar("GET /dependencias/", client.get("/api/v1/dependencias/"))
checar("GET /checklist/", client.get("/api/v1/checklist/"))
checar("GET /requisitos-skill-tarefa/", client.get("/api/v1/requisitos-skill-tarefa/"))

tarefa = client.get(f"/api/v1/tarefas/?project={pid}&page_size=1").json()["results"][0]
tid = tarefa["id"]
checar(f"GET /tarefas/{tid}/recomendacoes/", client.get(f"/api/v1/tarefas/{tid}/recomendacoes/"), 200, "recomendacoes")
checar(f"GET /tarefas/{tid}/simular/", client.get(f"/api/v1/tarefas/{tid}/simular/?custo=0.4&skill=0.3"), 200, "recomendacoes")
checar(f"POST /tarefas/{tid}/mover/", client.post(f"/api/v1/tarefas/{tid}/mover/", {"status": "EM_ANDAMENTO"}, format="json"), 200, "status")
checar(f"POST /tarefas/{tid}/progresso/", client.post(f"/api/v1/tarefas/{tid}/progresso/", {"percentual_conclusao": 45}, format="json"), 200, "percentual_conclusao")
checar(f"POST /tarefas/{tid}/reagendar/", client.post(f"/api/v1/tarefas/{tid}/reagendar/", {"data_inicio": "2026-05-04", "data_fim": "2026-05-20"}, format="json"), 200, "tarefa")
checar(f"POST /tarefas/{tid}/reordenar/", client.post("/api/v1/tarefas/reordenar/", {"itens": [{"id": tid, "ordem": 1, "posicao_visual": 1500}]}, format="json"), 200, "atualizadas")

# ---------------------------------------------------------------- resources
checar("GET /recursos/", client.get("/api/v1/recursos/"))
checar("GET /recursos/cards/", client.get("/api/v1/recursos/cards/"), 200, "recursos")
checar("GET /alocacoes/", client.get("/api/v1/alocacoes/"))
checar("GET /alocacoes/conflitos/", client.get("/api/v1/alocacoes/conflitos/"), 200, "conflitos")
checar("GET /alocacoes/mapa-ocupacao/", client.get("/api/v1/alocacoes/mapa-ocupacao/"), 200, "linhas")
checar("GET /alocacoes/timeline/", client.get("/api/v1/alocacoes/timeline/"), 200, "pessoas")
checar("GET /timesheet/", client.get("/api/v1/timesheet/"))
checar("GET /timesheet/semana/", client.get("/api/v1/timesheet/semana/"), 200, "dias")
checar("GET /dashboard/alocacao/", client.get("/api/v1/dashboard/alocacao/"), 200, "total_alocacoes")
checar("POST /alocacoes/atribuir/", client.post("/api/v1/alocacoes/atribuir/", {
    "task": tid, "user": User.objects.filter(perfil="MEMBRO").first().id,
    "percentual": 50, "justificativa": "Smoke test",
}, format="json"), 201, "alocacao")
checar("GET /capacidade-semanal/", client.get("/api/v1/capacidade-semanal/"))
checar(f"GET /capacidade/{User.objects.first().id}/", client.get(f"/api/v1/capacidade/{User.objects.first().id}/"), 200, "semanas")

# ------------------------------------------------------------------ finance
checar("GET /orcamentos/", client.get("/api/v1/orcamentos/"))
checar("GET /lancamentos/", client.get("/api/v1/lancamentos/"))
checar("GET /lancamentos/resumo/", client.get("/api/v1/lancamentos/resumo/"), 200, "despesas_total")
checar("GET /previsoes-caixa/", client.get("/api/v1/previsoes-caixa/"))
checar(f"GET /evm/{pid}/", client.get(f"/api/v1/evm/{pid}/"), 200, "evm")
checar("GET /dashboard/financeiro/", client.get("/api/v1/dashboard/financeiro/"), 200, "resumo")

# -------------------------------------------------------------------- risks
checar("GET /riscos/", client.get("/api/v1/riscos/"))
checar("GET /riscos/matriz/", client.get("/api/v1/riscos/matriz/"), 200, "celulas")
checar("GET /riscos/heatmap/", client.get("/api/v1/riscos/heatmap/"), 200, "projetos")
checar("GET /issues/", client.get("/api/v1/issues/"))
checar("GET /issues/kanban/", client.get("/api/v1/issues/kanban/"), 200, "colunas")
checar("GET /issues/resumo/", client.get("/api/v1/issues/resumo/"), 200, "abertas")
checar("GET /dashboard/riscos/", client.get("/api/v1/dashboard/riscos/"), 200, "total_riscos")
checar("GET /riscos-historico/", client.get("/api/v1/riscos-historico/"))

risco = client.get("/api/v1/riscos/?page_size=1").json()["results"][0]
checar(f"POST /riscos/{risco['id']}/mover/", client.post(f"/api/v1/riscos/{risco['id']}/mover/", {"probabilidade": 5, "impacto": 5}, format="json"), 200, "severidade")
checar(f"GET /riscos/{risco['id']}/historico/", client.get(f"/api/v1/riscos/{risco['id']}/historico/"), 200, "historico")

iss = client.get("/api/v1/issues/?page_size=1").json()["results"][0]
checar(f"POST /issues/{iss['id']}/mover/", client.post(f"/api/v1/issues/{iss['id']}/mover/", {"status": "EM_ANDAMENTO"}, format="json"), 200, "status")

# ------------------------------------------------------------- capabilities
for rota in ("capacidades/categorias", "capacidades/categorias/arvore", "capacidades/skills",
             "capacidades/skills/arvore", "capacidades/skills/grafo", "capacidades/criterios-nivel",
             "capacidades/perfis", "capacidades/perfis/matriz", "capacidades/avaliacoes",
             "capacidades/evidencias", "capacidades/historico", "capacidades/promocoes",
             "capacidades/requisitos-projeto", "capacidades/pdi", "capacidades/pdi-acoes",
             "capacidades/treinamentos", "capacidades/treinamentos-colaborador", "capacidades/mentorias",
             "capacidades/recomendacoes", "capacidades/previsoes", "capacidades/bus-factor",
             "capacidades/oportunidades", "capacidades/oportunidades/recomendadas",
             "capacidades/candidaturas", "capacidades/posicoes", "capacidades/sucessao",
             "capacidades/sucessao/mapa"):
    checar(f"GET /{rota}/", client.get(f"/api/v1/{rota}/"))

checar("GET /capacidades/matching/", client.get(f"/api/v1/capacidades/matching/?task={tid}&modo=DESENVOLVIMENTO"), 200, "recomendacoes")
checar("POST /capacidades/simulacao/", client.post("/api/v1/capacidades/simulacao/", {"task": tid, "ajustes": {"skill": 0.5, "custo": 0.3, "somente_disponiveis": True}}, format="json"), 200, "comparacao")
checar("GET /capacidades/gap/", client.get(f"/api/v1/capacidades/gap/?project={pid}"), 200, "itens")
checar("GET /capacidades/forecast/", client.get("/api/v1/capacidades/forecast/?meses=6&salvar=0"), 200, "linhas")
checar("GET /capacidades/bus-factor-detect/", client.get("/api/v1/capacidades/bus-factor-detect/?salvar=0"), 200, "alertas")
checar("GET /capacidades/painel/", client.get("/api/v1/capacidades/painel/"), 200, "cobertura_skills")
checar("GET /capacidades/decay/", client.get("/api/v1/capacidades/decay/"), 200, "candidatos")
checar("GET /capacidades/trilhas/", client.get("/api/v1/capacidades/trilhas/"), 200, "trilhas")
checar("GET /capacidades/modos-alocacao/", client.get("/api/v1/capacidades/modos-alocacao/"), 200, "modos")

skill = client.get("/api/v1/capacidades/skills/?page_size=1").json()["results"][0]
checar(f"GET /capacidades/skills/{skill['id']}/detalhe/", client.get(f"/api/v1/capacidades/skills/{skill['id']}/detalhe/"), 200, "detentores")
perfil = client.get("/api/v1/capacidades/perfis/?page_size=1").json()["results"][0]
checar(f"GET /capacidades/perfis/{perfil['id']}/historico/", client.get(f"/api/v1/capacidades/perfis/{perfil['id']}/historico/"), 200, "historico")
checar(f"GET /capacidades/perfis/{perfil['id']}/criterios/", client.get(f"/api/v1/capacidades/perfis/{perfil['id']}/criterios/"), 200, "checagens")
checar("POST /capacidades/perfis/<id>/avaliar/", client.post(f"/api/v1/capacidades/perfis/{perfil['id']}/avaliar/", {"tipo": "GESTOR", "nivel_atribuido": 5, "comentario": "Smoke"}, format="json"), 201, "avaliacao")
_endosso = client.post(f"/api/v1/capacidades/perfis/{perfil['id']}/endossar/", {"comentario": "Smoke", "nivel_sugerido": 5}, format="json")
if _endosso.status_code in (200, 201):
    ok += 1
else:
    falhas.append(f"POST endossar: HTTP {_endosso.status_code}")
checar("POST /capacidades/perfis/<id>/evidencias/", client.post(f"/api/v1/capacidades/perfis/{perfil['id']}/evidencias/", {"tipo": "PROJETO", "descricao": "Smoke evidence"}, format="json"), 201, "evidencia")
checar("POST /capacidades/perfis/<id>/creditar-xp/", client.post(f"/api/v1/capacidades/perfis/{perfil['id']}/creditar-xp/", {"xp": 50, "motivo": "Smoke"}, format="json"), 200, "xp_atual")
checar("GET /capacidades/perfis/por-usuario/<id>/", client.get(f"/api/v1/capacidades/perfis/por-usuario/{perfil['user']}/"), 200, "eixos")
checar("GET /capacidades/pdi/meu/", client.get("/api/v1/capacidades/pdi/meu/"), 200, "radar")
checar("POST /capacidades/pdi/gerar/", client.post("/api/v1/capacidades/pdi/gerar/", {"titulo": "PDI Smoke"}, format="json"), 201, "pdi")
requisito = {"project": pid, "requisitos": [{"skill": skill["id"], "nivel_minimo": 4, "quantidade": 2, "peso": 1.5, "obrigatorio": True}]}
checar("POST /capacidades/requisitos-projeto/definir/", client.post("/api/v1/capacidades/requisitos-projeto/definir/", requisito, format="json"), 201)

# --------------------------------------------------------------------- collab
checar("GET /salas/", client.get("/api/v1/salas/"))
checar("GET /mensagens/", client.get("/api/v1/mensagens/"))

# --------------------------------------------------------------- integracoes
checar("GET /dashboard/integracoes/", client.get("/api/v1/dashboard/integracoes/"), 200, "integracoes")
checar("GET /integracoes-catalogo/", client.get("/api/v1/integracoes-catalogo/"), 200, "catalogo")
checar("GET /integracoes-tipos/", client.get("/api/v1/integracoes-tipos/"), 200, "tipos")
checar("GET /integracoes/", client.get("/api/v1/integracoes/"))
checar("GET /integracoes-mapeamentos/", client.get("/api/v1/integracoes-mapeamentos/"))
checar("GET /integracoes-execucoes/", client.get("/api/v1/integracoes-execucoes/"))
checar("GET /integracoes-execucoes/resumo/", client.get("/api/v1/integracoes-execucoes/resumo/"), 200, "total")
checar("GET /integracoes-eventos/", client.get("/api/v1/integracoes-eventos/"))
checar("GET /integracoes-entregas/", client.get("/api/v1/integracoes-entregas/"))
checar("GET /credenciais-api/", client.get("/api/v1/credenciais-api/"))
checar("GET /webhooks/", client.get("/api/v1/webhooks/"))
checar("GET /integracoes/calendario.ics", client.get("/api/v1/integracoes/calendario.ics"), 200)
checar("GET /integracoes/dataset/", client.get("/api/v1/integracoes/dataset/"), 200, "linhas")
checar("GET /integracoes/dataset/?formato=CSV", client.get("/api/v1/integracoes/dataset/?formato=CSV"), 200)

integracao_teste = client.post(
    "/api/v1/integracoes/",
    {"nome": "Integracao Smoke", "tipo": "JIRA", "direcao": "SAIDA",
     "url_base": "https://exemplo.atlassian.net", "modo_simulacao": True},
    format="json",
)
checar("POST /integracoes/", integracao_teste, 201, "id")
if integracao_teste.status_code == 201:
    iid = integracao_teste.json()["id"]
    checar("POST /integracoes/{id}/testar/", client.post(f"/api/v1/integracoes/{iid}/testar/", {}, format="json"), 200, "mensagem")
    checar("POST /integracoes/{id}/sincronizar/", client.post(
        f"/api/v1/integracoes/{iid}/sincronizar/", {"operacao": "EXPORTAR", "limite": 5}, format="json"), 201, "status")
    checar("GET /integracoes/{id}/historico/", client.get(f"/api/v1/integracoes/{iid}/historico/"), 200, "execucoes")
    checar("POST /integracoes/{id}/mapeamentos/", client.post(
        f"/api/v1/integracoes/{iid}/mapeamentos/",
        {"campo_origem": "summary", "campo_destino": "nome", "transformacao": "TRIM", "obrigatorio": True},
        format="json"), 201, "id")
    checar("DELETE /integracoes/{id}/", client.delete(f"/api/v1/integracoes/{iid}/"), 204)

checar("POST /integracoes-eventos/simular/", client.post("/api/v1/integracoes-eventos/simular/", {}, format="json"), 201, "entrega")
checar("POST /integracoes-eventos/despachar/", client.post("/api/v1/integracoes-eventos/despachar/", {"limite": 5}, format="json"), 200, "eventos")

# --------------------------------------------------------------- central de ajuda
checar("GET /ajuda/", client.get("/api/v1/ajuda/"))
checar("GET /ajuda/?completo=1", client.get("/api/v1/ajuda/?completo=1&page_size=5"), 200)
checar("GET /ajuda/grupos/", client.get("/api/v1/ajuda/grupos/"), 200, "grupos")
checar("GET /ajuda/resumo/", client.get("/api/v1/ajuda/resumo/"), 200, "total_guias")
checar("GET /ajuda-busca/?q=projeto", client.get("/api/v1/ajuda-busca/?q=projeto"), 200, "resultados")
checar("GET /ajuda/por-rota/ (estatica)", client.get("/api/v1/ajuda/por-rota/?rota=/kanban"), 200, "encontrado")
checar("GET /ajuda/por-rota/ (com parametro)", client.get("/api/v1/ajuda/por-rota/?rota=/projetos/42/"), 200, "encontrado")
checar("GET /ajuda/por-rota/ (inexistente)", client.get("/api/v1/ajuda/por-rota/?rota=/nao-existe"), 200)

_guia_teste = client.get("/api/v1/ajuda/por-rota/?rota=/kanban")
if _guia_teste.status_code == 200 and _guia_teste.json().get("encontrado"):
    _gid = _guia_teste.json()["guia"]["id"]
    checar("POST /ajuda/{id}/feedback/", client.post(f"/api/v1/ajuda/{_gid}/feedback/", {"util": True}, format="json"), 200, "percentual_util")
    checar("GET /ajuda/{id}/", client.get(f"/api/v1/ajuda/{_gid}/"), 200, "passos")
else:
    falhas.append("Central de ajuda: o guia de /kanban não foi encontrado — verifique se carregar_ajuda foi executado")

# ------------------------------------------------------------------ analytics
checar("GET /analytics/painel/", client.get("/api/v1/analytics/painel/"), 200)
checar("GET /analytics/risco-atraso/", client.get("/api/v1/analytics/risco-atraso/"), 200, "projetos")
checar("GET /analytics/benchmarking/", client.get("/api/v1/analytics/benchmarking/"), 200, "metricas")
checar("GET /analytics/tendencias/", client.get("/api/v1/analytics/tendencias/?meses=12"), 200, "series")
checar("GET /analytics/demanda-pessoas/", client.get("/api/v1/analytics/demanda-pessoas/?meses=12"), 200, "serie")
checar("GET /analytics/vies/", client.get("/api/v1/analytics/vies/?dias=180"), 200, "aviso_metodologico")
checar("GET /analytics/previsoes/", client.get("/api/v1/analytics/previsoes/"))
checar("GET /analytics/auditorias/", client.get("/api/v1/analytics/auditorias/"))
checar("POST /analytics/vies/executar/", client.post("/api/v1/analytics/vies/executar/", {"dias": 90}, format="json"), 201)

from apps.portfolio.models import StatusProjeto as _SP  # noqa: E402

_projeto_ativo = Project.objects.filter(status=_SP.EM_EXECUCAO).first()
if _projeto_ativo:
    checar("GET /analytics/previsao/{id}/", client.get(f"/api/v1/analytics/previsao/{_projeto_ativo.id}/"), 200, "monte_carlo")
    checar("POST /analytics/previsao/{id}/", client.post(f"/api/v1/analytics/previsao/{_projeto_ativo.id}/", {}, format="json"), 201)
    checar("POST /analytics/monte-carlo/", client.post(
        "/api/v1/analytics/monte-carlo/", {"project": _projeto_ativo.id, "iteracoes": 200, "semente": 7}, format="json"), 200)

# ------------------------------------------------------------------ RBAC 403
membro = APIClient()
login_m = membro.post("/api/v1/auth/token/", {"email": "ana.cunha@empresa.com.br", "password": "sgp123456"}, format="json")
if login_m.status_code == 200:
    membro.credentials(HTTP_AUTHORIZATION=f"Bearer {login_m.json()['access']}")
    resposta = membro.get("/api/v1/auditoria/")
    if resposta.status_code == 403:
        ok += 1
    else:
        falhas.append(f"RBAC: membro deveria receber 403 em /auditoria/ mas recebeu {resposta.status_code}")
    checar("GET /projetos/ (membro)", membro.get("/api/v1/projetos/?page_size=2"))
    checar("GET /dashboard/executivo/ (membro)", membro.get("/api/v1/dashboard/executivo/"))
else:
    falhas.append(f"login do membro falhou: {login_m.status_code}")

print(f"\n{'=' * 62}")
print(f"  ENDPOINTS OK: {ok}")
print(f"  FALHAS: {len(falhas)}")
print(f"{'=' * 62}")
for falha in falhas:
    print(f"  X {falha}")
sys.exit(1 if falhas else 0)

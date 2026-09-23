"""Popula o SGP com dados de demonstração realistas em português.

Uso:
    python manage.py seed_sgp            # popula (idempotente por --limpar)
    python manage.py seed_sgp --limpar   # apaga os dados de demonstração antes
"""
from __future__ import annotations

import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.capabilities.analytics import detectar_bus_factor, previsao_demanda
from apps.capabilities.models import (
    AllocationRecommendation,
    DevelopmentAction,
    DevelopmentPlan,
    EmployeeSkill,
    EmployeeTraining,
    InternalOpportunity,
    Mentorship,
    NivelProficiencia,
    OpportunityApplication,
    PerfilNivel,
    PosicaoChave,
    ProjectSkillRequirement,
    Skill,
    SkillAssessment,
    SkillCategory,
    SkillEndorsement,
    SkillEvidence,
    SkillHistory,
    StatusAcao,
    StatusPDI,
    SuccessionPlan,
    Training,
)
from apps.core.models import (
    Atividade,
    Comentario,
    DashboardLayout,
    Notificacao,
    Perfil,
    Role,
    SavedFilter,
    User,
    UserRole,
    Webhook,
)
from apps.finance.models import Lancamento, Orcamento, StatusLancamento, TipoCusto, TipoLancamento
from apps.integrations.models import (
    Integracao,
    MapeamentoCampo,
    Transformacao,
    TipoIntegracao,
)
from apps.portfolio.models import (
    Baseline,
    CampoCustomizado,
    Criticidade,
    KPI,
    LicaoAprendida,
    Milestone,
    Portfolio,
    Prioridade,
    Program,
    Project,
    Saude,
    StatusMarco,
    StatusProjeto,
    Workflow,
    WorkflowState,
    WorkflowTransition,
)
from apps.resources.models import (
    Alocacao,
    ModalidadeAlocacao,
    Recurso,
    StatusAlocacao,
    Timesheet,
    TipoRecurso,
)
from apps.risks.models import (
    CategoriaRisco,
    EstrategiaResposta,
    Issue,
    Risk,
    RiskHistory,
    StatusIssue,
    StatusRisco,
    TipoIssue,
)
from apps.tasks.models import (
    ChecklistItem,
    StatusTarefa,
    Task,
    TaskDependency,
    TaskSkillRequirement,
    TipoDependencia,
)
from apps.tasks.services import calcular_caminho_critico

HOJE = timezone.localdate()
RNG = random.Random(20260416)

# ---------------------------------------------------------------------------
# Massa de dados
# ---------------------------------------------------------------------------
PESSOAS = [
    ("Helena Marques", "helena.marques@empresa.com.br", Perfil.EXECUTIVO, "Diretora de Portfólio", "Executivo", "São Paulo/SP", 480),
    ("Ricardo Tavares", "ricardo.tavares@empresa.com.br", Perfil.PMO, "Gerente de PMO", "PMO", "São Paulo/SP", 320),
    ("Camila Andrade", "camila.andrade@empresa.com.br", Perfil.PMO, "Analista de Portfólio Sênior", "PMO", "São Paulo/SP", 240),
    ("Bruno Carvalho", "bruno.carvalho@empresa.com.br", Perfil.GERENTE, "Gerente de Projetos Sênior", "Tecnologia", "São Paulo/SP", 290),
    ("Fernanda Lima", "fernanda.lima@empresa.com.br", Perfil.GERENTE, "Gerente de Projetos", "Tecnologia", "Belo Horizonte/MG", 260),
    ("Diego Nascimento", "diego.nascimento@empresa.com.br", Perfil.GERENTE, "Gerente de Projetos", "Dados & Analytics", "Recife/PE", 265),
    ("Patrícia Rocha", "patricia.rocha@empresa.com.br", Perfil.GERENTE, "Gerente de Projetos", "Negócios", "São Paulo/SP", 255),
    ("Thiago Menezes", "thiago.menezes@empresa.com.br", Perfil.LIDER, "Arquiteto de Soluções", "Tecnologia", "São Paulo/SP", 245),
    ("Juliana Prado", "juliana.prado@empresa.com.br", Perfil.LIDER, "Tech Lead Backend", "Tecnologia", "Porto Alegre/RS", 230),
    ("Marcos Vinícius Alves", "marcos.alves@empresa.com.br", Perfil.LIDER, "Especialista em Cloud", "Tecnologia", "São Paulo/SP", 250),
    ("Renata Ribeiro", "renata.ribeiro@empresa.com.br", Perfil.LIDER, "Tech Lead de Dados", "Dados & Analytics", "Recife/PE", 235),
    ("Alexandre Souza", "alexandre.souza@empresa.com.br", Perfil.LIDER, "Especialista em Segurança", "Segurança", "Brasília/DF", 255),
    ("Larissa Fontes", "larissa.fontes@empresa.com.br", Perfil.RH, "Gerente de DHO", "Pessoas", "São Paulo/SP", 260),
    ("Gustavo Pereira", "gustavo.pereira@empresa.com.br", Perfil.RH, "Especialista em Desenvolvimento", "Pessoas", "São Paulo/SP", 195),
    ("Ana Beatriz Cunha", "ana.cunha@empresa.com.br", Perfil.MEMBRO, "Desenvolvedora Backend Sênior", "Tecnologia", "Porto Alegre/RS", 185),
    ("Rafael Moreira", "rafael.moreira@empresa.com.br", Perfil.MEMBRO, "Desenvolvedor Full Stack Pleno", "Tecnologia", "São Paulo/SP", 145),
    ("Isabela Cardoso", "isabela.cardoso@empresa.com.br", Perfil.MEMBRO, "Desenvolvedora Frontend Plena", "Tecnologia", "Belo Horizonte/MG", 140),
    ("Leonardo Batista", "leonardo.batista@empresa.com.br", Perfil.MEMBRO, "Engenheiro de Dados Sênior", "Dados & Analytics", "Recife/PE", 195),
    ("Mariana Teixeira", "mariana.teixeira@empresa.com.br", Perfil.MEMBRO, "Cientista de Dados Plena", "Dados & Analytics", "São Paulo/SP", 165),
    ("Vitor Hugo Ramos", "vitor.ramos@empresa.com.br", Perfil.MEMBRO, "Engenheiro DevOps Pleno", "Tecnologia", "São Paulo/SP", 160),
    ("Carolina Mendes", "carolina.mendes@empresa.com.br", Perfil.MEMBRO, "Analista de BI Sênior", "Dados & Analytics", "Recife/PE", 170),
    ("Pedro Henrique Barros", "pedro.barros@empresa.com.br", Perfil.MEMBRO, "Desenvolvedor Backend Júnior", "Tecnologia", "Porto Alegre/RS", 85),
    ("Sofia Almeida", "sofia.almeida@empresa.com.br", Perfil.MEMBRO, "Analista de Qualidade Plena", "Tecnologia", "São Paulo/SP", 125),
    ("Eduardo Farias", "eduardo.farias@empresa.com.br", Perfil.MEMBRO, "Analista de Negócios Sênior", "Negócios", "São Paulo/SP", 175),
    ("Beatriz Nogueira", "beatriz.nogueira@empresa.com.br", Perfil.MEMBRO, "UX Designer Plena", "Negócios", "São Paulo/SP", 150),
    ("Murilo Castro", "murilo.castro@empresa.com.br", Perfil.MEMBRO, "Analista de Segurança Pleno", "Segurança", "Brasília/DF", 155),
    ("Tatiane Freitas", "tatiane.freitas@empresa.com.br", Perfil.MEMBRO, "Scrum Master", "PMO", "São Paulo/SP", 160),
    ("Henrique Pacheco", "henrique.pacheco@empresa.com.br", Perfil.MEMBRO, "Desenvolvedor Mobile Pleno", "Tecnologia", "Recife/PE", 150),
    ("Natália Barbosa", "natalia.barbosa@empresa.com.br", Perfil.MEMBRO, "Engenheira de Dados Júnior", "Dados & Analytics", "Recife/PE", 90),
    ("Otávio Lemos", "otavio.lemos@empresa.com.br", Perfil.STAKEHOLDER, "Diretor Financeiro", "Financeiro", "São Paulo/SP", 420),
    ("Cláudia Rezende", "claudia.rezende@empresa.com.br", Perfil.STAKEHOLDER, "Diretora de Operações", "Operações", "São Paulo/SP", 430),
]

CATEGORIAS = [
    ("Engenharia de Software", "code", "#3B82F6", [
        ("Java", "TECNICA", "Backend corporativo com Spring Boot", "ALTA"),
        ("Python", "TECNICA", "Automação, APIs e ciência de dados", "ESTRATEGICA"),
        ("TypeScript", "TECNICA", "Frontend e backend tipados", "ALTA"),
        ("React", "FERRAMENTA", "Interface de usuário componentizada", "ALTA"),
        ("Node.js", "FERRAMENTA", "Serviços backend em JavaScript", "ALTA"),
        ("SQL", "TECNICA", "Modelagem e consulta de dados relacionais", "ESTRATEGICA"),
        ("APIs REST", "TECNICA", "Design e evolução de APIs", "ALTA"),
        ("Testes Automatizados", "TECNICA", "Unitários, integração e E2E", "ALTA"),
        ("Arquitetura de Software", "TECNICA", "Padrões, decisões e trade-offs", "ESTRATEGICA"),
    ]),
    ("Cloud e Plataforma", "cloud", "#0EA5E9", [
        ("AWS", "FERRAMENTA", "Serviços da Amazon Web Services", "ESTRATEGICA"),
        ("Azure", "FERRAMENTA", "Serviços da Microsoft Azure", "ALTA"),
        ("Kubernetes", "FERRAMENTA", "Orquestração de contêineres", "ALTA"),
        ("Terraform", "FERRAMENTA", "Infraestrutura como código", "ALTA"),
        ("CI/CD", "METODOLOGIA", "Integração e entrega contínuas", "ALTA"),
        ("Observabilidade", "TECNICA", "Métricas, logs e tracing", "MEDIA"),
    ]),
    ("Dados e Analytics", "database", "#8B5CF6", [
        ("Engenharia de Dados", "TECNICA", "Pipelines e modelagem analítica", "ALTA"),
        ("Power BI", "FERRAMENTA", "Painéis e modelos analíticos", "MEDIA"),
        ("Machine Learning", "TECNICA", "Modelos preditivos e avaliação", "ALTA"),
        ("Estatística Aplicada", "TECNICA", "Inferência e experimentação", "MEDIA"),
        ("Governança de Dados", "DOMINIO", "Qualidade, linhagem e LGPD", "ALTA"),
    ]),
    ("Segurança", "shield", "#EF4444", [
        ("Segurança da Informação", "DOMINIO", "Controles, riscos e conformidade", "ESTRATEGICA"),
        ("LGPD", "DOMINIO", "Lei Geral de Proteção de Dados", "ESTRATEGICA"),
        ("Pentest", "TECNICA", "Testes de intrusão e análise de vulnerabilidades", "ALTA"),
    ]),
    ("Gestão e Métodos", "clipboard-list", "#F59E0B", [
        ("Gestão de Projetos", "METODOLOGIA", "Planejamento, execução e controle", "ESTRATEGICA"),
        ("Scrum", "METODOLOGIA", "Framework ágil com sprints", "ALTA"),
        ("Kanban", "METODOLOGIA", "Fluxo contínuo e limite de WIP", "MEDIA"),
        ("Análise de Riscos", "METODOLOGIA", "Identificação, análise e resposta", "ALTA"),
        ("EVM", "METODOLOGIA", "Gestão de valor agregado", "MEDIA"),
        ("Gestão de Mudanças", "METODOLOGIA", "Adoção e transição organizacional", "MEDIA"),
    ]),
    ("Negócios e Domínio", "building", "#10B981", [
        ("Análise de Negócios", "DOMINIO", "Levantamento e priorização de requisitos", "ALTA"),
        ("Processos BPMN", "DOMINIO", "Modelagem e otimização de processos", "MEDIA"),
        ("Experiência do Cliente", "DOMINIO", "Jornadas, personas e satisfação", "MEDIA"),
        ("Finanças Corporativas", "DOMINIO", "Orçamento, CAPEX e OPEX", "MEDIA"),
        ("Supply Chain", "DOMINIO", "Cadeia de suprimentos e logística", "BAIXA"),
    ]),
    ("Comportamental", "users", "#EC4899", [
        ("Comunicação", "COMPORTAMENTAL", "Clareza escrita e oral em contextos diversos", "ALTA"),
        ("Liderança", "COMPORTAMENTAL", "Desenvolvimento de pessoas e times", "ALTA"),
        ("Pensamento Crítico", "COMPORTAMENTAL", "Análise estruturada de problemas", "ALTA"),
        ("Colaboração", "COMPORTAMENTAL", "Trabalho em equipe multidisciplinar", "MEDIA"),
        ("Mentoria", "COMPORTAMENTAL", "Desenvolvimento de colegas", "MEDIA"),
        ("Adaptabilidade", "COMPORTAMENTAL", "Resiliência a mudanças", "MEDIA"),
    ]),
    ("Idiomas", "globe", "#06B6D4", [
        ("Inglês", "IDIOMA", "Comunicação profissional", "ALTA"),
        ("Espanhol", "IDIOMA", "Comunicação profissional", "MEDIA"),
    ]),
    ("Certificações", "award", "#6366F1", [
        ("PMP", "CERTIFICACAO", "Project Management Professional (PMI)", "MEDIA"),
        ("AWS Solutions Architect", "CERTIFICACAO", "Certificação de arquitetura AWS", "ALTA"),
        ("Scrum Master PSM I", "CERTIFICACAO", "Certificação Professional Scrum Master", "BAIXA"),
        ("CISSP", "CERTIFICACAO", "Certificação internacional de segurança", "MEDIA"),
    ]),
]

PROJETOS = [
    ("Migração para Nuvem AWS", "Transformação Digital", "Tecnologia", 4_850_000, -180, 200, "EM_EXECUCAO", "ALTA", "cloud", "#3B82F6", "Reduzir custo de infraestrutura em 35% e aumentar elasticidade."),
    ("Plataforma de Dados Unificada", "Dados & Analytics", "Dados & Analytics", 3_200_000, -120, 240, "EM_EXECUCAO", "CRITICA", "database", "#8B5CF6", "Centralizar dados de 12 sistemas em um lakehouse governado."),
    ("Modernização do Portal do Cliente", "Experiência do Cliente", "Negócios", 1_950_000, -90, 150, "EM_EXECUCAO", "ALTA", "globe", "#10B981", "Elevar NPS do autoatendimento de 32 para 55."),
    ("Adequação à LGPD — Onda 3", "Compliance", "Segurança", 1_180_000, -240, 60, "EM_EXECUCAO", "CRITICA", "shield", "#EF4444", "Conformidade plena dos processos de marketing e RH."),
    ("Integração ERP × CRM", "Integração", "Tecnologia", 2_400_000, -60, 180, "EM_EXECUCAO", "ALTA", "plug", "#F59E0B", "Eliminar digitação manual entre vendas e faturamento."),
    ("App Mobile de Campo", "Produto", "Tecnologia", 1_650_000, -30, 210, "APROVADO", "ALTA", "smartphone", "#EC4899", "Digitalizar 100% das ordens de serviço em campo."),
    ("Automação do Backoffice Financeiro", "Transformação Digital", "Financeiro", 980_000, -300, -15, "CONCLUIDO", "MEDIA", "wallet", "#84CC16", "Reduzir 40% do esforço manual de conciliação."),
    ("Observabilidade de Aplicações", "Infraestrutura", "Tecnologia", 720_000, 30, 200, "PLANEJADO", "MEDIA", "activity", "#06B6D4", "Reduzir MTTR de 4h para 40min."),
    ("Programa de Governança de Dados", "Compliance", "Dados & Analytics", 1_350_000, 45, 300, "PLANEJADO", "MEDIA", "book-lock", "#6366F1", "Definir papéis, catálogo e qualidade de dados."),
    ("Renovação do Datacenter Sul", "Infraestrutura", "Operações", 2_100_000, -400, -40, "CONCLUIDO", "BAIXA", "server", "#F97316", "Substituir hardware legado fora de garantia."),
    ("IA para Triagem de Chamados", "Dados & Analytics", "Operações", 890_000, -15, 200, "APROVADO", "ALTA", "brain", "#8B5CF6", "Classificar automaticamente 70% dos chamados de nível 1."),
    ("Reestruturação de Processos de RH", "Transformação Digital", "Pessoas", 540_000, -80, 120, "EM_EXECUCAO", "MEDIA", "users", "#EC4899", "Reduzir tempo de fechamento de folha em 3 dias."),
    ("Plataforma de APIs Corporativas", "Integração", "Tecnologia", 1_450_000, -45, 220, "EM_EXECUCAO", "ALTA", "network", "#3B82F6", "Expor 40 serviços internos com governança."),
    ("Comércio Eletrônico B2B", "Produto", "Negócios", 3_600_000, -200, 130, "PAUSADO", "ALTA", "shopping-cart", "#F59E0B", "Canal digital para 2.400 revendedores."),
    ("Continuidade de Negócios e DR", "Compliance", "Segurança", 1_050_000, -25, 190, "EM_EXECUCAO", "ALTA", "shield-check", "#EF4444", "RPO de 1h e RTO de 4h comprovados."),
]

RECURSOS_MATERIAIS = [
    ("Cluster Kubernetes de homologação", TipoRecurso.SOFTWARE, 45, 12, "Cloud Provider BR"),
    ("Licenças Tableau Creator", TipoRecurso.SOFTWARE, 32, 25, "Tableau Brasil"),
    ("Ambiente de testes de carga (k6 Cloud)", TipoRecurso.SERVICO, 180, 1, "LoadForge"),
    ("Notebooks Dell Precision M5680", TipoRecurso.EQUIPAMENTO, 18, 20, "Dell Brasil"),
    ("Sala de war room — Torre Sul", TipoRecurso.INSTALACAO, 60, 2, "Condomínio Torre Sul"),
    ("Serviço de pentest externo", TipoRecurso.SERVICO, 420, 1, "SecOps Consultoria"),
    ("Licenças Figma Organization", TipoRecurso.SOFTWARE, 28, 15, "Figma Inc."),
    ("Kit de sensores IoT para piloto", TipoRecurso.MATERIAL, 95, 40, "IoT Sense"),
]

TAREFAS_PADRAO = [
    ("Levantamento de requisitos e escopo", 40, 0.0, [0]),
    ("Modelagem de arquitetura da solução", 60, 0.0, [0]),
    ("Configuração de ambientes e pipelines", 32, 0.0, [1]),
    ("Implementação do núcleo funcional", 160, 0.0, [1, 2]),
    ("Desenvolvimento das integrações", 96, 0.0, [3]),
    ("Testes automatizados e de regressão", 64, 0.0, [3]),
    ("Teste de carga e ajuste de performance", 40, 0.0, [5]),
    ("Homologação com usuários-chave", 32, 0.0, [6]),
    ("Documentação técnica e runbooks", 24, 0.0, [4]),
    ("Treinamento das equipes de operação", 20, 0.0, [7]),
    ("Go-live assistido", 16, 0.0, [7, 9]),
    ("Estabilização e hypercare", 40, 0.0, [10]),
]

RISCOS_PADRAO = [
    ("Indisponibilidade de especialistas durante a janela de migração", CategoriaRisco.RECURSOS, 3, 5, "CONTRATAR"),
    ("Atraso na entrega de interfaces por fornecedor externo", CategoriaRisco.FORNECEDOR, 4, 4, "MITIGAR"),
    ("Resistência dos usuários à mudança de processo", CategoriaRisco.PESSOAS, 4, 3, "MITIGAR"),
    ("Estouro de orçamento por variação cambial de licenças", CategoriaRisco.CUSTO, 3, 4, "TRANSFERIR"),
    ("Não conformidade com requisitos regulatórios", CategoriaRisco.REGULATORIO, 2, 5, "EVITAR"),
    ("Vazamento de dados sensíveis durante a migração", CategoriaRisco.SEGURANCA, 2, 5, "MITIGAR"),
    ("Dependência de versão descontinuada de biblioteca", CategoriaRisco.TECNICO, 3, 3, "ACEITAR"),
    ("Escopo crescendo por demandas não priorizadas", CategoriaRisco.ESCOPO, 4, 4, "EVITAR"),
    ("Qualidade insuficiente dos dados de origem", CategoriaRisco.QUALIDADE, 4, 4, "MITIGAR"),
    ("Janela de manutenção indisponível no período crítico", CategoriaRisco.PRAZO, 3, 4, "MITIGAR"),
]

ISSUES_PADRAO = [
    ("Ambiente de homologação indisponível desde ontem", TipoIssue.IMPEDIMENTO, "ALTA", StatusIssue.EM_ANDAMENTO),
    ("Divergência de 12% entre relatório gerencial e contábil", TipoIssue.ISSUE, "ALTA", StatusIssue.EM_ANALISE),
    ("Solicitação de mudança: incluir exportação em PDF", TipoIssue.MUDANCA, "MEDIA", StatusIssue.TRIAGEM),
    ("Performance do endpoint de consulta acima de 3s", TipoIssue.ACAO_CORRETIVA, "ALTA", StatusIssue.EM_ANDAMENTO),
    ("Definição pendente sobre retenção de logs", TipoIssue.DECISAO, "MEDIA", StatusIssue.AGUARDANDO),
    ("Falha intermitente na integração de cadastro", TipoIssue.ISSUE, "CRITICA", StatusIssue.ABERTA),
    ("Necessidade de revisão do plano de rollback", TipoIssue.ACAO_CORRETIVA, "MEDIA", StatusIssue.ABERTA),
    ("Usuários relatam lentidão no portal", TipoIssue.ISSUE, "BAIXA", StatusIssue.RESOLVIDA),
]

TREINAMENTOS = [
    ("AWS Certified Solutions Architect — preparatório", "AWS Solutions Architect", 40, "Amazon Training", 2400, 4, 120, True),
    ("Terraform avançado: módulos e state remoto", "Terraform", 24, "HashiCorp Academy", 1200, 4, 80, True),
    ("Kubernetes para desenvolvedores", "Kubernetes", 32, "Linux Foundation", 1600, 3, 90, True),
    ("React com TypeScript na prática", "React", 36, "Alura", 480, 3, 70, False),
    ("Introdução a Machine Learning", "Machine Learning", 48, "Coursera", 900, 2, 80, False),
    ("Gestão de riscos em projetos (PMI-RMP)", "Análise de Riscos", 30, "PMI", 2100, 4, 100, True),
    ("LGPD aplicada a operações de TI", "LGPD", 16, "Jurídico Interno", 0, 3, 40, False),
    ("Comunicação assertiva e feedback", "Comunicação", 12, "Escola de Liderança", 600, 3, 35, False),
    ("Scrum Master certificação PSM I", "Scrum", 20, "Scrum.org", 1100, 3, 60, True),
    ("Power BI avançado: DAX e modelagem", "Power BI", 28, "Microsoft Learn", 750, 3, 65, False),
    ("Inglês para reuniões técnicas", "Inglês", 60, "Fluency Academy", 1800, 3, 90, False),
    ("Arquitetura de microsserviços", "Arquitetura de Software", 40, "InfoQ Academy", 1900, 4, 110, False),
]

OPORTUNIDADES = [
    ("Vaga em projeto: Arquitetura Cloud AWS", "PROJETO", ["AWS", "Terraform", "Kubernetes"], 4, 20, 2),
    ("Mentoria: Trilha de Engenharia de Dados", "MENTORIA", ["Engenharia de Dados", "SQL", "Python"], 4, 4, 3),
    ("Comunidade de Prática em Segurança", "COMUNIDADE", ["Segurança da Informação", "LGPD"], 3, 2, 8),
    ("Movimentação interna: Tech Lead de Dados", "MOVIMENTACAO", ["Engenharia de Dados", "Liderança", "Governança de Dados"], 4, 40, 1),
    ("Trilha de certificação PMP patrocinada", "TREINAMENTO", ["Gestão de Projetos", "PMP"], 3, 8, 5),
    ("Vaga em projeto: Modernização do Portal", "PROJETO", ["React", "TypeScript", "UX Designer"], 3, 30, 2),
]

POSICOES_CHAVE = [
    ("Arquiteto(a) de Soluções Corporativas", "Tecnologia", "ALTO", ["Arquitetura de Software", "AWS", "APIs REST"]),
    ("Especialista em Segurança da Informação", "Segurança", "CRITICO", ["Segurança da Informação", "LGPD", "Pentest"]),
    ("Tech Lead de Engenharia de Dados", "Dados & Analytics", "ALTO", ["Engenharia de Dados", "SQL", "Python"]),
    ("Gerente de PMO", "PMO", "MEDIO", ["Gestão de Projetos", "EVM", "Análise de Riscos"]),
]


# ---------------------------------------------------------------------------
# Composições de relatório pré-salvas (RF-30)
#
# is_default=True é o que torna um layout visível para os outros usuários
# (DashboardLayoutViewSet.get_queryset devolve os layouts do dono mais todos os
# padrão). Por isso os modelos compartilhados são poucos, têm nome próprio e
# pertencem ao PMO, enquanto cada pessoa recebe composições privadas diferentes
# entre si. Antes, todo mundo nascia com um único layout chamado "Meu painel
# executivo" e exatamente a mesma lista de widgets: a tela Relatórios exibia
# vários itens idênticos e carregar qualquer um mostrava sempre o mesmo painel.
# ---------------------------------------------------------------------------
def _widget_composicao(id_, tipo, x, y, w, h):
    """Widget de uma composição: w vai de 3 a 12 colunas e h de 2 a 4 linhas."""
    return {"id": id_, "tipo": tipo, "x": x, "y": y, "w": w, "h": h}


# Payload que as versões anteriores do seed gravavam em todas as composições.
# Serve apenas para reconhecer e remover o resíduo idêntico já existente no
# banco: nome repetido e mesmos widgets, sem nada que distinga uma da outra.
COMPOSICAO_DO_SEED_ANTIGO = [
    {"id": "kpi-saude", "tipo": "donut", "x": 0, "y": 0, "w": 3, "h": 2},
    {"id": "kpi-orcamento", "tipo": "barras", "x": 3, "y": 0, "w": 6, "h": 2},
    {"id": "kpi-cpi-spi", "tipo": "gauge", "x": 9, "y": 0, "w": 3, "h": 2},
    {"id": "curva-s", "tipo": "linha", "x": 0, "y": 2, "w": 8, "h": 3},
    {"id": "matriz-riscos", "tipo": "matriz", "x": 8, "y": 2, "w": 4, "h": 3},
]


MODELOS_COMPOSICAO = [
    {
        "nome": "Modelo SGP — visão executiva",
        "widgets_json": [
            _widget_composicao("kpi-projetos-status", "donut", 0, 0, 4, 3),
            _widget_composicao("kpi-saude", "donut", 4, 0, 4, 3),
            _widget_composicao("kpi-cpi-spi", "gauge", 8, 0, 4, 3),
            _widget_composicao("kpi-orcamento", "barras", 0, 3, 6, 3),
            _widget_composicao("projetos-atrasados", "lista", 6, 3, 6, 3),
        ],
    },
    {
        "nome": "Modelo SGP — cronograma e custo",
        "widgets_json": [
            _widget_composicao("gantt-portfolio", "gantt", 0, 0, 12, 4),
            _widget_composicao("curva-s", "linha", 0, 4, 8, 3),
            _widget_composicao("kpi-cpi-spi", "gauge", 8, 4, 4, 3),
            _widget_composicao("burndown", "area", 0, 7, 6, 3),
            _widget_composicao("kpi-orcamento", "barras", 6, 7, 6, 3),
        ],
    },
    {
        "nome": "Modelo SGP — capacidades e alocação",
        "widgets_json": [
            _widget_composicao("heatmap-capacidade", "heatmap", 0, 0, 12, 4),
            _widget_composicao("matriz-skills", "heatmap", 0, 4, 6, 3),
            _widget_composicao("gap-analysis", "barras", 6, 4, 6, 3),
            _widget_composicao("bus-factor", "grafo", 0, 7, 6, 3),
            _widget_composicao("aderencia-alocacao", "gauge", 6, 7, 6, 3),
        ],
    },
]

# Cada perfil recebe painéis que os endpoints dos widgets permitem carregar:
# matriz de riscos exige risco.ver, mapa de ocupação e aderência exigem
# alocacao.ver, curva S exige financeiro.ver, e assim por diante.
COMPOSICOES_POR_PERFIL = {
    Perfil.EXECUTIVO: [
        {
            "nome": "Painel executivo do portfólio",
            "widgets_json": [
                _widget_composicao("kpi-projetos-status", "donut", 0, 0, 6, 3),
                _widget_composicao("kpi-saude", "donut", 6, 0, 6, 3),
                _widget_composicao("kpi-orcamento", "barras", 0, 3, 6, 3),
                _widget_composicao("projetos-atrasados", "lista", 6, 3, 6, 3),
                _widget_composicao("matriz-riscos", "matriz", 0, 6, 12, 4),
            ],
        },
        {
            "nome": "Riscos e cronograma do trimestre",
            "widgets_json": [
                _widget_composicao("gantt-portfolio", "gantt", 0, 0, 12, 4),
                _widget_composicao("matriz-riscos", "matriz", 0, 4, 6, 3),
                _widget_composicao("projetos-atrasados", "lista", 6, 4, 6, 3),
            ],
        },
    ],
    Perfil.PMO: [
        {
            "nome": "Controle de portfólio",
            "widgets_json": [
                _widget_composicao("kpi-projetos-status", "donut", 0, 0, 6, 3),
                _widget_composicao("kpi-saude", "donut", 6, 0, 6, 3),
                _widget_composicao("projetos-atrasados", "lista", 0, 3, 6, 3),
                _widget_composicao("gantt-portfolio", "gantt", 6, 3, 6, 4),
            ],
        },
        {
            "nome": "Custo e prazo das entregas",
            "widgets_json": [
                _widget_composicao("kpi-orcamento", "barras", 0, 0, 6, 3),
                _widget_composicao("kpi-cpi-spi", "gauge", 6, 0, 6, 3),
                _widget_composicao("curva-s", "linha", 0, 3, 12, 4),
            ],
        },
    ],
    Perfil.GERENTE: [
        {
            "nome": "Acompanhamento de entrega",
            "widgets_json": [
                _widget_composicao("gantt-portfolio", "gantt", 0, 0, 12, 4),
                _widget_composicao("burndown", "area", 0, 4, 6, 3),
                _widget_composicao("curva-s", "linha", 6, 4, 6, 3),
            ],
        },
        {
            "nome": "Equipe e alocação da entrega",
            "widgets_json": [
                _widget_composicao("heatmap-capacidade", "heatmap", 0, 0, 12, 4),
                _widget_composicao("aderencia-alocacao", "gauge", 0, 4, 4, 3),
                _widget_composicao("timeline-atividades", "timeline", 4, 4, 8, 3),
            ],
        },
    ],
    Perfil.LIDER: [
        {
            "nome": "Cronograma da equipe",
            "widgets_json": [
                _widget_composicao("gantt-portfolio", "gantt", 0, 0, 12, 4),
                _widget_composicao("burndown", "area", 0, 4, 6, 3),
                _widget_composicao("timeline-atividades", "timeline", 6, 4, 6, 3),
            ],
        },
        {
            "nome": "Capacidades do time",
            "widgets_json": [
                _widget_composicao("matriz-skills", "heatmap", 0, 0, 8, 4),
                _widget_composicao("gap-analysis", "barras", 8, 0, 4, 3),
                _widget_composicao("bus-factor", "grafo", 0, 4, 8, 3),
            ],
        },
    ],
    Perfil.RH: [
        {
            "nome": "Capacidades e desenvolvimento",
            "widgets_json": [
                _widget_composicao("matriz-skills", "heatmap", 0, 0, 12, 4),
                _widget_composicao("gap-analysis", "barras", 0, 4, 6, 3),
                _widget_composicao("bus-factor", "grafo", 6, 4, 6, 3),
                _widget_composicao("timeline-atividades", "timeline", 0, 7, 12, 3),
            ],
        },
        {
            "nome": "Portfólio e capacidades",
            "widgets_json": [
                _widget_composicao("kpi-projetos-status", "donut", 0, 0, 6, 3),
                _widget_composicao("kpi-saude", "donut", 6, 0, 6, 3),
                _widget_composicao("gantt-portfolio", "gantt", 0, 3, 12, 4),
            ],
        },
    ],
    Perfil.MEMBRO: [
        {
            "nome": "Minhas entregas",
            "widgets_json": [
                _widget_composicao("burndown", "area", 0, 0, 6, 3),
                _widget_composicao("timeline-atividades", "timeline", 6, 0, 6, 3),
                _widget_composicao("kpi-projetos-status", "donut", 0, 3, 12, 3),
            ],
        },
        {
            "nome": "Portfólio em números",
            "widgets_json": [
                _widget_composicao("kpi-projetos-status", "donut", 0, 0, 6, 3),
                _widget_composicao("kpi-saude", "donut", 6, 0, 6, 3),
                _widget_composicao("projetos-atrasados", "lista", 0, 3, 12, 3),
            ],
        },
    ],
    Perfil.STAKEHOLDER: [
        {
            "nome": "Visão de portfólio",
            "widgets_json": [
                _widget_composicao("kpi-projetos-status", "donut", 0, 0, 6, 3),
                _widget_composicao("kpi-saude", "donut", 6, 0, 6, 3),
                _widget_composicao("projetos-atrasados", "lista", 0, 3, 6, 3),
                _widget_composicao("matriz-riscos", "matriz", 6, 3, 6, 3),
            ],
        },
        {
            "nome": "Cronograma macro",
            "widgets_json": [
                _widget_composicao("gantt-portfolio", "gantt", 0, 0, 12, 4),
                _widget_composicao("burndown", "area", 0, 4, 6, 3),
                _widget_composicao("matriz-riscos", "matriz", 6, 4, 6, 3),
            ],
        },
    ],
}


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument("--limpar", action="store_true", help="Apaga os dados de demonstração antes de popular.")
        parser.add_argument("--sem-analytics", action="store_true", help="Não executar bus factor e forecast.")

    @transaction.atomic
    def handle(self, *args, **options):
        if options["limpar"]:
            self._limpar()
        self.stdout.write(self.style.MIGRATE_HEADING("SGP · populando dados de demonstração"))

        papeis = self._papeis()
        self._criterios_nivel()
        skills = self._catalogo()
        usuarios = self._usuarios(papeis)
        portfolios, programas, projetos = self._portfolios(usuarios)
        self._tarefas(projetos)
        self._financeiro(projetos, usuarios)
        self._riscos_issues(projetos, usuarios)
        recursos = self._recursos()
        self._alocacoes_timesheet(projetos, usuarios, recursos)
        self._capacidades(usuarios, skills)
        self._pdi_treinamentos(usuarios, skills)
        self._oportunidades_sucessao(usuarios, projetos)
        self._workflows_campos()
        self._integracoes(usuarios)
        self._preferencias_notificacoes(usuarios, projetos)
        self._recalcular(projetos)
        if not options["sem_analytics"]:
            detectar_bus_factor(salvar=True)
            previsao_demanda(horizonte_meses=9, salvar=True)

        self.stdout.write(self.style.SUCCESS("\nDados de demonstração criados com sucesso."))
        self.stdout.write(self.style.SUCCESS("Acesso: admin@empresa.com.br / sgp123456 (Administrador)"))
        self.stdout.write(self.style.SUCCESS("        helena.marques@empresa.com.br / sgp123456 (Executiva)"))
        self.stdout.write(self.style.SUCCESS("        bruno.carvalho@empresa.com.br / sgp123456 (Gerente de Projetos)"))
        self.stdout.write(self.style.SUCCESS("        ana.cunha@empresa.com.br / sgp123456 (Membro de Equipe)"))

    # ------------------------------------------------------------------ limpar
    def _limpar(self):
        self.stdout.write("  · removendo dados anteriores...")
        from apps.capabilities.models import SugestaoPromocao, SkillDemandForecast, BusFactorAlert
        from apps.core.models import AuditLog

        from apps.integrations.models import (
            EventoIntegracao,
            Integracao,
            SincronizacaoLog,
            TokenAPI as CredencialAPI,
            WebhookEntrega,
        )

        for modelo in (
            WebhookEntrega, EventoIntegracao, SincronizacaoLog, CredencialAPI, Integracao,
            Timesheet, Alocacao, Recurso, Lancamento, Orcamento, Issue, RiskHistory, Risk,
            TaskDependency, ChecklistItem, TaskSkillRequirement, Task, Milestone, KPI, Baseline,
            LicaoAprendida, ProjectSkillRequirement, AllocationRecommendation, SkillHistory,
            SkillEvidence, SkillEndorsement, SkillAssessment, SugestaoPromocao, EmployeeSkill,
            DevelopmentAction, DevelopmentPlan, EmployeeTraining, Training, Mentorship,
            OpportunityApplication, InternalOpportunity, SuccessionPlan, PosicaoChave,
            SkillDemandForecast, BusFactorAlert, Comentario, Notificacao, Atividade, DashboardLayout,
            SavedFilter, CampoCustomizado, WorkflowTransition, WorkflowState, Workflow,
            Webhook,
            Project, Program, Portfolio, Skill, SkillCategory, PerfilNivel, Role,
        ):
            modelo.objects.all().delete()
        AuditLog.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # ------------------------------------------------------------------ papéis
    def _papeis(self):
        self.stdout.write("  · papéis e permissões (RBAC)")
        definicoes = {
            "Administrador do SGP": ["*"],
            "Gestor de Portfólio": ["portfolio.ver", "portfolio.editar", "programa.ver", "programa.editar",
                                     "projeto.ver", "projeto.editar", "dashboard.ver", "financeiro.ver",
                                     "relatorio.ver", "capacidade.ver"],
            "Gerente de Projetos": ["projeto.ver", "projeto.editar", "tarefa.ver", "tarefa.editar",
                                     "recurso.ver", "alocacao.ver", "alocacao.editar", "risco.ver",
                                     "risco.editar", "financeiro.ver", "dashboard.ver"],
            "Membro de Equipe": ["projeto.ver", "tarefa.ver", "tarefa.editar", "capacidade.ver",
                                  "capacidade.autoavaliar", "pdi.ver", "pdi.editar", "timesheet.editar"],
            "RH / DHO": ["capacidade.ver", "capacidade.editar", "capacidade.validar", "pdi.ver",
                          "pdi.editar", "mentoria.editar", "treinamento.editar", "auditoria.ver"],
            "PMO": ["portfolio.ver", "programa.ver", "projeto.ver", "projeto.editar", "dashboard.ver",
                     "relatorio.ver", "capacidade.ver", "capacidade.validar", "auditoria.ver"],
            "Auditor": ["auditoria.ver", "projeto.ver", "financeiro.ver", "dashboard.ver", "relatorio.ver"],
        }
        papeis = {}
        for nome, permissoes in definicoes.items():
            papel, _ = Role.objects.update_or_create(
                nome=nome, defaults={"permissoes": permissoes, "is_sistema": True}
            )
            papeis[nome] = papel
        return papeis

    # --------------------------------------------------------- níveis de proficiência
    def _criterios_nivel(self):
        self.stdout.write("  · critérios objetivos de proficiência (níveis 1–5)")
        descricoes = {
            1: "Conhecimento teórico; executa atividades simples com supervisão direta.",
            2: "Executa tarefas simples de forma autônoma com apoio pontual.",
            3: "Autônomo em tarefas típicas; entrega com qualidade sem supervisão.",
            4: "Referência técnica reconhecida; atua como mentor e revisa trabalho de terceiros.",
            5: "Autoridade reconhecida; define padrões organizacionais e representa a empresa externamente.",
        }
        cores = {1: "#94A3B8", 2: "#38BDF8", 3: "#10B981", 4: "#F59E0B", 5: "#EF4444"}
        for nivel in range(1, 6):
            PerfilNivel.objects.update_or_create(
                skill=None, nivel=nivel,
                defaults={
                    "nome": NivelProficiencia(nivel).label,
                    "descricao": descricoes[nivel],
                    "xp_minimo": 100 * nivel,
                    "meses_minimos": 3 if nivel <= 2 else 6,
                    "evidencias_minimas": 1 if nivel <= 2 else 2,
                    "exige_banca": nivel >= 4,
                    "exige_avaliacao_gestor": nivel >= 3,
                    "cor": cores[nivel],
                    "ordem": nivel,
                },
            )

    # ----------------------------------------------------------------- catálogo
    def _catalogo(self):
        self.stdout.write("  · catálogo de capacidades")
        skills = []
        for nome_cat, icone, cor, itens in CATEGORIAS:
            categoria, _ = SkillCategory.objects.update_or_create(
                nome=nome_cat, defaults={"icone": icone, "cor": cor}
            )
            for nome, tipo, descricao, criticidade in itens:
                skill, _ = Skill.objects.update_or_create(
                    nome=nome,
                    defaults={
                        "descricao": descricao, "categoria": categoria, "tipo": tipo,
                        "criticidade": criticidade, "icone": icone, "cor": cor,
                        "status": "ATIVA",
                        "framework_origem": RNG.choice(["ESCO", "SFIA", "O*NET", ""]),
                        "codigo_externo": f"{nome_cat[:3].upper()}-{abs(hash(nome)) % 9000 + 1000}",
                        "peso_estrategico": {"ESTRATEGICA": 2.0, "ALTA": 1.5, "MEDIA": 1.0, "BAIXA": 0.7}[criticidade],
                        "sinonimos": [nome.lower(), nome.replace(" ", "")],
                    },
                )
                skills.append(skill)
        Skill.objects.filter(nome="Inglês").update(criticidade="ALTA", tipo="IDIOMA")
        return skills

    # ----------------------------------------------------------------- usuários
    def _usuarios(self, papeis):
        self.stdout.write("  · pessoas, perfis e vínculos")
        admin, criado = User.objects.get_or_create(
            email="admin@empresa.com.br",
            defaults={
                "nome": "Administrador do SGP", "perfil": Perfil.ADMIN, "cargo": "Administrador",
                "area": "TI", "is_staff": True, "is_superuser": True, "cor": "#111827",
                "custo_hora": Decimal("0"),
            },
        )
        if criado:
            admin.set_password("sgp123456")
            admin.save()

        usuarios = {}
        cores = ["#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981", "#06B6D4",
                 "#6366F1", "#84CC16", "#F97316", "#14B8A6", "#A855F7"]
        for indice, (nome, email, perfil, cargo, area, local, custo) in enumerate(PESSOAS):
            usuario, criado = User.objects.get_or_create(
                email=email,
                defaults={
                    "nome": nome, "perfil": perfil, "cargo": cargo, "area": area,
                    "localizacao": local, "custo_hora": Decimal(str(custo)),
                    "capacidade_semanal_horas": Decimal("40"),
                    "cor": cores[indice % len(cores)],
                    "data_admissao": HOJE - timedelta(days=RNG.randint(200, 3600)),
                    "custo_hora_visivel": perfil in {Perfil.EXECUTIVO, Perfil.PMO},
                    "disponivel_para_mentoria": perfil in {Perfil.LIDER, Perfil.GERENTE, Perfil.PMO},
                    "interesses": RNG.sample(
                        ["cloud", "dados", "segurança", "agilidade", "ux", "arquitetura", "liderança"], k=2
                    ),
                    "is_staff": perfil in {Perfil.ADMIN, Perfil.PMO},
                },
            )
            if criado:
                usuario.set_password("sgp123456")
                usuario.save()
            usuarios[email] = usuario

        # Hierarquia de gestão
        gestores = {
            "Tecnologia": usuarios["bruno.carvalho@empresa.com.br"],
            "Dados & Analytics": usuarios["diego.nascimento@empresa.com.br"],
            "Negócios": usuarios["patricia.rocha@empresa.com.br"],
            "Segurança": usuarios["alexandre.souza@empresa.com.br"],
            "Pessoas": usuarios["larissa.fontes@empresa.com.br"],
            "PMO": usuarios["ricardo.tavares@empresa.com.br"],
        }
        for usuario in usuarios.values():
            if usuario.gestor_id or usuario.perfil in {Perfil.EXECUTIVO, Perfil.PMO}:
                continue
            gestor = gestores.get(usuario.area)
            if gestor and gestor.pk != usuario.pk:
                usuario.gestor = gestor
                usuario.save(update_fields=["gestor"])
        for email in ("bruno.carvalho@empresa.com.br", "diego.nascimento@empresa.com.br",
                      "patricia.rocha@empresa.com.br", "alexandre.souza@empresa.com.br",
                      "larissa.fontes@empresa.com.br", "ricardo.tavares@empresa.com.br"):
            usuarios[email].gestor = usuarios["helena.marques@empresa.com.br"]
            usuarios[email].save(update_fields=["gestor"])

        # Vínculos RBAC
        mapa_papel = {
            Perfil.ADMIN: "Administrador do SGP",
            Perfil.EXECUTIVO: "Gestor de Portfólio",
            Perfil.PMO: "PMO",
            Perfil.GERENTE: "Gerente de Projetos",
            Perfil.LIDER: "Gerente de Projetos",
            Perfil.MEMBRO: "Membro de Equipe",
            Perfil.RH: "RH / DHO",
            Perfil.STAKEHOLDER: "Gestor de Portfólio",
        }
        for usuario in usuarios.values():
            nome_papel = mapa_papel.get(usuario.perfil)
            if nome_papel:
                UserRole.objects.get_or_create(user=usuario, role=papeis[nome_papel], escopo="GLOBAL")
        UserRole.objects.get_or_create(user=admin, role=papeis["Administrador do SGP"], escopo="GLOBAL")
        return usuarios

    # ------------------------------------------------------ portfólio e projetos
    def _portfolios(self, usuarios):
        self.stdout.write("  · portfólios, programas e projetos")
        portfolios = []
        for nome, descricao, cor, icone in [
            ("Transformação Digital", "Modernização de sistemas, canais e modelos operacionais.", "#3B82F6", "rocket"),
            ("Eficiência Operacional", "Redução de custo, automação e excelência operacional.", "#10B981", "gauge"),
            ("Conformidade e Risco", "Regulatório, segurança da informação e continuidade.", "#EF4444", "shield"),
        ]:
            portfolio, _ = Portfolio.objects.update_or_create(
                nome=nome,
                defaults={
                    "descricao": descricao, "cor": cor, "icone": icone,
                    "responsavel": usuarios["helena.marques@empresa.com.br"],
                    "objetivo_estrategico": descricao,
                    "orcamento_anual": Decimal(str(RNG.randint(8, 25) * 1_000_000)),
                },
            )
            portfolios.append(portfolio)

        programas = []
        for nome, portfolio, gerente, cor in [
            ("Cloud & Plataforma", portfolios[0], "bruno.carvalho@empresa.com.br", "#0EA5E9"),
            ("Dados & Inteligência", portfolios[0], "diego.nascimento@empresa.com.br", "#8B5CF6"),
            ("Experiência do Cliente", portfolios[0], "patricia.rocha@empresa.com.br", "#EC4899"),
            ("Automação de Processos", portfolios[1], "patricia.rocha@empresa.com.br", "#10B981"),
            ("Segurança e Privacidade", portfolios[2], "alexandre.souza@empresa.com.br", "#EF4444"),
        ]:
            programa, _ = Program.objects.update_or_create(
                nome=nome,
                defaults={"portfolio": portfolio, "gerente": usuarios[gerente], "cor": cor,
                          "status": "ATIVO", "data_inicio": HOJE - timedelta(days=500),
                          "data_fim": HOJE + timedelta(days=500)},
            )
            programas.append(programa)

        mapa_programa = {
            "Migração para Nuvem AWS": 0, "Observabilidade de Aplicações": 0,
            "Plataforma de APIs Corporativas": 0, "Renovação do Datacenter Sul": 0,
            "Plataforma de Dados Unificada": 1, "Programa de Governança de Dados": 1,
            "IA para Triagem de Chamados": 1,
            "Modernização do Portal do Cliente": 2, "Comércio Eletrônico B2B": 2,
            "App Mobile de Campo": 2,
            "Automação do Backoffice Financeiro": 3, "Reestruturação de Processos de RH": 3,
            "Integração ERP × CRM": 3,
            "Adequação à LGPD — Onda 3": 4, "Continuidade de Negócios e DR": 4,
        }
        gerentes = ["bruno.carvalho@empresa.com.br", "fernanda.lima@empresa.com.br",
                    "diego.nascimento@empresa.com.br", "patricia.rocha@empresa.com.br"]
        projetos = []
        for indice, (nome, categoria, area, orcamento, inicio_off, fim_off, status, prioridade,
                     icone, cor, objetivo) in enumerate(PROJETOS):
            programa = programas[mapa_programa.get(nome, 0)]
            projeto, _ = Project.objects.update_or_create(
                nome=nome,
                defaults={
                    "descricao": objetivo,
                    "objetivo": objetivo,
                    "categoria": categoria,
                    "area": area,
                    "portfolio": programa.portfolio,
                    "program": programa,
                    "sponsor": usuarios[RNG.choice(
                        ["helena.marques@empresa.com.br", "otavio.lemos@empresa.com.br",
                         "claudia.rezende@empresa.com.br"]
                    )],
                    "manager": usuarios[gerentes[indice % len(gerentes)]],
                    "data_inicio": HOJE + timedelta(days=inicio_off),
                    "data_fim": HOJE + timedelta(days=fim_off),
                    "orcamento": Decimal(str(orcamento)),
                    "orcamento_capex": Decimal(str(int(orcamento * 0.6))),
                    "orcamento_opex": Decimal(str(int(orcamento * 0.4))),
                    "receita_prevista": Decimal(str(int(orcamento * RNG.uniform(1.1, 1.9)))),
                    "status": status,
                    "prioridade": prioridade,
                    "criticidade": RNG.choice(["MEDIA", "ALTA", "ESTRATEGICA"]),
                    "icone": icone,
                    "cor": cor,
                    "tags": RNG.sample(["estratégico", "regulatório", "quick-win", "multiárea",
                                        "inovação", "legado", "cliente"], k=2),
                    "criado_por": usuarios["ricardo.tavares@empresa.com.br"],
                    "esforco_estimado_horas": Decimal(str(RNG.randint(800, 6000))),
                },
            )
            projetos.append(projeto)

        # Marcos por projeto
        for projeto in projetos:
            if not projeto.data_inicio or not projeto.data_fim:
                continue
            duracao = (projeto.data_fim - projeto.data_inicio).days
            marcos = [
                ("Aprovação do business case", 0.05, True),
                ("Conclusão do design", 0.25, True),
                ("Ambiente pronto para testes", 0.45, False),
                ("Homologação aprovada", 0.70, True),
                ("Go-live", 0.88, True),
                ("Encerramento e lições aprendidas", 1.0, False),
            ]
            for titulo, fracao, critico in marcos:
                data_prevista = projeto.data_inicio + timedelta(days=int(duracao * fracao))
                if projeto.status == StatusProjeto.CONCLUIDO:
                    status_marco = StatusMarco.CONCLUIDO
                    data_real = data_prevista + timedelta(days=RNG.randint(-5, 12))
                elif data_prevista < HOJE:
                    status_marco = StatusMarco.CONCLUIDO if fracao < 0.6 else StatusMarco.ATRASADO
                    data_real = data_prevista + timedelta(days=RNG.randint(-3, 10)) if status_marco == StatusMarco.CONCLUIDO else None
                else:
                    status_marco = StatusMarco.PENDENTE
                    data_real = None
                Milestone.objects.update_or_create(
                    project=projeto, nome=titulo,
                    defaults={
                        "data_prevista": data_prevista, "data_real": data_real,
                        "status": status_marco, "critico": critico,
                        "responsavel": projeto.manager,
                        "cor": "#F59E0B" if critico else "#94A3B8",
                    },
                )

        # KPIs por projeto
        for projeto in projetos:
            for nome, unidade, meta, atual, maior_melhor in [
                ("Satisfação do cliente (CSAT)", "pts", 4.5, round(RNG.uniform(3.4, 4.8), 1), True),
                ("Defeitos por entrega", "defeitos", 3, RNG.randint(1, 9), False),
                ("Aderência ao cronograma", "%", 95, RNG.randint(62, 99), True),
                ("Cobertura de testes", "%", 80, RNG.randint(45, 92), True),
                ("Consumo orçamentário", "%", 100, RNG.randint(55, 118), False),
            ]:
                KPI.objects.update_or_create(
                    project=projeto, nome=nome,
                    defaults={
                        "unidade": unidade, "valor_meta": Decimal(str(meta)),
                        "valor_atual": Decimal(str(atual)),
                        "valor_inicial": Decimal(str(meta * 0.6)),
                        "maior_melhor": maior_melhor,
                        "data_referencia": HOJE,
                        "cor": projeto.cor,
                        "historico": [
                            {"data": (HOJE - timedelta(days=30 * i)).isoformat(),
                             "valor": round(float(atual) * (1 - 0.05 * i), 2)}
                            for i in range(4, 0, -1)
                        ],
                    },
                )

        # Lições aprendidas nos projetos concluídos
        for projeto in [p for p in projetos if p.status == StatusProjeto.CONCLUIDO]:
            projeto.licoes_aprendidas = (
                "O engajamento antecipado das áreas de negócio foi decisivo. "
                "A janela de testes deveria ter sido 30% maior."
            )
            projeto.percentual_conclusao = 100
            projeto.data_inicio_real = projeto.data_inicio
            projeto.data_fim_real = projeto.data_fim + timedelta(days=RNG.randint(-8, 20))
            projeto.save()
            for titulo, categoria, impacto in [
                ("Envolvimento precoce do negócio acelerou a homologação", "Processo", "ALTA"),
                ("Janela de testes subdimensionada gerou retrabalho", "Prazo", "ALTA"),
                ("Automação de deploy reduziu falhas em produção", "Técnico", "MEDIA"),
            ]:
                LicaoAprendida.objects.update_or_create(
                    project=projeto, titulo=titulo,
                    defaults={
                        "contexto": "Registrado na cerimônia de encerramento do projeto.",
                        "o_que_funcionou": "Rituais curtos e decisões descentralizadas.",
                        "o_que_melhorar": "Planejamento de capacidade no pico de testes.",
                        "recomendacao": "Reservar 30% mais tempo para testes integrados.",
                        "categoria": categoria, "impacto": impacto,
                        "autor": projeto.manager,
                    },
                )

        # Baseline do projeto mais antigo
        for projeto in projetos[:4]:
            if projeto.baselines.exists():
                continue
            Baseline.objects.create(
                project=projeto,
                nome="Linha de base aprovada",
                descricao="Baseline do plano aprovado pelo comitê executivo.",
                data_inicio=projeto.data_inicio, data_fim=projeto.data_fim,
                orcamento=projeto.orcamento, ativa=True,
                criado_por=usuarios["ricardo.tavares@empresa.com.br"],
                snapshot_json={"tarefas": [], "orcamento": float(projeto.orcamento)},
            )
        return portfolios, programas, projetos

    # ------------------------------------------------------------------ tarefas
    def _tarefas(self, projetos):
        self.stdout.write("  · EAP, cronograma, dependências e checklists")
        responsaveis = list(
            User.objects.filter(perfil__in=[Perfil.MEMBRO, Perfil.LIDER], ativo=True)
        )
        for projeto in projetos:
            if projeto.tarefas.exists():
                continue
            inicio = projeto.data_inicio or HOJE
            fim = projeto.data_fim or (inicio + timedelta(days=120))
            total_dias = max(30, (fim - inicio).days)
            anteriores = []
            criadas = []
            for ordem, (nome, horas, _x, deps) in enumerate(TAREFAS_PADRAO):
                deslocamento = int(total_dias * (ordem / len(TAREFAS_PADRAO)))
                duracao = max(3, int(horas / 8))
                data_inicio = inicio + timedelta(days=deslocamento)
                data_fim = min(fim, data_inicio + timedelta(days=duracao))
                if projeto.status == StatusProjeto.CONCLUIDO:
                    percentual, status = 100, StatusTarefa.CONCLUIDA
                elif projeto.status in {StatusProjeto.PLANEJADO, StatusProjeto.IDEIA}:
                    percentual, status = 0, StatusTarefa.A_FAZER
                else:
                    planejado = max(0.0, min(1.0, (HOJE - data_inicio).days / max(1, (data_fim - data_inicio).days)))
                    if planejado >= 1:
                        percentual, status = 100, StatusTarefa.CONCLUIDA
                    elif planejado <= 0:
                        percentual, status = 0, StatusTarefa.A_FAZER
                    else:
                        percentual = int(planejado * 100 * RNG.uniform(0.6, 1.05))
                        percentual = max(5, min(95, percentual))
                        status = StatusTarefa.EM_ANDAMENTO if percentual > 15 else StatusTarefa.A_FAZER

                tarefa = Task.objects.create(
                    project=projeto, nome=nome, wbs=f"{ordem + 1}.0",
                    descricao=f"{nome} — frente de trabalho do projeto {projeto.nome}.",
                    responsavel=RNG.choice(responsaveis),
                    data_inicio=data_inicio, data_fim=data_fim,
                    data_inicio_real=data_inicio if percentual > 0 else None,
                    data_fim_real=data_fim if percentual >= 100 else None,
                    esforco_estimado=Decimal(str(horas)),
                    esforco_real=Decimal(str(round(horas * percentual / 100 * RNG.uniform(0.8, 1.3), 2))) if percentual else Decimal("0"),
                    percentual_conclusao=percentual, status=status,
                    prioridade=RNG.choice(["MEDIA", "ALTA", "ALTA", "CRITICA", "BAIXA"]),
                    posicao_visual=float((ordem + 1) * 1000),
                    ordem=ordem, nivel=0,
                    cor=projeto.cor if ordem % 3 == 0 else "",
                    tags=RNG.sample(["crítico", "cliente", "técnico", "regulatório"], k=1),
                )
                criadas.append(tarefa)
                for dep in deps:
                    if dep < len(criadas):
                        TaskDependency.objects.get_or_create(
                            predecessor=criadas[dep], successor=tarefa, tipo=TipoDependencia.FS,
                            defaults={"lag": RNG.choice([0, 0, 0, 2])},
                        )
                for texto in RNG.sample(
                    ["Revisar com o arquiteto", "Validar com o negócio", "Atualizar documentação",
                     "Executar testes de regressão", "Coletar evidências para auditoria"], k=RNG.randint(2, 4)
                ):
                    ChecklistItem.objects.create(
                        task=tarefa, texto=texto, concluido=percentual >= 80 or RNG.random() < 0.4,
                        ordem=len(tarefa.checklist.all()), responsavel=tarefa.responsavel,
                    )
                anteriores.append(tarefa)

            # Subtarefas em duas tarefas de implementação
            for pai in criadas[3:5]:
                for indice, nome_sub in enumerate(
                    ["Detalhar casos de uso", "Implementar camada de serviço", "Revisar código (code review)"]
                ):
                    Task.objects.create(
                        project=projeto, parent=pai, nome=nome_sub, wbs=f"{pai.wbs}.{indice + 1}",
                        responsavel=RNG.choice(responsaveis), nivel=1,
                        data_inicio=pai.data_inicio, data_fim=pai.data_fim,
                        esforco_estimado=Decimal(str(round(float(pai.esforco_estimado) / 4, 2))),
                        percentual_conclusao=max(0, min(100, pai.percentual_conclusao + RNG.randint(-10, 10))),
                        status=StatusTarefa.EM_ANDAMENTO if pai.percentual_conclusao < 100 else StatusTarefa.CONCLUIDA,
                        posicao_visual=float(indice + 1), ordem=indice,
                    )

    # --------------------------------------------------------------- financeiro
    def _financeiro(self, projetos, usuarios):
        self.stdout.write("  · orçamento, lançamentos e EVM")
        categorias = [
            ("Pessoal interno", TipoCusto.OPEX, 0.42, "#3B82F6", "users"),
            ("Serviços de terceiros", TipoCusto.OPEX, 0.18, "#8B5CF6", "handshake"),
            ("Licenças e assinaturas", TipoCusto.OPEX, 0.12, "#F59E0B", "key"),
            ("Infraestrutura e cloud", TipoCusto.OPEX, 0.14, "#06B6D4", "cloud"),
            ("Hardware e ativos", TipoCusto.CAPEX, 0.10, "#10B981", "server"),
            ("Treinamento e capacitação", TipoCusto.OPEX, 0.04, "#EC4899", "graduation-cap"),
        ]
        fornecedores = ["Amazon Web Services", "Microsoft Brasil", "Accenture", "Dell Brasil",
                        "Stefanini", "Alura", "PMI", "Localiza", "TOTVS", "Oracle Brasil"]
        for projeto in projetos:
            if projeto.orcamentos.exists():
                continue
            for nome, tipo, fracao, cor, icone in categorias:
                valor = Decimal(str(round(float(projeto.orcamento) * fracao, 2)))
                orcamento = Orcamento.objects.create(
                    project=projeto, categoria=nome, tipo=tipo, valor_planejado=valor,
                    cor=cor, icone=icone, centro_custo=f"CC-{projeto.id:03d}",
                )
                if projeto.status in {StatusProjeto.PLANEJADO, StatusProjeto.IDEIA}:
                    continue
                meses = max(1, ((projeto.data_fim or HOJE) - (projeto.data_inicio or HOJE)).days // 30)
                proporcao = 1.0 if projeto.status == StatusProjeto.CONCLUIDO else RNG.uniform(0.35, 1.12)
                lancamentos = max(2, int(meses * RNG.uniform(0.6, 1.4)))
                acumulado = Decimal("0")
                for i in range(lancamentos):
                    if acumulado >= valor * Decimal(str(min(1.15, proporcao))):
                        break
                    parcela = valor / lancamentos * Decimal(str(RNG.uniform(0.75, 1.3)))
                    acumulado += parcela
                    data_competencia = (projeto.data_inicio or HOJE) + timedelta(days=30 * i + RNG.randint(0, 20))
                    if data_competencia > HOJE:
                        status_lanc = StatusLancamento.PREVISTO
                    elif RNG.random() < 0.85:
                        status_lanc = StatusLancamento.REALIZADO
                    else:
                        status_lanc = StatusLancamento.COMPROMETIDO
                    Lancamento.objects.create(
                        project=projeto, orcamento=orcamento, tipo=TipoLancamento.DESPESA,
                        categoria=nome, descricao=f"{nome} — parcela {i + 1}",
                        valor=parcela.quantize(Decimal("0.01")),
                        data_competencia=data_competencia,
                        data_pagamento=data_competencia + timedelta(days=RNG.randint(1, 25))
                        if status_lanc == StatusLancamento.REALIZADO else None,
                        status=status_lanc,
                        fornecedor=RNG.choice(fornecedores),
                        documento=f"NF-{RNG.randint(10000, 99999)}",
                        centro_custo=f"CC-{projeto.id:03d}",
                        criado_por=usuarios["otavio.lemos@empresa.com.br"],
                    )
                realizado = Lancamento.objects.filter(
                    orcamento=orcamento, tipo=TipoLancamento.DESPESA
                ).exclude(status=StatusLancamento.CANCELADO).aggregate(
                    t=__import__("django.db.models", fromlist=["Sum"]).Sum("valor")
                )["t"] or Decimal("0")
                orcamento.valor_realizado = realizado
                orcamento.save(update_fields=["valor_realizado"])

            # Receitas de projetos de produto
            if projeto.receita_prevista:
                for i in range(3):
                    data_competencia = (projeto.data_inicio or HOJE) + timedelta(days=90 * (i + 1))
                    Lancamento.objects.create(
                        project=projeto, tipo=TipoLancamento.RECEITA,
                        categoria="Receita do projeto",
                        descricao=f"Realização de benefícios — trimestre {i + 1}",
                        valor=(projeto.receita_prevista / 4).quantize(Decimal("0.01")),
                        data_competencia=data_competencia,
                        status=StatusLancamento.PREVISTO if data_competencia > HOJE else StatusLancamento.REALIZADO,
                        fornecedor="Cliente corporativo",
                        criado_por=usuarios["otavio.lemos@empresa.com.br"],
                    )

            from apps.finance.services import custo_real_do_projeto

            Project.objects.filter(pk=projeto.pk).update(custo_real=custo_real_do_projeto(projeto))

    # ------------------------------------------------------------ riscos/issues
    def _riscos_issues(self, projetos, usuarios):
        self.stdout.write("  · riscos, plano de resposta e Kanban de issues")
        equipe = list(User.objects.filter(ativo=True, perfil__in=[Perfil.GERENTE, Perfil.LIDER, Perfil.MEMBRO]))
        for projeto in projetos:
            if projeto.riscos.exists():
                continue
            for descricao, categoria, prob, imp, estrategia in RNG.sample(RISCOS_PADRAO, k=RNG.randint(5, 9)):
                prob_final = max(1, min(5, prob + RNG.choice([-1, 0, 0, 1])))
                imp_final = max(1, min(5, imp + RNG.choice([-1, 0, 0, 1])))
                risco = Risk.objects.create(
                    project=projeto, descricao=descricao, categoria=categoria,
                    causa="Identificado em workshop de análise de riscos com as áreas envolvidas.",
                    efeito="Pode comprometer prazo, custo ou qualidade das entregas previstas.",
                    probabilidade=prob_final, impacto=imp_final,
                    prob_residual=max(1, prob_final - RNG.randint(0, 2)),
                    imp_residual=max(1, imp_final - RNG.randint(0, 1)),
                    estrategia=estrategia,
                    plano_resposta=(
                        "Monitorar semanalmente no comitê; acionar plano de contingência ao atingir o gatilho definido."
                    ),
                    contingencia="Reserva de contingência de 8% do orçamento da fase.",
                    responsavel=RNG.choice(equipe),
                    status=RNG.choice(["IDENTIFICADO", "EM_ANALISE", "PLANEJADO", "MITIGANDO", "MONITORANDO"]),
                    data_identificacao=(projeto.data_inicio or HOJE) + timedelta(days=RNG.randint(5, 60)),
                    data_limite=HOJE + timedelta(days=RNG.randint(-20, 120)),
                    custo_mitigacao=Decimal(str(RNG.randint(5, 120) * 1000)),
                    criado_por=projeto.manager,
                    gatilhos=["Atraso superior a 5 dias úteis na entrega predecessora",
                              "Consumo orçamentário acima de 85%"],
                )
                risco.valor_monetario_esperado = Decimal(
                    str(round(float(risco.custo_mitigacao) * risco.probabilidade / 5, 2))
                )
                risco.save(update_fields=["valor_monetario_esperado"])
                for i in range(3):
                    RiskHistory.objects.create(
                        risk=risco,
                        probabilidade=max(1, prob_final - (2 - i)),
                        impacto=max(1, imp_final - (2 - i) // 2),
                        severidade=max(1, prob_final - (2 - i)) * max(1, imp_final - (2 - i) // 2),
                        status=risco.status,
                        comentario=f"Reavaliação periódica #{i + 1}",
                        registrado_por=risco.responsavel,
                    )

            for titulo, tipo, prioridade, status_issue in RNG.sample(ISSUES_PADRAO, k=RNG.randint(3, 6)):
                data_abertura = HOJE - timedelta(days=RNG.randint(3, 90))
                Issue.objects.create(
                    project=projeto, titulo=titulo, tipo=tipo, prioridade=prioridade,
                    status=status_issue,
                    descricao=f"{titulo}. Registrado pela equipe de execução do projeto.",
                    impacto="Impacta a entrega da fase corrente e o nível de serviço acordado.",
                    solucao="Correção aplicada e validada em homologação." if status_issue == StatusIssue.RESOLVIDA else "",
                    responsavel=RNG.choice(equipe), reportado_por=RNG.choice(equipe),
                    data_abertura=data_abertura,
                    data_limite=data_abertura + timedelta(days=RNG.randint(5, 45)),
                    data_resolucao=data_abertura + timedelta(days=RNG.randint(2, 30))
                    if status_issue == StatusIssue.RESOLVIDA else None,
                    esforco_estimado=Decimal(str(RNG.randint(2, 40))),
                    custo_estimado=Decimal(str(RNG.randint(1, 40) * 1000)),
                    posicao_visual=float(RNG.randint(1, 999) * 100),
                    cor="#EF4444" if prioridade == "CRITICA" else "#F59E0B",
                    tags=RNG.sample(["bloqueio", "cliente", "técnico", "processo"], k=1),
                )

    # ---------------------------------------------------------------- recursos
    def _recursos(self):
        self.stdout.write("  · recursos materiais e serviços")
        recursos = []
        for nome, tipo, custo, quantidade, fornecedor in RECURSOS_MATERIAIS:
            recurso, _ = Recurso.objects.update_or_create(
                nome=nome,
                defaults={
                    "tipo": tipo, "custo_hora": Decimal(str(custo)),
                    "custo_unitario": Decimal(str(custo)),
                    "quantidade_disponivel": Decimal(str(quantidade)),
                    "fornecedor": fornecedor, "ativo": True,
                    "descricao": f"{nome} disponibilizado por {fornecedor}.",
                    "localizacao": "São Paulo/SP",
                },
            )
            recursos.append(recurso)
        return recursos

    # ------------------------------------------------------- alocações e horas
    def _alocacoes_timesheet(self, projetos, usuarios, recursos):
        self.stdout.write("  · alocações e apontamentos de horas")
        pessoas = list(User.objects.filter(ativo=True, perfil__in=[Perfil.MEMBRO, Perfil.LIDER, Perfil.GERENTE]))
        for projeto in projetos:
            if projeto.alocacoes.exists():
                continue
            if projeto.status in {StatusProjeto.PLANEJADO, StatusProjeto.IDEIA}:
                continue
            equipe = RNG.sample(pessoas, k=RNG.randint(5, 9))
            for pessoa in equipe:
                percentual = RNG.choice([20, 30, 40, 50, 60, 80, 100, 100])
                inicio = max(projeto.data_inicio or HOJE - timedelta(days=60), HOJE - timedelta(days=120))
                fim = projeto.data_fim or (HOJE + timedelta(days=60))
                Alocacao.objects.create(
                    project=projeto, user=pessoa, percentual=percentual,
                    data_inicio=inicio, data_fim=fim,
                    status=RNG.choice([StatusAlocacao.CONFIRMADA, StatusAlocacao.CONFIRMADA, StatusAlocacao.EM_EXECUCAO]),
                    modalidade=RNG.choice([ModalidadeAlocacao.MANUAL, ModalidadeAlocacao.PERFORMANCE,
                                           ModalidadeAlocacao.DESENVOLVIMENTO, ModalidadeAlocacao.MISTA]),
                    papel=RNG.choice(["Desenvolvimento", "Análise", "Arquitetura", "Qualidade",
                                      "Gestão", "Infraestrutura"]),
                    horas_planejadas=Decimal(str(round(percentual / 100 * 8 * 20, 2))),
                    criado_por=projeto.manager,
                )
            # Alocações material
            for recurso in RNG.sample(recursos, k=RNG.randint(1, 3)):
                Alocacao.objects.create(
                    project=projeto, recurso=recurso, percentual=RNG.choice([25, 50, 100]),
                    data_inicio=max(projeto.data_inicio or HOJE - timedelta(days=60), HOJE - timedelta(days=90)),
                    data_fim=projeto.data_fim or (HOJE + timedelta(days=60)),
                    status=StatusAlocacao.CONFIRMADA, modalidade=ModalidadeAlocacao.MANUAL,
                    papel="Recurso material", criado_por=projeto.manager,
                )

            # Timesheet das últimas 6 semanas
            tarefas = list(projeto.tarefas.all())
            if not tarefas:
                continue
            for pessoa in equipe:
                for dias_atras in range(0, 42):
                    dia = HOJE - timedelta(days=dias_atras)
                    if dia.weekday() >= 5 or RNG.random() < 0.35:
                        continue
                    tarefa = RNG.choice(tarefas)
                    Timesheet.objects.create(
                        user=pessoa, task=tarefa, project=projeto, data=dia,
                        horas=Decimal(str(RNG.choice([2, 4, 4, 6, 8]))),
                        descricao=f"Atuação em {tarefa.nome}",
                        atividade=RNG.choice(["Desenvolvimento", "Análise", "Reunião", "Testes", "Documentação"]),
                        aprovado=RNG.random() < 0.7,
                        aprovador=projeto.manager if RNG.random() < 0.7 else None,
                        aprovado_em=timezone.now() - timedelta(days=dias_atras) if RNG.random() < 0.5 else None,
                    )

    # -------------------------------------------------------------- capacidades
    def _capacidades(self, usuarios, skills):
        self.stdout.write("  · perfis de capacidade, avaliações, evidências e XP")
        pessoas = [u for u in usuarios.values() if u.perfil != Perfil.STAKEHOLDER]
        for pessoa in pessoas:
            quantidade = RNG.randint(6, 14)
            for skill in RNG.sample(skills, k=quantidade):
                if skill.tipo == "CERTIFICACAO":
                    nivel = RNG.choices([0, 1, 2, 3], weights=[55, 20, 15, 10])[0]
                    if nivel == 0:
                        continue
                elif skill.tipo == "IDIOMA":
                    nivel = RNG.choices([1, 2, 3, 4, 5], weights=[10, 25, 35, 22, 8])[0]
                else:
                    base = {"LIDER": 1, "GERENTE": 0, "PMO": 0, "MEMBRO": 0, "RH": -1, "EXECUTIVO": -1}[pessoa.perfil]
                    nivel = max(1, min(5, RNG.choices([1, 2, 3, 4, 5], weights=[8, 22, 35, 25, 10])[0] + base))
                perfil, _ = EmployeeSkill.objects.get_or_create(
                    user=pessoa, skill=skill,
                    defaults={
                        "nivel_atual": nivel,
                        "nivel_validado": nivel if RNG.random() < 0.55 else max(0, nivel - 1),
                        "nivel_desejado": min(5, nivel + RNG.choice([0, 1, 1, 2])),
                        "xp_acumulado": nivel * 100 + RNG.randint(0, 180),
                        "anos_experiencia": round(RNG.uniform(0.5, 14), 1),
                        "ultima_utilizacao": HOJE - timedelta(days=RNG.randint(1, 800)),
                        "data_atingiu_nivel": HOJE - timedelta(days=RNG.randint(30, 900)),
                        "visibilidade": RNG.choices(
                            ["PUBLICO", "RESTRITO", "PRIVADO"], weights=[80, 15, 5]
                        )[0],
                        "destaque": RNG.random() < 0.25 and nivel >= 4,
                        "horas_pretendidas": RNG.choice([0, 8, 16, 40]),
                    },
                )
                perfil.nivel_consolidado = round(
                    (perfil.nivel_atual + (perfil.nivel_validado or perfil.nivel_atual)) / 2
                    + RNG.uniform(-0.3, 0.3), 2
                )
                perfil.save(update_fields=["nivel_consolidado"])

                for tipo in RNG.sample(
                    ["AUTOAVALIACAO", "GESTOR", "PAR", "MENTOR"], k=RNG.randint(1, 3)
                ):
                    SkillAssessment.objects.create(
                        employee_skill=perfil,
                        avaliador=pessoa if tipo == "AUTOAVALIACAO" else RNG.choice(pessoas),
                        tipo=tipo,
                        nivel_atribuido=max(1, min(5, nivel + RNG.choice([-1, 0, 0, 1]))),
                        comentario=RNG.choice([
                            "Demonstra domínio consistente nas entregas recentes.",
                            "Precisa de mais exposição a cenários complexos.",
                            "Evolução clara desde a última avaliação.",
                            "Referência para o time nesta capacidade.",
                        ]),
                        data=HOJE - timedelta(days=RNG.randint(10, 400)),
                    )

                if RNG.random() < 0.35:
                    SkillEvidence.objects.create(
                        employee_skill=perfil,
                        tipo=RNG.choice(["PROJETO", "CERTIFICACAO", "TREINAMENTO", "PUBLICACAO", "MENTORIA"]),
                        descricao=RNG.choice([
                            f"Atuação como referência em {skill.nome} no projeto Migração para Nuvem AWS",
                            f"Certificação obtida em {skill.nome}",
                            f"Palestra interna sobre {skill.nome}",
                            f"Mentoria de 2 pessoas em {skill.nome}",
                        ]),
                        url="https://exemplo.empresa.com.br/evidencia",
                        data=HOJE - timedelta(days=RNG.randint(10, 500)),
                        emitido_por=RNG.choice(["AWS", "PMI", "Scrum.org", "Empresa"]),
                        valida=RNG.random() < 0.6,
                        validador=RNG.choice(pessoas) if RNG.random() < 0.6 else None,
                    )
                if RNG.random() < 0.3:
                    SkillEndorsement.objects.get_or_create(
                        employee_skill=perfil, endorser=RNG.choice(pessoas),
                        defaults={
                            "comentario": f"Trabalhei diretamente com esta pessoa em {skill.nome}.",
                            "nivel_sugerido": min(5, nivel + 1),
                        },
                    )
                for i in range(RNG.randint(1, 3)):
                    SkillHistory.objects.create(
                        employee_skill=perfil,
                        nivel_anterior=max(1, perfil.nivel_atual - 1 - i),
                        nivel_novo=max(1, perfil.nivel_atual - i),
                        xp_movimento=RNG.randint(20, 120),
                        motivo=RNG.choice([
                            "Conclusão de tarefa relevante no projeto",
                            "Avaliação positiva do gestor",
                            "Conclusão de treinamento com certificação",
                            "Mentoria concluída com evidência validada",
                        ]),
                        origem=RNG.choice(["TAREFA", "AVALIACAO", "TREINAMENTO", "MENTORIA"]),
                        data=timezone.now() - timedelta(days=RNG.randint(20, 700)),
                    )

        # Bônus: alguns perfis prontos para promoção
        for perfil in EmployeeSkill.objects.filter(nivel_atual__lt=5).order_by("?")[:25]:
            perfil.xp_acumulado = (perfil.nivel_atual + 1) * 100 + RNG.randint(10, 60)
            perfil.data_atingiu_nivel = HOJE - timedelta(days=RNG.randint(200, 700))
            perfil.save(update_fields=["xp_acumulado", "data_atingiu_nivel"])
            for i in range(2):
                SkillEvidence.objects.create(
                    employee_skill=perfil, tipo="PROJETO",
                    descricao=f"Entrega relevante #{i + 1} comprovando {perfil.skill.nome}",
                    data=HOJE - timedelta(days=RNG.randint(20, 300)),
                    valida=True, validador=perfil.user.gestor,
                )
            SkillAssessment.objects.create(
                employee_skill=perfil, avaliador=perfil.user.gestor,
                tipo="GESTOR", nivel_atribuido=min(5, perfil.nivel_atual + 1),
                comentario="Pronto para o próximo nível.", data=HOJE - timedelta(days=15),
            )

    # -------------------------------------------- requisitos de skill por projeto
    def _requisitos_projeto(self, projetos, skills):
        self.stdout.write("  · requisitos de capacidade por projeto")
        for projeto in projetos:
            if projeto.requisitos_skill.exists():
                continue
            for skill in RNG.sample(skills, k=RNG.randint(4, 7)):
                ProjectSkillRequirement.objects.create(
                    project=projeto, skill=skill,
                    nivel_minimo=RNG.choice([3, 3, 4, 4, 5]),
                    nivel_desejado=RNG.choice([4, 4, 5]),
                    quantidade=RNG.choice([1, 1, 2, 2, 3]),
                    peso=round(RNG.uniform(0.5, 2.0), 2),
                    obrigatorio=RNG.random() < 0.35,
                )

    # -------------------------------------------------------------- PDI e LMS
    def _pdi_treinamentos(self, usuarios, skills):
        self.stdout.write("  · PDI, treinamentos e mentorias")
        treinamentos = []
        for nome, skill_nome, carga, fornecedor, custo, nivel_alvo, xp, certificacao in TREINAMENTOS:
            skill = Skill.objects.filter(nome=skill_nome).first()
            treinamento, _ = Training.objects.update_or_create(
                nome=nome,
                defaults={
                    "skill": skill, "carga_horaria": carga, "fornecedor": fornecedor,
                    "custo": Decimal(str(custo)), "nivel_alvo": nivel_alvo,
                    "xp_concedido": xp, "certificacao": certificacao, "ativo": True,
                    "tipo": RNG.choice(["ONLINE", "PRESENCIAL", "HIBRIDO"]),
                    "url": "https://treinamentos.exemplo.com.br",
                    "descricao": f"Trilha de capacitação em {skill_nome}.",
                },
            )
            treinamentos.append(treinamento)

        pessoas = [u for u in usuarios.values() if u.perfil in
                   {Perfil.MEMBRO, Perfil.LIDER, Perfil.GERENTE, Perfil.RH}]
        for pessoa in pessoas:
            if RNG.random() < 0.75:
                for treinamento in RNG.sample(treinamentos, k=RNG.randint(1, 3)):
                    status_t = RNG.choices(
                        ["INSCRITO", "EM_ANDAMENTO", "CONCLUIDO", "CONCLUIDO"], weights=[25, 30, 35, 10]
                    )[0]
                    EmployeeTraining.objects.get_or_create(
                        user=pessoa, training=treinamento,
                        defaults={
                            "status": status_t,
                            "data_inscricao": HOJE - timedelta(days=RNG.randint(30, 300)),
                            "data_conclusao": HOJE - timedelta(days=RNG.randint(5, 200))
                            if status_t == "CONCLUIDO" else None,
                            "nota": round(RNG.uniform(6.5, 10), 1) if status_t == "CONCLUIDO" else None,
                            "certificado_url": "https://certificados.exemplo.com.br/abc123"
                            if status_t == "CONCLUIDO" and treinamento.certificacao else "",
                            "origem": RNG.choice(["MANUAL", "LMS", "PDI"]),
                        },
                    )

            if RNG.random() < 0.5:
                gaps = list(pessoa.perfis_skill.filter(nivel_desejado__gt=0).order_by("?")[:4])
                if gaps:
                    plano = DevelopmentPlan.objects.create(
                        user=pessoa,
                        titulo=f"PDI {HOJE.year} — {pessoa.nome_curto}",
                        objetivo=RNG.choice([
                            "Evoluir para nível sênior na trilha técnica.",
                            "Desenvolver competências de liderança técnica.",
                            "Consolidar especialização em arquitetura de soluções.",
                            "Ampliar atuação em dados e analytics.",
                        ]),
                        status=RNG.choice([StatusPDI.ATIVO, StatusPDI.ATIVO, StatusPDI.CONCLUIDO]),
                        data_inicio=HOJE - timedelta(days=RNG.randint(30, 240)),
                        data_fim=HOJE + timedelta(days=RNG.randint(30, 240)),
                        responsavel_acompanhamento=pessoa.gestor,
                    )
                    for perfil in gaps:
                        for tipo_acao, descricao in [
                            ("CURSO", f"Concluir treinamento de {perfil.skill.nome}"),
                            ("MENTORIA", f"Mentoria mensal em {perfil.skill.nome}"),
                            ("PROJETO", f"Atuar em entrega que exija {perfil.skill.nome}"),
                        ]:
                            status_acao = RNG.choices(
                                ["PLANEJADA", "EM_ANDAMENTO", "CONCLUIDA", "ATRASADA"],
                                weights=[30, 35, 25, 10],
                            )[0]
                            DevelopmentAction.objects.create(
                                plan=plano, tipo=tipo_acao, descricao=descricao,
                                skill=perfil.skill, nivel_alvo=perfil.nivel_desejado,
                                status=status_acao,
                                prazo=HOJE + timedelta(days=RNG.randint(-60, 180)),
                                data_conclusao=HOJE - timedelta(days=RNG.randint(5, 60))
                                if status_acao == "CONCLUIDA" else None,
                                carga_horaria=RNG.choice([8, 16, 24, 40]),
                                custo=Decimal(str(RNG.choice([0, 400, 900, 1800]))),
                                responsavel=pessoa,
                                progresso=100 if status_acao == "CONCLUIDA" else RNG.choice([0, 25, 50, 75]),
                            )
                    plano.recalcular_progresso()

        # Mentorias formais
        especialistas = list(
            EmployeeSkill.objects.filter(nivel_atual__gte=4).select_related("user", "skill")
        )
        for _ in range(28):
            perfil_mentor = RNG.choice(especialistas)
            candidatos = [p for p in pessoas if p.pk != perfil_mentor.user_id]
            if not candidatos:
                continue
            mentee = RNG.choice(candidatos)
            Mentorship.objects.get_or_create(
                mentor=perfil_mentor.user, mentee=mentee, skill=perfil_mentor.skill,
                defaults={
                    "objetivo": f"Elevar o nível em {perfil_mentor.skill.nome} com acompanhamento prático.",
                    "status": RNG.choice(["ATIVA", "ATIVA", "CONCLUIDA", "PROPOSTA"]),
                    "data_inicio": HOJE - timedelta(days=RNG.randint(20, 300)),
                    "horas_realizadas": Decimal(str(RNG.choice([4, 8, 12, 16, 24]))),
                    "frequencia": RNG.choice(["semanal", "quinzenal", "mensal"]),
                    "avaliacao": RNG.choice([0, 4, 5, 5]),
                    "comentario": "Evolução consistente e boa aplicação prática.",
                },
            )

        # Oportunidades e candidaturas
        for titulo, tipo, skill_nomes, nivel, carga, vagas in OPORTUNIDADES:
            oportunidade, _ = InternalOpportunity.objects.update_or_create(
                titulo=titulo,
                defaults={
                    "tipo": tipo, "nivel_minimo": nivel, "carga_horaria": carga, "vagas": vagas,
                    "descricao": f"Oportunidade interna de {titulo.lower()}.",
                    "responsavel": usuarios["larissa.fontes@empresa.com.br"],
                    "data_abertura": HOJE - timedelta(days=RNG.randint(5, 60)),
                    "data_limite": HOJE + timedelta(days=RNG.randint(5, 60)),
                    "ativa": True,
                },
            )
            oportunidade.skills_requeridas.set(Skill.objects.filter(nome__in=skill_nomes))
            for pessoa in RNG.sample(pessoas, k=RNG.randint(2, 6)):
                OpportunityApplication.objects.get_or_create(
                    opportunity=oportunidade, user=pessoa,
                    defaults={
                        "motivacao": "Quero ampliar minha atuação e contribuir com o time.",
                        "status": RNG.choice(["CANDIDATADO", "EM_ANALISE", "APROVADO", "RECUSADO"]),
                        "aderencia": round(RNG.uniform(35, 98), 1),
                    },
                )

    # ------------------------------------------------------------- sucessão
    def _oportunidades_sucessao(self, usuarios, projetos):
        self._requisitos_projeto(projetos, list(Skill.objects.all()))
        self.stdout.write("  · posições-chave e mapa de sucessão")
        for titulo, area, risco, skill_nomes in POSICOES_CHAVE:
            candidatos = [u for u in usuarios.values() if u.area == area and u.perfil != Perfil.STAKEHOLDER]
            ocupante = candidatos[0] if candidatos else usuarios["helena.marques@empresa.com.br"]
            posicao, _ = PosicaoChave.objects.update_or_create(
                titulo=titulo,
                defaults={
                    "area": area, "ocupante": ocupante, "gestor": ocupante.gestor,
                    "criticidade": "ESTRATEGICA" if risco == "CRITICO" else "ALTA",
                    "risco_sucessao": risco,
                    "observacao": "Posição de difícil reposição no mercado; requer plano ativo de sucessão.",
                },
            )
            posicao.skills_criticas.set(Skill.objects.filter(nome__in=skill_nomes))
            sucessores = [u for u in usuarios.values() if u.pk != ocupante.pk
                          and u.perfil in {Perfil.LIDER, Perfil.MEMBRO, Perfil.GERENTE}]
            for prioridade, sucessor in enumerate(RNG.sample(sucessores, k=min(3, len(sucessores))), start=1):
                SuccessionPlan.objects.get_or_create(
                    posicao=posicao, sucessor=sucessor,
                    defaults={
                        "prontidao": RNG.choice(["PRONTO_AGORA", "PRONTO_1_2_ANOS", "PRONTO_3_5_ANOS", "DESENVOLVER"]),
                        "aderencia": round(RNG.uniform(45, 95), 1),
                        "prioridade": prioridade,
                        "plano_desenvolvimento": "Trilha de certificação, mentoria com o ocupante atual e exposição a comitês.",
                    },
                )

    # ------------------------------------------------------- workflows e campos
    def _workflows_campos(self):
        self.stdout.write("  · workflows visuais e campos customizados")
        workflow, _ = Workflow.objects.update_or_create(
            nome="Fluxo padrão de tarefas", entidade="tarefa",
            defaults={"is_padrao": True, "descricao": "Fluxo de execução padrão do SGP."},
        )
        estados = [
            ("Backlog", "BACKLOG", "#94A3B8", "inbox", 0, 0),
            ("A fazer", "A_FAZER", "#64748B", "circle", 0, 0),
            ("Em andamento", "EM_ANDAMENTO", "#3B82F6", "play-circle", 4, 0),
            ("Em revisão", "EM_REVISAO", "#F59E0B", "eye", 3, 0),
            ("Bloqueada", "BLOQUEADA", "#EF4444", "ban", 0, 0),
            ("Concluída", "CONCLUIDA", "#10B981", "check-circle", 0, 1),
        ]
        objetos = {}
        for ordem, (nome, chave, cor, icone, wip, final) in enumerate(estados):
            estado, _ = WorkflowState.objects.update_or_create(
                workflow=workflow, chave=chave,
                defaults={
                    "nome": nome, "cor": cor, "icone": icone, "ordem": ordem,
                    "wip_limit": wip, "is_inicial": ordem == 0, "is_final": bool(final),
                    "posicao_x": ordem * 180.0, "posicao_y": 40.0,
                },
            )
            objetos[chave] = estado
        for de, para in [("BACKLOG", "A_FAZER"), ("A_FAZER", "EM_ANDAMENTO"), ("EM_ANDAMENTO", "EM_REVISAO"),
                         ("EM_REVISAO", "EM_ANDAMENTO"), ("EM_REVISAO", "CONCLUIDA"),
                         ("EM_ANDAMENTO", "BLOQUEADA"), ("BLOQUEADA", "EM_ANDAMENTO")]:
            WorkflowTransition.objects.get_or_create(
                workflow=workflow, de=objetos[de], para=objetos[para],
                defaults={"nome": f"{objetos[de].nome} → {objetos[para].nome}",
                          "requer_aprovacao": para == "CONCLUIDA"},
            )

        campos = [
            ("portfolio.project", "Centro de custo", "centro_custo", "TEXTO", "Financeiro", 6),
            ("portfolio.project", "Contrato vinculado", "contrato", "TEXTO", "Financeiro", 6),
            ("portfolio.project", "Previsto em lei", "previsto_lei", "BOOLEANO", "Compliance", 4),
            ("portfolio.project", "Base regulatória", "base_regulatoria",
             "SELECAO", "Compliance", 8),
            ("portfolio.project", "Benefício anual esperado", "beneficio_anual", "MOEDA", "Benefícios", 6),
            ("tasks.task", "Ambiente de implantação", "ambiente", "SELECAO", "Execução", 6),
            ("tasks.task", "Requer janela de manutenção", "requer_janela", "BOOLEANO", "Execução", 6),
            ("risks.risk", "Risco regulatório", "regulatorio", "BOOLEANO", "Classificação", 4),
        ]
        for entidade, nome, chave, tipo, secao, largura in campos:
            CampoCustomizado.objects.update_or_create(
                entidade=entidade, chave=chave,
                defaults={
                    "nome": nome, "tipo": tipo, "secao": secao, "largura": largura,
                    "opcoes": (
                        ["Produção", "Homologação", "Desenvolvimento"] if chave == "ambiente"
                        else ["LGPD", "BACEN", "ANS", "CVM", "Nenhuma"] if chave == "base_regulatoria"
                        else []
                    ),
                    "obrigatorio": False, "ativo": True,
                },
            )

    # ------------------------------------------------------------ integrações
    def _integracoes(self, usuarios):
        """Catálogo de integrações da especificação §11, a maioria em modo simulação."""
        self.stdout.write("  · integrações, mapeamentos e webhooks")
        responsavel = usuarios["ricardo.tavares@empresa.com.br"]

        definicoes = [
            {
                "nome": "Jira da Engenharia",
                "tipo": TipoIntegracao.JIRA,
                "direcao": "BIDIRECIONAL",
                "descricao": "Sincroniza tarefas do SGP com as issues do projeto SGP no Jira.",
                "url_base": "https://empresa.atlassian.net",
                "autenticacao": "BEARER",
                "credenciais": {"token": "ATATT3xFfGF0-exemplo-nao-funcional", "projeto_chave": "SGP"},
                "ativa": True,
                "frequencia_minutos": 30,
                "icone": "square-kanban",
                "cor": "#2563EB",
            },
            {
                "nome": "Moodle Corporativo",
                "tipo": TipoIntegracao.LMS,
                "direcao": "ENTRADA",
                "descricao": "Importa conclusões de curso e certificados, creditando XP nas capacidades.",
                "url_base": "https://lms.empresa.com.br",
                "autenticacao": "API_KEY",
                "credenciais": {"api_key": "moodle-token-exemplo", "header": "X-Moodle-Token"},
                "ativa": True,
                "frequencia_minutos": 720,
                "icone": "graduation-cap",
                "cor": "#059669",
            },
            {
                "nome": "Teams · Canal Governança de Projetos",
                "tipo": TipoIntegracao.TEAMS,
                "direcao": "SAIDA",
                "descricao": "Publica eventos relevantes no canal de governança.",
                "url_base": "",
                "autenticacao": "WEBHOOK",
                "credenciais": {"webhook_url": "https://empresa.webhook.office.com/webhookb2/exemplo"},
                "ativa": True,
                "frequencia_minutos": 15,
                "icone": "message-square",
                "cor": "#6366F1",
            },
            {
                "nome": "Slack · #pmo-alertas",
                "tipo": TipoIntegracao.SLACK,
                "direcao": "SAIDA",
                "descricao": "Alertas de risco crítico e projeto em risco no canal do PMO.",
                "url_base": "",
                "autenticacao": "WEBHOOK",
                "credenciais": {"webhook_url": "https://hooks.slack.com/services/T000/B000/exemplo"},
                "ativa": True,
                "frequencia_minutos": 15,
                "icone": "hash",
                "cor": "#EC4899",
            },
            {
                "nome": "Google Calendar · Portfólio",
                "tipo": TipoIntegracao.GOOGLE_CALENDAR,
                "direcao": "SAIDA",
                "descricao": "Publica tarefas e marcos na agenda do portfólio.",
                "url_base": "https://www.googleapis.com",
                "autenticacao": "OAUTH2",
                "credenciais": {"access_token": "ya29.exemplo-nao-funcional"},
                "ativa": True,
                "frequencia_minutos": 120,
                "icone": "calendar",
                "cor": "#0891B2",
            },
            {
                "nome": "SAP · Financeiro",
                "tipo": TipoIntegracao.ERP,
                "direcao": "SAIDA",
                "descricao": "Envia lançamentos realizados para lançamento contábil.",
                "url_base": "https://sap.empresa.com.br",
                "autenticacao": "BASIC",
                "credenciais": {"usuario": "integracao.sgp", "senha": "senha-exemplo"},
                "ativa": False,
                "frequencia_minutos": 1440,
                "icone": "database",
                "cor": "#F59E0B",
            },
            {
                "nome": "Gupy · Recursos Humanos",
                "tipo": TipoIntegracao.RH,
                "direcao": "ENTRADA",
                "descricao": "Importa colaboradores, cargos e áreas do sistema de RH.",
                "url_base": "https://api.gupy.io",
                "autenticacao": "BEARER",
                "credenciais": {"token": "gupy-token-exemplo"},
                "ativa": False,
                "frequencia_minutos": 1440,
                "icone": "users",
                "cor": "#8B5CF6",
            },
            {
                "nome": "Power BI · Portfólio Executivo",
                "tipo": TipoIntegracao.BI,
                "direcao": "SAIDA",
                "descricao": "Publica o dataset do portfólio para os painéis executivos.",
                "url_base": "https://api.powerbi.com",
                "autenticacao": "OAUTH2",
                "credenciais": {"access_token": "eyJ0eXAi-exemplo", "formato": "JSON"},
                "ativa": True,
                "frequencia_minutos": 360,
                "icone": "bar-chart-3",
                "cor": "#F97316",
            },
            {
                "nome": "ESCO · Taxonomia de Capacidades",
                "tipo": TipoIntegracao.ESCO,
                "direcao": "ENTRADA",
                "descricao": "Importa a taxonomia europeia de competências para o catálogo.",
                "url_base": "https://ec.europa.eu/esco/api",
                "autenticacao": "NENHUMA",
                "credenciais": {"framework": "ESCO"},
                "ativa": False,
                "frequencia_minutos": 10080,
                "icone": "sparkles",
                "cor": "#10B981",
            },
            {
                "nome": "GitHub · Plataforma SGP",
                "tipo": TipoIntegracao.GITHUB,
                "direcao": "ENTRADA",
                "descricao": "Importa commits como atividade do projeto.",
                "url_base": "https://api.github.com",
                "autenticacao": "BEARER",
                "credenciais": {"token": "ghp_exemplo", "repositorio": "empresa/sgp"},
                "ativa": False,
                "frequencia_minutos": 240,
                "icone": "github",
                "cor": "#334155",
            },
        ]

        criadas = []
        for definicao in definicoes:
            integracao, _ = Integracao.objects.update_or_create(
                nome=definicao["nome"],
                defaults={**definicao, "responsavel": responsavel, "modo_simulacao": True},
            )
            criadas.append(integracao)

        # Mapeamentos de exemplo: mostram como traduzir campos do sistema externo
        mapeamentos_jira = [
            ("summary", "nome", Transformacao.TRIM, {}, True),
            ("description", "descricao", Transformacao.NENHUMA, {}, False),
            ("duedate", "data_fim", Transformacao.DATA, {}, False),
            ("status.name", "status", Transformacao.ENUM,
             {"A fazer": "A_FAZER", "Em andamento": "EM_ANDAMENTO", "Concluído": "CONCLUIDA"}, True),
        ]
        jira = next(i for i in criadas if i.tipo == TipoIntegracao.JIRA)
        for ordem, (origem, destino, transformacao, traducao, obrigatorio) in enumerate(mapeamentos_jira):
            MapeamentoCampo.objects.update_or_create(
                integracao=jira, campo_destino=destino,
                defaults={
                    "campo_origem": origem, "transformacao": transformacao,
                    "traducao": traducao, "obrigatorio": obrigatorio, "ordem": ordem,
                },
            )

        mapeamentos_lms = [
            ("user_email", "user_email", Transformacao.MINUSCULA, {}, True),
            ("course_code", "course_code", Transformacao.TRIM, {}, True),
            ("completion_date", "completion_date", Transformacao.DATA, {}, False),
            ("score", "score", Transformacao.NUMERO, {}, False),
        ]
        lms = next(i for i in criadas if i.tipo == TipoIntegracao.LMS)
        for ordem, (origem, destino, transformacao, traducao, obrigatorio) in enumerate(mapeamentos_lms):
            MapeamentoCampo.objects.update_or_create(
                integracao=lms, campo_destino=destino,
                defaults={
                    "campo_origem": origem, "transformacao": transformacao,
                    "traducao": traducao, "obrigatorio": obrigatorio, "ordem": ordem,
                },
            )

        # Webhooks de exemplo cobrindo os eventos mais usados
        for nome, url, eventos, ativo, secreto in [
            ("Portal de Governança", "https://governanca.empresa.com.br/hooks/sgp",
             ["projeto.*", "risco.critico", "marco.concluido"], True, "segredo-governanca-2026"),
            ("Data Warehouse", "https://dw.empresa.com.br/ingest/sgp",
             ["tarefa.concluida", "alocacao.criada", "orcamento.estourado"], True, "segredo-dw-2026"),
            ("Monitor de Capacidades", "https://pessoas.empresa.com.br/hooks/sgp",
             ["promocao.aprovada", "capacidade.*"], False, "segredo-pessoas-2026"),
        ]:
            Webhook.objects.update_or_create(
                nome=nome, defaults={"url": url, "eventos": eventos, "ativo": ativo, "secreto": secreto}
            )

        # Uma execução de exemplo por integração ativa, para a tela não nascer vazia
        from apps.integrations.services import executar_sincronizacao

        for integracao in criadas:
            if not integracao.ativa:
                continue
            operacao = "IMPORTAR" if integracao.direcao == "ENTRADA" else "EXPORTAR"
            try:
                executar_sincronizacao(integracao, operacao=operacao, limite=25)
            except Exception as exc:  # pragma: no cover
                self.stderr.write("    ! integração " + integracao.nome + ": " + str(exc))

    # ------------------------------------------- preferências e notificações
    def _preferencias_notificacoes(self, usuarios, projetos):
        self.stdout.write("  · preferências visuais, notificações e atividades")
        # Resíduo das versões anteriores do seed: várias composições com o mesmo
        # nome e exatamente os mesmos widgets. Sem isso, quem já populou o banco
        # continuaria vendo sósias idênticos na lista de composições salvas.
        residuo = [
            layout for layout in DashboardLayout.objects.filter(
                user__in=list(usuarios.values()), nome="Meu painel executivo"
            )
            if layout.widgets_json == COMPOSICAO_DO_SEED_ANTIGO
        ]
        for layout in residuo:
            layout.delete()

        # Modelos compartilhados: visíveis para todos porque são o padrão da casa.
        pmo = usuarios.get("ricardo.tavares@empresa.com.br")
        if pmo is not None:
            for modelo in MODELOS_COMPOSICAO:
                DashboardLayout.objects.update_or_create(
                    user=pmo, nome=modelo["nome"],
                    defaults={"widgets_json": modelo["widgets_json"], "is_default": True},
                )

        for usuario in usuarios.values():
            # Composições privadas, uma por painel do perfil — nunca is_default,
            # senão a lista de todo mundo viraria uma pilha de modelos alheios.
            for composicao in COMPOSICOES_POR_PERFIL.get(usuario.perfil, []):
                DashboardLayout.objects.update_or_create(
                    user=usuario, nome=composicao["nome"],
                    defaults={"widgets_json": composicao["widgets_json"], "is_default": False},
                )

            SavedFilter.objects.get_or_create(
                user=usuario, nome="Projetos críticos em execução", modulo="projetos",
                defaults={
                    "criterios_json": {"status": ["EM_EXECUCAO"], "prioridade": ["ALTA", "CRITICA"],
                                       "saude": ["AMARELO", "VERMELHO"]},
                    "icone": "alert-triangle", "cor": "#EF4444",
                },
            )
            if usuario.perfil in {Perfil.PMO, Perfil.RH}:
                SavedFilter.objects.get_or_create(
                    user=usuario, nome="Capacidades estratégicas com bus factor baixo",
                    modulo="capacidades",
                    defaults={
                        "criterios_json": {"criticidade": ["ESTRATEGICA", "ALTA"], "bus_factor_max": 2},
                        "icone": "shield-alert", "cor": "#F59E0B", "compartilhado": True,
                    },
                )

        destaques = list(projetos)[:8]
        for projeto in destaques:
            for usuario in RNG.sample(list(usuarios.values()), k=RNG.randint(2, 5)):
                Notificacao.objects.create(
                    user=usuario,
                    titulo=RNG.choice([
                        f"Projeto {projeto.nome} entrou em atenção",
                        f"Marco próximo do vencimento em {projeto.nome}",
                        f"Nova alocação pendente de confirmação em {projeto.nome}",
                        f"Risco crítico atualizado em {projeto.nome}",
                    ]),
                    mensagem=f"Verifique o painel do projeto {projeto.codigo}.",
                    nivel=RNG.choice(["INFO", "ALERTA", "CRITICO", "SUCESSO"]),
                    icone=RNG.choice(["bell", "alert-triangle", "shield-alert", "trophy"]),
                    link=f"/projetos/{projeto.id}", lida=RNG.random() < 0.4,
                    entidade="portfolio.project", entidade_id=str(projeto.id),
                )
            for _ in range(RNG.randint(1, 3)):
                autor = RNG.choice(list(usuarios.values()))
                Atividade.objects.create(
                    user=autor, user_nome=autor.nome, user_cor=autor.cor,
                    verbo=RNG.choice(["atualizou a tarefa", "moveu o card de", "comentou em",
                                      "registrou risco em", "alocou recurso em"]),
                    entidade=RNG.choice(["tasks.task", "portfolio.project", "risks.risk"]),
                    entidade_nome=projeto.nome, projeto_id=projeto.id,
                    meta={"projeto": projeto.codigo},
                )

    # ------------------------------------------------------------- recálculos
    def _recalcular(self, projetos):
        self.stdout.write("  · recalculando progresso, saúde, EVM e caminho crítico")
        for projeto in projetos:
            projeto.calcular_progresso()
            projeto.recalcular_saude()
            try:
                calcular_caminho_critico(projeto.id)
            except Exception as exc:  # pragma: no cover
                self.stderr.write(f"    ! caminho crítico de {projeto.codigo}: {exc}")
        self.stdout.write("  · gerando recomendações de alocação de exemplo")
        from apps.capabilities.matching import motor_matching

        for tarefa in Task.objects.filter(status__in=["A_FAZER", "EM_ANDAMENTO"]).order_by("?")[:12]:
            try:
                motor_matching(task=tarefa, modo=RNG.choice(["PERFORMANCE", "DESENVOLVIMENTO", "MISTO"]),
                               limite=6, persistir=True)
            except Exception as exc:  # pragma: no cover
                self.stderr.write(f"    ! matching da tarefa {tarefa.id}: {exc}")
        # Uma recomendação já aceita para popular o painel de alocação
        pendentes = list(AllocationRecommendation.objects.filter(status="SUGERIDA")[:6])
        for recomendacao in pendentes[:2]:
            recomendacao.status = "ACEITA"
            recomendacao.observacao_decisao = "Aceita pelo gestor após análise."
            recomendacao.save(update_fields=["status", "observacao_decisao"])

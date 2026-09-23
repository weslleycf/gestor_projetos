"""
Configurações do SGP — Sistema de Gestão de Projetos, Portfólio e Capacidades.

Ambiente de desenvolvimento: SQLite + DRF + JWT.
"""
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-insecure-sgp-desenvolvimento-apenas-troque-em-producao"
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceiros
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    # Apps do SGP
    "apps.core",
    "apps.portfolio",
    "apps.tasks",
    "apps.resources",
    "apps.finance",
    "apps.risks",
    "apps.capabilities",
    "apps.collab",
    "apps.integrations",
    "apps.analytics",
    "apps.ajuda",
    "apps.ia",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.AuditContextMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
        "OPTIONS": {
            "timeout": 30,
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
        },
    }
}

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------
# E-mail (RF-36). Em desenvolvimento o backend de console imprime a mensagem
# no terminal em vez de enviá-la. Em produção troque por SMTP.
# --------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "SGP <nao-responda@empresa.com.br>"
EMAIL_SUBJECT_PREFIX = "[SGP] "

# --------------------------------------------------------------------------
# Django REST Framework
# --------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "EXCEPTION_HANDLER": "apps.core.exceptions.sgp_exception_handler",
    "DATETIME_FORMAT": "%Y-%m-%dT%H:%M:%S%z",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.core.serializers.SGPTokenObtainPairSerializer",
}

# --------------------------------------------------------------------------
# CORS (SPA Vite em desenvolvimento)
# --------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# --------------------------------------------------------------------------
# Regras de negócio do SGP (parametrizáveis — ver especificação §3.9.3)
# --------------------------------------------------------------------------
SGP = {
    # Evolução de capacidade
    "XP_POR_NIVEL": 100,
    "MESES_MINIMOS_NO_NIVEL": 6,
    "EVIDENCIAS_MINIMAS": 2,
    "XP_POR_TAREFA_CONCLUIDA": 20,
    "XP_POR_HORA_REGISTRADA": 0.5,
    "DIAS_PARA_DECAY": 365,
    "FATOR_DECAY": 0.85,
    # Pesos do motor de alocação (w1..w6 da especificação §9.1)
    "PESOS_MATCHING": {
        "skill": 0.40,
        "disponibilidade": 0.20,
        "custo": 0.12,
        "preferencia": 0.08,
        "experiencia": 0.12,
        "proximidade": 0.08,
    },
    "PENALIDADES_MATCHING": {
        "sobrecarga": 0.35,
        "conflito_critico": 0.15,
        "skill_obrigatoria": 0.50,
        "historico_ruim": 0.10,
    },
    "BONUS_EXCEDENTE": 0.10,
    # Catálogo de temas visuais disponibilizados pela API (a definição completa
    # dos tokens vive no frontend, em src/lib/temas.ts).
    "TEMAS": [
        {"id": "sgp", "nome": "Azul SGP", "categoria": "institucional",
         "descricao": "Identidade padrão do sistema."},
        {"id": "bradesco", "nome": "Bradesco 2026", "categoria": "institucional",
         "descricao": "Vermelho #CC092F e roxo #633280 da marca Bradesco."},
        {"id": "esmeralda", "nome": "Esmeralda", "categoria": "classico",
         "descricao": "Verde institucional."},
        {"id": "oceano", "nome": "Oceano", "categoria": "classico",
         "descricao": "Ciano profundo para dashboards analíticos."},
        {"id": "violeta", "nome": "Violeta", "categoria": "vibrante",
         "descricao": "Roxo contemporâneo."},
        {"id": "ambar", "nome": "Âmbar", "categoria": "vibrante",
         "descricao": "Laranja quente com texto escuro sobre a marca."},
        {"id": "grafite", "nome": "Grafite", "categoria": "classico",
         "descricao": "Neutro minimalista com cantos retos."},
        {"id": "alto-contraste", "nome": "Alto contraste", "categoria": "acessibilidade",
         "descricao": "Contraste máximo para baixa visão (WCAG AAA).", "acessivel": True},
        {"id": "custom", "nome": "Personalizado", "categoria": "custom",
         "descricao": "Tema criado pelo próprio usuário."},
    ],
    "DIAS_ALERTA_PRAZO": 14,
    "LIMIAR_SAUDE_AMARELO": 0.85,
    "LIMIAR_SAUDE_VERDE": 0.95,
    "BUS_FACTOR_CRITICO": 2,
    # Integrações
    "INTEGRACAO_MAX_TENTATIVAS": 3,
    "INTEGRACAO_TEMPO_LIMITE": 12,
    "INTEGRACAO_MODO_SIMULACAO_PADRAO": True,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"django.db.backends": {"level": "WARNING", "handlers": ["console"], "propagate": False}},
}

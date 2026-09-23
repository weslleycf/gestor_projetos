from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.integrations"
    label = "integrations"
    verbose_name = "Integrações e API pública"

    def ready(self):
        # Conecta os receptores que alimentam a fila de eventos de integração.
        from . import signals  # noqa: F401

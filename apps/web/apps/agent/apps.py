from django.apps import AppConfig

from apps.plugins.registry import PluginAppConfig


class AgentConfig(AppConfig, PluginAppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.agent"
    label = "agent"
    verbose_name = "AI Agent"

    plugin_manifest = {
        "id": "purple-sector.agent",
        "name": "AI Agent",
        "version": "0.1.0",
        "description": "Embedded AI agent panel and settings tab",
        "capabilities": ["globalPanel", "settingsTab"],
        "entry": "plugins/agent/index.js",
        "tier": "free",
    }

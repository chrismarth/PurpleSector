from django.apps import AppConfig

from apps.plugins.registry import PluginAppConfig


class TelemetryConfig(AppConfig, PluginAppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.telemetry"
    label = "telemetry"
    verbose_name = "Telemetry & Laps"

    plugin_manifest = {
        "id": "purple-sector.core-lap-telemetry",
        "name": "Core Lap Telemetry",
        "version": "0.1.0",
        "description": "Built-in telemetry plot panels and lap analysis views",
        "capabilities": ["analysisPanelType", "analysisPanelProvider"],
        "entry": "plugins/core-lap-telemetry/index.js",
        "tier": "free",
    }

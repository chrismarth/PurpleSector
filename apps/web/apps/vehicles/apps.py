from django.apps import AppConfig

from apps.plugins.registry import PluginAppConfig


class VehiclesConfig(AppConfig, PluginAppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.vehicles"
    label = "vehicles"
    verbose_name = "Vehicles"

    plugin_manifest = {
        "id": "purple-sector.vehicles",
        "name": "Vehicles",
        "version": "0.1.0",
        "description": "Vehicle library — nav tree, configurations, and setups",
        "capabilities": ["navTab"],
        "entry": "plugins/vehicles/index.js",
        "tier": "free",
    }

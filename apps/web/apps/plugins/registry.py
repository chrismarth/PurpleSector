"""
Plugin registry for PurpleSector.

Django apps that provide UI plugins subclass PluginAppConfig instead of
AppConfig and declare a `plugin_manifest` dict.  The PluginRegistry
discovers all registered plugins at startup by scanning INSTALLED_APPS.

Manifest schema (mirrors packages/plugin-api/src/types.ts):
{
    "id":           str   — unique reverse-domain identifier, e.g. "purple-sector.agent"
    "name":         str   — human-readable name
    "version":      str   — semver string
    "description":  str   — optional
    "capabilities": list  — subset of PluginCapability values
    "entry":        str   — JS module path served by Vite, e.g. "plugins/agent/index.js"
    "tier":         str   — "free" | "premium" (default "free")
    "dependencies": list  — plugin ids that must be loaded first (default [])
    "enabled":      bool  — can be toggled per-deployment via settings (default True)
}
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.apps import AppConfig


class PluginAppConfig:
    """
    Mixin for Django AppConfig subclasses that provide a UI plugin.

    Usage::

        from django.apps import AppConfig
        from apps.plugins.registry import PluginAppConfig

        class AgentConfig(AppConfig, PluginAppConfig):
            name = "apps.agent"
            plugin_manifest = {
                "id": "purple-sector.agent",
                "name": "AI Agent",
                "version": "0.1.0",
                "capabilities": ["globalPanel", "settingsTab"],
                "entry": "plugins/agent/index.js",
            }
    """

    plugin_manifest: dict | None = None


class PluginRegistry:
    """
    Singleton that collects manifests from all installed PluginAppConfig apps.
    Populated during Django's app-registry ready phase.
    """

    _manifests: list[dict] = []
    _ready: bool = False

    @classmethod
    def collect(cls) -> None:
        """
        Walk INSTALLED_APPS and collect manifests from PluginAppConfig apps.
        Called once from PluginsConfig.ready().
        """
        from django.apps import apps as django_apps

        cls._manifests = []
        for app_config in django_apps.get_app_configs():
            if isinstance(app_config, PluginAppConfig) and app_config.plugin_manifest:
                manifest = dict(app_config.plugin_manifest)
                manifest.setdefault("tier", "free")
                manifest.setdefault("dependencies", [])
                manifest.setdefault("enabled", True)
                cls._manifests.append(manifest)
        cls._ready = True

    @classmethod
    def get_manifests(cls, *, user=None) -> list[dict]:
        """
        Return the list of enabled plugin manifests, optionally filtered by user.

        Future: filter by user.tier, org settings, feature flags, etc.
        """
        manifests = [m for m in cls._manifests if m.get("enabled", True)]

        if user is not None:
            manifests = cls._filter_for_user(manifests, user)

        return manifests

    @classmethod
    def _filter_for_user(cls, manifests: list[dict], user) -> list[dict]:
        """
        Filter manifests based on user tier / role.
        Premium plugins are only exposed to users with role != "USER" or
        explicit premium entitlement.  Extend this as billing is added.
        """
        user_role = getattr(user, "role", "USER")
        allowed_tiers = {"free"}
        if user_role in ("ADMIN", "PREMIUM"):
            allowed_tiers.add("premium")

        return [m for m in manifests if m.get("tier", "free") in allowed_tiers]

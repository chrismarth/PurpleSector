"""
Django settings for PurpleSector.

Reads configuration from environment variables. In development, place a .env
file in the project root (apps/web/) or the monorepo root.
"""

import os
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent
# Monorepo root: ../../.. from apps/web/purplesector/
MONOREPO_ROOT = BASE_DIR.parent.parent

# ── Core ─────────────────────────────────────────────────────────────────────

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-me-in-production",
)
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() in ("true", "1", "yes")

INTERNAL_IPS = ["127.0.0.1"]
ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# ── Apps ─────────────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "corsheaders",
    "inertia",
    "django_vite",
    # PurpleSector apps
    "apps.plugins",
    "apps.core",
    "apps.events",
    "apps.telemetry",
    "apps.vehicles",
    "apps.channels",
    "apps.analysis",
    "apps.tokens",
    "apps.agent",
]

# ── Middleware ────────────────────────────────────────────────────────────────

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "purplesector.middleware.csrf.ApiCsrfExemptMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "purplesector.middleware.auth.LoginRequiredMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "inertia.middleware.InertiaMiddleware",
    "purplesector.middleware.inertia_share.InertiaShareMiddleware",
]

# ── URLs & Templates ────────────────────────────────────────────────────────

ROOT_URLCONF = "purplesector.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "purplesector" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "purplesector.wsgi.application"
ASGI_APPLICATION = "purplesector.asgi.application"

# ── Database ─────────────────────────────────────────────────────────────────

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "purplesector"),
        "USER": os.environ.get("POSTGRES_USER", "purplesector"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "devpassword"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Auth ─────────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGIN_URL = "/login"

SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False  # True in production
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = False  # True in production

# CORS — allow Vite dev server to make credentialed requests to Django
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

# Inertia.js versioning
INERTIA_VERSION = "1.0"

# ── Internationalization ────────────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Static / Vite ───────────────────────────────────────────────────────────

STATIC_URL = "/static/"
STATICFILES_DIRS = [
    MONOREPO_ROOT / "packages" / "web-core" / "public",
]

# django-vite settings
DJANGO_VITE = {
    "default": {
        "dev_mode": DEBUG,
        "dev_server_host": "localhost",
        "dev_server_port": 5173,
        "manifest_path": MONOREPO_ROOT / "packages" / "web-core" / "dist" / ".vite" / "manifest.json",
    }
}

# ── Inertia ──────────────────────────────────────────────────────────────────

INERTIA_LAYOUT = "base.html"

# ── Trino (Iceberg queries) ─────────────────────────────────────────────────

TRINO_HOST = os.environ.get("TRINO_HOST", "localhost")
TRINO_PORT = int(os.environ.get("TRINO_PORT", "8083"))
TRINO_USER = os.environ.get("TRINO_USER", "purplesector")
TRINO_CATALOG = os.environ.get("TRINO_CATALOG", "iceberg")
TRINO_SCHEMA = os.environ.get("TRINO_SCHEMA", "telemetry")

# ── RisingWave ──────────────────────────────────────────────────────────────

RISINGWAVE_HOST = os.environ.get("RISINGWAVE_HOST", "")
RISINGWAVE_PORT = int(os.environ.get("RISINGWAVE_PORT", "4566"))

# Disable APPEND_SLASH for API - frontend calls /api/events not /api/events/
# Django's redirect on POST loses the request body, causing 500 errors
APPEND_SLASH = False
RISINGWAVE_DB = os.environ.get("RISINGWAVE_DB", "dev")
RISINGWAVE_USER = os.environ.get("RISINGWAVE_USER", "root")

# ── Logging ─────────────────────────────────────────────────────────────────

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "loggers": {
        "purplesector.services": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
    },
}

# ── OpenAI ──────────────────────────────────────────────────────────────────

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

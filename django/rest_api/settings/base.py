from datetime import timedelta
from pathlib import Path
import os

import environ

env = environ.Env()

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
APP_DIR = ROOT_DIR / "core_apps"

# Read .env if present (for local dev without Docker)
env_file = ROOT_DIR.parent / ".env"
if env_file.exists():
    environ.Env.read_env(str(env_file))

DEBUG = env.bool("DJANGO_DEBUG", False)

SECRET_KEY = env.str(
    "DJANGO_SECRET_KEY",
    default="django-insecure-changeme-in-production-please-replace-this",
)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "0.0.0.0"])

DJANGO_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "dj_rest_auth",
]

LOCAL_APPS = [
    "core_apps.users",
    "core_apps.training",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "rest_api.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
            ],
        },
    },
]

WSGI_APPLICATION = "rest_api.wsgi.application"

# Database – SQLite3
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": env.str("SQLITE_DB_PATH", str(ROOT_DIR / "db.sqlite3")),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# Internationalization
LANGUAGE_CODE = "de-de"
TIME_ZONE = "Europe/Berlin"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/django-static/"
STATIC_ROOT = str(ROOT_DIR / "staticfiles")
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Custom User Model
AUTH_USER_MODEL = "users.User"

# ── API URL ───────────────────────────────────────────────────────────────────
API_URL_PATH = "api/v1/"
API_URL_PREFIX = f"/{API_URL_PATH}"

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost", "http://localhost:4200", "http://127.0.0.1"],
)
CORS_ALLOW_CREDENTIALS = True
CORS_URLS_REGEX = rf"^/api/.*$"

CSRF_TRUSTED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost", "http://localhost:4200", "http://127.0.0.1"],
)

# ── REST Framework ────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 100,
}

# ── JWT & dj-rest-auth ────────────────────────────────────────────────────────
JWT_REFRESH_COOKIE_PATH = f"/{API_URL_PATH}auth/token/refresh/"

REST_AUTH = {
    "USE_JWT": True,
    "SESSION_LOGIN": False,
    "JWT_AUTH_COOKIE": "app-access-token",
    "JWT_AUTH_REFRESH_COOKIE": "app-refresh-token",
    "JWT_AUTH_REFRESH_COOKIE_PATH": JWT_REFRESH_COOKIE_PATH,
    "JWT_AUTH_SECURE": not DEBUG,
    "JWT_AUTH_HTTPONLY": True,
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_RETURN_EXPIRATION": True,
    "JWT_AUTH_COOKIE_USE_CSRF": True,
    "JWT_AUTH_COOKIE_ENFORCE_CSRF_ON_UNAUTHENTICATED": True,
    "USER_DETAILS_SERIALIZER": "core_apps.users.serializers.UserDetailSerializer",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

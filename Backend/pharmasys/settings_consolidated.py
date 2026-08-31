"""
Consolidated Django Settings — LizzyMike Pharmacy System

This is a single unified settings file that replaces:
  - settings.py (base)
  - settings_local.py (LAN production)
  - settings_postgres.py (PostgreSQL override)
  - settings_production.py (Production with S3)
  - settings_free.py (Free hosting)

All configuration is driven by environment variables, supporting:
  - Development (local SQLite, DEBUG=True)
  - LAN (local PostgreSQL, HTTP, no SSL)
  - Production (HTTPS, S3, security headers)
  - Free Hosting (PostgreSQL, HTTPS, LocMemCache)

Load environment variables from Backend/.env or Backend/.env.local before
this module is imported. The env_loader module handles this in manage.py and wsgi.py.

ENVIRONMENT VARIABLE: Set DJANGO_ENV to one of:
  - "development" (default)
  - "lan"
  - "production"
  - "free"
"""

from pathlib import Path
from datetime import timedelta
from decimal import Decimal
import os
import logging

from django.core.exceptions import ImproperlyConfigured
from decouple import config, Csv
from corsheaders.defaults import default_headers

# ============================================================================
# PATHS
# ============================================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# ============================================================================
# ENVIRONMENT & ERROR HANDLING
# ============================================================================

def _require_env(name: str, description: str = '') -> str:
    """
    Read an environment variable that MUST be set.
    
    Raises ImproperlyConfigured with a clear message if it is missing.
    This prevents silent failures with insecure defaults.
    
    Args:
        name: Environment variable name
        description: Human-readable description of what this variable is for
    
    Returns:
        The environment variable value
    
    Raises:
        ImproperlyConfigured: If variable is not set
    """
    value = os.environ.get(name)
    if not value:
        raise ImproperlyConfigured(
            f"\n{'='*70}\n"
            f"❌ REQUIRED ENVIRONMENT VARIABLE MISSING: {name}\n"
            f"{'='*70}\n"
            f"{description}\n"
            f"\nSet this in Backend/.env or Backend/.env.local, then restart.\n"
            f"See Backend/.env.example for all required variables.\n"
            f"{'='*70}\n"
        )
    return value.strip()


def _detect_environment() -> str:
    """Detect which environment we're running in."""
    env = config('DJANGO_ENV', default='development').lower()
    if env not in ('development', 'lan', 'production', 'free'):
        raise ImproperlyConfigured(
            f"Invalid DJANGO_ENV={env}. Must be one of: "
            "development, lan, production, free"
        )
    return env


DJANGO_ENV = _detect_environment()
logger = logging.getLogger('django')

# ============================================================================
# CORE SETTINGS
# ============================================================================

# Secret key — REQUIRED in production, should be different per environment
# Accept SECRET_KEY or DJANGO_SECRET_KEY (common naming in .env templates)
SECRET_KEY = config('SECRET_KEY', default=None) or config(
    'DJANGO_SECRET_KEY',
    default=(
        'django-insecure-CHANGE-ME-IN-PRODUCTION'
        if DJANGO_ENV == 'development'
        else None  # Forces error in production if not set
    ),
)
if not SECRET_KEY or (
    SECRET_KEY == 'django-insecure-CHANGE-ME-IN-PRODUCTION' and DJANGO_ENV != 'development'
):
    raise ImproperlyConfigured(
        "SECRET_KEY (or DJANGO_SECRET_KEY) must be set in production environments. "
        "Generate with: python -c \"from django.core.management.utils import "
        "get_random_secret_key; print(get_random_secret_key())\""
    )

# Debug mode
DEBUG = config('DEBUG', default=DJANGO_ENV == 'development', cast=bool)

# Allowed hosts
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1,192.168.0.137,192.168.1.200' if DJANGO_ENV in ('development', 'lan') else 'localhost,127.0.0.1',
    cast=Csv(),
)

# ============================================================================
# SECURITY SETTINGS
# ============================================================================
# These vary significantly by environment

if DJANGO_ENV == 'development':
    # Development: allow all, no SSL
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_SSL_REDIRECT = False
    SECURE_CONTENT_TYPE_NOSNIFF = False
    X_FRAME_OPTIONS = 'DENY'
    
elif DJANGO_ENV == 'lan':
    # LAN: HTTP on private network, no SSL needed
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_SSL_REDIRECT = False
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'SAMEORIGIN'
    
elif DJANGO_ENV in ('production', 'free'):
    # Production & Free: enforce SSL, strict headers
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    # Behind Nginx / reverse proxy terminating TLS
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Common security settings
SESSION_COOKIE_HTTPONLY = True
# CSRF cookie must be readable by the SPA for cookie-authenticated POSTs
CSRF_COOKIE_HTTPONLY = False
SECURE_BROWSER_XSS_FILTER = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
# Browser feature lockdown (augmented by SecurityHeadersMiddleware / django-csp)
PERMISSIONS_POLICY = {
    'geolocation': [],
    'microphone': [],
    'camera': [],
    'payment': [],
}

# Content Security Policy (django-csp)
CSP_DEFAULT_SRC = ("'self'",)
CSP_IMG_SRC = ("'self'", 'data:', 'blob:')
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_SCRIPT_SRC = ("'self'",)
CSP_CONNECT_SRC = ("'self'",)
CSP_FRAME_ANCESTORS = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FORM_ACTION = ("'self'",)
CSP_INCLUDE_NONCE_IN = []


# CSRF & Session
CSRF_COOKIE_SAMESITE = 'Strict' if DJANGO_ENV == 'production' else 'Lax'
SESSION_COOKIE_SAMESITE = 'Strict' if DJANGO_ENV == 'production' else 'Lax'
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_SAVE_EVERY_REQUEST = True

# ============================================================================
# APPLICATION DEFINITION
# ============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'core',
]

# S3 storage only in production
if DJANGO_ENV == 'production' and config('USE_S3', default=False, cast=bool):
    INSTALLED_APPS.append('storages')

# Sentry error tracking (optional)
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    INSTALLED_APPS.append('sentry_sdk')

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'core.middleware.SecurityHeadersMiddleware',
]

# WhiteNoise for static file serving in production
if DJANGO_ENV == 'production':
    MIDDLEWARE.append('whitenoise.middleware.WhiteNoiseMiddleware')

MIDDLEWARE.extend([
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
])

# Custom middleware (in order they should run)
if DJANGO_ENV == 'lan':
    MIDDLEWARE.extend([
        'core.middleware.APIRequestLoggingMiddleware',  # Log all API requests
        'core.middleware.RateLimitMiddleware',  # Rate limiting for LAN
    ])
elif DJANGO_ENV == 'production':
    MIDDLEWARE.extend([
        'core.middleware.APIRequestLoggingMiddleware',
        'core.middleware.RateLimitMiddleware',
        'core.middleware.SessionSecurityMiddleware',
        'core.middleware.AuditMiddleware',
    ])
else:
    # Development — no rate-limit middleware (avoids flaky local/pytest runs)
    MIDDLEWARE.extend([
        'core.middleware.APIRequestLoggingMiddleware',
    ])

ROOT_URLCONF = 'pharmasys.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'pharmasys.wsgi.application'

# ============================================================================
# DATABASE
# ============================================================================

if DJANGO_ENV == 'development':
    # SQLite for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'OPTIONS': {
                'timeout': 20,
            }
        }
    }

elif DJANGO_ENV == 'lan':
    # PostgreSQL on local network
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='lizzymike_db'),
            'USER': config('DB_USER', default='pharma_user'),
            'PASSWORD': _require_env(
                'DB_PASSWORD',
                'PostgreSQL password for pharma_user account'
            ),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 60,
            'ATOMIC_REQUESTS': True,
            'OPTIONS': {
                'connect_timeout': 10,
                'sslmode': 'allow',  # Plain HTTP on LAN
            },
        }
    }

elif DJANGO_ENV == 'production':
    # PostgreSQL with optional SSL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': _require_env('DB_NAME', 'Production PostgreSQL database name'),
            'USER': _require_env('DB_USER', 'Production PostgreSQL user'),
            'PASSWORD': _require_env('DB_PASSWORD', 'Production PostgreSQL password'),
            'HOST': _require_env('DB_HOST', 'Production PostgreSQL host'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 600,
            'ATOMIC_REQUESTS': True,
            'OPTIONS': {
                'connect_timeout': 10,
                'sslmode': config('DB_SSLMODE', default='require'),
            },
        }
    }

elif DJANGO_ENV == 'free':
    # Free hosting provider (e.g., Render)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='pharmasys'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': _require_env('DB_PASSWORD', 'Free hosting database password'),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 600,
            'ATOMIC_REQUESTS': True,
            'OPTIONS': {
                'connect_timeout': 10,
                'sslmode': 'require',  # Free hosting usually requires SSL
            },
        }
    }

# ============================================================================
# AUTHENTICATION & PASSWORD VALIDATION
# ============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Prefer Argon2 when available (falls back to PBKDF2)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.ScryptPasswordHasher',
]

AUTH_USER_MODEL = 'core.User'  # Custom user model

# ============================================================================
# INTERNATIONALIZATION
# ============================================================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = config('TIME_ZONE', default='Africa/Lagos')  # Default to Nigeria
USE_I18N = True
USE_TZ = True

# ============================================================================
# STATIC & MEDIA FILES
# ============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ============================================================================
# DEFAULT PRIMARY KEY & MODEL FIELDS
# ============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_NATIVE_UIIDFIELD = False

# ============================================================================
# REST FRAMEWORK
# ============================================================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'core.authentication.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': config('REST_PAGE_SIZE', default=20, cast=int),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('REST_THROTTLE_ANON', default='100/hour'),
        'user': config('REST_THROTTLE_USER', default='1000/hour'),
        'login': config('REST_THROTTLE_LOGIN', default='5/min'),
    },
}

# ============================================================================
# JWT (JSON WEB TOKENS)
# ============================================================================

# Access lifetime in minutes (default 30). Refresh lifetime in days (default 7).
JWT_ACCESS_LIFETIME_MINUTES = config('JWT_ACCESS_LIFETIME_MINUTES', default=30, cast=int)
JWT_REFRESH_LIFETIME = config('JWT_REFRESH_LIFETIME', default=7, cast=int)

JWT_ACCESS_COOKIE = 'access_token'
JWT_REFRESH_COOKIE = 'refresh_token'

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=JWT_ACCESS_LIFETIME_MINUTES),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=JWT_REFRESH_LIFETIME),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ============================================================================
# CORS (CROSS-ORIGIN RESOURCE SHARING)
# ============================================================================

# Never use CORS_ALLOW_ALL_ORIGINS with credentials — browsers reject it.
CORS_ALLOW_ALL_ORIGINS = False

if DJANGO_ENV == 'lan':
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default='http://192.168.1.100,http://localhost,http://127.0.0.1',
        cast=Csv(),
    )
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r'^http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$',
        r'^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$',
        r'^http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$',
    ]
    CSRF_TRUSTED_ORIGINS = config(
        'CSRF_TRUSTED_ORIGINS',
        default='http://192.168.1.100,http://localhost,http://127.0.0.1',
        cast=Csv(),
    )
else:
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'
        if DJANGO_ENV == 'development'
        else 'https://yourdomain.com',
        cast=Csv(),
    )
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r'^http://localhost(:\d+)?$',
        r'^http://127\.0\.0\.1(:\d+)?$',
        r'^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$',
        r'^http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$',
    ] if DJANGO_ENV == 'development' else []
    CSRF_TRUSTED_ORIGINS = config(
        'CSRF_TRUSTED_ORIGINS',
        default='http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'
        if DJANGO_ENV == 'development'
        else 'https://yourdomain.com',
        cast=Csv(),
    )

# Local CRA runs on :3000; env files often list http://localhost without a port,
# which browsers treat as a different origin.
if DJANGO_ENV == 'development':
    _local_spa = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]
    CORS_ALLOWED_ORIGINS = list(dict.fromkeys(list(CORS_ALLOWED_ORIGINS) + _local_spa))
    CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(list(CSRF_TRUSTED_ORIGINS) + _local_spa))

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_PRIVATE_NETWORK = True
CORS_EXPOSE_HEADERS = ['Content-Type', 'Authorization']
CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
    'x-csrftoken',
    'x-requested-with',
    'x-request-id',
    'x-branch-id',
]

# ============================================================================
# ============================================================================
# LOGGING - Structured JSON + File Logging
# ============================================================================

LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)

# JSON formatter for structured logging
class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    import json
    import traceback as tb_module
    
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'process': record.process,
            'thread': record.thread,
        }
        
        if record.exc_info:
            log_data['exception'] = self.tb_module.format_exception(*record.exc_info)
        
        return self.json.dumps(log_data)

if DJANGO_ENV == 'development':
    LOG_LEVEL = 'DEBUG'
    LOG_HANDLERS = ['console']
else:
    LOG_LEVEL = 'INFO'
    LOG_HANDLERS = ['console', 'file', 'file_alerts', 'file_requests'] if DJANGO_ENV != 'free' else ['console']

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {process:d} {thread:d} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{asctime}] {levelname} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'json': {
            '()': JSONFormatter,
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
            'level': LOG_LEVEL,
        },
    },
}

# File handlers (not on free hosting)
if DJANGO_ENV != 'free':
    # Main application log
    LOGGING['handlers']['file'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOG_DIR / 'django.log'),
        'maxBytes': 10 * 1024 * 1024,  # 10 MB
        'backupCount': 5,
        'formatter': 'verbose',
        'level': LOG_LEVEL,
    }
    
    # Alert-specific log
    LOGGING['handlers']['file_alerts'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOG_DIR / 'alerts.log'),
        'maxBytes': 5 * 1024 * 1024,  # 5 MB
        'backupCount': 10,
        'formatter': 'verbose',
        'level': 'WARNING',
    }
    
    # API request log
    LOGGING['handlers']['file_requests'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOG_DIR / 'api_requests.log'),
        'maxBytes': 50 * 1024 * 1024,  # 50 MB (requests are verbose)
        'backupCount': 3,
        'formatter': 'json',
        'level': 'INFO',
    }

LOGGING['root'] = {
    'handlers': LOG_HANDLERS,
    'level': LOG_LEVEL,
}

LOGGING['loggers'] = {
    'django': {
        'handlers': LOG_HANDLERS,
        'level': LOG_LEVEL,
        'propagate': False,
    },
    'django.request': {
        'handlers': ['console', 'file_requests'] if DJANGO_ENV != 'free' else ['console'],
        'level': 'INFO',
        'propagate': False,
    },
    'core': {
        'handlers': LOG_HANDLERS,
        'level': LOG_LEVEL,
        'propagate': False,
    },
    'core.middleware': {
        'handlers': ['console', 'file_requests'] if DJANGO_ENV != 'free' else ['console'],
        'level': 'INFO',
        'propagate': False,
    },
    'alerts': {
        'handlers': ['console', 'file_alerts'] if DJANGO_ENV != 'free' else ['console'],
        'level': 'WARNING',
        'propagate': False,
    },
}

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================

if DJANGO_ENV == 'development':
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
elif DJANGO_ENV == 'lan':
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = config(
        'EMAIL_BACKEND',
        default='django.core.mail.backends.console.EmailBackend'
    )
    EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
    EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@pharmasys.com')

# ============================================================================
# CACHING
# ============================================================================

if DJANGO_ENV == 'free' or not config('REDIS_URL', default=''):
    # Use local memory cache on free hosting or if Redis not available
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }
else:
    # Use Redis for caching
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': config('REDIS_URL', default='redis://localhost:6379/0'),
        }
    }

# ============================================================================
# CELERY (BACKGROUND TASKS)
# ============================================================================

CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes hard limit

# ============================================================================
# STORAGE & S3 (PRODUCTION ONLY)
# ============================================================================

if DJANGO_ENV == 'production' and config('USE_S3', default=False, cast=bool):
    AWS_ACCESS_KEY_ID = _require_env('AWS_ACCESS_KEY_ID', 'AWS access key for S3')
    AWS_SECRET_ACCESS_KEY = _require_env('AWS_SECRET_ACCESS_KEY', 'AWS secret key for S3')
    AWS_STORAGE_BUCKET_NAME = _require_env('AWS_STORAGE_BUCKET_NAME', 'S3 bucket name')
    AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
    AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_DEFAULT_ACL = 'public-read'
    AWS_S3_OBJECT_PARAMETERS = {
        'CacheControl': 'max-age=86400',
    }
    
    # Static files via S3
    STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
    
    # Media files via S3
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'

# ============================================================================
# SENTRY ERROR TRACKING (OPTIONAL)
# ============================================================================

SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=config('SENTRY_TRACES_SAMPLE_RATE', default=0.1, cast=float),
        send_default_pii=False,  # Don't send PII in production
        environment=DJANGO_ENV,
    )

# ============================================================================
# PHARMACY BUSINESS SETTINGS
# ============================================================================

PHARMACY_SETTINGS = {
    'LOW_STOCK_THRESHOLD': config('LOW_STOCK_THRESHOLD', default=0.2, cast=float),
    'EXPIRY_WARNING_MONTHS': config('EXPIRY_WARNING_MONTHS', default=3, cast=int),
}

PHARMACY_INFO = {
    'name': config('PHARMACY_NAME', default='LizzyMike Pharmacy'),
    'address': config('PHARMACY_ADDRESS', default=''),
    'phone': config('PHARMACY_PHONE', default=''),
    'email': config('PHARMACY_EMAIL', default=''),
    'license': config('PHARMACY_LICENSE', default=''),
}

PHARM_TAX_RATE = Decimal(config('PHARM_TAX_RATE', default='0.03'))

# ============================================================================
# MISCELLANEOUS
# ============================================================================

LOGIN_URL = '/admin/login/'
LOGOUT_URL = '/admin/logout/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

PDF_FONT_PATH = os.path.join(BASE_DIR, 'static', 'fonts')

# File upload limits
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB

# Security headers for production
if DJANGO_ENV == 'production':
    SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
    SECURE_PERMISSIONS_POLICY = {
        'camera': '()',
        'microphone': '()',
        'geolocation': '()',
    }

# Suppress GTK warnings (development)
os.environ['GIO_EXTRA_MODULES'] = ''
os.environ['GTK_PATH'] = ''

# ============================================================================
# INTERNAL IPS (FOR DEBUG TOOLBAR)
# ============================================================================

if DEBUG:
    import socket
    hostname, _, ips = socket.gethostbyname_ex(socket.gethostname())
    INTERNAL_IPS = [ip[:-1] + '1' for ip in ips] + ['127.0.0.1', '10.0.2.2']

# ============================================================================
# ENVIRONMENT SUMMARY LOG
# ============================================================================

if not DEBUG:
    logger.info(f"Django initialized in {DJANGO_ENV.upper()} environment")
    logger.info(f"DEBUG={DEBUG}, SECRET_KEY set: {bool(SECRET_KEY)}")
    logger.info(f"Database: {DATABASES['default']['ENGINE'].split('.')[-1]}")

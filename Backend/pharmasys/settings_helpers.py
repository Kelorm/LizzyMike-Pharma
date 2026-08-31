"""
Settings Validation and Helper Module

This module provides utilities for validating and managing Django settings
configuration across different environments.

Usage in settings.py:
    from pharmasys.settings_helpers import require_env, validate_settings
    
    SECRET_KEY = require_env('SECRET_KEY', 'Django secret key...')
    validate_settings()
"""

import os
from django.core.exceptions import ImproperlyConfigured
from pathlib import Path


def require_env(name: str, description: str = '', default=None):
    """
    Get an environment variable that may be required.
    
    Args:
        name: Environment variable name
        description: Human-readable description of what this variable is for
        default: Default value if variable is not set. If None, variable is required.
    
    Returns:
        The environment variable value or default
    
    Raises:
        ImproperlyConfigured: If variable is required but not set
    
    Examples:
        # Optional with default
        db_timeout = require_env('DB_TIMEOUT', default='10')
        
        # Required (will raise error if not set)
        db_password = require_env('DB_PASSWORD', 'Database password for pharma_user')
    """
    value = os.environ.get(name)
    
    if not value:
        if default is not None:
            return default
        
        # Variable is required but missing
        raise ImproperlyConfigured(
            f"\n{'='*70}\n"
            f"❌ REQUIRED ENVIRONMENT VARIABLE MISSING: {name}\n"
            f"{'='*70}\n"
            f"{description}\n"
            f"\nSet this variable in Backend/.env or as environment variable.\n"
            f"See Backend/.env.example for all required variables.\n"
            f"{'='*70}\n"
        )
    
    return value.strip()


def detect_environment():
    """
    Detect which environment this code is running in.
    
    Returns:
        str: One of 'development', 'lan', 'production', 'free'
    
    Raises:
        ImproperlyConfigured: If DJANGO_ENV is invalid
    """
    env = os.environ.get('DJANGO_ENV', 'development').lower()
    
    if env not in ('development', 'lan', 'production', 'free'):
        raise ImproperlyConfigured(
            f"Invalid DJANGO_ENV='{env}'\n"
            f"Must be one of: development, lan, production, free"
        )
    
    return env


def validate_settings(django_settings):
    """
    Validate that all critical settings are properly configured.
    
    Call this at the end of settings.py to catch configuration errors early.
    
    Args:
        django_settings: The settings object (usually 'settings' module)
    
    Raises:
        ImproperlyConfigured: If any critical setting is invalid
    
    Examples:
        # At end of settings.py
        validate_settings(sys.modules[__name__])
    """
    from django.conf import settings as django_conf_settings
    
    errors = []
    
    # Check SECRET_KEY
    if not hasattr(django_conf_settings, 'SECRET_KEY') or not django_conf_settings.SECRET_KEY:
        errors.append("SECRET_KEY is not set")
    
    # Check DATABASE
    if not hasattr(django_conf_settings, 'DATABASES') or not django_conf_settings.DATABASES:
        errors.append("DATABASES is not configured")
    
    # Check INSTALLED_APPS
    if not hasattr(django_conf_settings, 'INSTALLED_APPS'):
        errors.append("INSTALLED_APPS is not configured")
    
    # Collect any errors
    if errors:
        raise ImproperlyConfigured(
            f"Settings validation failed:\n" +
            "\n".join([f"  ❌ {err}" for err in errors])
        )


def print_settings_summary(django_settings=None):
    """
    Print a summary of current Django settings (for debugging).
    
    Args:
        django_settings: Settings object (if None, uses django.conf.settings)
    
    Example:
        # In shell or manage.py shell
        from pharmasys.settings_helpers import print_settings_summary
        print_settings_summary()
    """
    from django.conf import settings as django_conf_settings
    
    settings_obj = django_settings or django_conf_settings
    
    print("\n" + "="*70)
    print("DJANGO SETTINGS SUMMARY")
    print("="*70)
    
    print(f"\nEnvironment:")
    print(f"  DJANGO_ENV:        {os.environ.get('DJANGO_ENV', 'development')}")
    print(f"  DEBUG:             {getattr(settings_obj, 'DEBUG', 'Unknown')}")
    print(f"  SECRET_KEY set:    {bool(getattr(settings_obj, 'SECRET_KEY', None))}")
    
    print(f"\nDatabase:")
    if hasattr(settings_obj, 'DATABASES') and settings_obj.DATABASES:
        db = settings_obj.DATABASES.get('default', {})
        print(f"  ENGINE:            {db.get('ENGINE', 'Unknown').split('.')[-1]}")
        print(f"  NAME:              {db.get('NAME', 'Unknown')}")
        print(f"  USER:              {db.get('USER', 'Unknown')}")
        print(f"  HOST:              {db.get('HOST', 'Unknown')}")
    
    print(f"\nSecurity:")
    print(f"  ALLOWED_HOSTS:     {getattr(settings_obj, 'ALLOWED_HOSTS', ['localhost'])[:2]}...")
    print(f"  SECURE_SSL_REDIRECT: {getattr(settings_obj, 'SECURE_SSL_REDIRECT', False)}")
    print(f"  HSTS_SECONDS:      {getattr(settings_obj, 'SECURE_HSTS_SECONDS', 0)}")
    
    print(f"\nApps & Middleware:")
    apps = getattr(settings_obj, 'INSTALLED_APPS', [])
    print(f"  INSTALLED_APPS:    {len(apps)} apps")
    middleware = getattr(settings_obj, 'MIDDLEWARE', [])
    print(f"  MIDDLEWARE:        {len(middleware)} middleware")
    
    print(f"\nCORs:")
    cors_origins = getattr(settings_obj, 'CORS_ALLOWED_ORIGINS', [])
    if isinstance(cors_origins, (list, tuple)):
        print(f"  CORS_ALLOWED_ORIGINS: {len(cors_origins)} origins")
        for origin in cors_origins[:3]:
            print(f"    - {origin}")
    
    print(f"\nJWT:")
    jwt_config = getattr(settings_obj, 'SIMPLE_JWT', {})
    print(f"  ACCESS_TOKEN_LIFETIME:  {jwt_config.get('ACCESS_TOKEN_LIFETIME', 'Unknown')}")
    print(f"  REFRESH_TOKEN_LIFETIME: {jwt_config.get('REFRESH_TOKEN_LIFETIME', 'Unknown')}")
    
    print(f"\nStorage:")
    static_url = getattr(settings_obj, 'STATIC_URL', 'Unknown')
    media_url = getattr(settings_obj, 'MEDIA_URL', 'Unknown')
    print(f"  STATIC_URL:        {static_url}")
    print(f"  MEDIA_URL:         {media_url}")
    
    print("\n" + "="*70 + "\n")


def check_database_connection(django_settings=None):
    """
    Test database connection and report status.
    
    Returns:
        bool: True if connection successful, False otherwise
    
    Example:
        from pharmasys.settings_helpers import check_database_connection
        check_database_connection()
    """
    from django.conf import settings as django_conf_settings
    from django.db import connection, connections
    
    settings_obj = django_settings or django_conf_settings
    
    print("\n" + "="*70)
    print("DATABASE CONNECTION CHECK")
    print("="*70 + "\n")
    
    try:
        # Test default database
        conn = connections['default']
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        
        db_name = conn.settings_dict.get('NAME', 'Unknown')
        db_engine = conn.settings_dict.get('ENGINE', 'Unknown').split('.')[-1]
        db_host = conn.settings_dict.get('HOST', 'localhost')
        
        print(f"✅ Database connection successful!")
        print(f"   Engine:    {db_engine}")
        print(f"   Name:      {db_name}")
        print(f"   Host:      {db_host}")
        
        # Count tables
        tables = conn.introspection.table_names()
        print(f"   Tables:    {len(tables)}")
        
        print("\n" + "="*70 + "\n")
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed:")
        print(f"   Error: {str(e)}")
        print(f"\n   Check your Backend/.env file:")
        print(f"   - DB_NAME")
        print(f"   - DB_USER")
        print(f"   - DB_PASSWORD")
        print(f"   - DB_HOST")
        print(f"   - DB_PORT")
        print("\n" + "="*70 + "\n")
        return False


def list_environment_variables():
    """
    Print all environment variables that match Django settings.
    
    Useful for debugging configuration issues.
    
    Example:
        from pharmasys.settings_helpers import list_environment_variables
        list_environment_variables()
    """
    import os
    
    print("\n" + "="*70)
    print("ENVIRONMENT VARIABLES (Django-related)")
    print("="*70 + "\n")
    
    # List all env vars that might be relevant
    relevant_prefixes = ['DJANGO_', 'DB_', 'CORS_', 'JWT_', 'REDIS_', 'CELERY_']
    
    found = False
    for key, value in sorted(os.environ.items()):
        for prefix in relevant_prefixes:
            if key.startswith(prefix):
                # Mask sensitive values
                if any(sensitive in key for sensitive in ['PASSWORD', 'SECRET', 'KEY', 'TOKEN']):
                    display_value = '***' if value else '(empty)'
                else:
                    display_value = value if len(value) < 50 else value[:47] + '...'
                
                print(f"  {key:40s} = {display_value}")
                found = True
                break
    
    if not found:
        print("  (No Django-related environment variables found)")
        print("  Check Backend/.env or system environment variables")
    
    print("\n" + "="*70 + "\n")


# ============================================================================
# MANAGEMENT COMMAND HELPERS
# ============================================================================

def get_settings_file_path():
    """Get path to the settings file in use."""
    from django.conf import settings
    import sys
    
    # Try to get from DJANGO_SETTINGS_MODULE
    settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', 'pharmasys.settings_consolidated')
    
    # Convert module path to file path
    parts = settings_module.split('.')
    base = Path(__file__).parent.parent.parent  # Backend/
    
    for part in parts[:-1]:
        base = base / part
    
    file_path = base / f"{parts[-1]}.py"
    return file_path


# ============================================================================
# QUICK REFERENCE
# ============================================================================

ENVIRONMENT_REFERENCE = {
    'development': {
        'database': 'SQLite (local)',
        'debug': True,
        'ssl': False,
        'cors': 'Allow all',
        'typical_use': 'Local development on laptop',
    },
    'lan': {
        'database': 'PostgreSQL (local network)',
        'debug': False,
        'ssl': False,
        'cors': 'Configured for LAN IPs',
        'typical_use': 'Pharmacy network, local servers',
    },
    'production': {
        'database': 'PostgreSQL (cloud)',
        'debug': False,
        'ssl': True,
        'cors': 'Strict, specific domains',
        'typical_use': 'Public cloud (AWS, Render, Railway)',
    },
    'free': {
        'database': 'PostgreSQL (free tier)',
        'debug': False,
        'ssl': True,
        'cors': 'Strict, specific domains',
        'typical_use': 'Free hosting (Render Free, Railway Free)',
    },
}

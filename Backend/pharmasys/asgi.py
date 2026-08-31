"""
ASGI config for pharmasys project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

from pharmasys.env_loader import load_backend_env_files

load_backend_env_files()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmasys.settings_consolidated')

application = get_asgi_application()

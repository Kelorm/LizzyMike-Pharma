"""
WSGI config for pharmasys project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

from pharmasys.env_loader import load_backend_env_files

load_backend_env_files()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmasys.settings_consolidated')

application = get_wsgi_application()

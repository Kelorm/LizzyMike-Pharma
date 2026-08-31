#!/usr/bin/env python
"""
Create the Django superuser for LizzyMike Pharma.

Usage:
    Set DJANGO_SUPERUSER_PASSWORD in your environment (or .env file), then run:

        python create_superuser.py

The script will NOT embed any credentials in source code.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pharmasys.settings_consolidated')
sys.path.insert(0, os.path.dirname(__file__))

django.setup()

# ── Import the CUSTOM user model, not Django's built-in one ──────────────────
from core.models import User  # noqa: E402


def create_superuser():
    username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
    email    = os.environ.get('DJANGO_SUPERUSER_EMAIL',    'admin@lizzymike.local')
    password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')

    if not password:
        print(
            "ERROR: DJANGO_SUPERUSER_PASSWORD environment variable is not set.\n"
            "Set it before running this script:\n\n"
            "    set DJANGO_SUPERUSER_PASSWORD=YourSecurePassword123!\n"
        )
        sys.exit(1)

    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
        print(f"Superuser '{username}' already exists (id={user.id}).")
    else:
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='admin',
        )
        print(f"Superuser '{username}' created successfully.")
        print(f"  Email   : {email}")
        print(f"  Role    : admin")
        print(f"  Password: (set via DJANGO_SUPERUSER_PASSWORD env var)")


if __name__ == '__main__':
    create_superuser()

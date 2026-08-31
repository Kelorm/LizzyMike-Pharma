"""
Load Backend/.env then Backend/.env.local into os.environ (later overrides).
Used by manage.py and wsgi.py so CLI and Gunicorn see the same secrets.
"""
from __future__ import annotations

import os
from pathlib import Path


def load_backend_env_files() -> None:
    base = Path(__file__).resolve().parent.parent
    for name in ('.env', '.env.local'):
        path = base / name
        if not path.is_file():
            continue
        try:
            raw = path.read_text(encoding='utf-8-sig')
        except OSError:
            continue
        for line in raw.splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            key, _, value = line.partition('=')
            key = key.strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            os.environ[key] = value

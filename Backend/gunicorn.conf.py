# Gunicorn configuration — LizzyMike Pharma LAN server
import multiprocessing
import os
from pathlib import Path

# Resolve a writable run directory inside the project
_BASE_DIR = Path(__file__).resolve().parent
_RUN_DIR  = _BASE_DIR / 'run'
_RUN_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Server socket — loopback only; Nginx proxies to us
# ---------------------------------------------------------------------------
bind    = '127.0.0.1:8000'
backlog = 2048

# ---------------------------------------------------------------------------
# Worker processes
# ---------------------------------------------------------------------------
workers          = multiprocessing.cpu_count() * 2 + 1
worker_class     = 'sync'
worker_connections = 1000
timeout          = 30
keepalive        = 2

# Rotate workers to prevent memory leaks
max_requests        = 1000
max_requests_jitter = 50

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
accesslog = '-'
errorlog  = '-'
loglevel  = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# ---------------------------------------------------------------------------
# Process naming & PID
# ---------------------------------------------------------------------------
proc_name = 'pharmasys'

# Use a project-relative path — /tmp/ does not exist on Windows
pidfile   = str(_RUN_DIR / 'gunicorn.pid')

daemon    = False
preload_app = True
user      = None
group     = None
tmp_upload_dir = None

# ---------------------------------------------------------------------------
# SSL (uncomment if you ever switch to HTTPS on LAN)
# ---------------------------------------------------------------------------
# keyfile  = '/path/to/keyfile'
# certfile = '/path/to/certfile'

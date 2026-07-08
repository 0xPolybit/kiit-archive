"""Gunicorn configuration for KIIT Archive.

Used on Render (and any other PaaS that calls
`gunicorn -c gunicorn.conf.py app:app`).

All values can be overridden via environment variables — the host
(e.g. Render) typically sets PORT and WEB_CONCURRENCY for us.
"""

import os


# --- Network ---------------------------------------------------------------

host = os.environ.get("HOST", "0.0.0.0")
port = os.environ.get("PORT", "10000")
bind = f"{host}:{port}"


# --- Workers ---------------------------------------------------------------

# Render sets WEB_CONCURRENCY based on the instance type (1 for the
# free plan, more for paid plans). When deploying elsewhere, fall
# back to 2 workers, which comfortably fits a small Flask app within
# 512 MB of RAM.
workers = int(os.environ.get("WEB_CONCURRENCY", 2))


# --- Timeouts --------------------------------------------------------------

timeout = int(os.environ.get("GUNICORN_TIMEOUT", 120))
graceful_timeout = 30
keepalive = 5


# --- Logging ---------------------------------------------------------------

# Stream to stdout/stderr so the platform can capture logs.
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info")
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(L)s'
)


# --- Misc ------------------------------------------------------------------

proc_name = "kiit-archive"

# Don't preload — each worker parses the timetable XLSX files
# independently, which keeps the boot path uniform and avoids any
# fork-related surprises with module-level state.
preload_app = False
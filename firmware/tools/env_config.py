Import("env")

import os

name = os.environ.get("APP_NAME")
project_id = os.environ.get("APPWRITE_PROJECT_ID")
domain_suffix = os.environ.get("DOMAIN_SUFFIX")
poll_interval = os.environ.get("POLL_INTERVAL_MS", "2000")

if not name or not project_id or not domain_suffix:
    raise RuntimeError(
        "APP_NAME, APPWRITE_PROJECT_ID, and DOMAIN_SUFFIX must be exported before pio run"
    )

domain_prefix = f"{project_id}-{name}"
function_url = f"https://{domain_prefix}.functions.{domain_suffix}"
env.Append(
    CPPDEFINES=[
        ("FUNCTION_URL", env.StringifyMacro(function_url)),
        ("POLL_INTERVAL_MS", int(poll_interval)),
    ]
)

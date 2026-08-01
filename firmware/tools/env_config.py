Import("env")

import os

name = os.environ.get("APP_NAME")
domain_suffix = os.environ.get("DOMAIN_SUFFIX")
poll_interval = os.environ.get("POLL_INTERVAL_MS", "2000")

if not name or not domain_suffix:
    raise RuntimeError("APP_NAME and DOMAIN_SUFFIX must be exported before pio run")

function_url = f"https://{name}.functions.{domain_suffix}"
env.Append(
    CPPDEFINES=[
        ("FUNCTION_URL", env.StringifyMacro(function_url)),
        ("POLL_INTERVAL_MS", int(poll_interval)),
    ]
)

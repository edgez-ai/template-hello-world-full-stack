# Appwrite Function

Public HTTP API for the shared message. It supports exactly two application
methods:

- `GET /message` returns `{ "message": null }` or the newest stored message.
- `POST /message` accepts `{ "message": "world", "source": "web" }`, stores
  it, and returns the row with `echo: "Hello world"`.

`OPTIONS` is implemented for browser CORS preflight. Configure the Function's
execute access as `Any` and give its dynamic API key row read/write access.
`DATABASE_ID` and `TABLE_ID` are Appwrite project variables installed by
`infra/`. The public custom domain follows
`${APPWRITE_PROJECT_ID}-${APP_NAME}.functions.${DOMAIN_SUFFIX}`.

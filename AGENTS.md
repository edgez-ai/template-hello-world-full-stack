# Hello Channels project guide

This file is the source of project context for Codex and other coding agents.
Read it before changing this repository.

## Product

Hello Channels is a deliberately small, unauthenticated Appwrite IoT example.
A user submits a message from the web or mobile client. The Appwrite Function
stores the message and the canonical `Hello <message>` echo. Web, mobile, and
ESP32-S3 clients all poll the same Function and display the newest echo.

Authentication is intentionally out of scope. Do not add login, accounts,
sessions, or direct client access to Appwrite TablesDB unless the user changes
that requirement.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `site/` | Pure Vite + React DOM frontend. Posts as `source: "web"`. |
| `app/` | Expo + React Native Android frontend. Posts as `source: "mobile"`. |
| `function/` | Node 22 Appwrite Function and the only TablesDB reader/writer. |
| `firmware/` | PlatformIO ESP32-S3 client for an SSD1306 display. GET polling only. |
| `infra/` | Reproducible Appwrite CLI installer split by resource type. |
| `README.md` | Human setup instructions and the environment-variable contract. |

Keep these boundaries. Shared backend behavior belongs in `function/`, not in
the clients.

## HTTP contract

The public Function supports:

- `GET /message`: returns `{ "message": null }` or the newest message row.
- `POST /message`: accepts a non-empty `message` of at most 120 characters and
  `source: "web" | "mobile" | "api"`.
- `OPTIONS /message`: browser CORS preflight.

The Function creates the `echo` field. Clients must not independently format
the canonical echo. All three clients poll GET using `POLL_INTERVAL_MS`; only
web and mobile call POST. Clients never access TablesDB directly.

## Global environment contract

Configuration comes from exported environment variables, never checked-in
environment files or per-channel URLs. Required values are documented in the
root `README.md`.

The Function domain convention is:

```text
https://${APPWRITE_PROJECT_ID}-${APP_NAME}.functions.${DOMAIN_SUFFIX}
```

For `APPWRITE_PROJECT_ID=project123`, `APP_NAME=hello`, and
`DOMAIN_SUFFIX=edgez.biz`, every channel must derive
`https://project123-hello.functions.edgez.biz`. Do not add a separate Function
URL to `site/`, `app/`, or `firmware/`.

The Appwrite Site convention is
`https://${APPWRITE_PROJECT_ID}-${APP_NAME}.sites.${DOMAIN_SUFFIX}`. Site,
Function, and database resource definitions must remain in `infra/site.mjs`,
`infra/function.mjs`, and `infra/database.mjs`, respectively. Shared CLI
behavior belongs in `infra/appwrite.mjs`; orchestration belongs in
`infra/install-appwrite.mjs`.

`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, and `APPWRITE_API_KEY` configure
the local Appwrite CLI. `DATABASE_ID` and `TABLE_ID` identify TablesDB
resources and are installed as Appwrite project variables for the Function.
Never expose `APPWRITE_API_KEY` to frontend or firmware code.

## Appwrite workflow

When the Appwrite MCP is available, prefer it for inspecting current remote
state and interactive troubleshooting. The reproducible project installation
is still the CLI workflow in `infra/`:

```sh
cd infra
npm install
npm run install:project
```

The installer configures the local CLI from environment variables, then
idempotently creates or updates the database, messages table, project
variables, public Node 22 Function, React web Site, deployments, and
both conventional proxy rules. DNS must point both domains at the targets
Appwrite reports.

The installer changes remote state. Do not run it merely to test local code;
run `npm run check` for local validation. Only run remote installation when the
user asks to provision or update Appwrite.

## Validation

Use the same exported environment for every command.

- Web: `cd site && npm run typecheck && npm run build`
- Mobile: `cd app && npm run typecheck`
- Function: `cd function && npm run check`
- Infrastructure: `cd infra && npm run check`
- Firmware: create ignored `firmware/include/secrets.h`, then
  `cd firmware && pio run`

Do not commit `.env`, Appwrite keys, Wi-Fi credentials, `node_modules/`,
`dist/`, or `.pio/`.

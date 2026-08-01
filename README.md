# Hello Channels

A deliberately small Appwrite + React Native + ESP32-S3 full-stack example.
Type a message in the web or mobile client and every client displays the same
server-generated echo:

```text
Hello <your message>
```

There is no login. The Appwrite Function is public and is the only component
allowed to read or write the database table.

## Repository layout

| Folder | Purpose |
| --- | --- |
| `site/` | Pure Vite + React web frontend |
| `app/` | Expo + React Native Android frontend |
| `function/` | Public Appwrite Function with `GET /message` and `POST /message` |
| `firmware/` | PlatformIO ESP32-S3 firmware for a 128x64 SSD1306 display |
| `infra/` | Rerunnable Appwrite CLI project installer |

Open `hello-channels.code-workspace` in VS Code to work on all five folders.

## Data flow

1. Web or mobile sends `{ "message": "world", "source": "web|mobile" }`
   to `POST /message` on the Appwrite Function domain.
2. The Function writes `message`, `echo`, and `source` to the Appwrite
   `${DATABASE_ID}/${TABLE_ID}` table and returns the created row.
3. Web, mobile, and ESP32-S3 poll `GET /message` every two seconds.
4. Each channel renders the latest `echo`, for example `Hello world`.

## Environment

The managed IoT Dashboard workspace injects these values into the Jupyter user
pod when it starts:

```sh
APP_NAME=<workspace-name>
DOMAIN_SUFFIX=edgez.biz
APPWRITE_ENDPOINT=<workspace-appwrite-endpoint>
APPWRITE_PROJECT_ID=<selected-project-id>
APPWRITE_API_KEY=<workspace-scoped-server-api-key>
```

The repository's committed `.env.local` defines `DATABASE_ID`, `TABLE_ID`,
and `POLL_INTERVAL_MS`. Export it once in each new terminal before running
infrastructure, Expo, Vite, or PlatformIO:

```sh
set -a
. ./.env.local
set +a
```

Outside an IoT Dashboard workspace, also export the five injected values shown
above yourself. Change `.env.local` to select different database/table IDs or
polling interval; it contains no credentials.

The public domain prefix is `${APPWRITE_PROJECT_ID}-${APP_NAME}`. With
`APPWRITE_PROJECT_ID=project123`, `APP_NAME=hello`, and
`DOMAIN_SUFFIX=edgez.biz`, every channel derives the shared Function base URL
as `https://project123-hello.functions.edgez.biz`; no channel has its own URL
setting. The hosted React site follows the parallel convention
`https://project123-hello.sites.edgez.biz`.
`APPWRITE_API_KEY` is needed only by `infra/` and must not be exposed to a
frontend. `POLL_INTERVAL_MS` is optional and defaults to `2000`.

## Appwrite setup

1. Create an Appwrite project and an API key with sufficient database,
   Function, project-variable, and proxy-rule access.
2. Export the variables above. From `infra/`, run
   `npm install && npm run install:project`. The local Appwrite CLI
   creates the table, public Function, web Site, deployments, project
   variables, and conventional proxy rules from the exported values.
3. Complete the DNS verification requested by Appwrite for the Function and
   Site custom domains.

Because this example intentionally has no authentication, anyone who knows the
Function URL can read and submit messages. Add rate limiting, moderation, and
authentication before using this pattern for a public production service.

## Run clients

- Web: `cd site && npm install && npm run web`
- Android: `cd app && npm install && npm run android`
- Firmware: copy `firmware/include/secrets.example.h` to `secrets.h`, edit it,
  then run `pio run -d firmware --target upload`. The Function URL is injected
  from `APPWRITE_PROJECT_ID`, `APP_NAME`, and `DOMAIN_SUFFIX` during the build.

The firmware defaults to an external SSD1306 128x64 I2C display on SDA 8 and
SCL 9. Override `DISPLAY_SDA`, `DISPLAY_SCL`, or the U8g2 constructor for your
specific ESP32-S3 display board.

This repository is intended as a reusable full-stack boilerplate covering web,
mobile, backend Function, database infrastructure, and device firmware.

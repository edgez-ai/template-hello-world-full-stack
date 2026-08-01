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
| `site/` | Expo / React Native Web frontend |
| `app/` | Expo / React Native iOS and Android frontend |
| `function/` | Public Appwrite Function with `GET /message` and `POST /message` |
| `firmware/` | PlatformIO ESP32-S3 firmware for a 128x64 SSD1306 display |
| `infra/` | Rerunnable Appwrite database/table initializer |

Open `hello-channels.code-workspace` in VS Code to work on all five folders.

## Data flow

1. Web or mobile sends `{ "message": "world", "source": "web|mobile" }`
   to `POST /message` on the Appwrite Function domain.
2. The Function writes `message`, `echo`, and `source` to the Appwrite
   `hello-world/messages` table and returns the created row.
3. Web, mobile, and ESP32-S3 poll `GET /message` every two seconds.
4. Each channel renders the latest `echo`, for example `Hello world`.

## Environment

Export the same environment before running infrastructure, Expo, or PlatformIO:

```sh
export APP_NAME=hello
export DOMAIN_SUFFIX=edgez.biz
export POLL_INTERVAL_MS=2000

export APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
export APPWRITE_PROJECT_ID=<project-id>
export APPWRITE_API_KEY=<server-api-key>
export APPWRITE_DATABASE_ID=hello-world
export APPWRITE_TABLE_ID=messages
```

`APP_NAME` is the global naming prefix. `APP_NAME=hello` and
`DOMAIN_SUFFIX=edgez.biz` always derive the shared Function base URL as
`https://hello.functions.edgez.biz`; no channel has its own URL setting.
`APPWRITE_API_KEY` is needed only by `infra/` and must not be exposed to a
frontend. `POLL_INTERVAL_MS` is optional and defaults to `2000`.

## Appwrite setup

1. Create an Appwrite project and an API key with database/table management
   scopes. Export the variables above, then run `npm install && npm run init`
   from `infra/`.
2. Create a Node.js Appwrite Function using `function/`, with entrypoint
   `src/main.js`. Give its dynamic API key row read/write access.
3. Set the Function variables `APPWRITE_DATABASE_ID` and `APPWRITE_TABLE_ID`.
4. Set Function execute access to **Any**, deploy it, and configure the custom
   domain `${APP_NAME}.functions.${DOMAIN_SUFFIX}` in Appwrite and DNS.

Because this example intentionally has no authentication, anyone who knows the
Function URL can read and submit messages. Add rate limiting, moderation, and
authentication before using this pattern for a public production service.

## Run clients

- Web: `cd site && npm install && npm run web`
- Mobile: `cd app && npm install && npm run android` (or `npm run ios`)
- Firmware: copy `firmware/include/secrets.example.h` to `secrets.h`, edit it,
  then run `pio run -d firmware --target upload`. The Function URL is injected
  from `APP_NAME` and `DOMAIN_SUFFIX` during the build.

The firmware defaults to an external SSD1306 128x64 I2C display on SDA 8 and
SCL 9. Override `DISPLAY_SDA`, `DISPLAY_SCL`, or the U8g2 constructor for your
specific ESP32-S3 display board.

this is a boilerplate for all template to cover all features

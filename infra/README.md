# Appwrite infrastructure

Ensure the IoT Dashboard workspace variables documented in the root README are
present, then run:

```sh
npm install
npm run deploy
```

The deploy command automatically loads `../.env.local` for `DATABASE_ID`,
`TABLE_ID`, and `POLL_INTERVAL_MS`. Existing process variables take precedence,
so the Jupyter pod's `APP_NAME`, `DOMAIN_SUFFIX`, and Appwrite connection values
remain authoritative. It maps these inputs to namespaced `HELLO_CHANNELS_*`
Appwrite resource variables before deploying the Function and Site. This keeps
the root environment contract unchanged while avoiding collisions with
same-named Appwrite project-global variables.
If an older deployment still has a conflicting non-secret global, the installer
migrates that key to the intended Function or Site scope. Secret globals must be
removed manually to avoid deleting an unknown secret automatically.

The installer uses the locally installed Appwrite CLI and is rerunnable. It
delegates resources to separate modules:

- `database.mjs` installs the database, table, and columns.
- `function.mjs` installs and deploys the public Function at
  `${APPWRITE_PROJECT_NAME}-${APP_NAME}.functions.${DOMAIN_SUFFIX}`.
- `site.mjs` installs and deploys the React web site at
  `${APPWRITE_PROJECT_NAME}-${APP_NAME}.sites.${DOMAIN_SUFFIX}`.
- `appwrite.mjs` contains only shared CLI/configuration helpers.
- `install-appwrite.mjs` is the small orchestrator.

The Appwrite CLI honors the deployment directory's `.gitignore`; both `site/`
and `function/` exclude local `node_modules/` so the remote builders install
dependencies instead of receiving the local dependency trees.

The API key is used only by the local CLI and must never be added to a frontend.
Run `INFRA_DRY_RUN=1 npm run deploy` to inspect commands without
changing Appwrite.

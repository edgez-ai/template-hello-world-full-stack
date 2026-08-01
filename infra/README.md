# Appwrite infrastructure

Export the variables documented in the root README, then run:

```sh
npm install
npm run install:project
```

The installer uses the locally installed Appwrite CLI and is rerunnable. It
configures the CLI from environment variables and delegates resources to
separate modules:

- `database.mjs` installs the database, table, and columns.
- `function.mjs` installs and deploys the public Function at
  `${APPWRITE_PROJECT_ID}-${APP_NAME}.functions.${DOMAIN_SUFFIX}`.
- `site.mjs` installs and deploys the React web site at
  `${APPWRITE_PROJECT_ID}-${APP_NAME}.sites.${DOMAIN_SUFFIX}`.
- `appwrite.mjs` contains only shared CLI/configuration helpers.
- `install-appwrite.mjs` is the small orchestrator.

The API key is used only by the local CLI and must never be added to a frontend.
Run `INFRA_DRY_RUN=1 npm run install:project` to inspect commands without
changing Appwrite.

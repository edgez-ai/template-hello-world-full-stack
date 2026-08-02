# React web site

This is a frontend-only Vite + React DOM project. It polls the public Appwrite
Function and posts messages with `source: "web"`.

Export the root README environment, then run `npm install && npm run web`.
The Function URL is derived from `APPWRITE_PROJECT_NAME`, `APP_NAME`, and
`DOMAIN_SUFFIX`. Run `npm run build` to export a static site.

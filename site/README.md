# React Native Web site

This is a frontend-only Expo / React Native Web project. It polls the public
Appwrite Function every two seconds and posts messages with `source: "web"`.

Export the root README environment, then run `npm install && npm run web`.
The Function URL is derived from `APP_NAME` and `DOMAIN_SUFFIX`. Run
`npm run build` to export a static site.

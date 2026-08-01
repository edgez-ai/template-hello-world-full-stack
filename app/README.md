# React Native mobile app

Expo React Native client for Android. It polls the public Appwrite
Function every two seconds and posts messages with `source: "mobile"`.

Export the root README environment, then run `npm install && npm run android`.
The Function URL is derived from `APPWRITE_PROJECT_ID`, `APP_NAME`, and
`DOMAIN_SUFFIX`.

# React Native mobile app

Expo React Native client for iOS and Android. It polls the public Appwrite
Function every two seconds and posts messages with `source: "mobile"`.

Export the root README environment, then run `npm install && npm run android`
or `npm run ios`. The Function URL is derived from `APP_NAME` and
`DOMAIN_SUFFIX`.

# React Native mobile app

Expo React Native client for Android. It polls the public Appwrite
Function every two seconds and posts messages with `source: "mobile"`.

Export the root README environment, then run `npm install && npm run android`.
The Function URL is derived from `APPWRITE_PROJECT_ID`, `APP_NAME`, and
`DOMAIN_SUFFIX`.

To start Metro on localhost and explicitly open the project in Expo Go on the
remote Android device at `127.0.0.1:5555`, run `npm run android:remote`.
Override the defaults with `ANDROID_SERIAL` or `EXPO_PORT` when needed.

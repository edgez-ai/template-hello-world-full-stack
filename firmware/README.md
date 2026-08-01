# ESP32-S3 display client

This read-only client polls `GET /message` every two seconds and shows the
latest `echo` on a 128x64 SSD1306 I2C display.

Copy `include/secrets.example.h` to `include/secrets.h` and set Wi-Fi. Export
the root README environment, then upload with PlatformIO. The Function URL is
derived during the build. The default target is an ESP32-S3 DevKitC-1 with SDA
8 and SCL 9. Integrated-display boards may require a different PlatformIO
board, pins, and U8g2 display constructor.

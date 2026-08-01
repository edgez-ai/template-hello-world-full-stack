#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <U8g2lib.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copy include/secrets.example.h to include/secrets.h and configure it"
#endif

#ifndef DISPLAY_SDA
#define DISPLAY_SDA 8
#endif

#ifndef DISPLAY_SCL
#define DISPLAY_SCL 9
#endif

#ifndef POLL_INTERVAL_MS
#define POLL_INTERVAL_MS 2000
#endif

namespace {
constexpr unsigned long kPollIntervalMs = POLL_INTERVAL_MS;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);
unsigned long lastPollAt = 0;
String lastEcho;

String endpoint() {
  String url = FUNCTION_URL;
  while (url.endsWith("/")) url.remove(url.length() - 1);
  return url + "/message";
}

void drawWrapped(const String &text) {
  display.clearBuffer();
  display.setFont(u8g2_font_6x12_tf);
  display.drawStr(0, 10, "HELLO CHANNELS");
  display.drawHLine(0, 14, 128);

  constexpr int charsPerLine = 20;
  int y = 29;
  for (size_t start = 0; start < text.length() && y <= 61;
       start += charsPerLine, y += 12) {
    String line = text.substring(start, min(start + charsPerLine, text.length()));
    display.drawUTF8(0, y, line.c_str());
  }
  display.sendBuffer();
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  drawWrapped("Connecting to Wi-Fi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int attempt = 0; attempt < 30 && WiFi.status() != WL_CONNECTED; ++attempt) {
    delay(500);
  }
  return WiFi.status() == WL_CONNECTED;
}

void fetchLatestMessage() {
  if (!connectWifi()) {
    drawWrapped("Wi-Fi unavailable");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, endpoint())) return;
  const int status = http.GET();
  const String body = status > 0 ? http.getString() : "";
  http.end();

  if (status != 200) {
    drawWrapped("Function error " + String(status));
    return;
  }

  JsonDocument document;
  if (deserializeJson(document, body)) {
    drawWrapped("Invalid response");
    return;
  }

  const char *echo = document["message"]["echo"] | "Send a message...";
  if (lastEcho != echo) {
    lastEcho = echo;
    drawWrapped(lastEcho);
    Serial.println(lastEcho);
  }
}
}  // namespace

void setup() {
  Serial.begin(115200);
  Wire.begin(DISPLAY_SDA, DISPLAY_SCL);
  display.begin();
  drawWrapped("Starting...");
  connectWifi();
  fetchLatestMessage();
}

void loop() {
  if (millis() - lastPollAt >= kPollIntervalMs) {
    lastPollAt = millis();
    fetchLatestMessage();
  }
  delay(10);
}

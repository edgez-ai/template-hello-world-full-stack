#include "display.h"

#include <ctype.h>
#include <stdint.h>
#include <string.h>

#include "driver/gpio.h"
#include "driver/i2c.h"
#include "esp_check.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

namespace {
constexpr i2c_port_t kI2cPort = I2C_NUM_0;
constexpr gpio_num_t kSda = GPIO_NUM_17;
constexpr gpio_num_t kScl = GPIO_NUM_18;
constexpr gpio_num_t kReset = GPIO_NUM_21;
constexpr gpio_num_t kVext = GPIO_NUM_36;
constexpr uint8_t kAddress = 0x3c;
constexpr int kWidth = 128;
constexpr int kHeight = 64;
constexpr int kPages = kHeight / 8;

uint8_t framebuffer[kWidth * kPages];
SemaphoreHandle_t display_mutex;

esp_err_t send_command(const uint8_t *commands, size_t length) {
  uint8_t buffer[32] = {0};
  if (length + 1 > sizeof(buffer)) return ESP_ERR_INVALID_SIZE;
  memcpy(buffer + 1, commands, length);
  return i2c_master_write_to_device(kI2cPort, kAddress, buffer, length + 1,
                                    pdMS_TO_TICKS(100));
}

esp_err_t flush() {
  const uint8_t window[] = {0x21, 0, kWidth - 1, 0x22, 0, kPages - 1};
  esp_err_t error = send_command(window, sizeof(window));
  if (error != ESP_OK) return error;

  uint8_t packet[17];
  packet[0] = 0x40;
  for (size_t offset = 0; offset < sizeof(framebuffer); offset += 16) {
    memcpy(packet + 1, framebuffer + offset, 16);
    error = i2c_master_write_to_device(kI2cPort, kAddress, packet,
                                       sizeof(packet), pdMS_TO_TICKS(100));
    if (error != ESP_OK) return error;
  }
  return ESP_OK;
}

void glyph(char character, uint8_t out[5]) {
  memset(out, 0, 5);
  const char c = static_cast<char>(toupper(static_cast<unsigned char>(character)));
#define GLYPH(value, a, b, c, d, e) \
  case value:                         \
    out[0] = a;                       \
    out[1] = b;                       \
    out[2] = c;                       \
    out[3] = d;                       \
    out[4] = e;                       \
    break
  switch (c) {
    GLYPH('A', 0x7e, 0x11, 0x11, 0x11, 0x7e);
    GLYPH('B', 0x7f, 0x49, 0x49, 0x49, 0x36);
    GLYPH('C', 0x3e, 0x41, 0x41, 0x41, 0x22);
    GLYPH('D', 0x7f, 0x41, 0x41, 0x22, 0x1c);
    GLYPH('E', 0x7f, 0x49, 0x49, 0x49, 0x41);
    GLYPH('F', 0x7f, 0x09, 0x09, 0x09, 0x01);
    GLYPH('G', 0x3e, 0x41, 0x49, 0x49, 0x7a);
    GLYPH('H', 0x7f, 0x08, 0x08, 0x08, 0x7f);
    GLYPH('I', 0x00, 0x41, 0x7f, 0x41, 0x00);
    GLYPH('J', 0x20, 0x40, 0x41, 0x3f, 0x01);
    GLYPH('K', 0x7f, 0x08, 0x14, 0x22, 0x41);
    GLYPH('L', 0x7f, 0x40, 0x40, 0x40, 0x40);
    GLYPH('M', 0x7f, 0x02, 0x0c, 0x02, 0x7f);
    GLYPH('N', 0x7f, 0x04, 0x08, 0x10, 0x7f);
    GLYPH('O', 0x3e, 0x41, 0x41, 0x41, 0x3e);
    GLYPH('P', 0x7f, 0x09, 0x09, 0x09, 0x06);
    GLYPH('Q', 0x3e, 0x41, 0x51, 0x21, 0x5e);
    GLYPH('R', 0x7f, 0x09, 0x19, 0x29, 0x46);
    GLYPH('S', 0x46, 0x49, 0x49, 0x49, 0x31);
    GLYPH('T', 0x01, 0x01, 0x7f, 0x01, 0x01);
    GLYPH('U', 0x3f, 0x40, 0x40, 0x40, 0x3f);
    GLYPH('V', 0x1f, 0x20, 0x40, 0x20, 0x1f);
    GLYPH('W', 0x3f, 0x40, 0x38, 0x40, 0x3f);
    GLYPH('X', 0x63, 0x14, 0x08, 0x14, 0x63);
    GLYPH('Y', 0x07, 0x08, 0x70, 0x08, 0x07);
    GLYPH('Z', 0x61, 0x51, 0x49, 0x45, 0x43);
    GLYPH('0', 0x3e, 0x51, 0x49, 0x45, 0x3e);
    GLYPH('1', 0x00, 0x42, 0x7f, 0x40, 0x00);
    GLYPH('2', 0x42, 0x61, 0x51, 0x49, 0x46);
    GLYPH('3', 0x21, 0x41, 0x45, 0x4b, 0x31);
    GLYPH('4', 0x18, 0x14, 0x12, 0x7f, 0x10);
    GLYPH('5', 0x27, 0x45, 0x45, 0x45, 0x39);
    GLYPH('6', 0x3c, 0x4a, 0x49, 0x49, 0x30);
    GLYPH('7', 0x01, 0x71, 0x09, 0x05, 0x03);
    GLYPH('8', 0x36, 0x49, 0x49, 0x49, 0x36);
    GLYPH('9', 0x06, 0x49, 0x49, 0x29, 0x1e);
    GLYPH('-', 0x08, 0x08, 0x08, 0x08, 0x08);
    GLYPH('_', 0x40, 0x40, 0x40, 0x40, 0x40);
    GLYPH('.', 0x00, 0x60, 0x60, 0x00, 0x00);
    GLYPH(':', 0x00, 0x36, 0x36, 0x00, 0x00);
    GLYPH('/', 0x20, 0x10, 0x08, 0x04, 0x02);
    GLYPH('!', 0x00, 0x00, 0x5f, 0x00, 0x00);
    GLYPH('?', 0x02, 0x01, 0x51, 0x09, 0x06);
    GLYPH(' ', 0, 0, 0, 0, 0);
    default:
      glyph('?', out);
      break;
  }
#undef GLYPH
}

void draw_character(int x, int y, char character) {
  uint8_t columns[5];
  glyph(character, columns);
  for (int column = 0; column < 5; ++column) {
    for (int row = 0; row < 7; ++row) {
      if ((columns[column] & (1 << row)) == 0) continue;
      const int pixel_x = x + column;
      const int pixel_y = y + row;
      if (pixel_x < 0 || pixel_x >= kWidth || pixel_y < 0 || pixel_y >= kHeight)
        continue;
      framebuffer[pixel_x + (pixel_y / 8) * kWidth] |= 1 << (pixel_y % 8);
    }
  }
}

void draw_text(int x, int y, const char *text, size_t max_characters) {
  for (size_t index = 0; text[index] && index < max_characters; ++index) {
    draw_character(x + static_cast<int>(index) * 6, y, text[index]);
  }
}

void draw_wrapped(const char *message) {
  constexpr size_t kCharactersPerLine = 21;
  size_t position = 0;
  for (int line = 0; line < 5 && message[position]; ++line) {
    while (message[position] == ' ') ++position;
    char row[kCharactersPerLine + 1] = {0};
    size_t length = 0;
    while (message[position] && message[position] != '\n' &&
           length < kCharactersPerLine) {
      row[length++] = message[position++];
    }
    if (message[position] == '\n') ++position;
    draw_text(0, 17 + line * 9, row, kCharactersPerLine);
  }
}
}  // namespace

esp_err_t display_init() {
  gpio_set_direction(kVext, GPIO_MODE_OUTPUT);
  gpio_set_level(kVext, 0);
  gpio_set_direction(kReset, GPIO_MODE_OUTPUT);
  gpio_set_level(kReset, 0);
  vTaskDelay(pdMS_TO_TICKS(10));
  gpio_set_level(kReset, 1);
  vTaskDelay(pdMS_TO_TICKS(10));

  i2c_config_t config{};
  config.mode = I2C_MODE_MASTER;
  config.sda_io_num = kSda;
  config.scl_io_num = kScl;
  config.sda_pullup_en = GPIO_PULLUP_ENABLE;
  config.scl_pullup_en = GPIO_PULLUP_ENABLE;
  config.master.clk_speed = 400000;
  config.clk_flags = 0;
  ESP_ERROR_CHECK(i2c_param_config(kI2cPort, &config));
  ESP_ERROR_CHECK(i2c_driver_install(kI2cPort, config.mode, 0, 0, 0));

  const uint8_t init[] = {0xae, 0xd5, 0x80, 0xa8, 0x3f, 0xd3, 0x00, 0x40,
                          0x8d, 0x14, 0x20, 0x00, 0xa1, 0xc8, 0xda, 0x12,
                          0x81, 0xcf, 0xd9, 0xf1, 0xdb, 0x40, 0xa4, 0xa6,
                          0xaf};
  display_mutex = xSemaphoreCreateMutex();
  if (!display_mutex) return ESP_ERR_NO_MEM;
  memset(framebuffer, 0, sizeof(framebuffer));
  ESP_RETURN_ON_ERROR(send_command(init, sizeof(init)), "display", "OLED init failed");
  return flush();
}

void display_show(const char *title, const char *message) {
  if (!display_mutex || xSemaphoreTake(display_mutex, pdMS_TO_TICKS(250)) != pdTRUE)
    return;
  memset(framebuffer, 0, sizeof(framebuffer));
  draw_text(0, 0, title ? title : "HELLO CHANNELS", 21);
  memset(framebuffer + kWidth, 0xff, kWidth);
  draw_wrapped(message ? message : "");
  flush();
  xSemaphoreGive(display_mutex);
}

#include <stdio.h>
#include <string.h>

#include "cJSON.h"
#include "display.h"
#include "esp_crt_bundle.h"
#include "esp_event.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_netif.h"
#include "esp_wifi.h"
#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"
#include "nvs_flash.h"
#include "wifi_provisioning/manager.h"
#include "wifi_provisioning/scheme_ble.h"

#ifndef FUNCTION_URL
#error "FUNCTION_URL must be injected by tools/env_config.py"
#endif
#ifndef POLL_INTERVAL_MS
#define POLL_INTERVAL_MS 2000
#endif

namespace {
constexpr EventBits_t kWifiConnected = BIT0;
constexpr char kTag[] = "hello-channels";
constexpr char kFunctionEndpoint[] = FUNCTION_URL "/message";
constexpr size_t kResponseCapacity = 2048;

EventGroupHandle_t wifi_events;
bool provisioning_active = false;
char provisioning_name[16]{};
char provisioning_pop[16]{};
char last_echo[512]{};

struct HttpResponse {
  char data[kResponseCapacity];
  size_t length;
};

void make_provisioning_identity() {
  uint8_t mac[6];
  ESP_ERROR_CHECK(esp_read_mac(mac, ESP_MAC_WIFI_STA));
  snprintf(provisioning_name, sizeof(provisioning_name), "HC_%02X%02X%02X",
           mac[3], mac[4], mac[5]);
  snprintf(provisioning_pop, sizeof(provisioning_pop), "hc-%02x%02x%02x",
           mac[3], mac[4], mac[5]);
}

void wifi_start_station() {
  ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
  ESP_ERROR_CHECK(esp_wifi_start());
}

void event_handler(void *, esp_event_base_t event_base, int32_t event_id,
                   void *event_data) {
  if (event_base == WIFI_PROV_EVENT) {
    switch (event_id) {
      case WIFI_PROV_START:
        ESP_LOGI(kTag, "BLE Wi-Fi provisioning started as %s", provisioning_name);
        break;
      case WIFI_PROV_CRED_RECV: {
        const auto *config = static_cast<wifi_sta_config_t *>(event_data);
        ESP_LOGI(kTag, "Received credentials for SSID: %s", config->ssid);
        display_show("HELLO CHANNELS", "CONNECTING TO WI-FI");
        break;
      }
      case WIFI_PROV_CRED_FAIL: {
        const auto reason = *static_cast<wifi_prov_sta_fail_reason_t *>(event_data);
        const char *message = reason == WIFI_PROV_STA_AUTH_ERROR
                                  ? "WRONG WI-FI PASSWORD - RETRY"
                                  : "WI-FI NETWORK NOT FOUND - RETRY";
        ESP_LOGW(kTag, "%s", message);
        display_show("PROVISION FAILED", message);
        wifi_prov_mgr_reset_sm_state_on_failure();
        break;
      }
      case WIFI_PROV_CRED_SUCCESS:
        ESP_LOGI(kTag, "Wi-Fi provisioning succeeded");
        display_show("HELLO CHANNELS", "WI-FI PROVISIONED");
        break;
      case WIFI_PROV_END:
        provisioning_active = false;
        wifi_prov_mgr_deinit();
        break;
      default:
        break;
    }
    return;
  }

  if (event_base == WIFI_EVENT) {
    if (event_id == WIFI_EVENT_STA_START && !provisioning_active) {
      esp_wifi_connect();
    } else if (event_id == WIFI_EVENT_STA_DISCONNECTED) {
      xEventGroupClearBits(wifi_events, kWifiConnected);
      if (!provisioning_active) {
        ESP_LOGW(kTag, "Wi-Fi disconnected; reconnecting");
        esp_wifi_connect();
      }
    }
    return;
  }

  if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
    const auto *event = static_cast<ip_event_got_ip_t *>(event_data);
    ESP_LOGI(kTag, "Wi-Fi connected: " IPSTR, IP2STR(&event->ip_info.ip));
    xEventGroupSetBits(wifi_events, kWifiConnected);
    display_show("HELLO CHANNELS", "WI-FI CONNECTED - FETCHING MESSAGE");
  }
}

esp_err_t http_event_handler(esp_http_client_event_t *event) {
  auto *response = static_cast<HttpResponse *>(event->user_data);
  if (event->event_id == HTTP_EVENT_ON_DATA && event->data_len > 0) {
    const size_t available = sizeof(response->data) - response->length - 1;
    const size_t copy_length =
        event->data_len < available ? event->data_len : available;
    memcpy(response->data + response->length, event->data, copy_length);
    response->length += copy_length;
    response->data[response->length] = '\0';
  }
  return ESP_OK;
}

void fetch_latest_message() {
  HttpResponse response{};
  esp_http_client_config_t config{};
  config.url = kFunctionEndpoint;
  config.method = HTTP_METHOD_GET;
  config.event_handler = http_event_handler;
  config.user_data = &response;
  config.timeout_ms = 10000;
  config.crt_bundle_attach = esp_crt_bundle_attach;

  esp_http_client_handle_t client = esp_http_client_init(&config);
  if (!client) {
    display_show("FUNCTION ERROR", "COULD NOT CREATE HTTPS CLIENT");
    return;
  }

  const esp_err_t result = esp_http_client_perform(client);
  const int status = esp_http_client_get_status_code(client);
  esp_http_client_cleanup(client);
  if (result != ESP_OK || status != 200) {
    ESP_LOGW(kTag, "Function request failed: %s, HTTP %d",
             esp_err_to_name(result), status);
    char message[48];
    snprintf(message, sizeof(message), "FUNCTION REQUEST FAILED HTTP %d", status);
    display_show("FUNCTION ERROR", message);
    return;
  }

  cJSON *root = cJSON_Parse(response.data);
  cJSON *message = root ? cJSON_GetObjectItemCaseSensitive(root, "message") : nullptr;
  cJSON *echo = cJSON_IsObject(message)
                    ? cJSON_GetObjectItemCaseSensitive(message, "echo")
                    : nullptr;
  const char *value = cJSON_IsString(echo) ? echo->valuestring : "SEND A MESSAGE";
  if (strncmp(last_echo, value, sizeof(last_echo)) != 0) {
    strlcpy(last_echo, value, sizeof(last_echo));
    ESP_LOGI(kTag, "Latest echo: %s", last_echo);
    display_show("HELLO CHANNELS", last_echo);
  }
  cJSON_Delete(root);
}

void polling_task(void *) {
  while (true) {
    const EventBits_t bits = xEventGroupWaitBits(
        wifi_events, kWifiConnected, pdFALSE, pdTRUE, portMAX_DELAY);
    if (bits & kWifiConnected) fetch_latest_message();
    vTaskDelay(pdMS_TO_TICKS(POLL_INTERVAL_MS));
  }
}

void initialize_nvs() {
  esp_err_t result = nvs_flash_init();
  if (result == ESP_ERR_NVS_NO_FREE_PAGES ||
      result == ESP_ERR_NVS_NEW_VERSION_FOUND) {
    ESP_ERROR_CHECK(nvs_flash_erase());
    result = nvs_flash_init();
  }
  ESP_ERROR_CHECK(result);
}
}  // namespace

extern "C" void app_main() {
  ESP_ERROR_CHECK(display_init());
  display_show("HELLO CHANNELS", "STARTING");
  initialize_nvs();
  ESP_ERROR_CHECK(esp_netif_init());
  ESP_ERROR_CHECK(esp_event_loop_create_default());
  wifi_events = xEventGroupCreate();
  ESP_ERROR_CHECK(wifi_events ? ESP_OK : ESP_ERR_NO_MEM);

  ESP_ERROR_CHECK(esp_event_handler_register(
      WIFI_PROV_EVENT, ESP_EVENT_ANY_ID, event_handler, nullptr));
  ESP_ERROR_CHECK(esp_event_handler_register(
      WIFI_EVENT, ESP_EVENT_ANY_ID, event_handler, nullptr));
  ESP_ERROR_CHECK(esp_event_handler_register(
      IP_EVENT, IP_EVENT_STA_GOT_IP, event_handler, nullptr));

  esp_netif_create_default_wifi_sta();
  wifi_init_config_t wifi_config = WIFI_INIT_CONFIG_DEFAULT();
  ESP_ERROR_CHECK(esp_wifi_init(&wifi_config));

  wifi_prov_mgr_config_t provisioning_config{};
  provisioning_config.scheme = wifi_prov_scheme_ble;
  provisioning_config.scheme_event_handler =
      WIFI_PROV_SCHEME_BLE_EVENT_HANDLER_FREE_BTDM;
  ESP_ERROR_CHECK(wifi_prov_mgr_init(provisioning_config));

  bool provisioned = false;
  ESP_ERROR_CHECK(wifi_prov_mgr_is_provisioned(&provisioned));
  if (provisioned) {
    ESP_LOGI(kTag, "Stored Wi-Fi credentials found");
    wifi_prov_mgr_deinit();
    wifi_start_station();
  } else {
    provisioning_active = true;
    make_provisioning_identity();
    char instructions[80];
    snprintf(instructions, sizeof(instructions), "PAIR %s POP %s",
             provisioning_name, provisioning_pop);
    display_show("PROVISION WI-FI", instructions);
    ESP_LOGI(kTag, "Provision with BLE device %s and PoP %s",
             provisioning_name, provisioning_pop);
    ESP_ERROR_CHECK(wifi_prov_mgr_start_provisioning(
        WIFI_PROV_SECURITY_1, provisioning_pop, provisioning_name, nullptr));
  }

  BaseType_t created = xTaskCreate(polling_task, "message-poll", 8192, nullptr,
                                   5, nullptr);
  ESP_ERROR_CHECK(created == pdPASS ? ESP_OK : ESP_ERR_NO_MEM);
}

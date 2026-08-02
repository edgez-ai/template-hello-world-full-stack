idf_component_register(
  SRCS "main.cpp" "display.cpp"
  INCLUDE_DIRS "."
  REQUIRES
    bt
    driver
    esp_event
    esp_http_client
    esp_netif
    esp_wifi
    json
    mbedtls
    nvs_flash
    protocomm
    u8g2
    wifi_provisioning
)

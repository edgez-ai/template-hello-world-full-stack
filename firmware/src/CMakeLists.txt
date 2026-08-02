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
    wifi_provisioning
)

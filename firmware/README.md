# Heltec WiFi LoRa 32 V3 firmware

This is a native ESP-IDF firmware project built through PlatformIO. The Heltec
independently polls `GET /message` and shows the latest server-generated `echo`
on its onboard 128x64 SSD1306 display. BLE is used only to provision Wi-Fi.

## Build and upload

Export the root project environment so `FUNCTION_URL` and `POLL_INTERVAL_MS`
can be derived, then run:

```sh
pio run --target upload
pio device monitor
```

The project pins PlatformIO Espressif32 6.13.0, which supplies ESP-IDF 5.5.3,
and targets `heltec_wifi_lora_32_V3`. No Wi-Fi credentials or firmware secrets
files are required. `partitions.csv` defines a 3 MiB factory application slot
and a 24 KiB NVS partition; the latter stores the provisioned Wi-Fi settings.

## Provision Wi-Fi

When no credentials exist in NVS, the OLED and serial log show a BLE device
name such as `PROV_A1B2C3`. The final six characters come from the board's MAC
address, so nearby boards remain distinguishable. Use an
Espressif-compatible provisioning client with:

- Transport: BLE
- Security: Security 1
- Device name: the `PROV_...` value shown by the board
- Proof of possession (PIN): `123456`

After provisioning succeeds, ESP-IDF stores the credentials in NVS, releases
the Bluetooth memory, connects in station mode, and begins HTTPS polling.
The OLED reports provisioning, connecting, network-not-found, authentication
failure, reconnecting, and connected-IP states before returning to the latest
echo display.

To discard stored credentials, press and hold the Heltec `USER/PRG` button on
GPIO 0 for five seconds after the firmware has booted. The OLED shows the
countdown, the firmware restores the persistent Wi-Fi settings, and the board
restarts in BLE provisioning mode. Releasing the button early cancels the
reset. Erasing flash remains available as a recovery option:

```sh
pio run --target erase
pio run --target upload
```

The onboard display connections are SDA 17, SCL 18, reset 21, and active-low
Vext power on GPIO 36.

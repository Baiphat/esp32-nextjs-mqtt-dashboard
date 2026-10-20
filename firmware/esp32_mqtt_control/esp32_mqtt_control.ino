/*
  ESP32 MQTT Control
  ควบคุมรีเลย์ + ไฟ LED ในบอร์ด ผ่านเว็บ Next.js (ESP32 DevKit V1)

  ไลบรารีที่ต้องติดตั้งใน Arduino IDE (Sketch > Include Library > Manage Libraries)
    - PubSubClient โดย Nick O'Leary

  บอร์ด: Tools > Board > esp32 > ESP32 Dev Module
  (ต้องติดตั้ง "esp32 by Espressif Systems" ใน Boards Manager ก่อน)

  หัวข้อ MQTT (ต้องตรงกับ src/lib/config.ts ในโปรเจกต์เว็บ)
    esp32/<DEVICE_ID>/status        online | offline   (retained, ใช้ Last Will)
    esp32/<DEVICE_ID>/telemetry     {"rssi":-60,"uptime":123,"heap":200000} (uptime is seconds)
    esp32/<DEVICE_ID>/ping          เว็บส่งมา แล้วบอร์ดตอบกลับที่ /pong
    esp32/<DEVICE_ID>/pong
    esp32/<DEVICE_ID>/relay/set     {"state":true|false}  (รับคำสั่ง)
    esp32/<DEVICE_ID>/relay/state   ON | OFF  (retained)
    esp32/<DEVICE_ID>/led/set       {"state":true|false}
    esp32/<DEVICE_ID>/led/state     ON | OFF  (retained)
*/

#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "Nitipoom";
const char* WIFI_PASS = "0812676817";

const char*    MQTT_HOST = "broker.emqx.io";
const uint16_t MQTT_PORT = 1883;
const char*    MQTT_USER = "";   
const char*    MQTT_PASS = "";

const char* DEVICE_ID = "esp32-pat-789";

// ======================= ขาที่ใช้ =======================
const int  RELAY_PIN        = 26;    // ต่อเข้าขา IN ของโมดูลรีเลย์
const bool RELAY_ACTIVE_LOW = true;  // โมดูลส่วนใหญ่สั่ง LOW แล้วรีเลย์ติด
const int  LED_PIN          = 2;     // ไฟ LED ในบอร์ด DevKit V1 (สั่ง HIGH แล้วติด)

// ======================= ตัวแปรภายใน =======================
const unsigned long TELEMETRY_EVERY_MS = 5000;
const unsigned long RECONNECT_EVERY_MS = 5000;

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

String base;
String tStatus, tTelemetry, tPing, tPong;
String tRelaySet, tRelayState, tLedSet, tLedState;

bool relayOn = false;
bool ledOn   = false;

unsigned long lastTelemetry = 0;
unsigned long lastReconnect = 0;
// millis() is a 32-bit counter on ESP32 and wraps about every 49.7 days.
// Accumulate its unsigned deltas into 64 bits so the published uptime does not wrap.
uint32_t lastUptimeSampleMs = 0;
uint64_t uptimeMs = 0;

void updateUptime() {
  const uint32_t nowMs = (uint32_t)millis();
  uptimeMs += (uint32_t)(nowMs - lastUptimeSampleMs);
  lastUptimeSampleMs = nowMs;
}

// ---------- ควบคุมขา ----------
void writeRelay(bool on) {
  relayOn = on;
  digitalWrite(RELAY_PIN, (on != RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

void writeLed(bool on) {
  ledOn = on;
  digitalWrite(LED_PIN, on ? HIGH : LOW);
}

void publishState(const String& topic, bool on) {
  mqtt.publish(topic.c_str(), on ? "ON" : "OFF", true);  // retained
}

// ---------- รับข้อความจาก broker ----------
void onMessage(char* topicRaw, byte* payload, unsigned int length) {
  String topic(topicRaw);
  String msg;
  msg.reserve(length);
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  if (topic == tPing) {
    // ส่งข้อความเดิมกลับทันที เว็บจะเอาไปคำนวณ ping
    mqtt.publish(tPong.c_str(), msg.c_str());
    return;
  }

  // Parse the JSON command without requiring an additional Arduino library.
  msg.trim();
  bool on;
  if (msg == "{\"state\":true}") on = true;
  else if (msg == "{\"state\":false}") on = false;
  else {
    Serial.printf("Invalid MQTT command on %s: %s\n", topic.c_str(), msg.c_str());
    return;
  }

  if (topic == tRelaySet) {
    writeRelay(on);
    publishState(tRelayState, relayOn);
    return;
  }

  if (topic == tLedSet) {
    writeLed(on);
    publishState(tLedState, ledOn);
    return;
  }
}

// ---------- เชื่อมต่อ ----------
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("เชื่อมต่อ WiFi %s ", WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.printf("\nWiFi OK, IP: %s\n", WiFi.localIP().toString().c_str());
}

bool connectMqtt() {
  String clientId = "esp32-" + String(DEVICE_ID) + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  const char* user = (strlen(MQTT_USER) > 0) ? MQTT_USER : nullptr;
  const char* pass = (strlen(MQTT_USER) > 0) ? MQTT_PASS : nullptr;

  Serial.print("เชื่อมต่อ MQTT... ");
  // Last Will: ถ้าบอร์ดหลุดกะทันหัน broker จะประกาศ "offline" แทน
  bool ok = mqtt.connect(clientId.c_str(), user, pass,
                         tStatus.c_str(), 1, true, "offline");
  if (!ok) {
    Serial.printf("ไม่สำเร็จ (rc=%d)\n", mqtt.state());
    return false;
  }
  Serial.println("สำเร็จ");

  mqtt.subscribe(tRelaySet.c_str());
  mqtt.subscribe(tLedSet.c_str());
  mqtt.subscribe(tPing.c_str());

  mqtt.publish(tStatus.c_str(), "online", true);
  publishState(tRelayState, relayOn);
  publishState(tLedState, ledOn);
  return true;
}

void publishTelemetry() {
  updateUptime();
  char json[128];
  snprintf(json, sizeof(json),
           "{\"rssi\":%d,\"uptime\":%llu,\"heap\":%u}",
           WiFi.RSSI(), (unsigned long long)(uptimeMs / 1000), (unsigned)ESP.getFreeHeap());
  mqtt.publish(tTelemetry.c_str(), json);
}

// ---------- Arduino ----------
void setup() {
  Serial.begin(115200);
  lastUptimeSampleMs = (uint32_t)millis();

  // ตั้งค่าระดับสัญญาณก่อนเปลี่ยนเป็น OUTPUT เพื่อไม่ให้รีเลย์ติดวูบตอนบูต
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  writeRelay(false);
  writeLed(false);

  base        = String("esp32/") + DEVICE_ID;
  tStatus     = base + "/status";
  tTelemetry  = base + "/telemetry";
  tPing       = base + "/ping";
  tPong       = base + "/pong";
  tRelaySet   = base + "/relay/set";
  tRelayState = base + "/relay/state";
  tLedSet     = base + "/led/set";
  tLedState   = base + "/led/state";

  connectWifi();

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setKeepAlive(15);
  mqtt.setBufferSize(512);
}

void loop() {
  updateUptime();
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lastReconnect >= RECONNECT_EVERY_MS) {
      lastReconnect = now;
      connectMqtt();
    }
    return;
  }

  mqtt.loop();

  unsigned long now = millis();
  if (now - lastTelemetry >= TELEMETRY_EVERY_MS) {
    lastTelemetry = now;
    publishTelemetry();
  }
}

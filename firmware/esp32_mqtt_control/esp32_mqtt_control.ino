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
#include <ArduinoJson.h>

// --- ตั้งค่า WiFi ---
const char* WIFI_SSID = "Nitipoom";         
const char* WIFI_PASS = "0812676817";      

// --- ตั้งค่า MQTT Broker ---
const char* MQTT_HOST = "broker.emqx.io";   
const uint16_t MQTT_PORT = 1883;            
const char* MQTT_USER = "";
const char* MQTT_PASS = "";

// --- Device ID ---
const char* DEVICE_ID = "esp32-pat-789"; 

// --- ขาพิน ---
const int RELAY_PIN = 23;                   // ใช้ขา 23 ที่ทดสอบแล้วเวิร์ก
const int LED_PIN = 2;                      

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastPingTime = 0;
const long pingInterval = 5000;           

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) return;

  bool state = doc["state"];
  String topicStr = String(topic);
  
  if (topicStr.endsWith("/led/set")) {
    digitalWrite(LED_PIN, state ? HIGH : LOW);
  }
  else if (topicStr.endsWith("/relay/set")) {
    // สั่ง LOW = เปิด, HIGH = ปิด
    digitalWrite(RELAY_PIN, state ? LOW : HIGH);
    Serial.print("Relay State: ");
    Serial.println(state ? "ON" : "OFF");
  }
}

void reconnect() {
  if (!client.connected()) {
    String clientId = "ESP32Client-" + String(random(0xffff));
    String statusTopic = "esp32/" + String(DEVICE_ID) + "/status";
    
    if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS, statusTopic.c_str(), 0, true, "offline")) {
      client.publish(statusTopic.c_str(), "online", true);
      client.subscribe(("esp32/" + String(DEVICE_ID) + "/led/set").c_str());
      client.subscribe(("esp32/" + String(DEVICE_ID) + "/relay/set").c_str());
      Serial.println("MQTT Connected!");
    }
  }
}

void setup() {
  // --- 1. บังคับตั้งค่าพินและดีดรีเลย์ให้ "ปิด" ตั้งแต่บรรทัดแรกสุดทันทีที่ไฟเข้าบอร์ด ---
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); 

  Serial.begin(115200);
  delay(500);
  
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // --- 2. เชื่อมต่อ Wi-Fi ---
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
  } else {
    Serial.println("\nWiFi connection failed, restarting...");
    ESP.restart(); 
  }

  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(callback);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // ส่ง Telemetry ทุกๆ 5 วินาที
  unsigned long now = millis();
  if (now - lastPingTime > pingInterval) {
    lastPingTime = now;

    StaticJsonDocument<200> doc;
    doc["uptime"] = millis() / 1000; 
    doc["rssi"] = WiFi.RSSI();         

    char buffer[256];
    serializeJson(doc, buffer);

    String telemetryTopic = "esp32/" + String(DEVICE_ID) + "/telemetry";
    client.publish(telemetryTopic.c_str(), buffer);
  }
}
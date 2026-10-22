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
const char* WIFI_SSID = "Nitipoom";        // ชื่อ Wi-Fi
const char* WIFI_PASS = "0812676817";      // รหัสผ่าน Wi-Fi

// --- ตั้งค่า MQTT Broker ---
const char* MQTT_HOST = "broker.emqx.io";   // Public Broker
const uint16_t MQTT_PORT = 1883;            // พอร์ต MQTT มาตรฐาน
const char* MQTT_USER = "";
const char* MQTT_PASS = "";

// --- Device ID ต้องตรงกับในเว็บ Next.js ทุกตัวอักษร ---
const char* DEVICE_ID = "esp32-pat-789"; 

// --- กำหนดขาพิน ---
const int RELAY_PIN = 25;                 // ใช้ขา GPIO 25 ตามที่คุณเลือก
const int LED_PIN = 2;                    // ไฟ LED บนบอร์ด DevKit V1

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastPingTime = 0;
const long pingInterval = 5000;           // ส่งสถานะทุกๆ 5 วินาที

// ฟังก์ชันรับข้อความจาก MQTT
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  // แปลง JSON Payload
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.println("JSON Parsing failed!");
    return;
  }

  bool state = doc["state"];
  String topicStr = String(topic);
  
  if (topicStr.endsWith("/led/set")) {
    digitalWrite(LED_PIN, state ? HIGH : LOW);
    Serial.print("LED State: ");
    Serial.println(state ? "ON" : "OFF");
  }
  else if (topicStr.endsWith("/relay/set")) {
    // ควบคุมรีเลย์: state = true (เปิด -> ส่ง LOW), state = false (ปิด -> ส่ง HIGH)
    digitalWrite(RELAY_PIN, state ? LOW : HIGH);
    
    Serial.print("Relay State: ");
    Serial.println(state ? "ON" : "OFF");
  }
}

void reconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 10000) {
      delay(500);
    }
    if (WiFi.status() != WL_CONNECTED) {
      return; 
    }
  }

  if (!client.connected()) {
    String clientId = "ESP32Client-" + String(random(0xffff));
    String statusTopic = "esp32/" + String(DEVICE_ID) + "/status";
    
    Serial.print("Connecting to MQTT Broker...");
    
    if (client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS, statusTopic.c_str(), 0, true, "offline")) {
      Serial.println(" connected!");
      
      client.publish(statusTopic.c_str(), "online", true);

      String ledTopic = "esp32/" + String(DEVICE_ID) + "/led/set";
      String relayTopic = "esp32/" + String(DEVICE_ID) + "/relay/set";
      
      client.subscribe(ledTopic.c_str());
      client.subscribe(relayTopic.c_str());
    } else {
      Serial.print(" failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 2 seconds");
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // ตั้งค่าพินและบังคับให้รีเลย์ "ปิด" (HIGH) ตั้งแต่ตอนเปิดเครื่อง เพื่อไม่ให้ไฟเขียวค้าง
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); 
  
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  unsigned long startAttemptTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed! Please check SSID/Password.");
  }

  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(callback);
  
  reconnect();
}

void loop() {
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
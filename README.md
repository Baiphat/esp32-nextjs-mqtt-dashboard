# ESP32 Control

เว็บควบคุม ESP32 (DevKit V1) สร้างด้วย Next.js + TypeScript + Tailwind CSS ดีไซน์สไตล์ HeroUI โทนมืด ขอบมน

ทำได้ 4 อย่าง

1. เปิด–ปิดรีเลย์
2. เปิด–ปิดไฟ LED ในบอร์ด (GPIO 2)
3. แจ้งเตือน (toast) เมื่อบอร์ดยืนยันว่าทำตามคำสั่งแล้ว หรือไม่ตอบสนองใน 4 วินาที
4. แสดงสถานะออนไลน์/ออฟไลน์ ค่า Ping (ms), สัญญาณ WiFi (dBm) และเวลาที่บอร์ดเปิดมาแล้ว

## วิธีทำงาน

```
เว็บ (เบราว์เซอร์) ──WebSocket──▶ MQTT Broker ◀──TCP 1883── ESP32
```

เว็บและบอร์ดไม่ต้องอยู่ในเครือข่ายเดียวกัน ทั้งสองฝั่งคุยผ่าน broker เท่านั้น

| หัวข้อ (`esp32/<DEVICE_ID>/…`) | ทิศทาง | ข้อมูล |
| --- | --- | --- |
| `relay/set`, `led/set` | เว็บ → บอร์ด | `ON` / `OFF` |
| `relay/state`, `led/state` | บอร์ด → เว็บ (retained) | `ON` / `OFF` |
| `status` | บอร์ด → เว็บ (retained, Last Will) | `online` / `offline` |
| `telemetry` | บอร์ด → เว็บ ทุก 5 วินาที | `{"rssi":-60,"uptime":123,"heap":200000}` |
| `ping` → `pong` | เว็บ → บอร์ด → เว็บ | ใช้วัดค่า Ping |

## 1) รันเว็บ

ต้องใช้ Node.js 20.9 ขึ้นไป

```bash
npm install
cp .env.example .env.local   # แก้ DEVICE_ID ให้เป็นชื่อของคุณเอง
npm run dev
```

เปิด http://localhost:3000 แล้วกดไอคอนฟันเฟืองมุมขวาบนเพื่อแก้ Broker หรือ Device ID ได้ทุกเมื่อ

## 2) อัปโหลดโค้ดเข้า ESP32 (Arduino IDE)

1. Boards Manager: ติดตั้ง **esp32 by Espressif Systems**
2. Library Manager: ติดตั้ง **PubSubClient** (Nick O'Leary)
3. เปิด `firmware/esp32_mqtt_control/esp32_mqtt_control.ino`
4. แก้ `WIFI_SSID`, `WIFI_PASS` และ `DEVICE_ID` (ต้องตรงกับในเว็บ)
5. เลือก Board = **ESP32 Dev Module** แล้วอัปโหลด เปิด Serial Monitor ที่ 115200 เพื่อดูสถานะ

## การต่อสาย

| โมดูลรีเลย์ | ESP32 |
| --- | --- |
| VCC | VIN (5V) หรือ 3V3 ตามสเปกของโมดูล |
| GND | GND |
| IN | GPIO 26 |

- โค้ดตั้งเป็น **Active-LOW** (สั่ง LOW แล้วรีเลย์ติด) ถ้าโมดูลของคุณเป็น Active-HIGH ให้เปลี่ยน `RELAY_ACTIVE_LOW` เป็น `false`
- ไฟ LED ในบอร์ดคือ GPIO 2 ไม่ต้องต่อสายเพิ่ม
- ถ้าจะสลับโหลดไฟบ้าน (220V) ให้ใช้โมดูลที่มีฉนวนและกล่องครอบ และตัดไฟก่อนต่อสายทุกครั้ง

## ความปลอดภัย (สำคัญ)

ค่าเริ่มต้นใช้ broker สาธารณะ `broker.emqx.io` เพื่อให้ทดลองได้ทันที แต่ **ใครที่รู้ Device ID ก็ subscribe และสั่งรีเลย์ของคุณได้** จึงควร

- ตั้ง `DEVICE_ID` ให้ยาวและเดายาก เช่น `home-k3x9q2m7z1`
- เมื่อใช้งานจริง ให้เปลี่ยนไปใช้ broker ส่วนตัวที่ล็อกอินได้ (Mosquitto, EMQX Cloud, HiveMQ Cloud ฯลฯ) แล้วกรอกชื่อผู้ใช้/รหัสผ่านในหน้าตั้งค่า และเปลี่ยน `MQTT_HOST`/`MQTT_USER`/`MQTT_PASS` ในโค้ด Arduino
- เว็บทำงานในเบราว์เซอร์ รหัสผ่าน broker จึงถูกเห็นได้จากฝั่งผู้ใช้ ควรสร้างผู้ใช้ที่มีสิทธิ์เฉพาะหัวข้อ `esp32/<DEVICE_ID>/#`

## แก้ปัญหาที่พบบ่อย

| อาการ | วิธีแก้ |
| --- | --- |
| เว็บขึ้น "กำลังเชื่อมต่อ…" ไม่หาย | ตรวจ URL ใน Settings ต้องเป็น `ws://` หรือ `wss://` และ broker เปิดพอร์ต WebSocket (EMQX สาธารณะคือ `wss://broker.emqx.io:8084/mqtt`) |
| Broker เชื่อมต่อแล้ว แต่บอร์ดออฟไลน์ | Device ID ในเว็บกับในโค้ดต้องตรงกันทุกตัวอักษร ดู Serial Monitor ว่า WiFi/MQTT ผ่านไหม |
| เปิดเว็บผ่าน https แล้วเชื่อมต่อไม่ได้ | เบราว์เซอร์บล็อก `ws://` บนหน้า https ให้ใช้ `wss://` |
| รีเลย์ทำงานกลับด้าน | สลับค่า `RELAY_ACTIVE_LOW` |

## โครงสร้างโปรเจกต์

```
src/app/                 layout, page, globals.css (ธีมสี/แอนิเมชัน)
src/components/          Dashboard, StatusCard, ControlCard, ActivityCard, SettingsModal
src/components/ui/       Switch, Button, Field, Modal, Toast
src/hooks/useEsp32.ts    เชื่อม MQTT, ส่งคำสั่ง, ตรวจสถานะออนไลน์, วัด Ping
src/lib/config.ts        ค่าตั้งต้น, หัวข้อ MQTT, การเก็บค่าใน localStorage
firmware/                โค้ด Arduino สำหรับ ESP32
```

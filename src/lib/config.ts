export interface Esp32Config {
  /** MQTT over WebSocket, เช่น wss://broker.emqx.io:8084/mqtt */
  brokerUrl: string;
  /** ต้องตรงกับ DEVICE_ID ใน firmware */
  deviceId: string;
  username: string;
  password: string;
}

export const DEFAULT_CONFIG: Esp32Config = {
  brokerUrl:
    process.env.NEXT_PUBLIC_MQTT_URL ?? "wss://broker.emqx.io:8084/mqtt",
  deviceId: process.env.NEXT_PUBLIC_DEVICE_ID ?? "esp32-pat-789",
  username: process.env.NEXT_PUBLIC_MQTT_USERNAME ?? "",
  password: "",
};

const STORAGE_KEY = "esp32-control:config";

export function loadConfig(): Esp32Config {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<Esp32Config>;
    return {
      brokerUrl: parsed.brokerUrl || DEFAULT_CONFIG.brokerUrl,
      // Upgrade the previous project default; preserve any user-selected ID.
      deviceId:
        parsed.deviceId === "my-esp32-home"
          ? DEFAULT_CONFIG.deviceId
          : parsed.deviceId || DEFAULT_CONFIG.deviceId,
      username: parsed.username ?? DEFAULT_CONFIG.username,
      password: parsed.password ?? "",
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Esp32Config): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // บางเบราว์เซอร์ (เช่น private mode) เขียนไม่ได้ ใช้ค่าในหน่วยความจำต่อไป
  }
}

export function clearConfig(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

export interface ConfigErrors {
  brokerUrl?: string;
  deviceId?: string;
}

export function validateConfig(config: Esp32Config): ConfigErrors {
  const errors: ConfigErrors = {};
  if (!/^wss?:\/\/.+/i.test(config.brokerUrl.trim())) {
    errors.brokerUrl = "ต้องขึ้นต้นด้วย ws:// หรือ wss://";
  }
  if (!DEVICE_ID_PATTERN.test(config.deviceId.trim())) {
    errors.deviceId =
      "ใช้ตัวอักษรอังกฤษ ตัวเลข - และ _ ความยาว 3–40 ตัว";
  }
  return errors;
}

/** หัวข้อ MQTT ทั้งหมด ต้องตรงกับ firmware (esp32_mqtt_control.ino) */
export function topicsFor(deviceId: string) {
  const base = `esp32/${deviceId}`;
  return {
    base,
    status: `${base}/status`,
    telemetry: `${base}/telemetry`,
    ping: `${base}/ping`,
    pong: `${base}/pong`,
    relaySet: `${base}/relay/set`,
    relayState: `${base}/relay/state`,
    ledSet: `${base}/led/set`,
    ledState: `${base}/led/state`,
  };
}

export type Topics = ReturnType<typeof topicsFor>;

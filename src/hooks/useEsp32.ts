"use client";

import mqtt from "mqtt";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { topicsFor, type Esp32Config } from "@/lib/config";

export type LinkState = "connecting" | "connected" | "reconnecting";
export type Channel = "relay" | "led";
export type LogKind = "info" | "success" | "error";

export interface LogEntry {
  id: number;
  at: number;
  kind: LogKind;
  text: string;
}

export type Notify = (n: {
  kind: LogKind;
  title: string;
  description?: string;
}) => void;

export const CHANNEL_LABEL: Record<Channel, string> = {
  relay: "รีเลย์",
  led: "ไฟ LED ในบอร์ด",
};

const PING_EVERY_MS = 5000;
/** บอร์ดส่งสัญญาณทุก ~5 วินาที ถ้าเงียบเกินนี้ถือว่าออฟไลน์ */
const STALE_AFTER_MS = 15000;
const MAX_LOG = 40;
const MAX_PING_HISTORY = 24;

function parseState(payload: string): boolean | null {
  if (payload === "ON") return true;
  if (payload === "OFF") return false;

  try {
    const parsed: unknown = JSON.parse(payload);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "state" in parsed &&
      typeof parsed.state === "boolean"
    ) {
      return parsed.state;
    }
  } catch {
    // Ignore malformed state messages instead of treating them as OFF.
  }
  return null;
}

export function useEsp32(config: Esp32Config | null, notify: Notify) {
  const [link, setLink] = useState<LinkState>("connecting");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [relay, setRelay] = useState<boolean | null>(null);
  const [led, setLed] = useState<boolean | null>(null);
  const pending = { relay: false, led: false };
  const [statusOnline, setStatusOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const [rssi, setRssi] = useState<number | null>(null);
  const [uptime, setUptime] = useState<{ sec: number; at: number } | null>(
    null,
  );
  const [log, setLog] = useState<LogEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const clientRef = useRef<ReturnType<typeof mqtt.connect> | null>(null);
  const values = useRef<Record<Channel, boolean | null>>({
    relay: null,
    led: null,
  });
  const notifyRef = useRef(notify);
  const logId = useRef(0);
  const prevOnline = useRef(false);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // นาฬิกาให้ UI คำนวณ "เห็นล่าสุด", uptime และเช็คสัญญาณขาดหาย
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const addLog = useCallback((kind: LogKind, text: string) => {
    const entry: LogEntry = { id: ++logId.current, at: Date.now(), kind, text };
    setLog((list) => [entry, ...list].slice(0, MAX_LOG));
  }, []);

  const brokerUrl = config?.brokerUrl;
  const deviceId = config?.deviceId;
  const username = config?.username;
  const password = config?.password;

  const topics = useMemo(() => topicsFor(deviceId ?? ""), [deviceId]);

  // เชื่อมต่อ broker และ subscribe ทุกครั้งที่ค่าตั้งค่าเปลี่ยน
  useEffect(() => {
    if (!brokerUrl || !deviceId) return;

    const t = topicsFor(deviceId);
    const nonce = Math.random().toString(16).slice(2, 8);

    setLink("connecting");
    setLinkError(null);
    setRelay(null);
    setLed(null);
    setStatusOnline(false);
    setLastSeen(null);
    setPingMs(null);
    setPingHistory([]);
    setRssi(null);
    setUptime(null);
    values.current = { relay: null, led: null };
    prevOnline.current = false;

    const client = mqtt.connect(brokerUrl, {
      clientId: `web-${nonce}-${Math.random().toString(16).slice(2, 6)}`,
      username: username || undefined,
      password: password || undefined,
      reconnectPeriod: 3000,
      connectTimeout: 10_000,
      keepalive: 30,
      clean: true,
    });
    clientRef.current = client;

    const sendPing = () => {
      if (client.connected) {
        client.publish(t.ping, `${nonce}:${performance.now()}`, { qos: 0 });
      }
    };
    const pingTimer = window.setInterval(sendPing, PING_EVERY_MS);

    const settle = (channel: Channel, value: boolean) => {
      const previous = values.current[channel];
      values.current[channel] = value;
      const verb = value ? "เปิด" : "ปิด";
      if (previous !== null && previous !== value) {
        addLog("info", `${CHANNEL_LABEL[channel]}ถูกสั่ง${verb}จากอุปกรณ์อื่น`);
      }
    };

    client.on("connect", () => {
      setLink("connected");
      setLinkError(null);
      // Clear legacy retained commands left by older clients. An empty retained
      // payload deletes the broker's stored command and cannot actuate hardware.
      for (const topic of [t.relaySet, t.ledSet]) {
        client.publish(topic, "", { qos: 0, retain: true }, (err) => {
          if (err) {
            setLinkError("คำสั่งเก่าบน Broker ล้างไม่สำเร็จ");
            addLog("error", `ล้าง retained command ไม่สำเร็จ: ${topic}`);
          }
        });
      }
      client.subscribe(
        [t.status, t.relayState, t.ledState, t.telemetry, t.pong],
        { qos: 0 },
        (err) => {
          if (err) setLinkError("subscribe ไม่สำเร็จ");
        },
      );
      sendPing();
    });

    const markDisconnected = () => {
      setLink((prev) => (prev === "connecting" ? prev : "reconnecting"));
      setStatusOnline(false);
    };
    client.on("reconnect", () => setLink("reconnecting"));
    client.on("close", markDisconnected);
    client.on("offline", markDisconnected);
    client.on("error", (err) => setLinkError(err.message));

    client.on("message", (topic, payload) => {
      const text = payload.toString();
      const at = Date.now();

      switch (topic) {
        case t.status: {
          const online = text === "online";
          setStatusOnline(online);
          if (online) setLastSeen(at);
          break;
        }
        case t.relayState: {
          const value = parseState(text);
          if (value === null) break;
          setRelay(value);
          setLastSeen(at);
          settle("relay", value);
          break;
        }
        case t.ledState: {
          const value = parseState(text);
          if (value === null) break;
          setLed(value);
          setLastSeen(at);
          settle("led", value);
          break;
        }
        case t.telemetry: {
          try {
            const data = JSON.parse(text) as { rssi?: number; uptime?: number };
            if (typeof data.rssi === "number") setRssi(data.rssi);
            // Firmware contract: uptime is a non-negative integer count of seconds.
            // Reject malformed values instead of letting them create huge UI values.
            if (
              typeof data.uptime === "number" &&
              Number.isSafeInteger(data.uptime) &&
              data.uptime >= 0
            ) {
              setUptime({ sec: data.uptime, at });
            }
            setLastSeen(at);
          } catch {
            // ข้ามข้อความที่ไม่ใช่ JSON
          }
          break;
        }
        case t.pong: {
          const [owner, sent] = text.split(":");
          if (owner !== nonce) break; // pong ของเว็บอื่นที่เปิดอยู่พร้อมกัน
          const rtt = performance.now() - Number(sent);
          if (!Number.isFinite(rtt) || rtt < 0 || rtt > 30_000) break;
          const rounded = Math.round(rtt);
          setPingMs(rounded);
          setPingHistory((h) => [...h, rounded].slice(-MAX_PING_HISTORY));
          setLastSeen(at);
          break;
        }
        default:
          break;
      }
    });

    return () => {
      window.clearInterval(pingTimer);
      client.end(true);
      clientRef.current = null;
    };
  }, [brokerUrl, deviceId, username, password, addLog]);

  const deviceOnline =
    link === "connected" &&
    statusOnline &&
    lastSeen !== null &&
    now - lastSeen < STALE_AFTER_MS;

  // แจ้งเตือนเมื่อบอร์ดเปลี่ยนสถานะ ออนไลน์ <-> ออฟไลน์
  useEffect(() => {
    if (link !== "connected") {
      prevOnline.current = false;
      return;
    }
    if (deviceOnline === prevOnline.current) return;
    prevOnline.current = deviceOnline;

    if (deviceOnline) {
      addLog("success", "ESP32 ออนไลน์");
      notifyRef.current({ kind: "success", title: "ESP32 ออนไลน์" });
    } else {
      addLog("error", "ESP32 ออฟไลน์");
      notifyRef.current({
        kind: "error",
        title: "ESP32 ออฟไลน์",
        description: "บอร์ดหยุดส่งสัญญาณ ตรวจสอบไฟเลี้ยงและ WiFi",
      });
    }
  }, [deviceOnline, link, addLog]);

  const send = useCallback(
    (channel: Channel, on: boolean) => {
      const client = clientRef.current;
      if (!client || !client.connected) {
        notifyRef.current({
          kind: "error",
          title: "ยังไม่ได้เชื่อมต่อ Broker",
          description: "รอสักครู่แล้วลองใหม่",
        });
        return;
      }

      // Do not allow a guessed OFF value to become a real command before the
      // retained state from the device has synchronized the switch.
      if (values.current[channel] === null) {
        notifyRef.current({
          kind: "error",
          title: "ยังไม่ได้รับสถานะจาก ESP32",
          description: "รอสถานะจริงจากบอร์ดก่อนสั่งงาน",
        });
        return;
      }

      // Reflect the user's intent immediately; state responses can synchronize it later.
      if (channel === "relay") setRelay(on);
      else setLed(on);

      const topic = channel === "relay" ? topics.relaySet : topics.ledSet;
      const payload = JSON.stringify({ state: on });
      console.info("[MQTT] Publish command", { topic, payload });
      client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
        if (err) {
          const title = "ส่งคำสั่งไม่สำเร็จ";
          addLog("error", title);
          notifyRef.current({ kind: "error", title });
        } else console.info("[MQTT] Command published", { topic, payload });
      });
    },
    [topics, addLog],
  );

  const uptimeSec =
    uptime && deviceOnline
      ? uptime.sec + Math.max(0, (now - uptime.at) / 1000)
      : null;

  return {
    topics,
    link,
    linkError,
    deviceOnline,
    lastSeen,
    now,
    relay,
    led,
    pending,
    pingMs: deviceOnline ? pingMs : null,
    pingHistory,
    rssi: deviceOnline ? rssi : null,
    uptimeSec,
    log,
    send,
  };
}

export type Esp32 = ReturnType<typeof useEsp32>;

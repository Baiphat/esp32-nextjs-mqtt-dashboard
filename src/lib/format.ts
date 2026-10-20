export function formatUptime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (days > 0) return `${days} วัน ${hours} ชม.`;
  if (hours > 0) return `${hours} ชม. ${minutes} นาที`;
  if (minutes > 0) return `${minutes} นาที ${seconds} วิ`;
  return `${seconds} วิ`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatAgo(timestamp: number, now: number): string {
  const diff = Math.max(0, Math.round((now - timestamp) / 1000));
  if (diff < 2) return "เมื่อสักครู่";
  if (diff < 60) return `${diff} วินาทีที่แล้ว`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  return `${Math.floor(minutes / 60)} ชั่วโมงที่แล้ว`;
}

export type Tone = "good" | "ok" | "bad" | "none";

export function pingTone(ms: number | null): Tone {
  if (ms === null) return "none";
  if (ms < 150) return "good";
  if (ms < 400) return "ok";
  return "bad";
}

export interface SignalInfo {
  bars: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: Tone;
}

export function signalInfo(rssi: number | null): SignalInfo {
  if (rssi === null) return { bars: 0, label: "ไม่มีข้อมูล", tone: "none" };
  if (rssi >= -55) return { bars: 4, label: "สัญญาณดีมาก", tone: "good" };
  if (rssi >= -67) return { bars: 3, label: "สัญญาณดี", tone: "good" };
  if (rssi >= -78) return { bars: 2, label: "สัญญาณพอใช้", tone: "ok" };
  return { bars: 1, label: "สัญญาณอ่อน", tone: "bad" };
}

export const toneText: Record<Tone, string> = {
  good: "text-success",
  ok: "text-warning",
  bad: "text-danger",
  none: "text-zinc-500",
};

export const toneBg: Record<Tone, string> = {
  good: "bg-success",
  ok: "bg-warning",
  bad: "bg-danger",
  none: "bg-zinc-600",
};

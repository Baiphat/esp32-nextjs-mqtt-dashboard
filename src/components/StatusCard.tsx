import { Clock, Cpu, Gauge, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  formatAgo,
  formatUptime,
  pingTone,
  signalInfo,
  toneBg,
  toneText,
} from "@/lib/format";
import type { Esp32 } from "@/hooks/useEsp32";

interface StatusCardProps {
  deviceId: string;
  esp: Esp32;
}

export function StatusCard({ deviceId, esp }: StatusCardProps) {
  const { link, linkError, deviceOnline, lastSeen, now } = esp;
  const signal = signalInfo(esp.rssi);
  const ping = pingTone(esp.pingMs);

  let summary: string;
  if (link !== "connected") {
    summary = linkError
      ? `เชื่อมต่อ Broker ไม่ได้: ${linkError}`
      : "กำลังเชื่อมต่อกับ Broker…";
  } else if (!deviceOnline) {
    summary = "ไม่พบสัญญาณจากบอร์ด ตรวจสอบไฟเลี้ยงและ WiFi ของ ESP32";
  } else if (lastSeen !== null) {
    summary = `ได้รับสัญญาณล่าสุด${formatAgo(lastSeen, now)}`;
  } else {
    summary = "กำลังรอข้อมูลจากบอร์ด…";
  }

  return (
    <section
      aria-labelledby="status-title"
      className="rounded-[28px] bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-2 text-zinc-200">
            <Cpu aria-hidden className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 id="status-title" className="text-base font-semibold">
              สถานะบอร์ด
            </h2>
            <p className="truncate text-sm text-zinc-400">{deviceId}</p>
          </div>
        </div>
        <StatusPill link={link} online={deviceOnline} />
      </div>

      <p className="mt-4 text-sm text-zinc-400" aria-live="polite">
        {summary}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric
          icon={<Gauge aria-hidden className="size-4" />}
          label="Ping"
          value={esp.pingMs !== null ? `${esp.pingMs}` : "—"}
          unit={esp.pingMs !== null ? "ms" : undefined}
          note={
            esp.pingMs === null
              ? "รอผลตอบกลับ"
              : ping === "good"
                ? "ตอบสนองเร็ว"
                : ping === "ok"
                  ? "ตอบสนองช้าเล็กน้อย"
                  : "ตอบสนองช้า"
          }
          tone={ping}
          extra={<Sparkline values={esp.pingHistory} active={deviceOnline} />}
        />
        <Metric
          icon={<Wifi aria-hidden className="size-4" />}
          label="สัญญาณ WiFi"
          value={esp.rssi !== null ? `${esp.rssi}` : "—"}
          unit={esp.rssi !== null ? "dBm" : undefined}
          note={signal.label}
          tone={signal.tone}
          extra={<SignalBars bars={signal.bars} tone={signal.tone} />}
        />
        <Metric
          icon={<Clock aria-hidden className="size-4" />}
          label="เปิดมาแล้ว"
          value={
            esp.uptimeSec !== null ? formatUptime(esp.uptimeSec) : "—"
          }
          note={esp.uptimeSec !== null ? "นับตั้งแต่เปิดบอร์ด" : "ไม่มีข้อมูล"}
          tone="none"
          valueClassName="text-xl"
        />
      </dl>
    </section>
  );
}

function StatusPill({
  link,
  online,
}: {
  link: Esp32["link"];
  online: boolean;
}) {
  const connecting = link !== "connected";
  const label = connecting ? "กำลังเชื่อมต่อ" : online ? "ออนไลน์" : "ออฟไลน์";
  const tone = connecting
    ? "bg-warning/15 text-warning"
    : online
      ? "bg-success/15 text-success"
      : "bg-danger/15 text-danger";
  const dot = connecting ? "bg-warning" : online ? "bg-success" : "bg-danger";

  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium",
        tone,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          dot,
          online && !connecting && "animate-pulse-ring",
        )}
      />
      {label}
    </span>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
  note,
  tone,
  extra,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  note: string;
  tone: ReturnType<typeof pingTone>;
  extra?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-2/70 p-4">
      <dt className="flex items-center gap-1.5 text-sm text-zinc-400">
        {icon}
        {label}
      </dt>
      <dd className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-semibold tabular-nums",
              valueClassName ?? "text-3xl",
            )}
          >
            {value}
            {unit && (
              <span className="ml-1 text-sm font-medium text-zinc-400">
                {unit}
              </span>
            )}
          </p>
          <p className={cn("mt-0.5 text-xs", toneText[tone])}>{note}</p>
        </div>
        {extra}
      </dd>
    </div>
  );
}

function SignalBars({
  bars,
  tone,
}: {
  bars: 0 | 1 | 2 | 3 | 4;
  tone: ReturnType<typeof pingTone>;
}) {
  return (
    <span aria-hidden className="flex h-7 items-end gap-0.5">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          style={{ height: `${n * 25}%` }}
          className={cn(
            "w-1.5 rounded-full",
            n <= bars ? toneBg[tone] : "bg-surface-3",
          )}
        />
      ))}
    </span>
  );
}

function Sparkline({ values, active }: { values: number[]; active: boolean }) {
  if (!active || values.length < 2) return null;
  const max = Math.max(...values, 50);
  const step = 56 / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(26 - (v / max) * 24).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      aria-hidden
      viewBox="0 0 56 28"
      className="h-7 w-14 shrink-0 text-primary"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

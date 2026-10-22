"use client";

import { Lightbulb, Settings, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { ControlCard } from "@/components/ControlCard";
import { SettingsModal } from "@/components/SettingsModal";
import { StatusCard } from "@/components/StatusCard";
import { IconButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  type Esp32Config,
} from "@/lib/config";
import { useEsp32, type LinkState } from "@/hooks/useEsp32";

export function Dashboard() {
  const toast = useToast();
  const [config, setConfig] = useState<Esp32Config | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // อ่านค่าจาก localStorage หลัง mount เท่านั้น เพื่อไม่ให้ HTML ฝั่ง server ไม่ตรงกับ client
  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const esp = useEsp32(config, toast);
  const active = config ?? DEFAULT_CONFIG;
  const unavailable = !esp.deviceOnline;

  const handleSave = useCallback(
    (next: Esp32Config) => {
      saveConfig(next);
      setConfig(next);
      setSettingsOpen(false);
      toast({ kind: "info", title: "บันทึกการตั้งค่าแล้ว" });
    },
    [toast],
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:gap-5 sm:py-10">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">ESP32 Control</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            เปิด–ปิดอุปกรณ์จากที่ไหนก็ได้ผ่าน MQTT
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <BrokerChip link={esp.link} error={esp.linkError} />
          <IconButton
            label="ตั้งค่าการเชื่อมต่อ"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings aria-hidden className="size-[18px]" />
          </IconButton>
        </div>
      </header>

      <StatusCard deviceId={active.deviceId} esp={esp} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        <ControlCard
          title="รีเลย์"
          description="สั่งเปิด–ปิดโหลดที่ต่อกับรีเลย์"
          icon={<Zap aria-hidden className="size-5" />}
          accent="primary"
          value={esp.relay}
          pending={esp.pending.relay}
          unavailable={unavailable || esp.relay === null}
          onChange={(on) => esp.send("relay", on)}
        />
        <ControlCard
          title="ไฟ LED ในบอร์ด"
          description="ไฟสถานะที่ติดมากับบอร์ด ESP32"
          icon={<Lightbulb aria-hidden className="size-5" />}
          accent="warning"
          value={esp.led}
          pending={esp.pending.led}
          unavailable={unavailable || esp.led === null}
          onChange={(on) => esp.send("led", on)}
        />
      </div>

      <ActivityCard log={esp.log} />

      <SettingsModal
        open={settingsOpen}
        config={active}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSave}
      />
    </main>
  );
}

const BROKER_LABEL: Record<LinkState, string> = {
  connected: "Broker เชื่อมต่อแล้ว",
  connecting: "กำลังเชื่อมต่อ…",
  reconnecting: "กำลังเชื่อมต่อใหม่…",
};

function BrokerChip({
  link,
  error,
}: {
  link: LinkState;
  error: string | null;
}) {
  const ok = link === "connected";
  return (
    <span
      title={error ?? undefined}
      className={cn(
        "hidden h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm sm:inline-flex",
        ok ? "text-zinc-200" : "text-warning",
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full", ok ? "bg-success" : "bg-warning")}
      />
      {BROKER_LABEL[link]}
    </span>
  );
}

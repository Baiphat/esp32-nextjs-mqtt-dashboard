import { Activity, CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import type { LogEntry } from "@/hooks/useEsp32";

const KIND = {
  success: { Icon: CircleCheck, tone: "text-success" },
  error: { Icon: CircleAlert, tone: "text-danger" },
  info: { Icon: Info, tone: "text-primary" },
} as const;

export function ActivityCard({ log }: { log: LogEntry[] }) {
  return (
    <section
      aria-labelledby="activity-title"
      className="rounded-[28px] bg-surface p-5 sm:p-6"
    >
      <h2
        id="activity-title"
        className="flex items-center gap-2 text-base font-semibold"
      >
        <Activity aria-hidden className="size-4 text-zinc-400" />
        กิจกรรมล่าสุด
      </h2>

      {log.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-surface-2/70 px-4 py-5 text-center text-sm text-zinc-400">
          ยังไม่มีกิจกรรม ลองเปิดหรือปิดอุปกรณ์ด้านบนได้เลย
        </p>
      ) : (
        <ul className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {log.map(({ id, at, kind, text }) => {
            const { Icon, tone } = KIND[kind];
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl px-3 py-2 odd:bg-surface-2/40"
              >
                <Icon aria-hidden className={cn("size-4 shrink-0", tone)} />
                <span className="min-w-0 flex-1 truncate text-sm">{text}</span>
                <time
                  dateTime={new Date(at).toISOString()}
                  className="shrink-0 text-xs tabular-nums text-zinc-500"
                >
                  {formatClock(at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Switch } from "@/components/ui/Switch";

interface ControlCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  accent: "primary" | "warning";
  /** null = ยังไม่รู้สถานะจากบอร์ด */
  value: boolean | null;
  pending: boolean;
  /** บอร์ดออฟไลน์หรือยังไม่ได้เชื่อมต่อ */
  unavailable: boolean;
  onChange: (next: boolean) => void;
}

const ICON_ON = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
} as const;

const DOT_ON = {
  primary: "bg-primary",
  warning: "bg-warning",
} as const;

export function ControlCard({
  title,
  description,
  icon,
  accent,
  value,
  pending,
  unavailable,
  onChange,
}: ControlCardProps) {
  const on = value === true;
  const stateLabel = value === null ? "ยังไม่ทราบสถานะ" : on ? "เปิดอยู่" : "ปิดอยู่";

  return (
    <section
      aria-label={title}
      className="flex flex-col gap-5 rounded-[28px] bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "grid size-12 place-items-center rounded-full transition-colors duration-300",
            on ? ICON_ON[accent] : "bg-surface-2 text-zinc-400",
          )}
        >
          {icon}
        </div>
        <Switch
          label={title}
          accent={accent}
          checked={on}
          loading={pending}
          disabled={unavailable}
          onChange={onChange}
        />
      </div>

      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-surface-2/70 px-4 py-3">
        <span className="text-sm text-zinc-400">สถานะ</span>
        <span
          className="flex items-center gap-2 text-sm font-medium"
          aria-live="polite"
        >
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full transition-colors",
              on ? DOT_ON[accent] : "bg-zinc-600",
            )}
          />
          {pending ? "กำลังส่งคำสั่ง…" : stateLabel}
        </span>
      </div>

      {unavailable && (
        <p className="-mt-2 text-xs text-zinc-500">
          {value === null
            ? "รอสถานะจริงจากบอร์ดก่อนจึงจะสั่งงานได้"
            : "สั่งงานไม่ได้ในตอนนี้ เพราะบอร์ดออฟไลน์"}
        </p>
      )}
    </section>
  );
}

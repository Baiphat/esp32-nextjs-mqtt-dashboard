"use client";

import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  /** กำลังรอบอร์ดยืนยันคำสั่ง */
  loading?: boolean;
  accent?: "primary" | "warning";
}

const TRACK_ON = {
  primary: "bg-primary",
  warning: "bg-warning",
} as const;

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  loading = false,
  accent = "primary",
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={loading}
      disabled={disabled || loading}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-200",
        checked ? TRACK_ON[accent] : "bg-surface-3",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
        loading && "cursor-progress",
      )}
    >
      <span
        className={cn(
          "grid size-6 place-items-center rounded-full bg-white shadow-md transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-0",
        )}
      >
        {loading && (
          <LoaderCircle
            aria-hidden
            className="size-3.5 animate-spin text-zinc-700"
          />
        )}
      </span>
    </button>
  );
}

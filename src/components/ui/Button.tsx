import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "flat";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white hover:brightness-110",
  flat: "bg-surface-2 text-white hover:bg-surface-3",
};

export function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

/** ปุ่มกลมไอคอนล้วน เช่น ปุ่มปิด หรือปุ่มตั้งค่า */
export function IconButton({
  label,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 place-items-center rounded-full bg-surface-2 text-zinc-300 transition hover:bg-surface-3 hover:text-white",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

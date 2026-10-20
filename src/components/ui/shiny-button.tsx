import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ShinyButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
}

/** A glossy blue gradient button with an accessible loading state. */
export function ShinyButton({
  children,
  className,
  disabled,
  isLoading = false,
  type = "button",
  ...props
}: ShinyButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        "group relative isolate inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl",
        "bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 px-6 py-2.5",
        "text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.28)]",
        "transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(34,211,238,0.42)]",
        "active:translate-y-0 active:scale-95 active:shadow-[0_0_18px_rgba(34,211,238,0.35)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_20px_rgba(37,99,235,0.28)]",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full group-focus-visible:translate-x-full"
      />
      <span className="pointer-events-none absolute inset-x-3 top-px h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      {isLoading && (
        <svg
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z"
          />
        </svg>
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

export default ShinyButton;

"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ButtonHTMLAttributes,
  CSSProperties,
  MouseEvent,
  ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface ShinyDotButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

interface DotBurst {
  id: number;
  x: number;
  y: number;
}

const DOT_COUNT = 10;

/** A glossy blue button with a small burst of dots at the click position. */
export function ShinyDotButton({
  children,
  className,
  disabled,
  onClick,
  type = "button",
  ...props
}: ShinyDotButtonProps) {
  const [burst, setBurst] = useState<DotBurst | null>(null);
  const nextBurstId = useRef(0);

  useEffect(() => {
    if (!burst) return;
    const timeout = window.setTimeout(() => setBurst(null), 700);
    return () => window.clearTimeout(timeout);
  }, [burst]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);

    if (event.defaultPrevented || disabled) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    setBurst({
      id: ++nextBurstId.current,
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "group relative isolate inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-xl",
        "bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-6 py-2.5",
        "text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]",
        "transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)]",
        "active:translate-y-0 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full group-focus-visible:translate-x-full"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-px h-px bg-gradient-to-r from-transparent via-white/75 to-transparent"
      />
      {burst && (
        <span
          key={burst.id}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          {Array.from({ length: DOT_COUNT }, (_, index) => {
            const angle = (index / DOT_COUNT) * Math.PI * 2;
            const distance = 28 + (index % 3) * 8;
            const style = {
              left: burst.x,
              top: burst.y,
              "--dot-x": `${Math.cos(angle) * distance}px`,
              "--dot-y": `${Math.sin(angle) * distance}px`,
              animationDelay: `${(index % 3) * 20}ms`,
            } as CSSProperties;

            return (
              <span
                key={index}
                className="shiny-dot-burst absolute size-1.5 rounded-full bg-cyan-100 shadow-[0_0_8px_2px_rgba(103,232,249,0.8)]"
                style={style}
              />
            );
          })}
        </span>
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export default ShinyDotButton;

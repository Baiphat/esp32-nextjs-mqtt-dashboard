"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

export interface ToastInput {
  kind: "success" | "error" | "info";
  title: string;
  description?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

type Push = (toast: ToastInput) => void;

const ToastContext = createContext<Push>(() => {});

export function useToast(): Push {
  return useContext(ToastContext);
}

const ICON = {
  success: { Icon: CircleCheck, tone: "bg-success/15 text-success" },
  error: { Icon: CircleAlert, tone: "bg-danger/15 text-danger" },
  info: { Icon: Info, tone: "bg-primary/15 text-primary" },
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const push = useCallback<Push>(
    (toast) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { ...toast, id }]);
      window.setTimeout(
        () => dismiss(id),
        toast.kind === "error" ? 6500 : 3500,
      );
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {items.map(({ id, kind, title, description }) => {
          const { Icon, tone } = ICON[kind];
          return (
            <div
              key={id}
              role={kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-2xl bg-surface-2 p-3 pr-2 shadow-2xl ring-1 ring-white/10"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full",
                  tone,
                )}
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1 py-0.5">
                <p className="text-sm font-medium text-white">{title}</p>
                {description && (
                  <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="ปิดการแจ้งเตือน"
                onClick={() => dismiss(id)}
                className="grid size-7 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-surface-3 hover:text-white"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

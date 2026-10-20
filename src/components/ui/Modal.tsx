"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** ใช้ <dialog> ของเบราว์เซอร์ จึงได้ focus trap และปุ่ม Esc มาฟรี */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[28px] bg-surface p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm open:animate-modal-in"
    >
      <div className="relative flex flex-col gap-5 p-6">
        <IconButton
          label="ปิด"
          onClick={onClose}
          className="absolute right-4 top-4 size-8"
        >
          <X aria-hidden className="size-4" />
        </IconButton>

        <header className="flex flex-col gap-3 pr-10">
          {icon && (
            <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-zinc-200">
              {icon}
            </div>
          )}
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-zinc-400">{description}</p>
            )}
          </div>
        </header>

        {children}

        {footer && <footer className="flex justify-end gap-2">{footer}</footer>}
      </div>
    </dialog>
  );
}

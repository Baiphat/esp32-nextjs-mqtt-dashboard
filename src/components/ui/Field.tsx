import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({
  label,
  hint,
  error,
  required,
  className,
  ...rest
}: FieldProps) {
  const id = useId();
  const describedBy = error || hint ? `${id}-desc` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-100">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-xl bg-surface-2 px-3.5 text-sm text-white placeholder:text-zinc-500",
          "outline-none transition focus:ring-2 focus:ring-primary",
          error && "ring-2 ring-danger focus:ring-danger",
          className,
        )}
        {...rest}
      />
      {(error || hint) && (
        <p
          id={describedBy}
          className={cn("text-xs", error ? "text-danger" : "text-zinc-500")}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

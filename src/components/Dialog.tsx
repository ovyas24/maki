import { useEffect } from "react";
import { cn } from "../lib/utils";

/** Minimal modal built on a fixed overlay; closes on Escape/backdrop click. */
export function Dialog({
  open,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal
        className={cn(
          "pop-in max-h-full w-full overflow-auto rounded-xl border border-border bg-bg-elevated p-5 shadow-lift",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-lg font-semibold">{children}</h2>;
}

export function DialogActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex flex-wrap justify-end gap-2">{children}</div>;
}

export function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      className={cn(
        "transition-fast inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium",
        variant === "primary" && "bg-accent text-accent-contrast hover:brightness-110",
        variant === "secondary" &&
          "border border-border bg-bg-elevated text-text hover:bg-bg-sunken",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-text-muted hover:bg-bg-sunken hover:text-text",
        className,
      )}
      {...props}
    />
  );
}

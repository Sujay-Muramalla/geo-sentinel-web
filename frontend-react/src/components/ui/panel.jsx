import { cn } from "@/lib/utils";

export function Panel({ className, ...props }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        "mb-4 flex items-start justify-between gap-3",
        className
      )}
      {...props}
    />
  );
}

export function PanelTitle({ className, ...props }) {
  return (
    <h2
      className={cn("text-sm font-semibold uppercase tracking-[0.2em] text-slate-300", className)}
      {...props}
    />
  );
}

export function PanelDescription({ className, ...props }) {
  return (
    <p className={cn("text-sm text-slate-400", className)} {...props} />
  );
}
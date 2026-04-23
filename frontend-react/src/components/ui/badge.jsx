import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-800 text-slate-200 border border-slate-700",
  cyan: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30",
  green: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 border border-amber-500/30",
  rose: "bg-rose-500/10 text-rose-300 border border-rose-500/30",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Intelligence Console", active: true },
  { label: "Signals Feed", active: false },
  { label: "Reports Vault", active: false },
  { label: "Regional Monitor", active: false },
  { label: "Source Registry", active: false },
  { label: "System Status", active: false },
];

export function Sidebar({ className }) {
  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col rounded-3xl border border-slate-800 bg-slate-950/80 p-5",
        className
      )}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30">
            GS
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Geo-Sentinel</p>
            <p className="text-xs text-slate-400">Intelligence Platform</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Badge variant="cyan">Simple-first delivery</Badge>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition",
              item.active
                ? "bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-500/25"
                : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
            )}
          >
            <span>{item.label}</span>
            {item.active ? <span className="text-xs">LIVE</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
          Backend status
        </p>
        <p className="mt-2 text-sm font-medium text-slate-200">Offline by design</p>
        <p className="mt-1 text-sm text-slate-400">
          Cost-saving mode active. GEO-47B focuses on shell and UI primitives only.
        </p>
      </div>
    </aside>
  );
}
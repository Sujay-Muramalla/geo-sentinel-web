import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { id: "intelligence-console", label: "Intelligence Console", status: "LIVE" },
  { id: "signals-feed", label: "Signals Feed", status: "NEW" },
  { id: "reports-vault", label: "Reports Vault", status: "READY" },
  { id: "regional-monitor", label: "Regional Monitor", status: "READY" },
  { id: "source-registry", label: "Source Registry", status: "READY" },
  { id: "system-status", label: "System Status", status: "READY" },
];

export function Sidebar({ className, activeView, onNavigate }) {
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
        {NAV_ITEMS.map((item) => {
          const active = item.id === activeView;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition",
                active
                  ? "bg-cyan-500/12 text-cyan-300 ring-1 ring-cyan-500/25"
                  : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <span>{item.label}</span>
              {active ? <span className="text-xs">{item.status}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
          Backend status
        </p>
        <p className="mt-2 text-sm font-medium text-slate-200">
          Cost-aware runtime
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Backend and ALB stay off unless validation requires them.
        </p>
      </div>
    </aside>
  );
}
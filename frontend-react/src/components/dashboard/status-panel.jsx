import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

function formatTimestamp(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function StatusPanel({
  loading,
  errorMessage,
  hasResults,
  requestMeta,
  stats,
}) {
  const stateLabel = loading
    ? "Loading"
    : errorMessage
    ? "Backend offline / request failed"
    : hasResults
    ? "Results loaded"
    : "Idle";

  return (
    <Panel className="p-5">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Mission status
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            Query execution telemetry
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-400">Current state</span>
            <Badge>{stateLabel}</Badge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total results</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{stats?.total ?? 0}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last query time</p>
            <p className="mt-2 text-sm font-medium text-slate-100">
              {formatTimestamp(requestMeta?.timestamp)}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Sentiment mix</h3>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Positive</span>
            <span className="text-slate-100">{stats?.positive ?? 0}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Neutral</span>
            <span className="text-slate-100">{stats?.neutral ?? 0}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Negative</span>
            <span className="text-slate-100">{stats?.negative ?? 0}</span>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Backend contract note</h3>
          <p className="text-sm leading-6 text-slate-400">
            GEO-47C only connects the React shell to the existing API shape. Backend logic,
            infrastructure, and simple-first architecture remain unchanged.
          </p>
        </div>

        {requestMeta?.requestedScenario ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Last requested scenario</h3>
            <p className="text-sm leading-6 text-slate-400">
              {requestMeta.requestedScenario}
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
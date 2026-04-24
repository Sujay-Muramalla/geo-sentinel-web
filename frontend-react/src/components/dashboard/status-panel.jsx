import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

function formatTimestamp(value) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function stateDetails({ loading, errorMessage, hasResults }) {
  if (loading) {
    return {
      label: "Generating",
      className: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
      message: "Frontend request is in progress. Waiting for the backend intelligence payload.",
    };
  }

  if (errorMessage) {
    return {
      label: "Backend unavailable",
      className: "border-red-400/40 bg-red-400/10 text-red-200",
      message:
        "The frontend is healthy, but the backend is unreachable or returned an error. This is expected when EC2 is destroyed for cost saving.",
    };
  }

  if (hasResults) {
    return {
      label: "Live results loaded",
      className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
      message: "The dashboard is rendering real results from the backend API contract.",
    };
  }

  return {
    label: "Ready",
    className: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    message: "Enter a scenario to query the backend. Backend may be offline until recreated for validation.",
  };
}

function SentimentStat({ label, value, tone }) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-400/40 bg-emerald-400/10"
      : tone === "negative"
      ? "border-red-400/40 bg-red-400/10"
      : "border-amber-400/40 bg-amber-400/10";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-white/70">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value ?? 0}</p>
    </div>
  );
}

export function StatusPanel({
  loading,
  errorMessage,
  hasResults,
  requestMeta,
  stats,
}) {
  const currentState = stateDetails({ loading, errorMessage, hasResults });

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
            <Badge className={currentState.className}>{currentState.label}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {currentState.message}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Total rendered results
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">
              {stats?.total ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Last request time
            </p>
            <p className="mt-2 text-sm font-medium text-slate-100">
              {formatTimestamp(requestMeta?.timestamp)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-100">Sentiment mix</h3>

          <div className="grid gap-3">
            <SentimentStat label="Positive" value={stats?.positive} tone="positive" />
            <SentimentStat label="Neutral" value={stats?.neutral} tone="neutral" />
            <SentimentStat label="Negative" value={stats?.negative} tone="negative" />
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Backend contract note</h3>
          <p className="text-sm leading-6 text-slate-400">
            React now sends the real backend payload fields: query, scope, countries,
            mediaType, publicationFocus, sentiment, and sort. GEO-47E only improves
            presentation and keeps backend behavior unchanged.
          </p>
        </div>

        {requestMeta?.requestedScenario ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Last requested scenario
            </h3>
            <p className="text-sm leading-6 text-slate-400">
              {requestMeta.requestedScenario}
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
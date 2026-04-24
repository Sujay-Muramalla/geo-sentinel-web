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
      label: "Backend unavailable / no matches",
      className: "border-red-400/40 bg-red-400/10 text-red-200",
      message:
        "The frontend is healthy. Either the backend is offline for cost saving, or the live worker returned zero qualified matches.",
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

function cleanValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatPercent(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) return "—";
  if (score > 0 && score <= 1) return `${Math.round(score * 100)}%`;
  if (score > 0 && score <= 10) return `${Math.round(score * 10)}%`;

  return `${Math.round(Math.min(score, 100))}%`;
}

function SourceCoverageCard({ source }) {
  const name = source?.name || source?.source || source?.label || "Unknown source";
  const country = source?.country || source?.sourceCountry || "—";
  const region = source?.region || source?.sourceRegion || "—";
  const reliability =
    source?.reliabilityScore ??
    source?.reliability_score ??
    source?.sourceReliability ??
    source?.qualityScore;

  const categories = Array.isArray(source?.categories) ? source.categories : [];
  const coverage = Array.isArray(source?.coverage) ? source.coverage : [];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{name}</h4>
          <p className="mt-1 text-xs text-slate-500">
            {cleanValue(country)} · {cleanValue(region)}
          </p>
        </div>

        <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
          {formatPercent(reliability)}
        </Badge>
      </div>

      {coverage.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {coverage.slice(0, 5).map((item) => (
            <span
              key={`${name}-coverage-${item}`}
              className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[0.7rem] text-cyan-200"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {categories.length > 0 ? (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Focus: {categories.slice(0, 4).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function StatusPanel({
  loading,
  errorMessage,
  hasResults,
  requestMeta,
  stats,
  sourceTransparency,
}) {
  const currentState = stateDetails({ loading, errorMessage, hasResults });
  const selectedSources = sourceTransparency?.selectedSources || [];
  const counts = sourceTransparency?.counts || {};
  const appliedFilters = sourceTransparency?.appliedFilters || {};
  const selectedSourceCount = selectedSources.length;

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

        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Source coverage
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">
              {selectedSourceCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              selected source(s) from the backend registry
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
                Raw
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {counts.raw ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
                Filtered
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {counts.filtered ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
                Returned
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {counts.returned ?? 0}
              </p>
            </div>
          </div>
        </div>

        {selectedSources.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Selected source registry
            </h3>

            <div className="grid gap-3">
              {selectedSources.slice(0, 6).map((source, index) => (
                <SourceCoverageCard
                  key={`${source?.name || source?.source || "source"}-${index}`}
                  source={source}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-100">Sentiment mix</h3>

          <div className="grid gap-3">
            <SentimentStat label="Positive" value={stats?.positive} tone="positive" />
            <SentimentStat label="Neutral" value={stats?.neutral} tone="neutral" />
            <SentimentStat label="Negative" value={stats?.negative} tone="negative" />
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Applied filters</h3>
          <p className="text-sm leading-6 text-slate-400">
            Regions: {(appliedFilters?.regions || []).join(", ") || "—"}
          </p>
          <p className="text-sm leading-6 text-slate-400">
            Countries: {(appliedFilters?.countries || []).join(", ") || "—"}
          </p>
          <p className="text-sm leading-6 text-slate-400">
            Sentiment: {appliedFilters?.sentimentFilter || "all"}
          </p>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h3 className="text-sm font-semibold text-slate-100">Backend contract note</h3>
          <p className="text-sm leading-6 text-slate-400">
            GEO-47H exposes backend transparency fields from the source registry:
            selected sources, source coverage, reliability signals, counts, filters,
            and ranking reasons. Backend behavior remains unchanged.
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
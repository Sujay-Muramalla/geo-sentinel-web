import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

function formatTimestamp(value) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function normalizeMessage(value) {
  return String(value || "").toLowerCase();
}

function isBackendUnavailableMessage(message) {
  const text = normalizeMessage(message);

  return (
    text.includes("failed to fetch") ||
    text.includes("networkerror") ||
    text.includes("unreachable") ||
    text.includes("temporarily unavailable") ||
    text.includes("backend is offline") ||
    text.includes("cost control") ||
    text.includes("cost-saving")
  );
}

function isNoResultMessage(message) {
  const text = normalizeMessage(message);

  return (
    text.includes("no qualified intelligence") ||
    text.includes("no qualified signals") ||
    text.includes("no result") ||
    text.includes("no source met") ||
    text.includes("no strong intelligence signal")
  );
}

function stateDetails({ loading, errorMessage, hasResults, noResultExplanation }) {
  const noQualifiedMatches =
    noResultExplanation?.status === "no-qualified-matches" ||
    isNoResultMessage(errorMessage);

  if (loading) {
    return {
      label: "Analyzing",
      className: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200",
      message:
        "Geo-Sentinel is reviewing source coverage and preparing the intelligence view.",
    };
  }

  if (hasResults) {
    return {
      label: "Signals ready",
      className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
      message: "Ranked intelligence signals are loaded for the current scenario.",
    };
  }

  if (noQualifiedMatches) {
    return {
      label: "No qualified signals",
      className: "border-amber-400/40 bg-amber-400/10 text-amber-200",
      message:
        noResultExplanation?.message ||
        "The source review completed, but no result met the current intelligence criteria.",
    };
  }

  if (errorMessage && isBackendUnavailableMessage(errorMessage)) {
    return {
      label: "Backend offline",
      className: "border-red-400/40 bg-red-400/10 text-red-200",
      message:
        "The frontend is online, but the live intelligence backend is currently offline for cost-saving mode.",
    };
  }

  if (errorMessage) {
    return {
      label: "Analysis incomplete",
      className: "border-amber-400/40 bg-amber-400/10 text-amber-200",
      message:
        "Geo-Sentinel could not complete this analysis run. Adjust the scenario or retry after validation.",
    };
  }

  return {
    label: "Ready",
    className: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    message: "Enter a scenario to generate geopolitical intelligence signals.",
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
  const qualityScore =
    source?.sourceQualityScore ??
    source?.reliabilityScore ??
    source?.reliability_score ??
    source?.sourceReliability ??
    source?.qualityScore;
  const sourceQuality = source?.sourceQuality || source?.tier || "standard";

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

        <div className="flex flex-col items-end gap-2">
          <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
            {formatPercent(qualityScore)}
          </Badge>
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
            {sourceQuality}
          </span>
        </div>
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

function RawReturnedExplainer({ counts }) {
  const raw =
    counts?.rawItemsSeen ??
    counts?.raw ??
    counts?.sourceItemsReviewed ??
    counts?.reviewed ??
    0;
  const returned = counts?.returned ?? 0;
  const filteredOut =
    counts?.filteredOut ??
    Math.max(0, Number(raw || 0) - Number(returned || 0));

  return (
    <div className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
        Review funnel
      </p>
      <h3 className="mt-2 text-sm font-semibold text-slate-100">
        Raw signals versus visible results
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Geo-Sentinel may review many source items but only show cards that pass the
        active scenario, region, source, recency, and ranking criteria.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">
            Reviewed
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{raw}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">
            Filtered
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            {filteredOut}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-emerald-200/80">
            Shown
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-100">
            {returned}
          </p>
        </div>
      </div>
    </div>
  );
}

function TrustNotes({ hasResults, noResultExplanation }) {
  const suggestions = Array.isArray(noResultExplanation?.suggestions)
    ? noResultExplanation.suggestions
    : [];

  if (hasResults) {
    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Interpretation note
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Visible cards are the strongest ranked results from the current run. Fewer cards
          can mean stronger filtering, not necessarily weak source coverage.
        </p>
      </div>
    );
  }

  if (!noResultExplanation) return null;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
        No-result guidance
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        The backend completed the source review, but no article passed the current
        ranking and filter threshold.
      </p>

      {suggestions.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {suggestions.slice(0, 3).map((suggestion) => (
            <li key={suggestion} className="flex gap-2 text-sm leading-5 text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Try broadening the region, clearing country filters, or using a wider scenario phrase.
        </p>
      )}
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
  const selectedSources = sourceTransparency?.selectedSources || [];
  const appliedFilters = sourceTransparency?.appliedFilters || {};
  const noResultExplanation = sourceTransparency?.noResultExplanation || null;
  const selectedSourceCount = selectedSources.length;
  const counts = sourceTransparency?.counts || {};

  const currentState = stateDetails({
    loading,
    errorMessage,
    hasResults,
    noResultExplanation,
  });

  return (
    <Panel className="p-5">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Intelligence summary
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">
            Current scenario overview
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A compact view of signal volume, source coverage, sentiment, ranking
            transparency, and filters for the active intelligence run.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-400">Status</span>
            <Badge className={currentState.className}>{currentState.label}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {currentState.message}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Signals shown
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">
              {stats?.total ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Last analysis
            </p>
            <p className="mt-2 text-sm font-medium text-slate-100">
              {formatTimestamp(requestMeta?.timestamp)}
            </p>
          </div>
        </div>

        <RawReturnedExplainer counts={counts} />

        <TrustNotes
          hasResults={hasResults}
          noResultExplanation={noResultExplanation}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Sources considered
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">
            {selectedSourceCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            source(s) matched to this scenario
          </p>
        </div>

        {selectedSources.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">
              Source coverage
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
          <h3 className="text-sm font-semibold text-slate-100">Active filters</h3>
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

        {requestMeta?.requestedScenario ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Scenario</h3>
            <p className="text-sm leading-6 text-slate-400">
              {requestMeta.requestedScenario}
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
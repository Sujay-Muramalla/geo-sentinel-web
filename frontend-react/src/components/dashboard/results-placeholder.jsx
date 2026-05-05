import { Panel } from "@/components/ui/panel";

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

export function ResultsPlaceholder({
  loading,
  errorMessage,
  noResultExplanation,
  counts,
  expandedQueries = [],
}) {
  const hasNoQualifiedMatches =
    !loading &&
    (noResultExplanation?.status === "no-qualified-matches" ||
      isNoResultMessage(errorMessage));

  const hasBackendUnavailable =
    !loading && errorMessage && !hasNoQualifiedMatches && isBackendUnavailableMessage(errorMessage);

  const reviewedSourceCount =
    Number(counts?.rawItemsSeen || counts?.raw || counts?.filtered || 0) || 0;

  const suggestions =
    Array.isArray(noResultExplanation?.suggestions) &&
    noResultExplanation.suggestions.length > 0
      ? noResultExplanation.suggestions
      : [
          "Broaden the geographic scope.",
          "Remove country-specific filters.",
          "Try a wider scenario phrase.",
          "Switch sentiment filter back to all.",
        ];

  return (
    <Panel className="p-8">
      <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
        {loading ? (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              Analyzing scenario
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Geo-Sentinel is collecting source signals and preparing the intelligence view.
            </p>
          </>
        ) : hasBackendUnavailable ? (
          <>
            <div className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200">
              Backend unavailable
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              Live backend is currently offline
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              The frontend is available, but the intelligence API is not reachable right now.
              This usually means the EC2 backend and ALB are turned off for cost-saving mode.
            </p>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500">
              Turn on the backend validation stack when you want to test live intelligence generation.
            </p>
          </>
        ) : hasNoQualifiedMatches ? (
          <>
            <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
              No qualified signals
            </div>

            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              No strong intelligence signal matched this scenario
            </h3>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {noResultExplanation?.message ||
                "Geo-Sentinel completed the source review, but no result met the current scenario, region, sentiment, and quality criteria."}
            </p>

            {reviewedSourceCount > 0 ? (
              <p className="mt-3 text-xs text-slate-500">
                Reviewed approximately {reviewedSourceCount} source item(s) before filtering.
              </p>
            ) : null}

            <div className="mt-5 max-w-2xl text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Suggested next searches
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>• {suggestion}</li>
                ))}
              </ul>
            </div>

            {expandedQueries.length > 0 ? (
              <div className="mt-5 max-w-2xl text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Scenario variants checked
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {expandedQueries.slice(0, 5).map((query) => (
                    <span
                      key={query}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                    >
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : errorMessage ? (
          <>
            <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
              Analysis incomplete
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              Geo-Sentinel could not complete this run
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {errorMessage}
            </p>
          </>
        ) : (
          <>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
              Ready
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              Submit a scenario to generate intelligence cards
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Enter a geopolitical scenario and Geo-Sentinel will rank relevant source signals,
              sentiment, and regional indicators.
            </p>
          </>
        )}
      </div>
    </Panel>
  );
}
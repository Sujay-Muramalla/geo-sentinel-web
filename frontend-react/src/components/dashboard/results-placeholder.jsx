import { Panel } from "@/components/ui/panel";

export function ResultsPlaceholder({
  loading,
  errorMessage,
  noResultExplanation,
}) {
  const hasNoQualifiedMatches =
    !loading && !errorMessage && noResultExplanation?.status === "no-qualified-matches";

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
        ) : errorMessage ? (
          <>
            <div className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200">
              Intelligence unavailable
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              No results available right now
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {errorMessage}
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
                "Geo-Sentinel reviewed the available sources, but no result met the current intelligence criteria."}
            </p>

            {Array.isArray(noResultExplanation?.suggestions) &&
            noResultExplanation.suggestions.length > 0 ? (
              <div className="mt-5 max-w-2xl text-left">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Suggested next searches
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-400">
                  {noResultExplanation.suggestions.map((suggestion) => (
                    <li key={suggestion}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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
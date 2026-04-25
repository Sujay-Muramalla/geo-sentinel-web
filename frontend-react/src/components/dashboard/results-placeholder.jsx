import { Panel } from "@/components/ui/panel";

export function ResultsPlaceholder({
  loading,
  errorMessage,
  noResultExplanation,
  counts,
  expandedQueries = [],
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
              Request in progress
            </h3>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              The React frontend is waiting for the backend intelligence response.
            </p>
          </>
        ) : errorMessage ? (
          <>
            <div className="rounded-full border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200">
              API unavailable
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              No live results to show yet
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">{errorMessage}</p>
          </>
        ) : hasNoQualifiedMatches ? (
          <>
            <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200">
              No qualified matches
            </div>

            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              The backend searched live sources, but no article passed the intelligence filters
            </h3>

            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {noResultExplanation.message}
            </p>

            <div className="mt-5 grid w-full max-w-2xl grid-cols-3 gap-3 text-left">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Raw</p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  {counts?.rawItemsSeen ?? counts?.raw ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Filtered out</p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  {counts?.filteredOut ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Returned</p>
                <p className="mt-1 text-lg font-semibold text-slate-100">
                  {counts?.returned ?? 0}
                </p>
              </div>
            </div>

            {expandedQueries.length > 0 ? (
              <div className="mt-5 max-w-2xl">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Query variants tried
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {expandedQueries.map((query) => (
                    <span
                      key={query}
                      className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100"
                    >
                      {query}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {Array.isArray(noResultExplanation.suggestions) &&
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
              Ready for live integration
            </div>
            <h3 className="mt-5 text-xl font-semibold text-slate-100">
              Submit a scenario to generate intelligence cards
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              This panel will render real API results once the backend is turned on and reachable.
              Until then, the frontend remains fully usable and gracefully handles downtime.
            </p>
          </>
        )}
      </div>
    </Panel>
  );
}
import { ResultCard } from "@/components/dashboard/result-card";

export function ResultsList({
  results = [],
  loading = false,
  reportQueryHash = "",
  onRegenerateReport,
  regeneratingReport = false,
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Live output
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-100">
            Intelligence results
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cleaned, ranked, explained, and rendered from the active backend response.
          </p>
        </div>

        {loading || regeneratingReport ? (
          <span className="text-sm text-slate-400">
            {regeneratingReport ? "Regenerating report…" : "Refreshing…"}
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
            {results.length} item(s)
          </span>
        )}
      </div>

      <div className="grid gap-4">
        {results.map((result) => (
          <ResultCard
            key={result.id}
            result={result}
            reportQueryHash={reportQueryHash}
            onRegenerateReport={onRegenerateReport}
            regeneratingReport={regeneratingReport}
          />
        ))}
      </div>
    </section>
  );
}
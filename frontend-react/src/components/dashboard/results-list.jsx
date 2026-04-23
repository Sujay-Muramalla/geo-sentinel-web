import { ResultCard } from "@/components/dashboard/result-card";

export function ResultsList({ results = [], loading = false }) {
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
        </div>

        {loading ? (
          <span className="text-sm text-slate-400">Refreshing…</span>
        ) : (
          <span className="text-sm text-slate-400">{results.length} item(s)</span>
        )}
      </div>

      <div className="grid gap-4">
        {results.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </div>
    </section>
  );
}
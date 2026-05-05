import { ResultCard } from "@/components/dashboard/result-card";

function ScoreTrustGuide() {
  return (
    <div className="rounded-3xl border border-violet-400/20 bg-violet-400/[0.04] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300">
            How ranking works
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">
            Signals are prioritized, not declared absolute truth
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Geo-Sentinel ranks each visible card using topic relevance, geographic fit,
            source confidence, recency, sentiment framing, and scenario expansion. The
            score helps analysts decide what to review first.
          </p>
        </div>

        <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3 lg:min-w-[360px]">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
            <p className="font-semibold text-emerald-100">75+</p>
            <p className="mt-1">High-confidence signal</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
            <p className="font-semibold text-amber-100">45–74</p>
            <p className="mt-1">Moderate context signal</p>
          </div>
          <div className="rounded-2xl border border-slate-400/20 bg-slate-400/10 p-3">
            <p className="font-semibold text-slate-100">&lt;45</p>
            <p className="mt-1">Weak supporting context</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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

      <ScoreTrustGuide />

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
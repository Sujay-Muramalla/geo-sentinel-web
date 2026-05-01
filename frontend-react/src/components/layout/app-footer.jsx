export function AppFooter() {
  return (
    <footer className="rounded-3xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-sm text-slate-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold text-slate-300">Geo-Sentinel</p>
          <p className="mt-1">
            AWS-hosted geopolitical intelligence platform · SIMPLE architecture ·
            cost-aware validation.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          <span>Reports</span>
          <span>Sources</span>
          <span>Status</span>
          <span>Roadmap</span>
        </div>
      </div>
    </footer>
  );
}
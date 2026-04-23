import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
          Geopolitical Intelligence Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          React Dashboard Shell
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          A dark, analyst-friendly command surface for scenario exploration,
          source comparison, and report-oriented workflows.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="green">UI foundation active</Badge>
        <Badge variant="amber">Backend offline</Badge>
        <Button variant="outline">Preview Layout</Button>
      </div>
    </header>
  );
}
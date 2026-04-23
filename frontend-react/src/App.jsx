import { AppShell } from "@/components/layout/app-shell";
import { QueryPanel } from "@/components/dashboard/query-panel";
import { ResultsPlaceholder } from "@/components/dashboard/results-placeholder";
import { StatusPanel } from "@/components/dashboard/status-panel";

export default function App() {
  return (
    <AppShell>
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <QueryPanel />
        <StatusPanel />
      </section>

      <section>
        <ResultsPlaceholder />
      </section>
    </AppShell>
  );
}
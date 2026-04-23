import { Badge } from "@/components/ui/badge";
import { Panel, PanelDescription, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";

const items = [
  { label: "Frontend shell", value: "Active", variant: "green" },
  { label: "Backend API", value: "Offline", variant: "amber" },
  { label: "Worker runtime", value: "Offline", variant: "amber" },
  { label: "Storage", value: "Deferred", variant: "rose" },
];

export function StatusPanel() {
  return (
    <Panel className="h-full">
      <PanelHeader className="flex-col items-start">
        <div>
          <PanelTitle>Operational Snapshot</PanelTitle>
          <PanelDescription className="mt-2">
            Story-aware status block for the simple-first roadmap.
          </PanelDescription>
        </div>
      </PanelHeader>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-500">GEO-47B placeholder status</p>
              </div>
              <Badge variant={item.variant}>{item.value}</Badge>
            </div>
            {index < items.length - 1 ? <Separator className="mt-4" /> : null}
          </div>
        ))}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Next expected integration
          </p>
          <p className="mt-2 text-sm text-slate-300">
            Hook query form into the existing backend contract without changing the simple architecture path.
          </p>
        </div>
      </div>
    </Panel>
  );
}
import { ExampleChips } from "@/components/dashboard/example-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelDescription, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";

export function QueryPanel() {
  return (
    <Panel className="h-full">
      <PanelHeader className="flex-col items-start">
        <div>
          <PanelTitle>Intelligence Query Console</PanelTitle>
          <PanelDescription className="mt-2">
            GEO-47B shell-only version. Form layout is ready for later backend integration.
          </PanelDescription>
        </div>
      </PanelHeader>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-300">Scenario title</label>
          <Input placeholder="e.g. Taiwan semiconductor disruption" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-300">Focus region</label>
          <Input placeholder="e.g. Asia-Pacific" />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-300">Intelligence brief</label>
          <Textarea placeholder="Describe the event, actors, implications, and what sentiment or narrative divergence you want to inspect." />
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium text-slate-300">Example scenarios</p>
          <ExampleChips />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button>Generate Intelligence</Button>
          <Button variant="secondary">Save Draft</Button>
          <Button variant="ghost">Reset</Button>
        </div>
      </div>
    </Panel>
  );
}
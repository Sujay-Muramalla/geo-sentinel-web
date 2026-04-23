import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Panel, PanelDescription, PanelHeader, PanelTitle } from "@/components/ui/panel";
  
  const sampleCards = [
    {
      title: "Narrative divergence detected",
      description:
        "Regional framing is expected to vary significantly between Western, Chinese, and local Taiwanese sources.",
      badge: "Signal",
      variant: "cyan",
    },
    {
      title: "Source spread placeholder",
      description:
        "Future integration will render multi-source cards with sentiment, recency, influence, and geographic alignment.",
      badge: "Sources",
      variant: "green",
    },
    {
      title: "Report generation target",
      description:
        "This area will later support downloadable intelligence summaries and premium workflows.",
      badge: "Reports",
      variant: "amber",
    },
  ];
  
  export function ResultsPlaceholder() {
    return (
      <Panel className="h-full">
        <PanelHeader className="flex-col items-start">
          <div>
            <PanelTitle>Results Surface</PanelTitle>
            <PanelDescription className="mt-2">
              Placeholder cards now, live intelligence cards later.
            </PanelDescription>
          </div>
        </PanelHeader>
  
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sampleCards.map((card) => (
            <Card key={card.title} className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{card.title}</CardTitle>
                  <Badge variant={card.variant}>{card.badge}</Badge>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-400">
                  Future data widgets, result summaries, source metadata, and sentiment views will land here.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Panel>
    );
  }
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function sentimentLabel(sentiment) {
  const normalized = String(sentiment || "neutral").toLowerCase();

  if (normalized === "positive") return "Positive";
  if (normalized === "negative") return "Negative";
  return "Neutral";
}

function safeDate(value) {
  if (!value) return "Unknown time";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function scoreLabel(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "0.0";
  return score.toFixed(1);
}

export function ResultCard({ result }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge>{sentimentLabel(result.sentiment)}</Badge>
              {result.region ? <Badge>{result.region}</Badge> : null}
              <Badge>Score {scoreLabel(result.score)}</Badge>
            </div>

            <h3 className="text-lg font-semibold leading-tight text-slate-100">
              {result.title}
            </h3>

            <p className="text-sm text-slate-400">
              {result.source} · {safeDate(result.publishedAt)}
            </p>
          </div>
        </div>

        <p className="text-sm leading-6 text-slate-300">{result.summary}</p>

        <div>
          <a
            href={result.url || "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
          >
            Open source article
          </a>
        </div>
      </div>
    </Card>
  );
}
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SUMMARY_LIMIT = 360;

function sentimentLabel(sentiment) {
  const normalized = String(sentiment || "neutral").toLowerCase();

  if (normalized === "positive") return "Positive";
  if (normalized === "negative") return "Negative";
  return "Neutral";
}

function sentimentBadgeClass(sentiment) {
  const normalized = String(sentiment || "neutral").toLowerCase();

  if (normalized === "positive") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized === "negative") {
    return "border-red-400/40 bg-red-400/10 text-red-200";
  }

  return "border-amber-400/40 bg-amber-400/10 text-amber-200";
}

function safeDate(value) {
  if (!value) return "Unknown time";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function scoreLabel(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "0.0";
  return score.toFixed(1);
}

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value, limit = SUMMARY_LIMIT) {
  const cleaned = cleanText(value);

  if (!cleaned) return "No clean summary was returned for this result.";
  if (cleaned.length <= limit) return cleaned;

  return `${cleaned.slice(0, limit).trim()}…`;
}

function sourceLine(result) {
  const source = cleanText(result.source) || "Unknown source";
  const country = cleanText(result.sourceCountry || result.country);

  return country ? `${source} · ${country}` : source;
}

function getScoreTone(score) {
  if (score >= 75) return "text-emerald-200";
  if (score >= 45) return "text-amber-200";
  return "text-slate-300";
}

export function ResultCard({ result }) {
  const summary = truncateText(result.summary);
  const sourceMeta = sourceLine(result);
  const region = cleanText(result.region || result.sourceRegion);
  const score = Number(result.score) || 0;

  return (
    <Card className="overflow-hidden p-0">
      <article className="flex flex-col gap-0">
        <div className="border-b border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className={sentimentBadgeClass(result.sentiment)}>
                  {sentimentLabel(result.sentiment)}
                </Badge>

                {region ? (
                  <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                    {region}
                  </Badge>
                ) : null}

                <Badge className="border-white/10 bg-slate-950/60 text-slate-200">
                  Signal {scoreLabel(score)}
                </Badge>
              </div>

              <h3 className="text-lg font-semibold leading-snug text-slate-100">
                {cleanText(result.title) || "Untitled result"}
              </h3>

              <p className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">{sourceMeta}</span>
                <span className="mx-2 text-slate-600">•</span>
                {safeDate(result.publishedAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-right">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
                Relevance
              </p>
              <p className={`mt-1 text-2xl font-semibold ${getScoreTone(score)}`}>
                {scoreLabel(score)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <p className="text-sm leading-6 text-slate-300">{summary}</p>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500">
              Live RSS intelligence result · cleaned for dashboard display
            </p>

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
      </article>
    </Card>
  );
}
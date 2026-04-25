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
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return "0.0";
  return numeric.toFixed(1);
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
  const region = cleanText(result.sourceRegion || result.region);

  if (country && region) return `${source} · ${country} · ${region}`;
  if (country) return `${source} · ${country}`;
  if (region) return `${source} · ${region}`;

  return source;
}

function getScoreTone(score) {
  const numeric = Number(score);

  if (numeric >= 75) return "text-emerald-200";
  if (numeric >= 45) return "text-amber-200";
  return "text-slate-300";
}

function normalizeSignal(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return null;
  if (numeric > 0 && numeric <= 1) return numeric * 100;
  if (numeric > 0 && numeric <= 10) return numeric * 10;

  return numeric;
}

function signalLabel(value) {
  const score = normalizeSignal(value);

  if (score === null) return "—";
  return `${Math.round(Math.min(score, 100))}%`;
}

function signalTone(value) {
  const score = normalizeSignal(value);

  if (!Number.isFinite(score)) return "bg-slate-500/20";
  if (score >= 70) return "bg-emerald-400/70";
  if (score >= 45) return "bg-amber-400/70";
  return "bg-slate-400/60";
}

function RankingSignal({ label, value }) {
  const score = normalizeSignal(value);
  const width = Number.isFinite(score) ? Math.max(6, Math.min(score, 100)) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-medium text-slate-200">{signalLabel(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${signalTone(value)}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function sourceQualityLabel(result) {
  return cleanText(result.sourceQuality || result.sourceTier || "standard");
}

function sourceQualityBadgeClass(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "elite" || normalized === "top") {
    return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized === "high") {
    return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200";
  }

  if (normalized === "limited") {
    return "border-slate-400/30 bg-slate-400/10 text-slate-200";
  }

  return "border-amber-400/30 bg-amber-400/10 text-amber-200";
}

function getRankingSignals(result) {
  const fallbackSignals = result.rankingSignals || {};

  return {
    queryRelevance:
      result.queryMatchScore ??
      result.queryRelevance ??
      fallbackSignals.queryRelevance,
    geoAlignment:
      result.geoAlignmentScore ??
      result.geoAlignment ??
      fallbackSignals.geoAlignment,
    sourceQuality:
      result.sourceQualityScore ??
      fallbackSignals.sourceQuality,
    recency:
      result.recencyScore ??
      fallbackSignals.recency,
  };
}

export function ResultCard({ result }) {
  const summary = truncateText(result.summary);
  const sourceMeta = sourceLine(result);
  const region = cleanText(result.sourceRegion || result.region);
  const score = Number(result.signalScore ?? result.finalScore ?? result.score) || 0;
  const rankingSignals = getRankingSignals(result);
  const qualityLabel = sourceQualityLabel(result);
  const matchedQuery = cleanText(result.matchedQuery);
  const expandedQueryUsed = Boolean(result.expandedQueryUsed);
  const sourceTier = cleanText(result.sourceTier);

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

                <Badge className={sourceQualityBadgeClass(qualityLabel)}>
                  Source {qualityLabel}
                </Badge>

                {sourceTier ? (
                  <Badge className="border-white/10 bg-slate-950/60 text-slate-200">
                    Tier {sourceTier}
                  </Badge>
                ) : null}

                <Badge className="border-white/10 bg-slate-950/60 text-slate-200">
                  Signal {scoreLabel(score)}
                </Badge>

                {expandedQueryUsed ? (
                  <Badge className="border-violet-400/30 bg-violet-400/10 text-violet-200">
                    Expanded query match
                  </Badge>
                ) : null}
              </div>

              <h3 className="text-lg font-semibold leading-snug text-slate-100">
                {cleanText(result.title) || "Untitled result"}
              </h3>

              <p className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">{sourceMeta}</span>
                <span className="mx-2 text-slate-600">•</span>
                {safeDate(result.publishedAt)}
              </p>

              {matchedQuery ? (
                <p className="text-xs text-slate-500">
                  Matched query:{" "}
                  <span className="text-cyan-200">{matchedQuery}</span>
                </p>
              ) : null}
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

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  Ranking explanation
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Why this article was promoted by the intelligence engine.
                </p>
              </div>
              <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                Transparent scoring
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RankingSignal
                label="Query relevance"
                value={rankingSignals.queryRelevance}
              />
              <RankingSignal
                label="Geo alignment"
                value={rankingSignals.geoAlignment}
              />
              <RankingSignal
                label="Source quality"
                value={rankingSignals.sourceQuality}
              />
              <RankingSignal label="Recency" value={rankingSignals.recency} />
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
                Source country
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {cleanText(result.sourceCountry) || "—"}
              </p>
            </div>

            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
                Source quality
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {qualityLabel}
              </p>
            </div>

            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
                Publication focus
              </p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {cleanText(result.publicationFocus) || "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500">
              Live RSS intelligence result · GEO-47I query expansion and transparency enabled
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
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchReportByQueryHash,
  fetchReportItemPdfByResultId,
  isRecoverableReportError,
} from "@/lib/api";

const SUMMARY_LIMIT = 380;

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
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
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

function compactSentence(value, limit = SUMMARY_LIMIT) {
  const cleaned = cleanText(value);

  if (!cleaned) return "";
  if (cleaned.length <= limit) return cleaned;

  const sentenceMatch = cleaned
    .slice(0, limit + 80)
    .match(/^(.+?[.!?])\s+[A-Z0-9]/);

  if (sentenceMatch?.[1] && sentenceMatch[1].length >= 80) {
    return sentenceMatch[1];
  }

  return `${cleaned.slice(0, limit).replace(/\s+\S*$/, "").trim()}…`;
}

function buildSummary(result) {
  const candidates = [
    result.summary,
    result.rawSummary,
    result.description,
    result.snippet,
    result.contentSnippet,
  ];

  for (const candidate of candidates) {
    const cleaned = compactSentence(candidate);
    if (cleaned && cleaned.toLowerCase() !== cleanText(result.title).toLowerCase()) {
      return cleaned;
    }
  }

  const source = cleanText(result.source) || "this source";
  const region = cleanText(result.sourceRegion || result.region || result.country);
  const title = cleanText(result.title) || "this signal";

  return compactSentence(
    `${source} reported a monitoring-relevant signal: ${title}${
      region ? ` in ${region}` : ""
    }. Geo-Sentinel ranked this card using relevance, source quality, recency, sentiment, and geographic alignment.`
  );
}

function buildWhyThisMatters(result) {
  const sentiment = String(result.sentiment || "neutral").toLowerCase();
  const source = cleanText(result.source) || "a monitored source";
  const region = cleanText(result.sourceRegion || result.region || result.country);
  const country = cleanText(result.sourceCountry || result.country);
  const topic = cleanText(result.title) || "this development";
  const score = Number(result.signalScore ?? result.finalScore ?? result.score) || 0;

  const locationPhrase = region || country ? ` in ${region || country}` : "";
  const scorePhrase =
    score >= 75
      ? "a high-priority signal"
      : score >= 45
        ? "a moderate-priority signal"
        : "an early monitoring signal";

  if (sentiment === "negative") {
    return `${topic} matters because ${source} is framing it as a risk-oriented development${locationPhrase}. Geo-Sentinel marks it as ${scorePhrase}, which means it may deserve closer monitoring for escalation, instability, or policy impact.`;
  }

  if (sentiment === "positive") {
    return `${topic} matters because ${source} is framing it as a constructive or stabilizing development${locationPhrase}. Geo-Sentinel marks it as ${scorePhrase}, useful for comparing how different regions interpret the same issue.`;
  }

  return `${topic} matters because ${source} is reporting it as a relevant geopolitical development${locationPhrase}. Geo-Sentinel marks it as ${scorePhrase}, helping analysts compare source coverage, regional framing, and signal strength.`;
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
      result.queryMatchScore ?? result.queryRelevance ?? fallbackSignals.queryRelevance,
    geoAlignment:
      result.geoAlignmentScore ?? result.geoAlignment ?? fallbackSignals.geoAlignment,
    sourceQuality: result.sourceQualityScore ?? fallbackSignals.sourceQuality,
    recency: result.recencyScore ?? fallbackSignals.recency,
  };
}

function getResultId(result) {
  return result.resultId || result.id || "";
}

function buildReportFilename(queryHash, resultId = "", reportType = "query", extension = "json") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const shortHash = queryHash ? queryHash.slice(0, 12) : "unknown";
  const shortResultId = resultId ? resultId.slice(0, 12) : "run";

  return `geo-sentinel-${reportType}-report-${shortHash}-${shortResultId}-${timestamp}.${extension}`;
}

function triggerJsonDownload(payload, queryHash, resultId = "", reportType = "query") {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = buildReportFilename(queryHash, resultId, reportType, "json");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
}

function triggerPdfDownload(blob, queryHash, resultId = "") {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = buildReportFilename(queryHash, resultId, "card", "pdf");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
}

function explainReportError(error) {
  if (isRecoverableReportError(error)) {
    return "This report needs to be refreshed before download.";
  }

  const message = String(error?.message || "").toLowerCase();

  if (message.includes("unreachable") || message.includes("failed to fetch")) {
    return "The intelligence service is temporarily unavailable. Please retry later.";
  }

  return error?.message || "Report download failed. Please retry.";
}

function fallbackTone(result) {
  const sentiment = String(result.sentiment || "neutral").toLowerCase();
  const region = String(result.sourceRegion || result.region || "").toLowerCase();

  if (sentiment === "negative") return "from-red-950 via-slate-950 to-orange-950/70";
  if (sentiment === "positive") return "from-emerald-950 via-slate-950 to-cyan-950/70";
  if (region.includes("middle")) return "from-amber-950 via-slate-950 to-red-950/60";
  if (region.includes("asia")) return "from-cyan-950 via-slate-950 to-blue-950/70";
  if (region.includes("europe")) return "from-indigo-950 via-slate-950 to-cyan-950/70";

  return "from-slate-900 via-slate-950 to-cyan-950/60";
}

function ThumbnailFallback({ result }) {
  const source = cleanText(result.source);
  const region = cleanText(result.sourceRegion || result.region);
  const country = cleanText(result.sourceCountry || result.country);
  const label = source || region || country || "Geo-Sentinel";
  const tone = fallbackTone(result);

  return (
    <div className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${tone} p-3`}>
      <div className="flex items-center justify-between">
        <span className="h-2 w-2 rounded-full bg-cyan-300/80 shadow-lg shadow-cyan-400/40" />
        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-cyan-200/70">
          Signal
        </span>
      </div>

      <div>
        <p className="line-clamp-2 text-xs font-semibold text-slate-100">
          {label}
        </p>
        <p className="mt-1 text-[0.65rem] text-slate-400">
          {region || country || "Source image unavailable"}
        </p>
      </div>
    </div>
  );
}

export function ResultCard({
  result,
  reportQueryHash = "",
  onRegenerateReport,
  regeneratingReport = false,
}) {
  const [downloadState, setDownloadState] = useState({
    loadingQuery: false,
    loadingItem: false,
    error: "",
    recoverable: false,
    lastAction: "",
  });
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const summary = buildSummary(result);
  const whyThisMatters = buildWhyThisMatters(result);
  const sourceMeta = sourceLine(result);
  const region = cleanText(result.sourceRegion || result.region);
  const score = Number(result.signalScore ?? result.finalScore ?? result.score) || 0;
  const rankingSignals = getRankingSignals(result);
  const qualityLabel = sourceQualityLabel(result);
  const expandedQueryUsed = Boolean(result.expandedQueryUsed);
  const resultId = getResultId(result);
  const thumbnail = cleanText(result.thumbnail || result.image || result.imageUrl);
  const canShowImage = Boolean(thumbnail && !thumbnailFailed);
  const sourceUrl = cleanText(result.url);
  const canOpenSource = Boolean(sourceUrl && sourceUrl !== "#");
  const canDownloadQueryReport = Boolean(reportQueryHash);
  const canDownloadItemReport = Boolean(reportQueryHash && resultId);
  const canRegenerateReport = Boolean(onRegenerateReport) && downloadState.recoverable;

  async function downloadQueryReport(queryHashToUse = reportQueryHash) {
    const reportPayload = await fetchReportByQueryHash(queryHashToUse);
    triggerJsonDownload(reportPayload, queryHashToUse, "", "query");
  }

  async function downloadItemReport(queryHashToUse = reportQueryHash) {
    const reportBlob = await fetchReportItemPdfByResultId(queryHashToUse, resultId);
    triggerPdfDownload(reportBlob, queryHashToUse, resultId);
  }

  async function handleQueryReportDownload() {
    if (!canDownloadQueryReport || downloadState.loadingQuery) return;

    setDownloadState({
      loadingQuery: true,
      loadingItem: false,
      error: "",
      recoverable: false,
      lastAction: "query",
    });

    try {
      await downloadQueryReport(reportQueryHash);
      setDownloadState({
        loadingQuery: false,
        loadingItem: false,
        error: "",
        recoverable: false,
        lastAction: "",
      });
    } catch (error) {
      setDownloadState({
        loadingQuery: false,
        loadingItem: false,
        error: explainReportError(error),
        recoverable: isRecoverableReportError(error),
        lastAction: "query",
      });
    }
  }

  async function handleItemReportDownload() {
    if (!canDownloadItemReport || downloadState.loadingItem) return;

    setDownloadState({
      loadingQuery: false,
      loadingItem: true,
      error: "",
      recoverable: false,
      lastAction: "item",
    });

    try {
      await downloadItemReport(reportQueryHash);
      setDownloadState({
        loadingQuery: false,
        loadingItem: false,
        error: "",
        recoverable: false,
        lastAction: "",
      });
    } catch (error) {
      setDownloadState({
        loadingQuery: false,
        loadingItem: false,
        error: explainReportError(error),
        recoverable: isRecoverableReportError(error),
        lastAction: "item",
      });
    }
  }

  async function handleRegenerateAndRetry() {
    if (!canRegenerateReport || regeneratingReport) return;

    const retryAction = downloadState.lastAction || "item";

    setDownloadState({
      loadingQuery: retryAction === "query",
      loadingItem: retryAction === "item",
      error: "",
      recoverable: false,
      lastAction: retryAction,
    });

    try {
      const freshQueryHash = await onRegenerateReport();

      if (retryAction === "query") {
        await downloadQueryReport(freshQueryHash);
      } else {
        await downloadItemReport(freshQueryHash);
      }

      setDownloadState({
        loadingQuery: false,
        loadingItem: false,
        error: "",
        recoverable: false,
        lastAction: "",
      });
    } catch (error) {
      setDownloadState({
        loadingQuery: false,
        loadingItem: false,
        error:
          error?.message ||
          "Regeneration failed. Re-run the scenario manually and retry the report download.",
        recoverable: false,
        lastAction: retryAction,
      });
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <article className="flex flex-col gap-0">
        <div className="border-b border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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

                <Badge className="border-white/10 bg-slate-950/60 text-slate-200">
                  Signal {scoreLabel(score)}
                </Badge>

                {expandedQueryUsed ? (
                  <Badge className="border-violet-400/30 bg-violet-400/10 text-violet-200">
                    Expanded scenario match
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
            </div>

            <div className="flex shrink-0 gap-3">
              <div className="h-28 w-36 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-lg shadow-black/20">
                {canShowImage ? (
                  <img
                    src={thumbnail}
                    alt={cleanText(result.title) || "Article thumbnail"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={() => setThumbnailFailed(true)}
                  />
                ) : (
                  <ThumbnailFallback result={result} />
                )}
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
        </div>

        <div className="space-y-5 p-5">
          <p className="text-sm leading-6 text-slate-300">{summary}</p>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Why this matters
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {whyThisMatters}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  Signal confidence
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Key factors used to rank this article for the current scenario.
                </p>
              </div>
              <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                Explainable ranking
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <RankingSignal label="Topic relevance" value={rankingSignals.queryRelevance} />
              <RankingSignal label="Geographic fit" value={rankingSignals.geoAlignment} />
              <RankingSignal label="Source confidence" value={rankingSignals.sourceQuality} />
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
                Source confidence
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

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-100">
                  Intelligence reports
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Download the full scenario snapshot or this card’s dedicated analyst brief.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleItemReportDownload}
                  disabled={
                    !canDownloadItemReport ||
                    downloadState.loadingItem ||
                    regeneratingReport
                  }
                  className="inline-flex items-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-300/40 hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                >
                  {downloadState.loadingItem
                    ? regeneratingReport
                      ? "Refreshing PDF…"
                      : "Downloading PDF…"
                    : "Download card PDF"}
                </button>

                <button
                  type="button"
                  onClick={handleQueryReportDownload}
                  disabled={
                    !canDownloadQueryReport ||
                    downloadState.loadingQuery ||
                    regeneratingReport
                  }
                  className="inline-flex items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                >
                  {downloadState.loadingQuery
                    ? regeneratingReport
                      ? "Refreshing JSON…"
                      : "Downloading JSON…"
                    : "Download full JSON"}
                </button>
              </div>
            </div>

            {!canDownloadQueryReport ? (
              <p className="mt-3 text-[0.7rem] text-amber-200/80">
                Report downloads will appear after a successful intelligence run.
              </p>
            ) : null}

            {!canDownloadItemReport && canDownloadQueryReport ? (
              <p className="mt-3 text-[0.7rem] text-amber-200/80">
                This card needs a refreshed intelligence run before PDF download.
              </p>
            ) : null}

            {downloadState.error ? (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3">
                <p className="text-xs font-medium text-red-200">
                  Report refresh required
                </p>
                <p className="mt-1 text-xs leading-5 text-red-100/80">
                  {downloadState.error}
                </p>

                {canRegenerateReport ? (
                  <button
                    type="button"
                    onClick={handleRegenerateAndRetry}
                    disabled={regeneratingReport}
                    className="mt-3 inline-flex items-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-200/50 hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                  >
                    {regeneratingReport ? "Refreshing intelligence…" : "Refresh and retry"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500">
              Ranked intelligence signal
            </p>

            {canOpenSource ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/15"
              >
                Open source article
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-500"
              >
                Source link unavailable
              </button>
            )}
          </div>
        </div>
      </article>
    </Card>
  );
}
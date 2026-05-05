import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { QueryPanel } from "@/components/dashboard/query-panel";
import { ExampleChips } from "@/components/dashboard/example-chips";
import { ResultsList } from "@/components/dashboard/results-list";
import { ResultsPlaceholder } from "@/components/dashboard/results-placeholder";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { LandingPage } from "@/pages/landing";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import {
  generateIntelligence,
  getApiCounts,
  getApiMeta,
  getAppliedFilters,
  getDiagnostics,
  getExpandedQueries,
  getFeedErrors,
  getNoResultExplanation,
  getReportQueryHash,
  getSelectedSources,
} from "@/lib/api";
import {
  buildLoginUrl,
  buildLogoutUrl,
  clearAuthSession,
  consumeHostedUiCallback,
  isAuthConfigured,
  readStoredAuthSession,
} from "@/lib/auth";

const INITIAL_FORM = {
  scenario: "",
  geographicScope: "world",
  countries: "",
  mediaType: "all",
  publicationFocus: "all",
  sentiment: "all",
  sortBy: "final-desc",
};

const BASE_SCENARIOS = [
  { label: "Taiwan semiconductor disruption", meta: "Asia · supply chain" },
  { label: "Red Sea shipping attacks", meta: "Middle East · trade route" },
  { label: "India-China border tension", meta: "Asia · border risk" },
  { label: "NATO escalation in Eastern Europe", meta: "Europe · security" },
  { label: "South China Sea naval confrontation", meta: "Asia · maritime" },
  { label: "Iran-Israel regional escalation", meta: "Middle East · conflict" },
];

function normalizeSentiment(value) {
  const normalized = String(value || "neutral").toLowerCase();

  if (normalized.includes("positive")) return "positive";
  if (normalized.includes("negative")) return "negative";
  return "neutral";
}

function normalizeScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) return 0;
  if (score > 0 && score <= 10) return score * 10;
  if (score > 100) return 100;

  return score;
}

function normalizeReasonScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) return null;
  if (score > 0 && score <= 1) return Math.round(score * 100);
  if (score > 0 && score <= 10) return Math.round(score * 10);
  if (score > 100) return 100;

  return Math.round(score);
}

function mapRankingSignals(item) {
  return {
    queryRelevance: normalizeReasonScore(
      item?.queryMatchScore ??
        item?.queryRelevance ??
        item?.query_relevance ??
        item?.relevanceScore ??
        item?.relevance_score
    ),
    geoAlignment: normalizeReasonScore(
      item?.geoAlignmentScore ??
        item?.geoAlignment ??
        item?.geo_alignment ??
        item?.geographicAlignment ??
        item?.geographic_alignment
    ),
    sourceQuality: normalizeReasonScore(
      item?.sourceQualityScore ??
        item?.sourceQuality ??
        item?.source_quality ??
        item?.sourceReliability ??
        item?.source_reliability ??
        item?.reliabilityScore ??
        item?.reliability_score
    ),
    recency: normalizeReasonScore(
      item?.recencyScore ??
        item?.recency_score ??
        item?.freshnessScore ??
        item?.freshness_score
    ),
  };
}

function mapApiResults(payload) {
  if (!payload) return [];

  const rawResults =
    payload?.data?.results ||
    payload?.results ||
    payload?.data?.items ||
    payload?.items ||
    [];

  if (!Array.isArray(rawResults)) return [];

  return rawResults.map((item, index) => {
    const scoreRaw =
      item?.signalScore ??
      item?.signal_score ??
      item?.finalScore ??
      item?.final_score ??
      item?.score ??
      item?.relevanceScore ??
      item?.relevance_score ??
      item?.sentimentScore ??
      item?.sentiment_score ??
      0;

    const sourceCountry =
      item?.sourceCountry ||
      item?.source_country ||
      item?.country ||
      item?.publisherCountry ||
      "";

    const sourceRegion =
      item?.sourceRegion ||
      item?.source_region ||
      item?.region ||
      item?.geo_region ||
      "";

    return {
      ...item,
      id:
        item?.id ||
        item?.resultId ||
        item?.url ||
        item?.link ||
        `${item?.source || item?.publisher || "source"}-${index}`,
      title: item?.title || "Untitled result",
      source: item?.source || item?.sourceName || item?.publisher || "Unknown source",
      sourceCountry,
      sourceRegion,
      country: sourceCountry,
      url: item?.url || item?.link || "#",
      summary:
        item?.summary ||
        item?.description ||
        item?.snippet ||
        item?.contentSnippet ||
        "No summary was returned for this result.",
      rawSummary: item?.rawSummary || item?.raw_summary || "",
      thumbnail: item?.thumbnail || item?.image || item?.imageUrl || "",
      publishedAt:
        item?.publishedAt ||
        item?.published_at ||
        item?.pubDate ||
        item?.published ||
        item?.date ||
        "",
      sentiment: normalizeSentiment(
        item?.sentimentLabel ||
          item?.sentiment_label ||
          item?.sentiment ||
          item?.sentimentCategory
      ),
      score: normalizeScore(scoreRaw),
      signalScore: normalizeScore(item?.signalScore ?? scoreRaw),
      finalScore: normalizeScore(item?.finalScore ?? scoreRaw),
      region: sourceRegion || sourceCountry,
      rankingSignals: mapRankingSignals(item),
      matchedQuery: item?.matchedQuery || item?.relevanceBreakdown?.queryVariant || "",
      expandedQueryUsed: Boolean(
        item?.expandedQueryUsed || item?.relevanceBreakdown?.expandedQueryUsed
      ),
      sourceQuality: item?.sourceQuality || item?.sourceTier || "standard",
      sourceQualityScore: item?.sourceQualityScore,
      sourceTier: item?.sourceTier,
      publicationFocus: item?.publicationFocus,
    };
  });
}

function buildScenarioItems(results, requestMeta) {
  const dynamicItems = [];

  if (requestMeta?.requestedScenario) {
    dynamicItems.push({
      label: requestMeta.requestedScenario,
      meta: "Last query",
    });
  }

  const seenTitles = new Set();

  results.slice(0, 4).forEach((result) => {
    const matchedQuery = result.matchedQuery || result.title || "";
    const cleanLabel = String(matchedQuery).trim();

    if (!cleanLabel || seenTitles.has(cleanLabel.toLowerCase())) return;

    seenTitles.add(cleanLabel.toLowerCase());
    dynamicItems.push({
      label: cleanLabel,
      meta: `${result.sourceRegion || result.region || "Live"} · ${
        result.sentiment || "signal"
      }`,
    });
  });

  const merged = [...dynamicItems, ...BASE_SCENARIOS];
  const deduped = [];
  const seen = new Set();

  merged.forEach((item) => {
    const key = item.label.toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);
    deduped.push(item);
  });

  return deduped.slice(0, 8);
}

function sanitizeAuthMessage(message) {
  if (!message) return "";

  const text = String(message);

  if (text.toLowerCase().includes("invalid_grant")) {
    return "Your sign-in session expired before completion. Please start the login again.";
  }

  if (text.toLowerCase().includes("jwt")) {
    return "Login complete. Your session is ready.";
  }

  if (text.toLowerCase().includes("stored")) {
    return "Login complete. Your session is ready.";
  }

  if (text.toLowerCase().includes("token exchange")) {
    return "Login could not be completed. Please retry from the sign-in button.";
  }

  return text;
}

function cleanValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function percentLabel(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) return "—";
  if (score > 0 && score <= 1) return `${Math.round(score * 100)}%`;
  if (score > 0 && score <= 10) return `${Math.round(score * 10)}%`;

  return `${Math.round(Math.min(score, 100))}%`;
}

function buildRegionInsights(results) {
  const buckets = new Map();

  results.forEach((result) => {
    const region = result.sourceRegion || result.region || result.sourceCountry || "Unspecified";
    const current = buckets.get(region) || {
      region,
      total: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      scoreTotal: 0,
      sources: new Set(),
    };

    current.total += 1;
    current[result.sentiment] = (current[result.sentiment] || 0) + 1;
    current.scoreTotal += Number(result.signalScore ?? result.finalScore ?? result.score) || 0;
    current.sources.add(result.source || "Unknown source");

    buckets.set(region, current);
  });

  return Array.from(buckets.values())
    .map((item) => ({
      ...item,
      averageScore: item.total ? item.scoreTotal / item.total : 0,
      sourceCount: item.sources.size,
      dominantSentiment:
        item.negative >= item.positive && item.negative >= item.neutral
          ? "negative"
          : item.positive >= item.neutral
            ? "positive"
            : "neutral",
    }))
    .sort((a, b) => b.total - a.total || b.averageScore - a.averageScore);
}

function ModuleHeader({ eyebrow, title, description }) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/20">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
        {description}
      </p>
    </section>
  );
}

function EmptyModuleState({ message = "Run an intelligence scenario to populate this view." }) {
  return (
    <Panel className="p-8 text-center">
      <div className="mx-auto max-w-2xl">
        <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
          Waiting for intelligence run
        </Badge>
        <h2 className="mt-5 text-xl font-semibold text-slate-100">
          No module data yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>
      </div>
    </Panel>
  );
}

function SentimentPill({ sentiment }) {
  const classes =
    sentiment === "positive"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : sentiment === "negative"
        ? "border-red-400/30 bg-red-400/10 text-red-200"
        : "border-amber-400/30 bg-amber-400/10 text-amber-200";

  return <Badge className={classes}>{sentiment}</Badge>;
}

function SignalsFeedView({ results }) {
  const ranked = [...results].sort(
    (a, b) =>
      Number(b.signalScore ?? b.finalScore ?? b.score) -
      Number(a.signalScore ?? a.finalScore ?? a.score)
  );

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="Signal monitoring"
        title="Signals Feed"
        description="A lightweight ranked feed of the strongest signals from the current intelligence run."
      />

      {ranked.length === 0 ? (
        <EmptyModuleState />
      ) : (
        <div className="grid gap-4">
          {ranked.slice(0, 12).map((result, index) => (
            <Panel key={result.id || `${result.source}-${index}`} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                      #{index + 1}
                    </Badge>
                    <SentimentPill sentiment={result.sentiment} />
                    <Badge className="border-white/10 bg-white/5 text-slate-300">
                      {cleanValue(result.sourceRegion || result.region)}
                    </Badge>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-100">
                    {result.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {result.source} · {cleanValue(result.sourceCountry || result.country)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-right">
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-500">
                    Signal score
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-cyan-200">
                    {Number(result.signalScore ?? result.finalScore ?? result.score ?? 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </section>
  );
}

function RegionalMonitorView({ results }) {
  const regions = buildRegionInsights(results);
  const maxVolume = Math.max(...regions.map((item) => item.total), 1);

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="Regional heatmap"
        title="Regional Monitor"
        description="Compare regional signal intensity using volume, sentiment distribution, source coverage, and average signal score."
      />

      {regions.length === 0 ? (
        <EmptyModuleState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {regions.map((region) => {
            const width = Math.max(8, Math.round((region.total / maxVolume) * 100));

            return (
              <Panel key={region.region} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      {region.region}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {region.total} signal(s) · {region.sourceCount} source(s)
                    </p>
                  </div>
                  <SentimentPill sentiment={region.dominantSentiment} />
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-cyan-400/70"
                    style={{ width: `${width}%` }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-4 gap-3 text-center">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-500">Avg</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {region.averageScore.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <p className="text-xs text-emerald-200/80">Pos</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-100">
                      {region.positive}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                    <p className="text-xs text-amber-200/80">Neu</p>
                    <p className="mt-1 text-sm font-semibold text-amber-100">
                      {region.neutral}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3">
                    <p className="text-xs text-red-200/80">Neg</p>
                    <p className="mt-1 text-sm font-semibold text-red-100">
                      {region.negative}
                    </p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReportsVaultView({ reportQueryHash, results, requestMeta }) {
  const hasReport = Boolean(reportQueryHash);

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="Reports vault"
        title="Current Run Reports"
        description="A basic report availability view for the active scenario. This uses the existing report links; no backend listing is required."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Scenario report
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">
            {hasReport ? "Available" : "Not generated"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {hasReport
              ? "The current intelligence run has a downloadable JSON snapshot."
              : "Run a successful scenario to create report outputs."}
          </p>
        </Panel>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Card briefs
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-100">
            {results.length}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Article-level PDF briefs available from individual result cards.
          </p>
        </Panel>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Last scenario
          </p>
          <h2 className="mt-3 line-clamp-2 text-lg font-semibold text-slate-100">
            {requestMeta?.requestedScenario || "—"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Report generation follows the currently loaded intelligence run.
          </p>
        </Panel>
      </div>
    </section>
  );
}

function SourceRegistryView({ sourceTransparency, results }) {
  const selectedSources = sourceTransparency?.selectedSources || [];
  const fallbackSources = results.map((result) => ({
    name: result.source,
    country: result.sourceCountry || result.country,
    region: result.sourceRegion || result.region,
    sourceQualityScore: result.sourceQualityScore,
    sourceQuality: result.sourceQuality,
    publicationFocus: result.publicationFocus,
  }));

  const sources = selectedSources.length > 0 ? selectedSources : fallbackSources;

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="Source registry"
        title="Coverage and Source Readiness"
        description="A product-safe view of selected outlets, regions, source quality, and publication focus."
      />

      {sources.length === 0 ? (
        <EmptyModuleState message="Run a scenario to see which sources were selected for analysis." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sources.slice(0, 18).map((source, index) => {
            const name = source?.name || source?.source || source?.label || "Unknown source";
            const country = source?.country || source?.sourceCountry || "—";
            const region = source?.region || source?.sourceRegion || "—";
            const quality =
              source?.sourceQuality || source?.tier || source?.sourceTier || "standard";
            const score =
              source?.sourceQualityScore ||
              source?.reliabilityScore ||
              source?.sourceReliability ||
              source?.qualityScore;

            return (
              <Panel key={`${name}-${index}`} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">{name}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {cleanValue(country)} · {cleanValue(region)}
                    </p>
                  </div>
                  <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                    {quality}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-500">Confidence</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {percentLabel(score)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-slate-500">Focus</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {cleanValue(source?.publicationFocus || source?.focus)}
                    </p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SystemStatusView({
  authState,
  requestMeta,
  sourceTransparency,
  errorMessage,
  hasResults,
}) {
  const counts = sourceTransparency?.counts || {};
  const feedErrors = sourceTransparency?.feedErrors || [];
  const mode = requestMeta?.mode || sourceTransparency?.meta?.mode || "ready";

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="System status"
        title="Platform Readiness"
        description="A clean product-facing status view for auth, backend mode, source coverage, and report readiness."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Authentication
          </p>
          <h2 className="mt-3 text-xl font-semibold text-slate-100">
            {authState?.authenticated ? "Signed in" : "Demo/public"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {authState?.configured ? "Login configured" : "Login not configured"}
          </p>
        </Panel>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Intelligence mode
          </p>
          <h2 className="mt-3 text-xl font-semibold text-slate-100">
            {hasResults ? "Results ready" : errorMessage ? "Needs validation" : cleanValue(mode)}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Frontend remains available independently of backend runtime.
          </p>
        </Panel>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Raw / returned
          </p>
          <h2 className="mt-3 text-xl font-semibold text-slate-100">
            {counts.rawItemsSeen || counts.raw || 0} / {counts.returned || 0}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Source items reviewed versus visible cards.
          </p>
        </Panel>

        <Panel className="p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Source availability
          </p>
          <h2 className="mt-3 text-xl font-semibold text-slate-100">
            {feedErrors.length > 0 ? "Partial" : "Stable"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {feedErrors.length > 0
              ? "Some feeds may be unavailable or rate-limited."
              : "No source availability warnings in the current view."}
          </p>
        </Panel>
      </div>

      {feedErrors.length > 0 ? (
        <Panel className="p-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Source availability notes
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Some external feeds did not respond cleanly during the run. This does not mean
            Geo-Sentinel is broken; it means source coverage was partial for this scenario.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {feedErrors.slice(0, 8).map((error, index) => (
              <Badge
                key={`${error?.source || "source"}-${index}`}
                className="border-amber-400/30 bg-amber-400/10 text-amber-200"
              >
                {error?.source || error?.name || "Feed issue"}
              </Badge>
            ))}
          </div>
        </Panel>
      ) : null}
    </section>
  );
}

function ModuleView({
  activeView,
  results,
  reportQueryHash,
  requestMeta,
  sourceTransparency,
  authState,
  errorMessage,
}) {
  if (activeView === "signals-feed") {
    return <SignalsFeedView results={results} />;
  }

  if (activeView === "regional-monitor") {
    return <RegionalMonitorView results={results} />;
  }

  if (activeView === "reports-vault") {
    return (
      <ReportsVaultView
        reportQueryHash={reportQueryHash}
        results={results}
        requestMeta={requestMeta}
      />
    );
  }

  if (activeView === "source-registry") {
    return (
      <SourceRegistryView
        sourceTransparency={sourceTransparency}
        results={results}
      />
    );
  }

  if (activeView === "system-status") {
    return (
      <SystemStatusView
        authState={authState}
        requestMeta={requestMeta}
        sourceTransparency={sourceTransparency}
        errorMessage={errorMessage}
        hasResults={results.length > 0}
      />
    );
  }

  return null;
}

export default function App() {
  const [view, setView] = useState(() =>
    readStoredAuthSession()?.authenticated ? "dashboard" : "landing"
  );
  const [activeView, setActiveView] = useState("intelligence-console");
  const [form, setForm] = useState(INITIAL_FORM);
  const [lastSubmittedForm, setLastSubmittedForm] = useState(null);
  const [results, setResults] = useState([]);
  const [requestMeta, setRequestMeta] = useState(null);
  const [reportQueryHash, setReportQueryHash] = useState("");
  const [authSession, setAuthSession] = useState(() => readStoredAuthSession());
  const [authMessage, setAuthMessage] = useState("");
  const [sourceTransparency, setSourceTransparency] = useState({
    selectedSources: [],
    appliedFilters: {},
    counts: { raw: 0, filtered: 0, returned: 0, rawItemsSeen: 0, filteredOut: 0 },
    meta: {},
    expandedQueries: [],
    diagnostics: null,
    noResultExplanation: null,
    feedErrors: [],
  });
  const [loading, setLoading] = useState(false);
  const [regeneratingReport, setRegeneratingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasResults = results.length > 0;

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      try {
        const callbackResult = await consumeHostedUiCallback();

        if (!mounted) return;

        if (callbackResult.handled && callbackResult.session) {
          setAuthSession(callbackResult.session);
          setAuthMessage("Login complete. Your session is ready.");
          setView("dashboard");
          setActiveView("intelligence-console");
        }

        if (callbackResult.handled && callbackResult.error) {
          setAuthMessage(
            sanitizeAuthMessage(
              callbackResult.errorDescription ||
                callbackResult.error ||
                "Authentication could not be completed."
            )
          );
          setView("landing");
          setActiveView("intelligence-console");
        }
      } catch (error) {
        if (!mounted) return;

        setAuthMessage(
          sanitizeAuthMessage(
            error?.message || "Login could not be completed. Please retry."
          )
        );
        setView("landing");
        setActiveView("intelligence-console");
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, []);

  const resultStats = useMemo(() => {
    const positive = results.filter((item) => item.sentiment === "positive").length;
    const neutral = results.filter((item) => item.sentiment === "neutral").length;
    const negative = results.filter((item) => item.sentiment === "negative").length;

    return {
      total: results.length,
      positive,
      neutral,
      negative,
    };
  }, [results]);

  const scenarioItems = useMemo(
    () => buildScenarioItems(results, requestMeta),
    [results, requestMeta]
  );

  const authState = useMemo(
    () => ({
      configured: isAuthConfigured(),
      authenticated: Boolean(authSession?.authenticated),
      provider: authSession?.provider || "",
      storedAt: authSession?.storedAt || "",
      message: sanitizeAuthMessage(authMessage),
    }),
    [authSession, authMessage]
  );

  const demoMode = view === "dashboard" && !authState.authenticated;

  function updateField(name, value) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleExampleSelect(value) {
    const scenario = typeof value === "string" ? value : value?.label || "";

    setForm((prev) => ({
      ...prev,
      scenario,
    }));
  }

  async function handleLogin() {
    const loginUrl = await buildLoginUrl();

    if (!loginUrl) {
      setAuthMessage("Sign-in is not configured for this deployment yet.");
      return;
    }

    window.location.assign(loginUrl);
  }

  function handleLogout() {
    clearAuthSession();
    setAuthSession(null);
    setAuthMessage("You have been signed out.");
    setActiveView("intelligence-console");

    const logoutUrl = buildLogoutUrl();

    if (logoutUrl) {
      window.location.assign(logoutUrl);
      return;
    }

    setView("landing");
  }

  function handleViewDemo() {
    setView("dashboard");
    setActiveView("intelligence-console");
    setAuthMessage("Public demo mode is active.");
  }

  function handleBackToLanding() {
    setView("landing");
    setActiveView("intelligence-console");
    setErrorMessage("");
  }

  function applyIntelligenceResponse(response, attemptTimestamp, submittedForm) {
    const mappedResults = mapApiResults(response);
    const counts = getApiCounts(response);
    const meta = getApiMeta(response);
    const appliedFilters = getAppliedFilters(response);
    const selectedSources = getSelectedSources(response);
    const expandedQueries = getExpandedQueries(response);
    const diagnostics = getDiagnostics(response);
    const noResultExplanation = getNoResultExplanation(response);
    const feedErrors = getFeedErrors(response);
    const queryHash = getReportQueryHash(response);

    setResults(mappedResults);
    setReportQueryHash(queryHash);
    setSourceTransparency({
      selectedSources,
      appliedFilters,
      counts,
      meta,
      expandedQueries,
      diagnostics,
      noResultExplanation,
      feedErrors,
    });
    setRequestMeta({
      requestedScenario: submittedForm.scenario,
      rawCount: counts?.raw ?? mappedResults.length,
      filteredCount: counts?.filtered ?? mappedResults.length,
      returnedCount: counts?.returned ?? mappedResults.length,
      rawItemsSeen: counts?.rawItemsSeen ?? 0,
      filteredOut: counts?.filteredOut ?? 0,
      timestamp: meta?.timestamp || response?.meta?.timestamp || attemptTimestamp,
      queryHash,
      auth: response?.meta?.auth || null,
      cache: response?.data?.cache || response?.cache || null,
      mode: response?.data?.mode || response?.mode || "unknown",
      regenerated: Boolean(regeneratingReport),
    });

    return {
      mappedResults,
      counts,
      meta,
      noResultExplanation,
      queryHash,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.scenario.trim()) {
      setErrorMessage("Enter a geopolitical scenario before generating intelligence.");
      return;
    }

    const submittedForm = { ...form };
    const attemptTimestamp = new Date().toISOString();

    setLastSubmittedForm(submittedForm);
    setLoading(true);
    setErrorMessage("");
    setResults([]);
    setReportQueryHash("");
    setRequestMeta({
      requestedScenario: submittedForm.scenario,
      rawCount: 0,
      timestamp: attemptTimestamp,
    });
    setSourceTransparency({
      selectedSources: [],
      appliedFilters: {},
      counts: { raw: 0, filtered: 0, returned: 0, rawItemsSeen: 0, filteredOut: 0 },
      meta: {},
      expandedQueries: [],
      diagnostics: null,
      noResultExplanation: null,
      feedErrors: [],
    });

    try {
      const response = await generateIntelligence(submittedForm);
      const { mappedResults, noResultExplanation } = applyIntelligenceResponse(
        response,
        attemptTimestamp,
        submittedForm
      );

      if (mappedResults.length === 0 && !noResultExplanation) {
        setErrorMessage(
          "No qualified intelligence signals were found for this scenario. Try broadening the region, country, or sentiment filters."
        );
      }
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "The intelligence API is not reachable right now. This can happen while the backend is offline for cost-saving mode."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateReport() {
    const regenerationForm = lastSubmittedForm || form;

    if (!regenerationForm?.scenario?.trim()) {
      throw new Error(
        "No previous intelligence query is available for regeneration. Run a scenario first, then retry the report download."
      );
    }

    const attemptTimestamp = new Date().toISOString();

    setRegeneratingReport(true);
    setErrorMessage("");

    try {
      const response = await generateIntelligence(regenerationForm);
      const { queryHash } = applyIntelligenceResponse(
        response,
        attemptTimestamp,
        regenerationForm
      );

      if (!queryHash) {
        throw new Error(
          "The regenerated intelligence response did not include a report reference."
        );
      }

      return queryHash;
    } finally {
      setRegeneratingReport(false);
    }
  }

  if (view === "landing" && !authState.authenticated) {
    return (
      <LandingPage
        authConfigured={authState.configured}
        onLogin={handleLogin}
        onViewDemo={handleViewDemo}
      />
    );
  }

  return (
    <AppShell
      authState={authState}
      onLogin={handleLogin}
      onLogout={handleLogout}
      onBackToLanding={demoMode ? handleBackToLanding : undefined}
      demoMode={demoMode}
      activeView={activeView}
      onNavigate={setActiveView}
    >
      {activeView === "intelligence-console" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <section className="space-y-6">
            <QueryPanel
              form={form}
              onChange={updateField}
              onSubmit={handleSubmit}
              loading={loading}
            />

            <ExampleChips
              items={scenarioItems}
              onSelect={handleExampleSelect}
              disabled={loading}
            />

            {hasResults ? (
              <ResultsList
                results={results}
                loading={loading}
                reportQueryHash={reportQueryHash}
                onRegenerateReport={handleRegenerateReport}
                regeneratingReport={regeneratingReport}
              />
            ) : (
              <ResultsPlaceholder
                loading={loading}
                errorMessage={errorMessage}
                noResultExplanation={sourceTransparency.noResultExplanation}
                counts={sourceTransparency.counts}
                expandedQueries={sourceTransparency.expandedQueries}
              />
            )}
          </section>

          <aside className="space-y-6">
            <StatusPanel
              loading={loading || regeneratingReport}
              errorMessage={errorMessage}
              hasResults={hasResults}
              requestMeta={requestMeta}
              stats={resultStats}
              sourceTransparency={sourceTransparency}
              authState={authState}
            />
          </aside>
        </div>
      ) : (
        <ModuleView
          activeView={activeView}
          results={results}
          reportQueryHash={reportQueryHash}
          requestMeta={requestMeta}
          sourceTransparency={sourceTransparency}
          authState={authState}
          errorMessage={errorMessage}
        />
      )}
    </AppShell>
  );
}
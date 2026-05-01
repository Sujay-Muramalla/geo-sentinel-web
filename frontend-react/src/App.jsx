import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { QueryPanel } from "@/components/dashboard/query-panel";
import { ExampleChips } from "@/components/dashboard/example-chips";
import { ResultsList } from "@/components/dashboard/results-list";
import { ResultsPlaceholder } from "@/components/dashboard/results-placeholder";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { LandingPage } from "@/pages/landing";
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

function SimplePage({ title, eyebrow, description, cards = [] }) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/20"
          >
            <p className="text-sm font-semibold text-slate-100">{card.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlaceholderView({ activeView }) {
  const pages = {
    "signals-feed": {
      title: "Signals Feed",
      eyebrow: "Signal monitoring",
      description:
        "Track emerging geopolitical signals, recurring topics, and high-priority developments from generated intelligence runs.",
      cards: [
        {
          title: "Ranked signal stream",
          description:
            "Review important geopolitical developments grouped by scenario, region, source quality, and sentiment.",
        },
        {
          title: "Trend context",
          description:
            "Compare how topics evolve across regions and sources without exposing backend processing details.",
        },
        {
          title: "Operational focus",
          description:
            "Designed to become the main view for recurring alerts and high-value intelligence signals.",
        },
      ],
    },
    "reports-vault": {
      title: "Reports Vault",
      eyebrow: "Saved intelligence",
      description:
        "Access generated PDF and JSON reports from previous intelligence runs once report listing is connected.",
      cards: [
        {
          title: "Report library",
          description:
            "Organize query-level and article-level reports created from saved intelligence snapshots.",
        },
        {
          title: "Download history",
          description:
            "Give users a clean way to retrieve analysis outputs without showing storage internals.",
        },
        {
          title: "Analyst workflow",
          description:
            "Support repeatable brief generation for portfolio demos, client showcases, and future premium use.",
        },
      ],
    },
    "regional-monitor": {
      title: "Regional Monitor",
      eyebrow: "Geographic overview",
      description:
        "Explore country and region-level intelligence intensity using sentiment, source volume, and signal quality.",
      cards: [
        {
          title: "Risk heat layer",
          description:
            "Highlight countries or regions with rising negative, neutral, or positive signal concentration.",
        },
        {
          title: "Regional comparison",
          description:
            "Use existing country, region, sentiment, and source metadata to compare geopolitical pressure points.",
        },
        {
          title: "Map-ready model",
          description:
            "Prepared for a future visual map while keeping the current SIMPLE architecture stable.",
        },
      ],
    },
    "source-registry": {
      title: "Source Registry",
      eyebrow: "Coverage intelligence",
      description:
        "Review news source coverage, reliability, geographic focus, and registry readiness in a user-friendly format.",
      cards: [
        {
          title: "Coverage by region",
          description:
            "Show registered outlets by region, country, tier, and publication focus.",
        },
        {
          title: "Source quality",
          description:
            "Present reliability and selection strength as product-facing confidence indicators.",
        },
        {
          title: "Feed readiness",
          description:
            "Summarize source availability without exposing raw diagnostics to regular users.",
        },
      ],
    },
    "system-status": {
      title: "System Status",
      eyebrow: "Platform readiness",
      description:
        "View a clean status summary for frontend delivery, API availability, reports, authentication, and intelligence readiness.",
      cards: [
        {
          title: "Application availability",
          description:
            "Show whether the product experience is ready, degraded, or waiting for backend validation.",
        },
        {
          title: "Report pipeline",
          description:
            "Track whether cached snapshots and downloadable reports are available for the current session.",
        },
        {
          title: "User-safe status",
          description:
            "Keep operational detail readable while moving raw debug output behind admin controls later.",
        },
      ],
    },
  };

  const page = pages[activeView] || pages["signals-feed"];

  return <SimplePage {...page} />;
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
          "The intelligence API is not available right now. This can happen while the backend is offline for cost control."
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
        <PlaceholderView activeView={activeView} />
      )}
    </AppShell>
  );
}
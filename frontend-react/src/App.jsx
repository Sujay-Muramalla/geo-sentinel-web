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

const EXAMPLE_SCENARIOS = [
  "Taiwan semiconductor disruption",
  "Red Sea shipping attacks",
  "India-China border tension",
  "NATO escalation in Eastern Europe",
  "South China Sea naval confrontation",
  "Iran-Israel regional escalation",
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

export default function App() {
  const [view, setView] = useState(() =>
    readStoredAuthSession()?.authenticated ? "dashboard" : "landing"
  );
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
          setAuthMessage("Cognito login complete. JWT session stored.");
          setView("dashboard");
        }

        if (callbackResult.handled && callbackResult.error) {
          setAuthMessage(
            callbackResult.errorDescription ||
              callbackResult.error ||
              "Cognito returned an authentication error."
          );
          setView("landing");
        }
      } catch (error) {
        if (!mounted) return;

        setAuthMessage(
          error?.message ||
            "Cognito login completed, but token exchange failed."
        );
        setView("landing");
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

  const authState = useMemo(
    () => ({
      configured: isAuthConfigured(),
      authenticated: Boolean(authSession?.authenticated),
      provider: authSession?.provider || "",
      storedAt: authSession?.storedAt || "",
      message: authMessage,
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
    setForm((prev) => ({
      ...prev,
      scenario: value,
    }));
  }

  async function handleLogin() {
    const loginUrl = await buildLoginUrl();

    if (!loginUrl) {
      setAuthMessage("Cognito auth is not configured for this frontend environment.");
      return;
    }

    window.location.assign(loginUrl);
  }

  function handleLogout() {
    clearAuthSession();
    setAuthSession(null);
    setAuthMessage("Local frontend session cleared.");

    const logoutUrl = buildLogoutUrl();

    if (logoutUrl) {
      window.location.assign(logoutUrl);
      return;
    }

    setView("landing");
  }

  function handleViewDemo() {
    setView("dashboard");
    setAuthMessage("Public demo mode active. Login remains optional.");
  }

  function handleBackToLanding() {
    setView("landing");
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
      setErrorMessage("Please enter a geopolitical scenario before generating intelligence.");
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
          "The backend responded successfully, but no results passed the relevance and source-coverage filters for this scenario."
        );
      }
    } catch (error) {
      setErrorMessage(
        error?.message ||
          "Unable to reach the backend API. This is expected while the backend remains OFF for cost saving."
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
          "The regenerated intelligence response did not include a report query hash."
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
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <section className="space-y-6">
          <QueryPanel
            form={form}
            onChange={updateField}
            onSubmit={handleSubmit}
            loading={loading}
          />

          <ExampleChips
            items={EXAMPLE_SCENARIOS}
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
    </AppShell>
  );
}
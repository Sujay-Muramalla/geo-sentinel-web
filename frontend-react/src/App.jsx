import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { QueryPanel } from "@/components/dashboard/query-panel";
import { ExampleChips } from "@/components/dashboard/example-chips";
import { ResultsList } from "@/components/dashboard/results-list";
import { ResultsPlaceholder } from "@/components/dashboard/results-placeholder";
import { StatusPanel } from "@/components/dashboard/status-panel";
import { generateIntelligence } from "@/lib/api";

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
      item?.finalScore ??
      item?.final_score ??
      item?.score ??
      item?.signalScore ??
      item?.signal_score ??
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
      region: sourceRegion || sourceCountry,
    };
  });
}

export default function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [results, setResults] = useState([]);
  const [requestMeta, setRequestMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasResults = results.length > 0;

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.scenario.trim()) {
      setErrorMessage("Please enter a geopolitical scenario before generating intelligence.");
      return;
    }

    const attemptTimestamp = new Date().toISOString();

    setLoading(true);
    setErrorMessage("");
    setResults([]);
    setRequestMeta({
      requestedScenario: form.scenario,
      rawCount: 0,
      timestamp: attemptTimestamp,
    });

    try {
      const response = await generateIntelligence(form);
      const mappedResults = mapApiResults(response);

      setResults(mappedResults);
      setRequestMeta({
        requestedScenario: form.scenario,
        rawCount: mappedResults.length,
        timestamp: response?.meta?.timestamp || attemptTimestamp,
      });

      if (mappedResults.length === 0) {
        setErrorMessage(
          "The backend responded successfully, but no results were returned for this scenario."
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

  return (
    <AppShell>
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
            <ResultsList results={results} loading={loading} />
          ) : (
            <ResultsPlaceholder loading={loading} errorMessage={errorMessage} />
          )}
        </section>

        <aside className="space-y-6">
          <StatusPanel
            loading={loading}
            errorMessage={errorMessage}
            hasResults={hasResults}
            requestMeta={requestMeta}
            stats={resultStats}
          />
        </aside>
      </div>
    </AppShell>
  );
}
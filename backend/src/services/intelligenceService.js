const path = require("path");
const { spawn } = require("child_process");
const mockIntelligenceData = require("../data/mockIntelligenceData");

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const PYTHON_SCRIPT_PATH = path.resolve(
    __dirname,
    "../../../sentiment-engine/analyze.py"
);

const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
const NEWS_API_BASE_URL = "https://newsapi.org/v2/everything";

function normalizeDataset(source) {
    if (Array.isArray(source)) {
        return source;
    }

    if (Array.isArray(source?.results)) {
        return source.results;
    }

    if (Array.isArray(source?.items)) {
        return source.items;
    }

    if (Array.isArray(source?.data)) {
        return source.data;
    }

    if (Array.isArray(source?.articles)) {
        return source.articles;
    }

    return [];
}

function normalizeText(value = "") {
    return String(value)
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(value = "") {
    return normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter(Boolean);
}

function uniqueTokens(tokens = []) {
    return [...new Set(tokens)];
}

function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function slugify(value = "") {
    return normalizeText(value).replace(/\s+/g, "-");
}

function titleCase(value = "") {
    return String(value)
        .split(" ")
        .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
        .join(" ");
}

function runPythonSentiment(text) {
    return new Promise((resolve, reject) => {
        const safeText = typeof text === "string" ? text.trim() : "";

        if (!safeText) {
            return resolve({
                sentiment: "neutral",
                score: 0,
                breakdown: {
                    neg: 0,
                    neu: 1,
                    pos: 0,
                    compound: 0
                }
            });
        }

        const python = spawn(PYTHON_BIN, [PYTHON_SCRIPT_PATH, safeText], {
            stdio: ["ignore", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";

        python.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        python.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        python.on("error", (error) => {
            reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        python.on("close", (code) => {
            if (code !== 0) {
                return reject(
                    new Error(`Python script exited with code ${code}. ${stderr.trim()}`)
                );
            }

            try {
                const parsed = JSON.parse(stdout.trim());
                resolve(parsed);
            } catch (error) {
                reject(new Error(`Invalid JSON from Python script: ${stdout.trim()}`));
            }
        });
    });
}

function getTextForSentiment(item) {
    const parts = [
        item.title,
        item.headline,
        item.summary,
        item.description,
        item.content,
        item.snippet,
        item.topic,
        item.scenario
    ];

    return parts.filter(Boolean).join(". ").trim();
}

function normalizeSentimentScore(score) {
    const numeric = Number(score);

    if (Number.isNaN(numeric)) {
        return 0;
    }

    return Number(numeric.toFixed(3));
}

function buildSearchBlob(item) {
    return [
        item.title,
        item.headline,
        item.summary,
        item.description,
        item.content,
        item.snippet,
        item.topic,
        item.scenario,
        item.region,
        item.country,
        item.source,
        item.sourceName,
        item.mediaType,
        ...(Array.isArray(item.keywords) ? item.keywords : [])
    ]
        .filter(Boolean)
        .join(" ");
}

function computeKeywordScore(item, query) {
    const queryText = normalizeText(query);

    if (!queryText) {
        return 1;
    }

    const queryTokens = uniqueTokens(
        queryText
            .split(" ")
            .map((term) => term.trim())
            .filter((term) => term.length > 2)
    );

    if (queryTokens.length === 0) {
        return 1;
    }

    const haystack = normalizeText(buildSearchBlob(item));
    const haystackTokens = new Set(tokenize(haystack));

    let exactMatches = 0;
    let partialMatches = 0;

    for (const token of queryTokens) {
        if (haystackTokens.has(token)) {
            exactMatches += 1;
            continue;
        }

        const partialFound = [...haystackTokens].some(
            (hayToken) => hayToken.includes(token) || token.includes(hayToken)
        );

        if (partialFound) {
            partialMatches += 1;
        }
    }

    const exactScore = exactMatches / queryTokens.length;
    const partialScore = partialMatches / queryTokens.length;

    return Number(clamp(exactScore + partialScore * 0.4, 0, 1).toFixed(4));
}

function matchesQuery(item, query) {
    if (!query || !query.trim()) {
        return true;
    }

    const keywordScore = computeKeywordScore(item, query);
    return keywordScore >= 0.35;
}

function computeSentimentWeight(sentimentScore) {
    const normalized = (toNumber(sentimentScore, 0) + 1) / 2;
    return Number(clamp(normalized, 0, 1).toFixed(4));
}

function computeSignalWeight(signalScore) {
    const normalized = toNumber(signalScore, 0) / 100;
    return Number(clamp(normalized, 0, 1).toFixed(4));
}

function computeRecencyScore(item) {
    const rawDate = item.publishedAt || item.date;
    if (!rawDate) {
        return 0.3;
    }

    const publishedDate = new Date(rawDate);
    if (Number.isNaN(publishedDate.getTime())) {
        return 0.3;
    }

    const now = new Date();
    const diffMs = now.getTime() - publishedDate.getTime();
    const ageInDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    const rawScore = 1 / (1 + ageInDays);

    return Number(clamp(Math.max(rawScore, 0.05), 0, 1).toFixed(4));
}

function computeFinalScore({
    keywordScore,
    sentimentWeight,
    signalWeight,
    recencyScore
}) {
    const finalScore =
        keywordScore * 0.4 +
        sentimentWeight * 0.2 +
        signalWeight * 0.2 +
        recencyScore * 0.2;

    return Number(finalScore.toFixed(4));
}

function sortResults(results, sortBy = "final-desc") {
    const items = [...results];

    switch (sortBy) {
        case "signal-asc":
            return items.sort((a, b) => (a.signalScore || 0) - (b.signalScore || 0));

        case "signal-desc":
            return items.sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0));

        case "sentiment-desc":
            return items.sort(
                (a, b) => (b.sentimentScore || 0) - (a.sentimentScore || 0)
            );

        case "sentiment-asc":
            return items.sort(
                (a, b) => (a.sentimentScore || 0) - (b.sentimentScore || 0)
            );

        case "latest":
        case "published-desc":
            return items.sort((a, b) => {
                const aDate = new Date(a.publishedAt || a.date || 0).getTime();
                const bDate = new Date(b.publishedAt || b.date || 0).getTime();
                return bDate - aDate;
            });

        case "final-desc":
        default:
            return items.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
    }
}

function ensureSignalScore(item, index) {
    if (typeof item.signalScore === "number") {
        return item.signalScore;
    }

    if (typeof item.signal_score === "number") {
        return item.signal_score;
    }

    return Math.max(50 - index, 1);
}

function inferRegionAndCountry(article = {}, query = "") {
    const combined = normalizeText(
        [
            article.title,
            article.description,
            article.content,
            query
        ]
            .filter(Boolean)
            .join(" ")
    );

    const rules = [
        {
            match: ["israel", "iran", "gaza", "qatar", "saudi", "uae", "turkey", "middle east"],
            region: "Middle East",
            country: combined.includes("iran")
                ? "Iran"
                : combined.includes("israel")
                ? "Israel"
                : combined.includes("saudi")
                ? "Saudi Arabia"
                : combined.includes("uae")
                ? "UAE"
                : combined.includes("turkey")
                ? "Turkey"
                : "Regional"
        },
        {
            match: ["china", "taiwan", "japan", "korea", "philippines", "asia pacific", "south china sea"],
            region: "Asia-Pacific",
            country: combined.includes("china")
                ? "China"
                : combined.includes("taiwan")
                ? "Taiwan"
                : combined.includes("japan")
                ? "Japan"
                : combined.includes("philippines")
                ? "Philippines"
                : "Regional"
        },
        {
            match: ["europe", "germany", "france", "uk", "italy", "spain", "poland", "eu"],
            region: "Europe",
            country: combined.includes("germany")
                ? "Germany"
                : combined.includes("france")
                ? "France"
                : combined.includes("uk")
                ? "UK"
                : "Regional"
        },
        {
            match: ["united states", "us ", "u.s.", "canada", "mexico", "north america"],
            region: "North-America",
            country: combined.includes("canada")
                ? "Canada"
                : combined.includes("mexico")
                ? "Mexico"
                : "United States"
        },
        {
            match: ["africa", "egypt", "kenya", "nigeria", "south africa", "morocco"],
            region: "Africa",
            country: combined.includes("egypt")
                ? "Egypt"
                : combined.includes("kenya")
                ? "Kenya"
                : combined.includes("nigeria")
                ? "Nigeria"
                : "Regional"
        },
        {
            match: ["brazil", "argentina", "chile", "colombia", "peru", "south america"],
            region: "South-America",
            country: combined.includes("brazil")
                ? "Brazil"
                : combined.includes("argentina")
                ? "Argentina"
                : "Regional"
        }
    ];

    for (const rule of rules) {
        if (rule.match.some((term) => combined.includes(term))) {
            return {
                region: rule.region,
                country: rule.country
            };
        }
    }

    return {
        region: "Global",
        country: "Global"
    };
}

function extractKeywords(article = {}, query = "") {
    const tokens = uniqueTokens(
        tokenize(
            [
                query,
                article.title,
                article.description
            ]
                .filter(Boolean)
                .join(" ")
        )
    );

    const stopWords = new Set([
        "the",
        "and",
        "for",
        "with",
        "from",
        "that",
        "this",
        "after",
        "amid",
        "into",
        "over",
        "under",
        "about",
        "their",
        "they",
        "have",
        "has",
        "will",
        "said",
        "says",
        "news",
        "live"
    ]);

    return tokens.filter((token) => token.length > 2 && !stopWords.has(token)).slice(0, 8);
}

function inferMediaType(article = {}) {
    const sourceName = normalizeText(article?.source?.name || article.source || "");

    if (
        sourceName.includes("bbc") ||
        sourceName.includes("cnn") ||
        sourceName.includes("al jazeera") ||
        sourceName.includes("news")
    ) {
        return "International";
    }

    return "International";
}

function computeInitialSignalScore(article = {}, query = "") {
    const text = normalizeText(
        [article.title, article.description, article.content].filter(Boolean).join(" ")
    );

    const queryTokens = tokenize(query).filter((token) => token.length > 2);
    const matchedCount = queryTokens.filter((token) => text.includes(token)).length;

    let score = 55 + matchedCount * 8;

    if (article.publishedAt) {
        const ageMs = Date.now() - new Date(article.publishedAt).getTime();
        const ageHours = ageMs / (1000 * 60 * 60);

        if (ageHours <= 6) score += 12;
        else if (ageHours <= 24) score += 8;
        else if (ageHours <= 72) score += 4;
    }

    if (normalizeText(article.source?.name || "").includes("reuters")) score += 6;
    if (normalizeText(article.source?.name || "").includes("associated press")) score += 5;
    if (normalizeText(article.source?.name || "").includes("bbc")) score += 4;

    return Math.max(35, Math.min(95, score));
}

function normalizeLiveArticle(article = {}, index = 0, query = "") {
    const { region, country } = inferRegionAndCountry(article, query);
    const sourceName = article?.source?.name || "Unknown Source";
    const title = article.title || "Untitled article";
    const description =
        article.description ||
        article.content ||
        "No summary available from provider.";

    return {
        id: `live-${Date.now()}-${index}`,
        source: sourceName,
        title,
        date: article.publishedAt
            ? new Date(article.publishedAt).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        publishedAt: article.publishedAt || new Date().toISOString(),
        description,
        region,
        country,
        mediaType: inferMediaType(article),
        signalScore: computeInitialSignalScore(article, query),
        keywords: extractKeywords(article, query),
        url: article.url || "#",
        sourceType: "live"
    };
}

async function fetchLiveNews(query = "") {
    if (!NEWS_API_KEY || !query.trim()) {
        return [];
    }

    const params = new URLSearchParams({
        q: query,
        language: "en",
        sortBy: "publishedAt",
        pageSize: "12",
        apiKey: NEWS_API_KEY
    });

    const response = await fetch(`${NEWS_API_BASE_URL}?${params.toString()}`);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Live news fetch failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];

    return articles
        .filter((article) => article?.title && article?.url)
        .map((article, index) => normalizeLiveArticle(article, index, query));
}

function filterDatasetByPayload(dataset = [], payload = {}) {
    const {
        query = "",
        regions = ["world"],
        countries = [],
        mediaTypes = [],
        publicationFocus = [],
        sentimentFilter = "all"
    } = payload;

    const normalizedRegions = regions.map((region) => normalizeText(region));
    const normalizedCountries = countries.map((country) => normalizeText(country));
    const normalizedMediaTypes = mediaTypes.map((type) => normalizeText(type));
    const normalizedFocus = publicationFocus.map((focus) => normalizeText(focus));

    let items = [...dataset];

    items = items.filter((item) => {
        if (!query.trim()) return true;
        return matchesQuery(item, query);
    });

    items = items.filter((item) => {
        if (!normalizedRegions.length || normalizedRegions.includes("world")) {
            return true;
        }

        const itemRegion = normalizeText(item.region).replace(/\s+/g, "-");
        return normalizedRegions.includes(itemRegion);
    });

    items = items.filter((item) => {
        if (!normalizedCountries.length) {
            return true;
        }

        const itemCountry = normalizeText(item.country);
        return normalizedCountries.includes(itemCountry);
    });

    items = items.filter((item) => {
        if (!normalizedMediaTypes.length) {
            return true;
        }

        const itemMediaType = normalizeText(item.mediaType);
        const mappedMedia =
            itemMediaType === "international" ||
            itemMediaType === "regional" ||
            itemMediaType === "business" ||
            itemMediaType === "policy"
                ? "newspapers"
                : itemMediaType;

        return normalizedMediaTypes.includes(mappedMedia);
    });

    items = items.filter((item) => {
        if (!normalizedFocus.length) {
            return true;
        }

        const itemFocus = normalizeText(item.mediaType) === "regional" ? "regional" : "international";
        return normalizedFocus.includes(itemFocus);
    });

    if (sentimentFilter && sentimentFilter !== "all") {
        items = items.filter((item) => normalizeText(item.sentiment) === normalizeText(sentimentFilter));
    }

    return items;
}

async function enrichItemWithSentiment(item, index, query) {
    const text = getTextForSentiment(item);
    const sentimentResult = await runPythonSentiment(text);

    const signalScore = ensureSignalScore(item, index);
    const sentimentScore = normalizeSentimentScore(sentimentResult.score);
    const keywordScore = computeKeywordScore(item, query);
    const sentimentWeight = computeSentimentWeight(sentimentScore);
    const signalWeight = computeSignalWeight(signalScore);
    const recencyScore = computeRecencyScore(item);

    const finalScore = computeFinalScore({
        keywordScore,
        sentimentWeight,
        signalWeight,
        recencyScore
    });

    return {
        ...item,
        signalScore,
        sentiment: sentimentResult.sentiment || "neutral",
        sentimentScore,
        sentimentBreakdown: sentimentResult.breakdown || {
            neg: 0,
            neu: 1,
            pos: 0,
            compound: 0
        },
        keywordScore,
        sentimentWeight,
        signalWeight,
        recencyScore,
        finalScore
    };
}

async function getSourceDataset(payload = {}) {
    const query = (payload.query || "").trim();

    try {
        const liveResults = await fetchLiveNews(query);

        if (liveResults.length > 0) {
            return {
                dataset: liveResults,
                sourceMode: "live"
            };
        }
    } catch (error) {
        console.error("Live news fetch failed, falling back to mock data:", error.message);
    }

    return {
        dataset: normalizeDataset(mockIntelligenceData),
        sourceMode: "mock"
    };
}

async function analyzeIntelligence(payload = {}) {
    const query = (payload.query || "").trim();
    const sortBy = payload.sortBy || "final-desc";

    const { dataset, sourceMode } = await getSourceDataset(payload);
    const filteredItems = filterDatasetByPayload(dataset, payload);

    const enrichedItems = await Promise.all(
        filteredItems.map((item, index) => enrichItemWithSentiment(item, index, query))
    );

    const sortedResults = sortResults(enrichedItems, sortBy);

    const metrics = {
        totalResults: sortedResults.length,
        averageSignalScore:
            sortedResults.length > 0
                ? Number(
                      (
                          sortedResults.reduce(
                              (sum, item) => sum + Number(item.signalScore || 0),
                              0
                          ) / sortedResults.length
                      ).toFixed(2)
                  )
                : 0,
        averageSentimentScore:
            sortedResults.length > 0
                ? Number(
                      (
                          sortedResults.reduce(
                              (sum, item) => sum + Number(item.sentimentScore || 0),
                              0
                          ) / sortedResults.length
                      ).toFixed(3)
                  )
                : 0,
        averageFinalScore:
            sortedResults.length > 0
                ? Number(
                      (
                          sortedResults.reduce(
                              (sum, item) => sum + Number(item.finalScore || 0),
                              0
                          ) / sortedResults.length
                      ).toFixed(4)
                  )
                : 0,
        topSignalScore:
            sortedResults.length > 0
                ? Math.max(...sortedResults.map((item) => Number(item.signalScore || 0)))
                : 0,
        topFinalScore:
            sortedResults.length > 0
                ? Number(
                      Math.max(...sortedResults.map((item) => Number(item.finalScore || 0))).toFixed(4)
                  )
                : 0
    };

    return {
        success: true,
        query,
        sortBy,
        sourceMode,
        metrics,
        results: sortedResults
    };
}

module.exports = {
    analyzeIntelligence
};
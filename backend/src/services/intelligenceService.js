const path = require("path");
const { spawn } = require("child_process");
const mockIntelligenceData = require("../data/mockIntelligenceData");

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const PYTHON_SCRIPT_PATH = path.resolve(
    __dirname,
    "../../../sentiment-engine/analyze.py"
);

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
                reject(
                    new Error(`Invalid JSON from Python script: ${stdout.trim()}`)
                );
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

async function analyzeIntelligence(payload = {}) {
    const query = (payload.query || "").trim();
    const sortBy = payload.sortBy || "final-desc";

    const dataset = normalizeDataset(mockIntelligenceData);

    const matchedItems = dataset.filter((item) => matchesQuery(item, query));

    const enrichedItems = await Promise.all(
        matchedItems.map((item, index) => enrichItemWithSentiment(item, index, query))
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
        metrics,
        results: sortedResults
    };
}

module.exports = {
    analyzeIntelligence
};
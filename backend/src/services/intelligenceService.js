const path = require("path");
const { spawn } = require("child_process");

const PYTHON_WORKER_TIMEOUT_MS = Number(process.env.PYTHON_WORKER_TIMEOUT_MS || 20000);

function normalizePayload(payload = {}) {
    return {
        query: typeof payload.query === "string" ? payload.query.trim() : "",
        regions: Array.isArray(payload.regions) ? payload.regions : ["world"],
        countries: Array.isArray(payload.countries) ? payload.countries : [],
        mediaTypes: Array.isArray(payload.mediaTypes) ? payload.mediaTypes : ["newspapers", "news-channels"],
        publicationFocus: Array.isArray(payload.publicationFocus) ? payload.publicationFocus : ["international"],
        sentimentFilter: payload.sentimentFilter || "all",
        sortBy: payload.sortBy || "final-desc",
        selectedTrend: payload.selectedTrend || ""
    };
}

function resolvePythonCommand() {
    return process.env.PYTHON_BIN || "python3";
}

function resolveWorkerPath() {
    return path.resolve(__dirname, "../python/rss_intelligence_worker.py");
}

/* ---------------------------
   GEO-39 CORE IMPROVEMENTS
----------------------------*/

// Normalize text safely
function normalizeText(text = "") {
    return String(text).toLowerCase().replace(/[^a-z0-9 ]/g, " ");
}

// Basic keyword relevance scoring
function calculateRelevance(article, query) {
    if (!query) return 50;

    const q = normalizeText(query).split(" ").filter(Boolean);
    const text = normalizeText(article.title + " " + article.summary);

    let matches = 0;
    q.forEach(word => {
        if (text.includes(word)) matches++;
    });

    return Math.min(100, Math.round((matches / q.length) * 100));
}

// Remove weak / broken articles
function cleanArticles(articles = []) {
    return articles.filter(a =>
        a &&
        a.title &&
        a.summary &&
        a.title.length > 10
    );
}

// Remove duplicates (same title similarity)
function deduplicateArticles(articles = []) {
    const seen = new Set();

    return articles.filter(a => {
        const key = normalizeText(a.title).slice(0, 80);

        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Recalculate final score (weighted)
function computeFinalScore(article) {
    const relevance = article.relevanceScore || 50;
    const freshness = article.freshnessScore || 50;
    const sentiment = Math.abs(article.sentimentScore || 0) * 100;
    const signal = article.signalScore || 50;

    return Math.round(
        (relevance * 0.4) +
        (freshness * 0.25) +
        (signal * 0.2) +
        (sentiment * 0.15)
    );
}

function enhanceArticles(articles, query) {
    return articles.map(a => {
        const relevanceScore = calculateRelevance(a, query);

        const enhanced = {
            ...a,
            relevanceScore,
            finalScore: computeFinalScore({
                ...a,
                relevanceScore
            })
        };

        return enhanced;
    });
}

/* ---------------------------
   EXISTING FUNCTIONS
----------------------------*/

function collapseSentimentLabel(label = "") {
    const normalized = String(label).toLowerCase();
    if (normalized.includes("positive")) return "positive";
    if (normalized.includes("negative")) return "negative";
    return "neutral";
}

function filterBySentiment(results, sentimentFilter = "all") {
    if (!sentimentFilter || sentimentFilter === "all") {
        return results;
    }

    return results.filter((item) => {
        const normalized = collapseSentimentLabel(item.sentimentLabel || "");
        return normalized === sentimentFilter;
    });
}

function compareDatesDesc(a, b) {
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
}

function sortResults(results, sortBy = "final-desc") {
    const cloned = [...results];

    switch (sortBy) {
        case "published-desc":
            return cloned.sort(compareDatesDesc);

        case "signal-desc":
            return cloned.sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0));

        case "relevance-desc":
            return cloned.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        case "final-desc":
        default:
            return cloned.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
    }
}

/* ---------------------------
   PYTHON WORKER
----------------------------*/

function runPythonWorker(payload) {
    return new Promise((resolve, reject) => {
        const pythonBin = resolvePythonCommand();
        const workerPath = resolveWorkerPath();

        const child = spawn(pythonBin, [workerPath], {
            stdio: ["pipe", "pipe", "pipe"],
            env: {
                ...process.env,
                PYTHONIOENCODING: "utf-8"
            }
        });

        let stdout = "";
        let stderr = "";
        let finished = false;

        const timeoutHandle = setTimeout(() => {
            if (finished) return;

            finished = true;
            child.kill("SIGTERM");
            reject(new Error(`Python worker timed out after ${PYTHON_WORKER_TIMEOUT_MS}ms`));
        }, PYTHON_WORKER_TIMEOUT_MS);

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", (code) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeoutHandle);

            if (code !== 0) {
                return reject(new Error(`Python worker exited with code ${code}: ${stderr}`));
            }

            try {
                const parsed = JSON.parse(stdout);
                resolve(parsed);
            } catch (e) {
                reject(new Error(`JSON parse failed: ${e.message}`));
            }
        });

        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
    });
}

/* ---------------------------
   MAIN SERVICE
----------------------------*/

async function getIntelligenceResults(rawPayload = {}) {
    const payload = normalizePayload(rawPayload);

    let workerOutput;
    let usedFallback = false;

    try {
        workerOutput = await runPythonWorker(payload);
    } catch (error) {
        console.error("Python worker failed:", error.message);

        usedFallback = true;
        workerOutput = {
            success: true,
            mode: "fallback",
            source: "mock",
            articles: []
        };
    }

    let articles = Array.isArray(workerOutput.articles) ? workerOutput.articles : [];

    // GEO-39 PIPELINE
    articles = cleanArticles(articles);
    articles = deduplicateArticles(articles);
    articles = enhanceArticles(articles, payload.query);

    articles = filterBySentiment(articles, payload.sentimentFilter);
    articles = sortResults(articles, payload.sortBy);

    // Limit results (UI friendly)
    articles = articles.slice(0, 10);

    return {
        query: payload.query,
        source: usedFallback ? "mock-fallback" : workerOutput.source || "rss-live",
        mode: usedFallback ? "fallback" : workerOutput.mode || "live",
        total: articles.length,
        results: articles,
        meta: {
            sortBy: payload.sortBy,
            sentimentFilter: payload.sentimentFilter
        }
    };
}

module.exports = {
    getIntelligenceResults
};
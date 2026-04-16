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

function resolveWorkerPath() {
    return path.resolve(__dirname, "../python/rss_intelligence_worker.py");
}

function resolvePythonInvocation() {
    const configured = process.env.PYTHON_BIN;

    if (configured && configured.trim()) {
        return {
            command: configured.trim(),
            argsPrefix: []
        };
    }

    if (process.platform === "win32") {
        return {
            command: "py",
            argsPrefix: ["-3"]
        };
    }

    return {
        command: "python3",
        argsPrefix: []
    };
}

/* ---------------------------
   GEO-39 CORE IMPROVEMENTS
----------------------------*/

function normalizeText(text = "") {
    return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function calculateRelevance(article, query) {
    if (!query) return 50;

    const words = normalizeText(query).split(" ").filter(Boolean);
    if (!words.length) return 50;

    const articleText = normalizeText(`${article.title || ""} ${article.summary || ""}`);

    let matches = 0;
    for (const word of words) {
        if (articleText.includes(word)) {
            matches += 1;
        }
    }

    return Math.min(100, Math.round((matches / words.length) * 100));
}

function cleanArticles(articles = []) {
    return articles.filter((article) => {
        return (
            article &&
            typeof article.title === "string" &&
            typeof article.summary === "string" &&
            article.title.trim().length > 10 &&
            article.summary.trim().length > 10
        );
    });
}

function deduplicateArticles(articles = []) {
    const seen = new Set();

    return articles.filter((article) => {
        const key = normalizeText(article.title || "").slice(0, 100);

        if (!key) return false;
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
    });
}

function computeFinalScore(article) {
    const relevance = Number(article.relevanceScore || 50);
    const freshness = Number(article.freshnessScore || 50);
    const signal = Number(article.signalScore || 50);
    const sentimentMagnitude = Math.abs(Number(article.sentimentScore || 0)) * 100;

    return Math.round(
        relevance * 0.4 +
        freshness * 0.25 +
        signal * 0.2 +
        sentimentMagnitude * 0.15
    );
}

function enhanceArticles(articles = [], query = "") {
    return articles.map((article) => {
        const relevanceScore = calculateRelevance(article, query);

        return {
            ...article,
            relevanceScore,
            finalScore: computeFinalScore({
                ...article,
                relevanceScore
            })
        };
    });
}

/* ---------------------------
   EXISTING FILTER/SORT HELPERS
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

function compareDatesAsc(a, b) {
    return new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0);
}

function sortResults(results, sortBy = "final-desc") {
    const cloned = [...results];

    switch (sortBy) {
        case "signal-desc":
            return cloned.sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0));

        case "signal-asc":
            return cloned.sort((a, b) => (a.signalScore || 0) - (b.signalScore || 0));

        case "sentiment-desc":
            return cloned.sort((a, b) => (b.sentimentScore || 0) - (a.sentimentScore || 0));

        case "sentiment-asc":
            return cloned.sort((a, b) => (a.sentimentScore || 0) - (b.sentimentScore || 0));

        case "freshness-desc":
            return cloned.sort((a, b) => (b.freshnessScore || 0) - (a.freshnessScore || 0));

        case "relevance-desc":
            return cloned.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

        case "published-desc":
            return cloned.sort(compareDatesDesc);

        case "published-asc":
            return cloned.sort(compareDatesAsc);

        case "source-asc":
            return cloned.sort((a, b) => String(a.source || "").localeCompare(String(b.source || "")));

        case "title-asc":
            return cloned.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));

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
        const workerPath = resolveWorkerPath();
        const { command, argsPrefix } = resolvePythonInvocation();
        const childArgs = [...argsPrefix, workerPath];

        const child = spawn(command, childArgs, {
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

        child.on("error", (error) => {
            if (finished) return;

            finished = true;
            clearTimeout(timeoutHandle);

            reject(
                new Error(
                    `Failed to start Python worker using command "${command}": ${error.message}`
                )
            );
        });

        child.on("close", (code) => {
            if (finished) return;

            finished = true;
            clearTimeout(timeoutHandle);

            if (code !== 0) {
                return reject(
                    new Error(
                        `Python worker exited with code ${code}: ${stderr || "No stderr output"}`
                    )
                );
            }

            try {
                const parsed = JSON.parse(stdout);
                resolve(parsed);
            } catch (parseError) {
                reject(
                    new Error(
                        `Failed to parse Python worker JSON: ${parseError.message}. Raw stdout: ${stdout}`
                    )
                );
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
        console.error("Python worker failed, switching to mock fallback:", error.message);

        usedFallback = true;
        workerOutput = {
            success: true,
            mode: "fallback",
            source: "mock",
            articles: []
        };
    }

    let articles = Array.isArray(workerOutput.articles) ? workerOutput.articles : [];

    articles = cleanArticles(articles);
    articles = deduplicateArticles(articles);
    articles = enhanceArticles(articles, payload.query);
    articles = filterBySentiment(articles, payload.sentimentFilter);
    articles = sortResults(articles, payload.sortBy);
    articles = articles.slice(0, 10);

    return {
        query: payload.query,
        source: usedFallback ? "mock-fallback" : workerOutput.source || "rss-live",
        mode: usedFallback ? "fallback" : workerOutput.mode || "live",
        total: articles.length,
        results: articles,
        meta: {
            sortBy: payload.sortBy,
            sentimentFilter: payload.sentimentFilter,
            regions: payload.regions,
            countries: payload.countries,
            mediaTypes: payload.mediaTypes,
            publicationFocus: payload.publicationFocus,
            selectedTrend: payload.selectedTrend || null
        }
    };
}

module.exports = {
    getIntelligenceResults
};
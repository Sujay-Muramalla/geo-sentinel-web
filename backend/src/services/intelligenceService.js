const path = require("path");
const { spawn } = require("child_process");

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

function buildMockFallback(query) {
    const safeQuery = query || "global tensions";

    return [
        {
            id: `mock-1-${Date.now()}`,
            title: `Live feed fallback: ${safeQuery} remains volatile across multiple regions`,
            source: "Mock Intelligence Feed",
            sourceType: "mock",
            publishedAt: new Date().toISOString(),
            summary: `Fallback intelligence result used because live RSS returned no stable article set for "${safeQuery}".`,
            url: "https://news.google.com/",
            sentimentLabel: "neutral",
            sentimentScore: 0,
            signalScore: 67,
            relevanceScore: 82,
            freshnessScore: 70,
            finalScore: 75,
            region: "Global",
            country: "Multiple",
            topic: safeQuery
        },
        {
            id: `mock-2-${Date.now()}`,
            title: `Policy and security narratives continue to shape the ${safeQuery} storyline`,
            source: "Mock Intelligence Feed",
            sourceType: "mock",
            publishedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
            summary: `Fallback intelligence keeps the frontend responsive while the ingestion layer retries live feeds.`,
            url: "https://news.google.com/",
            sentimentLabel: "slightly-negative",
            sentimentScore: -0.18,
            signalScore: 61,
            relevanceScore: 78,
            freshnessScore: 64,
            finalScore: 69,
            region: "Global",
            country: "Multiple",
            topic: safeQuery
        }
    ];
}

function sortResults(results, sortBy = "final-desc") {
    const cloned = [...results];

    switch (sortBy) {
        case "signal-desc":
            return cloned.sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0));
        case "sentiment-desc":
            return cloned.sort((a, b) => (b.sentimentScore || 0) - (a.sentimentScore || 0));
        case "freshness-desc":
            return cloned.sort((a, b) => (b.freshnessScore || 0) - (a.freshnessScore || 0));
        case "relevance-desc":
            return cloned.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        case "final-desc":
        default:
            return cloned.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
    }
}

function filterBySentiment(results, sentimentFilter = "all") {
    if (!sentimentFilter || sentimentFilter === "all") {
        return results;
    }

    return results.filter((item) => item.sentimentLabel === sentimentFilter);
}

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

        child.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("error", (error) => {
            reject(new Error(`Failed to start Python worker: ${error.message}`));
        });

        child.on("close", (code) => {
            if (code !== 0) {
                return reject(new Error(`Python worker exited with code ${code}: ${stderr}`));
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
            articles: buildMockFallback(payload.query)
        };
    }

    const sourceArticles = Array.isArray(workerOutput.articles) ? workerOutput.articles : [];
    let filtered = filterBySentiment(sourceArticles, payload.sentimentFilter);
    filtered = sortResults(filtered, payload.sortBy);

    return {
        query: payload.query,
        source: usedFallback ? "mock-fallback" : workerOutput.source || "rss-live",
        mode: usedFallback ? "fallback" : workerOutput.mode || "live",
        total: filtered.length,
        results: filtered,
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
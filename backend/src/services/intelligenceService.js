const path = require("path");
const { spawn } = require("child_process");
const { URL } = require("url");
const {
    SOURCE_REGISTRY,
    normalizeKey,
    resolveRegionFromCountry
} = require("../config/sourceRegistry");
const env = require("../config/env");
const AppError = require("../utils/appError");
const logger = require("../utils/logger");
const {
    generateQueryHash,
    getCache,
    putCache,
    buildCacheItem,
    buildExpiryTimestamp
} = require("./cacheService");
const { putSnapshot } = require("./snapshotService");

const PYTHON_WORKER_TIMEOUT_MS = env.pythonWorkerTimeoutMs;

function normalizePayload(payload = {}) {
    return {
        query: typeof payload.query === "string" ? payload.query.trim() : "",
        regions: Array.isArray(payload.regions) && payload.regions.length ? payload.regions : ["world"],
        countries: Array.isArray(payload.countries) ? payload.countries : [],
        mediaTypes: Array.isArray(payload.mediaTypes) && payload.mediaTypes.length
            ? payload.mediaTypes
            : ["newspapers", "news-channels"],
        publicationFocus: Array.isArray(payload.publicationFocus) && payload.publicationFocus.length
            ? payload.publicationFocus
            : ["international"],
        sentimentFilter: payload.sentimentFilter || "all",
        sortBy: payload.sortBy || "final-desc",
        selectedTrend: payload.selectedTrend || ""
    };
}

function validatePayload(payload = {}) {
    const query = String(payload.query || "").trim();
    const selectedTrend = String(payload.selectedTrend || "").trim();

    if (!query && !selectedTrend) {
        throw new AppError("Scenario query is required", 400, "VALIDATION_ERROR");
    }
}

function resolvePythonCommand() {
    return env.pythonCommand;
}

function resolveWorkerPath() {
    return process.env.PYTHON_INTELLIGENCE_WORKER
        ? path.resolve(process.env.PYTHON_INTELLIGENCE_WORKER)
        : path.resolve(env.pythonIntelligenceWorker);
}

function parseJsonSafe(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function toNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeText(value = "") {
    return String(value || "").trim();
}

function normalizeList(values = []) {
    return (Array.isArray(values) ? values : [])
        .map((item) => normalizeText(item))
        .filter(Boolean);
}

function extractDomain(url = "") {
    try {
        return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
        return "";
    }
}

function findSourceRegistryEntry(article = {}) {
    const sourceName = normalizeKey(article.source || article.outlet || article.publisher || "");
    const domain = extractDomain(article.url || article.link || "");

    return SOURCE_REGISTRY.find((entry) => {
        const matchesDomain = Array.isArray(entry.matchers)
            && entry.matchers.some((matcher) => domain.includes(normalizeKey(matcher)));
        const matchesName = sourceName && sourceName.includes(normalizeKey(entry.name));
        return matchesDomain || matchesName;
    }) || null;
}

function sourceQualityLabel(score) {
    if (score >= 0.9) return "elite";
    if (score >= 0.8) return "high";
    if (score >= 0.68) return "standard";
    return "limited";
}

function annotateSourceMetadata(article = {}) {
    const registryEntry = findSourceRegistryEntry(article);

    const sourceName = normalizeText(article.source || article.outlet || article.publisher || "Unknown Source");
    const sourceCountry = normalizeText(
        article.sourceCountry || article.country || (registryEntry ? registryEntry.country : "")
    );
    const sourceRegion = normalizeText(
        article.sourceRegion || article.region || (registryEntry ? registryEntry.region : "") || resolveRegionFromCountry(sourceCountry)
    );
    const sourceTier = normalizeText(
        article.sourceTier || (registryEntry ? registryEntry.tier : "") || "standard"
    ).toLowerCase();

    const influenceWeight = toNumber(
        article.influenceWeight || article.sourceWeight || (registryEntry ? registryEntry.influenceWeight : 1.0),
        1.0
    );

    const sourceQualityScore = toNumber(
        article.sourceQualityScore,
        clamp((influenceWeight * 0.72) + (toNumber(article.sourceReliabilityScore, 0.85) * 0.28), 0.3, 1.0)
    );

    const publicationFocus = normalizeText(
        article.publicationFocus || (registryEntry ? registryEntry.focus : "") || "international"
    ).toLowerCase();

    return {
        ...article,
        source: sourceName,
        sourceCountry: sourceCountry || "Unknown",
        sourceRegion: sourceRegion || "Unknown",
        sourceTier,
        influenceWeight,
        sourceQualityScore,
        sourceQuality: article.sourceQuality || sourceQualityLabel(sourceQualityScore),
        publicationFocus,
        sourceId: article.sourceId || (registryEntry ? registryEntry.id : null),
        domain: extractDomain(article.url || article.link || "")
    };
}

function matchesSelectedCountries(article, payload) {
    const selectedCountries = normalizeList(payload.countries).map(normalizeKey);
    if (!selectedCountries.length) return true;

    const articleCountries = [
        article.sourceCountry,
        article.country,
        ...(Array.isArray(article.countries) ? article.countries : [])
    ].map(normalizeText).filter(Boolean).map(normalizeKey);

    return articleCountries.some((country) => selectedCountries.includes(country));
}

function matchesSelectedRegions(article, payload) {
    const selectedRegions = normalizeList(payload.regions)
        .map(normalizeKey)
        .filter((region) => region !== "world");

    if (!selectedRegions.length) return true;

    const articleRegions = [
        article.sourceRegion,
        article.region,
        ...(Array.isArray(article.regions) ? article.regions : [])
    ].map(normalizeText).filter(Boolean).map(normalizeKey);

    return articleRegions.some((region) => selectedRegions.includes(region));
}

function matchesPublicationFocus(article, payload) {
    const selectedFocus = normalizeList(payload.publicationFocus).map(normalizeKey);
    if (!selectedFocus.length || selectedFocus.includes("all")) return true;

    return selectedFocus.includes(normalizeKey(article.publicationFocus || "international"));
}

function matchesSentimentFilter(article, payload) {
    const filter = normalizeKey(payload.sentimentFilter || "all");
    if (filter === "all") return true;

    return normalizeKey(article.sentiment || article.sentimentLabel || "neutral") === filter;
}

function computeGeoAlignmentScore(article, payload) {
    if (Number.isFinite(Number(article.geoAlignmentScore))) {
        return Number(article.geoAlignmentScore);
    }

    const selectedCountries = normalizeList(payload.countries).map(normalizeKey);
    const selectedRegions = normalizeList(payload.regions).map(normalizeKey);

    let score = 0;

    if (selectedCountries.length) {
        if (selectedCountries.includes(normalizeKey(article.sourceCountry))) score += 2.5;
    } else if (selectedRegions.length && !selectedRegions.includes("world")) {
        if (selectedRegions.includes(normalizeKey(article.sourceRegion))) score += 1.75;
    } else if (selectedRegions.includes("world")) {
        score += 0.4;
    }

    return score;
}

function computeTierScore(article) {
    const tier = normalizeKey(article.sourceTier || "standard");
    if (tier === "top") return 1.4;
    if (tier === "high") return 1.0;
    if (tier === "regional") return 0.75;
    return 0.45;
}

function computeRecencyScore(article) {
    if (Number.isFinite(Number(article.recencyScore))) {
        return Number(article.recencyScore);
    }

    const publishedAt = article.publishedAt || article.pubDate || article.isoDate || "";
    const timestamp = Date.parse(publishedAt);
    if (!Number.isFinite(timestamp)) return 0.25;

    const hoursOld = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));

    if (hoursOld <= 6) return 1.5;
    if (hoursOld <= 24) return 1.2;
    if (hoursOld <= 72) return 0.9;
    if (hoursOld <= 168) return 0.55;
    return 0.2;
}

function computeQueryRelevance(article, payload) {
    if (Number.isFinite(Number(article.queryMatchScore))) {
        return Number(article.queryMatchScore);
    }

    const query = normalizeKey(payload.query || payload.selectedTrend || "");
    if (!query) return 0;

    const title = normalizeKey(article.title || "");
    const summary = normalizeKey(article.summary || article.description || "");
    const combined = `${title} ${summary}`;

    const queryTerms = query.split(/\s+/).filter((term) => term.length > 2);
    if (!queryTerms.length) return 0;

    let matches = 0;
    for (const term of queryTerms) {
        if (combined.includes(term)) matches += 1;
    }

    return clamp(matches / queryTerms.length, 0, 1.5) * 2.0;
}

function computeSentimentScore(article) {
    const numeric = toNumber(article.sentimentScore, null);
    if (numeric === null) return 0.1;

    return clamp(Math.abs(numeric), 0, 1);
}

function scoreArticle(article, payload) {
    const geoAlignment = computeGeoAlignmentScore(article, payload);
    const tierScore = computeTierScore(article);
    const recencyScore = computeRecencyScore(article);
    const queryRelevance = computeQueryRelevance(article, payload);
    const sentimentStrength = computeSentimentScore(article);
    const influenceWeight = toNumber(article.influenceWeight, 1);

    const computedFinalScore =
        (queryRelevance * 2.0) +
        (geoAlignment * 2.4) +
        (tierScore * 1.0) +
        (recencyScore * 1.0) +
        (sentimentStrength * 0.35) +
        ((influenceWeight - 1) * 2.2);

    const finalScore = Number.isFinite(Number(article.finalScore))
        ? Number(article.finalScore)
        : Number(computedFinalScore.toFixed(4));

    return {
        ...article,
        geoAlignment,
        tierScore,
        recencyScore,
        queryRelevance,
        sentimentStrength,
        finalScore,
        signalScore: Number.isFinite(Number(article.signalScore)) ? Number(article.signalScore) : finalScore
    };
}

function sortArticles(articles = [], sortBy = "final-desc") {
    const sorted = [...articles];

    switch (sortBy) {
        case "published-desc":
            return sorted.sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""));
        case "source-weight-desc":
            return sorted.sort((a, b) => toNumber(b.influenceWeight, 1) - toNumber(a.influenceWeight, 1));
        case "sentiment-desc":
            return sorted.sort((a, b) => toNumber(b.sentimentScore, 0) - toNumber(a.sentimentScore, 0));
        case "signal-desc":
        case "final-desc":
        default:
            return sorted.sort((a, b) => toNumber(b.finalScore, 0) - toNumber(a.finalScore, 0));
    }
}

function transformRawArticle(raw = {}, payload) {
    const annotated = annotateSourceMetadata({
        ...raw,
        id: raw.id || raw.guid || raw.link || `${raw.source || "source"}-${raw.title || "title"}`,
        title: normalizeText(raw.title),
        summary: normalizeText(raw.summary || raw.description || raw.contentSnippet || ""),
        url: normalizeText(raw.url || raw.link),
        source: normalizeText(raw.source || raw.outlet || raw.publisher || ""),
        publishedAt: raw.publishedAt || raw.pubDate || raw.isoDate || "",
        sentiment: normalizeText(raw.sentiment || raw.sentimentLabel || "neutral").toLowerCase(),
        sentimentScore: toNumber(raw.sentimentScore, 0),
        mediaType: normalizeText(raw.mediaType || "news-article").toLowerCase(),
        region: normalizeText(raw.region || ""),
        country: normalizeText(raw.country || ""),
        regions: Array.isArray(raw.regions) ? raw.regions : [],
        countries: Array.isArray(raw.countries) ? raw.countries : []
    });

    return scoreArticle(annotated, payload);
}

function strictGeographicFilter(articles = [], payload) {
    return articles.filter((article) => {
        const countryMatch = matchesSelectedCountries(article, payload);
        const regionMatch = matchesSelectedRegions(article, payload);
        const focusMatch = matchesPublicationFocus(article, payload);
        const sentimentMatch = matchesSentimentFilter(article, payload);

        return countryMatch && regionMatch && focusMatch && sentimentMatch;
    });
}

function buildFallbackResults(payload) {
    const base = [
        {
            title: `Regional coverage: ${payload.query || payload.selectedTrend || "selected topic"} in India`,
            summary: "Fallback intelligence card showing India-aligned source coverage when the Python worker is unavailable.",
            source: "NDTV",
            url: "https://www.ndtv.com",
            publishedAt: new Date().toISOString(),
            sentiment: "neutral",
            sentimentScore: 0.08,
            mediaType: "news-article"
        },
        {
            title: `Regional coverage: ${payload.query || payload.selectedTrend || "selected topic"} in Europe`,
            summary: "Fallback intelligence card showing Europe-aligned source coverage when the Python worker is unavailable.",
            source: "DW",
            url: "https://www.dw.com",
            publishedAt: new Date().toISOString(),
            sentiment: "negative",
            sentimentScore: -0.21,
            mediaType: "news-article"
        },
        {
            title: `Regional coverage: ${payload.query || payload.selectedTrend || "selected topic"} in the global press`,
            summary: "Fallback intelligence card showing world/global source coverage when the Python worker is unavailable.",
            source: "Reuters",
            url: "https://www.reuters.com",
            publishedAt: new Date().toISOString(),
            sentiment: "neutral",
            sentimentScore: 0.02,
            mediaType: "news-article"
        }
    ];

    return strictGeographicFilter(
        base.map((item) => transformRawArticle(item, payload)),
        payload
    );
}

function runPythonWorker(payload) {
    const pythonCommand = resolvePythonCommand();
    const workerPath = resolveWorkerPath();

    logger.info("Starting Python intelligence worker", {
        pythonCommand,
        workerPath,
        timeoutMs: PYTHON_WORKER_TIMEOUT_MS
    });

    return new Promise((resolve, reject) => {
        const startedAt = Date.now();

        const child = spawn(pythonCommand, [workerPath], {
            env: {
                ...process.env,
                PYTHONIOENCODING: "utf-8"
            },
            stdio: ["pipe", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";
        let settled = false;

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                child.kill("SIGTERM");

                logger.error("Python intelligence worker timed out", {
                    durationMs: Date.now() - startedAt,
                    timeoutMs: PYTHON_WORKER_TIMEOUT_MS
                });

                reject(new AppError("The intelligence worker timed out", 504, "WORKER_TIMEOUT"));
            }
        }, PYTHON_WORKER_TIMEOUT_MS);

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });

        child.on("error", (error) => {
            clearTimeout(timeout);

            if (!settled) {
                settled = true;

                logger.error("Failed to start Python intelligence worker", {
                    message: error.message
                });

                reject(new AppError("Failed to start intelligence worker", 500, "WORKER_EXECUTION_FAILED"));
            }
        });

        child.on("close", (code) => {
            clearTimeout(timeout);

            if (settled) return;

            if (code !== 0) {
                settled = true;

                logger.error("Python worker exited with non-zero status", {
                    exitCode: code,
                    durationMs: Date.now() - startedAt,
                    stderr: stderr.trim()
                });

                reject(
                    new AppError("Intelligence worker execution failed", 500, "WORKER_EXECUTION_FAILED", {
                        exitCode: code
                    })
                );
                return;
            }

            const parsed = parseJsonSafe(stdout, null);

            if (!parsed) {
                settled = true;

                logger.error("Python worker returned invalid JSON", {
                    durationMs: Date.now() - startedAt,
                    stdoutPreview: stdout.slice(0, 500),
                    stderr: stderr.trim()
                });

                reject(new AppError("Invalid response from intelligence worker", 500, "WORKER_INVALID_RESPONSE"));
                return;
            }

            settled = true;

            logger.info("Python intelligence worker completed", {
                durationMs: Date.now() - startedAt
            });

            resolve(parsed);
        });

        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
    });
}

function buildWorkerMetadata(workerResponse = {}) {
    return {
        expandedQueries: Array.isArray(workerResponse.expandedQueries) ? workerResponse.expandedQueries : [],
        selectedSources: Array.isArray(workerResponse.selectedSources) ? workerResponse.selectedSources : [],
        diagnostics: workerResponse.diagnostics || null,
        noResultExplanation: workerResponse.noResultExplanation || null,
        rawItemsSeen: toNumber(workerResponse.rawItemsSeen, 0),
        filteredOutCount: toNumber(workerResponse.filteredOutCount, 0),
        feedErrors: Array.isArray(workerResponse.feedErrors) ? workerResponse.feedErrors : []
    };
}

function buildCacheMetadata({ hit, queryHash, cachedItem = null }) {
    return {
        hit,
        queryHash,
        createdAt: cachedItem ? cachedItem.createdAt : null,
        expiresAt: cachedItem ? cachedItem.expiresAt : null,
        s3SnapshotKey: cachedItem ? cachedItem.s3SnapshotKey || null : null
    };
}

async function generateIntelligence(payload = {}) {
    const normalizedPayload = normalizePayload(payload);
    validatePayload(normalizedPayload);

    const queryHash = generateQueryHash(normalizedPayload);
    const cachedItem = await getCache(queryHash);

    if (cachedItem && cachedItem.responsePayload) {
        logger.info("Returning cached intelligence response", {
            queryHash,
            sourceCount: cachedItem.sourceCount || 0,
            createdAt: cachedItem.createdAt,
            expiresAt: cachedItem.expiresAt,
            s3SnapshotKey: cachedItem.s3SnapshotKey || null
        });

        return {
            ...cachedItem.responsePayload,
            mode: "cache",
            cache: buildCacheMetadata({
                hit: true,
                queryHash,
                cachedItem
            })
        };
    }

    try {
        const workerResponse = await runPythonWorker(normalizedPayload);

        const rawResults = Array.isArray(workerResponse.results)
            ? workerResponse.results
            : Array.isArray(workerResponse)
                ? workerResponse
                : [];

        const transformed = rawResults.map((item) => transformRawArticle(item, normalizedPayload));
        const filtered = strictGeographicFilter(transformed, normalizedPayload);
        const sorted = sortArticles(filtered, normalizedPayload.sortBy);
        const finalResults = sorted;
        const workerMetadata = buildWorkerMetadata(workerResponse);

        const noResultExplanation = finalResults.length === 0
            ? workerMetadata.noResultExplanation || {
                status: "no-qualified-matches",
                message: "The backend responded successfully, but no articles survived the active filters.",
                query: normalizedPayload.query,
                suggestions: [
                    "Try a broader geopolitical phrase.",
                    "Check whether country, region, or sentiment filters are too narrow.",
                    "The topic may be real but not currently present in the selected RSS feeds."
                ]
            }
            : null;

        logger.info("Intelligence generation completed", {
            mode: workerResponse.mode || "live",
            rawCount: rawResults.length,
            filteredCount: filtered.length,
            returnedCount: finalResults.length,
            rawItemsSeen: workerMetadata.rawItemsSeen,
            filteredOutCount: workerMetadata.filteredOutCount,
            cacheHit: false,
            queryHash
        });

        const responsePayload = {
            mode: workerResponse.mode || "live",
            query: normalizedPayload.query,
            expandedQueries: workerMetadata.expandedQueries,
            appliedFilters: {
                regions: normalizedPayload.regions,
                countries: normalizedPayload.countries,
                publicationFocus: normalizedPayload.publicationFocus,
                sentimentFilter: normalizedPayload.sentimentFilter
            },
            counts: {
                raw: rawResults.length,
                filtered: filtered.length,
                returned: finalResults.length,
                rawItemsSeen: workerMetadata.rawItemsSeen,
                filteredOut: workerMetadata.filteredOutCount
            },
            selectedSources: workerMetadata.selectedSources,
            diagnostics: workerMetadata.diagnostics,
            noResultExplanation,
            feedErrors: workerMetadata.feedErrors,
            results: finalResults
        };

        const createdAt = Date.now();
        const expiresAt = buildExpiryTimestamp(createdAt);
        let snapshotResult = null;

        try {
            snapshotResult = await putSnapshot({
                queryHash,
                payload: normalizedPayload,
                responsePayload,
                createdAt,
                expiresAt
            });

            if (snapshotResult?.s3SnapshotKey) {
                logger.info("S3 intelligence snapshot written", {
                    queryHash,
                    bucket: snapshotResult.bucket,
                    s3SnapshotKey: snapshotResult.s3SnapshotKey,
                    sourceCount: snapshotResult.sourceCount
                });
            } else {
                logger.info("S3 snapshot skipped; no reports bucket configured", {
                    queryHash
                });
            }
        } catch (snapshotError) {
            logger.warn("S3 snapshot write failed; continuing without snapshot", {
                queryHash,
                message: snapshotError.message
            });
        }

        await putCache(buildCacheItem(queryHash, normalizedPayload, responsePayload, {
            createdAt,
            expiresAt,
            s3SnapshotKey: snapshotResult?.s3SnapshotKey || null,
            s3SnapshotBucket: snapshotResult?.bucket || null
        }));

        return {
            ...responsePayload,
            cache: buildCacheMetadata({
                hit: false,
                queryHash,
                cachedItem: {
                    createdAt,
                    expiresAt,
                    s3SnapshotKey: snapshotResult?.s3SnapshotKey || null
                }
            })
        };
    } catch (error) {
        logger.warn("Falling back to synthetic intelligence results", {
            code: error.code || "UNKNOWN_ERROR",
            message: error.message,
            cacheHit: false,
            queryHash
        });

        const fallbackResults = buildFallbackResults(normalizedPayload);

        return {
            mode: "fallback",
            query: normalizedPayload.query,
            warning: error.message,
            expandedQueries: [],
            appliedFilters: {
                regions: normalizedPayload.regions,
                countries: normalizedPayload.countries,
                publicationFocus: normalizedPayload.publicationFocus,
                sentimentFilter: normalizedPayload.sentimentFilter
            },
            counts: {
                raw: 0,
                filtered: fallbackResults.length,
                returned: fallbackResults.length,
                rawItemsSeen: 0,
                filteredOut: 0
            },
            selectedSources: [],
            diagnostics: null,
            noResultExplanation: null,
            feedErrors: [],
            results: fallbackResults,
            cache: buildCacheMetadata({
                hit: false,
                queryHash
            })
        };
    }
}

module.exports = {
    generateIntelligence,
    normalizePayload
};
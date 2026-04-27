const REPORT_VERSION = "GEO-49E";

function safeNumber(value, fallback = null) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 1) {
    const number = safeNumber(value, 0);
    return Math.max(min, Math.min(max, number));
}

function normalizeOne(value) {
    const number = safeNumber(value, 0);

    if (number > 1) {
        return clamp(number / 100);
    }

    return clamp(number);
}

function classifyScore(value) {
    const score = normalizeOne(value);

    if (score >= 0.85) return "VERY HIGH";
    if (score >= 0.7) return "HIGH";
    if (score >= 0.5) return "MEDIUM";
    if (score >= 0.3) return "LOW";
    return "VERY LOW";
}

function classifySignalScore(value) {
    const score = safeNumber(value, 0);

    if (score >= 4.5) return "VERY HIGH";
    if (score >= 3.2) return "HIGH";
    if (score >= 2.0) return "MEDIUM";
    if (score >= 1.0) return "LOW";
    return "VERY LOW";
}

function cleanText(value, fallback = "") {
    return String(value || fallback)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getArticleUrl(result = {}) {
    return result.url || result.link || result.guid || "";
}

function getRankingSignals(result = {}) {
    const rankingSignals = result.rankingSignals || {};

    return {
        queryRelevance:
            rankingSignals.queryRelevance ??
            result.queryMatchScore ??
            result.queryRelevance ??
            null,
        geoAlignment:
            rankingSignals.geoAlignment ??
            result.geoAlignmentScore ??
            result.geoAlignment ??
            null,
        sourceQuality:
            rankingSignals.sourceQuality ??
            result.sourceQualityScore ??
            null,
        recency:
            rankingSignals.recency ??
            result.recencyScore ??
            null
    };
}

function describeQueryRelevance(value) {
    const label = classifyScore(value);

    if (label === "VERY HIGH" || label === "HIGH") {
        return "The article strongly matches the scenario terms and contributes directly to the requested geopolitical topic.";
    }

    if (label === "MEDIUM") {
        return "The article has partial scenario overlap and may provide useful supporting context.";
    }

    return "The article has limited scenario overlap and should be treated as a weak supporting signal.";
}

function describeGeoAlignment(value, result = {}) {
    const label = classifyScore(value);
    const country = result.sourceCountry || result.country || "";
    const region = result.sourceRegion || result.region || "";

    if (label === "VERY HIGH" || label === "HIGH") {
        return `The article has strong geographic alignment${country || region ? ` with ${[country, region].filter(Boolean).join(", ")}` : ""}.`;
    }

    if (label === "MEDIUM") {
        return "The article has moderate geographic alignment with the selected scenario.";
    }

    return "The article has weak geographic alignment and may only mention the scenario indirectly.";
}

function describeSourceQuality(result = {}, value) {
    const quality = result.sourceQuality || classifyScore(value);
    const tier = result.sourceTier || "unknown tier";
    const source = result.source || "Unknown source";

    return `${source} is classified as ${quality || "UNKNOWN"} source quality with ${tier} source tier metadata.`;
}

function describeRecency(value, result = {}) {
    const label = classifyScore(value);
    const publishedAt = result.publishedAt || "";

    if (label === "VERY HIGH" || label === "HIGH") {
        return `The article is recent and useful for active monitoring${publishedAt ? `; published at ${publishedAt}` : ""}.`;
    }

    if (label === "MEDIUM") {
        return `The article is moderately recent${publishedAt ? `; published at ${publishedAt}` : ""}.`;
    }

    return `The article appears older or has limited recency strength${publishedAt ? `; published at ${publishedAt}` : ""}.`;
}

function buildExecutiveBrief({ result, scenario, analytics }) {
    const title = cleanText(result.title, "Untitled result");
    const source = result.source || "Unknown source";
    const query = scenario.query || "the selected scenario";
    const signalLabel = classifySignalScore(analytics.signalScore);

    return `${source} reports "${title}". Geo-Sentinel classifies this as a ${signalLabel} intelligence signal for "${query}" based on query relevance, geographic alignment, source quality, recency, and sentiment/signal scoring.`;
}

function buildArticleSummary(result = {}) {
    const summary = cleanText(result.summary || result.description);

    if (summary) {
        return summary;
    }

    return "No article summary was available in the captured source snapshot.";
}

function buildRelevanceAnalysis({ result, analytics }) {
    return {
        queryRelevance: {
            score: analytics.queryRelevance,
            label: classifyScore(analytics.queryRelevance),
            explanation: describeQueryRelevance(analytics.queryRelevance),
            matchedQuery: result.matchedQuery || "",
            expandedQueryUsed: Boolean(result.expandedQueryUsed)
        },
        geoAlignment: {
            score: analytics.geoAlignment,
            label: classifyScore(analytics.geoAlignment),
            explanation: describeGeoAlignment(analytics.geoAlignment, result)
        },
        sourceQuality: {
            score: analytics.sourceQuality,
            label: result.sourceQuality || classifyScore(analytics.sourceQuality),
            explanation: describeSourceQuality(result, analytics.sourceQuality)
        },
        recency: {
            score: analytics.recency,
            label: classifyScore(analytics.recency),
            explanation: describeRecency(analytics.recency, result)
        }
    };
}

function buildSignalInterpretation({ analytics }) {
    const signalScore = safeNumber(analytics.signalScore, 0);
    const signalLabel = classifySignalScore(signalScore);
    const relevanceLabel = classifyScore(analytics.queryRelevance);
    const geoLabel = classifyScore(analytics.geoAlignment);

    if (signalLabel === "VERY HIGH" || signalLabel === "HIGH") {
        return `This article represents a strong geopolitical signal. The ranking model detected ${relevanceLabel} query relevance and ${geoLabel} geographic alignment, supported by source and recency scoring.`;
    }

    if (signalLabel === "MEDIUM") {
        return `This article represents a moderate geopolitical signal. It may be useful as supporting intelligence, but should be compared with stronger or more direct sources before drawing conclusions.`;
    }

    return `This article represents a weak geopolitical signal. It may still provide context, but the available scoring factors do not indicate strong intelligence value for the selected scenario.`;
}

function buildConclusion({ analytics }) {
    const signalScore = safeNumber(analytics.signalScore, 0);
    const queryRelevance = normalizeOne(analytics.queryRelevance);
    const geoAlignment = normalizeOne(analytics.geoAlignment);

    if (signalScore >= 3.2 && queryRelevance >= 0.7 && geoAlignment >= 0.7) {
        return "This source should be treated as a primary intelligence signal for the selected geopolitical scenario.";
    }

    if (signalScore >= 2.0 || queryRelevance >= 0.5) {
        return "This source should be treated as supporting intelligence for the selected geopolitical scenario.";
    }

    return "This source should be treated as peripheral context rather than a core intelligence signal.";
}

function buildPerCardReport({ queryHash, resultId, snapshot, result, cacheItem }) {
    const rankingSignals = getRankingSignals(result);

    const analytics = {
        sentiment: result.sentiment || "neutral",
        sentimentScore: safeNumber(result.sentimentScore),
        signalScore: safeNumber(result.signalScore ?? result.finalScore ?? result.score),
        finalScore: safeNumber(result.finalScore),
        queryRelevance: safeNumber(rankingSignals.queryRelevance),
        geoAlignment: safeNumber(rankingSignals.geoAlignment),
        sourceQuality: safeNumber(rankingSignals.sourceQuality),
        recency: safeNumber(rankingSignals.recency),
        rankingSignals
    };

    const scenario = {
        query: snapshot.query || snapshot?.payload?.query || snapshot?.responsePayload?.query || "",
        payload: snapshot.payload || null,
        appliedFilters: snapshot?.responsePayload?.appliedFilters || null,
        expandedQueries: snapshot?.responsePayload?.expandedQueries || []
    };

    const article = {
        id: result.id || resultId,
        resultId,
        title: cleanText(result.title, "Untitled result"),
        source: result.source || "Unknown source",
        sourceCountry: result.sourceCountry || result.country || "",
        sourceRegion: result.sourceRegion || result.region || "",
        sourceTier: result.sourceTier || "",
        sourceQuality: result.sourceQuality || "",
        publicationFocus: result.publicationFocus || "",
        publishedAt: result.publishedAt || "",
        url: getArticleUrl(result),
        summary: buildArticleSummary(result)
    };

    return {
        reportType: "geo-sentinel-per-card-intelligence-report",
        version: REPORT_VERSION,
        queryHash,
        resultId,
        generatedAt: new Date().toISOString(),
        title: article.title,
        executiveBrief: buildExecutiveBrief({
            result,
            scenario,
            analytics
        }),
        articleSummary: article.summary,
        relevanceAnalysis: buildRelevanceAnalysis({
            result,
            analytics
        }),
        signalInterpretation: buildSignalInterpretation({
            analytics
        }),
        conclusion: buildConclusion({
            analytics
        }),
        snapshot: {
            s3SnapshotKey: cacheItem.s3SnapshotKey,
            s3SnapshotBucket: cacheItem.s3SnapshotBucket || null,
            createdAt: cacheItem.createdAt,
            expiresAt: cacheItem.expiresAt,
            sourceCount: cacheItem.sourceCount || 0,
            mode: cacheItem.mode || snapshot.mode || "live"
        },
        scenario,
        article,
        analytics,
        sourceMetadata: {
            sourceId: result.sourceId || null,
            domain: result.domain || "",
            mediaType: result.mediaType || "",
            influenceWeight: safeNumber(result.influenceWeight)
        },
        metadata: {
            deterministic: true,
            aiGenerated: false,
            hallucinationRisk: "none-intentional",
            methodology:
                "Report generated from captured article metadata, deterministic ranking signals, source metadata, recency scoring, and Geo-Sentinel scenario context."
        }
    };
}

module.exports = {
    buildPerCardReport
};
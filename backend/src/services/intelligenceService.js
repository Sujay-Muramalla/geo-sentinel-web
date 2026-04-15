const mockIntelligenceData = require("../data/mockIntelligenceData");

function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
}

function matchesScenario(result, scenario) {
    if (!scenario) {
        return true;
    }

    const haystack = [
        result.title,
        result.description,
        result.source,
        ...(result.keywords || [])
    ]
        .join(" ")
        .toLowerCase();

    return scenario
        .split(/\s+/)
        .filter(Boolean)
        .every((term) => haystack.includes(term.toLowerCase()));
}

function matchesFilters(result, filters) {
    const regions = normalizeArray(filters.regions).map(normalizeText);
    const countries = normalizeArray(filters.countries).map(normalizeText);
    const mediaTypes = normalizeArray(filters.mediaTypes).map(normalizeText);
    const sentiments = normalizeArray(filters.sentiment).map(normalizeText);

    const regionMatch =
        regions.length === 0 || regions.includes(normalizeText(result.region));

    const countryMatch =
        countries.length === 0 || countries.includes(normalizeText(result.country));

    const mediaTypeMatch =
        mediaTypes.length === 0 || mediaTypes.includes(normalizeText(result.mediaType));

    const sentimentLabel =
        result.sentimentScore > 0.15
            ? "positive"
            : result.sentimentScore < -0.15
                ? "negative"
                : "neutral";

    const sentimentMatch =
        sentiments.length === 0 || sentiments.includes(sentimentLabel);

    return regionMatch && countryMatch && mediaTypeMatch && sentimentMatch;
}

function sortResults(results, sortBy = "signal", sortDirection = "desc") {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...results].sort((a, b) => {
        if (sortBy === "sentiment") {
            return (a.sentimentScore - b.sentimentScore) * direction;
        }

        return (a.signalScore - b.signalScore) * direction;
    });
}

function buildSummary(results) {
    const totalSources = results.length;

    if (totalSources === 0) {
        return {
            totalSources: 0,
            averageSentiment: 0,
            averageSignal: 0
        };
    }

    const averageSentiment =
        results.reduce((sum, item) => sum + item.sentimentScore, 0) / totalSources;

    const averageSignal =
        results.reduce((sum, item) => sum + item.signalScore, 0) / totalSources;

    return {
        totalSources,
        averageSentiment: Number(averageSentiment.toFixed(2)),
        averageSignal: Math.round(averageSignal)
    };
}

function buildIntelligenceResponse(payload) {
    const scenario = String(payload.scenario || "").trim();
    const filters = payload.filters || {};
    const sortBy = payload.sortBy || "signal";
    const sortDirection = payload.sortDirection || "desc";

    const filteredResults = mockIntelligenceData.filter((result) => {
        return matchesScenario(result, scenario) && matchesFilters(result, filters);
    });

    const sortedResults = sortResults(filteredResults, sortBy, sortDirection);

    return {
        query: scenario,
        summary: buildSummary(sortedResults),
        results: sortedResults
    };
}

module.exports = {
    buildIntelligenceResponse
};
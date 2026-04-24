const SOURCE_REGISTRY = [
    {
        id: "reuters",
        name: "Reuters",
        matchers: ["reuters.com"],
        country: "United Kingdom",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.45,
        reliabilityScore: 0.95,
        focus: "international",
        coverage: ["global", "europe", "north-america", "middle-east", "asia"],
        categories: ["politics", "economy", "conflict", "diplomacy", "markets"],
        rssFeeds: [
            "https://feeds.reuters.com/reuters/worldNews"
        ]
    },
    {
        id: "bbc",
        name: "BBC",
        matchers: ["bbc.com", "bbc.co.uk"],
        country: "United Kingdom",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.35,
        reliabilityScore: 0.93,
        focus: "international",
        coverage: ["global", "europe", "asia", "middle-east", "africa"],
        categories: ["politics", "conflict", "diplomacy", "society"],
        rssFeeds: [
            "http://feeds.bbci.co.uk/news/world/rss.xml"
        ]
    },
    {
        id: "cnn",
        name: "CNN",
        matchers: ["cnn.com"],
        country: "United States",
        region: "North America",
        tier: "top",
        influenceWeight: 1.3,
        reliabilityScore: 0.9,
        focus: "international",
        coverage: ["global", "north-america", "middle-east", "asia", "europe"],
        categories: ["politics", "conflict", "diplomacy", "security"],
        rssFeeds: [
            "http://rss.cnn.com/rss/edition_world.rss"
        ]
    },
    {
        id: "al-jazeera",
        name: "Al Jazeera",
        matchers: ["aljazeera.com"],
        country: "Qatar",
        region: "Middle East",
        tier: "top",
        influenceWeight: 1.35,
        reliabilityScore: 0.91,
        focus: "international",
        coverage: ["global", "middle-east", "asia", "africa"],
        categories: ["politics", "conflict", "diplomacy", "humanitarian"],
        rssFeeds: [
            "https://www.aljazeera.com/xml/rss/all.xml"
        ]
    },
    {
        id: "dw",
        name: "DW",
        matchers: ["dw.com"],
        country: "Germany",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.25,
        reliabilityScore: 0.91,
        focus: "international",
        coverage: ["global", "europe", "asia", "middle-east"],
        categories: ["politics", "economy", "conflict", "diplomacy"],
        rssFeeds: [
            "https://rss.dw.com/xml/rss-en-world"
        ]
    },
    {
        id: "france24",
        name: "France 24",
        matchers: ["france24.com"],
        country: "France",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.22,
        reliabilityScore: 0.9,
        focus: "international",
        coverage: ["global", "europe", "africa", "middle-east"],
        categories: ["politics", "conflict", "diplomacy"],
        rssFeeds: [
            "https://www.france24.com/en/rss"
        ]
    },
    {
        id: "guardian",
        name: "The Guardian",
        matchers: ["theguardian.com"],
        country: "United Kingdom",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.23,
        reliabilityScore: 0.9,
        focus: "international",
        coverage: ["global", "europe", "middle-east", "asia", "north-america"],
        categories: ["politics", "conflict", "climate", "economy"],
        rssFeeds: [
            "https://www.theguardian.com/world/rss"
        ]
    },
    {
        id: "euronews",
        name: "Euronews",
        matchers: ["euronews.com"],
        country: "France",
        region: "Europe",
        tier: "high",
        influenceWeight: 1.14,
        reliabilityScore: 0.86,
        focus: "international",
        coverage: ["global", "europe"],
        categories: ["politics", "economy", "conflict"],
        rssFeeds: [
            "https://www.euronews.com/rss?level=theme&name=news"
        ]
    },
    {
        id: "ndtv",
        name: "NDTV",
        matchers: ["ndtv.com"],
        country: "India",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.28,
        reliabilityScore: 0.88,
        focus: "national",
        coverage: ["india", "asia"],
        categories: ["politics", "economy", "security", "diplomacy"],
        rssFeeds: [
            "https://feeds.feedburner.com/ndtvnews-top-stories"
        ]
    },
    {
        id: "times-of-india",
        name: "Times of India",
        matchers: ["timesofindia.indiatimes.com"],
        country: "India",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.2,
        reliabilityScore: 0.84,
        focus: "national",
        coverage: ["india", "asia"],
        categories: ["politics", "economy", "security"],
        rssFeeds: [
            "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"
        ]
    },
    {
        id: "the-hindu",
        name: "The Hindu",
        matchers: ["thehindu.com"],
        country: "India",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.18,
        reliabilityScore: 0.89,
        focus: "national",
        coverage: ["india", "asia"],
        categories: ["politics", "economy", "diplomacy"],
        rssFeeds: [
            "https://www.thehindu.com/news/national/feeder/default.rss",
            "https://www.thehindu.com/news/international/feeder/default.rss"
        ]
    },
    {
        id: "scmp",
        name: "SCMP",
        matchers: ["scmp.com"],
        country: "Hong Kong",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.22,
        reliabilityScore: 0.88,
        focus: "regional",
        coverage: ["asia", "china", "hong-kong", "taiwan"],
        categories: ["politics", "economy", "security", "diplomacy"],
        rssFeeds: [
            "https://www.scmp.com/rss/91/feed"
        ]
    },
    {
        id: "channel-news-asia",
        name: "CNA",
        matchers: ["channelnewsasia.com"],
        country: "Singapore",
        region: "Asia",
        tier: "high",
        influenceWeight: 1.15,
        reliabilityScore: 0.87,
        focus: "regional",
        coverage: ["asia", "singapore", "china", "taiwan"],
        categories: ["politics", "economy", "security"],
        rssFeeds: [
            "https://www.channelnewsasia.com/rssfeeds/8395986"
        ]
    },
    {
        id: "nikkei",
        name: "Nikkei Asia",
        matchers: ["asia.nikkei.com", "nikkei.com"],
        country: "Japan",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.18,
        reliabilityScore: 0.89,
        focus: "regional",
        coverage: ["asia", "japan", "china", "taiwan"],
        categories: ["economy", "markets", "technology", "security"],
        rssFeeds: [
            "https://asia.nikkei.com/rss/feed/nar"
        ]
    },
    {
        id: "arab-news",
        name: "Arab News",
        matchers: ["arabnews.com"],
        country: "Saudi Arabia",
        region: "Middle East",
        tier: "high",
        influenceWeight: 1.12,
        reliabilityScore: 0.84,
        focus: "regional",
        coverage: ["middle-east", "saudi-arabia", "iran", "israel"],
        categories: ["politics", "conflict", "energy", "diplomacy"],
        rssFeeds: [
            "https://www.arabnews.com/rss.xml"
        ]
    },
    {
        id: "times-of-israel",
        name: "Times of Israel",
        matchers: ["timesofisrael.com"],
        country: "Israel",
        region: "Middle East",
        tier: "high",
        influenceWeight: 1.12,
        reliabilityScore: 0.84,
        focus: "national",
        coverage: ["middle-east", "israel", "iran"],
        categories: ["politics", "conflict", "security", "diplomacy"],
        rssFeeds: [
            "https://www.timesofisrael.com/feed/"
        ]
    },
    {
        id: "ap-news",
        name: "Associated Press",
        matchers: ["apnews.com"],
        country: "United States",
        region: "North America",
        tier: "top",
        influenceWeight: 1.3,
        reliabilityScore: 0.94,
        focus: "international",
        coverage: ["global", "north-america", "europe", "asia", "middle-east"],
        categories: ["politics", "conflict", "economy", "diplomacy"],
        rssFeeds: [
            "https://apnews.com/hub/world-news?output=rss"
        ]
    }
];

const COUNTRY_TO_REGION = {
    india: "Asia",
    china: "Asia",
    taiwan: "Asia",
    japan: "Asia",
    singapore: "Asia",
    "hong kong": "Asia",
    qatar: "Middle East",
    "saudi arabia": "Middle East",
    israel: "Middle East",
    iran: "Middle East",
    germany: "Europe",
    france: "Europe",
    "united kingdom": "Europe",
    uk: "Europe",
    britain: "Europe",
    italy: "Europe",
    spain: "Europe",
    "united states": "North America",
    usa: "North America",
    us: "North America",
    canada: "North America"
};

function normalizeKey(value = "") {
    return String(value).trim().toLowerCase();
}

function resolveRegionFromCountry(country = "") {
    return COUNTRY_TO_REGION[normalizeKey(country)] || "";
}

module.exports = {
    SOURCE_REGISTRY,
    COUNTRY_TO_REGION,
    normalizeKey,
    resolveRegionFromCountry
};

const SOURCE_REGISTRY = [
    // Global / International
    {
        id: "reuters",
        name: "Reuters",
        matchers: ["reuters.com"],
        country: "United Kingdom",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.45,
        focus: "international"
    },
    {
        id: "bbc",
        name: "BBC",
        matchers: ["bbc.com", "bbc.co.uk"],
        country: "United Kingdom",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.35,
        focus: "international"
    },
    {
        id: "cnn",
        name: "CNN",
        matchers: ["cnn.com"],
        country: "United States",
        region: "North America",
        tier: "top",
        influenceWeight: 1.30,
        focus: "international"
    },
    {
        id: "al-jazeera",
        name: "Al Jazeera",
        matchers: ["aljazeera.com"],
        country: "Qatar",
        region: "Middle East",
        tier: "top",
        influenceWeight: 1.35,
        focus: "international"
    },
    {
        id: "dw",
        name: "DW",
        matchers: ["dw.com"],
        country: "Germany",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.25,
        focus: "international"
    },
    {
        id: "france24",
        name: "France 24",
        matchers: ["france24.com"],
        country: "France",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.22,
        focus: "international"
    },
    {
        id: "sky-news",
        name: "Sky News",
        matchers: ["news.sky.com", "sky.com"],
        country: "United Kingdom",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.20,
        focus: "international"
    },
    {
        id: "fox-news",
        name: "Fox News",
        matchers: ["foxnews.com"],
        country: "United States",
        region: "North America",
        tier: "top",
        influenceWeight: 1.15,
        focus: "national"
    },

    // India
    {
        id: "ndtv",
        name: "NDTV",
        matchers: ["ndtv.com"],
        country: "India",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.28,
        focus: "national"
    },
    {
        id: "republic-tv",
        name: "Republic TV",
        matchers: ["republicworld.com"],
        country: "India",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.18,
        focus: "national"
    },
    {
        id: "times-of-india",
        name: "Times of India",
        matchers: ["timesofindia.indiatimes.com"],
        country: "India",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.20,
        focus: "national"
    },
    {
        id: "the-hindu",
        name: "The Hindu",
        matchers: ["thehindu.com"],
        country: "India",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.18,
        focus: "national"
    },
    {
        id: "hindustan-times",
        name: "Hindustan Times",
        matchers: ["hindustantimes.com"],
        country: "India",
        region: "Asia",
        tier: "high",
        influenceWeight: 1.12,
        focus: "national"
    },

    // Europe
    {
        id: "welt",
        name: "WELT",
        matchers: ["welt.de"],
        country: "Germany",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.18,
        focus: "national"
    },
    {
        id: "spiegel",
        name: "Der Spiegel",
        matchers: ["spiegel.de"],
        country: "Germany",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.20,
        focus: "national"
    },
    {
        id: "guardian",
        name: "The Guardian",
        matchers: ["theguardian.com"],
        country: "United Kingdom",
        region: "Europe",
        tier: "top",
        influenceWeight: 1.23,
        focus: "international"
    },
    {
        id: "euronews",
        name: "Euronews",
        matchers: ["euronews.com"],
        country: "France",
        region: "Europe",
        tier: "high",
        influenceWeight: 1.14,
        focus: "international"
    },

    // Asia
    {
        id: "scmp",
        name: "SCMP",
        matchers: ["scmp.com"],
        country: "Hong Kong",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.22,
        focus: "regional"
    },
    {
        id: "channel-news-asia",
        name: "CNA",
        matchers: ["channelnewsasia.com"],
        country: "Singapore",
        region: "Asia",
        tier: "high",
        influenceWeight: 1.15,
        focus: "regional"
    },
    {
        id: "nikkei",
        name: "Nikkei Asia",
        matchers: ["asia.nikkei.com", "nikkei.com"],
        country: "Japan",
        region: "Asia",
        tier: "top",
        influenceWeight: 1.18,
        focus: "regional"
    },

    // Middle East
    {
        id: "arab-news",
        name: "Arab News",
        matchers: ["arabnews.com"],
        country: "Saudi Arabia",
        region: "Middle East",
        tier: "high",
        influenceWeight: 1.12,
        focus: "regional"
    },
    {
        id: "jerusalem-post",
        name: "Jerusalem Post",
        matchers: ["jpost.com", "jerusalempst.com", "jerusalempost.com"],
        country: "Israel",
        region: "Middle East",
        tier: "high",
        influenceWeight: 1.12,
        focus: "national"
    },
    {
        id: "times-of-israel",
        name: "Times of Israel",
        matchers: ["timesofisrael.com"],
        country: "Israel",
        region: "Middle East",
        tier: "high",
        influenceWeight: 1.12,
        focus: "national"
    },

    // North America
    {
        id: "new-york-times",
        name: "The New York Times",
        matchers: ["nytimes.com"],
        country: "United States",
        region: "North America",
        tier: "top",
        influenceWeight: 1.28,
        focus: "international"
    },
    {
        id: "washington-post",
        name: "The Washington Post",
        matchers: ["washingtonpost.com"],
        country: "United States",
        region: "North America",
        tier: "top",
        influenceWeight: 1.25,
        focus: "international"
    },
    {
        id: "cbc",
        name: "CBC",
        matchers: ["cbc.ca"],
        country: "Canada",
        region: "North America",
        tier: "high",
        influenceWeight: 1.12,
        focus: "national"
    },

    // Fallback examples
    {
        id: "ap-news",
        name: "Associated Press",
        matchers: ["apnews.com"],
        country: "United States",
        region: "North America",
        tier: "top",
        influenceWeight: 1.30,
        focus: "international"
    }
];

const COUNTRY_TO_REGION = {
    india: "Asia",
    china: "Asia",
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
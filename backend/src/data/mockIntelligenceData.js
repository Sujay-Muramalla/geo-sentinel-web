const mockIntelligenceData = [
    {
        id: "src-001",
        source: "Reuters",
        title: "Naval movements raise tensions in disputed waters",
        date: "2026-04-15",
        description: "Regional deployments and diplomatic signaling are increasing concern among neighboring states.",
        region: "Asia-Pacific",
        country: "China",
        mediaType: "International",
        sentimentScore: -0.42,
        signalScore: 81,
        keywords: ["naval", "tensions", "disputed"],
        url: "https://example.com/reuters-1"
    },
    {
        id: "src-002",
        source: "Al Jazeera",
        title: "Maritime dispute fuels renewed diplomatic friction",
        date: "2026-04-14",
        description: "Officials exchanged strong statements following new activity in contested sea lanes.",
        region: "Asia-Pacific",
        country: "Philippines",
        mediaType: "International",
        sentimentScore: -0.28,
        signalScore: 76,
        keywords: ["maritime", "diplomatic", "friction"],
        url: "https://example.com/aj-1"
    },
    {
        id: "src-003",
        source: "BBC",
        title: "Leaders call for restraint amid regional military posturing",
        date: "2026-04-13",
        description: "International observers are urging restraint while monitoring fast-moving developments.",
        region: "Asia-Pacific",
        country: "China",
        mediaType: "International",
        sentimentScore: -0.15,
        signalScore: 69,
        keywords: ["restraint", "military", "regional"],
        url: "https://example.com/bbc-1"
    },
    {
        id: "src-004",
        source: "The Diplomat",
        title: "Strategic sea corridors remain under pressure",
        date: "2026-04-12",
        description: "Analysts say trade and security concerns are becoming increasingly intertwined.",
        region: "Asia-Pacific",
        country: "Philippines",
        mediaType: "Regional",
        sentimentScore: -0.09,
        signalScore: 63,
        keywords: ["strategic", "trade", "security"],
        url: "https://example.com/diplomat-1"
    },
    {
        id: "src-005",
        source: "Nikkei Asia",
        title: "Business markets watch regional instability closely",
        date: "2026-04-11",
        description: "Economic stakeholders are evaluating potential supply-chain impacts from prolonged instability.",
        region: "Asia-Pacific",
        country: "Japan",
        mediaType: "Business",
        sentimentScore: -0.18,
        signalScore: 58,
        keywords: ["markets", "instability", "supply-chain"],
        url: "https://example.com/nikkei-1"
    }
];

module.exports = mockIntelligenceData;
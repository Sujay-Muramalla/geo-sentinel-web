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
            
            function matchesQuery(item, query) {
                if (!query) {
                    return true;
                }
            
                const haystack = [
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
                    ...(Array.isArray(item.keywords) ? item.keywords : [])
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
            
                const queryTerms = query
                    .toLowerCase()
                    .split(/[\s,.-]+/)
                    .map((term) => term.trim())
                    .filter((term) => term.length > 2);
            
                if (queryTerms.length === 0) {
                    return true;
                }
            
                const matchedTerms = queryTerms.filter((term) => haystack.includes(term));
                const matchRatio = matchedTerms.length / queryTerms.length;
            
                return matchRatio >= 0.5;
            }
            
            function sortResults(results, sortBy = "signal-desc") {
                const items = [...results];
                
                switch (sortBy) {
                    case "signal-asc":
                    return items.sort((a, b) => (a.signalScore || 0) - (b.signalScore || 0));
                    
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
                            
                            case "signal-desc":
                            default:
                            return items.sort((a, b) => (b.signalScore || 0) - (a.signalScore || 0));
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
                    
                    async function enrichItemWithSentiment(item, index) {
                        const text = getTextForSentiment(item);
                        const sentimentResult = await runPythonSentiment(text);
                        
                        return {
                            ...item,
                            signalScore: ensureSignalScore(item, index),
                            sentiment: sentimentResult.sentiment || "neutral",
                            sentimentScore: normalizeSentimentScore(sentimentResult.score),
                            sentimentBreakdown: sentimentResult.breakdown || {
                                neg: 0,
                                neu: 1,
                                pos: 0,
                                compound: 0
                            }
                        };
                    }
                    
                    async function analyzeIntelligence(payload = {}) {
                        const query = (payload.query || "").trim();
                        const sortBy = payload.sortBy || "signal-desc";
                        
                        const dataset = normalizeDataset(mockIntelligenceData);
                        
                        console.log("Mock dataset type:", typeof mockIntelligenceData);
                        console.log("Normalized dataset length:", dataset.length);
                        
                        const matchedItems = dataset.filter((item) => matchesQuery(item, query));
                        
                        const enrichedItems = await Promise.all(
                            matchedItems.map((item, index) => enrichItemWithSentiment(item, index))
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
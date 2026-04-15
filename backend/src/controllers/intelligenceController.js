const { analyzeIntelligence } = require("../services/intelligenceService");

async function analyzeIntelligenceController(req, res) {
    try {
        const result = await analyzeIntelligence(req.body || {});
        return res.status(200).json(result);
    } catch (error) {
        console.error("Intelligence analysis failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Intelligence analysis failed",
            error: error.message
        });
    }
}

module.exports = {
    analyzeIntelligenceController
};
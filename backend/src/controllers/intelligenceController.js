const { buildIntelligenceResponse } = require("../services/intelligenceService");

function analyzeScenario(req, res) {
    try {
        const payload = req.body || {};
        const response = buildIntelligenceResponse(payload);

        return res.status(200).json(response);
    } catch (error) {
        console.error("Error analyzing scenario:", error);

        return res.status(500).json({
            error: "Failed to analyze scenario",
            details: error.message
        });
    }
}

module.exports = {
    analyzeScenario
};
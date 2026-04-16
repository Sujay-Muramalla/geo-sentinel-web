const {
    getIntelligenceResults
} = require("../services/intelligenceService");

async function generateIntelligence(req, res) {
    try {
        const payload = req.body || {};

        const result = await getIntelligenceResults(payload);

        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("generateIntelligence error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate intelligence",
            error: error.message
        });
    }
}

module.exports = {
    generateIntelligence
};
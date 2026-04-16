const { generateIntelligence } = require("../services/intelligenceService");

async function handleGenerateIntelligence(req, res) {
    try {
        const result = await generateIntelligence(req.body || {});
        return res.status(200).json(result);
    } catch (error) {
        console.error("generateIntelligence controller error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate intelligence",
            error: error.message
        });
    }
}

module.exports = {
    handleGenerateIntelligence
};
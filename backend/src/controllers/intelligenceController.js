const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const { generateIntelligence } = require("../services/intelligenceService");

const handleGenerateIntelligence = asyncHandler(async (req, res) => {
    const result = await generateIntelligence(req.body || {});

    return res.status(200).json(
        successResponse(result, {
            timestamp: new Date().toISOString()
        })
    );
});

module.exports = {
    handleGenerateIntelligence
};
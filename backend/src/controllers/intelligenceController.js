const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const { generateIntelligence } = require("../services/intelligenceService");

function buildAuthMeta(req) {
    if (!req.auth) {
        return {
            mode: "public",
            authenticated: false
        };
    }

    return {
        mode: req.auth.mode || "public",
        authenticated: Boolean(req.auth.authenticated),
        tokenUse: req.auth.tokenUse || null,
        user: req.auth.user
            ? {
                sub: req.auth.user.sub,
                username: req.auth.user.username,
                email: req.auth.user.email,
                clientId: req.auth.user.clientId
            }
            : null,
        warning: req.auth.warning || null
    };
}

const handleGenerateIntelligence = asyncHandler(async (req, res) => {
    const result = await generateIntelligence(req.body || {});

    return res.status(200).json(
        successResponse(result, {
            timestamp: new Date().toISOString(),
            auth: buildAuthMeta(req)
        })
    );
});

module.exports = {
    handleGenerateIntelligence
};
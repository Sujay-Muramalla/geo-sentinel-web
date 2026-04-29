const { verifyCognitoJwt } = require("../services/cognitoJwtService");

function extractBearerToken(req) {
    const header = req.headers.authorization || "";

    if (!header.toLowerCase().startsWith("bearer ")) {
        return "";
    }

    return header.slice("bearer ".length).trim();
}

async function optionalAuth(req, res, next) {
    try {
        req.auth = {
            authenticated: false,
            mode: "public"
        };

        const token = extractBearerToken(req);

        if (!token) {
            return next();
        }

        const verification = await verifyCognitoJwt(token);

        if (verification.authenticated) {
            req.auth = {
                authenticated: true,
                mode: "authenticated",
                tokenUse: verification.tokenUse,
                user: verification.user
            };

            return next();
        }

        req.auth = {
            authenticated: false,
            mode: "public",
            warning: {
                code: "AUTH_TOKEN_NOT_ACCEPTED",
                reason: verification.reason || "invalid_token"
            }
        };

        return next();
    } catch (error) {
        req.auth = {
            authenticated: false,
            mode: "public",
            warning: {
                code: "AUTH_VERIFICATION_ERROR",
                reason: error.message
            }
        };

        return next();
    }
}

module.exports = {
    optionalAuth
};
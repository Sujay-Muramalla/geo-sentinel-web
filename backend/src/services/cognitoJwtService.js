const { CognitoJwtVerifier } = require("aws-jwt-verify");

const env = require("../config/env");

let accessTokenVerifier = null;
let idTokenVerifier = null;

function isCognitoAuthConfigured() {
    return Boolean(
        env.cognitoUserPoolId &&
        env.cognitoClientId &&
        env.cognitoRegion
    );
}

function getVerifier(tokenUse) {
    if (!isCognitoAuthConfigured()) {
        return null;
    }

    if (tokenUse === "access") {
        if (!accessTokenVerifier) {
            accessTokenVerifier = CognitoJwtVerifier.create({
                userPoolId: env.cognitoUserPoolId,
                tokenUse: "access",
                clientId: env.cognitoClientId
            });
        }
        return accessTokenVerifier;
    }

    if (tokenUse === "id") {
        if (!idTokenVerifier) {
            idTokenVerifier = CognitoJwtVerifier.create({
                userPoolId: env.cognitoUserPoolId,
                tokenUse: "id",
                clientId: env.cognitoClientId
            });
        }
        return idTokenVerifier;
    }

    return null;
}

async function verifyCognitoJwt(token) {
    if (!token || typeof token !== "string") {
        return {
            authenticated: false,
            reason: "missing_token"
        };
    }

    if (!isCognitoAuthConfigured()) {
        return {
            authenticated: false,
            reason: "auth_not_configured"
        };
    }

    const attempts = [
        { tokenUse: "access", verifier: getVerifier("access") },
        { tokenUse: "id", verifier: getVerifier("id") }
    ];

    const errors = [];

    for (const attempt of attempts) {
        try {
            const payload = await attempt.verifier.verify(token);

            return {
                authenticated: true,
                tokenUse: attempt.tokenUse,
                claims: payload,
                user: {
                    sub: payload.sub || "",
                    username: payload.username || payload["cognito:username"] || "",
                    email: payload.email || "",
                    clientId: payload.client_id || payload.aud || "",
                    scope: payload.scope || "",
                    tokenUse: payload.token_use || attempt.tokenUse,
                    issuer: payload.iss || env.cognitoIssuer
                }
            };
        } catch (error) {
            errors.push({
                tokenUse: attempt.tokenUse,
                message: error.message
            });
        }
    }

    return {
        authenticated: false,
        reason: "invalid_token",
        errors
    };
}

module.exports = {
    isCognitoAuthConfigured,
    verifyCognitoJwt
};
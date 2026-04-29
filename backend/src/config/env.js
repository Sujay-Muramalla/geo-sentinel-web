function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toArray(value) {
    if (!value || typeof value !== "string") {
        return [];
    }

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

const cognitoRegion = process.env.COGNITO_REGION || "eu-central-1";
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID || "";
const derivedCognitoIssuer = cognitoUserPoolId
    ? `https://cognito-idp.${cognitoRegion}.amazonaws.com/${cognitoUserPoolId}`
    : "";

const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: toNumber(process.env.PORT, 3000),
    logLevel: process.env.LOG_LEVEL || "info",
    corsAllowedOrigins: toArray(
        process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGIN || ""
    ),
    pythonWorkerTimeoutMs: toNumber(process.env.PYTHON_WORKER_TIMEOUT_MS, 30000),
    intelligenceRequestTimeoutMs: toNumber(process.env.INTELLIGENCE_REQUEST_TIMEOUT_MS, 35000),
    pythonCommand: process.env.PYTHON_COMMAND || (process.platform === "win32" ? "python" : "python3"),
    pythonIntelligenceWorker: process.env.PYTHON_INTELLIGENCE_WORKER || "src/python/rss_intelligence_worker.py",

    authMode: process.env.AUTH_MODE || "optional",
    cognitoRegion,
    cognitoUserPoolId,
    cognitoClientId: process.env.COGNITO_CLIENT_ID || "",
    cognitoIssuer: process.env.COGNITO_ISSUER || derivedCognitoIssuer
};

module.exports = env;
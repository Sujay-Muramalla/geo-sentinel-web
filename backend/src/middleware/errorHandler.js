const { errorResponse } = require("../utils/apiResponse");
const logger = require("../utils/logger");
const env = require("../config/env");

module.exports = function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const code = err.code || "INTERNAL_ERROR";
    const message = err.message || "Internal server error";
    const meta = err.meta || {};

    logger.error("Unhandled request error", {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        code,
        message,
        stack: env.nodeEnv !== "production" ? err.stack : undefined
    });

    return res.status(statusCode).json(
        errorResponse(code, message, meta)
    );
};
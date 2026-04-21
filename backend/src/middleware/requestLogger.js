const logger = require("../utils/logger");

module.exports = function requestLogger(req, res, next) {
    const startedAt = Date.now();

    res.on("finish", () => {
        logger.info("HTTP request completed", {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            ip: req.ip
        });
    });

    next();
};
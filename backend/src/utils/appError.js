class AppError extends Error {
    constructor(message, statusCode = 500, code = "INTERNAL_ERROR", meta = {}) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.meta = meta;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
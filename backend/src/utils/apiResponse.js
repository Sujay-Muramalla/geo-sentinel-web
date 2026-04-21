function successResponse(data = null, meta = {}) {
    return {
        success: true,
        data,
        meta,
        error: null
    };
}

function errorResponse(code = "INTERNAL_ERROR", message = "Something went wrong", meta = {}) {
    return {
        success: false,
        data: null,
        meta,
        error: {
            code,
            message
        }
    };
}

module.exports = {
    successResponse,
    errorResponse
};
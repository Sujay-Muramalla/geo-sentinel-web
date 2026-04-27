const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const AppError = require("../utils/appError");
const { getCache } = require("../services/cacheService");
const { getSnapshotByKey } = require("../services/snapshotService");

const handleGetReportByQueryHash = asyncHandler(async (req, res) => {
    const { queryHash } = req.params;

    if (!queryHash || !/^[a-f0-9]{64}$/i.test(queryHash)) {
        throw new AppError(
            "Invalid report query hash",
            400,
            "INVALID_QUERY_HASH",
            { queryHash }
        );
    }

    const cacheItem = await getCache(queryHash);

    if (!cacheItem || !cacheItem.s3SnapshotKey) {
        throw new AppError(
            "Report snapshot not found",
            404,
            "REPORT_NOT_FOUND",
            { queryHash }
        );
    }

    const snapshot = await getSnapshotByKey(cacheItem.s3SnapshotKey);

    if (!snapshot) {
        throw new AppError(
            "Report snapshot could not be loaded",
            404,
            "REPORT_SNAPSHOT_NOT_FOUND",
            {
                queryHash,
                s3SnapshotKey: cacheItem.s3SnapshotKey
            }
        );
    }

    return res.status(200).json(
        successResponse(
            {
                report: snapshot,
                metadata: {
                    queryHash,
                    s3SnapshotKey: cacheItem.s3SnapshotKey,
                    createdAt: cacheItem.createdAt,
                    expiresAt: cacheItem.expiresAt
                }
            },
            {
                timestamp: new Date().toISOString()
            }
        )
    );
});

module.exports = {
    handleGetReportByQueryHash
};
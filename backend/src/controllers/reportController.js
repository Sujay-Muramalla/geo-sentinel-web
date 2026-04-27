const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const AppError = require("../utils/appError");
const { getCache } = require("../services/cacheService");
const { getSnapshotByKey } = require("../services/snapshotService");
const { buildPerCardReport } = require("../services/reportBuilderService");

function isValidQueryHash(queryHash) {
    return Boolean(queryHash && /^[a-f0-9]{64}$/i.test(queryHash));
}

function isValidResultId(resultId) {
    return Boolean(resultId && /^[a-f0-9]{64}$/i.test(resultId));
}

async function loadSnapshotForQueryHash(queryHash) {
    if (!isValidQueryHash(queryHash)) {
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

    return {
        cacheItem,
        snapshot
    };
}

function normalizeResultId(result = {}) {
    return result.resultId || result.id || "";
}

function findSnapshotResult(snapshot, resultId) {
    const results = Array.isArray(snapshot?.responsePayload?.results)
        ? snapshot.responsePayload.results
        : Array.isArray(snapshot?.results)
            ? snapshot.results
            : [];

    return results.find((result) => normalizeResultId(result) === resultId) || null;
}

const handleGetReportByQueryHash = asyncHandler(async (req, res) => {
    const { queryHash } = req.params;
    const { cacheItem, snapshot } = await loadSnapshotForQueryHash(queryHash);

    return res.status(200).json(
        successResponse(
            {
                report: snapshot,
                metadata: {
                    queryHash,
                    s3SnapshotKey: cacheItem.s3SnapshotKey,
                    s3SnapshotBucket: cacheItem.s3SnapshotBucket || null,
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

const handleGetReportItemByResultId = asyncHandler(async (req, res) => {
    const { queryHash, resultId } = req.params;

    if (!isValidResultId(resultId)) {
        throw new AppError(
            "Invalid report result id",
            400,
            "INVALID_RESULT_ID",
            { queryHash, resultId }
        );
    }

    const { cacheItem, snapshot } = await loadSnapshotForQueryHash(queryHash);
    const result = findSnapshotResult(snapshot, resultId);

    if (!result) {
        throw new AppError(
            "Report item not found in snapshot",
            404,
            "REPORT_ITEM_NOT_FOUND",
            {
                queryHash,
                resultId,
                s3SnapshotKey: cacheItem.s3SnapshotKey
            }
        );
    }

    const report = buildPerCardReport({
        queryHash,
        resultId,
        snapshot,
        result,
        cacheItem
    });

    return res.status(200).json(
        successResponse(
            {
                report,
                metadata: {
                    queryHash,
                    resultId,
                    s3SnapshotKey: cacheItem.s3SnapshotKey,
                    s3SnapshotBucket: cacheItem.s3SnapshotBucket || null,
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
    handleGetReportByQueryHash,
    handleGetReportItemByResultId
};
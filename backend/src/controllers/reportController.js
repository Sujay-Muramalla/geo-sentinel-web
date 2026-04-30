const asyncHandler = require("../utils/asyncHandler");
const { successResponse } = require("../utils/apiResponse");
const AppError = require("../utils/appError");
const { getCache } = require("../services/cacheService");
const { getSnapshotByKey } = require("../services/snapshotService");
const { buildPerCardReport } = require("../services/reportBuilderService");
const {
    generatePdfReport,
    sanitizeFilename
} = require("../services/pdfReportService");

function isValidQueryHash(queryHash) {
    return Boolean(queryHash && /^[a-f0-9]{64}$/i.test(queryHash));
}

function isValidResultId(resultId) {
    return Boolean(resultId && /^[a-f0-9]{64}$/i.test(resultId));
}

function buildReportRecoveryDetails(cacheItem = {}, extra = {}) {
    return {
        createdAt: cacheItem.createdAt || null,
        expiresAt: cacheItem.expiresAt || null,
        isExpired: Boolean(cacheItem.isExpired),
        s3SnapshotKey: cacheItem.s3SnapshotKey || null,
        s3SnapshotBucket: cacheItem.s3SnapshotBucket || null,
        recoverable: true,
        recommendedAction: "REGENERATE_INTELLIGENCE_QUERY",
        ...extra
    };
}

async function loadSnapshotForQueryHash(queryHash) {
    if (!isValidQueryHash(queryHash)) {
        throw new AppError(
            "Invalid report query hash",
            400,
            "INVALID_QUERY_HASH",
            { queryHash, recoverable: false }
        );
    }

    const cacheItem = await getCache(queryHash, { includeExpired: true });

    if (!cacheItem) {
        throw new AppError(
            "Report metadata not found. Regenerate this intelligence query to recreate the report index.",
            404,
            "REPORT_METADATA_NOT_FOUND",
            {
                queryHash,
                recoverable: true,
                recommendedAction: "REGENERATE_INTELLIGENCE_QUERY"
            }
        );
    }

    if (!cacheItem.s3SnapshotKey) {
        throw new AppError(
            "Report snapshot key is missing from cache metadata. Regenerate this intelligence query to recreate the report snapshot.",
            404,
            "REPORT_SNAPSHOT_KEY_MISSING",
            buildReportRecoveryDetails(cacheItem, { queryHash })
        );
    }

    const snapshot = await getSnapshotByKey(cacheItem.s3SnapshotKey);

    if (!snapshot) {
        throw new AppError(
            "Report snapshot could not be loaded from storage. Regenerate this intelligence query to recreate the report snapshot.",
            404,
            "REPORT_SNAPSHOT_NOT_FOUND",
            buildReportRecoveryDetails(cacheItem, { queryHash })
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

function getSnapshotResults(snapshot) {
    if (Array.isArray(snapshot?.responsePayload?.results)) {
        return snapshot.responsePayload.results;
    }

    if (Array.isArray(snapshot?.results)) {
        return snapshot.results;
    }

    if (Array.isArray(snapshot?.report?.responsePayload?.results)) {
        return snapshot.report.responsePayload.results;
    }

    return [];
}

function findSnapshotResult(snapshot, resultId) {
    const results = getSnapshotResults(snapshot);
    return results.find((result) => normalizeResultId(result) === resultId) || null;
}

function buildReportMetadata(queryHash, cacheItem, extra = {}) {
    return {
        queryHash,
        s3SnapshotKey: cacheItem.s3SnapshotKey,
        s3SnapshotBucket: cacheItem.s3SnapshotBucket || null,
        createdAt: cacheItem.createdAt,
        expiresAt: cacheItem.expiresAt,
        isExpired: cacheItem.isExpired || false,
        ...extra
    };
}

const handleGetReportByQueryHash = asyncHandler(async (req, res) => {
    const { queryHash } = req.params;
    const { cacheItem, snapshot } = await loadSnapshotForQueryHash(queryHash);

    return res.status(200).json(
        successResponse(
            {
                report: snapshot,
                metadata: buildReportMetadata(queryHash, cacheItem)
            },
            {
                timestamp: new Date().toISOString()
            }
        )
    );
});

const handleGetReportItemByResultId = asyncHandler(async (req, res) => {
    const { queryHash, resultId } = req.params;
    const format = String(req.query.format || "").toLowerCase();

    if (!isValidResultId(resultId)) {
        throw new AppError(
            "Invalid report result id",
            400,
            "INVALID_RESULT_ID",
            { queryHash, resultId, recoverable: false }
        );
    }

    const { cacheItem, snapshot } = await loadSnapshotForQueryHash(queryHash);
    const result = findSnapshotResult(snapshot, resultId);

    if (!result) {
        throw new AppError(
            "Report item not found in snapshot. Regenerate the intelligence query to rebuild this card report.",
            404,
            "REPORT_ITEM_NOT_FOUND",
            buildReportRecoveryDetails(cacheItem, {
                queryHash,
                resultId
            })
        );
    }

    const report = buildPerCardReport({
        queryHash,
        resultId,
        snapshot,
        result,
        cacheItem
    });

    if (format === "pdf") {
        const pdfBuffer = await generatePdfReport(report);
        const filename = sanitizeFilename(
            `geo-sentinel-report-${report.article?.source || "source"}-${resultId}`
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}.pdf"`
        );
        res.setHeader("Content-Length", pdfBuffer.length);
        res.setHeader("Cache-Control", "no-store");

        return res.status(200).send(pdfBuffer);
    }

    return res.status(200).json(
        successResponse(
            {
                report,
                metadata: buildReportMetadata(queryHash, cacheItem, {
                    resultId
                })
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
const crypto = require("crypto");
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const REGION = process.env.AWS_REGION || "eu-central-1";
const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || "geo-sentinel-cache";

// TTL default (seconds)
const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 600);

const dynamoClient = new DynamoDBClient({ region: REGION });

/**
 * Generate deterministic hash for query payload
 */
function generateQueryHash(payload) {
    const normalized = JSON.stringify(payload);
    return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Build expiry timestamp (used for metadata + S3 snapshot logic)
 */
function buildExpiryTimestamp(createdAtMs, ttlSeconds = DEFAULT_TTL_SECONDS) {
    return Math.floor(createdAtMs / 1000) + ttlSeconds;
}

/**
 * Build cache item
 */
function buildCacheItem(queryHash, payload, responsePayload) {
    const now = Date.now();
    const ttlSeconds = Number.isFinite(DEFAULT_TTL_SECONDS) && DEFAULT_TTL_SECONDS > 0
        ? DEFAULT_TTL_SECONDS
        : 600;

    return {
        queryHash,
        payload,
        responsePayload,
        createdAt: now,
        expiresAt: buildExpiryTimestamp(now, ttlSeconds),
        s3SnapshotKey: null,
        sourceCount: Array.isArray(responsePayload?.results)
            ? responsePayload.results.length
            : 0,
        mode: responsePayload?.mode || "live"
    };
}

/**
 * Get cache from DynamoDB
 */
async function getCache(queryHash) {
    try {
        const command = new GetItemCommand({
            TableName: TABLE_NAME,
            Key: {
                queryHash: { S: queryHash }
            }
        });

        const result = await dynamoClient.send(command);

        if (!result.Item) return null;

        const item = {
            queryHash: result.Item.queryHash.S,
            payload: JSON.parse(result.Item.payload.S),
            responsePayload: JSON.parse(result.Item.responsePayload.S),
            createdAt: Number(result.Item.createdAt.N),
            expiresAt: Number(result.Item.expiresAt.N),
            s3SnapshotKey: result.Item.s3SnapshotKey?.S || null
        };

        // Expiry check
        const now = Math.floor(Date.now() / 1000);
        if (item.expiresAt && item.expiresAt < now) {
            return null;
        }

        return item;

    } catch (error) {
        console.error("[CACHE][GET] Error:", error.message);
        return null;
    }
}

/**
 * Put cache into DynamoDB
 */
async function putCache(cacheItem) {
    try {
        const command = new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
                queryHash: { S: cacheItem.queryHash },
                payload: { S: JSON.stringify(cacheItem.payload) },
                responsePayload: { S: JSON.stringify(cacheItem.responsePayload) },
                createdAt: { N: String(cacheItem.createdAt) },
                expiresAt: { N: String(cacheItem.expiresAt) },
                s3SnapshotKey: { S: cacheItem.s3SnapshotKey || "" }
            }
        });

        await dynamoClient.send(command);

    } catch (error) {
        console.error("[CACHE][PUT] Error:", error.message);
    }
}

module.exports = {
    generateQueryHash,
    getCache,
    putCache,
    buildCacheItem,
    buildExpiryTimestamp
};
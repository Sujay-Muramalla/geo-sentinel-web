const crypto = require("crypto");
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");

const REGION = process.env.AWS_REGION || "eu-central-1";
const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || "geo-sentinel-cache";

const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 600);

const dynamoClient = new DynamoDBClient({ region: REGION });

function generateQueryHash(payload) {
    const normalized = JSON.stringify(payload);
    return crypto.createHash("sha256").update(normalized).digest("hex");
}

function buildExpiryTimestamp(createdAtMs, ttlSeconds = DEFAULT_TTL_SECONDS) {
    return Math.floor(createdAtMs / 1000) + ttlSeconds;
}

function buildCacheItem(queryHash, payload, responsePayload, options = {}) {
    const createdAt = Number.isFinite(Number(options.createdAt))
        ? Number(options.createdAt)
        : Date.now();

    const ttlSeconds = Number.isFinite(DEFAULT_TTL_SECONDS) && DEFAULT_TTL_SECONDS > 0
        ? DEFAULT_TTL_SECONDS
        : 600;

    const expiresAt = Number.isFinite(Number(options.expiresAt))
        ? Number(options.expiresAt)
        : buildExpiryTimestamp(createdAt, ttlSeconds);

    const s3SnapshotKey =
        options.s3SnapshotKey ||
        responsePayload?.cache?.s3SnapshotKey ||
        responsePayload?.metadata?.s3SnapshotKey ||
        null;

    return {
        queryHash,
        payload,
        responsePayload,
        createdAt,
        expiresAt,
        s3SnapshotKey,
        s3SnapshotBucket: options.s3SnapshotBucket || null,
        sourceCount: Array.isArray(responsePayload?.results)
            ? responsePayload.results.length
            : 0,
        mode: responsePayload?.mode || "live"
    };
}

async function getCache(queryHash, options = {}) {
    const includeExpired = Boolean(options.includeExpired);

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
            s3SnapshotKey: result.Item.s3SnapshotKey?.S || null,
            s3SnapshotBucket: result.Item.s3SnapshotBucket?.S || null,
            sourceCount: result.Item.sourceCount?.N ? Number(result.Item.sourceCount.N) : 0,
            mode: result.Item.mode?.S || "cache"
        };

        const now = Math.floor(Date.now() / 1000);
        const isExpired = item.expiresAt && item.expiresAt < now;

        if (isExpired && !includeExpired) {
            return null;
        }

        return {
            ...item,
            isExpired: Boolean(isExpired)
        };
    } catch (error) {
        console.error("[CACHE][GET] Error:", error.message);
        return null;
    }
}

async function putCache(cacheItem) {
    try {
        const item = {
            queryHash: { S: cacheItem.queryHash },
            payload: { S: JSON.stringify(cacheItem.payload) },
            responsePayload: { S: JSON.stringify(cacheItem.responsePayload) },
            createdAt: { N: String(cacheItem.createdAt) },
            expiresAt: { N: String(cacheItem.expiresAt) },
            sourceCount: { N: String(cacheItem.sourceCount || 0) },
            mode: { S: cacheItem.mode || "live" }
        };

        if (cacheItem.s3SnapshotKey) {
            item.s3SnapshotKey = { S: cacheItem.s3SnapshotKey };
        }

        if (cacheItem.s3SnapshotBucket) {
            item.s3SnapshotBucket = { S: cacheItem.s3SnapshotBucket };
        }

        const command = new PutItemCommand({
            TableName: TABLE_NAME,
            Item: item
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
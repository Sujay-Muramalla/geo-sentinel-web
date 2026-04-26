const crypto = require("crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand
} = require("@aws-sdk/lib-dynamodb");

const AWS_REGION = process.env.AWS_REGION || "eu-central-1";
const TABLE_NAME = process.env.DYNAMODB_CACHE_TABLE || "geo-sentinel-cache";
const DEFAULT_TTL_SECONDS = Number(process.env.DYNAMODB_CACHE_TTL_SECONDS || 600);

const dynamoClient = new DynamoDBClient({
    region: AWS_REGION
});

const dynamoDocumentClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

function stableStringify(value) {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }

    return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
        .join(",")}}`;
}

function generateQueryHash(payload) {
    const normalized = stableStringify(payload || {});
    return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function getCache(queryHash) {
    if (!queryHash) return null;

    try {
        const result = await dynamoDocumentClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    queryHash
                }
            })
        );

        return result.Item || null;
    } catch (error) {
        console.error("Cache get error:", {
            message: error.message,
            tableName: TABLE_NAME,
            queryHash
        });

        return null;
    }
}

async function putCache(item) {
    if (!item || !item.queryHash) return;

    try {
        await dynamoDocumentClient.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            })
        );
    } catch (error) {
        console.error("Cache put error:", {
            message: error.message,
            tableName: TABLE_NAME,
            queryHash: item.queryHash
        });
    }
}

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
        expiresAt: Math.floor(now / 1000) + ttlSeconds,
        s3SnapshotKey: null,
        sourceCount: Array.isArray(responsePayload?.results) ? responsePayload.results.length : 0,
        mode: responsePayload?.mode || "live"
    };
}

module.exports = {
    generateQueryHash,
    getCache,
    putCache,
    buildCacheItem
};
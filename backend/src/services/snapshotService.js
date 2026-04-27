const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const AWS_REGION = process.env.AWS_REGION || "eu-central-1";
const SNAPSHOT_BUCKET = process.env.S3_REPORTS_BUCKET || process.env.S3_SNAPSHOT_BUCKET || "";
const SNAPSHOT_PREFIX = (process.env.S3_SNAPSHOT_PREFIX || "snapshots").replace(/^\/+|\/+$/g, "");

const s3Client = new S3Client({
    region: AWS_REGION
});

function pad(value) {
    return String(value).padStart(2, "0");
}

function buildSnapshotKey(queryHash, createdAt = Date.now()) {
    const date = new Date(createdAt);

    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());

    return `${SNAPSHOT_PREFIX}/${year}/${month}/${day}/${queryHash}.json`;
}

async function streamToString(stream) {
    return await new Promise((resolve, reject) => {
        const chunks = [];

        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
}

async function putSnapshot({ queryHash, payload, responsePayload, createdAt = Date.now(), expiresAt = null }) {
    if (!SNAPSHOT_BUCKET || !queryHash || !responsePayload) {
        return null;
    }

    const s3SnapshotKey = buildSnapshotKey(queryHash, createdAt);

    const snapshotPayload = {
        queryHash,
        query: payload?.query || "",
        createdAt,
        expiresAt,
        s3SnapshotKey,
        sourceCount: Array.isArray(responsePayload?.results) ? responsePayload.results.length : 0,
        mode: responsePayload?.mode || "live",
        payload,
        responsePayload
    };

    await s3Client.send(
        new PutObjectCommand({
            Bucket: SNAPSHOT_BUCKET,
            Key: s3SnapshotKey,
            Body: JSON.stringify(snapshotPayload, null, 2),
            ContentType: "application/json",
            ServerSideEncryption: "AES256",
            Metadata: {
                queryhash: queryHash,
                mode: snapshotPayload.mode,
                sourcecount: String(snapshotPayload.sourceCount)
            }
        })
    );

    return {
        bucket: SNAPSHOT_BUCKET,
        key: s3SnapshotKey,
        s3SnapshotKey,
        createdAt,
        sourceCount: snapshotPayload.sourceCount
    };
}

async function getSnapshotByKey(s3SnapshotKey) {
    if (!SNAPSHOT_BUCKET || !s3SnapshotKey) {
        return null;
    }

    const result = await s3Client.send(
        new GetObjectCommand({
            Bucket: SNAPSHOT_BUCKET,
            Key: s3SnapshotKey
        })
    );

    const body = await streamToString(result.Body);
    return JSON.parse(body);
}

module.exports = {
    buildSnapshotKey,
    putSnapshot,
    getSnapshotByKey
};

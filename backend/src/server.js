require("dotenv").config();

const http = require("http");
const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");

const server = http.createServer(app);
server.timeout = env.intelligenceRequestTimeoutMs;

server.listen(env.port, () => {
    logger.info("Geo-Sentinel backend started", {
        port: env.port,
        nodeEnv: env.nodeEnv,
        requestTimeoutMs: env.intelligenceRequestTimeoutMs
    });
});
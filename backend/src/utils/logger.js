const env = require("../config/env");

function serializeMeta(meta = {}) {
    try {
        return Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    } catch {
        return " {\"meta\":\"unserializable\"}";
    }
}

function write(level, message, meta = {}) {
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${serializeMeta(meta)}`;

    if (level === "error") {
        console.error(line);
        return;
    }

    console.log(line);
}

module.exports = {
    debug(message, meta = {}) {
        if (env.logLevel === "debug") {
            write("debug", message, meta);
        }
    },
    info(message, meta = {}) {
        write("info", message, meta);
    },
    warn(message, meta = {}) {
        write("warn", message, meta);
    },
    error(message, meta = {}) {
        write("error", message, meta);
    }
};
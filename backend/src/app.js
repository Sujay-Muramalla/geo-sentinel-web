require("dotenv").config();

const express = require("express");
const cors = require("cors");
const intelligenceRoutes = require("./routes/intelligenceRoutes");

const app = express();

function parseAllowedOrigins() {
    const rawOrigins =
        process.env.CORS_ALLOWED_ORIGINS ||
        process.env.CORS_ALLOWED_ORIGIN ||
        "";

    return rawOrigins
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

const corsOptions = allowedOrigins.length
    ? {
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        methods: ["GET", "POST", "OPTIONS"],
        optionsSuccessStatus: 200
    }
    : {};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

function buildHealthPayload() {
    return {
        success: true,
        status: "ok",
        service: "geo-sentinel-backend",
        timestamp: new Date().toISOString()
    };
}

app.get("/health", (req, res) => {
    res.status(200).json(buildHealthPayload());
});

app.get("/api/health", (req, res) => {
    res.status(200).json(buildHealthPayload());
});

app.use("/api/intelligence", intelligenceRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);

    if (err.message === "Not allowed by CORS") {
        return res.status(403).json({
            success: false,
            message: "CORS origin denied"
        });
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

module.exports = app;
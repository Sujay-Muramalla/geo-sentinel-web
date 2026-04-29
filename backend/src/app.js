require("dotenv").config();

const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const AppError = require("./utils/appError");
const { successResponse } = require("./utils/apiResponse");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");
const { optionalAuth } = require("./middleware/authMiddleware");
const intelligenceRoutes = require("./routes/intelligenceRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

const corsOptions = env.corsAllowedOrigins.length
    ? {
        origin(origin, callback) {
            if (!origin || env.corsAllowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new AppError(
                    "CORS origin denied",
                    403,
                    "CORS_NOT_ALLOWED",
                    { origin }
                )
            );
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        optionsSuccessStatus: 200
    }
    : {};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);
app.use(optionalAuth);

app.get("/health", (req, res) => {
    return res.status(200).json(
        successResponse(
            {
                status: "ok",
                service: "geo-sentinel-backend",
                environment: env.nodeEnv,
                authMode: env.authMode
            },
            {
                timestamp: new Date().toISOString()
            }
        )
    );
});

app.get("/api/health", (req, res) => {
    return res.status(200).json(
        successResponse(
            {
                status: "ok",
                service: "geo-sentinel-backend",
                environment: env.nodeEnv,
                authMode: env.authMode
            },
            {
                timestamp: new Date().toISOString()
            }
        )
    );
});

app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res, next) => {
    next(
        new AppError(
            "Route not found",
            404,
            "NOT_FOUND",
            {
                method: req.method,
                path: req.originalUrl
            }
        )
    );
});

app.use(errorHandler);

module.exports = app;
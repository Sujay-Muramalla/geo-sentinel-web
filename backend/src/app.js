const express = require("express");
const cors = require("cors");
const intelligenceRoutes = require("./routes/intelligenceRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "geo-sentinel-web-backend",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/intelligence", intelligenceRoutes);

module.exports = app;
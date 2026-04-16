const express = require("express");
const cors = require("cors");
const intelligenceRoutes = require("./routes/intelligenceRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        service: "geo-sentinel-backend",
        status: "ok",
        timestamp: new Date().toISOString()
    });
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

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

app.listen(PORT, () => {
    console.log(`Geo-Sentinel backend running on http://localhost:${PORT}`);
});
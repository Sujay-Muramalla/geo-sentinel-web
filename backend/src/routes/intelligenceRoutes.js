const express = require("express");
const router = express.Router();

const {
    analyzeIntelligenceController
} = require("../controllers/intelligenceController");

router.post("/analyze", analyzeIntelligenceController);

module.exports = router;
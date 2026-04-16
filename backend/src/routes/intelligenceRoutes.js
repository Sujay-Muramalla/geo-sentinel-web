const express = require("express");
const { handleGenerateIntelligence } = require("../controllers/intelligenceController");

const router = express.Router();

router.post("/generate", handleGenerateIntelligence);

module.exports = router;
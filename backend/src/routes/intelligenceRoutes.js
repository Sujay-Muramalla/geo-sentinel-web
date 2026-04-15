const express = require("express");
const { analyzeScenario } = require("../controllers/intelligenceController");

const router = express.Router();

router.post("/analyze", analyzeScenario);

module.exports = router;
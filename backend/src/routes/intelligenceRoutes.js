const express = require("express");
const {
    generateIntelligence
} = require("../controllers/intelligenceController");

const router = express.Router();

router.post("/", generateIntelligence);

module.exports = router;
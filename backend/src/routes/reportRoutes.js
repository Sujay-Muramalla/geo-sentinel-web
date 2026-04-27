const express = require("express");
const { handleGetReportByQueryHash } = require("../controllers/reportController");

const router = express.Router();

router.get("/:queryHash", handleGetReportByQueryHash);

module.exports = router;
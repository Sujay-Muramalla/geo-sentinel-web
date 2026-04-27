const express = require("express");
const {
    handleGetReportByQueryHash,
    handleGetReportItemByResultId
} = require("../controllers/reportController");

const router = express.Router();

router.get("/:queryHash", handleGetReportByQueryHash);
router.get("/:queryHash/items/:resultId", handleGetReportItemByResultId);

module.exports = router;
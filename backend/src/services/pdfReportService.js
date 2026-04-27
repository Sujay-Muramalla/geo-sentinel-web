const PDFDocument = require("pdfkit");

function safeText(value, fallback = "N/A") {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    return String(value);
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function sanitizeFilename(value) {
    return safeText(value, "geo-sentinel-report")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 120);
}

function addHeader(doc, report) {
    doc.fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text("Geo-Sentinel Intelligence Report", {
            align: "center"
        });

    doc.moveDown(0.5);

    doc.fontSize(10)
        .font("Helvetica")
        .fillColor("#374151")
        .text(`Report Version: ${safeText(report.version)}`, { align: "center" })
        .text(`Generated At: ${safeText(report.generatedAt)}`, { align: "center" });

    doc.moveDown();

    doc.moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor("#d1d5db")
        .lineWidth(1)
        .stroke();

    doc.moveDown();
}

function addTitleBlock(doc, report) {
    doc.fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(safeText(report.title, "Untitled Intelligence Report"), {
            align: "left"
        });

    doc.moveDown(0.5);

    doc.fontSize(10)
        .font("Helvetica")
        .fillColor("#4b5563")
        .text(`Source: ${safeText(report.article?.source)}`)
        .text(`Published: ${safeText(report.article?.publishedAt)}`)
        .text(`Scenario Query: ${safeText(report.scenario?.query)}`);

    doc.moveDown();
}

function addSectionTitle(doc, title) {
    doc.moveDown(0.8);

    doc.fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(title);

    doc.moveDown(0.3);
}

function addParagraph(doc, text) {
    doc.fontSize(10.5)
        .font("Helvetica")
        .fillColor("#1f2937")
        .text(safeText(text), {
            align: "left",
            lineGap: 4
        });

    doc.moveDown(0.4);
}

function addMetadataLine(doc, label, value) {
    doc.fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(`${label}: `, {
            continued: true
        })
        .font("Helvetica")
        .fillColor("#374151")
        .text(safeText(value));
}

function drawScoreBar(doc, label, value, maxValue = 1) {
    const score = safeNumber(value, 0);
    const normalized = Math.max(0, Math.min(1, score / maxValue));
    const barX = 50;
    const barY = doc.y + 4;
    const barWidth = 260;
    const barHeight = 9;
    const filledWidth = barWidth * normalized;

    doc.fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(`${label}: `, {
            continued: true
        })
        .font("Helvetica")
        .fillColor("#374151")
        .text(String(value ?? "N/A"));

    doc.rect(barX, barY, barWidth, barHeight)
        .strokeColor("#9ca3af")
        .lineWidth(0.8)
        .stroke();

    doc.rect(barX, barY, filledWidth, barHeight)
        .fillColor("#2563eb")
        .fill();

    doc.moveDown(1.1);
}

function addSignalBreakdown(doc, report) {
    addSectionTitle(doc, "Signal Breakdown");

    drawScoreBar(doc, "Query Relevance", report.analytics?.queryRelevance, 1);
    drawScoreBar(doc, "Geo Alignment", report.analytics?.geoAlignment, 1);
    drawScoreBar(doc, "Source Quality", report.analytics?.sourceQuality, 1);
    drawScoreBar(doc, "Recency", report.analytics?.recency, 1);
    drawScoreBar(doc, "Signal Score", report.analytics?.signalScore, 100);
}

function addAnalysisSection(doc, report) {
    const analysis = report.relevanceAnalysis || {};

    addSectionTitle(doc, "Relevance Analysis");

    addParagraph(
        doc,
        `Query Relevance: ${safeText(analysis.queryRelevance?.label)}. ${safeText(analysis.queryRelevance?.explanation)}`
    );

    addParagraph(
        doc,
        `Geo Alignment: ${safeText(analysis.geoAlignment?.label)}. ${safeText(analysis.geoAlignment?.explanation)}`
    );

    addParagraph(
        doc,
        `Source Quality: ${safeText(analysis.sourceQuality?.label)}. ${safeText(analysis.sourceQuality?.explanation)}`
    );

    addParagraph(
        doc,
        `Recency: ${safeText(analysis.recency?.label)}. ${safeText(analysis.recency?.explanation)}`
    );
}

function addMetadataSection(doc, report) {
    addSectionTitle(doc, "Metadata");

    addMetadataLine(doc, "Source", report.article?.source);
    addMetadataLine(doc, "Source Country", report.article?.sourceCountry);
    addMetadataLine(doc, "Source Region", report.article?.sourceRegion);
    addMetadataLine(doc, "Source Tier", report.article?.sourceTier);
    addMetadataLine(doc, "Source Quality", report.article?.sourceQuality);
    addMetadataLine(doc, "Published At", report.article?.publishedAt);
    addMetadataLine(doc, "URL", report.article?.url);
    addMetadataLine(doc, "Sentiment", report.analytics?.sentiment);
    addMetadataLine(doc, "Sentiment Score", report.analytics?.sentimentScore);
    addMetadataLine(doc, "Signal Score", report.analytics?.signalScore);
    addMetadataLine(doc, "Final Score", report.analytics?.finalScore);
    addMetadataLine(doc, "Query Hash", report.queryHash);
    addMetadataLine(doc, "Result ID", report.resultId);
    addMetadataLine(doc, "Snapshot Key", report.snapshot?.s3SnapshotKey);
}

function addFooter(doc) {
    const bottom = doc.page.height - 45;

    doc.fontSize(8)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text(
            "Generated by Geo-Sentinel. Deterministic report generated from captured article metadata and ranking signals. No AI-generated claims added.",
            50,
            bottom,
            {
                align: "center",
                width: 495
            }
        );
}

function generatePdfReport(report) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
                bufferPages: true
            });

            const buffers = [];

            doc.on("data", (chunk) => buffers.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(buffers)));
            doc.on("error", reject);

            addHeader(doc, report);
            addTitleBlock(doc, report);

            addSectionTitle(doc, "Executive Brief");
            addParagraph(doc, report.executiveBrief);

            addSectionTitle(doc, "Article Summary");
            addParagraph(doc, report.articleSummary);

            addAnalysisSection(doc, report);
            addSignalBreakdown(doc, report);

            addSectionTitle(doc, "Signal Interpretation");
            addParagraph(doc, report.signalInterpretation);

            addSectionTitle(doc, "Conclusion");
            addParagraph(doc, report.conclusion);

            addMetadataSection(doc, report);
            addFooter(doc);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    generatePdfReport,
    sanitizeFilename
};
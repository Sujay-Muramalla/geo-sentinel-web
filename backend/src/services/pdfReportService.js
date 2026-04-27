const PDFDocument = require("pdfkit");

const PAGE_MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function safeText(value, fallback = "N/A") {
    if (value === undefined || value === null || value === "") return fallback;
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

function ensureSpace(doc, requiredHeight = 80) {
    const bottomLimit = doc.page.height - PAGE_MARGIN - 45;

    if (doc.y + requiredHeight > bottomLimit) {
        doc.addPage();
    }
}

function addDivider(doc) {
    ensureSpace(doc, 20);

    doc.moveDown(0.5);
    doc.moveTo(PAGE_MARGIN, doc.y)
        .lineTo(PAGE_MARGIN + CONTENT_WIDTH, doc.y)
        .strokeColor("#d1d5db")
        .lineWidth(1)
        .stroke();

    doc.moveDown(0.8);
}

function addHeader(doc, report) {
    doc.fontSize(20)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text("Geo-Sentinel Intelligence Report", {
            align: "center"
        });

    doc.moveDown(0.4);

    doc.fontSize(9.5)
        .font("Helvetica")
        .fillColor("#374151")
        .text(`Report Version: ${safeText(report.version)}`, { align: "center" })
        .text(`Generated At: ${safeText(report.generatedAt)}`, { align: "center" });

    addDivider(doc);
}

function addTitleBlock(doc, report) {
    ensureSpace(doc, 120);

    doc.fontSize(16)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(safeText(report.title, "Untitled Intelligence Report"), {
            align: "left",
            lineGap: 4
        });

    doc.moveDown(0.6);

    doc.fontSize(10)
        .font("Helvetica")
        .fillColor("#4b5563")
        .text(`Source: ${safeText(report.article?.source)}`)
        .text(`Published: ${safeText(report.article?.publishedAt)}`)
        .text(`Scenario Query: ${safeText(report.scenario?.query)}`);

    doc.moveDown(0.5);
}

function addSectionTitle(doc, title) {
    ensureSpace(doc, 60);

    doc.moveDown(0.7);

    doc.fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(title);

    doc.moveDown(0.35);
}

function addParagraph(doc, text) {
    ensureSpace(doc, 90);

    doc.fontSize(10.5)
        .font("Helvetica")
        .fillColor("#1f2937")
        .text(safeText(text), {
            align: "left",
            lineGap: 4
        });

    doc.moveDown(0.55);
}

function addMetadataLine(doc, label, value) {
    ensureSpace(doc, 22);

    doc.fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(`${label}: `, {
            continued: true
        })
        .font("Helvetica")
        .fillColor("#374151")
        .text(safeText(value), {
            lineGap: 2
        });
}

function drawScoreBar(doc, label, value, maxValue = 1) {
    ensureSpace(doc, 42);

    const rawScore = safeNumber(value, 0);
    const normalized = Math.max(0, Math.min(1, rawScore / maxValue));

    const rowX = PAGE_MARGIN;
    const labelWidth = 125;
    const valueWidth = 55;
    const barX = rowX + labelWidth + valueWidth + 12;
    const barWidth = 240;
    const barHeight = 8;

    const labelY = doc.y;
    const barY = labelY + 4;

    doc.fontSize(9.5)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text(`${label}:`, rowX, labelY, {
            width: labelWidth,
            continued: false
        });

    doc.fontSize(9.5)
        .font("Helvetica")
        .fillColor("#374151")
        .text(String(value ?? "N/A"), rowX + labelWidth, labelY, {
            width: valueWidth,
            align: "right"
        });

    doc.rect(barX, barY, barWidth, barHeight)
        .strokeColor("#9ca3af")
        .lineWidth(0.8)
        .stroke();

    doc.rect(barX, barY, barWidth * normalized, barHeight)
        .fillColor("#2563eb")
        .fill();

    doc.y = labelY + 24;
}

function addSignalBreakdown(doc, report) {
    addSectionTitle(doc, "Signal Breakdown");

    doc.fontSize(9)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text("Scores are shown as normalized bars for quick visual interpretation. Signal score is normalized against 100.", {
            lineGap: 3
        });

    doc.moveDown(0.6);

    drawScoreBar(doc, "Query Relevance", report.analytics?.queryRelevance, 1);
    drawScoreBar(doc, "Geo Alignment", report.analytics?.geoAlignment, 1);
    drawScoreBar(doc, "Source Quality", report.analytics?.sourceQuality, 1);
    drawScoreBar(doc, "Recency", report.analytics?.recency, 1);
    drawScoreBar(doc, "Signal Score", report.analytics?.signalScore, 100);

    doc.moveDown(0.4);
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

function addFooterToAllPages(doc) {
    const range = doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);

        const footerY = doc.page.height - 40;

        doc.moveTo(PAGE_MARGIN, footerY - 8)
            .lineTo(PAGE_MARGIN + CONTENT_WIDTH, footerY - 8)
            .strokeColor("#e5e7eb")
            .lineWidth(0.8)
            .stroke();

        doc.fontSize(8)
            .font("Helvetica")
            .fillColor("#6b7280")
            .text(
                `Generated by Geo-Sentinel. Deterministic report generated from captured article metadata and ranking signals. Page ${i + 1}.`,
                PAGE_MARGIN,
                footerY,
                {
                    align: "center",
                    width: CONTENT_WIDTH
                }
            );
    }
}

function generatePdfReport(report) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: PAGE_MARGIN,
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

            addFooterToAllPages(doc);

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
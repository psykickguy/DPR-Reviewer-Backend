import Report from "../models/reportModel.js";
import { extractContent } from "../utils/textExtractor.js";
import { summarizeText } from "../utils/aiService.js";

export const generateReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No report file uploaded." });
    }

    // 1. Extract text from the uploaded document
    const extracted = await extractContent(req.file);

    // Ensure we safely handle both text and data-based formats
    const textToSummarize =
      typeof extracted === "string"
        ? extracted
        : extracted?.text || JSON.stringify(extracted.data || "");

    if (!textToSummarize || textToSummarize.trim() === "") {
      return res.status(400).json({
        message: "Failed to extract readable text from the uploaded file.",
      });
    }

    // 2. Summarize using AI
    const summary = await summarizeText(textToSummarize);

    // 3. Save to database
    const newReport = new Report({
      project: projectId,
      summary,
      originalFilename: req.file.originalname,
      status: "Completed",
    });

    await newReport.save();

    res.status(201).json({
      message: "✅ Report generated and saved successfully!",
      data: newReport,
    });
  } catch (error) {
    console.error("Report generation failed:", error.message);
    res.status(500).json({ message: "Server error during report generation." });
  }
};

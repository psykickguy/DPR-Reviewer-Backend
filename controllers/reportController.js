import Report from "../models/reportModel.js";
import { extractContent } from "../utils/textExtractor.js";
// Import the new analyzer and the old summarizer
import { analyzeDocument, summarizeText } from "../utils/aiService.js";

// You would also need a web search utility for background checks
// For example, a new file `utils/webSearch.js`
// import { performBackgroundSearch } from "../utils/webSearch.js";

export const generateReport = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No report file uploaded." });
    }

    // 1. Extract text from the uploaded document
    const extracted = await extractContent(req.file);
    const textToProcess =
      typeof extracted === "string"
        ? extracted
        : extracted?.text || JSON.stringify(extracted.data || "");

    if (!textToProcess || textToProcess.trim() === "") {
      return res
        .status(400)
        .json({ message: "Failed to extract readable text from the file." });
    }

    // 2. Perform the new deep analysis using AI
    const analysisResult = await analyzeDocument(textToProcess);
    
    // Also generate a simple summary like before
    const summary = await summarizeText(textToProcess);

    // 3. (Optional but recommended) Perform background research
    // let backgroundInfo = "No contractors found to research.";
    // if (analysisResult.entities && analysisResult.entities.contractors.length > 0) {
    //   const contractorName = analysisResult.entities.contractors[0];
    //   // This is a placeholder for a function that would use Google Search API
    //   backgroundInfo = await performBackgroundSearch(contractorName);
    // }

    // 4. Save everything to the database
    const newReport = new Report({
      project: projectId,
      summary: summary, // Keep the old summary
      originalFilename: req.file.originalname,
      status: "Completed",
      // --- SAVE NEW DATA ---
      riskPercentage: analysisResult.riskPercentage,
      riskAnalysis: {
        clauses: analysisResult.clauses,
        financials: analysisResult.financials,
        entities: analysisResult.entities,
      },
      // backgroundResearch: backgroundInfo,
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
import Report from "../models/reportModel.js";
import Note from "../models/noteModel.js";
import { extractContent } from "../utils/textExtractor.js";
// Import the new analyzer and the old summarizer
import {
  analyzeDocument,
  summarizeText,
  checkCompliance,
  detectInconsistencies,
} from "../utils/aiService.js";

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

    // 2. Perform all AI tasks in parallel
    console.log(
      "Starting summary, analysis, and compliance check in parallel..."
    );

    const [analysisResult, summary, complianceResult, inconsistencyResult] =
      await Promise.all([
        analyzeDocument(textToProcess),
        summarizeText(textToProcess),
        checkCompliance(textToProcess),
        detectInconsistencies(textToProcess),
      ]);

    // console.log(
    //   "----------\nRAW COMPLIANCE RESULT:\n",
    //   complianceResult,
    //   "\n----------"
    // );

    console.log("AI tasks completed.");

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
      // --- SAVE NEW COMPLIANCE DATA ---
      complianceScore: complianceResult.complianceScore,
      complianceFindings: complianceResult.complianceFindings,
    });

    if (inconsistencyResult && inconsistencyResult.inconsistencies.length > 0) {
      newReport.inconsistencyFindings = inconsistencyResult.inconsistencies;
    }

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

export const addNoteToReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { text, author } = req.body;

    // 1. Find the parent report to make sure it exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    // 2. Create the new note
    const newNote = new Note({
      text,
      author, // This can be made more robust with user authentication later
      report: reportId,
    });
    await newNote.save();

    // 3. Link the new note to the report by adding its ID to the 'notes' array
    report.notes.push(newNote._id);
    await report.save();

    res.status(201).json({
      message: "Note added successfully!",
      data: newNote,
    });
  } catch (error) {
    console.error("Error adding note:", error.message);
    res.status(500).json({ message: "Server error while adding note." });
  }
};

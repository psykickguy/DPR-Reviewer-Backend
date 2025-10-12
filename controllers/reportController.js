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

// GET a single report by ID (with notes populated)
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate("notes");
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }
    res
      .status(200)
      .json({ message: "Report fetched successfully!", data: report });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching report." });
  }
};

// GET all reports with filtering, sorting, and searching
export const getAllReports = async (req, res) => {
  try {
    const { status, sortBy, search } = req.query;
    let query = {};

    // 1. Filtering by status
    if (status) {
      query.status = status; // e.g., /reports?status=Completed
    }

    // 2. Searching by original filename
    if (search) {
      // Creates a case-insensitive regex search
      query.originalFilename = { $regex: search, $options: "i" }; // e.g., /reports?search=national
    }

    // 3. Sorting
    let sortOption = { createdAt: -1 }; // Default sort by newest
    if (sortBy === "oldest") {
      sortOption = { createdAt: 1 }; // e.g., /reports?sortBy=oldest
    }

    const reports = await Report.find(query).sort(sortOption);
    res.status(200).json({
      message: "Reports fetched successfully!",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching reports." });
  }
};

// UPDATE a report (e.g., change its status)
export const updateReport = async (req, res) => {
  try {
    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      req.body, // Allows updating fields like 'status' from the request body
      { new: true, runValidators: true }
    );
    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found." });
    }
    res.status(200).json({
      message: "Report updated successfully!",
      data: updatedReport,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating report." });
  }
};

// DELETE a report
export const deleteReport = async (req, res) => {
  try {
    // Note: This only deletes the report record, not the associated file in Cloudinary
    // A more robust delete would also find and delete the Cloudinary file
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }
    // Also delete all notes associated with this report
    await Note.deleteMany({ report: req.params.id });
    res
      .status(200)
      .json({ message: "Report and associated notes deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting report." });
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

// GET all notes for a specific report
export const getNotesForReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const notes = await Note.find({ report: reportId }).sort({ createdAt: -1 });
    res.status(200).json({
      message: "Notes fetched successfully!",
      data: notes,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching notes." });
  }
};

// UPDATE a specific note by its ID
export const updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { text } = req.body;
    const updatedNote = await Note.findByIdAndUpdate(
      noteId,
      { text },
      { new: true, runValidators: true }
    );

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found." });
    }
    res.status(200).json({
      message: "Note updated successfully!",
      data: updatedNote,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while updating note." });
  }
};

// DELETE a specific note by its ID
export const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const note = await Note.findByIdAndDelete(noteId);

    if (!note) {
      return res.status(404).json({ message: "Note not found." });
    }

    // Also remove the note's ID from the parent report's 'notes' array
    await Report.findByIdAndUpdate(note.report, { $pull: { notes: noteId } });

    res.status(200).json({ message: "Note deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting note." });
  }
};

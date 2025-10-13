import Report from "../models/reportModel.js";
import Note from "../models/noteModel.js";
import Project from "../models/projectModel.js"; // 💡 IMPORT PROJECT MODEL
import { extractContent } from "../utils/textExtractor.js";
// Import the new analyzer and the old summarizer
import {
  analyzeDocument,
  summarizeText,
  checkCompliance,
  detectInconsistencies,
  getReportSpecificChatResponse,
} from "../utils/aiService.js";

// You would also need a web search utility for background checks
// For example, a new file `utils/webSearch.js`
// import { performBackgroundSearch } from "../utils/webSearch.js";


// --- NEW DASHBOARD STATS CONTROLLER ---
// --- [REPLACE THE EXISTING getDashboardStats FUNCTION WITH THIS ONE] ---

export const getDashboardStats = async (req, res) => {
  try {
    // Using Promise.all to run all database queries in parallel for better performance
    const [
      totalDprs,
      completedEvaluations,
      activeProjects,
      avgCompletenessResult,
    ] = await Promise.all([
      Project.countDocuments(),
      Report.countDocuments({ status: "Completed" }),
      Report.countDocuments({ status: { $ne: "Completed" } }),
      Report.aggregate([
        {
          // 💡 STAGE 1: Only consider reports that HAVE a complianceScore
          $match: {
            complianceScore: { $exists: true, $ne: null },
          },
        },
        {
          // 💡 STAGE 2: Group the remaining documents and calculate the average
          $group: {
            _id: null,
            averageScore: { $avg: "$complianceScore" },
          },
        },
      ]),
    ]);

    // 💡 SAFER HANDLING: Check if the aggregation result has any data.
    // If it doesn't (because no reports have scores), default to 0.
    const averageCompleteness =
      avgCompletenessResult.length > 0 && avgCompletenessResult[0].averageScore
        ? Math.round(avgCompletenessResult[0].averageScore)
        : 0;

    res.status(200).json({
      message: "Dashboard stats fetched successfully!",
      data: {
        totalDprs,
        completedEvaluations,
        averageCompleteness,
        activeProjects,
      },
    });
  } catch (error) {
    // This will now provide a more specific error in your server console
    console.error("Error fetching dashboard stats:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching dashboard stats." });
  }
};

// --- [THE REST OF THE FILE REMAINS THE SAME] ---

// Add this new function to the reportController.js file.
// A good place is right after the getDashboardStats function.

export const getEvaluationsOverTime = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const results = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
            },
          },
          incomplete: {
            $sum: {
              $cond: [{ $ne: ["$status", "Completed"] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Helper to format the aggregated data for the frontend chart
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const categories = [];
    const completedData = [];
    const incompleteData = [];

    // Initialize the last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      
      categories.push(monthNames[monthIndex]);
      
      const result = results.find(
        (r) => r._id.year === year && r._id.month === monthIndex + 1
      );

      if (result) {
        completedData.push(result.completed);
        incompleteData.push(result.incomplete);
      } else {
        completedData.push(0);
        incompleteData.push(0);
      }
    }

    res.status(200).json({
      message: "Evaluation time-series data fetched successfully!",
      data: {
        series: [
          { name: "Completed", data: completedData },
          { name: "Incomplete", data: incompleteData },
        ],
        categories: categories,
      },
    });
  } catch (error) {
    console.error("Error fetching evaluations over time:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching time-series data." });
  }
};

// Add this new function to the reportController.js file.

export const getFlaggedIssues = async (req, res) => {
  try {
    const flaggedIssues = await Report.aggregate([
      // Stage 1: Deconstruct the inconsistencyFindings array field from the input documents to output a document for each element.
      {
        $unwind: "$inconsistencyFindings",
      },
      // Stage 2: Group input documents by the 'finding' title and 'severity' and count the occurrences of each.
      {
        $group: {
          _id: {
            issue: "$inconsistencyFindings.finding",
            severity: "$inconsistencyFindings.severity",
          },
          count: { $sum: 1 },
        },
      },
      // Stage 3: Reshape the grouped data to the desired format.
      {
        $project: {
          _id: 0,
          issue: "$_id.issue",
          severity: "$_id.severity",
          count: "$count",
        },
      },
      // Stage 4: Sort the results by count in descending order to see the most common issues first.
      {
        $sort: { count: -1 },
      },
      // Stage 5: Limit the output to the top 5 most frequent issues.
      {
        $limit: 5,
      },
    ]);

    res.status(200).json({
      message: "Flagged issues fetched successfully!",
      data: flaggedIssues,
    });
  } catch (error) {
    console.error("Error fetching flagged issues:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching flagged issues." });
  }
};


// Add this new function to the reportController.js file.
// A good place is right after getFlaggedIssues.

export const getRiskPredictions = async (req, res) => {
  try {
    const predictions = await Report.aggregate([
      {
        $group: {
          _id: null, // Group all reports together
          avgCost: { $avg: "$riskPredictions.cost" },
          avgTimeline: { $avg: "$riskPredictions.timeline" },
          avgEnvironmental: { $avg: "$riskPredictions.environmental" },
        },
      },
      {
        $project: {
          _id: 0,
          predictions: [
            {
              riskType: "Cost Overrun Risk",
              averageScore: { $round: ["$avgCost", 0] },
            },
            {
              riskType: "Timeline Risk",
              averageScore: { $round: ["$avgTimeline", 0] },
            },
            {
              riskType: "Environmental Risk",
              averageScore: { $round: ["$avgEnvironmental", 0] },
            },
          ],
        },
      },
    ]);

    // Handle the case where there are no reports yet
    const data = predictions.length > 0 ? predictions[0].predictions : [];

    res.status(200).json({
      message: "Risk predictions fetched successfully!",
      data: data,
    });
  } catch (error) {
    console.error("Error fetching risk predictions:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching risk predictions." });
  }
};

// ... (the rest of your controller file)


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
      status: "In-Progress",
      // --- SAVE NEW DATA ---
      fullTextContent: textToProcess, 
      // --- SAVE NEW DATA ---
      riskPercentage: analysisResult.riskPercentage,
      riskAnalysis: {
        clauses: analysisResult.clauses,
        financials: analysisResult.financials,
        entities: analysisResult.entities,
      },

      riskPredictions: analysisResult.riskPredictions, 
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

    if (status) {
      query.status = status;
    }

    // This search is on the report's original filename.
    // A more advanced search could query the populated Project data.
    if (search) {
      query.originalFilename = { $regex: search, $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") {
      sortOption = { createdAt: 1 };
    }

    // --- ENHANCEMENT ---
    // Populate the 'project' field to include project details in the response
    const reports = await Report.find(query)
      .populate("project") // <-- This is the key change
      .sort(sortOption);

    res.status(200).json({
      message: "Reports fetched successfully!",
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching reports." });
  }
};

// UPDATE a report (e.g., change status or progress)
export const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    // Only allow specific fields to be updated to prevent unwanted changes
    const { status, progress } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;


    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found." });
    }

    // If progress was updated, add a timeline event
    if (progress !== undefined) {
      updatedReport.timelineEvents.push({
        eventName: "Progress Updated",
        description: `Progress set to ${progress}%`,
      });
      await updatedReport.save();
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

// ADD a timeline event to a report
export const addTimelineEvent = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { eventName, description } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    report.timelineEvents.push({ eventName, description });
    await report.save();

    res.status(201).json({
      message: "Timeline event added successfully!",
      data: report.timelineEvents,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while adding timeline event." });
  }
};

// GET all timeline events for a report
export const getTimelineEvents = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await Report.findById(reportId).select("timelineEvents");

    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    res.status(200).json({
      message: "Timeline events fetched successfully!",
      data: report.timelineEvents.sort((a, b) => b.createdAt - a.createdAt), // Return newest first
    });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching timeline events." });
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

// ADD THIS NEW CONTROLLER FUNCTION
export const handleReportChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // 1. Find the report and its text content
    const report = await Report.findById(id);
    if (!report || !report.fullTextContent) {
      return res.status(404).json({ message: "Report or its content not found." });
    }

    // 2. Get the AI response using the report's text as context
    const aiResponse = await getReportSpecificChatResponse(message, report.fullTextContent);

    // 3. Send the response back to the user
    res.status(200).json({ reply: aiResponse });
  } catch (error) {
    console.error("Error in report chat:", error);
    res.status(500).json({ error: "Server error during chat processing." });
  }
};

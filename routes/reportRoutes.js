import express from "express";
import multer from "multer";
import {
  generateReport,
  getReportById,
  getAllReports,
  updateReport,
  deleteReport,
  addNoteToReport,
  getNotesForReport,
  updateNote,
  deleteNote,
  getDashboardStats, // 💡 IMPORT THE NEW CONTROLLER
  getEvaluationsOverTime, // 💡 IMPORT THE NEW CONTROLLER
  getFlaggedIssues, // 💡 IMPORT THE NEW CONTROLLER
  getRiskPredictions, // 💡 IMPORT THE NEW CONTROLLER
  addTimelineEvent,    // <-- IMPORT NEW
  getTimelineEvents,   // <-- IMPORT NEW
  handleReportChat,      // <-- IMPORT THE NEW CONTROLLER
  predictReportOutcome,
  deleteAllReports, // <-- IMPORT THE NEW CONTROLLER
} from "../controllers/reportController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Dashboard Routes ---
router.get("/stats", getDashboardStats); // 💡 ADD THE NEW STATS ROUTE
router.get("/over-time", getEvaluationsOverTime); // 💡 ADD THE NEW TIME-SERIES ROUTE
router.get("/flagged-issues", getFlaggedIssues); // 💡 ADD THE NEW FLAGGED ISSUES ROUTE
router.get("/risk-predictions", getRiskPredictions); // 💡 ADD THE NEW ROUTE
// --- Report Generation & CRUD ---
router.get("/", getAllReports); // Read (Get all with filters)
router.post(
  "/projects/:projectId",
  upload.single("reportFile"),
  generateReport
); // Create
router.get("/:id", getReportById); // Read (Get one)
router.patch("/:id", updateReport); // Update
router.delete("/all", deleteAllReports);//Delete all
router.delete("/:id", deleteReport); // Delete

// --- ADD THE NEW PREDICTION ROUTE ---
router.get("/:id/predict-outcome", predictReportOutcome);

// --- Report-Specific Chat Route ---
router.post("/:id/chat", handleReportChat); 

// --- New Timeline Routes ---
router.post("/:reportId/timeline", addTimelineEvent);
router.get("/:reportId/timeline", getTimelineEvents);

// --- Note CRUD ---
router.post("/:reportId/notes", addNoteToReport); // Create
router.get("/:reportId/notes", getNotesForReport); // Read (Get all for one report)
router.patch("/notes/:noteId", updateNote); // Update (Using PATCH is standard)
router.delete("/notes/:noteId", deleteNote); // Delete

export default router;
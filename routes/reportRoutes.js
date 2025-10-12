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
} from "../controllers/reportController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Report Generation & CRUD ---
router.get("/", getAllReports); // Read (Get all with filters)
router.post(
  "/projects/:projectId",
  upload.single("reportFile"),
  generateReport
); // Create
router.get("/:id", getReportById); // Read (Get one)
router.patch("/:id", updateReport); // Update
router.delete("/:id", deleteReport); // Delete

// --- Note CRUD ---
router.post("/:reportId/notes", addNoteToReport); // Create
router.get("/:reportId/notes", getNotesForReport); // Read (Get all for one report)
router.patch("/notes/:noteId", updateNote); // Update (Using PATCH is standard)
router.delete("/notes/:noteId", deleteNote); // Delete

export default router;

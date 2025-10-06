import express from "express";
import multer from "multer";
import { generateReport } from "../controllers/reportController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /reports/projects/:projectId
router.post(
  "/projects/:projectId",
  upload.single("reportFile"),
  generateReport
);

export default router;

import express from "express";
import {
  uploadProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addFileToProject,      // <-- IMPORT NEW
  deleteFileFromProject, // <-- IMPORT NEW
  viewProjectFile,       // <-- IMPORT NEW (replaces old viewProject)
} from "../controllers/projectController.js";
import upload from "../config/multer.js";

const router = express.Router();

// CREATE: POST /projects (Uploads a project with its first file)
router.post("/", upload.single("projectFile"), uploadProject);

// READ: GET /projects and GET /projects/:id
router.get("/", getAllProjects);
router.get("/:id", getProjectById);

// UPDATE: PATCH /projects/:id (Update project metadata)
router.patch("/:id", updateProject);

// DELETE: DELETE /projects/:id (Deletes project and all its files)
router.delete("/:id", deleteProject);

// --- New File Management Routes ---

// ADD FILE: POST /projects/:id/files (Adds a file to a project)
router.post("/:id/files", upload.single("projectFile"), addFileToProject);

// DELETE FILE: DELETE /projects/:id/files/:fileId (Deletes a specific file)
router.delete("/:id/files/:fileId", deleteFileFromProject);

// VIEW FILE: GET /projects/:id/files/:fileId/view (View a specific file)
router.get("/:id/files/:fileId/view", viewProjectFile);


export default router;
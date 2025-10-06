import express from "express";
import {
  uploadProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  viewProject,
} from "../controllers/projectController.js";
import upload from "../config/multer.js";

const router = express.Router();

// CREATE: POST /projects
router.post("/", upload.single("project"), uploadProject);

// READ: GET /projects and GET /projects/:id
router.get("/", getAllProjects);
router.get("/:id", getProjectById);

// UPDATE: PATCH /projects/:id
router.patch("/:id", updateProject);

// DELETE: DELETE /projects/:id
router.delete("/:id", deleteProject);

// 2. Add the new route for viewing the project
router.get("/:id/view", viewProject);

export default router;

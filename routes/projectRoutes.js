import express from "express";
import {
  uploadProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
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

export default router;

import Project from "../models/projectModel.js";
import cloudinary from "../config/cloudinary.js";

// CREATE: Upload a new project
export const uploadProject = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No project uploaded." });
    }

    const newProject = new Project({
      originalFilename: req.file.originalname,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
      projectType: req.body.projectType,
      language: req.body.language,
    });

    await newProject.save();
    res
      .status(201)
      .json({ message: "Project uploaded successfully!", data: newProject });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// READ: Get all projects
export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// READ: Get a single project by ID
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found." });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// UPDATE: Update a project's metadata
export const updateProject = async (req, res) => {
  try {
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedProject)
      return res.status(404).json({ message: "Project not found." });
    res
      .status(200)
      .json({ message: "Project updated successfully!", data: updatedProject });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// DELETE: Delete a project's files
export const deleteProject = async (req, res) => {
  try {
    // 1. Find the project record in MongoDB
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found." });

    // 2. Delete the project from Cloudinary using its public ID
    await cloudinary.uploader.destroy(project.cloudinaryPublicId, {
      resource_type: "raw",
    });

    // 3. Delete the record from MongoDB
    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Project deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// VIEW: Find a project and redirect to its Cloudinary URL
export const viewProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Redirect the client to the project's public URL
    return res.redirect(project.cloudinaryUrl);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

import Project from "../models/projectModel.js";
import cloudinary from "../config/cloudinary.js";

// CREATE: Upload a new project with its first file
export const uploadProject = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No project file uploaded." });
    }

    const newProject = new Project({
      projectName: req.body.projectName || req.file.originalname,
      projectType: req.body.projectType,
      language: req.body.language,
      files: [
        {
          originalFilename: req.file.originalname,
          cloudinaryUrl: req.file.path,
          cloudinaryPublicId: req.file.filename,
        },
      ],
    });

    await newProject.save();
    res
      .status(201)
      .json({ message: "Project created successfully!", data: newProject });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// ADD FILE: Add a new file to an existing project
export const addFileToProject = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    project.files.push({
      originalFilename: req.file.originalname,
      cloudinaryUrl: req.file.path,
      cloudinaryPublicId: req.file.filename,
    });

    await project.save();
    res.status(200).json({ message: "File added successfully!", data: project });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export const deleteFileFromProject = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const file = project.files.id(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found in project." });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
      resource_type: "raw",
    });

    // --- THIS IS THE FIX ---
    // Use the pull method to remove the subdocument from the array
    project.files.pull(fileId);
    // --- END OF FIX ---
    
    await project.save();

    res.status(200).json({ message: "File deleted successfully!", data: project });
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

// DELETE: Delete a project and all its files
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found." });

    // Delete all associated files from Cloudinary
    for (const file of project.files) {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId, {
        resource_type: "raw",
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Project and all associated files deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// VIEW: Redirect to a specific file's Cloudinary URL
export const viewProjectFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
    const file = project.files.id(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found." });
    }

    return res.redirect(file.cloudinaryUrl);
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
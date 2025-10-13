import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  originalFilename: { type: String, required: true },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true }, // Changed from originalFilename
  projectType: { type: String, required: true },
  language: { type: String, required: true },
  files: [fileSchema], // Replaced single file fields with an array of files
  createdAt: { type: Date, default: Date.now },
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
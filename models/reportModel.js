import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "File", // IMPORTANT: Change 'File' to your actual project model name if different
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  originalFilename: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Completed", "Failed"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model("Report", reportSchema);

export default Report;

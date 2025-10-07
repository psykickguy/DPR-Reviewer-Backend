import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project", // Corrected the ref to 'Project'
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  // --- NEW FIELDS ---
  riskPercentage: {
    type: Number,
    required: false,
  },
  riskAnalysis: {
    clauses: [
      {
        text: String,
        riskLevel: String,
        explanation: String,
      },
    ],
    financials: {
      costs: [Number],
      quotes: [Number],
    },
    entities: {
      contractors: [String],
    },
  },
  backgroundResearch: { // For background research results
    type: String,
    required: false,
  },
  // --- END NEW FIELDS ---
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
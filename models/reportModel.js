import mongoose from "mongoose";

const timelineEventSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const reportSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
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
  riskPredictions: {
    cost: { type: Number },
    timeline: { type: Number },
    environmental: { type: Number },
  },
  backgroundResearch: {
    type: String,
    required: false,
  },
  complianceScore: {
    type: Number,
  },
  complianceFindings: [
    {
      guideline: String,
      status: String,
      justification: String,
    },
  ],
  inconsistencyFindings: [
    {
      finding: String,
      evidence: String,
      explanation: String,
      severity: String,
    },
  ],
  notes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
    },
  ],
  originalFilename: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["In-Progress", "Completed", "Failed"],
    required: true,
  },
  // --- NEW FIELDS ---
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  timelineEvents: [timelineEventSchema],
  // --- END NEW FIELDS ---
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Report = mongoose.model("Report", reportSchema);

export default Report;
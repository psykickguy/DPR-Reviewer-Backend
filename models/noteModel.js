import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    // This links the note to a specific report
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      required: true,
    },
    // Optional: To track who wrote the note
    author: {
      type: String,
      default: "Admin", // You can replace this later with a user ID
    },
  },
  { timestamps: true }
);

const Note = mongoose.model("Note", noteSchema);

export default Note;

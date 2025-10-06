import { getChatResponse } from "../utils/aiService.js";

export const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const aiResponse = await getChatResponse(message);
    res.status(200).json({ reply: aiResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

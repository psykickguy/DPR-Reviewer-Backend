import "dotenv/config";

export const getChatResponse = async (userMessage) => {
  // Check for the API key in environment variables
  if (!process.env.A4F_API_KEY) {
    throw new Error("A4F_API_KEY is not defined in the .env file.");
  }

  // Check for an empty user message
  if (!userMessage) {
    throw new Error("User message cannot be empty.");
  }

  try {
    const response = await fetch("https://api.a4f.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.A4F_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "provider-3/gpt-4o-mini",
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      // Handle non-successful HTTP responses
      const errorData = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorData}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No response content from AI.";
  } catch (error) {
    console.error("Error communicating with OpenAI API:", error);
    throw new Error("Failed to get response from the AI service.");
  }
};

export const summarizeText = async (textToSummarize) => {
  if (!process.env.A4F_API_KEY) {
    throw new Error("A4F_API_KEY is not defined in the .env file.");
  }

  if (!textToSummarize || textToSummarize.trim() === "") {
    return "No text content provided to summarize.";
  }

  // Truncate long texts to avoid exceeding API limits
  const maxChars = 15000;
  const truncatedText =
    textToSummarize.length > maxChars
      ? textToSummarize.substring(0, maxChars)
      : textToSummarize;

  try {
    const response = await fetch("https://api.a4f.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.A4F_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "provider-3/gpt-4o-mini", // Or another model you prefer
        messages: [
          {
            role: "system",
            content:
              "You are an expert summarizer. Your task is to provide a concise, easy-to-read summary of the provided document content. Focus on the key points, objectives, and conclusions.",
          },
          {
            role: "user",
            content: truncatedText,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorData}`
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "Could not generate summary.";
  } catch (error) {
    console.error("Error during summarization:", error);
    throw new Error("Failed to generate summary from the AI service.");
  }
};

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

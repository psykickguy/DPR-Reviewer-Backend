import "dotenv/config";

export const getChatResponse = async (userMessage) => {
  if (!process.env.A4F_API_KEY) {
    throw new Error("A4F_API_KEY is not defined in the .env file.");
  }
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
        model: "provider-3/gpt-4o-mini",
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

export const analyzeDocument = async (textToAnalyze) => {
  if (!process.env.A4F_API_KEY) {
    throw new Error("A4F_API_KEY is not defined in the .env file.");
  }

  if (!textToAnalyze || textToAnalyze.trim() === "") {
    return { error: "No text content provided to analyze." };
  }

  const maxChars = 15000;
  const truncatedText =
    textToAnalyze.length > maxChars
      ? textToAnalyze.substring(0, maxChars)
      : textToAnalyze;

  const analysisPrompt = `
    Analyze the following document text and provide a JSON response.
    Identify key clauses and categorize them by risk level.
    Extract financial data points like costs and quoted prices.
    Identify the primary contractor or company names mentioned.

    DOCUMENT TEXT:
    """
    ${truncatedText}
    """

    Based on the text, provide a JSON object with the following structure:
    {
      "riskPercentage": <A number from 0 to 100 representing the overall risk>,
      "riskSummary": "<A brief summary of the key risks found>",
      "clauses": [
        {
          "text": "<The exact text of the risky or important clause>",
          "riskLevel": "<'High', 'Medium', or 'Low'>",
          "explanation": "<A brief explanation of why this clause is a risk>"
        }
      ],
      "financials": {
        "costs": [<list of extracted costs as numbers>],
        "quotes": [<list of extracted price quotes as numbers>]
      },
      "entities": {
        "contractors": ["<List of contractor or company names>"]
      }
    }
  `;

  try {
    const response = await fetch("https://api.a4f.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.A4F_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "provider-3/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert contract and project document analyzer. Your output must be a valid JSON object.",
          },
          { role: "user", content: analysisPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorData}`
      );
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content;

    // --- CONFLICT RESOLVED ---
    // Clean the string of markdown formatting before parsing
    const cleanedContent = content.replace(/^```json\s*|```$/g, "");

    // Parse the cleaned string
    return JSON.parse(cleanedContent);
    // --- END OF FIX ---
  } catch (error) {
    console.error("Error during document analysis:", error);
    throw new Error("Failed to analyze document from the AI service.");
  }
};

export const checkCompliance = async (textToAnalyze) => {
  if (!process.env.A4F_API_KEY) {
    throw new Error("A4F_API_KEY is not defined in the .env file.");
  }
  if (!textToAnalyze || textToAnalyze.trim() === "") {
    return { error: "No text provided for compliance check." };
  }

  const maxChars = 15000;
  const truncatedText =
    textToAnalyze.length > maxChars
      ? textToAnalyze.substring(0, maxChars)
      : textToAnalyze;

  const compliancePrompt = `
    You are an expert auditor for Indian government infrastructure projects. Your task is to analyze the following Detailed Project Report (DPR) text for compliance with the key principles of the Department of Expenditure (DoE) guidelines.

    **DoE Guideline Principles Checklist:**
    1.  **Clear Objectives:** Does the DPR clearly state the project's goals and outcomes?
    2.  **Cost-Benefit Analysis:** Is there a clear analysis of expected economic and social benefits versus the costs?
    3.  **Realistic Timelines:** Are the project timelines and phases clearly defined and plausible?
    4.  **Risk Mitigation Plan:** Does the DPR identify potential risks (financial, environmental, social) and propose a mitigation plan?
    5.  **Stakeholder Identification:** Are the key stakeholders (implementing agencies, beneficiaries, etc.) clearly identified?
    6.  **Financial Viability:** Are the cost estimates detailed and the funding sources clearly mentioned?

    **DPR TEXT TO ANALYZE:**
    """
    ${truncatedText}
    """

    **Your Task:**
    Based on the DPR text, provide a JSON response. For each guideline principle, determine if the DPR is compliant, partially compliant, or non-compliant, and provide a brief justification with evidence from the text. Finally, calculate an overall compliance score from 0 to 100.

    **JSON OUTPUT STRUCTURE:**
    {
      "complianceScore": <A number from 0 to 100>,
      "complianceSummary": "<A brief summary of the overall compliance level>",
      "complianceFindings": [
        {
          "guideline": "<The DoE guideline principle being checked>",
          "status": "<'Compliant', 'Partially Compliant', or 'Non-Compliant'>",
          "justification": "<Your reasoning, with evidence from the DPR text>"
        }
      ]
    }
  `;

  try {
    const response = await fetch("https://api.a4f.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.A4F_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "provider-3/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert auditor. Your output must be a valid JSON object.",
          },
          { role: "user", content: compliancePrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorData}`
      );
    }
    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content;

    // --- 💡 THIS IS THE FIX ---
    // Clean the string of markdown formatting
    const jsonString = rawContent.replace(/^```json\s*|```$/g, "");

    // Parse the cleaned string to return a true object
    return JSON.parse(jsonString);
    // --- END OF FIX ---
  } catch (error) {
    console.error("Error during compliance check:", error);
    throw new Error("Failed to get compliance analysis from the AI service.");
  }
};

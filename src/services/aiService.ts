import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeImage(base64Image: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this image to determine if it is a real photograph or AI-generated (fake).
    Look for common AI artifacts:
    - Inconsistent lighting or shadows
    - Unnatural textures (especially skin or hair)
    - Distorted background details
    - Anatomical errors (fingers, eyes)
    - Perfect symmetry or lack of natural imperfections
    
    Return the result in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prediction: {
            type: Type.STRING,
            description: "Either 'Real' or 'AI Generated'",
          },
          confidence: {
            type: Type.NUMBER,
            description: "Confidence percentage (0-100)",
          },
          reasoning: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of visual cues found",
          },
          artifacts: {
            type: Type.STRING,
            description: "Brief description of any AI artifacts found",
          }
        },
        required: ["prediction", "confidence", "reasoning"],
      },
    },
  });

  return JSON.parse(response.text);
}

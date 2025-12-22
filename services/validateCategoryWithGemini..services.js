import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function validateCategoryWithGemini({
  query,
  inferredCategoryId,
  categoryCandidates
}) {
  const list = categoryCandidates
    .map(
      (c, i) =>
        `${i + 1}. CategoryId: ${c.id}, Example product: ${c.sampleTitle}`
    )
    .join("\n");

  const prompt = `
User search query:
"${query}"

The system inferred this categoryId:
"${inferredCategoryId}"

Here are the category candidates from search results:
${list}

Task:
- Decide if the inferred categoryId matches the user intent.
- If correct → return the SAME categoryId.
- If incorrect → return the BEST categoryId from the list above.
- Return ONLY the categoryId string.
No explanations.
`;

  const res = await llm.invoke(prompt);
  return String(res.content || "").trim();
}

import type{ChatMessage} from "../types.js"
import type{LlmResponse} from "../types.js"

const baseUrl = process.env.LLM_BASE_URL 
const model = process.env.LLM_MODEL 
const apiKey = process.env.LLM_API_KEY 

export async function askCodingModel(messages: ChatMessage[]): Promise<LlmResponse> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body.slice(0, 1000)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  };

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("LLM returned an empty response.");
  }

  return { content };
}

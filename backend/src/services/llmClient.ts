interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface LlmResponse {
  content: string;
}

const baseUrl = (process.env.LLM_BASE_URL ?? "http://localhost:11434/v1").replace(/\/$/, "");
const model = process.env.LLM_MODEL ?? "qwen2.5-coder:7b";
const apiKey = process.env.LLM_API_KEY ?? "ollama";

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

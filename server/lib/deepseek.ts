import { readEnv, type RuntimeEnv } from "./env";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export async function createDeepSeekChatCompletion(
  env: RuntimeEnv | undefined,
  body: {
    model: string;
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: "json_object" };
  }
) {
  const apiKey = readEnv(env).DEEPSEEK_API_KEY || "";
  if (!apiKey) return null;

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`DeepSeek request failed: ${response.status} ${detail}`);
  }

  return response.json() as Promise<{
    choices?: Array<{ message?: { content?: string } }>;
  }>;
}


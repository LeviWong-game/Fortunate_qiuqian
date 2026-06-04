import OpenAI from "openai";

// ============================================================
// DeepSeek Client (OpenAI-compatible SDK)
// ============================================================
let deepseek: OpenAI | null = null;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";

if (deepseekApiKey) {
  try {
    deepseek = new OpenAI({
      apiKey: deepseekApiKey,
      baseURL: "https://api.deepseek.com",
    });
  } catch (error) {
    console.error("[DeepSeek] 初始化失败：", error);
  }
}

export { deepseek };

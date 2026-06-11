import {
  DASHSCOPE_IMAGE_MODEL,
  buildDashscopeWan26Payload,
  buildInkPaintingPrompt,
  parseDashscopeImageUrl,
} from "../../../server/lib/ink-image";
import { createSupabaseAdmin } from "../../../server/lib/supabase-admin";
import { jsonResponse, optionsResponse, readJsonBody, type PagesContext } from "../../_lib/http";

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";

type ImageBody = {
  title: string;
  poetry: string;
  recordId?: string;
};

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async ({ request, env }: PagesContext) => {
  try {
    const { title, poetry, recordId } = await readJsonBody<ImageBody>(request);
    if (!title || !poetry) {
      return jsonResponse({ error: "斋心未备：缺少诗歌标题或内容" }, 400);
    }

    const dashscopeApiKey = env.DASHSCOPE_API_KEY || "";
    if (!dashscopeApiKey) {
      return jsonResponse({
        error: "图片生成服务未配置 DASHSCOPE_API_KEY",
        code: "DASHSCOPE_API_KEY_MISSING",
      }, 503);
    }

    const prompt = buildInkPaintingPrompt(title, poetry);
    const submitResponse = await fetch(`${DASHSCOPE_BASE_URL}/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${dashscopeApiKey}`,
      },
      body: JSON.stringify(buildDashscopeWan26Payload(prompt)),
    });

    if (!submitResponse.ok) {
      const detail = await submitResponse.text();
      console.error("[Image] DashScope 提交失败:", submitResponse.status, detail);
      return jsonResponse({
        error: "DashScope 图片生成失败",
        code: "DASHSCOPE_SUBMIT_FAILED",
        model: DASHSCOPE_IMAGE_MODEL,
        detail,
      }, 502);
    }

    const submitData = await submitResponse.json();
    const imageUrl = parseDashscopeImageUrl(submitData);

    if (!imageUrl) {
      console.error("[Image] 生成成功但未解析到图片 URL:", JSON.stringify(submitData));
      return jsonResponse({
        error: "DashScope 未返回可用图片 URL",
        code: "DASHSCOPE_IMAGE_URL_MISSING",
        model: DASHSCOPE_IMAGE_MODEL,
      }, 502);
    }

    const supabaseAdmin = createSupabaseAdmin(env);
    if (recordId && supabaseAdmin) {
      try {
        await (supabaseAdmin as any)
          .from("fortune_records")
          .update({ image_url: imageUrl })
          .eq("id", recordId);
      } catch (dbErr) {
        console.error("[Image] 保存图片链接至数据库失败:", dbErr);
      }
    }

    return jsonResponse({ imageUrl, model: DASHSCOPE_IMAGE_MODEL });
  } catch (error) {
    console.error("[Image] 生成失败:", error);
    return jsonResponse({
      error: "图片生成服务异常",
      code: "IMAGE_GENERATION_EXCEPTION",
    }, 500);
  }
};

export const onRequest = () => jsonResponse({ error: "Method not allowed" }, 405);


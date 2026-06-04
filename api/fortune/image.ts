import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "../_lib/supabase-admin";

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
const dashscopeApiKey = process.env.DASHSCOPE_API_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { title, poetry, recordId } = req.body || {};
    if (!title || !poetry) {
      return res.status(400).json({ error: "斋心未备：缺少诗歌标题或内容" });
    }

    const picsumUrl = `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600`;

    if (!dashscopeApiKey) {
      return res.status(200).json({ imageUrl: picsumUrl });
    }

    const prompt = `传统中国水墨画（工笔国画风格），描绘"${title}"的诗意场景。
诗句原文："${poetry}"

画面要求：
- 纯正的中国传统水墨画风格，宣纸质感
- 水墨渲染技法，墨分五色（焦、浓、重、淡、清）
- 大面积留白，计白当黑，意境深远
- 远山近水、云雾缭绕、松竹梅兰等传统国画意象
- 禅意空灵，古典雅致
- 淡墨设色，整体色调素雅清幽
- 不要出现任何文字、题字、印章、落款
- 不要出现现代元素（铁路、汽车、建筑等）
- 高品质艺术杰作，博物馆级别的中国画`;

    const submitResponse = await fetch(`${DASHSCOPE_BASE_URL}/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dashscopeApiKey}`
      },
      body: JSON.stringify({
        model: "wan2.6-t2i",
        input: {
          messages: [{ role: "user", content: [{ text: prompt }] }]
        },
        parameters: {
          size: "1280*1280",
          n: 1,
          negative_prompt: "铁路,火车轨道,现代建筑,汽车,电线杆,文字,题字,印章,落款,低质量,模糊,AI感,变形",
          prompt_extend: false,
          watermark: false
        }
      }),
    });

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.error("[Image] DashScope 提交失败:", submitResponse.status, errText);
      return res.status(200).json({ imageUrl: picsumUrl });
    }

    const submitData = await submitResponse.json() as any;
    const imageUrl = submitData.output?.choices?.[0]?.message?.content?.[0]?.image;

    if (imageUrl) {
      // Update record in Supabase if recordId provided
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
      return res.status(200).json({ imageUrl });
    } else {
      console.error("[Image] 未能解析到图片URL:", JSON.stringify(submitData));
      return res.status(200).json({ imageUrl: picsumUrl });
    }

  } catch (error) {
    console.error("[Image] 生成失败:", error);
    const title = req.body?.title || "temp";
    return res.status(200).json({ imageUrl: `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600` });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin, verifyAuth, isAuthError } from "../../_lib/supabase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

  const authResult = await verifyAuth(req.headers.authorization as string | undefined);
  if (isAuthError(authResult)) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  if (!supabaseAdmin) return res.status(503).json({ error: "数据服务暂未配置" });

  // Extract record ID from the dynamic route parameter
  const { id } = req.query;
  const recordId = Array.isArray(id) ? id[0] : id;

  if (!recordId) {
    return res.status(400).json({ error: "缺少记录 ID" });
  }

  try {
    const { error } = await supabaseAdmin
      .from("fortune_records")
      .delete()
      .eq("id", recordId)
      .eq("user_id", authResult.userId);

    if (error) {
      console.error("[History DELETE] Supabase error:", error);
      return res.status(500).json({ error: "删除记录失败" });
    }

    return res.status(200).json({ success: true, message: "占卜记录已删除" });
  } catch (err) {
    console.error("[History DELETE] Error:", err);
    return res.status(500).json({ error: "删除记录失败" });
  }
}

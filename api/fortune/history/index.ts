import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin, verifyAuth, isAuthError } from "../../_lib/supabase-admin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Auth check
  const authResult = await verifyAuth(req.headers.authorization as string | undefined);
  if (isAuthError(authResult)) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  // ── GET: Fetch user's fortune records ──
  if (req.method === "GET") {
    if (!supabaseAdmin) return res.status(200).json({ records: [] });

    try {
      const { data, error } = await supabaseAdmin
        .from("fortune_records")
        .select("*")
        .eq("user_id", authResult.userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[History GET] Supabase error:", error);
        return res.status(500).json({ error: "查询占卜记录失败" });
      }

      const records = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        poetry: row.poetry,
        category: row.category,
        categoryLabel: row.category_label,
        stamp: row.stamp,
        explanation: row.explanation,
        advice: row.advice || [],
        question: row.question,
        mentalState: row.mental_state,
        recentEvents: row.recent_events,
        imageUrl: row.image_url,
        timestamp: row.created_at,
      }));

      return res.status(200).json({ records });
    } catch (err) {
      console.error("[History GET] Error:", err);
      return res.status(500).json({ error: "获取历史记录失败" });
    }
  }

  // ── POST: Save a new fortune record ──
  if (req.method === "POST") {
    if (!supabaseAdmin) return res.status(503).json({ error: "数据服务暂未配置" });

    try {
      const { title, poetry, category, categoryLabel, stamp, explanation, advice, question, mentalState, recentEvents } = req.body || {};

      if (!title || !poetry || !stamp || !explanation) {
        return res.status(400).json({ error: "缺少必要的占卜数据字段" });
      }

      const { data, error } = await (supabaseAdmin as any)
        .from("fortune_records")
        .insert({
          user_id: authResult.userId,
          title,
          poetry,
          category: category || "general",
          category_label: categoryLabel || null,
          stamp,
          explanation,
          advice: advice || [],
          question: question || null,
          mental_state: mentalState || null,
          recent_events: recentEvents || null,
        })
        .select()
        .single();

      if (error) {
        console.error("[History POST] Supabase error:", error);
        return res.status(500).json({ error: "保存占卜记录失败" });
      }

      return res.status(200).json({
        success: true,
        record: {
          id: data?.id,
          title: data?.title,
          poetry: data?.poetry,
          category: data?.category,
          categoryLabel: data?.category_label,
          stamp: data?.stamp,
          explanation: data?.explanation,
          advice: data?.advice,
          question: data?.question,
          mentalState: data?.mental_state,
          recentEvents: data?.recent_events,
          timestamp: data?.created_at,
        },
      });
    } catch (err) {
      console.error("[History POST] Error:", err);
      return res.status(500).json({ error: "保存占卜记录失败" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

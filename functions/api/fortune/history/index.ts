import { createSupabaseAdmin, isAuthError, verifyAuth } from "../../../../server/lib/supabase-admin";
import { jsonResponse, optionsResponse, readJsonBody, type PagesContext } from "../../../_lib/http";

type FortuneRecordBody = {
  title: string;
  poetry: string;
  category?: string;
  categoryLabel?: string;
  stamp: string;
  explanation: string;
  advice?: string[];
  question?: string;
  mentalState?: string;
  recentEvents?: string;
};

export const onRequestOptions = () => optionsResponse();

export const onRequestGet = async ({ request, env }: PagesContext) => {
  const authResult = await verifyAuth(request.headers.get("Authorization"), env);
  if (isAuthError(authResult)) {
    return jsonResponse({ error: authResult.error }, authResult.status);
  }

  const supabaseAdmin = createSupabaseAdmin(env);
  if (!supabaseAdmin) return jsonResponse({ records: [] });

  try {
    const { data, error } = await supabaseAdmin
      .from("fortune_records")
      .select("*")
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[History GET] Supabase error:", error);
      return jsonResponse({ error: "查询占卜记录失败" }, 500);
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

    return jsonResponse({ records });
  } catch (err) {
    console.error("[History GET] Error:", err);
    return jsonResponse({ error: "获取历史记录失败" }, 500);
  }
};

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const authResult = await verifyAuth(request.headers.get("Authorization"), env);
  if (isAuthError(authResult)) {
    return jsonResponse({ error: authResult.error }, authResult.status);
  }

  const supabaseAdmin = createSupabaseAdmin(env);
  if (!supabaseAdmin) return jsonResponse({ error: "数据服务暂未配置" }, 503);

  try {
    const { title, poetry, category, categoryLabel, stamp, explanation, advice, question, mentalState, recentEvents } =
      await readJsonBody<FortuneRecordBody>(request);

    if (!title || !poetry || !stamp || !explanation) {
      return jsonResponse({ error: "缺少必要的占卜数据字段" }, 400);
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
      return jsonResponse({ error: "保存占卜记录失败" }, 500);
    }

    return jsonResponse({
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
    return jsonResponse({ error: "保存占卜记录失败" }, 500);
  }
};

export const onRequest = () => jsonResponse({ error: "Method not allowed" }, 405);


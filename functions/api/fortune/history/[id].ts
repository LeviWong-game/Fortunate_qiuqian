import { createSupabaseAdmin, isAuthError, verifyAuth } from "../../../../server/lib/supabase-admin";
import { jsonResponse, optionsResponse, type PagesContext } from "../../../_lib/http";

export const onRequestOptions = () => optionsResponse();

export const onRequestDelete = async ({ request, env, params }: PagesContext) => {
  const authResult = await verifyAuth(request.headers.get("Authorization"), env);
  if (isAuthError(authResult)) {
    return jsonResponse({ error: authResult.error }, authResult.status);
  }

  const supabaseAdmin = createSupabaseAdmin(env);
  if (!supabaseAdmin) return jsonResponse({ error: "数据服务暂未配置" }, 503);

  const idParam = params.id;
  const recordId = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!recordId) {
    return jsonResponse({ error: "缺少记录 ID" }, 400);
  }

  try {
    const { error } = await supabaseAdmin
      .from("fortune_records")
      .delete()
      .eq("id", recordId)
      .eq("user_id", authResult.userId);

    if (error) {
      console.error("[History DELETE] Supabase error:", error);
      return jsonResponse({ error: "删除记录失败" }, 500);
    }

    return jsonResponse({ success: true, message: "占卜记录已删除" });
  } catch (err) {
    console.error("[History DELETE] Error:", err);
    return jsonResponse({ error: "删除记录失败" }, 500);
  }
};

export const onRequest = () => jsonResponse({ error: "Method not allowed" }, 405);


import { createClient } from "@supabase/supabase-js";
import { readEnv, type RuntimeEnv } from "./env";

export type SupabaseAdmin = ReturnType<typeof createClient>;

export function createSupabaseAdmin(env?: RuntimeEnv): SupabaseAdmin | null {
  const runtimeEnv = readEnv(env);
  const supabaseUrl = runtimeEnv.SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = runtimeEnv.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function verifyAuth(
  authHeader: string | null | undefined,
  env?: RuntimeEnv
): Promise<{ userId: string } | { error: string; status: number }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "未提供有效的认证令牌", status: 401 };
  }

  const supabaseAdmin = createSupabaseAdmin(env);
  if (!supabaseAdmin) {
    return { error: "后端数据服务暂未配置", status: 503 };
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return { error: "认证令牌无效或已过期", status: 401 };
    }

    return { userId: user.id };
  } catch (err) {
    console.error("[Auth] Token verification failed:", err);
    return { error: "认证校验失败", status: 401 };
  }
}

export function isAuthError(
  result: { userId: string } | { error: string; status: number }
): result is { error: string; status: number } {
  return "error" in result;
}


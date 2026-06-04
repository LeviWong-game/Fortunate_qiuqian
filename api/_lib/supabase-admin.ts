import { createClient } from "@supabase/supabase-js";

// ============================================================
// Supabase Admin Client (Service Role — server-side only)
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { supabaseAdmin };

// ============================================================
// Auth Helper: Verify JWT from Authorization header
// ============================================================
export async function verifyAuth(authHeader: string | undefined): Promise<{ userId: string } | { error: string; status: number }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "未提供有效的认证令牌", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");

  if (!supabaseAdmin) {
    return { error: "后端数据服务暂未配置", status: 503 };
  }

  try {
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

// Type guard
export function isAuthError(result: { userId: string } | { error: string; status: number }): result is { error: string; status: number } {
  return "error" in result;
}

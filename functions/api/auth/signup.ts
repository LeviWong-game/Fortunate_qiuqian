import { jsonResponse, optionsResponse, readJsonBody, type PagesContext } from "../../_lib/http";

type SignupBody = {
  email: string;
  password: string;
  username?: string;
};

const readAuthEnv = (env: PagesContext["env"]) => {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return { supabaseUrl, supabaseAnonKey };
};

const normalizeSession = (payload: any) => {
  if (payload.session) return payload.session;
  if (!payload.access_token) return null;
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type,
    expires_in: payload.expires_in,
    expires_at: payload.expires_at,
  };
};

const readSupabaseError = (payload: any) => {
  if (!payload) return "认证服务暂时不可用";
  return payload.error_description || payload.msg || payload.message || payload.error || JSON.stringify(payload);
};

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const { email = "", password = "", username = "" } = await readJsonBody<SignupBody>(request);

  if (!email || !password) {
    return jsonResponse({ error: "缺少注册账号或密码" }, 400);
  }

  const authEnv = readAuthEnv(env);
  if (!authEnv) {
    return jsonResponse({ error: "认证服务环境变量未配置" }, 503);
  }

  try {
    const response = await fetch(`${authEnv.supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: authEnv.supabaseAnonKey,
        Authorization: `Bearer ${authEnv.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        data: { username },
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonResponse({ error: readSupabaseError(payload) }, response.status);
    }

    const session = normalizeSession(payload);
    return jsonResponse({
      user: payload.user,
      session,
      requiresEmailConfirmation: Boolean(payload.user && !session),
    });
  } catch (error) {
    console.error("[Auth Signup] Supabase signup failed:", error);
    return jsonResponse({ error: "注册服务暂时不可用" }, 502);
  }
};

export const onRequest = () => jsonResponse({ error: "Method not allowed" }, 405);

import { createClient } from "@supabase/supabase-js";
import { jsonResponse, optionsResponse, readJsonBody, type PagesContext } from "../../_lib/http";

type LoginBody = {
  email: string;
  password: string;
};

const createAuthClient = (env: PagesContext["env"]) => {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const { email = "", password = "" } = await readJsonBody<LoginBody>(request);

  if (!email || !password) {
    return jsonResponse({ error: "缺少登录账号或密码" }, 400);
  }

  const supabase = createAuthClient(env);
  if (!supabase) {
    return jsonResponse({ error: "认证服务环境变量未配置" }, 503);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("[Auth Login] Supabase login failed:", error);
    return jsonResponse({ error: "登录服务暂时不可用" }, 502);
  }
};

export const onRequest = () => jsonResponse({ error: "Method not allowed" }, 405);


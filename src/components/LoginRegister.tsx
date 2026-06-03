import React, { useState } from "react";
import { User, Lock, Sparkles, Compass, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { User as UserType } from "../types";
import { supabase } from "../lib/supabase";

interface LoginRegisterProps {
  onSuccess: (user: UserType, message: string) => void;
  onSkip?: () => void;
}

export default function LoginRegister({ onSuccess, onSkip }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Convert username to a pseudo-email for Supabase Auth (which requires email).
  // Non-ASCII characters (e.g. Chinese) are hex-encoded so the email local-part
  // contains only valid ASCII characters that Supabase will accept.
  const usernameToEmail = (name: string) => {
    const encoded = encodeURIComponent(name.toLowerCase().replace(/\s+/g, "_"))
      .replace(/%/g, "x"); // replace % with 'x' to form a clean alphanumeric local-part
    return `${encoded}@zenfortune.local`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setErrorMsg("斋号及护法言咒不可空缺");
      return;
    }

    if (cleanUser.length < 3) {
      setErrorMsg("修行斋号不可少于3位字符");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("护法神咒长度不能少于6位半音符");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setErrorMsg("两次吟诵的护法神咒不相契合");
      return;
    }

    setIsLoading(true);

    try {
      const email = usernameToEmail(cleanUser);

      if (isLogin) {
        // --- Login via Supabase Auth ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Translate common Supabase auth errors to Chinese
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("斋号或护法神咒有误，请检查后重试");
          }
          throw new Error(error.message);
        }

        if (data.user && data.session) {
          const user: UserType = {
            id: data.user.id,
            username: cleanUser,
            email: data.user.email,
            token: data.session.access_token,
            createdAt: data.user.created_at,
          };
          setSuccessMsg("登坛成功！灵智已通");
          setTimeout(() => {
            onSuccess(user, "登坛成功，灵通自在。");
          }, 800);
        }
      } else {
        // --- Register via Supabase Auth ---
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: cleanUser, // Store display name in user metadata
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered") || error.message.includes("already been registered")) {
            throw new Error("此斋号已被占，请重立斋号");
          }
          throw new Error(error.message);
        }

        if (data.user && data.session) {
          // Auto-login after registration (Supabase signUp returns a session when email confirmation is disabled)
          const user: UserType = {
            id: data.user.id,
            username: cleanUser,
            email: data.user.email,
            token: data.session.access_token,
            createdAt: data.user.created_at,
          };
          setSuccessMsg("开册登记成功！正在登坛和入...");
          setTimeout(() => {
            onSuccess(user, "开册成功并已顺利引流登固！");
          }, 1200);
        } else if (data.user && !data.session) {
          // Email confirmation required scenario
          setSuccessMsg("开册登记成功！请登录以进入禅室。");
          setTimeout(() => {
            setIsLogin(true);
            setSuccessMsg(null);
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(err.message || "天机震荡，校验未达，请稍后再度重试。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-parchment border border-parchment-dim rounded-2xl p-6 md:p-8 shadow-xl max-w-md mx-auto space-y-6 relative overflow-hidden">
      {/* Decorative Stamp Background */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-vermilion/5 rounded-full pointer-events-none border border-vermilion/10 flex items-center justify-center rotate-12">
        <span className="font-serif text-6xl text-vermilion/10 font-bold">禅</span>
      </div>
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-accent-gold/5 rounded-full pointer-events-none border border-accent-gold/10 flex items-center justify-center -rotate-12">
        <span className="font-serif text-5xl text-accent-gold/10 font-bold">运</span>
      </div>

      {/* Header and Branding */}
      <div className="text-center space-y-2 relative z-10">
        <div className="inline-flex p-3 bg-vermilion/5 border border-vermilion/20 rounded-full text-vermilion mb-1">
          <Compass className="w-8 h-8 animate-[spin_40s_linear_infinite]" />
        </div>
        <h2 className="font-serif text-2xl font-bold tracking-wider text-deep-ink">
          {isLogin ? "禅运天机 • 登坛归位" : "落笔开册 • 立契记功"}
        </h2>
        <p className="text-xs text-deep-ink/50 max-w-xs mx-auto leading-relaxed">
          {isLogin 
            ? "吟诵斋号神咒，呼引宿世祈愿功德，开启灵识清明之旅" 
            : "立一方法号，开一册功德，将乾坤福缘妥帖印刻于因果大网中"}
        </p>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-parchment-dim pb-0.5 relative z-10">
        <button
          onClick={() => {
            setIsLogin(true);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 py-2 text-xs font-bold tracking-wider uppercase border-b-2 transition-all duration-300 ${
            isLogin 
              ? "border-vermilion text-vermilion font-serif font-bold text-[13px]" 
              : "border-transparent text-deep-ink/40 hover:text-deep-ink/70"
          }`}
        >
          登 坛 入 殿 (登录)
        </button>
        <button
          onClick={() => {
            setIsLogin(false);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`flex-1 py-2 text-xs font-bold tracking-wider uppercase border-b-2 transition-all duration-300 ${
            !isLogin 
              ? "border-vermilion text-vermilion font-serif font-bold text-[13px]" 
              : "border-transparent text-deep-ink/40 hover:text-deep-ink/70"
          }`}
        >
          落 笔 登记 (注册)
        </button>
      </div>

      {/* Message System */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200/50 rounded-xl p-3 flex gap-2 items-start text-xs text-red-900 relative z-10">
          <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed font-sans">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200/50 rounded-xl p-3 flex gap-2 items-start text-xs text-emerald-900 relative z-10">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5 animate-pulse" />
          <p className="leading-relaxed font-sans font-medium">{successMsg}</p>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        {/* Username */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-widest text-deep-ink/60 block font-serif">
            修行斋号 (账号名)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-deep-ink/30">
              <User className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入您的独特名号，字少而意远"
              className="w-full bg-white/70 border border-parchment-dim rounded-xl pl-10 pr-4 py-2.5 text-xs text-deep-ink placeholder-deep-ink/30 focus:outline-none focus:ring-1 focus:ring-vermilion focus:border-vermilion transition-all duration-300 font-sans"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-widest text-deep-ink/60 block font-serif">
            护法神咒 (密码)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-deep-ink/30">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入起护身作用的灵力密码"
              className="w-full bg-white/70 border border-parchment-dim rounded-xl pl-10 pr-4 py-2.5 text-xs text-deep-ink placeholder-deep-ink/30 focus:outline-none focus:ring-1 focus:ring-vermilion focus:border-vermilion transition-all duration-300"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password Repeat (Register only) */}
        {!isLogin && (
          <div className="space-y-1 animate-fadeIn duration-300">
            <label className="text-[11px] font-bold uppercase tracking-widest text-deep-ink/60 block font-serif">
              确认神咒 (确认密码)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-deep-ink/30">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次默念校验您所设立的神咒"
                className="w-full bg-white/70 border border-parchment-dim rounded-xl pl-10 pr-4 py-2.5 text-xs text-deep-ink placeholder-deep-ink/30 focus:outline-none focus:ring-1 focus:ring-vermilion focus:border-vermilion transition-all duration-300"
                required
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-vermilion font-semibold tracking-widest text-white rounded-xl text-xs py-3 px-4 hover:bg-vermilion/90 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 shadow focus:outline-none disabled:bg-vermilion/60 disabled:pointer-events-none cursor-pointer mt-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>灵力感应中...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{isLogin ? "登坛通识 (立即登录)" : "开册立卷 (注册并登录)"}</span>
            </>
          )}
        </button>
      </form>

      {/* Guest Skip Toggle */}
      {onSkip && (
        <div className="text-center pt-2 relative z-10 border-t border-parchment-dim/40">
          <button
            onClick={onSkip}
            type="button"
            className="text-xs text-deep-ink/40 hover:text-deep-ink/70 flex items-center justify-center gap-1 mx-auto py-1 px-3 rounded-lg hover:bg-parchment-dim/20 transition-all cursor-pointer"
          >
            <span>无名法缘，游客通入</span>
            <ArrowRight className="w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

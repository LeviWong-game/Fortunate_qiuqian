import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

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
  console.log("[ZenFortune] Supabase Admin 客户端初始化成功。");
} else {
  console.warn(
    "[ZenFortune] 未配置 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。历史记录 API 将返回空数据。"
  );
}

// ============================================================
// Auth Middleware: Extract and verify JWT from Authorization header
// ============================================================
interface AuthenticatedRequest extends express.Request {
  userId?: string;
}

async function authMiddleware(
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未提供有效的认证令牌" });
  }

  const token = authHeader.replace("Bearer ", "");

  if (!supabaseAdmin) {
    return res.status(503).json({ error: "后端数据服务暂未配置" });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "认证令牌无效或已过期" });
    }

    req.userId = user.id;
    next();
  } catch (err) {
    console.error("[Auth Middleware] Token verification failed:", err);
    return res.status(401).json({ error: "认证校验失败" });
  }
}

// ============================================================
// Preset Slips for fallbacks and reference seeding
// ============================================================
const PRESET_SLIPS = [
  {
    title: "飞龙在天",
    poetry: "飞龙升天指云端，前程万里金光灿。顺风扬帆无阻碍，万事胜意展宏图。",
    meaning: "龙乘风云登九天，运势如日中天，是顺势腾飞之时。莫疑莫虑，果断出击。",
    stamp: "上吉",
    advice: "把握大好时机，锐意进取，在事业或目标上大胆突破。若有重要决定，此日正逢其时。多与德高望重之长辈交流，能获高远提点。"
  },
  {
    title: "静水流深",
    poetry: "清浅溪流终汇海，风平浪静涵虚空。守志笃行无躁动，水滴石穿神自通。",
    meaning: "水看似静谧而潜流万丈，象征蓄势待发之定力。不宜急躁，静气安神方能突破。",
    stamp: "中平",
    advice: "保持内心的从容和淡定。今天不宜强求表面显眼的成就，而是将精力倾注在打磨内在基本功和细节上。稳扎稳打胜过任何投机。"
  },
  {
    title: "拨云见日",
    poetry: "乌云密布遮天日，忽来狂风扫阴霾。青山隐隐今重现，万里晴空瑞气开。",
    meaning: "历经百转千回与重重迷雾，今日困局终解，光明与真相逐渐显见。苦尽甘来意境深远。",
    stamp: "上吉",
    advice: "过往的疑惑正在消散，勇敢面对曾经搁置的课题。相信自己的清明智慧与决断，当下是化干戈为玉帛、豁然开朗的绝佳节点。"
  },
  {
    title: "雪里红梅",
    poetry: "寒冬腊月雪纷纷，一枝红梅傲霜立。虽经风雪摧残苦，幽香阵阵透重门。",
    meaning: "虽处于冰天雪地的孤冷境界，然梅傲霜雪自散芬芳，坚忍越深，往后福报越厚。",
    stamp: "中平",
    advice: "不可半途而废。眼前的些许阻碍、误会或辛劳是命运雕琢你的试金石。以极大的耐心与坚守静候风雪化开，胜利必将属于坚守者。"
  },
  {
    title: "桃李春风",
    poetry: "春回大地万物苏，桃李争妍满园香。和风细雨拂面过，得道多助行通庄。",
    meaning: "春日温阳普照，欣欣向荣。人际交往如沐春风，常得意外贵人之力与同伴之真心。",
    stamp: "上吉",
    advice: "多进行善意的人际拓展。无论感情、事业、亦或精神交流，以诚待人必得积极呼应。与他人的良性合作会带来超出想象的喜悦与进展。"
  },
  {
    title: "鱼跃龙门",
    poetry: "波涛汹涌起狂澜，金鳞一跃上青天。脱胎换骨从此始，名声显赫耀家园。",
    meaning: "历经惊涛拍岸与自我淬炼，终迎来改头换面之质变升腾。是功名及第、身份跨越之吉兆。",
    stamp: "上上",
    advice: "这是挑战不可能的时刻，切莫妄自菲薄。哪怕感到有如跨鸿沟般的压力，也要全力拼搏。一旦飞越这层阻碍，便是坦途万里的崭新人生。"
  },
  {
    title: "暗香疏影",
    poetry: "暮色黄昏弄清影，暗香浮动月黄昏。随缘安分自清雅，何须争逐世间尘。",
    meaning: "不求招摇过市，而自有幽雅香气引人注目。随缘静守，恬淡自得，大有隐逸清高之妙。",
    stamp: "中平",
    advice: "适合把核心精力放于艺术、修心理气、整理内修。不要卷入无谓的功利争端或凡俗攀比。顺应本心，你的出众气质自会照亮该照亮之人。"
  },
  {
    title: "寒潭独钓",
    poetry: "千山鸟飞皆寂灭，万径人踪已绝迹。清冷寒天一孤棹，独钓自在不染泥。",
    meaning: "万境归于定寂静，冷眼旁观，独享那份不染浊世的孤高与清闲，亦是修习不退转心极佳时机。",
    stamp: "中平",
    advice: "静守、自省、蓄力。如果环境或者外缘看起来不太热烈响应，那就顺应安静，这也是净化磁场、回归自性的高明机缘。避开杂乱的信息和人群。"
  }
];

// Map categories to terms
const CATEGORY_MAP: Record<string, string> = {
  career: "事业（道路与目标）",
  love: "爱情（心灵与羁绊）",
  wealth: "财富（运势与福报）",
  health: "健康（身体与精神）",
  general: "综合（人生命运）"
};

// ============================================================
// Initialize DeepSeek Client (OpenAI-compatible SDK)
// ============================================================
let deepseek: OpenAI | null = null;
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";

if (deepseekApiKey) {
  try {
    deepseek = new OpenAI({
      apiKey: deepseekApiKey,
      baseURL: "https://api.deepseek.com",
    });
    console.log("[ZenFortune] DeepSeek V4 Flash 客户端初始化成功。");
  } catch (error) {
    console.error("[ZenFortune] DeepSeek 初始化失败，将使用本地预设签文：", error);
  }
} else {
  console.log("[ZenFortune] 未配置 DEEPSEEK_API_KEY。诗词运势将使用本地预设签文引擎。");
}

// ============================================================
// Initialize DashScope (通义万相) config
// ============================================================
const dashscopeApiKey = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";

if (dashscopeApiKey) {
  console.log("[ZenFortune] 通义万相 (DashScope) API Key 已配置，水墨画生成已就绪。");
} else {
  console.log("[ZenFortune] 未配置 DASHSCOPE_API_KEY。图片生成将使用占位图片。");
}

// ============================================================
// Fortune History API (Supabase-backed)
// ============================================================

// GET /api/fortune/history — Fetch user's fortune records
app.get("/api/fortune/history", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  if (!supabaseAdmin) {
    return res.json({ records: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("fortune_records")
      .select("*")
      .eq("user_id", req.userId!)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[History GET] Supabase query error:", error);
      return res.status(500).json({ error: "查询占卜记录失败" });
    }

    // Transform DB records to frontend FortuneResult format
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

    return res.json({ records });
  } catch (err) {
    console.error("[History GET] Error:", err);
    return res.status(500).json({ error: "获取历史记录失败" });
  }
});

// POST /api/fortune/history — Save a new fortune record
app.post("/api/fortune/history", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "数据服务暂未配置" });
  }

  try {
    const { title, poetry, category, categoryLabel, stamp, explanation, advice, question, mentalState, recentEvents } = req.body;

    if (!title || !poetry || !stamp || !explanation) {
      return res.status(400).json({ error: "缺少必要的占卜数据字段" });
    }

    const { data, error } = await (supabaseAdmin as any)
      .from("fortune_records")
      .insert({
        user_id: req.userId!,
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
      console.error("[History POST] Supabase insert error:", error);
      return res.status(500).json({ error: "保存占卜记录失败" });
    }

    return res.json({
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
});

// DELETE /api/fortune/history/clear — Delete all user's fortune records
app.delete("/api/fortune/history/clear", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "数据服务暂未配置" });
  }

  try {
    const { error } = await supabaseAdmin
      .from("fortune_records")
      .delete()
      .eq("user_id", req.userId!);

    if (error) {
      console.error("[History CLEAR] Supabase delete error:", error);
      return res.status(500).json({ error: "清空记录失败" });
    }

    return res.json({ success: true, message: "所有占卜记录已清空" });
  } catch (err) {
    console.error("[History CLEAR] Error:", err);
    return res.status(500).json({ error: "清空记录失败" });
  }
});

// DELETE /api/fortune/history/:id — Delete a specific fortune record
app.delete("/api/fortune/history/:id", authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: "数据服务暂未配置" });
  }

  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("fortune_records")
      .delete()
      .eq("id", id)
      .eq("user_id", req.userId!);

    if (error) {
      console.error("[History DELETE] Supabase delete error:", error);
      return res.status(500).json({ error: "删除记录失败" });
    }

    return res.json({ success: true, message: "占卜记录已删除" });
  } catch (err) {
    console.error("[History DELETE] Error:", err);
    return res.status(500).json({ error: "删除记录失败" });
  }
});

// ============================================================
// REST route for generating fortune details
// Uses DeepSeek V4 Flash with two-stage role play:
//   Stage 1 — 占卜师 (Fortune Teller): divination analysis, stamp, advice
//   Stage 2 — 诗人 (Poet): compose a matching seven-character quatrain
// ============================================================
app.post("/api/fortune/generate", async (req, res) => {
  const { category = "general", question = "", mentalState = "", recentEvents = "" } = req.body;
  const categoryCh = CATEGORY_MAP[category] || CATEGORY_MAP.general;

  // Pick a base seed slip randomly to supply flavor or to use as safe fallback
  const randomSeed = PRESET_SLIPS[Math.floor(Math.random() * PRESET_SLIPS.length)];

  // If DeepSeek is not set up, return a beautiful dynamically personalized response based on the Preset Seeds
  if (!deepseek) {
    console.log("[ZenFortune] DeepSeek 离线。使用本地预设签文引擎...");
    const tailors = [
      { prefix: "目下时序交替，", suffix: "如晨雾般徐徐消散，明哲自守即行通坦。" },
      { prefix: "静观天象流转，", suffix: "在深沉内省中，机缘已经于无形中滋长，唯待春雷一声惊醒。" },
      { prefix: "乾坤有常，行藏有度。", suffix: "顺应内在感召，当下的细微波动是福非祸，静心则明智自生。" }
    ];
    const tailor = tailors[Math.floor(Math.random() * tailors.length)];

    let personalizedExp = `【针对 精神心境 & 近期遭遇 卦象测算预测】:\n`;
    if (mentalState.trim() || recentEvents.trim()) {
      personalizedExp += `您当前持守着"${mentalState || "平和常态"}"之精神状态，近期经历了"${recentEvents || "冷暖自知"}"的因缘吉凶。呼应《${randomSeed.title}》之卦象，在未来的预测中，您将面临由繁入简、否极泰来的格局。可能会有拨开迷雾、机缘汇聚的好事发生。请务必澄净身心，从容调节。正如签诗所云："${randomSeed.poetry}"。`;
    } else if (question.trim()) {
      personalizedExp += `您所探问的"${question}"一事。当前兆示映照着《${randomSeed.title}》之签。${tailor.prefix}${randomSeed.meaning}此问犹如竹影扫阶尘不动，世事流转随遇而安。正如签诗所云："${randomSeed.poetry}"。${tailor.suffix}`;
    } else {
      personalizedExp += `近期您的${categoryCh}宏观气运正投射着《${randomSeed.title}》之象。${randomSeed.meaning}保持虚静灵台，顺道顺理，大吉自至。`;
    }

    return res.json({
      title: randomSeed.title,
      poetry: randomSeed.poetry,
      category,
      categoryLabel: CATEGORY_MAP[category],
      stamp: randomSeed.stamp,
      explanation: personalizedExp,
      advice: [
        "心理自我调节：端坐静思，深吸慢呼，于呼吸吐纳间将情绪杂染排出乾坤，稳住信念本真。",
        randomSeed.advice,
        "身心自律指引：远离不必要的喧嚣争执，近期以守为主，退一步海阔天空，顺应自然节律。"
      ]
    });
  }

  // ============================================================
  // DeepSeek V4 Flash — Two-Stage Role Play
  // ============================================================
  try {
    // ────────────────────────────────────────────────────────────
    // Stage 1: 占卜师 / 算命师 — Fortune Teller
    // ────────────────────────────────────────────────────────────
    const fortuneTellerSystemPrompt = `你是一位德高望重、名满天下的华夏占卜宗师与算命师，法号"玄清真人"。
你精通梅花易数、六爻八卦、紫微斗数、奇门遁甲等传统命理术数，同时具备深厚的禅宗修养和心理疗愈智慧。
你的占卜风格沉稳厚重、妙语如珠，既有精准的命理判断，又有温暖人心的禅意开导。

你的核心职责：
1. 根据用户的问题、心境和近期遭遇，进行深度的命理推演和吉凶预测
2. 提取或自拟一个4字签题（如"飞龙在天"、"静水流深"、"桃李春风"）
3. 判定气运评级签章（只能从以下选择：上上、大吉、上吉、中吉、中平、下平、下下）
4. 撰写一段180-250字的深度运势推演（必须结合用户心境和遭遇进行针对性预测）
5. 提供3条具体的自我调节与身心修养建议

你必须严格以 JSON 格式返回，不含任何其他文字：
{
  "title": "四字签题",
  "stamp": "气运签章",
  "explanation": "深度运势推演文本...",
  "advice": ["建议一：...", "建议二：...", "建议三：..."]
}`;

    const fortuneTellerUserPrompt = `当前占卜主题：【${categoryCh}】

用户状况：
- 心中疑虑或具体提问：【${question || "未明确求问，祈求本命大势解惑"}】
- 当前精神或情绪心境：【${mentalState || "平和安宁、静候缘起"}】
- 近期遭遇的吉凶事件：【${recentEvents || "百态如常，无突出变故"}】

请运用你的命理智慧，为用户进行深度占卜推演。`;

    console.log("[ZenFortune] 第一阶段：占卜师角色 — 运势推演...");
    const fortuneResponse = await deepseek.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: fortuneTellerSystemPrompt },
        { role: "user", content: fortuneTellerUserPrompt },
      ],
      temperature: 0.85,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const fortuneText = fortuneResponse.choices[0]?.message?.content?.trim() || "";
    console.log("[ZenFortune] 占卜师返回结果解析中...");
    const fortuneResult = JSON.parse(fortuneText);

    // ────────────────────────────────────────────────────────────
    // Stage 2: 诗人 / 词人 — Poet
    // ────────────────────────────────────────────────────────────
    const poetSystemPrompt = `你是一位造诣精深的古典诗词大家，号"墨痕居士"。
你精通唐诗宋词的格律声韵，尤其擅长七言绝句的创作。
你的诗词风格兼具李白的飘逸洒脱、杜甫的深沉厚重、王维的禅意空灵。

你的核心职责：
根据给定的签题和运势意境，创作一首优美典雅、格律工整的四句七言绝句（共28字）。

创作要求：
1. 必须是四句七言（每句7个汉字，共28字）
2. 必须符合七言绝句的基本平仄韵律，朗朗上口
3. 意境必须契合签题的气质与运势主题
4. 用词典雅古朴，避免白话和现代词汇
5. 只需返回诗句本身，四句诗用逗号和句号分隔，不含其他文字`;

    const poetUserPrompt = `签题：【${fortuneResult.title || randomSeed.title}】
运势意境：【${fortuneResult.explanation?.substring(0, 100) || randomSeed.meaning}】
气运评级：【${fortuneResult.stamp || randomSeed.stamp}】

请为此签题创作一首匹配的七言绝句。只返回诗句本身。`;

    console.log("[ZenFortune] 第二阶段：诗人角色 — 七言绝句创作...");
    const poetResponse = await deepseek.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: poetSystemPrompt },
        { role: "user", content: poetUserPrompt },
      ],
      temperature: 0.92,
      max_tokens: 200,
    });

    const poetry = poetResponse.choices[0]?.message?.content?.trim() || randomSeed.poetry;
    console.log("[ZenFortune] 诗人创作完成。");

    return res.json({
      title: fortuneResult.title || randomSeed.title,
      poetry: poetry,
      category,
      categoryLabel: CATEGORY_MAP[category],
      stamp: fortuneResult.stamp || randomSeed.stamp,
      explanation: fortuneResult.explanation || randomSeed.meaning,
      advice: fortuneResult.advice && fortuneResult.advice.length > 0 ? fortuneResult.advice : [randomSeed.advice]
    });

  } catch (error) {
    console.error("[ZenFortune] DeepSeek 调用失败，回退到本地预设签文：", error);
    // Secure fallback delivery
    return res.json({
      title: randomSeed.title,
      poetry: randomSeed.poetry,
      category,
      categoryLabel: CATEGORY_MAP[category],
      stamp: randomSeed.stamp,
      explanation: `【因缘投射，神清志合】\n基于用户当前的情绪心境(${mentalState || "平常心"})与近期的境遇(${recentEvents || "常规琐事"})，当下的因缘投合了这面《${randomSeed.title}》古签。未来气运在起伏中趋向清明。只要注意静心克己、减少焦躁，未来的小纠葛都会如风刮浮云般退散消融，逐步获得福缘好事。`,
      advice: [
        "心理自我调节：调匀呼吸，于安宁中觉察当下的起心动念，不急流，不攀缘。",
        "静气克己：遇到外界的摩擦或喜事，克制自己的情绪冲动，保持淡泊以自重。",
        "正念回向：在心底祝福所遇到的每一个人，以广阔无私的布施精神破除执念，增添气运。"
      ]
    });
  }
});

// ============================================================
// REST route for generating a matching visual scene
// Uses 通义万相 (Qwen Image / DashScope) wan2.7-image-pro model
// ============================================================
app.post("/api/fortune/image", async (req, res) => {
  try {
    const { title, poetry, recordId } = req.body;
    if (!title || !poetry) {
      return res.status(400).json({ error: "斋心未备：缺少诗歌标题或内容" });
    }

    // High resolution aesthetic background backup image
    const picsumUrl = `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600`;

    if (!dashscopeApiKey) {
      console.log("[ZenFortune Image] DashScope 未配置。使用占位图片。");
      return res.json({ imageUrl: picsumUrl });
    }

    console.log(`[ZenFortune Image] 通义万相生成中: "${title}"`);

    const prompt = `一幅传统中国水墨画（国画山水风格），表达"${title}"的精神意境："${poetry}"。
要求：
- 清雅的水墨笔触，大量留白（计白当黑）
- 氤氲的雾气、远山近水、松竹梅兰等传统意象
- 禅意空灵，意境深远
- 淡彩点缀，整体色调素雅
- 高品质艺术杰作风格`;

    // ── Submit generation task (Synchronous) ──
    const submitResponse = await fetch(`${DASHSCOPE_BASE_URL}/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dashscopeApiKey}`
      },
      body: JSON.stringify({
        model: "qwen-image-2.0-pro",
        input: {
          messages: [
            {
              role: "user",
              content: [
                { text: prompt }
              ]
            }
          ]
        },
        parameters: {
          size: "1024*1024",
          n: 1,
        }
      }),
    });

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.error("[ZenFortune Image] DashScope 提交失败:", submitResponse.status, errText);
      return res.json({ imageUrl: picsumUrl });
    }

    const submitData = await submitResponse.json() as any;
    
    // Parse the Qwen-Image-2.0 synchronous response structure
    const imageUrl = submitData.output?.choices?.[0]?.message?.content?.[0]?.image;

    if (imageUrl) {
      console.log(`[ZenFortune Image] 水墨画生成成功！`);
      
      // Update the record in Supabase if recordId is provided
      if (recordId && supabaseAdmin) {
        try {
          await (supabaseAdmin as any)
            .from("fortune_records")
            .update({ image_url: imageUrl })
            .eq("id", recordId);
          console.log(`[ZenFortune Image] 成功将图片链接更新至数据库，记录 ID: ${recordId}`);
        } catch (dbErr) {
          console.error("[ZenFortune Image] 保存图片链接至数据库失败:", dbErr);
        }
      }

      return res.json({ imageUrl });
    } else {
      console.error("[ZenFortune Image] 生成成功但未能解析到图片URL:", JSON.stringify(submitData));
      return res.json({ imageUrl: picsumUrl });
    }

  } catch (error) {
    console.error("[ZenFortune Image] 生成失败:", error);
    const title = req.body.title || "temp";
    return res.json({ imageUrl: `https://picsum.photos/seed/${encodeURIComponent(title)}/600/600` });
  }
});

// ============================================================
// Configure Vite middleware or production build output mapping
// ============================================================
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Integrating Vite server as middleware for premium hybrid dynamic development experience.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Serving static production build assets from directory: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ZenFortune Server Running] Local: http://localhost:${PORT}`);
  });
}

configureServer().catch((err) => {
  console.error("Failed to boot full-stack Express server:", err);
});

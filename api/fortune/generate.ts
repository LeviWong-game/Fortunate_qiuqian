import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deepseek } from "./_lib/deepseek";
import { PRESET_SLIPS, CATEGORY_MAP } from "./_lib/preset-slips";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { category = "general", question = "", mentalState = "", recentEvents = "" } = req.body || {};
  const categoryCh = CATEGORY_MAP[category] || CATEGORY_MAP.general;
  const randomSeed = PRESET_SLIPS[Math.floor(Math.random() * PRESET_SLIPS.length)];

  // ── No DeepSeek → local preset fallback ──
  if (!deepseek) {
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

    return res.status(200).json({
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

  // ── DeepSeek V4 Flash — Two-Stage Role Play ──
  try {
    // Stage 1: Fortune Teller
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
    const fortuneResult = JSON.parse(fortuneText);

    // Stage 2: Poet
    const poetSystemPrompt = `你是一位造诣精深的古典诗词大家，号"墨痕居士"。
你精通唐诗宋词的格律声韵，尤其擅长七言绝句的创作。
你的诗词风格兼具李白的飘逸洒脱、杜甫的深沉厚重、王维的禅意空灵。

你的核心职责：
根据给定的签题和运势意境，创作一首优美典雅、格律工整的四句七言绝句（共28字）。

创作要求：
1. 必须是四句七言（每句恰好7个汉字，共28个汉字）
2. 必须符合七言绝句的基本平仄韵律，朗朗上口
3. 意境必须契合签题的气质与运势主题
4. 用词典雅古朴，避免白话和现代词汇
5. 格式要求：四句诗之间用逗号或句号分隔，第二句末用逗号，第四句末用句号
6. 只返回28个汉字的诗句本身加标点，绝对不要返回标题、解释、或任何其他多余内容`;

    const poetUserPrompt = `签题：【${fortuneResult.title || randomSeed.title}】
运势意境：【${fortuneResult.explanation?.substring(0, 100) || randomSeed.meaning}】
气运评级：【${fortuneResult.stamp || randomSeed.stamp}】

请为此签题创作一首匹配的七言绝句。严格只返回四句诗（28个汉字加标点），不要有任何其他文字。`;

    const poetResponse = await deepseek.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: poetSystemPrompt },
        { role: "user", content: poetUserPrompt },
      ],
      temperature: 0.85,
      max_tokens: 300,
    });

    let poetry = poetResponse.choices[0]?.message?.content?.trim() || randomSeed.poetry;
    poetry = poetry.replace(/^[""\"《》\s]+/, "").replace(/[""\"《》\s]+$/, "");
    if (poetry.length > 60) {
      const match = poetry.match(/[\u4e00-\u9fff]{7}[，,][\u4e00-\u9fff]{7}[。，,][\u4e00-\u9fff]{7}[，,][\u4e00-\u9fff]{7}[。]/);
      if (match) poetry = match[0];
    }

    return res.status(200).json({
      title: fortuneResult.title || randomSeed.title,
      poetry,
      category,
      categoryLabel: CATEGORY_MAP[category],
      stamp: fortuneResult.stamp || randomSeed.stamp,
      explanation: fortuneResult.explanation || randomSeed.meaning,
      advice: fortuneResult.advice?.length > 0 ? fortuneResult.advice : [randomSeed.advice]
    });

  } catch (error) {
    console.error("[ZenFortune] DeepSeek 调用失败，回退到本地预设签文：", error);
    return res.status(200).json({
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
}

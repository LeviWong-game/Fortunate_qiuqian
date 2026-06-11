import { createDeepSeekChatCompletion } from "../../../server/lib/deepseek";
import { CATEGORY_MAP, PRESET_SLIPS } from "../../../server/lib/preset-slips";
import { jsonResponse, optionsResponse, readJsonBody, type PagesContext } from "../../_lib/http";

type GenerateBody = {
  category: string;
  question: string;
  mentalState: string;
  recentEvents: string;
};

export const onRequestOptions = () => optionsResponse();

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const {
    category = "general",
    question = "",
    mentalState = "",
    recentEvents = "",
  } = await readJsonBody<GenerateBody>(request);

  const categoryCh = CATEGORY_MAP[category] || CATEGORY_MAP.general;
  const randomSeed = PRESET_SLIPS[Math.floor(Math.random() * PRESET_SLIPS.length)];

  const localFallback = () => {
    const tailors = [
      { prefix: "目下时序交替，", suffix: "如晨雾般徐徐消散，明哲自守即行通坦。" },
      { prefix: "静观天象流转，", suffix: "在深沉内省中，机缘已经于无形中滋长，唯待春雷一声惊醒。" },
      { prefix: "乾坤有常，行藏有度。", suffix: "顺应内在感召，当下的细微波动是福非祸，静心则明智自生。" },
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

    return {
      title: randomSeed.title,
      poetry: randomSeed.poetry,
      category,
      categoryLabel: CATEGORY_MAP[category],
      stamp: randomSeed.stamp,
      explanation: personalizedExp,
      advice: [
        "心理自我调节：端坐静思，深吸慢呼，于呼吸吐纳间将情绪杂染排出乾坤，稳住信念本真。",
        randomSeed.advice,
        "身心自律指引：远离不必要的喧嚣争执，近期以守为主，退一步海阔天空，顺应自然节律。",
      ],
    };
  };

  if (!env.DEEPSEEK_API_KEY) {
    return jsonResponse(localFallback());
  }

  try {
    const systemPrompt = `你是一位德高望重、名满天下的华夏占卜宗师与古典诗词大家。
你精通梅花易数等传统命理术数，同时擅长七言绝句的创作。

你的核心职责：
1. 根据用户的问题、心境和近期遭遇，进行深度的命理推演和吉凶预测
2. 提取或自拟一个4字签题（如"飞龙在天"、"静水流深"）
3. 判定气运评级签章（只能从以下选择：上上、大吉、上吉、中吉、中平、下平、下下）
4. 撰写一段180-250字的深度运势推演（必须结合用户心境和遭遇进行针对性预测）
5. 提供3条具体的自我调节与身心修养建议
6. 根据签题和运势意境，创作一首优美典雅、格律工整的四句七言绝句（共28字，加标点）。

你必须严格以 JSON 格式返回，不含任何其他文字：
{
  "title": "四字签题",
  "stamp": "气运签章",
  "poetry": "七言绝句诗文...",
  "explanation": "深度运势推演文本...",
  "advice": ["建议一：...", "建议二：...", "建议三：..."]
}`;

    const userPrompt = `当前占卜主题：【${categoryCh}】

用户状况：
- 心中疑虑或具体提问：【${question || "未明确求问，祈求本命大势解惑"}】
- 当前精神或情绪心境：【${mentalState || "平和安宁、静候缘起"}】
- 近期遭遇的吉凶事件：【${recentEvents || "百态如常，无突出变故"}】

请运用你的命理智慧与诗词造诣，为用户进行深度占卜推演并赋诗。`;

    const completion = await createDeepSeekChatCompletion(env, {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim() || "{}";
    const result = JSON.parse(responseText);
    const poetry = (result.poetry || randomSeed.poetry).replace(/^[""\"《》\s]+/, "").replace(/[""\"《》\s]+$/, "");

    return jsonResponse({
      title: result.title || randomSeed.title,
      poetry,
      category,
      categoryLabel: CATEGORY_MAP[category],
      stamp: result.stamp || randomSeed.stamp,
      explanation: result.explanation || randomSeed.meaning,
      advice: result.advice?.length > 0 ? result.advice : [randomSeed.advice],
    });
  } catch (error) {
    console.error("[ZenFortune] DeepSeek 调用失败，回退到本地预设签文：", error);
    return jsonResponse(localFallback());
  }
};

export const onRequest = () => jsonResponse({ error: "Method not allowed" }, 405);


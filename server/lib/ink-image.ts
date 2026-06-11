export const DASHSCOPE_IMAGE_MODEL = "wan2.6-t2i";

const motifRules: Array<[RegExp, string]> = [
  [/波|涛|浪|潮|澜|海|江|河|水|溪|泉/, "水势、江河、波澜"],
  [/鱼|鳞|龙门|龙/, "鱼跃龙门、鳞光破浪"],
  [/山|峰|岭|崖|峦/, "远山层峦、山势留白"],
  [/云|雾|烟|霞|霭/, "云烟雾霭、虚实相生"],
  [/月|星|夜|灯|烛/, "月色清辉、夜景幽微"],
  [/日|曦|晨|晓|朝|阳/, "晨光初照、天光渐开"],
  [/松|竹|梅|兰|桃|柳|花|叶|枝/, "草木花枝、四时生意"],
  [/风|雨|雪|霜|雷/, "风雨霜雪、气象变化"],
  [/舟|桥|亭|寺|钟|门|阶|窗/, "古亭小舟、寺钟桥影"],
  [/人|客|君|归|行|路/, "孤行人物、归途背影"],
  [/金|玉|朱|青|翠|碧|白/, "淡彩点染、色不夺墨"],
];

export function extractPoetryMotifs(poetry: string): string[] {
  const compact = poetry.replace(/\s+/g, "");
  const motifs: string[] = [];

  for (const [pattern, motif] of motifRules) {
    if (pattern.test(compact) && !motifs.includes(motif)) {
      motifs.push(motif);
    }
  }

  return motifs.slice(0, 8);
}

export function buildInkPaintingPrompt(title: string, poetry: string): string {
  const lines = poetry
    .split(/[，。！？；、,.;!?]/)
    .map((line) => line.trim())
    .filter(Boolean);
  const motifs = extractPoetryMotifs(poetry);

  const lineReading = lines.length
    ? lines.map((line, index) => `${index + 1}. ${line}`).join("\n")
    : poetry;
  const motifText = motifs.length
    ? motifs.join("；")
    : "依据诗句自行提取主体、时节、空间、气象和情绪";

  return `创作一幅正方形中国传统水墨画，主题为《${title}》。

签诗原文：
${poetry}

逐句意境拆解：
${lineReading}

必须优先呈现的诗中意象：
${motifText}

画面决策：
- 先从诗句中提取具体物象，再组织构图；不要画泛泛的山水模板。
- 画面主体必须服务于诗意情绪：起势、转折、归静、开阔或含蓄，要能看出诗的气口。
- 若诗中有水、鱼、龙门、风雨、月色、花木、舟桥等意象，必须让这些意象成为画面焦点或明确配景。
- 使用宋元文人画气质，水墨设色，宣纸肌理，墨分五色，焦浓重淡清。
- 大面积留白，近景有可识别主体，中景承接诗意，远景以云烟收束。
- 色彩克制，只允许少量赭石、花青、朱砂或淡金点染，整体仍以黑白灰水墨为主。
- 不要文字、题字、印章、落款、水印、现代建筑、汽车、铁路、电线、霓虹、摄影感、二次元、厚涂油画。`;
}

export function buildDashscopeWan26Payload(prompt: string) {
  return {
    model: DASHSCOPE_IMAGE_MODEL,
    input: {
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
    },
    parameters: {
      size: "1280*1280",
      n: 1,
      negative_prompt:
        "文字,题字,印章,落款,水印,现代建筑,汽车,铁路,电线杆,霓虹灯,摄影照片,写实人像,二次元,油画厚涂,低质量,模糊,变形,AI感",
      prompt_extend: true,
      watermark: false,
    },
  };
}

export function parseDashscopeImageUrl(data: any): string {
  const content = data?.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    const imagePart = content.find((item) => typeof item?.image === "string");
    if (imagePart?.image) return imagePart.image;
  }

  return (
    data?.output?.results?.[0]?.url ||
    data?.output?.results?.[0]?.image ||
    data?.output?.image_url ||
    data?.output?.url ||
    ""
  );
}


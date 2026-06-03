import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const localSeed = \{[\s\S]*?advice: \[/m;

const replacement = `const localSeed = {
          title: "鱼跃龙门",
          poetry: "波涛汹涌起狂澜，金鳞一跃上青天。脱胎换骨从此始，名声显赫耀家园。",
          stamp: "上上",
          explanation: \`【由于无法连接天机，针对您当前的情绪与遭遇推算出《鱼跃龙门》】\\n您当前的心境表现为“\${mentalState || "平静"}”，近期遇到了“\${recentEvents || "冷暖变易"}”等吉凶际遇。预测您未来的气运将迎来一次重大的蓄势突破。虽然眼前有些许浮尘困扰，但金鳞化龙之势已不可挡，好事终将发生。\`,
          advice: [`;

const newContent = content.replace(regex, replacement);

fs.writeFileSync('src/App.tsx', newContent, 'utf8');
console.log('App.tsx repaired.');

import { CategoryId } from "./types";

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  subtitle: string;
  description: string;
  iconName: string; // Used to determine which Lucide icon to render
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "career",
    name: "事业",
    subtitle: "道路与目标",
    description: "职场升迁，考学功名，破晓腾飞之举",
    iconName: "Briefcase"
  },
  {
    id: "love",
    name: "爱情",
    subtitle: "心灵与羁绊",
    description: "因缘聚散，良人相伴，破解爱恨心锁",
    iconName: "Heart"
  },
  {
    id: "wealth",
    name: "财富",
    subtitle: "运势与福报",
    description: "聚沙成塔，防耗守成，累积善因厚禄",
    iconName: "Coins"
  },
  {
    id: "health",
    name: "健康",
    subtitle: "身体与精神",
    description: "理气祛邪，神清合道，消纳灾病魔尘",
    iconName: "Leaf"
  }
];

// Atmospheric Chinese Zen guidance quotes to display on the loading incense stick
export const RETRIEVING_TXT = [
  "正在摄取虚空元气，凝结签诗...",
  "拨开因缘迷雾，推演乾坤局势...",
  "一炷神香袅袅上九天，祈愿心灵洞彻...",
  "松风竹影扫心尘，吉兆正在显见中...",
  "澄澈思虑，凝聚意念，静候缘分..."
];

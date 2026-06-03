export interface User {
  id: string; // Supabase auth.users UUID
  username: string;
  email?: string;
  role?: string;
  token?: string; // Supabase access_token (JWT)
  createdAt?: string;
}

export type CategoryId = "career" | "love" | "wealth" | "health" | "general";

export interface FortuneResult {
  id?: string; // Supabase fortune_records UUID (undefined for unsaved)
  title: string;
  poetry: string;
  category: CategoryId;
  categoryLabel?: string;
  stamp: string; // e.g. "上吉", "上上", "中平", "下平", etc.
  explanation: string;
  advice: string[];
  timestamp: string; // ISO string
  question?: string;
  mentalState?: string;
  recentEvents?: string;
  imageUrl?: string;
}

export interface PresetSlip {
  title: string;
  poetry: string;
  meaning: string;
  stamp: string;
  advice: string;
}

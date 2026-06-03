-- ============================================================
-- ZenFortune (禅运) — Supabase 数据库建表脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- 占卜历史记录表
CREATE TABLE IF NOT EXISTS fortune_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  poetry TEXT NOT NULL,
  category TEXT NOT NULL,
  category_label TEXT,
  stamp TEXT NOT NULL,
  explanation TEXT NOT NULL,
  advice JSONB NOT NULL DEFAULT '[]',
  question TEXT,
  mental_state TEXT,
  recent_events TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 启用行级安全策略 (Row Level Security)
ALTER TABLE fortune_records ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的记录
CREATE POLICY "Users can view own records"
  ON fortune_records FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能插入自己的记录
CREATE POLICY "Users can insert own records"
  ON fortune_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户只能删除自己的记录
CREATE POLICY "Users can delete own records"
  ON fortune_records FOR DELETE
  USING (auth.uid() = user_id);

-- 索引优化：加速按用户查询和按时间排序
CREATE INDEX IF NOT EXISTS idx_fortune_records_user_id ON fortune_records(user_id);
CREATE INDEX IF NOT EXISTS idx_fortune_records_created_at ON fortune_records(created_at DESC);

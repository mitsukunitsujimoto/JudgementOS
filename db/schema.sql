-- AI時代の意思決定再設計ツール — Neon Postgres スキーマ
-- 蓄積対象: 会話ログではなく、経営者の意思決定文脈
-- 適用: Neon SQL Editor または npm run db:schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Person — 経営者・利用者
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  company TEXT,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. DecisionSession — 一回ごとの判断
CREATE TABLE IF NOT EXISTS decision_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  title TEXT,
  raw_input TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  app_version TEXT,
  ai_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_decision_sessions_person_id ON decision_sessions(person_id);
CREATE INDEX IF NOT EXISTS idx_decision_sessions_created_at ON decision_sessions(created_at DESC);

-- 3. Premise — 判断を支える前提
CREATE TABLE IF NOT EXISTS premises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_session_id UUID NOT NULL REFERENCES decision_sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  confidence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premises_session ON premises(decision_session_id);

-- 4. Tension — 矛盾・緊張
CREATE TABLE IF NOT EXISTS tensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_session_id UUID NOT NULL REFERENCES decision_sessions(id) ON DELETE CASCADE,
  side_a TEXT NOT NULL,
  side_b TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tensions_session ON tensions(decision_session_id);

-- 5. KeyQuestion — 本当に判断すべき問い
CREATE TABLE IF NOT EXISTS key_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_session_id UUID NOT NULL REFERENCES decision_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_questions_session ON key_questions(decision_session_id);

-- 6. DecisionContext — 意思決定文脈（5要素）
CREATE TABLE IF NOT EXISTS decision_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_session_id UUID NOT NULL UNIQUE REFERENCES decision_sessions(id) ON DELETE CASCADE,
  achieve TEXT NOT NULL,
  protect TEXT NOT NULL,
  accepted_constraints TEXT NOT NULL,
  uncertain TEXT NOT NULL,
  criteria TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ContextPrompt — AIへ渡す文脈化文章
CREATE TABLE IF NOT EXISTS context_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_context_id UUID NOT NULL REFERENCES decision_contexts(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_context_prompts_context ON context_prompts(decision_context_id);

-- 8. AIConversation — 文脈を渡した後の対話（将来）
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_session_id UUID NOT NULL REFERENCES decision_sessions(id) ON DELETE CASCADE,
  context_prompt_id UUID REFERENCES context_prompts(id) ON DELETE SET NULL,
  user_prompt TEXT,
  ai_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_session ON ai_conversations(decision_session_id);

-- 9. DecisionResult — 最終判断（将来）
CREATE TABLE IF NOT EXISTS decision_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_session_id UUID NOT NULL UNIQUE REFERENCES decision_sessions(id) ON DELETE CASCADE,
  final_decision TEXT NOT NULL,
  reason TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Reflection — 後日の振り返り（将来）
CREATE TABLE IF NOT EXISTS reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_session_id UUID NOT NULL REFERENCES decision_sessions(id) ON DELETE CASCADE,
  result TEXT,
  learning TEXT,
  criteria_changed TEXT,
  reflected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reflections_session ON reflections(decision_session_id);

import { getSql } from './db.js';

const APP_VERSION = process.env.APP_VERSION || 'judgmentos-decision-mirror-1.0.0';

function truncateTitle(rawInput, max = 80) {
  const line = (rawInput || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
  return line.length > max ? `${line.slice(0, max)}…` : line || '判断セッション';
}

/**
 * 意思決定セッションと関連文脈を Neon に保存する。
 * @returns {{ saved: boolean, decision_session_id?: string, reason?: string }}
 */
export async function saveDecisionSession(payload) {
  const sql = getSql();
  if (!sql) {
    return { saved: false, reason: 'DATABASE_URL is not configured' };
  }

  const {
    raw_input,
    premise,
    tensions = [],
    key_questions = [],
    decision_context,
    context_prompt,
    ai_version,
    user_premise,
    app_version = APP_VERSION
  } = payload;

  if (!raw_input || typeof raw_input !== 'string') {
    return { saved: false, reason: 'raw_input is required' };
  }

  const ctx = decision_context || {};
  const achieve = ctx.achieve || '';
  const protect = ctx.protect || '';
  const acceptedConstraints = ctx.constraints || ctx.accepted_constraints || '';
  const uncertain = user_premise?.trim()
    ? `「${user_premise.trim()}」という前提が、本当に正しいかどうか`
    : (ctx.uncertain || '');
  const criteria = ctx.criteria || '';

  try {
    const [session] = await sql`
      INSERT INTO decision_sessions (title, raw_input, app_version, ai_version)
      VALUES (
        ${truncateTitle(raw_input)},
        ${raw_input},
        ${app_version},
        ${ai_version || null}
      )
      RETURNING id
    `;
    const sessionId = session.id;

    if (premise) {
      await sql`
        INSERT INTO premises (decision_session_id, content, confidence)
        VALUES (${sessionId}, ${premise}, ${'hypothesis'})
      `;
    }

    for (const t of tensions) {
      if (!t?.a || !t?.b) continue;
      await sql`
        INSERT INTO tensions (decision_session_id, side_a, side_b)
        VALUES (${sessionId}, ${t.a}, ${t.b})
      `;
    }

    for (let i = 0; i < key_questions.length; i++) {
      const question = key_questions[i];
      if (!question) continue;
      await sql`
        INSERT INTO key_questions (decision_session_id, question, priority)
        VALUES (${sessionId}, ${question}, ${i})
      `;
    }

    let contextId = null;
    if (achieve || protect || acceptedConstraints || uncertain || criteria) {
      const [dc] = await sql`
        INSERT INTO decision_contexts (
          decision_session_id, achieve, protect, accepted_constraints, uncertain, criteria
        )
        VALUES (
          ${sessionId},
          ${achieve},
          ${protect},
          ${acceptedConstraints},
          ${uncertain},
          ${criteria}
        )
        RETURNING id
      `;
      contextId = dc.id;
    }

    if (context_prompt && contextId) {
      await sql`
        INSERT INTO context_prompts (decision_context_id, prompt_text)
        VALUES (${contextId}, ${context_prompt})
      `;
    }

    return { saved: true, decision_session_id: sessionId };
  } catch (err) {
    console.error('saveDecisionSession failed:', err.message);
    return { saved: false, reason: 'Database save failed' };
  }
}

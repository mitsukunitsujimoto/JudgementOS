import { validateInvite } from '../lib/monitor-invites.js';
import { buildHypothesisUserPrompt, HYPOTHESIS_SYSTEM } from '../lib/hypothesis-prompt.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const MAX_CONTEXT_CHARS = 12000;

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, reason: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      reason: '仮説生成がまだ設定されていません。自分のAIを使う方法（A）をご利用ください。',
      code: 'NOT_CONFIGURED'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, reason: '不正なリクエストです。' });
    }
  }
  body = body || {};

  if (!body.securityConsent) {
    return res.status(403).json({
      ok: false,
      reason: '外部AIへの送信に同意していないため、仮説を生成できません。',
      code: 'NO_CONSENT'
    });
  }

  const checked = validateInvite({
    inviteCode: body.inviteCode,
    inviteId: body.inviteId
  });
  if (!checked.ok) {
    return res.status(401).json({ ok: false, reason: checked.reason, code: 'INVITE' });
  }

  const contextText = String(body.contextText || '').trim();
  if (contextText.length < 20) {
    return res.status(400).json({ ok: false, reason: '判断文脈が短すぎます。', code: 'CONTEXT' });
  }
  if (contextText.length > MAX_CONTEXT_CHARS) {
    return res.status(400).json({ ok: false, reason: '判断文脈が長すぎます。', code: 'CONTEXT' });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const userPrompt = buildHypothesisUserPrompt(contextText);

  let upstream;
  try {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1800,
        messages: [
          { role: 'system', content: HYPOTHESIS_SYSTEM },
          { role: 'user', content: userPrompt }
        ]
      })
    });
  } catch {
    return res.status(502).json({
      ok: false,
      reason: 'いまは仮説を出せません。しばらくして再度お試しいただくか、自分のAIを使う方法（A）へ。',
      code: 'NETWORK',
      retryable: true
    });
  }

  if (!upstream.ok) {
    let detail = '';
    try {
      const errJson = await upstream.json();
      detail = errJson?.error?.message || '';
    } catch {
      /* ignore */
    }
    const retryable = upstream.status === 429 || upstream.status >= 500;
    return res.status(502).json({
      ok: false,
      reason: retryable
        ? 'いまは仮説を出せません。自動で一度だけ再試行するか、自分のAIを使う方法（A）へ。'
        : '仮説を生成できませんでした。自分のAIを使う方法（A）をご利用ください。',
      code: 'UPSTREAM',
      retryable,
      // 本文・プロンプトは返さない。運用確認用に短いコードのみ
      upstreamStatus: upstream.status,
      upstreamHint: detail ? String(detail).slice(0, 120) : undefined
    });
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return res.status(502).json({
      ok: false,
      reason: 'いまは仮説を出せません。自分のAIを使う方法（A）へ。',
      code: 'PARSE',
      retryable: true
    });
  }

  const text = (data?.choices?.[0]?.message?.content || '').trim();
  if (!text) {
    return res.status(502).json({
      ok: false,
      reason: '仮説が空でした。もう一度お試しいただくか、自分のAIを使う方法（A）へ。',
      code: 'EMPTY',
      retryable: true
    });
  }

  // 判断文脈本文はレスポンスにもログにも載せない
  return res.status(200).json({
    ok: true,
    text,
    model
  });
}

import { validateInvite } from '../lib/monitor-invites.js';
import {
  buildSummarizeChangeSystem,
  buildSummarizeChangeUser,
  mockSummarizeChange,
  parseSummarizeChangeJson
} from '../lib/summarize-change.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, reason: 'Method not allowed' });
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

  const payload = {
    theme: String(body.theme || '').trim().slice(0, 200),
    achieve: String(body.achieve || '').trim().slice(0, 2000),
    protect: String(body.protect || '').trim().slice(0, 2000),
    firstMe: String(body.firstMe || '').trim().slice(0, 2000),
    nowMe: String(body.nowMe || '').trim().slice(0, 2000),
    criteriaChange: String(body.criteriaChange || '').trim().slice(0, 2000),
    truePurpose: String(body.truePurpose || '').trim().slice(0, 2000)
  };

  const mock = () => ({
    ok: true,
    source: 'mock',
    ...mockSummarizeChange(payload)
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(200).json(mock());

  const consented = !!body.securityConsent;
  const checked = validateInvite({
    inviteCode: body.inviteCode,
    inviteId: body.inviteId
  });
  if (!consented || !checked.ok) {
    return res.status(200).json(mock());
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
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
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSummarizeChangeSystem() },
          { role: 'user', content: buildSummarizeChangeUser(payload) }
        ]
      })
    });
  } catch {
    return res.status(200).json(mock());
  }

  if (!upstream.ok) return res.status(200).json(mock());

  let data;
  try {
    data = await upstream.json();
  } catch {
    return res.status(200).json(mock());
  }

  const parsed = parseSummarizeChangeJson(data?.choices?.[0]?.message?.content || '');
  if (!parsed) return res.status(200).json(mock());

  return res.status(200).json({
    ok: true,
    source: 'model',
    model,
    headline: parsed.headline,
    before_summary: parsed.before_summary,
    after_summary: parsed.after_summary,
    criteria_shift: parsed.criteria_shift,
    takeaway: parsed.takeaway
  });
}

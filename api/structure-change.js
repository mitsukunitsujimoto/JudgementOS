import { validateInvite } from '../lib/monitor-invites.js';
import {
  buildStructureChangeSystem,
  buildStructureChangeUser,
  mockStructureChange,
  parseStructureChangeJson
} from '../lib/structure-change.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const MAX_CHARS = 10000;

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

  const pastSummary = String(body.pastSummary || '').trim().slice(0, MAX_CHARS);
  const currentDump = String(body.currentDump || '').trim().slice(0, MAX_CHARS);
  const realization = String(body.realization || '').trim();
  const protection = String(body.protection || '').trim();
  const categoryLabel = String(body.categoryLabel || '').trim();

  if (!pastSummary) {
    return res.status(400).json({ ok: false, reason: '過去ログがありません。', code: 'NO_PAST' });
  }

  const mock = () => ({
    ok: true,
    source: 'mock',
    ...mockStructureChange({ pastSummary, realization, protection })
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
        temperature: 0.5,
        max_tokens: 700,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildStructureChangeSystem() },
          {
            role: 'user',
            content: buildStructureChangeUser({
              pastSummary,
              currentDump,
              realization,
              protection,
              categoryLabel
            })
          }
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

  const parsed = parseStructureChangeJson(data?.choices?.[0]?.message?.content || '');
  if (!parsed) return res.status(200).json(mock());

  return res.status(200).json({
    ok: true,
    source: 'model',
    model,
    previous_you: parsed.previous_you,
    now_suggestion: parsed.now_suggestion
  });
}

import { validateInvite } from '../lib/monitor-invites.js';
import {
  buildStructureIntroSystem,
  buildStructureIntroUser,
  categoryById,
  mockStructureIntro,
  parseStructureIntroJson
} from '../lib/structure-intro.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const MAX_DUMP_CHARS = 8000;

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

  const categoryId = String(body.categoryId || '').trim();
  const dumpText = String(body.dumpText || '').trim();
  if (dumpText.length < 4) {
    return res.status(400).json({ ok: false, reason: 'もう少し書いてください。', code: 'DUMP' });
  }
  if (dumpText.length > MAX_DUMP_CHARS) {
    return res.status(400).json({ ok: false, reason: '文字数が多すぎます。', code: 'DUMP' });
  }

  const cat = categoryById(categoryId);
  const categoryLabel = cat ? `${cat.title}（${cat.hint}）` : categoryId;
  const mock = () => ({
    ok: true,
    source: 'mock',
    ...mockStructureIntro({ categoryId, dumpText })
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(200).json(mock());
  }

  // 同意・招待があるときだけ実モデル。なければモック（導入摩擦を増やさない）
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
        max_tokens: 1000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildStructureIntroSystem() },
          {
            role: 'user',
            content: buildStructureIntroUser({ categoryId, categoryLabel, dumpText })
          }
        ]
      })
    });
  } catch {
    return res.status(200).json(mock());
  }

  if (!upstream.ok) {
    return res.status(200).json(mock());
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    return res.status(200).json(mock());
  }

  const parsed = parseStructureIntroJson(data?.choices?.[0]?.message?.content || '');
  if (!parsed) {
    return res.status(200).json(mock());
  }

  return res.status(200).json({
    ok: true,
    source: 'model',
    model,
    realization: parsed.realization,
    protection: parsed.protection,
    constraints_recommend: parsed.constraints_recommend,
    structure: parsed.structure || null
  });
}

import { validateInvite } from '../lib/monitor-invites.js';
import {
  buildInferPrincipleSystem,
  buildInferPrincipleUser,
  mockInferPrinciple,
  parseInferPrincipleJson
} from '../lib/infer-principle.js';

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
    dump: String(body.dump || '').trim().slice(0, 8000),
    achieve: String(body.achieve || '').trim().slice(0, 2000),
    protect: String(body.protect || '').trim().slice(0, 2000),
    whyProtect: String(body.whyProtect || '').trim().slice(0, 2000),
    boundary: String(body.boundary || '').trim().slice(0, 2000),
    constraints: String(body.constraints || '').trim().slice(0, 2000),
    ronten: String(body.ronten || '').trim().slice(0, 4000),
    structure: body.structure && typeof body.structure === 'object' ? body.structure : null
  };

  const mock = () => ({
    ok: true,
    source: 'mock',
    ...mockInferPrinciple(payload)
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
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildInferPrincipleSystem() },
          { role: 'user', content: buildInferPrincipleUser(payload) }
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

  const parsed = parseInferPrincipleJson(data?.choices?.[0]?.message?.content || '');
  if (!parsed) return res.status(200).json(mock());

  return res.status(200).json({
    ok: true,
    source: 'model',
    model,
    principle: parsed.principle,
    core: parsed.core,
    handoff: parsed.handoff
  });
}

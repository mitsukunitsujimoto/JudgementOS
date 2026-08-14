import { validateInvite } from '../lib/monitor-invites.js';
import {
  buildInferPrincipleSystem,
  buildInferPrincipleUser,
  buildInferRepairUser,
  mockInferPrinciple,
  parseInferPrincipleJson
} from '../lib/infer-principle.js';
import { validatePrincipleBundle } from '../lib/judgment-structure.js';
import {
  allowMockFallback,
  callOpenAiJson,
  failPayload,
  logJosFailure
} from '../lib/jos-runtime.js';

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
  const useMock = allowMockFallback();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    if (useMock) return res.status(200).json(mock());
    logJosFailure('config', 'missing_openai_key');
    return res.status(200).json(failPayload('config'));
  }

  const consented = !!body.securityConsent;
  const checked = validateInvite({
    inviteCode: body.inviteCode,
    inviteId: body.inviteId
  });
  if (!consented || !checked.ok) {
    if (useMock) return res.status(200).json(mock());
    logJosFailure('config', consented ? 'invite' : 'no_consent');
    return res.status(200).json(failPayload('config'));
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const system = buildInferPrincipleSystem();

  async function inferOnce(userContent) {
    const call = await callOpenAiJson({
      apiKey,
      model,
      temperature: 0.4,
      maxTokens: 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ]
    });
    if (!call.ok) return { fail: call.code };
    const parsed = parseInferPrincipleJson(call.content);
    if (!parsed) {
      logJosFailure('parse', 'infer_principle_parse');
      return { fail: 'parse' };
    }
    const quality = validatePrincipleBundle({
      principle: parsed.principle,
      handoff: parsed.handoff,
      structure: payload.structure,
      dump: payload.dump
    });
    return { parsed, quality };
  }

  let result = await inferOnce(buildInferPrincipleUser(payload));
  if (result.fail) {
    if (useMock) return res.status(200).json(mock());
    return res.status(200).json(failPayload(result.fail));
  }
  if (!result.quality.ok) {
    logJosFailure('semantic_validation', result.quality.reasons.join(','));
    result = await inferOnce(buildInferRepairUser(payload, result.quality.reasons));
    if (result.fail) {
      if (useMock) return res.status(200).json(mock());
      return res.status(200).json(failPayload(result.fail));
    }
    if (!result.quality.ok) {
      logJosFailure('regeneration_failed', result.quality.reasons.join(','));
      if (useMock) return res.status(200).json(mock());
      return res.status(200).json(failPayload('regeneration_failed'));
    }
  }

  return res.status(200).json({
    ok: true,
    source: 'model',
    model,
    principle: result.parsed.principle,
    core: result.parsed.core,
    handoff: result.parsed.handoff
  });
}

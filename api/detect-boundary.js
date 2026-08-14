import { validateInvite } from '../lib/monitor-invites.js';
import {
  buildDetectBoundarySystem,
  buildDetectBoundaryUser,
  mockDetectBoundary,
  parseDetectBoundaryJson,
  heuristicTension
} from '../lib/detect-boundary.js';
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
    whyProtect: String(body.whyProtect || '').trim().slice(0, 2000)
  };

  const mock = () => ({
    ok: true,
    source: 'mock',
    ...mockDetectBoundary(payload)
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
    return res.status(200).json({ ok: true, source: 'skip', needs_question: false, question: '', reason: 'no_model' });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const call = await callOpenAiJson({
    apiKey,
    model,
    temperature: 0.3,
    maxTokens: 400,
    messages: [
      { role: 'system', content: buildDetectBoundarySystem() },
      { role: 'user', content: buildDetectBoundaryUser(payload) }
    ]
  });
  if (!call.ok) {
    if (useMock) return res.status(200).json(mock());
    return res.status(200).json({ ok: true, source: 'skip', needs_question: false, question: '', reason: call.code });
  }

  const parsed = parseDetectBoundaryJson(call.content);
  if (!parsed) {
    logJosFailure('parse', 'detect_boundary_parse');
    if (useMock) return res.status(200).json(mock());
    return res.status(200).json({ ok: true, source: 'skip', needs_question: false, question: '', reason: 'parse' });
  }

  let needs = parsed.needs_question;
  let question = parsed.question;
  let reason = parsed.reason;
  if (!needs && heuristicTension(payload)) {
    const fallback = mockDetectBoundary(payload);
    needs = fallback.needs_question;
    question = fallback.question;
    reason = 'heuristic_override';
  }

  return res.status(200).json({
    ok: true,
    source: 'model',
    model,
    needs_question: needs,
    question,
    reason
  });
}

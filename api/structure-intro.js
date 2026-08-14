import { validateInvite } from '../lib/monitor-invites.js';
import {
  buildStructureIntroSystem,
  buildStructureIntroUser,
  categoryById,
  mockStructureIntro,
  parseStructureIntroJson
} from '../lib/structure-intro.js';
import {
  buildExtractRepairUser,
  sanitizeStructure,
  validateStructureQuality
} from '../lib/judgment-structure.js';
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
  const system = buildStructureIntroSystem();
  const user1 = buildStructureIntroUser({ categoryId, categoryLabel, dumpText });

  async function extractOnce(userContent) {
    const call = await callOpenAiJson({
      apiKey,
      model,
      temperature: 0.3,
      maxTokens: 1000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ]
    });
    if (!call.ok) return { fail: call.code };
    const parsed = parseStructureIntroJson(call.content);
    if (!parsed) {
      logJosFailure('parse', 'structure_intro_parse');
      return { fail: 'parse' };
    }
    const structure = sanitizeStructure(parsed.structure || parsed, dumpText);
    const quality = validateStructureQuality(structure, dumpText);
    return { parsed, structure, quality };
  }

  let result = await extractOnce(user1);
  if (result.fail) {
    if (useMock) return res.status(200).json(mock());
    return res.status(200).json(failPayload(result.fail));
  }

  if (!result.quality.ok) {
    logJosFailure('semantic_validation', result.quality.reasons.join(','));
    result = await extractOnce(buildExtractRepairUser(dumpText, result.quality.reasons));
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

  const parsed = result.parsed;
  const structure = result.structure;
  if (result.quality.followup === 'desired_outcome_missing') {
    structure.needsFollowup = true;
    structure.followupReason = 'desired_outcome_missing';
    structure.followupQuestion = structure.followupQuestion
      || 'それを避けた先で、今回、本当は何を実現したいのでしょう？';
  }

  return res.status(200).json({
    ok: true,
    source: 'model',
    model,
    realization: structure.desiredOutcome || parsed.realization || '',
    protection: (structure.protectedValues && structure.protectedValues[0]) || parsed.protection || '',
    constraints_recommend: parsed.constraints_recommend || [],
    structure
  });
}

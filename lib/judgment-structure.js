/** JOS 2.0 内部 Judgment Structure。接続ではなく意味の分離。 */

import { looksLikeAvoidancePurpose, PURPOSE_CUE, themeFromDump } from './axes-roles.js';

const BOUNDARY_CUE = /継続できない|採らない|選ばない|絶対に|欺|赤字が|長期間続く|貢献だけ|収益が得られず|得られない状態/;
const PROTECT_CUE = /損ないたくない|失いたくない|離れたくない|崩したくない|犠牲にしたくない|信頼は/;
const AVOID_ONLY = /反発されたくない|失敗したくない|信用を失いたくない|反対されたくない|赤字を避けたい|リスクを取りたくない/;

export function emptyStructure() {
  return {
    decisionTheme: '',
    desiredOutcome: '',
    protectedValues: [],
    boundaryConditions: [],
    tensions: [],
    needsFollowup: false,
    followupReason: null,
    followupQuestion: null,
    confidence: {
      decisionTheme: null,
      desiredOutcome: null,
      protectedValues: null,
      boundaryConditions: null
    }
  };
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    const t = String(x || '').trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function list(v) {
  if (Array.isArray(v)) return uniq(v.map((x) => String(x || '').trim()).filter(Boolean));
  const s = String(v || '').trim();
  return s ? [s] : [];
}

export function looksLikeBoundaryText(t) {
  return BOUNDARY_CUE.test(String(t || ''));
}

export function looksLikeProtectText(t) {
  const s = String(t || '');
  if (looksLikeBoundaryText(s)) return false;
  if (/後悔する/.test(s) && /貢献だけ|収益が得られ/.test(s)) return false;
  return PROTECT_CUE.test(s);
}

export function extractStructureFromDump(dumpText) {
  const dump = String(dumpText || '').replace(/\s+/g, ' ').trim();
  const s = emptyStructure();
  if (!dump) return decideFollowup(s);
  s.decisionTheme = themeFromDump(dump);

  const parts = dump.split(/ただし|一方で|けれど|しかし|が、/).map((p) => p.replace(/^、/, '').trim()).filter(Boolean);
  const head = parts[0] || dump;
  const tails = parts.slice(1);

  if (AVOID_ONLY.test(dump) && !PURPOSE_CUE.test(dump) && dump.length < 80) {
    s.desiredOutcome = '';
    s.confidence.desiredOutcome = 'low';
    return decideFollowup(s);
  }

  let outcome = head;
  const protects = [];
  const bounds = [];

  for (const tail of tails) {
    if (looksLikeBoundaryText(tail)) bounds.push(tail);
    else if (looksLikeProtectText(tail)) protects.push(tail.replace(/^、/, ''));
    else if (PURPOSE_CUE.test(tail) && looksLikeAvoidancePurpose(outcome)) {
      outcome = tail;
    } else if (looksLikeBoundaryText(tail) || /採らない|構わないが/.test(tail)) {
      bounds.push(tail);
    } else if (PROTECT_CUE.test(tail) || /離れたくない/.test(tail)) {
      protects.push(tail);
    }
  }

  if (/欺く方法は絶対に採らない|欺く方法は/.test(dump) && !bounds.some((b) => /欺/.test(b))) {
    bounds.push('顧客を欺く方法は採らない');
  }
  if (/貢献だけ/.test(dump) && /後悔/.test(dump) && !bounds.some((b) => /貢献だけ/.test(b))) {
    bounds.push('社会への貢献だけで収益が伴わず、事業として継続できない選択は採らない');
  }
  if (/赤字が長期間続くなら継続できない/.test(dump) && !bounds.some((b) => /赤字/.test(b))) {
    bounds.push('赤字が長期間続く選択は継続しない');
  }

  if (/社会に貢献/.test(dump) && /一貫/.test(dump) && /収益/.test(dump)) {
    outcome = '社会に貢献でき、これまで追求してきたことと一貫する事業を行いながら、十分な収益を生み出す';
  } else if (/新規顧客を増やしたい/.test(dump)) {
    outcome = '新規顧客を増やす';
  }

  if (/既存顧客との信頼/.test(dump) && !protects.some((p) => /既存顧客/.test(p))) {
    protects.push('既存顧客との信頼');
  }

  if (/専門性からも離れたくない|専門性から離れたくない/.test(dump)) {
    if (!protects.some((p) => /専門/.test(p))) protects.push('自分の専門性');
    outcome = String(outcome).replace(/自分の専門性からも離れたくない。?/g, '').trim();
  }

  s.desiredOutcome = String(outcome || '').trim();
  if (looksLikeAvoidancePurpose(s.desiredOutcome) && PURPOSE_CUE.test(dump)) {
    const m = dump.match(/(.{8,80}(?:たい|目指|実現))/);
    if (m) s.desiredOutcome = m[1].trim();
  }
  if (looksLikeBoundaryText(s.desiredOutcome) || AVOID_ONLY.test(s.desiredOutcome)) {
    s.desiredOutcome = PURPOSE_CUE.test(dump) ? dump.replace(AVOID_ONLY, '').trim().slice(0, 160) : '';
  }

  s.protectedValues = uniq(protects).filter((p) => !looksLikeBoundaryText(p) && !/貢献だけ/.test(p));
  s.boundaryConditions = uniq(bounds);

  const hasContrib = /貢献/.test(dump);
  const hasRev = /収益|利益/.test(dump);
  const hasId = /一貫|専門/.test(dump);
  if (hasContrib && hasRev && hasId && s.boundaryConditions.length === 0) {
    s.tensions = ['社会への貢献', '十分な収益', '追求・専門性との一貫'];
  }

  s.confidence.decisionTheme = s.decisionTheme ? 'medium' : 'low';
  s.confidence.desiredOutcome = s.desiredOutcome && !looksLikeAvoidancePurpose(s.desiredOutcome) ? 'high' : 'low';
  s.confidence.protectedValues = s.protectedValues.length ? 'medium' : 'n/a';
  s.confidence.boundaryConditions = s.boundaryConditions.length ? 'high' : 'n/a';
  return decideFollowup(s);
}

export function sanitizeStructure(raw, dumpText) {
  const dump = String(dumpText || '');
  const s = emptyStructure();
  const src = raw && typeof raw === 'object' ? raw : {};
  s.decisionTheme = String(src.decisionTheme || themeFromDump(dump)).trim();
  s.desiredOutcome = String(src.desiredOutcome || src.realization || '').trim();
  s.protectedValues = list(src.protectedValues != null ? src.protectedValues : src.protection);
  s.boundaryConditions = list(src.boundaryConditions);
  s.tensions = list(src.tensions);

  s.protectedValues = s.protectedValues.filter((p) => {
    if (looksLikeBoundaryText(p)) {
      s.boundaryConditions.push(p);
      return false;
    }
    if (/貢献だけ|収益が得られず/.test(p)) {
      s.boundaryConditions.push(p);
      return false;
    }
    return true;
  });
  s.boundaryConditions = uniq(s.boundaryConditions);

  if (looksLikeAvoidancePurpose(s.desiredOutcome) || looksLikeBoundaryText(s.desiredOutcome)) {
    s.desiredOutcome = '';
  }

  s.confidence = src.confidence && typeof src.confidence === 'object'
    ? { ...s.confidence, ...src.confidence }
    : s.confidence;

  return decideFollowup(s);
}

export function applyEditsToStructure(s, edits) {
  const next = sanitizeStructure(s, '');
  const e = edits || {};
  if (e.theme) next.decisionTheme = String(e.theme).trim();
  if (e.achieve != null && String(e.achieve).trim()) next.desiredOutcome = String(e.achieve).trim();
  if (e.protect != null) {
    const p = String(e.protect).trim();
    next.protectedValues = p ? [p] : [];
  }
  if (e.boundary != null) {
    const b = String(e.boundary).trim();
    if (b) next.boundaryConditions = uniq(next.boundaryConditions.concat([b]));
  }
  return decideFollowup(sanitizeStructure(next, e.dump || ''));
}

export function decideFollowup(s) {
  const st = { ...s };
  st.needsFollowup = false;
  st.followupReason = null;
  st.followupQuestion = null;

  const outcomeOk = st.desiredOutcome && !looksLikeAvoidancePurpose(st.desiredOutcome);
  if (!outcomeOk) {
    st.needsFollowup = true;
    st.followupReason = 'desired_outcome_missing';
    st.followupQuestion = 'それを避けた先で、本当は何を実現したいのでしょう？';
    return st;
  }

  const hasTension = (st.tensions && st.tensions.length >= 2)
    || (st.protectedValues.length + (outcomeOk ? 1 : 0) >= 2 && /収益|貢献|一貫|専門/.test([st.desiredOutcome, ...st.protectedValues].join(' ')));
  const hasBoundary = st.boundaryConditions.length > 0;
  if (hasTension && !hasBoundary) {
    const words = [...st.protectedValues, st.desiredOutcome].filter(Boolean).slice(0, 3).join('、');
    st.needsFollowup = true;
    st.followupReason = 'criteria_tension_boundary_unclear';
    st.followupQuestion = words
      ? `すべてを同時には満たせないとしたら、「${words}」のうち、失われたらその選択はしない、というものは何でしょう？`
      : '収益が大きくても、これが失われるなら選ばない、というものはありますか？';
  }
  return st;
}

export function structureToLegacy(s) {
  const st = s || emptyStructure();
  return {
    realization: st.desiredOutcome || '',
    protection: (st.protectedValues && st.protectedValues[0]) || '',
    constraints_recommend: []
  };
}

export function generatePrincipleFromStructure(s) {
  const st = s || emptyStructure();
  const o = st.desiredOutcome || '向かいたいこと';
  let text = `今回の対話からは、あなたは「${o}」を実現しようとしているように見えます。`;
  if (st.protectedValues && st.protectedValues.length) {
    text += `その際、「${st.protectedValues.join('、')}」は安易に犠牲にしない。`;
  }
  if (st.boundaryConditions && st.boundaryConditions.length) {
    text += `また、「${st.boundaryConditions.join('、')}」を超える選択は採らない、という線があるように見えます。`;
  }
  return text;
}

export function generateHandoffFromStructure(s) {
  const st = s || emptyStructure();
  const theme = st.decisionTheme || '今回の判断';
  const o = st.desiredOutcome || '向かいたいこと';
  const parts = [];
  parts.push(`${theme.replace(/。$/, '')}を考えています。`);
  parts.push(`私が実現したいのは、${o.replace(/。$/, '')}です。`);
  if (st.protectedValues && st.protectedValues.length) {
    parts.push(`その実現に向かう過程でも、${st.protectedValues.join('、')}は安易に失いたくありません。`);
  }
  if (st.boundaryConditions && st.boundaryConditions.length) {
    parts.push(`${st.boundaryConditions.join('。')}。`);
  }
  parts.push('この目的をできる限り実現できる複数の選択肢を提示してください。それぞれについて、期待できる成果、失うもの、リスク、長期的な信頼への影響を比較してください。');
  if ((st.protectedValues && st.protectedValues.length) || (st.boundaryConditions && st.boundaryConditions.length)) {
    parts.push('また、私の判断基準や継続可能性と衝突する点があれば明示してください。');
  }
  parts.push('最終判断は私が行います。');
  return parts.join('\n');
}

export function generateCoreFromStructure(s) {
  const st = s || emptyStructure();
  if (st.protectedValues && st.protectedValues.length) {
    return `進む方向は「${st.desiredOutcome}」。進み方として「${st.protectedValues.join('、')}」を安易に犠牲にしない。`;
  }
  if (st.boundaryConditions && st.boundaryConditions.length) {
    return `進む方向は「${st.desiredOutcome}」。越えない線は「${st.boundaryConditions.join('、')}」。`;
  }
  return `進む方向は「${st.desiredOutcome}」。`;
}

export function handoffLooksHijacked(text) {
  return /避けるための選択肢|守るための選択肢/.test(String(text || ''));
}

export function buildExtractStructureSystem() {
  return `あなたは経営者の判断を代行しません。発話から判断構造だけを抽出します。ないものは作りません。
JSON:
{
  "decisionTheme": "何についての判断か。発話から。",
  "desiredOutcome": "実現したいこと＝判断の目的。なければ空文字",
  "protectedValues": ["過程で安易に犠牲にしたくないもの。なければ空配列"],
  "boundaryConditions": ["越えたら採らない／継続しない線。なければ空配列"],
  "tensions": ["現実に同時最大化できない可能性。機械的に作らない。なければ空配列"],
  "realization": "desiredOutcome と同じ",
  "protection": "protectedValues の先頭。なければ空文字",
  "constraints_recommend": []
}
規則:
- Desired Outcome ≠ Protected Value ≠ Boundary Condition
- 守る・回避・「貢献だけなら後悔」「赤字が続くと継続できない」は目的にしない。後者は boundaryConditions
- 「収益が得られず貢献だけ」は Protected Value にしない
- 存在しない protect / boundary を埋めない
- 失敗したくない等だけで目的が不明なら desiredOutcome は空
JSON以外は出力しない。`;
}

export function buildExtractRepairUser(dumpText, reasons) {
  return `前回の抽出はJOSの品質基準を満たしませんでした。
不整合理由: ${(reasons || []).join('、') || '不明'}
創作しない。ない欄は空。目的が回避だけなら desiredOutcome は空。
【発話】
${dumpText}
JSONだけ返してください。`;
}

const STOP = /^(たい|こと|もの|する|ある|ない|ため|よう|判断|実現)$/;

function contentTokens(s) {
  return String(s || '')
    .replace(/[、。．，\s]/g, ' ')
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP.test(w));
}

export function phraseGroundedInDump(phrase, dump) {
  const d = String(dump || '');
  const p = String(phrase || '').trim();
  if (!p) return true;
  if (d.includes(p.slice(0, Math.min(10, p.length)))) return true;
  const keys = p.match(/[一-龯]{2,6}/g) || [];
  const hits = keys.filter((k) => k.length >= 2 && !STOP.test(k) && d.includes(k));
  return hits.length >= 1;
}

export function validateStructureQuality(structure, dump) {
  const st = structure || emptyStructure();
  const dumpText = String(dump || '');
  const reasons = [];
  const outcome = String(st.desiredOutcome || '').trim();
  const avoidOnly = !outcome || looksLikeAvoidancePurpose(outcome);

  if (avoidOnly) {
    return {
      ok: true,
      followup: 'desired_outcome_missing',
      reasons: ['desired_outcome_missing']
    };
  }

  if (looksLikeBoundaryText(outcome) && !PURPOSE_CUE.test(outcome)) {
    reasons.push('boundary_as_purpose');
  }

  for (const p of st.protectedValues || []) {
    if (looksLikeBoundaryText(p) || /貢献だけ/.test(p)) reasons.push('protect_is_boundary');
    if (dumpText && !phraseGroundedInDump(p, dumpText)) reasons.push('invented_protect');
  }
  for (const b of st.boundaryConditions || []) {
    if (dumpText && !phraseGroundedInDump(b, dumpText)) reasons.push('invented_boundary');
  }

  return { ok: reasons.length === 0, followup: null, reasons: [...new Set(reasons)] };
}

export function validatePrincipleBundle({ principle, handoff, structure, dump }) {
  const reasons = [];
  const h = String(handoff || '');
  const p = String(principle || '');
  if (!p.trim() || !h.trim()) reasons.push('empty_prose');
  if (handoffLooksHijacked(h)) reasons.push('avoidance_as_request');
  if (!/選択肢/.test(h) || !/実現|目的/.test(h)) {
    reasons.push('handoff_not_purpose_led');
  }
  const st = structure || emptyStructure();
  const hasGuard = (st.protectedValues && st.protectedValues.length)
    || (st.boundaryConditions && st.boundaryConditions.length);
  if (hasGuard && !/衝突|矛盾|食い違/.test(h)) reasons.push('missing_conflict_ask');
  if (!/最終判断は私が行います/.test(h)) reasons.push('missing_final_agency');
  if (dump && st.protectedValues) {
    for (const v of st.protectedValues) {
      if (!phraseGroundedInDump(v, dump) && p.includes(v)) reasons.push('invented_protect_in_prose');
    }
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}


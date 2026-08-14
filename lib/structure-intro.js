/** JudgmentOS 導入部: 吐き出しテキスト → 実現／守る の抽出 */

import {
  buildExtractStructureSystem,
  extractStructureFromDump,
  sanitizeStructure,
  structureToLegacy
} from './judgment-structure.js';

export const INTRO_CATEGORIES = [
  {
    id: 'strategy',
    title: '戦略・投資・撤退',
    hint: '新規事業、予算配分、事業のやめ時'
  },
  {
    id: 'org',
    title: '組織・人・意思決定',
    hint: 'アサイン、評価、チームの衝突'
  },
  {
    id: 'ai_dissonance',
    title: 'AIや提案への『違和感』',
    hint: '上がってきた提案・AIの回答に納得がいかない'
  },
  {
    id: 'vague',
    title: 'とにかくモヤモヤしている',
    hint: 'テーマがまだ定まっていない'
  }
];

export function categoryById(id) {
  return INTRO_CATEGORIES.find((c) => c.id === id) || null;
}

export function buildStructureIntroSystem() {
  return buildExtractStructureSystem();
}

export function buildStructureIntroUser({ categoryId, categoryLabel, dumpText }) {
  return `【カテゴリ】
${categoryLabel || categoryId || '（未選択）'}

【吐き出し】
${dumpText}

上記から JSON だけを返してください。`;
}

/** APIキーなし／失敗時：判断構造ヒューリスティック（存在しない守る／境界は作らない） */
export function mockStructureIntro({ dumpText }) {
  const structure = extractStructureFromDump(dumpText);
  const legacy = structureToLegacy(structure);
  return {
    realization: legacy.realization,
    protection: legacy.protection,
    constraints_recommend: [],
    structure
  };
}

export function parseStructureIntroJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  let jsonStr = text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) jsonStr = fenced[1].trim();
  else {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) jsonStr = text.slice(start, end + 1);
  }
  try {
    const obj = JSON.parse(jsonStr);
    const realization = String(obj.realization || obj.achieve || obj.desiredOutcome || '').trim();
    const protection = String(obj.protection || obj.protect || '').trim();
    let tags = obj.constraints_recommend || obj.constraints || [];
    if (!Array.isArray(tags)) tags = [];
    tags = tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 6);
    const structure = sanitizeStructure(obj.decisionTheme != null || obj.desiredOutcome != null || obj.protectedValues
      ? obj
      : { desiredOutcome: realization, protectedValues: protection ? [protection] : [] }, '');
    if (!structure.desiredOutcome && realization) structure.desiredOutcome = realization;
    return {
      realization: structure.desiredOutcome || realization,
      protection: structure.protectedValues[0] || protection,
      constraints_recommend: tags,
      structure
    };
  } catch {
    return null;
  }
}

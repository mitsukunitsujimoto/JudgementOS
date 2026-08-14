/** JudgmentOS 2.0: 案件の話から判断原則を言語化する（診断ではない） */

import {
  applyEditsToStructure,
  extractStructureFromDump,
  generateCoreFromStructure,
  generateHandoffFromStructure,
  generatePrincipleFromStructure,
  handoffLooksHijacked,
  sanitizeStructure
} from './judgment-structure.js';

export function buildInferPrincipleSystem() {
  return `あなたは経営者の判断を代行しません。答えや最適案も出しません。
具体的な案件の発言から、判断原則と「AIに渡す」依頼文を作ります。
性格タイプ・価値観ラベルは禁止です。

最重要:
守ることを判断の目的にしない。
実現したいことは方向を決める。守りたいものは進み方を決める。境界条件は越えてはいけない線を決める。
「守るために何をするか」ではなく「実現するために、何を守りながら進むか」。

3つの概念を混同しない:
1) 実現したいこと＝判断の目的（向かう状態）
2) 守りたいもの＝目的ではない。過程で安易に犠牲にしたくないもの
3) 境界条件＝選択肢を評価・除外する線。目的ではない

禁止:
- 「AもBもCも大切」という価値観の羅列
- 境界条件（例: 収益が得られない状態が続くと継続できない）を目的に変換し、「その状況を避けるための選択肢を提示」と書くこと
- 回避・維持だけを realization として扱うこと

判断原則 principle は次の型:
「○○を実現する。その際、△△は安易に犠牲にしない。また、□□を超える選択は採らない。」
口調は「今回の対話からは、あなたは…のように見えます。」

handoff は内部ラベル（Desired Outcome 等）を出さない自然な日本語。
存在する情報だけ使う。Protected Value がなければ守る文は書かない。Boundary がなければ境界の文は書かない。
依頼の主語は常に目的の実現。「避けるための選択肢」「守るための選択肢」は禁止。
比較: 成果、失うもの、リスク、長期的な信頼。守るものか境界があるときだけ衝突点も。
最後は「最終判断は私が行います。」

境界が本人の言葉にないなら推測で断定しない。
本人が書いていない事実を作らない。
次のJSONだけを返してください。
{
  "principle": "…",
  "core": "進む方向と進み方の関係を1文",
  "handoff": "…"
}
JSON以外は出力しない。`;
}

export function buildInferPrincipleUser(p) {
  const x = p || {};
  const struct = x.structure
    ? JSON.stringify(x.structure)
    : '(未抽出。下の発話から構造を推定し、ない守る／境界は作らない)';
  return `【確定した判断構造（内部。ない欄は空）】
${struct}

【気になっていること】
${x.dump || '（未記入）'}

【画面上の実現したいこと】
${x.achieve || '（未記入）'}

【画面上の守りたいもの】
${x.protect || '（なし）'}

【境界の答え】
${x.boundary || '（なし）'}

構造と発話が食い違うときは発話を優先し、存在しない守る／境界は書かない。
JSON だけ返してください。`;
}

function structureFromPayload(p) {
  const x = p || {};
  if (x.structure && typeof x.structure === 'object') {
    return applyEditsToStructure(sanitizeStructure(x.structure, x.dump), {
      dump: x.dump,
      achieve: x.achieve,
      protect: x.protect,
      boundary: x.boundary
    });
  }
  const extracted = extractStructureFromDump(x.dump);
  return applyEditsToStructure(extracted, {
    dump: x.dump,
    achieve: x.achieve,
    protect: x.protect,
    boundary: x.boundary
  });
}

export function mockInferPrinciple(p) {
  const st = structureFromPayload(p);
  return {
    principle: generatePrincipleFromStructure(st),
    core: generateCoreFromStructure(st),
    handoff: generateHandoffFromStructure(st),
    structure: st
  };
}

export function parseInferPrincipleJson(raw) {
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
    if (!obj || typeof obj !== 'object') return null;
    const principle = String(obj.principle || '').trim();
    const core = String(obj.core || '').trim();
    let handoff = String(obj.handoff || '').trim();
    if (!principle || !handoff) return null;
    if (handoffLooksHijacked(handoff)) return null;
    if (/実現したいこと：|守りたいもの：|境界条件：/.test(handoff)) return null;
    return { principle, core, handoff };
  } catch {
    return null;
  }
}

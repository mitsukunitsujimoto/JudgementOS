/** JudgmentOS 2.0: 案件の話から判断原則を言語化する（診断ではない） */

import {
  buildHandoffFromAxes,
  buildPrincipleFromAxes,
  looksLikeAvoidancePurpose
} from './axes-roles.js';

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

handoff は必ずこの順の日本語:
A. 判断テーマ（何について判断しているか）
B. 実現したいこと（目的。ここに向かう選択肢を求める）
C. 守りたいもの（進み方。目的ではないと分かる書き方）
D. 境界条件があれば、除外条件として書く（目的にしない）
E. 目的をできる限り実現できる複数の選択肢を提示する、と依頼する
F. 各選択肢について成果・失うもの・リスク・長期的な信頼・判断基準や境界条件との衝突
G. 最終判断は私が行います

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
  return `【気になっていること／判断テーマの材料】
${x.dump || '（未記入）'}

【実現したいこと（判断の方向。回避だけなら目的として弱い）】
${x.achieve || '（未記入）'}

【守りたいもの（目的ではない。進み方）】
${x.protect || '（未記入）'}

【なぜ守りたいか】
${x.whyProtect || '（未記入）'}

【境界条件（除外線。目的にしない）】
${x.boundary || '（未記入）'}

【動かせない条件】
${x.constraints || '（未記入）'}

【内部メモ・論点の抜粋（あれば）】
${x.ronten || '（なし）'}

実現したいことが回避だけに見える場合は、発話全体から本来の目的を推定して principle / handoff のBに置く。推定できないなら断定しない。
上記から JSON だけを返してください。`;
}

export function mockInferPrinciple(p) {
  const x = p || {};
  let achieve = (x.achieve || '').trim() || '向かいたい変化';
  const protect = (x.protect || '').trim() || '崩したくないもの';
  if (looksLikeAvoidancePurpose(achieve) && String(x.dump || '').trim()) {
    const dump = String(x.dump).replace(/\s+/g, ' ').trim();
    if (dump.length >= 8) achieve = dump.slice(0, 120);
  }
  const payload = { ...x, achieve, protect };
  return {
    principle: buildPrincipleFromAxes(payload),
    core: `進む方向は「${achieve}」。進み方として「${protect}」を安易に犠牲にしない。`,
    handoff: buildHandoffFromAxes(payload)
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
    if (/避けるための選択肢/.test(handoff) && !/実現したい/.test(handoff)) {
      return null;
    }
    return { principle, core, handoff };
  } catch {
    return null;
  }
}

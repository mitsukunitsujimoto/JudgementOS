/** JudgmentOS 2.0: 案件の話から判断原則を言語化する（診断ではない） */

export function buildInferPrincipleSystem() {
  return `あなたは経営者の判断を代行しません。答えや最適案も出しません。
具体的な案件の発言から、「この人は何を基準に判断しようとしているか」を一文〜三文で言語化します。
性格タイプ・価値観ラベル（例:  typo 診断、色分けタイプ）は禁止です。
次のJSONだけを返してください。前後の説明は不要です。
{
  "principle": "今回の対話からは、あなたは○○を重視しているように見えます。……",
  "core": "今回の判断で、いちばん核になっている緊張や核心（1文）",
  "handoff": "生成AIへそのまま貼れる依頼文。最終判断は本人が行うと明記。複数の選択肢と、成果・失うもの・リスク・長期的な信頼への影響を求める。"
}
ルール:
- principle は断定しすぎない。「〜のように見えます」を基本にする。
- 本人が書いていない事実を作らない。実現したいことと守りたいものの緊張から読む。
- handoff は日本語。最終判断は私が行います、と書く。
- JSON以外は出力しない。`;
}

export function buildInferPrincipleUser(p) {
  const x = p || {};
  return `【気になっていること】
${x.dump || '（未記入）'}

【実現したいこと】
${x.achieve || '（未記入）'}

【守りたいもの】
${x.protect || '（未記入）'}

【なぜ守りたいか】
${x.whyProtect || '（未記入）'}

【動かせない条件】
${x.constraints || '（未記入）'}

【内部メモ・論点の抜粋（あれば）】
${x.ronten || '（なし）'}

上記から JSON だけを返してください。`;
}

export function mockInferPrinciple(p) {
  const x = p || {};
  const achieve = (x.achieve || '').trim() || '向かいたい変化';
  const protect = (x.protect || '').trim() || '崩したくないもの';
  const principle = `今回の対話からは、あなたは「${protect}」を損なわない範囲で、「${achieve}」へ進もうとしているように見えます。短期の正しさだけで切らず、引き受けられる判断を残そうとしているように読めます。`;
  const core = `「${achieve}」と「${protect}」の両立が、今回の判断の核です。`;
  const handoff = `私は今回の判断において、次を重視しています。
実現したいこと：${achieve}
守りたいもの：${protect}
${x.constraints ? `動かせない条件：${x.constraints}\n` : ''}
以下のテーマを検討する際には、この判断基準を前提として、複数の選択肢を示してください。
各選択肢について、
・期待できる成果
・失う可能性のあるもの
・主なリスク
・長期的な信頼への影響
を整理してください。
最終判断は私が行います。`;
  return { principle, core, handoff };
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
    const handoff = String(obj.handoff || '').trim();
    if (!principle || !handoff) return null;
    return { principle, core, handoff };
  } catch {
    return null;
  }
}

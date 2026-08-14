/** JudgmentOS 2.0: 案件の話から判断原則を言語化する（診断ではない） */

export function buildInferPrincipleSystem() {
  return `あなたは経営者の判断を代行しません。答えや最適案も出しません。
具体的な案件の発言から、「この人は何を基準に判断しようとしているか」を言語化します。
性格タイプ・価値観ラベルは禁止です。
判断原則は、大切にしていることの列挙で終わらせないでください。
「何を実現したいか」＋「何を守りたいか」＋（分かる範囲で）「両者が衝突したとき、何が失われるなら選ばないか」まで含めてください。
境界が本人の言葉にないなら、推測で断定しない。
次のJSONだけを返してください。前後の説明は不要です。
{
  "principle": "今回の対話からは、あなたは…のように見えます。衝突時の境界が言えているならそれも含める。",
  "core": "今回の判断で、いちばん核になっている緊張や核心（1文）",
  "handoff": "生成AIへそのまま貼れる依頼文。判断基準の境界条件があれば含める。衝突する点があれば明示するよう求める。最終判断は本人。"
}
ルール:
- principle は断定しすぎない。「〜のように見えます」を基本にする。
- 本人が書いていない事実を作らない。
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

【衝突したとき失われたら選ばないもの（境界）】
${x.boundary || '（未記入）'}

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
  const boundary = (x.boundary || '').trim();
  const principle = boundary
    ? `今回の対話からは、あなたは「${achieve}」を目指しつつ、「${protect}」を崩したくないように見えます。特に、${boundary}という境界があるように読めます。`
    : `今回の対話からは、あなたは「${protect}」を損なわない範囲で、「${achieve}」へ進もうとしているように見えます。`;
  const core = `「${achieve}」と「${protect}」の両立が、今回の判断の核です。`;
  const handoff = `私は今回の判断において、次を重視しています。
実現したいこと：${achieve}
守りたいもの：${protect}
${boundary ? `失われたら選ばないこと：${boundary}\n` : ''}${x.constraints ? `動かせない条件：${x.constraints}\n` : ''}
この判断基準を前提として、複数の選択肢を示してください。
各選択肢について、
・期待できる成果
・失う可能性のあるもの
・主なリスク
・長期的な信頼への影響
を比較してください。
また、私の判断基準と衝突する点があれば、それも明示してください。
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

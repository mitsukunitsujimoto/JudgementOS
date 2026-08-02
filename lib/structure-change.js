/** JudgmentOS 映し返し: 過去ログとの変化提示 */

export function buildPastLogSummary(entry, themeTitle) {
  if (!entry) return '';
  const g = entry.criteriaGrowth || {};
  const parts = [
    themeTitle ? `テーマ: ${themeTitle}` : '',
    entry.achieve ? `実現したいこと: ${entry.achieve}` : '',
    entry.protect ? `守りたいもの: ${entry.protect}` : '',
    entry.constraints ? `制約: ${entry.constraints}` : '',
    g.criteriaChange ? `判断基準の変化: ${g.criteriaChange}` : '',
    g.truePurpose ? `本当の目的: ${g.truePurpose}` : '',
    g.nowMe ? `当時の自分: ${g.nowMe}` : '',
    g.firstMe ? `最初の自分: ${g.firstMe}` : '',
    (entry.contextAfter || entry.contextBefore)
      ? `判断文脈:\n${String(entry.contextAfter || entry.contextBefore).slice(0, 1200)}`
      : ''
  ].filter(Boolean);
  return parts.join('\n');
}

export function buildStructureChangeSystem() {
  return `あなたは経営者の思考の変化を映し返す補助役です。答えや最適案は出しません。
過去の判断ログと、今回の入力を比較し、次のJSONだけを返してください。前後の説明は不要です。
{
  "previous_you": "【以前のあなた】過去の判断文脈の要約（2〜4文）",
  "now_suggestion": "【今のあなたは、こうでは？】今回の言葉から読み取れる、変化・進化した判断基準（2〜4文）"
}
ルール:
- 断定しすぎない。「こうでは？」のトーンで提案する。
- 変化がないように見える場合も、微かな重心の違いを言葉にする。
- JSON以外は出力しない。`;
}

export function buildStructureChangeUser({ pastSummary, currentDump, realization, protection, categoryLabel }) {
  return `【過去の判断基準ログ（最新1件）】
${pastSummary || '（なし）'}

【今回のカテゴリ】
${categoryLabel || '（未選択）'}

【今回の吐き出し】
${currentDump || '（なし）'}

【今回抽出された軸】
実現したいこと: ${realization || '（なし）'}
守りたいもの: ${protection || '（なし）'}

上記から JSON だけを返してください。`;
}

export function mockStructureChange({ pastSummary, realization, protection }) {
  const pastLine = String(pastSummary || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
  return {
    previous_you: pastLine
      ? `以前のあなたは、次のような軸で考えていました。${pastLine}`
      : '以前のあなたは、そのときの判断文脈のなかで、実現と守るのバランスを探っていました。',
    now_suggestion: (realization && protection)
      ? `今のあなたは、「${realization}」を目指しつつ、「${protection}」を崩さないことを、よりはっきり言葉にしようとしているようです。`
      : '今のあなたは、前回より自分の言葉で軸を言い直そうとしているようです。'
  };
}

export function parseStructureChangeJson(raw) {
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
    const previous_you = String(obj.previous_you || obj.previousYou || obj.before || '').trim();
    const now_suggestion = String(obj.now_suggestion || obj.nowSuggestion || obj.now || '').trim();
    if (!previous_you || !now_suggestion) return null;
    return { previous_you, now_suggestion };
  } catch {
    return null;
  }
}

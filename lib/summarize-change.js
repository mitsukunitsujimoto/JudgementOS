/** JudgmentOS: 振り返り後の「思考の変化」サマリー */

export function buildSummarizeChangeSystem() {
  return `あなたは経営者の思考の変化を、本人の言葉を尊重して要約する補助役です。
答えや次の打ち手は提案しません。本人が書いた振り返りを材料に、印刷して残せる短いサマリーだけを作ります。
次のJSONだけを返してください。前後の説明は不要です。
{
  "headline": "今回の変化を一言で（20〜40字程度）",
  "before_summary": "以前の考え方の要約（2〜3文）",
  "after_summary": "今の考え方の要約（2〜3文）",
  "criteria_shift": "判断基準の変化（2〜3文）",
  "takeaway": "次に提案やAIの答えと向き合うときの、自分への一文"
}
ルール:
- 本人の言葉を勝手に美化しすぎない。書いていない結論を足さない。
- 「正解になった」などと断定しない。
- JSON以外は出力しない。`;
}

export function buildSummarizeChangeUser(payload) {
  const p = payload || {};
  return `【テーマ】
${p.theme || '（未記入）'}

【実現したいこと】
${p.achieve || '（未記入）'}

【守りたいもの】
${p.protect || '（未記入）'}

【振り返り① 最初の私】
${p.firstMe || '（未記入）'}

【振り返り② 今の私】
${p.nowMe || '（未記入）'}

【振り返り③ 一番変化した判断基準】
${p.criteriaChange || '（未記入）'}

【振り返り④ 本当の目的】
${p.truePurpose || '（未記入）'}

上記から JSON だけを返してください。`;
}

export function mockSummarizeChange(payload) {
  const p = payload || {};
  const first = (p.firstMe || '').trim();
  const now = (p.nowMe || '').trim();
  const change = (p.criteriaChange || '').trim();
  const purpose = (p.truePurpose || '').trim();
  return {
    headline: change
      ? (change.length > 42 ? `${change.slice(0, 40)}…` : change)
      : '判断の軸が、言葉として残せるところまで近づいた',
    before_summary: first
      ? `以前のあなたは、次のように考えていました。${first}`
      : '以前のあなたは、まだ判断の軸を十分には言葉にしていませんでした。',
    after_summary: now
      ? `今のあなたは、次のように考えるようになっています。${now}`
      : '今のあなたは、実現したいことと守りたいものを並べて見られるようになっています。',
    criteria_shift: change
      ? `いちばん大きく変わったのは、次の判断基準です。${change}`
      : '判断の重みの置き方が、以前よりはっきりしてきています。',
    takeaway: purpose
      ? `次に提案やAIの答えを見るとき、「${purpose}」に照らして問い返す。`
      : '次に提案やAIの答えを見るとき、今日残した判断基準で一度問い返す。'
  };
}

export function parseSummarizeChangeJson(raw) {
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
    const headline = String(obj.headline || obj.title || '').trim();
    const before_summary = String(obj.before_summary || obj.before || '').trim();
    const after_summary = String(obj.after_summary || obj.after || '').trim();
    const criteria_shift = String(obj.criteria_shift || obj.criteriaChange || '').trim();
    const takeaway = String(obj.takeaway || obj.next || '').trim();
    if (!headline || !before_summary || !after_summary) return null;
    return {
      headline,
      before_summary,
      after_summary,
      criteria_shift: criteria_shift || headline,
      takeaway: takeaway || '今日残した判断基準で、一度問い返す。'
    };
  } catch {
    return null;
  }
}

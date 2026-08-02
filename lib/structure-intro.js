/** JudgmentOS 導入部: 吐き出しテキスト → 実現／守る の抽出 */

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
  return `あなたは経営者の思考を整理する補助役です。答えや最適案は出しません。
与えられた「カテゴリ」と「吐き出しテキスト」から、次のJSONだけを返してください。前後の説明は不要です。
{
  "realization": "実現したいこと（1文）",
  "protection": "守りたいもの・譲れないこと（1文）",
  "constraints_recommend": ["制約タグ候補1", "制約タグ候補2"]
}
ルール:
- realization / protection は断定しすぎず、本人の言葉を要約する。
- constraints_recommend は0〜4個。短い名詞句。
- JSON以外は出力しない。`;
}

export function buildStructureIntroUser({ categoryId, categoryLabel, dumpText }) {
  return `【カテゴリ】
${categoryLabel || categoryId || '（未選択）'}

【吐き出し】
${dumpText}

上記から JSON だけを返してください。`;
}

/** APIキーなし／失敗時のダミー抽出 */
export function mockStructureIntro({ categoryId, dumpText }) {
  const text = String(dumpText || '').replace(/\s+/g, ' ').trim();
  const snippet = text.length > 48 ? `${text.slice(0, 48)}…` : text;
  const byCat = {
    strategy: {
      realization: snippet
        ? `${snippet}を踏まえ、将来の打ち手を自分の基準で決められる状態にしたい`
        : '投資や撤退の判断を、数字だけでなく自分の基準で決められる状態にしたい',
      protection: '現場の判断責任と、安易な拡大・縮小で失われる信頼',
      constraints_recommend: ['予算の上限', '撤退の条件', '時間軸']
    },
    org: {
      realization: snippet
        ? `${snippet}を整理し、人と組織の意思決定が噛み合う形にしたい`
        : '人と組織の意思決定が噛み合い、衝突が建設的になる状態にしたい',
      protection: '一人ひとりの尊厳と、チームの信頼関係',
      constraints_recommend: ['役割の明確さ', '評価の公正', '対話の時間']
    },
    ai_dissonance: {
      realization: snippet
        ? `「${snippet}」という違和感を言葉にし、問い返せる判断軸を持ちたい`
        : 'AIや提案の答えに飲み込まれず、自分の問い返しができる状態にしたい',
      protection: '判断を引き受ける人の責任と、答え依存にしない文化',
      constraints_recommend: ['説明可能性', '最終判断者', '前提の共有']
    },
    vague: {
      realization: snippet
        ? `${snippet}の奥にある、本当に向かいたい姿をはっきりさせたい`
        : 'モヤモヤの奥にある、本当に向かいたい姿をはっきりさせたい',
      protection: '焦って結論を急がず、自分の感覚を粗末にしないこと',
      constraints_recommend: ['今は決めなくてよい範囲', '最低限守りたいこと']
    }
  };
  const hit = byCat[categoryId] || byCat.vague;
  return {
    realization: hit.realization,
    protection: hit.protection,
    constraints_recommend: hit.constraints_recommend.slice()
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
    const realization = String(obj.realization || obj.achieve || '').trim();
    const protection = String(obj.protection || obj.protect || '').trim();
    if (!realization || !protection) return null;
    let tags = obj.constraints_recommend || obj.constraints || [];
    if (!Array.isArray(tags)) tags = [];
    tags = tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 6);
    return { realization, protection, constraints_recommend: tags };
  } catch {
    return null;
  }
}

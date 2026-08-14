/** 判断基準間の緊張を検出し、必要なときだけ一問を返す（ランキングではない） */

const BOUNDARY_CUE = /失われ.*なら|失いたくないなら|選ばない|たとえ.{0,12}でも|多少.{0,8}低く|譲れない|守れない相手|低くても|収益.{0,8}だけ|一貫性を失/;

const GAIN = /収益|売上|利益|成長|拡大|スピード|効率|成果|価格|売却|伸ば/;
const KEEP = /信頼|一貫|雇用|社員|顧客|ブランド|貢献|尊厳|文化|関係|安全|社会|還元|蓄積/;

export function alreadyHasBoundary(text) {
  return BOUNDARY_CUE.test(String(text || ''));
}

export function heuristicTension(p) {
  const x = p || {};
  const blob = `${x.dump || ''} ${x.achieve || ''} ${x.protect || ''} ${x.whyProtect || ''}`;
  if (alreadyHasBoundary(blob)) return false;
  if (/(どちらも|両方|悩んで|迷って|両立|トレード)/.test(blob)) return true;
  const gain = GAIN.test(`${x.achieve} ${x.dump}`);
  const keep = KEEP.test(`${x.protect} ${x.dump}`);
  if (gain && keep) return true;
  const a = String(x.achieve || '').trim();
  const pr = String(x.protect || '').trim();
  if (a.length >= 16 && pr.length >= 16 && a.slice(0, 20) !== pr.slice(0, 20)) return true;
  return false;
}

export function mockDetectBoundary(p) {
  const x = p || {};
  const blob = `${x.dump || ''} ${x.achieve || ''} ${x.protect || ''} ${x.whyProtect || ''}`;
  if (alreadyHasBoundary(blob) || !heuristicTension(x)) {
    return { needs_question: false, question: '', reason: 'clear_or_weak' };
  }
  const protect = String(x.protect || '').trim() || '守りたいもの';
  const achieve = String(x.achieve || '').trim() || '向かいたいこと';
  return {
    needs_question: true,
    question: `すべてを同時には満たせないとしたら、「${protect}」が失われる選択はしない、ということでよいですか。違うなら、失われたら選ばないものは何でしょう？`,
    reason: 'heuristic'
  };
}

export function buildDetectBoundarySystem() {
  return `あなたは経営者の判断を代行しません。性格診断もしません。
与えられた発話から、判断基準が複数あり、現実の選択で同時に満たせない可能性があるかを見ます。
すでに「これが失われるなら選ばない」という境界が本人の言葉にあるなら、質問は不要です。
実現したいことと守りたいものが両方あり、収益・成長と信頼・一貫・貢献などが同時に出ていて、境界がまだ無いなら needs_question は true にしてください。
質問が必要なときだけ、順位づけではなく境界条件を聞く一問を、本人の言葉を使って作ります。
「1位2位をつけて」は禁止。「トレードオフを検出しました」のような説明も禁止。
次のJSONだけを返してください。
{
  "needs_question": true,
  "question": "一つだけ確認する自然な日本語の一問。空でもよい",
  "reason": "内部用の短い理由"
}
needs_question が false なら question は空文字。
JSON以外は出力しない。`;
}

export function buildDetectBoundaryUser(p) {
  const x = p || {};
  return `【発話】
${x.dump || '（未記入）'}

【実現したいこと】
${x.achieve || '（未記入）'}

【守りたいもの】
${x.protect || '（未記入）'}

【すでに出ている理由】
${x.whyProtect || '（なし）'}

複数の判断基準があり、現実の選択で同時に満たせない可能性があるが、境界がまだ無いときだけ needs_question を true にしてください。`;
}

export function parseDetectBoundaryJson(raw) {
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
    const needs = !!obj.needs_question;
    const question = String(obj.question || '').trim();
    return {
      needs_question: needs && question.length >= 8,
      question: needs ? question : '',
      reason: String(obj.reason || '').trim()
    };
  } catch {
    return null;
  }
}

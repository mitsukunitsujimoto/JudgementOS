/** 実現（方向）／守る（進み方）／境界（除外線）の非対称。守ることを目的にしない。 */

export const AVOID_CUE = /失いたくない|避けたい|失敗したくない|維持したい|壊したくない|落としたくない|取りたくない|犠牲にしたくない|崩したくない|継続できない|リスクを取りたくない/;
export const PURPOSE_CUE = /実現|伸ば|つくる|つくり|提供|成立|使う|貢献|向か|目指|到達|生み|広げ|市場|事業/;

export function looksLikeAvoidancePurpose(text) {
  const t = String(text || '');
  if (!t.trim()) return true;
  if (/避けるための選択肢|状況を避けるための/.test(t)) return true;
  return AVOID_CUE.test(t) && !PURPOSE_CUE.test(t);
}

export function themeFromDump(dump) {
  const line = String(dump || '').split(/\n/).map((l) => l.trim()).find(Boolean) || '';
  return line.slice(0, 160);
}

export function splitDumpToAxes(dump) {
  const text = String(dump || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const parts = text.split(/ただし|一方で|けれど|しかし|が、/);
  if (parts.length < 2) return null;
  let realization = parts[0].trim();
  let protection = parts.slice(1).join(' ').trim();
  if (looksLikeAvoidancePurpose(realization) && PURPOSE_CUE.test(protection)) {
    const tmp = realization;
    realization = protection;
    protection = tmp;
  }
  if (realization.length < 4 || protection.length < 4) return null;
  return {
    realization: realization.slice(0, 180),
    protection: protection.slice(0, 180)
  };
}

export function buildHandoffFromAxes(x) {
  const dump = String(x.dump || '').trim();
  const achieve = String(x.achieve || '').trim() || '向かいたい変化';
  const protect = String(x.protect || '').trim() || '安易に失いたくないもの';
  const boundary = String(x.boundary || '').trim();
  const constraints = String(x.constraints || '').trim();
  const theme = themeFromDump(dump) || '今回の判断';
  return `私は、${theme}について判断しようとしています。

この判断によって実現したいのは、次です。
${achieve}

その実現に向かう過程で、次は安易に失いたくありません（これは目的ではなく、進み方です）。
${protect}

${boundary ? `また、次は境界条件です。ここを超える選択は採りません／継続しません（目的ではありません。選択肢を評価・除外する条件です）。
${boundary}
` : ''}${constraints ? `動かせない条件：${constraints}
` : ''}
これらを前提として、上記の実現したいことに向かう複数の選択肢を提示してください。
「避けたい状況を避けるため」の選択肢だけに寄せないでください。目的は実現したいことのほうです。
それぞれについて、
・期待できる成果
・失う可能性のあるもの
・主要なリスク
・長期的な信頼への影響
を比較してください。
また、私の判断基準や境界条件と衝突する点があれば明示してください。
最終判断は私が行います。`;
}

export function buildPrincipleFromAxes(x) {
  const achieve = String(x.achieve || '').trim() || '向かいたい変化';
  const protect = String(x.protect || '').trim() || '安易に失いたくないもの';
  const boundary = String(x.boundary || '').trim();
  const tail = boundary
    ? `また、「${boundary}」を超える選択は採らない、という線があるように見えます。`
    : '';
  return `今回の対話からは、あなたは「${achieve}」を実現しようとしているように見えます。その際、「${protect}」は安易に犠牲にしない。${tail}`;
}

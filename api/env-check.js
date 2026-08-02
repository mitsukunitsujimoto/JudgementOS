/**
 * 診断用: 秘密の値は返さない。
 * 確認後に削除してよい。
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const keyNames = Object.keys(process.env)
    .filter((k) => /OPEN|API|KEY|GPT|AI_/i.test(k))
    .sort();

  const raw = process.env.OPENAI_API_KEY;
  return res.status(200).json({
    ok: true,
    hasOpenAIKey: Boolean(raw && String(raw).trim()),
    keyLength: raw ? String(raw).trim().length : 0,
    keyPrefix: raw && String(raw).trim() ? String(raw).trim().slice(0, 7) : null,
    relatedEnvNames: keyNames,
    hasModel: Boolean(process.env.OPENAI_MODEL && String(process.env.OPENAI_MODEL).trim()),
    modelDefault: process.env.OPENAI_MODEL || 'gpt-4o',
    nodeEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || null,
    vercelEnv: process.env.VERCEL_ENV || null
  });
}

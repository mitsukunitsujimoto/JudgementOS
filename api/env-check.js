/**
 * 診断用: 秘密は返さない。OPENAI_API_KEY の有無だけ。
 * 確認後に削除してよい。
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return res.status(200).json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim()),
    hasModel: Boolean(process.env.OPENAI_MODEL && String(process.env.OPENAI_MODEL).trim()),
    modelDefault: process.env.OPENAI_MODEL || 'gpt-4o',
    nodeEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || null
  });
}

import { saveDecisionSession } from '../lib/save-decision-session.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ saved: false, reason: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

  const result = await saveDecisionSession(body);

  if (!result.saved && result.reason === 'DATABASE_URL is not configured') {
    return res.status(200).json(result);
  }

  if (!result.saved) {
    return res.status(result.reason === 'raw_input is required' ? 400 : 500).json(result);
  }

  return res.status(201).json(result);
}

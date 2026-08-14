/** 本番ではモックに逃げない。開発・明示デモのみ許可。 */

export function allowMockFallback() {
  const flag = String(process.env.ALLOW_MOCK_FALLBACK || '').trim().toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  const vercel = String(process.env.VERCEL_ENV || '').toLowerCase();
  if (vercel === 'production' || vercel === 'preview') return false;
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') return false;
  return true;
}

export const USER_ERROR = {
  network: 'うまく接続できませんでした。入力内容は残っています。もう一度お試しください。',
  timeout: 'うまく接続できませんでした。入力内容は残っています。もう一度お試しください。',
  rate_limit: '現在、AIによる整理を行えません。少し時間をおいて、もう一度お試しください。',
  config: '判断基準の整理を完了できませんでした。入力内容は残っています。',
  parse: '判断基準の整理を完了できませんでした。入力内容は残っています。',
  validation: '判断基準の整理を完了できませんでした。入力内容は残っています。',
  semantic_validation: '今回は判断基準を十分な精度で整理できませんでした。入力内容は残っています。もう一度試すか、少し言葉を加えてください。',
  regeneration_failed: '今回は判断基準を十分な精度で整理できませんでした。入力内容は残っています。もう一度試すか、少し言葉を加えてください。'
};

export function userErrorMessage(code) {
  return USER_ERROR[code] || USER_ERROR.config;
}

export function failPayload(code, extra) {
  return {
    ok: false,
    code,
    reason: userErrorMessage(code),
    retryable: code !== 'config',
    ...(extra || {})
  };
}

export function logJosFailure(code, note) {
  const safe = String(note || '')
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .slice(0, 240);
  console.error(`[jos-fail] ${code} ${safe}`);
}

export function classifyHttpStatus(status) {
  const n = Number(status) || 0;
  if (n === 429) return 'rate_limit';
  if (n === 401 || n === 403) return 'config';
  if (n >= 500) return 'network';
  if (n >= 400) return 'validation';
  return 'network';
}

export async function callOpenAiJson({ apiKey, model, temperature, maxTokens, messages, timeoutMs }) {
  const ctrl = new AbortController();
  const ms = timeoutMs || 28000;
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: temperature == null ? 0.4 : temperature,
        max_tokens: maxTokens || 1000,
        response_format: { type: 'json_object' },
        messages
      }),
      signal: ctrl.signal
    });
    if (!upstream.ok) {
      const code = classifyHttpStatus(upstream.status);
      logJosFailure(code, `openai_http_${upstream.status}`);
      return { ok: false, code };
    }
    let data;
    try {
      data = await upstream.json();
    } catch (e) {
      logJosFailure('parse', 'openai_body_json');
      return { ok: false, code: 'parse' };
    }
    const content = data?.choices?.[0]?.message?.content || '';
    return { ok: true, content, model };
  } catch (e) {
    const name = e && e.name;
    const code = name === 'AbortError' ? 'timeout' : 'network';
    logJosFailure(code, name || 'fetch');
    return { ok: false, code };
  } finally {
    clearTimeout(t);
  }
}

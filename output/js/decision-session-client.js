/**
 * 意思決定セッションをサーバーAPIへ保存（Neon Postgres）。
 * DATABASE_URL 未設定時は saved:false で返る。localStorage は別途バックアップ。
 */
(function (global) {
  'use strict';

  const API_PATH = '/api/decision-session';
  const APP_VERSION = 'judgmentos-decision-mirror-1.1.0';

  async function saveDecisionSessionToServer(payload) {
    try {
      const res = await fetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_version: APP_VERSION,
          ...payload
        })
      });

      if (!res.ok) {
        return { saved: false, reason: `HTTP ${res.status}` };
      }

      return await res.json();
    } catch {
      return { saved: false, reason: 'Network error' };
    }
  }

  function buildPayloadFromInference(input, data, userPremise) {
    return {
      raw_input: input,
      premise: data.premise,
      visible: data.visible,
      invisible: data.invisible,
      tensions: data.tensions,
      key_questions: data.key_questions,
      decision_context: data.decision_context,
      context_prompt: data.context_prompt,
      user_premise: userPremise || '',
      ai_version: data.ai_version
    };
  }

  /**
   * localStorage 保存後に呼ぶ。失敗しても例外は投げない。
   */
  async function persistSession(input, data, userPremise) {
    const payload = buildPayloadFromInference(input, data, userPremise);
    const result = await saveDecisionSessionToServer(payload);
    return result;
  }

  global.DecisionSessionClient = {
    APP_VERSION,
    saveDecisionSessionToServer,
    buildPayloadFromInference,
    persistSession
  };
})(typeof window !== 'undefined' ? window : globalThis);

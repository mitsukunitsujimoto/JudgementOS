/**
 * JudgmentOS 招待コード台帳
 *
 * モニターごとに1件ずつ追加する。
 * - 追加: 配列にオブジェクトを足す
 * - 停止: active: false（既存ブラウザの認証も次回から無効）
 * - 削除: 行を消す（同上）
 * - コード変更: code だけ書き換え（既存ユーザーは inviteId で継続可）
 *
 * 将来拡張用フィールド例（未使用でも残してよい）:
 *   maxUses, expiresAt, notes
 */
(function (global) {
  'use strict';

  /** @type {Array<{
   *   id: string,
   *   code: string,
   *   label: string,
   *   active: boolean,
   *   maxUses?: number|null,
   *   expiresAt?: string|null,
   *   notes?: string
   * }>} */
  const INVITE_CODES = [
    {
      id: 'monitor-default-2026',
      code: 'JOS-MONITOR',
      label: 'モニター（標準）',
      active: true,
      notes: '初期モニター用。必要なら差し替え・追加してください。'
    },
    {
      id: 'monitor-shizuoka-2026-07',
      code: 'JOS-SHIZUOKA',
      label: '静岡モニター',
      active: true
    }
  ];

  function normalizeCode(raw) {
    return String(raw || '')
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  function listActive() {
    return INVITE_CODES.filter(x => x && x.active !== false);
  }

  function findById(id) {
    return INVITE_CODES.find(x => x && x.id === id) || null;
  }

  function findByCode(raw) {
    const code = normalizeCode(raw);
    if (!code) return null;
    return listActive().find(x => normalizeCode(x.code) === code) || null;
  }

  /**
   * 将来: maxUses / expiresAt の判定をここに足す
   * @returns {{ ok: true, invite: object } | { ok: false, reason: string }}
   */
  function validateCode(raw) {
    const invite = findByCode(raw);
    if (!invite) {
      return { ok: false, reason: '招待コードが違います。もう一度確認してください。' };
    }
    if (invite.expiresAt) {
      const exp = new Date(invite.expiresAt).getTime();
      if (!Number.isNaN(exp) && Date.now() > exp) {
        return { ok: false, reason: 'この招待コードの利用期間が終わっています。' };
      }
    }
    return { ok: true, invite };
  }

  global.JudgmentOSInviteCodes = {
    INVITE_CODES,
    normalizeCode,
    listActive,
    findById,
    findByCode,
    validateCode
  };
})(typeof window !== 'undefined' ? window : globalThis);

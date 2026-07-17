/**
 * JudgmentOS access — 招待認証（ブラウザ保存）
 *
 * 初回のみ招待コード＋名前を要求し、以後は localStorage で継続。
 * 台帳側で active:false / 削除された招待は、次回から再入力を求める。
 *
 * 将来のサーバ同期を想定し、usageLog（利用日時）と useCount を保持する。
 */
(function (global) {
  'use strict';

  const ACCESS_KEY = 'judgmentos.v13.access';
  const MAX_USAGE_LOG = 50;

  function emptyAccess() {
    return {
      schemaVersion: 1,
      inviteId: '',
      inviteLabel: '',
      displayName: '',
      activatedAt: '',
      lastUsedAt: '',
      useCount: 0,
      usageLog: []
    };
  }

  function loadRaw() {
    try {
      const raw = localStorage.getItem(ACCESS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return Object.assign(emptyAccess(), parsed);
    } catch (_) {
      return null;
    }
  }

  function save(access) {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
  }

  function pushUsage(access, kind) {
    const at = new Date().toISOString();
    access.lastUsedAt = at;
    access.useCount = (access.useCount || 0) + 1;
    const log = Array.isArray(access.usageLog) ? access.usageLog.slice() : [];
    log.push({ at, kind: kind || 'enter' });
    access.usageLog = log.slice(-MAX_USAGE_LOG);
    return access;
  }

  function Codes() {
    return global.JudgmentOSInviteCodes;
  }

  /**
   * 保存済み認証が、いま有効な招待に紐づいているか
   */
  function getAuthorizedAccess() {
    const access = loadRaw();
    if (!access || !access.inviteId || !access.displayName) return null;
    const registry = Codes();
    if (!registry) return null;
    const invite = registry.findById(access.inviteId);
    if (!invite || invite.active === false) return null;
    if (invite.expiresAt) {
      const exp = new Date(invite.expiresAt).getTime();
      if (!Number.isNaN(exp) && Date.now() > exp) return null;
    }
    return access;
  }

  function isAuthorized() {
    return !!getAuthorizedAccess();
  }

  function getProfile() {
    const access = getAuthorizedAccess();
    if (!access) return null;
    return {
      inviteId: access.inviteId,
      inviteLabel: access.inviteLabel || '',
      displayName: access.displayName,
      activatedAt: access.activatedAt,
      lastUsedAt: access.lastUsedAt,
      useCount: access.useCount || 0
    };
  }

  function getDisplayName() {
    const p = getProfile();
    return p ? p.displayName : '';
  }

  function getInviteId() {
    const p = getProfile();
    return p ? p.inviteId : '';
  }

  /**
   * @param {{ code: string, displayName: string }} input
   * @returns {{ ok: true, profile: object } | { ok: false, reason: string }}
   */
  function activate(input) {
    const registry = Codes();
    if (!registry) {
      return { ok: false, reason: '招待コードの設定を読み込めませんでした。' };
    }
    const name = String((input && input.displayName) || '').trim();
    if (!name) {
      return { ok: false, reason: 'お名前（ニックネーム可）を入力してください。' };
    }
    if (name.length > 40) {
      return { ok: false, reason: 'お名前は40文字以内にしてください。' };
    }
    const checked = registry.validateCode(input && input.code);
    if (!checked.ok) return checked;

    const now = new Date().toISOString();
    const access = emptyAccess();
    access.inviteId = checked.invite.id;
    access.inviteLabel = checked.invite.label || '';
    access.displayName = name;
    access.activatedAt = now;
    pushUsage(access, 'activate');
    save(access);

    // 体験データ側にも参加者を紐付ける
    if (global.JudgmentOSStore && typeof global.JudgmentOSStore.setParticipant === 'function') {
      global.JudgmentOSStore.setParticipant({
        displayName: name,
        inviteId: checked.invite.id,
        inviteLabel: checked.invite.label || ''
      });
    }

    return { ok: true, profile: getProfile() };
  }

  /** 利用開始時に呼ぶ（回数・日時の記録） */
  function touch(kind) {
    const access = getAuthorizedAccess();
    if (!access) return null;
    pushUsage(access, kind || 'enter');
    save(access);
    return getProfile();
  }

  function clear() {
    try { localStorage.removeItem(ACCESS_KEY); } catch (_) { /* ignore */ }
  }

  global.JudgmentOSAccess = {
    ACCESS_KEY,
    isAuthorized,
    getProfile,
    getDisplayName,
    getInviteId,
    activate,
    touch,
    clear,
    /** 拡張・デバッグ用 */
    _loadRaw: loadRaw
  };
})(typeof window !== 'undefined' ? window : globalThis);

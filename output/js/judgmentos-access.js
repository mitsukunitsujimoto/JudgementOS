/**
 * JudgmentOS access — 招待認証（ブラウザ保存）
 *
 * 初回のみ招待コード＋名前を要求し、以後は localStorage で継続。
 * 台帳側で active:false / 削除された招待は、次回から再入力を求める。
 * セキュリティ同意: accepted → B解禁 / declined → A固定
 */
(function (global) {
  'use strict';

  const ACCESS_KEY = 'judgmentos.v13.access';
  const MAX_USAGE_LOG = 50;

  function emptyAccess() {
    return {
      schemaVersion: 2,
      inviteId: '',
      inviteCode: '',
      inviteLabel: '',
      displayName: '',
      activatedAt: '',
      lastUsedAt: '',
      useCount: 0,
      usageLog: [],
      securityConsent: '',
      securityConsentAt: ''
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
    // 旧データ互換: inviteCode が空なら台帳から補完
    if (!access.inviteCode && invite.code) {
      access.inviteCode = invite.code;
      save(access);
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
      inviteCode: access.inviteCode || '',
      inviteLabel: access.inviteLabel || '',
      displayName: access.displayName,
      activatedAt: access.activatedAt,
      lastUsedAt: access.lastUsedAt,
      useCount: access.useCount || 0,
      securityConsent: access.securityConsent || '',
      securityConsentAt: access.securityConsentAt || ''
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

  function getInviteCode() {
    const p = getProfile();
    return p ? (p.inviteCode || '') : '';
  }

  /** '' | 'accepted' | 'declined' */
  function getSecurityConsent() {
    const p = getProfile();
    return p ? (p.securityConsent || '') : '';
  }

  function hasSecurityDecision() {
    const c = getSecurityConsent();
    return c === 'accepted' || c === 'declined';
  }

  function canUseBuiltinAi() {
    if (isDevModeLocal()) return true;
    return getSecurityConsent() === 'accepted';
  }

  function isDevModeLocal() {
    try {
      if (new URLSearchParams(location.search).get('dev') === '1') return true;
      if (localStorage.getItem('judgmentos.dev') === '1') return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  function setSecurityConsent(value) {
    const access = getAuthorizedAccess();
    if (!access && !isDevModeLocal()) {
      return { ok: false, reason: '先に招待コードを入力してください。' };
    }
    const v = value === 'accepted' || value === 'declined' ? value : '';
    if (!v) return { ok: false, reason: '同意の選択が不正です。' };

    if (access) {
      access.securityConsent = v;
      access.securityConsentAt = new Date().toISOString();
      pushUsage(access, v === 'accepted' ? 'security_accept' : 'security_decline');
      save(access);
    } else if (isDevModeLocal()) {
      const draft = loadRaw() || emptyAccess();
      draft.securityConsent = v;
      draft.securityConsentAt = new Date().toISOString();
      if (!draft.displayName) draft.displayName = 'dev';
      if (!draft.inviteId) draft.inviteId = 'dev';
      save(draft);
    }
    return { ok: true, profile: getProfile() };
  }

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
    access.inviteCode = checked.invite.code || registry.normalizeCode(input.code);
    access.inviteLabel = checked.invite.label || '';
    access.displayName = name;
    access.activatedAt = now;
    pushUsage(access, 'activate');
    save(access);

    if (global.JudgmentOSStore && typeof global.JudgmentOSStore.setParticipant === 'function') {
      global.JudgmentOSStore.setParticipant({
        displayName: name,
        inviteId: checked.invite.id,
        inviteLabel: checked.invite.label || ''
      });
    }

    return { ok: true, profile: getProfile() };
  }

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
    getInviteCode,
    getSecurityConsent,
    hasSecurityDecision,
    canUseBuiltinAi,
    setSecurityConsent,
    activate,
    touch,
    clear,
    _loadRaw: loadRaw
  };
})(typeof window !== 'undefined' ? window : globalThis);

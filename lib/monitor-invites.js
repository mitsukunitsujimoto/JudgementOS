/**
 * モニター招待コード（API検証用）
 * output/js/judgmentos-invite-codes.js と同期すること。
 */

const INVITE_CODES = [
  { id: 'monitor-001', code: 'JOS-MONITOR-001', active: true },
  { id: 'monitor-002', code: 'JOS-MONITOR-002', active: true },
  { id: 'monitor-003', code: 'JOS-MONITOR-003', active: true },
  { id: 'monitor-004', code: 'JOS-MONITOR-004', active: true },
  { id: 'monitor-005', code: 'JOS-MONITOR-005', active: true },
  { id: 'monitor-006', code: 'JOS-MONITOR-006', active: true }
];

export function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function findActiveByCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return null;
  return INVITE_CODES.find((x) => x && x.active !== false && normalizeCode(x.code) === code) || null;
}

export function validateInvite({ inviteCode, inviteId }) {
  const invite = findActiveByCode(inviteCode);
  if (!invite) {
    return { ok: false, reason: '招待が無効です。' };
  }
  if (inviteId && invite.id !== inviteId) {
    return { ok: false, reason: '招待が一致しません。' };
  }
  return { ok: true, invite };
}

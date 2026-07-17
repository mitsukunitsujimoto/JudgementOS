/**
 * JudgmentOS 招待コード台帳（個別発行）
 *
 * ■ 誰を何番にするか
 *   assignee に名前を書く（管理用。参加者画面には出ない）
 *   例: assignee: '山田太郎'
 *
 * ■ 運用
 *   - 追加: 配列に1件足す（番号を進める）
 *   - 停止: active: false（その番号の人だけ次回から入れなくなる）
 *   - 削除: 行を消す
 *   - コード変更: code だけ書き換え（既存ユーザーは id で継続可）
 *
 * ■ 参加者に渡すもの
 *   code の文字列だけ（例: JOS-MONITOR-001）
 */
(function (global) {
  'use strict';

  /** @type {Array<{
   *   id: string,
   *   code: string,
   *   label: string,
   *   assignee: string,
   *   active: boolean,
   *   maxUses?: number|null,
   *   expiresAt?: string|null,
   *   notes?: string
   * }>} */
  const INVITE_CODES = [
    // —— 5名モニター（個別）——
    // assignee を埋めて管理表代わりにする
    {
      id: 'monitor-001',
      code: 'JOS-MONITOR-001',
      label: 'モニター001',
      assignee: '福﨑正展',
      active: true
    },
    {
      id: 'monitor-002',
      code: 'JOS-MONITOR-002',
      label: 'モニター002',
      assignee: '渡部裕子',
      active: true
    },
    {
      id: 'monitor-003',
      code: 'JOS-MONITOR-003',
      label: 'モニター003',
      assignee: '稲葉功',
      active: true
    },
    {
      id: 'monitor-004',
      code: 'JOS-MONITOR-004',
      label: 'モニター004',
      assignee: '松浦永明',
      active: true
    },
    {
      id: 'monitor-005',
      code: 'JOS-MONITOR-005',
      label: 'モニター005',
      assignee: '宮川知己',
      active: true
    },
    {
      id: 'monitor-006',
      code: 'JOS-MONITOR-006',
      label: 'モニター006',
      assignee: '安藤ハル',
      active: true
    }

    // 7人目以降は下に足す:
    // {
    //   id: 'monitor-007',
    //   code: 'JOS-MONITOR-007',
    //   label: 'モニター007',
    //   assignee: '',
    //   active: true
    // }
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

  /** 管理用: 番号 ↔ 担当者の一覧 */
  function listAssignments() {
    return INVITE_CODES.map(x => ({
      code: x.code,
      assignee: x.assignee || '',
      active: x.active !== false,
      label: x.label || '',
      notes: x.notes || ''
    }));
  }

  /**
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
    listAssignments,
    validateCode
  };
})(typeof window !== 'undefined' ? window : globalThis);

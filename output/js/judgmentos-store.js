/**
 * JudgmentOS store — Theme + 育ちの履歴（localStorage）
 * 画面上では技術用語を出さない。将来のDB移行を想定した構造。
 */
(function (global) {
  'use strict';

  const STORE_KEY = 'judgmentos.v12.store';
  const LEGACY_KEY = 'judgmentos-v1.2-sessions';

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function emptyStore() {
    return { schemaVersion: 1, themes: [] };
  }

  function loadRaw() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.themes)) return parsed;
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function migrateLegacy(store) {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
      if (!Array.isArray(legacy) || !legacy.length) return store;
      legacy.slice().reverse().forEach((item) => {
        const title = (item.theme || '無題のテーマ').trim();
        let theme = store.themes.find(t => t.title === title);
        if (!theme) {
          theme = {
            id: uid(),
            title,
            createdAt: item.date || new Date().toISOString(),
            updatedAt: item.date || new Date().toISOString(),
            entries: []
          };
          store.themes.push(theme);
        }
        const already = theme.entries.some(e => e.migratedFrom === item.date && item.date);
        if (already) return;
        theme.entries.push({
          id: uid(),
          entryNumber: theme.entries.length + 1,
          createdAt: item.date || new Date().toISOString(),
          concerns: [],
          theme: item.theme || title,
          achieve: item.achieve || '',
          protect: item.protect || '',
          constraints: item.constraints || '',
          gapQuestions: (item.gapKeys || []).map(k => ({ key: k, ask: '' })),
          gapInsights: item.gapInsights || [],
          contextBefore: item.context_pack || '',
          contextBeforeParts: {
            theme: item.theme || '',
            achieve: item.achieve || '',
            protect: item.protect || '',
            constraints: item.constraints || '',
            addedSentence: item.nextSentence || ''
          },
          aiReplyPaste: '',
          reflection: {},
          contextAfter: item.context_pack || '',
          contextAfterParts: null,
          newJudgment: item.newJudgment || '',
          migratedFrom: item.date || null
        });
        theme.updatedAt = item.date || theme.updatedAt;
      });
      saveStore(store);
    } catch (_) { /* ignore */ }
    return store;
  }

  function getStore() {
    let store = loadRaw();
    if (!store) {
      store = emptyStore();
      store = migrateLegacy(store);
      saveStore(store);
    }
    return store;
  }

  function normalizeTitle(title) {
    return (title || '').trim() || '無題のテーマ';
  }

  function findOrCreateTheme(store, title) {
    const t = normalizeTitle(title);
    let theme = store.themes.find(x => x.title === t);
    if (!theme) {
      const now = new Date().toISOString();
      theme = { id: uid(), title: t, createdAt: now, updatedAt: now, entries: [] };
      store.themes.unshift(theme);
    }
    return theme;
  }

  /**
   * 同じテーマでも上書きせず、新しい履歴として追加する
   * @returns {{ themeId: string, entryId: string, entryNumber: number }}
   */
  function appendEntry(payload) {
    const store = getStore();
    const theme = findOrCreateTheme(store, payload.theme || payload.title);
    const now = new Date().toISOString();
    const entry = {
      id: uid(),
      entryNumber: theme.entries.length + 1,
      createdAt: now,
      concerns: payload.concerns || [],
      theme: payload.theme || theme.title,
      achieve: payload.achieve || '',
      protect: payload.protect || '',
      constraints: payload.constraints || '',
      gapQuestions: payload.gapQuestions || [],
      gapInsights: payload.gapInsights || [],
      contextBefore: payload.contextBefore || '',
      contextBeforeParts: payload.contextBeforeParts || null,
      aiReplyPaste: payload.aiReplyPaste || '',
      reflection: payload.reflection || {},
      contextAfter: payload.contextAfter || '',
      contextAfterParts: payload.contextAfterParts || null,
      newJudgment: payload.newJudgment || '',
      criteriaGrowth: payload.criteriaGrowth || null
    };
    theme.entries.push(entry);
    theme.updatedAt = now;
    // 最近使ったテーマを上へ
    store.themes = [theme, ...store.themes.filter(t => t.id !== theme.id)];
    saveStore(store);
    return { themeId: theme.id, entryId: entry.id, entryNumber: entry.entryNumber };
  }

  /**
   * 既存エントリを部分更新（判断基準の追記など）
   * @returns {{ themeId: string, entryId: string } | null}
   */
  function updateEntry(themeId, entryId, patch) {
    const store = getStore();
    const theme = store.themes.find(t => t.id === themeId);
    if (!theme) return null;
    const entry = theme.entries.find(e => e.id === entryId);
    if (!entry) return null;
    const now = new Date().toISOString();
    Object.assign(entry, patch || {}, { updatedAt: now });
    theme.updatedAt = now;
    store.themes = [theme, ...store.themes.filter(t => t.id !== theme.id)];
    saveStore(store);
    return { themeId: theme.id, entryId: entry.id };
  }

  function listThemesForUi() {
    const store = getStore();
    return store.themes
      .map(t => {
        const latest = t.entries[t.entries.length - 1];
        return {
          id: t.id,
          title: t.title,
          updatedAt: t.updatedAt,
          latestAt: latest ? latest.createdAt : t.updatedAt,
          entryCount: t.entries.length
        };
      })
      .sort((a, b) => (b.latestAt || '').localeCompare(a.latestAt || ''));
  }

  function getTheme(themeId) {
    return getStore().themes.find(t => t.id === themeId) || null;
  }

  function getEntry(themeId, entryId) {
    const theme = getTheme(themeId);
    if (!theme) return null;
    const entry = theme.entries.find(e => e.id === entryId);
    return entry ? { theme, entry } : null;
  }

  function formatDateJa(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  global.JudgmentOSStore = {
    getStore,
    appendEntry,
    updateEntry,
    listThemesForUi,
    getTheme,
    getEntry,
    formatDateJa,
    normalizeTitle
  };
})(typeof window !== 'undefined' ? window : globalThis);

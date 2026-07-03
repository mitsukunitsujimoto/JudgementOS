#!/usr/bin/env node
/**
 * 対話ログ（Markdown / プレーンテキスト）を sessions.json に追記する。
 *
 * 使い方:
 *   node scripts/import-dialogue.mjs --file output/data/inbox/2026-06-11-dialogue.md
 *   node scripts/import-dialogue.mjs --inbox
 *   node scripts/import-dialogue.mjs --text "前提は…" --theme 採用 --session decision-domains
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SESSIONS_PATH = path.join(ROOT, 'output', 'data', 'sessions.json');
const INBOX_DIR = path.join(ROOT, 'output', 'data', 'inbox');
const PROCESSED_DIR = path.join(INBOX_DIR, 'processed');

const DEFAULT_SESSION = 'hypothesis-exploration';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function bulletsToText(block) {
  return block
    .split('\n')
    .map((l) => l.replace(/^[-*]\s*/, '').replace(/^>\s*/, '').trim())
    .filter((line) => line && !line.startsWith('|') && line !== '-')
    .join(' · ');
}

/** @returns {{ insights: { theme: string, text: string }[], quotes: { text: string }[], date: string|null, theme: string|null }} */
export function parseDialogueText(text) {
  const result = { insights: [], quotes: [], date: null, theme: null };

  const titleDate = text.match(/セッションログ[^\d]*(\d{4}-\d{2}-\d{2})/);
  if (titleDate) result.date = titleDate[1];

  const tableDate = text.match(/\|\s*日付\s*\|\s*(\d{4}-\d{2}-\d{2})/);
  if (tableDate) result.date = tableDate[1];

  const section = (heading) =>
    new RegExp(`###\\s*${heading}[^\\n]*\\n+([\\s\\S]*?)(?=\\n###|\\n##|\\n---|$)`, 'i');

  const premise = text.match(section('前提'));
  if (premise) {
    const t = bulletsToText(premise[1]);
    if (t) result.insights.push({ theme: '前提', text: t });
  }

  const judgment = text.match(section('判断'));
  if (judgment) {
    const t = bulletsToText(judgment[1]);
    if (t) result.insights.push({ theme: '判断', text: t });
  }

  const quoteSec = text.match(section('印象'));
  if (quoteSec) {
    const lines = quoteSec[1].split('\n').map((l) => l.replace(/^>\s*/, '').trim()).filter(Boolean);
    if (lines.length) {
      result.quotes.push({ text: lines.join(' ') });
      result.insights.push({ theme: '発言', text: lines[0].slice(0, 200) });
    }
  }

  const continued = text.match(/##\s*継続議論[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
  if (continued) {
    const t = bulletsToText(continued[1]);
    if (t) result.insights.push({ theme: '次の問い', text: t });
  }

  if (!result.insights.length) {
    const plain = text
      .replace(/^#+\s*.+$/gm, '')
      .replace(/^---+$/gm, '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 10)
      .join(' ')
      .slice(0, 280);
    if (plain) result.insights.push({ theme: '対話', text: plain });
  }

  return result;
}

function readSessions() {
  return JSON.parse(fs.readFileSync(SESSIONS_PATH, 'utf8'));
}

function writeSessions(data) {
  data.updatedAt = today();
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function appendToSession(sessionId, parsed, opts = {}) {
  const data = readSessions();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error(`セッションが見つかりません: ${sessionId}`);

  const date = opts.date || parsed.date || today();
  const defaultTheme = opts.theme || parsed.theme || '対話';

  if (!session.insights) session.insights = [];
  if (!session.quotes) session.quotes = [];

  for (const ins of parsed.insights) {
    session.insights.push({
      date,
      theme: ins.theme || defaultTheme,
      text: ins.text,
    });
  }

  for (const q of parsed.quotes) {
    session.quotes.push({ date, text: q.text });
  }

  writeSessions(data);
  return { sessionTitle: session.title, added: parsed.insights.length, quotes: parsed.quotes.length, date };
}

function parseArgs(argv) {
  const args = { file: null, inbox: false, text: null, theme: null, session: DEFAULT_SESSION, date: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--inbox') args.inbox = true;
    else if (a === '--text') args.text = argv[++i];
    else if (a === '--theme') args.theme = argv[++i];
    else if (a === '--session') args.session = argv[++i];
    else if (a === '--date') args.date = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function processFile(filePath, opts) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const text = fs.readFileSync(abs, 'utf8');
  const parsed = parseDialogueText(text);
  const result = appendToSession(opts.session, parsed, { theme: opts.theme, date: opts.date });
  console.log(`✓ ${path.basename(abs)} → ${result.sessionTitle}（insights +${result.added}, quotes +${result.quotes}）`);
  return result;
}

function processInbox(opts) {
  if (!fs.existsSync(INBOX_DIR)) fs.mkdirSync(INBOX_DIR, { recursive: true });
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });

  const files = fs.readdirSync(INBOX_DIR).filter((f) => /\.(md|txt)$/i.test(f));
  if (!files.length) {
    console.log('inbox に処理対象ファイルがありません。');
    return;
  }

  for (const f of files) {
    const src = path.join(INBOX_DIR, f);
    processFile(src, opts);
    fs.renameSync(src, path.join(PROCESSED_DIR, f));
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`用法:
  node scripts/import-dialogue.mjs --file output/data/inbox/ログ.md [--session hypothesis-exploration] [--theme 採用]
  node scripts/import-dialogue.mjs --inbox
  node scripts/import-dialogue.mjs --text "メモ本文" --theme 経営 --session decision-domains`);
    return;
  }

  if (args.inbox) {
    processInbox(args);
    return;
  }

  if (args.file) {
    processFile(args.file, args);
    return;
  }

  if (args.text) {
    const parsed = parseDialogueText(args.text);
    if (args.theme && parsed.insights.length === 1) parsed.insights[0].theme = args.theme;
    const result = appendToSession(args.session, parsed, { theme: args.theme, date: args.date });
    console.log(`✓ テキスト追記 → ${result.sessionTitle}（insights +${result.added}）`);
    return;
  }

  console.error('--file, --inbox, または --text を指定してください。--help で用法を表示。');
  process.exit(1);
}

main();

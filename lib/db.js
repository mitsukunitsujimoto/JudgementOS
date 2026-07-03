import { neon } from '@neondatabase/serverless';

/**
 * DATABASE_URL が設定されているときだけ Neon クライアントを返す。
 * 接続文字列はログに出さない。
 */
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) return null;
  return neon(url);
}

export function isDbConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** 本番デプロイ環境かどうか（Preview / ローカル開発は除外） */
export function isProductionDeploy(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.VERCEL_ENV === "preview") return false;
  return true;
}

/** GA4 または Clarity のいずれかが設定されている場合に計測を有効化 */
export function shouldEnableAnalytics(): boolean {
  if (!isProductionDeploy()) return false;

  return Boolean(
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
      process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID,
  );
}

export function getGaMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

export function getClarityProjectId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
  return id || undefined;
}

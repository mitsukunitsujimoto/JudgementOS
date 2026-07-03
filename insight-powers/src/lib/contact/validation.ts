export const CONTACT_EMAIL = "info@insightpowers.co.jp";

export type ContactPayload = {
  name: string;
  company: string;
  email: string;
  theme: string;
  message: string;
  website?: string;
};

export function validateContactPayload(body: ContactPayload): string | null {
  if (body.website) return null;

  if (!body.name?.trim()) return "お名前を入力してください。";
  if (!body.company?.trim()) return "会社名を入力してください。";
  if (!body.email?.trim()) return "メールアドレスを入力してください。";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return "メールアドレスの形式が正しくありません。";
  }
  if (!body.theme?.trim()) return "ご相談テーマを選択してください。";
  if (!body.message?.trim()) return "お問い合わせ内容を入力してください。";

  return null;
}

export function normalizeContactPayload(body: ContactPayload) {
  return {
    name: body.name.trim(),
    company: body.company.trim(),
    email: body.email.trim(),
    theme: body.theme.trim(),
    message: body.message.trim(),
  };
}

export function buildContactSubject(payload: ReturnType<typeof normalizeContactPayload>) {
  return `【お問い合わせ】${payload.theme} — ${payload.name}（${payload.company}）`;
}

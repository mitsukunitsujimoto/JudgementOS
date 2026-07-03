export type NewsletterPayload = {
  email: string;
  website?: string;
};

export function validateNewsletterPayload(body: NewsletterPayload): string | null {
  if (body.website) return null;

  if (!body.email?.trim()) return "メールアドレスを入力してください。";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return "メールアドレスの形式が正しくありません。";
  }

  return null;
}

export function normalizeNewsletterPayload(body: NewsletterPayload) {
  return {
    email: body.email.trim(),
  };
}

export function buildNewsletterSubject(payload: ReturnType<typeof normalizeNewsletterPayload>) {
  return `【読者登録】${payload.email}`;
}

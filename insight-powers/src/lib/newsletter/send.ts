import { buildNewsletterSubject } from "@/lib/newsletter/validation";

type NormalizedNewsletter = {
  email: string;
};

async function parseProviderResponse(response: Response): Promise<string | null> {
  if (response.ok) return null;

  try {
    const data = (await response.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? null;
  } catch {
    return null;
  }
}

export async function sendNewsletterViaFormspree(
  formId: string,
  payload: NormalizedNewsletter,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`https://formspree.io/f/${formId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email: payload.email,
      メールアドレス: payload.email,
      種別: "読者登録",
      _subject: buildNewsletterSubject(payload),
      _replyto: payload.email,
    }),
  });

  if (response.ok) return { ok: true };

  const detail = await parseProviderResponse(response);
  return {
    ok: false,
    error: detail ?? "送信に失敗しました。時間をおいて再度お試しください。",
  };
}

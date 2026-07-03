import {
  buildContactSubject,
} from "@/lib/contact/validation";

type NormalizedContact = {
  name: string;
  company: string;
  email: string;
  theme: string;
  message: string;
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

export async function sendViaFormspree(
  formId: string,
  payload: NormalizedContact,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetch(`https://formspree.io/f/${formId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...payload,
      _subject: buildContactSubject(payload),
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

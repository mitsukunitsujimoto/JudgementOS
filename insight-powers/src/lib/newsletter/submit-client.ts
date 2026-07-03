import { CONTACT_EMAIL } from "@/lib/contact/validation";
import {
  buildNewsletterSubject,
  normalizeNewsletterPayload,
} from "@/lib/newsletter/validation";

type SubmitResult = { ok: true } | { ok: false; error: string };

function parseFormSubmitResponse(data: {
  success?: string | boolean;
  message?: string;
}): SubmitResult {
  if (data.success === true || data.success === "true") {
    return { ok: true };
  }

  if (data.message?.includes("Activation")) {
    return {
      ok: false,
      error:
        "フォームの有効化が必要です。info@insightpowers.co.jp 宛に届いた FormSubmit からのメール内「Activate Form」リンクをクリックしてください。有効化後、再度送信してください。",
    };
  }

  return {
    ok: false,
    error: data.message ?? "送信に失敗しました。時間をおいて再度お試しください。",
  };
}

export async function submitViaFormSubmit(email: string): Promise<SubmitResult> {
  const payload = normalizeNewsletterPayload({ email });

  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        メールアドレス: payload.email,
        種別: "読者登録",
        _subject: buildNewsletterSubject(payload),
        _replyto: payload.email,
        _template: "table",
        _captcha: "false",
      }),
    },
  );

  const data = (await response.json()) as {
    success?: string | boolean;
    message?: string;
  };

  return parseFormSubmitResponse(data);
}

async function submitViaFormspreeApi(
  email: string,
  website: string,
): Promise<SubmitResult> {
  const response = await fetch("/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, website }),
  });

  const data = (await response.json()) as { error?: string };

  if (response.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: data.error ?? "送信に失敗しました。時間をおいて再度お試しください。",
  };
}

/**
 * Formspree（FORMSPREE_FORM_ID 設定時）または FormSubmit（未設定時）で送信。
 */
export async function submitNewsletterForm(
  email: string,
  website: string,
): Promise<SubmitResult> {
  if (process.env.NEXT_PUBLIC_USE_FORMSPREE === "true") {
    return submitViaFormspreeApi(email, website);
  }

  return submitViaFormSubmit(email);
}

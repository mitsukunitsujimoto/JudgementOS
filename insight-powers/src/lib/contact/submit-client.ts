import { buildContactSubject, CONTACT_EMAIL } from "@/lib/contact/validation";

export type ContactFormValues = {
  name: string;
  company: string;
  email: string;
  theme: string;
  message: string;
};

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

export async function submitViaFormSubmit(
  values: ContactFormValues,
): Promise<SubmitResult> {
  const payload = {
    name: values.name.trim(),
    company: values.company.trim(),
    email: values.email.trim(),
    theme: values.theme.trim(),
    message: values.message.trim(),
  };

  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        お名前: payload.name,
        会社名: payload.company,
        メールアドレス: payload.email,
        ご相談テーマ: payload.theme,
        お問い合わせ内容: payload.message,
        _subject: buildContactSubject(payload),
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
  values: ContactFormValues,
  website: string,
): Promise<SubmitResult> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, website }),
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
 * FormSubmit は info@insightpowers.co.jp 宛。初回のみ有効化メールの確認が必要。
 */
export async function submitContactForm(
  values: ContactFormValues,
  website: string,
): Promise<SubmitResult> {
  if (process.env.NEXT_PUBLIC_USE_FORMSPREE === "true") {
    return submitViaFormspreeApi(values, website);
  }

  return submitViaFormSubmit(values);
}

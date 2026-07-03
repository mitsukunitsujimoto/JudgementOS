import { NextResponse } from "next/server";
import { sendNewsletterViaFormspree } from "@/lib/newsletter/send";
import {
  normalizeNewsletterPayload,
  validateNewsletterPayload,
  type NewsletterPayload,
} from "@/lib/newsletter/validation";

export async function POST(request: Request) {
  const formId = process.env.FORMSPREE_FORM_ID?.trim();

  if (!formId) {
    return NextResponse.json(
      {
        error:
          "Formspree 未設定のため API 経由では送信できません。クライアントから FormSubmit を使用してください。",
      },
      { status: 503 },
    );
  }

  let body: NewsletterPayload;

  try {
    body = (await request.json()) as NewsletterPayload;
  } catch {
    return NextResponse.json(
      { error: "送信内容の読み取りに失敗しました。" },
      { status: 400 },
    );
  }

  const validationError = validateNewsletterPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const payload = normalizeNewsletterPayload(body);
  const result = await sendNewsletterViaFormspree(formId, payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}

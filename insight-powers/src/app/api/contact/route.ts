import { NextResponse } from "next/server";
import { sendViaFormspree } from "@/lib/contact/send";
import {
  normalizeContactPayload,
  validateContactPayload,
  type ContactPayload,
} from "@/lib/contact/validation";

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

  let body: ContactPayload;

  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json(
      { error: "送信内容の読み取りに失敗しました。" },
      { status: 400 },
    );
  }

  const validationError = validateContactPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const payload = normalizeContactPayload(body);
  const result = await sendViaFormspree(formId, payload);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}

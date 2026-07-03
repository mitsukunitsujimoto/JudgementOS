import { getClarityProjectId } from "./config";
import type { PageMetadata } from "./page-metadata";
import { getPageTypeLabel } from "./page-metadata";

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function clarity(...args: unknown[]) {
  if (typeof window === "undefined" || !window.clarity) return;
  window.clarity(...args);
}

/** ページ遷移ごとにカスタムタグを設定（About / Thinking などの分析用） */
export function trackClarityPageView(metadata: PageMetadata) {
  if (!getClarityProjectId()) return;

  clarity("set", "page_type", metadata.page_type);
  clarity("set", "page_path", metadata.page_path);
  clarity("set", "page_type_label", getPageTypeLabel(metadata.page_type));

  if (metadata.article_slug) {
    clarity("set", "article_slug", metadata.article_slug);
  }
}

/** Contact フォーム送信成功 */
export function trackClarityContactFormSubmit() {
  if (!getClarityProjectId()) return;

  clarity("event", "contact_form_submit");
  clarity("set", "contact_form_status", "success");
  clarity("set", "page_type", "contact");
  clarity("set", "page_path", "/contact");
}

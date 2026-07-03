import { getGaMeasurementId } from "./config";
import type { PageMetadata } from "./page-metadata";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag(...args);
}

export function trackPageView(metadata: PageMetadata, pageTitle?: string) {
  const measurementId = getGaMeasurementId();
  if (!measurementId) return;

  const params: Record<string, string> = {
    page_path: metadata.page_path,
    page_type: metadata.page_type,
  };

  if (pageTitle) {
    params.page_title = pageTitle;
  }

  if (metadata.article_slug) {
    params.article_slug = metadata.article_slug;
  }

  gtag("event", "page_view", params);
}

export function trackContactFormSubmit() {
  const measurementId = getGaMeasurementId();
  if (!measurementId) return;

  gtag("event", "contact_form_submit", {
    send_to: measurementId,
    page_path: "/contact",
    page_type: "contact",
  });
}

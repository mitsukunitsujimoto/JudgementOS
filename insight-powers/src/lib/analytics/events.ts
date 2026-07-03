import { trackClarityPageView, trackClarityContactFormSubmit } from "./clarity";
import { trackContactFormSubmit as trackGaContactFormSubmit } from "./gtag";
import type { PageMetadata } from "./page-metadata";
import { trackPageView as trackGaPageView } from "./gtag";

export function trackPageView(metadata: PageMetadata, pageTitle?: string) {
  trackGaPageView(metadata, pageTitle);
  trackClarityPageView(metadata);
}

export function trackContactFormSuccess() {
  trackGaContactFormSubmit();
  trackClarityContactFormSubmit();
}

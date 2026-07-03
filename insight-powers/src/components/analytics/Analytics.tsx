import { Suspense } from "react";
import {
  getClarityProjectId,
  getGaMeasurementId,
  shouldEnableAnalytics,
} from "@/lib/analytics/config";
import { AnalyticsPageView } from "./AnalyticsPageView";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { MicrosoftClarity } from "./MicrosoftClarity";

export function Analytics() {
  if (!shouldEnableAnalytics()) return null;

  const hasGa = Boolean(getGaMeasurementId());
  const hasClarity = Boolean(getClarityProjectId());

  return (
    <>
      {hasGa && <GoogleAnalytics />}
      {hasClarity && <MicrosoftClarity />}
      {(hasGa || hasClarity) && (
        <Suspense fallback={null}>
          <AnalyticsPageView />
        </Suspense>
      )}
    </>
  );
}

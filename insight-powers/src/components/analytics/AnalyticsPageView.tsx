"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getPageMetadata } from "@/lib/analytics/page-metadata";
import { trackPageView } from "@/lib/analytics/events";

export function AnalyticsPageView() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    const metadata = getPageMetadata(pathname);
    const pageTitle =
      typeof document !== "undefined" ? document.title : undefined;

    trackPageView(metadata, pageTitle);
  }, [pathname]);

  return null;
}

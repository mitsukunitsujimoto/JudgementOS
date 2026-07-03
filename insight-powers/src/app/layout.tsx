import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import { Analytics } from "@/components/analytics/Analytics";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const shipporiMincho = Shippori_Mincho({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-shippori",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.nameEn}`,
  },
  description:
    "株式会社インサイトパワーズは、AI時代において前提を照らし、問いを創造し、判断を支援し、組織知へ昇華することを支援する会社です。",
  keywords: [
    "インサイトパワーズ",
    "辻本光邦",
    "意思決定",
    "問い",
    "経営",
    "AI時代",
    "組織知",
  ],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.tagline,
    description:
      "AIが答えを出す時代に、人間は何を問うのか。前提を照らし、問いを創造し、判断を支援する。",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.tagline,
    description:
      "AIが答えを出す時代に、人間は何を問うのか。前提を照らし、問いを創造し、判断を支援する。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${shipporiMincho.variable} ${notoSansJP.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased">
        <JsonLd />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

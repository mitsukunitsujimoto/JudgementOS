export const siteConfig = {
  name: "株式会社インサイトパワーズ",
  nameEn: "Insight Powers",
  tagline: "AIが答えを出す時代に、人間は何を問うのか。",
  url: "https://insight-powers.vercel.app",
  locale: "ja_JP",
} as const;

export const navItems = [
  { label: "HOME", href: "/" },
  { label: "ABOUT", href: "/about" },
  { label: "THINKING", href: "/thinking" },
  { label: "SERVICES", href: "/services" },
  { label: "CONTACT", href: "/contact" },
] as const;

export type PageType =
  | "home"
  | "about"
  | "thinking"
  | "article"
  | "contact"
  | "services"
  | "other";

export type PageMetadata = {
  page_type: PageType;
  page_path: string;
  article_slug?: string;
};

const PAGE_TYPE_LABELS: Record<PageType, string> = {
  home: "トップページ",
  about: "About",
  thinking: "Thinking",
  article: "Thinking記事",
  contact: "Contact",
  services: "Services",
  other: "その他",
};

export function getPageTypeLabel(pageType: PageType): string {
  return PAGE_TYPE_LABELS[pageType];
}

/** URL パスからページ種別を判定（記事追加時も /articles/[slug] で自動計測） */
export function getPageMetadata(pathname: string): PageMetadata {
  const page_path = pathname || "/";

  if (page_path === "/") {
    return { page_type: "home", page_path };
  }
  if (page_path === "/about") {
    return { page_type: "about", page_path };
  }
  if (page_path === "/thinking") {
    return { page_type: "thinking", page_path };
  }
  if (page_path === "/contact") {
    return { page_type: "contact", page_path };
  }
  if (page_path === "/services") {
    return { page_type: "services", page_path };
  }

  const articleMatch = page_path.match(/^\/articles\/([^/?#]+)$/);
  if (articleMatch) {
    return {
      page_type: "article",
      page_path,
      article_slug: articleMatch[1],
    };
  }

  return { page_type: "other", page_path };
}

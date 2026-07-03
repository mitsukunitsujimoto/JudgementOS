import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="article-prose space-y-8 text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-[15px] leading-[2.2] tracking-[0.02em] text-foreground/90 md:text-base">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-3 border-l border-foreground/15 py-1 pl-8">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="font-serif text-lg tracking-[0.04em] text-foreground md:text-xl">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-medium text-foreground">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

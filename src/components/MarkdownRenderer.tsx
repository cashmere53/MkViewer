import ReactMarkdown from "react-markdown";
import { markdownOptions } from "../lib/markdownPipeline";

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="markdown-body">
      <ReactMarkdown
        remarkPlugins={markdownOptions.remarkPlugins}
        rehypePlugins={markdownOptions.rehypePlugins}
        components={markdownOptions.components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

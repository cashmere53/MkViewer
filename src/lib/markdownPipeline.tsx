import { isValidElement } from "react";
import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import type { PluggableList } from "unified";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { MermaidBlock } from "../components/MermaidBlock";
import { remarkCallout } from "./remarkCallout";
import { rehypeColorSwatch } from "./rehypeColorSwatch";

type CodeProps = {
  className?: string;
  children?: ReactNode;
};

type PreProps = React.ComponentPropsWithoutRef<"pre"> & {
  node?: unknown;
};

type BlockquoteProps = React.ComponentPropsWithoutRef<"blockquote"> & {
  node?: unknown;
  "data-callout"?: string;
  "data-callout-title"?: string;
};

const markdownComponents: Components = {
  code(props: CodeProps) {
    const { className, children } = props as CodeProps;
    return <code className={className}>{children}</code>;
  },

  pre(props: PreProps) {
    const { children, node: _node, ...rest } = props;
    const firstChild = Array.isArray(children) ? children[0] : children;

    if (isValidElement(firstChild)) {
      const className = String((firstChild.props as { className?: string }).className ?? "");
      const isMermaid = className.split(/\s+/).includes("language-mermaid");

      if (isMermaid) {
        const source = String((firstChild.props as { children?: ReactNode }).children ?? "").trim();
        return <MermaidBlock source={source} />;
      }
    }

    return <pre {...rest}>{children}</pre>;
  },

  blockquote(props: BlockquoteProps) {
    const {
      children,
      node: _node,
      "data-callout": calloutType,
      "data-callout-title": calloutTitle,
      ...rest
    } = props;

    if (calloutType) {
      return (
        <div className={`callout callout-${calloutType}`}>
          <div className="callout-title">{calloutTitle ?? calloutType}</div>
          <div className="callout-content">{children}</div>
        </div>
      );
    }

    return <blockquote {...rest}>{children}</blockquote>;
  },
};

export const markdownOptions = {
  remarkPlugins: [remarkGfm, remarkMath, remarkCallout] as PluggableList,
  rehypePlugins: [rehypeKatex, rehypeHighlight, rehypeColorSwatch] as PluggableList,
  components: markdownComponents,
};

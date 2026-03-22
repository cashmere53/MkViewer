import { visit } from "unist-util-visit";
import type { Root, Blockquote, Paragraph, Text } from "mdast";

// Default titles for known callout types
const CALLOUT_TITLES: Record<string, string> = {
  note: "Note",
  abstract: "Abstract",
  summary: "Summary",
  tldr: "TL;DR",
  info: "Info",
  todo: "Todo",
  tip: "Tip",
  hint: "Hint",
  important: "Important",
  success: "Success",
  check: "Check",
  done: "Done",
  question: "Question",
  help: "Help",
  faq: "FAQ",
  warning: "Warning",
  caution: "Caution",
  attention: "Attention",
  failure: "Failure",
  fail: "Fail",
  missing: "Missing",
  danger: "Danger",
  error: "Error",
  bug: "Bug",
  example: "Example",
  quote: "Quote",
  cite: "Cite",
};

// Matches [!TYPE], [!TYPE]+, [!TYPE]-, [!TYPE] Title, etc.
// Allow leading whitespace and CRLF so Windows line endings still convert.
const CALLOUT_HEADER_RE = /^\s*\[!([A-Za-z0-9_-]+)\]([+-]?)(?:[ \t]+([^\r\n]*))?(?:\r?\n|$)/;

/**
 * Remark plugin that transforms GitHub Alerts and Obsidian Callouts.
 *
 * Supported patterns:
 *   > [!NOTE]
 *   > [!warning] Custom title
 *   > [!tip]+ Expandable (rendered same; +/- are parsed but ignored)
 */
export function remarkCallout() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const first = node.children[0] as Paragraph | undefined;
      if (!first || first.type !== "paragraph") return;

      const firstTextIndex = first.children.findIndex(
        (child): child is Text => child.type === "text" && child.value.trim().length > 0,
      );
      if (firstTextIndex < 0) return;

      const firstInline = first.children[firstTextIndex] as Text;
      const match = CALLOUT_HEADER_RE.exec(firstInline.value);
      if (!match) return;

      const rawType = match[1]!.toLowerCase();
      const customTitle = match[3]?.trim();
      const title = customTitle || CALLOUT_TITLES[rawType] || rawType;

      // Remove the [!TYPE] header line from the paragraph content
      const remaining = firstInline.value.slice(match[0].length);
      if (remaining) {
        firstInline.value = remaining;
      } else {
        first.children.splice(firstTextIndex, 1);
        if (first.children.length === 0) {
          node.children.shift();
        }
      }

      // Attach callout metadata as hast properties so the React component can pick them up
      node.data = {
        ...node.data,
        hProperties: {
          ...((node.data?.hProperties as object) ?? {}),
          "data-callout": rawType,
          "data-callout-title": title,
        },
      };
    });
  };
}

import { visit } from "unist-util-visit";
import type { Root, Element, Text, ElementContent } from "hast";

/**
 * Matches HEX colors, rgb(), rgba(), hsl(), hsla() in a capturing group.
 * Applied to text content inside <code> elements.
 */
const COLOR_RE =
  /(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*[\d.]+)?\s*\)|hsla?\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%(?:\s*,\s*[\d.]+)?\s*\))/g;

/**
 * Rehype plugin that inserts color swatch spans before color codes
 * inside all <code> elements (both inline and block).
 */
export function rehypeColorSwatch() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "code") return;
      node.children = injectSwatches(node.children);
    });
  };
}

function injectSwatches(children: ElementContent[]): ElementContent[] {
  const source = childrenToText(children);
  const result: ElementContent[] = [];
  let cursor = 0;

  COLOR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = COLOR_RE.exec(source)) !== null) {
    const start = match.index;
    const color = match[0];
    const end = start + color.length;

    if (start > cursor) {
      result.push(...sliceChildrenByTextRange(children, cursor, start));
    }

    // Insert a swatch span before the color text
    result.push({
      type: "element",
      tagName: "span",
      properties: {
        className: ["color-swatch"],
        style: `--swatch-color:${color}`,
        ariaHidden: "true",
      },
      children: [],
    });

    // Keep original highlighted nodes for the matched range
    result.push(...sliceChildrenByTextRange(children, start, end));
    cursor = end;
  }

  if (cursor < source.length) {
    result.push(...sliceChildrenByTextRange(children, cursor, source.length));
  }

  return result;
}

function childrenToText(children: ElementContent[]): string {
  return children.map(nodeToText).join("");
}

function nodeToText(node: ElementContent): string {
  if (node.type === "text") return (node as Text).value;
  if (node.type === "element") {
    return childrenToText((node as Element).children);
  }
  return "";
}

function sliceChildrenByTextRange(children: ElementContent[], start: number, end: number): ElementContent[] {
  if (start >= end) return [];

  const sliced: ElementContent[] = [];
  let offset = 0;

  for (const child of children) {
    const text = nodeToText(child);
    const length = text.length;
    const nodeStart = offset;
    const nodeEnd = offset + length;
    offset = nodeEnd;

    if (length === 0 || nodeEnd <= start || nodeStart >= end) {
      continue;
    }

    const innerStart = Math.max(0, start - nodeStart);
    const innerEnd = Math.min(length, end - nodeStart);
    const piece = sliceNodeByTextRange(child, innerStart, innerEnd);
    if (piece) sliced.push(piece);
  }

  return sliced;
}

function sliceNodeByTextRange(node: ElementContent, start: number, end: number): ElementContent | null {
  if (start >= end) return null;

  if (node.type === "text") {
    const value = (node as Text).value.slice(start, end);
    return value ? { type: "text", value } : null;
  }

  if (node.type !== "element") {
    return null;
  }

  const element = node as Element;
  const children = sliceChildrenByTextRange(element.children, start, end);
  if (children.length === 0) return null;

  return { ...element, children };
}

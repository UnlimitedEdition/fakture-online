// Minimal hand-rolled XML builder.
// We DO NOT use fast-xml-parser for output because UBL requires strict
// element ordering and explicit empty-element handling that's easier to
// audit in a single-purpose builder. fast-xml-parser is used only for
// PARSING incoming UBL in lib/sef/ubl/parse/.

export function escapeXmlText(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeXmlAttr(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Attrs = Record<string, string | number | null | undefined>;
type Child = string | null | undefined | false;

function renderAttrs(attrs: Attrs | null): string {
  if (!attrs) return "";
  const out: string[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    out.push(` ${k}="${escapeXmlAttr(v)}"`);
  }
  return out.join("");
}

// Element with text content.
export function elText(
  name: string,
  text: string | number | null | undefined,
  attrs: Attrs | null = null,
): string {
  if (text === null || text === undefined || text === "") return "";
  return `<${name}${renderAttrs(attrs)}>${escapeXmlText(text)}</${name}>`;
}

// Element wrapping children (already-rendered XML strings).
// Empty children are filtered. If all children are empty, returns "" (skip element).
export function el(
  name: string,
  attrs: Attrs | null,
  ...children: Child[]
): string {
  const filtered = children.filter((c): c is string => Boolean(c));
  if (filtered.length === 0) return "";
  return `<${name}${renderAttrs(attrs)}>${filtered.join("")}</${name}>`;
}

// Element that should be emitted even with empty children (e.g. required parent).
export function elRequired(
  name: string,
  attrs: Attrs | null,
  ...children: Child[]
): string {
  const filtered = children.filter((c): c is string => Boolean(c));
  return `<${name}${renderAttrs(attrs)}>${filtered.join("")}</${name}>`;
}

export function xmlDeclaration(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>`;
}

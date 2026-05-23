export function escapeHtml(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip characters that could break out of an email header (From/To/Subject).
export function sanitizeEmailHeader(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input)
    .replace(/[\r\n<>,;"]/g, "")
    .trim()
    .slice(0, 100);
}

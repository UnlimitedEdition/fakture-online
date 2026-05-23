// UUID validation helper. Use everywhere a server action / API route accepts
// an ID from the client — defense-in-depth before passing into queries or
// constructing Storage paths.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function assertUuid(value: unknown, label = "id"): string {
  if (!isUuid(value)) {
    throw new Error(`Invalid ${label}: not a UUID`);
  }
  return value;
}

const envAdmins = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_EMAILS = envAdmins;

export function isAdmin(
  email: string | null | undefined,
  profileIsAdmin?: boolean | null,
): boolean {
  if (profileIsAdmin) return true;
  if (ADMIN_EMAILS.length === 0) return false;
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

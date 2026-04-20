const envAdmins = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const fallbackAdmins = ["mtosic0450@gmail.com"];

export const ADMIN_EMAILS = envAdmins.length > 0 ? envAdmins : fallbackAdmins;

export function isAdmin(
  email: string | null | undefined,
  profileIsAdmin?: boolean | null,
): boolean {
  if (profileIsAdmin) return true;
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

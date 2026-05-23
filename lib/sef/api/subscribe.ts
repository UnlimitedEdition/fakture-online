import { sefRequest } from "./client";
import { PATH } from "./endpoints";
import type { SefApiResponse, SefCredentials } from "../types";

// Subscribes the calling API key to receive an email summary of status
// changes the NEXT day. Idempotent — call once per day or whenever creds
// change. SEF's PDF says "Pretplata za naredni dan" (subscription for the
// next day), suggesting daily re-subscription may be needed; we treat it
// as best-effort hygiene from the daily cron.
export async function sefSubscribe(
  creds: SefCredentials,
): Promise<SefApiResponse<{ Status?: string; Message?: string }>> {
  return sefRequest<{ Status?: string; Message?: string }>({
    creds,
    method: "POST",
    path: PATH.subscribe,
  });
}

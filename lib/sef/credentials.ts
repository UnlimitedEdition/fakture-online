// Resolve SEF credentials for a user — decrypts the per-user API key from
// fo_profiles and returns the appropriate base URL for prod/demo.

import { createClient } from "@/lib/supabase/server";
import { decryptSefApiKey } from "./key-encryption";
import { baseUrl } from "./api/endpoints";
import type { SefCredentials } from "./types";

export async function loadSefCredentials(userId: string): Promise<SefCredentials | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fo_profiles")
    .select("sef_api_key_encrypted, sef_api_key_iv, sef_demo_mode")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  if (!data.sef_api_key_encrypted || !data.sef_api_key_iv) return null;

  let apiKey: string;
  try {
    apiKey = await decryptSefApiKey(data.sef_api_key_encrypted, data.sef_api_key_iv);
  } catch (err) {
    console.error("[sef.credentials.decrypt]", {
      user_id: userId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }

  const isDemo = data.sef_demo_mode !== false;
  return {
    apiKey,
    isDemo,
    baseUrl: baseUrl(isDemo),
  };
}

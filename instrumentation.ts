import { assertEnvOrCrash } from "@/lib/env";

export function register() {
  assertEnvOrCrash();
}

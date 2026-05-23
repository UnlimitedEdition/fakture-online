-- H12: SEF API key encryption — version tag so master keys can be rotated
-- without silently breaking all existing ciphertexts.
--
-- A new column `sef_api_key_kv` records which master key version was used to
-- encrypt the row's `sef_api_key_encrypted`. lib/sef/key-encryption.ts picks
-- the matching env var at decrypt time:
--   kv = 1  →  SEF_KEY_ENCRYPTION_KEY_V1  (legacy)
--   kv = 2  →  SEF_KEY_ENCRYPTION_KEY     (current, used for all new writes)
--
-- A future rotation can backfill kv-1 rows with reencryptKey() and then retire
-- the V1 env var.
set search_path = public;

alter table fo_profiles
  add column if not exists sef_api_key_kv smallint not null default 1;

-- Backfill: any existing ciphertext was produced under the original (now V1)
-- master key. Rows without ciphertext also get kv=1 — it's a harmless default
-- and the next setSefApiKey() call will bump them to kv=2.
update fo_profiles
   set sef_api_key_kv = 1
 where sef_api_key_kv is null;

comment on column fo_profiles.sef_api_key_kv is
  'Encryption key version (kv) used for sef_api_key_encrypted. See lib/sef/key-encryption.ts. kv=1: SEF_KEY_ENCRYPTION_KEY_V1 (legacy); kv=2: SEF_KEY_ENCRYPTION_KEY (current).';

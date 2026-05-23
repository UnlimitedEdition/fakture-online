-- Hash-only callback secret (Phase 5)
-- Applied to ubwxjlclvootvrxwsrpa
set search_path = public;

alter table fo_profiles drop column if exists sef_callback_secret;
alter table fo_profiles rename column sef_callback_secret_hash to sef_callback_secret;

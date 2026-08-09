-- =============================================================================
-- Migration: Replace Clerk auth with self-hosted username + password auth
--
-- Run with:  psql "$DATABASE_URL" -f migrations/2026_auth_clerk_to_own_auth.sql
-- (or via your drizzle/postgres tooling of choice).
--
-- What this does:
--   1. Renames `clerk_id` -> `username`. Existing row values are preserved, so
--      every existing user keeps their id and continues to work after cutover.
--   2. Adds `password_hash` (nullable). Existing users get NULL until a password
--      is set; the seeded demo Super Admin and any newly registered users get a
--      hash. Role column + enum values are untouched (all roles preserved).
--   3. Idempotent: safe to run more than once.
-- =============================================================================

ALTER TABLE "users" RENAME COLUMN "clerk_id" TO "username";

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);

-- =============================================================================
-- The demo Super Admin account (username: superadmin / password:
-- SuperAdmin@123) is provisioned automatically by the backend SeedService on
-- boot when no Super Admin exists yet, so no SQL seeding is required here. If
-- a Super Admin already exists (from the Clerk era), the SeedService simply
-- gives that existing account a password so it can be used to log in.
-- =============================================================================
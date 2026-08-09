-- Migration: replace Clerk-as-identity with self-hosted auth
-- Users table: clerk_id -> username (data-preserving rename) and add password_hash.
-- Existing rows keep their value, so every existing user id keeps working.

ALTER TABLE "users" RENAME COLUMN "clerk_id" TO "username";

ALTER TABLE "users" RENAME CONSTRAINT "users_clerk_id_unique" TO "users_username_unique";

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);
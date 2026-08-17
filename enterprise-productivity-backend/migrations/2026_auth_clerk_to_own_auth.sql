

ALTER TABLE "users" RENAME COLUMN "clerk_id" TO "username";

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" varchar(255);

-- =============================================================================
-- The demo Super Admin account (username: superadmin / password: SuperAdmin@123) 
-- =============================================================================
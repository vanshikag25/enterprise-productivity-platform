ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'organization_owner', 'admin', 'manager', 'team_lead', 'employee', 'guest');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING (
  CASE "role"::text
    WHEN 'admin' THEN 'admin'::"public"."user_role"
    WHEN 'manager' THEN 'manager'::"public"."user_role"
    WHEN 'member' THEN 'employee'::"public"."user_role"
  END
);
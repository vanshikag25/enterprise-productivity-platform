CREATE TYPE "public"."audit_action_type" AS ENUM('message_edit', 'message_delete', 'user_join', 'user_leave', 'member_remove', 'role_change', 'channel_create', 'channel_delete', 'moderator_action', 'user_mute', 'user_unmute', 'user_ban', 'user_unban', 'channel_lock', 'channel_unlock');--> statement-breakpoint
CREATE TYPE "public"."audit_resource_type" AS ENUM('message', 'user', 'channel', 'project', 'department');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" "audit_action_type" NOT NULL,
	"actor_id" varchar(255) NOT NULL,
	"actor_role" "user_role" NOT NULL,
	"actor_name" varchar(512),
	"target_user_id" varchar(255),
	"target_user_name" varchar(512),
	"resource_type" "audit_resource_type" NOT NULL,
	"resource_id" varchar(255),
	"resource_name" varchar(512),
	"channel_id" varchar(255),
	"project_id" varchar(255),
	"previous_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_target_user_idx" ON "audit_events" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "audit_events_channel_idx" ON "audit_events" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."prevent_audit_event_modification"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'audit_events are append-only; % is not permitted (event id: %)', TG_OP, OLD.id;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "prevent_audit_event_modification_trigger"
BEFORE UPDATE OR DELETE ON "public"."audit_events"
FOR EACH ROW EXECUTE FUNCTION "public"."prevent_audit_event_modification"();
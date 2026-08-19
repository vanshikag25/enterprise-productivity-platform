CREATE TYPE "public"."workflow_execution_status" AS ENUM('pending', 'running', 'success', 'failed', 'retried');--> statement-breakpoint
CREATE TYPE "public"."workflow_trigger_type" AS ENUM('task_created', 'task_assigned', 'task_completed', 'task_overdue', 'task_status_changed', 'project_created', 'milestone_completed', 'milestone_delayed', 'meeting_ended', 'user_joined', 'message_received', 'mention_received');--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'workflow_create';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'workflow_update';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'workflow_delete';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'workflow_toggle';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'workflow_execution';--> statement-breakpoint
ALTER TYPE "public"."audit_resource_type" ADD VALUE 'workflow';--> statement-breakpoint
CREATE TABLE "automation_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_type" "workflow_trigger_type" NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"trigger_type" "workflow_trigger_type" NOT NULL,
	"event_key" varchar(512) NOT NULL,
	"trigger_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "workflow_execution_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"action_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_automation_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."automation_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_workflows_trigger_idx" ON "automation_workflows" USING btree ("trigger_type","enabled");--> statement-breakpoint
CREATE INDEX "automation_workflows_created_by_idx" ON "automation_workflows" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_executions_dedup_idx" ON "workflow_executions" USING btree ("workflow_id","event_key");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_idx" ON "workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions" USING btree ("status");
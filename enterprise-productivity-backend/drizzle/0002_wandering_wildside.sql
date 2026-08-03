CREATE TYPE "public"."task_priority" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('Todo', 'In Progress', 'In Review', 'Completed');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'Todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'Medium' NOT NULL,
	"due_date" timestamp with time zone,
	"created_by" varchar(255) NOT NULL,
	"assignee" varchar(255),
	"stream_channel_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

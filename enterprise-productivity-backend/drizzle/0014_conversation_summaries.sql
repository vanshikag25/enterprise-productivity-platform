CREATE TABLE "conversation_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar(255) NOT NULL,
	"period_type" varchar(255) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"overview" text NOT NULL,
	"key_decisions" jsonb NOT NULL,
	"action_items" jsonb NOT NULL,
	"unresolved_topics" jsonb NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"provider" varchar(255) NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_summaries_period_unique" ON "conversation_summaries" USING btree ("channel_id","period_type","period_start");
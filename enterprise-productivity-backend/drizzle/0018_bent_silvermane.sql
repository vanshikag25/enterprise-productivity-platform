CREATE TABLE "message_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"target_language" varchar(64) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"source_text" text NOT NULL,
	"detected_source_language" varchar(64),
	"translated_text" text NOT NULL,
	"provider" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_language" varchar(64) DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "message_translations_message_language_unique" ON "message_translations" USING btree ("message_id","target_language");
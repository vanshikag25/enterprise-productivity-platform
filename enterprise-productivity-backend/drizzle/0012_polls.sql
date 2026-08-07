CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_poll_id" varchar(255) NOT NULL,
	"channel_id" varchar(255) NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"deadline" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_stream_poll_id_unique" UNIQUE("stream_poll_id")
);

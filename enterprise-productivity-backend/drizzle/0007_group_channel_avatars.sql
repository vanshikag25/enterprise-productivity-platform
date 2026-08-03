CREATE TABLE "chat_channel_avatars" (
	"channel_id" varchar(255) PRIMARY KEY NOT NULL,
	"avatar_url" varchar(2048) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

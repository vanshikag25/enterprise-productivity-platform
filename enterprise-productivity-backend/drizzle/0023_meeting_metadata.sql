ALTER TABLE "meetings"
  ADD COLUMN IF NOT EXISTS "agenda" text,
  ADD COLUMN IF NOT EXISTS "notes" text,
  ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "recording_link" varchar(500);

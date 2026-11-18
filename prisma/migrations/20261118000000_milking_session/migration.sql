-- Existing records keep an unknown session until the owner supplies it.
ALTER TABLE "DairyRecord" ADD COLUMN "session" TEXT;

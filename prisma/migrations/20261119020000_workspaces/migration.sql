CREATE TYPE "Workspace" AS ENUM ('PETS', 'LIVESTOCK');
ALTER TABLE "User" ADD COLUMN "workspaces" "Workspace"[] NOT NULL DEFAULT ARRAY['PETS']::"Workspace"[],
 ADD COLUMN "activeWorkspace" "Workspace" NOT NULL DEFAULT 'PETS';
-- Preserve every animal/barn. This backfill changes account preferences only.
WITH usage AS (
 SELECT u."id",
  EXISTS (SELECT 1 FROM "Pet" p WHERE p."userId" = u."id" AND p."species" <> 'dairy-cattle') AS has_pets,
  (EXISTS (SELECT 1 FROM "Pet" p WHERE p."userId" = u."id" AND p."species" = 'dairy-cattle')
   OR EXISTS (SELECT 1 FROM "Barn" b WHERE b."userId" = u."id")) AS has_livestock
 FROM "User" u
)
UPDATE "User" u SET
 "workspaces" = CASE WHEN usage.has_livestock AND usage.has_pets THEN ARRAY['PETS','LIVESTOCK']::"Workspace"[]
  WHEN usage.has_livestock THEN ARRAY['LIVESTOCK']::"Workspace"[] ELSE ARRAY['PETS']::"Workspace"[] END,
 "activeWorkspace" = CASE WHEN usage.has_livestock AND NOT usage.has_pets THEN 'LIVESTOCK'::"Workspace" ELSE 'PETS'::"Workspace" END
FROM usage WHERE usage."id" = u."id";
ALTER TABLE "User" ADD CONSTRAINT "User_workspace_preference_check"
 CHECK (cardinality("workspaces") > 0 AND cardinality("workspaces") <= 2 AND "activeWorkspace" = ANY("workspaces"));

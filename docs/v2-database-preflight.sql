-- Run in the confirmed Leonis Neon database's SQL Editor before migration.
-- Metadata and aggregate counts only. No passwords or individual records.
-- A missing table/history is a reason to investigate, not to reset or baseline.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';

SELECT current_database() AS database_name,
       current_schema() AS schema_name,
       current_setting('server_version') AS postgres_version,
       current_setting('transaction_read_only') AS read_only;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT migration_name, checksum, started_at, finished_at, rolled_back_at,
       applied_steps_count
FROM public."_prisma_migrations"
ORDER BY started_at, migration_name;

SELECT 'User' AS record_type, count(*) AS record_count FROM public."User"
UNION ALL SELECT 'Pet', count(*) FROM public."Pet"
UNION ALL SELECT 'Meal', count(*) FROM public."Meal"
UNION ALL SELECT 'Weight', count(*) FROM public."Weight"
UNION ALL SELECT 'VetVisit', count(*) FROM public."VetVisit"
UNION ALL SELECT 'Reminder', count(*) FROM public."Reminder"
UNION ALL SELECT 'Photo', count(*) FROM public."Photo";

COMMIT;

-- Run via db_create.sh or:
-- $ psql -d postgres -f db_create.sql && psql -d auth -f db_schema.sql

-- Create role if not already there
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT -- SELECT list can stay empty for this
    FROM   pg_catalog.pg_roles
    WHERE  rolname = 'auth') THEN

    CREATE ROLE auth;
  END IF;
END
$do$;

-- Forcefully disconnect anyone
SELECT
	pid,
	pg_terminate_backend(pid)
FROM
	pg_stat_activity
WHERE
	datname = 'auth'
	AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS auth;

CREATE DATABASE auth
WITH
	OWNER = auth ENCODING = 'UTF8' CONNECTION
LIMIT
	= -1;

COMMENT ON DATABASE auth IS 'SvelteKit Auth Example';

-- Invoke this script via
-- $ psql -d postgres -f db_create.sql

-- Create role if not already there
DO
$do$
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
SELECT pid, pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'auth' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS auth;

CREATE DATABASE auth
  WITH 
  OWNER = auth
  ENCODING = 'UTF8'
  TABLESPACE = pg_default
  CONNECTION LIMIT = -1;

COMMENT ON DATABASE auth IS 'SvelteKit Auth Example';

-- Connect to auth database
\connect auth

-- Required for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Required to generate UUIDs for sessions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Using hard-coded roles (often this would be a table)
CREATE TYPE public.roles AS ENUM
  ('student', 'teacher', 'admin');

ALTER TYPE public.roles OWNER TO auth;

CREATE TABLE IF NOT EXISTS public.users (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
  role roles NOT NULL DEFAULT 'student'::roles,
  email character varying(80) COLLATE pg_catalog."default" NOT NULL,
  password character varying(80) COLLATE pg_catalog."default",
  first_name character varying(20) COLLATE pg_catalog."default" NOT NULL,
  last_name character varying(20) COLLATE pg_catalog."default" NOT NULL,
  phone character varying(23) COLLATE pg_catalog."default",
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_unique UNIQUE (email)
) TABLESPACE pg_default;

ALTER TABLE public.users OWNER to auth;

CREATE INDEX users_first_name_index
  ON public.users USING btree
  (first_name COLLATE pg_catalog."default" ASC NULLS LAST)
  TABLESPACE pg_default;

CREATE INDEX users_last_name_index
  ON public.users USING btree
  (last_name COLLATE pg_catalog."default" ASC NULLS LAST)
  TABLESPACE pg_default;

CREATE INDEX users_password
  ON public.users USING btree
  (password COLLATE pg_catalog."default" ASC NULLS LAST)
  TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id integer NOT NULL,
  expires timestamp with time zone DEFAULT (CURRENT_TIMESTAMP + '02:00:00'::interval),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_fkey FOREIGN KEY (user_id)
    REFERENCES public.users (id) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE CASCADE
    NOT VALID
) TABLESPACE pg_default;

ALTER TABLE public.sessions OWNER to auth;

CREATE OR REPLACE FUNCTION public.authenticate(
	input json,
	OUT response json)
    RETURNS json
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
  input_email varchar(80) := LOWER(TRIM((input->>'email')::varchar));
  input_password varchar(80) := (input->>'password')::varchar;
BEGIN
  IF input_email IS NULL OR input_password IS NULL THEN
    response := json_build_object('statusCode', 400, 'status', 'Please provide an email address and password to authenticate.', 'user', NULL);
	RETURN;
  END IF;

  WITH user_authenticated AS (
    SELECT users.id, role, first_name, last_name, phone
    FROM users
    WHERE email = input_email AND password = crypt(input_password, password) LIMIT 1
  )
  SELECT json_build_object(
	'statusCode', CASE WHEN (SELECT COUNT(*) FROM user_authenticated) > 0 THEN 200 ELSE 401 END,
	'status', CASE WHEN (SELECT COUNT(*) FROM user_authenticated) > 0
	  THEN 'Login successful.'
	  ELSE 'Invalid username/password combination.'
	END,
	'user', CASE WHEN (SELECT COUNT(*) FROM user_authenticated) > 0
	  THEN (SELECT json_build_object(
		  'id', user_authenticated.id,
		  'role', user_authenticated.role,
		  'email', input_email,
		  'firstName', user_authenticated.first_name,
		  'lastName', user_authenticated.last_name,
		  'phone', user_authenticated.phone)
		 FROM user_authenticated)
	  ELSE NULL
	  END,
	'sessionId', (SELECT create_session(user_authenticated.id) FROM user_authenticated)
  ) INTO response;
END;
$BODY$;

ALTER FUNCTION public.authenticate(json) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.create_session(
	input_user_id integer)
    RETURNS uuid
    LANGUAGE 'sql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DELETE FROM sessions WHERE user_id = input_user_id;
INSERT INTO sessions(user_id) VALUES (input_user_id) RETURNING sessions.id;
$BODY$;

ALTER FUNCTION public.create_session(integer) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.get_session(input_session_id uuid)
  RETURNS json
  LANGUAGE 'sql'
AS $BODY$
SELECT json_build_object(
  'id', sessions.user_id,
  'role', users.role,
  'email', users.email,
  'firstName', users.first_name,
  'lastName', users.last_name,
  'phone', users.phone
) AS user
FROM sessions
  INNER JOIN users ON sessions.user_id = users.id
WHERE sessions.id = input_session_id AND expires > CURRENT_TIMESTAMP LIMIT 1;
$BODY$;

ALTER FUNCTION public.get_session(uuid) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.register(
	input json,
	OUT user_session json)
    RETURNS json
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
  input_email varchar(80) := LOWER(TRIM((input->>'email')::varchar));
  input_first_name varchar(20) := TRIM((input->>'firstName')::varchar);
  input_last_name varchar(20) := TRIM((input->>'lastName')::varchar);
  input_phone varchar(23) := TRIM((input->>'phone')::varchar);
  input_password varchar(80) := (input->>'password')::varchar;
BEGIN
  SELECT json_build_object('id', create_session(users.id), 'user', json_build_object('id', users.id, 'role', users.role, 'email', input_email, 'firstName', users.first_name, 'lastName', users.last_name, 'phone', users.phone)) INTO user_session FROM users WHERE email = input_email;
  IF NOT FOUND THEN
    INSERT INTO users(role, password, email, first_name, last_name, phone)
      VALUES('student', crypt(input_password, input_password), input_email, input_first_name, input_last_name, input_phone)
      RETURNING
        json_build_object(
          'sessionId', create_session(users.id),
          'user', json_build_object('id', users.id, 'role', 'student', 'email', input_email, 'firstName', input_first_name, 'lastName', input_last_name, 'phone', input_phone)
        ) INTO user_session;
  END IF;
END;
$BODY$;

ALTER FUNCTION public.register(json) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.start_gmail_user_session(
	input json,
	OUT user_session json)
    RETURNS json
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
DECLARE
  input_email varchar(80) := LOWER(TRIM((input->>'email')::varchar));
  input_first_name varchar(20) := TRIM((input->>'firstName')::varchar);
  input_last_name varchar(20) := TRIM((input->>'lastName')::varchar);
BEGIN
  SELECT json_build_object('id', create_session(users.id), 'user', json_build_object('id', users.id, 'role', users.role, 'email', input_email, 'firstName', users.first_name, 'lastName', users.last_name, 'phone', users.phone)) INTO user_session FROM users WHERE email = input_email;
  IF NOT FOUND THEN
    INSERT INTO users(role, email, first_name, last_name)
      VALUES('student', input_email, input_first_name, input_last_name)
      RETURNING
        json_build_object(
          'id', create_session(users.id),
          'user', json_build_object('id', users.id, 'role', 'student', 'email', input_email, 'firstName', input_first_name, 'lastName', input_last_name, 'phone', null)
        ) INTO user_session;
  END IF;
END;
$BODY$;

ALTER FUNCTION public.start_gmail_user_session(json) OWNER TO auth;

CREATE OR REPLACE PROCEDURE public.reset_password(
	input_id integer,
	input_password text)
LANGUAGE 'sql'
AS $BODY$
  UPDATE users SET password = crypt(input_password, gen_salt('bf', 8)) WHERE id = input_id;
END;
$BODY$;

ALTER PROCEDURE public.reset_password(integer, text) OWNER TO auth;

CREATE OR REPLACE PROCEDURE public.upsert_user(input json)
LANGUAGE plpgsql
AS $BODY$
DECLARE
  input_id integer := COALESCE((input->>'id')::integer,0);
  input_role roles := COALESCE((input->>'role')::roles, 'student');
  input_email varchar(80) := LOWER(TRIM((input->>'email')::varchar));
  input_password varchar(80) := COALESCE((input->>'password')::varchar, '');
  input_first_name varchar(20) := TRIM((input->>'firstName')::varchar);
  input_last_name varchar(20) := TRIM((input->>'lastName')::varchar);
  input_phone varchar(23) := TRIM((input->>'phone')::varchar);
BEGIN
  IF input_id = 0 THEN
    INSERT INTO users (role, email, password, first_name, last_name, phone)
    VALUES (
	  input_role, input_email, crypt(input_password, gen_salt('bf', 8)),
	  input_first_name, input_last_name, input_phone);
  ELSE
    UPDATE users SET
	  role = input_role,
	  email = input_email,
	  password = CASE WHEN input_password = ''
		  THEN password -- leave as is (we are updating fields other than the password)
		  ELSE crypt(input_password, gen_salt('bf', 8))
	  END,
	  first_name = input_first_name,
	  last_name = input_last_name,
	  phone = input_phone
	WHERE id = input_id;
  END IF;
END;
$BODY$;

ALTER PROCEDURE public.upsert_user(json) OWNER TO auth;

CREATE OR REPLACE PROCEDURE public.update_user(input_id integer, input json)
LANGUAGE plpgsql
AS $BODY$
DECLARE
  input_email varchar(80) := LOWER(TRIM((input->>'email')::varchar));
  input_password varchar(80) := COALESCE((input->>'password')::varchar, '');
  input_first_name varchar(20) := TRIM((input->>'firstName')::varchar);
  input_last_name varchar(20) := TRIM((input->>'lastName')::varchar);
  input_phone varchar(23) := TRIM((input->>'phone')::varchar);
BEGIN
  UPDATE users SET
    email = input_email,
	password = CASE WHEN input_password = ''
      THEN password -- leave as is (we are updating fields other than the password)
	  ELSE crypt(input_password, gen_salt('bf', 8))
	END,
	first_name = input_first_name,
	last_name = input_last_name,
	phone = input_phone
  WHERE id = input_id;
END;
$BODY$;

ALTER PROCEDURE public.update_user(integer, json) OWNER TO auth;

CALL public.upsert_user('{"id":0, "role":"admin", "email":"admin@example.com", "password":"admin123", "firstName":"Jane", "lastName":"Doe", "phone":"412-555-1212"}'::json);
CALL public.upsert_user('{"id":0, "role":"teacher", "email":"teacher@example.com", "password":"teacher123", "firstName":"John", "lastName":"Doe", "phone":"724-555-1212"}'::json);
CALL public.upsert_user('{"id":0, "role":"student", "email":"student@example.com", "password":"student123", "firstName":"Justin", "lastName":"Case", "phone":"814-555-1212"}'::json);

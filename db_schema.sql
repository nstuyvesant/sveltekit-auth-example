-- Run via db_create.sh or:
-- $ psql -d auth -f db_schema.sql
-- Required for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Required to generate UUIDs for sessions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Required for case-insensitive text (email_address domain)
CREATE EXTENSION IF NOT EXISTS citext;

-- Using hard-coded roles (often this would be a table)
CREATE TYPE public.roles AS ENUM('student', 'teacher', 'admin');

ALTER TYPE public.roles OWNER TO auth;

-- Domains
CREATE DOMAIN public.email_address AS citext CHECK (
	length(VALUE) <= 254
	AND VALUE = btrim(VALUE)
	AND VALUE ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
);

COMMENT ON DOMAIN public.email_address IS 'RFC-compliant email address (case-insensitive, max 254 chars)';

CREATE DOMAIN public.persons_name AS text CHECK (length(VALUE) <= 20) NOT NULL;

COMMENT ON DOMAIN public.persons_name IS 'Person first or last name (max 20 characters)';

CREATE DOMAIN public.phone_number AS text CHECK (
	VALUE IS NULL
	OR length(VALUE) <= 50
);

COMMENT ON DOMAIN public.phone_number IS 'Phone number (max 50 characters)';

CREATE TABLE IF NOT EXISTS public.users (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY (
		INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1
	),
	role roles NOT NULL DEFAULT 'student'::roles,
	email email_address NOT NULL,
	password character varying(80) COLLATE pg_catalog."default",
	first_name persons_name,
	last_name persons_name,
	opt_out boolean NOT NULL DEFAULT false,
	email_verified boolean NOT NULL DEFAULT false,
	phone phone_number,
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_email_unique UNIQUE (email)
) TABLESPACE pg_default;

ALTER TABLE public.users OWNER TO auth;

CREATE INDEX users_first_name_index ON public.users USING btree (
	first_name COLLATE pg_catalog."default" ASC NULLS LAST
) TABLESPACE pg_default;

CREATE INDEX users_last_name_index ON public.users USING btree (
	last_name COLLATE pg_catalog."default" ASC NULLS LAST
) TABLESPACE pg_default;

CREATE INDEX users_password ON public.users USING btree (
	password COLLATE pg_catalog."default" ASC NULLS LAST
) TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS public.sessions (
	id uuid NOT NULL DEFAULT uuid_generate_v4 (),
	user_id integer NOT NULL,
	expires timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours'),
	CONSTRAINT sessions_pkey PRIMARY KEY (id),
	CONSTRAINT sessions_user_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE,
	CONSTRAINT sessions_one_per_user UNIQUE (user_id)
) TABLESPACE pg_default;

ALTER TABLE public.sessions OWNER TO auth;

CREATE OR REPLACE FUNCTION public.authenticate (input json, OUT response json) RETURNS json LANGUAGE 'plpgsql' COST 100 VOLATILE PARALLEL UNSAFE AS $BODY$
DECLARE
  input_email text := trim(input->>'email');
  input_password text := input->>'password';
  v_user users%ROWTYPE;
BEGIN
  IF input_email IS NULL OR input_password IS NULL THEN
    response := json_build_object('statusCode', 400, 'status', 'Please provide an email address and password to authenticate.', 'user', NULL, 'sessionId', NULL);
    RETURN;
  END IF;

  SELECT * INTO v_user FROM users
  WHERE email = input_email AND password = crypt(input_password, password) LIMIT 1;

  IF NOT FOUND THEN
    response := json_build_object('statusCode', 401, 'status', 'Invalid username/password combination.', 'user', NULL, 'sessionId', NULL);
  ELSIF NOT v_user.email_verified THEN
    response := json_build_object('statusCode', 403, 'status', 'Please verify your email address before logging in.', 'user', NULL, 'sessionId', NULL);
  ELSE
    response := json_build_object(
      'statusCode', 200,
      'status', 'Login successful.',
      'user', json_build_object('id', v_user.id, 'role', v_user.role, 'email', input_email, 'firstName', v_user.first_name, 'lastName', v_user.last_name, 'phone', v_user.phone, 'optOut', v_user.opt_out),
      'sessionId', create_session(v_user.id)
    );
  END IF;
END;
$BODY$;

ALTER FUNCTION public.authenticate (json) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.create_session (input_user_id integer) RETURNS uuid LANGUAGE 'sql' COST 100 VOLATILE PARALLEL UNSAFE AS $BODY$
  -- Remove expired sessions (index-friendly cleanup)
  DELETE FROM sessions WHERE expires < CURRENT_TIMESTAMP;
  -- Remove any existing session(s) for this user
  DELETE FROM sessions WHERE user_id = input_user_id;
  -- Create the new session
  INSERT INTO sessions(user_id) VALUES (input_user_id) RETURNING sessions.id;
$BODY$;

ALTER FUNCTION public.create_session (integer) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.get_session (input_session_id uuid) RETURNS json LANGUAGE 'sql' AS $BODY$
SELECT json_build_object(
  'id', sessions.user_id,
  'role', users.role,
  'email', users.email,
  'firstName', users.first_name,
  'lastName', users.last_name,
  'phone', users.phone,
  'optOut', users.opt_out,
  'expires', sessions.expires
) AS user
FROM sessions
  INNER JOIN users ON sessions.user_id = users.id
WHERE sessions.id = input_session_id AND expires > CURRENT_TIMESTAMP LIMIT 1;
$BODY$;

ALTER FUNCTION public.get_session (uuid) OWNER TO auth;

-- Like get_session but also bumps the expiry (sliding sessions).
-- Returns NULL if the session is expired or does not exist.
CREATE OR REPLACE FUNCTION public.get_and_update_session (input_session_id uuid) RETURNS json LANGUAGE 'plpgsql' AS $BODY$
DECLARE
  result json;
BEGIN
  UPDATE sessions
    SET expires = CURRENT_TIMESTAMP + INTERVAL '2 hours'
  WHERE id = input_session_id AND expires > CURRENT_TIMESTAMP;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'id', sessions.user_id,
    'role', users.role,
    'email', users.email,
    'firstName', users.first_name,
    'lastName', users.last_name,
    'phone', users.phone,
    'optOut', users.opt_out,
    'expires', sessions.expires
  ) INTO result
  FROM sessions
    INNER JOIN users ON sessions.user_id = users.id
  WHERE sessions.id = input_session_id;

  RETURN result;
END;
$BODY$;

ALTER FUNCTION public.get_and_update_session (uuid) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.verify_email_and_create_session (input_id integer) RETURNS uuid LANGUAGE 'plpgsql' COST 100 VOLATILE PARALLEL UNSAFE AS $BODY$
DECLARE
  session_id uuid;
BEGIN
  UPDATE users SET email_verified = true WHERE id = input_id;
  SELECT create_session(input_id) INTO session_id;
  RETURN session_id;
END;
$BODY$;

ALTER FUNCTION public.verify_email_and_create_session (integer) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.register (input json, OUT user_session json) RETURNS json LANGUAGE 'plpgsql' COST 100 VOLATILE PARALLEL UNSAFE AS $BODY$
DECLARE
  input_email text := trim(input->>'email');
  input_first_name text := trim(input->>'firstName');
  input_last_name text := trim(input->>'lastName');
  input_phone text := trim(input->>'phone');
  input_password text := input->>'password';
BEGIN
  PERFORM id FROM users WHERE email = input_email;
  IF NOT FOUND THEN
    INSERT INTO users(role, password, email, first_name, last_name, phone)
      VALUES('student', crypt(input_password, gen_salt('bf', 12)), input_email, input_first_name, input_last_name, input_phone)
      RETURNING
        json_build_object(
          'sessionId', create_session(users.id),
          'user', json_build_object('id', users.id, 'role', 'student', 'email', input_email, 'firstName', input_first_name, 'lastName', input_last_name, 'phone', input_phone, 'optOut', users.opt_out)
        ) INTO user_session;
  ELSE -- user is registering account that already exists so set sessionId and user to null so client can let them know
    SELECT authenticate(input) INTO user_session;
  END IF;
END;
$BODY$;

ALTER FUNCTION public.register (json) OWNER TO auth;

CREATE OR REPLACE FUNCTION public.start_gmail_user_session (input json, OUT user_session json) RETURNS json LANGUAGE 'plpgsql' COST 100 VOLATILE PARALLEL UNSAFE AS $BODY$
DECLARE
  input_email varchar(80) := LOWER(TRIM((input->>'email')::varchar));
  input_first_name varchar(20) := TRIM((input->>'firstName')::varchar);
  input_last_name varchar(20) := TRIM((input->>'lastName')::varchar);
BEGIN
  -- Google verifies email ownership; mark user as verified on every sign-in
  UPDATE users SET email_verified = true WHERE email = input_email;
  SELECT json_build_object('id', create_session(users.id), 'user', json_build_object('id', users.id, 'role', users.role, 'email', input_email, 'firstName', users.first_name, 'lastName', users.last_name, 'phone', users.phone)) INTO user_session FROM users WHERE email = input_email;
  IF NOT FOUND THEN
    INSERT INTO users(role, email, first_name, last_name, email_verified)
      VALUES('student', input_email, input_first_name, input_last_name, true)
      RETURNING
        json_build_object(
          'id', create_session(users.id),
          'user', json_build_object('id', users.id, 'role', 'student', 'email', input_email, 'firstName', input_first_name, 'lastName', input_last_name, 'phone', null)
        ) INTO user_session;
  END IF;
END;
$BODY$;

ALTER FUNCTION public.start_gmail_user_session (json) OWNER TO auth;

CREATE PROCEDURE public.delete_session (input_id integer) LANGUAGE sql AS $$
DELETE FROM sessions WHERE user_id = input_id;
$$;

CREATE OR REPLACE PROCEDURE public.delete_user (input_id integer) LANGUAGE sql AS $$
DELETE FROM users WHERE id = input_id;
$$;

ALTER PROCEDURE public.delete_user (integer) OWNER TO auth;

CREATE OR REPLACE PROCEDURE public.reset_password (IN input_id integer, IN input_password text) LANGUAGE plpgsql AS $procedure$
BEGIN
  UPDATE users SET password = crypt(input_password, gen_salt('bf', 12)) WHERE id = input_id;
END;
$procedure$;

ALTER PROCEDURE public.reset_password (integer, text) OWNER TO auth;

CREATE OR REPLACE PROCEDURE public.upsert_user (input json) LANGUAGE plpgsql AS $BODY$
DECLARE
  input_id integer := COALESCE((input->>'id')::integer, 0);
  input_role roles := COALESCE((input->>'role')::roles, 'student');
  input_email varchar(80) := LOWER(TRIM((input->>'email')::varchar));
  input_password varchar(80) := COALESCE((input->>'password')::varchar, '');
  input_first_name varchar(20) := TRIM((input->>'firstName')::varchar);
  input_last_name varchar(20) := TRIM((input->>'lastName')::varchar);
  input_phone varchar(23) := TRIM((input->>'phone')::varchar);
BEGIN
  IF input_id = 0 THEN
    INSERT INTO users (role, email, password, first_name, last_name, phone, email_verified)
    VALUES (
      input_role, input_email, crypt(input_password, gen_salt('bf', 12)),
      input_first_name, input_last_name, input_phone, true
    );
  ELSE
    UPDATE users SET
      role = input_role,
      email = input_email,
      email_verified = true,
      password = CASE WHEN input_password = ''
        THEN password -- leave as is (we are updating fields other than the password)
        ELSE crypt(input_password, gen_salt('bf', 12))
      END,
      first_name = input_first_name,
      last_name = input_last_name,
      phone = input_phone
    WHERE id = input_id;
  END IF;
END;
$BODY$;

ALTER PROCEDURE public.upsert_user (json) OWNER TO auth;

CREATE OR REPLACE PROCEDURE public.update_user (input_id integer, input json) LANGUAGE plpgsql AS $BODY$
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
      ELSE crypt(input_password, gen_salt('bf', 12))
    END,
    first_name = input_first_name,
    last_name = input_last_name,
    phone = input_phone
  WHERE id = input_id;
END;
$BODY$;

ALTER PROCEDURE public.update_user (integer, json) OWNER TO auth;

-- MFA codes table (one pending code per user, replaced on each new login attempt)
CREATE TABLE IF NOT EXISTS public.mfa_codes (
	user_id integer NOT NULL,
	code varchar(6) NOT NULL,
	expires timestamptz NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
	CONSTRAINT mfa_codes_pkey PRIMARY KEY (user_id),
	CONSTRAINT mfa_codes_user_fkey FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

ALTER TABLE public.mfa_codes OWNER TO auth;

-- Generate and store a fresh 6-digit MFA code for a user, returning the code
CREATE OR REPLACE FUNCTION public.create_mfa_code (input_user_id integer) RETURNS varchar LANGUAGE plpgsql AS $BODY$
DECLARE
  v_code varchar(6) := lpad(floor(random() * 1000000)::integer::text, 6, '0');
BEGIN
  DELETE FROM mfa_codes WHERE expires < CURRENT_TIMESTAMP;
  INSERT INTO mfa_codes(user_id, code)
  VALUES (input_user_id, v_code)
  ON CONFLICT (user_id) DO UPDATE
    SET code = EXCLUDED.code,
        expires = CURRENT_TIMESTAMP + INTERVAL '10 minutes';
  RETURN v_code;
END;
$BODY$;

ALTER FUNCTION public.create_mfa_code (integer) OWNER TO auth;

-- Verify an MFA code for a given email address.
-- Returns the user_id on success (and deletes the code), or NULL on failure.
CREATE OR REPLACE FUNCTION public.verify_mfa_code (input_email text, input_code text) RETURNS integer LANGUAGE plpgsql AS $BODY$
DECLARE
  v_user_id integer;
BEGIN
  SELECT mfa_codes.user_id INTO v_user_id
  FROM mfa_codes
    INNER JOIN users ON mfa_codes.user_id = users.id
  WHERE users.email = input_email
    AND mfa_codes.code = input_code
    AND mfa_codes.expires > CURRENT_TIMESTAMP;

  IF FOUND THEN
    DELETE FROM mfa_codes WHERE user_id = v_user_id;
  END IF;

  RETURN v_user_id;
END;
$BODY$;

ALTER FUNCTION public.verify_mfa_code (text, text) OWNER TO auth;

CALL public.upsert_user (
	'{"id":0, "role":"admin", "email":"admin@example.com", "password":"admin123", "firstName":"Jane", "lastName":"Doe", "phone":"412-555-1212"}'::json
);

CALL public.upsert_user (
	'{"id":0, "role":"teacher", "email":"teacher@example.com", "password":"teacher123", "firstName":"John", "lastName":"Doe", "phone":"724-555-1212"}'::json
);

CALL public.upsert_user (
	'{"id":0, "role":"student", "email":"student@example.com", "password":"student123", "firstName":"Justin", "lastName":"Case", "phone":"814-555-1212"}'::json
);

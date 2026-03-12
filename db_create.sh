#!/usr/bin/env bash
set -euo pipefail

# Creates the auth role and database, then applies the schema.
# Usage: bash db_create.sh
#
# Optionally override the superuser with PGUSER env var:
#   PGUSER=myuser bash db_create.sh

psql -d postgres -f db_create.sql
psql -d auth -f db_schema.sql

echo "Database created successfully."

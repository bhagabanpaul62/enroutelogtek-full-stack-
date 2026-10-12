#!/bin/sh
# Runs when the production container starts: update the database, then start the API.
set -e

# Build DATABASE_URL from the separate POSTGRES_* values (set in docker-compose.yml).
# encodeURIComponent makes special characters in the password (@ : / # ...) safe -
# without it a password like "abc@12" breaks the URL and the app can't connect.
# If DATABASE_URL is already set (e.g. by hand), it is used as-is.
if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL="$(node -e '
        const e = process.env, enc = encodeURIComponent;
        console.log(`postgres://${enc(e.POSTGRES_USER)}:${enc(e.POSTGRES_PASSWORD)}@${e.POSTGRES_HOST}:5432/${enc(e.POSTGRES_DB)}`);
    ')"
    export DATABASE_URL
fi

# Apply any new Drizzle migrations (files in ./drizzle). Already-applied ones are skipped.
# Openship starts Postgres first but doesn't wait until it accepts connections,
# so retry for a while instead of failing on the first try.
tries=0
until ./node_modules/.bin/drizzle-kit migrate; do
    tries=$((tries + 1))
    if [ "$tries" -ge 10 ]; then
        echo "Migrations failed after $tries tries - stopping."
        exit 1
    fi
    echo "Database not ready (or migration failed), retrying in 3s ($tries/10)..."
    sleep 3
done

# "exec" replaces this shell with node, so node receives the stop signal directly.
exec node src/index.js

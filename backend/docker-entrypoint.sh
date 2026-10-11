#!/bin/sh
# Runs when the production container starts: update the database, then start the API.
set -e

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

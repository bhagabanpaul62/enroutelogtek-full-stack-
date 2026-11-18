#!/bin/sh
# Test frontend for Playwright: a production build on :3101 pointed at the test API (:8100).
# Built into .next-e2e so it runs beside the normal `next dev`, which owns .next.
# Production, not `next dev`: dev compiles each route on first visit, which made the first
# login per route take 30s+ and the suite flaky. A build also tests what actually ships.
set -e
cd "$(dirname "$0")/.."
export NEXT_PUBLIC_APP_URL=http://localhost:8100/api/v1
export NEXT_DIST_DIR=.next-e2e
node node_modules/next/dist/bin/next build
exec node node_modules/next/dist/bin/next start -p 3101

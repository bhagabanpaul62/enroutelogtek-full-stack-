# Build log: shared state for every session and agent

**Read this first. Update it last.** This file is the single place that says where the build stands, so work can stop and resume at any time, by any session or agent.
Plan and decisions: [PRD.md](PRD.md). Ticket meaning: [tickets/README.md](../tickets/README.md), [tickets/adhoc-journey.md](../tickets/adhoc-journey.md).

## Rules for every agent

1. Before starting: read "Current state" and "Next" below, and your wave's row.
2. Touch only the files your brief says you own.
3. When done: append ONE entry to "Log" (newest at the bottom): date, wave, agent label, what changed (files), how verified (commands + result), what is left. Keep it under 10 lines.
4. Never edit someone else's log entry. Never delete history. Fix mistakes with a new entry.
5. If you are blocked, write it under "Blocked" with what you need, then stop.

## Current state

| Item | Value |
| --- | --- |
| Branch | `suman` (pushed to origin after each wave passes) |
| Running wave | Wave 1 (planning) |
| Last commit | `180d396` PRD, migration 0009 registered, recharts + Playwright |

### Waves

| Wave | Status | Commit |
| --- | --- | --- |
| 0 Foundation: kit, data grid, demo seed, API e2e harness, Playwright | done | see log |
| 1 Secure and settle: ENR-001-004, 007-009, team verify, redesign existing screens | not started | — |
| 2 Ad Hoc complete: AJ-01-39, ENR-015/016/024/025/029-031 | not started | — |
| 3 Contracts and capacity: ENR-018-023, 026-028, 032/033 | not started | — |
| 4 Money and insight: ENR-010/011/017/034-038 | not started | — |
| 5 Release check: full end-to-end as every actor | not started | — |

## How to run locally

| What | How |
| --- | --- |
| Database | Local Postgres on 5432: db `enroute`, user `enrouteDb` / `enroute09832`. Migrate: `cd backend && ./node_modules/.bin/drizzle-kit migrate` |
| Mail | Dev SMTP sink on 127.0.0.1:2525 (login codes also print as `[DEV] Login code for ...` in the backend log) |
| Backend | `cd backend && EMAIL_HOST=127.0.0.1 EMAIL_PORT=2525 EMAIL_SECURE=false EMAIL_USER=dev EMAIL_PASSWORD=dev FRONTEND_URL=http://localhost:3001 node src/index.js` → :8000 |
| Frontend | `cd frontend && pnpm dev --port 3001` (port 3000 is used by another project on this machine) |
| Demo logins | `admin@enroute.local` / `Admin@12345`; `customer@`, `transporter@`, `transporter2@`, `fleetowner@`, `broker@` `enroute.local` / `Demo@12345` (seed: `cd backend && pnpm seed:demo`, once Wave 0 lands) |

`backend/.env` holds real Hostinger SMTP and R2 keys. The run command above overrides email so no real mail goes out. Never commit `.env`.

## Next

Wave 0 finishes → review its report → fix issues → browser check of /kit-preview and /grid-preview → commit + push → start Wave 1.

## Blocked

(nothing)

## Log

- **2026-11-17 · setup · main session**: cloned repo, `backend/.env` + `frontend/.env.local`, local DB + root admin + demo customer/transporter (by hand). Found migration 0009 missing from the drizzle journal; regenerated it with drizzle-kit (same SQL) and verified with a fresh `drizzle-kit migrate`. Wrote PRD. Added recharts + @playwright/test. Commit `180d396`.
- **2026-11-17 · wave 0 · main session**: added `frontend/src/shared/ui/kit/tone.js` (TONE + STATUS map, one source of status colours). Launched Wave 0 workflow: agents `kit`, `data-grid`, `backend-foundation`, then `playwright`, then `reviewer`.
- **2026-11-17 · wave 0 · kit (sonnet)**: `frontend/src/shared/ui/kit/*` (Panel, Stats, Badges, Nav, Facts, Charts, Modal+SidePanel, States, Timeline, motion, index barrel), kit tokens block in `globals.css`, `/kit-preview` page. No framer-motion (CSS + rAF). Build passes.
- **2026-11-17 · wave 0 · data-grid (sonnet)**: `frontend/src/shared/ui/data-grid/*` ported from Deksie to JSX (types: text, number, money paise, date, datetime, status, chip, person, boolean, email, phone, progress; client + server/cursor mode; mobile cards). `filter-logic.check.mjs` passes. `/grid-preview` page.
- **2026-11-17 · wave 0 · backend-foundation (sonnet)**: `pnpm seed:demo` (idempotent; roles via `createPresetRoles`), `pnpm dev:mail`, `pnpm test:e2e` (own DB `enroute_test`, backend :8100, sink :2526; helpers `startStack/login/api`). Unit 92/92, e2e 7/7.
- **2026-11-17 · wave 0 · playwright (sonnet)**: `frontend/playwright.config.js`, `frontend/e2e/*`, `pnpm e2e`: 5 smoke specs (each role logs in).
- **2026-11-17 · wave 0 · reviewer (sonnet)**: found lint error in e2e fixture, flaky e2e (1/5), untracked `test-results/`.
- **2026-11-17 · wave 0 · main session (fixes + check)**: eslint ignores hooks rule in `e2e/**`; gitignore Playwright output and `.next-e2e`. Flake root cause: test frontend ran `next dev` on a fresh copy, so every route compiled cold (30s+ on first login). Now `e2e/serve-frontend.sh` does `next build` + `next start` into `NEXT_DIST_DIR=.next-e2e` (new `distDir` env in `next.config.mjs`); logins went from up to 30s to ~1s. 6 of last 7 runs green; 1 failure left no artifacts (known flake, watch it). Browser check: kit and grid render in style. **Kit bugs to fix first in Wave 1**: StatCard label truncated by its ArrowButton; money shows "Rs 4,20,000" and wraps (should be compact ₹4.2L via one formatter); "72%" overlaps TickBar in a StatCard; FactList shows labels but NO values; SummaryRows/Fact labels truncate in narrow panels; Needs-action/Details panels leave blank space (rule 8). Grid has its own status chip/empty/skeleton: swap to the kit ones (DRY).

# EnrouteLogtek architecture (current)

Written 18 Nov 2026 for the `int` branch (Waves 0-2a, 3a and 4a merged; Wave 2b and 3b are still landing). This is the one current description of the product. Status of every ticket is in [tickets/README.md](../tickets/README.md); the running build record is [BUILD-LOG.md](BUILD-LOG.md); product decisions are in [PRD.md](PRD.md). Older files (`dbml/outher/PROJECT_CONTEXT.md`, `arc/*.html`) are history.

What it is: a B2B freight platform. Four company types (customer, transporter, broker, fleet owner) plus the platform owner (`root_admin`). Customers post work, transporters quote or bid, work becomes trips (one per truck), trips end with proof of delivery.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), plain JS/JSX, recharts, shared UI kit + data grid in `frontend/src/shared/ui` |
| Backend | Express 5 (Node, ES modules), plain JS, express-validator |
| Database | PostgreSQL, Drizzle ORM, migrations in `backend/drizzle` |
| Auth | Password + emailed login code, JWT access (15 min) and refresh (30 days) in HttpOnly cookies, one session per user |
| Files | Cloudflare R2 (documents, POD, payment proof) |
| Mail | Nodemailer (SMTP). Delivery is queued and retried (`notification_deliveries`) |
| Spreadsheet | `xlsx` (SheetJS) on the backend, for RFQ lane import |
| Deploy | Docker, Caddy, GitHub Actions to a VPS ([deploy/README.md](../deploy/README.md)) |
| Package manager | pnpm |

## Code layout

Backend: `backend/src/features/<feature>/` holds `controllers/ routes/ services/ schemas/ validations/` plus pure `*.rules.js` (with `*.rules.test.js`) and `*.constants.js`. Shared code is in `backend/src/shared/` (auth, role, `requirePermission`, `subscriptionGate`, `documentActor` middleware, errors, response helpers). Imports use `#features/*` and `#shared/*`. All routes mount in `backend/src/routes/index.js` under `/api/v1`.

| Backend feature | What it owns |
| --- | --- |
| `auth` | register, OTP, login code, sessions, password reset |
| `platform` | root admin: review, approve, reject, block companies |
| `company` | profile, branches, compliance documents (settings) |
| `document` | upload/delete with ownership checks, R2 storage |
| `network` | company discovery and connections (requests, block) |
| `team` | company roles and permissions, members |
| `load` | Ad Hoc loads, bids, awards, masters (truck types, materials), load clock |
| `rfq` | contract RFQs: lanes, quotes, board, lane awards, `.xlsx`/`.csv` lane import (3b), RFQ clock |
| `contract` | contracts from accepted lane awards, amendments, cancellation, indents ("Daily") |
| `fleet` | vehicles, drivers, document expiry clock |
| `trip` | trips (one per truck), status, POD, extra charges, closure, ratings |
| `allocation` | transporter to broker / fleet-owner work offers (data model only so far, spec below) |
| `subscription` | plans, payment proof, seats, renewal, grace, read-only gate |
| `notification` | in-app list, durable email delivery worker |

Frontend: `frontend/src/app/` has route groups `(public)`, `(admin)` and `(dashboard)/{customer,transporter,broker,fleet-owner}`. Features sit in `frontend/src/features/{auth,billing,contracts,fleet,loads,marketing,network,notifications,platform,rfq,settings,team,trips}`. One nav config, `frontend/src/shared/lib/dashboardNav.js`, drives all four dashboards. Status colours come from one map, `shared/ui/kit/tone.js`; money and dates use `shared/lib/format.js`. After login the user is sent to the dashboard for their `companyType`. Pages in the nav that have no module yet render "coming soon".

## Data model

Migrations 0000-0014 in `backend/drizzle`. Read the spec for each area; do not duplicate the tables here.

| Area | Spec / source |
| --- | --- |
| Auth, companies, network, documents | `backend/src/features/{auth,company,network,document}/schemas`, [login and registration flow](dbml/outher/AUTH_FLOW.md) |
| Team roles and permissions | [team roles spec](superpowers/specs/2026-11-11-team-roles-design.md) |
| Ad Hoc loads, trips, fleet | [adhoc-execution spec](superpowers/specs/2026-11-17-adhoc-execution-design.md) |
| Contract RFQs, contracts, indents | [contract-rfq spec](superpowers/specs/2026-11-18-contract-rfq-design.md) |
| Subscriptions, notification delivery | [subscriptions spec](superpowers/specs/2026-11-18-subscriptions-design.md) |
| Allocation (broker, fleet-owner offers) | [allocation spec](superpowers/specs/2026-11-18-allocation-broker-design.md) |

Conventions: UUID ids, money in paise (integers), a history/events row for every status change (`load_events`, trip events, `allocation_events`, ...), writes in transactions, every list and read scoped by the signed-in company.

## Roles and permissions

Company roles are per company and custom; the permission keys are defined in code (`backend/src/features/team/team.permissions.js`) and stored roles hold a subset. Each company gets preset roles: Owner (locked), Co-admin, Bid manager, Trip manager, Viewer, Accounts. A permission can be limited to company types. Keys today: `loads.manage`, `loads.award`, `rfqs.manage`, `contracts.manage`, `quotes.submit`, `contracts.respond`, `bids.submit`, `awards.respond`, `trips.assign`, `trips.update`, `fleet.manage`, `network.manage`, `team.manage`, `roles.manage`, `billing.manage`, `allocations.manage`, `offers.respond`. Every company route checks a permission (`requirePermission`); `root_admin` is separate and only reaches `/platform`. Rules: no privilege escalation, last Owner cannot be removed, changes apply on the next request.

Who does what (PRD section 4 is binding): customers create loads/RFQs and award; transporters bid, quote, accept, plan trips and may offer trips on; brokers do not bid on customer loads, they receive allocations from transporters and place them with connected fleet owners or transporters; fleet owners run vehicles/drivers and accept offered work; earnings are the agreed rate plus approved extras of completed trips, shown as earned, never as paid.

## Lifecycles

States below are the enums in code (`*.constants.js`); transitions are enforced in `*.rules.js`.

- **Load (Ad Hoc):** `draft -> live -> closed | expired -> awarded -> accepted -> in_execution -> completed`, or `cancelled` before acceptance. Award record: `pending -> accepted | declined | expired` (24 h). Bidding window 12 h default, 5 bid attempts, auto-extension, all moved by the load clock.
- **Trip (one per truck):** `planned -> reported -> loading -> loaded -> in_transit <-> delayed -> reached_drop -> delivered -> completed`; `cancelled` from before transit. Executor reports; customer confirms and approves or rejects POD; extra charges go `proposed -> approved | rejected`. Spec has who may do each step.
- **RFQ (contract):** `draft -> open -> closed -> awarded`, or `cancelled`. Quotes per lane with revisions. Lane award `pending -> accepted | declined | expired`; acceptance creates the contract.
- **Contract:** `active <-> amending -> expired | cancelled` (cancel needs notice). Indent (dated truck request against a contract): `requested -> acknowledged | declined | cancelled -> fulfilled`; acknowledged indents count toward monthly volume and create a contract load with its award and trips.
- **Subscription:** `pending_payment -> active -> grace -> expired` (or `cancelled`). Payment proof `submitted -> approved | rejected`, approval applies once. New approved companies get a 14-day, 3-seat trial; grace is 7 days. In `expired` the company API is read-only (HTTP 402 on writes, GET always passes). `/auth`, `/billing`, `/notifications`, `/documents`, `/platform` are never gated.
- **Allocation (planned):** `offered -> accepted | declined | expired | withdrawn`; reserves specific trips; see the spec.

## Background jobs

Started in `backend/src/index.js`, all in-process timers (single API instance assumed; multi-instance safety is a tracked item):

| Job | Does |
| --- | --- |
| `startLoadClock` | close, extend and expire bidding; expire pending awards (30 s) |
| `startRfqClock` | close RFQs at deadline, expire lane awards |
| `startFleetExpiryClock` | flag vehicle/driver documents nearing expiry |
| `startSubscriptionClock` | active -> grace -> expired, reminders |
| `startDeliveryWorker` | send queued emails, retry failures |
| allocation expiry (planned, 60 s) | expire offered allocations past `respond_by` |

## Run locally

Needs Node, pnpm and Postgres on 5432. Environment values live in `backend/.env` and `frontend/.env.local` (never commit them; copy keys from your own setup, nothing real belongs in docs).

```bash
# backend (API on :8000)
cd backend && pnpm install
./node_modules/.bin/drizzle-kit migrate          # apply migrations to the DB in DATABASE_URL
pnpm seed:root-admin                             # first platform admin (ROOT_ADMIN_EMAIL / ROOT_ADMIN_PASSWORD)
pnpm seed:demo                                   # demo companies, roles, vehicles, drivers, a trip (idempotent)
pnpm dev:mail                                    # SMTP sink on 127.0.0.1:2525
EMAIL_HOST=127.0.0.1 EMAIL_PORT=2525 EMAIL_SECURE=false EMAIL_USER=dev EMAIL_PASSWORD=dev \
  FRONTEND_URL=http://localhost:3001 node src/index.js

# frontend
cd frontend && pnpm install && pnpm dev --port 3001
```

Login is two steps: password, then a 6-digit code emailed to the user. With the mail sink the code is also printed in the backend log as `[DEV] Login code for <email>: <code>`. Demo logins (customer, transporter, transporter2, fleetowner, broker `@enroute.local`, and admin) and their passwords are created by `seed:demo`; read them in `backend/src/scripts/seedDemo.js` and `seedRootAdmin.js`. Demo companies are on a 3-seat trial.

Tests:

| Command | What |
| --- | --- |
| `cd backend && pnpm test` | unit tests for every `*.rules.js` (no DB) |
| `cd backend && pnpm test:e2e` | API end-to-end on its own DB `enroute_test`, backend :8100, mail sink :2526 |
| `cd frontend && pnpm lint` | eslint |
| `cd frontend && pnpm e2e` | Playwright browser suite (builds and serves the frontend into `.next-e2e`, :3101) |

E2E suites share ports and the `enroute_test` DB, so run one at a time. CI is `.github/workflows/ci.yml`; deployment is `deploy.yml` (see [deploy/README.md](../deploy/README.md)).

# EnrouteLogtek

B2B freight procurement and trip management for customers (shippers), transporters, brokers and fleet owners: register, get approved, connect, procure transport (Ad Hoc bidding or contract RFQs), allocate vehicles, run trips, confirm delivery with proof, and bill the platform subscription. Tagline: SMARTER LOGISTICS. STRONGER FUTURE. Domain: enroutelogtek.in.

## Read these

| Need | File |
| --- | --- |
| How the product is built (stack, modules, roles, lifecycles, run and test) | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| What is done, open and next (ticket status with evidence) | [tickets/README.md](tickets/README.md) |
| Product decisions and scope | [docs/PRD.md](docs/PRD.md) |
| Running build record for agents and sessions | [docs/BUILD-LOG.md](docs/BUILD-LOG.md) |
| Design specs per area | [docs/superpowers/specs/](docs/superpowers/specs/) |
| Deploying to the VPS | [deploy/README.md](deploy/README.md) |

## Stack

Next.js frontend, Express backend, PostgreSQL with Drizzle ORM, Cloudflare R2 for files, Nodemailer for mail, JWT in HttpOnly cookies, Docker + Caddy + GitHub Actions for deploy, pnpm.

## Quick start (local)

```bash
cd backend && pnpm install
./node_modules/.bin/drizzle-kit migrate     # needs DATABASE_URL in backend/.env
pnpm seed:root-admin && pnpm seed:demo      # platform admin + demo companies
pnpm dev:mail                               # dev SMTP sink on :2525 (second terminal)
EMAIL_HOST=127.0.0.1 EMAIL_PORT=2525 EMAIL_SECURE=false EMAIL_USER=dev EMAIL_PASSWORD=dev \
  FRONTEND_URL=http://localhost:3001 node src/index.js     # API on :8000

cd ../frontend && pnpm install && pnpm dev --port 3001
```

Login sends a 6-digit code by email; with the sink it is also printed in the backend log. Environment variables live in `backend/.env` and `frontend/.env.local`, which are never committed and never copied into docs. Full commands, demo accounts and test suites: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#run-locally).

## Layout

```
backend/    Express API: src/features/<feature>/{controllers,routes,services,schemas,validations}, drizzle/ migrations
frontend/   Next.js app: src/app route groups, src/features, src/shared (kit, data grid, nav)
deploy/     Caddyfile and remote deploy script
docs/       ARCHITECTURE, PRD, BUILD-LOG, specs, historical notes
tickets/    master ticket tracker
```

## Rules of the repo

Business first, then database, backend, frontend. Plain JS. Money in integer paise. Every company route is scoped to the signed-in company and checks a permission. Status changes run in a transaction and write a history row. Pure rules live in `*.rules.js` with unit tests.

## History

Earlier versions of this README described a roadmap with "frozen" phases, a `DbDesing/` folder and a controllers/routes layout by type. That layout and those phase labels are obsolete (replaced 18 Nov 2026). The old daily tracker and auth diagrams are kept, marked historical, in `docs/dbml/outher/`. The project was never on MongoDB; any MongoDB wording in older PDFs does not apply.

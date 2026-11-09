# Ad Hoc Load: build tickets

Last updated: 09 Nov 2026 (all 46 build tickets done and verified)

Flow: [docs/arc/adhoc-flow-diagram.html](../docs/arc/adhoc-flow-diagram.html). Details and options: [docs/arc/adhoc-load-plan.html](../docs/arc/adhoc-load-plan.html).

Tick a box when the item is merged and working. Ticket IDs (AH-01 and so on) are for referring to items in chat and commits.

## Progress

| Phase | Done | Total |
| --- | --- | --- |
| 0 · Already in place | 8 | 8 |
| 1 · Company approval | 4 | 4 |
| 2 · Database tables and master lists | 8 | 8 |
| 3 · Create load (diagram steps 1 to 5) | 13 | 13 |
| 4 · Bidding and closing (diagram steps 6 and 7) | 10 | 10 |
| 5 · Award and accept (diagram steps 8 and 9) | 6 | 6 |
| 6 · Notifications | 2 | 2 |
| 7 · Quality | 3 | 3 |
| Waiting on the client | 0 | 9 |
| Before starting | 0 | 1 |

## 0 · Already in place

Built in the auth, company and network phases. Ad Hoc reuses these.

- [x] Login refuses companies that are not approved (`session.controller.js`)
- [x] Auth middleware and role middleware
- [x] User roles include `bid_manager` and `trip_manager`
- [x] Network list can return accepted transporter connections (`GET /api/v1/network?status=accepted&companyType=transporter`)
- [x] Dashboard shell: sidebar, layouts, customer RFQs page and transporter Bids page as placeholders
- [x] Notification table schema
- [x] Email service with templates
- [x] Document upload to Cloudflare R2 (reuse for the PDF attachment in step 2)

## 1 · Company approval

Blocks everything. Nobody can log in until their company is approved. Built by the other Claude session on 09 Nov 2026 (service, routes, validations, admin pages).

- [x] AH-01 `GET /platform/companies` lists pending companies
- [x] AH-02 `PATCH /platform/companies/:id/approve` sets approved and sends the approval email
- [x] AH-03 `PATCH /platform/companies/:id/reject` sets rejected with a reason and sends the rejection email
- [x] AH-04 Root admin page: pending list with Approve and Reject buttons (built by the other session: `features/platform/**`, `app/(admin)/rootAdmin/**`; code-reviewed here, not run)

## 2 · Database tables and master lists

- [x] AH-05 `loads` table: kind (ad_hoc, contract), status, route, schedule, material, truck, price basis, target price, closes_at, max_attempts
- [x] AH-06 `load_invitations` table, snapshot taken at publish
- [x] AH-07 `bids` and `bid_attempts` tables
- [x] AH-08 `awards` table with accept_by, accepted_at, declined_at
- [x] AH-09 `vehicle_types` master list (final list waits on client Q9)
- [x] AH-10 `commodities` master list
- [x] AH-11 PIN code to city and state lookup
- [x] AH-12 Migration generated and applied

## 3 · Create load (diagram steps 1 to 5)

Backend

- [x] AH-13 `POST /loads` creates a draft
- [x] AH-14 `PATCH /loads/:id` saves one step (draft autosave)
- [x] AH-15 `POST /loads/:id/publish` validates, snapshots invitations, sets status live
- [x] AH-16 `GET /loads` and `GET /loads/:id` for the customer
- [x] AH-17 Validations: pickup at least 2 h ahead, closes_at before pickup, weight above 0, trucks at least 1, at least 1 invite, invitees are accepted connections
- [x] AH-18 Permissions: customer admin and bid_manager create and publish, viewer reads only

Frontend, customer

- [x] AH-19 Loads page with status filter and a New Ad Hoc button (new "Loads" item in the customer sidebar; RFQs stays for contract loads)
- [x] AH-20 Step 1 Route and schedule
- [x] AH-21 Step 2 Material and truck, with optional special needs, notes and PDF
- [x] AH-22 Step 3 Price and bid rules
- [x] AH-23 Step 4 Invite transporters: connected list, select, search
- [x] AH-24 Step 5 Review and publish: summary from form state, edit links, terms
- [x] AH-25 Success state: load ID, closes-in, invited count, View bids

## 4 · Bidding and closing (diagram steps 6 and 7)

Backend

- [x] AH-26 `GET /loads` (as a transporter) lists the loads the company was invited to
- [x] AH-27 `GET /loads/:id` transporter view: own rank only, no other bidders
- [x] AH-28 `POST /loads/:id/bids` submits an attempt: max 5, before closes_at, final = base + margin
- [x] AH-29 `GET /loads/:id/my-bid` returns attempts and current rank
- [x] AH-30 Rank recomputed on every attempt, ties broken by earlier time
- [x] AH-31 Clock job closes the load at closes_at, or marks it expired when there are no bids
- [x] AH-32 `POST /loads/:id/extend` and `POST /loads/:id/cancel` (cancel only before award)

Frontend, transporter

- [x] AH-33 Bids page: invited loads with closes-in
- [x] AH-34 Load detail with bid calculator, my attempts and my rank

Frontend, customer

- [x] AH-35 Load detail with live bid board (transporter, amount, attempts, rank), extend and cancel

## 5 · Award and accept (diagram steps 8 and 9)

- [x] AH-36 `POST /loads/:id/award` picks any bid with an optional reason, sets awarded
- [x] AH-37 `POST /awards/:id/accept` and `/decline` within 24 h; decline or timeout returns the load to closed
- [x] AH-38 Clock job expires unanswered awards after 24 h
- [x] AH-39 Customer: Award button on the bid board
- [x] AH-40 Transporter: accept or decline screen
- [x] AH-41 Accepted load fields: truck number, driver name, driver phone (simple version of step 10, full trips later)

## 6 · Notifications

- [x] AH-42 Notification rows and email on: invited, new bid, closing in 1 h, awarded, not selected, accepted, declined
- [x] AH-43 Notification list and unread count in the dashboard header

## 7 · Quality

- [x] AH-44 Test runner: Node's built-in `node --test` (`pnpm test` in backend/, no new dependency)
- [x] AH-45 Tests: 20 unit tests on the pure rules (calculator, rank, publish checks, attempt limit, acceptance window) plus a 64-check API smoke run on 09 Nov 2026
- [x] AH-46 Audit log of status changes: `load_events` table (migration 0006), written in the same transaction as each change, shown as Activity on the customer load page (hidden from transporters)

## How it was verified (09 Nov 2026)

- `pnpm test` in backend/: 21 unit tests pass (calculator, rank, publish checks, attempt limit, acceptance window, pickup time read as Indian time)
- API smoke run with three local test users: 68 checks pass (including the audit log), from draft to completed, including refusals (sixth attempt, bid after close, award before close, cancel after award, wrong transporter accepting)
- Browser: every new page screenshotted signed in as the customer and both transporters, desktop and phone; the form clicked through from a saved draft to a published load
- `pnpm lint` in frontend/: no new findings (one older warning in createAccount.jsx); `pnpm build`: compiles, 59 pages

## Waiting on the client

Answers change defaults, not structure. Build can start before these come back.

- [ ] Q1 What Daily means
- [ ] Q2 Full truck load only in version 1
- [ ] Q3 Default bid window (12 h proposed)
- [ ] Q4 Target price hidden from bidders
- [ ] Q5 Who can be invited
- [ ] Q6 Cancel after award
- [ ] Q7 Acceptance window (24 h proposed)
- [ ] Q8 Default price basis (per truck proposed)
- [ ] Q9 Truck type list

## Before starting

- [ ] Commit the uncommitted dashboard work (about 40 files) so Ad Hoc starts from a clean base

# Enroute project tickets

Reviewed: **10 November 2026** against local commit `ac99695`; status updated **18 November 2026** from the [BUILD-LOG](../docs/BUILD-LOG.md) on the `int` branch (Waves 0-2a, 3a, 4a merged). This is the master index for what is built and what comes next. These are repository tickets, not GitHub Issues.

## Start here

**Next: ENR-045 (merge), then Wave 5 release check (ENR-039).** Otherwise work through the open tickets in numerical order. A dependency must be closed before its dependent ticket starts; independent work can proceed while a product decision is waiting. The order is a recommendation, not authorization to implement every ticket automatically.

The product is a B2B logistics platform for customers, transporters, brokers and fleet owners: register → approve → connect → procure transport → award → allocate vehicles → execute trips → confirm delivery → report results. Platform admins and drivers are actors, not additional company types.

- **Closed:** an existing implementation milestone. Its exact scope and evidence appear below. Closed does not mean every edge case or production deployment has been verified.
- **Partly done:** built and recorded in the build log, with the exact remaining items listed; not closed until those pass.
- **Open:** unfinished implementation, a known fix, or missing verification. Nothing in the open queue has been implemented by creating this tracker.
- **Blocked:** an open ticket waiting on the listed dependency or a product-owner decision. Keep it open until both the decision and implementation checks are complete.
- **P0:** address before exposing the affected flow to real users. **P1:** core product work. **P2:** subsequent operations, reporting or reliability work. Order within this document breaks priority ties.
- Close a build ticket only after its acceptance checks, relevant automated tests, and the actual user flow pass. Record the date, commands/results and reviewed change. A bug fix must first have a failing regression test.
- New dependencies, schema/API behavior changes, and production/shared-database operations still require the discussion and approval in the engineering rules.

## What exists today, without mixing it with the roadmap

| Area | Current boundary |
| --- | --- |
| Authentication and onboarding | Registration bound to the verified email, document ownership checks, emailed login code, one session per user (DONE-18, ENR-001-003). Per-IP OTP limit open (ENR-004, ENR-042). |
| Company administration and network | Approval/rejection/blocking, connections, company settings, branches, compliance documents and team/roles exist (ENR-007-009, 012, 013). |
| Ad Hoc loads | Draft, publish, invitation, bidding, close/extend/cancel, award, acceptance, FTL/PTL, race-safe transitions (Wave 2a). Leftovers in ENR-041. |
| Contract RFQs and contracts | Built on `int` (Wave 3a): RFQs, quotes, board, lane awards, contracts, amendments, indents. API-checked by curl; browser and e2e checks open (ENR-043). `.xlsx` import is Wave 3b. |
| Execution | Vehicles, drivers, one trip per truck, status, POD, charges, ratings built in Wave 2a (merged); browser/e2e check and Wave 2b items open (ENR-041). |
| Allocation and brokers | Spec and data model only (migration 0014). Services, routes and UI are Wave 3b. |
| Notifications | In-app list plus durable email delivery with retries (Wave 4a); failure-recovery check open (ENR-017). |
| Dashboards | Nav drives four dashboards; real metrics, reports and earnings are Wave 4b (ENR-035-037). |
| Subscriptions | Plans, payment proof, approval once, seats, renewal, grace and read-only 402 gate built and API-verified (ENR-011); extra seats/downgrade open (ENR-034). |
| Deployment | Docker/CI/deploy files exist. A live deployment, restored backup and real mail/storage delivery were not verified in this review. |

## Closed — already implemented milestones

The references identify the implementation, not a claim that it was exercised live today. Historical verification is explicitly marked. Follow-up fixes do not erase the original feature milestone.

| ID | Closed scope | Evidence / limit |
| --- | --- | --- |
| DONE-01 | PostgreSQL/Drizzle foundation and Docker configurations | [Schemas](../backend/src/features/), [migrations](../backend/drizzle/), [development Compose](../docker-compose.dev.yml). Runtime deployment remains ENR-039–040. |
| DONE-02 | Public landing, about, solution, pricing and support pages | [Marketing pages](../frontend/src/features/marketing/ui/); current frontend build passes. Pricing content is not a purchase flow. |
| DONE-03 | Email OTP, registration, initial company/branch and pending-approval screens | [Auth backend](../backend/src/features/auth/controllers/auth.controller.js), [auth frontend](../frontend/src/features/auth/). Boundary/abuse fixes: ENR-002/004. |
| DONE-04 | R2 document upload/delete primitives and registration upload UI | [Document controller](../backend/src/features/document/controllers/document.controller.js). Ownership protection remains ENR-001; storage delivery not tested today. |
| DONE-05 | Login, logout, refresh, current-user and password reset flows | [Session controller](../backend/src/features/auth/controllers/session.controller.js), [auth frontend](../frontend/src/features/auth/). Exact-session enforcement implemented under ENR-003. |
| DONE-06 | Platform company review: list/detail, approve, reject, block/unblock and root-admin seed | [Platform backend](../backend/src/features/platform/), [admin UI](../frontend/src/features/platform/), [seed](../backend/src/scripts/seedRootAdmin.js). Historical API checks recorded in the [build map](../docs/arc/enroute-build-map.html). |
| DONE-07 | Company discovery and connection request/accept/reject/cancel/remove/block flows | [Network backend](../backend/src/features/network/), [network UI](../frontend/src/features/network/). Source reviewed; runtime not rerun today. |
| DONE-08 | Four company dashboard shells, role/company guards, session profile, logout and 404 | [Navigation map](../frontend/src/shared/lib/dashboardNav.js), [guards](../frontend/src/shared/guards/), [layouts](../frontend/src/shared/ui/layout/). Current build passes; placeholder destinations are still open work. |
| DONE-09 | Truck/material master lists and PIN lookup with manual fallback | [Master service](../backend/src/features/load/services/master.service.js). Final approved truck list remains ENR-014. |
| DONE-10 | Customer Ad Hoc wizard, draft save, validation, publish and invitation snapshot | [Load service](../backend/src/features/load/services/load.service.js), [customer UI](../frontend/src/features/loads/ui/customer/); historical AH-13–25 in [Ad Hoc tickets](adhoc-load.md). |
| DONE-11 | Transporter bids, base-plus-margin calculator, five attempts, own rank and bid history | [Bid service](../backend/src/features/load/services/bid.service.js), [transporter UI](../frontend/src/features/loads/ui/transporter/); historical AH-26–35. Rules tests pass today. |
| DONE-12 | Window closing, expiry, extension and pre-award cancellation | [Clock](../backend/src/features/load/services/clock.service.js), [load service](../backend/src/features/load/services/load.service.js); historical AH-31–32. Concurrency/retry guarantees remain ENR-015–016. |
| DONE-13 | Customer-selected award, transporter acceptance/decline and timeout | [Award service](../backend/src/features/load/services/award.service.js); historical AH-36–40. This does not create a separate contract record. |
| DONE-14 | Basic truck/driver entry and customer-confirmed load completion | [Assignment](../backend/src/features/load/services/award.service.js), [completion](../backend/src/features/load/services/load.service.js). Full fleet/trips/POD remain ENR-024–031. |
| DONE-15 | Notification bell/list/count, mark-read actions and email attempts | [Notification service](../backend/src/features/notification/services/notification.service.js), [notification UI](../frontend/src/features/notifications/); historical AH-42–43. Delivery reliability remains ENR-017. |
| DONE-16 | Customer load activity history with transactional event records | [Event service](../backend/src/features/load/services/loadEvent.service.js), [activity UI](../frontend/src/features/loads/ui/customer/ActivityLog.jsx); historical AH-46. |
| DONE-17 | Load rules test suite, frontend lint/build and CI/deployment definitions | [21 rules tests](../backend/src/features/load/load.rules.test.js), [CI](../.github/workflows/ci.yml), [deploy workflow](../.github/workflows/deploy.yml). Local checks pass; no GitHub Actions run inspected today. |
| DONE-18 | Login confirmation code and one active session, newest login wins (11 Nov 2026) | [Login rules](../backend/src/features/auth/login.rules.js) with [25 tests](../backend/src/features/auth/login.rules.test.js), [login service](../backend/src/features/auth/services/loginChallenge.service.js), [code screen](../frontend/src/features/auth/ui/LoginOtpPage.jsx), migration `0007_login_otp`. Verified locally with a mail sink: 52 API checks and a two-browser UI check. No root-admin account existed locally. |
| ENR-001 | Document upload/delete bound to an authorized actor | `documentActor` middleware; Wave 1, commit `ef9fca7`; API e2e 24/24 and unit 107/107 ([BUILD-LOG](../docs/BUILD-LOG.md), 18 Nov wave 1 entries). Security cases in `backend/test/e2e/security.test.js`. |
| ENR-002 | Registration bound to the verified email, draft to pending only | Wave 1, `ef9fca7`; same verification as ENR-001. Fixer also repaired a submit-registration 500. |
| ENR-003 | Exact active login session; root admin verified | DONE-18 plus Wave 1 (root admin verified), `ef9fca7`; API e2e 24/24. |
| ENR-005 | Reproducible API and browser checks | Wave 0 `1192233` (`pnpm test:e2e` on own DB `enroute_test`) and Wave 1 (`pnpm e2e` Playwright). 18 Nov: API e2e 24/24, browser 22/22 three runs in a row after the flake fix ([BUILD-LOG](../docs/BUILD-LOG.md)). Limit: CI wiring of these suites is not recorded. |
| ENR-007 | Company profile settings | Wave 1 Settings (Profile), `ef9fca7`; API e2e 24/24, settings screen seen in a browser 18 Nov. Limit: uses `team.manage`, no separate `company.manage` permission. |
| ENR-008 | Branches after registration | Wave 1 Settings (Branches), `ef9fca7`; same verification as ENR-007. |
| ENR-009 | Company compliance documents (GST/PAN replacement goes to pending review) | Wave 1 Settings (Documents), `ef9fca7`; same verification as ENR-007. |
| ENR-011 | Subscription activation by manual payment review | Wave 4a, `02b5615`, merged to `int` as `104fb7d`. Subscriptions e2e 12/12 on its own backend: plan, submit, approve once under concurrency, seat limit under concurrency ([BUILD-LOG](../docs/BUILD-LOG.md)). Limit: seat prompt on reactivate not checked in a browser. |
| ENR-012 | Add team members (temporary password, forced change) | Built 12 Nov (progress note kept in git history); Wave 1 row "team verify" done, `ef9fca7`. Seat limit now enforced by Wave 4a subscriptions (concurrency checked in the 12/12 run). |
| ENR-013 | Team roles and access lifecycle | Built 12 Nov; Wave 1 "team verify" done, `ef9fca7`. Rules in `team.rules.js`; unit tests green (262/262 on `int`). |
| ENR-032 | Broker commercial permissions (decision) | Recorded as binding in [PRD](../docs/PRD.md) section 4, "Broker (ENR-032)": brokers do not bid on customer loads; they receive allocations from transporters and place them with connected fleet owners or transporters. Client may change later. |

## Open — ordered build queue

Every build ticket includes backend behavior, the necessary screen/API integration, authorization, empty/error states and relevant tests for that capability. Use existing features where linked; avoid rebuilding the closed milestones. Product decisions below are questions to settle, not silently assumed requirements.

### Phase A — fix and verify the existing flows

### ENR-004 — Bound OTP/login attempts and report delivery failure accurately
- **Partly done · P1 · Depends:** ENR-002, ENR-003. Login codes already have limits and report a failed email (DONE-18). Registration OTP, password reset and password-guess limits remain.
- **Status 18 Nov 2026:** Built (Wave 1, `ef9fca7`): 30 s resend cooldown, 5 sends/hour, 5 guesses, mail failure returns 502. **Remaining:** per-IP OTP limit (needs a shared store), password-guess and reset limits not recorded as built.
- **Build:** [Auth handlers](../backend/src/features/auth/controllers/auth.controller.js) have no visible resend/guess limit and return “OTP sent” even after a mail failure. Define limits and consistent external-input validation for OTP, reset and login; agree any new dependency before adding it.
- **Done / verify:** fake-clock tests cover resend/attempt limits, expiry and recovery; malformed inputs fail predictably; mail failure gives an actionable response without exposing account/secret data.

### Phase B — company administration, subscriptions and people

### ENR-006 — Confirm role names and permissions
- **Partly done · P1 · Decision · Depends:** none.
- **Status 18 Nov 2026:** Decided and built (team roles spec). **Remaining:** product-owner sign-off of the matrix after the new keys (`allocations.manage`, `offers.respond`, `billing.manage`, `rfqs.manage`, ...); branch scope still out.
- **Decide:** reconcile the old role descriptions with [current roles](../backend/src/features/auth/schemas/users.Schema.js): `root_admin`, `admin`, `co-admin`, `viewer`, `bid_manager`, `trip_manager`, `accounts`. Define company/branch scope, who invites/manages users and who may assign trucks.
- **Done / verify:** product owner approves one permission matrix and display names; existing stored roles retain compatible behavior or have an approved migration plan. ENR-012/013 must not guess these rules.
- **Progress (12 Nov 2026):** decided in chat on 11 Nov: per-company custom roles with a locked Owner, permissions defined in code, presets that reproduce the old roles, migration 0008 maps stored roles. Matrix and rules: [team roles spec](../docs/superpowers/specs/2026-11-11-team-roles-design.md). Branch scope stays out (ENR-008). Close once the owner confirms the spec.

### ENR-010 — Confirm plans, seat counts and payment rules
- **Partly done · P1 · Decision · Depends:** ENR-006.
- **Status 18 Nov 2026:** Defaults implemented in Wave 4a (14-day trial, 3 seats, 7-day grace, 1/3/12-month periods, 30-day month pro-rata; `02b5615`). **Remaining:** client sign-off of prices and rules; a real plan table has not been approved.
- **Decide:** use the [subscription schemas](../backend/src/features/subscription/schemas/) as a starting point. Approve prices, included seats, who consumes a seat, pending-invite counting, expiry/grace behavior and manual payment-proof review.
- **Done / verify:** a signed-off table covers activation, extra seats, renewal, expiry and rejection. No price or entitlement is inferred from the marketing page.

### Phase C — stabilize Ad Hoc and build contract procurement

### ENR-014 — Resolve the existing Ad Hoc client questions
- **Partly done · P1 · Decision · Depends:** none.
- **Status 18 Nov 2026:** Q1-Q7 answered as defaults in [PRD](../docs/PRD.md) section 4. **Remaining:** client confirmation, and Q8-Q9 (price basis, truck types) not recorded as decided.
- **Decide:** close Q1–Q9 in the [Ad Hoc tracker](adhoc-load.md#waiting-on-the-client): Daily meaning, FTL/PTL scope, bid window, target-price visibility, invitees, post-award cancellation, acceptance window, price basis and truck types. Current code uses a 12-hour default, 24-hour acceptance, five attempts and connected transporters; these are not evidence of client approval.
- **Done / verify:** record each approved answer and its effect on [defaults](../backend/src/features/load/load.constants.js), validation and screens. Test any resulting behavior change; keep Daily/contract dispatch scope in ENR-018/026.

### ENR-015 — Make load transitions safe under competing requests
- **Partly done · P1 · Depends:** ENR-005, ENR-014.
- **Status 18 Nov 2026:** Wave 2a made loads and the clock race-safe (`ff44b8b`, merged `c696ff0`). **Remaining (Wave 2b, running):** re-award after a missed bid (H6), hold vehicle/driver until trip completed (H7), stale placement misses on cancel (M11), real-database race tests.
- **Build:** [update/cancel/complete](../backend/src/features/load/services/load.service.js) and [assignment](../backend/src/features/load/services/award.service.js) read state before later writes. Make validation and transition consistent under concurrency; preserve existing awarded/completed records.
- **Done / verify:** competing cancel/award, assign/complete and draft-edit/publish requests cannot overwrite a terminal state or create conflicting history; repeated requests have a documented outcome. Add real-database race tests before fixes.

### ENR-016 — Make bidding deadlines restart-safe and safe across API instances
- **Partly done · P1 · Depends:** ENR-015.
- **Status 18 Nov 2026:** Wave 2a reworked the clock (`ff44b8b`). **Remaining:** two-worker/restart tests not recorded; all clocks are still in-process timers.
- **Build:** the [clock](../backend/src/features/load/services/clock.service.js) is an in-process 30-second timer with unbounded due-row scans. Add bounded processing and single-claim/idempotent handling for closes, auto-extensions, expiry and reminder scheduling; choose the simplest approved deployment approach.
- **Done / verify:** restart and two-worker tests produce one valid transition/event per action; overdue work catches up; large batches make progress without duplicate extensions or reminders. A new worker/queue dependency requires approval.

### ENR-017 — Retry and observe notification delivery
- **Partly done · P2 · Depends:** ENR-016.
- **Status 18 Nov 2026:** Wave 4a built durable delivery with retries (`02b5615`; unit 208/208). **Remaining:** simulated mail/db failure recovery not run; an approval notice can be lost on a crash between commit and notify.
- **Build:** [notifications](../backend/src/features/notification/services/notification.service.js) currently log failures without durable retries. Record pending/failed delivery and retry safely while keeping the underlying business action successful; expose enough status to diagnose failures.
- **Done / verify:** simulated mail/storage/database failures recover without duplicate recipient notifications; unread counts remain scoped; failed email cannot undo a bid/award. Verify recovery using test services.

### ENR-018 — Approve the contract RFQ and Daily/indent specification
- **Partly done · P1 · Decision · Depends:** ENR-006, ENR-014.
- **Status 18 Nov 2026:** Wave 3a chose defaults in the [contract-rfq spec](../docs/superpowers/specs/2026-11-18-contract-rfq-design.md) (RFQ window 60 min-30 days, 3 extensions, 10 quote revisions, 200 lanes/200 KB import, 7-day cancel notice, indent max 50 trucks). **Remaining:** client sign-off.
- **Decide:** define period/lane/volume RFQs versus one-off Ad Hoc; quotation revision/visibility, Excel columns, award acceptance, contract terms, amendments/cancellation and Daily dispatch/indent semantics. Use the [build map](../docs/arc/enroute-build-map.html) as proposal history, not final authority.
- **Done / verify:** approved examples cover one and multiple lanes, quantities, rates, expiry and failures; data ownership and backward compatibility with existing Ad Hoc loads are explicit. ENR-019–023/026 wait for this specification.

### ENR-019 — Create and publish contract RFQs manually
- **Partly done · P1 · Depends:** ENR-013, ENR-018.
- **Status 18 Nov 2026:** Built in Wave 3a (`9b8480c`, merged to `int` `a53f25a`); unit 230/230; curl flow RFQ to award passed. **Remaining:** browser check, `test:e2e` coverage (not run on `int`).
- **Build:** replace customer RFQ placeholders with draft/list/detail, lane/period/volume entry and invitations. Extend or add data structures only according to ENR-018; [Ad Hoc creation](../backend/src/features/load/services/load.service.js) must keep its current meaning.
- **Done / verify:** authorized customers publish a validated RFQ visible only to approved invitees; drafts remain private; pagination, date boundaries and invalid invitations are covered by API/UI tests.

### ENR-020 — Import RFQ lanes from Excel
- **Partly done · P1 · Depends:** ENR-019.
- **Status 18 Nov 2026:** Wave 3a import path exists (preview, row errors, confirm; 200 lanes/200 KB). **Remaining (Wave 3b, running):** `.xlsx` and `.csv` with SheetJS, `.xlsx` template, macro and size rejection; fixture tests.
- **Build:** implement the spreadsheet import requested in the [architecture reference](../EnrouteLogTech%20SaaS%20Architecture%20v1.pdf), using the approved ENR-018 template: upload, preview, row errors and explicit confirmation.
- **Done / verify:** invalid/oversized files cannot create partial live RFQs; duplicate submission has a defined result; fixture files prove valid rows, invalid units/dates and row-level messages. Ask before adding a spreadsheet dependency.

### ENR-021 — Submit and compare contract quotations
- **Partly done · P1 · Depends:** ENR-019.
- **Status 18 Nov 2026:** Built in Wave 3a (same evidence as ENR-019). **Remaining:** browser check, e2e.
- **Build:** add the transporter RFQ list/detail, quotations/revisions and customer comparison board under the approved contract rules. Reuse [Ad Hoc bid calculations](../backend/src/features/load/load.rules.js) only where the rules match.
- **Done / verify:** only invitees quote within the window; revision history and price units remain accurate; competitor privacy and customer visibility match the approved specification and have automated tests.

### ENR-022 — Create an accepted contract from an award
- **Partly done · P1 · Depends:** ENR-021.
- **Status 18 Nov 2026:** Built in Wave 3a; curl flow accept to contract passed. **Remaining:** dedupe `contractFromAwards` (rfq.rules.js vs contract.rules.js, point RFQ accept at the contract service), concurrent-accept test, browser check.
- **Build:** create actual contract records and customer/transporter list/detail pages. [Ad Hoc awards](../backend/src/features/load/services/award.service.js) currently only change load/award state; define the approved compatibility path for them.
- **Done / verify:** acceptance creates exactly one contract with immutable agreed terms/rate snapshots; decline/timeout behavior is tested; users cannot read another company's contract; no old award is silently converted.

### ENR-023 — Amend, expire and cancel contracts
- **Partly done · P1 · Depends:** ENR-022.
- **Status 18 Nov 2026:** Built in Wave 3a (amend, expire, cancel). **Remaining:** browser check, e2e; no evidence beyond unit tests recorded.
- **Build:** implement approved lifecycle rules for contract periods, rate/volume revisions, counterpart consent and cancellation, with visible history in the contract pages listed by [navigation](../frontend/src/shared/lib/dashboardNav.js).
- **Done / verify:** historical terms and already-dispatched work remain traceable; invalid transitions fail; expiry, consent and cancellation examples from ENR-018 pass through API and UI.

### Phase D — fleet, allocation and trip execution

### ENR-024 — Manage vehicles and their documents
- **Partly done · P1 · Depends:** ENR-009, ENR-013, ENR-014.
- **Status 18 Nov 2026:** Built in Wave 2a (`ff44b8b`, merged `c696ff0`); unit 161/161 at the time. **Remaining:** browser/e2e check on the merged build, M12 server-side vehicle/driver trip filter.
- **Build:** create company-owned vehicle records, type/capacity, availability and RC/insurance details for transporter Fleet and fleet-owner Vehicles. Current [assignment](../backend/src/features/load/services/award.service.js) stores free-text truck details only.
- **Done / verify:** authorized owners can search/page/create/update vehicles; duplicate registration and document validity rules are approved/tested; another company cannot edit a vehicle or its papers.

### ENR-025 — Manage driver records
- **Partly done · P1 · Depends:** ENR-009, ENR-013.
- **Status 18 Nov 2026:** Built in Wave 2a (same evidence as ENR-024). **Remaining:** browser/e2e check.
- **Build:** implement driver list/detail, contact/licence records and availability for transporter/fleet-owner dashboards. Confirm whether the first release uses company-managed records; a driver login/mobile application needs its own approved scope.
- **Done / verify:** authorized companies manage only their drivers; licence/availability rules and duplicates are validated; sensitive documents are access-controlled. Driver CRUD is not marked complete merely because an award has `driverName`.

### ENR-026 — Place dispatch indents against contracts
- **Partly done · P1 · Depends:** ENR-023.
- **Status 18 Nov 2026:** Built in Wave 3a (indents; curl run of request to acknowledge created load, award and trips). **Remaining:** confirm in a browser that an acknowledged indent opens on /transporter/bids/:id; e2e.
- **Build:** implement the Daily/indent flow approved in ENR-018: create a dated dispatch request against an active contract, apply the agreed rate and track consumption. An [Ad Hoc PDF attachment](../frontend/src/features/loads/ui/customer/steps/AttachmentUpload.jsx) is not an indent workflow.
- **Done / verify:** requests stay within contract dates/quantity rules; retries do not consume capacity twice; counterpart acknowledgement and list/detail states match the approved lifecycle.

### ENR-027 — Allocate work to own fleet or connected fleet owners
- **Partly done · P1 · Depends:** ENR-024, ENR-025, ENR-026.
- **Status 18 Nov 2026:** Spec and data model on `int` only: [allocation spec](../docs/superpowers/specs/2026-11-18-allocation-broker-design.md), migration `0014_allocations`, permissions. **Remaining (Wave 3b):** service, routes, rules + tests, expiry job, trips visibility for executors, UI.
- **Build:** implement the [planned allocation chain](../docs/arc/enroute-build-map.html), including quantities and executor ownership. Decide how existing Ad Hoc `loads` relate to subcontract allocations before choosing tables/names.
- **Done / verify:** a transporter can divide work without exceeding the accepted quantity; own/subcontract portions sum correctly; unconnected or unauthorized executors are rejected and the original transporter remains traceable.

### ENR-028 — Let fleet owners accept or decline allocated work
- **Partly done · P1 · Depends:** ENR-027.
- **Status 18 Nov 2026:** Data model and permission `offers.respond` only. **Remaining (Wave 3b):** accept/decline service, routes, fleet-owner offers UI.
- **Build:** replace fleet-owner Loads placeholders with offered-work list/detail and accept/decline using the approved expiry/reallocation rules; follow [company navigation](../frontend/src/shared/lib/dashboardNav.js).
- **Done / verify:** only the addressed fleet owner can respond; expiry/repeated responses cannot allocate twice; the transporter sees accepted/declined quantities and can reallocate the remaining work.

### ENR-029 — Create one trip per assigned vehicle
- **Partly done · P1 · Depends:** ENR-028.
- **Status 18 Nov 2026:** Built in Wave 2a (trip per assigned vehicle; `ff44b8b`). **Remaining:** H7 double-booking after POD reject, swap-vehicle, browser/e2e check.
- **Build:** create trip records linked to an accepted dispatch/allocation, vehicle and driver, with scoped customer/transporter/fleet-owner lists. Provide an explicit compatibility path from [basic Ad Hoc assignments](../backend/src/features/load/services/award.service.js).
- **Done / verify:** multi-truck work creates the correct trip count; unavailable or overlapping vehicle/driver assignments fail under concurrency; changing assignment preserves history and cannot expose unrelated company data.

### ENR-030 — Track dispatch, transit and delivery
- **Partly done · P1 · Depends:** ENR-029.
- **Status 18 Nov 2026:** Built in Wave 2a (statuses, delays, charges). **Remaining:** M10 rating lost on non-final truck, payment-note, browser/e2e check.
- **Build:** implement approved trip status transitions, timestamps, exceptions and who may report each update. Customer progress should derive from trips; current [load completion](../backend/src/features/load/services/load.service.js) is only a manual confirmation.
- **Done / verify:** skipped/repeated/out-of-order transitions follow explicit rules; all permitted parties see consistent progress; no one can update another executor's trip. Test partial delivery across multiple trucks.

### ENR-031 — Capture POD and close trips
- **Partly done · P1 · Depends:** ENR-030, ENR-009.
- **Status 18 Nov 2026:** Built in Wave 2a (POD upload/review, closure; B1-B5 review blockers fixed). **Remaining:** browser/e2e check, PTL leg UI.
- **Build:** add trip-linked POD/LR upload, review and completion rules; record who accepts proof and how rejected proof is resubmitted. Reuse [document storage](../backend/src/features/document/) after ENR-001/009.
- **Done / verify:** the agreed evidence is required before closure; unrelated users cannot read/replace proof; retries preserve one completion; all required trips determine aggregate load/contract progress without rewriting historical completions.

### ENR-033 — Implement the approved broker workflow
- **Partly done · P2 · Depends:** ENR-028, ENR-030, ENR-032.
- **Status 18 Nov 2026:** Not built beyond the allocation model (see ENR-027). **Remaining:** broker pages (Loads, Transporters, Fleet Owners, Trips) on the allocation service.
- **Build:** replace broker Loads/Transporters/Fleet Owners/Trips placeholders in [navigation](../frontend/src/shared/lib/dashboardNav.js) using the approved journey and existing network/allocation services.
- **Done / verify:** a broker can complete the approved demand-to-capacity journey; unapproved bidding/visibility remains denied; other parties see the same allocation and trip history in an end-to-end test.

### Phase E — revenue, insight and release evidence

### ENR-034 — Renew subscriptions and change seat allowances
- **Partly done · P1 · Depends:** ENR-011, ENR-013.
- **Status 18 Nov 2026:** Renewal, grace and expiry built and checked (Wave 4a e2e 12/12). **Remaining:** extra-seat purchase and downgrade are not recorded as built; confirm policy for renewal inside grace (currently extends from the old end).
- **Build:** add extra-seat purchases, renewal, expiry/grace handling and company/admin status screens according to ENR-010; extend [subscription records](../backend/src/features/subscription/schemas/) with traceable approvals.
- **Done / verify:** duplicate approvals cannot double-charge/grant seats; concurrent invitations obey allowance; renewal/downgrade/expiry behavior preserves existing users and records according to the agreed policy.

### ENR-035 — Define and display earnings
- **Partly done · P2 · Blocked on finance rules · Depends:** ENR-031, ENR-032.
- **Status 18 Nov 2026:** Rule fixed in PRD section 4: agreed rate plus approved extras of completed trips, shown as earned, never paid (use `trips.executor_rate_paise` for allocated trips). **Remaining (Wave 4b, running):** build and verify.
- **Build:** first approve what counts as earned, deductions, broker fees, cancellation effects and rate units. Then replace fleet-owner Earnings with per-trip/per-vehicle totals from accepted terms and completed work; [current page map](../frontend/src/shared/lib/dashboardNav.js) has no accounting implementation.
- **Done / verify:** fixture calculations reconcile to source trips/contracts in paise; incomplete/cancelled work follows the agreed rule; financial data is role/company scoped. Earnings are not presented as money paid without a settlement record.

### ENR-036 — Build operational reports
- **Partly done · P2 · Depends:** ENR-031, ENR-035.
- **Status 18 Nov 2026:** **Remaining (Wave 4b, running):** reports, filters, exports.
- **Build:** replace Reports placeholders for each permitted company type with agreed procurement, trips and earnings summaries, date/status filters and exports; reuse the data sources behind [dashboard routes](../frontend/src/shared/lib/dashboardNav.js).
- **Done / verify:** totals reconcile with detailed records and time zones; paging/export limits hold for large datasets; restricted roles cannot export another company's information.

### ENR-037 — Show real dashboard metrics
- **Partly done · P2 · Depends:** ENR-036.
- **Status 18 Nov 2026:** **Remaining (Wave 4b, running):** real metrics on the overview pages.
- **Build:** extend [DashboardOverview](../frontend/src/shared/ui/layout/DashboardOverview.jsx), which currently shows navigation cards, with approved per-company counts, pending actions and recent activity from real APIs.
- **Done / verify:** counts match lists, zero/loading/error states are useful, links retain their filters, and responsive/keyboard checks pass. Unbuilt modules must not display fabricated metrics.

### ENR-038 — Reconcile project documentation with the implemented product
- **Partly done · P2 · Depends:** ENR-006, ENR-010, ENR-014, ENR-018, ENR-032.
- **Status 18 Nov 2026:** ARCHITECTURE.md written, README, historical notes and deploy README updated 18 Nov. **Remaining:** validate links and setup commands in an isolated environment; marketing claims check; refresh after the 2b/3b merge.
- **Build:** reconcile [README](../README.md), [old project context](../docs/dbml/outher/PROJECT_CONTEXT.md), [build map](../docs/arc/enroute-build-map.html), deployment guidance and marketing claims. Preserve useful historical notes with dates; remove misleading active instructions and any embedded credentials without copying their values.
- **Done / verify:** one current architecture/role/lifecycle description links to this tracker; obsolete paths and MongoDB instructions cannot be mistaken for the PostgreSQL implementation; public promises match approved scope. Validate links and setup commands in an isolated environment.

### ENR-039 — Record release acceptance for the selected scope
- **Open · P1 · Release gate · Depends:** ENR-005, ENR-015–017, plus every ticket included in the selected release.
- **Build:** agree the release scope (Ad Hoc-only or additional modules), then exercise [CI](../.github/workflows/ci.yml), migrations, responsive browsers, roles/companies, real email and R2 integration in an explicitly approved test environment.
- **Done / verify:** attach dated results and known limits; test failure/retry paths and forbidden access; no unresolved P0 in released flows. Existing build success or historical smoke notes alone do not close this ticket.

### ENR-040 — Prove deployment, backup restore and recovery
- **Open · P1 · Release gate · Depends:** ENR-039.
- **Build:** verify the chosen [deployment path](../deploy/README.md), secrets configuration, HTTPS/cookies, health/log alerts and rollback compatibility. Implement/test PostgreSQL backups, off-server retention and restoration; the old PDF's `mongodump` instructions do not apply.
- **Done / verify:** in an approved staging environment, deploy/restart, restore a backup into a separate database and rehearse rollback without data loss; record recovery ownership and timing. Production/AWS/shared-database actions need explicit approval before execution.

### Phase F — carried over from the build log (18 Nov 2026)

New tickets for open items recorded in [BUILD-LOG](../docs/BUILD-LOG.md). Source entries are named so each can be checked.

### ENR-041 — Close the Wave 2a review leftovers
- **Open · P1 · Depends:** ENR-015. Wave 2b is running on these; confirm when it lands.
- **Build:** H6 re-award with award status `revoked` and a block on the missed bid; H7 hold vehicle and driver until the trip is `completed`; M10 rating kept on a non-final truck; M11 clear stale `placement_misses` on plain cancel; M12 server-side `vehicleId`/`driverId` trip filter; M13 unit tests for `decidePlacement`, `rejectPod` and the clock jobs; payment-note, swap-vehicle and PTL leg UI.
- **Done / verify:** each item has a failing test first; browser check of the trip screens; source: BUILD-LOG 17 Nov wave 2a entry.

### ENR-042 — Close the Wave 1 leftovers
- **Open · P2 · Depends:** none.
- **Build:** per-IP OTP limit with a shared store; server-side search on the loads and bids lists; browser check of wizard steps 3-5 and bid detail; a `company.manage` permission; replace about 12 raw tone classes with the kit `TONE`; document upload currently requires `team.manage` (trip managers need it) and trip/fleet services insert a second documents row.
- **Done / verify:** tests for each behavior change; source: BUILD-LOG 18 Nov wave 1 and merge entries.

### ENR-043 — Finish contract and RFQ integration
- **Open · P1 · Depends:** ENR-019-023, ENR-026.
- **Build:** dedupe `contractFromAwards`; concurrent-accept test; tone statuses `amending`, `requested`, `acknowledged`, `fulfilled`, `proposed`; loads list/detail tolerate `kind='contract'` with a null `bidId`, with a kind filter and a contract chip; run RFQ and contract suites through `test:e2e`.
- **Done / verify:** e2e green for RFQ to contract to indent to trips; source: BUILD-LOG 18 Nov wave 3a entry.

### ENR-044 — Subscription follow-ups
- **Open · P2 · Depends:** ENR-011.
- **Build:** browser check of the seat prompt on reactivate; decide renewal inside grace (extend from old end or from now); make the approve notice crash-safe (outbox); seed demo plans and an active subscription for demo companies so e2e that add team members do not hit the 3-seat trial.
- **Done / verify:** source: BUILD-LOG 18 Nov wave 4a entry.

### ENR-045 — Merge `int` into `suman` safely
- **Open · P0 for the merge · Depends:** Wave 2b landing.
- **Build:** renumber migrations (2b `0012_*` versus int `0012`, `0013`, `0014`; keep `suman`'s, regenerate the rest in order, re-add every data step, `drift_check` must say no changes); hand-merge trips and loads files touched by both; mount the allocation panel on the transporter bid detail; wire dashboardNav flags and `permissions.js` keys for allocation; trips owner must admit allocation companies in trip list/detail, redact the customer freight charge from non-transporter executors and withdraw offered allocations on load cancel or award revoke.
- **Done / verify:** fresh-database migrate, unit, API e2e and browser e2e all green; source: BUILD-LOG "Tomorrow's merge order".

## Later proposals — not prerequisites for the first release

These remain unapproved scope from the older roadmap. Create a scoped ticket and agree its priority before implementation; do not mark the core product blocked by these ideas.

| Proposal | Prerequisites / decision |
| --- | --- |
| Push updates / WebSockets | Existing bidding uses polling. Agree latency/user-count needs after ENR-016/017; preserve authorization and reconnection behavior. |
| Driver login, mobile app and GPS | Decide actor identity, devices, consent and manual fallback after ENR-025/030. Company-managed driver records are a separate capability. |
| Payment gateway, invoices and settlement | Approve accounting/tax/refund rules and provider after ENR-010/034/035; manual subscription approval and displayed earnings are not settlement. |
| WhatsApp notifications and multiple languages | Approve channels, consent, supported languages and content after reliable notifications and the core workflows. |
| AI route/pricing/matching and blockchain POD | Historical ideas only; require a business case, data assessment and separate specification. |

## Verification and source precedence

- **Run on 10 November 2026, before and after this documentation change:** `pnpm test` in `backend/` — 21 passed; `pnpm lint` in `frontend/` — 0 errors, one existing React Hook Form/React Compiler warning in `createAccount.jsx`; `pnpm build` in `frontend/` — passed, 59 generated pages.
- Source/read-only review covered the route/module inventory, auth/document/company boundaries, load/bid/award/clock services, notification flow, schemas, dashboard placeholders, CI/deploy configuration, existing ticket/plan documents and all 12 pages of the architecture PDF. This was a project inventory and targeted code review, not an exhaustive security audit.
- No fresh authenticated browser flow, live API/database migration run, real email/R2 request, remote deployment or restore was performed. Those checks remain ENR-005/039/040. Static findings in ENR-001–004/015 require regression reproduction during implementation.
- [Ad Hoc tickets](adhoc-load.md) retain AH-01–46 and the 9 November verification history. Do not add their counts to the DONE milestones here; they describe overlapping work. Its old “Before starting” checkbox is historical, not an instruction to commit today's work.
- For **what exists**, use current source plus dated verification evidence. For **what to build next**, use this queue and subsequently approved decisions. [PROJECT_CONTEXT](../docs/dbml/outher/PROJECT_CONTEXT.md) and HTML plans contain stale progress/assumptions. The PDF describes an older MongoDB/Resend/TypeScript stack; current code uses PostgreSQL/Drizzle, Nodemailer and JavaScript/JSX. No stack migration is authorized by this tracker.
- Maintain this file as work changes: keep ticket IDs stable, mark a closed ticket with its date/evidence, move its summary into the closed section, update dependents and put newly discovered work into an explicit ticket. Do not silently remove unfinished items.

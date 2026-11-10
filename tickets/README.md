# Enroute project tickets

Reviewed: **10 November 2026** against local commit `ac99695` and the working tree. This is the master index for what is built and what comes next. These are repository tickets, not GitHub Issues.

## Start here

**Next ticket: ENR-001.** Work through the open tickets in numerical order. A dependency must be closed before its dependent ticket starts; independent work can proceed while a product decision is waiting. The order is a recommendation, not authorization to implement every ticket automatically.

The product is a B2B logistics platform for customers, transporters, brokers and fleet owners: register → approve → connect → procure transport → award → allocate vehicles → execute trips → confirm delivery → report results. Platform admins and drivers are actors, not additional company types.

- **Closed:** an existing implementation milestone. Its exact scope and evidence appear below. Closed does not mean every edge case or production deployment has been verified.
- **Open:** unfinished implementation, a known fix, or missing verification. Nothing in the open queue has been implemented by creating this tracker.
- **Blocked:** an open ticket waiting on the listed dependency or a product-owner decision. Keep it open until both the decision and implementation checks are complete.
- **P0:** address before exposing the affected flow to real users. **P1:** core product work. **P2:** subsequent operations, reporting or reliability work. Order within this document breaks priority ties.
- Close a build ticket only after its acceptance checks, relevant automated tests, and the actual user flow pass. Record the date, commands/results and reviewed change. A bug fix must first have a failing regression test.
- New dependencies, schema/API behavior changes, and production/shared-database operations still require the discussion and approval in the engineering rules.

## What exists today, without mixing it with the roadmap

| Area | Current boundary |
| --- | --- |
| Authentication and onboarding | APIs and screens exist; ownership/session fixes ENR-001–004 remain open. |
| Company administration and network | Approval/rejection/blocking and connections exist. Company settings, branches after registration and team management remain open. |
| Ad Hoc loads | Draft, publish, invitation, bidding, close/extend/cancel, award, acceptance and simple assignment/completion exist. |
| Contract RFQs and contracts | Not implemented. `kind: contract` in an enum does not create a contract workflow; the creation service always creates `ad_hoc`. |
| Execution | One award stores truck number, driver name and phone. There are no full vehicle, driver, subcontract-load or trip modules. Customer completion does not require POD. |
| Notifications | In-app list/unread/read actions and best-effort email exist. Reliable retry/delivery and worker guarantees are open. |
| Dashboards | Shell and links exist. Most business pages are `ComingSoon`; overview cards are navigation, not operational metrics. |
| Subscriptions | Tables exist. Plan purchase, seat enforcement, payment approval and renewal workflows do not. |
| Deployment | Docker/CI/deploy files exist. A live deployment, restored backup and real mail/storage delivery were not verified in this review. |

## Closed — already implemented milestones

The references identify the implementation, not a claim that it was exercised live today. Historical verification is explicitly marked. Follow-up fixes do not erase the original feature milestone.

| ID | Closed scope | Evidence / limit |
| --- | --- | --- |
| DONE-01 | PostgreSQL/Drizzle foundation and Docker configurations | [Schemas](../backend/src/features/), [migrations](../backend/drizzle/), [development Compose](../docker-compose.dev.yml). Runtime deployment remains ENR-039–040. |
| DONE-02 | Public landing, about, solution, pricing and support pages | [Marketing pages](../frontend/src/features/marketing/ui/); current frontend build passes. Pricing content is not a purchase flow. |
| DONE-03 | Email OTP, registration, initial company/branch and pending-approval screens | [Auth backend](../backend/src/features/auth/controllers/auth.controller.js), [auth frontend](../frontend/src/features/auth/). Boundary/abuse fixes: ENR-002/004. |
| DONE-04 | R2 document upload/delete primitives and registration upload UI | [Document controller](../backend/src/features/document/controllers/document.controller.js). Ownership protection remains ENR-001; storage delivery not tested today. |
| DONE-05 | Login, logout, refresh, current-user and password reset flows | [Session controller](../backend/src/features/auth/controllers/session.controller.js), [auth frontend](../frontend/src/features/auth/). Exact-session enforcement remains ENR-003. |
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

## Open — ordered build queue

Every build ticket includes backend behavior, the necessary screen/API integration, authorization, empty/error states and relevant tests for that capability. Use existing features where linked; avoid rebuilding the closed milestones. Product decisions below are questions to settle, not silently assumed requirements.

### Phase A — fix and verify the existing flows

### ENR-001 — Protect document upload and deletion
- **Open · P0 · Depends:** none.
- **Build:** [Document routes](../backend/src/features/document/routes/document.routes.js) currently lack authentication; the controller trusts supplied user/company/document IDs. Bind actions to an authorized company user or an owned, valid registration session so pre-approval registration still works.
- **Done / verify:** unauthenticated and other-company upload/delete attempts fail without storage writes; legitimate registration and signed-in attachments still work. Add failing API tests first, then verify upload/delete using a storage test double.

### ENR-002 — Bind registration changes to the verified applicant
- **Open · P0 · Depends:** none; coordinate the registration-session contract with ENR-001.
- **Build:** [Registration controller](../backend/src/features/auth/controllers/auth.controller.js) checks a used OTP by submitted email, while submission updates a supplied company ID without an ownership/state check. Validate the session owner/expiry and allowed transition throughout registration and submission.
- **Done / verify:** another applicant cannot use that proof or submit a different company; approved/blocked companies cannot be reset to pending; valid draft → pending and repeat-submission behavior are tested through the API.

### ENR-003 — Enforce the exact active login session
- **Open · P0 · Depends:** none.
- **Build:** [Auth middleware](../backend/src/shared/middleware/auth.middleware.js) looks up any active session for a user rather than the token's session ID and expiry. Align protected requests and [refresh](../backend/src/features/auth/controllers/session.controller.js) with current user/company eligibility and the intended one-session rule.
- **Done / verify:** after logout then a new login, the old access token stays rejected; expired/revoked sessions and inactive accounts cannot access or refresh; platform admins still work. Add failing regressions and simultaneous-login coverage.

### ENR-004 — Bound OTP/login attempts and report delivery failure accurately
- **Open · P1 · Depends:** ENR-002, ENR-003.
- **Build:** [Auth handlers](../backend/src/features/auth/controllers/auth.controller.js) have no visible resend/guess limit and return “OTP sent” even after a mail failure. Define limits and consistent external-input validation for OTP, reset and login; agree any new dependency before adding it.
- **Done / verify:** fake-clock tests cover resend/attempt limits, expiry and recovery; malformed inputs fail predictably; mail failure gives an actionable response without exposing account/secret data.

### ENR-005 — Make existing end-to-end checks reproducible
- **Open · P1 · Depends:** ENR-001–004.
- **Build:** Check in repeatable API and browser coverage for registration → approval → connection → Ad Hoc → award → completion. The [68-check historical smoke run](adhoc-load.md#how-it-was-verified-09-nov-2026) is a report; the current committed tests are rules tests plus the narrower CI smoke script.
- **Done / verify:** a documented command runs against an isolated disposable database with fake email/storage; positive and unauthorized/wrong-company flows pass in CI; no production credentials or data are needed.

### Phase B — company administration, subscriptions and people

### ENR-006 — Confirm role names and permissions
- **Open · P1 · Decision · Depends:** none.
- **Decide:** reconcile the old role descriptions with [current roles](../backend/src/features/auth/schemas/users.Schema.js): `root_admin`, `admin`, `co-admin`, `viewer`, `bid_manager`, `trip_manager`, `accounts`. Define company/branch scope, who invites/manages users and who may assign trucks.
- **Done / verify:** product owner approves one permission matrix and display names; existing stored roles retain compatible behavior or have an approved migration plan. ENR-012/013 must not guess these rules.

### ENR-007 — Implement company profile settings
- **Open · P1 · Depends:** ENR-003, ENR-006.
- **Build:** [GET/PATCH company controllers](../backend/src/features/company/controllers/company.controller.js) are TODOs and Settings is a placeholder. Provide scoped profile read/edit and define which approved identity fields require another review.
- **Done / verify:** own-company profile loads and allowed edits persist; viewers/other companies cannot edit; invalid values and restricted identity changes have tested responses and clear UI errors.

### ENR-008 — Manage branches after registration
- **Open · P1 · Depends:** ENR-006, ENR-007.
- **Build:** extend the existing [branch schema](../backend/src/features/company/schemas/branch.Schema.js) with company-scoped list/create/edit/deactivate flows and branch selection where the approved permission matrix requires it.
- **Done / verify:** pagination and validation work; cross-company access fails; deactivation handles assigned users and preserves historical references under an agreed rule.

### ENR-009 — Manage company compliance documents
- **Open · P1 · Depends:** ENR-001, ENR-007.
- **Build:** add document list/replacement/review status to Settings and platform review using the [existing document feature](../backend/src/features/document/). Agree retention, private access, expiry fields and when replacement requires reapproval before implementation.
- **Done / verify:** authorized users can replace/read only permitted documents; failed storage operations do not leave misleading records; admin review and any required reapproval are tested with fake storage.

### ENR-010 — Confirm plans, seat counts and payment rules
- **Open · P1 · Decision · Depends:** ENR-006.
- **Decide:** use the [subscription schemas](../backend/src/features/subscription/schemas/) as a starting point. Approve prices, included seats, who consumes a seat, pending-invite counting, expiry/grace behavior and manual payment-proof review.
- **Done / verify:** a signed-off table covers activation, extra seats, renewal, expiry and rejection. No price or entitlement is inferred from the marketing page.

### ENR-011 — Activate subscription plans through manual payment review
- **Open · P1 · Depends:** ENR-001, ENR-006, ENR-010.
- **Build:** connect plan selection, payment-proof upload, admin approval/rejection and company entitlement display to [subscription tables](../backend/src/features/subscription/). These currently have no routed service/UI workflow.
- **Done / verify:** approved payment activates the agreed dates/seat allowance once; rejected or duplicate submissions do not grant access/seats; customer and admin flows are covered by API and browser tests.

### ENR-012 — Invite and onboard team members
- **Open · P1 · Depends:** ENR-003, ENR-008, ENR-011.
- **Build:** replace the Team placeholders in [dashboard navigation](../frontend/src/shared/lib/dashboardNav.js) with invitations, acceptance and a paginated member list. Apply approved role/branch rules and seat limits on the server.
- **Done / verify:** invitations expire and cannot be reused or accepted by the wrong identity; simultaneous accepts cannot exceed seats; a newly accepted member can log in with the correct company, branch and permissions.

### ENR-013 — Manage team roles and access lifecycle
- **Open · P1 · Depends:** ENR-012.
- **Build:** allow approved administrators to change roles/branches and deactivate/reactivate members; enforce the agreed last-admin and seat rules using [users](../backend/src/features/auth/schemas/users.Schema.js).
- **Done / verify:** unauthorized privilege escalation fails; deactivation/reduced permissions take effect for active sessions; every allowed change is recorded and reflected in Team UI.

### Phase C — stabilize Ad Hoc and build contract procurement

### ENR-014 — Resolve the existing Ad Hoc client questions
- **Open · P1 · Decision · Depends:** none.
- **Decide:** close Q1–Q9 in the [Ad Hoc tracker](adhoc-load.md#waiting-on-the-client): Daily meaning, FTL/PTL scope, bid window, target-price visibility, invitees, post-award cancellation, acceptance window, price basis and truck types. Current code uses a 12-hour default, 24-hour acceptance, five attempts and connected transporters; these are not evidence of client approval.
- **Done / verify:** record each approved answer and its effect on [defaults](../backend/src/features/load/load.constants.js), validation and screens. Test any resulting behavior change; keep Daily/contract dispatch scope in ENR-018/026.

### ENR-015 — Make load transitions safe under competing requests
- **Open · P1 · Depends:** ENR-005, ENR-014.
- **Build:** [update/cancel/complete](../backend/src/features/load/services/load.service.js) and [assignment](../backend/src/features/load/services/award.service.js) read state before later writes. Make validation and transition consistent under concurrency; preserve existing awarded/completed records.
- **Done / verify:** competing cancel/award, assign/complete and draft-edit/publish requests cannot overwrite a terminal state or create conflicting history; repeated requests have a documented outcome. Add real-database race tests before fixes.

### ENR-016 — Make bidding deadlines restart-safe and safe across API instances
- **Open · P1 · Depends:** ENR-015.
- **Build:** the [clock](../backend/src/features/load/services/clock.service.js) is an in-process 30-second timer with unbounded due-row scans. Add bounded processing and single-claim/idempotent handling for closes, auto-extensions, expiry and reminder scheduling; choose the simplest approved deployment approach.
- **Done / verify:** restart and two-worker tests produce one valid transition/event per action; overdue work catches up; large batches make progress without duplicate extensions or reminders. A new worker/queue dependency requires approval.

### ENR-017 — Retry and observe notification delivery
- **Open · P2 · Depends:** ENR-016.
- **Build:** [notifications](../backend/src/features/notification/services/notification.service.js) currently log failures without durable retries. Record pending/failed delivery and retry safely while keeping the underlying business action successful; expose enough status to diagnose failures.
- **Done / verify:** simulated mail/storage/database failures recover without duplicate recipient notifications; unread counts remain scoped; failed email cannot undo a bid/award. Verify recovery using test services.

### ENR-018 — Approve the contract RFQ and Daily/indent specification
- **Open · P1 · Decision · Depends:** ENR-006, ENR-014.
- **Decide:** define period/lane/volume RFQs versus one-off Ad Hoc; quotation revision/visibility, Excel columns, award acceptance, contract terms, amendments/cancellation and Daily dispatch/indent semantics. Use the [build map](../docs/arc/enroute-build-map.html) as proposal history, not final authority.
- **Done / verify:** approved examples cover one and multiple lanes, quantities, rates, expiry and failures; data ownership and backward compatibility with existing Ad Hoc loads are explicit. ENR-019–023/026 wait for this specification.

### ENR-019 — Create and publish contract RFQs manually
- **Open · P1 · Depends:** ENR-013, ENR-018.
- **Build:** replace customer RFQ placeholders with draft/list/detail, lane/period/volume entry and invitations. Extend or add data structures only according to ENR-018; [Ad Hoc creation](../backend/src/features/load/services/load.service.js) must keep its current meaning.
- **Done / verify:** authorized customers publish a validated RFQ visible only to approved invitees; drafts remain private; pagination, date boundaries and invalid invitations are covered by API/UI tests.

### ENR-020 — Import RFQ lanes from Excel
- **Open · P1 · Depends:** ENR-019.
- **Build:** implement the spreadsheet import requested in the [architecture reference](../EnrouteLogTech%20SaaS%20Architecture%20v1.pdf), using the approved ENR-018 template: upload, preview, row errors and explicit confirmation.
- **Done / verify:** invalid/oversized files cannot create partial live RFQs; duplicate submission has a defined result; fixture files prove valid rows, invalid units/dates and row-level messages. Ask before adding a spreadsheet dependency.

### ENR-021 — Submit and compare contract quotations
- **Open · P1 · Depends:** ENR-019.
- **Build:** add the transporter RFQ list/detail, quotations/revisions and customer comparison board under the approved contract rules. Reuse [Ad Hoc bid calculations](../backend/src/features/load/load.rules.js) only where the rules match.
- **Done / verify:** only invitees quote within the window; revision history and price units remain accurate; competitor privacy and customer visibility match the approved specification and have automated tests.

### ENR-022 — Create an accepted contract from an award
- **Open · P1 · Depends:** ENR-021.
- **Build:** create actual contract records and customer/transporter list/detail pages. [Ad Hoc awards](../backend/src/features/load/services/award.service.js) currently only change load/award state; define the approved compatibility path for them.
- **Done / verify:** acceptance creates exactly one contract with immutable agreed terms/rate snapshots; decline/timeout behavior is tested; users cannot read another company's contract; no old award is silently converted.

### ENR-023 — Amend, expire and cancel contracts
- **Open · P1 · Depends:** ENR-022.
- **Build:** implement approved lifecycle rules for contract periods, rate/volume revisions, counterpart consent and cancellation, with visible history in the contract pages listed by [navigation](../frontend/src/shared/lib/dashboardNav.js).
- **Done / verify:** historical terms and already-dispatched work remain traceable; invalid transitions fail; expiry, consent and cancellation examples from ENR-018 pass through API and UI.

### Phase D — fleet, allocation and trip execution

### ENR-024 — Manage vehicles and their documents
- **Open · P1 · Depends:** ENR-009, ENR-013, ENR-014.
- **Build:** create company-owned vehicle records, type/capacity, availability and RC/insurance details for transporter Fleet and fleet-owner Vehicles. Current [assignment](../backend/src/features/load/services/award.service.js) stores free-text truck details only.
- **Done / verify:** authorized owners can search/page/create/update vehicles; duplicate registration and document validity rules are approved/tested; another company cannot edit a vehicle or its papers.

### ENR-025 — Manage driver records
- **Open · P1 · Depends:** ENR-009, ENR-013.
- **Build:** implement driver list/detail, contact/licence records and availability for transporter/fleet-owner dashboards. Confirm whether the first release uses company-managed records; a driver login/mobile application needs its own approved scope.
- **Done / verify:** authorized companies manage only their drivers; licence/availability rules and duplicates are validated; sensitive documents are access-controlled. Driver CRUD is not marked complete merely because an award has `driverName`.

### ENR-026 — Place dispatch indents against contracts
- **Open · P1 · Depends:** ENR-023.
- **Build:** implement the Daily/indent flow approved in ENR-018: create a dated dispatch request against an active contract, apply the agreed rate and track consumption. An [Ad Hoc PDF attachment](../frontend/src/features/loads/ui/customer/steps/AttachmentUpload.jsx) is not an indent workflow.
- **Done / verify:** requests stay within contract dates/quantity rules; retries do not consume capacity twice; counterpart acknowledgement and list/detail states match the approved lifecycle.

### ENR-027 — Allocate work to own fleet or connected fleet owners
- **Open · P1 · Depends:** ENR-024, ENR-025, ENR-026.
- **Build:** implement the [planned allocation chain](../docs/arc/enroute-build-map.html), including quantities and executor ownership. Decide how existing Ad Hoc `loads` relate to subcontract allocations before choosing tables/names.
- **Done / verify:** a transporter can divide work without exceeding the accepted quantity; own/subcontract portions sum correctly; unconnected or unauthorized executors are rejected and the original transporter remains traceable.

### ENR-028 — Let fleet owners accept or decline allocated work
- **Open · P1 · Depends:** ENR-027.
- **Build:** replace fleet-owner Loads placeholders with offered-work list/detail and accept/decline using the approved expiry/reallocation rules; follow [company navigation](../frontend/src/shared/lib/dashboardNav.js).
- **Done / verify:** only the addressed fleet owner can respond; expiry/repeated responses cannot allocate twice; the transporter sees accepted/declined quantities and can reallocate the remaining work.

### ENR-029 — Create one trip per assigned vehicle
- **Open · P1 · Depends:** ENR-028.
- **Build:** create trip records linked to an accepted dispatch/allocation, vehicle and driver, with scoped customer/transporter/fleet-owner lists. Provide an explicit compatibility path from [basic Ad Hoc assignments](../backend/src/features/load/services/award.service.js).
- **Done / verify:** multi-truck work creates the correct trip count; unavailable or overlapping vehicle/driver assignments fail under concurrency; changing assignment preserves history and cannot expose unrelated company data.

### ENR-030 — Track dispatch, transit and delivery
- **Open · P1 · Depends:** ENR-029.
- **Build:** implement approved trip status transitions, timestamps, exceptions and who may report each update. Customer progress should derive from trips; current [load completion](../backend/src/features/load/services/load.service.js) is only a manual confirmation.
- **Done / verify:** skipped/repeated/out-of-order transitions follow explicit rules; all permitted parties see consistent progress; no one can update another executor's trip. Test partial delivery across multiple trucks.

### ENR-031 — Capture POD and close trips
- **Open · P1 · Depends:** ENR-030, ENR-009.
- **Build:** add trip-linked POD/LR upload, review and completion rules; record who accepts proof and how rejected proof is resubmitted. Reuse [document storage](../backend/src/features/document/) after ENR-001/009.
- **Done / verify:** the agreed evidence is required before closure; unrelated users cannot read/replace proof; retries preserve one completion; all required trips determine aggregate load/contract progress without rewriting historical completions.

### ENR-032 — Confirm the broker's commercial permissions
- **Open · P1 · Decision · Depends:** ENR-018, ENR-027.
- **Decide:** resolve the [build-map question](../docs/arc/enroute-build-map.html): can brokers bid directly, receive transporter allocations, arrange fleet-owner capacity, or some combination? Define responsibility, rate visibility and fees.
- **Done / verify:** approve example journeys and a visibility/permission matrix. Existing customer→transporter bidding rules remain the implemented scope until a change is approved.

### ENR-033 — Implement the approved broker workflow
- **Open · P2 · Depends:** ENR-028, ENR-030, ENR-032.
- **Build:** replace broker Loads/Transporters/Fleet Owners/Trips placeholders in [navigation](../frontend/src/shared/lib/dashboardNav.js) using the approved journey and existing network/allocation services.
- **Done / verify:** a broker can complete the approved demand-to-capacity journey; unapproved bidding/visibility remains denied; other parties see the same allocation and trip history in an end-to-end test.

### Phase E — revenue, insight and release evidence

### ENR-034 — Renew subscriptions and change seat allowances
- **Open · P1 · Depends:** ENR-011, ENR-013.
- **Build:** add extra-seat purchases, renewal, expiry/grace handling and company/admin status screens according to ENR-010; extend [subscription records](../backend/src/features/subscription/schemas/) with traceable approvals.
- **Done / verify:** duplicate approvals cannot double-charge/grant seats; concurrent invitations obey allowance; renewal/downgrade/expiry behavior preserves existing users and records according to the agreed policy.

### ENR-035 — Define and display earnings
- **Open · P2 · Blocked on finance rules · Depends:** ENR-031, ENR-032.
- **Build:** first approve what counts as earned, deductions, broker fees, cancellation effects and rate units. Then replace fleet-owner Earnings with per-trip/per-vehicle totals from accepted terms and completed work; [current page map](../frontend/src/shared/lib/dashboardNav.js) has no accounting implementation.
- **Done / verify:** fixture calculations reconcile to source trips/contracts in paise; incomplete/cancelled work follows the agreed rule; financial data is role/company scoped. Earnings are not presented as money paid without a settlement record.

### ENR-036 — Build operational reports
- **Open · P2 · Depends:** ENR-031, ENR-035.
- **Build:** replace Reports placeholders for each permitted company type with agreed procurement, trips and earnings summaries, date/status filters and exports; reuse the data sources behind [dashboard routes](../frontend/src/shared/lib/dashboardNav.js).
- **Done / verify:** totals reconcile with detailed records and time zones; paging/export limits hold for large datasets; restricted roles cannot export another company's information.

### ENR-037 — Show real dashboard metrics
- **Open · P2 · Depends:** ENR-036.
- **Build:** extend [DashboardOverview](../frontend/src/shared/ui/layout/DashboardOverview.jsx), which currently shows navigation cards, with approved per-company counts, pending actions and recent activity from real APIs.
- **Done / verify:** counts match lists, zero/loading/error states are useful, links retain their filters, and responsive/keyboard checks pass. Unbuilt modules must not display fabricated metrics.

### ENR-038 — Reconcile project documentation with the implemented product
- **Open · P2 · Depends:** ENR-006, ENR-010, ENR-014, ENR-018, ENR-032.
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

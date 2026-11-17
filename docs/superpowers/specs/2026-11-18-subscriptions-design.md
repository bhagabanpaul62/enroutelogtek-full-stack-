# Subscriptions, seats and durable notifications — design

Covers ENR-010 (plan rules), ENR-011 (manual payment review), ENR-034 (renewal, extra seats,
expiry) and ENR-017 (notification retries). Written 18 Nov 2026 for Wave 4a. Migration:
`backend/drizzle/0012_subscriptions_notifications.sql` (renumber when merged).

Rule from the PRD that binds everything here: **no price in code.** The platform admin creates plans
(name, monthly price, included seats, extra-seat price). A company picks a plan, uploads payment
proof, the admin approves, and approval sets the dates and seats exactly once. Grace is 7 days after
expiry, then the company is read-only. Money is integer paise everywhere.

## Defaults the client can change

All live in `backend/src/features/subscription/subscription.constants.js` (to create in SUBS-BACKEND).

| Constant | Value | Meaning |
| --- | --- | --- |
| `TRIAL_DAYS` | 14 | Trial length for a newly approved company. `0` switches the trial off (company then starts in `pending_payment`) |
| `TRIAL_SEATS` | 3 | Seats during the trial |
| `GRACE_DAYS` | 7 | Full access plus a banner after the end date |
| `PERIOD_OPTIONS` | `[1, 3, 12]` | Months a company may buy. A plan can offer a subset (`billing_periods`) |
| `PRORATE_MONTH_DAYS` | 30 | A month is 30 days when pricing extra seats mid-term |
| `REMINDER_DAYS` | `[7, 1]` | Days before the end date that a reminder goes out |
| `EXPIRY_CLOCK_MS` | 600000 | How often the clock job runs |

Decisions taken (change the constants or tell us): a trial company has no discount or carry-over,
so paying mid-trial starts the paid term at approval and the unused trial days are lost. Seat changes
from a renewal apply at approval, not at the old end date. One open payment per company at a time.

## Data model (already migrated)

Subscription tables are in `backend/src/features/subscription/schemas/`; the notification table
changes are in `backend/src/features/notification/schemas/`.

| Table | Purpose |
| --- | --- |
| `subscription_plans` | name (unique ignoring case), description, `monthly_price_paise`, `included_seats` (>=1), `extra_seat_price_paise` (per seat per month), `billing_periods int[]` (default 1,3,12), `is_active`, `created_by_user_id`. Never deleted; deactivate. Editing a price affects only later submissions |
| `company_subscriptions` | The one live entitlement per company (unique `company_id`). `kind` trial/paid, `status` pending_payment/active/grace/expired/cancelled, plan snapshot (`plan_id`, `plan_name`, `monthly_price_paise`, `extra_seat_price_paise`), `included_seats`, `extra_seats`, `period_months`, `starts_at`, `ends_at`, `grace_ends_at`, `last_submission_id` |
| `payment_submissions` | One reported payment: purpose new/renewal/extra_seats, plan, `period_months`, `extra_seats`, `amount_paise` (server computed), `price_snapshot` jsonb, `proof_document_id` (unique, a `paymentProof` document), `reference_no`, `paid_on`, status submitted/approved/rejected, reviewer, `reviewed_at`, `review_note` |
| `seat_changes` | Every change of included/extra seats: before and after, reason, submission, actor |
| `subscription_events` | Audit trail: trial_started, submission_created/approved/rejected, status_changed, cancelled, plan_created/updated. Unique `(submission_id)` where `event_type = 'submission_approved'` |
| `notification` (+ `dedupe_key`) | Unique `(recipient_user_id, dedupe_key)` when the key is set |
| `notification_deliveries` | Outbox: one row per notification and channel (email / in_app) with status, attempts, `next_attempt_at`, `last_error`, `to_email` |

Permission: new key `billing.manage` (all company types, area Administration). Owner holds it
automatically; Co-admin and Accounts presets have it; the migration added it to existing Co-admin and
Accounts roles. Reading the subscription status needs no permission (every active user, the banner
needs it).

Existing companies: the migration gave every already approved company a trial (14 days, 3 seats) from
migration time, with a `seat_changes` and `subscription_events` row.

## Rules (all in `subscription.rules.js`, pure, with unit tests)

**State** from `now`, `kind`, `status`, `ends_at`, `grace_ends_at`:

| State | When | Access |
| --- | --- | --- |
| `trial` | kind trial and now < ends_at | full |
| `active` | kind paid and now < ends_at | full |
| `grace` | ends_at <= now < grace_ends_at (trial or paid) | full + banner |
| `expired` | now >= grace_ends_at | read-only |
| `cancelled` | status cancelled | read-only at once |
| `pending_payment` | no dates yet (trial switched off) | read-only |

The stored `status` is a cache for admin lists; the middleware always computes the state from dates,
so a late clock job never lets an expired company write.

**Seat.** A seat is an active company user, the Owner included. A user with a temporary password counts
(they are active). Deactivated and blocked users do not. `used = count(users where company_id = X and
user_status = 'active')`; `total = included_seats + extra_seats`. `seatProblem(tx, companyId)` in
`member.service.js` becomes: `used >= total` returns `{ status: 403, code: 'SEAT_LIMIT', message }`; it
runs inside the existing per-company team lock, so two simultaneous adds cannot pass. It also guards
reactivating a user. Over the limit (after a downgrade) nobody is removed; adding is blocked and
`overBy = used - total` is shown.

**Price.**
- `new` and `renewal`: `amount = (monthly + extraSeatPrice * extraSeats) * periodMonths`.
- `extra_seats` (mid-term): `remainingDays = ceil((ends_at - now) / 1 day)`; `amount =
  round(extraSeatPrice * seats * remainingDays / 30)`, using the price snapshot on the live subscription,
  not the plan's current price. `period_months` stored = `ceil(remainingDays / 30)`. Refused when
  `remainingDays <= 0` (renew first), in a trial (pick a plan with `new`), or when state is not `active`.
- A zero amount is allowed (free plan) but still needs proof text and goes through review.

**Which purpose is allowed in which state.**

| State | new | renewal | extra_seats |
| --- | --- | --- | --- |
| trial, expired, cancelled, pending_payment | yes | no | no |
| active (paid) | no | yes | yes |
| grace (paid) | no | yes | no |
| grace (trial) | yes | no | no |

**Approval effect** (`approvalEffect(sub, submission, now)`):
- `new`: kind paid, `starts_at = now`, `ends_at = addMonths(now, period)`, seats = plan included + extra.
- `renewal`: `base = ends_at` when state is active or grace, else `now`; `ends_at = addMonths(base, period)`;
  plan snapshot, included and extra seats replaced from the submission (a different plan is allowed).
- `extra_seats`: `extra_seats += submission.extra_seats`; dates unchanged. Refused with 409
  `SUBSCRIPTION_NOT_ACTIVE` if the term lapsed since the submission (admin rejects instead).
- Always: `grace_ends_at = ends_at + 7 days`, `status = active`, `last_submission_id = submission.id`.
- `addMonths` clamps to the last day of a shorter month (31 Jan + 1 month = 28 Feb).
- Plan snapshot comes from the submission's `price_snapshot`, so a price edit between submit and
  approval changes nothing for either side.

**Once only.** Approval is one transaction: lock the submission `FOR UPDATE`; if `status <> 'submitted'`
answer 409 `ALREADY_REVIEWED`; lock or create the subscription row `FOR UPDATE`; apply the effect; write
`seat_changes` and `subscription_events` (`submission_approved`); set the submission approved with
reviewer and time. The unique indexes on `proof_document_id` and on the approved event stop a duplicate
even if the code were wrong. Rejection is the same lock, requires a `reason`, and changes nothing else.

**Error codes** (body `error.code`): `SUBSCRIPTION_EXPIRED` (402), `SEAT_LIMIT` (403),
`SUBMISSION_OPEN` (409, one open payment exists), `PURPOSE_NOT_ALLOWED` (409), `ALREADY_REVIEWED` (409),
`SUBSCRIPTION_NOT_ACTIVE` (409), `PLAN_INACTIVE` (409), `PERIOD_NOT_OFFERED` (400),
`PROOF_INVALID` (400: not the company's, not type paymentProof, or already used).

## SUBS-BACKEND

Folder `backend/src/features/subscription/` (`subscription.constants.js`, `subscription.rules.js` +
test, `services/plan.service.js`, `services/subscription.service.js`, `services/submission.service.js`,
`services/expiry.service.js`, `middleware/subscriptionGate.middleware.js`, controllers, routes,
validations).

### Company routes: `/api/v1/billing` (mounted with `authMiddleware` only, never gated)

| Method / path | Needs | Body / query | Returns |
| --- | --- | --- | --- |
| GET `/billing/status` | any active company user | none | `{ state, kind, plan: { id, name, monthlyPricePaise, extraSeatPricePaise }, periodMonths, startsAt, endsAt, graceEndsAt, daysLeft, graceDaysLeft, seats: { included, extra, total, used, free, overBy }, openSubmission: { id, purpose, amountPaise, createdAt } or null, allowedPurposes: ['new'] }` |
| GET `/billing/plans` | any active company user | none | active plans: `{ id, name, description, monthlyPricePaise, includedSeats, extraSeatPricePaise, billingPeriods }[]` |
| GET `/billing/quote` | `billing.manage` | `purpose`, `planId` (not for extra_seats), `periodMonths` (not for extra_seats), `extraSeats` | `{ amountPaise, baseAmountPaise, extraAmountPaise, remainingDays, totalSeats, endsAt }` (same function the submit uses) |
| POST `/billing/submissions` | `billing.manage` | `{ purpose, planId, periodMonths, extraSeats, proofDocumentId, referenceNo, paidOn? }` | 201 submission (below) |
| GET `/billing/submissions` | `billing.manage` | `cursor`, `limit` (default 20), `status?` | `{ items, pagination }`, newest first |
| GET `/billing/submissions/:id` | `billing.manage`, own company only | none | one submission with proof file URL |
| GET `/billing/seat-changes` | `billing.manage` | `cursor`, `limit` | seat history, newest first |

Submission shape: `{ id, purpose, planId, planName, periodMonths, extraSeats, amountPaise, breakdown,
referenceNo, paidOn, proofDocumentId, proofUrl, status, reviewNote, reviewedAt, createdAt }`.
The server ignores any `amountPaise`, `companyId` or `status` in the body. Company comes from `req.user`.

Submit validation: plan exists and is active (`PLAN_INACTIVE`), `periodMonths` in the plan's
`billing_periods`, `extraSeats` integer 0..500, `referenceNo` 3..100 chars, purpose allowed for the
state (table above), no other `submitted` row (`SUBMISSION_OPEN`), proof document belongs to the
company, type `paymentProof`, not in another submission. Insert the submission and a
`submission_created` event in one transaction, then notify the platform admins (after commit).

**Upload.** Proof uses the existing `POST /api/v1/documents/upload` with `documentType=paymentProof`.
It needs two changes by whoever owns `documentActor.middleware.js` and `document.controller.js`: let a
user with `billing.manage` (not only `team.manage`) upload, but only the type `paymentProof`; and skip the
read-only block for that type.

### Platform routes: `/api/v1/platform` (existing `root_admin` mount)

| Method / path | Body / query | Returns / effect |
| --- | --- | --- |
| GET `/platform/plans` | `includeInactive?` | all plans with counts of subscribed companies |
| POST `/platform/plans` | `{ name, description?, monthlyPricePaise, includedSeats, extraSeatPricePaise, billingPeriods[] }` | 201 plan; writes `plan_created` |
| PATCH `/platform/plans/:planId` | any of the same fields plus `isActive` | updated plan; writes `plan_updated` with before/after |
| GET `/platform/payments` | `status` (default submitted), `companyId?`, `cursor`, `limit` | submissions with company name and type, plan, amount, proof URL, oldest first for `submitted` |
| GET `/platform/payments/:id` | none | submission + the company's current subscription + its last 10 events |
| POST `/platform/payments/:id/approve` | `{ note? }` | the approval transaction above; returns submission + new subscription status; notifies the company |
| POST `/platform/payments/:id/reject` | `{ reason }` (3..500 chars, required) | rejects; notifies the company with the reason |
| GET `/platform/subscriptions` | `state?`, `search?`, `cursor`, `limit` | `{ companyId, companyName, companyType, state, planName, endsAt, seats: { total, used } }[]` |
| GET `/platform/subscriptions/:companyId` | none | status (same shape as `/billing/status`) + events + seat changes |
| POST `/platform/subscriptions/:companyId/cancel` | `{ reason }` | status cancelled (read-only at once); writes `cancelled`; notifies. Undo = approve a new submission |

Rules: the platform admin never edits dates or seats by hand; the only ways to change an entitlement are
approval, trial start, cancel, and the clock. Every change writes an event in the same transaction.

### Hooks into existing code

1. **Company approval** (`platform.service.js` `approveCompany`): inside the same transaction call
   `startTrial(tx, companyId)` when `TRIAL_DAYS > 0`, else insert a `pending_payment` row.
   Idempotent (`ON CONFLICT (company_id) DO NOTHING`); writes `seat_changes` (`trial_started`) and a
   `trial_started` event.
2. **Lazy fallback**: the status resolver inserts the same trial row if an approved company has none
   (covers `seed:demo` and any path that bypasses approval).
3. **`seatProblem`** in `member.service.js`, see Seat above.
4. **Clock** `startSubscriptionClock()` in `index.js`, every `EXPIRY_CLOCK_MS`: set `status` to
   `grace` or `expired` where dates say so, write `status_changed` events, and send reminders (below).
   Safe to run twice at once: updates carry `WHERE status = <old>`.

### The 402 read-only rule

Middleware `subscriptionGate` (in `subscription/middleware/`) runs right after `authMiddleware` and is
added in `backend/src/routes/index.js` as one shared array, `const companyApi = [authMiddleware,
subscriptionGate]`, used in place of `authMiddleware` on: `/companies`, `/network`, `/loads`,
`/awards`, `/masters`, `/trips`, `/transporters`, `/team`, `/fleet`, and any later company feature
(RFQs, contracts, indents). Not behind the gate: `/auth/*` (login, logout, about-me,
change-password), `/billing/*`, `/notifications/*` (reading and marking read), `/platform/*` and
`/documents/*` (that route authenticates itself, see below).

Logic:
1. `GET`, `HEAD`, `OPTIONS` pass. Users without a company (root admin) pass.
2. Load the company's subscription (one indexed query on `company_subscriptions.company_id`; create the
   trial if missing). Compute the state. `trial`, `active`, `grace` pass.
3. For `expired`, `cancelled`, `pending_payment`: pass only the exemption below, else
   `AppError('Your subscription has ended. Renew to make changes.', 402, 'SUBSCRIPTION_EXPIRED')`.

Exemption (matched on `req.method` and `req.baseUrl + req.path`): `POST /team/members/:userId/deactivate`
(so an over-seat company can still free seats). Nothing else; everything else under the gated mounts is
refused, including company settings, loads, bids, trips and team add/edit/reactivate.

Documents: `/documents/upload` and `/documents/deleteDocument` authenticate inside `documentActor`. For
a signed-in `via: 'user'` actor the controller applies the same state check after reading the form, and
refuses with 402 unless `documentType = paymentProof`. Registration uploads are unaffected.

The 402 body is the normal error envelope, so `error.code === 'SUBSCRIPTION_EXPIRED'` is what the
frontend reads.

### Notifications sent by billing (via `notifyCompanies`, with `dedupeKey`)

| Type | To | When | dedupeKey |
| --- | --- | --- | --- |
| `billing.submitted` | all platform admins | submission created | `sub-submitted:<id>` |
| `billing.approved` / `billing.rejected` | the company | review | `sub-reviewed:<id>` |
| `billing.trial_started` | the company | trial begins | `trial:<subId>` |
| `billing.expiring` | the company | 7 and 1 days before `ends_at` | `exp:<subId>:<endsAt date>:<7|1>` |
| `billing.grace` | the company | state becomes grace | `grace:<subId>:<endsAt date>` |
| `billing.readonly` | the company | state becomes expired | `ro:<subId>:<endsAt date>` |

Platform admins have no company: add `notifyPlatformAdmins(args)` next to `notifyCompanies` (selects users with
`user_role = 'root_admin'` and status active).

## NOTIFY-BACKEND (ENR-017)

Goal: the business action (bid, award, approval) commits first and never waits for or fails on email; a
worker delivers email and retries; nobody gets two copies; unread counts stay per user.

Files: `notification/notification.constants.js`, `notification/notification.rules.js` + test,
`services/notification.service.js` (change), `services/delivery.worker.js` (new), routes for admin.

**Write path.** `notifyCompanies({ companyIds, actorUserId, type, title, message, data, dedupeKey?, tx? })`
(signature stays compatible; `dedupeKey` and `tx` are new and optional):
1. Resolve active recipients of those companies.
2. In one transaction (the caller's `tx` when given, which is the transactional-outbox form, else its own):
   `INSERT notification ... ON CONFLICT (recipient_user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
   RETURNING id`. Only returned ids get delivery rows.
3. For each returned notification insert two delivery rows: `in_app` (`status = sent`, `sent_at = now`)
   and `email` (`status = pending`, `to_email` copied, `next_attempt_at = now`). Unique
   `(notification_id, channel)` blocks a second row.
4. After commit call `kickDeliveryWorker()` (a `setImmediate` drain) so mail normally leaves in
   seconds. If it throws, nothing else is affected.
Callers must still invoke `notifyCompanies` after their own transaction commits, or pass `tx`. A failure
inside it is caught and logged by the caller wrapper, never rethrown into the business action.

**Worker** `startDeliveryWorker()` in `index.js`, every 30 s plus `kickDeliveryWorker()`:
1. Claim: in one statement select up to 25 rows `WHERE channel = 'email' AND status = 'pending' AND
   next_attempt_at <= now() ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED`, and update them to
   `attempts = attempts + 1, next_attempt_at = now() + 5 minutes` (a lease). Two workers never take the same
   row; a crashed worker's rows come back after the lease.
2. For each, load the notification; if the recipient user is now inactive, set `failed` with `last_error
   = 'RECIPIENT_INACTIVE'` and stop. Else `sendEmail` to `to_email`.
3. Success: `status = sent, sent_at = now(), last_error = null`.
4. Failure: store `last_error` (first 500 chars). A permanent failure (SMTP code 550-554, or invalid
   address) sets `failed` at once. Otherwise if `attempts >= 5` set `failed`; else
   `next_attempt_at = now() + backoff[attempts - 1]` with `backoff = [1 min, 5 min, 30 min, 2 h, 12 h]`.
Guarantee is at-least-once for the email only (a crash after the mail server accepts but before the row is
marked sent can resend once); the notification itself is stored once.

**Observability (platform admin only, under `/api/v1/platform`):**

| Method / path | Returns / effect |
| --- | --- |
| GET `/platform/notifications/deliveries` | `status` (default failed), `cursor`, `limit`: `{ id, notificationId, type, title, toEmail, status, attempts, nextAttemptAt, lastError, createdAt }` |
| GET `/platform/notifications/deliveries/summary` | `{ pending, sent, failed, oldestPendingAt }` for the last 7 days |
| POST `/platform/notifications/deliveries/:id/retry` | only `failed`: `status = pending, attempts = 0, next_attempt_at = now()`; 409 otherwise |

**Unread counts.** `unreadCount` and `listNotifications` keep reading only `notification` filtered by
`recipient_user_id`; delivery rows are never joined, so retries, failures and the in_app row cannot move a
count. A user only ever sees their own rows. Deactivated users' unread rows stay but are not reachable.

**Tests (unit, `notification.rules.test.js`):** `nextAttempt(attempts, now)` returns the backoff step and
`null` after 5; `isPermanentFailure(error)`; `emailDeliveryRow(user)`; dedupe key shape. Integration
checks for the check stage: mail down, then up, gives one email per recipient; a bid commits while mail is
down; the same `dedupeKey` twice gives one row; two worker loops never double-claim.

## SUBS-UI-COMPANY

Route: **Settings → Billing** tab, added to the existing Settings page (`/<company-type>/settings`, tab
slug `billing`); shown to everyone with a read-only summary, actions only for `billing.manage`. Put the
code in `frontend/src/features/billing/` (api, ui) and add `BILLING_MANAGE: 'billing.manage'` to
`frontend/src/shared/lib/permissions.js`.

Shell banner (every company page): `GET /billing/status` once on shell load and again after any 402.
- `trial` or `active` with `daysLeft <= 7`: neutral banner "Your plan ends in N days" with a Renew link
  (only for `billing.manage`, else "Ask your account admin to renew").
- `grace`: warning banner "Plan ended on <date>. Full access until <graceEndsAt> (N days left)".
- `expired`, `cancelled`, `pending_payment`: danger banner "Read-only. Renew to make changes", and the
  write controls stay visible but their requests answer 402.

Billing tab content, top to bottom:
1. **Current plan** panel: plan name, state chip (kit `StatusChip`), starts, ends, grace end, days left.
2. **Seats** panel: `used / total` with a TickBar, included + extra, "Over by N" in warning tone when
   `overBy > 0`, link to the Team page.
3. **Open payment** panel when `openSubmission` exists: amount, reference, submitted time, "Waiting for
   review". The buy buttons are disabled with that explanation (`SUBMISSION_OPEN`).
4. **Actions** (only for `billing.manage`, and only the ones in `allowedPurposes`): "Choose a plan" (new),
   "Renew" (renewal), "Add seats" (extra_seats). Each opens one modal:
   - Plan and period: radio cards from `GET /billing/plans`, period chips from the plan's `billingPeriods`,
     extra-seats stepper (not for Add seats; Add seats shows only the stepper).
   - Live amount from `GET /billing/quote` (debounced), showing base, extra seats, total in rupees, and for
     seats "N days left, pro-rated".
   - Step 2: pay outside the platform (bank details are not shown by the app in v1; the admin's payment
     instructions go in a text block from a constant) then upload proof (image or PDF through
     `POST /documents/upload`, `documentType=paymentProof`), enter reference number and date paid.
   - Submit calls `POST /billing/submissions`; on success the modal closes and the panel in 3 appears.
     Errors map to the codes above with plain messages.
5. **Payment history** grid (kit DataGrid, cursor mode) from `GET /billing/submissions`: date, purpose,
   plan, period, seats, amount, reference, status chip, review note (the rejection reason). Row opens a
   side panel with the proof link.
6. **Seat history** list from `GET /billing/seat-changes` (collapsed by default).

Team page: when `SEAT_LIMIT` comes back from add or reactivate, show "All N seats are in use" with a
Buy seats link to this tab (for `billing.manage`) or "Ask your account admin" otherwise.
API client: a response with status 402 and `error.code === 'SUBSCRIPTION_EXPIRED'` refetches the status
and shows the read-only toast "Your subscription has ended. Renew to make changes." with a link to
Billing; no retry.

## SUBS-UI-ADMIN

Platform shell (`frontend/src/app/(admin)/rootAdmin/`), code in `frontend/src/features/platform/` (new
files only). Two new nav entries next to Companies: **Plans** (`/rootAdmin/plans`) and **Payments**
(`/rootAdmin/payments`). A third, **Subscriptions** (`/rootAdmin/subscriptions`), lists every company.

**Plans** (`/rootAdmin/plans`): grid with name, monthly price, included seats, extra-seat price, periods,
active chip, companies on it. "New plan" side panel with the five fields (price entered in rupees, sent
as paise; seats integer; periods as checkboxes 1/3/12). Row action: edit (same panel), deactivate or
reactivate. A short note says an edit only affects later payments. Calls: `GET/POST /platform/plans`,
`PATCH /platform/plans/:planId`.

**Payments** (`/rootAdmin/payments`): tabs Submitted (default, with a count chip), Approved, Rejected;
grid with company, type, purpose, plan, period, seats, amount, reference, submitted time (oldest first
under Submitted). Row opens a side panel: facts, the proof (image preview or PDF link opening in a new
tab), the company's current subscription (state, ends, seats) and "what approval will do" in one line
(for example "Starts 18 Nov 2026, ends 18 Dec 2026, 8 seats"), computed on the page from the same rule
text returned by `GET /platform/payments/:id` (`effectPreview`). Buttons **Approve** (confirm dialog with
the amount, then `POST .../approve`, optional note) and **Reject** (reason required, `POST .../reject`).
After either, the row leaves the Submitted tab. A second approve (another admin, double click) shows
`ALREADY_REVIEWED` as "Already reviewed by <name>".

**Subscriptions** (`/rootAdmin/subscriptions`): grid with company, type, state chip, plan, ends,
`used / total` seats; filter by state; search by company. Row opens a side panel with the status, event
timeline (kit `Timeline`) and seat history; a "Cancel subscription" action (reason required) with a
warning that the company becomes read-only immediately.

**Notification delivery** (small panel on the Payments page header or the admin overview, one line):
"Email: N pending, M failed" from `GET /platform/notifications/deliveries/summary`, with a link to a
failed list and a Retry button per row.

## Not in this wave (kept out on purpose)

Payment gateway, invoices and GST invoices, refunds, coupons, automatic downgrade at term end, proration
of a plan change inside a term, per-plan feature flags, a company cancelling its own pending submission.
Each is a later decision; the data model leaves room (new `purpose` values and `subscription_events`).

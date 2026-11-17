# Contract RFQ, contracts and indents: design (ENR-018)

Status: approved decisions from PRD section 4 (RFQ, Contracts, Daily rows), turned into a build spec.
Unblocks ENR-019 to 023 and ENR-026. Branch `wave3`, migration `0012_contracts` (already applied to `enroute_w3`).
Builders: read your section only (RFQ-BACKEND, CONTRACT-BACKEND, RFQ-UI, CONTRACT-UI) plus section 1 and 2.

## 1. Model and rules shared by all sections

Chain: `RFQ (lanes) -> quotes -> lane award -> contract (lanes + rate versions) -> indent -> load (kind contract) -> award -> trips -> POD`.

- "Daily" is an indent against a contract lane. It is not an Ad Hoc mode (Q1).
- Money: every new column is integer **paise** (`bigint`, JS number). API sends/accepts paise. The CSV template uses rupees for humans and converts at the import boundary. The only rupee conversion is at indent acknowledge (section 4.6), because `loads`/`bids` are rupees.
- Rate unit by `rateBasis`: `per_vehicle` = per truck trip, `per_ton` = per ton carried, `per_kg` = per chargeable kg. No `per_km` in RFQs.
- Dates are IST calendar dates (`YYYY-MM-DD`, use `todayIST()` as trips do). Timestamps are UTC.
- Config constants (new file `rfq.constants.js` / `contract.constants.js` in the feature folder, builders create them; defaults flagged "mine" are not in the PRD and need Suman's confirmation):

| Constant | Value | Source |
| --- | --- | --- |
| acceptance window | `DEFAULTS.acceptanceHours` = 24 h (import from load.constants) | PRD |
| min window | 60 min; max window 30 days; extension cap 3 | mine |
| max lanes per RFQ / per import | 200 | mine |
| max quote revisions per lane per transporter | 10 | mine |
| max import size | 200 KB, 200 rows | mine |
| default and minimum cancellation notice | 7 days | mine |
| max trucks per indent | 50 | mine |
| closing-soon notice | `DEFAULTS.closingSoonMinutes` = 60 | reuse |

- Every route: `authMiddleware`, company scoping by `user.companyId`, permission check through `requireCustomerManager` / `requireTransporterManager` (`load.access.js`) for writes. Reads need only the right company type. A company never learns another company's rows exist (404, not 403).
- Every state change: one transaction, row lock (`FOR UPDATE`), insert into the feature's events table (`rfq_events`, `contract_events`), notification after commit through `notifyCompanies` (failures logged, never undo the action; same `logNotifyError`).
- Rules live in `rfq.rules.js` / `contract.rules.js` as pure functions with `*.rules.test.js` (node:test, same style as `load.rules.test.js`). Services stay thin.
- Response envelope and pagination: same as `/loads` (`successResponse`, `paginatedResponse`, `?page&limit`, default 20, max 100).
- Backward compatibility: Ad Hoc loads, awards, bids and trips keep their meaning. `loads.kind` already exists; contract loads use `kind='contract'`, number prefix `CT`. Awards without a bid (`bidId` null) only exist for contract loads. No existing award is converted to a contract.

### Schema summary (built, in `backend/src/features/{rfq,contract}/schemas/`)

RFQ side: `rfqs`, `rfq_lanes`, `rfq_invitations`, `rfq_quotes` (current), `rfq_quote_revisions` (insert-only), `rfq_lane_awards`, `rfq_events`, `rfq_imports`.
Contract side: `contracts`, `contract_lanes` (immutable snapshot), `contract_lane_terms` (rate/volume versions, insert-only), `contract_amendments`, `contract_indents`, `contract_events`.
Additive: `loads.contract_id`, `loads.contract_lane_id`, `loads.contract_indent_id` (plain uuids, no FK to avoid an import cycle; the contract side holds the FK via `contract_indents.load_id`); `awards.bid_id` now nullable; `awards.contract_indent_id`.
Enums: `rfq_status` draft|open|closed|awarded|cancelled; `rfq_rate_basis` per_vehicle|per_ton|per_kg; `lane_award_status` pending|accepted|declined|expired; `rfq_import_status` previewed|confirmed|discarded; `contract_status` active|amending|expired|cancelled; `amendment_status` proposed|accepted|rejected; `indent_status` requested|acknowledged|declined|cancelled|fulfilled. The value arrays are exported from the schema files (`RFQ_STATUSES`, `CONTRACT_STATUSES`, ...); import them, do not retype.
Key constraints builders rely on: one live (pending/accepted) lane award per lane (partial unique index); one contract per (rfq, transporter); one open amendment per contract (partial unique index); `(contract_id, idempotency_key)` unique on indents; `(customer, content_hash)` unique on imports.

### Permissions (added to `team.permissions.js`, existing roles updated by the migration)

| Key | Company type | Meaning | Presets that hold it |
| --- | --- | --- | --- |
| `rfqs.manage` | customer | create, edit draft, import, publish, extend, cancel RFQs; award lanes | Co-admin, Bid manager |
| `contracts.manage` | customer | place/cancel indents, propose/answer amendments, cancel contract | Co-admin, Bid manager |
| `quotes.submit` | transporter | submit and revise quotes | Co-admin, Bid manager |
| `contracts.respond` | transporter | respond to lane awards, acknowledge/decline indents, propose/answer amendments, cancel contract | Co-admin, Bid manager |

Owner holds all. Viewer/Accounts/Trip manager can read only. New companies get them from `presetRolesFor`; existing Co-admin and Bid manager roles got them from the data step in 0012.

## 2. Lifecycles

RFQ: `draft -> open (publish) -> closed (clock at closesAt) -> awarded (first lane award)`; `draft|open|closed|awarded -> cancelled` only if no lane award is accepted. `open -> open` on extend.
Lane award: `pending -> accepted | declined | expired (clock at acceptBy)`. A declined/expired lane returns to "unawarded" and may be awarded again (RFQ stays `awarded`).
Contract: `active <-> amending` (an open proposal) ; `active|amending -> expired` (clock, day after `validTo`) ; `active|amending -> cancelled` (with notice).
Amendment: `proposed -> accepted | rejected` (the proposer withdrawing counts as rejected with note "withdrawn").
Indent: `requested -> acknowledged | declined | cancelled`; `acknowledged -> fulfilled` (clock sees the load completed).

The clock (`runRfqClockOnce`, `runContractClockOnce`, called next to `runTripClockOnce` in `load/services/clock.service.js`, same claim/skip-locked pattern) does: close due RFQs (open, `closesAt <= now`), "closing soon" notification, expire pending lane awards, expire contracts (`validTo < today`, an open amendment becomes rejected "contract expired"), flip acknowledged indents to fulfilled when `loads.status='completed'` (set `fulfilledAt = loads.completedAt`).

## 3. RFQ-BACKEND

Base `/api/v1/rfqs`. Files: `features/rfq/{rfq.constants.js,rfq.rules.js,rfq.rules.test.js,services/*,controllers/*,routes/rfq.routes.js,validations/*,schemas/*}`; mount in `routes/index.js` as `router.use('/rfqs', authMiddleware, rfqRoutes)`.

### 3.1 Rules (`rfq.rules.js`, all pure, all tested)
- `publishProblems(rfq, lanes, inviteeCount, now)`: title; `validFrom` >= today; `validTo` >= `validFrom` and >= today; `closesAt` in the future, >= now+60 min, <= now+30 days, and before the end of `validTo`; 1..200 lanes; >=1 invitee. Returns a list of `{field,message}`.
- `laneProblems(lane)`: PIN `^[1-9][0-9]{5}$` both ends; city required; origin != destination (same pin and same vehicle type counts as duplicate within an RFQ); `monthlyVolumeTrucks` integer 1..10000; `rateBasis` in RFQ_RATE_BASES; `targetRatePaise` null or integer > 0; vehicle type exists and active.
- `canQuote({status, closesAt}, now)`, `quoteProblems({ratePaise, revisionCount, previousRatePaise, note})`: integer paise > 0 and <= 10,000,000,00 (Rs 1 crore); revisionCount < 10; rate or note must differ from the current quote.
- `canExtend(rfq, newClosesAt, now)`: status open, newClosesAt later than current, within 30 days of now, `extensionCount < 3`.
- `awardProblems(rfq, lane, quote, liveAward, invited)`: RFQ closed|awarded; lane has no live award; quote belongs to lane and rfq; transporter still invited.
- `acceptBy(now)` = now + `DEFAULTS.acceptanceHours`.
- `rfqNumber(seq, createdAt)` = `RFQ-<year>-<6 digit seq>` (mirror `loadNumber`).
- `contractFromAwards(rfq, laneAwards, lanes)` (pure builder of the contract + contract_lanes + lane_terms v1 rows; used by 3.7 and tested here so CONTRACT-BACKEND can reuse it).
- CSV: `parseCsv(text)` (RFC 4180: quotes, escaped quotes, CRLF/LF, BOM stripped, no new dependency) and `validateImportRows(rows, {vehicleTypesByCode, pinIndex})` -> `{ rows:[{rowNo, lane|null, errors:[{field,message}]}], errorCount }`.

### 3.2 Endpoints

| Method + path | Who / permission | Body / query | Result |
| --- | --- | --- | --- |
| `GET /rfqs` | customer (own) or transporter (invited, status != draft) | `?status&q&page&limit` | page of `RfqRow` |
| `POST /rfqs` | customer, `rfqs.manage` | `RfqDraft` | 201 `Rfq` (status draft) |
| `GET /rfqs/:rfqId` | customer owner; transporter invitee | | `Rfq` (view differs, 3.4) |
| `PATCH /rfqs/:rfqId` | customer, `rfqs.manage`, draft only | partial `RfqDraft` (lanes replaced as a whole when `lanes` is sent) | `Rfq` |
| `GET /rfqs/invitees` | customer | | accepted-connection transporters (reuse `getInvitees` from loads) |
| `POST /rfqs/:rfqId/publish` | customer, `rfqs.manage` | | `Rfq` open; copies invitees into `rfq_invitations`, validates with `publishProblems` (422 with the list) |
| `POST /rfqs/:rfqId/extend` | customer, `rfqs.manage` | `{ closesAt }` | `Rfq` |
| `POST /rfqs/:rfqId/cancel` | customer, `rfqs.manage` | `{ reason }` (required, <=300) | `Rfq`; 409 if any lane award is accepted |
| `PUT /rfqs/:rfqId/lanes/:laneId/quote` | transporter, `quotes.submit` | `{ ratePaise, note? }` | `MyQuote` (creates or revises) |
| `GET /rfqs/:rfqId/board` | customer owner | | `Board` (3.5) |
| `POST /rfqs/:rfqId/awards` | customer, `rfqs.manage` | `{ awards:[{ laneId, quoteId, reason? }] }` | `Rfq` with awards |
| `POST /rfqs/:rfqId/awards/respond` | transporter, `contracts.respond` | `{ decision:'accept'\|'decline', reason? }` | `{ rfq, contractId\|null }` |
| `GET /rfqs/:rfqId/events` | customer owner | | `RfqEvent[]` |
| `GET /rfqs/import-template` | customer | | `text/csv` template |
| `POST /rfqs/imports` | customer, `rfqs.manage` | `{ fileName, csvText }` | 201 `Import` (200 + `duplicate:true` when the same content was uploaded before) |
| `GET /rfqs/imports/:importId` | customer owner | | `Import` |
| `POST /rfqs/imports/:importId/confirm` | customer, `rfqs.manage` | `{ title, validFrom, validTo, rfqId? }` | `{ import, rfq }` |
| `DELETE /rfqs/imports/:importId` | customer, `rfqs.manage` | | 204 (sets `discarded`) |

Route order: static paths (`/invitees`, `/import-template`, `/imports...`) before `/:rfqId`.

### 3.3 Payloads
```
RfqDraft = { title, validFrom, validTo, closesAt, paymentTerms?, notes?,
             terms?: { freeTimeLoadingHours, freeTimeUnloadingHours, detentionRatePaisePerHour,
                       labourPayableBy, freightPayableBy, tollIncluded },   // defaults as loads
             inviteeCompanyIds: uuid[],
             lanes: [{ originPinCode, originCity, originState?, destPinCode, destCity, destState?,
                       vehicleTypeId, monthlyVolumeTrucks, rateBasis, targetRatePaise?, notes? }] }
RfqRow   = { id, number, title, status, validFrom, validTo, closesAt, laneCount, inviteeCount,
             quotedCount (customer: transporters who quoted),
             myQuotedLanes (transporter: lanes I quoted), customer? (transporter view: {id,name}),
             awardPending (transporter: boolean), createdAt }
Rfq      = RfqRow + { terms, paymentTerms, notes, lanes: Lane[], invitees: [{companyId,name,viewedAt,quotedLanes}],
             publishedAt, closedAt, awardedAt, cancelledAt, cancelReason, extensionCount,
             laneAwards: LaneAward[], permissions: {canEdit,canPublish,canExtend,canCancel,canAward,canQuote,canRespond} }
Lane     = { id, laneNo, originPinCode, originCity, originState, destPinCode, destCity, destState,
             vehicleType:{id,code,name}, monthlyVolumeTrucks, rateBasis, targetRatePaise (customer only),
             notes, quoteCount (customer), myQuote (transporter) }
MyQuote  = { quoteId, laneId, currentRatePaise, revisionCount, lastSubmittedAt,
             revisions:[{revisionNumber, ratePaise, note, createdAt}] }
LaneAward= { id, laneId, transporter:{id,name}, ratePaise, status, acceptBy, respondedAt, declineReason }
```
Revisions return an error message `409 "Quotes are closed"` after close, `409 "Revision limit reached"` at 10.

### 3.4 Visibility (must be tested)
- Draft: only the owner company can read it (404 for everyone else, including invitees).
- Transporter view: only RFQs it is invited to, never draft; `targetRatePaise` removed; lane `quoteCount` removed; only its own quote and revisions; only its own lane awards (`laneAwards` filtered by company). It cannot learn who else was invited.
- Customer view before close: per lane `quoteCount` and per invitee `quotedLanes` count only, no rates, no `GET /board` rates (board returns 409 `Quotes are visible after the window closes` while status is `open`, but `GET /rfqs/:id` already shows the counts).
- Customer after close: all quotes, with revision history, via `/board`.
- Quote write endpoints reject non-invitees with 404.

### 3.5 Board (customer, closed|awarded|cancelled RFQ)
```
Board = { rfqId, lanes: [{ laneId, laneNo, route, vehicleType, rateBasis, monthlyVolumeTrucks, targetRatePaise,
          quotes:[{ quoteId, transporter:{id,name,rating?}, currentRatePaise, rank (1 = lowest), vsTargetPct|null,
                    revisionCount, lastSubmittedAt, revisions:[{revisionNumber,ratePaise,note,createdAt}] }],
          award: LaneAward|null (the live one), history: LaneAward[] (declined/expired) }] }
```
Rank is lowest rate first within a lane; ties broken by earlier `lastSubmittedAt` (reuse `rankBids` tie logic by mapping rates to rupees only if it fits, else a local equivalent with a test).

### 3.6 Award
`POST /rfqs/:id/awards` in one transaction: lock RFQ; for each item run `awardProblems`; insert `rfq_lane_awards` (`ratePaise` copied from the quote, `acceptBy` identical for every row of the same transporter in this call); RFQ -> `awarded` on the first award; event `lane_awarded` per row; notify each transporter once. If any item fails, nothing is written (422 lists the failing lanes). Unawarded lanes are fine. The customer can call it again later for remaining or re-opened lanes; a second bundle for a transporter gets its own `acceptBy`.

### 3.7 Respond (accept or decline) and contract creation
`POST /rfqs/:id/awards/respond` acts on ALL of the caller's `pending` lane awards of this RFQ at once (bundle). Partial accept per lane is out of v1.
- Lock the pending rows. None pending -> if the decision matches an earlier answer return that result (idempotent 200), else 409 "Already answered".
- `acceptBy <= now` -> mark `expired`, 409 "The time to accept has passed".
- **Decline:** rows -> `declined` (+reason), event, notify customer.
- **Accept:** rows -> `accepted`; find the contract for `(rfqId, transporterCompanyId)` or create it; for each accepted lane insert `contract_lanes` (snapshot of the RFQ lane: route, vehicle type, basis) and `contract_lane_terms` version 1 (`ratePaise` from the lane award, `monthlyVolumeTrucks` from the lane, `effectiveFrom = validFrom`). Contract: `validFrom/validTo` = RFQ period, `terms` = frozen RFQ terms, `paymentTerms`, `acceptedByUserId`, `version 1`. A later accepted re-award for a transporter that already has a contract adds lanes to that same contract (event `lane_added`); the unique index guarantees one contract. Event `contract_created` in `contract_events`. Notify the customer.
- The unique index `(rfq_id, transporter_company_id)` is the double-click guard.

### 3.8 CSV import
Template (`GET /rfqs/import-template`), UTF-8, comma separated, header row required, one row per lane:

| Column | Required | Rule |
| --- | --- | --- |
| `origin_pin` | yes | 6 digits |
| `origin_city` | yes | text <= 100; if the PIN is in `pin_codes` and the city differs, row gets a warning, not an error |
| `dest_pin`, `dest_city` | yes | same |
| `vehicle_type` | yes | a `vehicle_types.code` (case-insensitive); unknown code = row error listing valid codes |
| `monthly_volume_trucks` | yes | integer 1..10000 |
| `rate_basis` | yes | `per_vehicle`, `per_ton` or `per_kg` |
| `target_rate_inr` | no | decimal rupees, max 2 places, > 0; converted to paise |
| `notes` | no | <= 300 |

State is filled from `pin_codes` when known. Unknown or missing header, empty file, over 200 KB or over 200 rows = file error (400, no import row). A row duplicating an earlier `(origin_pin, dest_pin, vehicle_type)` = error on the later row. Header names are matched case-insensitively and trimmed; extra columns are ignored with a warning.
Flow: `POST /imports` parses, stores `rows` + counts, status `previewed`; it never touches `rfqs`. The preview shows every row with its errors. `confirm` requires `errorCount = 0` (422 otherwise), then in ONE transaction creates a draft RFQ with all lanes (or appends lanes to the given draft `rfqId`, lane numbers continue, cap 200) and marks the import `confirmed`. Any failure rolls back everything, so there is never a partial RFQ and never a live RFQ from an import (publish is a separate step). Duplicates: uploading the same normalized content again returns the existing import (`duplicate:true`); confirming an already confirmed import returns the same RFQ and creates nothing (no-op). A corrected file has a different hash and is a new import.

### 3.9 Examples that become tests
1. One lane: Delhi 110001 -> Mumbai 400001, 32 ft MXL, 20 trucks/month, per_vehicle. Two invitees quote Rs 62,000 and Rs 59,500 (6200000 / 5950000 paise); the second revises to 5800000. Close; board ranks 5800000 first and shows 2 revisions for it; award; accept; one contract with one lane, version 1 rate 5800000.
2. Three lanes, two transporters: A awarded lanes 1 and 2, B awarded lane 3, lane 4 unawarded. A accepts: one contract with two lanes. B declines: lane 3 can be re-awarded. Exactly one contract per transporter.
3. Failures: quote after `closesAt` (409), quote by a non-invitee (404), 11th revision (409), award a lane twice (422), `validTo` before `validFrom` (422), publish with no invitee (422), accept after `acceptBy` (409, award expired), respond twice (idempotent), import with a bad pin and unknown vehicle code (row errors, confirm 422), same CSV twice (one import, one RFQ).
4. Date boundary: `closesAt` exactly now+60 min is allowed, one minute less is not; `validTo = today` is allowed.

## 4. CONTRACT-BACKEND (including indents)

Base `/api/v1/contracts` and `/api/v1/indents`. Files: `features/contract/{contract.constants.js,contract.rules.js,contract.rules.test.js,services/*,controllers/*,routes/contract.routes.js,validations/*}`. Mount `router.use('/contracts', authMiddleware, contractRoutes)` and `router.use('/indents', authMiddleware, indentRoutes)`.

### 4.1 Rules (`contract.rules.js`, pure + tested)
- `contractNumber(seq, createdAt)` `CON-<year>-<seq6>`; `indentNumber` `IND-...`.
- `termForDate(terms[], date)`: the lane term with the greatest `effectiveFrom <= date` (null if none).
- `monthOf(date)` = `YYYY-MM`; `volumeForMonth(terms[], month)`: volume of the latest term with `effectiveFrom <=` last day of that month.
- `indentProblems({contract, laneTerms, trucks, pickupDate}, today)`: contract status `active|amending`, or `cancelled` with `pickupDate < cancelEffectiveOn`; never `expired`; `pickupDate >= today`; `pickupDate` within `[validFrom, validTo]`; `1 <= trucks <= 50`.
- `overVolume(consumedInMonth, trucks, monthlyVolume)` = `max(0, consumed + trucks - volume)` (warn only, never blocks).
- `amendmentProblems(contract, laneIds, changes, today)`: contract `active`; `effectiveFrom` in `[today, validTo]`; at least one real change; `validTo` not before `effectiveFrom` and not before the last acknowledged indent's pickup date; only existing lanes; rate integer > 0; volume integer 1..10000; no lane add/remove in v1.
- `cancelProblems(contract, noticeDays)`: contract `active|amending`; notice >= 7; `cancelEffectiveOn = today + notice` (clamped to `validTo`).
- `buildIndentLoad(contract, lane, laneTerm, indent)` and `buildIndentAward(...)`: pure field mappers (4.6), tested for every copied field.

### 4.2 Contract endpoints

| Method + path | Who / permission | Body / query | Result |
| --- | --- | --- | --- |
| `GET /contracts` | party (customer or transporter) | `?status&q&page&limit` | page of `ContractRow` |
| `GET /contracts/:contractId` | party | | `Contract` |
| `GET /contracts/:contractId/consumption` | party | `?month=YYYY-MM` (default current IST month) | `Consumption` |
| `GET /contracts/:contractId/events` | party | | `ContractEvent[]` |
| `GET /contracts/:contractId/amendments` | party | | `Amendment[]` newest first |
| `POST /contracts/:contractId/amendments` | customer `contracts.manage` or transporter `contracts.respond` | `{ effectiveFrom, note?, validTo?, paymentTerms?, terms?, lanes:[{ contractLaneId, ratePaise?, monthlyVolumeTrucks? }] }` | 201 `Amendment`; contract -> `amending` |
| `POST /contracts/:id/amendments/:amendmentId/accept` | counterpart only (the company that did not propose), same permissions | | `Contract` (new version) |
| `POST /contracts/:id/amendments/:amendmentId/reject` | counterpart | `{ note? }` | `Contract` (back to active) |
| `POST /contracts/:id/amendments/:amendmentId/withdraw` | proposer | | `Contract` |
| `POST /contracts/:contractId/cancel` | either party, own permission | `{ reason, noticeDays? }` | `Contract` |
| `GET /contracts/:contractId/indents` | party | `?status&month&laneId&page&limit` | page of `Indent` |
| `POST /contracts/:contractId/indents` | customer `contracts.manage` | `IndentCreate` | 201 `Indent` (200 + `replayed:true` for a repeated key) |

### 4.3 Indent endpoints

| Method + path | Who / permission | Body | Result |
| --- | --- | --- | --- |
| `GET /indents` | party (transporter inbox / customer list across contracts) | `?status&contractId&from&to&page&limit` | page of `Indent` |
| `GET /indents/:indentId` | party | | `Indent` |
| `POST /indents/:indentId/acknowledge` | transporter `contracts.respond` | `{}` | `Indent` (with `loadId`) |
| `POST /indents/:indentId/decline` | transporter `contracts.respond` | `{ reason }` required | `Indent` |
| `POST /indents/:indentId/cancel` | customer `contracts.manage`, only while `requested` | `{ reason }` | `Indent` |

### 4.4 Payloads
```
ContractRow = { id, number, status, rfq:{id,number,title}, customer?:{id,name}, transporter?:{id,name},
                validFrom, validTo, laneCount, version, openAmendment: boolean, cancelEffectiveOn|null,
                monthConsumed, monthVolume }          // current IST month, all lanes summed
Contract    = ContractRow + { terms, paymentTerms, cancelReason, cancelledAt, cancelledBy:{id,name}|null,
                lanes:[{ id, laneNo, route fields, vehicleType, rateBasis,
                         currentTerm:{ ratePaise, monthlyVolumeTrucks, version, effectiveFrom },
                         terms:[{ version, ratePaise, monthlyVolumeTrucks, effectiveFrom, amendmentId|null }] }],
                openAmendment: Amendment|null,
                permissions:{ canPropose, canRespondAmendment, canCancel, canIndent, canAcknowledge } }
Amendment   = { id, status, proposedBy:{id,name}, note, effectiveFrom, changes, before, after,
                decidedAt, decisionNote, resultingVersion, createdAt }
IndentCreate= { contractLaneId, trucks, pickupDate, pickupTimeFrom?, pickupTimeTo?, pickupAddress?,
                pickupContactName?, pickupContactPhone?, dropAddress?, dropContactName?, dropContactPhone?,
                weightTons?, notes?, idempotencyKey (8..64 chars, client generated) }
Indent      = { id, number, status, contractId, contractNumber, lane:{id,laneNo,route,vehicleType,rateBasis},
                customer, transporter, trucks, pickupDate, pickup*/drop* fields, weightTons, notes,
                overVolumeBy, ratePaise|null (set at acknowledge), indicativeRatePaise (rate in force on pickupDate),
                loadId|null, loadNumber|null, declineReason, cancelReason, respondedAt, fulfilledAt, createdAt }
Consumption = { contractId, month, lanes:[{ contractLaneId, laneNo, monthlyVolumeTrucks,
                requested, acknowledged, fulfilled, consumed (= acknowledged + fulfilled),
                remaining (volume - consumed, may be negative), over: boolean }] }
```
Consumption is computed by one grouped query on `contract_indents` (`trucks` summed by status for `pickup_date` in the month) using index `contract_indents_lane_idx`. Pending (`requested`) is shown separately, and counts toward the over-volume warning at request time.

### 4.5 Indent creation
In one transaction: lock the contract lane row (`FOR UPDATE` on `contract_lanes`) so two concurrent requests see each other's consumption; look up an existing indent with the same `(contractId, idempotencyKey)` and return it unchanged when found (a retry never consumes capacity twice, even if the body differs); run `indentProblems` (422 list); compute `overVolumeBy` from the month's requested+acknowledged+fulfilled trucks; insert `requested`; event `indent_requested` (data includes `overVolumeBy`); notify the transporter. The response carries `overVolumeBy` so the UI can warn; the request is accepted either way.

### 4.6 Acknowledge: indent becomes a load, award and trips
One transaction, locking the indent, then the contract:
1. Idempotent: status already `acknowledged|fulfilled` -> return it unchanged (no second load). Not `requested` -> 409.
2. Contract must be `active|amending`, or `cancelled` with `pickupDate < cancelEffectiveOn`, and not expired; else 409 "The contract is no longer open for this date".
3. Rate = `termForDate(laneTerms, pickupDate).ratePaise`, frozen on the indent (`ratePaise`, `termVersion`). A requested indent is re-priced here, so an amendment effective before the pickup date applies; acknowledged indents never change.
4. Insert `loads`: `kind 'contract'`, `status 'accepted'`, `customerCompanyId`, `createdByUserId = indent.requestedByUserId`, route from the contract lane (pin/city/state) plus indent addresses/contacts, `pickupDate`, time window, `vehicleTypeId`, `vehicleCount = trucks`, `weightTons`, `priceBasis = lane rateBasis`, `loadType 'FTL'`, commercial terms copied from `contract.terms` (free times, detention, labour, freight payer, toll), `paymentTerms`, `publishedAt = acceptedAt = now`, `contractId`, `contractLaneId`, `contractIndentId`. No `closesAt`, no invitations, no bids.
5. Insert `awards`: `loadId`, `bidId null`, `contractIndentId`, `transporterCompanyId`, `awardedByUserId = requestedByUserId`, `status 'accepted'`, `acceptBy = respondedAt = now`, `respondedByUserId = user`, `termsAcceptedAt = now`, `termsSnapshot = trip.snapshotTerms(load, { currentAmount: ratePaise / 100 })` extended with `{ source:'contract', contractId, contractNumber, contractVersion, contractLaneId, indentId, ratePaise, rateBasis }`. This is the only rupee conversion; `ratePaise` stays the exact figure in the snapshot.
6. Call `createTripsForAward(tx, { load, award })` unchanged (one trip per truck, freight charge lines from the snapshot).
7. Set indent `acknowledged`, `loadId`, `respondedAt`; `recordLoadEvent` (`created`, `accepted`, note "From indent IND-...") and `contract_events` `indent_acknowledged`; notify the customer with the load number.
After this the transporter uses the existing flows: trips list, assign truck/driver, transitions, POD, completion. Nothing in `trip` or `load` services changes. Known limit: a contract load in `accepted` cannot be cancelled by `/loads/:id/cancel` (status not cancellable); post-acknowledge changes go through the trip cancel / placement-miss flow.
Decline: indent `declined` + reason, event, notify. Cancel (customer, `requested` only): `cancelled` + reason.

### 4.7 Amend, cancel, expire
- Propose (either party): `amendmentProblems`; inserts `proposed` with `changes`; contract -> `amending`; notify the counterpart. The proposer cannot accept their own proposal (403).
- Accept (counterpart), one transaction: lock contract and amendment; re-run `amendmentProblems`; store `before` and `after` snapshots; update `contracts` (`validTo`, `terms`, `paymentTerms`, `version + 1`, `status 'active'`); for each changed lane insert `contract_lane_terms` with `version = max + 1`, `effectiveFrom = amendment.effectiveFrom`, unchanged field copied from the previous term; amendment `accepted`, `resultingVersion`. History is never rewritten: `contract_lanes` rows and earlier terms stay.
- Reject / withdraw: amendment `rejected`, contract back to `active`.
- Cancel (either party): reason required; `cancelledAt`, `cancelledByCompanyId`, `cancelNoticeDays`, `cancelEffectiveOn`; status `cancelled`; an open amendment is rejected ("contract cancelled"); `requested` indents with `pickupDate >= cancelEffectiveOn` become `cancelled`; indents before the date stay valid and acknowledged work and trips continue untouched. Notify the counterpart.
- Expire: clock sets `expired` the day after `validTo`; `requested` indents are cancelled with reason "contract expired"; acknowledged work continues.
- Traceability: `contract_events` records every step; an indent keeps `ratePaise`/`termVersion`; the load keeps `contractId` and the award snapshot.

### 4.8 Examples that become tests
1. Contract Delhi-Mumbai 20 trucks/month at 5800000 paise, validity 1 Dec to 28 Feb. Indent 5 trucks for 3 Dec: requested. Acknowledge: one load `CT-...` status accepted, one award, 5 trips each with freight 5800000. Consumption Dec: consumed 5, remaining 15.
2. Over volume: month already at 18, indent for 5 -> accepted with `overVolumeBy 3`; the response and the transporter's indent both show it.
3. Retry: same `idempotencyKey` twice -> one row, `replayed:true`, consumption counted once. Acknowledge twice -> one load.
4. Amendment: transporter proposes rate 6000000 effective 15 Dec; customer accepts: version 2; indent for 10 Dec acknowledged at 5800000, indent for 20 Dec at 6000000; the 3 Dec indent stays at 5800000. Proposer accepting own proposal -> 403; second open proposal -> 409.
5. Cancel with 7 days notice on 10 Dec: effective 17 Dec; indent for 16 Dec allowed, for 17 Dec refused (422); a requested indent for 20 Dec becomes cancelled; acknowledged load for 12 Dec keeps its trips.
6. Expiry: contract past `validTo` is `expired`, indent refused; acknowledged earlier loads unaffected. Indent for a date outside `[validFrom, validTo]` refused.
7. Isolation: another customer or transporter gets 404 on contract, indent, consumption, events.

## 5. RFQ-UI

Frontend rules as the rest of the app: plain JSX, the dashboard kit (`shared/ui/kit`), data grid, `shared/lib/format.js` (paise formatter), status colours from `kit/tone.js` (add RFQ/lane-award/contract/amendment/indent statuses to the STATUS map there; owner of `tone.js` for this wave is the UI builder). API files: `features/rfq/api/rfq.api.js` (one function per endpoint in 3.2). Nav slugs `rfqs` and `contracts` already exist for customer and transporter; the placeholder pages are replaced.

### Customer
| Route | Screen |
| --- | --- |
| `/customer/rfqs` | Grid with status tabs (All, Draft, Open, Closed, Awarded, Cancelled), columns number, title, validity, lanes, quoted (n of invitees), closes in, status. Header buttons: New RFQ, Import lanes. Row click -> detail (drafts -> editor). |
| `/customer/rfqs/new` and `/customer/rfqs/[rfqId]/edit` | Stepper, saves a draft on Next: 1 Basics (title, validity dates, payment terms, commercial terms with load defaults), 2 Lanes (table editor: PIN auto-fills city/state via the masters pin lookup, vehicle type select, monthly trucks, rate basis, optional target rate; add/duplicate/remove row; "Import from CSV" shortcut), 3 Invite and window (accepted-connection transporters multi-select, closes-at with quick presets 24 h / 48 h / 72 h / 7 d, validation list from `publish` 422), 4 Review and Publish. Target rate field carries the hint "Hidden from transporters". |
| `/customer/rfqs/import` | Download template link, drop zone (reads the file as text, sends `csvText`), preview grid (row no, fields, error chips per row, summary "12 rows, 2 errors"), Confirm button disabled while errors exist, then goes to the draft editor. Re-upload of identical file shows "Already imported" with a link to its RFQ. |
| `/customer/rfqs/[rfqId]` | Header (number, status, countdown to close, actions Extend / Cancel / Publish by status). Tabs: Overview (period, terms, invitees with quoted count), Lanes (list with quote counts only while open), Compare (after close: one board card per lane, quotes ranked, target rate marker, revision history popover, "Award" radio per lane, sticky bar "Award N lanes to M transporters", unawarded allowed), Awards (pending with countdown to acceptBy, accepted with contract link, declined/expired with Re-award), Activity (events timeline). While `open` the Compare tab shows "Rates are visible after the window closes" with counts. |

### Transporter
| Route | Screen |
| --- | --- |
| `/transporter/rfqs` | Grid of invited RFQs: customer, title, validity, lanes, my quotes (n of lanes), closes in, status; badge "Award waiting" when a bundle is pending. |
| `/transporter/rfqs/[rfqId]` | Header with countdown. Lane cards: route, truck type, monthly volume, rate basis, a rupee input (stored as paise) with Submit/Revise, my revision history, "x of 10 revisions used". No target rate, no competitor info. After close: read-only quotes. When awards are pending: banner listing the awarded lanes and rates with countdown to `acceptBy` and Accept all / Decline all (decline asks an optional reason). After accept: link to the contract. |

States on every screen: skeleton, empty, error with retry, mobile cards (grid does this), optimistic revise (paint now, rollback on 409), permission-gated buttons from `permissions` flags and `useAuth` permission keys (`rfqs.manage`, `quotes.submit`, `contracts.respond`). Money inputs in rupees, converted to paise only in `rfq.api.js`.

## 6. CONTRACT-UI

API file: `features/contracts/api/contract.api.js` (endpoints in 4.2 and 4.3).

### Customer
| Route | Screen |
| --- | --- |
| `/customer/contracts` | Grid with tabs (Active, Amending, Expired, Cancelled): number, transporter, RFQ, validity, lanes, this month consumed/volume (progress cell), status. |
| `/customer/contracts/[contractId]` | Header (number, transporter, status chip, validity, version, notice banner when cancelled "Effective <date>"). Tabs: **Lanes** (route, truck type, rate with unit, monthly volume, version history drawer), **Indents** (grid of this contract's indents + "New indent" modal: lane select, trucks, pickup date, time window, addresses/contacts, notes; generates `idempotencyKey` once per modal open; shows the amber over-volume warning from the response, never blocks; success toast with indent number), **Consumption** (month picker, one bar per lane: consumed vs monthly volume, pending in a lighter shade, red over-volume badge), **Amendments** (timeline of versions with before/after diff; Propose amendment modal: effective date, validTo, per-lane rate and volume, note; when the transporter proposed: Accept / Reject with note), **Activity**. Overflow menu: Cancel contract (reason, notice days >= 7, shows computed effective date before confirm). |
| `/customer/contracts/[contractId]/indents/[indentId]` (side panel is acceptable instead of a page) | Indent detail: status timeline, rate frozen, link to the load/trips once acknowledged. |

### Transporter
| Route | Screen |
| --- | --- |
| `/transporter/contracts` | Same grid, plus an **Indents inbox** tab (`GET /indents?status=requested`): customer, contract, lane, trucks, pickup date, over-volume chip, Acknowledge / Decline inline. |
| `/transporter/contracts/[contractId]` | Same detail as the customer without New indent. Indents tab has Acknowledge (confirm dialog: "Creates load CT-... and N trips at <rate>") and Decline (reason required). After acknowledge the row links to the trip list filtered to the load; trucks are assigned in the existing Trips screens. Amendments tab: propose and answer. Cancel contract in the overflow menu. |

Cross-links: contract detail from RFQ Awards tab; load detail of a contract load shows the contract/indent chips (small addition to the load detail owned by the loads UI builder; read-only fields `contractId`, `contractIndentId`).
Quality bar: skeletons, empty states with the next action ("No indents yet. Place the first one"), errors with the server message, mobile cards, keyboard-reachable modals, optimistic indent creation with rollback, taps instant (see kit patterns).

## 7. Out of scope (v1, say so in the UI where relevant)
Partial accept per lane, adding or removing lanes by amendment, multi-transporter split of one lane (one transporter per lane, per PRD), automatic RFQ renewal, price indexation, brokers and fleet-owner offers (ENR-027/028), invoicing and penalties on over-volume, cancelling an acknowledged indent load through the Loads screen.
